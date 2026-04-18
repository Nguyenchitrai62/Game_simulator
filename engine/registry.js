window.GameRegistry = (function () {
  var _entities = {};
  var _balance = {};

  function init() {
    _balance = window.GAME_BALANCE || {};
    _entities = {};

    var manifest = window.GAME_MANIFEST || { packs: [] };
    var content = window.GAME_CONTENT || {};

    manifest.packs.forEach(function (packId) {
      var pack = content[packId];
      if (!pack || !pack.entities) return;

      pack.entities.forEach(function (entity) {
        if (_entities[entity.id]) {
          console.warn("[Registry] Duplicate entity ID: " + entity.id);
          return;
        }
        var merged = mergeEntity(entity, _balance[entity.id]);
        _entities[entity.id] = merged;
      });
    });
  }

  function mergeEntity(contentEntity, balanceData) {
    var merged = {};
    for (var key in contentEntity) {
      merged[key] = contentEntity[key];
    }
    if (balanceData) {
      for (var key in balanceData) {
        if (merged[key] === undefined) {
          merged[key] = balanceData[key];
        }
      }
      merged._balance = balanceData;
    }
    return merged;
  }

  function getEntity(id) {
    return _entities[id] || null;
  }

  function getEntitiesByType(type) {
    var results = [];
    for (var id in _entities) {
      if (_entities[id].type === type) {
        results.push(_entities[id]);
      }
    }
    return results;
  }

  function getBalance(id) {
    return _balance[id] || null;
  }

  function getAnimalDisposition(id) {
    if (!id || id.indexOf('animal.') !== 0) return null;

    var balance = getBalance(id) || {};
    if (balance.animalDisposition) return balance.animalDisposition;
    return (Number(balance.attack) || 0) > 0 ? 'threat' : 'prey';
  }

  function isAnimalThreat(id) {
    return getAnimalDisposition(id) === 'threat';
  }

  function isAnimalPrey(id) {
    return getAnimalDisposition(id) === 'prey';
  }

  function getUnlocksForAge(ageId) {
    var results = [];
    for (var id in _entities) {
      var entity = _entities[id];
      if (entity.unlock && entity.unlock.age === ageId && entity.type !== "age") {
        results.push(entity);
      }
    }
    return results;
  }

  function getAllEntities() {
    return _entities;
  }

  function getAllBalance() {
    return _balance;
  }

  function getEntitiesByUnlockAge(ageId) {
    var results = [];
    for (var id in _entities) {
      var entity = _entities[id];
      if (entity.unlock && entity.unlock.age === ageId) {
        results.push(entity);
      }
    }
    return results;
  }

  return {
    init: init,
    getEntity: getEntity,
    getEntitiesByType: getEntitiesByType,
    getBalance: getBalance,
    getAnimalDisposition: getAnimalDisposition,
    isAnimalThreat: isAnimalThreat,
    isAnimalPrey: isAnimalPrey,
    getUnlocksForAge: getUnlocksForAge,
    getEntitiesByUnlockAge: getEntitiesByUnlockAge,
    getAllEntities: getAllEntities,
    getAllBalance: getAllBalance
  };
})();
