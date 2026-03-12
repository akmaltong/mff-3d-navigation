import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import { Game } from './Game.js'

export class POIManager
{
    constructor()
    {
        this.game = Game.getInstance()
        this.pois = []
        this.storageKey = 'custom-folio-pois'
        this.markerGroup = new THREE.Group()
        this.markerGroup.name = 'poi-markers'
        this.game.scene.add(this.markerGroup)

        // Editing state
        this.editing = null // { poi, marker, gizmo }

        // Drag state
        this.drag = {
            active: false,
            axis: null,       // 'x', 'y', or 'z'
            startMouse: new THREE.Vector2(),
            startPos: new THREE.Vector3(),
            plane: new THREE.Plane(),
            intersection: new THREE.Vector3(),
        }

        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()

        // Clear old POIs from previous sessions to start fresh
        localStorage.removeItem(this.storageKey)
        this.pois = []
        this.rebuildMarkers()

        // Bind mouse handlers
        this._onPointerDown = this.onPointerDown.bind(this)
        this._onPointerMove = this.onPointerMove.bind(this)
        this._onPointerUp = this.onPointerUp.bind(this)

        // Create invisible overlay to block game input during gizmo drag
        this.dragOverlay = document.createElement('div')
        this.dragOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999;cursor:grabbing;display:none;'
        document.body.appendChild(this.dragOverlay)

        // Listen on canvas for initial click (capture phase to intercept before game)
        const canvas = this.game.canvasElement
        canvas.addEventListener('pointerdown', this._onPointerDown, true)
        canvas.addEventListener('pointermove', this._onPointerMove, true)
        // Listen on overlay for move/up during drag (overlay blocks game input)
        this.dragOverlay.addEventListener('pointermove', this._onPointerMove)
        this.dragOverlay.addEventListener('pointerup', this._onPointerUp)
        // Also listen on window as fallback for pointerup outside overlay
        window.addEventListener('pointerup', this._onPointerUp)

        // Tick handler for gizmo sync
        this.game.ticker.events.on('tick', () => this.updateEditGizmo(), 6)
    }

    // ─── Mouse → NDC ───
    getNDC(e)
    {
        const rect = this.game.canvasElement.getBoundingClientRect()
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    // ─── Pointer Down: detect axis hit or marker click ───
    onPointerDown(e)
    {
        this.getNDC(e)
        this.raycaster.setFromCamera(this.mouse, this.game.view.camera)

        // If editing — check gizmo axes first
        if(this.editing && this.editing.gizmo)
        {
            const axisMeshes = []
            this.editing.gizmo.traverse(c =>
            {
                if(c.isMesh && c.userData.axis) axisMeshes.push(c)
            })

            const hits = this.raycaster.intersectObjects(axisMeshes, false)
            if(hits.length > 0)
            {
                e.preventDefault()
                e.stopImmediatePropagation()

                // Disable camera map controls during drag
                this.game.view.focusPoint.isTracking = false

                const axis = hits[0].object.userData.axis
                this.drag.active = true
                this.drag.axis = axis
                this.drag.startPos.copy(this.editing.marker.position)
                this.drag.startMouse.copy(this.mouse)

                const axisDir = new THREE.Vector3()
                if(axis === 'x') axisDir.set(1, 0, 0)
                else if(axis === 'y') axisDir.set(0, 1, 0)
                else axisDir.set(0, 0, 1)

                const camDir = this.game.view.camera.position.clone().sub(this.editing.marker.position).normalize()
                const planeNormal = new THREE.Vector3().crossVectors(camDir, axisDir).cross(axisDir).normalize()
                if(planeNormal.lengthSq() < 0.001) planeNormal.copy(camDir)
                this.drag.plane.setFromNormalAndCoplanarPoint(planeNormal, this.editing.marker.position)
                this.raycaster.ray.intersectPlane(this.drag.plane, this.drag.intersection)

                this.dragOverlay.style.display = 'block'
                this.highlightAxis(axis, true)
                return
            }
        }

        // Not editing or missed gizmo — check marker clicks for flyTo
        if(!this.editing && this.markerGroup.children.length > 0)
        {
            const markerMeshes = []
            this.markerGroup.traverse(c =>
            {
                if(c.isMesh && c.userData.poiId) markerMeshes.push(c)
            })

            const hits = this.raycaster.intersectObjects(markerMeshes, false)
            if(hits.length > 0)
            {
                const poiId = hits[0].object.userData.poiId
                this.flyTo(poiId)
            }
        }
    }

    // ─── Pointer Move: drag along axis ───
    onPointerMove(e)
    {
        if(this.drag.active)
        {
            e.stopImmediatePropagation()
            e.preventDefault()

            if(!this.editing || !this.editing.gizmo) return

            this.getNDC(e)
            this.raycaster.setFromCamera(this.mouse, this.game.view.camera)

            const newIntersection = new THREE.Vector3()
            if(!this.raycaster.ray.intersectPlane(this.drag.plane, newIntersection)) return

            const delta = newIntersection.clone().sub(this.drag.intersection)
            const axisDir = new THREE.Vector3()
            if(this.drag.axis === 'x') axisDir.set(1, 0, 0)
            else if(this.drag.axis === 'y') axisDir.set(0, 1, 0)
            else axisDir.set(0, 0, 1)

            const projected = axisDir.multiplyScalar(delta.dot(axisDir))
            this.editing.marker.position.copy(this.drag.startPos).add(projected)

            if(this._onDragChange) this._onDragChange()
            return
        }

        this.getNDC(e)
        this.raycaster.setFromCamera(this.mouse, this.game.view.camera)

        // Editing mode — hover gizmo axes
        if(this.editing && this.editing.gizmo)
        {
            const axisMeshes = []
            this.editing.gizmo.traverse(c => { if(c.isMesh && c.userData.axis) axisMeshes.push(c) })
            const hits = this.raycaster.intersectObjects(axisMeshes, false)
            this.game.canvasElement.style.cursor = hits.length > 0 ? 'grab' : ''
            this.highlightAxis(null, false)
            if(hits.length > 0) this.highlightAxis(hits[0].object.userData.axis, true)
            return
        }

        // Not editing — hover markers for pointer cursor
        if(this.markerGroup.children.length > 0)
        {
            const markerMeshes = []
            this.markerGroup.traverse(c => { if(c.isMesh && c.userData.poiId) markerMeshes.push(c) })
            const hits = this.raycaster.intersectObjects(markerMeshes, false)
            this.game.canvasElement.style.cursor = hits.length > 0 ? 'pointer' : ''
        }
    }

    // ─── Pointer Up: end drag ───
    onPointerUp(e)
    {
        if(!this.drag.active) return

        this.drag.active = false
        this.dragOverlay.style.display = 'none'
        this.game.canvasElement.style.cursor = ''
        this.highlightAxis(null, false)

        if(this._onDragChange) this._onDragChange()
    }

    // ─── Highlight / unhighlight axis ───
    highlightAxis(axis, on)
    {
        if(!this.editing || !this.editing.gizmo) return
        this.editing.gizmo.traverse(c =>
        {
            if(!c.isMesh || !c.userData.axis) return
            if(axis === null)
            {
                // Reset all to default opacity
                c.material.opacity = c.userData.defaultOpacity || 0.9
                return
            }
            if(c.userData.axis === axis)
                c.material.opacity = on ? 1.0 : (c.userData.defaultOpacity || 0.9)
            else
                c.material.opacity = on ? 0.3 : (c.userData.defaultOpacity || 0.9)
        })
    }

    // ─── POI lifecycle ───

    startAddPOI(name)
    {
        if(this.editing) this.cancelEdit()

        const focusPos = this.game.view.focusPoint.position.clone()
        const camPos = this.game.view.camera.position.clone()

        const poi = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: name || `POI ${this.pois.length + 1}`,
            target: { x: focusPos.x, y: 0, z: focusPos.z },
            cameraOffset: {
                x: camPos.x - focusPos.x,
                y: camPos.y,
                z: camPos.z - focusPos.z,
            },
            color: this.getColorForIndex(this.pois.length),
        }

        this.pois.push(poi)
        const marker = this.createMarker(poi)
        this.editing = { poi, marker, gizmo: this.createEditGizmo(marker) }
        return poi
    }

    confirmEdit()
    {
        if(!this.editing) return null
        const { marker, poi } = this.editing

        poi.target.x = marker.position.x
        poi.target.y = marker.position.y
        poi.target.z = marker.position.z

        const camPos = this.game.view.camera.position
        poi.cameraOffset = {
            x: camPos.x - poi.target.x,
            y: camPos.y,
            z: camPos.z - poi.target.z,
        }

        this.removeEditGizmo()
        this.editing = null
        this.savePOIs()
        return poi
    }

    cancelEdit()
    {
        if(!this.editing) return
        if(!this.editing.isExisting)
        {
            const idx = this.pois.findIndex(p => p.id === this.editing.poi.id)
            if(idx !== -1) this.pois.splice(idx, 1)
            if(this.editing.marker)
            {
                this.editing.marker.traverse(c => { if(c.geometry) c.geometry.dispose(); if(c.material) c.material.dispose() })
                this.markerGroup.remove(this.editing.marker)
            }
        }
        this.removeEditGizmo()
        this.editing = null
    }

    startEditExisting(id)
    {
        if(this.editing) this.cancelEdit()
        const poi = this.pois.find(p => p.id === id)
        if(!poi) return null
        const marker = this.markerGroup.children.find(c => c.name === `poi-${poi.id}`)
        if(!marker) return null
        this.editing = { poi, marker, gizmo: this.createEditGizmo(marker), isExisting: true }
        return poi
    }

    confirmEditExisting()
    {
        if(!this.editing) return null
        const { marker, poi } = this.editing

        poi.target.x = marker.position.x
        poi.target.y = marker.position.y
        poi.target.z = marker.position.z

        const camPos = this.game.view.camera.position
        poi.cameraOffset = {
            x: camPos.x - poi.target.x,
            y: camPos.y,
            z: camPos.z - poi.target.z,
        }

        this.removeEditGizmo()
        this.editing = null
        this.savePOIs()
        return poi
    }

    // ─── Zone editing (mockData zones with 3D gizmo) ───

    startEditZone(zone, onChange)
        {
            if(this.editing) this.cancelEdit()

            // Create a lightweight invisible anchor (no visible marker — the gizmo IS the marker)
            const anchor = new THREE.Group()
            anchor.name = `zone-anchor-${zone.id}`
            anchor.position.set(zone.position[0], zone.position[1] || 0, zone.position[2])
            this.game.scene.add(anchor)

            const gizmo = this.createEditGizmo(anchor)

            this._onDragChange = () =>
            {
                // Sync zone data from anchor position on every drag tick
                zone.position[0] = anchor.position.x
                zone.position[1] = anchor.position.y
                zone.position[2] = anchor.position.z
                if(onChange) onChange(anchor.position)
            }

            this.editing = { poi: null, marker: anchor, gizmo, isZone: true, zone }
        }


    stopEditZone()
    {
        if(!this.editing || !this.editing.isZone) return
        const { marker } = this.editing

        // Remove anchor from scene (it's a plain Group, not in markerGroup)
        this.game.scene.remove(marker)

        this.removeEditGizmo()
        this._onDragChange = null
        this.editing = null
    }

    // ─── Gizmo creation with tagged axis meshes ───

    createEditGizmo(marker)
    {
        const gizmo = new THREE.Group()
        gizmo.name = 'poi-edit-gizmo'

        const len = 5
        const hitRadius = 1.0  // Fat invisible hitbox for easy clicking
        const visThick = 0.2

        const makeAxis = (axis, color, rotFn, posFn) =>
        {
            const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })

            // Visual bar
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(visThick, visThick, len, 8), mat)
            bar.userData.axis = axis
            bar.userData.defaultOpacity = 0.9
            rotFn(bar)
            posFn(bar, len / 2)
            gizmo.add(bar)

            // Visual cone
            const cone = new THREE.Mesh(new THREE.ConeGeometry(visThick * 3, visThick * 6, 8), mat.clone())
            cone.material.transparent = true
            cone.material.opacity = 0.9
            cone.userData.axis = axis
            cone.userData.defaultOpacity = 0.9
            rotFn(cone)
            posFn(cone, len)
            gizmo.add(cone)

            // Invisible fat hitbox for easier mouse picking
            const hitMat = new THREE.MeshBasicMaterial({ visible: false })
            const hitBox = new THREE.Mesh(new THREE.CylinderGeometry(hitRadius, hitRadius, len + 1, 8), hitMat)
            hitBox.userData.axis = axis
            rotFn(hitBox)
            posFn(hitBox, len / 2)
            gizmo.add(hitBox)
        }

        // X axis (red)
        makeAxis('x', 0xff0000,
            (m) => { m.rotation.z = -Math.PI / 2 },
            (m, d) => { m.position.x = d }
        )

        // Y axis (green)
        makeAxis('y', 0x00ff00,
            () => {},
            (m, d) => { m.position.y = d }
        )

        // Z axis (blue)
        makeAxis('z', 0x4488ff,
            (m) => { m.rotation.x = Math.PI / 2 },
            (m, d) => { m.position.z = d }
        )

        // Center sphere (for free drag — optional, not axis-constrained)
        const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), centerMat)
        gizmo.add(center)

        gizmo.position.copy(marker.position)
        this.game.scene.add(gizmo)
        return gizmo
    }

    removeEditGizmo()
    {
        if(this.editing && this.editing.gizmo)
        {
            this.editing.gizmo.traverse(c => { if(c.geometry) c.geometry.dispose(); if(c.material) c.material.dispose() })
            this.game.scene.remove(this.editing.gizmo)
        }
    }

    updateEditGizmo()
    {
        if(this.editing && this.editing.gizmo && this.editing.marker)
        {
            this.editing.gizmo.position.copy(this.editing.marker.position)
        }
    }

    setEditingPosition(axis, value)
    {
        if(!this.editing || !this.editing.marker) return
        this.editing.marker.position[axis] = value
    }

    getEditingPosition()
    {
        if(!this.editing || !this.editing.marker) return null
        const p = this.editing.marker.position
        return { x: p.x, y: p.y, z: p.z }
    }

    // ─── Standard POI operations ───

    removePOI(id)
    {
        const index = this.pois.findIndex(p => p.id === id)
        if(index === -1) return
        this.pois.splice(index, 1)
        this.rebuildMarkers()
        this.savePOIs()
    }

    flyTo(id)
    {
        const poi = this.pois.find(p => p.id === id)
        if(!poi) return

        const view = this.game.view

        // Stop tracking the car so we can move the focus point freely
        view.focusPoint.isTracking = false
        view.focusPoint.magnet.active = false

        // Smoothly animate the focus point to the POI target
        // The camera will follow naturally via the spherical offset + smoothing
        gsap.to(view.focusPoint.position, {
            x: poi.target.x,
            z: poi.target.z,
            duration: 2.0,
            ease: 'power2.inOut',
            overwrite: true,
        })
    }

    createMarker(poi)
    {
        const group = new THREE.Group()
        group.name = `poi-${poi.id}`
        group.userData.poiId = poi.id

        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 8)
        const poleMat = new THREE.MeshBasicMaterial({ color: poi.color, transparent: true, opacity: 0.6 })
        const pole = new THREE.Mesh(poleGeo, poleMat)
        pole.position.y = 2
        pole.userData.poiId = poi.id
        group.add(pole)

        const headGeo = new THREE.SphereGeometry(0.5, 16, 16)
        const headMat = new THREE.MeshBasicMaterial({ color: poi.color })
        const head = new THREE.Mesh(headGeo, headMat)
        head.position.y = 4.3
        head.userData.poiId = poi.id
        group.add(head)

        const ringGeo = new THREE.TorusGeometry(0.7, 0.06, 8, 32)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.position.y = 4.3
        ring.rotation.x = Math.PI / 2
        ring.userData.poiId = poi.id
        group.add(ring)

        // Invisible larger hitbox for easier clicking
        const hitGeo = new THREE.CylinderGeometry(1.2, 1.2, 5, 8)
        const hitMat = new THREE.MeshBasicMaterial({ visible: false })
        const hitbox = new THREE.Mesh(hitGeo, hitMat)
        hitbox.position.y = 2.5
        hitbox.userData.poiId = poi.id
        group.add(hitbox)

        group.position.set(poi.target.x, poi.target.y, poi.target.z)
        this.markerGroup.add(group)
        return group
    }

    rebuildMarkers()
    {
        while(this.markerGroup.children.length > 0)
        {
            const child = this.markerGroup.children[0]
            child.traverse(c => { if(c.geometry) c.geometry.dispose(); if(c.material) c.material.dispose() })
            this.markerGroup.remove(child)
        }
        for(const poi of this.pois) this.createMarker(poi)
    }

    getColorForIndex(index)
    {
        const colors = [
            '#ff4444', '#44ff44', '#4488ff', '#ffaa00',
            '#ff44ff', '#44ffff', '#ffff44', '#ff8844',
            '#88ff44', '#4444ff', '#ff4488', '#44ff88',
        ]
        return colors[index % colors.length]
    }

    savePOIs() { localStorage.setItem(this.storageKey, JSON.stringify(this.pois)) }

    loadPOIs()
    {
        const data = localStorage.getItem(this.storageKey)
        if(data) { try { this.pois = JSON.parse(data) } catch(e) { this.pois = [] } }
    }

    getAll() { return this.pois }
    isEditing() { return this.editing !== null }
}
