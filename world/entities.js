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
      var mesh = createMesh(obj.type, entity);

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
      }
    });
  }

  function createMesh(type, entity) {
    var visual = entity ? entity.visual : null;
    var group = new THREE.Group();
    var mainColor = visual ? visual.color : 0x808080;
    var scale = visual ? (visual.scale || 1.0) : 1.0;

    if (type === "node.tree") {
      // Trunk
      var trunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6);
      var trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      var trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.3;
      trunk.castShadow = true;
      group.add(trunk);

      // Leaves (cone)
      var leavesColor = mainColor || 0x2d5a27;
      var leavesGeo = new THREE.ConeGeometry(0.5, 0.8, 6);
      var leavesMat = new THREE.MeshLambertMaterial({ color: leavesColor });
      var leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = 0.9;
      leaves.castShadow = true;
      group.add(leaves);

      // Second layer (smaller)
      var leaves2Geo = new THREE.ConeGeometry(0.35, 0.5, 6);
      var leaves2 = new THREE.Mesh(leaves2Geo, leavesMat);
      leaves2.position.y = 1.25;
      leaves2.castShadow = true;
      group.add(leaves2);

    } else if (type === "node.rock" || type === "node.copper_deposit" || type === "node.tin_deposit" || type === "node.iron_deposit" || type === "node.coal_deposit") {
      var rockColor = mainColor || (type === "node.copper_deposit" ? 0xB87333 :
                                      type === "node.tin_deposit" ? 0xC0C0C0 :
                                      type === "node.iron_deposit" ? 0x8B7355 :
                                      type === "node.coal_deposit" ? 0x2F2F2F : 0x808080);
      var rockGeo = new THREE.DodecahedronGeometry(0.35 * scale, 0);
      var rockMat = new THREE.MeshLambertMaterial({ color: rockColor });
      var rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.y = 0.25 * scale;
      rock.rotation.set(0.3, 0.5, 0.1);
      rock.castShadow = true;
      group.add(rock);

      // Small rock next to it
      var smallGeo = new THREE.DodecahedronGeometry(0.15 * scale, 0);
      var small = new THREE.Mesh(smallGeo, rockMat);
      small.position.set(0.25 * scale, 0.1 * scale, 0.15 * scale);
      small.rotation.set(0.8, 0.2, 0);
      group.add(small);

    } else if (type === "node.berry_bush") {
      var bushColor = mainColor || 0x3a7a2e;
      var bushGeo = new THREE.SphereGeometry(0.3, 8, 6);
      var bushMat = new THREE.MeshLambertMaterial({ color: bushColor });
      var bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.y = 0.25;
      bush.castShadow = true;
      group.add(bush);

      // Berry dots
      for (var i = 0; i < 5; i++) {
        var berryGeo = new THREE.SphereGeometry(0.05, 4, 4);
        var berryMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
        var berry = new THREE.Mesh(berryGeo, berryMat);
        berry.position.set(
          Math.cos(i * 1.2) * 0.2,
          0.3 + Math.sin(i * 0.8) * 0.1,
          Math.sin(i * 1.2) * 0.2
        );
        group.add(berry);
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

    } else if (type === "animal.wolf" || type === "animal.boar" || type === "animal.bear" || type === "animal.lion" || type === "animal.bandit" || type === "animal.sabertooth") {
      var animalColor = mainColor || (type === "animal.wolf" ? 0x808080 : 
                                        type === "animal.boar" ? 0x8B6914 : 
                                        type === "animal.lion" ? 0xC4A24E :
                                        type === "animal.bandit" ? 0x8B4513 :
                                        type === "animal.sabertooth" ? 0xF4A460 : 0x5C4033);
      var animalScale = scale || (type === "animal.bear" || type === "animal.lion" || type === "animal.sabertooth" ? 0.8 : 
                                    type === "animal.bandit" ? 0.7 : 0.6);

      // Body
      var bodyLen = type === "animal.bear" || type === "animal.lion" ? 0.7 : 0.5;
      var bodyGeo = new THREE.BoxGeometry(bodyLen, 0.25 * animalScale / 0.6, 0.3 * animalScale / 0.6);
      var bodyMat = new THREE.MeshLambertMaterial({ color: animalColor });
      var body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.3;
      body.castShadow = true;
      group.add(body);

      // Head
      var headSize = 0.15 * animalScale / 0.6;
      var headGeo = new THREE.BoxGeometry(headSize, headSize, headSize);
      var head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(bodyLen / 2 + headSize / 2, 0.35, 0);
      head.castShadow = true;
      group.add(head);

      // Eyes
      var eyeGeo = new THREE.SphereGeometry(0.02, 4, 4);
      var eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
      var eye1 = new THREE.Mesh(eyeGeo, eyeMat);
      eye1.position.set(bodyLen / 2 + headSize, 0.38, 0.05);
      group.add(eye1);
      var eye2 = new THREE.Mesh(eyeGeo, eyeMat);
      eye2.position.set(bodyLen / 2 + headSize, 0.38, -0.05);
      group.add(eye2);

      // Legs
      var legGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06);
      [[-0.15, -0.1], [-0.15, 0.1], [0.15, -0.1], [0.15, 0.1]].forEach(function (pos) {
        var leg = new THREE.Mesh(legGeo, bodyMat);
        leg.position.set(pos[0], 0.1, pos[1]);
        leg.castShadow = true;
        leg.name = "leg";
        group.add(leg);
      });

      // Boar tusks
      if (type === "animal.boar") {
        var tuskGeo = new THREE.ConeGeometry(0.02, 0.08, 4);
        var tuskMat = new THREE.MeshLambertMaterial({ color: 0xFFFFF0 });
        var tusk1 = new THREE.Mesh(tuskGeo, tuskMat);
        tusk1.position.set(bodyLen / 2 + headSize + 0.02, 0.32, 0.06);
        tusk1.rotation.z = -0.3;
        group.add(tusk1);
        var tusk2 = new THREE.Mesh(tuskGeo, tuskMat);
        tusk2.position.set(bodyLen / 2 + headSize + 0.02, 0.32, -0.06);
        tusk2.rotation.z = -0.3;
        group.add(tusk2);
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

  function update(dt) {
    // Animate animals (idle movement + actual wandering)
    _meshMap.forEach(function (mesh, id) {
      var objData = _dataMap.get(mesh.id);
      if (!objData) return;

      if (objData.type && objData.type.startsWith("animal.") && objData.hp > 0 && !objData._destroyed) {
        var time = performance.now() / 1000;
        
        // Check if this animal is in combat
        var isInCombat = false;
        if (window.GameCombat && GameCombat.isActive && GameCombat.isActive()) {
          var activeCombat = GameCombat.getTarget ? GameCombat.getTarget() : null;
          isInCombat = activeCombat === objData;
        }
        
        // Slow wandering movement (not during combat)
        if (!isInCombat) {
          // Aggro check - animals attack player when nearby
          if (window.GamePlayer && window.GameCombat) {
            var playerPos = GamePlayer.getPosition();
            var distToPlayer = Math.sqrt(
              Math.pow(objData.worldX - playerPos.x, 2) +
              Math.pow(objData.worldZ - playerPos.z, 2)
            );
            var balance = GameRegistry.getBalance(objData.type);
            var aggroRange = (balance && balance.aggroRange) || 3;

            if (distToPlayer < aggroRange && !GameCombat.isActive()) {
              GameCombat.startCombat(objData);
              return; // Skip further animation this frame
            }

            // Chase player if within aggro range x2 (pursuit range)
            if (distToPlayer < aggroRange * 2 && distToPlayer > aggroRange && !GameCombat.isActive()) {
              var chaseSpeed = 1.0 * dt;
              var chaseDx = (playerPos.x - objData.worldX) / distToPlayer;
              var chaseDz = (playerPos.z - objData.worldZ) / distToPlayer;
              var chaseX = mesh.position.x + chaseDx * chaseSpeed;
              var chaseZ = mesh.position.z + chaseDz * chaseSpeed;
              if (window.GameTerrain && GameTerrain.isWalkable(chaseX, chaseZ)) {
                mesh.position.x = chaseX;
                mesh.position.z = chaseZ;
                objData.worldX = chaseX;
                objData.worldZ = chaseZ;
                var chaseAngle = Math.atan2(chaseDx, chaseDz);
                mesh.rotation.y = chaseAngle;
              }
              return; // Skip wandering while chasing
            }
          }

          // Initialize wander state if needed
          if (!mesh.userData._wanderTime) {
            mesh.userData._wanderTime = time;
            mesh.userData._wanderDir = Math.random() * Math.PI * 2;
            // Store spawn point
            mesh.userData._spawnX = objData.worldX;
            mesh.userData._spawnZ = objData.worldZ;
          }
          
          // Change direction every 3-5 seconds
          if (time - mesh.userData._wanderTime > 3 + Math.random() * 2) {
            mesh.userData._wanderTime = time;
            mesh.userData._wanderDir = Math.random() * Math.PI * 2;
          }
          
          // Move slowly in wander direction (0.3 tiles/sec)
          var wanderSpeed = 0.3 * dt;
          var newX = mesh.position.x + Math.sin(mesh.userData._wanderDir) * wanderSpeed;
          var newZ = mesh.position.z + Math.cos(mesh.userData._wanderDir) * wanderSpeed;
          
          // Check if walkable and within reasonable range of spawn point
          var distFromSpawn = Math.sqrt(
            Math.pow(newX - mesh.userData._spawnX, 2) + 
            Math.pow(newZ - mesh.userData._spawnZ, 2)
          );
          
          if (distFromSpawn < 3 && window.GameTerrain && GameTerrain.isWalkable(newX, newZ)) {
            // Update mesh position
            mesh.position.x = newX;
            mesh.position.z = newZ;
            
            // Update hitbox position (so combat/interaction works)
            objData.worldX = newX;
            objData.worldZ = newZ;
            
            // Smooth rotation (like player)
            var targetAngle = mesh.userData._wanderDir;
            var angleDiff = targetAngle - mesh.rotation.y;
            
            // Normalize angle difference to always rotate the shortest way
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            mesh.rotation.y += angleDiff * 0.1; // Slower rotation than player
          } else {
            // Hit obstacle or too far, pick new direction
            mesh.userData._wanderDir = Math.random() * Math.PI * 2;
          }
        }
        
        // Bobbing animation
        mesh.position.y = Math.sin(time * 2 + mesh.id) * 0.02;

        // Animate legs
        mesh.children.forEach(function (child) {
          if (child.name === "leg") {
            child.rotation.x = Math.sin(time * 3 + mesh.id) * 0.2;
          }
        });
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
    var bodyColor = 0x4488cc; // default blue
    if (buildingEntityId === 'building.wood_cutter') {
      bodyColor = 0x8B4513; // brown
    } else if (buildingEntityId === 'building.stone_quarry') {
      bodyColor = 0x808080; // gray
    } else if (buildingEntityId === 'building.berry_gatherer') {
      bodyColor = 0x2d5a27; // green
    } else if (buildingEntityId === 'building.flint_mine') {
      bodyColor = 0x4a4a4a; // dark gray
    } else if (buildingEntityId === 'building.copper_mine') {
      bodyColor = 0xB87333; // copper
    } else if (buildingEntityId === 'building.tin_mine') {
      bodyColor = 0xC0C0C0; // silver
    }
    
    var scale = 0.6; // Smaller than player
    
    // Body (box)
    var bodyGeo = new THREE.BoxGeometry(0.25 * scale, 0.35 * scale, 0.15 * scale);
    var bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.25 * scale;
    body.castShadow = true;
    group.add(body);
    
    // Head (sphere)
    var headGeo = new THREE.SphereGeometry(0.12 * scale, 8, 8);
    var headMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.48 * scale;
    head.castShadow = true;
    group.add(head);
    
    // Arms (2 boxes)
    var armGeo = new THREE.BoxGeometry(0.08 * scale, 0.25 * scale, 0.08 * scale);
    var armMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
    
    var leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.18 * scale, 0.25 * scale, 0);
    leftArm.castShadow = true;
    leftArm.name = "leftArm";
    group.add(leftArm);
    
    var rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.18 * scale, 0.25 * scale, 0);
    rightArm.castShadow = true;
    rightArm.name = "rightArm";
    group.add(rightArm);
    
    // Legs (2 boxes)
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
