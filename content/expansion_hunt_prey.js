window.GAME_CONTENT = window.GAME_CONTENT || {};

window.GAME_CONTENT["expansion_hunt_prey"] = {
  packId: "expansion_hunt_prey",
  name: "Hunt Prey",
  entities: [
    {
      id: "animal.deer",
      type: "animal",
      name: "Deer",
      description: "A skittish prey animal. Easy to hunt, but not dangerous.",
      visual: { shape: "deer", color: 0xA66B3D, scale: 0.62 },
      unlock: { age: "age.stone" }
    },
    {
      id: "animal.rabbit",
      type: "animal",
      name: "Rabbit",
      description: "A harmless small prey animal for quick food.",
      visual: { shape: "rabbit", color: 0xD8CBB5, scale: 0.38 },
      unlock: { age: "age.stone" }
    }
  ]
};