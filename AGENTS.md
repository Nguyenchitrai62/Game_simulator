# Evolution Simulator 3D — Game Documentation

## 1. Overview

3D evolution simulator: Stone Age -> Bronze Age -> Iron Age. Runs entirely in browser via `index.html`. Three.js (local `three.min.js`) for 3D isometric rendering, vanilla JS, no framework.

### Architecture Principles

| Principle | Description |
|-----------|-------------|
| **Data-driven** | Content defines entities. Balance holds ALL gameplay numbers. Engine reads from balance. |
| **Append-only content** | Never edit/delete old content packs. Only add new packs + increment version. |
| **Single balance file** | Tune entire game via one file: `balance.js`. |
| **No AI exposed** | AI is dev-side only for content generation. Users play released content. |

---

## 2. Project Structure

```
d:\Source_code\Game_simulator\
|
|-- index.html                  <- Entry point, HUD skeleton
|-- main.js                     <- Init + GameActions API
|-- style.css                   <- HUD styles (dark theme)
|-- three.min.js                <- Three.js (local)
|
|-- /engine                     <- Logic engine (no 3D dependency)
|   |-- registry.js             <- Merge content + balance -> runtime entities
|   |-- gameState.js            <- Mutable state: resources, player, inventory, instances
|   |-- tickSystem.js           <- Production ticks (~1s/tick), consumption, warehouse transfer
|   |-- craftSystem.js          <- Crafting: input -> output
|   |-- unlockSystem.js         <- Multi-pass unlock check (age/resources/buildings/tech)
|   |-- upgradeSystem.js        <- Per-instance building upgrade
|   |-- researchSystem.js       <- Technology research: prerequisites, global bonuses
|   |-- synergy.js              <- Building proximity bonuses (wired, data pending)
|
|-- /world                      <- 3D Layer (Three.js)
|   |-- scene.js                <- Scene, orthographic camera, render loop, lighting, game speed
|   |-- terrain.js              <- Chunk-based infinite world, seeded procedural gen
|   |-- entities.js             <- 3D meshes + animal wandering AI + node respawn
|   |-- player.js               <- Player character, WASD, interaction, HP regen, hunger system
|   |-- combat.js               <- Click-to-attack, 0.5s interval, death penalty
|   |-- buildingSystem.js       <- Build mode preview + placement + upgrade visuals + destruction
|   |-- npcSystem.js            <- NPC workers: IDLE->FIND_NODE->WALK->HARVEST->WALK_HOME->DEPOSIT
|   |-- rangeIndicator.js       <- Visual range indicators for building search/transfer radius
|   |-- dayNightSystem.js       <- 24-hour day/night cycle with dynamic lighting
|   |-- fireSystem.js           <- Fire & li3.0.0" + pack list
|   |-- base_stone_age.js       <- Stone Age (30 entities)
|   |-- expansion_bronze_age.js <- Bronze Age (17 entities)
|   |-- expansion_iron_age.js   <- Iron Age (20 entities)
|   |-- expansion_fire_light.js <- Fire & Light (4 entities: torch, campfire, handheld_torch)
|   |-- expansion_water.js      <- Water (2 entities: well, bridge
|-- /content                    <- Content packs (append-only)
|   |-- manifest.js             <- Version "2.0.0" + pack list
|   |-- base_stone_age.js       <- Stone Age (30 entities)
|   |-- expansion_bronze_age.js <- Bronze Age (17 entities)
|   |-- expansion_iron_age.js   <- Iron Age (20 entities)
|
|-- /balance
|   |-- balance.js              <- ALL gameplay numbers (nodes, animals, buildings, recipes, equipment, ages, tech)
|
|-- /storage
|   |-- localStorage.js         <- Save/load + version check
|
|-- /ui
|   |-- hud.js                  <- Full HUD: resources, modal (5 tabs), building inspector, notifications
|
|-- /dev                        <- Developer tools
|   |-- validate.js             <- Content integrity validator
|   |-- ai_generate.js          <- Content generator stub
|   |-- preview.js              <- Preview generated content
```

### Script Load Order (index.html)

```expansion_fire_light -> expansion_water -> balance
3. Engine Core: registry -> gameState
4. Persistence: localStorage
5. Systems: tickSystem -> craftSystem -> unlockSystem -> upgradeSystem -> synergy -> researchSystem
6. World: scene -> terrain -> entities -> player -> combat -> buildingSystem -> npcSystem -> rangeIndicator -> dayNightSystem -> fireSystem -> waterSystem -> minimap
5. Systems: tickSystem -> craftSystem -> unlockSystem -> upgradeSystem -> synergy -> researchSystem
6. World: scene -> terrain -> entities -> player -> combat -> buildingSystem -> npcSystem
7. UI: hud (MUST load before main.js)
8. Entry: main
9. Dev: validate -> ai_generate -> preview
```

---

## 3. Data Flow

```
Content Pack (entities) + Balance.js (numbers)
        |
        v
   Registry (merge -> runtime entity)
        |
   +----+----+
   |    |    |
Systems  HUD  World/3D
   |
   v
 Game State <--save/load--> localStorage
```

---

## 4. Entity System

### 4.1 Entity Types

| Type | Prefix | Source |
|------|--------|--------|
| `age` | `age.` | Content pack |
| `resource` | `resource.` | Content pack |
| `resource_node` | `node.` | Content pack |
| `animal` | `animal.` | Content pack |
| `building` | `building.` | Content pack |
| `equipment` | `equipment.` | Content pack |
| `recipe` | `recipe.` | Content pack |
| `technology` | `tech.` | Content pack |

### 4.2 Content Entity Fields

```js
{
  id: "building.wood_cutter",     // Dot-namespaced ID
  type: "building",               // Entity type
  name: "Wood Cutter",            // Display name
  description: "Auto-gathers wood.",
  visual: { shape, color, roofColor?, scale? },  // 3D rendering
  slot: "weapon",                 // equipment only: weapon|offhand|armor|boots
  unlock: {                       // Unlock conditions
    age: "age.stone",
    resources?: { "resource.wood": 15 },
    buildings?: { "building.wood_cutter": 1 },
    technologies?: ["tech.advanced_tools"]  // NEW in v2
  }
}
```

### 4.3 Balance Fields (key patterns)

```js
// Resource Nodes
"node.tree": { hp, rewards: { "resource.id": amt }, respawnTime }

// Animals
"animal.wolf": { hp, attack, defense, rewards, respawnTime, aggroRange }

// Buildings
"building.id": {
  cost, produces?, consumesPerTick?,
  searchRadius: { level: radius },
  workerCount: { level: count },
  storageCapacity: { level: capacity },
  productionSpeed: { level: speed },
  synergyFrom?: {},               // Proximity bonus source (data pending)
  transferRange?: 5,              // Warehouse only: transfer to warehouse range
  upgrades: { level: { cost, productionMultiplier } }
}

// Recipes
"recipe.id": { input: {...}, output: {...} }

// Equipment
"equipment.id": { stats: { attack?, defense?, maxHp?, speed? }, slot }

// Ages
"age.id": { startResources, advanceFrom?: { age, resources, buildings } }

// Technologies
"tech.id": { researchCost, requires?: ["tech.id"], effects: { productionBonus?, harvestSpeedBonus?, npcSpeedBonus?, storageBonus? } }
```

---

## 5. Game State (`window.GameState`)

```js
{
  resources: {},          // "resource.wood": 10
  buildings: {},          // "building.wood_cutter": 2  (total count)
  unlocked: [],           // Entity IDs unlocked
  researched3.0.0",
  player: { hp, maxHp, attack, defense, x, z, speed, equipped: { weapon, offhand, armor, boots } },
  inventory: {},          // "equipment.id": count
  instances: {},          // "uid": { entityId, level, x, z, uid }
  buildingStorage: {},    // "uid": { "resource.id": amt }
  chunks: {},
  worldSeed: 42,
  fractionalAccumulator: {},
  gameSpeed: 1.0,
  isPaused: false,
  techState: { currentResearch: null, progress: 0 },
  hunger: 100,            // Player hunger (0-100)
  maxHunger: 100,         // Max hunger capacity
  timeOfDay: 12,          // 0-24 hour system
  fireFuel: {},           // "uid": { current, max } - fuel state for torches/campfires
  handheldTorch: null     // { startTime, duration } or null
  isPaused: false,
  techState: { currentResearch: null, progress: 0 }
}
```

### Key API

| Category | Functions |
|----------|-----------|
| **Resources** | `addResource(id, amt)`, `removeResource(id, amt)`, `getResource(id)`, `hasResource(id, amt)` |
| **Buildings** | `addBuilding(id)`, `getBuildingCount(id)`, `removeBuilding(id)` |
| **Unlock** | `unlock(id)`, `isUnlocked(id)`, `getUnlocked()` |
| **Age** | `setAge(id)`, `getAge()` |
| **Player** | `getPlayer()`, `setPlayerHP()`, `getPlaye
| **Hunger** | `getHunger()`, `setHunger(val)`, `getMaxHunger()`, `isHungry()`, `isStarving()` |
| **Day/Night** | `getTimeOfDay()`, `setTimeOfDay(val)` |
| **Fire** | `getFireFuel(uid)`, `setFireFuel(uid, current)`, `removeFireFuel(uid)` |
| **Handheld Torch** | `getHandheldTorch()`, `activateHandheldTorch()`, `deactivateHandheldTorch()` |rMaxHp/Attack/Defense/Speed()`, `equipItem()`, `unequipSlot()` |
| **Inventory** | `addToInventory(id, count)`, `removeFromInventory()`, `getInventory()` |
| **Instances** | `addInstance(uid, data)`, `getInstance(uid)`, `getAllInstances()`, `removeInstance(uid)` |
| **Research** | `markResearched(techId)`, `isResearched(techId)`, `getResearched()` |
| **Storage** | `addBuildingStorage()`, `getBuildingStorage()`, `collectFromBuilding()`, `tryDepositToBuilding()` |
| **Serialize** | `exportState()`, `importState(data)` |

---

## 6. Engine Systems

### 6.1 Registry (`window.GameRegistry`)
`init()` loads packs from manifest, merges content fields + balance data into runtime entities.
`getEntity(id)` returns merged entity, `getBalance(id)` returns raw balance, `getEntitiesByType(type)` for filtered queries.

### 6.2 Tick System (`window.TickSystem`)
Runs every ~1 second from render loop. Production from NPC harvesting -> building storage. Consumption for smelters. Warehouse transfer (buildings within `transferRange`). UnlockSystem check. Auto-save every 5 ticks. Game speed multiplier support (0.25x-5x).

### 6.3 Craft System (`window.CraftSystem`)
Validates: unlock, input resources, no duplicate equipment. Deducts inputs, adds outputs to inventory (equipment) or resources.

### 6.4 Unlock System (`window.UnlockSystem`)
Multi-pass (up to 10) unlock checking: age match, resource threshold, building count, technology prerequisites. Provides progress tracking.

### 6.5 Upgrade System (`window.UpgradeSystem`)
Per-instance building upgrade: checks next level cost, deducts resources, updates instance level, recreates 3D mesh, respawns NPCs.

### 6.6 Research System (`window.ResearchSystem`)
Checks: unlock status, already researched, prerequisites (`requires` array), resource cost. Deducts cost, marks researched. Provides `getGlobalBonuses()` accumulating all tech effects (productionBonus, harvestSpeedBonus, npcSpeedBonus, storageBonus).

### 6.7 Synergy System (`window.SynergySystem`)
Checks `balance.synergyFrom` for nearby buildings within 1.5 tiles. Diminishing returns after 3 buildings (10%/extra), hard cap 50%. **Note: currently no buildings have non-empty synergyFrom -- system is wired but inactive.**

---

## 7. World Systems

### 7.1 Scene
Orthographic camera at (player+20, 20, player+20). Zoom: 6-12. Fog 40-80. Sky 0x87CEEB. Ambient + directional + hemisphere lights. Render loop via requestAnimationFrame.

### 7.2 Terrain
16x16 tile chunks, render distance 2. Seeded procedural generation. Objects spawn based on distance from home + current age (iron/coal deposits, bandits/sabertooths only in Iron Age).

### 7.3 Player
WASD isometric movement (45 degree conversion). Collision: slide-along-wall. E key interaction. HP regen: 1 HP/2s after 3s out of combat.

### 7.7 Range Indicator System
Visual feedback for building ranges. Shows two types: **searchRadius** (green, 0.18 opacity) for NPC harvesting range, **transferRange** (blue, 0.15 opacity) for warehouse resource transfer range. Displays as ground rings (RingGeometry) + edge lines. Activated on building selection, hidden on deselect.

### 7.8 Day/Night System
24-hour cycle advancing at ~0.0667 hours/tick (configurable). 14 keyframe phases from midnight to midnight, interpolating ambient light, directional light intensity/color, hemisphere light, sky color, and darkness value (0.0-1.0). **Fog remains constant** (near=35, far=75) to allow PointLights to illuminate properly at night. Uses `THREE.Color.lerp()` for smooth color transitions. Darkness affects global scene brightness; individual lights (torches, campfires) create local illumination.

### 7.9 Fire System
Manages PointLight instances for torch (`lightRadius=6`), campfire (`lightRadius=14`), and handheld torch (`lightRadius=8`). Lights flicker using sine-based animations (different patterns for campfire vs torch). Intensity driven by: darkness (max at night), fuel level, and flicker. Color oscillates between warmOrange/warmYellow/deepOrange. Handheld torch follows player position. Fuel consumption: 1 fuel/tick, refuel costs resources. Lights auto-disable when fuel=0.

### 7.10 Water System
Procedural river/lake generation using seeded randomness. Rivers: sine-wave paths with `deep` (center) and `shallow` (±1 tile) bands. Lakes: random circular regions (2-4 tile radius) far from home (distance ≥2 chunks). Water tiles block movement unless bridge is placed. Creates semi-transparent meshes (deep=0x2255aa@0.8, shallow=0x4488cc@0.6). Home chunk (0,0) always dry.

### 7.11 Minimap System
**Small minimap** (bottom-right, 160x160px): Circular, 45° rotated canvas to match isometric camera. Shows player (blue arrow), buildings (orange square), nodes (color-coded icons: tree=green circle, rock=gray rect, berry=red diamond, etc.), animals (red triangle). Updates every 4 frames for performance.

**Full map** (M key toggle): Zoom 0.3x-4x (mouse wheel), pan by dragging. Hover shows entity info. Displays entire explored world. Grid-based rendering with chunk awareness.

### 7.4 Combat
Click animal -> walk to -> auto-combat at 0.5s interval. `damage = max(1, ATK - DEF)` for player, `max(0, ATK - DEF)` for animal. Animal death: loot + respawn. Player death: respawn (8,8), full HP, lose 30% resources.

### 7.5 Building System
Build mode: preview mesh (green/red), grid snap, validation (walkable, no overlap). Upgrade: level-based visual changes (foundation, windows, chimney, stars). Destruction: NPC despawn, tile release, 50% refund.

### 7.6 NPC System
State machine: IDLE -> FIND_NODE -> WALK_TO_NODE -> HARVEST -> WALK_HOME -> DEPOSIT. Building-to-node mapping (8 types): wood_cutter->tree, stone_quarry->rock, berry_gatherer->berry_bush, flint_mine->flint, copper_mine->copper, tin_mine->tin, iron_mine->iron, coal_mine->coal. Processing buildings (smelter, blast_furnace, blacksmith, warehouse, barracks) have workerCount=0 or searchRadius=0.

---

## 8. Content Entities

### Stone Age (30 entities)
| Category | IDs |
|----------|-----|
| Age | `age.stone` |
| Resources | wood, stone, food, flint, tool, leather |
| Nodes | tree, rock, berry_bush, flint_deposit |
| Animals | wolf, boar, bear |
| Buildings | wood_cutter, stone_quarry, berry_gath

### Fire & Light Expansion (4 entities)
| Category | IDs |
|----------|-----|
| Buildings | torch (light radius 6, fuel 40), campfire (light radius 14, fuel 100) |
| Items | handheld_torch (60s duration, light radius 8, consumable) |
| Recipes | handheld_torch (3 wood + 1 flint -> 1 handheld torch) |

**Purpose**: Illuminate night. Torches/campfires require fuel (wood), refillable. Handheld torch auto-depletes, follows player.

### Water Expansion (2 entities)
| Category | IDs |
|----------|-----|
| Buildings | well (produces +1 food/tick), bridge (allows crossing water tiles) |

**Purpose**: Wells provide food production without NPCs. Bridges enable navigation across rivers/lakes.erer, flint_mine, warehouse, barracks |
| Equipment | wooden_sword (+3 ATK), stone_spear (+6 ATK), stone_shield (+3 DEF), leather_armor (+5 DEF, +10 HP), leather_boots (+2 SPD) |
| Recipes | stone_tool, wooden_sword, stone_spear, stone_shield, leather_armor, leather_boots |
| Techs | advanced_tools, efficient_gathering, expanded_storage, swift_workers |

### Bronze Age (17 entities)
| Category | IDs |
|----------|-----|
| Age | `age.bronze` (advance: 10 tools + 50 food + 3 wood_cutter + 2 stone_quarry) |
| Resources | copper, tin, bronze |
| Nodes | copper_deposit, tin_deposit |
| Animals | lion |
| Torch | 5W, 2Fl | Light (R=6) | 0 (fuel: 40, drain 1/tick) |
| Campfire | 20W, 5Fl | Light (R=14) | 0 (fuel: 100, drain 1/tick) |
| Well | 10S, 5W | +1 Food | 0 (passive) |
| Bridge | 15W, 5S | -- | 0 (walkable over water) |
| Buildings | copper_mine, tin_mine, smelter (consumes: 2 copper + 1 tin/tick) |
| Equipment | bronze_sword (+10 ATK), bronze_shield (+6 DEF), bronze_armor (+10 DEF, +20 HP) |
| Recipes | bronze_sword, bronze_shield, bronze_armor |

### Iron Age (20 entities)
| Category | IDs |
|----------|-----|
| Age | `age.iron` (advance: 20 bronze + 100 food + 20 tools + 2 smelter + 2 copper_mine + 1 tin_mine) |
| Resources | iron, coal |
| Nodes | iron_deposit, coal_deposit |
| Animals | bandit, sabertooth |
| Buildings | iron_mine, coal_mine, blast_furnace (refines iron), blacksmith (unlock condition for iron equipment) |
| Equipment | iron_sword (+15 ATK), iron_shield (+10 DEF), iron_armor (+15 DEF, +30 HP), iron_boots (+3 SPD, +3 DEF) |
| Recipes | iron_sword, iron_shield, iron_armor, iron_boots |
| Techs | iron_working, coal_power, fortification |

---

## 9. Balance Quick Reference

### Hunger System

| Config | Value |
|--------|-------|
| Drain per tick | 0.2 |
| Auto-eat threshold | 30 |
| Hungry speed mult | 0.5x (speed halved when hunger < 20) |
| Starving HP drain | 1 HP/tick (when hunger = 0) |
| Food restore | 5 per food consumed |
| Eat duration | 1.0s |
| Eat speed mult | 0.5x (slowed while eating) |
| Regen hunger mult | 2.0x (HP regen requires hunger ≥ regen cost) |

### Day/Night System

| Config | Value |
|--------|-------|
| Tick advance | 0.0667 hours/tick (~24min real-time = 24h game-time at 1x speed) |
| Phases | 14 keyframes (midnight, dawn, noon, dusk, etc.) |
| Fog | Constant (near=35, far=75) - darkness via light intensity only |

### Buildings Summary

| Building | Cost | Produces | Workers |
|----------|------|----------|---------|
| Wood Cutter | 10W | +2 Wood | 1-3 |
| Stone Quarry | 15W, 5S | +1 Stone | 1-3 |
| Berry Gatherer | 8W | +2 Food | 1-3 |
| Flint Mine | 20W, 10S | +1 Flint | 1-3 |
| Warehouse | 40W, 30S | -- | 0 (transfer hub) |
| Barracks | 50W, 40S, 5T | -- | 0 (guards) |
| Copper Mine | 30W, 20S | +1 Copper | 1-2 |

// Hunger
hungerDrain = 0.2/tick (modified by game speed)
when hunger < 20: speed *= 0.5 (hungry penalty)
when hunger = 0: HP -= 1/tick (starvation)
eating: consumes 1 food, restores 5 hunger, takes 1s, slows to 0.5x speed

// Day/Night
timeOfDay += 0.0667 * dt * gameSpeed
darkness = interpolate between phase keyframes (0.0 at noon, 1.0 at midnight)
lights (torches/campfires) intensity *= (1 + darkness * 5) for visibility

// Fire Fuel
fuel -= fuelPerTick (1.0) every tick if lit
light intensity = baseIntensity * fuelRatio * (1 + darkness * multiplier) * flicker
when fuel = 0: light disabled
| Tin Mine | 35W, 25S, 5Cu | +1 Tin | 1-2 |
| Smelter | 40S, 10Cu, 5Sn | +1 Bronze | 1-2 (consumes 2Cu+1Sn) |
| Iron Mine | 50W, 40S, 5Bz | +2 Iron | 2-4 |
| Coal Mine | 45W, 50S, 5Ir | +2 Coal | 2-4 |
| Blast Furnace | 80S, 20Bz, 10Ir | +3 Iron | 2-4 (smelter) |
| Blacksmith | 60W, 50S, 15Ir | -- | 0 (unlock condition) |

### Animals Summary

| Animal | HP | ATK | DEF | Rewards | Respawn |
|--------|----|-----|-----|---------|---------|
| Wolf | 15 | 3 | 1 | +5 Food | 60s |
| Boar | 20 | 5 | 2 | +8 Food, +2 Leather | 90s |
| Bear | 40 | 8 | 3 | +15 Food, +5 Leather | 120s |
| Lion | 60 | 12 | 5 | +25 Food, +8 Leather | 150s |
| Bandit | 80 | 15 | 8 | +30 Food, +10 Leather, +3 Bronze | 180s |
| Sabertooth | 120 | 20 | 10 | +50 Food, +20 Leather | 240s |

### Technologies

| Tech | Cost | Requires | Effect |
|------|------|----------|--------|
| Advanced Tools | 10 Tools, 20 Wood | -- | Harvest speed +20% |
| Efficient Gathering | 30 Food, 15 Stone | Advanced Tools | Production +15% |
| Expanded Storage | 40 Wood, 30 Stone | -- | Storage +30% |
| Swift Workers | 25 Food, 10 Leather | -- | NPC speed +25% |
| Iron Working | 20 Iron, 15 Coal | Efficient Gathering | Production +10% |
| Coal Power | 30 Coal, 15 Iron | Swift Workers | Harvest speed +30% |
| Fortification | 100 Stone, 30 Iron, 20 Bronze | Expanded Storage | Storage +50% |

---

## 10. Key Formulas

```
// Combat
playerAttack = base(1) + weapon.stats.attack
playerDefense = base(0) + offhand.stats.defense + armor.stats.defense
playerMaxHp = base(100) + armor.stats.maxHp
damageDealt = max(1, ATK - DEF)
damageTaken = max(0, ATK - DEF)
combatInterval = 0.5s

// Production (per tick)
production = floor(baseAmount * upgradeMultiplier * (1 + productionBonus)) * buildingCount
consumption = consumeAmount * buildingCount (all-or-nothing)

// Movement
screenDy: W=+1, S=-1 | screenDx: A=-1, D=+1
worldDx = screenDx + screenDy
worldDz = -screenDx + screenDy
normalize, then * speed * dt

// Death Penalty
lose 30% of each resource, respawn at (8,8), full HP

// HP Regen
1 HP per 2 seconds, after 3 seconds out of combat
```

---

## 11. Init Flow (main.js)

```
1. GameRegistry.init() NPCs can get stuck on water tiles.
- **Barracks guards**: `guardCount` and `guardRadius` defined in balance but guard spawning/behavior not yet implemented.
- **Game speed**: Supports 0.25x-5x but no UI controls (console only: `GameState.setGameSpeed(n)`).
- **Water collision**: Player collision with water works, but NPCs don't check water tiles (can walk through).
- **Handheld torch**: Visual follows player but doesn't persist across save/load (recreated with default fuel
4. GameTerrain.init(worldSeed)
5. NPCSystem.init()
6. GamePlayer.init(x, z)
7. GameTerrain.update(x, z) -> generate initial chunks
8. Restore building instances -> create 3D meshes
9. NPCSystem.spawnWorkersForBuilding() x N
10. BuildingSystem.restoreReservations()
11. UnlockSystem.checkAll() x2 (chain deps)
12. GameHUD.init() + renderAll()
13. Mouse/keyboard event handlers
14. Auto-save on beforeunload
```

---

## 12. Expansion Flow

To add new content (e.g., Medieval Age):

1. **Create** `/content/expansion_medieval_age.js` with entities
2. **Add balance entries** to `balance.js` (nodes, animals, buildings, recipes, equipment, age, tech)
3. **Update manifest.js**: add pack name + increment version
4. **Add `<script>`** to index.html after last expansion
5. **Add NPC mapping** in `npcSystem.js:getHarvestNodeType()` if new harvest buildings
6. **Add terrain rules** in `terrain.js` for new nodes/animals if needed
7. **Run validator**: `GameValidator.printReport()` in console

Rules: NEVER edit old packs. ONLY append new ones + balance entries.

---

## 13. Dev Tools API

```js
// Validator
GameValidator.printReport()    // Full validation report in console
GameValidator.validateAll()    // Returns { valid, errors[], warnings[] }

// Generator
GameGenerator.generateNewContent("description")  // Returns { newPack, balancePatch, summary }
GameGenerator.applyGeneratedContent(pack, balancePatch)
GameGenerator.exportPack(pack, balancePatch)

// Preview
GamePreview.preview(packData, balancePatch)
GamePreview.applyPreview()
GamePreview.closePreview()
```

---

## 14. Known Limitations

- **Synergy system**: Wired but no buildings have non-empty `synergyFrom` data. Warehouse description mentions bonus but it's non-functional.
- **NPC pathfinding**: Direct-line only, no obstacle avoidance.
- **Barracks guards**: `guardCount` and `guardRadius` defined in balance but guard spawning/behavior not yet implemented.
- **Game speed**: Supports 0.25x-5x but no UI controls (console only: `GameState.setGameSpeed(n)`).
