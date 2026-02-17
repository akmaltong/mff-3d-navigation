import { UIStore } from './UIStore.js'
import { Game } from '../Game.js'
import { zones } from './data/mockData.js'

/**
 * Floating settings panel (bottom panel, triggered by 'settings' in activeBottomPanel).
 * Combines MFF UI toggles + old CustomControlsUI (gizmo, lighting, camera, POI).
 */

// Blender → Three.js axis mapping
const AXIS_MAP = {
    x: { threeAxis: 'x', sign: 1 },
    y: { threeAxis: 'z', sign: -1 },
    z: { threeAxis: 'y', sign: 1 },
}

export class SettingsPanel
{
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()
        this.visible = false
        this.activeTab = 'ui'

        this.element = document.createElement('div')
        this.element.className = 'mff-floating-panel mff-settings-wide'
        parentElement.appendChild(this.element)

        this._build()

        this._onBottomPanelChange = (value) =>
        {
            this.setVisible(value === 'settings')
        }
        this.store.events.on('change:activeBottomPanel', this._onBottomPanelChange)
    }

    setVisible(visible)
    {
        if(this.visible === visible) return
        this.visible = visible
        this.element.classList.toggle('is-visible', visible)
        if(visible) this._syncValues()
    }

    _build()
    {
        this.element.innerHTML = ''

        // Header
        const header = document.createElement('div')
        header.className = 'mff-settings-header'
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:16px">⚙️</span>
                <span style="font-size:14px;font-weight:600;color:white">Настройки</span>
            </div>
            <button class="mff-panel-close" aria-label="Close">&times;</button>`
        header.querySelector('.mff-panel-close').addEventListener('click', () =>
        {
            this.store.set('activeBottomPanel', null)
        })
        this.element.appendChild(header)

        // Tabs
        const tabs = document.createElement('div')
        tabs.className = 'mff-stabs'
        const tabDefs = [
            { id: 'ui', label: '🖥️ Интерфейс' },
            { id: 'camera', label: '📷 Камера' },
            { id: 'gizmo', label: '🔧 Gizmo' },
            { id: 'poi', label: '📍 POI' },
        ]
        for(const t of tabDefs)
        {
            const btn = document.createElement('button')
            btn.className = `mff-stab${t.id === this.activeTab ? ' is-active' : ''}`
            btn.textContent = t.label
            btn.dataset.tab = t.id
            btn.addEventListener('click', () =>
            {
                this.activeTab = t.id
                tabs.querySelectorAll('.mff-stab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === t.id))
                this._showTab(t.id)
            })
            tabs.appendChild(btn)
        }
        this.element.appendChild(tabs)

        // Tab content container
        this.content = document.createElement('div')
        this.content.className = 'mff-stab-content'
        this.element.appendChild(this.content)

        this._showTab(this.activeTab)
    }

    _showTab(id)
    {
        // Clear readout interval from camera tab if switching away
        if(this._readoutInterval)
        {
            clearInterval(this._readoutInterval)
            this._readoutInterval = null
        }

        this.content.innerHTML = ''
        switch(id)
        {
            case 'ui': this._buildUITab(); break
            case 'camera': this._buildCameraTab(); break
            case 'gizmo': this._buildGizmoTab(); break
            case 'poi': this._buildPOITab(); break
        }
    }

    // ---- UI Tab ----
    _buildUITab()
    {
        const c = this.content
        c.appendChild(this._createToggle('Показать FPS', this.store.showFPS, (v) => this.store.set('showFPS', v)))
        c.appendChild(this._createToggle('Мини-карта', this.store.showMiniMap, (v) => { this.store.set('showMiniMap', v); this.store._persistState() }))
        c.appendChild(this._createToggle('Точки интереса (POI)', this.store.showPOI, (v) => this.store.set('showPOI', v)))
    }



    // ---- Camera Tab ----
    _buildCameraTab()
        {
            const game = Game.getInstance()
            const c = this.content
            const view = game.view

            // ---- Orbit ----
            c.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:8px">ОРБИТА КАМЕРЫ</div>`

            // Focus point gizmo toggle
            const fpGizmo = game.focusPointGizmo
            if(fpGizmo)
            {
                c.appendChild(this._createToggle('Показать таргет фокуса', fpGizmo.enabled, (v) => fpGizmo.setVisible(v)))
            }

            const radius = view?.spherical?.radius?.edges?.min ?? 30
            c.appendChild(this._createNumberInput('Расстояние (Radius)', 5, 150, 1, radius, (v) =>
            {
                if(view?.spherical)
                {
                    view.spherical.radius.edges.min = v
                    view.spherical.radius.edges.max = v * 2
                    view.spherical.radius.current = v
                }
            }))

            const phi = view?.spherical?.phi ?? 0.85
            c.appendChild(this._createNumberInput('Наклон (Phi)', 0.05, 1.57, 0.01, phi, (v) =>
            {
                if(view?.spherical) view.spherical.phi = v
            }))

            const theta = view?.spherical?.theta ?? 0.785
            c.appendChild(this._createNumberInput('Вращение (Theta)', -3.14, 3.14, 0.01, theta, (v) =>
            {
                if(view?.spherical) view.spherical.theta = v
            }))

            // ---- Focus Point ----
            const fpSection = document.createElement('div')
            fpSection.style.cssText = 'margin-top:16px'
            fpSection.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:8px">ТОЧКА ФОКУСА (куда смотрит камера)</div>`

            const fp = view?.focusPoint?.position
            const fpX = fp?.x ?? 0
            const fpZ = fp?.z ?? 0

            fpSection.appendChild(this._createNumberInput('X', -200, 200, 0.5, fpX, (v) =>
            {
                if(view?.focusPoint)
                {
                    view.focusPoint.isTracking = false
                    view.focusPoint.magnet.active = false
                    view.focusPoint.position.x = v
                }
            }))
            fpSection.appendChild(this._createNumberInput('Z', -200, 200, 0.5, fpZ, (v) =>
            {
                if(view?.focusPoint)
                {
                    view.focusPoint.isTracking = false
                    view.focusPoint.magnet.active = false
                    view.focusPoint.position.z = v
                }
            }))
            c.appendChild(fpSection)

            // ---- Live readout ----
            const readout = document.createElement('div')
            readout.style.cssText = 'margin-top:16px;padding:10px;background:rgba(0,0,0,0.3);border-radius:10px;font-family:monospace;font-size:10px;color:rgba(212,175,55,0.7);line-height:1.6'
            c.appendChild(readout)

            const updateReadout = () =>
            {
                if(!view) return
                const cam = game.view.camera?.position
                const fp2 = view.focusPoint?.position
                readout.innerHTML = `Camera: ${cam?.x?.toFixed(1) ?? '?'}, ${cam?.y?.toFixed(1) ?? '?'}, ${cam?.z?.toFixed(1) ?? '?'}<br>` +
                    `Focus: ${fp2?.x?.toFixed(1) ?? '?'}, ${fp2?.y?.toFixed(1) ?? '?'}, ${fp2?.z?.toFixed(1) ?? '?'}<br>` +
                    `Phi: ${view.spherical?.phi?.toFixed(3) ?? '?'} | Theta: ${view.spherical?.theta?.toFixed(3) ?? '?'}<br>` +
                    `Radius: ${view.spherical?.radius?.current?.toFixed(1) ?? '?'}`
            }
            updateReadout()
            this._readoutInterval = setInterval(updateReadout, 300)

            // ---- Buttons ----
            const btns = document.createElement('div')
            btns.style.cssText = 'display:flex;gap:6px;margin-top:12px;flex-wrap:wrap'

            btns.appendChild(this._createBtn('🏠 Вернуть к машине', () =>
            {
                if(view?.focusPoint)
                {
                    view.focusPoint.isTracking = true
                    view.focusPoint.magnet.active = true
                }
            }))

            btns.appendChild(this._createBtn('📋 Копировать позицию', () =>
            {
                const cam = game.view.camera?.position
                const fp2 = view.focusPoint?.position
                const text = JSON.stringify({
                    camera: { x: +cam.x.toFixed(2), y: +cam.y.toFixed(2), z: +cam.z.toFixed(2) },
                    focus: { x: +fp2.x.toFixed(2), y: +fp2.y.toFixed(2), z: +fp2.z.toFixed(2) },
                    phi: +view.spherical.phi.toFixed(4),
                    theta: +view.spherical.theta.toFixed(4),
                    radius: +view.spherical.radius.current.toFixed(1),
                }, null, 2)
                navigator.clipboard.writeText(text)
                this._notify('Позиция камеры скопирована в буфер')
            }))

            btns.appendChild(this._createBtn('💾 Сохранить', () =>
            {
                if(game.settingsStorage) { game.settingsStorage.saveSettings(); this._notify('Настройки сохранены') }
            }))

            c.appendChild(btns)

            // View mode
            const modeSection = document.createElement('div')
            modeSection.style.cssText = 'margin-top:16px'
            modeSection.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:8px">РЕЖИМ ПРОСМОТРА</div>`
            const modes = [
                { id: 'top', label: 'Сверху' },
                { id: 'angle', label: 'Под углом' },
            ]
            const btnRow = document.createElement('div')
            btnRow.style.cssText = 'display:flex;gap:6px'
            for(const m of modes)
            {
                const btn = document.createElement('button')
                btn.className = `mff-btn mff-btn-secondary${this.store.viewMode === m.id ? ' is-active' : ''}`
                btn.style.cssText = 'flex:1;font-size:11px'
                btn.textContent = m.label
                btn.addEventListener('click', () =>
                {
                    this.store.set('viewMode', m.id)
                    btnRow.querySelectorAll('.mff-btn').forEach(b => b.classList.remove('is-active'))
                    btn.classList.add('is-active')
                })
                btnRow.appendChild(btn)
            }
            modeSection.appendChild(btnRow)
            c.appendChild(modeSection)
        }


    // ---- Gizmo Tab ----
    _buildGizmoTab()
        {
            const game = Game.getInstance()
            const c = this.content
            const model = game.world?.smModel

            if(!model)
            {
                c.innerHTML = `<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:12px">Модель не загружена</div>`
                return
            }

            // Toggle gizmo visibility
            const gizmoEnabled = game.world?.gizmoControls?.enabled ?? false
            const toggleBtn = this._createBtn(gizmoEnabled ? '🔧 Скрыть Gizmo' : '🔧 Показать Gizmo', () =>
            {
                if(game.world?.gizmoControls)
                {
                    game.world.gizmoControls.toggle()
                    const on = game.world.gizmoControls.enabled
                    toggleBtn.textContent = on ? '🔧 Скрыть Gizmo' : '🔧 Показать Gizmo'
                }
            })
            c.appendChild(toggleBtn)

            // ---- Position ----
            const posSection = document.createElement('div')
            posSection.style.cssText = 'margin-top:16px'
            posSection.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:8px">ПОЗИЦИЯ (мировые координаты)</div>`

            posSection.appendChild(this._createNumberInput('X', -200, 200, 0.5, model.position.x, (v) => { model.position.x = v }))
            posSection.appendChild(this._createNumberInput('Y (высота)', -10, 50, 0.1, model.position.y, (v) => { model.position.y = v }))
            posSection.appendChild(this._createNumberInput('Z', -200, 200, 0.5, model.position.z, (v) => { model.position.z = v }))
            c.appendChild(posSection)

            // ---- Rotation ----
            const rotSection = document.createElement('div')
            rotSection.style.cssText = 'margin-top:16px'
            rotSection.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:8px">ВРАЩЕНИЕ (мировые оси)</div>`

            rotSection.appendChild(this._createNumberInput('X (наклон)', -3.14, 3.14, 0.01, model.rotation.x, (v) => { model.rotation.x = v }))
            rotSection.appendChild(this._createNumberInput('Y (поворот)', -3.14, 3.14, 0.01, model.rotation.y, (v) => { model.rotation.y = v }))
            rotSection.appendChild(this._createNumberInput('Z (крен)', -3.14, 3.14, 0.01, model.rotation.z, (v) => { model.rotation.z = v }))
            c.appendChild(rotSection)

            // ---- Scale ----
            const scaleSection = document.createElement('div')
            scaleSection.style.cssText = 'margin-top:16px'
            scaleSection.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:8px">МАСШТАБ</div>`

            const uniformScale = model.scale.x
            scaleSection.appendChild(this._createNumberInput('Масштаб (равномерный)', 0.01, 5, 0.01, uniformScale, (v) => { model.scale.set(v, v, v) }))
            scaleSection.appendChild(this._createNumberInput('X', 0.01, 5, 0.01, model.scale.x, (v) => { model.scale.x = v }))
            scaleSection.appendChild(this._createNumberInput('Y', 0.01, 5, 0.01, model.scale.y, (v) => { model.scale.y = v }))
            scaleSection.appendChild(this._createNumberInput('Z', 0.01, 5, 0.01, model.scale.z, (v) => { model.scale.z = v }))
            c.appendChild(scaleSection)

            // ---- Live readout ----
            const readout = document.createElement('div')
            readout.style.cssText = 'margin-top:16px;padding:10px;background:rgba(0,0,0,0.3);border-radius:10px;font-family:monospace;font-size:10px;color:rgba(212,175,55,0.7);line-height:1.6'
            c.appendChild(readout)

            const updateReadout = () =>
            {
                if(!model) return
                const p = model.position
                const r = model.rotation
                const s = model.scale
                readout.innerHTML =
                    `Pos: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}<br>` +
                    `Rot: ${r.x.toFixed(3)}, ${r.y.toFixed(3)}, ${r.z.toFixed(3)}<br>` +
                    `Scale: ${s.x.toFixed(3)}, ${s.y.toFixed(3)}, ${s.z.toFixed(3)}`
            }
            updateReadout()
            this._readoutInterval = setInterval(updateReadout, 300)

            // ---- Buttons ----
            const btns = document.createElement('div')
            btns.style.cssText = 'display:flex;gap:6px;margin-top:12px;flex-wrap:wrap'

            btns.appendChild(this._createBtn('📋 Копировать трансформ', () =>
            {
                const p = model.position
                const r = model.rotation
                const s = model.scale
                const text = JSON.stringify({
                    position: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
                    rotation: { x: +r.x.toFixed(4), y: +r.y.toFixed(4), z: +r.z.toFixed(4) },
                    scale: { x: +s.x.toFixed(3), y: +s.y.toFixed(3), z: +s.z.toFixed(3) },
                }, null, 2)
                navigator.clipboard.writeText(text)
                this._notify('Трансформ здания скопирован в буфер')
            }))

            btns.appendChild(this._createBtn('🔄 Сбросить', () =>
            {
                model.position.set(0, 0, 0)
                model.rotation.set(0, 0, 0)
                model.scale.set(1, 1, 1)
                this._notify('Трансформ сброшен')
                this._showTab('gizmo')
            }))

            btns.appendChild(this._createBtn('💾 Сохранить', () =>
            {
                if(game.settingsStorage) { game.settingsStorage.saveSettings(); this._notify('Настройки сохранены') }
            }))

            c.appendChild(btns)

            // ---- NavMesh Section ----
            this._buildNavMeshSection(c)
        }



    _buildNavMeshSection(container)
    {
        const game = Game.getInstance()
        const navSys = game.navMeshSystem
        if(!navSys) return

        const section = document.createElement('div')
        section.style.cssText = 'margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1)'
        section.innerHTML = `<div style="font-size:11px;color:rgba(212,175,55,0.7);font-weight:600;margin-bottom:12px">🗺️ НАВИГАЦИОННАЯ СЕТКА (NavMesh)</div>`

        // Visibility toggle
        const isVisible = navSys.visualGroup.visible
        section.appendChild(this._createToggle('Показать NavMesh', isVisible, (v) =>
        {
            navSys.visualGroup.visible = v
        }))

        // Status
        const status = document.createElement('div')
        status.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:12px'
        status.textContent = navSys.ready
            ? `✅ NavMesh загружен (${navSys.navMesh?.regions?.length || 0} регионов)`
            : '⏳ NavMesh загружается...'
        section.appendChild(status)

        const grp = navSys.visualGroup

        // Position
        const posH = document.createElement('div')
        posH.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:8px'
        posH.textContent = 'ПОЗИЦИЯ'
        section.appendChild(posH)

        const autoSaveNM = () => navSys.saveTransform()

        section.appendChild(this._createNumberInput('X', -200, 200, 0.5, grp.position.x, (v) => { grp.position.x = v; autoSaveNM() }))
        section.appendChild(this._createNumberInput('Y (высота)', -10, 50, 0.1, grp.position.y, (v) => { grp.position.y = v; autoSaveNM() }))
        section.appendChild(this._createNumberInput('Z', -200, 200, 0.5, grp.position.z, (v) => { grp.position.z = v; autoSaveNM() }))

        // Rotation
        const rotH = document.createElement('div')
        rotH.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-top:12px;margin-bottom:8px'
        rotH.textContent = 'ВРАЩЕНИЕ'
        section.appendChild(rotH)

        section.appendChild(this._createNumberInput('X', -3.14, 3.14, 0.01, grp.rotation.x, (v) => { grp.rotation.x = v; autoSaveNM() }))
        section.appendChild(this._createNumberInput('Y', -3.14, 3.14, 0.01, grp.rotation.y, (v) => { grp.rotation.y = v; autoSaveNM() }))
        section.appendChild(this._createNumberInput('Z', -3.14, 3.14, 0.01, grp.rotation.z, (v) => { grp.rotation.z = v; autoSaveNM() }))

        // Scale
        const scaleH = document.createElement('div')
        scaleH.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-top:12px;margin-bottom:8px'
        scaleH.textContent = 'МАСШТАБ'
        section.appendChild(scaleH)

        section.appendChild(this._createNumberInput('Масштаб', 0.01, 5, 0.01, grp.scale.x, (v) => { grp.scale.set(v, v, v); autoSaveNM() }))

        // Buttons
        const nmBtns = document.createElement('div')
        nmBtns.style.cssText = 'display:flex;gap:6px;margin-top:12px;flex-wrap:wrap'

        nmBtns.appendChild(this._createBtn('📋 Копировать трансформ', () =>
        {
            const p = grp.position, r = grp.rotation, s = grp.scale
            const text = JSON.stringify({
                position: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
                rotation: { x: +r.x.toFixed(4), y: +r.y.toFixed(4), z: +r.z.toFixed(4) },
                scale: { x: +s.x.toFixed(3), y: +s.y.toFixed(3), z: +s.z.toFixed(3) },
            }, null, 2)
            navigator.clipboard.writeText(text)
            this._notify('Трансформ NavMesh скопирован')
        }))

        nmBtns.appendChild(this._createBtn('🔄 Сбросить', () =>
        {
            grp.position.set(0, 0, 0)
            grp.rotation.set(0, 0, 0)
            grp.scale.set(1, 1, 1)
            navSys.saveTransform()
            this._notify('NavMesh трансформ сброшен')
            this._showTab('gizmo')
        }))

        nmBtns.appendChild(this._createBtn('🔗 Как здание', () =>
        {
            const model = game.world?.smModel
            if(model)
            {
                grp.position.copy(model.position)
                grp.rotation.copy(model.rotation)
                grp.scale.copy(model.scale)
                navSys.saveTransform()
                this._notify('NavMesh выровнен по зданию')
                this._showTab('gizmo')
            }
        }))

        section.appendChild(nmBtns)
        container.appendChild(section)
    }

    _buildTransformGroup(container, title, type, min, max, step)
    {
        const game = Game.getInstance()
        const obj = game.world?.gizmoControls?.targetObject
        const section = document.createElement('div')
        section.style.cssText = 'margin-top:12px'
        section.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:6px">${title.toUpperCase()} (Blender XYZ)</div>`

        for(const axis of ['x', 'y', 'z'])
        {
            const mapping = AXIS_MAP[axis]
            let val = 0
            if(obj)
            {
                const threeVal = obj[type][mapping.threeAxis]
                val = threeVal * mapping.sign
            }
            const label = `${axis.toUpperCase()}`
            section.appendChild(this._createSlider(label, min, max, step, val, (v) =>
            {
                const target = game.world?.gizmoControls?.targetObject
                if(target) target[type][mapping.threeAxis] = v * mapping.sign
            }))
        }
        container.appendChild(section)
    }

    // ---- POI Tab ----
    _buildPOITab()
        {
            const game = Game.getInstance()
            const c = this.content

            c.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:8px">ЗОНЫ СЦЕНЫ (${zones.length})</div>`

            for(const zone of zones)
            {
                const item = document.createElement('div')
                item.style.cssText = 'padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)'
                item.dataset.zoneId = zone.id

                const row = document.createElement('div')
                row.style.cssText = 'display:flex;align-items:center;gap:8px'
                row.innerHTML = `
                    <span style="width:10px;height:10px;border-radius:50%;background:${zone.color};flex-shrink:0"></span>
                    <span style="flex:1;font-size:12px;color:rgba(255,255,255,0.8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${zone.name}</span>`

                const flyBtn = this._createSmallBtn('▶', () => this.store.set('cameraTarget', zone.id))
                flyBtn.title = 'Перелететь'

                const editBtn = this._createSmallBtn('✎', () => this._openZoneEdit(zone, item))
                editBtn.title = 'Редактировать позицию'

                row.appendChild(flyBtn)
                row.appendChild(editBtn)
                item.appendChild(row)
                c.appendChild(item)
            }

            // ---- Custom POIs ----
            if(!game.poiManager) return
            const pois = game.poiManager.getAll()

            const customHeader = document.createElement('div')
            customHeader.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-top:16px;margin-bottom:8px'
            customHeader.textContent = `ПОЛЬЗОВАТЕЛЬСКИЕ POI (${pois.length})`
            c.appendChild(customHeader)

            const addRow = document.createElement('div')
            addRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px'
            const nameInput = document.createElement('input')
            nameInput.type = 'text'
            nameInput.placeholder = 'Имя POI...'
            nameInput.className = 'mff-mapping-input'
            nameInput.style.flex = '1'
            nameInput.addEventListener('keydown', (e) => { e.stopPropagation(); if(e.key === 'Enter') addBtn.click() })
            nameInput.addEventListener('keyup', (e) => { e.stopPropagation() })
            const addBtn = this._createBtn('+ Добавить', () =>
            {
                if(!game.poiManager) return
                game.poiManager.startAddPOI(nameInput.value.trim() || undefined)
                nameInput.value = ''
                this._notify('POI добавлен — перетащите маркер')
                this._showTab('poi')
            })
            addBtn.style.flexShrink = '0'
            addRow.appendChild(nameInput)
            addRow.appendChild(addBtn)
            c.appendChild(addRow)

            if(pois.length === 0)
            {
                c.appendChild(Object.assign(document.createElement('div'), {
                    style: 'text-align:center;padding:12px 0;color:rgba(255,255,255,0.3);font-size:11px',
                    textContent: 'Нет пользовательских POI'
                }))
                return
            }

            for(const poi of pois)
            {
                const item = document.createElement('div')
                item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)'
                item.innerHTML = `
                    <span style="width:10px;height:10px;border-radius:50%;background:${poi.color};flex-shrink:0"></span>
                    <span style="flex:1;font-size:12px;color:rgba(255,255,255,0.8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${poi.name}</span>`

                const gotoBtn = this._createSmallBtn('▶', () => game.poiManager.flyTo(poi.id))
                gotoBtn.title = 'Перейти'
                const editBtn2 = this._createSmallBtn('✎', () =>
                {
                    game.poiManager.startEditExisting(poi.id)
                    this._notify('Редактирование POI — перетащите маркер')
                })
                editBtn2.title = 'Редактировать'
                const delBtn = this._createSmallBtn('✕', () =>
                {
                    game.poiManager.removePOI(poi.id)
                    this._notify('POI удалён')
                    this._showTab('poi')
                })
                delBtn.title = 'Удалить'
                delBtn.style.color = '#ef4444'

                item.appendChild(gotoBtn)
                item.appendChild(editBtn2)
                item.appendChild(delBtn)
                c.appendChild(item)
            }
        }


    // ---- Zone edit panel (opened from list or 3D click) ----

    _openZoneEdit(zone, item)
    {
        const game = Game.getInstance()
        const c = this.content

        // If already open — close
        const existing = item.querySelector('.mff-zone-edit-panel')
        if(existing)
        {
            if(game.poiManager?.editing?.isZone && game.poiManager.editing.zone === zone)
                game.poiManager.stopEditZone()
            existing.remove()
            return
        }

        // Close any other open zone edit
        if(game.poiManager?.editing?.isZone) game.poiManager.stopEditZone()
        c.querySelectorAll('.mff-zone-edit-panel').forEach(p => p.remove())

        const panel = document.createElement('div')
        panel.className = 'mff-zone-edit-panel'
        panel.style.cssText = 'margin-top:6px;padding:8px;background:rgba(0,0,0,0.2);border-radius:8px'

        panel.innerHTML = `<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:4px">ПОЗИЦИЯ ЗОНЫ</div>`

        const autoSave = () => this._autoSaveZones(game, zone)

        const posX = this._createPlainInput('X', -300, 300, 0.5, zone.position[0], (v) => { zone.position[0] = v; this._syncZoneGizmo(game, zone); autoSave() })
        const posY = this._createPlainInput('Y', -50, 50, 0.1, zone.position[1], (v) => { zone.position[1] = v; this._syncZoneGizmo(game, zone); autoSave() })
        const posZ = this._createPlainInput('Z', -300, 300, 0.5, zone.position[2], (v) => { zone.position[2] = v; this._syncZoneGizmo(game, zone); autoSave() })
        panel.appendChild(posX)
        panel.appendChild(posY)
        panel.appendChild(posZ)

        if(zone.poi)
        {
            const camH = document.createElement('div')
            camH.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);margin-top:6px;margin-bottom:4px'
            camH.textContent = 'КАМЕРА POI'
            panel.appendChild(camH)
            panel.appendChild(this._createPlainInput('Cam X', -300, 300, 0.5, zone.poi.cameraPosition[0], (v) => { zone.poi.cameraPosition[0] = v; autoSave() }))
            panel.appendChild(this._createPlainInput('Cam Y', -50, 100, 0.5, zone.poi.cameraPosition[1], (v) => { zone.poi.cameraPosition[1] = v; autoSave() }))
            panel.appendChild(this._createPlainInput('Cam Z', -300, 300, 0.5, zone.poi.cameraPosition[2], (v) => { zone.poi.cameraPosition[2] = v; autoSave() }))

            const tgtH = document.createElement('div')
            tgtH.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.3);margin-top:6px;margin-bottom:4px'
            tgtH.textContent = 'ЦЕЛЬ POI'
            panel.appendChild(tgtH)
            panel.appendChild(this._createPlainInput('Tgt X', -300, 300, 0.5, zone.poi.targetPosition[0], (v) => { zone.poi.targetPosition[0] = v; autoSave() }))
            panel.appendChild(this._createPlainInput('Tgt Y', -50, 50, 0.5, zone.poi.targetPosition[1], (v) => { zone.poi.targetPosition[1] = v; autoSave() }))
            panel.appendChild(this._createPlainInput('Tgt Z', -300, 300, 0.5, zone.poi.targetPosition[2], (v) => { zone.poi.targetPosition[2] = v; autoSave() }))
        }

        // Close button (no save needed — autosave)
        const closeBtn = this._createBtn('✓ Готово', () =>
        {
            if(game.poiManager?.editing?.isZone) game.poiManager.stopEditZone()
            panel.remove()
        })
        closeBtn.style.cssText = 'margin-top:8px;width:100%'
        panel.appendChild(closeBtn)

        item.appendChild(panel)

        // Start 3D gizmo — autosave on drag
        if(game.poiManager)
        {
            game.poiManager.startEditZone(zone, (pos) =>
            {
                const inputs = panel.querySelectorAll('.mff-number-input')
                if(inputs[0]) inputs[0].value = pos.x.toFixed(1)
                if(inputs[1]) inputs[1].value = pos.y.toFixed(1)
                if(inputs[2]) inputs[2].value = pos.z.toFixed(1)
                autoSave()
            })
        }
    }

    /** Open zone edit by zone id — used when clicking marker in 3D scene */
    openZoneEditById(zoneId)
    {
        const zone = zones.find(z => z.id === zoneId)
        if(!zone) return

        // Make sure settings panel is visible and on POI tab
        this.store.set('activeBottomPanel', 'settings')
        this._showTab('poi')

        // Find the item element for this zone
        setTimeout(() =>
        {
            const item = this.content.querySelector(`[data-zone-id="${zoneId}"]`)
            if(item)
            {
                this._openZoneEdit(zone, item)
                item.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }, 50)
    }

    /** Number input without slider — just label + input field */
    _createPlainInput(label, min, max, step, value, onChange)
    {
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px'
        const lbl = document.createElement('span')
        lbl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.5)'
        lbl.textContent = label
        const numInput = document.createElement('input')
        numInput.type = 'number'
        numInput.min = min
        numInput.max = max
        numInput.step = step
        numInput.value = Number(value).toFixed(step < 0.1 ? 2 : 1)
        numInput.className = 'mff-number-input'
        numInput.style.cssText = 'width:90px;text-align:right'

        const apply = () =>
        {
            let v = parseFloat(numInput.value)
            if(isNaN(v)) v = value
            v = Math.max(min, Math.min(max, v))
            numInput.value = Number(v).toFixed(step < 0.1 ? 2 : 1)
            onChange(v)
        }

        numInput.addEventListener('input', apply)
        numInput.addEventListener('change', apply)
        numInput.addEventListener('keydown', (e) =>
        {
            e.stopPropagation()
            if(e.key === 'Enter') numInput.blur()
            if((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.repeat) e.preventDefault()
        })
        numInput.addEventListener('keyup', (e) => e.stopPropagation())
        numInput.addEventListener('keypress', (e) => e.stopPropagation())

        row.appendChild(lbl)
        row.appendChild(numInput)
        return row
    }

    /** Autosave zone positions + rebuild 3D markers */
    _autoSaveZones(game, zone)
    {
        if(game.settingsStorage) game.settingsStorage.saveZonePositions(zones)
        if(game.uiOverlay?.navigationSystem) game.uiOverlay.navigationSystem.rebuildZoneMarkers()
    }

    // ---- Helpers ----

    /** Move the zone gizmo anchor to match zone.position when user types in number inputs */
    _syncZoneGizmo(game, zone)
    {
        if(game.poiManager?.editing?.isZone && game.poiManager.editing.zone === zone)
        {
            const anchor = game.poiManager.editing.marker
            anchor.position.set(zone.position[0], zone.position[1], zone.position[2])
        }
    }

    /** Sync a range slider sibling from a number input value */
    _syncSliderFromInput(input)
    {
        const wrapper = input.closest('div')
        if(!wrapper) return
        const slider = wrapper.querySelector('input[type="range"]')
        if(slider) slider.value = input.value
    }

    _createToggle(label, initialValue, onChange)
    {
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px'
        const labelEl = document.createElement('span')
        labelEl.style.cssText = 'font-size:12px;font-weight:500;color:rgba(255,255,255,0.7)'
        labelEl.textContent = label
        const toggle = document.createElement('button')
        toggle.className = `mff-toggle${initialValue ? ' is-active' : ''}`
        toggle.innerHTML = '<div class="mff-toggle-dot"></div>'
        let value = initialValue
        toggle.addEventListener('click', () => { value = !value; toggle.classList.toggle('is-active', value); onChange(value) })
        row.appendChild(labelEl)
        row.appendChild(toggle)
        return row
    }

    _createSlider(label, min, max, step, value, onChange)
    {
        const row = document.createElement('div')
        row.style.cssText = 'margin-bottom:10px'
        row.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:11px;color:rgba(255,255,255,0.5)">${label}</span>
            <span class="mff-slider-val" style="font-size:11px;color:rgba(212,175,55,0.8);font-family:monospace">${Number(value).toFixed(step < 0.1 ? 2 : 1)}</span>
        </div>`
        const slider = document.createElement('input')
        slider.type = 'range'
        slider.min = min
        slider.max = max
        slider.step = step
        slider.value = value
        slider.className = 'mff-range'
        slider.addEventListener('input', () =>
        {
            const v = parseFloat(slider.value)
            row.querySelector('.mff-slider-val').textContent = v.toFixed(step < 0.1 ? 2 : 1)
            onChange(v)
        })
        row.appendChild(slider)
        return row
    }

    _createBtn(text, onClick)
    {
        const btn = document.createElement('button')
        btn.className = 'mff-btn mff-btn-secondary'
        btn.style.cssText = 'font-size:11px;padding:8px 14px'
        btn.textContent = text
        btn.addEventListener('click', onClick)
        return btn
    }

    _createNumberInput(label, min, max, step, value, onChange)
    {
        const row = document.createElement('div')
        row.style.cssText = 'margin-bottom:10px'

        const header = document.createElement('div')
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px'
        const lbl = document.createElement('span')
        lbl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.5)'
        lbl.textContent = label
        const numInput = document.createElement('input')
        numInput.type = 'number'
        numInput.min = min
        numInput.max = max
        numInput.step = step
        numInput.value = Number(value).toFixed(step < 0.1 ? (step < 0.01 ? 3 : 2) : 1)
        numInput.className = 'mff-number-input'
        numInput.style.cssText = 'width:80px;text-align:right'
        header.appendChild(lbl)
        header.appendChild(numInput)
        row.appendChild(header)

        const slider = document.createElement('input')
        slider.type = 'range'
        slider.min = min
        slider.max = max
        slider.step = step
        slider.value = value
        slider.className = 'mff-range'
        row.appendChild(slider)

        // Sync slider → number input
        slider.addEventListener('input', () =>
        {
            const v = parseFloat(slider.value)
            numInput.value = v.toFixed(step < 0.1 ? (step < 0.01 ? 3 : 2) : 1)
            onChange(v)
        })

        // Sync number input → slider
        numInput.addEventListener('input', () =>
        {
            const v = parseFloat(numInput.value)
            if(!isNaN(v)) { slider.value = v; onChange(v) }
        })
        numInput.addEventListener('change', () =>
        {
            let v = parseFloat(numInput.value)
            if(isNaN(v)) v = value
            v = Math.max(min, Math.min(max, v))
            numInput.value = Number(v).toFixed(step < 0.1 ? (step < 0.01 ? 3 : 2) : 1)
            slider.value = v
            onChange(v)
        })
        numInput.addEventListener('blur', () =>
        {
            let v = parseFloat(numInput.value)
            if(isNaN(v)) v = value
            v = Math.max(min, Math.min(max, v))
            numInput.value = Number(v).toFixed(step < 0.1 ? (step < 0.01 ? 3 : 2) : 1)
            slider.value = v
            onChange(v)
        })

        // Stop game from intercepting keyboard when typing in number input
        numInput.addEventListener('keydown', (e) =>
        {
            e.stopPropagation()
            if(e.key === 'Enter') { numInput.blur() }
            if((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.repeat) { e.preventDefault() }
        })
        numInput.addEventListener('keyup', (e) => { e.stopPropagation() })
        numInput.addEventListener('keypress', (e) => { e.stopPropagation() })

        return row
    }

    _createSmallBtn(text, onClick)
    {
        const btn = document.createElement('button')
        btn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.5);font-size:14px;cursor:pointer;padding:2px 4px;transition:color 0.15s'
        btn.textContent = text
        btn.addEventListener('mouseenter', () => btn.style.color = 'white')
        btn.addEventListener('mouseleave', () => btn.style.color = 'rgba(255,255,255,0.5)')
        btn.addEventListener('click', onClick)
        return btn
    }

    _notify(msg)
    {
        this.store.addNotification({
            id: `settings-${Date.now()}`,
            type: 'general',
            title: 'Настройки',
            message: msg,
            timestamp: new Date(),
        })
    }

    _syncValues()
    {
        // Rebuild current tab to get fresh values
        this._showTab(this.activeTab)
    }

    destroy()
    {
        if(this._readoutInterval)
        {
            clearInterval(this._readoutInterval)
            this._readoutInterval = null
        }
        this.store.events.off('change:activeBottomPanel', this._onBottomPanelChange)
        if(this.element.parentNode)
            this.element.parentNode.removeChild(this.element)
    }
}
