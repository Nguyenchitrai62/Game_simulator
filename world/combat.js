window.GameCombat = (function () {
  var _activeCombat = null;
  var _manualAttackCooldown = 0;
  var _activeProjectiles = [];
  var _nextProjectileId = 0;
  var _projectileForwardVector = null;
  var _projectileAimVector = null;

  function formatLocalizedText(text, tokens) {
    var output = String(text == null ? '' : text);
    if (!tokens) return output;

    for (var tokenName in tokens) {
      if (!Object.prototype.hasOwnProperty.call(tokens, tokenName)) continue;
      output = output.split('{' + tokenName + '}').join(String(tokens[tokenName]));
    }

    return output;
  }

  function t(path, tokens, fallback) {
    if (window.GameI18n && GameI18n.t) {
      return GameI18n.t(path, tokens, fallback);
    }
    if (fallback !== undefined) return formatLocalizedText(fallback, tokens);
    return formatLocalizedText(path, tokens);
  }

  function getCombatConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.combat) || {};
  }

  function getAnimalRespawnConfig() {
    return (window.GAME_BALANCE && GAME_BALANCE.animalRespawn) || {};
  }

  function getWeaponProfiles() {
    return getCombatConfig().weaponProfiles || {};
  }

  function getMinimumDamage() {
    return Number(getCombatConfig().minimumDamage) || 0;
  }

  function getBaseDisengageDistance() {
    return Number(getCombatConfig().disengageDistance) || 0;
  }

  function getPlayerStartRangePadding() {
    return Number(getCombatConfig().playerStartRangePadding) || 0;
  }

  function getPlayerDisengagePadding() {
    return Number(getCombatConfig().playerDisengagePadding) || 0;
  }

  function getEnemyAttackIntervalDefault() {
    return Number(getCombatConfig().enemyAttackIntervalSeconds) || 0;
  }

  function getDefaultEnemyAttackRange() {
    return Number(getCombatConfig().defaultEnemyAttackRange) || 0;
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

  function getTargetMesh(target) {
    if (!target || typeof GameEntities === 'undefined' || !GameEntities.getMeshForObjectId) return null;

    if (_activeCombat && _activeCombat.target === target && _activeCombat.targetMesh && _activeCombat.targetMesh.parent) {
      return _activeCombat.targetMesh;
    }

    var mesh = GameEntities.getMeshForObjectId(target.id);
    if (_activeCombat && _activeCombat.target === target) {
      _activeCombat.targetMesh = mesh;
    }
    return mesh;
  }

  function getCurrentWeaponData() {
    var player = window.GameState && GameState.getPlayer ? GameState.getPlayer() : null;
    var weaponId = player && player.equipped ? player.equipped.weapon : null;
    var weaponEntity = weaponId ? GameRegistry.getEntity(weaponId) : null;
    var weaponBalance = weaponId ? (GameRegistry.getBalance(weaponId) || {}) : {};
    return {
      weaponId: weaponId,
      weaponEntity: weaponEntity,
      weaponBalance: weaponBalance
    };
  }

  function buildWeaponProfile() {
    var weaponData = getCurrentWeaponData();
    var profileId = weaponData.weaponBalance.weaponProfile || 'unarmed';
    var profiles = getWeaponProfiles();
    var baseProfile = profiles[profileId] || profiles.unarmed || {};
    var overrides = weaponData.weaponBalance.weaponProfileOverrides || {};
    var profile = {};
    var key;

    for (key in baseProfile) {
      profile[key] = baseProfile[key];
    }
    for (key in overrides) {
      profile[key] = overrides[key];
    }

    profile.id = profileId;
    profile.weaponId = weaponData.weaponId || null;
    profile.weaponName = weaponData.weaponEntity
      ? weaponData.weaponEntity.name
      : t('world.combat.weaponProfiles.' + profileId, null, profile.label || t('world.combat.bareHands', null, 'Bare Hands'));
    profile.classId = profile.classId || 'melee';
    profile.attackRange = Number(profile.attackRange) || 1;
    profile.attackIntervalSeconds = Number(profile.attackIntervalSeconds) || Number(getCombatConfig().playerAttackIntervalSeconds) || 0.5;
    profile.engageRange = Number(profile.engageRange) || (profile.attackRange + getPlayerStartRangePadding());
    profile.damageMultiplier = Number(profile.damageMultiplier) || 1;
    profile.bossDamageMultiplier = Number(profile.bossDamageMultiplier) || 1;
    profile.directionalAim = profile.directionalAim === true;
    profile.projectileSpeed = Number(profile.projectileSpeed) || 11;
    profile.projectileHitRadius = Number(profile.projectileHitRadius) || 0.35;
    profile.projectileStartOffset = Number(profile.projectileStartOffset) || 0.65;
    profile.projectileMaxRange = Number(profile.projectileMaxRange) || profile.attackRange;
    profile.hitColor = profile.hitColor !== undefined ? profile.hitColor : 0xff4444;
    return profile;
  }

  function isDirectionalAimProfile(profile) {
    return !!(profile && profile.directionalAim);
  }

  function isMeleeAutoAttackProfile(profile) {
    return !!(profile && !isDirectionalAimProfile(profile));
  }

  function triggerPlayerAttackAnimation(profile, targetX, targetZ) {
    if (!window.GamePlayer || !GamePlayer.triggerAttackAnimation) return;
    GamePlayer.triggerAttackAnimation(profile, targetX, targetZ);
  }

  function getPlayerAttackRange() {
    return buildWeaponProfile().attackRange;
  }

  function getCombatDisengageDistance(profile) {
    profile = profile || buildWeaponProfile();
    return Math.max(getBaseDisengageDistance(), profile.attackRange + getPlayerDisengagePadding());
  }

  function getEnemyAttackRange(balance) {
    var behavior = (balance && balance.behavior) || {};
    return Number(behavior.attackRange) || Number(balance && balance.attackRange) || getDefaultEnemyAttackRange();
  }

  function getEnemyAttackInterval(balance) {
    var behavior = (balance && balance.behavior) || {};
    return Number(behavior.attackIntervalSeconds) || Number(balance && balance.attackIntervalSeconds) || getEnemyAttackIntervalDefault();
  }

  function getDistanceToTarget(target) {
    if (!target || !window.GamePlayer || !GamePlayer.getPosition) return Infinity;
    var playerPos = GamePlayer.getPosition();
    var dx = target.worldX - playerPos.x;
    var dz = target.worldZ - playerPos.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function isValidCombatTarget(objData) {
    return !!(objData && objData.type && objData.type.indexOf('animal.') === 0 && objData.hp > 0 && !objData._destroyed);
  }

  function isBossTarget(target, balance) {
    return !!((balance && balance.isBoss) || (target && target.type && target.type.indexOf('animal.boss_') === 0));
  }

  function canStartCombatWith(objData) {
    if (!isValidCombatTarget(objData)) return false;
    var profile = buildWeaponProfile();
    if (isDirectionalAimProfile(profile)) {
      return getDistanceToTarget(objData) <= profile.projectileMaxRange + getPlayerStartRangePadding();
    }
    return getDistanceToTarget(objData) <= Math.max(profile.engageRange, profile.attackRange);
  }

  function ensureCombatTarget(target) {
    if (!isValidCombatTarget(target)) return false;

    if (_activeCombat && _activeCombat.target === target) {
      return true;
    }

    if (_activeCombat && _activeCombat.target !== target) {
      endCombat(false);
    }

    return startCombat(target);
  }

  function startCombat(objData) {
    if (_activeCombat || !isValidCombatTarget(objData)) return false;

    var balance = GameRegistry.getBalance(objData.type);
    if (!balance) return false;

    objData.maxHp = objData.maxHp || balance.hp;
    objData.attack = balance.attack || 0;
    objData.defense = balance.defense || 0;

    _activeCombat = {
      target: objData,
      targetMesh: getTargetMesh(objData),
      playerAttackTimer: 0,
      enemyAttackTimer: 0
    };

    var hpContainer = document.getElementById('combat-hp');
    if (hpContainer) {
      hpContainer.classList.add('show');
      hpContainer.classList.toggle('boss-fight', !!(balance && balance.isBoss));
    }

    var playerHpWrapper = document.getElementById('player-hp-wrapper');
    if (playerHpWrapper) playerHpWrapper.classList.add('in-combat');

    if (window.GameHUD && GameHUD.showObjectHpBar) {
      GameHUD.showObjectHpBar(objData);
    }

    updateCombatUI();
    return true;
  }

  function disposeProjectileMesh(mesh) {
    if (!mesh) return;

    if (window.GameScene && GameScene.removeFromScene) {
      GameScene.removeFromScene(mesh);
    }

    mesh.traverse(function (child) {
      if (!child || !child.isMesh) return;
      if (child.geometry && child.geometry.dispose) {
        child.geometry.dispose();
      }
      if (!child.material) return;

      if (Array.isArray(child.material)) {
        child.material.forEach(function (material) {
          if (material && material.dispose) material.dispose();
        });
        return;
      }

      if (child.material.dispose) {
        child.material.dispose();
      }
    });
  }

  function removeProjectileAt(index) {
    if (index < 0 || index >= _activeProjectiles.length) return;
    disposeProjectileMesh(_activeProjectiles[index].mesh);
    _activeProjectiles.splice(index, 1);
  }

  function clearProjectiles() {
    for (var index = _activeProjectiles.length - 1; index >= 0; index--) {
      removeProjectileAt(index);
    }
  }

  function getLoadedCombatTargets() {
    var targets = [];
    if (!window.GameTerrain || !GameTerrain.getAllChunks) return targets;

    var chunks = GameTerrain.getAllChunks();
    for (var key in chunks) {
      var chunk = chunks[key];
      if (!chunk || !chunk.objects) continue;

      for (var objectIndex = 0; objectIndex < chunk.objects.length; objectIndex++) {
        var objData = chunk.objects[objectIndex];
        if (isValidCombatTarget(objData)) {
          targets.push(objData);
        }
      }
    }

    return targets;
  }

  function getCombatTargetRadius(target) {
    if (!target) return 0.4;

    var radius = 0.42;
    if (target.type === 'animal.rabbit') radius = 0.24;
    else if (target.type === 'animal.deer') radius = 0.34;
    else if (target.type === 'animal.bear') radius = 0.52;

    var mesh = getTargetMesh(target);
    if (mesh) {
      radius *= Math.max(0.8, mesh.scale.x || 1, mesh.scale.z || 1);
    }

    if (isBossTarget(target, GameRegistry.getBalance(target.type) || {})) {
      radius *= 1.18;
    }

    return radius;
  }

  function getPointToSegmentDistanceSq(pointX, pointZ, startX, startZ, endX, endZ) {
    var dx = endX - startX;
    var dz = endZ - startZ;
    var segmentLengthSq = dx * dx + dz * dz;
    var projection = 0;

    if (segmentLengthSq > 0) {
      projection = ((pointX - startX) * dx + (pointZ - startZ) * dz) / segmentLengthSq;
      projection = Math.max(0, Math.min(1, projection));
    }

    var closestX = startX + dx * projection;
    var closestZ = startZ + dz * projection;
    var distX = pointX - closestX;
    var distZ = pointZ - closestZ;

    return {
      distanceSq: distX * distX + distZ * distZ,
      t: projection
    };
  }

  function findProjectileHit(projectile, nextX, nextZ) {
    var targets = getLoadedCombatTargets();
    var bestHit = null;

    for (var targetIndex = 0; targetIndex < targets.length; targetIndex++) {
      var target = targets[targetIndex];
      var segmentInfo = getPointToSegmentDistanceSq(
        target.worldX,
        target.worldZ,
        projectile.x,
        projectile.z,
        nextX,
        nextZ
      );
      var hitRadius = projectile.hitRadius + getCombatTargetRadius(target);
      if (segmentInfo.distanceSq > hitRadius * hitRadius) continue;

      var targetPriority = projectile.targetHintId && projectile.targetHintId === target.id ? -0.001 : 0;
      if (!bestHit || (segmentInfo.t + targetPriority) < bestHit.sortKey) {
        bestHit = {
          target: target,
          sortKey: segmentInfo.t + targetPriority
        };
      }
    }

    return bestHit;
  }

  function getProjectileForwardVector() {
    if (!_projectileForwardVector && typeof THREE !== 'undefined') {
      _projectileForwardVector = new THREE.Vector3(0, 0, 1);
    }
    return _projectileForwardVector;
  }

  function getProjectileAimVector() {
    if (!_projectileAimVector && typeof THREE !== 'undefined') {
      _projectileAimVector = new THREE.Vector3();
    }
    return _projectileAimVector;
  }

  function createProjectileMesh(profile) {
    if (typeof THREE === 'undefined') return null;

    var group = new THREE.Group();
    var shaftColor = (profile.weaponId && profile.weaponId.indexOf('iron') !== -1) ? 0x6f6f74 : 0x7c5731;
    var shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6),
      new THREE.MeshLambertMaterial({ color: shaftColor })
    );
    shaft.rotation.x = Math.PI / 2;
    shaft.castShadow = true;
    group.add(shaft);

    var tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.11, 5),
      new THREE.MeshLambertMaterial({ color: profile.hitColor })
    );
    tip.position.z = 0.2;
    tip.rotation.x = Math.PI / 2;
    tip.castShadow = true;
    group.add(tip);

    var fletchingLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.012, 0.04),
      new THREE.MeshLambertMaterial({ color: 0xe9d7b1 })
    );
    fletchingLeft.position.set(0.022, 0, -0.15);
    fletchingLeft.rotation.z = 0.28;
    group.add(fletchingLeft);

    var fletchingRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.012, 0.04),
      new THREE.MeshLambertMaterial({ color: 0xe9d7b1 })
    );
    fletchingRight.position.set(-0.022, 0, -0.15);
    fletchingRight.rotation.z = -0.28;
    group.add(fletchingRight);

    if (profile.weaponId && profile.weaponId.indexOf('sunpiercer') !== -1) {
      var glow = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.018, 0.18),
        new THREE.MeshBasicMaterial({ color: 0xffec9b, transparent: true, opacity: 0.65 })
      );
      glow.position.z = 0.03;
      group.add(glow);
    }

    return group;
  }

  function updateProjectileVisual(projectile) {
    if (!projectile || !projectile.mesh) return;

    var progress = projectile.maxRange > 0 ? Math.min(1, projectile.traveled / projectile.maxRange) : 0;
    var slopeY = -(projectile.dropAmount || 0) / Math.max(projectile.maxRange || 1, 0.001);
    var projectileY = (projectile.startY || 0.92) - progress * (projectile.dropAmount || 0);
    projectile.mesh.position.set(
      projectile.x,
      projectileY,
      projectile.z
    );

    if (typeof THREE !== 'undefined') {
      var forwardVector = getProjectileForwardVector();
      var aimVector = getProjectileAimVector();
      if (forwardVector && aimVector) {
        aimVector.set(projectile.dirX, slopeY, projectile.dirZ).normalize();
        projectile.mesh.quaternion.setFromUnitVectors(forwardVector, aimVector);
      }
    }
  }

  function spawnDirectionalProjectile(targetX, targetZ, targetHint, profile) {
    if (!window.GamePlayer || !GamePlayer.getPosition) return false;

    var playerPos = GamePlayer.getPosition();
    var origin = GamePlayer.getAttackOrigin ? GamePlayer.getAttackOrigin(profile) : null;
    var originX = origin && isFinite(origin.x) ? origin.x : playerPos.x;
    var originZ = origin && isFinite(origin.z) ? origin.z : playerPos.z;
    var originY = origin && isFinite(origin.y) ? origin.y : 0.92;
    var dx = targetX - originX;
    var dz = targetZ - originZ;
    var distance = Math.sqrt(dx * dx + dz * dz);
    if (!(distance > 0.001)) return false;

    var dirX = dx / distance;
    var dirZ = dz / distance;
    var maxRange = Math.max(0.5, Number(profile.projectileMaxRange) || profile.attackRange || 1);
    var startOffset = Math.min(0.24, Math.max(0.05, Number(profile.projectileStartOffset) || 0.18));
    var dropAmount = Math.min(0.08, maxRange * 0.014);

    var projectile = {
      id: _nextProjectileId++,
      x: originX + dirX * startOffset,
      z: originZ + dirZ * startOffset,
      startY: originY + 0.02,
      dropAmount: dropAmount,
      dirX: dirX,
      dirZ: dirZ,
      speed: Math.max(4, Number(profile.projectileSpeed) || 10),
      traveled: 0,
      maxRange: maxRange,
      hitRadius: Math.max(0.1, Number(profile.projectileHitRadius) || 0.35),
      attackPower: GameState.getPlayerAttack(),
      profile: profile,
      targetHintId: targetHint && targetHint.id ? targetHint.id : null,
      mesh: createProjectileMesh(profile)
    };

    if (projectile.mesh && window.GameScene && GameScene.addToScene) {
      updateProjectileVisual(projectile);
      GameScene.addToScene(projectile.mesh);
    }

    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.emit('spark', {
        x: projectile.x,
        y: projectile.startY,
        z: projectile.z
      }, {
        color: profile.hitColor,
        spread: 0.05,
        count: 3,
        size: 0.02
      });
    }

    _activeProjectiles.push(projectile);
    return true;
  }

  function tryDirectionalAttack(targetX, targetZ, targetHint) {
    var profile = buildWeaponProfile();
    if (!isDirectionalAimProfile(profile)) return false;
    if (_manualAttackCooldown > 0) return false;

    if (!spawnDirectionalProjectile(targetX, targetZ, targetHint, profile)) {
      return false;
    }

    _manualAttackCooldown = profile.attackIntervalSeconds;
    triggerPlayerAttackAnimation(profile, targetX, targetZ);
    return true;
  }

  function applyProjectileHit(projectile, target) {
    if (!projectile || !isValidCombatTarget(target)) return;
    if (!ensureCombatTarget(target) || !_activeCombat || _activeCombat.target !== target) return;

    performPlayerAttack(target, GameRegistry.getBalance(target.type) || {}, projectile.profile, projectile.attackPower);
  }

  function updateProjectiles(dt) {
    for (var index = _activeProjectiles.length - 1; index >= 0; index--) {
      var projectile = _activeProjectiles[index];
      var remainingRange = projectile.maxRange - projectile.traveled;
      if (!(remainingRange > 0)) {
        removeProjectileAt(index);
        continue;
      }

      var stepDistance = Math.min(projectile.speed * dt, remainingRange);
      var nextX = projectile.x + projectile.dirX * stepDistance;
      var nextZ = projectile.z + projectile.dirZ * stepDistance;
      var hit = findProjectileHit(projectile, nextX, nextZ);

      projectile.x = nextX;
      projectile.z = nextZ;
      projectile.traveled += stepDistance;

      if (hit) {
        projectile.x = hit.target.worldX;
        projectile.z = hit.target.worldZ;
        updateProjectileVisual(projectile);
        applyProjectileHit(projectile, hit.target);
        removeProjectileAt(index);
        continue;
      }

      updateProjectileVisual(projectile);

      if (projectile.traveled >= projectile.maxRange) {
        if (typeof ParticleSystem !== 'undefined') {
          ParticleSystem.emit('spark', {
            x: projectile.x,
            y: 0.9,
            z: projectile.z
          }, {
            color: projectile.profile.hitColor,
            spread: 0.04,
            count: 2,
            size: 0.018
          });
        }
        removeProjectileAt(index);
      }
    }
  }

  function update(dt) {
    if (_manualAttackCooldown > 0) {
      _manualAttackCooldown = Math.max(0, _manualAttackCooldown - dt);
    }

    if (_activeProjectiles.length) {
      updateProjectiles(dt);
    }

    if (!_activeCombat) return;

    var target = _activeCombat.target;
    if (target && target.hp <= 0) {
      endCombat(true);
      return;
    }

    if (!isValidCombatTarget(target)) {
      endCombat(false);
      return;
    }

    var balance = GameRegistry.getBalance(target.type) || {};
    var profile = buildWeaponProfile();
    var distanceToTarget = getDistanceToTarget(target);

    if (distanceToTarget > getCombatDisengageDistance(profile)) {
      endCombat(false);
      return;
    }

    if (isMeleeAutoAttackProfile(profile) && distanceToTarget <= profile.attackRange) {
      _activeCombat.playerAttackTimer += dt;
      if (_activeCombat.playerAttackTimer >= profile.attackIntervalSeconds) {
        _activeCombat.playerAttackTimer = 0;
        triggerPlayerAttackAnimation(profile, target.worldX, target.worldZ);
        performPlayerAttack(target, balance, profile);
        if (!_activeCombat) return;
      }
    } else {
      _activeCombat.playerAttackTimer = 0;
    }

    if (!_activeCombat) return;

    var enemyAttackRange = getEnemyAttackRange(balance);
    var enemyAttackInterval = getEnemyAttackInterval(balance);
    if (distanceToTarget <= enemyAttackRange) {
      _activeCombat.enemyAttackTimer += dt;
      if (_activeCombat.enemyAttackTimer >= enemyAttackInterval) {
        _activeCombat.enemyAttackTimer = 0;
        performEnemyAttack(target, balance);
        if (!_activeCombat) return;
      }
    } else {
      _activeCombat.enemyAttackTimer = 0;
    }

    updateCombatUI();
  }

  function performPlayerAttack(target, balance, profile, attackOverride) {
    var playerAttack = isFinite(attackOverride) ? attackOverride : GameState.getPlayerAttack();
    var targetDefense = target.defense !== undefined ? target.defense : (balance.defense || 0);
    var totalAttack = playerAttack * profile.damageMultiplier;
    if (isBossTarget(target, balance)) {
      totalAttack *= profile.bossDamageMultiplier;
    }

    var damageToTarget = Math.max(getMinimumDamage(), Math.round(totalAttack) - targetDefense);
    target.hp -= damageToTarget;
    if (target.hp < 0) target.hp = 0;

    if (window.GameHUD && GameHUD.showDamageNumber) {
      GameHUD.showDamageNumber(target.worldX, 1.0, target.worldZ, '-' + damageToTarget, 'damage');
    }

    emitPlayerAttackEffects(target, profile);
    flashTargetMesh(target);

    if (target.hp <= 0) {
      target.hp = 0;
      if (window.GameHUD && GameHUD.renderAll) GameHUD.renderAll();
      endCombat(true);
      return;
    }

    if (window.GameHUD && GameHUD.renderAll) {
      GameHUD.renderAll();
    }
  }

  function emitPlayerAttackEffects(target, profile) {
    if (typeof ParticleSystem === 'undefined') return;

    var playerPos = GamePlayer.getPosition();
    var hitColor = profile.hitColor;
    if (profile.classId === 'ranged' || profile.classId === 'special') {
      ParticleSystem.emit('spark', {
        x: (playerPos.x + target.worldX) * 0.5,
        y: 1.0,
        z: (playerPos.z + target.worldZ) * 0.5
      }, { color: hitColor, spread: 0.08, count: 5, size: 0.03 });
    }

    if (profile.classId === 'special') {
      ParticleSystem.emit('spark', { x: target.worldX, y: 0.8, z: target.worldZ }, { color: hitColor, spread: 0.14, count: 8, size: 0.05 });
    }

    ParticleSystem.emit('combatHit', { x: target.worldX, y: 0.5, z: target.worldZ }, { color: hitColor });
  }

  function flashTargetMesh(target) {
    var mesh = getTargetMesh(target);
    if (!mesh) return;

    var flashedMaterials = [];
    mesh.traverse(function (child) {
      if (!child.isMesh || !child.material) return;

      var materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(function (material) {
        if (!material || !material.color || flashedMaterials.indexOf(material) !== -1) return;

        flashedMaterials.push(material);
        material.userData = material.userData || {};

        if (material.userData._damageRestoreHex === undefined) {
          material.userData._damageRestoreHex = material.color.getHex();
        }

        if (material.userData._damageFlashTimeout) {
          clearTimeout(material.userData._damageFlashTimeout);
        }

        material.color.setHex(0xff0000);
        material.userData._damageFlashTimeout = setTimeout(function () {
          if (material && material.color) {
            material.color.setHex(material.userData._damageRestoreHex);
            material.userData._damageFlashTimeout = null;
          }
        }, 250);
      });
    });

    var originalScaleX = mesh.scale.x;
    var originalScaleZ = mesh.scale.z;
    mesh.scale.x = originalScaleX * 1.08;
    mesh.scale.z = originalScaleZ * 1.08;
    setTimeout(function () {
      if (mesh) {
        mesh.scale.x = originalScaleX;
        mesh.scale.z = originalScaleZ;
      }
    }, 150);
  }

  function performEnemyAttack(target, balance) {
    var targetAttack = target.attack || balance.attack || 0;
    if (targetAttack <= 0) return;

    var playerDefense = GameState.getPlayerDefense();
    var damageToPlayer = Math.max(0, targetAttack - playerDefense);
    var playerPos = GamePlayer.getPosition();

    if (damageToPlayer > 0) {
      GameState.setPlayerHP(GameState.getPlayer().hp - damageToPlayer);
      if (window.GameHUD && GameHUD.showDamageNumber) {
        GameHUD.showDamageNumber(playerPos.x, 1.5, playerPos.z, '-' + damageToPlayer, 'enemy-damage');
      }

      if (typeof AnimationSystem !== 'undefined') {
        AnimationSystem.flashScreen('rgba(255,0,0,0.15)', 200);
      }

      if (typeof ParticleSystem !== 'undefined') {
        ParticleSystem.emit('combatHit', { x: playerPos.x, y: 1.0, z: playerPos.z }, { color: 0xff4444 });
      }

      if (GameState.getPlayer().hp <= 0) {
        playerDied();
        endCombat(false);
        return;
      }
    } else {
      if (window.GameHUD && GameHUD.showDamageNumber) {
        GameHUD.showDamageNumber(playerPos.x, 1.5, playerPos.z, t('world.combat.blocked', null, 'BLOCKED'), 'blocked');
      }
      if (typeof ParticleSystem !== 'undefined') {
        ParticleSystem.emit('combatBlock', { x: playerPos.x, y: 1.0, z: playerPos.z });
      }
    }

    if (window.GameHUD && GameHUD.renderAll) {
      GameHUD.renderAll();
    }
  }

  function maybeAutoEquipReward(rewardId) {
    var rewardBalance = GameRegistry.getBalance(rewardId) || {};
    if (!rewardBalance.autoEquipOnReward || !window.GameState || !GameState.equipItem) return false;
    return !!GameState.equipItem(rewardId);
  }

  function getRewardPreviewText(rewardMap, explicitLabel) {
    if (explicitLabel) return explicitLabel;
    if (!rewardMap) return '';

    for (var rewardId in rewardMap) {
      var rewardEntity = GameRegistry.getEntity(rewardId);
      if (rewardEntity && rewardEntity.type === 'equipment') {
        return rewardEntity.name;
      }
    }

    var parts = [];
    for (var mapId in rewardMap) {
      var amount = Number(rewardMap[mapId]) || 0;
      if (amount <= 0) continue;
      var entity = GameRegistry.getEntity(mapId);
      parts.push(amount + ' ' + (entity ? entity.name : mapId));
      if (parts.length >= 2) break;
    }
    return parts.join(', ');
  }

  function getRewardSummaryParts(rewardMap) {
    var parts = [];
    if (!rewardMap) return parts;

    for (var rewardId in rewardMap) {
      var amount = Number(rewardMap[rewardId]) || 0;
      if (amount <= 0) continue;
      var entity = GameRegistry.getEntity(rewardId);
      parts.push(amount + ' ' + (entity ? entity.name : rewardId));
    }

    return parts;
  }

  function trySpawnRewardDrops(worldX, worldZ, rewardMap) {
    if (!rewardMap || !window.GameTerrain || !GameTerrain.spawnRewardDrops) return false;
    var drops = GameTerrain.spawnRewardDrops(worldX, worldZ, rewardMap);
    return !!(drops && drops.length);
  }

  function grantRewardMap(worldX, worldZ, rewardMap) {
    var result = {
      parts: [],
      autoEquipped: []
    };
    if (!rewardMap) return result;

    for (var rewardId in rewardMap) {
      var amount = Number(rewardMap[rewardId]) || 0;
      if (amount <= 0) continue;

      var rewardEntity = GameRegistry.getEntity(rewardId);
      if (rewardEntity && (rewardEntity.type === 'equipment' || rewardEntity.type === 'tool' || rewardEntity.type === 'consumable')) {
        GameState.addToInventory(rewardId, amount);
        if (rewardEntity.type === 'equipment' && maybeAutoEquipReward(rewardId)) {
          result.autoEquipped.push(rewardEntity.name);
        }
      } else {
        GameState.addResource(rewardId, amount);
      }

      var rewardName = rewardEntity ? rewardEntity.name : rewardId;
      result.parts.push(amount + ' ' + rewardName);
      if (window.GameHUD && GameHUD.showDamageNumber) {
        GameHUD.showDamageNumber(worldX, 1.5, worldZ, '+' + amount + ' ' + rewardName, 'loot');
      }
    }

    return result;
  }

  function endCombat(playerWon) {
    if (!_activeCombat) return;

    var target = _activeCombat.target;
    var balance = GameRegistry.getBalance(target.type) || {};

    if (playerWon && target.hp <= 0 && !target._destroyed) {
      target._destroyed = true;

      var droppedToWorld = trySpawnRewardDrops(target.worldX, target.worldZ, balance.rewards);
      var rewardSummary = droppedToWorld
        ? { parts: getRewardSummaryParts(balance.rewards), autoEquipped: [] }
        : grantRewardMap(target.worldX, target.worldZ, balance.rewards);
      if (typeof ParticleSystem !== 'undefined') {
        if (rewardSummary.parts.length) {
          ParticleSystem.emit('loot', { x: target.worldX, y: 1.0, z: target.worldZ });
        }
        if (balance.isBoss) {
          ParticleSystem.emit('spark', { x: target.worldX, y: 1.0, z: target.worldZ }, { color: 0xffd166, spread: 0.35, count: 20, size: 0.08 });
          ParticleSystem.emit('spark', { x: target.worldX, y: 1.5, z: target.worldZ }, { color: 0xffee88, spread: 0.25, count: 12, size: 0.05 });
        }
        ParticleSystem.emit('deathBurst', { x: target.worldX, y: 0.5, z: target.worldZ });
      }

      if (window.GameEntities && GameEntities.hideObject) {
        GameEntities.hideObject(target);
      }
      if (window.GameTerrain && GameTerrain.persistObjectState) {
        GameTerrain.persistObjectState(target);
      }

      if (!droppedToWorld && window.UnlockSystem && UnlockSystem.checkAll) UnlockSystem.checkAll();
      if (window.GameHUD && GameHUD.renderAll) GameHUD.renderAll();

      scheduleAnimalRespawn(target, balance);

      if (window.GameHUD && GameHUD.showNotification) {
        if (balance.isBoss) {
          var bossRewardText = rewardSummary.parts.length ? rewardSummary.parts.join(', ') : (balance.bossRewardLabel || t('world.combat.relicClaimed', null, 'Relic claimed'));
          var equipText = rewardSummary.autoEquipped.length
            ? t('world.combat.equippedRewards', { items: rewardSummary.autoEquipped.join(', ') }, ' Equipped: {items}.')
            : '';
          GameHUD.showNotification(droppedToWorld
            ? t('world.combat.bossLootDropped', { rewards: bossRewardText }, 'Boss defeated! Loot dropped: {rewards}')
            : t('world.combat.bossDefeated', {
              rewards: bossRewardText,
              equipText: equipText
            }, 'Boss defeated! Reward claimed: {rewards}.{equipText}'));
        } else {
          GameHUD.showNotification(rewardSummary.parts.length
            ? (droppedToWorld
              ? t('world.combat.victoryLootDropped', { rewards: rewardSummary.parts.join(', ') }, 'Victory! Loot dropped: {rewards}')
              : t('world.combat.victoryLoot', { rewards: rewardSummary.parts.join(', ') }, 'Victory! Loot collected: {rewards}'))
            : t('world.combat.victory', null, 'Victory!'));
        }
      }
    }

    if (window.GameHUD && GameHUD.hideObjectHpBar) {
      GameHUD.hideObjectHpBar();
    }

    _activeCombat = null;

    var hpContainer = document.getElementById('combat-hp');
    if (hpContainer) {
      hpContainer.classList.remove('show');
      hpContainer.classList.remove('boss-fight');
    }

    var playerHpWrapper = document.getElementById('player-hp-wrapper');
    if (playerHpWrapper) playerHpWrapper.classList.remove('in-combat');
  }

  function scheduleAnimalRespawn(target, balance) {
    if (balance && (balance.noRespawn || balance.isBoss)) return;

    var respawnTime = getEntityRespawnTimeSeconds(balance);
    if (!(respawnTime > 0)) return;

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
      if (window.GameTerrain && GameTerrain.persistObjectState) {
        GameTerrain.persistObjectState(target);
      }
    }

    setTimeout(tryAnimalRespawn, respawnTime * 1000);
  }

  function playerDied() {
    var spawn = GameState.getPlayerSpawnPosition();
    var resourceLossFraction = GameState.getPlayerDeathResourceLossFraction();
    clearProjectiles();
    _manualAttackCooldown = 0;
    GameState.setPlayerHP(GameState.getPlayerMaxHp());
    GamePlayer.setPosition(spawn.x, spawn.z);

    var resources = GameState.getAllResources();
    for (var id in resources) {
      var lost = Math.floor(resources[id] * resourceLossFraction);
      if (lost > 0) GameState.addResource(id, -lost);
    }

    if (window.GameHUD && GameHUD.showNotification) {
      GameHUD.showNotification(t('world.combat.died', { percent: Math.round(resourceLossFraction * 100) }, 'You died! Lost {percent}% resources. Respawned at home.'));
    }
  }

  function updateCombatUI() {
    if (!_activeCombat) return;

    var target = _activeCombat.target;
    var label = document.getElementById('combat-hp-label');
    var fill = document.getElementById('combat-hp-fill');
    var profile = buildWeaponProfile();
    var hpContainer = document.getElementById('combat-hp');
    var balance = GameRegistry.getBalance(target.type) || {};

    if (label && fill) {
      var entity = GameRegistry.getEntity(target.type);
      var name = entity ? entity.name : target.type;
      var rewardPreview = balance.isBoss ? getRewardPreviewText(balance.rewards, balance.bossRewardLabel || target.bossRewardLabel) : '';
      label.textContent = name + ' - ' + Math.max(0, target.hp) + '/' + target.maxHp + ' • ' + profile.weaponName + (rewardPreview ? (' • ' + t('world.combat.rewardPrefix', { reward: rewardPreview }, 'Reward: {reward}')) : '');

      var pct = Math.max(0, target.hp / target.maxHp) * 100;
      fill.style.width = pct + '%';
      fill.className = 'hp-bar-fill ' + (pct > 60 ? 'healthy' : (pct > 30 ? 'hurt' : 'critical'));
    }

    if (hpContainer) {
      hpContainer.classList.toggle('boss-fight', !!balance.isBoss);
    }
  }

  function isActive() {
    return _activeCombat !== null;
  }

  function getTarget() {
    return _activeCombat ? _activeCombat.target : null;
  }

  function getCurrentWeaponProfile() {
    return buildWeaponProfile();
  }

  return {
    startCombat: startCombat,
    canStartCombatWith: canStartCombatWith,
    tryDirectionalAttack: tryDirectionalAttack,
    update: update,
    endCombat: endCombat,
    isActive: isActive,
    getTarget: getTarget,
    getPlayerAttackRange: getPlayerAttackRange,
    getCurrentWeaponProfile: getCurrentWeaponProfile
  };
})();
