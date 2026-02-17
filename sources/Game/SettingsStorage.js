import { Game } from './Game.js'

export class SettingsStorage
{
    constructor()
    {
        this.game = Game.getInstance()
        this.storageKey = 'custom-folio-settings'
        this.settings = this.loadSettings()
    }

    loadSettings()
    {
        // Check if settings exist in localStorage
        const allStorage = localStorage.getItem(this.storageKey)

        if(allStorage)
        {
            try
            {
                const settings = JSON.parse(allStorage)
                console.log('Loaded settings from localStorage: - SettingsStorage.js:22', settings)
                return settings
            }
            catch(e)
            {
                console.error('Failed to load settings: - SettingsStorage.js:27', e)
                return this.getDefaultSettings()
            }
        }

        console.log('No saved settings found, using defaults - SettingsStorage.js:32')
        return this.getDefaultSettings()
    }

    getDefaultSettings()
    {
        return {
            // Model transform
            modelPosition: { x: 0, y: 0, z: 0 },
            modelRotation: { x: 0, y: 0, z: 0 },
            modelScale: { x: 1, y: 1, z: 1 },

            // Camera
            cameraHeight: 30,
            cameraPhi: 0.85,
            cameraTheta: 0.785,
            focusPointX: 0,
            focusPointZ: 0,

            // Lighting
            sunIntensity: 5,
            ambientIntensity: 2.0,
            sunPhi: 0.31,
            sunTheta: 0.79,

            // Gizmo
            gizmoEnabled: false,

            // Transform speed
            transformSpeed: 0.17,
        }
    }

    saveSettings()
    {
        this.updateSettingsFromGame()
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings))
        console.log('Settings saved: - SettingsStorage.js:65', this.settings)
    }

    updateSettingsFromGame()
    {
        // Model transform
        if(this.game.world.gizmoControls && this.game.world.gizmoControls.targetObject)
        {
            const obj = this.game.world.gizmoControls.targetObject
            this.settings.modelPosition = { x: obj.position.x, y: obj.position.y, z: obj.position.z }
            this.settings.modelRotation = { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z }
            this.settings.modelScale = { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z }
        }

        // Camera
        if(this.game.view && this.game.view.spherical)
        {
            this.settings.cameraHeight = this.game.view.spherical.radius.edges.min
            this.settings.cameraPhi = this.game.view.spherical.phi
            this.settings.cameraTheta = this.game.view.spherical.theta
        }
        if(this.game.view && this.game.view.focusPoint)
        {
            this.settings.focusPointX = this.game.view.focusPoint.position.x
            this.settings.focusPointZ = this.game.view.focusPoint.position.z
        }

        // Lighting
        if(this.game.lighting)
        {
            this.settings.sunIntensity = this.game.lighting.light.intensity
            this.settings.ambientIntensity = this.game.lighting.ambientLight.intensity
            this.settings.sunPhi = this.game.lighting.spherical.phi
            this.settings.sunTheta = this.game.lighting.spherical.theta
        }

        // Gizmo
        if(this.game.world.gizmoControls)
        {
            this.settings.gizmoEnabled = this.game.world.gizmoControls.enabled
            this.settings.transformSpeed = this.game.world.gizmoControls.transformSpeed
        }
    }

    applySettings()
    {
        console.log('Applying settings: - SettingsStorage.js:104', this.settings)

        // Apply model transform
        if(this.game.world.gizmoControls && this.game.world.gizmoControls.targetObject)
        {
            const obj = this.game.world.gizmoControls.targetObject
            obj.position.set(this.settings.modelPosition.x, this.settings.modelPosition.y, this.settings.modelPosition.z)
            obj.rotation.set(this.settings.modelRotation.x, this.settings.modelRotation.y, this.settings.modelRotation.z)
            obj.scale.set(this.settings.modelScale.x, this.settings.modelScale.y, this.settings.modelScale.z)
            console.log('Model transform applied: - SettingsStorage.js:113', obj.position, obj.rotation, obj.scale)
        }

        // Apply camera
        if(this.game.view && this.game.view.spherical)
        {
            const height = this.settings.cameraHeight
            this.game.view.spherical.radius.edges.min = height
            this.game.view.spherical.radius.edges.max = height * 2
            this.game.view.spherical.radius.current = height

            if(this.settings.cameraPhi !== undefined)
                this.game.view.spherical.phi = this.settings.cameraPhi
            if(this.settings.cameraTheta !== undefined)
                this.game.view.spherical.theta = this.settings.cameraTheta

            console.log('Camera applied: height', height, 'phi', this.settings.cameraPhi, 'theta', this.settings.cameraTheta)
        }
        if(this.game.view && this.game.view.focusPoint && this.settings.focusPointX !== undefined)
        {
            this.game.view.focusPoint.position.x = this.settings.focusPointX
            this.game.view.focusPoint.position.z = this.settings.focusPointZ
            this.game.view.focusPoint.smoothedPosition.x = this.settings.focusPointX
            this.game.view.focusPoint.smoothedPosition.z = this.settings.focusPointZ
            console.log('Focus point applied:', this.settings.focusPointX, this.settings.focusPointZ)
        }

        // Apply lighting
        if(this.game.lighting)
        {
            this.game.lighting.light.intensity = this.settings.sunIntensity
            this.game.lighting.ambientLight.intensity = this.settings.ambientIntensity
            this.game.lighting.spherical.phi = this.settings.sunPhi
            this.game.lighting.spherical.theta = this.settings.sunTheta

            // Disable day cycles auto-update for manual control
            this.game.lighting.useDayCycles = false

            // Update light position
            this.game.lighting.light.position.setFromSpherical(this.game.lighting.spherical)

            console.log('Lighting applied: - SettingsStorage.js:140', this.settings.sunIntensity, this.settings.sunPhi, this.settings.sunTheta)
        }

        // Apply gizmo
        if(this.game.world.gizmoControls)
        {
            this.game.world.gizmoControls.enabled = this.settings.gizmoEnabled
            this.game.world.gizmoControls.gizmoGroup.visible = this.settings.gizmoEnabled

            // Apply transform speed
            if(this.settings.transformSpeed !== undefined)
            {
                this.game.world.gizmoControls.transformSpeed = this.settings.transformSpeed
                console.log('Transform speed applied: - SettingsStorage.js:153', this.settings.transformSpeed)
            }

            console.log('Gizmo enabled: - SettingsStorage.js:156', this.settings.gizmoEnabled)
        }

        console.log('All settings applied successfully! - SettingsStorage.js:159')
    }

    resetToDefaults()
    {
        this.settings = this.getDefaultSettings()
        this.saveSettings()
        this.applySettings()
    }

    // ─── Zone positions persistence ───

    saveZonePositions(zones)
    {
        const data = zones.map(z => ({
            id: z.id,
            position: [...z.position],
            poi: z.poi ? {
                cameraPosition: [...z.poi.cameraPosition],
                targetPosition: [...z.poi.targetPosition],
            } : null,
        }))
        localStorage.setItem('custom-folio-zone-positions', JSON.stringify(data))
        console.log('Zone positions saved:', data.length, 'zones')
    }

    loadZonePositions(zones)
    {
        const raw = localStorage.getItem('custom-folio-zone-positions')
        if(!raw) return false
        try
        {
            const saved = JSON.parse(raw)
            for(const sz of saved)
            {
                const zone = zones.find(z => z.id === sz.id)
                if(!zone) continue
                zone.position[0] = sz.position[0]
                zone.position[1] = sz.position[1]
                zone.position[2] = sz.position[2]
                if(sz.poi && zone.poi)
                {
                    zone.poi.cameraPosition[0] = sz.poi.cameraPosition[0]
                    zone.poi.cameraPosition[1] = sz.poi.cameraPosition[1]
                    zone.poi.cameraPosition[2] = sz.poi.cameraPosition[2]
                    zone.poi.targetPosition[0] = sz.poi.targetPosition[0]
                    zone.poi.targetPosition[1] = sz.poi.targetPosition[1]
                    zone.poi.targetPosition[2] = sz.poi.targetPosition[2]
                }
            }
            console.log('Zone positions loaded from localStorage')
            return true
        }
        catch(e)
        {
            console.error('Failed to load zone positions:', e)
            return false
        }
    }

    // Force apply specific settings
    forceApplySettings(settings)
    {
        console.log('Force applying settings: - SettingsStorage.js:172', settings)

        // Save to localStorage
        localStorage.setItem(this.storageKey, JSON.stringify(settings))

        // Update internal settings
        this.settings = settings

        // Apply immediately
        this.applySettings()
    }
}
