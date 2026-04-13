window.GameState = (function () {
  var _state = {
    resources: {},
    buildings: {},
    unlocked: [],
    techState: { currentResearch: null, progress: 0 },
    age: "age.stone",
    version: "",
    showLockedItems: true,
    player: {
      hp: 100,
      maxHp: 100,
      attack: 1,
      defense: 0,
      x: 8,
      z: 8,
      speed: 3,
      equipped: {
        weapon: null,
        offhand: null,
        armor: null,
        boots: null
      }
    },
    inventory: {},
    instances: {},
    buildingStorage: {},
    chunks: {},
    worldSeed: 42,
    fractionalAccumulator: {},
    gameSpeed: 1.0,
    isPaused: false,
    researched: [],  // Researched technologies
    hunger: 100,
    maxHunger: 100,
    timeOfDay: 12,
    fireFuel: {},
    exploredChunks: {}
  };

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
    _state.player = {
      hp: 100, maxHp: 100,
      attack: 1, defense: 0,
      x: 8, z: 8, speed: 3,
      equipped: { weapon: null, offhand: null, armor: null, boots: null }
    };
    _state.inventory = {};
    _state.instances = {};
    _state.buildingStorage = {};
    _state.chunks = {};
    _state.worldSeed = Math.floor(Math.random() * 100000);
    _state.fractionalAccumulator = {};
    _state.researched = [];
    _state.hunger = 100;
    _state.maxHunger = 100;
    _state.timeOfDay = 12;
    _state.fireFuel = {};
    _state.exploredChunks = {};
  }

  // === Resources ===
  function addResource(id, amount) {
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
    return true;
  }

  function getResource(id) { return _state.resources[id] || 0; }
  function hasResource(id, amount) { return (_state.resources[id] || 0) >= amount; }
  function getAllResources() { return JSON.parse(JSON.stringify(_state.resources)); }

  // === Buildings ===
  function addBuilding(id) {
    if (_state.buildings[id] === undefined) _state.buildings[id] = 0;
    _state.buildings[id]++;
  }

  function getBuildingCount(id) { return _state.buildings[id] || 0; }
  function getAllBuildings() { return JSON.parse(JSON.stringify(_state.buildings)); }

  // === Unlock ===
  function unlock(id) {
    if (_state.unlocked.indexOf(id) === -1) {
      _state.unlocked.push(id);
      return true;
    }
    return false;
  }

  function isUnlocked(id) { return _state.unlocked.indexOf(id) !== -1; }
  function getUnlocked() { return _state.unlocked.slice(); }

  // === Age ===
  function setAge(ageId) { _state.age = ageId; unlock(ageId); }
  function getAge() { return _state.age; }

  // === Version ===
  function getVersion() { return _state.version; }
  function setVersion(v) { _state.version = v; }

  // === Player ===
  function getPlayer() { return _state.player; }

  function setPlayerHP(hp) {
    _state.player.hp = Math.max(0, Math.min(hp, getPlayerMaxHp()));
  }

  function getPlayerMaxHp() {
    var maxHp = 100;
    var armorId = _state.player.equipped.armor;
    if (armorId) {
      var entity = GameRegistry.getEntity(armorId);
      var stats = (entity && entity.stats) || (GameRegistry.getBalance(armorId) || {}).stats;
      if (stats && stats.maxHp) {
        maxHp += stats.maxHp;
      }
    }
    return maxHp;
  }

  function getPlayerAttack() {
    var atk = _state.player.attack;
    var weaponId = _state.player.equipped.weapon;
    if (weaponId) {
      var entity = GameRegistry.getEntity(weaponId);
      var stats = (entity && entity.stats) || (GameRegistry.getBalance(weaponId) || {}).stats;
      if (stats && stats.attack) {
        atk += stats.attack;
      }
    }
    return atk;
  }

  function getPlayerDefense() {
    var def = _state.player.defense;
    var offhandId = _state.player.equipped.offhand;
    if (offhandId) {
      var entity = GameRegistry.getEntity(offhandId);
      var stats = (entity && entity.stats) || (GameRegistry.getBalance(offhandId) || {}).stats;
      if (stats && stats.defense) {
        def += stats.defense;
      }
    }
    var armorId = _state.player.equipped.armor;
    if (armorId) {
      var entity = GameRegistry.getEntity(armorId);
      var stats = (entity && entity.stats) || (GameRegistry.getBalance(armorId) || {}).stats;
      if (stats && stats.defense) {
        def += stats.defense;
      }
    }
    return def;
  }

  function getPlayerSpeed() {
    var speed = _state.player.speed;
    var bootsId = _state.player.equipped.boots;
    if (bootsId) {
      var entity = GameRegistry.getEntity(bootsId);
      var stats = (entity && entity.stats) || (GameRegistry.getBalance(bootsId) || {}).stats;
      if (stats && stats.speed) {
        speed += stats.speed;
      }
    }
    return speed;
  }

  function setPlayerPosition(x, z) {
    _state.player.x = x;
    _state.player.z = z;
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
    if (window.GameHUD) GameHUD.showNotification(`Đã trang bị ${entity.name}`, "success");

    return true;
  }

  function unequipSlot(slot) {
    if (!_state.player.equipped[slot]) return false;
    var entity = GameRegistry.getEntity(_state.player.equipped[slot]);
    addToInventory(_state.player.equipped[slot], 1);
    _state.player.equipped[slot] = null;
    _state.player.maxHp = getPlayerMaxHp();
    _state.player.hp = Math.min(_state.player.hp, _state.player.maxHp);
    if (window.GameHUD) GameHUD.showNotification(`Đã gỡ bỏ ${entity.name}`, "info");
    return true;
  }

  // === Inventory ===
  function addToInventory(id, count) {
    if (_state.inventory[id] === undefined) _state.inventory[id] = 0;
    _state.inventory[id] += count;
  }

  function removeFromInventory(id, count) {
    if (!_state.inventory[id] || _state.inventory[id] < count) return false;
    _state.inventory[id] -= count;
    if (_state.inventory[id] <= 0) delete _state.inventory[id];
    return true;
  }

  function getInventory() { return JSON.parse(JSON.stringify(_state.inventory)); }
  function getInventoryCount(id) { return _state.inventory[id] || 0; }

  // === Building Instances ===
  function addInstance(uid, data) { _state.instances[uid] = data; }
  function getInstance(uid) { return _state.instances[uid] || null; }
  function getAllInstances() { return JSON.parse(JSON.stringify(_state.instances)); }
  function removeInstance(uid) { delete _state.instances[uid]; }
  
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
    GameTerrain.releaseTile(instance.x, instance.z);

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
    }
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
    
    return collected;
  }

  function clearBuildingStorage(instanceUid) {
    delete _state.buildingStorage[instanceUid];
  }

  function getStorageUsed(instanceUid) {
    var storage = _state.buildingStorage[instanceUid] || {};
    var total = 0;
    for (var resId in storage) {
      total += storage[resId] || 0;
    }
    return total;
  }

  function getStorageCapacity(instanceUid) {
    var instance = getInstance(instanceUid);
    if (!instance) return 0;
    
    var balance = GameRegistry.getBalance(instance.entityId);
    if (!balance || !balance.storageCapacity) return Infinity; // No limit if not defined
    
    var level = instance.level || 1;
    return balance.storageCapacity[level] || balance.storageCapacity[1] || 100;
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
  function saveChunkData(key, data) { _state.chunks[key] = data; }
  function getChunkData(key) { return _state.chunks[key] || null; }
  function getAllChunkData() { return _state.chunks; }
  function getChunks() { return _state.chunks; }

  // === Technologies ===
  function getTechState() {
    return JSON.parse(JSON.stringify(_state.techState));
  }

  function setTechState(state) {
    _state.techState = JSON.parse(JSON.stringify(state));
  }

  // === Serialization ===
  function exportState() { return JSON.parse(JSON.stringify(_state)); }

  function importState(data) {
    if (!data) return false;
    _state.resources = data.resources || {};
    _state.buildings = data.buildings || {};
    _state.unlocked = data.unlocked || ["age.stone"];
    _state.researched = data.researched || data.researchedTechs || [];
    _state.techState = data.techState || { currentResearch: null, progress: 0 };
    _state.age = data.age || "age.stone";
    _state.version = data.version || "";
    _state.player = data.player || {
      hp: 100, maxHp: 100, attack: 1, defense: 0,
      x: 8, z: 8, speed: 3,
      equipped: { weapon: null, offhand: null, armor: null, boots: null }
    };
    // Backward compatibility: add boots slot if missing
    if (_state.player.equipped && !_state.player.equipped.hasOwnProperty('boots')) {
      _state.player.equipped.boots = null;
    }
    _state.inventory = data.inventory || {};
    _state.instances = data.instances || {};
    _state.buildingStorage = data.buildingStorage || {};
    _state.chunks = data.chunks || {};
    _state.worldSeed = data.worldSeed || 42;
    _state.fractionalAccumulator = data.fractionalAccumulator || {};
    _state.gameSpeed = data.gameSpeed || 1.0;
    _state.isPaused = data.isPaused || false;
    _state.hunger = data.hunger !== undefined ? data.hunger : 100;
    _state.maxHunger = data.maxHunger || 100;
    _state.timeOfDay = data.timeOfDay !== undefined ? data.timeOfDay : 12;
    _state.fireFuel = data.fireFuel || {};
    _state.exploredChunks = data.exploredChunks || {};
    return true;
  }

  function setGameSpeed(value) { _state.gameSpeed = value; }
  function getGameSpeed() { return _state.gameSpeed; }
  function setGamePaused(value) { _state.isPaused = value; }
  function getGamePaused() { return _state.isPaused; }

  function getShowLockedItems() { return _state.showLockedItems; }
  function setShowLockedItems(value) { _state.showLockedItems = !!value; }

  // === Hunger ===
  function getHunger() { return _state.hunger; }
  function setHunger(val) { _state.hunger = Math.max(0, Math.min(val, _state.maxHunger)); }
  function getMaxHunger() { return _state.maxHunger; }
  function isHungry() { return _state.hunger < 20; }
  function isStarving() { return _state.hunger <= 0; }

  // === Time of Day ===
  function getTimeOfDay() { return _state.timeOfDay; }
  function setTimeOfDay(val) { _state.timeOfDay = val % 24; }

  // === Fire Fuel ===
  function getFireFuel(uid) {
    if (!_state.fireFuel[uid]) return null;
    return _state.fireFuel[uid].current;
  }
  function setFireFuel(uid, current) {
    if (!_state.fireFuel[uid]) {
      var inst = _state.instances[uid];
      var balance = inst ? GameRegistry.getBalance(inst.entityId) : null;
      var maxFuel = (balance && balance.fuelCapacity) ? balance.fuelCapacity : 999;
      _state.fireFuel[uid] = { current: current, max: maxFuel };
    }
    _state.fireFuel[uid].current = Math.max(0, Math.min(current, _state.fireFuel[uid].max));
  }
  function addFireFuel(uid, amount) {
    if (!_state.fireFuel[uid]) {
      var inst = _state.instances[uid];
      var balance = inst ? GameRegistry.getBalance(inst.entityId) : null;
      var maxFuel = (balance && balance.fuelCapacity) ? balance.fuelCapacity : 999;
      _state.fireFuel[uid] = { current: 0, max: maxFuel };
    }
    _state.fireFuel[uid].current = Math.min(_state.fireFuel[uid].max, _state.fireFuel[uid].current + amount);
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
    _state.exploredChunks[cx + "," + cz] = true;
  }
  function isChunkExplored(cx, cz) {
    return !!(_state.exploredChunks[cx + "," + cz]);
  }
  function getExplored() { return _state.exploredChunks; }

  // === Research ===
  function markResearched(techId) {
    if (_state.researched.indexOf(techId) === -1) {
      _state.researched.push(techId);
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
    addBuilding: addBuilding, getBuildingCount: getBuildingCount, getAllBuildings: getAllBuildings,
    unlock: unlock, isUnlocked: isUnlocked, getUnlocked: getUnlocked,
    setAge: setAge, getAge: getAge,
    getVersion: getVersion, setVersion: setVersion,
    getPlayer: getPlayer, setPlayerHP: setPlayerHP, setPlayerPosition: setPlayerPosition,
    getPlayerMaxHp: getPlayerMaxHp, getPlayerAttack: getPlayerAttack, getPlayerDefense: getPlayerDefense,
    getPlayerSpeed: getPlayerSpeed,
    equipItem: equipItem, unequipSlot: unequipSlot,
    addToInventory: addToInventory, removeFromInventory: removeFromInventory,
    getInventory: getInventory, getInventoryCount: getInventoryCount,
    addInstance: addInstance, getInstance: getInstance,
    getAllInstances: getAllInstances, removeInstance: removeInstance,
    destroyInstance: destroyInstance,
    addBuildingStorage: addBuildingStorage, getBuildingStorage: getBuildingStorage,
    collectFromBuilding: collectFromBuilding, clearBuildingStorage: clearBuildingStorage,
    getStorageUsed: getStorageUsed, getStorageCapacity: getStorageCapacity,
    canDeposit: canDeposit, tryDepositToBuilding: tryDepositToBuilding,
    saveChunkData: saveChunkData, getChunkData: getChunkData, getAllChunkData: getAllChunkData,
    getChunks: getChunks,
    getTechState: getTechState, setTechState: setTechState,
    exportState: exportState, importState: importState,
    setGameSpeed: setGameSpeed, getGameSpeed: getGameSpeed,
    setGamePaused: setGamePaused, getGamePaused: getGamePaused,
    getShowLockedItems: getShowLockedItems,
    setShowLockedItems: setShowLockedItems,
    markResearched: markResearched,
    isResearched: isResearched,
    getResearched: getResearched,
    getHunger: getHunger, setHunger: setHunger,
    getMaxHunger: getMaxHunger, isHungry: isHungry, isStarving: isStarving,
    getTimeOfDay: getTimeOfDay, setTimeOfDay: setTimeOfDay,
    getFireFuel: getFireFuel, setFireFuel: setFireFuel,
    addFireFuel: addFireFuel, getFireFuelMax: getFireFuelMax,
    getFireFuelData: getFireFuelData,
    markChunkExplored: markChunkExplored, isChunkExplored: isChunkExplored,
    getExplored: getExplored
  };
})();
