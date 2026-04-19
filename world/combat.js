window.GameCombat = (function () {
  var _activeCombat = null;

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
    profile.hitColor = profile.hitColor !== undefined ? profile.hitColor : 0xff4444;
    return profile;
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
    return getDistanceToTarget(objData) <= Math.max(profile.engageRange, profile.attackRange);
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

  function update(dt) {
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

    if (distanceToTarget <= profile.attackRange) {
      _activeCombat.playerAttackTimer += dt;
      if (_activeCombat.playerAttackTimer >= profile.attackIntervalSeconds) {
        _activeCombat.playerAttackTimer = 0;
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

  function performPlayerAttack(target, balance, profile) {
    var playerAttack = GameState.getPlayerAttack();
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

      var rewardSummary = grantRewardMap(target.worldX, target.worldZ, balance.rewards);
      if (typeof ParticleSystem !== 'undefined') {
        if (rewardSummary.parts.length) {
          ParticleSystem.emit('loot', { x: target.worldX, y: 1.0, z: target.worldZ });
        }
        if (balance.isBoss) {
          ParticleSystem.emit('spark', { x: target.worldX, y: 1.0, z: target.worldZ }, { color: 0xffd166, spread: 0.2, count: 10, size: 0.06 });
        }
        ParticleSystem.emit('deathBurst', { x: target.worldX, y: 0.5, z: target.worldZ });
      }

      if (window.GameEntities && GameEntities.hideObject) {
        GameEntities.hideObject(target);
      }
      if (window.GameTerrain && GameTerrain.persistObjectState) {
        GameTerrain.persistObjectState(target);
      }

      if (window.UnlockSystem && UnlockSystem.checkAll) UnlockSystem.checkAll();
      if (window.GameHUD && GameHUD.renderAll) GameHUD.renderAll();

      scheduleAnimalRespawn(target, balance);

      if (window.GameHUD && GameHUD.showNotification) {
        if (balance.isBoss) {
          var bossRewardText = rewardSummary.parts.length ? rewardSummary.parts.join(', ') : (balance.bossRewardLabel || t('world.combat.relicClaimed', null, 'Relic claimed'));
          var equipText = rewardSummary.autoEquipped.length
            ? t('world.combat.equippedRewards', { items: rewardSummary.autoEquipped.join(', ') }, ' Equipped: {items}.')
            : '';
          GameHUD.showNotification(t('world.combat.bossDefeated', {
            rewards: bossRewardText,
            equipText: equipText
          }, 'Boss defeated! Reward claimed: {rewards}.{equipText}'));
        } else {
          GameHUD.showNotification(rewardSummary.parts.length
            ? t('world.combat.victoryLoot', { rewards: rewardSummary.parts.join(', ') }, 'Victory! Loot collected: {rewards}')
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
    update: update,
    endCombat: endCombat,
    isActive: isActive,
    getTarget: getTarget,
    getPlayerAttackRange: getPlayerAttackRange,
    getCurrentWeaponProfile: getCurrentWeaponProfile
  };
})();
