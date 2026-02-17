import * as THREE from 'three/webgpu'
import { color, uniform, vec2, vec3 } from 'three/tsl'

import { Debug } from './Debug.js'
import { Inputs } from './Inputs/Inputs.js'
import { Physics } from './Physics/Physics.js'
import { Rendering } from './Rendering.js'
import { ResourcesLoader } from './ResourcesLoader.js'
import { Ticker } from './Ticker.js'
import { Time } from './Time.js'
import { Player } from './Player.js'
import { View } from './View.js'
import { Viewport } from './Viewport.js'
import { World } from './World/World.js'
import { Lighting } from './Ligthing.js'
import { Materials } from './Materials.js'
import { Objects } from './Objects.js'
import { Fog } from './Fog.js'
import { DayCycles } from './Cycles/DayCycles.js'
import { YearCycles } from './Cycles/YearCycles.js'
import { Server } from './Server.js'
import { Modals } from './Modals.js'
import { PhysicsVehicle } from './Physics/PhysicsVehicle.js'
import { PhysicsWireframe } from './Physics/PhysicsWireframe.js'
import { Audio } from './Audio.js'
import { RayCursor } from './RayCursor.js'
import { Notifications } from './Notifications.js'
import { Quality } from './Quality.js'
import { Reveal } from './Reveal.js'
import { SettingsStorage } from './SettingsStorage.js'
import { POIManager } from './POIManager.js'

export class Game
{
    static getInstance()
    {
        return Game.instance
    }

    constructor()
    {
        // Singleton
        if(Game.instance)
            return Game.instance

        Game.instance = this

        this.init()
    }

    async init()
    {
        // Setup
        this.domElement = document.querySelector('.game')
        this.canvasElement = this.domElement.querySelector('.js-canvas')
        document.documentElement.classList.add('is-started')

        // Core systems
        this.scene = new THREE.Scene()
        this.debug = new Debug()
        this.resourcesLoader = new ResourcesLoader()
        this.quality = new Quality()
        this.server = new Server()
        this.ticker = new Ticker()
        this.time = new Time()
        this.dayCycles = new DayCycles()
        this.yearCycles = new YearCycles()

        // Stub for dayCycles.properties
        this.dayCycles.properties = {
            revealColor: { value: new THREE.Color('#e88eff') },
            revealIntensity: { value: 5.5 },
            shadowColor: { value: new THREE.Color('#000000') },
            lightColor: { value: new THREE.Color('#ffffff') },
            lightIntensity: { value: 1.0 },
            fogColor: { value: new THREE.Color('#ffffff') },
            fogDensity: { value: 0.002 },
            fogColorA: { value: new THREE.Color('#ffffff') },
            fogColorB: { value: new THREE.Color('#888888') },
            fogNearRatio: { value: 0.1 },
            fogFarRatio: { value: 0.9 },
        }
        this.inputs = new Inputs([], [ 'intro' ])
        this.audio = new Audio()
        this.notifications = new Notifications()
        this.rayCursor = new RayCursor()
        this.viewport = new Viewport(this.domElement)
        this.modals = new Modals()
        this.rendering = new Rendering()
        await this.rendering.setRenderer()

        // Load minimal resources (vehicle model and custom SM model)
        this.resources = await this.resourcesLoader.load([
            [ 'vehicle', 'vehicle/default-compressed.glb', 'gltf' ],
            [ 'paletteTexture', 'palette.ktx', 'textureKtx', (resource) => { resource.minFilter = THREE.NearestFilter; resource.magFilter = THREE.NearestFilter; resource.generateMipmaps = false; resource.colorSpace = THREE.SRGBColorSpace; } ],
            [ 'smModel', 'SM_MFF.glb', 'gltf' ],
            [ 'smLightmap', 'SM_MFF_Lightmap.png', 'texture', (resource) => { resource.colorSpace = THREE.SRGBColorSpace; resource.wrapS = THREE.RepeatWrapping; resource.wrapT = THREE.RepeatWrapping; } ],
        ])

        // Stub for missing resources
        this.resources.behindTheSceneStarsTexture = null
        this.resources.soundTexture = null

        // Stub objects for compatibility
        this.weather = { snow: { value: 0 }, rain: { value: 0 }, wind: { value: 0 }, override: { start: () => {}, end: () => {} } }
        this.water = { surfaceElevation: -100, surfaceElevationUniform: -100, surfaceThicknessUniform: 10, depthElevation: -100 }
        this.menu = { state: 0, items: new Map(), open: () => {}, close: () => {}, events: { on: () => {} } }
        this.noises = { resolution: 100, hash: null }
        this.options = { element: null } // Stub for Options
        this.tracks = { add: () => ({ update: () => {} }), remove: () => {} } // Stub for Tracks
        this.achievements = { rewards: { current: { name: 'red' } }, events: { on: () => {} } } // Stub for Achievements
        this.respawns = { getDefault: () => ({ position: new THREE.Vector3(0, 0, 0) }) } // Stub for Respawns
        this.terrain = { terrainNode: () => vec3(0), colorNode: () => color(0x8d55ff) } // Stub for Terrain
        this.interactivePoints = { recover: () => {} } // Stub for InteractivePoints
        this.overlay = { moveOnTop: () => {} } // Stub for Overlay

        this.view = new View()
        this.rendering.setPostprocessing()
        this.rendering.start()
        this.lighting = new Lighting()
        this.fog = new Fog()
        this.materials = new Materials()
        this.objects = new Objects()
        this.world = new World()

        // Load and init RAPIER
        this.RAPIER = await import('@dimforge/rapier3d')

        this.physics = new Physics()
        this.wireframe = new PhysicsWireframe()
        this.physicalVehicle = new PhysicsVehicle()
        this.player = new Player()

        this.reveal = new Reveal()

        this.world.step(1)

        // Start reveal sequence — skip intro, go straight to wandering mode
        this.reveal.distance.value = 99999
        this.reveal.updateStep(1)

        // Add reveal update to ticker
        this.reveal.update = this.reveal.update.bind(this.reveal)
        this.ticker.events.on('tick', this.reveal.update, 10)

        // Create settings storage
        this.settingsStorage = new SettingsStorage()

        // Create POI manager
        this.poiManager = new POIManager()

        // Apply saved settings after a short delay
        setTimeout(() =>
        {
            this.settingsStorage.applySettings()
        }, 500)
    }

    reset()
    {
        // Player respawn
        this.player.respawn(null, () =>
        {
            // Objects reset
            this.objects.resetAll()
        })
    }
}

