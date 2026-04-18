window.WeatherSystem = (function () {
  var RAIN_DROP_COUNT = 720;
  var RAIN_LENGTH = 0.9;
  var RAIN_MIN_Y = 5.5;
  var RAIN_Y_RANGE = 6.5;
  var RAIN_RESET_Y = RAIN_MIN_Y + RAIN_Y_RANGE;
  var RAIN_GROUND_Y = -0.5;
  var _rainParticles = null;
  var _rainDropState = [];
  var _isRaining = false;
  var _weatherTimer = 300;
  var _currentWeather = 'clear';
  var _initialized = false;
  var _enabled = true;

  function init() {
    _weatherTimer = 180 + Math.random() * 120;
    _initialized = true;
  }

  function update(dt) {
    if (!_initialized || !_enabled) return;
    _weatherTimer -= dt;

    if (_weatherTimer <= 0) {
      if (_currentWeather === 'clear') {
        if (Math.random() < 0.25) {
          _currentWeather = 'rain';
          _weatherTimer = 60 + Math.random() * 120;
          startRain();
        } else {
          _weatherTimer = 180 + Math.random() * 240;
        }
      } else {
        _currentWeather = 'clear';
        _weatherTimer = 180 + Math.random() * 240;
        stopRain();
      }
    }

    if (_isRaining) {
      updateRain(dt);
    }
  }

  function startRain() {
    _isRaining = true;
    if (!_rainParticles) {
      var geo = new THREE.BufferGeometry();
      var positions = new Float32Array(RAIN_DROP_COUNT * 6);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      var mat = new THREE.LineBasicMaterial({ color: 0x9ca9d6, transparent: true, opacity: 0.32 });
      _rainParticles = new THREE.LineSegments(geo, mat);
      _rainParticles.frustumCulled = false;
      GameScene.getScene().add(_rainParticles);
    }
    ensureRainDropState(true);
    _rainParticles.visible = true;
  }

  function getRainBounds() {
    var playerPos = (typeof GamePlayer !== 'undefined' && GamePlayer.getPosition) ? GamePlayer.getPosition() : { x: 8, z: 8 };
    var camera = (typeof GameScene !== 'undefined' && GameScene.getCamera) ? GameScene.getCamera() : null;
    var width = 46;
    var depth = 54;

    if (camera) {
      var orthoWidth = Math.abs((camera.right || 0) - (camera.left || 0));
      var orthoHeight = Math.abs((camera.top || 0) - (camera.bottom || 0));
      width = Math.max(width, orthoWidth * 1.6);
      depth = Math.max(depth, orthoHeight * 3.0);
    }

    return {
      centerX: playerPos.x,
      centerZ: playerPos.z,
      width: width,
      depth: depth
    };
  }

  function resetRainDrop(drop, bounds, randomizeHeight) {
    drop.xOffset = (Math.random() - 0.5) * bounds.width;
    drop.zOffset = (Math.random() - 0.5) * bounds.depth;
    drop.y = RAIN_MIN_Y + (randomizeHeight ? Math.random() * RAIN_Y_RANGE : RAIN_Y_RANGE);
    drop.speed = 11 + Math.random() * 5;
    drop.driftX = -0.35 + Math.random() * 0.15;
    drop.driftZ = 0.05 + Math.random() * 0.12;
  }

  function ensureRainDropState(forceReset) {
    var bounds = getRainBounds();

    if (forceReset) {
      _rainDropState = [];
    }

    while (_rainDropState.length < RAIN_DROP_COUNT) {
      var drop = {};
      resetRainDrop(drop, bounds, true);
      _rainDropState.push(drop);
    }
  }

  function updateRain(dt) {
    if (!_rainParticles) return;
    ensureRainDropState(false);

    var pos = _rainParticles.geometry.attributes.position;
    var bounds = getRainBounds();

    for (var i = 0; i < RAIN_DROP_COUNT; i++) {
      var drop = _rainDropState[i];
      var idx = i * 6;

      drop.y -= drop.speed * dt;
      drop.xOffset += drop.driftX * dt;
      drop.zOffset += drop.driftZ * dt;

      if (drop.y < RAIN_GROUND_Y || Math.abs(drop.xOffset) > bounds.width * 0.6 || Math.abs(drop.zOffset) > bounds.depth * 0.6) {
        resetRainDrop(drop, bounds, false);
        drop.y = RAIN_RESET_Y - Math.random() * 0.8;
      }

      var rx = bounds.centerX + drop.xOffset;
      var rz = bounds.centerZ + drop.zOffset;
      var ry = drop.y;

      pos.array[idx] = rx;
      pos.array[idx + 1] = ry;
      pos.array[idx + 2] = rz;
      pos.array[idx + 3] = rx + 0.18;
      pos.array[idx + 4] = ry - RAIN_LENGTH;
      pos.array[idx + 5] = rz + 0.06;
    }
    pos.needsUpdate = true;
  }

  function stopRain() {
    _isRaining = false;
    if (_rainParticles) {
      _rainParticles.visible = false;
    }
  }

  function setEnabled(enabled) {
    _enabled = enabled !== false;
    if (_rainParticles) {
      _rainParticles.visible = _enabled && _isRaining;
    }
    return _enabled;
  }

  function isRaining() { return _isRaining; }
  function getWeather() { return _currentWeather; }

  return {
    init: init,
    update: update,
    setEnabled: setEnabled,
    isRaining: isRaining,
    getWeather: getWeather
  };
})();