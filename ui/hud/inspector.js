window.GameHUDModules = window.GameHUDModules || {};

window.GameHUDModules.createInspectorModule = function createInspectorModule(context) {
  var t = context.t;
  var escapeHtml = context.escapeHtml;
  var setInnerHtmlIfChanged = context.setInnerHtmlIfChanged;
  var showNotification = context.showNotification;
  var getSelectedInstance = context.getSelectedInstance;
  var setSelectedInstance = context.setSelectedInstance;
  var setHoveredInstance = context.setHoveredInstance;

  function selectInstance(uid) {
    if (BuildingSystem.isBuildMode()) return;
    setSelectedInstance(uid);
    showBuildingInspector(uid);
    if (window.RangeIndicator) RangeIndicator.show(uid);
  }

  function showBuildingInspector(uid) {
    var instance = GameState.getInstance(uid);
    if (!instance) return;

    var entity = GameRegistry.getEntity(instance.entityId);
    if (!entity) return;

    var inspector = document.getElementById('building-inspector');
    if (!inspector) return;

    var balance = GameRegistry.getBalance(instance.entityId);
    var currentLevel = instance.level || 1;
    var levelText = 'Lv.' + currentLevel;
    var inspectorT = function(path, tokens, fallback) {
      return t('hud.inspector.' + path, tokens, fallback);
    };

    var upgradeHtml = '';
    var upgradeCheck = UpgradeSystem.canUpgrade(instance.entityId, uid);

    if (upgradeCheck.can && upgradeCheck.upgrade) {
      var nextLevel = upgradeCheck.level;
      var upgrade = upgradeCheck.upgrade;
      var costParts = [];
      var canAfford = true;
      if (upgrade.cost) {
        for (var upgradeResId in upgrade.cost) {
          var upgradeNeeded = upgrade.cost[upgradeResId];
          var upgradeHave = GameState.getSpendableResource(upgradeResId) || 0;
          var upgradeEntity = GameRegistry.getEntity(upgradeResId);
          var upgradeName = upgradeEntity ? upgradeEntity.name : upgradeResId;
          var upgradeColor = upgradeHave >= upgradeNeeded ? '#4ecca3' : '#e63946';
          if (upgradeHave < upgradeNeeded) canAfford = false;
          costParts.push('<span style="color:' + upgradeColor + '">' + upgradeNeeded + ' ' + escapeHtml(upgradeName) + '</span>');
        }
      }

      var benefits = [];
      if (upgrade.productionMultiplier) benefits.push('x' + upgrade.productionMultiplier + ' prod');
      if (balance.workerCount && balance.workerCount[nextLevel]) benefits.push(balance.workerCount[nextLevel] + ' workers');
      if (balance.searchRadius && balance.searchRadius[nextLevel]) benefits.push(balance.searchRadius[nextLevel] + ' range');

      upgradeHtml = '<div class="inspector-section">' +
        '<div style="color:#4ecca3; font-size:11px; font-weight:bold;">⬆ Lv.' + nextLevel + ': ' + costParts.join(', ') + '</div>' +
        (benefits.length > 0 ? '<div style="color:#ffb74d; font-size:10px;">→ ' + benefits.join(', ') + '</div>' : '') +
        '<button class="btn btn-primary" style="margin-top:4px; font-size:11px; padding:3px 10px;" onclick="GameActions.upgrade(\'' + instance.entityId + '\', \'' + uid + '\')" ' +
        (canAfford ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"') + '>Upgrade</button>' +
        '</div>';
    } else if (upgradeCheck.reason === 'Not enough resources' && balance.upgrades) {
      var nextLevelKey = (instance.level || 1) + 1;
      if (balance.upgrades[nextLevelKey]) {
        var pendingUpgrade = balance.upgrades[nextLevelKey];
        var pendingCostParts = [];
        if (pendingUpgrade.cost) {
          for (var pendingResId in pendingUpgrade.cost) {
            var pendingNeeded = pendingUpgrade.cost[pendingResId];
            var pendingHave = GameState.getSpendableResource(pendingResId) || 0;
            var pendingEntity = GameRegistry.getEntity(pendingResId);
            var pendingName = pendingEntity ? pendingEntity.name : pendingResId;
            var pendingColor = pendingHave >= pendingNeeded ? '#4ecca3' : '#e63946';
            pendingCostParts.push('<span style="color:' + pendingColor + '">' + pendingNeeded + ' ' + escapeHtml(pendingName) + ' <small>(' + Math.floor(pendingHave) + ')</small></span>');
          }
        }

        var pendingBenefits = [];
        if (pendingUpgrade.productionMultiplier) pendingBenefits.push('x' + pendingUpgrade.productionMultiplier + ' prod');
        if (balance.workerCount && balance.workerCount[nextLevelKey]) pendingBenefits.push(balance.workerCount[nextLevelKey] + ' workers');
        if (balance.searchRadius && balance.searchRadius[nextLevelKey]) pendingBenefits.push(balance.searchRadius[nextLevelKey] + ' range');

        upgradeHtml = '<div class="inspector-section">' +
          '<div style="color:#4ecca3; font-size:11px; font-weight:bold;">⬆ Lv.' + nextLevelKey + ': ' + pendingCostParts.join(', ') + '</div>' +
          (pendingBenefits.length > 0 ? '<div style="color:#ffb74d; font-size:10px;">→ ' + pendingBenefits.join(', ') + '</div>' : '') +
          '<button class="btn btn-primary" disabled style="margin-top:4px; font-size:11px; padding:3px 10px; opacity:0.5;">' + escapeHtml(inspectorT('needResources', null, 'Need Resources')) + '</button>' +
          '</div>';
      }
    } else if (upgradeCheck.reason === 'Max level reached') {
      upgradeHtml = '<div class="inspector-section" style="color:#4ecca3; font-size:11px;">⭐ ' + escapeHtml(inspectorT('maxLevel', null, 'Max Level')) + '</div>';
    }

    var storageHtml = '';
    if (balance && balance.storageCapacity) {
      var storageCapacity = GameState.getStorageCapacity(uid);
      if (storageCapacity > 0) {
        var storageUsed = GameState.getStorageUsed(uid);
        var storagePct = storageCapacity > 0 ? Math.floor((storageUsed / storageCapacity) * 100) : 0;
        var storageColor = storagePct >= 90 ? '#e63946' : (storagePct >= 70 ? '#f0a500' : '#4ecca3');

        var storage = GameState.getBuildingStorage(uid);
        var storageParts = [];
        var hasResources = false;
        for (var storageResId in storage) {
          if (storage[storageResId] > 0) {
            hasResources = true;
            var storageEntity = GameRegistry.getEntity(storageResId);
            storageParts.push(storage[storageResId] + ' ' + (storageEntity ? storageEntity.name : storageResId));
          }
        }

        storageHtml = '<div class="inspector-section">' +
          '<div style="font-size:11px;">' + escapeHtml(inspectorT('storage', null, 'Storage')) + ': <span style="color:' + storageColor + '; font-weight:bold;">' + storageUsed + '/' + storageCapacity + '</span>';

        if (hasResources) {
          storageHtml += ' <span style="color:#ffb74d;">(' + storageParts.join(', ') + ')</span>' +
            '</div>' +
            '<button class="btn btn-success" style="margin-top:4px; font-size:11px; padding:3px 10px;" onclick="GameActions.collectFromBuilding(\'' + uid + '\')">' + escapeHtml(inspectorT('collect', null, 'Collect')) + '</button>';
        } else {
          storageHtml += '</div><div style="color:#555; font-size:10px;">' + escapeHtml(inspectorT('empty', null, 'Empty')) + '</div>';
        }
        storageHtml += '</div>';
      }
    }

    var fuelHtml = '';
    if (balance && balance.lightRadius) {
      var fuelData = GameState.getFireFuelData ? GameState.getFireFuelData(uid) : null;
      var currentFuel = fuelData ? fuelData.current : (balance.fuelCapacity || 999);
      var maxFuel = balance.fuelCapacity || 999;
      var fuelPct = maxFuel > 0 ? Math.floor((currentFuel / maxFuel) * 100) : 0;
      var fuelColor = fuelPct > 50 ? '#4ecca3' : (fuelPct > 20 ? '#f0a500' : '#e94560');
      var needsFuel = currentFuel < maxFuel;
      var isNight = typeof DayNightSystem !== 'undefined' && DayNightSystem.isNight();
      var coverageText = currentFuel <= 0
        ? inspectorT('noActiveCoverage', null, 'No active coverage - out of fuel.')
        : (isNight ? inspectorT('coverageActiveNow', null, 'Coverage active now for nearby workers.') : inspectorT('coverageNightAuto', null, 'Coverage turns on automatically at night.'));
      var coverageColor = currentFuel <= 0 ? '#e63946' : (isNight ? '#ffb74d' : '#c7d6e8');

      fuelHtml = '<div class="inspector-section">' +
        '<div style="font-size:11px;">🔥 ' + escapeHtml(inspectorT('fuel', null, 'Fuel')) + ': <span style="color:' + fuelColor + '; font-weight:bold;">' + Math.floor(currentFuel) + '/' + maxFuel + '</span> (' + fuelPct + '%)</div>';
      fuelHtml += '<div style="height:8px; background:rgba(15,52,96,0.9); border-radius:5px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); margin-top:5px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.28);">';
      fuelHtml += '<div style="width:' + fuelPct + '%; height:100%; background:linear-gradient(90deg, ' + fuelColor + ', #ffd166); border-radius:4px; transition:width 0.3s linear;"></div>';
      fuelHtml += '</div>';
      fuelHtml += '<div style="color:#888; font-size:10px; margin-top:3px;">' + escapeHtml(inspectorT('burningCopy', null, 'Burning down through the night. Refuel fills the bar back to max.')) + '</div>';
      fuelHtml += '<div style="color:#ffb74d; font-size:10px; margin-top:3px;">' + escapeHtml(inspectorT('lightRadius', { count: balance.lightRadius }, 'Light radius: {count} tiles')) + '</div>';
      fuelHtml += '<div style="color:' + coverageColor + '; font-size:10px; margin-top:2px;">' + coverageText + '</div>';

      if (balance.refuelCost) {
        var refuelParts = [];
        var canRefuel = needsFuel;
        for (var fuelResId in balance.refuelCost) {
          var fuelNeeded = balance.refuelCost[fuelResId];
          var fuelHave = GameState.getSpendableResource(fuelResId);
          var fuelEntity = GameRegistry.getEntity(fuelResId);
          var fuelName = fuelEntity ? fuelEntity.name : fuelResId;
          var fuelCostColor = fuelHave >= fuelNeeded ? '#4ecca3' : '#e63946';
          if (fuelHave < fuelNeeded) canRefuel = false;
          refuelParts.push('<span style="color:' + fuelCostColor + '">' + fuelNeeded + ' ' + escapeHtml(fuelName) + '</span>');
        }
        fuelHtml += '<div style="color:#888; font-size:10px; margin-top:2px;">' + escapeHtml(inspectorT('refuelCost', null, 'Refuel')) + ': ' + refuelParts.join(', ') + '</div>';
        fuelHtml += '<div style="color:#666; font-size:10px; margin-top:2px;">' + escapeHtml(inspectorT('doubleClickRefuel', null, 'Double-click the campfire to quick refuel.')) + '</div>';
        fuelHtml += '<button class="btn btn-secondary" style="margin-top:4px; font-size:10px; padding:2px 8px;" onclick="GameActions.refuel(\'' + uid + '\')" ' + (canRefuel ? '' : 'disabled') + '>' + escapeHtml(needsFuel ? inspectorT('refuel', null, 'Refuel') : inspectorT('fuelFull', null, 'Fuel Full')) + '</button>';
      }
      fuelHtml += '</div>';
    }

    var farmHtml = '';
    if (balance && balance.farming && window.GameActions && GameActions.getFarmPlotStatus) {
      var farmStatus = GameActions.getFarmPlotStatus(uid);
      if (farmStatus) {
        var progressColor = farmStatus.nightWorkBlocked ? '#f4a261' : (farmStatus.ready ? '#4ecca3' : (farmStatus.riverBoosted ? '#66d9ff' : (farmStatus.watered ? '#57c7ff' : '#f0a500')));
        var supportColor = farmStatus.hasWaterSupport ? (farmStatus.supportSourceType === 'river' ? '#66d9ff' : '#4ecca3') : '#888';
        var lightColor = farmStatus.nightWorkBlocked ? '#f4a261' : (farmStatus.isNight ? '#ffb74d' : '#888');
        var storedText = farmStatus.storedAmount > 0 ? farmStatus.storedSummaryText : inspectorT('storageEmpty', null, 'Storage empty');
        farmHtml = '<div class="inspector-section">' +
          '<div style="font-size:11px; color:#aaa; margin-bottom:4px;">🌱 ' + escapeHtml(inspectorT('crop', null, 'Crop')) + ': <span style="color:#e0e0e0; font-weight:bold;">' + escapeHtml(farmStatus.cropName) + '</span></div>' +
          '<div style="font-size:11px; margin-bottom:4px;">' + escapeHtml(inspectorT('status', null, 'Status')) + ': <span style="color:' + progressColor + '; font-weight:bold;">' + escapeHtml(farmStatus.statusText) + '</span></div>' +
          '<div style="height:6px; background:rgba(15,52,96,0.9); border-radius:4px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); margin-bottom:4px;">' +
            '<div style="width:' + farmStatus.progressPercent + '%; height:100%; background:' + progressColor + '; transition:width 0.2s;"></div>' +
          '</div>' +
          '<div style="font-size:10px; color:#9fb3c8; margin-bottom:2px;">' + escapeHtml(farmStatus.detailText) + '</div>' +
          '<div style="font-size:10px; color:#c7d6e8; margin-bottom:3px;">👷 ' + escapeHtml(inspectorT('resident', null, 'Resident')) + ': ' + escapeHtml(farmStatus.workerStatusText) + '</div>' +
          '<div style="font-size:10px; color:' + lightColor + '; margin-bottom:3px;">🔥 ' + escapeHtml(inspectorT('nightLight', null, 'Night light')) + ': ' + escapeHtml(farmStatus.nightLightLabel) + '</div>' +
          '<div style="font-size:10px; color:' + supportColor + '; margin-bottom:3px;">💧 ' + escapeHtml(farmStatus.supportSourceName) + '</div>' +
          '<div style="font-size:10px; color:#888; margin-bottom:3px;">' + escapeHtml(inspectorT('currentYield', null, 'Current yield')) + ': ' + escapeHtml(farmStatus.currentYieldText || farmStatus.dryYieldText) + '</div>' +
          '<div style="font-size:10px; color:#888; margin-bottom:3px;">' + escapeHtml(inspectorT('dry', null, 'Dry')) + ': ' + escapeHtml(farmStatus.dryYieldText) + ' • ' + escapeHtml(inspectorT('watered', null, 'Watered')) + ': ' + escapeHtml(farmStatus.wateredYieldText) + '</div>' +
          '<div style="font-size:10px; color:#888; margin-bottom:4px;">' + escapeHtml(inspectorT('riverBoost', null, 'River boost')) + ': ' + escapeHtml(farmStatus.riverYieldText) + '</div>' +
          '<div style="font-size:10px; color:#c7d6e8;">' + escapeHtml(inspectorT('stored', null, 'Stored')) + ': ' + escapeHtml(storedText) + '</div>' +
        '</div>';
      }
    }

    var synergyHtml = '';
    if (window.SynergySystem) {
      var synergyBonus = SynergySystem.getSynergyBonus(uid);
      if (synergyBonus.productionBonus > 0 || synergyBonus.speedBonus > 0) {
        var bonusParts = [];
        if (synergyBonus.productionBonus > 0) bonusParts.push('+' + Math.round(synergyBonus.productionBonus * 100) + '% prod');
        if (synergyBonus.speedBonus > 0) bonusParts.push('+' + Math.round(synergyBonus.speedBonus * 100) + '% speed');
        synergyHtml = '<div class="inspector-section">' +
          '<div style="color:#4ecca3; font-size:11px;">⚡ ' + bonusParts.join(', ') + '</div>' +
          '<div style="color:#666; font-size:9px;">' + escapeHtml(inspectorT('fromNearby', { count: synergyBonus.nearbyCount }, 'From {count} nearby')) + '</div>' +
          '</div>';
      }
    }

    var workerHtml = '';
    if (window.NPCSystem && balance && balance.workerCount) {
      var workers = NPCSystem.getNPCsForBuilding(uid);
      if (workers && workers.length > 0) {
        workerHtml = '<div class="inspector-section">' +
          '<div style="color:#aaa; font-size:11px;">👷 ' + escapeHtml(inspectorT('workers', { current: workers.length, target: balance.workerCount[currentLevel] || workers.length }, 'Workers: {current}/{target}')) + '</div>' +
          '</div>';
      }
    }

    var militaryHtml = '';
    if (window.GameActions && instance.entityId === 'building.barracks' && GameActions.getBarracksStatus) {
      var barracksStatus = GameActions.getBarracksStatus(uid);
      if (barracksStatus) {
        var queueHtml = '';
        if (barracksStatus.queue.length > 0) {
          queueHtml = barracksStatus.queue.map(function(entry, index) {
            return '<div style="font-size:10px; color:#d8d8d8; margin-top:3px;">' +
              (index + 1) + '. ' + escapeHtml(entry.label) + ' • ' + entry.remainingSeconds + 's • ' + entry.progressPercent + '%</div>';
          }).join('');
        } else {
          queueHtml = '<div style="font-size:10px; color:#777; margin-top:3px;">' + escapeHtml(inspectorT('queueEmpty', null, 'Queue empty')) + '</div>';
        }

        var reserveHtml = barracksStatus.reserves.length > 0
          ? barracksStatus.reserves.map(function(entry) {
              return escapeHtml(entry.label) + ': ' + entry.amount;
            }).join(' • ')
          : inspectorT('noTrainedReserves', null, 'No trained reserves');
        var towerSupportHtml = barracksStatus.availableUnits.filter(function(unit) {
          return !!unit.towerSupportLabel;
        }).map(function(unit) {
          return escapeHtml(unit.label) + ': ' + escapeHtml(unit.towerSupportLabel);
        }).join(' • ');
        var modeButtons = [
          '<button class="btn ' + (barracksStatus.commandMode === 'guard' ? 'btn-craft' : 'btn-secondary') + '" style="font-size:10px; padding:4px 8px;" onclick="GameActions.setBarracksCommandMode(\'' + uid + '\', \'guard\')">' + escapeHtml(inspectorT('holdPosition', null, 'Hold Position')) + '</button>',
          '<button class="btn ' + (barracksStatus.commandMode === 'follow' ? 'btn-craft' : 'btn-secondary') + '" style="font-size:10px; padding:4px 8px;" onclick="GameActions.setBarracksCommandMode(\'' + uid + '\', \'follow\')">' + escapeHtml(inspectorT('followPlayer', null, 'Follow Player')) + '</button>',
          '<button class="btn ' + (barracksStatus.commandMode === 'attack' ? 'btn-craft' : 'btn-secondary') + '" style="font-size:10px; padding:4px 8px;" onclick="GameActions.setBarracksCommandMode(\'' + uid + '\', \'attack\')">' + escapeHtml(inspectorT('attackTarget', null, 'Attack Target')) + '</button>'
        ].join(' ');

        var trainButtons = barracksStatus.availableUnits.map(function(unit) {
          var disabled = !unit.unlocked || !unit.canAfford || !barracksStatus.canQueueMore;
          var label = unit.unlocked ? unit.label : (unit.label + ' Lv.' + unit.unlockLevel);
          var hint = unit.costText ? (' • ' + escapeHtml(unit.costText)) : '';
          return '<button class="btn ' + (disabled ? 'btn-secondary' : 'btn-craft') + '" style="font-size:10px; padding:4px 8px;" onclick="GameActions.queueBarracksTraining(\'' + uid + '\', \'' + unit.unitType + '\')" ' + (disabled ? 'disabled' : '') + '>' + escapeHtml(label) + hint + '</button>';
        }).join(' ');

        militaryHtml = '<div class="inspector-section">' +
          '<div style="color:#cfa66b; font-size:11px; margin-bottom:4px;">🛡️ ' + escapeHtml(inspectorT('reserveSummary', { current: barracksStatus.reserveCount, capacity: barracksStatus.reserveCapacity, used: barracksStatus.queueUsed, queue: barracksStatus.queueCapacity }, 'Reserve {current}/{capacity} • Queue {used}/{queue}')) + '</div>' +
          '<div style="color:#888; font-size:10px; margin-bottom:4px;">' + escapeHtml(inspectorT('commandRadius', { range: barracksStatus.supportRange, speed: barracksStatus.trainingSpeed.toFixed(2) }, 'Command radius: {range} • Training speed x{speed}')) + '</div>' +
          (barracksStatus.upgradeSummaryText ? ('<div style="color:#9fc7a7; font-size:10px; margin-bottom:4px;">' + escapeHtml(inspectorT('activeUpgrades', { text: barracksStatus.upgradeSummaryText }, 'Active upgrades: {text}')) + '</div>') : '') +
          '<div style="color:#d9c89f; font-size:10px; margin-bottom:4px;">' + escapeHtml(inspectorT('mode', { mode: barracksStatus.commandModeLabel }, 'Mode: {mode}')) + '</div>' +
          '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px;">' + modeButtons + '</div>' +
          (barracksStatus.commandMode === 'attack' ? ('<div style="color:#e7c98b; font-size:10px; margin-bottom:4px;">' + escapeHtml(inspectorT('attackTargetSummary', { name: barracksStatus.attackTargetLabel || inspectorT('clickToChooseTarget', null, 'Click an animal to choose the target') }, 'Attack target: {name}')) + '</div>' +
            (barracksStatus.attackTargetLabel ? ('<button class="btn btn-secondary" style="font-size:10px; padding:4px 8px; margin-bottom:4px;" onclick="GameActions.clearBarracksAttackTarget(\'' + uid + '\')">' + escapeHtml(inspectorT('clearAttackTarget', null, 'Clear target')) + '</button>') : '')) : '') +
          '<div style="color:#7fc8d8; font-size:10px; margin-bottom:4px;">' + escapeHtml(inspectorT('deployed', { deployed: barracksStatus.deployedCount, engaged: barracksStatus.engagedCount }, 'Deployed: {deployed} • Engaged: {engaged}')) + '</div>' +
          '<div style="color:#9aa; font-size:10px; margin-bottom:4px;">' + escapeHtml(barracksStatus.troopStatusText) + '</div>' +
          '<div style="color:#b9c8d8; font-size:10px; margin-bottom:4px;">' + escapeHtml(barracksStatus.troopSummaryText) + '</div>' +
          '<div style="color:#8e9db0; font-size:10px; margin-bottom:4px;">' + escapeHtml(inspectorT('reserves', { text: reserveHtml }, 'Reserves: {text}')) + '</div>' +
          (towerSupportHtml ? ('<div style="color:#9aa; font-size:10px; margin-bottom:4px;">' + escapeHtml(inspectorT('towerSupport', null, 'Tower support')) + ': ' + escapeHtml(towerSupportHtml) + (barracksStatus.commandMode === 'follow' ? (' ' + escapeHtml(inspectorT('towerSupportPaused', null, '(paused while following)'))) : '') + '</div>') : '') +
          '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px;">' + trainButtons + '</div>' +
          '<div style="color:#9aa; font-size:10px;">' + escapeHtml(inspectorT('trainingQueue', null, 'Training queue')) + '</div>' +
          queueHtml +
          (barracksStatus.nextUnlock ? ('<div style="color:#777; font-size:10px; margin-top:4px;">' + escapeHtml(inspectorT('nextUnlock', { label: barracksStatus.nextUnlock.label, level: barracksStatus.nextUnlock.level }, 'Next unlock: {label} at Lv.{level}')) + '</div>') : '') +
          '</div>';
      }
    } else if (window.GameActions && instance.entityId === 'building.watchtower' && GameActions.getWatchtowerStatus) {
      var watchtowerStatus = GameActions.getWatchtowerStatus(uid);
      if (watchtowerStatus) {
        var supportBonusParts = [];
        if (watchtowerStatus.rangeBonus > 0) supportBonusParts.push(inspectorT('rangeBonus', { count: watchtowerStatus.rangeBonus.toFixed(1) }, '+{count} range'));
        if (watchtowerStatus.attackDamageBonus > 0) supportBonusParts.push(inspectorT('damageBonus', { count: watchtowerStatus.attackDamageBonus }, '+{count} damage'));
        if (watchtowerStatus.attackIntervalMultiplier < 0.999) supportBonusParts.push(inspectorT('fasterBonus', { percent: Math.round((1 - watchtowerStatus.attackIntervalMultiplier) * 100) }, '{percent}% faster'));
        if (watchtowerStatus.workerProtectRadiusBonus > 0) supportBonusParts.push(inspectorT('workerCoverBonus', { count: watchtowerStatus.workerProtectRadiusBonus.toFixed(1) }, '+{count} worker cover'));
        var supportSummary = watchtowerStatus.linkedBarracksCount > 0
          ? watchtowerStatus.reserveSupportLabel + ' • ' + inspectorT('linkedBarracksCount', { count: watchtowerStatus.linkedBarracksCount }, '{count} barracks')
          : inspectorT('noBarracksReserveLink', null, 'No barracks reserve link');
        militaryHtml = '<div class="inspector-section">' +
          '<div style="color:#e89b6b; font-size:11px; margin-bottom:4px;">🗼 ' + escapeHtml(watchtowerStatus.statusLabel) + '</div>' +
          '<div style="color:#aaa; font-size:10px; margin-bottom:3px;">' + escapeHtml(inspectorT('damageLine', { damage: watchtowerStatus.attackDamage, interval: watchtowerStatus.attackIntervalSeconds.toFixed(1), cooldown: watchtowerStatus.cooldownRemaining.toFixed(1) }, 'Damage: {damage} • Interval: {interval}s • Cooldown: {cooldown}s')) + '</div>' +
          '<div style="color:#888; font-size:10px; margin-bottom:3px;">' + escapeHtml(inspectorT('workerCoverLine', { cover: watchtowerStatus.workerProtectRadius, shots: watchtowerStatus.shotsFired, kills: watchtowerStatus.kills }, 'Worker cover: {cover} • Shots: {shots} • Kills: {kills}')) + '</div>' +
          '<div style="color:' + (watchtowerStatus.linkedBarracksCount > 0 ? '#cfa66b' : '#777') + '; font-size:10px; margin-bottom:3px;">' + escapeHtml(inspectorT('reserveLink', { text: supportSummary }, 'Reserve link: {text}')) + '</div>' +
          (supportBonusParts.length ? ('<div style="color:#9aa; font-size:10px; margin-bottom:3px;">' + escapeHtml(inspectorT('supportBonus', { text: supportBonusParts.join(' • ') }, 'Support bonus: {text}')) + '</div>') : '') +
          (watchtowerStatus.lastTargetName ? ('<div style="color:#9aa; font-size:10px;">' + escapeHtml(inspectorT('lastTarget', { name: watchtowerStatus.lastTargetName }, 'Last target: {name}')) + '</div>') : '') +
          '</div>';
      }
    }

    var rangeHtml = '';
    if (balance) {
      var searchRange = (balance.searchRadius && balance.searchRadius[currentLevel]) ? balance.searchRadius[currentLevel] : 0;
      var transferRange = balance.transferRange || 0;
      var waterRange = balance.waterRadius || 0;
      var lightRange = balance.lightRadius || 0;
      var defenseRange = (balance.guardRadius && balance.guardRadius[currentLevel]) ? balance.guardRadius[currentLevel] : 0;
      if (!defenseRange && balance.towerDefense && balance.towerDefense.range) {
        defenseRange = balance.towerDefense.range[currentLevel] || balance.towerDefense.range[1] || 0;
      }
      var rangeParts = [];
      if (searchRange > 0) rangeParts.push('<span style="color:#00ff88;">' + escapeHtml((balance.farming ? t('hud.nodes.workerRange', null, 'Worker') : t('hud.nodes.harvestRange', null, 'Harvest')) + ': ' + searchRange) + '</span>');
      if (transferRange > 0) rangeParts.push('<span style="color:#4488ff;">' + escapeHtml(t('hud.nodes.transferRange', null, 'Transfer') + ': ' + transferRange) + '</span>');
      if (waterRange > 0) rangeParts.push('<span style="color:#57c7ff;">' + escapeHtml(t('hud.nodes.waterRange', null, 'Water') + ': ' + waterRange) + '</span>');
      if (lightRange > 0) rangeParts.push('<span style="color:#ffb74d;">' + escapeHtml(t('hud.nodes.lightRange', null, 'Light') + ': ' + lightRange) + '</span>');
      if (defenseRange > 0) rangeParts.push('<span style="color:#e76f51;">' + escapeHtml(t('hud.nodes.defenseRange', null, 'Defense') + ': ' + defenseRange) + '</span>');
      if (rangeParts.length > 0) {
        rangeHtml = '<div class="inspector-section">' +
          '<div style="color:#aaa; font-size:11px;">📡 ' + rangeParts.join(' | ') + '</div>' +
          '</div>';
      }
    }

    var refundText = '';
    if (balance && balance.cost) {
      var totalRefund = {};
      for (var costResId in balance.cost) {
        totalRefund[costResId] = Math.floor(balance.cost[costResId] * 0.5);
      }
      if (balance.upgrades && currentLevel > 1) {
        for (var level = 2; level <= currentLevel; level++) {
          var levelUpgrade = balance.upgrades[level];
          if (levelUpgrade && levelUpgrade.cost) {
            for (var levelResId in levelUpgrade.cost) {
              totalRefund[levelResId] = (totalRefund[levelResId] || 0) + Math.floor(levelUpgrade.cost[levelResId] * 0.5);
            }
          }
        }
      }
      var refundParts = [];
      for (var refundResId in totalRefund) {
        if (totalRefund[refundResId] > 0) {
          var refundEntity = GameRegistry.getEntity(refundResId);
          refundParts.push(totalRefund[refundResId] + ' ' + (refundEntity ? refundEntity.name : refundResId));
        }
      }
      if (refundParts.length > 0) {
        refundText = inspectorT('refundHalf', { text: refundParts.join(', ') }, 'Refund 50%: {text}');
      }
    }

    var inspectorHtml =
      '<div style="padding:10px 12px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
        '<div style="font-weight:bold; font-size:14px; color:#e0e0e0;">' + escapeHtml(entity.name) + '</div>' +
        '<span style="color:#4ecca3; font-size:11px; background:rgba(78,204,163,0.15); padding:2px 8px; border-radius:4px;">' + levelText + '</span>' +
      '</div>' +
      '<div style="color:#888; font-size:11px; margin-bottom:6px;">' + escapeHtml(entity.description || '') + '</div>' +
      storageHtml +
      farmHtml +
      synergyHtml +
      workerHtml +
      militaryHtml +
      rangeHtml +
      fuelHtml +
      upgradeHtml +
      (refundText ? '<div style="color:#ffb74d; font-size:10px; margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.06);">' + refundText + '</div>' : '') +
      '<div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); display:flex; gap:6px;">' +
        '<button class="btn btn-danger" style="font-size:11px; padding:4px 12px;" onclick="GameHUD.confirmDestroy(\'' + uid + '\')">' + escapeHtml(inspectorT('delete', null, 'Delete')) + '</button>' +
        '<button class="btn btn-secondary" style="font-size:11px; padding:4px 12px;" onclick="GameHUD.closeInspector()">' + escapeHtml(inspectorT('close', null, 'Close')) + '</button>' +
      '</div>' +
      '</div>';

    setInnerHtmlIfChanged(inspector, inspectorHtml);
    inspector.classList.add('active');
  }

  function confirmDestroy(uid) {
    if (!confirm(t('hud.inspector.deleteConfirm', null, 'Delete this structure?\nYou will receive a 50% refund.'))) {
      return;
    }
    if (window.RangeIndicator && RangeIndicator.getActiveUid() === uid) {
      RangeIndicator.hide();
    }
    BuildingSystem.destroyBuilding(uid);
    closeInspector();
    showNotification(t('hud.player.structureRemoved', null, 'Structure removed.'));
  }

  function closeInspector() {
    setSelectedInstance(null);
    var inspector = document.getElementById('building-inspector');
    if (inspector) inspector.classList.remove('active');
    if (window.RangeIndicator) RangeIndicator.hide();
  }

  return {
    setHoveredInstance: setHoveredInstance,
    selectInstance: selectInstance,
    showBuildingInspector: showBuildingInspector,
    confirmDestroy: confirmDestroy,
    closeInspector: closeInspector,
    getSelectedInstance: getSelectedInstance
  };
};