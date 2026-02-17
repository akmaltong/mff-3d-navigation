                           import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { Grid } from './Grid.js'
import { Intro } from './Intro.js'
import { VisualVehicle } from './VisualVehicle.js'
import { GizmoControls } from './GizmoControls.js'

export class World
{
    constructor()
    {
        this.game = Game.getInstance()

        this.step(0)
    }

    step(step)
    {
        if(step === 0)
        {
            this.grid = new Grid()
            this.intro = new Intro()
        }
        else if(step === 1)
        {
            // Visual vehicle
            this.visualVehicle = new VisualVehicle(this.game.resources.vehicle.scene)

            // Physical floor only (no visual gray floor)
            this.game.objects.add(
                null,
                {
                    type: 'fixed',
                    friction: 0.25,
                    restitution: 0,
                    colliders: [
                        { shape: 'cuboid', parameters: [ 1000, 1, 1000 ], position: { x: 0, y: - 1.01, z: 0 }, category: 'floor' },
                    ]
                }
            )

            // Custom SM model
            this.setSMModel()
        }
    }


    setSMModel()
    {
        // Clone the SM model
        const smScene = this.game.resources.smModel.scene.clone()

        // Reset ALL internal transforms to zero
        smScene.traverse((child) => {
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
                if(child.material) child.material.needsUpdate = true
            }
        })

        // World pivot group — rotations/translations happen in world space via this group
        this.smPivot = new THREE.Group()
        this.smPivot.name = 'sm-world-pivot'

        // Model inside pivot — position/rotation zeroed
        smScene.position.set(0, 0, 0)
        smScene.rotation.set(0, 0, 0)
        smScene.scale.set(1, 1, 1)

        this.smPivot.add(smScene)
        this.game.scene.add(this.smPivot)
        this.smModel = this.smPivot  // UI controls this pivot

        // Gizmo controls target the pivot
        this.gizmoControls = new GizmoControls(this.smPivot)
    }

}