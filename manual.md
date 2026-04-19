## Release Smoke Test

Run this checklist before tagging a release build.

### 1. Boot And Basic UX
- Open `index.html` from your normal local server flow.
- Confirm the loading screen finishes and the world renders.
- Confirm HUD appears without broken layout in desktop view.
- Confirm the settings panel opens and closes.
- Confirm normal runtime still works when local cheat-panel assets are absent.

### 2. Save And Reset
- Start a new run and gather a few resources.
- Reload the page and confirm player state, inventory, time, and explored world persist.
- Use `Reset Progress` and confirm only save/world progress resets.
- Use `Reset Everything` and confirm save, world data, language, tutorial state, graphics preset, and runtime toggles are cleared.

### 3. Progression Loop
- Gather `wood`, `stone`, `flint`, and `berries`.
- Build the early settlement core: Resident House, Campfire, Warehouse.
- Confirm age progression unlocks still appear in order: Stone Age -> Bronze Age -> Iron Age.
- Confirm build/craft tabs show missing-resource states correctly.

### 4. Farming And Night Rules
- Place a farm plot and tree nursery.
- Confirm workers stop at night outside active fire light.
- Confirm fire coverage changes worker behavior again after refuel.
- Confirm wells support farm output.

### 5. Combat And Exploration
- Fight at least one normal threat animal and one prey animal.
- Confirm weapon switching still works for melee and ranged loadouts.
- Confirm minimap/world map markers appear for discovered boss zones and ruined outposts.
- Confirm salvaging a ruined outpost gives loot directly to the player.

### 6. Barracks And Defense
- Build a barracks and queue a troop.
- Confirm reserve capacity, queue progress, and command modes work.
- Build a watchtower and confirm it attacks threat animals only.
- If available, verify armory bonuses do not break troop/watchtower flows.

### 7. Localization And Responsive Layout
- Switch language and confirm key HUD/modal text updates.
- Check quickbar, modal, settings panel, and minimap layout at desktop and narrow-width viewport sizes.
- Confirm no obvious overlap around quickbar, notification, objective tracker, and player panel.

### 8. Final Release Gate
- Run repo-wide syntax check: `Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }`
- Confirm `dev/validate.js` is not loaded in release runtime.
- Confirm `dev/localCheatLoader.js` still fails safely when local cheat-panel assets are absent.
- Re-read `AGENTS.md` and ensure it still matches the shipped repo structure.
