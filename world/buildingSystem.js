window.BuildingSystem = (function () {
  var _buildMode = false;
  var _selectedBuilding = null;
  var _previewMesh = null;
  var _nextId = 1;

  function enterBuildMode(buildingId) {
    if (_buildMode) exitBuildMode();

    _buildMode = true;
    _selectedBuilding = buildingId;

    var entity = GameRegistry.getEntity(buildingId);
    if (entity && entity.visual) {
      _previewMesh = createBuildingMesh(entity, true);
      if (_previewMesh) {
        _previewMesh.visible = false;
        GameScene.getScene().add(_previewMesh);
      }
    }

    document.getElementById('game-canvas').style.cursor = 'crosshair';
    GameHUD.showNotification("Click to place " + (entity ? entity.name : buildingId));
  }

  function exitBuildMode() {
    _buildMode = false;
    _selectedBuilding = null;

    if (_previewMesh) {
      GameScene.getScene().remove(_previewMesh);
      _previewMesh = null;
    }

    document.getElementById('game-canvas').style.cursor = 'default';
  }

  function updatePreview(worldX, worldZ) {
    if (!_buildMode || !_previewMesh) return;

    var snapX = Math.round(worldX);
    var snapZ = Math.round(worldZ);
    _previewMesh.position.set(snapX, 0, snapZ);
    _previewMesh.visible = true;

    var valid = canPlaceAt(snapX, snapZ);
    _previewMesh.traverse(function (child) {
      if (child.isMesh && child.material) {
        child.material.opacity = 0.6;
        child.material.transparent = true;
        child.material.color.setHex(valid ? 0x4ecca3 : 0xe94560);
      }
    });
  }

  function canPlaceAt(worldX, worldZ) {
    console.log(`[BUILD] Checking placement at ${worldX}, ${worldZ}`);
    
    // Must be on walkable ground
    if (!GameTerrain.isWalkable(worldX, worldZ)) {
      console.log(`[BUILD] ❌ Failed: Terrain not walkable`);
      return false;
    }

    // Check tile reservation
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    if (GameTerrain._reservedTiles && GameTerrain._reservedTiles[key]) {
      console.log(`[BUILD] ❌ Failed: Tile is reserved`);
      return false;
    }

    // Must not overlap existing instances with 0.8 buffer
    var instances = GameState.getAllInstances();
    for (var uid in instances) {
      var inst = instances[uid];
      var dx = Math.abs(inst.x - worldX);
      var dz = Math.abs(inst.z - worldZ);
      if (dx < 0.8 && dz < 0.8) {
        console.log(`[BUILD] ❌ Failed: Overlap with instance ${uid} at ${inst.x},${inst.z} (dx:${dx.toFixed(2)}, dz:${dz.toFixed(2)})`);
        return false;
      }
    }

    console.log(`[BUILD] ✅ Valid placement`);
    return true;
  }

  function placeBuilding(worldX, worldZ) {
    if (!_buildMode || !_selectedBuilding) return false;

    var snapX = Math.round(worldX);
    var snapZ = Math.round(worldZ);

    if (!canPlaceAt(snapX, snapZ)) {
      GameHUD.showNotification("Cannot build here!");
      return false;
    }

    var buildingId = _selectedBuilding;
    var balance = GameRegistry.getBalance(buildingId);
    if (!balance || !balance.cost) return false;

    // Check cost
    for (var resId in balance.cost) {
      if (!GameState.hasResource(resId, balance.cost[resId])) {
        GameHUD.showNotification("Not enough resources!");
        return false;
      }
    }

    // Deduct cost
    for (var resId in balance.cost) {
      GameState.removeResource(resId, balance.cost[resId]);
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
    // Reserve tile FIRST before adding state to prevent race conditions
    GameTerrain.reserveTile(snapX, snapZ);
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

    exitBuildMode();
    GameHUD.renderAll();
    GameStorage.save();
    GameHUD.showNotification((entity ? entity.name : buildingId) + " built!");
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

  function isBuildMode() { return _buildMode; }
  function getSelectedBuilding() { return _selectedBuilding; }
  
  function destroyBuilding(uid) {
    if (_buildMode) return false;
    
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
    
    GameTerrain.releaseTile(instance.x, instance.z);
    GameState.destroyInstance(uid);
    GameHUD.renderAll();
    GameStorage.save();
    
    return true;
  }

  return {
    enterBuildMode: enterBuildMode,
    exitBuildMode: exitBuildMode,
    updatePreview: updatePreview,
    placeBuilding: placeBuilding,
    canPlaceAt: canPlaceAt,
    createBuildingMesh: createBuildingMesh,
    isBuildMode: isBuildMode,
    getSelectedBuilding: getSelectedBuilding,
    destroyBuilding: destroyBuilding
  };
})();
