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
        }
      }
    }

    // Unload far chunks
    for (var key in chunks) {
      var parts = key.split(",");
      var cx = parseInt(parts[0]);
      var cz = parseInt(parts[1]);
      if (Math.abs(cx - pcx) > RENDER_DISTANCE + 1 || Math.abs(cz - pcz) > RENDER_DISTANCE + 1) {
        if (chunks[key].mesh) {
          GameScene.getScene().remove(chunks[key].mesh);
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

    // Ground plane
    var groundGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
    var groundColor = new THREE.Color(0x7ec850);
    groundColor.offsetHSL(0, 0, (seededRandom(seed + 1) - 0.5) * 0.03);
    var groundMat = new THREE.MeshLambertMaterial({ color: groundColor });
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

    // Generate objects based on distance from home
    var rng = function (offset) { return seededRandom(seed + offset); };

    // Trees
    var treeCount;
    if (distFromHome < 1) treeCount = 8 + Math.floor(rng(10) * 5);
    else if (distFromHome < 3) treeCount = 5 + Math.floor(rng(10) * 6);
    else treeCount = 2 + Math.floor(rng(10) * 4);

    for (var i = 0; i < treeCount; i++) {
      var tx = Math.floor(rng(100 + i * 2) * CHUNK_SIZE);
      var tz = Math.floor(rng(101 + i * 2) * CHUNK_SIZE);
      if (cx === 0 && cz === 0 && tx > 6 && tx < 10 && tz > 6 && tz < 10) continue;
      var treeHp = (window.GAME_BALANCE["node.tree"] || {}).hp || 3;
      chunkData.objects.push({
        id: "obj_" + key + "_" + i,
        type: "node.tree",
        x: tx, z: tz,
        hp: treeHp, maxHp: treeHp,
        worldX: cx * CHUNK_SIZE + tx,
        worldZ: cz * CHUNK_SIZE + tz
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
      chunkData.objects.push({
        id: "obj_" + key + "_r" + i,
        type: "node.rock",
        x: rx, z: rz,
        hp: rockHp, maxHp: rockHp,
        worldX: cx * CHUNK_SIZE + rx,
        worldZ: cz * CHUNK_SIZE + rz
      });
    }

    // Berry bushes (near home)
    if (distFromHome < 3) {
      var bushCount = 1 + Math.floor(rng(30) * 3);
      var bushHp = (window.GAME_BALANCE["node.berry_bush"] || {}).hp || 1;
      for (var i = 0; i < bushCount; i++) {
        var bx = Math.floor(rng(300 + i * 2) * CHUNK_SIZE);
        var bz = Math.floor(rng(301 + i * 2) * CHUNK_SIZE);
        chunkData.objects.push({
          id: "obj_" + key + "_b" + i,
          type: "node.berry_bush",
          x: bx, z: bz,
          hp: bushHp, maxHp: bushHp,
          worldX: cx * CHUNK_SIZE + bx,
          worldZ: cz * CHUNK_SIZE + bz
        });
      }
    }

    // Animals (further from home = more/dangerous)
    if (distFromHome >= 1) {
      var animalCount = Math.min(Math.floor(distFromHome), 3);
      for (var i = 0; i < animalCount; i++) {
        var ax = Math.floor(rng(400 + i * 2) * CHUNK_SIZE);
        var az = Math.floor(rng(401 + i * 2) * CHUNK_SIZE);
        var animalType = distFromHome >= 4 ? "animal.bear" :
                         distFromHome >= 2 ? "animal.boar" : "animal.wolf";
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
      if (obj.hp <= 0) continue;
      var dx = Math.abs(obj.x - localX);
      var dz = Math.abs(obj.z - localZ);
      if (dx < 0.4 && dz < 0.4) return false;
    }

    // Check player-placed buildings
    if (typeof GameState !== 'undefined') {
      var instances = GameState.getAllInstances();
      for (var uid in instances) {
        var inst = instances[uid];
        var bdx = Math.abs(inst.x - worldX);
        var bdz = Math.abs(inst.z - worldZ);
        if (bdx < 0.8 && bdz < 0.8) return false;
      }
    }

    return true;
  }

  function findNearestObject(worldX, worldZ, maxDist) {
    var nearest = null;
    var nearestDist = maxDist || 3;

    for (var key in chunks) {
      var chunk = chunks[key];
      for (var i = 0; i < chunk.objects.length; i++) {
        var obj = chunk.objects[i];
        if (obj.hp <= 0) continue;
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

  return {
    init: init,
    update: update,
    getChunk: getChunk,
    getChunkAt: getChunkAt,
    getAllChunks: getAllChunks,
    getChunkSize: getChunkSize,
    isWalkable: isWalkable,
    findNearestObject: findNearestObject,
    restoreChunk: restoreChunk,
    seededRandom: seededRandom,
    reserveTile: reserveTile,
    releaseTile: releaseTile,
    _reservedTiles: _reservedTiles
  };
})();
