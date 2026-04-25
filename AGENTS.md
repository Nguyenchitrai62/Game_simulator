# Evolution Simulator 3D - Agent Guide

## Snapshot

Browser-only 3D survival/settlement simulator built with vanilla JavaScript globals and local `three.min.js`.
There is no bundler, no framework, and no build step. Runtime starts at `index.html`, loads ordered script tags, reaches `main.js`, then optionally runs `dev/localCheatLoader.js`.

- Manifest version: `1.2.0`
- Progression: Stone Age -> Bronze Age -> Iron Age
- Save model: `localStorage` + chunk/world persistence
- CSS entry: `style.css` only imports `styles/*.css`
- Local cheat loader stays in runtime and must fail silently when `dev/local-cheat-panel/` assets are absent

## Repository Tree

```text
Game_simulator/
|- .gitignore
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
|  |- local-cheat-panel/        (git-ignored local assets)
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
|  |- modal-panels.css
|  |- modal-shell.css
|  |- polish.css
|  |- quickbar.css
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
2. `content/manifest.js`, then content packs in manifest order
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
| `GameHUD` | `ui/hud.js` | HUD render, quickbar, notifications, player panel |
| `GameI18n` | `ui/i18n.js` | Language switching and translated UI strings |
| `GameState` | `engine/gameState.js` | Canonical save state and derived player/building data |
| `GameRegistry` | `engine/registry.js` | Content + balance merge, lookups, animal disposition |
| `GameScene` | `world/scene.js` | Scene init, camera, top-level update loop |
| `GameTerrain` | `world/terrain.js` | Chunk generation, walkability, persistence |
| `GameEntities` | `world/entities.js` | World object meshes, animal sim, respawn sync |
| `GamePlayer` | `world/player.js` | Movement, interaction, equipment visuals, speech cues |
| `GameCombat` | `world/combat.js` | Combat lock-on, melee/ranged attacks, retaliation |
| `BuildingSystem` | `world/buildingSystem.js` | Placement, previews, build validation, bridges |
| `NPCSystem` | `world/npcSystem.js` | Worker logic, farming/tree care, well support |
| `BarracksTroopSystem` | `world/barracksTroopSystem.js` | Troop reserves and command modes |
| `WaterSystem` | `world/waterSystem.js` | River/lake generation and meshes |
| `FireSystem` | `world/fireSystem.js` | Campfire light/fuel coverage |
| `MiniMap` | `world/minimap.js` | Mini/full map rendering |
| `GameStorage` | `storage/localStorage.js` | Save/load/reset/version checks |

## Current Project Truths

- Tile logic uses integer world `x,z` centers; chunk ground/grid visuals are offset by `-0.5`.
- `deep` water is blocked. `shallow` water and river `bank` tiles are walkable but slow the player.
- Player HUD speed is live effective speed from `GamePlayer.getCurrentMoveSpeed()`, not only base speed.
- Animals use a shared idle -> patrol -> return loop. Threat animals still chase/fight the player.
- Passive animals no longer run a dedicated flee-from-player routine.
- Worker-targeting AI is intentionally disabled. `NPCSystem.reportWorkerThreat()`, `getNearestExposedWorker()`, and `getThreatenedWorkersSummary()` are stubs and should stay that way unless the feature is intentionally redesigned.
- Watchtowers and other defense systems still work against threat animals.
- Night clouds are hidden from `18:00` until `06:00`.
- New game starts at `06:00`.
- Tutorial storage key: `evolution_tutorial_v1`.
- Hidden legacy buildings `wood_cutter`, `stone_quarry`, and `flint_mine` still exist for save compatibility.

## High-Impact Files By Topic

| Topic | Main Files |
| --- | --- |
| Content packs, unlock order, age flow | `content/*.js`, `content/manifest.js`, `balance/balance.js` |
| Registry and entity metadata | `engine/registry.js`, `balance/balance.js`, `ui/i18n.js` |
| Save/load/reset/versioning | `engine/gameState.js`, `storage/localStorage.js`, `main.js` |
| Player movement, combat, equipment, speech | `world/player.js`, `world/combat.js`, `balance/balance.js` |
| Animals and world mesh simulation | `world/entities.js`, `engine/registry.js`, `world/terrain.js` |
| Rivers, banks, bridges, walkability | `world/waterSystem.js`, `world/terrain.js`, `world/buildingSystem.js`, `world/minimap.js` |
| Workers, farming, night-light behavior | `world/npcSystem.js`, `world/fireSystem.js`, `balance/balance.js` |
| Barracks, troops, military upgrades | `world/barracksTroopSystem.js`, `world/buildingSystem.js`, `engine/researchSystem.js`, `balance/balance.js` |
| HUD, modal panels, quickbar, responsive layout | `ui/hud.js`, `ui/hud/modalPanels.js`, `ui/hud/settingsPanel.js`, `styles/*.css`, `index.html` |
| Local-only dev tools | `dev/localCheatLoader.js`, `dev/validate.js` |

## Safe Change Rules

1. Preserve globals, runtime wiring, and script order.
2. Prefer fixing behavior in the owning system or balance/content data instead of layering UI-only workarounds.
3. Content packs are append-oriented: prefer adding new packs and balance entries instead of mutating old progression data unless the task truly requires it.
4. For save-sensitive changes, verify new saves, loaded saves, chunk unload/reload, and both reset flows.
5. Keep `dev/localCheatLoader.js` wired and silent when local cheat assets are missing.
6. Do not load `dev/validate.js` in release runtime.
7. Do not remove hidden legacy buildings that exist only for save compatibility.
8. Do not silently revive worker-threat systems; they are intentionally disabled in shipped gameplay.
9. When editing localization, check `ui/i18n.js` and any entity text surfaced through the registry/HUD.
10. When editing animal meshes, preserve direct child mesh names `leg` and `tail`.

## Release Validation

- Repo syntax check: `Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`
- Changed-file syntax check: `node --check path/to/file.js`
- Manual smoke checklist: `manual.md`
- Feature status / non-features: `feature.md`
- Optional local validation helper: load `dev/validate.js` manually in local testing, then run `GameValidator.printReport()` in the browser console

## Quick Pitfalls

- `GameState.getPlayerSpeed()` is base-plus-equipment speed; gameplay slowdown uses `GamePlayer.getCurrentMoveSpeed()`.
- `WaterSystem.getWaterTiles()` only tracks `deep` and `shallow`; river banks are separate via `WaterSystem.isRiverBank()`.
- Decorations/resources depend on terrain overlap checks, so river generation order matters.
- HUD rendering is scheduled; if gameplay state must show immediately, request `GameHUD.renderAll()` from the owning system.
