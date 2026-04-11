window.GameValidator = (function () {
  var _errors = [];
  var _warnings = [];

  function validateAll() {
    _errors = [];
    _warnings = [];

    checkDuplicateIds();
    checkMissingBalance();
    checkMissingDependencies();
    checkResourceLoops();
    checkUnlockDeadlocks();

    return {
      valid: _errors.length === 0,
      errors: _errors.slice(),
      warnings: _warnings.slice()
    };
  }

  function checkDuplicateIds() {
    var seen = {};
    var content = window.GAME_CONTENT || {};

    for (var packId in content) {
      var pack = content[packId];
      if (!pack.entities) continue;

      pack.entities.forEach(function (entity) {
        if (seen[entity.id]) {
          _errors.push("Duplicate ID: " + entity.id + " (found in " + seen[entity.id] + " and " + packId + ")");
        } else {
          seen[entity.id] = packId;
        }
      });
    }
  }

  function checkMissingBalance() {
    var content = window.GAME_CONTENT || {};

    for (var packId in content) {
      var pack = content[packId];
      if (!pack.entities) continue;

      pack.entities.forEach(function (entity) {
        var type = entity.type;
        if (type === "age" || type === "resource") return;

        var balance = window.GAME_BALANCE[entity.id];
        if (!balance) {
          _warnings.push("Missing balance for: " + entity.id + " (" + type + ")");
        } else {
          if (type === "building" && !balance.cost) {
            _warnings.push("Building " + entity.id + " has no cost defined in balance");
          }
          if (type === "recipe" && (!balance.input || !balance.output)) {
            _warnings.push("Recipe " + entity.id + " missing input/output in balance");
          }
        }
      });
    }
  }

  function checkMissingDependencies() {
    var content = window.GAME_CONTENT || {};
    var allIds = {};

    for (var packId in content) {
      var pack = content[packId];
      if (!pack.entities) continue;
      pack.entities.forEach(function (entity) {
        allIds[entity.id] = true;
      });
    }

    for (var packId in content) {
      var pack = content[packId];
      if (!pack.entities) continue;

      pack.entities.forEach(function (entity) {
        if (!entity.unlock) return;

        if (entity.unlock.age && !allIds[entity.unlock.age]) {
          _errors.push("Entity " + entity.id + " references unknown age: " + entity.unlock.age);
        }

        if (entity.unlock.resources) {
          for (var resId in entity.unlock.resources) {
            if (!allIds[resId]) {
              _errors.push("Entity " + entity.id + " references unknown resource: " + resId);
            }
          }
        }

        if (entity.unlock.buildings) {
          for (var bldId in entity.unlock.buildings) {
            if (!allIds[bldId]) {
              _errors.push("Entity " + entity.id + " references unknown building: " + bldId);
            }
          }
        }
      });
    }
  }

  function checkResourceLoops() {
    var balance = window.GAME_BALANCE || {};

    for (var recipeId in balance) {
      var entry = balance[recipeId];
      if (!entry.input || !entry.output) continue;

      for (var outRes in entry.output) {
        for (var inRes in entry.input) {
          if (outRes === inRes) {
            var inAmount = entry.input[inRes];
            var outAmount = entry.output[outRes];
            if (outAmount >= inAmount) {
              _errors.push("Resource loop in " + recipeId + ": output " + outRes + " (" + outAmount + ") >= input (" + inAmount + ")");
            }
          }
        }
      }
    }
  }

  function checkUnlockDeadlocks() {
    var content = window.GAME_CONTENT || {};
    var entities = {};

    for (var packId in content) {
      var pack = content[packId];
      if (!pack.entities) continue;
      pack.entities.forEach(function (entity) {
        entities[entity.id] = entity;
      });
    }

    for (var id in entities) {
      var entity = entities[id];
      if (!entity.unlock) continue;

      if (entity.unlock.resources) {
        for (var resId in entity.unlock.resources) {
          var resEntity = entities[resId];
          if (resEntity && resEntity.unlock && resEntity.unlock.resources) {
            for (var depResId in resEntity.unlock.resources) {
              if (depResId === id) {
                _errors.push("Unlock deadlock: " + id + " and " + resId + " depend on each other");
              }
            }
          }
        }
      }

      if (entity.unlock.buildings) {
        for (var bldId in entity.unlock.buildings) {
          var bldEntity = entities[bldId];
          if (bldEntity && bldEntity.unlock) {
            if (bldEntity.unlock.resources && bldEntity.unlock.resources[id]) {
              _errors.push("Unlock deadlock: " + id + " and " + bldId + " depend on each other");
            }
            if (bldEntity.unlock.buildings && bldEntity.unlock.buildings[id]) {
              _errors.push("Unlock deadlock: " + id + " and " + bldId + " depend on each other");
            }
          }
        }
      }
    }
  }

  function printReport() {
    var result = validateAll();
    console.log("=== Game Validation Report ===");
    console.log("Status: " + (result.valid ? "VALID" : "INVALID"));
    console.log("Errors: " + result.errors.length);
    result.errors.forEach(function (e) { console.error("  [ERROR] " + e); });
    console.log("Warnings: " + result.warnings.length);
    result.warnings.forEach(function (w) { console.warn("  [WARN] " + w); });
    return result;
  }

  return {
    validateAll: validateAll,
    checkDuplicateIds: checkDuplicateIds,
    checkMissingBalance: checkMissingBalance,
    checkMissingDependencies: checkMissingDependencies,
    checkResourceLoops: checkResourceLoops,
    checkUnlockDeadlocks: checkUnlockDeadlocks,
    printReport: printReport
  };
})();
