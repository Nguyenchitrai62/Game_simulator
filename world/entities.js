window.GameEntities = (function () {
  var _meshMap = new Map();
  var _dataMap = new Map();
  var _meshCounter = 0;
  var ACTIVE_CULLED_ANIMAL_DISTANCE = 18;
  var ACTIVE_CULLED_ANIMAL_DISTANCE_SQ = ACTIVE_CULLED_ANIMAL_DISTANCE * ACTIVE_CULLED_ANIMAL_DISTANCE;

  function init() {
    // Will populate as chunks are generated
  }

  function disposeMaterial(material, disposedMaterials) {
    if (!material) return;
    if (disposedMaterials.indexOf(material) !== -1) return;
    disposedMaterials.push(material);
    if (material.dispose) material.dispose();
  }

  function disposeObject3D(object3D) {
    if (!object3D) return;

    var disposedMaterials = [];
    object3D.traverse(function(child) {
      if (!child) return;
      if (typeof AtmosphereSystem !== 'undefined' && AtmosphereSystem.unregisterWindTarget) {
        AtmosphereSystem.unregisterWindTarget(child);
      }
      if (child.geometry && child.geometry.dispose) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          for (var i = 0; i < child.material.length; i++) {
            disposeMaterial(child.material[i], disposedMaterials);
          }
        } else {
          disposeMaterial(child.material, disposedMaterials);
        }
      }
    });
  }

  function removeObjectMesh(objData) {
    if (!objData) return false;

    var mesh = _meshMap.get(objData.id);
    if (!mesh) return false;

    if (typeof AtmosphereSystem !== 'undefined' && AtmosphereSystem.unregisterWindTarget) {
      AtmosphereSystem.unregisterWindTarget(mesh);
    }

    GameScene.getScene().remove(mesh);
    _meshMap.delete(objData.id);
    _dataMap.delete(mesh.id);
    disposeObject3D(mesh);
    return true;
  }

  function removeChunkObjects(chunkData) {
    if (!chunkData || !chunkData.objects) return;

    for (var i = 0; i < chunkData.objects.length; i++) {
      removeObjectMesh(chunkData.objects[i]);
    }
  }

  function applyMeshVisibility(mesh) {
    if (!mesh) return;
    mesh.visible = !mesh.userData._hidden && !mesh.userData._chunkCulled;
  }

  function setChunkObjectsVisible(chunkData, visible) {
    if (!chunkData || !chunkData.objects) return;

    var isChunkCulled = visible === false;
    for (var i = 0; i < chunkData.objects.length; i++) {
      var objData = chunkData.objects[i];
      var mesh = objData ? _meshMap.get(objData.id) : null;
      if (!mesh) continue;
      mesh.userData._chunkCulled = isChunkCulled;
      applyMeshVisibility(mesh);
    }
  }

  function addAnimalPart(group, geometry, material, x, y, z, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ, name) {
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.rotation.set(rotationX || 0, rotationY || 0, rotationZ || 0);
    if (scaleX !== undefined || scaleY !== undefined || scaleZ !== undefined) {
      mesh.scale.set(scaleX === undefined ? 1 : scaleX, scaleY === undefined ? 1 : scaleY, scaleZ === undefined ? 1 : scaleZ);
    }
    mesh.castShadow = true;
    if (name) mesh.name = name;
    group.add(mesh);
    return mesh;
  }

  function addAnimalSphere(group, material, radius, x, y, z, scaleX, scaleY, scaleZ, name) {
    return addAnimalPart(group, new THREE.SphereGeometry(radius, 10, 8), material, x, y, z, 0, 0, 0, scaleX, scaleY, scaleZ, name);
  }

  function addAnimalBox(group, material, width, height, depth, x, y, z, rotationX, rotationY, rotationZ, name) {
    return addAnimalPart(group, new THREE.BoxGeometry(width, height, depth), material, x, y, z, rotationX, rotationY, rotationZ, 1, 1, 1, name);
  }

  function addAnimalCylinderX(group, material, radiusTop, radiusBottom, length, x, y, z, tiltZ, name) {
    return addAnimalPart(group, new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 10), material, x, y, z, 0, 0, Math.PI / 2 + (tiltZ || 0), 1, 1, 1, name);
  }

  function addAnimalConeX(group, material, radius, length, x, y, z, tiltZ, name) {
    return addAnimalPart(group, new THREE.ConeGeometry(radius, length, 8), material, x, y, z, 0, 0, -Math.PI / 2 + (tiltZ || 0), 1, 1, 1, name);
  }

  function addAnimalLeg(group, material, width, height, depth, x, y, z) {
    return addAnimalBox(group, material, width, height, depth, x, y, z, 0, 0, 0, 'leg');
  }

  function addAnimalTail(group, material, thickness, length, x, y, z, tiltZ) {
    return addAnimalCylinderX(group, material, thickness * 0.65, thickness, length, x, y, z, tiltZ || 0, 'tail');
  }

  function addAnimalEyePair(group, color, size, x, y, zOffset) {
    var eyeMat = new THREE.MeshBasicMaterial({ color: color });
    addAnimalSphere(group, eyeMat, size, x, y, zOffset, 1, 1, 1);
    addAnimalSphere(group, eyeMat, size, x, y, -zOffset, 1, 1, 1);
  }

  function buildAnimalMesh(group, type, mainColor, scale) {
    var speciesDefaults = {
      'animal.wolf': 0x808080,
      'animal.boar': 0x8B6914,
      'animal.bear': 0x5C4033,
      'animal.lion': 0xC4A24E,
      'animal.bandit': 0x8B4513,
      'animal.sabertooth': 0xF4A460,
      'animal.deer': 0xA66B3D,
      'animal.rabbit': 0xD8CBB5
    };
    var baseColor = new THREE.Color(mainColor || speciesDefaults[type] || 0x808080);
    var darkColor = baseColor.clone().offsetHSL(0, 0, -0.16).getHex();
    var darkerColor = baseColor.clone().offsetHSL(0, 0, -0.28).getHex();
    var lightColor = baseColor.clone().offsetHSL(0, 0, 0.14).getHex();
    var furMat = new THREE.MeshLambertMaterial({ color: baseColor.getHex() });
    var furDarkMat = new THREE.MeshLambertMaterial({ color: darkColor });
    var furDarkerMat = new THREE.MeshLambertMaterial({ color: darkerColor });
    var furLightMat = new THREE.MeshLambertMaterial({ color: lightColor });
    var hornMat = new THREE.MeshLambertMaterial({ color: 0xf1e3c6 });
    var ivoryMat = new THREE.MeshLambertMaterial({ color: 0xf9f0dd });
    var maneMat = new THREE.MeshLambertMaterial({ color: type === 'animal.lion' ? 0x8f5d1e : 0x8c5a2b });
    var skinMat = new THREE.MeshLambertMaterial({ color: 0xd7b089 });
    var clothMat = new THREE.MeshLambertMaterial({ color: 0x2f3d54 });
    var clothDarkMat = new THREE.MeshLambertMaterial({ color: 0x202737 });
    var metalMat = new THREE.MeshLambertMaterial({ color: 0xa7adb8 });

    if (type === 'animal.wolf') {
      addAnimalCylinderX(group, furMat, 0.18, 0.2, 0.94, 0, 0.36, 0, 0);
      addAnimalSphere(group, furLightMat, 0.17, 0.2, 0.39, 0, 1.05, 1.1, 0.95);
      addAnimalSphere(group, furDarkMat, 0.17, -0.2, 0.34, 0, 1, 0.95, 1);
      addAnimalCylinderX(group, furDarkMat, 0.08, 0.11, 0.24, 0.44, 0.46, 0, -0.45);
      addAnimalBox(group, furMat, 0.26, 0.16, 0.15, 0.64, 0.48, 0, 0, 0, -0.08);
      addAnimalBox(group, furLightMat, 0.18, 0.09, 0.09, 0.82, 0.42, 0, 0, 0, 0.05);
      addAnimalConeX(group, furDarkMat, 0.05, 0.14, 0.58, 0.62, 0.09, -0.2);
      addAnimalConeX(group, furDarkMat, 0.05, 0.14, 0.58, 0.62, -0.09, -0.2);
      addAnimalTail(group, furDarkMat, 0.035, 0.3, -0.56, 0.44, 0, 0.55);
      addAnimalLeg(group, furDarkMat, 0.09, 0.34, 0.09, -0.23, 0.17, 0.12);
      addAnimalLeg(group, furDarkMat, 0.09, 0.34, 0.09, -0.23, 0.17, -0.12);
      addAnimalLeg(group, furDarkMat, 0.08, 0.36, 0.08, 0.22, 0.18, 0.11);
      addAnimalLeg(group, furDarkMat, 0.08, 0.36, 0.08, 0.22, 0.18, -0.11);
      addAnimalEyePair(group, 0x1a120f, 0.017, 0.75, 0.5, 0.05);
    } else if (type === 'animal.boar') {
      addAnimalCylinderX(group, furMat, 0.24, 0.27, 1.02, 0, 0.34, 0, 0.02);
      addAnimalSphere(group, furDarkMat, 0.19, 0.12, 0.47, 0, 1.12, 1.05, 1.08);
      addAnimalBox(group, furMat, 0.34, 0.22, 0.22, 0.63, 0.34, 0, 0, 0, -0.08);
      addAnimalCylinderX(group, furLightMat, 0.08, 0.1, 0.22, 0.84, 0.28, 0, 0.02);
      addAnimalConeX(group, hornMat, 0.03, 0.14, 0.92, 0.22, 0.1, -0.2);
      addAnimalConeX(group, hornMat, 0.03, 0.14, 0.92, 0.22, -0.1, -0.2);
      addAnimalConeX(group, furDarkMat, 0.04, 0.12, 0.52, 0.52, 0.11, -0.1);
      addAnimalConeX(group, furDarkMat, 0.04, 0.12, 0.52, 0.52, -0.11, -0.1);
      addAnimalTail(group, furDarkMat, 0.028, 0.12, -0.56, 0.43, 0, 1.1);
      addAnimalPart(group, new THREE.TorusGeometry(0.05, 0.01, 4, 10, Math.PI * 1.3), furDarkMat, -0.65, 0.47, 0, 0, 0, 0.2, 1, 1, 1);
      addAnimalLeg(group, furDarkerMat, 0.11, 0.28, 0.11, -0.22, 0.14, 0.14);
      addAnimalLeg(group, furDarkerMat, 0.11, 0.28, 0.11, -0.22, 0.14, -0.14);
      addAnimalLeg(group, furDarkerMat, 0.1, 0.28, 0.1, 0.22, 0.14, 0.13);
      addAnimalLeg(group, furDarkerMat, 0.1, 0.28, 0.1, 0.22, 0.14, -0.13);
      addAnimalEyePair(group, 0x20140d, 0.016, 0.76, 0.37, 0.06);
    } else if (type === 'animal.bear') {
      addAnimalCylinderX(group, furMat, 0.3, 0.32, 1.14, 0, 0.44, 0, 0);
      addAnimalSphere(group, furDarkMat, 0.24, 0.12, 0.56, 0, 1.18, 1.1, 1.05);
      addAnimalSphere(group, furMat, 0.24, 0.7, 0.56, 0, 1, 0.96, 1);
      addAnimalCylinderX(group, furLightMat, 0.1, 0.14, 0.2, 0.93, 0.48, 0, 0.08);
      addAnimalSphere(group, furMat, 0.22, 0.76, 0.56, 0, 1, 0.95, 1);
      addAnimalSphere(group, furLightMat, 0.08, 0.98, 0.44, 0, 1.1, 0.9, 0.9);
      addAnimalSphere(group, furDarkMat, 0.06, 0.66, 0.77, 0.12, 1, 1, 1);
      addAnimalSphere(group, furDarkMat, 0.06, 0.66, 0.77, -0.12, 1, 1, 1);
      addAnimalTail(group, furDarkMat, 0.04, 0.08, -0.66, 0.48, 0, 0.3);
      addAnimalLeg(group, furDarkerMat, 0.13, 0.44, 0.13, -0.28, 0.22, 0.15);
      addAnimalLeg(group, furDarkerMat, 0.13, 0.44, 0.13, -0.28, 0.22, -0.15);
      addAnimalLeg(group, furDarkerMat, 0.12, 0.44, 0.12, 0.27, 0.22, 0.14);
      addAnimalLeg(group, furDarkerMat, 0.12, 0.44, 0.12, 0.27, 0.22, -0.14);
      addAnimalEyePair(group, 0x20140d, 0.018, 0.86, 0.58, 0.06);
    } else if (type === 'animal.lion' || type === 'animal.sabertooth') {
      addAnimalCylinderX(group, furMat, 0.22, 0.24, 1.04, 0, 0.39, 0, 0);
      addAnimalSphere(group, furLightMat, 0.18, 0.18, 0.42, 0, 1.05, 1.08, 0.95);
      addAnimalSphere(group, furDarkMat, 0.17, -0.18, 0.35, 0, 0.98, 0.95, 1);
      addAnimalCylinderX(group, furMat, 0.08, 0.1, 0.22, 0.44, 0.48, 0, -0.35);
      addAnimalSphere(group, furMat, type === 'animal.sabertooth' ? 0.2 : 0.18, 0.67, 0.51, 0, 1, 0.95, 0.95);
      addAnimalBox(group, furLightMat, 0.18, 0.1, 0.11, 0.84, 0.44, 0, 0, 0, -0.06);
      addAnimalConeX(group, furDarkMat, 0.045, 0.12, 0.61, 0.63, 0.09, -0.15);
      addAnimalConeX(group, furDarkMat, 0.045, 0.12, 0.61, 0.63, -0.09, -0.15);
      if (type === 'animal.lion') {
        addAnimalSphere(group, maneMat, 0.24, 0.6, 0.5, 0, 1.2, 1.15, 1.15);
      } else {
        addAnimalSphere(group, furDarkMat, 0.21, 0.58, 0.52, 0, 1.12, 1.05, 1.05);
        addAnimalPart(group, new THREE.BoxGeometry(0.16, 0.05, 0.2), furDarkMat, 0.26, 0.56, 0, 0, 0, 0, 1, 1, 1);
        addAnimalPart(group, new THREE.ConeGeometry(0.025, 0.16, 8), ivoryMat, 0.86, 0.29, 0.055, Math.PI, 0, 0, 1, 1, 1);
        addAnimalPart(group, new THREE.ConeGeometry(0.025, 0.16, 8), ivoryMat, 0.86, 0.29, -0.055, Math.PI, 0, 0, 1, 1, 1);
      }
      addAnimalTail(group, furDarkMat, 0.026, type === 'animal.sabertooth' ? 0.34 : 0.42, -0.58, 0.46, 0, 0.58);
      if (type === 'animal.lion') {
        addAnimalSphere(group, maneMat, 0.05, -0.77, 0.49, 0, 1, 1, 1);
      }
      addAnimalLeg(group, furDarkMat, 0.1, 0.4, 0.1, -0.22, 0.2, 0.12);
      addAnimalLeg(group, furDarkMat, 0.1, 0.4, 0.1, -0.22, 0.2, -0.12);
      addAnimalLeg(group, furDarkMat, 0.09, 0.42, 0.09, 0.24, 0.21, 0.11);
      addAnimalLeg(group, furDarkMat, 0.09, 0.42, 0.09, 0.24, 0.21, -0.11);
      addAnimalEyePair(group, 0x20140d, 0.017, 0.76, 0.52, 0.05);
    } else if (type === 'animal.deer') {
      addAnimalCylinderX(group, furMat, 0.16, 0.18, 0.98, 0, 0.47, 0, 0);
      addAnimalSphere(group, furLightMat, 0.15, 0.18, 0.49, 0, 1.02, 1.08, 0.9);
      addAnimalCylinderX(group, furLightMat, 0.07, 0.08, 0.28, 0.46, 0.65, 0, -0.72);
      addAnimalBox(group, furMat, 0.26, 0.13, 0.11, 0.74, 0.76, 0, 0, 0, -0.06);
      addAnimalBox(group, furLightMat, 0.18, 0.08, 0.08, 0.9, 0.72, 0, 0, 0, 0.02);
      addAnimalConeX(group, furDarkMat, 0.035, 0.14, 0.68, 0.87, 0.07, -0.05);
      addAnimalConeX(group, furDarkMat, 0.035, 0.14, 0.68, 0.87, -0.07, -0.05);
      addAnimalBox(group, hornMat, 0.025, 0.24, 0.025, 0.64, 1.02, 0.06, 0, 0, -0.05);
      addAnimalBox(group, hornMat, 0.025, 0.24, 0.025, 0.64, 1.02, -0.06, 0, 0, 0.05);
      addAnimalBox(group, hornMat, 0.14, 0.025, 0.025, 0.69, 1.1, 0.1, 0, 0, 0.35);
      addAnimalBox(group, hornMat, 0.14, 0.025, 0.025, 0.69, 1.1, -0.1, 0, 0, -0.35);
      addAnimalTail(group, furLightMat, 0.022, 0.12, -0.56, 0.54, 0, 0.9);
      addAnimalLeg(group, furDarkMat, 0.06, 0.58, 0.06, -0.2, 0.21, 0.1);
      addAnimalLeg(group, furDarkMat, 0.06, 0.58, 0.06, -0.2, 0.21, -0.1);
      addAnimalLeg(group, furDarkMat, 0.055, 0.62, 0.055, 0.22, 0.23, 0.09);
      addAnimalLeg(group, furDarkMat, 0.055, 0.62, 0.055, 0.22, 0.23, -0.09);
      addAnimalEyePair(group, 0x20140d, 0.014, 0.82, 0.78, 0.04);
    } else if (type === 'animal.rabbit') {
      addAnimalSphere(group, furMat, 0.24, -0.03, 0.24, 1.2, 0.9, 1);
      addAnimalSphere(group, furLightMat, 0.16, 0.2, 0.25, 1, 0.92, 0.95);
      addAnimalSphere(group, furMat, 0.15, 0.36, 0.31, 1, 1, 0.96);
      addAnimalBox(group, furLightMat, 0.12, 0.06, 0.06, 0.5, 0.29, 0, 0, 0, 0.06);
      addAnimalBox(group, furMat, 0.05, 0.28, 0.04, 0.34, 0.57, 0.06, 0, 0, -0.1);
      addAnimalBox(group, furMat, 0.05, 0.3, 0.04, 0.34, 0.57, -0.06, 0, 0, -0.1);
      addAnimalBox(group, new THREE.MeshLambertMaterial({ color: 0xf1c4bf }), 0.025, 0.18, 0.02, 0.35, 0.55, 0.06, 0, 0, -0.1);
      addAnimalBox(group, new THREE.MeshLambertMaterial({ color: 0xf1c4bf }), 0.025, 0.2, 0.02, 0.35, 0.55, -0.06, 0, 0, -0.1);
      addAnimalTail(group, furLightMat, 0.03, 0.08, -0.34, 0.33, 0, 1.1);
      addAnimalLeg(group, furDarkMat, 0.06, 0.16, 0.06, 0.24, 0.08, 0.08);
      addAnimalLeg(group, furDarkMat, 0.06, 0.16, 0.06, 0.24, 0.08, -0.08);
      addAnimalLeg(group, furDarkMat, 0.08, 0.22, 0.08, -0.14, 0.11, 0.09);
      addAnimalLeg(group, furDarkMat, 0.08, 0.22, 0.08, -0.14, 0.11, -0.09);
      addAnimalEyePair(group, 0x1a120f, 0.016, 0.44, 0.34, 0.05);
    } else if (type === 'animal.bandit') {
      addAnimalBox(group, clothMat, 0.34, 0.48, 0.2, 0, 0.54, 0, 0, 0, 0.02);
      addAnimalBox(group, clothDarkMat, 0.4, 0.16, 0.24, 0, 0.76, 0, 0, 0, 0.04);
      addAnimalSphere(group, skinMat, 0.14, 0, 0.93, 0, 1, 1.02, 0.98);
      addAnimalConeX(group, clothDarkMat, 0.16, 0.2, -0.02, 1.03, 0, Math.PI / 2);
      addAnimalBox(group, clothDarkMat, 0.09, 0.34, 0.09, -0.22, 0.55, 0, 0, 0, 0.18);
      addAnimalBox(group, clothDarkMat, 0.09, 0.34, 0.09, 0.22, 0.55, 0.08, 0, 0, -0.4);
      addAnimalBox(group, metalMat, 0.05, 0.5, 0.05, 0.37, 0.45, 0.18, 0, 0, -0.28);
      addAnimalConeX(group, metalMat, 0.03, 0.16, 0.46, 0.67, 0.18, -0.28);
      addAnimalLeg(group, clothDarkMat, 0.1, 0.42, 0.1, -0.08, 0.21, 0.06);
      addAnimalLeg(group, clothDarkMat, 0.1, 0.42, 0.1, 0.08, 0.21, -0.06);
      addAnimalEyePair(group, 0x1a120f, 0.016, 0.05, 0.96, 0.05);
    } else {
      addAnimalCylinderX(group, furMat, 0.18, 0.2, 0.9, 0, 0.36, 0, 0);
      addAnimalSphere(group, furMat, 0.18, 0.62, 0.44, 0, 1, 1, 1);
      addAnimalTail(group, furDarkMat, 0.03, 0.24, -0.52, 0.43, 0, 0.5);
      addAnimalLeg(group, furDarkMat, 0.08, 0.34, 0.08, -0.22, 0.17, 0.11);
      addAnimalLeg(group, furDarkMat, 0.08, 0.34, 0.08, -0.22, 0.17, -0.11);
      addAnimalLeg(group, furDarkMat, 0.08, 0.34, 0.08, 0.22, 0.17, 0.11);
      addAnimalLeg(group, furDarkMat, 0.08, 0.34, 0.08, 0.22, 0.17, -0.11);
      addAnimalEyePair(group, 0x1a120f, 0.016, 0.76, 0.46, 0.05);
    }

    group.scale.set(scale, scale, scale);
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
        mesh.userData.chunkKey = cx + ',' + cz;
        mesh.userData._chunkCulled = chunkData.isVisible === false;
        GameScene.getScene().add(mesh);
        applyMeshVisibility(mesh);

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
    var nodeInfo = (objData && typeof GameTerrain !== 'undefined' && GameTerrain.getNodeInfo) ? GameTerrain.getNodeInfo(objData) : null;

    if (nodeInfo) {
      scale *= nodeInfo.scale || 1;
    }

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
      var trunkMat = new THREE.MeshLambertMaterial({ color: nodeInfo && nodeInfo.trunkColor ? nodeInfo.trunkColor : 0x8B4513 });
      var trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      group.add(trunk);

      var leavesColor = nodeInfo && nodeInfo.leafColor ? nodeInfo.leafColor : (mainColor || 0x2d5a27);
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

      if (nodeInfo && nodeInfo.isGiant) {
        var giantGeo = new THREE.SphereGeometry(0.35, 10, 8);
        var giantMat = new THREE.MeshLambertMaterial({ color: leavesBaseColor.clone().offsetHSL(0, 0, -0.05).getHex() });
        var giantCanopy = new THREE.Mesh(giantGeo, giantMat);
        giantCanopy.position.set(-0.22, trunkH + 0.48, -0.12);
        giantCanopy.castShadow = true;
        canopyGroup.add(giantCanopy);
      }

      group.scale.set(scale, scale, scale);

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

      var rockChunkCount = nodeInfo && nodeInfo.chunkCount ? nodeInfo.chunkCount : 3;
      var chunkOffsets = [
        { size: 0.12, x: 0.28, y: 0.08, z: 0.18, rx: 0.8, ry: 0.2 },
        { size: 0.08, x: -0.2, y: 0.06, z: -0.15, rx: 1.2, ry: 0.7 },
        { size: 0.1, x: 0.05, y: 0.05, z: -0.26, rx: 0.5, ry: 1.1 },
        { size: 0.07, x: -0.32, y: 0.04, z: 0.12, rx: 0.9, ry: 0.4 }
      ];

      for (var chunkIndex = 0; chunkIndex < Math.max(0, rockChunkCount - 1) && chunkIndex < chunkOffsets.length; chunkIndex++) {
        var chunkDef = chunkOffsets[chunkIndex];
        var chunkGeo = new THREE.DodecahedronGeometry(chunkDef.size * scale, 0);
        var chunkMesh = new THREE.Mesh(chunkGeo, rockMat);
        chunkMesh.position.set(chunkDef.x * scale, chunkDef.y * scale, chunkDef.z * scale);
        chunkMesh.rotation.set(chunkDef.rx, chunkDef.ry, 0);
        group.add(chunkMesh);
      }

      // Moss patches on regular rocks
      if (type === "node.rock") {
        var mossColors = [0x4a8a3a, 0x3a7a2e, 0x5a9a4a];
        var mossCount = nodeInfo && nodeInfo.mossPatches !== undefined ? nodeInfo.mossPatches : 2;
        for (var mi = 0; mi < mossCount; mi++) {
          var mossGeo = new THREE.SphereGeometry(0.04, 4, 3);
          var mossMat = new THREE.MeshLambertMaterial({ color: mossColors[mi % 3] });
          var moss = new THREE.Mesh(mossGeo, mossMat);
          moss.position.set(
            (Math.cos(mi * 1.7) * 0.17) * scale,
            (0.28 + (mi % 2) * 0.06) * scale,
            (Math.sin(mi * 1.7) * 0.14) * scale
          );
          group.add(moss);
        }
      }

      // Ore specks for deposit types
      if (type === "node.copper_deposit") {
        addOreSpecks(group, 0xE87520, scale, nodeInfo && nodeInfo.speckCount ? nodeInfo.speckCount : 4);
        addOreSpikes(group, 0xC96A1A, scale, nodeInfo && nodeInfo.spireCount ? nodeInfo.spireCount : 1, nodeInfo && nodeInfo.spireHeight ? nodeInfo.spireHeight : 0.18);
      } else if (type === "node.tin_deposit") {
        addOreSpecks(group, 0xE8E8E8, scale, nodeInfo && nodeInfo.speckCount ? nodeInfo.speckCount : 3);
        addOreSpikes(group, 0xF2F2F2, scale, nodeInfo && nodeInfo.spireCount ? nodeInfo.spireCount : 1, nodeInfo && nodeInfo.spireHeight ? nodeInfo.spireHeight : 0.16);
      } else if (type === "node.iron_deposit") {
        addOreSpecks(group, 0xAA3333, scale, nodeInfo && nodeInfo.speckCount ? nodeInfo.speckCount : 4);
        addOreSpikes(group, 0x7A2A2A, scale, nodeInfo && nodeInfo.spireCount ? nodeInfo.spireCount : 1, nodeInfo && nodeInfo.spireHeight ? nodeInfo.spireHeight : 0.2);
      } else if (type === "node.coal_deposit") {
        addOreSpecks(group, 0x555555, scale, nodeInfo && nodeInfo.speckCount ? nodeInfo.speckCount : 3);
        addOreSpikes(group, 0x242424, scale, nodeInfo && nodeInfo.spireCount ? nodeInfo.spireCount : 1, nodeInfo && nodeInfo.spireHeight ? nodeInfo.spireHeight : 0.16);
      }

    } else if (type === "node.berry_bush") {
      var bushColor = nodeInfo && nodeInfo.leafColor ? nodeInfo.leafColor : (mainColor || 0x3a7a2e);
      var berryStage = Math.max(0, Math.min(2, typeof objData.growthStage === "number" ? objData.growthStage : 0));
      var bushMat = new THREE.MeshLambertMaterial({ color: bushColor });
      var stemMat = new THREE.MeshLambertMaterial({ color: 0x6F4A25 });
      var canopyLayouts = [
        [
          { r: 0.22, x: 0.00, y: 0.20, z: 0.00 },
          { r: 0.14, x: 0.13, y: 0.18, z: 0.08 },
          { r: 0.12, x: -0.11, y: 0.17, z: -0.06 }
        ],
        [
          { r: 0.2, x: -0.02, y: 0.22, z: 0.00 },
          { r: 0.16, x: 0.16, y: 0.21, z: 0.09 },
          { r: 0.15, x: -0.15, y: 0.20, z: -0.08 },
          { r: 0.13, x: 0.03, y: 0.33, z: 0.12 }
        ],
        [
          { r: 0.21, x: 0.00, y: 0.24, z: 0.00 },
          { r: 0.17, x: 0.18, y: 0.22, z: 0.10 },
          { r: 0.17, x: -0.18, y: 0.22, z: -0.08 },
          { r: 0.15, x: 0.08, y: 0.36, z: 0.14 },
          { r: 0.15, x: -0.08, y: 0.34, z: -0.12 }
        ]
      ];
      var stemLayouts = [
        [ { h: 0.18, x: 0.00, z: 0.00 } ],
        [ { h: 0.2, x: -0.04, z: -0.03 }, { h: 0.18, x: 0.06, z: 0.04 } ],
        [ { h: 0.22, x: -0.05, z: -0.04 }, { h: 0.2, x: 0.06, z: 0.05 }, { h: 0.18, x: 0.01, z: -0.07 } ]
      ];
      var berryBunchLayouts = [
        [
          { x: 0.13, y: 0.28, z: 0.08, extras: 0 },
          { x: -0.12, y: 0.27, z: -0.06, extras: 0 },
          { x: 0.02, y: 0.23, z: 0.14, extras: 0 }
        ],
        [
          { x: 0.15, y: 0.31, z: 0.09, extras: 1 },
          { x: -0.15, y: 0.29, z: -0.08, extras: 1 },
          { x: 0.03, y: 0.35, z: 0.13, extras: 1 },
          { x: 0.11, y: 0.22, z: -0.14, extras: 1 },
          { x: -0.05, y: 0.24, z: 0.17, extras: 1 }
        ],
        [
          { x: 0.16, y: 0.33, z: 0.10, extras: 2 },
          { x: -0.16, y: 0.31, z: -0.09, extras: 2 },
          { x: 0.05, y: 0.39, z: 0.15, extras: 2 },
          { x: -0.04, y: 0.36, z: -0.14, extras: 2 },
          { x: 0.13, y: 0.24, z: -0.15, extras: 1 },
          { x: -0.14, y: 0.24, z: 0.13, extras: 1 },
          { x: 0.01, y: 0.21, z: 0.19, extras: 1 }
        ]
      ];

      var stemDefs = stemLayouts[berryStage];
      for (var stemIndex = 0; stemIndex < stemDefs.length; stemIndex++) {
        var stemDef = stemDefs[stemIndex];
        var stemGeo = new THREE.CylinderGeometry(0.025, 0.04, stemDef.h, 5);
        var stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(stemDef.x, stemDef.h / 2, stemDef.z);
        stem.rotation.z = stemIndex === 0 ? 0 : (stemIndex % 2 === 0 ? -0.22 : 0.18);
        stem.castShadow = true;
        group.add(stem);
      }

      var canopyDefs = canopyLayouts[berryStage];
      for (var canopyIndex = 0; canopyIndex < canopyDefs.length; canopyIndex++) {
        var canopyDef = canopyDefs[canopyIndex];
        var canopyGeo = new THREE.SphereGeometry(canopyDef.r, 10, 8);
        var canopy = new THREE.Mesh(canopyGeo, bushMat);
        canopy.position.set(canopyDef.x, canopyDef.y, canopyDef.z);
        canopy.castShadow = true;
        group.add(canopy);
      }

      var berryBaseColor = new THREE.Color(nodeInfo && nodeInfo.berryColor ? nodeInfo.berryColor : 0xcc3333);
      var berryMat = new THREE.MeshLambertMaterial({ color: berryBaseColor.getHex() });
      var berryMatDark = new THREE.MeshLambertMaterial({ color: berryBaseColor.clone().offsetHSL(0, 0, -0.1).getHex() });
      var mainBerryRadius = berryStage === 0 ? 0.075 : (berryStage === 1 ? 0.07 : 0.066);
      var berryBunches = berryBunchLayouts[berryStage];

      for (var bunchIndex = 0; bunchIndex < berryBunches.length; bunchIndex++) {
        var bunchDef = berryBunches[bunchIndex];
        var mainBerryGeo = new THREE.SphereGeometry(mainBerryRadius, 10, 8);
        var mainBerry = new THREE.Mesh(mainBerryGeo, bunchIndex % 2 === 0 ? berryMat : berryMatDark);
        mainBerry.position.set(bunchDef.x, bunchDef.y, bunchDef.z);
        mainBerry.castShadow = true;
        group.add(mainBerry);

        for (var extraIndex = 0; extraIndex < bunchDef.extras; extraIndex++) {
          var extraRadius = mainBerryRadius * (0.62 - extraIndex * 0.08);
          var extraBerryGeo = new THREE.SphereGeometry(extraRadius, 8, 6);
          var extraBerry = new THREE.Mesh(extraBerryGeo, extraIndex % 2 === 0 ? berryMatDark : berryMat);
          var offsetAngle = (bunchIndex * 1.45) + (extraIndex * 2.1);
          var offsetRadius = mainBerryRadius * (0.95 + extraIndex * 0.15);
          extraBerry.position.set(
            bunchDef.x + Math.cos(offsetAngle) * offsetRadius,
            bunchDef.y - mainBerryRadius * (0.18 + extraIndex * 0.12),
            bunchDef.z + Math.sin(offsetAngle) * offsetRadius
          );
          extraBerry.castShadow = true;
          group.add(extraBerry);
        }
      }

      group.scale.set(scale, scale, scale);

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

      addOreSpikes(group, 0x6A6A6A, 1, nodeInfo && nodeInfo.shardCount ? nodeInfo.shardCount : 2, nodeInfo && nodeInfo.shardHeight ? nodeInfo.shardHeight : 0.22);
      group.scale.set(scale, scale, scale);

    } else if (type === "animal.wolf" || type === "animal.boar" || type === "animal.bear" || type === "animal.lion" || type === "animal.bandit" || type === "animal.sabertooth" || type === "animal.deer" || type === "animal.rabbit") {
      buildAnimalMesh(group, type, mainColor, scale);

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

  function refreshObject(objData) {
    var existingMesh = _meshMap.get(objData.id);
    if (!existingMesh) return false;

    var wasHidden = !!existingMesh.userData._hidden;
    var wasChunkCulled = !!existingMesh.userData._chunkCulled;
    var chunkKey = existingMesh.userData.chunkKey;
    var nextX = objData && objData.worldX !== undefined ? objData.worldX : existingMesh.position.x;
    var nextY = existingMesh.position && existingMesh.position.y !== undefined ? existingMesh.position.y : 0;
    var nextZ = objData && objData.worldZ !== undefined ? objData.worldZ : existingMesh.position.z;

     if (typeof AtmosphereSystem !== 'undefined' && AtmosphereSystem.unregisterWindTarget) {
      AtmosphereSystem.unregisterWindTarget(existingMesh);
    }

    GameScene.getScene().remove(existingMesh);
    _meshMap.delete(objData.id);
    _dataMap.delete(existingMesh.id);
    disposeObject3D(existingMesh);

    var entity = GameRegistry.getEntity(objData.type);
    var refreshedMesh = createMesh(objData.type, entity, objData);
    if (!refreshedMesh) return false;

    refreshedMesh.position.set(nextX, nextY, nextZ);
    refreshedMesh.userData.objectId = objData.id;
    refreshedMesh.userData.chunkKey = chunkKey;
    refreshedMesh.userData._chunkCulled = wasChunkCulled;

    if (wasHidden) {
      refreshedMesh.userData._hidden = true;
    }
    applyMeshVisibility(refreshedMesh);

    GameScene.getScene().add(refreshedMesh);
    _meshMap.set(objData.id, refreshedMesh);
    _dataMap.set(refreshedMesh.id, objData);

    return true;
  }

  function hideObject(objData) {
    var mesh = _meshMap.get(objData.id);
    if (mesh) {
      mesh.userData._hidden = true;
      applyMeshVisibility(mesh);
    }
  }

  function showObject(objData) {
    var mesh = _meshMap.get(objData.id);
    if (mesh) {
      mesh.userData._hidden = false;
      applyMeshVisibility(mesh);
      
      // For animals, sync the visible mesh with the latest respawn location.
      if (objData.type && objData.type.startsWith("animal.")) {
        var spawnX = objData.worldX;
        var spawnZ = objData.worldZ;
        if ((spawnX === undefined || spawnZ === undefined) && mesh.userData._spawnX !== undefined && mesh.userData._spawnZ !== undefined) {
          spawnX = mesh.userData._spawnX;
          spawnZ = mesh.userData._spawnZ;
        }
        if (spawnX !== undefined && spawnZ !== undefined) {
          mesh.position.x = spawnX;
          mesh.position.z = spawnZ;
          objData.worldX = spawnX;
          objData.worldZ = spawnZ;
          mesh.userData._spawnX = spawnX;
          mesh.userData._spawnZ = spawnZ;
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
      turnRate: 0.18,
      disposition: (window.GameRegistry && GameRegistry.getAnimalDisposition) ? GameRegistry.getAnimalDisposition(type) : ((balance && balance.animalDisposition) || 'threat')
    };

    settings.isThreat = settings.disposition !== 'prey';

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
    } else if (type === 'animal.deer') {
      settings.patrolRadius = 3.8;
      settings.patrolSpeed = 0.48;
      settings.returnSpeed = 0.84;
      settings.turnRate = 0.22;
    } else if (type === 'animal.rabbit') {
      settings.patrolRadius = 2.4;
      settings.patrolSpeed = 0.54;
      settings.returnSpeed = 0.96;
      settings.turnRate = 0.28;
    }

    if (settings.isThreat) {
      var aggroRange = Number(balance && balance.aggroRange);
      settings.aggroRange = aggroRange >= 0 ? aggroRange : 3;
      settings.attackRange = Math.max(1.05, settings.aggroRange * 0.55);
      settings.chaseRange = Math.max(settings.attackRange + 1.25, settings.aggroRange * 2.3);
      settings.fleeRange = 0;
      settings.fleeSpeed = settings.returnSpeed;
    } else {
      settings.aggroRange = 0;
      settings.attackRange = 0;
      settings.chaseRange = 0;
      settings.fleeRange = Number(balance && balance.fleeRange) > 0 ? Number(balance && balance.fleeRange) : 2.4;
      settings.fleeSpeed = Number(balance && balance.fleeSpeed) > 0 ? Number(balance && balance.fleeSpeed) : Math.max(settings.returnSpeed, settings.patrolSpeed + 0.35);
    }

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

  function moveAnimalAwayFromTarget(mesh, objData, dangerX, dangerZ, speed, dt, turnRate, settings) {
    var awayX = objData.worldX - dangerX;
    var awayZ = objData.worldZ - dangerZ;
    var awayDistance = Math.sqrt(awayX * awayX + awayZ * awayZ);
    if (awayDistance < 0.001) {
      awayX = objData.worldX - mesh.userData._spawnX;
      awayZ = objData.worldZ - mesh.userData._spawnZ;
      awayDistance = Math.sqrt(awayX * awayX + awayZ * awayZ);
    }
    if (awayDistance < 0.001) {
      awayX = 1;
      awayZ = 0;
      awayDistance = 1;
    }

    var desiredDistance = Math.max((settings && settings.fleeRange) || 2.4, 1.6);
    var targetX = objData.worldX + (awayX / awayDistance) * desiredDistance;
    var targetZ = objData.worldZ + (awayZ / awayDistance) * desiredDistance;
    var spawnDx = targetX - mesh.userData._spawnX;
    var spawnDz = targetZ - mesh.userData._spawnZ;
    var maxDistanceFromSpawn = ((settings && settings.patrolRadius) || 3) * 1.8;
    var targetDistanceFromSpawn = Math.sqrt(spawnDx * spawnDx + spawnDz * spawnDz);

    if (targetDistanceFromSpawn > maxDistanceFromSpawn) {
      targetX = mesh.userData._spawnX + (spawnDx / targetDistanceFromSpawn) * maxDistanceFromSpawn;
      targetZ = mesh.userData._spawnZ + (spawnDz / targetDistanceFromSpawn) * maxDistanceFromSpawn;
    }

    return moveAnimal(mesh, objData, targetX, targetZ, speed, dt, turnRate);
  }

  function getWorkerTargetForAnimal(objData, settings) {
    return null;
  }

  function updateAnimalAnimation(mesh, time, state) {
    var moveSpeed = mesh.userData._moveSpeed || 0;
    var moving = moveSpeed > 0.01;
    var chaseState = state === 'chase' || state === 'flee';
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

  function shouldSimulateAnimal(mesh, objData, playerPos, activeTarget) {
    if (!mesh || !objData || (mesh.userData && mesh.userData._hidden)) return false;
    if (activeTarget === objData) return true;
    if (!mesh.userData || !mesh.userData._chunkCulled) return true;
    if (!playerPos) return false;

    var dx = objData.worldX - playerPos.x;
    if (Math.abs(dx) > ACTIVE_CULLED_ANIMAL_DISTANCE) return false;
    var dz = objData.worldZ - playerPos.z;
    if (Math.abs(dz) > ACTIVE_CULLED_ANIMAL_DISTANCE) return false;
    return (dx * dx + dz * dz) <= ACTIVE_CULLED_ANIMAL_DISTANCE_SQ;
  }

  function update(dt) {
    if (window.GameDebugSettings && GameDebugSettings.isEnabled && !GameDebugSettings.isEnabled('animals')) {
      if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
        GamePerf.setValue('animal.total', 0);
        GamePerf.setValue('animal.simulated', 0);
      }
      return;
    }

    var time = performance.now() / 1000;
    var playerPos = window.GamePlayer ? GamePlayer.getPosition() : null;
    var combatActive = window.GameCombat && GameCombat.isActive && GameCombat.isActive();
    var activeTarget = combatActive && GameCombat.getTarget ? GameCombat.getTarget() : null;
    var totalAnimals = 0;
    var simulatedAnimals = 0;

    _meshMap.forEach(function (mesh) {
      var objData = _dataMap.get(mesh.id);
      if (!objData) return;

      if (objData.type && objData.type.startsWith("animal.") && objData.hp > 0 && !objData._destroyed) {
        totalAnimals++;
        if (!shouldSimulateAnimal(mesh, objData, playerPos, activeTarget)) return;

        simulatedAnimals++;
        ensureAnimalState(mesh, objData, time);
        var balance = GameRegistry.getBalance(objData.type) || {};
        var settings = getAnimalBehaviorSettings(objData.type, balance);
        var isOwnCombat = activeTarget === objData;
        var distToPlayer = playerPos ? Math.sqrt(
          Math.pow(objData.worldX - playerPos.x, 2) +
          Math.pow(objData.worldZ - playerPos.z, 2)
        ) : Infinity;
        var workerTarget = getWorkerTargetForAnimal(objData, settings);
        var distToWorker = workerTarget ? workerTarget.distance : Infinity;
        var preferWorker = !!workerTarget && (combatActive || !playerPos || distToWorker <= distToPlayer || distToPlayer > settings.chaseRange);
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
        } else if (settings.isThreat && workerTarget && preferWorker) {
          mesh.userData._movementState = 'chase';
          mesh.userData._patrolTarget = null;
          mesh.userData._idleUntil = 0;

          if (window.NPCSystem && NPCSystem.reportWorkerThreat) {
            NPCSystem.reportWorkerThreat(workerTarget.npcUid, objData.type, objData.id, distToWorker, distToWorker <= settings.attackRange);
          }

          if (distToWorker <= settings.attackRange) {
            mesh.userData._moveSpeed = 0;
            turnAnimalTowards(mesh, Math.atan2(workerTarget.x - objData.worldX, workerTarget.z - objData.worldZ), settings.turnRate * 1.4);
          } else {
            var reachedWorker = moveAnimal(mesh, objData, workerTarget.x, workerTarget.z, settings.chaseSpeed, dt, settings.turnRate);
            if (!reachedWorker && mesh.userData._moveSpeed === 0) {
              mesh.userData._movementState = 'return';
            }
          }
        } else if (settings.isThreat && !combatActive && playerPos && distToPlayer <= settings.chaseRange) {
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
        } else if (!settings.isThreat && playerPos && distToPlayer <= settings.fleeRange) {
          mesh.userData._movementState = 'flee';
          mesh.userData._patrolTarget = null;
          mesh.userData._idleUntil = 0;

          var escaped = moveAnimalAwayFromTarget(mesh, objData, playerPos.x, playerPos.z, settings.fleeSpeed, dt, settings.turnRate, settings);
          if (distToPlayer > settings.fleeRange * 1.2) {
            mesh.userData._movementState = 'patrol';
          } else if (!escaped && mesh.userData._moveSpeed === 0) {
            mesh.userData._movementState = 'return';
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

    if (typeof GamePerf !== 'undefined' && GamePerf.setValue) {
      GamePerf.setValue('animal.total', totalAnimals);
      GamePerf.setValue('animal.simulated', simulatedAnimals);
    }
  }

  function getMeshForObjectId(objectId) {
    if (!objectId) return null;
    return _meshMap.get(objectId) || null;
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
      bodyColor = 0x8B7355;
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
    } else if (buildingEntityId === 'building.farm_plot') {
      bodyColor = 0x6B8E23;
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
      // Multi-purpose resident basket
      toolGeo = new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.06 * scale, 6);
      toolColor = 0xBEAA78;
    } else if (buildingEntityId === 'building.farm_plot') {
      toolGeo = new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.08 * scale, 6);
      toolColor = 0x6B8E9B;
    } else if (buildingEntityId === 'building.coal_mine') {
      toolGeo = new THREE.BoxGeometry(0.03 * scale, 0.2 * scale, 0.03 * scale);
      toolColor = 0x333333;
    }
    
    if (toolGeo) {
      var toolMat = new THREE.MeshLambertMaterial({ color: toolColor });
      var toolMesh = new THREE.Mesh(toolGeo, toolMat);
      if (buildingEntityId === 'building.berry_gatherer' || buildingEntityId === 'building.farm_plot') {
        toolMesh.position.set(0.12 * scale, 0.25 * scale, 0);
      } else {
        toolMesh.position.set(0, 0.3 * scale, -0.1 * scale);
        toolMesh.rotation.z = -0.3;
      }
      group.add(toolMesh);
    }

    if (buildingEntityId === 'building.berry_gatherer') {
      var hoeHandleGeo = new THREE.BoxGeometry(0.025 * scale, 0.24 * scale, 0.025 * scale);
      var hoeHandleMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
      var hoeHandle = new THREE.Mesh(hoeHandleGeo, hoeHandleMat);
      hoeHandle.position.set(-0.02 * scale, 0.31 * scale, -0.11 * scale);
      hoeHandle.rotation.z = -0.35;
      group.add(hoeHandle);

      var hoeHeadGeo = new THREE.BoxGeometry(0.09 * scale, 0.03 * scale, 0.02 * scale);
      var hoeHeadMat = new THREE.MeshLambertMaterial({ color: 0x6f767d });
      var hoeHead = new THREE.Mesh(hoeHeadGeo, hoeHeadMat);
      hoeHead.position.set(-0.09 * scale, 0.41 * scale, -0.11 * scale);
      hoeHead.rotation.z = -0.35;
      group.add(hoeHead);

      var pickHeadGeo = new THREE.BoxGeometry(0.08 * scale, 0.025 * scale, 0.02 * scale);
      var pickHead = new THREE.Mesh(pickHeadGeo, hoeHeadMat);
      pickHead.position.set(0.12 * scale, 0.38 * scale, -0.11 * scale);
      pickHead.rotation.z = -0.2;
      group.add(pickHead);
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
    if (!nodeData) return { rewards: {}, info: null, persistent: false };
    if (typeof GameTerrain !== 'undefined' && GameTerrain.completeNodeHarvest) {
      return GameTerrain.completeNodeHarvest(nodeData);
    }
    return { rewards: {}, info: null, persistent: false };
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

  function addOreSpikes(group, color, scale, count, height) {
    var spikeMat = new THREE.MeshLambertMaterial({ color: color });
    for (var si = 0; si < count; si++) {
      var spikeGeo = new THREE.ConeGeometry(0.045 * scale, (height || 0.18) * scale, 5);
      var spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(
        Math.cos(si * 1.9) * 0.18 * scale,
        (0.2 + Math.sin(si * 0.8) * 0.06) * scale,
        Math.sin(si * 1.9) * 0.18 * scale
      );
      spike.rotation.z = 0.2 + Math.sin(si * 0.9) * 0.25;
      spike.rotation.x = 0.1 * si;
      group.add(spike);
    }
  }

  return {
    init: init,
    createObjectForChunk: createObjectForChunk,
    createMesh: createMesh,
    createNPCMesh: createNPCMesh,
    destroyNode: destroyNode,
    refreshObject: refreshObject,
    removeChunkObjects: removeChunkObjects,
    setChunkObjectsVisible: setChunkObjectsVisible,
    hideObject: hideObject,
    showObject: showObject,
    update: update,
    getMeshForObjectId: getMeshForObjectId,
    getAllMeshes: getAllMeshes,
    getDataFromMesh: getDataFromMesh
  };
})();
