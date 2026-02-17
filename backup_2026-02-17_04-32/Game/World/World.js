                           import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { Grid } from './Grid.js'
import { Intro } from './Intro.js'
import { VisualVehicle } from './VisualVehicle.js'
import { GizmoControls } from './GizmoControls.js'

export class World
{
    constructor()
    {
        this.game = Game.getInstance()

        this.step(0)
    }

    step(step)
    {
        if(step === 0)
        {
            this.grid = new Grid()
            this.intro = new Intro()
        }
        else if(step === 1)
        {
            // Visual vehicle
            this.visualVehicle = new VisualVehicle(this.game.resources.vehicle.scene)

            // Simple gray floor
            this.setSimpleFloor()

            // Custom SM model
            this.setSMModel()
        }
    }

    setSimpleFloor()
    {
        // Visual floor - use standard material with brighter color
        const floorGeometry = new THREE.PlaneGeometry(1000, 1000)
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.8,
            metalness: 0.1,
        })
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial)
        this.floor.rotation.x = -Math.PI / 2
        this.floor.position.y = -0.1  // Lower than grid
        this.floor.receiveShadow = true
        this.game.scene.add(this.floor)

        // Physical floor
        this.game.objects.add(
            null,
            {
                type: 'fixed',
                friction: 0.25,
                restitution: 0,
                colliders: [
                    { shape: 'cuboid', parameters: [ 1000, 1, 1000 ], position: { x: 0, y: - 1.01, z: 0 }, category: 'floor' },
                ]
            }
        )
    }

    setSMModel()
    {
        // Clone the SM model
        const smScene = this.game.resources.smModel.scene.clone()
        
        // Find the first mesh for gizmo controls
        let targetMesh = null
        smScene.traverse((child) => {
            if (child.isMesh && !targetMesh) {
                targetMesh = child
            }
        })

        // Setup materials WITHOUT lightmap
        smScene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
                
                // Do NOT apply lightmap - use standard materials
                if (child.material) {
                    child.material.needsUpdate = true
                }
            }
        })

        // Position the model
        smScene.position.set(0, 0, 0)
        smScene.scale.set(1, 1, 1)

        this.game.scene.add(smScene)
        this.smModel = smScene

        // Create gizmo controls for the model
        if(targetMesh)
        {
            this.gizmoControls = new GizmoControls(targetMesh)
        }
    }

}