window.BuildingSystem = (function () {
  var _nextId = 1;
  var _reservedTiles = {};

  function restoreReservations() {
    _reservedTiles = {};
    var instances = GameState.getAllInstances();
    var maxId = 0;
    for (var uid in instances) {
      var inst = instances[uid];
      var key = Math.round(inst.x) + "," + Math.round(inst.z);
      _reservedTiles[key] = true;
      var num = parseInt(uid.replace("inst_", ""), 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    }
    _nextId = maxId + 1;
  }

  function canPlaceAt(worldX, worldZ) {
    // Must be on walkable ground (no trees/rocks blocking)
    if (!GameTerrain.isWalkable(worldX, worldZ)) {
      return { valid: false, reason: "Vị trí này không thể xây dựng" };
    }

    // Check tile reservation
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    if (_reservedTiles[key]) {
      return { valid: false, reason: "Vị trí này đã có building khác" };
    }

    // Must not overlap existing instances with 0.8 buffer
    var instances = GameState.getAllInstances();
    for (var uid in instances) {
      var inst = instances[uid];
      var dx = Math.abs(inst.x - worldX);
      var dz = Math.abs(inst.z - worldZ);
      if (dx < 0.8 && dz < 0.8) {
        return { valid: false, reason: "Vị trí này đã có building khác" };
      }
    }

    return { valid: true };
  }

  function placeAtPlayer(buildingId) {
    var balance = GameRegistry.getBalance(buildingId);
    if (!balance || !balance.cost) return false;

    // Get player position, snap to grid
    var pos = GamePlayer.getPosition();
    var snapX = Math.round(pos.x);
    var snapZ = Math.round(pos.z);

    // Try player position first, then adjacent offsets
    var offsets = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
    var foundPos = null;
    for (var i = 0; i < offsets.length; i++) {
      var tryX = snapX + offsets[i][0];
      var tryZ = snapZ + offsets[i][1];
      if (canPlaceAt(tryX, tryZ).valid) {
        foundPos = { x: tryX, z: tryZ };
        break;
      }
    }

    if (!foundPos) {
      GameHUD.showError("Không tìm được vị trí hợp lệ gần bạn!");
      return false;
    }

    snapX = foundPos.x;
    snapZ = foundPos.z;

    // Check cost
    for (var resId in balance.cost) {
      if (!GameState.hasResource(resId, balance.cost[resId])) {
        var resEntity = GameRegistry.getEntity(resId);
        var needed = balance.cost[resId] - GameState.getResource(resId);
        GameHUD.showError("Không đủ " + (resEntity ? resEntity.name : resId) + ": cần thêm " + needed);
        return false;
      }
    }

    // Deduct cost
    for (var resId in balance.cost) {
      GameState.removeResource(resId, balance.cost[resId]);
    }

    // Ensure _nextId is above existing
    var instances = GameState.getAllInstances();
    var maxId = 0;
    for (var uid in instances) {
      var num = parseInt(uid.replace("inst_", ""), 10);
      if (!isNaN(num) && num >= _nextId) _nextId = num + 1;
    }

    // Create instance
    var uid = "inst_" + _nextId++;
    var instanceData = {
      entityId: buildingId,
      level: 1,
      x: snapX,
      z: snapZ,
      uid: uid
    };

    // Reserve tile and save to state
    var tileKey = snapX + "," + snapZ;
    _reservedTiles[tileKey] = true;
    GameState.addInstance(uid, instanceData);
    GameState.addBuilding(buildingId);

    // Create 3D mesh
    var entity = GameRegistry.getEntity(buildingId);
    var mesh = createBuildingMesh(entity, false);
    if (mesh) {
      mesh.position.set(snapX, 0, snapZ);
      mesh.userData.instanceUid = uid;
      GameScene.getScene().add(mesh);
    }

    // Push player out if they're inside the building collision area
    var playerPos = GamePlayer.getPosition();
    var pdx = Math.abs(playerPos.x - snapX);
    var pdz = Math.abs(playerPos.z - snapZ);
    if (pdx < 0.8 && pdz < 0.8) {
      var safePos = null;
      var safeDist = Infinity;
      for (var j = 0; j < offsets.length; j++) {
        if (offsets[j][0] === 0 && offsets[j][1] === 0) continue;
        var sx = snapX + offsets[j][0];
        var sz = snapZ + offsets[j][1];
        if (GameTerrain.isWalkable(sx, sz)) {
          var sdx = sx - playerPos.x;
          var sdz = sz - playerPos.z;
          var sd = Math.sqrt(sdx * sdx + sdz * sdz);
          if (sd < safeDist) {
            safeDist = sd;
            safePos = { x: sx, z: sz };
          }
        }
      }
      if (safePos) {
        GamePlayer.setPosition(safePos.x, safePos.z);
      }
    }

    GameHUD.renderAll();
    GameStorage.save();
    GameHUD.showSuccess("Đã xây: " + (entity ? entity.name : buildingId));
    return true;
  }

  function createBuildingMesh(entity, isPreview) {
    if (!entity || !entity.visual) return null;

    var group = new THREE.Group();
    var color = entity.visual.color || 0x8B4513;
    var roofColor = entity.visual.roofColor || 0x2d5a27;
    var scale = entity.visual.scale || 1.0;

    // Base
    var baseGeo = new THREE.BoxGeometry(0.8 * scale, 0.6 * scale, 0.8 * scale);
    var baseMat = new THREE.MeshLambertMaterial({ color: color });
    var base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.3 * scale;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Roof (pyramid)
    var roofGeo = new THREE.ConeGeometry(0.6 * scale, 0.4 * scale, 4);
    var roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
    var roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.8 * scale;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Door
    var doorGeo = new THREE.PlaneGeometry(0.2 * scale, 0.3 * scale);
    var doorMat = new THREE.MeshLambertMaterial({ color: 0x3a2010 });
    var door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.15 * scale, 0.41 * scale);
    group.add(door);

    // Shadow
    var shadowGeo = new THREE.CircleGeometry(0.5 * scale, 12);
    var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 });
    var shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    return group;
  }

  function isBuildMode() { return false; }

  function destroyBuilding(uid) {
    var instance = GameState.getInstance(uid);
    if (!instance) return false;

    // Remove mesh from scene
    var scene = GameScene.getScene();
    for (var i = scene.children.length - 1; i >= 0; i--) {
      var child = scene.children[i];
      if (child.userData && child.userData.instanceUid === uid) {
        scene.remove(child);
        break;
      }
    }

    // Release tile reservation
    var tileKey = Math.round(instance.x) + "," + Math.round(instance.z);
    delete _reservedTiles[tileKey];

    GameState.destroyInstance(uid);
    GameHUD.renderAll();
    GameStorage.save();

    return true;
  }

  return {
    placeAtPlayer: placeAtPlayer,
    canPlaceAt: canPlaceAt,
    createBuildingMesh: createBuildingMesh,
    isBuildMode: isBuildMode,
    destroyBuilding: destroyBuilding,
    restoreReservations: restoreReservations,
    _reservedTiles: _reservedTiles
  };
})();
