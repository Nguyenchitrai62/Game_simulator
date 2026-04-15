window.UnlockSystem = (function () {
  var _newlyUnlocked = [];

  function checkAll() {
    _newlyUnlocked = [];
    var entities = GameRegistry.getAllEntities();
    var passCount = 0;
    var hadUnlocks;

    // Run multiple passes until no more unlocks or max 10 passes
    do {
      hadUnlocks = false;
      passCount++;

      for (var id in entities) {
        var entity = entities[id];
        if (entity.type === "age") continue;
        if (GameState.isUnlocked(id)) continue;
        if (!entity.unlock) continue;

        if (checkConditions(entity.unlock)) {
          var isNew = GameState.unlock(id);
          if (isNew) {
            _newlyUnlocked.push(entity);
            hadUnlocks = true;
          }
        }
      }
    } while (hadUnlocks && passCount < 10);
  }

  function checkConditions(conditions) {
    if (conditions.age && GameState.getAge() !== conditions.age) {
      return false;
    }

    if (conditions.resources) {
      for (var resId in conditions.resources) {
        if (GameState.getSpendableResource(resId) < conditions.resources[resId]) {
          return false;
        }
      }
    }

    if (conditions.buildings) {
      for (var buildingId in conditions.buildings) {
        if (GameState.getBuildingCount(buildingId) < conditions.buildings[buildingId]) {
          return false;
        }
      }
    }

    if (conditions.technologies) {
      for (var i = 0; i < conditions.technologies.length; i++) {
        if (!GameState.isResearched(conditions.technologies[i])) {
          return false;
        }
      }
    }

    return true;
  }

  function getNewlyUnlocked() {
    return _newlyUnlocked.slice();
  }

  function getNextUnlocks() {
    var entities = GameRegistry.getAllEntities();
    var next = [];

    for (var id in entities) {
      var entity = entities[id];
      if (entity.type === "age") continue;
      if (GameState.isUnlocked(id)) continue;
      if (!entity.unlock) continue;

      var progress = getUnlockProgress(entity);
      if (progress.percent >= 0) {
        next.push({ entity: entity, progress: progress });
      }
    }

    next.sort(function (a, b) {
      return b.progress.percent - a.progress.percent;
    });

    return next;
  }

  function getUnlockProgress(entity) {
    if (!entity.unlock) return { percent: 1, details: [] };

    var conditions = entity.unlock;
    var total = 0;
    var met = 0;
    var details = [];

    if (conditions.age) {
      total++;
      if (GameState.getAge() === conditions.age) met++;
      details.push({
        type: "age",
        target: conditions.age,
        met: GameState.getAge() === conditions.age
      });
    }

    if (conditions.resources) {
      for (var resId in conditions.resources) {
        total++;
        var current = GameState.getSpendableResource(resId);
        var target = conditions.resources[resId];
        if (current >= target) {
          met++;
          details.push({ type: "resource", id: resId, current: current, target: target, met: true });
        } else {
          details.push({ type: "resource", id: resId, current: current, target: target, met: false });
        }
      }
    }

    if (conditions.buildings) {
      for (var buildingId in conditions.buildings) {
        total++;
        var current = GameState.getBuildingCount(buildingId);
        var target = conditions.buildings[buildingId];
        if (current >= target) {
          met++;
          details.push({ type: "building", id: buildingId, current: current, target: target, met: true });
        } else {
          details.push({ type: "building", id: buildingId, current: current, target: target, met: false });
        }
      }
    }

    if (conditions.technologies) {
      for (var i = 0; i < conditions.technologies.length; i++) {
        total++;
        var techId = conditions.technologies[i];
        var hasTech = GameState.isResearched(techId);
        if (hasTech) {
          met++;
        }
        details.push({ type: "technology", id: techId, met: hasTech });
      }
    }

    return {
      percent: total > 0 ? met / total : 1,
      details: details
    };
  }

  function formatUnlockTooltip(entity) {
    var progress = getUnlockProgress(entity);
    var lines = ['<div style="font-weight:bold; margin-bottom:6px;">🔒 Locked requirements:</div>'];
    
    progress.details.forEach(function (d) {
      var statusIcon = d.met ? '✅' : '⬜';
      var text = '';
      
      if (d.type === 'age') {
        var ageEntity = GameRegistry.getEntity(d.target);
        text = statusIcon + ' Reach ' + (ageEntity ? ageEntity.name : d.target);
      } else if (d.type === 'resource') {
        var resEntity = GameRegistry.getEntity(d.id);
        var resName = resEntity ? resEntity.name : d.id;
        text = statusIcon + ' Need ' + resName + ' (' + Math.floor(d.current) + '/' + d.target + ')';
      } else if (d.type === 'building') {
        var buildingEntity = GameRegistry.getEntity(d.id);
        var buildingName = buildingEntity ? buildingEntity.name : d.id;
        text = statusIcon + ' Need ' + buildingName + ' (' + d.current + '/' + d.target + ')';
      } else if (d.type === 'technology') {
        var techEntity = GameRegistry.getEntity(d.id);
        var techName = techEntity ? techEntity.name : d.id;
        text = statusIcon + ' Research ' + techName;
      }
      
      if (text) {
        lines.push('<div style="margin:2px 0; color:' + (d.met ? '#4ecca3' : '#aaa') + '">' + text + '</div>');
      }
    });
    
    return lines.join('');
  }

  return {
    checkAll: checkAll,
    getNewlyUnlocked: getNewlyUnlocked,
    getNextUnlocks: getNextUnlocks,
    getUnlockProgress: getUnlockProgress,
    formatUnlockTooltip: formatUnlockTooltip
  };
})();
