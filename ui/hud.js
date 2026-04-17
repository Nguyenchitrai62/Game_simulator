console.log('[HUD] Loading hud.js...');

try {
  window.GameHUD = (function () {
    console.log('[HUD] IIFE started');
    var _activeTab = null;
    var _notificationTimer = null;
    var _damageNumbers = [];
    var _quickbarMode = 'build';
    var _quickbarItems = [];
    var _quickbarSelected = { build: null, craft: null };
  
  function init() {
    // Initialize HUD - placeholder for future initialization
    console.log('[GameHUD] Initialized');
    renderQuickbar();
  }

  function renderAll() {
    renderResources();
    renderPlayerStats();
    renderHungerBar();
    renderDayNightClock();
    renderObjectiveTracker();
    renderActivePanel();
    renderQuickbar();

    if (_selectedInstance && GameState.getInstance && GameState.getInstance(_selectedInstance)) {
      showBuildingInspector(_selectedInstance);
    }
  }

  var _showProductionPanel = true;
  
  function toggleProductionPanel() {
    _showProductionPanel = !_showProductionPanel;
    renderResources();
  }

  function getResourceIcon(resourceId) {
    var icons = {
      'resource.wood': '🪵',
      'resource.stone': '🪨',
      'resource.food': '🍖',
      'resource.flint': '✨',
      'resource.tool': '🔧',
      'resource.leather': '🧥',
      'resource.copper': '🟠',
      'resource.tin': '⚪',
      'resource.bronze': '🛡️',
      'resource.iron': '⚔️',
      'resource.coal': '⬛'
    };
    return icons[resourceId] || '💎';
  }

  function renderResources() {
    var container = document.getElementById("resource-bar");
    if (!container) return;

    var resources = GameRegistry.getEntitiesByType("resource");
    var stats = TickSystem.getResourceStats();
    var html = "";
    
    html += '<div style="display:flex;align-items:center;gap:8px;">';
    html += '<div style="display:flex;gap:12px;">';

    resources.forEach(function (res) {
      if (!GameState.isUnlocked(res.id)) return;
      var amount = GameState.getSpendableResource(res.id);
      var net = stats.net ? stats.net[res.id] : 0;
      
      html += '<div class="resource-item" style="min-width:110px;">';
      html += '<span class="resource-icon">' + getResourceIcon(res.id) + '</span>';
      html += '<span class="resource-amount">' + Math.floor(amount) + '</span>';
      html += ' <span class="resource-name">' + escapeHtml(res.name) + '</span>';
      
      if (_showProductionPanel) {
        var netStr = "", netColor = "#888";
        if (net > 0.001) {
          netStr = "+" + net.toFixed(1) + "/s";
          netColor = "#4ecca3";
        } else if (net < -0.001) {
          netStr = net.toFixed(1) + "/s";
          netColor = "#e94560";
          if (stats.timeLeft && stats.timeLeft[res.id] && stats.timeLeft[res.id] < 60) {
            netStr += " [" + stats.timeLeft[res.id] + "s]";
          }
        } else {
          netStr = "~0";
          netColor = "#888";
        }
        
        html += '<span style="color:' + netColor + ';font-size:11px;margin-left:4px;">' + netStr + '</span>';
      }
      
      html += '</div>';
    });
    
    html += '</div>';
    html += '<button class="btn btn-small" onclick="GameHUD.toggleProductionPanel()" style="padding:2px 6px;font-size:11px;">' + (_showProductionPanel ? "Hide rates" : "Show rates") + '</button>';
    html += '</div>';

    container.innerHTML = html;
  }

  function renderPlayerStats() {
    var player = GameState.getPlayer();
    var hp = player.hp;
    var maxHp = GameState.getPlayerMaxHp();
    var atk = GameState.getPlayerAttack();
    var def = GameState.getPlayerDefense();
    var hunger = GameState.getHunger ? GameState.getHunger() : 100;
    var speed = GameState.getPlayerSpeed ? GameState.getPlayerSpeed() : 3;
    var isEatingNow = typeof GamePlayer !== 'undefined' && GamePlayer.isEating && GamePlayer.isEating();
    var hungerBalance = (window.GAME_BALANCE && GAME_BALANCE.hunger) || {};
    var isSlowed = false;

    if (hunger < 20) {
      speed *= (hungerBalance.hungrySpeedMult || 0.5);
      isSlowed = true;
    }

    if (isEatingNow) {
      speed *= (hungerBalance.eatSpeedMult || 0.5);
      isSlowed = true;
    }

    var atkEl = document.getElementById("stat-atk");
    var defEl = document.getElementById("stat-def");
    var speedEl = document.getElementById("stat-spd");
    var panelEl = document.getElementById("player-basic-panel");

    if (atkEl) atkEl.textContent = String(atk);
    if (defEl) defEl.textContent = String(def);
    if (speedEl) speedEl.textContent = speed % 1 === 0 ? String(speed) : speed.toFixed(1);
    if (panelEl) panelEl.classList.toggle('slow', isSlowed);
    if (speedEl) speedEl.classList.toggle('slowed', isSlowed);

    var hpFill = document.getElementById("player-hp-fill");
    var hpText = document.getElementById("player-hp-text");
    var hpWrapper = document.getElementById("player-hp-wrapper");

    if (hpFill && hpText) {
      var pct = Math.max(0, (hp / maxHp) * 100);
      hpFill.style.width = pct + "%";
      hpText.textContent = Math.floor(hp) + " / " + maxHp;

      hpFill.classList.remove("hp-warn", "hp-danger");
      if (pct <= 30) {
        hpFill.classList.add("hp-danger");
      } else if (pct <= 60) {
        hpFill.classList.add("hp-warn");
      }

      if (hpWrapper) {
        if (pct <= 30) {
          hpWrapper.classList.add("low-hp");
        } else {
          hpWrapper.classList.remove("low-hp");
        }
      }
    }
  }

  function renderHungerBar() {
    var hunger = GameState.getHunger();
    var maxHunger = GameState.getMaxHunger();
    var hungerFill = document.getElementById("hunger-fill");
    var hungerText = document.getElementById("hunger-text");
    var hungerWrapper = document.getElementById("hunger-wrapper");

    if (!hungerFill || !hungerText) return;

    var pct = Math.max(0, (hunger / maxHunger) * 100);
    hungerFill.style.width = pct + "%";

    var foodCount = GameState.getResource("resource.food");
    var isEatingNow = typeof GamePlayer !== 'undefined' && GamePlayer.isEating && GamePlayer.isEating();

    var text = Math.floor(hunger) + "/" + maxHunger + " Food:" + Math.floor(foodCount);
    if (isEatingNow) {
      text = "Eating... " + Math.floor(hunger) + "/" + maxHunger;
    }
    hungerText.textContent = text;

    hungerFill.classList.remove("hunger-warn", "hunger-critical");
    if (hunger <= 0) {
      hungerFill.classList.add("hunger-critical");
    } else if (hunger < 20) {
      hungerFill.classList.add("hunger-warn");
    }

    if (hungerWrapper) {
      if (hunger < 20) {
        hungerWrapper.classList.add("low-hunger");
      } else {
        hungerWrapper.classList.remove("low-hunger");
      }
    }
  }

  function renderDayNightClock() {
    var clockEl = document.getElementById("clock-time");
    if (!clockEl) return;
    if (typeof DayNightSystem === 'undefined') return;
    clockEl.textContent = DayNightSystem.getTimeString();
  }

  function getModalTabMeta(tabName) {
    var metaMap = {
      resources: {
        kicker: 'Economy',
        title: 'Stockpile',
        subtitle: 'Track reserves, monitor income, and spot shortages before they hurt momentum.'
      },
      build: {
        kicker: 'Settlement',
        title: 'Construction',
        subtitle: 'Expand your production network and place the next building with intention.'
      },
      craft: {
        kicker: 'Workshop',
        title: 'Crafting',
        subtitle: 'Turn gathered materials into tools, gear, and milestone unlocks.'
      },
      stats: {
        kicker: 'Progression',
        title: 'Journal',
        subtitle: 'Review your survivor, settlement growth, and the next age objective in one place.'
      },
      research: {
        kicker: 'Knowledge',
        title: 'Research',
        subtitle: 'Spend resources on permanent bonuses and long-term efficiency.'
      }
    };

    return metaMap[tabName] || metaMap.resources;
  }

  function renderModalHeader() {
    var meta = getModalTabMeta(_modalTab);
    var kickerEl = document.getElementById('modal-kicker');
    var titleEl = document.getElementById('modal-title');
    var subtitleEl = document.getElementById('modal-subtitle');

    if (kickerEl) kickerEl.textContent = meta.kicker;
    if (titleEl) titleEl.textContent = meta.title;
    if (subtitleEl) subtitleEl.textContent = meta.subtitle;
  }

  function getNextAgeObjective() {
    var currentAge = GameState.getAge();
    var ages = GameRegistry.getEntitiesByType("age");

    for (var i = 0; i < ages.length; i++) {
      if (GameState.isUnlocked(ages[i].id) || ages[i].id === currentAge) continue;

      var ageBalance = GameRegistry.getBalance(ages[i].id);
      if (!ageBalance || !ageBalance.advanceFrom || ageBalance.advanceFrom.age !== currentAge) continue;

      return {
        entity: ages[i],
        balance: ageBalance
      };
    }

    return null;
  }

  function renderObjectiveTracker() {
    var tracker = document.getElementById("objective-tracker");
    if (!tracker) return;
    var currentAgeEntity = GameRegistry.getEntity(GameState.getAge());
    var currentAgeLabel = currentAgeEntity ? currentAgeEntity.name : GameState.getAge();

    var nextAge = getNextAgeObjective();
    if (!nextAge) {
      tracker.className = 'objective-tracker ready';
      tracker.innerHTML = '<div class="objective-meta"><span class="objective-label">Current Age</span><span class="objective-age">' + escapeHtml(currentAgeLabel) + '</span></div>' +
        '<div class="objective-title">All Ages Unlocked</div>' +
        '<div class="objective-detail">Current progression content is fully cleared.</div>';
      return;
    }

    var balance = nextAge.balance;
    var checklist = [];
    var canAdvance = true;

    if (balance.advanceFrom.resources) {
      for (var resId in balance.advanceFrom.resources) {
        var resourceCurrent = GameState.getSpendableResource(resId);
        var resourceNeeded = balance.advanceFrom.resources[resId];
        var resourceEntity = GameRegistry.getEntity(resId);
        var resourceMet = resourceCurrent >= resourceNeeded;
        if (!resourceMet) canAdvance = false;
        checklist.push({
          met: resourceMet,
          label: (resourceEntity ? resourceEntity.name : resId),
          progress: Math.floor(resourceCurrent) + '/' + resourceNeeded
        });
      }
    }

    if (balance.advanceFrom.buildings) {
      for (var buildingId in balance.advanceFrom.buildings) {
        var buildingCurrent = GameState.getBuildingCount(buildingId);
        var buildingNeeded = balance.advanceFrom.buildings[buildingId];
        var buildingEntity = GameRegistry.getEntity(buildingId);
        var buildingMet = buildingCurrent >= buildingNeeded;
        if (!buildingMet) canAdvance = false;
        checklist.push({
          met: buildingMet,
          label: (buildingEntity ? buildingEntity.name : buildingId),
          progress: buildingCurrent + '/' + buildingNeeded
        });
      }
    }

    var checklistHtml = '<div class="objective-checklist">';
    for (var i = 0; i < checklist.length; i++) {
      checklistHtml += '<div class="objective-check' + (checklist[i].met ? ' met' : '') + '">' +
        '<span class="objective-check-icon">' + (checklist[i].met ? '&#10003;' : '&#9711;') + '</span>' +
        '<span class="objective-check-copy"><span class="objective-check-label">' + escapeHtml(checklist[i].label) + '</span><span class="objective-check-progress">' + escapeHtml(checklist[i].progress) + '</span></span>' +
        '</div>';
    }
    checklistHtml += '</div>';

    tracker.className = 'objective-tracker' + (canAdvance ? ' ready' : '');
    tracker.innerHTML = '<div class="objective-meta"><span class="objective-label">Current Age</span><span class="objective-age">' + escapeHtml(currentAgeLabel) + '</span></div>' +
      '<div class="objective-title">' + escapeHtml(nextAge.entity.name) + (canAdvance ? ' Ready!' : '') + '</div>' +
      checklistHtml +
      '<div class="objective-actions"><button class="objective-advance-btn' + (canAdvance ? ' ready' : '') + '" onclick="GameActions.advanceAge(\'' + nextAge.entity.id + '\')"' + (canAdvance ? '' : ' disabled') + '>Advance Age</button></div>';
  }

  function getQuickbarBuildItems() {
    return GameRegistry.getEntitiesByType('building')
      .filter(function(building) {
        return GameState.isUnlocked(building.id) && !building.hiddenInBuildMenu;
      })
      .map(function(building, index) {
        var balance = GameRegistry.getBalance(building.id) || {};
        var canBuild = true;
        var placedCount = GameState.getBuildingCount(building.id);
        var cost = balance.cost || {};

        for (var resId in cost) {
          if (!GameState.hasSpendableResource(resId, cost[resId])) {
            canBuild = false;
            break;
          }
        }

        return {
          id: building.id,
          actionType: 'build',
          icon: getEntityIcon(building),
          name: building.name,
          meta: placedCount > 0 ? ('x' + placedCount) : 'new',
          status: canBuild ? 'Ready' : 'Need',
          ready: canBuild,
          sortOrder: canBuild ? 0 : 1,
          sourceIndex: index
        };
      })
      .sort(function(a, b) {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.sourceIndex - b.sourceIndex;
      })
      .slice(0, 9);
  }

  function getQuickbarCraftItems() {
    return CraftSystem.getAllRecipes()
      .filter(function(recipe) {
        return GameState.isUnlocked(recipe.id);
      })
      .map(function(recipe, index) {
        var info = CraftSystem.getRecipeInfo(recipe.id);
        var balance = info.balance || {};
        var outputIds = balance.output ? Object.keys(balance.output) : [];
        var primaryOutputId = outputIds.length ? outputIds[0] : null;
        var primaryOutputEntity = primaryOutputId ? GameRegistry.getEntity(primaryOutputId) : null;
        var actionType = 'craft';
        var actionId = recipe.id;
        var ready = info.canCraft;
        var status = ready ? 'Craft' : 'Need';
        var sortOrder = ready ? 0 : 2;
        var meta = primaryOutputId && balance.output ? ('x' + balance.output[primaryOutputId]) : 'recipe';

        if (primaryOutputEntity && primaryOutputEntity.type === 'equipment') {
          var inventoryCount = GameState.getInventoryCount(primaryOutputId);
          var player = GameState.getPlayer();
          var slot = primaryOutputEntity.slot || '';
          meta = slot ? slot : 'gear';

          if (player && player.equipped && player.equipped[slot] === primaryOutputId && inventoryCount <= 0) {
            return null;
          } else if (inventoryCount > 0) {
            actionType = 'equip';
            actionId = primaryOutputId;
            ready = true;
            status = 'Use';
            sortOrder = 0;
          }
        }

        return {
          id: recipe.id,
          actionType: actionType,
          actionId: actionId,
          icon: getEntityIcon(primaryOutputEntity || recipe),
          name: recipe.name,
          meta: meta,
          status: status,
          ready: ready,
          sortOrder: sortOrder,
          sourceIndex: index
        };
      })
      .filter(function(item) {
        return !!item;
      })
      .sort(function(a, b) {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.sourceIndex - b.sourceIndex;
      })
      .slice(0, 9);
  }

  function renderQuickbar() {
    var toggleButton = document.getElementById('quickbar-toggle');
    var slots = document.getElementById('quickbar-slots');
    if (!toggleButton || !slots) return;

    _quickbarItems = _quickbarMode === 'craft' ? getQuickbarCraftItems() : getQuickbarBuildItems();

    toggleButton.className = 'quickbar-toggle ' + (_quickbarMode === 'craft' ? 'craft' : 'build');
    toggleButton.innerHTML = '<span class="quickbar-toggle-label">' + (_quickbarMode === 'craft' ? 'Craft' : 'Build') + '</span>' +
      '<span class="quickbar-toggle-hint">Tab</span>';

    var selectedId = _quickbarSelected[_quickbarMode];
    var html = '';

    for (var i = 0; i < 9; i++) {
      var item = _quickbarItems[i];
      if (!item) {
        html += '<button class="quickbar-slot empty" type="button" disabled>' +
          '<span class="quickbar-slot-key">' + (i + 1) + '</span>' +
          '<span class="quickbar-slot-icon">·</span>' +
          '<span class="quickbar-slot-name">Empty</span>' +
          '<span class="quickbar-slot-meta"><span>-</span><span class="quickbar-slot-status">None</span></span>' +
          '</button>';
        continue;
      }

      var slotClass = 'quickbar-slot ' + (item.ready ? 'ready' : 'blocked');
      if (selectedId === item.id) {
        slotClass += ' selected';
      }

      html += '<button class="' + slotClass + '" type="button" onclick="GameHUD.activateQuickbarSlot(' + i + ')" title="' + escapeHtml(item.name) + '">' +
        '<span class="quickbar-slot-key">' + (i + 1) + '</span>' +
        '<span class="quickbar-slot-icon">' + item.icon + '</span>' +
        '<span class="quickbar-slot-name">' + escapeHtml(item.name) + '</span>' +
        '<span class="quickbar-slot-meta"><span>' + escapeHtml(String(item.meta)) + '</span><span class="quickbar-slot-status">' + escapeHtml(item.status) + '</span></span>' +
        '</button>';
    }

    slots.innerHTML = html;
  }

  function toggleQuickbarMode(nextMode, silent) {
    var resolvedMode = nextMode;
    if (resolvedMode !== 'build' && resolvedMode !== 'craft') {
      resolvedMode = _quickbarMode === 'build' ? 'craft' : 'build';
    }

    if (_quickbarMode === resolvedMode) {
      renderQuickbar();
      return;
    }

    _quickbarMode = resolvedMode;

    if (resolvedMode !== 'build' && window.BuildingSystem && BuildingSystem.isBuildMode && BuildingSystem.isBuildMode()) {
      BuildingSystem.cancelBuild();
    }

    renderQuickbar();

    if (!silent) {
      showNotification('Quickbar: ' + (_quickbarMode === 'craft' ? 'Craft' : 'Build') + ' mode', 'info');
    }
  }

  function activateQuickbarSlot(index) {
    var item = _quickbarItems[index];
    if (!item) return;

    _quickbarSelected[_quickbarMode] = item.id;
    renderQuickbar();

    if (item.actionType === 'build') {
      if (_modalActive) closeModal();
      BuildingSystem.enterBuildMode(item.id);
      return;
    }

    if (window.BuildingSystem && BuildingSystem.isBuildMode && BuildingSystem.isBuildMode()) {
      BuildingSystem.cancelBuild();
    }

    if (item.actionType === 'craft') {
      GameActions.craft(item.actionId);
      return;
    }

    if (item.actionType === 'equip') {
      GameActions.equip(item.actionId);
      return;
    }

    showNotification(item.status === 'Using' ? 'This item is already equipped.' : 'This slot is not ready yet.', 'info');
  }

  function getQuickbarKeyIndex(event) {
    if (!event) return null;

    if (event.code && event.code.indexOf('Digit') === 0) {
      var fromCode = Number(event.code.replace('Digit', ''));
      if (fromCode >= 1 && fromCode <= 9) return fromCode - 1;
    }

    if (/^[1-9]$/.test(event.key)) {
      return Number(event.key) - 1;
    }

    return null;
  }

  function switchTab(tabName) {
    if (_activeTab === tabName) {
      closePanels();
      return;
    }

    // Close other panels first (but don't reset _activeTab yet)
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
    document.querySelectorAll(".tab-btn").forEach(function (t) { t.classList.remove("active"); });

    _activeTab = tabName;

    var panel = document.getElementById("panel-" + tabName);
    if (panel) panel.classList.add("active");

    var tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(function (tab) {
      if (tab.getAttribute("data-tab") === tabName) tab.classList.add("active");
    });

    renderActivePanel();
  }

  function closePanels() {
    _activeTab = null;
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
    document.querySelectorAll(".tab-btn").forEach(function (t) { t.classList.remove("active"); });
    var noneBtn = document.querySelector('.tab-btn[data-tab="none"]');
    if (noneBtn) noneBtn.classList.add("active");
  }

  function renderActivePanel() {
    if (!_activeTab) return;

    switch (_activeTab) {
      case "build": renderBuildPanel(); break;
      case "craft": renderCraftPanel(); break;
      case "inventory": renderInventoryPanel(); break;
      case "stats": renderStatsPanel(); break;
    }
  }

  function buildUnlockConditionsHtml(entity) {
    var progress = UnlockSystem.getUnlockProgress(entity);
    var html = '<div style="margin-top:6px; font-size:11px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:4px;">';
    html += '<div style="color:#f0a500; font-weight:bold; margin-bottom:3px;">&#128274; Unlock requires:</div>';

    progress.details.forEach(function (d) {
      var icon = d.met ? '&#9989;' : '&#11036;';
      var color = d.met ? '#4ecca3' : '#aaa';
      var text = '';

      if (d.type === 'age') {
        var ageEntity = GameRegistry.getEntity(d.target);
        text = 'Reach ' + (ageEntity ? ageEntity.name : d.target);
      } else if (d.type === 'resource') {
        var resEntity = GameRegistry.getEntity(d.id);
        text = (resEntity ? resEntity.name : d.id) + ': ' + Math.floor(d.current) + '/' + d.target;
      } else if (d.type === 'building') {
        var buildingEntity = GameRegistry.getEntity(d.id);
        text = (buildingEntity ? buildingEntity.name : d.id) + ': ' + d.current + '/' + d.target;
      }

      html += '<div style="color:' + color + ';">' + icon + ' ' + text + '</div>';
    });

    html += '</div>';
    return html;
  }

  function renderBuildPanel() {
    var panel = document.getElementById("panel-build");
    if (!panel) return;

    var buildings = GameRegistry.getEntitiesByType("building").filter(function(building) {
      return !building.hiddenInBuildMenu;
    });
    var html = "";

    buildings.forEach(function (building) {
      var isUnlocked = GameState.isUnlocked(building.id);

      if (!isUnlocked) {
        // Locked card with inline conditions
        html += '<div class="card" style="opacity: 0.5; position:relative;">';
        html += '<span style="position:absolute; top:8px; right:12px; font-size:18px;">&#128274;</span>';
        html += '<div><div class="card-name">' + escapeHtml(building.name) + '</div>';
        html += '<div class="card-info">' + escapeHtml(building.description || '') + '</div>';
        html += buildUnlockConditionsHtml(building);
        html += '</div>';
        html += '<button class="btn btn-primary" disabled style="opacity: 0.5; cursor: not-allowed;">&#128274; Locked</button>';
        html += '</div>';
        return;
      }

      var balance = GameRegistry.getBalance(building.id);
      var count = GameState.getBuildingCount(building.id);
      var canBuy = true;

      html += '<div class="card" style="position:relative;">';
      html += '<div><div class="card-name">' + escapeHtml(building.name) + (count > 0 ? ' (x' + count + ')' : '') + '</div>';
      html += '<div class="card-info">' + escapeHtml(building.description || '') + '</div>';

      if (balance && balance.cost) {
        html += '<div class="card-cost">Cost: ';
        var parts = [];
        canBuy = true;
        for (var resId in balance.cost) {
          var resEntity = GameRegistry.getEntity(resId);
          var name = resEntity ? resEntity.name : resId;
          var needed = balance.cost[resId];
          var has = GameState.hasSpendableResource(resId, needed);
          if (!has) canBuy = false;
          parts.push('<span class="' + (has ? 'cost-ok' : 'cost-lack') + '">' + name + ':' + needed + '</span>');
        }
        html += parts.join(' ') + '</div>';
      }

      if (balance && balance.produces) {
        var prodParts = [];
        for (var resId in balance.produces) {
          var resEntity = GameRegistry.getEntity(resId);
          var name = resEntity ? resEntity.name : resId;
          var mult = UpgradeSystem.getProductionMultiplier(building.id);
          var amount = Math.floor(balance.produces[resId] * mult);
          prodParts.push('+' + amount + ' ' + name);
        }
        html += '<div class="card-cost" style="color:#4ecca3">Produces: ' + prodParts.join(', ') + '/s</div>';
      }

      html += '</div>';
      html += '<button class="btn btn-primary" onclick="BuildingSystem.enterBuildMode(\'' + building.id + '\'); GameHUD.closeModal();"' + (canBuy ? '' : ' disabled') + '>Build</button>';
      html += '</div>';
    });

    panel.innerHTML = html || '<div class="card">No buildings available yet.</div>';
  }

  function renderCraftPanel() {
    var panel = document.getElementById("panel-craft");
    if (!panel) return;

    var recipes = CraftSystem.getAllRecipes();
    var html = "";

    recipes.forEach(function (recipe) {
      var isUnlocked = GameState.isUnlocked(recipe.id);

      if (!isUnlocked) {
        // Locked card with inline conditions
        html += '<div class="card" style="opacity: 0.5; position:relative;">';
        html += '<span style="position:absolute; top:8px; right:12px; font-size:18px;">&#128274;</span>';
        html += '<div><div class="card-name">' + escapeHtml(recipe.name) + '</div>';
        html += '<div class="card-info">' + escapeHtml(recipe.description || '') + '</div>';
        html += buildUnlockConditionsHtml(recipe);
        html += '</div>';
        html += '<button class="btn btn-primary" disabled style="opacity: 0.5; cursor: not-allowed;">&#128274; Locked</button>';
        html += '</div>';
        return;
      }

      var info = CraftSystem.getRecipeInfo(recipe.id);
      var balance = info.balance;

      html += '<div class="card" style="position:relative;">';
      html += '<div><div class="card-name">' + escapeHtml(recipe.name) + '</div>';
      html += '<div class="card-info">' + escapeHtml(recipe.description || '') + '</div>';

      if (balance && balance.input) {
        html += '<div class="card-cost">Input: ';
        var parts = [];
        for (var resId in balance.input) {
          var entity = GameRegistry.getEntity(resId);
          var name = entity ? entity.name : resId;
          var needed = balance.input[resId];
          var has = GameState.hasSpendableResource(resId, needed);
          parts.push('<span class="' + (has ? 'cost-ok' : 'cost-lack') + '">' + name + ':' + needed + '</span>');
        }
        html += parts.join(' ') + '</div>';
      }

      if (balance && balance.output) {
        var outParts = [];
        for (var resId in balance.output) {
          var entity = GameRegistry.getEntity(resId);
          var name = entity ? entity.name : resId;
          outParts.push('+' + balance.output[resId] + ' ' + name);
        }
        html += '<div class="card-cost" style="color:#4ecca3">Output: ' + outParts.join(', ') + '</div>';
      }

      html += '</div>';

      // Check if output is equipment and already owned
      var hasInInventory = false;
      var outputEquipmentId = null;
      var isEquipped = false;
      if (balance && balance.output) {
        for (var resId in balance.output) {
          var entity = GameRegistry.getEntity(resId);
          if (entity && entity.type === 'equipment') {
            outputEquipmentId = resId;
            var invCount = GameState.getInventoryCount(resId);
            if (invCount > 0) {
              hasInInventory = true;
            }
            // Check if already equipped
            var player = GameState.getPlayer();
            if (player.equipped[entity.slot] === resId) {
              isEquipped = true;
            }
            break;
          }
        }
      }

      if (isEquipped) {
        html += '<button class="btn btn-secondary" disabled style="opacity:0.6;">Equipped</button>';
      } else if (hasInInventory && outputEquipmentId) {
        html += '<button class="btn btn-success" onclick="GameActions.equip(\'' + outputEquipmentId + '\'); GameHUD.renderAll();">Use</button>';
      } else {
        html += '<button class="btn btn-primary" onclick="GameActions.craft(\'' + recipe.id + '\')"' + (info.canCraft ? '' : ' disabled') + '>Craft</button>';
      }

      html += '</div>';
    });

    panel.innerHTML = html || '<div class="card">No recipes available. Explore and gather resources!</div>';
  }

  function renderInventoryPanel() {
    var panel = document.getElementById("panel-inventory");
    if (!panel) return;

    var player = GameState.getPlayer();
    var inventory = GameState.getInventory();
    var html = '<div class="card"><div class="card-name">Equipped</div>';

    var slots = ["weapon", "offhand", "armor"];
    slots.forEach(function (slot) {
      var equippedId = player.equipped[slot];
      if (equippedId) {
        var entity = GameRegistry.getEntity(equippedId);
        var balance = GameRegistry.getBalance(equippedId);
        var stats = balance ? balance.stats : {};
        var statStr = Object.keys(stats).map(function (k) { return "+" + stats[k] + " " + k; }).join(", ");
        html += '<div class="inv-slot equipped" onclick="GameActions.unequip(\'' + slot + '\')">';
        html += '<div style="font-weight:bold">' + escapeHtml(entity ? entity.name : equippedId) + '</div>';
        html += '<div style="font-size:10px;color:#4ecca3">' + statStr + '</div>';
        html += '<div style="font-size:10px;color:#888">[' + slot + '] click to unequip</div>';
        html += '</div>';
      } else {
        html += '<div class="inv-slot" style="opacity:0.5">';
        html += '<div>Empty ' + slot + '</div></div>';
      }
    });

    html += '</div>';

    // Inventory items
    var hasItems = false;
    html += '<div class="card"><div class="card-name">Inventory</div>';
    html += '<div class="inventory-grid">';
    for (var id in inventory) {
      if (inventory[id] <= 0) continue;
      hasItems = true;
      var entity = GameRegistry.getEntity(id);
      if (entity && entity.type === "equipment") {
        html += '<div class="inv-slot" onclick="GameActions.equip(\'' + id + '\')">';
        html += '<div style="font-weight:bold">' + escapeHtml(entity.name) + '</div>';
        html += '<div style="font-size:10px">x' + inventory[id] + '</div>';
        html += '</div>';
      }
    }
    if (!hasItems) {
      html += '<div style="color:#666;font-size:12px;padding:10px">No items yet. Craft equipment!</div>';
    }
    html += '</div></div>';

    panel.innerHTML = html;
  }

  function renderStatsPanel() {
    var panel = document.getElementById("panel-stats");
    if (!panel) return;

    var player = GameState.getPlayer();
    var html = '<div class="card">';
    html += '<div class="card-name">Player Stats</div>';
    html += '<div class="card-info">HP: ' + Math.floor(player.hp) + '/' + GameState.getPlayerMaxHp() + '</div>';
    html += '<div class="card-info">Attack: ' + GameState.getPlayerAttack() + ' (base: ' + player.attack + ')</div>';
    html += '<div class="card-info">Defense: ' + GameState.getPlayerDefense() + ' (base: ' + player.defense + ')</div>';
    html += '<div class="card-info">Position: ' + Math.floor(player.x) + ', ' + Math.floor(player.z) + '</div>';
    html += '</div>';

    // Buildings summary
    html += '<div class="card"><div class="card-name">Buildings</div>';
    var buildings = GameState.getAllBuildings();
    var hasBuildings = false;
    for (var id in buildings) {
      hasBuildings = true;
      var entity = GameRegistry.getEntity(id);
      html += '<div class="card-info">' + (entity ? entity.name : id) + ': ' + buildings[id] + '</div>';
    }
    if (!hasBuildings) html += '<div class="card-info">No buildings yet.</div>';
    html += '</div>';

    // Next unlocks
    var nextUnlocks = UnlockSystem.getNextUnlocks();
    if (nextUnlocks.length > 0) {
      html += '<div class="card"><div class="card-name">Next Unlocks</div>';
      nextUnlocks.slice(0, 5).forEach(function (item) {
        var pct = Math.round(item.progress.percent * 100);
        html += '<div class="card-info">' + escapeHtml(item.entity.name) + ' (' + pct + '%)</div>';
      });
      html += '</div>';
    }

    // Age Advancement
    var currentAge = GameState.getAge();
    var ages = GameRegistry.getEntitiesByType("age");
    var nextAge = null;
    for (var i = 0; i < ages.length; i++) {
      if (!GameState.isUnlocked(ages[i].id) && ages[i].id !== currentAge) {
        var ageBalance = GameRegistry.getBalance(ages[i].id);
        if (ageBalance && ageBalance.advanceFrom && ageBalance.advanceFrom.age === currentAge) {
          nextAge = ages[i];
          break;
        }
      }
    }

    if (nextAge) {
      var balance = GameRegistry.getBalance(nextAge.id);
      html += '<div class="card"><div class="card-name">🏛️ Age Advancement: ' + escapeHtml(nextAge.name) + '</div>';
      var canAdvance = true;
      var requirements = [];

      if (balance.advanceFrom.resources) {
        for (var resId in balance.advanceFrom.resources) {
          var needed = balance.advanceFrom.resources[resId];
          var current = GameState.getSpendableResource(resId);
          var met = current >= needed;
          if (!met) canAdvance = false;
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          var className = met ? 'cost-ok' : 'cost-lack';
          requirements.push('<span class="' + className + '">' + resName + ': ' + Math.floor(current) + '/' + needed + '</span>');
        }
      }

      if (balance.advanceFrom.buildings) {
        for (var bldId in balance.advanceFrom.buildings) {
          var needed = balance.advanceFrom.buildings[bldId];
          var current = GameState.getBuildingCount(bldId);
          var met = current >= needed;
          if (!met) canAdvance = false;
          var bldEntity = GameRegistry.getEntity(bldId);
          var bldName = bldEntity ? bldEntity.name : bldId;
          var className = met ? 'cost-ok' : 'cost-lack';
          requirements.push('<span class="' + className + '">' + bldName + ': ' + current + '/' + needed + '</span>');
        }
      }

      html += '<div class="card-info">' + requirements.join(' | ') + '</div>';
      html += '<button class="btn ' + (canAdvance ? 'btn-craft' : 'btn-disabled') + '" ' + 
              'onclick="GameActions.advanceAge(\'' + nextAge.id + '\')" ' +
              (canAdvance ? '' : 'disabled') + '>Advance!</button>';
      html += '</div>';
    }

    html += '<div style="margin-top:8px">';
    html += '<button class="btn btn-secondary" onclick="GameActions.saveGame()">Save Now</button> ';
    html += '<button class="btn btn-secondary" onclick="GameActions.resetGame()">Reset</button>';
    html += '</div>';

    panel.innerHTML = html;
  }

  function showNotification(msg, type = "default") {
    var el = document.getElementById("notification");
    if (!el) return;
    var iconMap = {
      error: '⚠️',
      success: '✅',
      info: 'ℹ️',
      warning: '📣',
      default: '📍'
    };
    var labelMap = {
      error: 'Alert',
      success: 'Success',
      info: 'Info',
      warning: 'Notice',
      default: 'Update'
    };
    var resolvedType = iconMap[type] ? type : 'default';

    el.innerHTML = '<span class="notification-icon">' + iconMap[resolvedType] + '</span>' +
      '<span class="notification-copy">' +
      '<span class="notification-label">' + labelMap[resolvedType] + '</span>' +
      '<span class="notification-message">' + escapeHtml(msg) + '</span>' +
      '</span>';

    el.classList.remove("show", "error", "success", "info", "warning", "default");
    el.classList.add("show", resolvedType);
    if (_notificationTimer) clearTimeout(_notificationTimer);
    _notificationTimer = setTimeout(function () {
      el.classList.remove("show", "error", "success", "info", "warning", "default");
    }, 3500);
  }

  function showError(msg) {
    showNotification(msg, "error");
  }

  function showSuccess(msg) {
    showNotification(msg, "success");
  }

  function showFloatingText(worldX, worldY, worldZ, text, type = "default") {
    var pos = GameScene.worldToScreen(new THREE.Vector3(worldX, worldY + 1.5, worldZ));
    var el = document.createElement("div");
    el.className = "floating-text " + type;
    el.textContent = text;
    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";
    document.body.appendChild(el);

    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1500);
  }

  function showDamageNumber(worldX, worldY, worldZ, text, type) {
    var pos = GameScene.worldToScreen(new THREE.Vector3(worldX, worldY, worldZ));
    var el = document.createElement("div");
    el.className = "damage-number " + type;
    el.textContent = text;
    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";
    document.body.appendChild(el);

    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1000);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  
  var _hoveredInstance = null;
  var _selectedInstance = null;
  
  function setHoveredInstance(uid) {
    _hoveredInstance = uid;
  }
  
  function selectInstance(uid) {
    if (BuildingSystem.isBuildMode()) return;
    _selectedInstance = uid;
    showBuildingInspector(uid);
    if (window.RangeIndicator) RangeIndicator.show(uid);
  }
  
  function showBuildingInspector(uid) {
    var instance = GameState.getInstance(uid);
    if (!instance) return;

    var entity = GameRegistry.getEntity(instance.entityId);
    if (!entity) return;

    var inspector = document.getElementById("building-inspector");
    if (!inspector) return;

    var balance = GameRegistry.getBalance(instance.entityId);
    var currentLevel = instance.level || 1;
    var levelText = "Lv." + currentLevel;

    // --- Upgrade section ---
    var upgradeHtml = "";
    var upgradeCheck = UpgradeSystem.canUpgrade(instance.entityId, uid);

    if (upgradeCheck.can && upgradeCheck.upgrade) {
      var nextLevel = upgradeCheck.level;
      var upgrade = upgradeCheck.upgrade;
      var costParts = [];
      var canAfford = true;
      if (upgrade.cost) {
        for (var resId in upgrade.cost) {
          var needed = upgrade.cost[resId];
          var have = GameState.getSpendableResource(resId) || 0;
          var res = GameRegistry.getEntity(resId);
          var resName = res ? res.name : resId;
          var color = have >= needed ? "#4ecca3" : "#e63946";
          if (have < needed) canAfford = false;
          costParts.push('<span style="color:' + color + '">' + needed + ' ' + escapeHtml(resName) + '</span>');
        }
      }
      var benefits = [];
      if (upgrade.productionMultiplier) benefits.push("x" + upgrade.productionMultiplier + " prod");
      if (balance.workerCount && balance.workerCount[nextLevel]) benefits.push(balance.workerCount[nextLevel] + " workers");
      if (balance.searchRadius && balance.searchRadius[nextLevel]) benefits.push(balance.searchRadius[nextLevel] + " range");

      upgradeHtml = '<div class="inspector-section">' +
        '<div style="color:#4ecca3; font-size:11px; font-weight:bold;">⬆ Lv.' + nextLevel + ': ' + costParts.join(", ") + '</div>' +
        (benefits.length > 0 ? '<div style="color:#ffb74d; font-size:10px;">→ ' + benefits.join(", ") + '</div>' : '') +
        '<button class="btn btn-primary" style="margin-top:4px; font-size:11px; padding:3px 10px;" onclick="GameActions.upgrade(\'' + instance.entityId + '\', \'' + uid + '\')" ' +
        (canAfford ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"') + '>Upgrade</button>' +
        '</div>';
    } else if (upgradeCheck.reason === "Not enough resources" && balance.upgrades) {
      var nextLevelKey = (instance.level || 1) + 1;
      if (balance.upgrades[nextLevelKey]) {
        var upgrade = balance.upgrades[nextLevelKey];
        var costParts = [];
        if (upgrade.cost) {
          for (var resId in upgrade.cost) {
            var needed = upgrade.cost[resId];
            var have = GameState.getSpendableResource(resId) || 0;
            var res = GameRegistry.getEntity(resId);
            var resName = res ? res.name : resId;
            var color = have >= needed ? "#4ecca3" : "#e63946";
            costParts.push('<span style="color:' + color + '">' + needed + ' ' + escapeHtml(resName) + ' <small>(' + Math.floor(have) + ')</small></span>');
          }
        }
        var benefits = [];
        if (upgrade.productionMultiplier) benefits.push("x" + upgrade.productionMultiplier + " prod");
        if (balance.workerCount && balance.workerCount[nextLevelKey]) benefits.push(balance.workerCount[nextLevelKey] + " workers");
        if (balance.searchRadius && balance.searchRadius[nextLevelKey]) benefits.push(balance.searchRadius[nextLevelKey] + " range");

        upgradeHtml = '<div class="inspector-section">' +
          '<div style="color:#4ecca3; font-size:11px; font-weight:bold;">⬆ Lv.' + nextLevelKey + ': ' + costParts.join(", ") + '</div>' +
          (benefits.length > 0 ? '<div style="color:#ffb74d; font-size:10px;">→ ' + benefits.join(", ") + '</div>' : '') +
          '<button class="btn btn-primary" disabled style="margin-top:4px; font-size:11px; padding:3px 10px; opacity:0.5;">Need Resources</button>' +
          '</div>';
      }
    } else if (upgradeCheck.reason === "Max level reached") {
      upgradeHtml = '<div class="inspector-section" style="color:#4ecca3; font-size:11px;">⭐ Max Level</div>';
    }

    // --- Storage section ---
    var storageHtml = "";
    if (balance && balance.storageCapacity) {
      var storageUsed = GameState.getStorageUsed(uid);
      var storageCapacity = GameState.getStorageCapacity(uid);
      var storagePct = storageCapacity > 0 ? Math.floor((storageUsed / storageCapacity) * 100) : 0;
      var storageColor = storagePct >= 90 ? "#e63946" : (storagePct >= 70 ? "#f0a500" : "#4ecca3");

      var storage = GameState.getBuildingStorage(uid);
      var storageParts = [];
      var hasResources = false;
      for (var resId in storage) {
        if (storage[resId] > 0) {
          hasResources = true;
          var res = GameRegistry.getEntity(resId);
          storageParts.push(storage[resId] + " " + (res ? res.name : resId));
        }
      }

      storageHtml = '<div class="inspector-section">' +
        '<div style="font-size:11px;">Storage: <span style="color:' + storageColor + '; font-weight:bold;">' + storageUsed + '/' + storageCapacity + '</span>';

      if (hasResources) {
        storageHtml += ' <span style="color:#ffb74d;">(' + storageParts.join(", ") + ')</span>' +
          '</div>' +
          '<button class="btn btn-success" style="margin-top:4px; font-size:11px; padding:3px 10px;" onclick="GameActions.collectFromBuilding(\'' + uid + '\')">Collect</button>';
      } else {
        storageHtml += '</div><div style="color:#555; font-size:10px;">Empty</div>';
      }
      storageHtml += '</div>';
    }

    // --- Fuel section for fire buildings ---
    var fuelHtml = "";
    if (balance && balance.lightRadius) {
      var fuelData = GameState.getFireFuelData ? GameState.getFireFuelData(uid) : null;
      var currentFuel = fuelData ? fuelData.current : (balance.fuelCapacity || 999);
      var maxFuel = balance.fuelCapacity || 999;
      var fuelPct = maxFuel > 0 ? Math.floor((currentFuel / maxFuel) * 100) : 0;
      var fuelColor = fuelPct > 50 ? "#4ecca3" : (fuelPct > 20 ? "#f0a500" : "#e94560");
      var needsFuel = currentFuel < maxFuel;

      fuelHtml = '<div class="inspector-section">' +
        '<div style="font-size:11px;">🔥 Fuel: <span style="color:' + fuelColor + '; font-weight:bold;">' + Math.floor(currentFuel) + '/' + maxFuel + '</span> (' + fuelPct + '%)</div>';
      fuelHtml += '<div style="height:8px; background:rgba(15,52,96,0.9); border-radius:5px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); margin-top:5px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.28);">';
      fuelHtml += '<div style="width:' + fuelPct + '%; height:100%; background:linear-gradient(90deg, ' + fuelColor + ', #ffd166); border-radius:4px; transition:width 0.3s linear;"></div>';
      fuelHtml += '</div>';
      fuelHtml += '<div style="color:#888; font-size:10px; margin-top:3px;">Burning down through the night. Refuel fills the bar back to max.</div>';

      if (balance.refuelCost) {
        var refuelParts = [];
        var canRefuel = needsFuel;
        for (var resId in balance.refuelCost) {
          var needed = balance.refuelCost[resId];
          var have = GameState.getSpendableResource(resId);
          var res = GameRegistry.getEntity(resId);
          var resName = res ? res.name : resId;
          var color = have >= needed ? "#4ecca3" : "#e63946";
          if (have < needed) canRefuel = false;
          refuelParts.push('<span style="color:' + color + '">' + needed + ' ' + escapeHtml(resName) + '</span>');
        }
        fuelHtml += '<div style="color:#888; font-size:10px; margin-top:2px;">Refuel: ' + refuelParts.join(", ") + '</div>';
        fuelHtml += '<div style="color:#666; font-size:10px; margin-top:2px;">Double-click the campfire to quick refuel.</div>';
        fuelHtml += '<button class="btn btn-secondary" style="margin-top:4px; font-size:10px; padding:2px 8px;" onclick="GameActions.refuel(\'' + uid + '\')" ' + (canRefuel ? '' : 'disabled') + '>' + (needsFuel ? 'Refuel' : 'Fuel Full') + '</button>';
      }
      fuelHtml += '</div>';
    }

    // --- Auto farming section ---
    var farmHtml = "";
    if (balance && balance.farming && window.GameActions && GameActions.getFarmPlotStatus) {
      var farmStatus = GameActions.getFarmPlotStatus(uid);
      if (farmStatus) {
        var progressColor = farmStatus.ready ? '#4ecca3' : (farmStatus.riverBoosted ? '#66d9ff' : (farmStatus.watered ? '#57c7ff' : '#f0a500'));
        var supportColor = farmStatus.hasWaterSupport ? (farmStatus.supportSourceType === 'river' ? '#66d9ff' : '#4ecca3') : '#888';
        var storedText = farmStatus.storedAmount > 0 ? farmStatus.storedSummaryText : 'Storage empty';
        farmHtml = '<div class="inspector-section">' +
          '<div style="font-size:11px; color:#aaa; margin-bottom:4px;">🌱 Crop: <span style="color:#e0e0e0; font-weight:bold;">' + escapeHtml(farmStatus.cropName) + '</span></div>' +
          '<div style="font-size:11px; margin-bottom:4px;">Status: <span style="color:' + progressColor + '; font-weight:bold;">' + escapeHtml(farmStatus.statusText) + '</span></div>' +
          '<div style="height:6px; background:rgba(15,52,96,0.9); border-radius:4px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); margin-bottom:4px;">' +
            '<div style="width:' + farmStatus.progressPercent + '%; height:100%; background:' + progressColor + '; transition:width 0.2s;"></div>' +
          '</div>' +
          '<div style="font-size:10px; color:#9fb3c8; margin-bottom:2px;">' + escapeHtml(farmStatus.detailText) + '</div>' +
          '<div style="font-size:10px; color:#c7d6e8; margin-bottom:3px;">👷 Resident: ' + escapeHtml(farmStatus.workerStatusText) + '</div>' +
          '<div style="font-size:10px; color:' + supportColor + '; margin-bottom:3px;">💧 ' + escapeHtml(farmStatus.supportSourceName) + '</div>' +
          '<div style="font-size:10px; color:#888; margin-bottom:3px;">Current yield: ' + escapeHtml(farmStatus.currentYieldText || farmStatus.dryYieldText) + '</div>' +
          '<div style="font-size:10px; color:#888; margin-bottom:3px;">Dry: ' + escapeHtml(farmStatus.dryYieldText) + ' • Watered: ' + escapeHtml(farmStatus.wateredYieldText) + '</div>' +
          '<div style="font-size:10px; color:#888; margin-bottom:4px;">River boost: ' + escapeHtml(farmStatus.riverYieldText) + '</div>' +
          '<div style="font-size:10px; color:#c7d6e8;">Stored: ' + escapeHtml(storedText) + '</div>' +
        '</div>';
      }
    }

    // --- Synergy section ---
    var synergyHtml = "";
    if (window.SynergySystem) {
      var synergyBonus = SynergySystem.getSynergyBonus(uid);
      if (synergyBonus.productionBonus > 0 || synergyBonus.speedBonus > 0) {
        var bonusParts = [];
        if (synergyBonus.productionBonus > 0) bonusParts.push("+" + Math.round(synergyBonus.productionBonus * 100) + "% prod");
        if (synergyBonus.speedBonus > 0) bonusParts.push("+" + Math.round(synergyBonus.speedBonus * 100) + "% speed");
        synergyHtml = '<div class="inspector-section">' +
          '<div style="color:#4ecca3; font-size:11px;">⚡ ' + bonusParts.join(", ") + '</div>' +
          '<div style="color:#666; font-size:9px;">From ' + synergyBonus.nearbyCount + ' nearby</div>' +
          '</div>';
      }
    }

    // --- Worker section ---
    var workerHtml = "";
    if (window.NPCSystem && balance && balance.workerCount) {
      var workers = NPCSystem.getNPCsForBuilding(uid);
      if (workers && workers.length > 0) {
        workerHtml = '<div class="inspector-section">' +
          '<div style="color:#aaa; font-size:11px;">👷 Workers: ' + workers.length + '/' + (balance.workerCount[currentLevel] || workers.length) + '</div>' +
          '</div>';
      }
    }

    // --- Range info ---
    var rangeHtml = "";
    if (balance) {
      var sR = (balance.searchRadius && balance.searchRadius[currentLevel]) ? balance.searchRadius[currentLevel] : 0;
      var tR = balance.transferRange || 0;
      var wR = balance.waterRadius || 0;
      var rangeParts = [];
      if (sR > 0) rangeParts.push('<span style="color:#00ff88;">' + (balance.farming ? 'Worker: ' : 'Harvest: ') + sR + '</span>');
      if (tR > 0) rangeParts.push('<span style="color:#4488ff;">Transfer: ' + tR + '</span>');
      if (wR > 0) rangeParts.push('<span style="color:#57c7ff;">Water: ' + wR + '</span>');
      if (rangeParts.length > 0) {
        rangeHtml = '<div class="inspector-section">' +
          '<div style="color:#aaa; font-size:11px;">📡 ' + rangeParts.join(' | ') + '</div>' +
          '</div>';
      }
    }

    // --- Refund info ---
    var refundText = "";
    if (balance && balance.cost) {
      var totalRefund = {};
      for (var resId in balance.cost) {
        totalRefund[resId] = Math.floor(balance.cost[resId] * 0.5);
      }
      if (balance.upgrades && currentLevel > 1) {
        for (var lvl = 2; lvl <= currentLevel; lvl++) {
          var upg = balance.upgrades[lvl];
          if (upg && upg.cost) {
            for (var resId in upg.cost) {
              totalRefund[resId] = (totalRefund[resId] || 0) + Math.floor(upg.cost[resId] * 0.5);
            }
          }
        }
      }
      var refundParts = [];
      for (var resId in totalRefund) {
        if (totalRefund[resId] > 0) {
          var res = GameRegistry.getEntity(resId);
          refundParts.push(totalRefund[resId] + " " + (res ? res.name : resId));
        }
      }
      if (refundParts.length > 0) {
        refundText = "Refund 50%: " + refundParts.join(", ");
      }
    }

    inspector.innerHTML =
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
      rangeHtml +
      fuelHtml +
      upgradeHtml +
      (refundText ? '<div style="color:#ffb74d; font-size:10px; margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.06);">' + refundText + '</div>' : '') +
      '<div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); display:flex; gap:6px;">' +
        '<button class="btn btn-danger" style="font-size:11px; padding:4px 12px;" onclick="GameHUD.confirmDestroy(\'' + uid + '\')">Delete</button>' +
        '<button class="btn btn-secondary" style="font-size:11px; padding:4px 12px;" onclick="GameHUD.closeInspector()">Close</button>' +
      '</div>' +
      '</div>';

    inspector.classList.add("active");
  }
  
  function confirmDestroy(uid) {
    if (!confirm("Delete this structure?\nYou will receive a 50% refund.")) {
      return;
    }
    if (window.RangeIndicator && RangeIndicator.getActiveUid() === uid) {
      RangeIndicator.hide();
    }
    BuildingSystem.destroyBuilding(uid);
    closeInspector();
    showNotification("Structure removed.");
  }
  
  function closeInspector() {
    _selectedInstance = null;
    var inspector = document.getElementById("building-inspector");
    if (inspector) inspector.classList.remove("active");
    if (window.RangeIndicator) RangeIndicator.hide();
  }

  /**
   * Show worker training modal
   */
  
  // Handle Delete key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Delete' && _hoveredInstance && !BuildingSystem.isBuildMode()) {
      confirmDestroy(_hoveredInstance);
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      toggleQuickbarMode();
      return;
    }

    var quickbarIndex = getQuickbarKeyIndex(e);
    if (quickbarIndex === null) return;

    e.preventDefault();
    activateQuickbarSlot(quickbarIndex);
  });

  function formatRewardSummary(rewardMap) {
    if (!rewardMap) return '';

    var parts = [];
    for (var resId in rewardMap) {
      if (!rewardMap[resId]) continue;
      var entity = GameRegistry.getEntity(resId);
      parts.push(rewardMap[resId] + ' ' + (entity ? entity.name : resId));
    }

    return parts.join(' + ');
  }

  function getNodeAccentColor(nodeInfo) {
    if (!nodeInfo) return '#4ecca3';
    if (nodeInfo.isGiant) return '#f0a500';
    if (nodeInfo.stateLabel === 'Loaded' || nodeInfo.stateLabel === 'Mature') return '#4ecca3';
    if (nodeInfo.stateLabel === 'Few Berries' || nodeInfo.stateLabel === 'Sapling') return '#7db4ff';
    if (nodeInfo.stateLabel === 'Berrying' || nodeInfo.stateLabel === 'Young' || nodeInfo.stateLabel === 'Large') return '#f0a500';
    return '#4ecca3';
  }

  function getWorldNodeTitle(objData, nodeInfo, entity) {
    if (!nodeInfo) return entity ? entity.name : objData.type;
    if (objData.type === 'node.tree' || objData.type === 'node.rock' || objData.type === 'node.berry_bush') {
      return nodeInfo.name || nodeInfo.label;
    }
    return nodeInfo.label;
  }

  function getWorldNodeMeta(objData, nodeInfo) {
    if (!nodeInfo) return '';

    var rewardText = formatRewardSummary(nodeInfo.rewards);
    if (objData.type === 'node.tree' || objData.type === 'node.rock') {
      return rewardText;
    }
    if (objData.type === 'node.berry_bush') {
      return rewardText || 'Food';
    }

    return (nodeInfo.stateLabel ? nodeInfo.stateLabel + ' • ' : '') + rewardText;
  }

  function shouldShowWorldNodeLabel(objData) {
    if (!objData || !objData.type) return false;
    return objData.type !== 'node.tree' && objData.type !== 'node.rock' && objData.type !== 'node.berry_bush';
  }

  function getInspectNodeMeta(objData, nodeInfo) {
    if (!nodeInfo) return 'HP ' + objData.hp + '/' + objData.maxHp;

    var rewardText = formatRewardSummary(nodeInfo.rewards);
    if (objData.type === 'node.tree') {
      return rewardText || 'Wood';
    }
    if (objData.type === 'node.rock') {
      return rewardText || 'Stone';
    }
    if (objData.type === 'node.berry_bush') {
      return rewardText || 'Food';
    }

    return (nodeInfo.stateLabel ? nodeInfo.stateLabel + ' • ' : '') + rewardText;
  }

  function showObjectHpBar(objData, holdMs) {
    if (showObjectHpBar._hideTimer) {
      clearTimeout(showObjectHpBar._hideTimer);
      showObjectHpBar._hideTimer = null;
    }

    var el = document.getElementById("object-hp-bar");
    if (!el) {
      el = document.createElement("div");
      el.id = "object-hp-bar";
      el.innerHTML = '<div class="object-hp-title"></div><div class="object-hp-meta"></div><div class="object-hp-track"><div class="object-hp-fill"></div></div>';
      document.body.appendChild(el);
    }

    var pos = GameScene.worldToScreen(new THREE.Vector3(objData.worldX, 1.5, objData.worldZ));
    if (!pos) { el.style.display = "none"; return; }

    var nodeInfo = (objData.type && objData.type.indexOf('node.') === 0 && typeof GameTerrain !== 'undefined' && GameTerrain.getNodeInfo) ? GameTerrain.getNodeInfo(objData) : null;
    var entity = GameRegistry.getEntity(objData.type);
    var titleText = nodeInfo ? getWorldNodeTitle(objData, nodeInfo, entity) : (entity ? entity.name : objData.type);
    var metaText = getInspectNodeMeta(objData, nodeInfo);
    var accentColor = nodeInfo ? getNodeAccentColor(nodeInfo) : 'rgba(255,255,255,0.12)';

    var pct = Math.max(0, (objData.hp / objData.maxHp) * 100);
    el.style.left = (pos.x - 52) + "px";
    el.style.top = (pos.y - 4) + "px";
    el.style.display = "block";

    var title = el.querySelector('.object-hp-title');
    if (title) title.textContent = titleText;

    var meta = el.querySelector('.object-hp-meta');
    if (meta) meta.textContent = metaText;

    var track = el.querySelector('.object-hp-track');
    if (track) track.style.borderColor = accentColor;

    var fill = el.querySelector('.object-hp-fill');
    if (fill) {
      fill.style.width = pct + "%";
      fill.style.background = pct > 60 ? "#4ecca3" : pct > 30 ? "#f0a500" : "#e94560";
    }

    if (holdMs && holdMs > 0) {
      var activeObjectId = objData && objData.id ? objData.id : null;
      showObjectHpBar._activeObjectId = activeObjectId;
      showObjectHpBar._hideTimer = setTimeout(function() {
        var activeEl = document.getElementById("object-hp-bar");
        if (activeEl && showObjectHpBar._activeObjectId === activeObjectId) {
          activeEl.style.display = "none";
        }
        showObjectHpBar._hideTimer = null;
      }, holdMs);
    } else {
      showObjectHpBar._activeObjectId = objData && objData.id ? objData.id : null;
    }
  }

  function hideObjectHpBar() {
    if (showObjectHpBar._hideTimer) {
      clearTimeout(showObjectHpBar._hideTimer);
      showObjectHpBar._hideTimer = null;
    }
    var el = document.getElementById("object-hp-bar");
    if (el) el.style.display = "none";
  }

  function updateNodeHpBars() {
    if (!window.NPCSystem || !NPCSystem.getActiveHarvestNodes) return;
    
    var container = document.getElementById('node-hp-bars-container');
    if (!container) return;
    
    var activeNodes = NPCSystem.getActiveHarvestNodes();
    
    if (activeNodes.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    // Get camera and canvas for world-to-screen conversion
    var camera = GameScene.getCamera();
    var canvas = document.getElementById('game-canvas');
    if (!camera || !canvas) {
      container.innerHTML = '';
      return;
    }
    
    var canvasRect = canvas.getBoundingClientRect();
    
    // Create/update HP bars positioned on each node
    var html = '';
    activeNodes.forEach(function(nodeData, index) {
      // Convert world position to screen position
      var worldPos = new THREE.Vector3(nodeData.worldX, 1.2, nodeData.worldZ); // Above node
      var screenPos = worldPos.clone().project(camera);
      
      // Check if in front of camera
      if (screenPos.z > 1) return;
      
      // Convert to screen coordinates
      var x = (screenPos.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
      var y = (-screenPos.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top;
      
      var percent = (nodeData.currentHp / nodeData.maxHp) * 100;
      var healthClass = percent > 60 ? 'healthy' : percent > 30 ? 'damaged' : 'critical';
      
      var nodeInfo = (window.GameTerrain && GameTerrain.getNodeInfo) ? GameTerrain.getNodeInfo(nodeData.node) : null;
      var nodeType = nodeData.node.type || 'Unknown';
      var nodeName = nodeInfo ? getWorldNodeTitle(nodeData.node, nodeInfo, null) : nodeType.replace('node.', '').replace('_', ' ');
      nodeName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
      
      // HP bar positioned directly on the node
      html += '<div class="node-hp-bar" style="position:fixed; left:' + (x - 30) + 'px; top:' + (y - 10) + 'px; width:60px; text-align:center; pointer-events:none; z-index:15;">';
      html += '<div style="font-size:8px; color:#fff; text-shadow: 1px 1px 2px #000; margin-bottom:1px;">' + escapeHtml(nodeName) + '</div>';
      html += '<div style="font-size:9px; color:#fff; text-shadow: 1px 1px 2px #000; margin-bottom:2px;">' + Math.ceil(nodeData.currentHp) + '/' + nodeData.maxHp + '</div>';
      html += '<div style="height:4px; background:#0f3460; border-radius:2px; overflow:hidden; border:1px solid rgba(0,0,0,0.3);"><div class="hp-bar-fill ' + healthClass + '" style="width:' + percent + '%; height:100%; transition:width 0.2s;"></div></div>';
      html += '</div>';
    });
    
    container.innerHTML = html;
  }

  function updateNodeWorldLabels() {
    var container = document.getElementById('node-world-labels');
    if (!container) return;

    if (_modalActive || !window.GameTerrain || !GameTerrain.getNearbyObjects || !window.GamePlayer || !window.GameScene) {
      container.innerHTML = '';
      return;
    }

    var playerPos = GamePlayer.getPosition ? GamePlayer.getPosition() : null;
    var camera = GameScene.getCamera();
    var canvas = document.getElementById('game-canvas');
    if (!playerPos || !camera || !canvas) {
      container.innerHTML = '';
      return;
    }

    var nearby = GameTerrain.getNearbyObjects(playerPos.x, playerPos.z, 6.5, 6);
    if (!nearby.length) {
      container.innerHTML = '';
      return;
    }

    var canvasRect = canvas.getBoundingClientRect();
    var html = '';

    nearby.forEach(function(objData) {
      if (!shouldShowWorldNodeLabel(objData)) return;

      var nodeInfo = GameTerrain.getNodeInfo(objData);
      if (!nodeInfo) return;

      var worldHeight = nodeInfo.isGiant ? 2.3 : 1.35;
      var worldPos = new THREE.Vector3(objData.worldX, worldHeight, objData.worldZ);
      var screenPos = worldPos.clone().project(camera);
      if (screenPos.z > 1) return;

      var x = (screenPos.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
      var y = (-screenPos.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top;

      if (x < canvasRect.left - 100 || x > canvasRect.right + 100 || y < canvasRect.top - 80 || y > canvasRect.bottom + 80) {
        return;
      }

      var accentColor = getNodeAccentColor(nodeInfo);
      var detailText = getWorldNodeMeta(objData, nodeInfo);
      var titleText = getWorldNodeTitle(objData, nodeInfo, null);

      html += '<div class="node-world-label' + (nodeInfo.isGiant ? ' rare' : '') + '" style="left:' + x + 'px; top:' + y + 'px; border-color:' + accentColor + ';">';
      html += '<div class="node-world-title">' + escapeHtml(titleText) + '</div>';
      html += '<div class="node-world-meta">' + escapeHtml(detailText) + '</div>';
      html += '</div>';
    });

    container.innerHTML = html;
  }

  function updateBuildingStorageLabels() {
    if (!window.GameScene || !GameScene.getCamera || !window.GameState) return;

    var container = document.getElementById('building-storage-labels');
    if (!container) return;

    var instances = GameState.getAllInstances();
    var camera = GameScene.getCamera();
    var canvas = document.getElementById('game-canvas');
    if (!camera || !canvas) {
      container.innerHTML = '';
      return;
    }

    var html = '';
    var canvasRect = canvas.getBoundingClientRect();

    for (var uid in instances) {
      var inst = instances[uid];
      var balance = GameRegistry.getBalance(inst.entityId);
      if (!balance) continue;

      var storageCapacity = GameState.getStorageCapacity(uid);
      var storageUsed = storageCapacity > 0 ? GameState.getStorageUsed(uid) : 0;
      var showStorage = storageCapacity > 0 && (!balance.lightRadius || storageUsed > 0);

      var fuelData = (balance.lightRadius && GameState.getFireFuelData) ? GameState.getFireFuelData(uid) : null;
      var maxFuel = balance.fuelCapacity || 0;
      var currentFuel = maxFuel > 0 ? (fuelData ? fuelData.current : maxFuel) : 0;
      var fuelPct = maxFuel > 0 ? Math.floor((currentFuel / maxFuel) * 100) : 0;
      var fuelBarColor = fuelPct >= 60 ? '#4ecca3' : fuelPct >= 30 ? '#f0a500' : '#e94560';
      var showFuel = maxFuel > 0;

      if (!showStorage && !showFuel) continue;

      var pct = storageCapacity > 0 ? Math.floor((storageUsed / storageCapacity) * 100) : 0;
      var barColor = pct >= 90 ? '#e94560' : pct >= 70 ? '#f0a500' : '#4ecca3';

      // Calculate screen position
      var worldPos = new THREE.Vector3(inst.x, 1.3, inst.z);
      var screenPos = worldPos.clone().project(camera);

      if (screenPos.z > 1) continue;

      var x = (screenPos.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
      var y = (-screenPos.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top;

      html += '<div style="position:fixed; left:' + x + 'px; top:' + y + 'px; transform:translate(-50%, -50%); pointer-events:none; z-index:15; text-align:center;">';

      if (showFuel) {
        html += '<div style="width:62px; padding:3px 5px 4px; border-radius:7px; background:rgba(8,18,35,0.72); border:1px solid rgba(255,170,0,0.28); box-shadow:0 1px 4px rgba(0,0,0,0.35); margin:0 auto 4px;">';
        html += '<div style="font-size:8px; color:#ffd8a8; text-shadow:0 1px 3px #000; margin-bottom:2px; font-weight:bold; letter-spacing:0.04em;">FIRE</div>';
        html += '<div style="height:7px; background:rgba(15,52,96,0.9); border-radius:4px; overflow:hidden; border:1px solid rgba(255,170,0,0.22);">';
        html += '<div style="width:' + fuelPct + '%; height:100%; background:' + fuelBarColor + '; border-radius:3px; transition:width 0.25s linear;"></div>';
        html += '</div>';
        if (fuelPct <= 0) {
          html += '<div style="font-size:9px; color:#e94560; text-shadow:0 1px 3px #000; margin-top:2px; font-weight:bold;">OUT</div>';
        } else {
          html += '<div style="font-size:9px; color:#f5f5f5; text-shadow:0 1px 3px #000; margin-top:2px; font-weight:bold;">' + Math.ceil(currentFuel) + '/' + maxFuel + '</div>';
        }
        html += '</div>';
      }

      if (showStorage) {
        html += '<div style="width:56px; height:8px; background:rgba(15,52,96,0.9); border-radius:4px; overflow:hidden; border:1px solid rgba(78,204,163,0.4); margin:0 auto; box-shadow:0 1px 4px rgba(0,0,0,0.3);">';
        html += '<div style="width:' + pct + '%; height:100%; background:' + barColor + '; border-radius:3px; transition:width 0.3s;"></div>';
        html += '</div>';

        if (pct >= 100) {
          html += '<div style="font-size:9px; color:#e94560; text-shadow:0 1px 3px #000; margin-top:2px; font-weight:bold;">FULL</div>';
        } else if (pct > 0) {
          html += '<div style="font-size:9px; color:#ddd; text-shadow:0 1px 3px #000; margin-top:2px; font-weight:bold;">' + storageUsed + '/' + storageCapacity + '</div>';
        } else {
          html += '<div style="font-size:8px; color:#888; text-shadow:0 1px 3px #000; margin-top:2px;">0/' + storageCapacity + '</div>';
        }
      }

      html += '</div>';
    }
    
    container.innerHTML = html;
  }

  // === MODAL SYSTEM ===
  var _modalActive = false;
  var _modalTab = 'resources';
  var _characterCanvas = null;

  function toggleModal() {
    if (_modalActive) {
      closeModal();
    } else {
      openModal();
    }
  }

  function openModal() {
    _modalActive = true;
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      initCharacterCanvas();
      updateCharacterEquipment();
      renderModalLeftSide();
      switchModalTab(_modalTab);
    }
  }

  function closeModal() {
    _modalActive = false;
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  function switchModalTab(tabName) {
    _modalTab = tabName;
    if (tabName === 'build' || tabName === 'craft') {
      toggleQuickbarMode(tabName, true);
    }
    renderModalHeader();
    
    // Update tab buttons
    document.querySelectorAll('.modal-tab').forEach(function(tab) {
      tab.classList.remove('active');
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      }
    });

    // Update panels
    document.querySelectorAll('.modal-panel').forEach(function(panel) {
      panel.classList.remove('active');
    });
    
    var targetPanel = document.getElementById('modal-panel-' + tabName);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    renderModalPanel();
  }

  function initCharacterCanvas() {
    var canvas = document.getElementById('character-canvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    _characterCanvas = canvas;
    
    // Draw initial character
    drawCharacter2D();
  }

  function drawCharacter2D() {
    if (!_characterCanvas) return;
    
    var ctx = _characterCanvas.getContext('2d');
    if (!ctx) return;
    
    var player = GameState.getPlayer();
    
    // Clear canvas
    ctx.clearRect(0, 0, 300, 400);
    
    // Center position
    var centerX = 150;
    var centerY = 200;
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 80, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw legs
    ctx.fillStyle = '#3a3a5c';
    ctx.fillRect(centerX - 15, centerY + 20, 12, 35); // Left leg
    ctx.fillRect(centerX + 3, centerY + 20, 12, 35);  // Right leg
    
    // Draw boots if equipped
    if (player.equipped.boots) {
      ctx.fillStyle = '#654321';
      ctx.fillRect(centerX - 17, centerY + 48, 16, 12); // Left boot
      ctx.fillRect(centerX + 1, centerY + 48, 16, 12);  // Right boot
    }
    
    // Draw body
    ctx.fillStyle = '#4488cc';
    ctx.fillRect(centerX - 20, centerY - 25, 40, 50);
    
    // Draw armor if equipped
    if (player.equipped.armor) {
      ctx.fillStyle = 'rgba(112, 128, 144, 0.8)';
      ctx.fillRect(centerX - 22, centerY - 27, 44, 52);
      
      // Armor details
      ctx.strokeStyle = '#708090';
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - 22, centerY - 27, 44, 52);
    }
    
    // Draw arms
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(centerX - 31, centerY - 15, 10, 35); // Left arm
    ctx.fillRect(centerX + 21, centerY - 15, 10, 35); // Right arm
    
    // Draw shield if equipped (left hand)
    if (player.equipped.offhand) {
      ctx.fillStyle = '#8B7355';
      ctx.beginPath();
      // Rounded rectangle for shield
      var x = centerX - 40;
      var y = centerY - 10;
      var w = 20;
      var h = 30;
      var r = 5;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      
      // Shield boss
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(centerX - 30, centerY + 5, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw weapon if equipped (right hand)
    if (player.equipped.weapon) {
      // Sword blade
      ctx.fillStyle = '#C0C0C0';
      ctx.fillRect(centerX + 28, centerY - 30, 6, 40);
      
      // Sword hilt
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(centerX + 23, centerY + 10, 16, 5);
      
      // Sword tip
      ctx.beginPath();
      ctx.moveTo(centerX + 28, centerY - 30);
      ctx.lineTo(centerX + 31, centerY - 40);
      ctx.lineTo(centerX + 34, centerY - 30);
      ctx.fill();
    }
    
    // Draw head
    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 45, 18, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX - 6, centerY - 48, 2, 0, Math.PI * 2);
    ctx.arc(centerX + 6, centerY - 48, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 42, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  function updateCharacterEquipment() {
    // Re-draw character with updated equipment
    drawCharacter2D();
  }

  function renderModalPanel() {
    if (!_modalActive) return;
    switch (_modalTab) {
      case 'resources':
        renderModalResources();
        break;
      case 'build':
        renderModalBuild();
        break;
      case 'craft':
        renderModalCraft();
        break;
      case 'stats':
        renderModalStats();
        break;
      case 'research':
        renderModalResearch();
        break;
    }
  }

  function updateModal() {
    if (_modalActive) {
      renderModalHeader();
      updateCharacterEquipment();
      renderModalLeftSide();
      renderModalPanel();
    }
  }

  function describeUnlockProgress(progress) {
    if (!progress || !progress.details) return '';

    var unmet = [];
    progress.details.forEach(function(detail) {
      if (detail.met) return;

      if (detail.type === 'resource') {
        var resEntity = GameRegistry.getEntity(detail.id);
        unmet.push((resEntity ? resEntity.name : detail.id) + ' ' + Math.floor(detail.current) + '/' + detail.target);
      } else if (detail.type === 'building') {
        var buildingEntity = GameRegistry.getEntity(detail.id);
        unmet.push((buildingEntity ? buildingEntity.name : detail.id) + ' ' + detail.current + '/' + detail.target);
      } else if (detail.type === 'age') {
        var ageEntity = GameRegistry.getEntity(detail.target);
        unmet.push('Reach ' + (ageEntity ? ageEntity.name : detail.target));
      } else if (detail.type === 'technology') {
        var techEntity = GameRegistry.getEntity(detail.id);
        unmet.push('Research ' + (techEntity ? techEntity.name : detail.id));
      }
    });

    return unmet.slice(0, 2).join(' • ');
  }

  function getEntityIcon(entityOrId) {
    var entity = typeof entityOrId === 'string' ? GameRegistry.getEntity(entityOrId) : entityOrId;
    if (!entity) return '✨';

    if (entity.type === 'resource') return getResourceIcon(entity.id);
    if (entity.type === 'technology') return '🔬';
    if (entity.type === 'recipe') return '🛠️';

    if (entity.type === 'building') {
      var buildingIcons = {
        'building.berry_gatherer': '🏠',
        'building.farm_plot': '🌾',
        'building.tree_nursery': '🌲',
        'building.warehouse': '📦',
        'building.bridge': '🌉',
        'building.well': '🪣',
        'building.campfire': '🔥',
        'building.barracks': '🛡️',
        'building.blacksmith': '🔨',
        'building.smelter': '♨️',
        'building.blast_furnace': '🏭'
      };
      if (buildingIcons[entity.id]) return buildingIcons[entity.id];

      var buildingBalance = GameRegistry.getBalance(entity.id) || {};
      if (buildingBalance.produces) {
        var outputIds = Object.keys(buildingBalance.produces);
        if (outputIds.length) return getResourceIcon(outputIds[0]);
      }

      if (entity.id === 'building.warehouse') return '📦';
      if (entity.id === 'building.bridge') return '🌉';
      if (entity.id === 'building.well') return '🪣';
      if (entity.id === 'building.campfire') return '🔥';
      return '🏗️';
    }

    if (entity.type === 'equipment') {
      var equipmentIcons = {
        'equipment.wooden_sword': '🪵⚔',
        'equipment.stone_spear': '🪨🗡',
        'equipment.stone_shield': '🪨🛡',
        'equipment.leather_armor': '🧥',
        'equipment.leather_boots': '🥾',
        'equipment.bronze_sword': '🥉⚔',
        'equipment.bronze_shield': '🥉🛡',
        'equipment.bronze_armor': '🥉🦺',
        'equipment.iron_sword': '⚙️⚔',
        'equipment.iron_shield': '⚙️🛡',
        'equipment.iron_armor': '⚙️🦺',
        'equipment.iron_boots': '⚙️🥾'
      };
      if (equipmentIcons[entity.id]) return equipmentIcons[entity.id];

      var balance = GameRegistry.getBalance(entity.id);
      var slot = entity.slot || (balance && balance.slot);
      if (slot === 'weapon') return '⚔️';
      if (slot === 'offhand') return '🛡️';
      if (slot === 'armor') return '🦺';
      if (slot === 'boots') return '👟';
      return '🧰';
    }

    if (entity.type === 'consumable' || entity.type === 'item') return '🔥';
    return '✨';
  }

  function getLevelValue(levelMap, preferredLevel) {
    if (levelMap === undefined || levelMap === null) return 0;
    if (typeof levelMap === 'number') return levelMap;

    if (preferredLevel !== undefined && levelMap[preferredLevel] !== undefined) {
      return levelMap[preferredLevel];
    }

    var keys = Object.keys(levelMap);
    if (!keys.length) return 0;
    keys.sort(function(a, b) {
      return Number(a) - Number(b);
    });
    return levelMap[keys[0]];
  }

  function buildMetricGrid(items) {
    var filtered = (items || []).filter(function(item) {
      return item && item.value !== undefined && item.value !== null && item.value !== '';
    });

    if (!filtered.length) return '';

    var html = '<div class="management-metrics">';
    filtered.forEach(function(item) {
      html += '<div class="management-metric">';
      html += '<div class="management-metric-label">' + escapeHtml(item.label) + '</div>';
      html += '<div class="management-metric-value">' + escapeHtml(String(item.value)) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildResourcePills(resourceMap, tone) {
    if (!resourceMap) return { html: '', allAffordable: true };

    var parts = [];
    var allAffordable = true;

    for (var resId in resourceMap) {
      var amount = resourceMap[resId];
      var entity = GameRegistry.getEntity(resId);
      var isAffordable = (tone === 'output' || tone === 'neutral') ? true : GameState.hasSpendableResource(resId, amount);
      if (!isAffordable) allAffordable = false;

      var cssTone = 'neutral';
      if (tone === 'output') {
        cssTone = 'output';
      } else if (tone !== 'neutral') {
        cssTone = isAffordable ? 'ready' : 'lacking';
      }

      parts.push(
        '<span class="resource-pill ' + cssTone + '">' +
        '<span class="resource-pill-icon">' + getResourceIcon(resId) + '</span>' +
        '<span>' + escapeHtml(entity ? entity.name : resId) + ' x' + amount + '</span>' +
        '</span>'
      );
    }

    return {
      html: parts.join(''),
      allAffordable: allAffordable
    };
  }

  function buildRequirementChecklist(entity) {
    var progress = UnlockSystem.getUnlockProgress(entity);
    if (!progress || !progress.details || !progress.details.length) return '';

    var html = '<div class="requirement-list">';
    progress.details.forEach(function(detail) {
      var text = '';

      if (detail.type === 'age') {
        var ageEntity = GameRegistry.getEntity(detail.target);
        text = 'Reach ' + (ageEntity ? ageEntity.name : detail.target);
      } else if (detail.type === 'resource') {
        var resourceEntity = GameRegistry.getEntity(detail.id);
        text = (resourceEntity ? resourceEntity.name : detail.id) + ' ' + Math.floor(detail.current) + '/' + detail.target;
      } else if (detail.type === 'building') {
        var buildingEntity = GameRegistry.getEntity(detail.id);
        text = (buildingEntity ? buildingEntity.name : detail.id) + ' ' + detail.current + '/' + detail.target;
      } else if (detail.type === 'technology') {
        var techEntity = GameRegistry.getEntity(detail.id);
        text = 'Research ' + (techEntity ? techEntity.name : detail.id);
      }

      if (!text) return;

      html += '<div class="requirement-item' + (detail.met ? ' met' : '') + '">';
      html += '<span class="requirement-dot">' + (detail.met ? '✓' : '○') + '</span>';
      html += '<span>' + escapeHtml(text) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildTechnologyRequirementChecklist(requiredIds) {
    if (!requiredIds || !requiredIds.length) return '';

    var html = '<div class="requirement-list">';
    requiredIds.forEach(function(reqId) {
      var reqEntity = GameRegistry.getEntity(reqId);
      var met = window.ResearchSystem && ResearchSystem.isResearched(reqId);
      html += '<div class="requirement-item' + (met ? ' met' : '') + '">';
      html += '<span class="requirement-dot">' + (met ? '✓' : '○') + '</span>';
      html += '<span>Research ' + escapeHtml(reqEntity ? reqEntity.name : reqId) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildResearchEffectsList(effects) {
    if (!effects) return '';

    var effectItems = [];
    if (effects.harvestSpeedBonus) effectItems.push('Harvest speed +' + Math.round(effects.harvestSpeedBonus * 100) + '%');
    if (effects.productionBonus) effectItems.push('Production +' + Math.round(effects.productionBonus * 100) + '%');
    if (effects.storageBonus) effectItems.push('Storage +' + Math.round(effects.storageBonus * 100) + '%');
    if (effects.npcSpeedBonus) effectItems.push('Worker speed +' + Math.round(effects.npcSpeedBonus * 100) + '%');

    if (!effectItems.length) return '';

    var html = '<div class="effect-list">';
    effectItems.forEach(function(item) {
      html += '<div class="effect-item">⚡ ' + escapeHtml(item) + '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderModalLeftSide() {
    var player = GameState.getPlayer();
    var inventory = GameState.getInventory();
    
    // Render equipment slots
    var equipContainer = document.getElementById('modal-equipment-slots');
    if (equipContainer) {
      var html = '';
      
      // Weapon slot
      var weaponId = player.equipped.weapon;
      html += '<div class="equipment-slot ' + (weaponId ? 'has-item' : '') + '" onclick="' + (weaponId ? 'GameActions.unequip(\'weapon\')' : '') + '">';
      html += '<div class="equipment-slot-label">⚔️ Weapon</div>';
      if (weaponId) {
        var weaponEntity = GameRegistry.getEntity(weaponId);
        var weaponBalance = GameRegistry.getBalance(weaponId);
        html += '<div class="equipment-slot-item">' + (weaponEntity ? weaponEntity.name : weaponId) + '</div>';
        if (weaponBalance && weaponBalance.stats && weaponBalance.stats.attack) {
          html += '<div class="equipment-slot-stats">+' + weaponBalance.stats.attack + ' ATK</div>';
        }
      } else {
        html += '<div class="equipment-slot-empty">Empty</div>';
      }
      html += '</div>';

      // Offhand slot
      var offhandId = player.equipped.offhand;
      html += '<div class="equipment-slot ' + (offhandId ? 'has-item' : '') + '" onclick="' + (offhandId ? 'GameActions.unequip(\'offhand\')' : '') + '">';
      html += '<div class="equipment-slot-label">🛡️ Shield</div>';
      if (offhandId) {
        var offhandEntity = GameRegistry.getEntity(offhandId);
        var offhandBalance = GameRegistry.getBalance(offhandId);
        html += '<div class="equipment-slot-item">' + (offhandEntity ? offhandEntity.name : offhandId) + '</div>';
        if (offhandBalance && offhandBalance.stats && offhandBalance.stats.defense) {
          html += '<div class="equipment-slot-stats">+' + offhandBalance.stats.defense + ' DEF</div>';
        }
      } else {
        html += '<div class="equipment-slot-empty">Empty</div>';
      }
      html += '</div>';

      // Armor slot
      var armorId = player.equipped.armor;
      html += '<div class="equipment-slot ' + (armorId ? 'has-item' : '') + '" onclick="' + (armorId ? 'GameActions.unequip(\'armor\')' : '') + '">';
      html += '<div class="equipment-slot-label">🦺 Armor</div>';
      if (armorId) {
        var armorEntity = GameRegistry.getEntity(armorId);
        var armorBalance = GameRegistry.getBalance(armorId);
        html += '<div class="equipment-slot-item">' + (armorEntity ? armorEntity.name : armorId) + '</div>';
        var stats = [];
        if (armorBalance && armorBalance.stats) {
          if (armorBalance.stats.defense) stats.push('+' + armorBalance.stats.defense + ' DEF');
          if (armorBalance.stats.maxHp) stats.push('+' + armorBalance.stats.maxHp + ' HP');
        }
        if (stats.length) html += '<div class="equipment-slot-stats">' + stats.join(', ') + '</div>';
      } else {
        html += '<div class="equipment-slot-empty">Empty</div>';
      }
      html += '</div>';

      // Boots slot
      var bootsId = player.equipped.boots;
      html += '<div class="equipment-slot ' + (bootsId ? 'has-item' : '') + '" onclick="' + (bootsId ? 'GameActions.unequip(\'boots\')' : '') + '">';
      html += '<div class="equipment-slot-label">👟 Boots</div>';
      if (bootsId) {
        var bootsEntity = GameRegistry.getEntity(bootsId);
        var bootsBalance = GameRegistry.getBalance(bootsId);
        html += '<div class="equipment-slot-item">' + (bootsEntity ? bootsEntity.name : bootsId) + '</div>';
        if (bootsBalance && bootsBalance.stats && bootsBalance.stats.speed) {
          html += '<div class="equipment-slot-stats">+' + bootsBalance.stats.speed + ' SPD</div>';
        }
      } else {
        html += '<div class="equipment-slot-empty">Empty</div>';
      }
      html += '</div>';
      
      equipContainer.innerHTML = html;
    }
    
    // Render inventory grid
    var invContainer = document.getElementById('modal-inventory-grid');
    if (invContainer) {
      var html = '';

      for (var itemId in inventory) {
        if (inventory[itemId] <= 0) continue;
        var entity = GameRegistry.getEntity(itemId);
        if (!entity || (entity.type !== 'equipment' && entity.type !== 'consumable')) continue;

        var onClick = entity.type === 'equipment'
          ? 'onclick="GameActions.equip(\'' + itemId + '\')"'
          : '';
        var cssClass = entity.type === 'consumable' ? 'inv-slot consumable-slot' : 'inv-slot';

        html += '<div class="' + cssClass + '" ' + onClick + '>';
        html += '<div>' + (entity ? entity.name : itemId) + '</div>';
        html += '<div>x' + inventory[itemId] + '</div>';
        if (entity.type === 'consumable' && entity.description) {
          html += '<div style="font-size:9px;color:#888;">' + entity.description + '</div>';
        }
        html += '</div>';
      }

      if (!html) {
        html = '<div style="grid-column: 1/-1; text-align:center; color:#666; font-size:11px; padding:10px;">No items</div>';
      }

      invContainer.innerHTML = html;
    }
  }

  function renderModalResources() {
    var panel = document.getElementById('modal-panel-resources');
    if (!panel) return;

    var resources = GameRegistry.getEntitiesByType('resource');
    var stats = TickSystem.getResourceStats();
    var html = '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div><div class="section-kicker">Economy Snapshot</div><div class="section-title">Available Resources</div><div class="section-copy">These totals reflect everything you can spend right now.</div></div>';
    html += '</div>';
    html += '<div class="resources-grid">';

    resources.forEach(function(res) {
      if (!GameState.isUnlocked(res.id)) return;
      
      var amount = GameState.getSpendableResource(res.id);
      var net = stats.net ? stats.net[res.id] : 0;
      
      var netStr = '';
      var netColor = '#888';
      if (net > 0.001) {
        netStr = '+' + net.toFixed(1) + '/sec';
        netColor = '#4ecca3';
      } else if (net < -0.001) {
        netStr = net.toFixed(1) + '/sec';
        netColor = '#e94560';
      }

      html += '<div class="resource-card">';
  html += '<div class="resource-card-icon">' + getResourceIcon(res.id) + '</div>';
      html += '<div class="resource-card-info">';
      html += '<div class="resource-card-name">' + escapeHtml(res.name) + '</div>';
      html += '<div class="resource-card-amount">' + Math.floor(amount) + '</div>';
      if (netStr) {
        html += '<div style="font-size:11px;color:' + netColor + ';">' + netStr + '</div>';
      }
      html += '</div>';
      html += '</div>';
    });

    html += '</div></div>';
    panel.innerHTML = html;
  }

  function renderModalBuild() {
    var panel = document.getElementById('modal-panel-build');
    if (!panel) return;

    var buildings = GameRegistry.getEntitiesByType('building').filter(function(building) {
      return !building.hiddenInBuildMenu;
    });
    var readyCards = [];
    var blockedCards = [];
    var lockedCards = [];
    var totalPlaced = 0;

    buildings.forEach(function(building) {
      var balance = GameRegistry.getBalance(building.id) || {};
      var count = GameState.getBuildingCount(building.id);
      var isUnlocked = GameState.isUnlocked(building.id);
      var costInfo = buildResourcePills(balance.cost, 'cost');
      var productionInfo = buildResourcePills(balance.produces, 'output');
      var consumptionInfo = buildResourcePills(balance.consumesPerSecond, 'neutral');
      var metrics = buildMetricGrid([
        { label: 'Workers', value: getLevelValue(balance.workerCount, 1) || null },
        { label: 'Range', value: getLevelValue(balance.searchRadius, 1) ? getLevelValue(balance.searchRadius, 1) + ' tiles' : null },
        { label: 'Storage', value: getLevelValue(balance.storageCapacity, 1) || null },
        { label: 'Transfer', value: balance.transferRange ? balance.transferRange + ' tiles' : null },
        { label: 'Light', value: balance.lightRadius ? balance.lightRadius + ' tiles' : null },
        { label: 'Guards', value: getLevelValue(balance.guardCount, 1) || null }
      ]);

      totalPlaced += count;
      
      if (!isUnlocked) {
        lockedCards.push(
          '<div class="management-card locked">' +
          '<div class="management-card-top">' +
          '<div class="management-card-identity">' +
          '<div class="management-icon build">' + getEntityIcon(building) + '</div>' +
          '<div><div class="management-card-name">' + escapeHtml(building.name) + '</div><div class="management-card-copy">' + escapeHtml(building.description || '') + '</div></div>' +
          '</div>' +
          '<div class="management-badges"><span class="management-badge locked">Locked</span></div>' +
          '</div>' +
          buildRequirementChecklist(building) +
          '<div class="card-actions"><button class="btn btn-secondary" disabled>Locked</button></div>' +
          '</div>'
        );
        return;
      }

      var canBuy = costInfo.allAffordable;
      var cardHtml = '';
      cardHtml += '<div class="management-card' + (canBuy ? ' ready' : '') + '">';
      cardHtml += '<div class="management-card-top">';
      cardHtml += '<div class="management-card-identity">';
      cardHtml += '<div class="management-icon build">' + getEntityIcon(building) + '</div>';
      cardHtml += '<div><div class="management-card-name">' + escapeHtml(building.name) + '</div><div class="management-card-copy">' + escapeHtml(building.description || '') + '</div></div>';
      cardHtml += '</div>';
      cardHtml += '<div class="management-badges">';
      cardHtml += '<span class="management-badge neutral">Placed x' + count + '</span>';
      cardHtml += '<span class="management-badge ' + (canBuy ? 'ready' : 'pending') + '">' + (canBuy ? 'Ready' : 'Need stock') + '</span>';
      cardHtml += '</div></div>';
      cardHtml += metrics;
      if (costInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">Construction Cost</div><div class="resource-pill-row">' + costInfo.html + '</div></div>';
      }
      if (productionInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">Produces</div><div class="resource-pill-row">' + productionInfo.html + '</div></div>';
      }
      if (consumptionInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">Consumes</div><div class="resource-pill-row">' + consumptionInfo.html + '</div></div>';
      }
      cardHtml += '<div class="card-actions"><button class="btn btn-primary" onclick="BuildingSystem.enterBuildMode(\'' + building.id + '\'); GameHUD.closeModal();"' + (canBuy ? '' : ' disabled') + '>' + (count > 0 ? 'Place another' : 'Place structure') + '</button></div>';
      cardHtml += '</div>';

      if (canBuy) {
        readyCards.push(cardHtml);
      } else {
        blockedCards.push(cardHtml);
      }
    });

    var html = '';
    html += '<div class="panel-section">';
    html += '<div class="section-header"><div><div class="section-kicker">Settlement Planning</div><div class="section-title">Construction Queue</div><div class="section-copy">See which structures you can place now, which ones still need resources, and which blueprints remain locked.</div></div></div>';
    html += '<div class="summary-list">';
    html += '<div class="summary-row"><span>Ready to place</span><span class="summary-value">' + readyCards.length + '</span></div>';
    html += '<div class="summary-row"><span>Need more stock</span><span class="summary-value">' + blockedCards.length + '</span></div>';
    html += '<div class="summary-row total"><span>Structures placed</span><span class="summary-value">' + totalPlaced + '</span></div>';
    html += '</div></div>';

    if (readyCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Ready Now</div><div class="section-title">Immediate Builds</div><div class="section-copy">These structures are affordable with your current spendable stockpile.</div></div></div><div class="management-grid">' + readyCards.join('') + '</div></div>';
    }

    if (blockedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Blocked</div><div class="section-title">Need More Materials</div><div class="section-copy">These blueprints are unlocked, but your current stockpile is still short.</div></div></div><div class="management-grid">' + blockedCards.join('') + '</div></div>';
    }

    if (lockedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Future Blueprints</div><div class="section-title">Locked Structures</div><div class="section-copy">Track the requirements that unlock your next set of buildings.</div></div></div><div class="management-grid">' + lockedCards.join('') + '</div></div>';
    }

    panel.innerHTML = html || '<div class="empty-state">No building blueprints are available yet.</div>';
  }

  function renderModalCraft() {
    var panel = document.getElementById('modal-panel-craft');
    if (!panel) return;

    var recipes = CraftSystem.getAllRecipes();
    var readyCards = [];
    var waitingCards = [];
    var lockedCards = [];
    var equippedCards = [];

    recipes.forEach(function(recipe) {
      var isUnlocked = GameState.isUnlocked(recipe.id);
      var recipeInfo = CraftSystem.getRecipeInfo(recipe.id);
      var balance = recipeInfo.balance || {};
      var inputInfo = buildResourcePills(balance.input, 'cost');
      var outputInfo = buildResourcePills(balance.output, 'output');
      var outputKeys = balance.output ? Object.keys(balance.output) : [];
      var primaryOutputId = outputKeys.length ? outputKeys[0] : null;
      var primaryOutputEntity = primaryOutputId ? GameRegistry.getEntity(primaryOutputId) : null;
      
      if (!isUnlocked) {
        lockedCards.push(
          '<div class="management-card locked">' +
          '<div class="management-card-top">' +
          '<div class="management-card-identity">' +
          '<div class="management-icon craft">' + getEntityIcon(primaryOutputEntity || recipe) + '</div>' +
          '<div><div class="management-card-name">' + escapeHtml(recipe.name) + '</div><div class="management-card-copy">' + escapeHtml(recipe.description || '') + '</div></div>' +
          '</div>' +
          '<div class="management-badges"><span class="management-badge locked">Locked</span></div>' +
          '</div>' +
          buildRequirementChecklist(recipe) +
          '<div class="card-actions"><button class="btn btn-secondary" disabled>Locked</button></div>' +
          '</div>'
        );
        return;
      }

      var canCraft = recipeInfo.canCraft;
      var hasInInventory = false;
      var outputEquipmentId = null;
      var isEquipped = false;
      if (balance && balance.output) {
        for (var resultId in balance.output) {
          var resultEntity = GameRegistry.getEntity(resultId);
          if (resultEntity && resultEntity.type === 'equipment') {
            outputEquipmentId = resultId;
            var invCount = GameState.getInventoryCount(resultId);
            if (invCount > 0) {
              hasInInventory = true;
            }
            var player = GameState.getPlayer();
            if (player.equipped[resultEntity.slot] === resultId) {
              isEquipped = true;
            }
            break;
          }
        }
      }

      var badges = '';
      var actionHtml = '';
      var statusClass = 'pending';
      var statusText = 'Need materials';

      if (isEquipped) {
        statusClass = 'done';
        statusText = 'Equipped';
        actionHtml = '<button class="btn btn-secondary" disabled>Equipped</button>';
      } else if (hasInInventory && outputEquipmentId) {
        statusClass = 'ready';
        statusText = 'Ready to use';
        actionHtml = '<button class="btn btn-success" onclick="GameActions.equip(\'' + outputEquipmentId + '\'); GameHUD.updateModal();">Use item</button>';
      } else {
        statusClass = canCraft ? 'ready' : 'pending';
        statusText = canCraft ? 'Ready to craft' : 'Need materials';
        actionHtml = '<button class="btn btn-primary" onclick="GameActions.craft(\'' + recipe.id + '\')"' + (canCraft ? '' : ' disabled') + '>Craft</button>';
      }

      if (primaryOutputEntity && primaryOutputEntity.type === 'equipment') {
        badges += '<span class="management-badge neutral">' + escapeHtml((primaryOutputEntity.slot || '').replace(/^./, function(ch) { return ch.toUpperCase(); })) + '</span>';
      }
      badges += '<span class="management-badge ' + statusClass + '">' + statusText + '</span>';

      var cardHtml = '';
      cardHtml += '<div class="management-card' + (statusClass === 'done' ? ' complete' : (statusClass === 'ready' ? ' ready' : '')) + '">';
      cardHtml += '<div class="management-card-top">';
      cardHtml += '<div class="management-card-identity">';
      cardHtml += '<div class="management-icon craft">' + getEntityIcon(primaryOutputEntity || recipe) + '</div>';
      cardHtml += '<div><div class="management-card-name">' + escapeHtml(recipe.name) + '</div><div class="management-card-copy">' + escapeHtml(recipe.description || '') + '</div></div>';
      cardHtml += '</div>';
      cardHtml += '<div class="management-badges">' + badges + '</div>';
      cardHtml += '</div>';
      cardHtml += buildMetricGrid([
        { label: 'Result', value: primaryOutputEntity ? primaryOutputEntity.type : 'Recipe' },
        { label: 'Yield', value: primaryOutputId ? ('x' + balance.output[primaryOutputId]) : null }
      ]);
      if (outputInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">Output</div><div class="resource-pill-row">' + outputInfo.html + '</div></div>';
      }
      if (inputInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">Required Materials</div><div class="resource-pill-row">' + inputInfo.html + '</div></div>';
      }
      cardHtml += '<div class="card-actions">' + actionHtml + '</div>';
      cardHtml += '</div>';

      if (statusClass === 'done') {
        equippedCards.push(cardHtml);
      } else if (statusClass === 'ready') {
        readyCards.push(cardHtml);
      } else {
        waitingCards.push(cardHtml);
      }
    });

    var html = '';
    html += '<div class="panel-section">';
    html += '<div class="section-header"><div><div class="section-kicker">Workshop Queue</div><div class="section-title">Crafting Pipeline</div><div class="section-copy">Prioritize what can be crafted right now, what is already equipped, and what still needs more materials.</div></div></div>';
    html += '<div class="summary-list">';
    html += '<div class="summary-row"><span>Ready now</span><span class="summary-value">' + readyCards.length + '</span></div>';
    html += '<div class="summary-row"><span>Need materials</span><span class="summary-value">' + waitingCards.length + '</span></div>';
    html += '<div class="summary-row total"><span>Already equipped</span><span class="summary-value">' + equippedCards.length + '</span></div>';
    html += '</div></div>';

    if (readyCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Ready Now</div><div class="section-title">Immediate Crafts</div><div class="section-copy">These recipes can be crafted, or their result can be equipped from inventory immediately.</div></div></div><div class="management-grid">' + readyCards.join('') + '</div></div>';
    }

    if (waitingCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Queued</div><div class="section-title">Need More Materials</div><div class="section-copy">Known recipes that are still short on spendable resources.</div></div></div><div class="management-grid">' + waitingCards.join('') + '</div></div>';
    }

    if (equippedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Loadout</div><div class="section-title">Already Equipped</div><div class="section-copy">These crafted upgrades are already active on your survivor.</div></div></div><div class="management-grid">' + equippedCards.join('') + '</div></div>';
    }

    if (lockedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Future Recipes</div><div class="section-title">Locked Crafts</div><div class="section-copy">Unlock these recipes through age progression, research, or settlement growth.</div></div></div><div class="management-grid">' + lockedCards.join('') + '</div></div>';
    }

    panel.innerHTML = html || '<div class="empty-state">No recipes are available yet.</div>';
  }

  function renderModalStats() {
    var panel = document.getElementById('modal-panel-stats');
    if (!panel) return;

    var player = GameState.getPlayer();
    var currentAgeEntity = GameRegistry.getEntity(GameState.getAge());
    var maxHp = GameState.getPlayerMaxHp();
    var attack = GameState.getPlayerAttack();
    var defense = GameState.getPlayerDefense();
    var speed = GameState.getPlayerSpeed ? GameState.getPlayerSpeed() : 3;
    var nextAge = getNextAgeObjective();
    var nextUnlocks = UnlockSystem.getNextUnlocks();
    var buildings = GameState.getAllBuildings();
    var buildingEntries = Object.keys(buildings).map(function(id) {
      var entity = GameRegistry.getEntity(id);
      return {
        id: id,
        name: entity ? entity.name : id,
        count: buildings[id]
      };
    }).sort(function(a, b) {
      return b.count - a.count;
    });
    var totalBuildings = buildingEntries.reduce(function(sum, entry) {
      return sum + entry.count;
    }, 0);

    var html = '';

    html += '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div><div class="section-kicker">Survivor Overview</div><div class="section-title">' + escapeHtml(currentAgeEntity ? currentAgeEntity.name : GameState.getAge()) + '</div><div class="section-copy">Your current combat, travel, and survivability profile.</div></div>';
    html += '</div>';
    html += '<div class="stats-grid">';

    html += '<div class="stat-card hp">';
    html += '<div class="stat-label">❤️ Health</div>';
    html += '<div class="stat-value">' + Math.floor(player.hp) + ' / ' + maxHp + '</div>';
    html += '<div class="stat-breakdown">Base: 100';
    var armorId = player.equipped.armor;
    if (armorId) {
      var armorBalance = GameRegistry.getBalance(armorId);
      if (armorBalance && armorBalance.stats && armorBalance.stats.maxHp) {
        html += '<br>Armor: +' + armorBalance.stats.maxHp;
      }
    }
    html += '</div></div>';

    html += '<div class="stat-card attack">';
    html += '<div class="stat-label">⚔️ Attack</div>';
    html += '<div class="stat-value">' + attack + '</div>';
    html += '<div class="stat-breakdown">Base: ' + player.attack;
    var weaponId = player.equipped.weapon;
    if (weaponId) {
      var weaponBalance = GameRegistry.getBalance(weaponId);
      if (weaponBalance && weaponBalance.stats && weaponBalance.stats.attack) {
        html += '<br>Weapon: +' + weaponBalance.stats.attack;
      }
    }
    html += '</div></div>';

    html += '<div class="stat-card defense">';
    html += '<div class="stat-label">🛡️ Defense</div>';
    html += '<div class="stat-value">' + defense + '</div>';
    html += '<div class="stat-breakdown">Base: ' + player.defense;
    var offhandId = player.equipped.offhand;
    if (offhandId) {
      var offhandBalance = GameRegistry.getBalance(offhandId);
      if (offhandBalance && offhandBalance.stats && offhandBalance.stats.defense) {
        html += '<br>Shield: +' + offhandBalance.stats.defense;
      }
    }
    if (armorId) {
      var armorDefBalance = GameRegistry.getBalance(armorId);
      if (armorDefBalance && armorDefBalance.stats && armorDefBalance.stats.defense) {
        html += '<br>Armor: +' + armorDefBalance.stats.defense;
      }
    }
    html += '</div></div>';

    html += '<div class="stat-card speed">';
    html += '<div class="stat-label">⚡ Speed</div>';
    html += '<div class="stat-value">' + speed.toFixed(1) + '</div>';
    html += '<div class="stat-breakdown">Base: ' + player.speed;
    var bootsId = player.equipped.boots;
    if (bootsId) {
      var bootsBalance = GameRegistry.getBalance(bootsId);
      if (bootsBalance && bootsBalance.stats && bootsBalance.stats.speed) {
        html += '<br>Boots: +' + bootsBalance.stats.speed;
      }
    }
    html += '</div></div>';

    html += '</div>';
    html += '<div class="summary-list compact">';
    html += '<div class="summary-row"><span>Current age</span><span class="summary-value">' + escapeHtml(currentAgeEntity ? currentAgeEntity.name : GameState.getAge()) + '</span></div>';
    html += '<div class="summary-row"><span>World position</span><span class="summary-value">' + Math.floor(player.x) + ', ' + Math.floor(player.z) + '</span></div>';
    html += '</div>';
    html += '</div>';

    if (nextAge) {
      var nextAgeBalance = nextAge.balance;
      var canAdvance = true;
      var progressItems = [];

      if (nextAgeBalance.advanceFrom.resources) {
        for (var resId in nextAgeBalance.advanceFrom.resources) {
          var resourceCurrent = GameState.getSpendableResource(resId);
          var resourceTarget = nextAgeBalance.advanceFrom.resources[resId];
          var resourceEntity = GameRegistry.getEntity(resId);
          var resourceMet = resourceCurrent >= resourceTarget;
          if (!resourceMet) canAdvance = false;
          progressItems.push({
            label: resourceEntity ? resourceEntity.name : resId,
            current: resourceCurrent,
            target: resourceTarget,
            met: resourceMet,
            isBuilding: false
          });
        }
      }

      if (nextAgeBalance.advanceFrom.buildings) {
        for (var buildingId in nextAgeBalance.advanceFrom.buildings) {
          var buildingCurrent = GameState.getBuildingCount(buildingId);
          var buildingTarget = nextAgeBalance.advanceFrom.buildings[buildingId];
          var buildingEntity = GameRegistry.getEntity(buildingId);
          var buildingMet = buildingCurrent >= buildingTarget;
          if (!buildingMet) canAdvance = false;
          progressItems.push({
            label: buildingEntity ? buildingEntity.name : buildingId,
            current: buildingCurrent,
            target: buildingTarget,
            met: buildingMet,
            isBuilding: true
          });
        }
      }

      html += '<div class="panel-section emphasis">';
      html += '<div class="section-header">';
      html += '<div><div class="section-kicker">Main Objective</div><div class="section-title">Advance to ' + escapeHtml(nextAge.entity.name) + '</div><div class="section-copy">Fill every bar below to complete the current age milestone.</div></div>';
      html += '<div class="section-action-group">';
      html += '<span class="status-chip ' + (canAdvance ? 'ready' : 'pending') + '">' + (canAdvance ? 'Ready now' : 'In progress') + '</span>';
      html += '<button class="btn ' + (canAdvance ? 'btn-primary' : 'btn-secondary') + '" onclick="GameActions.advanceAge(\'' + nextAge.entity.id + '\')"' + (canAdvance ? '' : ' disabled') + '>Advance</button>';
      html += '</div></div>';

      html += '<div class="progress-list">';
      progressItems.forEach(function(item) {
        var percent = item.target > 0 ? Math.min(100, (item.current / item.target) * 100) : 100;
        html += '<div class="progress-item">';
        html += '<div class="progress-item-top"><span>' + escapeHtml(item.label) + '</span><span class="progress-value">' + Math.floor(item.current) + '/' + item.target + '</span></div>';
        html += '<div class="progress-track"><div class="progress-fill' + (item.met ? ' ready' : '') + '" style="width:' + percent + '%"></div></div>';
        html += '</div>';
      });
      html += '</div></div>';
    } else {
      html += '<div class="panel-section emphasis">';
      html += '<div class="section-header">';
      html += '<div><div class="section-kicker">Main Objective</div><div class="section-title">Current Content Cleared</div><div class="section-copy">You have reached the end of the current age progression track.</div></div>';
      html += '<div class="section-action-group"><span class="status-chip ready">Complete</span></div>';
      html += '</div></div>';
    }

    html += '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div><div class="section-kicker">Settlement</div><div class="section-title">Built Structures</div><div class="section-copy">A quick view of how your current economy footprint is distributed.</div></div>';
    html += '</div>';

    if (buildingEntries.length > 0) {
      html += '<div class="summary-list">';
      html += '<div class="summary-row total"><span>Total buildings</span><span class="summary-value">' + totalBuildings + '</span></div>';
      buildingEntries.slice(0, 6).forEach(function(entry) {
        html += '<div class="summary-row"><span>' + escapeHtml(entry.name) + '</span><span class="summary-value">x' + entry.count + '</span></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">No buildings placed yet.</div>';
    }
    html += '</div>';

    if (nextUnlocks.length > 0) {
      html += '<div class="panel-section">';
      html += '<div class="section-header">';
      html += '<div><div class="section-kicker">Look Ahead</div><div class="section-title">Upcoming Unlocks</div><div class="section-copy">These are the closest content unlocks based on current progress.</div></div>';
      html += '</div>';
      html += '<div class="unlock-list">';
      nextUnlocks.slice(0, 4).forEach(function(item) {
        var percent = Math.round(item.progress.percent * 100);
        var hint = describeUnlockProgress(item.progress);
        html += '<div class="unlock-card">';
        html += '<div class="unlock-name">' + escapeHtml(item.entity.name) + '</div>';
        html += '<div class="unlock-meta">' + percent + '% ready' + (hint ? ' • ' + escapeHtml(hint) : '') + '</div>';
        html += '<div class="progress-track compact"><div class="progress-fill" style="width:' + percent + '%"></div></div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    html += '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div><div class="section-kicker">Session</div><div class="section-title">Utility Actions</div><div class="section-copy">Autosave is always active. Use Save Now only when you want an immediate checkpoint.</div></div>';
    html += '</div>';
    html += '<div class="management-actions">';
    html += '<button class="btn btn-secondary" onclick="GameActions.saveGame()">Save Now</button>';
    html += '<button class="btn btn-danger" onclick="GameActions.resetGame()">Reset Progress</button>';
    html += '</div>';
    html += '</div>';

    panel.innerHTML = html;
  }

  function renderModalResearch() {
    var panel = document.getElementById('modal-panel-research');
    if (!panel) return;

    var allTechs = GameRegistry.getEntitiesByType('technology');
    if (!allTechs || allTechs.length === 0) {
      panel.innerHTML = '<div class="empty-state">No technologies are available yet.</div>';
      return;
    }

    var readyCards = [];
    var waitingCards = [];
    var lockedCards = [];
    var completeCards = [];

    allTechs.forEach(function(tech) {
      var balance = GameRegistry.getBalance(tech.id);
      var isResearched = window.ResearchSystem && ResearchSystem.isResearched(tech.id);
      var isUnlocked = GameState.isUnlocked(tech.id);
      var canResearch = window.ResearchSystem && ResearchSystem.canResearch(tech.id);

      // Check prerequisites
      var prereqsMet = true;
      var prereqNames = [];
      if (balance && balance.requires) {
        balance.requires.forEach(function(reqId) {
          var reqEntity = GameRegistry.getEntity(reqId);
          prereqNames.push(reqEntity ? reqEntity.name : reqId);
          if (!ResearchSystem.isResearched(reqId)) prereqsMet = false;
        });
      }

      var costInfo = buildResourcePills(balance && balance.researchCost, 'cost');
      var effectsHtml = buildResearchEffectsList(balance && balance.effects);
      var statusClass = 'pending';
      var statusText = 'Need resources';
      var actionHtml = '<button class="btn btn-secondary" disabled>Need resources</button>';

      if (isResearched) {
        statusClass = 'done';
        statusText = 'Completed';
        actionHtml = '<button class="btn btn-secondary" disabled>Completed</button>';
      } else if (canResearch) {
        statusClass = 'ready';
        statusText = 'Ready to research';
        actionHtml = '<button class="btn btn-primary" onclick="GameActions.researchTech(\'' + tech.id + '\')">Research</button>';
      } else if (isUnlocked && prereqsMet) {
        statusClass = 'pending';
        statusText = 'Need resources';
      } else {
        statusClass = 'locked';
        statusText = isUnlocked ? 'Need prerequisites' : 'Locked';
        actionHtml = '<button class="btn btn-secondary" disabled>' + statusText + '</button>';
      }

      var cardHtml = '';
      cardHtml += '<div class="management-card' + (statusClass === 'done' ? ' complete' : (statusClass === 'ready' ? ' ready' : '') ) + (statusClass === 'locked' ? ' locked' : '') + '">';
      cardHtml += '<div class="management-card-top">';
      cardHtml += '<div class="management-card-identity">';
      cardHtml += '<div class="management-icon research">' + getEntityIcon(tech) + '</div>';
      cardHtml += '<div><div class="management-card-name">' + escapeHtml(tech.name) + '</div><div class="management-card-copy">' + escapeHtml(tech.description || '') + '</div></div>';
      cardHtml += '</div>';
      cardHtml += '<div class="management-badges"><span class="management-badge ' + statusClass + '">' + statusText + '</span></div>';
      cardHtml += '</div>';
      cardHtml += buildMetricGrid([
        { label: 'Prerequisites', value: balance && balance.requires ? balance.requires.length : 0 },
        { label: 'Bonuses', value: balance && balance.effects ? Object.keys(balance.effects).length : 0 }
      ]);
      if (effectsHtml) {
        cardHtml += '<div class="management-block"><div class="management-block-label">Effects</div>' + effectsHtml + '</div>';
      }
      if (costInfo.html && !isResearched) {
        cardHtml += '<div class="management-block"><div class="management-block-label">Research Cost</div><div class="resource-pill-row">' + costInfo.html + '</div></div>';
      }
      if (balance && balance.requires && balance.requires.length && !prereqsMet) {
        cardHtml += '<div class="management-block"><div class="management-block-label">Required Tech</div>' + buildTechnologyRequirementChecklist(balance.requires) + '</div>';
      }
      if (!isUnlocked) {
        cardHtml += '<div class="management-block"><div class="management-block-label">Unlock Path</div>' + buildRequirementChecklist(tech) + '</div>';
      }
      cardHtml += '<div class="card-actions">' + actionHtml + '</div>';
      cardHtml += '</div>';

      if (isResearched) {
        completeCards.push(cardHtml);
      } else if (canResearch) {
        readyCards.push(cardHtml);
      } else if (!isUnlocked || !prereqsMet) {
        lockedCards.push(cardHtml);
      } else {
        waitingCards.push(cardHtml);
      }
    });

    var html = '';
    html += '<div class="panel-section">';
    html += '<div class="section-header"><div><div class="section-kicker">Knowledge Track</div><div class="section-title">Research Overview</div><div class="section-copy">Prioritize immediate upgrades, track blocked technology, and review the bonuses you have already secured.</div></div></div>';
    html += '<div class="summary-list">';
    html += '<div class="summary-row"><span>Ready to research</span><span class="summary-value">' + readyCards.length + '</span></div>';
    html += '<div class="summary-row"><span>Waiting</span><span class="summary-value">' + waitingCards.length + '</span></div>';
    html += '<div class="summary-row total"><span>Completed</span><span class="summary-value">' + completeCards.length + '</span></div>';
    html += '</div></div>';

    if (readyCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Ready Now</div><div class="section-title">Immediate Upgrades</div><div class="section-copy">These technologies can be researched right now with your current stockpile.</div></div></div><div class="management-grid">' + readyCards.join('') + '</div></div>';
    }

    if (waitingCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Waiting</div><div class="section-title">Need More Resources</div><div class="section-copy">The tech is unlocked and all prerequisites are met, but the research cost is still out of reach.</div></div></div><div class="management-grid">' + waitingCards.join('') + '</div></div>';
    }

    if (lockedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Blocked</div><div class="section-title">Locked Technology</div><div class="section-copy">These upgrades still need an unlock condition or prerequisite tech before you can invest in them.</div></div></div><div class="management-grid">' + lockedCards.join('') + '</div></div>';
    }

    if (completeCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">Archive</div><div class="section-title">Completed Research</div><div class="section-copy">Permanent bonuses already active across your settlement.</div></div></div><div class="management-grid">' + completeCards.join('') + '</div></div>';
    }

    panel.innerHTML = html;
  }

  return {
    init: init,
    renderAll: renderAll,
    switchTab: switchTab,
    closePanels: closePanels,
    renderActivePanel: renderActivePanel,
    showNotification: showNotification,
    showSuccess: showSuccess,
    showError: showError,
    showFloatingText: showFloatingText,
    showDamageNumber: showDamageNumber,
    selectInstance: selectInstance,
    setHoveredInstance: setHoveredInstance,
    confirmDestroy: confirmDestroy,
    closeInspector: closeInspector,
    showObjectHpBar: showObjectHpBar,
    hideObjectHpBar: hideObjectHpBar,
    updateNodeHpBars: updateNodeHpBars,
    updateNodeWorldLabels: updateNodeWorldLabels,
    updateBuildingStorageLabels: updateBuildingStorageLabels,
    toggleProductionPanel: toggleProductionPanel,
    // Modal functions
    toggleModal: toggleModal,
    openModal: openModal,
    closeModal: closeModal,
    isModalActive: function() { return _modalActive; },
    switchModalTab: switchModalTab,
    updateModal: updateModal,
    renderQuickbar: renderQuickbar,
    toggleQuickbarMode: toggleQuickbarMode,
    activateQuickbarSlot: activateQuickbarSlot
  };
  })();
  
  console.log('[HUD] GameHUD defined. Type:', typeof window.GameHUD);
  if (window.GameHUD) {
    console.log('[HUD] ✅ GameHUD exported successfully with methods:', Object.keys(window.GameHUD).join(', '));
  }
} catch (error) {
  console.error('[HUD] ❌ CRITICAL ERROR loading hud.js:', error);
  console.error('[HUD] Stack:', error.stack);
  alert('CRITICAL: HUD.js failed to load!\n\n' + error.message + '\n\nCheck console (F12) for details.');
}
