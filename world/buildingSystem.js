window.BuildingSystem = (function () {
  var _nextId = 1;
  var _reservedTiles = {};
  var _instanceMeshMap = {};
  var _interactiveMeshes = [];
  var _interactiveMeshesDirty = false;

  function getBuildingPlacementConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.buildingPlacement) || {};
  }

  function getBuildingOverlapBuffer() {
    return Math.max(0, Number(getBuildingPlacementConfig().overlapBuffer) || 0);
  }

  function removeInteractiveMesh(mesh) {
    if (!mesh) return;
    var index = _interactiveMeshes.indexOf(mesh);
    if (index !== -1) {
      _interactiveMeshes.splice(index, 1);
    }
  }

  function findSceneMeshByInstanceUid(uid) {
    var scene = GameScene.getScene ? GameScene.getScene() : null;
    if (!scene) return null;

    for (var i = scene.children.length - 1; i >= 0; i--) {
      var child = scene.children[i];
      if (child && child.userData && child.userData.instanceUid === uid) {
        return child;
      }
    }

    return null;
  }

  function compactInteractiveMeshes() {
    if (!_interactiveMeshesDirty) return;

    var next = [];
    for (var i = 0; i < _interactiveMeshes.length; i++) {
      var mesh = _interactiveMeshes[i];
      if (!mesh || !mesh.parent || !mesh.userData || !_instanceMeshMap[mesh.userData.instanceUid] || _instanceMeshMap[mesh.userData.instanceUid] !== mesh) {
        continue;
      }
      next.push(mesh);
    }

    _interactiveMeshes = next;
    _interactiveMeshesDirty = false;
  }

  function registerInstanceMesh(uid, mesh) {
    if (!uid || !mesh) return null;

    var existing = _instanceMeshMap[uid];
    if (existing && existing !== mesh) {
      removeInteractiveMesh(existing);
    }

    mesh.userData = mesh.userData || {};
    mesh.userData.instanceUid = uid;
    _instanceMeshMap[uid] = mesh;
    if (_interactiveMeshes.indexOf(mesh) === -1) {
      _interactiveMeshes.push(mesh);
    }
    _interactiveMeshesDirty = true;
    return mesh;
  }

  function unregisterInstanceMesh(uid) {
    var existing = _instanceMeshMap[uid] || null;
    if (!existing) return null;

    delete _instanceMeshMap[uid];
    removeInteractiveMesh(existing);
    _interactiveMeshesDirty = true;
    return existing;
  }

  function getInstanceMesh(uid) {
    var mesh = _instanceMeshMap[uid] || null;
    if (mesh && mesh.parent) return mesh;

    if (mesh && !mesh.parent) {
      unregisterInstanceMesh(uid);
    }

    mesh = findSceneMeshByInstanceUid(uid);
    if (mesh) {
      registerInstanceMesh(uid, mesh);
    }
    return mesh;
  }

  function getInteractiveMeshes() {
    compactInteractiveMeshes();
    return _interactiveMeshes;
  }

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

  function canPlaceAt(worldX, worldZ, buildingId) {
    // Bridges can be placed on water
    var isBridge = false;
    if (buildingId) {
      var buildingBalance = GameRegistry.getBalance(buildingId);
      isBridge = buildingBalance && buildingBalance.isBridge;
    }

    // Check for deep water (not walkable, not bridgeable)
    if (typeof WaterSystem !== 'undefined' && WaterSystem.isDeepWater(worldX, worldZ) && !isBridge) {
      return { valid: false, reason: "Cannot build on deep water" };
    }

    // Must be on walkable ground (no trees/rocks blocking) unless building on water/shallow with bridge
    var onWater = typeof WaterSystem !== 'undefined' && (WaterSystem.isDeepWater(worldX, worldZ) || WaterSystem.isShallowWater(worldX, worldZ));
    if (!onWater && !GameTerrain.isWalkable(worldX, worldZ)) {
      return { valid: false, reason: "This tile is blocked" };
    }
    // Bridges can be placed on water tiles
    if (onWater && !isBridge) {
      return { valid: false, reason: "Build a bridge to place structures on water" };
    }
    // Bridges can ONLY be placed on water
    if (isBridge && !onWater) {
      return { valid: false, reason: "Bridges can only be placed on water" };
    }

    // Check tile reservation
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    if (_reservedTiles[key]) {
      return { valid: false, reason: "Another structure already occupies this tile" };
    }

    // Must not overlap existing instances within the configured placement buffer
    var instances = GameState.getAllInstances();
    var overlapBuffer = getBuildingOverlapBuffer();
    for (var uid in instances) {
      var inst = instances[uid];
      var dx = Math.abs(inst.x - worldX);
      var dz = Math.abs(inst.z - worldZ);
      if (dx < overlapBuffer && dz < overlapBuffer) {
        return { valid: false, reason: "Another structure already occupies this tile" };
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
      if (canPlaceAt(tryX, tryZ, buildingId).valid) {
        foundPos = { x: tryX, z: tryZ };
        break;
      }
    }

    if (!foundPos) {
      GameHUD.showError("No valid building tile found near you.");
      return false;
    }

    snapX = foundPos.x;
    snapZ = foundPos.z;

    // Check cost
    for (var resId in balance.cost) {
      if (!GameState.hasSpendableResource(resId, balance.cost[resId])) {
        var resEntity = GameRegistry.getEntity(resId);
        var needed = balance.cost[resId] - GameState.getSpendableResource(resId);
        GameHUD.showError("Not enough " + (resEntity ? resEntity.name : resId) + ": need " + needed + " more.");
        return false;
      }
    }

    // Deduct cost
    for (var resId in balance.cost) {
      GameState.consumeSpendableResource(resId, balance.cost[resId]);
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

    if (balance && balance.isBridge && typeof WaterSystem !== 'undefined') {
      instanceData.bridgeBaseWaterType = WaterSystem.isDeepWater(snapX, snapZ) ? 'deep' : 'shallow';
    }

    // Reserve tile and save to state
    var tileKey = snapX + "," + snapZ;
    _reservedTiles[tileKey] = true;
    GameState.addInstance(uid, instanceData);
    GameState.addBuilding(buildingId);

    // Create 3D mesh
    var entity = GameRegistry.getEntity(buildingId);
    var mesh = createBuildingMeshOrSpecial(entity, 1, false, instanceData);
    if (mesh) {
      mesh.position.set(snapX, 0, snapZ);
      registerInstanceMesh(uid, mesh);
      // Construction animation: scale from 0 to 1
      mesh.scale.set(0.01, 0.01, 0.01);
      GameScene.getScene().add(mesh);
      var buildStart = performance.now();
      var uid2 = uid;
      function animateBuild() {
        var elapsed = performance.now() - buildStart;
        var t = Math.min(1, elapsed / 500);
        var bounce = t < 0.8 ? t / 0.8 : 1 + (1 - (t - 0.8) / 0.2) * 0.05;
        mesh.scale.set(bounce, bounce, bounce);
        if (t < 1) requestAnimationFrame(animateBuild);
        else mesh.scale.set(1, 1, 1);
      }
      requestAnimationFrame(animateBuild);
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
    if (window.NPCSystem && NPCSystem.clearPathCache) {
      NPCSystem.clearPathCache();
    }

    // Register fire light if building has lightRadius
    if (window.FireSystem && balance && balance.lightRadius) {
      FireSystem.addFire(uid, instanceData);
    }

    // Mark water tile as walkable if bridge
    if (balance && balance.isBridge && typeof WaterSystem !== 'undefined') {
      WaterSystem.setWaterTile(snapX, snapZ, 'bridge');
    }

    // Check for newly unlocked content after building
    UnlockSystem.checkAll();

    GameHUD.renderAll();
    GameStorage.save();
    GameHUD.showSuccess("Built: " + (entity ? entity.name : buildingId));
    if (buildingId === 'building.campfire' && typeof GamePlayer !== 'undefined' && GamePlayer.triggerSpeechCue) {
      GamePlayer.triggerSpeechCue('fireAction');
    }
    return true;
  }

  function getFarmPlotVisualState(instanceOrUid) {
    var instance = typeof instanceOrUid === 'string' ? GameState.getInstance(instanceOrUid) : instanceOrUid;
    var visualState = {
      phase: 'empty',
      progress: 0,
      planted: false,
      watered: false,
      ready: false,
      riverBoosted: false
    };

    if (!instance || !window.GameState || !GameState.getFarmState) {
      return visualState;
    }

    var farmState = GameState.getFarmState(instance.uid);
    if (!farmState) return visualState;

    visualState.progress = Math.max(0, Math.min(1, farmState.progress || 0));
    visualState.planted = !!farmState.planted;
    visualState.watered = !!farmState.watered;
    visualState.ready = !!farmState.ready;
    visualState.riverBoosted = !!farmState.riverBoosted;

    if (!visualState.planted) {
      return visualState;
    }

    if (visualState.ready) {
      visualState.phase = visualState.riverBoosted ? 'ready_river' : 'ready';
      return visualState;
    }

    var growthBand = visualState.progress >= 0.68 ? 'late' : (visualState.progress >= 0.34 ? 'mid' : 'early');
    if (visualState.watered) {
      visualState.phase = (visualState.riverBoosted ? 'river_' : 'watered_') + growthBand;
    } else {
      visualState.phase = 'dry_' + growthBand;
    }

    return visualState;
  }

  function addFarmPlant(group, x, z, scale, style, isPreview) {
    var stemMat = new THREE.MeshLambertMaterial({ color: style.stemColor, transparent: isPreview, opacity: isPreview ? 0.5 : 1.0 });
    var leafMat = new THREE.MeshLambertMaterial({ color: style.leafColor, transparent: isPreview, opacity: isPreview ? 0.45 : 1.0 });
    var stemGeo = new THREE.CylinderGeometry(0.01 * scale, 0.015 * scale, style.height * scale, 5);
    var stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(x, (0.14 + style.height * 0.5) * scale, z);
    stem.castShadow = !isPreview;
    group.add(stem);

    for (var leafIndex = 0; leafIndex < 2; leafIndex++) {
      var leafGeo = new THREE.ConeGeometry(style.leafRadius * scale, style.leafHeight * scale, 5);
      var leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(x + (leafIndex === 0 ? -0.02 : 0.02) * scale, (0.18 + style.height * 0.7) * scale, z + (leafIndex === 0 ? -0.01 : 0.01) * scale);
      leaf.rotation.z = leafIndex === 0 ? -0.45 : 0.45;
      leaf.rotation.x = leafIndex === 0 ? 0.18 : -0.18;
      leaf.castShadow = !isPreview;
      group.add(leaf);
    }

    if (style.hasBulb) {
      var bulbGeo = new THREE.SphereGeometry(style.bulbRadius * scale, 6, 5);
      var bulbMat = new THREE.MeshLambertMaterial({ color: style.bulbColor, transparent: isPreview, opacity: isPreview ? 0.5 : 1.0 });
      var bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(x, (0.1 + style.bulbRadius * 0.7) * scale, z);
      bulb.castShadow = !isPreview;
      group.add(bulb);
    }
  }

  function createBuildingMesh(entity, level, isPreview, instanceData) {
    if (!entity || !entity.visual) return null;

    level = level || 1;
    var levelScale = 1.0 + (level - 1) * 0.20;
    var shape = entity.visual.shape || 'building';
    var group = new THREE.Group();
    var color = entity.visual.color || 0x8B4513;
    var roofColor = entity.visual.roofColor || 0x2d5a27;
    var scale = (entity.visual.scale || 1.0) * levelScale;

    // === TORCH ===
    if (shape === 'torch') {
      var poleGeo = new THREE.CylinderGeometry(0.03 * scale, 0.05 * scale, 0.9 * scale, 6);
      var poleMat = new THREE.MeshLambertMaterial({ color: 0x8B4513, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 0.45 * scale;
      pole.castShadow = !isPreview;
      group.add(pole);

      // Rope wrapping
      var ropeGeo = new THREE.TorusGeometry(0.05 * scale, 0.01 * scale, 4, 8);
      var ropeMat = new THREE.MeshLambertMaterial({ color: 0xC4A882, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var rope1 = new THREE.Mesh(ropeGeo, ropeMat);
      rope1.position.y = 0.65 * scale;
      rope1.rotation.x = Math.PI / 2;
      group.add(rope1);
      var rope2 = new THREE.Mesh(ropeGeo, ropeMat);
      rope2.position.y = 0.72 * scale;
      rope2.rotation.x = Math.PI / 2;
      group.add(rope2);

      // Flame cup
      var cupGeo = new THREE.CylinderGeometry(0.04 * scale, 0.03 * scale, 0.06 * scale, 6);
      var cupMat = new THREE.MeshLambertMaterial({ color: 0x5C4033, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var cup = new THREE.Mesh(cupGeo, cupMat);
      cup.position.y = 0.92 * scale;
      group.add(cup);

      // Outer flame
      var flameGeo = new THREE.ConeGeometry(0.06 * scale, 0.3 * scale, 6);
      var flameMat = new THREE.MeshBasicMaterial({ color: 0xFF8C00, transparent: true, opacity: isPreview ? 0.4 : 0.85 });
      var flame = new THREE.Mesh(flameGeo, flameMat);
      flame.name = 'torchFlame';
      flame.position.y = 1.1 * scale;
      group.add(flame);

      // Inner flame (bright yellow core)
      var innerGeo = new THREE.ConeGeometry(0.03 * scale, 0.18 * scale, 6);
      var innerMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44, transparent: true, opacity: isPreview ? 0.3 : 0.75 });
      var inner = new THREE.Mesh(innerGeo, innerMat);
      inner.name = 'torchFlameInner';
      inner.position.y = 1.05 * scale;
      group.add(inner);

      // Glow halo
      var glowGeo = new THREE.SphereGeometry(0.25 * scale, 8, 6);
      var glowMat = new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: isPreview ? 0.05 : 0.15, side: THREE.DoubleSide, depthWrite: false });
      var glow = new THREE.Mesh(glowGeo, glowMat);
      glow.name = 'torchGlow';
      glow.position.y = 1.08 * scale;
      group.add(glow);

      var shadowGeo = new THREE.CircleGeometry(0.3 * scale, 12);
      var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: isPreview ? 0.1 : 0.15 });
      var shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      group.add(shadow);

      return group;
    }

    // === CAMPFIRE ===
    if (shape === 'campfire') {
      // Stone ring
      var ringGeo = new THREE.TorusGeometry(0.35 * scale, 0.06 * scale, 8, 16);
      var ringMat = new THREE.MeshLambertMaterial({ color: 0x808080, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04 * scale;
      group.add(ring);

      // Ash bed
      var ashGeo = new THREE.CylinderGeometry(0.28 * scale, 0.3 * scale, 0.03 * scale, 12);
      var ashMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var ash = new THREE.Mesh(ashGeo, ashMat);
      ash.position.y = 0.03 * scale;
      group.add(ash);

      // Log 1
      var logGeo1 = new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.4 * scale, 6);
      var logMat1 = new THREE.MeshLambertMaterial({ color: 0x654321, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var log1 = new THREE.Mesh(logGeo1, logMat1);
      log1.rotation.z = Math.PI / 2;
      log1.rotation.y = 0.3;
      log1.position.y = 0.08 * scale;
      group.add(log1);

      // Log 2
      var log2 = new THREE.Mesh(logGeo1, logMat1);
      log2.rotation.z = Math.PI / 2;
      log2.rotation.y = -0.5;
      log2.position.y = 0.1 * scale;
      group.add(log2);

      // Cross log
      var crossLogGeo = new THREE.CylinderGeometry(0.035 * scale, 0.04 * scale, 0.35 * scale, 6);
      var crossLog = new THREE.Mesh(crossLogGeo, logMat1);
      crossLog.rotation.z = Math.PI / 2;
      crossLog.rotation.y = Math.PI / 3;
      crossLog.position.y = 0.13 * scale;
      group.add(crossLog);

      // Main flame (outer - orange)
      var cfFlameGeo = new THREE.ConeGeometry(0.12 * scale, 0.45 * scale, 8);
      var cfFlameMat = new THREE.MeshBasicMaterial({ color: 0xFF6600, transparent: true, opacity: isPreview ? 0.4 : 0.85 });
      var cfFlame = new THREE.Mesh(cfFlameGeo, cfFlameMat);
      cfFlame.name = 'flameOuter';
      cfFlame.position.y = 0.4 * scale;
      group.add(cfFlame);

      // Side flame (smaller, offset for natural look)
      var sideFlameGeo = new THREE.ConeGeometry(0.07 * scale, 0.3 * scale, 6);
      var sideFlameMat = new THREE.MeshBasicMaterial({ color: 0xFF7722, transparent: true, opacity: isPreview ? 0.3 : 0.7 });
      var sideFlame = new THREE.Mesh(sideFlameGeo, sideFlameMat);
      sideFlame.name = 'flameOuter';
      sideFlame.position.set(0.06 * scale, 0.32 * scale, 0.04 * scale);
      group.add(sideFlame);

      // Inner flame (bright yellow core)
      var cfInnerGeo = new THREE.ConeGeometry(0.06 * scale, 0.28 * scale, 6);
      var cfInnerMat = new THREE.MeshBasicMaterial({ color: 0xFFDD00, transparent: true, opacity: isPreview ? 0.3 : 0.8 });
      var cfInner = new THREE.Mesh(cfInnerGeo, cfInnerMat);
      cfInner.name = 'flameInner';
      cfInner.position.y = 0.35 * scale;
      group.add(cfInner);

      // Bright core (white-hot center)
      var coreGeo = new THREE.SphereGeometry(0.04 * scale, 6, 4);
      var coreMat = new THREE.MeshBasicMaterial({ color: 0xFFFFCC, transparent: true, opacity: isPreview ? 0.2 : 0.6 });
      var core = new THREE.Mesh(coreGeo, coreMat);
      core.name = 'flameInner';
      core.position.y = 0.22 * scale;
      group.add(core);

      // Glow sphere
      var cfGlowGeo = new THREE.SphereGeometry(0.5 * scale, 8, 6);
      var cfGlowMat = new THREE.MeshBasicMaterial({ color: 0xFF8800, transparent: true, opacity: isPreview ? 0.05 : 0.2, side: THREE.DoubleSide, depthWrite: false });
      var cfGlow = new THREE.Mesh(cfGlowGeo, cfGlowMat);
      cfGlow.name = 'flameGlow';
      cfGlow.position.y = 0.5 * scale;
      group.add(cfGlow);

      // Embers (glowing particles)
      var emberGeo = new THREE.SphereGeometry(0.02 * scale, 4, 4);
      for (var ei = 0; ei < 5; ei++) {
        var angle = (ei / 5) * Math.PI * 2 + 0.2;
        var radialDist = 0.12 + (ei * 0.037 % 0.08);
        var emberY = 0.14 + (ei * 0.047 % 0.1);
        var emberMat = new THREE.MeshBasicMaterial({ color: ei % 2 === 0 ? 0xFF4400 : 0xFF6622, transparent: true, opacity: isPreview ? 0.2 : 0.7 });
        var ember = new THREE.Mesh(emberGeo, emberMat);
        ember.name = 'ember' + ei;
        ember.position.set(Math.cos(angle) * radialDist * scale, emberY * scale, Math.sin(angle) * radialDist * scale);
        ember.userData.baseY = ember.position.y;
        ember.userData.emberPhase = ei * 1.7;
        group.add(ember);
      }

      var cfShadow = new THREE.CircleGeometry(0.5 * scale, 12);
      var cfShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: isPreview ? 0.1 : 0.15 });
      var cfShadowMesh = new THREE.Mesh(cfShadow, cfShadowMat);
      cfShadowMesh.rotation.x = -Math.PI / 2;
      cfShadowMesh.position.y = 0.02;
      group.add(cfShadowMesh);

      return group;
    }

    // === WATCHTOWER ===
    if (shape === 'watchtower') {
      var towerWoodMat = new THREE.MeshLambertMaterial({ color: color || 0x7B5A3A, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var towerRoofMat = new THREE.MeshLambertMaterial({ color: roofColor || 0x5B2C22, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var towerMetalMat = new THREE.MeshLambertMaterial({ color: 0x8a8f96, transparent: isPreview, opacity: isPreview ? 0.55 : 1.0 });
      var towerHeight = level >= 2 ? 1.65 : 1.35;
      var platformY = towerHeight * scale;

      var legGeo = new THREE.BoxGeometry(0.08 * scale, towerHeight * scale, 0.08 * scale);
      [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34]].forEach(function(pos) {
        var leg = new THREE.Mesh(legGeo, towerWoodMat);
        leg.position.set(pos[0] * scale, (towerHeight * 0.5) * scale, pos[1] * scale);
        leg.castShadow = !isPreview;
        group.add(leg);
      });

      var braceGeo = new THREE.BoxGeometry(0.07 * scale, 0.95 * scale, 0.05 * scale);
      [[0.22, 0], [-0.22, 0]].forEach(function(offsetX) {
        var braceFront = new THREE.Mesh(braceGeo, towerWoodMat);
        braceFront.position.set(offsetX * scale, 0.5 * towerHeight * scale, 0.34 * scale);
        braceFront.rotation.z = offsetX > 0 ? 0.62 : -0.62;
        group.add(braceFront);

        var braceBack = new THREE.Mesh(braceGeo, towerWoodMat);
        braceBack.position.set(offsetX * scale, 0.5 * towerHeight * scale, -0.34 * scale);
        braceBack.rotation.z = offsetX > 0 ? 0.62 : -0.62;
        group.add(braceBack);
      });

      var platformGeo = new THREE.BoxGeometry(0.95 * scale, 0.12 * scale, 0.95 * scale);
      var platform = new THREE.Mesh(platformGeo, towerWoodMat);
      platform.position.y = platformY;
      platform.receiveShadow = !isPreview;
      group.add(platform);

      var railGeoLong = new THREE.BoxGeometry(0.88 * scale, 0.08 * scale, 0.06 * scale);
      var railGeoShort = new THREE.BoxGeometry(0.06 * scale, 0.08 * scale, 0.88 * scale);
      [[0, -0.41], [0, 0.41]].forEach(function(pos) {
        var rail = new THREE.Mesh(railGeoLong, towerWoodMat);
        rail.position.set(pos[0], platformY + 0.18 * scale, pos[1] * scale);
        group.add(rail);
      });
      [[-0.41, 0], [0.41, 0]].forEach(function(pos) {
        var railSide = new THREE.Mesh(railGeoShort, towerWoodMat);
        railSide.position.set(pos[0] * scale, platformY + 0.18 * scale, pos[1]);
        group.add(railSide);
      });

      var ladderGeo = new THREE.BoxGeometry(0.05 * scale, 1.05 * scale, 0.02 * scale);
      var ladderLeft = new THREE.Mesh(ladderGeo, towerWoodMat);
      ladderLeft.position.set(-0.12 * scale, 0.54 * scale, 0.45 * scale);
      ladderLeft.rotation.x = -0.12;
      group.add(ladderLeft);
      var ladderRight = new THREE.Mesh(ladderGeo, towerWoodMat);
      ladderRight.position.set(0.02 * scale, 0.54 * scale, 0.45 * scale);
      ladderRight.rotation.x = -0.12;
      group.add(ladderRight);
      for (var rungIndex = 0; rungIndex < 5; rungIndex++) {
        var rungGeo = new THREE.BoxGeometry(0.18 * scale, 0.02 * scale, 0.03 * scale);
        var rung = new THREE.Mesh(rungGeo, towerWoodMat);
        rung.position.set(-0.05 * scale, (0.2 + rungIndex * 0.18) * scale, 0.45 * scale);
        group.add(rung);
      }

      var roofGeoTower = new THREE.ConeGeometry(0.62 * scale, 0.34 * scale, 4);
      var roofTower = new THREE.Mesh(roofGeoTower, towerRoofMat);
      roofTower.position.y = platformY + 0.46 * scale;
      roofTower.rotation.y = Math.PI / 4;
      roofTower.castShadow = !isPreview;
      group.add(roofTower);

      var bowGeo = new THREE.TorusGeometry(0.12 * scale, 0.012 * scale, 5, 12, Math.PI);
      var bow = new THREE.Mesh(bowGeo, towerWoodMat);
      bow.rotation.z = Math.PI / 2;
      bow.position.set(0.18 * scale, platformY + 0.1 * scale, 0.06 * scale);
      group.add(bow);

      var arrowRackGeo = new THREE.BoxGeometry(0.18 * scale, 0.05 * scale, 0.08 * scale);
      var arrowRack = new THREE.Mesh(arrowRackGeo, towerWoodMat);
      arrowRack.position.set(-0.18 * scale, platformY + 0.08 * scale, -0.12 * scale);
      group.add(arrowRack);
      for (var arrowIndex = 0; arrowIndex < 3; arrowIndex++) {
        var arrowGeo = new THREE.CylinderGeometry(0.006 * scale, 0.006 * scale, 0.2 * scale, 5);
        var arrow = new THREE.Mesh(arrowGeo, towerMetalMat);
        arrow.rotation.z = Math.PI / 2;
        arrow.position.set(-0.18 * scale, platformY + 0.12 * scale, -0.16 * scale + arrowIndex * 0.05 * scale);
        group.add(arrow);
      }

      if (level >= 2) {
        var bannerPoleGeo = new THREE.CylinderGeometry(0.014 * scale, 0.014 * scale, 0.5 * scale, 6);
        var bannerPole = new THREE.Mesh(bannerPoleGeo, towerWoodMat);
        bannerPole.position.set(0.3 * scale, platformY + 0.42 * scale, 0.28 * scale);
        group.add(bannerPole);

        var bannerGeo = new THREE.PlaneGeometry(0.22 * scale, 0.14 * scale);
        var bannerMat = new THREE.MeshLambertMaterial({ color: 0xC44B32, transparent: isPreview, opacity: isPreview ? 0.5 : 0.95, side: THREE.DoubleSide });
        var banner = new THREE.Mesh(bannerGeo, bannerMat);
        banner.position.set(0.4 * scale, platformY + 0.46 * scale, 0.28 * scale);
        group.add(banner);
      }

      var towerShadowGeo = new THREE.CircleGeometry(0.72 * scale, 16);
      var towerShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: isPreview ? 0.08 : 0.14 });
      var towerShadow = new THREE.Mesh(towerShadowGeo, towerShadowMat);
      towerShadow.rotation.x = -Math.PI / 2;
      towerShadow.position.y = 0.02;
      group.add(towerShadow);

      return group;
    }

    // === WELL ===
    if (shape === 'well') {
      var stoneMat = new THREE.MeshLambertMaterial({ color: 0x7f8891, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var woodMat = new THREE.MeshLambertMaterial({ color: 0x7b532d, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var roofMatWell = new THREE.MeshLambertMaterial({ color: roofColor || 0x5b3d21, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });

      var baseGeo = new THREE.CylinderGeometry(0.42 * scale, 0.46 * scale, 0.24 * scale, 12);
      var baseMesh = new THREE.Mesh(baseGeo, stoneMat);
      baseMesh.position.y = 0.12 * scale;
      baseMesh.castShadow = !isPreview;
      baseMesh.receiveShadow = !isPreview;
      group.add(baseMesh);

      var innerGeo = new THREE.CylinderGeometry(0.28 * scale, 0.31 * scale, 0.18 * scale, 12);
      var innerMat = new THREE.MeshLambertMaterial({ color: 0x4e5560, transparent: isPreview, opacity: isPreview ? 0.45 : 1.0 });
      var innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.position.y = 0.11 * scale;
      group.add(innerMesh);

      var waterGeo = new THREE.CircleGeometry(0.25 * scale, 18);
      var waterMat = new THREE.MeshBasicMaterial({ color: 0x57c7ff, transparent: true, opacity: isPreview ? 0.2 : 0.55 });
      var waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.y = 0.21 * scale;
      group.add(waterMesh);

      var lipGeo = new THREE.TorusGeometry(0.34 * scale, 0.04 * scale, 8, 16);
      var lipMesh = new THREE.Mesh(lipGeo, stoneMat);
      lipMesh.rotation.x = Math.PI / 2;
      lipMesh.position.y = 0.24 * scale;
      group.add(lipMesh);

      [-0.22, 0.22].forEach(function(postX) {
        var postGeo = new THREE.BoxGeometry(0.07 * scale, 0.8 * scale, 0.07 * scale);
        var post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(postX * scale, 0.58 * scale, 0);
        post.castShadow = !isPreview;
        group.add(post);
      });

      var beamGeo = new THREE.BoxGeometry(0.56 * scale, 0.06 * scale, 0.08 * scale);
      var beam = new THREE.Mesh(beamGeo, woodMat);
      beam.position.set(0, 0.94 * scale, 0);
      group.add(beam);

      var roofGeoWell = new THREE.ConeGeometry(0.42 * scale, 0.28 * scale, 4);
      var roofWell = new THREE.Mesh(roofGeoWell, roofMatWell);
      roofWell.position.y = 1.14 * scale;
      roofWell.rotation.y = Math.PI / 4;
      roofWell.castShadow = !isPreview;
      group.add(roofWell);

      var crankGeo = new THREE.CylinderGeometry(0.025 * scale, 0.025 * scale, 0.38 * scale, 6);
      var crank = new THREE.Mesh(crankGeo, woodMat);
      crank.rotation.z = Math.PI / 2;
      crank.position.set(0, 0.84 * scale, 0);
      group.add(crank);

      var bucketGeo = new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.08 * scale, 8);
      var bucketMat = new THREE.MeshLambertMaterial({ color: 0x8e6b43, transparent: isPreview, opacity: isPreview ? 0.55 : 1.0 });
      var bucket = new THREE.Mesh(bucketGeo, bucketMat);
      bucket.position.set(0.1 * scale, 0.55 * scale, 0.08 * scale);
      group.add(bucket);

      var shadowGeoWell = new THREE.CircleGeometry(0.55 * scale, 16);
      var shadowMatWell = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: isPreview ? 0.08 : 0.14 });
      var shadowWell = new THREE.Mesh(shadowGeoWell, shadowMatWell);
      shadowWell.rotation.x = -Math.PI / 2;
      shadowWell.position.y = 0.02;
      group.add(shadowWell);

      return group;
    }

    // === FARM PLOT ===
    if (shape === 'farm_plot') {
      var isTreeNursery = entity.id === 'building.tree_nursery';
      var plotState = isPreview ? {
        phase: 'empty',
        progress: 0,
        planted: false,
        watered: false,
        ready: false,
        riverBoosted: false
      } : getFarmPlotVisualState(instanceData);
      var soilColor = isTreeNursery
        ? (plotState.watered ? (plotState.riverBoosted ? 0x334422 : 0x3B4B24) : (plotState.planted ? 0x4B5A2D : 0x465427))
        : (plotState.watered ? (plotState.riverBoosted ? 0x3E3321 : 0x493220) : (plotState.planted ? 0x61401D : 0x5B3A1A));
      var borderColor = isTreeNursery ? (plotState.riverBoosted ? 0x5B8F45 : 0x537437) : (plotState.riverBoosted ? 0x658c41 : 0x7A4B20);
      var borderMat = new THREE.MeshLambertMaterial({ color: borderColor, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var soilMat = new THREE.MeshLambertMaterial({ color: soilColor, transparent: isPreview, opacity: isPreview ? 0.55 : 1.0 });

      var soilGeo = new THREE.BoxGeometry(0.9 * scale, 0.12 * scale, 0.9 * scale);
      var soil = new THREE.Mesh(soilGeo, soilMat);
      soil.position.y = 0.06 * scale;
      soil.receiveShadow = !isPreview;
      group.add(soil);

      var frameGeoLong = new THREE.BoxGeometry(0.95 * scale, 0.1 * scale, 0.08 * scale);
      var frameGeoShort = new THREE.BoxGeometry(0.08 * scale, 0.1 * scale, 0.95 * scale);
      [[0, -0.44], [0, 0.44]].forEach(function(pos) {
        var plank = new THREE.Mesh(frameGeoLong, borderMat);
        plank.position.set(pos[0], 0.08 * scale, pos[1] * scale);
        group.add(plank);
      });
      [[-0.44, 0], [0.44, 0]].forEach(function(pos) {
        var plank = new THREE.Mesh(frameGeoShort, borderMat);
        plank.position.set(pos[0] * scale, 0.08 * scale, pos[1]);
        group.add(plank);
      });

      for (var row = -1; row <= 1; row++) {
        var furrowGeo = new THREE.BoxGeometry(0.8 * scale, 0.03 * scale, 0.04 * scale);
        var furrow = new THREE.Mesh(furrowGeo, new THREE.MeshLambertMaterial({ color: 0x4A2D12, transparent: isPreview, opacity: isPreview ? 0.45 : 1.0 }));
        furrow.position.set(0, 0.13 * scale, row * 0.22 * scale);
        group.add(furrow);
      }

      if (plotState.watered || plotState.riverBoosted) {
        var waterMat = new THREE.MeshBasicMaterial({ color: plotState.riverBoosted ? 0x6bd6ff : 0x57c7ff, transparent: true, opacity: isPreview ? 0.18 : 0.42 });
        for (var channelIndex = -1; channelIndex <= 1; channelIndex++) {
          var waterGeo = new THREE.BoxGeometry(0.78 * scale, 0.012 * scale, 0.05 * scale);
          var waterStrip = new THREE.Mesh(waterGeo, waterMat);
          waterStrip.position.set(0, 0.145 * scale, channelIndex * 0.22 * scale);
          group.add(waterStrip);
        }
      }

      if (!plotState.planted) {
        var seedMat = new THREE.MeshLambertMaterial({ color: isTreeNursery ? 0x7f5a32 : 0xc49a6c, transparent: isPreview, opacity: isPreview ? 0.4 : 0.9 });
        for (var seedIndex = 0; seedIndex < 6; seedIndex++) {
          var seedGeo = new THREE.SphereGeometry(0.012 * scale, 4, 3);
          var seed = new THREE.Mesh(seedGeo, seedMat);
          seed.position.set(((seedIndex % 3) - 1) * 0.22 * scale, 0.14 * scale, (Math.floor(seedIndex / 3) - 0.5) * 0.28 * scale);
          group.add(seed);
        }
      } else {
        if (isTreeNursery) {
          var saplingStyle = {
            stemColor: plotState.ready ? 0x755128 : 0x6a4a22,
            leafColor: plotState.riverBoosted ? 0x5fbe59 : (plotState.ready ? 0x4a9b44 : (plotState.watered ? 0x4f9f47 : 0x648b3f)),
            height: plotState.ready ? 0.42 : (0.14 + plotState.progress * (plotState.watered ? 0.24 : 0.18)),
            leafRadius: plotState.ready ? 0.055 : (plotState.progress >= 0.5 ? 0.045 : 0.032),
            leafHeight: plotState.ready ? 0.24 : (plotState.progress >= 0.5 ? 0.18 : 0.14),
            bulbColor: 0x8B5A2B,
            bulbRadius: 0.01,
            hasBulb: false
          };

          for (var saplingIndex = 0; saplingIndex < 4; saplingIndex++) {
            addFarmPlant(
              group,
              ((saplingIndex % 2) - 0.5) * 0.36 * scale,
              (Math.floor(saplingIndex / 2) - 0.5) * 0.38 * scale,
              scale,
              saplingStyle,
              isPreview
            );
          }

          if (plotState.ready) {
            var logMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B, transparent: isPreview, opacity: isPreview ? 0.45 : 1.0 });
            for (var logIndex = 0; logIndex < 3; logIndex++) {
              var logGeo = new THREE.CylinderGeometry(0.035 * scale, 0.04 * scale, 0.18 * scale, 6);
              var logMesh = new THREE.Mesh(logGeo, logMat);
              logMesh.rotation.z = Math.PI / 2;
              logMesh.position.set(-0.18 * scale + logIndex * 0.18 * scale, 0.12 * scale, 0.3 * scale);
              group.add(logMesh);
            }
          }
        } else {
          var plantStyle = {
            stemColor: plotState.watered ? 0x4f7b2c : 0x6f7a2f,
            leafColor: plotState.riverBoosted ? 0x66b84c : (plotState.ready ? 0x86bf48 : (plotState.watered ? 0x5ba93f : 0x789245)),
            height: plotState.ready ? 0.34 : (0.12 + plotState.progress * (plotState.watered ? 0.2 : 0.14)),
            leafRadius: plotState.ready ? 0.04 : (plotState.progress >= 0.5 ? 0.034 : 0.028),
            leafHeight: plotState.ready ? 0.18 : (plotState.progress >= 0.5 ? 0.15 : 0.12),
            bulbColor: plotState.riverBoosted ? 0xffb347 : 0xf59e42,
            bulbRadius: plotState.ready ? 0.028 : 0.02,
            hasBulb: plotState.ready
          };

          for (var plantIndex = 0; plantIndex < 6; plantIndex++) {
            addFarmPlant(
              group,
              ((plantIndex % 3) - 1) * 0.22 * scale,
              (Math.floor(plantIndex / 3) - 0.5) * 0.28 * scale,
              scale,
              plantStyle,
              isPreview
            );
          }

          if (plotState.ready) {
            var harvestMat = new THREE.MeshLambertMaterial({ color: plotState.riverBoosted ? 0xffc867 : 0xf5b04c, transparent: isPreview, opacity: isPreview ? 0.45 : 1.0 });
            for (var readyIndex = 0; readyIndex < 3; readyIndex++) {
              var harvestGeo = new THREE.DodecahedronGeometry(0.035 * scale, 0);
              var harvestPile = new THREE.Mesh(harvestGeo, harvestMat);
              harvestPile.position.set(-0.2 * scale + readyIndex * 0.18 * scale, 0.12 * scale, 0.33 * scale);
              harvestPile.rotation.set(readyIndex * 0.4, readyIndex * 0.2, 0);
              group.add(harvestPile);
            }
          }
        }
      }

      var plotShadowGeo = new THREE.CircleGeometry(0.58 * scale, 16);
      var plotShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: isPreview ? 0.08 : 0.14 });
      var plotShadow = new THREE.Mesh(plotShadowGeo, plotShadowMat);
      plotShadow.rotation.x = -Math.PI / 2;
      plotShadow.position.y = 0.02;
      group.add(plotShadow);

      return group;
    }

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

    // === Building-type specific details ===
    if (!isPreview) {
      var buildingId = entity.id || '';
      var detailMat = new THREE.MeshLambertMaterial({ color: color, transparent: false, opacity: 1.0 });

      if (buildingId === 'building.wood_cutter') {
        // Axe detail leaned against side
        var axeHandleGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.4 * scale, 4);
        var axeHandle = new THREE.Mesh(axeHandleGeo, new THREE.MeshLambertMaterial({ color: 0x8B6914 }));
        axeHandle.position.set(0.45 * scale, 0.15 * scale, 0.1 * scale);
        axeHandle.rotation.z = 0.4;
        group.add(axeHandle);
        var axeHeadGeo = new THREE.BoxGeometry(0.1 * scale, 0.06 * scale, 0.02 * scale);
        var axeHead = new THREE.Mesh(axeHeadGeo, new THREE.MeshLambertMaterial({ color: 0x808080 }));
        axeHead.position.set(0.42 * scale, 0.32 * scale, 0.1 * scale);
        group.add(axeHead);
      } else if (buildingId === 'building.stone_quarry') {
        // Rock pile + pickaxe
        var pileGeo = new THREE.DodecahedronGeometry(0.08 * scale, 0);
        var pileMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
        for (var pi = 0; pi < 3; pi++) {
          var pileStone = new THREE.Mesh(pileGeo, pileMat);
          pileStone.position.set(0.4 * scale + pi * 0.08 * scale, 0.06 * scale, 0.2 * scale);
          pileStone.rotation.set(pi * 0.5, pi * 0.3, 0);
          group.add(pileStone);
        }
      } else if (buildingId === 'building.berry_gatherer') {
        // Multi-purpose house supplies
        var basketGeo = new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.06 * scale, 6);
        var basketMat = new THREE.MeshLambertMaterial({ color: 0xBEAA78 });
        var basket = new THREE.Mesh(basketGeo, basketMat);
        basket.position.set(0.4 * scale, 0.05 * scale, 0.2 * scale);
        group.add(basket);

        var logGeo = new THREE.CylinderGeometry(0.035 * scale, 0.035 * scale, 0.16 * scale, 6);
        var logMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
        var logPile = new THREE.Mesh(logGeo, logMat);
        logPile.position.set(0.3 * scale, 0.08 * scale, 0.28 * scale);
        logPile.rotation.z = Math.PI / 2;
        group.add(logPile);

        var stoneGeo = new THREE.DodecahedronGeometry(0.05 * scale, 0);
        var stoneMat = new THREE.MeshLambertMaterial({ color: 0x7f7f7f });
        var sideStone = new THREE.Mesh(stoneGeo, stoneMat);
        sideStone.position.set(0.48 * scale, 0.05 * scale, 0.28 * scale);
        group.add(sideStone);

        var flintGeo = new THREE.ConeGeometry(0.05 * scale, 0.12 * scale, 4);
        var flintMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
        var flintShard = new THREE.Mesh(flintGeo, flintMat);
        flintShard.position.set(0.38 * scale, 0.08 * scale, 0.12 * scale);
        flintShard.rotation.z = -0.35;
        group.add(flintShard);
      } else if (buildingId === 'building.flint_mine') {
        // Sharp flint piece on side
        var flintGeo = new THREE.ConeGeometry(0.06 * scale, 0.15 * scale, 4);
        var flintMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
        var flintDetail = new THREE.Mesh(flintGeo, flintMat);
        flintDetail.position.set(0.45 * scale, 0.1 * scale, 0.15 * scale);
        flintDetail.rotation.z = -0.5;
        group.add(flintDetail);
      } else if (buildingId === 'building.warehouse') {
        // Larger double-door + chest icon
        var chestGeo = new THREE.BoxGeometry(0.12 * scale, 0.08 * scale, 0.1 * scale);
        var chestMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
        var chest = new THREE.Mesh(chestGeo, chestMat);
        chest.position.set(0.4 * scale, 0.04 * scale, 0.25 * scale);
        group.add(chest);
      } else if (buildingId === 'building.barracks') {
        // Flag on top
        var poleGeo2 = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.35 * scale, 4);
        var flagPole = new THREE.Mesh(poleGeo2, new THREE.MeshLambertMaterial({ color: 0x654321 }));
        flagPole.position.set(0.3 * scale, (0.6 + roofH * 0.5) * scale, 0);
        group.add(flagPole);
        var flagGeo = new THREE.PlaneGeometry(0.15 * scale, 0.1 * scale);
        var flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: 0xcc3333, side: THREE.DoubleSide }));
        flag.position.set(0.37 * scale, (0.6 + roofH * 0.5 + 0.07) * scale, 0);
        group.add(flag);
      } else if (buildingId === 'building.smelter' || buildingId === 'building.blast_furnace') {
        // Chimney with orange glow inside
        var smeltChimGeo = new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.2 * scale, 6);
        var smeltChimMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        var smeltChim = new THREE.Mesh(smeltChimGeo, smeltChimMat);
        smeltChim.position.set(0, (0.6 + roofH * 0.8) * scale, 0);
        group.add(smeltChim);
        var glowGeo = new THREE.SphereGeometry(0.03 * scale, 6, 4);
        var glowMat = new THREE.MeshBasicMaterial({ color: 0xFF6600, transparent: true, opacity: 0.6 });
        var glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(0, (0.6 + roofH * 0.5) * scale, 0.3 * scale);
        group.add(glow);
      } else if (buildingId === 'building.blacksmith') {
        // Anvil in front
        var anvilBaseGeo = new THREE.BoxGeometry(0.1 * scale, 0.04 * scale, 0.08 * scale);
        var anvilMat2 = new THREE.MeshLambertMaterial({ color: 0x444444 });
        var anvilBase = new THREE.Mesh(anvilBaseGeo, anvilMat2);
        anvilBase.position.set(0, 0.02 * scale, 0.5 * scale);
        group.add(anvilBase);
        var anvilTopGeo = new THREE.BoxGeometry(0.08 * scale, 0.06 * scale, 0.06 * scale);
        var anvilTop = new THREE.Mesh(anvilTopGeo, anvilMat2);
        anvilTop.position.set(0, 0.05 * scale, 0.5 * scale);
        group.add(anvilTop);
      } else if (buildingId === 'building.copper_mine' || buildingId === 'building.tin_mine' || buildingId === 'building.iron_mine') {
        // Mine cart
        var cartGeo = new THREE.BoxGeometry(0.12 * scale, 0.06 * scale, 0.08 * scale);
        var cartMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
        var cart = new THREE.Mesh(cartGeo, cartMat);
        cart.position.set(0.35 * scale, 0.03 * scale, 0.3 * scale);
        group.add(cart);
        // Ore pile
        var oreColor = buildingId === 'building.copper_mine' ? 0xB87333 : (buildingId === 'building.tin_mine' ? 0xC0C0C0 : 0x8B7355);
        var oreGeo = new THREE.DodecahedronGeometry(0.04 * scale, 0);
        var orePile = new THREE.Mesh(oreGeo, new THREE.MeshLambertMaterial({ color: oreColor }));
        orePile.position.set(0.45 * scale, 0.04 * scale, 0.2 * scale);
        group.add(orePile);
      } else if (buildingId === 'building.coal_mine') {
        // Coal pile
        var coalGeo = new THREE.SphereGeometry(0.06 * scale, 4, 4);
        var coalMat = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });
        var coalPile = new THREE.Mesh(coalGeo, coalMat);
        coalPile.position.set(0.4 * scale, 0.04 * scale, 0.25 * scale);
        group.add(coalPile);
      }
    }

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

  // === BRIDGE MESH ===
  function createBridgeMesh(entity, level, isPreview, instanceData) {
    if (!entity || !entity.visual) return null;
    level = level || 1;
    var levelScale = 1.0 + (level - 1) * 0.20;
    var scale = (entity.visual.scale || 1.0) * levelScale;
    var color = entity.visual.color || 0x8B4513;
    var group = new THREE.Group();

    // Bridge planks
    for (var pi = -2; pi <= 2; pi++) {
      var plankGeo = new THREE.BoxGeometry(0.7 * scale, 0.05 * scale, 0.15 * scale);
      var plankMat = new THREE.MeshLambertMaterial({ color: color, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
      var plank = new THREE.Mesh(plankGeo, plankMat);
      plank.position.set(0, 0.06 * scale, pi * 0.2 * scale);
      plank.receiveShadow = !isPreview;
      group.add(plank);
    }

    // Side rails
    var railGeo = new THREE.BoxGeometry(0.7 * scale, 0.15 * scale, 0.04 * scale);
    var railMat = new THREE.MeshLambertMaterial({ color: 0x654321, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
    var rail1 = new THREE.Mesh(railGeo, railMat);
    rail1.position.set(0, 0.12 * scale, -0.45 * scale);
    group.add(rail1);
    var rail2 = new THREE.Mesh(railGeo, railMat);
    rail2.position.set(0, 0.12 * scale, 0.45 * scale);
    group.add(rail2);

    // Posts
    var postGeo = new THREE.CylinderGeometry(0.03 * scale, 0.04 * scale, 0.2 * scale, 6);
    var postMat = new THREE.MeshLambertMaterial({ color: 0x654321, transparent: isPreview, opacity: isPreview ? 0.6 : 1.0 });
    var postPositions = [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.4], [0.3, 0.4]];
    for (var pi2 = 0; pi2 < postPositions.length; pi2++) {
      var post = new THREE.Mesh(postGeo, postMat);
      post.position.set(postPositions[pi2][0] * scale, 0.15 * scale, postPositions[pi2][1] * scale);
      group.add(post);
    }

    // Shadow
    var shadowGeo = new THREE.PlaneGeometry(0.8 * scale, 1.0 * scale);
    var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: isPreview ? 0.1 : 0.15 });
    var shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    group.add(shadow);

    return group;
  }

  function createBuildingMeshOrSpecial(entity, level, isPreview, instanceData) {
    if (!entity || !entity.visual) return null;
    var shape = entity.visual.shape || 'building';
    if (shape === 'bridge') {
      return createBridgeMesh(entity, level, isPreview, instanceData);
    }
    return createBuildingMesh(entity, level, isPreview, instanceData);
  }

  function refreshBuilding(uid) {
    var instance = GameState.getInstance(uid);
    if (!instance) return false;

    var entity = GameRegistry.getEntity(instance.entityId);
    if (!entity) return false;

    var scene = GameScene.getScene();
    var existingMesh = getInstanceMesh(uid);

    var mesh = createBuildingMeshOrSpecial(entity, instance.level || 1, false, instance);
    if (!mesh) return false;

    var position = existingMesh ? existingMesh.position : { x: instance.x, y: 0, z: instance.z };
    var currentScale = existingMesh ? existingMesh.scale : { x: 1, y: 1, z: 1 };
    mesh.position.set(position.x, position.y, position.z);
    mesh.scale.set(currentScale.x, currentScale.y, currentScale.z);

    if (existingMesh) {
      scene.remove(existingMesh);
      unregisterInstanceMesh(uid);
    }
    registerInstanceMesh(uid, mesh);
    scene.add(mesh);
    return true;
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
      if (!GameState.hasSpendableResource(resId, balance.cost[resId])) {
        var resEntity = GameRegistry.getEntity(resId);
        GameHUD.showError("Not enough " + (resEntity ? resEntity.name : resId) + ".");
        return;
      }
    }

    // Create preview mesh
    var mesh = createBuildingMeshOrSpecial(entity, 1, true);
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
    if (window.RangeIndicator && RangeIndicator.showPlacementPreview) {
      RangeIndicator.showPlacementPreview(buildingId, snapX, snapZ);
    }
    GameHUD.showNotification("Choose a build tile. Click to place, ESC to cancel.");
  }

  function updatePreviewColor(worldX, worldZ) {
    if (!_buildMode.previewMesh) return;
    var result = canPlaceAt(worldX, worldZ, _buildMode.buildingId);
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
    if (window.RangeIndicator && RangeIndicator.showPlacementPreview) {
      RangeIndicator.showPlacementPreview(_buildMode.buildingId, snapX, snapZ);
    }
  }

  function confirmBuild() {
    if (!_buildMode.active || !_buildMode.previewMesh) return;
    if (!_buildMode.lastValidPos) {
      GameHUD.showError("Invalid build position.");
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
    if (window.RangeIndicator && RangeIndicator.hidePlacementPreview) {
      RangeIndicator.hidePlacementPreview();
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
      if (!GameState.hasSpendableResource(resId, balance.cost[resId])) {
        var resEntity = GameRegistry.getEntity(resId);
        GameHUD.showError("Not enough " + (resEntity ? resEntity.name : resId) + ".");
        return false;
      }
    }

    // Deduct cost
    for (var resId in balance.cost) {
      GameState.consumeSpendableResource(resId, balance.cost[resId]);
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

    if (balance && balance.isBridge && typeof WaterSystem !== 'undefined') {
      instanceData.bridgeBaseWaterType = WaterSystem.isDeepWater(worldX, worldZ) ? 'deep' : 'shallow';
    }

    var tileKey = worldX + "," + worldZ;
    _reservedTiles[tileKey] = true;
    GameState.addInstance(uid, instanceData);
    GameState.addBuilding(buildingId);

    // Create 3D mesh
    var entity = GameRegistry.getEntity(buildingId);
    var mesh = createBuildingMeshOrSpecial(entity, 1, false, instanceData);
    if (mesh) {
      mesh.position.set(worldX, 0, worldZ);
      registerInstanceMesh(uid, mesh);
      // Construction animation: scale from 0 to 1
      mesh.scale.set(0.01, 0.01, 0.01);
      GameScene.getScene().add(mesh);
      var buildStart2 = performance.now();
      function animateBuild2() {
        var elapsed = performance.now() - buildStart2;
        var t = Math.min(1, elapsed / 500);
        var bounce = t < 0.8 ? t / 0.8 : 1 + (1 - (t - 0.8) / 0.2) * 0.05;
        mesh.scale.set(bounce, bounce, bounce);
        if (t < 1) requestAnimationFrame(animateBuild2);
        else mesh.scale.set(1, 1, 1);
      }
      requestAnimationFrame(animateBuild2);
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
    if (window.NPCSystem && NPCSystem.clearPathCache) {
      NPCSystem.clearPathCache();
    }

    // Register fire light if building has lightRadius
    if (window.FireSystem && balance && balance.lightRadius) {
      FireSystem.addFire(uid, instanceData);
    }

    // Mark water tile as walkable if bridge
    if (balance && balance.isBridge && typeof WaterSystem !== 'undefined') {
      WaterSystem.setWaterTile(worldX, worldZ, 'bridge');
    }

    UnlockSystem.checkAll();
    GameHUD.renderAll();
    GameStorage.save();
    GameHUD.showSuccess("Built: " + (entity ? entity.name : buildingId));
    if (buildingId === 'building.campfire' && typeof GamePlayer !== 'undefined' && GamePlayer.triggerSpeechCue) {
      GamePlayer.triggerSpeechCue('fireAction');
    }
    return true;
  }

  function destroyBuilding(uid) {
    var instance = GameState.getInstance(uid);
    if (!instance) return false;

    // Despawn NPCs for this building
    if (window.NPCSystem && NPCSystem.despawnWorkersForBuilding) {
      NPCSystem.despawnWorkersForBuilding(uid);
    }
    if (window.NPCSystem && NPCSystem.clearPathCache) {
      NPCSystem.clearPathCache();
    }

    // Remove mesh from scene
    var scene = GameScene.getScene();
    var buildingMesh = getInstanceMesh(uid) || findSceneMeshByInstanceUid(uid);
    if (buildingMesh) {
      scene.remove(buildingMesh);
    }
    unregisterInstanceMesh(uid);

    // Release tile reservation
    var tileKey = Math.round(instance.x) + "," + Math.round(instance.z);
    delete _reservedTiles[tileKey];

    // Reset water tile if bridge was destroyed
    var buildingBalance = GameRegistry.getBalance(instance.entityId);
    if (buildingBalance && buildingBalance.isBridge && typeof WaterSystem !== 'undefined') {
      if (instance.bridgeBaseWaterType) {
        WaterSystem.setWaterTile(Math.round(instance.x), Math.round(instance.z), instance.bridgeBaseWaterType);
      } else {
        WaterSystem.removeWaterTile(Math.round(instance.x), Math.round(instance.z));
      }
    }

    // Remove fire light if present
    if (window.FireSystem) {
      FireSystem.removeFire(uid);
    }

    GameState.destroyInstance(uid);
    GameHUD.renderAll();
    GameStorage.save();

    return true;
  }

  return {
    placeAtPlayer: placeAtPlayer,
    placeBuildingAt: placeBuildingAt,
    canPlaceAt: canPlaceAt,
    createBuildingMesh: createBuildingMeshOrSpecial,
    refreshBuilding: refreshBuilding,
    getFarmPlotVisualState: getFarmPlotVisualState,
    isBuildMode: isBuildMode,
    enterBuildMode: enterBuildMode,
    updateBuildPreview: updateBuildPreview,
    confirmBuild: confirmBuild,
    cancelBuild: cancelBuild,
    destroyBuilding: destroyBuilding,
    registerInstanceMesh: registerInstanceMesh,
    getInstanceMesh: getInstanceMesh,
    getInteractiveMeshes: getInteractiveMeshes,
    restoreReservations: restoreReservations,
    _reservedTiles: _reservedTiles
  };
})();
