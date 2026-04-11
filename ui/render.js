window.GameUI = (function () {
  var _activeTab = "buildings";
  var _notification = null;
  var _notificationTimer = null;

  function renderAll() {
    renderResources();
    renderAge();
    renderTabContent();
    renderSaveIndicator();
  }

  function renderResources() {
    var container = document.getElementById("resource-bar");
    if (!container) return;

    var resources = GameRegistry.getEntitiesByType("resource");
    var html = "";

    resources.forEach(function (res) {
      if (!GameState.isUnlocked(res.id)) return;
      var amount = GameState.getResource(res.id);
      html += '<div class="resource-item">';
      html += '<span class="resource-name">' + escapeHtml(res.name) + '</span>';
      html += '<span class="resource-amount">' + formatNumber(amount) + '</span>';
      html += '</div>';
    });

    container.innerHTML = html;
  }

  function renderAge() {
    var container = document.getElementById("age-indicator");
    if (!container) return;

    var ageEntity = GameRegistry.getEntity(GameState.getAge());
    var name = ageEntity ? ageEntity.name : GameState.getAge();
    container.textContent = name + " - v" + window.GAME_MANIFEST.version;

    var advanceContainer = document.getElementById("age-advance");
    if (!advanceContainer) return;

    var ages = GameRegistry.getEntitiesByType("age");
    var nextAge = null;
    for (var i = 0; i < ages.length; i++) {
      if (!GameState.isUnlocked(ages[i].id) && ages[i].id !== GameState.getAge()) {
        nextAge = ages[i];
        break;
      }
    }

    if (!nextAge) {
      advanceContainer.innerHTML = "";
      return;
    }

    var balance = GameRegistry.getBalance(nextAge.id);
    if (!balance || !balance.advanceFrom) {
      advanceContainer.innerHTML = "";
      return;
    }

    var canAdvance = true;
    var conditions = balance.advanceFrom;
    var html = '<div class="advance-panel">';
    html += '<span class="advance-label">Next: ' + escapeHtml(nextAge.name) + '</span>';

    if (conditions.resources) {
      for (var resId in conditions.resources) {
        var resEntity = GameRegistry.getEntity(resId);
        var resName = resEntity ? resEntity.name : resId;
        var current = GameState.getResource(resId);
        var target = conditions.resources[resId];
        var met = current >= target;
        if (!met) canAdvance = false;
        html += ' <span class="' + (met ? 'cost-ok' : 'cost-lack') + '">' + resName + ':' + Math.floor(current) + '/' + target + '</span>';
      }
    }

    if (conditions.buildings) {
      for (var bldId in conditions.buildings) {
        var bldEntity = GameRegistry.getEntity(bldId);
        var bldName = bldEntity ? bldEntity.name : bldId;
        var current = GameState.getBuildingCount(bldId);
        var target = conditions.buildings[bldId];
        var met = current >= target;
        if (!met) canAdvance = false;
        html += ' <span class="' + (met ? 'cost-ok' : 'cost-lack') + '">' + bldName + ':' + current + '/' + target + '</span>';
      }
    }

    html += ' <button class="btn btn-advance" onclick="GameActions.advanceAge(\'' + nextAge.id + '\')"' + (canAdvance ? '' : ' disabled') + '>Advance</button>';
    html += '</div>';

    advanceContainer.innerHTML = html;
  }

  function renderTabContent() {
    var container = document.getElementById("tab-content");
    if (!container) return;

    switch (_activeTab) {
      case "buildings":
        renderBuildings(container);
        break;
      case "crafting":
        renderCrafting(container);
        break;
      case "progress":
        renderProgress(container);
        break;
      default:
        renderBuildings(container);
    }
  }

  function renderBuildings(container) {
    var buildings = GameRegistry.getEntitiesByType("building");
    var html = '<div class="section">';

    html += '<h2>Gather Resources</h2>';
    html += '<div class="gather-buttons">';
    var gatherActions = [
      { id: "gather.wood", name: "Gather Wood", key: "resource.wood" },
      { id: "gather.stone", name: "Gather Stone", key: "resource.stone" },
      { id: "gather.food", name: "Gather Food", key: "resource.food" }
    ];
    gatherActions.forEach(function (action) {
      var resEntity = GameRegistry.getEntity(action.key);
      if (!resEntity || !GameState.isUnlocked(action.key)) return;
      html += '<button class="btn btn-gather" onclick="GameActions.gather(\'' + action.id + '\')">' + action.name + '</button>';
    });
    html += '</div>';

    html += '<h2>Buildings</h2>';
    html += '<div class="building-list">';

    buildings.forEach(function (building) {
      if (!GameState.isUnlocked(building.id)) return;

      var balance = GameRegistry.getBalance(building.id);
      var count = GameState.getBuildingCount(building.id);
      var canBuy = true;

      html += '<div class="building-card">';
      html += '<div class="building-header">';
      html += '<span class="building-name">' + escapeHtml(building.name) + '</span>';
      html += '<span class="building-count">x' + count + '</span>';
      html += '</div>';
      html += '<div class="building-desc">' + escapeHtml(building.description || '') + '</div>';

      if (balance && balance.cost) {
        html += '<div class="building-cost">Cost: ';
        var costParts = [];
        for (var resId in balance.cost) {
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          var needed = balance.cost[resId];
          var current = GameState.getResource(resId);
          var hasEnough = current >= needed;
          if (!hasEnough) canBuy = false;
          costParts.push('<span class="' + (hasEnough ? 'cost-ok' : 'cost-lack') + '">' + resName + ': ' + needed + '</span>');
        }
        html += costParts.join(', ') + '</div>';
      }

      if (balance && balance.produces) {
        html += '<div class="building-produces">Produces: ';
        var prodParts = [];
        for (var resId in balance.produces) {
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          prodParts.push(resName + ': +' + balance.produces[resId] + '/s');
        }
        html += prodParts.join(', ') + '</div>';
      }

      if (balance && balance.consumesPerTick) {
        html += '<div class="building-cost">Consumes: ';
        var consParts = [];
        for (var resId in balance.consumesPerTick) {
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          consParts.push(resName + ': -' + balance.consumesPerTick[resId] + '/s');
        }
        html += consParts.join(', ') + ' (per building)</div>';
      }

      html += '<button class="btn btn-buy" onclick="GameActions.buyBuilding(\'' + building.id + '\')"' + (canBuy ? '' : ' disabled') + '>Buy</button>';
      html += '</div>';
    });

    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderCrafting(container) {
    var recipes = CraftSystem.getAvailableRecipes();
    var html = '<div class="section">';
    html += '<h2>Crafting</h2>';

    if (recipes.length === 0) {
      html += '<p class="empty-msg">No recipes available yet. Unlock more to start crafting.</p>';
    }

    html += '<div class="recipe-list">';

    recipes.forEach(function (recipe) {
      var info = CraftSystem.getRecipeInfo(recipe.id);
      var balance = info.balance;

      html += '<div class="recipe-card">';
      html += '<div class="recipe-name">' + escapeHtml(recipe.name) + '</div>';
      html += '<div class="recipe-desc">' + escapeHtml(recipe.description || '') + '</div>';

      if (balance && balance.input) {
        html += '<div class="recipe-input">Input: ';
        var inputParts = [];
        for (var resId in balance.input) {
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          var needed = balance.input[resId];
          var current = GameState.getResource(resId);
          var hasEnough = current >= needed;
          inputParts.push('<span class="' + (hasEnough ? 'cost-ok' : 'cost-lack') + '">' + resName + ': ' + needed + '</span>');
        }
        html += inputParts.join(', ') + '</div>';
      }

      if (balance && balance.output) {
        html += '<div class="recipe-output">Output: ';
        var outputParts = [];
        for (var resId in balance.output) {
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          outputParts.push(resName + ': +' + balance.output[resId]);
        }
        html += outputParts.join(', ') + '</div>';
      }

      html += '<button class="btn btn-craft" onclick="GameActions.craft(\'' + recipe.id + '\')"' + (info.canCraft ? '' : ' disabled') + '>Craft</button>';
      html += '</div>';
    });

    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderProgress(container) {
    var html = '<div class="section">';
    html += '<h2>Progress</h2>';

    var unlocked = GameState.getUnlocked();
    var nextUnlocks = UnlockSystem.getNextUnlocks();

    html += '<div class="progress-section">';
    html += '<h3>Unlocked (' + unlocked.length + ')</h3>';
    html += '<div class="unlocked-list">';
    unlocked.forEach(function (id) {
      var entity = GameRegistry.getEntity(id);
      if (!entity) return;
      html += '<span class="unlocked-badge">' + escapeHtml(entity.name) + '</span>';
    });
    html += '</div></div>';

    html += '<div class="progress-section">';
    html += '<h3>Next to Unlock</h3>';
    html += '<div class="next-list">';

    if (nextUnlocks.length === 0) {
      html += '<p class="empty-msg">All current content unlocked!</p>';
    }

    nextUnlocks.slice(0, 8).forEach(function (item) {
      var entity = item.entity;
      var progress = item.progress;
      var pct = Math.round(progress.percent * 100);

      html += '<div class="next-item">';
      html += '<div class="next-name">' + escapeHtml(entity.name) + ' (' + pct + '%)</div>';
      html += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>';

      progress.details.forEach(function (detail) {
        if (!detail.met) {
          if (detail.type === "resource") {
            var resEntity = GameRegistry.getEntity(detail.id);
            var name = resEntity ? resEntity.name : detail.id;
            html += '<div class="progress-detail">Need ' + name + ': ' + detail.current + '/' + detail.target + '</div>';
          } else if (detail.type === "building") {
            var bldEntity = GameRegistry.getEntity(detail.id);
            var name = bldEntity ? bldEntity.name : detail.id;
            html += '<div class="progress-detail">Need ' + name + ': ' + detail.current + '/' + detail.target + '</div>';
          }
        }
      });

      html += '</div>';
    });

    html += '</div></div>';
    html += '</div>';
    container.innerHTML = html;
  }

  function renderSaveIndicator() {
    var container = document.getElementById("save-indicator");
    if (!container) return;

    var info = GameStorage.getSaveInfo();
    if (info && info.lastSave) {
      var seconds = Math.floor((Date.now() - info.lastSave) / 1000);
      if (seconds < 5) {
        container.textContent = "Saved just now";
      } else if (seconds < 60) {
        container.textContent = "Saved " + seconds + "s ago";
      } else {
        container.textContent = "Saved " + Math.floor(seconds / 60) + "m ago";
      }
    } else {
      container.textContent = "Not saved yet";
    }
  }

  function showNotification(msg) {
    var container = document.getElementById("notification");
    if (!container) return;

    container.textContent = msg;
    container.classList.add("show");

    if (_notificationTimer) clearTimeout(_notificationTimer);
    _notificationTimer = setTimeout(function () {
      container.classList.remove("show");
    }, 3000);
  }

  function switchTab(tabName) {
    _activeTab = tabName;
    var tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(function (tab) {
      tab.classList.remove("active");
      if (tab.getAttribute("data-tab") === tabName) {
        tab.classList.add("active");
      }
    });
    renderTabContent();
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return Math.floor(n).toString();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  return {
    renderAll: renderAll,
    renderResources: renderResources,
    renderBuildings: renderBuildings,
    renderCrafting: renderCrafting,
    renderProgress: renderProgress,
    showNotification: showNotification,
    switchTab: switchTab,
    formatNumber: formatNumber,
    escapeHtml: escapeHtml
  };
})();
