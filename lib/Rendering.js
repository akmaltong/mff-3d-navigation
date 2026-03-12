/**
 * Rendering System
 * Портативная система рендеринга с пост-процессингом
 * На основе Bruno Simon Folio 2025
 */

import * as THREE from 'three'
import { pass, mrt, output, emissive, renderOutput, vec4 } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'

/**
 * Параметры:
 * @param {THREE.Scene} scene - Сцена
 * @param {THREE.Camera} camera - Камера
 * @param {HTMLElement} canvas - Canvas элемент
 * @param {Object} options - Настройки
 * @param {number} options.quality - 0 = высокое, 1 = производительность
 * @param {boolean} options.useBloom - Включить Bloom эффект
 * @param {boolean} options.useDOF - Включить Depth of Field
 */
export class Rendering {
    constructor(scene, camera, canvas, options = {}) {
        this.scene = scene
        this.camera = camera
        this.canvas = canvas
        this.quality = options.quality ?? 0
        this.useBloom = options.useBloom ?? true
        this.useDOF = options.useDOF ?? false

        this.bloomStrength = 0.25
        this.bloomThreshold = 1
        this.bloomMips = this.quality === 0 ? 5 : 2

        this.width = canvas.clientWidth || window.innerWidth
        this.height = canvas.clientHeight || window.innerHeight
        this.pixelRatio = Math.min(window.devicePixelRatio, 2)

        this.setRenderer()
        this.setPostProcessing()
        this.setSize(this.width, this.height)
    }

    /**
     * Инициализация WebGL рендерера
     */
    setRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: this.pixelRatio < 2,
            powerPreference: 'high-performance',
            alpha: false
        })

        this.renderer.setSize(this.width, this.height)
        this.renderer.setPixelRatio(this.pixelRatio)
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer.sortObjects = false

        this.renderer.setOpaqueSort((a, b) => a.renderOrder - b.renderOrder)
        this.renderer.setTransparentSort((a, b) => a.renderOrder - b.renderOrder)
    }

    /**
     * Настройка пост-процессинга
     */
    setPostProcessing() {
        // Создаём композер для пост-процессинга
        this.composer = new THREE.EffectComposer(this.renderer)

        // Basic render pass
        this.renderPass = new THREE.RenderPass(this.scene, this.camera)
        this.composer.addPass(this.renderPass)

        // Bloom pass
        if (this.useBloom) {
            this.bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(this.width, this.height),
                this.bloomStrength,      // strength
                0.5,                      // radius
                0.1                       // threshold
            )
            this.bloomPass.threshold = this.bloomThreshold
            this.bloomPass.strength = this.bloomStrength
            this.bloomPass.radius = 0.5
            this.composer.addPass(this.bloomPass)
        }

        // DOF pass (опционально, только для высокого качества)
        if (this.useDOF && this.quality === 0) {
            this.dofPass = new THREE.BokehPass(this.scene, this.camera, {
                focus: 10,
                aperture: 0.0001,
                maxblur: 0.01,
                width: this.width,
                height: this.height
            })
            this.composer.addPass(this.dofPass)
        }
    }

    /**
     * Установить размер рендерера
     */
    setSize(width, height) {
        this.width = width
        this.height = height

        this.renderer.setSize(width, height)
        this.composer?.setSize(width, height)

        if (this.bloomPass) {
            this.bloomPass.resolution.set(width, height)
        }
    }

    /**
     * Установить качество
     * @param {number} level - 0 = высокое, 1 = производительность
     */
    setQuality(level) {
        this.quality = level

        if (level === 0) {
            // Высокое качество
            this.bloomMips = 5
            if (this.bloomPass) {
                this.bloomPass.strength = this.bloomStrength
            }
            // Включить DOF если доступен
            if (this.useDOF && !this.dofPass) {
                this.dofPass = new THREE.BokehPass(this.scene, this.camera, {
                    focus: 10,
                    aperture: 0.0001,
                    maxblur: 0.01,
                    width: this.width,
                    height: this.height
                })
                this.composer.addPass(this.dofPass)
            }
        } else {
            // Производительность
            this.bloomMips = 2
            if (this.bloomPass) {
                this.bloomPass.strength = this.bloomStrength * 0.5
            }
            // Отключить DOF
            if (this.dofPass) {
                this.composer.removePass(this.dofPass)
                this.dofPass = null
            }
        }
    }

    /**
     * Обновить настройки Bloom
     */
    setBloom(options = {}) {
        if (!this.bloomPass) return

        if (options.strength !== undefined) {
            this.bloomStrength = options.strength
            this.bloomPass.strength = options.strength
        }
        if (options.threshold !== undefined) {
            this.bloomPass.threshold = options.threshold
        }
        if (options.radius !== undefined) {
            this.bloomPass.radius = options.radius
        }
    }

    /**
     * Рендер кадра
     */
    render() {
        if (this.composer) {
            this.composer.render()
        } else {
            this.renderer.render(this.scene, this.camera)
        }
    }

    /**
     * Получить WebGLRenderer
     */
    getRenderer() {
        return this.renderer
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        this.renderer.dispose()
        this.composer?.passes.forEach(pass => pass.dispose?.())
    }
}

export default Rendering
