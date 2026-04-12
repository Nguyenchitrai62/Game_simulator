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
   */
  function init() {
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
    const workerCount = balance.workerCount[level] || 1;

    // Count existing workers for this building
    const existingWorkers = npcs.filter(npc => npc.buildingUid === instanceUid).length;
    const workersToSpawn = workerCount - existingWorkers;

    for (let i = 0; i < workersToSpawn; i++) {
      const npc = {
        uid: `npc_${nextNPCId++}`,
        buildingUid: instanceUid,
        buildingEntityId: instance.entityId,
        state: STATE.IDLE,
        position: { x: instance.x, z: instance.z },
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
        npc.mesh.position.set(instance.x, 0, instance.z);
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

    const balance = GameRegistry.getBalance(building.entityId);
    const searchRadius = (balance.searchRadius && balance.searchRadius[building.level]) || 5;

    // Determine what resource this building type harvests
    const targetNodeType = getHarvestNodeType(building.entityId);
    if (!targetNodeType) {
      console.warn('[NPCSystem] No harvest node type for building:', building.entityId);
      npc.state = STATE.IDLE;
      return;
    }

    // Find nearest available node within radius
    const node = findNearestNode(building.x, building.z, searchRadius, targetNodeType);
    
    if (node) {
      npc.targetNode = node;
      npc.targetPosition = { x: node.x, z: node.z };
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
    
    // Harvest at 1 hit per second
    npc.harvestProgress += deltaTime;
    
    if (npc.harvestProgress >= 1.0) {
      npc.harvestProgress = 0;
      
      // Apply damage to node
      node.hp -= 1;
      
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
          npc.targetPosition = { x: building.x, z: building.z };
          npc.pathQueue = findPath(npc.position, npc.targetPosition);
          npc.state = STATE.WALK_HOME;
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
    // Add harvested resources to building storage
    for (const [resourceId, amount] of Object.entries(npc.harvestedAmount)) {
      GameState.addBuildingStorage(npc.buildingUid, resourceId, amount);
    }
    
    // Clear carried resources
    npc.harvestedAmount = {};
    npc.targetNode = null;
    npc.targetPosition = null;
    
    // Return to idle (will find new node)
    npc.state = STATE.IDLE;
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
      npc.position.x += (dx / distance) * moveDistance;
      npc.position.z += (dz / distance) * moveDistance;
      return false;
    }
    
    // Follow path queue
    const nextWaypoint = npc.pathQueue[0];
    const dx = nextWaypoint.x - npc.position.x;
    const dz = nextWaypoint.z - npc.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < 0.1) {
      // Reached waypoint - remove from queue
      npc.pathQueue.shift();
      
      if (npc.pathQueue.length === 0) {
        // Reached final destination
        npc.position.x = npc.targetPosition.x;
        npc.position.z = npc.targetPosition.z;
        return true;
      }
      return false;
    }
    
    // Move toward waypoint
    const moveDistance = npc.speed;
    npc.position.x += (dx / distance) * moveDistance;
    npc.position.z += (dz / distance) * moveDistance;
    return false;
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
      'building.tin_mine': 'node.tin_deposit'
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
    // For now, use simple direct path (can be enhanced with real A* later)
    // NPCs will slide along obstacles like player does
    
    // Direct path for simplicity
    return [{ x: goal.x, z: goal.z }];
    
    // TODO: Implement real A* with obstacle avoidance if needed
    // For MVP, NPCs can use same collision handling as player (slide-along-wall)
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

  return {
    init,
    spawnWorkersForBuilding,
    despawnWorkersForBuilding,
    update,
    getAllNPCs,
    getNPCsForBuilding,
    getActiveHarvestNodes
  };
})();
