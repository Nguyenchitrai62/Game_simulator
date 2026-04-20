window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_boss_frontier"] = {
  packId: "expansion_boss_frontier",
  name: "Boss Frontier",
  entities: [
    {
      id: "animal.moonfang_alpha",
      type: "animal",
      name: "Moonfang Alpha",
      description: "A legendary dire wolf that rules a moonlit hunting ground.",
      visual: { color: 0x9bbcff, scale: 1.3 },
      unlock: { age: "age.stone" }
    },
    {
      id: "animal.sunscale_lion",
      type: "animal",
      name: "Sunscale Lion",
      description: "A bronze-age apex lion that guards a blazing pride territory.",
      visual: { color: 0xd9a24e, scale: 1.4 },
      unlock: { age: "age.bronze" }
    },
    {
      id: "animal.stormhide_sabertooth",
      type: "animal",
      name: "Stormhide Sabertooth",
      description: "A brutal sabertooth whose lair holds a relic weapon.",
      visual: { color: 0x79d6c5, scale: 1.5 },
      unlock: { age: "age.iron" }
    },
    {
      id: "equipment.moonfang_blade",
      type: "equipment",
      name: "Moonfang Blade",
      description: "A boss relic blade that turns melee fights into burst windows.",
      visual: { color: 0xb7d8ff },
      slot: "weapon",
      unlock: { age: "age.stone" }
    },
    {
      id: "equipment.sunpiercer_bow",
      type: "equipment",
      name: "Sunpiercer Bow",
      description: "A radiant bow that keeps dangerous enemies under ranged pressure.",
      visual: { color: 0xffcc66 },
      slot: "weapon",
      unlock: { age: "age.bronze" }
    },
    {
      id: "equipment.stormspine_glaive",
      type: "equipment",
      name: "Stormspine Glaive",
      description: "A late-game relic polearm with reach, burst, and boss-killing power.",
      visual: { color: 0x7ef0d0 },
      slot: "weapon",
      unlock: { age: "age.iron" }
    },
    {
      id: "building.armory",
      type: "building",
      name: "Armory",
      description: "An optional military support hall that improves reserve training and field readiness.",
      visual: { shape: "building", color: 0x6c5842, roofColor: 0x36404a, scale: 1.05 },
      unlock: { age: "age.iron", buildings: { "building.barracks": 1, "building.blacksmith": 1 } }
    },
    {
      id: "site.ruined_outpost",
      type: "world_site",
      name: "Ruined Outpost",
      description: "A collapsed frontier outpost with immediate salvage inside.",
      visual: { color: 0x9b7b53, scale: 1.0 },
      unlock: { age: "age.stone" }
    }
  ]
};