window.RangeIndicator = (function () {
  var _activeUid = null;
  var _rangeGroup = null;
  var _previewBuildingId = null;
  var _previewGroup = null;

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

  function createEdgeCircle(radius, color, opacity) {
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
      opacity: opacity === undefined ? 0.7 : opacity
    });
    var line = new THREE.Line(geo, mat);
    line.position.y = 0.05;
    return line;
  }

  function getRangeSpecs(balance, level) {
    if (!balance) return [];

    var specs = [];
    var searchRadius = (balance.searchRadius && balance.searchRadius[level]) ? balance.searchRadius[level] : 0;
    var transferRange = balance.transferRange || 0;
    var waterRadius = balance.waterRadius || 0;
    var lightRadius = balance.lightRadius || 0;
    var guardRadius = (balance.guardRadius && balance.guardRadius[level]) ? balance.guardRadius[level] : 0;
    if (!guardRadius && balance.towerDefense && balance.towerDefense.range) {
      guardRadius = balance.towerDefense.range[level] || balance.towerDefense.range[1] || 0;
    }

    if (searchRadius > 0) specs.push({ radius: searchRadius, color: 0x00ff88, fillOpacity: 0.18, edgeOpacity: 0.7 });
    if (transferRange > 0) specs.push({ radius: transferRange, color: 0x4488ff, fillOpacity: 0.15, edgeOpacity: 0.7 });
    if (waterRadius > 0) specs.push({ radius: waterRadius, color: 0x57c7ff, fillOpacity: 0.15, edgeOpacity: 0.72 });
    if (lightRadius > 0) specs.push({ radius: lightRadius, color: 0xffa347, fillOpacity: 0.14, edgeOpacity: 0.78 });
    if (guardRadius > 0) specs.push({ radius: guardRadius, color: 0xe76f51, fillOpacity: 0.13, edgeOpacity: 0.76 });

    return specs;
  }

  function createRangeGroup(rangeSpecs, isPreview) {
    if (!rangeSpecs || !rangeSpecs.length) return null;

    var group = new THREE.Group();
    group.userData.isRangeIndicator = true;

    for (var i = 0; i < rangeSpecs.length; i++) {
      var spec = rangeSpecs[i];
      var fillOpacity = isPreview ? Math.max(0.08, spec.fillOpacity * 0.85) : spec.fillOpacity;
      var edgeOpacity = isPreview ? Math.max(0.45, spec.edgeOpacity * 0.9) : spec.edgeOpacity;
      group.add(createCircle(spec.radius, spec.color, fillOpacity));
      group.add(createEdgeCircle(spec.radius, spec.color, edgeOpacity));
    }

    return group;
  }

  function show(uid) {
    hide();

    var instance = GameState.getInstance(uid);
    if (!instance) return;

    var entityId = instance.entityId;
    var balance = GameRegistry.getBalance(entityId);
    if (!balance) return;

    var level = instance.level || 1;
    var rangeSpecs = getRangeSpecs(balance, level);
    if (!rangeSpecs.length) return;

    _activeUid = uid;
    _rangeGroup = createRangeGroup(rangeSpecs, false);
    if (!_rangeGroup) return;

    _rangeGroup.position.set(instance.x, 0, instance.z);
    GameScene.getScene().add(_rangeGroup);
  }

  function showPlacementPreview(buildingId, worldX, worldZ) {
    if (!buildingId) {
      hidePlacementPreview();
      return;
    }

    var balance = GameRegistry.getBalance(buildingId);
    var rangeSpecs = getRangeSpecs(balance, 1);
    if (!rangeSpecs.length) {
      hidePlacementPreview();
      return;
    }

    if (!_previewGroup || _previewBuildingId !== buildingId) {
      hidePlacementPreview();
      _previewGroup = createRangeGroup(rangeSpecs, true);
      _previewBuildingId = buildingId;
      if (_previewGroup) {
        _previewGroup.userData.isPlacementRangePreview = true;
        GameScene.getScene().add(_previewGroup);
      }
    }

    if (_previewGroup) {
      _previewGroup.position.set(Math.round(worldX), 0, Math.round(worldZ));
    }
  }

  function hidePlacementPreview() {
    if (_previewGroup) {
      GameScene.getScene().remove(_previewGroup);
      _previewGroup = null;
    }
    _previewBuildingId = null;
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
    showPlacementPreview: showPlacementPreview,
    hidePlacementPreview: hidePlacementPreview,
    update: update,
    getActiveUid: getActiveUid
  };
})();