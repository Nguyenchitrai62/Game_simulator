# Evolution Simulator 3D — Game Documentation

> Phiên bản: 1.0.0 | Cập nhật: 2026-04-12

---

## 1. Tổng quan

Game mô phỏng tiến hóa từ Stone Age sang Bronze Age, chạy hoàn toàn trên frontend bằng cách mở `index.html`. Sử dụng Three.js (CDN) cho 3D isometric rendering, vanilla JS không framework.

### Nguyên tắc kiến trúc

| Nguyên tắc | Mô tả |
|------------|-------|
| **Data-driven** | Content chỉ define entity tồn tại. Balance giữ TẤT CẢ số liệu gameplay. Engine luôn đọc từ balance. |
| **Append-only content** | Không sửa/xóa content pack cũ. Chỉ thêm pack mới + tăng version. |
| **Single balance file** | Chỉnh toàn game bằng 1 file `balance.js`. |
| **No AI exposed** | AI chỉ dùng dev-side để generate content. User chỉ chơi content đã release. |

---

## 2. Cấu trúc Project

```
d:\Source_code\Game_simulator\
│
├── index.html                  ← Entry point, HUD skeleton
├── main.js                     ← Init toàn bộ hệ thống + GameActions
├── style.css                   ← HUD overlay styles
│
├── /engine                     ← Logic engine (không phụ thuộc 3D)
│   ├── registry.js             ← Merge content + balance → runtime entities
│   ├── gameState.js            ← Mutable state: resources, player, inventory, instances
│   ├── tickSystem.js           ← Production ticks (1 giây/tick)
│   ├── craftSystem.js          ← Crafting: input → output
│   ├── unlockSystem.js         ← Check unlock conditions (age/resources/buildings)
│   └── upgradeSystem.js        ← Building upgrade logic
│
├── /world                      ← 3D Layer (Three.js)
│   ├── scene.js                ← Scene, camera isometric, render loop, lighting
│   ├── terrain.js              ← Chunk-based infinite world, seeded procedural gen
│   ├── entities.js             ← 3D models: trees, rocks, animals, deposits
│   ├── player.js               ← Player character, WASD movement, interaction
│   ├── combat.js               ← Click-to-attack combat system
│   ├── buildingSystem.js       ← Building placement + upgrade on grid
│   └── npcSystem.js            ← NPC worker AI: pathfinding, harvesting, storage
│
├── /content                    ← Content packs (append-only)
│   ├── manifest.js             ← Version + pack list
│   ├── base_stone_age.js       ← Stone Age entities
│   └── expansion_bronze_age.js ← Bronze Age entities
│
├── /balance
│   └── balance.js              ← TOÀN BỘ số liệu gameplay
│
├── /storage
│   └── localStorage.js         ← Save/load game state
│
├── /ui
│   └── hud.js                  ← HUD overlay (resources, panels, notifications)
│
└── /dev                        ← Developer tools
    ├── validate.js             ← Validate content integrity
    ├── ai_generate.js          ← Content generator stub
    └── preview.js              ← Preview generated content
```

### Script Load Order (index.html)

```
1. Three.js r128 (CDN)
2. Data: manifest → base_stone_age → expansion_bronze_age → balance
3. Engine Core: registry → gameState
4. Persistence: localStorage
5. Systems: tickSystem → craftSystem → unlockSystem → upgradeSystem
6. World: scene → terrain → entities → player → combat → buildingSystem → npcSystem
7. UI: hud
8. Entry: main
9. Dev: validate → ai_generate → preview
```

---

## 3. Data Flow

```
┌─────────────┐     ┌─────────────┐
│ Content Pack │     │ Balance.js  │
│ (entities)  │     │ (numbers)   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └───────┬───────────┘
               ▼
        ┌─────────────┐
        │  Registry    │  merge content + balance → runtime entity
        │  (init)      │
        └──────┬──────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
  ┌────────┐ ┌────────┐ ┌────────────┐
  │ Game   │ │ UI/HUD │ │ World/3D   │
  │ Systems│ │ render │ │ rendering  │
  └───┬────┘ └────────┘ └────────────┘
      │
      ▼
  ┌────────┐
  │ State  │  ←─ save/load → localStorage
  └────────┘
```

---

## 4. Entity System

### 4.1 Entity Types

| Type | Prefix | Mô tả | Nguồn |
|------|--------|--------|-------|
| `age` | `age.` | Kỷ nguyên | Content pack |
| `resource` | `resource.` | Tài nguyên đếm được | Content pack |
| `resource_node` | `node.` | Object trong world (chặt/đào được) | Content pack |
| `animal` | `animal.` | Quái vật đánh được | Content pack |
| `building` | `building.` | Công trình đặt trong world | Content pack |
| `equipment` | `equipment.` | Trang bị tăng chỉ số | Content pack |
| `recipe` | `recipe.` | Công thức chế tạo | Content pack |

### 4.2 Entity Fields (Content Pack)

```js
// Mọi entity đều có:
{
  id: "building.wood_cutter",    // Dot-namespaced ID
  type: "building",               // Entity type
  name: "Wood Cutter",            // Display name
  description: "Auto-gathers wood.",

  // Tùy type:
  visual: {                        // 3D rendering data
    shape: "building",             // tree, rock, building, wolf, boar, bear, bush, flint
    color: 0x8B4513,              // Main color (hex)
    roofColor: 0x2d5a27,          // (building only) roof color
    scale: 1.0                     // Size multiplier
  },
  slot: "weapon",                  // (equipment only) weapon | offhand | armor | boots
  unlock: {                        // Điều kiện unlock
    age: "age.stone",              // Phải ở age này
    resources: { "resource.wood": 15 },   // (optional) Cần đủ tài nguyên
    buildings: { "building.wood_cutter": 1 }  // (optional) Cần đủ buildings
  }
}
```

### 4.3 Balance Fields

```js
// === Resource Nodes ===
"node.tree": {
  hp: 3,                          // Hit points
  rewards: { "resource.wood": 3 }, // Loot khi phá xong
  respawnTime: 30                  // Giây để respawn
}

// === Animals ===
"animal.wolf": {
  hp: 15,                          // Hit points
  attack: 3,                       // Damage per hit
  defense: 1,                      // Damage reduction
  rewards: { "resource.food": 5 }, // Loot khi giết
  respawnTime: 60
}

// === Buildings ===
"building.wood_cutter": {
  cost: { "resource.wood": 10 },   // Chi phí xây
  produces: { "resource.wood": 2 },// Sản xuất/tick
  consumesPerTick: { ... },        // (optional) Tiêu thụ/tick
  upgrades: {                      // (optional) Cấp nâng cấp
    2: { cost: { ... }, productionMultiplier: 1.5 },
    3: { cost: { ... }, productionMultiplier: 2.0 }
  }
}

// === Recipes ===
"recipe.wooden_sword": {
  input: { "resource.wood": 5, "resource.flint": 2 },
  output: { "equipment.wooden_sword": 1 }
}

// === Equipment ===
"equipment.wooden_sword": {
  stats: { attack: 3 },            // attack, defense, maxHp, speed
  slot: "weapon"                   // weapon | offhand | armor | boots
}

// === Ages ===
"age.stone": {
  startResources: { "resource.wood": 10, ... }
}
"age.bronze": {
  startResources: { ... },
  advanceFrom: {                   // Điều kiện advance
    age: "age.stone",
    resources: { "resource.tool": 10 },
    buildings: { "building.wood_cutter": 3 }
  }
}
```

---

## 5. Game State

```js
{
  // === Core ===
  resources: { "resource.wood": 10, "resource.stone": 5, ... },
  buildings: { "building.wood_cutter": 2, ... },   // Tổng count mỗi loại
  unlocked: ["age.stone", "resource.wood", ...],    // Danh sách entity ID đã unlock
  age: "age.stone",
  version: "1.0.0",

  // === Player ===
  player: {
    hp: 100, maxHp: 100,
    attack: 1, defense: 0,          // Base stats (trước equipment)
    x: 8, z: 8,                     // World position
    speed: 3,                        // Tiles/giây
    equipped: {
      weapon: null,                  // "equipment.wooden_sword" hoặc null
      offhand: null,
      armor: null,
      boots: null
    }
  },

  // === Inventory ===
  inventory: { "equipment.wooden_sword": 1, ... },

  // === Building Instances (đã đặt trong world) ===
  instances: {
    "inst_1": { entityId: "building.wood_cutter", level: 1, x: 5, z: 3, uid: "inst_1" }
  },

  // === World ===
  chunks: { "0,0": { objects: [...], ... } },
  worldSeed: 42                      // Persistent seed cho procedural gen
}
```

### Public API: `window.GameState`

| Hàm | Mô tả |
|-----|--------|
| `init()` | Reset state, load starter resources từ balance |
| **Resources** | `addResource(id, amt)`, `removeResource(id, amt)` → bool, `getResource(id)`, `hasResource(id, amt)`, `getAllResources()` |
| **Buildings** | `addBuilding(id)`, `getBuildingCount(id)`, `getAllBuildings()` |
| **Unlock** | `unlock(id)` → bool isNew, `isUnlocked(id)`, `getUnlocked()` |
| **Age** | `setAge(id)`, `getAge()` |
| **Player** | `getPlayer()`, `setPlayerHP(hp)`, `getPlayerMaxHp()`, `getPlayerAttack()`, `getPlayerDefense()`, `equipItem(eqId)`, `unequipSlot(slot)` |
| **Inventory** | `addToInventory(id, count)`, `removeFromInventory(id, count)`, `getInventory()`, `getInventoryCount(id)` |
| **Instances** | `addInstance(uid, data)`, `getInstance(uid)`, `getAllInstances()`, `removeInstance(uid)` |
| **Chunks** | `saveChunkData(key, data)`, `getChunkData(key)` |
| **Serialize** | `exportState()` → deep copy, `importState(data)` → bool |

### Stat Calculation

```
PlayerMaxHp    = 100 + armor.stats.maxHp
PlayerAttack   = player.baseAttack + weapon.stats.attack
PlayerDefense  = player.baseDefense + offhand.stats.defense + armor.stats.defense
PlayerSpeed    = player.baseSpeed + boots.stats.speed
```

---

## 6. Engine Systems

### 6.1 Registry (`window.GameRegistry`)

| Hàm | Mô tả |
|-----|--------|
| `init()` | Load packs từ manifest, merge content + balance |
| `getEntity(id)` | Runtime entity (content + balance merged) |
| `getEntitiesByType(type)` | Array of entities matching type |
| `getBalance(id)` | Raw balance data |
| `getAllEntities()` | Full entity map |

**Merge logic:** Content fields first → balance fills gaps → balance also stored as `_balance` property.

### 6.2 Tick System (`window.TickSystem`)

Được gọi mỗi 1 giây từ render loop (tick accumulator trong `scene.js`).

```
tick():
  1. applyProduction() — loop tất cả building instances
     - Check consumesPerTick → deduct if sufficient
     - Apply produces * UpgradeSystem.getProductionMultiplier(buildingId)
  2. UnlockSystem.checkAll() — check unlock conditions
  3. GameHUD.renderAll() — update UI
  4. Auto-save mỗi 10 ticks
```

### 6.3 Craft System (`window.CraftSystem`)

```
craft(recipeId):
  1. Check isUnlocked(recipeId)
  2. Check đủ tất cả input resources
  3. Deduct inputs
  4. Add outputs
  5. Return success
```

**Lưu ý:** Equipment output được thêm vào `resources` trước, rồi `GameActions.craft()` chuyển sang `inventory`.

### 6.4 Unlock System (`window.UnlockSystem`)

```
checkAll():
  Loop mọi entity (skip type "age", skip đã unlock):
    checkConditions(entity.unlock):
      1. age match?
      2. resources >= threshold? (nếu có)
      3. buildings >= count? (nếu có)
      → Nếu pass: GameState.unlock(id)
```

**Chạy 2 lần** lúc init để unlock chain dependencies (vd: wood_cutter unlock → stone_quarry cần wood_cutter).

### 6.5 Upgrade System (`window.UpgradeSystem`)

```
upgrade(buildingId, instanceUid):
  1. Check next level tồn tại trong balance.upgrades
  2. Check đủ resources cho upgrade cost
  3. Deduct cost
  4. Update instance level

getProductionMultiplier(buildingId):
  → balance.upgrades[currentLevel].productionMultiplier || 1.0
```

---

## 7. World Systems

### 7.1 Scene (`window.GameScene`)

```
Camera: Orthographic, position (playerX+20, 20, playerZ+20)
Look at: (playerX, 0, playerZ)
Zoom: 6-25, mặc định 12
Background: 0x87CEEB (sky blue)
Fog: 40-80 range
Lights: Ambient (0.6) + Directional sun + Hemisphere
Render loop: requestAnimationFrame
```

### 7.2 Terrain (`window.GameTerrain`) — Infinite World

```
Chunk size: 16x16 tiles
Render distance: 2 chunks
Seed: Deterministic (cx * 73856093 ^ cz * 19349663)
```

**Generation Rules:**

| Distance | Trees | Rocks | Bushes | Animals | Flint |
|----------|-------|-------|--------|---------|-------|
| Home (0,0) | 8-12 | 2-3 | 1-3 | 0 | 0% |
| Near (d<2) | 5-10 | 3-6 | 1-3 | 1-2 (wolf) | 0% |
| Mid (d<4) | 2-5 | 4-8 | 0 | 2-3 (wolf/boar) | 50% |
| Far (d≥4) | 2-5 | 4-8 | 0 | 3 (boar/bear) | 50% |

**HP đọc từ `GAME_BALANCE`**, không hardcode.

### 7.3 Movement (`window.GamePlayer`)

**Controls:**
| Key | Action |
|-----|--------|
| W/↑ | Di chuyển lên màn hình |
| S/↓ | Di chuyển xuống màn hình |
| A/← | Di chuyển trái màn hình |
| D/→ | Di chuyển phải màn hình |
| E | Tương tác object gần nhất |
| B | Mở Build tab |
| C | Mở Craft tab |
| I | Mở Inventory tab |
| Scroll | Zoom in/out |
| Click object | Walk to + tương tác |

**Screen-to-World Conversion (Isometric 45°):**
```
Camera at (20,20,20) → screen right = world(+1,-1), screen up = world(-1,-1)

screenDy: W=+1, S=-1
screenDx: A=-1, D=+1

worldDx = screenDx - screenDy
worldDz = -screenDx - screenDy
```

**Collision:** Slide-along-wall (thử full move → thử X-only → thử Z-only).

### 7.4 Combat (`window.GameCombat`)

```
Start: Click animal → walk to → arrive → auto-combat
Interval: 1 hit/giây

Player damage = max(1, playerAttack - animalDefense)
Animal damage = max(0, animalAttack - playerDefense)

Animal dies → loot rewards, hide mesh, schedule respawn
Player dies → respawn (8,8), full HP, mất 30% resources
```

### 7.5 Building System (`window.BuildingSystem`)

```
Build mode flow:
1. User click "Build" trong HUD panel
2. enterBuildMode(buildingId) → tạo preview mesh
3. Mouse move → updatePreview() → snap to grid, color green/red
4. Click → placeBuilding() → validate + deduct cost + create instance + create 3D mesh
5. exitBuildMode()
```

**Placement rules:**
- Snap to integer grid
- Must be walkable terrain
- Không overlap existing buildings (0.7 unit buffer)

### 7.6 NPC System (`window.NPCSystem`)

Worker NPCs tự động thu thập tài nguyên cho buildings.

```
Init flow:
1. NPCSystem.init() - Reset NPC array
2. SpawnWorkersForBuilding(uid) - Tạo workers cho mỗi building
   - Số lượng từ balance.workerCount[level]
   - Tạo 3D mesh (GameEntities.createNPCMesh)
   - Init tại vị trí building

Update loop (mỗi frame):
  NPCSystem.update(deltaTime) - Update tất cả NPCs
  
NPC State Machine:
  IDLE → FIND_NODE → WALK_TO_NODE → HARVEST → WALK_HOME → DEPOSIT → IDLE
  
States:
  - IDLE: Chờ, chuyển sang tìm node
  - FIND_NODE: Tìm resource node gần nhất (searchRadius từ balance)
  - WALK_TO_NODE: Di chuyển đến node (pathfinding)
  - HARVEST: Đập node (1 hit/giây), lấy rewards khi node bị phá
  - WALK_HOME: Quay về building với tài nguyên
  - DEPOSIT: Gửi tài nguyên vào building storage (buildingStorage)
  
Building types:
  - Wood Cutter → harvests node.tree
  - Stone Quarry → harvests node.rock
  - Berry Gatherer → harvests node.berry_bush
  - Flint Mine → harvests node.flint_deposit
  - Copper Mine → harvests node.copper_deposit
  - Tin Mine → harvests node.tin_deposit
  - Smelter → no harvesting (processes resources from storage)
```

**Balance data required:**
```js
"building.wood_cutter": {
  searchRadius: { 1: 5, 2: 8, 3: 12 },  // Radius per level
  workerCount: { 1: 1, 2: 2, 3: 3 }     // Workers per level
}
```

**API:**
- `init()` - Reset system
- `spawnWorkersForBuilding(uid)` - Tạo workers cho building
- `despawnWorkersForBuilding(uid)` - Xóa workers khi building bị phá
- `update(deltaTime)` - Update tất cả NPCs (called từ scene.js)

---

## 8. 3D Models (Programmatic)

Tất cả models tạo từ Three.js primitives, không cần external files:

| Object | Geometry | Colors |
|--------|----------|--------|
| **Tree** | Cylinder trunk + 2 Cone layers leaves | Trunk: `0x8B4513`, Leaves: `0x2d5a27` |
| **Rock** | Dodecahedron + small dodecahedron | `0x808080` |
| **Berry Bush** | Sphere + 5 red berry spheres | `0x3a7a2e`, Berries: `0xcc3333` |
| **Flint Deposit** | Box + Cone on top | `0x4a4a4a` |
| **Copper Deposit** | Dodecahedron (reuses rock shape) | `0xB87333` |
| **Tin Deposit** | Dodecahedron | `0xC0C0C0` |
| **Wolf** | Box body + head + red eyes + 4 legs | `0x808080` |
| **Boar** | Same + white cone tusks | `0x8B6914` |
| **Bear** | Larger version | `0x5C4033` |
| **Lion** | Same as bear | `0xC4A24E` |
| **Buildings** | Box base + pyramid roof + door plane | Color/roofColor từ entity.visual |
| **Player** | Box body + sphere head + 4 limb boxes | Body: `0x4488cc`, Head: `0xDEB887`, Legs: `0x3a3a5c` |
| **NPC** | Smaller player-like mesh (0.6x scale) | Body: `0x88cc44`, Head: `0xDEB887` |
| **Terrain** | Plane per chunk + GridHelper | `0x7ec850` |

Tất cả có circular shadow (transparent black CircleGeometry).

---

## 9. Content Entities — Full List

### Stone Age (base_stone_age.js)

| ID | Type | Name | Unlock |
|----|------|------|--------|
| `age.stone` | age | Stone Age | — |
| `resource.wood` | resource | Wood | `age.stone` |
| `resource.stone` | resource | Stone | `age.stone` |
| `resource.food` | resource | Food | `age.stone` |
| `resource.flint` | resource | Flint | `age.stone` |
| `resource.tool` | resource | Tool | `age.stone` |
| `resource.leather` | resource | Leather | `age.stone` |
| `node.tree` | resource_node | Tree | `age.stone` |
| `node.rock` | resource_node | Rock | `age.stone` |
| `node.berry_bush` | resource_node | Berry Bush | `age.stone` |
| `node.flint_deposit` | resource_node | Flint Deposit | `age.stone` |
| `animal.wolf` | animal | Wolf | `age.stone` |
| `animal.boar` | animal | Boar | `age.stone` |
| `animal.bear` | animal | Bear | `age.stone` |
| `building.wood_cutter` | building | Wood Cutter | `age.stone` |
| `building.stone_quarry` | building | Stone Quarry | `age.stone` + 1 wood_cutter |
| `building.berry_gatherer` | building | Berry Gatherer | `age.stone` |
| `building.flint_mine` | building | Flint Mine | `age.stone` + 1 stone_quarry |
| `equipment.wooden_sword` | equipment | Wooden Sword (+3 ATK) | `age.stone` |
| `equipment.stone_spear` | equipment | Stone Spear (+6 ATK) | `age.stone` + 3 tools |
| `equipment.stone_shield` | equipment | Stone Shield (+3 DEF) | `age.stone` + 1 stone_quarry |
| `equipment.leather_armor` | equipment | Leather Armor (+5 DEF, +10 HP) | `age.stone` + 3 leather |
| `equipment.leather_boots` | equipment | Leather Boots (+2 Speed) | `age.stone` |
| `recipe.stone_tool` | recipe | Stone Tool | `age.stone` |
| `recipe.wooden_sword` | recipe | Wooden Sword | `age.stone` |
| `recipe.stone_spear` | recipe | Stone Spear | `age.stone` + 1 flint_mine |
| `recipe.stone_shield` | recipe | Stone Shield | `age.stone` + 1 stone_quarry |
| `recipe.leather_armor` | recipe | Leather Armor | `age.stone` + 3 leather |
| `recipe.leather_boots` | recipe | Leather Boots | `age.stone` |

### Bronze Age (expansion_bronze_age.js)

| ID | Type | Name | Unlock |
|----|------|------|--------|
| `age.bronze` | age | Bronze Age | advance: 10 tools + 50 food + 3 wood_cutter + 2 stone_quarry |
| `resource.copper` | resource | Copper | `age.bronze` |
| `resource.tin` | resource | Tin | `age.bronze` |
| `resource.bronze` | resource | Bronze | `age.bronze` |
| `node.copper_deposit` | resource_node | Copper Deposit | `age.bronze` |
| `node.tin_deposit` | resource_node | Tin Deposit | `age.bronze` |
| `animal.lion` | animal | Lion | `age.bronze` |
| `building.copper_mine` | building | Copper Mine | `age.bronze` |
| `building.tin_mine` | building | Tin Mine | `age.bronze` + 1 copper_mine |
| `building.smelter` | building | Bronze Smelter | `age.bronze` + 2 copper_mine |
| `equipment.bronze_sword` | equipment | Bronze Sword (+10 ATK) | `age.bronze` |
| `equipment.bronze_shield` | equipment | Bronze Shield (+6 DEF) | `age.bronze` + 1 smelter |
| `equipment.bronze_armor` | equipment | Bronze Armor (+10 DEF, +20 HP) | `age.bronze` + 2 smelter |
| `recipe.bronze_sword` | recipe | Bronze Sword | `age.bronze` + 1 smelter |
| `recipe.bronze_shield` | recipe | Bronze Shield | `age.bronze` + 1 smelter |
| `recipe.bronze_armor` | recipe | Bronze Armor | `age.bronze` + 2 smelter |

---

## 10. Balance — Full Data

### Starter Resources
```
Wood: 10, Stone: 5, Food: 10, Flint: 3, Tool: 0, Leather: 0
```

### Resource Nodes

| Node | HP | Rewards | Respawn |
|------|----|---------|---------|
| Tree | 3 | +3 Wood | 30s |
| Rock | 5 | +2 Stone, +1 Flint | 45s |
| Berry Bush | 1 | +2 Food | 20s |
| Flint Deposit | 4 | +3 Flint | 60s |
| Copper Deposit | 6 | +3 Copper | 50s |
| Tin Deposit | 5 | +2 Tin | 55s |

### Animals

| Animal | HP | ATK | DEF | Rewards | Respawn |
|--------|----|-----|-----|---------|---------|
| Wolf | 15 | 3 | 1 | +5 Food | 60s |
| Boar | 20 | 5 | 2 | +8 Food, +2 Leather | 90s |
| Bear | 40 | 8 | 3 | +15 Food, +5 Leather | 120s |
| Lion | 60 | 12 | 5 | +25 Food, +8 Leather | 150s |

### Buildings

| Building | Cost | Produces/s | Upgrades |
|----------|------|------------|----------|
| Wood Cutter | 10 Wood | +2 Wood | Lv2: x1.5 / Lv3: x2.0 |
| Stone Quarry | 15 Wood, 5 Stone | +1 Stone | Lv2: x1.5 / Lv3: x2.0 |
| Berry Gatherer | 8 Wood | +2 Food | Lv2: x1.5 / Lv3: x2.0 |
| Flint Mine | 20 Wood, 10 Stone | +1 Flint | Lv2: x1.5 / Lv3: x2.0 |
| Copper Mine | 30 Wood, 20 Stone | +1 Copper | Lv2: x1.5 |
| Tin Mine | 35 Wood, 25 Stone, 5 Copper | +1 Tin | Lv2: x1.5 |
| Smelter | 40 Stone, 10 Copper, 5 Tin | +1 Bronze | consumes: 2 Copper + 1 Tin/tick, Lv2: x1.5 |

### Recipes

| Recipe | Input | Output |
|--------|-------|--------|
| Stone Tool | 3 Flint + 2 Wood | +1 Tool |
| Wooden Sword | 5 Wood + 2 Flint | +1 Wooden Sword |
| Stone Spear | 8 Wood + 4 Flint + 3 Stone | +1 Stone Spear |
| Stone Shield | 8 Stone + 4 Wood + 2 Flint | +1 Stone Shield |
| Leather Armor | 5 Leather + 3 Flint | +1 Leather Armor |
| Leather Boots | 3 Leather + 2 Wood | +1 Leather Boots |
| Bronze Sword | 5 Bronze + 3 Wood | +1 Bronze Sword |
| Bronze Shield | 5 Bronze + 4 Wood | +1 Bronze Shield |
| Bronze Armor | 8 Bronze + 3 Leather | +1 Bronze Armor |

### Equipment Stats

| Equipment | Slot | Stats |
|-----------|------|-------|
| Wooden Sword | weapon | +3 ATK |
| Stone Spear | weapon | +6 ATK |
| Bronze Sword | weapon | +10 ATK |
| Stone Shield | offhand | +3 DEF |
| Bronze Shield | offhand | +6 DEF |
| Leather Armor | armor | +5 DEF, +10 Max HP |
| Bronze Armor | armor | +10 DEF, +20 Max HP |
| Leather Boots | boots | +2 Speed |

---

## 11. Init Flow (main.js)

```
1. GameRegistry.init()              ← Load content packs, merge balance
2. GameStorage.checkVersion()       ← Clear old saves if version mismatch
3. GameState.init() OR load()       ← Fresh start or restore save
4. GameScene.init()                 ← Three.js scene, camera, renderer, render loop starts
5. GameTerrain.init(worldSeed)      ← Chunk system with persistent seed
6. NPCSystem.init()                 ← Initialize NPC worker system
7. GamePlayer.init(x, z)            ← Create 3D player, register input handlers
8. GameTerrain.update(x, z)         ← Generate initial chunks around player
9. GameEntities.createObjectForChunk() × N  ← Create 3D meshes for all chunk objects
10. Restore building instances      ← Re-create 3D meshes for saved buildings
11. NPCSystem.spawnWorkersForBuilding() × N ← Spawn workers for each building
12. UnlockSystem.checkAll() × 2     ← Unlock entities (2 passes for chain deps)
13. GameHUD.renderAll()             ← Initial UI render
14. Register mousemove handler      ← For build mode preview
```

---

## 12. Expansion Flow

### Thêm content mới (ví dụ: Iron Age)

**1. Tạo file content mới:** `/content/expansion_iron_age.js`

```js
window.GAME_CONTENT["expansion_iron_age"] = {
  packId: "expansion_iron_age",
  name: "Iron Age Expansion",
  entities: [
    { id: "age.iron", type: "age", name: "Iron Age", ... },
    { id: "resource.iron", type: "resource", ... },
    { id: "node.iron_deposit", type: "resource_node", visual: { shape: "rock", color: 0xAAAAAA }, ... },
    { id: "building.iron_forge", type: "building", visual: { shape: "building", color: 0x555555 }, ... },
    // ... thêm entities
  ]
};
```

**2. Thêm balance entries** vào `balance.js`:

```js
"node.iron_deposit": { hp: 8, rewards: { "resource.iron": 3 }, respawnTime: 70 },
"building.iron_forge": { cost: { ... }, produces: { "resource.iron": 1 } },
// ...
```

**3. Cập nhật manifest.js:**

```js
window.GAME_MANIFEST = {
  version: "2.0.0",  // Increment from current 1.0.0
  packs: ["base_stone_age", "expansion_bronze_age", "expansion_iron_age"]
};
```

**4. Thêm `<script>` vào index.html** (sau expansion_bronze_age.js).

**5. Chạy validate:** `GameValidator.printReport()` trong console.

### Rules
- KHÔNG sửa/xóa entities cũ
- KHÔNG sửa content packs cũ
- CHỈ thêm pack mới + balance entries
- Tăng version trong manifest

---

## 13. Key Formulas Reference

### Combat
```
damageDealt = max(1, playerAttack - targetDefense)
damageTaken = max(0, targetAttack - playerDefense)
playerAttack = base(1) + weapon.stats.attack
playerDefense = base(0) + offhand.stats.defense + armor.stats.defense
playerMaxHp = base(100) + armor.stats.maxHp
```

### Production
```
production/tick = floor(baseAmount × upgradeMultiplier) × buildingCount
consumption/tick = consumeAmount × buildingCount  (all-or-nothing: skip if insufficient)
```

### Harvest
```
toolBonus = floor(weapon.stats.attack / 2)  // extra hits per harvest action
totalDamage = 1 + toolBonus
node dies when hp <= 0 → rewards given, respawn scheduled
```

### Death Penalty
```
loseResources = floor(current × 0.3)  // 30% of each resource
respawn at (8, 8) with full HP
```

### Movement
```
speed = 3 tiles/second
screenDy: W=+1, S=-1  |  screenDx: A=-1, D=+1
worldDx = screenDx - screenDy
worldDz = -screenDx - screenDy
normalize, then apply × speed × dt
```

---

## 14. Dev Tools API

### Validator (`window.GameValidator`)

```js
GameValidator.printReport()   // Console: full validation report
GameValidator.validateAll()    // Returns { valid, errors[], warnings[] }
// Checks: duplicate IDs, missing balance, broken dependencies, resource loops, unlock deadlocks
```

### Generator (`window.GameGenerator`)

```js
GameGenerator.generateNewContent("Add iron age with iron tools")
// Returns { newPack, balancePatch, summary }
GameGenerator.applyGeneratedContent(pack, balancePatch)  // Temporary apply to game
GameGenerator.exportPack(pack, balancePatch)             // Export as JS strings
```

### Preview (`window.GamePreview`)

```js
GamePreview.preview(packData, balancePatch)  // Show preview panel
GamePreview.applyPreview()                   // Apply temporarily
GamePreview.closePreview()                   // Close panel
```
