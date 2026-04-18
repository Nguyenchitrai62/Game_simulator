window.GameStorage = (function () {
  var SAVE_KEY = "game_save";
  var WORLD_SAVE_KEY = "game_save_world";
  var MANAGED_STORAGE_PREFIXES = ["evolution_"];
  var MANAGED_STORAGE_EXACT_KEYS = [SAVE_KEY, WORLD_SAVE_KEY];
  var DEFAULT_SAVE_DELAY_MS = 700;
  var IDLE_SAVE_TIMEOUT_MS = 1200;
  var MIN_WRITE_INTERVAL_MS = 1500;
  var WORLD_WRITE_INTERVAL_MS = 45000;
  var _saveTimer = null;
  var _idleHandle = null;
  var _coreDirty = false;
  var _worldDirty = false;
  var _persistenceSuspended = false;
  var _lastWriteAt = 0;
  var _lastWorldWriteAt = 0;

  function beginPerfMark(name) {
    return (typeof GamePerf !== 'undefined' && GamePerf.begin) ? GamePerf.begin(name) : null;
  }

  function endPerfMark(mark) {
    if (mark && typeof GamePerf !== 'undefined' && GamePerf.end) {
      GamePerf.end(mark);
    }
  }

  function buildCoreSaveData() {
    var data = GameState.exportCoreState ? GameState.exportCoreState() : GameState.exportState();
    data.lastSave = Date.now();
    data.version = window.GAME_MANIFEST.version;
    return data;
  }

  function buildWorldSaveData() {
    var data = GameState.exportWorldState ? GameState.exportWorldState() : {
      version: window.GAME_MANIFEST.version,
      chunks: GameState.getAllChunkData ? GameState.getAllChunkData() : {},
      exploredChunks: GameState.getExplored ? GameState.getExplored() : {}
    };
    data.lastSave = Date.now();
    data.version = window.GAME_MANIFEST.version;
    return data;
  }

  function clearPendingSave() {
    if (_saveTimer !== null) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }

    if (_idleHandle !== null && typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(_idleHandle);
    }
    _idleHandle = null;
  }

  function isManagedStorageKey(key) {
    if (!key) return false;

    for (var exactIndex = 0; exactIndex < MANAGED_STORAGE_EXACT_KEYS.length; exactIndex++) {
      if (MANAGED_STORAGE_EXACT_KEYS[exactIndex] === key) {
        return true;
      }
    }

    for (var prefixIndex = 0; prefixIndex < MANAGED_STORAGE_PREFIXES.length; prefixIndex++) {
      if (key.indexOf(MANAGED_STORAGE_PREFIXES[prefixIndex]) === 0) {
        return true;
      }
    }

    return false;
  }

  function writeSaveNow(options) {
    if (_persistenceSuspended) return false;
    options = options || {};
    var saveMark = beginPerfMark('save.write');
    var coreBuildMark = beginPerfMark('save.buildCore');
    var data = buildCoreSaveData();
    endPerfMark(coreBuildMark);

    try {
      var coreWriteMark = beginPerfMark('save.writeCore');
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      endPerfMark(coreWriteMark);
      _lastWriteAt = Date.now();

      var shouldWriteWorld = false;
      if (_worldDirty || options.forceWorld) {
        if (options.forceWorld) {
          shouldWriteWorld = true;
        } else if (_lastWorldWriteAt <= 0 || (_lastWriteAt - _lastWorldWriteAt) >= WORLD_WRITE_INTERVAL_MS) {
          shouldWriteWorld = true;
        }
      }

      if (shouldWriteWorld) {
        var worldBuildMark = beginPerfMark('save.buildWorld');
        var worldData = buildWorldSaveData();
        endPerfMark(worldBuildMark);

        var worldWriteMark = beginPerfMark('save.writeWorld');
        localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(worldData));
        endPerfMark(worldWriteMark);
        _lastWorldWriteAt = _lastWriteAt;
        _worldDirty = false;
        if (window.GameState && GameState.clearWorldStateDirty) {
          GameState.clearWorldStateDirty();
        }
      }

      _coreDirty = false;
      endPerfMark(saveMark);
      return true;
    } catch (e) {
      endPerfMark(saveMark);
      console.error("[Storage] Save failed:", e);
      return false;
    }
  }

  function flushPending(options) {
    if (_persistenceSuspended) return false;
    if (!_coreDirty && !_worldDirty) return true;
    clearPendingSave();
    return writeSaveNow(options);
  }

  function runDeferredWrite() {
    _saveTimer = null;
    if (_persistenceSuspended) return;
    if (!_coreDirty && !_worldDirty) return;

    if (typeof requestIdleCallback === 'function') {
      _idleHandle = requestIdleCallback(function () {
        _idleHandle = null;
        if (_coreDirty || _worldDirty) writeSaveNow();
      }, { timeout: IDLE_SAVE_TIMEOUT_MS });
      return;
    }

    writeSaveNow();
  }

  function scheduleSave(delayMs, options) {
    if (_persistenceSuspended) return false;
    options = options || {};
    _coreDirty = true;
    var includeWorld = options.forceWorld === true;
    if (!includeWorld && options.includeWorld !== false) {
      includeWorld = !window.GameState || !GameState.hasWorldStateDirty || GameState.hasWorldStateDirty();
    }
    if (includeWorld) {
      _worldDirty = true;
    }
    clearPendingSave();

    var elapsed = Date.now() - _lastWriteAt;
    var throttleDelay = elapsed >= MIN_WRITE_INTERVAL_MS ? 0 : (MIN_WRITE_INTERVAL_MS - elapsed);
    var waitMs = Math.max(delayMs || DEFAULT_SAVE_DELAY_MS, throttleDelay);
    _saveTimer = setTimeout(runDeferredWrite, waitMs);
    return true;
  }

  function handleLifecycleFlush() {
    if (_persistenceSuspended) return false;
    if (_coreDirty || _worldDirty) {
      flushPending({ forceWorld: true });
    }
  }

  function setupLifecycleHooks() {
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          handleLifecycleFlush();
        }
      });
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', handleLifecycleFlush);
      window.addEventListener('beforeunload', handleLifecycleFlush);
    }
  }

  function save(options) {
    if (_persistenceSuspended) return false;
    options = options || {};
    if (options.immediate) {
      _coreDirty = true;
      if (options.includeWorld !== false) {
        _worldDirty = true;
      }
      return flushPending({ forceWorld: options.forceWorld === true });
    }
    return scheduleSave(options.delayMs, options);
  }

  function saveNow() {
    return save({ immediate: true, forceWorld: true });
  }

  function load() {
    var loadMark = beginPerfMark('save.load');
    try {
      var coreParseMark = beginPerfMark('save.loadCore');
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        endPerfMark(coreParseMark);
        endPerfMark(loadMark);
        return false;
      }
      var data = JSON.parse(raw);
      endPerfMark(coreParseMark);
      var loaded = GameState.importState(data);
      var rawWorld = localStorage.getItem(WORLD_SAVE_KEY);
      if (loaded && rawWorld && GameState.importWorldState) {
        try {
          var worldParseMark = beginPerfMark('save.loadWorld');
          GameState.importWorldState(JSON.parse(rawWorld));
          endPerfMark(worldParseMark);
        } catch (worldError) {
          console.error("[Storage] World load failed:", worldError);
        }
      }
      if (loaded && (data.chunks || rawWorld)) {
        saveNow();
      }
      endPerfMark(loadMark);
      return loaded;
    } catch (e) {
      endPerfMark(loadMark);
      console.error("[Storage] Load failed:", e);
      return false;
    }
  }

  function hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  function clearSave() {
    clearPendingSave();
    _coreDirty = false;
    _worldDirty = false;
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(WORLD_SAVE_KEY);
  }

  function suspendPersistence() {
    clearPendingSave();
    _coreDirty = false;
    _worldDirty = false;
    _persistenceSuspended = true;
    return true;
  }

  function resumePersistence() {
    _persistenceSuspended = false;
    return true;
  }

  function isPersistenceSuspended() {
    return _persistenceSuspended;
  }

  function clearAllData() {
    clearPendingSave();
    _coreDirty = false;
    _worldDirty = false;

    try {
      if (typeof localStorage === 'undefined') return false;

      var keysToRemove = {};
      for (var exactIndex = 0; exactIndex < MANAGED_STORAGE_EXACT_KEYS.length; exactIndex++) {
        keysToRemove[MANAGED_STORAGE_EXACT_KEYS[exactIndex]] = true;
      }

      for (var storageIndex = 0; storageIndex < localStorage.length; storageIndex++) {
        var key = localStorage.key(storageIndex);
        if (isManagedStorageKey(key)) {
          keysToRemove[key] = true;
        }
      }

      for (var storageKey in keysToRemove) {
        if (!keysToRemove.hasOwnProperty(storageKey)) continue;
        localStorage.removeItem(storageKey);
      }

      return true;
    } catch (error) {
      console.error('[Storage] Clear all data failed:', error);
      return false;
    }
  }

  function checkVersion() {
    var raw = localStorage.getItem(SAVE_KEY);
    var rawWorld = localStorage.getItem(WORLD_SAVE_KEY);
    if (!raw && !rawWorld) return { match: true, saved: null, current: window.GAME_MANIFEST.version };
    try {
      var data = raw ? JSON.parse(raw) : null;
      var worldData = rawWorld ? JSON.parse(rawWorld) : null;
      var savedVersion = data && data.version ? data.version : (worldData ? worldData.version : null);
      var worldMatches = !worldData || worldData.version === window.GAME_MANIFEST.version;
      return {
        match: !!savedVersion && savedVersion === window.GAME_MANIFEST.version && worldMatches,
        saved: savedVersion,
        current: window.GAME_MANIFEST.version
      };
    } catch (e) {
      return { match: false, saved: null, current: window.GAME_MANIFEST.version };
    }
  }

  function getSaveInfo() {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      return {
        version: data.version,
        age: data.age,
        lastSave: data.lastSave,
        unlockedCount: (data.unlocked || []).length
      };
    } catch (e) {
      return null;
    }
  }

  setupLifecycleHooks();

  return {
    save: save,
    saveNow: saveNow,
    flushPending: flushPending,
    load: load,
    hasSave: hasSave,
    clearSave: clearSave,
    clearAllData: clearAllData,
    suspendPersistence: suspendPersistence,
    resumePersistence: resumePersistence,
    isPersistenceSuspended: isPersistenceSuspended,
    checkVersion: checkVersion,
    getSaveInfo: getSaveInfo
  };
})();
