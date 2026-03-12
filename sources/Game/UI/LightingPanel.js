import { UIStore } from './UIStore.js'
import { Game } from '../Game.js'

/**
 * Floating lighting panel (bottom panel, triggered by 'lighting' in activeBottomPanel).
 * Contains sun/ambient intensity, phi/theta, save/reset.
 */
export class LightingPanel
{
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()
        this.visible = false

        this.element = document.createElement('div')
        this.element.className = 'mff-floating-panel'
        parentElement.appendChild(this.element)

        this._build()

        this._onBottomPanelChange = (value) =>
        {
            this.setVisible(value === 'lighting')
        }
        this.store.events.on('change:activeBottomPanel', this._onBottomPanelChange)
    }

    setVisible(visible)
    {
        if(this.visible === visible) return
        this.visible = visible
        this.element.classList.toggle('is-visible', visible)
        if(visible) this._build()
    }

    _build()
    {
        const game = Game.getInstance()
        this.element.innerHTML = ''

        // Header
        const header = document.createElement('div')
        header.className = 'mff-settings-header'
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:16px">☀️</span>
                <span style="font-size:14px;font-weight:600;color:white">Освещение</span>
            </div>
            <button class="mff-panel-close" aria-label="Close">&times;</button>`
        header.querySelector('.mff-panel-close').addEventListener('click', () =>
        {
            this.store.set('activeBottomPanel', null)
        })
        this.element.appendChild(header)

        // Content
        const content = document.createElement('div')
        content.style.cssText = 'padding:16px 20px'

        content.appendChild(this._createNumberInput('Интенсивность солнца', 0, 20, 0.1,
            this._getVal('sunIntensity', 5), (v) => {
                if(game.lighting?.light) game.lighting.light.intensity = v
            }))

        content.appendChild(this._createNumberInput('Интенсивность окружения', 0, 10, 0.1,
            this._getVal('ambientIntensity', 2), (v) => {
                if(game.lighting?.ambientLight) game.lighting.ambientLight.intensity = v
            }))

        content.appendChild(this._createNumberInput('Высота солнца (Phi)', 0, 1.57, 0.01,
            this._getVal('sunPhi', 0.31), (v) => {
                if(game.lighting?.spherical) {
                    game.lighting.spherical.phi = v
                    game.lighting.light.position.setFromSpherical(game.lighting.spherical)
                }
            }))

        content.appendChild(this._createNumberInput('Вращение солнца (Theta)', 0, 6.28, 0.01,
            this._getVal('sunTheta', 0.79), (v) => {
                if(game.lighting?.spherical) {
                    game.lighting.spherical.theta = v
                    game.lighting.light.position.setFromSpherical(game.lighting.spherical)
                }
            }))

        // Save / Reset
        const btns = document.createElement('div')
        btns.style.cssText = 'display:flex;gap:8px;margin-top:12px'

        const saveBtn = this._createBtn('💾 Сохранить', () => {
            if(game.settingsStorage) {
                game.settingsStorage.saveSettings()
                this._notify('Настройки освещения сохранены')
            }
        })
        const resetBtn = this._createBtn('🔄 Сброс', () => {
            if(game.settingsStorage) {
                game.settingsStorage.resetToDefaults()
                this._notify('Настройки сброшены')
                this._build()
            }
        })
        btns.appendChild(saveBtn)
        btns.appendChild(resetBtn)
        content.appendChild(btns)

        this.element.appendChild(content)
    }

    _getVal(key, fallback)
    {
        const game = Game.getInstance()
        if(!game.lighting) return fallback
        switch(key)
        {
            case 'sunIntensity': return game.lighting.light?.intensity ?? fallback
            case 'ambientIntensity': return game.lighting.ambientLight?.intensity ?? fallback
            case 'sunPhi': return game.lighting.spherical?.phi ?? fallback
            case 'sunTheta': return game.lighting.spherical?.theta ?? fallback
        }
        return fallback
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

        slider.addEventListener('input', () =>
        {
            const v = parseFloat(slider.value)
            numInput.value = v.toFixed(step < 0.1 ? (step < 0.01 ? 3 : 2) : 1)
            onChange(v)
        })

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

    _createBtn(text, onClick)
    {
        const btn = document.createElement('button')
        btn.className = 'mff-btn mff-btn-secondary'
        btn.style.cssText = 'font-size:11px;padding:8px 14px'
        btn.textContent = text
        btn.addEventListener('click', onClick)
        return btn
    }

    _notify(msg)
    {
        this.store.addNotification({
            id: `lighting-${Date.now()}`,
            type: 'general',
            title: 'Освещение',
            message: msg,
            timestamp: new Date(),
        })
    }

    destroy()
    {
        this.store.events.off('change:activeBottomPanel', this._onBottomPanelChange)
        if(this.element.parentNode)
            this.element.parentNode.removeChild(this.element)
    }
}
