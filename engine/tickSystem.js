window.TickSystem = (function () {
  var _tickCount = 0;
  var _resourceStats = {};

  function getSimulationConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.simulation) || {};
  }

  function getAutosaveIntervalTicks() {
    return Math.max(0, Number(getSimulationConfig().autosaveIntervalTicks) || 0);
  }

  function getPausedAutosaveIntervalTicks() {
    return Math.max(0, Number(getSimulationConfig().pausedAutosaveIntervalTicks) || 0);
  }

  function getAnimalRespawnRetryDelayMs() {
    return Number(((window.GAME_BALANCE && GAME_BALANCE.animalRespawn) || {}).retryDelayMs) || 0;
  }

  function getAnimalRespawnPlayerSafeDistance() {
    return Number(((window.GAME_BALANCE && GAME_BALANCE.animalRespawn) || {}).playerSafeDistance) || 0;
  }

  function getEntityRespawnTimeSeconds(balance) {
    return Number(balance && balance.respawnTime) || 0;
  }

  function getLiveInstances() {
    if (GameState.getAllInstancesLive) return GameState.getAllInstancesLive();
    return GameState.getAllInstances();
  }

  function beginPerfMark(name) {
    return (typeof GamePerf !== 'undefined' && GamePerf.begin) ? GamePerf.begin(name) : null;
  }

  function endPerfMark(mark) {
    if (mark && typeof GamePerf !== 'undefined' && GamePerf.end) {
      GamePerf.end(mark);
    }
  }

  function tick() {
    var tickMark = beginPerfMark('tick.total');
    _tickCount++;
    var instances = getLiveInstances();

    var resourceStatsMark = beginPerfMark('tick.resourceStats');
    calculateResourceStats(instances);
    endPerfMark(resourceStatsMark);

    var consumptionMark = beginPerfMark('tick.consumption');
    applyConsumption(instances);  // Only consumption now, no passive production
    endPerfMark(consumptionMark);

    var farmingMark = beginPerfMark('tick.farming');
    applyFarmingProgress(instances);
    endPerfMark(farmingMark);

    var barracksMark = beginPerfMark('tick.barracks');
    applyBarracksTraining(instances);
    endPerfMark(barracksMark);

    var watchtowerMark = beginPerfMark('tick.watchtower');
    applyWatchtowerDefense(instances);
    endPerfMark(watchtowerMark);

    var hungerMark = beginPerfMark('tick.hunger');
    applyHunger();
    endPerfMark(hungerMark);

    var fireFuelMark = beginPerfMark('tick.fireFuel');
    applyFireFuelDrain(instances);
    endPerfMark(fireFuelMark);

    var unlockMark = beginPerfMark('tick.unlocks');
    UnlockSystem.checkAll();
    endPerfMark(unlockMark);

    if (typeof GameHUD !== "undefined") {
      GameHUD.renderAll('tick');
    }

    var autosaveIntervalTicks = getAutosaveIntervalTicks();
    if (autosaveIntervalTicks > 0 && _tickCount % autosaveIntervalTicks === 0) {
      GameStorage.save({ delayMs: 1200 });
    }

    endPerfMark(tickMark);
  }
  
  function calculateResourceStats(instances) {
    _resourceStats = { production: {}, consumption: {}, net: {}, timeLeft: {} };
    instances = instances || getLiveInstances();
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
      
      if (building.balance.consumesPerSecond) {
        for (var resId in building.balance.consumesPerSecond) {
          var amt = building.balance.consumesPerSecond[resId];
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
        var current = GameState.getSpendableResource(resId);
        var perSecondLoss = Math.abs(_resourceStats.net[resId]);
        _resourceStats.timeLeft[resId] = Math.floor(current / perSecondLoss);
      } else {
        _resourceStats.timeLeft[resId] = Infinity;
      }
    });


  }

  /**
   * Apply consumption only (e.g., Smelter consumes copper + tin)
   * Production now comes from NPCs harvesting to building storage
   */
  function applyConsumption(instances) {
    instances = instances || getLiveInstances();
    var buildingList = [];
    
    // Collect all buildings that consume resources
    for (var uid in instances) {
      var instance = instances[uid];
      var buildingId = instance.entityId;
      var balance = GameRegistry.getBalance(buildingId);
      
      if (balance && balance.consumesPerSecond) {
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
for (var resId in building.balance.consumesPerSecond) {
          var needed = building.balance.consumesPerSecond[resId];
        if (!GameState.hasSpendableResource(resId, needed)) {
          canConsume = false;
          break;
        }
      }
      
      if (canConsume) {
        // Deduct consumption from player resources
        for (var resId in building.balance.consumesPerSecond) {
          GameState.consumeSpendableResource(resId, building.balance.consumesPerSecond[resId]);
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
    transferToWarehouses(instances);

    // Passive production: buildings with produces but no consumesPerSecond and no workers
    applyPassiveProduction(instances);
  }

  /**
   * Passive production: buildings with produces but no consumption and no workers
   * (e.g., well produces food automatically)
   */
  function applyPassiveProduction(instances) {
    instances = instances || getLiveInstances();
    for (var uid in instances) {
      var instance = instances[uid];
      var buildingId = instance.entityId;
      var balance = GameRegistry.getBalance(buildingId);
      if (!balance) continue;

      var level = instance.level || 1;
      var workerCount = (balance.workerCount && balance.workerCount[level]) || 0;
      var hasConsumption = balance.consumesPerSecond && Object.keys(balance.consumesPerSecond).length > 0;

      if (balance.produces && workerCount === 0 && !hasConsumption) {
        for (var resId in balance.produces) {
          var amount = balance.produces[resId];
          var mult = UpgradeSystem.getProductionMultiplier(buildingId, uid);
          var speedMult = 1.0;
          if (balance.productionSpeed) {
            speedMult = balance.productionSpeed[level] || 1.0;
          }
          var synergyBonus = { productionBonus: 0, speedBonus: 0 };
          if (window.SynergySystem) {
            synergyBonus = SynergySystem.getSynergyBonus(uid);
            speedMult *= (1 + synergyBonus.speedBonus);
          }
          var globalBonus = 0;
          if (window.ResearchSystem) {
            var bonuses = ResearchSystem.getGlobalBonuses();
            globalBonus = bonuses.productionBonus || 0;
          }
          var totalAmount = amount * mult * speedMult * (1 + synergyBonus.productionBonus + globalBonus);
          GameState.addFractionalResource(resId, totalAmount);
        }
      }
    }
  }

  function applyFarmingProgress(instances) {
    instances = instances || getLiveInstances();

    for (var uid in instances) {
      var instance = instances[uid];
      var balance = GameRegistry.getBalance(instance.entityId);
      var farming = balance ? balance.farming : null;
      if (!farming) continue;

      var farmState = GameState.getFarmState(uid);
      if (!farmState || !farmState.planted || farmState.ready) continue;

      var prevVisualPhase = (window.BuildingSystem && BuildingSystem.getFarmPlotVisualState) ? BuildingSystem.getFarmPlotVisualState(uid).phase : null;

      var growthSeconds = (window.GameActions && GameActions.getFarmGrowthSeconds) ? GameActions.getFarmGrowthSeconds(uid, farmState) : (farmState.watered ? farming.wateredGrowthSeconds : farming.dryGrowthSeconds);
      growthSeconds = Math.max(1, growthSeconds || 1);

      var nextProgress = Math.min(1, (farmState.progress || 0) + (1 / growthSeconds));
      var nextState = GameState.setFarmState(uid, {
        progress: nextProgress,
        ready: nextProgress >= 1
      });

      if (window.BuildingSystem && BuildingSystem.refreshBuilding && BuildingSystem.getFarmPlotVisualState) {
        var nextVisualPhase = BuildingSystem.getFarmPlotVisualState(uid).phase;
        if (((nextState && nextState.ready) !== !!farmState.ready) || prevVisualPhase !== nextVisualPhase) {
          BuildingSystem.refreshBuilding(uid);
        }
      }
    }
  }

  function getLevelConfigValue(config, level, fallbackValue) {
    if (!config) return fallbackValue;
    if (typeof config === 'number') return config;
    if (config[level] !== undefined) return config[level];
    if (config[1] !== undefined) return config[1];
    return fallbackValue;
  }

  function getArmoryTrainingBonus(instances) {
    var armoryCount = 0;
    for (var uid in instances) {
      if (instances[uid] && instances[uid].entityId === 'building.armory') armoryCount++;
    }

    if (armoryCount <= 0) return 0;
    var support = (GameRegistry.getBalance('building.armory') || {}).armorySupport || {};
    return armoryCount * (Number(support.barracksTrainingSpeedBonus) || 0);
  }

  function applyBarracksTraining(instances) {
    if (!GameState.getBarracksState || !GameState.setBarracksState || !GameState.addBarracksReserve) return;

    instances = instances || getLiveInstances();
    var researchBonuses = (window.ResearchSystem && ResearchSystem.getGlobalBonuses)
      ? (ResearchSystem.getGlobalBonuses() || {})
      : {};
    var trainingSpeedBonus = Math.max(0, Number(researchBonuses.barracksTrainingSpeedBonus) || 0);
    trainingSpeedBonus += Math.max(0, getArmoryTrainingBonus(instances));
    for (var uid in instances) {
      var instance = instances[uid];
      if (!instance || instance.entityId !== 'building.barracks') continue;

      var balance = GameRegistry.getBalance(instance.entityId) || {};
      var military = balance.military || {};
      if (!military.units) continue;

      var level = instance.level || 1;
      var trainingSpeed = getLevelConfigValue(military.trainingSpeed, level, 1) || 1;
      trainingSpeed *= (1 + trainingSpeedBonus);
      var state = GameState.getBarracksState(uid);
      if (!state || !state.queue || !state.queue.length) continue;

      var activeEntry = state.queue[0];
      activeEntry.remainingSeconds = Math.max(0, (Number(activeEntry.remainingSeconds) || 0) - trainingSpeed);

      if (activeEntry.remainingSeconds <= 0) {
        var unitType = activeEntry.unitType || 'swordsman';
        var unitConfig = military.units[unitType] || {};
        state.queue.shift();
        state.totalTrained = (state.totalTrained || 0) + 1;
        state.completedToday = (state.completedToday || 0) + 1;
        GameState.setBarracksState(uid, state);
        GameState.addBarracksReserve(uid, unitType, 1);

        if (typeof GameHUD !== 'undefined' && GameHUD.showSuccess) {
          GameHUD.showSuccess((unitConfig.label || unitType) + ' is ready at the Barracks.');
        }
      } else {
        GameState.setBarracksState(uid, state);
      }
    }
  }

  function ensureWatchtowerState(instance) {
    if (!instance) return null;
    if (!instance.watchtowerState) instance.watchtowerState = {};
    if (instance.watchtowerState.cooldownRemaining === undefined) instance.watchtowerState.cooldownRemaining = 0;
    if (instance.watchtowerState.statusLabel === undefined) instance.watchtowerState.statusLabel = 'Scanning for threats';
    if (instance.watchtowerState.lastTargetType === undefined) instance.watchtowerState.lastTargetType = null;
    if (instance.watchtowerState.shotsFired === undefined) instance.watchtowerState.shotsFired = 0;
    if (instance.watchtowerState.kills === undefined) instance.watchtowerState.kills = 0;
    if (instance.watchtowerState.lastActionTick === undefined) instance.watchtowerState.lastActionTick = 0;

    var reserveSupport = instance.watchtowerState.reserveSupport || {};
    if (reserveSupport.swordsman === undefined) reserveSupport.swordsman = 0;
    if (reserveSupport.archer === undefined) reserveSupport.archer = 0;
    if (reserveSupport.linkedBarracksCount === undefined) reserveSupport.linkedBarracksCount = 0;
    if (reserveSupport.rangeBonus === undefined) reserveSupport.rangeBonus = 0;
    if (reserveSupport.attackDamageBonus === undefined) reserveSupport.attackDamageBonus = 0;
    if (reserveSupport.attackIntervalMultiplier === undefined) reserveSupport.attackIntervalMultiplier = 1;
    if (reserveSupport.workerProtectRadiusBonus === undefined) reserveSupport.workerProtectRadiusBonus = 0;
    if (reserveSupport.targetPriorityBonus === undefined) reserveSupport.targetPriorityBonus = 0;
    if (reserveSupport.supportLabel === undefined) reserveSupport.supportLabel = 'No barracks reserve link';
    instance.watchtowerState.reserveSupport = reserveSupport;

    return instance.watchtowerState;
  }

  function createEmptyReserveSupport() {
    return {
      swordsman: 0,
      archer: 0,
      linkedBarracksCount: 0,
      rangeBonus: 0,
      attackDamageBonus: 0,
      attackIntervalMultiplier: 1,
      workerProtectRadiusBonus: 0,
      targetPriorityBonus: 0,
      supportLabel: 'No barracks reserve link'
    };
  }

  function getBarracksSupportPools(instances) {
    var pools = [];
    if (!GameState.getBarracksState) return pools;

    for (var uid in instances) {
      var instance = instances[uid];
      if (!instance || instance.entityId !== 'building.barracks') continue;

      var balance = GameRegistry.getBalance(instance.entityId) || {};
      var military = balance.military || {};
      var units = military.units || {};
      var level = instance.level || 1;
      var supportRadius = getLevelConfigValue(balance.guardRadius, level, 0) || 0;
      if (supportRadius <= 0) continue;

      var state = GameState.getBarracksState(uid);
      if (!state || !state.reserves) continue;
      if (state.commandMode === 'follow') continue;

      var available = {};
      var totalAvailable = 0;
      for (var unitType in state.reserves) {
        var amount = Math.max(0, state.reserves[unitType] || 0);
        var unitConfig = units[unitType] || {};
        if (amount <= 0 || !unitConfig.towerSupport) continue;

        available[unitType] = amount;
        totalAvailable += amount;
      }

      if (totalAvailable <= 0) continue;

      pools.push({
        uid: uid,
        x: instance.x,
        z: instance.z,
        supportRadius: supportRadius,
        units: units,
        available: available
      });
    }

    return pools;
  }

  function assignReserveSupportToTower(instance, supportPools) {
    var support = createEmptyReserveSupport();
    if (!instance || !supportPools || !supportPools.length) return support;

    var linkedBarracks = {};
    var supportLabels = [];
    var supportOrder = ['swordsman', 'archer'];

    for (var orderIndex = 0; orderIndex < supportOrder.length; orderIndex++) {
      var unitType = supportOrder[orderIndex];
      var bestPool = null;
      var bestSupport = null;
      var bestDistance = Infinity;

      for (var poolIndex = 0; poolIndex < supportPools.length; poolIndex++) {
        var pool = supportPools[poolIndex];
        if (!pool || !pool.available || !pool.available[unitType]) continue;

        var unitConfig = pool.units[unitType] || {};
        var towerSupport = unitConfig.towerSupport;
        if (!towerSupport) continue;

        var dx = instance.x - pool.x;
        var dz = instance.z - pool.z;
        var distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > pool.supportRadius || distance >= bestDistance) continue;

        bestDistance = distance;
        bestPool = pool;
        bestSupport = towerSupport;
      }

      if (!bestPool || !bestSupport) continue;

      bestPool.available[unitType] -= 1;
      support[unitType] = 1;
      support.rangeBonus += Number(bestSupport.rangeBonus) || 0;
      support.attackDamageBonus += Number(bestSupport.attackDamageBonus) || 0;
      support.workerProtectRadiusBonus += Number(bestSupport.workerProtectRadiusBonus) || 0;
      support.targetPriorityBonus += Number(bestSupport.targetPriorityBonus) || 0;

      var intervalMultiplier = Number(bestSupport.attackIntervalMultiplier);
      if (intervalMultiplier > 0) {
        support.attackIntervalMultiplier *= intervalMultiplier;
      }

      if (!linkedBarracks[bestPool.uid]) {
        linkedBarracks[bestPool.uid] = true;
        support.linkedBarracksCount += 1;
      }
      if (bestSupport.label) {
        supportLabels.push(bestSupport.label);
      }
    }

    support.supportLabel = supportLabels.length ? supportLabels.join(' + ') : 'No barracks reserve link';
    return support;
  }

  function getLoadedAnimalTargets() {
    var targets = [];
    if (!window.GameTerrain || !GameTerrain.getAllChunks) return targets;

    var chunks = GameTerrain.getAllChunks();
    for (var key in chunks) {
      var chunk = chunks[key];
      if (!chunk || !chunk.objects) continue;
      for (var i = 0; i < chunk.objects.length; i++) {
        var obj = chunk.objects[i];
        if (!obj || !obj.type || obj.type.indexOf('animal.') !== 0) continue;
        if (obj.hp <= 0 || obj._destroyed) continue;
        if (window.GameRegistry && GameRegistry.isAnimalThreat && !GameRegistry.isAnimalThreat(obj.type)) continue;
        targets.push(obj);
      }
    }

    return targets;
  }

  function getActiveWorkerThreats() {
    var threatMap = {};
    if (!window.NPCSystem || !NPCSystem.getThreatenedWorkersSummary) return threatMap;

    var summary = NPCSystem.getThreatenedWorkersSummary();
    if (!summary || !summary.workers) return threatMap;

    for (var i = 0; i < summary.workers.length; i++) {
      var workerThreat = summary.workers[i];
      if (!workerThreat || !workerThreat.threatSourceId) continue;

      if (!threatMap[workerThreat.threatSourceId]) {
        threatMap[workerThreat.threatSourceId] = {
          workerCount: 0,
          attackingCount: 0
        };
      }

      threatMap[workerThreat.threatSourceId].workerCount += 1;
      if (workerThreat.threatLevel === 'attacking') {
        threatMap[workerThreat.threatSourceId].attackingCount += 1;
      }
    }

    return threatMap;
  }

  function scoreThreatForTower(target, tower, workers, protectRadius, priorityBonus, activeWorkerThreats, scoreCache) {
    var cacheKey = target && target.id ? target.id : null;
    if (cacheKey && scoreCache && scoreCache[cacheKey] !== undefined) {
      return scoreCache[cacheKey];
    }

    var dx = target.worldX - tower.x;
    var dz = target.worldZ - tower.z;
    var towerDistance = Math.sqrt(dx * dx + dz * dz);
    var nearestWorkerDistance = Infinity;

    for (var i = 0; i < workers.length; i++) {
      var worker = workers[i];
      if (!worker || !worker.position) continue;
      var workerDx = target.worldX - worker.position.x;
      var workerDz = target.worldZ - worker.position.z;
      var workerDistance = Math.sqrt(workerDx * workerDx + workerDz * workerDz);
      if (workerDistance < nearestWorkerDistance) nearestWorkerDistance = workerDistance;
    }

    var score = towerDistance;
    if (nearestWorkerDistance <= protectRadius) {
      score -= (priorityBonus || 0) + (protectRadius - nearestWorkerDistance);
    }

    var threatPressure = activeWorkerThreats ? activeWorkerThreats[target.id] : null;
    if (threatPressure) {
      score -= (priorityBonus || 0) * 1.75;
      score -= threatPressure.workerCount * 1.2;
      if (threatPressure.attackingCount > 0) {
        score -= 2.5 + (threatPressure.attackingCount * 0.75);
      }
    }

    if (target.type === 'animal.bandit' || target.type === 'animal.sabertooth') {
      score -= 0.9;
    } else if (target.type === 'animal.lion' || target.type === 'animal.bear') {
      score -= 0.45;
    }

    if (cacheKey && scoreCache) {
      scoreCache[cacheKey] = score;
    }

    return score;
  }

  function scheduleAnimalRespawn(target, balance) {
    var respawnTime = getEntityRespawnTimeSeconds(balance);
    target.respawnAt = Date.now() + (respawnTime * 1000);

    function tryAnimalRespawn() {
      if (!target || !target._destroyed) return;

      var relocated = false;
      if (window.GameTerrain && GameTerrain.relocateRespawnedAnimal) {
        relocated = GameTerrain.relocateRespawnedAnimal(target);
      }

      if (!relocated && window.GamePlayer) {
        var playerPos = GamePlayer.getPosition();
        var dx = Math.abs(target.worldX - playerPos.x);
        var dz = Math.abs(target.worldZ - playerPos.z);
        var safeDistance = getAnimalRespawnPlayerSafeDistance();
        if (dx < safeDistance && dz < safeDistance) {
          setTimeout(tryAnimalRespawn, getAnimalRespawnRetryDelayMs());
          return;
        }
      }

      target.hp = target.maxHp || (balance ? balance.hp : 1) || 1;
      target._destroyed = false;
      target.respawnAt = 0;
      if (typeof GameEntities !== 'undefined' && GameEntities.showObject) {
        GameEntities.showObject(target);
      }
    }

    setTimeout(tryAnimalRespawn, respawnTime * 1000);
  }

  function rewardWatchtowerKill(instanceUid, target, balance) {
    if (!balance || !balance.rewards) return;

    for (var resId in balance.rewards) {
      var amount = balance.rewards[resId] || 0;
      if (amount <= 0) continue;

      GameState.addResource(resId, amount);

      if (typeof GameHUD !== 'undefined' && GameHUD.showDamageNumber) {
        var entity = GameRegistry.getEntity(resId);
        var name = entity ? entity.name : resId;
        GameHUD.showDamageNumber(target.worldX, 1.35, target.worldZ, '+' + amount + ' ' + name, 'loot');
      }
    }
  }

  function applyWatchtowerDefense(instances) {
    instances = instances || getLiveInstances();
    var supportPools = getBarracksSupportPools(instances);

    var workers = (window.NPCSystem && NPCSystem.getAllNPCs) ? NPCSystem.getAllNPCs() : [];
    var activeWorkerThreats = getActiveWorkerThreats();
    var activeCombatTarget = (window.GameCombat && GameCombat.getTarget) ? GameCombat.getTarget() : null;

    for (var uid in instances) {
      var instance = instances[uid];
      if (!instance || instance.entityId !== 'building.watchtower') continue;

      var balance = GameRegistry.getBalance(instance.entityId) || {};
      var towerDefense = balance.towerDefense || {};
      var level = instance.level || 1;
      var range = getLevelConfigValue(towerDefense.range, level, getLevelConfigValue(balance.guardRadius, level, 0)) || 0;
      if (range <= 0) continue;

      var attackDamage = getLevelConfigValue(towerDefense.attackDamage, level, 1) || 1;
      var attackIntervalSeconds = getLevelConfigValue(towerDefense.attackIntervalSeconds, level, 2) || 2;
      var protectRadius = towerDefense.workerProtectRadius || 0;
      var priorityBonus = towerDefense.targetPriorityBonus || 0;
      var state = ensureWatchtowerState(instance);
      var reserveSupport = assignReserveSupportToTower(instance, supportPools);
      var hasReserveSupport = reserveSupport.linkedBarracksCount > 0;

      state.reserveSupport = reserveSupport;
      range += reserveSupport.rangeBonus;
      attackDamage += reserveSupport.attackDamageBonus;
      attackIntervalSeconds = Math.max(0.6, attackIntervalSeconds * reserveSupport.attackIntervalMultiplier);
      protectRadius += reserveSupport.workerProtectRadiusBonus;
      priorityBonus += reserveSupport.targetPriorityBonus;

      state.cooldownRemaining = Math.max(0, (Number(state.cooldownRemaining) || 0) - 1);

      var towerWorkers = (window.GameSpatialIndex && GameSpatialIndex.getNearbyWorkers)
        ? GameSpatialIndex.getNearbyWorkers(instance.x, instance.z, Math.max(range, protectRadius) + 2, { limit: 48 })
        : workers;
      var towerTargets = (window.GameSpatialIndex && GameSpatialIndex.getThreatAnimalsInRadius)
        ? GameSpatialIndex.getThreatAnimalsInRadius(instance.x, instance.z, range, { limit: 64 })
        : getLoadedAnimalTargets();
      var scoreCache = Object.create(null);

      var bestTarget = null;
      var bestScore = Infinity;
      for (var i = 0; i < towerTargets.length; i++) {
        var target = towerTargets[i];
        if (!target || target.hp <= 0 || target._destroyed) continue;
        if (activeCombatTarget && activeCombatTarget.id === target.id) continue;

        var dx = target.worldX - instance.x;
        var dz = target.worldZ - instance.z;
        var distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > range) continue;

        var score = scoreThreatForTower(target, instance, towerWorkers, protectRadius, priorityBonus, activeWorkerThreats, scoreCache);
        if (score < bestScore) {
          bestScore = score;
          bestTarget = target;
        }
      }

      if (!bestTarget) {
        state.statusLabel = state.cooldownRemaining > 0 ? 'Rearming' : (hasReserveSupport ? 'Scanning with reserve support' : 'Scanning for threats');
        state.lastTargetType = null;
        continue;
      }

      if (state.cooldownRemaining > 0) {
        var targetEntityWaiting = GameRegistry.getEntity(bestTarget.type);
        state.statusLabel = (hasReserveSupport ? 'Coordinating ' : 'Tracking ') + (targetEntityWaiting ? targetEntityWaiting.name : 'target');
        state.lastTargetType = bestTarget.type;
        continue;
      }

      var targetBalance = GameRegistry.getBalance(bestTarget.type) || {};
      var targetDefense = bestTarget.defense !== undefined ? bestTarget.defense : (targetBalance.defense || 0);
      var damage = Math.max(1, attackDamage - targetDefense);
      bestTarget.hp -= damage;
      state.cooldownRemaining = attackIntervalSeconds;
      state.lastTargetType = bestTarget.type;
      state.statusLabel = (hasReserveSupport ? 'Coordinated fire on ' : 'Firing on ') + ((GameRegistry.getEntity(bestTarget.type) || {}).name || 'threat');
      state.shotsFired = (state.shotsFired || 0) + 1;
      state.lastActionTick = _tickCount;

      if (typeof GameHUD !== 'undefined' && GameHUD.showDamageNumber) {
        GameHUD.showDamageNumber(bestTarget.worldX, 1.0, bestTarget.worldZ, '-' + damage, 'damage');
      }
      if (typeof ParticleSystem !== 'undefined') {
        ParticleSystem.emit('combatHit', { x: bestTarget.worldX, y: 0.8, z: bestTarget.worldZ }, { color: 0xE76F51 });
      }

      if (bestTarget.hp <= 0) {
        bestTarget.hp = 0;
        bestTarget._destroyed = true;
        state.kills = (state.kills || 0) + 1;
        state.statusLabel = (hasReserveSupport ? 'Reserve line dropped ' : 'Dropped ') + ((GameRegistry.getEntity(bestTarget.type) || {}).name || 'threat');

        rewardWatchtowerKill(uid, bestTarget, targetBalance);

        if (typeof GameEntities !== 'undefined' && GameEntities.hideObject) {
          GameEntities.hideObject(bestTarget);
        }
        if (typeof ParticleSystem !== 'undefined') {
          ParticleSystem.emit('deathBurst', { x: bestTarget.worldX, y: 0.5, z: bestTarget.worldZ });
        }

        scheduleAnimalRespawn(bestTarget, targetBalance);
      }
    }
  }

  /**
   * Transfer storage from production buildings to nearby Warehouses
   */
  function transferToWarehouses(instances) {
    instances = instances || getLiveInstances();
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

  function applyHunger() {
    var drain = GameState.getHungerDrainPerSecond();

    // Double hunger drain when regenerating HP
    var isRegen = (typeof GamePlayer !== 'undefined') && GamePlayer.isRegenerating && GamePlayer.isRegenerating();
    var regenMult = isRegen ? GameState.getRegenHungerMultiplier() : 1.0;

    var currentHunger = GameState.getHunger();
    var newHunger = currentHunger - (drain * regenMult);

    // Starving: drain HP
    if (newHunger <= 0) {
      var hpDrain = GameState.getStarvingHpDrain();
      var player = GameState.getPlayer();
      var newHp = player.hp - hpDrain;
      GameState.setPlayerHP(newHp);
      newHunger = 0;

      // Check starvation death
      if (newHp <= 0) {
        GameState.setPlayerHP(GameState.getPlayerMaxHp());
        if (typeof GamePlayer !== 'undefined' && GamePlayer.setPosition) {
          var spawn = GameState.getPlayerSpawnPosition();
          GamePlayer.setPosition(spawn.x, spawn.z);
        }
        // Lose 30% resources
        var resourceLossFraction = GameState.getStarvationResourceLossFraction();
        var resources = GameState.getAllResources();
        for (var id in resources) {
          var lost = Math.floor(resources[id] * resourceLossFraction);
          if (lost > 0) GameState.addResource(id, -lost);
        }
        GameState.setHunger(GameState.getMaxHunger() * GameState.getStarvationRespawnHungerFraction());
        if (typeof GameHUD !== 'undefined' && GameHUD.showNotification) {
          GameHUD.showNotification("You starved. Lost " + Math.round(resourceLossFraction * 100) + "% of carried resources.");
        }
      }
    }

    GameState.setHunger(Math.max(0, newHunger));
  }

  function applyFireFuelDrain(instances) {
    // Only drain fuel at night when fire is burning
    if (typeof DayNightSystem === 'undefined') return;
    if (!DayNightSystem.isNight()) return;

    instances = instances || getLiveInstances();
    for (var uid in instances) {
      var inst = instances[uid];
      var balance = GameRegistry.getBalance(inst.entityId);
      if (!balance || !balance.lightRadius) continue;

      var fuelPerSecond = balance.fuelPerSecond || 1;
      var fuelData = GameState.getFireFuelData(uid);

      if (!fuelData) {
        var maxFuel = Number(balance.fuelCapacity) || 0;
        GameState.setFireFuel(uid, maxFuel);
        fuelData = GameState.getFireFuelData(uid);
      }

      if (fuelData && fuelData.current > 0) {
        GameState.setFireFuel(uid, fuelData.current - fuelPerSecond);
      }
    }
  }

  function getResourceStats() {
    return Object.assign({}, _resourceStats);
  }

  function getTickCount() { return _tickCount; }

  function tickPausedOnly() {
    _tickCount++;
    var pausedAutosaveIntervalTicks = getPausedAutosaveIntervalTicks();
    if (pausedAutosaveIntervalTicks > 0 && _tickCount % pausedAutosaveIntervalTicks === 0) {
      GameStorage.save({ delayMs: 1600 });
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
