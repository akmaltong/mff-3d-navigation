import { UIStore } from './UIStore.js'
import { BottomNav } from './BottomNav.js'
import { NotificationBar } from './NotificationBar.js'
import { EventsPanel } from './EventsPanel.js'
import { ZonesPanel } from './ZonesPanel.js'
import { FriendsPanel } from './FriendsPanel.js'
import { MenuPanel } from './MenuPanel.js'
import { SettingsPanel } from './SettingsPanel.js'
import { LightingPanel } from './LightingPanel.js'
import { ZoneDetailOverlay } from './ZoneDetailOverlay.js'
import { FPSCounter } from './FPSCounter.js'
import { MiniMap } from './MiniMap.js'
import { NavigationSystem } from './NavigationSystem.js'
import { zones, events, friends } from './data/mockData.js'

/**
 * Main UI orchestrator — creates the overlay container and instantiates all UI components.
 * Ported from UIOverlay.tsx (React) to vanilla JS.
 */
export class UIOverlay
{
    constructor()
    {
        this.store = new UIStore()

        // Initialize store with mock data
        this.store.zones = zones
        this.store.eventsData = events
        this.store.friends = friends

        // Create main overlay container
        this.element = document.createElement('div')
        this.element.className = 'mff-overlay'
        this.element.id = 'mff-ui-overlay'
        document.body.appendChild(this.element)

        // Header info
        this._createHeader()

        // Backdrop (click to close panels)
        this._createBackdrop()

        // Instantiate all components
        this.notificationBar = new NotificationBar(this.element)
        this.fpsCounter = new FPSCounter(this.element)
        this.miniMap = new MiniMap(this.element)
        this.eventsPanel = new EventsPanel(this.element)
        this.zonesPanel = new ZonesPanel(this.element)
        this.friendsPanel = new FriendsPanel(this.element)
        this.menuPanel = new MenuPanel(this.element)
        this.settingsPanel = new SettingsPanel(this.element)
        this.lightingPanel = new LightingPanel(this.element)
        this.zoneDetailOverlay = new ZoneDetailOverlay(this.element)
        this.bottomNav = new BottomNav(this.element)

        // 3D scene bridge — handles camera fly-to, route lines, zone markers
        this.navigationSystem = new NavigationSystem()

        // Listen for panel changes to show/hide backdrop
        this.store.events.on('change:activePanel', (value) =>
        {
            this._updateBackdrop()
        })
        this.store.events.on('change:activeBottomPanel', (value) =>
        {
            this._updateBackdrop()
        })

        // Welcome notification
        setTimeout(() =>
        {
            this.store.addNotification({
                id: `welcome-${Date.now()}`,
                type: 'general',
                title: 'MFF | 3D Навигация',
                message: 'Добро пожаловать на Московский Финансовый Форум',
                timestamp: new Date(),
            })
        }, 1500)
    }

    _createHeader()
    {
        this.header = document.createElement('div')
        this.header.className = 'mff-header-info'
        this.header.innerHTML = `
            <div class="mff-header-title">MFF | 3D Navigation</div>
            <div class="mff-header-subtitle">Московский Финансовый Форум 2026</div>
        `
        this.element.appendChild(this.header)
    }

    _createBackdrop()
    {
        this.backdrop = document.createElement('div')
        this.backdrop.className = 'mff-backdrop'
        this.backdrop.addEventListener('click', () =>
        {
            this.store.set('activePanel', null)
            this.store.set('activeBottomPanel', null)
            this.store.set('selectedZone', null)
        })
        this.element.appendChild(this.backdrop)
    }

    _updateBackdrop()
    {
        const hasPanel = this.store.activePanel !== null || this.store.activeBottomPanel !== null
        this.backdrop.classList.toggle('is-visible', hasPanel)
    }

    destroy()
    {
        this.bottomNav.destroy()
        this.notificationBar.destroy()
        this.eventsPanel.destroy()
        this.zonesPanel.destroy()
        this.friendsPanel.destroy()
        this.menuPanel.destroy()
        this.settingsPanel.destroy()
        this.lightingPanel.destroy()
        this.zoneDetailOverlay.destroy()
        this.fpsCounter.destroy()
        this.miniMap.destroy()
        this.navigationSystem.destroy()

        if(this.element.parentNode)
            this.element.parentNode.removeChild(this.element)
    }
}
