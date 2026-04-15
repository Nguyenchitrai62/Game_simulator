window.GameTerrain = (function () {
  var CHUNK_SIZE = 16;
  var chunks = {};
  var RENDER_DISTANCE = 2;
  var worldSeed = 42;

  function seededRandom(seed) {
    var x = Math.sin(seed) * 43758.5453123;
    return x - Math.floor(x);
  }

  function chunkSeed(cx, cz) {
    return (cx * 73856093 ^ cz * 19349663) & 0x7FFFFFFF;
  }

  function init(seed) {
    worldSeed = seed || 42;
    chunks = {};
  }

  function getChunkSize() { return CHUNK_SIZE; }

  function update(playerX, playerZ) {
    var pcx = Math.floor(playerX / CHUNK_SIZE);
    var pcz = Math.floor(playerZ / CHUNK_SIZE);

    for (var dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (var dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        var cx = pcx + dx;
        var cz = pcz + dz;
        var key = cx + "," + cz;
        if (!chunks[key]) {
          generateChunk(cx, cz);

          // Mark chunk as explored
          if (GameState.markChunkExplored) {
            GameState.markChunkExplored(cx, cz);
          }

          // Restore saved object states from previous visit
          var savedData = GameState.getChunkData(key);
          if (savedData && savedData.objects) {
            var savedMap = {};
            savedData.objects.forEach(function (obj) { savedMap[obj.id] = obj; });
            if (chunks[key] && chunks[key].objects) {
              chunks[key].objects.forEach(function (obj) {
                if (savedMap[obj.id]) {
                  obj.hp = savedMap[obj.id].hp;
                  obj._destroyed = savedMap[obj.id]._destroyed;
                  // If destroyed, hide the 3D mesh
                  if (obj._destroyed || obj.hp <= 0) {
                    GameEntities.hideObject(obj);
                  }
                }
              });
            }
          }
        }
      }
    }

    // Unload far chunks
    for (var key in chunks) {
      var parts = key.split(",");
      var cx = parseInt(parts[0]);
      var cz = parseInt(parts[1]);
      if (Math.abs(cx - pcx) > RENDER_DISTANCE + 1 || Math.abs(cz - pcz) > RENDER_DISTANCE + 1) {
        // Save object HP states before unloading
        var chunkToUnload = chunks[key];
        if (chunkToUnload.objects) {
          var savedObjects = [];
          chunkToUnload.objects.forEach(function (obj) {
            savedObjects.push({ id: obj.id, hp: obj.hp, _destroyed: !!obj._destroyed });
          });
          GameState.saveChunkData(key, { cx: cx, cz: cz, objects: savedObjects });
        }

        if (chunkToUnload.mesh) {
          GameScene.getScene().remove(chunkToUnload.mesh);
        }

        // Clear water tiles for unloaded chunk
        if (typeof WaterSystem !== 'undefined') {
          WaterSystem.clearWaterForChunk(cx, cz);
        }

        delete chunks[key];
      }
    }
  }

  function generateChunk(cx, cz) {
    var key = cx + "," + cz;
    var seed = chunkSeed(cx, cz) + worldSeed;
    var distFromHome = Math.sqrt(cx * cx + cz * cz);

    var chunkData = {
      cx: cx, cz: cz,
      seed: seed,
      objects: [],
      buildings: [],
      generated: true,
      mesh: null
    };

    // Create terrain mesh
    var group = new THREE.Group();
    group.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

    // Ground plane with biome color
    var groundGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
    var biomeColor;
    if (distFromHome < 2) {
      biomeColor = new THREE.Color(0x7ec850);
    } else if (distFromHome < 4) {
      biomeColor = new THREE.Color(0x6aaa45);
    } else {
      biomeColor = new THREE.Color(0x5a8a3a);
    }
    biomeColor.offsetHSL(0, 0, (seededRandom(seed + 1) - 0.5) * 0.03);
    var groundMat = new THREE.MeshStandardMaterial({ color: biomeColor, roughness: 1, metalness: 0 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(CHUNK_SIZE / 2, 0, CHUNK_SIZE / 2);
    ground.receiveShadow = true;
    group.add(ground);

    // Grid lines
    var gridHelper = new THREE.GridHelper(CHUNK_SIZE, CHUNK_SIZE, 0x5ca03a, 0x5ca03a);
    gridHelper.position.set(CHUNK_SIZE / 2, 0.01, CHUNK_SIZE / 2);
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    group.add(gridHelper);

    var rng = function (offset) { return seededRandom(seed + offset); };

    // Grass tufts decoration
    var grassCount = Math.floor(rng(5000) * 6) + 3;
    for (var gi = 0; gi < grassCount; gi++) {
      var gx = Math.floor(rng(5000 + gi * 3) * CHUNK_SIZE);
      var gz = Math.floor(rng(5001 + gi * 3) * CHUNK_SIZE);
      if (cx === 0 && cz === 0 && gx > 6 && gx < 10 && gz > 6 && gz < 10) continue;
      var grassGroup = createGrassTuft(gx, gz, seed + gi);
      group.add(grassGroup);
      if (typeof AtmosphereSystem !== 'undefined') {
        AtmosphereSystem.registerWindTarget(grassGroup, 'grass');
      }
    }

    // Flower clusters decoration
    var flowerCount = Math.floor(rng(6000) * 3) + 1;
    var flowerColors = [0xFFDD44, 0xFF6688, 0xFFFFFF, 0xBB66FF];
    for (var fi = 0; fi < flowerCount; fi++) {
      var fx = Math.floor(rng(6000 + fi * 2) * CHUNK_SIZE);
      var fz = Math.floor(rng(6001 + fi * 2) * CHUNK_SIZE);
      if (cx === 0 && cz === 0 && fx > 6 && fx < 10 && fz > 6 && fz < 10) continue;
      var flowerGroup = createFlowerCluster(fx, fz, flowerColors[fi % flowerColors.length], seed + fi);
      group.add(flowerGroup);
    }

    // Generate objects based on distance from home
    var treeCount;
    if (distFromHome < 1) treeCount = 8 + Math.floor(rng(10) * 5);
    else if (distFromHome < 3) treeCount = 5 + Math.floor(rng(10) * 6);
    else treeCount = 2 + Math.floor(rng(10) * 4);

    // Get player position to avoid spawning on player
    var playerPos = (typeof GamePlayer !== 'undefined' && GamePlayer.getPosition) ? GamePlayer.getPosition() : { x: 8, z: 8 };

    for (var i = 0; i < treeCount; i++) {
      var tx = Math.floor(rng(100 + i * 2) * CHUNK_SIZE);
      var tz = Math.floor(rng(101 + i * 2) * CHUNK_SIZE);
      var worldTreeX = cx * CHUNK_SIZE + tx;
      var worldTreeZ = cz * CHUNK_SIZE + tz;
      
      // Skip if: 1) In home spawn zone, or 2) Within 2 units of player
      if (cx === 0 && cz === 0 && tx > 6 && tx < 10 && tz > 6 && tz < 10) continue;
      if (Math.abs(worldTreeX - playerPos.x) < 2 && Math.abs(worldTreeZ - playerPos.z) < 2) continue;
      
      var treeHp = (window.GAME_BALANCE["node.tree"] || {}).hp || 3;
      chunkData.objects.push({
        id: "obj_" + key + "_" + i,
        type: "node.tree",
        x: tx, z: tz,
        hp: treeHp, maxHp: treeHp,
        worldX: worldTreeX,
        worldZ: worldTreeZ
      });
    }

    // Rocks
    var rockCount;
    if (distFromHome < 1) rockCount = 2 + Math.floor(rng(20) * 2);
    else if (distFromHome < 3) rockCount = 3 + Math.floor(rng(20) * 4);
    else rockCount = 4 + Math.floor(rng(20) * 5);

    var rockHp = (window.GAME_BALANCE["node.rock"] || {}).hp || 5;
    for (var i = 0; i < rockCount; i++) {
      var rx = Math.floor(rng(200 + i * 2) * CHUNK_SIZE);
      var rz = Math.floor(rng(201 + i * 2) * CHUNK_SIZE);
      var worldRockX = cx * CHUNK_SIZE + rx;
      var worldRockZ = cz * CHUNK_SIZE + rz;
      
      // Skip if: 1) In home spawn zone, or 2) Within 2 units of player
      if (cx === 0 && cz === 0 && rx > 6 && rx < 10 && rz > 6 && rz < 10) continue;
      if (Math.abs(worldRockX - playerPos.x) < 2 && Math.abs(worldRockZ - playerPos.z) < 2) continue;
      
      chunkData.objects.push({
        id: "obj_" + key + "_r" + i,
        type: "node.rock",
        x: rx, z: rz,
        hp: rockHp, maxHp: rockHp,
        worldX: worldRockX,
        worldZ: worldRockZ
      });
    }

    // Berry bushes (near home - more frequent for Berry Gatherer building)
    if (distFromHome < 1) {
      // Home area: many bushes (6-10)
      var bushCount = 6 + Math.floor(rng(30) * 5);
      var bushHp = (window.GAME_BALANCE["node.berry_bush"] || {}).hp || 1;
      for (var i = 0; i < bushCount; i++) {
        var bx = Math.floor(rng(300 + i * 2) * CHUNK_SIZE);
        var bz = Math.floor(rng(301 + i * 2) * CHUNK_SIZE);
        var worldBushX = cx * CHUNK_SIZE + bx;
        var worldBushZ = cz * CHUNK_SIZE + bz;
        
        // Skip if: 1) In home spawn zone, or 2) Within 2 units of player
        if (cx === 0 && cz === 0 && bx > 6 && bx < 10 && bz > 6 && bz < 10) continue;
        if (Math.abs(worldBushX - playerPos.x) < 2 && Math.abs(worldBushZ - playerPos.z) < 2) continue;
        
        chunkData.objects.push({
          id: "obj_" + key + "_b" + i,
          type: "node.berry_bush",
          x: bx, z: bz,
          hp: bushHp, maxHp: bushHp,
          worldX: worldBushX,
          worldZ: worldBushZ
        });
      }
    } else if (distFromHome < 3) {
      // Near home: moderate bushes (3-6)
      var bushCount = 3 + Math.floor(rng(30) * 4);
      var bushHp = (window.GAME_BALANCE["node.berry_bush"] || {}).hp || 1;
      for (var i = 0; i < bushCount; i++) {
        var bx = Math.floor(rng(300 + i * 2) * CHUNK_SIZE);
        var bz = Math.floor(rng(301 + i * 2) * CHUNK_SIZE);
        var worldBushX = cx * CHUNK_SIZE + bx;
        var worldBushZ = cz * CHUNK_SIZE + bz;
        
        // Skip if within 2 units of player
        if (Math.abs(worldBushX - playerPos.x) < 2 && Math.abs(worldBushZ - playerPos.z) < 2) continue;
        
        chunkData.objects.push({
          id: "obj_" + key + "_b" + i,
          type: "node.berry_bush",
          x: bx, z: bz,
          hp: bushHp, maxHp: bushHp,
          worldX: worldBushX,
          worldZ: worldBushZ
        });
      }
    }

    // Animals (further from home = more/dangerous)
    if (distFromHome >= 1) {
      var animalCount = Math.min(Math.floor(distFromHome), 3);
      for (var i = 0; i < animalCount; i++) {
        var ax = Math.floor(rng(400 + i * 2) * CHUNK_SIZE);
        var az = Math.floor(rng(401 + i * 2) * CHUNK_SIZE);
        var worldAnimalX = cx * CHUNK_SIZE + ax;
        var worldAnimalZ = cz * CHUNK_SIZE + az;

        // Skip if player is standing at this position
        var playerPos = GamePlayer.getPosition();
        if (Math.abs(worldAnimalX - playerPos.x) < 2 && Math.abs(worldAnimalZ - playerPos.z) < 2) continue;

        // Animal types based on distance (Iron Age adds bandit, sabertooth)
        var currentAge = GameState.getAge();
        var animalType;
        
        if (currentAge === "age.iron" && distFromHome >= 8) {
          // Iron Age: Very far = Sabertooth (apex predator)
          animalType = rng(410 + i) > 0.5 ? "animal.sabertooth" : "animal.bandit";
        } else if (currentAge === "age.iron" && distFromHome >= 6) {
          // Iron Age: Far = Bandits or Lions
          animalType = rng(410 + i) > 0.5 ? "animal.bandit" : "animal.lion";
        } else if (distFromHome >= 6) {
          animalType = "animal.lion";
        } else if (distFromHome >= 4) {
          animalType = "animal.bear";
        } else if (distFromHome >= 2) {
          animalType = "animal.boar";
        } else {
          animalType = "animal.wolf";
        }
        
        var animalBalance = window.GAME_BALANCE[animalType] || {};
        var animalHp = animalBalance.hp || 15;
        chunkData.objects.push({
          id: "obj_" + key + "_a" + i,
          type: animalType,
          x: ax, z: az,
          hp: animalHp, maxHp: animalHp,
          worldX: cx * CHUNK_SIZE + ax,
          worldZ: cz * CHUNK_SIZE + az
        });
      }
    }

    // Flint deposits (far chunks)
    if (distFromHome >= 2 && rng(500) > 0.5) {
      var fx = Math.floor(rng(600) * CHUNK_SIZE);
      var fz = Math.floor(rng(601) * CHUNK_SIZE);
      var flintHp = (window.GAME_BALANCE["node.flint_deposit"] || {}).hp || 4;
      chunkData.objects.push({
        id: "obj_" + key + "_f0",
        type: "node.flint_deposit",
        x: fx, z: fz,
        hp: flintHp, maxHp: flintHp,
        worldX: cx * CHUNK_SIZE + fx,
        worldZ: cz * CHUNK_SIZE + fz
      });
    }

    // Copper deposits (Bronze Age - far chunks)
    if (distFromHome >= 3 && rng(700) > 0.6) {
      var copperX = Math.floor(rng(800) * CHUNK_SIZE);
      var copperZ = Math.floor(rng(801) * CHUNK_SIZE);
      var copperHp = (window.GAME_BALANCE["node.copper_deposit"] || {}).hp || 6;
      chunkData.objects.push({
        id: "obj_" + key + "_copper0",
        type: "node.copper_deposit",
        x: copperX, z: copperZ,
        hp: copperHp, maxHp: copperHp,
        worldX: cx * CHUNK_SIZE + copperX,
        worldZ: cz * CHUNK_SIZE + copperZ
      });
    }

    // Tin deposits (Bronze Age - further chunks)
    if (distFromHome >= 4 && rng(900) > 0.65) {
      var tinX = Math.floor(rng(1000) * CHUNK_SIZE);
      var tinZ = Math.floor(rng(1001) * CHUNK_SIZE);
      var tinHp = (window.GAME_BALANCE["node.tin_deposit"] || {}).hp || 5;
      chunkData.objects.push({
        id: "obj_" + key + "_tin0",
        type: "node.tin_deposit",
        x: tinX, z: tinZ,
        hp: tinHp, maxHp: tinHp,
        worldX: cx * CHUNK_SIZE + tinX,
        worldZ: cz * CHUNK_SIZE + tinZ
      });
    }

    // Generate water for this chunk
    if (typeof WaterSystem !== 'undefined') {
      var waterPositions = WaterSystem.generateWaterForChunk(cx, cz, seed);
      if (waterPositions.length > 0) {
        WaterSystem.createWaterMesh(waterPositions, group);
      }
      reapplyBridgeTilesForChunk(cx, cz);
    }

    chunkData.mesh = group;
    chunks[key] = chunkData;
    GameScene.getScene().add(group);

    // Create 3D meshes for objects in this chunk
    if (typeof GameEntities !== 'undefined') {
      GameEntities.createObjectForChunk(chunkData);
    }

    return chunkData;
  }

  function getChunk(cx, cz) {
    return chunks[cx + "," + cz] || null;
  }

  function getChunkAt(worldX, worldZ) {
    var cx = Math.floor(worldX / CHUNK_SIZE);
    var cz = Math.floor(worldZ / CHUNK_SIZE);
    return getChunk(cx, cz);
  }

  function getAllChunks() {
    return chunks;
  }

  function reapplyBridgeTilesForChunk(cx, cz) {
    if (typeof GameState === 'undefined' || typeof WaterSystem === 'undefined') return;

    var instances = GameState.getAllInstances();
    for (var uid in instances) {
      var inst = instances[uid];
      var balance = (typeof GameRegistry !== 'undefined') ? GameRegistry.getBalance(inst.entityId) : null;
      if (!balance || !balance.isBridge) continue;

      var instChunkX = Math.floor(inst.x / CHUNK_SIZE);
      var instChunkZ = Math.floor(inst.z / CHUNK_SIZE);
      if (instChunkX === cx && instChunkZ === cz) {
        WaterSystem.setWaterTile(inst.x, inst.z, 'bridge');
      }
    }
  }

  function isWalkable(worldX, worldZ) {
    var cx = Math.floor(worldX / CHUNK_SIZE);
    var cz = Math.floor(worldZ / CHUNK_SIZE);
    var chunk = getChunk(cx, cz);
    if (!chunk) return false;

    var localX = worldX - cx * CHUNK_SIZE;
    var localZ = worldZ - cz * CHUNK_SIZE;
    if (localX < 0 || localX >= CHUNK_SIZE || localZ < 0 || localZ >= CHUNK_SIZE) return false;

    // Check for solid objects at this position
    for (var i = 0; i < chunk.objects.length; i++) {
      var obj = chunk.objects[i];
      if (obj.hp <= 0 || obj._destroyed) continue;
      var dx = Math.abs(obj.x - localX);
      var dz = Math.abs(obj.z - localZ);
      if (dx < 0.4 && dz < 0.4) return false;
    }

    // Check player-placed buildings
    if (typeof GameState !== 'undefined') {
      var instances = GameState.getAllInstances();
      for (var uid in instances) {
        var inst = instances[uid];
        var instBalance = (typeof GameRegistry !== 'undefined') ? GameRegistry.getBalance(inst.entityId) : null;
        if (instBalance && instBalance.isBridge) continue;
        var bdx = Math.abs(inst.x - worldX);
        var bdz = Math.abs(inst.z - worldZ);
        if (bdx < 0.8 && bdz < 0.8) return false;
      }
    }

    // Check for deep water (not walkable)
    if (typeof WaterSystem !== 'undefined' && WaterSystem.isDeepWater(worldX, worldZ)) {
      return false;
    }

    return true;
  }

  function isShallowWater(worldX, worldZ) {
    if (typeof WaterSystem === 'undefined') return false;
    return WaterSystem.isShallowWater(worldX, worldZ);
  }

  function findNearestObject(worldX, worldZ, maxDist) {
    var nearest = null;
    var nearestDist = maxDist || 3;

    for (var key in chunks) {
      var chunk = chunks[key];
      for (var i = 0; i < chunk.objects.length; i++) {
        var obj = chunk.objects[i];
        if (obj.hp <= 0 || obj._destroyed) continue;
        var dx = obj.worldX - worldX;
        var dz = obj.worldZ - worldZ;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = obj;
        }
      }
    }

    return nearest;
  }

  function restoreChunk(chunkData) {
    var key = chunkData.cx + "," + chunkData.cz;
    if (chunks[key]) return;

    // Re-generate mesh, but keep saved object states
    generateChunk(chunkData.cx, chunkData.cz);

    // Restore saved HP states
    if (chunkData.objects) {
      var savedMap = {};
      chunkData.objects.forEach(function (obj) {
        savedMap[obj.id] = obj;
      });
      if (chunks[key]) {
        chunks[key].objects.forEach(function (obj) {
          if (savedMap[obj.id]) {
            obj.hp = savedMap[obj.id].hp;
          }
        });
      }
    }
  }
  
  var _reservedTiles = {};
  
  function reserveTile(worldX, worldZ) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    _reservedTiles[key] = true;
  }
  
  function releaseTile(worldX, worldZ) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    delete _reservedTiles[key];
  }

  function createGrassTuft(x, z, s) {
    var group = new THREE.Group();
    var grassCount = 3 + Math.floor(seededRandom(s) * 3);
    var baseHue = seededRandom(s + 1) * 0.08 - 0.04;

    for (var i = 0; i < grassCount; i++) {
      var height = 0.10 + seededRandom(s + i * 7) * 0.08;
      var geo = new THREE.ConeGeometry(0.02, height, 3);
      var color = new THREE.Color(0x5a9a3a);
      color.offsetHSL(0, 0, baseHue + (seededRandom(s + i * 11) - 0.5) * 0.06);
      var mat = new THREE.MeshLambertMaterial({ color: color });
      var blade = new THREE.Mesh(geo, mat);
      blade.position.set(
        (seededRandom(s + i * 3) - 0.5) * 0.12,
        height / 2,
        (seededRandom(s + i * 5) - 0.5) * 0.12
      );
      blade.rotation.set(
        (seededRandom(s + i * 13) - 0.5) * 0.3,
        seededRandom(s + i * 9) * Math.PI * 2,
        (seededRandom(s + i * 17) - 0.5) * 0.2
      );
      blade.castShadow = false;
      blade.receiveShadow = false;
      group.add(blade);
    }

    group.position.set(x, 0, z);
    group.userData.isDecoration = true;
    return group;
  }

  function createFlowerCluster(x, z, color, s) {
    var group = new THREE.Group();
    var count = 2 + Math.floor(seededRandom(s + 20) * 3);

    for (var i = 0; i < count; i++) {
      var stemGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.08, 3);
      var stemMat = new THREE.MeshLambertMaterial({ color: 0x4a8a2e });
      var stem = new THREE.Mesh(stemGeo, stemMat);
      var angle = (i / count) * Math.PI * 2 + seededRandom(s + i * 7) * 0.5;
      var radius = 0.06 + seededRandom(s + i * 11) * 0.06;
      stem.position.set(
        Math.cos(angle) * radius,
        0.04,
        Math.sin(angle) * radius
      );
      stem.castShadow = false;
      group.add(stem);

      var petalGeo = new THREE.SphereGeometry(0.02, 4, 3);
      var petalMat = new THREE.MeshLambertMaterial({ color: color });
      var petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(
        stem.position.x,
        0.08 + seededRandom(s + i * 13) * 0.02,
        stem.position.z
      );
      petal.castShadow = false;
      group.add(petal);
    }

    group.position.set(x, 0, z);
    group.userData.isDecoration = true;
    return group;
  }

  return {
    init: init,
    update: update,
    getChunk: getChunk,
    getChunkAt: getChunkAt,
    getAllChunks: getAllChunks,
    getChunkSize: getChunkSize,
    isWalkable: isWalkable,
    isShallowWater: isShallowWater,
    findNearestObject: findNearestObject,
    restoreChunk: restoreChunk,
    seededRandom: seededRandom,
    reserveTile: reserveTile,
    releaseTile: releaseTile,
    _reservedTiles: _reservedTiles
  };
})();
