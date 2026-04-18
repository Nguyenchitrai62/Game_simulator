/**
 * NPC System - Manages worker NPCs for buildings
 * Workers harvest nodes, transport goods, and resident workers can also service farm plots
 */

window.NPCSystem = (function() {
  'use strict';

  // NPC States
  const STATE = {
    IDLE: 'idle',
    FIND_NODE: 'find_node',
    WALK_TO_NODE: 'walk_to_node',
    HARVEST: 'harvest',
    WALK_HOME: 'walk_home',
    DEPOSIT: 'deposit',
    WALK_TO_SOURCE: 'walk_to_source',
    FETCH_WATER: 'fetch_water',
    WALK_TO_PLOT: 'walk_to_plot',
    TEND_PLOT: 'tend_plot'
  };

  // NPCs array - all active NPCs
  let npcs = [];
  let nextNPCId = 1;
  let _visualTime = 0;
  let _pathCache = Object.create(null);
  let _pathCacheOrder = [];

  function getLiveInstances() {
    if (GameState.getAllInstancesLive) return GameState.getAllInstancesLive();
    return GameState.getAllInstances();
  }

  function getPathCacheLimit() {
    return (window.GameQualitySettings && GameQualitySettings.getConfigValue) ? GameQualitySettings.getConfigValue('simulation.pathCacheSize', 180) : 180;
  }

  function clearPathCache() {
    _pathCache = Object.create(null);
    _pathCacheOrder = [];
  }

  function getPathCacheKey(startNode, goalNode) {
    return startNode.x + ',' + startNode.z + '>' + goalNode.x + ',' + goalNode.z;
  }

  function cloneCachedPath(path, goal) {
    var clone = [];
    for (var i = 0; i < path.length; i++) {
      clone.push({ x: path[i].x, z: path[i].z });
    }

    if (path.isPartial) {
      clone.isPartial = true;
    } else if (goal && clone.length) {
      clone[clone.length - 1] = { x: goal.x, z: goal.z };
    }

    return clone;
  }

  function getCachedPath(cacheKey, goal) {
    var cachedEntry = _pathCache[cacheKey];
    if (!cachedEntry) return null;
    return cloneCachedPath(cachedEntry.path, goal);
  }

  function storeCachedPath(cacheKey, path) {
    var limit = Math.max(0, getPathCacheLimit() || 0);
    if (limit <= 0) return path;

    if (!_pathCache[cacheKey]) {
      _pathCacheOrder.push(cacheKey);
    }

    _pathCache[cacheKey] = {
      path: cloneCachedPath(path)
    };

    while (_pathCacheOrder.length > limit) {
      var oldestKey = _pathCacheOrder.shift();
      delete _pathCache[oldestKey];
    }

    return path;
  }

  /**
   * Initialize NPC system
   * Cleans up existing NPCs and meshes
   */
  function init() {
    // Remove all existing NPC meshes from scene
    const scene = GameScene.getScene();
    npcs.forEach(npc => {
      if (npc.mesh && scene) {
        scene.remove(npc.mesh);
      }
    });
    
    // Reset NPC array
    npcs = [];
    nextNPCId = 1;
    _visualTime = 0;
    clearPathCache();
    
    console.log('[NPCSystem] Initialized');
  }

  /**
   * Spawn workers for a building
   * @param {string} instanceUid - Building instance UID
   */
  function spawnWorkersForBuilding(instanceUid) {
    const instance = GameState.getInstance(instanceUid);
    if (!instance) {
      console.warn('[NPCSystem] Cannot spawn workers - building instance not found:', instanceUid);
      return;
    }

    const entity = GameRegistry.getEntity(instance.entityId);
    const balance = GameRegistry.getBalance(instance.entityId);
    
    if (!balance || !balance.workerCount) {
      console.warn('[NPCSystem] Building has no workerCount defined:', instance.entityId);
      return;
    }

    const level = instance.level || 1;
    const workerCount = balance.workerCount[level];
    
    // If workerCount is 0 or undefined, don't spawn workers (e.g. Warehouse)
    if (!workerCount || workerCount === 0) {
      return;
    }

    // Count existing workers for this building
    const existingWorkers = npcs.filter(npc => npc.buildingUid === instanceUid).length;
    const workersToSpawn = workerCount - existingWorkers;

    for (let i = 0; i < workersToSpawn; i++) {
      const spawnPosition = findBuildingAccessPosition(instance);
      if (!spawnPosition) {
        console.warn('[NPCSystem] Could not find safe spawn position for worker at building:', instanceUid);
        continue;
      }

      const npc = {
        uid: `npc_${nextNPCId++}`,
        buildingUid: instanceUid,
        buildingEntityId: instance.entityId,
        state: STATE.IDLE,
        position: { x: spawnPosition.x, z: spawnPosition.z },
        taskType: null,
        targetNode: null,
        targetPosition: null,
        pathQueue: [],
        harvestProgress: 0,
        harvestedAmount: {},
        farmTask: null,
        farmPlotUid: null,
        growthNodeId: null,
        farmTaskProgress: 0,
        waterSource: null,
        carryingWater: false,
        stuckSeconds: 0,
        repathTriggered: false,
        nightLightPaused: false,
        threatenedById: null,
        threatenedByType: null,
        threatDistance: Infinity,
        threatLevel: null,
        threatExpiresAt: 0,
        statusText: 'Looking for work',
        speed: 0.05, // tiles per frame (slower than player)
        visualOffset: Math.random() * Math.PI * 2,
        mesh: null
      };

      npcs.push(npc);
      
      // Create 3D mesh
      if (window.GameEntities && GameEntities.createNPCMesh) {
        npc.mesh = GameEntities.createNPCMesh(instance.entityId);
        npc.mesh.position.set(spawnPosition.x, 0, spawnPosition.z);
        GameScene.addToScene(npc.mesh);
      }

      console.log('[NPCSystem] Spawned worker:', npc.uid, 'for building:', instanceUid);
    }
  }

  /**
   * Despawn all workers for a building
   * @param {string} instanceUid - Building instance UID
   */
  function despawnWorkersForBuilding(instanceUid) {
    const workersToRemove = npcs.filter(npc => npc.buildingUid === instanceUid);
    
    workersToRemove.forEach(npc => {
      // Remove 3D mesh
      if (npc.mesh && GameScene.removeFromScene) {
        GameScene.removeFromScene(npc.mesh);
      }
      console.log('[NPCSystem] Despawned worker:', npc.uid);
    });

    // Remove from npcs array
    npcs = npcs.filter(npc => npc.buildingUid !== instanceUid);
  }

  /**
   * Update all NPCs (called each frame)
   * @param {number} deltaTime - Time since last frame in seconds
   */
  function update(deltaTime) {
    _visualTime += deltaTime;
    var bobTime = _visualTime * 8;

    npcs.forEach(npc => {
      // Safety check: Skip NPCs for non-harvester buildings (e.g. Warehouse)
      const building = GameState.getInstance(npc.buildingUid);
      if (building) {
        const balance = GameRegistry.getBalance(building.entityId);
        const level = building.level || 1;
        if (balance && balance.workerCount && balance.workerCount[level] === 0) {
          // This NPC shouldn't exist - skip update
          return;
        }
      }
      
      var previousX = npc.position.x;
      var previousZ = npc.position.z;
      updateNPC(npc, deltaTime);
      updateNPCStuckRecovery(npc, deltaTime, previousX, previousZ);
      
      // Update 3D mesh position
      if (npc.mesh) {
        npc.mesh.position.x = npc.position.x;
        npc.mesh.position.z = npc.position.z;
        
        // Simple bobbing animation when walking
        if (npc.state === STATE.WALK_TO_NODE || npc.state === STATE.WALK_HOME || npc.state === STATE.WALK_TO_SOURCE || npc.state === STATE.WALK_TO_PLOT) {
          npc.mesh.position.y = Math.abs(Math.sin(bobTime + (npc.visualOffset || 0))) * 0.1;
        } else {
          npc.mesh.position.y = 0;
        }
      }
    });
  }

  /**
   * Update single NPC state machine
   * @param {object} npc - NPC instance
   * @param {number} deltaTime - Time delta
   */
  function updateNPC(npc, deltaTime) {
    const building = GameState.getInstance(npc.buildingUid);
    if (!isWorkerThreatActive(npc)) {
      clearWorkerThreatState(npc);
    }

    if (building) {
      const nearBuilding = Math.abs(npc.position.x - building.x) < 1.6 && Math.abs(npc.position.z - building.z) < 1.6;
      if (isInsideBuildingFootprint(npc.position, building) || (nearBuilding && !canMoveTo(npc.position.x, npc.position.z))) {
        const safePosition = findBuildingAccessPosition(building, npc.targetPosition || npc.position);
        if (safePosition) {
          npc.position.x = safePosition.x;
          npc.position.z = safePosition.z;
          npc.pathQueue = [];
          if (npc.mesh) {
            npc.mesh.position.x = safePosition.x;
            npc.mesh.position.z = safePosition.z;
          }
        }
      }
    }

    if (building && handleWorkerThreatResponse(npc, building)) {
      return;
    }

    if (building && handleNightWorkPause(npc, building)) {
      return;
    }

    switch (npc.state) {
      case STATE.IDLE:
        handleIdle(npc);
        break;
      case STATE.FIND_NODE:
        handleFindNode(npc);
        break;
      case STATE.WALK_TO_NODE:
        handleWalkToNode(npc, deltaTime);
        break;
      case STATE.HARVEST:
        handleHarvest(npc, deltaTime);
        break;
      case STATE.WALK_HOME:
        handleWalkHome(npc, deltaTime);
        break;
      case STATE.DEPOSIT:
        handleDeposit(npc);
        break;
      case STATE.WALK_TO_SOURCE:
        handleWalkToSource(npc, deltaTime);
        break;
      case STATE.FETCH_WATER:
        handleFetchWater(npc, deltaTime);
        break;
      case STATE.WALK_TO_PLOT:
        handleWalkToPlot(npc, deltaTime);
        break;
      case STATE.TEND_PLOT:
        handleTendPlot(npc, deltaTime);
        break;
    }
  }

  function isNightWorkRestricted() {
    return typeof DayNightSystem !== 'undefined' && DayNightSystem.isNight();
  }

  function isPositionLitForNightWork(worldX, worldZ) {
    if (!isNightWorkRestricted()) return true;
    return !!(window.FireSystem && FireSystem.isPositionLit && FireSystem.isPositionLit(worldX, worldZ, {
      requireActive: true,
      includePlayerTorch: false
    }));
  }

  function areNightWorkPositionsLit(positions) {
    if (!isNightWorkRestricted()) return true;
    if (!positions || !positions.length) return false;

    for (var i = 0; i < positions.length; i++) {
      var pos = positions[i];
      if (!pos) continue;
      if (!isPositionLitForNightWork(pos.x, pos.z)) {
        return false;
      }
    }

    return true;
  }

  function getNpcNightPauseLabel(npc, building) {
    if (npc && npc.farmPlotUid) {
      var plotInstance = GameState.getInstance(npc.farmPlotUid);
      var plotEntity = plotInstance ? GameRegistry.getEntity(plotInstance.entityId) : null;
      if (plotEntity) return plotEntity.name;
    }

    var buildingEntity = building ? GameRegistry.getEntity(building.entityId) : null;
    return buildingEntity ? buildingEntity.name : 'Worker area';
  }

  function notifyNightWorkPause(npc, building) {
    if (!window.GameHUD || !GameHUD.showNotification) return;

    var label = getNpcNightPauseLabel(npc, building);
    var warningKey = (building ? building.uid : 'unknown') + '::' + label;
    var now = Date.now();

    if (!notifyNightWorkPause._lastShown) {
      notifyNightWorkPause._lastShown = {};
    }

    if (notifyNightWorkPause._lastShown[warningKey] && (now - notifyNightWorkPause._lastShown[warningKey]) < 12000) {
      return;
    }

    notifyNightWorkPause._lastShown[warningKey] = now;
    GameHUD.showNotification(label + ' paused at night: outside active campfire light.', 'warning');
  }

  function getNpcNightWorkAnchor(npc, building) {
    if (npc && npc.farmPlotUid) {
      var plotInstance = GameState.getInstance(npc.farmPlotUid);
      if (plotInstance) {
        return { x: plotInstance.x, z: plotInstance.z };
      }
    }

    if (npc && npc.growthNodeId) {
      var growthNode = getGrowthNodeById(npc.growthNodeId);
      if (growthNode) {
        return { x: growthNode.worldX, z: growthNode.worldZ };
      }
    }

    if (npc && npc.targetNode) {
      return { x: npc.targetNode.x, z: npc.targetNode.z };
    }

    if (npc && npc.targetPosition) {
      return { x: npc.targetPosition.x, z: npc.targetPosition.z };
    }

    if (building) {
      return { x: building.x, z: building.z };
    }

    return null;
  }

  function abortNightRestrictedWork(npc, building, statusText) {
    if (!building) return false;

    if (npc.taskType === 'farm' || npc.taskType === 'tree_growth') {
      clearFarmAssignment(npc);
    }

    npc.targetNode = null;
    npc.harvestProgress = 0;

    var homePosition = findBuildingAccessPosition(building, npc.position) || { x: building.x, z: building.z };
    npc.targetPosition = homePosition;
    npc.pathQueue = findPath(npc.position, npc.targetPosition);
    npc.state = STATE.WALK_HOME;
    npc.statusText = statusText || 'Returning to campfire light';
    return true;
  }

  function handleNightWorkPause(npc, building) {
    if (!building) return false;

    if (!isNightWorkRestricted()) {
      npc.nightLightPaused = false;
      return false;
    }

    if (npc.state === STATE.WALK_HOME || npc.state === STATE.DEPOSIT) {
      npc.nightLightPaused = false;
      return false;
    }

    var homeLit = isPositionLitForNightWork(building.x, building.z);
    var workAnchor = getNpcNightWorkAnchor(npc, building);
    var workLit = workAnchor ? areNightWorkPositionsLit([workAnchor]) : homeLit;

    if ((npc.state === STATE.IDLE || npc.state === STATE.FIND_NODE) && !homeLit) {
      if (!npc.nightLightPaused) {
        notifyNightWorkPause(npc, building);
      }
      npc.nightLightPaused = true;
      npc.targetNode = null;
      npc.targetPosition = null;
      npc.pathQueue = [];
      npc.state = STATE.IDLE;
      npc.statusText = 'Waiting for campfire light';
      return true;
    }

    if (homeLit && workLit) {
      npc.nightLightPaused = false;
      return false;
    }

    if (!npc.nightLightPaused) {
      notifyNightWorkPause(npc, building);
    }
    npc.nightLightPaused = true;
    return abortNightRestrictedWork(npc, building, 'Returning to campfire light');
  }

  function clearWorkerThreatState(npc) {
    if (!npc) return;
    npc.threatenedById = null;
    npc.threatenedByType = null;
    npc.threatDistance = Infinity;
    npc.threatLevel = null;
    npc.threatExpiresAt = 0;
  }

  function isWorkerThreatActive(npc) {
    return false;
  }

  function getWorkerThreatLabel(npc) {
    if (!npc || !npc.threatenedByType) return 'threat';
    var entity = GameRegistry.getEntity(npc.threatenedByType);
    return entity ? entity.name : npc.threatenedByType;
  }

  function notifyWorkerThreat(npc, building) {
    if (!npc || !building || !window.GameHUD || !GameHUD.showNotification) return;

    var warningKey = building.uid + '::' + (npc.threatenedByType || 'threat');
    var now = Date.now();
    if (!notifyWorkerThreat._lastShown) {
      notifyWorkerThreat._lastShown = {};
    }

    if (notifyWorkerThreat._lastShown[warningKey] && (now - notifyWorkerThreat._lastShown[warningKey]) < 10000) {
      return;
    }

    notifyWorkerThreat._lastShown[warningKey] = now;
    var buildingEntity = GameRegistry.getEntity(building.entityId);
    var buildingLabel = buildingEntity ? buildingEntity.name : 'Worker area';
    GameHUD.showNotification(buildingLabel + ' workers are under attack by ' + getWorkerThreatLabel(npc) + '.', 'warning');
  }

  function isWorkerExposed(npc, building) {
    if (!npc || !npc.position || !building) return false;
    if (npc.state === STATE.DEPOSIT) return false;

    var dx = npc.position.x - building.x;
    var dz = npc.position.z - building.z;
    var distanceFromHome = Math.sqrt(dx * dx + dz * dz);

    if (npc.state === STATE.WALK_HOME && distanceFromHome < 1.8) return false;
    if (npc.state === STATE.IDLE && distanceFromHome < 1.9) return false;

    return distanceFromHome > 1.9 || npc.state === STATE.FIND_NODE || npc.state === STATE.WALK_TO_NODE || npc.state === STATE.HARVEST || isFarmTaskState(npc.state);
  }

  function reportWorkerThreat(npcUid, threatType, threatSourceId, distance, isAttacking) {
    return false;
  }

  function handleWorkerThreatResponse(npc, building) {
    if (!building || !isWorkerThreatActive(npc)) return false;

    var threatLabel = getWorkerThreatLabel(npc);
    var dx = npc.position.x - building.x;
    var dz = npc.position.z - building.z;
    var distanceFromHome = Math.sqrt(dx * dx + dz * dz);

    if (npc.threatLevel === 'attacking') {
      notifyWorkerThreat(npc, building);
    }

    if (npc.state === STATE.DEPOSIT) {
      npc.statusText = 'Depositing under threat';
      return false;
    }

    if (npc.state === STATE.WALK_HOME && npc.targetPosition) {
      npc.statusText = 'Fleeing ' + threatLabel;
      return false;
    }

    if (distanceFromHome <= 1.9) {
      if (npc.taskType === 'farm' || npc.taskType === 'tree_growth') {
        clearFarmAssignment(npc);
      }
      npc.targetNode = null;
      npc.targetPosition = null;
      npc.pathQueue = [];
      npc.state = STATE.IDLE;
      npc.statusText = 'Taking cover from ' + threatLabel;
      return true;
    }

    npc.harvestProgress = 0;
    if (sendNpcHomeWithGoods(npc, 'Fleeing ' + threatLabel)) {
      return true;
    }

    npc.state = STATE.IDLE;
    npc.statusText = 'Escaping ' + threatLabel;
    return true;
  }

  function getNearestExposedWorker(worldX, worldZ, maxDistance) {
    return null;
  }

  function getThreatenedWorkersSummary() {
    return {
      count: 0,
      attackingCount: 0,
      nearbyCount: 0,
      workers: [],
      topThreat: null
    };
  }

  /**
   * IDLE state - transition to find node
   */
  function handleIdle(npc) {
    npc.targetNode = null;
    const workerBuilding = GameState.getInstance(npc.buildingUid);

    if (npc.harvestedAmount && Object.keys(npc.harvestedAmount).length > 0) {
      if (workerBuilding) {
        const homePosition = findBuildingAccessPosition(workerBuilding, npc.position) || { x: workerBuilding.x, z: workerBuilding.z };
        npc.targetPosition = homePosition;
        npc.pathQueue = findPath(npc.position, npc.targetPosition);
        npc.state = STATE.WALK_HOME;
        npc.statusText = 'Returning with goods';
        return;
      }
    }

    if (handleFindFarmTask(npc, {
      includeStoredPickup: true,
      allowedTasks: { collect: true, harvest: true }
    })) {
      return;
    }

    if (handleFindPriorityTreeHarvestTask(npc)) {
      return;
    }

    if (canWorkerHandleWaterTasks(workerBuilding)) {
      if (handleFindFarmTask(npc, {
        allowedTasks: { water: true }
      })) {
        return;
      }
    }

    if (handleFindFarmTask(npc, {
      allowedTasks: { plant: true }
    })) {
      return;
    }

    npc.state = STATE.FIND_NODE;
  }

  /**
   * FIND_NODE state - search for harvestable resource node
   */
  function handleFindNode(npc) {
    const building = GameState.getInstance(npc.buildingUid);
    if (!building) {
      console.warn('[NPCSystem] Building not found for NPC:', npc.uid);
      return;
    }

    npc.taskType = 'harvest';

    const storageUsed = GameState.getStorageUsed(npc.buildingUid);
    const storageCapacity = GameState.getStorageCapacity(npc.buildingUid);
    if (storageUsed >= storageCapacity && storageCapacity < Infinity) {
      npc.state = STATE.IDLE;
      npc.waitingForStorage = true;
      return;
    }

    npc.waitingForStorage = false;

    const balance = GameRegistry.getBalance(building.entityId);
    const searchRadius = (balance.searchRadius && balance.searchRadius[building.level]) || 5;
    const targetNodeTypes = getHarvestNodeTypes(building.entityId);
    if (!targetNodeTypes.length) {
      if (!npc._noHarvestWarningShown) {
        console.warn('[NPCSystem] No harvest node type for building:', building.entityId, '- NPC will remain idle');
        npc._noHarvestWarningShown = true;
      }
      npc.state = STATE.IDLE;
      return;
    }

    const node = findNearestNode(building.x, building.z, searchRadius, targetNodeTypes, building);
    if (node) {
      const approachPosition = findApproachPosition(node.x, node.z);
      if (!approachPosition) {
        npc.targetNode = null;
        npc.targetPosition = null;
        npc.state = STATE.IDLE;
        return;
      }

      npc.targetNode = node;
      npc.targetPosition = approachPosition;
      npc.pathQueue = findPath(npc.position, npc.targetPosition);
      npc.state = STATE.WALK_TO_NODE;
      npc.statusText = 'Walking to resource';
      return;
    }

    if (handleFindGrowthTask(npc)) {
      return;
    }

    var homeLit = building ? isPositionLitForNightWork(building.x, building.z) : true;
    npc.state = STATE.IDLE;
    npc.statusText = (!homeLit && isNightWorkRestricted()) ? 'Waiting for campfire light' : (npcCanServiceFarm(npc) ? 'Looking for resources or farm work' : 'Looking for work');
  }

  /**
   * WALK_TO_NODE state - move along path to target node
   */
  function handleWalkToNode(npc, deltaTime) {
    if (!npc.targetPosition) {
      npc.state = STATE.IDLE;
      return;
    }

    const arrived = moveNPCAlongPath(npc, deltaTime);

    if (arrived) {
      const nodeStillValid = isNodeStillValid(npc.targetNode);

      if (nodeStillValid) {
        npc.harvestProgress = 0;
        npc.state = STATE.HARVEST;
      } else {
        npc.targetNode = null;
        npc.state = STATE.FIND_NODE;
      }
    }
  }

  /**
   * HARVEST state - harvest the resource node
   */
  function handleHarvest(npc, deltaTime) {
    if (!npc.targetNode || !npc.targetNode.object) {
      npc.state = STATE.FIND_NODE;
      return;
    }

    npc.statusText = 'Harvesting resource';

    const node = npc.targetNode.object;

    var specBonus = getSpecializationBonus(npc);
    var harvestSpeed = specBonus.harvestSpeed;

    if (window.ResearchSystem) {
      var globalBonuses = ResearchSystem.getGlobalBonuses();
      harvestSpeed *= (1 + (globalBonuses.harvestSpeedBonus || 0));
    }

    var harvestInterval = 1.0 / harvestSpeed;

    npc.harvestProgress += deltaTime;

    if (npc.harvestProgress >= harvestInterval) {
      npc.harvestProgress = 0;

      var damageAmount = 1;
      if (npc.trainingLevel > 1) {
        damageAmount *= (1 + ((npc.trainingLevel - 1) * 0.1));
      }

      node.hp -= damageAmount;

      if (npc.mesh && npc.mesh.children[0]) {
        const bodyMesh = npc.mesh.children[0];
        bodyMesh.rotation.z = Math.PI / 8;
        setTimeout(() => {
          if (bodyMesh) bodyMesh.rotation.z = 0;
        }, 200);
      }

      if (node.hp <= 0) {
        var harvestResult = (window.GameTerrain && GameTerrain.completeNodeHarvest) ? GameTerrain.completeNodeHarvest(node) : null;
        var rewardMap = harvestResult && harvestResult.rewards ? harvestResult.rewards : null;

        if (!rewardMap) {
          const nodeBalance = GameRegistry.getBalance(node.type);
          rewardMap = nodeBalance ? nodeBalance.rewards : null;
        }

        if (rewardMap) {
          for (const [resourceId, amount] of Object.entries(rewardMap)) {
            npc.harvestedAmount[resourceId] = (npc.harvestedAmount[resourceId] || 0) + amount;
          }
        }

        const building = GameState.getInstance(npc.buildingUid);
        if (building) {
          const homePosition = findBuildingAccessPosition(building, npc.position);
          if (homePosition) {
            npc.targetPosition = homePosition;
            npc.pathQueue = findPath(npc.position, npc.targetPosition);
            npc.state = STATE.WALK_HOME;
            npc.statusText = 'Returning with goods';
          } else {
            npc.state = STATE.IDLE;
          }
        }
      }
    }
  }

  /**
   * WALK_HOME state - return to building with harvested resources
   */
  function handleWalkHome(npc, deltaTime) {
    const arrived = moveNPCAlongPath(npc, deltaTime);
    
    if (arrived) {
      npc.state = STATE.DEPOSIT;
    }
  }

  /**
   * DEPOSIT state - deposit resources to building storage
   */
  function handleDeposit(npc) {
    var deposited = false;
    var leftover = {};
    
    // Try to deposit harvested resources to building storage (check capacity) 
    for (const [resourceId, amount] of Object.entries(npc.harvestedAmount)) {
      if (GameState.canDeposit(npc.buildingUid, resourceId, amount)) {
        GameState.addBuildingStorage(npc.buildingUid, resourceId, amount);
        deposited = true;
      } else {
        // Storage full - keep in NPC inventory (will try again later)
        leftover[resourceId] = amount;
      }
    }
    
    // Update carried resources (only keep what couldn't be deposited)
    npc.harvestedAmount = leftover;
    
    if (Object.keys(leftover).length === 0) {
      // Successfully deposited everything - can go find new node
      npc.targetNode = null;
      npc.targetPosition = null;
      npc.state = STATE.IDLE;
      npc.statusText = 'Looking for work';
    } else {
      // Storage full - wait at building (idle but carrying resources)
      npc.targetNode = null;
      npc.targetPosition = null;
      npc.state = STATE.IDLE;
      npc.waitingForStorage = true;
      npc.statusText = 'Home storage full';
    }
  }

  function cloneResourceMap(resourceMap) {
    var copy = {};
    if (!resourceMap) return copy;
    for (var resId in resourceMap) {
      copy[resId] = resourceMap[resId];
    }
    return copy;
  }

  function getFarmWaterSupportForNPC(instanceUid) {
    if (!window.GameActions || !GameActions.getFarmWaterSupport) return null;
    return GameActions.getFarmWaterSupport(instanceUid);
  }

  function getFarmYieldMapForNPC(instanceUid, farmState, farming) {
    if (window.GameActions && GameActions.getFarmYieldMap) {
      return GameActions.getFarmYieldMap(instanceUid, farmState);
    }

    if (farmState && farmState.watered) {
      if (farmState.riverBoosted && farming && farming.riverYield) {
        return cloneResourceMap(farming.riverYield);
      }
      return cloneResourceMap(farming ? farming.wateredYield : null);
    }

    return cloneResourceMap(farming ? farming.dryYield : null);
  }

  function canDepositResourceMap(instanceUid, resourceMap) {
    if (!instanceUid) return false;

    var totalAmount = getResourceMapTotal(resourceMap);

    return (GameState.getStorageUsed(instanceUid) + totalAmount) <= GameState.getStorageCapacity(instanceUid);
  }

  function resolveFarmRewardStorage(instanceUid, rewardMap, workerBuildingUid) {
    if (canDepositResourceMap(instanceUid, rewardMap)) return instanceUid;
    if (workerBuildingUid && canDepositResourceMap(workerBuildingUid, rewardMap)) return workerBuildingUid;
    return null;
  }

  function canStoreFarmRewards(instanceUid, rewardMap, workerBuildingUid) {
    return !!resolveFarmRewardStorage(instanceUid, rewardMap, workerBuildingUid);
  }

  function storeFarmRewards(instanceUid, rewardMap, workerBuildingUid) {
    var targetUid = resolveFarmRewardStorage(instanceUid, rewardMap, workerBuildingUid);
    if (!targetUid) return false;

    for (var resId in rewardMap) {
      var amount = rewardMap[resId] || 0;
      if (amount <= 0) continue;
      GameState.addBuildingStorage(targetUid, resId, amount);
    }

    return true;
  }

  function emitWaterBoostEffect(worldX, worldZ, boosted, height) {
    if (!window.ParticleSystem || !ParticleSystem.emit) return;

    ParticleSystem.emit('waterBoost', {
      x: worldX,
      y: height !== undefined ? height : 0.4,
      z: worldZ
    }, {
      color: boosted ? 0x6BE6FF : 0x57C7FF,
      count: boosted ? 11 : 8,
      spread: boosted ? 0.42 : 0.32,
      size: boosted ? 0.07 : 0.058,
      lifetime: boosted ? 0.8 : 0.65
    });
  }

  function getResourceMapTotal(resourceMap) {
    var total = 0;
    if (!resourceMap) return total;

    for (var resId in resourceMap) {
      total += resourceMap[resId] || 0;
    }

    return total;
  }

  function moveBuildingStorageToNpc(instanceUid, npc) {
    var storage = GameState.getBuildingStorage(instanceUid);
    var moved = false;

    for (var resId in storage) {
      var amount = storage[resId] || 0;
      if (amount <= 0) continue;

      npc.harvestedAmount[resId] = (npc.harvestedAmount[resId] || 0) + amount;
      GameState.addBuildingStorage(instanceUid, resId, -amount);
      moved = true;
    }

    return moved;
  }

  function sendNpcHomeWithGoods(npc, statusText) {
    clearFarmAssignment(npc);
    npc.targetNode = null;

    const building = GameState.getInstance(npc.buildingUid);
    if (!building) {
      npc.targetPosition = null;
      npc.pathQueue = [];
      npc.state = STATE.IDLE;
      npc.statusText = 'Looking for work';
      return false;
    }

    const homePosition = findBuildingAccessPosition(building, npc.position) || { x: building.x, z: building.z };
    npc.targetPosition = homePosition;
    npc.pathQueue = findPath(npc.position, npc.targetPosition);
    npc.state = STATE.WALK_HOME;
    npc.statusText = statusText || 'Returning with goods';
    return true;
  }

  function npcCanServiceFarm(npc) {
    const building = GameState.getInstance(npc.buildingUid);
    const balance = building ? GameRegistry.getBalance(building.entityId) : null;
    return !!(balance && balance.supportsFarmPlots);
  }

  function getFarmingConfig(plotInstance) {
    if (!plotInstance) return null;
    const balance = GameRegistry.getBalance(plotInstance.entityId);
    return balance ? balance.farming : null;
  }

  function isWorkerInFarmRange(workerBuilding, plotInstance) {
    if (!workerBuilding || !plotInstance) return false;

    const balance = GameRegistry.getBalance(workerBuilding.entityId);
    const level = workerBuilding.level || 1;
    const serviceRange = (balance && balance.searchRadius && balance.searchRadius[level]) ? balance.searchRadius[level] : 0;
    if (serviceRange <= 0) return false;

    const dx = plotInstance.x - workerBuilding.x;
    const dz = plotInstance.z - workerBuilding.z;
    return Math.sqrt(dx * dx + dz * dz) <= serviceRange;
  }

  function canWorkerServicePlot(workerBuilding, plotInstance) {
    const farming = getFarmingConfig(plotInstance);
    if (!workerBuilding || !plotInstance || !farming) return false;
    if (!isWorkerInFarmRange(workerBuilding, plotInstance)) return false;

    if (Array.isArray(farming.requiredWorkerBuildingIds) && farming.requiredWorkerBuildingIds.length) {
      if (farming.requiredWorkerBuildingIds.indexOf(workerBuilding.entityId) === -1) {
        return false;
      }
    }

    return (workerBuilding.level || 1) >= (farming.requiredWorkerLevel || 1);
  }

  function canWorkerHandleWaterTasks(workerBuilding) {
    if (!workerBuilding) return false;
    const balance = GameRegistry.getBalance(workerBuilding.entityId) || {};
    return (workerBuilding.level || 1) >= (balance.farmWaterLevel || 1);
  }

  function getWorkerTreeCareConfig(workerBuilding) {
    const balance = workerBuilding ? GameRegistry.getBalance(workerBuilding.entityId) : null;
    if (!balance || !balance.treeCare) return null;
    if ((workerBuilding.level || 1) < (balance.treeCare.requiredWorkerLevel || 1)) return null;
    return balance.treeCare;
  }

  function findRiverWaterSourceForPosition(worldX, worldZ, searchRadius, boostRadius) {
    if (typeof WaterSystem === 'undefined' || !WaterSystem.isWaterTile) return null;

    var maxDistance = Math.max(0, searchRadius || 0);
    if (maxDistance <= 0) return null;

    var riverBoostRadius = Math.max(0, boostRadius || 0);
    var nearest = null;
    var minX = Math.floor(worldX - maxDistance);
    var maxX = Math.ceil(worldX + maxDistance);
    var minZ = Math.floor(worldZ - maxDistance);
    var maxZ = Math.ceil(worldZ + maxDistance);

    for (var wx = minX; wx <= maxX; wx++) {
      for (var wz = minZ; wz <= maxZ; wz++) {
        if (!WaterSystem.isWaterTile(wx, wz)) continue;

        var dx = wx - worldX;
        var dz = wz - worldZ;
        var distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > maxDistance) continue;

        if (!nearest || distance < nearest.distance) {
          nearest = {
            type: 'river',
            sourceX: wx,
            sourceZ: wz,
            sourceUid: null,
            distance: distance,
            boosted: riverBoostRadius > 0 && distance <= riverBoostRadius
          };
        }
      }
    }

    return nearest;
  }

  function findWellWaterSourceForPosition(worldX, worldZ, searchRadius) {
    var maxDistance = Math.max(0, searchRadius || 0);
    if (maxDistance <= 0) return null;

    var instances = getLiveInstances();
    var bestWell = null;
    var bestDistance = Infinity;

    for (var uid in instances) {
      var candidate = instances[uid];
      if (!candidate || candidate.entityId !== 'building.well') continue;

      var balance = GameRegistry.getBalance(candidate.entityId) || {};
      var supportRange = Math.max(maxDistance, balance.waterRadius || 0);
      if (supportRange <= 0) continue;

      var dx = candidate.x - worldX;
      var dz = candidate.z - worldZ;
      var distance = Math.sqrt(dx * dx + dz * dz);
      if (distance <= supportRange && distance < bestDistance) {
        bestDistance = distance;
        bestWell = {
          type: 'well',
          sourceX: candidate.x,
          sourceZ: candidate.z,
          sourceUid: uid,
          distance: distance,
          boosted: false
        };
      }
    }

    return bestWell;
  }

  function getTreeWaterSupportForNode(nodeObj, treeCare) {
    if (!nodeObj || !treeCare) return null;

    var riverSource = findRiverWaterSourceForPosition(nodeObj.worldX, nodeObj.worldZ, treeCare.waterSearchRadius || 0, treeCare.riverBoostRadius || 0);
    if (riverSource) {
      riverSource.label = riverSource.boosted ? 'River boost active' : 'River in worker range';
      return riverSource;
    }

    var wellSource = findWellWaterSourceForPosition(nodeObj.worldX, nodeObj.worldZ, treeCare.waterSearchRadius || 0);
    if (wellSource) {
      wellSource.label = 'Well in worker range';
      return wellSource;
    }

    return null;
  }

  function getGrowthNodeById(nodeId) {
    if (!nodeId || !window.GameTerrain || !GameTerrain.getAllChunks) return null;

    var chunks = GameTerrain.getAllChunks();
    for (var key in chunks) {
      var chunk = chunks[key];
      if (!chunk || !chunk.objects) continue;

      for (var i = 0; i < chunk.objects.length; i++) {
        if (chunk.objects[i] && chunk.objects[i].id === nodeId) {
          return chunk.objects[i];
        }
      }
    }

    return null;
  }

  function isGrowthNodeClaimed(nodeId, ignoreNpcUid) {
    return npcs.some(function(otherNpc) {
      if (!otherNpc || otherNpc.uid === ignoreNpcUid) return false;
      return otherNpc.taskType === 'tree_growth' && otherNpc.growthNodeId === nodeId;
    });
  }

  function canWorkerHarvestNode(workerBuilding, obj) {
    var isHarvestable = window.GameTerrain && GameTerrain.canHarvestNode ? GameTerrain.canHarvestNode(obj) : (obj.hp > 0 && !obj._destroyed);
    if (!isHarvestable) return false;

    if (workerBuilding && obj && obj.type === 'node.tree') {
      var treeCare = getWorkerTreeCareConfig(workerBuilding);
      if (treeCare && treeCare.harvestOnlyMaxStage && window.GameTerrain && GameTerrain.isNodeAtMaxGrowth) {
        return GameTerrain.isNodeAtMaxGrowth(obj);
      }
    }

    return true;
  }

  function isFarmTaskState(state) {
    return state === STATE.WALK_TO_SOURCE || state === STATE.FETCH_WATER || state === STATE.WALK_TO_PLOT || state === STATE.TEND_PLOT;
  }

  function isFarmPlotClaimed(plotUid, ignoreNpcUid) {
    return npcs.some(function(otherNpc) {
      if (!otherNpc || otherNpc.uid === ignoreNpcUid) return false;
      if (otherNpc.farmPlotUid !== plotUid) return false;
      return !!otherNpc.farmTask || isFarmTaskState(otherNpc.state);
    });
  }

  function clearFarmAssignment(npc) {
    npc.taskType = null;
    npc.farmTask = null;
    npc.farmPlotUid = null;
    npc.growthNodeId = null;
    npc.farmTaskProgress = 0;
    npc.waterSource = null;
    npc.carryingWater = false;
  }

  function finishFarmTask(npc, idleText) {
    clearFarmAssignment(npc);
    npc.targetPosition = null;
    npc.pathQueue = [];
    npc.state = STATE.IDLE;
    npc.statusText = idleText || 'Looking for work';
  }

  function findFarmTaskForWorker(npc, workerBuilding, options) {
    options = options || {};

    const instances = getLiveInstances();
    let bestTask = null;
    let bestScore = Infinity;
    var allowedTasks = options.allowedTasks || null;
    var includeStoredPickup = !!options.includeStoredPickup;

    for (const uid in instances) {
      const plotInstance = instances[uid];
      const farming = getFarmingConfig(plotInstance);
      if (!plotInstance || !farming) continue;
      if (!canWorkerServicePlot(workerBuilding, plotInstance)) continue;
      if (isFarmPlotClaimed(uid, npc.uid)) continue;

      const plotBuilding = GameState.getInstance(uid) || plotInstance;
      const farmState = GameState.getFarmState(uid) || { planted: false, watered: false, ready: false, progress: 0, riverBoosted: false };
      const plotStorage = GameState.getBuildingStorage(uid);
      const plotStoredAmount = getResourceMapTotal(plotStorage);
      let task = null;
      let priority = Infinity;
      let targetPosition = null;
      let waterSource = null;
      let statusText = 'Walking to plot';

      if (includeStoredPickup && (!allowedTasks || allowedTasks.collect) && plotStoredAmount > 0 && canDepositResourceMap(npc.buildingUid, plotStorage)) {
        task = 'collect';
        priority = 0;
        targetPosition = findBuildingAccessPosition(plotBuilding, npc.position) || { x: plotBuilding.x, z: plotBuilding.z };
        statusText = 'Walking to collect plot goods';
      } else if ((!allowedTasks || allowedTasks.harvest) && farmState.ready) {
        const rewardMap = getFarmYieldMapForNPC(uid, farmState, farming);
        if (!canDepositResourceMap(npc.buildingUid, rewardMap)) continue;
        task = 'harvest';
        priority = 1;
        targetPosition = findBuildingAccessPosition(plotBuilding, npc.position) || { x: plotBuilding.x, z: plotBuilding.z };
        statusText = 'Walking to harvest plot';
      } else if ((!allowedTasks || allowedTasks.water) && farmState.planted && !farmState.watered) {
        if (!canWorkerHandleWaterTasks(workerBuilding)) continue;
        const support = getFarmWaterSupportForNPC(uid);
        if (support && support.type) {
          if (support.type === 'well' && support.sourceUid) {
            const wellInstance = GameState.getInstance(support.sourceUid);
            targetPosition = wellInstance ? findBuildingAccessPosition(wellInstance, npc.position) : null;
          } else if (support.sourceX !== null && support.sourceZ !== null) {
            targetPosition = findApproachPosition(support.sourceX, support.sourceZ);
          }

          if (targetPosition) {
            task = 'water';
            priority = 2;
            waterSource = support;
            statusText = support.type === 'river' ? 'Walking to river' : 'Walking to well';
          }
        }
      } else if ((!allowedTasks || allowedTasks.plant) && !farmState.planted) {
        task = 'plant';
        priority = 3;
        targetPosition = findBuildingAccessPosition(plotBuilding, npc.position) || { x: plotBuilding.x, z: plotBuilding.z };
        statusText = 'Walking to plant plot';
      }

      if (!task || !targetPosition) continue;
      if (!areNightWorkPositionsLit([
        { x: plotBuilding.x, z: plotBuilding.z },
        { x: targetPosition.x, z: targetPosition.z }
      ])) continue;

      const dx = plotBuilding.x - npc.position.x;
      const dz = plotBuilding.z - npc.position.z;
      const score = priority * 100 + Math.sqrt(dx * dx + dz * dz);
      if (score < bestScore) {
        bestScore = score;
        bestTask = {
          plotUid: uid,
          task: task,
          targetPosition: targetPosition,
          waterSource: waterSource,
          statusText: statusText
        };
      }
    }

    return bestTask;
  }

  function handleFindFarmTask(npc, options) {
    if (!npcCanServiceFarm(npc)) {
      return false;
    }

    const workerBuilding = GameState.getInstance(npc.buildingUid);
    if (!workerBuilding) {
      npc.statusText = 'Worker lost';
      return false;
    }

    const task = findFarmTaskForWorker(npc, workerBuilding, options);
    if (!task) {
      return false;
    }

    npc.taskType = 'farm';
    npc.farmTask = task.task;
    npc.farmPlotUid = task.plotUid;
    npc.farmTaskProgress = 0;
    npc.targetNode = null;
    npc.waterSource = task.waterSource || null;
    npc.carryingWater = false;
    npc.targetPosition = task.targetPosition;
    npc.pathQueue = findPath(npc.position, npc.targetPosition);
    npc.state = task.task === 'water' ? STATE.WALK_TO_SOURCE : STATE.WALK_TO_PLOT;
    npc.statusText = task.statusText;
    return true;
  }

  function handleFindPriorityTreeHarvestTask(npc) {
    const workerBuilding = GameState.getInstance(npc.buildingUid);
    if (!workerBuilding) return false;

    const treeCare = getWorkerTreeCareConfig(workerBuilding);
    if (!treeCare || !treeCare.harvestOnlyMaxStage) return false;

    const balance = GameRegistry.getBalance(workerBuilding.entityId);
    const level = workerBuilding.level || 1;
    const searchRadius = (balance && balance.searchRadius && balance.searchRadius[level]) ? balance.searchRadius[level] : 0;
    if (searchRadius <= 0) return false;

    const node = findNearestNode(workerBuilding.x, workerBuilding.z, searchRadius, ['node.tree'], workerBuilding);
    if (!node) return false;

    const approachPosition = findApproachPosition(node.x, node.z);
    if (!approachPosition) return false;

    npc.taskType = 'harvest';
    npc.farmTask = null;
    npc.farmPlotUid = null;
    npc.growthNodeId = null;
    npc.targetNode = node;
    npc.targetPosition = approachPosition;
    npc.pathQueue = findPath(npc.position, npc.targetPosition);
    npc.state = STATE.WALK_TO_NODE;
    npc.statusText = 'Walking to mature tree';
    return true;
  }

  function findTreeGrowthTaskForWorker(npc, workerBuilding) {
    if (!window.GameTerrain || !GameTerrain.getAllChunks || !GameTerrain.canWaterGrowthNode) return null;

    var treeCare = getWorkerTreeCareConfig(workerBuilding);
    if (!treeCare) return null;

    var balance = GameRegistry.getBalance(workerBuilding.entityId);
    var level = workerBuilding.level || 1;
    var searchRadius = (balance && balance.searchRadius && balance.searchRadius[level]) ? balance.searchRadius[level] : 0;
    if (searchRadius <= 0) return null;

    var bestTask = null;
    var bestScore = Infinity;
    var chunks = GameTerrain.getAllChunks();
    var chunkSize = GameTerrain.getChunkSize();
    var chunkRadius = Math.ceil(searchRadius / chunkSize);
    var buildingChunkX = Math.floor(workerBuilding.x / chunkSize);
    var buildingChunkZ = Math.floor(workerBuilding.z / chunkSize);

    for (var cx = buildingChunkX - chunkRadius; cx <= buildingChunkX + chunkRadius; cx++) {
      for (var cz = buildingChunkZ - chunkRadius; cz <= buildingChunkZ + chunkRadius; cz++) {
        var chunk = chunks[cx + ',' + cz];
        if (!chunk || !chunk.objects) continue;

        for (var i = 0; i < chunk.objects.length; i++) {
          var obj = chunk.objects[i];
          if (!obj || obj.type !== 'node.tree') continue;
          if (!GameTerrain.canWaterGrowthNode(obj)) continue;
          if (isGrowthNodeClaimed(obj.id, npc.uid)) continue;

          var dx = obj.worldX - workerBuilding.x;
          var dz = obj.worldZ - workerBuilding.z;
          var distance = Math.sqrt(dx * dx + dz * dz);
          if (distance > searchRadius) continue;

          var support = getTreeWaterSupportForNode(obj, treeCare);
          if (!support || !support.type) continue;

          var sourcePosition = null;
          if (support.type === 'well' && support.sourceUid) {
            var wellInstance = GameState.getInstance(support.sourceUid);
            sourcePosition = wellInstance ? findBuildingAccessPosition(wellInstance, npc.position) : null;
          } else if (support.sourceX !== null && support.sourceZ !== null) {
            sourcePosition = findApproachPosition(support.sourceX, support.sourceZ);
          }

          if (!sourcePosition) continue;
          if (!areNightWorkPositionsLit([
            { x: obj.worldX, z: obj.worldZ },
            { x: sourcePosition.x, z: sourcePosition.z }
          ])) continue;

          var stagePenalty = (typeof obj.growthStage === 'number' ? obj.growthStage : 0) * 4;
          var score = stagePenalty + distance;
          if (score < bestScore) {
            bestScore = score;
            bestTask = {
              nodeId: obj.id,
              targetPosition: sourcePosition,
              waterSource: support,
              statusText: support.type === 'river' ? 'Walking to river for tree' : 'Walking to well for tree'
            };
          }
        }
      }
    }

    return bestTask;
  }

  function handleFindGrowthTask(npc) {
    const workerBuilding = GameState.getInstance(npc.buildingUid);
    if (!workerBuilding) return false;

    const task = findTreeGrowthTaskForWorker(npc, workerBuilding);
    if (!task) return false;

    npc.taskType = 'tree_growth';
    npc.farmTask = null;
    npc.farmPlotUid = null;
    npc.growthNodeId = task.nodeId;
    npc.farmTaskProgress = 0;
    npc.targetNode = null;
    npc.waterSource = task.waterSource || null;
    npc.carryingWater = false;
    npc.targetPosition = task.targetPosition;
    npc.pathQueue = findPath(npc.position, npc.targetPosition);
    npc.state = STATE.WALK_TO_SOURCE;
    npc.statusText = task.statusText;
    return true;
  }

  function handleWalkToSource(npc, deltaTime) {
    if (npc.taskType === 'farm' && !npc.farmPlotUid) {
      finishFarmTask(npc);
      return;
    }

    if (npc.taskType === 'tree_growth' && !getGrowthNodeById(npc.growthNodeId)) {
      finishFarmTask(npc);
      return;
    }

    const arrived = moveNPCAlongPath(npc, deltaTime);
    if (arrived) {
      npc.farmTaskProgress = 0;
      npc.state = STATE.FETCH_WATER;
      if (npc.taskType === 'tree_growth') {
        npc.statusText = npc.waterSource && npc.waterSource.type === 'river' ? 'Drawing river water for tree' : 'Drawing well water for tree';
      } else {
        npc.statusText = npc.waterSource && npc.waterSource.type === 'river' ? 'Drawing river water' : 'Drawing well water';
      }
    }
  }

  function handleFetchWater(npc, deltaTime) {
    if (npc.taskType === 'tree_growth') {
      const workerBuilding = GameState.getInstance(npc.buildingUid);
      const treeCare = getWorkerTreeCareConfig(workerBuilding);
      const growthNode = getGrowthNodeById(npc.growthNodeId);
      if (!workerBuilding || !treeCare || !growthNode || !window.GameTerrain || !GameTerrain.canWaterGrowthNode || !GameTerrain.canWaterGrowthNode(growthNode)) {
        finishFarmTask(npc, 'Looking for work');
        return;
      }

      npc.farmTaskProgress += deltaTime;
      if (npc.farmTaskProgress < (treeCare.waterTaskSeconds || 1.8)) {
        return;
      }

      npc.farmTaskProgress = 0;
      npc.carryingWater = true;
      npc.targetPosition = findApproachPosition(growthNode.worldX, growthNode.worldZ);
      if (!npc.targetPosition) {
        finishFarmTask(npc, 'Looking for work');
        return;
      }

      npc.pathQueue = findPath(npc.position, npc.targetPosition);
      npc.state = STATE.WALK_TO_PLOT;
      npc.statusText = 'Carrying water to young tree';
      return;
    }

    const plotBuilding = GameState.getInstance(npc.farmPlotUid);
    const balance = plotBuilding ? GameRegistry.getBalance(plotBuilding.entityId) : null;
    const farming = balance ? balance.farming : null;
    if (!plotBuilding || !farming) {
      finishFarmTask(npc, 'Looking for work');
      return;
    }

    npc.farmTaskProgress += deltaTime;
    if (npc.farmTaskProgress < (farming.waterTaskSeconds || 1.5)) {
      return;
    }

    npc.farmTaskProgress = 0;
    npc.carryingWater = true;
    npc.targetPosition = findBuildingAccessPosition(plotBuilding, npc.position) || { x: plotBuilding.x, z: plotBuilding.z };
    npc.pathQueue = findPath(npc.position, npc.targetPosition);
    npc.state = STATE.WALK_TO_PLOT;
    npc.statusText = 'Carrying water to plot';
  }

  function handleWalkToPlot(npc, deltaTime) {
    if (npc.taskType === 'tree_growth' && !getGrowthNodeById(npc.growthNodeId)) {
      finishFarmTask(npc);
      return;
    }

    if (npc.taskType === 'farm' && npc.farmTask && !npc.farmPlotUid) {
      finishFarmTask(npc);
      return;
    }

    const arrived = moveNPCAlongPath(npc, deltaTime);
    if (arrived) {
      npc.farmTaskProgress = 0;
      npc.state = STATE.TEND_PLOT;
      if (npc.taskType === 'tree_growth') {
        npc.statusText = 'Watering growing tree';
        return;
      }

      const plotInstance = GameState.getInstance(npc.farmPlotUid);
      const farming = getFarmingConfig(plotInstance);
      const cropLabel = (farming && farming.workerCropLabel) ? farming.workerCropLabel : 'crop';
      if (npc.farmTask === 'plant') npc.statusText = 'Planting ' + cropLabel;
      else if (npc.farmTask === 'water') npc.statusText = 'Watering ' + cropLabel;
      else if (npc.farmTask === 'harvest') npc.statusText = 'Harvesting ' + cropLabel;
      else if (npc.farmTask === 'collect') npc.statusText = 'Collecting stored goods';
      else npc.statusText = 'Tending plot';
    }
  }

  function handleTendPlot(npc, deltaTime) {
    if (npc.taskType === 'tree_growth') {
      const workerBuilding = GameState.getInstance(npc.buildingUid);
      const treeCare = getWorkerTreeCareConfig(workerBuilding);
      const growthNode = getGrowthNodeById(npc.growthNodeId);
      if (!workerBuilding || !treeCare || !growthNode || !window.GameTerrain || !GameTerrain.canWaterGrowthNode || !GameTerrain.canWaterGrowthNode(growthNode)) {
        finishFarmTask(npc, 'Looking for work');
        return;
      }

      npc.farmTaskProgress += deltaTime;
      if (npc.farmTaskProgress < (treeCare.waterTaskSeconds || 1.8)) {
        return;
      }

      if (window.GameTerrain && GameTerrain.applyGrowthWaterBoost && GameTerrain.applyGrowthWaterBoost(growthNode, {
          remainingTimeMultiplier: treeCare.growthTimeMultiplier,
          minRemainingSeconds: treeCare.minRemainingSeconds
        })) {
        emitWaterBoostEffect(growthNode.worldX, growthNode.worldZ, !!(npc.waterSource && npc.waterSource.boosted), 0.55);
      }

      finishFarmTask(npc, 'Looking for work');
      return;
    }

    const plotUid = npc.farmPlotUid;
    const plotBuilding = GameState.getInstance(plotUid);
    const balance = plotBuilding ? GameRegistry.getBalance(plotBuilding.entityId) : null;
    const farming = balance ? balance.farming : null;
    if (!plotBuilding || !farming) {
      finishFarmTask(npc, 'Looking for work');
      return;
    }

    var taskDuration = farming.plantTaskSeconds || 1.0;
    if (npc.farmTask === 'water') taskDuration = farming.waterTaskSeconds || 1.5;
    if (npc.farmTask === 'harvest') taskDuration = farming.harvestTaskSeconds || 1.5;
    if (npc.farmTask === 'collect') taskDuration = 0.8;

    npc.farmTaskProgress += deltaTime;
    if (npc.farmTaskProgress < taskDuration) {
      return;
    }

    if (npc.farmTask === 'plant') {
      GameState.setFarmState(plotUid, {
        cropKey: farming.cropKey || 'root_crop',
        planted: true,
        watered: false,
        ready: false,
        progress: 0,
        waterSourceType: null,
        riverBoosted: false
      });
      if (window.BuildingSystem && BuildingSystem.refreshBuilding) {
        BuildingSystem.refreshBuilding(plotUid);
      }
    } else if (npc.farmTask === 'water') {
      GameState.setFarmState(plotUid, {
        watered: true,
        waterSourceType: npc.waterSource ? npc.waterSource.type : null,
        riverBoosted: !!(npc.waterSource && npc.waterSource.boosted)
      });
      emitWaterBoostEffect(plotBuilding.x, plotBuilding.z, !!(npc.waterSource && npc.waterSource.boosted), 0.28);
      if (window.BuildingSystem && BuildingSystem.refreshBuilding) {
        BuildingSystem.refreshBuilding(plotUid);
      }
    } else if (npc.farmTask === 'collect') {
      if (!moveBuildingStorageToNpc(plotUid, npc)) {
        finishFarmTask(npc, 'Looking for work');
        return;
      }

      sendNpcHomeWithGoods(npc, 'Returning plot goods');
      return;
    } else if (npc.farmTask === 'harvest') {
      var farmState = GameState.getFarmState(plotUid) || { watered: false, riverBoosted: false };
      var rewardMap = getFarmYieldMapForNPC(plotUid, farmState, farming);
      if (!canDepositResourceMap(npc.buildingUid, rewardMap)) {
        finishFarmTask(npc, 'Home storage full');
        return;
      }

      for (var rewardId in rewardMap) {
        var rewardAmount = rewardMap[rewardId] || 0;
        if (rewardAmount <= 0) continue;
        npc.harvestedAmount[rewardId] = (npc.harvestedAmount[rewardId] || 0) + rewardAmount;
      }

      GameState.resetFarmState(plotUid);
      if (window.BuildingSystem && BuildingSystem.refreshBuilding) {
        BuildingSystem.refreshBuilding(plotUid);
      }

      sendNpcHomeWithGoods(npc, 'Returning farm goods');
      return;
    }

    finishFarmTask(npc, 'Looking for work');
  }

  function isMovingState(state) {
    return state === STATE.WALK_TO_NODE ||
      state === STATE.WALK_HOME ||
      state === STATE.WALK_TO_SOURCE ||
      state === STATE.WALK_TO_PLOT;
  }

  function findNearbyWalkablePosition(worldX, worldZ, referencePosition) {
    if (canMoveTo(worldX, worldZ)) {
      return { x: worldX, z: worldZ };
    }

    var step = 0.35;
    var bestCandidate = null;
    var bestScore = Infinity;

    for (var ring = 1; ring <= 10; ring++) {
      for (var ix = -ring; ix <= ring; ix++) {
        for (var iz = -ring; iz <= ring; iz++) {
          if (Math.max(Math.abs(ix), Math.abs(iz)) !== ring) continue;

          var candidateX = Math.round((worldX + ix * step) * 10) / 10;
          var candidateZ = Math.round((worldZ + iz * step) * 10) / 10;
          if (!canMoveTo(candidateX, candidateZ)) continue;

          var score = Math.abs(ix) + Math.abs(iz);
          if (referencePosition) {
            var refDx = candidateX - referencePosition.x;
            var refDz = candidateZ - referencePosition.z;
            score += Math.sqrt(refDx * refDx + refDz * refDz) * 0.15;
          }

          if (score < bestScore) {
            bestScore = score;
            bestCandidate = { x: candidateX, z: candidateZ };
          }
        }
      }

      if (bestCandidate) {
        return bestCandidate;
      }
    }

    return findApproachPosition(worldX, worldZ);
  }

  function recoverNpcPosition(npc, building) {
    var anchors = [];
    if (npc.position) {
      anchors.push({ x: npc.position.x, z: npc.position.z });
    }
    if (npc.targetPosition) {
      anchors.push({ x: npc.targetPosition.x, z: npc.targetPosition.z });
    }
    if (npc.targetNode) {
      anchors.push({ x: npc.targetNode.x, z: npc.targetNode.z });
    }

    if (npc.farmPlotUid) {
      var plot = GameState.getInstance(npc.farmPlotUid);
      if (plot) {
        anchors.push(findBuildingAccessPosition(plot, npc.position) || { x: plot.x, z: plot.z });
      }
    }

    if (building) {
      anchors.push(findBuildingAccessPosition(building, npc.position) || { x: building.x, z: building.z });
    }

    var safePosition = null;
    for (var i = 0; i < anchors.length; i++) {
      var anchor = anchors[i];
      safePosition = findNearbyWalkablePosition(anchor.x, anchor.z, npc.targetPosition || anchor);
      if (safePosition) break;
    }

    if (!safePosition) return false;

    npc.position.x = safePosition.x;
    npc.position.z = safePosition.z;
    if (npc.mesh) {
      npc.mesh.position.x = safePosition.x;
      npc.mesh.position.z = safePosition.z;
    }

    if (npc.targetPosition) {
      if (!canMoveTo(npc.targetPosition.x, npc.targetPosition.z)) {
        var adjustedTarget = findNearbyWalkablePosition(npc.targetPosition.x, npc.targetPosition.z, safePosition);
        if (adjustedTarget) {
          npc.targetPosition = adjustedTarget;
        }
      }
      npc.pathQueue = findPath(npc.position, npc.targetPosition);
    } else {
      npc.pathQueue = [];
    }

    npc.stuckSeconds = 0;
    npc.repathTriggered = false;
    return true;
  }

  function updateNPCStuckRecovery(npc, deltaTime, previousX, previousZ) {
    var building = GameState.getInstance(npc.buildingUid);

    if (npc.targetPosition && !canMoveTo(npc.targetPosition.x, npc.targetPosition.z)) {
      var adjustedTarget = findNearbyWalkablePosition(npc.targetPosition.x, npc.targetPosition.z, npc.position);
      if (adjustedTarget) {
        npc.targetPosition = adjustedTarget;
        npc.pathQueue = findPath(npc.position, npc.targetPosition);
      }
    }

    if (!canMoveTo(npc.position.x, npc.position.z)) {
      recoverNpcPosition(npc, building);
      return;
    }

    var moving = isMovingState(npc.state) && !!npc.targetPosition;
    if (!moving) {
      npc.stuckSeconds = 0;
      npc.repathTriggered = false;
      return;
    }

    var movedDx = npc.position.x - previousX;
    var movedDz = npc.position.z - previousZ;
    var movedDistance = Math.sqrt(movedDx * movedDx + movedDz * movedDz);

    if (movedDistance > 0.01) {
      npc.stuckSeconds = 0;
      npc.repathTriggered = false;
      return;
    }

    npc.stuckSeconds = (npc.stuckSeconds || 0) + deltaTime;
    if (!npc.repathTriggered && npc.stuckSeconds >= 0.35) {
      npc.pathQueue = findPath(npc.position, npc.targetPosition);
      npc.repathTriggered = true;
    }

    if (npc.stuckSeconds >= 1.1 && recoverNpcPosition(npc, building)) {
      return;
    }

    if (npc.stuckSeconds >= 2.25) {
      npc.pathQueue = [];
      npc.targetNode = null;
      npc.state = STATE.IDLE;
      npc.statusText = 'Recovering route';
      npc.stuckSeconds = 0;
      npc.repathTriggered = false;
    }
  }

  /**
   * Move NPC along pathQueue
   * @returns {boolean} - true if arrived at destination
   */
  function moveNPCAlongPath(npc, deltaTime) {
    if (!npc.pathQueue || npc.pathQueue.length === 0) {
      // No path - move directly to target
      if (!npc.targetPosition) return true;
      
      const dx = npc.targetPosition.x - npc.position.x;
      const dz = npc.targetPosition.z - npc.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 0.1) {
        npc.position.x = npc.targetPosition.x;
        npc.position.z = npc.targetPosition.z;
        return true;
      }
      
      const moveDistance = npc.speed;
      const stepX = npc.position.x + (dx / distance) * moveDistance;
      const stepZ = npc.position.z + (dz / distance) * moveDistance;

      if (canMoveTo(stepX, stepZ)) {
        npc.position.x = stepX;
        npc.position.z = stepZ;
      } else if (canMoveTo(stepX, npc.position.z)) {
        npc.position.x = stepX;
      } else if (canMoveTo(npc.position.x, stepZ)) {
        npc.position.z = stepZ;
      } else {
        npc.pathQueue = findPath(npc.position, npc.targetPosition);
      }
      return false;
    }
    
    // Follow path queue
    const nextWaypoint = npc.pathQueue[0];
    const pathIsPartial = npc.pathQueue.isPartial === true;
    const dx = nextWaypoint.x - npc.position.x;
    const dz = nextWaypoint.z - npc.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < 0.1) {
      // Reached waypoint - remove from queue
      npc.pathQueue.shift();
      
      if (npc.pathQueue.length === 0) {
        if (pathIsPartial) {
          npc.pathQueue = findPath(npc.position, npc.targetPosition);
          return false;
        }

        // Reached final destination
        npc.position.x = npc.targetPosition.x;
        npc.position.z = npc.targetPosition.z;
        return true;
      }
      return false;
    }
    
    // Move toward waypoint
    const moveDistance = npc.speed;
    const stepX = npc.position.x + (dx / distance) * moveDistance;
    const stepZ = npc.position.z + (dz / distance) * moveDistance;

    if (canMoveTo(stepX, stepZ)) {
      npc.position.x = stepX;
      npc.position.z = stepZ;
    } else if (canMoveTo(stepX, npc.position.z)) {
      npc.position.x = stepX;
    } else if (canMoveTo(npc.position.x, stepZ)) {
      npc.position.z = stepZ;
    } else {
      npc.pathQueue = findPath(npc.position, npc.targetPosition);
    }

    return false;
  }

  function canMoveTo(worldX, worldZ) {
    if (!window.GameTerrain || !GameTerrain.isWalkable) return true;
    var clearance = 0.18;
    if (!GameTerrain.isWalkable(worldX, worldZ)) return false;

    var samples = [
      [clearance, 0],
      [-clearance, 0],
      [0, clearance],
      [0, -clearance]
    ];

    for (var i = 0; i < samples.length; i++) {
      if (!GameTerrain.isWalkable(worldX + samples[i][0], worldZ + samples[i][1])) {
        return false;
      }
    }

    return true;
  }

  function findApproachPosition(worldX, worldZ) {
    const targetX = Math.round(worldX);
    const targetZ = Math.round(worldZ);

    if (canMoveTo(targetX, targetZ)) {
      return { x: targetX, z: targetZ };
    }

    const candidates = [];
    for (let radius = 1; radius <= 4; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;

          const x = targetX + dx;
          const z = targetZ + dz;
          if (!canMoveTo(x, z)) continue;

          candidates.push({
            x: x,
            z: z,
            distance: Math.sqrt(dx * dx + dz * dz)
          });
        }
      }

      if (candidates.length > 0) break;
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.distance - b.distance);
    return { x: candidates[0].x, z: candidates[0].z };
  }

  function findBuildingAccessPosition(building, fromPosition) {
    if (!building) return null;

    const anchors = [
      { x: building.x + 1.2, z: building.z },
      { x: building.x - 1.2, z: building.z },
      { x: building.x, z: building.z + 1.2 },
      { x: building.x, z: building.z - 1.2 },
      { x: building.x + 1.1, z: building.z + 1.1 },
      { x: building.x + 1.1, z: building.z - 1.1 },
      { x: building.x - 1.1, z: building.z + 1.1 },
      { x: building.x - 1.1, z: building.z - 1.1 }
    ];

    let bestCandidate = null;
    let bestScore = Infinity;

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const candidate = canMoveTo(anchor.x, anchor.z) ? { x: anchor.x, z: anchor.z } : findApproachPosition(anchor.x, anchor.z);
      if (!candidate) continue;

      const distToBuilding = Math.sqrt(
        Math.pow(candidate.x - building.x, 2) +
        Math.pow(candidate.z - building.z, 2)
      );
      if (distToBuilding < 1.0) continue;

      let score = Math.abs(distToBuilding - 1.2) * 4;
      if (fromPosition) {
        score += Math.sqrt(
          Math.pow(candidate.x - fromPosition.x, 2) +
          Math.pow(candidate.z - fromPosition.z, 2)
        );
      }

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate || findApproachPosition(building.x, building.z);
  }

  function isInsideBuildingFootprint(position, building) {
    if (!position || !building) return false;
    return Math.abs(position.x - building.x) < 0.8 && Math.abs(position.z - building.z) < 0.8;
  }

  /**
   * Get harvest node type for building
   */
  function getHarvestNodeTypes(buildingEntityId) {
    var balance = GameRegistry.getBalance(buildingEntityId);
    if (balance && balance.harvestNodeTypes && balance.harvestNodeTypes.length) {
      return balance.harvestNodeTypes.slice();
    }

    const map = {
      'building.wood_cutter': ['node.tree'],
      'building.stone_quarry': ['node.rock'],
      'building.berry_gatherer': ['node.tree', 'node.rock', 'node.berry_bush', 'node.flint_deposit'],
      'building.flint_mine': ['node.flint_deposit'],
      'building.copper_mine': ['node.copper_deposit'],
      'building.tin_mine': ['node.tin_deposit'],
      'building.iron_mine': ['node.iron_deposit'],
      'building.coal_mine': ['node.coal_deposit']
    };
    return map[buildingEntityId] ? map[buildingEntityId].slice() : [];
  }

  /**
   * Find nearest harvestable node
   */
  function findNearestNode(x, z, radius, nodeTypes, workerBuilding) {
    const chunks = GameTerrain.getAllChunks();
    let nearestNode = null;
    let nearestDistance = Infinity;
    const targetTypes = Array.isArray(nodeTypes) ? nodeTypes : [nodeTypes];
    
    // Check chunks around building
    const chunkSize = GameTerrain.getChunkSize();
    const chunkRadius = Math.ceil(radius / chunkSize);
    const buildingChunkX = Math.floor(x / chunkSize);
    const buildingChunkZ = Math.floor(z / chunkSize);
    
    for (let cx = buildingChunkX - chunkRadius; cx <= buildingChunkX + chunkRadius; cx++) {
      for (let cz = buildingChunkZ - chunkRadius; cz <= buildingChunkZ + chunkRadius; cz++) {
        const chunkKey = `${cx},${cz}`;
        const chunkData = chunks[chunkKey];
        
        if (!chunkData || !chunkData.objects) continue;
        
        for (const obj of chunkData.objects) {
          // Check if correct type and harvestable
          var isHarvestable = canWorkerHarvestNode(workerBuilding, obj);
          if (targetTypes.indexOf(obj.type) !== -1 && isHarvestable) {
            // Check if being harvested by another NPC
            const beingHarvested = npcs.some(npc => 
              npc.targetNode && npc.targetNode.object === obj && 
              (npc.state === STATE.WALK_TO_NODE || npc.state === STATE.HARVEST)
            );
            
            if (beingHarvested) continue;
            
            // Use world coordinates for distance calculation
            const objWorldX = obj.worldX !== undefined ? obj.worldX : (cx * chunkSize + obj.x);
            const objWorldZ = obj.worldZ !== undefined ? obj.worldZ : (cz * chunkSize + obj.z);
            const dx = objWorldX - x;
            const dz = objWorldZ - z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (!areNightWorkPositionsLit([{ x: objWorldX, z: objWorldZ }])) continue;
            
            if (distance <= radius && distance < nearestDistance) {
              nearestDistance = distance;
              nearestNode = { x: objWorldX, z: objWorldZ, object: obj };
            }
          }
        }
      }
    }
    
    return nearestNode;
  }

  /**
   * Check if node is still valid for harvesting
   */
  function isNodeStillValid(nodeData) {
    if (!nodeData || !nodeData.object) return false;
    
    // Check if node still exists and has HP
    const obj = nodeData.object;
    return window.GameTerrain && GameTerrain.canHarvestNode ? GameTerrain.canHarvestNode(obj) : obj.hp > 0;
  }

  /**
   * Simple A* pathfinding
   * Returns array of waypoints [{x, z}, ...]
   */
  function findPath(start, goal) {
    const startNode = { x: Math.round(start.x), z: Math.round(start.z) };
    const goalNode = { x: Math.round(goal.x), z: Math.round(goal.z) };
    const cacheKey = getPathCacheKey(startNode, goalNode);
    const startKey = startNode.x + ',' + startNode.z;
    const goalKey = goalNode.x + ',' + goalNode.z;
    const searchMargin = Math.max(10, Math.ceil(heuristic(startNode, goalNode)) + 6);
    const minX = Math.min(startNode.x, goalNode.x) - searchMargin;
    const maxX = Math.max(startNode.x, goalNode.x) + searchMargin;
    const minZ = Math.min(startNode.z, goalNode.z) - searchMargin;
    const maxZ = Math.max(startNode.z, goalNode.z) + searchMargin;

    if (startKey === goalKey) {
      return [{ x: goal.x, z: goal.z }];
    }

    const cachedPath = getCachedPath(cacheKey, goal);
    if (cachedPath) {
      return cachedPath;
    }

    const directions = [
      { x: 1, z: 0, cost: 1 },
      { x: -1, z: 0, cost: 1 },
      { x: 0, z: 1, cost: 1 },
      { x: 0, z: -1, cost: 1 },
      { x: 1, z: 1, cost: Math.SQRT2 },
      { x: 1, z: -1, cost: Math.SQRT2 },
      { x: -1, z: 1, cost: Math.SQRT2 },
      { x: -1, z: -1, cost: Math.SQRT2 }
    ];
    const open = [startNode];
    const openKeys = {};
    const closedKeys = {};
    const cameFrom = {};
    const gScore = {};
    const fScore = {};
    let iterations = 0;
    let bestNode = startNode;
    let bestDistance = heuristic(startNode, goalNode);

    openKeys[startKey] = true;
    gScore[startKey] = 0;
    fScore[startKey] = heuristic(startNode, goalNode);

    while (open.length > 0 && iterations < 1600) {
      iterations++;
      let currentIndex = 0;
      for (let i = 1; i < open.length; i++) {
        const key = open[i].x + ',' + open[i].z;
        const bestKey = open[currentIndex].x + ',' + open[currentIndex].z;
        const candidateScore = fScore[key] !== undefined ? fScore[key] : Infinity;
        const bestScore = fScore[bestKey] !== undefined ? fScore[bestKey] : Infinity;
        if (candidateScore < bestScore) {
          currentIndex = i;
        }
      }

      const current = open.splice(currentIndex, 1)[0];
      const currentKey = current.x + ',' + current.z;
      delete openKeys[currentKey];
      closedKeys[currentKey] = true;

      const currentDistance = heuristic(current, goalNode);
      if (currentDistance < bestDistance) {
        bestDistance = currentDistance;
        bestNode = current;
      }

      if (currentKey === goalKey) {
        const fullPath = reconstructPath(cameFrom, current, startKey);
        const lastStep = fullPath[fullPath.length - 1];
        if (!lastStep || lastStep.x !== goalNode.x || lastStep.z !== goalNode.z) {
          fullPath.push({ x: goal.x, z: goal.z });
        }
        return storeCachedPath(cacheKey, fullPath);
      }

      for (let i = 0; i < directions.length; i++) {
        const dir = directions[i];
        const neighbor = { x: current.x + dir.x, z: current.z + dir.z };
        const neighborKey = neighbor.x + ',' + neighbor.z;

        if (neighbor.x < minX || neighbor.x > maxX || neighbor.z < minZ || neighbor.z > maxZ) {
          continue;
        }

        if (closedKeys[neighborKey]) {
          continue;
        }

        if (neighborKey !== goalKey && !canMoveTo(neighbor.x, neighbor.z)) {
          continue;
        }

        if (dir.x !== 0 && dir.z !== 0) {
          if (!canMoveTo(current.x + dir.x, current.z) || !canMoveTo(current.x, current.z + dir.z)) {
            continue;
          }
        }

        const currentScore = gScore[currentKey] !== undefined ? gScore[currentKey] : Infinity;
        const neighborScore = gScore[neighborKey] !== undefined ? gScore[neighborKey] : Infinity;
        const tentativeG = currentScore + dir.cost;
        if (tentativeG >= neighborScore) continue;

        cameFrom[neighborKey] = current;
        gScore[neighborKey] = tentativeG;
        fScore[neighborKey] = tentativeG + heuristic(neighbor, goalNode);

        if (!openKeys[neighborKey]) {
          open.push(neighbor);
          openKeys[neighborKey] = true;
        }
      }
    }

    if (bestNode && (bestNode.x !== startNode.x || bestNode.z !== startNode.z)) {
      const partialPath = reconstructPath(cameFrom, bestNode, startKey);
      partialPath.isPartial = true;
      return storeCachedPath(cacheKey, partialPath);
    }

    return storeCachedPath(cacheKey, []);
  }

  function heuristic(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function reconstructPath(cameFrom, current, startKey) {
    const path = [];
    let key = current.x + ',' + current.z;
    let cursor = current;

    while (key !== startKey) {
      path.push({ x: cursor.x, z: cursor.z });
      cursor = cameFrom[key];
      if (!cursor) break;
      key = cursor.x + ',' + cursor.z;
    }

    path.reverse();
    return path;
  }

  /**
   * Get all active NPCs (for debugging)
   */
  function getAllNPCs() {
    return npcs;
  }

  /**
   * Get NPCs for specific building
   */
  function getNPCsForBuilding(instanceUid) {
    return npcs.filter(npc => npc.buildingUid === instanceUid);
  }

  // Public API
  function getActiveHarvestNodes() {
    const activeNodes = [];
    npcs.forEach(npc => {
      if (npc.state === STATE.HARVEST && npc.targetNode && npc.targetNode.object) {
        const node = npc.targetNode.object;
        if (node) {
          let maxHp = node.maxHp;
          if (!(maxHp > 0) && window.GameTerrain && GameTerrain.getNodeInfo) {
            const nodeInfo = GameTerrain.getNodeInfo(node);
            maxHp = nodeInfo ? nodeInfo.hp : 1;
          }
          activeNodes.push({
            node: node,
            maxHp: maxHp || 1,
            currentHp: node.hp,
            worldX: node.worldX,
            worldZ: node.worldZ
          });
        }
      }
    });
    return activeNodes;
  }

  /**
   * Get NPC by UID
   */
  function getNPCByUid(npcUid) {
    return npcs.find(npc => npc.uid === npcUid) || null;
  }

  /**
   * Get specialization bonus for NPC (simplified - always base values)
   */
  function getSpecializationBonus(npc) {
    return { harvestSpeed: 1.0, moveSpeed: 1.0 };
  }

  function getFarmWorkerStatus(instanceUid) {
    var activeWorker = npcs.find(function(npc) {
      return npc.farmPlotUid === instanceUid && (!!npc.farmTask || isFarmTaskState(npc.state));
    });

    if (activeWorker) {
      return {
        state: activeWorker.state,
        task: activeWorker.farmTask,
        carryingWater: !!activeWorker.carryingWater,
        text: activeWorker.statusText || 'Resident worker active'
      };
    }

    var plotInstance = GameState.getInstance(instanceUid);
    if (!plotInstance) return null;

    var farming = getFarmingConfig(plotInstance);
    if (!farming) return null;
    var farmState = GameState.getFarmState(instanceUid) || { planted: false, watered: false, ready: false, progress: 0 };

    if (isNightWorkRestricted() && !isPositionLitForNightWork(plotInstance.x, plotInstance.z)) {
      return {
        state: STATE.IDLE,
        task: null,
        carryingWater: false,
        text: 'Night pause: outside active campfire light'
      };
    }

    var nearbyWorker = npcs.find(function(npc) {
      if (!npcCanServiceFarm(npc)) return false;
      var workerBuilding = GameState.getInstance(npc.buildingUid);
      return canWorkerServicePlot(workerBuilding, plotInstance);
    });

    if (!nearbyWorker) {
      var nearbyButIneligible = npcs.find(function(npc) {
        if (!npcCanServiceFarm(npc)) return false;
        var workerBuilding = GameState.getInstance(npc.buildingUid);
        return isWorkerInFarmRange(workerBuilding, plotInstance);
      });

      if (!nearbyButIneligible) return null;

      return {
        state: nearbyButIneligible.state,
        task: nearbyButIneligible.farmTask,
        carryingWater: !!nearbyButIneligible.carryingWater,
        text: farming.workerHint || 'Needs a nearby resident worker.'
      };
    }

    var nearbyWorkerBuilding = GameState.getInstance(nearbyWorker.buildingUid);
    if (farmState.planted && !farmState.watered && nearbyWorkerBuilding && !canWorkerHandleWaterTasks(nearbyWorkerBuilding)) {
      return {
        state: nearbyWorker.state,
        task: nearbyWorker.farmTask,
        carryingWater: !!nearbyWorker.carryingWater,
        text: 'Nearby resident needs Level 3 to water this plot'
      };
    }

    return {
      state: nearbyWorker.state,
      task: nearbyWorker.farmTask,
      carryingWater: !!nearbyWorker.carryingWater,
      text: nearbyWorker.state === STATE.IDLE ? 'Nearby resident worker available' : 'Nearby resident worker busy'
    };
  }

  return {
    init,
    spawnWorkersForBuilding,
    despawnWorkersForBuilding,
    update,
    findPath,
    canMoveTo,
    getAllNPCs,
    getNearestExposedWorker,
    reportWorkerThreat,
    getThreatenedWorkersSummary,
    getNPCsForBuilding,
    getActiveHarvestNodes,
    clearPathCache,
    getFarmWorkerStatus,
    getNPCByUid,
    getSpecializationBonus
  };
})();
