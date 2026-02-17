import { Events } from '../Events.js'

/**
 * Central UI state management (replaces Zustand store from MFF-NavApp)
 * Uses pub/sub pattern with Events class from custom-folio
 */
export class UIStore
{
    static instance = null

    static getInstance()
    {
        return UIStore.instance
    }

    constructor()
    {
        if(UIStore.instance)
            return UIStore.instance

        UIStore.instance = this

        this.events = new Events()

        // ---- UI Panel State ----
        /** @type {import('./data/types.js').UIPanel} */
        this.activePanel = null
        /** @type {string|null} 'lighting'|'settings'|null */
        this.activeBottomPanel = null
        this.showMiniMap = true
        this.showPOI = false
        this.showFPS = false
        /** @type {import('./data/types.js').ViewMode} */
        this.viewMode = 'angle'
        this.isFullscreen = false
        this.showUIInFullscreen = false
        this.editMode = false
        this.poiEditMode = false
        this.arMode = false
        this.gameMode = true

        // ---- Data ----
        /** @type {import('./data/types.js').Zone[]} */
        this.zones = []
        /** @type {import('./data/types.js').Event[]} */
        this.eventsData = []
        /** @type {import('./data/types.js').Friend[]} */
        this.friends = []

        // ---- Selection ----
        /** @type {import('./data/types.js').Zone|null} */
        this.selectedZone = null
        /** @type {import('./data/types.js').Event|null} */
        this.selectedEvent = null
        /** @type {import('./data/types.js').Friend|null} */
        this.selectedFriend = null

        // ---- Favorites ----
        /** @type {string[]} */
        this.favoriteEvents = []

        // ---- Navigation ----
        /** @type {import('./data/types.js').Route|null} */
        this.currentRoute = null
        this.isNavigating = false
        /** @type {[number,number,number]|null} */
        this.lastRouteDestination = null

        // ---- User ----
        /** @type {import('./data/types.js').UserLocation|null} */
        this.userLocation = null

        // ---- Camera ----
        /** @type {string|null} zone id to fly to */
        this.cameraTarget = null
        /** @type {string|null} zone id to draw route to (no camera movement) */
        this.routeTarget = null
        /** @type {[number,number,number]|null} */
        this.cameraPosition = null
        /** @type {[number,number,number]|null} */
        this.cameraTargetPosition = null
        this.resetCameraToOverview = false

        // ---- Notifications ----
        /** @type {import('./data/types.js').Notification[]} */
        this.notifications = []

        // ---- Zone Mesh Mapping ----
        /** @type {Record<string, string>} */
        this.zoneMeshMapping = {
            '\u041a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446-\u0437\u0430\u043b I': '\u041a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446-\u0437\u0430\u043b_1',
            '\u041a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446-\u0437\u0430\u043b II': '\u041a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446-\u0437\u0430\u043b_2',
            '\u041a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446-\u0437\u0430\u043b III': '\u041a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446-\u0437\u0430\u043b_3',
            '\u041a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446-\u0437\u0430\u043b IV': '\u041a\u043e\u043d\u0444\u0435\u0440\u0435\u043d\u0446-\u0437\u0430\u043b_4',
            '\u041e\u0432\u0430\u043b\u044c\u043d\u044b\u0439 \u0437\u0430\u043b': '\u041e\u0432\u0430\u043b\u044c\u043d\u044b\u0439_\u0437\u0430\u043b',
            '\u0417\u0430\u043b \u043f\u043b\u0435\u043d\u0430\u0440\u043d\u043e\u0433\u043e \u0437\u0430\u0441\u0435\u0434\u0430\u043d\u0438\u044f': '\u0417\u0430\u043b_\u043f\u043b\u0435\u043d\u0430\u0440\u043d\u043e\u0433\u043e_\u0437\u0430\u0441\u0435\u0434\u0430\u043d\u0438\u044f',
            'VIP-\u0437\u0430\u043b': 'VIP-\u0437\u0430\u043b',
            '\u0410\u0440\u0442-\u043e\u0431\u044a\u0435\u043a\u0442': '\u0410\u0440\u0442-\u043e\u0431\u044a\u0435\u043a\u0442',
            '\u041f\u0440\u0435\u0441\u0441-\u043f\u043e\u0434\u0445\u043e\u0434 1': '\u041f\u0440\u0435\u0441\u0441-\u043f\u043e\u0434\u0445\u043e\u0434_1',
            '\u041f\u0440\u0435\u0441\u0441-\u043f\u043e\u0434\u0445\u043e\u0434 2': '\u041f\u0440\u0435\u0441\u0441-\u043f\u043e\u0434\u0445\u043e\u0434_2',
            '\u041b\u0430\u0443\u043d\u0436-\u0437\u043e\u043d\u0430 1': '\u041b\u0430\u0443\u043d\u0436-\u0437\u043e\u043d\u0430_1',
            '\u041b\u0430\u0443\u043d\u0436-\u0437\u043e\u043d\u0430 2': '\u041b\u0430\u0443\u043d\u0436-\u0437\u043e\u043d\u0430_2',
            '\u0410\u043a\u043a\u0440\u0435\u0434\u0438\u0442\u0430\u0446\u0438\u044f': '\u0410\u043a\u043a\u0440\u0435\u0434\u0438\u0442\u0430\u0446\u0438\u044f',
            '\u0418\u043d\u0444\u043e-\u0441\u0442\u043e\u0439\u043a\u0430': '\u0418\u043d\u0444\u043e-\u0441\u0442\u043e\u0439\u043a\u0430',
            '\u042d\u043a\u0441\u043f\u043e\u0437\u0438\u0446\u0438\u044f': '\u042d\u043a\u0441\u043f\u043e\u0437\u0438\u0446\u0438\u044f',
            '\u0424\u043e\u0439\u0435': '\u0424\u043e\u0439\u0435',
            '\u0424\u043e\u0442\u043e-\u0437\u043e\u043d\u0430': '\u0424\u043e\u0442\u043e-\u0437\u043e\u043d\u0430',
        }

        // Load persisted favorites
        this._loadPersistedState()
    }

    /**
     * Set a state property and emit change events
     * @param {string} key
     * @param {*} value
     */
    set(key, value)
    {
        const old = this[key]
        this[key] = value
        this.events.trigger('change', [key, value, old])
        this.events.trigger(`change:${key}`, [value, old])
    }

    /**
     * Toggle a boolean state property
     * @param {string} key
     */
    toggle(key)
    {
        this.set(key, !this[key])
    }

    /**
     * Add a notification
     * @param {import('./data/types.js').Notification} notification
     */
    addNotification(notification)
    {
        this.notifications = [...this.notifications, notification]
        this.events.trigger('change:notifications', [this.notifications])
    }

    /**
     * Remove a notification by id
     * @param {string} id
     */
    removeNotification(id)
    {
        this.notifications = this.notifications.filter(n => n.id !== id)
        this.events.trigger('change:notifications', [this.notifications])
    }

    /**
     * Toggle favorite event
     * @param {string} eventId
     */
    toggleFavoriteEvent(eventId)
    {
        if(this.favoriteEvents.includes(eventId))
            this.favoriteEvents = this.favoriteEvents.filter(id => id !== eventId)
        else
            this.favoriteEvents = [...this.favoriteEvents, eventId]

        this.events.trigger('change:favoriteEvents', [this.favoriteEvents])
        this._persistState()
    }

    // ---- Persistence ----

    _loadPersistedState()
    {
        try
        {
            const data = localStorage.getItem('mff-ui-state')
            if(data)
            {
                const parsed = JSON.parse(data)
                if(parsed.favoriteEvents)
                    this.favoriteEvents = parsed.favoriteEvents
                if(parsed.showMiniMap !== undefined)
                    this.showMiniMap = parsed.showMiniMap
                if(parsed.showPOI !== undefined)
                    this.showPOI = parsed.showPOI
                if(parsed.zoneMeshMapping)
                    this.zoneMeshMapping = parsed.zoneMeshMapping
            }
        }
        catch(e)
        {
            console.warn('UIStore: Failed to load persisted state', e)
        }
    }

    _persistState()
    {
        try
        {
            localStorage.setItem('mff-ui-state', JSON.stringify({
                favoriteEvents: this.favoriteEvents,
                showMiniMap: this.showMiniMap,
                showPOI: this.showPOI,
                zoneMeshMapping: this.zoneMeshMapping,
            }))
        }
        catch(e)
        {
            console.warn('UIStore: Failed to persist state', e)
        }
    }
}
