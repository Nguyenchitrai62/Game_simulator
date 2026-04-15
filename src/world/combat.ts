import { Scene, Vector3, Mesh } from "@babylonjs/core";
import { GamePlayer } from "./player";

export class CombatSystem {
    scene: Scene;
    player: GamePlayer;
    enemies: Mesh[] = [];

    constructor(scene: Scene, player: GamePlayer) {
        this.scene = scene;
        this.player = player;
    }

    attackNearest() {
        if (this.enemies.length === 0) return;

        let nearest = this.enemies[0];
        let minDist = Vector3.DistanceSquared(this.player.mesh.position, nearest.position);

        for (let i = 1; i < this.enemies.length; i++) {
            const dist = Vector3.DistanceSquared(this.player.mesh.position, this.enemies[i].position);
            if (dist < minDist) {
                minDist = dist;
                nearest = this.enemies[i];
            }
        }

        if (minDist < 10) { // Attack range
            console.log("Attacking enemy!");
            // Implement damage logic here referencing GameState
        }
    }
}
