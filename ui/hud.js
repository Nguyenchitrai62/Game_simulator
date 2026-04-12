window.GameHUD = (function () {
  var _activeTab = null;
  var _notificationTimer = null;
  var _damageNumbers = [];

  function renderAll() {
    renderResources();
    renderPlayerStats();
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

    var atkEl = document.getElementById("stat-atk");
    var defEl = document.getElementById("stat-def");
    var ageEl = document.getElementById("age-badge");

    if (atkEl) atkEl.textContent = "ATK: " + atk;
    if (defEl) defEl.textContent = "DEF: " + def;

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

    // Save info
    var saveEl = document.getElementById("save-info");
    if (saveEl) {
      saveEl.textContent = "v" + window.GAME_MANIFEST.version + " | WASD move | E interact | B build | C craft | I inventory";
    }
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
    document.querySelector('.tab-btn[data-tab="none"]').classList.add("active");
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
      html += '<button class="btn btn-primary" onclick="GameActions.startBuild(\'' + building.id + '\')"' + (canBuy ? '' : ' disabled') + '>Build</button>';
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
      html += '<button class="btn btn-primary" onclick="GameActions.craft(\'' + recipe.id + '\')"' + (info.canCraft ? '' : ' disabled') + '>Craft</button>';
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
  }
  
  function showBuildingInspector(uid) {
    var instance = GameState.getInstance(uid);
    if (!instance) return;
    
    var entity = GameRegistry.getEntity(instance.entityId);
    if (!entity) return;
    
    var inspector = document.getElementById("building-inspector");
    if (!inspector) return;
    
    var balance = GameRegistry.getBalance(instance.entityId);
    var refundText = "";
    
    if (balance && balance.cost) {
      var refundParts = [];
      for (var resId in balance.cost) {
        var amount = Math.floor(balance.cost[resId] * 0.5);
        if (amount > 0) {
          var res = GameRegistry.getEntity(resId);
          refundParts.push(amount + " " + (res ? res.name : resId));
        }
      }
      if (refundParts.length > 0) {
        refundText = "Hoàn trả: " + refundParts.join(", ");
      }
    }
    
    inspector.innerHTML = '' +
      '<div class="card">' +
      '  <div class="card-name">' + escapeHtml(entity.name) + '</div>' +
      '  <div class="card-info">' + escapeHtml(entity.description || '') + '</div>' +
      '  <div class="card-info" style="color:#ffb74d">' + refundText + '</div>' +
      '  <div style="margin-top:8px;">' +
      '    <button class="btn btn-danger" onclick="GameHUD.confirmDestroy(\'' + uid + '\')" title="Xóa building - hoàn trả 50% chi phí">Xóa</button> ' +
      '    <button class="btn btn-secondary" onclick="GameHUD.closeInspector()">Đóng</button>' +
      '  </div>' +
      '</div>';
      
    inspector.classList.add("active");
  }
  
  function confirmDestroy(uid) {
    if (!confirm("Bạn có chắc muốn xóa building này?\nBạn sẽ nhận được 50% chi phí đã bỏ ra.")) {
      return;
    }
    BuildingSystem.destroyBuilding(uid);
    closeInspector();
    showNotification("Đã xóa building.");
  }
  
  function closeInspector() {
    _selectedInstance = null;
    var inspector = document.getElementById("building-inspector");
    if (inspector) inspector.classList.remove("active");
  }
  
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

  return {
    renderAll: renderAll,
    switchTab: switchTab,
    closePanels: closePanels,
    showNotification: showNotification,
    showError: showError,
    showSuccess: showSuccess,
    showFloatingText: showFloatingText,
    showDamageNumber: showDamageNumber,
    selectInstance: selectInstance,
    setHoveredInstance: setHoveredInstance,
    confirmDestroy: confirmDestroy,
    closeInspector: closeInspector,
    toggleProductionPanel: toggleProductionPanel,
    showObjectHpBar: showObjectHpBar,
    hideObjectHpBar: hideObjectHpBar
  };
})();
