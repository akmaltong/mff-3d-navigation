/**
 * Quality Manager
 * Управление качеством рендеринга
 * Адаптивное переключение на основе производительности
 */

export class Quality {
    /**
     * @param {Object} options - Настройки
     * @param {number} options.level - Начальный уровень (0 = высокое, 1 = низкое)
     * @param {boolean} options.auto - Автоматическая регулировка по FPS
     * @param {number} options.targetFPS - Целевой FPS для авто-регулировки
     */
    constructor(options = {}) {
        this.level = options.level ?? 0
        this.auto = options.auto ?? false
        this.targetFPS = options.targetFPS ?? 60

        this.levels = {
            0: {
                name: 'High',
                shadowMapSize: 2048,
                shadowRadius: 3,
                bloomMips: 5,
                pixelRatio: Math.min(window.devicePixelRatio, 2),
                dof: true,
                antialias: false
            },
            1: {
                name: 'Performance',
                shadowMapSize: 512,
                shadowRadius: 2,
                bloomMips: 2,
                pixelRatio: Math.min(window.devicePixelRatio, 1.5),
                dof: false,
                antialias: true
            }
        }

        // FPS monitoring
        this.fps = 60
        this.frameCount = 0
        this.lastTime = performance.now()
        this.fpsHistory = []
        this.historySize = 30

        // Callbacks
        this.onChangeCallbacks = []

        if (this.auto) {
            this.startMonitoring()
        }
    }

    /**
     * Установить уровень качества
     * @param {number} level - 0 или 1
     */
    set(level) {
        if (level < 0) level = 0
        if (level > 1) level = 1

        const oldLevel = this.level
        this.level = level

        if (oldLevel !== this.level) {
            this.onChangeCallbacks.forEach(cb => cb(this.level))
        }
    }

    /**
     * Переключить качество
     */
    toggle() {
        this.set(this.level === 0 ? 1 : 0)
    }

    /**
     * Получить настройки для текущего уровня
     */
    getSettings() {
        return this.levels[this.level]
    }

    /**
     * Получить конкретное значение
     * @param {string} key - Например 'shadowMapSize'
     */
    get(key) {
        return this.levels[this.level][key]
    }

    /**
     * Подписаться на изменение качества
     */
    onChange(callback) {
        this.onChangeCallbacks.push(callback)
    }

    /**
     * Начать мониторинг FPS
     */
    startMonitoring() {
        this.monitoring = true
        this._monitor()
    }

    /**
     * Остановить мониторинг FPS
     */
    stopMonitoring() {
        this.monitoring = false
    }

    /**
     * Внутренний цикл мониторинга
     */
    _monitor() {
        if (!this.monitoring) return

        this.frameCount++

        const now = performance.now()
        const delta = now - this.lastTime

        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta)
            this.fpsHistory.push(this.fps)

            if (this.fpsHistory.length > this.historySize) {
                this.fpsHistory.shift()
            }

            this.frameCount = 0
            this.lastTime = now

            // Auto-adjust quality
            this._autoAdjust()
        }

        requestAnimationFrame(() => this._monitor())
    }

    /**
     * Автоматическая регулировка качества
     */
    _autoAdjust() {
        const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length

        if (avgFPS < this.targetFPS - 10 && this.level === 0) {
            // Слишком медленно, снижаем качество
            this.set(1)
        } else if (avgFPS > this.targetFPS + 10 && this.level === 1) {
            // Достаточно быстро, повышаем качество
            this.set(0)
        }
    }

    /**
     * Получить средний FPS
     */
    getAverageFPS() {
        if (this.fpsHistory.length === 0) return 60
        return Math.round(
            this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        )
    }

    /**
     * Получить текущий FPS
     */
    getCurrentFPS() {
        return this.fps
    }
}

export default Quality
