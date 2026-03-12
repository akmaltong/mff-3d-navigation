import { UIStore } from './UIStore.js'

/**
 * Base class for all side panels (EventsPanel, ZonesPanel, FriendsPanel, MenuPanel).
 * Provides common panel structure: header with icon/title/close, scrollable body,
 * and visibility toggling driven by UIStore.activePanel.
 *
 * Ported from the shared panel layout used in MFF-NavApp React components.
 */
export class BasePanel
{
    /**
     * @param {HTMLElement} parentElement - DOM element to append this panel to
     * @param {Object} [options]
     * @param {string} [options.className] - Additional CSS class(es) for the panel
     * @param {string} [options.panelId] - Panel identifier matching UIStore.activePanel values
     */
    constructor(parentElement, options = {})
    {
        this.store = UIStore.getInstance()
        this.panelId = options.panelId || null
        this.visible = false

        // Root element
        this.element = document.createElement('div')
        this.element.className = `mff-side-panel ${options.className || ''}`.trim()
        parentElement.appendChild(this.element)

        // Auto-bind to store if a panelId is provided
        if(this.panelId)
        {
            this._onActivePanelChange = (value) =>
            {
                this.setVisible(value === this.panelId)
            }
            this.store.events.on('change:activePanel', this._onActivePanelChange)
        }
    }

    /**
     * Show or hide the panel with CSS class toggle.
     * Calls onShow / onHide lifecycle hooks for subclasses.
     * @param {boolean} visible
     */
    setVisible(visible)
    {
        if(this.visible === visible) return

        this.visible = visible
        this.element.classList.toggle('is-visible', visible)

        if(visible)
            this.onShow()
        else
            this.onHide()
    }

    /**
     * Called when the panel becomes visible. Override in subclasses.
     */
    onShow() {}

    /**
     * Called when the panel is hidden. Override in subclasses.
     */
    onHide() {}

    /**
     * Creates a panel header with icon, title, and close button.
     * The close button sets UIStore.activePanel to null.
     *
     * @param {string} title - Panel heading text
     * @param {string} [iconSvg] - Inline SVG markup for the header icon
     * @returns {HTMLElement} The header element (not yet appended -- caller should append)
     */
    createHeader(title, iconSvg)
    {
        const header = document.createElement('div')
        header.className = 'mff-panel-header'
        header.innerHTML = `
            <div class="mff-panel-header-left">
                ${iconSvg || ''}
                <h2>${title}</h2>
            </div>
            <button class="mff-panel-close" aria-label="Close panel">&times;</button>
        `

        header.querySelector('.mff-panel-close').addEventListener('click', () =>
        {
            this.store.set('activePanel', null)
        })

        return header
    }

    /**
     * Creates a scrollable panel body container.
     * @returns {HTMLElement}
     */
    createBody()
    {
        const body = document.createElement('div')
        body.className = 'mff-panel-body'
        return body
    }

    /**
     * Remove the panel from the DOM and unsubscribe from store events.
     */
    destroy()
    {
        if(this._onActivePanelChange)
        {
            this.store.events.off('change:activePanel', this._onActivePanelChange)
        }

        if(this.element.parentNode)
        {
            this.element.parentNode.removeChild(this.element)
        }
    }
}
