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

    // Ambient light
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Directional light (sun)
    var dirLight = new THREE.DirectionalLight(0xfff4e0, 0.8);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    scene.add(dirLight);

    // Hemisphere light for nicer colors
    var hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x7ec850, 0.3);
    scene.add(hemiLight);

    window.addEventListener('resize', onResize);
    onResize();

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
  }

  function setZoom(delta) {
    // Limit zoom to default (12) - prevent exploring by zooming out
    _zoom = Math.max(6, Math.min(12, _zoom + delta));
    onResize();
  }

  function startLoop() {
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
      shadowCam.shadow.camera.left = pos.x - 30;
      shadowCam.shadow.camera.right = pos.x + 30;
      shadowCam.shadow.camera.top = pos.z + 30;
      shadowCam.shadow.camera.bottom = pos.z - 30;
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
