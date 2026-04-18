window.FireSystem = (function () {
  var _lights = {};
  var _playerTorchLight = null;
  var _warmOrange = new THREE.Color(0xFF8C00);
  var _warmYellow = new THREE.Color(0xFFD700);
  var _deepOrange = new THREE.Color(0xFF6600);
  var _fireColor = new THREE.Color();
  var _torchColor = new THREE.Color();
  var _activeFires = [];
  var _activeFireCount = 0;
  var _lightSources = [];
  var _lightSourceCount = 0;
  var _activeLightSources = [];
  var _activeLightSourceCount = 0;
  var _lightCoverageCache = Object.create(null);
  var _playerTorchLightInfo = null;

  function hashUid(uid) {
    var hash = 0;
    for (var i = 0; i < uid.length; i++) {
      hash = ((hash << 5) - hash) + uid.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }

  function init() {
    var instances = GameState.getAllInstancesLive ? GameState.getAllInstancesLive() : GameState.getAllInstances();
    for (var uid in instances) {
      var inst = instances[uid];
      var balance = GameRegistry.getBalance(inst.entityId);
      if (balance && balance.lightRadius) {
        createFireLight(uid, inst);
      }
    }
  }

  function createFireLight(uid, instance) {
    var entityId = instance.entityId;
    var balance = GameRegistry.getBalance(entityId);
    if (!balance || !balance.lightRadius) return;

    var lightIntensity = balance.lightIntensity || 1.5;
    var lightColor = balance.lightColor || 0xFFA500;
    var lightRadius = balance.lightRadius || 14;

    var isCampfire = (entityId === 'building.campfire');
    var seed = hashUid(uid);

    var pointLight = new THREE.PointLight(lightColor, 0, lightRadius * 2.5);
    pointLight.position.set(instance.x, 1.5, instance.z);
    pointLight.decay = 1.2;
    pointLight.castShadow = false;

    GameScene.getScene().add(pointLight);

    _lights[uid] = {
      light: pointLight,
      entityId: entityId,
      x: instance.x,
      z: instance.z,
      baseIntensity: lightIntensity,
      radius: lightRadius,
      baseColor: lightColor,
      isCampfire: isCampfire,
      seed: seed,
      baseY: 1.8,
      mesh: null,
      meshChecked: false
    };
  }

  function removeFireLight(uid) {
    if (_lights[uid]) {
      GameScene.getScene().remove(_lights[uid].light);
      _lights[uid].light.dispose();
      delete _lights[uid];
    }
  }

  function resetLightCoverageCache() {
    _lightCoverageCache = Object.create(null);
  }

  function pushLightSource(target, index, x, z, radius, sourceUid, sourceType, entityId, isCampfire, intensity, label) {
    var entry = target[index];
    if (!entry) {
      entry = {};
      target[index] = entry;
    }

    entry.x = x;
    entry.z = z;
    entry.radius = radius;
    entry.sourceUid = sourceUid;
    entry.sourceType = sourceType;
    entry.entityId = entityId;
    entry.isCampfire = isCampfire;
    entry.intensity = intensity;
    entry.label = label;
    return entry;
  }

  function getFlameMeshParts(mesh) {
    if (!mesh) return null;
    if (mesh.userData && mesh.userData.fireParts) {
      return mesh.userData.fireParts;
    }

    var parts = {
      outer: [],
      inner: [],
      glow: [],
      ember: []
    };

    mesh.traverse(function (obj) {
      if (!obj || !obj.isMesh) return;
      var name = obj.name || '';
      if (name === 'flameOuter' || name === 'torchFlame') {
        parts.outer.push(obj);
      } else if (name === 'flameInner' || name === 'torchFlameInner') {
        parts.inner.push(obj);
      } else if (name === 'flameGlow' || name === 'torchGlow') {
        parts.glow.push(obj);
      } else if (name.indexOf('ember') === 0 || name === 'ember') {
        parts.ember.push(obj);
      }
    });

    mesh.userData = mesh.userData || {};
    mesh.userData.fireParts = parts;
    return parts;
  }

  function update(dt) {
    if (typeof DayNightSystem === 'undefined') return;
    if (typeof GameState === 'undefined') return;

    var darkness = DayNightSystem.getDarkness();
    var t = performance.now() * 0.001;

    _lightSourceCount = 0;
    _activeLightSourceCount = 0;
    _playerTorchLightInfo = null;
    resetLightCoverageCache();

    for (var uid in _lights) {
      var fire = _lights[uid];
      if (!fire.light) continue;

      var instance = GameState.getInstance(uid);
      if (!instance) {
        removeFireLight(uid);
        continue;
      }

      var balance = GameRegistry.getBalance(instance.entityId);
      if (!balance) continue;

      var lightRadius = fire.radius || balance.lightRadius || 0;
      if (lightRadius > 0) {
        pushLightSource(
          _lightSources,
          _lightSourceCount++,
          fire.x,
          fire.z,
          lightRadius,
          uid,
          fire.isCampfire ? 'campfire' : 'light',
          instance.entityId,
          !!fire.isCampfire,
          1,
          fire.isCampfire ? 'Campfire coverage' : 'Light coverage'
        );
      }

      var fuel = GameState.getFireFuel ? GameState.getFireFuel(uid) : null;
      var maxFuel = balance.fuelCapacity || 999;
      var currentFuel = (fuel !== null && fuel !== undefined) ? fuel : maxFuel;
      var hasFuel = currentFuel > 0;

      var fuelRatio = hasFuel ? Math.min(1.0, currentFuel / Math.max(1, maxFuel) * 3) : 0;
      var seed = fire.seed;

      var flicker;
      if (fire.isCampfire) {
        flicker = Math.sin(t * 2.0 + seed) * 0.07 +
                  Math.sin(t * 4.5 + seed * 1.3) * 0.05 +
                  Math.sin(t * 8.0 + seed * 0.7) * 0.03 +
                  Math.sin(t * 13.0 + seed * 2.1) * 0.015 +
                  Math.sin(t * 1.2 + seed * 0.3) * 0.05;
      } else {
        flicker = Math.sin(t * 4.0 + seed) * 0.10 +
                  Math.sin(t * 8.0 + seed * 1.7) * 0.06 +
                  Math.sin(t * 15.0 + seed * 0.5) * 0.04 +
                  Math.sin(t * 23.0 + seed * 2.3) * 0.02 +
                  Math.sin(t * 35.0 + seed * 3.1) * 0.015;
      }

      var dipPhase = ((t * 0.7 + seed * 7.3) % 5.0);
      if (dipPhase < 0.25) {
        var dipAmount = 1.0 - 0.25 * Math.sin(dipPhase / 0.25 * Math.PI);
        flicker *= dipAmount;
      }

      if (darkness > 0.05 && hasFuel) {
        var intensityScale = Math.min(1.0, darkness * 2.5) * fuelRatio;

        if (lightRadius > 0) {
          pushLightSource(
            _activeLightSources,
            _activeLightSourceCount++,
            fire.x,
            fire.z,
            lightRadius,
            uid,
            fire.isCampfire ? 'campfire' : 'light',
            instance.entityId,
            !!fire.isCampfire,
            intensityScale,
            fire.isCampfire ? 'Campfire coverage' : 'Light coverage'
          );
        }

        var finalIntensity = fire.baseIntensity * intensityScale * (1.0 + flicker);
        fire.light.intensity = Math.max(0, finalIntensity);

        var colorShift = Math.sin(t * 3.0 + seed * 1.5) * 0.5 + 0.5;
        if (colorShift < 0.5) {
          _fireColor.lerpColors(_deepOrange, _warmOrange, colorShift * 2);
        } else {
          _fireColor.lerpColors(_warmOrange, _warmYellow, (colorShift - 0.5) * 2);
        }
        fire.light.color.copy(_fireColor);

        var yJitter;
        if (fire.isCampfire) {
          yJitter = Math.sin(t * 3.0 + seed) * 0.12 + Math.sin(t * 6.0 + seed * 1.3) * 0.06;
        } else {
          yJitter = Math.sin(t * 5.0 + seed) * 0.15 + Math.sin(t * 10.0 + seed * 1.3) * 0.08;
        }
        fire.light.position.y = fire.baseY + yJitter;
      } else {
        fire.light.intensity = 0;
      }

      if (!fire.meshChecked) {
        fire.meshChecked = true;
        var scene = GameScene.getScene();
        for (var i = 0; i < scene.children.length; i++) {
          var child = scene.children[i];
          if (child.userData && child.userData.instanceUid === uid) {
            fire.mesh = child;
            break;
          }
        }
      }

      if (fire.mesh) {
        if (hasFuel) {
          animateFlameMesh(fire.mesh, t, seed, flicker, fuelRatio, darkness);
          // Ember particles
          if (typeof ParticleSystem !== 'undefined' && darkness > 0.3) {
            if (Math.random() < (fire.isCampfire ? 0.025 : 0.01)) {
              ParticleSystem.emit('fireEmber', {x: fire.x, y: fire.baseY, z: fire.z});
            }
          }
        } else {
          hideFlameMesh(fire.mesh);
        }
      }
    }

    _lightSources.length = _lightSourceCount;
    _activeLightSources.length = _activeLightSourceCount;

    updatePlayerTorch(dt, darkness, t);
  }

  function animateFlameMesh(mesh, t, seed, flicker, fuelRatio, darkness) {
    var visibleScale = Math.max(0.3, Math.min(1.0, darkness * 3)) * fuelRatio;

    var parts = getFlameMeshParts(mesh);
    if (!parts) return;

    for (var i = 0; i < parts.outer.length; i++) {
      var outer = parts.outer[i];
      if (outer.userData.baseScaleY === undefined) {
        outer.userData.baseScaleY = outer.scale.y;
        outer.userData.baseScaleX = outer.scale.x;
        outer.userData.baseScaleZ = outer.scale.z;
      }
      var sf = 1.0 + flicker * 2.5;
      outer.scale.y = outer.userData.baseScaleY * sf * visibleScale;
      outer.scale.x = outer.userData.baseScaleX * (1.0 + flicker * 0.5) * visibleScale;
      outer.scale.z = outer.userData.baseScaleZ * (1.0 + flicker * 0.5) * visibleScale;
      outer.rotation.z = Math.sin(t * 8.0 + seed) * 0.08;
      outer.rotation.x = Math.sin(t * 6.0 + seed * 0.7) * 0.05;
      outer.material.opacity = (0.85 * visibleScale + 0.1);
    }

    for (var j = 0; j < parts.inner.length; j++) {
      var inner = parts.inner[j];
      if (inner.userData.baseScaleY === undefined) {
        inner.userData.baseScaleY = inner.scale.y;
      }
      var innerFlicker = flicker * 2.0;
      inner.scale.y = inner.userData.baseScaleY * (1.0 + innerFlicker) * visibleScale;
      inner.material.opacity = (0.8 * visibleScale + 0.15);
    }

    for (var glowIndex = 0; glowIndex < parts.glow.length; glowIndex++) {
      var glow = parts.glow[glowIndex];
      var glowPulse = 0.5 + 0.5 * Math.sin(t * 4.0 + seed);
      glow.material.opacity = glowPulse * visibleScale * 0.35 + 0.05;
      var glowScale = (0.85 + 0.2 * Math.sin(t * 3.5 + seed * 1.2)) * visibleScale;
      glow.scale.set(glowScale, glowScale, glowScale);
    }

    for (var emberIndex = 0; emberIndex < parts.ember.length; emberIndex++) {
      var ember = parts.ember[emberIndex];
      if (ember.userData.baseY !== undefined) {
        ember.position.y = ember.userData.baseY + Math.sin(t * 2.0 + ember.userData.emberPhase) * 0.04;
      }
      ember.material.opacity = (0.4 + 0.5 * Math.abs(Math.sin(t * 5.0 + (ember.userData.emberPhase || 0)))) * visibleScale;
    }
  }

  function hideFlameMesh(mesh) {
    var parts = getFlameMeshParts(mesh);
    if (!parts) return;

    var groups = [parts.outer, parts.inner, parts.glow, parts.ember];
    for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      var group = groups[groupIndex];
      for (var itemIndex = 0; itemIndex < group.length; itemIndex++) {
        group[itemIndex].material.opacity = 0;
      }
    }
  }

  function updatePlayerTorch(dt, darkness, t) {
    if (typeof GamePlayer === 'undefined') return;

    var hasActiveTorch = GamePlayer.hasTorchLight && GamePlayer.hasTorchLight();
    _playerTorchLightInfo = null;

    if (hasActiveTorch) {
      if (!_playerTorchLight) {
        _playerTorchLight = new THREE.PointLight(0xFFA500, 0, 16);
        _playerTorchLight.decay = 1.2;
        _playerTorchLight.castShadow = false;
        GameScene.getScene().add(_playerTorchLight);
      }

      var pos = GamePlayer.getPosition();

      if (darkness > 0.05) {
        var torchBalance = GameRegistry.getBalance("item.handheld_torch") || {};
        var baseInt = torchBalance.lightIntensity || 2.0;

        var intensityScale = Math.min(1.0, darkness * 2.5);

        var flicker = Math.sin(t * 4.5) * 0.10 +
                      Math.sin(t * 9.0) * 0.06 +
                      Math.sin(t * 16.0) * 0.04 +
                      Math.sin(t * 25.0) * 0.02 +
                      Math.sin(t * 37.0) * 0.015;

        var dipPhase = (t * 0.8) % 4.5;
        if (dipPhase < 0.2) {
          intensityScale = intensityScale * (1.0 - 0.25 * Math.sin(dipPhase / 0.2 * Math.PI));
        }

        var finalIntensity = baseInt * intensityScale * (1.0 + flicker);
        _playerTorchLight.intensity = Math.max(0, finalIntensity);

        _playerTorchLightInfo = {
          x: pos.x,
          z: pos.z,
          radius: torchBalance.lightRadius || 6,
          intensity: intensityScale,
          sourceUid: 'player_torch',
          sourceType: 'torch',
          entityId: 'item.handheld_torch',
          isCampfire: false,
          label: 'Torch coverage'
        };

        var cs = Math.sin(t * 3.5) * 0.5 + 0.5;
        if (cs < 0.5) {
          _torchColor.lerpColors(_deepOrange, _warmOrange, cs * 2);
        } else {
          _torchColor.lerpColors(_warmOrange, _warmYellow, (cs - 0.5) * 2);
        }
        _playerTorchLight.color.copy(_torchColor);

        var yJitter = Math.sin(t * 5.0) * 0.12 + Math.sin(t * 10.0) * 0.06;
        _playerTorchLight.position.set(pos.x, 1.6 + yJitter, pos.z);

        if (GamePlayer.updateTorchFlame) {
          GamePlayer.updateTorchFlame(t, flicker);
        }
      } else {
        _playerTorchLight.intensity = 0;
        _playerTorchLight.position.set(pos.x, 1.6, pos.z);
      }
    } else if (_playerTorchLight) {
      GameScene.getScene().remove(_playerTorchLight);
      _playerTorchLight.dispose();
      _playerTorchLight = null;
    }
  }

  function addFire(uid, instance) {
    createFireLight(uid, instance);
  }

  function removeFire(uid) {
    removeFireLight(uid);
  }

  function getFireLights() {
    return _lights;
  }

  function isNightLightActive() {
    return (typeof DayNightSystem !== 'undefined') && DayNightSystem.isNight();
  }

  function getLightCoverageAt(worldX, worldZ, options) {
    options = options || {};

    var requireActive = options.requireActive !== false;
    var includePlayerTorch = !!options.includePlayerTorch;
    var nightActive = isNightLightActive();
    var cacheKey = (requireActive ? '1' : '0') + '|' + (includePlayerTorch ? '1' : '0') + '|' + Math.round(worldX * 10) + '|' + Math.round(worldZ * 10);
    var cached = _lightCoverageCache[cacheKey];
    if (cached) return cached;

    var bestMatch = {
      lit: false,
      distance: Infinity,
      radius: 0,
      sourceUid: null,
      sourceType: null,
      entityId: null,
      isCampfire: false,
      label: requireActive ? 'Outside active light' : 'Outside light radius'
    };

    if (requireActive && !nightActive) {
      bestMatch.label = 'Daytime';
      _lightCoverageCache[cacheKey] = bestMatch;
      return bestMatch;
    }

    var sources = requireActive ? _activeLightSources : _lightSources;
    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      if (!source || source.radius <= 0) continue;

      var dx = source.x - worldX;
      var dz = source.z - worldZ;
      var distanceSq = dx * dx + dz * dz;
      if (distanceSq > (source.radius * source.radius) || distanceSq >= (bestMatch.distance * bestMatch.distance)) continue;

      var distance = Math.sqrt(distanceSq);

      bestMatch = {
        lit: true,
        distance: distance,
        radius: source.radius,
        sourceUid: source.sourceUid,
        sourceType: source.sourceType,
        entityId: source.entityId,
        isCampfire: !!source.isCampfire,
        label: source.label
      };
    }

    if (includePlayerTorch && _playerTorchLightInfo) {
      var torchDx = _playerTorchLightInfo.x - worldX;
      var torchDz = _playerTorchLightInfo.z - worldZ;
      var torchDistance = Math.sqrt(torchDx * torchDx + torchDz * torchDz);

      if (torchDistance <= _playerTorchLightInfo.radius && torchDistance < bestMatch.distance) {
        bestMatch = {
          lit: true,
          distance: torchDistance,
          radius: _playerTorchLightInfo.radius,
          sourceUid: _playerTorchLightInfo.sourceUid,
          sourceType: _playerTorchLightInfo.sourceType,
          entityId: _playerTorchLightInfo.entityId,
          isCampfire: false,
          label: _playerTorchLightInfo.label
        };
      }
    }

    _lightCoverageCache[cacheKey] = bestMatch;
    return bestMatch;
  }

  function isPositionLit(worldX, worldZ, options) {
    return !!getLightCoverageAt(worldX, worldZ, options).lit;
  }

  function getActiveFires() {
    _activeFireCount = 0;

    function pushActiveFire(x, z, radius, intensity, isCampfire) {
      var entry = _activeFires[_activeFireCount];
      if (!entry) {
        entry = {};
        _activeFires[_activeFireCount] = entry;
      }
      entry.x = x;
      entry.z = z;
      entry.radius = radius;
      entry.intensity = intensity;
      entry.isCampfire = isCampfire;
      _activeFireCount += 1;
    }

    for (var i = 0; i < _activeLightSourceCount; i++) {
      var source = _activeLightSources[i];
      if (!source || source.intensity <= 0) continue;
      pushActiveFire(source.x, source.z, source.radius * 0.8, source.intensity, source.isCampfire);
    }

    if (_playerTorchLightInfo && _playerTorchLightInfo.intensity > 0) {
      pushActiveFire(_playerTorchLightInfo.x, _playerTorchLightInfo.z, _playerTorchLightInfo.radius, _playerTorchLightInfo.intensity, false);
    }

    _activeFires.length = _activeFireCount;
    return _activeFires;
  }

  return {
    init: init,
    update: update,
    addFire: addFire,
    removeFire: removeFire,
    getFireLights: getFireLights,
    getLightCoverageAt: getLightCoverageAt,
    isPositionLit: isPositionLit,
    getActiveFires: getActiveFires
  };
})();