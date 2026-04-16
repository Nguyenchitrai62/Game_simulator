# Evolution Simulator 3D — Agent Quick Reference

## Overview

- Browser-only 3D survival / settlement simulator using vanilla JS globals and local `three.min.js`.
- No bundler, no framework, no build step. Runtime entry is `index.html`.
- Current content version: `3.0.0` from `content/manifest.js`.
- Age progression: Stone Age -> Bronze Age -> Iron Age.

## Fast Context Start

- Open `index.html` first if you need the authoritative runtime script order or HUD root DOM nodes.
- Open `content/*.js` and `balance/balance.js` first for nearly all gameplay/content changes; prefer data edits over runtime special cases.
- Open `engine/registry.js` when content appears missing at runtime; it is the merge layer between content and balance.
- Open `engine/gameState.js` and `storage/localStorage.js` for save data, new-game defaults, legacy compatibility, and persisted runtime state.
- Open `world/terrain.js` and `world/entities.js` for node spawning, respawn relocation, chunk persistence, and mesh refresh problems.
- Open `world/buildingSystem.js`, `world/npcSystem.js`, and `engine/tickSystem.js` for buildings, workers, farm plots, and automated production loops.
- Open `ui/hud.js`, `style.css`, and `index.html` together for any HUD, modal, quickbar, inspector, or notification work.
- Open `main.js` for boot flow and `GameActions` glue between systems.

## Core Architecture

- `content/*.js` defines entities, names, visuals, and unlock metadata.
- `balance/balance.js` defines gameplay numbers, recipes, stats, node configs, and progression thresholds.
- `engine/registry.js` merges content + balance. Prefer changing content/balance, not runtime lookups.
- Runtime is global-object based. Script order matters and there is no module isolation.

## Script Load Order

1. `three.min.js`
2. Content packs + `balance/balance.js`
3. `engine/registry.js`, `engine/gameState.js`
4. `storage/localStorage.js`
5. Engine systems: tick, craft, unlock, upgrade, synergy, research
6. World systems: scene -> terrain -> entities -> player -> combat -> building -> npc -> range/day-night/fire/water/atmosphere/animation/particle/weather/minimap
7. `ui/hud.js`
8. `main.js`

`ui/hud.js` must stay before `main.js`.

## Repository Structure

```text
Game_simulator/
|- index.html                    DOM shell + runtime script order
|- main.js                       boot flow + GameActions
|- style.css                     HUD and overlay styling
|- three.min.js                  local Three.js bundle
|- AGENTS.md                     quick project handoff for future agents
|- balance/
|  |- balance.js                 gameplay numbers, recipes, node config, progression thresholds
|- content/
|  |- manifest.js                content version + pack load list
|  |- base_stone_age.js          core Stone Age entities, recipes, techs, buildings
|  |- expansion_bronze_age.js    Bronze Age entities and unlocks
|  |- expansion_fire_light.js    fire and light content
|  |- expansion_iron_age.js      Iron Age entities and unlocks
|  |- expansion_water.js         Well and Bridge content
|- engine/
|  |- registry.js                merge layer for content + balance lookups
|  |- gameState.js               live save state, inventory, instances, chunk persistence
|  |- craftSystem.js             crafting and crafted-equipment auto-equip logic
|  |- tickSystem.js              per-second gameplay loop, farming progress, hunger, storage flow
|  |- unlockSystem.js            unlock resolution and legacy-only filtering
|  |- upgradeSystem.js           building upgrade costs and application
|  |- researchSystem.js          technology research and global bonuses
|  |- synergy.js                 proximity bonus logic
|- storage/
|  |- localStorage.js            save/load/export/import/version handling
|- ui/
|  |- hud.js                     HUD, modal tabs, inspector, notifications, quickbar, tracker
|- world/
|  |- scene.js                   scene, camera, render loop, per-frame HUD hooks
|  |- terrain.js                 chunk generation, node runtime state, respawn relocation, walkability
|  |- entities.js                object meshes, NPC meshes, mesh refresh/hide/show
|  |- player.js                  movement, interactions, harvesting, equipment visuals
|  |- combat.js                  combat targeting and combat loop
|  |- buildingSystem.js          placement, special building meshes, building refresh
|  |- npcSystem.js               worker AI, harvesting, farm support, deposit flow
|  |- dayNightSystem.js          time progression, clock, lighting
|  |- fireSystem.js              fire lights, fuel visuals, refuel interactions
|  |- waterSystem.js             rivers, lakes, shallow/deep water, bridge traversal
|  |- minimap.js                 minimap and full world map
|  |- rangeIndicator.js          building radius rings
|  |- atmosphere.js              stars, clouds, wind targets
|  |- animationSystem.js         tweens, flashes, simple animation helpers
|  |- particleSystem.js          pooled particles
|  |- weatherSystem.js           rain and weather state
|- dev/
|  |- validate.js                optional validator, not loaded by release runtime
```

## Task Routing

- Add or rename content, visuals, unlock rules: `content/*.js` first, then `balance/balance.js` if costs/stats/rewards also change.
- Tune gameplay numbers, recipes, age thresholds, node variants, harvest rewards: `balance/balance.js`.
- Debug a content item that exists in data but not in runtime: `engine/registry.js`, then the relevant caller.
- Change save defaults, migration behavior, or persisted fields: `engine/gameState.js` and `storage/localStorage.js`.
- Change new-game starting time or lighting flow: `engine/gameState.js` and `world/dayNightSystem.js`.
- Change resource spawn, harvestability, regrowth, or chunk save/load: `world/terrain.js`, `world/entities.js`, `world/player.js`.
- Change worker behavior, resident house logic, or farm plot automation: `world/npcSystem.js`, `engine/tickSystem.js`, `world/buildingSystem.js`, `main.js`.
- Change building placement, preview meshes, or special 3D shapes: `world/buildingSystem.js`.
- Change HUD, modal surfaces, quickbar, inspector, notifications, or contextual prompts: `ui/hud.js`, `style.css`, `index.html`, sometimes `world/player.js`.
- Change minimap/world map/range visuals: `world/minimap.js`, `world/rangeIndicator.js`, `world/scene.js`.
- Investigate runtime boot/order problems: `index.html` first, then follow the load-order section below.

## Current Release Snapshot

- Runtime does not load dev helper scripts.
- `feature.md` and `manual.md` are removed from the release workspace.
- `dev/validate.js` is kept as optional tooling only.
- New games start at `06:00` instead of noon.

## Current Gameplay Snapshot

- `building.berry_gatherer` is effectively the `Resident House`.
- Resident workers gather `wood`, `stone`, `flint`, and `berries`, and also tend nearby `Farm Plot`s.
- `building.farm_plot` is automatic: residents plant, fetch water, water, harvest, and store output on the plot.
- `building.well` supports nearby farm plots and provides a small passive food income.
- `building.bridge` marks water tiles as traversable.
- Crafted equipment auto-equips if the slot is empty or the new item is stronger than the currently equipped one.

## Resource Node Rules

- Trees use growth stages: sapling -> young -> mature.
- Rocks use size variants: small -> medium -> large -> giant.
- Berry bushes only give food while in the fruiting state.
- Tree / rock giant variants are intentionally rarer in the current release.
- Tree / rock giant variants no longer use glow effects; size is the main visual tell.
- Tree / rock respawns can relocate within the same chunk, so rare-node farming is less predictable.
- Runtime node state must persist through chunk save/load, including variant, stage, timers, and current coordinates.

## Legacy Compatibility

- `building.wood_cutter`, `building.stone_quarry`, and `building.flint_mine` remain in content for old saves.
- Those legacy buildings are hidden from build UI with `hiddenInBuildMenu` and excluded from fresh unlock flow with `legacyOnly`.
- `GameState.getBuildingCount('building.berry_gatherer')` intentionally aggregates old wood / stone / flint buildings for backward compatibility.

## Key Systems

- `GameState`: live save state, inventory, instances, chunk persistence, time-of-day, hunger, equipment.
- `CraftSystem`: crafting, duplicate-equipment prevention, auto-equip upgrade checks.
- `TickSystem`: production, farming progress, hunger, fire fuel, autosave cadence.
- `GameTerrain`: chunk generation, node runtime state, respawn relocation, walkability.
- `GameEntities`: object meshes, NPC meshes, mesh refresh / hide / show.
- `BuildingSystem`: placement, special meshes, farm plot visuals, building refresh.
- `NPCSystem`: resident harvesting, farm tending, storage return flow.
- `DayNightSystem`: lighting, darkness, HUD clock, persisted time-of-day.
- `GameHUD`: resources, quickbar, modal tabs, inspector, notifications, objective tracker.

## HUD / Controls

- `WASD`: move
- `E`: interact / harvest / attack / collect nearby target
- `F`: eat
- `B`: open or close bag / modal
- `M`: toggle world map
- `Tab`: toggle quickbar mode (`Build` / `Craft`)
- `1-9`: use quickbar slot
- `Delete`: destroy hovered building
- `Esc`: cancel build mode, close modal, or close map

HUD layout:

- Top-left: resource bar + objective tracker
- Top-center: HP and hunger
- Top-right: day/night clock
- Bottom-left: compact player stats + notifications
- Bottom-center: quickbar and bag
- Bottom-right: context prompt + minimap
- Right side: building inspector

## Important Runtime State

`window.GameState` stores:

```js
{
  resources,
  buildings,
  unlocked,
  researched,
  techState,
  age,
  player: { hp, maxHp, attack, defense, x, z, speed, equipped },
  inventory,
  instances,
  buildingStorage,
  chunks,
  exploredChunks,
  worldSeed,
  fractionalAccumulator,
  gameSpeed,
  isPaused,
  hunger,
  maxHunger,
  timeOfDay,
  fireFuel,
  version
}
```

Notes:

- Spendable resources include player inventory plus warehouse stock.
- Building state is per-instance via `uid`.
- Farm plot state lives inside instance data (`farmState`).
- Chunk save data must persist node position + state if nodes can relocate on respawn.

## Known Limitations

- Barracks guard / soldier systems are still not implemented.
- NPC pathing is still simple direct-line logic and weak around obstacles / water.
- Synergy system exists but only limited data uses it.
- Game speed is still effectively a console/debug control.
- Some internal comments are still mixed-language even though runtime player-facing text is English.

## Safe Change Rules

1. Preserve global names such as `GameHUD`, `GameActions`, `GameState`, `BuildingSystem`, `NPCSystem`.
2. When changing UI, verify `index.html`, `style.css`, and `ui/hud.js` together.
3. When changing buildings or unlocks, verify both `content/*.js` and `balance/balance.js`.
4. When changing node respawn / save logic, verify both `world/terrain.js` and `world/entities.js`.
5. Do not reorder scripts casually.
6. Keep release runtime free of dev-only script tags.

## Quick Validation

- Syntax check edited JS files with `node --check path/to/file.js`.
- Use workspace diagnostics after edits.
- If content integrity needs a manual check during development, temporarily load `dev/validate.js` and run `GameValidator.printReport()` in the browser console.
