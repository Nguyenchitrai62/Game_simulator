# Manual Test Guide

This checklist is focused on the features added since the latest commit.
Run it on a fresh save first, then repeat the save/load section on an existing save.

Current release note: threat animals still chase the player, but worker-targeting AI plus worker-danger HUD/minimap warnings are temporarily disabled. Do not fail this release because worker-threat alerts stay empty.

## Recommended Setup

1. Start a new save.
2. Build enough economy to reach:
   - 2 Resident Houses
   - 1 Barracks
   - 1 Campfire
   - 1 Farm Plot
   - 1 Watchtower
3. Keep at least some Wood, Stone, Food, Flint, and Tools available.

## 1. Night Light Worker Pause

Goal: verify F17, F18, F19, F57, F58, F60.

Steps:
1. Place a Farm Plot outside campfire coverage.
2. Wait until night.
3. Open the Farm Plot inspector.
4. Observe the objective tracker and any warning toasts.
5. Move or place a fueled Campfire so the plot is covered.
6. Wait a few seconds and inspect the plot again.

Expected:
1. The plot shows a night-related pause state when outside active campfire light.
2. The inspector shows a night-light line, not just water/worker info.
3. The objective tracker shows a night-light gap alert.
4. After the plot is covered by an active campfire, workers resume normal activity.
5. Campfire inspector shows light radius and whether coverage is active now.

Pay extra attention:
1. A worker should not keep silently working on an unlit plot at night.
2. Warning toasts should appear when work pauses, not only inspector text.

## 2. Barracks Training Queue

Goal: verify F22, F23, F32, F33, F35, F61.

Steps:
1. Unlock and build a Barracks.
2. Open the Barracks inspector.
3. Queue a Swordsman.
4. Let training finish.
5. Upgrade the Barracks to level 2.
6. Queue an Archer.
7. Fill the queue until it is full.
8. Fill reserve capacity and try queueing again.

Expected:
1. Barracks inspector shows reserve count, queue count, training speed, and queue entries with remaining time.
2. Swordsman uses Wood + Food.
3. Archer uses Wood + Food + Flint and only unlocks at Barracks level 2.
4. Level 2 increases queue size and training speed.
5. Clear error messages appear when queue or reserve capacity is full.

Pay extra attention:
1. Barracks description in UI should match the current mechanic of training reserves, not an old "spawns guards" description.

## 3. Watchtower Defense

Goal: verify F21, F39, F62.

Steps:
1. Build a Watchtower near an area where threat animals spawn.
2. Keep a Barracks nearby with at least one trained reserve unit.
3. Open the Watchtower inspector before and after reserve support becomes active.
4. Lure threat animals into tower range.
5. Also lure Deer or Rabbit into range.
6. Let the Watchtower kill at least one threat animal.
7. Check for loot in the tower and near a Warehouse.

Expected:
1. The tower attacks threat animals automatically.
2. The tower does not attack Deer or Rabbit.
3. The inspector shows status, cooldown, shots, kills, and reserve-link information.
4. Reserve support changes tower stats when a linked Barracks has trained units.
5. Loot from tower kills is still obtainable by the player.

Pay extra attention:
1. Compare the Watchtower's displayed combat stats with the visible defense range ring.
2. If the tower gets reserve support, confirm whether the visible range ring and world-map defense ring update or stay at base range.
3. Check whether loot sits in Watchtower storage and needs manual collection instead of flowing into spendable stock automatically.

## 4. Prey Vs Threat Animals

Goal: verify F42, F43, F44, F45.

Steps:
1. Explore near home until you find Deer or Rabbit.
2. Approach them without attacking.
3. Check the context prompt and inspect popup text.
4. Hunt them.
5. Explore farther out until you find Wolves, Boars, Bears, Lions, Bandits, or Sabertooths.
6. Let threat animals aggro onto the player and observe their behavior.

Expected:
1. Deer and Rabbit are labeled and treated as prey.
2. Threat animals are labeled and treated as threats.
3. Prey should flee and not damage the player.
4. Threat animals should chase or pressure the player.

Pay extra attention:
1. Worker-targeting and worker-danger warnings are currently disabled for this release, so the objective tracker and minimap should stay quiet about worker attacks.
2. Prey should still flee and threats should still feel distinct and aggressive toward the player.

## 5. Predator Zones And Minimap

Goal: verify F47, F53, F57, F59.

Steps:
1. Open the full world map after exploring several chunks.
2. Hover chunks near home and farther away.
3. Compare chunks with prey only vs chunks with predators.
4. Compare predator-zone chunks near home versus deeper explored chunks after moving farther into danger areas.

Expected:
1. Threat animals and prey use different icons.
2. Dangerous chunks show stronger danger overlays than safe chunks.
3. Hover text includes danger information when relevant.
4. Danger readability should come from predator-zone overlays and threat icons rather than worker-threat warnings.

Pay extra attention:
1. Confirm that danger coverage is understandable enough for route planning and defense placement.
2. Check that defense coverage and light coverage rings are readable on the world map.

## 6. Save And Load Regression

Goal: verify persistence for the new stateful systems.

Steps:
1. Save while:
   - a Barracks queue is in progress
   - a Barracks has trained reserves
   - a Watchtower has kills/shots recorded
   - it is night and at least one plot is outside active light
2. Reload the page and load the save.
3. Re-open the same Barracks, Watchtower, Campfire, and Farm Plot inspectors.

Expected:
1. Barracks queue progress is still present.
2. Reserve counts are still present.
3. Watchtower state still exists and the tower resumes defending.
4. Time of day and campfire fuel still match the saved state.
5. Night-light pause behavior still works after reload.

## 7. Quick Verdict Checklist

Mark each item PASS or FAIL:
1. Workers pause correctly at night outside active campfire light.
2. Campfire placement/radius is readable enough for night planning.
3. Barracks queue and reserve UI are understandable.
4. Watchtower reliably protects the nearby area from threat animals.
5. Deer and Rabbit behave like prey, not threats.
6. Dangerous chunks are readable on the map.
7. Save/load keeps the new Barracks and Watchtower state.
8. Watchtower loot flow is acceptable for actual play.
9. Watchtower displayed defense radius matches real supported range.

## Notes To Record While Testing

If something fails, write down:
1. Save type: fresh save or old save.
2. Building levels involved.
3. Time of day.
4. Whether a Warehouse was nearby.
5. Whether Barracks reserve support was active.
6. The exact inspector text you saw.