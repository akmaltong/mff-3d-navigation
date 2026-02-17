import * as THREE from 'three/webgpu'
import { Game } from './Game.js'

/**
 * Visual target marker + draggable gizmo for the camera focus point.
 * Shows where the camera is looking and allows moving it with mouse drag.
 */
export class FocusPointGizmo
{
    constructor()
    {
        this.game = Game.getInstance()
        this.enabled = true
        this.drag = {
            active: false,
            axis: null,
            startPos: new THREE.Vector3(),
            plane: new THREE.Plane(),
            intersection: new THREE.Vector3(),
        }
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()

        this._buildMarker()
        this._buildGizmo()
        this._bindEvents()

        // Sync on tick
        this.game.ticker.events.on('tick', () => this._update(), 6)
    }

    _buildMarker()
    {
        this.group = new THREE.Group()
        this.group.name = 'focus-point-target'

        // Cross-hair ring
        const ringGeo = new THREE.TorusGeometry(1.2, 0.06, 8, 32)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2
        this.group.add(ring)

        // Center dot
        const dotGeo = new THREE.SphereGeometry(0.25, 12, 12)
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 })
        this.dot = new THREE.Mesh(dotGeo, dotMat)
        this.group.add(this.dot)

        // Vertical pole
        const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2, 6)
        const poleMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 })
        const pole = new THREE.Mesh(poleGeo, poleMat)
        pole.position.y = 1
        this.group.add(pole)

        this.game.scene.add(this.group)
    }

    _buildGizmo()
    {
        this.gizmo = new THREE.Group()
        this.gizmo.name = 'focus-gizmo'

        const len = 4
        const hitRadius = 1.0
        const visThick = 0.15

        const makeAxis = (axis, color, rotFn, posFn) =>
        {
            const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })

            const bar = new THREE.Mesh(new THREE.CylinderGeometry(visThick, visThick, len, 8), mat)
            bar.userData.axis = axis
            bar.userData.defaultOpacity = 0.7
            rotFn(bar)
            posFn(bar, len / 2)
            this.gizmo.add(bar)

            const cone = new THREE.Mesh(new THREE.ConeGeometry(visThick * 3, visThick * 5, 8), mat.clone())
            cone.material.transparent = true
            cone.material.opacity = 0.7
            cone.userData.axis = axis
            cone.userData.defaultOpacity = 0.7
            rotFn(cone)
            posFn(cone, len)
            this.gizmo.add(cone)

            const hitMat = new THREE.MeshBasicMaterial({ visible: false })
            const hitBox = new THREE.Mesh(new THREE.CylinderGeometry(hitRadius, hitRadius, len + 1, 8), hitMat)
            hitBox.userData.axis = axis
            rotFn(hitBox)
            posFn(hitBox, len / 2)
            this.gizmo.add(hitBox)
        }

        makeAxis('x', 0xff4444, (m) => { m.rotation.z = -Math.PI / 2 }, (m, d) => { m.position.x = d })
        makeAxis('z', 0x4488ff, (m) => { m.rotation.x = Math.PI / 2 }, (m, d) => { m.position.z = d })

        this.game.scene.add(this.gizmo)
    }

    _bindEvents()
    {
        this._onPointerDown = this._pointerDown.bind(this)
        this._onPointerMove = this._pointerMove.bind(this)
        this._onPointerUp = this._pointerUp.bind(this)

        // Overlay for drag
        this.dragOverlay = document.createElement('div')
        this.dragOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:998;cursor:grabbing;display:none;'
        document.body.appendChild(this.dragOverlay)

        const canvas = this.game.canvasElement
        canvas.addEventListener('pointerdown', this._onPointerDown, true)
        canvas.addEventListener('pointermove', this._onPointerMove, true)
        this.dragOverlay.addEventListener('pointermove', this._onPointerMove)
        this.dragOverlay.addEventListener('pointerup', this._onPointerUp)
        window.addEventListener('pointerup', this._onPointerUp)
    }

    _getNDC(e)
    {
        const rect = this.game.canvasElement.getBoundingClientRect()
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    _pointerDown(e)
    {
        if(!this.enabled) return

        this._getNDC(e)
        this.raycaster.setFromCamera(this.mouse, this.game.view.camera)

        const axisMeshes = []
        this.gizmo.traverse(c => { if(c.isMesh && c.userData.axis) axisMeshes.push(c) })

        const hits = this.raycaster.intersectObjects(axisMeshes, false)
        if(hits.length > 0)
        {
            e.preventDefault()
            e.stopImmediatePropagation()

            const view = this.game.view
            view.focusPoint.isTracking = false
            view.focusPoint.magnet.active = false

            const axis = hits[0].object.userData.axis
            this.drag.active = true
            this.drag.axis = axis
            this.drag.startPos.copy(view.focusPoint.position)

            const axisDir = new THREE.Vector3()
            if(axis === 'x') axisDir.set(1, 0, 0)
            else axisDir.set(0, 0, 1)

            const camDir = this.game.view.camera.position.clone().sub(view.focusPoint.position).normalize()
            const planeNormal = new THREE.Vector3().crossVectors(camDir, axisDir).cross(axisDir).normalize()
            if(planeNormal.lengthSq() < 0.001) planeNormal.copy(camDir)
            this.drag.plane.setFromNormalAndCoplanarPoint(planeNormal, view.focusPoint.position)
            this.raycaster.ray.intersectPlane(this.drag.plane, this.drag.intersection)

            this.dragOverlay.style.display = 'block'
            this._highlightAxis(axis, true)
        }
    }

    _pointerMove(e)
    {
        if(!this.drag.active) return

        e.stopImmediatePropagation()
        e.preventDefault()

        this._getNDC(e)
        this.raycaster.setFromCamera(this.mouse, this.game.view.camera)

        const newIntersection = new THREE.Vector3()
        if(!this.raycaster.ray.intersectPlane(this.drag.plane, newIntersection)) return

        const delta = newIntersection.clone().sub(this.drag.intersection)
        const axisDir = new THREE.Vector3()
        if(this.drag.axis === 'x') axisDir.set(1, 0, 0)
        else axisDir.set(0, 0, 1)

        const projected = axisDir.multiplyScalar(delta.dot(axisDir))
        const view = this.game.view
        view.focusPoint.position.x = this.drag.startPos.x + projected.x
        view.focusPoint.position.z = this.drag.startPos.z + projected.z
    }

    _pointerUp()
    {
        if(!this.drag.active) return
        this.drag.active = false
        this.dragOverlay.style.display = 'none'
        this.game.canvasElement.style.cursor = ''
        this._highlightAxis(null, false)
    }

    _highlightAxis(axis, on)
    {
        this.gizmo.traverse(c =>
        {
            if(!c.isMesh || !c.userData.axis) return
            if(axis === null) { c.material.opacity = c.userData.defaultOpacity || 0.7; return }
            c.material.opacity = (c.userData.axis === axis) ? (on ? 1.0 : 0.7) : (on ? 0.25 : 0.7)
        })
    }

    _update()
    {
        if(!this.enabled) return
        const fp = this.game.view.focusPoint.position
        this.group.position.set(fp.x, 0.1, fp.z)
        this.gizmo.position.set(fp.x, 0.1, fp.z)
    }

    setVisible(visible)
    {
        this.enabled = visible
        this.group.visible = visible
        this.gizmo.visible = visible
    }

    destroy()
    {
        this.game.scene.remove(this.group)
        this.game.scene.remove(this.gizmo)
        if(this.dragOverlay.parentNode) this.dragOverlay.parentNode.removeChild(this.dragOverlay)
        const canvas = this.game.canvasElement
        canvas.removeEventListener('pointerdown', this._onPointerDown, true)
        canvas.removeEventListener('pointermove', this._onPointerMove, true)
    }
}
