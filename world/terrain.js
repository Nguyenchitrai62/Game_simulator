window.GameTerrain = (function () {
  var _terrainRuntimeConfig = (((window.GAME_BALANCE || {}).terrain || {}).runtime) || {};
  var CHUNK_SIZE = Number(_terrainRuntimeConfig.chunkSize) || 0;
  var chunks = {};
  var RENDER_DISTANCE = Math.max(0, Number(_terrainRuntimeConfig.renderDistance) || 0);
  var worldSeed = 42;
  var _lastLoadedPlayerChunk = { x: null, z: null };
  var _lastNodeStateUpdateAt = 0;
  var _chunkCullFrustum = null;
  var _visibleChunkCount = 0;
  var _visibilityDirty = true;
  var _lastVisibilityCameraState = {
    x: Infinity,
    y: Infinity,
    z: Infinity,
    left: Infinity,
    right: Infinity,
    top: Infinity,
    bottom: Infinity
  };
  var NODE_STATE_UPDATE_INTERVAL_MS = Math.max(0, Number(_terrainRuntimeConfig.nodeStateUpdateIntervalMs) || 0);

  function snapshotVisibilityCameraState(camera) {
    if (!camera) return;

    _lastVisibilityCameraState.x = camera.position.x;
    _lastVisibilityCameraState.y = camera.position.y;
    _lastVisibilityCameraState.z = camera.position.z;
    _lastVisibilityCameraState.left = camera.left;
    _lastVisibilityCameraState.right = camera.right;
    _lastVisibilityCameraState.top = camera.top;
    _lastVisibilityCameraState.bottom = camera.bottom;
  }

  function hasVisibilityCameraChanged(camera) {
    if (!camera) return false;

    var positionThreshold = 0.12;
    var projectionThreshold = 0.04;
    return Math.abs(camera.position.x - _lastVisibilityCameraState.x) > positionThreshold ||
      Math.abs(camera.position.y - _lastVisibilityCameraState.y) > positionThreshold ||
      Math.abs(camera.position.z - _lastVisibilityCameraState.z) > positionThreshold ||
      Math.abs(camera.left - _lastVisibilityCameraState.left) > projectionThreshold ||
      Math.abs(camera.right - _lastVisibilityCameraState.right) > projectionThreshold ||
      Math.abs(camera.top - _lastVisibilityCameraState.top) > projectionThreshold ||
      Math.abs(camera.bottom - _lastVisibilityCameraState.bottom) > projectionThreshold;
  }

  function getChunkCullFrustum() {
    if (!_chunkCullFrustum && typeof THREE !== 'undefined') {
      _chunkCullFrustum = new THREE.Frustum();
    }
    return _chunkCullFrustum;
  }

  function createChunkBounds(cx, cz) {
    if (typeof THREE === 'undefined') return null;

    var padding = 2.5;
    return new THREE.Box3(
      new THREE.Vector3(cx * CHUNK_SIZE - padding, -2, cz * CHUNK_SIZE - padding),
      new THREE.Vector3((cx + 1) * CHUNK_SIZE + padding, 8, (cz + 1) * CHUNK_SIZE + padding)
    );
  }

  function setChunkRenderVisibility(chunkData, visible) {
    if (!chunkData) return false;

    var nextVisible = visible !== false;
    if (chunkData.isVisible === nextVisible) return false;

    chunkData.isVisible = nextVisible;
    if (chunkData.mesh) {
      chunkData.mesh.visible = nextVisible;
    }
    if (typeof GameEntities !== 'undefined' && GameEntities.setChunkObjectsVisible) {
      GameEntities.setChunkObjectsVisible(chunkData, nextVisible);
    }
    return true;
  }

  function refreshVisibility(force) {
    if (typeof GameScene === 'undefined' || !GameScene.getCameraFrustum) return false;

    var camera = GameScene.getCamera ? GameScene.getCamera() : null;
    if (!camera) return false;
    if (!force && !_visibilityDirty && !hasVisibilityCameraChanged(camera)) return false;

    var frustum = getChunkCullFrustum();
    if (!frustum || !GameScene.getCameraFrustum(frustum)) return false;

    snapshotVisibilityCameraState(camera);

    var visibleCount = 0;
    var totalCount = 0;

    for (var key in chunks) {
      var chunkData = chunks[key];
      if (!chunkData) continue;

      totalCount++;
      var isVisible = !chunkData.bounds || frustum.intersectsBox(chunkData.bounds);
      setChunkRenderVisibility(chunkData, isVisible);
      if (isVisible) visibleCount++;
    }

    _visibleChunkCount = visibleCount;
    _visibilityDirty = false;
    if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
      GamePerf.setValue('terrain.loadedChunks', totalCount);
      GamePerf.setValue('terrain.visibleChunks', visibleCount);
    }
    return true;
  }

  function seededRandom(seed) {
    var x = Math.sin(seed) * 43758.5453123;
    return x - Math.floor(x);
  }

  function chunkSeed(cx, cz) {
    return (cx * 73856093 ^ cz * 19349663) & 0x7FFFFFFF;
  }

  function isInsideHomeSpawnZone(cx, cz, localX, localZ) {
    return cx === 0 && cz === 0 && localX > 6 && localX < 10 && localZ > 6 && localZ < 10;
  }

  function isNearPlayerSpawn(worldX, worldZ, playerPos, minDistance) {
    if (!playerPos) return false;
    var dx = worldX - playerPos.x;
    var dz = worldZ - playerPos.z;
    return Math.sqrt(dx * dx + dz * dz) < (minDistance || 2);
  }

  function overlapsPlacedBuilding(instances, worldX, worldZ, clearance) {
    if (!instances) return false;

    var minDistance = clearance || 1.0;
    for (var uid in instances) {
      var inst = instances[uid];
      if (!inst) continue;
      var dx = inst.x - worldX;
      var dz = inst.z - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) < minDistance) {
        return true;
      }
    }

    return false;
  }

  function overlapsChunkObject(objects, worldX, worldZ, clearance, skipObjectId) {
    var minDistance = clearance || 1.0;
    for (var i = 0; i < objects.length; i++) {
      var obj = objects[i];
      if (!obj || obj._destroyed) continue;
      if (skipObjectId && obj.id === skipObjectId) continue;
      var dx = obj.worldX - worldX;
      var dz = obj.worldZ - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) < minDistance) {
        return true;
      }
    }

    return false;
  }

  function overlapsNPCPosition(npcs, worldX, worldZ, clearance) {
    if (!npcs || !npcs.length) return false;

    var minDistance = clearance || 1.0;
    for (var i = 0; i < npcs.length; i++) {
      var npc = npcs[i];
      if (!npc || !npc.position) continue;

      var dx = npc.position.x - worldX;
      var dz = npc.position.z - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) < minDistance) {
        return true;
      }
    }

    return false;
  }

  function overlapsWater(worldX, worldZ) {
    if (typeof WaterSystem === 'undefined') return false;
    return WaterSystem.isDeepWater(worldX, worldZ) || WaterSystem.isShallowWater(worldX, worldZ);
  }

  function getPlacedInstancesForLookup() {
    if (typeof GameState === 'undefined') return null;
    if (GameState.getAllInstancesLive) return GameState.getAllInstancesLive();
    if (GameState.getAllInstances) return GameState.getAllInstances();
    return null;
  }

  function findChunkSpawnPosition(chunkData, playerPos, seedX, seedZ, index, options) {
    options = options || {};

    var attempts = options.maxAttempts || 20;
    var clearance = options.clearance || 1.0;
    var buildingClearance = options.buildingClearance || Math.max(1.0, clearance);
    var playerClearance = options.playerClearance || 2.0;
    var avoidWater = options.avoidWater !== false;
    var instances = options.instances || null;
    var skipObjectId = options.skipObjectId || null;
    var currentWorldX = options.currentWorldX;
    var currentWorldZ = options.currentWorldZ;
    var minDistanceFromCurrent = options.minDistanceFromCurrent || 0;
    var npcPositions = options.npcPositions || null;
    var npcClearance = options.npcClearance || clearance;

    for (var attempt = 0; attempt < attempts; attempt++) {
      var localX = Math.floor(seededRandom(chunkData.seed + seedX + index * 53 + attempt * 97) * CHUNK_SIZE);
      var localZ = Math.floor(seededRandom(chunkData.seed + seedZ + index * 59 + attempt * 101) * CHUNK_SIZE);
      var worldX = chunkData.cx * CHUNK_SIZE + localX;
      var worldZ = chunkData.cz * CHUNK_SIZE + localZ;

      if (isInsideHomeSpawnZone(chunkData.cx, chunkData.cz, localX, localZ)) continue;
      if (minDistanceFromCurrent > 0 && currentWorldX !== undefined && currentWorldZ !== undefined) {
        var currentDx = worldX - currentWorldX;
        var currentDz = worldZ - currentWorldZ;
        if (Math.sqrt(currentDx * currentDx + currentDz * currentDz) < minDistanceFromCurrent) continue;
      }
      if (isNearPlayerSpawn(worldX, worldZ, playerPos, playerClearance)) continue;
      if (overlapsPlacedBuilding(instances, worldX, worldZ, buildingClearance)) continue;
      if (overlapsChunkObject(chunkData.objects, worldX, worldZ, clearance, skipObjectId)) continue;
      if (overlapsNPCPosition(npcPositions, worldX, worldZ, npcClearance)) continue;
      if (avoidWater && overlapsWater(worldX, worldZ)) continue;

      return {
        x: localX,
        z: localZ,
        worldX: worldX,
        worldZ: worldZ
      };
    }

    return null;
  }

  function init(seed) {
    worldSeed = seed || 42;
    chunks = {};
    _visibleChunkCount = 0;
    _visibilityDirty = true;
    _lastVisibilityCameraState.x = Infinity;
    _lastVisibilityCameraState.y = Infinity;
    _lastVisibilityCameraState.z = Infinity;
    _lastVisibilityCameraState.left = Infinity;
    _lastVisibilityCameraState.right = Infinity;
    _lastVisibilityCameraState.top = Infinity;
    _lastVisibilityCameraState.bottom = Infinity;
  }

  function getTerrainBalanceConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.terrain) || {};
  }

  function getEntityBalance(entityId) {
    return (window.GAME_BALANCE && window.GAME_BALANCE[entityId]) || {};
  }

  function getPredatorZoneConfig() {
    return getTerrainBalanceConfig().predatorZones || {};
  }

  function getAnimalSpawnConfig() {
    return getTerrainBalanceConfig().animalSpawns || {};
  }

  function getTerrainRespawnConfig() {
    return getTerrainBalanceConfig().respawn || {};
  }

  function getTerrainGenerationConfig() {
    return getTerrainBalanceConfig().generation || {};
  }

  function getTerrainGenerationNodeConfig(nodeKey) {
    return (getTerrainGenerationConfig().nodes || {})[nodeKey] || {};
  }

  function getTerrainAnimalGenerationConfig() {
    return getTerrainGenerationConfig().animals || {};
  }

  function getTerrainOreGenerationConfig(oreKey) {
    return (getTerrainGenerationConfig().oreSpawns || {})[oreKey] || {};
  }

  function getTerrainNodeRelocationConfig(nodeType, stageKey) {
    var nodeRelocationConfig = (getTerrainRespawnConfig().relocation || {}).node || {};
    var configKey = nodeType === 'node.tree' ? 'tree' : (nodeType === 'node.rock' ? 'rock' : null);
    var nodeConfig = configKey ? nodeRelocationConfig[configKey] : null;
    return (nodeConfig && nodeConfig[stageKey]) || {};
  }

  function getTerrainAnimalRelocationConfig(stageKey) {
    var animalRelocationConfig = (getTerrainRespawnConfig().relocation || {}).animal || {};
    return animalRelocationConfig[stageKey] || {};
  }

  function getTerrainRespawnTimeSeconds(entityId) {
    var balance = getEntityBalance(entityId);
    if (balance.respawnTime !== undefined) {
      return Number(balance.respawnTime) || 0;
    }
    return Number(getTerrainRespawnConfig().defaultNodeRespawnTimeSeconds) || 0;
  }

  function getTerrainLoadedNodePlayerSafeDistance() {
    return Number(getTerrainRespawnConfig().loadedNodePlayerSafeDistance) || 0;
  }

  function getBalancedEntityHp(entityId, fallbackHp) {
    var balance = getEntityBalance(entityId);
    if (balance.hp !== undefined) {
      return Math.max(1, Number(balance.hp) || 0);
    }
    return Math.max(1, Number(fallbackHp) || 1);
  }

  function buildSpawnOptions(baseConfig, extraOptions) {
    var options = {};
    var key;
    baseConfig = baseConfig || {};
    extraOptions = extraOptions || {};

    for (key in baseConfig) {
      if (!Object.prototype.hasOwnProperty.call(baseConfig, key)) continue;
      options[key] = baseConfig[key];
    }

    for (key in extraOptions) {
      if (!Object.prototype.hasOwnProperty.call(extraOptions, key)) continue;
      if (extraOptions[key] === undefined) continue;
      options[key] = extraOptions[key];
    }

    return options;
  }

  function getDistanceBandConfig(bands, distFromHome) {
    if (!bands || !bands.length) return null;

    for (var index = 0; index < bands.length; index++) {
      var band = bands[index];
      if (band.maxDistance === undefined || distFromHome < Number(band.maxDistance)) {
        return band;
      }
    }

    return null;
  }

  function resolveDistanceBandCount(bands, distFromHome, roll) {
    var band = getDistanceBandConfig(bands, distFromHome);
    if (!band) return 0;
    return Number(band.base || 0) + Math.floor((roll || 0) * Number(band.variance || 0));
  }

  function getPredatorZoneAnimalCap(level) {
    return Number((getTerrainAnimalGenerationConfig().zoneCapByLevel || {})[level]) || 0;
  }

  function getFallbackPlayerPosition() {
    if (typeof GamePlayer !== 'undefined' && GamePlayer.getPosition) {
      return GamePlayer.getPosition();
    }
    if (typeof GameState !== 'undefined' && GameState.getPlayerSpawnPosition) {
      return GameState.getPlayerSpawnPosition();
    }
    return { x: 0, z: 0 };
  }

  function getPredatorZoneThreshold(distFromHome, currentAge) {
    var config = getPredatorZoneConfig();
    var thresholds = config.thresholdsByDistance || [];
    var threshold = null;

    for (var index = 0; index < thresholds.length; index++) {
      if (distFromHome >= thresholds[index].minDistance) {
        threshold = Number(thresholds[index].threshold);
        break;
      }
    }

    if (threshold === null) return null;

    if (currentAge === 'age.iron' && distFromHome >= Number(config.ironAgeThresholdBonusDistance)) {
      threshold += Number(config.ironAgeThresholdAdjustment) || 0;
    }

    return threshold;
  }

  function getPredatorZoneLevelData(level) {
    return (getPredatorZoneConfig().levels || {})[level] || null;
  }

  function matchesAnimalSpawnRule(rule, currentAge, distFromHome) {
    if (!rule) return false;
    if (rule.age && rule.age !== currentAge) return false;
    return distFromHome >= Number(rule.minDistance || 0);
  }

  function resolveAnimalSpawnTable(table, currentAge, distFromHome, animalRoll) {
    for (var index = 0; index < table.length; index++) {
      var rule = table[index];
      if (!matchesAnimalSpawnRule(rule, currentAge, distFromHome)) continue;
      if (rule.fixed) return rule.fixed;
      return animalRoll > Number(rule.rollThreshold) ? rule.above : rule.below;
    }
    return null;
  }

  function getPredatorZoneProfile(seed, distFromHome, currentAge) {
    var config = getPredatorZoneConfig();
    if (distFromHome < Number(config.minimumDistanceFromHome)) return null;

    var zoneRoll = seededRandom(seed + 9700);
    var threshold = getPredatorZoneThreshold(distFromHome, currentAge);

    if (threshold === null || zoneRoll <= threshold) return null;

    var zoneLevel = (distFromHome >= Number(config.highZoneMinDistance) || zoneRoll > Number(config.highZoneRollThreshold)) ? 'high' : 'medium';
    var levelData = getPredatorZoneLevelData(zoneLevel);
    return {
      level: zoneLevel,
      label: levelData ? levelData.label : '',
      animalBonus: levelData ? levelData.animalBonus : 0,
      dangerBonus: levelData ? levelData.dangerBonus : 0
    };
  }

  function chooseAnimalType(currentAge, distFromHome, animalRoll, predatorZone) {
    var spawnConfig = getAnimalSpawnConfig();
    var tableKey = predatorZone ? predatorZone.level : 'normal';
    var animalType = resolveAnimalSpawnTable(spawnConfig[tableKey] || [], currentAge, distFromHome, animalRoll);
    if (animalType) return animalType;
    return resolveAnimalSpawnTable(spawnConfig.normal || [], currentAge, distFromHome, animalRoll);
  }

  function getChunkSize() { return CHUNK_SIZE; }

  function isResourceNode(objData) {
    return !!(objData && objData.type && objData.type.indexOf("node.") === 0);
  }

  function cloneMap(map) {
    var copy = {};
    if (!map) return copy;
    for (var key in map) {
      copy[key] = map[key];
    }
    return copy;
  }

  function hashString(value) {
    var hash = 2166136261;
    var text = String(value || "");
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  function getNodeConfig(type) {
    var configMap = window.GAME_NODE_CONFIG || {};
    return configMap[type] || null;
  }

  function getNodeRoll(objData, salt) {
    var rollSeed = objData && objData.rollSeed !== undefined ? objData.rollSeed : 0;
    return seededRandom(hashString((objData && objData.id ? objData.id : "node") + "|" + rollSeed + "|" + salt));
  }

  function chooseWeightedEntry(entries, roll) {
    if (!entries || !entries.length) return null;

    var totalWeight = 0;
    for (var i = 0; i < entries.length; i++) {
      totalWeight += entries[i].weight || 0;
    }

    if (totalWeight <= 0) {
      return entries[Math.min(entries.length - 1, Math.floor((roll || 0) * entries.length))];
    }

    var threshold = (roll || 0) * totalWeight;
    var accumulated = 0;
    for (var j = 0; j < entries.length; j++) {
      accumulated += entries[j].weight || 0;
      if (threshold <= accumulated) return entries[j];
    }

    return entries[entries.length - 1];
  }

  function findVariantByKey(entries, key) {
    if (!entries || !entries.length) return null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].key === key) return entries[i];
    }
    return entries[0] || null;
  }

  function chooseInitialGrowthStage(objData, config) {
    var stages = config && config.stages ? config.stages : [];
    var selected = chooseWeightedEntry(stages, getNodeRoll(objData, "stage"));
    if (!selected) return 0;
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].key === selected.key) return i;
    }
    return 0;
  }

  function getGrowthDelayMs(objData, stageIndex) {
    var config = getNodeConfig(objData.type);
    var stage = config && config.stages ? config.stages[stageIndex] : null;
    if (!stage || !stage.growAfter) return 0;
    var jitter = 0.85 + getNodeRoll(objData, "grow:" + stageIndex) * 0.35;
    return Math.floor(stage.growAfter * 1000 * jitter);
  }

  function getNodeBaseName(type) {
    var entity = (typeof GameRegistry !== "undefined" && GameRegistry.getEntity) ? GameRegistry.getEntity(type) : null;
    return entity ? entity.name : type;
  }

  function getNodeInfo(objData) {
    if (!isResourceNode(objData)) return null;

    var balance = getEntityBalance(objData.type);
    var config = getNodeConfig(objData.type);
    var info = {
      name: getNodeBaseName(objData.type),
      label: getNodeBaseName(objData.type),
      stateLabel: "",
      rewards: cloneMap(balance.rewards),
      hp: getBalancedEntityHp(objData.type, objData.maxHp || objData.hp),
      scale: 1,
      harvestable: true,
      isGiant: false,
      leafColor: null,
      trunkColor: null,
      berryColor: null,
      berryCount: 0,
      shardCount: 2,
      shardHeight: 0.22,
      chunkCount: 3,
      mossPatches: objData.type === "node.rock" ? 2 : 0,
      speckCount: 0,
      spireCount: 0,
      spireHeight: 0.18
    };

    if (!config) return info;

    var entry = null;
    if (config.kind === "growth") {
      if (objData.nodeVariant === "giant" && config.giantVariant) {
        entry = config.giantVariant;
        info.isGiant = true;
      } else if (config.stages && config.stages.length) {
        var stageIndex = typeof objData.growthStage === "number" ? objData.growthStage : 0;
        stageIndex = Math.max(0, Math.min(config.stages.length - 1, stageIndex));
        entry = config.stages[stageIndex];
      }
    } else if (config.variants && config.variants.length) {
      entry = findVariantByKey(config.variants, objData.nodeVariant);
      info.isGiant = !!(entry && entry.isGiant);
    }

    if (!entry) return info;

    var useVariantLabel = config.useVariantLabel !== false || config.kind === "growth" || info.isGiant;

    if (entry.label && useVariantLabel) {
      info.label = entry.label;
    }

    if (entry.stateLabel) {
      info.stateLabel = entry.stateLabel;
    } else if (entry.label && !useVariantLabel) {
      info.stateLabel = entry.label;
    }

    if (entry.rewards) info.rewards = cloneMap(entry.rewards);
    if (entry.hp) info.hp = entry.hp;
    if (entry.scale) info.scale = entry.scale;
    if (entry.harvestable === false) info.harvestable = false;
    if (entry.leafColor) info.leafColor = entry.leafColor;
    if (entry.trunkColor) info.trunkColor = entry.trunkColor;
    if (entry.berryColor) info.berryColor = entry.berryColor;
    if (entry.berryCount !== undefined) info.berryCount = entry.berryCount;
    if (entry.shardCount !== undefined) info.shardCount = entry.shardCount;
    if (entry.shardHeight !== undefined) info.shardHeight = entry.shardHeight;
    if (entry.chunkCount !== undefined) info.chunkCount = entry.chunkCount;
    if (entry.mossPatches !== undefined) info.mossPatches = entry.mossPatches;
    if (entry.speckCount !== undefined) info.speckCount = entry.speckCount;
    if (entry.spireCount !== undefined) info.spireCount = entry.spireCount;
    if (entry.spireHeight !== undefined) info.spireHeight = entry.spireHeight;

    // Keep tree and rock naming generic in UI-facing data.
    // Their progression should read from mesh size/complexity rather than labels.
    if (objData.type === "node.tree" || objData.type === "node.rock") {
      info.label = info.name;
    }

    return info;
  }

  function resetNodeHealth(objData) {
    var info = getNodeInfo(objData);
    if (!info) return;
    objData.maxHp = Math.max(1, info.hp || 1);
    objData.hp = objData.maxHp;
  }

  function applyNodePosition(objData, position) {
    if (!objData || !position) return;
    objData.x = position.x;
    objData.z = position.z;
    objData.worldX = position.worldX;
    objData.worldZ = position.worldZ;
  }

  function syncNodeWorldPosition(objData) {
    if (!objData) return;

    var chunkX = Math.floor((objData.worldX !== undefined ? objData.worldX : 0) / CHUNK_SIZE);
    var chunkZ = Math.floor((objData.worldZ !== undefined ? objData.worldZ : 0) / CHUNK_SIZE);

    objData.worldX = chunkX * CHUNK_SIZE + objData.x;
    objData.worldZ = chunkZ * CHUNK_SIZE + objData.z;
  }

  function captureNodePersistState(objData) {
    return {
      x: objData.x,
      z: objData.z,
      hp: typeof objData.hp === "number" ? objData.hp : null,
      destroyed: !!objData._destroyed,
      nodeVariant: objData.nodeVariant !== undefined ? objData.nodeVariant : null,
      growthStage: objData.growthStage !== undefined ? objData.growthStage : null,
      wateredGrowthStage: objData.wateredGrowthStage !== undefined ? objData.wateredGrowthStage : null,
      nextGrowthAt: objData.nextGrowthAt || 0,
      respawnAt: objData.respawnAt || 0,
      spawnCycle: objData.spawnCycle || 0,
      rollSeed: objData.rollSeed || 0
    };
  }

  function getSavedNodeField(savedData, longKey, shortKey) {
    if (!savedData) return undefined;
    if (savedData.hasOwnProperty(longKey)) return savedData[longKey];
    if (shortKey && savedData.hasOwnProperty(shortKey)) return savedData[shortKey];
    return undefined;
  }

  function getSavedNodeId(savedData) {
    return getSavedNodeField(savedData, "id", "i");
  }

  function buildSavedNodeState(objData) {
    if (!isResourceNode(objData)) return null;

    var base = objData._persistBase || captureNodePersistState(objData);
    var current = captureNodePersistState(objData);
    var saved = { i: objData.id };
    var hasChanges = false;

    if (current.x !== base.x) {
      saved.x = current.x;
      hasChanges = true;
    }
    if (current.z !== base.z) {
      saved.z = current.z;
      hasChanges = true;
    }
    if (current.hp !== base.hp) {
      saved.h = current.hp;
      hasChanges = true;
    }
    if (current.destroyed !== base.destroyed) {
      saved.d = current.destroyed ? 1 : 0;
      hasChanges = true;
    }
    if (current.nodeVariant !== base.nodeVariant) {
      saved.v = current.nodeVariant;
      hasChanges = true;
    }
    if (current.growthStage !== base.growthStage) {
      saved.g = current.growthStage;
      hasChanges = true;
    }
    if (current.wateredGrowthStage !== base.wateredGrowthStage) {
      saved.wg = current.wateredGrowthStage;
      hasChanges = true;
    }
    if (current.nextGrowthAt !== base.nextGrowthAt) {
      saved.n = current.nextGrowthAt;
      hasChanges = true;
    }
    if (current.respawnAt !== base.respawnAt) {
      saved.r = current.respawnAt;
      hasChanges = true;
    }
    if (current.spawnCycle !== base.spawnCycle) {
      saved.c = current.spawnCycle;
      hasChanges = true;
    }
    if (current.rollSeed !== base.rollSeed) {
      saved.s = current.rollSeed;
      hasChanges = true;
    }

    return hasChanges ? saved : null;
  }

  function initializeNodeState(objData, now) {
    if (!isResourceNode(objData)) return;

    var config = getNodeConfig(objData.type);
    if (!config) return;

    if (objData.spawnCycle === undefined || objData.spawnCycle === null) {
      objData.spawnCycle = 0;
    }
    if (objData.rollSeed === undefined || objData.rollSeed === null) {
      objData.rollSeed = 0;
    }

    if (objData.respawnAt === undefined || objData.respawnAt === null) {
      objData.respawnAt = 0;
    }
    if (objData.wateredGrowthStage === undefined) {
      objData.wateredGrowthStage = null;
    }

    if (config.kind === "growth") {
      if (objData.nodeVariant === undefined || objData.nodeVariant === null) {
        if (config.giantVariant && getNodeRoll(objData, "giant") < (config.giantVariant.chance || 0)) {
          objData.nodeVariant = "giant";
        } else {
          objData.nodeVariant = "default";
        }
      }

      if (objData.growthStage === undefined || objData.growthStage === null) {
        if (objData.nodeVariant === "giant" && config.giantVariant) {
          objData.growthStage = config.giantVariant.stage !== undefined ? config.giantVariant.stage : Math.max(0, (config.stages || []).length - 1);
        } else {
          objData.growthStage = chooseInitialGrowthStage(objData, config);
        }
      }

      if (objData.nodeVariant === "giant" && config.giantVariant) {
        objData.nextGrowthAt = 0;
      } else if (!objData.nextGrowthAt) {
        var delay = getGrowthDelayMs(objData, objData.growthStage);
        objData.nextGrowthAt = delay > 0 ? now + delay : 0;
      }
    } else if ((config.kind === "variant" || config.kind === "visual") && !objData.nodeVariant) {
      var selectedVariant = chooseWeightedEntry(config.variants, getNodeRoll(objData, "variant"));
      objData.nodeVariant = selectedVariant ? selectedVariant.key : null;
    }

    resetNodeHealth(objData);
  }

  function restoreSavedNodeState(objData, savedData, now) {
    if (!savedData) return;

    var savedHp = getSavedNodeField(savedData, "hp", "h");
    var savedDestroyed = getSavedNodeField(savedData, "_destroyed", "d");
    var savedX = getSavedNodeField(savedData, "x", "x");
    var savedZ = getSavedNodeField(savedData, "z", "z");
    var savedWorldX = getSavedNodeField(savedData, "worldX", "wx");
    var savedWorldZ = getSavedNodeField(savedData, "worldZ", "wz");
    var savedNodeVariant = getSavedNodeField(savedData, "nodeVariant", "v");
    var savedGrowthStage = getSavedNodeField(savedData, "growthStage", "g");
    var savedWateredGrowthStage = getSavedNodeField(savedData, "wateredGrowthStage", "wg");
    var savedNextGrowthAt = getSavedNodeField(savedData, "nextGrowthAt", "n");
    var savedRespawnAt = getSavedNodeField(savedData, "respawnAt", "r");
    var savedSpawnCycle = getSavedNodeField(savedData, "spawnCycle", "c");
    var savedRollSeed = getSavedNodeField(savedData, "rollSeed", "s");

    objData._destroyed = !!savedDestroyed;

    if (savedX !== undefined) objData.x = savedX;
    if (savedZ !== undefined) objData.z = savedZ;
    if (savedWorldX !== undefined) objData.worldX = savedWorldX;
    if (savedWorldZ !== undefined) objData.worldZ = savedWorldZ;
    if ((savedX !== undefined || savedZ !== undefined) && savedWorldX === undefined && savedWorldZ === undefined) {
      syncNodeWorldPosition(objData);
    }
    if (savedNodeVariant !== undefined) objData.nodeVariant = savedNodeVariant;
    if (savedGrowthStage !== undefined) objData.growthStage = savedGrowthStage;
    if (savedWateredGrowthStage !== undefined) objData.wateredGrowthStage = savedWateredGrowthStage;
    if (savedNextGrowthAt !== undefined) objData.nextGrowthAt = savedNextGrowthAt;
    if (savedRespawnAt !== undefined) objData.respawnAt = savedRespawnAt;
    if (savedSpawnCycle !== undefined) objData.spawnCycle = savedSpawnCycle;
    if (savedRollSeed !== undefined) objData.rollSeed = savedRollSeed;

    initializeNodeState(objData, now);

    var info = getNodeInfo(objData);
    var maxHp = info ? Math.max(1, info.hp || 1) : (objData.maxHp || 1);
    objData.maxHp = maxHp;

    if (typeof savedHp === "number") {
      objData.hp = Math.max(0, Math.min(savedHp, maxHp));
    } else if (objData._destroyed) {
      objData.hp = 0;
    } else if (!objData._destroyed) {
      objData.hp = maxHp;
    }

    if (!objData._destroyed && objData.hp <= 0) {
      objData.hp = maxHp;
    }

    if (objData._destroyed && !objData.respawnAt) {
      objData.respawnAt = now + (getTerrainRespawnTimeSeconds(objData.type) * 1000);
    }

    if (savedX !== undefined || savedZ !== undefined || savedWorldX !== undefined || savedWorldZ !== undefined || savedNodeVariant !== undefined || savedGrowthStage !== undefined || savedNextGrowthAt !== undefined) {
      objData._needsMeshRefresh = true;
    }

    if (!objData._destroyed && !objData.nextGrowthAt) {
      objData._persistBase = captureNodePersistState(objData);
    }
  }

  function advanceNodeGrowth(objData, now) {
    var config = getNodeConfig(objData.type);
    if (!config || config.kind !== "growth" || objData._destroyed) return false;

    if (objData.nodeVariant === "giant" && config.giantVariant) {
      objData.nextGrowthAt = 0;
      return false;
    }

    if (!objData.nextGrowthAt || now < objData.nextGrowthAt) return false;
    if (!config.stages || !config.stages.length) return false;
    if (objData.growthStage >= config.stages.length - 1) {
      objData.nextGrowthAt = 0;
      return false;
    }

    var oldHp = objData.hp || 1;
    var oldMaxHp = objData.maxHp || 1;
    var changed = false;
    var transitionTime = objData.nextGrowthAt;

    while (objData.growthStage < config.stages.length - 1 && transitionTime && now >= transitionTime) {
      objData.growthStage++;
      changed = true;

      if (objData.growthStage >= config.stages.length - 1) {
        objData.nextGrowthAt = 0;
        break;
      }

      transitionTime = transitionTime + getGrowthDelayMs(objData, objData.growthStage);
      objData.nextGrowthAt = transitionTime;
    }

    if (!changed) return false;

    var info = getNodeInfo(objData);
    var nextMaxHp = info ? Math.max(1, info.hp || 1) : oldMaxHp;
    var hpRatio = oldMaxHp > 0 ? oldHp / oldMaxHp : 1;

    objData.maxHp = nextMaxHp;
    objData.hp = Math.max(1, Math.min(nextMaxHp, Math.round(nextMaxHp * hpRatio)));
    objData._needsMeshRefresh = true;

    if (!objData.nextGrowthAt) {
      objData._persistBase = captureNodePersistState(objData);
    }

    return true;
  }

  function isNodeAtMaxGrowth(objData) {
    var config = getNodeConfig(objData && objData.type);
    if (!config || config.kind !== "growth") return true;
    if (objData.nodeVariant === "giant" && config.giantVariant) return true;
    if (!config.stages || !config.stages.length) return true;

    var stageIndex = typeof objData.growthStage === "number" ? objData.growthStage : 0;
    return stageIndex >= config.stages.length - 1;
  }

  function canWaterGrowthNode(objData) {
    var config = getNodeConfig(objData && objData.type);
    if (!isResourceNode(objData) || objData._destroyed) return false;
    if (!config || config.kind !== "growth") return false;
    if (objData.nodeVariant === "giant" && config.giantVariant) return false;
    if (isNodeAtMaxGrowth(objData)) return false;
    if (!objData.nextGrowthAt) return false;
    return objData.wateredGrowthStage !== objData.growthStage;
  }

  function applyGrowthWaterBoost(objData, options) {
    if (!canWaterGrowthNode(objData)) return false;

    options = options || {};

    var now = Date.now();
    var remainingMs = Math.max(0, (objData.nextGrowthAt || 0) - now);
    var remainingTimeMultiplier = Math.min(0.95, Math.max(0.1, options.remainingTimeMultiplier || 0.55));
    var minRemainingMs = Math.max(1000, Math.floor((options.minRemainingSeconds || 6) * 1000));
    var boostedNextGrowthAt = now + Math.max(minRemainingMs, Math.floor(remainingMs * remainingTimeMultiplier));

    objData.nextGrowthAt = Math.min(objData.nextGrowthAt, boostedNextGrowthAt);
    objData.wateredGrowthStage = objData.growthStage;
    return true;
  }

  function rerollNodeRespawnState(objData, now) {
    var config = getNodeConfig(objData.type);
    if (!config) return;

    var nextCycle = (objData.spawnCycle || 0) + 1;
    objData.spawnCycle = nextCycle;
    objData.rollSeed = hashString((objData.id || "node") + "|" + now + "|" + nextCycle);
    objData.wateredGrowthStage = null;

    if (config.kind === "growth") {
      if (config.giantVariant && getNodeRoll(objData, "giant") < (config.giantVariant.chance || 0)) {
        objData.nodeVariant = "giant";
        objData.growthStage = config.giantVariant.stage !== undefined ? config.giantVariant.stage : Math.max(0, (config.stages || []).length - 1);
        objData.nextGrowthAt = 0;
      } else {
        objData.nodeVariant = "default";
        objData.growthStage = config.randomRespawnStage ? chooseInitialGrowthStage(objData, config) : 0;
        var growthDelay = getGrowthDelayMs(objData, objData.growthStage);
        objData.nextGrowthAt = growthDelay > 0 ? now + growthDelay : 0;
      }
    } else if (config.variants && config.variants.length) {
      var nextVariant = chooseWeightedEntry(config.variants, getNodeRoll(objData, "variant"));
      objData.nodeVariant = nextVariant ? nextVariant.key : null;
    }
  }

  function shouldRelocateRespawnedNode(objData) {
    return !!(objData && (objData.type === "node.tree" || objData.type === "node.rock"));
  }

  function relocateRespawnedNode(objData) {
    if (!shouldRelocateRespawnedNode(objData)) return false;

    var chunk = getChunkAt(objData.worldX, objData.worldZ);
    if (!chunk) return false;

    var playerPos = getFallbackPlayerPosition();
    var placedInstances = getPlacedInstancesForLookup();
    var activeNPCs = (typeof NPCSystem !== 'undefined' && NPCSystem.getAllNPCs) ? NPCSystem.getAllNPCs() : null;
    var seedHash = hashString(objData.id || objData.type || "node");
    var primaryRelocation = getTerrainNodeRelocationConfig(objData.type, 'primary');
    var fallbackRelocation = getTerrainNodeRelocationConfig(objData.type, 'fallback');
    var position = findChunkSpawnPosition(chunk, playerPos, 1200 + (seedHash % 173), 1400 + (seedHash % 191), objData.spawnCycle || 0, buildSpawnOptions(primaryRelocation, {
      npcPositions: activeNPCs,
      instances: placedInstances,
      skipObjectId: objData.id,
      currentWorldX: objData.worldX,
      currentWorldZ: objData.worldZ
    }));

    if (!position) {
      position = findChunkSpawnPosition(chunk, playerPos, 1200 + (seedHash % 173), 1400 + (seedHash % 191), (objData.spawnCycle || 0) + 17, buildSpawnOptions(fallbackRelocation, {
        instances: placedInstances,
        skipObjectId: objData.id
      }));
    }

    if (!position) return false;

    applyNodePosition(objData, position);
    return true;
  }

  function relocateRespawnedAnimal(objData) {
    if (!objData || !objData.type || objData.type.indexOf('animal.') !== 0) return false;

    var chunk = getChunkAt(objData.worldX, objData.worldZ);
    if (!chunk) return false;

    objData.respawnCycle = (objData.respawnCycle || 0) + 1;

    var playerPos = getFallbackPlayerPosition();
    var placedInstances = getPlacedInstancesForLookup();
    var activeNPCs = (typeof NPCSystem !== 'undefined' && NPCSystem.getAllNPCs) ? NPCSystem.getAllNPCs() : null;
    var seedHash = hashString((objData.id || objData.type || 'animal') + '|' + objData.respawnCycle + '|' + Date.now());
    var primaryAnimalRelocation = getTerrainAnimalRelocationConfig('primary');
    var fallbackAnimalRelocation = getTerrainAnimalRelocationConfig('fallback');
    var position = findChunkSpawnPosition(chunk, playerPos, 2100 + (seedHash % 173), 2300 + (seedHash % 191), objData.respawnCycle, buildSpawnOptions(primaryAnimalRelocation, {
      npcPositions: activeNPCs,
      instances: placedInstances,
      skipObjectId: objData.id,
      currentWorldX: objData.worldX,
      currentWorldZ: objData.worldZ
    }));

    if (!position) {
      position = findChunkSpawnPosition(chunk, playerPos, 2500 + (seedHash % 131), 2700 + (seedHash % 149), objData.respawnCycle + 11, buildSpawnOptions(fallbackAnimalRelocation, {
        instances: placedInstances,
        skipObjectId: objData.id
      }));
    }

    if (!position) return false;

    objData.x = position.x;
    objData.z = position.z;
    objData.worldX = position.worldX;
    objData.worldZ = position.worldZ;
    return true;
  }

  function respawnNode(objData, now) {
    objData._destroyed = false;
    objData.respawnAt = 0;

    rerollNodeRespawnState(objData, now);
    relocateRespawnedNode(objData);

    resetNodeHealth(objData);
    objData._needsMeshRefresh = true;

    if (typeof GameEntities !== "undefined" && GameEntities.refreshObject) {
      GameEntities.refreshObject(objData);
      objData._needsMeshRefresh = false;
    }
    if (typeof GameEntities !== "undefined" && GameEntities.showObject) {
      GameEntities.showObject(objData);
    }

    objData._persistBase = captureNodePersistState(objData);
  }

  function updateLoadedNodeState(objData, now, playerX, playerZ) {
    if (!isResourceNode(objData)) return;

    if (objData._destroyed) {
      if (!objData.respawnAt) {
        objData.respawnAt = now + (getTerrainRespawnTimeSeconds(objData.type) * 1000);
      }

      if (now >= objData.respawnAt) {
        var dx = objData.worldX - playerX;
        var dz = objData.worldZ - playerZ;
        if (Math.sqrt(dx * dx + dz * dz) >= getTerrainLoadedNodePlayerSafeDistance()) {
          respawnNode(objData, now);
        }
      }
      return;
    }

    advanceNodeGrowth(objData, now);

    if (objData._needsMeshRefresh && typeof GameEntities !== "undefined" && GameEntities.refreshObject) {
      GameEntities.refreshObject(objData);
      objData._needsMeshRefresh = false;
    }
  }

  function updateLoadedChunkNodeStates(now, playerX, playerZ) {
    for (var key in chunks) {
      var chunk = chunks[key];
      if (!chunk || !chunk.objects) continue;
      for (var i = 0; i < chunk.objects.length; i++) {
        updateLoadedNodeState(chunk.objects[i], now, playerX, playerZ);
      }
    }
  }

  function canHarvestNode(objData) {
    if (!isResourceNode(objData) || objData._destroyed) return false;
    var info = getNodeInfo(objData);
    return !!(info && info.harvestable !== false && objData.hp > 0);
  }

  function completeNodeHarvest(objData) {
    var info = getNodeInfo(objData);
    if (!info) return { rewards: {}, info: null, persistent: false };

    var rewards = cloneMap(info.rewards);
    var config = getNodeConfig(objData.type);
    var now = Date.now();

    if (config && config.kind === "growth" && config.persistOnHarvest) {
      objData.growthStage = config.postHarvestStage !== undefined ? config.postHarvestStage : 0;
      if (objData.nodeVariant === "giant" && config.giantVariant) {
        objData.nodeVariant = "default";
      }
      var growDelay = getGrowthDelayMs(objData, objData.growthStage);
      objData.nextGrowthAt = growDelay > 0 ? now + growDelay : 0;
      resetNodeHealth(objData);
      objData._needsMeshRefresh = true;

      if (typeof GameEntities !== "undefined" && GameEntities.refreshObject) {
        GameEntities.refreshObject(objData);
        objData._needsMeshRefresh = false;
      }
      if (typeof GameEntities !== "undefined" && GameEntities.showObject) {
        GameEntities.showObject(objData);
      }

      return { rewards: rewards, info: getNodeInfo(objData), persistent: true };
    }

    objData._destroyed = true;
    objData.hp = 0;
  objData.respawnAt = now + (getTerrainRespawnTimeSeconds(objData.type) * 1000);

    if (typeof GameEntities !== "undefined" && GameEntities.hideObject) {
      GameEntities.hideObject(objData);
    }

    return { rewards: rewards, info: info, persistent: false };
  }

  function forEachLoadedChunkNear(worldX, worldZ, radius, callback) {
    var minCx = Math.floor((worldX - radius) / CHUNK_SIZE);
    var maxCx = Math.floor((worldX + radius) / CHUNK_SIZE);
    var minCz = Math.floor((worldZ - radius) / CHUNK_SIZE);
    var maxCz = Math.floor((worldZ + radius) / CHUNK_SIZE);

    for (var cx = minCx; cx <= maxCx; cx++) {
      for (var cz = minCz; cz <= maxCz; cz++) {
        var chunk = chunks[cx + ',' + cz];
        if (chunk && chunk.objects) {
          callback(chunk);
        }
      }
    }
  }

  function getNearbyObjects(worldX, worldZ, maxDist, limit) {
    var results = [];
    var maxDistance = maxDist || 4;
    var maxDistanceSq = maxDistance * maxDistance;
    var maxCount = limit || 6;

    function insertNearbyObject(obj, distSq) {
      if (results.length >= maxCount && distSq >= results[results.length - 1].distanceSq) {
        return;
      }

      var insertIndex = results.length;
      while (insertIndex > 0 && distSq < results[insertIndex - 1].distanceSq) {
        insertIndex--;
      }

      if (insertIndex >= maxCount) {
        return;
      }

      results.splice(insertIndex, 0, { object: obj, distanceSq: distSq });
      if (results.length > maxCount) {
        results.length = maxCount;
      }
    }

    forEachLoadedChunkNear(worldX, worldZ, maxDistance, function (chunk) {
      for (var i = 0; i < chunk.objects.length; i++) {
        var obj = chunk.objects[i];
        if (!isResourceNode(obj) || obj._destroyed || obj.hp <= 0) continue;

        var dx = obj.worldX - worldX;
        if (Math.abs(dx) > maxDistance) continue;
        var dz = obj.worldZ - worldZ;
        if (Math.abs(dz) > maxDistance) continue;
        var distSq = dx * dx + dz * dz;
        if (distSq <= maxDistanceSq) {
          insertNearbyObject(obj, distSq);
        }
      }
    });

    return results.map(function (entry) {
      return entry.object;
    });
  }

  function update(playerX, playerZ) {
    var now = Date.now();
    var pcx = Math.floor(playerX / CHUNK_SIZE);
    var pcz = Math.floor(playerZ / CHUNK_SIZE);
    var chunkChanged = (_lastLoadedPlayerChunk.x !== pcx) || (_lastLoadedPlayerChunk.z !== pcz);

    if (chunkChanged) {
      _lastLoadedPlayerChunk.x = pcx;
      _lastLoadedPlayerChunk.z = pcz;

      for (var dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        for (var dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
          var cx = pcx + dx;
          var cz = pcz + dz;
          var key = cx + "," + cz;
          if (!chunks[key]) {
            var savedData = GameState.getChunkData(key);
            generateChunk(cx, cz, savedData);

            // Mark chunk as explored
            if (GameState.markChunkExplored) {
              GameState.markChunkExplored(cx, cz);
            }

            // Restore saved object states from previous visit
            if (savedData && savedData.objects) {
              var savedMap = {};
              savedData.objects.forEach(function (obj) {
                var savedId = getSavedNodeId(obj);
                if (savedId) savedMap[savedId] = obj;
              });
              if (chunks[key] && chunks[key].objects) {
                chunks[key].objects.forEach(function (obj) {
                  if (savedMap[obj.id]) {
                    restoreSavedNodeState(obj, savedMap[obj.id], now);
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
              var savedNode = buildSavedNodeState(obj);
              if (savedNode) savedObjects.push(savedNode);
            });
            GameState.saveChunkData(key, savedObjects.length ? {
              cx: cx,
              cz: cz,
              objects: savedObjects
            } : null);
          }

          if (typeof GameEntities !== 'undefined' && GameEntities.removeChunkObjects) {
            GameEntities.removeChunkObjects(chunkToUnload);
          }

          if (typeof AtmosphereSystem !== 'undefined' && AtmosphereSystem.unregisterWindTarget && chunkToUnload.mesh && chunkToUnload.mesh.traverse) {
            chunkToUnload.mesh.traverse(function(child) {
              AtmosphereSystem.unregisterWindTarget(child);
            });
          }

          if (chunkToUnload.mesh) {
            GameScene.getScene().remove(chunkToUnload.mesh);
            disposeChunkMesh(chunkToUnload.mesh);
          }

          // Clear water tiles for unloaded chunk
          if (typeof WaterSystem !== 'undefined') {
            WaterSystem.clearWaterForChunk(cx, cz);
          }

          delete chunks[key];
          _visibilityDirty = true;
        }
      }
    }

    if (chunkChanged || (now - _lastNodeStateUpdateAt) >= NODE_STATE_UPDATE_INTERVAL_MS) {
      _lastNodeStateUpdateAt = now;
      updateLoadedChunkNodeStates(now, playerX, playerZ);
    }
  }

  function disposeChunkMesh(mesh) {
    if (!mesh || !mesh.traverse) return;

    var disposedMaterials = [];
    mesh.traverse(function(child) {
      if (!child) return;
      if (child.userData && child.userData.isWater) {
        return;
      }
      if (child.geometry && child.geometry.dispose) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          for (var i = 0; i < child.material.length; i++) {
            if (disposedMaterials.indexOf(child.material[i]) !== -1) continue;
            disposedMaterials.push(child.material[i]);
            if (child.material[i] && child.material[i].dispose) child.material[i].dispose();
          }
        } else if (disposedMaterials.indexOf(child.material) === -1) {
          disposedMaterials.push(child.material);
          if (child.material.dispose) child.material.dispose();
        }
      }
    });
  }

  function generateChunk(cx, cz, savedChunkData) {
    var key = cx + "," + cz;
    var seed = chunkSeed(cx, cz) + worldSeed;
    var distFromHome = Math.sqrt(cx * cx + cz * cz);
    var currentAge = (typeof GameState !== 'undefined' && GameState.getAge) ? GameState.getAge() : 'age.stone';
    var predatorZone = (savedChunkData && savedChunkData.predatorZone) ? savedChunkData.predatorZone : getPredatorZoneProfile(seed, distFromHome, currentAge);

    var chunkData = {
      cx: cx, cz: cz,
      seed: seed,
      objects: [],
      buildings: [],
      predatorZone: predatorZone ? {
        level: predatorZone.level,
        label: predatorZone.label,
        animalBonus: predatorZone.animalBonus,
        dangerBonus: predatorZone.dangerBonus
      } : null,
      generated: true,
      generatedAt: (savedChunkData && typeof savedChunkData.generatedAt === "number") ? savedChunkData.generatedAt : Date.now(),
      bounds: createChunkBounds(cx, cz),
      isVisible: true,
      mesh: null
    };

    // Create terrain mesh
    var group = new THREE.Group();
    group.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
    group.userData.chunkKey = key;

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

    // Generate water first so resources do not spawn into rivers/lakes.
    if (typeof WaterSystem !== 'undefined') {
      var waterPositions = WaterSystem.generateWaterForChunk(cx, cz, seed);
      if (waterPositions.length > 0) {
        WaterSystem.createWaterMesh(waterPositions, group);
      }
      reapplyBridgeTilesForChunk(cx, cz);
    }

    // Generate objects based on distance from home
    var treeGeneration = getTerrainGenerationNodeConfig('tree');
    var treePlacement = treeGeneration.placement || {};
    var treeCount = resolveDistanceBandCount(treeGeneration.countByDistance || [], distFromHome, rng(10));

    // Get player position to avoid spawning on player
    var hasSavedChunkData = !!savedChunkData;
    var playerPos = hasSavedChunkData ? null : getFallbackPlayerPosition();
    var placedInstances = hasSavedChunkData ? null : ((typeof GameState !== 'undefined' && GameState.getAllInstances) ? GameState.getAllInstances() : null);

    for (var i = 0; i < treeCount; i++) {
      var treePos = findChunkSpawnPosition(chunkData, playerPos, 100, 101, i, buildSpawnOptions(treePlacement, {
        instances: placedInstances
      }));
      if (!treePos) continue;

      var treeHp = getBalancedEntityHp('node.tree');
      chunkData.objects.push({
        id: "obj_" + key + "_" + i,
        type: "node.tree",
        x: treePos.x, z: treePos.z,
        hp: treeHp, maxHp: treeHp,
        worldX: treePos.worldX,
        worldZ: treePos.worldZ
      });
    }

    // Rocks
    var rockGeneration = getTerrainGenerationNodeConfig('rock');
    var rockPlacement = rockGeneration.placement || {};
    var rockCount = resolveDistanceBandCount(rockGeneration.countByDistance || [], distFromHome, rng(20));

    var rockHp = getBalancedEntityHp('node.rock');
    for (var i = 0; i < rockCount; i++) {
      var rockPos = findChunkSpawnPosition(chunkData, playerPos, 200, 201, i, buildSpawnOptions(rockPlacement, {
        instances: placedInstances
      }));
      if (!rockPos) continue;

      chunkData.objects.push({
        id: "obj_" + key + "_r" + i,
        type: "node.rock",
        x: rockPos.x, z: rockPos.z,
        hp: rockHp, maxHp: rockHp,
        worldX: rockPos.worldX,
        worldZ: rockPos.worldZ
      });
    }

    // Berry bushes (near home - more frequent around early settlements)
    var berryBushGeneration = getTerrainGenerationNodeConfig('berryBush');
    var berryBushPlacement = berryBushGeneration.placement || {};
    var bushCount = resolveDistanceBandCount(berryBushGeneration.countByDistance || [], distFromHome, rng(30));
    var bushHp = getBalancedEntityHp('node.berry_bush');
    for (var i = 0; i < bushCount; i++) {
      var bushPos = findChunkSpawnPosition(chunkData, playerPos, 300, 301, i, buildSpawnOptions(berryBushPlacement, {
        instances: placedInstances
      }));
      if (!bushPos) continue;

      chunkData.objects.push({
        id: "obj_" + key + "_b" + i,
        type: "node.berry_bush",
        x: bushPos.x, z: bushPos.z,
        hp: bushHp, maxHp: bushHp,
        worldX: bushPos.worldX,
        worldZ: bushPos.worldZ
      });
    }

    // Animals (further from home = more/dangerous)
    var animalGeneration = getTerrainAnimalGenerationConfig();
    if (distFromHome >= Number(animalGeneration.minDistanceFromHome || 0)) {
      var animalPlacement = animalGeneration.placement || {};
      var animalCount = Math.min(Math.floor(distFromHome), Number(animalGeneration.baseCountDistanceFloorCap) || 0);
      if (predatorZone) {
        var predatorZoneCap = getPredatorZoneAnimalCap(predatorZone.level);
        animalCount = predatorZoneCap > 0
          ? Math.min(animalCount + (predatorZone.animalBonus || 0), predatorZoneCap)
          : (animalCount + (predatorZone.animalBonus || 0));
      }

      for (var i = 0; i < animalCount; i++) {
        var animalPos = findChunkSpawnPosition(chunkData, playerPos, 400, 401, i, buildSpawnOptions(animalPlacement, {
          instances: placedInstances
        }));
        if (!animalPos) continue;

        var animalRoll = rng(410 + i);
        var animalType = chooseAnimalType(currentAge, distFromHome, animalRoll, predatorZone);

        var animalHp = getBalancedEntityHp(animalType);
        chunkData.objects.push({
          id: "obj_" + key + "_a" + i,
          type: animalType,
          x: animalPos.x, z: animalPos.z,
          hp: animalHp, maxHp: animalHp,
          worldX: animalPos.worldX,
          worldZ: animalPos.worldZ
        });
      }
    }

    // Flint deposits (far chunks)
    var flintGeneration = getTerrainOreGenerationConfig('flint');
    if (distFromHome >= Number(flintGeneration.minDistanceFromHome || 0) && rng(500) > Number(flintGeneration.rollThreshold)) {
      var flintPos = findChunkSpawnPosition(chunkData, playerPos, 600, 601, 0, buildSpawnOptions(flintGeneration.placement, {
        instances: placedInstances
      }));
      if (flintPos) {
      var flintEntityId = flintGeneration.entityId || 'node.flint_deposit';
      var flintHp = getBalancedEntityHp(flintEntityId);
      chunkData.objects.push({
        id: "obj_" + key + "_f0",
        type: flintEntityId,
        x: flintPos.x, z: flintPos.z,
        hp: flintHp, maxHp: flintHp,
        worldX: flintPos.worldX,
        worldZ: flintPos.worldZ
      });
      }
    }

    // Copper deposits (Bronze Age - far chunks)
    var copperGeneration = getTerrainOreGenerationConfig('copper');
    if (distFromHome >= Number(copperGeneration.minDistanceFromHome || 0) && rng(700) > Number(copperGeneration.rollThreshold)) {
      var copperPos = findChunkSpawnPosition(chunkData, playerPos, 800, 801, 0, buildSpawnOptions(copperGeneration.placement, {
        instances: placedInstances
      }));
      if (copperPos) {
      var copperEntityId = copperGeneration.entityId || 'node.copper_deposit';
      var copperHp = getBalancedEntityHp(copperEntityId);
      chunkData.objects.push({
        id: "obj_" + key + "_copper0",
        type: copperEntityId,
        x: copperPos.x, z: copperPos.z,
        hp: copperHp, maxHp: copperHp,
        worldX: copperPos.worldX,
        worldZ: copperPos.worldZ
      });
      }
    }

    // Tin deposits (Bronze Age - further chunks)
    var tinGeneration = getTerrainOreGenerationConfig('tin');
    if (distFromHome >= Number(tinGeneration.minDistanceFromHome || 0) && rng(900) > Number(tinGeneration.rollThreshold)) {
      var tinPos = findChunkSpawnPosition(chunkData, playerPos, 1000, 1001, 0, buildSpawnOptions(tinGeneration.placement, {
        instances: placedInstances
      }));
      if (tinPos) {
      var tinEntityId = tinGeneration.entityId || 'node.tin_deposit';
      var tinHp = getBalancedEntityHp(tinEntityId);
      chunkData.objects.push({
        id: "obj_" + key + "_tin0",
        type: tinEntityId,
        x: tinPos.x, z: tinPos.z,
        hp: tinHp, maxHp: tinHp,
        worldX: tinPos.worldX,
        worldZ: tinPos.worldZ
      });
      }
    }

    var generationTime = chunkData.generatedAt;
    chunkData.objects.forEach(function (obj) {
      initializeNodeState(obj, generationTime);
      if (isResourceNode(obj)) {
        obj._persistBase = captureNodePersistState(obj);
      }
    });

    chunkData.mesh = group;
    chunks[key] = chunkData;
  _visibilityDirty = true;
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

  function getVisibleChunkCount() {
    return _visibleChunkCount;
  }

  function reapplyBridgeTilesForChunk(cx, cz) {
    if (typeof GameState === 'undefined' || typeof WaterSystem === 'undefined') return;

    var instances = getPlacedInstancesForLookup();
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
      var instances = getPlacedInstancesForLookup();
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
    var nearestDist = Number(maxDist) || 0;
    if (!(nearestDist > 0)) return null;
    var nearestDistSq = nearestDist * nearestDist;

    forEachLoadedChunkNear(worldX, worldZ, nearestDist, function (chunk) {
      for (var i = 0; i < chunk.objects.length; i++) {
        var obj = chunk.objects[i];
        if (obj.hp <= 0 || obj._destroyed) continue;
        var dx = obj.worldX - worldX;
        if (Math.abs(dx) > nearestDist) continue;
        var dz = obj.worldZ - worldZ;
        if (Math.abs(dz) > nearestDist) continue;
        var distSq = dx * dx + dz * dz;
        if (distSq < nearestDistSq) {
          nearestDistSq = distSq;
          nearestDist = Math.sqrt(distSq);
          nearest = obj;
        }
      }
    });

    return nearest;
  }

  function restoreChunk(chunkData) {
    var key = chunkData.cx + "," + chunkData.cz;
    if (chunks[key]) return;

    // Re-generate mesh, but keep saved object states
    generateChunk(chunkData.cx, chunkData.cz, chunkData);

    // Restore saved HP states
    if (chunkData.objects) {
      var savedMap = {};
      chunkData.objects.forEach(function (obj) {
        var savedId = getSavedNodeId(obj);
        if (savedId) savedMap[savedId] = obj;
      });
      if (chunks[key]) {
        var now = Date.now();
        chunks[key].objects.forEach(function (obj) {
          if (savedMap[obj.id]) {
            restoreSavedNodeState(obj, savedMap[obj.id], now);
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
    getVisibleChunkCount: getVisibleChunkCount,
    refreshVisibility: refreshVisibility,
    getChunkSize: getChunkSize,
    isWalkable: isWalkable,
    isShallowWater: isShallowWater,
    findNearestObject: findNearestObject,
    getNearbyObjects: getNearbyObjects,
    getNodeInfo: getNodeInfo,
    isNodeAtMaxGrowth: isNodeAtMaxGrowth,
    canWaterGrowthNode: canWaterGrowthNode,
    applyGrowthWaterBoost: applyGrowthWaterBoost,
    canHarvestNode: canHarvestNode,
    completeNodeHarvest: completeNodeHarvest,
    relocateRespawnedAnimal: relocateRespawnedAnimal,
    restoreChunk: restoreChunk,
    seededRandom: seededRandom,
    reserveTile: reserveTile,
    releaseTile: releaseTile,
    _reservedTiles: _reservedTiles
  };
})();
