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
            copy: 'Adjust graphics, language, overlay, world FX, and simulation in separate tabs so each category stays in its own lane.',
            close: 'Close'
          },
          sidebar: {
            label: 'Settings Sections',
            note: 'Use the sidebar to separate graphics presets, language, overlay, world FX, and simulation switches.'
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
            }
          },
          graphics: {
            current: {
              kicker: 'Current Profile',
              title: '{name} preset active',
              copy: 'Choose how much visual detail and rendering cost the game should target.',
              note: 'Changing a preset here updates graphics quality only in this Settings flow. Language, Overlay, World FX, and Simulation stay in their own tabs.'
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
            note: 'Changes here only affect this runtime category. Graphics and Language stay in their own tabs.',
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
          prompt: {
            kicker: 'Performance Advisory',
            title: 'FPS is staying low',
            copy: 'Average is around {fps} FPS ({frameMs} ms). Switch to {name} to reduce CPU and rendering load?',
            accept: 'Switch to {name}',
            snooze: 'Not now',
            dismiss: 'Keep current'
          }
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
      }
    },
    vi: {
      dom: {
        quickbarBagLabel: 'Túi',
        quickbarBagHint: 'B',
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
            copy: 'Tách riêng đồ họa, ngôn ngữ, HUD, hiệu ứng thế giới và mô phỏng theo từng tab để mỗi nhóm thiết lập không lẫn vào nhau.',
            close: 'Đóng'
          },
          sidebar: {
            label: 'Nhóm cài đặt',
            note: 'Dùng thanh bên để tách preset đồ họa, ngôn ngữ, HUD, hiệu ứng thế giới và các công tắc mô phỏng.'
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
            }
          },
          graphics: {
            current: {
              kicker: 'Hồ sơ hiện tại',
              title: 'Đang dùng preset {name}',
              copy: 'Chọn mức chi tiết hình ảnh và chi phí render mà game nên nhắm tới.',
              note: 'Đổi preset ở đây chỉ tác động tới đồ họa trong luồng Cài đặt này. Ngôn ngữ, HUD, FX thế giới và Mô phỏng nằm ở tab riêng.'
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
            note: 'Các thay đổi ở đây chỉ tác động tới nhóm runtime này. Đồ họa và Ngôn ngữ nằm ở tab riêng.',
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
          prompt: {
            kicker: 'Tư vấn hiệu năng',
            title: 'FPS đang thấp',
            copy: 'Trung bình đang ở khoảng {fps} FPS ({frameMs} ms). Chuyển sang {name} để giảm tải CPU và render không?',
            accept: 'Chuyển sang {name}',
            snooze: 'Để sau',
            dismiss: 'Giữ nguyên'
          }
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
        'node.flint': { name: 'Mỏ đá lửa' },
        'node.copper_ore': { name: 'Mỏ đồng' },
        'node.tin_ore': { name: 'Mỏ thiếc' },
        'node.iron_ore': { name: 'Mỏ sắt' },
        'node.coal_ore': { name: 'Mỏ than' },
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
        'building.berry_gatherer': { name: 'Nhà dân' },
        'building.farm_plot': { name: 'Ruộng' },
        'building.flint_mine': { name: 'Mỏ đá lửa' },
        'building.warehouse': { name: 'Kho chứa' },
        'building.barracks': { name: 'Doanh trại' },
        'building.tree_nursery': { name: 'Vườn ươm cây' },
        'building.watchtower': { name: 'Tháp canh' },
        'building.well': { name: 'Giếng' },
        'building.bridge': { name: 'Cầu' },
        'building.copper_mine': { name: 'Mỏ đồng' },
        'building.tin_mine': { name: 'Mỏ thiếc' },
        'building.bronze_smelter': { name: 'Lò nấu đồng' },
        'building.iron_mine': { name: 'Mỏ sắt' },
        'building.coal_mine': { name: 'Mỏ than' },
        'building.blast_furnace': { name: 'Lò cao' },
        'building.blacksmith': { name: 'Lò rèn' },
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
        'recipe.stone_tool': { name: 'Công cụ đá' },
        'recipe.wooden_sword': { name: 'Kiếm gỗ' },
        'recipe.stone_spear': { name: 'Giáo đá' },
        'recipe.stone_shield': { name: 'Khiên đá' },
        'recipe.leather_armor': { name: 'Giáp da' },
        'recipe.leather_boots': { name: 'Giày da' },
        'recipe.bronze_sword': { name: 'Kiếm đồng' },
        'recipe.bronze_shield': { name: 'Khiên đồng' },
        'recipe.bronze_armor': { name: 'Giáp đồng' },
        'recipe.iron_sword': { name: 'Kiếm sắt' },
        'recipe.iron_shield': { name: 'Khiên sắt' },
        'recipe.iron_armor': { name: 'Giáp sắt' },
        'recipe.iron_boots': { name: 'Giày sắt' },
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
    for (var i = 0; i < segments.length; i++) {
      if (!cursor || cursor[segments[i]] === undefined) return undefined;
      cursor = cursor[segments[i]];
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
          entity.name = entityOverride.name || entity._i18nBaseName;
          entity.description = entityOverride.description || entity._i18nBaseDescription;
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