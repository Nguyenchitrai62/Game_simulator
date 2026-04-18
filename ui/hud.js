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
    var _buildingLabelNodes = {};
    var _buildingLabelContainer = null;
    var _nodeHpBarPool = [];
    var _nodeHpBarContainer = null;
    var _nodeWorldLabelPool = [];
    var _nodeWorldLabelContainer = null;
    var _buildingLabelVector = null;
    var _hudScratchVectors = [];
    var _fpsPanel = null;
    var _fpsSmoothed = 0;
    var _fpsSmoothedMs = 0;
    var _fpsUpdateAccumulator = 0;
    var _renderScheduled = false;
    var _renderHandle = null;
    var _renderHandleIsFrame = false;
    var _pendingRenderReason = 'scheduled';
    var _screenPointScratch = { x: 0, y: 0, z: 0 };
    var _trackedObjectHpBar = {
      element: null,
      object: null,
      objectId: null,
      currentX: 0,
      currentY: 0,
      initialized: false
    };
    var BUILDING_LABEL_STORAGE_WARNING_PCT = 70;
    var OBJECT_HP_BAR_OFFSET_X = 52;
    var OBJECT_HP_BAR_OFFSET_Y = 4;
    var OVERLAY_POSITION_SMOOTHING = 22;
    var _languageUnsubscribe = null;
    var _modalFocusTarget = null;
    var _modalFocusTimer = null;
    var _settingsUiState = {
      panelOpen: false,
      activeTab: 'graphics',
      prompt: {
        visible: false,
        suggestedPreset: null,
        suggestedLabel: '',
        fps: 0,
        frameMs: 0,
        snoozeUntil: 0,
        stableSeconds: 0,
        lowFpsSeconds: 0
      }
    };
    var _settlementHtmlCacheKey = '';
    var _settlementHtmlCacheValue = '';
    var _objectiveTrackerCacheKey = '';
    var _objectiveTrackerCacheClassName = '';
    var _objectiveTrackerCacheHtml = '';
    var _modalActive = false;
    var _modalTab = 'resources';
    var _characterCanvas = null;
    var _hoveredInstance = null;
    var _selectedInstance = null;

    function isDebugSettingEnabled(key) {
      return !window.GameDebugSettings || !GameDebugSettings.isEnabled || GameDebugSettings.isEnabled(key);
    }

    function isHudVisible() {
      return isDebugSettingEnabled('hud');
    }

    function areWorldLabelsVisible() {
      return isHudVisible() && isDebugSettingEnabled('worldLabels');
    }

    function areNotificationsVisible() {
      return isHudVisible() && isDebugSettingEnabled('notifications');
    }

    function formatLocalizedText(text, tokens) {
      var output = String(text == null ? '' : text);
      if (!tokens) return output;

      for (var tokenName in tokens) {
        if (!tokens.hasOwnProperty(tokenName)) continue;
        output = output.split('{' + tokenName + '}').join(String(tokens[tokenName]));
      }

      return output;
    }

    function t(path, tokens, fallback) {
      if (window.GameI18n && GameI18n.t) {
        return GameI18n.t(path, tokens, fallback);
      }
      if (fallback !== undefined) return formatLocalizedText(fallback, tokens);
      return formatLocalizedText(path, tokens);
    }

    function getQuickbarModeLabel(mode) {
      return t('hud.quickbar.mode.' + mode, null, mode === 'craft' ? 'Craft' : 'Build');
    }

    function getMissingResourceEntries(resourceMap) {
      var entries = [];
      if (!resourceMap) return entries;

      for (var resId in resourceMap) {
        if (!resourceMap.hasOwnProperty(resId)) continue;
        var needed = Number(resourceMap[resId]) || 0;
        var have = GameState.getSpendableResource(resId);
        var missing = Math.max(0, needed - have);
        if (missing <= 0) continue;
        var entity = GameRegistry.getEntity(resId);
        entries.push({
          id: resId,
          name: entity ? entity.name : resId,
          needed: needed,
          have: have,
          missing: missing
        });
      }

      return entries;
    }

    function buildQuickbarMissingTooltipHtml(item) {
      if (!item || !item.missingResources || !item.missingResources.length) return '';

      var title = item.modalTab === 'build'
        ? t('hud.quickbar.tooltip.buildTitle', null, 'Missing materials to build')
        : t('hud.quickbar.tooltip.craftTitle', null, 'Missing materials to craft');
      var actionHint = item.modalTab === 'build'
        ? t('hud.quickbar.tooltip.openBuild', null, 'Click to open the Build tab')
        : t('hud.quickbar.tooltip.openCraft', null, 'Click to open the Craft tab');
      var html = '<div class="tooltip-content">';
      html += '<div class="tooltip-title">' + escapeHtml(title) + '</div>';
      html += '<div class="tooltip-resource-list">';

      item.missingResources.forEach(function(entry) {
        html += '<div class="tooltip-resource-row">';
        html += '<strong>' + escapeHtml(entry.name) + '</strong>';
        html += '<span>' + escapeHtml(t('hud.quickbar.tooltip.needMore', { amount: Math.ceil(entry.missing) }, 'Need {amount} more')) + '</span>';
        html += '</div>';
      });

      html += '</div>';
      html += '<div class="tooltip-copy">' + escapeHtml(actionHint) + '</div>';
      html += '</div>';
      return html;
    }

    function clearModalFocusHighlight() {
      if (_modalFocusTimer) {
        clearTimeout(_modalFocusTimer);
        _modalFocusTimer = null;
      }

      var focusedCards = document.querySelectorAll('.management-card.focus-target');
      for (var i = 0; i < focusedCards.length; i++) {
        focusedCards[i].classList.remove('focus-target');
      }
    }

    function setModalFocusTarget(tabName, focusId) {
      if (!tabName || !focusId) {
        _modalFocusTarget = null;
        return;
      }

      _modalFocusTarget = {
        tab: tabName,
        id: focusId
      };
    }

    function applyModalFocusTarget() {
      if (!_modalFocusTarget || !_modalActive || _modalFocusTarget.tab !== _modalTab) return;

      var panel = document.getElementById('modal-panel-' + _modalTab);
      if (!panel) return;

      var cards = panel.querySelectorAll('[data-modal-focus-id]');
      var targetCard = null;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-modal-focus-id') === _modalFocusTarget.id) {
          targetCard = cards[i];
          break;
        }
      }

      if (!targetCard) return;

      clearModalFocusHighlight();
      targetCard.classList.add('focus-target');
      if (targetCard.scrollIntoView) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      _modalFocusTimer = setTimeout(function() {
        targetCard.classList.remove('focus-target');
        _modalFocusTimer = null;
      }, 2200);
      _modalFocusTarget = null;
    }

    function openModalAtTarget(tabName, focusId) {
      setModalFocusTarget(tabName, focusId);
      if (_modalActive) {
        switchModalTab(tabName);
      } else {
        openModal({ tab: tabName, focusId: focusId });
      }
    }

    function getQualityConfigValue(path, fallbackValue) {
      return (window.GameQualitySettings && GameQualitySettings.getConfigValue) ? GameQualitySettings.getConfigValue(path, fallbackValue) : fallbackValue;
    }

    function getWorldLabelDistanceLimit() {
      return getQualityConfigValue('scene.worldLabelDistance', 6.5);
    }

    function getNodeHpLabelDistanceLimit() {
      return getQualityConfigValue('scene.nodeHpLabelDistance', 999);
    }

    function getBuildingLabelCullMultiplier() {
      return getQualityConfigValue('scene.buildingLabelCullMultiplier', 1.2);
    }

    function setBodyClass(name, enabled) {
      if (!document.body) return;
      if (enabled) document.body.classList.add(name);
      else document.body.classList.remove(name);
    }

    function getCurrentLanguageId() {
      return (window.GameI18n && GameI18n.getLanguage) ? GameI18n.getLanguage() : 'en';
    }

    function invalidateLocalizedCaches() {
      _settlementHtmlCacheKey = '';
      _settlementHtmlCacheValue = '';
      _objectiveTrackerCacheKey = '';
      _objectiveTrackerCacheClassName = '';
      _objectiveTrackerCacheHtml = '';
    }

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

    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'F9') {
        e.preventDefault();
        toggleQualitySettingsPanel();
        return;
      }

      if (e.key === 'Escape') {
        if (_settingsUiState.panelOpen) {
          toggleQualitySettingsPanel(false);
        }
      }
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
        return rewardText || t('hud.nodes.food', null, 'Food');
      }

      return (nodeInfo.stateLabel ? nodeInfo.stateLabel + ' • ' : '') + rewardText;
    }

    function shouldShowWorldNodeLabel(objData) {
      if (!objData || !objData.type) return false;
      return objData.type !== 'node.tree' && objData.type !== 'node.rock' && objData.type !== 'node.berry_bush';
    }

    function getInspectNodeMeta(objData, nodeInfo) {
      if (!nodeInfo) return t('hud.nodes.hpShort', null, 'HP') + ' ' + objData.hp + '/' + objData.maxHp;

      var rewardText = formatRewardSummary(nodeInfo.rewards);
      if (objData.type === 'node.tree') {
        return rewardText || t('hud.nodes.wood', null, 'Wood');
      }
      if (objData.type === 'node.rock') {
        return rewardText || t('hud.nodes.stone', null, 'Stone');
      }
      if (objData.type === 'node.berry_bush') {
        return rewardText || t('hud.nodes.food', null, 'Food');
      }

      return (nodeInfo.stateLabel ? nodeInfo.stateLabel + ' • ' : '') + rewardText;
    }

    function getSuggestedLowerPresetId() {
      if (!window.GameQualitySettings || !GameQualitySettings.getPresetId) return null;

      var currentPresetId = GameQualitySettings.getPresetId();
      if (currentPresetId === 'high') return 'medium';
      if (currentPresetId === 'medium') return 'low';
      return null;
    }

    function updateQualityPerformanceAdvisor(dt) {
      if (!dt || !window.GameQualitySettings || !GameQualitySettings.getConfigValue) return;

      var promptState = _settingsUiState.prompt;

      var suggestedPresetId = getSuggestedLowerPresetId();
      if (!suggestedPresetId) {
        promptState.lowFpsSeconds = 0;
        return;
      }

      if (Date.now() < promptState.snoozeUntil) return;

      var lowFpsThreshold = GameQualitySettings.getConfigValue('advisor.suggestDownFps', 0);
      var lowFpsSeconds = GameQualitySettings.getConfigValue('advisor.suggestAfterSeconds', 0);
      if (!(lowFpsThreshold > 0) || !(lowFpsSeconds > 0)) return;

      if (_fpsSmoothed <= lowFpsThreshold) {
        promptState.lowFpsSeconds += dt;
      } else {
        promptState.lowFpsSeconds = Math.max(0, promptState.lowFpsSeconds - (dt * 1.5));
      }

      if (promptState.visible || promptState.lowFpsSeconds < lowFpsSeconds) return;

      var suggestedPreset = window.GameQualitySettings.getPresetDefinition ? GameQualitySettings.getPresetDefinition(suggestedPresetId) : null;
      promptState.visible = true;
      promptState.suggestedPreset = suggestedPresetId;
      promptState.suggestedLabel = suggestedPreset && suggestedPreset.label ? suggestedPreset.label : suggestedPresetId;
      promptState.fps = Math.max(1, Math.round(_fpsSmoothed));
      promptState.frameMs = _fpsSmoothedMs.toFixed(1);
      promptState.lowFpsSeconds = 0;
      renderQualityPrompt();
    }

    function updatePerformanceStats(dt) {
      var panel = getFpsPanel();
      if (!panel || !dt) return;

      var instantFps = dt > 0 ? (1 / dt) : 0;
      var instantMs = dt * 1000;

      if (_fpsSmoothed <= 0) _fpsSmoothed = instantFps;
      else _fpsSmoothed += (instantFps - _fpsSmoothed) * 0.18;

      if (_fpsSmoothedMs <= 0) _fpsSmoothedMs = instantMs;
      else _fpsSmoothedMs += (instantMs - _fpsSmoothedMs) * 0.18;

      _fpsUpdateAccumulator += dt;
      if (_fpsUpdateAccumulator < 0.12) return;
      var advisorDelta = _fpsUpdateAccumulator;
      _fpsUpdateAccumulator = 0;

      var label = Math.round(_fpsSmoothed) + ' FPS';
      var drawCalls = (typeof GamePerf !== 'undefined' && GamePerf.getValue) ? GamePerf.getValue('draw.calls') : null;
      if (false && typeof drawCalls === 'number' && drawCalls > 0) {
        label += ' | DC ' + Math.round(drawCalls);
      }

      var tooltipParts = [];
      var frameMetric = (typeof GamePerf !== 'undefined' && GamePerf.getMetric) ? GamePerf.getMetric('frame.total') : null;
      var hudMetric = (typeof GamePerf !== 'undefined' && GamePerf.getMetric) ? GamePerf.getMetric('hud.render') : null;
      var overlayMetric = (typeof GamePerf !== 'undefined' && GamePerf.getMetric) ? GamePerf.getMetric('overlays.update') : null;
      var tickMetric = (typeof GamePerf !== 'undefined' && GamePerf.getMetric) ? GamePerf.getMetric('tick.total') : null;
      var saveMetric = (typeof GamePerf !== 'undefined' && GamePerf.getMetric) ? GamePerf.getMetric('save.write') : null;
      var triangles = (typeof GamePerf !== 'undefined' && GamePerf.getValue) ? GamePerf.getValue('draw.triangles') : null;
      var geometries = (typeof GamePerf !== 'undefined' && GamePerf.getValue) ? GamePerf.getValue('memory.geometries') : null;
      var loadedChunks = (typeof GamePerf !== 'undefined' && GamePerf.getValue) ? GamePerf.getValue('terrain.loadedChunks') : null;
      var visibleChunks = (typeof GamePerf !== 'undefined' && GamePerf.getValue) ? GamePerf.getValue('terrain.visibleChunks') : null;
      var renderPixelRatio = (typeof GamePerf !== 'undefined' && GamePerf.getValue) ? GamePerf.getValue('render.pixelRatio') : null;
      var currentQualityPreset = getCurrentQualityPreset();

      if (frameMetric && frameMetric.avgMs > 0) tooltipParts.push('Frame ' + frameMetric.avgMs.toFixed(1) + ' ms');
      if (hudMetric && hudMetric.avgMs > 0) tooltipParts.push('HUD ' + hudMetric.avgMs.toFixed(1) + ' ms');
      if (overlayMetric && overlayMetric.avgMs > 0) tooltipParts.push('Overlay ' + overlayMetric.avgMs.toFixed(1) + ' ms');
      if (tickMetric && tickMetric.avgMs > 0) tooltipParts.push('Tick ' + tickMetric.avgMs.toFixed(1) + ' ms');
      if (saveMetric && saveMetric.avgMs > 0) tooltipParts.push('Save ' + saveMetric.avgMs.toFixed(1) + ' ms');
      if (typeof triangles === 'number') tooltipParts.push('Triangles ' + Math.round(triangles));
      if (typeof geometries === 'number') tooltipParts.push('Geometries ' + Math.round(geometries));
      if (typeof loadedChunks === 'number' && typeof visibleChunks === 'number') tooltipParts.push('Chunks ' + Math.round(visibleChunks) + '/' + Math.round(loadedChunks));
      if (typeof renderPixelRatio === 'number') tooltipParts.push('PixelRatio ' + renderPixelRatio.toFixed(2));
      if (currentQualityPreset && currentQualityPreset.label) tooltipParts.push('Quality ' + currentQualityPreset.label);

      setNodeText(panel, label);
      setNodeTitle(panel, tooltipParts.join(' | '));
      panel.classList.remove('warn', 'low');
      if (_fpsSmoothed < 25) {
        panel.classList.add('low');
      } else if (_fpsSmoothed < 45) {
        panel.classList.add('warn');
      }

      updateQualityPerformanceAdvisor(advisorDelta);
    }

    function toggleModal() {
      _modalPanelsModule.toggleModal();
    }

    function openModal(options) {
      _modalPanelsModule.openModal(options);
    }

    function closeModal() {
      _modalPanelsModule.closeModal();
    }

    function switchModalTab(tabName) {
      _modalPanelsModule.switchModalTab(tabName);
    }

    function updateModal() {
      _modalPanelsModule.updateModal();
    }

    function clearWorldOverlayElements() {
      hideUnusedNodeHpBars(0);
      hideUnusedNodeWorldLabels(0);
      hideUnusedBuildingLabels({}, {});
      hideObjectHpBar();
    }

    function hideNotificationElement() {
      var el = document.getElementById('notification');
      if (!el) return;
      el.classList.remove('show', 'error', 'success', 'info', 'warning', 'default');
    }

    if (!window.GameHUDModules || !window.GameHUDModules.createSettingsPanelModule || !window.GameHUDModules.createModalPanelsModule || !window.GameHUDModules.createInspectorModule) {
      throw new Error('Required HUD modules were not loaded before ui/hud.js');
    }

    var _settingsPanel = window.GameHUDModules.createSettingsPanelModule({
      state: _settingsUiState,
      t: t,
      escapeHtml: escapeHtml,
      setInnerHtmlIfChanged: setInnerHtmlIfChanged,
      setNodeClassState: setNodeClassState,
      setBodyClass: setBodyClass,
      isDebugSettingEnabled: isDebugSettingEnabled,
      isHudVisible: isHudVisible,
      areWorldLabelsVisible: areWorldLabelsVisible,
      areNotificationsVisible: areNotificationsVisible,
      invalidateLocalizedCaches: invalidateLocalizedCaches,
      renderResources: renderResources,
      renderQuickbar: renderQuickbar,
      renderObjectiveTracker: renderObjectiveTracker,
      updateModal: updateModal,
      renderNow: renderNow,
      showNotification: showNotification,
      clearScheduledRender: clearScheduledRender,
      closeModal: closeModal,
      closeInspector: closeInspector,
      clearWorldOverlayElements: clearWorldOverlayElements,
      hideNotificationElement: hideNotificationElement,
      renderAll: renderAll,
      isModalActive: function () { return _modalActive; }
    });

    var _modalPanelsModule = window.GameHUDModules.createModalPanelsModule({
      t: t,
      escapeHtml: escapeHtml,
      getResourceIcon: getResourceIcon,
      getNextAgeObjective: getNextAgeObjective,
      isHudVisible: isHudVisible,
      setModalFocusTarget: setModalFocusTarget,
      clearModalFocusHighlight: clearModalFocusHighlight,
      applyModalFocusTarget: applyModalFocusTarget,
      renderModalHeader: renderModalHeader,
      toggleQuickbarMode: toggleQuickbarMode,
      getModalActive: function () { return _modalActive; },
      setModalActive: function (value) { _modalActive = !!value; },
      getModalTab: function () { return _modalTab; },
      setModalTab: function (value) { _modalTab = value || _modalTab; },
      getCharacterCanvas: function () { return _characterCanvas; },
      setCharacterCanvas: function (value) { _characterCanvas = value || null; }
    });

    var _inspectorModule = window.GameHUDModules.createInspectorModule({
      t: t,
      escapeHtml: escapeHtml,
      setInnerHtmlIfChanged: setInnerHtmlIfChanged,
      showNotification: showNotification,
      getSelectedInstance: function () { return _selectedInstance; },
      setSelectedInstance: function (value) { _selectedInstance = value || null; },
      setHoveredInstance: function (value) { _hoveredInstance = value || null; }
    });

    function getCurrentQualityPreset() {
      return _settingsPanel.getCurrentQualityPreset();
    }

    function setLanguage(languageId) {
      return _settingsPanel.setLanguage(languageId);
    }

    function resetAllGameData() {
      return _settingsPanel.resetAllGameData();
    }

    function updateQualitySettingsToggleState() {
      _settingsPanel.updateQualitySettingsToggleState();
    }

    function renderQualitySettingsPanel() {
      _settingsPanel.renderQualitySettingsPanel();
    }

    function renderQualityPrompt() {
      _settingsPanel.renderQualityPrompt();
    }

    function applyQualitySettingsState() {
      _settingsPanel.applyQualitySettingsState();
    }

    function toggleQualitySettingsPanel(forceOpen) {
      return _settingsPanel.toggleQualitySettingsPanel(forceOpen);
    }

    function switchQualitySettingsTab(tabId) {
      return _settingsPanel.switchQualitySettingsTab(tabId);
    }

    function applyQualityPreset(presetId, source) {
      return _settingsPanel.applyQualityPreset(presetId, source);
    }

    function acceptQualitySuggestion() {
      return _settingsPanel.acceptQualitySuggestion();
    }

    function snoozeQualityPrompt() {
      _settingsPanel.snoozeQualityPrompt();
    }

    function dismissQualityPrompt() {
      _settingsPanel.dismissQualityPrompt();
    }

    function applyDebugSettingsState(reason) {
      _settingsPanel.applyDebugSettingsState(reason);
    }

    function bindQualitySettingsUi() {
      _settingsPanel.bindQualitySettingsUi();
    }
  
  function init() {
    // Initialize HUD - placeholder for future initialization
    console.log('[GameHUD] Initialized');
    _buildingLabelContainer = document.getElementById('building-storage-labels');
    _fpsPanel = document.getElementById('fps-panel');
    if (_fpsPanel) {
      _fpsPanel.textContent = 'FPS --';
      _fpsPanel.classList.remove('warn', 'low');
    }
    if (window.GameQualitySettings && GameQualitySettings.syncRuntime) {
      GameQualitySettings.syncRuntime('hud-init', { syncDebug: true });
    }
    bindQualitySettingsUi();
    if (!_languageUnsubscribe && window.GameI18n && GameI18n.subscribe) {
      _languageUnsubscribe = GameI18n.subscribe(function() {
        invalidateLocalizedCaches();
        renderResources();
        renderQuickbar();
        renderObjectiveTracker();
        renderModalHeader();
        updateModal();
        updateQualitySettingsToggleState();
        renderQualitySettingsPanel();
        renderNow('language-change');
      });
    }
    renderQualitySettingsPanel();
    renderQualityPrompt();
    applyDebugSettingsState('init');
    applyQualitySettingsState();
    renderQuickbar();
  }

  function performRenderAll() {
    if (!isHudVisible()) return;

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

  function clearScheduledRender() {
    if (!_renderScheduled && _renderHandle === null) return;

    if (_renderHandle !== null) {
      if (_renderHandleIsFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(_renderHandle);
      else clearTimeout(_renderHandle);
    }

    _renderScheduled = false;
    _renderHandle = null;
    _renderHandleIsFrame = false;
  }

  function executeRender(reason) {
    var perfMark = (typeof GamePerf !== 'undefined' && GamePerf.begin) ? GamePerf.begin('hud.render') : null;
    _pendingRenderReason = reason || _pendingRenderReason;
    performRenderAll();
    if (perfMark && typeof GamePerf !== 'undefined' && GamePerf.end) {
      GamePerf.end(perfMark);
    }
  }

  function flushScheduledRender() {
    _renderScheduled = false;
    _renderHandle = null;
    _renderHandleIsFrame = false;
    executeRender(_pendingRenderReason);
  }

  function renderAll(reason) {
    if (typeof reason === 'string' && reason) {
      _pendingRenderReason = reason;
    }

    if (!isHudVisible()) return;

    if (_renderScheduled) return;

    _renderScheduled = true;
    if (typeof requestAnimationFrame === 'function') {
      _renderHandleIsFrame = true;
      _renderHandle = requestAnimationFrame(flushScheduledRender);
      return;
    }

    _renderHandleIsFrame = false;
    _renderHandle = setTimeout(flushScheduledRender, 16);
  }

  function renderNow(reason) {
    if (!isHudVisible()) {
      clearScheduledRender();
      return;
    }

    clearScheduledRender();
    executeRender(typeof reason === 'string' && reason ? reason : 'immediate');
  }

  function getHudInstances() {
    if (GameState.getAllInstancesLive) return GameState.getAllInstancesLive();
    return GameState.getAllInstances();
  }

  function getBuildingLabelContainer() {
    if (!_buildingLabelContainer) {
      _buildingLabelContainer = document.getElementById('building-storage-labels');
    }
    return _buildingLabelContainer;
  }

  function getNodeHpBarContainer() {
    if (!_nodeHpBarContainer) {
      _nodeHpBarContainer = document.getElementById('node-hp-bars-container');
    }
    return _nodeHpBarContainer;
  }

  function getNodeWorldLabelContainer() {
    if (!_nodeWorldLabelContainer) {
      _nodeWorldLabelContainer = document.getElementById('node-world-labels');
    }
    return _nodeWorldLabelContainer;
  }

  function getFpsPanel() {
    if (!_fpsPanel) {
      _fpsPanel = document.getElementById('fps-panel');
    }
    return _fpsPanel;
  }

  function getBuildingLabelVector() {
    if (!_buildingLabelVector && typeof THREE !== 'undefined') {
      _buildingLabelVector = new THREE.Vector3();
    }
    return _buildingLabelVector;
  }

  function getHudScratchVector(index) {
    if (!_hudScratchVectors[index] && typeof THREE !== 'undefined') {
      _hudScratchVectors[index] = new THREE.Vector3();
    }
    return _hudScratchVectors[index];
  }

  function projectHudWorldPoint(worldX, worldY, worldZ) {
    if (!window.GameScene) return null;

    if (GameScene.projectWorldToScreen) {
      return GameScene.projectWorldToScreen(worldX, worldY, worldZ, _screenPointScratch);
    }

    var worldPos = getHudScratchVector(7);
    if (!worldPos || !GameScene.worldToScreen) return null;

    worldPos.set(worldX, worldY, worldZ);
    return GameScene.worldToScreen(worldPos, _screenPointScratch);
  }

  function setNodeText(node, text) {
    if (node && node.textContent !== text) {
      node.textContent = text;
    }
  }

  function setNodeTitle(node, title) {
    if (node && node.title !== title) {
      node.title = title;
    }
  }

  function setInnerHtmlIfChanged(node, html) {
    if (node && node.innerHTML !== html) {
      node.innerHTML = html;
    }
  }

  function setNodeDisplay(node, visible) {
    if (!node) return;
    var nextValue = visible ? '' : 'none';
    if (node.style.display !== nextValue) {
      node.style.display = nextValue;
    }
  }

  function setNodeWidth(node, percent) {
    if (!node) return;
    var clamped = Math.max(0, Math.min(100, Math.round(percent)));
    var nextValue = clamped + '%';
    if (node.style.width !== nextValue) {
      node.style.width = nextValue;
    }
  }

  function setNodeColor(node, color) {
    if (node && node.style.backgroundColor !== color) {
      node.style.backgroundColor = color;
    }
  }

  function setNodeClassState(node, className, enabled) {
    if (!node) return;
    if (enabled) node.classList.add(className);
    else node.classList.remove(className);
  }

  function setNodeBorderColor(node, color) {
    if (node && node.style.borderColor !== color) {
      node.style.borderColor = color;
    }
  }

  function setNodeClassName(node, className) {
    if (node && node.className !== className) {
      node.className = className;
    }
  }

  function getSmoothingFactor(dt, strength) {
    if (!(dt > 0) || !isFinite(dt)) return 1;
    return 1 - Math.exp(-strength * dt);
  }

  function setNodeTransform(node, x, y, anchorTransform) {
    if (!node) return;

    var transformValue = 'translate3d(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, 0)';
    if (anchorTransform) transformValue += ' ' + anchorTransform;

    if (node._lastTransformValue !== transformValue) {
      node.style.transform = transformValue;
      node._lastTransformValue = transformValue;
    }
  }

  function getObjectHpBarElement() {
    var el = _trackedObjectHpBar.element;
    if (el && el.parentNode) return el;

    el = document.getElementById('object-hp-bar');
    if (!el) {
      el = document.createElement('div');
      el.id = 'object-hp-bar';
      el.innerHTML = '<div class="object-hp-title"></div><div class="object-hp-meta"></div><div class="object-hp-track"><div class="object-hp-fill"></div></div>';
      document.body.appendChild(el);
    }

    _trackedObjectHpBar.element = el;
    return el;
  }

  function updateTrackedObjectHpBarContent(objData, el) {
    if (!objData || !el) return;

    var nodeInfo = (objData.type && objData.type.indexOf('node.') === 0 && typeof GameTerrain !== 'undefined' && GameTerrain.getNodeInfo) ? GameTerrain.getNodeInfo(objData) : null;
    var entity = GameRegistry.getEntity(objData.type);
    var titleText = nodeInfo ? getWorldNodeTitle(objData, nodeInfo, entity) : (entity ? entity.name : objData.type);
    var metaText = getInspectNodeMeta(objData, nodeInfo);
    var accentColor = nodeInfo ? getNodeAccentColor(nodeInfo) : 'rgba(255,255,255,0.12)';
    var pct = Math.max(0, (objData.hp / Math.max(1, objData.maxHp)) * 100);
    var fillColor = pct > 60 ? '#4ecca3' : pct > 30 ? '#f0a500' : '#e94560';

    var title = el.querySelector('.object-hp-title');
    if (title) setNodeText(title, titleText);

    var meta = el.querySelector('.object-hp-meta');
    if (meta) setNodeText(meta, metaText);

    var track = el.querySelector('.object-hp-track');
    if (track) setNodeBorderColor(track, accentColor);

    var fill = el.querySelector('.object-hp-fill');
    if (fill) {
      setNodeWidth(fill, pct);
      setNodeColor(fill, fillColor);
    }
  }

  function updateTrackedObjectHpBar(dt, snap) {
    if (!areWorldLabelsVisible()) {
      hideObjectHpBar();
      return;
    }

    var objData = _trackedObjectHpBar.object;
    if (!objData) return;

    var el = getObjectHpBarElement();
    if (!el) return;

    if (!(objData.hp > 0)) {
      hideObjectHpBar();
      return;
    }

    var pos = projectHudWorldPoint(objData.worldX, 1.5, objData.worldZ);
    if (!pos || pos.z > 1 || pos.z < -1 || pos.x < -160 || pos.x > window.innerWidth + 160 || pos.y < -120 || pos.y > window.innerHeight + 120) {
      setNodeDisplay(el, false);
      return;
    }

    updateTrackedObjectHpBarContent(objData, el);

    var targetX = pos.x - OBJECT_HP_BAR_OFFSET_X;
    var targetY = pos.y - OBJECT_HP_BAR_OFFSET_Y;
    if (snap || !_trackedObjectHpBar.initialized) {
      _trackedObjectHpBar.currentX = targetX;
      _trackedObjectHpBar.currentY = targetY;
      _trackedObjectHpBar.initialized = true;
    } else {
      var smoothing = getSmoothingFactor(Math.min(dt || 0.016, 1 / 30), OVERLAY_POSITION_SMOOTHING);
      _trackedObjectHpBar.currentX += (targetX - _trackedObjectHpBar.currentX) * smoothing;
      _trackedObjectHpBar.currentY += (targetY - _trackedObjectHpBar.currentY) * smoothing;
    }

    setNodeTransform(el, _trackedObjectHpBar.currentX, _trackedObjectHpBar.currentY, '');
    setNodeDisplay(el, true);
  }

  function createNodeHpBarEntry(container) {
    if (!container) return null;

    var root = document.createElement('div');
    root.className = 'node-hp-bar';

    var title = document.createElement('div');
    title.className = 'node-hp-bar-title';

    var value = document.createElement('div');
    value.className = 'node-hp-bar-value';

    var track = document.createElement('div');
    track.className = 'node-hp-bar-track';

    var fill = document.createElement('div');
    fill.className = 'hp-bar-fill healthy';
    track.appendChild(fill);

    root.appendChild(title);
    root.appendChild(value);
    root.appendChild(track);
    container.appendChild(root);

    return {
      root: root,
      title: title,
      value: value,
      fill: fill,
      lastHealthClass: 'healthy'
    };
  }

  function ensureNodeHpBarEntry(index, container) {
    var entry = _nodeHpBarPool[index];
    if (entry) {
      if (entry.root.parentNode !== container) {
        container.appendChild(entry.root);
      }
      return entry;
    }

    entry = createNodeHpBarEntry(container);
    _nodeHpBarPool[index] = entry;
    return entry;
  }

  function hideUnusedNodeHpBars(activeCount) {
    for (var i = activeCount; i < _nodeHpBarPool.length; i++) {
      setNodeDisplay(_nodeHpBarPool[i].root, false);
    }
  }

  function createNodeWorldLabelEntry(container) {
    if (!container) return null;

    var root = document.createElement('div');
    root.className = 'node-world-label';

    var title = document.createElement('div');
    title.className = 'node-world-title';

    var meta = document.createElement('div');
    meta.className = 'node-world-meta';

    root.appendChild(title);
    root.appendChild(meta);
    container.appendChild(root);

    return {
      root: root,
      title: title,
      meta: meta
    };
  }

  function ensureNodeWorldLabelEntry(index, container) {
    var entry = _nodeWorldLabelPool[index];
    if (entry) {
      if (entry.root.parentNode !== container) {
        container.appendChild(entry.root);
      }
      return entry;
    }

    entry = createNodeWorldLabelEntry(container);
    _nodeWorldLabelPool[index] = entry;
    return entry;
  }

  function hideUnusedNodeWorldLabels(activeCount) {
    for (var i = activeCount; i < _nodeWorldLabelPool.length; i++) {
      setNodeDisplay(_nodeWorldLabelPool[i].root, false);
    }
  }

  function ensureBuildingLabelNode(uid, container) {
    var entry = _buildingLabelNodes[uid];
    if (entry) {
      if (entry.root.parentNode !== container) {
        container.appendChild(entry.root);
      }
      return entry;
    }

    var root = document.createElement('div');
    root.className = 'building-world-label';

    var fuelCard = document.createElement('div');
    fuelCard.className = 'building-world-fuel';
    var fuelBadge = document.createElement('div');
    fuelBadge.className = 'building-world-badge';
    fuelBadge.textContent = t('hud.inspector.fireBadge', null, 'FIRE');
    var fuelBar = document.createElement('div');
    fuelBar.className = 'building-world-bar';
    var fuelFill = document.createElement('div');
    fuelFill.className = 'building-world-fill';
    fuelBar.appendChild(fuelFill);
    var fuelValue = document.createElement('div');
    fuelValue.className = 'building-world-value';
    fuelCard.appendChild(fuelBadge);
    fuelCard.appendChild(fuelBar);
    fuelCard.appendChild(fuelValue);

    var storageCard = document.createElement('div');
    storageCard.className = 'building-world-storage';
    var storageBar = document.createElement('div');
    storageBar.className = 'building-world-bar';
    var storageFill = document.createElement('div');
    storageFill.className = 'building-world-fill';
    storageBar.appendChild(storageFill);
    var storageValue = document.createElement('div');
    storageValue.className = 'building-world-value';
    storageCard.appendChild(storageBar);
    storageCard.appendChild(storageValue);

    root.appendChild(fuelCard);
    root.appendChild(storageCard);
    container.appendChild(root);

    entry = {
      root: root,
      fuelCard: fuelCard,
      fuelFill: fuelFill,
      fuelValue: fuelValue,
      storageCard: storageCard,
      storageFill: storageFill,
      storageValue: storageValue,
      lastTransform: ''
    };
    _buildingLabelNodes[uid] = entry;
    return entry;
  }

  function hideUnusedBuildingLabels(visibleMap, instances) {
    for (var uid in _buildingLabelNodes) {
      var entry = _buildingLabelNodes[uid];
      if (!instances[uid]) {
        if (entry.root && entry.root.parentNode) {
          entry.root.parentNode.removeChild(entry.root);
        }
        delete _buildingLabelNodes[uid];
        continue;
      }

      if (!visibleMap[uid]) {
        if (entry.root && entry.root.parentNode) {
          entry.root.parentNode.removeChild(entry.root);
        }
      }
    }
  }

  function shouldShowBuildingStorageWarning(inst, balance, storageCapacity, storageUsed) {
    if (!inst || !balance || _modalActive) return false;
    if (balance.lightRadius) return false;
    if (balance.farming) return false;
    if (!(storageCapacity > 0) || !(storageUsed > 0)) return false;

    var storagePct = (storageUsed / Math.max(1, storageCapacity)) * 100;
    return storagePct >= BUILDING_LABEL_STORAGE_WARNING_PCT;
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
      var localizedResource = GameRegistry.getEntity(res.id) || res;
      var amount = GameState.getSpendableResource(res.id);
      var net = stats.net ? stats.net[res.id] : 0;
      
      html += '<div class="resource-item" style="min-width:110px;">';
      html += '<span class="resource-icon">' + getResourceIcon(res.id) + '</span>';
      html += '<span class="resource-amount">' + Math.floor(amount) + '</span>';
      html += ' <span class="resource-name">' + escapeHtml(localizedResource.name) + '</span>';
      
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
    html += '<button class="btn btn-small" onclick="GameHUD.toggleProductionPanel()" style="padding:2px 6px;font-size:11px;">' + escapeHtml(_showProductionPanel ? t('hud.resourceBar.hideRates', null, 'Hide rates') : t('hud.resourceBar.showRates', null, 'Show rates')) + '</button>';
    html += '</div>';

    setInnerHtmlIfChanged(container, html);
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
    var hungryThreshold = GameState.getHungryThreshold();
    var isSlowed = false;

    if (hunger < hungryThreshold) {
      speed *= GameState.getHungrySpeedMultiplier();
      isSlowed = true;
    }

    if (isEatingNow) {
      speed *= GameState.getEatSpeedMultiplier();
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
  var warningThreshold = GameState.getHungerOverlayWarningThreshold();
  var criticalThreshold = GameState.getHungerOverlayCriticalThreshold();

    var text = t('hud.hunger.foodLine', {
      hunger: Math.floor(hunger),
      max: maxHunger,
      food: Math.floor(foodCount)
    }, '{hunger}/{max} Food:{food}');
    if (isEatingNow) {
      text = t('hud.hunger.eatingLine', {
        hunger: Math.floor(hunger),
        max: maxHunger
      }, 'Eating... {hunger}/{max}');
    }
    hungerText.textContent = text;

    hungerFill.classList.remove("hunger-warn", "hunger-critical");
    if (hunger <= criticalThreshold) {
      hungerFill.classList.add("hunger-critical");
    } else if (hunger < warningThreshold) {
      hungerFill.classList.add("hunger-warn");
    }

    if (hungerWrapper) {
      if (hunger < warningThreshold) {
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
        kicker: t('hud.modal.header.resources.kicker', null, 'Economy'),
        title: t('hud.modal.header.resources.title', null, 'Stockpile'),
        subtitle: t('hud.modal.header.resources.subtitle', null, 'Track reserves, monitor income, and spot shortages before they hurt momentum.')
      },
      build: {
        kicker: t('hud.modal.header.build.kicker', null, 'Settlement'),
        title: t('hud.modal.header.build.title', null, 'Construction'),
        subtitle: t('hud.modal.header.build.subtitle', null, 'Expand your production network and place the next building with intention.')
      },
      craft: {
        kicker: t('hud.modal.header.craft.kicker', null, 'Workshop'),
        title: t('hud.modal.header.craft.title', null, 'Crafting'),
        subtitle: t('hud.modal.header.craft.subtitle', null, 'Turn gathered materials into tools, gear, and milestone unlocks.')
      },
      stats: {
        kicker: t('hud.modal.header.stats.kicker', null, 'Progression'),
        title: t('hud.modal.header.stats.title', null, 'Journal'),
        subtitle: t('hud.modal.header.stats.subtitle', null, 'Review your survivor, settlement growth, and the next age objective in one place.')
      },
      research: {
        kicker: t('hud.modal.header.research.kicker', null, 'Knowledge'),
        title: t('hud.modal.header.research.title', null, 'Research'),
        subtitle: t('hud.modal.header.research.subtitle', null, 'Spend resources on permanent bonuses and long-term efficiency.')
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

  function buildSettlementStatusHtml() {
    if (!window.GameActions || !GameActions.getSettlementStatus) return '';

    var settlementStatus = GameActions.getSettlementStatus();
    if (!settlementStatus || !settlementStatus.alerts || !settlementStatus.alerts.length) return '';

    var cacheKey = getCurrentLanguageId() + '|' + (settlementStatus.cacheKey || JSON.stringify(settlementStatus.alerts));
    if (_settlementHtmlCacheKey === cacheKey && _settlementHtmlCacheValue) {
      return _settlementHtmlCacheValue;
    }

    var html = '<div class="objective-hint">' + escapeHtml(t('hud.objective.priorityStatus', null, 'Priority status')) + '</div>';
    html += '<div class="objective-checklist">';
    settlementStatus.alerts.forEach(function(alert) {
      html += '<div class="objective-check ' + escapeHtml(alert.tone || 'info') + '">' +
        '<span class="objective-check-icon">' + escapeHtml(alert.icon || '!') + '</span>' +
        '<span class="objective-check-copy"><span class="objective-check-label">' + escapeHtml(alert.label || '') + '</span><span class="objective-check-progress">' + escapeHtml(alert.detail || '') + '</span></span>' +
        '</div>';
    });
    html += '</div>';
    _settlementHtmlCacheKey = cacheKey;
    _settlementHtmlCacheValue = html;
    return html;
  }

  function renderObjectiveTracker() {
    var tracker = document.getElementById("objective-tracker");
    if (!tracker) return;
    var languageId = getCurrentLanguageId();
    var currentAgeEntity = GameRegistry.getEntity(GameState.getAge());
    var currentAgeLabel = currentAgeEntity ? currentAgeEntity.name : GameState.getAge();
    var coreVersion = (window.GameState && GameState.getCoreStateVersion) ? GameState.getCoreStateVersion() : 0;
    var settlementStatus = (window.GameActions && GameActions.getSettlementStatus) ? GameActions.getSettlementStatus() : null;
    var settlementCacheKey = settlementStatus && settlementStatus.cacheKey ? settlementStatus.cacheKey : 'settlement:none';
    var trackerCachePrefix = languageId + '|' + GameState.getAge() + '|' + coreVersion + '|' + settlementCacheKey;

    var nextAge = getNextAgeObjective();
    if (!nextAge) {
      var readyCacheKey = trackerCachePrefix + '|ready';
      if (_objectiveTrackerCacheKey === readyCacheKey && _objectiveTrackerCacheHtml) {
        tracker.className = _objectiveTrackerCacheClassName;
        setInnerHtmlIfChanged(tracker, _objectiveTrackerCacheHtml);
        return;
      }

      var clearedSettlementHtml = buildSettlementStatusHtml();
      var readyHtml = '<div class="objective-meta"><span class="objective-label">' + escapeHtml(t('hud.objective.currentAge', null, 'Current Age')) + '</span><span class="objective-age">' + escapeHtml(currentAgeLabel) + '</span></div>' +
        '<div class="objective-title">' + escapeHtml(t('hud.objective.allAgesUnlockedTitle', null, 'All Ages Unlocked')) + '</div>' +
        '<div class="objective-detail">' + escapeHtml(t('hud.objective.allAgesUnlockedCopy', null, 'Current progression content is fully cleared.')) + '</div>' +
        clearedSettlementHtml;
      tracker.className = 'objective-tracker ready';
      setInnerHtmlIfChanged(tracker, readyHtml);
      _objectiveTrackerCacheKey = readyCacheKey;
      _objectiveTrackerCacheClassName = 'objective-tracker ready';
      _objectiveTrackerCacheHtml = readyHtml;
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

    var trackerClassName = 'objective-tracker' + (canAdvance ? ' ready' : '');
    var settlementHtml = buildSettlementStatusHtml();
    var trackerHtml = '<div class="objective-meta"><span class="objective-label">' + escapeHtml(t('hud.objective.currentAge', null, 'Current Age')) + '</span><span class="objective-age">' + escapeHtml(currentAgeLabel) + '</span></div>' +
      '<div class="objective-title">' + escapeHtml(nextAge.entity.name) + (canAdvance ? (' - ' + escapeHtml(t('hud.statsPanel.readyNow', null, 'Ready now'))) : '') + '</div>' +
      checklistHtml +
      settlementHtml +
      '<div class="objective-actions"><button class="objective-advance-btn' + (canAdvance ? ' ready' : '') + '" onclick="GameActions.advanceAge(\'' + nextAge.entity.id + '\')"' + (canAdvance ? '' : ' disabled') + '>' + escapeHtml(t('hud.objective.advanceAge', null, 'Advance Age')) + '</button></div>';

    var trackerCacheKey = trackerCachePrefix + '|' + nextAge.entity.id + '|' + (canAdvance ? '1' : '0');
    if (_objectiveTrackerCacheKey === trackerCacheKey && _objectiveTrackerCacheHtml === trackerHtml && _objectiveTrackerCacheClassName === trackerClassName) {
      tracker.className = trackerClassName;
      setInnerHtmlIfChanged(tracker, trackerHtml);
      return;
    }

    tracker.className = trackerClassName;
    setInnerHtmlIfChanged(tracker, trackerHtml);
    _objectiveTrackerCacheKey = trackerCacheKey;
    _objectiveTrackerCacheClassName = trackerClassName;
    _objectiveTrackerCacheHtml = trackerHtml;
  }

  function getQuickbarBuildItems() {
    return GameRegistry.getEntitiesByType('building')
      .filter(function(building) {
        return GameState.isUnlocked(building.id) && !building.hiddenInBuildMenu;
      })
      .map(function(building, index) {
        var localizedBuilding = GameRegistry.getEntity(building.id) || building;
        var balance = GameRegistry.getBalance(building.id) || {};
        var placedCount = GameState.getBuildingCount(building.id);
        var cost = balance.cost || {};
        var missingResources = getMissingResourceEntries(cost);
        var canBuild = missingResources.length === 0;

        return {
          id: building.id,
          actionType: 'build',
          icon: _modalPanelsModule.getEntityIcon(building),
          name: localizedBuilding.name,
          meta: placedCount > 0 ? ('x' + placedCount) : 'new',
          statusKey: canBuild ? 'ready' : 'need',
          ready: canBuild,
          missingResources: missingResources,
          modalTab: 'build',
          modalFocusId: building.id,
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
        var localizedRecipe = GameRegistry.getEntity(recipe.id) || recipe;
        var info = CraftSystem.getRecipeInfo(recipe.id);
        var balance = info.balance || {};
        var outputIds = balance.output ? Object.keys(balance.output) : [];
        var primaryOutputId = outputIds.length ? outputIds[0] : null;
        var primaryOutputEntity = primaryOutputId ? GameRegistry.getEntity(primaryOutputId) : null;
        var actionType = 'craft';
        var actionId = recipe.id;
        var ready = info.canCraft;
        var statusKey = ready ? 'ready' : 'need';
        var sortOrder = ready ? 0 : 2;
        var meta = primaryOutputId && balance.output ? ('x' + balance.output[primaryOutputId]) : 'recipe';
        var missingResources = getMissingResourceEntries(balance.input);

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
            statusKey = 'use';
            sortOrder = 0;
            missingResources = [];
          }
        }

        return {
          id: recipe.id,
          actionType: actionType,
          actionId: actionId,
          icon: _modalPanelsModule.getEntityIcon(primaryOutputEntity || recipe),
          name: localizedRecipe.name,
          meta: meta,
          statusKey: statusKey,
          ready: ready,
          missingResources: missingResources,
          modalTab: 'craft',
          modalFocusId: recipe.id,
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
    if (!isHudVisible()) return;

    _quickbarItems = _quickbarMode === 'craft' ? getQuickbarCraftItems() : getQuickbarBuildItems();

    var toggleClassName = 'quickbar-toggle ' + (_quickbarMode === 'craft' ? 'craft' : 'build');
    if (toggleButton.className !== toggleClassName) {
      toggleButton.className = toggleClassName;
    }
    setInnerHtmlIfChanged(toggleButton, '<span class="quickbar-toggle-label">' + escapeHtml(getQuickbarModeLabel(_quickbarMode)) + '</span>' +
      '<span class="quickbar-toggle-hint">Tab</span>');

    var selectedId = _quickbarSelected[_quickbarMode];
    var html = '';

    for (var i = 0; i < 9; i++) {
      var item = _quickbarItems[i];
      if (!item) {
        html += '<button class="quickbar-slot empty" type="button" disabled>' +
          '<span class="quickbar-slot-key">' + (i + 1) + '</span>' +
          '<span class="quickbar-slot-icon">·</span>' +
          '<span class="quickbar-slot-name">' + escapeHtml(t('hud.quickbar.empty.name', null, 'Empty')) + '</span>' +
          '<span class="quickbar-slot-meta"><span>-</span><span class="quickbar-slot-status">' + escapeHtml(t('hud.quickbar.empty.status', null, 'None')) + '</span></span>' +
          '</button>';
        continue;
      }

      var slotClass = 'quickbar-slot ' + (item.ready ? 'ready' : 'blocked');
      if (selectedId === item.id) {
        slotClass += ' selected';
      }

      var statusLabel = t('hud.quickbar.status.' + item.statusKey, null, item.ready ? 'Ready' : 'Need');
      var buttonHtml = '<button class="' + slotClass + '" type="button" onclick="GameHUD.activateQuickbarSlot(' + i + ')" title="' + escapeHtml(item.name) + '">' +
        '<span class="quickbar-slot-key">' + (i + 1) + '</span>' +
        '<span class="quickbar-slot-icon">' + item.icon + '</span>' +
        '<span class="quickbar-slot-name">' + escapeHtml(item.name) + '</span>' +
        '<span class="quickbar-slot-meta"><span>' + escapeHtml(String(item.meta)) + '</span><span class="quickbar-slot-status">' + escapeHtml(statusLabel) + '</span></span>' +
        '</button>';

      if (!item.ready && item.missingResources && item.missingResources.length) {
        html += '<div class="tooltip-container quickbar-tooltip-container">' + buttonHtml + buildQuickbarMissingTooltipHtml(item) + '</div>';
      } else {
        html += buttonHtml;
      }
    }

    setInnerHtmlIfChanged(slots, html);
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
      showNotification(t('hud.quickbar.notification.modeSwitched', { mode: getQuickbarModeLabel(_quickbarMode) }, 'Quickbar: {mode} mode'), 'info');
    }
  }

  function activateQuickbarSlot(index) {
    var item = _quickbarItems[index];
    if (!item) return;

    _quickbarSelected[_quickbarMode] = item.id;
    renderQuickbar();

    if (item.actionType === 'build') {
      if (!item.ready) {
        openModalAtTarget(item.modalTab || 'build', item.modalFocusId || item.id);
        return;
      }
      if (_modalActive) closeModal();
      BuildingSystem.enterBuildMode(item.id);
      return;
    }

    if (window.BuildingSystem && BuildingSystem.isBuildMode && BuildingSystem.isBuildMode()) {
      BuildingSystem.cancelBuild();
    }

    if (item.actionType === 'craft') {
      if (!item.ready) {
        openModalAtTarget(item.modalTab || 'craft', item.modalFocusId || item.id);
        return;
      }
      GameActions.craft(item.actionId);
      return;
    }

    if (item.actionType === 'equip') {
      GameActions.equip(item.actionId);
      return;
    }

    showNotification(t('hud.quickbar.notification.notReady', null, 'This slot is not ready yet.'), 'info');
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
    if (_activeTab === tabName && _modalActive) {
      closePanels();
      return;
    }

    var modalTab = tabName;
    if (modalTab === 'inventory') modalTab = 'resources';
    if (modalTab === 'none') {
      closePanels();
      return;
    }
    if (modalTab !== 'resources' && modalTab !== 'build' && modalTab !== 'craft' && modalTab !== 'stats' && modalTab !== 'research') {
      closePanels();
      return;
    }

    _activeTab = tabName;
    openModal({ tab: modalTab });
  }

  function closePanels() {
    _activeTab = null;
    if (_modalActive) {
      closeModal();
    }
  }

  function renderActivePanel() {
    if (_modalActive) {
      updateModal();
      return;
    }

    if (_activeTab) {
      switchTab(_activeTab);
    }
  }

  function showNotification(msg, type = "default") {
    if (!areNotificationsVisible()) return;

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
      error: t('hud.notificationLabel.error', null, 'Alert'),
      success: t('hud.notificationLabel.success', null, 'Success'),
      info: t('hud.notificationLabel.info', null, 'Info'),
      warning: t('hud.notificationLabel.warning', null, 'Notice'),
      default: t('hud.notificationLabel.default', null, 'Update')
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
    if (!isHudVisible()) return;

    var pos = projectHudWorldPoint(worldX, worldY + 1.5, worldZ);
    if (!pos) return;
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
    if (!isHudVisible()) return;

    var pos = projectHudWorldPoint(worldX, worldY, worldZ);
    if (!pos) return;
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
  
  function setHoveredInstance(uid) {
    _inspectorModule.setHoveredInstance(uid);
  }
  
  function selectInstance(uid) {
    _inspectorModule.selectInstance(uid);
  }
  
  function showBuildingInspector(uid) {
    _inspectorModule.showBuildingInspector(uid);
  }
  
  function confirmDestroy(uid) {
    _inspectorModule.confirmDestroy(uid);
  }
  
  function closeInspector() {
    _inspectorModule.closeInspector();
  }

  function showObjectHpBar(objData, holdMs) {
    if (!areWorldLabelsVisible()) {
      hideObjectHpBar();
      return;
    }

    if (showObjectHpBar._hideTimer) {
      clearTimeout(showObjectHpBar._hideTimer);
      showObjectHpBar._hideTimer = null;
    }

    var nextObjectId = objData && objData.id ? objData.id : null;
    if (_trackedObjectHpBar.objectId !== nextObjectId) {
      _trackedObjectHpBar.initialized = false;
    }

    _trackedObjectHpBar.object = objData;
    _trackedObjectHpBar.objectId = nextObjectId;
    showObjectHpBar._activeObjectId = nextObjectId;
    updateTrackedObjectHpBar(0, true);

    if (holdMs && holdMs > 0) {
      showObjectHpBar._hideTimer = setTimeout(function() {
        if (showObjectHpBar._activeObjectId === nextObjectId) {
          hideObjectHpBar();
        }
        showObjectHpBar._hideTimer = null;
      }, holdMs);
    }
  }

  function hideObjectHpBar() {
    if (showObjectHpBar._hideTimer) {
      clearTimeout(showObjectHpBar._hideTimer);
      showObjectHpBar._hideTimer = null;
    }
    showObjectHpBar._activeObjectId = null;
    _trackedObjectHpBar.object = null;
    _trackedObjectHpBar.objectId = null;
    _trackedObjectHpBar.initialized = false;
    var el = _trackedObjectHpBar.element || document.getElementById('object-hp-bar');
    if (el) setNodeDisplay(el, false);
  }

  function updateNodeHpBars() {
    if (!areWorldLabelsVisible()) {
      hideUnusedNodeHpBars(0);
      return;
    }

    var labelDistanceLimit = getNodeHpLabelDistanceLimit();
    if (!(labelDistanceLimit > 0)) {
      hideUnusedNodeHpBars(0);
      return;
    }

    if (!window.NPCSystem || !NPCSystem.getActiveHarvestNodes) return;

    var container = getNodeHpBarContainer();
    if (!container) return;

    var activeNodes = NPCSystem.getActiveHarvestNodes();

    if (activeNodes.length === 0) {
      hideUnusedNodeHpBars(0);
      return;
    }

    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;
    var playerPos = (window.GamePlayer && GamePlayer.getPosition) ? GamePlayer.getPosition() : null;
    var labelDistanceLimitSq = labelDistanceLimit >= 999 ? Infinity : (labelDistanceLimit * labelDistanceLimit);
    var visibleCount = 0;
    activeNodes.forEach(function(nodeData) {
      if (playerPos && labelDistanceLimitSq !== Infinity) {
        var playerDx = nodeData.worldX - playerPos.x;
        var playerDz = nodeData.worldZ - playerPos.z;
        if ((playerDx * playerDx + playerDz * playerDz) > labelDistanceLimitSq) return;
      }

      var pos = projectHudWorldPoint(nodeData.worldX, 1.2, nodeData.worldZ);
      if (!pos || pos.z > 1 || pos.z < -1) return;

      var x = pos.x;
      var y = pos.y;
      if (x < -80 || x > screenWidth + 80 || y < -80 || y > screenHeight + 80) return;

      var percent = (nodeData.currentHp / nodeData.maxHp) * 100;
      var healthClass = percent > 60 ? 'healthy' : percent > 30 ? 'damaged' : 'critical';

      var nodeInfo = (window.GameTerrain && GameTerrain.getNodeInfo) ? GameTerrain.getNodeInfo(nodeData.node) : null;
      var nodeType = nodeData.node.type || 'Unknown';
      var nodeName = nodeInfo ? getWorldNodeTitle(nodeData.node, nodeInfo, null) : nodeType.replace('node.', '').replace('_', ' ');
      nodeName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);

      var entry = ensureNodeHpBarEntry(visibleCount, container);
      visibleCount++;
      if (!entry) return;

      setNodeTransform(entry.root, x - 30, y - 10, '');
      setNodeDisplay(entry.root, true);
      setNodeText(entry.title, nodeName);
      setNodeText(entry.value, Math.ceil(nodeData.currentHp) + '/' + nodeData.maxHp);
      setNodeWidth(entry.fill, percent);

      if (entry.lastHealthClass !== healthClass) {
        setNodeClassName(entry.fill, 'hp-bar-fill ' + healthClass);
        entry.lastHealthClass = healthClass;
      }
    });

    hideUnusedNodeHpBars(visibleCount);
  }

  function updateNodeWorldLabels() {
    var container = getNodeWorldLabelContainer();
    if (!container) return;

    if (!areWorldLabelsVisible()) {
      hideUnusedNodeWorldLabels(0);
      return;
    }

    if (_modalActive || !window.GameTerrain || !GameTerrain.getNearbyObjects || !window.GamePlayer || !window.GameScene) {
      hideUnusedNodeWorldLabels(0);
      return;
    }

    var playerPos = GamePlayer.getPosition ? GamePlayer.getPosition() : null;
    if (!playerPos) {
      hideUnusedNodeWorldLabels(0);
      return;
    }

    var searchRadius = getWorldLabelDistanceLimit();
    if (!(searchRadius > 0)) {
      hideUnusedNodeWorldLabels(0);
      return;
    }

    var nearby = GameTerrain.getNearbyObjects(playerPos.x, playerPos.z, searchRadius, 6);
    if (!nearby.length) {
      hideUnusedNodeWorldLabels(0);
      return;
    }

    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;
    var visibleCount = 0;

    nearby.forEach(function(objData) {
      if (!shouldShowWorldNodeLabel(objData)) return;

      var nodeInfo = GameTerrain.getNodeInfo(objData);
      if (!nodeInfo) return;

      var worldHeight = nodeInfo.isGiant ? 2.3 : 1.35;
      var pos = projectHudWorldPoint(objData.worldX, worldHeight, objData.worldZ);
      if (!pos || pos.z > 1 || pos.z < -1) return;

      var x = pos.x;
      var y = pos.y;

      if (x < -100 || x > screenWidth + 100 || y < -80 || y > screenHeight + 80) {
        return;
      }

      var accentColor = getNodeAccentColor(nodeInfo);
      var detailText = getWorldNodeMeta(objData, nodeInfo);
      var titleText = getWorldNodeTitle(objData, nodeInfo, null);

      var entry = ensureNodeWorldLabelEntry(visibleCount, container);
      visibleCount++;
      if (!entry) return;

      setNodeTransform(entry.root, x, y, 'translate(-50%, -100%)');
      setNodeDisplay(entry.root, true);
      setNodeClassState(entry.root, 'rare', !!nodeInfo.isGiant);
      setNodeBorderColor(entry.root, accentColor);
      setNodeText(entry.title, titleText);
      setNodeText(entry.meta, detailText);
    });

    hideUnusedNodeWorldLabels(visibleCount);
  }

  function updateBuildingStorageLabels() {
    if (!areWorldLabelsVisible()) {
      hideUnusedBuildingLabels({}, {});
      return;
    }

    if (!window.GameScene || !GameScene.getCamera || !window.GameState) return;

    var container = getBuildingLabelContainer();
    if (!container) return;

    var instances = getHudInstances();
    if (_modalActive) {
      hideUnusedBuildingLabels({}, instances);
      return;
    }

    var camera = GameScene.getCamera();
    if (!camera) {
      hideUnusedBuildingLabels({}, {});
      return;
    }

    var visibleMap = {};
    var playerPos = (window.GamePlayer && GamePlayer.getPosition) ? GamePlayer.getPosition() : null;
    var worldCullRadiusMultiplier = getBuildingLabelCullMultiplier();
    if (!(worldCullRadiusMultiplier > 0)) {
      hideUnusedBuildingLabels({}, instances);
      return;
    }
    var worldCullRadius = camera ? ((Math.abs(camera.right) + Math.abs(camera.top)) * worldCullRadiusMultiplier + 6) : 42;

    for (var uid in instances) {
      var inst = instances[uid];
      var balance = GameRegistry.getBalance(inst.entityId);
      if (!balance) continue;

      if (playerPos && (Math.abs(inst.x - playerPos.x) > worldCullRadius || Math.abs(inst.z - playerPos.z) > worldCullRadius)) {
        continue;
      }

      var storageCapacity = balance.storageCapacity ? GameState.getStorageCapacity(uid) : 0;
      var storageUsed = storageCapacity > 0 ? GameState.getStorageUsed(uid) : 0;
      var showStorage = shouldShowBuildingStorageWarning(inst, balance, storageCapacity, storageUsed);
      var showFuel = false;

      if (!showStorage) continue;

      var pct = storageCapacity > 0 ? Math.floor((storageUsed / storageCapacity) * 100) : 0;
      var barColor = pct >= 90 ? '#e94560' : pct >= 70 ? '#f0a500' : '#4ecca3';

      var pos = projectHudWorldPoint(inst.x, 1.3, inst.z);
      if (!pos || pos.z > 1 || pos.z < -1) continue;

      var x = pos.x;
      var y = pos.y;

      if (x < -100 || x > window.innerWidth + 100 || y < -100 || y > window.innerHeight + 100) {
        continue;
      }

      var entry = ensureBuildingLabelNode(uid, container);
      var transformValue = 'translate3d(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, 0) translate(-50%, -50%)';
      if (entry.lastTransform !== transformValue) {
        entry.root.style.transform = transformValue;
        entry.lastTransform = transformValue;
      }

      setNodeDisplay(entry.root, true);
      setNodeDisplay(entry.fuelCard, showFuel);
      setNodeDisplay(entry.storageCard, showStorage);

      if (showStorage) {
        setNodeWidth(entry.storageFill, pct);
        setNodeColor(entry.storageFill, barColor);

        if (pct >= 100) {
          setNodeText(entry.storageValue, 'FULL');
          setNodeClassState(entry.storageValue, 'is-alert', true);
          setNodeClassState(entry.storageValue, 'is-dim', false);
        } else if (pct > 0 || !balance.lightRadius) {
          setNodeText(entry.storageValue, storageUsed + '/' + storageCapacity);
          setNodeClassState(entry.storageValue, 'is-alert', false);
          setNodeClassState(entry.storageValue, 'is-dim', false);
        } else {
          setNodeText(entry.storageValue, '0/' + storageCapacity);
          setNodeClassState(entry.storageValue, 'is-alert', false);
          setNodeClassState(entry.storageValue, 'is-dim', true);
        }
      }

      visibleMap[uid] = true;
    }

    hideUnusedBuildingLabels(visibleMap, instances);
  }

  return {
    init: init,
    renderAll: renderAll,
    renderNow: renderNow,
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
    updateTrackedObjectHpBar: updateTrackedObjectHpBar,
    updateNodeHpBars: updateNodeHpBars,
    updateNodeWorldLabels: updateNodeWorldLabels,
    updateBuildingStorageLabels: updateBuildingStorageLabels,
    updatePerformanceStats: updatePerformanceStats,
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
    activateQuickbarSlot: activateQuickbarSlot,
    applyQualityPreset: applyQualityPreset,
    acceptQualitySuggestion: acceptQualitySuggestion,
    snoozeQualityPrompt: snoozeQualityPrompt,
    dismissQualityPrompt: dismissQualityPrompt,
    switchQualitySettingsTab: switchQualitySettingsTab,
    toggleQualitySettingsPanel: toggleQualitySettingsPanel,
    applyDebugSettingsState: applyDebugSettingsState,
    setLanguage: setLanguage,
    resetAllGameData: resetAllGameData,
    isHudVisible: isHudVisible
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
