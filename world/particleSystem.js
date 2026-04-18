window.ParticleSystem = (function () {
  var MAX_PARTICLES = 250;
  var _pool = [];
  var _active = [];
  var _scene = null;
  var _initialized = false;

  var PRESETS = {
    woodChip: { color: 0x8B6914, size: 0.03, gravity: -2, lifetime: 0.5, spread: 0.5, count: 6 },
    rockDust: { color: 0x999999, size: 0.02, gravity: -1, lifetime: 0.3, spread: 0.3, count: 8 },
    berryBurst: { color: 0xcc3333, size: 0.04, gravity: -3, lifetime: 0.4, spread: 0.4, count: 5 },
    waterBoost: { color: 0x57c7ff, size: 0.06, gravity: -2.4, lifetime: 0.65, spread: 0.35, count: 8 },
    spark: { color: 0xFFAA00, size: 0.02, gravity: -4, lifetime: 0.3, spread: 0.2, count: 6 },
    combatHit: { color: 0xFF4444, size: 0.04, gravity: -5, lifetime: 0.5, spread: 0.8, count: 8 },
    combatBlock: { color: 0x888888, size: 0.03, gravity: -2, lifetime: 0.4, spread: 0.6, count: 5 },
    loot: { color: 0xFFD700, size: 0.05, gravity: 2, lifetime: 1.0, spread: 0.2, count: 4 },
    fireEmber: { color: 0xFF6600, size: 0.015, gravity: 0.5, lifetime: 1.5, spread: 0.1, count: 1 },
    leafFall: { color: 0x5a9a3a, size: 0.04, gravity: -0.3, lifetime: 3.0, spread: 0.1, count: 1 },
    firefly: { color: 0xAAFF44, size: 0.03, gravity: 0, lifetime: 4.0, spread: 0.5, count: 1 },
    deathBurst: { color: 0xFF6666, size: 0.06, gravity: -3, lifetime: 0.8, spread: 1.0, count: 12 }
  };

  var _sharedGeo = null;
  var _matCache = {};

  function init() {
    if (_initialized) return;
    _initialized = true;
    _scene = GameScene.getScene();
    _sharedGeo = new THREE.PlaneGeometry(0.1, 0.1);
    for (var i = 0; i < MAX_PARTICLES; i++) {
      _pool.push(createParticle());
    }
  }

  function getMaterial(color) {
    var hex = color.toString(16);
    while (hex.length < 6) hex = '0' + hex;
    if (_matCache[hex]) return _matCache[hex];
    var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
    _matCache[hex] = mat;
    return mat;
  }

  function createParticle() {
    var mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
    var mesh = new THREE.Mesh(_sharedGeo || new THREE.PlaneGeometry(0.1, 0.1), mat);
    mesh.visible = false;
    return { mesh: mesh, mat: mat, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, grav: -2, active: false };
  }

  function areParticlesEnabled() {
    return !window.GameDebugSettings || !GameDebugSettings.isEnabled || GameDebugSettings.isEnabled('particles');
  }

  function clearAll() {
    if (!_initialized) return;

    for (var i = _active.length - 1; i >= 0; i--) {
      var particle = _active[i];
      particle.active = false;
      particle.mesh.visible = false;
      if (particle.mesh.parent === _scene) {
        _scene.remove(particle.mesh);
      }
      _pool.push(particle);
    }

    _active.length = 0;
  }

  function emit(presetName, position, config) {
    if (!areParticlesEnabled()) return;
    if (!_initialized) init();
    var preset = PRESETS[presetName] || {};
    var cfg = config || {};
    var count = cfg.count || preset.count || 5;
    var color = cfg.color !== undefined ? cfg.color : (preset.color !== undefined ? preset.color : 0xFFFFFF);
    var size = cfg.size || preset.size || 0.03;
    var grav = cfg.gravity !== undefined ? cfg.gravity : (preset.gravity !== undefined ? preset.gravity : -2);
    var lifetime = cfg.lifetime || preset.lifetime || 1;
    var spread = cfg.spread || preset.spread || 0.3;

    for (var i = 0; i < count; i++) {
      var p = getFromPool();
      if (!p) break;

      p.mat.color.setHex(color);
      p.mat.opacity = 1;
      p.mesh.scale.set(size, size, size);

      var px = position.x + (Math.random() - 0.5) * spread;
      var py = (position.y !== undefined ? position.y : 0.5);
      var pz = position.z + (Math.random() - 0.5) * spread;

      p.mesh.position.set(px, py, pz);
      p.vx = (Math.random() - 0.5) * spread * 3;
      p.vy = (Math.random() * 0.5 + 0.5) * Math.abs(grav) * 0.3 * (grav < 0 ? 1 : -1);
      p.vz = (Math.random() - 0.5) * spread * 3;
      p.life = lifetime * (0.7 + Math.random() * 0.3);
      p.maxLife = p.life;
      p.grav = grav;
      p.active = true;
      p.mesh.visible = true;

      if (p.mesh.parent !== _scene) {
        _scene.add(p.mesh);
      }
    }
  }

  function update(dt) {
    if (!_initialized) return;
    if (!areParticlesEnabled()) {
      clearAll();
      return;
    }

    var camera = GameScene.getCamera();
    for (var i = _active.length - 1; i >= 0; i--) {
      var p = _active[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        if (p.mesh.parent === _scene) {
          _scene.remove(p.mesh);
        }
        _pool.push(p);
        _active.splice(i, 1);
        continue;
      }

      p.vy += p.grav * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      p.mat.opacity = Math.max(0, p.life / p.maxLife);

      if (camera) {
        p.mesh.quaternion.copy(camera.quaternion);
      }
    }
  }

  function getFromPool() {
    if (_pool.length === 0) return null;
    var p = _pool.pop();
    _active.push(p);
    return p;
  }

  return {
    init: init,
    emit: emit,
    update: update,
    clearAll: clearAll,
    PRESETS: PRESETS
  };
})();