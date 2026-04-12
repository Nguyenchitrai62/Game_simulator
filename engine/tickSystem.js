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

    if (_tickCount % 5 === 0) {
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
      
      // Get production speed multiplier (affects tick rate)
      var speedMult = 1.0;
      if (building.balance.productionSpeed) {
        var level = building.instance.level || 1;
        speedMult = building.balance.productionSpeed[level] || 1.0;
      }
      
      // Get synergy bonus from nearby buildings
      var synergyBonus = { productionBonus: 0, speedBonus: 0 };
      if (window.SynergySystem) {
        synergyBonus = SynergySystem.getSynergyBonus(building.uid);
        speedMult *= (1 + synergyBonus.speedBonus);
      }
      
      // Get global research bonuses
      var globalBonus = 0;
      if (window.ResearchSystem) {
        var bonuses = ResearchSystem.getGlobalBonuses();
        globalBonus = bonuses.productionBonus || 0;
      }
      
      if (building.balance.produces) {
        for (var resId in building.balance.produces) {
          // Apply production multiplier, speed multiplier, synergy bonus, AND global bonus
          var baseProd = building.balance.produces[resId];
          var amt = baseProd * mult * speedMult * (1 + synergyBonus.productionBonus + globalBonus);
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
          
          // Get production speed multiplier
          var speedMult = 1.0;
          if (building.balance.productionSpeed) {
            var level = building.instance.level || 1;
            speedMult = building.balance.productionSpeed[level] || 1.0;
          }
          
          // Get synergy bonus
          var synergyBonus = { productionBonus: 0, speedBonus: 0 };
          if (window.SynergySystem) {
            synergyBonus = SynergySystem.getSynergyBonus(building.uid);
            speedMult *= (1 + synergyBonus.speedBonus);
          }
          
          // Get global research bonuses
          var globalBonus = 0;
          if (window.ResearchSystem) {
            var bonuses = ResearchSystem.getGlobalBonuses();
            globalBonus = bonuses.productionBonus || 0;
          }
          
          for (var resId in building.balance.produces) {
            var baseProd = building.balance.produces[resId];
            var amount = baseProd * mult * speedMult * (1 + synergyBonus.productionBonus + globalBonus);
            GameState.addFractionalResource(resId, amount);
          }
        }
      }
    }

    // Warehouse auto-transfer: move storage from nearby buildings to warehouses
    transferToWarehouses();
  }

  /**
   * Transfer storage from production buildings to nearby Warehouses
   */
  function transferToWarehouses() {
    var instances = GameState.getAllInstances();
    var warehouses = [];
    var productionBuildings = [];

    // Categorize buildings
    for (var uid in instances) {
      var inst = instances[uid];
      var balance = GameRegistry.getBalance(inst.entityId);
      if (!balance) continue;

      if (inst.entityId === 'building.warehouse') {
        warehouses.push({ uid: uid, inst: inst, balance: balance });
      } else if (balance.storageCapacity && balance.workerCount && balance.workerCount[inst.level || 1] > 0) {
        productionBuildings.push({ uid: uid, inst: inst, balance: balance });
      }
    }

    // For each production building, find nearest warehouse and transfer
    productionBuildings.forEach(function(prod) {
      var storage = GameState.getBuildingStorage(prod.uid);
      if (!storage) return;

      var totalStored = 0;
      for (var r in storage) { totalStored += storage[r]; }
      if (totalStored <= 0) return;

      // Find nearest warehouse within transfer range
      var nearestWarehouse = null;
      var nearestDist = Infinity;

      warehouses.forEach(function(wh) {
        var dx = wh.inst.x - prod.inst.x;
        var dz = wh.inst.z - prod.inst.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        var transferRange = (wh.balance && wh.balance.transferRange) || 5;

        if (dist <= transferRange && dist < nearestDist) {
          nearestDist = dist;
          nearestWarehouse = wh;
        }
      });

      if (!nearestWarehouse) return;

      // Check warehouse capacity
      var whCapacity = GameState.getStorageCapacity(nearestWarehouse.uid);
      var whUsed = GameState.getStorageUsed(nearestWarehouse.uid);
      var whSpace = whCapacity - whUsed;

      if (whSpace <= 0) return;

      // Transfer resources (up to available space)
      var transferred = 0;
      for (var resId in storage) {
        if (storage[resId] <= 0) continue;
        var amount = Math.min(storage[resId], whSpace - transferred);
        if (amount <= 0) continue;

        // Add to warehouse storage
        GameState.addBuildingStorage(nearestWarehouse.uid, resId, amount);
        // Remove from production building storage
        GameState.addBuildingStorage(prod.uid, resId, -amount);
        transferred += amount;
      }
    });
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
