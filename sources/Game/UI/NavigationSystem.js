import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import gsap from 'gsap'
import { Game } from '../Game.js'
import { UIStore } from './UIStore.js'
import { zones } from './data/mockData.js'

/**
 * Bridge between UI (UIStore) and 3D scene.
 * Handles: camera fly-to zones, POI marker visibility, route line rendering,
 * POI labels, chevron route arrows, minimap route sync.
 */

const ACCREDITATION_ZONE_ID = 'zone-2'

export class NavigationSystem
{
    constructor()
    {
        this.game = Game.getInstance()
        this.store = UIStore.getInstance()

        // Route line
        this.routeLine = null
        this.routeGroup = new THREE.Group()
        this.routeGroup.name = 'navigation-routes'
        this.game.scene.add(this.routeGroup)

        // Zone POI markers (separate from POIManager's custom POIs)
        this.zoneMarkerGroup = new THREE.Group()
        this.zoneMarkerGroup.name = 'zone-poi-markers'
        this.zoneMarkerGroup.visible = this.store.showPOI
        this.game.scene.add(this.zoneMarkerGroup)

        // DOM labels container for POI names
        this._labelContainer = document.createElement('div')

        // Load arrow GLB model for route chevrons
        this._arrowModel = null
        this._arrowModelPromise = this._loadArrowModel()
        this._labelContainer.className = 'mff-poi-labels'
        this._labelContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:911;'
        document.body.appendChild(this._labelContainer)
        this._labels = []

        // Current route waypoints (for minimap sync)
        this.currentRoutePoints = null

        this._buildZoneMarkers()
        this._buildPOILabels()
        this._bindEvents()
        this._bindMarkerClicks()
        this._startLabelUpdate()
    }

    _bindEvents()
    {
        // Fly to zone (camera animation)
        this.store.events.on('change:cameraTarget', (zoneId) =>
        {
            if(zoneId) this._flyToZone(zoneId)
        })

        // Draw route only (no camera movement)
        this.store.events.on('change:routeTarget', (zoneId) =>
        {
            if(zoneId) this._drawRouteToZone(zoneId)
        })

        // Fly to position (friends)
        this.store.events.on('change:cameraTargetPosition', (pos) =>
        {
            if(pos) this._flyToPosition(pos)
        })

        // Reset camera
        this.store.events.on('change:resetCameraToOverview', (val) =>
        {
            if(val)
            {
                this._resetCamera()
                this.store.set('resetCameraToOverview', false)
            }
        })

        // Toggle zone markers
        this.store.events.on('change:showPOI', (val) =>
        {
            this.zoneMarkerGroup.visible = val
        })
    }

    // ---- POI Labels (DOM projected from 3D) ----

    _buildPOILabels()
    {
        // POI labels removed — only markers shown in 3D scene
        this._labelContainer.innerHTML = ''
        this._labels = []
        this._labelContainer.style.display = 'none'
    }

    _startLabelUpdate()
    {
        // Labels removed — no-op
    }

    // ---- Click zone markers in 3D scene ----

    _bindMarkerClicks()
    {
        this._raycaster = new THREE.Raycaster()
        this._mouse = new THREE.Vector2()

        this._onMarkerClick = (e) =>
        {
            const rect = this.game.canvasElement.getBoundingClientRect()
            this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            this._raycaster.setFromCamera(this._mouse, this.game.view.camera)

            // Don't intercept if POIManager is dragging
            if(this.game.poiManager?.drag?.active) return
            if(this.game.focusPointGizmo?.drag?.active) return

            const meshes = []
            this.zoneMarkerGroup.traverse(c => { if(c.isMesh) meshes.push(c) })
            const hits = this._raycaster.intersectObjects(meshes, false)
            if(hits.length === 0) return

            // Walk up to find the zone group
            let obj = hits[0].object
            while(obj && obj.parent !== this.zoneMarkerGroup) obj = obj.parent
            if(!obj || !obj.name) return

            const zoneId = obj.name.replace('zone-marker-', '')
            const zone = zones.find(z => z.id === zoneId)
            if(!zone) return

            // Route picking mode: send zone to RoutePanel
            if(this.store.activePanel === 'route')
            {
                this.store.events.trigger('routePick', [zone])
                return
            }

            // Game mode: open zone detail card on click
            if(this.store.gameMode)
            {
                this.store.set('activePanel', null)
                this.store.set('activeBottomPanel', null)
                this.store.set('selectedZone', zone)
                this._flyToZone(zoneId)
                return
            }

            // Editor mode: open edit panel in SettingsPanel
            const settingsPanel = this.game.uiOverlay?.settingsPanel
            if(settingsPanel) settingsPanel.openZoneEditById(zoneId)
        }

        this.game.canvasElement.addEventListener('pointerdown', this._onMarkerClick, false)
    }

    // ---- Camera fly-to ----

    _flyToZone(zoneId)
    {
        const zone = zones.find(z => z.id === zoneId)
        if(!zone) return

        const tx = zone.position[0]
        const tz = zone.position[2]
        const view = this.game.view

        view.focusPoint.isTracking = false
        view.focusPoint.magnet.active = false

        gsap.to(view.focusPoint.position, {
            x: tx,
            z: tz,
            duration: 2.0,
            ease: 'power2.inOut',
        })

        setTimeout(() => this.store.cameraTarget = null, 100)
    }

    _flyToPosition(pos)
    {
        const target = Array.isArray(pos) ? new THREE.Vector3(pos[0], pos[1], pos[2]) : new THREE.Vector3(pos.x, pos.y, pos.z)
        const view = this.game.view

        view.focusPoint.isTracking = false
        view.focusPoint.magnet.active = false

        gsap.to(view.focusPoint.position, {
            x: target.x,
            z: target.z,
            duration: 2.0,
            ease: 'power2.inOut',
        })
    }

    // ---- Draw route (default start: Аккредитация) ----

    _drawRouteToZone(zoneId)
    {
        const zone = zones.find(z => z.id === zoneId)
        if(!zone) return

        // Default start from Аккредитация
        const accZone = zones.find(z => z.id === ACCREDITATION_ZONE_ID)
        const startPos = accZone ? accZone.position : [this.game.player.position.x, this.game.player.position.y, this.game.player.position.z]

        this._drawNavMeshRoute(startPos, zone.position)

        this.store.set('isNavigating', true)
        this.store.set('currentRoute', { from: startPos, to: zone.position, startZone: accZone, endZone: zone })

        setTimeout(() => this.store.routeTarget = null, 100)
    }

    _resetCamera()
    {
        const view = this.game.view

        // Fly to center between lounge zones
        view.focusPoint.isTracking = false
        view.focusPoint.magnet.active = false

        gsap.to(view.focusPoint.position, {
            x: -26.05,
            z: 1.19,
            duration: 2.0,
            ease: 'power2.inOut',
        })

        this._clearRoute()
    }

    // ---- NavMesh route drawing ----

    _drawNavMeshRoute(from, to)
    {
        this._clearRoute()

        const navMesh = this.game.navMeshSystem
        if(!navMesh || !navMesh.ready)
        {
            this._drawFallbackRoute(
                new THREE.Vector3(from[0], 0.5, from[2]),
                new THREE.Vector3(to[0], 0.5, to[2])
            )
            return
        }

        const route = navMesh.calculateRoute(from, to)
        if(!route.waypoints || route.waypoints.length < 2)
        {
            this._drawFallbackRoute(
                new THREE.Vector3(from[0], 0.5, from[2]),
                new THREE.Vector3(to[0], 0.5, to[2])
            )
            return
        }

        // Build path from waypoints
        const points = route.waypoints
            .filter(p => !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2]))
            .map(p => new THREE.Vector3(p[0], p[1] + 0.15, p[2]))

        // Remove near-duplicate points
        const filtered = [points[0]]
        for(let i = 1; i < points.length; i++)
        {
            if(points[i].distanceTo(filtered[filtered.length - 1]) > 0.5)
                filtered.push(points[i])
        }
        if(filtered.length < 2) filtered.push(points[points.length - 1])

        // Store for minimap sync (Task 8)
        this.currentRoutePoints = filtered.map(p => [p.x, p.z])

        // Emit route change for minimap
        this.store.events.trigger('routePointsChanged', [this.currentRoutePoints])

        // Chevron arrows along route (no ribbon line)
        this._addChevronArrows(filtered)

        // Destination marker
        this._addDestinationMarker(filtered[filtered.length - 1])
    }

    // ---- Route ribbon — REMOVED, replaced by chevron-only route ----

    _drawRouteRibbon(points)
    {
        // No-op: route is now chevron arrows only
    }

    // ---- Load arrow GLB model ----

    _loadArrowModel()
    {
        return new Promise((resolve) =>
        {
            const loader = new GLTFLoader()
            loader.load('SM_Arrow.glb', (gltf) =>
            {
                let mesh = null
                gltf.scene.traverse((child) =>
                {
                    if(!mesh && child.isMesh) mesh = child
                })
                if(mesh)
                {
                    mesh.material = new THREE.MeshBasicMaterial({
                        color: 0x22c55e,
                        transparent: true,
                        opacity: 0.85,
                        side: THREE.DoubleSide,
                        depthWrite: false,
                    })
                    this._arrowModel = mesh
                }
                resolve()
            }, undefined, (err) =>
            {
                console.warn('Failed to load SM_Arrow.glb, using fallback chevrons', err)
                resolve()
            })
        })
    }

    // ---- Chevron arrows (green arrows on floor, using GLB model) ----

    async _addChevronArrows(points)
    {
        // Wait for arrow model to load
        await this._arrowModelPromise

        // Build segment info
        let totalLen = 0
        const segments = []
        for(let i = 0; i < points.length - 1; i++)
        {
            const segLen = points[i].distanceTo(points[i + 1])
            segments.push({ start: points[i], end: points[i + 1], len: segLen, cumLen: totalLen })
            totalLen += segLen
        }

        const spacing = 1.5
        const count = Math.max(4, Math.floor(totalLen / spacing))

        // Set a flag so animation loop works
        this.routeLine = true

        for(let i = 0; i < count; i++)
        {
            const t = (i + 0.5) / count
            const targetDist = t * totalLen

            let seg = segments[0]
            for(const s of segments)
            {
                if(s.cumLen + s.len >= targetDist) { seg = s; break }
            }

            const localT = seg.len > 0 ? (targetDist - seg.cumLen) / seg.len : 0
            const pos = seg.start.clone().lerp(seg.end, Math.min(1, localT))

            // Direction: from start toward end of segment
            const dir = seg.end.clone().sub(seg.start)
            dir.y = 0
            dir.normalize()

            let chevron

            if(this._arrowModel)
            {
                // Clone the loaded GLB mesh
                chevron = this._arrowModel.clone()
                chevron.material = this._arrowModel.material.clone()
                chevron.scale.set(0.5, 0.5, 0.5)
            }
            else
            {
                // Fallback: programmatic double-chevron shape
                chevron = this._createFallbackChevron()
            }

            chevron.position.copy(pos)
            chevron.position.y = (seg.start.y + seg.end.y) / 2 + 0.08

            // Orient arrow along route direction (from A to B)
            const angle = Math.atan2(dir.x, dir.z) + Math.PI * 0.5
            chevron.rotation.y = angle

            chevron.name = 'route-chevron'
            this.routeGroup.add(chevron)
        }

        // Animate: traveling wave from start to end
        let elapsed = 0
        const chevrons = this.routeGroup.children.filter(c => c.name === 'route-chevron')

        const animateChevrons = () =>
        {
            if(!this.routeLine) return
            elapsed += 0.016

            for(let i = 0; i < chevrons.length; i++)
            {
                const c = chevrons[i]
                const phase = (elapsed * 2.5 - i * 0.5) % (Math.PI * 2)
                const pulse = Math.max(0, Math.sin(phase))
                c.material.opacity = 0.25 + pulse * 0.75
                const s = 0.5 + pulse * 0.08
                c.scale.set(s, s, s)
            }
            this._arrowAnimFrame = requestAnimationFrame(animateChevrons)
        }
        this._arrowAnimFrame = requestAnimationFrame(animateChevrons)
    }

    // Fallback shape if GLB not loaded yet
    _createFallbackChevron()
    {
        const createV = (offsetY) =>
        {
            const shape = new THREE.Shape()
            const w = 0.6, h = 0.5, t = 0.12
            shape.moveTo(-w, offsetY)
            shape.lineTo(0, offsetY + h)
            shape.lineTo(w, offsetY)
            shape.lineTo(w - t, offsetY)
            shape.lineTo(0, offsetY + h - t * 1.5)
            shape.lineTo(-w + t, offsetY)
            shape.closePath()
            return shape
        }

        const geo1 = new THREE.ShapeGeometry(createV(0))
        const geo2 = new THREE.ShapeGeometry(createV(0.45))

        const pos1 = geo1.attributes.position.array
        const pos2 = geo2.attributes.position.array
        const idx1 = geo1.index ? Array.from(geo1.index.array) : []
        const idx2 = geo2.index ? Array.from(geo2.index.array) : []

        const mergedPos = new Float32Array(pos1.length + pos2.length)
        mergedPos.set(pos1, 0)
        mergedPos.set(pos2, pos1.length)

        const vertexOffset = pos1.length / 3
        const mergedIdx = [...idx1, ...idx2.map(i => i + vertexOffset)]

        const mergedGeo = new THREE.BufferGeometry()
        mergedGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3))
        mergedGeo.setIndex(mergedIdx)
        mergedGeo.rotateX(-Math.PI / 2)

        const mat = new THREE.MeshBasicMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            depthWrite: false,
        })

        const mesh = new THREE.Mesh(mergedGeo, mat)
        geo1.dispose()
        geo2.dispose()
        return mesh
    }

    _addDestinationMarker(position)
    {
        const ringGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 32)
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.6,
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.position.copy(position)
        ring.position.y = 0.3
        ring.rotation.x = -Math.PI / 2
        ring.name = 'route-destination'
        this.routeGroup.add(ring)

        gsap.to(ring.scale, {
            x: 1.5, y: 1.5, z: 1.5,
            duration: 1,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
        })
    }

    _drawFallbackRoute(from, to)
    {
        const midY = Math.max(from.y, to.y) + 2
        const mid = new THREE.Vector3(
            (from.x + to.x) / 2,
            midY,
            (from.z + to.z) / 2
        )

        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(from.x, 0.5, from.z),
            mid,
            to
        )

        const pts = curve.getPoints(40)

        // Store for minimap
        this.currentRoutePoints = pts.map(p => [p.x, p.z])
        this.store.events.trigger('routePointsChanged', [this.currentRoutePoints])

        // Flatten points to floor level for chevrons
        const floorPts = pts.map(p => new THREE.Vector3(p.x, 0.15, p.z))

        // Chevron arrows only (no line)
        this._addChevronArrows(floorPts)

        this._addDestinationMarker(to)
    }

    _clearRoute()
    {
        if(this._arrowAnimFrame)
        {
            cancelAnimationFrame(this._arrowAnimFrame)
            this._arrowAnimFrame = null
        }

        while(this.routeGroup.children.length > 0)
        {
            const child = this.routeGroup.children[0]
            child.traverse(c =>
            {
                if(c.geometry) c.geometry.dispose()
                if(c.material) c.material.dispose()
            })
            this.routeGroup.remove(child)
        }
        this.routeLine = null
        this.currentRoutePoints = null
        this.store.events.trigger('routePointsChanged', [null])
    }

    // ---- Zone markers on scene ----

    _buildZoneMarkers()
    {
        while(this.zoneMarkerGroup.children.length > 0)
        {
            const child = this.zoneMarkerGroup.children[0]
            child.traverse(c =>
            {
                if(c.geometry) c.geometry.dispose()
                if(c.material) c.material.dispose()
            })
            this.zoneMarkerGroup.remove(child)
        }

        for(const zone of zones)
        {
            if(!zone.position) continue

            const group = new THREE.Group()
            group.name = `zone-marker-${zone.id}`

            const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 8)
            const poleMat = new THREE.MeshBasicMaterial({
                color: zone.color,
                transparent: true,
                opacity: 0.5,
            })
            const pole = new THREE.Mesh(poleGeo, poleMat)
            pole.position.y = 1.5
            group.add(pole)

            const headGeo = new THREE.SphereGeometry(0.35, 12, 12)
            const headMat = new THREE.MeshBasicMaterial({ color: zone.color })
            const head = new THREE.Mesh(headGeo, headMat)
            head.position.y = 3.2
            group.add(head)

            const ringGeo = new THREE.TorusGeometry(0.5, 0.04, 8, 24)
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.4,
            })
            const ring = new THREE.Mesh(ringGeo, ringMat)
            ring.position.y = 3.2
            ring.rotation.x = Math.PI / 2
            group.add(ring)

            group.position.set(zone.position[0], zone.position[1] || 0, zone.position[2])
            this.zoneMarkerGroup.add(group)
        }
    }

    rebuildZoneMarkers()
    {
        this._buildZoneMarkers()
        this._buildPOILabels()
    }

    destroy()
    {
        this._clearRoute()
        this.game.scene.remove(this.routeGroup)

        if(this._labelAnimFrame)
        {
            cancelAnimationFrame(this._labelAnimFrame)
        }

        if(this._labelContainer?.parentNode)
            this._labelContainer.parentNode.removeChild(this._labelContainer)

        if(this._onMarkerClick)
            this.game.canvasElement.removeEventListener('pointerdown', this._onMarkerClick, false)

        while(this.zoneMarkerGroup.children.length > 0)
        {
            const child = this.zoneMarkerGroup.children[0]
            child.traverse(c =>
            {
                if(c.geometry) c.geometry.dispose()
                if(c.material) c.material.dispose()
            })
            this.zoneMarkerGroup.remove(child)
        }
        this.game.scene.remove(this.zoneMarkerGroup)
    }
}
