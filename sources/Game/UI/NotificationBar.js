import { UIStore } from './UIStore.js'

/**
 * Toast notification system (port of NotificationBar.tsx from MFF-NavApp)
 * Renders notifications from UIStore and auto-dismisses after 5 seconds.
 */
export class NotificationBar
{
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()
        this.dismissTimers = new Map()

        // Create container
        this.element = document.createElement('div')
        this.element.classList.add('mff-notification-bar')
        parentElement.appendChild(this.element)

        // Inject styles
        this._injectStyles()

        // Subscribe to notification changes
        this.store.events.on('change:notifications', (notifications) =>
        {
            this.render(notifications)
        })

        // Initial render
        this.render(this.store.notifications)
    }

    /**
     * Render the notification list
     * @param {import('./data/types.js').Notification[]} notifications
     */
    render(notifications)
    {
        // Clear existing content
        this.element.innerHTML = ''

        // Clear timers for notifications that no longer exist
        const activeIds = new Set(notifications.map(n => n.id))
        for(const [id, timer] of this.dismissTimers)
        {
            if(!activeIds.has(id))
            {
                clearTimeout(timer)
                this.dismissTimers.delete(id)
            }
        }

        // Render each notification
        for(const notification of notifications)
        {
            const item = this._createNotificationItem(notification)
            this.element.appendChild(item)

            // Set up auto-dismiss if not already scheduled
            if(!this.dismissTimers.has(notification.id))
            {
                const timer = setTimeout(() =>
                {
                    this.store.removeNotification(notification.id)
                    this.dismissTimers.delete(notification.id)
                }, 5000)
                this.dismissTimers.set(notification.id, timer)
            }
        }
    }

    /**
     * Create a single notification DOM element
     * @param {import('./data/types.js').Notification} notification
     * @returns {HTMLElement}
     */
    _createNotificationItem(notification)
    {
        const item = document.createElement('div')
        item.classList.add('mff-notification-item')
        item.setAttribute('data-type', notification.type)

        // Icon
        const icon = document.createElement('span')
        icon.classList.add('mff-notification-icon')
        icon.textContent = this._getIcon(notification.type)

        // Content wrapper
        const content = document.createElement('div')
        content.classList.add('mff-notification-content')

        const title = document.createElement('div')
        title.classList.add('mff-notification-title')
        title.textContent = notification.title

        const message = document.createElement('div')
        message.classList.add('mff-notification-message')
        message.textContent = notification.message

        content.appendChild(title)
        content.appendChild(message)

        // Close button
        const closeBtn = document.createElement('button')
        closeBtn.classList.add('mff-notification-close')
        closeBtn.innerHTML = '&times;'
        closeBtn.addEventListener('click', () =>
        {
            // Clear the auto-dismiss timer
            if(this.dismissTimers.has(notification.id))
            {
                clearTimeout(this.dismissTimers.get(notification.id))
                this.dismissTimers.delete(notification.id)
            }
            this.store.removeNotification(notification.id)
        })

        item.appendChild(icon)
        item.appendChild(content)
        item.appendChild(closeBtn)

        return item
    }

    /**
     * Get emoji icon for notification type
     * @param {'event'|'navigation'|'friend'|'general'} type
     * @returns {string}
     */
    _getIcon(type)
    {
        const icons = {
            event: '\u{1F4C5}',
            navigation: '\u{1F9ED}',
            friend: '\u{1F464}',
            general: '\u{2139}\uFE0F',
        }
        return icons[type] || icons.general
    }

    /**
     * Inject scoped CSS styles
     */
    _injectStyles()
    {
        if(document.querySelector('[data-style="mff-notification-bar"]'))
            return

        const style = document.createElement('style')
        style.setAttribute('data-style', 'mff-notification-bar')
        style.textContent = /* css */`
            .mff-notification-bar {
                position: fixed;
                top: 16px;
                left: 16px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
                max-width: 360px;
            }

            .mff-notification-item {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 12px 14px;
                border-radius: 10px;
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #fff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                pointer-events: auto;
                animation: mff-notification-slide-in 0.3s ease-out;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            .mff-notification-item[data-type="event"] {
                background: rgba(59, 130, 246, 0.3);
            }

            .mff-notification-item[data-type="navigation"] {
                background: rgba(34, 197, 94, 0.3);
            }

            .mff-notification-item[data-type="friend"] {
                background: rgba(249, 115, 22, 0.3);
            }

            .mff-notification-item[data-type="general"] {
                background: rgba(40, 40, 40, 0.6);
            }

            .mff-notification-icon {
                font-size: 18px;
                line-height: 1;
                flex-shrink: 0;
                margin-top: 1px;
            }

            .mff-notification-content {
                flex: 1;
                min-width: 0;
            }

            .mff-notification-title {
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .mff-notification-message {
                font-size: 12px;
                opacity: 0.8;
                line-height: 1.3;
            }

            .mff-notification-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                padding: 0;
                flex-shrink: 0;
                transition: color 0.15s;
            }

            .mff-notification-close:hover {
                color: #fff;
            }

            @keyframes mff-notification-slide-in {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `
        document.head.appendChild(style)
    }

    /**
     * Clean up timers and DOM
     */
    destroy()
    {
        for(const timer of this.dismissTimers.values())
        {
            clearTimeout(timer)
        }
        this.dismissTimers.clear()

        if(this.element.parentElement)
            this.element.parentElement.removeChild(this.element)
    }
}
