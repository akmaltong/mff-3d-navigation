import { Events } from './Events.js'
import { Game } from './Game.js'

export class Quality
{
    constructor()
    {
        this.game = Game.getInstance()

        this.events = new Events()

        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        this.level = isMobile ? 1 : 0 // 0 = highest quality

        // FPS monitoring
        this.fps = 60
        this.frameCount = 0
        this.lastTime = performance.now()
        this.fpsHistory = []
        this.historySize = 30
        this.auto = false // Auto-adjust by FPS (disabled by default)
        this.targetFPS = 60

        // Debug
        if(this.game.debug.active)
        {
            const debugPanel = this.game.debug.panel.addFolder({
                title: '⚙️ Quality',
                expanded: false,
            })

            this.game.debug.addButtons(
                debugPanel,
                {
                    low: () =>
                    {
                        this.changeLevel(1)
                    },
                    high: () =>
                    {
                        this.changeLevel(0)
                    },
                },
                'change'
            )

            debugPanel.addBinding(this, 'auto', { label: 'Auto FPS' })
        }

        // Start FPS monitoring
        this.startMonitoring()
    }

    changeLevel(level = 0)
    {
        // Same
        if(level === this.level)
            return

        const oldLevel = this.level
        this.level = level
        this.events.trigger('change', [ this.level ])

        // Log quality change
        if(this.game.debug.active)
        {
            console.log(`[Quality] Changed from ${oldLevel} to ${level}`)
        }
    }

    toggle()
    {
        this.changeLevel(this.level === 0 ? 1 : 0)
    }

    /**
     * Начать мониторинг FPS
     */
    startMonitoring()
    {
        this.monitoring = true
        this._monitor()
    }

    /**
     * Остановить мониторинг FPS
     */
    stopMonitoring()
    {
        this.monitoring = false
    }

    /**
     * Внутренний цикл мониторинга
     */
    _monitor()
    {
        if (!this.monitoring) return

        this.frameCount++

        const now = performance.now()
        const delta = now - this.lastTime

        if (delta >= 1000)
        {
            this.fps = Math.round((this.frameCount * 1000) / delta)
            this.fpsHistory.push(this.fps)

            if (this.fpsHistory.length > this.historySize)
            {
                this.fpsHistory.shift()
            }

            this.frameCount = 0
            this.lastTime = now

            // Auto-adjust quality
            if (this.auto)
            {
                this._autoAdjust()
            }
        }

        requestAnimationFrame(() => this._monitor())
    }

    /**
     * Автоматическая регулировка качества
     */
    _autoAdjust()
    {
        const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length

        if (avgFPS < this.targetFPS - 10 && this.level === 0)
        {
            // Слишком медленно, снижаем качество
            this.changeLevel(1)
        }
        else if (avgFPS > this.targetFPS + 10 && this.level === 1)
        {
            // Достаточно быстро, повышаем качество
            this.changeLevel(0)
        }
    }

    /**
     * Получить средний FPS
     */
    getAverageFPS()
    {
        if (this.fpsHistory.length === 0) return 60
        return Math.round(
            this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        )
    }

    /**
     * Получить текущий FPS
     */
    getCurrentFPS()
    {
        return this.fps
    }

    /**
     * Получить настройки для текущего уровня
     */
    getSettings()
    {
        return {
            0: {
                name: 'High',
                shadowMapSize: 2048,
                shadowRadius: 3,
                bloomMips: 5
            },
            1: {
                name: 'Performance',
                shadowMapSize: 512,
                shadowRadius: 2,
                bloomMips: 2
            }
        }[this.level]
    }
}