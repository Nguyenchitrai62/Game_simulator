window.GameHUDModules = window.GameHUDModules || {};

window.GameHUDModules.createSettingsPanelModule = function createSettingsPanelModule(context) {
  var state = context.state;
  var t = context.t;
  var escapeHtml = context.escapeHtml;
  var setInnerHtmlIfChanged = context.setInnerHtmlIfChanged;
  var setNodeClassState = context.setNodeClassState;
  var setBodyClass = context.setBodyClass;
  var isDebugSettingEnabled = context.isDebugSettingEnabled;
  var isHudVisible = context.isHudVisible;
  var areWorldLabelsVisible = context.areWorldLabelsVisible;
  var areNotificationsVisible = context.areNotificationsVisible;
  var invalidateLocalizedCaches = context.invalidateLocalizedCaches;
  var renderResources = context.renderResources;
  var renderQuickbar = context.renderQuickbar;
  var renderObjectiveTracker = context.renderObjectiveTracker;
  var updateModal = context.updateModal;
  var renderNow = context.renderNow;
  var showNotification = context.showNotification;
  var clearScheduledRender = context.clearScheduledRender;
  var closeModal = context.closeModal;
  var closeInspector = context.closeInspector;
  var clearWorldOverlayElements = context.clearWorldOverlayElements;
  var hideNotificationElement = context.hideNotificationElement;
  var renderAll = context.renderAll;
  var isModalActive = context.isModalActive;
  var _qualitySettingsUnsubscribe = null;
  var _debugSettingsUnsubscribe = null;

  var QUALITY_SETTINGS_TABS = [
    {
      id: 'graphics',
      kicker: 'Render',
      label: 'Graphics',
      title: 'Graphics Presets',
      description: 'Choose render quality here only. This tab should not directly manage the switches in the tabs below.'
    },
    {
      id: 'language',
      kicker: 'Text',
      label: 'Language',
      title: 'Display Language',
      description: 'Control HUD language, localized content names, and speech text from one place.'
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
    },
    {
      id: 'reset',
      kicker: 'Danger',
      label: 'Reset',
      title: 'Reset And Recovery',
      description: 'Keep destructive reset actions isolated from graphics and runtime controls so they stay deliberate.'
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
    return QUALITY_SETTINGS_TABS[0].id;
  }

  function getQualitySettingsTabMeta(tabId) {
    var resolvedTabId = normalizeQualitySettingsTab(tabId);
    for (var i = 0; i < QUALITY_SETTINGS_TABS.length; i++) {
      if (QUALITY_SETTINGS_TABS[i].id === resolvedTabId) {
        return {
          id: QUALITY_SETTINGS_TABS[i].id,
          kicker: t('hud.settings.tabs.' + resolvedTabId + '.kicker', null, QUALITY_SETTINGS_TABS[i].kicker),
          label: t('hud.settings.tabs.' + resolvedTabId + '.label', null, QUALITY_SETTINGS_TABS[i].label),
          title: t('hud.settings.tabs.' + resolvedTabId + '.title', null, QUALITY_SETTINGS_TABS[i].title),
          description: t('hud.settings.tabs.' + resolvedTabId + '.description', null, QUALITY_SETTINGS_TABS[i].description)
        };
      }
    }
    return {
      id: QUALITY_SETTINGS_TABS[0].id,
      kicker: t('hud.settings.tabs.graphics.kicker', null, QUALITY_SETTINGS_TABS[0].kicker),
      label: t('hud.settings.tabs.graphics.label', null, QUALITY_SETTINGS_TABS[0].label),
      title: t('hud.settings.tabs.graphics.title', null, QUALITY_SETTINGS_TABS[0].title),
      description: t('hud.settings.tabs.graphics.description', null, QUALITY_SETTINGS_TABS[0].description)
    };
  }

  function getQualitySettingsGroup(tabId) {
    return DEBUG_SETTINGS_GROUPS[normalizeQualitySettingsTab(tabId)] || null;
  }

  function getLocalizedQualityPresetLabel(presetId, fallbackLabel) {
    return t('hud.settings.graphics.presets.' + presetId + '.label', null, fallbackLabel || presetId);
  }

  function getLocalizedQualityPresetCopy(presetId, fallbackCopy) {
    return t('hud.settings.graphics.presets.' + presetId + '.summary', null, fallbackCopy || '');
  }

  function getQualityPresetAudience(presetId) {
    if (presetId === 'high') return t('hud.settings.graphics.audience.high', null, 'Stronger desktops');
    if (presetId === 'medium') return t('hud.settings.graphics.audience.medium', null, 'Balanced default');
    if (presetId === 'low') return t('hud.settings.graphics.audience.low', null, 'Older laptops');
    return t('hud.settings.graphics.audience.adaptive', null, 'Adaptive profile');
  }

  function getQualityShadowLabel(config) {
    if (!config || !config.scene || !config.scene.shadows) return t('hud.settings.graphics.pills.shadowsOff', null, 'Shadows Off');
    if (config.scene.shadowMapSize >= 2048) return t('hud.settings.graphics.pills.shadowsHigh', null, 'Shadows High');
    if (config.scene.shadowMapSize >= 1024) return t('hud.settings.graphics.pills.shadowsMedium', null, 'Shadows Medium');
    return t('hud.settings.graphics.pills.shadowsOn', null, 'Shadows On');
  }

  function getQualityWeatherLabel(config) {
    if (!config || !config.debug || !config.debug.weather || !config.weather || !config.weather.rainDropCount) return t('hud.settings.graphics.pills.weatherOff', null, 'Weather Off');
    if (config.weather.rainDropCount >= 600) return t('hud.settings.graphics.pills.weatherFull', null, 'Weather Full');
    if (config.weather.rainDropCount >= 300) return t('hud.settings.graphics.pills.weatherLight', null, 'Weather Light');
    return t('hud.settings.graphics.pills.weatherMinimal', null, 'Weather Minimal');
  }

  function getQualityOverlayLabel(config) {
    if (!config || !config.debug || !config.debug.worldLabels || !config.scene) return t('hud.settings.graphics.pills.overlaysMinimal', null, 'Overlays Minimal');
    if (config.scene.nodeHpLabelDistance >= 999) return t('hud.settings.graphics.pills.overlaysFull', null, 'Overlays Full');
    return t('hud.settings.graphics.pills.overlaysBalanced', null, 'Overlays Balanced');
  }

  function getQualityRefreshLabel(config) {
    if (!config || !config.minimap) return t('hud.settings.graphics.pills.mapRefreshStandard', null, 'Map Refresh Standard');
    if (config.minimap.fullRefreshMs <= 150) return t('hud.settings.graphics.pills.mapRefreshFast', null, 'Map Refresh Fast');
    if (config.minimap.fullRefreshMs <= 200) return t('hud.settings.graphics.pills.mapRefreshBalanced', null, 'Map Refresh Balanced');
    return t('hud.settings.graphics.pills.mapRefreshEco', null, 'Map Refresh Eco');
  }

  function buildQualityPillListHtml(presetId) {
    var config = getQualityRuntimeConfigForPreset(presetId);
    if (!config) return '';

    var sceneConfig = config.scene || {};
    var debugConfig = config.debug || {};
    var pills = [
      getQualityShadowLabel(config),
      getQualityWeatherLabel(config),
      debugConfig.particles ? t('hud.settings.graphics.pills.particlesOn', null, 'Particles On') : t('hud.settings.graphics.pills.particlesOff', null, 'Particles Off'),
      getQualityOverlayLabel(config),
      t('hud.settings.graphics.pills.renderScale', { percent: Math.round((sceneConfig.maxPixelRatioCap || 1) * 100) }, 'Render Scale {percent}%'),
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
    html += '<div class="quality-settings-sidebar-label">' + escapeHtml(t('hud.settings.sidebar.label', null, 'Settings Sections')) + '</div>';
    html += '<div class="quality-settings-tab-nav">';

    for (var i = 0; i < QUALITY_SETTINGS_TABS.length; i++) {
      var tab = getQualitySettingsTabMeta(QUALITY_SETTINGS_TABS[i].id);
      var tabClass = 'quality-settings-tab-button';
      if (tab.id === activeTabId) tabClass += ' active';
      html += '<button class="' + tabClass + '" type="button" onclick="GameHUD.switchQualitySettingsTab(\'' + tab.id + '\')">' +
        '<span class="quality-settings-tab-kicker">' + escapeHtml(tab.kicker) + '</span>' +
        '<span class="quality-settings-tab-name">' + escapeHtml(tab.label) + '</span>' +
      '</button>';
    }

    html += '</div>';
    html += '<div class="quality-settings-sidebar-note">' + escapeHtml(t('hud.settings.sidebar.note', null, 'Use the sidebar to separate graphics presets, language, overlay, FX, simulation switches, and reset actions.')) + '</div>';
    html += '</aside>';
    return html;
  }

  function buildQualityRuntimeSettingsTabHtml(tabId) {
    var group = getQualitySettingsGroup(tabId);
    if (!group) return '';

    var groupTitle = t('hud.settings.runtime.' + tabId + '.title', null, group.title);
    var groupCopy = t('hud.settings.runtime.' + tabId + '.copy', null, group.copy || '');

    var html = '<div class="quality-settings-body quality-settings-body-runtime">';
    html += '<section class="quality-settings-section">';
    html += '<div class="quality-settings-section-head">' +
      '<div>' +
        '<div class="quality-settings-section-kicker">' + escapeHtml(groupTitle) + '</div>' +
        '<div class="quality-settings-section-title">' + escapeHtml(t('hud.settings.runtime.controlsTitle', { title: groupTitle }, '{title} Controls')) + '</div>' +
      '</div>' +
    '</div>';
    html += '<div class="quality-settings-copy">' + escapeHtml(groupCopy) + '</div>';
    html += '<div class="quality-settings-toggle-list">';

    for (var itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
      var item = group.items[itemIndex];
      var itemLabel = t('hud.settings.runtime.' + tabId + '.items.' + item.key + '.label', null, item.label);
      var itemHint = t('hud.settings.runtime.' + tabId + '.items.' + item.key + '.hint', null, item.hint);
      html += '<label class="debug-setting-row">' +
        '<span class="debug-setting-copy-block">' +
          '<span class="debug-setting-name">' + escapeHtml(itemLabel) + '</span>' +
          '<span class="debug-setting-hint">' + escapeHtml(itemHint) + '</span>' +
        '</span>' +
        '<input type="checkbox" data-settings-toggle="' + item.key + '"' + (isDebugSettingEnabled(item.key) ? ' checked' : '') + '>' +
      '</label>';
    }

    html += '</div>';
    html += '<div class="quality-settings-toolbar"><button class="debug-settings-reset" type="button" data-settings-reset="true">' + escapeHtml(t('hud.settings.runtime.reset', null, 'Reset Runtime Toggles')) + '</button></div>';
    html += '<div class="quality-settings-compact-note">' + escapeHtml(t('hud.settings.runtime.note', null, 'Changes here only affect this runtime category. Graphics, Language, and Reset stay in their own tabs.')) + '</div>';
    html += '</section>';
    html += '</div>';
    return html;
  }

  function buildQualityGraphicsTabHtml(snapshot, current) {
    var currentLabel = getLocalizedQualityPresetLabel(current.id, current.label || 'High');
    var currentCopy = getLocalizedQualityPresetCopy(current.id, current.summary || current.description || t('hud.settings.graphics.current.copy', null, 'Choose how much visual detail and rendering cost the game should target.'));
    var html = '<div class="quality-settings-body quality-settings-body-graphics">';
    html += '<section class="quality-settings-section quality-settings-section-current">';
    html += '<div class="quality-settings-section-head">' +
      '<div>' +
        '<div class="quality-settings-section-kicker">' + escapeHtml(t('hud.settings.graphics.current.kicker', null, 'Current Profile')) + '</div>' +
        '<div class="quality-settings-section-title">' + escapeHtml(t('hud.settings.graphics.current.title', { name: currentLabel }, '{name} preset active')) + '</div>' +
      '</div>' +
      '<div class="quality-settings-status">' + escapeHtml(t('hud.settings.common.live', null, 'Live')) + '</div>' +
    '</div>';
    html += '<div class="quality-settings-copy">' + escapeHtml(currentCopy) + '</div>';
    html += buildQualityPillListHtml(current.id);
    html += '<div class="quality-settings-note">' + escapeHtml(t('hud.settings.graphics.current.note', null, 'Changing a preset here updates graphics quality only in this Settings flow. Language, Overlay, World FX, Simulation, and Reset stay in their own tabs.')) + '</div>';
    html += '<div class="quality-settings-inline-meta">' +
      '<div class="quality-settings-inline-item"><span class="quality-settings-inline-label">' + escapeHtml(t('hud.settings.common.shortcut', null, 'Shortcut')) + '</span><strong>F9</strong></div>' +
      '<div class="quality-settings-inline-item"><span class="quality-settings-inline-label">' + escapeHtml(t('hud.settings.common.assist', null, 'Assist')) + '</span><strong>' + escapeHtml(t('hud.settings.common.optInOnly', null, 'Opt-in only')) + '</strong></div>' +
    '</div>';
    html += '</section>';

    html += '<section class="quality-settings-section quality-settings-section-presets">';
    html += '<div class="quality-settings-section-head">' +
      '<div>' +
        '<div class="quality-settings-section-kicker">' + escapeHtml(t('hud.settings.graphics.presets.kicker', null, 'Graphics Preset')) + '</div>' +
        '<div class="quality-settings-section-title">' + escapeHtml(t('hud.settings.graphics.presets.title', null, 'Choose the look and performance target')) + '</div>' +
      '</div>' +
    '</div>';
    html += '<div class="quality-settings-choice-list">';
    for (var i = 0; i < snapshot.presets.length; i++) {
      var preset = snapshot.presets[i];
      var presetLabel = getLocalizedQualityPresetLabel(preset.id, preset.label);
      var presetCopy = getLocalizedQualityPresetCopy(preset.id, preset.summary || preset.description || '');
      var rowClass = 'quality-choice-row';
      if (preset.id === snapshot.preset) rowClass += ' active';
      html += '<button class="' + rowClass + '" type="button" onclick="GameHUD.applyQualityPreset(\'' + preset.id + '\')">' +
        '<span class="quality-choice-copy">' +
          '<span class="quality-choice-name-row">' +
            '<span class="quality-choice-name">' + escapeHtml(presetLabel) + '</span>' +
            '<span class="quality-choice-badge">' + escapeHtml(getQualityPresetAudience(preset.id)) + '</span>' +
          '</span>' +
          '<span class="quality-choice-hint">' + escapeHtml(presetCopy) + '</span>' +
        '</span>' +
        '<span class="quality-choice-state">' + escapeHtml(preset.id === snapshot.preset ? t('hud.settings.common.active', null, 'Active') : t('hud.settings.common.apply', null, 'Apply')) + '</span>' +
      '</button>';
    }
    html += '</div>';
    html += '</section>';
    html += '</div>';
    return html;
  }

  function buildLanguageSettingsTabHtml() {
    if (!window.GameI18n || !GameI18n.getLanguages) return '';

    var currentLanguage = GameI18n.getLanguage ? GameI18n.getLanguage() : 'en';
    var currentMeta = GameI18n.getLanguageMeta ? GameI18n.getLanguageMeta(currentLanguage) : { nativeLabel: currentLanguage, label: currentLanguage };
    var languages = GameI18n.getLanguages();
    var html = '<div class="quality-settings-body quality-settings-body-language">';
    html += '<section class="quality-settings-section quality-settings-section-language">';
    html += '<div class="quality-settings-section-head">' +
      '<div>' +
        '<div class="quality-settings-section-kicker">' + escapeHtml(t('hud.settings.language.kicker', null, 'Language')) + '</div>' +
        '<div class="quality-settings-section-title">' + escapeHtml(t('hud.settings.language.title', null, 'Display Language')) + '</div>' +
      '</div>' +
    '</div>';
    html += '<div class="quality-settings-copy">' + escapeHtml(t('hud.settings.language.copy', null, 'Switch HUD text, localized content names, and speech overlays without reloading the save.')) + '</div>';
    html += '<div class="quality-settings-inline-meta">';
    html += '<div class="quality-settings-inline-item"><span class="quality-settings-inline-label">' + escapeHtml(t('hud.settings.language.active', null, 'Active')) + '</span><strong>' + escapeHtml(currentMeta.nativeLabel || currentMeta.label || currentLanguage) + '</strong></div>';
    html += '</div>';
    html += '<div class="quality-settings-choice-list">';

    for (var i = 0; i < languages.length; i++) {
      var language = languages[i];
      var rowClass = 'quality-choice-row';
      if (language.id === currentLanguage) rowClass += ' active';
      html += '<button class="' + rowClass + '" type="button" onclick="GameHUD.setLanguage(\'' + language.id + '\')">' +
        '<span class="quality-choice-copy">' +
          '<span class="quality-choice-name-row">' +
            '<span class="quality-choice-name">' + escapeHtml(language.nativeLabel || language.label || language.id) + '</span>' +
            '<span class="quality-choice-badge">' + escapeHtml(language.label || language.id) + '</span>' +
          '</span>' +
        '</span>' +
        '<span class="quality-choice-state">' + escapeHtml(language.id === currentLanguage ? t('hud.settings.language.active', null, 'Active') : t('hud.settings.language.apply', null, 'Use')) + '</span>' +
      '</button>';
    }

    html += '</div>';
    html += '</section>';
    html += '</div>';
    return html;
  }

  function buildResetSettingsTabHtml() {
    var html = '<div class="quality-settings-body quality-settings-body-reset">';

    html += '<section class="quality-settings-section quality-settings-section-inline">';
    html += '<div class="quality-settings-section-head">' +
      '<div>' +
        '<div class="quality-settings-section-kicker">' + escapeHtml(t('hud.settings.reset.progress.kicker', null, 'Fresh Run')) + '</div>' +
        '<div class="quality-settings-section-title">' + escapeHtml(t('hud.settings.reset.progress.title', null, 'Reset Progress Only')) + '</div>' +
      '</div>' +
    '</div>';
    html += '<div class="quality-settings-copy">' + escapeHtml(t('hud.settings.reset.progress.copy', null, 'Start over from a clean save while keeping display language, graphics preset, and runtime toggles on this device.')) + '</div>';
    html += '<div class="quality-settings-toolbar quality-settings-toolbar-danger">';
    html += '<button class="debug-settings-reset" type="button" onclick="GameActions.resetGame()">' + escapeHtml(t('hud.statsPanel.resetProgress', null, 'Reset Progress')) + '</button>';
    html += '</div>';
    html += '<div class="quality-settings-compact-note">' + escapeHtml(t('hud.settings.reset.progress.note', null, 'Use this when you want a fresh run without clearing local preferences.')) + '</div>';
    html += '</section>';

    html += '<section class="quality-settings-section quality-settings-section-danger">';
    html += '<div class="quality-settings-section-head">' +
      '<div>' +
        '<div class="quality-settings-section-kicker quality-settings-section-kicker-danger">' + escapeHtml(t('hud.settings.fullReset.kicker', null, 'Danger Zone')) + '</div>' +
        '<div class="quality-settings-section-title">' + escapeHtml(t('hud.settings.fullReset.title', null, 'Full Reset')) + '</div>' +
      '</div>' +
    '</div>';
    html += '<div class="quality-settings-copy quality-settings-copy-danger">' + escapeHtml(t('hud.settings.fullReset.copy', null, 'Erase the current save, world data, language, tutorials, graphics preset, and runtime toggles for a completely fresh start.')) + '</div>';
    html += '<div class="quality-settings-toolbar quality-settings-toolbar-danger">';
    html += '<button class="debug-settings-reset debug-settings-reset-danger" type="button" onclick="GameHUD.resetAllGameData()">' + escapeHtml(t('hud.settings.fullReset.button', null, 'Reset Everything')) + '</button>';
    html += '</div>';
    html += '<div class="quality-settings-compact-note quality-settings-copy-danger">' + escapeHtml(t('hud.settings.reset.full.note', null, 'This also clears language, graphics, tutorial, and runtime settings stored in local storage.')) + '</div>';
    html += '</section>';

    html += '</div>';
    return html;
  }

  function setLanguage(languageId) {
    if (!window.GameI18n || !GameI18n.setLanguage) return null;

    var appliedLanguage = GameI18n.setLanguage(languageId, 'hud-settings');
    var meta = GameI18n.getLanguageMeta ? GameI18n.getLanguageMeta(appliedLanguage) : { nativeLabel: appliedLanguage, label: appliedLanguage };
    invalidateLocalizedCaches();
    renderQualitySettingsPanel();
    updateQualitySettingsToggleState();
    renderResources();
    renderQuickbar();
    renderObjectiveTracker();
    updateModal();
    renderNow('language-change');
    showNotification(t('hud.settings.language.changed', { name: meta.nativeLabel || meta.label || appliedLanguage }, 'Language: {name}'), 'info');
    return appliedLanguage;
  }

  function resetAllGameData() {
    if (!window.GameActions || !GameActions.resetAllGameData) return false;
    return GameActions.resetAllGameData();
  }

  function updateQualitySettingsToggleState() {
    var button = getQualitySettingsToggleButton();
    if (!button) return;

    var buttonLabel = t('dom.settingsToggle', null, 'Settings');
    var buttonTooltip = t('dom.settingsToggleTooltip', null, 'Settings (F9)');

    button.setAttribute('aria-expanded', state.panelOpen ? 'true' : 'false');
    button.setAttribute('aria-label', buttonTooltip);
    button.setAttribute('title', buttonTooltip);
    setNodeClassState(button, 'is-open', state.panelOpen);
    setInnerHtmlIfChanged(button,
      '<span class="quality-settings-toggle-text">' + escapeHtml(buttonLabel) + '</span>'
    );
  }

  function renderQualitySettingsPanel() {
    var panel = getQualitySettingsPanel();
    var snapshot = getQualitySnapshot();
    if (!panel || !snapshot) return;

    var current = snapshot.current || { id: 'high', label: 'High', description: '', summary: '' };
    var activeTab = getQualitySettingsTabMeta(state.activeTab);
    state.activeTab = activeTab.id;
    var html = '<div class="quality-popup-content" onclick="event.stopPropagation()">' +
      '<div class="quality-settings-header">' +
      '<div>' +
        '<div class="quality-settings-kicker">' + escapeHtml(t('hud.settings.header.kicker', null, 'Settings')) + '</div>' +
        '<div class="quality-settings-title">' + escapeHtml(t('hud.settings.header.title', null, 'Game Settings')) + '</div>' +
        '<div class="quality-settings-copy">' + escapeHtml(t('hud.settings.header.copy', null, 'Adjust graphics, language, overlay, world FX, simulation, and reset actions in separate tabs so each category stays in its own lane.')) + '</div>' +
      '</div>' +
      '<button class="quality-settings-close" type="button" onclick="GameHUD.toggleQualitySettingsPanel(false)">' + escapeHtml(t('hud.settings.header.close', null, 'Close')) + '</button>' +
    '</div>';

    html += '<div class="quality-settings-layout">';
    html += buildQualitySettingsSidebarHtml(activeTab.id);
    html += '<div class="quality-settings-stage">';
    html += '<div class="quality-settings-stage-header">' +
      '<div class="quality-settings-stage-kicker">' + escapeHtml(activeTab.kicker) + '</div>' +
      '<div class="quality-settings-stage-title">' + escapeHtml(activeTab.title) + '</div>' +
      '<div class="quality-settings-copy">' + escapeHtml(activeTab.description) + '</div>' +
    '</div>';
    if (activeTab.id === 'graphics') {
      html += buildQualityGraphicsTabHtml(snapshot, current);
    } else if (activeTab.id === 'language') {
      html += buildLanguageSettingsTabHtml();
    } else if (activeTab.id === 'reset') {
      html += buildResetSettingsTabHtml();
    } else {
      html += buildQualityRuntimeSettingsTabHtml(activeTab.id);
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';

    setInnerHtmlIfChanged(panel, html);
    setNodeClassState(panel, 'open', state.panelOpen);
    panel.setAttribute('aria-hidden', state.panelOpen ? 'false' : 'true');
    updateQualitySettingsToggleState();
  }

  function renderQualityPrompt() {
    var prompt = getQualityPromptElement();
    if (!prompt) return;

    if (state.panelOpen || !state.prompt.visible || !state.prompt.suggestedPreset) {
      prompt.classList.remove('show');
      prompt.setAttribute('aria-hidden', 'true');
      prompt.innerHTML = '';
      return;
    }

    var preset = window.GameQualitySettings && GameQualitySettings.getPresetDefinition ? GameQualitySettings.getPresetDefinition(state.prompt.suggestedPreset) : null;
    var label = getLocalizedQualityPresetLabel(state.prompt.suggestedPreset, preset && preset.label ? preset.label : (state.prompt.suggestedLabel || state.prompt.suggestedPreset));
    var html = '<div class="quality-prompt-card">' +
      '<div class="quality-prompt-kicker">' + escapeHtml(t('hud.settings.prompt.kicker', null, 'Performance Advisory')) + '</div>' +
      '<div class="quality-prompt-title">' + escapeHtml(t('hud.settings.prompt.title', null, 'FPS is staying low')) + '</div>' +
      '<div class="quality-prompt-copy">' + escapeHtml(t('hud.settings.prompt.copy', { fps: String(state.prompt.fps || 0), frameMs: String(state.prompt.frameMs || 0), name: label }, 'Average is around {fps} FPS ({frameMs} ms). Switch to {name} to reduce CPU and rendering load?')) + '</div>' +
      '<div class="quality-prompt-actions">' +
        '<button class="quality-prompt-btn accept" type="button" onclick="GameHUD.acceptQualitySuggestion()">' + escapeHtml(t('hud.settings.prompt.accept', { name: label }, 'Switch to {name}')) + '</button>' +
        '<button class="quality-prompt-btn" type="button" onclick="GameHUD.snoozeQualityPrompt()">' + escapeHtml(t('hud.settings.prompt.snooze', null, 'Not now')) + '</button>' +
        '<button class="quality-prompt-btn subtle" type="button" onclick="GameHUD.dismissQualityPrompt()">' + escapeHtml(t('hud.settings.prompt.dismiss', null, 'Keep current')) + '</button>' +
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
    state.panelOpen = typeof forceOpen === 'boolean' ? forceOpen : !state.panelOpen;
    renderQualitySettingsPanel();
    return state.panelOpen;
  }

  function switchQualitySettingsTab(tabId) {
    var nextTabId = normalizeQualitySettingsTab(tabId);
    if (state.activeTab === nextTabId) return nextTabId;
    state.activeTab = nextTabId;
    renderQualitySettingsPanel();
    return nextTabId;
  }

  function applyQualityPreset(presetId, source) {
    if (!window.GameQualitySettings || !GameQualitySettings.applyPreset) return null;

    var nextPreset = GameQualitySettings.applyPreset(presetId, source || 'panel', { syncDebug: true });
    state.prompt.visible = false;
    state.prompt.lowFpsSeconds = 0;
    renderQualityPrompt();
    applyQualitySettingsState();

    if (nextPreset && nextPreset.label) {
      showNotification(t('hud.settings.graphics.changed', { name: getLocalizedQualityPresetLabel(nextPreset.id, nextPreset.label) }, 'Graphics preset: {name}'), 'info');
    }

    return nextPreset;
  }

  function hideQualityPrompt(snoozeMs) {
    state.prompt.visible = false;
    if (snoozeMs && snoozeMs > 0) {
      state.prompt.snoozeUntil = Date.now() + snoozeMs;
    }
    renderQualityPrompt();
  }

  function acceptQualitySuggestion() {
    if (!state.prompt.suggestedPreset) return null;
    var accepted = applyQualityPreset(state.prompt.suggestedPreset, 'advisor');
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
      if (isModalActive()) closeModal();
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

  return {
    getCurrentQualityPreset: getCurrentQualityPreset,
    setLanguage: setLanguage,
    resetAllGameData: resetAllGameData,
    updateQualitySettingsToggleState: updateQualitySettingsToggleState,
    renderQualitySettingsPanel: renderQualitySettingsPanel,
    renderQualityPrompt: renderQualityPrompt,
    applyQualitySettingsState: applyQualitySettingsState,
    toggleQualitySettingsPanel: toggleQualitySettingsPanel,
    switchQualitySettingsTab: switchQualitySettingsTab,
    applyQualityPreset: applyQualityPreset,
    acceptQualitySuggestion: acceptQualitySuggestion,
    snoozeQualityPrompt: snoozeQualityPrompt,
    dismissQualityPrompt: dismissQualityPrompt,
    applyDebugSettingsState: applyDebugSettingsState,
    bindQualitySettingsUi: bindQualitySettingsUi
  };
};