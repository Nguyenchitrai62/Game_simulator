import { BalanceDef } from "./types";

export const BALANCE: Record<string, BalanceDef> = {
    // We will populate this with actual balance later
    // Config
    "hunger": { drainPerSecond: 0.2, autoEatThreshold: 30, hungrySpeedMult: 0.5, starvingHpDrain: 1, foodRestore: 5, eatDuration: 2, eatSpeedMult: 0.2, regenHungerMult: 1.5 },
    "dayNight": { hoursPerSecond: 0.0667 },

    // Default Node
    "node.tree": { hp: 5, rewards: { "resource.wood": 1 }, respawnTime: 30 },

    // Default Animal
    "animal.wolf": { hp: 15, attack: 3, defense: 0, rewards: { "resource.food": 2, "resource.leather": 1 }, respawnTime: 60, aggroRange: 5 }
};
