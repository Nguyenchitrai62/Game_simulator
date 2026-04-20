window.GAME_BALANCE = {
  // ============================================================
  // CẤU HÌNH CÂN BẰNG - Tất cả giá trị tính theo GIÂY (không tick)
  // 1 tick = 1 giây game (ở tốc độ 1x)
  // Giá trial: perSecond = mỗi giây, respawnTime = giây thực tế
  // ============================================================

  // === NODE TÀI NGUYÊN (vật thể thế giới) ===
  "node.tree": {
    // Cây gỗ - hp thấp, respawn nhanh, cho 3 gỗ
    hp: 3,
    rewards: { "resource.wood": 3 },
    respawnTime: 30 // giây
  },
  "node.rock": {
    // Đá - hp trung bình, cho đá + đá lửa
    hp: 5,
    rewards: { "resource.stone": 2, "resource.flint": 1 },
    respawnTime: 45
  },
  "node.berry_bush": {
    // Bụi berry - luôn thu hoạch được, cấp cao cho nhiều quả hơn
    hp: 1,
    rewards: { "resource.food": 2 },
    respawnTime: 20
  },
  "node.flint_deposit": {
    // Mỏ đá lửa - hp trung bình, cho 3 đá lửa
    hp: 4,
    rewards: { "resource.flint": 3 },
    respawnTime: 60
  },

  // === ĐỘNG VẬT ===
  "animal.wolf": {
    // Sói - quái yếu nhất, aggro gần
    hp: 15,
    attack: 3,
    defense: 1,
    rewards: { "resource.food": 5 },
    respawnTime: 60, // giây
    aggroRange: 3, // ô
    behavior: {
      patrolRadius: 3.2,
      patrolSpeed: 0.46,
      chaseSpeed: 1.18,
      returnSpeed: 0.8,
      turnRate: 0.24,
      attackRange: 1.65,
      chaseRange: 6.9
    }
  },
  "animal.boar": {
    // Lợn rừng - trung bình, cho food + da
    hp: 20,
    attack: 5,
    defense: 2,
    rewards: { "resource.food": 8, "resource.leather": 2 },
    respawnTime: 90,
    aggroRange: 2.5,
    behavior: {
      patrolRadius: 3.2,
      patrolSpeed: 0.42,
      chaseSpeed: 1.0,
      returnSpeed: 0.76,
      turnRate: 0.2,
      attackRange: 1.375,
      chaseRange: 5.75
    }
  },
  "animal.bear": {
    // Gấu - mạnh thời Đá, cho nhiều food + da
    hp: 40,
    attack: 8,
    defense: 3,
    rewards: { "resource.food": 15, "resource.leather": 5 },
    respawnTime: 120,
    aggroRange: 2.5,
    behavior: {
      patrolRadius: 3.8,
      patrolSpeed: 0.34,
      chaseSpeed: 0.9,
      returnSpeed: 0.64,
      turnRate: 0.14,
      attackRange: 1.375,
      chaseRange: 5.75
    }
  },
  "animal.deer": {
    hp: 10,
    attack: 0,
    defense: 0,
    rewards: { "resource.food": 4, "resource.leather": 1 },
    respawnTime: 45,
    animalDisposition: "prey",
    fleeRange: 3.2,
    fleeSpeed: 1.08,
    behavior: {
      patrolRadius: 3.8,
      patrolSpeed: 0.48,
      returnSpeed: 0.84,
      turnRate: 0.22
    }
  },
  "animal.rabbit": {
    hp: 6,
    attack: 0,
    defense: 0,
    rewards: { "resource.food": 2 },
    respawnTime: 35,
    animalDisposition: "prey",
    fleeRange: 2.7,
    fleeSpeed: 1.2,
    behavior: {
      patrolRadius: 2.4,
      patrolSpeed: 0.54,
      returnSpeed: 0.96,
      turnRate: 0.28
    }
  },

  // === CÔNG TRÌNH (thời Đá) ===
  "building.wood_cutter": {
    // Công trình legacy - giữ lại để tương thích save cũ
    cost: { "resource.wood": 10 },
    searchRadius: { 1: 5, 2: 8, 3: 12 }, // bán kính tìm node (ô)
    workerCount: { 1: 1, 2: 2, 3: 3 },    // số công nhân theo level
    storageCapacity: { 1: 50, 2: 100, 3: 200 }, // sức chứa kho
    productionSpeed: { 1: 1.0, 2: 1.2, 3: 1.5 }, // tốc độ NL nhân
    produces: { "resource.wood": 2 },        // sản xuất mỗi giây (bị động)
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 30, "resource.stone": 10 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 80, "resource.stone": 30, "resource.flint": 10 }, productionMultiplier: 2.0 }
    }
  },
  "building.stone_quarry": {
    // Công trình legacy - giữ lại để tương thích save cũ
    cost: { "resource.wood": 15, "resource.stone": 5 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    storageCapacity: { 1: 30, 2: 60, 3: 120 },
    productionSpeed: { 1: 1.0, 2: 1.2, 3: 1.5 },
    produces: { "resource.stone": 1 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 40, "resource.stone": 20 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 100, "resource.stone": 50, "resource.flint": 15 }, productionMultiplier: 2.0 }
    }
  },
  "building.berry_gatherer": {
    // Resident House - workers gather nearby wood, stone, flint, berries, and tend farm plots
    cost: { "resource.wood": 12, "resource.stone": 4 },
    searchRadius: { 1: 6, 2: 9, 3: 12 },
    workerCount: { 1: 2, 2: 3, 3: 4 },
    storageCapacity: { 1: 60, 2: 110, 3: 180 },
    productionSpeed: { 1: 1.0, 2: 1.15, 3: 1.3 },
    produces: {},
    harvestNodeTypes: ["node.tree", "node.rock", "node.berry_bush", "node.flint_deposit"],
    supportsFarmPlots: true,
    farmWaterLevel: 3,
    treeCare: {
      requiredWorkerLevel: 3,
      harvestOnlyMaxStage: true,
      waterSearchRadius: 6,
      riverBoostRadius: 3,
      waterTaskSeconds: 1.8,
      growthTimeMultiplier: 0.55,
      minRemainingSeconds: 8
    },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 30, "resource.stone": 15, "resource.food": 10 }, productionMultiplier: 1.25 },
      3: { cost: { "resource.wood": 70, "resource.stone": 35, "resource.food": 25, "resource.flint": 8 }, productionMultiplier: 1.5 }
    }
  },
  "building.farm_plot": {
    // Auto-tended crop plot serviced by nearby resident workers
    cost: { "resource.wood": 12, "resource.stone": 4 },
    searchRadius: { 1: 0 },
    workerCount: { 1: 0 },
    storageCapacity: { 1: 24 },
    productionSpeed: { 1: 1.0 },
    produces: {},
    upgrades: {},
    farming: {
      cropKey: "root_crop",
      cropName: "Root Crop",
      workerHint: "Needs a nearby resident worker. Watering requires a Level 3 Resident House.",
      dryGrowthSeconds: 45,
      wateredGrowthSeconds: 24,
      riverGrowthSeconds: 18,
      dryYield: { "resource.food": 2 },
      wateredYield: { "resource.food": 4 },
      riverYield: { "resource.food": 6 },
      wellRange: 6,
      waterSearchRadius: 6,
      riverBoostRadius: 3,
      plantTaskSeconds: 1.2,
      waterTaskSeconds: 1.8,
      harvestTaskSeconds: 1.5
    }
  },
  "building.tree_nursery": {
    // Sapling beds that high-level residents replant for renewable wood
    cost: { "resource.wood": 18, "resource.stone": 6, "resource.food": 4 },
    searchRadius: { 1: 0 },
    workerCount: { 1: 0 },
    storageCapacity: { 1: 32 },
    productionSpeed: { 1: 1.0 },
    produces: {},
    upgrades: {},
    farming: {
      cropKey: "sapling_bed",
      cropName: "Sapling Bed",
      workerCropLabel: "saplings",
      workerHint: "Needs a Level 2 Resident House nearby. Watering requires Level 3.",
      requiredWorkerBuildingIds: ["building.berry_gatherer"],
      requiredWorkerLevel: 2,
      visualKind: "sapling",
      dryGrowthSeconds: 80,
      wateredGrowthSeconds: 48,
      riverGrowthSeconds: 38,
      dryYield: { "resource.wood": 4 },
      wateredYield: { "resource.wood": 7 },
      riverYield: { "resource.wood": 10 },
      wellRange: 6,
      waterSearchRadius: 6,
      riverBoostRadius: 3,
      plantTaskSeconds: 1.6,
      waterTaskSeconds: 2.0,
      harvestTaskSeconds: 1.8
    }
  },
  "building.flint_mine": {
    // Mỏ đá lửa - 1 đá lửa/giây
    cost: { "resource.wood": 20, "resource.stone": 10 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    storageCapacity: { 1: 25, 2: 50, 3: 100 },
    productionSpeed: { 1: 1.0, 2: 1.2, 3: 1.5 },
    produces: { "resource.flint": 1 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 50, "resource.stone": 30 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 120, "resource.stone": 60, "resource.flint": 20 }, productionMultiplier: 2.0 }
    }
  },
  "building.warehouse": {
    // Nhà kho - trung tâm chuyển hàng, sức chứa lớn, không có công nhân
    cost: { "resource.wood": 40, "resource.stone": 30 },
    searchRadius: { 1: 0, 2: 0, 3: 0 },
    workerCount: { 1: 0, 2: 0, 3: 0 },
    storageCapacity: { 1: 500, 2: 1000, 3: 2000 },
    productionSpeed: { 1: 1.0, 2: 1.0, 3: 1.0 },
    produces: {},
    transferRange: 5, // bán kính thu gom từ công trình khác (ô)
    upgrades: {
      2: { cost: { "resource.wood": 80, "resource.stone": 60 }, productionMultiplier: 1.0 },
      3: { cost: { "resource.wood": 160, "resource.stone": 120 }, productionMultiplier: 1.0 }
    }
  },
  "building.barracks": {
    // Doanh trại - trung tâm huấn luyện quân sự và dự bị phòng thủ
    cost: { "resource.wood": 50, "resource.stone": 40, "resource.tool": 5 },
    searchRadius: { 1: 0, 2: 0 },
    workerCount: { 1: 0, 2: 0 },
    storageCapacity: { 1: 0, 2: 0 },
    productionSpeed: { 1: 1.0, 2: 1.0 },
    produces: {},
    guardCount: { 1: 4, 2: 8 },   // sức chứa quân dự bị theo level
    guardRadius: { 1: 10, 2: 14 },   // bán kính chỉ huy / bảo vệ (ô)
    military: {
      queueSize: { 1: 2, 2: 4 },
      trainingSpeed: { 1: 1.0, 2: 1.35 },
      units: {
        swordsman: {
          label: "Swordsman",
          role: "Melee reserve",
          unlockLevel: 1,
          trainingSeconds: 18,
          attackDamage: 5,
          attackRange: 1.5,
          attackIntervalSeconds: 0.95,
          moveSpeed: 3.2,
          cost: { "resource.wood": 16, "resource.food": 12 },
          towerSupport: {
            label: "Reserve screen",
            workerProtectRadiusBonus: 2.0,
            targetPriorityBonus: 1.4
          }
        },
        spearman: {
          label: "Spearman",
          role: "Reach guard",
          unlockLevel: 2,
          trainingSeconds: 22,
          attackDamage: 6,
          attackRange: 2.2,
          attackIntervalSeconds: 1.05,
          moveSpeed: 3.05,
          cost: { "resource.wood": 18, "resource.food": 13, "resource.flint": 4 }
        },
        archer: {
          label: "Archer",
          role: "Ranged reserve",
          unlockLevel: 2,
          trainingSeconds: 26,
          attackDamage: 4,
          attackRange: 6.5,
          attackIntervalSeconds: 1.25,
          moveSpeed: 3.0,
          cost: { "resource.wood": 14, "resource.food": 12, "resource.flint": 6 },
          towerSupport: {
            label: "Archer overwatch",
            rangeBonus: 1.5,
            attackDamageBonus: 2,
            attackIntervalMultiplier: 0.82
          }
        }
      }
    },
    upgrades: {
      2: { cost: { "resource.wood": 100, "resource.stone": 80, "resource.tool": 10 }, productionMultiplier: 1.0 }
    }
  },
  "building.watchtower": {
    // Tháp canh - tự động bắn thú dữ quanh khu lao động
    cost: { "resource.wood": 40, "resource.stone": 25, "resource.flint": 6 },
    searchRadius: { 1: 0, 2: 0 },
    workerCount: { 1: 0, 2: 0 },
    storageCapacity: { 1: 0, 2: 0 },
    productionSpeed: { 1: 1.0, 2: 1.0 },
    produces: {},
    guardRadius: { 1: 9, 2: 12 },
    towerDefense: {
      range: { 1: 9, 2: 12 },
      attackDamage: { 1: 6, 2: 10 },
      attackIntervalSeconds: { 1: 2.0, 2: 1.4 },
      workerProtectRadius: 4.5,
      targetPriorityBonus: 3
    },
    upgrades: {
      2: { cost: { "resource.wood": 70, "resource.stone": 45, "resource.flint": 10 }, productionMultiplier: 1.0 }
    }
  },

  // === LỬA & ÁNH SÁNG ===
  "building.campfire": {
    // Lửa trại - sáng bán kính 15 ô, đốt 1 củi/giây ban đêm, sức chứa 100 nhiên liệu
    cost: { "resource.wood": 20, "resource.flint": 5 },
    searchRadius: { 1: 0 },
    workerCount: { 1: 0 },
    storageCapacity: { 1: 20 },
    lightRadius: 15,       // bán kính ánh sáng (ô)
    lightIntensity: 5.0,  // cường độ sáng
    lightColor: 0xFF6600,
    fuelCapacity: 100,     // sức chứa nhiên liệu
    fuelPerSecond: 1,      // tiêu thụ nhiên liệu mỗi giây (ban đêm)
    refuelCost: { "resource.wood": 8 }, // chi phí châm thêm nhiên liệu
    upgrades: {}
  },

  "recipe.handheld_torch": {
    // Công thức đuốc tay - 3 gỗ + 1 đá lửa
    input: { "resource.wood": 3, "resource.flint": 1 },
    output: { "item.handheld_torch": 1 }
  },
  "item.handheld_torch": {
    // Đuốc tay - phát sáng 8 ô, dùng 60 giây
    duration: 60,           // thời gian cháy (giây)
    lightRadius: 10,        // bán kính ánh sáng (ô)
    lightIntensity: 5.0,
    lightColor: 0xFFA500
  },

  // === CÔNG THỨC CHẾ TẠO (thời Đá) ===
  // Chỉ số trang bị và mô tả craft/equipment sẽ tự lấy từ equipment.* tương ứng ở bên dưới.
  "recipe.stone_tool": {
    // Công cụ đá - 3 đá lửa + 2 gỗ → 1 công cụ
    input: { "resource.flint": 3, "resource.wood": 2 },
    output: { "resource.tool": 1 }
  },
  "recipe.wooden_sword": {
    // Kiếm gỗ - +3 ATK
    input: { "resource.wood": 5, "resource.flint": 2 },
    output: { "equipment.wooden_sword": 1 }
  },
  "recipe.hunting_bow": {
    // Cung săn - vũ khí tầm xa an toàn hơn
    input: { "resource.wood": 10, "resource.flint": 2, "resource.leather": 1 },
    output: { "equipment.hunting_bow": 1 }
  },
  "recipe.stone_spear": {
    // Giáo đá - +6 ATK
    input: { "resource.wood": 8, "resource.flint": 4, "resource.stone": 3 },
    output: { "equipment.stone_spear": 1 }
  },
  "recipe.stone_shield": {
    // Khiên đá - +3 DEF
    input: { "resource.stone": 8, "resource.wood": 4, "resource.flint": 2 },
    output: { "equipment.stone_shield": 1 }
  },
  "recipe.leather_armor": {
    // Giáp da - +5 DEF, +10 HP
    input: { "resource.leather": 5, "resource.flint": 3 },
    output: { "equipment.leather_armor": 1 }
  },
  "recipe.leather_boots": {
    // Giày da - +2 SPD
    input: { "resource.leather": 3, "resource.wood": 2 },
    output: { "equipment.leather_boots": 1 }
  },

  // === TRANG BỊ (thời Đá) ===
  // Đây là nguồn stat gameplay chính cho trang bị. Chỉ cần sửa các số ở đây, UI sẽ tự cập nhật.
  "equipment.wooden_sword": {
    stats: { attack: 3 },   // +3 tấn công
    slot: "weapon",
    weaponProfile: "sword"
  },
  "equipment.hunting_bow": {
    stats: { attack: 3 },
    slot: "weapon",
    weaponProfile: "bow"
  },
  "equipment.stone_spear": {
    stats: { attack: 6 },   // +6 tấn công
    slot: "weapon",
    weaponProfile: "spear"
  },
  "equipment.stone_shield": {
    stats: { defense: 3 },  // +3 phòng thủ
    slot: "offhand"
  },
  "equipment.leather_armor": {
    stats: { defense: 5, maxHp: 10 }, // +5 phòng thủ, +10 HP tối đa
    slot: "armor"
  },
  "equipment.leather_boots": {
    stats: { speed: 0.5 },    // +0.5 tốc độ di chuyển
    slot: "boots"
  },

  // === THỜI ĐẠI ===
  "age.stone": {
    // Thời Đá - bắt đầu với tài nguyên cơ bản
    startResources: {
      "resource.wood": 10,
      "resource.stone": 5,
      "resource.food": 10,
      "resource.flint": 3,
      "resource.tool": 0,
      "resource.leather": 0
    }
  },
  "age.bronze": {
    // Bronze Age - requires 10 tools, 50 food, and the listed buildings
    startResources: {
      "resource.copper": 0,
      "resource.tin": 0,
      "resource.bronze": 0
    },
    advanceFrom: {
      age: "age.stone",
      resources: {
        "resource.tool": 10,
        "resource.food": 50
      },
      buildings: {
        "building.berry_gatherer": 4
      }
    }
  },

  // === NODE THỜI ĐỒNG ===
  "node.copper_deposit": {
    // Mỏ đồng - 6 hp, cho 3 đồng, respawn 50 giây
    hp: 6,
    rewards: { "resource.copper": 3 },
    respawnTime: 50
  },
  "node.tin_deposit": {
    // Mỏ thiếc - 5 hp, cho 2 thiếc, respawn 55 giây
    hp: 5,
    rewards: { "resource.tin": 2 },
    respawnTime: 55
  },

  // === ĐỘNG VẬT THỜI ĐỒNG ===
  "animal.lion": {
    // Sư tử - quái mạnh thời Đồng
    hp: 60,
    attack: 12,
    defense: 5,
    rewards: { "resource.food": 25, "resource.leather": 8 },
    respawnTime: 150,
    aggroRange: 3.5,
    behavior: {
      patrolRadius: 4.2,
      patrolSpeed: 0.44,
      chaseSpeed: 1.15,
      returnSpeed: 0.82,
      turnRate: 0.24,
      attackRange: 1.925,
      chaseRange: 8.05
    }
  },

  // === CÔNG TRÌNH THỜI ĐỒNG ===
  "building.copper_mine": {
    // Mỏ đồng - sản xuất 1 đồng/giây, 1-2 công nhân
    cost: { "resource.wood": 30, "resource.stone": 20 },
    searchRadius: { 1: 5, 2: 8 },
    workerCount: { 1: 1, 2: 2 },
    storageCapacity: { 1: 30, 2: 60 },
    productionSpeed: { 1: 1.0, 2: 1.2 },
    produces: { "resource.copper": 1 },
    upgrades: {
      2: { cost: { "resource.wood": 60, "resource.stone": 40, "resource.copper": 10 }, productionMultiplier: 1.5 }
    }
  },
  "building.tin_mine": {
    // Mỏ thiếc - sản xuất 1 thiếc/giây, 1-2 công nhân
    cost: { "resource.wood": 35, "resource.stone": 25, "resource.copper": 5 },
    searchRadius: { 1: 5, 2: 8 },
    workerCount: { 1: 1, 2: 2 },
    storageCapacity: { 1: 25, 2: 50 },
    productionSpeed: { 1: 1.0, 2: 1.2 },
    produces: { "resource.tin": 1 },
    upgrades: {
      2: { cost: { "resource.wood": 70, "resource.stone": 50, "resource.tin": 10 }, productionMultiplier: 1.5 }
    }
  },
  "building.smelter": {
    // Lò nung - tiêu thụ 2 đồng + 1 thiếc/giây, sản xuất 1 đồng điếu/giây
    cost: { "resource.stone": 40, "resource.copper": 10, "resource.tin": 5 },
    searchRadius: { 1: 0, 2: 0 },
    workerCount: { 1: 1, 2: 2 },
    storageCapacity: { 1: 20, 2: 40 },
    productionSpeed: { 1: 1.0, 2: 1.2 },
    produces: { "resource.bronze": 1 },
    consumesPerSecond: { "resource.copper": 2, "resource.tin": 1 }, // tiêu thụ mỗi giây
    upgrades: {
      2: { cost: { "resource.stone": 80, "resource.bronze": 15 }, productionMultiplier: 1.5 }
    }
  },

  // === CÔNG THỨC THỜI ĐỒNG ===
  // Recipe chỉ giữ cost + output. Bonus thật của trang bị nằm ở equipment.* bên dưới.
  "recipe.bronze_sword": {
    // Kiếm đồng điếu - +10 ATK
    input: { "resource.bronze": 5, "resource.wood": 3 },
    output: { "equipment.bronze_sword": 1 }
  },
  "recipe.bronze_bow": {
    // Cung đồng - vũ khí tầm xa thời Đồng
    input: { "resource.bronze": 4, "resource.wood": 6, "resource.leather": 2 },
    output: { "equipment.bronze_bow": 1 }
  },
  "recipe.bronze_shield": {
    // Khiên đồng điếu - +6 DEF
    input: { "resource.bronze": 5, "resource.wood": 4 },
    output: { "equipment.bronze_shield": 1 }
  },
  "recipe.bronze_armor": {
    // Giáp đồng điếu - +10 DEF, +20 HP
    input: { "resource.bronze": 8, "resource.leather": 3 },
    output: { "equipment.bronze_armor": 1 }
  },

  // === TRANG BỊ THỜI ĐỒNG ===
  // Các stat ở đây là nguồn cân bằng chính cho combat và UI mô tả.
  "equipment.bronze_sword": {
    stats: { attack: 10 },  // +10 tấn công
    slot: "weapon",
    weaponProfile: "sword"
  },
  "equipment.bronze_bow": {
    stats: { attack: 8 },
    slot: "weapon",
    weaponProfile: "bow"
  },
  "equipment.bronze_shield": {
    stats: { defense: 6 },  // +6 phòng thủ
    slot: "offhand"
  },
  "equipment.bronze_armor": {
    stats: { defense: 10, maxHp: 20 }, // +10 phòng thủ, +20 HP tối đa
    slot: "armor"
  },

  // === CÔNG NGHỆ ===
  "tech.advanced_tools": {
    // Công cụ tiên tiến - tăng tốc thu hoạch +20%
    researchCost: { "resource.tool": 10, "resource.wood": 20 },
    effects: { harvestSpeedBonus: 0.20 }
  },
  "tech.efficient_gathering": {
    // Thu hoạch hiệu quả - tăng sản xuất +15%
    researchCost: { "resource.food": 30, "resource.stone": 15 },
    requires: ["tech.advanced_tools"],
    effects: { productionBonus: 0.15 }
  },
  "tech.expanded_storage": {
    // Kho chứa mở rộng - tăng sức chứa +30%
    researchCost: { "resource.wood": 40, "resource.stone": 30 },
    effects: { storageBonus: 0.30 }
  },
  "tech.swift_workers": {
    // Công nhân nhanh - tăng tốc độ NPC +25%
    researchCost: { "resource.food": 25, "resource.leather": 10 },
    effects: { npcSpeedBonus: 0.25 }
  },

  // === THỜI ĐẠI SẮT ===
  "age.iron": {
    // Thời Đại Sắt - cần 20 đồng điếu + 100 thức ăn + 20 công cụ + công trình
    startResources: { "resource.wood": 20, "resource.stone": 15, "resource.bronze": 10, "resource.food": 30 },
    advanceFrom: {
      age: "age.bronze",
      resources: { "resource.bronze": 20, "resource.food": 100, "resource.tool": 20 },
      buildings: { "building.smelter": 2, "building.copper_mine": 2, "building.tin_mine": 1 }
    }
  },

  // === NODE THỜI ĐẠI SẮT ===
  "node.iron_deposit": {
    // Mỏ sắt - 10 hp, cho 3 sắt, respawn 80 giây
    hp: 10,
    rewards: { "resource.iron": 3 },
    respawnTime: 80
  },
  "node.coal_deposit": {
    // Mỏ than - 7 hp, cho 4 than, respawn 65 giây
    hp: 7,
    rewards: { "resource.coal": 4 },
    respawnTime: 65
  },

  // === ĐỘNG VẬT THỜI ĐẠI SẮT ===
  "animal.bandit": {
    // Cướp - cho food + da + đồng điếu
    hp: 80,
    attack: 15,
    defense: 8,
    rewards: { "resource.food": 30, "resource.leather": 10, "resource.bronze": 3 },
    respawnTime: 180,
    aggroRange: 4,
    behavior: {
      patrolRadius: 2.8,
      patrolSpeed: 0.4,
      chaseSpeed: 0.98,
      returnSpeed: 0.74,
      turnRate: 0.22,
      attackRange: 2.2,
      chaseRange: 9.2
    }
  },
  "animal.sabertooth": {
    // Hổ kiếm răng kiếm - quái mạnh nhất
    hp: 120,
    attack: 20,
    defense: 10,
    rewards: { "resource.food": 50, "resource.leather": 20 },
    respawnTime: 240,
    aggroRange: 4,
    behavior: {
      patrolRadius: 4.6,
      patrolSpeed: 0.5,
      chaseSpeed: 1.25,
      returnSpeed: 0.88,
      turnRate: 0.26,
      attackRange: 2.2,
      chaseRange: 9.2
    }
  },
  "animal.moonfang_alpha": {
    hp: 150,
    attack: 18,
    defense: 7,
    rewards: { "equipment.moonfang_blade": 1, "resource.food": 22, "resource.leather": 12 },
    noRespawn: true,
    isBoss: true,
    bossRewardLabel: "Moonfang Blade",
    aggroRange: 4.2,
    behavior: {
      patrolRadius: 3.8,
      patrolSpeed: 0.52,
      chaseSpeed: 1.35,
      returnSpeed: 0.88,
      turnRate: 0.3,
      attackRange: 1.85,
      attackIntervalSeconds: 0.72,
      chaseRange: 10.5
    }
  },
  "animal.sunscale_lion": {
    hp: 220,
    attack: 24,
    defense: 11,
    rewards: { "equipment.sunpiercer_bow": 1, "resource.food": 36, "resource.leather": 16, "resource.bronze": 8 },
    noRespawn: true,
    isBoss: true,
    bossRewardLabel: "Sunpiercer Bow",
    aggroRange: 4.8,
    behavior: {
      patrolRadius: 4.5,
      patrolSpeed: 0.48,
      chaseSpeed: 1.28,
      returnSpeed: 0.86,
      turnRate: 0.28,
      attackRange: 2.1,
      attackIntervalSeconds: 0.8,
      chaseRange: 11.4
    }
  },
  "animal.stormhide_sabertooth": {
    hp: 320,
    attack: 31,
    defense: 15,
    rewards: { "equipment.stormspine_glaive": 1, "resource.food": 52, "resource.leather": 24, "resource.iron": 10, "resource.coal": 6 },
    noRespawn: true,
    isBoss: true,
    bossRewardLabel: "Stormspine Glaive",
    aggroRange: 5.2,
    behavior: {
      patrolRadius: 4.9,
      patrolSpeed: 0.54,
      chaseSpeed: 1.36,
      returnSpeed: 0.9,
      turnRate: 0.3,
      attackRange: 2.35,
      attackIntervalSeconds: 0.78,
      chaseRange: 12.2
    }
  },

  // === CÔNG TRÌNH THỜI ĐẠI SẮT ===
  "building.iron_mine": {
    // Mỏ sắt - 2 sắt/giây, 2-4 công nhân
    cost: { "resource.wood": 50, "resource.stone": 40, "resource.bronze": 5 },
    searchRadius: { 1: 6, 2: 10, 3: 15 },
    workerCount: { 1: 2, 2: 3, 3: 4 },
    storageCapacity: { 1: 40, 2: 80, 3: 150 },
    productionSpeed: { 1: 1.0, 2: 1.3, 3: 1.6 },
    produces: { "resource.iron": 2 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 100, "resource.stone": 80, "resource.iron": 15 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.stone": 150, "resource.iron": 40, "resource.coal": 20 }, productionMultiplier: 2.0 }
    }
  },
  "building.coal_mine": {
    // Mỏ than - 2 than/giây, 2-4 công nhân
    cost: { "resource.wood": 45, "resource.stone": 50, "resource.iron": 5 },
    searchRadius: { 1: 6, 2: 10, 3: 15 },
    workerCount: { 1: 2, 2: 3, 3: 4 },
    storageCapacity: { 1: 50, 2: 100, 3: 180 },
    productionSpeed: { 1: 1.0, 2: 1.3, 3: 1.6 },
    produces: { "resource.coal": 2 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 90, "resource.stone": 100, "resource.coal": 20 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.stone": 150, "resource.coal": 50, "resource.iron": 30 }, productionMultiplier: 2.0 }
    }
  },
  "building.blast_furnace": {
    // Lò luyện sắt - sản xuất 3 sắt/giây (tiêu thụ nguyên liệu)
    cost: { "resource.stone": 80, "resource.bronze": 20, "resource.iron": 10 },
    searchRadius: { 1: 0, 2: 0, 3: 0 },
    workerCount: { 1: 2, 2: 3, 3: 4 },
    storageCapacity: { 1: 30, 2: 60, 3: 120 },
    productionSpeed: { 1: 1.0, 2: 1.4, 3: 1.8 },
    produces: { "resource.iron": 3 },
    upgrades: {
      2: { cost: { "resource.stone": 150, "resource.iron": 40 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.iron": 80, "resource.coal": 50 }, productionMultiplier: 2.0 }
    }
  },
  "building.blacksmith": {
    // Lò rèn - mở khóa trang bị sắt (không sản xuất trực tiếp)
    cost: { "resource.wood": 60, "resource.stone": 50, "resource.iron": 15 },
    searchRadius: { 1: 0 },
    workerCount: { 1: 0 },
    storageCapacity: { 1: 100 },
    productionSpeed: { 1: 1.0 },
    produces: {},
    upgrades: {}
  },
  "building.armory": {
    cost: { "resource.wood": 90, "resource.stone": 70, "resource.iron": 25, "resource.tool": 12 },
    searchRadius: { 1: 0 },
    workerCount: { 1: 0 },
    storageCapacity: { 1: 0 },
    productionSpeed: { 1: 1.0 },
    produces: {},
    armorySupport: {
      barracksTrainingSpeedBonus: 0.08,
      troopDamageFlatBonus: 1,
      troopAttackSpeedBonus: 0.05
    },
    upgrades: {}
  },

  // === CÔNG THỨC THỜI ĐẠI SẮT ===
  // Recipe hiển thị bonus dựa trên equipment.* tương ứng để tránh lệch số khi cân bằng lại.
  "recipe.iron_sword": {
    // Kiếm sắt - +15 ATK
    input: { "resource.iron": 8, "resource.wood": 5, "resource.coal": 3 },
    output: { "equipment.iron_sword": 1 }
  },
  "recipe.iron_longbow": {
    // Cung dài sắt - vũ khí tầm xa cuối game cơ bản
    input: { "resource.iron": 7, "resource.wood": 7, "resource.leather": 4, "resource.coal": 2 },
    output: { "equipment.iron_longbow": 1 }
  },
  "recipe.iron_shield": {
    // Khiên sắt - +10 DEF
    input: { "resource.iron": 10, "resource.wood": 6, "resource.leather": 3 },
    output: { "equipment.iron_shield": 1 }
  },
  "recipe.iron_armor": {
    // Giáp sắt - +15 DEF, +30 HP
    input: { "resource.iron": 15, "resource.leather": 5, "resource.coal": 5 },
    output: { "equipment.iron_armor": 1 }
  },
  "recipe.iron_boots": {
    // Giày sắt - +3 SPD, +3 DEF
    input: { "resource.iron": 6, "resource.leather": 4 },
    output: { "equipment.iron_boots": 1 }
  },

  // === TRANG BỊ THỜI ĐẠI SẮT ===
  // Chỉnh stat trong các entry này để đổi hiệu lực thực tế của trang bị.
  "equipment.iron_sword": {
    stats: { attack: 15 },  // +15 tấn công
    slot: "weapon",
    weaponProfile: "sword"
  },
  "equipment.iron_longbow": {
    stats: { attack: 12 },
    slot: "weapon",
    weaponProfile: "bow"
  },
  "equipment.iron_shield": {
    stats: { defense: 10 }, // +10 phòng thủ
    slot: "offhand"
  },
  "equipment.iron_armor": {
    stats: { defense: 15, maxHp: 30 }, // +15 phòng thủ, +30 HP tối đa
    slot: "armor"
  },
  "equipment.iron_boots": {
    stats: { speed: 1, defense: 3 }, // +1 tốc độ, +3 phòng thủ
    slot: "boots"
  },
  "equipment.moonfang_blade": {
    stats: { attack: 22, speed: 0.2 },
    slot: "weapon",
    weaponProfile: "special",
    autoEquipOnReward: true,
    weaponProfileOverrides: {
      label: "Moonfang Blade",
      classId: "special",
      attackRange: 2.35,
      attackIntervalSeconds: 0.46,
      engageRange: 2.9,
      damageMultiplier: 1.18,
      bossDamageMultiplier: 1.4,
      hitColor: 0xaed7ff
    }
  },
  "equipment.sunpiercer_bow": {
    stats: { attack: 20, speed: 0.25 },
    slot: "weapon",
    weaponProfile: "special",
    autoEquipOnReward: true,
    weaponProfileOverrides: {
      label: "Sunpiercer Bow",
      classId: "special",
      attackRange: 6.8,
      attackIntervalSeconds: 0.56,
      engageRange: 7.3,
      damageMultiplier: 1.08,
      bossDamageMultiplier: 1.16,
      directionalAim: true,
      projectileSpeed: 13.2,
      projectileHitRadius: 0.42,
      projectileStartOffset: 0.78,
      projectileMaxRange: 6.8,
      hitColor: 0xffd166
    }
  },
  "equipment.stormspine_glaive": {
    stats: { attack: 28, speed: 0.35 },
    slot: "weapon",
    weaponProfile: "special",
    autoEquipOnReward: true,
    weaponProfileOverrides: {
      label: "Stormspine Glaive",
      classId: "special",
      attackRange: 3.4,
      attackIntervalSeconds: 0.5,
      engageRange: 3.95,
      damageMultiplier: 1.22,
      bossDamageMultiplier: 1.48,
      hitColor: 0x7ef0d0
    }
  },

  // === CÔNG NGHÊ THỜI ĐẠI SẮT ===
  "tech.iron_working": {
    // Luyện sắt - tăng sản xuất +10%
    researchCost: { "resource.iron": 20, "resource.coal": 15 },
    requires: ["tech.efficient_gathering"],
    effects: { productionBonus: 0.10 }
  },
  "tech.coal_power": {
    // Năng lượng than - tăng tốc thu hoạch +30%
    researchCost: { "resource.coal": 30, "resource.iron": 15 },
    requires: ["tech.swift_workers"],
    effects: { harvestSpeedBonus: 0.30 }
  },
  "tech.fortification": {
    // Cố thủ - tăng sức chứa kho +50%
    researchCost: { "resource.stone": 100, "resource.iron": 30, "resource.bronze": 20 },
    requires: ["tech.expanded_storage"],
    effects: { storageBonus: 0.50 }
  },
  "tech.military_drills": {
    // Huấn luyện quân sự - lính cận chiến và tầm xa gây thêm sát thương, di chuyển nhanh hơn
    researchCost: { "resource.food": 35, "resource.tool": 12, "resource.wood": 25 },
    effects: { troopDamageFlatBonus: 1, troopMoveSpeedBonus: 0.10 }
  },
  "tech.barracks_logistics": {
    // Hậu cần doanh trại - huấn luyện nhanh hơn và tăng nhịp đánh của quân dự bị
    researchCost: { "resource.food": 55, "resource.bronze": 12, "resource.wood": 35 },
    requires: ["tech.military_drills"],
    effects: { barracksTrainingSpeedBonus: 0.20, troopAttackSpeedBonus: 0.12 }
  },

  // === HỆ THỐNG ĐÓI ===
  hunger: {
    maxHunger: 100,           // thanh đói tối đa
    drainPerSecond: 0.2,      // đói giảm 0.2/giây (đầy→đói mất ~500s ≈ 8.3 phút)
    autoEatThreshold: 30,     // ngưỡng auto-eat cho logic nào cần tham chiếu
    hungryThreshold: 20,      // ngưỡng đói thấp dùng cho tutorial/HUD/tốc độ
    overlay: {
      warningThreshold: 20,   // ngưỡng HUD đổi sang warn / low-hunger
      criticalThreshold: 0    // ngưỡng HUD đổi sang critical
    },
    hungrySpeedMult: 0.5,     // tốc độ ×0.5 khi đói < hungryThreshold
    starvingHpDrain: 1,       // mất 1 HP/giây khi đói = 0
    starvationResourceLossFraction: 0.3,  // chết đói làm mất 30% tài nguyên đang mang
    starvationRespawnHungerFraction: 0.5, // hồi lại 50% thanh đói sau khi chết đói
    foodRestore: {
      "resource.food": 5      // 1 thức ăn phục 5 đói
    },
    eatDuration: 0.5,         // thời gian ăn (giây)
    eatSpeedMult: 0.5,        // tốc độ di chuyển khi ăn ×0.5
    regenHungerMult: 2.0       // hồi HP tốn đói ×2
  },

  // === CHU KỲ NGÀY ĐÊM ===
  dayNight: {
    hoursPerSecond: 0.0667,   // 0.0667 giờ/giây → 1 ngày = 360 giây = 6 phút
    nightDarknessThreshold: 0.5
  },

  player: {
    baseStats: {
      maxHp: 100,
      attack: 1,
      defense: 0,
      speed: 3
    },
    spawn: {
      x: 8,
      z: 8,
      timeOfDay: 6
    },
    interactionRadius: 2.5,
    movement: {
      shallowWaterSpeedMultiplier: 0.5
    },
    death: {
      resourceLossFraction: 0.3
    }
  },

  combat: {
    playerAttackIntervalSeconds: 0.5,
    disengageDistance: 3,
    minimumDamage: 1,
    enemyAttackIntervalSeconds: 0.9,
    defaultEnemyAttackRange: 1.7,
    playerStartRangePadding: 0.65,
    playerDisengagePadding: 2.4,
    weaponProfiles: {
      unarmed: {
        label: "Bare Hands",
        classId: "melee",
        attackRange: 1.15,
        attackIntervalSeconds: 0.8,
        engageRange: 1.55,
        damageMultiplier: 1.0,
        bossDamageMultiplier: 1.0,
        hitColor: 0xd8d8d8
      },
      sword: {
        label: "Sword",
        classId: "melee",
        attackRange: 1.65,
        attackIntervalSeconds: 0.42,
        engageRange: 2.1,
        damageMultiplier: 1.0,
        bossDamageMultiplier: 1.15,
        hitColor: 0xf4b35e
      },
      spear: {
        label: "Spear",
        classId: "reach",
        attackRange: 2.2,
        attackIntervalSeconds: 0.6,
        engageRange: 2.65,
        damageMultiplier: 1.0,
        bossDamageMultiplier: 1.05,
        hitColor: 0xb7d3ff
      },
      bow: {
        label: "Bow",
        classId: "ranged",
        attackRange: 4.9,
        attackIntervalSeconds: 0.78,
        engageRange: 5.5,
        damageMultiplier: 1.0,
        bossDamageMultiplier: 0.85,
        directionalAim: true,
        projectileSpeed: 10.5,
        projectileHitRadius: 0.38,
        projectileStartOffset: 0.7,
        projectileMaxRange: 4.9,
        hitColor: 0x7fd3ff
      },
      special: {
        label: "Relic",
        classId: "special",
        attackRange: 5.4,
        attackIntervalSeconds: 0.56,
        engageRange: 5.9,
        damageMultiplier: 1.08,
        bossDamageMultiplier: 1.25,
        hitColor: 0x88ffd2
      }
    }
  },

  animalRespawn: {
    playerSafeDistance: 2,
    retryDelayMs: 5000
  },

  animalBehavior: {
    fleeMinDistance: 1.6,
    fleeSpawnRadiusMultiplier: 1.8,
    fleeEscapeDistanceMultiplier: 1.2,
    returnToSpawnDistanceMultiplier: 1.25,
    returnIdleBaseSeconds: 0.5,
    returnIdleRandomSeconds: 1.0,
    patrolIdleBaseSeconds: 0.8,
    patrolIdleRandomSeconds: 1.2
  },

  barracksTroops: {
    syncIntervalSeconds: 0.25,
    spawnJitter: 1.6,
    initialAttackCooldownMax: 0.35,
    destinationRetargetCooldown: 0.18,
    repathCooldown: 0.24,
    targeting: {
      guardRadiusLeashBonus: 2.5,
      threatBias: -6,
      troopDistanceWeight: 0.55,
      barracksDistanceWeight: 0.45,
      priorityBiasByAnimal: {
        "animal.bandit": -1.0,
        "animal.sabertooth": -1.0,
        "animal.bear": -0.35,
        "animal.lion": -0.35
      }
    },
    formation: {
      guardBaseRadius: 1.7,
      guardRingSpacing: 0.7,
      guardArcherOffset: 0.25,
      guardWatchtowerRadius: 1.7,
      guardRearSpacing: 0.7,
      followBaseRadius: 1.8,
      followRingSpacing: 0.8,
      followArcherOffset: 0.2,
      followRearOffset: 1.75,
      followFrontOffset: 0.95,
      followSideSpacing: 0.7,
      followAngleStep: 0.72,
      engageMinRadius: 1.1,
      engageRadiusMultiplier: 0.88
    }
  },

  npc: {
    baseSpeed: 0.05,
    nearBuildingThreshold: 1.6,
    exposure: {
      walkHomeSafeDistance: 1.8,
      idleSafeDistance: 1.9,
      exposedDistance: 1.9
    },
    notifications: {
      nightWorkPauseCooldownMs: 12000,
      workerThreatCooldownMs: 10000
    },
    taskDefaults: {
      harvestSearchRadius: 5,
      treeCareWaterTaskSeconds: 1.8,
      farmPlantTaskSeconds: 1.0,
      farmWaterTaskSeconds: 1.5,
      farmHarvestTaskSeconds: 1.5,
      farmCollectTaskSeconds: 0.8
    }
  },

  simulation: {
    tickIntervalSeconds: 1.0,
    autosaveIntervalTicks: 12,
    pausedAutosaveIntervalTicks: 24,
    animalCullDistance: 18
  },

  buildingPlacement: {
    overlapBuffer: 0.8
  },

  terrain: {
    runtime: {
      chunkSize: 16,
      renderDistance: 2,
      nodeStateUpdateIntervalMs: 250
    },
    predatorZones: {
      minimumDistanceFromHome: 3,
      ironAgeThresholdBonusDistance: 6,
      ironAgeThresholdAdjustment: -0.04,
      thresholdsByDistance: [
        { minDistance: 8, threshold: 0.72 },
        { minDistance: 6, threshold: 0.78 },
        { minDistance: 4, threshold: 0.85 },
        { minDistance: 3, threshold: 0.92 }
      ],
      highZoneMinDistance: 7,
      highZoneRollThreshold: 0.93,
      levels: {
        medium: {
          label: 'Predator Zone',
          animalBonus: 1,
          dangerBonus: 3.75
        },
        high: {
          label: 'Predator Nest',
          animalBonus: 2,
          dangerBonus: 6.5
        }
      }
    },
    bossZones: {
      candidates: [
        {
          minDistance: 9,
          threshold: 0.955,
          bossType: "animal.stormhide_sabertooth",
          label: "Stormhide Lair",
          rewardId: "equipment.stormspine_glaive",
          rewardLabel: "Stormspine Glaive",
          overlayFill: "rgba(54, 196, 169, 0.16)",
          overlayStroke: "rgba(126, 240, 208, 0.62)",
          markerColor: "#7ef0d0"
        },
        {
          minDistance: 7,
          threshold: 0.95,
          bossType: "animal.sunscale_lion",
          label: "Sunscale Pride",
          rewardId: "equipment.sunpiercer_bow",
          rewardLabel: "Sunpiercer Bow",
          overlayFill: "rgba(255, 177, 74, 0.16)",
          overlayStroke: "rgba(255, 209, 102, 0.65)",
          markerColor: "#ffd166"
        },
        {
          minDistance: 5,
          threshold: 0.945,
          bossType: "animal.moonfang_alpha",
          label: "Moonfang Den",
          rewardId: "equipment.moonfang_blade",
          rewardLabel: "Moonfang Blade",
          overlayFill: "rgba(110, 153, 255, 0.16)",
          overlayStroke: "rgba(174, 215, 255, 0.62)",
          markerColor: "#aed7ff"
        }
      ]
    },
    ruinedOutposts: {
      tiers: [
        {
          minDistance: 8,
          threshold: 0.86,
          label: "Ruined Frontier Hold",
          rewardLabel: "Iron caches and preserved supplies",
          rewards: {
            "resource.food": 24,
            "resource.tool": 8,
            "resource.iron": 6,
            "resource.coal": 4
          }
        },
        {
          minDistance: 5,
          threshold: 0.84,
          label: "Ruined Bronze Outpost",
          rewardLabel: "Bronze stock and marching rations",
          rewards: {
            "resource.food": 18,
            "resource.tool": 5,
            "resource.bronze": 5,
            "resource.leather": 4
          }
        },
        {
          minDistance: 3,
          threshold: 0.82,
          label: "Collapsed Hunter Camp",
          rewardLabel: "Early salvage and travel supplies",
          rewards: {
            "resource.food": 14,
            "resource.wood": 10,
            "resource.flint": 5,
            "resource.tool": 2
          }
        }
      ]
    },
    animalSpawns: {
      high: [
        { minDistance: 6, age: 'age.iron', rollThreshold: 0.45, above: 'animal.sabertooth', below: 'animal.bandit' },
        { minDistance: 5, rollThreshold: 0.45, above: 'animal.lion', below: 'animal.bear' },
        { minDistance: 3, rollThreshold: 0.5, above: 'animal.bear', below: 'animal.boar' },
        { minDistance: 0, rollThreshold: 0.45, above: 'animal.boar', below: 'animal.wolf' }
      ],
      medium: [
        { minDistance: 6, age: 'age.iron', rollThreshold: 0.5, above: 'animal.bandit', below: 'animal.lion' },
        { minDistance: 6, rollThreshold: 0.5, above: 'animal.lion', below: 'animal.bear' },
        { minDistance: 4, rollThreshold: 0.55, above: 'animal.bear', below: 'animal.boar' },
        { minDistance: 3, rollThreshold: 0.5, above: 'animal.boar', below: 'animal.wolf' },
        { minDistance: 0, rollThreshold: 0.5, above: 'animal.wolf', below: 'animal.deer' }
      ],
      normal: [
        { minDistance: 8, age: 'age.iron', rollThreshold: 0.5, above: 'animal.sabertooth', below: 'animal.bandit' },
        { minDistance: 6, age: 'age.iron', rollThreshold: 0.5, above: 'animal.bandit', below: 'animal.lion' },
        { minDistance: 6, fixed: 'animal.lion' },
        { minDistance: 4, fixed: 'animal.bear' },
        { minDistance: 3, rollThreshold: 0.45, above: 'animal.boar', below: 'animal.wolf' },
        { minDistance: 2, fixed: 'animal.wolf' },
        { minDistance: 0, rollThreshold: 0.55, above: 'animal.rabbit', below: 'animal.deer' }
      ]
    },
    respawn: {
      defaultNodeRespawnTimeSeconds: 30,
      loadedNodePlayerSafeDistance: 2.1,
      relocation: {
        node: {
          tree: {
            primary: {
              clearance: 1.35,
              buildingClearance: 1.15,
              playerClearance: 2.4,
              npcClearance: 1.35,
              maxAttempts: 40,
              minDistanceFromCurrent: 4.5
            },
            fallback: {
              clearance: 1.35,
              buildingClearance: 1.15,
              playerClearance: 2.4,
              maxAttempts: 20
            }
          },
          rock: {
            primary: {
              clearance: 1.25,
              buildingClearance: 1.1,
              playerClearance: 2.4,
              npcClearance: 1.25,
              maxAttempts: 40,
              minDistanceFromCurrent: 4.5
            },
            fallback: {
              clearance: 1.25,
              buildingClearance: 1.1,
              playerClearance: 2.4,
              maxAttempts: 20
            }
          }
        },
        animal: {
          primary: {
            clearance: 1.6,
            buildingClearance: 1.3,
            playerClearance: 2.6,
            npcClearance: 1.2,
            maxAttempts: 48,
            minDistanceFromCurrent: 4.5
          },
          fallback: {
            clearance: 1.5,
            buildingClearance: 1.2,
            playerClearance: 2.4,
            maxAttempts: 24
          }
        }
      }
    },
    generation: {
      nodes: {
        tree: {
          countByDistance: [
            { maxDistance: 1, base: 8, variance: 5 },
            { maxDistance: 3, base: 5, variance: 6 },
            { base: 2, variance: 4 }
          ],
          placement: {
            clearance: 1.35,
            buildingClearance: 1.15,
            playerClearance: 2.0,
            maxAttempts: 24
          }
        },
        rock: {
          countByDistance: [
            { maxDistance: 1, base: 2, variance: 2 },
            { maxDistance: 3, base: 3, variance: 4 },
            { base: 4, variance: 5 }
          ],
          placement: {
            clearance: 1.25,
            buildingClearance: 1.1,
            playerClearance: 2.0,
            maxAttempts: 24
          }
        },
        berryBush: {
          countByDistance: [
            { maxDistance: 1, base: 6, variance: 5 },
            { maxDistance: 3, base: 3, variance: 4 }
          ],
          placement: {
            clearance: 1.0,
            buildingClearance: 1.0,
            playerClearance: 2.0,
            maxAttempts: 24
          }
        }
      },
      animals: {
        minDistanceFromHome: 1,
        baseCountDistanceFloorCap: 3,
        zoneCapByLevel: {
          medium: 4,
          high: 5
        },
        placement: {
          clearance: 1.6,
          buildingClearance: 1.3,
          playerClearance: 2.0,
          maxAttempts: 24
        }
      },
      oreSpawns: {
        flint: {
          entityId: 'node.flint_deposit',
          minDistanceFromHome: 2,
          rollThreshold: 0.5,
          placement: {
            clearance: 1.5,
            buildingClearance: 1.2,
            playerClearance: 2.0,
            maxAttempts: 24
          }
        },
        copper: {
          entityId: 'node.copper_deposit',
          minDistanceFromHome: 3,
          rollThreshold: 0.6,
          placement: {
            clearance: 1.5,
            buildingClearance: 1.2,
            playerClearance: 2.0,
            maxAttempts: 24
          }
        },
        tin: {
          entityId: 'node.tin_deposit',
          minDistanceFromHome: 4,
          rollThreshold: 0.65,
          placement: {
            clearance: 1.5,
            buildingClearance: 1.2,
            playerClearance: 2.0,
            maxAttempts: 24
          }
        }
      }
    }
  },

  // === THIẾT LẬP CAMERA / MAP ===
  settings: {
    sceneCamera: {
      defaultZoom: 6,
      minZoom: 2,
      maxZoom: 6,
      wheelStep: 1
    },
    fullMap: {
      defaultZoom: 1.0,
      minZoom: 0.3,
      maxZoom: 4.0,
      zoomInFactor: 1.2,
      zoomOutFactor: 0.83
    },
    speechOverlay: {
      suppressWhileUiOpen: true,
      playerAnchorY: 2.7,
      worldAnchorY: 1.75,
      tutorials: {
        harvest: {
          text: 'Nhấn <span class="tut-key">[E]</span> để thu hoạch!',
          duration: 2.5,
          once: true
        },
        eat: {
          text: 'Đói rồi! Nhấn <span class="tut-key">[F]</span> để ăn',
          duration: 2.5,
          once: false
        },
        night: {
          text: 'Trời tối! Xây <span class="tut-key">Lửa Trại</span> để an toàn 🔥',
          duration: 9,
          once: true
        },
        lag: {
          text: 'Ối dồi ôi, LAG rồi này, vãi lìn. Vào setting hạ xuống low đi.',
          minFps: 40,
          triggerSeconds: 2.5,
          recoverFps: 45,
          recoverSeconds: 1.25,
          audioPath: 'asset/lag.ogg'
        }
      },
      fireAction: {
        text: 'đốt đốt đốt đốt, hẹ hẹ hẹ hẹ',
        duration: 2.4,
        audioPath: 'asset/fire.ogg'
      },
      resourceDiscovery: {
        resourceIds: ['resource.copper', 'resource.tin', 'resource.iron', 'resource.coal', 'resource.bronze'],
        text: '{name} kìa ra nhặt đi ông cháu',
        duration: 3.2,
        audioPath: '',
        scanInterval: 0.6,
        maxDistance: 18
      },
      threatTaunt: {
        eligibleAnimalTypes: ['animal.bear', 'animal.lion', 'animal.sabertooth', 'animal.bandit'],
        scanInterval: 0.8,
        maxDistance: 18,
        retrySeconds: 6,
        first: {
          text: 'Mày ngon vào ăn tao đi này',
          duration: 2.6,
          chance: 0.35,
          cooldownSeconds: 18,
          audioPath: ''
        },
        idleNudge: {
          text: 'Mày sợ con kia à, đánh nó đi',
          duration: 3.0,
          delaySeconds: 7,
          audioPath: ''
        }
      }
    }
  },

  // === CÔNG TRÌNH NƯỚC ===
  "building.well": {
    // Well - supports nearby farm plots and provides a small passive food income
    cost: { "resource.stone": 10, "resource.wood": 5 },
    searchRadius: { 1: 0 },
    workerCount: { 1: 0 },
    storageCapacity: { 1: 50 },
    productionSpeed: { 1: 1.0 },
    produces: { "resource.food": 1 },
    waterRadius: 6,
    upgrades: {}
  },
  "building.bridge": {
    // Bridge - allows crossing water and does not produce resources
    cost: { "resource.wood": 15, "resource.stone": 5 },
    searchRadius: { 1: 0 },
    workerCount: { 1: 0 },
    storageCapacity: { 1: 0 },
    productionSpeed: { 1: 1.0 },
    isBridge: true,
    produces: {},
    upgrades: {}
  }
};

window.GAME_NODE_CONFIG = {
  "node.tree": {
    kind: "growth",
    stages: [
      {
        key: "sapling",
        label: "Sapling Tree",
        stateLabel: "Sapling",
        weight: 0.28,
        hp: 1,
        rewards: { "resource.wood": 1 },
        scale: 0.72,
        growAfter: 45,
        leafColor: 0x69A84D,
        trunkColor: 0x8A5A2B
      },
      {
        key: "young",
        label: "Young Tree",
        stateLabel: "Young",
        weight: 0.36,
        hp: 2,
        rewards: { "resource.wood": 2 },
        scale: 0.9,
        growAfter: 60,
        leafColor: 0x3F7F30,
        trunkColor: 0x7B4A1F
      },
      {
        key: "mature",
        label: "Mature Tree",
        stateLabel: "Mature",
        weight: 0.36,
        hp: 3,
        rewards: { "resource.wood": 4 },
        scale: 1.08,
        growAfter: 0,
        leafColor: 0x2D5A27,
        trunkColor: 0x6F3E18
      }
    ],
    giantVariant: {
      key: "giant",
      chance: 0.015,
      label: "Giant Tree",
      stateLabel: "Ancient",
      hp: 6,
      rewards: { "resource.wood": 10 },
      scale: 1.6,
      leafColor: 0x24461D,
      trunkColor: 0x5B2F12
    }
  },
  "node.rock": {
    kind: "variant",
    useVariantLabel: true,
    variants: [
      {
        key: "small",
        label: "Small Rock",
        stateLabel: "Small",
        weight: 0.34,
        hp: 3,
        rewards: { "resource.stone": 1 },
        scale: 0.78,
        chunkCount: 2,
        mossPatches: 1
      },
      {
        key: "medium",
        label: "Rock",
        stateLabel: "Medium",
        weight: 0.44,
        hp: 5,
        rewards: { "resource.stone": 2, "resource.flint": 1 },
        scale: 1.0,
        chunkCount: 3,
        mossPatches: 2
      },
      {
        key: "large",
        label: "Large Rock",
        stateLabel: "Large",
        weight: 0.18,
        hp: 7,
        rewards: { "resource.stone": 4, "resource.flint": 1 },
        scale: 1.24,
        chunkCount: 4,
        mossPatches: 3
      },
      {
        key: "giant",
        label: "Giant Boulder",
        stateLabel: "Giant",
        weight: 0.015,
        hp: 10,
        rewards: { "resource.stone": 8, "resource.flint": 3 },
        scale: 1.78,
        chunkCount: 5,
        mossPatches: 4,
        isGiant: true
      }
    ]
  },
  "node.berry_bush": {
    kind: "growth",
    stages: [
      {
        key: "few",
        label: "Berry Bush",
        stateLabel: "Few Berries",
        weight: 0.42,
        hp: 1,
        rewards: { "resource.food": 1 },
        scale: 0.9,
        growAfter: 18,
        leafColor: 0x5A8235,
        berryColor: 0xC85C5C,
        berryCount: 5
      },
      {
        key: "berrying",
        label: "Berry Bush",
        stateLabel: "Berrying",
        weight: 0.36,
        hp: 1,
        rewards: { "resource.food": 2 },
        scale: 1.0,
        growAfter: 28,
        leafColor: 0x468036,
        berryColor: 0xE33B3B,
        berryCount: 12
      },
      {
        key: "loaded",
        label: "Berry Bush",
        stateLabel: "Loaded",
        weight: 0.22,
        hp: 1,
        rewards: { "resource.food": 4 },
        scale: 1.08,
        growAfter: 0,
        leafColor: 0x3A7A2E,
        berryColor: 0xF03B3B,
        berryCount: 26
      }
    ]
  },
  "node.flint_deposit": {
    kind: "visual",
    useVariantLabel: false,
    variants: [
      { key: "shardbed", stateLabel: "Shardbed", weight: 0.42, scale: 0.96, shardCount: 2, shardHeight: 0.22 },
      { key: "needle", stateLabel: "Needle", weight: 0.33, scale: 1.06, shardCount: 3, shardHeight: 0.28 },
      { key: "cluster", stateLabel: "Cluster", weight: 0.25, scale: 1.14, shardCount: 4, shardHeight: 0.24 }
    ]
  },
  "node.copper_deposit": {
    kind: "visual",
    useVariantLabel: false,
    variants: [
      { key: "vein", stateLabel: "Vein", weight: 0.4, scale: 1.0, speckCount: 4, spireCount: 1, spireHeight: 0.18 },
      { key: "cluster", stateLabel: "Cluster", weight: 0.35, scale: 1.08, speckCount: 6, spireCount: 2, spireHeight: 0.2 },
      { key: "rich", stateLabel: "Rich", weight: 0.25, scale: 1.18, speckCount: 8, spireCount: 3, spireHeight: 0.24 }
    ]
  },
  "node.tin_deposit": {
    kind: "visual",
    useVariantLabel: false,
    variants: [
      { key: "pale", stateLabel: "Pale", weight: 0.42, scale: 0.94, speckCount: 3, spireCount: 1, spireHeight: 0.14 },
      { key: "layered", stateLabel: "Layered", weight: 0.34, scale: 1.04, speckCount: 5, spireCount: 2, spireHeight: 0.18 },
      { key: "gleaming", stateLabel: "Gleaming", weight: 0.24, scale: 1.12, speckCount: 7, spireCount: 3, spireHeight: 0.2 }
    ]
  },
  "node.iron_deposit": {
    kind: "visual",
    useVariantLabel: false,
    variants: [
      { key: "seam", stateLabel: "Seam", weight: 0.38, scale: 1.0, speckCount: 4, spireCount: 1, spireHeight: 0.18 },
      { key: "dense", stateLabel: "Dense", weight: 0.37, scale: 1.1, speckCount: 6, spireCount: 2, spireHeight: 0.22 },
      { key: "lode", stateLabel: "Lode", weight: 0.25, scale: 1.2, speckCount: 8, spireCount: 3, spireHeight: 0.26 }
    ]
  },
  "node.coal_deposit": {
    kind: "visual",
    useVariantLabel: false,
    variants: [
      { key: "broken", stateLabel: "Broken", weight: 0.42, scale: 0.98, speckCount: 3, spireCount: 1, spireHeight: 0.16 },
      { key: "dense", stateLabel: "Dense", weight: 0.34, scale: 1.08, speckCount: 5, spireCount: 2, spireHeight: 0.18 },
      { key: "deep", stateLabel: "Deep", weight: 0.24, scale: 1.16, speckCount: 7, spireCount: 3, spireHeight: 0.22 }
    ]
  }
};