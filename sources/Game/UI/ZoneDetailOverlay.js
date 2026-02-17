import { UIStore } from './UIStore.js'
import { events } from './data/mockData.js'

const ZONE_ICONS = {
    conference: '🎤', exhibition: '🏢', food: '🍽️',
    registration: '📝', lounge: '☕', other: '📍',
}

/**
 * Zone detail card that appears when a zone is selected.
 * Shows zone info, navigation button, and zone events grouped by status.
 */
export class ZoneDetailOverlay
{
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()
        this.visible = false

        this.element = document.createElement('div')
        this.element.className = 'mff-zone-detail'
        parentElement.appendChild(this.element)

        this.store.events.on('change:selectedZone', (zone) =>
        {
            if(zone)
                this._show(zone)
            else
                this._hide()
        })
    }

    _show(zone)
    {
        this.visible = true
        this.element.classList.add('is-visible')
        this._render(zone)
    }

    _hide()
    {
        this.visible = false
        this.element.classList.remove('is-visible')
    }

    _formatTime(date)
    {
        return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    }

    _render(zone)
    {
        const icon = ZONE_ICONS[zone.type] || ZONE_ICONS.other
        const zoneEvents = events.filter(e => e.zoneId === zone.id)
        const now = new Date()

        const current = zoneEvents.filter(e => now >= e.startTime && now <= e.endTime)
        const upcoming = zoneEvents.filter(e => e.startTime > now)
        const past = zoneEvents.filter(e => e.endTime < now)

        let html = `
        <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:10px">
                <div style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;background:${zone.color}20;border:1px solid ${zone.color}40">${icon}</div>
                <div>
                    <div style="font-size:15px;font-weight:600;color:white">${zone.name}</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.4)">${zone.description}</div>
                </div>
            </div>
            <button class="mff-panel-close" aria-label="Close" style="flex-shrink:0">&times;</button>
        </div>

        <button class="mff-btn mff-btn-secondary mff-btn-block" data-action="navigate" style="margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:6px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Перейти к зоне
        </button>`

        // Current events
        if(current.length > 0)
        {
            html += `<div style="margin-bottom:12px">
                <div style="font-size:10px;color:#22c55e;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:flex;align-items:center;gap:6px">
                    <span style="width:6px;height:6px;border-radius:50%;background:#22c55e;animation:mff-pulse 2s infinite"></span>Сейчас идет
                </div>`
            for(const e of current)
                html += `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:8px 10px;margin-bottom:4px;border:1px solid rgba(34,197,94,0.1)">
                    <div style="font-size:12px;font-weight:600;color:white">${e.title}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.4)">до ${this._formatTime(e.endTime)}</div>
                </div>`
            html += `</div>`
        }

        // Upcoming
        if(upcoming.length > 0)
        {
            html += `<div style="margin-bottom:12px">
                <div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Скоро</div>`
            for(const e of upcoming)
                html += `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:8px 10px;margin-bottom:4px;border:1px solid rgba(255,255,255,0.04)">
                    <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.85)">${e.title}</div>
                    <div style="font-size:10px;color:rgba(59,130,246,0.7);font-weight:500">${this._formatTime(e.startTime)}</div>
                </div>`
            html += `</div>`
        }

        // Past
        if(past.length > 0)
        {
            html += `<div>
                <div style="font-size:10px;color:rgba(255,255,255,0.3);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Прошедшие</div>`
            for(const e of past)
                html += `<div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:8px 10px;margin-bottom:4px;opacity:0.5">
                    <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);text-decoration:line-through">${e.title}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.3)">завершено</div>
                </div>`
            html += `</div>`
        }

        if(zoneEvents.length === 0)
        {
            html += `<div style="text-align:center;padding:20px 0;color:rgba(255,255,255,0.3)">
                <div style="font-size:24px;margin-bottom:6px;opacity:0.3">📅</div>
                <div style="font-size:11px">Событий не запланировано</div>
            </div>`
        }

        this.element.innerHTML = html

        // Close button
        this.element.querySelector('.mff-panel-close').addEventListener('click', () =>
        {
            this.store.set('selectedZone', null)
        })

        // Navigate button
        const navBtn = this.element.querySelector('[data-action="navigate"]')
        if(navBtn)
        {
            navBtn.addEventListener('click', () =>
            {
                this.store.set('cameraTarget', zone.id)
                this.store.set('selectedZone', null)
                this.store.set('activePanel', null)
            })
        }
    }

    destroy()
    {
        if(this.element.parentNode)
            this.element.parentNode.removeChild(this.element)
    }
}
