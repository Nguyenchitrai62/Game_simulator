# Evolution Simulator 3D - Agent Quick Reference

## Overview

- Browser-only 3D survival/settlement simulator.
- Progression: Stone Age -> Bronze Age -> Iron Age.
- Stack: `index.html` + `style.css` + vanilla JS globals + local `three.min.js`.
- No bundler, no framework, no build step.
- Current release entrypoint does not load dev tools.

## Core Rules

1. Content defines what exists; `balance/balance.js` defines numbers.
2. Prefer append-only content packs over mutating old packs.
3. Keep gameplay tuning centralized in `balance/balance.js`.
4. Runtime is global-object based; preserve script load order.
5. UI work usually spans `index.html`, `style.css`, and `ui/hud.js` together.

## Release Snapshot

- Content version from `content/manifest.js`: `2.1.0`.
- Loaded packs: Stone, Bronze, Iron, Fire & Light, Water.
- Runtime dev scripts removed from `index.html` for release.
- Removed from repo for release cleanup: `dev/ai_generate.js`, `dev/preview.js`, `manual.md`.
- Kept as optional tooling only: `dev/validate.js`.

## Repository Map

```text
Game_simulator/
|- index.html                DOM shell + script order
|- main.js                   boot flow + GameActions + canvas click behavior
|- style.css                 all HUD/overlay/layout styling
|- three.min.js              local Three.js bundle
|
|- balance/
|  |- balance.js             all gameplay numbers + hunger/day-night config
|
|- content/
|  |- manifest.js
|  |- base_stone_age.js
|  |- expansion_bronze_age.js
|  |- expansion_iron_age.js
|  |- expansion_fire_light.js
|  |- expansion_water.js
|
|- engine/
|  |- registry.js            content + balance merge
|  |- gameState.js           mutable save state
|  |- tickSystem.js          production/consumption/hunger/fuel tick
|  |- craftSystem.js         crafting
|  |- unlockSystem.js        unlock checks
|  |- upgradeSystem.js       per-instance upgrades
|  |- researchSystem.js      tech research + global bonuses
|  |- synergy.js             proximity bonus wiring
|
|- world/
|  |- scene.js               scene/camera/render loop
|  |- terrain.js             chunked world gen
|  |- entities.js            meshes + animal AI + respawn
|  |- player.js              movement + interaction + hunger movement penalty
|  |- combat.js              click combat loop
|  |- buildingSystem.js      build preview/place/delete visuals
|  |- npcSystem.js           worker AI
|  |- rangeIndicator.js      building radius rings
|  |- dayNightSystem.js      time progression + lighting
|  |- fireSystem.js          fire lights + fuel visuals
|  |- waterSystem.js         rivers/lakes/bridge traversal
|  |- minimap.js             minimap + world map
|  |- atmosphere.js          stars/moon/clouds/wind
|  |- animationSystem.js     tweens + flashes
|  |- particleSystem.js      pooled particles
|  |- weatherSystem.js       rain events
|
|- storage/
|  |- localStorage.js        save/load/version checks
|
|- ui/
|  |- hud.js                 modal, inspector, tracker, quickbar, notifications
|
|- dev/
|  |- validate.js            optional content validator, not loaded in release
```

## Script Load Order

1. Three.js
2. Content packs + `balance/balance.js`
3. Engine core: `registry.js`, `gameState.js`
4. Persistence: `storage/localStorage.js`
5. Engine systems: tick, craft, unlock, upgrade, synergy, research
6. World systems: scene -> terrain -> entities -> player -> combat -> building -> npc -> range/day-night/fire/water/atmosphere/animation/particle/weather/minimap
7. UI: `ui/hud.js`
8. Entry: `main.js`

`ui/hud.js` must stay before `main.js`.

## Entity Namespaces

- `age.*`
- `resource.*`
- `node.*`
- `animal.*`
- `building.*`
- `equipment.*`
- `recipe.*`
- `tech.*`
- `item.*`

## Current HUD / Controls

### Core controls

- `WASD`: move
- `E`: interact / harvest / attack nearby target
- `F`: eat
- `B`: open or close the bag/modal
- `M`: toggle world map
- `Tab`: toggle quickbar mode (`Build` / `Craft`)
- `1-9`: use quickbar slot
- `Delete`: destroy hovered building
- `Esc`: cancel build mode, close modal, or close map

### Current HUD layout

- Top-left: resources bar
- Top-left under resources: compact objective tracker with current age, age checklist, and direct `Advance Age` button
- Top-center: HP bar and hunger bar
- Top-right: day/night clock
- Bottom-left: compact player panel with `ATK`, `DEF`, `SPD`
- Above bottom-left panel: compact notification stack
- Bottom-center: quickbar mode toggle + 9 slots + bag button on the right
- Bottom-right area: context interaction prompt
- Right side: building inspector
- Bottom-right: minimap

### Interaction shortcuts

- Single-click building: open inspector
- Double-click building with stored output: quick collect
- Double-click fire building with missing fuel: quick refuel
- Build mode confirm is still normal click on terrain preview

## Important Runtime State

`window.GameState` stores the live save data. Important fields:

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

- Spendable resources include player resources plus warehouse stock.
- Building state is per-instance via `uid`.
- Fire fuel is tracked separately per fire-capable instance.

## Key Systems

- `GameRegistry`: merges content + balance, primary lookup API.
- `TickSystem`: production, consumption, hunger drain, fuel drain, autosave cadence.
- `CraftSystem`: recipes and equipment crafting/equip flow.
- `UnlockSystem`: multi-pass unlock resolution for age/resources/buildings/tech.
- `UpgradeSystem`: upgrade costs and per-instance level changes.
- `ResearchSystem`: research unlocks + cumulative global bonuses.
- `GamePlayer`: movement, nearby interaction, hunger/eating penalties.
- `GameCombat`: click-to-engage combat loop.
- `NPCSystem`: worker harvesting loops.
- `GameHUD`: modal tabs, quickbar, notifications, objective tracker, inspector.

## Current Gameplay / UX Notes

- Hunger below 20 slows player movement; while eating, movement is also slowed.
- Worker building access was hardened to reduce stuck NPCs around dense placement.
- Animal behavior includes patrol, chase, return, and better combat facing.
- Quickbar is compact and designed for fast keyboard play.
- Objective progression can now advance directly from the tracker without opening Stats.

## Content Snapshot

### Stone Age

- Resources: wood, stone, food, flint, tool, leather
- Nodes: tree, rock, berry_bush, flint_deposit
- Buildings: wood_cutter, stone_quarry, berry_gatherer, flint_mine, warehouse, barracks
- Equipment/recipes cover wood, stone, and leather starter gear

### Bronze Age

- Resources: copper, tin, bronze
- Buildings: copper_mine, tin_mine, smelter
- Gear: bronze sword, shield, armor

### Iron Age

- Resources: iron, coal
- Buildings: iron_mine, coal_mine, blast_furnace, blacksmith
- Gear: iron sword, shield, armor, boots

### Extra packs

- Fire & Light: campfire, handheld torch
- Water: well, bridge

## Release / Debug Notes

- Release `index.html` no longer loads any dev helper scripts.
- `dev/validate.js` is optional and currently kept out of runtime.
- If content integrity must be checked during development, temporarily load `dev/validate.js` and run `GameValidator.printReport()` in the console.

## Known Limitations

- Synergy system exists but almost no buildings currently use real `synergyFrom` data.
- Barracks guard-related behavior is not implemented.
- NPC pathing is still direct-line and weak around obstacles/water.
- NPCs do not properly reason about water tiles.
- Game speed controls are console-driven, not surfaced in UI.
- Some legacy descriptions may still imply bonuses that are not wired in data.

## Safe Change Guidelines

1. Preserve global names used across files (`GameHUD`, `GameActions`, `GameState`, etc.).
2. When changing HUD, verify `index.html`, `style.css`, and `ui/hud.js` together.
3. When changing content, also check `balance/balance.js` and unlock/terrain/NPC implications.
4. Do not reorder scripts casually; many systems depend on global load order.
5. Prefer minimal edits; this repo has no module system to isolate breakage.
