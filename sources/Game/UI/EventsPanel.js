import { BasePanel } from './BasePanel.js'
import { UIStore } from './UIStore.js'
import { zones, events } from './data/mockData.js'

const ICON_CALENDAR = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:rgba(212,175,55,0.8)">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
</svg>`

export class EventsPanel extends BasePanel
{
    constructor(parentElement)
    {
        super(parentElement, { className: 'mff-events-panel', panelId: 'events' })

        this.store = UIStore.getInstance()
        this.activeFilter = 'all'
        this.selectedEventId = null

        // Header
        const header = this.createHeader('Расписание', ICON_CALENDAR)
        this.element.appendChild(header)

        // Filter tabs
        this.filterContainer = document.createElement('div')
        this.filterContainer.className = 'mff-filter-tabs'
        this.element.appendChild(this.filterContainer)

        const filters = [
            { id: 'all', label: 'Все' },
            { id: 'favorites', label: 'Избранное' },
            { id: 'now', label: 'Сейчас' },
        ]
        for(const f of filters)
        {
            const btn = document.createElement('button')
            btn.className = 'mff-filter-tab'
            btn.textContent = f.label
            btn.dataset.filterId = f.id
            if(f.id === 'all') btn.classList.add('is-active')
            btn.addEventListener('click', () => this._setFilter(f.id))
            this.filterContainer.appendChild(btn)
        }

        // Body
        this.body = this.createBody()
        this.element.appendChild(this.body)

        // Listen for favorite changes
        this.store.events.on('change:favoriteEvents', () => this._render())
    }

    _setFilter(id)
    {
        this.activeFilter = id
        for(const btn of this.filterContainer.children)
            btn.classList.toggle('is-active', btn.dataset.filterId === id)
        this._render()
    }

    _getEventsWithStatus()
    {
        const now = new Date()
        let list = events.map(e =>
        {
            const msToStart = e.startTime.getTime() - now.getTime()
            const msToEnd = e.endTime.getTime() - now.getTime()
            const minutesToStart = msToStart / 60000
            let status = 'upcoming'
            if(msToEnd < 0) status = 'completed'
            else if(msToStart <= 0) status = 'ongoing'
            return { ...e, status, minutesToStart }
        })

        if(this.activeFilter === 'favorites')
            list = list.filter(e => this.store.favoriteEvents.includes(e.id))
        else if(this.activeFilter === 'now')
            list = list.filter(e => e.status === 'ongoing' || (e.status === 'upcoming' && e.minutesToStart <= 30))

        return list.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    }

    _formatTime(date)
    {
        return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    }

    _render()
    {
        this.body.innerHTML = ''
        const list = this._getEventsWithStatus()

        if(list.length === 0)
        {
            this.body.innerHTML = `
                <div style="text-align:center;padding:32px 0;color:rgba(255,255,255,0.3)">
                    <div style="font-size:28px;margin-bottom:8px;opacity:0.3">📅</div>
                    <div style="font-size:12px">${
                        this.activeFilter === 'favorites' ? 'В избранном пока пусто'
                        : this.activeFilter === 'now' ? 'Нет текущих событий'
                        : 'Список пуст'
                    }</div>
                </div>`
            return
        }

        for(const event of list)
        {
            const zone = zones.find(z => z.id === event.zoneId)
            const isFav = this.store.favoriteEvents.includes(event.id)
            const isSelected = this.selectedEventId === event.id
            const borderColor = event.status === 'ongoing' ? 'rgba(34,197,94,0.6)'
                : event.status === 'completed' ? 'rgba(100,100,100,0.4)'
                : 'rgba(212,175,55,0.4)'

            const card = document.createElement('div')
            card.className = `mff-card${isSelected ? ' is-expanded' : ''}`
            card.style.borderLeftColor = borderColor
            if(event.status === 'completed') card.style.opacity = '0.5'

            // Main row
            let html = `<div style="display:flex;justify-content:space-between;align-items:center">
                <div style="flex:1;min-width:0">
                    <div class="mff-card-title">${event.title}</div>
                    <div class="mff-card-meta">
                        <span>${this._formatTime(event.startTime)} - ${this._formatTime(event.endTime)}</span>`
            if(zone)
                html += `<span style="width:6px;height:6px;border-radius:50%;background:${zone.color};flex-shrink:0"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${zone.name}</span>`
            html += `</div></div>
                <button class="mff-favorite-btn" data-event-id="${event.id}">${isFav ? '★' : '☆'}</button>
            </div>`

            // Tags
            if(event.tags && event.tags.length)
            {
                html += `<div class="mff-card-tags">${event.tags.map(t => `<span class="mff-tag">${t}</span>`).join('')}</div>`
            }

            // Expanded detail
            html += `<div class="mff-card-detail">
                <p style="font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:8px;line-height:1.4">${event.description}</p>`
            if(event.speakers && event.speakers.length)
                html += `<div style="font-size:10px;margin-bottom:8px"><span style="color:rgba(255,255,255,0.4)">Спикеры: </span><span style="color:rgba(255,255,255,0.7)">${event.speakers.join(', ')}</span></div>`
            html += `<button class="mff-btn mff-btn-secondary mff-btn-block" data-navigate-event="${event.id}" style="font-size:10px">Проложить маршрут</button>
            </div>`

            card.innerHTML = html

            // Click to expand/collapse
            card.addEventListener('click', (e) =>
            {
                if(e.target.closest('.mff-favorite-btn') || e.target.closest('[data-navigate-event]')) return
                this.selectedEventId = this.selectedEventId === event.id ? null : event.id
                this._render()
            })

            // Favorite toggle
            const favBtn = card.querySelector('.mff-favorite-btn')
            favBtn.addEventListener('click', (e) =>
            {
                e.stopPropagation()
                this.store.toggleFavoriteEvent(event.id)
            })

            // Navigate button
            const navBtn = card.querySelector('[data-navigate-event]')
            if(navBtn)
            {
                navBtn.addEventListener('click', (e) =>
                {
                    e.stopPropagation()
                    this._navigateToEvent(event)
                })
            }

            this.body.appendChild(card)
        }
    }

    _navigateToEvent(event)
    {
        const zone = zones.find(z => z.id === event.zoneId)
        if(zone)
        {
            // Only draw route, NO camera movement
            this.store.set('routeTarget', zone.id)
        }
    }

    onShow()
    {
        this._render()
    }
}
