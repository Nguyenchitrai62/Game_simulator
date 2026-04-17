window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_tree_farming"] = {
  packId: "expansion_tree_farming",
  name: "Tree Farming",
  entities: [
    {
      id: "building.tree_nursery",
      type: "building",
      name: "Tree Nursery",
      description: "Sapling beds that resident workers replant into renewable wood.",
      visual: { shape: "farm_plot", color: 0x5F4B2A, roofColor: 0x4F7B2C, scale: 1.0 },
      unlock: {
        age: "age.stone",
        buildings: { "building.berry_gatherer": 1 },
        resources: { "resource.wood": 18, "resource.food": 8 }
      }
    }
  ]
};