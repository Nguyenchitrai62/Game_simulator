# Feature Backlog

Status legend: `todo`, `doing`, `test`, `done`, or `blocked`.

## Resource And Nodes
- [done] F01 Tree has 3 growth stages and higher stages yield more wood.
- [done] F02 Player can still chop young trees for less wood.
- [done] F03 Rock nodes spawn as small, medium, large and larger ones yield more stone.
- [done] F04 Flint, copper, iron, and coal nodes have richer visual variants.
- [test] F05 Berry bushes can always be harvested, but ripe bushes yield more food.
- [done] F06 Giant tree and giant boulder rare nodes give large rewards.
- [test] F07 World nodes should clearly show their value/state without opening the inspector.

## Simple Farming
- [done] F08 Add farm plot for one basic food crop.
- [done] F09 Farming loop stays limited to plant, water, harvest.
- [done] F10 Crops still grow without water, but slower and with lower yield.
- [done] F11 Watered crops grow faster and yield more food.
- [done] F12 Well supports simple farming by providing water.
- [todo] F13 Keep farming manual first before adding farm workers.
- [done] F14 Add tree nursery or sapling plot for wood farming.
- [done] F15 High-level wood cutter can replant trees in range.
- [done] F16 Do not add disease, fertilizer, livestock, or food-processing complexity in the priority backlog.

## Buildings And Simple Production Loop
- [test] F17 Workers stop working at night when they are outside active light.
- [test] F18 Campfire is critical because it keeps work areas active at night.
- [test] F19 Fire radius is clearly visible for placement decisions.
- [done] F20 Warehouse stays simple and does not grow into a supply-chain system.
- [test] F21 Watchtower protects workers and attacks nearby beasts.
- [test] F22 Barracks becomes the core military building.
- [test] F23 Higher-level barracks unlocks larger queue, faster training, or more unit types.
- [done] F24 Do not prioritize district bonuses or adjacency complexity.

## Player Combat
- [todo] F25 Player can switch between sword and bow.
- [todo] F26 Sword is reliable melee for defense and boss fights.
- [todo] F27 Bow is safer ranged support for dangerous enemies.
- [todo] F28 Each weapon class should feel different before deeper combat systems are added.
- [todo] F29 Bosses drop special weapons with visible effects.
- [todo] F30 Boss loot must noticeably change player power.
- [test] F31 Player combat should stay readable and easy to control.

## Soldiers And Military
- [test] F32 Barracks trains swordman with a wood and food recipe and a short timer.
- [test] F33 Barracks trains archer with a wood, food, and flint recipe and a longer timer.
- [todo] F34 Add spearman later as a third unit type.
- [test] F35 Barracks shows a clear training queue and remaining time.
- [todo] F36 Soldiers can hold position, follow player, or attack a chosen target.
- [todo] F37 Melee soldiers prioritize intercepting threats near workers.
- [todo] F38 Archers stay behind melee units or watchtowers.
- [test] F39 Watchtower plus soldiers forms the core defense setup.
- [todo] F40 Soldier upgrades stay light at first.
- [todo] F41 Armory is optional future expansion, not a priority feature.

## Enemies And Pressure
- [done] F42 Wild beasts remain the main source of meat and leather.
- [test] F43 Beasts can actively attack exposed workers in dangerous areas.
- [test] F44 Worker attacks must immediately slow resource accumulation.
- [test] F45 Split harmless hunt targets from aggressive threats.
- [done] F46 Stronger beasts appear farther from home or at night.
- [test] F47 Beast nests or predator zones create worker danger hotspots.
- [todo] F48 Bosses live in special zones and gate strong rewards.
- [todo] F49 Boss rewards should be unique and combat-defining.
- [done] F50 Do not prioritize deep enemy ecosystems or affix systems yet.

## Exploration And Map
- [done] F51 Resource hotspots appear on the minimap or world map.
- [todo] F52 Boss zones get markers after discovery.
- [test] F53 Dangerous areas should be clearly visible for worker defense planning.
- [todo] F54 Abantodod camps or ruined outposts give immediate useful loot.
- [test] F55 Keep exploration focused on direct gameplay value.

## HUD And UX
- [done] F56 Keep HUD compact and low-noise.
- [test] F57 Prioritize resources, worker danger, night-light status, and military status.
- [test] F58 Show a clear warning when workers stop at night because they are outside light.
- [test] F59 Show a clear warning when workers are under attack.
- [test] F60 Campfire inspector shows fire radius and lit coverage clearly.
- [test] F61 Barracks inspector shows queue, cost, and remaining time.
- [test] F62 Watchtower inspector shows defense radius.
- [todo] F63 Weapon switching UI should be fast and obvious.
- [todo] F64 Boss fight should show a clear HP bar and highlight the reward.
- [done] F65 Objective tracker should focus on direct, short-term goals.
- [done] F66 New UI must stay readable and low-clutter.

## Execution Notes
- Implement one feature at a time.
- After each feature: check errors, run syntax validation for changed JS files, and only then move to the next feature.
- If a feature needs new persistent state, verify save/load before continuing.