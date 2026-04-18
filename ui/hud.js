console.log('[HUD] Loading hud.js...');

window.GameDebugSettings = window.GameDebugSettings || (function () {
  var STORAGE_KEY = 'evolution_debug_settings_v1';
  var _defaults = {
    hud: true,
    minimap: true,
    worldLabels: true,
    notifications: true,
    particles: true,
    weather: true,
    atmosphere: true,
    animals: true,
    npcs: true,
    barracksTroops: true
  };
  var _legacyLowPresetSnapshot = {
    hud: true,
    minimap: true,
    worldLabels: true,
    notifications: true,
    particles: false,
    weather: true,
    atmosphere: false,
    animals: true,
    npcs: true,
    barracksTroops: true
  };
  var _state = loadState();
  var _listeners = [];

  function cloneDefaults() {
    var copy = {};
    for (var key in _defaults) {
      copy[key] = _defaults[key];
    }
    return copy;
  }

  function matchesSnapshot(snapshot, expected) {
    for (var key in _defaults) {
      if ((snapshot[key] !== false) !== (expected[key] !== false)) {
        return false;
      }
    }
    return true;
  }

  function shouldResetLegacyLowPresetSnapshot(snapshot) {
    if (!window.GameQualitySettings || !GameQualitySettings.getPresetId) return false;
    if (GameQualitySettings.getPresetId() !== 'low') return false;
    return matchesSnapshot(snapshot, _legacyLowPresetSnapshot);
  }

  function loadState() {
    var nextState = cloneDefaults();
    try {
      if (typeof localStorage === 'undefined') return nextState;
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return nextState;
      var parsed = JSON.parse(raw);
      for (var key in _defaults) {
        if (parsed && typeof parsed[key] === 'boolean') {
          nextState[key] = parsed[key];
        }
      }

      if (shouldResetLegacyLowPresetSnapshot(nextState)) {
        nextState = cloneDefaults();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      }
    } catch (error) {
      console.warn('[DebugSettings] Failed to load saved state:', error);
    }
    return nextState;
  }

  function saveState() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (error) {
      console.warn('[DebugSettings] Failed to save state:', error);
    }
  }

  function emit(change) {
    var snapshot = getAll();
    for (var i = 0; i < _listeners.length; i++) {
      try {
        _listeners[i](snapshot, change || null);
      } catch (error) {
        console.warn('[DebugSettings] Listener failed:', error);
      }
    }
  }

  function isEnabled(key) {
    return _state[key] !== false;
  }

  function setEnabled(key, enabled, source) {
    if (!_defaults.hasOwnProperty(key)) return false;
    var nextValue = enabled !== false;
    if (_state[key] === nextValue) return nextValue;
    _state[key] = nextValue;
    saveState();
    emit({ key: key, value: nextValue, source: source || 'set' });
    return nextValue;
  }

  function toggle(key, source) {
    return setEnabled(key, !isEnabled(key), source || 'toggle');
  }

  function applySnapshot(snapshot, source) {
    var changed = false;
    for (var key in _defaults) {
      if (!snapshot || typeof snapshot[key] !== 'boolean') continue;
      if (_state[key] === snapshot[key]) continue;
      _state[key] = snapshot[key];
      changed = true;
    }

    if (!changed) return getAll();

    saveState();
    emit({ type: 'batch', source: source || 'snapshot' });
    return getAll();
  }

  function getAll() {
    var snapshot = {};
    for (var key in _defaults) {
      snapshot[key] = _state[key] !== false;
    }
    return snapshot;
  }

  function reset(source) {
    _state = cloneDefaults();
    saveState();
    emit({ type: 'reset', source: source || 'reset' });
    return getAll();
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      return function () {};
    }
    _listeners.push(listener);
    return function () {
      for (var i = _listeners.length - 1; i >= 0; i--) {
        if (_listeners[i] === listener) {
          _listeners.splice(i, 1);
          break;
        }
      }
    };
  }

  return {
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    toggle: toggle,
    applySnapshot: applySnapshot,
    getAll: getAll,
    reset: reset,
    subscribe: subscribe,
    getDefaults: cloneDefaults
  };
})();

(function applyEarlyDebugSettingsClasses() {
  if (typeof document === 'undefined') return;

  function syncBodyClasses() {
    if (!document.body || !window.GameDebugSettings || !GameDebugSettings.isEnabled) return;

    document.body.classList.toggle('debug-hud-hidden', !GameDebugSettings.isEnabled('hud'));
    document.body.classList.toggle('debug-minimap-hidden', !GameDebugSettings.isEnabled('minimap'));
    document.body.classList.toggle('debug-world-labels-hidden', !GameDebugSettings.isEnabled('worldLabels'));
  }

  if (document.body) {
    syncBodyClasses();
    return;
  }

  document.addEventListener('DOMContentLoaded', syncBodyClasses, { once: true });
})();

if (window.GameQualitySettings && GameQualitySettings.syncRuntime) {
  GameQualitySettings.syncRuntime('hud-load');
}

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
    var _debugSettingsUnsubscribe = null;
    var _qualityPanelOpen = false;
    var _qualitySettingsTab = 'graphics';
    var _qualitySettingsUnsubscribe = null;
    var _qualityPromptState = {
      visible: false,
      suggestedPreset: null,
      suggestedLabel: '',
      fps: 0,
      frameMs: 0,
      snoozeUntil: 0,
      stableSeconds: 0,
      lowFpsSeconds: 0
    };
    var _settlementHtmlCacheKey = '';
    var _settlementHtmlCacheValue = '';
    var _objectiveTrackerCacheKey = '';
    var _objectiveTrackerCacheClassName = '';
    var _objectiveTrackerCacheHtml = '';
    var QUALITY_SETTINGS_TABS = [
      {
        id: 'graphics',
        kicker: 'Render',
        label: 'Graphics',
        title: 'Graphics Presets',
        description: 'Choose render quality here only. This tab should not directly manage the switches in the tabs below.'
      },
      {
        id: 'overlay',
        kicker: 'HUD',
        label: 'Overlay',
        title: 'Overlay Surfaces',
        description: 'Control HUD readability layers, map visibility, and other player-facing interface surfaces.'
      },
      {
        id: 'worldFx',
        kicker: 'Visual',
        label: 'World FX',
        title: 'World FX',
        description: 'Adjust optional ambience and effect systems without touching the core render preset.'
      },
      {
        id: 'simulation',
        kicker: 'CPU',
        label: 'Simulation',
        title: 'Simulation Systems',
        description: 'Profile heavy runtime systems independently when you need to isolate CPU cost.'
      }
    ];
    var DEBUG_SETTINGS_GROUPS = {
      overlay: {
        title: 'Overlay',
        copy: 'HUD visibility and readability controls that affect what the player sees on screen.',
        items: [
          { key: 'hud', label: 'HUD Overlay', hint: 'Show or hide HUD surfaces while keeping the settings controls available.' },
          { key: 'minimap', label: 'Minimap', hint: 'Show the minimap and allow opening the full world map.' },
          { key: 'worldLabels', label: 'World Labels', hint: 'Show HP bars, world labels, and storage warning overlays.' },
          { key: 'notifications', label: 'Notifications', hint: 'Enable toast notifications for combat, crafting, and settlement events.' }
        ]
      },
      worldFx: {
        title: 'World FX',
        copy: 'Optional effect layers for ambience and impact feedback.',
        items: [
          { key: 'particles', label: 'Particles', hint: 'Enable impact sparks, embers, and other particle effects.' },
          { key: 'weather', label: 'Weather', hint: 'Enable rain simulation and weather visuals.' },
          { key: 'atmosphere', label: 'Atmosphere', hint: 'Enable ambience updates such as stars, clouds, and wind motion.' }
        ]
      },
      simulation: {
        title: 'Simulation',
        copy: 'Heavy update loops for entities and automation, useful when profiling CPU load.',
        items: [
          { key: 'animals', label: 'Animal Simulation', hint: 'Freeze animal AI and movement updates.' },
          { key: 'npcs', label: 'NPC Workers', hint: 'Pause worker updates to isolate settlement CPU load.' },
          { key: 'barracksTroops', label: 'Barracks Troops', hint: 'Pause deployed troop updates and targeting.' }
        ]
      }
    };

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

    function getQualitySettingsPanel() {
      return document.getElementById('quality-settings-panel');
    }

    function getQualitySettingsToggleButton() {
      return document.getElementById('quality-settings-toggle');
    }

    function getQualityPromptElement() {
      return document.getElementById('quality-prompt');
    }

    function getQualitySnapshot() {
      return (window.GameQualitySettings && GameQualitySettings.getSnapshot) ? GameQualitySettings.getSnapshot() : null;
    }

    function getCurrentQualityPreset() {
      var snapshot = getQualitySnapshot();
      return snapshot && snapshot.current ? snapshot.current : { id: 'high', label: 'High', description: '', summary: '' };
    }

    function getQualityRuntimeConfigForPreset(presetId) {
      return (window.GameQualitySettings && GameQualitySettings.getRuntimeConfigForPreset) ? GameQualitySettings.getRuntimeConfigForPreset(presetId) : null;
    }

    function normalizeQualitySettingsTab(tabId) {
      for (var i = 0; i < QUALITY_SETTINGS_TABS.length; i++) {
        if (QUALITY_SETTINGS_TABS[i].id === tabId) return QUALITY_SETTINGS_TABS[i].id;
      }
      return 'graphics';
    }

    function getQualitySettingsTabMeta(tabId) {
      var resolvedTabId = normalizeQualitySettingsTab(tabId);
      for (var i = 0; i < QUALITY_SETTINGS_TABS.length; i++) {
        if (QUALITY_SETTINGS_TABS[i].id === resolvedTabId) return QUALITY_SETTINGS_TABS[i];
      }
      return QUALITY_SETTINGS_TABS[0];
    }

    function getQualitySettingsGroup(tabId) {
      return DEBUG_SETTINGS_GROUPS[normalizeQualitySettingsTab(tabId)] || null;
    }

    function getQualityPresetAudience(presetId) {
      if (presetId === 'high') return 'Stronger desktops';
      if (presetId === 'medium') return 'Balanced default';
      if (presetId === 'low') return 'Older laptops';
      return 'Adaptive profile';
    }

    function getQualityShadowLabel(config) {
      if (!config || !config.scene || !config.scene.shadows) return 'Shadows Off';
      if (config.scene.shadowMapSize >= 2048) return 'Shadows High';
      if (config.scene.shadowMapSize >= 1024) return 'Shadows Medium';
      return 'Shadows On';
    }

    function getQualityWeatherLabel(config) {
      if (!config || !config.debug || !config.debug.weather || !config.weather || !config.weather.rainDropCount) return 'Weather Off';
      if (config.weather.rainDropCount >= 600) return 'Weather Full';
      if (config.weather.rainDropCount >= 300) return 'Weather Light';
      return 'Weather Minimal';
    }

    function getQualityOverlayLabel(config) {
      if (!config || !config.debug || !config.debug.worldLabels || !config.scene) return 'Overlays Minimal';
      if (config.scene.nodeHpLabelDistance >= 999) return 'Overlays Full';
      return 'Overlays Balanced';
    }

    function getQualityRefreshLabel(config) {
      if (!config || !config.minimap) return 'Map Refresh Standard';
      if (config.minimap.fullRefreshMs <= 150) return 'Map Refresh Fast';
      if (config.minimap.fullRefreshMs <= 200) return 'Map Refresh Balanced';
      return 'Map Refresh Eco';
    }

    function buildQualityPillListHtml(presetId) {
      var config = getQualityRuntimeConfigForPreset(presetId);
      if (!config) return '';

      var sceneConfig = config.scene || {};
      var debugConfig = config.debug || {};
      var pills = [
        getQualityShadowLabel(config),
        getQualityWeatherLabel(config),
        debugConfig.particles ? 'Particles On' : 'Particles Off',
        getQualityOverlayLabel(config),
        'Render Scale ' + Math.round((sceneConfig.maxPixelRatioCap || 1) * 100) + '%',
        getQualityRefreshLabel(config)
      ];

      var html = '<div class="quality-settings-pill-list">';
      for (var i = 0; i < pills.length; i++) {
        html += '<span class="quality-settings-pill">' + escapeHtml(pills[i]) + '</span>';
      }
      html += '</div>';
      return html;
    }

    function buildQualitySettingsSidebarHtml(activeTabId) {
      var html = '<aside class="quality-settings-sidebar">';
      html += '<div class="quality-settings-sidebar-label">Settings Sections</div>';
      html += '<div class="quality-settings-tab-nav">';

      for (var i = 0; i < QUALITY_SETTINGS_TABS.length; i++) {
        var tab = QUALITY_SETTINGS_TABS[i];
        var tabClass = 'quality-settings-tab-button';
        if (tab.id === activeTabId) tabClass += ' active';
        html += '<button class="' + tabClass + '" type="button" onclick="GameHUD.switchQualitySettingsTab(\'' + tab.id + '\')">' +
          '<span class="quality-settings-tab-kicker">' + escapeHtml(tab.kicker) + '</span>' +
          '<span class="quality-settings-tab-name">' + escapeHtml(tab.label) + '</span>' +
        '</button>';
      }

      html += '</div>';
      html += '<div class="quality-settings-sidebar-note">Use the sidebar to separate graphics presets from overlay, FX, and simulation switches.</div>';
      html += '</aside>';
      return html;
    }

    function buildQualityRuntimeSettingsTabHtml(tabId) {
      var group = getQualitySettingsGroup(tabId);
      if (!group) return '';

      var html = '<div class="quality-settings-body quality-settings-body-runtime">';
      html += '<section class="quality-settings-section">';
      html += '<div class="quality-settings-section-head">' +
        '<div>' +
          '<div class="quality-settings-section-kicker">' + escapeHtml(group.title) + '</div>' +
          '<div class="quality-settings-section-title">' + escapeHtml(group.title) + ' Controls</div>' +
        '</div>' +
      '</div>';
      html += '<div class="quality-settings-copy">' + escapeHtml(group.copy || '') + '</div>';
      html += '<div class="quality-settings-toggle-list">';

      for (var itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
        var item = group.items[itemIndex];
        html += '<label class="debug-setting-row">' +
          '<span class="debug-setting-copy-block">' +
            '<span class="debug-setting-name">' + escapeHtml(item.label) + '</span>' +
            '<span class="debug-setting-hint">' + escapeHtml(item.hint) + '</span>' +
          '</span>' +
          '<input type="checkbox" data-settings-toggle="' + item.key + '"' + (isDebugSettingEnabled(item.key) ? ' checked' : '') + '>' +
        '</label>';
      }

      html += '</div>';
      html += '<div class="quality-settings-toolbar"><button class="debug-settings-reset" type="button" data-settings-reset="true">Reset Runtime Toggles</button></div>';
      html += '<div class="quality-settings-compact-note">Changes here only affect this runtime category. Graphics presets stay isolated in the Graphics tab.</div>';
      html += '</section>';
      html += '</div>';
      return html;
    }

    function buildQualityGraphicsTabHtml(snapshot, current) {
      var currentCopy = current.summary || current.description || 'Choose how much visual detail and rendering cost the game should target.';
      var html = '<div class="quality-settings-body quality-settings-body-graphics">';
      html += '<section class="quality-settings-section quality-settings-section-current">';
      html += '<div class="quality-settings-section-head">' +
        '<div>' +
          '<div class="quality-settings-section-kicker">Current Profile</div>' +
          '<div class="quality-settings-section-title">' + escapeHtml((current.label || 'High') + ' preset active') + '</div>' +
        '</div>' +
        '<div class="quality-settings-status">Live</div>' +
      '</div>';
      html += '<div class="quality-settings-copy">' + escapeHtml(currentCopy) + '</div>';
      html += buildQualityPillListHtml(current.id);
      html += '<div class="quality-settings-note">Changing a preset here updates graphics quality only in this Settings flow. Overlay, World FX, and Simulation stay in their own tabs.</div>';
      html += '<div class="quality-settings-inline-meta">' +
        '<div class="quality-settings-inline-item"><span class="quality-settings-inline-label">Shortcut</span><strong>F9</strong></div>' +
        '<div class="quality-settings-inline-item"><span class="quality-settings-inline-label">Assist</span><strong>Opt-in only</strong></div>' +
      '</div>';
      html += '</section>';

      html += '<section class="quality-settings-section quality-settings-section-presets">';
      html += '<div class="quality-settings-section-head">' +
        '<div>' +
          '<div class="quality-settings-section-kicker">Graphics Preset</div>' +
          '<div class="quality-settings-section-title">Choose the look and performance target</div>' +
        '</div>' +
      '</div>';
      html += '<div class="quality-settings-choice-list">';
      for (var i = 0; i < snapshot.presets.length; i++) {
        var preset = snapshot.presets[i];
        var rowClass = 'quality-choice-row';
        if (preset.id === snapshot.preset) rowClass += ' active';
        html += '<button class="' + rowClass + '" type="button" onclick="GameHUD.applyQualityPreset(\'' + preset.id + '\')">' +
          '<span class="quality-choice-copy">' +
            '<span class="quality-choice-name-row">' +
              '<span class="quality-choice-name">' + escapeHtml(preset.label) + '</span>' +
              '<span class="quality-choice-badge">' + escapeHtml(getQualityPresetAudience(preset.id)) + '</span>' +
            '</span>' +
            '<span class="quality-choice-hint">' + escapeHtml(preset.summary || preset.description || '') + '</span>' +
          '</span>' +
          '<span class="quality-choice-state">' + (preset.id === snapshot.preset ? 'Active' : 'Apply') + '</span>' +
        '</button>';
      }
      html += '</div>';
      html += '</section>';
      html += '</div>';
      return html;
    }

    function updateQualitySettingsToggleState() {
      var button = getQualitySettingsToggleButton();
      if (!button) return;

      button.setAttribute('aria-expanded', _qualityPanelOpen ? 'true' : 'false');
      button.setAttribute('aria-label', 'Setting (F9)');
      button.setAttribute('title', 'Setting (F9)');
      setNodeClassState(button, 'is-open', _qualityPanelOpen);
      setInnerHtmlIfChanged(button,
        '<span class="quality-settings-toggle-text">Setting</span>'
      );
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

    function renderQualitySettingsPanel() {
      var panel = getQualitySettingsPanel();
      var snapshot = getQualitySnapshot();
      if (!panel || !snapshot) return;

      var current = snapshot.current || { id: 'high', label: 'High', description: '', summary: '' };
      var activeTab = getQualitySettingsTabMeta(_qualitySettingsTab);
      _qualitySettingsTab = activeTab.id;
      var html = '<div class="quality-popup-content" onclick="event.stopPropagation()">' +
        '<div class="quality-settings-header">' +
        '<div>' +
          '<div class="quality-settings-kicker">Settings</div>' +
          '<div class="quality-settings-title">Sidebar Settings</div>' +
          '<div class="quality-settings-copy">Adjust Graphics, Overlay, World FX, and Simulation in separate tabs so each category stays in its own lane.</div>' +
        '</div>' +
        '<button class="quality-settings-close" type="button" onclick="GameHUD.toggleQualitySettingsPanel(false)">Close</button>' +
      '</div>';

      html += '<div class="quality-settings-layout">';
      html += buildQualitySettingsSidebarHtml(activeTab.id);
      html += '<div class="quality-settings-stage">';
      html += '<div class="quality-settings-stage-header">' +
        '<div class="quality-settings-stage-kicker">' + escapeHtml(activeTab.kicker) + '</div>' +
        '<div class="quality-settings-stage-title">' + escapeHtml(activeTab.title) + '</div>' +
        '<div class="quality-settings-copy">' + escapeHtml(activeTab.description) + '</div>' +
      '</div>';
      html += activeTab.id === 'graphics'
        ? buildQualityGraphicsTabHtml(snapshot, current)
        : buildQualityRuntimeSettingsTabHtml(activeTab.id);
      html += '</div>';
      html += '</div>';
      html += '</div>';

      setInnerHtmlIfChanged(panel, html);
      setNodeClassState(panel, 'open', _qualityPanelOpen);
      panel.setAttribute('aria-hidden', _qualityPanelOpen ? 'false' : 'true');
      updateQualitySettingsToggleState();
    }

    function renderQualityPrompt() {
      var prompt = getQualityPromptElement();
      if (!prompt) return;

      if (_qualityPanelOpen || !_qualityPromptState.visible || !_qualityPromptState.suggestedPreset) {
        prompt.classList.remove('show');
        prompt.setAttribute('aria-hidden', 'true');
        prompt.innerHTML = '';
        return;
      }

      var preset = window.GameQualitySettings && GameQualitySettings.getPresetDefinition ? GameQualitySettings.getPresetDefinition(_qualityPromptState.suggestedPreset) : null;
      var label = preset && preset.label ? preset.label : _qualityPromptState.suggestedLabel || _qualityPromptState.suggestedPreset;
      var html = '<div class="quality-prompt-card">' +
        '<div class="quality-prompt-kicker">Performance Advisory</div>' +
        '<div class="quality-prompt-title">FPS is staying low</div>' +
        '<div class="quality-prompt-copy">Average is around ' + escapeHtml(String(_qualityPromptState.fps || 0)) + ' FPS (' + escapeHtml(String(_qualityPromptState.frameMs || 0)) + ' ms). Switch to <strong>' + escapeHtml(label) + '</strong> to reduce CPU and rendering load?</div>' +
        '<div class="quality-prompt-actions">' +
          '<button class="quality-prompt-btn accept" type="button" onclick="GameHUD.acceptQualitySuggestion()">Switch to ' + escapeHtml(label) + '</button>' +
          '<button class="quality-prompt-btn" type="button" onclick="GameHUD.snoozeQualityPrompt()">Not now</button>' +
          '<button class="quality-prompt-btn subtle" type="button" onclick="GameHUD.dismissQualityPrompt()">Keep current</button>' +
        '</div>' +
      '</div>';

      setInnerHtmlIfChanged(prompt, html);
      prompt.classList.add('show');
      prompt.setAttribute('aria-hidden', 'false');
    }

    function applyQualitySettingsState() {
      updateQualitySettingsToggleState();
      renderQualitySettingsPanel();
      renderQualityPrompt();
    }

    function toggleQualitySettingsPanel(forceOpen) {
      _qualityPanelOpen = typeof forceOpen === 'boolean' ? forceOpen : !_qualityPanelOpen;
      renderQualitySettingsPanel();
      return _qualityPanelOpen;
    }

    function switchQualitySettingsTab(tabId) {
      var nextTabId = normalizeQualitySettingsTab(tabId);
      if (_qualitySettingsTab === nextTabId) return nextTabId;
      _qualitySettingsTab = nextTabId;
      renderQualitySettingsPanel();
      return nextTabId;
    }

    function applyQualityPreset(presetId, source) {
      if (!window.GameQualitySettings || !GameQualitySettings.applyPreset) return null;

      var nextPreset = GameQualitySettings.applyPreset(presetId, source || 'panel', { syncDebug: true });
      _qualityPromptState.visible = false;
      _qualityPromptState.lowFpsSeconds = 0;
      renderQualityPrompt();
      applyQualitySettingsState();

      if (nextPreset && nextPreset.label) {
        showNotification('Graphics preset: ' + nextPreset.label, 'info');
      }

      return nextPreset;
    }

    function hideQualityPrompt(snoozeMs) {
      _qualityPromptState.visible = false;
      if (snoozeMs && snoozeMs > 0) {
        _qualityPromptState.snoozeUntil = Date.now() + snoozeMs;
      }
      renderQualityPrompt();
    }

    function acceptQualitySuggestion() {
      if (!_qualityPromptState.suggestedPreset) return null;
      var accepted = applyQualityPreset(_qualityPromptState.suggestedPreset, 'advisor');
      hideQualityPrompt(120000);
      return accepted;
    }

    function snoozeQualityPrompt() {
      hideQualityPrompt(90000);
    }

    function dismissQualityPrompt() {
      hideQualityPrompt(300000);
    }

    function applyDebugSettingsState(reason) {
      var hudVisible = isHudVisible();
      var worldLabelsVisible = areWorldLabelsVisible();

      setBodyClass('debug-hud-hidden', !hudVisible);
      setBodyClass('debug-minimap-hidden', !isDebugSettingEnabled('minimap'));
      setBodyClass('debug-world-labels-hidden', !worldLabelsVisible);

      if (!hudVisible) {
        clearScheduledRender();
        if (_modalActive) closeModal();
        closeInspector();
      }

      if (!worldLabelsVisible) {
        clearWorldOverlayElements();
      }

      if (!areNotificationsVisible()) {
        hideNotificationElement();
      }

      if (window.MiniMap && MiniMap.refreshVisibility) {
        MiniMap.refreshVisibility();
      }
      if (window.WeatherSystem && WeatherSystem.setEnabled) {
        WeatherSystem.setEnabled(isDebugSettingEnabled('weather'));
      }
      if (window.ParticleSystem && ParticleSystem.clearAll && !isDebugSettingEnabled('particles')) {
        ParticleSystem.clearAll();
      }

      renderQualitySettingsPanel();
      if (hudVisible) {
        renderAll(reason || 'debug-settings');
      }
    }

    function bindQualitySettingsUi() {
      var panel = getQualitySettingsPanel();
      if (panel && !panel._qualitySettingsPanelBound) {
        panel.addEventListener('change', function (event) {
          var target = event.target;
          var key = target && target.getAttribute ? target.getAttribute('data-settings-toggle') : null;
          if (!key || !window.GameDebugSettings) return;
          GameDebugSettings.setEnabled(key, !!target.checked, 'settings-panel');
        });
        panel.addEventListener('click', function (event) {
          if (event.target === panel) {
            toggleQualitySettingsPanel(false);
            return;
          }
          var target = event.target;
          if (!target || !target.getAttribute || target.getAttribute('data-settings-reset') !== 'true' || !window.GameDebugSettings) return;
          GameDebugSettings.reset('settings-panel');
          renderQualitySettingsPanel();
        });
        panel._qualitySettingsPanelBound = true;
      }

      var button = getQualitySettingsToggleButton();
      if (button && !button._qualitySettingsBound) {
        button.addEventListener('click', function () {
          toggleQualitySettingsPanel();
        });
        button._qualitySettingsBound = true;
      }

      if (!_qualitySettingsUnsubscribe && window.GameQualitySettings && GameQualitySettings.subscribe) {
        _qualitySettingsUnsubscribe = GameQualitySettings.subscribe(function () {
          applyQualitySettingsState();
        });
      }

      if (!_debugSettingsUnsubscribe && window.GameDebugSettings && GameDebugSettings.subscribe) {
        _debugSettingsUnsubscribe = GameDebugSettings.subscribe(function (snapshot, change) {
          applyDebugSettingsState(change && change.key ? ('debug:' + change.key) : 'debug-settings');
        });
      }
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
    fuelBadge.textContent = 'FIRE';
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

  function buildSettlementStatusHtml() {
    if (!window.GameActions || !GameActions.getSettlementStatus) return '';

    var settlementStatus = GameActions.getSettlementStatus();
    if (!settlementStatus || !settlementStatus.alerts || !settlementStatus.alerts.length) return '';

    var cacheKey = settlementStatus.cacheKey || JSON.stringify(settlementStatus.alerts);
    if (_settlementHtmlCacheKey === cacheKey && _settlementHtmlCacheValue) {
      return _settlementHtmlCacheValue;
    }

    var html = '<div class="objective-hint">Priority status</div>';
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
    var currentAgeEntity = GameRegistry.getEntity(GameState.getAge());
    var currentAgeLabel = currentAgeEntity ? currentAgeEntity.name : GameState.getAge();
    var coreVersion = (window.GameState && GameState.getCoreStateVersion) ? GameState.getCoreStateVersion() : 0;
    var settlementStatus = (window.GameActions && GameActions.getSettlementStatus) ? GameActions.getSettlementStatus() : null;
    var settlementCacheKey = settlementStatus && settlementStatus.cacheKey ? settlementStatus.cacheKey : 'settlement:none';
    var trackerCachePrefix = GameState.getAge() + '|' + coreVersion + '|' + settlementCacheKey;

    var nextAge = getNextAgeObjective();
    if (!nextAge) {
      var readyCacheKey = trackerCachePrefix + '|ready';
      if (_objectiveTrackerCacheKey === readyCacheKey && _objectiveTrackerCacheHtml) {
        tracker.className = _objectiveTrackerCacheClassName;
        setInnerHtmlIfChanged(tracker, _objectiveTrackerCacheHtml);
        return;
      }

      var clearedSettlementHtml = buildSettlementStatusHtml();
      var readyHtml = '<div class="objective-meta"><span class="objective-label">Current Age</span><span class="objective-age">' + escapeHtml(currentAgeLabel) + '</span></div>' +
        '<div class="objective-title">All Ages Unlocked</div>' +
        '<div class="objective-detail">Current progression content is fully cleared.</div>' +
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
    var trackerHtml = '<div class="objective-meta"><span class="objective-label">Current Age</span><span class="objective-age">' + escapeHtml(currentAgeLabel) + '</span></div>' +
      '<div class="objective-title">' + escapeHtml(nextAge.entity.name) + (canAdvance ? ' Ready!' : '') + '</div>' +
      checklistHtml +
      settlementHtml +
      '<div class="objective-actions"><button class="objective-advance-btn' + (canAdvance ? ' ready' : '') + '" onclick="GameActions.advanceAge(\'' + nextAge.entity.id + '\')"' + (canAdvance ? '' : ' disabled') + '>Advance Age</button></div>';

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
    if (!isHudVisible()) return;

    _quickbarItems = _quickbarMode === 'craft' ? getQuickbarCraftItems() : getQuickbarBuildItems();

    var toggleClassName = 'quickbar-toggle ' + (_quickbarMode === 'craft' ? 'craft' : 'build');
    if (toggleButton.className !== toggleClassName) {
      toggleButton.className = toggleClassName;
    }
    setInnerHtmlIfChanged(toggleButton, '<span class="quickbar-toggle-label">' + (_quickbarMode === 'craft' ? 'Craft' : 'Build') + '</span>' +
      '<span class="quickbar-toggle-hint">Tab</span>');

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

    setInnerHtmlIfChanged(panel, html || '<div class="card">No buildings available yet.</div>');
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

    setInnerHtmlIfChanged(panel, html || '<div class="card">No recipes available. Explore and gather resources!</div>');
  }

  function renderInventoryPanel() {
    var panel = document.getElementById("panel-inventory");
    if (!panel) return;

    var player = GameState.getPlayer();
    var inventory = GameState.getInventory();
    var html = '<div class="card"><div class="card-name">Equipped</div>';

    var slots = ["weapon", "offhand", "armor", "boots"];
    slots.forEach(function (slot) {
      var equippedId = player.equipped[slot];
      if (equippedId) {
        var entity = GameRegistry.getEntity(equippedId);
        var statStr = getEquipmentStatSummary(equippedId, { shortLabels: true });
        html += '<div class="inv-slot equipped" onclick="GameActions.unequip(\'' + slot + '\')">';
        html += '<div style="font-weight:bold">' + escapeHtml(entity ? entity.name : equippedId) + '</div>';
        if (statStr) html += '<div style="font-size:10px;color:#4ecca3">' + escapeHtml(statStr) + '</div>';
        html += '<div style="font-size:10px;color:#888">[' + slot + '] click to unequip</div>';
        html += '</div>';
      } else {
        html += '<div class="inv-slot" style="opacity:0.5">';
        html += '<div>Empty ' + escapeHtml(getEquipmentSlotLabel(slot)) + '</div></div>';
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
        var inventoryStatStr = getEquipmentStatSummary(id, { shortLabels: true });
        if (inventoryStatStr) html += '<div style="font-size:10px;color:#4ecca3">' + escapeHtml(inventoryStatStr) + '</div>';
        html += '</div>';
      }
    }
    if (!hasItems) {
      html += '<div style="color:#666;font-size:12px;padding:10px">No items yet. Craft equipment!</div>';
    }
    html += '</div></div>';

    setInnerHtmlIfChanged(panel, html);
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
    html += '<div class="card-info">Speed: ' + formatBalanceDisplayNumber(GameState.getPlayerSpeed ? GameState.getPlayerSpeed() : player.speed) + ' (base: ' + formatBalanceDisplayNumber(player.speed) + ')</div>';
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

    setInnerHtmlIfChanged(panel, html);
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
      var storageCapacity = GameState.getStorageCapacity(uid);
      if (storageCapacity > 0) {
        var storageUsed = GameState.getStorageUsed(uid);
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
      var isNight = typeof DayNightSystem !== 'undefined' && DayNightSystem.isNight();
      var coverageText = currentFuel <= 0
        ? 'No active coverage - out of fuel.'
        : (isNight ? 'Coverage active now for nearby workers.' : 'Coverage turns on automatically at night.');
      var coverageColor = currentFuel <= 0 ? '#e63946' : (isNight ? '#ffb74d' : '#c7d6e8');

      fuelHtml = '<div class="inspector-section">' +
        '<div style="font-size:11px;">🔥 Fuel: <span style="color:' + fuelColor + '; font-weight:bold;">' + Math.floor(currentFuel) + '/' + maxFuel + '</span> (' + fuelPct + '%)</div>';
      fuelHtml += '<div style="height:8px; background:rgba(15,52,96,0.9); border-radius:5px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); margin-top:5px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.28);">';
      fuelHtml += '<div style="width:' + fuelPct + '%; height:100%; background:linear-gradient(90deg, ' + fuelColor + ', #ffd166); border-radius:4px; transition:width 0.3s linear;"></div>';
      fuelHtml += '</div>';
      fuelHtml += '<div style="color:#888; font-size:10px; margin-top:3px;">Burning down through the night. Refuel fills the bar back to max.</div>';
      fuelHtml += '<div style="color:#ffb74d; font-size:10px; margin-top:3px;">Light radius: ' + balance.lightRadius + ' tiles</div>';
      fuelHtml += '<div style="color:' + coverageColor + '; font-size:10px; margin-top:2px;">' + coverageText + '</div>';

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
        var progressColor = farmStatus.nightWorkBlocked ? '#f4a261' : (farmStatus.ready ? '#4ecca3' : (farmStatus.riverBoosted ? '#66d9ff' : (farmStatus.watered ? '#57c7ff' : '#f0a500')));
        var supportColor = farmStatus.hasWaterSupport ? (farmStatus.supportSourceType === 'river' ? '#66d9ff' : '#4ecca3') : '#888';
        var lightColor = farmStatus.nightWorkBlocked ? '#f4a261' : (farmStatus.isNight ? '#ffb74d' : '#888');
        var storedText = farmStatus.storedAmount > 0 ? farmStatus.storedSummaryText : 'Storage empty';
        farmHtml = '<div class="inspector-section">' +
          '<div style="font-size:11px; color:#aaa; margin-bottom:4px;">🌱 Crop: <span style="color:#e0e0e0; font-weight:bold;">' + escapeHtml(farmStatus.cropName) + '</span></div>' +
          '<div style="font-size:11px; margin-bottom:4px;">Status: <span style="color:' + progressColor + '; font-weight:bold;">' + escapeHtml(farmStatus.statusText) + '</span></div>' +
          '<div style="height:6px; background:rgba(15,52,96,0.9); border-radius:4px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); margin-bottom:4px;">' +
            '<div style="width:' + farmStatus.progressPercent + '%; height:100%; background:' + progressColor + '; transition:width 0.2s;"></div>' +
          '</div>' +
          '<div style="font-size:10px; color:#9fb3c8; margin-bottom:2px;">' + escapeHtml(farmStatus.detailText) + '</div>' +
          '<div style="font-size:10px; color:#c7d6e8; margin-bottom:3px;">👷 Resident: ' + escapeHtml(farmStatus.workerStatusText) + '</div>' +
          '<div style="font-size:10px; color:' + lightColor + '; margin-bottom:3px;">🔥 Night light: ' + escapeHtml(farmStatus.nightLightLabel) + '</div>' +
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

    // --- Military section ---
    var militaryHtml = "";
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
          queueHtml = '<div style="font-size:10px; color:#777; margin-top:3px;">Queue empty</div>';
        }

        var reserveHtml = barracksStatus.reserves.length > 0
          ? barracksStatus.reserves.map(function(entry) {
              return escapeHtml(entry.label) + ': ' + entry.amount;
            }).join(' • ')
          : 'No trained reserves';
        var towerSupportHtml = barracksStatus.availableUnits.filter(function(unit) {
          return !!unit.towerSupportLabel;
        }).map(function(unit) {
          return escapeHtml(unit.label) + ': ' + escapeHtml(unit.towerSupportLabel);
        }).join(' • ');
        var modeButtons = [
          '<button class="btn ' + (barracksStatus.commandMode === 'guard' ? 'btn-craft' : 'btn-secondary') + '" style="font-size:10px; padding:4px 8px;" onclick="GameActions.setBarracksCommandMode(\'' + uid + '\', \'guard\')">Guard Nearby</button>',
          '<button class="btn ' + (barracksStatus.commandMode === 'follow' ? 'btn-craft' : 'btn-secondary') + '" style="font-size:10px; padding:4px 8px;" onclick="GameActions.setBarracksCommandMode(\'' + uid + '\', \'follow\')">Follow Player</button>'
        ].join(' ');

        var trainButtons = barracksStatus.availableUnits.map(function(unit) {
          var disabled = !unit.unlocked || !unit.canAfford || !barracksStatus.canQueueMore;
          var label = unit.unlocked ? unit.label : (unit.label + ' Lv.' + unit.unlockLevel);
          var hint = unit.costText ? (' • ' + escapeHtml(unit.costText)) : '';
          return '<button class="btn ' + (disabled ? 'btn-secondary' : 'btn-craft') + '" style="font-size:10px; padding:4px 8px;" onclick="GameActions.queueBarracksTraining(\'' + uid + '\', \'' + unit.unitType + '\')" ' + (disabled ? 'disabled' : '') + '>' + escapeHtml(label) + hint + '</button>';
        }).join(' ');

        militaryHtml = '<div class="inspector-section">' +
          '<div style="color:#cfa66b; font-size:11px; margin-bottom:4px;">🛡️ Reserve ' + barracksStatus.reserveCount + '/' + barracksStatus.reserveCapacity + ' • Queue ' + barracksStatus.queueUsed + '/' + barracksStatus.queueCapacity + '</div>' +
          '<div style="color:#888; font-size:10px; margin-bottom:4px;">Command radius: ' + barracksStatus.supportRange + ' • Training speed x' + barracksStatus.trainingSpeed.toFixed(2) + '</div>' +
          '<div style="color:#d9c89f; font-size:10px; margin-bottom:4px;">Mode: ' + escapeHtml(barracksStatus.commandModeLabel) + '</div>' +
          '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px;">' + modeButtons + '</div>' +
          '<div style="color:#7fc8d8; font-size:10px; margin-bottom:4px;">Deployed: ' + barracksStatus.deployedCount + ' • Engaged: ' + barracksStatus.engagedCount + '</div>' +
          '<div style="color:#9aa; font-size:10px; margin-bottom:4px;">' + escapeHtml(barracksStatus.troopStatusText) + '</div>' +
          '<div style="color:#b9c8d8; font-size:10px; margin-bottom:4px;">' + escapeHtml(barracksStatus.troopSummaryText) + '</div>' +
          '<div style="color:#8e9db0; font-size:10px; margin-bottom:4px;">Reserves: ' + escapeHtml(reserveHtml) + '</div>' +
          (towerSupportHtml ? ('<div style="color:#9aa; font-size:10px; margin-bottom:4px;">Tower support: ' + escapeHtml(towerSupportHtml) + (barracksStatus.commandMode === 'follow' ? ' (paused while following)' : '') + '</div>') : '') +
          '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px;">' + trainButtons + '</div>' +
          '<div style="color:#9aa; font-size:10px;">Training queue</div>' +
          queueHtml +
          (barracksStatus.nextUnlock ? ('<div style="color:#777; font-size:10px; margin-top:4px;">Next unlock: ' + escapeHtml(barracksStatus.nextUnlock.label) + ' at Lv.' + barracksStatus.nextUnlock.level + '</div>') : '') +
          '</div>';
      }
    } else if (window.GameActions && instance.entityId === 'building.watchtower' && GameActions.getWatchtowerStatus) {
      var watchtowerStatus = GameActions.getWatchtowerStatus(uid);
      if (watchtowerStatus) {
        var supportBonusParts = [];
        if (watchtowerStatus.rangeBonus > 0) supportBonusParts.push('+' + watchtowerStatus.rangeBonus.toFixed(1) + ' range');
        if (watchtowerStatus.attackDamageBonus > 0) supportBonusParts.push('+' + watchtowerStatus.attackDamageBonus + ' damage');
        if (watchtowerStatus.attackIntervalMultiplier < 0.999) supportBonusParts.push(Math.round((1 - watchtowerStatus.attackIntervalMultiplier) * 100) + '% faster');
        if (watchtowerStatus.workerProtectRadiusBonus > 0) supportBonusParts.push('+' + watchtowerStatus.workerProtectRadiusBonus.toFixed(1) + ' worker cover');
        var supportSummary = watchtowerStatus.linkedBarracksCount > 0
          ? watchtowerStatus.reserveSupportLabel + ' • ' + watchtowerStatus.linkedBarracksCount + ' barracks'
          : 'No barracks reserve link';
        militaryHtml = '<div class="inspector-section">' +
          '<div style="color:#e89b6b; font-size:11px; margin-bottom:4px;">🗼 ' + escapeHtml(watchtowerStatus.statusLabel) + '</div>' +
          '<div style="color:#aaa; font-size:10px; margin-bottom:3px;">Damage: ' + watchtowerStatus.attackDamage + ' • Interval: ' + watchtowerStatus.attackIntervalSeconds.toFixed(1) + 's • Cooldown: ' + watchtowerStatus.cooldownRemaining.toFixed(1) + 's</div>' +
          '<div style="color:#888; font-size:10px; margin-bottom:3px;">Worker cover: ' + watchtowerStatus.workerProtectRadius + ' • Shots: ' + watchtowerStatus.shotsFired + ' • Kills: ' + watchtowerStatus.kills + '</div>' +
          '<div style="color:' + (watchtowerStatus.linkedBarracksCount > 0 ? '#cfa66b' : '#777') + '; font-size:10px; margin-bottom:3px;">Reserve link: ' + escapeHtml(supportSummary) + '</div>' +
          (supportBonusParts.length ? ('<div style="color:#9aa; font-size:10px; margin-bottom:3px;">Support bonus: ' + escapeHtml(supportBonusParts.join(' • ')) + '</div>') : '') +
          (watchtowerStatus.lastTargetName ? ('<div style="color:#9aa; font-size:10px;">Last target: ' + escapeHtml(watchtowerStatus.lastTargetName) + '</div>') : '') +
          '</div>';
      }
    }

    // --- Range info ---
    var rangeHtml = "";
    if (balance) {
      var sR = (balance.searchRadius && balance.searchRadius[currentLevel]) ? balance.searchRadius[currentLevel] : 0;
      var tR = balance.transferRange || 0;
      var wR = balance.waterRadius || 0;
      var lR = balance.lightRadius || 0;
      var dR = (balance.guardRadius && balance.guardRadius[currentLevel]) ? balance.guardRadius[currentLevel] : 0;
      if (!dR && balance.towerDefense && balance.towerDefense.range) {
        dR = balance.towerDefense.range[currentLevel] || balance.towerDefense.range[1] || 0;
      }
      var rangeParts = [];
      if (sR > 0) rangeParts.push('<span style="color:#00ff88;">' + (balance.farming ? 'Worker: ' : 'Harvest: ') + sR + '</span>');
      if (tR > 0) rangeParts.push('<span style="color:#4488ff;">Transfer: ' + tR + '</span>');
      if (wR > 0) rangeParts.push('<span style="color:#57c7ff;">Water: ' + wR + '</span>');
      if (lR > 0) rangeParts.push('<span style="color:#ffb74d;">Light: ' + lR + '</span>');
      if (dR > 0) rangeParts.push('<span style="color:#e76f51;">Defense: ' + dR + '</span>');
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
        '<button class="btn btn-danger" style="font-size:11px; padding:4px 12px;" onclick="GameHUD.confirmDestroy(\'' + uid + '\')">Delete</button>' +
        '<button class="btn btn-secondary" style="font-size:11px; padding:4px 12px;" onclick="GameHUD.closeInspector()">Close</button>' +
      '</div>' +
      '</div>';

    setInnerHtmlIfChanged(inspector, inspectorHtml);

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

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'F8' || e.key === 'F9') {
      e.preventDefault();
      toggleQualitySettingsPanel();
      return;
    }

    if (e.key === 'Escape') {
      if (_qualityPanelOpen) {
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

  function getSuggestedLowerPresetId() {
    if (!window.GameQualitySettings || !GameQualitySettings.getPresetId) return null;

    var currentPresetId = GameQualitySettings.getPresetId();
    if (currentPresetId === 'high') return 'medium';
    if (currentPresetId === 'medium') return 'low';
    return null;
  }

  function updateQualityPerformanceAdvisor(dt) {
    if (!dt || !window.GameQualitySettings || !GameQualitySettings.getConfigValue) return;

    var suggestedPresetId = getSuggestedLowerPresetId();
    if (!suggestedPresetId) {
      _qualityPromptState.lowFpsSeconds = 0;
      return;
    }

    if (Date.now() < _qualityPromptState.snoozeUntil) return;

    var lowFpsThreshold = GameQualitySettings.getConfigValue('advisor.suggestDownFps', 0);
    var lowFpsSeconds = GameQualitySettings.getConfigValue('advisor.suggestAfterSeconds', 0);
    if (!(lowFpsThreshold > 0) || !(lowFpsSeconds > 0)) return;

    if (_fpsSmoothed <= lowFpsThreshold) {
      _qualityPromptState.lowFpsSeconds += dt;
    } else {
      _qualityPromptState.lowFpsSeconds = Math.max(0, _qualityPromptState.lowFpsSeconds - (dt * 1.5));
    }

    if (_qualityPromptState.visible || _qualityPromptState.lowFpsSeconds < lowFpsSeconds) return;

    var suggestedPreset = window.GameQualitySettings.getPresetDefinition ? GameQualitySettings.getPresetDefinition(suggestedPresetId) : null;
    _qualityPromptState.visible = true;
    _qualityPromptState.suggestedPreset = suggestedPresetId;
    _qualityPromptState.suggestedLabel = suggestedPreset && suggestedPreset.label ? suggestedPreset.label : suggestedPresetId;
    _qualityPromptState.fps = Math.max(1, Math.round(_fpsSmoothed));
    _qualityPromptState.frameMs = _fpsSmoothedMs.toFixed(1);
    _qualityPromptState.lowFpsSeconds = 0;
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
    if (!isHudVisible()) return;

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
    if (slot === 'weapon') return 'Weapon';
    if (slot === 'offhand') return 'Shield';
    if (slot === 'armor') return 'Armor';
    if (slot === 'boots') return 'Boots';
    return slot || 'Item';
  }

  function buildEquippedStatBreakdownText(baseValue, statKey) {
    var text = 'Base: ' + formatBalanceDisplayNumber(baseValue);
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
        html += '<div class="equipment-slot-item">' + (weaponEntity ? weaponEntity.name : weaponId) + '</div>';
        var weaponStats = getEquipmentStatSummary(weaponId, { shortLabels: true });
        if (weaponStats) html += '<div class="equipment-slot-stats">' + escapeHtml(weaponStats) + '</div>';
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
        html += '<div class="equipment-slot-item">' + (offhandEntity ? offhandEntity.name : offhandId) + '</div>';
        var offhandStats = getEquipmentStatSummary(offhandId, { shortLabels: true });
        if (offhandStats) html += '<div class="equipment-slot-stats">' + escapeHtml(offhandStats) + '</div>';
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
        html += '<div class="equipment-slot-item">' + (armorEntity ? armorEntity.name : armorId) + '</div>';
        var armorStats = getEquipmentStatSummary(armorId, { shortLabels: true });
        if (armorStats) html += '<div class="equipment-slot-stats">' + escapeHtml(armorStats) + '</div>';
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
        html += '<div class="equipment-slot-item">' + (bootsEntity ? bootsEntity.name : bootsId) + '</div>';
        var bootsStats = getEquipmentStatSummary(bootsId, { shortLabels: true });
        if (bootsStats) html += '<div class="equipment-slot-stats">' + escapeHtml(bootsStats) + '</div>';
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
        var itemSummary = entity.type === 'equipment'
          ? getEquipmentStatSummary(itemId, { shortLabels: true })
          : entity.description;
        if (itemSummary) {
          html += '<div style="font-size:9px;color:#888;">' + escapeHtml(itemSummary) + '</div>';
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
      var defenseRange = (balance.guardRadius && getLevelValue(balance.guardRadius, 1)) || (balance.towerDefense && balance.towerDefense.range ? (getLevelValue(balance.towerDefense.range, 1) || balance.towerDefense.range[1]) : null);
      var metrics = buildMetricGrid([
        { label: 'Workers', value: getLevelValue(balance.workerCount, 1) || null },
        { label: 'Range', value: getLevelValue(balance.searchRadius, 1) ? getLevelValue(balance.searchRadius, 1) + ' tiles' : null },
        { label: 'Defense', value: defenseRange ? defenseRange + ' tiles' : null },
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
    html += '<div class="stat-breakdown">' + buildEquippedStatBreakdownText(100, 'maxHp') + '</div></div>';

    html += '<div class="stat-card attack">';
    html += '<div class="stat-label">⚔️ Attack</div>';
    html += '<div class="stat-value">' + attack + '</div>';
    html += '<div class="stat-breakdown">' + buildEquippedStatBreakdownText(player.attack, 'attack') + '</div></div>';

    html += '<div class="stat-card defense">';
    html += '<div class="stat-label">🛡️ Defense</div>';
    html += '<div class="stat-value">' + defense + '</div>';
    html += '<div class="stat-breakdown">' + buildEquippedStatBreakdownText(player.defense, 'defense') + '</div></div>';

    html += '<div class="stat-card speed">';
    html += '<div class="stat-label">⚡ Speed</div>';
    html += '<div class="stat-value">' + speed.toFixed(1) + '</div>';
    html += '<div class="stat-breakdown">' + buildEquippedStatBreakdownText(player.speed, 'speed') + '</div></div>';

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
