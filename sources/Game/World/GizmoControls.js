import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'

export class GizmoControls
{
    constructor(targetObject)
    {
        this.game = Game.getInstance()
        this.targetObject = targetObject
        this.enabled = false

        // Simple transform controls using keyboard only
        this.mode = 'translate' // translate, rotate, scale
        this.transformSpeed = 0.17 // 3x smaller than before (was 0.5)

        // Create visual gizmo
        this.createVisualGizmo()

        this.setInputs()
        this.setDebugPanel()
    }

    createVisualGizmo()
    {
        // Create group for gizmo
        this.gizmoGroup = new THREE.Group()

        // Create axis lines
        const axisLength = 3
        const axisThickness = 0.08

        // X axis (red)
        const xGeometry = new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength, 8)
        const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 })
        this.xAxis = new THREE.Mesh(xGeometry, xMaterial)
        this.xAxis.rotation.z = -Math.PI / 2
        this.xAxis.position.x = axisLength / 2
        this.gizmoGroup.add(this.xAxis)

        // X arrow head
        const xArrowGeometry = new THREE.ConeGeometry(axisThickness * 2.5, axisThickness * 4, 8)
        this.xArrow = new THREE.Mesh(xArrowGeometry, xMaterial)
        this.xArrow.rotation.z = -Math.PI / 2
        this.xArrow.position.x = axisLength
        this.gizmoGroup.add(this.xArrow)

        // Y axis (green)
        const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 })
        this.yAxis = new THREE.Mesh(new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength, 8), yMaterial)
        this.yAxis.position.y = axisLength / 2
        this.gizmoGroup.add(this.yAxis)

        // Y arrow head
        this.yArrow = new THREE.Mesh(xArrowGeometry, yMaterial)
        this.yArrow.position.y = axisLength
        this.gizmoGroup.add(this.yArrow)

        // Z axis (blue)
        const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.8 })
        this.zAxis = new THREE.Mesh(new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength, 8), zMaterial)
        this.zAxis.rotation.x = Math.PI / 2
        this.zAxis.position.z = axisLength / 2
        this.gizmoGroup.add(this.zAxis)

        // Z arrow head
        this.zArrow = new THREE.Mesh(xArrowGeometry, zMaterial)
        this.zArrow.rotation.x = Math.PI / 2
        this.zArrow.position.z = axisLength
        this.gizmoGroup.add(this.zArrow)

        // Add to scene
        this.gizmoGroup.visible = false
        this.game.scene.add(this.gizmoGroup)

        // Update gizmo position on tick
        this.updateGizmoPosition = this.updateGizmoPosition.bind(this)
        this.game.ticker.events.on('tick', this.updateGizmoPosition, 6)
    }

    updateGizmoPosition()
    {
        if(this.targetObject && this.gizmoGroup.visible)
        {
            // Copy position and rotation from target
            this.gizmoGroup.position.copy(this.targetObject.position)
            this.gizmoGroup.quaternion.copy(this.targetObject.quaternion)
        }
    }

    setInputs()
    {
        this.game.inputs.addActions([
            { name: 'toggleGizmo', categories: [ 'wandering' ], keys: [ 'Keyboard.KeyG' ] },
            { name: 'gizmoModeTranslate', categories: [ 'wandering' ], keys: [ 'Keyboard.KeyT' ] },
            { name: 'gizmoModeRotate', categories: [ 'wandering' ], keys: [ 'Keyboard.KeyR' ] },
            { name: 'gizmoModeScale', categories: [ 'wandering' ], keys: [ 'Keyboard.KeyS' ] },
            // Arrow keys for transformation (only arrow keys, no WASD to avoid conflict with vehicle)
            { name: 'gizmoAxisX', categories: [ 'wandering' ], keys: [ 'Keyboard.ArrowRight' ] },
            { name: 'gizmoAxisXNeg', categories: [ 'wandering' ], keys: [ 'Keyboard.ArrowLeft' ] },
            { name: 'gizmoAxisY', categories: [ 'wandering' ], keys: [ 'Keyboard.ArrowUp' ] },
            { name: 'gizmoAxisYNeg', categories: [ 'wandering' ], keys: [ 'Keyboard.ArrowDown' ] },
            { name: 'gizmoAxisZ', categories: [ 'wandering' ], keys: [ 'Keyboard.KeyE' ] },
            { name: 'gizmoAxisZNeg', categories: [ 'wandering' ], keys: [ 'Keyboard.KeyQ' ] },
        ])

        this.game.inputs.events.on('toggleGizmo', (action) =>
        {
            if(action.active)
            {
                this.toggle()
            }
        })

        this.game.inputs.events.on('gizmoModeTranslate', (action) =>
        {
            if(action.active && this.enabled)
            {
                this.mode = 'translate'
            }
        })

        this.game.inputs.events.on('gizmoModeRotate', (action) =>
        {
            if(action.active && this.enabled)
            {
                this.mode = 'rotate'
            }
        })

        this.game.inputs.events.on('gizmoModeScale', (action) =>
        {
            if(action.active && this.enabled)
            {
                this.mode = 'scale'
            }
        })

        // Update transformation on tick
        this.update = this.update.bind(this)
        this.game.ticker.events.on('tick', this.update, 5)
    }

    update()
    {
        if(!this.enabled || !this.targetObject)
            return

        const delta = this.game.ticker.delta
        const speed = this.transformSpeed * delta

        const axisX = this.game.inputs.actions.get('gizmoAxisX')?.active ? 1 : 0
        const axisXNeg = this.game.inputs.actions.get('gizmoAxisXNeg')?.active ? 1 : 0
        const axisY = this.game.inputs.actions.get('gizmoAxisY')?.active ? 1 : 0
        const axisYNeg = this.game.inputs.actions.get('gizmoAxisYNeg')?.active ? 1 : 0
        const axisZ = this.game.inputs.actions.get('gizmoAxisZ')?.active ? 1 : 0
        const axisZNeg = this.game.inputs.actions.get('gizmoAxisZNeg')?.active ? 1 : 0

        const x = axisX - axisXNeg
        const y = axisY - axisYNeg
        const z = axisZ - axisZNeg

        if(x === 0 && y === 0 && z === 0)
            return

        switch(this.mode)
        {
            case 'translate':
                this.targetObject.position.x += x * speed
                this.targetObject.position.y += y * speed
                this.targetObject.position.z += z * speed
                this.highlightAxis(x !== 0, y !== 0, z !== 0)
                break

            case 'rotate':
                this.targetObject.rotation.x += y * speed
                this.targetObject.rotation.y += x * speed
                this.targetObject.rotation.z += z * speed
                this.highlightAxis(x !== 0, y !== 0, z !== 0)
                break

            case 'scale':
                const scaleFactor = 1 + (x + y + z) * speed
                this.targetObject.scale.multiplyScalar(scaleFactor)
                this.highlightAxis(x !== 0, y !== 0, z !== 0)
                break
        }
    }

    highlightAxis(x, y, z)
    {
        // Highlight active axes
        this.xAxis.material.opacity = x ? 1.0 : 0.5
        this.xArrow.material.opacity = x ? 1.0 : 0.5
        this.yAxis.material.opacity = y ? 1.0 : 0.5
        this.yArrow.material.opacity = y ? 1.0 : 0.5
        this.zAxis.material.opacity = z ? 1.0 : 0.5
        this.zArrow.material.opacity = z ? 1.0 : 0.5
    }

    setDebugPanel()
    {
        if(this.game.debug.active)
        {
            const gizmoFolder = this.game.debug.panel.addFolder({
                title: 'Gizmo Controls',
                expanded: true,
            })

            gizmoFolder.addButton({ title: 'Toggle Gizmo (G)' })
                .on('click', () => this.toggle())

            gizmoFolder.addBinding(this, 'enabled', { label: 'Enabled' })

            gizmoFolder.addBinding(this, 'mode', {
                label: 'Mode',
                options: {
                    translate: 'translate',
                    rotate: 'rotate',
                    scale: 'scale',
                }
            })

            gizmoFolder.addBinding(this, 'transformSpeed', {
                label: 'Speed',
                min: 0.1,
                max: 2,
                step: 0.1,
            })
        }
    }

    toggle()
    {
        this.enabled = !this.enabled
        this.gizmoGroup.visible = this.enabled
    }

    setTarget(object)
    {
        if(object)
        {
            this.targetObject = object
        }
    }
}
