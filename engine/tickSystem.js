window.TickSystem = (function () {
  var _tickCount = 0;
  var _resourceStats = {};
  var _lastNet = {};

  function tick() {
    _tickCount++;
    calculateResourceStats();
    applyConsumption();  // Only consumption now, no passive production
    UnlockSystem.checkAll();

    if (typeof GameHUD !== "undefined") {
      GameHUD.renderAll();
    }

    if (_tickCount % 10 === 0) {
      GameStorage.save();
    }
  }
  
  function calculateResourceStats() {
    _resourceStats = { production: {}, consumption: {}, net: {}, timeLeft: {} };
    var instances = GameState.getAllInstances();
    var buildingList = [];
    
    for (var uid in instances) {
      var instance = instances[uid];
      var buildingId = instance.entityId;
      var balance = GameRegistry.getBalance(buildingId);
      
      if (balance) {
        buildingList.push({
          uid: uid,
          instance: instance,
          buildingId: buildingId,
          balance: balance
        });
      }
    }
    
    // Step 1: Calculate maximum possible production & consumption
    for (var i = 0; i < buildingList.length; i++) {
      var building = buildingList[i];
      var mult = UpgradeSystem.getProductionMultiplier(building.buildingId, building.uid);
      
      if (building.balance.produces) {
        for (var resId in building.balance.produces) {
          var amt = building.balance.produces[resId] * mult;
          _resourceStats.production[resId] = (_resourceStats.production[resId] || 0) + amt;
        }
      }
      
      if (building.balance.consumesPerTick) {
        for (var resId in building.balance.consumesPerTick) {
          var amt = building.balance.consumesPerTick[resId];
          _resourceStats.consumption[resId] = (_resourceStats.consumption[resId] || 0) + amt;
        }
      }
    }
    
    // Step 2: Calculate net
    var allResources = new Set([...Object.keys(_resourceStats.production), ...Object.keys(_resourceStats.consumption)]);
    allResources.forEach(function(resId) {
      var prod = _resourceStats.production[resId] || 0;
      var cons = _resourceStats.consumption[resId] || 0;
      _resourceStats.net[resId] = prod - cons;
      
      // Calculate depletion time
      if (_resourceStats.net[resId] < 0) {
        var current = GameState.getResource(resId);
        var perTickLoss = Math.abs(_resourceStats.net[resId]);
        _resourceStats.timeLeft[resId] = Math.floor(current / perTickLoss);
      } else {
        _resourceStats.timeLeft[resId] = Infinity;
      }
    });
    
    _lastNet = Object.assign({}, _resourceStats.net);
  }

  /**
   * Apply consumption only (e.g., Smelter consumes copper + tin)
   * Production now comes from NPCs harvesting to building storage
   */
  function applyConsumption() {
    var instances = GameState.getAllInstances();
    var buildingList = [];
    
    // Collect all buildings that consume resources
    for (var uid in instances) {
      var instance = instances[uid];
      var buildingId = instance.entityId;
      var balance = GameRegistry.getBalance(buildingId);
      
      if (balance && balance.consumesPerTick) {
        buildingList.push({
          uid: uid,
          instance: instance,
          buildingId: buildingId,
          balance: balance
        });
      }
    }
    
    // Sort by UID for stable order
    buildingList.sort(function(a, b) {
      return a.uid.localeCompare(b.uid);
    });
    
    // Process each consuming building
    for (var i = 0; i < buildingList.length; i++) {
      var building = buildingList[i];
      var canConsume = true;
      
      // Check if player has enough resources
      for (var resId in building.balance.consumesPerTick) {
        var needed = building.balance.consumesPerTick[resId];
        if (!GameState.hasResource(resId, needed)) {
          canConsume = false;
          break;
        }
      }
      
      if (canConsume) {
        // Deduct consumption from player resources
        for (var resId in building.balance.consumesPerTick) {
          GameState.removeResource(resId, building.balance.consumesPerTick[resId]);
        }
        
        // Apply production (e.g., Smelter produces bronze after consuming copper+tin)
        if (building.balance.produces) {
          var mult = UpgradeSystem.getProductionMultiplier(building.buildingId, building.uid);
          for (var resId in building.balance.produces) {
            var amount = building.balance.produces[resId] * mult;
            GameState.addFractionalResource(resId, amount);
          }
        }
      }
    }
  }
  
  function getResourceStats() {
    return Object.assign({}, _resourceStats);
  }

  function getTickCount() { return _tickCount; }

  function tickPausedOnly() {
    _tickCount++;
    if (_tickCount % 10 === 0) {
      GameStorage.save();
    }
  }

  return {
    tick: tick,
    tickPausedOnly: tickPausedOnly,
    getTickCount: getTickCount,
    getResourceStats: getResourceStats,
    calculateResourceStats: calculateResourceStats
  };
})();
