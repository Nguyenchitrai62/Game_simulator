window.MiniMap = (function () {
  var _miniCanvas = null;
  var _miniCtx = null;
  var _dangerMapNextRefreshAt = 0;
  var DANGER_MAP_REFRESH_MS = 260;
  var DANGER_MAP_OPEN_REFRESH_MS = 140;
  var _lastMiniDrawAt = 0;
  var _lastFullMapDrawAt = 0;
  var _fullMapDirty = false;
  var MINIMAP_REFRESH_MS = 90;
  var FULL_MAP_REFRESH_MS = 140;
  var FULL_MAP_INTERACT_REFRESH_MS = 60;

  // Full map state
  var _mapOpen = false;
  var _mapCanvas = null;
  var _mapCtx = null;
  var _camX = 0;
  var _camZ = 0;
  var _zoom = 1.0;
  var _dragging = false;
  var _dragSX = 0, _dragSY = 0;
  var _dragCX = 0, _dragCZ = 0;
  var _hoverInfo = '';
  var _hoverX = 0, _hoverY = 0;
  var _dangerMap = {};
  var _lastHoverUpdateAt = 0;

  var CHUNK = 16;

  function getMapSettings() {
    var balance = window.GAME_BALANCE || {};
    var settings = balance.settings || {};
    return settings.fullMap || {};
  }

  function formatLocalizedText(text, tokens) {
    var output = String(text == null ? '' : text);
    if (!tokens) return output;

    for (var tokenName in tokens) {
      if (!Object.prototype.hasOwnProperty.call(tokens, tokenName)) continue;
      output = output.split('{' + tokenName + '}').join(String(tokens[tokenName]));
    }

    return output;
  }

  function t(path, tokens, fallback) {
    if (window.GameI18n && GameI18n.t) {
      return GameI18n.t(path, tokens, fallback);
    }
    if (fallback !== undefined) return formatLocalizedText(fallback, tokens);
    return formatLocalizedText(path, tokens);
  }

  function getEntityName(entityId, fallback) {
    var entity = (window.GameRegistry && GameRegistry.getEntity) ? GameRegistry.getEntity(entityId) : null;
    return entity && entity.name ? entity.name : (fallback || entityId || '');
  }

  function getBossZoneKey(source) {
    var bossType = source && source.bossType ? source.bossType : '';
    var rewardId = source && source.rewardId ? source.rewardId : '';
    if (bossType === 'animal.stormhide_sabertooth' || rewardId === 'equipment.stormspine_glaive') return 'stormhide';
    if (bossType === 'animal.sunscale_lion' || rewardId === 'equipment.sunpiercer_bow') return 'sunscale';
    if (bossType === 'animal.moonfang_alpha' || rewardId === 'equipment.moonfang_blade') return 'moonfang';
    return '';
  }

  function getLocalizedBossZoneLabel(source) {
    var bossZoneKey = getBossZoneKey(source);
    if (bossZoneKey) {
      return t('world.bossZones.' + bossZoneKey + '.label', null, source && source.label ? source.label : t('world.minimap.bossZone', null, 'Boss Zone'));
    }
    return source && source.label ? source.label : t('world.minimap.bossZone', null, 'Boss Zone');
  }

  function getLocalizedBossRewardLabel(source) {
    if (source && source.rewardId) {
      return getEntityName(source.rewardId, source.rewardLabel || '');
    }
    return source && source.rewardLabel ? source.rewardLabel : '';
  }

  function getRuinedOutpostKey(source) {
    var rewards = source && source.rewards ? source.rewards : null;
    if (rewards) {
      if (rewards['resource.iron'] || rewards['resource.coal']) return 'frontierHold';
      if (rewards['resource.bronze']) return 'bronzeOutpost';
      if (rewards['resource.flint'] || rewards['resource.wood']) return 'hunterCamp';
    }

    var label = source && source.label ? String(source.label) : '';
    if (label === 'Ruined Frontier Hold') return 'frontierHold';
    if (label === 'Ruined Bronze Outpost') return 'bronzeOutpost';
    if (label === 'Collapsed Hunter Camp') return 'hunterCamp';
    return '';
  }

  function getLocalizedRuinedOutpostLabel(source) {
    var outpostKey = getRuinedOutpostKey(source);
    if (outpostKey) {
      return t('world.ruinedOutposts.' + outpostKey + '.label', null, source && source.label ? source.label : t('world.minimap.ruinedOutpost', null, 'Ruined Outpost'));
    }
    return source && source.label ? source.label : t('world.minimap.ruinedOutpost', null, 'Ruined Outpost');
  }

  function getLocalizedRuinedOutpostRewardLabel(source) {
    var outpostKey = getRuinedOutpostKey(source);
    if (outpostKey) {
      return t('world.ruinedOutposts.' + outpostKey + '.rewardLabel', null, source && source.rewardLabel ? source.rewardLabel : '');
    }
    return source && source.rewardLabel ? source.rewardLabel : '';
  }

  function getPredatorZoneLabel(level, fallbackLabel) {
    if (level === 'high') return t('world.minimap.predatorNest', null, fallbackLabel || 'Predator Nest');
    if (level === 'medium') return t('world.minimap.predatorZone', null, fallbackLabel || 'Predator Zone');
    return fallbackLabel || '';
  }

  function getDangerLevelLabel(level, fallbackLabel) {
    if (level === 'high') return t('world.minimap.dangerHigh', null, fallbackLabel || 'High danger zone');
    if (level === 'medium') return t('world.minimap.dangerMedium', null, fallbackLabel || 'Medium danger zone');
    return t('world.minimap.dangerLow', null, fallbackLabel || 'Low danger zone');
  }

  function getThreatCountText(count) {
    return count === 1
      ? t('world.minimap.threatOne', null, '1 threat')
      : t('world.minimap.threatMany', { count: count }, '{count} threats');
  }

  // Camera at (20,20,20) looking at origin = 45deg isometric.
  // Screen right = world (+1, -1). Screen up = world (-1, -1).
  // To match camera view on minimap, rotate canvas by +45deg (CCW).
  // After rotation: canvas-X = world (1,-1) dir, canvas-Y = world (1,1) dir.
  // Transformation: canvasDX = (worldDX - worldDZ) * 0.707
  //                 canvasDY = (worldDX + worldDZ) * 0.707
  var SQRT2_2 = Math.SQRT1_2; // 1/sqrt(2) ≈ 0.7071

  var ICON = {
    tree:   { c: '#3aaa3a', s: 'circle' },
    rock:   { c: '#9999bb', s: 'rect' },
    berry:  { c: '#ff5577', s: 'diamond' },
    flint:  { c: '#8888aa', s: 'rect' },
    copper: { c: '#ee9933', s: 'rect' },
    tin:    { c: '#bbbbdd', s: 'rect' },
    iron:   { c: '#cc9966', s: 'rect' },
    coal:   { c: '#555577', s: 'rect' },
    site:   { c: '#caa36b', s: 'diamond' },
    prey:   { c: '#d8cbb5', s: 'circle' },
    threat: { c: '#ff3344', s: 'tri' }
  };

  function iconFor(type) {
    if (type && type.indexOf('animal.') === 0) {
      if (window.GameRegistry && GameRegistry.isAnimalThreat && GameRegistry.isAnimalThreat(type)) return ICON.threat;
      if (window.GameRegistry && GameRegistry.isAnimalPrey && GameRegistry.isAnimalPrey(type)) return ICON.prey;
      return ICON.threat;
    }
    if (type && type.indexOf('site.') === 0) return ICON.site;
    for (var k in ICON) { if (type.indexOf(k) >= 0) return ICON[k]; }
    return null;
  }

  function getSavedChunkData(key) {
    return (window.GameState && GameState.getChunkData) ? GameState.getChunkData(key) : null;
  }

  function getStateValue(data, longKey, shortKey) {
    if (!data) return undefined;
    if (Object.prototype.hasOwnProperty.call(data, longKey)) return data[longKey];
    if (shortKey && Object.prototype.hasOwnProperty.call(data, shortKey)) return data[shortKey];
    return undefined;
  }

  function findChunkObjectState(chunkData, objectId) {
    if (!chunkData || !chunkData.objects || !objectId) return null;
    for (var index = 0; index < chunkData.objects.length; index++) {
      var obj = chunkData.objects[index];
      var candidateId = obj && obj.id !== undefined ? obj.id : getStateValue(obj, 'id', 'i');
      if (candidateId === objectId) return obj;
    }
    return null;
  }

  function isChunkObjectCleared(obj) {
    if (!obj) return false;
    var destroyed = !!getStateValue(obj, '_destroyed', 'd');
    var hp = getStateValue(obj, 'hp', 'h');
    return destroyed || (typeof hp === 'number' && hp <= 0);
  }

  function getChunkFeatureSource(key, activeChunk) {
    return activeChunk || getSavedChunkData(key);
  }

  function getBossZoneInfoForChunk(cx, cz, activeChunk) {
    var key = cx + ',' + cz;
    var source = getChunkFeatureSource(key, activeChunk);
    if (!source || !source.bossZone) return null;

    var bossState = findChunkObjectState(source, source.bossZone.objectId);
    return {
      label: getLocalizedBossZoneLabel(source.bossZone),
      rewardLabel: getLocalizedBossRewardLabel(source.bossZone),
      markerColor: source.bossZone.markerColor || '#ffd166',
      overlayFill: source.bossZone.overlayFill || 'rgba(255, 209, 102, 0.12)',
      overlayStroke: source.bossZone.overlayStroke || 'rgba(255, 209, 102, 0.55)',
      cleared: isChunkObjectCleared(bossState)
    };
  }

  function getRuinedOutpostInfoForChunk(cx, cz, activeChunk) {
    var key = cx + ',' + cz;
    var source = getChunkFeatureSource(key, activeChunk);
    if (!source || !source.ruinedOutpost) return null;

    var outpostState = findChunkObjectState(source, source.ruinedOutpost.objectId);
    return {
      label: getLocalizedRuinedOutpostLabel(source.ruinedOutpost),
      rewardLabel: getLocalizedRuinedOutpostRewardLabel(source.ruinedOutpost),
      looted: isChunkObjectCleared(outpostState)
    };
  }

  function getChunkFeatureHoverInfo(cx, cz, activeChunk) {
    var parts = [];
    var bossInfo = getBossZoneInfoForChunk(cx, cz, activeChunk);
    if (bossInfo) {
      parts.push(bossInfo.label + (bossInfo.rewardLabel ? (' • ' + t('world.minimap.reward', null, 'reward') + ': ' + bossInfo.rewardLabel) : '') + (bossInfo.cleared ? (' • ' + t('world.minimap.cleared', null, 'cleared')) : ''));
    }

    var outpostInfo = getRuinedOutpostInfoForChunk(cx, cz, activeChunk);
    if (outpostInfo) {
      parts.push(outpostInfo.label + (outpostInfo.rewardLabel ? (' • ' + outpostInfo.rewardLabel) : '') + (outpostInfo.looted ? (' • ' + t('world.minimap.looted', null, 'looted')) : ''));
    }

    return parts.join(' • ');
  }

  function getActiveThreatSources() {
    var activeSources = {};
    if (!window.NPCSystem || !NPCSystem.getThreatenedWorkersSummary) return activeSources;

    var summary = NPCSystem.getThreatenedWorkersSummary();
    if (!summary || !summary.workers) return activeSources;

    for (var i = 0; i < summary.workers.length; i++) {
      var workerThreat = summary.workers[i];
      if (!workerThreat || !workerThreat.threatSourceId) continue;

      if (!activeSources[workerThreat.threatSourceId]) {
        activeSources[workerThreat.threatSourceId] = {
          workerCount: 0,
          attackingCount: 0
        };
      }

      activeSources[workerThreat.threatSourceId].workerCount += 1;
      if (workerThreat.threatLevel === 'attacking') {
        activeSources[workerThreat.threatSourceId].attackingCount += 1;
      }
    }

    return activeSources;
  }

  function getMapInstances() {
    if (!window.GameState) return {};
    if (GameState.getAllInstancesLive) return GameState.getAllInstancesLive();
    return GameState.getAllInstances ? GameState.getAllInstances() : {};
  }

  function getThreatWeight(type, balance) {
    var attack = Math.max(0, Number(balance && balance.attack) || 0);
    var aggroRange = Math.max(0, Number(balance && balance.aggroRange) || 0);
    return 0.8 + attack * 0.35 + aggroRange * 0.45;
  }

  function getDangerLevel(entry) {
    if (!entry || !entry.threatCount) return null;
    if (entry.activePressure > 0 || entry.score >= 8) return 'high';
    if (entry.score >= 4.2) return 'medium';
    return 'low';
  }

  function getDangerLevelRank(level) {
    if (level === 'high') return 3;
    if (level === 'medium') return 2;
    if (level === 'low') return 1;
    return 0;
  }

  function getDangerColors(entry, timeMs) {
    if (!entry || !entry.level) return null;

    var pulse = 0.04 + (Math.sin((timeMs || 0) * 0.005) + 1) * 0.04;
    if (entry.level === 'high') {
      return {
        fill: 'rgba(255,72,72,' + (entry.activePressure > 0 ? (0.28 + pulse) : 0.26) + ')',
        stroke: 'rgba(255,170,170,0.72)'
      };
    }
    if (entry.level === 'medium') {
      return {
        fill: 'rgba(255,150,60,0.18)',
        stroke: 'rgba(255,196,120,0.5)'
      };
    }
    return {
      fill: 'rgba(255,220,120,0.1)',
      stroke: 'rgba(255,230,160,0.28)'
    };
  }

  function buildDangerMap(chunks, bounds) {
    var dangerMap = {};
    var activeSources = getActiveThreatSources();

    if (!chunks) return dangerMap;

    var keys = [];
    if (bounds) {
      for (var cx = bounds.minCX; cx <= bounds.maxCX; cx++) {
        for (var cz = bounds.minCZ; cz <= bounds.maxCZ; cz++) {
          keys.push(cx + ',' + cz);
        }
      }
    } else {
      keys = Object.keys(chunks);
    }

    for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      var key = keys[keyIndex];
      var chunk = chunks[key];
      if (!chunk) continue;
      if (!isChunkWithinBounds(chunk.cx, chunk.cz, bounds)) continue;

      var entry = chunk.predatorZone ? {
        score: Number(chunk.predatorZone.dangerBonus) || 0,
        threatCount: 0,
        activePressure: 0,
        strongestThreat: '',
        strongestWeight: Number(chunk.predatorZone.dangerBonus) || 0,
        zoneLabel: getPredatorZoneLabel(chunk.predatorZone.level, chunk.predatorZone.label),
        level: chunk.predatorZone.level || null
      } : null;

      var threatObjects = (window.GameSpatialIndex && GameSpatialIndex.getThreatAnimalsForChunk) ? GameSpatialIndex.getThreatAnimalsForChunk(chunk.cx, chunk.cz, CHUNK) : null;
      var sourceObjects = threatObjects || chunk.objects || [];
      for (var i = 0; i < sourceObjects.length; i++) {
        var obj = sourceObjects[i];
        if (!obj || obj._destroyed || obj.hp <= 0 || !obj.type || obj.type.indexOf('animal.') !== 0) continue;
        if (!window.GameRegistry || !GameRegistry.isAnimalThreat || !GameRegistry.isAnimalThreat(obj.type)) continue;

        if (!entry) {
          entry = {
            score: 0,
            threatCount: 0,
            activePressure: 0,
            strongestThreat: '',
            strongestWeight: 0,
            level: null
          };
        }

        var balance = GameRegistry.getBalance ? (GameRegistry.getBalance(obj.type) || {}) : {};
        var weight = getThreatWeight(obj.type, balance);
        var activeSource = activeSources[obj.id];
        if (activeSource) {
          weight += 2.4 + activeSource.workerCount * 0.85 + activeSource.attackingCount * 1.25;
          entry.activePressure += activeSource.attackingCount > 0 ? activeSource.attackingCount : 1;
        }

        entry.score += weight;
        entry.threatCount += 1;
        if (weight > entry.strongestWeight) {
          entry.strongestWeight = weight;
          entry.strongestThreat = ((GameRegistry.getEntity && GameRegistry.getEntity(obj.type)) || {}).name || obj.type;
        }
      }

      if (entry) {
        var computedLevel = getDangerLevel(entry);
        if (getDangerLevelRank(computedLevel) > getDangerLevelRank(entry.level)) {
          entry.level = computedLevel;
        }
        dangerMap[key] = entry;
      }
    }

    return dangerMap;
  }

  function getDangerInfoForChunk(cx, cz) {
    var entry = _dangerMap[cx + ',' + cz];
    if (!entry) return '';

    var label = entry.zoneLabel || getDangerLevelLabel(entry.level);
    var detail = label;
    if (entry.threatCount > 0) {
      detail += ' • ' + getThreatCountText(entry.threatCount);
    } else if (entry.zoneLabel) {
      detail += ' • ' + t('world.minimap.respawnHotspot', null, 'respawn hotspot');
    }

    if (entry.activePressure > 0) {
      detail += ' • ' + t('world.minimap.workersUnderAttack', null, 'workers under attack');
    } else if (entry.strongestThreat) {
      detail += ' • ' + entry.strongestThreat;
    }

    return detail;
  }

  // Convert world direction to minimap canvas angle.
  // After 45° rotation, canvas direction is:
  //   cdx = (dir.x - dir.z), cdy = (dir.x + dir.z)
  // Angle from canvas-up: atan2(cdx, -cdy)
  function worldAngleToCanvas(dir) {
    var cdx = dir.x - dir.z;
    var cdy = dir.x + dir.z;
    return Math.atan2(cdx, -cdy);
  }

  function isMinimapEnabled() {
    return !window.GameDebugSettings || !GameDebugSettings.isEnabled || GameDebugSettings.isEnabled('minimap');
  }

  function getMinimapQualityValue(key, fallbackValue) {
    return (window.GameQualitySettings && GameQualitySettings.getConfigValue) ? GameQualitySettings.getConfigValue('minimap.' + key, fallbackValue) : fallbackValue;
  }

  function getDangerRefreshBounds() {
    if (_mapOpen && _mapCanvas) {
      var rawScale = Math.max(0.001, 3 * _zoom * SQRT2_2);
      var viewRadius = Math.max(_mapCanvas.width, _mapCanvas.height) / rawScale / 2 + CHUNK;
      var paddingChunks = getMinimapQualityValue('openDangerPaddingChunks', 2);
      var radiusChunks = Math.ceil(viewRadius / CHUNK) + paddingChunks;
      return {
        minCX: Math.floor(_camX / CHUNK) - radiusChunks,
        maxCX: Math.floor(_camX / CHUNK) + radiusChunks,
        minCZ: Math.floor(_camZ / CHUNK) - radiusChunks,
        maxCZ: Math.floor(_camZ / CHUNK) + radiusChunks
      };
    }

    if (window.GamePlayer && GamePlayer.getPosition) {
      var playerPos = GamePlayer.getPosition();
      var closedRadius = getMinimapQualityValue('closedDangerChunkRadius', 4);
      var playerChunkX = Math.floor(playerPos.x / CHUNK);
      var playerChunkZ = Math.floor(playerPos.z / CHUNK);
      return {
        minCX: playerChunkX - closedRadius,
        maxCX: playerChunkX + closedRadius,
        minCZ: playerChunkZ - closedRadius,
        maxCZ: playerChunkZ + closedRadius
      };
    }

    return null;
  }

  function isChunkWithinBounds(cx, cz, bounds) {
    if (!bounds) return true;
    return cx >= bounds.minCX && cx <= bounds.maxCX && cz >= bounds.minCZ && cz <= bounds.maxCZ;
  }

  function refreshVisibility() {
    var minimapEl = document.getElementById('minimap');
    var popup = document.getElementById('map-popup');
    var enabled = isMinimapEnabled();

    if (minimapEl) {
      minimapEl.style.display = enabled ? '' : 'none';
    }

    if (!enabled) {
      _mapOpen = false;
      if (popup) popup.style.display = 'none';
    }
  }

  function init() {
    _miniCanvas = document.getElementById('minimap-canvas');
    if (_miniCanvas) _miniCtx = _miniCanvas.getContext('2d');

    _mapCanvas = document.getElementById('map-full-canvas');
    if (_mapCanvas) {
      _mapCtx = _mapCanvas.getContext('2d');
      setupMapInput();
    }
    window.addEventListener('resize', function() {
      if (_mapOpen) resizeMapCanvas();
    });
    refreshVisibility();
    console.log('[MiniMap] Initialized');
  }

  function setupMapInput() {
    _mapCanvas.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      _dragging = true;
      _dragSX = e.clientX; _dragSY = e.clientY;
      _dragCX = _camX; _dragCZ = _camZ;
      _mapCanvas.style.cursor = 'move';
    });
    window.addEventListener('mousemove', function(e) {
      if (!_dragging) {
        if (_mapOpen && _mapCanvas) {
          updateHover(e);
        }
        return;
      }
      // Inverse of the rotation: worldDX = (sdx + sdy)/(2*rawScale), worldDZ = (sdy - sdx)/(2*rawScale)
      var rawScale = 3 * _zoom * SQRT2_2;
      var sdx = e.clientX - _dragSX;
      var sdy = e.clientY - _dragSY;
      _camX = _dragCX - (sdx + sdy) / (2 * rawScale);
      _camZ = _dragCZ - (sdy - sdx) / (2 * rawScale);
      _fullMapDirty = true;
    });
    window.addEventListener('mouseup', function() {
      _dragging = false;
      if (_mapCanvas) _mapCanvas.style.cursor = 'default';
      _fullMapDirty = true;
    });
    _mapCanvas.addEventListener('wheel', function(e) {
      e.preventDefault();
      var mapSettings = getMapSettings();
      var minZoom = Number(mapSettings.minZoom);
      var maxZoom = Number(mapSettings.maxZoom);
      var zoomInFactor = Number(mapSettings.zoomInFactor);
      var zoomOutFactor = Number(mapSettings.zoomOutFactor);

      if (!(minZoom > 0)) minZoom = 0.3;
      if (!(maxZoom > 0)) maxZoom = 4.0;
      if (!(zoomInFactor > 0)) zoomInFactor = 1.2;
      if (!(zoomOutFactor > 0)) zoomOutFactor = 0.83;

      _zoom = Math.max(minZoom, Math.min(maxZoom, _zoom * (e.deltaY < 0 ? zoomInFactor : zoomOutFactor)));
      _fullMapDirty = true;
    });
  }

  function updateHover(e) {
    if (!_mapCanvas) return;

    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var hoverDebounceMs = getMinimapQualityValue('hoverDebounceMs', 0);
    if (hoverDebounceMs > 0 && (now - _lastHoverUpdateAt) < hoverDebounceMs) {
      return;
    }
    _lastHoverUpdateAt = now;

    var rect = _mapCanvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var w = _mapCanvas.width, h = _mapCanvas.height;
    var rawScale = 3 * _zoom * SQRT2_2;
    var sdx = mx - w / 2;
    var sdy = my - h / 2;
    var worldMX = _camX + (sdx + sdy) / (2 * rawScale);
    var worldMZ = _camZ + (sdy - sdx) / (2 * rawScale);

    _hoverInfo = '';
    var best = Math.max(6, 16 / Math.max(0.35, _zoom));
    var instances = (window.GameSpatialIndex && GameSpatialIndex.getNearbyInstances)
      ? GameSpatialIndex.getNearbyInstances(worldMX, worldMZ, best, { limit: 24 })
      : getMapInstances();
    for (var uid in instances) {
      var inst = instances[uid];
      var d = Math.sqrt(Math.pow(inst.x - worldMX, 2) + Math.pow(inst.z - worldMZ, 2));
      if (d < best) {
        best = d;
        var ent = GameRegistry.getEntity(inst.entityId);
        _hoverInfo = (ent ? ent.name : inst.entityId) + ' (' + Math.floor(inst.x) + ',' + Math.floor(inst.z) + ')';
      }
    }

    var dangerInfo = getDangerInfoForChunk(Math.floor(worldMX / CHUNK), Math.floor(worldMZ / CHUNK));
    if (dangerInfo) {
      _hoverInfo = _hoverInfo ? (_hoverInfo + ' • ' + dangerInfo) : dangerInfo;
    }

    var featureInfo = getChunkFeatureHoverInfo(Math.floor(worldMX / CHUNK), Math.floor(worldMZ / CHUNK), null);
    if (featureInfo) {
      _hoverInfo = _hoverInfo ? (_hoverInfo + ' • ' + featureInfo) : featureInfo;
    }

    _hoverX = mx; _hoverY = my;
    _fullMapDirty = true;
  }

  function refreshDangerMap(force) {
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!force && now < _dangerMapNextRefreshAt) return;

    var chunks = GameTerrain.getAllChunks ? GameTerrain.getAllChunks() : {};
    _dangerMap = buildDangerMap(chunks, getDangerRefreshBounds());
    _dangerMapNextRefreshAt = now + (_mapOpen ? getMinimapQualityValue('dangerOpenRefreshMs', DANGER_MAP_OPEN_REFRESH_MS) : getMinimapQualityValue('dangerRefreshMs', DANGER_MAP_REFRESH_MS));
    if (_mapOpen) _fullMapDirty = true;
  }

  function update() {
    if (!isMinimapEnabled()) return;
    if (typeof GamePlayer === 'undefined' || !GamePlayer.getPosition) return;
    if (!_miniCtx && !_mapOpen) return;
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    refreshDangerMap(false);

    if (_miniCtx && (now - _lastMiniDrawAt >= getMinimapQualityValue('miniRefreshMs', MINIMAP_REFRESH_MS))) {
      drawMinimap();
      _lastMiniDrawAt = now;
    }

    if (_mapOpen) {
      var fullMapInterval = _dragging ? getMinimapQualityValue('fullInteractRefreshMs', FULL_MAP_INTERACT_REFRESH_MS) : getMinimapQualityValue('fullRefreshMs', FULL_MAP_REFRESH_MS);
      if (_fullMapDirty || (now - _lastFullMapDrawAt >= fullMapInterval)) {
        drawFullMap();
        _lastFullMapDrawAt = now;
        _fullMapDirty = false;
      }
    }
  }

  // ========== MINIMAP ==========
  function drawMinimap() {
    var pos = GamePlayer.getPosition();
    var dir = GamePlayer.getDirection ? GamePlayer.getDirection() : { x: 0, z: 1 };
    var explored = GameState.getExplored ? GameState.getExplored() : {};
    var chunks = GameTerrain.getAllChunks ? GameTerrain.getAllChunks() : {};
    var instances = getMapInstances();
    var now = performance.now();
    var isNight = typeof DayNightSystem !== 'undefined' && DayNightSystem.isNight();

    var w = _miniCanvas.width, h = _miniCanvas.height;
    var cx = w / 2, cy = h / 2;
    var radius = Math.min(cx, cy) - 2;
    var viewW = 40;
    var scale = w / viewW;

    _miniCtx.clearRect(0, 0, w, h);

    // Circle clip
    _miniCtx.save();
    _miniCtx.beginPath();
    _miniCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    _miniCtx.clip();

    // Background
    _miniCtx.fillStyle = '#0a120a';
    _miniCtx.fillRect(0, 0, w, h);

    // Rotate canvas +45° to match isometric camera view
    _miniCtx.save();
    _miniCtx.translate(cx, cy);
    _miniCtx.rotate(Math.PI / 4);
    _miniCtx.translate(-cx, -cy);

    var pcx = Math.floor(pos.x / CHUNK);
    var pcz = Math.floor(pos.z / CHUNK);
    var vr = Math.ceil(viewW / CHUNK / 2) + 2; // Slightly larger due to rotation

    for (var ck in chunks) {
      var ch = chunks[ck];
      if (!ch || ch.cx === undefined) continue;
      if (Math.abs(ch.cx - pcx) > vr || Math.abs(ch.cz - pcz) > vr) continue;
      if (!explored[ch.cx + ',' + ch.cz]) continue;

      var x0 = cx + (ch.cx * CHUNK - pos.x) * scale;
      var y0 = cy + (ch.cz * CHUNK - pos.z) * scale;
      var cs = CHUNK * scale;

      var hash = ((ch.cx * 73 + ch.cz * 137) & 0xff) % 15;
      _miniCtx.fillStyle = 'rgb(' + (25 + hash) + ',' + (40 + hash) + ',' + (22 + hash) + ')';
      _miniCtx.fillRect(x0, y0, cs, cs);

      var dangerEntry = _dangerMap[ch.cx + ',' + ch.cz];
      if (dangerEntry) {
        var dangerColors = getDangerColors(dangerEntry, now);
        if (dangerColors) {
          _miniCtx.fillStyle = dangerColors.fill;
          _miniCtx.fillRect(x0, y0, cs, cs);
          if (dangerEntry.level !== 'low' || dangerEntry.activePressure > 0) {
            _miniCtx.strokeStyle = dangerColors.stroke;
            _miniCtx.lineWidth = 1;
            _miniCtx.strokeRect(x0 + 0.5, y0 + 0.5, Math.max(1, cs - 1), Math.max(1, cs - 1));
          }
        }
      }

      var miniBossInfo = getBossZoneInfoForChunk(ch.cx, ch.cz, ch);
      if (miniBossInfo) {
        _miniCtx.fillStyle = miniBossInfo.overlayFill;
        _miniCtx.fillRect(x0, y0, cs, cs);
      }

      if (ch.objects) {
        for (var i = 0; i < ch.objects.length; i++) {
          var obj = ch.objects[i];
          if (obj._destroyed || obj.hp <= 0) continue;
          var ic = iconFor(obj.type || '');
          if (!ic) continue;
          var ox = cx + (ch.cx * CHUNK + obj.x - pos.x) * scale;
          var oy = cy + (ch.cz * CHUNK + obj.z - pos.z) * scale;
          _miniCtx.fillStyle = ic.c;
          _miniCtx.fillRect(ox - 1, oy - 1, 2, 2);
        }
      }

      if (miniBossInfo) {
        drawBossMarker(_miniCtx, x0 + cs / 2, y0 + cs / 2, Math.max(2.6, cs * 0.12), miniBossInfo.markerColor, miniBossInfo.cleared);
      }

      var miniOutpostInfo = getRuinedOutpostInfoForChunk(ch.cx, ch.cz, ch);
      if (miniOutpostInfo) {
        drawOutpostMarker(_miniCtx, x0 + cs * 0.72, y0 + cs * 0.34, Math.max(2.2, cs * 0.08), miniOutpostInfo.looted);
      }
    }

    // Water
    if (typeof WaterSystem !== 'undefined') {
      var wt = WaterSystem.getWaterTiles();
      for (var wk in wt) {
        var p = wk.split(',');
        var wx = parseInt(p[0]), wz = parseInt(p[1]);
        var wcx = Math.floor(wx / CHUNK), wcz = Math.floor(wz / CHUNK);
        if (!explored[wcx + ',' + wcz]) continue;
        var sx = cx + (wx - pos.x) * scale;
        var sy = cy + (wz - pos.z) * scale;
        if (sx < -5 || sx > w + 5 || sy < -5 || sy > h + 5) continue;
        _miniCtx.fillStyle = wt[wk] === 'deep' ? '#1a3a6e' : '#3377bb';
        _miniCtx.fillRect(sx - 0.8, sy - 0.8, 1.6, 1.6);
      }
    }

    // Buildings
    for (var uid in instances) {
      var inst = instances[uid];
      var bx = cx + (inst.x - pos.x) * scale;
      var by = cy + (inst.z - pos.z) * scale;
      if (bx < -8 || bx > w + 8 || by < -8 || by > h + 8) continue;
      var bBal = GameRegistry.getBalance(inst.entityId);
      if (isNight && bBal && bBal.lightRadius) {
        var fuel = GameState.getFireFuel ? GameState.getFireFuel(uid) : null;
        var hasFuel = fuel === null || fuel === undefined || fuel > 0;
        if (hasFuel) {
          _miniCtx.fillStyle = 'rgba(255,150,50,0.28)';
          _miniCtx.beginPath();
          _miniCtx.arc(bx, by, 4.5, 0, Math.PI * 2);
          _miniCtx.fill();
        }
      }
      _miniCtx.fillStyle = '#ffcc33';
      _miniCtx.fillRect(bx - 2, by - 2, 4, 4);
    }

    // End rotation
    _miniCtx.restore();

    // Ring border
    _miniCtx.strokeStyle = 'rgba(120,180,140,0.6)';
    _miniCtx.lineWidth = 2;
    _miniCtx.beginPath();
    _miniCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    _miniCtx.stroke();

    // Mini-map edge fade
    var vig = _miniCtx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.5)');
    _miniCtx.fillStyle = vig;
    _miniCtx.beginPath();
    _miniCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    _miniCtx.fill();

    // Player direction triangle
    var angle = worldAngleToCanvas(dir);
    _miniCtx.save();
    _miniCtx.translate(cx, cy);
    _miniCtx.rotate(angle);
    _miniCtx.fillStyle = '#fff';
    _miniCtx.beginPath();
    _miniCtx.moveTo(0, -7);
    _miniCtx.lineTo(-4, 4);
    _miniCtx.lineTo(4, 4);
    _miniCtx.closePath();
    _miniCtx.fill();
    _miniCtx.restore();

    // Compass - N is at 45° CW from canvas-up (upper-right)
    // World north (0,-1): cdx = 0-(-1)=1, cdy = 0+(-1)=-1 → angle = atan2(1,1) = π/4
    var compassR = radius - 10;
    var nAngle = Math.PI / 4; // 45° CW from top
    _miniCtx.fillStyle = '#ff4444';
    _miniCtx.font = 'bold 9px sans-serif';
    _miniCtx.textAlign = 'center';
    _miniCtx.textBaseline = 'middle';
    _miniCtx.fillText('N', cx + Math.sin(nAngle) * compassR, cy - Math.cos(nAngle) * compassR);

    _miniCtx.fillStyle = 'rgba(200,200,200,0.5)';
    _miniCtx.font = '7px sans-serif';
    _miniCtx.fillText('[M]', cx, h - 4);

    // End clip
    _miniCtx.restore();
  }

  // ========== FULL MAP ==========
  function drawFullMap() {
    var pos = GamePlayer.getPosition();
    var dir = GamePlayer.getDirection ? GamePlayer.getDirection() : { x: 0, z: 1 };
    var explored = GameState.getExplored ? GameState.getExplored() : {};
    var chunks = GameTerrain.getAllChunks ? GameTerrain.getAllChunks() : {};
    var instances = getMapInstances();

    var w = _mapCanvas.width, h = _mapCanvas.height;
    var scale = 3 * _zoom;
    var rawScale = scale * SQRT2_2;
    var now = performance.now();

    _mapCtx.clearRect(0, 0, w, h);
    _mapCtx.fillStyle = '#06080a';
    _mapCtx.fillRect(0, 0, w, h);

    var halfW = w / 2, halfH = h / 2;

    // World-to-screen with 45° rotation matching camera view
    function w2s(wx, wz) {
      var dx = wx - _camX;
      var dz = wz - _camZ;
      return {
        x: halfW + (dx - dz) * rawScale,
        y: halfH + (dx + dz) * rawScale
      };
    }

    // View bounds in world space (generous to cover rotated diamond)
    var viewR = Math.max(w, h) / rawScale / 2 + CHUNK * 2;
    var minCX = Math.floor((_camX - viewR) / CHUNK) - 1;
    var maxCX = Math.ceil((_camX + viewR) / CHUNK) + 1;
    var minCZ = Math.floor((_camZ - viewR) / CHUNK) - 1;
    var maxCZ = Math.ceil((_camZ + viewR) / CHUNK) + 1;

    // Helper: draw a chunk diamond
    function drawChunkQuad(cx_, cz_, fillColor, strokeColor) {
      var q0 = w2s(cx_ * CHUNK, cz_ * CHUNK);
      var q1 = w2s((cx_ + 1) * CHUNK, cz_ * CHUNK);
      var q2 = w2s((cx_ + 1) * CHUNK, (cz_ + 1) * CHUNK);
      var q3 = w2s(cx_ * CHUNK, (cz_ + 1) * CHUNK);
      _mapCtx.fillStyle = fillColor;
      _mapCtx.beginPath();
      _mapCtx.moveTo(q0.x, q0.y);
      _mapCtx.lineTo(q1.x, q1.y);
      _mapCtx.lineTo(q2.x, q2.y);
      _mapCtx.lineTo(q3.x, q3.y);
      _mapCtx.closePath();
      _mapCtx.fill();
      if (strokeColor) {
        _mapCtx.strokeStyle = strokeColor;
        _mapCtx.lineWidth = 0.5;
        _mapCtx.stroke();
      }
    }

    // Build set of active chunks for quick lookup
    var activeChunks = {};
    for (var ck in chunks) {
      var ch = chunks[ck];
      if (ch && ch.cx !== undefined) activeChunks[ch.cx + ',' + ch.cz] = ch;
    }

    // 1) Draw ALL explored chunks (including unloaded) as terrain
    for (var expKey in explored) {
      var ep = expKey.split(',');
      var ecx = parseInt(ep[0]), ecz = parseInt(ep[1]);
      if (ecx < minCX || ecx > maxCX || ecz < minCZ || ecz > maxCZ) continue;

      var hash = ((ecx * 73 + ecz * 137) & 0xff) % 15;
      drawChunkQuad(ecx, ecz,
        'rgb(' + (30 + hash * 2) + ',' + (48 + hash * 2) + ',' + (28 + hash) + ')',
        'rgba(60,90,60,0.15)');

      var dangerEntry = _dangerMap[expKey];
      if (dangerEntry) {
        var dangerColors = getDangerColors(dangerEntry, now);
        if (dangerColors) {
          drawChunkQuad(ecx, ecz, dangerColors.fill, dangerEntry.level === 'low' ? null : dangerColors.stroke);
        }
      }

      // Draw objects only for active (loaded) chunks
      var activeCh = activeChunks[expKey];
      var bossInfo = getBossZoneInfoForChunk(ecx, ecz, activeCh);
      if (bossInfo) {
        drawChunkQuad(ecx, ecz, bossInfo.overlayFill, bossInfo.overlayStroke);
      }

      if (activeCh && activeCh.objects) {
        for (var i = 0; i < activeCh.objects.length; i++) {
          var obj = activeCh.objects[i];
          if (obj._destroyed || obj.hp <= 0) continue;
          var ic = iconFor(obj.type || '');
          if (!ic) continue;
          var sp = w2s(ecx * CHUNK + obj.x, ecz * CHUNK + obj.z);
          if (sp.x < -20 || sp.x > w + 20 || sp.y < -20 || sp.y > h + 20) continue;
          var ds = Math.max(2, scale * 0.4);
          _mapCtx.fillStyle = ic.c;
          drawIcon(sp.x, sp.y, ds, ic.s);
        }
      }

      if (dangerEntry && (dangerEntry.level === 'high' || dangerEntry.activePressure > 0 || dangerEntry.zoneLabel)) {
        var dp = w2s(ecx * CHUNK + CHUNK / 2, ecz * CHUNK + CHUNK / 2);
        if (dp.x > -20 && dp.x < w + 20 && dp.y > -20 && dp.y < h + 20) {
          drawDangerBadge(dp.x, dp.y, Math.max(4, scale * 0.45), dangerEntry.activePressure > 0);
        }
      }

      if (bossInfo) {
        var bossMarker = w2s(ecx * CHUNK + CHUNK / 2, ecz * CHUNK + CHUNK / 2);
        if (bossMarker.x > -24 && bossMarker.x < w + 24 && bossMarker.y > -24 && bossMarker.y < h + 24) {
          drawBossMarker(_mapCtx, bossMarker.x, bossMarker.y, Math.max(5, scale * 0.48), bossInfo.markerColor, bossInfo.cleared);
        }
      }

      var outpostInfo = getRuinedOutpostInfoForChunk(ecx, ecz, activeCh);
      if (outpostInfo) {
        var outpostMarker = w2s(ecx * CHUNK + CHUNK * 0.72, ecz * CHUNK + CHUNK * 0.34);
        if (outpostMarker.x > -20 && outpostMarker.x < w + 20 && outpostMarker.y > -20 && outpostMarker.y < h + 20) {
          drawOutpostMarker(_mapCtx, outpostMarker.x, outpostMarker.y, Math.max(4, scale * 0.36), outpostInfo.looted);
        }
      }
    }

    // 2) Draw fog of war for unexplored active chunks
    for (var ck2 in chunks) {
      var ch2 = chunks[ck2];
      if (!ch2 || ch2.cx === undefined) continue;
      if (ch2.cx < minCX || ch2.cx > maxCX || ch2.cz < minCZ || ch2.cz > maxCZ) continue;
      if (explored[ch2.cx + ',' + ch2.cz]) continue;
      drawChunkQuad(ch2.cx, ch2.cz, '#080810', null);
      var cp = w2s(ch2.cx * CHUNK + CHUNK / 2, ch2.cz * CHUNK + CHUNK / 2);
      if (cp.x > -20 && cp.x < w + 20 && cp.y > -20 && cp.y < h + 20) {
        drawChunkQuad(ch2.cx, ch2.cz, 'rgba(15,15,25,0.6)', null);
        var fogSize = CHUNK * rawScale;
        if (fogSize > 14) {
          _mapCtx.fillStyle = 'rgba(40,40,60,0.4)';
          _mapCtx.font = Math.max(8, Math.floor(fogSize * 0.3)) + 'px sans-serif';
          _mapCtx.textAlign = 'center';
          _mapCtx.textBaseline = 'middle';
          _mapCtx.fillText('?', cp.x, cp.y);
        }
      }
    }

    // 3) Draw dark border around explored edges (unexplored neighbors)
    var fogDrawn = {};
    for (var expKey2 in explored) {
      var fp = expKey2.split(',');
      var fcx = parseInt(fp[0]), fcz = parseInt(fp[1]);
      for (var fdx = -1; fdx <= 1; fdx++) {
        for (var fdz = -1; fdz <= 1; fdz++) {
          var nx = fcx + fdx, nz = fcz + fdz;
          var nkey = nx + ',' + nz;
          if (explored[nkey] || fogDrawn[nkey] || activeChunks[nkey]) continue;
          if (nx < minCX || nx > maxCX || nz < minCZ || nz > maxCZ) continue;
          fogDrawn[nkey] = true;
          drawChunkQuad(nx, nz, '#080810', null);
        }
      }
    }

    // Water
    if (typeof WaterSystem !== 'undefined') {
      var wt = WaterSystem.getWaterTiles();
      for (var wk in wt) {
        var pts = wk.split(',');
        var wtx = parseInt(pts[0]), wtz = parseInt(pts[1]);
        var wcx = Math.floor(wtx / CHUNK), wcz = Math.floor(wtz / CHUNK);
        if (!explored[wcx + ',' + wcz]) continue;
        var sp = w2s(wtx, wtz);
        if (sp.x < -5 || sp.x > w + 5 || sp.y < -5 || sp.y > h + 5) continue;
        _mapCtx.fillStyle = wt[wk] === 'deep' ? '#1a3a7e' : '#3388cc';
        var wd = Math.max(1.5, scale * 0.35);
        _mapCtx.fillRect(sp.x - wd / 2, sp.y - wd / 2, wd, wd);
      }
    }

    // Buildings
    for (var uid in instances) {
      var inst = instances[uid];
      var sp = w2s(inst.x, inst.z);
      if (sp.x < -30 || sp.x > w + 30 || sp.y < -30 || sp.y > h + 30) continue;
      var bcx = Math.floor(inst.x / CHUNK), bcz = Math.floor(inst.z / CHUNK);
      if (!explored[bcx + ',' + bcz]) continue;

      var bEnt = GameRegistry.getEntity(inst.entityId);
      var bName = bEnt ? bEnt.name : inst.entityId;
      var bBal = GameRegistry.getBalance(inst.entityId);
      var bSize = Math.max(4, scale * 0.6);

      var coverageSpecs = getMapCoverageSpecs(inst, bBal, inst.level || 1);
      for (var coverageIndex = 0; coverageIndex < coverageSpecs.length; coverageIndex++) {
        var coverage = coverageSpecs[coverageIndex];
        drawWorldCoverageRing(sp.x, sp.y, coverage.radius, rawScale, coverage.fill, coverage.stroke, coverage.lineWidth);
      }

      _mapCtx.fillStyle = '#ffcc33';
      _mapCtx.beginPath();
      _mapCtx.moveTo(sp.x, sp.y - bSize);
      _mapCtx.lineTo(sp.x + bSize, sp.y);
      _mapCtx.lineTo(sp.x, sp.y + bSize);
      _mapCtx.lineTo(sp.x - bSize, sp.y);
      _mapCtx.closePath();
      _mapCtx.fill();
      _mapCtx.strokeStyle = 'rgba(255,255,255,0.7)';
      _mapCtx.lineWidth = 1;
      _mapCtx.stroke();

      if (scale > 1.5) {
        _mapCtx.font = '11px sans-serif';
        _mapCtx.textAlign = 'center';
        var tw = _mapCtx.measureText(bName).width + 6;
        _mapCtx.fillStyle = 'rgba(0,0,0,0.7)';
        _mapCtx.fillRect(sp.x - tw / 2, sp.y - bSize - 16, tw, 14);
        _mapCtx.fillStyle = '#ffe080';
        _mapCtx.fillText(bName, sp.x, sp.y - bSize - 5);
      }
    }

    // Player marker
    var pp = w2s(pos.x, pos.z);
    var pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.3;
    _mapCtx.strokeStyle = 'rgba(68,153,255,' + pulse + ')';
    _mapCtx.lineWidth = 2;
    _mapCtx.beginPath();
    _mapCtx.arc(pp.x, pp.y, 12, 0, Math.PI * 2);
    _mapCtx.stroke();

    var pAngle = worldAngleToCanvas(dir);
    _mapCtx.save();
    _mapCtx.translate(pp.x, pp.y);
    _mapCtx.rotate(pAngle);
    _mapCtx.fillStyle = '#4499ff';
    _mapCtx.beginPath();
    _mapCtx.moveTo(0, -9);
    _mapCtx.lineTo(-6, 6);
    _mapCtx.lineTo(6, 6);
    _mapCtx.closePath();
    _mapCtx.fill();
    _mapCtx.strokeStyle = '#fff';
    _mapCtx.lineWidth = 1.5;
    _mapCtx.stroke();
    _mapCtx.restore();

    // Hover tooltip
    if (_hoverInfo) {
      _mapCtx.font = '12px sans-serif';
      var htw = _mapCtx.measureText(_hoverInfo).width + 10;
      _mapCtx.fillStyle = 'rgba(0,0,0,0.85)';
      _mapCtx.fillRect(_hoverX + 12, _hoverY - 12, htw, 20);
      _mapCtx.strokeStyle = 'rgba(100,160,120,0.5)';
      _mapCtx.lineWidth = 1;
      _mapCtx.strokeRect(_hoverX + 12, _hoverY - 12, htw, 20);
      _mapCtx.fillStyle = '#eee';
      _mapCtx.textAlign = 'left';
      _mapCtx.fillText(_hoverInfo, _hoverX + 17, _hoverY + 2);
    }

    // UI overlay
    drawMapUI(w, h, pos);
  }

  function drawIcon(x, y, s, shape) {
    _mapCtx.beginPath();
    if (shape === 'tri') {
      _mapCtx.moveTo(x, y - s);
      _mapCtx.lineTo(x - s, y + s);
      _mapCtx.lineTo(x + s, y + s);
      _mapCtx.closePath();
    } else if (shape === 'diamond') {
      _mapCtx.moveTo(x, y - s);
      _mapCtx.lineTo(x + s, y);
      _mapCtx.lineTo(x, y + s);
      _mapCtx.lineTo(x - s, y);
      _mapCtx.closePath();
    } else {
      _mapCtx.rect(x - s, y - s, s * 2, s * 2);
    }
    _mapCtx.fill();
  }

  function drawDangerBadge(x, y, s, isCritical) {
    _mapCtx.fillStyle = isCritical ? '#ff5555' : '#ff8a4a';
    _mapCtx.beginPath();
    _mapCtx.moveTo(x, y - s);
    _mapCtx.lineTo(x + s, y + s * 0.85);
    _mapCtx.lineTo(x - s, y + s * 0.85);
    _mapCtx.closePath();
    _mapCtx.fill();
    _mapCtx.strokeStyle = 'rgba(255,245,245,0.9)';
    _mapCtx.lineWidth = 1;
    _mapCtx.stroke();

    _mapCtx.fillStyle = '#fff';
    _mapCtx.font = 'bold ' + Math.max(7, Math.floor(s * 1.5)) + 'px sans-serif';
    _mapCtx.textAlign = 'center';
    _mapCtx.textBaseline = 'middle';
    _mapCtx.fillText('!', x, y + s * 0.15);
  }

  function drawBossMarker(ctx, x, y, size, color, cleared) {
    ctx.save();
    ctx.strokeStyle = cleared ? 'rgba(190, 190, 190, 0.65)' : color;
    ctx.fillStyle = 'rgba(120, 120, 120, 0.14)';
    if (!cleared) {
      var parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color || '#ffd166');
      ctx.fillStyle = parsed
        ? ('rgba(' + parseInt(parsed[1], 16) + ',' + parseInt(parsed[2], 16) + ',' + parseInt(parsed[3], 16) + ',0.18)')
        : 'rgba(255, 209, 102, 0.18)';
    }
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (var pointIndex = 0; pointIndex < 8; pointIndex++) {
      var outer = pointIndex % 2 === 0;
      var radius = outer ? size : size * 0.45;
      var angle = -Math.PI / 2 + pointIndex * (Math.PI / 4);
      var px = x + Math.cos(angle) * radius;
      var py = y + Math.sin(angle) * radius;
      if (pointIndex === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawOutpostMarker(ctx, x, y, size, looted) {
    ctx.save();
    ctx.strokeStyle = looted ? 'rgba(170, 170, 170, 0.7)' : 'rgba(222, 194, 134, 0.95)';
    ctx.fillStyle = looted ? 'rgba(90, 90, 90, 0.18)' : 'rgba(202, 163, 107, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.rect(x - size, y - size * 0.7, size * 2, size * 1.4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.8, y + size * 0.7);
    ctx.lineTo(x + size * 0.8, y - size * 0.7);
    ctx.stroke();
    ctx.restore();
  }

  function getMapCoverageSpecs(instance, balance, level) {
    var specs = [];
    if (!instance || !balance) return specs;

    if (balance.lightRadius) {
      var currentFuel = GameState.getFireFuel ? GameState.getFireFuel(instance.uid) : null;
      var isFueled = currentFuel === null || currentFuel === undefined || currentFuel > 0;
      var isNight = typeof DayNightSystem !== 'undefined' && DayNightSystem.isNight();
      specs.push({
        radius: balance.lightRadius,
        fill: isFueled ? (isNight ? 'rgba(255,176,71,0.14)' : 'rgba(255,176,71,0.08)') : 'rgba(233,69,96,0.05)',
        stroke: isFueled ? 'rgba(255,190,110,0.5)' : 'rgba(233,69,96,0.45)',
        lineWidth: isFueled ? 1 : 1.2
      });
    }

    var guardRadius = (balance.guardRadius && balance.guardRadius[level]) ? balance.guardRadius[level] : 0;
    if (!guardRadius && balance.towerDefense && balance.towerDefense.range) {
      guardRadius = balance.towerDefense.range[level] || balance.towerDefense.range[1] || 0;
    }
    if (guardRadius > 0 && instance.entityId === 'building.watchtower') {
      specs.push({
        radius: guardRadius,
        fill: 'rgba(231,111,81,0.08)',
        stroke: 'rgba(231,111,81,0.45)',
        lineWidth: 1
      });
    }

    return specs;
  }

  function drawWorldCoverageRing(screenX, screenY, radiusWorld, rawScale, fillColor, strokeColor, lineWidth) {
    var screenRadius = radiusWorld * rawScale;
    if (screenRadius < 2) return;

    _mapCtx.beginPath();
    _mapCtx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
    _mapCtx.fillStyle = fillColor;
    _mapCtx.fill();
    _mapCtx.strokeStyle = strokeColor;
    _mapCtx.lineWidth = lineWidth || 1;
    _mapCtx.stroke();
  }

  function drawMapUI(w, h, pos) {
    // Bottom bar
    _mapCtx.fillStyle = 'rgba(0,0,0,0.7)';
    _mapCtx.fillRect(0, h - 24, w, 24);
    _mapCtx.font = '10px sans-serif';
    _mapCtx.textAlign = 'left';
    _mapCtx.fillStyle = '#8a8';
    _mapCtx.fillText('X:' + Math.floor(pos.x) + '  Z:' + Math.floor(pos.z), 10, h - 8);
    _mapCtx.textAlign = 'center';
    _mapCtx.fillText('Zoom: ' + _zoom.toFixed(1) + 'x', w / 2, h - 8);
    _mapCtx.textAlign = 'right';
    _mapCtx.fillStyle = '#666';
    _mapCtx.fillText(t('world.minimap.controls', null, 'Scroll: Zoom | Drag: Move | [M] Close'), w - 10, h - 8);

    // Legend top-right
    var items = [
      { c: '#3aaa3a', l: t('world.minimap.legend.trees', null, 'Trees') },
      { c: '#9999bb', l: t('world.minimap.legend.ore', null, 'Ore') },
      { c: '#ff5577', l: t('world.minimap.legend.berry', null, 'Berry') },
      { c: '#d8cbb5', l: t('world.minimap.legend.prey', null, 'Prey') },
      { c: '#ff3344', l: t('world.minimap.legend.threat', null, 'Threat') },
      { c: '#ffd166', l: t('world.minimap.legend.bossZone', null, 'Boss zone') },
      { c: '#caa36b', l: t('world.minimap.legend.ruinedOutpost', null, 'Ruined outpost') },
      { c: '#ff8a4a', l: t('world.minimap.legend.danger', null, 'Danger') },
      { c: '#ffb047', l: t('world.minimap.legend.lightCover', null, 'Light cover') },
      { c: '#e76f51', l: t('world.minimap.legend.defenseCover', null, 'Defense cover') },
      { c: '#ffcc33', l: t('world.minimap.legend.buildings', null, 'Buildings') },
      { c: '#3388cc', l: t('world.minimap.legend.water', null, 'Water') }
    ];
    var lx = w - 126, ly = 8;
    _mapCtx.fillStyle = 'rgba(0,0,0,0.75)';
    _mapCtx.fillRect(lx, ly, 118, items.length * 16 + 6);
    _mapCtx.strokeStyle = 'rgba(80,140,100,0.3)';
    _mapCtx.strokeRect(lx, ly, 118, items.length * 16 + 6);
    for (var i = 0; i < items.length; i++) {
      var iy = ly + 10 + i * 16;
      _mapCtx.fillStyle = items[i].c;
      _mapCtx.fillRect(lx + 6, iy - 4, 8, 8);
      _mapCtx.fillStyle = '#bbb';
      _mapCtx.textAlign = 'left';
      _mapCtx.font = '10px sans-serif';
      _mapCtx.fillText(items[i].l, lx + 18, iy + 3);
    }

    // Compass rose in top-left
    var compX = 40, compY = 50;
    var dirs = [
      { label: 'N', angle: Math.PI / 4, color: '#ff4444' },
      { label: 'E', angle: 3 * Math.PI / 4, color: '#aaa' },
      { label: 'S', angle: 5 * Math.PI / 4, color: '#aaa' },
      { label: 'W', angle: 7 * Math.PI / 4, color: '#aaa' }
    ];
    _mapCtx.fillStyle = 'rgba(0,0,0,0.6)';
    _mapCtx.beginPath();
    _mapCtx.arc(compX, compY, 22, 0, Math.PI * 2);
    _mapCtx.fill();
    _mapCtx.strokeStyle = 'rgba(100,160,120,0.4)';
    _mapCtx.lineWidth = 1;
    _mapCtx.stroke();

    dirs.forEach(function(d) {
      var r = 16;
      var tx = compX + Math.sin(d.angle) * r;
      var ty = compY - Math.cos(d.angle) * r;
      _mapCtx.fillStyle = d.color;
      _mapCtx.font = 'bold 9px sans-serif';
      _mapCtx.textAlign = 'center';
      _mapCtx.textBaseline = 'middle';
      _mapCtx.fillText(d.label, tx, ty);
    });
  }

  function toggleMap() {
    if (!isMinimapEnabled()) {
      refreshVisibility();
      return;
    }

    _mapOpen = !_mapOpen;
    var popup = document.getElementById('map-popup');
    if (popup) popup.style.display = _mapOpen ? 'flex' : 'none';
    if (_mapOpen && _mapCanvas) {
      var pos = GamePlayer.getPosition();
      var mapSettings = getMapSettings();
      var defaultZoom = Number(mapSettings.defaultZoom);
      if (!(defaultZoom > 0)) defaultZoom = 1.0;
      _camX = pos.x;
      _camZ = pos.z;
      _zoom = defaultZoom;
      resizeMapCanvas();
      refreshDangerMap(true);
      _lastFullMapDrawAt = 0;
      _fullMapDirty = true;
      drawFullMap();
    }
  }

  function resizeMapCanvas() {
    if (!_mapCanvas) return;
    var popup = document.getElementById('map-popup');
    if (!popup) return;
    _mapCanvas.width = popup.clientWidth;
    _mapCanvas.height = popup.clientHeight - 32;
    _fullMapDirty = true;
  }

  function isMapOpen() { return _mapOpen; }

  return {
    init: init,
    update: update,
    toggleMap: toggleMap,
    isMapOpen: isMapOpen,
    refreshVisibility: refreshVisibility
  };
})();
