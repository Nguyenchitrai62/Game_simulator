export class GameState {
    resources: Record<string, number> = {};
    buildings: Record<string, number> = {};
    unlocked: string[] = [];
    researched: string[] = [];
    age: string = "age.stone";

    player = {
        hp: 100, maxHp: 100, attack: 1, defense: 0,
        x: 0, z: 0, speed: 5,
        equipped: { weapon: null, offhand: null, armor: null, boots: null }
    };

    inventory: Record<string, number> = {};
    instances: Record<string, any> = {};
    buildingStorage: Record<string, Record<string, number>> = {};

    gameSpeed: number = 1.0;
    isPaused: boolean = false;
    hunger: number = 100;
    maxHunger: number = 100;
    timeOfDay: number = 12;
    fireFuel: Record<string, any> = {};
    version: string = "3.0.0";

    hasResource(id: string, amount: number): boolean {
        return (this.resources[id] || 0) >= amount;
    }

    addResource(id: string, amount: number) {
        if (!this.resources[id]) this.resources[id] = 0;
        this.resources[id] += amount;
    }

    removeResource(id: string, amount: number) {
        if (this.hasResource(id, amount)) {
            this.resources[id] -= amount;
        }
    }
}
export const state = new GameState();
