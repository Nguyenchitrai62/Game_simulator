window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_military_upgrades"] = {
  packId: "expansion_military_upgrades",
  name: "Military Upgrades",
  entities: [
    {
      id: "tech.military_drills",
      type: "technology",
      name: "Military Drills",
      description: "Barracks troops hit harder and move faster.",
      unlock: {
        age: "age.stone",
        buildings: { "building.barracks": 1 },
        resources: { "resource.food": 35, "resource.tool": 6 }
      }
    },
    {
      id: "tech.barracks_logistics",
      type: "technology",
      name: "Barracks Logistics",
      description: "Barracks trains troops faster and deployed units attack more often.",
      unlock: {
        age: "age.bronze",
        buildings: { "building.barracks": 1 },
        resources: { "resource.bronze": 8, "resource.food": 55 }
      }
    }
  ]
};