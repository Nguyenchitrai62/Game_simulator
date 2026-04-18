# Evolution Simulator 3D — Agent Quick Reference

## Overview

- Browser-only 3D survival / settlement simulator using vanilla JS globals and local `three.min.js`.
- No bundler, no framework, no build step. Runtime entry is `index.html`.
- Game title: **Evolution Simulator 3D**. Git release tag: `v3.3.1`. Content manifest version: `1.0.1`.
- Age progression: Stone Age → Bronze Age → Iron Age.
- Background music: `asset/Chibi.mp3` (volume 0.4, plays on first user gesture).
- Favicon: `asset/LOGO.png`.

## Fast Context Start

- Open `index.html` first for authoritative runtime script order and HUD DOM nodes.
- Open `content/*.js` and `balance/balance.js` for nearly all gameplay/content changes; prefer data edits over runtime special cases.
- Open `engine/registry.js` when content appears missing at runtime or prey/threat classification looks wrong.
- Open `engine/gameState.js` and `storage/localStorage.js` for save data, new-game defaults, legacy compatibility, fire fuel, and persisted per-instance state.
- Open `world/terrain.js` and `world/entities.js` for node spawning, predator zones, prey/threat behavior, respawn relocation, chunk persistence, and mesh refresh problems.
- Open `world/buildingSystem.js`, `world/npcSystem.js`, `world/barracksTroopSystem.js`, `engine/tickSystem.js`, and `main.js` together for buildings, workers, farm plots, barracks queues, watchtower defense, and automated production loops.
- Open `world/fireSystem.js` and `world/rangeIndicator.js` for campfire coverage checks, active-light rules, and placement/selection range visuals.
- Open `world/minimap.js`, `world/terrain.js`, and `ui/hud.js` together for danger overlays, coverage rings, settlement alerts, and world-map readability work.
- Open `ui/hud.js`, `style.css`, and `index.html` together for any HUD, modal surfaces, quickbar, inspector, notification, or objective-tracker changes.
- Open `engine/qualitySettings.js` for quality preset config (high/medium/low). It is consumed by `scene.js`, `minimap.js`, `weatherSystem.js`, `synergy.js`, and `hud.js`.
- Open `engine/spatialIndex.js` for spatial grid queries used by watchtower defense, NPC threat detection, and worker proximity lookups.

## Core Architecture

- `content/*.js` defines entities, names, visuals, and unlock metadata.
- `balance/balance.js` defines gameplay numbers, recipes, stats, node configs, animal disposition, and progression thresholds.
- `engine/registry.js` merges content + balance and exposes helpers like prey/threat lookup. Prefer changing content/balance, not runtime lookups.
- Runtime is global-object based. Script order matters — there is no module isolation.
- Per-instance building state is stored directly on building instances inside `GameState`, including `farmState`, `barracksState`, and `watchtowerState`.
- Quality preset is persisted to `localStorage` under key `evolution_quality_settings_v1`; defaults to `low`.

## Script Load Order

1. `three.min.js`
2. Content packs: `manifest.js`, `base_stone_age`, `expansion_tree_farming`, `expansion_bronze_age`, `expansion_iron_age`, `expansion_fire_light`, `expansion_water`, `expansion_military_defense`, `expansion_hunt_prey`
3. `balance/balance.js`
4. `engine/registry.js`, `engine/gameState.js`
5. `engine/perfMonitor.js`, `engine/qualitySettings.js`, `engine/spatialIndex.js`
6. `storage/localStorage.js`
7. Engine systems: `tickSystem`, `craftSystem`, `unlockSystem`, `upgradeSystem`, `synergy`, `researchSystem`
8. World systems: `scene` → `terrain` → `entities` → `player` → `combat` → `buildingSystem` → `npcSystem` → `barracksTroopSystem` → `rangeIndicator` → `dayNightSystem` → `fireSystem` → `waterSystem` → `atmosphere` → `animationSystem` → `particleSystem` → `weatherSystem` → `minimap`
9. `ui/hud.js`
10. `main.js`
11. Audio bootstrap inline script (auto-play on first gesture)

`ui/hud.js` **must** stay before `main.js`. Do not reorder scripts casually.

## Repository Structure

```text
Game_simulator/
|- index.html                        DOM shell + runtime script order
|- main.js                           boot flow + GameActions + settlement / military helpers
|- style.css                         HUD and overlay styling
|- three.min.js                      local Three.js bundle
|- AGENTS.md                         quick project handoff for future agents
|- feature.md                        feature checklist / implementation status
|- manual.md                         manual gameplay verification checklist
|- asset/
|  |- LOGO.png                       favicon
|  |- Chibi.mp3                      background music (loop, vol 0.4)
|- balance/
|  |- balance.js                     gameplay numbers, recipes, node config, animal rules, thresholds
|- content/
|  |- manifest.js                    content version (1.0.1) + pack load list
|  |- base_stone_age.js              core Stone Age entities, recipes, techs, barracks entity
|  |- expansion_tree_farming.js      tree nursery / renewable wood content
|  |- expansion_bronze_age.js        Bronze Age entities and unlocks
|  |- expansion_iron_age.js          Iron Age entities and unlocks
|  |- expansion_fire_light.js        fire and light content
|  |- expansion_water.js             Well and Bridge content
|  |- expansion_military_defense.js  Watchtower content pack
|  |- expansion_hunt_prey.js         Deer / Rabbit prey content pack
|- engine/
|  |- registry.js                    merge layer for content + balance lookups
|  |- gameState.js                   live save state, inventory, instances, chunk persistence
|  |- perfMonitor.js                 FPS tracking and performance metrics (GamePerf)
|  |- qualitySettings.js             quality presets: high / medium / low (GameQualitySettings)
|  |- spatialIndex.js                spatial grid for fast instance/worker/threat queries (GameSpatialIndex)
|  |- tickSystem.js                  per-second gameplay loop, farming, barracks training, watchtower defense
|  |- craftSystem.js                 crafting and crafted-equipment auto-equip logic
|  |- unlockSystem.js                unlock resolution and legacy-only filtering
|  |- upgradeSystem.js               building upgrade costs and application
|  |- researchSystem.js              technology research and global bonuses
|  |- synergy.js                     proximity bonus logic
|- storage/
|  |- localStorage.js                save/load/export/import/version handling
|- ui/
|  |- hud.js                         HUD, modal tabs, inspector, notifications, quickbar, tracker
|- world/
|  |- scene.js                       scene, camera, render loop, adaptive pixel ratio, per-frame HUD hooks
|  |- terrain.js                     chunk generation, predator zones, node runtime state, respawn relocation
|  |- entities.js                    object/NPC meshes, prey/threat behavior, mesh refresh / hide / show
|  |- player.js                      movement, interactions, harvesting, context prompts, equipment visuals
|  |- combat.js                      combat targeting and combat loop
|  |- buildingSystem.js              placement, special building meshes, watchtower mesh, building refresh
|  |- npcSystem.js                   worker AI, harvesting, farm support, night-light pause, threat state
|  |- barracksTroopSystem.js         barracks reserve-unit visuals and troop logic
|  |- rangeIndicator.js              building radius rings + placement preview ranges
|  |- dayNightSystem.js              time progression, clock, lighting
|  |- fireSystem.js                  fire lights, active-light coverage checks, refuel interactions
|  |- waterSystem.js                 rivers, lakes, shallow/deep water, bridge traversal
|  |- minimap.js                     minimap, full world map, danger overlays, coverage rings
|  |- atmosphere.js                  stars, clouds, wind targets
|  |- animationSystem.js             tweens, flashes, simple animation helpers
|  |- particleSystem.js              pooled particles
|  |- weatherSystem.js               rain and weather state
|- dev/
|  |- validate.js                    optional validator — NOT loaded by release runtime
```

## Task Routing

- Add/rename content, visuals, unlock rules → `content/*.js` first, then `balance/balance.js` if costs/stats also change.
- Tune gameplay numbers, recipes, age thresholds, node variants, harvest rewards, animal disposition, building ranges → `balance/balance.js`.
- Debug a content item that exists in data but not in runtime → `engine/registry.js`, then the relevant caller.
- Change save defaults, migration behavior, or persisted fields → `engine/gameState.js` and `storage/localStorage.js`.
- Change barracks queues, reserve counts, watchtower status surfaces, settlement summary → `main.js`, `engine/gameState.js`, `engine/tickSystem.js`, `ui/hud.js`.
- Change watchtower combat, loot flow, reserve-support math → `engine/tickSystem.js`, `main.js`, `balance/balance.js`, `ui/hud.js`.
- Change night-work pauses, active light rules, campfire coverage messaging → `world/fireSystem.js`, `world/npcSystem.js`, `main.js`, `ui/hud.js`, `world/rangeIndicator.js`.
- Change resource spawn, prey/threat behavior, predator zones, regrowth, chunk save/load → `world/terrain.js`, `world/entities.js`, `engine/registry.js`, `world/player.js`.
- Change worker behavior, resident house logic, tree nursery, farm automation → `world/npcSystem.js`, `engine/tickSystem.js`, `world/buildingSystem.js`, `main.js`.
- Change building placement, preview meshes, or special 3D shapes → `world/buildingSystem.js`.
- Change HUD, modal surfaces, objective tracker, inspector, notifications, contextual prompts → `ui/hud.js`, `style.css`, `index.html`, sometimes `main.js` and `world/player.js`.
- Change minimap/world map danger, hover info, or coverage visuals → `world/minimap.js`, `world/rangeIndicator.js`, `world/terrain.js`, `ui/hud.js`.
- Change quality presets or performance config → `engine/qualitySettings.js`; check consumers: `scene.js`, `minimap.js`, `weatherSystem.js`, `synergy.js`, `hud.js`.
- Change spatial query behavior (watchtower radius, NPC detection, threat grid) → `engine/spatialIndex.js`, `engine/tickSystem.js`, `world/npcSystem.js`.
- Investigate runtime boot/order problems → `index.html` first, then follow the load-order section above.

## Current Gameplay Snapshot

- `building.berry_gatherer` is the **Resident House**: workers gather `wood`, `stone`, `flint`, and `berries`, and tend nearby Farm Plots and Tree Nursery plots when eligible.
- `building.farm_plot` is automatic: residents plant, fetch water, water, harvest, and store output on the plot.
- `building.well` supports nearby farm plots and provides a small passive food income.
- `building.bridge` marks water tiles as traversable.
- At night, workers stop outside active campfire light. `FireSystem.getLightCoverageAt()` is the shared source of truth for all night-light checks.
- `building.barracks` trains reserve units per instance. Level 1: Swordsman. Level 2: adds Archer training, larger queue/reserve capacity, faster training.
- `building.watchtower` auto-attacks nearby threat animals, tracks shots/kills/cooldown, and receives reserve-support bonuses from nearby barracks.
- `animal.deer` and `animal.rabbit` are prey: they flee and do not attack.
- Wolves, boars, bears, lions, bandits, and sabertooths are threats.
- Predator zones increase dangerous animal spawns in a chunk and feed minimap/world-map danger overlays.
- Objective tracker includes settlement alerts for shortages, night-light gaps, worker danger, and military status.
- Crafted equipment auto-equips if the slot is empty or the new item is stronger than the currently equipped one.
- New games start at `06:00`.

## Quality Settings System

`GameQualitySettings` (engine/qualitySettings.js) provides three presets:

| Preset | Shadow | Rain drops | Particles | Atmosphere | Default |
|--------|--------|------------|-----------|------------|---------|
| high   | 2048   | 720        | on        | on         |         |
| medium | off    | 420        | on        | on         | ✓       |
| low    | off    | 120        | off       | off        |         |

- Persists to `localStorage` (`evolution_quality_settings_v1`).
- Exposes: `applyPreset(id)`, `getPresetId()`, `getCurrentPreset()`, `getRuntimeConfig()`, `getConfigValue(path, fallback)`, `subscribe(fn)`.
- Toggled via the **Setting** button (F9) in the top-right performance panel.
- Subscribers (scene, minimap, weather, synergy) receive change events via pub/sub.

## Spatial Index System

`GameSpatialIndex` (engine/spatialIndex.js) provides fast spatial grid queries with cell size 4 units:

- `getNearbyInstances(x, z, radius, opts)` — building instances (static grid, rebuilt on dirty flag)
- `getNearbyWorkers(x, z, radius, opts)` — NPCs (dynamic, 120 ms TTL)
- `getThreatAnimalsInRadius(x, z, radius, opts)` — threat animals only (dynamic, 120 ms TTL)
- `getThreatAnimalsForChunk(cx, cz, chunkSize)` — all threats within a chunk boundary
- `markInstancesDirty()`, `markWorkersDirty()`, `markThreatAnimalsDirty()`, `markAllDirty()` — invalidate grids
- Reports metrics to `GamePerf`: `spatial.instances`, `spatial.workers`, `spatial.threats`

## Resource And Threat Rules

- Trees: sapling → young → mature (growth stages).
- Rocks: small → medium → large → giant (size variants). Giant variants are intentionally rare.
- Berry bushes: 3 harvestable fruit levels; harvesting removes the bush until it respawns and regrows.
- Tree/rock giant variants do not use glow effects; size is the main visual tell.
- Tree/rock respawns can relocate within the same chunk, so rare-node farming is less predictable.
- Threat vs prey is driven by `GameRegistry.getAnimalDisposition()` and balance data, not mesh type.
- Watchtowers target threat animals only; they never attack prey.
- Chunk save data must persist node position + runtime state if nodes can relocate on respawn.
- Chunk data can carry `predatorZone` metadata for danger overlays and hover text.

## Legacy Compatibility

- `building.wood_cutter`, `building.stone_quarry`, and `building.flint_mine` remain in content for old saves.
- Those buildings are hidden from the build UI (`hiddenInBuildMenu`) and excluded from fresh unlock flow (`legacyOnly`).
- `GameState.getBuildingCount('building.berry_gatherer')` intentionally aggregates legacy buildings for backward compatibility.

## Key Systems

| Global | File | Role |
|--------|------|------|
| `GameState` | engine/gameState.js | Live save state, inventory, instances, chunks, time, hunger, equipment, fire fuel |
| `GameRegistry` | engine/registry.js | Content + balance merge, prey/threat helpers |
| `CraftSystem` | engine/craftSystem.js | Crafting, duplicate-equipment prevention, auto-equip |
| `TickSystem` | engine/tickSystem.js | Per-second loop: production, farming, barracks, watchtower, hunger, fire fuel, autosave |
| `GamePerf` | engine/perfMonitor.js | FPS tracking, performance metrics, perf value reporting |
| `GameQualitySettings` | engine/qualitySettings.js | Quality presets, pub/sub config broadcast, localStorage persistence |
| `GameSpatialIndex` | engine/spatialIndex.js | Spatial grid: instances, workers, threat animals |
| `GameTerrain` | world/terrain.js | Chunk generation, predator zones, node state, respawn relocation, walkability |
| `GameEntities` | world/entities.js | Object/NPC meshes, prey/threat movement, flee/chase, mesh refresh |
| `BuildingSystem` | world/buildingSystem.js | Placement, special meshes, farm plot visuals, range-preview hooks |
| `NPCSystem` | world/npcSystem.js | Worker AI, farm tending, night-light pauses, threat reporting, storage return |
| `BarracksTroopSystem` | world/barracksTroopSystem.js | Reserve-unit visuals and troop render logic |
| `FireSystem` | world/fireSystem.js | Fire lights, fuel handling, active-light coverage queries |
| `MiniMap` | world/minimap.js | Minimap, full world map, danger overlays, coverage rings |
| `DayNightSystem` | world/dayNightSystem.js | Lighting, darkness, HUD clock, persisted time-of-day |
| `GameHUD` | ui/hud.js | Resources, quickbar, modal tabs, inspector, notifications, objective tracker, quality UI |
| `GameActions` | main.js | Boot glue, barracks/watchtower inspector data, queue actions, settlement-summary helpers |

## HUD / Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| E | Interact / harvest / attack / collect |
| F | Eat |
| B | Open/close bag/modal |
| M | Toggle world map |
| Tab | Toggle quickbar mode (Build / Craft) |
| 1–9 | Use quickbar slot |
| Delete | Destroy hovered building |
| Esc | Cancel build mode / close modal / close map |
| F9 | Toggle quality settings panel |

HUD layout:
- Top-left: resource bar + objective tracker
- Top-center: HP and hunger bars
- Top-right: day/night clock + FPS panel + Setting button (F9)
- Bottom-left: compact player stats (ATK/DEF/SPD) + notifications
- Bottom-center: quickbar and bag button
- Bottom-right: context prompt + minimap
- Right side: building inspector

## Important Runtime State

`window.GameState` stores:

```js
{
  resources, buildings, unlocked, researched, techState, age,
  player: { hp, maxHp, attack, defense, x, z, speed, equipped },
  inventory, instances, buildingStorage,
  chunks, exploredChunks, worldSeed,
  fractionalAccumulator, gameSpeed, isPaused,
  hunger, maxHunger, timeOfDay, fireFuel, version
}
```

Key notes:
- Spendable resources = player inventory + warehouse stock only.
- Non-warehouse building storage is not spendable by default. Watchtower loot sits in tower storage until manually collected.
- Building state is per-instance via `uid`. `farmState`, `barracksState`, and `watchtowerState` live inside instance data.
- `fireFuel` is stored separately from instance data.
- Chunk save data must persist node position + state if nodes can relocate on respawn.
- Chunk data can include `predatorZone` metadata.

## Feature Status Summary

Based on `feature.md` (feature tracking document):

- **Done (~24)**: Resource nodes, growth/size stages, farm plot loop, tree nursery, warehouse, basic combat, minimap resource hotspots, HUD compactness, objective tracker.
- **In test (~27)**: Berry bush states, night-light worker pause (F17–F19), watchtower defense (F21, F39, F62), barracks training queue (F22–F23, F32–F33, F35), prey vs threat distinction (F43–F45), predator zones/minimap danger (F47, F53), settlement alerts (F57–F59), inspector displays (F60–F62).
- **Todo (~30)**: Player weapon switching (F25–F30), boss encounters (F48–F49), controllable soldiers (F36–F38, F40), armory, boss zones, abandoned camps.

## Known Limitations

- Barracks units are abstract reserve counters. Individually controllable soldiers/formations are not implemented.
- Watchtower loot does not auto-transfer to warehouses (warehouse auto-transfer only processes worker production buildings).
- Watchtower reserve-support boosts real combat stats beyond the base defense radius, but range overlays still show base radius only.
- NPC pathing is direct-line only — weak around obstacles and water.
- Synergy system exists but only limited balance data uses it.
- Game speed is effectively a console/debug control only.
- Some internal comments remain mixed-language (English player-facing text is the standard).
- Player weapon switching (sword vs bow) is not yet implemented.

## Safe Change Rules

1. Preserve global names: `GameHUD`, `GameActions`, `GameState`, `BuildingSystem`, `NPCSystem`, `GameQualitySettings`, `GameSpatialIndex`, `GamePerf`.
2. When changing UI: verify `index.html`, `style.css`, and `ui/hud.js` together.
3. When changing buildings or unlocks: verify both `content/*.js` and `balance/balance.js`.
4. When changing node respawn/save logic: verify both `world/terrain.js` and `world/entities.js`.
5. When changing barracks/watchtower behavior: verify `main.js`, `engine/tickSystem.js`, `engine/gameState.js`, `ui/hud.js`, and related content/balance entries.
6. When changing night-work or light-coverage behavior: verify `world/fireSystem.js`, `world/npcSystem.js`, `ui/hud.js`, `world/rangeIndicator.js`, and `world/minimap.js`.
7. When changing prey/threat rules or predator zones: verify `engine/registry.js`, `world/entities.js`, `world/terrain.js`, `world/minimap.js`, and `world/player.js`.
8. When changing quality presets: verify `engine/qualitySettings.js` and all subscriber files (`scene.js`, `minimap.js`, `weatherSystem.js`, `synergy.js`, `hud.js`).
9. When changing spatial queries: verify `engine/spatialIndex.js`, `engine/tickSystem.js`, and `world/npcSystem.js`.
10. Do not reorder scripts casually.
11. Keep release runtime free of dev-only script tags.

## Quick Validation

```bash
# Syntax check any edited JS file
node --check path/to/file.js
```

- Use workspace diagnostics after edits.
- For gameplay/UI changes: walk through `manual.md`, especially the night-light, barracks, watchtower, prey/threat, minimap danger, and save/load sections.
- If content integrity needs a manual check during development, temporarily load `dev/validate.js` and run `GameValidator.printReport()` in the browser console.
- `dev/validate.js` is **never** loaded in the release runtime.
