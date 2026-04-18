window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_fire_light"] = {
  packId: "expansion_fire_light",
  name: "Fire & Light",
  entities: [
    {
      id: "building.campfire",
      type: "building",
      name: "Campfire",
      description: "Wide night-time light coverage. Costs a lot of Wood and Flint to build, and Wood to refuel.",
      visual: { shape: "campfire", color: 0x654321, roofColor: 0xFF6600, scale: 0.8 },
      unlock: { age: "age.stone", resources: { "resource.wood": 8 } }
    },
    {
      id: "item.handheld_torch",
      type: "consumable",
      name: "Hand Torch",
      description: "A handheld torch that lights the way at night and burns out after a while.",
      unlock: { age: "age.stone", resources: { "resource.wood": 2 } }
    },
    {
      id: "recipe.handheld_torch",
      type: "recipe",
      name: "Hand Torch",
      description: "Craft a handheld torch. Lights the night for 60s.",
      unlock: { age: "age.stone" }
    }
  ]
};