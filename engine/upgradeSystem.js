window.UpgradeSystem = (function () {

  function canUpgrade(buildingId, instanceUid) {
    var balance = GameRegistry.getBalance(buildingId);
    if (!balance || !balance.upgrades) return { can: false, reason: "No upgrades available" };

    var currentLevel = 1;
    if (instanceUid) {
      var instance = GameState.getInstance(instanceUid);
      if (instance) currentLevel = instance.level || 1;
    } else {
      // Backward compatibility: fallback to old global max behavior
      currentLevel = getBuildingLevel(buildingId);
    }
    
    var nextLevel = currentLevel + 1;
    var upgrade = balance.upgrades[nextLevel];
    if (!upgrade) return { can: false, reason: "Max level reached" };

    if (upgrade.cost) {
      for (var resId in upgrade.cost) {
        if (!GameState.hasSpendableResource(resId, upgrade.cost[resId])) {
          return { can: false, reason: "Not enough resources" };
        }
      }
    }

    return { can: true, level: nextLevel, upgrade: upgrade };
  }

  function upgrade(buildingId, instanceUid) {
    var check = canUpgrade(buildingId, instanceUid);
    if (!check.can) return false;

    var upgrade = check.upgrade;

    // Deduct cost
    if (upgrade.cost) {
      for (var resId in upgrade.cost) {
        GameState.consumeSpendableResource(resId, upgrade.cost[resId]);
      }
    }

    // Update instance level
    if (instanceUid) {
      var instance = GameState.getInstance(instanceUid);
      if (instance) {
        instance.level = check.level;
        GameState.addInstance(instanceUid, instance);
        
        // Re-create 3D mesh with new level visual
        var scene = GameScene.getScene();
        for (var i = scene.children.length - 1; i >= 0; i--) {
          var child = scene.children[i];
          if (child.userData && child.userData.instanceUid === instanceUid) {
            scene.remove(child);
            break;
          }
        }
        
        var entity = GameRegistry.getEntity(buildingId);
        if (entity && window.BuildingSystem && BuildingSystem.createBuildingMesh) {
          var newMesh = BuildingSystem.createBuildingMesh(entity, check.level, false);
          if (newMesh) {
            newMesh.position.set(instance.x, 0, instance.z);
            newMesh.userData.instanceUid = instanceUid;
            scene.add(newMesh);
          }
        }
        
        // Spawn additional NPCs for upgraded building
        if (window.NPCSystem && NPCSystem.spawnWorkersForBuilding) {
          NPCSystem.despawnWorkersForBuilding(instanceUid);
          NPCSystem.spawnWorkersForBuilding(instanceUid);
        }
      }
    }

    // Check for newly unlocked content after upgrade
    UnlockSystem.checkAll();
    GameHUD.renderAll();

    return check.level;
  }

  function getBuildingLevel(buildingId) {
    // For simplicity, track level per building type
    // In a full implementation, this would be per instance
    var instances = GameState.getAllInstances();
    var maxLevel = 1;
    for (var uid in instances) {
      if (instances[uid].entityId === buildingId) {
        maxLevel = Math.max(maxLevel, instances[uid].level || 1);
      }
    }
    return maxLevel;
  }

  function getProductionMultiplier(buildingId, instanceUid) {
    var balance = GameRegistry.getBalance(buildingId);
    if (!balance || !balance.upgrades) return 1.0;

    var level = 1;
    if (instanceUid) {
      var instance = GameState.getInstance(instanceUid);
      if (instance) level = instance.level || 1;
    } else {
      // Backward compatibility: fallback to old global max behavior
      level = getBuildingLevel(buildingId);
    }
    
    var upgrade = balance.upgrades[level];
    if (upgrade && upgrade.productionMultiplier) {
      return upgrade.productionMultiplier;
    }
    return 1.0;
  }

  function getNextUpgrade(buildingId) {
    var balance = GameRegistry.getBalance(buildingId);
    if (!balance || !balance.upgrades) return null;

    var level = getBuildingLevel(buildingId);
    return balance.upgrades[level + 1] || null;
  }

  function getMaxLevel(buildingId) {
    var balance = GameRegistry.getBalance(buildingId);
    if (!balance || !balance.upgrades) return 1;
    return Object.keys(balance.upgrades).length + 1;
  }

  return {
    canUpgrade: canUpgrade,
    upgrade: upgrade,
    getBuildingLevel: getBuildingLevel,
    getProductionMultiplier: getProductionMultiplier,
    getNextUpgrade: getNextUpgrade,
    getMaxLevel: getMaxLevel
  };
})();
