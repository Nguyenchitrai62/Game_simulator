window.BarracksTroopSystem = (function () {
  var _troops = [];
  var _troopIdCounter = 1;
  var _initialized = false;
  var _syncAccumulator = 0;

  var MODE_LABELS = {
    guard: 'Guard Nearby',
    follow: 'Follow Player'
  };

  function getTroopBalanceConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.barracksTroops) || {};
  }

  function getTroopTargetingConfig() {
    return getTroopBalanceConfig().targeting || {};
  }

  function getTroopFormationConfig() {
    return getTroopBalanceConfig().formation || {};
  }

  function getCombatConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.combat) || {};
  }

  function getAnimalRespawnConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.animalRespawn) || {};
  }

  function getTroopSyncInterval() {
    return Number(getTroopBalanceConfig().syncIntervalSeconds) || 0;
  }

  function getTroopSpawnJitter() {
    return Number(getTroopBalanceConfig().spawnJitter) || 0;
  }

  function getInitialAttackCooldownMax() {
    return Number(getTroopBalanceConfig().initialAttackCooldownMax) || 0;
  }

  function getDestinationRetargetCooldown() {
    return Number(getTroopBalanceConfig().destinationRetargetCooldown) || 0;
  }

  function getRepathCooldown() {
    return Number(getTroopBalanceConfig().repathCooldown) || 0;
  }

  function getGuardRadiusLeashBonus() {
    return Number(getTroopTargetingConfig().guardRadiusLeashBonus) || 0;
  }

  function getThreatBias() {
    return Number(getTroopTargetingConfig().threatBias) || 0;
  }

  function getTroopDistanceWeight() {
    return Number(getTroopTargetingConfig().troopDistanceWeight) || 0;
  }

  function getBarracksDistanceWeight() {
    return Number(getTroopTargetingConfig().barracksDistanceWeight) || 0;
  }

  function getPriorityBiasForAnimal(animalType) {
    var priorityBiases = getTroopTargetingConfig().priorityBiasByAnimal || {};
    return Number(priorityBiases[animalType]) || 0;
  }

  function getGuardBaseRadius() {
    return Number(getTroopFormationConfig().guardBaseRadius) || 0;
  }

  function getGuardRingSpacing() {
    return Number(getTroopFormationConfig().guardRingSpacing) || 0;
  }

  function getGuardArcherOffset() {
    return Number(getTroopFormationConfig().guardArcherOffset) || 0;
  }

  function getFollowBaseRadius() {
    return Number(getTroopFormationConfig().followBaseRadius) || 0;
  }

  function getFollowRingSpacing() {
    return Number(getTroopFormationConfig().followRingSpacing) || 0;
  }

  function getFollowArcherOffset() {
    return Number(getTroopFormationConfig().followArcherOffset) || 0;
  }

  function getFollowAngleStep() {
    return Number(getTroopFormationConfig().followAngleStep) || 0;
  }

  function getEngageMinRadius() {
    return Number(getTroopFormationConfig().engageMinRadius) || 0;
  }

  function getEngageRadiusMultiplier() {
    return Number(getTroopFormationConfig().engageRadiusMultiplier) || 0;
  }

  function getMinimumDamage() {
    return Number(getCombatConfig().minimumDamage) || 0;
  }

  function getAnimalRespawnRetryDelayMs() {
    return Number(getAnimalRespawnConfig().retryDelayMs) || 0;
  }

  function getEntityRespawnTimeSeconds(balance) {
    return Number(balance && balance.respawnTime) || 0;
  }

  function isPlayerTooCloseForRespawn(target) {
    if (!target || !window.GamePlayer || !GamePlayer.getPosition) return false;

    var playerPos = GamePlayer.getPosition();
    var safeDistance = Number(getAnimalRespawnConfig().playerSafeDistance) || 0;
    var dx = Math.abs(target.worldX - playerPos.x);
    var dz = Math.abs(target.worldZ - playerPos.z);
    return dx < safeDistance && dz < safeDistance;
  }

  function init() {
    disposeAllTroops();
    _troops = [];
    _initialized = true;
    _syncAccumulator = 0;
    syncTroops();
  }

  function update(dt) {
    if (!_initialized || dt <= 0) return;

    _syncAccumulator += dt;
    if (_syncAccumulator >= getTroopSyncInterval()) {
      _syncAccumulator = 0;
      syncTroops();
    }

    if (!_troops.length) {
      if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
        GamePerf.setValue('troops.count', 0);
        GamePerf.setValue('troops.animalCandidates', 0);
      }
      return;
    }

    var barracksMap = getBarracksMap();
    var modeMap = {};
    var needsAnimalScan = false;
    for (var troopCursor = 0; troopCursor < _troops.length; troopCursor++) {
      var troopUid = _troops[troopCursor].barracksUid;
      if (!modeMap[troopUid]) {
        modeMap[troopUid] = getBarracksCommandMode(troopUid);
      }
      if (modeMap[troopUid] !== 'follow') {
        needsAnimalScan = true;
        break;
      }
    }

    var animals = needsAnimalScan ? getLoadedAnimals() : [];
    var animalMap = {};
    var playerPos = (window.GamePlayer && GamePlayer.getPosition) ? GamePlayer.getPosition() : null;
    var activeCombatTarget = (window.GameCombat && GameCombat.getTarget) ? GameCombat.getTarget() : null;

    for (var i = 0; i < animals.length; i++) {
      animalMap[animals[i].id] = animals[i];
    }

    for (var troopIndex = 0; troopIndex < _troops.length; troopIndex++) {
      var troop = _troops[troopIndex];
      updateTroop(troop, dt, barracksMap, animals, animalMap, playerPos, activeCombatTarget, modeMap[troop.barracksUid] || 'guard');
    }

    if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
      GamePerf.setValue('troops.count', _troops.length);
      GamePerf.setValue('troops.animalCandidates', animals.length);
    }
  }

  function disposeAllTroops() {
    for (var i = _troops.length - 1; i >= 0; i--) {
      removeTroopAt(i);
    }
  }

  function getBarracksMap() {
    var map = {};
    if (!window.GameState || !GameState.getAllInstancesLive) return map;

    var instances = GameState.getAllInstancesLive();
    for (var uid in instances) {
      var instance = instances[uid];
      if (!instance || instance.entityId !== 'building.barracks') continue;
      map[uid] = instance;
    }

    return map;
  }

  function getBarracksStateLive(uid) {
    if (!window.GameState) return null;
    if (GameState.getBarracksStateLive) return GameState.getBarracksStateLive(uid);
    if (GameState.getBarracksState) return GameState.getBarracksState(uid);
    return null;
  }

  function syncTroops() {
    if (!window.GameState || !GameState.getAllInstancesLive) return;

    var barracksMap = getBarracksMap();
    var desiredCounts = {};
    var existingGroups = {};

    for (var uid in barracksMap) {
      var barracks = barracksMap[uid];
      var unitDefs = getBarracksUnitDefs(barracks);
      var state = getBarracksStateLive(uid);
      if (!state || !state.reserves) continue;

      for (var unitType in unitDefs) {
        desiredCounts[getTroopKey(uid, unitType)] = Math.max(0, state.reserves[unitType] || 0);
      }
    }

    for (var troopIndex = _troops.length - 1; troopIndex >= 0; troopIndex--) {
      var troop = _troops[troopIndex];
      var key = getTroopKey(troop.barracksUid, troop.unitType);
      if (!barracksMap[troop.barracksUid] || !desiredCounts.hasOwnProperty(key) || desiredCounts[key] <= 0) {
        removeTroopAt(troopIndex);
        continue;
      }

      if (!existingGroups[key]) existingGroups[key] = [];
      existingGroups[key].push({ troop: troop, index: troopIndex });
    }

    for (var groupKey in existingGroups) {
      var desired = desiredCounts[groupKey] || 0;
      var entries = existingGroups[groupKey];
      if (entries.length <= desired) continue;

      entries.sort(function(a, b) {
        return a.index - b.index;
      });

      var removalIndexes = [];
      for (var removeIndex = entries.length - 1; removeIndex >= desired; removeIndex--) {
        removalIndexes.push(entries[removeIndex].index);
      }
      removalIndexes.sort(function(a, b) {
        return b - a;
      });
      for (var removalCursor = 0; removalCursor < removalIndexes.length; removalCursor++) {
        removeTroopAt(removalIndexes[removalCursor]);
      }
    }

    for (var desiredKey in desiredCounts) {
      var parts = desiredKey.split('::');
      var barracksUid = parts[0];
      var unitType = parts[1];
      var currentCount = getTroopCountForKey(desiredKey);
      var targetCount = desiredCounts[desiredKey] || 0;
      var barracksInstance = barracksMap[barracksUid];

      while (barracksInstance && currentCount < targetCount) {
        _troops.push(createTroop(barracksInstance, unitType));
        currentCount += 1;
      }
    }

    reindexTroops();
  }

  function getTroopKey(barracksUid, unitType) {
    return barracksUid + '::' + unitType;
  }

  function getTroopCountForKey(key) {
    var count = 0;
    for (var i = 0; i < _troops.length; i++) {
      if (getTroopKey(_troops[i].barracksUid, _troops[i].unitType) === key) count += 1;
    }
    return count;
  }

  function reindexTroops() {
    var byBarracks = {};

    for (var i = 0; i < _troops.length; i++) {
      var troop = _troops[i];
      if (!byBarracks[troop.barracksUid]) byBarracks[troop.barracksUid] = [];
      byBarracks[troop.barracksUid].push(troop);
    }

    for (var uid in byBarracks) {
      var group = byBarracks[uid];
      group.sort(function(a, b) {
        if (a.unitType === b.unitType) return a.uid < b.uid ? -1 : 1;
        if (a.unitType === 'swordsman') return -1;
        if (b.unitType === 'swordsman') return 1;
        return a.unitType < b.unitType ? -1 : 1;
      });

      for (var index = 0; index < group.length; index++) {
        group[index].slotIndex = index;
        group[index].groupSize = group.length;
      }
    }
  }

  function createTroop(barracks, unitType) {
    var spawnJitter = getTroopSpawnJitter();
    var spawnPos = resolveStandPosition(
      barracks.x + ((Math.random() - 0.5) * spawnJitter),
      barracks.z + ((Math.random() - 0.5) * spawnJitter),
      { x: barracks.x, z: barracks.z },
      4
    );

    var troop = {
      uid: 'barracks_troop_' + (_troopIdCounter++),
      barracksUid: barracks.uid,
      unitType: unitType,
      slotIndex: 0,
      groupSize: 1,
      position: { x: spawnPos.x, z: spawnPos.z },
      targetPosition: null,
      pathQueue: [],
      targetAnimalId: null,
      attackCooldown: Math.random() * getInitialAttackCooldownMax(),
      destinationCooldown: 0,
      repathCooldown: 0,
      status: 'idle',
      visualTime: Math.random() * Math.PI * 2,
      lastMoveX: 0,
      lastMoveZ: 1,
      mesh: createTroopMesh(unitType)
    };

    updateTroopVisual(troop, 0);
    if (troop.mesh && window.GameScene && GameScene.addToScene) {
      GameScene.addToScene(troop.mesh);
    }

    return troop;
  }

  function removeTroopAt(index) {
    var troop = _troops[index];
    if (!troop) return;
    if (troop.mesh && window.GameScene && GameScene.removeFromScene) {
      GameScene.removeFromScene(troop.mesh);
    }
    _troops.splice(index, 1);
  }

  function createTroopMesh(unitType) {
    if (typeof THREE === 'undefined') return null;

    var group = new THREE.Group();
    var clothColor = unitType === 'archer' ? 0x4b6a3f : 0x8b4a3b;
    var trimColor = unitType === 'archer' ? 0xd1b37a : 0xb6bcc6;
    var skinColor = 0xe1bc91;
    var leatherColor = 0x5c4033;

    function addMesh(geometry, material, x, y, z, rotX, rotY, rotZ) {
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x || 0, y || 0, z || 0);
      mesh.rotation.set(rotX || 0, rotY || 0, rotZ || 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    }

    addMesh(new THREE.BoxGeometry(0.18, 0.34, 0.12), new THREE.MeshLambertMaterial({ color: clothColor }), 0, 0.48, 0);
    addMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshLambertMaterial({ color: skinColor }), 0, 0.74, 0);
    addMesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), new THREE.MeshLambertMaterial({ color: leatherColor }), -0.05, 0.15, 0);
    addMesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), new THREE.MeshLambertMaterial({ color: leatherColor }), 0.05, 0.15, 0);
    addMesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), new THREE.MeshLambertMaterial({ color: skinColor }), -0.16, 0.49, 0);
    addMesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), new THREE.MeshLambertMaterial({ color: skinColor }), 0.16, 0.49, 0);
    addMesh(new THREE.BoxGeometry(0.22, 0.06, 0.16), new THREE.MeshLambertMaterial({ color: trimColor }), 0, 0.33, 0);

    if (unitType === 'archer') {
      addMesh(new THREE.TorusGeometry(0.12, 0.012, 6, 18, Math.PI), new THREE.MeshLambertMaterial({ color: 0x8b6b3f }), 0.18, 0.48, 0.03, Math.PI / 2, 0, Math.PI / 2);
      addMesh(new THREE.BoxGeometry(0.003, 0.24, 0.003), new THREE.MeshBasicMaterial({ color: 0xf4e6c8 }), 0.18, 0.48, 0.03, 0, 0, 0);
      addMesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), new THREE.MeshLambertMaterial({ color: 0x70513d }), -0.15, 0.46, -0.12, 0.15, 0, 0);
      addMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), new THREE.MeshLambertMaterial({ color: 0xf0d8a0 }), -0.12, 0.56, -0.12, 0.2, 0, 0.8);
    } else {
      addMesh(new THREE.BoxGeometry(0.03, 0.28, 0.03), new THREE.MeshLambertMaterial({ color: 0xc6ccd4 }), 0.18, 0.52, 0.02, 0, 0, -0.1);
      addMesh(new THREE.BoxGeometry(0.08, 0.04, 0.05), new THREE.MeshLambertMaterial({ color: 0x8b6b3f }), 0.18, 0.39, 0.02, 0, 0, 0);
      addMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), new THREE.MeshLambertMaterial({ color: 0x5c4a34 }), -0.18, 0.47, 0.02, Math.PI / 2, 0, 0);
      addMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12), new THREE.MeshLambertMaterial({ color: trimColor }), -0.18, 0.47, 0.03, Math.PI / 2, 0, 0);
    }

    group.scale.setScalar(0.78);
    group.userData.isBarracksTroop = true;
    group.userData.unitType = unitType;
    return group;
  }

  function updateTroop(troop, dt, barracksMap, animals, animalMap, playerPos, activeCombatTarget, mode) {
    var barracks = barracksMap[troop.barracksUid];
    if (!barracks) return;

    var unitConfig = getUnitConfig(barracks, troop.unitType);
    if (!unitConfig) return;

    troop.attackCooldown = Math.max(0, troop.attackCooldown - dt);
    troop.destinationCooldown = Math.max(0, troop.destinationCooldown - dt);
    troop.repathCooldown = Math.max(0, troop.repathCooldown - dt);

    var target = null;
    var isSharedCombatTarget = false;

    if (mode === 'follow') {
      if (isValidAnimalTarget(activeCombatTarget)) {
        target = activeCombatTarget;
        isSharedCombatTarget = true;
      }
    } else {
      target = selectGuardTarget(troop, barracks, animals, animalMap);
    }

    if (!isSharedCombatTarget && isValidAnimalTarget(activeCombatTarget) && target && activeCombatTarget.id === target.id) {
      isSharedCombatTarget = true;
    }

    if (isValidAnimalTarget(target)) {
      troop.targetAnimalId = target.id;
      engageTarget(troop, barracks, target, unitConfig, dt, mode, isSharedCombatTarget, playerPos);
    } else {
      troop.targetAnimalId = null;
      holdFormation(troop, barracks, playerPos, unitConfig, dt, mode);
    }

    updateTroopVisual(troop, dt);
  }

  function holdFormation(troop, barracks, playerPos, unitConfig, dt, mode) {
    var anchor = mode === 'follow'
      ? getFollowAnchor(troop, playerPos || { x: barracks.x, z: barracks.z })
      : getGuardAnchor(troop, barracks);

    troop.status = mode === 'follow' ? 'follow' : 'guard';
    moveTroopTowards(troop, anchor, dt, getUnitMoveSpeed(unitConfig));
  }

  function engageTarget(troop, barracks, target, unitConfig, dt, mode, isSharedCombatTarget, playerPos) {
    var attackRange = getUnitAttackRange(unitConfig);
    var guardRadius = getBarracksGuardRadius(barracks);
    var barracksDistance = distanceBetween({ x: barracks.x, z: barracks.z }, { x: target.worldX, z: target.worldZ });

    if (mode !== 'follow' && barracksDistance > guardRadius + getGuardRadiusLeashBonus()) {
      troop.targetAnimalId = null;
      holdFormation(troop, barracks, playerPos, unitConfig, dt, mode);
      return;
    }

    var engagePos = getEngageAnchor(troop, target, attackRange);
    var targetDistance = distanceBetween(troop.position, { x: target.worldX, z: target.worldZ });

    troop.status = mode === 'follow' ? 'assist' : 'attack';

    if (targetDistance > attackRange) {
      moveTroopTowards(troop, engagePos, dt, getUnitMoveSpeed(unitConfig));
      return;
    }

    troop.pathQueue = [];
    troop.targetPosition = engagePos;

    if (troop.attackCooldown > 0) return;

    var targetBalance = GameRegistry.getBalance(target.type) || {};
    var targetDefense = target.defense !== undefined ? target.defense : (targetBalance.defense || 0);
  var damage = Math.max(getMinimumDamage(), getUnitAttackDamage(unitConfig) - targetDefense);

    target.hp -= damage;
    if (target.hp < 0) target.hp = 0;
    troop.attackCooldown = getUnitAttackInterval(unitConfig);

    if (window.GameHUD && GameHUD.showDamageNumber) {
      GameHUD.showDamageNumber(target.worldX, 1.0, target.worldZ, '-' + damage, 'damage');
    }
    if (window.ParticleSystem && ParticleSystem.emit) {
      ParticleSystem.emit('combatHit', { x: target.worldX, y: 0.75, z: target.worldZ }, { color: troop.unitType === 'archer' ? 0x9ad1ff : 0xe7b16f });
    }

    if (target.hp > 0) return;

    target.hp = 0;
    troop.targetAnimalId = null;

    if (!isSharedCombatTarget) {
      finishAnimalKill(target, targetBalance);
    }
  }

  function moveTroopTowards(troop, targetPos, dt, moveSpeed) {
    if (!targetPos) return true;

    updateTroopDestination(troop, targetPos);

    if (troop.pathQueue && troop.pathQueue.length > 0) {
      var waypoint = troop.pathQueue[0];
      var reachedWaypoint = moveTroopStep(troop, waypoint, dt, moveSpeed);
      if (reachedWaypoint) {
        troop.pathQueue.shift();
      }
    } else {
      return moveTroopStep(troop, troop.targetPosition, dt, moveSpeed);
    }

    if (troop.pathQueue && troop.pathQueue.length === 0 && troop.targetPosition) {
      return moveTroopStep(troop, troop.targetPosition, dt, moveSpeed);
    }

    return false;
  }

  function updateTroopDestination(troop, targetPos) {
    if (!targetPos) return;

    if (troop.targetPosition) {
      var targetDeltaX = targetPos.x - troop.targetPosition.x;
      var targetDeltaZ = targetPos.z - troop.targetPosition.z;
      if ((targetDeltaX * targetDeltaX) + (targetDeltaZ * targetDeltaZ) < 0.2 * 0.2) {
        return;
      }
      if (troop.destinationCooldown > 0) {
        return;
      }
    }

    troop.destinationCooldown = getDestinationRetargetCooldown();
    troop.targetPosition = { x: targetPos.x, z: targetPos.z };
    troop.pathQueue = buildPath(troop.position, troop.targetPosition);
  }

  function moveTroopStep(troop, destination, dt, moveSpeed) {
    if (!destination) return true;

    var dx = destination.x - troop.position.x;
    var dz = destination.z - troop.position.z;
    var distance = Math.sqrt(dx * dx + dz * dz);
    var moveDistance = Math.max(0.01, moveSpeed * dt);

    if (distance <= Math.max(0.08, moveDistance)) {
      troop.lastMoveX = dx;
      troop.lastMoveZ = dz;
      troop.position.x = destination.x;
      troop.position.z = destination.z;
      return true;
    }

    var stepX = troop.position.x + (dx / distance) * moveDistance;
    var stepZ = troop.position.z + (dz / distance) * moveDistance;
    var nextX = troop.position.x;
    var nextZ = troop.position.z;

    if (canMoveTo(stepX, stepZ)) {
      nextX = stepX;
      nextZ = stepZ;
    } else if (canMoveTo(stepX, troop.position.z)) {
      nextX = stepX;
    } else if (canMoveTo(troop.position.x, stepZ)) {
      nextZ = stepZ;
    } else if (troop.repathCooldown <= 0) {
      troop.repathCooldown = getRepathCooldown();
      troop.pathQueue = buildPath(troop.position, troop.targetPosition);
    }

    troop.lastMoveX = nextX - troop.position.x;
    troop.lastMoveZ = nextZ - troop.position.z;
    troop.position.x = nextX;
    troop.position.z = nextZ;
    return false;
  }

  function canMoveTo(worldX, worldZ) {
    if (window.NPCSystem && NPCSystem.canMoveTo) {
      return NPCSystem.canMoveTo(worldX, worldZ);
    }
    if (window.GameTerrain && GameTerrain.isWalkable) {
      return GameTerrain.isWalkable(worldX, worldZ);
    }
    return true;
  }

  function buildPath(start, target) {
    if (window.NPCSystem && NPCSystem.findPath) {
      return NPCSystem.findPath(start, target) || [];
    }
    return [];
  }

  function getLoadedAnimals() {
    var animals = [];
    if (!window.GameTerrain || !GameTerrain.getAllChunks) return animals;

    var chunks = GameTerrain.getAllChunks();
    for (var key in chunks) {
      var chunk = chunks[key];
      if (!chunk || !chunk.objects) continue;
      for (var index = 0; index < chunk.objects.length; index++) {
        var obj = chunk.objects[index];
        if (!obj || !obj.type || obj.type.indexOf('animal.') !== 0) continue;
        if (obj.hp <= 0 || obj._destroyed) continue;
        animals.push(obj);
      }
    }

    return animals;
  }

  function isValidAnimalTarget(target) {
    return !!(target && target.type && target.type.indexOf('animal.') === 0 && target.hp > 0 && !target._destroyed);
  }

  function selectGuardTarget(troop, barracks, animals, animalMap) {
    var guardRadius = getBarracksGuardRadius(barracks);
    var existingTarget = troop.targetAnimalId ? animalMap[troop.targetAnimalId] : null;
    if (isAnimalWithinGuardRadius(existingTarget, barracks, guardRadius + getGuardRadiusLeashBonus())) {
      return existingTarget;
    }

    var bestTarget = null;
    var bestScore = Infinity;

    for (var index = 0; index < animals.length; index++) {
      var animal = animals[index];
      if (!isAnimalWithinGuardRadius(animal, barracks, guardRadius)) continue;

      var threatBias = (window.GameRegistry && GameRegistry.isAnimalThreat && GameRegistry.isAnimalThreat(animal.type)) ? getThreatBias() : 0;
      var troopDistance = distanceBetween(troop.position, { x: animal.worldX, z: animal.worldZ });
      var barracksDistance = distanceBetween({ x: barracks.x, z: barracks.z }, { x: animal.worldX, z: animal.worldZ });
      var score = (troopDistance * getTroopDistanceWeight()) + (barracksDistance * getBarracksDistanceWeight()) + threatBias + getPriorityBiasForAnimal(animal.type);

      if (score < bestScore) {
        bestScore = score;
        bestTarget = animal;
      }
    }

    return bestTarget;
  }

  function isAnimalWithinGuardRadius(animal, barracks, radius) {
    if (!isValidAnimalTarget(animal) || !barracks) return false;
    var dx = animal.worldX - barracks.x;
    var dz = animal.worldZ - barracks.z;
    return Math.sqrt(dx * dx + dz * dz) <= radius;
  }

  function getGuardAnchor(troop, barracks) {
    var groupSize = Math.max(1, troop.groupSize || 1);
    var ringIndex = Math.floor(troop.slotIndex / 6);
    var angle = ((troop.slotIndex % groupSize) / groupSize) * Math.PI * 2;
    angle += (hashString(troop.barracksUid) % 360) * (Math.PI / 180);
    var radius = getGuardBaseRadius() + (ringIndex * getGuardRingSpacing()) + (troop.unitType === 'archer' ? getGuardArcherOffset() : 0);

    return resolveStandPosition(
      barracks.x + Math.cos(angle) * radius,
      barracks.z + Math.sin(angle) * radius,
      { x: barracks.x, z: barracks.z },
      4
    );
  }

  function getFollowAnchor(troop, playerPos) {
    var seed = hashString(troop.uid + ':' + troop.barracksUid);
    var angle = ((seed % 360) * (Math.PI / 180)) + ((troop.slotIndex % 5) * getFollowAngleStep());
    var radius = getFollowBaseRadius() + (Math.floor(troop.slotIndex / 5) * getFollowRingSpacing()) + (troop.unitType === 'archer' ? getFollowArcherOffset() : 0);

    return resolveStandPosition(
      playerPos.x + Math.cos(angle) * radius,
      playerPos.z + Math.sin(angle) * radius,
      playerPos,
      4
    );
  }

  function getEngageAnchor(troop, target, attackRange) {
    var seed = hashString(troop.uid);
    var angle = (seed % 360) * (Math.PI / 180);
    var desiredRadius = Math.max(getEngageMinRadius(), attackRange * getEngageRadiusMultiplier());

    return resolveStandPosition(
      target.worldX + Math.cos(angle) * desiredRadius,
      target.worldZ + Math.sin(angle) * desiredRadius,
      { x: target.worldX, z: target.worldZ },
      3
    );
  }

  function resolveStandPosition(targetX, targetZ, fallback, maxRadius) {
    if (canMoveTo(targetX, targetZ)) {
      return { x: targetX, z: targetZ };
    }

    var best = null;
    var bestScore = Infinity;
    var radiusLimit = Math.max(1, maxRadius || 4);

    for (var radius = 0.5; radius <= radiusLimit; radius += 0.5) {
      for (var step = 0; step < 16; step++) {
        var angle = (step / 16) * Math.PI * 2;
        var sampleX = targetX + Math.cos(angle) * radius;
        var sampleZ = targetZ + Math.sin(angle) * radius;
        if (!canMoveTo(sampleX, sampleZ)) continue;

        var sampleDx = sampleX - targetX;
        var sampleDz = sampleZ - targetZ;
        var score = (sampleDx * sampleDx) + (sampleDz * sampleDz);
        if (score < bestScore) {
          bestScore = score;
          best = { x: sampleX, z: sampleZ };
        }
      }

      if (best) return best;
    }

    return fallback ? { x: fallback.x, z: fallback.z } : { x: targetX, z: targetZ };
  }

  function updateTroopVisual(troop, dt) {
    if (!troop.mesh) return;

    troop.visualTime += dt;
    var moveMagnitude = Math.sqrt((troop.lastMoveX * troop.lastMoveX) + (troop.lastMoveZ * troop.lastMoveZ));
    var bob = moveMagnitude > 0.001 ? (Math.sin(troop.visualTime * 10) * 0.025) : (Math.sin(troop.visualTime * 3) * 0.008);

    troop.mesh.position.set(troop.position.x, 0.02 + bob, troop.position.z);

    if (moveMagnitude > 0.0005) {
      troop.mesh.rotation.y = Math.atan2(troop.lastMoveX, troop.lastMoveZ);
    }
  }

  function finishAnimalKill(target, balance) {
    if (!target || target._destroyed) return;

    target._destroyed = true;

    if (balance && balance.rewards) {
      for (var resId in balance.rewards) {
        var amount = balance.rewards[resId] || 0;
        if (amount <= 0) continue;

        GameState.addResource(resId, amount);

        if (window.GameHUD && GameHUD.showDamageNumber) {
          var entity = GameRegistry.getEntity(resId);
          var name = entity ? entity.name : resId;
          GameHUD.showDamageNumber(target.worldX, 1.35, target.worldZ, '+' + amount + ' ' + name, 'loot');
        }
      }
    }

    if (window.GameEntities && GameEntities.hideObject) {
      GameEntities.hideObject(target);
    }
    if (window.ParticleSystem && ParticleSystem.emit) {
      ParticleSystem.emit('deathBurst', { x: target.worldX, y: 0.5, z: target.worldZ });
      ParticleSystem.emit('loot', { x: target.worldX, y: 0.9, z: target.worldZ });
    }

    scheduleAnimalRespawn(target, balance);

    if (window.UnlockSystem && UnlockSystem.checkAll) UnlockSystem.checkAll();
    if (window.GameHUD && GameHUD.renderAll) GameHUD.renderAll();
  }

  function scheduleAnimalRespawn(target, balance) {
    var respawnTime = getEntityRespawnTimeSeconds(balance);
    target.respawnAt = Date.now() + (respawnTime * 1000);

    function tryAnimalRespawn() {
      if (!target || !target._destroyed) return;

      var relocated = false;
      if (window.GameTerrain && GameTerrain.relocateRespawnedAnimal) {
        relocated = GameTerrain.relocateRespawnedAnimal(target);
      }

      if (!relocated && isPlayerTooCloseForRespawn(target)) {
        setTimeout(tryAnimalRespawn, getAnimalRespawnRetryDelayMs());
        return;
      }

      target.hp = target.maxHp || Number(balance && balance.hp) || 0;
      target._destroyed = false;
      target.respawnAt = 0;
      if (window.GameEntities && GameEntities.showObject) {
        GameEntities.showObject(target);
      }
    }

    setTimeout(tryAnimalRespawn, respawnTime * 1000);
  }

  function getBarracksUnitDefs(barracks) {
    var balance = getBarracksBalance(barracks);
    var military = balance.military || {};
    return military.units || {};
  }

  function getBarracksBalance(barracks) {
    return (window.GameRegistry && GameRegistry.getBalance) ? (GameRegistry.getBalance(barracks.entityId) || {}) : {};
  }

  function getUnitConfig(barracks, unitType) {
    var unitDefs = getBarracksUnitDefs(barracks);
    return unitDefs[unitType] || null;
  }

  function getBarracksGuardRadius(barracks) {
    var balance = getBarracksBalance(barracks);
    var level = barracks.level || 1;
    return getLevelConfigValue(balance.guardRadius, level, 0);
  }

  function getLevelConfigValue(value, level, fallback) {
    if (value === undefined || value === null) return fallback;
    if (typeof value !== 'object') return value;
    if (value[level] !== undefined) return value[level];
    if (value[1] !== undefined) return value[1];
    return fallback;
  }

  function getUnitMoveSpeed(unitConfig) {
    return Number(unitConfig && unitConfig.moveSpeed) || 0;
  }

  function getUnitAttackRange(unitConfig) {
    return Number(unitConfig && unitConfig.attackRange) || 0;
  }

  function getUnitAttackDamage(unitConfig) {
    return Number(unitConfig && unitConfig.attackDamage) || getMinimumDamage();
  }

  function getUnitAttackInterval(unitConfig) {
    return Number(unitConfig && unitConfig.attackIntervalSeconds) || 0;
  }

  function distanceBetween(a, b) {
    var dx = (a.x || 0) - (b.x || 0);
    var dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dz * dz);
  }

  function hashString(text) {
    var hash = 0;
    if (!text) return hash;
    for (var i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getBarracksCommandMode(uid) {
    var state = getBarracksStateLive(uid);
    return state && state.commandMode === 'follow' ? 'follow' : 'guard';
  }

  function setBarracksCommandMode(uid, mode) {
    var state = getBarracksStateLive(uid);
    if (!state) return false;

    state.commandMode = mode === 'follow' ? 'follow' : 'guard';

    for (var i = 0; i < _troops.length; i++) {
      var troop = _troops[i];
      if (troop.barracksUid !== uid) continue;
      troop.targetAnimalId = null;
      troop.targetPosition = null;
      troop.pathQueue = [];
      troop.destinationCooldown = 0;
      troop.repathCooldown = 0;
      troop.status = 'idle';
    }

    return true;
  }

  function getBarracksTroopSummary(uid) {
    if (_initialized) syncTroops();

    var mode = getBarracksCommandMode(uid);
    var modeLabel = MODE_LABELS[mode] || MODE_LABELS.guard;
    var countByType = {};
    var troopCount = 0;
    var engagedCount = 0;
    var instance = window.GameState && GameState.getInstance ? GameState.getInstance(uid) : null;

    for (var i = 0; i < _troops.length; i++) {
      var troop = _troops[i];
      if (troop.barracksUid !== uid) continue;

      troopCount += 1;
      countByType[troop.unitType] = (countByType[troop.unitType] || 0) + 1;
      if (troop.status === 'attack' || troop.status === 'assist') engagedCount += 1;
    }

    var typeSummary = [];
    for (var unitType in countByType) {
      var unitConfig = instance ? getUnitConfig(instance, unitType) : null;
      typeSummary.push((unitConfig && unitConfig.label ? unitConfig.label : unitType) + ': ' + countByType[unitType]);
    }

    var statusText;
    if (troopCount <= 0) {
      statusText = 'Train units to deploy them around this barracks.';
    } else if (mode === 'follow') {
      statusText = engagedCount > 0 ? 'Units are supporting the player in combat.' : 'Units are marching with the player.';
    } else {
      statusText = engagedCount > 0 ? 'Units are intercepting nearby animals.' : 'Units are holding around the barracks.';
    }

    return {
      troopCount: troopCount,
      engagedCount: engagedCount,
      mode: mode,
      modeLabel: modeLabel,
      unitSummaryText: typeSummary.length ? typeSummary.join(' | ') : 'No deployed troops',
      statusText: statusText
    };
  }

  return {
    init: init,
    update: update,
    getBarracksCommandMode: getBarracksCommandMode,
    setBarracksCommandMode: setBarracksCommandMode,
    getBarracksTroopSummary: getBarracksTroopSummary
  };
})();