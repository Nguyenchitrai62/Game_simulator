window.GameCombat = (function () {
  var _activeCombat = null;
  var _attackTimer = 0;
  var ATTACK_INTERVAL = 0.5;  // Faster combat - was 1.0

  function startCombat(objData) {
    if (_activeCombat) return;

    var balance = GameRegistry.getBalance(objData.type);
    if (!balance) return;

    // Set max HP from balance if needed
    var entityBalance = GameRegistry.getBalance(objData.type);
    objData.maxHp = entityBalance.hp;
    objData.attack = entityBalance.attack || 0;
    objData.defense = entityBalance.defense || 0;

    _activeCombat = {
      target: objData,
      timer: 0
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

    // Target attacks player
    var targetAtk = target.attack || 0;
    var playerDef = GameState.getPlayerDefense();
    var damageToPlayer = Math.max(0, targetAtk - playerDef);

    if (damageToPlayer > 0) {
      GameState.setPlayerHP(GameState.getPlayer().hp - damageToPlayer);
      var pos = GamePlayer.getPosition();
      GameHUD.showDamageNumber(pos.x, 1.5, pos.z, "-" + damageToPlayer, "damage");

      // Check player death
      if (GameState.getPlayer().hp <= 0) {
        playerDied();
        endCombat(false);
        return;
      }
    }

    // Update HUD
    GameHUD.renderAll();

    // Flash the target mesh
    var mesh = GameEntities.getAllMeshes().find(function (m) {
      return m.userData.objectId === target.id;
    });
    if (mesh) {
      mesh.traverse(function (child) {
        if (child.isMesh && child.material) {
          var origColor = child.material.color.getHex();
          child.material.color.setHex(0xff0000);
          setTimeout(function () { child.material.color.setHex(origColor); }, 100);
        }
      });
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
      }

      // Hide the animal
      GameEntities.hideObject(target);

      // Check for newly unlocked content after combat loot
      UnlockSystem.checkAll();
      GameHUD.renderAll();

      // Respawn
      var respawnTime = balance ? (balance.respawnTime || 60) : 60;
      setTimeout(function () {
        if (target && target._destroyed) {
          target.hp = target.maxHp;
          target._destroyed = false;
          GameEntities.showObject(target);
        }
      }, respawnTime * 1000);

      GameHUD.showNotification("Victory! Loot collected.");
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
