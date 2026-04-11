window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_bronze_age"] = {
  packId: "expansion_bronze_age",
  name: "Bronze Age Expansion",
  entities: [
    // === AGES ===
    {
      id: "age.bronze",
      type: "age",
      name: "Bronze Age",
      description: "The age of metal. Forge bronze tools and weapons."
    },

    // === NEW RESOURCES ===
    {
      id: "resource.copper",
      type: "resource",
      name: "Copper",
      description: "A soft metal ore.",
      visual: { color: 0xB87333 },
      unlock: { age: "age.bronze" }
    },
    {
      id: "resource.tin",
      type: "resource",
      name: "Tin",
      description: "Combine with copper for bronze.",
      visual: { color: 0xC0C0C0 },
      unlock: { age: "age.bronze" }
    },
    {
      id: "resource.bronze",
      type: "resource",
      name: "Bronze",
      description: "A strong alloy.",
      visual: { color: 0xCD7F32 },
      unlock: { age: "age.bronze" }
    },

    // === NEW RESOURCE NODES ===
    {
      id: "node.copper_deposit",
      type: "resource_node",
      name: "Copper Deposit",
      description: "Mine for copper ore.",
      visual: { shape: "rock", color: 0xB87333, scale: 1.0 },
      unlock: { age: "age.bronze" }
    },
    {
      id: "node.tin_deposit",
      type: "resource_node",
      name: "Tin Deposit",
      description: "Mine for tin ore.",
      visual: { shape: "rock", color: 0xC0C0C0, scale: 0.8 },
      unlock: { age: "age.bronze" }
    },

    // === NEW ANIMALS ===
    {
      id: "animal.lion",
      type: "animal",
      name: "Lion",
      description: "A fearsome predator. Great rewards.",
      visual: { shape: "bear", color: 0xC4A24E, scale: 0.8 },
      unlock: { age: "age.bronze" }
    },

    // === NEW BUILDINGS ===
    {
      id: "building.copper_mine",
      type: "building",
      name: "Copper Mine",
      description: "Auto-mines copper.",
      visual: { shape: "building", color: 0xB87333, roofColor: 0x8B4513, scale: 1.0 },
      unlock: { age: "age.bronze", resources: { "resource.copper": 5 } }
    },
    {
      id: "building.tin_mine",
      type: "building",
      name: "Tin Mine",
      description: "Auto-mines tin.",
      visual: { shape: "building", color: 0xC0C0C0, roofColor: 0x808080, scale: 1.0 },
      unlock: { age: "age.bronze", resources: { "resource.tin": 5 }, buildings: { "building.copper_mine": 1 } }
    },
    {
      id: "building.smelter",
      type: "building",
      name: "Bronze Smelter",
      description: "Converts copper + tin into bronze.",
      visual: { shape: "building", color: 0xCD7F32, roofColor: 0x4a4a4a, scale: 1.2 },
      unlock: { age: "age.bronze", resources: { "resource.copper": 10, "resource.tin": 10 }, buildings: { "building.copper_mine": 2 } }
    },

    // === NEW EQUIPMENT ===
    {
      id: "equipment.bronze_sword",
      type: "equipment",
      name: "Bronze Sword",
      description: "+10 Attack. A deadly bronze blade.",
      visual: { color: 0xCD7F32 },
      slot: "weapon",
      unlock: { age: "age.bronze", resources: { "resource.bronze": 5 } }
    },
    {
      id: "equipment.bronze_shield",
      type: "equipment",
      name: "Bronze Shield",
      description: "+6 Defense. Sturdy bronze protection.",
      visual: { color: 0xCD7F32 },
      slot: "offhand",
      unlock: { age: "age.bronze", resources: { "resource.bronze": 5 }, buildings: { "building.smelter": 1 } }
    },
    {
      id: "equipment.bronze_armor",
      type: "equipment",
      name: "Bronze Armor",
      description: "+10 Defense, +20 Max HP.",
      visual: { color: 0xCD7F32 },
      slot: "armor",
      unlock: { age: "age.bronze", resources: { "resource.bronze": 10 }, buildings: { "building.smelter": 2 } }
    },

    // === NEW RECIPES ===
    {
      id: "recipe.bronze_sword",
      type: "recipe",
      name: "Bronze Sword",
      description: "Forge a bronze sword. +10 ATK.",
      unlock: { age: "age.bronze", resources: { "resource.bronze": 5 }, buildings: { "building.smelter": 1 } }
    },
    {
      id: "recipe.bronze_shield",
      type: "recipe",
      name: "Bronze Shield",
      description: "Forge a bronze shield. +6 DEF.",
      unlock: { age: "age.bronze", resources: { "resource.bronze": 5 }, buildings: { "building.smelter": 1 } }
    },
    {
      id: "recipe.bronze_armor",
      type: "recipe",
      name: "Bronze Armor",
      description: "Forge bronze armor. +10 DEF, +20 HP.",
      unlock: { age: "age.bronze", resources: { "resource.bronze": 10 }, buildings: { "building.smelter": 2 } }
    }
  ]
};
