import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { NavMesh, Polygon, Vector3 as YukaVector3 } from 'yuka'
import { Game } from './Game.js'

/**
 * NavMesh-based pathfinding system.
 * Loads a navmesh GLB, builds a Yuka NavMesh, and provides findPath().
 * The visual mesh can be moved/rotated independently — pathfinding accounts for the transform.
 */
export class NavMeshSystem
{
    constructor()
    {
        this.game = Game.getInstance()
        this.navMesh = null
        this.ready = false
        this.debugMesh = null

        /** Visible transparent mesh in the scene */
        this.visualMesh = null
        /** Group that holds the visual mesh (for transform controls) */
        this.visualGroup = new THREE.Group()
        this.visualGroup.name = 'navmesh-visual'
        this.game.scene.add(this.visualGroup)
    }

    /**
     * Load navmesh from GLB file and build Yuka NavMesh + visible mesh
     */
    async load(url = 'Navmesh.glb')
    {
        return new Promise((resolve, reject) =>
        {
            const loader = new GLTFLoader()
            loader.load(url, (gltf) =>
            {
                let foundMesh = null
                gltf.scene.traverse((child) =>
                {
                    if(!foundMesh && child.isMesh) foundMesh = child
                })

                if(!foundMesh)
                {
                    console.error('NavMesh: No mesh found in GLB')
                    reject('No mesh found')
                    return
                }

                const geometry = foundMesh.geometry
                console.log('NavMesh GLB loaded — vertices:', geometry.attributes.position?.count, 'indexed:', !!geometry.index)

                try
                {
                    const polygons = this._parseGeometry(geometry)
                    this.navMesh = new NavMesh()
                    this.navMesh.fromPolygons(polygons)
                    this._applyPenalties()
                    this.ready = true

                    // Create visible transparent mesh
                    this._createVisualMesh(geometry)

                    console.log('Yuka NavMesh built — regions:', this.navMesh.regions.length, 'graph nodes:', this.navMesh.graph.getNodeCount())
                    resolve()
                }
                catch(err)
                {
                    console.error('Failed to build NavMesh:', err)
                    reject(err)
                }
            }, undefined, (err) =>
            {
                console.error('Error loading NavMesh GLB:', err)
                reject(err)
            })
        })
    }

    /**
     * Create a visible transparent mesh for the navmesh
     */
    _createVisualMesh(geometry)
    {
        // Solid semi-transparent fill
        const fillMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
        })
        const fillMesh = new THREE.Mesh(geometry.clone(), fillMat)
        fillMesh.name = 'navmesh-fill'

        // Wireframe overlay
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            wireframe: true,
            transparent: true,
            opacity: 0.3,
        })
        const wireMesh = new THREE.Mesh(geometry.clone(), wireMat)
        wireMesh.name = 'navmesh-wire'

        this.visualGroup.add(fillMesh)
        this.visualGroup.add(wireMesh)
        this.visualMesh = this.visualGroup

        // Hidden by default
        this.visualGroup.visible = false

        // Load saved transform
        this._loadTransform()
    }

    /**
     * Parse BufferGeometry into Yuka Polygon array
     */
    _parseGeometry(geometry)
    {
        const posAttr = geometry.attributes.position
        const indexAttr = geometry.index

        const vertices = []
        for(let i = 0; i < posAttr.count; i++)
        {
            const v = new YukaVector3()
            v.x = posAttr.getX(i)
            v.y = posAttr.getY(i)
            v.z = posAttr.getZ(i)
            vertices.push(v)
        }

        const polygons = []

        if(indexAttr)
        {
            for(let i = 0; i < indexAttr.count; i += 3)
            {
                const a = indexAttr.getX(i)
                const b = indexAttr.getX(i + 1)
                const c = indexAttr.getX(i + 2)
                const contour = [vertices[a], vertices[b], vertices[c]]
                polygons.push(new Polygon().fromContour(contour))
            }
        }
        else
        {
            for(let i = 0; i < vertices.length; i += 3)
            {
                const contour = [vertices[i], vertices[i + 1], vertices[i + 2]]
                polygons.push(new Polygon().fromContour(contour))
            }
        }

        return polygons
    }

    /**
     * Apply penalties to conference hall regions
     */
    _applyPenalties()
    {
        const halls = [
            { minX: -52, maxX: -33, minZ: 6, maxZ: 24 },
            { minX: -49, maxX: -29, minZ: -21, maxZ: -3 },
            { minX: -16, maxX: 4, minZ: 6, maxZ: 24 },
            { minX: -16, maxX: 4, minZ: -21, maxZ: -3 },
        ]

        const penaltyMultiplier = 5.0
        const hallRegions = new Set()

        for(let i = 0; i < this.navMesh.regions.length; i++)
        {
            const centroid = this.navMesh.regions[i].centroid
            for(const hall of halls)
            {
                if(centroid.x >= hall.minX && centroid.x <= hall.maxX &&
                   centroid.z >= hall.minZ && centroid.z <= hall.maxZ)
                {
                    hallRegions.add(i)
                    break
                }
            }
        }

        let penalized = 0
        const graph = this.navMesh.graph
        for(let nodeIdx = 0; nodeIdx < graph.getNodeCount(); nodeIdx++)
        {
            const edges = []
            graph.getEdgesOfNode(nodeIdx, edges)
            for(const edge of edges)
            {
                if(hallRegions.has(edge.from) || hallRegions.has(edge.to))
                {
                    edge.cost *= penaltyMultiplier
                    penalized++
                }
            }
        }

        console.log(`NavMesh penalties: ${hallRegions.size} hall regions, ${penalized} edges penalized (×${penaltyMultiplier})`)
    }

    /**
     * Find path between two world-space positions.
     * Accounts for the visual mesh transform by converting to/from navmesh local space.
     */
    findPath(startPos, endPos)
    {
        if(!this.ready || !this.navMesh)
        {
            console.warn('NavMesh not ready')
            return []
        }

        try
        {
            // Transform world-space positions into navmesh local space
            const invMatrix = new THREE.Matrix4()
            this.visualGroup.updateMatrixWorld(true)
            invMatrix.copy(this.visualGroup.matrixWorld).invert()

            const localStart = startPos.clone().applyMatrix4(invMatrix)
            const localEnd = endPos.clone().applyMatrix4(invMatrix)

            const from = new YukaVector3(localStart.x, localStart.y, localStart.z)
            const to = new YukaVector3(localEnd.x, localEnd.y, localEnd.z)

            const path = this.navMesh.findPath(from, to)

            if(!path || path.length === 0)
            {
                console.warn('NavMesh: no path found')
                return [endPos.clone()]
            }

            // Transform path points back to world space
            const worldMatrix = this.visualGroup.matrixWorld
            return path.map(p =>
            {
                const v = new THREE.Vector3(p.x, p.y, p.z)
                v.applyMatrix4(worldMatrix)
                return v
            })
        }
        catch(error)
        {
            console.error('NavMesh pathfinding error:', error)
            return [endPos.clone()]
        }
    }

    /**
     * Calculate a full route with distance and time
     */
    calculateRoute(from, to)
    {
        const startVec = new THREE.Vector3(from[0], from[1], from[2])
        const endVec = new THREE.Vector3(to[0], to[1], to[2])

        if(this.ready)
        {
            const pathPoints = this.findPath(startVec, endVec)

            if(pathPoints.length > 0)
            {
                const waypoints = [from, ...pathPoints.map(p => [p.x, p.y, p.z])]
                const valid = waypoints.filter(p => !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2]))

                let totalDistance = 0
                for(let i = 0; i < valid.length - 1; i++)
                {
                    const dx = valid[i + 1][0] - valid[i][0]
                    const dy = valid[i + 1][1] - valid[i][1]
                    const dz = valid[i + 1][2] - valid[i][2]
                    totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz)
                }

                return {
                    from, to,
                    waypoints: valid,
                    distance: Math.round(totalDistance),
                    estimatedTime: Math.ceil(totalDistance / 84),
                }
            }
        }

        // Fallback: direct line
        const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        return {
            from, to,
            waypoints: [from, to],
            distance: Math.round(dist),
            estimatedTime: Math.ceil(dist / 84),
        }
    }

    // ---- Transform persistence ----

    saveTransform()
    {
        const p = this.visualGroup.position
        const r = this.visualGroup.rotation
        const s = this.visualGroup.scale
        const data = {
            position: { x: p.x, y: p.y, z: p.z },
            rotation: { x: r.x, y: r.y, z: r.z },
            scale: { x: s.x, y: s.y, z: s.z },
        }
        localStorage.setItem('custom-folio-navmesh-transform', JSON.stringify(data))
        console.log('NavMesh transform saved:', data)
    }

    _loadTransform()
    {
        // Default transform that aligns navmesh with the building
        const defaults = {
            position: { x: -14, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
        }

        try
        {
            const raw = localStorage.getItem('custom-folio-navmesh-transform')
            const data = raw ? JSON.parse(raw) : defaults

            const p = data.position || defaults.position
            const r = data.rotation || defaults.rotation
            const s = data.scale || defaults.scale

            this.visualGroup.position.set(p.x, p.y, p.z)
            this.visualGroup.rotation.set(r.x, r.y, r.z)
            this.visualGroup.scale.set(s.x, s.y, s.z)

            console.log('NavMesh transform loaded:', raw ? 'from localStorage' : 'defaults')
        }
        catch(e)
        {
            this.visualGroup.position.set(defaults.position.x, defaults.position.y, defaults.position.z)
            this.visualGroup.scale.set(defaults.scale.x, defaults.scale.y, defaults.scale.z)
            console.warn('Failed to load navmesh transform, using defaults:', e)
        }
    }

    /**
     * Show/hide debug wireframe of the navmesh
     */
    toggleDebug(visible)
    {
        this.visualGroup.visible = visible
    }
}
