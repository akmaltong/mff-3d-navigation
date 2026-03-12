import { BasePanel } from './BasePanel.js'
import { UIStore } from './UIStore.js'
import { zones, events } from './data/mockData.js'

const ICON_MAP = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:rgba(212,175,55,0.8)">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
</svg>`

const ZONE_ICONS = {
    conference: '🎤',
    exhibition: '🏢',
    food: '🍽️',
    registration: '📝',
    lounge: '☕',
    other: '📍',
}

export class ZonesPanel extends BasePanel
{
    constructor(parentElement)
    {
        super(parentElement, { className: 'mff-zones-panel', panelId: 'zones' })

        this.store = UIStore.getInstance()
        this.expandedZoneId = null

        const header = this.createHeader('Зоны форума', ICON_MAP)
        this.element.appendChild(header)

        this.body = this.createBody()
        this.element.appendChild(this.body)
    }

    _getZoneEvents(zoneId)
    {
        return events.filter(e => e.zoneId === zoneId)
    }

    _render()
    {
        this.body.innerHTML = ''

        for(const zone of zones)
        {
            const zoneEvents = this._getZoneEvents(zone.id)
            const isExpanded = this.expandedZoneId === zone.id
            const icon = ZONE_ICONS[zone.type] || ZONE_ICONS.other

            const card = document.createElement('div')
            card.className = `mff-card${isExpanded ? ' is-expanded' : ''}`
            card.style.borderLeftColor = zone.color

            let html = `<div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:14px;flex-shrink:0">${icon}</span>
                <div style="min-width:0;flex:1">
                    <div class="mff-card-title">${zone.name}</div>
                    <div class="mff-card-subtitle" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${zone.description}</div>
                </div>`
            if(zoneEvents.length > 0)
                html += `<span class="mff-badge">${zoneEvents.length}</span>`
            html += `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:rgba(255,255,255,0.3);flex-shrink:0;transition:transform 0.2s;${isExpanded ? 'transform:rotate(180deg)' : ''}"><polyline points="6 9 12 15 18 9"/></svg>
            </div>`

            // Expanded: show route button + events
            if(isExpanded)
            {
                html += `<div class="mff-card-detail" style="max-height:500px;opacity:1;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1)">`

                // Route button
                html += `<button class="mff-route-btn" data-route-zone="${zone.id}" style="width:100%;padding:8px 12px;margin-bottom:8px;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);border-radius:8px;color:rgba(212,175,55,0.9);font-size:11px;font-weight:600;cursor:pointer;transition:all 0.2s">🧭 Проложить маршрут</button>`

                if(zoneEvents.length > 0)
                {
                    html += `<div style="font-size:9px;color:rgba(255,255,255,0.4);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Мероприятия</div>`
                    const shown = zoneEvents.slice(0, 3)
                    for(const ev of shown)
                    {
                        const isFav = this.store.favoriteEvents.includes(ev.id)
                        html += `<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:6px 8px;margin-bottom:4px;border:1px solid rgba(255,255,255,0.04)">
                            <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
                                <div style="flex:1;min-width:0">
                                    <div style="font-size:10px;font-weight:600;color:white;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ev.title}</div>
                                    <div style="font-size:9px;color:rgba(255,255,255,0.4)">${ev.startTime.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                                <button class="mff-favorite-btn" data-fav-event="${ev.id}" style="font-size:14px">${isFav ? '★' : '☆'}</button>
                            </div>
                        </div>`
                    }
                    if(zoneEvents.length > 3)
                        html += `<div style="font-size:9px;color:rgba(255,255,255,0.3);text-align:center">+ ещё ${zoneEvents.length - 3}</div>`
                }
                html += `</div>`
            }

            card.innerHTML = html

            // Click card header → fly camera to zone
            card.addEventListener('click', (e) =>
            {
                if(e.target.closest('.mff-favorite-btn')) return
                if(e.target.closest('.mff-route-btn')) return

                if(!isExpanded)
                {
                    this.expandedZoneId = zone.id
                    this.store.set('viewMode', 'angle')
                    this.store.set('cameraTarget', zone.id)
                    this.store.set('selectedZone', zone)
                    this.store.set('activePanel', null)
                }
                else
                {
                    this.expandedZoneId = null
                    this._render()
                }
            })

            // Route button → draw route only (no camera movement)
            const routeBtn = card.querySelector('[data-route-zone]')
            if(routeBtn)
            {
                routeBtn.addEventListener('click', (e) =>
                {
                    e.stopPropagation()
                    this.store.set('routeTarget', zone.id)
                })
            }

            // Favorite buttons
            card.querySelectorAll('[data-fav-event]').forEach(btn =>
            {
                btn.addEventListener('click', (e) =>
                {
                    e.stopPropagation()
                    this.store.toggleFavoriteEvent(btn.dataset.favEvent)
                    this._render()
                })
            })

            this.body.appendChild(card)
        }
    }

    onShow()
    {
        this._render()
    }
}
