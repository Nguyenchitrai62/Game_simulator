# Evolution Simulator 3D - Agent Guide

## Overview

- Browser-only 3D survival/settlement simulator built on vanilla JS globals and local `three.min.js`.
- No bundler, no framework, no build step. Runtime entry is `index.html`.
- Current content manifest version: `1.1.4` from `content/manifest.js`.
- Progression path is Stone Age -> Bronze Age -> Iron Age.
- Audio bootstrap lives in `index.html` through `GameAudioController` and assets in `asset/`.
- Runtime ends at `main.js` plus the safe optional loader `dev/localCheatLoader.js`.
- `dev/validate.js` stays out of release runtime.
- `dev/localCheatLoader.js` may stay wired in `index.html`; it only loads extra local cheat-panel assets when they exist and otherwise silently no-ops.

## Fast Start

- Open `index.html` first for DOM structure, stylesheet entry, audio bootstrap, and runtime script order.
- Open `content/manifest.js`, relevant `content/*.js`, and `balance/balance.js` together for unlocks, recipes, units, bosses, and progression tuning.
- Open `ui/hud.js`, `ui/hud/modalPanels.js`, `ui/hud/inspector.js`, `ui/hud/settingsPanel.js`, `ui/hud/debugSettings.js`, `ui/i18n.js`, `index.html`, `style.css`, and `styles/*.css` together for HUD or localization work.
- Open `main.js` for `GameActions`, boot wiring, reset flows, and cross-system UI actions.
- Open `engine/gameState.js` and `storage/localStorage.js` together for save defaults, migrations, autosave, and full reset behavior.
- Open `world/combat.js`, `world/player.js`, `world/barracksTroopSystem.js`, `world/terrain.js`, `world/minimap.js`, and `world/entities.js` together for combat, map markers, troops, bosses, and world-site persistence.

## Repository Tree

```text
Game_simulator/
|- AGENTS.md
|- feature.md
|- index.html
|- main.js
|- manual.md
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
|     |- panel.js
|     |- style.css
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
|- styles/
|  |- core.css
|  |- quickbar.css
|  |- modal-shell.css
|  |- modal-panels.css
|  |- polish.css
|  |- responsive.css
|
|- ui/
|  |- hud.js
|  |- i18n.js
|  |- hud/
|     |- debugSettings.js
|     |- inspector.js
|     |- modalPanels.js
|     |- settingsPanel.js
|
|- world/
   |- animationSystem.js
   |- atmosphere.js
   |- barracksTroopSystem.js
   |- buildingSystem.js
   |- combat.js
   |- dayNightSystem.js
   |- entities.js
   |- fireSystem.js
   |- minimap.js
   |- npcSystem.js
   |- particleSystem.js
   |- player.js
   |- rangeIndicator.js
   |- scene.js
   |- terrain.js
   |- waterSystem.js
   |- weatherSystem.js
```

## Current Snapshot

- HUD is split across `ui/hud.js` plus `ui/hud/debugSettings.js`, `ui/hud/settingsPanel.js`, `ui/hud/modalPanels.js`, and `ui/hud/inspector.js`.
- Backpack button and `B` open the main character modal on `Resources`.
- Main modal tabs are `Resources`, `Build`, `Craft`, `Stats`, and `Research`.
- Quickbar supports build/craft switching, missing-resource tooltips, and `Q` weapon cycling with opt-in state stored under `evolution_weapon_cycle_v1`.
- Combat uses weapon profiles `sword`, `spear`, `bow`, and `special` with different reach, cadence, and boss multipliers.
- Boss zones and ruined outposts are generated from terrain rules, shown on minimap/world map, and persisted through chunk save data.
- Barracks supports reserve troops with command modes `Hold Position`, `Follow Player`, and `Attack Target`.
- Current troop roster is `swordsman` at level 1, then `spearman` and `archer` at level 2.
- `building.armory` is a support military building, not a hard dependency.
- Worker-targeting AI and worker-danger warning systems are intentionally disabled.

## Style Architecture

- `style.css` is only the stylesheet entry point. It imports the real UI files from `styles/`.
- `styles/core.css` holds core HUD surfaces, overlays, labels, notifications, and shared variables.
- `styles/quickbar.css` holds quickbar, weapon switchbar, map popup, and building/world utility surfaces.
- `styles/modal-shell.css` holds modal frame, left-side player card, inventory shell, and shared bag layout.
- `styles/modal-panels.css` holds right-side tab panels, management cards, loadout cards, and panel grids.
- `styles/polish.css` holds lightweight animation and tooltip polish.
- `styles/responsive.css` holds viewport breakpoints and mobile layout overrides.
- For HUD work, do not assume `style.css` contains the actual rules anymore.

## Runtime Load Order

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

- `GameRegistry` in `engine/registry.js`: merged content/balance lookups, derived descriptions, stat summaries, and animal helpers.
- `GameState` in `engine/gameState.js`: canonical save state for resources, inventory, player, hunger, time, instances, fire fuel, and chunks.
- `GameStorage` in `storage/localStorage.js`: autosave, throttling, world/core save split, and managed-storage reset.
- `GameQualitySettings` in `engine/qualitySettings.js`: graphics presets under `evolution_quality_settings_v1`. Default preset is `medium`.
- `GameDebugSettings` in `ui/hud/debugSettings.js`: runtime toggles for HUD/world FX/simulation under `evolution_debug_settings_v1`.
- `GameI18n` in `ui/i18n.js`: language persistence, DOM translation, and content overrides under `evolution_language_v1`.
- `GameHUD` in `ui/hud.js`: top-level HUD state, quickbar, modal state, notifications, overlay rendering, and public API wrappers.
- `GameHUDModules.createModalPanelsModule` in `ui/hud/modalPanels.js`: renders `Resources`, `Build`, `Craft`, `Stats`, and `Research` tabs.
- `GameHUDModules.createSettingsPanelModule` in `ui/hud/settingsPanel.js`: renders `Graphics`, `Language`, `Overlay`, `World FX`, `Simulation`, and `Reset` tabs.
- `GameHUDModules.createInspectorModule` in `ui/hud/inspector.js`: building inspector, barracks controls, and destroy confirmation.
- `GameCombat` in `world/combat.js`: combat loop, weapon profiles, boss rewards, death, and respawn.
- `GameTerrain` in `world/terrain.js`: chunk generation, predator zones, boss zones, ruined outposts, and chunk object persistence.
- `MiniMap` in `world/minimap.js`: minimap/full map rendering, danger overlays, and boss/outpost markers.
- `GamePlayer` in `world/player.js`: movement, interaction prompts, tutorial/world speech, combat click routing, and site loot.
- `BarracksTroopSystem` in `world/barracksTroopSystem.js`: reserve troop spawning, formation logic, and follow/guard/attack-target behavior.

## Gameplay Notes

- `building.berry_gatherer` is the Resident House. Residents gather `wood`, `stone`, `flint`, and `berries`, and help nearby farm/tree nursery plots.
- `building.farm_plot` and `building.tree_nursery` are worker-driven automation surfaces.
- Workers stop at night outside active campfire light coverage. Shared truth lives in `FireSystem.getLightCoverageAt()`.
- `building.well` supports farm plots and adds a small passive food trickle.
- `building.bridge` marks water tiles traversable.
- `building.watchtower` attacks threat animals only and can receive reserve support from nearby barracks.
- Ranged weapons include `equipment.hunting_bow`, `equipment.bronze_bow`, and `equipment.iron_longbow`.
- Boss rewards are relic weapons `equipment.moonfang_blade`, `equipment.sunpiercer_bow`, and `equipment.stormspine_glaive`.
- World-site loot exists through `site.ruined_outpost` and is salvaged directly by the player.
- `animal.deer` and `animal.rabbit` are prey. Wolves, boars, bears, lions, bandits, sabertooths, and boss animals are threats.
- New games start at `06:00`.
- Tutorial persistence uses `evolution_tutorial_v1`.

## Task Routing

- Content names, unlocks, recipes, progression, and entity presence: `content/*.js`, then `balance/balance.js` for numbers or behavior.
- Modal/tab work: update `index.html`, `ui/hud.js`, `ui/hud/modalPanels.js`, `ui/i18n.js`, and the relevant files in `styles/` together.
- Quickbar, backpack entry, weapon cycle, notifications, and objective tracker: update `ui/hud.js`, `ui/hud/modalPanels.js`, `index.html`, `ui/i18n.js`, and usually `styles/core.css`, `styles/quickbar.css`, or `styles/responsive.css`.
- Settings popup/runtime toggles: update `ui/hud/settingsPanel.js`, `ui/hud/debugSettings.js`, `engine/qualitySettings.js`, `ui/hud.js`, and matching style files.
- Localization/display-language issues: update `ui/i18n.js`, then check `engine/registry.js` if descriptions are derived.
- Combat feel, attack range, boss rewards, death flow, or weapon profiles: update `world/combat.js`, `balance/balance.js`, `world/player.js`, and `world/entities.js`.
- Barracks, watchtower, armory, troop modes, or inspector summaries: update `main.js`, `world/barracksTroopSystem.js`, `ui/hud/inspector.js`, `balance/balance.js`, and `world/minimap.js`.
- Boss zones, ruined outposts, map overlays, or chunk persistence: update `world/terrain.js`, `world/minimap.js`, `world/player.js`, `world/entities.js`, `engine/gameState.js`, and `storage/localStorage.js`.
- Save/load, reset, autosave, or storage keys: update `engine/gameState.js`, `storage/localStorage.js`, and `main.js`.
- Local dev cheat panel work: update `dev/localCheatLoader.js` and `dev/local-cheat-panel/`. The loader may remain wired in `index.html`, but its missing-asset path must stay silent and non-blocking.

## Safe Change Rules

1. Preserve global names such as `GameHUD`, `GameI18n`, `GameState`, `GameRegistry`, `GameQualitySettings`, `GameDebugSettings`, `GameSpatialIndex`, `GameCombat`, and `GameActions`.
2. Prefer content/balance fixes over runtime special cases.
3. When adding or changing a modal tab, update both DOM and CSS split files, not just `style.css`.
4. When editing localization, verify both `ui/i18n.js` and any runtime-derived description path in `engine/registry.js`.
5. When editing animal meshes, keep direct child mesh names `leg` and `tail`; animation code still depends on them.
6. When editing save-sensitive features, verify new-save defaults, old-save load behavior, chunk unload/reload behavior, and full reset behavior.
7. Do not load `dev/validate.js` in the release runtime. If you touch `dev/localCheatLoader.js`, preserve its lazy optional-load behavior and silent no-op path when local files are missing.
8. Do not reorder runtime scripts unless the task is explicitly about boot order.
9. Worker-threat systems are intentionally blocked. Do not re-enable worker-danger HUD/minimap/objective output without restoring the underlying simulation rules too.
10. Hidden legacy buildings exist for compatibility only. Do not surface or remove them casually without checking save migration impact.

## Known Limitations

- Worker-targeting AI and worker-danger HUD/minimap warnings are permanently disabled.
- Barracks troops are still reserve/deployed helpers, not fully direct-controlled squads.
- Watchtower loot is not auto-transferred into spendable stock.
- Watchtower support bonuses can exceed the visible base range ring.
- NPC pathing is still simple direct-line movement.
- Not every user-facing string is localized yet.

## Validation

- Syntax check edited JS files with `node --check path/to/file.js`.
- Repo-wide syntax sweep in PowerShell:
  `Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`
- Use editor diagnostics after larger edits.
- Manual release smoke test lives in `manual.md`.
- Feature implementation status lives in `feature.md`.
- Optional validator: temporarily wire `dev/validate.js` in a local-only session and run `GameValidator.printReport()` in the browser console. Do not ship that script in release.
