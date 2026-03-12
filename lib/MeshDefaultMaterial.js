/**
 * MeshDefaultMaterial
 * Кастомный материал на основе Three.js TSL (Shading Language)
 * Поддерживает: градиенты, текстуры, тени, fog, water effects
 */

import * as THREE from 'three'
import { 
    positionLocal, 
    varying, 
    uv, 
    max, 
    positionWorld, 
    float, 
    Fn, 
    uniform, 
    color, 
    mix, 
    vec3, 
    vec4, 
    normalWorld, 
    texture, 
    vec2, 
    time, 
    smoothstep, 
    luminance,
    clamp 
} from 'three/tsl'

/**
 * Параметры материала:
 * @param {TSL Node} colorNode - Нода цвета (текстура или процедурный цвет)
 * @param {TSL Node} alphaNode - Нода прозрачности
 * @param {boolean} hasCoreShadows - Включить основные тени
 * @param {boolean} hasDropShadows - Включить отбрасываемые тени (shadow map)
 * @param {boolean} hasLightBounce - Включить имитацию отражённого света
 * @param {boolean} hasFog - Включить туман
 * @param {boolean} hasWater - Включить эффект воды
 * @param {boolean} transparent - Прозрачный материал
 * @param {boolean} premultipliedAlpha - Premultiplied alpha
 */
export class MeshDefaultMaterial extends THREE.MeshBasicNodeMaterial {
    constructor(params = {}) {
        super()

        this.colorNode = params.colorNode || vec4(1, 1, 1, 1)
        this.alphaNode = params.alphaNode || float(1)
        this.hasCoreShadows = params.hasCoreShadows ?? true
        this.hasDropShadows = params.hasDropShadows ?? false
        this.hasLightBounce = params.hasLightBounce ?? true
        this.hasFog = params.hasFog ?? true
        this.hasWater = params.hasWater ?? false
        this.transparent = params.transparent ?? false
        this.premultipliedAlpha = params.premultipliedAlpha ?? false
        this.fog = params.hasFog ?? true

        // Uniforms для внешних эффектов
        this.shadowColorUniform = uniform(color('#000000'))
        this.bounceColorUniform = uniform(color('#82487f'))
        this.lightDirectionUniform = uniform(vec3(0, 0, 1))

        // Параметры теней
        this.coreShadowEdgeLow = uniform(float(-0.25))
        this.coreShadowEdgeHigh = uniform(float(1))

        // Параметры light bounce
        this.lightBounceEdgeLow = uniform(float(-1))
        this.lightBounceEdgeHigh = uniform(float(1))
        this.lightBounceDistance = uniform(float(1.5))
        this.lightBounceMultiplier = uniform(float(1))

        // Параметры воды
        this.waterElevation = uniform(float(0))
        this.waterColor = uniform(color('#4488ff'))
        this.waterOpacity = uniform(float(0.5))

        // Параметры тумана
        this.fogColor = uniform(color('#ffffff'))
        this.fogDensity = uniform(float(0.002))

        this.outputNode = Fn(() => this.buildOutput())()
    }

    buildOutput() {
        const uvNode = uv()
        const positionWorldNode = positionWorld
        const normalWorldNode = normalWorld

        // Базовый цвет
        let outputColor = vec4(this.colorNode.rgb, this.alphaNode)

        // Core shadows (основные тени)
        if (this.hasCoreShadows) {
            const coreShadowMix = normalWorldNode
                .dot(this.lightDirectionUniform)
                .smoothstep(this.coreShadowEdgeHigh, this.coreShadowEdgeLow)

            const shadowColor = this.shadowColorUniform
            outputColor = vec4(
                mix(outputColor.rgb, shadowColor.rgb, coreShadowMix),
                outputColor.a
            )
        }

        // Light bounce (отражённый свет)
        if (this.hasLightBounce) {
            const bounceOrientation = normalWorldNode
                .dot(vec3(0, -1, 0))
                .smoothstep(this.lightBounceEdgeLow, this.lightBounceEdgeHigh)

            const bounceDistance = this.lightBounceDistance
                .sub(max(0, positionWorldNode.y))
                .div(this.lightBounceDistance)
                .max(0)
                .pow(2)

            const bounceMix = bounceOrientation
                .mul(bounceDistance)
                .mul(this.lightBounceMultiplier)

            outputColor = vec4(
                mix(outputColor.rgb, this.bounceColorUniform.rgb, bounceMix),
                outputColor.a
            )
        }

        // Water effect (эффект воды)
        if (this.hasWater) {
            const waterMix = this.waterElevation
                .sub(positionWorldNode.y)
                .max(0)
                .min(1)
                .mul(this.waterOpacity)

            outputColor = vec4(
                mix(outputColor.rgb, this.waterColor.rgb, waterMix),
                outputColor.a
            )
        }

        // Drop shadows (отбрасываемые тени из shadow map)
        if (this.hasDropShadows) {
            // Three.js автоматически добавляет shadow узлы
            // Эта логика обрабатывается в pipeline
        }

        return outputColor
    }

    /**
     * Статический метод для создания материала с градиентом
     */
    static createGradient(colorA, colorB, direction = 'vertical') {
        const colorAUniform = uniform(color(colorA))
        const colorBUniform = uniform(color(colorB))
        const uvNode = uv()

        let mixFactor
        if (direction === 'vertical') {
            mixFactor = uvNode.y
        } else if (direction === 'horizontal') {
            mixFactor = uvNode.x
        } else if (direction === 'radial') {
            mixFactor = uvNode.sub(0.5).length().mul(2)
        } else {
            mixFactor = uvNode.y
        }

        const colorNode = mix(colorAUniform, colorBUniform, clamp(mixFactor, 0, 1))

        return new MeshDefaultMaterial({ colorNode })
    }

    /**
     * Статический метод для создания emissive материала
     */
    static createEmissive(colorValue, intensity = 3) {
        const colorUniform = uniform(color(colorValue))
        const intensityUniform = uniform(intensity)

        const material = new THREE.MeshBasicNodeMaterial()
        material.colorNode = colorUniform.div(luminance(colorUniform)).mul(intensityUniform)
        material.fog = false

        return material
    }

    /**
     * Обновляет параметры материала
     */
    update(params) {
        if (params.colorNode) this.colorNode = params.colorNode
        if (params.alphaNode) this.alphaNode = params.alphaNode
        if (params.hasCoreShadows !== undefined) this.hasCoreShadows = params.hasCoreShadows
        if (params.hasDropShadows !== undefined) this.hasDropShadows = params.hasDropShadows
        if (params.hasLightBounce !== undefined) this.hasLightBounce = params.hasLightBounce
        if (params.hasFog !== undefined) this.hasFog = params.hasFog
        if (params.hasWater !== undefined) this.hasWater = params.hasWater

        this.outputNode = Fn(() => this.buildOutput())()
        this.needsUpdate = true
    }

    /**
     * Устанавливает внешние uniforms (для интеграции с Lighting)
     */
    setLightingUniforms(lighting) {
        const nodes = lighting.getShaderNodes()
        this.lightDirectionUniform.value = nodes.lightDirection.value
        this.shadowColorUniform.value = nodes.shadowColor.value
        this.bounceColorUniform.value = nodes.bounceColor.value
    }
}

export default MeshDefaultMaterial
