window.GameGenerator = (function () {

  function generateNewContent(prompt) {
    var template = {
      packId: "generated_" + Date.now(),
      name: "Generated Content",
      entities: []
    };

    var resourceKeywords = {
      iron: { id: "resource.iron", name: "Iron", desc: "A strong metal for advanced tools." },
      gold: { id: "resource.gold", name: "Gold", desc: "A precious metal for trade and decoration." },
      silver: { id: "resource.silver", name: "Silver", desc: "A valuable metal with many uses." },
      coal: { id: "resource.coal", name: "Coal", desc: "Fuel for intense fires and smelting." },
      leather: { id: "resource.leather", name: "Leather", desc: "Tanned animal hide for armor and tools." },
      clay: { id: "resource.clay", name: "Clay", desc: "Moldable earth for pottery and construction." },
      wheat: { id: "resource.wheat", name: "Wheat", desc: "A staple grain for feeding civilization." },
      iron_sword: { id: "resource.iron_sword", name: "Iron Sword", desc: "A deadly weapon forged from iron." }
    };

    var buildingKeywords = {
      mine: { suffix: "Mine", type: "mine", produces: 1 },
      forge: { suffix: "Forge", type: "forge", produces: 1 },
      farm: { suffix: "Farm", type: "farm", produces: 2 },
      workshop: { suffix: "Workshop", type: "workshop", produces: 1 },
      kiln: { suffix: "Kiln", type: "kiln", produces: 1 }
    };

    var lowerPrompt = prompt.toLowerCase();
    var balancePatch = {};

    var detectedResources = [];
    var detectedBuildings = [];
    var detectedRecipes = [];

    for (var key in resourceKeywords) {
      if (lowerPrompt.indexOf(key) !== -1) {
        detectedResources.push(resourceKeywords[key]);
      }
    }

    detectedResources.forEach(function (res) {
      template.entities.push({
        id: res.id,
        type: "resource",
        name: res.name,
        description: res.desc,
        unlock: { age: "age.stone" }
      });
    });

    for (var key in buildingKeywords) {
      if (lowerPrompt.indexOf(key) !== -1) {
        var bld = buildingKeywords[key];
        if (detectedResources.length > 0) {
          var targetRes = detectedResources[0];
          var bldId = "building." + targetRes.id.split(".")[1] + "_" + key;
          template.entities.push({
            id: bldId,
            type: "building",
            name: targetRes.name + " " + bld.suffix,
            description: bld.suffix + " that produces " + targetRes.name.toLowerCase() + ".",
            unlock: { age: "age.stone", resources: {} }
          });
          balancePatch[bldId] = {
            cost: { "resource.wood": 30, "resource.stone": 20 },
            produces: {}
          };
          balancePatch[bldId].produces[targetRes.id] = bld.produces;
        }
      }
    }

    console.log("[Generator] Generated content from prompt: " + prompt);
    console.log("[Generator] Entities: " + template.entities.length);
    console.log("[Generator] Balance entries: " + Object.keys(balancePatch).length);

    return {
      newPack: template,
      balancePatch: balancePatch,
      summary: {
        resources: detectedResources.map(function (r) { return r.name; }),
        buildings: detectedBuildings.map(function (b) { return b.name; }),
        recipes: detectedRecipes.map(function (r) { return r.name; })
      }
    };
  }

  function applyGeneratedContent(packData, balancePatch) {
    if (!window.GAME_CONTENT) window.GAME_CONTENT = {};
    window.GAME_CONTENT[packData.packId] = packData;

    if (!window.GAME_BALANCE) window.GAME_BALANCE = {};
    for (var key in balancePatch) {
      window.GAME_BALANCE[key] = balancePatch[key];
    }

    GameRegistry.init();
    UnlockSystem.checkAll();
    if (typeof GameUI !== "undefined") {
      GameUI.renderAll();
    }

    console.log("[Generator] Applied pack: " + packData.packId);
  }

  function exportPack(packData, balancePatch) {
    var packStr = "window.GAME_CONTENT = window.GAME_CONTENT || {};\n\n";
    packStr += "window.GAME_CONTENT[\"" + packData.packId + "\"] = " + JSON.stringify(packData, null, 2) + ";\n";

    var balanceStr = "// Add to balance.js:\n";
    balanceStr += JSON.stringify(balancePatch, null, 2);

    return {
      packFile: packStr,
      balanceFile: balanceStr
    };
  }

  return {
    generateNewContent: generateNewContent,
    applyGeneratedContent: applyGeneratedContent,
    exportPack: exportPack
  };
})();
