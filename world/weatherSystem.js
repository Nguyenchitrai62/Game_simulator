window.WeatherSystem = (function () {
  var _rainParticles = null;
  var _isRaining = false;
  var _weatherTimer = 300;
  var _currentWeather = 'clear';
  var _initialized = false;

  function init() {
    _weatherTimer = 180 + Math.random() * 120;
    _initialized = true;
  }

  function update(dt) {
    if (!_initialized) return;
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
      var positions = new Float32Array(400 * 6);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      var mat = new THREE.LineBasicMaterial({ color: 0x8888bb, transparent: true, opacity: 0.25 });
      _rainParticles = new THREE.LineSegments(geo, mat);
      _rainParticles.frustumCulled = false;
      GameScene.getScene().add(_rainParticles);
    }
    _rainParticles.visible = true;
  }

  function updateRain(dt) {
    if (!_rainParticles) return;
    var pos = _rainParticles.geometry.attributes.position;
    var playerPos = (typeof GamePlayer !== 'undefined') ? GamePlayer.getPosition() : { x: 8, z: 8 };

    for (var i = 0; i < 400; i++) {
      var idx = i * 6;
      var rx = playerPos.x + (Math.random() - 0.5) * 30;
      var rz = playerPos.z + (Math.random() - 0.5) * 30;
      var ry = 8 + Math.random() * 4;
      pos.array[idx] = rx;
      pos.array[idx + 1] = ry;
      pos.array[idx + 2] = rz;
      pos.array[idx + 3] = rx + 0.2;
      pos.array[idx + 4] = ry - 0.6;
      pos.array[idx + 5] = rz;
    }
    pos.needsUpdate = true;
  }

  function stopRain() {
    _isRaining = false;
    if (_rainParticles) {
      _rainParticles.visible = false;
    }
  }

  function isRaining() { return _isRaining; }
  function getWeather() { return _currentWeather; }

  return {
    init: init,
    update: update,
    isRaining: isRaining,
    getWeather: getWeather
  };
})();