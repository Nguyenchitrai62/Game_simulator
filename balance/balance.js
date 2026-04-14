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
    // Bùm mâm xôi - hp thấp nhất, respawn nhanh nhất, cho 2 thức ăn
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
    aggroRange: 3 // ô
  },
  "animal.boar": {
    // Lợn rừng - trung bình, cho food + da
    hp: 20,
    attack: 5,
    defense: 2,
    rewards: { "resource.food": 8, "resource.leather": 2 },
    respawnTime: 90,
    aggroRange: 2.5
  },
  "animal.bear": {
    // Gấu - mạnh thời Đá, cho nhiều food + da
    hp: 40,
    attack: 8,
    defense: 3,
    rewards: { "resource.food": 15, "resource.leather": 5 },
    respawnTime: 120,
    aggroRange: 2.5
  },

  // === CÔNG TRÌNH (thời Đá) ===
  "building.wood_cutter": {
    // Trạm chặt gỗ - giá rẻ, sản xuất 2 gỗ/giây, 1-3 công nhân
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
    // Mỏ đá - sản xuất 1 đá/giây
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
    // Trạm hái mâm xôi - rẻ nhất, 2 thức ăn/giây
    cost: { "resource.wood": 8 },
    searchRadius: { 1: 5, 2: 8, 3: 12 },
    workerCount: { 1: 1, 2: 2, 3: 3 },
    storageCapacity: { 1: 40, 2: 80, 3: 160 },
    productionSpeed: { 1: 1.0, 2: 1.2, 3: 1.5 },
    produces: { "resource.food": 2 },
    synergyFrom: {},
    upgrades: {
      2: { cost: { "resource.wood": 25, "resource.food": 15 }, productionMultiplier: 1.5 },
      3: { cost: { "resource.wood": 60, "resource.food": 40, "resource.flint": 5 }, productionMultiplier: 2.0 }
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
    // Doanh trại - bảo vệ khu vực (chưa triển khai)
    cost: { "resource.wood": 50, "resource.stone": 40, "resource.tool": 5 },
    searchRadius: { 1: 0, 2: 0 },
    workerCount: { 1: 0, 2: 0 },
    storageCapacity: { 1: 0, 2: 0 },
    productionSpeed: { 1: 1.0, 2: 1.0 },
    produces: {},
    guardCount: { 1: 2, 2: 3 },   // số lính theo level
    guardRadius: { 1: 8, 2: 12 },   // bán kính bảo vệ (ô)
    upgrades: {
      2: { cost: { "resource.wood": 100, "resource.stone": 80, "resource.tool": 10 }, productionMultiplier: 1.0 }
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
  "equipment.wooden_sword": {
    stats: { attack: 3 },   // +3 tấn công
    slot: "weapon"
  },
  "equipment.stone_spear": {
    stats: { attack: 6 },   // +6 tấn công
    slot: "weapon"
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
    stats: { speed: 2 },    // +2 tốc độ di chuyển
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
    // Thời Đồng - cần 10 công cụ + 50 thức ăn + công trình yêu cầu
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
        "building.wood_cutter": 3,
        "building.stone_quarry": 2
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
    aggroRange: 3.5
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
  "recipe.bronze_sword": {
    // Kiếm đồng điếu - +10 ATK
    input: { "resource.bronze": 5, "resource.wood": 3 },
    output: { "equipment.bronze_sword": 1 }
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
  "equipment.bronze_sword": {
    stats: { attack: 10 },  // +10 tấn công
    slot: "weapon"
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
    aggroRange: 4
  },
  "animal.sabertooth": {
    // Hổ kiếm răng kiếm - quái mạnh nhất
    hp: 120,
    attack: 20,
    defense: 10,
    rewards: { "resource.food": 50, "resource.leather": 20 },
    respawnTime: 240,
    aggroRange: 4
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

  // === CÔNG THỨC THỜI ĐẠI SẮT ===
  "recipe.iron_sword": {
    // Kiếm sắt - +15 ATK
    input: { "resource.iron": 8, "resource.wood": 5, "resource.coal": 3 },
    output: { "equipment.iron_sword": 1 }
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
  "equipment.iron_sword": {
    stats: { attack: 15 },  // +15 tấn công
    slot: "weapon"
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
    stats: { speed: 3, defense: 3 }, // +3 tốc độ, +3 phòng thủ
    slot: "boots"
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

  // === HỆ THỐNG ĐÓI ===
  hunger: {
    drainPerSecond: 0.2,    // đói giảm 0.1/giây (đầy→đói mất ~1000s ≈ 17 phút)
    autoEatThreshold: 30,    // tự động ăn khi đói < 30%
    hungrySpeedMult: 0.5,    // tốc độ ×0.5 khi đói < 20
    starvingHpDrain: 1,       // mất 1 HP/giây khi đói = 0
    foodRestore: {
      "resource.food": 5      // 1 thức ăn phục 5 đói
    },
    eatDuration: 1.0,         // thời gian ăn (giây)
    eatSpeedMult: 0.5,        // tốc độ di chuyển khi ăn ×0.5
    regenHungerMult: 2.0       // hồi HP tốn đói ×2
  },

  // === CHU KỲ NGÀY ĐÊM ===
  dayNight: {
    hoursPerSecond: 0.0667    // 0.0667 giờ/giây → 1 ngày = 360 giây = 6 phút
  },

  // === CÔNG TRÌNH NƯỚC ===
  "building.well": {
    // Giếng - sản xuất 1 thức ăn/giây không cần công nhân
    cost: { "resource.stone": 10, "resource.wood": 5 },
    searchRadius: { 1: 0 },
    workerCount: { 1: 0 },
    storageCapacity: { 1: 50 },
    productionSpeed: { 1: 1.0 },
    produces: { "resource.food": 1 },
    upgrades: {}
  },
  "building.bridge": {
    // Cầu - cho phép đi qua nước, không sản xuất
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