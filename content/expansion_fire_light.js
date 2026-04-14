window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_fire_light"] = {
  packId: "expansion_fire_light",
  name: "Fire & Light",
  entities: [
    {
      id: "building.campfire",
      type: "building",
      name: "Đống lửa",
      description: "Chiếu sáng rộng ban đêm. Cần nhiều Wood và Flint để chế tạo, chỉ cần Wood để nạp thêm.",
      visual: { shape: "campfire", color: 0x654321, roofColor: 0xFF6600, scale: 0.8 },
      unlock: { age: "age.stone", resources: { "resource.wood": 8 } }
    },
    {
      id: "item.handheld_torch",
      type: "consumable",
      name: "Đuốc tay",
      description: "Đuốc cầm tay chiếu sáng khi đi đêm. Tự cháy hết sau một lúc.",
      unlock: { age: "age.stone", resources: { "resource.wood": 2 } }
    },
    {
      id: "recipe.handheld_torch",
      type: "recipe",
      name: "Đuốc tay",
      description: "Chế tạo đuốc cầm tay. Sáng 60s khi trời tối.",
      unlock: { age: "age.stone" }
    }
  ]
};