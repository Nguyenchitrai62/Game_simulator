window.SynergySystem = (function () {
  var _synergyCacheTick = -1;
  var _synergyCache = Object.create(null);

  function getCurrentTickCount() {
    return (window.TickSystem && TickSystem.getTickCount) ? TickSystem.getTickCount() : 0;
  }

  function getCachedSynergy(instanceUid) {
    var tickCount = getCurrentTickCount();
    if (_synergyCacheTick !== tickCount) {
      _synergyCacheTick = tickCount;
      _synergyCache = Object.create(null);
    }
    return _synergyCache[instanceUid] || null;
  }

  function setCachedSynergy(instanceUid, value) {
    getCachedSynergy(instanceUid);
    _synergyCache[instanceUid] = value;
    return value;
  }

  /**
   * Get synergy bonus for a building based on nearby buildings
   * @param {string} instanceUid - Building instance UID
   * @returns {Object} - { productionBonus: 0.15, speedBonus: 0.05 }
   */
  function getSynergyBonus(instanceUid) {
    var cached = getCachedSynergy(instanceUid);
    if (cached) return cached;

    var instance = GameState.getInstance(instanceUid);
    if (!instance) return setCachedSynergy(instanceUid, { productionBonus: 0, speedBonus: 0, nearbyCount: 0 });

    var entity = GameRegistry.getEntity(instance.entityId);
    if (!entity) return setCachedSynergy(instanceUid, { productionBonus: 0, speedBonus: 0, nearbyCount: 0 });

    var balance = GameRegistry.getBalance(instance.entityId);
    if (!balance || !balance.synergyFrom) return setCachedSynergy(instanceUid, { productionBonus: 0, speedBonus: 0, nearbyCount: 0 });

    var totalProductionBonus = 0;
    var totalSpeedBonus = 0;

    // Check 3x3 grid around building
    var nearbyBuildings = findNearbyBuildings(instance.x, instance.z, 1.5, { excludeUid: instanceUid }); // 1.5 tile radius (~3x3)

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

    return setCachedSynergy(instanceUid, {
      productionBonus: totalProductionBonus,
      speedBonus: totalSpeedBonus,
      nearbyCount: nearbyBuildings.length
    });
  }

  /**
   * Find all buildings within radius of a position
   */
  function findNearbyBuildings(x, z, radius, options) {
    options = options || {};
    var nearby = [];
    if (window.GameSpatialIndex && GameSpatialIndex.getNearbyInstances) {
      return GameSpatialIndex.getNearbyInstances(x, z, radius, {
        excludeUid: options.excludeUid || null,
        filter: function(inst) {
          return !!(inst && inst.entityId);
        }
      });
    }

    var radiusSq = radius * radius;
    var instances = GameState.getAllInstances();

    for (var uid in instances) {
      var inst = instances[uid];
      if (options.excludeUid && (inst.uid === options.excludeUid || uid === options.excludeUid)) continue;
      var dx = inst.x - x;
      var dz = inst.z - z;
      var distanceSq = dx * dx + dz * dz;

      if (distanceSq > 0 && distanceSq <= radiusSq) { // Exclude self (distance > 0)
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
