window.WaterSystem = (function () {
  var _waterTiles = {};

  function isWaterTile(worldX, worldZ) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    return _waterTiles[key] === 'deep' || _waterTiles[key] === 'shallow';
  }

  function isDeepWater(worldX, worldZ) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    return _waterTiles[key] === 'deep';
  }

  function isShallowWater(worldX, worldZ) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    return _waterTiles[key] === 'shallow';
  }

  function setWaterTile(worldX, worldZ, type) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    _waterTiles[key] = type;
  }

  function removeWaterTile(worldX, worldZ) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    delete _waterTiles[key];
  }

  function WaterSystem_seededRandom(seed) {
  var x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function generateWaterForChunk(cx, cz, seed) {
    var waterPositions = [];
    var chunkX = cx * 16;
    var chunkZ = cz * 16;

    // Use sine-based "river" path
    // River 1: flows from top-left to bottom-right
    for (var lx = 0; lx < 16; lx++) {
      var worldX = chunkX + lx;
      // River path: sinusoidal across X
      var riverZ1 = Math.sin(worldX * 0.15 + seed * 0.001) * 3 + seed % 7;
      var riverZ1Int = Math.round(riverZ1);

      for (var depth = -1; depth <= 1; depth++) {
        var zOffset = riverZ1Int + depth;
        var localZ = zOffset - chunkZ;
        if (localZ >= 0 && localZ < 16) {
          var waterType = depth === 0 ? 'deep' : 'shallow';
          waterPositions.push({ x: lx, z: localZ, type: waterType });
        }
      }
    }

    // Lake: seeded random position (far from home)
    var lakeChance = WaterSystem_seededRandom(seed + cx * 3 + cz * 7);
    if (lakeChance > 0.7 && Math.abs(cx) >= 2 && Math.abs(cz) >= 2) {
      var lakeX = Math.floor(WaterSystem_seededRandom(seed + 100 + cx) * 10) + 3;
      var lakeZ = Math.floor(WaterSystem_seededRandom(seed + 200 + cz) * 10) + 3;
      var lakeSize = 2 + Math.floor(WaterSystem_seededRandom(seed + 300) * 2);

      for (var dx = -lakeSize; dx <= lakeSize; dx++) {
        for (var dz = -lakeSize; dz <= lakeSize; dz++) {
          if (dx * dx + dz * dz <= lakeSize * lakeSize) {
            var lx2 = lakeX + dx;
            var lz2 = lakeZ + dz;
            if (lx2 >= 0 && lx2 < 16 && lz2 >= 0 && lz2 < 16) {
              var dist = Math.sqrt(dx * dx + dz * dz);
              var type = dist <= lakeSize * 0.5 ? 'deep' : 'shallow';
              waterPositions.push({ x: lx2, z: lz2, type: type });
            }
          }
        }
      }
    }

    // No water in home chunk (0,0)
    if (cx === 0 && cz === 0) {
      waterPositions = [];
    }

    // Register water tiles
    for (var i = 0; i < waterPositions.length; i++) {
      var wp = waterPositions[i];
      var key = (chunkX + wp.x) + "," + (chunkZ + wp.z);
      _waterTiles[key] = wp.type;
    }

    return waterPositions;
  }

  function createWaterMesh(waterPositions, group) {
    for (var i = 0; i < waterPositions.length; i++) {
      var wp = waterPositions[i];
      var isDeep = wp.type === 'deep';
      var color = isDeep ? 0x2255aa : 0x4488cc;
      var opacity = isDeep ? 0.8 : 0.6;

      var waterGeo = new THREE.PlaneGeometry(1, 1);
      var waterMat = new THREE.MeshLambertMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide
      });
      var waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.set(wp.x + 0.5, 0.03, wp.z + 0.5);
      waterMesh.userData.isWater = true;
      waterMesh.userData.waterType = wp.type;
      group.add(waterMesh);
    }
  }

  function getWaterTiles() {
    return _waterTiles;
  }

  function clearWaterForChunk(cx, cz) {
    var chunkX = cx * 16;
    var chunkZ = cz * 16;
    for (var lx = 0; lx < 16; lx++) {
      for (var lz = 0; lz < 16; lz++) {
        var key = (chunkX + lx) + "," + (chunkZ + lz);
        if (_waterTiles[key]) {
          delete _waterTiles[key];
        }
      }
    }
  }

  return {
    isWaterTile: isWaterTile,
    isDeepWater: isDeepWater,
    isShallowWater: isShallowWater,
    setWaterTile: setWaterTile,
    removeWaterTile: removeWaterTile,
    generateWaterForChunk: generateWaterForChunk,
    createWaterMesh: createWaterMesh,
    getWaterTiles: getWaterTiles,
    clearWaterForChunk: clearWaterForChunk
  };
})();