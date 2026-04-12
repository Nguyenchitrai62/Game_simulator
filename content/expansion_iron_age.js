/**
 * expansion_iron_age.js
 * Iron Age content pack - extends Bronze Age with iron tools, coal, new animals, and technologies
 */

window.GAME_CONTENT = window.GAME_CONTENT || {};
window.GAME_CONTENT["expansion_iron_age"] = {
  packId: "expansion_iron_age",
  name: "Iron Age Expansion",
  description: "Unlock the power of iron: new resources, dangerous enemies, and powerful equipment.",
  version: "2.0.0",
  
  entities: [
    // === AGE ===
    {
      id: "age.iron",
      type: "age",
      name: "Iron Age",
      description: "The age of iron smelting and advanced civilization.",
      unlock: {
        age: "age.bronze",
        resources: { "resource.bronze": 20, "resource.food": 100, "resource.tool": 20 },
        buildings: { "building.smelter": 2, "building.copper_mine": 2, "building.tin_mine": 1 }
      }
    },

    // === RESOURCES ===
    {
      id: "resource.iron",
      type: "resource",
      name: "Iron",
      description: "Strong metal for advanced tools and weapons.",
      unlock: { age: "age.iron" }
    },
    {
      id: "resource.coal",
      type: "resource",
      name: "Coal",
      description: "Fuel for high-temperature smelting.",
      unlock: { age: "age.iron" }
    },

    // === RESOURCE NODES ===
    {
      id: "node.iron_deposit",
      type: "resource_node",
      name: "Iron Deposit",
      description: "Mine for iron ore.",
      visual: { shape: "rock", color: 0x8B7355 },
      unlock: { age: "age.iron" }
    },
    {
      id: "node.coal_deposit",
      type: "resource_node",
      name: "Coal Deposit",
      description: "Mine for coal.",
      visual: { shape: "rock", color: 0x2F2F2F },
      unlock: { age: "age.iron" }
    },

    // === ANIMALS ===
    {
      id: "animal.bandit",
      type: "animal",
      name: "Bandit",
      description: "Hostile human outlaws.",
      visual: { shape: "bandit", color: 0x8B4513 },
      unlock: { age: "age.iron" }
    },
    {
      id: "animal.sabertooth",
      type: "animal",
      name: "Sabertooth Tiger",
      description: "Apex predator of the ice age.",
      visual: { shape: "bear", color: 0xF4A460 },
      unlock: { age: "age.iron" }
    },

    // === BUILDINGS ===
    {
      id: "building.iron_mine",
      type: "building",
      name: "Iron Mine",
      description: "Gather iron ore from deposits.",
      visual: { shape: "building", color: 0x8B7355, roofColor: 0x5C4033 },
      unlock: { age: "age.iron" }
    },
    {
      id: "building.coal_mine",
      type: "building",
      name: "Coal Mine",
      description: "Gather coal for smelting.",
      visual: { shape: "building", color: 0x3E3E3E, roofColor: 0x2A2A2A },
      unlock: { age: "age.iron", buildings: { "building.iron_mine": 1 } }
    },
    {
      id: "building.blast_furnace",
      type: "building",
      name: "Blast Furnace",
      description: "Smelt iron using coal. Produces iron ingots.",
      visual: { shape: "building", color: 0x654321, roofColor: 0x8B4513 },
      unlock: { age: "age.iron", buildings: { "building.coal_mine": 1 } }
    },
    {
      id: "building.blacksmith",
      type: "building",
      name: "Blacksmith",
      description: "Craft advanced iron equipment.",
      visual: { shape: "building", color: 0x4A4A4A, roofColor: 0x696969 },
      unlock: { age: "age.iron", resources: { "resource.iron": 10 } }
    },

    // === EQUIPMENT ===
    {
      id: "equipment.iron_sword",
      type: "equipment",
      name: "Iron Sword",
      description: "+15 ATK - Powerful iron blade.",
      slot: "weapon",
      unlock: { age: "age.iron", buildings: { "building.blacksmith": 1 } }
    },
    {
      id: "equipment.iron_shield",
      type: "equipment",
      name: "Iron Shield",
      description: "+10 DEF - Heavy iron shield.",
      slot: "offhand",
      unlock: { age: "age.iron", buildings: { "building.blacksmith": 1 } }
    },
    {
      id: "equipment.iron_armor",
      type: "equipment",
      name: "Iron Armor",
      description: "+15 DEF, +30 HP - Full iron plate.",
      slot: "armor",
      unlock: { age: "age.iron", resources: { "resource.iron": 20 } }
    },
    {
      id: "equipment.iron_boots",
      type: "equipment",
      name: "Iron Boots",
      description: "+3 Speed, +3 DEF - Iron greaves.",
      slot: "boots",
      unlock: { age: "age.iron" }
    },

    // === RECIPES ===
    {
      id: "recipe.iron_sword",
      type: "recipe",
      name: "Iron Sword",
      description: "Forge an iron sword.",
      unlock: { age: "age.iron", buildings: { "building.blacksmith": 1 } }
    },
    {
      id: "recipe.iron_shield",
      type: "recipe",
      name: "Iron Shield",
      description: "Forge an iron shield.",
      unlock: { age: "age.iron", buildings: { "building.blacksmith": 1 } }
    },
    {
      id: "recipe.iron_armor",
      type: "recipe",
      name: "Iron Armor",
      description: "Forge iron armor.",
      unlock: { age: "age.iron", resources: { "resource.iron": 20 } }
    },
    {
      id: "recipe.iron_boots",
      type: "recipe",
      name: "Iron Boots",
      description: "Forge iron boots.",
      unlock: { age: "age.iron" }
    },

    // === TECHNOLOGIES (TIER 2) ===
    {
      id: "tech.iron_working",
      type: "technology",
      name: "Iron Working",
      description: "Unlock iron smelting. Production +10%.",
      unlock: { age: "age.iron", buildings: { "building.blast_furnace": 1 } }
    },
    {
      id: "tech.coal_power",
      type: "technology",
      name: "Coal Power",
      description: "Coal-powered machinery. Workers 30% faster.",
      unlock: { age: "age.iron", resources: { "resource.coal": 20 } }
    },
    {
      id: "tech.fortification",
      type: "technology",
      name: "Fortification",
      description: "Advanced defenses. Storage +50%.",
      unlock: { age: "age.iron", buildings: { "building.barracks": 1 } }
    }
  ]
};
