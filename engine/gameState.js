window.GameState = (function () {
  var _state = {
    resources: {},
    buildings: {},
    unlocked: [],
    researchedTechs: [],
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
        armor: null
      }
    },
    inventory: {},
    instances: {},
    chunks: {},
    worldSeed: 42,
    fractionalAccumulator: {},
    gameSpeed: 1.0,
    isPaused: false
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
      equipped: { weapon: null, offhand: null, armor: null }
    };
    _state.inventory = {};
    _state.instances = {};
    _state.chunks = {};
    _state.worldSeed = Math.floor(Math.random() * 100000);
    _state.fractionalAccumulator = {};
  }

  // === Resources ===
  function addResource(id, amount) {
    if (_state.resources[id] === undefined) _state.resources[id] = 0;
    _state.resources[id] += amount;
    if (_state.resources[id] < 0) _state.resources[id] = 0;
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
      if (entity && entity.stats && entity.stats.maxHp) {
        maxHp += entity.stats.maxHp;
      }
    }
    return maxHp;
  }

  function getPlayerAttack() {
    var atk = _state.player.attack;
    var weaponId = _state.player.equipped.weapon;
    if (weaponId) {
      var entity = GameRegistry.getEntity(weaponId);
      if (entity && entity.stats && entity.stats.attack) {
        atk += entity.stats.attack;
      }
    }
    return atk;
  }

  function getPlayerDefense() {
    var def = _state.player.defense;
    var offhandId = _state.player.equipped.offhand;
    if (offhandId) {
      var entity = GameRegistry.getEntity(offhandId);
      if (entity && entity.stats && entity.stats.defense) {
        def += entity.stats.defense;
      }
    }
    var armorId = _state.player.equipped.armor;
    if (armorId) {
      var entity = GameRegistry.getEntity(armorId);
      if (entity && entity.stats && entity.stats.defense) {
        def += entity.stats.defense;
      }
    }
    return def;
  }

  function equipItem(equipmentId) {
    var entity = GameRegistry.getEntity(equipmentId);
    if (!entity || entity.type !== "equipment") return false;

    var slot = entity.slot;
    var oldMaxHp = getPlayerMaxHp();
    
    // Unequip current
    if (_state.player.equipped[slot]) {
      addToInventory(_state.player.equipped[slot], 1);
    }
    // Remove from inventory
    removeFromInventory(equipmentId, 1);
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
    if (window.GameUI) GameUI.showNotification(`Đã trang bị ${entity.name}`, "success");

    return true;
  }

  function unequipSlot(slot) {
    if (!_state.player.equipped[slot]) return false;
    var entity = GameRegistry.getEntity(_state.player.equipped[slot]);
    addToInventory(_state.player.equipped[slot], 1);
    _state.player.equipped[slot] = null;
    _state.player.maxHp = getPlayerMaxHp();
    _state.player.hp = Math.min(_state.player.hp, _state.player.maxHp);
    if (window.GameUI) GameUI.showNotification(`Đã gỡ bỏ ${entity.name}`, "info");
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
    
    // Refund 50% cost
    if (entity.cost) {
      for (var resId in entity.cost) {
        var refundAmount = Math.floor(entity.cost[resId] * 0.5);
        if (refundAmount > 0) {
          addResource(resId, refundAmount);
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
    GameWorld.releaseTile(instance.x, instance.z);
    
    // Remove instance
    removeInstance(uid);
    
    // Recheck unlocks
    UnlockSystem.checkAll();
    
    return true;
  }

  // === Chunks ===
  function saveChunkData(key, data) { _state.chunks[key] = data; }
  function getChunkData(key) { return _state.chunks[key] || null; }
  function getAllChunkData() { return _state.chunks; }

  // === Technologies ===
  function addResearchedTech(techId) {
    if (_state.researchedTechs.indexOf(techId) === -1) {
      _state.researchedTechs.push(techId);
    }
  }

  function hasResearched(techId) {
    return _state.researchedTechs.indexOf(techId) !== -1;
  }

  function getResearchedTechs() {
    return _state.researchedTechs.slice();
  }

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
    _state.researchedTechs = data.researchedTechs || [];
    _state.techState = data.techState || { currentResearch: null, progress: 0 };
    _state.age = data.age || "age.stone";
    _state.version = data.version || "";
    _state.player = data.player || {
      hp: 100, maxHp: 100, attack: 1, defense: 0,
      x: 8, z: 8, speed: 3,
      equipped: { weapon: null, offhand: null, armor: null }
    };
    _state.inventory = data.inventory || {};
    _state.instances = data.instances || {};
    _state.chunks = data.chunks || {};
    _state.worldSeed = data.worldSeed || 42;
    _state.fractionalAccumulator = data.fractionalAccumulator || {};
    _state.gameSpeed = data.gameSpeed || 1.0;
    _state.isPaused = data.isPaused || false;
    return true;
  }

  function setGameSpeed(value) { _state.gameSpeed = value; }
  function getGameSpeed() { return _state.gameSpeed; }
  function setGamePaused(value) { _state.isPaused = value; }
  function getGamePaused() { return _state.isPaused; }

  function getShowLockedItems() { return _state.showLockedItems; }
  function setShowLockedItems(value) { _state.showLockedItems = !!value; }

  return {
    init: init,
    addResource: addResource, addFractionalResource: addFractionalResource, removeResource: removeResource,
    getResource: getResource, hasResource: hasResource, getAllResources: getAllResources,
    addBuilding: addBuilding, getBuildingCount: getBuildingCount, getAllBuildings: getAllBuildings,
    unlock: unlock, isUnlocked: isUnlocked, getUnlocked: getUnlocked,
    setAge: setAge, getAge: getAge,
    getVersion: getVersion, setVersion: setVersion,
    getPlayer: getPlayer, setPlayerHP: setPlayerHP,
    getPlayerMaxHp: getPlayerMaxHp, getPlayerAttack: getPlayerAttack, getPlayerDefense: getPlayerDefense,
    equipItem: equipItem, unequipSlot: unequipSlot,
    addToInventory: addToInventory, removeFromInventory: removeFromInventory,
    getInventory: getInventory, getInventoryCount: getInventoryCount,
    addInstance: addInstance, getInstance: getInstance,
    getAllInstances: getAllInstances, removeInstance: removeInstance,
    destroyInstance: destroyInstance,
    saveChunkData: saveChunkData, getChunkData: getChunkData, getAllChunkData: getAllChunkData,
    addResearchedTech: addResearchedTech, hasResearched: hasResearched,
    getResearchedTechs: getResearchedTechs, getTechState: getTechState, setTechState: setTechState,
    exportState: exportState, importState: importState,
    setGameSpeed: setGameSpeed, getGameSpeed: getGameSpeed,
    setGamePaused: setGamePaused, getGamePaused: getGamePaused,
    getShowLockedItems: getShowLockedItems,
    setShowLockedItems: setShowLockedItems
  };
})();
