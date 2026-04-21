# Evolution Simulator 3D - Agent Guide

## Overview

Browser-only 3D survival/settlement simulator built with vanilla JavaScript globals and local `three.min.js`.
There is no bundler, no framework, and no build step. Runtime starts at `index.html`, reaches `main.js`, then optionally loads `dev/localCheatLoader.js`.

- Progression: Stone Age -> Bronze Age -> Iron Age
- Rendering: Three.js scene with global systems under `window.*`
- Save model: localStorage + compact world/chunk persistence
- Local dev helper: `dev/localCheatLoader.js` is intentionally optional and must stay safe when missing

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

## Runtime Load Order

1. `three.min.js`
2. `content/manifest.js` then content packs in manifest order
3. `balance/balance.js`
4. `ui/i18n.js`
5. `engine/registry.js`, `engine/gameState.js`
6. `engine/perfMonitor.js`, `engine/qualitySettings.js`, `engine/spatialIndex.js`
7. `storage/localStorage.js`
8. Engine systems: `tickSystem` -> `craftSystem` -> `unlockSystem` -> `upgradeSystem` -> `synergy` -> `researchSystem`
9. World systems: `scene` -> `terrain` -> `entities` -> `player` -> `combat` -> `buildingSystem` -> `npcSystem` -> `barracksTroopSystem` -> `rangeIndicator` -> `dayNightSystem` -> `fireSystem` -> `waterSystem` -> `atmosphere` -> `animationSystem` -> `particleSystem` -> `weatherSystem` -> `minimap`
10. HUD chain: `debugSettings` -> `settingsPanel` -> `modalPanels` -> `inspector` -> `hud.js`
11. `main.js`
12. Optional `dev/localCheatLoader.js`

Do not reorder scripts unless the task is explicitly about boot order.

## Key Globals

| Global | File | Role |
| --- | --- | --- |
| `GameHUD` | `ui/hud.js` | Main HUD rendering, quickbar, notifications, lower-left stats |
| `GameI18n` | `ui/i18n.js` | Language switching and translated UI strings |
| `GameState` | `engine/gameState.js` | Canonical save state and derived player/building data |
| `GameRegistry` | `engine/registry.js` | Entity lookup, balance lookup, animal disposition helpers |
| `GameScene` | `world/scene.js` | Scene init, camera, top-level update loop |
| `GameTerrain` | `world/terrain.js` | Chunk generation, walkability, chunk persistence |
| `WaterSystem` | `world/waterSystem.js` | River/lake tile generation and water mesh creation |
| `GameEntities` | `world/entities.js` | World object meshes, animal simulation, respawn sync |
| `GamePlayer` | `world/player.js` | Movement, interaction, attack routing, live move speed |
| `GameCombat` | `world/combat.js` | Combat lock-on, melee/ranged attacks, enemy retaliation |
| `BuildingSystem` | `world/buildingSystem.js` | Placement, previews, build validation, bridge handling |
| `NPCSystem` | `world/npcSystem.js` | Workers, farm/tree care, river/well support logic |
| `BarracksTroopSystem` | `world/barracksTroopSystem.js` | Reserve troops and simple command modes |
| `MiniMap` | `world/minimap.js` | Mini/full map rendering |
| `FireSystem` | `world/fireSystem.js` | Campfire light/fuel coverage |
| `GameStorage` | `storage/localStorage.js` | Save/load/reset/version checks |

## Current Gameplay Notes

- Tile logic uses integer world `x,z` as tile centers.
- Chunk ground/grid visuals are offset by `-0.5` so displayed cells line up with placement logic.
- Rivers currently use 4 layers where present: `bank` -> `shallow` -> `deep` + `deep` -> `shallow` -> `bank`.
- `deep` water is blocked, `shallow` water is walkable and slows the player, `bank` is walkable and also slows the player.
- Player HUD speed in the lower-left card is live effective speed, not just base speed.
- Night clouds are hidden from 18:00 until 06:00 for visibility.
- Animals now share the same base movement loop: idle -> patrol -> return-to-spawn. Threat animals add chase/combat behavior on top.
- Passive animals no longer do a dedicated player-nearby flee routine.
- New game starts at 06:00.
- Tutorial storage key: `evolution_tutorial_v1`.

## High-Impact Files By Topic

| Task | Main Files |
| --- | --- |
| Content, unlocks, recipes, ages | `content/*.js`, `balance/balance.js` |
| Player movement, terrain slowdown, equipment visuals | `world/player.js`, `engine/gameState.js`, `balance/balance.js` |
| Rivers, bridges, bank tiles, walkability | `world/waterSystem.js`, `world/terrain.js`, `world/buildingSystem.js`, `world/minimap.js` |
| Animal behavior and world mesh simulation | `world/entities.js`, `engine/registry.js`, `balance/balance.js` |
| Combat and enemy attack behavior | `world/combat.js`, `world/player.js`, `world/entities.js`, `balance/balance.js` |
| HUD lower-left stats, quickbar, notifications | `ui/hud.js`, `ui/hud/modalPanels.js`, `index.html`, `styles/core.css`, `styles/quickbar.css` |
| Settings/debug toggles | `ui/hud/settingsPanel.js`, `ui/hud/debugSettings.js`, `engine/qualitySettings.js` |
| Modal panels and player stats modal | `ui/hud/modalPanels.js`, `styles/modal-shell.css`, `styles/modal-panels.css` |
| Save/load/reset/versioning | `engine/gameState.js`, `storage/localStorage.js`, `main.js` |
| Boss zones/outposts/chunk persistence | `world/terrain.js`, `world/entities.js`, `world/minimap.js`, `storage/localStorage.js` |
| Dev-only cheat panel | `dev/localCheatLoader.js`, `dev/local-cheat-panel/` |

## Safe Change Rules

1. Preserve existing globals and public runtime wiring.
2. Prefer fixing behavior in balance/data or owning systems instead of layering UI-only hacks.
3. For save-sensitive changes, verify new saves, loaded saves, chunk unload/reload, and reset behavior.
4. Keep `dev/localCheatLoader.js` optional and non-fatal when absent.
5. Do not load `dev/validate.js` in the release runtime.
6. Hidden legacy buildings `wood_cutter`, `stone_quarry`, and `flint_mine` still exist for save compatibility.
7. Worker-threat systems remain intentionally stubbed/disabled; do not silently revive them.
8. When editing localization, check both `ui/i18n.js` and any derived registry text.
9. When editing animal meshes, preserve direct child mesh names `leg` and `tail`.
10. Avoid broad refactors across runtime order, globals, or persistence unless the task truly needs it.

## Release-Oriented Validation

- Single-file syntax check:
  `node --check path/to/file.js`
- Repo-wide syntax check:
  `Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`
- Manual smoke checklist:
  `manual.md`
- Feature checklist/status:
  `feature.md`
- Optional local validation helper:
  open dev console and run `GameValidator.printReport()` only when `dev/validate.js` is intentionally loaded in local testing

## Quick Pitfalls

- `GameState.getPlayerSpeed()` is base-plus-equipment speed; live terrain/eating slowdown comes from `GamePlayer.getCurrentMoveSpeed()`.
- `WaterSystem.getWaterTiles()` only tracks actual water (`deep`/`shallow`), while river banks are tracked separately through `WaterSystem.isRiverBank()`.
- Decorations and resource spawn use terrain overlap checks, so river generation order matters.
- HUD rendering is scheduled; if gameplay state must be reflected immediately, the owning system should request `GameHUD.renderAll()`.
