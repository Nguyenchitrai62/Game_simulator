window.WaterSystem = (function () {
  var _waterTiles = {};
  var _riverBankTiles = {};
  var _worldSeed = 42;

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

  function isRiverBank(worldX, worldZ) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    return !!_riverBankTiles[key];
  }

  function setWaterTile(worldX, worldZ, type) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    delete _riverBankTiles[key];
    _waterTiles[key] = type;
  }

  function removeWaterTile(worldX, worldZ) {
    var key = Math.round(worldX) + "," + Math.round(worldZ);
    delete _waterTiles[key];
    delete _riverBankTiles[key];
  }

  function wsRand(s) {
    var x = Math.sin(s) * 43758.5453;
    return x - Math.floor(x);
  }

  function getRiverZ(worldX) {
    return Math.sin(worldX * 0.12 + _worldSeed * 0.73) * 2.5
         + Math.sin(worldX * 0.05 + _worldSeed * 1.1) * 1.5;
  }

  function getWaterPriority(type) {
    if (type === 'deep') return 3;
    if (type === 'shallow') return 2;
    if (type === 'bank') return 1;
    return 0;
  }

  function addWaterPosition(waterPositions, chunkX, chunkZ, worldX, worldZ, type) {
    var localX = worldX - chunkX;
    var localZ = worldZ - chunkZ;
    if (localX < 0 || localX >= 16 || localZ < 0 || localZ >= 16) return;

    for (var i = 0; i < waterPositions.length; i++) {
      var existing = waterPositions[i];
      if (existing.x !== localX || existing.z !== localZ) continue;
      if (getWaterPriority(type) > getWaterPriority(existing.type)) {
        existing.type = type;
      }
      return;
    }

    waterPositions.push({ x: localX, z: localZ, type: type });
  }

  function generateWaterForChunk(cx, cz, seed) {
    _worldSeed = seed || _worldSeed;
    var waterPositions = [];
    var chunkX = cx * 16;
    var chunkZ = cz * 16;

    clearWaterForChunk(cx, cz);

    if (cx === 0 && cz === 0) {
      return waterPositions;
    }

    for (var lx = 0; lx < 16; lx++) {
      var worldX = chunkX + lx;
      var riverCenter = getRiverZ(worldX);
      var deepStartZ = Math.floor(riverCenter);

      addWaterPosition(waterPositions, chunkX, chunkZ, worldX, deepStartZ - 2, 'bank');
      addWaterPosition(waterPositions, chunkX, chunkZ, worldX, deepStartZ - 1, 'shallow');
      addWaterPosition(waterPositions, chunkX, chunkZ, worldX, deepStartZ, 'deep');
      addWaterPosition(waterPositions, chunkX, chunkZ, worldX, deepStartZ + 1, 'deep');
      addWaterPosition(waterPositions, chunkX, chunkZ, worldX, deepStartZ + 2, 'shallow');
      addWaterPosition(waterPositions, chunkX, chunkZ, worldX, deepStartZ + 3, 'bank');
    }

    var lakeChance = wsRand(seed + 500 + cx * 13 + cz * 29);
    if (lakeChance > 0.75 && Math.abs(cx) >= 2 && Math.abs(cz) >= 2) {
      var lakeX = Math.floor(wsRand(seed + 600 + cx * 7) * 10) + 3;
      var lakeZ = Math.floor(wsRand(seed + 700 + cz * 7) * 10) + 3;
      var lakeSize = 2 + Math.floor(wsRand(seed + 800) * 2);

      for (var dx = -lakeSize; dx <= lakeSize; dx++) {
        for (var dz = -lakeSize; dz <= lakeSize; dz++) {
          if (dx * dx + dz * dz <= lakeSize * lakeSize) {
            var lx2 = lakeX + dx;
            var lz2 = lakeZ + dz;
            if (lx2 >= 0 && lx2 < 16 && lz2 >= 0 && lz2 < 16) {
              var dist = Math.sqrt(dx * dx + dz * dz);
              var ltype = dist <= lakeSize * 0.6 ? 'deep' : 'shallow';
              addWaterPosition(waterPositions, chunkX, chunkZ, chunkX + lx2, chunkZ + lz2, ltype);
            }
          }
        }
      }
    }

    for (var i = 0; i < waterPositions.length; i++) {
      var wp = waterPositions[i];
      var key = (chunkX + wp.x) + "," + (chunkZ + wp.z);
      if (wp.type === 'bank') {
        _riverBankTiles[key] = true;
        delete _waterTiles[key];
      } else {
        _waterTiles[key] = wp.type;
        delete _riverBankTiles[key];
      }
    }

    return waterPositions;
  }

  var _waterGeo = null;
  var _waterMatDeep = null;
  var _waterMatShallow = null;
  var _waterMatBank = null;

  function ensureMaterials() {
    if (!_waterGeo) {
      _waterGeo = new THREE.PlaneGeometry(1, 1, 6, 6);
    }
    if (!_waterMatDeep) {
      _waterMatDeep = new THREE.MeshBasicMaterial({
        color: 0x2266bb,
        transparent: true,
        opacity: 0.80,
        side: THREE.DoubleSide,
        depthWrite: false
      });
    }
    if (!_waterMatShallow) {
      _waterMatShallow = new THREE.MeshBasicMaterial({
        color: 0x44aadd,
        transparent: true,
        opacity: 0.60,
        side: THREE.DoubleSide,
        depthWrite: false
      });
    }
    if (!_waterMatBank) {
      _waterMatBank = new THREE.MeshBasicMaterial({
        color: 0x8a7a5a,
        transparent: true,
        opacity: 0.46,
        side: THREE.DoubleSide,
        depthWrite: false
      });
    }
  }

  function createWaterMesh(waterPositions, group) {
    ensureMaterials();

    for (var i = 0; i < waterPositions.length; i++) {
      var wp = waterPositions[i];
      var mat = wp.type === 'deep' ? _waterMatDeep : (wp.type === 'shallow' ? _waterMatShallow : _waterMatBank);
      var waterMesh = new THREE.Mesh(_waterGeo, mat);
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.set(wp.x, wp.type === 'bank' ? 0.03 : 0.08, wp.z);
      waterMesh.renderOrder = wp.type === 'bank' ? 0 : 1;
      waterMesh.userData.isWater = true;
      waterMesh.userData.waterType = wp.type;
      group.add(waterMesh);
    }
  }

  function updateWaterAnimation(dt) {
    // Water is now static - animation removed for performance and correctness
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
        if (_riverBankTiles[key]) {
          delete _riverBankTiles[key];
        }
      }
    }
  }

  return {
    isWaterTile: isWaterTile,
    isDeepWater: isDeepWater,
    isShallowWater: isShallowWater,
    isRiverBank: isRiverBank,
    setWaterTile: setWaterTile,
    removeWaterTile: removeWaterTile,
    generateWaterForChunk: generateWaterForChunk,
    createWaterMesh: createWaterMesh,
    getWaterTiles: getWaterTiles,
    clearWaterForChunk: clearWaterForChunk,
    updateWaterAnimation: updateWaterAnimation
  };
})();