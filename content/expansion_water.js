window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_water"] = {
  packId: "expansion_water",
  name: "Water & Bridges",
  entities: [
    {
      id: "building.well",
      type: "building",
      name: "Well",
      description: "Provides clean water for nearby farm plots and a small steady food income.",
      visual: { shape: "well", color: 0x6B8E9B, roofColor: 0x4682B4, scale: 0.8 },
      unlock: { age: "age.stone", resources: { "resource.stone": 10, "resource.wood": 5 } }
    },
    {
      id: "building.bridge",
      type: "building",
      name: "Bridge",
      description: "Cross rivers and shallow water safely.",
      visual: { shape: "bridge", color: 0x8B4513, roofColor: 0x654321, scale: 1.0 },
      unlock: { age: "age.stone", resources: { "resource.wood": 15, "resource.stone": 5 } }
    }
  ]
};