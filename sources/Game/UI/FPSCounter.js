import { UIStore } from './UIStore.js'

/**
 * Simple FPS counter overlay.
 * Visibility controlled by UIStore.showFPS.
 */
export class FPSCounter
{
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()
        this.frames = 0
        this.lastTime = performance.now()
        this.fps = 0

        this.element = document.createElement('div')
        this.element.className = 'mff-fps-counter'
        this.element.textContent = '0 FPS'
        parentElement.appendChild(this.element)

        // Visibility
        this._updateVisibility()
        this.store.events.on('change:showFPS', () => this._updateVisibility())

        // Start counting
        this._tick = this._tick.bind(this)
        this._rafId = requestAnimationFrame(this._tick)
    }

    _updateVisibility()
    {
        this.element.style.display = this.store.showFPS ? 'block' : 'none'
    }

    _tick()
    {
        this.frames++
        const now = performance.now()
        const delta = now - this.lastTime

        if(delta >= 1000)
        {
            this.fps = Math.round((this.frames * 1000) / delta)
            this.element.textContent = `${this.fps} FPS`
            this.frames = 0
            this.lastTime = now
        }

        this._rafId = requestAnimationFrame(this._tick)
    }

    destroy()
    {
        cancelAnimationFrame(this._rafId)
        if(this.element.parentNode)
            this.element.parentNode.removeChild(this.element)
    }
}
