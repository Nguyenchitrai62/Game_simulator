console.log('[HUD] Loading hud.js...');

try {
  window.GameHUD = (function () {
    console.log('[HUD] IIFE started');
    var _activeTab = null;
    var _notificationTimer = null;
    var _damageNumbers = [];
  
  function init() {
    // Initialize HUD - placeholder for future initialization
    console.log('[GameHUD] Initialized');
  }

  function renderAll() {
    renderResources();
    renderPlayerStats();
    renderHungerBar();
    renderDayNightClock();
    renderActivePanel();
  }

  var _showProductionPanel = true;
  
  function toggleProductionPanel() {
    _showProductionPanel = !_showProductionPanel;
    renderResources();
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
      var amount = GameState.getResource(res.id);
      var net = stats.net ? stats.net[res.id] : 0;
      
      html += '<div class="resource-item" style="min-width:110px;">';
      html += '<span class="resource-amount">' + Math.floor(amount) + '</span>';
      html += ' <span class="resource-name">' + escapeHtml(res.name) + '</span>';
      
      if (_showProductionPanel) {
        var netStr = "", netColor = "#888";
        if (net > 0.001) {
          netStr = "+" + net.toFixed(1) + "/tick";
          netColor = "#4ecca3";
        } else if (net < -0.001) {
          netStr = net.toFixed(1) + "/tick";
          netColor = "#e94560";
          if (stats.timeLeft && stats.timeLeft[res.id] && stats.timeLeft[res.id] < 60) {
            netStr += " [" + stats.timeLeft[res.id] + " tick]";
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
    html += '<button class="btn btn-small" onclick="GameHUD.toggleProductionPanel()" style="padding:2px 6px;font-size:11px;">' + (_showProductionPanel ? "Ẩn thống kê" : "Hiện thống kê") + '</button>';
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

    var atkEl = document.getElementById("stat-atk");
    var defEl = document.getElementById("stat-def");
    var ageEl = document.getElementById("age-badge");

    if (atkEl) atkEl.textContent = "ATK: " + atk;
    if (defEl) defEl.textContent = "DEF: " + def;
    if (hunger < 20 && atkEl) {
      atkEl.textContent = "ATK: " + atk + " (Slow!)";
    }

    if (ageEl) {
      var ageEntity = GameRegistry.getEntity(GameState.getAge());
      ageEl.textContent = ageEntity ? ageEntity.name : GameState.getAge();
    }

    // Update player HP bar
    var hpFill = document.getElementById("player-hp-fill");
    var hpText = document.getElementById("player-hp-text");
    var hpWrapper = document.getElementById("player-hp-wrapper");

    if (hpFill && hpText) {
      var pct = Math.max(0, (hp / maxHp) * 100);
      hpFill.style.width = pct + "%";
      hpText.textContent = Math.floor(hp) + " / " + maxHp;

      // Color class
      hpFill.classList.remove("hp-warn", "hp-danger");
      if (pct <= 30) {
        hpFill.classList.add("hp-danger");
      } else if (pct <= 60) {
        hpFill.classList.add("hp-warn");
      }

      // Low HP pulse warning
      if (hpWrapper) {
        if (pct <= 30) {
          hpWrapper.classList.add("low-hp");
        } else {
          hpWrapper.classList.remove("low-hp");
        }
      }
    }

    // Save info removed - cleaner UI
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
      text = "Dang an..." + Math.floor(hunger) + "/" + maxHunger;
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

    var buildings = GameRegistry.getEntitiesByType("building");
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
          var has = GameState.hasResource(resId, needed);
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
          var has = GameState.hasResource(resId, needed);
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
          var current = GameState.getResource(resId);
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
    html += '<button class="btn btn-secondary" onclick="GameActions.saveGame()">Save</button> ';
    html += '<button class="btn btn-secondary" onclick="GameActions.resetGame()">Reset</button>';
    html += '</div>';

    panel.innerHTML = html;
  }

  function showNotification(msg, type = "default") {
    var el = document.getElementById("notification");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("show", "error", "success", "warning");
    el.classList.add("show", type);
    if (_notificationTimer) clearTimeout(_notificationTimer);
    _notificationTimer = setTimeout(function () {
      el.classList.remove("show", "error", "success", "warning");
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
          var have = GameState.getResource(resId) || 0;
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
            var have = GameState.getResource(resId) || 0;
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

      fuelHtml = '<div class="inspector-section">' +
        '<div style="font-size:11px;">🔥 Fuel: <span style="color:' + fuelColor + '; font-weight:bold;">' + Math.floor(currentFuel) + '/' + maxFuel + '</span> (' + fuelPct + '%)</div>';

      if (balance.refuelCost) {
        var refuelParts = [];
        var canRefuel = true;
        for (var resId in balance.refuelCost) {
          var needed = balance.refuelCost[resId];
          var have = GameState.getResource(resId);
          var res = GameRegistry.getEntity(resId);
          var resName = res ? res.name : resId;
          var color = have >= needed ? "#4ecca3" : "#e63946";
          if (have < needed) canRefuel = false;
          refuelParts.push('<span style="color:' + color + '">' + needed + ' ' + escapeHtml(resName) + '</span>');
        }
        fuelHtml += '<div style="color:#888; font-size:10px; margin-top:2px;">Refuel: ' + refuelParts.join(", ") + '</div>';
        fuelHtml += '<button class="btn btn-secondary" style="margin-top:4px; font-size:10px; padding:2px 8px;" onclick="GameActions.refuel(\'' + uid + '\')" ' + (canRefuel ? '' : 'disabled') + '>Refuel</button>';
      }
      fuelHtml += '</div>';
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
      var rangeParts = [];
      if (sR > 0) rangeParts.push('<span style="color:#00ff88;">Harvest: ' + sR + '</span>');
      if (tR > 0) rangeParts.push('<span style="color:#4488ff;">Transfer: ' + tR + '</span>');
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
    if (!confirm("Bạn có chắc muốn xóa building này?\nBạn sẽ nhận được 50% chi phí đã bỏ ra.")) {
      return;
    }
    if (window.RangeIndicator && RangeIndicator.getActiveUid() === uid) {
      RangeIndicator.hide();
    }
    BuildingSystem.destroyBuilding(uid);
    closeInspector();
    showNotification("Đã xóa building.");
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

  function showObjectHpBar(objData) {
    var el = document.getElementById("object-hp-bar");
    if (!el) {
      el = document.createElement("div");
      el.id = "object-hp-bar";
      el.style.cssText = 'position:fixed; width:60px; z-index:20; pointer-events:none; text-align:center;';
      el.innerHTML = '<div style="font-size:10px; color:#aaa; margin-bottom:2px;"></div><div style="height:4px; background:#0f3460; border-radius:2px; overflow:hidden;"><div style="height:100%; background:#4ecca3; border-radius:2px; transition:width 0.2s;"></div></div>';
      document.body.appendChild(el);
    }

    var pos = GameScene.worldToScreen(new THREE.Vector3(objData.worldX, 1.5, objData.worldZ));
    if (!pos) { el.style.display = "none"; return; }

    var pct = Math.max(0, (objData.hp / objData.maxHp) * 100);
    el.style.left = (pos.x - 30) + "px";
    el.style.top = pos.y + "px";
    el.style.display = "block";

    var label = el.querySelector("div");
    if (label) label.textContent = objData.hp + "/" + objData.maxHp;

    var fill = el.querySelector("div > div > div");
    if (fill) {
      fill.style.width = pct + "%";
      fill.style.background = pct > 60 ? "#4ecca3" : pct > 30 ? "#f0a500" : "#e94560";
    }
  }

  function hideObjectHpBar() {
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
      
      var nodeType = nodeData.node.type || 'Unknown';
      var nodeName = nodeType.replace('node.', '').replace('_', ' ');
      nodeName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
      
      // HP bar positioned directly on the node
      html += '<div class="node-hp-bar" style="position:fixed; left:' + (x - 30) + 'px; top:' + (y - 10) + 'px; width:60px; text-align:center; pointer-events:none; z-index:15;">';
      html += '<div style="font-size:9px; color:#fff; text-shadow: 1px 1px 2px #000; margin-bottom:2px;">' + Math.ceil(nodeData.currentHp) + '/' + nodeData.maxHp + '</div>';
      html += '<div style="height:4px; background:#0f3460; border-radius:2px; overflow:hidden; border:1px solid rgba(0,0,0,0.3);"><div class="hp-bar-fill ' + healthClass + '" style="width:' + percent + '%; height:100%; transition:width 0.2s;"></div></div>';
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
      if (!balance || !balance.storageCapacity) continue;

      var storageCapacity = GameState.getStorageCapacity(uid);
      if (storageCapacity <= 0) continue;

      var storageUsed = GameState.getStorageUsed(uid);
      var pct = storageCapacity > 0 ? Math.floor((storageUsed / storageCapacity) * 100) : 0;
      var barColor = pct >= 90 ? '#e94560' : pct >= 70 ? '#f0a500' : '#4ecca3';

      // Calculate screen position
      var worldPos = new THREE.Vector3(inst.x, 1.3, inst.z);
      var screenPos = worldPos.clone().project(camera);

      if (screenPos.z > 1) continue;

      var x = (screenPos.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
      var y = (-screenPos.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top;

      html += '<div style="position:fixed; left:' + x + 'px; top:' + y + 'px; transform:translate(-50%, -50%); pointer-events:none; z-index:15; text-align:center;">';

      // Storage bar - larger and more visible
      html += '<div style="width:56px; height:8px; background:rgba(15,52,96,0.9); border-radius:4px; overflow:hidden; border:1px solid rgba(78,204,163,0.4); margin:0 auto; box-shadow:0 1px 4px rgba(0,0,0,0.3);">';
      html += '<div style="width:' + pct + '%; height:100%; background:' + barColor + '; border-radius:3px; transition:width 0.3s;"></div>';
      html += '</div>';

      // Text - bigger and bolder
      if (pct >= 100) {
        html += '<div style="font-size:9px; color:#e94560; text-shadow:0 1px 3px #000; margin-top:2px; font-weight:bold;">FULL</div>';
      } else if (pct > 0) {
        html += '<div style="font-size:9px; color:#ddd; text-shadow:0 1px 3px #000; margin-top:2px; font-weight:bold;">' + storageUsed + '/' + storageCapacity + '</div>';
      } else {
        html += '<div style="font-size:8px; color:#888; text-shadow:0 1px 3px #000; margin-top:2px;">0/' + storageCapacity + '</div>';
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
      renderModalPanel();
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
      updateCharacterEquipment();
      renderModalLeftSide();
      renderModalPanel();
    }
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
    var html = '<div class="resources-grid">';

    resources.forEach(function(res) {
      if (!GameState.isUnlocked(res.id)) return;
      
      var amount = GameState.getResource(res.id);
      var net = stats.net ? stats.net[res.id] : 0;
      
      var netStr = '';
      var netColor = '#888';
      if (net > 0.001) {
        netStr = '+' + net.toFixed(1) + '/tick';
        netColor = '#4ecca3';
      } else if (net < -0.001) {
        netStr = net.toFixed(1) + '/tick';
        netColor = '#e94560';
      }

      html += '<div class="resource-card">';
      html += '<div class="resource-card-icon">💎</div>';
      html += '<div class="resource-card-info">';
      html += '<div class="resource-card-name">' + escapeHtml(res.name) + '</div>';
      html += '<div class="resource-card-amount">' + Math.floor(amount) + '</div>';
      if (netStr) {
        html += '<div style="font-size:11px;color:' + netColor + ';">' + netStr + '</div>';
      }
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';
    panel.innerHTML = html;
  }

  function renderModalBuild() {
    var panel = document.getElementById('modal-panel-build');
    if (!panel) return;

    var buildings = GameRegistry.getEntitiesByType('building');
    var html = '';

    buildings.forEach(function(building) {
      var isUnlocked = GameState.isUnlocked(building.id);
      
      if (!isUnlocked) {
        html += '<div class="card" style="opacity: 0.5;">';
        html += '<span style="position:absolute; top:8px; right:12px; font-size:18px;">🔒</span>';
        html += '<div><div class="card-name">' + escapeHtml(building.name) + '</div>';
        html += '<div class="card-info">' + escapeHtml(building.description || '') + '</div>';
        html += buildUnlockConditionsHtml(building);
        html += '</div>';
        html += '<button class="btn btn-primary" disabled>🔒 Locked</button>';
        html += '</div>';
        return;
      }

      var balance = GameRegistry.getBalance(building.id);
      var count = GameState.getBuildingCount(building.id);
      var canBuy = true;

      html += '<div class="card">';
      html += '<div><div class="card-name">' + escapeHtml(building.name);
      if (count > 0) html += ' (x' + count + ')';
      html += '</div>';
      html += '<div class="card-info">' + escapeHtml(building.description || '') + '</div>';

      if (balance && balance.cost) {
        html += '<div class="card-cost">Cost: ';
        var parts = [];
        for (var resId in balance.cost) {
          var resEntity = GameRegistry.getEntity(resId);
          var name = resEntity ? resEntity.name : resId;
          var needed = balance.cost[resId];
          var has = GameState.hasResource(resId, needed);
          if (!has) canBuy = false;
          parts.push('<span class="' + (has ? 'cost-ok' : 'cost-lack') + '">' + name + ':' + needed + '</span>');
        }
        html += parts.join(' ') + '</div>';
      }

      html += '</div>';
      html += '<button class="btn btn-primary" onclick="BuildingSystem.enterBuildMode(\'' + building.id + '\'); GameHUD.closeModal();"' + (canBuy ? '' : ' disabled') + '>Build</button>';
      html += '</div>';
    });

    panel.innerHTML = html || '<div class="card">No buildings available.</div>';
  }

  function renderModalCraft() {
    var panel = document.getElementById('modal-panel-craft');
    if (!panel) return;

    var recipes = CraftSystem.getAllRecipes();
    var html = '';

    recipes.forEach(function(recipe) {
      var isUnlocked = GameState.isUnlocked(recipe.id);
      
      if (!isUnlocked) {
        html += '<div class="card" style="opacity: 0.5;">';
        html += '<span style="position:absolute; top:8px; right:12px; font-size:18px;">🔒</span>';
        html += '<div><div class="card-name">' + escapeHtml(recipe.name) + '</div>';
        html += '<div class="card-info">' + escapeHtml(recipe.description || '') + '</div>';
        html += buildUnlockConditionsHtml(recipe);
        html += '</div>';
        html += '<button class="btn btn-primary" disabled>🔒 Locked</button>';
        html += '</div>';
        return;
      }

      var info = CraftSystem.getRecipeInfo(recipe.id);
      var balance = info.balance;
      var canCraft = info.canCraft;

      html += '<div class="card">';
      html += '<div><div class="card-name">' + escapeHtml(recipe.name) + '</div>';
      html += '<div class="card-info">' + escapeHtml(recipe.description || '') + '</div>';

      if (balance && balance.input) {
        html += '<div class="card-cost">Input: ';
        var parts = [];
        for (var resId in balance.input) {
          var entity = GameRegistry.getEntity(resId);
          var name = entity ? entity.name : resId;
          var needed = balance.input[resId];
          var has = GameState.hasResource(resId, needed);
          parts.push('<span class="' + (has ? 'cost-ok' : 'cost-lack') + '">' + name + ':' + needed + '</span>');
        }
        html += parts.join(' ') + '</div>';
      }

      if (balance && balance.output) {
        html += '<div class="card-cost" style="color:#4ecca3">Output: ';
        var parts = [];
        for (var resId in balance.output) {
          var entity = GameRegistry.getEntity(resId);
          var name = entity ? entity.name : resId;
          parts.push(name + ' x' + balance.output[resId]);
        }
        html += parts.join(', ') + '</div>';
      }

      html += '</div>';
      
      // Check if output is equipment and already in inventory
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
            // Check if already equipped in the right slot
            var player = GameState.getPlayer();
            if (player.equipped[entity.slot] === resId) {
              isEquipped = true;
            }
            break;
          }
        }
      }

      if (isEquipped) {
        // Already equipped - show disabled button
        html += '<button class="btn btn-secondary" disabled style="opacity:0.6;">Equipped</button>';
      } else if (hasInInventory && outputEquipmentId) {
        // Show "Use" button instead of "Craft"
        html += '<button class="btn btn-success" onclick="GameActions.equip(\'' + outputEquipmentId + '\'); GameHUD.updateModal();">Use</button>';
      } else {
        // Show "Craft" button
        html += '<button class="btn btn-primary" onclick="GameActions.craft(\'' + recipe.id + '\')"' + (canCraft ? '' : ' disabled') + '>Craft</button>';
      }
      
      html += '</div>';
    });

    panel.innerHTML = html || '<div class="card">No recipes available.</div>';
  }

  function renderModalStats() {
    var panel = document.getElementById('modal-panel-stats');
    if (!panel) return;

    var player = GameState.getPlayer();
    var maxHp = GameState.getPlayerMaxHp();
    var attack = GameState.getPlayerAttack();
    var defense = GameState.getPlayerDefense();
    var speed = GameState.getPlayerSpeed ? GameState.getPlayerSpeed() : 3;

    var html = '<div class="stats-grid">';
    
    // HP
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
    html += '</div>';
    html += '</div>';

    // Attack
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
    html += '</div>';
    html += '</div>';

    // Defense
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
      var armorBalance = GameRegistry.getBalance(armorId);
      if (armorBalance && armorBalance.stats && armorBalance.stats.defense) {
        html += '<br>Armor: +' + armorBalance.stats.defense;
      }
    }
    html += '</div>';
    html += '</div>';

    // Speed
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
    html += '</div>';
    html += '</div>';

    html += '</div>';

    panel.innerHTML = html;
  }

  function renderModalResearch() {
    var panel = document.getElementById('modal-panel-research');
    if (!panel) return;

    var allTechs = GameRegistry.getEntitiesByType('technology');
    if (!allTechs || allTechs.length === 0) {
      panel.innerHTML = '<div class="card">No technologies available.</div>';
      return;
    }

    var html = '<div style="margin-bottom:8px; color:#aaa; font-size:11px;">Nghiên cứu công nghệ để nâng cấp toàn bộ.</div>';

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

      // Cost display
      var costHtml = '';
      if (balance && balance.researchCost) {
        var costParts = [];
        for (var resId in balance.researchCost) {
          var needed = balance.researchCost[resId];
          var have = GameState.getResource(resId) || 0;
          var res = GameRegistry.getEntity(resId);
          var resName = res ? res.name : resId;
          var color = have >= needed ? '#4ecca3' : '#e63946';
          costParts.push('<span style="color:' + color + '">' + needed + ' ' + escapeHtml(resName) + '</span>');
        }
        costHtml = costParts.join(', ');
      }

      // Effects display
      var effectsHtml = '';
      if (balance && balance.effects) {
        var effectParts = [];
        if (balance.effects.harvestSpeedBonus) effectParts.push('+' + Math.round(balance.effects.harvestSpeedBonus * 100) + '% harvest speed');
        if (balance.effects.productionBonus) effectParts.push('+' + Math.round(balance.effects.productionBonus * 100) + '% production');
        if (balance.effects.storageBonus) effectParts.push('+' + Math.round(balance.effects.storageBonus * 100) + '% storage');
        if (balance.effects.npcSpeedBonus) effectParts.push('+' + Math.round(balance.effects.npcSpeedBonus * 100) + '% NPC speed');
        effectsHtml = effectParts.join(', ');
      }

      // Card styling based on state
      var borderColor, opacity;
      if (isResearched) {
        borderColor = '#4ecca3';
        opacity = '1';
      } else if (canResearch) {
        borderColor = '#f0a500';
        opacity = '1';
      } else if (isUnlocked && prereqsMet) {
        borderColor = '#888';
        opacity = '0.9';
      } else {
        borderColor = '#444';
        opacity = '0.5';
      }

      html += '<div class="card" style="border-left:3px solid ' + borderColor + '; opacity:' + opacity + '; margin-bottom:6px;">';

      // Title row
      html += '<div style="display:flex; justify-content:space-between; align-items:center;">';
      html += '<div class="card-name" style="font-size:12px;">';
      if (isResearched) html += '✅ ';
      html += escapeHtml(tech.name) + '</div>';

      // Status badge
      if (isResearched) {
        html += '<span style="color:#4ecca3; font-size:10px; background:#1a3a2a; padding:2px 6px; border-radius:3px;">Done</span>';
      } else if (canResearch) {
        html += '<button class="btn btn-primary" style="font-size:10px; padding:3px 10px;" onclick="GameActions.researchTech(\'' + tech.id + '\')">Research</button>';
      } else if (!isUnlocked) {
        html += '<span style="color:#666; font-size:10px;">Locked</span>';
      } else if (!prereqsMet) {
        html += '<span style="color:#e63946; font-size:10px;">Need: ' + prereqNames.join(', ') + '</span>';
      } else {
        html += '<span style="color:#888; font-size:10px;">Need resources</span>';
      }
      html += '</div>';

      // Description
      html += '<div class="card-info" style="margin-top:4px;">' + escapeHtml(tech.description || '') + '</div>';

      // Effects
      if (effectsHtml) {
        html += '<div style="color:#ffb74d; font-size:10px; margin-top:4px;">⚡ ' + effectsHtml + '</div>';
      }

      // Cost
      if (costHtml && !isResearched) {
        html += '<div style="color:#aaa; font-size:10px; margin-top:4px;">Cost: ' + costHtml + '</div>';
      }

      html += '</div>';
    });

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
    updateBuildingStorageLabels: updateBuildingStorageLabels,
    toggleProductionPanel: toggleProductionPanel,
    // Modal functions
    toggleModal: toggleModal,
    openModal: openModal,
    closeModal: closeModal,
    isModalActive: function() { return _modalActive; },
    switchModalTab: switchModalTab,
    updateModal: updateModal
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
