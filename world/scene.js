window.GameScene = (function () {
  var scene, camera, renderer;
  var _animFrameId = null;
  var _lastTime = 0;
  var _tickAccumulator = 0;
  var TICK_INTERVAL = 1000;
  var _zoom = 12;
  var gameSpeed = 1.0;
  var isPaused = false;
  var speedSteps = [0.25, 0.5, 1, 2, 5];

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
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -35;
    dirLight.shadow.camera.right = 35;
    dirLight.shadow.camera.top = 35;
    dirLight.shadow.camera.bottom = -35;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // Hemisphere light for nicer colors
    var hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x7ec850, 0.4);
    scene.add(hemiLight);

    window.addEventListener('resize', onResize);
    onResize();

    var flmCanvas = document.getElementById('fire-light-mask');
    if (flmCanvas) {
      flmCanvas.width = window.innerWidth;
      flmCanvas.height = window.innerHeight;
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

    var flmCanvas = document.getElementById('fire-light-mask');
    if (flmCanvas) {
      flmCanvas.width = w;
      flmCanvas.height = h;
    }
  }

  function setZoom(delta) {
    // Limit zoom to default (12) - prevent exploring by zooming out
    _zoom = Math.max(6, Math.min(12, _zoom + delta));
    onResize();
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

      if (dt > 0.1) dt = 0.1;

      // Apply game speed
      var effectiveDt = dt * gameSpeed;

      if (!isPaused) {
        // Update player movement
        if (typeof GamePlayer !== 'undefined') GamePlayer.update(effectiveDt);

        // Update entities (animations, respawns)
        if (typeof GameEntities !== 'undefined') GameEntities.update(effectiveDt);

        // Update NPCs (workers)
        if (typeof NPCSystem !== 'undefined') NPCSystem.update(effectiveDt);
        
        // Update node HP bars for harvesting
        if (typeof GameHUD !== 'undefined' && GameHUD.updateNodeHpBars) GameHUD.updateNodeHpBars();
        
        // Update building storage labels
        if (typeof GameHUD !== 'undefined' && GameHUD.updateBuildingStorageLabels) GameHUD.updateBuildingStorageLabels();

        // Update combat
        if (typeof GameCombat !== 'undefined') GameCombat.update(effectiveDt);

        // Game tick accumulator (1 second)
        _tickAccumulator += effectiveDt;
        if (_tickAccumulator >= 1.0) {
          _tickAccumulator -= 1.0;
          if (typeof TickSystem !== 'undefined') TickSystem.tick();
        }
      } else {
        // Always run auto-save even when paused
        _tickAccumulator += dt;
        if (_tickAccumulator >= 1.0) {
          _tickAccumulator -= 1.0;
          if (typeof TickSystem !== 'undefined') TickSystem.tickPausedOnly();
        }
      }

      // Update camera to follow player
      updateCamera();

      // Update day/night cycle (always, even when paused)
      if (typeof DayNightSystem !== 'undefined') DayNightSystem.update(dt);

      // Update fire lights (always, even when paused)
      if (typeof FireSystem !== 'undefined') FireSystem.update(dt);

      // Update atmosphere system (wind, stars, moon, clouds)
      if (typeof AtmosphereSystem !== 'undefined') AtmosphereSystem.update(dt);

      // Update particle system
      if (typeof ParticleSystem !== 'undefined') ParticleSystem.update(dt);

      // Update weather system
      if (typeof WeatherSystem !== 'undefined') WeatherSystem.update(dt);

      // Update water animation
      if (typeof WaterSystem !== 'undefined' && WaterSystem.updateWaterAnimation) WaterSystem.updateWaterAnimation(dt);

      // Update fire light mask (reduce darkness near fires)
      updateFireLightMask();

      // Update minimap
      if (typeof MiniMap !== 'undefined') MiniMap.update();

      renderer.render(scene, camera);
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

  function updateCamera() {
    if (typeof GamePlayer === 'undefined') return;
    var pos = GamePlayer.getPosition();
    var targetX = pos.x + 20;
    var targetZ = pos.z + 20;
    camera.position.x += (targetX - camera.position.x) * 0.08;
    camera.position.y += (20 - camera.position.y) * 0.08;
    camera.position.z += (targetZ - camera.position.z) * 0.08;
    camera.lookAt(pos.x, 0, pos.z);

    // Update shadow camera to follow
    var shadowCam = scene.children.find(function (c) { return c.isDirectionalLight; });
    if (shadowCam) {
      shadowCam.shadow.camera.left = pos.x - 35;
      shadowCam.shadow.camera.right = pos.x + 35;
      shadowCam.shadow.camera.top = pos.z + 35;
      shadowCam.shadow.camera.bottom = pos.z - 35;
      shadowCam.shadow.camera.updateProjectionMatrix();
    }
  }

  function getScene() { return scene; }
  function getCamera() { return camera; }
  function getRenderer() { return renderer; }

  function addToScene(object) {
    if (scene) scene.add(object);
  }

  function removeFromScene(object) {
    if (scene) scene.remove(object);
  }

  function worldToScreen(worldPos) {
    var vec = worldPos.clone();
    vec.project(camera);
    return {
      x: (vec.x * 0.5 + 0.5) * window.innerWidth,
      y: (-vec.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  function updateFireLightMask() {
    var flmCanvas = document.getElementById('fire-light-mask');
    if (!flmCanvas) return;
    var ctx = flmCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, flmCanvas.width, flmCanvas.height);

    if (typeof GameHUD !== 'undefined' && GameHUD.isModalActive && GameHUD.isModalActive()) {
      return;
    }

    var darkness = (typeof DayNightSystem !== 'undefined') ? DayNightSystem.getDarkness() : 0;
    if (darkness < 0.1) return;

    var fires = [];
    if (typeof FireSystem !== 'undefined' && FireSystem.getActiveFires) {
      fires = FireSystem.getActiveFires();
    }

    if (fires.length === 0) return;

    var camPos = camera.position;
    var camTarget = new THREE.Vector3();
    camera.getWorldDirection(camTarget);

    for (var i = 0; i < fires.length; i++) {
      var fire = fires[i];
      if (fire.intensity <= 0) continue;

      var worldPos = new THREE.Vector3(fire.x, 1.0, fire.z);
      var screenPos = worldToScreen(worldPos);

      if (screenPos.x < -200 || screenPos.x > flmCanvas.width + 200 ||
          screenPos.y < -200 || screenPos.y > flmCanvas.height + 200) continue;

      var pixelRadius = fire.radius * (flmCanvas.width / 24) * fire.intensity;
      pixelRadius = Math.max(40, Math.min(pixelRadius, 350));

      var isCampfire = fire.isCampfire;
      var centerAlpha = isCampfire ? 0.35 * fire.intensity : 0.25 * fire.intensity;
      centerAlpha = Math.min(centerAlpha, 0.5);

      var grad = ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, pixelRadius
      );
      grad.addColorStop(0, 'rgba(255,220,140,' + centerAlpha.toFixed(3) + ')');
      grad.addColorStop(0.3, 'rgba(255,180,80,' + (centerAlpha * 0.6).toFixed(3) + ')');
      grad.addColorStop(0.6, 'rgba(255,140,50,' + (centerAlpha * 0.25).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(255,100,30,0)');

      ctx.fillStyle = grad;
      ctx.fillRect(screenPos.x - pixelRadius, screenPos.y - pixelRadius, pixelRadius * 2, pixelRadius * 2);
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
    worldToScreen: worldToScreen,
    togglePause: togglePause,
    setGameSpeed: setGameSpeed,
    increaseSpeed: increaseSpeed,
    decreaseSpeed: decreaseSpeed,
    getGameSpeed: getGameSpeed,
    getIsPaused: getIsPaused
  };
})();
