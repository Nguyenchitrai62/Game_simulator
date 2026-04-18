window.GameQualitySettings = window.GameQualitySettings || (function () {
  var STORAGE_KEY = 'evolution_quality_settings_v1';
  var DEFAULT_PRESET = 'low';
  var _listeners = [];
  var PRESETS = {
    high: {
      id: 'high',
      label: 'High',
      description: 'Maximum visual quality. Best for stronger desktops.',
      summary: 'Full effects, full overlays, highest shadow and rain quality.',
      settings: {
        debug: {
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
        },
        scene: {
          maxPixelRatioCap: 1.5,
          minPixelRatio: 0.75,
          adaptiveStep: 0.125,
          downscaleFrameMs: 26.5,
          upscaleFrameMs: 17.5,
          shadowMapSize: 2048,
          shadows: true,
          overlayIdleScale: 1,
          overlayPlayerThresholdScale: 1,
          overlayCameraThresholdScale: 1,
          worldLabelDistance: 6.5,
          buildingLabelCullMultiplier: 1.2,
          nodeHpLabelDistance: 999
        },
        minimap: {
          miniRefreshMs: 90,
          fullRefreshMs: 140,
          fullInteractRefreshMs: 60,
          dangerRefreshMs: 260,
          dangerOpenRefreshMs: 140,
          hoverDebounceMs: 0,
          closedDangerChunkRadius: 4,
          openDangerPaddingChunks: 2
        },
        weather: {
          rainDropCount: 720
        },
        simulation: {
          pathCacheSize: 180
        },
        advisor: {
          suggestDownFps: 42,
          suggestAfterSeconds: 10
        }
      }
    },
    medium: {
      id: 'medium',
      label: 'Medium',
      description: 'Balanced visuals with reduced CPU and fill-rate pressure.',
      summary: 'Keeps core readability while lowering shadow, rain, and overlay cost.',
      settings: {
        debug: {
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
        },
        scene: {
          maxPixelRatioCap: 1.15,
          minPixelRatio: 0.65,
          adaptiveStep: 0.1,
          downscaleFrameMs: 23.5,
          upscaleFrameMs: 16.5,
          shadowMapSize: 1024,
          shadows: true,
          overlayIdleScale: 1.25,
          overlayPlayerThresholdScale: 1.15,
          overlayCameraThresholdScale: 1.15,
          worldLabelDistance: 5.25,
          buildingLabelCullMultiplier: 1,
          nodeHpLabelDistance: 30
        },
        minimap: {
          miniRefreshMs: 120,
          fullRefreshMs: 180,
          fullInteractRefreshMs: 90,
          dangerRefreshMs: 360,
          dangerOpenRefreshMs: 180,
          hoverDebounceMs: 30,
          closedDangerChunkRadius: 3,
          openDangerPaddingChunks: 1
        },
        weather: {
          rainDropCount: 420
        },
        simulation: {
          pathCacheSize: 140
        },
        advisor: {
          suggestDownFps: 32,
          suggestAfterSeconds: 12
        }
      }
    },
    low: {
      id: 'low',
      label: 'Low',
      description: 'Cuts visual extras to prioritize smooth gameplay on weaker laptops.',
      summary: 'Keeps gameplay overlays visible while disabling heavy effects and lowering render cost.',
      settings: {
        debug: {
          hud: true,
          minimap: true,
          worldLabels: true,
          notifications: true,
          particles: false,
          weather: false,
          atmosphere: false,
          animals: true,
          npcs: true,
          barracksTroops: true
        },
        scene: {
          maxPixelRatioCap: 0.95,
          minPixelRatio: 0.5,
          adaptiveStep: 0.08,
          downscaleFrameMs: 20.5,
          upscaleFrameMs: 15,
          shadowMapSize: 0,
          shadows: false,
          overlayIdleScale: 1.6,
          overlayPlayerThresholdScale: 1.4,
          overlayCameraThresholdScale: 1.35,
          worldLabelDistance: 6.5,
          buildingLabelCullMultiplier: 1.2,
          nodeHpLabelDistance: 999
        },
        minimap: {
          miniRefreshMs: 160,
          fullRefreshMs: 240,
          fullInteractRefreshMs: 120,
          dangerRefreshMs: 520,
          dangerOpenRefreshMs: 260,
          hoverDebounceMs: 60,
          closedDangerChunkRadius: 2,
          openDangerPaddingChunks: 1
        },
        weather: {
          rainDropCount: 0
        },
        simulation: {
          pathCacheSize: 96
        },
        advisor: {
          suggestDownFps: 0,
          suggestAfterSeconds: 0
        }
      }
    }
  };

  var _state = loadState();

  function clonePresetSnapshot(preset) {
    return {
      id: preset.id,
      label: preset.label,
      description: preset.description,
      summary: preset.summary
    };
  }

  function normalizePresetId(presetId) {
    return PRESETS[presetId] ? presetId : DEFAULT_PRESET;
  }

  function getPresetDefinition(presetId) {
    return PRESETS[normalizePresetId(presetId)];
  }

  function loadState() {
    var nextState = { preset: DEFAULT_PRESET };
    try {
      if (typeof localStorage === 'undefined') return nextState;
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return nextState;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed.preset === 'string') {
        nextState.preset = normalizePresetId(parsed.preset);
      }
    } catch (error) {
      console.warn('[QualitySettings] Failed to load preset:', error);
    }
    return nextState;
  }

  function saveState() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (error) {
      console.warn('[QualitySettings] Failed to save preset:', error);
    }
  }

  function emit(change) {
    var snapshot = getSnapshot();
    for (var i = 0; i < _listeners.length; i++) {
      try {
        _listeners[i](snapshot, change || null);
      } catch (error) {
        console.warn('[QualitySettings] Listener failed:', error);
      }
    }
  }

  function getRuntimeConfigForPreset(presetId) {
    return getPresetDefinition(presetId).settings;
  }

  function getRuntimeConfig() {
    return getRuntimeConfigForPreset(_state.preset);
  }

  function getConfigValue(path, fallbackValue) {
    if (!path) return fallbackValue;
    var segments = String(path).split('.');
    var cursor = getRuntimeConfig();
    for (var i = 0; i < segments.length; i++) {
      if (!cursor || cursor[segments[i]] === undefined) return fallbackValue;
      cursor = cursor[segments[i]];
    }
    return cursor === undefined ? fallbackValue : cursor;
  }

  function syncDebugSettings(source) {
    var runtimeConfig = getRuntimeConfig();
    var debugConfig = runtimeConfig && runtimeConfig.debug ? runtimeConfig.debug : null;
    if (!debugConfig || !window.GameDebugSettings) return false;

    if (GameDebugSettings.applySnapshot) {
      GameDebugSettings.applySnapshot(debugConfig, source || 'quality-sync');
      return true;
    }

    if (!GameDebugSettings.setEnabled) return false;
    for (var key in debugConfig) {
      GameDebugSettings.setEnabled(key, debugConfig[key] !== false, source || 'quality-sync');
    }
    return true;
  }

  function applyPreset(presetId, source, options) {
    options = options || {};
    var resolvedPreset = normalizePresetId(presetId);
    var changed = _state.preset !== resolvedPreset;
    _state.preset = resolvedPreset;
    saveState();

    if (options.syncDebug !== false) {
      syncDebugSettings('quality:' + (source || 'apply'));
    }

    emit({
      type: 'preset',
      preset: resolvedPreset,
      changed: changed,
      source: source || 'apply'
    });
    return clonePresetSnapshot(getPresetDefinition(resolvedPreset));
  }

  function getPresetId() {
    return _state.preset;
  }

  function getCurrentPreset() {
    return clonePresetSnapshot(getPresetDefinition(_state.preset));
  }

  function getAvailablePresets() {
    return Object.keys(PRESETS).map(function (presetId) {
      return clonePresetSnapshot(PRESETS[presetId]);
    });
  }

  function getSnapshot() {
    return {
      preset: getPresetId(),
      current: getCurrentPreset(),
      presets: getAvailablePresets()
    };
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

  function syncRuntime(source) {
    syncDebugSettings(source || 'quality-runtime');
    emit({
      type: 'sync',
      preset: getPresetId(),
      source: source || 'quality-runtime'
    });
    return getCurrentPreset();
  }

  return {
    applyPreset: applyPreset,
    getPresetId: getPresetId,
    getCurrentPreset: getCurrentPreset,
    getPresetDefinition: function (presetId) { return clonePresetSnapshot(getPresetDefinition(presetId)); },
    getAvailablePresets: getAvailablePresets,
    getSnapshot: getSnapshot,
    getRuntimeConfig: getRuntimeConfig,
    getRuntimeConfigForPreset: getRuntimeConfigForPreset,
    getConfigValue: getConfigValue,
    syncRuntime: syncRuntime,
    subscribe: subscribe
  };
})();