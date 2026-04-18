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