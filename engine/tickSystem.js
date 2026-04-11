window.TickSystem = (function () {
  var _tickCount = 0;
  var _resourceStats = {};
  var _lastNet = {};

  function tick() {
    _tickCount++;
    calculateResourceStats();
    applyProduction();
    TechSystem.tick();
    UnlockSystem.checkAll();

    if (typeof GameHUD !== "undefined") {
      GameHUD.renderAll();
    }

    if (_tickCount % 10 === 0) {
      GameStorage.save();
    }
  }
  
  function calculateResourceStats() {
    _resourceStats = { production: {}, consumption: {}, net: {}, timeLeft: {} };
    var instances = GameState.getAllInstances();
    var buildingList = [];
    
    for (var uid in instances) {
      var instance = instances[uid];
      var buildingId = instance.entityId;
      var balance = GameRegistry.getBalance(buildingId);
      
      if (balance) {
        buildingList.push({
          uid: uid,
          instance: instance,
          buildingId: buildingId,
          balance: balance
        });
      }
    }
    
    // Step 1: Calculate maximum possible production & consumption
    for (var i = 0; i < buildingList.length; i++) {
      var building = buildingList[i];
      var mult = UpgradeSystem.getProductionMultiplier(building.buildingId, building.uid);
      
      if (building.balance.produces) {
        for (var resId in building.balance.produces) {
          var amt = building.balance.produces[resId] * mult;
          _resourceStats.production[resId] = (_resourceStats.production[resId] || 0) + amt;
        }
      }
      
      if (building.balance.consumesPerTick) {
        for (var resId in building.balance.consumesPerTick) {
          var amt = building.balance.consumesPerTick[resId];
          _resourceStats.consumption[resId] = (_resourceStats.consumption[resId] || 0) + amt;
        }
      }
    }
    
    // Step 2: Calculate net
    var allResources = new Set([...Object.keys(_resourceStats.production), ...Object.keys(_resourceStats.consumption)]);
    allResources.forEach(function(resId) {
      var prod = _resourceStats.production[resId] || 0;
      var cons = _resourceStats.consumption[resId] || 0;
      _resourceStats.net[resId] = prod - cons;
      
      // Calculate depletion time
      if (_resourceStats.net[resId] < 0) {
        var current = GameState.getResource(resId);
        var perTickLoss = Math.abs(_resourceStats.net[resId]);
        _resourceStats.timeLeft[resId] = Math.floor(current / perTickLoss);
      } else {
        _resourceStats.timeLeft[resId] = Infinity;
      }
    });
    
    _lastNet = Object.assign({}, _resourceStats.net);
  }

  function applyProduction() {
    var instances = GameState.getAllInstances();
    var buildingList = [];
    
    // Bước 1: Thu thập tất cả building hợp lệ vào danh sách ổn định
    for (var uid in instances) {
      var instance = instances[uid];
      var buildingId = instance.entityId;
      var balance = GameRegistry.getBalance(buildingId);
      
      if (balance) {
        buildingList.push({
          uid: uid,
          instance: instance,
          buildingId: buildingId,
          balance: balance,
          canRun: false
        });
      }
    }
    
    // Bước 2: Sắp xếp thứ tự cố định (theo UID để đảm bảo stable order)
    buildingList.sort(function(a, b) {
      return a.uid.localeCompare(b.uid);
    });
    
    // Bước 3: Tính tổng tài nguyên cần thiết
    var totalRequired = {};
    for (var i = 0; i < buildingList.length; i++) {
      var building = buildingList[i];
      if (building.balance.consumesPerTick) {
        for (var resId in building.balance.consumesPerTick) {
          var needed = building.balance.consumesPerTick[resId];
          totalRequired[resId] = (totalRequired[resId] || 0) + needed;
        }
      }
    }
    
    // Bước 4: Kiểm tra tổng tài nguyên có đủ cho tất cả không
    var allCanRun = true;
    for (var resId in totalRequired) {
      if (!GameState.hasResource(resId, totalRequired[resId])) {
        allCanRun = false;
        break;
      }
    }
    
    if (allCanRun) {
      // Trường hợp 1: Đủ tài nguyên cho tất cả -> chạy toàn bộ
      for (var i = 0; i < buildingList.length; i++) {
        var building = buildingList[i];
        
        // Trừ tài nguyên tiêu thụ
        if (building.balance.consumesPerTick) {
          for (var resId in building.balance.consumesPerTick) {
            GameState.removeResource(resId, building.balance.consumesPerTick[resId]);
          }
        }
        
        // Áp dụng sản xuất
          if (building.balance.produces) {
            var mult = UpgradeSystem.getProductionMultiplier(building.buildingId, building.uid);
            for (var resId in building.balance.produces) {
              var amount = building.balance.produces[resId] * mult;
              GameState.addFractionalResource(resId, amount);
            }
          }
      }
    } else {
      // Trường hợp 2: Không đủ tổng -> chạy từng building theo thứ tự ưu tiên
      // Dùng thuật toán fair distribution: mỗi building chạy nếu còn đủ tài nguyên riêng tại thời điểm đó
      for (var i = 0; i < buildingList.length; i++) {
        var building = buildingList[i];
        var canProduce = true;
        
        if (building.balance.consumesPerTick) {
          // Kiểm tra tài nguyên cho building cụ thể này
          for (var resId in building.balance.consumesPerTick) {
            var needed = building.balance.consumesPerTick[resId];
            if (!GameState.hasResource(resId, needed)) {
              canProduce = false;
              break;
            }
          }
          
          if (canProduce) {
            // Trừ tài nguyên trước khi sản xuất
            for (var resId in building.balance.consumesPerTick) {
              GameState.removeResource(resId, building.balance.consumesPerTick[resId]);
            }
          }
        } else {
          // Building không cần tài nguyên thì luôn chạy
          canProduce = true;
        }
        
        // Chỉ sản xuất nếu đủ tài nguyên cho chính building này
        if (canProduce && building.balance.produces) {
          var mult = UpgradeSystem.getProductionMultiplier(building.buildingId, building.uid);
          for (var resId in building.balance.produces) {
            var amount = building.balance.produces[resId] * mult;
            GameState.addFractionalResource(resId, amount);
          }
        }
      }
    }
  }
  
  function getResourceStats() {
    return Object.assign({}, _resourceStats);
  }

  function getTickCount() { return _tickCount; }

  function tickPausedOnly() {
    _tickCount++;
    if (_tickCount % 10 === 0) {
      GameStorage.save();
    }
  }

  return {
    tick: tick,
    tickPausedOnly: tickPausedOnly,
    getTickCount: getTickCount,
    getResourceStats: getResourceStats,
    calculateResourceStats: calculateResourceStats
  };
})();
