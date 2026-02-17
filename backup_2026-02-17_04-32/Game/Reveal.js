import * as THREE from 'three/webgpu'
import { color, uniform, vec2 } from 'three/tsl'
import { Game } from './Game.js'
import gsap from 'gsap'

export class Reveal
{
    constructor()
    {
        this.game = Game.getInstance()

        this.step = -1
        this.position = new THREE.Vector3(0, 0, 0)
        this.position2Uniform = uniform(vec2(this.position.x, this.position.z))
        this.distance = uniform(0)
        this.thickness = uniform(0.05)
        this.color = uniform(color('#e88eff'))
        this.intensity = uniform(5.5)
        this.intensityMultiplier = 1
    }

    updateStep(step)
    {
        const speedMultiplier = location.hash.match(/skip/i) ? 4 : 1

        // Step 0 - Add click handler
        if(step === 0)
        {
            // Hide intro circle
            this.game.world.intro.circle.hide(() =>
            {
                // Expand reveal distance
                this.distance.value = 0

                gsap.to(
                    this.distance,
                    {
                        value: 3.5,
                        ease: 'back.out(1.7)',
                        duration: 2 / speedMultiplier,
                        overwrite: true,
                    }
                )

                // Add click handler
                const next = () =>
                {
                    this.updateStep(1)
                    this.game.inputs.events.off('introStart', inputCallback)
                    this.game.rayCursor.removeIntersect(intersect)
                }

                const inputCallback = () =>
                {
                    next()
                }

                // Intersect for click on circle
                const position = this.position.clone()
                position.y = 0

                const intersect = this.game.rayCursor.addIntersect({
                    active: true,
                    shape: new THREE.Sphere(position, 3.5),
                    onClick: next,
                    onEnter: () =>
                    {
                        gsap.to(this, { intensityMultiplier: 1.22, duration: 0.2, overwrite: true })
                    },
                    onLeave: () =>
                    {
                        gsap.to(this, { intensityMultiplier: 1, duration: 0.2, overwrite: true })
                    }
                })

                // Keyboard inputs
                this.game.inputs.addActions([
                    { name: 'introStart', categories: [ 'intro' ], keys: [ 'Keyboard.Enter', 'Keyboard.ArrowUp', 'Keyboard.ArrowDown', 'Keyboard.KeyW', 'Keyboard.KeyD' ] },
                ])

                this.game.inputs.events.on('introStart', inputCallback)
            })
        }
        // Step 1 - Enable movement
        else if(step === 1)
        {
            // Expand reveal distance fully
            gsap.to(
                this.distance,
                {
                    value: 1000,
                    ease: 'back.in(1.3)',
                    duration: 2 / speedMultiplier,
                    overwrite: true,
                    onComplete: () =>
                    {
                        this.distance.value = 99999
                    }
                }
            )

            // Enable wandering controls
            this.game.inputs.filters.clear()
            this.game.inputs.filters.add('wandering')

            // Enable camera tracking
            this.game.view.focusPoint.isTracking = true
            this.game.view.focusPoint.magnet.active = false

            // Clean up intro
            this.game.world.grid.destroy()
            this.game.world.intro.destroy()
            this.game.world.intro = null

            this.step = 2
        }
    }

    update()
    {
        // Update intensity based on day cycle
        if(this.game.dayCycles && this.game.dayCycles.properties)
        {
            this.color.value.copy(this.game.dayCycles.properties.revealColor.value)
            this.intensity.value = this.game.dayCycles.properties.revealIntensity.value * this.intensityMultiplier
        }
    }
}
