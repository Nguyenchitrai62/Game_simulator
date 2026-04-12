window.GAME_BALANCE = {
  // === RESOURCE NODES (world objects) ===
  "node.tree": {
    hp: 3,
    rewards: { "resource.wood": 3 },
    respawnTime: 30
  },
  "node.rock": {
    hp: 5,
    rewards: { "resource.stone": 2, "resource.flint": 1 },
    respawnTime: 45
  },
  "node.berry_bush": {
    hp: 1,
    rewards: { "resource.food": 2 },
    respawnTime: 20
  },
  "node.flint_deposit": {
    hp: 4,
    rewards: { "resource.flint": 3 },
    respawnTime: 60
  },

  // === ANIMALS ===
  "animal.wolf": {
    hp: 15,
    attack: 3,
    defense: 1,
    rewards: { "resource.food": 5 },
    respawnTime: 60,
    aggroRange: 3
  },
  "animal.boar": {
    hp: 20,
    attack: 5,
    defense: 2,
    rewards: { "resource.food": 8, "resource.leather": 2 },
    respawnTime: 90,
    aggroRange: 2.5
  },
  "animal.bear": {
    hp: 40,
    attack: 8,
    defense: 3,
    rewards: { "resource.food": 15, "resource.leather": 5 },
    respawnTime: 120,
    aggroRange: 2.5
  },

  // === BUILDINGS ===
  "building.wood_cutter": {
    cost: { "resource.wood": 10 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    storageCapacity: { 1: 50, 2: 100, 3: 200 },
    productionSpeed: { 1: 1.0, 2: 1.2, 3: 1.5 },
    produces: { "resource.wood": 2 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 30, "resource.stone": 10 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 80, "resource.stone": 30, "resource.flint": 10 }, productionMultiplier: 2.0 }
    }
  },
  "building.stone_quarry": {
    cost: { "resource.wood": 15, "resource.stone": 5 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    storageCapacity: { 1: 30, 2: 60, 3: 120 },
    productionSpeed: { 1: 1.0, 2: 1.2, 3: 1.5 },
    produces: { "resource.stone": 1 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 40, "resource.stone": 20 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 100, "resource.stone": 50, "resource.flint": 15 }, productionMultiplier: 2.0 }
    }
  },
  "building.berry_gatherer": {
    cost: { "resource.wood": 8 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    storageCapacity: { 1: 40, 2: 80, 3: 160 },
    productionSpeed: { 1: 1.0, 2: 1.2, 3: 1.5 },
    produces: { "resource.food": 2 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 25, "resource.food": 15 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 60, "resource.food": 40, "resource.flint": 5 }, productionMultiplier: 2.0 }
    }
  },
  "building.flint_mine": {
    cost: { "resource.wood": 20, "resource.stone": 10 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    storageCapacity: { 1: 25, 2: 50, 3: 100 },
    productionSpeed: { 1: 1.0, 2: 1.2, 3: 1.5 },
    produces: { "resource.flint": 1 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 50, "resource.stone": 30 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 120, "resource.stone": 60, "resource.flint": 20 }, productionMultiplier: 2.0 }
    }
  },
  "building.warehouse": {
    cost: { "resource.wood": 40, "resource.stone": 30 },
    searchRadius: { 1: 0, 2: 0, 3: 0 },
    workerCount: { 1: 0, 2: 0, 3: 0 },
    storageCapacity: { 1: 500, 2: 1000, 3: 2000 },
    productionSpeed: { 1: 1.0, 2: 1.0, 3: 1.0 },
    produces: {},
    transferRange: 5,
    upgrades: {
      2: { cost: { "resource.wood": 80, "resource.stone": 60 }, productionMultiplier: 1.0 },
      3: { cost: { "resource.wood": 160, "resource.stone": 120 }, productionMultiplier: 1.0 }
    }
  },
  "building.barracks": {
    cost: { "resource.wood": 50, "resource.stone": 40, "resource.tool": 5 },
    searchRadius: { 1: 0, 2: 0 },  // No harvesting
    workerCount: { 1: 0, 2: 0 },    // No harvest workers (guards handled separately)
    storageCapacity: { 1: 0, 2: 0 },
    productionSpeed: { 1: 1.0, 2: 1.0 },
    produces: {},  // No production - spawns guards
    guardCount: { 1: 2, 2: 3 },  // Number of guard NPCs
    guardRadius: { 1: 8, 2: 12 },  // Patrol/attack radius
    upgrades: {
      2: { cost: { "resource.wood": 100, "resource.stone": 80, "resource.tool": 10 }, productionMultiplier: 1.0 }
    }
  },

  // === RECIPES ===
  "recipe.stone_tool": {
    input: { "resource.flint": 3, "resource.wood": 2 },
    output: { "resource.tool": 1 }
  },
  "recipe.wooden_sword": {
    input: { "resource.wood": 5, "resource.flint": 2 },
    output: { "equipment.wooden_sword": 1 }
  },
  "recipe.stone_spear": {
    input: { "resource.wood": 8, "resource.flint": 4, "resource.stone": 3 },
    output: { "equipment.stone_spear": 1 }
  },
  "recipe.stone_shield": {
    input: { "resource.stone": 8, "resource.wood": 4, "resource.flint": 2 },
    output: { "equipment.stone_shield": 1 }
  },
  "recipe.leather_armor": {
    input: { "resource.leather": 5, "resource.flint": 3 },
    output: { "equipment.leather_armor": 1 }
  },
  "recipe.leather_boots": {
    input: { "resource.leather": 3, "resource.wood": 2 },
    output: { "equipment.leather_boots": 1 }
  },

  // === EQUIPMENT ===
  "equipment.wooden_sword": {
    stats: { attack: 3 },
    slot: "weapon"
  },
  "equipment.stone_spear": {
    stats: { attack: 6 },
    slot: "weapon"
  },
  "equipment.stone_shield": {
    stats: { defense: 3 },
    slot: "offhand"
  },
  "equipment.leather_armor": {
    stats: { defense: 5, maxHp: 10 },
    slot: "armor"
  },
  "equipment.leather_boots": {
    stats: { speed: 2 },
    slot: "boots"
  },

  // === AGE ===
  "age.stone": {
    startResources: {
      "resource.wood": 10,
      "resource.stone": 5,
      "resource.food": 10,
      "resource.flint": 3,
      "resource.tool": 0,
      "resource.leather": 0
    }
  },
  "age.bronze": {
    startResources: {
      "resource.copper": 0,
      "resource.tin": 0,
      "resource.bronze": 0
    },
    advanceFrom: {
      age: "age.stone",
      resources: {
        "resource.tool": 10,
        "resource.food": 50
      },
      buildings: {
        "building.wood_cutter": 3,
        "building.stone_quarry": 2
      }
    }
  },

  // === BRONZE AGE RESOURCE NODES ===
  "node.copper_deposit": {
    hp: 6,
    rewards: { "resource.copper": 3 },
    respawnTime: 50
  },
  "node.tin_deposit": {
    hp: 5,
    rewards: { "resource.tin": 2 },
    respawnTime: 55
  },

  // === BRONZE AGE ANIMALS ===
  "animal.lion": {
    hp: 60,
    attack: 12,
    defense: 5,
    rewards: { "resource.food": 25, "resource.leather": 8 },
    respawnTime: 150,
    aggroRange: 3.5
  },

  // === BRONZE AGE BUILDINGS ===
  "building.copper_mine": {
    cost: { "resource.wood": 30, "resource.stone": 20 },
    searchRadius: { 1: 5, 2: 8 },
    workerCount: { 1: 1, 2: 2 },
    storageCapacity: { 1: 30, 2: 60 },
    productionSpeed: { 1: 1.0, 2: 1.2 },
    produces: { "resource.copper": 1 },
    upgrades: {
      2: { cost: { "resource.wood": 60, "resource.stone": 40, "resource.copper": 10 }, productionMultiplier: 1.5 }
    }
  },
  "building.tin_mine": {
    cost: { "resource.wood": 35, "resource.stone": 25, "resource.copper": 5 },
    searchRadius: { 1: 5, 2: 8 },
    workerCount: { 1: 1, 2: 2 },
    storageCapacity: { 1: 25, 2: 50 },
    productionSpeed: { 1: 1.0, 2: 1.2 },
    produces: { "resource.tin": 1 },
    upgrades: {
      2: { cost: { "resource.wood": 70, "resource.stone": 50, "resource.tin": 10 }, productionMultiplier: 1.5 }
    }
  },
   "building.smelter": {
    cost: { "resource.stone": 40, "resource.copper": 10, "resource.tin": 5 },
    searchRadius: { 1: 0, 2: 0 },  // No gathering - processes resources
    workerCount: { 1: 1, 2: 2 },    // Workers process materials
    storageCapacity: { 1: 20, 2: 40 },
    productionSpeed: { 1: 1.0, 2: 1.2 },
    produces: { "resource.bronze": 1 },
    consumesPerTick: { "resource.copper": 2, "resource.tin": 1 },
    upgrades: {
      2: { cost: { "resource.stone": 80, "resource.bronze": 15 }, productionMultiplier: 1.5 }
    }
  },

  // === BRONZE AGE RECIPES ===
  "recipe.bronze_sword": {
    input: { "resource.bronze": 5, "resource.wood": 3 },
    output: { "equipment.bronze_sword": 1 }
  },
  "recipe.bronze_shield": {
    input: { "resource.bronze": 5, "resource.wood": 4 },
    output: { "equipment.bronze_shield": 1 }
  },
  "recipe.bronze_armor": {
    input: { "resource.bronze": 8, "resource.leather": 3 },
    output: { "equipment.bronze_armor": 1 }
  },

  // === BRONZE AGE EQUIPMENT ===
  "equipment.bronze_sword": {
    stats: { attack: 10 },
    slot: "weapon"
  },
  "equipment.bronze_shield": {
    stats: { defense: 6 },
    slot: "offhand"
  },
  "equipment.bronze_armor": {
    stats: { defense: 10, maxHp: 20 },
    slot: "armor"
  },

  // === TECHNOLOGIES ===
  "tech.advanced_tools": {
    researchCost: { "resource.tool": 10, "resource.wood": 20 },
    effects: { harvestSpeedBonus: 0.20 }
  },
  "tech.efficient_gathering": {
    researchCost: { "resource.food": 30, "resource.stone": 15 },
    requires: ["tech.advanced_tools"],
    effects: { productionBonus: 0.15 }
  },
  "tech.expanded_storage": {
    researchCost: { "resource.wood": 40, "resource.stone": 30 },
    effects: { storageBonus: 0.30 }
  },
  "tech.swift_workers": {
    researchCost: { "resource.food": 25, "resource.leather": 10 },
    effects: { npcSpeedBonus: 0.25 }
  },

  // === IRON AGE ===
  "age.iron": {
    startResources: { "resource.wood": 20, "resource.stone": 15, "resource.bronze": 10, "resource.food": 30 },
    advanceFrom: {
      age: "age.bronze",
      resources: { "resource.bronze": 20, "resource.food": 100, "resource.tool": 20 },
      buildings: { "building.smelter": 2, "building.copper_mine": 2, "building.tin_mine": 1 }
    }
  },

  // === IRON AGE RESOURCE NODES ===
  "node.iron_deposit": {
    hp: 10,
    rewards: { "resource.iron": 3 },
    respawnTime: 80
  },
  "node.coal_deposit": {
    hp: 7,
    rewards: { "resource.coal": 4 },
    respawnTime: 65
  },

  // === IRON AGE ANIMALS ===
  "animal.bandit": {
    hp: 80,
    attack: 15,
    defense: 8,
    rewards: { "resource.food": 30, "resource.leather": 10, "resource.bronze": 3 },
    respawnTime: 180,
    aggroRange: 4
  },
  "animal.sabertooth": {
    hp: 120,
    attack: 20,
    defense: 10,
    rewards: { "resource.food": 50, "resource.leather": 20 },
    respawnTime: 240,
    aggroRange: 4
  },

  // === IRON AGE BUILDINGS ===
  "building.iron_mine": {
    cost: { "resource.wood": 50, "resource.stone": 40, "resource.bronze": 5 },
    searchRadius: { 1: 6, 2: 10, 3: 15 },
    workerCount: { 1: 2, 2: 3, 3: 4 },
    storageCapacity: { 1: 40, 2: 80, 3: 150 },
    productionSpeed: { 1: 1.0, 2: 1.3, 3: 1.6 },
    produces: { "resource.iron": 2 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 100, "resource.stone": 80, "resource.iron": 15 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.stone": 150, "resource.iron": 40, "resource.coal": 20 }, productionMultiplier: 2.0 }
    }
  },
  "building.coal_mine": {
    cost: { "resource.wood": 45, "resource.stone": 50, "resource.iron": 5 },
    searchRadius: { 1: 6, 2: 10, 3: 15 },
    workerCount: { 1: 2, 2: 3, 3: 4 },
    storageCapacity: { 1: 50, 2: 100, 3: 180 },
    productionSpeed: { 1: 1.0, 2: 1.3, 3: 1.6 },
    produces: { "resource.coal": 2 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 90, "resource.stone": 100, "resource.coal": 20 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.stone": 150, "resource.coal": 50, "resource.iron": 30 }, productionMultiplier: 2.0 }
    }
  },
  "building.blast_furnace": {
    cost: { "resource.stone": 80, "resource.bronze": 20, "resource.iron": 10 },
    searchRadius: { 1: 0, 2: 0, 3: 0 },  // No gathering - smelting building
    workerCount: { 1: 2, 2: 3, 3: 4 },
    storageCapacity: { 1: 30, 2: 60, 3: 120 },
    productionSpeed: { 1: 1.0, 2: 1.4, 3: 1.8 },
    produces: { "resource.iron": 3 },  // Produces refined iron (higher than mine's +2)
    // NO consumesPerTick - this is a smelter that refines raw iron from mines into purer iron
    // Lore: Uses coal/heat to purify iron ore into usable metal
    upgrades: {
      2: { cost: { "resource.stone": 150, "resource.iron": 40 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.iron": 80, "resource.coal": 50 }, productionMultiplier: 2.0 }
    }
  },
  "building.blacksmith": {
    cost: { "resource.wood": 60, "resource.stone": 50, "resource.iron": 15 },
    searchRadius: { 1: 0 },
    workerCount: { 1: 0 },
    storageCapacity: { 1: 100 },
    productionSpeed: { 1: 1.0 },
    produces: {}
  },

  // === IRON AGE RECIPES ===
  "recipe.iron_sword": {
    input: { "resource.iron": 8, "resource.wood": 5, "resource.coal": 3 },
    output: { "equipment.iron_sword": 1 }
  },
  "recipe.iron_shield": {
    input: { "resource.iron": 10, "resource.wood": 6, "resource.leather": 3 },
    output: { "equipment.iron_shield": 1 }
  },
  "recipe.iron_armor": {
    input: { "resource.iron": 15, "resource.leather": 5, "resource.coal": 5 },
    output: { "equipment.iron_armor": 1 }
  },
  "recipe.iron_boots": {
    input: { "resource.iron": 6, "resource.leather": 4 },
    output: { "equipment.iron_boots": 1 }
  },

  // === IRON AGE EQUIPMENT ===
  "equipment.iron_sword": {
    stats: { attack: 15 },
    slot: "weapon"
  },
  "equipment.iron_shield": {
    stats: { defense: 10 },
    slot: "offhand"
  },
  "equipment.iron_armor": {
    stats: { defense: 15, maxHp: 30 },
    slot: "armor"
  },
  "equipment.iron_boots": {
    stats: { speed: 3, defense: 3 },
    slot: "boots"
  },

  // === IRON AGE TECHNOLOGIES ===
  "tech.iron_working": {
    researchCost: { "resource.iron": 20, "resource.coal": 15 },
    requires: ["tech.efficient_gathering"],
    effects: { productionBonus: 0.10 }
  },
  "tech.coal_power": {
    researchCost: { "resource.coal": 30, "resource.iron": 15 },
    requires: ["tech.swift_workers"],
    effects: { harvestSpeedBonus: 0.30 }
  },
  "tech.fortification": {
    researchCost: { "resource.stone": 100, "resource.iron": 30, "resource.bronze": 20 },
    requires: ["tech.expanded_storage"],
    effects: { storageBonus: 0.50 }
  }
};
