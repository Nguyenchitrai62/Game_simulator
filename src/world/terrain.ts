import { Scene, MeshBuilder, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";

export class GameTerrain {
    scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    generate() {
        const ground = MeshBuilder.CreateGround("ground", {width: 100, height: 100}, this.scene);
        const material = new StandardMaterial("groundMat", this.scene);
        material.diffuseColor = new Color3(0.2, 0.6, 0.2);
        ground.material = material;

        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0.1 }, this.scene);

        // Spawn some random trees
        for (let i = 0; i < 20; i++) {
            this.createTree(
                (Math.random() - 0.5) * 80,
                (Math.random() - 0.5) * 80
            );
        }
    }

    createTree(x: number, z: number) {
        const trunk = MeshBuilder.CreateCylinder("trunk", {height: 2, diameter: 0.5}, this.scene);
        const trunkMat = new StandardMaterial("trunkMat", this.scene);
        trunkMat.diffuseColor = new Color3(0.4, 0.2, 0.1);
        trunk.material = trunkMat;
        trunk.position.set(x, 1, z);

        const leaves = MeshBuilder.CreateSphere("leaves", {diameter: 3}, this.scene);
        const leavesMat = new StandardMaterial("leavesMat", this.scene);
        leavesMat.diffuseColor = new Color3(0.1, 0.8, 0.1);
        leaves.material = leavesMat;
        leaves.position.set(x, 3, z);

        new PhysicsAggregate(trunk, PhysicsShapeType.CYLINDER, { mass: 0 }, this.scene);
    }
}
