window.MiniMap = (function () {
  var _miniCanvas = null;
  var _miniCtx = null;
  var _updateCounter = 0;
  var _UPDATE_INTERVAL = 4;

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

  var CHUNK = 16;

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
    animal: { c: '#ff3344', s: 'tri' }
  };

  function iconFor(type) {
    for (var k in ICON) { if (type.indexOf(k) >= 0) return ICON[k]; }
    return null;
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

  function init() {
    _miniCanvas = document.getElementById('minimap-canvas');
    if (_miniCanvas) _miniCtx = _miniCanvas.getContext('2d');

    _mapCanvas = document.getElementById('map-full-canvas');
    if (_mapCanvas) {
      _mapCtx = _mapCanvas.getContext('2d');
      setupMapInput();
    }
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
        if (_mapOpen && _mapCanvas) updateHover(e);
        return;
      }
      // Inverse of the rotation: worldDX = (sdx + sdy)/(2*rawScale), worldDZ = (sdy - sdx)/(2*rawScale)
      var rawScale = 3 * _zoom * SQRT2_2;
      var sdx = e.clientX - _dragSX;
      var sdy = e.clientY - _dragSY;
      _camX = _dragCX - (sdx + sdy) / (2 * rawScale);
      _camZ = _dragCZ - (sdy - sdx) / (2 * rawScale);
    });
    window.addEventListener('mouseup', function() {
      _dragging = false;
      if (_mapCanvas) _mapCanvas.style.cursor = 'default';
    });
    _mapCanvas.addEventListener('wheel', function(e) {
      e.preventDefault();
      _zoom = Math.max(0.3, Math.min(4.0, _zoom * (e.deltaY < 0 ? 1.2 : 0.83)));
    });
  }

  function updateHover(e) {
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
    var best = 3 * _zoom * 15;
    var instances = GameState.getAllInstances ? GameState.getAllInstances() : {};
    for (var uid in instances) {
      var inst = instances[uid];
      var d = Math.sqrt(Math.pow(inst.x - worldMX, 2) + Math.pow(inst.z - worldMZ, 2));
      if (d < best) {
        best = d;
        var ent = GameRegistry.getEntity(inst.entityId);
        _hoverInfo = (ent ? ent.name : inst.entityId) + ' (' + Math.floor(inst.x) + ',' + Math.floor(inst.z) + ')';
      }
    }
    _hoverX = mx; _hoverY = my;
  }

  function update() {
    _updateCounter++;
    if (_updateCounter % _UPDATE_INTERVAL !== 0) return;
    if (typeof GamePlayer === 'undefined' || !GamePlayer.getPosition) return;

    drawMinimap();
    if (_mapOpen) drawFullMap();
  }

  // ========== MINIMAP ==========
  function drawMinimap() {
    var pos = GamePlayer.getPosition();
    var dir = GamePlayer.getDirection ? GamePlayer.getDirection() : { x: 0, z: 1 };
    var explored = GameState.getExplored ? GameState.getExplored() : {};
    var chunks = GameTerrain.getAllChunks ? GameTerrain.getAllChunks() : {};
    var instances = GameState.getAllInstances ? GameState.getAllInstances() : {};

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
      if (bBal && bBal.lightRadius) {
        var fg = _miniCtx.createRadialGradient(bx, by, 0, bx, by, 6);
        fg.addColorStop(0, 'rgba(255,150,50,0.5)');
        fg.addColorStop(1, 'rgba(255,100,0,0)');
        _miniCtx.fillStyle = fg;
        _miniCtx.beginPath();
        _miniCtx.arc(bx, by, 6, 0, Math.PI * 2);
        _miniCtx.fill();
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

    // Vignette
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
    var instances = GameState.getAllInstances ? GameState.getAllInstances() : {};

    var w = _mapCanvas.width, h = _mapCanvas.height;
    var scale = 3 * _zoom;
    var rawScale = scale * SQRT2_2;

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

      // Draw objects only for active (loaded) chunks
      var activeCh = activeChunks[expKey];
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

      if (bBal && bBal.lightRadius) {
        var glowR = bSize * 3;
        var fg = _mapCtx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, glowR);
        fg.addColorStop(0, 'rgba(255,150,50,0.45)');
        fg.addColorStop(1, 'rgba(255,100,0,0)');
        _mapCtx.fillStyle = fg;
        _mapCtx.beginPath();
        _mapCtx.arc(sp.x, sp.y, glowR, 0, Math.PI * 2);
        _mapCtx.fill();
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
    _mapCtx.fillText('Cuon: Zoom | Keo: Di chuyen | [M] Dong', w - 10, h - 8);

    // Legend top-right
    var items = [
      { c: '#3aaa3a', l: 'Cay' },
      { c: '#9999bb', l: 'Da/Khoang' },
      { c: '#ff5577', l: 'Berry' },
      { c: '#ff3344', l: 'Dong vat' },
      { c: '#ffcc33', l: 'Toa nha' },
      { c: '#3388cc', l: 'Nuoc' }
    ];
    var lx = w - 95, ly = 8;
    _mapCtx.fillStyle = 'rgba(0,0,0,0.75)';
    _mapCtx.fillRect(lx, ly, 88, items.length * 16 + 6);
    _mapCtx.strokeStyle = 'rgba(80,140,100,0.3)';
    _mapCtx.strokeRect(lx, ly, 88, items.length * 16 + 6);
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
    _mapOpen = !_mapOpen;
    var popup = document.getElementById('map-popup');
    if (popup) popup.style.display = _mapOpen ? 'flex' : 'none';
    if (_mapOpen && _mapCanvas) {
      var pos = GamePlayer.getPosition();
      _camX = pos.x;
      _camZ = pos.z;
      _zoom = 1.0;
      resizeMapCanvas();
    }
  }

  function resizeMapCanvas() {
    if (!_mapCanvas) return;
    var popup = document.getElementById('map-popup');
    if (!popup) return;
    _mapCanvas.width = popup.clientWidth;
    _mapCanvas.height = popup.clientHeight - 32;
  }

  function isMapOpen() { return _mapOpen; }

  return {
    init: init,
    update: update,
    toggleMap: toggleMap,
    isMapOpen: isMapOpen
  };
})();
