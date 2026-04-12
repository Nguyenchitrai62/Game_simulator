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
    var mesh = createBuildingMesh(entity, 1, false);  // Level 1 when first built
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

    // Spawn NPCs for this building
    if (window.NPCSystem && NPCSystem.spawnWorkersForBuilding) {
      NPCSystem.spawnWorkersForBuilding(uid);
    }

    // Check for newly unlocked content after building
    UnlockSystem.checkAll();

    GameHUD.renderAll();
    GameStorage.save();
    GameHUD.showSuccess("Đã xây: " + (entity ? entity.name : buildingId));
    return true;
  }

  function createBuildingMesh(entity, level, isPreview) {
    if (!entity || !entity.visual) return null;

    level = level || 1;
    var levelScale = 1.0 + (level - 1) * 0.20;  // Each level: +20% size

    var group = new THREE.Group();
    var color = entity.visual.color || 0x8B4513;
    var roofColor = entity.visual.roofColor || 0x2d5a27;
    var scale = (entity.visual.scale || 1.0) * levelScale;

    // === LEVEL 2+ : Foundation/Platform ===
    if (!isPreview && level >= 2) {
      var platSize = level >= 3 ? 1.2 : 1.0;
      var platGeo = new THREE.BoxGeometry(platSize * scale, 0.08, platSize * scale);
      var platMat = new THREE.MeshLambertMaterial({ color: 0x808080, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var platform = new THREE.Mesh(platGeo, platMat);
      platform.position.y = 0.04;
      platform.receiveShadow = !isPreview;
      group.add(platform);
    }

    // === Base ===
    var baseW = level >= 3 ? 0.9 : 0.8;
    var baseGeo = new THREE.BoxGeometry(baseW * scale, 0.6 * scale, 0.8 * scale);
    var baseMat = new THREE.MeshLambertMaterial({ color: color, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
    var base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.3 * scale;
    base.castShadow = !isPreview;
    base.receiveShadow = !isPreview;
    group.add(base);

    // === Level 3: Window detail on base ===
    if (!isPreview && level >= 3) {
      var winColor = 0xFFE4B5; // Warm light
      var winPositions = [
        [0.3 * scale, 0.3 * scale, 0.41 * scale],
        [-0.3 * scale, 0.3 * scale, 0.41 * scale]
      ];
      winPositions.forEach(function(pos) {
        var winGeo = new THREE.PlaneGeometry(0.12 * scale, 0.15 * scale);
        var winMat = new THREE.MeshBasicMaterial({ color: winColor });
        var win = new THREE.Mesh(winGeo, winMat);
        win.position.set(pos[0], pos[1], pos[2]);
        group.add(win);
      });
    }

    // === Roof ===
    var roofH = level >= 2 ? 0.5 : 0.4;
    var roofR = level >= 3 ? 0.7 : 0.6;
    // Lighter roof color for higher levels
    var actualRoofColor = level >= 3 ? 0x8B4513 : (level >= 2 ? 0x3a6b35 : roofColor);
    var roofGeo = new THREE.ConeGeometry(roofR * scale, roofH * scale, 4);
    var roofMat = new THREE.MeshLambertMaterial({ color: actualRoofColor, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
    var roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = (0.6 + roofH / 2) * scale;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = !isPreview;
    group.add(roof);

    // === Door ===
    var doorGeo = new THREE.PlaneGeometry(0.2 * scale, 0.3 * scale);
    var doorMat = new THREE.MeshLambertMaterial({ color: 0x3a2010, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
    var door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.15 * scale, 0.41 * scale);
    group.add(door);

    // === Shadow ===
    var shadowGeo = new THREE.CircleGeometry(0.5 * scale, 12);
    var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: isPreview ? 0.1 : 0.15 });
    var shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    // === Level 2: Crate/barrel detail ===
    if (!isPreview && level >= 2) {
      var barrelGeo = new THREE.CylinderGeometry(0.06 * scale, 0.07 * scale, 0.15 * scale, 8);
      var barrelMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
      var barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(0.4 * scale, 0.075 * scale, 0.25 * scale);
      group.add(barrel);
    }

    // === Level 3: Chimney ===
    if (!isPreview && level >= 3) {
      var chimGeo = new THREE.BoxGeometry(0.08 * scale, 0.25 * scale, 0.08 * scale);
      var chimMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
      var chimney = new THREE.Mesh(chimGeo, chimMat);
      chimney.position.set(0.2 * scale, (0.6 + roofH + 0.12) * scale, -0.15 * scale);
      group.add(chimney);
    }

    // === Level indicator (stars above building) ===
    if (!isPreview && level > 1) {
      for (var i = 0; i < level && i < 3; i++) {
        var starGeo = new THREE.SphereGeometry(0.07, 6, 4);
        var starMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        var star = new THREE.Mesh(starGeo, starMat);
        star.position.set(-0.2 + i * 0.2, (0.6 + roofH + 0.2) * scale, 0);
        group.add(star);
      }
    }

    return group;
  }

  function isBuildMode() { return _buildMode.active; }

  // === BUILD PREVIEW MODE ===
  var _buildMode = { active: false, buildingId: null, previewMesh: null, lastValidPos: null };

  function enterBuildMode(buildingId) {
    // Cancel any existing build mode
    cancelBuild();

    var entity = GameRegistry.getEntity(buildingId);
    if (!entity || !entity.visual) return;

    var balance = GameRegistry.getBalance(buildingId);
    if (!balance) return;

    // Check cost first
    for (var resId in balance.cost) {
      if (!GameState.hasResource(resId, balance.cost[resId])) {
        var resEntity = GameRegistry.getEntity(resId);
        GameHUD.showError("Không đủ " + (resEntity ? resEntity.name : resId));
        return;
      }
    }

    // Create preview mesh
    var mesh = createBuildingMesh(entity, 1, true);
    if (!mesh) return;

    _buildMode.active = true;
    _buildMode.buildingId = buildingId;
    _buildMode.previewMesh = mesh;
    _buildMode.lastValidPos = null;

    // Place at current mouse position or player position
    var playerPos = GamePlayer.getPosition();
    var snapX = Math.round(playerPos.x);
    var snapZ = Math.round(playerPos.z);
    mesh.position.set(snapX, 0, snapZ);
    updatePreviewColor(snapX, snapZ);

    GameScene.getScene().add(mesh);
    GameHUD.showNotification("Chọn vị trí xây dựng. Click để đặt, ESC để hủy.");
  }

  function updatePreviewColor(worldX, worldZ) {
    if (!_buildMode.previewMesh) return;
    var result = canPlaceAt(worldX, worldZ);
    var validColor = result.valid ? 0x00ff00 : 0xff0000; // Green = valid, Red = invalid
    var opacity = result.valid ? 0.4 : 0.3;

    _buildMode.previewMesh.traverse(function(child) {
      if (child.isMesh && child.material) {
        child.material.color.setHex(validColor);
        child.material.opacity = opacity;
      }
    });
    _buildMode.lastValidPos = result.valid ? { x: worldX, z: worldZ } : null;
  }

  function updateBuildPreview(worldX, worldZ) {
    if (!_buildMode.active || !_buildMode.previewMesh) return;
    var snapX = Math.round(worldX);
    var snapZ = Math.round(worldZ);
    _buildMode.previewMesh.position.set(snapX, 0, snapZ);
    updatePreviewColor(snapX, snapZ);
  }

  function confirmBuild() {
    if (!_buildMode.active || !_buildMode.previewMesh) return;
    if (!_buildMode.lastValidPos) {
      GameHUD.showError("Vị trí không hợp lệ!");
      return;
    }

    var buildingId = _buildMode.buildingId;
    var posX = _buildMode.lastValidPos.x;
    var posZ = _buildMode.lastValidPos.z;

    // Remove preview mesh
    cancelBuild();

    // Place the actual building at the selected position
    placeBuildingAt(buildingId, posX, posZ);
  }

  function cancelBuild() {
    if (_buildMode.previewMesh) {
      GameScene.getScene().remove(_buildMode.previewMesh);
      _buildMode.previewMesh = null;
    }
    _buildMode.active = false;
    _buildMode.buildingId = null;
    _buildMode.lastValidPos = null;
  }

  function placeBuildingAt(buildingId, worldX, worldZ) {
    var balance = GameRegistry.getBalance(buildingId);
    if (!balance || !balance.cost) return false;

    // Final cost check
    for (var resId in balance.cost) {
      if (!GameState.hasResource(resId, balance.cost[resId])) {
        var resEntity = GameRegistry.getEntity(resId);
        GameHUD.showError("Không đủ " + (resEntity ? resEntity.name : resId));
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
      x: worldX,
      z: worldZ,
      uid: uid
    };

    var tileKey = worldX + "," + worldZ;
    _reservedTiles[tileKey] = true;
    GameState.addInstance(uid, instanceData);
    GameState.addBuilding(buildingId);

    // Create 3D mesh
    var entity = GameRegistry.getEntity(buildingId);
    var mesh = createBuildingMesh(entity, 1, false);
    if (mesh) {
      mesh.position.set(worldX, 0, worldZ);
      mesh.userData.instanceUid = uid;
      GameScene.getScene().add(mesh);
    }

    // Push player out if inside
    var playerPos = GamePlayer.getPosition();
    var pdx = Math.abs(playerPos.x - worldX);
    var pdz = Math.abs(playerPos.z - worldZ);
    if (pdx < 0.8 && pdz < 0.8) {
      var offsets = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
      var safePos = null;
      var safeDist = Infinity;
      for (var j = 0; j < offsets.length; j++) {
        var sx = worldX + offsets[j][0];
        var sz = worldZ + offsets[j][1];
        if (GameTerrain.isWalkable(sx, sz)) {
          var sdx = sx - playerPos.x;
          var sdz = sz - playerPos.z;
          var sd = Math.sqrt(sdx * sdx + sdz * sdz);
          if (sd < safeDist) { safeDist = sd; safePos = { x: sx, z: sz }; }
        }
      }
      if (safePos) GamePlayer.setPosition(safePos.x, safePos.z);
    }

    // Spawn NPCs
    if (window.NPCSystem && NPCSystem.spawnWorkersForBuilding) {
      NPCSystem.spawnWorkersForBuilding(uid);
    }

    UnlockSystem.checkAll();
    GameHUD.renderAll();
    GameStorage.save();
    GameHUD.showSuccess("Đã xây: " + (entity ? entity.name : buildingId));
    return true;
  }

  function destroyBuilding(uid) {
    var instance = GameState.getInstance(uid);
    if (!instance) return false;

    // Despawn NPCs for this building
    if (window.NPCSystem && NPCSystem.despawnWorkersForBuilding) {
      NPCSystem.despawnWorkersForBuilding(uid);
    }

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
    placeBuildingAt: placeBuildingAt,
    canPlaceAt: canPlaceAt,
    createBuildingMesh: createBuildingMesh,
    isBuildMode: isBuildMode,
    enterBuildMode: enterBuildMode,
    updateBuildPreview: updateBuildPreview,
    confirmBuild: confirmBuild,
    cancelBuild: cancelBuild,
    destroyBuilding: destroyBuilding,
    restoreReservations: restoreReservations,
    _reservedTiles: _reservedTiles
  };
})();
