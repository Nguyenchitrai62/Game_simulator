window.GameHUDModules = window.GameHUDModules || {};

window.GameHUDModules.createModalPanelsModule = function createModalPanelsModule(context) {
  var t = context.t;
  var escapeHtml = context.escapeHtml;
  var getResourceIcon = context.getResourceIcon;
  var getNextAgeObjective = context.getNextAgeObjective;
  var isHudVisible = context.isHudVisible;
  var setModalFocusTarget = context.setModalFocusTarget;
  var clearModalFocusHighlight = context.clearModalFocusHighlight;
  var applyModalFocusTarget = context.applyModalFocusTarget;
  var renderModalHeader = context.renderModalHeader;
  var toggleQuickbarMode = context.toggleQuickbarMode;
  var getModalActive = context.getModalActive;
  var setModalActive = context.setModalActive;
  var getModalTab = context.getModalTab;
  var setModalTab = context.setModalTab;
  var getCharacterCanvas = context.getCharacterCanvas;
  var setCharacterCanvas = context.setCharacterCanvas;

  function toggleModal() {
    if (getModalActive()) {
      closeModal();
    } else {
      openModal();
    }
  }

  function openModal(options) {
    if (!isHudVisible()) return;

    if (typeof options === 'string') {
      options = { tab: options };
    }
    if (options && options.tab) {
      setModalTab(options.tab);
    }
    if (options && options.focusId) {
      setModalFocusTarget(options.tab || getModalTab(), options.focusId);
    }

    setModalActive(true);
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      initCharacterCanvas();
      updateCharacterEquipment();
      renderModalLeftSide();
      switchModalTab(getModalTab());
    }
  }

  function closeModal() {
    setModalActive(false);
    setModalFocusTarget(null, null);
    clearModalFocusHighlight();
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  function switchModalTab(tabName) {
    setModalTab(tabName);
    var activeTab = getModalTab();
    if (activeTab === 'build' || activeTab === 'craft') {
      toggleQuickbarMode(activeTab, true);
    }
    renderModalHeader();

    document.querySelectorAll('.modal-tab').forEach(function(tab) {
      tab.classList.remove('active');
      if (tab.getAttribute('data-tab') === activeTab) {
        tab.classList.add('active');
      }
    });

    document.querySelectorAll('.modal-panel').forEach(function(panel) {
      panel.classList.remove('active');
    });

    var targetPanel = document.getElementById('modal-panel-' + activeTab);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    renderModalPanel();
    applyModalFocusTarget();
  }

  function initCharacterCanvas() {
    var canvas = document.getElementById('character-canvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    setCharacterCanvas(canvas);
    drawCharacter2D();
  }

  function drawCharacter2D() {
    var characterCanvas = getCharacterCanvas();
    if (!characterCanvas) return;

    var ctx = characterCanvas.getContext('2d');
    if (!ctx) return;

    var player = GameState.getPlayer();

    ctx.clearRect(0, 0, 300, 400);

    var centerX = 150;
    var centerY = 200;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 80, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a3a5c';
    ctx.fillRect(centerX - 15, centerY + 20, 12, 35);
    ctx.fillRect(centerX + 3, centerY + 20, 12, 35);

    if (player.equipped.boots) {
      ctx.fillStyle = '#654321';
      ctx.fillRect(centerX - 17, centerY + 48, 16, 12);
      ctx.fillRect(centerX + 1, centerY + 48, 16, 12);
    }

    ctx.fillStyle = '#4488cc';
    ctx.fillRect(centerX - 20, centerY - 25, 40, 50);

    if (player.equipped.armor) {
      ctx.fillStyle = 'rgba(112, 128, 144, 0.8)';
      ctx.fillRect(centerX - 22, centerY - 27, 44, 52);

      ctx.strokeStyle = '#708090';
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - 22, centerY - 27, 44, 52);
    }

    ctx.fillStyle = '#DEB887';
    ctx.fillRect(centerX - 31, centerY - 15, 10, 35);
    ctx.fillRect(centerX + 21, centerY - 15, 10, 35);

    if (player.equipped.offhand) {
      ctx.fillStyle = '#8B7355';
      ctx.beginPath();
      var shieldX = centerX - 40;
      var shieldY = centerY - 10;
      var shieldW = 20;
      var shieldH = 30;
      var shieldR = 5;
      ctx.moveTo(shieldX + shieldR, shieldY);
      ctx.lineTo(shieldX + shieldW - shieldR, shieldY);
      ctx.quadraticCurveTo(shieldX + shieldW, shieldY, shieldX + shieldW, shieldY + shieldR);
      ctx.lineTo(shieldX + shieldW, shieldY + shieldH - shieldR);
      ctx.quadraticCurveTo(shieldX + shieldW, shieldY + shieldH, shieldX + shieldW - shieldR, shieldY + shieldH);
      ctx.lineTo(shieldX + shieldR, shieldY + shieldH);
      ctx.quadraticCurveTo(shieldX, shieldY + shieldH, shieldX, shieldY + shieldH - shieldR);
      ctx.lineTo(shieldX, shieldY + shieldR);
      ctx.quadraticCurveTo(shieldX, shieldY, shieldX + shieldR, shieldY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(centerX - 30, centerY + 5, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (player.equipped.weapon) {
      ctx.fillStyle = '#C0C0C0';
      ctx.fillRect(centerX + 28, centerY - 30, 6, 40);

      ctx.fillStyle = '#8B4513';
      ctx.fillRect(centerX + 23, centerY + 10, 16, 5);

      ctx.beginPath();
      ctx.moveTo(centerX + 28, centerY - 30);
      ctx.lineTo(centerX + 31, centerY - 40);
      ctx.lineTo(centerX + 34, centerY - 30);
      ctx.fill();
    }

    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 45, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX - 6, centerY - 48, 2, 0, Math.PI * 2);
    ctx.arc(centerX + 6, centerY - 48, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 42, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  function updateCharacterEquipment() {
    drawCharacter2D();
  }

  function renderModalPanel() {
    if (!getModalActive()) return;

    switch (getModalTab()) {
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
    if (getModalActive()) {
      renderModalHeader();
      updateCharacterEquipment();
      renderModalLeftSide();
      renderModalPanel();
      applyModalFocusTarget();
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
        'building.watchtower': '🗼',
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

      var equipmentBalance = GameRegistry.getBalance(entity.id);
      var slot = entity.slot || (equipmentBalance && equipmentBalance.slot);
      if (slot === 'weapon') return '⚔️';
      if (slot === 'offhand') return '🛡️';
      if (slot === 'armor') return '🦺';
      if (slot === 'boots') return '👟';
      return '🧰';
    }

    if (entity.type === 'consumable' || entity.type === 'item') return '🔥';
    return '✨';
  }

  function formatBalanceDisplayNumber(value) {
    if (window.GameRegistry && GameRegistry.formatBalanceNumber) {
      return GameRegistry.formatBalanceNumber(value);
    }

    var numericValue = Number(value);
    if (!isFinite(numericValue)) return String(value);
    if (Math.abs(numericValue - Math.round(numericValue)) < 0.0001) {
      return String(Math.round(numericValue));
    }
    return numericValue.toFixed(2).replace(/\.?0+$/, '');
  }

  function getEquipmentStats(equipmentId) {
    if (!equipmentId) return null;
    if (window.GameState && GameState.getEquipmentStats) {
      return GameState.getEquipmentStats(equipmentId);
    }

    var balance = GameRegistry.getBalance(equipmentId) || {};
    var entity = GameRegistry.getEntity(equipmentId) || {};
    return balance.stats || entity.stats || null;
  }

  function getEquipmentStatSummary(equipmentId, options) {
    var stats = getEquipmentStats(equipmentId);
    if (!stats) return '';
    if (window.GameRegistry && GameRegistry.getStatSummary) {
      return GameRegistry.getStatSummary(stats, options);
    }
    return '';
  }

  function getEquipmentSlotLabel(slot) {
    if (slot === 'weapon') return t('hud.equipment.slots.weapon', null, 'Weapon');
    if (slot === 'offhand') return t('hud.equipment.slots.offhand', null, 'Shield');
    if (slot === 'armor') return t('hud.equipment.slots.armor', null, 'Armor');
    if (slot === 'boots') return t('hud.equipment.slots.boots', null, 'Boots');
    return slot || t('hud.equipment.slots.item', null, 'Item');
  }

  function buildEquippedStatBreakdownText(baseValue, statKey) {
    var text = t('hud.stats.base', null, 'Base') + ': ' + formatBalanceDisplayNumber(baseValue);
    var breakdown = (window.GameState && GameState.getEquippedStatBreakdown) ? GameState.getEquippedStatBreakdown(statKey) : [];

    breakdown.forEach(function(entry) {
      var sign = entry.value > 0 ? '+' : '-';
      text += '<br>' + escapeHtml(getEquipmentSlotLabel(entry.slot)) + ': ' + sign + formatBalanceDisplayNumber(Math.abs(entry.value));
    });

    return text;
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
        text = t('hud.requirements.reach', { name: ageEntity ? ageEntity.name : detail.target }, 'Reach {name}');
      } else if (detail.type === 'resource') {
        var resourceEntity = GameRegistry.getEntity(detail.id);
        text = (resourceEntity ? resourceEntity.name : detail.id) + ' ' + Math.floor(detail.current) + '/' + detail.target;
      } else if (detail.type === 'building') {
        var buildingEntity = GameRegistry.getEntity(detail.id);
        text = (buildingEntity ? buildingEntity.name : detail.id) + ' ' + detail.current + '/' + detail.target;
      } else if (detail.type === 'technology') {
        var techEntity = GameRegistry.getEntity(detail.id);
        text = t('hud.requirements.research', { name: techEntity ? techEntity.name : detail.id }, 'Research {name}');
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
      html += '<span>' + escapeHtml(t('hud.requirements.research', { name: reqEntity ? reqEntity.name : reqId }, 'Research {name}')) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildResearchEffectsList(effects) {
    if (!effects) return '';

    var effectItems = [];
    if (effects.harvestSpeedBonus) effectItems.push(t('hud.researchEffects.harvestSpeed', { percent: Math.round(effects.harvestSpeedBonus * 100) }, 'Harvest speed +{percent}%'));
    if (effects.productionBonus) effectItems.push(t('hud.researchEffects.production', { percent: Math.round(effects.productionBonus * 100) }, 'Production +{percent}%'));
    if (effects.storageBonus) effectItems.push(t('hud.researchEffects.storage', { percent: Math.round(effects.storageBonus * 100) }, 'Storage +{percent}%'));
    if (effects.npcSpeedBonus) effectItems.push(t('hud.researchEffects.npcSpeed', { percent: Math.round(effects.npcSpeedBonus * 100) }, 'Worker speed +{percent}%'));

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

    var equipContainer = document.getElementById('modal-equipment-slots');
    if (equipContainer) {
      var html = '';

      var weaponId = player.equipped.weapon;
      html += '<div class="equipment-slot ' + (weaponId ? 'has-item' : '') + '" onclick="' + (weaponId ? 'GameActions.unequip(\'weapon\')' : '') + '">';
      html += '<div class="equipment-slot-label">⚔️ ' + escapeHtml(getEquipmentSlotLabel('weapon')) + '</div>';
      if (weaponId) {
        var weaponEntity = GameRegistry.getEntity(weaponId);
        html += '<div class="equipment-slot-item">' + (weaponEntity ? weaponEntity.name : weaponId) + '</div>';
        var weaponStats = getEquipmentStatSummary(weaponId, { shortLabels: true });
        if (weaponStats) html += '<div class="equipment-slot-stats">' + escapeHtml(weaponStats) + '</div>';
      } else {
        html += '<div class="equipment-slot-empty">' + escapeHtml(t('hud.equipment.empty', null, 'Empty')) + '</div>';
      }
      html += '</div>';

      var offhandId = player.equipped.offhand;
      html += '<div class="equipment-slot ' + (offhandId ? 'has-item' : '') + '" onclick="' + (offhandId ? 'GameActions.unequip(\'offhand\')' : '') + '">';
      html += '<div class="equipment-slot-label">🛡️ ' + escapeHtml(getEquipmentSlotLabel('offhand')) + '</div>';
      if (offhandId) {
        var offhandEntity = GameRegistry.getEntity(offhandId);
        html += '<div class="equipment-slot-item">' + (offhandEntity ? offhandEntity.name : offhandId) + '</div>';
        var offhandStats = getEquipmentStatSummary(offhandId, { shortLabels: true });
        if (offhandStats) html += '<div class="equipment-slot-stats">' + escapeHtml(offhandStats) + '</div>';
      } else {
        html += '<div class="equipment-slot-empty">' + escapeHtml(t('hud.equipment.empty', null, 'Empty')) + '</div>';
      }
      html += '</div>';

      var armorId = player.equipped.armor;
      html += '<div class="equipment-slot ' + (armorId ? 'has-item' : '') + '" onclick="' + (armorId ? 'GameActions.unequip(\'armor\')' : '') + '">';
      html += '<div class="equipment-slot-label">🦺 ' + escapeHtml(getEquipmentSlotLabel('armor')) + '</div>';
      if (armorId) {
        var armorEntity = GameRegistry.getEntity(armorId);
        html += '<div class="equipment-slot-item">' + (armorEntity ? armorEntity.name : armorId) + '</div>';
        var armorStats = getEquipmentStatSummary(armorId, { shortLabels: true });
        if (armorStats) html += '<div class="equipment-slot-stats">' + escapeHtml(armorStats) + '</div>';
      } else {
        html += '<div class="equipment-slot-empty">' + escapeHtml(t('hud.equipment.empty', null, 'Empty')) + '</div>';
      }
      html += '</div>';

      var bootsId = player.equipped.boots;
      html += '<div class="equipment-slot ' + (bootsId ? 'has-item' : '') + '" onclick="' + (bootsId ? 'GameActions.unequip(\'boots\')' : '') + '">';
      html += '<div class="equipment-slot-label">👟 ' + escapeHtml(getEquipmentSlotLabel('boots')) + '</div>';
      if (bootsId) {
        var bootsEntity = GameRegistry.getEntity(bootsId);
        html += '<div class="equipment-slot-item">' + (bootsEntity ? bootsEntity.name : bootsId) + '</div>';
        var bootsStats = getEquipmentStatSummary(bootsId, { shortLabels: true });
        if (bootsStats) html += '<div class="equipment-slot-stats">' + escapeHtml(bootsStats) + '</div>';
      } else {
        html += '<div class="equipment-slot-empty">' + escapeHtml(t('hud.equipment.empty', null, 'Empty')) + '</div>';
      }
      html += '</div>';

      equipContainer.innerHTML = html;
    }

    var invContainer = document.getElementById('modal-inventory-grid');
    if (invContainer) {
      var inventoryHtml = '';

      for (var itemId in inventory) {
        if (inventory[itemId] <= 0) continue;
        var entity = GameRegistry.getEntity(itemId);
        if (!entity || (entity.type !== 'equipment' && entity.type !== 'consumable')) continue;

        var onClick = entity.type === 'equipment'
          ? 'onclick="GameActions.equip(\'' + itemId + '\')"'
          : '';
        var cssClass = entity.type === 'consumable' ? 'inv-slot consumable-slot' : 'inv-slot';

        inventoryHtml += '<div class="' + cssClass + '" ' + onClick + '>';
        inventoryHtml += '<div>' + (entity ? entity.name : itemId) + '</div>';
        inventoryHtml += '<div>x' + inventory[itemId] + '</div>';
        var itemSummary = entity.type === 'equipment'
          ? getEquipmentStatSummary(itemId, { shortLabels: true })
          : entity.description;
        if (itemSummary) {
          inventoryHtml += '<div style="font-size:9px;color:#888;">' + escapeHtml(itemSummary) + '</div>';
        }
        inventoryHtml += '</div>';
      }

      if (!inventoryHtml) {
        inventoryHtml = '<div style="grid-column: 1/-1; text-align:center; color:#666; font-size:11px; padding:10px;">' + escapeHtml(t('hud.equipment.noItems', null, 'No items')) + '</div>';
      }

      invContainer.innerHTML = inventoryHtml;
    }
  }

  function renderModalResources() {
    var panel = document.getElementById('modal-panel-resources');
    if (!panel) return;

    var resources = GameRegistry.getEntitiesByType('resource');
    var stats = TickSystem.getResourceStats();
    var html = '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div><div class="section-kicker">' + escapeHtml(t('hud.resourcePanel.snapshotKicker', null, 'Economy Snapshot')) + '</div><div class="section-title">' + escapeHtml(t('hud.resourcePanel.snapshotTitle', null, 'Available Resources')) + '</div><div class="section-copy">' + escapeHtml(t('hud.resourcePanel.snapshotCopy', null, 'These totals reflect everything you can spend right now.')) + '</div></div>';
    html += '</div>';
    html += '<div class="resources-grid">';

    resources.forEach(function(res) {
      if (!GameState.isUnlocked(res.id)) return;

      var localizedResource = GameRegistry.getEntity(res.id) || res;
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
      html += '<div class="resource-card-name">' + escapeHtml(localizedResource.name) + '</div>';
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
    var summaryReadyLabel = t('hud.modal.build.sections.readyCount', null, 'Ready to place');
    var summaryBlockedLabel = t('hud.modal.build.sections.blockedCount', null, 'Need more stock');
    var summaryPlacedLabel = t('hud.modal.build.sections.totalPlaced', null, 'Structures placed');

    buildings.forEach(function(building) {
      var localizedBuilding = GameRegistry.getEntity(building.id) || building;
      var balance = GameRegistry.getBalance(building.id) || {};
      var count = GameState.getBuildingCount(building.id);
      var isUnlocked = GameState.isUnlocked(building.id);
      var costInfo = buildResourcePills(balance.cost, 'cost');
      var productionInfo = buildResourcePills(balance.produces, 'output');
      var consumptionInfo = buildResourcePills(balance.consumesPerSecond, 'neutral');
      var defenseRange = (balance.guardRadius && getLevelValue(balance.guardRadius, 1)) || (balance.towerDefense && balance.towerDefense.range ? (getLevelValue(balance.towerDefense.range, 1) || balance.towerDefense.range[1]) : null);
      var metrics = buildMetricGrid([
        { label: t('hud.modal.build.metrics.workers', null, 'Workers'), value: getLevelValue(balance.workerCount, 1) || null },
        { label: t('hud.modal.build.metrics.range', null, 'Range'), value: getLevelValue(balance.searchRadius, 1) ? t('hud.modal.build.metrics.tiles', { count: getLevelValue(balance.searchRadius, 1) }, '{count} tiles') : null },
        { label: t('hud.modal.build.metrics.defense', null, 'Defense'), value: defenseRange ? t('hud.modal.build.metrics.tiles', { count: defenseRange }, '{count} tiles') : null },
        { label: t('hud.modal.build.metrics.storage', null, 'Storage'), value: getLevelValue(balance.storageCapacity, 1) || null },
        { label: t('hud.modal.build.metrics.transfer', null, 'Transfer'), value: balance.transferRange ? t('hud.modal.build.metrics.tiles', { count: balance.transferRange }, '{count} tiles') : null },
        { label: t('hud.modal.build.metrics.light', null, 'Light'), value: balance.lightRadius ? t('hud.modal.build.metrics.tiles', { count: balance.lightRadius }, '{count} tiles') : null },
        { label: t('hud.modal.build.metrics.guards', null, 'Guards'), value: getLevelValue(balance.guardCount, 1) || null }
      ]);

      totalPlaced += count;

      if (!isUnlocked) {
        lockedCards.push(
          '<div class="management-card locked" data-modal-focus-id="' + building.id + '">' +
          '<div class="management-card-top">' +
          '<div class="management-card-identity">' +
          '<div class="management-icon build">' + getEntityIcon(building) + '</div>' +
          '<div><div class="management-card-name">' + escapeHtml(localizedBuilding.name) + '</div><div class="management-card-copy">' + escapeHtml(localizedBuilding.description || '') + '</div></div>' +
          '</div>' +
          '<div class="management-badges"><span class="management-badge locked">' + escapeHtml(t('hud.modal.build.badges.locked', null, 'Locked')) + '</span></div>' +
          '</div>' +
          buildRequirementChecklist(building) +
          '<div class="card-actions"><button class="btn btn-secondary" disabled>' + escapeHtml(t('hud.modal.build.action.locked', null, 'Locked')) + '</button></div>' +
          '</div>'
        );
        return;
      }

      var canBuy = costInfo.allAffordable;
      var cardHtml = '';
      cardHtml += '<div class="management-card' + (canBuy ? ' ready' : '') + '" data-modal-focus-id="' + building.id + '">';
      cardHtml += '<div class="management-card-top">';
      cardHtml += '<div class="management-card-identity">';
      cardHtml += '<div class="management-icon build">' + getEntityIcon(building) + '</div>';
      cardHtml += '<div><div class="management-card-name">' + escapeHtml(localizedBuilding.name) + '</div><div class="management-card-copy">' + escapeHtml(localizedBuilding.description || '') + '</div></div>';
      cardHtml += '</div>';
      cardHtml += '<div class="management-badges">';
      cardHtml += '<span class="management-badge neutral">' + escapeHtml(t('hud.modal.build.badges.placed', { count: count }, 'Placed x{count}')) + '</span>';
      cardHtml += '<span class="management-badge ' + (canBuy ? 'ready' : 'pending') + '">' + escapeHtml(canBuy ? t('hud.modal.build.badges.ready', null, 'Ready') : t('hud.modal.build.badges.needStock', null, 'Need stock')) + '</span>';
      cardHtml += '</div></div>';
      cardHtml += metrics;
      if (costInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">' + escapeHtml(t('hud.modal.build.blocks.constructionCost', null, 'Construction Cost')) + '</div><div class="resource-pill-row">' + costInfo.html + '</div></div>';
      }
      if (productionInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">' + escapeHtml(t('hud.modal.build.blocks.produces', null, 'Produces')) + '</div><div class="resource-pill-row">' + productionInfo.html + '</div></div>';
      }
      if (consumptionInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">' + escapeHtml(t('hud.modal.build.blocks.consumes', null, 'Consumes')) + '</div><div class="resource-pill-row">' + consumptionInfo.html + '</div></div>';
      }
      cardHtml += '<div class="card-actions"><button class="btn btn-primary" onclick="BuildingSystem.enterBuildMode(\'' + building.id + '\'); GameHUD.closeModal();"' + (canBuy ? '' : ' disabled') + '>' + escapeHtml(count > 0 ? t('hud.modal.build.action.placeAnother', null, 'Place another') : t('hud.modal.build.action.placeStructure', null, 'Place structure')) + '</button></div>';
      cardHtml += '</div>';

      if (canBuy) {
        readyCards.push(cardHtml);
      } else {
        blockedCards.push(cardHtml);
      }
    });

    var html = '';
    html += '<div class="panel-section">';
    html += '<div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.modal.build.sections.planningKicker', null, 'Settlement Planning')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.build.sections.planningTitle', null, 'Construction Queue')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.build.sections.planningCopy', null, 'See which structures you can place now, which ones still need resources, and which blueprints remain locked.')) + '</div></div></div>';
    html += '<div class="summary-list">';
    html += '<div class="summary-row"><span>' + escapeHtml(summaryReadyLabel) + '</span><span class="summary-value">' + readyCards.length + '</span></div>';
    html += '<div class="summary-row"><span>' + escapeHtml(summaryBlockedLabel) + '</span><span class="summary-value">' + blockedCards.length + '</span></div>';
    html += '<div class="summary-row total"><span>' + escapeHtml(summaryPlacedLabel) + '</span><span class="summary-value">' + totalPlaced + '</span></div>';
    html += '</div></div>';

    if (readyCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.modal.build.sections.readyKicker', null, 'Ready Now')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.build.sections.readyTitle', null, 'Immediate Builds')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.build.sections.readyCopy', null, 'These structures are affordable with your current spendable stockpile.')) + '</div></div></div><div class="management-grid">' + readyCards.join('') + '</div></div>';
    }

    if (blockedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.modal.build.sections.blockedKicker', null, 'Blocked')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.build.sections.blockedTitle', null, 'Need More Materials')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.build.sections.blockedCopy', null, 'These blueprints are unlocked, but your current stockpile is still short.')) + '</div></div></div><div class="management-grid">' + blockedCards.join('') + '</div></div>';
    }

    if (lockedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.modal.build.sections.lockedKicker', null, 'Future Blueprints')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.build.sections.lockedTitle', null, 'Locked Structures')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.build.sections.lockedCopy', null, 'Track the requirements that unlock your next set of buildings.')) + '</div></div></div><div class="management-grid">' + lockedCards.join('') + '</div></div>';
    }

    panel.innerHTML = html || '<div class="empty-state">' + escapeHtml(t('hud.modal.build.sections.empty', null, 'No building blueprints are available yet.')) + '</div>';
  }

  function renderModalCraft() {
    var panel = document.getElementById('modal-panel-craft');
    if (!panel) return;

    var recipes = CraftSystem.getAllRecipes();
    var readyCards = [];
    var waitingCards = [];
    var lockedCards = [];
    var equippedCards = [];
    var summaryReadyLabel = t('hud.modal.craft.sections.readyCount', null, 'Ready now');
    var summaryWaitingLabel = t('hud.modal.craft.sections.waitingCount', null, 'Need materials');
    var summaryEquippedLabel = t('hud.modal.craft.sections.equippedCount', null, 'Already equipped');

    recipes.forEach(function(recipe) {
      var localizedRecipe = GameRegistry.getEntity(recipe.id) || recipe;
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
          '<div class="management-card locked" data-modal-focus-id="' + recipe.id + '">' +
          '<div class="management-card-top">' +
          '<div class="management-card-identity">' +
          '<div class="management-icon craft">' + getEntityIcon(primaryOutputEntity || recipe) + '</div>' +
          '<div><div class="management-card-name">' + escapeHtml(localizedRecipe.name) + '</div><div class="management-card-copy">' + escapeHtml(localizedRecipe.description || '') + '</div></div>' +
          '</div>' +
          '<div class="management-badges"><span class="management-badge locked">' + escapeHtml(t('hud.modal.craft.badges.locked', null, 'Locked')) + '</span></div>' +
          '</div>' +
          buildRequirementChecklist(recipe) +
          '<div class="card-actions"><button class="btn btn-secondary" disabled>' + escapeHtml(t('hud.modal.craft.action.locked', null, 'Locked')) + '</button></div>' +
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
      var statusText = t('hud.modal.craft.badges.needMaterials', null, 'Need materials');

      if (isEquipped) {
        statusClass = 'done';
        statusText = t('hud.modal.craft.badges.equipped', null, 'Equipped');
        actionHtml = '<button class="btn btn-secondary" disabled>' + escapeHtml(t('hud.modal.craft.action.equipped', null, 'Equipped')) + '</button>';
      } else if (hasInInventory && outputEquipmentId) {
        statusClass = 'ready';
        statusText = t('hud.modal.craft.badges.readyToUse', null, 'Ready to use');
        actionHtml = '<button class="btn btn-success" onclick="GameActions.equip(\'' + outputEquipmentId + '\'); GameHUD.updateModal();">' + escapeHtml(t('hud.modal.craft.action.useItem', null, 'Use item')) + '</button>';
      } else {
        statusClass = canCraft ? 'ready' : 'pending';
        statusText = canCraft ? t('hud.modal.craft.badges.readyToCraft', null, 'Ready to craft') : t('hud.modal.craft.badges.needMaterials', null, 'Need materials');
        actionHtml = '<button class="btn btn-primary" onclick="GameActions.craft(\'' + recipe.id + '\')"' + (canCraft ? '' : ' disabled') + '>' + escapeHtml(t('hud.modal.craft.action.craft', null, 'Craft')) + '</button>';
      }

      if (primaryOutputEntity && primaryOutputEntity.type === 'equipment') {
        badges += '<span class="management-badge neutral">' + escapeHtml((primaryOutputEntity.slot || '').replace(/^./, function(ch) { return ch.toUpperCase(); })) + '</span>';
      }
      badges += '<span class="management-badge ' + statusClass + '">' + statusText + '</span>';

      var cardHtml = '';
      cardHtml += '<div class="management-card' + (statusClass === 'done' ? ' complete' : (statusClass === 'ready' ? ' ready' : '')) + '" data-modal-focus-id="' + recipe.id + '">';
      cardHtml += '<div class="management-card-top">';
      cardHtml += '<div class="management-card-identity">';
      cardHtml += '<div class="management-icon craft">' + getEntityIcon(primaryOutputEntity || recipe) + '</div>';
      cardHtml += '<div><div class="management-card-name">' + escapeHtml(localizedRecipe.name) + '</div><div class="management-card-copy">' + escapeHtml(localizedRecipe.description || '') + '</div></div>';
      cardHtml += '</div>';
      cardHtml += '<div class="management-badges">' + badges + '</div>';
      cardHtml += '</div>';
      cardHtml += buildMetricGrid([
        { label: t('hud.modal.craft.blocks.result', null, 'Result'), value: primaryOutputEntity ? primaryOutputEntity.type : t('hud.modal.craft.blocks.recipe', null, 'Recipe') },
        { label: t('hud.modal.craft.blocks.yield', null, 'Yield'), value: primaryOutputId ? ('x' + balance.output[primaryOutputId]) : null }
      ]);
      if (outputInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">' + escapeHtml(t('hud.modal.craft.blocks.output', null, 'Output')) + '</div><div class="resource-pill-row">' + outputInfo.html + '</div></div>';
      }
      if (inputInfo.html) {
        cardHtml += '<div class="management-block"><div class="management-block-label">' + escapeHtml(t('hud.modal.craft.blocks.input', null, 'Required Materials')) + '</div><div class="resource-pill-row">' + inputInfo.html + '</div></div>';
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
    html += '<div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.modal.craft.sections.workshopKicker', null, 'Workshop Flow')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.craft.sections.workshopTitle', null, 'Crafting Queue')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.craft.sections.workshopCopy', null, 'Review what can be crafted now, what is waiting on materials, and which upgrades are already equipped.')) + '</div></div></div>';
    html += '<div class="summary-list">';
    html += '<div class="summary-row"><span>' + escapeHtml(summaryReadyLabel) + '</span><span class="summary-value">' + readyCards.length + '</span></div>';
    html += '<div class="summary-row"><span>' + escapeHtml(summaryWaitingLabel) + '</span><span class="summary-value">' + waitingCards.length + '</span></div>';
    html += '<div class="summary-row total"><span>' + escapeHtml(summaryEquippedLabel) + '</span><span class="summary-value">' + equippedCards.length + '</span></div>';
    html += '</div></div>';

    if (readyCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.modal.craft.sections.readyKicker', null, 'Ready Now')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.craft.sections.readyTitle', null, 'Craft Immediately')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.craft.sections.readyCopy', null, 'These recipes can be completed with your current stockpile.')) + '</div></div></div><div class="management-grid">' + readyCards.join('') + '</div></div>';
    }

    if (waitingCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.modal.craft.sections.waitingKicker', null, 'Waiting')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.craft.sections.waitingTitle', null, 'Material Shortages')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.craft.sections.waitingCopy', null, 'Gather or process more resources before these recipes can be completed.')) + '</div></div></div><div class="management-grid">' + waitingCards.join('') + '</div></div>';
    }

    if (equippedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.modal.craft.sections.equippedKicker', null, 'Equipped')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.craft.sections.equippedTitle', null, 'Current Gear')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.craft.sections.equippedCopy', null, 'These crafted equipment pieces are already active on your survivor.')) + '</div></div></div><div class="management-grid">' + equippedCards.join('') + '</div></div>';
    }

    if (lockedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.modal.craft.sections.lockedKicker', null, 'Future Recipes')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.craft.sections.lockedTitle', null, 'Locked Crafting')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.craft.sections.lockedCopy', null, 'Unlock new recipes by reaching the next age and settlement milestones.')) + '</div></div></div><div class="management-grid">' + lockedCards.join('') + '</div></div>';
    }

    panel.innerHTML = html || '<div class="empty-state">' + escapeHtml(t('hud.modal.craft.sections.empty', null, 'No crafting recipes are available yet.')) + '</div>';
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
    html += '<div><div class="section-kicker">' + escapeHtml(t('hud.statsPanel.overviewKicker', null, 'Survivor Overview')) + '</div><div class="section-title">' + escapeHtml(currentAgeEntity ? currentAgeEntity.name : GameState.getAge()) + '</div><div class="section-copy">' + escapeHtml(t('hud.statsPanel.overviewCopy', null, 'Your current combat, travel, and survivability profile.')) + '</div></div>';
    html += '</div>';
    html += '<div class="stats-grid">';

    html += '<div class="stat-card hp">';
    html += '<div class="stat-label">❤️ ' + escapeHtml(t('hud.statsPanel.health', null, 'Health')) + '</div>';
    html += '<div class="stat-value">' + Math.floor(player.hp) + ' / ' + maxHp + '</div>';
    html += '<div class="stat-breakdown">' + buildEquippedStatBreakdownText(100, 'maxHp') + '</div></div>';

    html += '<div class="stat-card attack">';
    html += '<div class="stat-label">⚔️ ' + escapeHtml(t('hud.statsPanel.attack', null, 'Attack')) + '</div>';
    html += '<div class="stat-value">' + attack + '</div>';
    html += '<div class="stat-breakdown">' + buildEquippedStatBreakdownText(player.attack, 'attack') + '</div></div>';

    html += '<div class="stat-card defense">';
    html += '<div class="stat-label">🛡️ ' + escapeHtml(t('hud.statsPanel.defense', null, 'Defense')) + '</div>';
    html += '<div class="stat-value">' + defense + '</div>';
    html += '<div class="stat-breakdown">' + buildEquippedStatBreakdownText(player.defense, 'defense') + '</div></div>';

    html += '<div class="stat-card speed">';
    html += '<div class="stat-label">⚡ ' + escapeHtml(t('hud.statsPanel.speed', null, 'Speed')) + '</div>';
    html += '<div class="stat-value">' + speed.toFixed(1) + '</div>';
    html += '<div class="stat-breakdown">' + buildEquippedStatBreakdownText(player.speed, 'speed') + '</div></div>';

    html += '</div>';
    html += '<div class="summary-list compact">';
    html += '<div class="summary-row"><span>' + escapeHtml(t('hud.statsPanel.currentAge', null, 'Current age')) + '</span><span class="summary-value">' + escapeHtml(currentAgeEntity ? currentAgeEntity.name : GameState.getAge()) + '</span></div>';
    html += '<div class="summary-row"><span>' + escapeHtml(t('hud.statsPanel.worldPosition', null, 'World position')) + '</span><span class="summary-value">' + Math.floor(player.x) + ', ' + Math.floor(player.z) + '</span></div>';
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
      html += '<div><div class="section-kicker">' + escapeHtml(t('hud.statsPanel.mainObjectiveKicker', null, 'Main Objective')) + '</div><div class="section-title">' + escapeHtml(t('hud.statsPanel.advanceTitle', { name: nextAge.entity.name }, 'Advance to {name}')) + '</div><div class="section-copy">' + escapeHtml(t('hud.statsPanel.advanceCopy', null, 'Fill every bar below to complete the current age milestone.')) + '</div></div>';
      html += '<div class="section-action-group">';
      html += '<span class="status-chip ' + (canAdvance ? 'ready' : 'pending') + '">' + escapeHtml(canAdvance ? t('hud.statsPanel.readyNow', null, 'Ready now') : t('hud.statsPanel.inProgress', null, 'In progress')) + '</span>';
      html += '<button class="btn ' + (canAdvance ? 'btn-primary' : 'btn-secondary') + '" onclick="GameActions.advanceAge(\'' + nextAge.entity.id + '\')"' + (canAdvance ? '' : ' disabled') + '>' + escapeHtml(t('hud.statsPanel.advanceButton', null, 'Advance')) + '</button>';
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
      html += '<div><div class="section-kicker">' + escapeHtml(t('hud.statsPanel.mainObjectiveKicker', null, 'Main Objective')) + '</div><div class="section-title">' + escapeHtml(t('hud.statsPanel.clearedTitle', null, 'Current Content Cleared')) + '</div><div class="section-copy">' + escapeHtml(t('hud.statsPanel.clearedCopy', null, 'You have reached the end of the current age progression track.')) + '</div></div>';
      html += '<div class="section-action-group"><span class="status-chip ready">' + escapeHtml(t('hud.statsPanel.complete', null, 'Complete')) + '</span></div>';
      html += '</div></div>';
    }

    html += '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div><div class="section-kicker">' + escapeHtml(t('hud.statsPanel.settlementKicker', null, 'Settlement')) + '</div><div class="section-title">' + escapeHtml(t('hud.statsPanel.settlementTitle', null, 'Built Structures')) + '</div><div class="section-copy">' + escapeHtml(t('hud.statsPanel.settlementCopy', null, 'A quick view of how your current economy footprint is distributed.')) + '</div></div>';
    html += '</div>';

    if (buildingEntries.length > 0) {
      html += '<div class="summary-list">';
      html += '<div class="summary-row total"><span>' + escapeHtml(t('hud.statsPanel.totalBuildings', null, 'Total buildings')) + '</span><span class="summary-value">' + totalBuildings + '</span></div>';
      buildingEntries.slice(0, 6).forEach(function(entry) {
        html += '<div class="summary-row"><span>' + escapeHtml(entry.name) + '</span><span class="summary-value">x' + entry.count + '</span></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">' + escapeHtml(t('hud.statsPanel.noBuildingsPlaced', null, 'No buildings placed yet.')) + '</div>';
    }
    html += '</div>';

    if (nextUnlocks.length > 0) {
      html += '<div class="panel-section">';
      html += '<div class="section-header">';
      html += '<div><div class="section-kicker">' + escapeHtml(t('hud.statsPanel.lookAheadKicker', null, 'Look Ahead')) + '</div><div class="section-title">' + escapeHtml(t('hud.statsPanel.lookAheadTitle', null, 'Upcoming Unlocks')) + '</div><div class="section-copy">' + escapeHtml(t('hud.statsPanel.lookAheadCopy', null, 'These are the closest content unlocks based on current progress.')) + '</div></div>';
      html += '</div>';
      html += '<div class="unlock-list">';
      nextUnlocks.slice(0, 4).forEach(function(item) {
        var percent = Math.round(item.progress.percent * 100);
        var hint = describeUnlockProgress(item.progress);
        html += '<div class="unlock-card">';
        html += '<div class="unlock-name">' + escapeHtml(item.entity.name) + '</div>';
        html += '<div class="unlock-meta">' + escapeHtml(t('hud.statsPanel.unlockReady', { percent: percent }, '{percent}% ready')) + (hint ? ' • ' + escapeHtml(hint) : '') + '</div>';
        html += '<div class="progress-track compact"><div class="progress-fill" style="width:' + percent + '%"></div></div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    panel.innerHTML = html;
  }

  function renderModalResearch() {
    var panel = document.getElementById('modal-panel-research');
    if (!panel) return;

    var allTechs = GameRegistry.getEntitiesByType('technology');
    if (!allTechs || allTechs.length === 0) {
      panel.innerHTML = '<div class="empty-state">' + escapeHtml(t('hud.researchPanel.empty', null, 'No technologies are available yet.')) + '</div>';
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

      var prereqsMet = true;
      if (balance && balance.requires) {
        balance.requires.forEach(function(reqId) {
          if (!ResearchSystem.isResearched(reqId)) prereqsMet = false;
        });
      }

      var costInfo = buildResourcePills(balance && balance.researchCost, 'cost');
      var effectsHtml = buildResearchEffectsList(balance && balance.effects);
      var statusClass = 'pending';
      var statusText = t('hud.researchPanel.status.needResources', null, 'Need resources');
      var actionHtml = '<button class="btn btn-secondary" disabled>' + escapeHtml(t('hud.researchPanel.status.needResources', null, 'Need resources')) + '</button>';

      if (isResearched) {
        statusClass = 'done';
        statusText = t('hud.researchPanel.status.completed', null, 'Completed');
        actionHtml = '<button class="btn btn-secondary" disabled>' + escapeHtml(t('hud.researchPanel.status.completed', null, 'Completed')) + '</button>';
      } else if (canResearch) {
        statusClass = 'ready';
        statusText = t('hud.researchPanel.status.readyToResearch', null, 'Ready to research');
        actionHtml = '<button class="btn btn-primary" onclick="GameActions.researchTech(\'' + tech.id + '\')">' + escapeHtml(t('hud.researchPanel.actions.research', null, 'Research')) + '</button>';
      } else if (isUnlocked && prereqsMet) {
        statusClass = 'pending';
        statusText = t('hud.researchPanel.status.needResources', null, 'Need resources');
      } else {
        statusClass = 'locked';
        statusText = isUnlocked ? t('hud.researchPanel.status.needPrerequisites', null, 'Need prerequisites') : t('hud.researchPanel.status.locked', null, 'Locked');
        actionHtml = '<button class="btn btn-secondary" disabled>' + statusText + '</button>';
      }

      var cardHtml = '';
      cardHtml += '<div class="management-card' + (statusClass === 'done' ? ' complete' : (statusClass === 'ready' ? ' ready' : '')) + (statusClass === 'locked' ? ' locked' : '') + '">';
      cardHtml += '<div class="management-card-top">';
      cardHtml += '<div class="management-card-identity">';
      cardHtml += '<div class="management-icon research">' + getEntityIcon(tech) + '</div>';
      cardHtml += '<div><div class="management-card-name">' + escapeHtml(tech.name) + '</div><div class="management-card-copy">' + escapeHtml(tech.description || '') + '</div></div>';
      cardHtml += '</div>';
      cardHtml += '<div class="management-badges"><span class="management-badge ' + statusClass + '">' + statusText + '</span></div>';
      cardHtml += '</div>';
      cardHtml += buildMetricGrid([
        { label: t('hud.researchPanel.metrics.prerequisites', null, 'Prerequisites'), value: balance && balance.requires ? balance.requires.length : 0 },
        { label: t('hud.researchPanel.metrics.bonuses', null, 'Bonuses'), value: balance && balance.effects ? Object.keys(balance.effects).length : 0 }
      ]);
      if (effectsHtml) {
        cardHtml += '<div class="management-block"><div class="management-block-label">' + escapeHtml(t('hud.researchPanel.blocks.effects', null, 'Effects')) + '</div>' + effectsHtml + '</div>';
      }
      if (costInfo.html && !isResearched) {
        cardHtml += '<div class="management-block"><div class="management-block-label">' + escapeHtml(t('hud.researchPanel.blocks.researchCost', null, 'Research Cost')) + '</div><div class="resource-pill-row">' + costInfo.html + '</div></div>';
      }
      if (balance && balance.requires && balance.requires.length && !prereqsMet) {
        cardHtml += '<div class="management-block"><div class="management-block-label">' + escapeHtml(t('hud.researchPanel.blocks.requiredTech', null, 'Required Tech')) + '</div>' + buildTechnologyRequirementChecklist(balance.requires) + '</div>';
      }
      if (!isUnlocked) {
        cardHtml += '<div class="management-block"><div class="management-block-label">' + escapeHtml(t('hud.researchPanel.blocks.unlockPath', null, 'Unlock Path')) + '</div>' + buildRequirementChecklist(tech) + '</div>';
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
    html += '<div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.researchPanel.sections.overviewKicker', null, 'Knowledge Track')) + '</div><div class="section-title">' + escapeHtml(t('hud.researchPanel.sections.overviewTitle', null, 'Research Overview')) + '</div><div class="section-copy">' + escapeHtml(t('hud.researchPanel.sections.overviewCopy', null, 'Prioritize immediate upgrades, track blocked technology, and review the bonuses you have already secured.')) + '</div></div></div>';
    html += '<div class="summary-list">';
    html += '<div class="summary-row"><span>' + escapeHtml(t('hud.researchPanel.sections.readySummary', null, 'Ready to research')) + '</span><span class="summary-value">' + readyCards.length + '</span></div>';
    html += '<div class="summary-row"><span>' + escapeHtml(t('hud.researchPanel.sections.waitingSummary', null, 'Waiting')) + '</span><span class="summary-value">' + waitingCards.length + '</span></div>';
    html += '<div class="summary-row total"><span>' + escapeHtml(t('hud.researchPanel.sections.completedSummary', null, 'Completed')) + '</span><span class="summary-value">' + completeCards.length + '</span></div>';
    html += '</div></div>';

    if (readyCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.researchPanel.sections.readyKicker', null, 'Ready Now')) + '</div><div class="section-title">' + escapeHtml(t('hud.researchPanel.sections.readyTitle', null, 'Immediate Upgrades')) + '</div><div class="section-copy">' + escapeHtml(t('hud.researchPanel.sections.readyCopy', null, 'These technologies can be researched right now with your current stockpile.')) + '</div></div></div><div class="management-grid">' + readyCards.join('') + '</div></div>';
    }

    if (waitingCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.researchPanel.sections.waitingKicker', null, 'Waiting')) + '</div><div class="section-title">' + escapeHtml(t('hud.researchPanel.sections.waitingTitle', null, 'Need More Resources')) + '</div><div class="section-copy">' + escapeHtml(t('hud.researchPanel.sections.waitingCopy', null, 'The tech is unlocked and all prerequisites are met, but the research cost is still out of reach.')) + '</div></div></div><div class="management-grid">' + waitingCards.join('') + '</div></div>';
    }

    if (lockedCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.researchPanel.sections.lockedKicker', null, 'Blocked')) + '</div><div class="section-title">' + escapeHtml(t('hud.researchPanel.sections.lockedTitle', null, 'Locked Technology')) + '</div><div class="section-copy">' + escapeHtml(t('hud.researchPanel.sections.lockedCopy', null, 'These upgrades still need an unlock condition or prerequisite tech before you can invest in them.')) + '</div></div></div><div class="management-grid">' + lockedCards.join('') + '</div></div>';
    }

    if (completeCards.length) {
      html += '<div class="panel-section"><div class="section-header"><div><div class="section-kicker">' + escapeHtml(t('hud.researchPanel.sections.completeKicker', null, 'Archive')) + '</div><div class="section-title">' + escapeHtml(t('hud.researchPanel.sections.completeTitle', null, 'Completed Research')) + '</div><div class="section-copy">' + escapeHtml(t('hud.researchPanel.sections.completeCopy', null, 'Permanent bonuses already active across your settlement.')) + '</div></div></div><div class="management-grid">' + completeCards.join('') + '</div></div>';
    }

    panel.innerHTML = html;
  }

  return {
    toggleModal: toggleModal,
    openModal: openModal,
    closeModal: closeModal,
    switchModalTab: switchModalTab,
    updateModal: updateModal,
    getEntityIcon: getEntityIcon
  };
};