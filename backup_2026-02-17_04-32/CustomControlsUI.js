import { Game } from './Game/Game.js'

/**
 * Blender-style coordinate mapping:
 * Blender: X = right (red), Y = forward (green), Z = up (blue)
 * Three.js: X = right, Y = up, Z = forward (negative)
 * 
 * UI shows Blender axes, internally maps to Three.js:
 *   Blender X → Three.js X
 *   Blender Y → Three.js -Z
 *   Blender Z → Three.js Y
 */

// Blender → Three.js axis mapping
const AXIS_MAP = {
    x: { threeAxis: 'x', sign: 1 },
    y: { threeAxis: 'z', sign: -1 },
    z: { threeAxis: 'y', sign: 1 },
}

export class CustomControlsUI
{
    constructor()
    {
        this.game = Game.getInstance()
        this.elements = {}
        this.initElements()
        this.initEventListeners()
    }

    initElements()
    {
        // Panel
        this.elements.panel = document.querySelector('.controls-panel')
        this.elements.panelToggle = document.getElementById('panelToggle')

        // Gizmo
        this.elements.gizmoToggle = document.getElementById('gizmoToggle')

        // Position (sliders + number inputs)
        this.elements.posX = document.getElementById('posX')
        this.elements.posXInput = document.getElementById('posXInput')
        this.elements.posY = document.getElementById('posY')
        this.elements.posYInput = document.getElementById('posYInput')
        this.elements.posZ = document.getElementById('posZ')
        this.elements.posZInput = document.getElementById('posZInput')

        // Rotation (sliders + number inputs)
        this.elements.rotX = document.getElementById('rotX')
        this.elements.rotXInput = document.getElementById('rotXInput')
        this.elements.rotY = document.getElementById('rotY')
        this.elements.rotYInput = document.getElementById('rotYInput')
        this.elements.rotZ = document.getElementById('rotZ')
        this.elements.rotZInput = document.getElementById('rotZInput')

        // Scale (sliders + number inputs)
        this.elements.scaleX = document.getElementById('scaleX')
        this.elements.scaleXInput = document.getElementById('scaleXInput')
        this.elements.scaleY = document.getElementById('scaleY')
        this.elements.scaleYInput = document.getElementById('scaleYInput')
        this.elements.scaleZ = document.getElementById('scaleZ')
        this.elements.scaleZInput = document.getElementById('scaleZInput')

        // Transform Speed
        this.elements.transformSpeed = document.getElementById('transformSpeed')
        this.elements.transformSpeedInput = document.getElementById('transformSpeedInput')

        // Lighting
        this.elements.sunIntensity = document.getElementById('sunIntensity')
        // Lighting
        this.elements.sunIntensity = document.getElementById('sunIntensity')
        this.elements.sunIntensityInput = document.getElementById('sunIntensityInput')
        this.elements.ambientIntensity = document.getElementById('ambientIntensity')
        this.elements.ambientIntensityInput = document.getElementById('ambientIntensityInput')
        this.elements.sunPhi = document.getElementById('sunPhi')
        this.elements.sunPhiInput = document.getElementById('sunPhiInput')
        this.elements.sunTheta = document.getElementById('sunTheta')
        this.elements.sunThetaInput = document.getElementById('sunThetaInput')

        // Camera
        this.elements.cameraHeight = document.getElementById('cameraHeight')
        this.elements.cameraHeightInput = document.getElementById('cameraHeightInput')

        // Save/Reset buttons
        this.elements.saveSettings = document.getElementById('saveSettings')
        this.elements.resetSettings = document.getElementById('resetSettings')
        this.elements.forceApplySettings = document.getElementById('forceApplySettings')

        // POI elements
        this.elements.poiNameInput = document.getElementById('poiNameInput')
        this.elements.addPOI = document.getElementById('addPOI')
        this.elements.poiList = document.getElementById('poiList')
        this.elements.poiSidebar = document.getElementById('poiSidebar')

        // POI edit mode elements
        this.elements.poiAddMode = document.getElementById('poiAddMode')
        this.elements.poiEditMode = document.getElementById('poiEditMode')
        this.elements.poiEditName = document.getElementById('poiEditName')
        this.elements.poiEditX = document.getElementById('poiEditX')
        this.elements.poiEditXInput = document.getElementById('poiEditXInput')
        this.elements.poiEditY = document.getElementById('poiEditY')
        this.elements.poiEditYInput = document.getElementById('poiEditYInput')
        this.elements.poiEditZ = document.getElementById('poiEditZ')
        this.elements.poiEditZInput = document.getElementById('poiEditZInput')
        this.elements.poiEditConfirm = document.getElementById('poiEditConfirm')
        this.elements.poiEditCancel = document.getElementById('poiEditCancel')
    }

    /**
     * Sync slider ↔ number input, then apply transform.
     * `source` is 'slider' or 'input' to know which triggered the change.
     */
    syncAndApply(type, blenderAxis, source, rawValue)
    {
        const numValue = parseFloat(rawValue)
        if(isNaN(numValue)) return

        const sliderId = `${type}${blenderAxis.toUpperCase()}`
        const slider = this.elements[sliderId]
        const input = this.elements[`${sliderId}Input`]

        // Sync the other control
        if(source === 'slider' && input) input.value = numValue
        if(source === 'input' && slider) slider.value = numValue

        // Map Blender axis → Three.js axis
        const mapping = AXIS_MAP[blenderAxis]
        const threeValue = numValue * mapping.sign

        // Apply to object
        if(this.game.world.gizmoControls && this.game.world.gizmoControls.targetObject)
        {
            const obj = this.game.world.gizmoControls.targetObject
            switch(type)
            {
                case 'position':
                    obj.position[mapping.threeAxis] = threeValue
                    break
                case 'rotation':
                    obj.rotation[mapping.threeAxis] = threeValue
                    break
                case 'scale':
                    obj.scale[mapping.threeAxis] = threeValue
                    break
            }
        }
    }

    initEventListeners()
    {
        // Panel toggle
        this.elements.panelToggle.addEventListener('click', () =>
        {
            this.elements.panel.classList.toggle('collapsed')
            this.elements.panelToggle.textContent = this.elements.panel.classList.contains('collapsed') ? '+' : '−'
        })

        // Gizmo toggle
        this.elements.gizmoToggle.addEventListener('click', () =>
        {
            if(this.game.world.gizmoControls)
            {
                this.game.world.gizmoControls.toggle()
                this.elements.gizmoToggle.classList.toggle('active', this.game.world.gizmoControls.enabled)
                this.elements.gizmoToggle.textContent = this.game.world.gizmoControls.enabled ? 'Disable Gizmo' : 'Enable Gizmo'
            }
        })

        // Wire up all transform axes: slider + number input
        const axes = ['x', 'y', 'z']
        const types = ['position', 'rotation', 'scale']
        const prefixes = { position: 'pos', rotation: 'rot', scale: 'scale' }

        for(const type of types)
        {
            for(const axis of axes)
            {
                const key = `${prefixes[type]}${axis.toUpperCase()}`
                const slider = this.elements[key]
                const input = this.elements[`${key}Input`]

                if(slider)
                {
                    slider.addEventListener('input', (e) => this.syncAndApply(type, axis, 'slider', e.target.value))
                }
                if(input)
                {
                    input.addEventListener('input', (e) => this.syncAndApply(type, axis, 'input', e.target.value))
                }
            }
        }

        // Transform speed (slider + number input)
        const speedHandler = (source, value) =>
        {
            const v = parseFloat(value)
            if(isNaN(v)) return
            if(source === 'slider' && this.elements.transformSpeedInput) this.elements.transformSpeedInput.value = v
            if(source === 'input' && this.elements.transformSpeed) this.elements.transformSpeed.value = v
            if(this.game.world.gizmoControls) this.game.world.gizmoControls.transformSpeed = v
        }
        this.elements.transformSpeed.addEventListener('input', (e) => speedHandler('slider', e.target.value))
        this.elements.transformSpeedInput.addEventListener('input', (e) => speedHandler('input', e.target.value))

        // --- Lighting: synced slider + number input ---
        const makeSyncedHandler = (sliderEl, inputEl, applyFn, decimals = 1) =>
        {
            const handler = (source, rawValue) =>
            {
                const v = parseFloat(rawValue)
                if(isNaN(v)) return
                if(source === 'slider' && inputEl) inputEl.value = v.toFixed(decimals)
                if(source === 'input' && sliderEl) sliderEl.value = v
                applyFn(v)
            }
            sliderEl.addEventListener('input', (e) => handler('slider', e.target.value))
            inputEl.addEventListener('input', (e) => handler('input', e.target.value))
        }

        // Sun intensity
        makeSyncedHandler(this.elements.sunIntensity, this.elements.sunIntensityInput, (v) =>
        {
            if(this.game.lighting && this.game.lighting.light) this.game.lighting.light.intensity = v
        }, 1)

        // Ambient intensity
        makeSyncedHandler(this.elements.ambientIntensity, this.elements.ambientIntensityInput, (v) =>
        {
            if(this.game.lighting && this.game.lighting.ambientLight) this.game.lighting.ambientLight.intensity = v
        }, 1)

        // Sun phi
        makeSyncedHandler(this.elements.sunPhi, this.elements.sunPhiInput, (v) =>
        {
            if(this.game.lighting && this.game.lighting.spherical)
            {
                this.game.lighting.spherical.phi = v
                this.game.lighting.light.position.setFromSpherical(this.game.lighting.spherical)
            }
        }, 2)

        // Sun theta
        makeSyncedHandler(this.elements.sunTheta, this.elements.sunThetaInput, (v) =>
        {
            if(this.game.lighting && this.game.lighting.spherical)
            {
                this.game.lighting.spherical.theta = v
                this.game.lighting.light.position.setFromSpherical(this.game.lighting.spherical)
            }
        }, 2)

        // Camera height
        makeSyncedHandler(this.elements.cameraHeight, this.elements.cameraHeightInput, (v) =>
        {
            if(this.game.view && this.game.view.spherical)
            {
                this.game.view.spherical.radius.edges.min = v
                this.game.view.spherical.radius.edges.max = v * 2
                this.game.view.spherical.radius.current = v
            }
        }, 0)

        // Save settings
        this.elements.saveSettings.addEventListener('click', () =>
        {
            if(this.game.settingsStorage)
            {
                this.game.settingsStorage.saveSettings()
                this.showNotification('Settings saved!')
            }
        })

        // Reset settings
        this.elements.resetSettings.addEventListener('click', () =>
        {
            if(this.game.settingsStorage)
            {
                this.game.settingsStorage.resetToDefaults()
                this.initUIValues()
                this.showNotification('Settings reset to default!')
            }
        })

        // Force apply user's settings
        this.elements.forceApplySettings.addEventListener('click', () =>
        {
            if(this.game.settingsStorage)
            {
                const userSettings = {
                    modelPosition: { x: -42.9, y: 0.6, z: -50 },
                    modelRotation: { x: 0, y: 2.34, z: 0 },
                    modelScale: { x: 0.5, y: 0.5, z: 0.5 },
                    cameraHeight: 33,
                    sunIntensity: 4.1,
                    ambientIntensity: 1.4,
                    sunPhi: 0.31,
                    sunTheta: 0.79,
                    gizmoEnabled: false,
                    transformSpeed: 0.17
                }
                this.game.settingsStorage.forceApplySettings(userSettings)
                this.initUIValues()
                this.showNotification('My settings applied!')
            }
        })

        // Initialize UI values
        this.initUIValues()

        // POI: Add button — enters edit mode
        this.elements.addPOI.addEventListener('click', () =>
        {
            if(!this.game.poiManager) return
            const name = this.elements.poiNameInput.value.trim() || undefined
            this.game.poiManager.startAddPOI(name)
            this.elements.poiNameInput.value = ''
            this.enterPOIEditMode()
        })

        // POI: Enter key in name input
        this.elements.poiNameInput.addEventListener('keydown', (e) =>
        {
            if(e.key === 'Enter') this.elements.addPOI.click()
        })

        // POI edit: position sliders + inputs
        const poiAxes = [
            { slider: 'poiEditX', input: 'poiEditXInput', axis: 'x' },
            { slider: 'poiEditY', input: 'poiEditYInput', axis: 'y' },
            { slider: 'poiEditZ', input: 'poiEditZInput', axis: 'z' },
        ]
        for(const a of poiAxes)
        {
            const syncPOI = (source, rawValue) =>
            {
                const v = parseFloat(rawValue)
                if(isNaN(v) || !this.game.poiManager) return
                if(source === 'slider') this.elements[a.input].value = v.toFixed(1)
                if(source === 'input') this.elements[a.slider].value = v
                this.game.poiManager.setEditingPosition(a.axis, v)
            }
            this.elements[a.slider].addEventListener('input', (e) => syncPOI('slider', e.target.value))
            this.elements[a.input].addEventListener('input', (e) => syncPOI('input', e.target.value))
        }

        // POI edit: Confirm
        this.elements.poiEditConfirm.addEventListener('click', () =>
        {
            if(!this.game.poiManager || !this.game.poiManager.isEditing()) return
            if(this.game.poiManager.editing.isExisting)
                this.game.poiManager.confirmEditExisting()
            else
                this.game.poiManager.confirmEdit()
            this.exitPOIEditMode()
            this.refreshPOIList()
            this.showNotification('POI saved!')
        })

        // POI edit: Cancel
        this.elements.poiEditCancel.addEventListener('click', () =>
        {
            if(!this.game.poiManager) return
            if(this.game.poiManager.editing?.isExisting)
            {
                // For existing POIs, just exit edit mode without removing
                this.game.poiManager.removeEditGizmo()
                this.game.poiManager.editing = null
            }
            else
            {
                this.game.poiManager.cancelEdit()
            }
            this.exitPOIEditMode()
            this.refreshPOIList()
        })

        // Initial POI list render (delayed to wait for game init)
        setTimeout(() =>
        {
            this.refreshPOIList()

            // Hook into POI drag changes to sync UI sliders/inputs
            if(this.game.poiManager)
            {
                this.game.poiManager._onDragChange = () => this.syncPOIEditUI()
            }
        }, 1500)
    }

    showNotification(message)
    {
        const notification = document.createElement('div')
        notification.className = 'settings-notification'
        notification.textContent = message
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 2000)
    }

    /**
     * Read Three.js object values and display them in Blender coordinate space.
     */
    setUIFromThreeAxis(type, blenderAxis, threeValue)
    {
        const mapping = AXIS_MAP[blenderAxis]
        const displayValue = threeValue * mapping.sign
        const prefix = { position: 'pos', rotation: 'rot', scale: 'scale' }[type]
        const key = `${prefix}${blenderAxis.toUpperCase()}`

        const slider = this.elements[key]
        const input = this.elements[`${key}Input`]

        if(slider) slider.value = displayValue
        if(input) input.value = type === 'scale' ? displayValue.toFixed(2) : displayValue.toFixed(type === 'rotation' ? 3 : 2)
    }

    initUIValues()
    {
        setTimeout(() =>
        {
            if(this.game.world.gizmoControls && this.game.world.gizmoControls.targetObject)
            {
                const obj = this.game.world.gizmoControls.targetObject

                // Position: Three.js → Blender display
                this.setUIFromThreeAxis('position', 'x', obj.position.x)
                this.setUIFromThreeAxis('position', 'y', obj.position.z) // Blender Y ← Three Z
                this.setUIFromThreeAxis('position', 'z', obj.position.y) // Blender Z ← Three Y

                // Rotation
                this.setUIFromThreeAxis('rotation', 'x', obj.rotation.x)
                this.setUIFromThreeAxis('rotation', 'y', obj.rotation.z)
                this.setUIFromThreeAxis('rotation', 'z', obj.rotation.y)

                // Scale
                this.setUIFromThreeAxis('scale', 'x', obj.scale.x)
                this.setUIFromThreeAxis('scale', 'y', obj.scale.z)
                this.setUIFromThreeAxis('scale', 'z', obj.scale.y)
            }

            // Transform speed
            if(this.game.world.gizmoControls)
            {
                const speed = this.game.world.gizmoControls.transformSpeed
                this.elements.transformSpeed.value = speed
                if(this.elements.transformSpeedInput) this.elements.transformSpeedInput.value = speed.toFixed(2)
            }

            // Lighting
            if(this.game.lighting)
            {
                const syncSliderInput = (slider, input, val, decimals) =>
                {
                    slider.value = val
                    if(input) input.value = val.toFixed(decimals)
                }
                syncSliderInput(this.elements.sunIntensity, this.elements.sunIntensityInput, this.game.lighting.light.intensity, 1)
                syncSliderInput(this.elements.ambientIntensity, this.elements.ambientIntensityInput, this.game.lighting.ambientLight.intensity, 1)
                syncSliderInput(this.elements.sunPhi, this.elements.sunPhiInput, this.game.lighting.spherical.phi, 2)
                syncSliderInput(this.elements.sunTheta, this.elements.sunThetaInput, this.game.lighting.spherical.theta, 2)
            }

            // Camera
            if(this.game.view && this.game.view.spherical)
            {
                this.elements.cameraHeight.value = this.game.view.spherical.radius.edges.min
                if(this.elements.cameraHeightInput) this.elements.cameraHeightInput.value = this.game.view.spherical.radius.edges.min.toFixed(0)
            }
        }, 1000)
    }

    /**
     * Enter POI edit mode — show position controls, hide add button
     */
    enterPOIEditMode()
    {
        if(!this.game.poiManager) return

        this.elements.poiAddMode.style.display = 'none'
        this.elements.poiEditMode.style.display = 'block'

        const poi = this.game.poiManager.editing?.poi
        if(poi)
        {
            this.elements.poiEditName.textContent = poi.name
        }

        // Sync sliders/inputs with current marker position
        this.syncPOIEditUI()
    }

    /**
     * Exit POI edit mode — show add button, hide position controls
     */
    exitPOIEditMode()
    {
        this.elements.poiAddMode.style.display = ''
        this.elements.poiEditMode.style.display = 'none'
    }

    /**
     * Sync POI edit UI with current marker position
     */
    syncPOIEditUI()
    {
        if(!this.game.poiManager) return
        const pos = this.game.poiManager.getEditingPosition()
        if(!pos) return

        this.elements.poiEditX.value = pos.x
        this.elements.poiEditXInput.value = pos.x.toFixed(1)
        this.elements.poiEditY.value = pos.y
        this.elements.poiEditYInput.value = pos.y.toFixed(1)
        this.elements.poiEditZ.value = pos.z
        this.elements.poiEditZInput.value = pos.z.toFixed(1)
    }

    /**
     * Refresh the POI list in the right panel and the left sidebar buttons
     */
    refreshPOIList()
    {
        if(!this.game.poiManager) return

        const pois = this.game.poiManager.getAll()

        // Right panel list
        this.elements.poiList.innerHTML = ''
        for(const poi of pois)
        {
            const item = document.createElement('div')
            item.className = 'poi-list-item'
            item.innerHTML = `
                <span class="poi-color" style="background:${poi.color}"></span>
                <span class="poi-label">${poi.name}</span>
                <button class="poi-goto" data-id="${poi.id}">▶</button>
                <button class="poi-edit" data-id="${poi.id}">✎</button>
                <button class="poi-delete" data-id="${poi.id}">✕</button>
            `
            item.querySelector('.poi-goto').addEventListener('click', () =>
            {
                this.game.poiManager.flyTo(poi.id)
            })
            item.querySelector('.poi-edit').addEventListener('click', () =>
            {
                this.game.poiManager.startEditExisting(poi.id)
                this.enterPOIEditMode()
            })
            item.querySelector('.poi-delete').addEventListener('click', () =>
            {
                this.game.poiManager.removePOI(poi.id)
                this.refreshPOIList()
                this.showNotification('POI removed')
            })
            this.elements.poiList.appendChild(item)
        }

        // Left sidebar buttons
        this.elements.poiSidebar.innerHTML = ''
        for(const poi of pois)
        {
            const btn = document.createElement('button')
            btn.className = 'poi-sidebar-btn'
            btn.innerHTML = `<span class="poi-dot" style="background:${poi.color}"></span>${poi.name}`
            btn.addEventListener('click', () =>
            {
                this.game.poiManager.flyTo(poi.id)
            })
            this.elements.poiSidebar.appendChild(btn)
        }
    }
}
