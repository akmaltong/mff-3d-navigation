/**
 * Lighting System
 * Портативная система освещения на основе Bruno Simon Folio 2025
 * 
 * Использование:
 *   const lighting = new Lighting(scene, camera, { quality: 0 })
 *   lighting.update() // вызывается в рендер-цикле
 */

import * as THREE from 'three'
import { uniform, color, float, vec3, normalWorld, smoothstep, max, min, mix, clamp } from 'three/tsl'

export class Lighting {
    /**
     * @param {THREE.Scene} scene - Three.js сцена
     * @param {THREE.Camera} camera - Three.js камера
     * @param {Object} options - Настройки
     * @param {number} options.quality - Уровень качества (0 = высокое, 1 = производительность)
     * @param {boolean} options.useDayCycles - Использовать цикл дня/ночи
     * @param {THREE.Vector3} options.focusPoint - Точка фокусировки света (по умолчанию (0,0,0))
     */
    constructor(scene, camera, options = {}) {
        this.scene = scene
        this.camera = camera
        this.quality = options.quality ?? 0
        this.useDayCycles = options.useDayCycles ?? false
        this.focusPoint = options.focusPoint?.clone() || new THREE.Vector3(0, 0, 0)

        // Параметры освещения
        this.phi = 0.63
        this.theta = 0.72
        this.phiAmplitude = 0.62
        this.thetaAmplitude = 1.25
        this.near = 1
        this.depth = 100
        this.shadowAmplitude = 50
        this.shadowBias = -0.001
        this.shadowNormalBias = 0.1
        this.shadowRadius = this.quality === 0 ? 3 : 2
        this.mapSize = this.quality === 0 ? 2048 : 512

        // Координаты солнца (сферические)
        this.spherical = new THREE.Spherical(50, this.phi, this.theta)
        this.direction = new THREE.Vector3()
        this.color = new THREE.Color('#ffffff')
        this.intensity = 5

        // Uniforms для шейдеров
        this.directionUniform = uniform(vec3(0, 0, 1))
        this.shadowColorUniform = uniform(color('#000000'))
        this.bounceColorUniform = uniform(color('#82487f'))

        // Параметры fake light bounce (имитация глобального освещения)
        this.lightBounce = {
            enabled: true,
            edgeLow: uniform(float(-1)),
            edgeHigh: uniform(float(1)),
            distance: uniform(float(1.5)),
            multiplier: uniform(float(1))
        }

        // Параметры core shadows (основные тени в шейдере)
        this.coreShadows = {
            enabled: true,
            edgeLow: uniform(float(-0.25)),
            edgeHigh: uniform(float(1))
        }

        this.setLight()
        this.updateShadow()
        this.updateCoordinates()
    }

    /**
     * Создаёт источники света
     */
    setLight() {
        // Directional light с тенями
        this.light = new THREE.DirectionalLight(0xffffff, this.intensity)
        this.light.position.setFromSpherical(this.spherical)
        this.light.castShadow = true

        this.scene.add(this.light)
        this.scene.add(this.light.target)

        // Ambient light для базовой видимости
        this.ambientLight = new THREE.AmbientLight(0xffffff, 2.0)
        this.scene.add(this.ambientLight)

        // Helpers (скрыты по умолчанию)
        this._createHelpers()
    }

    /**
     * Создаёт вспомогательные объекты для отладки
     */
    _createHelpers() {
        // Direction helper
        this.directionHelper = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.25, 1),
            new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true })
        )
        this.directionHelper.visible = false

        const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 5)]
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
        const line = new THREE.Line(lineGeometry, lineMaterial)
        this.directionHelper.add(line)

        this.scene.add(this.directionHelper)

        // Shadow helper
        this.shadowHelper = new THREE.CameraHelper(this.light.shadow.camera)
        this.shadowHelper.visible = false
        this.scene.add(this.shadowHelper)
    }

    /**
     * Обновляет параметры shadow камеры
     */
    updateShadow() {
        this.light.shadow.camera.top = this.shadowAmplitude
        this.light.shadow.camera.right = this.shadowAmplitude
        this.light.shadow.camera.bottom = -this.shadowAmplitude
        this.light.shadow.camera.left = -this.shadowAmplitude
        this.light.shadow.camera.near = this.near
        this.light.shadow.camera.far = this.near + this.depth
        this.light.shadow.bias = this.shadowBias
        this.light.shadow.normalBias = this.shadowNormalBias
        this.light.shadow.radius = this.shadowRadius
        this.light.shadow.camera.updateProjectionMatrix()
        this.light.shadow.mapSize.set(this.mapSize, this.mapSize)
    }

    /**
     * Обновляет сферические координаты солнца
     */
    updateCoordinates() {
        this.spherical.radius = 50
        this.direction.setFromSpherical(this.spherical).normalize()
        this.directionUniform.value.copy(this.direction)
    }

    /**
     * Вызывается каждый кадр
     */
    update(deltaTime = 0) {
        if (this.useDayCycles) {
            // Анимация цикла дня/ночи
            const progressOffset = 9 / 16
            const time = Date.now() * 0.0001
            this.spherical.theta = this.theta + Math.sin(-(time + progressOffset) * Math.PI * 2) * this.thetaAmplitude
            this.spherical.phi = this.phi + (Math.cos(-(time + progressOffset) * Math.PI * 2) * 0.5) * this.phiAmplitude
        }

        this.updateCoordinates()

        // Позиция света привязана к focusPoint
        this.light.position.setFromSpherical(this.spherical).add(this.focusPoint)
        this.light.target.position.copy(this.focusPoint)

        // Обновление helpers
        if (this.directionHelper) {
            this.directionHelper.position.copy(this.direction).multiplyScalar(5).add(this.focusPoint)
            this.directionHelper.lookAt(this.focusPoint)
        }
    }

    /**
     * Показывает/скрывает helpers
     * @param {boolean} visible
     */
    setHelpersVisible(visible) {
        this.directionHelper.visible = visible
        this.shadowHelper.visible = visible
    }

    /**
     * Устанавливает качество
     * @param {number} level - 0 = высокое, 1 = производительность
     */
    setQuality(level) {
        this.quality = level
        this.mapSize = level === 0 ? 2048 : 512
        this.shadowRadius = level === 0 ? 3 : 2
        this.light.shadow.mapSize.set(this.mapSize, this.mapSize)
        this.light.shadow.radius = this.shadowRadius
    }

    /**
     * Устанавливает цвет и интенсивность света
     * @param {string|THREE.Color} color - Цвет света
     * @param {number} intensity - Интенсивность
     */
    setLightColor(colorValue, intensity) {
        this.color.set(colorValue)
        this.intensity = intensity
        this.light.color.set(this.color)
        this.light.intensity = this.intensity
    }

    /**
     * Устанавливает цвет ambient света
     * @param {string|THREE.Color} color - Цвет
     * @param {number} intensity - Интенсивность
     */
    setAmbientColor(colorValue, intensity) {
        this.ambientLight.color.set(colorValue)
        this.ambientLight.intensity = intensity ?? this.ambientLight.intensity
    }

    /**
     * Возвращает ноды для кастомных материалов (TSL)
     */
    getShaderNodes() {
        return {
            lightDirection: this.directionUniform,
            shadowColor: this.shadowColorUniform,
            bounceColor: this.bounceColorUniform,
            lightBounce: this.lightBounce,
            coreShadows: this.coreShadows
        }
    }

    /**
     * Создаёт ноду комбинированных теней для TSL материалов
     * @param {Object} materialParams - Параметры материала
     * @returns {TSL Node} Нода теней
     */
    createShadowNode(materialParams = {}) {
        const { normalWorld, positionWorld } = materialParams

        // Core shadows (дешёвые тени без shadow map)
        const coreShadowMix = normalWorld
            .dot(this.directionUniform)
            .smoothstep(this.coreShadows.edgeHigh, this.coreShadows.edgeLow)

        // Fake light bounce (отражённый свет от поверхности)
        const bounceOrientation = normalWorld
            .dot(vec3(0, -1, 0))
            .smoothstep(this.lightBounce.edgeLow, this.lightBounce.edgeHigh)

        const bounceDistance = this.lightBounce.distance
            .sub(max(0, positionWorld.y))
            .div(this.lightBounce.distance)
            .max(0)
            .pow(2)

        const bounceMix = bounceOrientation
            .mul(bounceDistance)
            .mul(this.lightBounce.multiplier)

        // Комбинирование
        const combinedShadowMix = max(coreShadowMix, bounceMix).clamp(0, 1)

        return combinedShadowMix
    }

    /**
     * Удаляет освещение из сцены
     */
    dispose() {
        this.scene.remove(this.light)
        this.scene.remove(this.light.target)
        this.scene.remove(this.ambientLight)
        this.scene.remove(this.directionHelper)
        this.scene.remove(this.shadowHelper)

        this.light.dispose()
        this.ambientLight.dispose()
        this.directionHelper.geometry.dispose()
        this.directionHelper.material.dispose()
    }
}

export default Lighting
