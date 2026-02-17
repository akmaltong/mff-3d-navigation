import { UIStore } from './UIStore.js'
import { zones } from './data/mockData.js'

/**
 * SVG-based mini-map showing zone positions.
 * Visibility controlled by UIStore.showMiniMap.
 */
export class MiniMap
{
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()

        this.element = document.createElement('div')
        this.element.className = 'mff-minimap'
        parentElement.appendChild(this.element)

        this._render()

        this._updateVisibility()
        this.store.events.on('change:showMiniMap', () => this._updateVisibility())
        this.store.events.on('change:selectedZone', () => this._render())
    }

    _updateVisibility()
    {
        this.element.style.display = this.store.showMiniMap ? 'block' : 'none'
    }

    _render()
    {
        // Calculate bounds
        const positions = zones.map(z => z.position)
        const xs = positions.map(p => p[0])
        const zs = positions.map(p => p[2])
        const minX = Math.min(...xs) - 10
        const maxX = Math.max(...xs) + 10
        const minZ = Math.min(...zs) - 10
        const maxZ = Math.max(...zs) + 10

        const width = 200
        const height = 140
        const scaleX = width / (maxX - minX)
        const scaleZ = height / (maxZ - minZ)

        const selectedId = this.store.selectedZone?.id

        let circles = ''
        let labels = ''

        for(const zone of zones)
        {
            const x = (zone.position[0] - minX) * scaleX
            const y = (zone.position[2] - minZ) * scaleZ
            const isSelected = zone.id === selectedId
            const r = isSelected ? 6 : 4
            const opacity = isSelected ? 1 : 0.7

            circles += `<circle cx="${x}" cy="${y}" r="${r}" fill="${zone.color}" opacity="${opacity}" stroke="${isSelected ? 'white' : 'none'}" stroke-width="${isSelected ? 1.5 : 0}" data-zone-id="${zone.id}" style="cursor:pointer"/>`

            if(isSelected)
            {
                labels += `<text x="${x}" y="${y - 10}" text-anchor="middle" fill="white" font-size="8" font-weight="600" style="pointer-events:none">${zone.name}</text>`
            }
        }

        this.element.innerHTML = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${width}" height="${height}" rx="8" fill="rgba(0,0,0,0.4)"/>
                ${circles}
                ${labels}
            </svg>`

        // Click handlers
        this.element.querySelectorAll('circle[data-zone-id]').forEach(circle =>
        {
            circle.addEventListener('click', () =>
            {
                const zoneId = circle.dataset.zoneId
                const zone = zones.find(z => z.id === zoneId)
                if(zone)
                {
                    this.store.set('selectedZone', zone)
                    this.store.set('cameraTarget', zone.id)
                }
            })
        })
    }

    destroy()
    {
        if(this.element.parentNode)
            this.element.parentNode.removeChild(this.element)
    }
}
