export type EntityId = string;

export interface VisualData {
    shape?: string;
    color?: string | number;
    roofColor?: string | number;
    scale?: number;
}

export interface Stats {
    attack?: number;
    defense?: number;
    maxHp?: number;
    speed?: number;
}

export interface UnlockConditions {
    age?: string;
    resources?: Record<string, number>;
    buildings?: Record<string, number>;
    technologies?: string[];
}

export interface EntityDef {
    id: EntityId;
    type: "age" | "resource" | "resource_node" | "animal" | "building" | "equipment" | "recipe" | "technology" | "consumable";
    name: string;
    description?: string;
    visual?: VisualData;
    slot?: "weapon" | "offhand" | "armor" | "boots";
    unlock?: UnlockConditions;
}

export interface BalanceDef {
    hp?: number;
    rewards?: Record<string, number>;
    respawnTime?: number;
    attack?: number;
    defense?: number;
    aggroRange?: number;
    cost?: Record<string, number>;
    searchRadius?: Record<number, number>;
    workerCount?: Record<number, number>;
    storageCapacity?: Record<number, number>;
    productionSpeed?: Record<number, number>;
    produces?: Record<string, number>;
    consumesPerSecond?: Record<string, number>;
    transferRange?: number;
    synergyFrom?: Record<string, number>;
    upgrades?: Record<number, { cost: Record<string, number>; productionMultiplier?: number; }>;
    input?: Record<string, number>;
    output?: Record<string, number>;
    stats?: Stats;
    startResources?: Record<string, number>;
    advanceFrom?: { age: string; resources?: Record<string, number>; buildings?: Record<string, number>; };
    researchCost?: Record<string, number>;
    requires?: string[];
    effects?: { productionBonus?: number; harvestSpeedBonus?: number; npcSpeedBonus?: number; storageBonus?: number; };
    drainPerSecond?: number;
    autoEatThreshold?: number;
    hungrySpeedMult?: number;
    starvingHpDrain?: number;
    foodRestore?: number;
    eatDuration?: number;
    eatSpeedMult?: number;
    regenHungerMult?: number;
    hoursPerSecond?: number;
    refuelCost?: Record<string, number>;
    fuelCapacity?: number;
}
