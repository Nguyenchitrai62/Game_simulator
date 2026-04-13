window.GamePlayer = (function () {
  var mesh;
  var _x = 8, _z = 8;
  var _moving = false;
  var _direction = { x: 0, z: 1 };
  var _keys = {};
  var _animTime = 0;
  var _lastCombatTime = 0;
  var _regenAccumulator = 0;

  // Eating state - MANUAL only, press F to eat
  var _isEating = false;
  var _eatTimer = 0;

  // Handheld torch state
  var _torchActive = false;
  var _torchFuel = 0;
  var _torchMesh = null; // 3D torch visible on hand

  function init(startX, startZ) {
    _x = startX || 8;
    _z = startZ || 8;

    var group = new THREE.Group();

    // Body
    var bodyGeo = new THREE.BoxGeometry(0.4, 0.5, 0.3);
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0x4488cc });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // Head
    var headGeo = new THREE.SphereGeometry(0.18, 8, 8);
    var headMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.98;
    head.castShadow = true;
    group.add(head);

    // Left arm
    var armGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
    var armMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
    var leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.3, 0.55, 0);
    leftArm.castShadow = true;
    leftArm.name = "leftArm";
    group.add(leftArm);

    // Right arm
    var rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.3, 0.55, 0);
    rightArm.castShadow = true;
    rightArm.name = "rightArm";
    group.add(rightArm);

    // Left leg
    var legGeo = new THREE.BoxGeometry(0.14, 0.35, 0.14);
    var legMat = new THREE.MeshLambertMaterial({ color: 0x3a3a5c });
    var leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.12, 0.17, 0);
    leftLeg.castShadow = true;
    leftLeg.name = "leftLeg";
    group.add(leftLeg);

    // Right leg
    var rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.12, 0.17, 0);
    rightLeg.castShadow = true;
    rightLeg.name = "rightLeg";
    group.add(rightLeg);

    // Shadow circle
    var shadowGeo = new THREE.CircleGeometry(0.3, 16);
    var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
    var shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    group.position.set(_x, 0, _z);
    mesh = group;
    GameScene.getScene().add(mesh);

    // Input handlers
    document.addEventListener('keydown', function (e) {
      _keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'e') interactNearby();
      if (e.key.toLowerCase() === 'f') startEat();
      if (e.key.toLowerCase() === 'b') {
        if (GameHUD.isModalActive()) {
          GameHUD.closeModal();
        } else {
          GameHUD.openModal();
        }
      }
      if (e.key.toLowerCase() === 'm') {
        if (typeof MiniMap !== 'undefined') MiniMap.toggleMap();
      }
      if (e.key === 'Escape') {
        if (typeof MiniMap !== 'undefined' && MiniMap.isMapOpen()) {
          MiniMap.toggleMap();
        } else {
          GameHUD.closeModal();
        }
      }
    });
    document.addEventListener('keyup', function (e) {
      _keys[e.key.toLowerCase()] = false;
    });

    // Click to move/interact
    document.getElementById('game-canvas').addEventListener('click', onCanvasClick);
    document.getElementById('game-canvas').addEventListener('wheel', function (e) {
      GameScene.setZoom(e.deltaY > 0 ? 1 : -1);
    });
  }

  function onCanvasClick(event) {
    if (event.target.id !== 'game-canvas') return;

    if (window.BuildingSystem && BuildingSystem.isBuildMode()) return;

    var mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, GameScene.getCamera());

    var objectMeshes = GameEntities.getAllMeshes();
    var intersects = raycaster.intersectObjects(objectMeshes, true);
    if (intersects.length > 0) {
      var objData = GameEntities.getDataFromMesh(intersects[0].object);
      if (objData) {
        var entity = GameRegistry.getEntity(objData.type);
        var name = entity ? entity.name : objData.type;
        if (objData.type.startsWith('animal.')) {
          var balance = GameRegistry.getBalance(objData.type);
          var info = name + ' | HP: ' + objData.hp + '/' + objData.maxHp;
          if (balance) info += ' | ATK: ' + (balance.attack || 0) + ' DEF: ' + (balance.defense || 0);
          GameHUD.showNotification(info);
        } else if (objData.type.startsWith('node.')) {
          GameHUD.showNotification(name + ' | HP: ' + objData.hp + '/' + objData.maxHp);
        }
      }
    }
  }

  // === MANUAL EAT: press F or click Eat button ===
  function startEat() {
    if (_isEating) return; // already eating

    var foodAmount = GameState.getResource("resource.food");
    if (foodAmount < 1) {
      if (typeof GameHUD !== 'undefined') GameHUD.showNotification("Không có food!");
      return;
    }

    var currentHunger = GameState.getHunger();
    var maxHunger = GameState.getMaxHunger();
    if (currentHunger >= maxHunger) {
      if (typeof GameHUD !== 'undefined') GameHUD.showNotification("Đã no!");
      return;
    }

    // Consume 1 food, start eating
    GameState.removeResource("resource.food", 1);
    var balance = window.GAME_BALANCE || {};
    var hungerConfig = balance.hunger || {};
    _isEating = true;
    _eatTimer = hungerConfig.eatDuration || 1.0;

    if (typeof GameHUD !== 'undefined') GameHUD.showNotification("Đang ăn... (1s)");
  }

  function update(dt) {
    _animTime += dt;
    var moved = false;

    var _speed = GameState.getPlayerSpeed ? GameState.getPlayerSpeed() : 3;

    // Speed penalty when very hungry (hunger < 20)
    var hunger = GameState.getHunger ? GameState.getHunger() : 100;
    if (hunger < 20) {
      var hungerBalance = (window.GAME_BALANCE && GAME_BALANCE.hunger) || {};
      _speed *= (hungerBalance.hungrySpeedMult || 0.5);
    }

    // Speed penalty while eating
    if (_isEating) {
      var hungerBalance2 = (window.GAME_BALANCE && GAME_BALANCE.hunger) || {};
      _speed *= (hungerBalance2.eatSpeedMult || 0.5);
    }

    // === EATING SYSTEM ===
    updateEating(dt);

    // === TORCH SYSTEM ===
    updateTorch(dt);

    // === HP REGENERATION ===
    var isInCombat = (window.GameCombat && GameCombat.isActive && GameCombat.isActive());
    if (isInCombat) {
      _lastCombatTime = _animTime;
      _regenAccumulator = 0;
    } else {
      var timeSinceCombat = _animTime - _lastCombatTime;
      if (timeSinceCombat > 3) {
        _regenAccumulator += dt;
        if (_regenAccumulator >= 1.0 && !(GameState.isStarving && GameState.isStarving())) {
          _regenAccumulator = 0;
          var player = GameState.getPlayer();
          var maxHp = GameState.getPlayerMaxHp();
          if (player.hp < maxHp) {
            GameState.setPlayerHP(Math.min(maxHp, player.hp + 1));
          }
        }
      }
    }

    // Screen-space input
    var screenDx = 0, screenDy = 0;
    if (_keys['w'] || _keys['arrowup']) { screenDy -= 1; moved = true; }
    if (_keys['s'] || _keys['arrowdown']) { screenDy += 1; moved = true; }
    if (_keys['a'] || _keys['arrowleft']) { screenDx -= 1; moved = true; }
    if (_keys['d'] || _keys['arrowright']) { screenDx += 1; moved = true; }

    var dx = screenDx + screenDy;
    var dz = -screenDx + screenDy;

    if (moved) {
      var len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) { dx /= len; dz /= len; }
      _direction.x = dx;
      _direction.z = dz;

      var speedMultiplier = 1.0;
      if (GameTerrain.isShallowWater && GameTerrain.isShallowWater(_x, _z)) {
        speedMultiplier = 0.5;
      }

      var newX = _x + dx * _speed * speedMultiplier * dt;
      var newZ = _z + dz * _speed * speedMultiplier * dt;

      if (GameTerrain.isWalkable(newX, newZ)) {
        _x = newX;
        _z = newZ;
      } else if (GameTerrain.isWalkable(newX, _z)) {
        _x = newX;
      } else if (GameTerrain.isWalkable(_x, newZ)) {
        _z = newZ;
      }
    }

    if (GameState && GameState.setPlayerPosition) {
      GameState.setPlayerPosition(_x, _z);
    }

    if (mesh) {
      mesh.position.x += (_x - mesh.position.x) * 0.3;
      mesh.position.z += (_z - mesh.position.z) * 0.3;

      if (moved) {
        var targetAngle = Math.atan2(_direction.x, _direction.z) + Math.PI;
        var angleDiff = targetAngle - mesh.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        mesh.rotation.y += angleDiff * 0.2;
      }

      // Walking animation
      if (moved) {
        var swing = Math.sin(_animTime * 10) * 0.4;
        mesh.children.forEach(function (child) {
          if (child.name === "leftArm") child.rotation.x = swing;
          if (child.name === "rightArm") child.rotation.x = _torchActive ? 0 : -swing; // Hold torch up
          if (child.name === "leftLeg") child.rotation.x = -swing * 0.6;
          if (child.name === "rightLeg") child.rotation.x = swing * 0.6;
        });
      } else {
        mesh.children.forEach(function (child) {
          if (child.name === "rightArm" && _torchActive) return; // Keep arm up with torch
          if (child.name) child.rotation.x *= 0.85;
        });
      }

      // Update torch 3D mesh position (attached to right arm)
      if (_torchMesh) {
        var rightArmObj = null;
        for (var i = 0; i < mesh.children.length; i++) {
          if (mesh.children[i].name === "rightArm") { rightArmObj = mesh.children[i]; break; }
        }
        if (rightArmObj) {
          var armWorldPos = new THREE.Vector3();
          rightArmObj.getWorldPosition(armWorldPos);
          _torchMesh.position.set(armWorldPos.x, armWorldPos.y + 0.3, armWorldPos.z);
        }
      }
    }

    GameTerrain.update(_x, _z);
    updateContextAction();
  }

  function updateEating(dt) {
    if (!_isEating) return;

    _eatTimer -= dt;
    if (_eatTimer <= 0) {
      // Eating complete - restore hunger
      var balance = window.GAME_BALANCE || {};
      var hungerConfig = balance.hunger || {};
      var foodRestore = (hungerConfig.foodRestore || {})[("resource.food")] || 5;
      var currentHunger = GameState.getHunger();
      GameState.setHunger(Math.min(currentHunger + foodRestore, GameState.getMaxHunger()));
      _isEating = false;
      _eatTimer = 0;
    }
  }

  function updateTorch(dt) {
    var isDark = typeof DayNightSystem !== 'undefined' && DayNightSystem.getDarkness() > 0.3;

    if (_torchActive) {
      if (isDark) {
        _torchFuel -= dt;
      }
      if (_torchFuel <= 0) {
        _torchActive = false;
        _torchFuel = 0;
        removeTorchMesh();
        if (typeof GameHUD !== 'undefined') {
          GameHUD.showNotification("Đuốc đã cháy hết!");
        }
      }
    }

    // Activate torch if dark and has one in inventory
    if (!_torchActive && isDark) {
      var torchCount = GameState.getInventoryCount("item.handheld_torch");
      if (torchCount > 0) {
        GameState.removeFromInventory("item.handheld_torch", 1);
        var torchBalance = GameRegistry.getBalance("item.handheld_torch") || {};
        _torchFuel = torchBalance.duration || 60;
        _torchActive = true;
        createTorchMesh();
        if (typeof GameHUD !== 'undefined') {
          GameHUD.showNotification("Đuốc tay đã bật! (" + Math.floor(_torchFuel) + "s)");
        }
      }
    }

    // Remove torch mesh during daytime
    if (!_torchActive && _torchMesh) {
      removeTorchMesh();
    }
  }

  function createTorchMesh() {
    if (_torchMesh) return;

    var torchGroup = new THREE.Group();

    // Stick
    var stickGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 6);
    var stickMat = new THREE.MeshLambertMaterial({ color: 0x6B3410 });
    var stick = new THREE.Mesh(stickGeo, stickMat);
    torchGroup.add(stick);

    // Cloth wrapping at top
    var wrapGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.08, 6);
    var wrapMat = new THREE.MeshLambertMaterial({ color: 0xC4A882 });
    var wrap = new THREE.Mesh(wrapGeo, wrapMat);
    wrap.position.y = 0.22;
    torchGroup.add(wrap);

    // Flame tip (outer)
    var flameGeo = new THREE.ConeGeometry(0.05, 0.18, 6);
    var flameMat = new THREE.MeshBasicMaterial({ color: 0xFF8C00, transparent: true, opacity: 0.85 });
    var flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.33;
    flame.name = 'torchFlame';
    torchGroup.add(flame);

    // Flame inner (bright core)
    var innerGeo = new THREE.ConeGeometry(0.025, 0.1, 6);
    var innerMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44, transparent: true, opacity: 0.75 });
    var inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 0.3;
    inner.name = 'torchFlameInner';
    torchGroup.add(inner);

    // Glow sphere around flame
    var glowGeo = new THREE.SphereGeometry(0.15, 8, 6);
    var glowMat = new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    var glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.33;
    glow.name = 'torchGlow';
    torchGroup.add(glow);

    torchGroup.name = 'handheldTorch';
    _torchMesh = torchGroup;
    GameScene.getScene().add(_torchMesh);
  }

  function removeTorchMesh() {
    if (!_torchMesh) return;
    GameScene.getScene().remove(_torchMesh);
    _torchMesh = null;
  }

  function updateContextAction() {
    var nearObj = GameTerrain.findNearestObject(_x, _z, 2.5);
    var el = document.getElementById('context-action');
    var textEl = document.getElementById('context-text');

    var nearBuilding = findNearestBuilding(_x, _z, 2.5);
    if (nearBuilding) {
      var storage = GameState.getBuildingStorage(nearBuilding.uid);
      var hasResources = false;
      var totalAmount = 0;
      for (var resId in storage) {
        if (storage[resId] > 0) {
          hasResources = true;
          totalAmount += storage[resId];
        }
      }

      if (hasResources) {
        var entity = GameRegistry.getEntity(nearBuilding.entityId);
        var name = entity ? entity.name : nearBuilding.entityId;
        textEl.textContent = "Collect from " + name + " (" + totalAmount + " items)";
        el.classList.add('show');
        GameHUD.hideObjectHpBar();
        return;
      }
    }

    if (nearObj && nearObj.hp > 0) {
      var entity = GameRegistry.getEntity(nearObj.type);
      var name = entity ? entity.name : nearObj.type;
      var action = nearObj.type.startsWith("animal.") ? "Fight" : nearObj.type === "node.berry_bush" ? "Gather" : nearObj.type.startsWith("node.") ? "Harvest" : "Interact";
      textEl.textContent = action + " " + name + " (" + nearObj.hp + "/" + nearObj.maxHp + ")";
      el.classList.add('show');
      if (typeof GameHUD !== 'undefined' && GameHUD.showObjectHpBar) GameHUD.showObjectHpBar(nearObj);
    } else {
      el.classList.remove('show');
      if (typeof GameHUD !== 'undefined' && GameHUD.hideObjectHpBar) GameHUD.hideObjectHpBar();
    }
  }

  function interactNearby() {
    var nearBuilding = findNearestBuilding(_x, _z, 2.5);
    if (nearBuilding) {
      var storage = GameState.getBuildingStorage(nearBuilding.uid);
      var hasResources = false;
      for (var resId in storage) {
        if (storage[resId] > 0) {
          hasResources = true;
          break;
        }
      }

      if (hasResources) {
        collectFromBuilding(nearBuilding);
        return;
      }
    }

    var nearObj = GameTerrain.findNearestObject(_x, _z, 2.5);
    if (nearObj && nearObj.hp > 0) {
      interactWith(nearObj);
    }
  }

  function interactWith(objData) {
    if (objData.type.startsWith("animal.")) {
      GameCombat.startCombat(objData);
    } else if (objData.type.startsWith("node.")) {
      harvestNode(objData);
    }
  }

  function findNearestBuilding(px, pz, radius) {
    var instances = GameState.getAllInstances();
    var nearest = null;
    var nearestDist = radius;

    for (var uid in instances) {
      var inst = instances[uid];
      var dx = inst.x - px;
      var dz = inst.z - pz;
      var dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = inst;
      }
    }

    return nearest;
  }

  function collectFromBuilding(buildingInstance) {
    var collected = GameState.collectFromBuilding(buildingInstance.uid);

    var entity = GameRegistry.getEntity(buildingInstance.entityId);
    var buildingName = entity ? entity.name : buildingInstance.entityId;

    var messages = [];
    for (var resId in collected) {
      if (collected[resId] > 0) {
        var resEntity = GameRegistry.getEntity(resId);
        var resName = resEntity ? resEntity.name : resId;
        messages.push("+" + collected[resId] + " " + resName);
      }
    }

    if (messages.length > 0) {
      GameHUD.showSuccess("Collected from " + buildingName + ": " + messages.join(", "));
      UnlockSystem.checkAll();
      GameHUD.renderAll();
    }
  }

  function harvestNode(objData) {
    var balance = GameRegistry.getBalance(objData.type);
    if (!balance) return;

    if (window.NPCSystem && NPCSystem.getActiveHarvestNodes) {
      var activeNodes = NPCSystem.getActiveHarvestNodes();
      var isBeingHarvested = activeNodes.some(function(activeNode) {
        return activeNode.node === objData;
      });

      if (isBeingHarvested) {
        GameHUD.showNotification("An NPC is already harvesting this!");
        return;
      }
    }

    objData.hp--;

    GameHUD.showDamageNumber(objData.worldX, 0.5, objData.worldZ, "HIT (" + Math.max(0, objData.hp) + "/" + objData.maxHp + ")", "damage");
    GameHUD.showObjectHpBar(objData);

    if (objData.hp <= 0 && !objData._destroyed) {
      objData._destroyed = true;

      if (balance.rewards) {
        for (var resId in balance.rewards) {
          var amount = balance.rewards[resId];
          GameState.addResource(resId, amount);
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          GameHUD.showDamageNumber(objData.worldX, 1.2, objData.worldZ, "+" + amount + " " + resName, "loot");
        }
      }

      GameEntities.hideObject(objData);
      UnlockSystem.checkAll();
      GameHUD.renderAll();

      var respawnTime = balance.respawnTime || 30;
      setTimeout(function () {
        if (objData && objData._destroyed) {
          objData.hp = objData.maxHp;
          objData._destroyed = false;
          GameEntities.showObject(objData);
        }
      }, respawnTime * 1000);
    }

    GameHUD.renderAll();
  }

  // === Public API ===
  function isEating() { return _isEating; }
  function isRegenerating() {
    var isInCombat = (window.GameCombat && GameCombat.isActive && GameCombat.isActive());
    return !isInCombat && (_animTime - _lastCombatTime > 3);
  }
  function hasTorchLight() { return _torchActive; }
  function getTorchFuel() { return _torchFuel; }

  function getPosition() {
    return { x: _x, z: _z };
  }

  function setPosition(x, z) {
    _x = x;
    _z = z;
    if (mesh) {
      mesh.position.set(x, 0, z);
    }
    if (GameState && GameState.setPlayerPosition) {
      GameState.setPlayerPosition(x, z);
    }
  }

  function getDirection() {
    return _direction;
  }

  function getMesh() {
    return mesh;
  }

  function updateTorchFlame(t, flicker) {
    if (!_torchMesh) return;
    var flameOuter = _torchMesh.getObjectByName('torchFlame');
    var flameInner = _torchMesh.getObjectByName('torchFlameInner');
    var glow = _torchMesh.getObjectByName('torchGlow');

    if (flameOuter) {
      if (flameOuter.userData.baseScaleY === undefined) {
        flameOuter.userData.baseScaleY = flameOuter.scale.y;
        flameOuter.userData.baseScaleX = flameOuter.scale.x;
        flameOuter.userData.baseScaleZ = flameOuter.scale.z;
      }
      var sf = 1.0 + flicker * 2.5;
      flameOuter.scale.y = flameOuter.userData.baseScaleY * sf;
      flameOuter.scale.x = flameOuter.userData.baseScaleX * (1.0 + flicker * 0.5);
      flameOuter.scale.z = flameOuter.userData.baseScaleZ * (1.0 + flicker * 0.5);
      flameOuter.rotation.z = Math.sin(t * 8.0) * 0.08;
      flameOuter.rotation.x = Math.sin(t * 6.0) * 0.05;
    }
    if (flameInner) {
      if (flameInner.userData.baseScaleY === undefined) {
        flameInner.userData.baseScaleY = flameInner.scale.y;
      }
      flameInner.scale.y = flameInner.userData.baseScaleY * (1.0 + flicker * 2.0);
    }
    if (glow) {
      var gp = 0.5 + 0.5 * Math.sin(t * 4.0);
      glow.material.opacity = gp * 0.25 + 0.05;
      var gs = 0.85 + 0.2 * Math.sin(t * 3.5);
      glow.scale.set(gs, gs, gs);
    }
  }

  return {
    init: init,
    update: update,
    getPosition: getPosition,
    setPosition: setPosition,
    getDirection: getDirection,
    getMesh: getMesh,
    interactNearby: interactNearby,
    startEat: startEat,
    isEating: isEating,
    isRegenerating: isRegenerating,
    hasTorchLight: hasTorchLight,
    getTorchFuel: getTorchFuel,
    updateTorchFlame: updateTorchFlame
  };
})();