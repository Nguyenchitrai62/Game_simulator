window.GamePlayer = (function () {
  var mesh;
  var _initialSpawnPosition = (window.GameState && GameState.getPlayerSpawnPosition) ? GameState.getPlayerSpawnPosition() : { x: 0, z: 0 };
  var _x = _initialSpawnPosition.x, _z = _initialSpawnPosition.z;
  var _moving = false;
  var _direction = { x: 0, z: 1 };
  var _keys = {};
  var _animTime = 0;
  var _visualAnimTime = 0;
  var _lastCombatTime = 0;
  var _regenAccumulator = 0;

  // Eating state - MANUAL only, press F to eat
  var _isEating = false;
  var _eatTimer = 0;

  // Handheld torch state
  var _torchActive = false;
  var _torchFuel = 0;
  var _torchMesh = null; // 3D torch visible on hand
  var _torchWorldPos = null;

  // Equipment 3D visuals
  var _weaponMesh = null;
  var _shieldMesh = null;
  var _rightArmObject = null;
  var _contextRefreshAccumulator = 0;
  var _lastContextQueryPos = { x: Infinity, z: Infinity };

  // === TUTORIAL SYSTEM ===
  var _tutState = (function() {
    try { return JSON.parse(localStorage.getItem('evolution_tutorial_v1') || '{}'); } catch(e) { return {}; }
  })();
  _tutState.seenResources = _tutState.seenResources || {};
  var _tutBubbleEl = null, _tutBubbleTextEl = null, _tutBubbleArrowEl = null;
  var _tutKey = null;
  var _tutScreenPt = {};
  var _speechScanScreenPt = {};
  var _directionTargetScreenPt = {};
  var _runtimeSpeech = null;
  var _worldSpeechEl = null, _worldSpeechTextEl = null;
  var _worldSpeechScreenPt = {};
  var _worldSpeech = null;
  var _threatTauntCooldown = 0;
  var _threatTauntScanTimer = 0;
  var _threatSession = null;
  var _resourceDiscoveryTimer = 0;
  var _tutLagTimer = 0;
  var _tutLagRecoveryTimer = 0;
  var _tutLagAudioActive = false;
  var _tutNightTimer = 0;
  var _repeatableTutArmed = { eat: true };
  var _tutLastNearNode = false; // set by updateContextAction each refresh
  var _clickMouseNdc = null;
  var _clickRaycaster = null;

  function updateClickRaycaster(clientX, clientY) {
    if (!_clickMouseNdc && typeof THREE !== 'undefined') {
      _clickMouseNdc = new THREE.Vector2();
    }
    if (!_clickRaycaster && typeof THREE !== 'undefined') {
      _clickRaycaster = new THREE.Raycaster();
    }
    if (!_clickMouseNdc || !_clickRaycaster) return null;

    _clickMouseNdc.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    _clickRaycaster.setFromCamera(_clickMouseNdc, GameScene.getCamera());
    return _clickRaycaster;
  }

  function getSmoothingFactor(dt, strength) {
    if (!(dt > 0) || !isFinite(dt)) return 1;
    return 1 - Math.exp(-strength * dt);
  }

  function dampValue(current, target, alpha) {
    return current + (target - current) * alpha;
  }

  function getConfiguredPositiveNumber(value) {
    var number = Number(value);
    return number > 0 ? number : null;
  }

  function getConfiguredNonNegativeNumber(value) {
    var number = Number(value);
    return number >= 0 ? number : null;
  }

  function getPlayerSpawnFallbackPosition() {
    return (window.GameState && GameState.getPlayerSpawnPosition) ? GameState.getPlayerSpawnPosition() : { x: 0, z: 0 };
  }

  function getPlayerInteractionRadius() {
    return (window.GameState && GameState.getPlayerInteractionRadius) ? GameState.getPlayerInteractionRadius() : 0;
  }

  function getPlayerShallowWaterSpeedMultiplier() {
    return (window.GameState && GameState.getPlayerShallowWaterSpeedMultiplier) ? GameState.getPlayerShallowWaterSpeedMultiplier() : 0;
  }

  function init(startX, startZ) {
    var spawnPosition = getPlayerSpawnFallbackPosition();
    _x = (startX !== undefined && startX !== null) ? startX : spawnPosition.x;
    _z = (startZ !== undefined && startZ !== null) ? startZ : spawnPosition.z;

    var group = new THREE.Group();

    // Body (slightly wider, shorter)
    var bodyGeo = new THREE.BoxGeometry(0.44, 0.48, 0.32);
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0x4488cc });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    body.name = "body";
    group.add(body);

    // Head (slightly larger for low-poly style)
    var headGeo = new THREE.SphereGeometry(0.2, 10, 8);
    var headMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.98;
    head.castShadow = true;
    group.add(head);

    // Hair
    var hairGeo = new THREE.BoxGeometry(0.22, 0.07, 0.22);
    var hairMat = new THREE.MeshLambertMaterial({ color: 0x3a2010 });
    var hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.1;
    group.add(hair);

    // Left arm
    var armGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
    var armMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
    var leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.3, 0.55, 0);
    leftArm.castShadow = true;
    leftArm.name = "leftArm";
    group.add(leftArm);

    // Right arm
    var rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.3, 0.55, 0);
    rightArm.castShadow = true;
    rightArm.name = "rightArm";
    group.add(rightArm);
    _rightArmObject = rightArm;

    // Left leg
    var legGeo = new THREE.BoxGeometry(0.14, 0.35, 0.14);
    var legMat = new THREE.MeshLambertMaterial({ color: 0x3a3a5c });
    var leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.12, 0.17, 0);
    leftLeg.castShadow = true;
    leftLeg.name = "leftLeg";
    group.add(leftLeg);

    // Right leg
    var rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.12, 0.17, 0);
    rightLeg.castShadow = true;
    rightLeg.name = "rightLeg";
    group.add(rightLeg);

    // Shadow circle
    var shadowGeo = new THREE.CircleGeometry(0.3, 16);
    var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
    var shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    // Initialize equipment meshes (hidden by default)
    _weaponMesh = null;
    _shieldMesh = null;

    group.position.set(_x, 0, _z);
    mesh = group;
    GameScene.getScene().add(mesh);

    // Input handlers
    document.addEventListener('keydown', function (e) {
      _keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'e') { interactNearby(); if (_tutLastNearNode) _markTutSeen('harvest'); }
      if (e.key.toLowerCase() === 'f') { startEat(); _markTutSeen('eat'); }
      if (e.key.toLowerCase() === 'b') {
        if (GameHUD.isModalActive()) {
          GameHUD.closeModal();
        } else {
          GameHUD.openModal({ tab: 'resources' });
        }
      }
      if (e.key.toLowerCase() === 'm') {
        if (typeof MiniMap !== 'undefined') MiniMap.toggleMap();
      }
      if (e.key === 'Escape') {
        if (typeof MiniMap !== 'undefined' && MiniMap.isMapOpen()) {
          MiniMap.toggleMap();
        } else {
          GameHUD.closeModal();
        }
      }
    });
    document.addEventListener('keyup', function (e) {
      _keys[e.key.toLowerCase()] = false;
    });

    // Click to move/interact
    document.getElementById('game-canvas').addEventListener('click', onCanvasClick);
    document.getElementById('game-canvas').addEventListener('wheel', function (e) {
      GameScene.setZoom(e.deltaY > 0 ? 1 : -1);
    });
  }

  function onCanvasClick(event) {
    if (event.target.id !== 'game-canvas') return;

    if (window.BuildingSystem && BuildingSystem.isBuildMode()) return;

    var raycaster = updateClickRaycaster(event.clientX, event.clientY);
    if (!raycaster) return;

    var objectMeshes = GameEntities.getAllMeshes();
    if (!objectMeshes.length) return;
    var intersects = raycaster.intersectObjects(objectMeshes, true);
    if (intersects.length > 0) {
      var objData = GameEntities.getDataFromMesh(intersects[0].object);
      if (objData) {
        if (handleBarracksTargetSelection(objData)) {
          return;
        }

        if (handleCombatClick(objData)) {
          return;
        }

        if (handleWorldSiteClick(objData)) {
          return;
        }

        var entity = GameRegistry.getEntity(objData.type);
        var name = entity ? entity.name : objData.type;
        if (objData.type.startsWith('animal.')) {
          var balance = GameRegistry.getBalance(objData.type);
          var info = name + ' | ' + t('hud.nodes.hpShort', null, 'HP') + ': ' + objData.hp + '/' + objData.maxHp;
          if (balance) {
            info += ' | ' + t('hud.player.animalStatLabels.attack', null, 'Attack') + ': ' + (balance.attack || 0);
            info += ' ' + t('hud.player.animalStatLabels.defense', null, 'Defense') + ': ' + (balance.defense || 0);
          }
          info += ' | ' + ((GameRegistry.isAnimalThreat && GameRegistry.isAnimalThreat(objData.type))
            ? t('hud.player.animalDisposition.threat', null, 'Threat')
            : t('hud.player.animalDisposition.prey', null, 'Prey'));
          GameHUD.showNotification(info);
        } else if (objData.type.startsWith('node.')) {
          GameHUD.showNotification(name + ' | ' + t('hud.nodes.hpShort', null, 'HP') + ': ' + objData.hp + '/' + objData.maxHp);
        } else if (objData.type === 'site.ruined_outpost') {
          GameHUD.showNotification(name + ' | Move closer and click or press E to salvage the cache.');
        }
      }
    }

  }

  function handleBarracksTargetSelection(objData) {
    if (!objData || !objData.type || objData.type.indexOf('animal.') !== 0) return false;
    if (!window.GameHUD || !GameHUD.getSelectedInstance || !window.GameActions || !GameActions.setBarracksAttackTarget) return false;

    var selectedUid = GameHUD.getSelectedInstance();
    if (!selectedUid || !window.GameState || !GameState.getInstance || !GameState.getBarracksState) return false;

    var instance = GameState.getInstance(selectedUid);
    if (!instance || instance.entityId !== 'building.barracks') return false;

    var state = GameState.getBarracksState(selectedUid);
    if (!state || state.commandMode !== 'attack') return false;

    return !!GameActions.setBarracksAttackTarget(selectedUid, objData.id);
  }

  function handleCombatClick(objData) {
    if (!objData || !objData.type || objData.type.indexOf('animal.') !== 0) return false;
    if (!window.GameCombat || !GameCombat.canStartCombatWith || !GameCombat.startCombat) return false;
    if (GameCombat.isActive && GameCombat.isActive()) return false;
    if (!GameCombat.canStartCombatWith(objData)) return false;

    _handleThreatEngaged(objData);
    return !!GameCombat.startCombat(objData);
  }

  function handleWorldSiteClick(objData) {
    if (!objData || objData.type !== 'site.ruined_outpost') return false;

    var interactionRadius = getPlayerInteractionRadius();
    var dx = (objData.worldX || 0) - _x;
    var dz = (objData.worldZ || 0) - _z;
    if (Math.sqrt(dx * dx + dz * dz) > interactionRadius) return false;

    return lootWorldSite(objData);
  }

  // === MANUAL EAT: press F or click Eat button ===
  function startEat() {
    if (_isEating) return; // already eating

    var foodAmount = GameState.getResource("resource.food");
    if (foodAmount < 1) {
      if (typeof GameHUD !== 'undefined') GameHUD.showNotification(t('hud.player.noFoodAvailable', null, 'No food available.'));
      return;
    }

    var currentHunger = GameState.getHunger();
    var maxHunger = GameState.getMaxHunger();
    if (currentHunger >= maxHunger) {
      if (typeof GameHUD !== 'undefined') GameHUD.showNotification(t('hud.player.alreadyFull', null, 'Already full.'));
      return;
    }

    // Consume 1 food, start eating
    GameState.removeResource("resource.food", 1);
    var eatDuration = GameState.getEatDuration();
    _isEating = true;
    _eatTimer = eatDuration;

    if (typeof GameHUD !== 'undefined') {
      GameHUD.showNotification(t('hud.player.eatingNotification', { seconds: eatDuration.toFixed(1) }, 'Eating... ({seconds}s)'));
    }
  }

  // === TUTORIAL FUNCTIONS ===
  function _saveTut() {
    try { localStorage.setItem('evolution_tutorial_v1', JSON.stringify(_tutState)); } catch(e) {}
  }

  function _getSpeechSettings() {
    var settings = (window.GAME_BALANCE && GAME_BALANCE.settings) || {};
    return settings.speechOverlay || {};
  }

  function _getSpeechValue(path, fallbackValue) {
    var speechSettings = _getSpeechSettings();
    if (!path) return speechSettings || fallbackValue;

    var segments = String(path).split('.');
    var cursor = speechSettings;
    for (var segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      if (!cursor || cursor[segments[segmentIndex]] === undefined) {
        return fallbackValue;
      }
      cursor = cursor[segments[segmentIndex]];
    }
    return cursor === undefined ? fallbackValue : cursor;
  }

  function _getTutorialSpeechConfig(key) {
    return _getSpeechValue('tutorials.' + key, null);
  }

  function _isTutorialRepeatable(key) {
    var tutorialConfig = _getTutorialSpeechConfig(key);
    return !!(tutorialConfig && tutorialConfig.once === false);
  }

  function _getSpeechDuration(config) {
    return getConfiguredPositiveNumber(config && config.duration);
  }

  function _formatSpeechText(template, tokens) {
    var html = String(template || '');
    if (!tokens) return html;

    for (var tokenName in tokens) {
      if (!tokens.hasOwnProperty(tokenName)) continue;
      html = html.split('{' + tokenName + '}').join(String(tokens[tokenName]));
    }
    return html;
  }

  function t(path, tokens, fallback) {
    if (window.GameI18n && GameI18n.t) {
      return GameI18n.t(path, tokens, fallback);
    }
    return _formatSpeechText(fallback !== undefined ? fallback : path, tokens);
  }

  function _playSpeechAudio(audioPath) {
    if (!audioPath) return false;
    if (window.GameAudioController && GameAudioController.playCue) {
      return GameAudioController.playCue(audioPath);
    }
    return false;
  }

  function _isSpeechSuppressedByUi() {
    if (_getSpeechValue('suppressWhileUiOpen', true) === false) return false;

    var modalActive = typeof GameHUD !== 'undefined' && GameHUD.isModalActive && GameHUD.isModalActive();
    var settingsPanel = document.getElementById('quality-settings-panel');
    var settingsOpen = !!(settingsPanel && settingsPanel.classList.contains('open'));
    return !!(modalActive || settingsOpen);
  }

  function _ensurePlayerSpeechElements() {
    if (!_tutBubbleEl) _tutBubbleEl = document.getElementById('tutorial-bubble');
    if (!_tutBubbleTextEl) _tutBubbleTextEl = document.getElementById('tutorial-bubble-text');
    if (!_tutBubbleArrowEl) _tutBubbleArrowEl = document.getElementById('tutorial-bubble-arrow');
  }

  function _setPlayerSpeechDirectionArrow(glyph) {
    _ensurePlayerSpeechElements();
    if (!_tutBubbleEl || !_tutBubbleArrowEl) return;

    if (!glyph) {
      _tutBubbleEl.classList.remove('has-direction-arrow');
      _tutBubbleArrowEl.textContent = '';
      return;
    }

    _tutBubbleArrowEl.textContent = glyph;
    _tutBubbleEl.classList.add('has-direction-arrow');
  }

  function _getDirectionArrowGlyph(deltaX, deltaY) {
    if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return '';

    var directions = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];
    var angle = Math.atan2(-deltaY, deltaX);
    var sector = Math.round(angle / (Math.PI / 4));
    var index = (sector % 8 + 8) % 8;
    return directions[index];
  }

  function _updatePlayerSpeechDirectionArrow(playerScreenPoint) {
    if (!_runtimeSpeech || !_runtimeSpeech.hintObjectId || !_tutKey || _isSpeechSuppressedByUi()) {
      _setPlayerSpeechDirectionArrow('');
      return;
    }

    if (!window.GameScene || !GameScene.projectWorldToScreen || !window.GameEntities || !GameEntities.getMeshForObjectId) {
      _setPlayerSpeechDirectionArrow('');
      return;
    }

    var mesh = GameEntities.getMeshForObjectId(_runtimeSpeech.hintObjectId);
    if (!mesh || !mesh.visible || (mesh.userData && mesh.userData._hidden)) {
      _setPlayerSpeechDirectionArrow('');
      return;
    }

    var targetPoint = GameScene.projectWorldToScreen(
      mesh.position.x,
      (mesh.position.y || 0) + 1.1,
      mesh.position.z,
      _directionTargetScreenPt
    );
    if (!targetPoint || targetPoint.z >= 1) {
      _setPlayerSpeechDirectionArrow('');
      return;
    }

    _setPlayerSpeechDirectionArrow(_getDirectionArrowGlyph(targetPoint.x - playerScreenPoint.x, targetPoint.y - playerScreenPoint.y));
  }

  function _ensureWorldSpeechElements() {
    if (!_worldSpeechEl) _worldSpeechEl = document.getElementById('world-speech-bubble');
    if (!_worldSpeechTextEl) _worldSpeechTextEl = document.getElementById('world-speech-text');
  }

  function _showTut(key, html) {
    var tutorialConfig = _getTutorialSpeechConfig(key);
    if (tutorialConfig && tutorialConfig.once !== false && key !== 'lag' && _tutState[key]) return;

    _ensurePlayerSpeechElements();
    if (!_tutBubbleEl) return;

    var shouldReplay = _tutKey !== key || _tutBubbleTextEl.innerHTML !== html;
    _tutBubbleTextEl.innerHTML = html;
    if (shouldReplay) {
      _tutBubbleEl.dataset.needsReplay = '1';
    }
    _tutKey = key;
  }

  function _applyPlayerBubbleVisibility() {
    _ensurePlayerSpeechElements();
    if (!_tutBubbleEl) return;

    if (!_tutKey || _isSpeechSuppressedByUi()) {
      _tutBubbleEl.className = 'tutorial-bubble';
      _setPlayerSpeechDirectionArrow('');
      return;
    }

    if (_tutBubbleEl.dataset.needsReplay === '1' || !_tutBubbleEl.classList.contains('tut-show')) {
      _tutBubbleEl.className = 'tutorial-bubble';
      void _tutBubbleEl.offsetWidth;
      _tutBubbleEl.className = 'tutorial-bubble tut-show';
      _tutBubbleEl.dataset.needsReplay = '0';
    }
  }

  function _hideTut(key) {
    if (key && _tutKey !== key) return;
    _ensurePlayerSpeechElements();
    if (_tutBubbleEl) {
      _tutBubbleEl.className = 'tutorial-bubble';
      _tutBubbleEl.dataset.needsReplay = '0';
    }
    _setPlayerSpeechDirectionArrow('');
    if (_tutKey === 'lag' || key === 'lag') {
      _setLagAudioActive(false, _getSpeechValue('tutorials.lag.audioPath', ''));
    }
    _tutKey = null;
  }

  function _markTutSeen(key) {
    if (_isTutorialRepeatable(key)) {
      _repeatableTutArmed[key] = false;
      _hideTut(key);
      return;
    }
    if (_tutState[key]) return;
    _tutState[key] = true;
    _saveTut();
    _hideTut(key);
  }

  function _rememberTutShown(key) {
    if (_isTutorialRepeatable(key)) {
      _repeatableTutArmed[key] = false;
      return;
    }
    if (_tutState[key]) return;
    _tutState[key] = true;
    _saveTut();
  }

  function _getEatTutorialState() {
    var hungryThreshold = GameState.getHungryThreshold();
    var hunger = GameState.getHunger ? GameState.getHunger() : GameState.getMaxHunger();
    var food = GameState.getResource ? GameState.getResource('resource.food') : 0;
    var shouldPrompt = hunger < hungryThreshold && food >= 1;

    if (!shouldPrompt) {
      _repeatableTutArmed.eat = true;
    }

    return {
      shouldPrompt: shouldPrompt
    };
  }

  function _setLagAudioActive(active, audioPath) {
    active = !!active;
    if (_tutLagAudioActive === active && !audioPath) return;
    _tutLagAudioActive = active;
    if (window.GameAudioController && GameAudioController.setLagOverride) {
      GameAudioController.setLagOverride(active, audioPath);
    }
  }

  function _queuePlayerSpeech(key, config, tokens, options) {
    if (!config || !config.text) return false;

    var duration = _getSpeechDuration(config);
    if (duration === null) return false;

    _runtimeSpeech = {
      key: key,
      html: _formatSpeechText(config.text, tokens),
      remaining: duration,
      hintObjectId: options && options.hintObjectId ? options.hintObjectId : null
    };
    _showTut(_runtimeSpeech.key, _runtimeSpeech.html);
    _playSpeechAudio(config.audioPath);
    return true;
  }

  function triggerSpeechCue(cueKey, tokens) {
    var config = _getSpeechValue(cueKey, null);
    if (!config) return false;
    return _queuePlayerSpeech(cueKey, config, tokens || null);
  }

  function _updateRuntimeSpeech(dt) {
    if (!_runtimeSpeech) return false;

    _runtimeSpeech.remaining -= dt;
    if (_runtimeSpeech.remaining <= 0) {
      var finishedKey = _runtimeSpeech.key;
      _runtimeSpeech = null;
      if (_tutKey === finishedKey) {
        _hideTut(finishedKey);
      }
      return false;
    }

    _showTut(_runtimeSpeech.key, _runtimeSpeech.html);
    return true;
  }

  function _isMeshVisibleOnScreen(mesh, anchorY, maxDistance, outPoint) {
    if (!mesh || !mesh.visible || (mesh.userData && mesh.userData._hidden)) return false;

    var dx = mesh.position.x - _x;
    var dz = mesh.position.z - _z;
    if (maxDistance > 0 && (dx * dx + dz * dz) > maxDistance * maxDistance) {
      return false;
    }

    if (!window.GameScene || !GameScene.projectWorldToScreen) return false;
    var pt = GameScene.projectWorldToScreen(mesh.position.x, (mesh.position.y || 0) + anchorY, mesh.position.z, outPoint);
    return !!(pt && pt.z < 1 && pt.x >= -48 && pt.x <= window.innerWidth + 48 && pt.y >= -48 && pt.y <= window.innerHeight + 48);
  }

  function _getObjectDataById(objectId) {
    if (!objectId || !window.GameEntities || !GameEntities.getMeshForObjectId || !GameEntities.getDataFromMesh) return null;

    var mesh = GameEntities.getMeshForObjectId(objectId);
    if (!mesh) return null;
    return GameEntities.getDataFromMesh(mesh);
  }

  function _getNodeRewardMap(objData) {
    if (!objData) return null;

    var nodeInfo = (window.GameTerrain && GameTerrain.getNodeInfo) ? GameTerrain.getNodeInfo(objData) : null;
    if (nodeInfo && nodeInfo.rewards) return nodeInfo.rewards;

    var balance = (window.GameRegistry && GameRegistry.getBalance) ? GameRegistry.getBalance(objData.type) : null;
    return balance && balance.rewards ? balance.rewards : null;
  }

  function _updateResourceDiscovery(dt) {
    var config = _getSpeechValue('resourceDiscovery', null);
    if (!config || !window.GameEntities || !GameEntities.getAllMeshes || !GameEntities.getDataFromMesh) return;
    if (_runtimeSpeech || _tutKey === 'lag') return;

    _resourceDiscoveryTimer += dt;
    var scanInterval = getConfiguredPositiveNumber(config.scanInterval);
    if (scanInterval === null) return;
    if (_resourceDiscoveryTimer < scanInterval) return;
    _resourceDiscoveryTimer = 0;

    var watchedResourceIds = config.resourceIds || [];
    var maxDistance = getConfiguredPositiveNumber(config.maxDistance);
    if (maxDistance === null) return;

    var meshes = GameEntities.getAllMeshes();
    var bestCandidate = null;
    for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
      var mesh = meshes[meshIndex];
      var objData = GameEntities.getDataFromMesh(mesh);
      if (!objData || !objData.type || objData.type.indexOf('node.') !== 0 || !(objData.hp > 0)) continue;
      if (!_isMeshVisibleOnScreen(mesh, 1.1, maxDistance, _speechScanScreenPt)) continue;

      var rewardMap = _getNodeRewardMap(objData);
      if (!rewardMap) continue;

      for (var resId in rewardMap) {
        if (!rewardMap[resId]) continue;
        if (watchedResourceIds.length && watchedResourceIds.indexOf(resId) === -1) continue;
        if (_tutState.seenResources[resId]) continue;

        var resourceEntity = GameRegistry.getEntity(resId);
        var dx = mesh.position.x - _x;
        var dz = mesh.position.z - _z;
        var distanceSq = dx * dx + dz * dz;

        if (!bestCandidate || distanceSq < bestCandidate.distanceSq) {
          bestCandidate = {
            resId: resId,
            objectId: objData.id,
            name: resourceEntity ? resourceEntity.name : resId,
            distanceSq: distanceSq
          };
        }
      }
    }

    if (!bestCandidate) return;
    _tutState.seenResources[bestCandidate.resId] = true;
    _saveTut();
    _queuePlayerSpeech('resourceDiscovery', config, { name: bestCandidate.name }, { hintObjectId: bestCandidate.objectId });
  }

  function _showWorldSpeech(key, html) {
    _ensureWorldSpeechElements();
    if (!_worldSpeechEl || !_worldSpeechTextEl) return;

    var shouldReplay = !_worldSpeech || _worldSpeech.key !== key || _worldSpeechTextEl.innerHTML !== html;
    _worldSpeechTextEl.innerHTML = html;
    if (shouldReplay) {
      _worldSpeechEl.dataset.needsReplay = '1';
    }
  }

  function _applyWorldBubbleVisibility() {
    _ensureWorldSpeechElements();
    if (!_worldSpeechEl) return;

    if (!_worldSpeech || _isSpeechSuppressedByUi()) {
      _worldSpeechEl.className = 'world-speech-bubble';
      return;
    }

    if (_worldSpeechEl.dataset.needsReplay === '1' || !_worldSpeechEl.classList.contains('tut-show')) {
      _worldSpeechEl.className = 'world-speech-bubble';
      void _worldSpeechEl.offsetWidth;
      _worldSpeechEl.className = 'world-speech-bubble tut-show';
      _worldSpeechEl.dataset.needsReplay = '0';
    }
  }

  function _hideWorldSpeech() {
    _ensureWorldSpeechElements();
    if (_worldSpeechEl) {
      _worldSpeechEl.className = 'world-speech-bubble';
      _worldSpeechEl.dataset.needsReplay = '0';
    }
    _worldSpeech = null;
  }

  function _queueWorldSpeech(key, config, objectId, tokens) {
    if (!config || !config.text || !objectId) return false;

    var anchorY = getConfiguredPositiveNumber(config.anchorY);
    if (anchorY === null) {
      anchorY = getConfiguredPositiveNumber(_getSpeechValue('worldAnchorY', null));
    }
    if (anchorY === null) return false;

    var duration = _getSpeechDuration(config);
    if (duration === null) return false;

    _worldSpeech = {
      key: key,
      html: _formatSpeechText(config.text, tokens),
      objectId: objectId,
      remaining: duration,
      anchorY: anchorY
    };
    _showWorldSpeech(key, _worldSpeech.html);
    _playSpeechAudio(config.audioPath);
    return true;
  }

  function _updateWorldSpeech(dt) {
    _ensureWorldSpeechElements();
    if (!_worldSpeech) {
      if (_worldSpeechEl) _worldSpeechEl.className = 'world-speech-bubble';
      return;
    }

    _worldSpeech.remaining -= dt;
    if (_worldSpeech.remaining <= 0) {
      _hideWorldSpeech();
      return;
    }

    if (_isSpeechSuppressedByUi()) {
      if (_worldSpeechEl) _worldSpeechEl.className = 'world-speech-bubble';
      return;
    }

    var mesh = window.GameEntities && GameEntities.getMeshForObjectId ? GameEntities.getMeshForObjectId(_worldSpeech.objectId) : null;
    if (!mesh || !_isMeshVisibleOnScreen(mesh, _worldSpeech.anchorY, 0, _worldSpeechScreenPt)) {
      if (_worldSpeechEl) _worldSpeechEl.className = 'world-speech-bubble';
      return;
    }

    _applyWorldBubbleVisibility();
    _worldSpeechEl.style.left = Math.round(_worldSpeechScreenPt.x) + 'px';
    _worldSpeechEl.style.top = Math.round(_worldSpeechScreenPt.y - 8) + 'px';
  }

  function _isEligibleThreatTauntTarget(objData, config) {
    if (!objData || !objData.type || objData.type.indexOf('animal.') !== 0 || !(objData.hp > 0)) return false;
    if (!(window.GameRegistry && GameRegistry.isAnimalThreat && GameRegistry.isAnimalThreat(objData.type))) return false;

    var eligibleAnimalTypes = config && config.eligibleAnimalTypes ? config.eligibleAnimalTypes : [];
    return !eligibleAnimalTypes.length || eligibleAnimalTypes.indexOf(objData.type) !== -1;
  }

  function _findVisibleThreatTauntTarget(config) {
    if (!window.GameEntities || !GameEntities.getAllMeshes || !GameEntities.getDataFromMesh) return null;

    var maxDistance = getConfiguredPositiveNumber(config && config.maxDistance);
    var worldAnchorY = getConfiguredPositiveNumber(_getSpeechValue('worldAnchorY', null));
    if (maxDistance === null || worldAnchorY === null) return null;

    var meshes = GameEntities.getAllMeshes();
    var bestCandidate = null;
    for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
      var mesh = meshes[meshIndex];
      var objData = GameEntities.getDataFromMesh(mesh);
      if (!_isEligibleThreatTauntTarget(objData, config)) continue;
      if (!_isMeshVisibleOnScreen(mesh, worldAnchorY, maxDistance, _speechScanScreenPt)) continue;

      var entity = GameRegistry.getEntity(objData.type);
      var dx = mesh.position.x - _x;
      var dz = mesh.position.z - _z;
      var distanceSq = dx * dx + dz * dz;

      if (!bestCandidate || distanceSq < bestCandidate.distanceSq) {
        bestCandidate = {
          data: objData,
          distanceSq: distanceSq,
          name: entity ? entity.name : objData.type
        };
      }
    }

    return bestCandidate;
  }

  function _clearThreatSession(setCooldown) {
    var firstConfig = _getSpeechValue('threatTaunt.first', null);
    if (setCooldown && firstConfig) {
      var cooldownSeconds = Number(firstConfig.cooldownSeconds);
      if (cooldownSeconds > 0) {
        _threatTauntCooldown = cooldownSeconds;
      }
    }

    _threatSession = null;
    if (_worldSpeech && _worldSpeech.key === 'threatTaunt') {
      _hideWorldSpeech();
    }
  }

  function _handleThreatEngaged(objData) {
    if (!_threatSession) return;
    if (!objData || !objData.id || objData.id === _threatSession.objectId) {
      _clearThreatSession(true);
    }
  }

  function _updateThreatTaunts(dt, suppressNewTaunts) {
    var config = _getSpeechValue('threatTaunt', null);
    var firstConfig = config && config.first ? config.first : null;
    var idleConfig = config && config.idleNudge ? config.idleNudge : null;

    if (_threatTauntCooldown > 0) {
      _threatTauntCooldown = Math.max(0, _threatTauntCooldown - dt);
    }

    if (!config || !firstConfig || !idleConfig) {
      _updateWorldSpeech(dt);
      return;
    }

    if (_threatSession) {
      var threatData = _getObjectDataById(_threatSession.objectId);
      var threatMesh = window.GameEntities && GameEntities.getMeshForObjectId ? GameEntities.getMeshForObjectId(_threatSession.objectId) : null;
      var maxDistance = getConfiguredPositiveNumber(config.maxDistance);
      var worldAnchorY = getConfiguredPositiveNumber(_getSpeechValue('worldAnchorY', null));

      if (maxDistance === null || worldAnchorY === null || !threatData || !_isEligibleThreatTauntTarget(threatData, config) || !threatMesh || !_isMeshVisibleOnScreen(threatMesh, worldAnchorY, maxDistance, _speechScanScreenPt)) {
        _clearThreatSession(false);
      } else if (window.GameCombat && GameCombat.isActive && GameCombat.getTarget) {
        var combatTarget = GameCombat.getTarget();
        if (combatTarget && combatTarget.id === _threatSession.objectId) {
          _handleThreatEngaged(combatTarget);
        }
      }

      if (_threatSession) {
        _threatSession.noAttackTimer += dt;
        var delaySeconds = getConfiguredPositiveNumber(idleConfig.delaySeconds);
        if (delaySeconds === null) {
          _clearThreatSession(false);
          _updateWorldSpeech(dt);
          return;
        }
        if (!_threatSession.nudged && _threatSession.noAttackTimer >= delaySeconds && !_runtimeSpeech && _tutKey !== 'lag' && !suppressNewTaunts) {
          _queuePlayerSpeech('threatIdleNudge', idleConfig, null);
          _threatSession.nudged = true;
          _clearThreatSession(true);
        }
      }
    }

    if (!_threatSession && _threatTauntCooldown <= 0 && !suppressNewTaunts) {
      _threatTauntScanTimer += dt;
      var scanInterval = getConfiguredPositiveNumber(config.scanInterval);
      if (scanInterval === null) {
        _updateWorldSpeech(dt);
        return;
      }

      if (_threatTauntScanTimer >= scanInterval) {
        _threatTauntScanTimer = 0;
        var candidate = _findVisibleThreatTauntTarget(config);
        if (candidate) {
          var chance = getConfiguredNonNegativeNumber(firstConfig.chance);
          if (chance === null) {
            _updateWorldSpeech(dt);
            return;
          }

          if (Math.random() <= chance) {
            _threatSession = {
              objectId: candidate.data.id,
              noAttackTimer: 0,
              nudged: false
            };
            _queueWorldSpeech('threatTaunt', firstConfig, candidate.data.id, { name: candidate.name });
          } else {
            var retrySeconds = getConfiguredPositiveNumber(config.retrySeconds);
            _threatTauntCooldown = retrySeconds !== null ? retrySeconds : 0;
          }
        }
      }
    }

    _updateWorldSpeech(dt);
  }

  function _updateLagTut(dt) {
    var config = _getTutorialSpeechConfig('lag') || {};
    var fps = (typeof GamePerf !== 'undefined' && GamePerf.getValue) ? Number(GamePerf.getValue('frame.fps')) : 0;
    var presetId = (typeof GameQualitySettings !== 'undefined' && GameQualitySettings.getPresetId) ? GameQualitySettings.getPresetId() : '';
    var shouldSuggestLow = presetId !== 'low';
    var minFps = getConfiguredPositiveNumber(config.minFps);
    var triggerSeconds = getConfiguredPositiveNumber(config.triggerSeconds);
    var recoverFps = getConfiguredPositiveNumber(config.recoverFps);
    var recoverSeconds = getConfiguredPositiveNumber(config.recoverSeconds);
    var lagText = _formatSpeechText(config.text || t('speech.tutorials.lag', null, 'Frame rate is tanking. Open Settings and switch to Low.'), null);

    if (!shouldSuggestLow || !(fps > 0) || minFps === null || triggerSeconds === null || recoverFps === null || recoverSeconds === null) {
      _tutLagTimer = 0;
      _tutLagRecoveryTimer = 0;
      _setLagAudioActive(false, config.audioPath);
      if (_tutKey === 'lag') {
        _hideTut('lag');
      }
      return false;
    }

    if (fps < minFps) {
      _tutLagTimer += dt;
      _tutLagRecoveryTimer = 0;
      if (_tutLagTimer >= triggerSeconds) {
        _showTut('lag', lagText);
        _setLagAudioActive(true, config.audioPath);
        return true;
      }
      return _tutKey === 'lag';
    }

    _tutLagTimer = 0;
    if (_tutKey === 'lag') {
      if (fps >= recoverFps) {
        _tutLagRecoveryTimer += dt;
      } else {
        _tutLagRecoveryTimer = 0;
      }
      if (_tutLagRecoveryTimer >= recoverSeconds) {
        _hideTut('lag');
        _tutLagRecoveryTimer = 0;
      }
      return _tutKey === 'lag';
    }
    _setLagAudioActive(false, config.audioPath);
    return false;
  }

  function _updateTutBubblePosition() {
    _ensurePlayerSpeechElements();
    if (!_tutKey || !_tutBubbleEl) {
      if (_tutBubbleEl) _tutBubbleEl.className = 'tutorial-bubble';
      _setPlayerSpeechDirectionArrow('');
      return;
    }

    if (_isSpeechSuppressedByUi()) {
      _tutBubbleEl.className = 'tutorial-bubble';
      _setPlayerSpeechDirectionArrow('');
      return;
    }

    var anchorY = getConfiguredPositiveNumber(_getSpeechValue('playerAnchorY', null));
    if (anchorY === null) return;

    if (window.GameScene && GameScene.projectWorldToScreen) {
      var pt = GameScene.projectWorldToScreen(_x, anchorY, _z, _tutScreenPt);
      if (pt && pt.z < 1) {
        _applyPlayerBubbleVisibility();
        _tutBubbleEl.style.left = Math.round(pt.x) + 'px';
        _tutBubbleEl.style.top = Math.round(pt.y - 10) + 'px';
        _updatePlayerSpeechDirectionArrow(pt);
      } else {
        _tutBubbleEl.className = 'tutorial-bubble';
        _setPlayerSpeechDirectionArrow('');
      }
    }
  }

  function _updateTut(dt) {
    var lagActive = _updateLagTut(dt);
    if (!lagActive) {
      _updateResourceDiscovery(dt);
    }
    _updateThreatTaunts(dt, lagActive || _isSpeechSuppressedByUi());
    var runtimeActive = _updateRuntimeSpeech(dt);
    var eatRepeatable = _isTutorialRepeatable('eat');
    var eatTutorialState = _getEatTutorialState();
    var canShowEatTutorial = eatTutorialState.shouldPrompt && (eatRepeatable ? _repeatableTutArmed.eat !== false : !_tutState.eat);
    var eatTutorialSettled = eatRepeatable ? !canShowEatTutorial : !!_tutState.eat;

    // Early exit if all onboarding tutorials are done and no runtime warning is active
    if (!lagActive && !runtimeActive && _tutState.harvest && eatTutorialSettled && _tutState.night) {
      return;
    }

    if (!lagActive && !runtimeActive) {
      var harvestConfig = _getTutorialSpeechConfig('harvest');
      var eatConfig = _getTutorialSpeechConfig('eat');
      var nightConfig = _getTutorialSpeechConfig('night');

      // Priority 1: harvest tutorial — near a harvestable resource node
      if (!_tutState.harvest && harvestConfig && harvestConfig.text) {
        if (_tutLastNearNode) {
          _showTut('harvest', _formatSpeechText(harvestConfig.text, null));
        } else if (_tutKey === 'harvest') {
          _hideTut('harvest');
        }
      }

      // Priority 2: hunger tutorial — hungry and has food, nothing else showing
      if (canShowEatTutorial && !_tutKey && eatConfig && eatConfig.text) {
        if (_queuePlayerSpeech('eat', eatConfig, null)) {
          _rememberTutShown('eat');
        }
      }

      // Priority 3: night/fire tutorial — first time it gets dark
      if (!_tutState.night && !_tutKey && nightConfig && nightConfig.text) {
        var isNt = typeof DayNightSystem !== 'undefined' && DayNightSystem.isNight && DayNightSystem.isNight();
        if (isNt) {
          _showTut('night', _formatSpeechText(nightConfig.text, null));
          _tutNightTimer = 0;
        }
      }
    }

    // Auto-dismiss night tutorial after 9 seconds
    if (_tutKey === 'night') {
      var activeNightConfig = _getTutorialSpeechConfig('night');
      var nightDuration = _getSpeechDuration(activeNightConfig);
      _tutNightTimer += dt;
      if (activeNightConfig && nightDuration !== null && _tutNightTimer >= nightDuration) _markTutSeen('night');
    }

    _updateTutBubblePosition();
  }

  function update(dt) {
    _animTime += dt;
    _visualAnimTime += Math.min(dt, 1 / 30);
    var moved = false;

    var _speed = GameState.getPlayerSpeed ? GameState.getPlayerSpeed() : 3;

    // Speed penalty when hunger drops below the configured threshold.
    var hunger = GameState.getHunger ? GameState.getHunger() : 100;
    if (hunger < GameState.getHungryThreshold()) {
      _speed *= GameState.getHungrySpeedMultiplier();
    }

    // Speed penalty while eating
    if (_isEating) {
      _speed *= GameState.getEatSpeedMultiplier();
    }

    // === EATING SYSTEM ===
    updateEating(dt);

    // === TORCH SYSTEM ===
    updateTorch(dt);

    // === HP REGENERATION ===
    var isInCombat = (window.GameCombat && GameCombat.isActive && GameCombat.isActive());
    if (isInCombat) {
      _lastCombatTime = _animTime;
      _regenAccumulator = 0;
    } else {
      var timeSinceCombat = _animTime - _lastCombatTime;
      if (timeSinceCombat > 3) {
        _regenAccumulator += dt;
        if (_regenAccumulator >= 1.0 && !(GameState.isStarving && GameState.isStarving())) {
          _regenAccumulator = 0;
          var player = GameState.getPlayer();
          var maxHp = GameState.getPlayerMaxHp();
          if (player.hp < maxHp) {
            GameState.setPlayerHP(Math.min(maxHp, player.hp + 1));
          }
        }
      }
    }

    // Screen-space input
    var screenDx = 0, screenDy = 0;
    if (_keys['w'] || _keys['arrowup']) { screenDy -= 1; moved = true; }
    if (_keys['s'] || _keys['arrowdown']) { screenDy += 1; moved = true; }
    if (_keys['a'] || _keys['arrowleft']) { screenDx -= 1; moved = true; }
    if (_keys['d'] || _keys['arrowright']) { screenDx += 1; moved = true; }

    var dx = screenDx + screenDy;
    var dz = -screenDx + screenDy;

    if (moved) {
      var len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) { dx /= len; dz /= len; }
      _direction.x = dx;
      _direction.z = dz;

      var speedMultiplier = 1.0;
      if (GameTerrain.isShallowWater && GameTerrain.isShallowWater(_x, _z)) {
        speedMultiplier = getPlayerShallowWaterSpeedMultiplier();
      }

      var newX = _x + dx * _speed * speedMultiplier * dt;
      var newZ = _z + dz * _speed * speedMultiplier * dt;

      if (GameTerrain.isWalkable(newX, newZ)) {
        _x = newX;
        _z = newZ;
      } else if (GameTerrain.isWalkable(newX, _z)) {
        _x = newX;
      } else if (GameTerrain.isWalkable(_x, newZ)) {
        _z = newZ;
      }
    }

    if (GameState && GameState.setPlayerPosition) {
      GameState.setPlayerPosition(_x, _z);
    }

    if (mesh) {
      var visualDt = Math.min(dt, 1 / 30);
      var positionAlpha = getSmoothingFactor(visualDt, 48);
      var rotationAlpha = getSmoothingFactor(visualDt, 34);
      var limbAlpha = getSmoothingFactor(visualDt, 28);

      mesh.position.x = dampValue(mesh.position.x, _x, positionAlpha);
      mesh.position.z = dampValue(mesh.position.z, _z, positionAlpha);

      if (moved) {
        var targetAngle = Math.atan2(_direction.x, _direction.z) + Math.PI;
        var angleDiff = targetAngle - mesh.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        mesh.rotation.y += angleDiff * rotationAlpha;
      }

      // Walking animation
      if (moved) {
        var swing = Math.sin(_visualAnimTime * 10) * 0.4;
        mesh.children.forEach(function (child) {
          if (child.name === "leftArm") child.rotation.x = dampValue(child.rotation.x, swing, limbAlpha);
          if (child.name === "rightArm") child.rotation.x = dampValue(child.rotation.x, _torchActive ? 0 : -swing, limbAlpha);
          if (child.name === "leftLeg") child.rotation.x = dampValue(child.rotation.x, -swing * 0.6, limbAlpha);
          if (child.name === "rightLeg") child.rotation.x = dampValue(child.rotation.x, swing * 0.6, limbAlpha);
        });
      } else {
        mesh.children.forEach(function (child) {
          if (child.name === "rightArm" && _torchActive) {
            child.rotation.x = dampValue(child.rotation.x, 0, limbAlpha);
            return;
          }
          if (child.name) child.rotation.x = dampValue(child.rotation.x, 0, limbAlpha);
        });
      }

      // Update torch 3D mesh position (attached to right arm)
      if (_torchMesh && _rightArmObject) {
        if (!_torchWorldPos && typeof THREE !== 'undefined') {
          _torchWorldPos = new THREE.Vector3();
        }
        if (_torchWorldPos) {
          _rightArmObject.getWorldPosition(_torchWorldPos);
          _torchMesh.position.set(_torchWorldPos.x, _torchWorldPos.y + 0.3, _torchWorldPos.z);
        }
      }
    }

    GameTerrain.update(_x, _z);
    refreshContextAction(dt, moved);
    _updateTut(dt);
  }

  function refreshContextAction(dt, moved) {
    _contextRefreshAccumulator += dt;

    var movedSinceLastQuery = Math.abs(_x - _lastContextQueryPos.x) > 0.18 || Math.abs(_z - _lastContextQueryPos.z) > 0.18;
    var refreshInterval = moved ? (1 / 12) : 0.22;

    if (!movedSinceLastQuery && _contextRefreshAccumulator < refreshInterval) {
      return;
    }

    _contextRefreshAccumulator = 0;
    _lastContextQueryPos.x = _x;
    _lastContextQueryPos.z = _z;
    updateContextAction();
  }

  function updateEating(dt) {
    if (!_isEating) return;

    _eatTimer -= dt;
    if (_eatTimer <= 0) {
      // Eating complete - restore hunger
      var foodRestore = GameState.getHungerRestoreAmount('resource.food');
      var currentHunger = GameState.getHunger();
      GameState.setHunger(Math.min(currentHunger + foodRestore, GameState.getMaxHunger()));
      _isEating = false;
      _eatTimer = 0;
    }
  }

  function updateTorch(dt) {
    var isDark = typeof DayNightSystem !== 'undefined' && DayNightSystem.getDarkness() > 0.3;

    if (_torchActive) {
      if (isDark) {
        _torchFuel -= dt;
      }
      if (_torchFuel <= 0) {
        _torchActive = false;
        _torchFuel = 0;
        removeTorchMesh();
        if (typeof GameHUD !== 'undefined') {
          GameHUD.showNotification(t('hud.player.torchBurnedOut', null, 'Torch burned out.'));
        }
      }
    }

    // Activate torch if dark and has one in inventory
    if (!_torchActive && isDark) {
      var torchCount = GameState.getInventoryCount("item.handheld_torch");
      if (torchCount > 0) {
        GameState.removeFromInventory("item.handheld_torch", 1);
        var torchBalance = GameRegistry.getBalance("item.handheld_torch") || {};
        _torchFuel = Number(torchBalance.duration) || 0;
        _torchActive = true;
        createTorchMesh();
        if (typeof GameHUD !== 'undefined') {
          GameHUD.showNotification(t('hud.player.torchLitNotification', { seconds: Math.floor(_torchFuel) }, 'Hand torch lit. ({seconds}s)'));
        }
      }
    }

    // Remove torch mesh during daytime
    if (!_torchActive && _torchMesh) {
      removeTorchMesh();
    }
  }

  function createTorchMesh() {
    if (_torchMesh) return;

    var torchGroup = new THREE.Group();

    // Stick
    var stickGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 6);
    var stickMat = new THREE.MeshLambertMaterial({ color: 0x6B3410 });
    var stick = new THREE.Mesh(stickGeo, stickMat);
    torchGroup.add(stick);

    // Cloth wrapping at top
    var wrapGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.08, 6);
    var wrapMat = new THREE.MeshLambertMaterial({ color: 0xC4A882 });
    var wrap = new THREE.Mesh(wrapGeo, wrapMat);
    wrap.position.y = 0.22;
    torchGroup.add(wrap);

    // Flame tip (outer)
    var flameGeo = new THREE.ConeGeometry(0.05, 0.18, 6);
    var flameMat = new THREE.MeshBasicMaterial({ color: 0xFF8C00, transparent: true, opacity: 0.85 });
    var flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.33;
    flame.name = 'torchFlame';
    torchGroup.add(flame);

    // Flame inner (bright core)
    var innerGeo = new THREE.ConeGeometry(0.025, 0.1, 6);
    var innerMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44, transparent: true, opacity: 0.75 });
    var inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 0.3;
    inner.name = 'torchFlameInner';
    torchGroup.add(inner);

    // Glow sphere around flame
    var glowGeo = new THREE.SphereGeometry(0.15, 8, 6);
    var glowMat = new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    var glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.33;
    glow.name = 'torchGlow';
    torchGroup.add(glow);

    torchGroup.name = 'handheldTorch';
    _torchMesh = torchGroup;
    GameScene.getScene().add(_torchMesh);
  }

  function removeTorchMesh() {
    if (!_torchMesh) return;
    GameScene.getScene().remove(_torchMesh);
    _torchMesh = null;
  }

  function formatRewardPreview(rewardMap) {
    if (!rewardMap) return "";

    var parts = [];
    for (var resId in rewardMap) {
      if (!rewardMap[resId]) continue;
      var entity = GameRegistry.getEntity(resId);
      parts.push(rewardMap[resId] + " " + (entity ? entity.name : resId));
    }

    return parts.join(", ");
  }

  function getRuinedOutpostKey(siteData) {
    var rewards = siteData && siteData.siteRewards ? siteData.siteRewards : null;
    if (rewards) {
      if (rewards['resource.iron'] || rewards['resource.coal']) return 'frontierHold';
      if (rewards['resource.bronze']) return 'bronzeOutpost';
      if (rewards['resource.flint'] || rewards['resource.wood']) return 'hunterCamp';
    }

    var label = siteData && siteData.siteLabel ? String(siteData.siteLabel) : '';
    if (label === 'Ruined Frontier Hold') return 'frontierHold';
    if (label === 'Ruined Bronze Outpost') return 'bronzeOutpost';
    if (label === 'Collapsed Hunter Camp') return 'hunterCamp';
    return '';
  }

  function getLocalizedRuinedOutpostLabel(siteData) {
    var outpostKey = getRuinedOutpostKey(siteData);
    if (outpostKey) {
      return t('world.ruinedOutposts.' + outpostKey + '.label', null, siteData && siteData.siteLabel ? siteData.siteLabel : t('entities.site.ruined_outpost.name', null, 'Ruined Outpost'));
    }

    var siteEntity = GameRegistry.getEntity('site.ruined_outpost');
    return siteEntity && siteEntity.name ? siteEntity.name : t('entities.site.ruined_outpost.name', null, 'Ruined Outpost');
  }

  function buildFarmPrompt(status) {
    if (!status) return null;

    var plotName = status.plotName || t('hud.contextAction.farmPlot', null, 'Farm Plot');

    if (status.storedAmount > 0) {
      return t('hud.contextAction.collectStored', { name: plotName, count: status.storedAmount }, 'Collect {name} [{count} stored]');
    }

    if (!status.hasWorkerSupport && !status.planted) {
      return t('hud.contextAction.needsWorker', { name: plotName }, '{name} [Needs worker]');
    }

    if (status.planted && !status.ready) {
      return t('hud.contextAction.statusWithProgress', {
        name: plotName,
        status: status.statusText,
        progress: status.progressPercent
      }, '{name} [{status}] {progress}%');
    }

    return t('hud.contextAction.statusOnly', { name: plotName, status: status.statusText }, '{name} [{status}]');
  }

  function useGenericNodeName(objData) {
    return !!(objData && (objData.type === 'node.tree' || objData.type === 'node.rock' || objData.type === 'node.berry_bush'));
  }

  function getNodePromptName(objData, nodeInfo, entity) {
    if (nodeInfo) {
      return useGenericNodeName(objData) ? (nodeInfo.name || (entity ? entity.name : objData.type)) : nodeInfo.label;
    }
    return entity ? entity.name : objData.type;
  }

  function getNodePromptDetail(objData, nodeInfo) {
    if (!nodeInfo) return '';

    var rewardPreview = formatRewardPreview(nodeInfo.rewards);
    if (objData.type === 'node.tree' || objData.type === 'node.rock') {
      return rewardPreview;
    }
    if (objData.type === 'node.berry_bush') {
      return rewardPreview || t('hud.nodes.food', null, 'Food');
    }

    var detail = nodeInfo.stateLabel || '';
    if (rewardPreview) {
      detail = detail ? detail + ' • ' + rewardPreview : rewardPreview;
    }
    return detail;
  }

  function updateContextAction() {
    var interactionRadius = getPlayerInteractionRadius();
    var nearObj = GameTerrain.findNearestObject(_x, _z, interactionRadius);
    var el = document.getElementById('context-action');
    var textEl = document.getElementById('context-text');

    // Reset tutorial node flag each refresh; set to true below if a node is actually nearby
    _tutLastNearNode = false;

    var nearBuilding = findNearestBuilding(_x, _z, interactionRadius);
    if (nearBuilding) {
      var storage = GameState.getBuildingStorage(nearBuilding.uid);
      var hasResources = false;
      var totalAmount = 0;
      for (var resId in storage) {
        if (storage[resId] > 0) {
          hasResources = true;
          totalAmount += storage[resId];
        }
      }

      if (hasResources) {
        var entity = GameRegistry.getEntity(nearBuilding.entityId);
        var name = entity ? entity.name : nearBuilding.entityId;
        textEl.textContent = t('hud.contextAction.collectFrom', { name: name, count: totalAmount }, 'Collect from {name} ({count} items)');
        el.classList.add('show');
        GameHUD.hideObjectHpBar();
        return;
      }

      if (window.GameActions && GameActions.getFarmPlotStatus) {
        var farmStatus = GameActions.getFarmPlotStatus(nearBuilding.uid);
        if (farmStatus) {
          textEl.textContent = buildFarmPrompt(farmStatus);
          el.classList.add('show');
          GameHUD.hideObjectHpBar();
          return;
        }
      }
    }

    if (nearObj && nearObj.hp > 0) {
      var entity = GameRegistry.getEntity(nearObj.type);
      var nodeInfo = (nearObj.type.indexOf("node.") === 0 && typeof GameTerrain !== 'undefined' && GameTerrain.getNodeInfo) ? GameTerrain.getNodeInfo(nearObj) : null;
      var name = getNodePromptName(nearObj, nodeInfo, entity);
      var action = nearObj.type.startsWith("animal.")
        ? ((GameRegistry.isAnimalThreat && GameRegistry.isAnimalThreat(nearObj.type))
          ? t('hud.contextAction.actions.fight', null, 'Fight')
          : t('hud.contextAction.actions.hunt', null, 'Hunt'))
        : nearObj.type === "node.berry_bush"
          ? t('hud.contextAction.actions.gather', null, 'Gather')
          : nearObj.type.startsWith("node.")
            ? t('hud.contextAction.actions.harvest', null, 'Harvest')
            : t('hud.contextAction.actions.interact', null, 'Interact');
      var detail = getNodePromptDetail(nearObj, nodeInfo);
      var showHpInPrompt = !!(nearObj.type && nearObj.type.indexOf('animal.') === 0);
      textEl.textContent = action + " " + name + (detail ? " [" + detail + "]" : "") + (showHpInPrompt ? (" (" + nearObj.hp + "/" + nearObj.maxHp + ")") : "");
      el.classList.add('show');

      // Mark tutorial node presence (node.* only, not animals)
      if (nearObj.type && nearObj.type.indexOf('node.') === 0) {
        _tutLastNearNode = true;
      }

      // Resource nodes should not auto-open the popup on proximity,
      // but direct interactions can still show it briefly.
      if (typeof GameHUD !== 'undefined' && GameHUD.hideObjectHpBar) {
        if (!(nearObj.type && nearObj.type.indexOf('node.') === 0) && GameHUD.showObjectHpBar) {
          GameHUD.showObjectHpBar(nearObj);
        }
      }
    } else {
      el.classList.remove('show');
      if (typeof GameHUD !== 'undefined' && GameHUD.hideObjectHpBar) GameHUD.hideObjectHpBar();
    }
  }

  function interactNearby() {
    var interactionRadius = getPlayerInteractionRadius();
    var nearBuilding = findNearestBuilding(_x, _z, interactionRadius);
    if (nearBuilding) {
      if (window.GameActions && GameActions.interactWithFarmPlot && window.GameActions.getFarmPlotStatus && GameActions.getFarmPlotStatus(nearBuilding.uid)) {
        GameActions.interactWithFarmPlot(nearBuilding.uid);
        return;
      }

      var storage = GameState.getBuildingStorage(nearBuilding.uid);
      var hasResources = false;
      for (var resId in storage) {
        if (storage[resId] > 0) {
          hasResources = true;
          break;
        }
      }

      if (hasResources) {
        collectFromBuilding(nearBuilding);
        return;
      }
    }

    var nearObj = GameTerrain.findNearestObject(_x, _z, interactionRadius);
    if (nearObj && nearObj.hp > 0) {
      interactWith(nearObj);
    }
  }

  function interactWith(objData) {
    if (objData.type.startsWith("animal.")) {
      _handleThreatEngaged(objData);
      GameCombat.startCombat(objData);
    } else if (objData.type.startsWith("node.")) {
      harvestNode(objData);
    } else if (objData.type === 'site.ruined_outpost') {
      lootWorldSite(objData);
    }
  }

  function lootWorldSite(objData) {
    if (!objData || objData._destroyed || objData.hp <= 0) return false;

    var rewards = objData.siteRewards || {};
    var rewardParts = [];
    for (var rewardId in rewards) {
      var amount = Number(rewards[rewardId]) || 0;
      if (amount <= 0) continue;

      var rewardEntity = GameRegistry.getEntity(rewardId);
      if (rewardEntity && (rewardEntity.type === 'equipment' || rewardEntity.type === 'tool' || rewardEntity.type === 'consumable')) {
        GameState.addToInventory(rewardId, amount);
      } else {
        GameState.addResource(rewardId, amount);
      }

      rewardParts.push(amount + ' ' + (rewardEntity ? rewardEntity.name : rewardId));
      if (window.GameHUD && GameHUD.showDamageNumber) {
        GameHUD.showDamageNumber(objData.worldX, 1.2, objData.worldZ, '+' + amount + ' ' + (rewardEntity ? rewardEntity.name : rewardId), 'loot');
      }
    }

    objData._destroyed = true;
    objData.hp = 0;
    if (typeof GameEntities !== 'undefined' && GameEntities.hideObject) {
      GameEntities.hideObject(objData);
    }
    if (typeof GameTerrain !== 'undefined' && GameTerrain.persistObjectState) {
      GameTerrain.persistObjectState(objData);
    }
    if (typeof UnlockSystem !== 'undefined' && UnlockSystem.checkAll) {
      UnlockSystem.checkAll();
    }
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.emit('loot', { x: objData.worldX, y: 0.8, z: objData.worldZ });
    }
    if (window.GameHUD && GameHUD.showNotification) {
      var label = getLocalizedRuinedOutpostLabel(objData);
      var rewardText = rewardParts.length ? rewardParts.join(', ') : t('world.player.suppliesRecovered', null, 'Supplies recovered.');
      GameHUD.showNotification(t('world.player.ruinedOutpostSalvaged', { name: label, rewards: rewardText }, '{name} salvaged: {rewards}'));
    }
    if (window.GameHUD && GameHUD.renderAll) {
      GameHUD.renderAll();
    }

    return true;
  }

  function findNearestBuilding(px, pz, radius) {
    var instances = GameState.getAllInstancesLive ? GameState.getAllInstancesLive() : GameState.getAllInstances();
    var searchRadius = Number(radius) || 0;
    if (!(searchRadius > 0)) return null;
    var nearest = null;
    var nearestDistSq = searchRadius * searchRadius;

    for (var uid in instances) {
      var inst = instances[uid];
      var dx = inst.x - px;
      if (Math.abs(dx) > searchRadius) continue;
      var dz = inst.z - pz;
      if (Math.abs(dz) > searchRadius) continue;
      var distSq = dx * dx + dz * dz;

      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = inst;
      }
    }

    return nearest;
  }

  function collectFromBuilding(buildingInstance) {
    var collected = GameState.collectFromBuilding(buildingInstance.uid);

    var entity = GameRegistry.getEntity(buildingInstance.entityId);
    var buildingName = entity ? entity.name : buildingInstance.entityId;

    var messages = [];
    for (var resId in collected) {
      if (collected[resId] > 0) {
        var resEntity = GameRegistry.getEntity(resId);
        var resName = resEntity ? resEntity.name : resId;
        messages.push("+" + collected[resId] + " " + resName);
      }
    }

    if (messages.length > 0) {
      GameHUD.showSuccess(t('hud.actions.collectedFromBuilding', { name: buildingName, items: messages.join(', ') }, 'Collected from {name}: {items}'));
      UnlockSystem.checkAll();
      GameHUD.renderAll();
    }
  }

  function harvestNode(objData) {
    var balance = GameRegistry.getBalance(objData.type);
    if (!balance) return;

    if (typeof GameTerrain !== 'undefined' && GameTerrain.canHarvestNode && !GameTerrain.canHarvestNode(objData)) {
      var blockedInfo = GameTerrain.getNodeInfo ? GameTerrain.getNodeInfo(objData) : null;
      GameHUD.showNotification(t('hud.player.nodeNotReady', {
        name: blockedInfo ? blockedInfo.name || blockedInfo.label : t('hud.player.thisNode', null, 'This node')
      }, '{name} is not ready yet.'));
      return;
    }

    if (window.NPCSystem && NPCSystem.getActiveHarvestNodes) {
      var activeNodes = NPCSystem.getActiveHarvestNodes();
      var isBeingHarvested = activeNodes.some(function(activeNode) {
        return activeNode.node === objData;
      });

      if (isBeingHarvested) {
        GameHUD.showNotification(t('hud.player.npcAlreadyHarvesting', null, 'An NPC is already harvesting this!'));
        return;
      }
    }

    objData.hp--;

    // Emit harvest particles based on node type
    if (typeof ParticleSystem !== 'undefined') {
      var nodeType = objData.type;
      if (nodeType === "node.tree") ParticleSystem.emit('woodChip', {x: objData.worldX, y: 0.5, z: objData.worldZ});
      else if (nodeType === "node.rock") ParticleSystem.emit('rockDust', {x: objData.worldX, y: 0.3, z: objData.worldZ});
      else if (nodeType === "node.berry_bush") ParticleSystem.emit('berryBurst', {x: objData.worldX, y: 0.4, z: objData.worldZ});
      else if (nodeType === "node.flint_deposit") ParticleSystem.emit('spark', {x: objData.worldX, y: 0.3, z: objData.worldZ});
      else if (nodeType === "node.copper_deposit") ParticleSystem.emit('spark', {x: objData.worldX, y: 0.3, z: objData.worldZ}, {color: 0xB87333});
      else if (nodeType === "node.tin_deposit") ParticleSystem.emit('spark', {x: objData.worldX, y: 0.3, z: objData.worldZ}, {color: 0xC0C0C0});
      else if (nodeType === "node.iron_deposit") ParticleSystem.emit('spark', {x: objData.worldX, y: 0.3, z: objData.worldZ}, {color: 0x8B7355});
      else if (nodeType === "node.coal_deposit") ParticleSystem.emit('rockDust', {x: objData.worldX, y: 0.3, z: objData.worldZ}, {color: 0x2F2F2F});
    }

    GameHUD.showDamageNumber(objData.worldX, 0.5, objData.worldZ, "HIT (" + Math.max(0, objData.hp) + "/" + objData.maxHp + ")", "damage");
    GameHUD.showObjectHpBar(objData, 1200);

    if (objData.hp <= 0 && !objData._destroyed) {
      GameHUD.hideObjectHpBar();
      var harvestResult = (typeof GameTerrain !== 'undefined' && GameTerrain.completeNodeHarvest) ? GameTerrain.completeNodeHarvest(objData) : null;
      var rewardMap = harvestResult && harvestResult.rewards ? harvestResult.rewards : balance.rewards;

      if (rewardMap) {
        for (var resId in rewardMap) {
          var amount = rewardMap[resId];
          GameState.addResource(resId, amount);
          var resEntity = GameRegistry.getEntity(resId);
          var resName = resEntity ? resEntity.name : resId;
          GameHUD.showDamageNumber(objData.worldX, 1.2, objData.worldZ, "+" + amount + " " + resName, "loot");
        }
      }
      UnlockSystem.checkAll();
      GameHUD.renderAll();
    }

    GameHUD.renderAll();
  }

  function getEquipmentVisualColor(equipmentId, fallbackColor) {
    var color = fallbackColor;
    var entity = GameRegistry.getEntity(equipmentId);
    if (entity && entity.id) {
      if (entity.id.indexOf('wooden') > -1 || entity.id.indexOf('hunting') > -1) color = 0x8B6914;
      else if (entity.id.indexOf('stone') > -1) color = 0x808080;
      else if (entity.id.indexOf('bronze') > -1) color = 0xB87333;
      else if (entity.id.indexOf('iron') > -1) color = 0x6A6A6A;
    }
    return color;
  }

  function createWeaponVisual(weaponId) {
    if (typeof THREE === 'undefined' || !weaponId) return null;

    var group = new THREE.Group();
    var balance = GameRegistry.getBalance(weaponId) || {};
    var profileId = balance.weaponProfile || 'sword';
    var metalColor = getEquipmentVisualColor(weaponId, 0xA0A0A0);
    var woodColor = weaponId.indexOf('bow') !== -1 ? 0x7c5731 : 0x5c4033;

    function addMesh(geometry, material, x, y, z, rotX, rotY, rotZ) {
      var part = new THREE.Mesh(geometry, material);
      part.position.set(x || 0, y || 0, z || 0);
      part.rotation.set(rotX || 0, rotY || 0, rotZ || 0);
      part.castShadow = true;
      group.add(part);
      return part;
    }

    if (profileId === 'special') {
      if (weaponId.indexOf('sunpiercer') !== -1) {
        addMesh(new THREE.TorusGeometry(0.15, 0.014, 8, 22, Math.PI), new THREE.MeshLambertMaterial({ color: 0xa06a28 }), 0.01, 0.18, 0.03, Math.PI / 2, 0, Math.PI / 2);
        addMesh(new THREE.BoxGeometry(0.004, 0.3, 0.004), new THREE.MeshBasicMaterial({ color: 0xfff1c1 }), 0.01, 0.18, 0.03);
        addMesh(new THREE.ConeGeometry(0.03, 0.11, 6), new THREE.MeshLambertMaterial({ color: 0xffd166 }), 0.12, 0.29, 0.03, 0, 0, 0.88);
      } else if (weaponId.indexOf('stormspine') !== -1 || weaponId.indexOf('glaive') !== -1) {
        addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 6), new THREE.MeshLambertMaterial({ color: 0x5c4033 }), 0.02, 0.2, 0.02, 0, 0, 0.16);
        addMesh(new THREE.ConeGeometry(0.034, 0.14, 6), new THREE.MeshLambertMaterial({ color: 0x7ef0d0 }), 0.08, 0.43, 0.02, 0, 0, Math.PI - 0.16);
        addMesh(new THREE.BoxGeometry(0.08, 0.03, 0.02), new THREE.MeshLambertMaterial({ color: 0xaaf9ec }), 0.02, 0.32, 0.02, 0, 0, 0.16);
      } else {
        addMesh(new THREE.BoxGeometry(0.03, 0.34, 0.04), new THREE.MeshLambertMaterial({ color: 0xc8ddff }), 0.03, 0.22, 0.02, 0, 0, -0.14);
        addMesh(new THREE.BoxGeometry(0.08, 0.03, 0.05), new THREE.MeshLambertMaterial({ color: 0x5c4033 }), 0.03, 0.05, 0.02);
        addMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 10), new THREE.MeshLambertMaterial({ color: 0xaed7ff }), 0.03, 0.39, 0.02, Math.PI / 2, 0, 0);
      }
    } else if (profileId === 'bow') {
      addMesh(new THREE.TorusGeometry(0.14, 0.012, 6, 20, Math.PI), new THREE.MeshLambertMaterial({ color: woodColor }), 0.01, 0.18, 0.03, Math.PI / 2, 0, Math.PI / 2);
      addMesh(new THREE.BoxGeometry(0.003, 0.28, 0.003), new THREE.MeshBasicMaterial({ color: 0xf2ead2 }), 0.01, 0.18, 0.03);
      addMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), new THREE.MeshLambertMaterial({ color: metalColor }), 0.12, 0.17, 0.03, 0.2, 0, 0.9);
    } else if (profileId === 'spear') {
      addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), new THREE.MeshLambertMaterial({ color: woodColor }), 0.02, 0.18, 0.02, 0, 0, 0.18);
      addMesh(new THREE.ConeGeometry(0.028, 0.1, 6), new THREE.MeshLambertMaterial({ color: metalColor }), 0.07, 0.39, 0.02, 0, 0, Math.PI - 0.18);
    } else {
      addMesh(new THREE.BoxGeometry(0.028, 0.3, 0.04), new THREE.MeshLambertMaterial({ color: metalColor }), 0.03, 0.2, 0.02, 0, 0, -0.12);
      addMesh(new THREE.BoxGeometry(0.07, 0.03, 0.05), new THREE.MeshLambertMaterial({ color: woodColor }), 0.03, 0.05, 0.02);
      addMesh(new THREE.BoxGeometry(0.022, 0.09, 0.03), new THREE.MeshLambertMaterial({ color: woodColor }), 0.03, -0.02, 0.02);
    }

    group.userData.weaponId = weaponId;
    group.position.set(0.3, -0.05, 0.15);
    return group;
  }

  function createShieldVisual(offhandId) {
    if (typeof THREE === 'undefined' || !offhandId) return null;

    var group = new THREE.Group();
    var shieldColor = getEquipmentVisualColor(offhandId, 0x8B7355);
    var outer = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.2), new THREE.MeshLambertMaterial({ color: shieldColor }));
    outer.castShadow = true;
    group.add(outer);

    var boss = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8), new THREE.MeshLambertMaterial({ color: 0xd6c38d }));
    boss.rotation.x = Math.PI / 2;
    boss.position.z = 0.05;
    boss.castShadow = true;
    group.add(boss);

    group.userData.offhandId = offhandId;
    group.position.set(-0.3, 0.0, 0.0);
    return group;
  }

  // === Equipment 3D Visuals ===
  function updateEquipmentVisuals() {
    if (!mesh) return;
    var player = GameState.getPlayer();
    if (!player || !player.equipped) return;

    var weaponId = player.equipped.weapon;
    var currentWeaponVisualId = _weaponMesh && _weaponMesh.userData ? _weaponMesh.userData.weaponId : null;
    if (weaponId !== currentWeaponVisualId) {
      if (_weaponMesh) {
        mesh.remove(_weaponMesh);
        _weaponMesh = null;
      }
      if (weaponId) {
        _weaponMesh = createWeaponVisual(weaponId);
        if (_weaponMesh) mesh.add(_weaponMesh);
      }
    }

    var offhandId = player.equipped.offhand;
    var currentShieldVisualId = _shieldMesh && _shieldMesh.userData ? _shieldMesh.userData.offhandId : null;
    if (offhandId !== currentShieldVisualId) {
      if (_shieldMesh) {
        mesh.remove(_shieldMesh);
        _shieldMesh = null;
      }
      if (offhandId) {
        _shieldMesh = createShieldVisual(offhandId);
        if (_shieldMesh) mesh.add(_shieldMesh);
      }
    }

    // Armor body color
    var armorId = player.equipped.armor;
    if (armorId && mesh) {
      mesh.traverse(function (child) {
        if (child.name === 'body' && child.isMesh) {
          var armorEntity = GameRegistry.getEntity(armorId);
          if (armorEntity && armorEntity.id) {
            if (armorEntity.id.indexOf('leather') > -1) {
              child.material.color.setHex(0x8B5A2B);
            } else if (armorEntity.id.indexOf('bronze') > -1) {
              child.material.color.setHex(0x5a7799);
            } else if (armorEntity.id.indexOf('iron') > -1) {
              child.material.color.setHex(0x5577aa);
            }
          }
        }
      });
    } else if (!armorId && mesh) {
      mesh.traverse(function (child) {
        if (child.name === 'body' && child.isMesh) {
          child.material.color.setHex(0x4488cc);
        }
      });
    }

    // Boots leg color
    var bootsId = player.equipped.boots;
    if (bootsId) {
      mesh.traverse(function (child) {
        if ((child.name === 'leftLeg' || child.name === 'rightLeg') && child.isMesh) {
          child.material.color.setHex(0x654321);
        }
      });
    } else {
      mesh.traverse(function (child) {
        if ((child.name === 'leftLeg' || child.name === 'rightLeg') && child.isMesh) {
          child.material.color.setHex(0x3a3a5c);
        }
      });
    }
  }

  // === Public API ===
  function isEating() { return _isEating; }
  function isRegenerating() {
    var isInCombat = (window.GameCombat && GameCombat.isActive && GameCombat.isActive());
    return !isInCombat && (_animTime - _lastCombatTime > 3);
  }
  function hasTorchLight() { return _torchActive; }
  function getTorchFuel() { return _torchFuel; }

  function getPosition() {
    return { x: _x, z: _z };
  }

  function setPosition(x, z) {
    _x = x;
    _z = z;
    _contextRefreshAccumulator = 999;
    _lastContextQueryPos.x = Infinity;
    _lastContextQueryPos.z = Infinity;
    if (mesh) {
      mesh.position.set(x, 0, z);
    }
    if (GameState && GameState.setPlayerPosition) {
      GameState.setPlayerPosition(x, z);
    }
  }

  function getDirection() {
    return _direction;
  }

  function getMesh() {
    return mesh;
  }

  function updateTorchFlame(t, flicker) {
    if (!_torchMesh) return;
    var flameOuter = _torchMesh.getObjectByName('torchFlame');
    var flameInner = _torchMesh.getObjectByName('torchFlameInner');
    var glow = _torchMesh.getObjectByName('torchGlow');

    if (flameOuter) {
      if (flameOuter.userData.baseScaleY === undefined) {
        flameOuter.userData.baseScaleY = flameOuter.scale.y;
        flameOuter.userData.baseScaleX = flameOuter.scale.x;
        flameOuter.userData.baseScaleZ = flameOuter.scale.z;
      }
      var sf = 1.0 + flicker * 2.5;
      flameOuter.scale.y = flameOuter.userData.baseScaleY * sf;
      flameOuter.scale.x = flameOuter.userData.baseScaleX * (1.0 + flicker * 0.5);
      flameOuter.scale.z = flameOuter.userData.baseScaleZ * (1.0 + flicker * 0.5);
      flameOuter.rotation.z = Math.sin(t * 8.0) * 0.08;
      flameOuter.rotation.x = Math.sin(t * 6.0) * 0.05;
    }
    if (flameInner) {
      if (flameInner.userData.baseScaleY === undefined) {
        flameInner.userData.baseScaleY = flameInner.scale.y;
      }
      flameInner.scale.y = flameInner.userData.baseScaleY * (1.0 + flicker * 2.0);
    }
    if (glow) {
      var gp = 0.5 + 0.5 * Math.sin(t * 4.0);
      glow.material.opacity = gp * 0.25 + 0.05;
      var gs = 0.85 + 0.2 * Math.sin(t * 3.5);
      glow.scale.set(gs, gs, gs);
    }
  }

  return {
    init: init,
    update: update,
    getPosition: getPosition,
    setPosition: setPosition,
    getDirection: getDirection,
    getMesh: getMesh,
    interactNearby: interactNearby,
    startEat: startEat,
    triggerSpeechCue: triggerSpeechCue,
    isEating: isEating,
    isRegenerating: isRegenerating,
    hasTorchLight: hasTorchLight,
    getTorchFuel: getTorchFuel,
    updateTorchFlame: updateTorchFlame,
    updateEquipmentVisuals: updateEquipmentVisuals
  };
})();