(function () {
  var STYLE_PATH = 'dev/local-cheat-panel/style.css';
  var SCRIPT_PATH = 'dev/local-cheat-panel/panel.js';
  var loadState = 'idle';
  var loadPromise = null;

  function isTypingTarget(target) {
    if (!target) return false;
    var tagName = String(target.tagName || '').toUpperCase();
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable;
  }

  function fetchOptionalText(path) {
    if (!window.fetch || !window.Promise) {
      return Promise.resolve(null);
    }

    return fetch(path, { cache: 'no-store' })
      .then(function (response) {
        if (!response || !response.ok) return null;
        return response.text();
      })
      .catch(function () {
        return null;
      });
  }

  function injectStyle(text, path) {
    if (!text) return;
    if (document.querySelector('style[data-local-cheat-style="' + path + '"]')) return;
    var style = document.createElement('style');
    style.setAttribute('data-local-cheat-style', path);
    style.textContent = text;
    document.head.appendChild(style);
  }

  function injectScript(text, path) {
    if (!text) return;
    if (document.querySelector('script[data-local-cheat-script="' + path + '"]')) return;
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.setAttribute('data-local-cheat-script', path);
    script.text = text + '\n//# sourceURL=' + path.replace(/\s/g, '%20');
    document.body.appendChild(script);
  }

  function loadLocalCheatPanel() {
    if (loadState === 'ready') {
      return Promise.resolve(!!(window.LocalCheatPanel && window.LocalCheatPanel.open));
    }

    if (loadState === 'missing') {
      return Promise.resolve(false);
    }

    if (loadState === 'loading' && loadPromise) {
      return loadPromise;
    }

    loadState = 'loading';
    loadPromise = Promise.all([
      fetchOptionalText(STYLE_PATH),
      fetchOptionalText(SCRIPT_PATH)
    ]).then(function (results) {
      var styleText = results[0];
      var scriptText = results[1];

      if (!scriptText) {
        loadState = 'missing';
        return false;
      }

      injectStyle(styleText, STYLE_PATH);
      injectScript(scriptText, SCRIPT_PATH);

      if (window.LocalCheatPanel && window.LocalCheatPanel.open) {
        loadState = 'ready';
        return true;
      }

      loadState = 'missing';
      return false;
    }).catch(function () {
      loadState = 'missing';
      return false;
    });

    return loadPromise;
  }

  function handleToggleRequest() {
    if (window.LocalCheatPanel && window.LocalCheatPanel.toggle) {
      window.LocalCheatPanel.toggle();
      return;
    }

    loadLocalCheatPanel().then(function (loaded) {
      if (!loaded || !window.LocalCheatPanel || !window.LocalCheatPanel.open) return;
      window.LocalCheatPanel.open();
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key !== 'p' && event.key !== 'P') return;
    if (isTypingTarget(event.target)) return;

    event.preventDefault();
    handleToggleRequest();
  });
})();