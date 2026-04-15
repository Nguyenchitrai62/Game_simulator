# Evolution Simulator 3D — NextGen Architecture Reference

## Overview
A newly refactored version of the 3D evolution simulator using a modern technical stack: **Vite + TypeScript + Babylon.js**.
The project now runs on a strict class-based/OOP paradigm internally and avoids all external models by utilizing procedural generation via `MeshBuilder`.

## Tech Stack
- **Build Tool:** Vite
- **Language:** TypeScript
- **Engine:** `@babylonjs/core`
- **Physics:** `@babylonjs/havok` (Havok Plugin)
- **UI:** `@babylonjs/gui` (No HTML/CSS/DOM manipulation)

## File Structure

```
/src
|-- main.ts                   <- Application entry point
|
|-- /data                     <- Data Definitions
|   |-- types.ts              <- TypeScript interfaces for Entities and Balance
|   |-- content.ts            <- Content pack definitions (Append-only)
|   |-- balance.ts            <- Game parameters tuning
|
|-- /engine                   <- Core Logic (No direct rendering logic)
|   |-- core.ts               <- GameEngine class (Scene, Physics, Camera setup)
|   |-- registry.ts           <- GameRegistry (Merge content + balance)
|   |-- gameState.ts          <- GameState (Mutable state: resources, player)
|   |-- tickSystem.ts         <- TickSystem (Production/consumption ticks)
|
|-- /world                    <- 3D & Physics Layer (Babylon.js)
|   |-- terrain.ts            <- Procedural chunk/terrain generation
|   |-- player.ts             <- Player character (Havok Physics, Input)
|   |-- combat.ts             <- Click-to-attack, simple distance checks
|   |-- dayNightSystem.ts     <- 24h day/night cycle via lighting intensity
|
|-- /ui                       <- User Interfaces (Babylon GUI)
|   |-- hud.ts                <- Resource bars, minimap, modals (100% Canvas UI)
```

## Architectural Rules
1. **Procedural Geometry Only:** We only use Babylon's `MeshBuilder` to create visuals (no external `.gltf`/`.obj` files).
2. **Havok Physics Base:** Physical interactions, movement, and collision MUST use `PhysicsAggregate` with the Havok plugin.
3. **Pure GUI:** Absolutely NO HTML elements should be created for game interface features. Everything must go through `@babylonjs/gui`.
4. **Strict TypeScript:** Code must be strongly typed using defined interfaces. Avoid `any`.
