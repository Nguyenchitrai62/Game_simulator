import { GameEngine } from "./engine/core";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const game = new GameEngine(canvas);

game.initPhysics().then(() => {
    game.start();
});
