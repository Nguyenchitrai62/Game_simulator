# Evolution Simulator 3D - Agent Guide

## Overview

- Browser-only 3D survival/settlement simulator built on vanilla JS globals and local `three.min.js`.
- No bundler, no framework, no build step. Runtime entry is `index.html`.
- Current content manifest version: `1.1.3` from `content/manifest.js`.
- Progression track: Stone Age -> Bronze Age -> Iron Age.
- Audio bootstrap lives in `index.html` via `GameAudioController` plus local assets in `asset/`.
- Script order is critical. Do not reorder runtime files casually.
- `dev/validate.js` stays out of release runtime.
- `dev/localCheatLoader.js` is intentionally safe to keep in `index.html`; it lazy-loads optional local cheat panel assets and silently no-ops when they are absent.

## Release Snapshot

- HUD is split across `ui/hud.js` plus `ui/hud/debugSettings.js`, `ui/hud/settingsPanel.js`, `ui/hud/modalPanels.js`, and `ui/hud/inspector.js`.
- Backpack button and `B` open the main character modal on `Resources`. The left-side player card stays visible while the right-side tabs expose `Resources`, `Build`, `Craft`, `Stats`, and `Research`.
- Quickbar supports build/craft switching, missing-resource tooltips, and a `Q` weapon cycle with per-weapon opt-in state saved under `evolution_weapon_cycle_v1`.
- Combat uses weapon profiles (`sword`, `spear`, `bow`, `special`) with different reach, cadence, and boss damage multipliers.
- Boss zones and ruined outposts are generated from terrain distance rules, shown on minimap/world map, and persisted through chunk save data.
- Barracks supports reserve troops with command modes `Hold Position`, `Follow Player`, and `Attack Target`.
- Current troop roster: `swordsman` at level 1, `spearman` and `archer` at level 2.
- `building.armory` exists as an optional military support building that boosts troop training and combat stats.
- Worker-targeting AI and worker-danger HUD/minimap signals are permanently disabled. Threat animals still chase the player. Prey still flee from the player.

## Fast Context Start

- Open `index.html` first for DOM structure, modal tab DOM, audio bootstrap, and runtime script order.
- Open `content/manifest.js`, the relevant `content/*.js` packs, and `balance/balance.js` together for progression, unlocks, entities, recipes, combat profiles, terrain spawn rules, and tuning.
- Open `ui/hud.js`, `ui/hud/modalPanels.js`, `ui/hud/inspector.js`, `ui/hud/settingsPanel.js`, `ui/hud/debugSettings.js`, `ui/i18n.js`, `index.html`, and `style.css` together for HUD or localization work.
- Open `main.js` for action wiring, barracks/watchtower summaries, localization helpers, and boot/runtime orchestration.
- Open `engine/gameState.js` and `storage/localStorage.js` together for save defaults, migrations, world/core save split, and full reset behavior.
- Open `world/combat.js`, `world/player.js`, `world/barracksTroopSystem.js`, `world/terrain.js`, `world/minimap.js`, and `world/entities.js` together for combat, boss rewards, world-site interactions, military AI, chunk persistence, and map overlays.

## Repository Structure

```text
Game_simulator/
|- .gitignore
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
|  |- expansion_military_upgrades.js
|  |- expansion_ranged_weapons.js
|  |- expansion_boss_frontier.js
|
|- dev/
|  |- localCheatLoader.js
|  |- validate.js
|  |- local-cheat-panel/
|  |  |- panel.js
|  |  |- style.css
|
|- engine/
|  |- craftSystem.js
|  |- gameState.js
|  |- perfMonitor.js
|  |- qualitySettings.js
|  |- registry.js
|  |- researchSystem.js
|  |- spatialIndex.js
|  |- synergy.js
|  |- tickSystem.js
|  |- unlockSystem.js
|  |- upgradeSystem.js
|
|- storage/
|  |- localStorage.js
|
|- ui/
|  |- hud.js
|  |- i18n.js
|  |- hud/
|  |  |- debugSettings.js
|  |  |- inspector.js
|  |  |- modalPanels.js
|  |  |- settingsPanel.js
|
|- world/
|  |- animationSystem.js
|  |- atmosphere.js
|  |- barracksTroopSystem.js
|  |- buildingSystem.js
|  |- combat.js
|  |- dayNightSystem.js
|  |- entities.js
|  |- fireSystem.js
|  |- minimap.js
|  |- npcSystem.js
|  |- particleSystem.js
|  |- player.js
|  |- rangeIndicator.js
|  |- scene.js
|  |- terrain.js
|  |- waterSystem.js
|  |- weatherSystem.js
```

## Architecture Notes

- `content/` defines what exists. `balance/` defines numeric behavior. `engine/registry.js` merges both into runtime lookup data.
- Runtime is global-object based. There is no module isolation.
- `main.js` exposes `GameActions` and wires HUD actions into systems. Many inspector and HUD actions route through it.
- Core save and world save are split: `game_save` for player/core state and `game_save_world` for chunk/exploration state.
- `GameStorage.clearAllData()` clears save data plus all `evolution_` localStorage keys.
- Chunk metadata persists bosses and ruined outposts even when a chunk has no normal resource-node saves.
- Per-instance mutable fields live inside `GameState` instances, for example `farmState`, `barracksState`, `watchtowerState`, and `fireFuel`.
- Spendable resources are player inventory plus warehouse stock only.
- Legacy compatibility still exists for hidden old-save buildings such as `building.wood_cutter`, `building.stone_quarry`, and `building.flint_mine`. Do not surface them in the build menu unless the task is explicitly about legacy support.

## Script Load Order

1. `three.min.js`
2. `content/manifest.js`
3. Content packs in this order:
	`base_stone_age` -> `expansion_tree_farming` -> `expansion_bronze_age` -> `expansion_iron_age` -> `expansion_fire_light` -> `expansion_water` -> `expansion_military_defense` -> `expansion_hunt_prey` -> `expansion_military_upgrades` -> `expansion_ranged_weapons` -> `expansion_boss_frontier`
4. `balance/balance.js`
5. `ui/i18n.js`
6. `engine/registry.js`, `engine/gameState.js`
7. `engine/perfMonitor.js`, `engine/qualitySettings.js`, `engine/spatialIndex.js`
8. `storage/localStorage.js`
9. Engine systems: `tickSystem`, `craftSystem`, `unlockSystem`, `upgradeSystem`, `synergy`, `researchSystem`
10. World systems: `scene` -> `terrain` -> `entities` -> `player` -> `combat` -> `buildingSystem` -> `npcSystem` -> `barracksTroopSystem` -> `rangeIndicator` -> `dayNightSystem` -> `fireSystem` -> `waterSystem` -> `atmosphere` -> `animationSystem` -> `particleSystem` -> `weatherSystem` -> `minimap`
11. HUD chain: `ui/hud/debugSettings.js` -> `ui/hud/settingsPanel.js` -> `ui/hud/modalPanels.js` -> `ui/hud/inspector.js` -> `ui/hud.js`
12. `main.js`
13. `dev/localCheatLoader.js`

Keep `ui/i18n.js` after balance data and before `engine/registry.js`.
Keep the extracted HUD chain before `ui/hud.js`.
Keep `ui/hud.js` before `main.js`.

## Important Systems

- `GameRegistry` in `engine/registry.js`: merged content/balance lookups, derived descriptions, stat summaries, animal threat/prey helpers.
- `GameState` in `engine/gameState.js`: canonical save state for resources, inventory, player, instances, hunger, time, fire fuel, barracks state, and chunks.
- `GameStorage` in `storage/localStorage.js`: autosave/throttling, world/core save split, managed-storage reset.
- `GameQualitySettings` in `engine/qualitySettings.js`: quality presets. LocalStorage key `evolution_quality_settings_v1`. Default preset is `medium`.
- `GameDebugSettings` in `ui/hud/debugSettings.js`: runtime toggles for overlay/world FX/simulation. LocalStorage key `evolution_debug_settings_v1`.
- `GameI18n` in `ui/i18n.js`: language persistence, DOM translation, content overrides. LocalStorage key `evolution_language_v1`.
- `GameHUD` in `ui/hud.js`: top-level HUD state, quickbar, modal state, notifications, overlay rendering, public API wrappers.
- `GameHUDModules.createModalPanelsModule` in `ui/hud/modalPanels.js`: `Resources`, `Build`, `Craft`, `Stats`, and `Research` tab rendering plus the shared character modal body.
- `GameHUDModules.createSettingsPanelModule` in `ui/hud/settingsPanel.js`: settings tabs `Graphics`, `Language`, `Overlay`, `World FX`, `Simulation`, `Reset`.
- `GameHUDModules.createInspectorModule` in `ui/hud/inspector.js`: building inspector, barracks controls, destroy confirmation.
- `GameCombat` in `world/combat.js`: player-vs-animal combat loop, weapon profiles, boss rewards, death/respawn handling.
- `GameTerrain` in `world/terrain.js`: chunk generation, predator zones, boss zones, ruined outposts, chunk object persistence.
- `MiniMap` in `world/minimap.js`: minimap/full map rendering, danger overlays, boss/outpost markers, hover text.
- `GamePlayer` in `world/player.js`: movement, interaction prompts, tutorial speech, combat click routing, world-site loot.
- `BarracksTroopSystem` in `world/barracksTroopSystem.js`: reserve troop spawning, formation logic, follow/guard/attack-target behavior.

## Current Gameplay Notes

- `building.berry_gatherer` is the Resident House. Residents gather `wood`, `stone`, `flint`, and `berries`, and support nearby farm/tree nursery plots.
- `building.farm_plot` and `building.tree_nursery` are worker-driven automation surfaces.
- Workers stop at night outside active campfire light coverage. Shared truth lives in `FireSystem.getLightCoverageAt()`.
- `building.well` supports farm plots and adds a small passive food trickle.
- `building.bridge` marks water tiles traversable.
- `building.barracks` trains reserve troops per instance. Level 1 supports `swordsman`. Level 2 unlocks `spearman` and `archer`, larger queue, and larger reserve capacity.
- `building.watchtower` auto-attacks threat animals only and can receive reserve support from nearby barracks.
- `building.armory` adds modest barracks/troop bonuses and should stay a support building, not a hard dependency.
- Ranged weapon line exists: `equipment.hunting_bow`, `equipment.bronze_bow`, `equipment.iron_longbow`.
- Boss rewards are relic weapons: `equipment.moonfang_blade`, `equipment.sunpiercer_bow`, `equipment.stormspine_glaive`. They auto-equip on reward if possible.
- World-site loot exists through `site.ruined_outpost`, spawned from terrain metadata and salvaged directly by the player.
- `animal.deer` and `animal.rabbit` are prey. Wolves, boars, bears, lions, bandits, sabertooths, and boss animals are threats.
- Predator zones, boss zones, ruined outposts, light coverage, and defense coverage all feed map readability.
- New games start at `06:00`.
- Local tutorial persistence uses `evolution_tutorial_v1`.
- Local cheat panel assets live in `dev/local-cheat-panel/`, and `dev/localCheatLoader.js` keeps their load path optional so missing local files do not break normal runtime.

## Task Routing

- Content names, unlocks, recipes, progression, and entity presence: `content/*.js`, then `balance/balance.js` if numbers or behavior also change.
- Modal/tab work: update `index.html` DOM, `style.css`, `ui/hud.js`, `ui/hud/modalPanels.js`, and `ui/i18n.js` together. Missing one of these usually leaves a valid build with a broken tab.
- Quickbar, backpack modal entry, weapon cycle, notifications, and objective tracker: `ui/hud.js`, `ui/hud/modalPanels.js`, `style.css`, `index.html`, `ui/i18n.js`.
- Settings popup/runtime toggles: `ui/hud/settingsPanel.js`, `ui/hud/debugSettings.js`, `engine/qualitySettings.js`, `ui/hud.js`, `style.css`.
- Localization or display-language issues: `ui/i18n.js`, then check `engine/registry.js` if descriptions are derived at runtime.
- Combat feel, attack range, boss rewards, death flow, or weapon profiles: `world/combat.js`, `balance/balance.js`, `world/player.js`, `world/entities.js`.
- Barracks, watchtower, armory, troop modes, or inspector summaries: `main.js`, `world/barracksTroopSystem.js`, `ui/hud/inspector.js`, `balance/balance.js`, `world/minimap.js`.
- Boss zones, ruined outposts, map overlays, or chunk persistence: `world/terrain.js`, `world/minimap.js`, `world/player.js`, `world/entities.js`, `engine/gameState.js`, `storage/localStorage.js`.
- Save/load, reset, autosave, or storage-key behavior: `engine/gameState.js`, `storage/localStorage.js`, `main.js`.
- Local cheat panel work: `dev/localCheatLoader.js` and `dev/local-cheat-panel/`. The loader is intentionally wired in `index.html`; keep its missing-file path silent and non-blocking. `dev/validate.js` stays local-only.

## Safe Change Rules

1. Preserve global names such as `GameHUD`, `GameI18n`, `GameState`, `GameRegistry`, `GameQualitySettings`, `GameDebugSettings`, `GameSpatialIndex`, `GameCombat`, and `GameActions`.
2. Prefer content/balance fixes over runtime special cases when possible.
3. When adding or changing a modal tab, update the DOM in `index.html`, layout in `style.css`, panel rendering in `ui/hud/modalPanels.js`, modal metadata/public API in `ui/hud.js`, and labels in `ui/i18n.js` together.
4. When editing localization, verify both `ui/i18n.js` and any runtime clone/rebuild point such as `engine/registry.js`.
5. When editing animal meshes, keep direct child mesh names `leg` and `tail`; animation code still depends on them.
6. When editing save-sensitive features, verify new-save defaults, old-save load behavior, chunk unload/reload behavior, and full reset behavior.
7. Do not load `dev/validate.js` in the release runtime. If you touch `dev/localCheatLoader.js`, preserve its lazy optional-load behavior and silent no-op path when local files are missing.
8. Do not reorder runtime scripts unless the task is explicitly about boot order.
9. Worker-threat systems are intentionally blocked. Do not re-enable worker-danger HUD/minimap/objective output without also restoring the underlying simulation rules.
10. Hidden legacy buildings exist for compatibility only. Do not remove them casually and do not expose them in normal player flows without checking save migration impact.

## Known Limitations

- Worker-targeting AI and worker-danger HUD/minimap warnings are permanently disabled.
- Barracks troops are still reserve/deployed helpers, not fully direct-controlled squads.
- Watchtower loot is not auto-transferred into spendable stock.
- Watchtower support bonuses can exceed the visible base range ring.
- NPC pathing is still simple direct-line movement.
- Not every user-facing string is localized yet. Core HUD/settings/build/craft/stats/combat surfaces are covered more reliably than every secondary string.

## Validation

- Syntax check edited JS files with `node --check path/to/file.js`.
- Repo-wide syntax sweep in PowerShell:
  `Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`
- Use editor diagnostics after large `apply_patch` changes.
- Manual release QA lives in `manual.md`.
- Feature implementation status lives in `feature.md`.
- Optional validator: temporarily wire `dev/validate.js` in a local-only session and run `GameValidator.printReport()` in the browser console. Do not ship that script in release.
