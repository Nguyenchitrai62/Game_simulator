window.DayNightSystem = (function () {
  var _timeOfDay = 6; // 0-24, start at early morning
  var _isRunning = false;

  var _lightState = {
    ambientIntensity: 0.6,
    dirIntensity: 0.8,
    dirColor: new THREE.Color(0xfff4e0),
    hemiIntensity: 0.3,
    skyColor: new THREE.Color(0x87CEEB),
    fogColor: new THREE.Color(0x87CEEB),
    fogNear: 40,
    fogFar: 80,
    darkness: 0
  };
  var _phaseValues = {
    ambient: 0.6,
    dirInt: 0.8,
    dirColor: new THREE.Color(0xfff4e0),
    hemiInt: 0.3,
    sky: new THREE.Color(0x87CEEB),
    darkness: 0
  };
  var _lerpColorA = new THREE.Color();
  var _lerpColorB = new THREE.Color();
  var _dirLightRef = null;
  var _ambLightRef = null;
  var _hemiLightRef = null;

  // Fog stays CONSTANT - darkness controlled ONLY by light intensity
  // This lets PointLights (torches, campfires) illuminate properly at night
  var FOG_NEAR = 35;
  var FOG_FAR = 75;

  // Light keyframes - smooth transitions, fog removed from night phases
  // Values tuned for physicallyCorrectLights=true
  var _phases = [
    { hour: 0,  ambient: 0.01, dirInt: 0.00, dirColor: 0x050510, hemiInt: 0.01, sky: 0x050510, darkness: 1.0 },
    { hour: 4,  ambient: 0.01, dirInt: 0.00, dirColor: 0x050510, hemiInt: 0.01, sky: 0x050510, darkness: 1.0 },
    { hour: 5,  ambient: 0.05, dirInt: 0.08, dirColor: 0x1a1030, hemiInt: 0.04, sky: 0x0f0a20, darkness: 0.85 },
    { hour: 6,  ambient: 0.20, dirInt: 0.40, dirColor: 0xff8855, hemiInt: 0.25, sky: 0xcc6633, darkness: 0.45 },
    { hour: 7,  ambient: 0.45, dirInt: 0.85, dirColor: 0xffccaa, hemiInt: 0.40, sky: 0x99bbee, darkness: 0.15 },
    { hour: 8,  ambient: 0.60, dirInt: 1.10, dirColor: 0xffeedd, hemiInt: 0.45, sky: 0x87CEEB, darkness: 0.03 },
    { hour: 12, ambient: 0.65, dirInt: 1.20, dirColor: 0xfff4e0, hemiInt: 0.45, sky: 0x87CEEB, darkness: 0.0 },
    { hour: 16, ambient: 0.60, dirInt: 1.05, dirColor: 0xffeecc, hemiInt: 0.40, sky: 0x87CEEB, darkness: 0.05 },
    { hour: 17, ambient: 0.50, dirInt: 0.85, dirColor: 0xffcc88, hemiInt: 0.35, sky: 0x99aacc, darkness: 0.15 },
    { hour: 18, ambient: 0.25, dirInt: 0.42, dirColor: 0xff6633, hemiInt: 0.20, sky: 0xcc5522, darkness: 0.45 },
    { hour: 19, ambient: 0.08, dirInt: 0.08, dirColor: 0x221133, hemiInt: 0.06, sky: 0x110815, darkness: 0.75 },
    { hour: 20, ambient: 0.02, dirInt: 0.01, dirColor: 0x080810, hemiInt: 0.02, sky: 0x060610, darkness: 0.95 },
    { hour: 21, ambient: 0.01, dirInt: 0.00, dirColor: 0x050510, hemiInt: 0.01, sky: 0x050510, darkness: 1.0 },
    { hour: 24, ambient: 0.01, dirInt: 0.00, dirColor: 0x050510, hemiInt: 0.01, sky: 0x050510, darkness: 1.0 }
  ];

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColorInto(target, hexA, hexB, t) {
    _lerpColorA.setHex(hexA);
    _lerpColorB.setHex(hexB);
    target.copy(_lerpColorA).lerp(_lerpColorB, t);
    return target;
  }

  function getPhaseValues(time) {
    var t = time % 24;
    var prev = _phases[0];
    var next = _phases[1];

    for (var i = 0; i < _phases.length - 1; i++) {
      if (t >= _phases[i].hour && t < _phases[i + 1].hour) {
        prev = _phases[i];
        next = _phases[i + 1];
        break;
      }
    }

    var range = next.hour - prev.hour;
    var frac = range > 0 ? (t - prev.hour) / range : 0;

    _phaseValues.ambient = lerp(prev.ambient, next.ambient, frac);
    _phaseValues.dirInt = lerp(prev.dirInt, next.dirInt, frac);
    _phaseValues.hemiInt = lerp(prev.hemiInt, next.hemiInt, frac);
    _phaseValues.darkness = lerp(prev.darkness, next.darkness, frac);
    lerpColorInto(_phaseValues.dirColor, prev.dirColor, next.dirColor, frac);
    lerpColorInto(_phaseValues.sky, prev.sky, next.sky, frac);
    return _phaseValues;
  }

  function cacheSceneLights(scene) {
    if (_dirLightRef && _dirLightRef.parent === scene && _ambLightRef && _ambLightRef.parent === scene && _hemiLightRef && _hemiLightRef.parent === scene) {
      return;
    }

    _dirLightRef = null;
    _ambLightRef = null;
    _hemiLightRef = null;

    for (var i = 0; i < scene.children.length; i++) {
      var child = scene.children[i];
      if (child.isDirectionalLight) _dirLightRef = child;
      else if (child.isAmbientLight) _ambLightRef = child;
      else if (child.isHemisphereLight) _hemiLightRef = child;
    }
  }

  function init() {
    _timeOfDay = 6;
    _isRunning = true;
    console.log('[DayNight] Initialized - using lighting-only darkness (no fog)');
  }

  function advance(dt) {
    var gameSpeed = (typeof GameState !== 'undefined' && GameState.getGameSpeed) ? GameState.getGameSpeed() : 1.0;
    var balance = window.GAME_BALANCE || {};
    var config = balance.dayNight || {};
    var hoursPerSecond = config.hoursPerSecond || 0.0667;

    _timeOfDay += hoursPerSecond * dt * gameSpeed;
    if (_timeOfDay >= 24) _timeOfDay -= 24;

    if (GameState.setTimeOfDay) {
      GameState.setTimeOfDay(_timeOfDay);
    }
  }

  function update(dt) {
    if (!_isRunning) return;

    advance(dt);

    var vals = getPhaseValues(_timeOfDay);
    _lightState.ambientIntensity = vals.ambient;
    _lightState.dirIntensity = vals.dirInt;
    _lightState.dirColor.copy(vals.dirColor);
    _lightState.hemiIntensity = vals.hemiInt;
    _lightState.skyColor.copy(vals.sky);
    _lightState.fogColor.copy(vals.sky);
    _lightState.darkness = vals.darkness;

    var scene = GameScene.getScene();
    var camera = GameScene.getCamera();
    if (!scene || !camera) return;

    // Sky color changes with time of day
    if (scene.background && scene.background.isColor) {
      scene.background.copy(_lightState.skyColor);
    } else {
      scene.background = _lightState.skyColor.clone();
    }

    // Fog color matches sky but distance stays CONSTANT
    // This prevents fog from acting as a "color blanket" at night
    scene.fog.color.copy(_lightState.fogColor);
    scene.fog.near = FOG_NEAR;
    scene.fog.far = FOG_FAR;

    // Control darkness through light intensity ONLY
    cacheSceneLights(scene);

    if (_dirLightRef) {
      _dirLightRef.intensity = vals.dirInt;
      _dirLightRef.color.copy(vals.dirColor);
    }
    if (_ambLightRef) {
      _ambLightRef.intensity = vals.ambient;
    }
    if (_hemiLightRef) {
      _hemiLightRef.intensity = vals.hemiInt;
    }

  }

  function getTimeOfDay() { return _timeOfDay; }
  function setTimeOfDay(t) { _timeOfDay = t % 24; }
  function getDarkness() { return _lightState.darkness; }
  function isNight() { return _lightState.darkness >= 0.5; }
  function isDay() { return _lightState.darkness < 0.3; }

  function getTimeString() {
    var h = Math.floor(_timeOfDay);
    var m = Math.floor((_timeOfDay - h) * 60);
    var period = "";
    if (_timeOfDay >= 6 && _timeOfDay < 20) period = "\u2600";
    else period = "\uD83C\uDF19";
    return period + " " + (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  return {
    init: init,
    update: update,
    advance: advance,
    getTimeOfDay: getTimeOfDay,
    setTimeOfDay: setTimeOfDay,
    getDarkness: getDarkness,
    isNight: isNight,
    isDay: isDay,
    getTimeString: getTimeString
  };
})();