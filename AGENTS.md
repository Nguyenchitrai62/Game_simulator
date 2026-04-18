# Evolution Simulator 3D - Agent Quick Guide

## Overview

- Browser-only 3D survival/settlement simulator built with vanilla JS globals and local `three.min.js`.
- No bundler, no framework, no build step. Runtime entry is `index.html`.
- Current content manifest version: `1.1.2` from `content/manifest.js`.
- Progression track: Stone Age -> Bronze Age -> Iron Age.
- Audio is handled in `index.html` via `GameAudioController` plus local assets in `asset/`.
- Script order matters. Do not reorder runtime files casually.

## Release Snapshot

- HUD is now split across `ui/hud.js` core plus `ui/hud/debugSettings.js`, `ui/hud/settingsPanel.js`, `ui/hud/modalPanels.js`, and `ui/hud/inspector.js`.
- `ui/i18n.js` is in the runtime and owns language persistence through `evolution_language_v1`.
- Settings has dedicated tabs: `Graphics`, `Language`, `Overlay`, `World FX`, `Simulation`, `Reset`.
- Quickbar build/craft slots show missing-resource tooltips and can jump the Bag modal to the matching card.
- Bag/Stats relies on autosave. Manual `Save Now` is no longer part of the normal player flow.
- Player tutorial speech can show a small world-direction arrow for newly discovered resources.
- Animal meshes are species-specific. Keep direct child mesh names `leg` and `tail`; animation still depends on them.
- Temporary gameplay rule: worker-targeting AI and worker-danger HUD/minimap warnings are disabled. Threat animals still chase the player, and prey still flee from the player.

## Fast Context Start

- Open `index.html` first for DOM structure, audio bootstrap, and runtime script order.
- Open `ui/hud.js`, `ui/hud/modalPanels.js`, `ui/hud/inspector.js`, `ui/hud/settingsPanel.js`, `ui/hud/debugSettings.js`, `style.css`, and `ui/i18n.js` together for HUD or localization work.
- Open `content/*.js` and `balance/balance.js` first for progression, entities, recipes, descriptions, and balance tuning.
- Open `engine/registry.js` when content names, descriptions, or derived entity data look wrong at runtime.
- Open `engine/gameState.js` and `storage/localStorage.js` for save data, defaults, migrations, and persistent per-instance state.
- Open `world/entities.js` for animal visuals, movement, facing, flee/chase logic, and animation compatibility.
- Open `world/player.js` for interactions, prompts, tutorials, and player-facing speech.
- Open `world/terrain.js` and `world/minimap.js` for node spawn, predator zones, overlays, and map readability.
- Open `main.js`, `engine/tickSystem.js`, `world/npcSystem.js`, `world/barracksTroopSystem.js`, and `world/fireSystem.js` together for settlement automation or military behavior.

## Repository Structure

```text
Game_simulator/
|- AGENTS.md
|- feature.md
|- manual.md
|- index.html
|- main.js
|- style.css
|- three.min.js
|
|- asset/
|  |- Chibi.mp3
|  |- fire.ogg
|  |- lag.ogg
|  |- LOGO.png
|
|- balance/
|  |- balance.js
|
|- content/
|  |- manifest.js
|  |- base_stone_age.js
|  |- expansion_tree_farming.js
|  |- expansion_bronze_age.js
|  |- expansion_iron_age.js
|  |- expansion_fire_light.js
|  |- expansion_water.js
|  |- expansion_military_defense.js
|  |- expansion_hunt_prey.js
|
|- dev/
|  |- validate.js
|
|- engine/
|  |- registry.js
|  |- gameState.js
|  |- perfMonitor.js
|  |- qualitySettings.js
|  |- spatialIndex.js
|  |- tickSystem.js
|  |- craftSystem.js
|  |- unlockSystem.js
|  |- upgradeSystem.js
|  |- synergy.js
|  |- researchSystem.js
|
|- storage/
|  |- localStorage.js
|
|- ui/
|  |- hud.js
|  |- i18n.js
|  |- hud/
|  |  |- debugSettings.js
|  |  |- settingsPanel.js
|  |  |- modalPanels.js
|  |  |- inspector.js
|
|- world/
|  |- scene.js
|  |- terrain.js
|  |- entities.js
|  |- player.js
|  |- combat.js
|  |- buildingSystem.js
|  |- npcSystem.js
|  |- barracksTroopSystem.js
|  |- rangeIndicator.js
|  |- dayNightSystem.js
|  |- fireSystem.js
|  |- waterSystem.js
|  |- atmosphere.js
|  |- animationSystem.js
|  |- particleSystem.js
|  |- weatherSystem.js
|  |- minimap.js
```

## Architecture Notes

- `content/` defines what exists in the game world.
- `balance/` defines costs, yields, thresholds, AI numbers, and speech config.
- `engine/registry.js` merges content and balance into runtime lookup data.
- Runtime is global-object based. There is no module isolation.
- Per-instance building state lives on building instances in `GameState` (`farmState`, `barracksState`, `watchtowerState`, `fireFuel`, and similar fields).
- Spendable resources are player inventory plus warehouse stock only.
- `dev/validate.js` is development-only and must not be loaded in release runtime.

## Script Load Order

1. `three.min.js`
2. `content/manifest.js` and all content packs
3. `balance/balance.js`
4. `ui/i18n.js`
5. `engine/registry.js`, `engine/gameState.js`
6. `engine/perfMonitor.js`, `engine/qualitySettings.js`, `engine/spatialIndex.js`
7. `storage/localStorage.js`
8. Engine systems: `tickSystem`, `craftSystem`, `unlockSystem`, `upgradeSystem`, `synergy`, `researchSystem`
9. World systems: `scene` -> `terrain` -> `entities` -> `player` -> `combat` -> `buildingSystem` -> `npcSystem` -> `barracksTroopSystem` -> `rangeIndicator` -> `dayNightSystem` -> `fireSystem` -> `waterSystem` -> `atmosphere` -> `animationSystem` -> `particleSystem` -> `weatherSystem` -> `minimap`
10. HUD chain: `ui/hud/debugSettings.js` -> `ui/hud/settingsPanel.js` -> `ui/hud/modalPanels.js` -> `ui/hud/inspector.js` -> `ui/hud.js`
11. `main.js`

Keep `ui/i18n.js` after balance data and before `engine/registry.js`.
Keep the full HUD chain before `ui/hud.js`, and keep `ui/hud.js` before `main.js`.

## Important Systems

- `GameState` in `engine/gameState.js`: canonical save state, resources, inventory, instances, time, hunger, equipment, and fire fuel.
- `GameRegistry` in `engine/registry.js`: merged content/balance lookups, derived descriptions, animal disposition helpers.
- `GameQualitySettings` in `engine/qualitySettings.js`: render presets. LocalStorage key `evolution_quality_settings_v1`. Default preset is `medium`.
- `GameDebugSettings` in `ui/hud/debugSettings.js`: runtime visibility/effect toggles. LocalStorage key `evolution_debug_settings_v1`.
- `GameSpatialIndex` in `engine/spatialIndex.js`: spatial queries for buildings and runtime systems.
- `GameHUD` in `ui/hud.js`: HUD state wiring, quickbar flow, overlays, notifications, objective tracker, modal state, and stable public API.
- `GameHUDModules.createSettingsPanelModule` in `ui/hud/settingsPanel.js`: settings popup tabs, reset flow, and performance prompt rendering.
- `GameHUDModules.createModalPanelsModule` in `ui/hud/modalPanels.js`: Bag modal rendering for `Resources`, `Build`, `Craft`, `Stats`, `Research`.
- `GameHUDModules.createInspectorModule` in `ui/hud/inspector.js`: building inspector rendering, selection state, and destroy confirmation.
- `GameI18n` in `ui/i18n.js`: DOM translation, content overrides, language persistence, and listeners.
- `GameEntities` in `world/entities.js`: mesh creation, animal movement, patrol/chase/flee behavior, and mesh lookup.
- `GamePlayer` in `world/player.js`: movement, world interaction, combat prompts, tutorials, and speech.

## Current Gameplay Notes

- `building.berry_gatherer` acts as the Resident House. Residents gather `wood`, `stone`, `flint`, and `berries`, and support nearby farm and nursery plots.
- `building.farm_plot` and `building.tree_nursery` are worker-driven automation surfaces.
- Workers stop at night outside active campfire coverage. Shared truth lives in `FireSystem.getLightCoverageAt()`.
- `building.well` supports nearby farm plots and adds a small passive food trickle.
- `building.bridge` marks water tiles traversable.
- `building.barracks` trains reserve units per instance. Level 1 trains Swordsman. Level 2 adds Archer and expands queue/capacity.
- `building.watchtower` auto-attacks threat animals only and can gain reserve support from nearby barracks.
- `animal.deer` and `animal.rabbit` are prey. Wolves, boars, bears, lions, bandits, and sabertooths are threats.
- Predator zones drive world-map and minimap danger overlays.
- Crafted equipment auto-equips when the matching slot is empty or the crafted item is stronger.
- New games start at `06:00`.

## Task Routing

- Content names, unlocks, descriptions, recipes, and progression: `content/*.js`, then `balance/balance.js` if numbers also change.
- Localization or display-language issues: `ui/i18n.js`, `ui/hud.js`, `ui/hud/modalPanels.js`, `ui/hud/settingsPanel.js`, `index.html`, `style.css`, sometimes `engine/registry.js`.
- Quickbar, Bag modal, settings popup, inspector, and notifications: `ui/hud.js`, `ui/hud/modalPanels.js`, `ui/hud/inspector.js`, `ui/hud/settingsPanel.js`, `style.css`, `index.html`.
- Speech bubbles, context prompts, and tutorial behavior: `world/player.js`, `index.html`, `style.css`.
- Animal visuals, facing, or flee/chase regressions: `world/entities.js` first.
- Save/load or reset behavior: `engine/gameState.js`, `storage/localStorage.js`, `main.js`.
- Barracks, watchtower, military overlays, or settlement summaries: `main.js`, `engine/tickSystem.js`, `world/barracksTroopSystem.js`, `world/minimap.js`, `ui/hud.js`.
- Spawn logic, predator zones, and map danger readability: `world/terrain.js`, `world/entities.js`, `world/minimap.js`, `engine/registry.js`.

## Safe Change Rules

1. Preserve global names such as `GameHUD`, `GameI18n`, `GameState`, `GameRegistry`, `GameQualitySettings`, `GameDebugSettings`, and `GameSpatialIndex`.
2. Prefer data fixes in content/balance over runtime special cases when possible.
3. When editing UI, inspect `index.html`, `style.css`, `ui/hud.js`, and the relevant extracted HUD module together.
4. When editing localization, verify both `ui/i18n.js` and any runtime clone/rebuild point such as `engine/registry.js`.
5. When editing animal meshes, keep compatibility with `updateAnimalAnimation()` in `world/entities.js`.
6. When editing save-sensitive features, verify new-save defaults, old-save load behavior, and full reset behavior.
7. Do not load `dev/validate.js` in release runtime.
8. Do not reorder runtime scripts unless the task is explicitly about boot order.

## Known Limitations

- Worker-targeting AI and worker-danger HUD/minimap warnings are intentionally disabled right now.
- Barracks units are still reserve/deployed helpers, not fully user-controlled squads.
- Watchtower loot is not auto-transferred into spendable stock.
- Watchtower support bonuses can exceed the base visible range ring.
- NPC pathing is still simple direct-line movement.
- Not every user-facing string is localized yet. Core HUD/settings/build/craft/speech surfaces are covered more reliably than every secondary string.

## Validation

- Syntax check edited JS files with `node --check path/to/file.js`.
- For a repo-wide syntax sweep in PowerShell: `Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`.
- Use editor diagnostics after large `apply_patch` changes.
- Manual release QA lives in `manual.md`.
- Feature implementation status lives in `feature.md`.
- Optional validator: temporarily load `dev/validate.js` and run `GameValidator.printReport()` in the browser console. Do not ship that script in release.
