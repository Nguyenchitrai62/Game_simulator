window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["base_stone_age"] = {
  packId: "base_stone_age",
  name: "Stone Age",
  entities: [
    // === AGES ===
    {
      id: "age.stone",
      type: "age",
      name: "Stone Age",
      description: "The dawn of civilization."
    },

    // === RESOURCES ===
    {
      id: "resource.wood",
      type: "resource",
      name: "Wood",
      description: "Basic building material.",
      visual: { color: 0x8B4513 },
      unlock: { age: "age.stone" }
    },
    {
      id: "resource.stone",
      type: "resource",
      name: "Stone",
      description: "Hard rock for tools.",
      visual: { color: 0x808080 },
      unlock: { age: "age.stone" }
    },
    {
      id: "resource.food",
      type: "resource",
      name: "Food",
      description: "Sustains your people.",
      visual: { color: 0xcc3333 },
      unlock: { age: "age.stone" }
    },
    {
      id: "resource.flint",
      type: "resource",
      name: "Flint",
      description: "Sharp stone for crafting.",
      visual: { color: 0x4a4a4a },
      unlock: { age: "age.stone" }
    },
    {
      id: "resource.tool",
      type: "resource",
      name: "Tool",
      description: "Improves gathering efficiency.",
      visual: { color: 0xA0A0A0 },
      unlock: { age: "age.stone" }
    },
    {
      id: "resource.leather",
      type: "resource",
      name: "Leather",
      description: "Tanned hide for armor.",
      visual: { color: 0x8B6914 },
      unlock: { age: "age.stone" }
    },

    // === RESOURCE NODES (world objects) ===
    {
      id: "node.tree",
      type: "resource_node",
      name: "Tree",
      description: "Chop for wood.",
      visual: { shape: "tree", color: 0x2d5a27, scale: 1.0 },
      unlock: { age: "age.stone" }
    },
    {
      id: "node.rock",
      type: "resource_node",
      name: "Rock",
      description: "Mine for stone and flint.",
      visual: { shape: "rock", color: 0x808080, scale: 1.0 },
      unlock: { age: "age.stone" }
    },
    {
      id: "node.berry_bush",
      type: "resource_node",
      name: "Berry Bush",
      description: "Gather for food.",
      visual: { shape: "bush", color: 0x3a7a2e, scale: 1.0 },
      unlock: { age: "age.stone" }
    },
    {
      id: "node.flint_deposit",
      type: "resource_node",
      name: "Flint Deposit",
      description: "Mine for flint.",
      visual: { shape: "flint", color: 0x4a4a4a, scale: 1.0 },
      unlock: { age: "age.stone" }
    },

    // === ANIMALS ===
    {
      id: "animal.wolf",
      type: "animal",
      name: "Wolf",
      description: "A wild wolf. Drops food.",
      visual: { shape: "wolf", color: 0x808080, scale: 0.6 },
      unlock: { age: "age.stone" }
    },
    {
      id: "animal.boar",
      type: "animal",
      name: "Boar",
      description: "A tough boar. Drops food and leather.",
      visual: { shape: "boar", color: 0x8B6914, scale: 0.7 },
      unlock: { age: "age.stone" }
    },
    {
      id: "animal.bear",
      type: "animal",
      name: "Bear",
      description: "A fearsome bear. Great rewards.",
      visual: { shape: "bear", color: 0x5C4033, scale: 0.8 },
      unlock: { age: "age.stone" }
    },

    // === BUILDINGS ===
    {
      id: "building.wood_cutter",
      type: "building",
      name: "Wood Cutter",
      description: "Auto-gathers wood.",
      visual: { shape: "building", color: 0x8B4513, roofColor: 0x2d5a27, scale: 1.0 },
      unlock: { age: "age.stone" }
    },
    {
      id: "building.stone_quarry",
      type: "building",
      name: "Stone Quarry",
      description: "Auto-mines stone.",
      visual: { shape: "building", color: 0x808080, roofColor: 0x4a4a4a, scale: 1.0 },
      unlock: { age: "age.stone", buildings: { "building.wood_cutter": 1 } }
    },
    {
      id: "building.berry_gatherer",
      type: "building",
      name: "Berry Gatherer",
      description: "Auto-gathers food.",
      visual: { shape: "building", color: 0x3a7a2e, roofColor: 0x8B4513, scale: 1.0 },
      unlock: { age: "age.stone" }
    },
    {
      id: "building.flint_mine",
      type: "building",
      name: "Flint Mine",
      description: "Auto-mines flint.",
      visual: { shape: "building", color: 0x4a4a4a, roofColor: 0x808080, scale: 1.0 },
      unlock: { age: "age.stone", buildings: { "building.stone_quarry": 1 } }
    },

    // === EQUIPMENT ===
    {
      id: "equipment.wooden_sword",
      type: "equipment",
      name: "Wooden Sword",
      description: "+3 Attack. A basic weapon.",
      visual: { color: 0x8B4513 },
      slot: "weapon",
      unlock: { age: "age.stone", resources: { "resource.flint": 3 } }
    },
    {
      id: "equipment.stone_spear",
      type: "equipment",
      name: "Stone Spear",
      description: "+6 Attack. A deadly spear.",
      visual: { color: 0xA0A0A0 },
      slot: "weapon",
      unlock: { age: "age.stone", resources: { "resource.tool": 3 } }
    },
    {
      id: "equipment.stone_shield",
      type: "equipment",
      name: "Stone Shield",
      description: "+3 Defense.",
      visual: { color: 0x808080 },
      slot: "offhand",
      unlock: { age: "age.stone", resources: { "resource.stone": 10 }, buildings: { "building.stone_quarry": 1 } }
    },
    {
      id: "equipment.leather_armor",
      type: "equipment",
      name: "Leather Armor",
      description: "+5 Defense, +10 Max HP.",
      visual: { color: 0x8B6914 },
      slot: "armor",
      unlock: { age: "age.stone", resources: { "resource.leather": 3 } }
    },
    {
      id: "equipment.leather_boots",
      type: "equipment",
      name: "Leather Boots",
      description: "+2 Speed.",
      visual: { color: 0x8B4513 },
      slot: "boots",
      unlock: { age: "age.stone", resources: { "resource.leather": 3 } }
    },

    // === RECIPES ===
    {
      id: "recipe.stone_tool",
      type: "recipe",
      name: "Stone Tool",
      description: "Craft a basic tool.",
      unlock: { age: "age.stone" }
    },
    {
      id: "recipe.wooden_sword",
      type: "recipe",
      name: "Wooden Sword",
      description: "Craft a wooden sword. +3 ATK.",
      unlock: { age: "age.stone" }
    },
    {
      id: "recipe.stone_spear",
      type: "recipe",
      name: "Stone Spear",
      description: "Craft a stone spear. +6 ATK.",
      unlock: { age: "age.stone", resources: { "resource.tool": 3 }, buildings: { "building.flint_mine": 1 } }
    },
    {
      id: "recipe.stone_shield",
      type: "recipe",
      name: "Stone Shield",
      description: "Craft a stone shield. +3 DEF.",
      unlock: { age: "age.stone", resources: { "resource.stone": 10 }, buildings: { "building.stone_quarry": 1 } }
    },
    {
      id: "recipe.leather_armor",
      type: "recipe",
      name: "Leather Armor",
      description: "Craft leather armor. +5 DEF, +10 HP.",
      unlock: { age: "age.stone", resources: { "resource.leather": 3 } }
    },
    {
      id: "recipe.leather_boots",
      type: "recipe",
      name: "Leather Boots",
      description: "Craft leather boots. +2 Speed.",
      unlock: { age: "age.stone", resources: { "resource.leather": 3 } }
    }
  ]
};
