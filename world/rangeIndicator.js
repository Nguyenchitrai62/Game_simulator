window.RangeIndicator = (function () {
  var _activeUid = null;
  var _rangeGroup = null;

  function createCircle(radius, color, opacity) {
    var innerR = Math.max(0.01, radius - 0.08);
    var outerR = Math.max(0.02, radius);
    var geo = new THREE.RingGeometry(innerR, outerR, 64);
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.05;
    return mesh;
  }

  function createEdgeCircle(radius, color) {
    var points = [];
    var segments = 64;
    for (var i = 0; i <= segments; i++) {
      var angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(points);
    var mat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7
    });
    var line = new THREE.Line(geo, mat);
    line.position.y = 0.05;
    return line;
  }

  function show(uid) {
    hide();

    var instance = GameState.getInstance(uid);
    if (!instance) return;

    var entityId = instance.entityId;
    var balance = GameRegistry.getBalance(entityId);
    if (!balance) return;

    var level = instance.level || 1;
    var searchRadius = (balance.searchRadius && balance.searchRadius[level]) ? balance.searchRadius[level] : 0;
    var transferRange = balance.transferRange || 0;

    var hasSearchRadius = searchRadius > 0;
    var hasTransferRange = transferRange > 0;

    if (!hasSearchRadius && !hasTransferRange) return;

    _activeUid = uid;
    _rangeGroup = new THREE.Group();
    _rangeGroup.userData.isRangeIndicator = true;

    if (hasSearchRadius) {
      var searchCircle = createCircle(searchRadius, 0x00ff88, 0.18);
      var searchEdge = createEdgeCircle(searchRadius, 0x00ff88);
      _rangeGroup.add(searchCircle);
      _rangeGroup.add(searchEdge);
    }

    if (hasTransferRange) {
      var transferCircle = createCircle(transferRange, 0x4488ff, 0.15);
      var transferEdge = createEdgeCircle(transferRange, 0x4488ff);
      _rangeGroup.add(transferCircle);
      _rangeGroup.add(transferEdge);
    }

    _rangeGroup.position.set(instance.x, 0, instance.z);
    GameScene.getScene().add(_rangeGroup);
  }

  function hide() {
    if (_rangeGroup) {
      GameScene.getScene().remove(_rangeGroup);
      _rangeGroup = null;
    }
    _activeUid = null;
  }

  function update(uid) {
    if (_activeUid === uid) {
      show(uid);
    }
  }

  function getActiveUid() {
    return _activeUid;
  }

  return {
    show: show,
    hide: hide,
    update: update,
    getActiveUid: getActiveUid
  };
})();