window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_ranged_weapons"] = {
  packId: "expansion_ranged_weapons",
  name: "Ranged Weapons",
  entities: [
    {
      id: "equipment.hunting_bow",
      type: "equipment",
      name: "Hunting Bow",
      description: "A safer ranged weapon for keeping pressure on dangerous animals.",
      visual: { color: 0x8c6a3b },
      slot: "weapon",
      unlock: { age: "age.stone", resources: { "resource.wood": 12, "resource.flint": 2 }, buildings: { "building.berry_gatherer": 1 } }
    },
    {
      id: "recipe.hunting_bow",
      type: "recipe",
      name: "Hunting Bow",
      description: "Craft a hunting bow for ranged combat.",
      unlock: { age: "age.stone", resources: { "resource.wood": 12, "resource.flint": 2 }, buildings: { "building.berry_gatherer": 1 } }
    },
    {
      id: "equipment.bronze_bow",
      type: "equipment",
      name: "Bronze Bow",
      description: "A stronger bow that keeps bronze-age threats at range.",
      visual: { color: 0xb8833a },
      slot: "weapon",
      unlock: { age: "age.bronze", resources: { "resource.bronze": 5 }, buildings: { "building.smelter": 1 } }
    },
    {
      id: "recipe.bronze_bow",
      type: "recipe",
      name: "Bronze Bow",
      description: "Craft a bronze bow for stronger ranged volleys.",
      unlock: { age: "age.bronze", resources: { "resource.bronze": 5 }, buildings: { "building.smelter": 1 } }
    },
    {
      id: "equipment.iron_longbow",
      type: "equipment",
      name: "Iron Longbow",
      description: "A disciplined longbow for high-pressure ranged fights.",
      visual: { color: 0x7d8496 },
      slot: "weapon",
      unlock: { age: "age.iron", buildings: { "building.blacksmith": 1 } }
    },
    {
      id: "recipe.iron_longbow",
      type: "recipe",
      name: "Iron Longbow",
      description: "Craft an iron longbow for safer late-game skirmishing.",
      unlock: { age: "age.iron", buildings: { "building.blacksmith": 1 } }
    }
  ]
};