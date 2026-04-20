window.GameState = (function () {
  var _state = {
    resources: {},
    buildings: {},
    unlocked: [],
    techState: { currentResearch: null, progress: 0 },
    age: "age.stone",
    version: "",
    showLockedItems: true,
    player: createDefaultPlayerState(),
    inventory: {},
    instances: {},
    buildingStorage: {},
    chunks: {},
    worldSeed: 42,
    fractionalAccumulator: {},
    gameSpeed: 1.0,
    isPaused: false,
    researched: [],  // Researched technologies
    hunger: 0,
    maxHunger: 0,
    timeOfDay: getPlayerSpawnTimeOfDay(),
    fireFuel: {},
    exploredChunks: {}
  };
  var _coreStateVersion = 0;
  var _worldStateDirty = true;

  function markCoreStateChanged() {
    _coreStateVersion++;
  }

  function markWorldStateDirty() {
    _worldStateDirty = true;
  }

  function clearWorldStateDirty() {
    _worldStateDirty = false;
  }

  function hasWorldStateDirty() {
    return _worldStateDirty;
  }

  function getHungerConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.hunger) || {};
  }

  function getConfiguredMaxHunger() {
    var maxHunger = Number(getHungerConfig().maxHunger);
    return maxHunger > 0 ? maxHunger : _state.maxHunger;
  }

  function getAutoEatThreshold() {
    return Number(getHungerConfig().autoEatThreshold);
  }

  function getHungryThreshold() {
    return Number(getHungerConfig().hungryThreshold);
  }

  function getHungerOverlayConfig() {
    return getHungerConfig().overlay || {};
  }

  function getHungerOverlayWarningThreshold() {
    var warningThreshold = Number(getHungerOverlayConfig().warningThreshold);
    return isFinite(warningThreshold) ? warningThreshold : getHungryThreshold();
  }

  function getHungerOverlayCriticalThreshold() {
    var criticalThreshold = Number(getHungerOverlayConfig().criticalThreshold);
    return isFinite(criticalThreshold) ? criticalThreshold : 0;
  }

  function getHungerDrainPerSecond() {
    return Number(getHungerConfig().drainPerSecond);
  }

  function getHungrySpeedMultiplier() {
    return Number(getHungerConfig().hungrySpeedMult);
  }

  function getStarvingHpDrain() {
    return Number(getHungerConfig().starvingHpDrain);
  }

  function getHungerRestoreAmount(resourceId) {
    var foodRestoreMap = getHungerConfig().foodRestore || {};
    return Number(foodRestoreMap[resourceId]);
  }

  function getEatDuration() {
    return Number(getHungerConfig().eatDuration);
  }

  function getEatSpeedMultiplier() {
    return Number(getHungerConfig().eatSpeedMult);
  }

  function getRegenHungerMultiplier() {
    return Number(getHungerConfig().regenHungerMult);
  }

  function getStarvationResourceLossFraction() {
    return Number(getHungerConfig().starvationResourceLossFraction);
  }

  function getStarvationRespawnHungerFraction() {
    return Number(getHungerConfig().starvationRespawnHungerFraction);
  }

  function getPlayerConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.player) || {};
  }

  function getPlayerBaseStats() {
    var baseStats = getPlayerConfig().baseStats || {};
    return {
      maxHp: Number(baseStats.maxHp) || 0,
      attack: Number(baseStats.attack) || 0,
      defense: Number(baseStats.defense) || 0,
      speed: Number(baseStats.speed) || 0
    };
  }

  function getPlayerSpawnPosition() {
    var spawn = getPlayerConfig().spawn || {};
    return {
      x: Number(spawn.x) || 0,
      z: Number(spawn.z) || 0
    };
  }

  function getPlayerSpawnTimeOfDay() {
    return Number((getPlayerConfig().spawn || {}).timeOfDay) || 0;
  }

  function getPlayerInteractionRadius() {
    return Number(getPlayerConfig().interactionRadius) || 0;
  }

  function getPlayerShallowWaterSpeedMultiplier() {
    return Number(((getPlayerConfig().movement || {}).shallowWaterSpeedMultiplier)) || 0;
  }

  function getPlayerDeathResourceLossFraction() {
    return Number(((getPlayerConfig().death || {}).resourceLossFraction));
  }

  function getFuelCapacityForInstance(uid) {
    var inst = _state.instances[uid];
    var balance = inst ? GameRegistry.getBalance(inst.entityId) : null;
    return Number(balance && balance.fuelCapacity) || 0;
  }

  function createDefaultEquipmentSlots() {
    return {
      weapon: null,
      offhand: null,
      armor: null,
      boots: null
    };
  }

  function createDefaultPlayerState() {
    var baseStats = getPlayerBaseStats();
    var spawn = getPlayerSpawnPosition();
    return {
      hp: baseStats.maxHp,
      maxHp: baseStats.maxHp,
      attack: baseStats.attack,
      defense: baseStats.defense,
      x: spawn.x,
      z: spawn.z,
      speed: baseStats.speed,
      equipped: createDefaultEquipmentSlots()
    };
  }

  function mergeEquipmentSlots(equipped) {
    var merged = createDefaultEquipmentSlots();
    equipped = equipped || {};
    for (var slot in merged) {
      if (equipped.hasOwnProperty(slot)) {
        merged[slot] = equipped[slot] || null;
      }
    }
    return merged;
  }

  function syncPlayerStateToBalance(options) {
    options = options || {};
    var defaultPlayer = createDefaultPlayerState();
    var currentPlayer = _state.player || {};

    _state.player = currentPlayer;
    _state.player.equipped = mergeEquipmentSlots(currentPlayer.equipped);
    _state.player.attack = defaultPlayer.attack;
    _state.player.defense = defaultPlayer.defense;
    _state.player.speed = defaultPlayer.speed;

    if (options.resetPosition) {
      _state.player.x = defaultPlayer.x;
      _state.player.z = defaultPlayer.z;
    } else {
      var savedX = Number(_state.player.x);
      var savedZ = Number(_state.player.z);
      _state.player.x = isFinite(savedX) ? savedX : defaultPlayer.x;
      _state.player.z = isFinite(savedZ) ? savedZ : defaultPlayer.z;
    }

    _state.player.maxHp = getPlayerMaxHp();
    if (options.resetHealth) {
      _state.player.hp = _state.player.maxHp;
      return;
    }

    var currentHp = Number(_state.player.hp);
    if (!isFinite(currentHp)) {
      _state.player.hp = _state.player.maxHp;
      return;
    }

    _state.player.hp = Math.max(0, Math.min(currentHp, _state.player.maxHp));
  }

  function syncHungerStateToBalance(resetToFull) {
    _state.maxHunger = getConfiguredMaxHunger();
    if (resetToFull) {
      _state.hunger = _state.maxHunger;
      return;
    }
    _state.hunger = Math.max(0, Math.min(_state.hunger, _state.maxHunger));
  }

  function markInstancesDirty() {
    if (window.GameSpatialIndex && GameSpatialIndex.markInstancesDirty) {
      GameSpatialIndex.markInstancesDirty();
    }
  }

  function init() {
    var startBalance = GameRegistry.getBalance("age.stone");
    _state.resources = {};
    if (startBalance && startBalance.startResources) {
      _state.resources = JSON.parse(JSON.stringify(startBalance.startResources));
    }
    _state.buildings = {};
    _state.unlocked = ["age.stone"];
    _state.age = "age.stone";
    _state.version = window.GAME_MANIFEST.version;
    _state.player = createDefaultPlayerState();
    syncPlayerStateToBalance({ resetPosition: true, resetHealth: true });
    _state.inventory = {};
    _state.instances = {};
    _state.buildingStorage = {};
    _state.chunks = {};
    _state.worldSeed = Math.floor(Math.random() * 100000);
    _state.fractionalAccumulator = {};
    _state.researched = [];
    _state.hunger = 0;
    _state.maxHunger = 0;
    syncHungerStateToBalance(true);
    _state.timeOfDay = getPlayerSpawnTimeOfDay();
    _state.fireFuel = {};
    _state.exploredChunks = {};
    _coreStateVersion = 1;
    _worldStateDirty = true;
    if (window.GameSpatialIndex && GameSpatialIndex.markAllDirty) {
      GameSpatialIndex.markAllDirty();
    }
  }

  // === Resources ===
  function addResource(id, amount) {
    if (!amount) return;
    if (_state.resources[id] === undefined) _state.resources[id] = 0;
    _state.resources[id] += amount;
    if (_state.resources[id] < 0) _state.resources[id] = 0;
    
    // Auto-unlock resource if not already unlocked
    if (amount > 0 && _state.unlocked.indexOf(id) === -1) {
      var entity = GameRegistry.getEntity(id);
      if (entity && entity.type === 'resource') {
        _state.unlocked.push(id);
      }
    }

    markCoreStateChanged();
  }

  function addFractionalResource(id, amount) {
    if (_state.fractionalAccumulator[id] === undefined) _state.fractionalAccumulator[id] = 0;
    _state.fractionalAccumulator[id] += amount;
    
    if (_state.fractionalAccumulator[id] >= 1) {
      var whole = Math.floor(_state.fractionalAccumulator[id]);
      _state.fractionalAccumulator[id] -= whole;
      addResource(id, whole);
    }
  }

  function removeResource(id, amount) {
    if (_state.resources[id] === undefined || _state.resources[id] < amount) return false;
    _state.resources[id] -= amount;
    markCoreStateChanged();
    return true;
  }

  function getResource(id) { return _state.resources[id] || 0; }
  function hasResource(id, amount) { return (_state.resources[id] || 0) >= amount; }
  function getAllResources() { return JSON.parse(JSON.stringify(_state.resources)); }

  function getWarehouseInstanceUids() {
    var uids = [];
    for (var uid in _state.instances) {
      if (_state.instances[uid] && _state.instances[uid].entityId === 'building.warehouse') {
        uids.push(uid);
      }
    }
    uids.sort();
    return uids;
  }

  function getSpendableResource(id) {
    var total = getResource(id);
    var warehouseUids = getWarehouseInstanceUids();

    for (var i = 0; i < warehouseUids.length; i++) {
      var uid = warehouseUids[i];
      var storage = _state.buildingStorage[uid];
      if (storage && storage[id]) {
        total += storage[id];
      }
    }

    return total;
  }

  function hasSpendableResource(id, amount) {
    return getSpendableResource(id) >= amount;
  }

  function consumeSpendableResource(id, amount) {
    if (!hasSpendableResource(id, amount)) return false;

    var remaining = amount;
    var playerAmount = Math.min(getResource(id), remaining);
    if (playerAmount > 0) {
      removeResource(id, playerAmount);
      remaining -= playerAmount;
    }

    if (remaining <= 0) return true;

    var warehouseUids = getWarehouseInstanceUids();
    for (var i = 0; i < warehouseUids.length && remaining > 0; i++) {
      var uid = warehouseUids[i];
      var storage = _state.buildingStorage[uid];
      var available = storage && storage[id] ? storage[id] : 0;
      if (available <= 0) continue;

      var taken = Math.min(available, remaining);
      addBuildingStorage(uid, id, -taken);
      remaining -= taken;
    }

    return remaining <= 0;
  }

  // === Buildings ===
  function addBuilding(id) {
    if (_state.buildings[id] === undefined) _state.buildings[id] = 0;
    _state.buildings[id]++;
    markCoreStateChanged();
  }

  function getBuildingCount(id) {
    if (id === 'building.berry_gatherer') {
      return (_state.buildings['building.berry_gatherer'] || 0)
        + (_state.buildings['building.wood_cutter'] || 0)
        + (_state.buildings['building.stone_quarry'] || 0)
        + (_state.buildings['building.flint_mine'] || 0);
    }
    return _state.buildings[id] || 0;
  }
  function getAllBuildings() { return JSON.parse(JSON.stringify(_state.buildings)); }

  // === Unlock ===
  function unlock(id) {
    if (_state.unlocked.indexOf(id) === -1) {
      _state.unlocked.push(id);
      markCoreStateChanged();
      return true;
    }
    return false;
  }

  function isUnlocked(id) { return _state.unlocked.indexOf(id) !== -1; }
  function getUnlocked() { return _state.unlocked.slice(); }

  // === Age ===
  function setAge(ageId) {
    if (_state.age !== ageId) {
      _state.age = ageId;
      markCoreStateChanged();
    }
    unlock(ageId);
  }
  function getAge() { return _state.age; }

  // === Version ===
  function getVersion() { return _state.version; }
  function setVersion(v) {
    if (_state.version === v) return;
    _state.version = v;
    markCoreStateChanged();
  }

  // === Player ===
  function getPlayer() { return _state.player; }

  function setPlayerHP(hp) {
    var nextHp = Math.max(0, Math.min(hp, getPlayerMaxHp()));
    if (_state.player.hp === nextHp) return;
    _state.player.hp = nextHp;
    markCoreStateChanged();
  }

  function getEquipmentStats(equipmentId) {
    if (!equipmentId) return null;

    var balance = GameRegistry.getBalance(equipmentId) || {};
    var entity = GameRegistry.getEntity(equipmentId);
    return balance.stats || (entity && entity.stats) || null;
  }

  function getEquippedStatTotal(statKey) {
    var total = 0;
    var equipped = (_state.player && _state.player.equipped) || {};

    for (var slot in equipped) {
      var equipmentId = equipped[slot];
      if (!equipmentId) continue;

      var stats = getEquipmentStats(equipmentId);
      var value = Number(stats && stats[statKey]);
      if (isFinite(value)) {
        total += value;
      }
    }

    return total;
  }

  function getEquippedStatBreakdown(statKey) {
    var breakdown = [];
    var equipped = (_state.player && _state.player.equipped) || {};

    for (var slot in equipped) {
      var equipmentId = equipped[slot];
      if (!equipmentId) continue;

      var stats = getEquipmentStats(equipmentId);
      var value = Number(stats && stats[statKey]);
      if (!isFinite(value) || value === 0) continue;

      breakdown.push({
        slot: slot,
        equipmentId: equipmentId,
        value: value
      });
    }

    return breakdown;
  }

  function getPlayerMaxHp() {
    return getPlayerBaseStats().maxHp + getEquippedStatTotal('maxHp');
  }

  function getPlayerAttack() {
    return _state.player.attack + getEquippedStatTotal('attack');
  }

  function getPlayerDefense() {
    return _state.player.defense + getEquippedStatTotal('defense');
  }

  function getPlayerSpeed() {
    return _state.player.speed + getEquippedStatTotal('speed');
  }

  function setPlayerPosition(x, z) {
    if (_state.player.x === x && _state.player.z === z) return;
    _state.player.x = x;
    _state.player.z = z;
    markCoreStateChanged();
  }

  function equipItem(equipmentId) {
    var entity = GameRegistry.getEntity(equipmentId);
    if (!entity || entity.type !== "equipment") return false;
    
    // MUST have at least 1 item in inventory
    if (!_state.inventory[equipmentId] || _state.inventory[equipmentId] <= 0) {
      return false;
    }

    var slot = entity.slot;
    var oldMaxHp = getPlayerMaxHp();
    
    // Unequip current
    if (_state.player.equipped[slot]) {
      addToInventory(_state.player.equipped[slot], 1);
    }
    // ONLY decrement, NEVER set to zero completely!
    _state.inventory[equipmentId] -= 1;
    if (_state.inventory[equipmentId] <= 0) {
      delete _state.inventory[equipmentId];
    }
    
    _state.player.equipped[slot] = equipmentId;

    // Update maxHP and actual HP proportionally
    _state.player.maxHp = getPlayerMaxHp();
    if (_state.player.maxHp > oldMaxHp) {
      var hpGain = _state.player.maxHp - oldMaxHp;
      _state.player.hp = Math.min(_state.player.hp + hpGain, _state.player.maxHp);
    } else {
      _state.player.hp = Math.min(_state.player.hp, _state.player.maxHp);
    }
    
    // Fire UI update event
    if (window.GameHUD) GameHUD.showNotification(`Equipped ${entity.name}`, "success");

    markCoreStateChanged();

    return true;
  }

  function unequipSlot(slot) {
    if (!_state.player.equipped[slot]) return false;
    var entity = GameRegistry.getEntity(_state.player.equipped[slot]);
    addToInventory(_state.player.equipped[slot], 1);
    _state.player.equipped[slot] = null;
    _state.player.maxHp = getPlayerMaxHp();
    _state.player.hp = Math.min(_state.player.hp, _state.player.maxHp);
    if (window.GameHUD) GameHUD.showNotification(`Unequipped ${entity.name}`, "info");
    markCoreStateChanged();
    return true;
  }

  // === Inventory ===
  function addToInventory(id, count) {
    if (_state.inventory[id] === undefined) _state.inventory[id] = 0;
    _state.inventory[id] += count;
    markCoreStateChanged();
  }

  function removeFromInventory(id, count) {
    if (!_state.inventory[id] || _state.inventory[id] < count) return false;
    _state.inventory[id] -= count;
    if (_state.inventory[id] <= 0) delete _state.inventory[id];
    markCoreStateChanged();
    return true;
  }

  function getInventory() { return JSON.parse(JSON.stringify(_state.inventory)); }
  function getInventoryCount(id) { return _state.inventory[id] || 0; }

  // === Building Instances ===
  function addInstance(uid, data) {
    _state.instances[uid] = data;
    markCoreStateChanged();
    markInstancesDirty();
  }
  function getInstance(uid) { return _state.instances[uid] || null; }
  function getAllInstances() { return JSON.parse(JSON.stringify(_state.instances)); }
  function getAllInstancesLive() { return _state.instances; }
  function removeInstance(uid) {
    if (!_state.instances[uid]) return;
    delete _state.instances[uid];
    markCoreStateChanged();
    markInstancesDirty();
  }

  function ensureFarmState(uid) {
    var instance = getInstance(uid);
    if (!instance) return null;

    if (!instance.farmState) {
      instance.farmState = {};
    }

    if (instance.farmState.cropKey === undefined) instance.farmState.cropKey = 'root_crop';
    if (instance.farmState.planted === undefined) instance.farmState.planted = false;
    if (instance.farmState.watered === undefined) instance.farmState.watered = false;
    if (instance.farmState.ready === undefined) instance.farmState.ready = false;
    if (instance.farmState.progress === undefined) instance.farmState.progress = 0;
    if (instance.farmState.waterSourceType === undefined) instance.farmState.waterSourceType = null;
    if (instance.farmState.riverBoosted === undefined) instance.farmState.riverBoosted = false;

    instance.farmState.progress = Math.max(0, Math.min(1, instance.farmState.progress || 0));
    if (!instance.farmState.planted) {
      instance.farmState.watered = false;
      instance.farmState.ready = false;
      instance.farmState.progress = 0;
      instance.farmState.waterSourceType = null;
      instance.farmState.riverBoosted = false;
    }
    if (instance.farmState.ready) {
      instance.farmState.progress = 1;
    }

    return instance.farmState;
  }

  function getFarmState(uid) {
    var state = ensureFarmState(uid);
    return state ? JSON.parse(JSON.stringify(state)) : null;
  }

  function setFarmState(uid, nextState) {
    var state = ensureFarmState(uid);
    if (!state) return null;

    nextState = nextState || {};
    for (var key in nextState) {
      state[key] = nextState[key];
    }

    state.progress = Math.max(0, Math.min(1, state.progress || 0));
    if (!state.planted) {
      state.watered = false;
      state.ready = false;
      state.progress = 0;
    }
    if (state.ready) {
      state.progress = 1;
    }

    markCoreStateChanged();
    return JSON.parse(JSON.stringify(state));
  }

  function resetFarmState(uid) {
    var instance = getInstance(uid);
    if (!instance) return null;

    instance.farmState = {
      cropKey: 'root_crop',
      planted: false,
      watered: false,
      ready: false,
      progress: 0,
      waterSourceType: null,
      riverBoosted: false
    };

    markCoreStateChanged();
    return JSON.parse(JSON.stringify(instance.farmState));
  }

  function ensureBarracksState(uid) {
    var instance = getInstance(uid);
    if (!instance) return null;

    if (!instance.barracksState) {
      instance.barracksState = {};
    }

    if (!Array.isArray(instance.barracksState.queue)) instance.barracksState.queue = [];
    if (!instance.barracksState.reserves) instance.barracksState.reserves = {};
    if (instance.barracksState.reserves.swordsman === undefined) instance.barracksState.reserves.swordsman = 0;
    if (instance.barracksState.reserves.spearman === undefined) instance.barracksState.reserves.spearman = 0;
    if (instance.barracksState.reserves.archer === undefined) instance.barracksState.reserves.archer = 0;
    if (instance.barracksState.commandMode !== 'follow' && instance.barracksState.commandMode !== 'attack') instance.barracksState.commandMode = 'guard';
    if (instance.barracksState.attackTargetId === undefined) instance.barracksState.attackTargetId = null;
    if (instance.barracksState.attackTargetName === undefined) instance.barracksState.attackTargetName = '';
    if (instance.barracksState.totalTrained === undefined) instance.barracksState.totalTrained = 0;
    if (instance.barracksState.completedToday === undefined) instance.barracksState.completedToday = 0;

    instance.barracksState.queue = instance.barracksState.queue.map(function(entry) {
      return {
        unitType: entry && entry.unitType ? entry.unitType : 'swordsman',
        remainingSeconds: Math.max(0, Number(entry && entry.remainingSeconds) || 0),
        totalSeconds: Math.max(1, Number(entry && entry.totalSeconds) || 1),
        queuedAt: Number(entry && entry.queuedAt) || 0
      };
    });

    return instance.barracksState;
  }

  function getBarracksState(uid) {
    var state = ensureBarracksState(uid);
    return state ? JSON.parse(JSON.stringify(state)) : null;
  }

  function getBarracksStateLive(uid) {
    return ensureBarracksState(uid);
  }

  function setBarracksState(uid, nextState) {
    var state = ensureBarracksState(uid);
    if (!state) return null;

    nextState = nextState || {};
    for (var key in nextState) {
      state[key] = nextState[key];
    }

    ensureBarracksState(uid);
    markCoreStateChanged();
    return JSON.parse(JSON.stringify(state));
  }

  function getBarracksReserveCount(uid, unitType) {
    var state = ensureBarracksState(uid);
    if (!state || !state.reserves) return 0;
    return state.reserves[unitType] || 0;
  }

  function addBarracksReserve(uid, unitType, amount) {
    var state = ensureBarracksState(uid);
    if (!state) return 0;

    if (!state.reserves[unitType]) state.reserves[unitType] = 0;
    state.reserves[unitType] = Math.max(0, state.reserves[unitType] + amount);
    markCoreStateChanged();
    return state.reserves[unitType];
  }
  
  function destroyInstance(uid) {
    var instance = getInstance(uid);
    if (!instance) return false;

    var entity = GameRegistry.getEntity(instance.entityId);
    if (!entity) return false;

    // Refund 50% cost from balance data (including upgrade costs)
    var balance = GameRegistry.getBalance(instance.entityId);
    if (balance && balance.cost) {
      // Refund base building cost
      for (var resId in balance.cost) {
        var refundAmount = Math.floor(balance.cost[resId] * 0.5);
        if (refundAmount > 0) {
          addResource(resId, refundAmount);
        }
      }
      
      // Refund upgrade costs if building was upgraded
      var currentLevel = instance.level || 1;
      if (balance.upgrades && currentLevel > 1) {
        for (var lvl = 2; lvl <= currentLevel; lvl++) {
          var upgrade = balance.upgrades[lvl];
          if (upgrade && upgrade.cost) {
            for (var resId in upgrade.cost) {
              var refundAmount = Math.floor(upgrade.cost[resId] * 0.5);
              if (refundAmount > 0) {
                addResource(resId, refundAmount);
              }
            }
          }
        }
      }
    }

    // Decrease building count
    if (_state.buildings[instance.entityId] > 0) {
      _state.buildings[instance.entityId]--;
      if (_state.buildings[instance.entityId] <= 0) {
        delete _state.buildings[instance.entityId];
      }
    }

    // Release grid tile
    if (window.GameTerrain && GameTerrain.releaseTile) GameTerrain.releaseTile(instance.x, instance.z);

    // Clear building storage
    clearBuildingStorage(uid);

    // Remove instance
    removeInstance(uid);

    // Recheck unlocks
    UnlockSystem.checkAll();

    return true;
  }

  // === Building Storage ===
  function addBuildingStorage(instanceUid, resourceId, amount) {
    if (!amount) return;
    if (!_state.buildingStorage[instanceUid]) {
      _state.buildingStorage[instanceUid] = {};
    }
    if (!_state.buildingStorage[instanceUid][resourceId]) {
      _state.buildingStorage[instanceUid][resourceId] = 0;
    }
    _state.buildingStorage[instanceUid][resourceId] += amount;
    // Clamp to 0 minimum (prevent negative values)
    if (_state.buildingStorage[instanceUid][resourceId] <= 0) {
      delete _state.buildingStorage[instanceUid][resourceId];
    } else if (amount > 0 && _state.unlocked.indexOf(resourceId) === -1) {
      var entity = GameRegistry.getEntity(resourceId);
      if (entity && entity.type === 'resource') {
        _state.unlocked.push(resourceId);
      }
    }

    markCoreStateChanged();
  }

  function getBuildingStorage(instanceUid) {
    return _state.buildingStorage[instanceUid] || {};
  }

  function collectFromBuilding(instanceUid) {
    var storage = _state.buildingStorage[instanceUid];
    if (!storage) return {};
    
    var collected = {};
    for (var resourceId in storage) {
      if (storage[resourceId] > 0) {
        addResource(resourceId, storage[resourceId]);
        collected[resourceId] = storage[resourceId];
      }
    }
    
    // Clear building storage
    _state.buildingStorage[instanceUid] = {};

    markCoreStateChanged();
    
    return collected;
  }

  function clearBuildingStorage(instanceUid) {
    if (!_state.buildingStorage[instanceUid]) return;
    delete _state.buildingStorage[instanceUid];
    markCoreStateChanged();
  }

  function getStorageUsed(instanceUid) {
    var storage = _state.buildingStorage[instanceUid] || {};
    var total = 0;
    for (var resId in storage) {
      total += storage[resId] || 0;
    }
    return total;
  }

  function resolveStorageCapacity(balance, level) {
    if (!balance || balance.storageCapacity === undefined || balance.storageCapacity === null) {
      return Infinity;
    }
    if (typeof balance.storageCapacity === 'number') {
      return balance.storageCapacity;
    }
    if (balance.storageCapacity[level] !== undefined) {
      return balance.storageCapacity[level];
    }
    if (balance.storageCapacity[1] !== undefined) {
      return balance.storageCapacity[1];
    }
    return 100;
  }

  function normalizeZeroCapacityBuildingStorage() {
    for (var instanceUid in _state.buildingStorage) {
      var storage = _state.buildingStorage[instanceUid];
      if (!storage) continue;

      var instance = _state.instances[instanceUid];
      if (!instance) {
        delete _state.buildingStorage[instanceUid];
        continue;
      }

      var balance = GameRegistry.getBalance(instance.entityId);
      var capacity = resolveStorageCapacity(balance, instance.level || 1);
      if (capacity > 0) continue;

      for (var resourceId in storage) {
        var amount = storage[resourceId] || 0;
        if (amount > 0) {
          addResource(resourceId, amount);
        }
      }

      delete _state.buildingStorage[instanceUid];
    }
  }

  function getStorageCapacity(instanceUid) {
    var instance = getInstance(instanceUid);
    if (!instance) return 0;
    
    var balance = GameRegistry.getBalance(instance.entityId);
    var level = instance.level || 1;
    return resolveStorageCapacity(balance, level);
  }

  function canDeposit(instanceUid, resourceId, amount) {
    var used = getStorageUsed(instanceUid);
    var capacity = getStorageCapacity(instanceUid);
    return (used + amount) <= capacity;
  }

  function tryDepositToBuilding(instanceUid, resourceId, amount) {
    if (!canDeposit(instanceUid, resourceId, amount)) return false;
    addBuildingStorage(instanceUid, resourceId, amount);
    return true;
  }

  // === Chunks ===
  function saveChunkData(key, data) {
    var hasObjects = !!(data && data.objects && data.objects.length);
    var hasMetadata = !!(data && (data.bossZone || data.ruinedOutpost));
    if (!data || (!hasObjects && !hasMetadata)) {
      delete _state.chunks[key];
      markWorldStateDirty();
      return;
    }
    _state.chunks[key] = data;
    markWorldStateDirty();
  }
  function getChunkData(key) { return _state.chunks[key] || null; }
  function getAllChunkData() { return _state.chunks; }

  // === Technologies ===
  function getTechState() {
    return JSON.parse(JSON.stringify(_state.techState));
  }

  function setTechState(state) {
    _state.techState = JSON.parse(JSON.stringify(state));
    markCoreStateChanged();
  }

  // === Serialization ===
  function exportCoreState() {
    return {
      resources: _state.resources,
      buildings: _state.buildings,
      unlocked: _state.unlocked.slice(),
      techState: _state.techState,
      age: _state.age,
      version: _state.version,
      showLockedItems: _state.showLockedItems,
      player: _state.player,
      inventory: _state.inventory,
      instances: _state.instances,
      buildingStorage: _state.buildingStorage,
      worldSeed: _state.worldSeed,
      fractionalAccumulator: _state.fractionalAccumulator,
      gameSpeed: _state.gameSpeed,
      isPaused: _state.isPaused,
      researched: _state.researched.slice(),
      hunger: _state.hunger,
      maxHunger: _state.maxHunger,
      timeOfDay: _state.timeOfDay,
      fireFuel: _state.fireFuel
    };
  }

  function exportWorldState() {
    return {
      version: _state.version,
      chunks: _state.chunks,
      exploredChunks: _state.exploredChunks
    };
  }

  function exportState() {
    var data = exportCoreState();
    data.chunks = _state.chunks;
    data.exploredChunks = _state.exploredChunks;
    return data;
  }

  function importState(data) {
    if (!data) return false;
    _state.resources = data.resources || {};
    _state.buildings = data.buildings || {};
    _state.unlocked = data.unlocked || ["age.stone"];
    _state.researched = data.researched || data.researchedTechs || [];
    _state.techState = data.techState || { currentResearch: null, progress: 0 };
    _state.age = data.age || "age.stone";
    _state.version = data.version || "";
    _state.player = data.player || createDefaultPlayerState();
    syncPlayerStateToBalance({ resetPosition: false, resetHealth: false });
    _state.inventory = data.inventory || {};
    _state.instances = data.instances || {};
    _state.buildingStorage = data.buildingStorage || {};
    _state.chunks = {};
    _state.worldSeed = data.worldSeed || 42;
    _state.fractionalAccumulator = data.fractionalAccumulator || {};
    _state.gameSpeed = data.gameSpeed || 1.0;
    _state.isPaused = data.isPaused || false;
    _state.hunger = data.hunger !== undefined ? data.hunger : 0;
    _state.maxHunger = 0;
    syncHungerStateToBalance(data.hunger === undefined);
    _state.timeOfDay = data.timeOfDay !== undefined ? data.timeOfDay : getPlayerSpawnTimeOfDay();
    _state.fireFuel = data.fireFuel || {};
    _state.exploredChunks = data.exploredChunks || {};
    normalizeZeroCapacityBuildingStorage();
    _coreStateVersion++;
    _worldStateDirty = false;
    if (window.GameSpatialIndex && GameSpatialIndex.markAllDirty) {
      GameSpatialIndex.markAllDirty();
    }
    return true;
  }

  function importWorldState(data) {
    if (!data) return false;
    _state.chunks = data.chunks || {};
    _state.exploredChunks = data.exploredChunks || {};
    _worldStateDirty = false;
    if (window.GameSpatialIndex && GameSpatialIndex.markThreatAnimalsDirty) {
      GameSpatialIndex.markThreatAnimalsDirty();
    }
    return true;
  }

  function setGameSpeed(value) {
    if (_state.gameSpeed === value) return;
    _state.gameSpeed = value;
    markCoreStateChanged();
  }
  function getGameSpeed() { return _state.gameSpeed; }
  function setGamePaused(value) {
    if (_state.isPaused === value) return;
    _state.isPaused = value;
    markCoreStateChanged();
  }
  function getGamePaused() { return _state.isPaused; }

  function getShowLockedItems() { return _state.showLockedItems; }
  function setShowLockedItems(value) {
    var nextValue = !!value;
    if (_state.showLockedItems === nextValue) return;
    _state.showLockedItems = nextValue;
    markCoreStateChanged();
  }

  // === Hunger ===
  function getHunger() { return _state.hunger; }
  function setHunger(val) {
    var nextHunger = Math.max(0, Math.min(val, _state.maxHunger));
    if (_state.hunger === nextHunger) return;
    _state.hunger = nextHunger;
    markCoreStateChanged();
  }
  function getMaxHunger() { return _state.maxHunger; }
  function isHungry() { return _state.hunger < getHungryThreshold(); }
  function isStarving() { return _state.hunger <= 0; }

  // === Time of Day ===
  function getTimeOfDay() { return _state.timeOfDay; }
  function setTimeOfDay(val) {
    var nextValue = val % 24;
    if (_state.timeOfDay === nextValue) return;
    _state.timeOfDay = nextValue;
    markCoreStateChanged();
  }

  // === Fire Fuel ===
  function getFireFuel(uid) {
    if (!_state.fireFuel[uid]) return null;
    return _state.fireFuel[uid].current;
  }
  function setFireFuel(uid, current) {
    if (!_state.fireFuel[uid]) {
      var maxFuel = getFuelCapacityForInstance(uid);
      _state.fireFuel[uid] = { current: current, max: maxFuel };
    }
    var nextCurrent = Math.max(0, Math.min(current, _state.fireFuel[uid].max));
    if (_state.fireFuel[uid].current === nextCurrent) return;
    _state.fireFuel[uid].current = nextCurrent;
    markCoreStateChanged();
  }
  function addFireFuel(uid, amount) {
    if (!_state.fireFuel[uid]) {
      var maxFuel = getFuelCapacityForInstance(uid);
      _state.fireFuel[uid] = { current: 0, max: maxFuel };
    }
    var nextCurrent = Math.min(_state.fireFuel[uid].max, _state.fireFuel[uid].current + amount);
    if (_state.fireFuel[uid].current === nextCurrent) return;
    _state.fireFuel[uid].current = nextCurrent;
    markCoreStateChanged();
  }
  function getFireFuelMax(uid) {
    if (!_state.fireFuel[uid]) return 0;
    return _state.fireFuel[uid].max;
  }
  function getFireFuelData(uid) {
    return _state.fireFuel[uid] || null;
  }

  // === Explored Chunks ===
  function markChunkExplored(cx, cz) {
    var key = cx + "," + cz;
    if (_state.exploredChunks[key]) return;
    _state.exploredChunks[key] = true;
    markWorldStateDirty();
  }
  function isChunkExplored(cx, cz) {
    return !!(_state.exploredChunks[cx + "," + cz]);
  }
  function getExplored() { return _state.exploredChunks; }

  // === Research ===
  function markResearched(techId) {
    if (_state.researched.indexOf(techId) === -1) {
      _state.researched.push(techId);
      markCoreStateChanged();
    }
  }

  function isResearched(techId) {
    return _state.researched.indexOf(techId) !== -1;
  }

  function getResearched() {
    return _state.researched.slice();  // Return copy
  }

  return {
    init: init,
    addResource: addResource, addFractionalResource: addFractionalResource, removeResource: removeResource,
    getResource: getResource, hasResource: hasResource, getAllResources: getAllResources,
    getSpendableResource: getSpendableResource, hasSpendableResource: hasSpendableResource,
    consumeSpendableResource: consumeSpendableResource,
    addBuilding: addBuilding, getBuildingCount: getBuildingCount, getAllBuildings: getAllBuildings,
    unlock: unlock, isUnlocked: isUnlocked, getUnlocked: getUnlocked,
    setAge: setAge, getAge: getAge,
    getVersion: getVersion, setVersion: setVersion,
    getPlayer: getPlayer, setPlayerHP: setPlayerHP, setPlayerPosition: setPlayerPosition,
    getPlayerMaxHp: getPlayerMaxHp, getPlayerAttack: getPlayerAttack, getPlayerDefense: getPlayerDefense,
    getPlayerSpeed: getPlayerSpeed, getEquipmentStats: getEquipmentStats, getEquippedStatBreakdown: getEquippedStatBreakdown,
    equipItem: equipItem, unequipSlot: unequipSlot,
    addToInventory: addToInventory, removeFromInventory: removeFromInventory,
    getInventory: getInventory, getInventoryCount: getInventoryCount,
    addInstance: addInstance, getInstance: getInstance,
    getAllInstances: getAllInstances, getAllInstancesLive: getAllInstancesLive, removeInstance: removeInstance,
    getFarmState: getFarmState, setFarmState: setFarmState, resetFarmState: resetFarmState,
    getBarracksState: getBarracksState, getBarracksStateLive: getBarracksStateLive, setBarracksState: setBarracksState,
    getBarracksReserveCount: getBarracksReserveCount, addBarracksReserve: addBarracksReserve,
    destroyInstance: destroyInstance,
    addBuildingStorage: addBuildingStorage, getBuildingStorage: getBuildingStorage,
    collectFromBuilding: collectFromBuilding, clearBuildingStorage: clearBuildingStorage,
    getStorageUsed: getStorageUsed, getStorageCapacity: getStorageCapacity,
    canDeposit: canDeposit, tryDepositToBuilding: tryDepositToBuilding,
    saveChunkData: saveChunkData, getChunkData: getChunkData, getAllChunkData: getAllChunkData,
    getTechState: getTechState, setTechState: setTechState,
    exportCoreState: exportCoreState, exportWorldState: exportWorldState,
    exportState: exportState, importState: importState, importWorldState: importWorldState,
    getCoreStateVersion: function () { return _coreStateVersion; },
    hasWorldStateDirty: hasWorldStateDirty,
    clearWorldStateDirty: clearWorldStateDirty,
    markWorldStateDirty: markWorldStateDirty,
    setGameSpeed: setGameSpeed, getGameSpeed: getGameSpeed,
    setGamePaused: setGamePaused, getGamePaused: getGamePaused,
    getShowLockedItems: getShowLockedItems,
    setShowLockedItems: setShowLockedItems,
    markResearched: markResearched,
    isResearched: isResearched,
    getResearched: getResearched,
    getHunger: getHunger, setHunger: setHunger,
    getHungerConfig: getHungerConfig,
    getAutoEatThreshold: getAutoEatThreshold,
    getHungryThreshold: getHungryThreshold,
    getHungerOverlayWarningThreshold: getHungerOverlayWarningThreshold,
    getHungerOverlayCriticalThreshold: getHungerOverlayCriticalThreshold,
    getHungerDrainPerSecond: getHungerDrainPerSecond,
    getHungrySpeedMultiplier: getHungrySpeedMultiplier,
    getStarvingHpDrain: getStarvingHpDrain,
    getHungerRestoreAmount: getHungerRestoreAmount,
    getEatDuration: getEatDuration,
    getEatSpeedMultiplier: getEatSpeedMultiplier,
    getRegenHungerMultiplier: getRegenHungerMultiplier,
    getStarvationResourceLossFraction: getStarvationResourceLossFraction,
    getStarvationRespawnHungerFraction: getStarvationRespawnHungerFraction,
    getPlayerConfig: getPlayerConfig,
    getPlayerBaseStats: getPlayerBaseStats,
    getPlayerSpawnPosition: getPlayerSpawnPosition,
    getPlayerSpawnTimeOfDay: getPlayerSpawnTimeOfDay,
    getPlayerInteractionRadius: getPlayerInteractionRadius,
    getPlayerShallowWaterSpeedMultiplier: getPlayerShallowWaterSpeedMultiplier,
    getPlayerDeathResourceLossFraction: getPlayerDeathResourceLossFraction,
    getMaxHunger: getMaxHunger, isHungry: isHungry, isStarving: isStarving,
    getTimeOfDay: getTimeOfDay, setTimeOfDay: setTimeOfDay,
    getFireFuel: getFireFuel, setFireFuel: setFireFuel,
    addFireFuel: addFireFuel, getFireFuelMax: getFireFuelMax,
    getFireFuelData: getFireFuelData,
    markChunkExplored: markChunkExplored, isChunkExplored: isChunkExplored,
    getExplored: getExplored
  };
})();
