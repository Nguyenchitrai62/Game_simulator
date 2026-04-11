window.GameActions = (function () {

  function startBuild(buildingId) {
    BuildingSystem.enterBuildMode(buildingId);
    GameHUD.closePanels();
  }

  function craft(recipeId) {
    var success = CraftSystem.craft(recipeId);

    if (success) {
      var recipeEntity = GameRegistry.getEntity(recipeId);
      var balance = GameRegistry.getBalance(recipeId);

      // If output is equipment, add to inventory
      if (balance && balance.output) {
        for (var id in balance.output) {
          var entity = GameRegistry.getEntity(id);
          if (entity && entity.type === "equipment") {
            GameState.addToInventory(id, balance.output[id]);
            // Remove from resources (craft output goes to inventory, not resources)
            GameState.addResource(id, -balance.output[id]);
          }
        }
      }

      GameStorage.save();
      var name = recipeEntity ? recipeEntity.name : recipeId;
      GameHUD.showNotification("Crafted: " + name);
    }

    GameHUD.renderAll();
  }

  function equip(equipmentId) {
    GameState.equipItem(equipmentId);
    GameHUD.renderAll();
    var entity = GameRegistry.getEntity(equipmentId);
    GameHUD.showNotification("Equipped: " + (entity ? entity.name : equipmentId));
  }

  function unequip(slot) {
    GameState.unequipSlot(slot);
    GameHUD.renderAll();
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

  // Build mode click handler
  function handleBuildClick(event) {
    if (!BuildingSystem.isBuildMode()) return;
    
    var mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, GameScene.getCamera());

    var groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var target = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, target)) {
      BuildingSystem.placeBuilding(target.x, target.z);
    }
  }

  return {
    startBuild: startBuild,
    craft: craft,
    equip: equip,
    unequip: unequip,
    saveGame: saveGame,
    resetGame: resetGame,
    handleBuildClick: handleBuildClick
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
  GameScene.init();

  // Initialize terrain with world seed
  var stateExport = GameState.exportState();
  GameTerrain.init(stateExport.worldSeed);

  // Initialize player
  var playerData = GameState.getPlayer();
  GamePlayer.init(playerData.x, playerData.z);

  // Initial chunk generation around player
  GameTerrain.update(playerData.x, playerData.z);

  // Create 3D meshes for all loaded chunk objects
  var chunks = GameTerrain.getAllChunks();
  for (var key in chunks) {
    GameEntities.createObjectForChunk(chunks[key]);
  }

  // Restore saved building instances (create meshes)
  var instances = GameState.getAllInstances();
  for (var uid in instances) {
    var inst = instances[uid];
    var entity = GameRegistry.getEntity(inst.entityId);
    if (entity) {
      var mesh = BuildingSystem.createBuildingMesh(entity, false);
      if (mesh) {
        mesh.position.set(inst.x, 0, inst.z);
        mesh.userData.instanceUid = uid;
        GameScene.getScene().add(mesh);
      }
    }
  }

  // Check unlocks (run twice: first pass unlocks basic, second pass unlocks dependents)
  UnlockSystem.checkAll();
  UnlockSystem.checkAll();

  var unlockedList = GameState.getUnlocked();
  console.log("[Game] Unlocked entities: " + unlockedList.length);
  console.log("[Game] Resources: " + JSON.stringify(GameState.getAllResources()));

  // Initial render
  GameHUD.renderAll();

  // Mouse move handler
  document.getElementById('game-canvas').addEventListener('mousemove', function (event) {
    if (BuildingSystem.isBuildMode()) {
      var mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, GameScene.getCamera());

      var groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      var target = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, target)) {
        BuildingSystem.updatePreview(target.x, target.z);
      }
    } else {
      // Check hover on buildings
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
    }
  });
  
  // Click handler
  document.getElementById('game-canvas').addEventListener('click', function (event) {
    if (BuildingSystem.isBuildMode()) {
      GameActions.handleBuildClick(event);
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

  console.log("[Game] 3D Evolution Simulator initialized - v" + window.GAME_MANIFEST.version);
  console.log("[Game] Resources: " + GameRegistry.getEntitiesByType("resource").length);
  console.log("[Game] Buildings: " + GameRegistry.getEntitiesByType("building").length);
  console.log("[Game] Animals: " + GameRegistry.getEntitiesByType("animal").length);
  console.log("[Game] Equipment: " + GameRegistry.getEntitiesByType("equipment").length);
})();
