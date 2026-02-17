import { UIStore } from './UIStore.js'

/**
 * Bottom navigation bar with 6 icon buttons.
 * Ported from BottomNav.tsx in MFF-NavApp (React) to vanilla JS.
 *
 * Buttons: HOME | ZONES | SCHEDULE | POI | LIGHTING | SETTINGS
 *
 * Each button has an SVG icon, a label that expands on hover,
 * and an active state driven by UIStore.
 */

// ---- SVG Icons (20x20 viewBox, stroke-based) ----

const ICON_HOME = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 10L10 3l7 7"/>
    <path d="M5 8.5V16a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V8.5"/>
</svg>`

const ICON_ZONES = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="6" height="6" rx="1"/>
    <rect x="11" y="3" width="6" height="6" rx="1"/>
    <rect x="3" y="11" width="6" height="6" rx="1"/>
    <rect x="11" y="11" width="6" height="6" rx="1"/>
</svg>`

const ICON_SCHEDULE = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="14" height="13" rx="1.5"/>
    <line x1="3" y1="8" x2="17" y2="8"/>
    <line x1="7" y1="2" x2="7" y2="5"/>
    <line x1="13" y1="2" x2="13" y2="5"/>
    <line x1="7" y1="11" x2="7" y2="11.01"/>
    <line x1="10" y1="11" x2="10" y2="11.01"/>
    <line x1="13" y1="11" x2="13" y2="11.01"/>
    <line x1="7" y1="14" x2="7" y2="14.01"/>
    <line x1="10" y1="14" x2="10" y2="14.01"/>
</svg>`

const ICON_POI = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2C7.24 2 5 4.24 5 7c0 4.5 5 11 5 11s5-6.5 5-11c0-2.76-2.24-5-5-5z"/>
    <circle cx="10" cy="7" r="2"/>
</svg>`

const ICON_LIGHTING = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="10" r="3.5"/>
    <line x1="10" y1="2" x2="10" y2="4"/>
    <line x1="10" y1="16" x2="10" y2="18"/>
    <line x1="2" y1="10" x2="4" y2="10"/>
    <line x1="16" y1="10" x2="18" y2="10"/>
    <line x1="4.34" y1="4.34" x2="5.76" y2="5.76"/>
    <line x1="14.24" y1="14.24" x2="15.66" y2="15.66"/>
    <line x1="4.34" y1="15.66" x2="5.76" y2="14.24"/>
    <line x1="14.24" y1="5.76" x2="15.66" y2="4.34"/>
</svg>`

const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="10" r="2.5"/>
    <path d="M16.2 12.8a1.2 1.2 0 00.24 1.32l.04.04a1.44 1.44 0 11-2.04 2.04l-.04-.04a1.2 1.2 0 00-1.32-.24 1.2 1.2 0 00-.72 1.1v.12a1.44 1.44 0 11-2.88 0v-.06a1.2 1.2 0 00-.78-1.1 1.2 1.2 0 00-1.32.24l-.04.04a1.44 1.44 0 11-2.04-2.04l.04-.04a1.2 1.2 0 00.24-1.32 1.2 1.2 0 00-1.1-.72h-.12a1.44 1.44 0 110-2.88h.06a1.2 1.2 0 001.1-.78 1.2 1.2 0 00-.24-1.32l-.04-.04a1.44 1.44 0 112.04-2.04l.04.04a1.2 1.2 0 001.32.24h.06a1.2 1.2 0 00.72-1.1v-.12a1.44 1.44 0 112.88 0v.06a1.2 1.2 0 00.72 1.1 1.2 1.2 0 001.32-.24l.04-.04a1.44 1.44 0 112.04 2.04l-.04.04a1.2 1.2 0 00-.24 1.32v.06a1.2 1.2 0 001.1.72h.12a1.44 1.44 0 110 2.88h-.06a1.2 1.2 0 00-1.1.72z"/>
</svg>`

const ICON_GAME = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="6" width="16" height="10" rx="2"/>
    <circle cx="7" cy="11" r="1.5"/>
    <circle cx="13" cy="11" r="1.5"/>
    <line x1="9" y1="6" x2="9" y2="3"/>
    <line x1="11" y1="6" x2="11" y2="3"/>
</svg>`

// ---- Button definitions ----

const NAV_BUTTONS = [
    { id: 'home',      label: 'Главная',       icon: ICON_HOME },
    { id: 'zones',     label: 'Зоны',          icon: ICON_ZONES },
    { id: 'schedule',  label: 'Мероприятия',    icon: ICON_SCHEDULE },
    { id: 'poi',       label: 'POI',           icon: ICON_POI },
    { id: 'lighting',  label: 'Свет',          icon: ICON_LIGHTING },
    { id: 'settings',  label: 'Настройки',     icon: ICON_SETTINGS },
]

export class BottomNav
{
    /**
     * @param {HTMLElement} parentElement - DOM element to append the nav bar to
     */
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()

        /** @type {Map<string, HTMLButtonElement>} */
        this.buttons = new Map()

        // Build container
        this.element = document.createElement('nav')
        this.element.className = 'mff-bottom-nav-container'

        for(const def of NAV_BUTTONS)
        {
            const btn = this._createButton(def)
            this.buttons.set(def.id, btn)
            this.element.appendChild(btn)
        }

        parentElement.appendChild(this.element)

        // Subscribe to store changes for active-state updates
        this._onActivePanelChange = (value) => { this._updateActiveStates() }
        this._onActiveBottomPanelChange = (value) => { this._updateActiveStates() }
        this._onShowPOIChange = (value) => { this._updateActiveStates() }

        this.store.events.on('change:activePanel', this._onActivePanelChange)
        this.store.events.on('change:activeBottomPanel', this._onActiveBottomPanelChange)
        this.store.events.on('change:showPOI', this._onShowPOIChange)

        // Set initial active states
        this._updateActiveStates()
    }

    /**
     * Create a single nav button element.
     * @param {{ id: string, label: string, icon: string }} def
     * @returns {HTMLButtonElement}
     */
    _createButton(def)
    {
        const btn = document.createElement('button')
        btn.className = 'mff-bottom-nav-btn'
        btn.dataset.navId = def.id
        btn.setAttribute('aria-label', def.label)

        btn.innerHTML = `
            ${def.icon}
            <span class="mff-nav-label">${def.label}</span>
        `

        btn.addEventListener('click', () => this._handleClick(def.id))

        return btn
    }

    /**
     * Handle a button click based on its id.
     * Mirrors the exact toggle logic from the React BottomNav.tsx.
     * @param {string} id
     */
    _handleClick(id)
    {
        switch(id)
        {
            case 'home':
                this.store.set('activePanel', null)
                this.store.set('activeBottomPanel', null)
                this.store.set('selectedZone', null)
                this.store.set('viewMode', 'angle')
                this.store.set('resetCameraToOverview', true)
                break

            case 'zones':
                this.store.set('activeBottomPanel', null)
                this.store.set(
                    'activePanel',
                    this.store.activePanel === 'zones' ? null : 'zones'
                )
                break

            case 'schedule':
                this.store.set('activeBottomPanel', null)
                this.store.set(
                    'activePanel',
                    this.store.activePanel === 'events' ? null : 'events'
                )
                break

            case 'poi':
                this.store.toggle('showPOI')
                break

            case 'lighting':
                this.store.set('activePanel', null)
                this.store.set(
                    'activeBottomPanel',
                    this.store.activeBottomPanel === 'lighting' ? null : 'lighting'
                )
                break

            case 'settings':
                this.store.set('activePanel', null)
                this.store.set(
                    'activeBottomPanel',
                    this.store.activeBottomPanel === 'settings' ? null : 'settings'
                )
                break
        }
    }

    /**
     * Sync the is-active CSS class on every button based on current store state.
     */
    _updateActiveStates()
    {
        const activePanel = this.store.activePanel
        const activeBottomPanel = this.store.activeBottomPanel
        const showPOI = this.store.showPOI

        for(const [id, btn] of this.buttons)
        {
            let active = false

            switch(id)
            {
                case 'home':
                    active = false
                    break
                case 'zones':
                    active = activePanel === 'zones'
                    break
                case 'schedule':
                    active = activePanel === 'events'
                    break
                case 'poi':
                    active = showPOI === true
                    break
                case 'lighting':
                    active = activeBottomPanel === 'lighting'
                    break
                case 'settings':
                    active = activeBottomPanel === 'settings'
                    break
            }

            btn.classList.toggle('is-active', active)
        }
    }

    /**
     * Remove the nav bar from the DOM and unsubscribe from store events.
     */
    destroy()
    {
        this.store.events.off('change:activePanel', this._onActivePanelChange)
        this.store.events.off('change:activeBottomPanel', this._onActiveBottomPanelChange)
        this.store.events.off('change:showPOI', this._onShowPOIChange)

        if(this.element.parentNode)
        {
            this.element.parentNode.removeChild(this.element)
        }
    }
}
