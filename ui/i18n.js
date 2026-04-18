window.GameI18n = window.GameI18n || (function () {
  var STORAGE_KEY = 'evolution_language_v1';
  var DEFAULT_LANGUAGE = 'en';
  var SUPPORTED_LANGUAGES = [
    { id: 'en', label: 'English', nativeLabel: 'English' },
    { id: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' }
  ];
  var _listeners = [];
  var _language = loadLanguage();

  var TRANSLATIONS = {
    en: {
      dom: {
        quickbarBagLabel: 'Bag',
        quickbarBagHint: 'B',
        eatButton: '[F] Eat',
        settingsToggle: 'Settings',
        settingsToggleTooltip: 'Settings (F9)',
        playerPanelTitle: 'Player',
        playerBasicStats: {
          attack: 'ATK',
          defense: 'DEF',
          speed: 'SPD'
        },
        mapTitle: 'WORLD MAP',
        modalTab: {
          resources: 'Resources',
          build: 'Build',
          craft: 'Craft',
          stats: 'Stats',
          research: 'Research'
        },
        playerName: 'Player',
        equipment: 'Equipment',
        inventory: 'Inventory'
      },
      hud: {
        quickbar: {
          mode: {
            build: 'Build',
            craft: 'Craft'
          },
          empty: {
            name: 'Empty',
            status: 'None'
          },
          status: {
            ready: 'Ready',
            need: 'Need',
            use: 'Use'
          },
          notification: {
            modeSwitched: 'Quickbar: {mode} mode',
            alreadyEquipped: 'This item is already equipped.',
            notReady: 'This slot is not ready yet.'
          },
          tooltip: {
            buildTitle: 'Missing materials to build',
            craftTitle: 'Missing materials to craft',
            needMore: 'Need {amount} more',
            openBuild: 'Click to open the Build tab',
            openCraft: 'Click to open the Craft tab'
          }
        },
        modal: {
          header: {
            resources: {
              kicker: 'Economy',
              title: 'Stockpile',
              subtitle: 'Track reserves, monitor income, and spot shortages before they hurt momentum.'
            },
            build: {
              kicker: 'Settlement',
              title: 'Construction',
              subtitle: 'Expand your production network and place the next building with intention.'
            },
            craft: {
              kicker: 'Workshop',
              title: 'Crafting',
              subtitle: 'Turn gathered materials into tools, gear, and milestone unlocks.'
            },
            stats: {
              kicker: 'Progression',
              title: 'Journal',
              subtitle: 'Review your survivor, settlement growth, and the next age objective in one place.'
            },
            research: {
              kicker: 'Knowledge',
              title: 'Research',
              subtitle: 'Spend resources on permanent bonuses and long-term efficiency.'
            }
          },
          build: {
            badges: {
              locked: 'Locked',
              ready: 'Ready',
              needStock: 'Need stock',
              placed: 'Placed x{count}'
            },
            metrics: {
              workers: 'Workers',
              range: 'Range',
              defense: 'Defense',
              storage: 'Storage',
              transfer: 'Transfer',
              light: 'Light',
              guards: 'Guards',
              tiles: '{count} tiles'
            },
            blocks: {
              constructionCost: 'Construction Cost',
              produces: 'Produces',
              consumes: 'Consumes'
            },
            action: {
              locked: 'Locked',
              placeAnother: 'Place another',
              placeStructure: 'Place structure'
            },
            sections: {
              planningKicker: 'Settlement Planning',
              planningTitle: 'Construction Queue',
              planningCopy: 'See which structures you can place now, which ones still need resources, and which blueprints remain locked.',
              readyCount: 'Ready to place',
              blockedCount: 'Need more stock',
              totalPlaced: 'Structures placed',
              readyKicker: 'Ready Now',
              readyTitle: 'Immediate Builds',
              readyCopy: 'These structures are affordable with your current spendable stockpile.',
              blockedKicker: 'Blocked',
              blockedTitle: 'Need More Materials',
              blockedCopy: 'These blueprints are unlocked, but your current stockpile is still short.',
              lockedKicker: 'Future Blueprints',
              lockedTitle: 'Locked Structures',
              lockedCopy: 'Track the requirements that unlock your next set of buildings.',
              empty: 'No building blueprints are available yet.'
            }
          },
          craft: {
            badges: {
              locked: 'Locked',
              equipped: 'Equipped',
              readyToUse: 'Ready to use',
              readyToCraft: 'Ready to craft',
              needMaterials: 'Need materials'
            },
            blocks: {
              output: 'Output',
              input: 'Required Materials',
              result: 'Result',
              yield: 'Yield',
              recipe: 'Recipe'
            },
            action: {
              locked: 'Locked',
              equipped: 'Equipped',
              useItem: 'Use item',
              craft: 'Craft'
            },
            sections: {
              workshopKicker: 'Workshop Flow',
              workshopTitle: 'Crafting Queue',
              workshopCopy: 'Review what can be crafted now, what is waiting on materials, and which upgrades are already equipped.',
              readyCount: 'Ready now',
              waitingCount: 'Need materials',
              equippedCount: 'Already equipped',
              readyKicker: 'Ready Now',
              readyTitle: 'Craft Immediately',
              readyCopy: 'These recipes can be completed with your current stockpile.',
              waitingKicker: 'Waiting',
              waitingTitle: 'Material Shortages',
              waitingCopy: 'Gather or process more resources before these recipes can be completed.',
              equippedKicker: 'Equipped',
              equippedTitle: 'Current Gear',
              equippedCopy: 'These crafted equipment pieces are already active on your survivor.',
              lockedKicker: 'Future Recipes',
              lockedTitle: 'Locked Crafting',
              lockedCopy: 'Unlock new recipes by reaching the next age and settlement milestones.',
              empty: 'No crafting recipes are available yet.'
            }
          }
        },
        notificationLabel: {
          error: 'Alert',
          success: 'Success',
          info: 'Info',
          warning: 'Notice',
          default: 'Update'
        },
        settings: {
          toggle: 'Settings',
          header: {
            kicker: 'Settings',
            title: 'Game Settings',
            copy: 'Adjust graphics, language, overlay, world FX, simulation, and reset actions in separate tabs so each category stays in its own lane.',
            close: 'Close'
          },
          sidebar: {
            label: 'Settings Sections',
            note: 'Use the sidebar to separate graphics presets, language, overlay, world FX, simulation switches, and reset actions.'
          },
          common: {
            active: 'Active',
            apply: 'Apply',
            live: 'Live',
            shortcut: 'Shortcut',
            assist: 'Assist',
            optInOnly: 'Opt-in only'
          },
          tabs: {
            graphics: {
              kicker: 'Render',
              label: 'Graphics',
              title: 'Graphics Presets',
              description: 'Choose render quality here only. This tab should not directly manage the switches in the tabs below.'
            },
            language: {
              kicker: 'Text',
              label: 'Language',
              title: 'Display Language',
              description: 'Control HUD language, localized content names, and speech text from one place.'
            },
            overlay: {
              kicker: 'HUD',
              label: 'Overlay',
              title: 'Overlay Surfaces',
              description: 'Control HUD readability layers, map visibility, and other player-facing interface surfaces.'
            },
            worldFx: {
              kicker: 'Visual',
              label: 'World FX',
              title: 'World FX',
              description: 'Adjust optional ambience and effect systems without touching the core render preset.'
            },
            simulation: {
              kicker: 'CPU',
              label: 'Simulation',
              title: 'Simulation Systems',
              description: 'Profile heavy runtime systems independently when you need to isolate CPU cost.'
            },
            reset: {
              kicker: 'Danger',
              label: 'Reset',
              title: 'Reset And Recovery',
              description: 'Keep destructive reset actions isolated from graphics and runtime controls so they stay deliberate.'
            }
          },
          graphics: {
            current: {
              kicker: 'Current Profile',
              title: '{name} preset active',
              copy: 'Choose how much visual detail and rendering cost the game should target.',
              note: 'Changing a preset here updates graphics quality only in this Settings flow. Language, Overlay, World FX, Simulation, and Reset stay in their own tabs.'
            },
            presets: {
              kicker: 'Graphics Preset',
              title: 'Choose the look and performance target',
              high: {
                label: 'High',
                summary: 'Full effects, full overlays, highest shadow and rain quality.'
              },
              medium: {
                label: 'Medium',
                summary: 'Full effects and rain, overlays on, shadows off.'
              },
              low: {
                label: 'Low',
                summary: 'No shadows, no particles, no atmosphere. Minimal rain still visible.'
              }
            },
            audience: {
              high: 'Stronger desktops',
              medium: 'Balanced default',
              low: 'Older laptops',
              adaptive: 'Adaptive profile'
            },
            pills: {
              shadowsOff: 'Shadows Off',
              shadowsHigh: 'Shadows High',
              shadowsMedium: 'Shadows Medium',
              shadowsOn: 'Shadows On',
              weatherOff: 'Weather Off',
              weatherFull: 'Weather Full',
              weatherLight: 'Weather Light',
              weatherMinimal: 'Weather Minimal',
              particlesOn: 'Particles On',
              particlesOff: 'Particles Off',
              overlaysMinimal: 'Overlays Minimal',
              overlaysFull: 'Overlays Full',
              overlaysBalanced: 'Overlays Balanced',
              renderScale: 'Render Scale {percent}%',
              mapRefreshStandard: 'Map Refresh Standard',
              mapRefreshFast: 'Map Refresh Fast',
              mapRefreshBalanced: 'Map Refresh Balanced',
              mapRefreshEco: 'Map Refresh Eco'
            },
            changed: 'Graphics preset: {name}'
          },
          runtime: {
            controlsTitle: '{title} Controls',
            reset: 'Reset Runtime Toggles',
            note: 'Changes here only affect this runtime category. Graphics, Language, and Reset stay in their own tabs.',
            overlay: {
              title: 'Overlay',
              copy: 'HUD visibility and readability controls that affect what the player sees on screen.',
              items: {
                hud: {
                  label: 'HUD Overlay',
                  hint: 'Show or hide HUD surfaces while keeping the settings controls available.'
                },
                minimap: {
                  label: 'Minimap',
                  hint: 'Show the minimap and allow opening the full world map.'
                },
                worldLabels: {
                  label: 'World Labels',
                  hint: 'Show HP bars, world labels, and storage warning overlays.'
                },
                notifications: {
                  label: 'Notifications',
                  hint: 'Enable toast notifications for combat, crafting, and settlement events.'
                }
              }
            },
            worldFx: {
              title: 'World FX',
              copy: 'Optional effect layers for ambience and impact feedback.',
              items: {
                particles: {
                  label: 'Particles',
                  hint: 'Enable impact sparks, embers, and other particle effects.'
                },
                weather: {
                  label: 'Weather',
                  hint: 'Enable rain simulation and weather visuals.'
                },
                atmosphere: {
                  label: 'Atmosphere',
                  hint: 'Enable ambience updates such as stars, clouds, and wind motion.'
                }
              }
            },
            simulation: {
              title: 'Simulation',
              copy: 'Heavy update loops for entities and automation, useful when profiling CPU load.',
              items: {
                animals: {
                  label: 'Animal Simulation',
                  hint: 'Freeze animal AI and movement updates.'
                },
                npcs: {
                  label: 'NPC Workers',
                  hint: 'Pause worker updates to isolate settlement CPU load.'
                },
                barracksTroops: {
                  label: 'Barracks Troops',
                  hint: 'Pause deployed troop updates and targeting.'
                }
              }
            }
          },
          language: {
            kicker: 'Language',
            title: 'Display Language',
            copy: 'Switch HUD text, localized content names, and speech overlays without reloading the save.',
            active: 'Active',
            apply: 'Use',
            changed: 'Language: {name}'
          },
          reset: {
            progress: {
              kicker: 'Fresh Run',
              title: 'Reset Progress Only',
              copy: 'Start over from a clean save while keeping display language, graphics preset, and runtime toggles on this device.',
              note: 'Use this when you want a fresh run without clearing local preferences.'
            },
            full: {
              note: 'This also clears language, graphics, tutorial, and runtime settings stored in local storage.'
            }
          },
          fullReset: {
            kicker: 'Danger Zone',
            title: 'Full Reset',
            copy: 'Erase the current save, world data, language, tutorials, graphics preset, and runtime toggles for a completely fresh start.',
            button: 'Reset Everything',
            confirm: 'Completely reset the game?\n\nThis will erase saves, world data, language, tutorials, graphics preset, and runtime toggles. This cannot be undone.'
          },
          prompt: {
            kicker: 'Performance Advisory',
            title: 'FPS is staying low',
            copy: 'Average is around {fps} FPS ({frameMs} ms). Switch to {name} to reduce CPU and rendering load?',
            accept: 'Switch to {name}',
            snooze: 'Not now',
            dismiss: 'Keep current'
          }
        },
        resourceBar: {
          showRates: 'Show rates',
          hideRates: 'Hide rates'
        },
        hunger: {
          foodLine: '{hunger}/{max} Food:{food}',
          eatingLine: 'Eating... {hunger}/{max}'
        },
        objective: {
          priorityStatus: 'Priority status',
          currentAge: 'Current Age',
          allAgesUnlockedTitle: 'All Ages Unlocked',
          allAgesUnlockedCopy: 'Current progression content is fully cleared.',
          advanceAge: 'Advance Age',
          settlement: {
            resourceDeficit: '{name} deficit',
            timeRemaining: '{time} left',
            nightLightGap: 'Night-light gap',
            plotPausedOne: '{count} plot paused',
            plotPausedMany: '{count} plots paused',
            workersUnderAttack: 'Workers under attack',
            threatNearWorkers: 'Threat near workers',
            workerAffectedOne: '{count} worker affected',
            workerAffectedMany: '{count} workers affected',
            threatNearBuilding: '{threat} near {building}',
            military: 'Military',
            towerOne: '{count} tower',
            towerMany: '{count} towers',
            supported: '{count} supported',
            reserveOne: '{count} reserve',
            reserveMany: '{count} reserves',
            trainingOne: '{count} training',
            trainingMany: '{count} training',
            barracksOne: '{count} barracks',
            barracksMany: '{count} barracks',
            noDefenseCoverage: 'No active defense coverage',
            stable: 'Settlement stable',
            noUrgent: 'No urgent shortages or threats'
          }
        },
        player: {
          noFoodAvailable: 'No food available.',
          alreadyFull: 'Already full.',
          eatingNotification: 'Eating... ({seconds}s)',
          torchBurnedOut: 'Torch burned out.',
          torchLitNotification: 'Hand torch lit. ({seconds}s)',
          nodeNotReady: '{name} is not ready yet.',
          npcAlreadyHarvesting: 'An NPC is already harvesting this!',
          thisNode: 'This node',
          structureRemoved: 'Structure removed.',
          animalStatLabels: {
            attack: 'Attack',
            defense: 'Defense'
          },
          animalDisposition: {
            threat: 'Threat',
            prey: 'Prey'
          }
        },
        actions: {
          crafted: 'Crafted: {name}',
          savedNow: 'Saved now. Autosave remains active.',
          resetConfirm: 'Reset all progress?',
          cannotUpgrade: 'Cannot upgrade',
          upgradeSuccess: '{name} upgraded to Level {level}!',
          upgradeFailed: 'Upgrade failed',
          buildingNotFound: 'Building not found',
          collected: 'Collected: {items}',
          collectedFromBuilding: 'Collected from {name}: {items}',
          storageEmpty: 'Storage is empty.',
          fuelAlreadyFull: 'Fuel is already full.',
          notEnoughFuel: 'Not enough fuel.',
          refueledSuccess: 'Refueled successfully.',
          workerTendingPlot: 'Worker is tending this plot.',
          invalidAge: 'Invalid age',
          cannotAdvanceToAge: 'Cannot advance to this age',
          mustBeInAgeFirst: 'Must be in {age} first',
          needResource: 'Need {amount} {name}',
          needBuildingCount: 'Need {amount} {name} (have {current})',
          advancedToAge: 'Advanced to {name}!',
          researched: 'Researched: {name}',
          cannotResearchTech: 'Cannot research this technology'
        },
        contextAction: {
          farmPlot: 'Farm Plot',
          collectFrom: 'Collect from {name} ({count} items)',
          collectStored: 'Collect {name} [{count} stored]',
          needsWorker: '{name} [Needs worker]',
          statusWithProgress: '{name} [{status}] {progress}%',
          statusOnly: '{name} [{status}]',
          actions: {
            fight: 'Fight',
            hunt: 'Hunt',
            gather: 'Gather',
            harvest: 'Harvest',
            interact: 'Interact'
          }
        },
        equipment: {
          empty: 'Empty',
          noItems: 'No items',
          slots: {
            weapon: 'Weapon',
            offhand: 'Shield',
            armor: 'Armor',
            boots: 'Boots',
            item: 'Item'
          }
        },
        stats: {
          base: 'Base'
        },
        requirements: {
          reach: 'Reach {name}',
          research: 'Research {name}'
        },
        researchEffects: {
          harvestSpeed: 'Harvest speed +{percent}%',
          production: 'Production +{percent}%',
          storage: 'Storage +{percent}%',
          npcSpeed: 'Worker speed +{percent}%'
        },
        nodes: {
          hpShort: 'HP',
          wood: 'Wood',
          stone: 'Stone',
          food: 'Food',
          workerRange: 'Worker',
          harvestRange: 'Harvest',
          transferRange: 'Transfer',
          waterRange: 'Water',
          lightRange: 'Light',
          defenseRange: 'Defense'
        },
        farm: {
          workerHint: 'Needs a nearby resident worker.',
          workerHintLevel3: 'Needs a nearby resident worker. Watering requires a Level 3 Resident House.',
          workerHintLevel2: 'Needs a Level 2 Resident House nearby. Watering requires Level 3.',
          support: {
            riverBoostApplied: 'River boost applied',
            riverWaterApplied: 'River water applied',
            wellWaterApplied: 'Well water applied'
          },
          nightLight: {
            outsideCampfire: 'Outside active campfire light',
            coverageActive: 'Campfire coverage active',
            daytime: 'Daytime'
          },
          status: {
            idle: 'Idle',
            ready: 'Ready',
            riverFed: 'River-fed',
            watered: 'Watered',
            needsWater: 'Needs Water',
            dry: 'Dry',
            needsWorker: 'Needs Worker',
            nightPaused: 'Night Paused',
            unlitAtNight: 'Unlit at Night'
          },
          detail: {
            aboutToHarvest: 'Worker is about to harvest {yield}.',
            growing: 'Growing {progress}% • {seconds}s cycle • {yield}',
            waitingForWater: 'Waiting for water • {progress}%',
            noWaterSource: 'No water source • {progress}%',
            nearbyResidentWillPlant: 'Nearby resident will plant automatically.',
            readyNightPaused: '{crop} is ready, but workers stop here at night until a fueled campfire covers this plot.',
            growingNightPaused: '{crop} keeps growing, but workers pause here at night until active campfire light reaches this plot.',
            plantNightBlocked: 'Workers will not plant here at night until active campfire light covers this plot.',
            readyButNeedsWorker: '{crop} is ready, but {hint}',
            waitingWorkerSupport: '{crop} is waiting for worker support.'
          },
          actions: {
            collect: 'Collect',
            auto: 'Auto',
            plantAuto: 'Residents handle planting automatically.',
            waterAuto: 'Residents fetch water automatically.',
            harvestAuto: 'Residents harvest crops automatically.'
          },
          worker: {
            active: 'Resident worker active',
            nightPaused: 'Night pause: outside active campfire light',
            needsLevel3Water: 'Nearby resident needs Level 3 to water this plot',
            available: 'Nearby resident worker available',
            busy: 'Nearby resident worker busy',
            walkToPlot: 'Walking to plot',
            walkToCollect: 'Walking to collect plot goods',
            walkToHarvest: 'Walking to harvest plot',
            walkToRiver: 'Walking to river',
            walkToWell: 'Walking to well',
            walkToPlant: 'Walking to plant plot',
            walkToMatureTree: 'Walking to mature tree',
            walkToRiverTree: 'Walking to river for tree',
            walkToWellTree: 'Walking to well for tree',
            drawRiverWaterTree: 'Drawing river water for tree',
            drawWellWaterTree: 'Drawing well water for tree',
            drawRiverWater: 'Drawing river water',
            drawWellWater: 'Drawing well water',
            carryWaterTree: 'Carrying water to young tree',
            carryWaterPlot: 'Carrying water to plot',
            waterGrowingTree: 'Watering growing tree',
            planting: 'Planting {crop}',
            watering: 'Watering {crop}',
            harvesting: 'Harvesting {crop}',
            collectingStored: 'Collecting stored goods',
            tendingPlot: 'Tending plot',
            workerLost: 'Worker lost'
          }
        },
        barracks: {
          noDeployedTroops: 'No deployed troops',
          trainUnitsHint: 'Train units to deploy them around this barracks.',
          supportingPlayer: 'Units are supporting the player in combat.',
          marchingWithPlayer: 'Units are marching with the player.',
          interceptingAnimals: 'Units are intercepting nearby animals.',
          holdingAroundBarracks: 'Units are holding around the barracks.',
          notFound: 'Barracks not found.',
          saveUnavailable: 'Barracks save state unavailable.',
          dataUnavailable: 'Barracks data unavailable.',
          followSuccess: 'Barracks troops are now following the player.',
          guardSuccess: 'Barracks troops are guarding nearby animals.',
          unlocksAtLevel: '{label} unlocks at Barracks level {level}.',
          queueFull: 'Training queue is full.',
          reserveFull: 'Barracks reserve is full. Upgrade to support more units.',
          notEnoughResourcesTrain: 'Not enough resources to train {label}.',
          queuedTraining: 'Queued {label} training.'
        },
        watchtower: {
          scanningForThreats: 'Scanning for threats',
          rearming: 'Rearming',
          scanningWithReserveSupport: 'Scanning with reserve support',
          coordinatingTarget: 'Coordinating {name}',
          trackingTarget: 'Tracking {name}',
          coordinatedFireOn: 'Coordinated fire on {name}',
          firingOn: 'Firing on {name}',
          reserveLineDropped: 'Reserve line dropped {name}',
          dropped: 'Dropped {name}'
        },
        resourcePanel: {
          snapshotKicker: 'Economy Snapshot',
          snapshotTitle: 'Available Resources',
          snapshotCopy: 'These totals reflect everything you can spend right now.'
        },
        statsPanel: {
          overviewKicker: 'Survivor Overview',
          overviewCopy: 'Your current combat, travel, and survivability profile.',
          health: 'Health',
          attack: 'Attack',
          defense: 'Defense',
          speed: 'Speed',
          currentAge: 'Current age',
          worldPosition: 'World position',
          mainObjectiveKicker: 'Main Objective',
          advanceTitle: 'Advance to {name}',
          advanceCopy: 'Fill every bar below to complete the current age milestone.',
          readyNow: 'Ready now',
          inProgress: 'In progress',
          advanceButton: 'Advance',
          clearedTitle: 'Current Content Cleared',
          clearedCopy: 'You have reached the end of the current age progression track.',
          complete: 'Complete',
          settlementKicker: 'Settlement',
          settlementTitle: 'Built Structures',
          settlementCopy: 'A quick view of how your current economy footprint is distributed.',
          totalBuildings: 'Total buildings',
          noBuildingsPlaced: 'No buildings placed yet.',
          lookAheadKicker: 'Look Ahead',
          lookAheadTitle: 'Upcoming Unlocks',
          lookAheadCopy: 'These are the closest content unlocks based on current progress.',
          unlockReady: '{percent}% ready',
          sessionKicker: 'Session',
          sessionTitle: 'Utility Actions',
          sessionCopy: 'Autosave is always active. Use Save Now only when you want an immediate checkpoint.',
          saveNow: 'Save Now',
          resetProgress: 'Reset Progress'
        },
        researchPanel: {
          empty: 'No technologies are available yet.',
          metrics: {
            prerequisites: 'Prerequisites',
            bonuses: 'Bonuses'
          },
          blocks: {
            effects: 'Effects',
            researchCost: 'Research Cost',
            requiredTech: 'Required Tech',
            unlockPath: 'Unlock Path'
          },
          status: {
            needResources: 'Need resources',
            completed: 'Completed',
            readyToResearch: 'Ready to research',
            needPrerequisites: 'Need prerequisites',
            locked: 'Locked'
          },
          actions: {
            research: 'Research'
          },
          sections: {
            overviewKicker: 'Knowledge Track',
            overviewTitle: 'Research Overview',
            overviewCopy: 'Prioritize immediate upgrades, track blocked technology, and review the bonuses you have already secured.',
            readySummary: 'Ready to research',
            waitingSummary: 'Waiting',
            completedSummary: 'Completed',
            readyKicker: 'Ready Now',
            readyTitle: 'Immediate Upgrades',
            readyCopy: 'These technologies can be researched right now with your current stockpile.',
            waitingKicker: 'Waiting',
            waitingTitle: 'Need More Resources',
            waitingCopy: 'The tech is unlocked and all prerequisites are met, but the research cost is still out of reach.',
            lockedKicker: 'Blocked',
            lockedTitle: 'Locked Technology',
            lockedCopy: 'These upgrades still need an unlock condition or prerequisite tech before you can invest in them.',
            completeKicker: 'Archive',
            completeTitle: 'Completed Research',
            completeCopy: 'Permanent bonuses already active across your settlement.'
          }
        },
        inspector: {
          fireBadge: 'FIRE',
          needResources: 'Need Resources',
          maxLevel: 'Max Level',
          storage: 'Storage',
          collect: 'Collect',
          empty: 'Empty',
          fuel: 'Fuel',
          burningCopy: 'Burning down through the night. Refuel fills the bar back to max.',
          lightRadius: 'Light radius: {count} tiles',
          noActiveCoverage: 'No active coverage - out of fuel.',
          coverageActiveNow: 'Coverage active now for nearby workers.',
          coverageNightAuto: 'Coverage turns on automatically at night.',
          refuelCost: 'Refuel',
          doubleClickRefuel: 'Double-click the campfire to quick refuel.',
          refuel: 'Refuel',
          fuelFull: 'Fuel Full',
          storageEmpty: 'Storage empty',
          crop: 'Crop',
          status: 'Status',
          resident: 'Resident',
          nightLight: 'Night light',
          currentYield: 'Current yield',
          dry: 'Dry',
          watered: 'Watered',
          riverBoost: 'River boost',
          stored: 'Stored',
          fromNearby: 'From {count} nearby',
          workers: 'Workers: {current}/{target}',
          queueEmpty: 'Queue empty',
          noTrainedReserves: 'No trained reserves',
          guardNearby: 'Guard Nearby',
          followPlayer: 'Follow Player',
          towerSupport: 'Tower support',
          towerSupportPaused: '(paused while following)',
          trainingQueue: 'Training queue',
          reserveSummary: 'Reserve {current}/{capacity} • Queue {used}/{queue}',
          commandRadius: 'Command radius: {range} • Training speed x{speed}',
          mode: 'Mode: {mode}',
          deployed: 'Deployed: {deployed} • Engaged: {engaged}',
          reserves: 'Reserves: {text}',
          nextUnlock: 'Next unlock: {label} at Lv.{level}',
          noBarracksReserveLink: 'No barracks reserve link',
          linkedBarracksCount: '{count} barracks',
          damageLine: 'Damage: {damage} • Interval: {interval}s • Cooldown: {cooldown}s',
          workerCoverLine: 'Worker cover: {cover} • Shots: {shots} • Kills: {kills}',
          reserveLink: 'Reserve link: {text}',
          supportBonus: 'Support bonus: {text}',
          rangeBonus: '+{count} range',
          damageBonus: '+{count} damage',
          fasterBonus: '{percent}% faster',
          workerCoverBonus: '+{count} worker cover',
          lastTarget: 'Last target: {name}',
          delete: 'Delete',
          close: 'Close',
          deleteConfirm: 'Delete this structure?\nYou will receive a 50% refund.',
          refundHalf: 'Refund 50%: {text}'
        }
      },
      speech: {
        tutorials: {
          harvest: 'Press <span class="tut-key">[E]</span> to gather!',
          eat: 'Hungry? Press <span class="tut-key">[F]</span> to eat',
          night: 'Night is falling! Build a <span class="tut-key">Campfire</span> to stay safe 🔥',
          lag: 'Frame rate is tanking. Open Settings and switch to Low.'
        },
        fireAction: 'Spark it up, keep the fire alive.',
        resourceDiscovery: '{name} spotted. Go pick it up.',
        threatTaunt: {
          first: 'Come on then, take a swing at me.',
          idleNudge: 'Why are you hesitating? Fight it.'
        }
      },
      entities: {
        'building.berry_gatherer': {
          name: 'Resident House',
          description: 'Creates residents who gather wood, stone, flint, and berries, and tend nearby farm plots and tree nursery plots.'
        },
        'building.campfire': {
          name: 'Campfire',
          description: 'Wide night-time light coverage. Costs a lot of Wood and Flint to build, and Wood to refuel.'
        },
        'item.handheld_torch': {
          name: 'Hand Torch',
          description: 'A handheld torch that lights the way at night and burns out after a while.'
        },
        'recipe.handheld_torch': {
          name: 'Hand Torch',
          description: 'Craft a handheld torch. Lights the night for 60s.'
        }
      },
      registry: {
        stats: {
          attack: { label: 'Attack', shortLabel: 'ATK' },
          defense: { label: 'Defense', shortLabel: 'DEF' },
          maxHp: { label: 'Max HP', shortLabel: 'HP' },
          speed: { label: 'Speed', shortLabel: 'SPD' }
        },
        recipeDescription: {
          craft: 'Craft {name}.'
        }
      }
    },
    vi: {
      dom: {
        quickbarBagLabel: 'Túi',
        quickbarBagHint: 'B',
        eatButton: '[F] Ăn',
        settingsToggle: 'Cài đặt',
        settingsToggleTooltip: 'Cài đặt (F9)',
        playerPanelTitle: 'Người chơi',
        playerBasicStats: {
          attack: 'Công',
          defense: 'Thủ',
          speed: 'Tốc'
        },
        mapTitle: 'BẢN ĐỒ THẾ GIỚI',
        modalTab: {
          resources: 'Tài nguyên',
          build: 'Xây dựng',
          craft: 'Chế tạo',
          stats: 'Chỉ số',
          research: 'Nghiên cứu'
        },
        playerName: 'Người chơi',
        equipment: 'Trang bị',
        inventory: 'Túi đồ'
      },
      hud: {
        quickbar: {
          mode: {
            build: 'Xây',
            craft: 'Chế'
          },
          empty: {
            name: 'Trống',
            status: 'Không có'
          },
          status: {
            ready: 'Sẵn',
            need: 'Thiếu',
            use: 'Dùng'
          },
          notification: {
            modeSwitched: 'Quickbar: chế độ {mode}',
            alreadyEquipped: 'Món này đang được trang bị rồi.',
            notReady: 'Ô này chưa sẵn sàng.'
          },
          tooltip: {
            buildTitle: 'Thiếu vật liệu để xây',
            craftTitle: 'Thiếu nguyên liệu để chế',
            needMore: 'Còn thiếu {amount}',
            openBuild: 'Bấm để mở tab Xây dựng',
            openCraft: 'Bấm để mở tab Chế tạo'
          }
        },
        modal: {
          header: {
            resources: {
              kicker: 'Kinh tế',
              title: 'Kho dự trữ',
              subtitle: 'Theo dõi tồn kho, nhịp thu nhập và các điểm nghẽn trước khi chúng làm chậm đà phát triển.'
            },
            build: {
              kicker: 'Khu định cư',
              title: 'Xây dựng',
              subtitle: 'Mở rộng mạng lưới sản xuất và đặt công trình tiếp theo có chủ đích.'
            },
            craft: {
              kicker: 'Xưởng',
              title: 'Chế tạo',
              subtitle: 'Biến vật liệu thu thập được thành công cụ, trang bị và các mốc mở khóa.'
            },
            stats: {
              kicker: 'Tiến trình',
              title: 'Nhật ký',
              subtitle: 'Xem lại nhân vật, đà phát triển khu định cư và mục tiêu thời đại kế tiếp.'
            },
            research: {
              kicker: 'Tri thức',
              title: 'Nghiên cứu',
              subtitle: 'Đầu tư tài nguyên vào các bonus vĩnh viễn và hiệu suất dài hạn.'
            }
          },
          build: {
            badges: {
              locked: 'Khóa',
              ready: 'Sẵn sàng',
              needStock: 'Thiếu kho',
              placed: 'Đã đặt x{count}'
            },
            metrics: {
              workers: 'Nhân công',
              range: 'Tầm',
              defense: 'Phòng thủ',
              storage: 'Kho chứa',
              transfer: 'Chuyển',
              light: 'Ánh sáng',
              guards: 'Lính gác',
              tiles: '{count} ô'
            },
            blocks: {
              constructionCost: 'Chi phí xây',
              produces: 'Tạo ra',
              consumes: 'Tiêu hao'
            },
            action: {
              locked: 'Bị khóa',
              placeAnother: 'Đặt thêm',
              placeStructure: 'Đặt công trình'
            },
            sections: {
              planningKicker: 'Quy hoạch',
              planningTitle: 'Hàng đợi xây dựng',
              planningCopy: 'Xem công trình nào đặt được ngay, công trình nào còn thiếu tài nguyên và bản thiết kế nào vẫn bị khóa.',
              readyCount: 'Đặt được ngay',
              blockedCount: 'Còn thiếu kho',
              totalPlaced: 'Công trình đã đặt',
              readyKicker: 'Làm ngay',
              readyTitle: 'Xây ngay bây giờ',
              readyCopy: 'Các công trình này đang đủ tài nguyên để đặt ngay.',
              blockedKicker: 'Đang thiếu',
              blockedTitle: 'Thiếu vật liệu',
              blockedCopy: 'Các bản thiết kế này đã mở khóa nhưng kho hiện tại vẫn chưa đủ.',
              lockedKicker: 'Tương lai',
              lockedTitle: 'Công trình bị khóa',
              lockedCopy: 'Theo dõi các điều kiện để mở khóa nhóm công trình tiếp theo.',
              empty: 'Chưa có bản thiết kế công trình nào khả dụng.'
            }
          },
          craft: {
            badges: {
              locked: 'Khóa',
              equipped: 'Đang mặc',
              readyToUse: 'Dùng được',
              readyToCraft: 'Chế được',
              needMaterials: 'Thiếu nguyên liệu'
            },
            blocks: {
              output: 'Kết quả',
              input: 'Nguyên liệu cần',
              result: 'Loại',
              yield: 'Sản lượng',
              recipe: 'Công thức'
            },
            action: {
              locked: 'Bị khóa',
              equipped: 'Đang mặc',
              useItem: 'Dùng đồ',
              craft: 'Chế tạo'
            },
            sections: {
              workshopKicker: 'Xưởng',
              workshopTitle: 'Hàng đợi chế tạo',
              workshopCopy: 'Xem món nào chế được ngay, món nào còn thiếu nguyên liệu và món nào đang được trang bị.',
              readyCount: 'Làm được ngay',
              waitingCount: 'Thiếu nguyên liệu',
              equippedCount: 'Đang trang bị',
              readyKicker: 'Làm ngay',
              readyTitle: 'Chế ngay',
              readyCopy: 'Các công thức này có thể hoàn thành với tài nguyên hiện tại.',
              waitingKicker: 'Đang chờ',
              waitingTitle: 'Thiếu nguyên liệu',
              waitingCopy: 'Hãy thu thập hoặc tinh chế thêm tài nguyên trước khi hoàn thành các công thức này.',
              equippedKicker: 'Đang dùng',
              equippedTitle: 'Trang bị hiện tại',
              equippedCopy: 'Các món đồ này đã được chế tạo và đang được nhân vật sử dụng.',
              lockedKicker: 'Tương lai',
              lockedTitle: 'Công thức bị khóa',
              lockedCopy: 'Mở thêm công thức bằng cách tiến lên thời đại mới và đạt các mốc khu định cư.',
              empty: 'Chưa có công thức chế tạo nào khả dụng.'
            }
          }
        },
        notificationLabel: {
          error: 'Cảnh báo',
          success: 'Thành công',
          info: 'Thông tin',
          warning: 'Chú ý',
          default: 'Cập nhật'
        },
        settings: {
          toggle: 'Cài đặt',
          header: {
            kicker: 'Cài đặt',
            title: 'Cài đặt game',
            copy: 'Tách riêng đồ họa, ngôn ngữ, HUD, hiệu ứng thế giới, mô phỏng và các thao tác reset theo từng tab để mỗi nhóm thiết lập không lẫn vào nhau.',
            close: 'Đóng'
          },
          sidebar: {
            label: 'Nhóm cài đặt',
            note: 'Dùng thanh bên để tách preset đồ họa, ngôn ngữ, HUD, hiệu ứng thế giới, các công tắc mô phỏng và các thao tác reset.'
          },
          common: {
            active: 'Đang dùng',
            apply: 'Áp dụng',
            live: 'Đang chạy',
            shortcut: 'Phím tắt',
            assist: 'Hỗ trợ',
            optInOnly: 'Chỉ khi bật'
          },
          tabs: {
            graphics: {
              kicker: 'Render',
              label: 'Đồ họa',
              title: 'Preset đồ họa',
              description: 'Chỉ chỉnh chất lượng render ở đây. Tab này không nên quản lý trực tiếp các công tắc ở những tab bên dưới.'
            },
            language: {
              kicker: 'Chữ',
              label: 'Ngôn ngữ',
              title: 'Ngôn ngữ hiển thị',
              description: 'Quản lý ngôn ngữ HUD, tên nội dung đã nội địa hóa và thoại hiển thị ở một nơi.'
            },
            overlay: {
              kicker: 'HUD',
              label: 'Giao diện',
              title: 'Lớp giao diện',
              description: 'Điều khiển các lớp HUD, minimap và những bề mặt giao diện mà người chơi nhìn thấy.'
            },
            worldFx: {
              kicker: 'Hiệu ứng',
              label: 'FX thế giới',
              title: 'Hiệu ứng thế giới',
              description: 'Chỉnh các hệ ambience và hiệu ứng tùy chọn mà không đụng vào preset render chính.'
            },
            simulation: {
              kicker: 'CPU',
              label: 'Mô phỏng',
              title: 'Hệ mô phỏng',
              description: 'Tách riêng các vòng lặp nặng khi cần soi tải CPU.'
            },
            reset: {
              kicker: 'Nguy hiểm',
              label: 'Reset',
              title: 'Reset và khôi phục',
              description: 'Giữ các thao tác reset mang tính phá hủy tách khỏi đồ họa và công tắc runtime để tránh bấm nhầm.'
            }
          },
          graphics: {
            current: {
              kicker: 'Hồ sơ hiện tại',
              title: 'Đang dùng preset {name}',
              copy: 'Chọn mức chi tiết hình ảnh và chi phí render mà game nên nhắm tới.',
              note: 'Đổi preset ở đây chỉ tác động tới đồ họa trong luồng Cài đặt này. Ngôn ngữ, HUD, FX thế giới, Mô phỏng và Reset nằm ở tab riêng.'
            },
            presets: {
              kicker: 'Preset đồ họa',
              title: 'Chọn mục tiêu hình ảnh và hiệu năng',
              high: {
                label: 'Cao',
                summary: 'Đầy đủ hiệu ứng, đầy đủ overlay, bóng đổ và mưa ở chất lượng cao nhất.'
              },
              medium: {
                label: 'Trung bình',
                summary: 'Đầy đủ hiệu ứng và mưa, overlay bật, tắt bóng đổ.'
              },
              low: {
                label: 'Thấp',
                summary: 'Không bóng đổ, không particle, không atmosphere. Mưa giữ ở mức tối thiểu.'
              }
            },
            audience: {
              high: 'Máy bàn khỏe',
              medium: 'Mặc định cân bằng',
              low: 'Laptop yếu hơn',
              adaptive: 'Hồ sơ thích ứng'
            },
            pills: {
              shadowsOff: 'Tắt bóng đổ',
              shadowsHigh: 'Bóng đổ cao',
              shadowsMedium: 'Bóng đổ vừa',
              shadowsOn: 'Bật bóng đổ',
              weatherOff: 'Tắt thời tiết',
              weatherFull: 'Thời tiết đầy đủ',
              weatherLight: 'Thời tiết nhẹ',
              weatherMinimal: 'Thời tiết tối thiểu',
              particlesOn: 'Bật particle',
              particlesOff: 'Tắt particle',
              overlaysMinimal: 'Overlay tối thiểu',
              overlaysFull: 'Overlay đầy đủ',
              overlaysBalanced: 'Overlay cân bằng',
              renderScale: 'Tỉ lệ render {percent}%',
              mapRefreshStandard: 'Map làm tươi chuẩn',
              mapRefreshFast: 'Map làm tươi nhanh',
              mapRefreshBalanced: 'Map làm tươi cân bằng',
              mapRefreshEco: 'Map làm tươi tiết kiệm'
            },
            changed: 'Preset đồ họa: {name}'
          },
          runtime: {
            controlsTitle: 'Điều khiển {title}',
            reset: 'Đặt lại công tắc runtime',
            note: 'Các thay đổi ở đây chỉ tác động tới nhóm runtime này. Đồ họa, Ngôn ngữ và Reset nằm ở tab riêng.',
            overlay: {
              title: 'Giao diện',
              copy: 'Các điều khiển hiển thị HUD ảnh hưởng trực tiếp tới thứ người chơi nhìn thấy trên màn hình.',
              items: {
                hud: {
                  label: 'HUD tổng',
                  hint: 'Ẩn hoặc hiện HUD nhưng vẫn giữ phần điều khiển cài đặt khả dụng.'
                },
                minimap: {
                  label: 'Minimap',
                  hint: 'Hiện minimap và cho phép mở bản đồ thế giới đầy đủ.'
                },
                worldLabels: {
                  label: 'Nhãn thế giới',
                  hint: 'Hiện thanh máu, nhãn thế giới và cảnh báo kho chứa.'
                },
                notifications: {
                  label: 'Thông báo',
                  hint: 'Bật toast cho chiến đấu, chế tạo và sự kiện khu định cư.'
                }
              }
            },
            worldFx: {
              title: 'FX thế giới',
              copy: 'Các lớp hiệu ứng tùy chọn cho ambience và phản hồi va chạm.',
              items: {
                particles: {
                  label: 'Particle',
                  hint: 'Bật tia va chạm, tàn lửa và các hiệu ứng particle khác.'
                },
                weather: {
                  label: 'Thời tiết',
                  hint: 'Bật mô phỏng mưa và hiệu ứng thời tiết.'
                },
                atmosphere: {
                  label: 'Atmosphere',
                  hint: 'Bật cập nhật ambience như sao, mây và chuyển động gió.'
                }
              }
            },
            simulation: {
              title: 'Mô phỏng',
              copy: 'Các vòng lặp cập nhật nặng cho thực thể và tự động hóa, hữu ích khi soi tải CPU.',
              items: {
                animals: {
                  label: 'Mô phỏng động vật',
                  hint: 'Đóng băng AI và cập nhật di chuyển của động vật.'
                },
                npcs: {
                  label: 'NPC lao động',
                  hint: 'Tạm dừng cập nhật worker để tách tải CPU của khu định cư.'
                },
                barracksTroops: {
                  label: 'Quân doanh trại',
                  hint: 'Tạm dừng cập nhật và nhắm mục tiêu của quân đã triển khai.'
                }
              }
            }
          },
          language: {
            kicker: 'Ngôn ngữ',
            title: 'Ngôn ngữ hiển thị',
            copy: 'Đổi chữ trên HUD, tên nội dung đã nội địa hóa và speech overlay mà không cần tải lại save.',
            active: 'Đang dùng',
            apply: 'Dùng',
            changed: 'Ngôn ngữ: {name}'
          },
          reset: {
            progress: {
              kicker: 'Chơi lại',
              title: 'Reset tiến trình',
              copy: 'Bắt đầu lại từ save sạch nhưng vẫn giữ ngôn ngữ hiển thị, preset đồ họa và các công tắc runtime trên thiết bị này.',
              note: 'Dùng khi bạn muốn chơi lại từ đầu mà không xóa các tùy chọn cục bộ.'
            },
            full: {
              note: 'Thao tác này cũng xóa ngôn ngữ, đồ họa, hướng dẫn và các cài đặt runtime lưu trong local storage.'
            }
          },
          fullReset: {
            kicker: 'Vùng nguy hiểm',
            title: 'Reset toàn bộ',
            copy: 'Xóa sạch save hiện tại, dữ liệu thế giới, ngôn ngữ, hướng dẫn, preset đồ họa và các công tắc runtime để quay về trạng thái mới hoàn toàn.',
            button: 'Xóa sạch và chơi lại',
            confirm: 'Reset toàn bộ game?\n\nThao tác này sẽ xóa save, dữ liệu thế giới, ngôn ngữ, hướng dẫn, preset đồ họa và các công tắc runtime. Không thể hoàn tác.'
          },
          prompt: {
            kicker: 'Tư vấn hiệu năng',
            title: 'FPS đang thấp',
            copy: 'Trung bình đang ở khoảng {fps} FPS ({frameMs} ms). Chuyển sang {name} để giảm tải CPU và render không?',
            accept: 'Chuyển sang {name}',
            snooze: 'Để sau',
            dismiss: 'Giữ nguyên'
          }
        },
        resourceBar: {
          showRates: 'Hiện tốc độ',
          hideRates: 'Ẩn tốc độ'
        },
        hunger: {
          foodLine: '{hunger}/{max} Thức ăn:{food}',
          eatingLine: 'Đang ăn... {hunger}/{max}'
        },
        objective: {
          priorityStatus: 'Ưu tiên hiện tại',
          currentAge: 'Thời đại hiện tại',
          allAgesUnlockedTitle: 'Đã mở toàn bộ thời đại',
          allAgesUnlockedCopy: 'Nội dung tiến trình hiện tại đã hoàn tất.',
          advanceAge: 'Thăng tiến thời đại',
          settlement: {
            resourceDeficit: 'Thiếu {name}',
            timeRemaining: 'còn {time}',
            nightLightGap: 'Thiếu ánh sáng đêm',
            plotPausedOne: '{count} ô ruộng tạm dừng',
            plotPausedMany: '{count} ô ruộng tạm dừng',
            workersUnderAttack: 'Công nhân đang bị tấn công',
            threatNearWorkers: 'Có đe dọa gần công nhân',
            workerAffectedOne: '{count} công nhân bị ảnh hưởng',
            workerAffectedMany: '{count} công nhân bị ảnh hưởng',
            threatNearBuilding: '{threat} gần {building}',
            military: 'Phòng thủ',
            towerOne: '{count} tháp canh',
            towerMany: '{count} tháp canh',
            supported: '{count} được hỗ trợ',
            reserveOne: '{count} quân dự bị',
            reserveMany: '{count} quân dự bị',
            trainingOne: '{count} đang huấn luyện',
            trainingMany: '{count} đang huấn luyện',
            barracksOne: '{count} doanh trại',
            barracksMany: '{count} doanh trại',
            noDefenseCoverage: 'Chưa có tuyến phòng thủ hoạt động',
            stable: 'Khu định cư ổn định',
            noUrgent: 'Không có thiếu hụt hay đe dọa khẩn cấp'
          }
        },
        player: {
          noFoodAvailable: 'Không có thức ăn.',
          alreadyFull: 'Đã no.',
          eatingNotification: 'Đang ăn... ({seconds}s)',
          torchBurnedOut: 'Đuốc đã tắt.',
          torchLitNotification: 'Thắp đuốc tay. ({seconds}s)',
          nodeNotReady: '{name} chưa sẵn sàng.',
          npcAlreadyHarvesting: 'Một NPC đang thu hoạch chỗ này rồi!',
          thisNode: 'Điểm này',
          structureRemoved: 'Đã tháo công trình.',
          animalStatLabels: {
            attack: 'Tấn công',
            defense: 'Phòng thủ'
          },
          animalDisposition: {
            threat: 'Đe dọa',
            prey: 'Con mồi'
          }
        },
        actions: {
          crafted: 'Đã chế: {name}',
          savedNow: 'Đã lưu ngay. Autosave vẫn tiếp tục hoạt động.',
          resetConfirm: 'Reset toàn bộ tiến trình?',
          cannotUpgrade: 'Không thể nâng cấp',
          upgradeSuccess: '{name} đã nâng lên cấp {level}!',
          upgradeFailed: 'Nâng cấp thất bại',
          buildingNotFound: 'Không tìm thấy công trình',
          collected: 'Đã thu: {items}',
          collectedFromBuilding: 'Thu từ {name}: {items}',
          storageEmpty: 'Kho đang trống.',
          fuelAlreadyFull: 'Nhiên liệu đã đầy.',
          notEnoughFuel: 'Không đủ nhiên liệu.',
          refueledSuccess: 'Nạp nhiên liệu thành công.',
          workerTendingPlot: 'Worker đang chăm ô trồng này.',
          invalidAge: 'Thời đại không hợp lệ',
          cannotAdvanceToAge: 'Không thể thăng tiến sang thời đại này',
          mustBeInAgeFirst: 'Trước hết phải ở {age}',
          needResource: 'Cần {amount} {name}',
          needBuildingCount: 'Cần {amount} {name} (đang có {current})',
          advancedToAge: 'Đã thăng tiến lên {name}!',
          researched: 'Đã nghiên cứu: {name}',
          cannotResearchTech: 'Không thể nghiên cứu công nghệ này'
        },
        contextAction: {
          farmPlot: 'Ruộng',
          collectFrom: 'Lấy từ {name} ({count} món)',
          collectStored: 'Thu {name} [{count} đang chứa]',
          needsWorker: '{name} [Cần worker]',
          statusWithProgress: '{name} [{status}] {progress}%',
          statusOnly: '{name} [{status}]',
          actions: {
            fight: 'Đánh',
            hunt: 'Săn',
            gather: 'Nhặt',
            harvest: 'Khai thác',
            interact: 'Tương tác'
          }
        },
        equipment: {
          empty: 'Trống',
          noItems: 'Chưa có vật phẩm',
          slots: {
            weapon: 'Vũ khí',
            offhand: 'Khiên',
            armor: 'Giáp',
            boots: 'Giày',
            item: 'Vật phẩm'
          }
        },
        stats: {
          base: 'Gốc'
        },
        requirements: {
          reach: 'Đạt {name}',
          research: 'Nghiên cứu {name}'
        },
        researchEffects: {
          harvestSpeed: 'Tốc độ thu hoạch +{percent}%',
          production: 'Sản xuất +{percent}%',
          storage: 'Kho chứa +{percent}%',
          npcSpeed: 'Tốc độ worker +{percent}%'
        },
        nodes: {
          hpShort: 'HP',
          wood: 'Gỗ',
          stone: 'Đá',
          food: 'Thức ăn',
          workerRange: 'Nhân công',
          harvestRange: 'Thu hoạch',
          transferRange: 'Chuyển',
          waterRange: 'Nước',
          lightRange: 'Ánh sáng',
          defenseRange: 'Phòng thủ'
        },
        farm: {
          workerHint: 'Cần một cư dân làm việc ở gần.',
          workerHintLevel3: 'Cần một Nhà Cư Dân gần đó. Muốn tưới nước thì Nhà Cư Dân phải đạt cấp 3.',
          workerHintLevel2: 'Cần một Nhà Cư Dân cấp 2 ở gần. Muốn tưới nước thì cần cấp 3.',
          support: {
            riverBoostApplied: 'Đã nhận bonus sông',
            riverWaterApplied: 'Đã lấy nước sông',
            wellWaterApplied: 'Đã lấy nước giếng'
          },
          nightLight: {
            outsideCampfire: 'Ngoài vùng sáng của lửa trại',
            coverageActive: 'Đang trong vùng sáng lửa trại',
            daytime: 'Ban ngày'
          },
          status: {
            idle: 'Rảnh',
            ready: 'Sẵn sàng',
            riverFed: 'Được sông tưới',
            watered: 'Đã tưới',
            needsWater: 'Đang chờ nước',
            dry: 'Khô',
            needsWorker: 'Cần worker',
            nightPaused: 'Tạm dừng ban đêm',
            unlitAtNight: 'Đêm không có sáng'
          },
          detail: {
            aboutToHarvest: 'Worker sắp thu hoạch {yield}.',
            growing: 'Đang lớn {progress}% • chu kỳ {seconds}s • {yield}',
            waitingForWater: 'Đang chờ nước • {progress}%',
            noWaterSource: 'Chưa có nguồn nước • {progress}%',
            nearbyResidentWillPlant: 'Cư dân gần đó sẽ tự trồng.',
            readyNightPaused: '{crop} đã sẵn sàng, nhưng worker sẽ dừng vào ban đêm cho tới khi lửa trại có nhiên liệu chiếu tới ô này.',
            growingNightPaused: '{crop} vẫn tiếp tục lớn, nhưng worker sẽ tạm dừng ban đêm cho tới khi ánh sáng lửa trại hoạt động chiếu tới ô này.',
            plantNightBlocked: 'Worker sẽ không trồng ở đây vào ban đêm cho tới khi có ánh sáng lửa trại hoạt động phủ tới ô này.',
            readyButNeedsWorker: '{crop} đã sẵn sàng, nhưng {hint}',
            waitingWorkerSupport: '{crop} đang chờ worker hỗ trợ.'
          },
          actions: {
            collect: 'Thu',
            auto: 'Tự động',
            plantAuto: 'Cư dân sẽ tự lo việc trồng.',
            waterAuto: 'Cư dân sẽ tự đi lấy nước.',
            harvestAuto: 'Cư dân sẽ tự thu hoạch cây trồng.'
          },
          worker: {
            active: 'Worker cư dân đang làm việc',
            nightPaused: 'Tạm dừng ban đêm: ngoài vùng sáng của lửa trại',
            needsLevel3Water: 'Cư dân gần đó cần cấp 3 mới có thể tưới ô này',
            available: 'Có worker cư dân gần đó',
            busy: 'Worker cư dân gần đó đang bận',
            walkToPlot: 'Đang đi tới ô trồng',
            walkToCollect: 'Đang đi thu hàng trong ô trồng',
            walkToHarvest: 'Đang đi thu hoạch ô trồng',
            walkToRiver: 'Đang đi ra sông',
            walkToWell: 'Đang đi ra giếng',
            walkToPlant: 'Đang đi trồng ô đất',
            walkToMatureTree: 'Đang đi tới cây trưởng thành',
            walkToRiverTree: 'Đang đi ra sông cho cây',
            walkToWellTree: 'Đang đi ra giếng cho cây',
            drawRiverWaterTree: 'Đang lấy nước sông cho cây',
            drawWellWaterTree: 'Đang lấy nước giếng cho cây',
            drawRiverWater: 'Đang lấy nước sông',
            drawWellWater: 'Đang lấy nước giếng',
            carryWaterTree: 'Đang mang nước tới cây non',
            carryWaterPlot: 'Đang mang nước tới ô trồng',
            waterGrowingTree: 'Đang tưới cây đang lớn',
            planting: 'Đang trồng {crop}',
            watering: 'Đang tưới {crop}',
            harvesting: 'Đang thu hoạch {crop}',
            collectingStored: 'Đang nhặt hàng đã lưu',
            tendingPlot: 'Đang chăm ô trồng',
            workerLost: 'Worker bị mất mục tiêu'
          }
        },
        barracks: {
          noDeployedTroops: 'Chưa có quân triển khai',
          trainUnitsHint: 'Hãy huấn luyện quân để triển khai quanh doanh trại này.',
          supportingPlayer: 'Quân đang hỗ trợ người chơi trong chiến đấu.',
          marchingWithPlayer: 'Quân đang hành quân theo người chơi.',
          interceptingAnimals: 'Quân đang chặn các thú gần đó.',
          holdingAroundBarracks: 'Quân đang giữ vị trí quanh doanh trại.',
          notFound: 'Không tìm thấy doanh trại.',
          saveUnavailable: 'Không có trạng thái lưu của doanh trại.',
          dataUnavailable: 'Không có dữ liệu doanh trại.',
          followSuccess: 'Quân doanh trại giờ sẽ đi theo người chơi.',
          guardSuccess: 'Quân doanh trại giờ sẽ canh các thú gần đó.',
          unlocksAtLevel: '{label} mở ở cấp doanh trại {level}.',
          queueFull: 'Hàng đợi huấn luyện đã đầy.',
          reserveFull: 'Kho quân dự bị đã đầy. Hãy nâng cấp để chứa thêm quân.',
          notEnoughResourcesTrain: 'Không đủ tài nguyên để huấn luyện {label}.',
          queuedTraining: 'Đã xếp hàng huấn luyện {label}.'
        },
        watchtower: {
          scanningForThreats: 'Đang quét mối đe dọa',
          rearming: 'Đang nạp lại',
          scanningWithReserveSupport: 'Đang quét cùng hỗ trợ dự bị',
          coordinatingTarget: 'Đang phối hợp với {name}',
          trackingTarget: 'Đang bám mục tiêu {name}',
          coordinatedFireOn: 'Đang bắn phối hợp vào {name}',
          firingOn: 'Đang bắn vào {name}',
          reserveLineDropped: 'Tuyến dự bị đã hạ {name}',
          dropped: 'Đã hạ {name}'
        },
        resourcePanel: {
          snapshotKicker: 'Toàn cảnh kinh tế',
          snapshotTitle: 'Tài nguyên hiện có',
          snapshotCopy: 'Đây là toàn bộ số lượng bạn có thể tiêu ngay lúc này.'
        },
        statsPanel: {
          overviewKicker: 'Tổng quan sống sót',
          overviewCopy: 'Tình trạng chiến đấu, di chuyển và sống sót hiện tại của bạn.',
          health: 'Máu',
          attack: 'Tấn công',
          defense: 'Phòng thủ',
          speed: 'Tốc độ',
          currentAge: 'Thời đại hiện tại',
          worldPosition: 'Vị trí',
          mainObjectiveKicker: 'Mục tiêu chính',
          advanceTitle: 'Tiến tới {name}',
          advanceCopy: 'Lấp đầy mọi thanh dưới đây để hoàn thành mốc của thời đại hiện tại.',
          readyNow: 'Sẵn sàng ngay',
          inProgress: 'Đang tiến hành',
          advanceButton: 'Thăng tiến',
          clearedTitle: 'Đã xong nội dung hiện tại',
          clearedCopy: 'Bạn đã đi hết tuyến tiến trình thời đại hiện có.',
          complete: 'Hoàn tất',
          settlementKicker: 'Khu định cư',
          settlementTitle: 'Công trình đã xây',
          settlementCopy: 'Xem nhanh nền kinh tế hiện tại đang phân bổ ra sao.',
          totalBuildings: 'Tổng công trình',
          noBuildingsPlaced: 'Chưa đặt công trình nào.',
          lookAheadKicker: 'Nhìn trước',
          lookAheadTitle: 'Mở khóa sắp tới',
          lookAheadCopy: 'Đây là các nội dung gần nhất có thể mở theo tiến độ hiện tại.',
          unlockReady: '{percent}% sẵn sàng',
          sessionKicker: 'Phiên chơi',
          sessionTitle: 'Tiện ích',
          sessionCopy: 'Autosave luôn bật. Chỉ dùng Lưu ngay khi bạn muốn tạo mốc lập tức.',
          saveNow: 'Lưu ngay',
          resetProgress: 'Reset tiến trình'
        },
        researchPanel: {
          empty: 'Chưa có công nghệ nào khả dụng.',
          metrics: {
            prerequisites: 'Tiên quyết',
            bonuses: 'Bonus'
          },
          blocks: {
            effects: 'Hiệu ứng',
            researchCost: 'Chi phí nghiên cứu',
            requiredTech: 'Công nghệ bắt buộc',
            unlockPath: 'Lộ trình mở khóa'
          },
          status: {
            needResources: 'Thiếu tài nguyên',
            completed: 'Hoàn tất',
            readyToResearch: 'Sẵn sàng nghiên cứu',
            needPrerequisites: 'Thiếu tiên quyết',
            locked: 'Bị khóa'
          },
          actions: {
            research: 'Nghiên cứu'
          },
          sections: {
            overviewKicker: 'Lộ trình tri thức',
            overviewTitle: 'Tổng quan nghiên cứu',
            overviewCopy: 'Ưu tiên nâng cấp làm được ngay, theo dõi công nghệ đang tắc và xem các bonus đã chốt.',
            readySummary: 'Sẵn sàng nghiên cứu',
            waitingSummary: 'Đang chờ',
            completedSummary: 'Hoàn tất',
            readyKicker: 'Làm ngay',
            readyTitle: 'Nâng cấp tức thì',
            readyCopy: 'Các công nghệ này có thể nghiên cứu ngay với kho hiện tại.',
            waitingKicker: 'Đang chờ',
            waitingTitle: 'Thiếu tài nguyên',
            waitingCopy: 'Công nghệ đã mở và đủ tiên quyết, nhưng chi phí nghiên cứu vẫn chưa đủ.',
            lockedKicker: 'Bị chặn',
            lockedTitle: 'Công nghệ bị khóa',
            lockedCopy: 'Các nâng cấp này vẫn cần điều kiện mở khóa hoặc công nghệ tiên quyết.',
            completeKicker: 'Lưu trữ',
            completeTitle: 'Nghiên cứu hoàn tất',
            completeCopy: 'Các bonus vĩnh viễn đã kích hoạt cho khu định cư.'
          }
        },
        inspector: {
          fireBadge: 'LỬA',
          needResources: 'Thiếu tài nguyên',
          maxLevel: 'Cấp tối đa',
          storage: 'Kho',
          collect: 'Thu',
          empty: 'Trống',
          fuel: 'Nhiên liệu',
          burningCopy: 'Lửa sẽ cháy dần qua đêm. Nạp thêm sẽ đổ đầy thanh trở lại.',
          lightRadius: 'Bán kính sáng: {count} ô',
          noActiveCoverage: 'Không có vùng sáng hoạt động - đã hết nhiên liệu.',
          coverageActiveNow: 'Vùng sáng đang hoạt động cho worker gần đó.',
          coverageNightAuto: 'Vùng sáng sẽ tự bật vào ban đêm.',
          refuelCost: 'Nạp thêm',
          doubleClickRefuel: 'Nhấp đúp vào lửa trại để nạp nhanh.',
          refuel: 'Nạp thêm',
          fuelFull: 'Đầy nhiên liệu',
          storageEmpty: 'Kho trống',
          crop: 'Cây trồng',
          status: 'Trạng thái',
          resident: 'Cư dân',
          nightLight: 'Ánh sáng đêm',
          currentYield: 'Sản lượng hiện tại',
          dry: 'Khô',
          watered: 'Tưới',
          riverBoost: 'Bonus sông',
          stored: 'Đang chứa',
          fromNearby: 'Từ {count} công trình gần',
          workers: 'Worker: {current}/{target}',
          queueEmpty: 'Hàng đợi trống',
          noTrainedReserves: 'Chưa có quân dự bị',
          guardNearby: 'Giữ gần',
          followPlayer: 'Theo người chơi',
          towerSupport: 'Hỗ trợ tháp',
          towerSupportPaused: '(tạm dừng khi đi theo)',
          trainingQueue: 'Hàng đợi huấn luyện',
          reserveSummary: 'Dự bị {current}/{capacity} • Hàng đợi {used}/{queue}',
          commandRadius: 'Bán kính chỉ huy: {range} • Tốc độ huấn luyện x{speed}',
          mode: 'Chế độ: {mode}',
          deployed: 'Đã triển khai: {deployed} • Đang giao chiến: {engaged}',
          reserves: 'Quân dự bị: {text}',
          nextUnlock: 'Mở tiếp: {label} ở Lv.{level}',
          noBarracksReserveLink: 'Chưa nối quân dự bị từ doanh trại',
          linkedBarracksCount: '{count} doanh trại',
          damageLine: 'Sát thương: {damage} • Nhịp: {interval}s • Hồi: {cooldown}s',
          workerCoverLine: 'Che chở worker: {cover} • Bắn: {shots} • Hạ: {kills}',
          reserveLink: 'Liên kết dự bị: {text}',
          supportBonus: 'Bonus hỗ trợ: {text}',
          rangeBonus: '+{count} tầm',
          damageBonus: '+{count} sát thương',
          fasterBonus: 'nhanh hơn {percent}%',
          workerCoverBonus: '+{count} che chở worker',
          lastTarget: 'Mục tiêu gần nhất: {name}',
          delete: 'Xóa',
          close: 'Đóng',
          deleteConfirm: 'Xóa công trình này?\nBạn sẽ nhận lại 50% tài nguyên.',
          refundHalf: 'Hoàn 50%: {text}'
        }
      },
      speech: {
        tutorials: {
          harvest: 'Nhấn <span class="tut-key">[E]</span> để thu hoạch!',
          eat: 'Đói rồi! Nhấn <span class="tut-key">[F]</span> để ăn',
          night: 'Trời tối! Xây <span class="tut-key">Lửa Trại</span> để an toàn 🔥',
          lag: 'Ối dồi ôi, LAG rồi này. Vào setting hạ xuống low đi.'
        },
        fireAction: 'đốt đốt đốt đốt, hẹ hẹ hẹ hẹ',
        resourceDiscovery: '{name} kìa ra nhặt đi ông cháu',
        threatTaunt: {
          first: 'Mày ngon vào ăn tao đi này',
          idleNudge: 'Mày sợ con kia à, đánh nó đi'
        }
      },
      entities: {
        'age.stone': { name: 'Thời Đồ Đá' },
        'age.bronze': { name: 'Thời Đồ Đồng' },
        'age.iron': { name: 'Thời Đồ Sắt' },
        'resource.wood': { name: 'Gỗ' },
        'resource.stone': { name: 'Đá' },
        'resource.food': { name: 'Thức ăn' },
        'resource.flint': { name: 'Đá lửa' },
        'resource.tool': { name: 'Công cụ' },
        'resource.leather': { name: 'Da thuộc' },
        'resource.copper': { name: 'Đồng' },
        'resource.tin': { name: 'Thiếc' },
        'resource.bronze': { name: 'Đồng thiếc' },
        'resource.iron': { name: 'Sắt' },
        'resource.coal': { name: 'Than' },
        'node.tree': { name: 'Cây' },
        'node.rock': { name: 'Đá tảng' },
        'node.berry_bush': { name: 'Bụi dâu' },
        'node.flint_deposit': { name: 'Mỏ đá lửa' },
        'node.copper_deposit': { name: 'Mỏ đồng' },
        'node.tin_deposit': { name: 'Mỏ thiếc' },
        'node.iron_deposit': { name: 'Mỏ sắt' },
        'node.coal_deposit': { name: 'Mỏ than' },
        'animal.wolf': { name: 'Sói' },
        'animal.boar': { name: 'Heo rừng' },
        'animal.bear': { name: 'Gấu' },
        'animal.lion': { name: 'Sư tử' },
        'animal.bandit': { name: 'Thổ phỉ' },
        'animal.sabertooth': { name: 'Hổ răng kiếm' },
        'animal.deer': { name: 'Hươu' },
        'animal.rabbit': { name: 'Thỏ' },
        'building.wood_cutter': { name: 'Trại đốn gỗ' },
        'building.stone_quarry': { name: 'Mỏ đá' },
        'building.berry_gatherer': {
          name: 'Nhà Cư Dân',
          description: 'Tạo cư dân đi gom Gỗ, Đá, Đá lửa, Quả mọng và chăm các ô ruộng cùng vườn ươm cây ở gần.'
        },
        'building.farm_plot': {
          name: 'Ruộng',
          description: 'Ô trồng trọt được cư dân ở gần tự động chăm sóc.'
        },
        'building.flint_mine': { name: 'Mỏ đá lửa' },
        'building.warehouse': {
          name: 'Kho chứa',
          description: 'Kho lớn giúp tăng sản lượng của các công trình gần đó lên 15%.'
        },
        'building.barracks': {
          name: 'Doanh trại',
          description: 'Huấn luyện lực lượng dự bị để bảo vệ khu vực xung quanh.'
        },
        'building.tree_nursery': {
          name: 'Vườn ươm cây',
          description: 'Ươm cây non để cư dân trồng lại, tạo nguồn gỗ tái tạo.'
        },
        'building.watchtower': {
          name: 'Tháp canh',
          description: 'Chòi phòng thủ tầm cao tự bắn thú dữ gần đó và che chở công nhân.'
        },
        'building.well': {
          name: 'Giếng',
          description: 'Cung cấp nước cho ruộng gần đó và thêm một ít thức ăn ổn định.'
        },
        'building.bridge': {
          name: 'Cầu',
          description: 'Giúp băng qua sông và vùng nước nông an toàn.'
        },
        'building.copper_mine': {
          name: 'Mỏ đồng',
          description: 'Tự động khai thác quặng đồng.'
        },
        'building.tin_mine': {
          name: 'Mỏ thiếc',
          description: 'Tự động khai thác quặng thiếc.'
        },
        'building.smelter': {
          name: 'Lò nấu đồng',
          description: 'Nung đồng và thiếc để tạo ra đồng thiếc.'
        },
        'building.iron_mine': {
          name: 'Mỏ sắt',
          description: 'Khai thác quặng sắt từ các mỏ lộ thiên.'
        },
        'building.coal_mine': {
          name: 'Mỏ than',
          description: 'Thu than làm nhiên liệu cho luyện kim.'
        },
        'building.blast_furnace': {
          name: 'Lò cao',
          description: 'Nấu quặng sắt bằng than để tạo ra phôi sắt.'
        },
        'building.blacksmith': {
          name: 'Lò rèn',
          description: 'Chế tạo trang bị sắt cấp cao.'
        },
        'building.campfire': {
          name: 'Đống lửa',
          description: 'Chiếu sáng rộng ban đêm. Cần nhiều Gỗ và Đá lửa để chế tạo, chỉ cần Gỗ để nạp thêm.'
        },
        'equipment.wooden_sword': { name: 'Kiếm gỗ' },
        'equipment.stone_spear': { name: 'Giáo đá' },
        'equipment.stone_shield': { name: 'Khiên đá' },
        'equipment.leather_armor': { name: 'Giáp da' },
        'equipment.leather_boots': { name: 'Giày da' },
        'equipment.bronze_sword': { name: 'Kiếm đồng' },
        'equipment.bronze_shield': { name: 'Khiên đồng' },
        'equipment.bronze_armor': { name: 'Giáp đồng' },
        'equipment.iron_sword': { name: 'Kiếm sắt' },
        'equipment.iron_shield': { name: 'Khiên sắt' },
        'equipment.iron_armor': { name: 'Giáp sắt' },
        'equipment.iron_boots': { name: 'Giày sắt' },
        'item.handheld_torch': {
          name: 'Đuốc tay',
          description: 'Đuốc cầm tay chiếu sáng khi đi đêm. Tự cháy hết sau một lúc.'
        },
        'recipe.stone_tool': {
          name: 'Công cụ đá',
          description: 'Chế tạo một công cụ cơ bản để lao động hiệu quả hơn.'
        },
        'recipe.wooden_sword': {
          name: 'Kiếm gỗ',
          description: 'Chế tạo kiếm gỗ. +3 Công.'
        },
        'recipe.stone_spear': {
          name: 'Giáo đá',
          description: 'Chế tạo giáo đá. +6 Công.'
        },
        'recipe.stone_shield': {
          name: 'Khiên đá',
          description: 'Chế tạo khiên đá. +3 Thủ.'
        },
        'recipe.leather_armor': {
          name: 'Giáp da',
          description: 'Chế tạo giáp da. +5 Thủ, +10 HP.'
        },
        'recipe.leather_boots': {
          name: 'Giày da',
          description: 'Chế tạo giày da. +2 Tốc.'
        },
        'recipe.bronze_sword': {
          name: 'Kiếm đồng',
          description: 'Rèn kiếm đồng. +10 Công.'
        },
        'recipe.bronze_shield': {
          name: 'Khiên đồng',
          description: 'Rèn khiên đồng. +6 Thủ.'
        },
        'recipe.bronze_armor': {
          name: 'Giáp đồng',
          description: 'Rèn giáp đồng. +10 Thủ, +20 HP.'
        },
        'recipe.iron_sword': {
          name: 'Kiếm sắt',
          description: 'Rèn kiếm sắt. +15 Công.'
        },
        'recipe.iron_shield': {
          name: 'Khiên sắt',
          description: 'Rèn khiên sắt. +10 Thủ.'
        },
        'recipe.iron_armor': {
          name: 'Giáp sắt',
          description: 'Rèn giáp sắt. +15 Thủ, +30 HP.'
        },
        'recipe.iron_boots': {
          name: 'Giày sắt',
          description: 'Rèn giày sắt. +3 Tốc, +3 Thủ.'
        },
        'recipe.handheld_torch': {
          name: 'Đuốc tay',
          description: 'Chế tạo đuốc cầm tay. Sáng 60s khi trời tối.'
        },
        'tech.advanced_tools': { name: 'Công cụ nâng cao' },
        'tech.efficient_gathering': { name: 'Thu thập hiệu quả' },
        'tech.expanded_storage': { name: 'Mở rộng kho' },
        'tech.swift_workers': { name: 'Công nhân nhanh nhẹn' },
        'tech.iron_working': { name: 'Luyện sắt' },
        'tech.coal_power': { name: 'Sức mạnh than đá' },
        'tech.fortification': { name: 'Củng cố phòng tuyến' }
      },
      registry: {
        stats: {
          attack: { label: 'Tấn công', shortLabel: 'Công' },
          defense: { label: 'Phòng thủ', shortLabel: 'Thủ' },
          maxHp: { label: 'Máu tối đa', shortLabel: 'HP' },
          speed: { label: 'Tốc độ', shortLabel: 'Tốc' }
        },
        recipeDescription: {
          craft: 'Chế tạo {name}.'
        }
      }
    }
  };

  var BALANCE_TRANSLATION_KEYS = {
    'settings.speechOverlay.tutorials.harvest.text': 'speech.tutorials.harvest',
    'settings.speechOverlay.tutorials.eat.text': 'speech.tutorials.eat',
    'settings.speechOverlay.tutorials.night.text': 'speech.tutorials.night',
    'settings.speechOverlay.tutorials.lag.text': 'speech.tutorials.lag',
    'settings.speechOverlay.fireAction.text': 'speech.fireAction',
    'settings.speechOverlay.resourceDiscovery.text': 'speech.resourceDiscovery',
    'settings.speechOverlay.threatTaunt.first.text': 'speech.threatTaunt.first',
    'settings.speechOverlay.threatTaunt.idleNudge.text': 'speech.threatTaunt.idleNudge'
  };

  function loadLanguage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isSupportedLanguage(saved)) return saved;
    } catch (error) {
      console.warn('[GameI18n] Failed to read saved language:', error);
    }
    return DEFAULT_LANGUAGE;
  }

  function saveLanguage(languageId) {
    try {
      localStorage.setItem(STORAGE_KEY, languageId);
    } catch (error) {
      console.warn('[GameI18n] Failed to save language:', error);
    }
  }

  function isSupportedLanguage(languageId) {
    for (var i = 0; i < SUPPORTED_LANGUAGES.length; i++) {
      if (SUPPORTED_LANGUAGES[i].id === languageId) return true;
    }
    return false;
  }

  function getNestedValue(source, path) {
    if (!source || !path) return undefined;
    var segments = String(path).split('.');
    var cursor = source;
    for (var i = 0; i < segments.length;) {
      if (!cursor) return undefined;

      var matchedLiteralKey = false;
      for (var end = segments.length; end > i; end--) {
        var literalKey = segments.slice(i, end).join('.');
        if (Object.prototype.hasOwnProperty.call(cursor, literalKey)) {
          cursor = cursor[literalKey];
          i = end;
          matchedLiteralKey = true;
          break;
        }
      }

      if (matchedLiteralKey) continue;

      if (cursor[segments[i]] === undefined) return undefined;
      cursor = cursor[segments[i]];
      i += 1;
    }
    return cursor;
  }

  function setNestedValue(target, path, value) {
    if (!target || !path) return;
    var segments = String(path).split('.');
    var cursor = target;
    for (var i = 0; i < segments.length - 1; i++) {
      var segment = segments[i];
      if (!cursor[segment] || typeof cursor[segment] !== 'object') {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    }
    cursor[segments[segments.length - 1]] = value;
  }

  function formatTemplate(value, tokens) {
    var text = String(value == null ? '' : value);
    if (!tokens) return text;
    for (var tokenName in tokens) {
      if (!tokens.hasOwnProperty(tokenName)) continue;
      text = text.split('{' + tokenName + '}').join(String(tokens[tokenName]));
    }
    return text;
  }

  function getLanguageTable(languageId) {
    return TRANSLATIONS[languageId] || TRANSLATIONS[DEFAULT_LANGUAGE] || {};
  }

  function getTranslation(path, tokens, fallback) {
    var currentTable = getLanguageTable(_language);
    var value = getNestedValue(currentTable, path);
    if (value === undefined && _language !== DEFAULT_LANGUAGE) {
      value = getNestedValue(getLanguageTable(DEFAULT_LANGUAGE), path);
    }
    if (value === undefined) value = fallback;
    if (value === undefined) value = path;
    return formatTemplate(value, tokens);
  }

  function applyLocalizedContent() {
    if (window.GAME_CONTENT) {
      for (var packId in window.GAME_CONTENT) {
        if (!window.GAME_CONTENT.hasOwnProperty(packId)) continue;
        var pack = window.GAME_CONTENT[packId];
        if (!pack || !pack.entities || !pack.entities.length) continue;
        for (var entityIndex = 0; entityIndex < pack.entities.length; entityIndex++) {
          var entity = pack.entities[entityIndex];
          if (!entity || !entity.id) continue;
          if (entity._i18nBaseName === undefined) entity._i18nBaseName = entity.name;
          if (entity._i18nBaseDescription === undefined) entity._i18nBaseDescription = entity.description;
          var entityOverride = getNestedValue(getLanguageTable(_language), 'entities.' + entity.id) || {};
          var hasNameOverride = Object.prototype.hasOwnProperty.call(entityOverride, 'name');
          var hasDescriptionOverride = Object.prototype.hasOwnProperty.call(entityOverride, 'description');
          entity._i18nNameOverridden = hasNameOverride;
          entity._i18nDescriptionOverridden = hasDescriptionOverride;
          entity.name = hasNameOverride ? entityOverride.name : entity._i18nBaseName;
          entity.description = hasDescriptionOverride ? entityOverride.description : entity._i18nBaseDescription;
        }
      }
    }

    if (window.GAME_BALANCE) {
      for (var balancePath in BALANCE_TRANSLATION_KEYS) {
        if (!BALANCE_TRANSLATION_KEYS.hasOwnProperty(balancePath)) continue;
        setNestedValue(window.GAME_BALANCE, balancePath, getTranslation(BALANCE_TRANSLATION_KEYS[balancePath], null, getNestedValue(window.GAME_BALANCE, balancePath)));
      }
    }

    if (document && document.documentElement) {
      document.documentElement.lang = _language;
    }
  }

  function applyDomTranslations(root) {
    root = root || document;
    if (!root || !root.querySelectorAll) return;

    var textNodes = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < textNodes.length; i++) {
      var textNode = textNodes[i];
      var textKey = textNode.getAttribute('data-i18n');
      var fallback = textNode.getAttribute('data-i18n-fallback');
      if (fallback === null) fallback = textNode.textContent;
      textNode.textContent = getTranslation(textKey, null, fallback);
    }

    var titleNodes = root.querySelectorAll('[data-i18n-title]');
    for (var titleIndex = 0; titleIndex < titleNodes.length; titleIndex++) {
      var titleNode = titleNodes[titleIndex];
      var titleKey = titleNode.getAttribute('data-i18n-title');
      titleNode.setAttribute('title', getTranslation(titleKey, null, titleNode.getAttribute('title') || ''));
    }

    var ariaNodes = root.querySelectorAll('[data-i18n-aria-label]');
    for (var ariaIndex = 0; ariaIndex < ariaNodes.length; ariaIndex++) {
      var ariaNode = ariaNodes[ariaIndex];
      var ariaKey = ariaNode.getAttribute('data-i18n-aria-label');
      ariaNode.setAttribute('aria-label', getTranslation(ariaKey, null, ariaNode.getAttribute('aria-label') || ''));
    }
  }

  function notify(reason) {
    for (var i = 0; i < _listeners.length; i++) {
      try {
        _listeners[i]({ language: _language, reason: reason || 'update' });
      } catch (error) {
        console.warn('[GameI18n] Listener failed:', error);
      }
    }
  }

  function setLanguage(languageId, reason) {
    var nextLanguage = isSupportedLanguage(languageId) ? languageId : DEFAULT_LANGUAGE;
    if (_language !== nextLanguage) {
      _language = nextLanguage;
      saveLanguage(_language);
    }
    applyLocalizedContent();
    if (window.GameRegistry && GameRegistry.init) {
      GameRegistry.init();
    }
    applyDomTranslations(document);
    notify(reason || 'set-language');
    return nextLanguage;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    _listeners.push(listener);
    return function unsubscribe() {
      var index = _listeners.indexOf(listener);
      if (index >= 0) _listeners.splice(index, 1);
    };
  }

  function init() {
    applyLocalizedContent();
    if (document && document.addEventListener) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          applyDomTranslations(document);
        }, { once: true });
      } else {
        applyDomTranslations(document);
      }
    }
  }

  init();

  return {
    t: getTranslation,
    getLanguage: function () { return _language; },
    getLanguages: function () { return SUPPORTED_LANGUAGES.slice(); },
    getLanguageMeta: function (languageId) {
      for (var i = 0; i < SUPPORTED_LANGUAGES.length; i++) {
        if (SUPPORTED_LANGUAGES[i].id === languageId) return SUPPORTED_LANGUAGES[i];
      }
      return SUPPORTED_LANGUAGES[0];
    },
    setLanguage: setLanguage,
    subscribe: subscribe,
    applyDomTranslations: applyDomTranslations,
    applyLocalizedContent: applyLocalizedContent,
    format: formatTemplate
  };
})();