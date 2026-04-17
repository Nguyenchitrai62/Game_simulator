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
      if (typeof GamePlayer !== 'undefined' && GamePlayer.updateEquipmentVisuals) {
        GamePlayer.updateEquipmentVisuals();
      }
    }

    GameHUD.renderAll();
    GameHUD.updateModal();
  }

  function equip(equipmentId) {
    GameState.equipItem(equipmentId);
    GameHUD.renderAll();
    GameHUD.updateModal();
    if (typeof GamePlayer !== 'undefined' && GamePlayer.updateEquipmentVisuals) {
      GamePlayer.updateEquipmentVisuals();
    }
  }

  function unequip(slot) {
    GameState.unequipSlot(slot);
    GameHUD.renderAll();
    GameHUD.updateModal();
    if (typeof GamePlayer !== 'undefined' && GamePlayer.updateEquipmentVisuals) {
      GamePlayer.updateEquipmentVisuals();
    }
  }

  function saveGame() {
    GameStorage.save();
    GameHUD.showNotification("Saved now. Autosave remains active.");
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
      GameHUD.selectInstance(instanceUid);
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
      GameHUD.showSuccess("Collected: " + parts.join(", "));
      GameHUD.renderAll();
      
      // Refresh inspector to show empty storage
      var buildingEntity = GameRegistry.getEntity(instance.entityId);
      if (buildingEntity) {
        GameHUD.selectInstance(instanceUid);
      }
    } else {
      GameHUD.showNotification("Storage is empty.");
    }
  }

  function refuel(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    if (!instance) return;

    var balance = GameRegistry.getBalance(instance.entityId);
    if (!balance || !balance.refuelCost) return;

    var fuelData = GameState.getFireFuelData ? GameState.getFireFuelData(instanceUid) : null;
    var maxFuel = balance.fuelCapacity || 999;
    var currentFuel = fuelData ? fuelData.current : maxFuel;
    if (currentFuel >= maxFuel) {
      GameHUD.showNotification("Fuel is already full.");
      return;
    }

    // Check if can afford refuel
    for (var resId in balance.refuelCost) {
      if (!GameState.hasSpendableResource(resId, balance.refuelCost[resId])) {
        GameHUD.showError("Not enough fuel.");
        return;
      }
    }

    // Deduct refuel cost
    for (var resId in balance.refuelCost) {
      GameState.consumeSpendableResource(resId, balance.refuelCost[resId]);
    }

    // Add fuel
    var refillAmount = maxFuel - currentFuel;
    if (GameState.addFireFuel) {
      GameState.addFireFuel(instanceUid, refillAmount);
    }

    GameStorage.save();
    GameHUD.showSuccess("Refueled successfully.");
    GameHUD.renderAll();
    GameHUD.selectInstance(instanceUid);
  }

  function isFarmPlot(instance) {
    if (!instance) return false;
    var balance = GameRegistry.getBalance(instance.entityId);
    return !!(balance && balance.farming);
  }

  function getFarmConfig(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    var balance = instance ? GameRegistry.getBalance(instance.entityId) : null;
    return balance && balance.farming ? balance.farming : null;
  }

  function getFarmWorkerHint(instanceUid, farming) {
    if (farming && farming.workerHint) return farming.workerHint;
    return 'Needs a nearby resident worker.';
  }

  function formatYieldMap(yieldMap) {
    if (!yieldMap) return '';

    var parts = [];
    for (var resId in yieldMap) {
      var entity = GameRegistry.getEntity(resId);
      parts.push(yieldMap[resId] + ' ' + (entity ? entity.name : resId));
    }

    return parts.join(', ');
  }

  function cloneYieldMap(yieldMap) {
    var copy = {};
    if (!yieldMap) return copy;
    for (var resId in yieldMap) {
      copy[resId] = yieldMap[resId];
    }
    return copy;
  }

  function scaleYieldMap(yieldMap, multiplier) {
    var scaled = {};
    multiplier = multiplier || 1;
    if (!yieldMap) return scaled;

    for (var resId in yieldMap) {
      var amount = yieldMap[resId] || 0;
      if (amount <= 0) continue;
      scaled[resId] = Math.max(1, Math.round(amount * multiplier));
    }

    return scaled;
  }

  function findNearbyRiverSource(instance, rangeOverride, boostRadiusOverride) {
    if (!instance || typeof WaterSystem === 'undefined' || !WaterSystem.isWaterTile) return null;

    var searchRadius = Math.max(0, rangeOverride || 0);
    if (searchRadius <= 0) return null;

    var boostRadius = Math.max(0, boostRadiusOverride || 0);
    var nearest = null;
    var minX = Math.floor(instance.x - searchRadius);
    var maxX = Math.ceil(instance.x + searchRadius);
    var minZ = Math.floor(instance.z - searchRadius);
    var maxZ = Math.ceil(instance.z + searchRadius);

    for (var wx = minX; wx <= maxX; wx++) {
      for (var wz = minZ; wz <= maxZ; wz++) {
        if (!WaterSystem.isWaterTile(wx, wz)) continue;

        var dx = wx - instance.x;
        var dz = wz - instance.z;
        var distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > searchRadius) continue;

        if (!nearest || distance < nearest.distance) {
          nearest = {
            type: 'river',
            sourceX: wx,
            sourceZ: wz,
            distance: distance,
            boosted: boostRadius > 0 && distance <= boostRadius
          };
        }
      }
    }

    return nearest;
  }

  function findSupportingWell(instance, rangeOverride) {
    if (!instance) return null;

    var instances = GameState.getAllInstances();
    var bestWell = null;
    var bestDistance = Infinity;

    for (var uid in instances) {
      var candidate = instances[uid];
      if (!candidate || candidate.entityId !== 'building.well') continue;

      var balance = GameRegistry.getBalance(candidate.entityId) || {};
      var supportRange = rangeOverride || balance.waterRadius || 0;
      if (supportRange <= 0) continue;

      var dx = candidate.x - instance.x;
      var dz = candidate.z - instance.z;
      var distance = Math.sqrt(dx * dx + dz * dz);
      if (distance <= supportRange && distance < bestDistance) {
        bestDistance = distance;
        bestWell = candidate;
      }
    }

    return bestWell;
  }

  function getFarmWaterSupport(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    var farming = getFarmConfig(instanceUid);
    if (!isFarmPlot(instance) || !farming) {
      return {
        type: null,
        boosted: false,
        label: 'No nearby water source',
        sourceX: null,
        sourceZ: null,
        sourceUid: null,
        distance: Infinity
      };
    }

    var riverSource = findNearbyRiverSource(instance, farming.waterSearchRadius || farming.wellRange || 0, farming.riverBoostRadius || 0);
    if (riverSource) {
      riverSource.label = riverSource.boosted ? 'River boost active' : 'River in worker range';
      riverSource.sourceUid = null;
      return riverSource;
    }

    var supportWell = findSupportingWell(instance, farming.wellRange || farming.waterSearchRadius);
    if (supportWell) {
      var dx = supportWell.x - instance.x;
      var dz = supportWell.z - instance.z;
      return {
        type: 'well',
        boosted: false,
        label: 'Well in worker range',
        sourceX: supportWell.x,
        sourceZ: supportWell.z,
        sourceUid: supportWell.uid,
        distance: Math.sqrt(dx * dx + dz * dz)
      };
    }

    return {
      type: null,
      boosted: false,
      label: 'No nearby water source',
      sourceX: null,
      sourceZ: null,
      sourceUid: null,
      distance: Infinity
    };
  }

  function getFarmGrowthSeconds(instanceUid, farmStateOverride) {
    var farming = getFarmConfig(instanceUid);
    if (!farming) return 1;

    var farmState = farmStateOverride || GameState.getFarmState(instanceUid) || {};
    if (farmState.watered) {
      if (farmState.riverBoosted && farming.riverGrowthSeconds) {
        return Math.max(1, farming.riverGrowthSeconds);
      }
      return Math.max(1, farming.wateredGrowthSeconds || farming.dryGrowthSeconds || 1);
    }

    return Math.max(1, farming.dryGrowthSeconds || 1);
  }

  function getFarmYieldMap(instanceUid, farmStateOverride) {
    var farming = getFarmConfig(instanceUid);
    if (!farming) return {};

    var farmState = farmStateOverride || GameState.getFarmState(instanceUid) || {};
    if (farmState.watered) {
      if (farmState.riverBoosted) {
        if (farming.riverYield) return cloneYieldMap(farming.riverYield);
        if (farming.riverYieldMultiplier) return scaleYieldMap(farming.wateredYield, farming.riverYieldMultiplier);
      }
      return cloneYieldMap(farming.wateredYield);
    }

    return cloneYieldMap(farming.dryYield);
  }

  function getStoredResourceSummary(instanceUid) {
    var storage = GameState.getBuildingStorage(instanceUid);
    var totalAmount = 0;
    var parts = [];

    for (var resId in storage) {
      var amount = storage[resId] || 0;
      if (amount <= 0) continue;
      totalAmount += amount;
      var entity = GameRegistry.getEntity(resId);
      parts.push(amount + ' ' + (entity ? entity.name : resId));
    }

    return {
      totalAmount: totalAmount,
      text: parts.join(', ')
    };
  }

  function getFarmPlotStatus(instanceUid) {
    var instance = GameState.getInstance(instanceUid);
    var farming = getFarmConfig(instanceUid);
    if (!isFarmPlot(instance) || !farming) return null;

    var farmState = GameState.getFarmState(instanceUid) || { planted: false, watered: false, ready: false, progress: 0, waterSourceType: null, riverBoosted: false };
    var progressPercent = Math.max(0, Math.min(100, Math.floor((farmState.progress || 0) * 100)));
    var cropName = farming.cropName || 'Crop';
    var plotEntity = GameRegistry.getEntity(instance.entityId);
    var plotName = plotEntity ? plotEntity.name : 'Farm Plot';
    var support = getFarmWaterSupport(instanceUid);
    if (farmState.watered && !support.type && farmState.waterSourceType) {
      support = {
        type: farmState.waterSourceType,
        boosted: !!farmState.riverBoosted,
        label: farmState.riverBoosted ? 'River boost applied' : (farmState.waterSourceType === 'river' ? 'River water applied' : 'Well water applied'),
        sourceX: null,
        sourceZ: null,
        sourceUid: null,
        distance: Infinity
      };
    }

    var hasWaterSupport = !!support.type;
    var workerStatus = (window.NPCSystem && NPCSystem.getFarmWorkerStatus) ? NPCSystem.getFarmWorkerStatus(instanceUid) : null;
    var hasWorkerSupport = !!workerStatus;
    var currentYieldMap = getFarmYieldMap(instanceUid, farmState);
    var storedSummary = getStoredResourceSummary(instanceUid);
    var currentYieldText = formatYieldMap(currentYieldMap);
    var dryYieldText = formatYieldMap(farming.dryYield);
    var wateredYieldText = formatYieldMap(farming.wateredYield);
    var riverYieldText = formatYieldMap(farming.riverYield || getFarmYieldMap(instanceUid, { watered: true, riverBoosted: true }));
    var growthSeconds = getFarmGrowthSeconds(instanceUid, farmState);
    var workerHint = getFarmWorkerHint(instanceUid, farming);
    var statusText = 'Idle';
    var action = storedSummary.totalAmount > 0 ? 'collect' : 'auto';
    var actionLabel = storedSummary.totalAmount > 0 ? 'Collect' : 'Auto';
    var detailText = workerHint;

    if (farmState.planted && farmState.ready) {
      statusText = 'Ready';
      detailText = 'Worker is about to harvest ' + currentYieldText + '.';
    } else if (farmState.planted && farmState.watered) {
      statusText = farmState.riverBoosted ? 'River-fed' : 'Watered';
      detailText = 'Growing ' + progressPercent + '% • ' + growthSeconds + 's cycle • ' + currentYieldText;
    } else if (farmState.planted) {
      statusText = hasWaterSupport ? 'Needs Water' : 'Dry';
      detailText = hasWaterSupport ? ('Waiting for water • ' + progressPercent + '%') : ('No water source • ' + progressPercent + '%');
    } else if (hasWorkerSupport) {
      detailText = 'Nearby resident will plant automatically.';
    } else {
      statusText = 'Needs Worker';
    }

    if (workerStatus && workerStatus.text) {
      detailText = workerStatus.text;
      if (farmState.planted && !farmState.ready) {
        detailText += ' • ' + progressPercent + '%';
      }
    } else if (!hasWorkerSupport && storedSummary.totalAmount <= 0) {
      if (farmState.ready) {
        detailText = cropName + ' is ready, but ' + workerHint.toLowerCase();
      } else if (farmState.planted) {
        detailText = cropName + ' is waiting for worker support.';
      }
    }

    return {
      uid: instanceUid,
      plotName: plotName,
      cropName: cropName,
      planted: !!farmState.planted,
      watered: !!farmState.watered,
      ready: !!farmState.ready,
      progress: farmState.progress || 0,
      progressPercent: progressPercent,
      waterSourceType: farmState.waterSourceType || null,
      riverBoosted: !!farmState.riverBoosted,
      statusText: statusText,
      action: action,
      actionLabel: actionLabel,
      detailText: detailText,
      canPlant: false,
      canWater: false,
      canHarvest: false,
      hasWorkerSupport: hasWorkerSupport,
      hasWaterSupport: hasWaterSupport,
      supportSourceType: support.type,
      supportSourceName: support.label,
      dryYieldText: dryYieldText,
      wateredYieldText: wateredYieldText,
      riverYieldText: riverYieldText,
      currentYieldText: currentYieldText,
      growthSeconds: growthSeconds,
      workerHint: workerHint,
      storedAmount: storedSummary.totalAmount,
      storedSummaryText: storedSummary.text,
      workerStatusText: workerStatus ? workerStatus.text : workerHint
    };
  }

  function plantCrop(instanceUid) {
    GameHUD.showNotification('Residents handle planting automatically.');
    return false;
  }

  function waterCrop(instanceUid) {
    GameHUD.showNotification('Residents fetch water automatically.');
    return false;
  }

  function harvestCrop(instanceUid) {
    GameHUD.showNotification('Residents harvest crops automatically.');
    return false;
  }

  function interactWithFarmPlot(instanceUid) {
    var storedSummary = getStoredResourceSummary(instanceUid);
    if (storedSummary.totalAmount > 0) {
      collectFromBuilding(instanceUid);
      return true;
    }

    var status = getFarmPlotStatus(instanceUid);
    if (!status) return false;

    GameHUD.showNotification(status.detailText || 'Worker is tending this plot.');
    return false;
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
        if (!GameState.hasSpendableResource(resId, needed)) {
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
    refuel: refuel,
    getFarmWaterSupport: getFarmWaterSupport,
    getFarmGrowthSeconds: getFarmGrowthSeconds,
    getFarmYieldMap: getFarmYieldMap,
    getFarmPlotStatus: getFarmPlotStatus,
    interactWithFarmPlot: interactWithFarmPlot,
    plantCrop: plantCrop,
    waterCrop: waterCrop,
    harvestCrop: harvestCrop,
    researchTech: function(techId) {
      if (!window.ResearchSystem) return;
      if (ResearchSystem.research(techId)) {
        var techEntity = GameRegistry.getEntity(techId);
        GameStorage.save();
        GameHUD.showSuccess('Researched: ' + (techEntity ? techEntity.name : techId));
        GameHUD.renderAll();
        GameHUD.updateModal();
      } else {
        GameHUD.showError('Cannot research this technology');
      }
    }
  };
})();

// === GAME INITIALIZATION ===
(function () {
  function setLoadProgress(pct, text) {
    var bar = document.getElementById('loading-bar');
    var txt = document.getElementById('loading-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = text || 'Loading...';
  }

  setLoadProgress(5, 'Initializing registry...');
  GameRegistry.init();

  setLoadProgress(15, 'Checking save data...');
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

  setLoadProgress(25, 'Loading 3D...');

  GameScene.init();

  if (!GameScene.getScene()) {
    console.error('[Game] FAILED: 3D Scene failed to initialize!');
    var ls = document.getElementById('loading-screen');
    if (ls) ls.innerHTML = '<div style="color:#ff4444;font-family:monospace;font-size:16px;">ERROR: 3D rendering failed.<br>Check browser console (F12).</div>';
    return;
  }

  setLoadProgress(35, 'Loading terrain...');
  var stateExport = GameState.exportState();
  GameTerrain.init(stateExport.worldSeed);

  // Initialize NPC system
  if (typeof NPCSystem !== 'undefined') {
    NPCSystem.init();
  }

  // Initialize player
  var playerData = GameState.getPlayer();
  GamePlayer.init(playerData.x, playerData.z);

  setLoadProgress(50, 'Spawning world...');
  GameTerrain.update(playerData.x, playerData.z);

  setLoadProgress(60, 'Restoring buildings...');
  var instances = GameState.getAllInstances();
  for (var uid in instances) {
    var inst = instances[uid];
    var entity = GameRegistry.getEntity(inst.entityId);
    if (entity) {
      var buildingLevel = inst.level || 1;
      var mesh = BuildingSystem.createBuildingMesh(entity, buildingLevel, false, inst);
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

  setLoadProgress(70, 'Starting systems...');

  var savedState = GameState.exportState();
  if (typeof DayNightSystem !== 'undefined') {
    DayNightSystem.init();
    if (savedState.timeOfDay !== undefined) {
      DayNightSystem.setTimeOfDay(savedState.timeOfDay);
    }
  }

  // Initialize fire system
  if (typeof FireSystem !== 'undefined') {
    FireSystem.init();
  }

  // Initialize atmosphere system (wind, stars, moon, clouds)
  if (typeof AtmosphereSystem !== 'undefined') {
    AtmosphereSystem.init();
  }

  // Initialize particle system
  if (typeof ParticleSystem !== 'undefined') {
    ParticleSystem.init();
  }

  // Initialize weather system
  if (typeof WeatherSystem !== 'undefined') {
    WeatherSystem.init();
  }

  // Initialize minimap
  if (typeof MiniMap !== 'undefined') {
    MiniMap.init();
  }

  setLoadProgress(85, 'Unlocking content...');
  UnlockSystem.checkAll();
  UnlockSystem.checkAll();

  var unlockedList = GameState.getUnlocked();
  console.log("[Game] Unlocked entities: " + unlockedList.length);
  console.log("[Game] Resources: " + JSON.stringify(GameState.getAllResources()));

  setLoadProgress(95, 'Loading UI...');
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

  // Apply initial equipment visuals
  if (typeof GamePlayer !== 'undefined' && GamePlayer.updateEquipmentVisuals) {
    GamePlayer.updateEquipmentVisuals();
  }

  setLoadProgress(100, 'Ready!');

  setTimeout(function() {
    var ls = document.getElementById('loading-screen');
    if (ls) {
      ls.style.opacity = '0';
      setTimeout(function() { ls.style.display = 'none'; }, 800);
    }
  }, 300);

  var _lastBuildingActionClick = { uid: null, time: 0 };

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
        var instanceUid = obj.userData.instanceUid;
        var now = Date.now();
        var storage = GameState.getBuildingStorage(instanceUid) || {};
        var hasResources = false;
        for (var resId in storage) {
          if (storage[resId] > 0) {
            hasResources = true;
            break;
          }
        }

        var instance = GameState.getInstance(instanceUid);
        var balance = instance ? (GameRegistry.getBalance(instance.entityId) || {}) : null;
        var fuelData = GameState.getFireFuelData ? GameState.getFireFuelData(instanceUid) : null;
        var maxFuel = balance && balance.fuelCapacity ? balance.fuelCapacity : 0;
        var currentFuel = fuelData ? fuelData.current : maxFuel;
        var canQuickRefuel = !!(balance && balance.refuelCost && currentFuel < maxFuel);

        if (_lastBuildingActionClick.uid === instanceUid && (now - _lastBuildingActionClick.time) < 400) {
          if (hasResources) {
            GameActions.collectFromBuilding(instanceUid);
            _lastBuildingActionClick.uid = null;
            _lastBuildingActionClick.time = 0;
            event.preventDefault();
            return;
          }

          if (canQuickRefuel) {
            GameActions.refuel(instanceUid);
            _lastBuildingActionClick.uid = null;
            _lastBuildingActionClick.time = 0;
            event.preventDefault();
            return;
          }
        }

        _lastBuildingActionClick.uid = instanceUid;
        _lastBuildingActionClick.time = now;
        GameHUD.selectInstance(instanceUid);
        event.preventDefault();
        return;
      }
    }

    _lastBuildingActionClick.uid = null;
    _lastBuildingActionClick.time = 0;
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
