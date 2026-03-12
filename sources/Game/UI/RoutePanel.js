import { UIStore } from './UIStore.js'
import { Game } from '../Game.js'
import { zones } from './data/mockData.js'

/**
 * Route panel — click-based A/B point selection.
 * Open panel → click POI in scene for point A → click another for point B → route builds.
 */
export class RoutePanel
{
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()
        this.pointA = null  // zone object
        this.pointB = null  // zone object
        this.pickingState = null  // null | 'a' | 'b'

        this.element = document.createElement('div')
        this.element.className = 'mff-route-panel'
        parentElement.appendChild(this.element)

        this._render()
        this._updateVisibility()

        this.store.events.on('change:activePanel', () =>
        {
            this._updateVisibility()
            // Start picking A when panel opens, and show POI markers
            if(this.store.activePanel === 'route')
            {
                this.pickingState = 'a'
                this.store.set('showPOI', true)
                this._render()
            }
            else
            {
                this.pickingState = null
            }
        })

        // Listen for POI clicks while in route mode
        this.store.events.on('routePick', (zone) =>
        {
            if(this.store.activePanel !== 'route') return
            this._onZonePicked(zone)
        })
    }

    _updateVisibility()
    {
        const visible = this.store.activePanel === 'route'
        this.element.classList.toggle('is-visible', visible)
    }

    _onZonePicked(zone)
    {
        if(this.pickingState === 'a')
        {
            this.pointA = zone
            this.pickingState = 'b'
            this._render()
        }
        else if(this.pickingState === 'b')
        {
            if(zone.id === this.pointA?.id) return // same point
            this.pointB = zone
            this.pickingState = null
            this._render()
            this._buildRoute()
        }
    }

    _render()
    {
        const aName = this.pointA?.name || '—'
        const bName = this.pointB?.name || '—'

        let hint = ''
        if(this.pickingState === 'a') hint = 'Кликните на зону в сцене — точка А'
        else if(this.pickingState === 'b') hint = 'Кликните на зону в сцене — точка Б'

        this.element.innerHTML = `
            <div class="mff-panel-header">
                <div class="mff-panel-header-left">
                    <span style="font-size:18px">🧭</span>
                    <h2 style="margin:0;font-size:16px;color:white">Маршрут</h2>
                </div>
                <button class="mff-panel-close" aria-label="Закрыть">&times;</button>
            </div>
            <div style="padding:16px">
                ${hint ? `<div style="font-size:12px;color:var(--gold-primary);margin-bottom:12px;text-align:center;padding:8px;background:rgba(212,175,55,0.1);border-radius:10px;border:1px solid rgba(212,175,55,0.2)">${hint}</div>` : ''}

                <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(34,197,94,0.2);border:2px solid rgba(34,197,94,0.6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#22c55e;flex-shrink:0">А</div>
                    <div style="flex:1;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid ${this.pickingState === 'a' ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'};color:${this.pointA ? 'white' : 'rgba(255,255,255,0.3)'};font-size:13px">${aName}</div>
                    ${this.pointA ? `<button class="mff-route-pick-btn" data-pick="a" aria-label="Изменить А" style="font-size:10px">✎</button>` : ''}
                </div>

                <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(239,68,68,0.2);border:2px solid rgba(239,68,68,0.6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#ef4444;flex-shrink:0">Б</div>
                    <div style="flex:1;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid ${this.pickingState === 'b' ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'};color:${this.pointB ? 'white' : 'rgba(255,255,255,0.3)'};font-size:13px">${bName}</div>
                    ${this.pointB ? `<button class="mff-route-pick-btn" data-pick="b" aria-label="Изменить Б" style="font-size:10px">✎</button>` : ''}
                </div>

                ${this.store.isNavigating ? `
                <button class="mff-btn mff-btn-danger mff-btn-block" data-action="clear-route">
                    Очистить маршрут
                </button>` : ''}
            </div>
        `

        // Close
        this.element.querySelector('.mff-panel-close').addEventListener('click', () =>
        {
            this.store.set('activePanel', null)
        })

        // Re-pick buttons
        this.element.querySelectorAll('[data-pick]').forEach(btn =>
        {
            btn.addEventListener('click', () =>
            {
                this.pickingState = btn.dataset.pick
                if(btn.dataset.pick === 'a') this.pointA = null
                else this.pointB = null
                this._render()
            })
        })

        // Clear route
        this.element.querySelector('[data-action="clear-route"]')?.addEventListener('click', () =>
        {
            this.pointA = null
            this.pointB = null
            this.pickingState = 'a'
            this.store.set('isNavigating', false)
            this.store.set('currentRoute', null)
            const game = Game.getInstance()
            game?.uiOverlay?.navigationSystem?._clearRoute()
            this._render()
        })
    }

    _buildRoute()
    {
        if(!this.pointA || !this.pointB) return

        const game = Game.getInstance()
        if(!game?.uiOverlay?.navigationSystem) return

        const nav = game.uiOverlay.navigationSystem
        nav._drawNavMeshRoute(this.pointA.position, this.pointB.position)

        this.store.set('isNavigating', true)
        this.store.set('currentRoute', { from: this.pointA.position, to: this.pointB.position, startZone: this.pointA, endZone: this.pointB })
    }

    destroy()
    {
        if(this.element.parentNode)
            this.element.parentNode.removeChild(this.element)
    }
}
