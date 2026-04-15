import { ActionManager } from "@babylonjs/core";
import { Scene, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Vector3 } from "@babylonjs/core";

export class GamePlayer {
    scene: Scene;
    mesh: any;
    aggregate: PhysicsAggregate;
    speed: number = 10;
    inputMap: Record<string, boolean> = {};

    constructor(scene: Scene, x: number, z: number) {
        this.scene = scene;

        this.mesh = MeshBuilder.CreateBox("player", {size: 1.5}, this.scene);
        this.mesh.position.set(x, 2, z);

        const mat = new StandardMaterial("playerMat", this.scene);
        mat.diffuseColor = new Color3(0.2, 0.2, 0.8);
        this.mesh.material = mat;

        this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.BOX, { mass: 1, friction: 0, restitution: 0 }, this.scene);
        // Lock rotation
        this.aggregate.body.setMassProperties({
            inertia: Vector3.Zero(),
            mass: 1
        });

        this.setupInput();

        this.scene.onBeforeRenderObservable.add(() => {
            this.updateMovement();
        });
    }

    setupInput() {
        this.scene.actionManager = new ActionManager(this.scene);
        window.addEventListener("keydown", (e) => { this.inputMap[e.key.toLowerCase()] = true; });
        window.addEventListener("keyup", (e) => { this.inputMap[e.key.toLowerCase()] = false; });
    }

    updateMovement() {
        let dx = 0;
        let dz = 0;

        if (this.inputMap["w"]) { dx -= 1; dz += 1; }
        if (this.inputMap["s"]) { dx += 1; dz -= 1; }
        if (this.inputMap["a"]) { dx -= 1; dz -= 1; }
        if (this.inputMap["d"]) { dx += 1; dz += 1; }

        let velocity = new Vector3(dx, 0, dz);
        if (velocity.length() > 0) {
            velocity = velocity.normalize().scale(this.speed);
        }

        // Preserve vertical velocity (falling)
        const currentVelocity = this.aggregate.body.getLinearVelocity();
        velocity.y = currentVelocity.y;

        this.aggregate.body.setLinearVelocity(velocity);
    }
}
