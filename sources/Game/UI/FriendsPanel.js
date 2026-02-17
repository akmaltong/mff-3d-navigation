import { BasePanel } from './BasePanel.js'
import { UIStore } from './UIStore.js'
import { friends } from './data/mockData.js'

const ICON_FRIENDS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:rgba(212,175,55,0.8)">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
</svg>`

export class FriendsPanel extends BasePanel
{
    constructor(parentElement)
    {
        super(parentElement, { className: 'mff-friends-panel', panelId: 'friends' })

        this.store = UIStore.getInstance()

        const header = this.createHeader('Друзья', ICON_FRIENDS)
        this.element.appendChild(header)

        this.body = this.createBody()
        this.element.appendChild(this.body)
    }

    _render()
    {
        this.body.innerHTML = ''

        const online = friends.filter(f => f.isOnline)
        const offline = friends.filter(f => !f.isOnline)

        if(online.length > 0)
        {
            this._renderSection('Онлайн', online, true)
        }
        if(offline.length > 0)
        {
            this._renderSection('Офлайн', offline, false)
        }

        if(friends.length === 0)
        {
            this.body.innerHTML = `<div style="text-align:center;padding:32px 0;color:rgba(255,255,255,0.3)">
                <div style="font-size:28px;margin-bottom:8px;opacity:0.3">👥</div>
                <div style="font-size:12px">Список друзей пуст</div>
            </div>`
        }
    }

    _renderSection(title, list, isOnline)
    {
        const section = document.createElement('div')
        section.innerHTML = `<div class="mff-section-title">${title} (${list.length})</div>`

        for(const friend of list)
        {
            const card = document.createElement('div')
            card.className = 'mff-card'
            card.style.borderLeftColor = isOnline ? '#22c55e' : 'rgba(255,255,255,0.2)'

            const initials = friend.name.split(' ').map(n => n[0]).join('').toUpperCase()

            card.innerHTML = `<div style="display:flex;align-items:center;gap:10px">
                <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:rgba(255,255,255,0.6);flex-shrink:0;position:relative">
                    ${initials}
                    <span class="mff-status-dot ${isOnline ? 'is-online' : 'is-offline'}" style="position:absolute;bottom:-1px;right:-1px;border:2px solid rgba(40,40,40,0.8)"></span>
                </div>
                <div style="flex:1;min-width:0">
                    <div class="mff-card-title">${friend.name}</div>
                    <div class="mff-card-subtitle">${isOnline ? 'В сети' : 'Не в сети'}</div>
                </div>
                <button class="mff-btn mff-btn-secondary" style="font-size:10px;padding:6px 10px" data-friend-id="${friend.id}">Найти</button>
            </div>`

            const findBtn = card.querySelector('[data-friend-id]')
            findBtn.addEventListener('click', (e) =>
            {
                e.stopPropagation()
                if(friend.location)
                {
                    this.store.set('cameraTargetPosition', friend.location.position)
                    this.store.set('activePanel', null)
                    this.store.addNotification({
                        id: `nav-${friend.id}-${Date.now()}`,
                        type: 'friend',
                        title: friend.name,
                        message: 'Камера перемещена к другу',
                        timestamp: new Date(),
                    })
                }
            })

            section.appendChild(card)
        }

        this.body.appendChild(section)
    }

    onShow()
    {
        this._render()
    }
}
