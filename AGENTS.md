# Evolution Simulator 3D — Project Reference

## Overview

3D evolution simulator: Stone Age -> Bronze Age -> Iron Age. Browser-only (`index.html`). Three.js for isometric 3D, vanilla JS, no framework.

### Architecture

| Principle | Description |
|-----------|-------------|
| Data-driven | Content defines entities, Balance holds all numbers, Engine reads from both |
| Append-only content | Never edit old packs. Add new packs + increment version |
| Single balance file | Tune entire game via `balance/balance.js` |

---

## Project Structure

```
d:\Source_code\Game_simulator\
|-- index.html                  <- Entry point, HUD skeleton, script loader
|-- main.js                     <- GameActions API + init sequence
|-- style.css                   <- HUD styles (dark theme)
|-- three.min.js                <- Three.js (local bundle)
|
|-- /content                    <- Content packs (append-only, Vietnamese names in fire_light + water)
|   |-- manifest.js             <- Version "2.1.0" + pack list
|   |-- base_stone_age.js       <- Stone Age (30 entities)
|   |-- expansion_bronze_age.js <- Bronze Age (17 entities)
|   |-- expansion_iron_age.js   <- Iron Age (20 entities)
|   |-- expansion_fire_light.js <- Fire & Light (3 entities: campfire, handheld_torch, recipe)
|   |-- expansion_water.js      <- Water (2 entities: well, bridge)
|
|-- /balance
|   |-- balance.js              <- ALL gameplay numbers (nodes, animals, buildings, recipes, equipment, ages, tech)
|
|-- /engine                     <- Logic engine (no 3D dependency)
|   |-- registry.js             <- Merge content + balance -> runtime entities
|   |-- gameState.js            <- Mutable state: resources, player, inventory, instances
|   |-- tickSystem.js           <- Production/consumption ticks, warehouse transfer, passive production
|   |-- craftSystem.js          <- Crafting: input -> output
|   |-- unlockSystem.js         <- Multi-pass unlock (age/resources/buildings/technologies)
|   |-- upgradeSystem.js        <- Per-instance building upgrade
|   |-- researchSystem.js       <- Technology research: prerequisites, global bonuses
|   |-- synergy.js              <- Building proximity bonuses (wired, data pending)
|
|-- /world                      <- 3D Layer (Three.js)
|   |-- scene.js                <- Scene, camera, render loop, lighting, game speed
|   |-- terrain.js              <- Chunk-based infinite world, seeded procedural gen
|   |-- entities.js             <- 3D meshes + animal AI + node respawn
|   |-- player.js               <- Player character, WASD, interaction, HP/hunger/eating
|   |-- combat.js               <- Click-to-attack, 0.5s interval, death penalty
|   |-- buildingSystem.js       <- Build mode preview + placement + upgrade visuals + destruction
|   |-- npcSystem.js            <- NPC workers: IDLE->FIND_NODE->WALK->HARVEST->WALK_HOME->DEPOSIT
|   |-- rangeIndicator.js       <- Visual range indicators (search/transfer radius)
|   |-- dayNightSystem.js       <- 24h day/night cycle with dynamic lighting
|   |-- fireSystem.js           <- Fire & light PointLight management, flicker, fuel drain
|   |-- waterSystem.js          <- Procedural river/lake, movement collision, bridge support
|   |-- minimap.js              <- Circular minimap + full map (M key), fog of war
|   |-- atmosphere.js           <- Stars, moon, clouds, wind, ambient particles
|   |-- animationSystem.js      <- Tween animation engine, screen flash
|   |-- particleSystem.js       <- Particle pool, presets (combat, harvest, fire, leaves)
|   |-- weatherSystem.js        <- Random rain weather events
|
|-- /storage
|   |-- localStorage.js         <- Save/load + version check
|
|-- /ui
|   |-- hud.js                  <- Full HUD: resources, modal (5 tabs), inspector, notifications
|
|-- /dev
|   |-- validate.js             <- Content integrity validator
|   |-- ai_generate.js          <- Content generator stub
|   |-- preview.js              <- Preview generated content
```

### Script Load Order (index.html)

1. Three.js -> Content Layer: manifest -> packs (stone -> bronze -> iron -> fire_light -> water) -> balance
2. Engine Core: registry -> gameState
3. Persistence: localStorage
4. Systems: tickSystem -> craftSystem -> unlockSystem -> upgradeSystem -> synergy -> researchSystem
5. World: scene -> terrain -> entities -> player -> combat -> buildingSystem -> npcSystem -> rangeIndicator -> dayNightSystem -> fireSystem -> waterSystem -> atmosphere -> animationSystem -> particleSystem -> weatherSystem -> minimap
6. UI: hud (MUST load before main.js)
7. Entry: main
8. Dev: validate -> ai_generate -> preview

---

## Data Flow

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

## Entity System

### Entity Types

| Type | Prefix | Example |
|------|--------|---------|
| age | `age.` | `age.stone` |
| resource | `resource.` | `resource.wood` |
| resource_node | `node.` | `node.tree` |
| animal | `animal.` | `animal.wolf` |
| building | `building.` | `building.wood_cutter` |
| equipment | `equipment.` | `equipment.iron_sword` |
| recipe | `recipe.` | `recipe.stone_tool` |
| technology | `tech.` | `tech.advanced_tools` |
| consumable | `item.` | `item.handheld_torch` |

### Content Entity Schema

```js
{
  id: "building.wood_cutter",     // Dot-namespaced ID
  type: "building",
  name: "Wood Cutter",
  description: "Auto-gathers wood.",
  visual: { shape, color, roofColor?, scale? },
  slot: "weapon",                 // equipment only: weapon|offhand|armor|boots
  unlock: {
    age: "age.stone",
    resources?: { "resource.wood": 15 },
    buildings?: { "building.wood_cutter": 1 },
    technologies?: ["tech.advanced_tools"]
  }
}
```

### Balance Schema (key patterns)

```js
// Nodes
"node.tree": { hp, rewards: { "resource.id": amt }, respawnTime }

// Animals
"animal.wolf": { hp, attack, defense, rewards, respawnTime, aggroRange }

// Buildings (all must have: searchRadius, workerCount, storageCapacity, productionSpeed, produces, upgrades)
"building.id": {
  cost, searchRadius: { level: radius }, workerCount: { level: count },
  storageCapacity: { level: capacity }, productionSpeed: { level: speed },
  produces: { "resource.id": amt }, consumesPerSecond?: { "resource.id": amt },
  transferRange?: 5, synergyFrom?: {},
  upgrades: { level: { cost, productionMultiplier } }
}

// Recipes
"recipe.id": { input: {...}, output: {...} }

// Equipment
"equipment.id": { stats: { attack?, defense?, maxHp?, speed? }, slot }

// Ages
"age.id": { startResources, advanceFrom?: { age, resources, buildings } }

// Techs
"tech.id": { researchCost, requires?: ["tech.id"], effects: { productionBonus?, harvestSpeedBonus?, npcSpeedBonus?, storageBonus? } }

// Config (non-namespaced)
hunger: { drainPerSecond, autoEatThreshold, hungrySpeedMult, starvingHpDrain, foodRestore, eatDuration, eatSpeedMult, regenHungerMult }
dayNight: { hoursPerSecond }
```

---

## Game State (`window.GameState`)

```js
{
  resources: {},          // "resource.wood": 10
  buildings: {},          // "building.wood_cutter": 2 (total count)
  unlocked: [],           // Entity IDs unlocked
  researched: [],         // Tech IDs researched
  age: "age.stone",
  player: { hp, maxHp, attack, defense, x, z, speed, equipped: { weapon, offhand, armor, boots } },
  inventory: {},          // "equipment.id": count
  instances: {},          // "uid": { entityId, level, x, z, uid }
  buildingStorage: {},    // "uid": { "resource.id": amt }
  chunks: {}, exploredChunks: {},
  worldSeed: 42,
  fractionalAccumulator: {},
  gameSpeed: 1.0, isPaused: false,
  hunger: 100, maxHunger: 100,
  timeOfDay: 12,
  fireFuel: {},           // "uid": { current, max }
  version: "2.1.0"
}
```

---

## Engine Systems

| System | Global | Purpose |
|--------|--------|---------|
| Registry | `GameRegistry` | Merge content + balance into runtime entities. `getEntity(id)`, `getBalance(id)`, `getEntitiesByType(type)` |
| Tick | `TickSystem` | ~1s production tick: NPC harvest -> building storage, consumption, warehouse transfer, passive production, hunger/fuel drain, auto-save every 5 ticks |
| Craft | `CraftSystem` | Validate unlock + inputs, deduct, add outputs. Prevent duplicate equipment |
| Unlock | `UnlockSystem` | Multi-pass (up to 10) checking: age, resources, buildings, technologies. `getUnlockProgress()` returns progress + details for tooltip |
| Upgrade | `UpgradeSystem` | Per-instance upgrade: check cost, deduct, update level, recreate mesh, respawn NPCs |
| Research | `ResearchSystem` | Check prerequisites, deduct cost, mark researched. `getGlobalBonuses()` accumulates all tech effects |
| Synergy | `SynergySystem` | Proximity bonus (1.5 tiles), diminishing returns after 3. **Currently no buildings have non-empty synergyFrom** |

---

## World Systems

| System | Purpose |
|--------|---------|
| Scene | Orthographic camera at (player+20,20,player+20). Zoom 6-12. Fog 35-75. Render loop via rAF |
| Terrain | 16x16 chunks, render distance 2, seeded procedural gen. Objects spawn by distance + age |
| Entities | 3D meshes + animal wandering AI + node respawn |
| Player | WASD isometric (45 deg). Collision: slide-along-wall. E key interact. HP regen 1/2s after 3s OOC |
| Combat | Click->walk->auto-fight 0.5s interval. dmg=max(1,ATK-DEF). Death: respawn(8,8), -30% resources |
| Building | Build mode preview (green/red), grid snap, upgrade visuals (foundation/windows/chimney), destroy: 50% refund |
| NPC | State machine: IDLE->FIND_NODE->WALK->HARVEST->WALK_HOME->DEPOSIT. 8 building-node mappings |
| Range Indicator | Green rings (searchRadius) + blue rings (transferRange) on building select |
| Day/Night | 24h cycle, 0.0667h/s. 14 keyframe phases. Fog constant, darkness via light intensity |
| Fire | PointLight management: torch(R=6), campfire(R=15), handheld(R=10). Fuel 1/s at night, flicker animation |
| Water | Procedural rivers (sine-wave) + lakes. Deep=block, shallow=slow. Bridge=walkable |
| Minimap | Circular 160x160, 45 deg rotated. Full map M key, 0.3x-4x zoom. Fog of war |
| Atmosphere | Stars (400 points, twinkle), moon + moonlight, clouds (8 groups), wind, falling leaves, fireflies |
| Animation | Tween engine with easing. Screen flash effect |
| Particle | Pool of 250, 12 presets (woodChip, rockDust, spark, combatHit, fireEmber, leafFall, firefly, etc.) |
| Weather | Random rain (25% chance, 60-180s duration). Line-segment rain drops around player |

---

## Content Summary

### Stone Age (30 entities)
| Category | IDs |
|----------|-----|
| Age | `age.stone` |
| Resources | wood, stone, food, flint, tool, leather |
| Nodes | tree, rock, berry_bush, flint_deposit |
| Animals | wolf, boar, bear |
| Buildings | wood_cutter, stone_quarry, berry_gatherer, flint_mine, warehouse, barracks |
| Equipment | wooden_sword(+3ATK), stone_spear(+6ATK), stone_shield(+3DEF), leather_armor(+5DEF+10HP), leather_boots(+2SPD) |
| Recipes | stone_tool, wooden_sword, stone_spear, stone_shield, leather_armor, leather_boots |
| Techs | advanced_tools(harvest+20%), efficient_gathering(prod+15%), expanded_storage(storage+30%), swift_workers(npc+25%) |

### Bronze Age (17 entities)
| Category | IDs |
|----------|-----|
| Age | `age.bronze` (advance: 10 tools + 50 food + 3 wood_cutter + 2 stone_quarry) |
| Resources | copper, tin, bronze |
| Nodes | copper_deposit, tin_deposit |
| Animals | lion |
| Buildings | copper_mine, tin_mine, smelter (consumes 2Cu+1Sn/s) |
| Equipment | bronze_sword(+10ATK), bronze_shield(+6DEF), bronze_armor(+10DEF+20HP) |
| Recipes | bronze_sword, bronze_shield, bronze_armor |

### Iron Age (20 entities)
| Category | IDs |
|----------|-----|
| Age | `age.iron` (advance: 20 bronze + 100 food + 20 tools + 2 smelter + 2 copper_mine + 1 tin_mine) |
| Resources | iron, coal |
| Nodes | iron_deposit, coal_deposit |
| Animals | bandit, sabertooth |
| Buildings | iron_mine, coal_mine, blast_furnace(+3 iron/s), blacksmith(unlock condition) |
| Equipment | iron_sword(+15ATK), iron_shield(+10DEF), iron_armor(+15DEF+30HP), iron_boots(+3SPD+3DEF) |
| Recipes | iron_sword, iron_shield, iron_armor, iron_boots |
| Techs | iron_working(prod+10%), coal_power(harvest+30%), fortification(storage+50%) |

### Fire & Light (3 entities)
| Category | IDs |
|----------|-----|
| Buildings | campfire (light R=15, fuel=100, 1/s at night) |
| Items | handheld_torch (60s, light R=10) |
| Recipes | handheld_torch (3 wood + 1 flint) |

### Water (2 entities)
| Category | IDs |
|----------|-----|
| Buildings | well (+1 food/s passive), bridge (walkable over water) |

---

## Key Formulas

```
// Combat
playerAttack = 1 + weapon.stats.attack
playerDefense = 0 + offhand.stats.defense + armor.stats.defense
playerMaxHp = 100 + armor.stats.maxHp
damageDealt = max(1, ATK - DEF)   damageTaken = max(0, ATK - DEF)

// Production (per tick)
production = baseAmount * upgradeMultiplier * productionSpeed * (1 + synergyBonus + globalResearchBonus)

// Movement (isometric)
worldDx = screenDx + screenDy    worldDz = -screenDx + screenDy    (W=+1,S=-1,A=-1,D=+1)

// Hunger
drain = 0.2/s, auto-eat at <30, speed*0.5 when <20, -1HP/s at 0, food restores 5

// Death
lose 30% resources, respawn at (8,8), full HP
```

---

## Init Flow (main.js)

```
1. GameRegistry.init()
2. GameStorage.checkVersion() -> load or GameState.init()
3. GameScene.init()
4. GameTerrain.init(worldSeed)
5. NPCSystem.init(), GamePlayer.init(x,z)
6. GameTerrain.update() -> generate chunks
7. Restore building instances -> create 3D meshes -> spawn NPCs
8. BuildingSystem.restoreReservations()
9. DayNightSystem.init() + FireSystem + Atmosphere + Particle + Weather + MiniMap
10. UnlockSystem.checkAll() x2
11. GameHUD.init() + renderAll()
12. Mouse/keyboard handlers
13. Auto-save on beforeunload
```

---

## Adding New Content

1. Create `/content/expansion_xxx.js` with entities
2. Add balance entries to `balance/balance.js`
3. Update `manifest.js`: add pack + increment version
4. Add `<script>` to `index.html` after last expansion
5. Add NPC mapping in `npcSystem.js` if new harvest buildings
6. Add terrain rules in `terrain.js` for new nodes/animals
7. Run `GameValidator.printReport()` in console

---

## Known Limitations

- **Synergy**: Wired but no buildings have non-empty `synergyFrom`
- **Barracks guards**: `guardCount`/`guardRadius` in balance but behavior not implemented
- **NPC pathfinding**: Direct-line only, no obstacle avoidance, can walk through water
- **NPC water collision**: NPCs don't check water tiles
- **Game speed**: 0.25x-5x via console only (`GameState.setGameSpeed(n)`), no UI
- **Warehouse bonus**: Content description says "+15%" but no synergy data exists
