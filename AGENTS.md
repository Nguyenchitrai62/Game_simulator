# Evolution Simulator 3D - Agent Quick Guide

## Overview

- Browser-only 3D survival/settlement simulator using vanilla JS globals and local `three.min.js`.
- No bundler, no framework, no build step. Runtime entry is `index.html`.
- Current content manifest version: `1.1.1` from `content/manifest.js`.
- Age progression: Stone -> Bronze -> Iron.
- Background music: `asset/Chibi.mp3` at volume `0.4`, starts on first user gesture.
- Favicon: `asset/LOGO.png`.
- Script order matters. Do not reorder runtime scripts casually.

## Release-Critical Recent Changes

- `ui/i18n.js` is now part of the runtime. It manages display language with localStorage key `evolution_language_v1`.
- Default display language is English. Settings now has a dedicated `Language` tab instead of mixing language controls into Graphics.
- Changing language updates DOM text, localized content names/descriptions, speech-overlay text, and reruns `GameRegistry.init()` so cloned registry data stays in sync.
- `ui/hud.js` quickbar build/craft slots now show missing-resource tooltips and can open the Bag modal directly at the matching Build/Craft card.
- `style.css` restores mouse interaction on the quickbar backpack button. Bag should open by mouse click and by `B`.
- `world/player.js` plus `index.html` and `style.css` add a small direction arrow to the player tutorial bubble when a newly discovered resource is announced. The arrow disappears with the bubble.
- `world/entities.js` now uses species-specific low-poly animal builders. Keep direct child mesh names `leg` and `tail`; animation still depends on those names.

## Fast Context Start

- Open `index.html` first for runtime script order, HUD DOM nodes, and modal markup.
- Open `ui/hud.js`, `style.css`, and `ui/i18n.js` together for any HUD, modal, quickbar, tooltip, settings, or localization change.
- Open `content/*.js` and `balance/balance.js` first for new content, renamed items, recipes, costs, stats, progression, and animal disposition.
- Open `engine/registry.js` when localized content or content-pack data appears missing at runtime.
- Open `engine/gameState.js` and `storage/localStorage.js` for save data, defaults, version migrations, and persisted per-instance state.
- Open `world/entities.js` for animal meshes, movement visuals, mesh identity, and animation compatibility.
- Open `world/player.js` for interactions, context prompts, tutorial bubbles, and player-facing world guidance.
- Open `world/terrain.js` and `world/minimap.js` for node spawn, predator zones, danger overlays, and map readability.
- Open `world/buildingSystem.js`, `world/npcSystem.js`, `engine/tickSystem.js`, and `main.js` together for building automation, workers, barracks, and watchtower behavior.

## Repository Structure

```text
Game_simulator/
|- AGENTS.md                          project handoff file for future agents
|- feature.md                         feature status / backlog / QA targets
|- manual.md                          manual release and regression checklist
|- index.html                         runtime shell, DOM markup, script order, audio bootstrap
|- main.js                            game boot, GameActions, settlement glue, high-level orchestration
|- style.css                          all HUD, modal, overlay, tooltip, and settings styling
|- three.min.js                       local Three.js bundle
|
|- asset/
|  |- Chibi.mp3                       background music loop
|  |- fire.ogg                        fire-action speech / SFX asset
|  |- lag.ogg                         lag-warning speech / advisory audio asset
|  |- LOGO.png                        favicon / game logo
|
|- balance/
|  |- balance.js                      gameplay numbers, recipes, node rules, AI tuning, speech config
|
|- content/
|  |- manifest.js                     content version and pack load list
|  |- base_stone_age.js               base age, core resources, nodes, barracks, early gear and recipes
|  |- expansion_tree_farming.js       tree nursery and renewable wood/farm support content
|  |- expansion_bronze_age.js         Bronze Age resources, buildings, equipment, and unlocks
|  |- expansion_iron_age.js           Iron Age resources, buildings, equipment, and unlocks
|  |- expansion_fire_light.js         campfire, torch, and fire/light related content
|  |- expansion_water.js              well and bridge content
|  |- expansion_military_defense.js   watchtower defense content
|  |- expansion_hunt_prey.js          prey animals such as deer and rabbit
|
|- dev/
|  |- validate.js                     optional content/runtime validator, not loaded in release
|
|- engine/
|  |- registry.js                     merge layer for content + balance, runtime entity lookup helpers
|  |- gameState.js                    canonical save state, resources, inventory, instances, time, hunger
|  |- perfMonitor.js                  FPS sampling and performance metrics collection
|  |- qualitySettings.js              graphics presets and runtime quality config pub/sub
|  |- spatialIndex.js                 fast spatial queries for buildings, workers, and threats
|  |- tickSystem.js                   per-tick settlement/gameplay loop and automation updates
|  |- craftSystem.js                  crafting rules and auto-equip behavior
|  |- unlockSystem.js                 unlock evaluation and legacy filtering
|  |- upgradeSystem.js                building upgrade application and costs
|  |- synergy.js                      proximity bonuses / systemic cross-building modifiers
|  |- researchSystem.js               research unlocks and permanent bonuses
|
|- storage/
|  |- localStorage.js                 save/load/export/import and versioned persistence
|
|- ui/
|  |- hud.js                          HUD renderer, bag modal, quickbar, notifications, settings, inspector
|  |- i18n.js                         display language system, DOM translation, localized content overrides
|
|- world/
|  |- scene.js                        renderer, camera, main frame loop, screen projection helpers
|  |- terrain.js                      terrain/chunk generation, node placement, predator zones, exploration data
|  |- entities.js                     world meshes, animal meshes, mesh registry, flee/chase movement visuals
|  |- player.js                       player movement, interaction scan, combat prompts, tutorial/world speech
|  |- combat.js                       combat resolution and attack logic
|  |- buildingSystem.js               building placement flow, build previews, special meshes
|  |- npcSystem.js                    resident/worker AI, gathering, farm support, threat reactions
|  |- barracksTroopSystem.js          reserve troop visuals and barracks-linked troop behavior
|  |- rangeIndicator.js               placement and defense radius indicators
|  |- dayNightSystem.js               time progression, lighting state, day/night transitions
|  |- fireSystem.js                   campfire fuel, lights, night coverage checks
|  |- waterSystem.js                  water tiles, traversal, bridge interaction rules
|  |- atmosphere.js                   stars, clouds, ambience visuals
|  |- animationSystem.js              lightweight animation helpers and transitions
|  |- particleSystem.js               particle spawning / pooling
|  |- weatherSystem.js                rain and weather runtime behavior
|  |- minimap.js                      minimap, world map, danger overlays, coverage visualization
```

## File And Folder Conventions

- `content/` should define what exists in the world; prefer adding names/unlocks/entities here before writing runtime special cases.
- `balance/` should define costs, yields, thresholds, AI numbers, and speech config; prefer data tuning here over logic forks.
- `engine/` owns shared simulation state and systems that do not belong to a single world or UI surface.
- `world/` owns scene objects, movement, placement, map rendering, and runtime world behavior.
- `ui/` owns display surfaces only; if a UI bug looks data-related, verify the underlying content/balance/registry path first.
- `dev/validate.js` is for temporary development checks only and must not be shipped in runtime script order.

## Runtime Architecture

- Content lives in `content/*.js`.
- Numbers and gameplay rules live in `balance/balance.js`.
- `engine/registry.js` merges content plus balance into runtime lookup data.
- Runtime is a global-object architecture. There is no module isolation.
- Per-instance building state is stored on building instances inside `GameState` (`farmState`, `barracksState`, `watchtowerState`, etc.).
- Spendable resources are player inventory plus warehouse stock only.

## Script Load Order

1. `three.min.js`
2. Content packs: `content/manifest.js`, `base_stone_age`, `expansion_tree_farming`, `expansion_bronze_age`, `expansion_iron_age`, `expansion_fire_light`, `expansion_water`, `expansion_military_defense`, `expansion_hunt_prey`
3. `balance/balance.js`
4. `ui/i18n.js`
5. `engine/registry.js`, `engine/gameState.js`
6. `engine/perfMonitor.js`, `engine/qualitySettings.js`, `engine/spatialIndex.js`
7. `storage/localStorage.js`
8. Engine systems: `tickSystem`, `craftSystem`, `unlockSystem`, `upgradeSystem`, `synergy`, `researchSystem`
9. World systems: `scene` -> `terrain` -> `entities` -> `player` -> `combat` -> `buildingSystem` -> `npcSystem` -> `barracksTroopSystem` -> `rangeIndicator` -> `dayNightSystem` -> `fireSystem` -> `waterSystem` -> `atmosphere` -> `animationSystem` -> `particleSystem` -> `weatherSystem` -> `minimap`
10. `ui/hud.js`
11. `main.js`
12. Inline audio bootstrap

Keep `ui/i18n.js` after balance data and before `engine/registry.js`.
Keep `ui/hud.js` before `main.js`.

## Important Systems

- `GameState` in `engine/gameState.js`: save state, resources, inventory, instances, time, hunger, equipment, fire fuel.
- `GameRegistry` in `engine/registry.js`: merged content/balance lookups, prey/threat helpers.
- `GameQualitySettings` in `engine/qualitySettings.js`: quality presets. LocalStorage key `evolution_quality_settings_v1`. Default preset is `medium`.
- `GameDebugSettings` in `ui/hud.js`: runtime visibility/effect toggles. LocalStorage key `evolution_debug_settings_v1`.
- `GameSpatialIndex` in `engine/spatialIndex.js`: spatial grid queries for instances, workers, and threat animals.
- `GameHUD` in `ui/hud.js`: resources, quickbar, modal tabs, settings popup, notifications, objective tracker, inspector.
- `GameI18n` in `ui/i18n.js`: DOM translation, localized content overrides, language persistence, listeners.
- `GameEntities` in `world/entities.js`: world/object meshes, animal meshes, prey/threat movement.
- `GamePlayer` in `world/player.js`: movement, harvesting, combat prompts, tutorial speech, resource direction arrow.

## Settings And HUD Notes

- `F9` opens the Settings popup.
- Settings sidebar tabs are now: `Graphics`, `Language`, `Overlay`, `World FX`, `Simulation`.
- Graphics tab changes render-related preset only.
- Language tab changes HUD strings, selected content names/descriptions, and speech overlay text.
- Overlay / World FX / Simulation tabs control runtime toggles only.
- Main Bag modal tabs remain `Resources`, `Build`, `Craft`, `Stats`, `Research`.
- Blocked quickbar build/craft slots show a tooltip listing missing materials. Clicking them opens the Bag modal at the matching card.

## Current Gameplay Snapshot

- `building.berry_gatherer` acts as the Resident House. Workers gather `wood`, `stone`, `flint`, and `berries`, and help nearby Farm Plots and Tree Nursery plots.
- `building.farm_plot` is automatic once workers exist.
- `building.well` supports nearby farm plots and gives a small passive food gain.
- `building.bridge` marks water tiles traversable.
- Workers stop at night outside active campfire light. Shared source of truth: `FireSystem.getLightCoverageAt()`.
- `building.barracks` trains reserve units per instance. Level 1 trains Swordsman. Level 2 adds Archer and raises queue/capacity.
- `building.watchtower` auto-attacks threat animals only and can gain reserve support from nearby barracks.
- `animal.deer` and `animal.rabbit` are prey. Wolves, boars, bears, lions, bandits, and sabertooths are threats.
- Predator zones feed minimap/world-map danger overlays.
- Crafted equipment auto-equips when the slot is empty or the crafted item is stronger.
- New games start at `06:00`.

## Task Routing

- Content names, unlocks, descriptions, recipes, progression: `content/*.js`, then `balance/balance.js` if values change too.
- Localization or display-language issues: `ui/i18n.js`, `ui/hud.js`, `index.html`, `style.css`, sometimes `engine/registry.js`.
- Quickbar, Bag modal, settings popup, inspector, notifications: `ui/hud.js`, `style.css`, `index.html`.
- Speech bubbles, resource hinting, player-facing prompts: `world/player.js`, `index.html`, `style.css`.
- Animal visuals or animation regressions: `world/entities.js` first.
- Save/load or compatibility: `engine/gameState.js`, `storage/localStorage.js`.
- Watchtower, barracks, worker automation: `main.js`, `engine/tickSystem.js`, `world/npcSystem.js`, `ui/hud.js`.
- Spawn logic, prey/threat behavior, predator zones: `world/terrain.js`, `world/entities.js`, `engine/registry.js`, `world/minimap.js`.

## Safe Change Rules

1. Preserve global names such as `GameHUD`, `GameI18n`, `GameState`, `GameRegistry`, `GameQualitySettings`, and `GameSpatialIndex`.
2. Prefer data fixes in content/balance over runtime special cases.
3. When editing UI, inspect `index.html`, `style.css`, and `ui/hud.js` together.
4. When editing localization, verify both `ui/i18n.js` and any runtime clone point such as `engine/registry.js`.
5. When editing animal meshes, keep compatibility with `updateAnimalAnimation()` in `world/entities.js`.
6. When editing save-sensitive features, verify both new-save defaults and load compatibility.
7. Do not load `dev/validate.js` in release runtime.
8. Do not reorder runtime scripts unless the task is explicitly about boot order.

## Known Limitations

- Barracks units are still reserve counters, not individually controllable soldiers.
- Watchtower loot is not auto-transferred into spendable stock.
- Watchtower support bonuses can exceed the base visible range ring.
- NPC pathing is still simple direct-line movement.
- Not every user-facing string in the entire game is localized yet; the new language system currently covers the key HUD/settings/build/craft/speech surfaces and selected content names.

## Validation

- Syntax check edited JS files with `node --check path/to/file.js`.
- For a broader syntax sweep in PowerShell: `Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`.
- Use editor diagnostics after edits, especially after large `apply_patch` operations.
- Manual release QA lives in `manual.md`.
- Feature implementation status lives in `feature.md`.
- Optional content validator: temporarily load `dev/validate.js` and run `GameValidator.printReport()` in the browser console. Do not ship it in runtime.
