import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import { Game } from '../Game.js'
import { UIStore } from './UIStore.js'
import { zones } from './data/mockData.js'

/**
 * Bridge between UI (UIStore) and 3D scene.
 * Handles: camera fly-to zones, POI marker visibility, route line rendering.
 */
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

        this._buildZoneMarkers()
        this._bindEvents()
        this._bindMarkerClicks()
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

            // Game mode: FLY camera to zone on click
            if(this.store.gameMode)
            {
                this._flyToZone(zoneId)
                return
            }

            // Editor mode: open edit panel in SettingsPanel
            const settingsPanel = this.game.uiOverlay?.settingsPanel
            if(settingsPanel) settingsPanel.openZoneEditById(zoneId)
        }

        this.game.canvasElement.addEventListener('pointerdown', this._onMarkerClick, false)
    }

    // ---- Camera fly-to (animates camera to zone) ----

    _flyToZone(zoneId)
    {
        const zone = zones.find(z => z.id === zoneId)
        if(!zone) return

        const tx = zone.position[0]
        const tz = zone.position[2]
        const view = this.game.view

        // Animate camera focus point to zone position
        view.focusPoint.isTracking = false
        view.focusPoint.magnet.active = false

        gsap.to(view.focusPoint.position, {
            x: tx,
            z: tz,
            duration: 2.0,
            ease: 'power2.inOut',
        })

        // Notify
        this.store.addNotification({
            id: `nav-${Date.now()}`,
            type: 'navigation',
            title: zone.name,
            message: 'Камера перемещена к зоне',
            timestamp: new Date(),
        })

        // Clear cameraTarget so it can be set again
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

    // ---- Draw route only (no camera movement) ----

    _drawRouteToZone(zoneId)
    {
        const zone = zones.find(z => z.id === zoneId)
        if(!zone) return

        const tx = zone.position[0]
        const tz = zone.position[2]
        const carPos = this.game.player.position.clone()

        // Draw navmesh route from car to zone
        this._drawNavMeshRoute(
            [carPos.x, carPos.y, carPos.z],
            [tx, 0, tz]
        )

        this.store.set('isNavigating', true)
        this.store.addNotification({
            id: `nav-${Date.now()}`,
            type: 'navigation',
            title: zone.name,
            message: 'Маршрут построен',
            timestamp: new Date(),
        })

        // Clear routeTarget so it can be set again
        setTimeout(() => this.store.routeTarget = null, 100)
    }

    _resetCamera()
    {
        const view = this.game.view

        // Re-enable tracking
        view.focusPoint.isTracking = true
        view.focusPoint.magnet.active = true

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

        // Build piecewise-linear path from waypoints
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

        // Main route line (gold)
        const lineGeo = new THREE.BufferGeometry().setFromPoints(filtered)
        const lineMat = new THREE.LineBasicMaterial({
            color: 0xd4af37,
            transparent: true,
            opacity: 0.9,
        })
        this.routeLine = new THREE.Line(lineGeo, lineMat)
        this.routeLine.name = 'route-line'
        this.routeGroup.add(this.routeLine)

        // Animated chevron arrows along the path
        this._addRouteArrows(filtered)

        // Destination marker (pulsing ring)
        const dest = filtered[filtered.length - 1]
        this._addDestinationMarker(dest)
    }

    _addRouteArrows(points)
    {
        let totalLen = 0
        const segments = []
        for(let i = 0; i < points.length - 1; i++)
        {
            const segLen = points[i].distanceTo(points[i + 1])
            segments.push({ start: points[i], end: points[i + 1], len: segLen, cumLen: totalLen })
            totalLen += segLen
        }

        const spacing = 2.5
        const count = Math.max(3, Math.floor(totalLen / spacing))

        const arrowGeo = new THREE.ConeGeometry(0.3, 0.7, 4)
        const arrowMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
        })

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
            const dir = seg.end.clone().sub(seg.start).normalize()

            const arrow = new THREE.Mesh(arrowGeo, arrowMat.clone())
            arrow.position.copy(pos)
            arrow.position.y += 0.1

            const up = new THREE.Vector3(0, 1, 0)
            arrow.quaternion.setFromUnitVectors(up, dir)

            arrow.name = 'route-arrow'
            this.routeGroup.add(arrow)
        }

        // Animate arrows: pulse opacity
        let elapsed = 0
        const arrowChildren = this.routeGroup.children.filter(c => c.name === 'route-arrow')

        const animateArrows = () =>
        {
            if(!this.routeLine) return
            elapsed += 0.016
            for(let i = 0; i < arrowChildren.length; i++)
            {
                const arrow = arrowChildren[i]
                const phase = (elapsed * 2 + i * 0.3) % (Math.PI * 2)
                arrow.material.opacity = 0.4 + Math.sin(phase) * 0.4
            }
            this._arrowAnimFrame = requestAnimationFrame(animateArrows)
        }
        this._arrowAnimFrame = requestAnimationFrame(animateArrows)
    }

    _addDestinationMarker(position)
    {
        const ringGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 32)
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xd4af37,
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

        const points = curve.getPoints(40)
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({
            color: 0xd4af37,
            transparent: true,
            opacity: 0.8,
        })

        this.routeLine = new THREE.Line(geometry, material)
        this.routeLine.name = 'route-line'
        this.routeGroup.add(this.routeLine)

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
    }

    destroy()
    {
        this._clearRoute()
        this.game.scene.remove(this.routeGroup)

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
