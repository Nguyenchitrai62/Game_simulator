window.GameActions = (function () {

  function startBuild(buildingId) {
    BuildingSystem.placeAtPlayer(buildingId);
  }

  function craft(recipeId) {
    var success = CraftSystem.craft(recipeId);

    if (success) {
      var recipeEntity = GameRegistry.getEntity(recipeId);
      GameStorage.save();
      var name = recipeEntity ? recipeEntity.name : recipeId;
      GameHUD.showSuccess(`Crafted: ${name}`);
    }

    GameHUD.renderAll();
    GameHUD.updateModal();
  }

  function equip(equipmentId) {
    GameState.equipItem(equipmentId);
    GameHUD.renderAll();
    GameHUD.updateModal();
    var entity = GameRegistry.getEntity(equipmentId);
    GameHUD.showNotification("Equipped: " + (entity ? entity.name : equipmentId));
  }

  function unequip(slot) {
    GameState.unequipSlot(slot);
    GameHUD.renderAll();
    GameHUD.updateModal();
    GameHUD.showNotification("Unequipped " + slot);
  }

  function saveGame() {
    GameStorage.save();
    GameHUD.showNotification("Game saved!");
  }

  function resetGame() {
    if (!confirm("Reset all progress?")) return;
    GameStorage.clearSave();
    GameState.init();
    GameStorage.save();
    GameHUD.showNotification("Game reset!");
    GameHUD.renderAll();
  }

  function upgrade(buildingId, instanceUid) {
    var check = UpgradeSystem.canUpgrade(buildingId, instanceUid);
    if (!check.can) {
      GameHUD.showError(check.reason || "Cannot upgrade");
      return;
    }

    var newLevel = UpgradeSystem.upgrade(buildingId, instanceUid);
    if (newLevel) {
      var entity = GameRegistry.getEntity(buildingId);
      var buildingName = entity ? entity.name : buildingId;
      GameStorage.save();
      GameHUD.showSuccess(buildingName + " upgraded to Level " + newLevel + "!");
      GameHUD.renderAll();
      GameHUD.closeInspector();
    } else {
      GameHUD.showError("Upgrade failed");
    }
  }

  function collectFromBuilding(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance) {
      GameHUD.showError("Building not found");
      return;
    }
    
    var collected = GameState.collectFromBuilding(instanceUid);
    var hasSomething = false;
    var parts = [];
    
    for (var resId in collected) {
      if (collected[resId] > 0) {
        hasSomething = true;
        var entity = GameRegistry.getEntity(resId);
        var name = entity ? entity.name : resId;
        parts.push("+" + collected[resId] + " " + name);
      }
    }
    
    if (hasSomething) {
      GameStorage.save();
      GameHUD.showSuccess("Đã thu hoạch: " + parts.join(", "));
      GameHUD.renderAll();
      
      // Refresh inspector to show empty storage
      var buildingEntity = GameRegistry.getEntity(instance.entityId);
      if (buildingEntity) {
        GameHUD.selectInstance(instanceUid);
      }
    } else {
      GameHUD.showNotification("Kho trống");
    }
  }

  function advanceAge(ageId) {
    var ageEntity = GameRegistry.getEntity(ageId);
    if (!ageEntity || ageEntity.type !== 'age') {
      GameHUD.showError("Invalid age");
      return;
    }

    var balance = GameRegistry.getBalance(ageId);
    if (!balance || !balance.advanceFrom) {
      GameHUD.showError("Cannot advance to this age");
      return;
    }

    var conditions = balance.advanceFrom;

    // Check age requirement
    if (conditions.age && GameState.getAge() !== conditions.age) {
      GameHUD.showError("Must be in " + conditions.age + " first");
      return;
    }

    // Check resource requirements
    if (conditions.resources) {
      for (var resId in conditions.resources) {
        var needed = conditions.resources[resId];
        if (!GameState.hasResource(resId, needed)) {
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          GameHUD.showError("Need " + needed + " " + resName);
          return;
        }
      }
    }

    // Check building requirements
    if (conditions.buildings) {
      for (var buildingId in conditions.buildings) {
        var needed = conditions.buildings[buildingId];
        var current = GameState.getBuildingCount(buildingId);
        if (current < needed) {
          var buildingEntity = GameRegistry.getEntity(buildingId);
          var buildingName = buildingEntity ? buildingEntity.name : buildingId;
          GameHUD.showError("Need " + needed + " " + buildingName + " (have " + current + ")");
          return;
        }
      }
    }

    // All conditions met - advance age
    GameState.setAge(ageId);
    
    // Add starting resources for new age
    if (balance.startResources) {
      for (var resId in balance.startResources) {
        GameState.addResource(resId, balance.startResources[resId]);
      }
    }

    // Check for newly unlocked content
    UnlockSystem.checkAll();
    UnlockSystem.checkAll(); // Second pass for chain dependencies

    GameStorage.save();
    GameHUD.showSuccess("Advanced to " + ageEntity.name + "!");
    GameHUD.renderAll();
  }

  return {
    startBuild: startBuild,
    craft: craft,
    equip: equip,
    unequip: unequip,
    saveGame: saveGame,
    resetGame: resetGame,
    advanceAge: advanceAge,
    upgrade: upgrade,
    collectFromBuilding: collectFromBuilding,
    researchTech: function(techId) {
      if (!window.ResearchSystem) return;
      if (ResearchSystem.research(techId)) {
        var techEntity = GameRegistry.getEntity(techId);
        GameStorage.save();
        GameHUD.showSuccess('Researched: ' + (techEntity ? techEntity.name : techId));
        GameHUD.renderAll();
      } else {
        GameHUD.showError('Cannot research this technology');
      }
    }
  };
})();

// === GAME INITIALIZATION ===
(function () {
  GameRegistry.init();

  var versionCheck = GameStorage.checkVersion();
  var loaded = false;

  // Force reset if save is from old version (pre-2.0)
  if (GameStorage.hasSave()) {
    if (!versionCheck.match) {
      console.log("[Game] Old save detected (" + versionCheck.saved + "), resetting for v" + versionCheck.current);
      GameStorage.clearSave();
    } else {
      loaded = GameStorage.load();
    }
  }

  if (!loaded) {
    GameState.init();
  }

  GameState.setVersion(window.GAME_MANIFEST.version);

  // Initialize 3D scene
  console.log('[Game] Initializing 3D scene...');
  GameScene.init();

  // Verify scene initialized
  if (!GameScene.getScene()) {
    console.error('[Game] ❌ CRITICAL: 3D Scene failed to initialize!');
    alert('CRITICAL ERROR: 3D rendering failed. Check browser console (F12).');
    return;
  }

  // Initialize terrain with world seed
  var stateExport = GameState.exportState();
  GameTerrain.init(stateExport.worldSeed);

  // Initialize NPC system
  if (typeof NPCSystem !== 'undefined') {
    NPCSystem.init();
  }

  // Initialize player
  var playerData = GameState.getPlayer();
  GamePlayer.init(playerData.x, playerData.z);

  // Initial chunk generation around player
  // (generateChunk already calls createObjectForChunk internally)
  GameTerrain.update(playerData.x, playerData.z);

  // Restore saved building instances (create meshes)
  var instances = GameState.getAllInstances();
  for (var uid in instances) {
    var inst = instances[uid];
    var entity = GameRegistry.getEntity(inst.entityId);
    if (entity) {
      var buildingLevel = inst.level || 1;
      var mesh = BuildingSystem.createBuildingMesh(entity, buildingLevel, false);
      if (mesh) {
        mesh.position.set(inst.x, 0, inst.z);
        mesh.userData.instanceUid = uid;
        GameScene.getScene().add(mesh);
      }
      
      // Spawn NPCs for this building
      if (typeof NPCSystem !== 'undefined' && NPCSystem.spawnWorkersForBuilding) {
        NPCSystem.spawnWorkersForBuilding(uid);
      }
    }
  }

  // Restore tile reservations from saved instances
  BuildingSystem.restoreReservations();

  // Check unlocks (run twice: first pass unlocks basic, second pass unlocks dependents)
  UnlockSystem.checkAll();
  UnlockSystem.checkAll();

  var unlockedList = GameState.getUnlocked();
  console.log("[Game] Unlocked entities: " + unlockedList.length);
  console.log("[Game] Resources: " + JSON.stringify(GameState.getAllResources()));

  // Initialize HUD
  if (typeof GameHUD !== 'undefined' && GameHUD.init) {
    GameHUD.init();
  }

  // Initial render
  if (typeof GameHUD !== 'undefined' && GameHUD.renderAll) {
    GameHUD.renderAll();
  } else {
    console.error('[Game] ❌ CRITICAL: GameHUD not available! Cannot render UI.');
    alert('CRITICAL ERROR: Game UI (HUD) failed to load!\n\nPlease check browser console (F12) for errors.');
  }

  // Mouse move handler - hover detection + build preview
  document.getElementById('game-canvas').addEventListener('mousemove', function (event) {
    // Build preview mode - update ghost position
    if (BuildingSystem.isBuildMode()) {
      var mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, GameScene.getCamera());
      var groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      var target = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, target);
      if (target) {
        BuildingSystem.updateBuildPreview(target.x, target.z);
      }
      return; // Skip hover detection in build mode
    }

    var mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, GameScene.getCamera());

    var intersects = raycaster.intersectObjects(GameScene.getScene().children, true);
    var hoveredUid = null;

    for (var i = 0; i < intersects.length; i++) {
      var obj = intersects[i].object;
      while (obj && !obj.userData.instanceUid) obj = obj.parent;
      if (obj && obj.userData.instanceUid) {
        hoveredUid = obj.userData.instanceUid;
        break;
      }
    }

    GameHUD.setHoveredInstance(hoveredUid);
  });

  // Click handler - build confirm or building selection
  document.getElementById('game-canvas').addEventListener('click', function (event) {
    // Build preview mode - confirm placement
    if (BuildingSystem.isBuildMode()) {
      BuildingSystem.confirmBuild();
      return;
    }

    var mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, GameScene.getCamera());

    var intersects = raycaster.intersectObjects(GameScene.getScene().children, true);

    for (var i = 0; i < intersects.length; i++) {
      var obj = intersects[i].object;
      while (obj && !obj.userData.instanceUid) obj = obj.parent;
      if (obj && obj.userData.instanceUid) {
        GameHUD.selectInstance(obj.userData.instanceUid);
        event.preventDefault();
        return;
      }
    }

    GameHUD.closeInspector();
  });

  // ESC key handler
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (BuildingSystem.isBuildMode()) {
        BuildingSystem.cancelBuild();
      } else {
        GameHUD.closePanels();
        GameHUD.closeInspector();
      }
    }
  });

  console.log("[Game] 3D Evolution Simulator initialized - v" + window.GAME_MANIFEST.version);
  console.log("[Game] Resources: " + GameRegistry.getEntitiesByType("resource").length);
  console.log("[Game] Buildings: " + GameRegistry.getEntitiesByType("building").length);
  console.log("[Game] Animals: " + GameRegistry.getEntitiesByType("animal").length);
  console.log("[Game] Equipment: " + GameRegistry.getEntitiesByType("equipment").length);

  // Save game immediately when page is closing/reloading
  window.addEventListener('beforeunload', function() {
    if (window.GameStorage && window.GameState) {
      GameStorage.save();
    }
  });
})();
