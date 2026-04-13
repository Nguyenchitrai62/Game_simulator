window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_water"] = {
  packId: "expansion_water",
  name: "Water & Bridges",
  entities: [
    {
      id: "building.well",
      type: "building",
      name: "Giếng nước",
      description: "Cung cấp nguồn nước sạch, tăng sản lượng Food.",
      visual: { shape: "building", color: 0x6B8E9B, roofColor: 0x4682B4, scale: 0.7 },
      unlock: { age: "age.stone", resources: { "resource.stone": 10, "resource.wood": 5 } }
    },
    {
      id: "building.bridge",
      type: "building",
      name: "Cầu",
      description: "Xây qua sông để đi qua nước.",
      visual: { shape: "bridge", color: 0x8B4513, roofColor: 0x654321, scale: 1.0 },
      unlock: { age: "age.stone", resources: { "resource.wood": 15, "resource.stone": 5 } }
    }
  ]
};