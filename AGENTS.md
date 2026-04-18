# Evolution Simulator 3D — Agent Quick Reference

## Overview

- Browser-only 3D survival / settlement simulator using vanilla JS globals and local `three.min.js`.
- No bundler, no framework, no build step. Runtime entry is `index.html`.
- Current content version: `3.3.0` from `content/manifest.js`.
- Current manifest packs: `base_stone_age`, `expansion_tree_farming`, `expansion_bronze_age`, `expansion_iron_age`, `expansion_fire_light`, `expansion_water`, `expansion_military_defense`, `expansion_hunt_prey`.
- Age progression: Stone Age -> Bronze Age -> Iron Age.

## Fast Context Start

- Open `index.html` first if you need the authoritative runtime script order or HUD root DOM nodes.
- Open `content/*.js` and `balance/balance.js` first for nearly all gameplay/content changes; prefer data edits over runtime special cases.
- Open `engine/registry.js` when content appears missing at runtime or prey / threat classification looks wrong.
- Open `engine/gameState.js` and `storage/localStorage.js` for save data, new-game defaults, legacy compatibility, fire fuel, and persisted per-instance state.
- Open `world/terrain.js` and `world/entities.js` for node spawning, predator zones, prey / threat behavior, respawn relocation, chunk persistence, and mesh refresh problems.
- Open `world/buildingSystem.js`, `world/npcSystem.js`, `engine/tickSystem.js`, and `main.js` together for buildings, workers, farm plots, barracks queues, watchtower defense, and automated production loops.
- Open `world/fireSystem.js` and `world/rangeIndicator.js` for campfire coverage checks, active-light rules, and placement / selection range visuals.
- Open `world/minimap.js`, `world/terrain.js`, and `ui/hud.js` together for danger overlays, coverage rings, settlement alerts, and world-map readability work.
- Open `ui/hud.js`, `style.css`, and `index.html` together for any HUD, modal surfaces, quickbar, inspector, notification, or objective-tracker changes.

## Core Architecture

- `content/*.js` defines entities, names, visuals, and unlock metadata.
- `balance/balance.js` defines gameplay numbers, recipes, stats, node configs, animal disposition, and progression thresholds.
- `engine/registry.js` merges content + balance and exposes helpers like prey / threat lookup. Prefer changing content / balance, not runtime lookups.
- Runtime is global-object based. Script order matters and there is no module isolation.
- Per-instance building state is stored directly on building instances inside `GameState`, including `farmState`, `barracksState`, and `watchtowerState`.

## Script Load Order

1. `three.min.js`
2. Content packs in this order: `base_stone_age`, `expansion_tree_farming`, `expansion_bronze_age`, `expansion_iron_age`, `expansion_fire_light`, `expansion_water`, `expansion_military_defense`, `expansion_hunt_prey`
3. `balance/balance.js`
4. `engine/registry.js`, `engine/gameState.js`
5. `storage/localStorage.js`
6. Engine systems: tick, craft, unlock, upgrade, synergy, research
7. World systems: scene -> terrain -> entities -> player -> combat -> building -> npc -> range/day-night/fire/water/atmosphere/animation/particle/weather/minimap
8. `ui/hud.js`
9. `main.js`

`ui/hud.js` must stay before `main.js`.

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
|- balance/
|  |- balance.js                     gameplay numbers, recipes, node config, animal rules, progression thresholds
|- content/
|  |- manifest.js                    content version + pack load list
|  |- base_stone_age.js              core Stone Age entities, recipes, techs, barracks entity
|  |- expansion_tree_farming.js      tree nursery / renewable wood content
|  |- expansion_bronze_age.js        Bronze Age entities and unlocks
|  |- expansion_fire_light.js        fire and light content
|  |- expansion_iron_age.js          Iron Age entities and unlocks
|  |- expansion_water.js             Well and Bridge content
|  |- expansion_military_defense.js  Watchtower content pack
|  |- expansion_hunt_prey.js         Deer / Rabbit prey content pack
|- engine/
|  |- registry.js                    merge layer for content + balance lookups
|  |- gameState.js                   live save state, inventory, instances, chunk persistence
|  |- craftSystem.js                 crafting and crafted-equipment auto-equip logic
|  |- tickSystem.js                  per-second gameplay loop, farming, barracks training, watchtower defense, storage flow
|  |- unlockSystem.js                unlock resolution and legacy-only filtering
|  |- upgradeSystem.js               building upgrade costs and application
|  |- researchSystem.js              technology research and global bonuses
|  |- synergy.js                     proximity bonus logic
|- storage/
|  |- localStorage.js                save/load/export/import/version handling
|- ui/
|  |- hud.js                         HUD, modal tabs, inspector, notifications, quickbar, tracker
|- world/
|  |- scene.js                       scene, camera, render loop, per-frame HUD hooks
|  |- terrain.js                     chunk generation, predator zones, node runtime state, respawn relocation, walkability
|  |- entities.js                    object meshes, NPC meshes, prey / threat behavior, mesh refresh / hide / show
|  |- player.js                      movement, interactions, harvesting, context prompts, equipment visuals
|  |- combat.js                      combat targeting and combat loop
|  |- buildingSystem.js              placement, special building meshes, watchtower mesh, building refresh
|  |- npcSystem.js                   worker AI, harvesting, farm support, night-light pause, threat state
|  |- dayNightSystem.js              time progression, clock, lighting
|  |- fireSystem.js                  fire lights, active-light coverage checks, refuel interactions
|  |- waterSystem.js                 rivers, lakes, shallow/deep water, bridge traversal
|  |- minimap.js                     minimap, full world map, danger overlays, coverage rings
|  |- rangeIndicator.js              building radius rings + placement preview ranges
|  |- atmosphere.js                  stars, clouds, wind targets
|  |- animationSystem.js             tweens, flashes, simple animation helpers
|  |- particleSystem.js              pooled particles
|  |- weatherSystem.js               rain and weather state
|- dev/
|  |- validate.js                    optional validator, not loaded by release runtime
```

## Task Routing

- Add or rename content, visuals, unlock rules: `content/*.js` first, then `balance/balance.js` if costs / stats / rewards also change.
- Tune gameplay numbers, recipes, age thresholds, node variants, harvest rewards, animal disposition, or building ranges: `balance/balance.js`.
- Debug a content item that exists in data but not in runtime: `engine/registry.js`, then the relevant caller.
- Change save defaults, migration behavior, or persisted fields: `engine/gameState.js` and `storage/localStorage.js`.
- Change barracks queues, reserve counts, watchtower status surfaces, or settlement summary logic: `main.js`, `engine/gameState.js`, `engine/tickSystem.js`, and `ui/hud.js`.
- Change watchtower combat behavior, loot flow, or reserve-support math: `engine/tickSystem.js`, `main.js`, `balance/balance.js`, and `ui/hud.js`.
- Change night-work pauses, active light rules, or campfire coverage messaging: `world/fireSystem.js`, `world/npcSystem.js`, `main.js`, `ui/hud.js`, and `world/rangeIndicator.js`.
- Change resource spawn, prey / threat behavior, predator zones, regrowth, or chunk save/load: `world/terrain.js`, `world/entities.js`, `engine/registry.js`, and `world/player.js`.
- Change worker behavior, resident house logic, tree nursery logic, or farm automation: `world/npcSystem.js`, `engine/tickSystem.js`, `world/buildingSystem.js`, and `main.js`.
- Change building placement, preview meshes, or special 3D shapes: `world/buildingSystem.js`.
- Change HUD, modal surfaces, objective tracker, inspector, notifications, or contextual prompts: `ui/hud.js`, `style.css`, `index.html`, sometimes `main.js` and `world/player.js`.
- Change minimap / world map danger, hover info, or coverage visuals: `world/minimap.js`, `world/rangeIndicator.js`, `world/terrain.js`, and `ui/hud.js`.
- Investigate runtime boot / order problems: `index.html` first, then follow the load-order section above.

## Current Workspace Snapshot

- Runtime does not load dev helper scripts in the normal game flow.
- `dev/validate.js` is optional tooling only.
- This workspace currently includes `feature.md` and `manual.md` for planning and manual verification.
- New games start at `06:00` instead of noon.

## Current Gameplay Snapshot

- `building.berry_gatherer` is effectively the `Resident House`.
- Resident workers gather `wood`, `stone`, `flint`, and `berries`, and also tend nearby `Farm Plot`s and `Tree Nursery` plots when eligible.
- `building.farm_plot` is automatic: residents plant, fetch water, water, harvest, and store output on the plot.
- `building.well` supports nearby farm plots and provides a small passive food income.
- `building.bridge` marks water tiles as traversable.
- At night, workers stop work outside active campfire light. `FireSystem.getLightCoverageAt()` is the shared source of truth for those checks.
- `building.barracks` now trains reserve units per instance. Level 1 supports Swordsman training; Level 2 adds Archer training plus larger queue / reserve capacity and faster training.
- `building.watchtower` auto-attacks nearby threat animals, tracks shots / kills / cooldown state, and can receive reserve-support bonuses from nearby barracks.
- `animal.deer` and `animal.rabbit` are prey: they flee and do not attack. Wolves, boars, bears, lions, bandits, and sabertooths are treated as threats.
- Predator zones can increase dangerous animal spawns in a chunk and feed minimap / world-map danger overlays.
- The objective tracker now includes settlement alerts for shortages, night-light gaps, worker danger, and military status.
- Crafted equipment auto-equips if the slot is empty or the new item is stronger than the currently equipped one.

## Resource And Threat Rules

- Trees use growth stages: sapling -> young -> mature.
- Rocks use size variants: small -> medium -> large -> giant.
- Berry bushes have 3 harvestable fruit levels; harvesting removes the bush until it respawns and grows again.
- Tree / rock giant variants are intentionally rarer in the current release.
- Tree / rock giant variants no longer use glow effects; size is the main visual tell.
- Tree / rock respawns can relocate within the same chunk, so rare-node farming is less predictable.
- Threat vs prey is driven by `GameRegistry.getAnimalDisposition()` and balance data, not by mesh type alone.
- Watchtowers target threat animals only.
- Chunk save data must persist node position + runtime state if nodes can relocate on respawn.
- Chunk data can also carry `predatorZone` metadata used by danger overlays and hover text.

## Legacy Compatibility

- `building.wood_cutter`, `building.stone_quarry`, and `building.flint_mine` remain in content for old saves.
- Those legacy buildings are hidden from build UI with `hiddenInBuildMenu` and excluded from fresh unlock flow with `legacyOnly`.
- `GameState.getBuildingCount('building.berry_gatherer')` intentionally aggregates old wood / stone / flint buildings for backward compatibility.

## Key Systems

- `GameState`: live save state, inventory, instances, chunk persistence, time-of-day, hunger, equipment, fire fuel, and per-instance farm / barracks / watchtower state.
- `CraftSystem`: crafting, duplicate-equipment prevention, auto-equip upgrade checks.
- `TickSystem`: production, farming progress, barracks training, watchtower defense, hunger, fire fuel, warehouse transfer, autosave cadence.
- `GameTerrain`: chunk generation, predator zones, node runtime state, respawn relocation, walkability.
- `GameEntities`: object meshes, NPC meshes, prey / threat movement, flee / chase behavior, mesh refresh / hide / show.
- `BuildingSystem`: placement, special meshes, farm plot visuals, range-preview hooks, building refresh.
- `NPCSystem`: resident harvesting, farm tending, night-light pauses, worker threat reporting, storage return flow.
- `FireSystem`: fire lights, fuel handling, and active light coverage queries.
- `MiniMap`: minimap, full world map, danger overlays, and light / defense coverage rings.
- `DayNightSystem`: lighting, darkness, HUD clock, persisted time-of-day.
- `GameHUD`: resources, quickbar, modal tabs, inspector, notifications, objective tracker, settlement status.
- `GameActions` in `main.js`: boot glue plus barracks / watchtower inspector data, queue actions, and settlement-summary helpers.

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

- Spendable resources include player inventory plus warehouse stock only.
- Non-warehouse building storage is not spendable by default. Watchtower loot currently sits in tower storage until collected manually.
- Building state is per-instance via `uid`.
- `farmState`, `barracksState`, and `watchtowerState` live inside instance data.
- `fireFuel` is stored separately from instance data.
- Chunk save data must persist node position + state if nodes can relocate on respawn.
- Saved chunk data can also include `predatorZone` metadata.

## Known Limitations

- Barracks units are abstract reserve counters. Individually controllable soldiers / formations are not implemented.
- The Barracks content description still references old "spawns guards" behavior in some UI surfaces even though the mechanic is now reserve training.
- Watchtower reserve support can increase real combat stats beyond the base defense radius, but current range overlays and map coverage still show base defense radius only.
- Watchtower loot is stored on the tower and does not auto-transfer to warehouses because warehouse auto-transfer only processes worker production buildings.
- NPC pathing is still simple direct-line logic and weak around obstacles / water.
- Synergy system exists but only limited data uses it.
- Game speed is still effectively a console / debug control.
- Some internal comments are still mixed-language even though runtime player-facing text is English.

## Safe Change Rules

1. Preserve global names such as `GameHUD`, `GameActions`, `GameState`, `BuildingSystem`, and `NPCSystem`.
2. When changing UI, verify `index.html`, `style.css`, and `ui/hud.js` together.
3. When changing buildings or unlocks, verify both `content/*.js` and `balance/balance.js`.
4. When changing node respawn / save logic, verify both `world/terrain.js` and `world/entities.js`.
5. When changing barracks / watchtower behavior, verify `main.js`, `engine/tickSystem.js`, `engine/gameState.js`, `ui/hud.js`, and the related content / balance entries together.
6. When changing night-work or light-coverage behavior, verify `world/fireSystem.js`, `world/npcSystem.js`, `ui/hud.js`, `world/rangeIndicator.js`, and `world/minimap.js`.
7. When changing prey / threat rules or predator zones, verify `engine/registry.js`, `world/entities.js`, `world/terrain.js`, `world/minimap.js`, and `world/player.js`.
8. Do not reorder scripts casually.
9. Keep release runtime free of dev-only script tags.

## Quick Validation

- Syntax check edited JS files with `node --check path/to/file.js`.
- Use workspace diagnostics after edits.
- For gameplay / UI changes, walk through `manual.md`, especially the night-light, barracks, watchtower, prey / threat, minimap danger, and save / load sections.
- If content integrity needs a manual check during development, temporarily load `dev/validate.js` and run `GameValidator.printReport()` in the browser console.
