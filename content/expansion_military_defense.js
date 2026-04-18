window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_military_defense"] = {
  packId: "expansion_military_defense",
  name: "Military Defense",
  entities: [
    {
      id: "building.watchtower",
      type: "building",
      name: "Watchtower",
      description: "A raised defense post that shoots nearby beasts and covers exposed workers.",
      visual: { shape: "watchtower", color: 0x7B5A3A, roofColor: 0x5B2C22, scale: 1.0 },
      unlock: {
        age: "age.stone",
        buildings: { "building.barracks": 1 },
        resources: { "resource.wood": 40, "resource.stone": 25 }
      }
    }
  ]
};