import { BasePanel } from './BasePanel.js'
import { UIStore } from './UIStore.js'

const ICON_SETTINGS = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`

export class MenuPanel extends BasePanel
{
    constructor(parentElement)
    {
        super(parentElement, { className: 'mff-menu-panel', panelId: 'menu' })

        this.store = UIStore.getInstance()

        const header = this.createHeader('Настройки', ICON_SETTINGS)
        this.element.appendChild(header)

        // View mode selector
        this._createViewModeSection()

        this.body = this.createBody()
        this.element.appendChild(this.body)

        this._createMenuItems()
        this._createFooter()
    }

    _createViewModeSection()
    {
        const section = document.createElement('div')
        section.style.cssText = 'padding:12px 16px;border-bottom:1px solid rgba(212,175,55,0.15)'
        section.innerHTML = `<div style="font-size:11px;color:#D4AF37;margin-bottom:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Режим просмотра</div>`

        const btnContainer = document.createElement('div')
        btnContainer.className = 'mff-view-toggle'
        btnContainer.style.padding = '0'

        const modes = [
            { id: 'top', label: 'Сверху' },
            { id: 'angle', label: 'Под углом' },
        ]

        for(const mode of modes)
        {
            const btn = document.createElement('button')
            btn.className = 'mff-view-btn'
            btn.textContent = mode.label
            btn.dataset.viewMode = mode.id
            if(this.store.viewMode === mode.id) btn.classList.add('is-active')

            btn.addEventListener('click', () =>
            {
                this.store.set('viewMode', mode.id)
                btnContainer.querySelectorAll('.mff-view-btn').forEach(b =>
                    b.classList.toggle('is-active', b.dataset.viewMode === mode.id))
            })

            btnContainer.appendChild(btn)
        }

        section.appendChild(btnContainer)
        this.element.appendChild(section)

        this.store.events.on('change:viewMode', (value) =>
        {
            btnContainer.querySelectorAll('.mff-view-btn').forEach(b =>
                b.classList.toggle('is-active', b.dataset.viewMode === value))
        })
    }

    _createMenuItems()
    {
        const items = [
            {
                icon: '🏠', title: 'Главная', desc: 'Вернуться к обзору',
                action: () => { this.store.set('viewMode', 'angle'); this.store.set('activePanel', null) }
            },
            {
                icon: '🗺️', title: this.store.showMiniMap ? 'Скрыть мини-карту' : 'Показать мини-карту',
                desc: 'Переключить отображение',
                action: () => { this.store.toggle('showMiniMap'); this.store.set('activePanel', null) }
            },
            {
                icon: 'ℹ️', title: 'О форуме', desc: 'Информация о мероприятии',
                action: () =>
                {
                    this.store.addNotification({
                        id: `info-${Date.now()}`,
                        type: 'general',
                        title: 'Московский Финансовый Форум',
                        message: '3D навигация по площадке форума',
                        timestamp: new Date(),
                    })
                }
            },
        ]

        for(const item of items)
        {
            const el = document.createElement('div')
            el.className = 'mff-menu-item'
            el.innerHTML = `<span style="font-size:18px">${item.icon}</span>
                <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.85)">${item.title}</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.4)">${item.desc}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:rgba(212,175,55,0.4);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>`
            el.addEventListener('click', item.action)
            this.body.appendChild(el)
        }
    }

    _createFooter()
    {
        const footer = document.createElement('div')
        footer.style.cssText = 'padding:12px 16px;text-align:center;border-top:1px solid rgba(212,175,55,0.15);flex-shrink:0'
        footer.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:500">Московский Финансовый Форум 2026</div>
            <div style="font-size:10px;color:rgba(212,175,55,0.4);margin-top:4px">v1.0.0</div>`
        this.element.appendChild(footer)
    }

    onShow() {}
}
