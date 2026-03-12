import { UIStore } from './UIStore.js'
import { Game } from '../Game.js'
import gsap from 'gsap'

/**
 * 5 camera angle buttons arranged as a cross:
 *
 *     [↖]     [↗]
 *        [TOP]
 *     [↙]     [↘]
 *
 * ↘ = default active (current view, theta = -1.28)
 */

const PHI = Math.PI * 0.31
const T = 1.28  // base theta absolute value

const PRESETS = {
    'tl': { phi: PHI, theta: 2.28 },                // left-top
    'tr': { phi: PHI, theta: 1.28 },                // right-top
    'top': { phi: 0.05, theta: 0 },                  // top-down
    'bl': { phi: PHI, theta: -2.28 },                // left-bottom
    'br': { phi: PHI, theta: -1.28 },                // right-bottom (default)
}

export class CameraAngles
{
    constructor(parentElement)
    {
        this.store = UIStore.getInstance()
        this.activeId = 'br'

        this.element = document.createElement('div')
        this.element.className = 'mff-cam-cross'
        this.element.innerHTML = `
            <button class="mff-cam-btn mff-cam-tl" data-angle="tl" aria-label="Левый верх">↘</button>
            <button class="mff-cam-btn mff-cam-tr" data-angle="tr" aria-label="Правый верх">↙</button>
            <button class="mff-cam-btn mff-cam-top" data-angle="top" aria-label="Сверху">●</button>
            <button class="mff-cam-btn mff-cam-bl" data-angle="bl" aria-label="Левый низ">↗</button>
            <button class="mff-cam-btn mff-cam-br is-active" data-angle="br" aria-label="Правый низ">↖</button>
        `

        parentElement.appendChild(this.element)

        this.element.addEventListener('click', (e) =>
        {
            const btn = e.target.closest('[data-angle]')
            if(!btn) return
            this._applyAngle(btn.dataset.angle)
        })
    }

    _applyAngle(id)
    {
        const preset = PRESETS[id]
        if(!preset) return

        this.activeId = id
        this.element.querySelectorAll('.mff-cam-btn').forEach(b =>
            b.classList.toggle('is-active', b.dataset.angle === id)
        )

        const game = Game.getInstance()
        if(!game?.view) return

        gsap.to(game.view.spherical, {
            phi: preset.phi,
            theta: preset.theta,
            duration: 1.2,
            ease: 'power2.inOut',
        })
    }

    destroy()
    {
        if(this.element.parentNode)
            this.element.parentNode.removeChild(this.element)
    }
}
