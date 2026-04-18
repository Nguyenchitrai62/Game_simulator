window.GameRegistry = (function () {
  var _entities = {};
  var _balance = {};
  var STAT_METADATA = {
    attack: { order: 1, label: 'Attack', shortLabel: 'ATK' },
    defense: { order: 2, label: 'Defense', shortLabel: 'DEF' },
    maxHp: { order: 3, label: 'Max HP', shortLabel: 'HP' },
    speed: { order: 4, label: 'Speed', shortLabel: 'SPD' }
  };

  function formatTemplate(value, tokens) {
    var text = String(value == null ? '' : value);
    if (!tokens) return text;

    for (var tokenName in tokens) {
      if (!tokens.hasOwnProperty(tokenName)) continue;
      text = text.split('{' + tokenName + '}').join(String(tokens[tokenName]));
    }

    return text;
  }

  function t(path, tokens, fallback) {
    if (window.GameI18n && GameI18n.t) {
      return GameI18n.t('registry.' + path, tokens, fallback);
    }
    if (fallback !== undefined) return formatTemplate(fallback, tokens);
    return formatTemplate(path, tokens);
  }

  function getStatMetadata(statKey) {
    var meta = STAT_METADATA[statKey];
    if (!meta) {
      return {
        order: 99,
        label: statKey,
        shortLabel: statKey
      };
    }

    return {
      order: meta.order,
      label: t('stats.' + statKey + '.label', null, meta.label),
      shortLabel: t('stats.' + statKey + '.shortLabel', null, meta.shortLabel)
    };
  }

  function formatBalanceNumber(value) {
    var numericValue = Number(value);
    if (!isFinite(numericValue)) return String(value);
    if (Math.abs(numericValue - Math.round(numericValue)) < 0.0001) {
      return String(Math.round(numericValue));
    }
    return numericValue.toFixed(2).replace(/\.?0+$/, '');
  }

  function getStatOrder(statKey) {
    return STAT_METADATA[statKey] ? STAT_METADATA[statKey].order : 99;
  }

  function getStatSummary(stats, options) {
    options = options || {};
    if (!stats) return '';

    var keys = Object.keys(stats).filter(function (statKey) {
      var numericValue = Number(stats[statKey]);
      return isFinite(numericValue) && numericValue !== 0;
    });

    if (!keys.length) return '';

    keys.sort(function (leftKey, rightKey) {
      return getStatOrder(leftKey) - getStatOrder(rightKey);
    });

    var shortLabels = !!options.shortLabels;
    var joiner = options.joiner !== undefined ? options.joiner : ', ';
    var parts = [];

    keys.forEach(function (statKey) {
      var numericValue = Number(stats[statKey]);
      var valueText = (numericValue > 0 ? '+' : '-') + formatBalanceNumber(Math.abs(numericValue));
      var meta = getStatMetadata(statKey);
      var label = shortLabels ? meta.shortLabel : meta.label;
      parts.push(valueText + ' ' + label);
    });

    return parts.join(joiner);
  }

  function buildEquipmentDescription(balanceData) {
    if (!balanceData) return null;

    var statSummary = getStatSummary(balanceData.stats, { shortLabels: false });
    var flavorText = balanceData.flavorText ? String(balanceData.flavorText).trim() : '';
    if (!statSummary && !flavorText) return null;

    var parts = [];
    if (statSummary) parts.push(statSummary + '.');
    if (flavorText) parts.push(flavorText);
    return parts.join(' ');
  }

  function buildRecipeDescription(contentEntity, balanceData) {
    if (!balanceData || !balanceData.output) return null;

    var outputIds = Object.keys(balanceData.output);
    if (outputIds.length !== 1) return null;

    var outputId = outputIds[0];
    var outputEntity = _entities[outputId] || null;
    if (!outputEntity || outputEntity.type !== 'equipment') return null;

    var outputBalance = getBalance(outputId) || {};
    var statSummary = getStatSummary(outputBalance.stats, { shortLabels: false });
    var flavorText = balanceData.flavorText ? String(balanceData.flavorText).trim() : '';
    if (!statSummary && !flavorText) return null;

    var recipeName = contentEntity && contentEntity.name ? contentEntity.name : outputEntity.name;
    var parts = [t('recipeDescription.craft', { name: recipeName }, 'Craft {name}.')];
    if (statSummary) parts.push(statSummary + '.');
    if (flavorText) parts.push(flavorText);
    return parts.join(' ');
  }

  function getDerivedDescription(contentEntity, balanceData) {
    if (!balanceData) return null;
    if (balanceData.description !== undefined) return balanceData.description;
    if (!contentEntity) return null;
    if (contentEntity.type === 'equipment') return buildEquipmentDescription(balanceData);
    if (contentEntity.type === 'recipe') return buildRecipeDescription(contentEntity, balanceData);
    return null;
  }

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
      var derivedDescription = getDerivedDescription(contentEntity, balanceData);
      if (!contentEntity._i18nDescriptionOverridden && derivedDescription !== undefined && derivedDescription !== null) {
        merged.description = derivedDescription;
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
    getStatSummary: getStatSummary,
    formatBalanceNumber: formatBalanceNumber,
    getAnimalDisposition: getAnimalDisposition,
    isAnimalThreat: isAnimalThreat,
    isAnimalPrey: isAnimalPrey,
    getUnlocksForAge: getUnlocksForAge,
    getEntitiesByUnlockAge: getEntitiesByUnlockAge,
    getAllEntities: getAllEntities,
    getAllBalance: getAllBalance
  };
})();
