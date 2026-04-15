import { Engine, Scene, Vector3, HemisphericLight, FreeCamera } from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

import { GameTerrain } from "../world/terrain";
import { GamePlayer } from "../world/player";
import { DayNightSystem } from "../world/dayNightSystem";
import { CombatSystem } from "../world/combat";
import { GameHUD } from "../ui/hud";

export class GameEngine {
    engine: Engine;
    scene: Scene;
    camera: FreeCamera;
    light: HemisphericLight;

    constructor(canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);

        // Isometric-ish setup
        this.camera = new FreeCamera("camera", new Vector3(20, 20, 20), this.scene);
        this.camera.setTarget(Vector3.Zero());
        this.camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;

        const zoom = 10;
        const aspect = canvas.width / canvas.height;
        this.camera.orthoLeft = -zoom * aspect;
        this.camera.orthoRight = zoom * aspect;
        this.camera.orthoTop = zoom;
        this.camera.orthoBottom = -zoom;

        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;
        this.light = light;
    }

    async initPhysics() {
        const havokInstance = await HavokPhysics();
        const havokPlugin = new HavokPlugin(true, havokInstance);
        this.scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);
        const terrain = new GameTerrain(this.scene);
        terrain.generate();
        const player = new GamePlayer(this.scene, 0, 0);
        // Follow camera
        this.scene.onBeforeRenderObservable.add(() => {
            this.camera.position.x = player.mesh.position.x + 20;
            this.camera.position.z = player.mesh.position.z + 20;
        });

        new DayNightSystem(this.scene, this.light);
        const combat = new CombatSystem(this.scene, player);
        window.addEventListener("keydown", (e) => { if (e.key === "f") combat.attackNearest(); });
        new GameHUD();
    }

    start() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
            const canvas = this.engine.getRenderingCanvas();
            if (canvas) {
                const zoom = 10;
                const aspect = canvas.width / canvas.height;
                this.camera.orthoLeft = -zoom * aspect;
                this.camera.orthoRight = zoom * aspect;
                this.camera.orthoTop = zoom;
                this.camera.orthoBottom = -zoom;
            }
        });
    }
}
