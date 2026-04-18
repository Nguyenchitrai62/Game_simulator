window.GameActions = (function () {

  function startBuild(buildingId) {
    BuildingSystem.placeAtPlayer(buildingId);
  }

  function craft(recipeId) {
    var success = CraftSystem.craft(recipeId);

    if (success) {
      var recipeEntity = GameRegistry.getEntity(recipeId);
      GameStorage.save();
      var name = recipeEntity ? recipeEntity.name : recipeId;
      GameHUD.showSuccess(`Crafted: ${name}`);
      if (typeof GamePlayer !== 'undefined' && GamePlayer.updateEquipmentVisuals) {
        GamePlayer.updateEquipmentVisuals();
      }
    }

    GameHUD.renderAll();
    GameHUD.updateModal();
  }

  function equip(equipmentId) {
    GameState.equipItem(equipmentId);
    GameHUD.renderAll();
    GameHUD.updateModal();
    if (typeof GamePlayer !== 'undefined' && GamePlayer.updateEquipmentVisuals) {
      GamePlayer.updateEquipmentVisuals();
    }
  }

  function unequip(slot) {
    GameState.unequipSlot(slot);
    GameHUD.renderAll();
    GameHUD.updateModal();
    if (typeof GamePlayer !== 'undefined' && GamePlayer.updateEquipmentVisuals) {
      GamePlayer.updateEquipmentVisuals();
    }
  }

  function saveGame() {
    if (GameStorage.saveNow) GameStorage.saveNow();
    else GameStorage.save();
    GameHUD.showNotification("Saved now. Autosave remains active.");
  }

  function resetGame() {
    if (!confirm("Reset all progress?")) return;
    GameStorage.clearSave();
    window.location.reload();
  }

  function upgrade(buildingId, instanceUid) {
    var check = UpgradeSystem.canUpgrade(buildingId, instanceUid);
    if (!check.can) {
      GameHUD.showError(check.reason || "Cannot upgrade");
      return;
    }

    var newLevel = UpgradeSystem.upgrade(buildingId, instanceUid);
    if (newLevel) {
      var entity = GameRegistry.getEntity(buildingId);
      var buildingName = entity ? entity.name : buildingId;
      GameStorage.save();
      GameHUD.showSuccess(buildingName + " upgraded to Level " + newLevel + "!");
      GameHUD.renderAll();
      GameHUD.selectInstance(instanceUid);
    } else {
      GameHUD.showError("Upgrade failed");
    }
  }

  function collectFromBuilding(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance) {
      GameHUD.showError("Building not found");
      return;
    }
    
    var collected = GameState.collectFromBuilding(instanceUid);
    var hasSomething = false;
    var parts = [];
    
    for (var resId in collected) {
      if (collected[resId] > 0) {
        hasSomething = true;
        var entity = GameRegistry.getEntity(resId);
        var name = entity ? entity.name : resId;
        parts.push("+" + collected[resId] + " " + name);
      }
    }
    
    if (hasSomething) {
      GameStorage.save();
      GameHUD.showSuccess("Collected: " + parts.join(", "));
      GameHUD.renderAll();
      
      // Refresh inspector to show empty storage
      var buildingEntity = GameRegistry.getEntity(instance.entityId);
      if (buildingEntity) {
        GameHUD.selectInstance(instanceUid);
      }
    } else {
      GameHUD.showNotification("Storage is empty.");
    }
  }

  function refuel(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance) return;

    var balance = GameRegistry.getBalance(instance.entityId);
    if (!balance || !balance.refuelCost) return;

    var fuelData = GameState.getFireFuelData ? GameState.getFireFuelData(instanceUid) : null;
    var maxFuel = balance.fuelCapacity || 999;
    var currentFuel = fuelData ? fuelData.current : maxFuel;
    if (currentFuel >= maxFuel) {
      GameHUD.showNotification("Fuel is already full.");
      return;
    }

    // Check if can afford refuel
    for (var resId in balance.refuelCost) {
      if (!GameState.hasSpendableResource(resId, balance.refuelCost[resId])) {
        GameHUD.showError("Not enough fuel.");
        return;
      }
    }

    // Deduct refuel cost
    for (var resId in balance.refuelCost) {
      GameState.consumeSpendableResource(resId, balance.refuelCost[resId]);
    }

    // Add fuel
    var refillAmount = maxFuel - currentFuel;
    if (GameState.addFireFuel) {
      GameState.addFireFuel(instanceUid, refillAmount);
    }

    GameStorage.save();
    GameHUD.showSuccess("Refueled successfully.");
    GameHUD.renderAll();
    GameHUD.selectInstance(instanceUid);
    if (instance.entityId === 'building.campfire' && typeof GamePlayer !== 'undefined' && GamePlayer.triggerSpeechCue) {
      GamePlayer.triggerSpeechCue('fireAction');
    }
  }

  function getLevelConfigValue(config, level, fallbackValue) {
    if (!config) return fallbackValue;
    if (typeof config === 'number') return config;
    if (config[level] !== undefined) return config[level];
    if (config[1] !== undefined) return config[1];
    return fallbackValue;
  }

  function canAffordCostMap(costMap) {
    if (!costMap) return true;
    for (var resId in costMap) {
      if (!GameState.hasSpendableResource(resId, costMap[resId])) return false;
    }
    return true;
  }

  function getBarracksUnitConfig(instanceUid, unitType) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance || instance.entityId !== 'building.barracks') return null;

    var balance = GameRegistry.getBalance(instance.entityId) || {};
    var military = balance.military || {};
    var unitConfig = military.units ? military.units[unitType] : null;
    if (!unitConfig) return null;

    return {
      instance: instance,
      balance: balance,
      military: military,
      level: instance.level || 1,
      unitType: unitType,
      unitConfig: unitConfig
    };
  }

  function getBarracksStatus(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance || instance.entityId !== 'building.barracks') return null;

    var balance = GameRegistry.getBalance(instance.entityId) || {};
    var military = balance.military || {};
    var level = instance.level || 1;
    var state = GameState.getBarracksState ? GameState.getBarracksState(instanceUid) : null;
    var queue = state && Array.isArray(state.queue) ? state.queue : [];
    var reserves = state && state.reserves ? state.reserves : {};
    var queueCapacity = getLevelConfigValue(military.queueSize, level, 1) || 1;
    var trainingSpeed = getLevelConfigValue(military.trainingSpeed, level, 1) || 1;
    var reserveCapacity = getLevelConfigValue(balance.guardCount, level, Infinity);
    var supportRange = getLevelConfigValue(balance.guardRadius, level, 0) || 0;
    var commandMode = state && state.commandMode === 'follow' ? 'follow' : 'guard';
    var troopSummary = (window.BarracksTroopSystem && BarracksTroopSystem.getBarracksTroopSummary)
      ? BarracksTroopSystem.getBarracksTroopSummary(instanceUid)
      : null;
    var reserveCount = 0;
    var reserveEntries = [];
    var availableUnits = [];
    var nextUnlock = null;
    var unitDefs = military.units || {};

    for (var reserveType in reserves) {
      var reserveAmount = reserves[reserveType] || 0;
      if (reserveAmount <= 0) continue;
      reserveCount += reserveAmount;
      var reserveEntity = unitDefs[reserveType] || {};
      reserveEntries.push({
        unitType: reserveType,
        label: reserveEntity.label || reserveType,
        amount: reserveAmount
      });
    }

    for (var unitType in unitDefs) {
      var unitConfig = unitDefs[unitType] || {};
      var unlockLevel = unitConfig.unlockLevel || 1;
      var unlocked = unlockLevel <= level;
      if (!unlocked) {
        if (!nextUnlock || unlockLevel < nextUnlock.level) {
          nextUnlock = {
            level: unlockLevel,
            unitType: unitType,
            label: unitConfig.label || unitType
          };
        }
      }
      availableUnits.push({
        unitType: unitType,
        label: unitConfig.label || unitType,
        role: unitConfig.role || '',
        towerSupportLabel: unitConfig.towerSupport ? (unitConfig.towerSupport.label || '') : '',
        unlockLevel: unlockLevel,
        unlocked: unlocked,
        cost: unitConfig.cost || {},
        costText: formatYieldMap(unitConfig.cost || {}),
        trainingSeconds: Math.max(1, unitConfig.trainingSeconds || 1),
        canAfford: unlocked && canAffordCostMap(unitConfig.cost || {})
      });
    }

    var queueEntries = queue.map(function(entry) {
      var unitConfig = unitDefs[entry.unitType] || {};
      var totalSeconds = Math.max(1, Number(entry.totalSeconds) || 1);
      var remainingSeconds = Math.max(0, Number(entry.remainingSeconds) || 0);
      return {
        unitType: entry.unitType,
        label: unitConfig.label || entry.unitType,
        remainingSeconds: Math.ceil(remainingSeconds),
        totalSeconds: totalSeconds,
        progressPercent: Math.max(0, Math.min(100, Math.round((1 - (remainingSeconds / totalSeconds)) * 100)))
      };
    });

    return {
      instanceUid: instanceUid,
      level: level,
      commandMode: commandMode,
      commandModeLabel: troopSummary ? troopSummary.modeLabel : (commandMode === 'follow' ? 'Follow Player' : 'Guard Nearby'),
      queue: queueEntries,
      queueUsed: queueEntries.length,
      queueCapacity: queueCapacity,
      trainingSpeed: trainingSpeed,
      reserveCount: reserveCount,
      reserveCapacity: reserveCapacity,
      reserves: reserveEntries,
      deployedCount: troopSummary ? troopSummary.troopCount : reserveCount,
      engagedCount: troopSummary ? troopSummary.engagedCount : 0,
      troopSummaryText: troopSummary ? troopSummary.unitSummaryText : (reserveEntries.length ? reserveEntries.map(function(entry) {
        return entry.label + ': ' + entry.amount;
      }).join(' | ') : 'No deployed troops'),
      troopStatusText: troopSummary ? troopSummary.statusText : 'Train units to deploy them around this barracks.',
      supportRange: supportRange,
      availableUnits: availableUnits,
      nextUnlock: nextUnlock,
      canQueueMore: queueEntries.length < queueCapacity && (reserveCount + queueEntries.length) < reserveCapacity
    };
  }

  function setBarracksCommandMode(instanceUid, mode) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance || instance.entityId !== 'building.barracks') {
      GameHUD.showError('Barracks not found.');
      return false;
    }

    var nextMode = mode === 'follow' ? 'follow' : 'guard';
    var state = GameState.getBarracksStateLive ? GameState.getBarracksStateLive(instanceUid) : GameState.getBarracksState(instanceUid);
    if (!state) {
      GameHUD.showError('Barracks save state unavailable.');
      return false;
    }

    if (state.commandMode === nextMode) {
      GameHUD.selectInstance(instanceUid);
      return true;
    }

    if (window.BarracksTroopSystem && BarracksTroopSystem.setBarracksCommandMode) {
      BarracksTroopSystem.setBarracksCommandMode(instanceUid, nextMode);
    } else {
      state.commandMode = nextMode;
      GameState.setBarracksState(instanceUid, state);
    }

    GameStorage.save();
    GameHUD.showSuccess(nextMode === 'follow'
      ? 'Barracks troops are now following the player.'
      : 'Barracks troops are guarding nearby animals.');
    GameHUD.renderAll();
    GameHUD.selectInstance(instanceUid);
    GameHUD.updateModal();
    return true;
  }

  function queueBarracksTraining(instanceUid, unitType) {
    var unitData = getBarracksUnitConfig(instanceUid, unitType);
    if (!unitData) {
      GameHUD.showError('Barracks not found.');
      return false;
    }

    var status = getBarracksStatus(instanceUid);
    if (!status) {
      GameHUD.showError('Barracks data unavailable.');
      return false;
    }

    var unitConfig = unitData.unitConfig;
    var unlockLevel = unitConfig.unlockLevel || 1;
    if (status.level < unlockLevel) {
      GameHUD.showError((unitConfig.label || unitType) + ' unlocks at Barracks level ' + unlockLevel + '.');
      return false;
    }
    if (status.queueUsed >= status.queueCapacity) {
      GameHUD.showError('Training queue is full.');
      return false;
    }
    if ((status.reserveCount + status.queueUsed) >= status.reserveCapacity) {
      GameHUD.showError('Barracks reserve is full. Upgrade to support more units.');
      return false;
    }
    if (!canAffordCostMap(unitConfig.cost || {})) {
      GameHUD.showError('Not enough resources to train ' + (unitConfig.label || unitType) + '.');
      return false;
    }

    var state = GameState.getBarracksState ? GameState.getBarracksState(instanceUid) : null;
    if (!state) {
      GameHUD.showError('Barracks save state unavailable.');
      return false;
    }

    for (var resId in unitConfig.cost) {
      GameState.consumeSpendableResource(resId, unitConfig.cost[resId]);
    }

    var trainingSeconds = Math.max(1, unitConfig.trainingSeconds || 1);
    state.queue.push({
      unitType: unitType,
      remainingSeconds: trainingSeconds,
      totalSeconds: trainingSeconds,
      queuedAt: TickSystem.getTickCount ? TickSystem.getTickCount() : 0
    });
    GameState.setBarracksState(instanceUid, state);

    GameStorage.save();
    GameHUD.showSuccess('Queued ' + (unitConfig.label || unitType) + ' training.');
    GameHUD.renderAll();
    GameHUD.selectInstance(instanceUid);
    GameHUD.updateModal();
    return true;
  }

  function ensureWatchtowerState(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance) return null;

    if (!instance.watchtowerState) {
      instance.watchtowerState = {};
    }
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

  function getWatchtowerStatus(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance || instance.entityId !== 'building.watchtower') return null;

    var balance = GameRegistry.getBalance(instance.entityId) || {};
    var level = instance.level || 1;
    var towerDefense = balance.towerDefense || {};
    var state = ensureWatchtowerState(instanceUid);
    var targetEntity = state && state.lastTargetType ? GameRegistry.getEntity(state.lastTargetType) : null;
    var reserveSupport = state && state.reserveSupport ? state.reserveSupport : {};
    var baseRange = getLevelConfigValue(towerDefense.range, level, getLevelConfigValue(balance.guardRadius, level, 0)) || 0;
    var baseAttackDamage = getLevelConfigValue(towerDefense.attackDamage, level, 1) || 1;
    var baseAttackIntervalSeconds = getLevelConfigValue(towerDefense.attackIntervalSeconds, level, 2) || 2;
    var baseProtectRadius = towerDefense.workerProtectRadius || 0;
    var attackIntervalMultiplier = Number(reserveSupport.attackIntervalMultiplier) > 0 ? Number(reserveSupport.attackIntervalMultiplier) : 1;
    var rangeBonus = Number(reserveSupport.rangeBonus) || 0;
    var attackDamageBonus = Number(reserveSupport.attackDamageBonus) || 0;
    var protectRadiusBonus = Number(reserveSupport.workerProtectRadiusBonus) || 0;

    return {
      level: level,
      range: baseRange + rangeBonus,
      baseRange: baseRange,
      rangeBonus: rangeBonus,
      attackDamage: baseAttackDamage + attackDamageBonus,
      baseAttackDamage: baseAttackDamage,
      attackDamageBonus: attackDamageBonus,
      attackIntervalSeconds: Math.max(0.6, baseAttackIntervalSeconds * attackIntervalMultiplier),
      baseAttackIntervalSeconds: baseAttackIntervalSeconds,
      attackIntervalMultiplier: attackIntervalMultiplier,
      workerProtectRadius: baseProtectRadius + protectRadiusBonus,
      baseWorkerProtectRadius: baseProtectRadius,
      workerProtectRadiusBonus: protectRadiusBonus,
      targetPriorityBonus: (towerDefense.targetPriorityBonus || 0) + (Number(reserveSupport.targetPriorityBonus) || 0),
      reserveSupportLabel: reserveSupport.supportLabel || 'No barracks reserve link',
      linkedBarracksCount: reserveSupport.linkedBarracksCount || 0,
      swordsmanSupport: reserveSupport.swordsman || 0,
      archerSupport: reserveSupport.archer || 0,
      statusLabel: state ? state.statusLabel : 'Scanning for threats',
      cooldownRemaining: state ? Math.max(0, Number(state.cooldownRemaining) || 0) : 0,
      lastTargetName: targetEntity ? targetEntity.name : '',
      shotsFired: state ? (state.shotsFired || 0) : 0,
      kills: state ? (state.kills || 0) : 0
    };
  }

  function formatShortDuration(seconds) {
    var totalSeconds = Math.max(0, Math.floor(seconds || 0));
    if (totalSeconds < 60) return totalSeconds + 's';

    var minutes = Math.floor(totalSeconds / 60);
    var remainder = totalSeconds % 60;
    if (minutes >= 10 || remainder === 0) return minutes + 'm';
    return minutes + 'm ' + remainder + 's';
  }

  function getLoadedAggressiveAnimals() {
    var animals = [];
    if (!window.GameTerrain || !GameTerrain.getAllChunks) return animals;

    var chunks = GameTerrain.getAllChunks();
    for (var key in chunks) {
      var chunk = chunks[key];
      if (!chunk || !chunk.objects) continue;

      for (var i = 0; i < chunk.objects.length; i++) {
        var obj = chunk.objects[i];
        if (!obj || !obj.type || obj.type.indexOf('animal.') !== 0) continue;
        if (obj.hp <= 0 || obj._destroyed) continue;
        if (window.GameRegistry && GameRegistry.isAnimalThreat && !GameRegistry.isAnimalThreat(obj.type)) continue;

        var balance = GameRegistry.getBalance(obj.type) || {};
        animals.push({ object: obj, balance: balance });
      }
    }

    return animals;
  }

  var _settlementStatusCache = {
    key: '',
    value: null
  };

  function getSettlementThreatSignature(threatSummary) {
    if (!threatSummary) return '0|0|0';
    var topThreat = threatSummary.topThreat || {};
    return [
      threatSummary.count || 0,
      threatSummary.attackingCount || 0,
      threatSummary.nearbyCount || 0,
      topThreat.threatSourceId || '',
      topThreat.threatName || '',
      topThreat.buildingName || ''
    ].join('|');
  }

  function getSettlementStatus() {
    var isNight = typeof DayNightSystem !== 'undefined' && DayNightSystem.isNight();
    var tickCount = (window.TickSystem && TickSystem.getTickCount) ? TickSystem.getTickCount() : 0;
    var coreVersion = (window.GameState && GameState.getCoreStateVersion) ? GameState.getCoreStateVersion() : 0;
    var threatSummary = (window.NPCSystem && NPCSystem.getThreatenedWorkersSummary) ? NPCSystem.getThreatenedWorkersSummary() : null;
    var threatSignature = getSettlementThreatSignature(threatSummary);
    var cacheKey = [tickCount, coreVersion, isNight ? 1 : 0, threatSignature].join('|');
    if (_settlementStatusCache.key === cacheKey && _settlementStatusCache.value) {
      return _settlementStatusCache.value;
    }

    var status = {
      isNight: isNight,
      alerts: [],
      unlitPlots: 0,
      threatenedWorkers: 0,
      watchtowerCount: 0,
      supportedTowerCount: 0,
      barracksCount: 0,
      reserveCount: 0,
      trainingCount: 0,
      cacheKey: cacheKey
    };
    var toneOrder = { critical: 0, warning: 1, info: 2 };

    var resourceStats = (window.TickSystem && TickSystem.getResourceStats) ? TickSystem.getResourceStats() : null;
    var resourceWarnings = [];
    if (resourceStats && resourceStats.net) {
      for (var resId in resourceStats.net) {
        var netRate = resourceStats.net[resId] || 0;
        var timeLeft = resourceStats.timeLeft ? resourceStats.timeLeft[resId] : Infinity;
        if (netRate >= -0.001 || timeLeft === undefined || timeLeft === null || timeLeft === Infinity || timeLeft >= 180) continue;

        var resourceEntity = GameRegistry.getEntity(resId);
        resourceWarnings.push({
          resourceId: resId,
          label: resourceEntity ? resourceEntity.name : resId,
          timeLeft: timeLeft
        });
      }
    }

    resourceWarnings.sort(function(a, b) {
      return a.timeLeft - b.timeLeft;
    });

    if (resourceWarnings.length > 0) {
      var topResource = resourceWarnings[0];
      status.alerts.push({
        tone: topResource.timeLeft < 60 ? 'critical' : 'warning',
        icon: '⏳',
        label: topResource.label + ' deficit',
        detail: formatShortDuration(topResource.timeLeft) + ' left'
      });
    }

    var instances = GameState.getAllInstancesLive ? GameState.getAllInstancesLive() : GameState.getAllInstances();
    for (var uid in instances) {
      var instance = instances[uid];
      if (!instance) continue;

      var balance = GameRegistry.getBalance(instance.entityId) || {};
      if (status.isNight && balance.farming && window.FireSystem && FireSystem.getLightCoverageAt) {
        var coverage = FireSystem.getLightCoverageAt(instance.x, instance.z, { requireActive: true, includePlayerTorch: false });
        if (!coverage.lit) {
          status.unlitPlots++;
        }
      }

      if (instance.entityId === 'building.watchtower') {
        status.watchtowerCount++;
        var towerState = ensureWatchtowerState(uid);
        if (towerState && towerState.reserveSupport && towerState.reserveSupport.linkedBarracksCount > 0) {
          status.supportedTowerCount++;
        }
      } else if (instance.entityId === 'building.barracks') {
        status.barracksCount++;
        var barracksState = GameState.getBarracksStateLive ? GameState.getBarracksStateLive(uid) : (GameState.getBarracksState ? GameState.getBarracksState(uid) : null);
        if (barracksState) {
          status.trainingCount += Array.isArray(barracksState.queue) ? barracksState.queue.length : 0;
          var reserves = barracksState.reserves || {};
          for (var reserveType in reserves) {
            status.reserveCount += reserves[reserveType] || 0;
          }
        }
      }
    }

    if (status.unlitPlots > 0) {
      status.alerts.push({
        tone: 'warning',
        icon: '🔥',
        label: 'Night-light gap',
        detail: status.unlitPlots + ' plot' + (status.unlitPlots === 1 ? '' : 's') + ' paused'
      });
    }

    status.threatenedWorkers = threatSummary ? threatSummary.count : 0;
    if (status.threatenedWorkers > 0) {
      var topThreat = threatSummary ? threatSummary.topThreat : null;
      var isActiveAttack = threatSummary && threatSummary.attackingCount > 0;
      status.alerts.push({
        tone: isActiveAttack ? 'critical' : 'warning',
        icon: '⚠️',
        label: isActiveAttack ? 'Workers under attack' : 'Threat near workers',
        detail: status.threatenedWorkers + ' worker' + (status.threatenedWorkers === 1 ? '' : 's') + ' affected' + (topThreat ? (' • ' + topThreat.threatName + ' near ' + topThreat.buildingName) : '')
      });
    }

    if (status.watchtowerCount > 0 || status.barracksCount > 0 || status.reserveCount > 0 || status.trainingCount > 0) {
      var militaryParts = [];
      if (status.watchtowerCount > 0) militaryParts.push(status.watchtowerCount + ' tower' + (status.watchtowerCount === 1 ? '' : 's'));
      if (status.supportedTowerCount > 0) militaryParts.push(status.supportedTowerCount + ' supported');
      if (status.reserveCount > 0) militaryParts.push(status.reserveCount + ' reserve');
      if (status.trainingCount > 0) militaryParts.push(status.trainingCount + ' training');
      if (!militaryParts.length && status.barracksCount > 0) militaryParts.push(status.barracksCount + ' barracks');

      status.alerts.push({
        tone: (status.threatenedWorkers > 0 && status.watchtowerCount <= 0 && status.reserveCount <= 0) ? 'warning' : 'info',
        icon: '🛡️',
        label: 'Military',
        detail: militaryParts.join(' • ')
      });
    } else if (status.threatenedWorkers > 0) {
      status.alerts.push({
        tone: 'warning',
        icon: '🛡️',
        label: 'Military',
        detail: 'No active defense coverage'
      });
    }

    if (!status.alerts.length) {
      status.alerts.push({ tone: 'info', icon: '✓', label: 'Settlement stable', detail: 'No urgent shortages or threats' });
    }

    status.alerts.sort(function(a, b) {
      return (toneOrder[a.tone] || 99) - (toneOrder[b.tone] || 99);
    });
    status.alerts = status.alerts.slice(0, 4);
    _settlementStatusCache.key = cacheKey;
    _settlementStatusCache.value = status;
    return status;
  }

  function isFarmPlot(instance) {
    if (!instance) return false;
    var balance = GameRegistry.getBalance(instance.entityId);
    return !!(balance && balance.farming);
  }

  function getFarmConfig(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    var balance = instance ? GameRegistry.getBalance(instance.entityId) : null;
    return balance && balance.farming ? balance.farming : null;
  }

  function getFarmWorkerHint(instanceUid, farming) {
    if (farming && farming.workerHint) return farming.workerHint;
    return 'Needs a nearby resident worker.';
  }

  function formatYieldMap(yieldMap) {
    if (!yieldMap) return '';

    var parts = [];
    for (var resId in yieldMap) {
      var entity = GameRegistry.getEntity(resId);
      parts.push(yieldMap[resId] + ' ' + (entity ? entity.name : resId));
    }

    return parts.join(', ');
  }

  function cloneYieldMap(yieldMap) {
    var copy = {};
    if (!yieldMap) return copy;
    for (var resId in yieldMap) {
      copy[resId] = yieldMap[resId];
    }
    return copy;
  }

  function scaleYieldMap(yieldMap, multiplier) {
    var scaled = {};
    multiplier = multiplier || 1;
    if (!yieldMap) return scaled;

    for (var resId in yieldMap) {
      var amount = yieldMap[resId] || 0;
      if (amount <= 0) continue;
      scaled[resId] = Math.max(1, Math.round(amount * multiplier));
    }

    return scaled;
  }

  function findNearbyRiverSource(instance, rangeOverride, boostRadiusOverride) {
    if (!instance || typeof WaterSystem === 'undefined' || !WaterSystem.isWaterTile) return null;

    var searchRadius = Math.max(0, rangeOverride || 0);
    if (searchRadius <= 0) return null;

    var boostRadius = Math.max(0, boostRadiusOverride || 0);
    var nearest = null;
    var minX = Math.floor(instance.x - searchRadius);
    var maxX = Math.ceil(instance.x + searchRadius);
    var minZ = Math.floor(instance.z - searchRadius);
    var maxZ = Math.ceil(instance.z + searchRadius);

    for (var wx = minX; wx <= maxX; wx++) {
      for (var wz = minZ; wz <= maxZ; wz++) {
        if (!WaterSystem.isWaterTile(wx, wz)) continue;

        var dx = wx - instance.x;
        var dz = wz - instance.z;
        var distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > searchRadius) continue;

        if (!nearest || distance < nearest.distance) {
          nearest = {
            type: 'river',
            sourceX: wx,
            sourceZ: wz,
            distance: distance,
            boosted: boostRadius > 0 && distance <= boostRadius
          };
        }
      }
    }

    return nearest;
  }

  function findSupportingWell(instance, rangeOverride) {
    if (!instance) return null;

    var instances = GameState.getAllInstances();
    var bestWell = null;
    var bestDistance = Infinity;

    for (var uid in instances) {
      var candidate = instances[uid];
      if (!candidate || candidate.entityId !== 'building.well') continue;

      var balance = GameRegistry.getBalance(candidate.entityId) || {};
      var supportRange = rangeOverride || balance.waterRadius || 0;
      if (supportRange <= 0) continue;

      var dx = candidate.x - instance.x;
      var dz = candidate.z - instance.z;
      var distance = Math.sqrt(dx * dx + dz * dz);
      if (distance <= supportRange && distance < bestDistance) {
        bestDistance = distance;
        bestWell = candidate;
      }
    }

    return bestWell;
  }

  function getFarmWaterSupport(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    var farming = getFarmConfig(instanceUid);
    if (!isFarmPlot(instance) || !farming) {
      return {
        type: null,
        boosted: false,
        label: 'No nearby water source',
        sourceX: null,
        sourceZ: null,
        sourceUid: null,
        distance: Infinity
      };
    }

    var riverSource = findNearbyRiverSource(instance, farming.waterSearchRadius || farming.wellRange || 0, farming.riverBoostRadius || 0);
    if (riverSource) {
      riverSource.label = riverSource.boosted ? 'River boost active' : 'River in worker range';
      riverSource.sourceUid = null;
      return riverSource;
    }

    var supportWell = findSupportingWell(instance, farming.wellRange || farming.waterSearchRadius);
    if (supportWell) {
      var dx = supportWell.x - instance.x;
      var dz = supportWell.z - instance.z;
      return {
        type: 'well',
        boosted: false,
        label: 'Well in worker range',
        sourceX: supportWell.x,
        sourceZ: supportWell.z,
        sourceUid: supportWell.uid,
        distance: Math.sqrt(dx * dx + dz * dz)
      };
    }

    return {
      type: null,
      boosted: false,
      label: 'No nearby water source',
      sourceX: null,
      sourceZ: null,
      sourceUid: null,
      distance: Infinity
    };
  }

  function getFarmGrowthSeconds(instanceUid, farmStateOverride) {
    var farming = getFarmConfig(instanceUid);
    if (!farming) return 1;

    var farmState = farmStateOverride || GameState.getFarmState(instanceUid) || {};
    if (farmState.watered) {
      if (farmState.riverBoosted && farming.riverGrowthSeconds) {
        return Math.max(1, farming.riverGrowthSeconds);
      }
      return Math.max(1, farming.wateredGrowthSeconds || farming.dryGrowthSeconds || 1);
    }

    return Math.max(1, farming.dryGrowthSeconds || 1);
  }

  function getFarmYieldMap(instanceUid, farmStateOverride) {
    var farming = getFarmConfig(instanceUid);
    if (!farming) return {};

    var farmState = farmStateOverride || GameState.getFarmState(instanceUid) || {};
    if (farmState.watered) {
      if (farmState.riverBoosted) {
        if (farming.riverYield) return cloneYieldMap(farming.riverYield);
        if (farming.riverYieldMultiplier) return scaleYieldMap(farming.wateredYield, farming.riverYieldMultiplier);
      }
      return cloneYieldMap(farming.wateredYield);
    }

    return cloneYieldMap(farming.dryYield);
  }

  function getStoredResourceSummary(instanceUid) {
    var storage = GameState.getBuildingStorage(instanceUid);
    var totalAmount = 0;
    var parts = [];

    for (var resId in storage) {
      var amount = storage[resId] || 0;
      if (amount <= 0) continue;
      totalAmount += amount;
      var entity = GameRegistry.getEntity(resId);
      parts.push(amount + ' ' + (entity ? entity.name : resId));
    }

    return {
      totalAmount: totalAmount,
      text: parts.join(', ')
    };
  }

  function getFarmPlotStatus(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    var farming = getFarmConfig(instanceUid);
    if (!isFarmPlot(instance) || !farming) return null;

    var farmState = GameState.getFarmState(instanceUid) || { planted: false, watered: false, ready: false, progress: 0, waterSourceType: null, riverBoosted: false };
    var progressPercent = Math.max(0, Math.min(100, Math.floor((farmState.progress || 0) * 100)));
    var cropName = farming.cropName || 'Crop';
    var plotEntity = GameRegistry.getEntity(instance.entityId);
    var plotName = plotEntity ? plotEntity.name : 'Farm Plot';
    var support = getFarmWaterSupport(instanceUid);
    if (farmState.watered && !support.type && farmState.waterSourceType) {
      support = {
        type: farmState.waterSourceType,
        boosted: !!farmState.riverBoosted,
        label: farmState.riverBoosted ? 'River boost applied' : (farmState.waterSourceType === 'river' ? 'River water applied' : 'Well water applied'),
        sourceX: null,
        sourceZ: null,
        sourceUid: null,
        distance: Infinity
      };
    }

    var hasWaterSupport = !!support.type;
    var workerStatus = (window.NPCSystem && NPCSystem.getFarmWorkerStatus) ? NPCSystem.getFarmWorkerStatus(instanceUid) : null;
    var hasWorkerSupport = !!workerStatus;
    var isNight = typeof DayNightSystem !== 'undefined' && DayNightSystem.isNight();
    var nightLightCoverage = (window.FireSystem && FireSystem.getLightCoverageAt)
      ? FireSystem.getLightCoverageAt(instance.x, instance.z, { requireActive: true, includePlayerTorch: false })
      : { lit: !isNight, label: isNight ? 'Outside active light' : 'Daytime' };
    var nightWorkBlocked = isNight && !nightLightCoverage.lit;
    var currentYieldMap = getFarmYieldMap(instanceUid, farmState);
    var storedSummary = getStoredResourceSummary(instanceUid);
    var currentYieldText = formatYieldMap(currentYieldMap);
    var dryYieldText = formatYieldMap(farming.dryYield);
    var wateredYieldText = formatYieldMap(farming.wateredYield);
    var riverYieldText = formatYieldMap(farming.riverYield || getFarmYieldMap(instanceUid, { watered: true, riverBoosted: true }));
    var growthSeconds = getFarmGrowthSeconds(instanceUid, farmState);
    var workerHint = getFarmWorkerHint(instanceUid, farming);
    var statusText = 'Idle';
    var action = storedSummary.totalAmount > 0 ? 'collect' : 'auto';
    var actionLabel = storedSummary.totalAmount > 0 ? 'Collect' : 'Auto';
    var detailText = workerHint;

    if (farmState.planted && farmState.ready) {
      statusText = 'Ready';
      detailText = 'Worker is about to harvest ' + currentYieldText + '.';
    } else if (farmState.planted && farmState.watered) {
      statusText = farmState.riverBoosted ? 'River-fed' : 'Watered';
      detailText = 'Growing ' + progressPercent + '% • ' + growthSeconds + 's cycle • ' + currentYieldText;
    } else if (farmState.planted) {
      statusText = hasWaterSupport ? 'Needs Water' : 'Dry';
      detailText = hasWaterSupport ? ('Waiting for water • ' + progressPercent + '%') : ('No water source • ' + progressPercent + '%');
    } else if (hasWorkerSupport) {
      detailText = 'Nearby resident will plant automatically.';
    } else {
      statusText = 'Needs Worker';
    }

    if (nightWorkBlocked) {
      statusText = farmState.ready ? 'Night Paused' : 'Unlit at Night';
      if (farmState.ready) {
        detailText = cropName + ' is ready, but workers stop here at night until a fueled campfire covers this plot.';
      } else if (farmState.planted) {
        detailText = cropName + ' keeps growing, but workers pause here at night until active campfire light reaches this plot.';
      } else {
        detailText = 'Workers will not plant here at night until active campfire light covers this plot.';
      }
    }

    if (workerStatus && workerStatus.text) {
      detailText = workerStatus.text;
      if (farmState.planted && !farmState.ready) {
        detailText += ' • ' + progressPercent + '%';
      }
    } else if (!hasWorkerSupport && storedSummary.totalAmount <= 0) {
      if (farmState.ready) {
        detailText = cropName + ' is ready, but ' + workerHint.toLowerCase();
      } else if (farmState.planted) {
        detailText = cropName + ' is waiting for worker support.';
      }
    }

    return {
      uid: instanceUid,
      plotName: plotName,
      cropName: cropName,
      planted: !!farmState.planted,
      watered: !!farmState.watered,
      ready: !!farmState.ready,
      progress: farmState.progress || 0,
      progressPercent: progressPercent,
      waterSourceType: farmState.waterSourceType || null,
      riverBoosted: !!farmState.riverBoosted,
      statusText: statusText,
      action: action,
      actionLabel: actionLabel,
      detailText: detailText,
      canPlant: false,
      canWater: false,
      canHarvest: false,
      hasWorkerSupport: hasWorkerSupport,
      hasWaterSupport: hasWaterSupport,
      isNight: isNight,
      nightWorkBlocked: nightWorkBlocked,
      nightLightLabel: nightWorkBlocked ? 'Outside active campfire light' : (isNight ? (nightLightCoverage.label || 'Campfire coverage active') : 'Daytime'),
      supportSourceType: support.type,
      supportSourceName: support.label,
      dryYieldText: dryYieldText,
      wateredYieldText: wateredYieldText,
      riverYieldText: riverYieldText,
      currentYieldText: currentYieldText,
      growthSeconds: growthSeconds,
      workerHint: workerHint,
      storedAmount: storedSummary.totalAmount,
      storedSummaryText: storedSummary.text,
      workerStatusText: workerStatus ? workerStatus.text : (nightWorkBlocked ? 'Night pause: outside active campfire light' : workerHint)
    };
  }

  function plantCrop(instanceUid) {
    GameHUD.showNotification('Residents handle planting automatically.');
    return false;
  }

  function waterCrop(instanceUid) {
    GameHUD.showNotification('Residents fetch water automatically.');
    return false;
  }

  function harvestCrop(instanceUid) {
    GameHUD.showNotification('Residents harvest crops automatically.');
    return false;
  }

  function interactWithFarmPlot(instanceUid) {
    var storedSummary = getStoredResourceSummary(instanceUid);
    if (storedSummary.totalAmount > 0) {
      collectFromBuilding(instanceUid);
      return true;
    }

    var status = getFarmPlotStatus(instanceUid);
    if (!status) return false;

    GameHUD.showNotification(status.detailText || 'Worker is tending this plot.');
    return false;
  }

  function advanceAge(ageId) {
    var ageEntity = GameRegistry.getEntity(ageId);
    if (!ageEntity || ageEntity.type !== 'age') {
      GameHUD.showError("Invalid age");
      return;
    }

    var balance = GameRegistry.getBalance(ageId);
    if (!balance || !balance.advanceFrom) {
      GameHUD.showError("Cannot advance to this age");
      return;
    }

    var conditions = balance.advanceFrom;

    // Check age requirement
    if (conditions.age && GameState.getAge() !== conditions.age) {
      GameHUD.showError("Must be in " + conditions.age + " first");
      return;
    }

    // Check resource requirements
    if (conditions.resources) {
      for (var resId in conditions.resources) {
        var needed = conditions.resources[resId];
        if (!GameState.hasSpendableResource(resId, needed)) {
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          GameHUD.showError("Need " + needed + " " + resName);
          return;
        }
      }
    }

    // Check building requirements
    if (conditions.buildings) {
      for (var buildingId in conditions.buildings) {
        var needed = conditions.buildings[buildingId];
        var current = GameState.getBuildingCount(buildingId);
        if (current < needed) {
          var buildingEntity = GameRegistry.getEntity(buildingId);
          var buildingName = buildingEntity ? buildingEntity.name : buildingId;
          GameHUD.showError("Need " + needed + " " + buildingName + " (have " + current + ")");
          return;
        }
      }
    }

    // All conditions met - advance age
    GameState.setAge(ageId);
    
    // Add starting resources for new age
    if (balance.startResources) {
      for (var resId in balance.startResources) {
        GameState.addResource(resId, balance.startResources[resId]);
      }
    }

    // Check for newly unlocked content
    UnlockSystem.checkAll();
    UnlockSystem.checkAll(); // Second pass for chain dependencies

    GameStorage.save();
    GameHUD.showSuccess("Advanced to " + ageEntity.name + "!");
    GameHUD.renderAll();
  }

  return {
    startBuild: startBuild,
    craft: craft,
    equip: equip,
    unequip: unequip,
    saveGame: saveGame,
    resetGame: resetGame,
    advanceAge: advanceAge,
    upgrade: upgrade,
    collectFromBuilding: collectFromBuilding,
    refuel: refuel,
    getBarracksStatus: getBarracksStatus,
    setBarracksCommandMode: setBarracksCommandMode,
    queueBarracksTraining: queueBarracksTraining,
    getWatchtowerStatus: getWatchtowerStatus,
    getSettlementStatus: getSettlementStatus,
    getFarmWaterSupport: getFarmWaterSupport,
    getFarmGrowthSeconds: getFarmGrowthSeconds,
    getFarmYieldMap: getFarmYieldMap,
    getFarmPlotStatus: getFarmPlotStatus,
    interactWithFarmPlot: interactWithFarmPlot,
    plantCrop: plantCrop,
    waterCrop: waterCrop,
    harvestCrop: harvestCrop,
    researchTech: function(techId) {
      if (!window.ResearchSystem) return;
      if (ResearchSystem.research(techId)) {
        var techEntity = GameRegistry.getEntity(techId);
        GameStorage.save();
        GameHUD.showSuccess('Researched: ' + (techEntity ? techEntity.name : techId));
        GameHUD.renderAll();
        GameHUD.updateModal();
      } else {
        GameHUD.showError('Cannot research this technology');
      }
    }
  };
})();

// === GAME INITIALIZATION ===
(function () {
  function setLoadProgress(pct, text) {
    var bar = document.getElementById('loading-bar');
    var txt = document.getElementById('loading-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = text || 'Loading...';
  }

  setLoadProgress(5, 'Initializing registry...');
  GameRegistry.init();

  setLoadProgress(15, 'Checking save data...');
  var versionCheck = GameStorage.checkVersion();
  var loaded = false;

  // Force reset if save is from old version (pre-2.0)
  if (GameStorage.hasSave()) {
    if (!versionCheck.match) {
      console.log("[Game] Old save detected (" + versionCheck.saved + "), resetting for v" + versionCheck.current);
      GameStorage.clearSave();
    } else {
      loaded = GameStorage.load();
    }
  }

  if (!loaded) {
    GameState.init();
  }

  GameState.setVersion(window.GAME_MANIFEST.version);

  setLoadProgress(25, 'Loading 3D...');

  GameScene.init();

  if (!GameScene.getScene()) {
    console.error('[Game] FAILED: 3D Scene failed to initialize!');
    var ls = document.getElementById('loading-screen');
    if (ls) ls.innerHTML = '<div style="color:#ff4444;font-family:monospace;font-size:16px;">ERROR: 3D rendering failed.<br>Check browser console (F12).</div>';
    return;
  }

  setLoadProgress(35, 'Loading terrain...');
  var stateExport = GameState.exportState();
  GameTerrain.init(stateExport.worldSeed);

  // Initialize NPC system
  if (typeof NPCSystem !== 'undefined') {
    NPCSystem.init();
  }

  // Initialize player
  var playerData = GameState.getPlayer();
  GamePlayer.init(playerData.x, playerData.z);

  setLoadProgress(50, 'Spawning world...');
  GameTerrain.update(playerData.x, playerData.z);

  setLoadProgress(60, 'Restoring buildings...');
  var instances = GameState.getAllInstances();
  for (var uid in instances) {
    var inst = instances[uid];
    var entity = GameRegistry.getEntity(inst.entityId);
    if (entity) {
      var buildingLevel = inst.level || 1;
      var mesh = BuildingSystem.createBuildingMesh(entity, buildingLevel, false, inst);
      if (mesh) {
        mesh.position.set(inst.x, 0, inst.z);
        mesh.userData.instanceUid = uid;
        if (BuildingSystem.registerInstanceMesh) {
          BuildingSystem.registerInstanceMesh(uid, mesh);
        }
        GameScene.getScene().add(mesh);
      }
      
      // Spawn NPCs for this building
      if (typeof NPCSystem !== 'undefined' && NPCSystem.spawnWorkersForBuilding) {
        NPCSystem.spawnWorkersForBuilding(uid);
      }
    }
  }

  // Restore tile reservations from saved instances
  BuildingSystem.restoreReservations();

  if (typeof BarracksTroopSystem !== 'undefined') {
    BarracksTroopSystem.init();
  }

  setLoadProgress(70, 'Starting systems...');

  var savedState = GameState.exportState();
  if (typeof DayNightSystem !== 'undefined') {
    DayNightSystem.init();
    if (savedState.timeOfDay !== undefined) {
      DayNightSystem.setTimeOfDay(savedState.timeOfDay);
    }
  }

  // Initialize fire system
  if (typeof FireSystem !== 'undefined') {
    FireSystem.init();
  }

  // Initialize atmosphere system (wind, stars, moon, clouds)
  if (typeof AtmosphereSystem !== 'undefined') {
    AtmosphereSystem.init();
  }

  // Initialize particle system
  if (typeof ParticleSystem !== 'undefined') {
    ParticleSystem.init();
  }

  // Initialize weather system
  if (typeof WeatherSystem !== 'undefined') {
    WeatherSystem.init();
  }

  // Initialize minimap
  if (typeof MiniMap !== 'undefined') {
    MiniMap.init();
  }

  setLoadProgress(85, 'Unlocking content...');
  UnlockSystem.checkAll();
  UnlockSystem.checkAll();

  var unlockedList = GameState.getUnlocked();
  console.log("[Game] Unlocked entities: " + unlockedList.length);
  console.log("[Game] Resources: " + JSON.stringify(GameState.getAllResources()));

  setLoadProgress(95, 'Loading UI...');
  if (typeof GameHUD !== 'undefined' && GameHUD.init) {
    GameHUD.init();
  }

  // Initial render
  if (typeof GameHUD !== 'undefined' && (GameHUD.renderNow || GameHUD.renderAll)) {
    if (GameHUD.renderNow) GameHUD.renderNow('boot');
    else GameHUD.renderAll();
  } else {
    console.error('[Game] ❌ CRITICAL: GameHUD not available! Cannot render UI.');
    alert('CRITICAL ERROR: Game UI (HUD) failed to load!\n\nPlease check browser console (F12) for errors.');
  }

  // Apply initial equipment visuals
  if (typeof GamePlayer !== 'undefined' && GamePlayer.updateEquipmentVisuals) {
    GamePlayer.updateEquipmentVisuals();
  }

  setLoadProgress(100, 'Ready!');

  setTimeout(function() {
    var ls = document.getElementById('loading-screen');
    if (ls) {
      ls.style.opacity = '0';
      setTimeout(function() { ls.style.display = 'none'; }, 800);
    }
  }, 300);

  var _lastBuildingActionClick = { uid: null, time: 0 };
  var _inputMouseNdc = new THREE.Vector2();
  var _inputRaycaster = new THREE.Raycaster();
  var _inputGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  var _inputGroundTarget = new THREE.Vector3();
  var _hoverPointerClientX = 0;
  var _hoverPointerClientY = 0;
  var _hoverRaycastScheduled = false;

  function updatePointerRaycaster(clientX, clientY) {
    _inputMouseNdc.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    _inputRaycaster.setFromCamera(_inputMouseNdc, GameScene.getCamera());
    return _inputRaycaster;
  }

  function getInteractiveBuildingMeshes() {
    if (window.BuildingSystem && BuildingSystem.getInteractiveMeshes) {
      return BuildingSystem.getInteractiveMeshes();
    }
    return GameScene.getScene().children;
  }

  function getInstanceUidFromIntersections(intersects) {
    for (var i = 0; i < intersects.length; i++) {
      var obj = intersects[i].object;
      while (obj && !obj.userData.instanceUid) obj = obj.parent;
      if (obj && obj.userData.instanceUid) {
        return obj.userData.instanceUid;
      }
    }
    return null;
  }

  function runHoverRaycast() {
    _hoverRaycastScheduled = false;
    if (BuildingSystem.isBuildMode()) return;

    var interactiveMeshes = getInteractiveBuildingMeshes();
    if (!interactiveMeshes || !interactiveMeshes.length) {
      GameHUD.setHoveredInstance(null);
      return;
    }

    var raycaster = updatePointerRaycaster(_hoverPointerClientX, _hoverPointerClientY);
    var hoveredUid = getInstanceUidFromIntersections(raycaster.intersectObjects(interactiveMeshes, true));
    GameHUD.setHoveredInstance(hoveredUid);
  }

  // Mouse move handler - hover detection + build preview
  document.getElementById('game-canvas').addEventListener('mousemove', function (event) {
    // Build preview mode - update ghost position
    if (BuildingSystem.isBuildMode()) {
      var raycaster = updatePointerRaycaster(event.clientX, event.clientY);
      var target = raycaster.ray.intersectPlane(_inputGroundPlane, _inputGroundTarget);
      if (target) {
        BuildingSystem.updateBuildPreview(target.x, target.z);
      }
      return; // Skip hover detection in build mode
    }

    _hoverPointerClientX = event.clientX;
    _hoverPointerClientY = event.clientY;
    if (_hoverRaycastScheduled) return;

    _hoverRaycastScheduled = true;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(runHoverRaycast);
    } else {
      setTimeout(runHoverRaycast, 16);
    }
  });

  // Click handler - build confirm or building selection
  document.getElementById('game-canvas').addEventListener('click', function (event) {
    // Build preview mode - confirm placement
    if (BuildingSystem.isBuildMode()) {
      BuildingSystem.confirmBuild();
      return;
    }

    var raycaster = updatePointerRaycaster(event.clientX, event.clientY);
    var interactiveMeshes = getInteractiveBuildingMeshes();
    var intersects = raycaster.intersectObjects(interactiveMeshes, true);
    var instanceUid = getInstanceUidFromIntersections(intersects);

    if (instanceUid) {
        var now = Date.now();
        var storage = GameState.getBuildingStorage(instanceUid) || {};
        var hasResources = false;
        for (var resId in storage) {
          if (storage[resId] > 0) {
            hasResources = true;
            break;
          }
        }

        var instance = GameState.getInstance(instanceUid);
        var balance = instance ? (GameRegistry.getBalance(instance.entityId) || {}) : null;
        var fuelData = GameState.getFireFuelData ? GameState.getFireFuelData(instanceUid) : null;
        var maxFuel = balance && balance.fuelCapacity ? balance.fuelCapacity : 0;
        var currentFuel = fuelData ? fuelData.current : maxFuel;
        var canQuickRefuel = !!(balance && balance.refuelCost && currentFuel < maxFuel);

        if (_lastBuildingActionClick.uid === instanceUid && (now - _lastBuildingActionClick.time) < 400) {
          if (hasResources) {
            GameActions.collectFromBuilding(instanceUid);
            _lastBuildingActionClick.uid = null;
            _lastBuildingActionClick.time = 0;
            event.preventDefault();
            return;
          }

          if (canQuickRefuel) {
            GameActions.refuel(instanceUid);
            _lastBuildingActionClick.uid = null;
            _lastBuildingActionClick.time = 0;
            event.preventDefault();
            return;
          }
        }

        _lastBuildingActionClick.uid = instanceUid;
        _lastBuildingActionClick.time = now;
        GameHUD.selectInstance(instanceUid);
        event.preventDefault();
        return;
    }

    _lastBuildingActionClick.uid = null;
    _lastBuildingActionClick.time = 0;
    GameHUD.closeInspector();
  });

  // ESC key handler
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (BuildingSystem.isBuildMode()) {
        BuildingSystem.cancelBuild();
      } else {
        GameHUD.closePanels();
        GameHUD.closeInspector();
      }
    }
  });

  console.log("[Game] 3D Evolution Simulator initialized - v" + window.GAME_MANIFEST.version);
  console.log("[Game] Resources: " + GameRegistry.getEntitiesByType("resource").length);
  console.log("[Game] Buildings: " + GameRegistry.getEntitiesByType("building").length);
  console.log("[Game] Animals: " + GameRegistry.getEntitiesByType("animal").length);
  console.log("[Game] Equipment: " + GameRegistry.getEntitiesByType("equipment").length);

  // Save game immediately when page is closing/reloading
  window.addEventListener('beforeunload', function() {
    if (window.GameStorage && window.GameState) {
      GameStorage.save();
    }
  });
})();
