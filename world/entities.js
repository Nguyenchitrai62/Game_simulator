window.GameEntities = (function () {
  var _meshMap = new Map();
  var _dataMap = new Map();
  var _meshCounter = 0;

  function init() {
    // Will populate as chunks are generated
  }

  function createObjectForChunk(chunkData) {
    if (!chunkData.objects) return;
    var cx = chunkData.cx;
    var cz = chunkData.cz;
    var chunkSize = GameTerrain.getChunkSize();

    chunkData.objects.forEach(function (obj) {
      if (obj.hp <= 0 || obj._destroyed) return;
      if (_meshMap.has(obj.id)) return;

      var entity = GameRegistry.getEntity(obj.type);
      var mesh = createMesh(obj.type, entity, obj);

      if (mesh) {
        mesh.position.set(cx * chunkSize + obj.x, 0, cz * chunkSize + obj.z);
        mesh.userData.objectId = obj.id;
        GameScene.getScene().add(mesh);

        _meshMap.set(obj.id, mesh);
        _dataMap.set(mesh.id, obj);
        
        // Set world coordinates for raycast
        obj.worldX = cx * chunkSize + obj.x;
        obj.worldZ = cz * chunkSize + obj.z;
        obj.maxHp = obj.hp;

        if (obj.type && obj.type.startsWith("animal.")) {
          mesh.userData._spawnX = obj.worldX;
          mesh.userData._spawnZ = obj.worldZ;
          mesh.userData._movementState = 'patrol';
          mesh.userData._patrolTarget = null;
          mesh.userData._idleUntil = 0;
          mesh.userData._moveSpeed = 0;
        }
      }
    });
  }

  function createMesh(type, entity, objData) {
    var visual = entity ? entity.visual : null;
    var group = new THREE.Group();
    var mainColor = visual ? visual.color : 0x808080;
    var scale = visual ? (visual.scale || 1.0) : 1.0;

    if (type === "node.tree") {
      var variant = objData && objData.id ? (function(id) {
        var hash = 0;
        for (var ci = 0; ci < id.length; ci++) hash = ((hash << 5) - hash) + id.charCodeAt(ci);
        return Math.abs(hash) % 3;
      })(objData.id) : 0;

      var trunkH = variant === 1 ? 0.5 : 0.6;
      var trunkBotR = variant === 1 ? 0.07 : 0.08;
      var trunkTopR = variant === 1 ? 0.09 : 0.1;

      var trunkGeo = new THREE.CylinderGeometry(trunkBotR, trunkTopR, trunkH, 6);
      var trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      var trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      group.add(trunk);

      var leavesColor = mainColor || 0x2d5a27;
      var leavesBaseColor = new THREE.Color(leavesColor);
      if (variant === 1) {
        leavesBaseColor.offsetHSL(0.02, 0, 0.03);
      } else if (variant === 2) {
        leavesBaseColor.offsetHSL(-0.02, 0, -0.02);
      }

      var canopyGroup = new THREE.Group();
      canopyGroup.userData.isCanopy = true;

      if (variant === 0) {
        var leavesGeo = new THREE.ConeGeometry(0.45, 0.85, 8);
        var leavesMat = new THREE.MeshLambertMaterial({ color: leavesBaseColor.getHex() });
        var lowerLeaves = new THREE.Mesh(leavesGeo, leavesMat);
        lowerLeaves.position.y = trunkH + 0.35;
        lowerLeaves.castShadow = true;
        canopyGroup.add(lowerLeaves);

        var leaves2Geo = new THREE.ConeGeometry(0.32, 0.55, 8);
        var leaves2 = new THREE.Mesh(leaves2Geo, leavesMat);
        leaves2.position.y = trunkH + 0.72;
        leaves2.castShadow = true;
        canopyGroup.add(leaves2);
      } else if (variant === 1) {
        var oakGeo = new THREE.SphereGeometry(0.42, 10, 8);
        var oakMat = new THREE.MeshLambertMaterial({ color: leavesBaseColor.getHex() });
        var oakCanopy = new THREE.Mesh(oakGeo, oakMat);
        oakCanopy.position.y = trunkH + 0.3;
        oakCanopy.castShadow = true;
        canopyGroup.add(oakCanopy);

        var sideGeo = new THREE.SphereGeometry(0.25, 8, 6);
        var sideCanopy = new THREE.Mesh(sideGeo, oakMat);
        sideCanopy.position.set(0.2, trunkH + 0.15, 0.15);
        sideCanopy.castShadow = true;
        canopyGroup.add(sideCanopy);
      } else {
        var bushy1Geo = new THREE.SphereGeometry(0.3, 8, 6);
        var bushyMat = new THREE.MeshLambertMaterial({ color: leavesBaseColor.getHex() });
        var bushy1 = new THREE.Mesh(bushy1Geo, bushyMat);
        bushy1.position.y = trunkH + 0.2;
        bushy1.castShadow = true;
        canopyGroup.add(bushy1);

        var bushy2Geo = new THREE.SphereGeometry(0.22, 8, 6);
        var bushy2 = new THREE.Mesh(bushy2Geo, bushyMat);
        bushy2.position.y = trunkH + 0.48;
        bushy2.castShadow = true;
        canopyGroup.add(bushy2);
      }

      group.add(canopyGroup);

      if (typeof AtmosphereSystem !== 'undefined') {
        AtmosphereSystem.registerWindTarget(group, 'tree');
      }

    } else if (type === "node.rock" || type === "node.copper_deposit" || type === "node.tin_deposit" || type === "node.iron_deposit" || type === "node.coal_deposit") {
      var rockColor = mainColor || (type === "node.copper_deposit" ? 0xB87333 :
                                      type === "node.tin_deposit" ? 0xC0C0C0 :
                                      type === "node.iron_deposit" ? 0x8B7355 :
                                      type === "node.coal_deposit" ? 0x2F2F2F : 0x808080);
      var rockGeo = new THREE.DodecahedronGeometry(0.35 * scale, 1);
      var rockMat = new THREE.MeshLambertMaterial({ color: rockColor });
      var rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.y = 0.25 * scale;
      rock.rotation.set(0.3, 0.5, 0.1);
      rock.castShadow = true;
      group.add(rock);

      // Companion rock
      var smallGeo = new THREE.DodecahedronGeometry(0.12 * scale, 0);
      var small = new THREE.Mesh(smallGeo, rockMat);
      small.position.set(0.28 * scale, 0.08 * scale, 0.18 * scale);
      small.rotation.set(0.8, 0.2, 0);
      group.add(small);

      // Third tiny rock for variety
      var tinyGeo = new THREE.DodecahedronGeometry(0.08 * scale, 0);
      var tiny = new THREE.Mesh(tinyGeo, rockMat);
      tiny.position.set(-0.2 * scale, 0.06 * scale, -0.15 * scale);
      tiny.rotation.set(1.2, 0.7, 0);
      group.add(tiny);

      // Moss patches on regular rocks
      if (type === "node.rock") {
        var mossColors = [0x4a8a3a, 0x3a7a2e, 0x5a9a4a];
        for (var mi = 0; mi < 2; mi++) {
          var mossGeo = new THREE.SphereGeometry(0.04, 4, 3);
          var mossMat = new THREE.MeshLambertMaterial({ color: mossColors[mi % 3] });
          var moss = new THREE.Mesh(mossGeo, mossMat);
          moss.position.set(
            (mi === 0 ? 0.15 : -0.1) * scale,
            0.35 * scale,
            (mi === 0 ? -0.1 : 0.12) * scale
          );
          group.add(moss);
        }
      }

      // Ore specks for deposit types
      if (type === "node.copper_deposit") {
        addOreSpecks(group, 0xE87520, scale, 4);
      } else if (type === "node.tin_deposit") {
        addOreSpecks(group, 0xE8E8E8, scale, 3);
      } else if (type === "node.iron_deposit") {
        addOreSpecks(group, 0xAA3333, scale, 4);
      } else if (type === "node.coal_deposit") {
        addOreSpecks(group, 0x555555, scale, 3);
      }

    } else if (type === "node.berry_bush") {
      var bushColor = mainColor || 0x3a7a2e;
      var bushGeo = new THREE.SphereGeometry(0.3, 10, 8);
      var bushMat = new THREE.MeshLambertMaterial({ color: bushColor });
      var bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.y = 0.25;
      bush.castShadow = true;
      group.add(bush);

      // 8 berries instead of 5, better scatter
      for (var i = 0; i < 8; i++) {
        var berryGeo = new THREE.SphereGeometry(0.04, 4, 3);
        var berryMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
        var berry = new THREE.Mesh(berryGeo, berryMat);
        var bAngle = (i / 8) * Math.PI * 2 + 0.3;
        var bRadius = 0.15 + Math.sin(i * 1.7) * 0.05;
        berry.position.set(
          Math.cos(bAngle) * bRadius,
          0.28 + Math.sin(i * 0.9) * 0.08,
          Math.sin(bAngle) * bRadius
        );
        group.add(berry);
      }

      // Leaf clusters
      var leafClustGeo = new THREE.SphereGeometry(0.12, 6, 4);
      var leafClustMat = new THREE.MeshLambertMaterial({ color: 0x3a8a2e });
      var leafClust1 = new THREE.Mesh(leafClustGeo, leafClustMat);
      leafClust1.position.set(0.12, 0.28, 0.08);
      group.add(leafClust1);
      var leafClust2 = new THREE.Mesh(leafClustGeo, leafClustMat);
      leafClust2.position.set(-0.08, 0.32, -0.1);
      group.add(leafClust2);

      if (typeof AtmosphereSystem !== 'undefined') {
        AtmosphereSystem.registerWindTarget(group, 'bush');
      }

    } else if (type === "node.flint_deposit") {
      var flintColor = mainColor || 0x4a4a4a;
      var flintGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
      var flintMat = new THREE.MeshLambertMaterial({ color: flintColor });
      var flint = new THREE.Mesh(flintGeo, flintMat);
      flint.position.y = 0.15;
      flint.rotation.y = 0.3;
      flint.castShadow = true;
      group.add(flint);

      // Sharp piece on top
      var sharpGeo = new THREE.ConeGeometry(0.1, 0.25, 4);
      var sharp = new THREE.Mesh(sharpGeo, flintMat);
      sharp.position.set(0.1, 0.35, 0);
      sharp.castShadow = true;
      group.add(sharp);

      // Second smaller flint piece
      var sharp2Geo = new THREE.ConeGeometry(0.06, 0.15, 4);
      var sharp2 = new THREE.Mesh(sharp2Geo, flintMat);
      sharp2.position.set(-0.12, 0.28, 0.08);
      sharp2.rotation.z = 0.3;
      group.add(sharp2);

    } else if (type === "animal.wolf" || type === "animal.boar" || type === "animal.bear" || type === "animal.lion" || type === "animal.bandit" || type === "animal.sabertooth") {
      var animalColor = mainColor || (type === "animal.wolf" ? 0x808080 : 
                                        type === "animal.boar" ? 0x8B6914 : 
                                        type === "animal.lion" ? 0xC4A24E :
                                        type === "animal.bandit" ? 0x333366 :
                                        type === "animal.sabertooth" ? 0xF4A460 : 0x5C4033);
      var animalScale = scale || (type === "animal.bear" || type === "animal.lion" || type === "animal.sabertooth" ? 0.8 : 
                                    type === "animal.bandit" ? 0.7 : 0.6);

      // Body - tapered for animals, wider for bandit
      var bodyLen = type === "animal.bear" || type === "animal.lion" ? 0.7 : (type === "animal.bandit" ? 0.35 : 0.5);
      var bodyW = 0.3 * animalScale / 0.6;
      var bodyH = type === "animal.bandit" ? 0.4 * animalScale / 0.6 : 0.25 * animalScale / 0.6;
      var bodyGeo = new THREE.BoxGeometry(bodyLen, bodyH, bodyW);
      var bodyMat = new THREE.MeshLambertMaterial({ color: animalColor });
      var body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = type === "animal.bandit" ? 0.4 : 0.3;
      body.castShadow = true;
      group.add(body);

      // Head
      var headSize = type === "animal.bear" ? 0.18 : (type === "animal.bandit" ? 0.14 : 0.15) * animalScale / 0.6;
      var headGeo;
      if (type === "animal.bear") {
        headGeo = new THREE.SphereGeometry(headSize, 8, 6);
      } else {
        headGeo = new THREE.BoxGeometry(headSize, headSize, type === "animal.bandit" ? headSize * 0.8 : headSize * 0.9);
      }
      var head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(bodyLen / 2 + headSize / 2 + 0.02, type === "animal.bandit" ? 0.55 : 0.35, 0);
      head.castShadow = true;
      group.add(head);

      // Eyes
      var eyeSize = type === "animal.bear" ? 0.025 : 0.02;
      var eyeGeo = new THREE.SphereGeometry(eyeSize, 4, 4);
      var eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
      var eye1 = new THREE.Mesh(eyeGeo, eyeMat);
      eye1.position.set(bodyLen / 2 + headSize + 0.01, (type === "animal.bandit" ? 0.57 : 0.37) * animalScale / 0.6, 0.04);
      group.add(eye1);
      var eye2 = new THREE.Mesh(eyeGeo, eyeMat);
      eye2.position.set(bodyLen / 2 + headSize + 0.01, (type === "animal.bandit" ? 0.57 : 0.37) * animalScale / 0.6, -0.04);
      group.add(eye2);

      // Ears (for wolf, bear, lion, sabertooth)
      if (type === "animal.wolf" || type === "animal.bear" || type === "animal.lion" || type === "animal.sabertooth") {
        var earGeo = new THREE.ConeGeometry(0.03 * animalScale / 0.6, 0.08 * animalScale / 0.6, 4);
        var ear1 = new THREE.Mesh(earGeo, bodyMat);
        ear1.position.set(bodyLen / 2 + headSize * 0.3, 0.4 * animalScale / 0.6, 0.06 * animalScale / 0.6);
        group.add(ear1);
        var ear2 = new THREE.Mesh(earGeo, bodyMat);
        ear2.position.set(bodyLen / 2 + headSize * 0.3, 0.4 * animalScale / 0.6, -0.06 * animalScale / 0.6);
        group.add(ear2);
      }

      // Tail (for wolf, lion, sabertooth, boar)
      if (type !== "animal.bandit") {
        var tailGeo = new THREE.CylinderGeometry(0.015 * animalScale / 0.6, 0.025 * animalScale / 0.6, 0.2 * animalScale / 0.6, 4);
        var tailMat = new THREE.MeshLambertMaterial({ color: animalColor });
        var tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.set(-bodyLen / 2 - 0.08, 0.3, 0);
        tail.rotation.z = type === "animal.boar" ? -0.2 : 0.8;
        tail.name = "tail";
        group.add(tail);

        // Lion mane
        if (type === "animal.lion") {
          var maneGeo = new THREE.TorusGeometry(0.1 * animalScale / 0.6, 0.035 * animalScale / 0.6, 6, 12);
          var maneMat = new THREE.MeshLambertMaterial({ color: 0xD4A030 });
          var mane = new THREE.Mesh(maneGeo, maneMat);
          mane.position.set(bodyLen / 2 + headSize / 2, 0.35 * animalScale / 0.6, 0);
          mane.rotation.y = Math.PI / 2;
          group.add(mane);
        }
      }

      // Sabertooth oversized fangs
      if (type === "animal.sabertooth") {
        var fangGeo = new THREE.ConeGeometry(0.015, 0.08, 4);
        var fangMat = new THREE.MeshLambertMaterial({ color: 0xFFFFF0 });
        var fang1 = new THREE.Mesh(fangGeo, fangMat);
        fang1.position.set(bodyLen / 2 + headSize + 0.01, 0.28, 0.03);
        group.add(fang1);
        var fang2 = new THREE.Mesh(fangGeo, fangMat);
        fang2.position.set(bodyLen / 2 + headSize + 0.01, 0.28, -0.03);
        group.add(fang2);
      }

      // Boar tusks (enhanced - larger)
      if (type === "animal.boar") {
        var tuskGeo = new THREE.ConeGeometry(0.02, 0.1, 4);
        var tuskMat = new THREE.MeshLambertMaterial({ color: 0xFFFFF0 });
        var tusk1 = new THREE.Mesh(tuskGeo, tuskMat);
        tusk1.position.set(bodyLen / 2 + headSize + 0.02, 0.32, 0.06);
        tusk1.rotation.z = -0.3;
        group.add(tusk1);
        var tusk2 = new THREE.Mesh(tuskGeo, tuskMat);
        tusk2.position.set(bodyLen / 2 + headSize + 0.02, 0.32, -0.06);
        tusk2.rotation.z = -0.3;
        group.add(tusk2);

        // Boar curly tail
        var curlyTailGeo = new THREE.TorusGeometry(0.04 * animalScale / 0.6, 0.01 * animalScale / 0.6, 4, 8, Math.PI);
        var curlyTail = new THREE.Mesh(curlyTailGeo, bodyMat);
        curlyTail.position.set(-bodyLen / 2 - 0.05, 0.35, 0);
        group.add(curlyTail);
      }

      // Bandit - humanoid with weapon
      if (type === "animal.bandit") {
        // Weapon (club/sword)
        var weaponGeo = new THREE.BoxGeometry(0.04, 0.25, 0.04);
        var weaponMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 });
        var weapon = new THREE.Mesh(weaponGeo, weaponMat);
        weapon.position.set(bodyLen / 2 + 0.1, 0.35, 0.15);
        weapon.rotation.z = -0.4;
        group.add(weapon);
      }

      // Legs
      if (type === "animal.bandit") {
        // Humanoid legs (2 visible from isometric)
        var bLegGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08);
        var legMat2 = new THREE.MeshLambertMaterial({ color: 0x3a3a5c });
        var bLeg1 = new THREE.Mesh(bLegGeo, legMat2);
        bLeg1.position.set(0, 0.1, 0.07);
        bLeg1.name = "leg";
        group.add(bLeg1);
        var bLeg2 = new THREE.Mesh(bLegGeo, legMat2);
        bLeg2.position.set(0, 0.1, -0.07);
        bLeg2.name = "leg";
        group.add(bLeg2);
      } else {
        var legGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06);
        [[-0.15, -0.1], [-0.15, 0.1], [0.15, -0.1], [0.15, 0.1]].forEach(function (pos) {
          var leg = new THREE.Mesh(legGeo, bodyMat);
          leg.position.set(pos[0], 0.1, pos[1]);
          leg.castShadow = true;
          leg.name = "leg";
          group.add(leg);
        });
      }

    } else {
      // Default: colored box
      var defGeo = new THREE.BoxGeometry(0.5 * scale, 0.5 * scale, 0.5 * scale);
      var defMat = new THREE.MeshLambertMaterial({ color: mainColor });
      var defMesh = new THREE.Mesh(defGeo, defMat);
      defMesh.position.y = 0.25 * scale;
      defMesh.castShadow = true;
      group.add(defMesh);
    }

    // Shadow circle
    var shadowGeo = new THREE.CircleGeometry(0.4, 12);
    var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 });
    var shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    return group;
  }

  function hideObject(objData) {
    var mesh = _meshMap.get(objData.id);
    if (mesh) {
      mesh.userData._hidden = true;
      mesh.visible = false;
    }
  }

  function showObject(objData) {
    var mesh = _meshMap.get(objData.id);
    if (mesh) {
      mesh.userData._hidden = false;
      mesh.visible = true;
      
      // For animals, reset position to spawn point on respawn
      if (objData.type && objData.type.startsWith("animal.")) {
        if (mesh.userData._spawnX !== undefined && mesh.userData._spawnZ !== undefined) {
          mesh.position.x = mesh.userData._spawnX;
          mesh.position.z = mesh.userData._spawnZ;
          objData.worldX = mesh.userData._spawnX;
          objData.worldZ = mesh.userData._spawnZ;
        }
        // Reset wander timer to pick new direction
        mesh.userData._wanderTime = performance.now() / 1000;
        mesh.userData._movementState = 'patrol';
        mesh.userData._patrolTarget = null;
        mesh.userData._idleUntil = (performance.now() / 1000) + 0.5;
        mesh.userData._moveSpeed = 0;
      }
      
      mesh.traverse(function(child) {
        if (child.isMesh && child.material) {
          // Skip shadow mesh (positioned at y=0.02 with low opacity)
          if (Math.abs(child.position.y - 0.02) < 0.01) {
            // This is a shadow, keep it transparent
            child.material.opacity = 0.15;
            child.material.transparent = true;
          } else {
            // Regular mesh, make fully visible
            child.material.opacity = 1;
            child.material.transparent = false;
          }
        }
      });
    }
  }

  function ensureAnimalState(mesh, objData, time) {
    if (mesh.userData._animalStateReady) return;
    mesh.userData._animalStateReady = true;
    mesh.userData._spawnX = mesh.userData._spawnX !== undefined ? mesh.userData._spawnX : objData.worldX;
    mesh.userData._spawnZ = mesh.userData._spawnZ !== undefined ? mesh.userData._spawnZ : objData.worldZ;
    mesh.userData._movementState = mesh.userData._movementState || 'patrol';
    mesh.userData._patrolTarget = mesh.userData._patrolTarget || null;
    mesh.userData._idleUntil = mesh.userData._idleUntil || (time + Math.random());
    mesh.userData._moveSpeed = mesh.userData._moveSpeed || 0;
  }

  function getAnimalBehaviorSettings(type, balance) {
    var settings = {
      patrolRadius: 3.2,
      patrolSpeed: 0.38,
      chaseSpeed: 1.05,
      returnSpeed: 0.72,
      turnRate: 0.18
    };

    if (type === 'animal.wolf') {
      settings.patrolSpeed = 0.46;
      settings.chaseSpeed = 1.18;
      settings.returnSpeed = 0.8;
      settings.turnRate = 0.24;
    } else if (type === 'animal.boar') {
      settings.patrolSpeed = 0.42;
      settings.chaseSpeed = 1.0;
      settings.returnSpeed = 0.76;
      settings.turnRate = 0.2;
    } else if (type === 'animal.bear') {
      settings.patrolRadius = 3.8;
      settings.patrolSpeed = 0.34;
      settings.chaseSpeed = 0.9;
      settings.returnSpeed = 0.64;
      settings.turnRate = 0.14;
    } else if (type === 'animal.lion') {
      settings.patrolRadius = 4.2;
      settings.patrolSpeed = 0.44;
      settings.chaseSpeed = 1.15;
      settings.returnSpeed = 0.82;
      settings.turnRate = 0.24;
    } else if (type === 'animal.bandit') {
      settings.patrolRadius = 2.8;
      settings.patrolSpeed = 0.4;
      settings.chaseSpeed = 0.98;
      settings.returnSpeed = 0.74;
      settings.turnRate = 0.22;
    } else if (type === 'animal.sabertooth') {
      settings.patrolRadius = 4.6;
      settings.patrolSpeed = 0.5;
      settings.chaseSpeed = 1.25;
      settings.returnSpeed = 0.88;
      settings.turnRate = 0.26;
    }

    settings.aggroRange = (balance && balance.aggroRange) || 3;
    settings.attackRange = Math.max(1.05, settings.aggroRange * 0.55);
    settings.chaseRange = Math.max(settings.attackRange + 1.25, settings.aggroRange * 2.3);
    return settings;
  }

  function canAnimalMoveTo(worldX, worldZ) {
    if (!window.GameTerrain || !GameTerrain.isWalkable) return true;
    var clearance = 0.2;
    if (!GameTerrain.isWalkable(worldX, worldZ)) return false;

    var samples = [
      [clearance, 0],
      [-clearance, 0],
      [0, clearance],
      [0, -clearance]
    ];

    for (var i = 0; i < samples.length; i++) {
      if (!GameTerrain.isWalkable(worldX + samples[i][0], worldZ + samples[i][1])) {
        return false;
      }
    }

    return true;
  }

  function turnAnimalTowards(mesh, targetAngle, turnRate) {
    var angleDiff = targetAngle - mesh.rotation.y;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    mesh.rotation.y += angleDiff * turnRate;
  }

  function pickAnimalPatrolTarget(mesh, settings) {
    var spawnX = mesh.userData._spawnX;
    var spawnZ = mesh.userData._spawnZ;
    for (var attempt = 0; attempt < 10; attempt++) {
      var angle = Math.random() * Math.PI * 2;
      var radius = settings.patrolRadius * (0.35 + Math.random() * 0.65);
      var targetX = spawnX + Math.sin(angle) * radius;
      var targetZ = spawnZ + Math.cos(angle) * radius;
      if (canAnimalMoveTo(targetX, targetZ)) {
        return { x: targetX, z: targetZ };
      }
    }
    return { x: spawnX, z: spawnZ };
  }

  function moveAnimal(mesh, objData, targetX, targetZ, speed, dt, turnRate) {
    var dx = targetX - objData.worldX;
    var dz = targetZ - objData.worldZ;
    var distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < 0.08) {
      mesh.userData._moveSpeed = 0;
      return true;
    }

    var dirX = dx / distance;
    var dirZ = dz / distance;
    var moveDistance = Math.min(distance, speed * dt);
    var nextX = objData.worldX + dirX * moveDistance;
    var nextZ = objData.worldZ + dirZ * moveDistance;
    var moved = false;

    if (canAnimalMoveTo(nextX, nextZ)) {
      objData.worldX = nextX;
      objData.worldZ = nextZ;
      moved = true;
    } else if (canAnimalMoveTo(nextX, objData.worldZ)) {
      objData.worldX = nextX;
      moved = true;
    } else if (canAnimalMoveTo(objData.worldX, nextZ)) {
      objData.worldZ = nextZ;
      moved = true;
    }

    mesh.position.x = objData.worldX;
    mesh.position.z = objData.worldZ;
    mesh.userData._moveSpeed = moved ? speed : 0;
    turnAnimalTowards(mesh, Math.atan2(dirX, dirZ), turnRate);
    return moved && distance <= moveDistance + 0.08;
  }

  function updateAnimalAnimation(mesh, time, state) {
    var moveSpeed = mesh.userData._moveSpeed || 0;
    var moving = moveSpeed > 0.01;
    var chaseState = state === 'chase';
    var cycleSpeed = chaseState ? 12 : 8;
    var amplitude = chaseState ? 0.34 : 0.22;

    mesh.position.y = moving ? Math.sin(time * cycleSpeed * 0.5 + mesh.id) * (chaseState ? 0.03 : 0.018) : 0;

    mesh.children.forEach(function (child) {
      if (child.name === 'leg') {
        if (moving) {
          var phase = (child.position.x + child.position.z) > 0 ? 0 : Math.PI;
          child.rotation.x = Math.sin(time * cycleSpeed + phase + mesh.id) * amplitude;
        } else {
          child.rotation.x *= 0.72;
        }
      }

      if (child.name === 'tail') {
        child.rotation.y = moving ? Math.sin(time * 5 + mesh.id) * 0.16 : child.rotation.y * 0.8;
      }
    });
  }

  function update(dt) {
    _meshMap.forEach(function (mesh, id) {
      var objData = _dataMap.get(mesh.id);
      if (!objData) return;

      if (objData.type && objData.type.startsWith("animal.") && objData.hp > 0 && !objData._destroyed) {
        var time = performance.now() / 1000;
        ensureAnimalState(mesh, objData, time);
        var balance = GameRegistry.getBalance(objData.type) || {};
        var settings = getAnimalBehaviorSettings(objData.type, balance);
        var combatActive = window.GameCombat && GameCombat.isActive && GameCombat.isActive();
        var activeTarget = combatActive && GameCombat.getTarget ? GameCombat.getTarget() : null;
        var isOwnCombat = activeTarget === objData;
        var playerPos = window.GamePlayer ? GamePlayer.getPosition() : null;
        var distToPlayer = playerPos ? Math.sqrt(
          Math.pow(objData.worldX - playerPos.x, 2) +
          Math.pow(objData.worldZ - playerPos.z, 2)
        ) : Infinity;
        var distFromSpawn = Math.sqrt(
          Math.pow(objData.worldX - mesh.userData._spawnX, 2) +
          Math.pow(objData.worldZ - mesh.userData._spawnZ, 2)
        );

        if (isOwnCombat) {
          mesh.userData._movementState = 'combat';
          mesh.userData._patrolTarget = null;
          mesh.userData._moveSpeed = 0;
          if (playerPos) {
            turnAnimalTowards(mesh, Math.atan2(playerPos.x - objData.worldX, playerPos.z - objData.worldZ), settings.turnRate * 1.4);
          }
        } else if (!combatActive && playerPos && distToPlayer <= settings.chaseRange) {
          mesh.userData._movementState = 'chase';
          mesh.userData._patrolTarget = null;
          mesh.userData._idleUntil = 0;

          if (distToPlayer <= settings.attackRange) {
            GameCombat.startCombat(objData);
            mesh.userData._moveSpeed = 0;
          } else {
            var reachedPlayer = moveAnimal(mesh, objData, playerPos.x, playerPos.z, settings.chaseSpeed, dt, settings.turnRate);
            if (!reachedPlayer && mesh.userData._moveSpeed === 0) {
              mesh.userData._movementState = 'return';
            }
          }
        } else if (distFromSpawn > settings.patrolRadius * 1.25 || mesh.userData._movementState === 'return') {
          mesh.userData._movementState = 'return';
          mesh.userData._patrolTarget = null;
          if (moveAnimal(mesh, objData, mesh.userData._spawnX, mesh.userData._spawnZ, settings.returnSpeed, dt, settings.turnRate)) {
            mesh.userData._movementState = 'patrol';
            mesh.userData._idleUntil = time + 0.5 + Math.random();
            mesh.userData._moveSpeed = 0;
          }
        } else {
          mesh.userData._movementState = 'patrol';

          if (!mesh.userData._patrolTarget && time >= (mesh.userData._idleUntil || 0)) {
            mesh.userData._patrolTarget = pickAnimalPatrolTarget(mesh, settings);
          }

          if (mesh.userData._patrolTarget) {
            var patrolTarget = mesh.userData._patrolTarget;
            var reachedPatrol = moveAnimal(mesh, objData, patrolTarget.x, patrolTarget.z, settings.patrolSpeed, dt, settings.turnRate);
            if (reachedPatrol || mesh.userData._moveSpeed === 0) {
              mesh.userData._patrolTarget = null;
              mesh.userData._idleUntil = time + 0.8 + Math.random() * 1.2;
              mesh.userData._moveSpeed = 0;
            }
          } else {
            mesh.userData._moveSpeed = 0;
          }
        }

        updateAnimalAnimation(mesh, time, mesh.userData._movementState);
      }
    });
  }

  function getAllMeshes() {
    var arr = [];
    _meshMap.forEach(function (mesh) {
      if (mesh.visible && !mesh.userData._hidden) arr.push(mesh);
    });
    return arr;
  }

  function getDataFromMesh(mesh) {
    // Walk up to find group
    var current = mesh;
    while (current && !current.userData.objectId) {
      current = current.parent;
    }
    if (!current) return null;
    return _dataMap.get(current.id) || null;
  }

  /**
   * Create NPC worker mesh
   * Similar to player but smaller and color-coded by building type
   */
  function createNPCMesh(buildingEntityId) {
    var group = new THREE.Group();
    
    // Color-code by building type
    var bodyColor = 0x4488cc;
    if (buildingEntityId === 'building.wood_cutter') {
      bodyColor = 0x8B4513;
    } else if (buildingEntityId === 'building.stone_quarry') {
      bodyColor = 0x808080;
    } else if (buildingEntityId === 'building.berry_gatherer') {
      bodyColor = 0x2d5a27;
    } else if (buildingEntityId === 'building.flint_mine') {
      bodyColor = 0x4a4a4a;
    } else if (buildingEntityId === 'building.copper_mine') {
      bodyColor = 0xB87333;
    } else if (buildingEntityId === 'building.tin_mine') {
      bodyColor = 0xC0C0C0;
    } else if (buildingEntityId === 'building.iron_mine') {
      bodyColor = 0x5a5a70;
    } else if (buildingEntityId === 'building.coal_mine') {
      bodyColor = 0x333333;
    }
    
    var scale = 0.7;
    
    // Body
    var bodyGeo = new THREE.BoxGeometry(0.25 * scale, 0.38 * scale, 0.15 * scale);
    var bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.28 * scale;
    body.castShadow = true;
    body.name = "body";
    group.add(body);
    
    // Head
    var headGeo = new THREE.SphereGeometry(0.12 * scale, 8, 8);
    var headMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.52 * scale;
    head.castShadow = true;
    group.add(head);
    
    // Hat
    var hatBrimGeo = new THREE.CylinderGeometry(0.14 * scale, 0.16 * scale, 0.03 * scale, 8);
    var hatMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    var hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
    hatBrim.position.y = 0.6 * scale;
    group.add(hatBrim);
    var hatTopGeo = new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.06 * scale, 8);
    var hatTop = new THREE.Mesh(hatTopGeo, hatMat);
    hatTop.position.y = 0.63 * scale;
    group.add(hatTop);
    
    // Arms
    var armGeo = new THREE.BoxGeometry(0.08 * scale, 0.25 * scale, 0.08 * scale);
    var armMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
    
    var leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.18 * scale, 0.28 * scale, 0);
    leftArm.castShadow = true;
    leftArm.name = "leftArm";
    group.add(leftArm);
    
    var rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.18 * scale, 0.28 * scale, 0);
    rightArm.castShadow = true;
    rightArm.name = "rightArm";
    group.add(rightArm);
    
    // Legs
    var legGeo = new THREE.BoxGeometry(0.08 * scale, 0.22 * scale, 0.08 * scale);
    var legMat = new THREE.MeshLambertMaterial({ color: 0x3a3a5c });
    
    var leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.06 * scale, 0.11 * scale, 0);
    leftLeg.castShadow = true;
    leftLeg.name = "leftLeg";
    group.add(leftLeg);
    
    var rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.06 * scale, 0.11 * scale, 0);
    rightLeg.castShadow = true;
    rightLeg.name = "rightLeg";
    group.add(rightLeg);
    
    // Tool on back (based on building type)
    var toolGeo = null;
    var toolColor = 0x888888;
    if (buildingEntityId === 'building.wood_cutter') {
      toolGeo = new THREE.BoxGeometry(0.03 * scale, 0.2 * scale, 0.03 * scale);
      toolColor = 0x8B6914;
    } else if (buildingEntityId === 'building.stone_quarry' || buildingEntityId === 'building.flint_mine') {
      toolGeo = new THREE.BoxGeometry(0.03 * scale, 0.2 * scale, 0.03 * scale);
      toolColor = 0x808080;
    } else if (buildingEntityId === 'building.copper_mine' || buildingEntityId === 'building.tin_mine' || buildingEntityId === 'building.iron_mine') {
      toolGeo = new THREE.BoxGeometry(0.03 * scale, 0.22 * scale, 0.03 * scale);
      toolColor = 0xB87333;
    } else if (buildingEntityId === 'building.berry_gatherer') {
      // Basket - small cylinder
      toolGeo = new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.06 * scale, 6);
      toolColor = 0xBEAA78;
    } else if (buildingEntityId === 'building.coal_mine') {
      toolGeo = new THREE.BoxGeometry(0.03 * scale, 0.2 * scale, 0.03 * scale);
      toolColor = 0x333333;
    }
    
    if (toolGeo) {
      var toolMat = new THREE.MeshLambertMaterial({ color: toolColor });
      var toolMesh = new THREE.Mesh(toolGeo, toolMat);
      if (buildingEntityId === 'building.berry_gatherer') {
        toolMesh.position.set(0.12 * scale, 0.25 * scale, 0);
      } else {
        toolMesh.position.set(0, 0.3 * scale, -0.1 * scale);
        toolMesh.rotation.z = -0.3;
      }
      group.add(toolMesh);
    }
    
    // Shadow circle
    var shadowGeo = new THREE.CircleGeometry(0.25, 12);
    var shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
    var shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    group.add(shadow);
    
    return group;
  }

  /**
   * Destroy a node (called when NPC finishes harvesting)
   */
  function destroyNode(nodeData) {
    if (!nodeData) return;

    // Mark as destroyed
    nodeData._destroyed = true;
    nodeData.hp = 0;

    // Hide mesh
    hideObject(nodeData);

    // Schedule respawn with player collision check
    var balance = GameRegistry.getBalance(nodeData.type);
    var respawnTime = (balance && balance.respawnTime) || 30;

    function tryRespawn() {
      if (!nodeData._destroyed) return;
      // Check if player is too close - delay respawn if so
      if (window.GamePlayer) {
        var playerPos = GamePlayer.getPosition();
        var dx = Math.abs(nodeData.worldX - playerPos.x);
        var dz = Math.abs(nodeData.worldZ - playerPos.z);
        if (dx < 2 && dz < 2) {
          // Player is standing on this spot, retry in 5 seconds
          setTimeout(tryRespawn, 5000);
          return;
        }
      }
      nodeData._destroyed = false;
      var maxHp = nodeData.maxHp || (balance && balance.hp) || 10;
      nodeData.hp = maxHp;
      showObject(nodeData);
    }

    setTimeout(tryRespawn, respawnTime * 1000);
  }

  function addOreSpecks(group, color, scale, count) {
    var sparkMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
    for (var oi = 0; oi < count; oi++) {
      var sparkGeo = new THREE.SphereGeometry(0.025 * (scale || 1), 4, 3);
      var spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.position.set(
        (Math.cos(oi * 1.5 + 0.5) * 0.2) * (scale || 1),
        (0.3 + Math.sin(oi * 0.8) * 0.1) * (scale || 1),
        (Math.sin(oi * 1.5 + 0.5) * 0.2) * (scale || 1)
      );
      group.add(spark);
    }
  }

  return {
    init: init,
    createObjectForChunk: createObjectForChunk,
    createMesh: createMesh,
    createNPCMesh: createNPCMesh,
    destroyNode: destroyNode,
    hideObject: hideObject,
    showObject: showObject,
    update: update,
    getAllMeshes: getAllMeshes,
    getDataFromMesh: getDataFromMesh
  };
})();
