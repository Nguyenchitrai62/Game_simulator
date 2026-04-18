window.GamePerf = (function () {
  var _enabled = true;
  var _metrics = {};
  var _values = {};
  var _frameStartedAt = 0;
  var _fpsSmoothed = 0;
  var _frameMsSmoothed = 0;
  var SMOOTHING = 0.18;

  function smoothValue(current, next) {
    return current <= 0 ? next : current + (next - current) * SMOOTHING;
  }

  function ensureMetric(name) {
    if (!_metrics[name]) {
      _metrics[name] = {
        lastMs: 0,
        avgMs: 0,
        maxMs: 0,
        count: 0
      };
    }
    return _metrics[name];
  }

  function recordDuration(name, durationMs) {
    if (!_enabled || !name || !isFinite(durationMs)) return 0;

    var metric = ensureMetric(name);
    metric.lastMs = durationMs;
    metric.avgMs = smoothValue(metric.avgMs, durationMs);
    metric.maxMs = Math.max(metric.maxMs, durationMs);
    metric.count++;
    return durationMs;
  }

  function begin(name) {
    if (!_enabled || !name || typeof performance === 'undefined') return null;
    return {
      name: name,
      start: performance.now()
    };
  }

  function end(mark) {
    if (!mark || !mark.name || typeof performance === 'undefined') return 0;
    return recordDuration(mark.name, performance.now() - mark.start);
  }

  function setValue(name, value) {
    if (!_enabled || !name) return value;
    _values[name] = value;
    return value;
  }

  function getValue(name) {
    return _values[name];
  }

  function getMetric(name) {
    return _metrics[name] || null;
  }

  function beginFrame(dt) {
    if (!_enabled) return;

    if (dt > 0) {
      _fpsSmoothed = smoothValue(_fpsSmoothed, 1 / dt);
      _frameMsSmoothed = smoothValue(_frameMsSmoothed, dt * 1000);
      setValue('frame.fps', _fpsSmoothed);
      setValue('frame.ms', _frameMsSmoothed);
    }

    if (typeof performance !== 'undefined') {
      _frameStartedAt = performance.now();
    }
  }

  function endFrame(renderer) {
    if (!_enabled) return;

    if (_frameStartedAt > 0 && typeof performance !== 'undefined') {
      recordDuration('frame.total', performance.now() - _frameStartedAt);
      _frameStartedAt = 0;
    }

    if (renderer && renderer.info) {
      var renderInfo = renderer.info.render || {};
      var memoryInfo = renderer.info.memory || {};
      setValue('draw.calls', renderInfo.calls || 0);
      setValue('draw.triangles', renderInfo.triangles || 0);
      setValue('draw.lines', renderInfo.lines || 0);
      setValue('draw.points', renderInfo.points || 0);
      setValue('memory.geometries', memoryInfo.geometries || 0);
      setValue('memory.textures', memoryInfo.textures || 0);
    }
  }

  function reset() {
    _metrics = {};
    _values = {};
    _frameStartedAt = 0;
    _fpsSmoothed = 0;
    _frameMsSmoothed = 0;
  }

  function getSnapshot() {
    return {
      enabled: _enabled,
      metrics: _metrics,
      values: _values
    };
  }

  function setEnabled(enabled) {
    _enabled = !!enabled;
    return _enabled;
  }

  function isEnabled() {
    return _enabled;
  }

  return {
    begin: begin,
    end: end,
    recordDuration: recordDuration,
    setValue: setValue,
    getValue: getValue,
    getMetric: getMetric,
    beginFrame: beginFrame,
    endFrame: endFrame,
    reset: reset,
    getSnapshot: getSnapshot,
    setEnabled: setEnabled,
    isEnabled: isEnabled
  };
})();