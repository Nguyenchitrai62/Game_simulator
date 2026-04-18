window.GamePlayer = (function () {
  var mesh;
  var _x = 8, _z = 8;
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
  var _tutBubbleEl = null, _tutBubbleTextEl = null;
  var _tutKey = null;
  var _tutScreenPt = {};
  var _speechScanScreenPt = {};
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

  function init(startX, startZ) {
    _x = startX || 8;
    _z = startZ || 8;

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
          GameHUD.openModal();
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
        var entity = GameRegistry.getEntity(objData.type);
        var name = entity ? entity.name : objData.type;
        if (objData.type.startsWith('animal.')) {
          var balance = GameRegistry.getBalance(objData.type);
          var info = name + ' | HP: ' + objData.hp + '/' + objData.maxHp;
          if (balance) info += ' | ATK: ' + (balance.attack || 0) + ' DEF: ' + (balance.defense || 0);
          info += ' | ' + ((GameRegistry.isAnimalThreat && GameRegistry.isAnimalThreat(objData.type)) ? 'Threat' : 'Prey');
          GameHUD.showNotification(info);
        } else if (objData.type.startsWith('node.')) {
          GameHUD.showNotification(name + ' | HP: ' + objData.hp + '/' + objData.maxHp);
        }
      }
    }

  }

  // === MANUAL EAT: press F or click Eat button ===
  function startEat() {
    if (_isEating) return; // already eating

    var foodAmount = GameState.getResource("resource.food");
    if (foodAmount < 1) {
      if (typeof GameHUD !== 'undefined') GameHUD.showNotification("No food available.");
      return;
    }

    var currentHunger = GameState.getHunger();
    var maxHunger = GameState.getMaxHunger();
    if (currentHunger >= maxHunger) {
      if (typeof GameHUD !== 'undefined') GameHUD.showNotification("Already full.");
      return;
    }

    // Consume 1 food, start eating
    GameState.removeResource("resource.food", 1);
    var balance = window.GAME_BALANCE || {};
    var hungerConfig = balance.hunger || {};
    var eatDuration = Number(hungerConfig.eatDuration);
    if (!(eatDuration > 0)) eatDuration = 0.5;
    _isEating = true;
    _eatTimer = eatDuration;

    if (typeof GameHUD !== 'undefined') GameHUD.showNotification("Eating... (" + eatDuration.toFixed(1) + "s)");
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

  function _getSpeechDuration(config, fallbackSeconds) {
    var duration = Number(config && config.duration);
    return duration > 0 ? duration : fallbackSeconds;
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
    if (_tutKey === 'lag' || key === 'lag') {
      _setLagAudioActive(false, _getSpeechValue('tutorials.lag.audioPath', ''));
    }
    _tutKey = null;
  }

  function _markTutSeen(key) {
    if (_tutState[key]) return;
    _tutState[key] = true;
    _saveTut();
    _hideTut(key);
  }

  function _setLagAudioActive(active, audioPath) {
    active = !!active;
    if (_tutLagAudioActive === active && !audioPath) return;
    _tutLagAudioActive = active;
    if (window.GameAudioController && GameAudioController.setLagOverride) {
      GameAudioController.setLagOverride(active, audioPath);
    }
  }

  function _queuePlayerSpeech(key, config, tokens) {
    if (!config || !config.text) return false;

    _runtimeSpeech = {
      key: key,
      html: _formatSpeechText(config.text, tokens),
      remaining: _getSpeechDuration(config, 2.5)
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
    var scanInterval = Number(config.scanInterval);
    if (!(scanInterval > 0)) scanInterval = 0.6;
    if (_resourceDiscoveryTimer < scanInterval) return;
    _resourceDiscoveryTimer = 0;

    var watchedResourceIds = config.resourceIds || [];
    var maxDistance = Number(config.maxDistance);
    if (!(maxDistance > 0)) maxDistance = 18;

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
            name: resourceEntity ? resourceEntity.name : resId,
            distanceSq: distanceSq
          };
        }
      }
    }

    if (!bestCandidate) return;
    _tutState.seenResources[bestCandidate.resId] = true;
    _saveTut();
    _queuePlayerSpeech('resourceDiscovery', config, { name: bestCandidate.name });
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

    var anchorY = Number(config.anchorY);
    if (!(anchorY > 0)) {
      anchorY = Number(_getSpeechValue('worldAnchorY', 1.75));
    }
    if (!(anchorY > 0)) anchorY = 1.75;

    _worldSpeech = {
      key: key,
      html: _formatSpeechText(config.text, tokens),
      objectId: objectId,
      remaining: _getSpeechDuration(config, 2.5),
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
    if (!mesh || !_isMeshVisibleOnScreen(mesh, _worldSpeech.anchorY || 1.75, 0, _worldSpeechScreenPt)) {
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

    var maxDistance = Number(config && config.maxDistance);
    if (!(maxDistance > 0)) maxDistance = 18;

    var meshes = GameEntities.getAllMeshes();
    var bestCandidate = null;
    for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
      var mesh = meshes[meshIndex];
      var objData = GameEntities.getDataFromMesh(mesh);
      if (!_isEligibleThreatTauntTarget(objData, config)) continue;
      if (!_isMeshVisibleOnScreen(mesh, Number(_getSpeechValue('worldAnchorY', 1.75)) || 1.75, maxDistance, _speechScanScreenPt)) continue;

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
      var maxDistance = Number(config.maxDistance);
      if (!(maxDistance > 0)) maxDistance = 18;

      if (!threatData || !_isEligibleThreatTauntTarget(threatData, config) || !threatMesh || !_isMeshVisibleOnScreen(threatMesh, Number(_getSpeechValue('worldAnchorY', 1.75)) || 1.75, maxDistance, _speechScanScreenPt)) {
        _clearThreatSession(false);
      } else if (window.GameCombat && GameCombat.isActive && GameCombat.getTarget) {
        var combatTarget = GameCombat.getTarget();
        if (combatTarget && combatTarget.id === _threatSession.objectId) {
          _handleThreatEngaged(combatTarget);
        }
      }

      if (_threatSession) {
        _threatSession.noAttackTimer += dt;
        var delaySeconds = Number(idleConfig.delaySeconds);
        if (!(delaySeconds > 0)) delaySeconds = 7;
        if (!_threatSession.nudged && _threatSession.noAttackTimer >= delaySeconds && !_runtimeSpeech && _tutKey !== 'lag' && !suppressNewTaunts) {
          _queuePlayerSpeech('threatIdleNudge', idleConfig, null);
          _threatSession.nudged = true;
          _clearThreatSession(true);
        }
      }
    }

    if (!_threatSession && _threatTauntCooldown <= 0 && !suppressNewTaunts) {
      _threatTauntScanTimer += dt;
      var scanInterval = Number(config.scanInterval);
      if (!(scanInterval > 0)) scanInterval = 0.8;

      if (_threatTauntScanTimer >= scanInterval) {
        _threatTauntScanTimer = 0;
        var candidate = _findVisibleThreatTauntTarget(config);
        if (candidate) {
          var chance = Number(firstConfig.chance);
          if (!(chance >= 0)) chance = 0.35;

          if (Math.random() <= chance) {
            _threatSession = {
              objectId: candidate.data.id,
              noAttackTimer: 0,
              nudged: false
            };
            _queueWorldSpeech('threatTaunt', firstConfig, candidate.data.id, { name: candidate.name });
          } else {
            var retrySeconds = Number(config.retrySeconds);
            _threatTauntCooldown = retrySeconds > 0 ? retrySeconds : 6;
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
    var minFps = Number(config.minFps);
    if (!(minFps > 0)) minFps = 40;
    var triggerSeconds = Number(config.triggerSeconds);
    if (!(triggerSeconds > 0)) triggerSeconds = 2.5;
    var recoverFps = Number(config.recoverFps);
    if (!(recoverFps > 0)) recoverFps = 45;
    var recoverSeconds = Number(config.recoverSeconds);
    if (!(recoverSeconds > 0)) recoverSeconds = 1.25;
    var lagText = _formatSpeechText(config.text || 'Ối dồi ôi, LAG rồi này, vãi lìn. Vào setting hạ xuống low đi.', null);

    if (!shouldSuggestLow || !(fps > 0)) {
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
      return;
    }

    if (_isSpeechSuppressedByUi()) {
      _tutBubbleEl.className = 'tutorial-bubble';
      return;
    }

    var anchorY = Number(_getSpeechValue('playerAnchorY', 2.7));
    if (!(anchorY > 0)) anchorY = 2.7;

    if (window.GameScene && GameScene.projectWorldToScreen) {
      var pt = GameScene.projectWorldToScreen(_x, anchorY, _z, _tutScreenPt);
      if (pt && pt.z < 1) {
        _applyPlayerBubbleVisibility();
        _tutBubbleEl.style.left = Math.round(pt.x) + 'px';
        _tutBubbleEl.style.top = Math.round(pt.y - 10) + 'px';
      } else {
        _tutBubbleEl.className = 'tutorial-bubble';
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

    // Early exit if all onboarding tutorials are done and no runtime warning is active
    if (!lagActive && !runtimeActive && _tutState.harvest && _tutState.eat && _tutState.night) {
      return;
    }

    if (!lagActive && !runtimeActive) {
      var harvestConfig = _getTutorialSpeechConfig('harvest') || { text: 'Nhấn <span class="tut-key">[E]</span> để thu hoạch!' };
      var eatConfig = _getTutorialSpeechConfig('eat') || { text: 'Đói rồi! Nhấn <span class="tut-key">[F]</span> để ăn' };
      var nightConfig = _getTutorialSpeechConfig('night') || { text: 'Trời tối! Xây <span class="tut-key">Lửa Trại</span> để an toàn 🔥', duration: 9 };

      // Priority 1: harvest tutorial — near a harvestable resource node
      if (!_tutState.harvest) {
        if (_tutLastNearNode) {
          _showTut('harvest', _formatSpeechText(harvestConfig.text, null));
        } else if (_tutKey === 'harvest') {
          _hideTut('harvest');
        }
      }

      // Priority 2: hunger tutorial — hungry and has food, nothing else showing
      if (!_tutState.eat && !_tutKey) {
        var hunger = GameState.getHunger ? GameState.getHunger() : 100;
        var maxHunger = GameState.getMaxHunger ? GameState.getMaxHunger() : 100;
        var food = GameState.getResource ? GameState.getResource('resource.food') : 0;
        if (hunger < maxHunger * 0.6 && food >= 1) {
          _showTut('eat', _formatSpeechText(eatConfig.text, null));
        }
      }

      // Priority 3: night/fire tutorial — first time it gets dark
      if (!_tutState.night && !_tutKey) {
        var isNt = typeof DayNightSystem !== 'undefined' && DayNightSystem.isNight && DayNightSystem.isNight();
        if (isNt) {
          _showTut('night', _formatSpeechText(nightConfig.text, null));
          _tutNightTimer = 0;
        }
      }
    }

    // Auto-dismiss night tutorial after 9 seconds
    if (_tutKey === 'night') {
      var activeNightConfig = _getTutorialSpeechConfig('night') || { duration: 9 };
      _tutNightTimer += dt;
      if (_tutNightTimer >= _getSpeechDuration(activeNightConfig, 9)) _markTutSeen('night');
    }

    _updateTutBubblePosition();
  }

  function update(dt) {
    _animTime += dt;
    _visualAnimTime += Math.min(dt, 1 / 30);
    var moved = false;

    var _speed = GameState.getPlayerSpeed ? GameState.getPlayerSpeed() : 3;

    // Speed penalty when very hungry (hunger < 20)
    var hunger = GameState.getHunger ? GameState.getHunger() : 100;
    if (hunger < 20) {
      var hungerBalance = (window.GAME_BALANCE && GAME_BALANCE.hunger) || {};
      _speed *= (hungerBalance.hungrySpeedMult || 0.5);
    }

    // Speed penalty while eating
    if (_isEating) {
      var hungerBalance2 = (window.GAME_BALANCE && GAME_BALANCE.hunger) || {};
      _speed *= (hungerBalance2.eatSpeedMult || 0.5);
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
        speedMultiplier = 0.5;
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
      var balance = window.GAME_BALANCE || {};
      var hungerConfig = balance.hunger || {};
      var foodRestore = (hungerConfig.foodRestore || {})[("resource.food")] || 5;
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
          GameHUD.showNotification("Torch burned out.");
        }
      }
    }

    // Activate torch if dark and has one in inventory
    if (!_torchActive && isDark) {
      var torchCount = GameState.getInventoryCount("item.handheld_torch");
      if (torchCount > 0) {
        GameState.removeFromInventory("item.handheld_torch", 1);
        var torchBalance = GameRegistry.getBalance("item.handheld_torch") || {};
        _torchFuel = torchBalance.duration || 60;
        _torchActive = true;
        createTorchMesh();
        if (typeof GameHUD !== 'undefined') {
          GameHUD.showNotification("Hand torch lit. (" + Math.floor(_torchFuel) + "s)");
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

  function buildFarmPrompt(status) {
    if (!status) return null;

    var plotName = status.plotName || 'Farm Plot';

    if (status.storedAmount > 0) {
      return 'Collect ' + plotName + ' [' + status.storedAmount + ' stored]';
    }

    if (!status.hasWorkerSupport && !status.planted) {
      return plotName + ' [Needs worker]';
    }

    var parts = [plotName];
    parts.push('[' + status.statusText + ']');

    if (status.planted && !status.ready) {
      parts.push(status.progressPercent + '%');
    }

    return parts.join(' ');
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
      return rewardPreview || 'Food';
    }

    var detail = nodeInfo.stateLabel || '';
    if (rewardPreview) {
      detail = detail ? detail + ' • ' + rewardPreview : rewardPreview;
    }
    return detail;
  }

  function updateContextAction() {
    var nearObj = GameTerrain.findNearestObject(_x, _z, 2.5);
    var el = document.getElementById('context-action');
    var textEl = document.getElementById('context-text');

    // Reset tutorial node flag each refresh; set to true below if a node is actually nearby
    _tutLastNearNode = false;

    var nearBuilding = findNearestBuilding(_x, _z, 2.5);
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
        textEl.textContent = 'Collect from ' + name + ' (' + totalAmount + ' items)';
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
      var action = nearObj.type.startsWith("animal.") ? ((GameRegistry.isAnimalThreat && GameRegistry.isAnimalThreat(nearObj.type)) ? "Fight" : "Hunt") : nearObj.type === "node.berry_bush" ? "Gather" : nearObj.type.startsWith("node.") ? "Harvest" : "Interact";
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
    var nearBuilding = findNearestBuilding(_x, _z, 2.5);
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

    var nearObj = GameTerrain.findNearestObject(_x, _z, 2.5);
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
    }
  }

  function findNearestBuilding(px, pz, radius) {
    var instances = GameState.getAllInstancesLive ? GameState.getAllInstancesLive() : GameState.getAllInstances();
    var searchRadius = radius || 2.5;
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
      GameHUD.showSuccess("Collected from " + buildingName + ": " + messages.join(", "));
      UnlockSystem.checkAll();
      GameHUD.renderAll();
    }
  }

  function harvestNode(objData) {
    var balance = GameRegistry.getBalance(objData.type);
    if (!balance) return;

    if (typeof GameTerrain !== 'undefined' && GameTerrain.canHarvestNode && !GameTerrain.canHarvestNode(objData)) {
      var blockedInfo = GameTerrain.getNodeInfo ? GameTerrain.getNodeInfo(objData) : null;
      GameHUD.showNotification((blockedInfo ? blockedInfo.name || blockedInfo.label : 'This node') + ' is not ready yet.');
      return;
    }

    if (window.NPCSystem && NPCSystem.getActiveHarvestNodes) {
      var activeNodes = NPCSystem.getActiveHarvestNodes();
      var isBeingHarvested = activeNodes.some(function(activeNode) {
        return activeNode.node === objData;
      });

      if (isBeingHarvested) {
        GameHUD.showNotification("An NPC is already harvesting this!");
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

  // === Equipment 3D Visuals ===
  function updateEquipmentVisuals() {
    if (!mesh) return;
    var player = GameState.getPlayer();
    if (!player || !player.equipped) return;

    // Weapon
    var weaponId = player.equipped.weapon;
    if (weaponId && !_weaponMesh) {
      var weaponGeo = new THREE.BoxGeometry(0.04, 0.3, 0.06);
      var weaponColor = 0xA0A0A0;
      var wep = GameRegistry.getEntity(weaponId);
      if (wep && wep.id) {
        if (wep.id.indexOf('wooden') > -1) weaponColor = 0x8B6914;
        else if (wep.id.indexOf('stone') > -1) weaponColor = 0x808080;
        else if (wep.id.indexOf('bronze') > -1) weaponColor = 0xB87333;
        else if (wep.id.indexOf('iron') > -1) weaponColor = 0x6A6A6A;
      }
      var weaponMat = new THREE.MeshLambertMaterial({ color: weaponColor });
      _weaponMesh = new THREE.Mesh(weaponGeo, weaponMat);
      _weaponMesh.castShadow = true;
      mesh.add(_weaponMesh);
      _weaponMesh.position.set(0.3, -0.05, 0.15);
    } else if (!weaponId && _weaponMesh) {
      mesh.remove(_weaponMesh);
      _weaponMesh = null;
    }

    // Shield (offhand)
    var offhandId = player.equipped.offhand;
    if (offhandId && !_shieldMesh) {
      var shieldGeo = new THREE.BoxGeometry(0.04, 0.2, 0.18);
      var shieldColor = 0x8B7355;
      var shld = GameRegistry.getEntity(offhandId);
      if (shld && shld.id) {
        if (shld.id.indexOf('wooden') > -1) shieldColor = 0x8B6914;
        else if (shld.id.indexOf('stone') > -1) shieldColor = 0x808080;
        else if (shld.id.indexOf('bronze') > -1) shieldColor = 0xB87333;
        else if (shld.id.indexOf('iron') > -1) shieldColor = 0x6A6A6A;
      }
      var shieldMat = new THREE.MeshLambertMaterial({ color: shieldColor });
      _shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      _shieldMesh.castShadow = true;
      mesh.add(_shieldMesh);
      _shieldMesh.position.set(-0.3, 0.0, 0.0);
    } else if (!offhandId && _shieldMesh) {
      mesh.remove(_shieldMesh);
      _shieldMesh = null;
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