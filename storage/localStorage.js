window.GameStorage = (function () {
  var SAVE_KEY = "game_save";

  function save() {
    var data = GameState.exportState();
    data.lastSave = Date.now();
    data.version = window.GAME_MANIFEST.version;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("[Storage] Save failed:", e);
      return false;
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      var loaded = GameState.importState(data);
      if (loaded && data.chunks) {
        save();
      }
      return loaded;
    } catch (e) {
      console.error("[Storage] Load failed:", e);
      return false;
    }
  }

  function hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  function checkVersion() {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { match: true, saved: null, current: window.GAME_MANIFEST.version };
    try {
      var data = JSON.parse(raw);
      return {
        match: data.version === window.GAME_MANIFEST.version,
        saved: data.version,
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

  return {
    save: save,
    load: load,
    hasSave: hasSave,
    clearSave: clearSave,
    checkVersion: checkVersion,
    getSaveInfo: getSaveInfo
  };
})();
