window.AtmosphereSystem = (function () {
  var _windDirection = { x: 1, z: 0 };
  var _windStrength = 0.3;
  var _windAngle = 0;
  var _windTime = 0;

  var _starField = null;
  var _starPositions = null;
  var _moonMesh = null;
  var _moonLight = null;

  var _clouds = [];
  var _cloudGroup = null;
  var CLOUD_COUNT = 8;
  var DAYTIME_CLOUD_OPACITY = 0.3;
  var CLOUD_FADE_OUT_START_HOUR = 18;
  var CLOUD_RETURN_HOUR = 6;

  var _windTargets = [];
  var _initialized = false;
  var _enabled = true;

  var _ambientTimer = 0;

  function init() {
    if (_initialized) return;
    _initialized = true;

    createStarField();
    createMoon();
    createClouds();
    setEnabled(isAtmosphereEnabled());

    console.log('[Atmosphere] Initialized - wind, stars, moon, clouds');
  }

  function isAtmosphereEnabled() {
    return !window.GameDebugSettings || !GameDebugSettings.isEnabled || GameDebugSettings.isEnabled('atmosphere');
  }

  function createStarField() {
    var starCount = 400;
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(starCount * 3);
    var sizes = new Float32Array(starCount);
    var phases = new Float32Array(starCount);

    for (var i = 0; i < starCount; i++) {
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.random() * Math.PI * 0.5;
      var radius = 80;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      sizes[i] = 0.3 + Math.random() * 0.5;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true
    });

    _starField = new THREE.Points(geometry, material);
    _starField.userData.phases = phases;
    _starField.userData.starCount = starCount;
    GameScene.getScene().add(_starField);
  }

  function createMoon() {
    var moonGeo = new THREE.SphereGeometry(0.8, 16, 16);
    var moonMat = new THREE.MeshBasicMaterial({
      color: 0xeeeeff,
      transparent: true,
      opacity: 0
    });
    _moonMesh = new THREE.Mesh(moonGeo, moonMat);
    _moonMesh.position.set(30, 30, -20);
    GameScene.getScene().add(_moonMesh);

    _moonLight = new THREE.PointLight(0xaabbff, 0, 50);
    _moonLight.position.set(30, 30, -20);
    _moonLight.decay = 2;
    GameScene.getScene().add(_moonLight);
  }

  function createClouds() {
    _cloudGroup = new THREE.Group();
    _cloudGroup.position.y = 15;

    var cloudColors = [0xffffff, 0xf0f0f0, 0xe8e8e8];

    for (var i = 0; i < CLOUD_COUNT; i++) {
      var cloud = createSingleCloud(cloudColors[i % cloudColors.length]);
      cloud.position.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 80
      );
      cloud.userData.speed = 0.8 + Math.random() * 1.0;
      cloud.userData.baseX = cloud.position.x;
      _clouds.push(cloud);
      _cloudGroup.add(cloud);
    }

    GameScene.getScene().add(_cloudGroup);
  }

  function createSingleCloud(color) {
    var group = new THREE.Group();
    var sphereCount = 3 + Math.floor(Math.random() * 3);

    var mat = new THREE.MeshLambertMaterial({
      color: color,
      transparent: true,
      opacity: 0.35
    });
    group.userData.material = mat;

    for (var i = 0; i < sphereCount; i++) {
      var radius = 1.0 + Math.random() * 1.5;
      var geo = new THREE.SphereGeometry(radius, 6, 5);
      var sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(
        i * 1.5 - (sphereCount * 0.75),
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 1.5
      );
      sphere.castShadow = false;
      sphere.receiveShadow = false;
      group.add(sphere);
    }

    return group;
  }

  function update(dt) {
    if (!_initialized || !_enabled) return;

    _windTime += dt;
    _windAngle += 0.01 * dt;
    _windStrength = 0.2 + 0.1 * Math.sin(_windTime * 0.2) + 0.05 * Math.sin(_windTime * 0.07);
    _windDirection.x = Math.cos(_windAngle);
    _windDirection.z = Math.sin(_windAngle);
    var playerPos = (typeof GamePlayer !== 'undefined' && GamePlayer.getPosition) ? GamePlayer.getPosition() : { x: 0, z: 0 };
    var currentDarkness = (typeof DayNightSystem !== 'undefined') ? DayNightSystem.getDarkness() : 0;
    var timeOfDay = (typeof DayNightSystem !== 'undefined' && DayNightSystem.getTimeOfDay) ? DayNightSystem.getTimeOfDay() : 12;

    updateWindTargets(dt);
    updateStars(dt, playerPos, currentDarkness);
    updateMoon(dt, playerPos, currentDarkness);
    updateClouds(dt, playerPos, currentDarkness, timeOfDay);

    // Ambient particles: falling leaves & fireflies
    _ambientTimer += dt;
    if (typeof ParticleSystem !== 'undefined' && typeof GamePlayer !== 'undefined') {
      // Falling leaves near trees
      if (Math.random() < 0.003 * dt * 60) {
        ParticleSystem.emit('leafFall', {x: playerPos.x + (Math.random() - 0.5) * 10, y: 2 + Math.random() * 3, z: playerPos.z + (Math.random() - 0.5) * 10});
      }
      // Fireflies at night
      if (currentDarkness > 0.7 && Math.random() < 0.005 * dt * 60) {
        ParticleSystem.emit('firefly', {x: playerPos.x + (Math.random() - 0.5) * 8, y: 0.5 + Math.random() * 1.5, z: playerPos.z + (Math.random() - 0.5) * 8});
      }
    }
  }

  function isAttachedToActiveScene(mesh) {
    if (!mesh) return false;
    var scene = (typeof GameScene !== 'undefined' && GameScene.getScene) ? GameScene.getScene() : null;
    if (!scene) return !!mesh.parent;

    var current = mesh;
    while (current) {
      if (current === scene) return true;
      current = current.parent;
    }

    return false;
  }

  function findWindPivot(mesh, type) {
    if (!mesh) return null;
    if (type !== 'tree') return mesh;

    mesh.userData = mesh.userData || {};
    if (mesh.userData.windCanopy) {
      return mesh.userData.windCanopy;
    }

    var canopy = null;
    mesh.traverse(function (child) {
      if (!canopy && child.userData && child.userData.isCanopy) {
        canopy = child;
      }
    });

    mesh.userData.windCanopy = canopy || mesh;
    return mesh.userData.windCanopy;
  }

  function updateWindTargets(dt) {
    var time = performance.now() * 0.001;
    var writeIndex = 0;

    for (var i = 0; i < _windTargets.length; i++) {
      var entry = _windTargets[i];
      if (!entry || !entry.mesh || !isAttachedToActiveScene(entry.mesh)) continue;

      _windTargets[writeIndex++] = entry;

      var mesh = entry.mesh;
      var pivot = entry.pivot || mesh;
      var px = mesh.position.x || 0;
      var pz = mesh.position.z || 0;

      if (entry.type === 'tree') {
        if (pivot) {
          var sway = Math.sin(time * 1.5 + px * 0.5 + pz * 0.3) * _windStrength * 0.12;
          pivot.rotation.z = sway;
          pivot.rotation.x = Math.sin(time * 1.2 + pz * 0.4) * _windStrength * 0.05;
        }
      } else if (entry.type === 'bush') {
        var swayBush = Math.sin(time * 2.0 + px * 0.3) * _windStrength * 0.06;
        mesh.rotation.z = swayBush;
      } else if (entry.type === 'grass') {
        var swayGrass = Math.sin(time * 3.0 + pz + px * 0.2) * _windStrength * 0.2;
        mesh.rotation.x = swayGrass;
      }
    }

    if (writeIndex !== _windTargets.length) {
      _windTargets.length = writeIndex;
    }
  }

  function updateStars(dt, playerPos, darkness) {
    if (!_starField) return;
    var targetOpacity = Math.max(0, (darkness - 0.4) * 1.67);
    targetOpacity = Math.min(1, targetOpacity);

    if (targetOpacity <= 0) {
      _starField.visible = false;
      return;
    }

    _starField.visible = true;

    var time = performance.now() * 0.001;
    var currentOpacity = _starField.material.opacity;
    _starField.material.opacity = currentOpacity + (targetOpacity - currentOpacity) * 0.05;

    _starField.position.set(playerPos.x, 0, playerPos.z);
  }

  function updateMoon(dt, playerPos, darkness) {
    if (!_moonMesh) return;

    var targetOpacity = 0;
    var targetIntensity = 0;

    if (darkness > 0.5) {
      targetOpacity = Math.min(1, (darkness - 0.5) * 2);
      targetIntensity = Math.min(0.3, (darkness - 0.5) * 0.6);
    }

    _moonMesh.material.opacity = targetOpacity;
    _moonMesh.visible = targetOpacity > 0;

    _moonLight.intensity = targetIntensity;
    _moonLight.visible = targetIntensity > 0;

    if (targetOpacity > 0) {
      var timeOfDay = (typeof DayNightSystem !== 'undefined') ? DayNightSystem.getTimeOfDay() : 0;
      var moonAngle = (timeOfDay - 18) / 12 * Math.PI;
      var moonDist = 35;

      _moonMesh.position.set(
        playerPos.x + Math.cos(moonAngle) * moonDist,
        28,
        playerPos.z + Math.sin(moonAngle) * moonDist * 0.5
      );
      _moonLight.position.copy(_moonMesh.position);
    }
  }

  function getCloudVisibilityByTime(timeOfDay) {
    var hour = typeof timeOfDay === 'number' ? (timeOfDay % 24) : 12;
    if (hour < 0) hour += 24;

    if (hour >= CLOUD_FADE_OUT_START_HOUR || hour < CLOUD_RETURN_HOUR) {
      return 0;
    }

    return 1;
  }

  function updateClouds(dt, playerPos, darkness, timeOfDay) {
    if (!_cloudGroup) return;
    var cloudVisibility = getCloudVisibilityByTime(timeOfDay);
    var cloudOpacity = DAYTIME_CLOUD_OPACITY * cloudVisibility * (1 - darkness * 0.2);

    _cloudGroup.visible = _enabled && cloudVisibility > 0.001;
    if (!_cloudGroup.visible) return;

    for (var i = 0; i < _clouds.length; i++) {
      var cloud = _clouds[i];

      // Slow drift with wind
      cloud.position.x += _windDirection.x * _windStrength * cloud.userData.speed * dt * 1.5;
      cloud.position.z += _windDirection.z * _windStrength * cloud.userData.speed * dt * 0.5;

      // Wrap around player viewport so clouds always visible
      if (cloud.position.x > playerPos.x + 70) cloud.position.x = playerPos.x - 70;
      if (cloud.position.x < playerPos.x - 70) cloud.position.x = playerPos.x + 70;
      if (cloud.position.z > playerPos.z + 70) cloud.position.z = playerPos.z - 70;
      if (cloud.position.z < playerPos.z - 70) cloud.position.z = playerPos.z + 70;

      if (cloud.userData.material) {
        cloud.userData.material.opacity = cloudOpacity;
      }
    }
  }

  function setEnabled(enabled) {
    _enabled = enabled !== false;
    if (!_enabled) {
      if (_starField) {
        _starField.visible = false;
        if (_starField.material) _starField.material.opacity = 0;
      }
      if (_moonMesh) {
        _moonMesh.visible = false;
        if (_moonMesh.material) _moonMesh.material.opacity = 0;
      }
      if (_moonLight) {
        _moonLight.visible = false;
        _moonLight.intensity = 0;
      }
      if (_cloudGroup) {
        _cloudGroup.visible = false;
      }
      return;
    }

    if (!_initialized) return;

    var playerPos = (typeof GamePlayer !== 'undefined' && GamePlayer.getPosition) ? GamePlayer.getPosition() : { x: 0, z: 0 };
    var currentDarkness = (typeof DayNightSystem !== 'undefined') ? DayNightSystem.getDarkness() : 0;
    var timeOfDay = (typeof DayNightSystem !== 'undefined' && DayNightSystem.getTimeOfDay) ? DayNightSystem.getTimeOfDay() : 12;
    updateStars(0, playerPos, currentDarkness);
    updateMoon(0, playerPos, currentDarkness);
    updateClouds(0, playerPos, currentDarkness, timeOfDay);
  }

  function registerWindTarget(mesh, type) {
    if (!mesh) return;
    for (var i = 0; i < _windTargets.length; i++) {
      if (_windTargets[i] && _windTargets[i].mesh === mesh) {
        _windTargets[i].type = type;
        _windTargets[i].pivot = findWindPivot(mesh, type);
        return;
      }
    }
    _windTargets.push({ mesh: mesh, type: type, pivot: findWindPivot(mesh, type) });
  }

  function unregisterWindTarget(mesh) {
    _windTargets = _windTargets.filter(function (entry) {
      return entry.mesh !== mesh;
    });
  }

  function getWind() {
    return { direction: _windDirection, strength: _windStrength };
  }

  return {
    init: init,
    update: update,
    setEnabled: setEnabled,
    registerWindTarget: registerWindTarget,
    unregisterWindTarget: unregisterWindTarget,
    getWind: getWind
  };
})();