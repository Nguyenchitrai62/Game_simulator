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
    respawnTime: 60
  },
  "animal.boar": {
    hp: 20,
    attack: 5,
    defense: 2,
    rewards: { "resource.food": 8, "resource.leather": 2 },
    respawnTime: 90
  },
  "animal.bear": {
    hp: 40,
    attack: 8,
    defense: 3,
    rewards: { "resource.food": 15, "resource.leather": 5 },
    respawnTime: 120
  },

  // === BUILDINGS ===
  "building.wood_cutter": {
    cost: { "resource.wood": 10 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    produces: { "resource.wood": 2 },
    upgrades: {
      2: { cost: { "resource.wood": 30, "resource.stone": 10 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 80, "resource.stone": 30, "resource.flint": 10 }, productionMultiplier: 2.0 }
    }
  },
  "building.stone_quarry": {
    cost: { "resource.wood": 15, "resource.stone": 5 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    produces: { "resource.stone": 1 },
    upgrades: {
      2: { cost: { "resource.wood": 40, "resource.stone": 20 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 100, "resource.stone": 50, "resource.flint": 15 }, productionMultiplier: 2.0 }
    }
  },
  "building.berry_gatherer": {
    cost: { "resource.wood": 8 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    produces: { "resource.food": 2 },
    upgrades: {
      2: { cost: { "resource.wood": 25, "resource.food": 15 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 60, "resource.food": 40, "resource.flint": 5 }, productionMultiplier: 2.0 }
    }
  },
  "building.flint_mine": {
    cost: { "resource.wood": 20, "resource.stone": 10 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    produces: { "resource.flint": 1 },
    upgrades: {
      2: { cost: { "resource.wood": 50, "resource.stone": 30 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 120, "resource.stone": 60, "resource.flint": 20 }, productionMultiplier: 2.0 }
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
    respawnTime: 150
  },

  // === BRONZE AGE BUILDINGS ===
  "building.copper_mine": {
    cost: { "resource.wood": 30, "resource.stone": 20 },
    searchRadius: { 1: 5, 2: 8 },
    workerCount: { 1: 1, 2: 2 },
    produces: { "resource.copper": 1 },
    upgrades: {
      2: { cost: { "resource.wood": 60, "resource.stone": 40, "resource.copper": 10 }, productionMultiplier: 1.5 }
    }
  },
  "building.tin_mine": {
    cost: { "resource.wood": 35, "resource.stone": 25, "resource.copper": 5 },
    searchRadius: { 1: 5, 2: 8 },
    workerCount: { 1: 1, 2: 2 },
    produces: { "resource.tin": 1 },
    upgrades: {
      2: { cost: { "resource.wood": 70, "resource.stone": 50, "resource.tin": 10 }, productionMultiplier: 1.5 }
    }
  },
  "building.smelter": {
    cost: { "resource.stone": 40, "resource.copper": 10, "resource.tin": 5 },
    searchRadius: { 1: 0, 2: 0 },  // No gathering - processes resources
    workerCount: { 1: 1, 2: 2 },    // Workers process materials
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
  }
};
