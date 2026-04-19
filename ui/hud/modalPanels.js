window.GameHUDModules = window.GameHUDModules || {};

window.GameHUDModules.createModalPanelsModule = function createModalPanelsModule(context) {
  var t = context.t;
  var escapeHtml = context.escapeHtml;
  var getResourceIcon = context.getResourceIcon;
  var getNextAgeObjective = context.getNextAgeObjective;
  var getWeaponSwitchItems = context.getWeaponSwitchItems;
  var getWeaponCycleSummary = context.getWeaponCycleSummary;
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
  var _inventoryFilterState = { mode: 'type', value: 'all' };
  var _craftFilterState = { mode: 'type', value: 'all' };
  var _bagPanelState = { section: 'all' };
  var _bagFilterState = {
    loadout: 'all',
    weapons: 'all',
    consumables: 'all'
  };
  var _isCompactMode = true;

  function toggleModal() {
    if (getModalActive()) {
      closeModal();
    } else {
      openModal();
    }
  }

  function resolveModalTab(tabName) {
    var nextTab = tabName || getModalTab() || 'resources';

    if (nextTab === 'inventory' || nextTab === 'bag') {
      nextTab = 'resources';
    }

    if (nextTab !== 'resources' && nextTab !== 'build' && nextTab !== 'craft' && nextTab !== 'stats' && nextTab !== 'research') {
      nextTab = 'resources';
    }

    return nextTab;
  }

  function syncModalTabOverflowTitles() {
    var tabs = document.querySelectorAll('.modal-tab');
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      var labelNode = tab.querySelector('.tab-label');
      var labelText = labelNode ? String(labelNode.textContent || '').trim() : String(tab.textContent || '').trim();

      if (!labelText) {
        tab.removeAttribute('title');
        tab.removeAttribute('aria-label');
        continue;
      }

      tab.setAttribute('aria-label', labelText);
      if (labelNode && labelNode.scrollWidth > labelNode.clientWidth + 1) {
        tab.setAttribute('title', labelText);
      } else {
        tab.removeAttribute('title');
      }
    }
  }

  function scheduleModalTabOverflowTitleSync() {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(syncModalTabOverflowTitles);
      return;
    }

    setTimeout(syncModalTabOverflowTitles, 0);
  }

  function openModal(options) {
    if (!isHudVisible()) return;

    if (typeof options === 'string') {
      options = { tab: options };
    }
    var requestedTab = options && options.tab ? options.tab : getModalTab();
    var resolvedTab = resolveModalTab(requestedTab);

    if (options && options.section) {
      _bagPanelState.section = options.section;
    }
    setModalTab(resolvedTab);
    if (options && options.focusId) {
      setModalFocusTarget(resolvedTab, options.focusId);
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
    setModalTab(resolveModalTab(tabName));
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
    scheduleModalTabOverflowTitleSync();
  }

  window.addEventListener('resize', function() {
    if (getModalActive()) {
      scheduleModalTabOverflowTitleSync();
    }
  });

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
      case 'bag':
        renderModalResources();
        break;
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
      scheduleModalTabOverflowTitleSync();
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

  function getAgeSortWeight(ageId) {
    if (ageId === 'age.stone') return 0;
    if (ageId === 'age.bronze') return 1;
    if (ageId === 'age.iron') return 2;
    return 99;
  }

  function getEntityUnlockAgeId(entity) {
    return entity && entity.unlock && entity.unlock.age ? entity.unlock.age : null;
  }

  function getAgeLabel(ageId) {
    if (!ageId) return t('hud.modal.common.anyAge', null, 'Any Age');
    var ageEntity = GameRegistry.getEntity(ageId);
    return ageEntity ? ageEntity.name : ageId;
  }

  function getFilterAgeId(ageId) {
    return ageId || 'age.any';
  }

  function getFilterAgeLabel(filterAgeId) {
    return filterAgeId === 'age.any'
      ? t('hud.modal.common.anyAge', null, 'Any Age')
      : getAgeLabel(filterAgeId);
  }

  function getItemCategoryMeta(entity) {
    if (entity && entity.type === 'consumable') {
      return {
        id: 'consumable',
        label: t('hud.modal.category.consumables', null, 'Consumables'),
        order: 4,
        copy: t('hud.modal.category.consumablesCopy', null, 'Food and one-shot support items kept separate from equipment.')
      };
    }

    var slot = entity && entity.slot;
    if (slot === 'weapon') {
      return {
        id: 'weapon',
        label: t('hud.modal.category.weapons', null, 'Weapons'),
        order: 0,
        copy: t('hud.modal.category.weaponsCopy', null, 'Blades, spears, bows, and relic weapons grouped together.')
      };
    }
    if (slot === 'offhand') {
      return {
        id: 'offhand',
        label: t('hud.modal.category.offhand', null, 'Shields'),
        order: 1,
        copy: t('hud.modal.category.offhandCopy', null, 'Shield and offhand upgrades for survivability.')
      };
    }
    if (slot === 'armor') {
      return {
        id: 'armor',
        label: t('hud.modal.category.armor', null, 'Armor'),
        order: 2,
        copy: t('hud.modal.category.armorCopy', null, 'Body armor grouped separately so it is easier to find.')
      };
    }
    if (slot === 'boots') {
      return {
        id: 'boots',
        label: t('hud.modal.category.boots', null, 'Boots'),
        order: 3,
        copy: t('hud.modal.category.bootsCopy', null, 'Movement gear and footwear upgrades.')
      };
    }

    return {
      id: 'utility',
      label: t('hud.modal.category.utility', null, 'Utility'),
      order: 5,
      copy: t('hud.modal.category.utilityCopy', null, 'Recipes and items that are not wearable gear.')
    };
  }

  function registerFilterOption(optionMap, optionId, label, order) {
    if (!optionMap[optionId]) {
      optionMap[optionId] = {
        id: optionId,
        label: label,
        order: order,
        count: 0
      };
    }
    optionMap[optionId].count += 1;
  }

  function buildFilterOptionList(optionMap) {
    var options = [];
    for (var optionId in optionMap) {
      if (!optionMap.hasOwnProperty(optionId)) continue;
      options.push(optionMap[optionId]);
    }

    options.sort(function(left, right) {
      if (left.order !== right.order) return left.order - right.order;
      return left.label.localeCompare(right.label);
    });

    return options;
  }

  function normalizeFilterState(state, options) {
    if (!state) return;
    if (state.mode !== 'type' && state.mode !== 'age') {
      state.mode = 'type';
    }
    if (state.value === 'all') return;

    var exists = false;
    for (var i = 0; i < options.length; i++) {
      if (options[i].id === state.value) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      state.value = 'all';
    }
  }

  function matchesBagFilter(entry, state) {
    if (!state || state.value === 'all') return true;
    if (state.mode === 'age') return entry.filterAgeId === state.value;
    return entry.categoryMeta && entry.categoryMeta.id === state.value;
  }

  function buildBagFilterToolbarHtml(methodPrefix, state, typeOptions, ageOptions, summaryText) {
    var activeMode = state && state.mode === 'age' ? 'age' : 'type';
    var activeOptions = activeMode === 'age' ? ageOptions : typeOptions;
    normalizeFilterState(state, activeOptions);

    var html = '<div class="bag-filter-bar">';
    html += '<div class="bag-filter-mode-tabs">';
    html += '<button class="bag-filter-mode' + (activeMode === 'type' ? ' active' : '') + '" type="button" onclick="GameHUD.set' + methodPrefix + 'FilterMode(\'type\')">' + escapeHtml(t('hud.modal.filters.type', null, 'Type')) + '</button>';
    html += '<button class="bag-filter-mode' + (activeMode === 'age' ? ' active' : '') + '" type="button" onclick="GameHUD.set' + methodPrefix + 'FilterMode(\'age\')">' + escapeHtml(t('hud.modal.filters.age', null, 'Age')) + '</button>';
    html += '</div>';
    if (summaryText) {
      html += '<div class="bag-filter-summary">' + escapeHtml(summaryText) + '</div>';
    }
    html += '<div class="bag-filter-chip-row">';
    html += '<button class="bag-filter-chip' + (state.value === 'all' ? ' active' : '') + '" type="button" onclick="GameHUD.set' + methodPrefix + 'FilterValue(\'all\')">' + escapeHtml(t('hud.modal.filters.all', null, 'All')) + '</button>';
    activeOptions.forEach(function(option) {
      html += '<button class="bag-filter-chip' + (state.value === option.id ? ' active' : '') + '" type="button" onclick="GameHUD.set' + methodPrefix + 'FilterValue(\'' + option.id + '\')">';
      html += '<span>' + escapeHtml(option.label) + '</span>';
      html += '<span class="bag-filter-chip-count">' + escapeHtml(String(option.count)) + '</span>';
      html += '</button>';
    });
    html += '</div></div>';
    return html;
  }

  function buildInventoryItemCardHtml(item) {
    var cardClass = 'inventory-item-card';
    if (item.clickable) cardClass += ' clickable';
    if (item.isEquipped) cardClass += ' equipped';
    if (item.isConsumable) cardClass += ' consumable';

    var onClick = item.clickable ? ' onclick="GameActions.equip(\'' + item.itemId + '\'); GameHUD.updateModal();"' : '';
    var html = '<div class="' + cardClass + '" title="' + escapeHtml(item.tooltip) + '"' + onClick + '>';
    html += '<div class="inventory-item-icon">' + item.icon + '</div>';
    html += '<div class="inventory-item-main">';
    html += '<div class="inventory-item-top">';
    html += '<div class="inventory-item-name">' + escapeHtml(item.name) + '</div>';
    html += '<div class="inventory-item-count">x' + escapeHtml(String(item.count)) + '</div>';
    html += '</div>';
    if (item.statSummary) {
      html += '<div class="inventory-item-summary">' + escapeHtml(item.statSummary) + '</div>';
    }
    html += '<div class="inventory-item-tags">';
    html += '<span class="inventory-chip">' + escapeHtml(item.primaryTag) + '</span>';
    html += '<span class="inventory-chip muted">' + escapeHtml(item.ageLabel) + '</span>';
    if (item.isEquipped) {
      html += '<span class="inventory-chip accent">' + escapeHtml(t('hud.modal.inventory.equipped', null, 'Equipped')) + '</span>';
    }
    html += '</div>';
    html += '</div></div>';
    return html;
  }

  function buildOverflowTitleAttr(text) {
    var value = String(text == null ? '' : text).trim();
    return value ? ' title="' + escapeHtml(value) + '"' : '';
  }

  function buildCompactActionButtonHtml(className, label, onClick, disabled) {
    var safeLabel = String(label == null ? '' : label);
    var html = '<button class="btn ' + escapeHtml(className || 'btn-secondary') + '" type="button"';

    if (onClick) {
      html += ' onclick="' + onClick + '"';
    }
    if (disabled) {
      html += ' disabled';
    }

    html += buildOverflowTitleAttr(safeLabel);
    html += '>' + escapeHtml(safeLabel) + '</button>';
    return html;
  }

  function buildCompactCraftCardHtml(entry) {
    var cardClass = 'craft-compact-card ' + entry.statusClass;
    var html = '<div class="' + cardClass + '" data-modal-focus-id="' + entry.recipeId + '">';
    // Row 1: icon + name + button
    html += '<div class="craft-compact-top">';
    html += '<div class="craft-compact-identity">';
    html += '<div class="management-icon craft">' + entry.icon + '</div>';
    html += '<div class="craft-compact-name"' + buildOverflowTitleAttr(entry.name) + '>' + escapeHtml(entry.name) + '</div>';
    html += '</div>';
    if (entry.actionHtml) {
      html += '<div class="craft-compact-action">' + entry.actionHtml + '</div>';
    }
    html += '</div>';
    // Row 2: description
    if (entry.statsSummary) {
      html += '<div class="management-compact-copy"' + buildOverflowTitleAttr(entry.statsSummary) + '>' + escapeHtml(entry.statsSummary) + '</div>';
    }
    // Row 3: cost/resources
    if (entry.statusClass === 'locked' && entry.unlockHint) {
      html += '<div class="craft-compact-note"' + buildOverflowTitleAttr(entry.unlockHint) + '>' + escapeHtml(entry.unlockHint) + '</div>';
    } else if (entry.inputHtml) {
      html += '<div class="craft-compact-row"><div class="craft-compact-row-label">' + escapeHtml(t('hud.modal.craft.materialsShort', null, 'Cost')) + '</div><div class="resource-pill-row compact">' + entry.inputHtml + '</div></div>';
    }
    html += '</div>';
    return html;
  }

  function ensureGroupedSection(map, meta) {
    if (!map[meta.id]) {
      map[meta.id] = {
        meta: meta,
        entries: [],
        counts: { ready: 0, waiting: 0, equipped: 0, locked: 0 }
      };
    }
    return map[meta.id];
  }

  function buildInventoryGroupHtml(group) {
    if (!group || !group.entries || !group.entries.length) return '';

    var html = '<div class="inventory-group">';
    html += '<div class="inventory-group-header">';
    html += '<div class="inventory-group-title">' + escapeHtml(group.meta.label) + '</div>';
    html += '<div class="inventory-group-count">' + escapeHtml(t('hud.modal.inventory.itemsCount', { count: group.entries.length }, '{count} items')) + '</div>';
    html += '</div>';
    html += '<div class="inventory-group-copy">' + escapeHtml(group.meta.copy) + '</div>';
    html += '<div class="inventory-group-grid">';
    html += group.entries.map(function(entry) { return entry.html; }).join('');
    html += '</div></div>';
    return html;
  }

  function buildCraftGroupHtml(group) {
    if (!group || !group.entries || !group.entries.length) return '';

    var counts = group.counts || { ready: 0, waiting: 0, equipped: 0, locked: 0 };
    var html = '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div>';
    html += '<div class="section-kicker">' + escapeHtml(t('hud.modal.craft.sections.groupedKicker', null, 'Grouped By Type')) + '</div>';
    html += '<div class="section-title">' + escapeHtml(group.meta.label) + '</div>';
    html += '<div class="section-copy">' + escapeHtml(group.meta.copy) + '</div>';
    html += '</div>';
    html += '<div class="section-action-group">';
    if (counts.ready > 0) html += '<span class="status-chip ready">' + escapeHtml(t('hud.modal.craft.groups.readyCount', { count: counts.ready }, 'Ready {count}')) + '</span>';
    if (counts.waiting > 0) html += '<span class="status-chip pending">' + escapeHtml(t('hud.modal.craft.groups.waitingCount', { count: counts.waiting }, 'Waiting {count}')) + '</span>';
    if (counts.equipped > 0) html += '<span class="status-chip ready">' + escapeHtml(t('hud.modal.craft.groups.equippedCount', { count: counts.equipped }, 'Equipped {count}')) + '</span>';
    if (counts.locked > 0) html += '<span class="status-chip pending">' + escapeHtml(t('hud.modal.craft.groups.lockedCount', { count: counts.locked }, 'Locked {count}')) + '</span>';
    html += '</div></div>';
    html += '<div class="management-grid">' + group.entries.map(function(entry) { return entry.html; }).join('') + '</div>';
    html += '</div>';
    return html;
  }

  function getBagSectionList() {
    return [
      {
        id: 'all',
        icon: '🎒',
        label: t('hud.modal.bag.sections.all', null, 'All Items'),
        copy: t('hud.modal.bag.sections.allCopy', null, 'Browse every carried item with a fixed filter rail.')
      },
      {
        id: 'loadout',
        icon: '🛡️',
        label: t('hud.modal.bag.sections.loadout', null, 'Loadout'),
        copy: t('hud.modal.bag.sections.loadoutCopy', null, 'Manage equipped slots and swap gear by slot.')
      },
      {
        id: 'weapons',
        icon: '⚔️',
        label: t('hud.modal.bag.sections.weapons', null, 'Weapons'),
        copy: t('hud.modal.bag.sections.weaponsCopy', null, 'Equip a weapon now and decide whether Q should cycle through it.')
      },
      {
        id: 'consumables',
        icon: '🍖',
        label: t('hud.modal.bag.sections.consumables', null, 'Consumables'),
        copy: t('hud.modal.bag.sections.consumablesCopy', null, 'Find food and one-use survival items quickly.')
      }
    ];
  }

  function resolveBagSection(sectionId) {
    if (sectionId === 'overview') return 'all';

    var sections = getBagSectionList();
    for (var index = 0; index < sections.length; index++) {
      if (sections[index].id === sectionId) return sectionId;
    }
    return 'all';
  }

  function getBagSectionMeta(sectionId) {
    var resolvedId = resolveBagSection(sectionId);
    var sections = getBagSectionList();
    for (var index = 0; index < sections.length; index++) {
      if (sections[index].id === resolvedId) return sections[index];
    }
    return sections[0];
  }

  function getBagFilterValue(sectionId) {
    var resolvedSection = resolveBagSection(sectionId);
    if (!Object.prototype.hasOwnProperty.call(_bagFilterState, resolvedSection)) return 'all';
    return _bagFilterState[resolvedSection] || 'all';
  }

  function normalizeBagFilterValue(sectionId, options) {
    var resolvedSection = resolveBagSection(sectionId);
    if (!Object.prototype.hasOwnProperty.call(_bagFilterState, resolvedSection)) return 'all';

    var activeValue = _bagFilterState[resolvedSection] || 'all';
    if (activeValue === 'all') return activeValue;

    var exists = false;
    (options || []).forEach(function(option) {
      if (option && option.id === activeValue) {
        exists = true;
      }
    });

    if (!exists) {
      _bagFilterState[resolvedSection] = 'all';
      return 'all';
    }

    return activeValue;
  }

  function buildSimpleFilterBarHtml(label, summaryText, activeValue, options) {
    var html = '<div class="bag-filter-bar bag-filter-bar-fixed">';
    html += '<div class="bag-filter-head">';
    html += '<div class="bag-filter-label">' + escapeHtml(label) + '</div>';
    if (summaryText) {
      html += '<div class="bag-filter-summary">' + escapeHtml(summaryText) + '</div>';
    }
    html += '</div>';
    html += '<div class="bag-filter-chip-row">';
    html += '<button class="bag-filter-chip' + (activeValue === 'all' ? ' active' : '') + '" type="button" onclick="GameHUD.setBagFilterValue(\'all\')">' + escapeHtml(t('hud.modal.filters.all', null, 'All')) + '</button>';
    (options || []).forEach(function(option) {
      if (!option) return;
      html += '<button class="bag-filter-chip' + (activeValue === option.id ? ' active' : '') + '" type="button" onclick="GameHUD.setBagFilterValue(\'' + option.id + '\')">';
      html += '<span>' + escapeHtml(option.label) + '</span>';
      html += '<span class="bag-filter-chip-count">' + escapeHtml(String(option.count || 0)) + '</span>';
      html += '</button>';
    });
    html += '</div></div>';
    return html;
  }

  function buildBagLoadoutFilterOptions(bagData) {
    var countBySlot = {};

    bagData.gearItems.forEach(function(item) {
      if (!item.slotId) return;
      countBySlot[item.slotId] = (countBySlot[item.slotId] || 0) + 1;
    });

    return bagData.equippedSlots.map(function(slotInfo) {
      return {
        id: slotInfo.slotId,
        label: slotInfo.label,
        count: countBySlot[slotInfo.slotId] || 0
      };
    });
  }

  function buildBagWeaponFilterOptions(bagData) {
    var profileMap = {};
    var profileOrder = [];

    bagData.weaponItems.forEach(function(item) {
      if (!profileMap[item.profileId]) {
        profileMap[item.profileId] = {
          id: item.profileId,
          label: item.profileLabel,
          count: 0
        };
        profileOrder.push(item.profileId);
      }
      profileMap[item.profileId].count += 1;
    });

    return profileOrder.map(function(profileId) {
      return profileMap[profileId];
    });
  }

  function buildBagConsumableFilterOptions(bagData) {
    var optionMap = {};

    bagData.consumables.forEach(function(item) {
      registerFilterOption(optionMap, item.filterAgeId, item.ageLabel, item.ageWeight);
    });

    return buildFilterOptionList(optionMap);
  }

  function buildBagActiveFilterBarHtml(bagData) {
    var activeSection = resolveBagSection(_bagPanelState.section);

    if (activeSection === 'loadout') {
      var loadoutOptions = buildBagLoadoutFilterOptions(bagData);
      var loadoutValue = normalizeBagFilterValue('loadout', loadoutOptions);
      return buildSimpleFilterBarHtml(
        t('hud.modal.bag.filters.loadoutLabel', null, 'Slot'),
        t('hud.modal.bag.filters.loadoutSummary', null, 'Filter the slot cards without leaving the player view.'),
        loadoutValue,
        loadoutOptions
      );
    }

    if (activeSection === 'weapons') {
      var weaponOptions = buildBagWeaponFilterOptions(bagData);
      var weaponValue = normalizeBagFilterValue('weapons', weaponOptions);
      return buildSimpleFilterBarHtml(
        t('hud.modal.bag.filters.weaponsLabel', null, 'Class'),
        t('hud.modal.bag.filters.weaponsSummary', null, 'Filter the weapon cards while keeping the Q-cycle state visible.'),
        weaponValue,
        weaponOptions
      );
    }

    if (activeSection === 'consumables') {
      var consumableOptions = buildBagConsumableFilterOptions(bagData);
      var consumableValue = normalizeBagFilterValue('consumables', consumableOptions);
      return buildSimpleFilterBarHtml(
        t('hud.modal.bag.filters.consumablesLabel', null, 'Age'),
        t('hud.modal.bag.filters.consumablesSummary', null, 'Keep the consumable list fixed while narrowing it by age.'),
        consumableValue,
        consumableOptions
      );
    }

    normalizeFilterState(_inventoryFilterState, _inventoryFilterState.mode === 'age' ? bagData.inventoryAgeOptions : bagData.inventoryTypeOptions);
    return buildBagFilterToolbarHtml('Inventory', _inventoryFilterState, bagData.inventoryTypeOptions, bagData.inventoryAgeOptions, t('hud.modal.inventory.showing', { shown: bagData.items.filter(function(item) {
      return matchesBagFilter(item, _inventoryFilterState);
    }).length, total: bagData.items.length }, 'Showing {shown}/{total}'));
  }

  function getEquipmentSlotIcon(slotId) {
    if (slotId === 'weapon') return '⚔️';
    if (slotId === 'offhand') return '🛡️';
    if (slotId === 'armor') return '🦺';
    if (slotId === 'boots') return '👟';
    return '🧰';
  }

  function collectBagData() {
    var player = GameState.getPlayer();
    var inventory = GameState.getInventory();
    var items = [];
    var inventoryTypeOptionsMap = {};
    var inventoryAgeOptionsMap = {};
    var totalQuantity = 0;
    var consumableQuantity = 0;

    for (var itemId in inventory) {
      if (!inventory.hasOwnProperty(itemId) || inventory[itemId] <= 0) continue;

      var entity = GameRegistry.getEntity(itemId);
      if (!entity || (entity.type !== 'equipment' && entity.type !== 'consumable')) continue;

      var itemSummary = entity.type === 'equipment'
        ? getEquipmentStatSummary(itemId, { shortLabels: true })
        : (entity.description || '');
      var ageId = getEntityUnlockAgeId(entity);
      var filterAgeId = getFilterAgeId(ageId);
      var categoryMeta = getItemCategoryMeta(entity);
      var amount = Number(inventory[itemId]) || 0;

      registerFilterOption(inventoryTypeOptionsMap, categoryMeta.id, categoryMeta.label, categoryMeta.order);
      registerFilterOption(inventoryAgeOptionsMap, filterAgeId, getFilterAgeLabel(filterAgeId), getAgeSortWeight(filterAgeId));

      totalQuantity += amount;
      if (entity.type === 'consumable') consumableQuantity += amount;

      items.push({
        itemId: itemId,
        icon: getEntityIcon(entity),
        name: entity.name || itemId,
        count: amount,
        ageLabel: getAgeLabel(ageId),
        filterAgeId: filterAgeId,
        ageWeight: getAgeSortWeight(filterAgeId),
        categoryMeta: categoryMeta,
        primaryTag: entity.type === 'equipment' ? getEquipmentSlotLabel(entity.slot) : t('hud.modal.inventory.consumable', null, 'Consumable'),
        tooltip: [entity.name || itemId, itemSummary, getAgeLabel(ageId), entity.type === 'equipment' ? getEquipmentSlotLabel(entity.slot) : t('hud.modal.inventory.consumable', null, 'Consumable')].filter(function(part) {
          return !!part;
        }).join(' • '),
        clickable: entity.type === 'equipment',
        isConsumable: entity.type === 'consumable',
        isEquipped: entity.type === 'equipment' && player.equipped && player.equipped[entity.slot] === itemId,
        slotId: entity.slot || null,
        statSummary: itemSummary,
        description: entity.description || ''
      });
    }

    items.sort(function(left, right) {
      if (left.isEquipped !== right.isEquipped) return left.isEquipped ? -1 : 1;
      if (left.categoryMeta.order !== right.categoryMeta.order) return left.categoryMeta.order - right.categoryMeta.order;
      if (left.ageWeight !== right.ageWeight) return left.ageWeight - right.ageWeight;
      return left.name.localeCompare(right.name);
    });

    var weaponItems = getWeaponSwitchItems ? getWeaponSwitchItems() : [];
    var weaponSummary = getWeaponCycleSummary ? getWeaponCycleSummary(weaponItems) : {
      equipped: null,
      enabledCount: 0,
      totalCount: weaponItems.length
    };
    var equippedSlots = ['weapon', 'offhand', 'armor', 'boots'].map(function(slotId) {
      var equippedId = player && player.equipped ? player.equipped[slotId] : null;
      var equippedEntity = equippedId ? GameRegistry.getEntity(equippedId) : null;
      return {
        slotId: slotId,
        label: getEquipmentSlotLabel(slotId),
        icon: getEquipmentSlotIcon(slotId),
        itemId: equippedId,
        entity: equippedEntity,
        summary: equippedId ? getEquipmentStatSummary(equippedId, { shortLabels: true }) : ''
      };
    });

    return {
      player: player,
      items: items,
      totalStacks: items.length,
      totalQuantity: totalQuantity,
      consumables: items.filter(function(item) { return item.isConsumable; }),
      gearItems: items.filter(function(item) { return !item.isConsumable; }),
      consumableQuantity: consumableQuantity,
      inventoryTypeOptions: buildFilterOptionList(inventoryTypeOptionsMap),
      inventoryAgeOptions: buildFilterOptionList(inventoryAgeOptionsMap),
      weaponItems: weaponItems,
      weaponSummary: weaponSummary,
      equippedSlots: equippedSlots,
      equippedCount: equippedSlots.filter(function(entry) { return !!entry.itemId; }).length
    };
  }

  function getBagSectionCountText(sectionId, bagData) {
    if (!bagData) return '';
    if (sectionId === 'loadout') {
      return t('hud.modal.bag.counts.loadout', { current: bagData.equippedCount, total: bagData.equippedSlots.length }, '{current}/{total} equipped');
    }
    if (sectionId === 'weapons') {
      return t('hud.modal.bag.counts.weapons', { enabled: bagData.weaponSummary.enabledCount, total: bagData.weaponSummary.totalCount }, '{enabled}/{total} on Q');
    }
    if (sectionId === 'consumables') {
      return t('hud.modal.bag.counts.consumables', { stacks: bagData.consumables.length, total: bagData.consumableQuantity }, '{stacks} stacks • {total} total');
    }
    if (sectionId === 'all') {
      return t('hud.modal.bag.counts.all', { stacks: bagData.totalStacks, total: bagData.totalQuantity }, '{stacks} stacks • {total} total');
    }
    return '';
  }

  function buildBagSubtabBarHtml(bagData) {
    var activeSection = resolveBagSection(_bagPanelState.section);
    var html = '<div class="bag-subtab-bar">';

    getBagSectionList().forEach(function(section) {
      html += '<button class="bag-subtab' + (activeSection === section.id ? ' active' : '') + '" type="button" onclick="GameHUD.setBagSection(\'' + section.id + '\')">';
      html += '<span class="bag-subtab-icon">' + section.icon + '</span>';
      html += '<span class="bag-subtab-copy">';
      html += '<span class="bag-subtab-label">' + escapeHtml(section.label) + '</span>';
      html += '<span class="bag-subtab-meta">' + escapeHtml(getBagSectionCountText(section.id, bagData)) + '</span>';
      html += '</span></button>';
    });

    html += '</div>';
    return html;
  }

  function getPreviewItemsForBagSection(bagData) {
    var activeSection = resolveBagSection(_bagPanelState.section);
    var previewItems = bagData.items;

    if (activeSection === 'loadout') {
      previewItems = bagData.gearItems;
    } else if (activeSection === 'weapons') {
      previewItems = bagData.items.filter(function(item) { return item.categoryMeta.id === 'weapon'; });
    } else if (activeSection === 'consumables') {
      previewItems = bagData.consumables;
    } else if (activeSection === 'all') {
      normalizeFilterState(_inventoryFilterState, _inventoryFilterState.mode === 'age' ? bagData.inventoryAgeOptions : bagData.inventoryTypeOptions);
      previewItems = bagData.items.filter(function(item) {
        return matchesBagFilter(item, _inventoryFilterState);
      });
    }

    if (!previewItems.length) previewItems = bagData.items;
    return previewItems.slice(0, 4);
  }

  function buildBagSummaryCardHtml(config) {
    var html = '<div class="bag-summary-card' + (config.accentClass ? ' ' + config.accentClass : '') + '">';
    html += '<div class="bag-summary-card-top">';
    html += '<div class="bag-summary-card-icon">' + (config.icon || '✨') + '</div>';
    html += '<div class="bag-summary-card-kicker">' + escapeHtml(config.kicker || '') + '</div>';
    html += '</div>';
    html += '<div class="bag-summary-card-title">' + escapeHtml(config.title || '') + '</div>';
    html += '<div class="bag-summary-card-value">' + escapeHtml(String(config.value || '0')) + '</div>';
    if (config.copy) {
      html += '<div class="bag-summary-card-copy">' + escapeHtml(config.copy) + '</div>';
    }
    if (config.actionHtml) {
      html += '<div class="bag-summary-card-actions">' + config.actionHtml + '</div>';
    }
    html += '</div>';
    return html;
  }

  function buildBagSidebarMetricHtml(config) {
    var html = '<div class="bag-sidebar-metric' + (config.accentClass ? ' ' + config.accentClass : '') + '">';
    html += '<div class="bag-sidebar-metric-top">';
    html += '<span class="bag-sidebar-metric-icon">' + (config.icon || '✨') + '</span>';
    html += '<span class="bag-sidebar-metric-label">' + escapeHtml(config.label || '') + '</span>';
    html += '</div>';
    html += '<div class="bag-sidebar-metric-value">' + escapeHtml(String(config.value !== undefined && config.value !== null ? config.value : '0')) + '</div>';
    if (config.meta) {
      html += '<div class="bag-sidebar-metric-meta">' + escapeHtml(config.meta) + '</div>';
    }
    html += '</div>';
    return html;
  }

  function buildCompactTagListHtml(tags) {
    if (!tags || !tags.length) return '';

    var html = '<div class="craft-compact-tags">';
    tags.forEach(function(tag) {
      if (!tag || !tag.label) return;
      html += '<span class="inventory-chip' + (tag.tone ? ' ' + tag.tone : '') + '">' + escapeHtml(tag.label) + '</span>';
    });
    html += '</div>';
    return html;
  }

  function getStatusBadgeTone(statusClass) {
    if (statusClass === 'done') return 'done';
    if (statusClass === 'ready') return 'ready';
    if (statusClass === 'locked') return 'locked';
    return 'pending';
  }

  function buildCompactManagementCardHtml(config) {
    var cardClass = 'craft-compact-card management-compact-card';
    if (config.kind) cardClass += ' ' + config.kind;
    if (config.statusClass) cardClass += ' ' + config.statusClass;
    var nameText = config.name || '';
    var copyText = config.copy || '';
    var copyTooltip = config.copyTooltip || copyText;

    var html = '<div class="' + cardClass + '"' + (config.focusId ? ' data-modal-focus-id="' + escapeHtml(config.focusId) + '"' : '') + '>';
    // Row 1: icon + name + button
    html += '<div class="craft-compact-top">';
    html += '<div class="craft-compact-identity">';
    html += '<div class="management-icon ' + escapeHtml(config.iconTone || 'build') + '">' + (config.icon || '✨') + '</div>';
    html += '<div class="craft-compact-name"' + buildOverflowTitleAttr(nameText) + '>' + escapeHtml(nameText) + '</div>';
    html += '</div>';
    if (config.actionHtml) {
      html += '<div class="craft-compact-action">' + config.actionHtml + '</div>';
    }
    html += '</div>';
    // Row 2: description
    if (copyText) {
      html += '<div class="management-compact-copy"' + buildOverflowTitleAttr(copyTooltip) + '>' + escapeHtml(copyText) + '</div>';
    }
    // Row 3: resource rows
    if (config.rows && config.rows.length) {
      config.rows.forEach(function(row) {
        if (!row || !row.html) return;
        html += '<div class="craft-compact-row">';
        if (row.label) {
          html += '<div class="craft-compact-row-label">' + escapeHtml(row.label) + '</div>';
        }
        html += row.html;
        html += '</div>';
      });
    }
    if (config.noteText) {
      html += '<div class="craft-compact-note"' + buildOverflowTitleAttr(config.noteText) + '>' + escapeHtml(config.noteText) + '</div>';
    }
    html += '</div>';
    return html;
  }

  function buildBagInlineListHtml(items, emptyText) {
    if (!items || !items.length) {
      return '<div class="empty-state inline">' + escapeHtml(emptyText) + '</div>';
    }

    var html = '<div class="bag-inline-list">';
    items.forEach(function(item) {
      html += '<div class="bag-inline-row">';
      html += '<div class="bag-inline-row-main">';
      html += '<span class="bag-inline-row-icon">' + (item.icon || '✨') + '</span>';
      html += '<span class="bag-inline-row-name">' + escapeHtml(item.name || '') + '</span>';
      html += '</div>';
      html += '<span class="bag-inline-row-meta">' + escapeHtml(item.meta || '') + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function getBagSectionForEquipmentSlot(slotId) {
    return slotId === 'weapon' ? 'weapons' : 'loadout';
  }

  function openCraftForEquipmentSlot(slotId) {
    _craftFilterState.mode = 'type';
    _craftFilterState.value = slotId || 'all';

    if (getModalActive()) {
      switchModalTab('craft');
      renderModalLeftSide();
      return;
    }

    openModal({ tab: 'craft' });
  }

  function buildEquipmentOverlaySlotHtml(slotInfo) {
    var targetSection = getBagSectionForEquipmentSlot(slotInfo.slotId);
    var activeTab = getModalTab();
    var activeSection = resolveBagSection(_bagPanelState.section);
    var slotClass = 'equipment-overlay-slot' + (slotInfo.itemId ? ' has-item' : ' is-empty');
    if (activeTab === 'bag' && activeSection === targetSection) {
      slotClass += ' is-active';
    } else if (activeTab === 'craft' && _craftFilterState.mode === 'type' && _craftFilterState.value === slotInfo.slotId) {
      slotClass += ' is-active';
    }

    var itemLabel = slotInfo.entity ? slotInfo.entity.name : t('hud.equipment.empty', null, 'Empty');
    var tooltip = slotInfo.label + ' • ' + itemLabel;
    if (slotInfo.summary) {
      tooltip += ' • ' + slotInfo.summary;
    }

    var itemIconHtml = '';
    if (slotInfo.itemId && slotInfo.entity) {
      itemIconHtml = '<span class="equipment-overlay-slot-icon">' + getEntityIcon(slotInfo.entity) + '</span>';
    }

    return '<button class="' + slotClass + '" data-slot-id="' + slotInfo.slotId + '" type="button" title="' + escapeHtml(tooltip) + '" onclick="GameHUD.openCraftForEquipmentSlot(\'' + slotInfo.slotId + '\')">' +
      '<span class="equipment-overlay-slot-badge">' + escapeHtml(slotInfo.icon) + '</span>' +
      itemIconHtml +
      '<span class="equipment-overlay-slot-label">' + escapeHtml(slotInfo.label) + '</span>' +
      '</button>';
  }

  function buildLoadoutSlotCardHtml(slotInfo, candidates) {
    var html = '<div class="loadout-slot-card' + (slotInfo.itemId ? ' equipped' : '') + '">';
    html += '<div class="loadout-slot-header">';
    html += '<div class="loadout-slot-label">' + slotInfo.icon + ' ' + escapeHtml(slotInfo.label) + '</div>';
    if (slotInfo.itemId) {
      html += '<button class="btn btn-secondary" type="button" onclick="GameActions.unequip(\'' + slotInfo.slotId + '\'); GameHUD.updateModal();">' + escapeHtml(t('hud.modal.bag.loadout.unequip', null, 'Unequip')) + '</button>';
    }
    html += '</div>';

    if (slotInfo.itemId) {
      html += '<div class="loadout-slot-item">' + escapeHtml(slotInfo.entity ? slotInfo.entity.name : slotInfo.itemId) + '</div>';
      html += '<div class="loadout-slot-copy">' + escapeHtml(slotInfo.summary || t('hud.modal.bag.loadout.equippedNow', null, 'Currently active in this slot.')) + '</div>';
    } else {
      html += '<div class="loadout-slot-empty">' + escapeHtml(t('hud.modal.bag.loadout.emptySlot', null, 'Nothing equipped in this slot yet.')) + '</div>';
    }

    if (candidates && candidates.length) {
      html += '<div class="loadout-choice-list">';
      candidates.forEach(function(candidate) {
        html += '<button class="loadout-choice-button" type="button" onclick="GameActions.equip(\'' + candidate.itemId + '\'); GameHUD.updateModal();">';
        html += '<span class="loadout-choice-main">';
        html += '<span class="loadout-choice-icon">' + candidate.icon + '</span>';
        html += '<span class="loadout-choice-copy">';
        html += '<span class="loadout-choice-name">' + escapeHtml(candidate.name) + '</span>';
        html += '<span class="loadout-choice-meta">' + escapeHtml(candidate.statSummary || candidate.ageLabel) + '</span>';
        html += '</span></span>';
        html += '<span class="loadout-choice-count">x' + escapeHtml(String(candidate.count)) + '</span>';
        html += '</button>';
      });
      html += '</div>';
    } else if (!slotInfo.itemId) {
      html += '<div class="loadout-slot-copy muted">' + escapeHtml(t('hud.modal.bag.loadout.noCandidates', null, 'No matching gear in your backpack yet.')) + '</div>';
    }

    html += '</div>';
    return html;
  }

  function buildWeaponManagementCardHtml(item) {
    var html = '<div class="bag-weapon-card' + (item.isEquipped ? ' active' : '') + (item.cycleEnabled ? '' : ' muted') + '">';
    html += '<div class="bag-weapon-card-top">';
    html += '<div class="bag-weapon-card-identity">';
    html += '<div class="bag-weapon-card-icon">' + item.icon + '</div>';
    html += '<div class="bag-weapon-card-copy">';
    html += '<div class="bag-weapon-card-name">' + escapeHtml(item.name) + '</div>';
    html += '<div class="bag-weapon-card-meta">' + escapeHtml(item.profileLabel + (item.statsText ? ' • ' + item.statsText : '')) + '</div>';
    html += '</div></div>';
    html += '<div class="bag-weapon-card-stat">ATK ' + escapeHtml(String(item.attackValue)) + '</div>';
    html += '</div>';
    html += '<div class="bag-weapon-card-actions">';
    html += '<label class="bag-inline-toggle" onclick="event.stopPropagation()">';
    html += '<input type="checkbox" ' + (item.cycleEnabled ? 'checked ' : '') + 'onclick="event.stopPropagation()" onchange="GameHUD.setWeaponCycleEnabled(\'' + item.weaponId + '\', this.checked)">';
    html += '<span>' + escapeHtml(t('hud.modal.bag.weapons.useInCycle', null, 'Include in Q cycle')) + '</span>';
    html += '</label>';
    html += '<button class="btn ' + (item.isEquipped ? 'btn-secondary' : 'btn-primary') + '" type="button" onclick="GameHUD.activateWeaponById(\'' + item.weaponId + '\')"' + (item.isEquipped ? ' disabled' : '') + '>' + escapeHtml(item.isEquipped ? t('hud.modal.bag.weapons.equipped', null, 'Equipped') : t('hud.modal.bag.weapons.equipNow', null, 'Equip now')) + '</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function buildBagOverviewHtml(bagData) {
    var equippedWeapon = bagData.weaponSummary.equipped;
    var topConsumable = bagData.consumables.length ? bagData.consumables[0] : null;
    var html = '<div class="bag-summary-grid">';
    html += buildBagSummaryCardHtml({
      icon: '🛡️',
      kicker: t('hud.modal.bag.summary.loadout', null, 'Loadout'),
      title: t('hud.modal.bag.summary.loadoutTitle', null, 'Equipped Slots'),
      value: bagData.equippedCount + '/' + bagData.equippedSlots.length,
      copy: t('hud.modal.bag.summary.loadoutCopy', null, 'Check every equipped slot before heading back into combat.'),
      actionHtml: '<button class="btn btn-secondary" type="button" onclick="GameHUD.setBagSection(\'loadout\')">' + escapeHtml(t('hud.modal.bag.summary.openLoadout', null, 'Open loadout')) + '</button>',
      accentClass: 'loadout'
    });
    html += buildBagSummaryCardHtml({
      icon: equippedWeapon ? equippedWeapon.icon : '⚔️',
      kicker: t('hud.modal.bag.summary.weapons', null, 'Weapons'),
      title: equippedWeapon ? equippedWeapon.name : t('hud.modal.bag.summary.noWeapon', null, 'No weapon equipped'),
      value: bagData.weaponSummary.enabledCount + '/' + bagData.weaponSummary.totalCount,
      copy: t('hud.modal.bag.summary.weaponsCopy', null, 'These are the weapons currently allowed in the Q quick cycle.'),
      actionHtml: '<button class="btn btn-secondary" type="button" onclick="GameHUD.setBagSection(\'weapons\')">' + escapeHtml(t('hud.modal.bag.summary.manageWeapons', null, 'Manage weapons')) + '</button>',
      accentClass: 'weapons'
    });
    html += buildBagSummaryCardHtml({
      icon: topConsumable ? topConsumable.icon : '🍖',
      kicker: t('hud.modal.bag.summary.consumables', null, 'Consumables'),
      title: topConsumable ? topConsumable.name : t('hud.modal.bag.summary.noConsumables', null, 'No consumables carried'),
      value: bagData.consumableQuantity,
      copy: t('hud.modal.bag.summary.consumablesCopy', null, 'Food and one-use recovery items are separated for faster access.'),
      actionHtml: '<button class="btn btn-secondary" type="button" onclick="GameHUD.setBagSection(\'consumables\')">' + escapeHtml(t('hud.modal.bag.summary.openConsumables', null, 'Open consumables')) + '</button>',
      accentClass: 'consumables'
    });
    html += buildBagSummaryCardHtml({
      icon: '🎒',
      kicker: t('hud.modal.bag.summary.backpack', null, 'Backpack'),
      title: t('hud.modal.bag.summary.backpackTitle', null, 'Carried Stacks'),
      value: bagData.totalStacks,
      copy: t('hud.modal.bag.summary.backpackCopy', null, 'Use the all-items sub-tab when you need full filtering and category browsing.'),
      actionHtml: '<button class="btn btn-secondary" type="button" onclick="GameHUD.setBagSection(\'all\')">' + escapeHtml(t('hud.modal.bag.summary.openAll', null, 'Browse all items')) + '</button>',
      accentClass: 'backpack'
    });
    html += '</div>';

    html += '<div class="bag-detail-grid">';
    html += '<div class="bag-detail-card">';
    html += '<div class="bag-detail-card-header"><div class="bag-detail-card-title">' + escapeHtml(t('hud.modal.bag.overview.currentLoadout', null, 'Current Loadout')) + '</div><div class="bag-detail-card-copy">' + escapeHtml(t('hud.modal.bag.overview.currentLoadoutCopy', null, 'See exactly what is active on each slot right now.')) + '</div></div>';
    html += buildBagInlineListHtml(bagData.equippedSlots.map(function(slotInfo) {
      return {
        icon: slotInfo.icon,
        name: slotInfo.label,
        meta: slotInfo.itemId ? ((slotInfo.entity ? slotInfo.entity.name : slotInfo.itemId) + (slotInfo.summary ? ' • ' + slotInfo.summary : '')) : t('hud.equipment.empty', null, 'Empty')
      };
    }), t('hud.modal.bag.overview.noLoadout', null, 'No gear is equipped yet.'));
    html += '</div>';

    html += '<div class="bag-detail-card">';
    html += '<div class="bag-detail-card-header"><div class="bag-detail-card-title">' + escapeHtml(t('hud.modal.bag.overview.cycleTitle', null, 'Weapon Cycle Snapshot')) + '</div><div class="bag-detail-card-copy">' + escapeHtml(t('hud.modal.bag.overview.cycleCopy', null, 'Disabled weapons stay out of Q until you tick them back on.')) + '</div></div>';
    html += buildBagInlineListHtml(bagData.weaponItems.map(function(item) {
      return {
        icon: item.icon,
        name: item.name,
        meta: (item.cycleEnabled ? t('hud.modal.bag.overview.inCycle', null, 'In Q cycle') : t('hud.modal.bag.overview.skippedCycle', null, 'Skipped by Q')) + (item.isEquipped ? ' • ' + t('hud.modal.bag.weapons.equipped', null, 'Equipped') : '')
      };
    }), t('hud.modal.bag.overview.noWeapons', null, 'No carried weapons yet.'));
    html += '</div>';

    html += '<div class="bag-detail-card wide">';
    html += '<div class="bag-detail-card-header"><div class="bag-detail-card-title">' + escapeHtml(t('hud.modal.bag.overview.consumablesTitle', null, 'Consumables Ready')) + '</div><div class="bag-detail-card-copy">' + escapeHtml(t('hud.modal.bag.overview.consumablesCopy', null, 'This keeps your recovery items separate from gear so they are easier to scan.')) + '</div></div>';
    if (bagData.consumables.length) {
      html += '<div class="inventory-compact-list bag-inline-card-list">';
      bagData.consumables.slice(0, 4).forEach(function(item) {
        html += buildInventoryItemCardHtml(item);
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">' + escapeHtml(t('hud.modal.bag.overview.noConsumables', null, 'No consumables in the backpack right now.')) + '</div>';
    }
    html += '</div>';
    html += '</div>';

    return html;
  }

  function buildBagLoadoutHtml(bagData) {
    var loadoutFilterOptions = buildBagLoadoutFilterOptions(bagData);
    var activeFilter = normalizeBagFilterValue('loadout', loadoutFilterOptions);
    var filteredSlots = bagData.equippedSlots.filter(function(slotInfo) {
      return activeFilter === 'all' || slotInfo.slotId === activeFilter;
    });

    var html = '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div><div class="section-kicker">' + escapeHtml(t('hud.modal.bag.loadout.kicker', null, 'Slot Control')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.bag.loadout.title', null, 'Loadout By Slot')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.bag.loadout.copy', null, 'Each slot shows what is equipped now and what can replace it immediately from the backpack.')) + '</div></div>';
    html += '<div class="section-action-group"><span class="status-chip ready">' + escapeHtml(t('hud.modal.bag.loadout.filledCount', { current: bagData.equippedCount, total: bagData.equippedSlots.length }, '{current}/{total} filled')) + '</span><span class="status-chip neutral">' + escapeHtml(t('hud.modal.inventory.showing', { shown: filteredSlots.length, total: bagData.equippedSlots.length }, 'Showing {shown}/{total}')) + '</span></div>';
    html += '</div>';

    if (filteredSlots.length) {
      html += '<div class="loadout-grid">';
      filteredSlots.forEach(function(slotInfo) {
        var candidates = bagData.gearItems.filter(function(item) {
          return item.slotId === slotInfo.slotId && !item.isEquipped;
        });
        html += buildLoadoutSlotCardHtml(slotInfo, candidates);
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">' + escapeHtml(t('hud.modal.bag.loadout.emptyFilter', null, 'No loadout slot matches this filter.')) + '</div>';
    }

    html += '</div>';
    return html;
  }

  function buildBagWeaponsHtml(bagData) {
    if (!bagData.weaponItems.length) {
      return '<div class="empty-state">' + escapeHtml(t('hud.modal.bag.weapons.empty', null, 'Carry or equip at least one weapon to manage the quick cycle here.')) + '</div>';
    }

    var weaponFilterOptions = buildBagWeaponFilterOptions(bagData);
    var activeFilter = normalizeBagFilterValue('weapons', weaponFilterOptions);
    var filteredWeapons = bagData.weaponItems.filter(function(item) {
      return activeFilter === 'all' || item.profileId === activeFilter;
    });

    var html = '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div><div class="section-kicker">' + escapeHtml(t('hud.modal.bag.weapons.kicker', null, 'Cycle Control')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.bag.weapons.title', null, 'Weapon Loadout')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.bag.weapons.copy', null, 'Untick any weapon you do not want to appear when you press Q, then equip the one you need right away.')) + '</div></div>';
    html += '<div class="section-action-group">';
    html += '<span class="status-chip ready">' + escapeHtml(t('hud.modal.bag.weapons.enabledCount', { enabled: bagData.weaponSummary.enabledCount, total: bagData.weaponSummary.totalCount }, '{enabled}/{total} in Q')) + '</span>';
    html += '<span class="status-chip neutral">' + escapeHtml(t('hud.modal.inventory.showing', { shown: filteredWeapons.length, total: bagData.weaponItems.length }, 'Showing {shown}/{total}')) + '</span>';
    if (bagData.weaponSummary.equipped) {
      html += '<span class="status-chip neutral">' + escapeHtml(t('hud.modal.bag.weapons.equippedNow', { name: bagData.weaponSummary.equipped.name }, 'Equipped: {name}')) + '</span>';
    }
    html += '</div></div>';

    if (filteredWeapons.length) {
      html += '<div class="bag-weapon-grid">';
      filteredWeapons.forEach(function(item) {
        html += buildWeaponManagementCardHtml(item);
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">' + escapeHtml(t('hud.modal.bag.weapons.emptyFilter', null, 'No weapon matches this filter.')) + '</div>';
    }

    html += '</div>';

    return html;
  }

  function buildBagConsumablesHtml(bagData) {
    var consumableFilterOptions = buildBagConsumableFilterOptions(bagData);
    var activeFilter = normalizeBagFilterValue('consumables', consumableFilterOptions);
    var filteredConsumables = bagData.consumables.filter(function(item) {
      return activeFilter === 'all' || item.filterAgeId === activeFilter;
    });

    var html = '<div class="panel-section">';
    html += '<div class="section-header">';
    html += '<div><div class="section-kicker">' + escapeHtml(t('hud.modal.bag.consumables.kicker', null, 'Recovery')) + '</div><div class="section-title">' + escapeHtml(t('hud.modal.bag.consumables.title', null, 'Consumables')) + '</div><div class="section-copy">' + escapeHtml(t('hud.modal.bag.consumables.copy', null, 'Food and one-shot supplies are separated here so you can find them without scanning through weapons and armor.')) + '</div></div>';
    html += '<div class="section-action-group"><span class="status-chip ready">' + escapeHtml(t('hud.modal.bag.consumables.totalCount', { stacks: bagData.consumables.length, total: bagData.consumableQuantity }, '{stacks} stacks • {total} total')) + '</span><span class="status-chip neutral">' + escapeHtml(t('hud.modal.inventory.showing', { shown: filteredConsumables.length, total: bagData.consumables.length }, 'Showing {shown}/{total}')) + '</span></div>';
    html += '</div>';

    if (filteredConsumables.length) {
      html += '<div class="bag-consumable-grid">';
      filteredConsumables.forEach(function(item) {
        html += buildInventoryItemCardHtml(item);
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">' + escapeHtml(t('hud.modal.bag.consumables.emptyFilter', null, 'No consumable matches this filter.')) + '</div>';
    }

    html += '</div>';
    return html;
  }

  function buildBagAllItemsHtml(bagData) {
    normalizeFilterState(_inventoryFilterState, _inventoryFilterState.mode === 'age' ? bagData.inventoryAgeOptions : bagData.inventoryTypeOptions);

    var filteredItems = bagData.items.filter(function(item) {
      return matchesBagFilter(item, _inventoryFilterState);
    });
    var groupedItems = {};

    filteredItems.forEach(function(item) {
      var group = ensureGroupedSection(groupedItems, item.categoryMeta);
      group.entries.push({ html: buildInventoryItemCardHtml(item) });
    });

    var groupList = [];
    for (var groupId in groupedItems) {
      if (!groupedItems.hasOwnProperty(groupId)) continue;
      groupList.push(groupedItems[groupId]);
    }
    groupList.sort(function(left, right) {
      return left.meta.order - right.meta.order;
    });

    var html = '<div class="bag-all-items-shell">';

    if (groupList.length) {
      html += '<div class="bag-all-items-groups">';
      groupList.forEach(function(group) {
        html += buildInventoryGroupHtml(group);
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">' + escapeHtml(t('hud.modal.inventory.emptyFilter', null, 'No matching items for this filter.')) + '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderModalBag() {
    renderModalResources();
  }

  function setBagSection(sectionId) {
    var nextSection = resolveBagSection(sectionId);
    var sectionChanged = _bagPanelState.section !== nextSection;
    _bagPanelState.section = nextSection;

    if (getModalTab() !== 'bag') {
      if (getModalActive()) {
        switchModalTab('resources');
        renderModalLeftSide();
      } else {
        setModalTab('resources');
      }
      return;
    }

    if (sectionChanged || getModalActive()) {
      renderModalLeftSide();
      renderModalBag();
    }
  }

  function setBagFilterValue(value) {
    var activeSection = resolveBagSection(_bagPanelState.section);
    if (!Object.prototype.hasOwnProperty.call(_bagFilterState, activeSection)) return;

    _bagFilterState[activeSection] = value || 'all';
    renderModalBag();
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

  function getTechnologyRequirementSummary(requiredIds) {
    if (!requiredIds || !requiredIds.length) return '';

    return requiredIds.map(function(reqId) {
      var reqEntity = GameRegistry.getEntity(reqId);
      return reqEntity ? reqEntity.name : reqId;
    }).slice(0, 3).join(' • ');
  }

  function collectResearchEffectTextList(effects) {
    if (!effects) return [];

    var effectItems = [];
    if (effects.harvestSpeedBonus) effectItems.push(t('hud.researchEffects.harvestSpeed', { percent: Math.round(effects.harvestSpeedBonus * 100) }, 'Harvest speed +{percent}%'));
    if (effects.productionBonus) effectItems.push(t('hud.researchEffects.production', { percent: Math.round(effects.productionBonus * 100) }, 'Production +{percent}%'));
    if (effects.storageBonus) effectItems.push(t('hud.researchEffects.storage', { percent: Math.round(effects.storageBonus * 100) }, 'Storage +{percent}%'));
    if (effects.npcSpeedBonus) effectItems.push(t('hud.researchEffects.npcSpeed', { percent: Math.round(effects.npcSpeedBonus * 100) }, 'Worker speed +{percent}%'));
    if (effects.troopDamageFlatBonus) effectItems.push(t('hud.researchEffects.troopDamage', { amount: effects.troopDamageFlatBonus }, 'Troop damage +{amount}'));
    if (effects.troopMoveSpeedBonus) effectItems.push(t('hud.researchEffects.troopMoveSpeed', { percent: Math.round(effects.troopMoveSpeedBonus * 100) }, 'Troop move speed +{percent}%'));
    if (effects.troopAttackSpeedBonus) effectItems.push(t('hud.researchEffects.troopAttackSpeed', { percent: Math.round(effects.troopAttackSpeedBonus * 100) }, 'Troop attack rate +{percent}%'));
    if (effects.barracksTrainingSpeedBonus) effectItems.push(t('hud.researchEffects.barracksTraining', { percent: Math.round(effects.barracksTrainingSpeedBonus * 100) }, 'Barracks training speed +{percent}%'));
    return effectItems;
  }

  function getResearchEffectSummary(effects) {
    return collectResearchEffectTextList(effects).slice(0, 3).join(' • ');
  }

  function buildResearchEffectsList(effects) {
    var effectItems = collectResearchEffectTextList(effects);

    if (!effectItems.length) return '';

    var html = '<div class="effect-list">';
    effectItems.forEach(function(item) {
      html += '<div class="effect-item">⚡ ' + escapeHtml(item) + '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderModalLeftSide() {
    var bagData = collectBagData();
    var player = bagData.player;

    var quickStatsContainer = document.getElementById('modal-player-quickstats');
    if (quickStatsContainer) {
      var speed = GameState.getPlayerSpeed ? GameState.getPlayerSpeed() : (player.speed || 0);
      var quickStatsHtml = '';
      quickStatsHtml += '<span class="bag-stat-chip hp">❤️ ' + Math.floor(player.hp) + '/' + GameState.getPlayerMaxHp() + '</span>';
      quickStatsHtml += '<span class="bag-stat-chip attack">⚔️ ' + GameState.getPlayerAttack() + '</span>';
      quickStatsHtml += '<span class="bag-stat-chip defense">🛡️ ' + GameState.getPlayerDefense() + '</span>';
      quickStatsHtml += '<span class="bag-stat-chip speed">⚡ ' + speed.toFixed(1) + '</span>';
      quickStatsHtml += '<span class="bag-stat-chip bag">🎒 ' + bagData.totalStacks + '</span>';
      quickStatsContainer.innerHTML = quickStatsHtml;
    }

    var modalLeft = document.querySelector('.modal-left');
    if (modalLeft) {
      modalLeft.classList.remove('compact-only');
    }

    var equipContainer = document.getElementById('modal-equipment-slots');
    if (equipContainer) {
      equipContainer.innerHTML = bagData.equippedSlots.map(function(slotInfo) {
        return buildEquipmentOverlaySlotHtml(slotInfo);
      }).join('');
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
        { label: t('hud.modal.build.metrics.storage', null, 'Storage'), value: getLevelValue(balance.storageCapacity, 1) || null },
        { label: t('hud.modal.build.metrics.defense', null, 'Defense'), value: defenseRange ? t('hud.modal.build.metrics.tiles', { count: defenseRange }, '{count} tiles') : null },
        { label: t('hud.modal.build.metrics.guards', null, 'Guards'), value: getLevelValue(balance.guardCount, 1) || null }
      ]);
      var tags = [
        { label: t('hud.modal.build.badges.placed', { count: count }, 'Placed x{count}'), tone: 'muted' }
      ];
      var ageId = getEntityUnlockAgeId(localizedBuilding);
      if (ageId) {
        tags.push({ label: getAgeLabel(ageId) });
      }
      var rows = [];
      if (costInfo.html) {
        rows.push({
          label: t('hud.modal.build.blocks.constructionCostShort', null, 'Cost'),
          html: '<div class="resource-pill-row compact">' + costInfo.html + '</div>'
        });
      }
      if (productionInfo.html) {
        rows.push({
          label: t('hud.modal.build.blocks.producesShort', null, 'Gain'),
          html: '<div class="resource-pill-row compact">' + productionInfo.html + '</div>'
        });
      }
      if (consumptionInfo.html) {
        rows.push({
          label: t('hud.modal.build.blocks.consumesShort', null, 'Use'),
          html: '<div class="resource-pill-row compact">' + consumptionInfo.html + '</div>'
        });
      }

      totalPlaced += count;

      if (!isUnlocked) {
        lockedCards.push(buildCompactManagementCardHtml({
          kind: 'build',
          focusId: building.id,
          iconTone: 'build',
          icon: getEntityIcon(building),
          name: localizedBuilding.name || building.id,
          copy: localizedBuilding.description || '',
          copyTooltip: localizedBuilding.description || '',
          statusClass: 'locked',
          statusText: t('hud.modal.build.badges.locked', null, 'Locked'),
          tags: tags,
          metricHtml: metrics,
          rows: [],
          noteText: describeUnlockProgress(UnlockSystem.getUnlockProgress(building)) || t('hud.modal.build.sections.lockedCopy', null, 'Track the missing requirements to unlock this blueprint.'),
          actionHtml: buildCompactActionButtonHtml('btn-secondary', t('hud.modal.build.action.locked', null, 'Locked'), '', true)
        }));
        return;
      }

      var canBuy = costInfo.allAffordable;
      var buildDescription = localizedBuilding.description || '';
      var cardHtml = buildCompactManagementCardHtml({
        kind: 'build',
        focusId: building.id,
        iconTone: 'build',
        icon: getEntityIcon(building),
        name: localizedBuilding.name || building.id,
        copy: buildDescription,
        copyTooltip: buildDescription,
        statusClass: canBuy ? 'ready' : 'pending',
        statusText: canBuy ? t('hud.modal.build.badges.ready', null, 'Ready') : t('hud.modal.build.badges.needStock', null, 'Need stock'),
        tags: tags,
        metricHtml: metrics,
        rows: rows,
        actionHtml: buildCompactActionButtonHtml('btn-primary', count > 0 ? t('hud.modal.build.action.placeAnother', null, 'Place another') : t('hud.modal.build.action.placeStructure', null, 'Place structure'), canBuy ? 'BuildingSystem.enterBuildMode(\'' + building.id + '\'); GameHUD.closeModal();' : '', !canBuy)
      });

      if (canBuy) {
        readyCards.push(cardHtml);
      } else {
        blockedCards.push(cardHtml);
      }
    });

    var html = '<div class="bag-workbench-shell">';
    html += '<div class="bag-workbench-toolbar build-research-toolbar">';
    html += '<div class="craft-summary-strip">';
    html += '<span class="craft-summary-chip ready">' + escapeHtml(summaryReadyLabel) + ' <strong>' + readyCards.length + '</strong></span>';
    html += '<span class="craft-summary-chip waiting">' + escapeHtml(summaryBlockedLabel) + ' <strong>' + blockedCards.length + '</strong></span>';
    if (lockedCards.length) {
      html += '<span class="craft-summary-chip locked">' + escapeHtml(t('hud.modal.build.sections.lockedTitle', null, 'Locked Structures')) + ' <strong>' + lockedCards.length + '</strong></span>';
    }
    html += '<span class="craft-summary-chip complete">' + escapeHtml(summaryPlacedLabel) + ' <strong>' + totalPlaced + '</strong></span>';
    html += '</div></div>';

    if (readyCards.length) {
      html += '<div class="panel-section workbench-section"><div class="section-header compact"><div><div class="section-title">' + escapeHtml(t('hud.modal.build.sections.readyTitle', null, 'Immediate Builds')) + '</div></div><div class="section-action-group"><span class="status-chip ready">' + escapeHtml(String(readyCards.length)) + '</span></div></div><div class="craft-compact-grid">' + readyCards.join('') + '</div></div>';
    }

    if (blockedCards.length) {
      html += '<div class="panel-section workbench-section"><div class="section-header compact"><div><div class="section-title">' + escapeHtml(t('hud.modal.build.sections.blockedTitle', null, 'Need More Materials')) + '</div></div><div class="section-action-group"><span class="status-chip pending">' + escapeHtml(String(blockedCards.length)) + '</span></div></div><div class="craft-compact-grid">' + blockedCards.join('') + '</div></div>';
    }

    if (lockedCards.length) {
      html += '<div class="panel-section workbench-section"><div class="section-header compact"><div><div class="section-title">' + escapeHtml(t('hud.modal.build.sections.lockedTitle', null, 'Locked Structures')) + '</div></div><div class="section-action-group"><span class="status-chip neutral">' + escapeHtml(String(lockedCards.length)) + '</span></div></div><div class="craft-compact-grid">' + lockedCards.join('') + '</div></div>';
    }

    html += '</div>';
    panel.innerHTML = (readyCards.length || blockedCards.length || lockedCards.length) ? html : '<div class="empty-state">' + escapeHtml(t('hud.modal.build.sections.empty', null, 'No building blueprints are available yet.')) + '</div>';
  }

  function renderModalCraft() {
    var panel = document.getElementById('modal-panel-craft');
    if (!panel) return;

    var recipes = CraftSystem.getAllRecipes();
    var craftEntries = [];
    var craftTypeOptionsMap = {};
    var craftAgeOptionsMap = {};
    var readyCount = 0;
    var waitingCount = 0;
    var lockedCount = 0;
    var equippedCount = 0;
    var summaryReadyLabel = t('hud.modal.craft.sections.readyCount', null, 'Ready now');
    var summaryWaitingLabel = t('hud.modal.craft.sections.waitingCount', null, 'Need materials');
    var summaryEquippedLabel = t('hud.modal.craft.sections.equippedCount', null, 'Already equipped');

    if (!recipes || !recipes.length) {
      panel.innerHTML = '<div class="empty-state">' + escapeHtml(t('hud.modal.craft.sections.empty', null, 'No crafting recipes are available yet.')) + '</div>';
      return;
    }

    recipes.forEach(function(recipe) {
      var localizedRecipe = GameRegistry.getEntity(recipe.id) || recipe;
      var isUnlocked = GameState.isUnlocked(recipe.id);
      var recipeInfo = CraftSystem.getRecipeInfo(recipe.id);
      var balance = recipeInfo.balance || {};
      var inputInfo = buildResourcePills(balance.input, 'cost');
      var outputKeys = balance.output ? Object.keys(balance.output) : [];
      var primaryOutputId = outputKeys.length ? outputKeys[0] : null;
      var primaryOutputEntity = primaryOutputId ? GameRegistry.getEntity(primaryOutputId) : null;
      var ageId = getEntityUnlockAgeId(primaryOutputEntity) || getEntityUnlockAgeId(localizedRecipe);
      var filterAgeId = getFilterAgeId(ageId);
      var categoryMeta = getItemCategoryMeta(primaryOutputEntity);

      registerFilterOption(craftTypeOptionsMap, categoryMeta.id, categoryMeta.label, categoryMeta.order);
      registerFilterOption(craftAgeOptionsMap, filterAgeId, getFilterAgeLabel(filterAgeId), getAgeSortWeight(filterAgeId));

      var canCraft = recipeInfo.canCraft;
      var hasInInventory = false;
      var outputEquipmentId = null;
      var isEquipped = false;
      if (balance && balance.output) {
        for (var resultId in balance.output) {
          var resultEntity = GameRegistry.getEntity(resultId);
          if (resultEntity && resultEntity.type === 'equipment') {
            outputEquipmentId = resultId;
            hasInInventory = GameState.getInventoryCount(resultId) > 0;
            var player = GameState.getPlayer();
            isEquipped = !!(player && player.equipped && player.equipped[resultEntity.slot] === resultId);
            break;
          }
        }
      }

      var actionHtml = '';
      var statusClass = 'pending';
      var statusText = t('hud.modal.craft.badges.needMaterials', null, 'Need materials');
      var statusWeight = 2;

      if (!isUnlocked) {
        statusClass = 'locked';
        statusText = t('hud.modal.craft.badges.locked', null, 'Locked');
        actionHtml = buildCompactActionButtonHtml('btn-secondary', t('hud.modal.craft.action.locked', null, 'Locked'), '', true);
        statusWeight = 3;
        lockedCount += 1;
      } else if (isEquipped) {
        statusClass = 'done';
        statusText = t('hud.modal.craft.badges.equipped', null, 'Equipped');
        actionHtml = buildCompactActionButtonHtml('btn-secondary', t('hud.modal.craft.action.equipped', null, 'Equipped'), '', true);
        statusWeight = 2;
        equippedCount += 1;
      } else if (hasInInventory && outputEquipmentId) {
        statusClass = 'ready';
        statusText = t('hud.modal.craft.badges.readyToUse', null, 'Ready to use');
        actionHtml = buildCompactActionButtonHtml('btn-success', t('hud.modal.craft.action.useItem', null, 'Use item'), 'GameActions.equip(\'' + outputEquipmentId + '\'); GameHUD.updateModal();', false);
        statusWeight = 0;
        readyCount += 1;
      } else if (canCraft) {
        statusClass = 'ready';
        statusText = t('hud.modal.craft.badges.readyToCraft', null, 'Ready to craft');
        actionHtml = buildCompactActionButtonHtml('btn-primary', t('hud.modal.craft.action.craft', null, 'Craft'), 'GameActions.craft(\'' + recipe.id + '\')', false);
        statusWeight = 1;
        readyCount += 1;
      } else {
        statusClass = 'pending';
        statusText = t('hud.modal.craft.badges.needMaterials', null, 'Need materials');
        actionHtml = buildCompactActionButtonHtml('btn-primary', t('hud.modal.craft.action.craft', null, 'Craft'), '', true);
        statusWeight = 2;
        waitingCount += 1;
      }

      var craftStatsSummary = '';
      if (outputEquipmentId) {
        craftStatsSummary = getEquipmentStatSummary(outputEquipmentId, { shortLabels: true });
      } else if (localizedRecipe.description) {
        craftStatsSummary = localizedRecipe.description;
      }

      craftEntries.push({
        recipeId: recipe.id,
        icon: getEntityIcon(primaryOutputEntity || recipe),
        name: localizedRecipe.name || recipe.id,
        primaryTag: primaryOutputEntity && primaryOutputEntity.type === 'equipment'
          ? getEquipmentSlotLabel(primaryOutputEntity.slot)
          : categoryMeta.label,
        ageLabel: getAgeLabel(ageId),
        filterAgeId: filterAgeId,
        ageWeight: getAgeSortWeight(filterAgeId),
        categoryMeta: categoryMeta,
        statusClass: statusClass,
        statusText: statusText,
        statusWeight: statusWeight,
        actionHtml: actionHtml,
        statsSummary: craftStatsSummary,
        inputHtml: inputInfo.html,
        unlockHint: !isUnlocked
          ? (describeUnlockProgress(UnlockSystem.getUnlockProgress(recipe)) || t('hud.modal.craft.lockedHint', null, 'Meet the unlock requirements to craft this item.'))
          : ''
      });
    });

    var craftTypeOptions = buildFilterOptionList(craftTypeOptionsMap);
    var craftAgeOptions = buildFilterOptionList(craftAgeOptionsMap);
    normalizeFilterState(_craftFilterState, _craftFilterState.mode === 'age' ? craftAgeOptions : craftTypeOptions);

    craftEntries.sort(function(left, right) {
      if (left.statusWeight !== right.statusWeight) return left.statusWeight - right.statusWeight;
      if (left.categoryMeta.order !== right.categoryMeta.order) return left.categoryMeta.order - right.categoryMeta.order;
      if (left.ageWeight !== right.ageWeight) return left.ageWeight - right.ageWeight;
      return left.name.localeCompare(right.name);
    });

    var filteredCraftEntries = craftEntries.filter(function(entry) {
      return matchesBagFilter(entry, _craftFilterState);
    });

    var html = '<div class="bag-workbench-shell">';
    html += '<div class="bag-workbench-toolbar">';
    html += '<div class="craft-summary-strip">';
    html += '<span class="craft-summary-chip ready">' + escapeHtml(summaryReadyLabel) + ' <strong>' + readyCount + '</strong></span>';
    html += '<span class="craft-summary-chip waiting">' + escapeHtml(summaryWaitingLabel) + ' <strong>' + waitingCount + '</strong></span>';
    html += '<span class="craft-summary-chip equipped">' + escapeHtml(summaryEquippedLabel) + ' <strong>' + equippedCount + '</strong></span>';
    if (lockedCount > 0) {
      html += '<span class="craft-summary-chip locked">' + escapeHtml(t('hud.modal.craft.sections.lockedTitle', null, 'Locked')) + ' <strong>' + lockedCount + '</strong></span>';
    }
    html += '</div>';
    html += buildBagFilterToolbarHtml('Craft', _craftFilterState, craftTypeOptions, craftAgeOptions, t('hud.modal.craft.showing', { shown: filteredCraftEntries.length, total: craftEntries.length }, 'Showing {shown}/{total}'));
    html += '</div>';

    if (filteredCraftEntries.length) {
      html += '<div class="craft-compact-grid">';
      filteredCraftEntries.forEach(function(entry) {
        html += buildCompactCraftCardHtml(entry);
      });
      html += '</div>';
    } else {
      html += '<div class="empty-state">' + escapeHtml(t('hud.modal.craft.emptyFilter', null, 'No recipes match this filter.')) + '</div>';
    }

    html += '</div>';
    panel.innerHTML = html;
  }

  function setInventoryFilterMode(mode) {
    _inventoryFilterState.mode = mode === 'age' ? 'age' : 'type';
    _inventoryFilterState.value = 'all';
    if (getModalTab() === 'bag') {
      renderModalBag();
      renderModalLeftSide();
      return;
    }
    renderModalLeftSide();
  }

  function setInventoryFilterValue(value) {
    _inventoryFilterState.value = value || 'all';
    if (getModalTab() === 'bag') {
      renderModalBag();
      renderModalLeftSide();
      return;
    }
    renderModalLeftSide();
  }

  function setCraftFilterMode(mode) {
    _craftFilterState.mode = mode === 'age' ? 'age' : 'type';
    _craftFilterState.value = 'all';
    renderModalCraft();
    renderModalLeftSide();
  }

  function setCraftFilterValue(value) {
    _craftFilterState.value = value || 'all';
    renderModalCraft();
    renderModalLeftSide();
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
      var effectsSummary = getResearchEffectSummary(balance && balance.effects);
      var statusClass = 'pending';
      var statusText = t('hud.researchPanel.status.needResources', null, 'Need resources');
      var actionHtml = buildCompactActionButtonHtml('btn-secondary', t('hud.researchPanel.status.needResources', null, 'Need resources'), '', true);

      if (isResearched) {
        statusClass = 'done';
        statusText = t('hud.researchPanel.status.completed', null, 'Completed');
        actionHtml = buildCompactActionButtonHtml('btn-secondary', t('hud.researchPanel.status.completed', null, 'Completed'), '', true);
      } else if (canResearch) {
        statusClass = 'ready';
        statusText = t('hud.researchPanel.status.readyToResearch', null, 'Ready to research');
        actionHtml = buildCompactActionButtonHtml('btn-primary', t('hud.researchPanel.actions.research', null, 'Research'), 'GameActions.researchTech(\'' + tech.id + '\')', false);
      } else if (isUnlocked && prereqsMet) {
        statusClass = 'pending';
        statusText = t('hud.researchPanel.status.needResources', null, 'Need resources');
      } else {
        statusClass = 'locked';
        statusText = isUnlocked ? t('hud.researchPanel.status.needPrerequisites', null, 'Need prerequisites') : t('hud.researchPanel.status.locked', null, 'Locked');
        actionHtml = buildCompactActionButtonHtml('btn-secondary', statusText, '', true);
      }

      var researchDescription = tech.description || '';
      var researchTooltip = researchDescription;
      if (effectsSummary) {
        researchTooltip += (researchTooltip ? ' — ' : '') + effectsSummary;
      }
      var cardHtml = buildCompactManagementCardHtml({
        kind: 'research',
        iconTone: 'research',
        icon: getEntityIcon(tech),
        name: tech.name,
        statusClass: statusClass,
        statusText: statusText,
        copy: researchDescription,
        copyTooltip: researchTooltip,
        rows: [
          !isResearched && statusClass !== 'locked' && costInfo.html ? {
            label: t('hud.researchPanel.blocks.researchCost', null, 'Research Cost'),
            html: '<div class="resource-pill-row compact">' + costInfo.html + '</div>'
          } : null
        ],
        noteText: !isUnlocked
          ? (describeUnlockProgress(UnlockSystem.getUnlockProgress(tech)) || t('hud.researchPanel.lockedHint', null, 'Meet the unlock requirements to access this research.'))
          : (!prereqsMet
            ? (getTechnologyRequirementSummary(balance && balance.requires) || t('hud.researchPanel.prerequisiteHint', null, 'Complete the required research first.'))
            : ''),
        actionHtml: actionHtml
      });

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

    var html = '<div class="bag-workbench-shell">';
    html += '<div class="bag-workbench-toolbar build-research-toolbar">';
    html += '<div class="craft-summary-strip">';
    html += '<span class="craft-summary-chip ready">' + escapeHtml(t('hud.researchPanel.sections.readySummary', null, 'Ready to research')) + ' <strong>' + readyCards.length + '</strong></span>';
    html += '<span class="craft-summary-chip waiting">' + escapeHtml(t('hud.researchPanel.sections.waitingSummary', null, 'Waiting')) + ' <strong>' + waitingCards.length + '</strong></span>';
    if (lockedCards.length) {
      html += '<span class="craft-summary-chip locked">' + escapeHtml(t('hud.researchPanel.sections.lockedTitle', null, 'Locked Technology')) + ' <strong>' + lockedCards.length + '</strong></span>';
    }
    html += '<span class="craft-summary-chip complete">' + escapeHtml(t('hud.researchPanel.sections.completedSummary', null, 'Completed')) + ' <strong>' + completeCards.length + '</strong></span>';
    html += '</div></div>';

    if (readyCards.length) {
      html += '<div class="panel-section"><div class="section-header compact"><div><div class="section-kicker">' + escapeHtml(t('hud.researchPanel.sections.readyKicker', null, 'Ready Now')) + '</div><div class="section-title">' + escapeHtml(t('hud.researchPanel.sections.readyTitle', null, 'Immediate Upgrades')) + '</div></div></div><div class="craft-compact-grid">' + readyCards.join('') + '</div></div>';
    }

    if (waitingCards.length) {
      html += '<div class="panel-section"><div class="section-header compact"><div><div class="section-kicker">' + escapeHtml(t('hud.researchPanel.sections.waitingKicker', null, 'Waiting')) + '</div><div class="section-title">' + escapeHtml(t('hud.researchPanel.sections.waitingTitle', null, 'Need More Resources')) + '</div></div></div><div class="craft-compact-grid">' + waitingCards.join('') + '</div></div>';
    }

    if (lockedCards.length) {
      html += '<div class="panel-section"><div class="section-header compact"><div><div class="section-kicker">' + escapeHtml(t('hud.researchPanel.sections.lockedKicker', null, 'Blocked')) + '</div><div class="section-title">' + escapeHtml(t('hud.researchPanel.sections.lockedTitle', null, 'Locked Technology')) + '</div></div></div><div class="craft-compact-grid">' + lockedCards.join('') + '</div></div>';
    }

    if (completeCards.length) {
      html += '<div class="panel-section"><div class="section-header compact"><div><div class="section-kicker">' + escapeHtml(t('hud.researchPanel.sections.completeKicker', null, 'Archive')) + '</div><div class="section-title">' + escapeHtml(t('hud.researchPanel.sections.completeTitle', null, 'Completed Research')) + '</div></div></div><div class="craft-compact-grid">' + completeCards.join('') + '</div></div>';
    }

    html += '</div>';
    panel.innerHTML = html;
  }

  return {
    toggleModal: toggleModal,
    openModal: openModal,
    openCraftForEquipmentSlot: openCraftForEquipmentSlot,
    closeModal: closeModal,
    switchModalTab: switchModalTab,
    updateModal: updateModal,
    getEntityIcon: getEntityIcon,
    setBagSection: setBagSection,
    setBagFilterValue: setBagFilterValue,
    setInventoryFilterMode: setInventoryFilterMode,
    setInventoryFilterValue: setInventoryFilterValue,
    setCraftFilterMode: setCraftFilterMode,
    setCraftFilterValue: setCraftFilterValue
  };
};