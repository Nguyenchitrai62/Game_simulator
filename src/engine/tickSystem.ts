import { state } from "./gameState";

export class TickSystem {
    private lastTick = 0;
    private tickInterval = 1000;

    update(time: number) {
        if (state.isPaused) return;

        if (time - this.lastTick >= this.tickInterval / state.gameSpeed) {
            this.tick();
            this.lastTick = time;
        }
    }

    private tick() {
        // Handle passive production, hunger drain, fuel drain etc.
    }
}
