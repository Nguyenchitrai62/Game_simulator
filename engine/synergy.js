window.SynergySystem = (function () {

  /**
   * Get synergy bonus for a building based on nearby buildings
   * @param {string} instanceUid - Building instance UID
   * @returns {Object} - { productionBonus: 0.15, speedBonus: 0.05 }
   */
  function getSynergyBonus(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance) return { productionBonus: 0, speedBonus: 0 };

    var entity = GameRegistry.getEntity(instance.entityId);
    if (!entity) return { productionBonus: 0, speedBonus: 0 };

    var balance = GameRegistry.getBalance(instance.entityId);
    if (!balance || !balance.synergyFrom) return { productionBonus: 0, speedBonus: 0 };

    var totalProductionBonus = 0;
    var totalSpeedBonus = 0;

    // Check 3x3 grid around building
    var nearbyBuildings = findNearbyBuildings(instance.x, instance.z, 1.5); // 1.5 tile radius (~3x3)

    for (var i = 0; i < nearbyBuildings.length; i++) {
      var nearbyInstance = nearbyBuildings[i];
      var nearbyEntity = GameRegistry.getEntity(nearbyInstance.entityId);
      
      if (!nearbyEntity) continue;

      // Check if this nearby building provides synergy
      if (balance.synergyFrom[nearbyInstance.entityId]) {
        var bonusData = balance.synergyFrom[nearbyInstance.entityId];
        totalProductionBonus += bonusData.productionBonus || 0;
        totalSpeedBonus += bonusData.speedBonus || 0;
      }
    }

    // Apply diminishing returns after 3 buildings (prevent stacking abuse)
    if (nearbyBuildings.length > 3) {
      var diminishingFactor = 1 - ((nearbyBuildings.length - 3) * 0.1);
      diminishingFactor = Math.max(0.5, diminishingFactor); // Min 50% effectiveness
      totalProductionBonus *= diminishingFactor;
      totalSpeedBonus *= diminishingFactor;
    }

    // Hard cap at +50% total
    totalProductionBonus = Math.min(0.5, totalProductionBonus);
    totalSpeedBonus = Math.min(0.5, totalSpeedBonus);

    return {
      productionBonus: totalProductionBonus,
      speedBonus: totalSpeedBonus,
      nearbyCount: nearbyBuildings.length
    };
  }

  /**
   * Find all buildings within radius of a position
   */
  function findNearbyBuildings(x, z, radius) {
    var nearby = [];
    var instances = GameState.getAllInstances();

    for (var uid in instances) {
      var inst = instances[uid];
      var dx = inst.x - x;
      var dz = inst.z - z;
      var distance = Math.sqrt(dx * dx + dz * dz);

      if (distance > 0 && distance <= radius) { // Exclude self (distance > 0)
        nearby.push(inst);
      }
    }

    return nearby;
  }

  /**
   * Get list of buildings that provide synergy TO this building type
   * (for UI display)
   */
  function getSynergyProviders(buildingId) {
    var balance = GameRegistry.getBalance(buildingId);
    if (!balance || !balance.synergyFrom) return [];

    var providers = [];
    for (var providerBuildingId in balance.synergyFrom) {
      var bonusData = balance.synergyFrom[providerBuildingId];
      var providerEntity = GameRegistry.getEntity(providerBuildingId);
      
      providers.push({
        buildingId: providerBuildingId,
        name: providerEntity ? providerEntity.name : providerBuildingId,
        productionBonus: bonusData.productionBonus || 0,
        speedBonus: bonusData.speedBonus || 0
      });
    }

    return providers;
  }

  return {
    getSynergyBonus: getSynergyBonus,
    getSynergyProviders: getSynergyProviders,
    findNearbyBuildings: findNearbyBuildings
  };
})();
