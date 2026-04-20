# Evolution Simulator 3D - Agent Guide

## Overview

Browser-only 3D survival/settlement simulator. Vanilla JS globals + local `three.min.js`. No bundler, no framework, no build step. Runtime entry is `index.html`.

- Progression: Stone Age -> Bronze Age -> Iron Age
- Audio bootstrap in `index.html` via `GameAudioController`, assets in `asset/`
- Runtime ends at `main.js`, then optional `dev/localCheatLoader.js` (silent no-op if missing)

## Repository Tree

```text
Game_simulator/
|- AGENTS.md
|- feature.md
|- index.html
|- main.js
|- manual.md
|- style.css                 # CSS entry point (@import all styles/*)
|- three.min.js
|
|- asset/                    # Audio + images
|  |- Chibi.mp3, fire.ogg, lag.ogg, LOGO.png
|
|- balance/
|  |- balance.js             # All numeric tuning, building configs, unit stats, node configs
|
|- content/
|  |- manifest.js            # Version + pack list
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
|  |- localCheatLoader.js    # Lazy optional loader, silent no-op when missing
|  |- validate.js            # Validator, NOT in release runtime
|  |- local-cheat-panel/
|     |- panel.js, style.css
|
|- engine/
|  |- craftSystem.js         # Crafting + auto-equip
|  |- gameState.js           # Canonical save state, instances, chunks, inventory
|  |- perfMonitor.js         # FPS/perf tracking
|  |- qualitySettings.js     # Graphics presets
|  |- registry.js            # Merged content/balance lookups, entity helpers
|  |- researchSystem.js      # Technology research
|  |- spatialIndex.js        # Spatial queries
|  |- synergy.js             # Building proximity bonuses
|  |- tickSystem.js          # Game tick loop, resource production/consumption
|  |- unlockSystem.js        # Age/unlock progression
|  |- upgradeSystem.js       # Building upgrades
|
|- storage/
|  |- localStorage.js        # Autosave, save/load, reset, version check
|
|- styles/
|  |- core.css               # Core HUD, overlays, labels, notifications, shared vars
|  |- quickbar.css           # Quickbar, weapon bar, map popup
|  |- modal-shell.css        # Modal frame, player card, inventory shell
|  |- modal-panels.css       # Tab panels, management/loadout cards
|  |- polish.css             # Animations, tooltip polish
|  |- responsive.css         # Viewport breakpoints, mobile overrides
|
|- ui/
|  |- hud.js                 # Top-level HUD state, quickbar, modal, notifications, overlays
|  |- i18n.js                # Language persistence + DOM translation
|  |- hud/
|     |- debugSettings.js    # Runtime HUD/world/sim toggles
|     |- inspector.js        # Building inspector, barracks, destroy
|     |- modalPanels.js      # Resources, Build, Craft, Stats, Research tabs
|     |- settingsPanel.js    # Graphics, Language, Overlay, World FX, Simulation, Reset
|
|- world/
   |- animationSystem.js
   |- atmosphere.js
   |- barracksTroopSystem.js # Reserve troops, formation, command modes
   |- buildingSystem.js      # Building placement, mesh creation, build mode
   |- combat.js              # Combat loop, weapon profiles, boss rewards, death/respawn
   |- dayNightSystem.js
   |- entities.js            # 3D object management, animal meshes, show/hide/respawn
   |- fireSystem.js          # Campfire light coverage, fuel
   |- minimap.js             # Minimap + full map, danger overlays, markers
   |- npcSystem.js           # NPC workers, gathering AI, specialization
   |- particleSystem.js
   |- player.js              # Movement, interaction, speech, combat routing, site loot
   |- rangeIndicator.js
   |- scene.js               # Scene init, update loop ordering, pause/speed
   |- terrain.js             # Chunk generation, boss zones, ruined outposts, persistence
   |- waterSystem.js
   |- weatherSystem.js
```

## Runtime Load Order

1. `three.min.js`
2. `content/manifest.js` -> content packs (in manifest order)
3. `balance/balance.js`
4. `ui/i18n.js` (must be after balance, before registry)
5. `engine/registry.js`, `engine/gameState.js`
6. `engine/perfMonitor.js`, `engine/qualitySettings.js`, `engine/spatialIndex.js`
7. `storage/localStorage.js`
8. Engine systems: `tickSystem` -> `craftSystem` -> `unlockSystem` -> `upgradeSystem` -> `synergy` -> `researchSystem`
9. World: `scene` -> `terrain` -> `entities` -> `player` -> `combat` -> `buildingSystem` -> `npcSystem` -> `barracksTroopSystem` -> `rangeIndicator` -> `dayNight` -> `fireSystem` -> `waterSystem` -> `atmosphere` -> `animationSystem` -> `particleSystem` -> `weatherSystem` -> `minimap`
10. HUD chain: `debugSettings` -> `settingsPanel` -> `modalPanels` -> `inspector` -> `hud.js` (must be before `main.js`)
11. `main.js`
12. `dev/localCheatLoader.js`

## Key Globals

| Global | File | Role |
|--------|------|------|
| `GameHUD` | `ui/hud.js` | HUD state, quickbar, modal, notifications |
| `GameI18n` | `ui/i18n.js` | Language persistence, DOM translation |
| `GameState` | `engine/gameState.js` | Canonical save state |
| `GameRegistry` | `engine/registry.js` | Entity lookups, descriptions, helpers |
| `GameQualitySettings` | `engine/qualitySettings.js` | Graphics presets |
| `GameDebugSettings` | `ui/hud/debugSettings.js` | Runtime toggles |
| `GameSpatialIndex` | `engine/spatialIndex.js` | Spatial queries |
| `GameCombat` | `world/combat.js` | Combat loop, weapons, death |
| `GamePlayer` | `world/player.js` | Movement, interaction, speech |
| `GameTerrain` | `world/terrain.js` | Chunks, boss zones, persistence |
| `GameEntities` | `world/entities.js` | 3D object lifecycle |
| `BuildingSystem` | `world/buildingSystem.js` | Building placement |
| `NPCSystem` | `world/npcSystem.js` | Worker NPCs |
| `BarracksTroopSystem` | `world/barracksTroopSystem.js` | Troops |
| `MiniMap` | `world/minimap.js` | Minimap + full map |
| `FireSystem` | `world/fireSystem.js` | Campfire light |
| `GameScene` | `world/scene.js` | Scene init, update loop |
| `GameActions` | `main.js` | Public API for UI callbacks |
| `CraftSystem` | `engine/craftSystem.js` | Crafting |
| `UnlockSystem` | `engine/unlockSystem.js` | Unlock progression |
| `UpgradeSystem` | `engine/upgradeSystem.js` | Building upgrades |
| `ResearchSystem` | `engine/researchSystem.js` | Tech research |
| `GameStorage` | `storage/localStorage.js` | Save/load |

## Gameplay Quick Reference

- **Ages**: Stone -> Bronze -> Iron (content packs + balance unlock conditions)
- **Weapons**: `sword`, `spear`, `bow`, `special` with different reach/cadence/boss multipliers
- **Boss rewards**: `moonfang_blade`, `sunpiercer_bow`, `stormspine_glaive` (relic equipment)
- **Prey**: `deer`, `rabbit`. Threats: wolves, boars, bears, lions, bandits, sabertooths, boss animals
- **Troop types**: `swordsman` (L1), `spearman` + `archer` (L2). Command modes: Hold/Follow/Attack
- **Buildings**: `berry_gatherer` = Resident House (gathers wood/stone/flint/berries). `farm_plot`/`tree_nursery` = worker-driven. `well` = farm support + food trickle. `bridge` = water traversal. `watchtower` = threat defense. `armory` = support military. `barracks` = troop training.
- **Workers**: Stop at night outside campfire light coverage (`FireSystem.getLightCoverageAt()`)
- **World sites**: `ruined_outpost` (player salvages loot). Boss zones generated from terrain rules.
- **New game**: starts at 06:00. Tutorial persists via `evolution_tutorial_v1`.

## Task Routing

| Task | Files to update |
|------|----------------|
| Content/unlocks/recipes/progression | `content/*.js`, `balance/balance.js` |
| Modal/tab UI | `index.html`, `ui/hud.js`, `ui/hud/modalPanels.js`, `ui/i18n.js`, `styles/*.css` |
| Quickbar/weapon cycle/notifications | `ui/hud.js`, `ui/hud/modalPanels.js`, `index.html`, `ui/i18n.js`, `styles/core.css`, `styles/quickbar.css` |
| Settings/toggles | `ui/hud/settingsPanel.js`, `ui/hud/debugSettings.js`, `engine/qualitySettings.js`, `ui/hud.js` |
| Localization | `ui/i18n.js`, check `engine/registry.js` for derived descriptions |
| Combat/weapons/boss/death | `world/combat.js`, `balance/balance.js`, `world/player.js`, `world/entities.js` |
| Barracks/troops/inspector | `main.js`, `world/barracksTroopSystem.js`, `ui/hud/inspector.js`, `balance/balance.js`, `world/minimap.js` |
| Boss zones/outposts/chunks | `world/terrain.js`, `world/minimap.js`, `world/player.js`, `world/entities.js`, `engine/gameState.js`, `storage/localStorage.js` |
| Save/load/reset | `engine/gameState.js`, `storage/localStorage.js`, `main.js` |
| Dev cheat panel | `dev/localCheatLoader.js`, `dev/local-cheat-panel/` |

## Style Architecture

`style.css` is the entry point only. It imports from `styles/`:
- `core.css` — HUD surfaces, overlays, labels, notifications, shared variables
- `quickbar.css` — Quickbar, weapon bar, map popup
- `modal-shell.css` — Modal frame, player card, inventory shell
- `modal-panels.css` — Tab panels, management cards
- `polish.css` — Animations, tooltip polish
- `responsive.css` — Viewport breakpoints

Do not assume `style.css` contains actual rules. For HUD work, edit the split files.

## Safe Change Rules

1. Preserve all globals listed in the Key Globals table.
2. Prefer content/balance fixes over runtime special cases.
3. When adding/changing modal tabs, update DOM + CSS split files.
4. When editing localization, check both `ui/i18n.js` and `engine/registry.js` derived descriptions.
5. When editing animal meshes, keep direct child mesh names `leg` and `tail`.
6. When editing save-sensitive features, verify new-save defaults, old-save load, chunk unload/reload, and full reset.
7. Do not load `dev/validate.js` in release runtime.
8. Do not reorder runtime scripts unless task is explicitly about boot order.
9. Worker-threat systems are intentionally disabled. Do not re-enable without restoring underlying simulation rules.
10. Hidden legacy buildings (`wood_cutter`, `stone_quarry`, `flint_mine`) exist for save compatibility only.

## Disabled/Stub Features

- Worker-targeting AI and worker-danger warnings: permanently disabled
- NPC threat response (`isWorkerThreatActive`, `reportWorkerThreat`, `getNearestExposedWorker`): stubs
- NPC specialization bonuses (`getSpecializationBonus`): returns no-op
- Barracks troops: reserve/deployed helpers, not fully direct-controlled squads

## Validation

- Syntax check: `node --check path/to/file.js`
- Repo-wide: `Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`
- Manual smoke test: `manual.md`
- Feature status: `feature.md`
- Optional: `dev/validate.js` -> `GameValidator.printReport()` in console (do not ship)
