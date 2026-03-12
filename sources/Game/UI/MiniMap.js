import { UIStore } from './UIStore.js'
import { zones } from './data/mockData.js'

/**
 * 2D Mini-map with background image and draggable zone calibration.
 * Drag zone dots to correct positions, then click "Save" to export offsets.
 */

const MAP_CONFIG = {
    imgWidth: 2013,
    imgHeight: 8057,
    displayWidth: 120,
    displayHeight: 480,
    worldMinX: -82,
    worldMaxX: 18,
    worldMinZ: -10,
    worldMaxZ: 10,
}

const ICON_MAP = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
</svg>`

// Per-zone pixel offsets (display coords), calibrated manually.
let zoneOffsets = {
    'zone-1': { dx: -3, dy: 18 },
    'zone-2': { dx: 3, dy: -17 },
    'zone-3': { dx: -5, dy: 7 },
    'zone-4': { dx: 4, dy: -4 },
    'zone-5': { dx: -6, dy: -4 },
    'zone-6': { dx: -3, dy: 12 },
    'zone-7': { dx: -1, dy: -3 },
    'zone-8': { dx: -17, dy: 2 },
    'zone-9': { dx: 12, dy: 4 },
    'zone-10': { dx: -15, dy: 11 },
    'zone-11': { dx: 9, dy: 9 },
    'zone-12': { dx: 9, dy: 7 },
    'zone-13': { dx: -18, dy: 7 },
    'zone-14': { dx: -9, dy: -4 },
    'zone-15': { dx: 3, dy: 0 },
    'zone-16': { dx: 3, dy: 0 },
    'zone-17': { dx: -4, dy: 5 },
    'zone-18': { dx: -1, dy: -7 },
    'zone-19': { dx: -3, dy: 4 },
}

// Override with localStorage if user recalibrated
try {
    const saved = localStorage.getItem('mff-minimap-offsets')
    if(saved) zoneOffsets = JSON.parse(saved)
} catch(e) {}

export class MiniMap
{
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()
        this.routePoints = null
        this.isOpen = false
        this.calibrationMode = false
        this._dragState = null

        this.wrapper = document.createElement('div')
        this.wrapper.className = 'mff-minimap-wrapper'
        parentElement.appendChild(this.wrapper)

        this.toggleBtn = document.createElement('button')
        this.toggleBtn.className = 'mff-minimap-toggle'
        this.toggleBtn.innerHTML = ICON_MAP
        this.toggleBtn.setAttribute('aria-label', 'Карта')
        this.toggleBtn.addEventListener('click', () => this._toggle())
        this.wrapper.appendChild(this.toggleBtn)

        this.element = document.createElement('div')
        this.element.className = 'mff-minimap'
        this.wrapper.appendChild(this.element)

        this._render()
        this._updateVisibility()

        this.store.events.on('change:selectedZone', () => { if(this.isOpen) this._render() })
        this.store.events.on('change:isNavigating', () => { if(this.isOpen) this._render() })
        this.store.events.on('routePointsChanged', (points) =>
        {
            this.routePoints = points
            if(this.isOpen) this._render()
        })
    }

    _toggle()
    {
        this.isOpen = !this.isOpen
        this.toggleBtn.classList.toggle('is-active', this.isOpen)
        this._updateVisibility()
        if(this.isOpen) this._render()
    }

    _updateVisibility()
    {
        this.element.style.display = this.isOpen ? 'block' : 'none'
    }

    // Base mapping (before offsets)
    _worldToMapBase(worldX, worldZ)
    {
        const c = MAP_CONFIG
        const rangeX = c.worldMaxX - c.worldMinX
        const rangeZ = c.worldMaxZ - c.worldMinZ
        const imgY = c.imgHeight - (worldX - c.worldMinX) / rangeX * c.imgHeight
        const imgX = (worldZ - c.worldMinZ) / rangeZ * c.imgWidth
        return {
            x: Math.round(imgX * c.displayWidth / c.imgWidth),
            y: Math.round(imgY * c.displayHeight / c.imgHeight),
        }
    }

    // With per-zone offset applied
    _worldToMap(worldX, worldZ, zoneId)
    {
        const base = this._worldToMapBase(worldX, worldZ)
        const off = zoneId && zoneOffsets[zoneId]
        if(off)
        {
            base.x += off.dx
            base.y += off.dy
        }
        return base
    }

    _render()
    {
        const c = MAP_CONFIG
        const w = c.displayWidth
        const h = c.displayHeight
        const selectedId = this.store.selectedZone?.id

        let routeSvg = ''
        let circles = ''
        let labels = ''

        // Route chevrons
        if(this.routePoints && this.routePoints.length >= 2)
        {
            const pts = this.routePoints.map(p => this._worldToMapBase(p[0], p[1]))
            const pathStr = pts.map(p => `${p.x},${p.y}`).join(' ')
            routeSvg += `<polyline points="${pathStr}" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>`

            let totalLen = 0
            for(let i = 0; i < pts.length - 1; i++)
            {
                const dx = pts[i + 1].x - pts[i].x
                const dy = pts[i + 1].y - pts[i].y
                totalLen += Math.sqrt(dx * dx + dy * dy)
            }
            const chevronSpacing = 14
            const chevronCount = Math.max(2, Math.floor(totalLen / chevronSpacing))
            for(let ci = 0; ci < chevronCount; ci++)
            {
                const t = (ci + 0.5) / chevronCount
                const targetDist = t * totalLen
                let cumLen = 0
                for(let i = 0; i < pts.length - 1; i++)
                {
                    const dx = pts[i + 1].x - pts[i].x
                    const dy = pts[i + 1].y - pts[i].y
                    const segLen = Math.sqrt(dx * dx + dy * dy)
                    if(cumLen + segLen >= targetDist)
                    {
                        const lt = segLen > 0 ? (targetDist - cumLen) / segLen : 0
                        const cx = pts[i].x + dx * lt
                        const cy = pts[i].y + dy * lt
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI)
                        const s = 3
                        routeSvg += `<g transform="translate(${cx},${cy}) rotate(${angle})"><polyline points="${-s*0.5},${-s*0.4} ${s*0.3},0 ${-s*0.5},${s*0.4}" fill="none" stroke="#22c55e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/><polyline points="${s*0.0},${-s*0.4} ${s*0.8},0 ${s*0.0},${s*0.4}" fill="none" stroke="#22c55e" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></g>`
                        break
                    }
                    cumLen += segLen
                }
            }
            routeSvg += `<circle cx="${pts[0].x}" cy="${pts[0].y}" r="3" fill="#22c55e" opacity="0.8" stroke="white" stroke-width="0.5"/>`
            const end = pts[pts.length - 1]
            routeSvg += `<circle cx="${end.x}" cy="${end.y}" r="4" fill="none" stroke="#22c55e" stroke-width="1.2" opacity="0.8"><animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/></circle>`
            routeSvg += `<circle cx="${end.x}" cy="${end.y}" r="2" fill="#22c55e" opacity="0.9"/>`
        }

        // Zone dots (draggable in calibration mode)
        for(const zone of zones)
        {
            const p = this._worldToMap(zone.position[0], zone.position[2], zone.id)
            const isSelected = zone.id === selectedId
            const r = this.calibrationMode ? 5 : (isSelected ? 4 : 2.5)

            circles += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${zone.color}" opacity="0.9" stroke="white" stroke-width="${this.calibrationMode ? 1 : (isSelected ? 1 : 0)}" data-zone-id="${zone.id}" style="cursor:${this.calibrationMode ? 'grab' : 'pointer'}"/>`

            // Always show short name in calibration mode
            const shortName = zone.name.length > 10 ? zone.name.slice(0, 10) : zone.name
            labels += `<text x="${p.x + 6}" y="${p.y + 2}" fill="white" font-size="${this.calibrationMode ? 5 : 4}" style="pointer-events:none;paint-order:stroke;stroke:rgba(0,0,0,0.8);stroke-width:2px">${shortName}</text>`
        }

        let controlsHtml = ''
        if(this.calibrationMode)
        {
            controlsHtml = `<div style="display:flex;gap:4px;padding:4px">
                <button class="mff-minimap-save-btn" style="flex:1;padding:3px 6px;border:none;border-radius:6px;background:rgba(34,197,94,0.3);color:#22c55e;font-size:9px;cursor:pointer">💾 Сохранить</button>
                <button class="mff-minimap-reset-btn" style="flex:1;padding:3px 6px;border:none;border-radius:6px;background:rgba(239,68,68,0.2);color:#ef4444;font-size:9px;cursor:pointer">↺ Сброс</button>
            </div>`
        }

        this.element.innerHTML = `
            ${controlsHtml}
            <div class="mff-minimap-canvas" style="position:relative;width:${w}px;height:${h}px;overflow:hidden">
                <img src="MiniMap.png" style="position:absolute;top:0;left:0;width:${w}px;height:${h}px;object-fit:fill;opacity:0.85" alt="" draggable="false"/>
                <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0">
                    ${routeSvg}
                    ${circles}
                    ${labels}
                </svg>
            </div>`

        // Save button
        this.element.querySelector('.mff-minimap-save-btn')?.addEventListener('click', () => this._saveOffsets())
        // Reset button
        this.element.querySelector('.mff-minimap-reset-btn')?.addEventListener('click', () => this._resetOffsets())

        // Drag handling for calibration
        if(this.calibrationMode)
            this._bindDrag()
        else
            this._bindClicks()
    }

    _bindClicks()
    {
        this.element.querySelectorAll('circle[data-zone-id]').forEach(circle =>
        {
            circle.addEventListener('click', () =>
            {
                const zone = zones.find(z => z.id === circle.dataset.zoneId)
                if(zone)
                {
                    this.store.set('selectedZone', zone)
                    this.store.set('cameraTarget', zone.id)
                }
            })
        })
    }

    _bindDrag()
    {
        const svg = this.element.querySelector('svg')
        if(!svg) return

        const allCircles = this.element.querySelectorAll('circle[data-zone-id]')

        allCircles.forEach(circle =>
        {
            circle.addEventListener('pointerdown', (e) =>
            {
                e.preventDefault()
                e.stopPropagation()
                const zoneId = circle.dataset.zoneId
                const rect = svg.getBoundingClientRect()
                const startX = e.clientX
                const startY = e.clientY
                const origCx = parseFloat(circle.getAttribute('cx'))
                const origCy = parseFloat(circle.getAttribute('cy'))

                // Find associated label
                const texts = svg.querySelectorAll('text')
                let label = null
                for(const t of texts)
                {
                    if(Math.abs(parseFloat(t.getAttribute('x')) - origCx - 6) < 2 &&
                       Math.abs(parseFloat(t.getAttribute('y')) - origCy - 2) < 2)
                    {
                        label = t
                        break
                    }
                }

                circle.style.cursor = 'grabbing'

                const onMove = (ev) =>
                {
                    const dx = ev.clientX - startX
                    const dy = ev.clientY - startY
                    const newCx = origCx + dx
                    const newCy = origCy + dy
                    circle.setAttribute('cx', newCx)
                    circle.setAttribute('cy', newCy)
                    if(label)
                    {
                        label.setAttribute('x', newCx + 6)
                        label.setAttribute('y', newCy + 2)
                    }
                }

                const onUp = (ev) =>
                {
                    window.removeEventListener('pointermove', onMove)
                    window.removeEventListener('pointerup', onUp)
                    circle.style.cursor = 'grab'

                    const finalCx = parseFloat(circle.getAttribute('cx'))
                    const finalCy = parseFloat(circle.getAttribute('cy'))

                    // Calculate offset from base position
                    const zone = zones.find(z => z.id === zoneId)
                    if(zone)
                    {
                        const base = this._worldToMapBase(zone.position[0], zone.position[2])
                        zoneOffsets[zoneId] = {
                            dx: Math.round(finalCx - base.x),
                            dy: Math.round(finalCy - base.y),
                        }
                    }
                }

                window.addEventListener('pointermove', onMove)
                window.addEventListener('pointerup', onUp)
            })
        })
    }

    _saveOffsets()
    {
        // Save to localStorage
        localStorage.setItem('mff-minimap-offsets', JSON.stringify(zoneOffsets))

        // Log to console for hardcoding later
        console.log('=== MiniMap Zone Offsets ===')
        console.log(JSON.stringify(zoneOffsets, null, 2))

        // Also log the final display coordinates for each zone
        console.log('=== Final Display Coordinates ===')
        for(const zone of zones)
        {
            const p = this._worldToMap(zone.position[0], zone.position[2], zone.id)
            console.log(`${zone.id} (${zone.name}): display(${p.x}, ${p.y})`)
        }

        alert('Offsets сохранены в localStorage и выведены в консоль')
    }

    _resetOffsets()
    {
        zoneOffsets = {}
        localStorage.removeItem('mff-minimap-offsets')
        this._render()
    }

    destroy()
    {
        if(this.wrapper.parentNode)
            this.wrapper.parentNode.removeChild(this.wrapper)
    }
}
