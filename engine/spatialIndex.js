window.GameSpatialIndex = window.GameSpatialIndex || (function () {
  var CELL_SIZE = 4;
  var DYNAMIC_SNAPSHOT_TTL_MS = 120;
  var _instanceGrid = createGridState(true);
  var _workerGrid = createGridState(false);
  var _threatGrid = createGridState(false);

  function createGridState(staticGrid) {
    return {
      cells: Object.create(null),
      count: 0,
      dirty: true,
      staticGrid: !!staticGrid,
      nextRefreshAt: 0
    };
  }

  function resetGrid(grid) {
    grid.cells = Object.create(null);
    grid.count = 0;
  }

  function getCellCoord(value) {
    return Math.floor(value / CELL_SIZE);
  }

  function getCellKey(cellX, cellZ) {
    return cellX + ',' + cellZ;
  }

  function pushToGrid(grid, item, x, z) {
    var cellX = getCellCoord(x);
    var cellZ = getCellCoord(z);
    var key = getCellKey(cellX, cellZ);
    if (!grid.cells[key]) {
      grid.cells[key] = [];
    }
    grid.cells[key].push(item);
    grid.count += 1;
  }

  function rebuildInstanceGrid(force) {
    if (!force && !_instanceGrid.dirty) return;

    resetGrid(_instanceGrid);
    var instances = (window.GameState && GameState.getAllInstancesLive) ? GameState.getAllInstancesLive() : null;
    if (instances) {
      for (var uid in instances) {
        var instance = instances[uid];
        if (!instance) continue;
        pushToGrid(_instanceGrid, instance, instance.x, instance.z);
      }
    }

    _instanceGrid.dirty = false;
    if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
      GamePerf.setValue('spatial.instances', _instanceGrid.count);
    }
  }

  function rebuildWorkerGrid(force) {
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!force && now < _workerGrid.nextRefreshAt) return;

    resetGrid(_workerGrid);
    var workers = (window.NPCSystem && NPCSystem.getAllNPCs) ? NPCSystem.getAllNPCs() : [];
    for (var i = 0; i < workers.length; i++) {
      var worker = workers[i];
      if (!worker || !worker.position) continue;
      pushToGrid(_workerGrid, worker, worker.position.x, worker.position.z);
    }

    _workerGrid.nextRefreshAt = now + DYNAMIC_SNAPSHOT_TTL_MS;
    if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
      GamePerf.setValue('spatial.workers', _workerGrid.count);
    }
  }

  function rebuildThreatGrid(force) {
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!force && now < _threatGrid.nextRefreshAt) return;

    resetGrid(_threatGrid);
    var chunks = (window.GameTerrain && GameTerrain.getAllChunks) ? GameTerrain.getAllChunks() : null;
    if (chunks) {
      for (var key in chunks) {
        var chunk = chunks[key];
        if (!chunk || !chunk.objects) continue;

        for (var i = 0; i < chunk.objects.length; i++) {
          var obj = chunk.objects[i];
          if (!obj || obj._destroyed || obj.hp <= 0 || !obj.type || obj.type.indexOf('animal.') !== 0) continue;
          if (window.GameRegistry && GameRegistry.isAnimalThreat && !GameRegistry.isAnimalThreat(obj.type)) continue;
          pushToGrid(_threatGrid, obj, obj.worldX, obj.worldZ);
        }
      }
    }

    _threatGrid.nextRefreshAt = now + DYNAMIC_SNAPSHOT_TTL_MS;
    if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
      GamePerf.setValue('spatial.threats', _threatGrid.count);
    }
  }

  function queryGrid(grid, x, z, radius, options) {
    options = options || {};
    var minCellX = getCellCoord(x - radius);
    var maxCellX = getCellCoord(x + radius);
    var minCellZ = getCellCoord(z - radius);
    var maxCellZ = getCellCoord(z + radius);
    var radiusSq = radius * radius;
    var limit = options.limit && options.limit > 0 ? options.limit : Infinity;
    var filter = typeof options.filter === 'function' ? options.filter : null;
    var excludeUid = options.excludeUid || null;
    var results = [];

    for (var cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (var cellZ = minCellZ; cellZ <= maxCellZ; cellZ++) {
        var entries = grid.cells[getCellKey(cellX, cellZ)];
        if (!entries || !entries.length) continue;

        for (var i = 0; i < entries.length; i++) {
          var item = entries[i];
          if (!item) continue;
          if (excludeUid && item.uid === excludeUid) continue;

          var itemX = item.position ? item.position.x : item.worldX !== undefined ? item.worldX : item.x;
          var itemZ = item.position ? item.position.z : item.worldZ !== undefined ? item.worldZ : item.z;
          if (itemX === undefined || itemZ === undefined) continue;

          var dx = itemX - x;
          var dz = itemZ - z;
          if ((dx * dx + dz * dz) > radiusSq) continue;
          if (filter && !filter(item)) continue;

          results.push(item);
          if (results.length >= limit) return results;
        }
      }
    }

    return results;
  }

  function getNearbyInstances(x, z, radius, options) {
    rebuildInstanceGrid(false);
    return queryGrid(_instanceGrid, x, z, radius, options);
  }

  function getNearbyWorkers(x, z, radius, options) {
    rebuildWorkerGrid(false);
    return queryGrid(_workerGrid, x, z, radius, options);
  }

  function getThreatAnimalsInRadius(x, z, radius, options) {
    rebuildThreatGrid(false);
    return queryGrid(_threatGrid, x, z, radius, options);
  }

  function getThreatAnimalsForChunk(cx, cz, chunkSize) {
    rebuildThreatGrid(false);
    var minX = cx * chunkSize;
    var maxX = minX + chunkSize;
    var minZ = cz * chunkSize;
    var maxZ = minZ + chunkSize;
    var centerX = minX + chunkSize * 0.5;
    var centerZ = minZ + chunkSize * 0.5;
    var radius = Math.sqrt(chunkSize * chunkSize * 0.5) + CELL_SIZE;
    var candidates = queryGrid(_threatGrid, centerX, centerZ, radius, null);
    var results = [];

    for (var i = 0; i < candidates.length; i++) {
      var animal = candidates[i];
      if (!animal) continue;
      if (animal.worldX < minX || animal.worldX >= maxX || animal.worldZ < minZ || animal.worldZ >= maxZ) continue;
      results.push(animal);
    }

    return results;
  }

  function markInstancesDirty() {
    _instanceGrid.dirty = true;
  }

  function markWorkersDirty() {
    _workerGrid.nextRefreshAt = 0;
  }

  function markThreatAnimalsDirty() {
    _threatGrid.nextRefreshAt = 0;
  }

  function markAllDirty() {
    markInstancesDirty();
    markWorkersDirty();
    markThreatAnimalsDirty();
  }

  return {
    getNearbyInstances: getNearbyInstances,
    getNearbyWorkers: getNearbyWorkers,
    getThreatAnimalsInRadius: getThreatAnimalsInRadius,
    getThreatAnimalsForChunk: getThreatAnimalsForChunk,
    markInstancesDirty: markInstancesDirty,
    markWorkersDirty: markWorkersDirty,
    markThreatAnimalsDirty: markThreatAnimalsDirty,
    markAllDirty: markAllDirty,
    rebuildInstanceGrid: rebuildInstanceGrid,
    rebuildWorkerGrid: rebuildWorkerGrid,
    rebuildThreatGrid: rebuildThreatGrid
  };
})();