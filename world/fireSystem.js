window.FireSystem = (function () {
  var _lights = {};
  var _playerTorchLight = null;

  function hashUid(uid) {
    var hash = 0;
    for (var i = 0; i < uid.length; i++) {
      hash = ((hash << 5) - hash) + uid.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }

  function init() {
    var instances = GameState.getAllInstances();
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

    var pointLight = new THREE.PointLight(lightColor, 0, lightRadius * 2);
    pointLight.position.set(instance.x, 1.8, instance.z);
    pointLight.decay = 2;
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

  function update(dt) {
    if (typeof DayNightSystem === 'undefined') return;
    if (typeof GameState === 'undefined') return;

    var darkness = DayNightSystem.getDarkness();
    var t = performance.now() * 0.001;

    var warmOrange = new THREE.Color(0xFF8C00);
    var warmYellow = new THREE.Color(0xFFD700);
    var deepOrange = new THREE.Color(0xFF6600);
    var fireColor = new THREE.Color();

    for (var uid in _lights) {
      var fire = _lights[uid];
      if (!fire.light) continue;

      var instance = GameState.getInstance(uid);
      if (!instance) {
        removeFireLight(uid);
        continue;
      }

      var balance = GameRegistry.getBalance(instance.entityId);
      var fuel = GameState.getFireFuel ? GameState.getFireFuel(uid) : null;
      var maxFuel = balance ? (balance.fuelCapacity || 999) : 999;
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

        var finalIntensity = fire.baseIntensity * intensityScale * (1.0 + flicker);
        fire.light.intensity = Math.max(0, finalIntensity);

        var colorShift = Math.sin(t * 3.0 + seed * 1.5) * 0.5 + 0.5;
        if (colorShift < 0.5) {
          fireColor.lerpColors(deepOrange, warmOrange, colorShift * 2);
        } else {
          fireColor.lerpColors(warmOrange, warmYellow, (colorShift - 0.5) * 2);
        }
        fire.light.color.copy(fireColor);

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
        } else {
          hideFlameMesh(fire.mesh);
        }
      }
    }

    updatePlayerTorch(dt, darkness, t);
  }

  function animateFlameMesh(mesh, t, seed, flicker, fuelRatio, darkness) {
    var visibleScale = Math.max(0.3, Math.min(1.0, darkness * 3)) * fuelRatio;

    mesh.traverse(function (obj) {
      if (!obj.isMesh) return;
      var name = obj.name || '';

      if (name === 'flameOuter' || name === 'torchFlame') {
        if (obj.userData.baseScaleY === undefined) {
          obj.userData.baseScaleY = obj.scale.y;
          obj.userData.baseScaleX = obj.scale.x;
          obj.userData.baseScaleZ = obj.scale.z;
        }
        var sf = 1.0 + flicker * 2.5;
        obj.scale.y = obj.userData.baseScaleY * sf * visibleScale;
        obj.scale.x = obj.userData.baseScaleX * (1.0 + flicker * 0.5) * visibleScale;
        obj.scale.z = obj.userData.baseScaleZ * (1.0 + flicker * 0.5) * visibleScale;
        obj.rotation.z = Math.sin(t * 8.0 + seed) * 0.08;
        obj.rotation.x = Math.sin(t * 6.0 + seed * 0.7) * 0.05;
        obj.material.opacity = (0.85 * visibleScale + 0.1);
      }

      if (name === 'flameInner' || name === 'torchFlameInner') {
        if (obj.userData.baseScaleY === undefined) {
          obj.userData.baseScaleY = obj.scale.y;
        }
        var innerFlicker = flicker * 2.0;
        obj.scale.y = obj.userData.baseScaleY * (1.0 + innerFlicker) * visibleScale;
        obj.material.opacity = (0.8 * visibleScale + 0.15);
      }

      if (name === 'flameGlow' || name === 'torchGlow') {
        var glowPulse = 0.5 + 0.5 * Math.sin(t * 4.0 + seed);
        obj.material.opacity = glowPulse * visibleScale * 0.35 + 0.05;
        var glowScale = (0.85 + 0.2 * Math.sin(t * 3.5 + seed * 1.2)) * visibleScale;
        obj.scale.set(glowScale, glowScale, glowScale);
      }

      if (name.indexOf('ember') === 0 || name === 'ember') {
        if (obj.userData.baseY !== undefined) {
          obj.position.y = obj.userData.baseY + Math.sin(t * 2.0 + obj.userData.emberPhase) * 0.04;
        }
        obj.material.opacity = (0.4 + 0.5 * Math.abs(Math.sin(t * 5.0 + (obj.userData.emberPhase || 0)))) * visibleScale;
      }
    });
  }

  function hideFlameMesh(mesh) {
    mesh.traverse(function (obj) {
      if (!obj.isMesh) return;
      var name = obj.name || '';
      if (name === 'flameOuter' || name === 'torchFlame' ||
          name === 'flameInner' || name === 'torchFlameInner' ||
          name === 'flameGlow' || name === 'torchGlow') {
        obj.material.opacity = 0;
      }
      if (name.indexOf('ember') === 0 || name === 'ember') {
        obj.material.opacity = 0;
      }
    });
  }

  function updatePlayerTorch(dt, darkness, t) {
    if (typeof GamePlayer === 'undefined') return;

    var hasActiveTorch = GamePlayer.hasTorchLight && GamePlayer.hasTorchLight();

    if (hasActiveTorch) {
      if (!_playerTorchLight) {
        _playerTorchLight = new THREE.PointLight(0xFFA500, 0, 16);
        _playerTorchLight.decay = 2;
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

        var warmOrangePT = new THREE.Color(0xFF8C00);
        var warmYellowPT = new THREE.Color(0xFFD700);
        var deepOrangePT = new THREE.Color(0xFF6600);
        var torchColor = new THREE.Color();
        var cs = Math.sin(t * 3.5) * 0.5 + 0.5;
        if (cs < 0.5) {
          torchColor.lerpColors(deepOrangePT, warmOrangePT, cs * 2);
        } else {
          torchColor.lerpColors(warmOrangePT, warmYellowPT, (cs - 0.5) * 2);
        }
        _playerTorchLight.color.copy(torchColor);

        var yJitter = Math.sin(t * 5.0) * 0.15 + Math.sin(t * 10.0) * 0.08;
        _playerTorchLight.position.set(pos.x, 1.8 + yJitter, pos.z);

        if (GamePlayer.updateTorchFlame) {
          GamePlayer.updateTorchFlame(t, flicker);
        }
      } else {
        _playerTorchLight.intensity = 0;
        _playerTorchLight.position.set(pos.x, 1.8, pos.z);
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

  return {
    init: init,
    update: update,
    addFire: addFire,
    removeFire: removeFire,
    getFireLights: getFireLights
  };
})();