/**
 * NPC System - Manages worker NPCs for buildings
 * NPCs automatically harvest resources and return to building storage
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
    DEPOSIT: 'deposit'
  };

  // NPCs array - all active NPCs
  let npcs = [];
  let nextNPCId = 1;

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
        targetNode: null,
        targetPosition: null,
        pathQueue: [],
        harvestProgress: 0,
        harvestedAmount: {},
        speed: 0.05, // tiles per frame (slower than player)
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
      
      updateNPC(npc, deltaTime);
      
      // Update 3D mesh position
      if (npc.mesh) {
        npc.mesh.position.x = npc.position.x;
        npc.mesh.position.z = npc.position.z;
        
        // Simple bobbing animation when walking
        if (npc.state === STATE.WALK_TO_NODE || npc.state === STATE.WALK_HOME) {
          npc.mesh.position.y = Math.abs(Math.sin(Date.now() * 0.005)) * 0.1;
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
    }
  }

  /**
   * IDLE state - transition to find node
   */
  function handleIdle(npc) {
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

    // Check if storage is full (prevent harvesting if no space)
    const storageUsed = GameState.getStorageUsed(npc.buildingUid);
    const storageCapacity = GameState.getStorageCapacity(npc.buildingUid);
    
    if (storageUsed >= storageCapacity && storageCapacity < Infinity) {
      // Storage full - wait at building (idle)
      npc.state = STATE.IDLE;
      npc.waitingForStorage = true;
      return;
    }
    
    // Clear waiting flag if we can harvest again
    npc.waitingForStorage = false;

    const balance = GameRegistry.getBalance(building.entityId);
    const searchRadius = (balance.searchRadius && balance.searchRadius[building.level]) || 5;

    // Determine what resource this building type harvests
    const targetNodeType = getHarvestNodeType(building.entityId);
    if (!targetNodeType) {
      // Building doesn't harvest (e.g. Warehouse) - mark NPC as idle permanently
      if (!npc._noHarvestWarningShown) {
        console.warn('[NPCSystem] No harvest node type for building:', building.entityId, '- NPC will remain idle');
        npc._noHarvestWarningShown = true;
      }
      npc.state = STATE.IDLE;
      return;
    }

    // Find nearest available node within radius
    const node = findNearestNode(building.x, building.z, searchRadius, targetNodeType);
    
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
    } else {
      // No nodes found - wait and try again
      npc.state = STATE.IDLE;
    }
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
      // Check if node still exists and not being harvested by another NPC
      const nodeStillValid = isNodeStillValid(npc.targetNode);
      
      if (nodeStillValid) {
        npc.harvestProgress = 0;
        npc.state = STATE.HARVEST;
      } else {
        // Node gone or taken - find another
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

    const node = npc.targetNode.object;
    
    // Harvest at 1 hit per second (modified by specialization and research)
    var specBonus = getSpecializationBonus(npc);
    var harvestSpeed = specBonus.harvestSpeed;
    
    // Apply global research bonus to harvest speed
    if (window.ResearchSystem) {
      var globalBonuses = ResearchSystem.getGlobalBonuses();
      harvestSpeed *= (1 + (globalBonuses.harvestSpeedBonus || 0));
    }
    
    var harvestInterval = 1.0 / harvestSpeed;  // Faster if specialized/researched
    
    npc.harvestProgress += deltaTime;
    
    if (npc.harvestProgress >= harvestInterval) {
      npc.harvestProgress = 0;
      
      // Apply damage to node (1 base damage, can be modified by training level)
      var damageAmount = 1;
      if (npc.trainingLevel > 1) {
        damageAmount *= (1 + ((npc.trainingLevel - 1) * 0.1));  // +10% per training level
      }
      
      node.hp -= damageAmount;
      
      // HP bar is automatically updated by updateNodeHpBars() in render loop
      
      // Play swing animation on mesh
      if (npc.mesh && npc.mesh.children[0]) {
        const bodyMesh = npc.mesh.children[0];
        bodyMesh.rotation.z = Math.PI / 8;
        setTimeout(() => {
          if (bodyMesh) bodyMesh.rotation.z = 0;
        }, 200);
      }
      
      // Check if node destroyed
      if (node.hp <= 0) {
        // Get rewards
        const balance = GameRegistry.getBalance(node.type);
        if (balance && balance.rewards) {
          // Store rewards to carry home
          for (const [resourceId, amount] of Object.entries(balance.rewards)) {
            npc.harvestedAmount[resourceId] = (npc.harvestedAmount[resourceId] || 0) + amount;
          }
        }
        
        // Destroy node (GameEntities will handle respawn)
        if (window.GameEntities && GameEntities.destroyNode) {
          GameEntities.destroyNode(node);
        }
        
        // Go home with resources
        const building = GameState.getInstance(npc.buildingUid);
        if (building) {
          const homePosition = findBuildingAccessPosition(building, npc.position);
          if (homePosition) {
            npc.targetPosition = homePosition;
            npc.pathQueue = findPath(npc.position, npc.targetPosition);
            npc.state = STATE.WALK_HOME;
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
    } else {
      // Storage full - wait at building (idle but carrying resources)
      npc.targetNode = null;
      npc.targetPosition = null;
      npc.state = STATE.IDLE;
      npc.waitingForStorage = true;
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
  function getHarvestNodeType(buildingEntityId) {
    const map = {
      'building.wood_cutter': 'node.tree',
      'building.stone_quarry': 'node.rock',
      'building.berry_gatherer': 'node.berry_bush',
      'building.flint_mine': 'node.flint_deposit',
      'building.copper_mine': 'node.copper_deposit',
      'building.tin_mine': 'node.tin_deposit',
      'building.iron_mine': 'node.iron_deposit',
      'building.coal_mine': 'node.coal_deposit'
    };
    return map[buildingEntityId];
  }

  /**
   * Find nearest harvestable node
   */
  function findNearestNode(x, z, radius, nodeType) {
    const chunks = GameTerrain.getAllChunks();
    let nearestNode = null;
    let nearestDistance = Infinity;
    
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
          if (obj.type === nodeType && obj.hp > 0 && !obj._destroyed) {
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
    return obj.hp > 0;
  }

  /**
   * Simple A* pathfinding
   * Returns array of waypoints [{x, z}, ...]
   */
  function findPath(start, goal) {
    const startNode = { x: Math.round(start.x), z: Math.round(start.z) };
    const goalNode = { x: Math.round(goal.x), z: Math.round(goal.z) };
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
        return fullPath;
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
      return partialPath;
    }

    return [];
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
        const balance = GameRegistry.getBalance(node.type);
        if (balance && balance.hp) {
          activeNodes.push({
            node: node,
            maxHp: balance.hp,
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

  return {
    init,
    spawnWorkersForBuilding,
    despawnWorkersForBuilding,
    update,
    getAllNPCs,
    getNPCsForBuilding,
    getActiveHarvestNodes,
    getNPCByUid,
    getSpecializationBonus
  };
})();
