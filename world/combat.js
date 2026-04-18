window.GameCombat = (function () {
  var _activeCombat = null;
  var _attackTimer = 0;
  var ATTACK_INTERVAL = 0.5;  // Faster combat - was 1.0

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

  function startCombat(objData) {
    if (_activeCombat) return;

    var balance = GameRegistry.getBalance(objData.type);
    if (!balance) return;

    // Set max HP from balance if needed
    var entityBalance = balance;
    objData.maxHp = entityBalance.hp;
    objData.attack = entityBalance.attack || 0;
    objData.defense = entityBalance.defense || 0;

    _activeCombat = {
      target: objData,
      timer: 0,
      targetMesh: getTargetMesh(objData)
    };

    // Show combat HP bar
    var hpContainer = document.getElementById("combat-hp");
    if (hpContainer) hpContainer.classList.add("show");

    // Show player HP bar in combat mode
    var playerHpWrapper = document.getElementById("player-hp-wrapper");
    if (playerHpWrapper) playerHpWrapper.classList.add("in-combat");

    updateCombatUI();
  }

  function update(dt) {
    if (!_activeCombat) return;

    var target = _activeCombat.target;

    // Check if target is dead
    if (target.hp <= 0) {
      endCombat(true);
      return;
    }

    // Check if player moved away
    var playerPos = GamePlayer.getPosition();
    var dx = target.worldX - playerPos.x;
    var dz = target.worldZ - playerPos.z;
    var dist = Math.sqrt(dx * dx + dz * dz);

    var targetMesh = getTargetMesh(target);
    if (targetMesh) {
      var desiredAngle = Math.atan2(playerPos.x - target.worldX, playerPos.z - target.worldZ);
      var angleDiff = desiredAngle - targetMesh.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      targetMesh.rotation.y += angleDiff * 0.28;
    }

    if (dist > 3) {
      endCombat(false);
      return;
    }

    _activeCombat.timer += dt;
    if (_activeCombat.timer >= ATTACK_INTERVAL) {
      _activeCombat.timer = 0;
      doAttackRound(target);
    }

    updateCombatUI();
  }

  function doAttackRound(target) {
    // Player attacks target
    var playerAtk = GameState.getPlayerAttack();
    var targetDef = target.defense || 0;
    var damageToTarget = Math.max(1, playerAtk - targetDef);
    target.hp -= damageToTarget;

    GameHUD.showDamageNumber(target.worldX, 1.0, target.worldZ, "-" + damageToTarget, "damage");

    if (target.hp <= 0) {
      target.hp = 0;
      GameHUD.renderAll();
      endCombat(true);
      return;
    }

    // Target attacks player
    var targetAtk = target.attack || 0;
    var playerDef = GameState.getPlayerDefense();
    var damageToPlayer = Math.max(0, targetAtk - playerDef);

    if (damageToPlayer > 0) {
      GameState.setPlayerHP(GameState.getPlayer().hp - damageToPlayer);
      var pos = GamePlayer.getPosition();
      GameHUD.showDamageNumber(pos.x, 1.5, pos.z, "-" + damageToPlayer, "enemy-damage");

      // Player damage flash
      if (typeof AnimationSystem !== 'undefined') {
        AnimationSystem.flashScreen('rgba(255,0,0,0.15)', 200);
      }

      // Check player death
      if (GameState.getPlayer().hp <= 0) {
        playerDied();
        endCombat(false);
        return;
      }
    } else if (targetAtk > 0) {
      // Show blocked when enemy attacks but deals 0 damage
      var pos = GamePlayer.getPosition();
      GameHUD.showDamageNumber(pos.x, 1.5, pos.z, "BLOCKED", "blocked");
    }

    // Update HUD
    GameHUD.renderAll();

    // Flash the target mesh - enhanced duration (250ms)
    var mesh = getTargetMesh(target);
    if (mesh) {
      var flashedMaterials = [];
      mesh.traverse(function (child) {
        if (child.isMesh && child.material) {
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
        }
      });
      // Scale pulse effect
      var origScaleX = mesh.scale.x;
      var origScaleZ = mesh.scale.z;
      mesh.scale.x = origScaleX * 1.08;
      mesh.scale.z = origScaleZ * 1.08;
      setTimeout(function () {
        if (mesh) {
          mesh.scale.x = origScaleX;
          mesh.scale.z = origScaleZ;
        }
      }, 150);
    }

    // Combat particles
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.emit('combatHit', {x: target.worldX, y: 0.5, z: target.worldZ});
      if (damageToPlayer > 0) {
        var pos = GamePlayer.getPosition();
        ParticleSystem.emit('combatHit', {x: pos.x, y: 1.0, z: pos.z}, {color: 0xFF4444});
      }
      if (damageToPlayer === 0 && targetAtk > 0) {
        var pos = GamePlayer.getPosition();
        ParticleSystem.emit('combatBlock', {x: pos.x, y: 1.0, z: pos.z});
      }
    }
  }

  function endCombat(playerWon) {
    if (!_activeCombat) return;

    var target = _activeCombat.target;
    var balance = GameRegistry.getBalance(target.type);

    if (playerWon && target.hp <= 0 && !target._destroyed) {
      target._destroyed = true;

      // Give rewards
      if (balance && balance.rewards) {
        for (var resId in balance.rewards) {
          var amount = balance.rewards[resId];
          GameState.addResource(resId, amount);
          var entity = GameRegistry.getEntity(resId);
          var name = entity ? entity.name : resId;
          GameHUD.showDamageNumber(target.worldX, 1.5, target.worldZ, "+" + amount + " " + name, "loot");
        }
        // Loot particles
        if (typeof ParticleSystem !== 'undefined') {
          ParticleSystem.emit('loot', {x: target.worldX, y: 1.0, z: target.worldZ});
        }
      }

      // Hide the animal with death effect
      GameEntities.hideObject(target);

      // Death burst particles
      if (typeof ParticleSystem !== 'undefined') {
        ParticleSystem.emit('deathBurst', {x: target.worldX, y: 0.5, z: target.worldZ});
      }

      // Check for newly unlocked content after combat loot
      UnlockSystem.checkAll();
      GameHUD.renderAll();

      // Respawn with player collision check
      var respawnTime = balance ? (balance.respawnTime || 60) : 60;
      function tryAnimalRespawn() {
        if (!target || !target._destroyed) return;

        var relocated = false;
        if (window.GameTerrain && GameTerrain.relocateRespawnedAnimal) {
          relocated = GameTerrain.relocateRespawnedAnimal(target);
        }

        // Check if player is too close when no new spawn point was found
        if (!relocated && window.GamePlayer) {
          var playerPos = GamePlayer.getPosition();
          var dx = Math.abs(target.worldX - playerPos.x);
          var dz = Math.abs(target.worldZ - playerPos.z);
          if (dx < 2 && dz < 2) {
            setTimeout(tryAnimalRespawn, 5000);
            return;
          }
        }
        target.hp = target.maxHp || (balance ? balance.hp : 1) || 1;
        target._destroyed = false;
        target.respawnAt = 0;
        GameEntities.showObject(target);
      }
      setTimeout(tryAnimalRespawn, respawnTime * 1000);

      GameHUD.showNotification("Victory! Loot collected.");
    }

    if (playerWon && target.hp <= 0 && GameHUD.hideObjectHpBar) {
      GameHUD.hideObjectHpBar();
    }

    _activeCombat = null;

    // Hide combat HP bar
    var hpContainer = document.getElementById("combat-hp");
    if (hpContainer) hpContainer.classList.remove("show");

    // Remove combat mode from player HP bar
    var playerHpWrapper = document.getElementById("player-hp-wrapper");
    if (playerHpWrapper) playerHpWrapper.classList.remove("in-combat");
  }

  function playerDied() {
    GameState.setPlayerHP(GameState.getPlayerMaxHp());
    GamePlayer.setPosition(8, 8);

    // Lose some resources
    var resources = GameState.getAllResources();
    for (var id in resources) {
      var lost = Math.floor(resources[id] * 0.3);
      if (lost > 0) GameState.addResource(id, -lost);
    }

    GameHUD.showNotification("You died! Lost 30% resources. Respawned at home.");
  }

  function updateCombatUI() {
    if (!_activeCombat) return;

    var target = _activeCombat.target;
    var label = document.getElementById("combat-hp-label");
    var fill = document.getElementById("combat-hp-fill");

    if (label && fill) {
      var entity = GameRegistry.getEntity(target.type);
      var name = entity ? entity.name : target.type;
      label.textContent = name + " - " + Math.max(0, target.hp) + "/" + target.maxHp;

      var pct = Math.max(0, target.hp / target.maxHp) * 100;
      fill.style.width = pct + "%";
      fill.className = "hp-bar-fill " + (pct > 60 ? "healthy" : pct > 30 ? "hurt" : "");
    }
  }

  function isActive() { return _activeCombat !== null; }

  function getTarget() {
    return _activeCombat ? _activeCombat.target : null;
  }

  return {
    startCombat: startCombat,
    update: update,
    endCombat: endCombat,
    isActive: isActive,
    getTarget: getTarget
  };
})();
