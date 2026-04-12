window.GamePlayer = (function () {
  var mesh;
  var _x = 8, _z = 8;
  var _targetX = null, _targetZ = null;
  var _moving = false;
  var _interactTarget = null;
  var _direction = { x: 0, z: 1 };
  var _keys = {};
  var _animTime = 0;

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
      if (e.key.toLowerCase() === 'b') { 
        GameHUD.switchModalTab('build'); 
        if (!document.getElementById('modal-overlay').classList.contains('active')) {
          GameHUD.toggleModal(); 
        }
      }
      if (e.key.toLowerCase() === 'c') { 
        GameHUD.switchModalTab('craft'); 
        if (!document.getElementById('modal-overlay').classList.contains('active')) {
          GameHUD.toggleModal(); 
        }
      }
      if (e.key.toLowerCase() === 'i') { 
        // Open modal to stats (inventory now always visible)
        GameHUD.switchModalTab('stats'); 
        if (!document.getElementById('modal-overlay').classList.contains('active')) {
          GameHUD.toggleModal(); 
        }
      }
      if (e.key === 'Escape') GameHUD.closeModal();
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

  function raycastGround(event) {
    var mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, GameScene.getCamera());

    // Use a proper ground plane for raycasting
    var groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var target = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, target);
    return target;
  }

  function onCanvasClick(event) {
    if (event.target.id !== 'game-canvas') return;

    // Click objects to interact (walk to + chop/mine/fight)
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
        _interactTarget = objData;
        _targetX = objData.worldX;
        _targetZ = objData.worldZ;
      }
    }
  }

  function update(dt) {
    _animTime += dt;
    var moved = false;

    // Get current speed from GameState (includes boots bonus)
    var _speed = GameState.getPlayerSpeed ? GameState.getPlayerSpeed() : 3;

    // Screen-space input: W=up, S=down, A=left, D=right
    var screenDx = 0, screenDy = 0;
    if (_keys['w'] || _keys['arrowup']) { screenDy -= 1; moved = true; }
    if (_keys['s'] || _keys['arrowdown']) { screenDy += 1; moved = true; }
    if (_keys['a'] || _keys['arrowleft']) { screenDx -= 1; moved = true; }
    if (_keys['d'] || _keys['arrowright']) { screenDx += 1; moved = true; }

    // Convert screen direction to world XZ
    // Camera at (20,20,20) looking at (0,0,0):
    //   screen right → world (+1, 0, -1)
    //   screen up    → world (-1, 0, -1)
    // Formula: worldDx = screenDx + screenDy*(-1), worldDz = screenDx*(-1) + screenDy*(-1)
    // Đảo dấu để sửa hướng di chuyển và quay mặt
    var dx = screenDx + screenDy;
    var dz = -screenDx + screenDy;

    if (moved) {
      // Keyboard overrides target
      _targetX = null;
      _targetZ = null;
      _interactTarget = null;

      var len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) { dx /= len; dz /= len; }
      _direction.x = dx;
      _direction.z = dz;

      var newX = _x + dx * _speed * dt;
      var newZ = _z + dz * _speed * dt;

      if (GameTerrain.isWalkable(newX, newZ)) {
        _x = newX;
        _z = newZ;
      } else if (GameTerrain.isWalkable(newX, _z)) {
        _x = newX;
      } else if (GameTerrain.isWalkable(_x, newZ)) {
        _z = newZ;
      }
    }

    // Target movement (click-to-move)
    if (!moved && _targetX !== null && _targetZ !== null) {
      var tdx = _targetX - _x;
      var tdz = _targetZ - _z;
      var dist = Math.sqrt(tdx * tdx + tdz * tdz);

      if (dist > 0.5) {
        dx = tdx / dist;
        dz = tdz / dist;
        _direction.x = dx;
        _direction.z = dz;

        var newX = _x + dx * _speed * dt;
        var newZ = _z + dz * _speed * dt;

        if (GameTerrain.isWalkable(newX, newZ)) {
          _x = newX;
          _z = newZ;
          moved = true;
        } else {
          _targetX = null;
          _targetZ = null;
        }
      } else {
        // Arrived at target
        _targetX = null;
        _targetZ = null;

        if (_interactTarget) {
          interactWith(_interactTarget);
          _interactTarget = null;
        }
      }
    }

    // Update mesh position
    if (mesh) {
      mesh.position.x += (_x - mesh.position.x) * 0.3;
      mesh.position.z += (_z - mesh.position.z) * 0.3;

      // Face direction
      if (moved) {
        var targetAngle = Math.atan2(_direction.x, _direction.z) + Math.PI;
        var angleDiff = targetAngle - mesh.rotation.y;
        
        // Normalize angle difference để luôn xoay theo đường ngắn nhất
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        mesh.rotation.y += angleDiff * 0.2;
      }

      // Walking animation
      if (moved) {
        var swing = Math.sin(_animTime * 10) * 0.4;
        mesh.children.forEach(function (child) {
          if (child.name === "leftArm") child.rotation.x = swing;
          if (child.name === "rightArm") child.rotation.x = -swing;
          if (child.name === "leftLeg") child.rotation.x = -swing * 0.6;
          if (child.name === "rightLeg") child.rotation.x = swing * 0.6;
        });
      } else {
        // Idle - arms/legs return to neutral
        mesh.children.forEach(function (child) {
          if (child.name) child.rotation.x *= 0.85;
        });
      }
    }

    // Update terrain chunks around player
    GameTerrain.update(_x, _z);

    // Update context action display
    updateContextAction();
  }

  function updateContextAction() {
    var nearObj = GameTerrain.findNearestObject(_x, _z, 2.5);
    var el = document.getElementById('context-action');
    var textEl = document.getElementById('context-text');

    // Check for nearby building first
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

    // Otherwise check for harvestable objects
    if (nearObj && nearObj.hp > 0) {
      var entity = GameRegistry.getEntity(nearObj.type);
      var name = entity ? entity.name : nearObj.type;
      var action = nearObj.type.startsWith("animal.") ? "Fight" : nearObj.type === "node.berry_bush" ? "Gather" : nearObj.type.startsWith("node.") ? "Harvest" : "Interact";
      textEl.textContent = action + " " + name + " (" + nearObj.hp + "/" + nearObj.maxHp + ")";
      el.classList.add('show');
      GameHUD.showObjectHpBar(nearObj);
    } else {
      el.classList.remove('show');
      GameHUD.hideObjectHpBar();
    }
  }

  function interactNearby() {
    // Check for nearby building first
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

    // Otherwise interact with harvestable object
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

  /**
   * Find nearest building to player
   */
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

  /**
   * Collect resources from building storage
   */
  function collectFromBuilding(buildingInstance) {
    var collected = GameState.collectFromBuilding(buildingInstance.uid);
    
    // Show notifications for collected resources
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
      GameHUD.renderAll();
    }
  }

  function harvestNode(objData) {
    var balance = GameRegistry.getBalance(objData.type);
    if (!balance) return;

    // Check if node is being harvested by NPCs
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

    // Tool bonus
    var playerState = GameState.getPlayer();
    if (playerState.equipped.weapon) {
      var weaponBalance = GameRegistry.getBalance(playerState.equipped.weapon);
      if (weaponBalance && weaponBalance.stats && weaponBalance.stats.attack) {
        // Each 2 attack bonus = 1 extra hit
        var bonusHits = Math.floor(weaponBalance.stats.attack / 2);
        objData.hp -= bonusHits;
      }
    }

    // Show damage
    GameHUD.showDamageNumber(objData.worldX, 0.5, objData.worldZ, "HIT (" + Math.max(0, objData.hp) + "/" + objData.maxHp + ")", "damage");
    GameHUD.showObjectHpBar(objData);

    if (objData.hp <= 0 && !objData._destroyed) {
      objData._destroyed = true;
      
      // Give rewards
      if (balance.rewards) {
        for (var resId in balance.rewards) {
          var amount = balance.rewards[resId];
          GameState.addResource(resId, amount);
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          GameHUD.showDamageNumber(objData.worldX, 1.2, objData.worldZ, "+" + amount + " " + resName, "loot");
        }
      }

      // Hide the 3D mesh
      GameEntities.hideObject(objData);

      // Schedule respawn
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

  function getPosition() {
    return { x: _x, z: _z };
  }

  function setPosition(x, z) {
    _x = x;
    _z = z;
    if (mesh) {
      mesh.position.set(x, 0, z);
    }
  }

  function getDirection() {
    return _direction;
  }

  function getMesh() {
    return mesh;
  }

  return {
    init: init,
    update: update,
    getPosition: getPosition,
    setPosition: setPosition,
    getDirection: getDirection,
    getMesh: getMesh,
    interactNearby: interactNearby
  };
})();
