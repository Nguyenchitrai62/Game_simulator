window.AnimationSystem = (function () {
  var _animations = [];
  var _nextId = 0;

  var easing = {
    linear: function (t) { return t; },
    easeOut: function (t) { return 1 - Math.pow(1 - t, 3); },
    easeInOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    bounce: function (t) {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      else if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      else if (t < 2.625 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      else return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
    elastic: function (t) {
      if (t === 0 || t === 1) return t;
      return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    },
    easeOutBack: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  };

  function init() {
    _animations = [];
    _nextId = 0;
  }

  function addAnimation(config) {
    var anim = {
      id: _nextId++,
      target: config.target,
      properties: config.properties || null,
      property: config.property || null,
      from: config.from,
      to: config.to,
      duration: config.duration || 500,
      easingFn: easing[config.easing] || easing.easeOut,
      onComplete: config.onComplete || null,
      onUpdate: config.onUpdate || null,
      elapsed: 0
    };
    _animations.push(anim);
    return anim.id;
  }

  function cancelAnimation(id) {
    for (var i = _animations.length - 1; i >= 0; i--) {
      if (_animations[i].id === id) {
        _animations.splice(i, 1);
        break;
      }
    }
  }

  function update(dt) {
    if (!_animations.length) return;

    var dtMs = dt * 1000;
    var writeIndex = 0;

    for (var i = 0; i < _animations.length; i++) {
      var anim = _animations[i];
      anim.elapsed += dtMs;
      var t = Math.min(1, anim.elapsed / anim.duration);
      var easedT = anim.easingFn(t);

      if (anim.properties) {
        for (var prop in anim.properties) {
          var val = anim.properties[prop].from + (anim.properties[prop].to - anim.properties[prop].from) * easedT;
          setNestedProp(anim.target, prop, val);
        }
      } else if (anim.onUpdate) {
        anim.onUpdate(easedT, t);
      } else if (anim.property) {
        var val = anim.from + (anim.to - anim.from) * easedT;
        setNestedProp(anim.target, anim.property, val);
      }

      if (t >= 1) {
        if (anim.onComplete) anim.onComplete();
        continue;
      }

      _animations[writeIndex++] = anim;
    }

    if (writeIndex !== _animations.length) {
      _animations.length = writeIndex;
    }
  }

  function setNestedProp(obj, path, val) {
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = val;
  }

  function flashScreen(color, duration) {
    if (window.GameDebugSettings && GameDebugSettings.isEnabled && !GameDebugSettings.isEnabled('screenFx')) {
      return;
    }

    var overlay = document.getElementById('screen-flash');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'screen-flash';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;opacity:0;transition:opacity ' + (duration || 200) + 'ms;';
      document.body.appendChild(overlay);
    }
    overlay.style.backgroundColor = color;
    overlay.style.opacity = '0.25';
    setTimeout(function () { overlay.style.opacity = '0'; }, 50);
  }

  return {
    init: init,
    addAnimation: addAnimation,
    cancelAnimation: cancelAnimation,
    update: update,
    flashScreen: flashScreen,
    easing: easing
  };
})();