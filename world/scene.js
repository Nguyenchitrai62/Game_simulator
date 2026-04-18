window.GameScene = (function () {
  var scene, camera, renderer;
  var _animFrameId = null;
  var _lastTime = 0;
  var _tickAccumulator = 0;
  var TICK_INTERVAL = 1000;
  var _zoom = 10;
  var MIN_ZOOM = 6;
  var MAX_ZOOM = 10;
  var _sunLight = null;
  var _lastShadowCenter = { x: Infinity, z: Infinity };
  var _fireMaskCtx = null;
  var _fireMaskUpdateAccumulator = 0;
  var _fireMaskWorldPos = null;
  var _fireMaskStampCache = {};
  var _overlayIdleAccumulator = 0;
  var _cameraFrustum = null;
  var _projectionScreenMatrix = null;
  var _worldToScreenVector = null;
  var _lastOverlayPlayerPos = { x: Infinity, z: Infinity };
  var _lastOverlayCameraPos = { x: Infinity, y: Infinity, z: Infinity };
  var _basePixelRatio = 1;
  var _currentPixelRatio = 1;
  var _adaptiveResolutionAccumulator = 0;
  var gameSpeed = 1.0;
  var isPaused = false;
  var speedSteps = [0.25, 0.5, 1, 2, 5];

  function beginPerfMark(name) {
    return (typeof GamePerf !== 'undefined' && GamePerf.begin) ? GamePerf.begin(name) : null;
  }

  function endPerfMark(mark) {
    if (mark && typeof GamePerf !== 'undefined' && GamePerf.end) {
      GamePerf.end(mark);
    }
  }

  function isRuntimeSettingEnabled(key) {
    return !window.GameDebugSettings || !GameDebugSettings.isEnabled || GameDebugSettings.isEnabled(key);
  }

  function init() {
    console.log('[GameScene] Initializing 3D scene...');
    
    if (typeof THREE === 'undefined') {
      console.error('[GameScene] ❌ THREE.js not loaded!');
      alert('ERROR: THREE.js library not loaded. Cannot start game.');
      return;
    }
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 40, 80);

    var aspect = window.innerWidth / window.innerHeight;
    var d = _zoom;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 200);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('game-canvas'),
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    _basePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    _currentPixelRatio = _basePixelRatio;
    renderer.setPixelRatio(_currentPixelRatio);
    if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
      GamePerf.setValue('render.pixelRatio', _currentPixelRatio);
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;

    // Ambient light (scaled for physicallyCorrectLights)
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Directional light (sun) (scaled for physicallyCorrectLights)
    var dirLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -35;
    dirLight.shadow.camera.right = 35;
    dirLight.shadow.camera.top = 35;
    dirLight.shadow.camera.bottom = -35;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);
    _sunLight = dirLight;

    // Hemisphere light for nicer colors
    var hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x7ec850, 0.4);
    scene.add(hemiLight);

    window.addEventListener('resize', onResize);
    onResize();

    var flmCanvas = document.getElementById('fire-light-mask');
    if (flmCanvas) {
      flmCanvas.width = window.innerWidth;
      flmCanvas.height = window.innerHeight;
      _fireMaskCtx = flmCanvas.getContext('2d');
    }

    startLoop();
  }

  function onResize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var aspect = w / h;
    var d = _zoom;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(_currentPixelRatio);

    var flmCanvas = document.getElementById('fire-light-mask');
    if (flmCanvas) {
      flmCanvas.width = w;
      flmCanvas.height = h;
      if (!_fireMaskCtx) {
        _fireMaskCtx = flmCanvas.getContext('2d');
      }
    }
  }

  function setZoom(delta) {
    // Keep zoom-out slightly tighter to reduce render load and preserve readability.
    _zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, _zoom + delta));
    onResize();
  }

  function setRendererPixelRatio(nextRatio) {
    if (!renderer) return _currentPixelRatio;

    var minPixelRatio = Math.min(_basePixelRatio, 0.75);
    var clamped = Math.max(minPixelRatio, Math.min(_basePixelRatio, nextRatio));
    if (Math.abs(clamped - _currentPixelRatio) < 0.01) return _currentPixelRatio;

    _currentPixelRatio = clamped;
    renderer.setPixelRatio(_currentPixelRatio);
    if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
      GamePerf.setValue('render.pixelRatio', _currentPixelRatio);
    }
    return _currentPixelRatio;
  }

  function updateAdaptiveResolution(dt) {
    if (!renderer) return;

    _adaptiveResolutionAccumulator += dt;
    if (_adaptiveResolutionAccumulator < 1.5) return;
    _adaptiveResolutionAccumulator = 0;

    var frameMs = (typeof GamePerf !== 'undefined' && GamePerf.getValue) ? (GamePerf.getValue('frame.ms') || 0) : 0;
    if (!(frameMs > 0)) return;

    var minPixelRatio = Math.min(_basePixelRatio, 0.75);
    if (frameMs > 26.5 && _currentPixelRatio > minPixelRatio + 0.01) {
      setRendererPixelRatio(_currentPixelRatio - 0.125);
    } else if (frameMs < 17.5 && _currentPixelRatio < _basePixelRatio - 0.01) {
      setRendererPixelRatio(_currentPixelRatio + 0.125);
    }
  }

  function startLoop() {
    console.log('[GameScene] Starting render loop...');
    
    if (!renderer) {
      console.error('[GameScene] ❌ Renderer not initialized!');
      return;
    }
    
    if (!scene) {
      console.error('[GameScene] ❌ Scene not initialized!');
      return;
    }
    
    console.log('[GameScene] ✅ Scene initialized with', scene.children.length, 'objects');
    
    _lastTime = performance.now();
    function loop(now) {
      _animFrameId = requestAnimationFrame(loop);
      var dt = (now - _lastTime) / 1000;
      _lastTime = now;
      var playerPos = (typeof GamePlayer !== 'undefined' && GamePlayer.getPosition) ? GamePlayer.getPosition() : null;

      if (dt > 0.1) dt = 0.1;

      if (typeof GamePerf !== 'undefined' && GamePerf.beginFrame) {
        GamePerf.beginFrame(dt);
        GamePerf.setValue('scene.zoom', _zoom);
        GamePerf.setValue('scene.children', scene && scene.children ? scene.children.length : 0);
      }

      // Apply game speed
      var effectiveDt = dt * gameSpeed;

      if (!isPaused) {
        var simulationMark = beginPerfMark('simulation.update');

        // Update player movement
        if (typeof GamePlayer !== 'undefined') GamePlayer.update(effectiveDt);

        // Update entities (animations, respawns)
        if (typeof GameEntities !== 'undefined') GameEntities.update(effectiveDt);

        // Update NPCs (workers)
        if (typeof NPCSystem !== 'undefined' && isRuntimeSettingEnabled('npcs')) NPCSystem.update(effectiveDt);

        // Update combat
        if (typeof GameCombat !== 'undefined') GameCombat.update(effectiveDt);

        // Update deployed barracks troops
        if (typeof BarracksTroopSystem !== 'undefined' && isRuntimeSettingEnabled('barracksTroops')) BarracksTroopSystem.update(effectiveDt);

        // Game tick accumulator (1 second)
        _tickAccumulator += effectiveDt;
        if (_tickAccumulator >= 1.0) {
          _tickAccumulator -= 1.0;
          if (typeof TickSystem !== 'undefined') TickSystem.tick();
        }

        endPerfMark(simulationMark);
      } else {
        var pausedSimulationMark = beginPerfMark('simulation.paused');

        // Always run auto-save even when paused
        _tickAccumulator += dt;
        if (_tickAccumulator >= 1.0) {
          _tickAccumulator -= 1.0;
          if (typeof TickSystem !== 'undefined') TickSystem.tickPausedOnly();
        }

        endPerfMark(pausedSimulationMark);
      }

      // Update camera to follow player
      updateCamera(playerPos);

      if (typeof GameTerrain !== 'undefined' && GameTerrain.refreshVisibility) {
        GameTerrain.refreshVisibility();
      }

      if (typeof GameHUD !== 'undefined' && GameHUD.updateTrackedObjectHpBar) {
        GameHUD.updateTrackedObjectHpBar(dt);
      }

      // Keep overlays smooth while moving, but throttle them lightly when the camera is idle.
      if (isRuntimeSettingEnabled('hud') && isRuntimeSettingEnabled('worldLabels') && shouldRefreshWorldOverlays(dt, playerPos)) {
        var overlayMark = beginPerfMark('overlays.update');
        if (typeof GameHUD !== 'undefined' && GameHUD.updateNodeHpBars) GameHUD.updateNodeHpBars();
        if (typeof GameHUD !== 'undefined' && GameHUD.updateBuildingStorageLabels) GameHUD.updateBuildingStorageLabels();
        if (typeof GameHUD !== 'undefined' && GameHUD.updateNodeWorldLabels) GameHUD.updateNodeWorldLabels();
        endPerfMark(overlayMark);
      }
      if (typeof GameHUD !== 'undefined' && GameHUD.updatePerformanceStats) GameHUD.updatePerformanceStats(dt);
      updateAdaptiveResolution(dt);

      var worldFxMark = beginPerfMark('world.fx');

      // Update day/night cycle (always, even when paused)
      if (typeof DayNightSystem !== 'undefined') DayNightSystem.update(dt);

      // Update fire lights (always, even when paused)
      if (typeof FireSystem !== 'undefined') FireSystem.update(dt);

      // Update atmosphere system (wind, stars, moon, clouds)
      if (typeof AtmosphereSystem !== 'undefined' && isRuntimeSettingEnabled('atmosphere')) AtmosphereSystem.update(dt);

      // Update particle system
      if (typeof ParticleSystem !== 'undefined' && isRuntimeSettingEnabled('particles')) ParticleSystem.update(dt);

      // Update weather system
      if (typeof WeatherSystem !== 'undefined' && isRuntimeSettingEnabled('weather')) WeatherSystem.update(dt);

      // Update water animation
      if (typeof WaterSystem !== 'undefined' && WaterSystem.updateWaterAnimation) WaterSystem.updateWaterAnimation(dt);

      // Update fire light mask (reduce darkness near fires)
      _fireMaskUpdateAccumulator += dt;
      if (isRuntimeSettingEnabled('screenFx') && _fireMaskUpdateAccumulator >= (1 / 30)) {
        _fireMaskUpdateAccumulator = 0;
        updateFireLightMask();
      }

      endPerfMark(worldFxMark);

      // Update minimap
      var minimapMark = beginPerfMark('minimap.update');
      if (typeof MiniMap !== 'undefined' && isRuntimeSettingEnabled('minimap')) MiniMap.update();
      endPerfMark(minimapMark);

      var renderMark = beginPerfMark('render.draw');
      renderer.render(scene, camera);
      endPerfMark(renderMark);

      if (typeof GamePerf !== 'undefined' && GamePerf.endFrame) {
        GamePerf.endFrame(renderer);
      }
    }
    _animFrameId = requestAnimationFrame(loop);
  }

  function togglePause() {
    isPaused = !isPaused;
    GameState.setGamePaused(isPaused);
  }

  function setGameSpeed(value) {
    gameSpeed = Math.max(0.25, Math.min(5, value));
    GameState.setGameSpeed(gameSpeed);
  }

  function increaseSpeed() {
    var idx = speedSteps.indexOf(gameSpeed);
    if (idx < speedSteps.length - 1) setGameSpeed(speedSteps[idx + 1]);
  }

  function decreaseSpeed() {
    var idx = speedSteps.indexOf(gameSpeed);
    if (idx > 0) setGameSpeed(speedSteps[idx - 1]);
  }

  function getGameSpeed() { return gameSpeed; }
  function getIsPaused() { return isPaused; }

  function updateCamera(pos) {
    if (!pos) return;
    var targetX = pos.x + 20;
    var targetZ = pos.z + 20;
    camera.position.x += (targetX - camera.position.x) * 0.08;
    camera.position.y += (20 - camera.position.y) * 0.08;
    camera.position.z += (targetZ - camera.position.z) * 0.08;
    camera.lookAt(pos.x, 0, pos.z);

    // Update shadow camera to follow
    if (_sunLight) {
      var shadowMoved = Math.abs(_lastShadowCenter.x - pos.x) > 0.25 || Math.abs(_lastShadowCenter.z - pos.z) > 0.25;
      if (shadowMoved) {
        _sunLight.shadow.camera.left = pos.x - 35;
        _sunLight.shadow.camera.right = pos.x + 35;
        _sunLight.shadow.camera.top = pos.z + 35;
        _sunLight.shadow.camera.bottom = pos.z - 35;
        _sunLight.shadow.camera.updateProjectionMatrix();
        _lastShadowCenter.x = pos.x;
        _lastShadowCenter.z = pos.z;
      }
    }
  }

  function getScene() { return scene; }
  function getCamera() { return camera; }
  function getRenderer() { return renderer; }
  function getZoom() { return _zoom; }

  function getWorldToScreenVector() {
    if (!_worldToScreenVector && typeof THREE !== 'undefined') {
      _worldToScreenVector = new THREE.Vector3();
    }
    return _worldToScreenVector;
  }

  function writeScreenPoint(projected, out) {
    out = out || {};
    out.x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    out.y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    out.z = projected.z;
    return out;
  }

  function getReusableFrustum() {
    if (!_cameraFrustum && typeof THREE !== 'undefined') {
      _cameraFrustum = new THREE.Frustum();
    }
    return _cameraFrustum;
  }

  function getProjectionScreenMatrix() {
    if (!_projectionScreenMatrix && typeof THREE !== 'undefined') {
      _projectionScreenMatrix = new THREE.Matrix4();
    }
    return _projectionScreenMatrix;
  }

  function getCameraFrustum(out) {
    if (!camera || typeof THREE === 'undefined') return null;

    var frustum = out || getReusableFrustum();
    var projectionScreenMatrix = getProjectionScreenMatrix();
    if (!frustum || !projectionScreenMatrix) return null;

    camera.updateMatrixWorld(true);
    projectionScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projectionScreenMatrix);
    return frustum;
  }

  function getOverlayRefreshConfig() {
    var zoomedOutRatio = (MAX_ZOOM > MIN_ZOOM) ? ((_zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) : 0;
    var frameMs = (typeof GamePerf !== 'undefined' && GamePerf.getValue) ? (GamePerf.getValue('frame.ms') || 0) : 0;
    var movementScale = zoomedOutRatio >= 0.75 ? 1.8 : (zoomedOutRatio >= 0.35 ? 1.35 : 1.0);
    var idleInterval = zoomedOutRatio >= 0.75 ? (1 / 8) : (1 / 12);

    if (frameMs > 28) idleInterval = Math.max(idleInterval, 1 / 6);
    else if (frameMs > 22) idleInterval = Math.max(idleInterval, 1 / 7);

    return {
      playerThreshold: 0.02 * movementScale,
      cameraThreshold: 0.04 * movementScale,
      idleInterval: idleInterval
    };
  }

  function shouldRefreshWorldOverlays(dt, playerPos) {
    if (!camera || !playerPos) return true;

    var refreshConfig = getOverlayRefreshConfig();

    var playerMoved = Math.abs(playerPos.x - _lastOverlayPlayerPos.x) > refreshConfig.playerThreshold ||
      Math.abs(playerPos.z - _lastOverlayPlayerPos.z) > refreshConfig.playerThreshold;
    var cameraMoved = Math.abs(camera.position.x - _lastOverlayCameraPos.x) > refreshConfig.cameraThreshold ||
      Math.abs(camera.position.y - _lastOverlayCameraPos.y) > refreshConfig.cameraThreshold ||
      Math.abs(camera.position.z - _lastOverlayCameraPos.z) > refreshConfig.cameraThreshold;

    if (playerMoved || cameraMoved) {
      _overlayIdleAccumulator = 0;
      _lastOverlayPlayerPos.x = playerPos.x;
      _lastOverlayPlayerPos.z = playerPos.z;
      _lastOverlayCameraPos.x = camera.position.x;
      _lastOverlayCameraPos.y = camera.position.y;
      _lastOverlayCameraPos.z = camera.position.z;
      return true;
    }

    _overlayIdleAccumulator += dt;
    if (_overlayIdleAccumulator < refreshConfig.idleInterval) {
      return false;
    }

    _overlayIdleAccumulator = 0;
    _lastOverlayPlayerPos.x = playerPos.x;
    _lastOverlayPlayerPos.z = playerPos.z;
    _lastOverlayCameraPos.x = camera.position.x;
    _lastOverlayCameraPos.y = camera.position.y;
    _lastOverlayCameraPos.z = camera.position.z;
    return true;
  }

  function addToScene(object) {
    if (scene) scene.add(object);
  }

  function removeFromScene(object) {
    if (scene) scene.remove(object);
  }

  function worldToScreen(worldPos, out) {
    if (!camera || !worldPos) return null;
    var vec = getWorldToScreenVector();
    if (!vec) return null;
    vec.copy(worldPos);
    vec.project(camera);
    return writeScreenPoint(vec, out);
  }

  function projectWorldToScreen(worldX, worldY, worldZ, out) {
    if (!camera) return null;
    var vec = getWorldToScreenVector();
    if (!vec) return null;
    vec.set(worldX, worldY, worldZ);
    vec.project(camera);
    return writeScreenPoint(vec, out);
  }

  function getFireMaskStamp(pixelRadius, centerAlpha, isCampfire) {
    var bucketRadius = Math.max(40, Math.round(pixelRadius / 8) * 8);
    var bucketAlpha = Math.max(0.05, Math.min(0.5, Math.round(centerAlpha * 20) / 20));
    var key = (isCampfire ? 'camp' : 'light') + '|' + bucketRadius + '|' + bucketAlpha.toFixed(2);
    var cached = _fireMaskStampCache[key];
    if (cached) return cached;

    var size = bucketRadius * 2;
    var stampCanvas = document.createElement('canvas');
    stampCanvas.width = size;
    stampCanvas.height = size;
    var stampCtx = stampCanvas.getContext('2d');
    var grad = stampCtx.createRadialGradient(bucketRadius, bucketRadius, 0, bucketRadius, bucketRadius, bucketRadius);
    grad.addColorStop(0, 'rgba(255,220,140,' + bucketAlpha.toFixed(3) + ')');
    grad.addColorStop(0.3, 'rgba(255,180,80,' + (bucketAlpha * 0.6).toFixed(3) + ')');
    grad.addColorStop(0.6, 'rgba(255,140,50,' + (bucketAlpha * 0.25).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(255,100,30,0)');
    stampCtx.fillStyle = grad;
    stampCtx.fillRect(0, 0, size, size);

    cached = {
      canvas: stampCanvas,
      radius: bucketRadius
    };
    _fireMaskStampCache[key] = cached;
    return cached;
  }

  function updateFireLightMask() {
    var flmCanvas = document.getElementById('fire-light-mask');
    if (!flmCanvas) return;
    var ctx = _fireMaskCtx || flmCanvas.getContext('2d');
    if (!ctx) return;
    _fireMaskCtx = ctx;

    ctx.clearRect(0, 0, flmCanvas.width, flmCanvas.height);

    if (typeof GameHUD !== 'undefined' && GameHUD.isModalActive && GameHUD.isModalActive()) {
      return;
    }

    var darkness = (typeof DayNightSystem !== 'undefined') ? DayNightSystem.getDarkness() : 0;
    if (darkness < 0.1) return;

    var fires = (typeof FireSystem !== 'undefined' && FireSystem.getActiveFires) ? FireSystem.getActiveFires() : null;

    if (!fires || fires.length === 0) return;
    if (!_fireMaskWorldPos && typeof THREE !== 'undefined') {
      _fireMaskWorldPos = new THREE.Vector3();
    }

    for (var i = 0; i < fires.length; i++) {
      var fire = fires[i];
      if (fire.intensity <= 0) continue;

      _fireMaskWorldPos.set(fire.x, 1.0, fire.z);
      _fireMaskWorldPos.project(camera);

      var screenPos = {
        x: (_fireMaskWorldPos.x * 0.5 + 0.5) * flmCanvas.width,
        y: (-_fireMaskWorldPos.y * 0.5 + 0.5) * flmCanvas.height
      };

      if (screenPos.x < -200 || screenPos.x > flmCanvas.width + 200 ||
          screenPos.y < -200 || screenPos.y > flmCanvas.height + 200) continue;

      var pixelRadius = fire.radius * (flmCanvas.width / 24) * fire.intensity;
      pixelRadius = Math.max(40, Math.min(pixelRadius, 350));

      var isCampfire = fire.isCampfire;
      var centerAlpha = isCampfire ? 0.35 * fire.intensity : 0.25 * fire.intensity;
      centerAlpha = Math.min(centerAlpha, 0.5);

      var stamp = getFireMaskStamp(pixelRadius, centerAlpha, isCampfire);
      ctx.drawImage(stamp.canvas, Math.round(screenPos.x - stamp.radius), Math.round(screenPos.y - stamp.radius));
    }
  }

  return {
    init: init,
    getScene: getScene,
    getCamera: getCamera,
    getRenderer: getRenderer,
    addToScene: addToScene,
    removeFromScene: removeFromScene,
    setZoom: setZoom,
    getZoom: getZoom,
    getCameraFrustum: getCameraFrustum,
    worldToScreen: worldToScreen,
    projectWorldToScreen: projectWorldToScreen,
    togglePause: togglePause,
    setGameSpeed: setGameSpeed,
    increaseSpeed: increaseSpeed,
    decreaseSpeed: decreaseSpeed,
    getGameSpeed: getGameSpeed,
    getIsPaused: getIsPaused
  };
})();
