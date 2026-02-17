import './threejs-override.js'
import { Game } from './Game/Game.js'
import { CustomControlsUI } from './CustomControlsUI.js'
import consoleLog from './data/consoleLog.js'

if(import.meta.env.VITE_LOG)
    console.log(
        ...consoleLog
    )

let game

if(import.meta.env.VITE_GAME_PUBLIC)
    game = window.game = new Game()
else
    game = new Game()

// Initialize custom controls UI
window.addEventListener('load', () =>
{
    new CustomControlsUI()
})