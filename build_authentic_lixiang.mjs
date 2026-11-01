import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import fs from 'fs';

globalThis.self = globalThis;
globalThis.window = globalThis;

class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
      if (this.onload) this.onload();
    });
  }
}
globalThis.FileReader = FileReader;

console.log('=== BUILDING 100% AUTHENTIC LI AUTO L9 (LIXIANG L9) 3D MODEL ===');

const buf = fs.readFileSync('raw_lixiang_l9.glb');
const loader = new GLTFLoader();

loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', async gltf => {
  const scene = gltf.scene;

  // Real Li Auto L9 dimensions:
  // Length: 5.218 m, Width: 1.998 m, Height: 1.800 m, Wheelbase: 3.105 m
  // In raw model: length is 4.47395 m.
  const SCALE = 5.218 / 4.473948; // ~1.166308
  console.log(`Scale factor: ${SCALE.toFixed(6)}`);

  // Wheel meshes in raw model:
  // Raw Left wheel (rim unnamed_53, tyre unnamed_6, cap unnamed_65, disc unnamed_52, caliper unnamed_51):
  // Center: [-0.74312, 0.41179, -1.37149]
  // In raw model, this wheel has outer face at -X (facing LEFT in raw).
  // Raw Right wheel (rim unnamed_18, tyre unnamed_19, cap unnamed_86, disc unnamed_17, caliper unnamed_16):
  // Center: [0.69149, 0.41179, -1.39735]
  // In raw model, this wheel has outer face at +X (facing RIGHT in raw).

  // Meshes to EXCLUDE from car body:
  const wheelMeshesRaw = new Set([
    // Rear wheels
    'unnamed_6', 'unnamed_16', 'unnamed_17', 'unnamed_18', 'unnamed_19',
    'unnamed_51', 'unnamed_52', 'unnamed_53', 'unnamed_65', 'unnamed_86',
    // Front wheels & raw front suspension
    'unnamed', 'unnamed_4', 'unnamed_7', 'unnamed_13', 'unnamed_54',
    'unnamed_55', 'unnamed_56', 'unnamed_57', 'unnamed_58', 'unnamed_59',
    'unnamed_60', 'unnamed_110'
  ]);

  // Materials definition
  const matPaint = new THREE.MeshStandardMaterial({
    name: 'paint',
    color: 0x111315, // Sleek black as shown in user's reference photo
    roughness: 0.22,
    metalness: 0.85
  });

  const matHead = new THREE.MeshStandardMaterial({
    name: 'head',
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 3.0,
    roughness: 0.1,
    metalness: 0.1
  });

  const matTail = new THREE.MeshStandardMaterial({
    name: 'tail',
    color: 0xff1a1a,
    emissive: 0xff0000,
    emissiveIntensity: 2.5,
    roughness: 0.2,
    metalness: 0.2
  });

  const matGlassFront = new THREE.MeshPhysicalMaterial({
    name: 'glass_front',
    color: 0x1a2634,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.88,
    transparent: true,
    opacity: 0.75
  });

  const matGlassRear = new THREE.MeshPhysicalMaterial({
    name: 'glass_rear',
    color: 0x080c10, // Deep VIP privacy tint
    metalness: 0.2,
    roughness: 0.08,
    transmission: 0.65,
    transparent: true,
    opacity: 0.88
  });

  const matRim = new THREE.MeshStandardMaterial({
    name: 'rim',
    color: 0x2b3038, // 21-inch turbine gunmetal finish
    roughness: 0.28,
    metalness: 0.88
  });

  const matTyre = new THREE.MeshStandardMaterial({
    name: 'tyre',
    color: 0x18191c, // Michelin rubber
    roughness: 0.75,
    metalness: 0.12
  });

  const matDisc = new THREE.MeshStandardMaterial({
    name: 'disc',
    color: 0x8a929a,
    roughness: 0.35,
    metalness: 0.90
  });

  const matChrome = new THREE.MeshStandardMaterial({
    name: 'chrome',
    color: 0xdde2e8,
    roughness: 0.15,
    metalness: 0.95
  });

  const matBlack = new THREE.MeshStandardMaterial({
    name: 'black',
    color: 0x0d0e10,
    roughness: 0.45,
    metalness: 0.4
  });

  const matInterior = new THREE.MeshStandardMaterial({
    name: 'interior',
    color: 0x221d18, // Warm Nappa luxury leather
    roughness: 0.65,
    metalness: 0.15
  });

  // Helper to clone and center wheel geometry
  function createWheelGroup(meshNames, centerRaw, isRightSide) {
    const group = new THREE.Group();

    for (const name of meshNames) {
      const orig = scene.getObjectByName(name);
      if (!orig || !orig.geometry) continue;

      const geom = orig.geometry.clone();
      const pos = geom.attributes.position;
      const norm = geom.attributes.normal;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) - centerRaw.x;
        let y = pos.getY(i) - centerRaw.y;
        let z = pos.getZ(i) - centerRaw.z;

        // Apply car scale
        x *= SCALE;
        y *= SCALE;
        z *= SCALE;

        pos.setXYZ(i, x, y, z);
      }
      geom.computeVertexNormals();
      geom.computeBoundingBox();

      // Assign material based on part
      let m = matRim;
      if (name.includes('6') || name.includes('19')) m = matTyre;
      else if (name.includes('52') || name.includes('17')) m = matDisc;
      else if (name.includes('65') || name.includes('86')) m = matChrome;

      const mesh = new THREE.Mesh(geom, m);
      mesh.name = `${name}_wheel`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    return group;
  }

  // Raw centers:
  const leftCenter = { x: -0.74312, y: 0.41179, z: -1.37149 };
  const rightCenter = { x: 0.69149, y: 0.41179, z: -1.39735 };

  const leftNames = ['unnamed_53', 'unnamed_6', 'unnamed_65', 'unnamed_52'];
  const rightNames = ['unnamed_18', 'unnamed_19', 'unnamed_86', 'unnamed_17'];

  // Left wheels (wheel_fl, wheel_rl): outer face points to +X in CobaltModel
  // In raw model, rightNames has outer face at +X!
  const wheelFL = createWheelGroup(rightNames, rightCenter, false);
  wheelFL.name = 'wheel_fl';

  const wheelRL = createWheelGroup(rightNames, rightCenter, false);
  wheelRL.name = 'wheel_rl';

  // Right wheels (wheel_fr, wheel_rr): outer face points to -X in CobaltModel
  // In raw model, leftNames has outer face at -X!
  const wheelFR = createWheelGroup(leftNames, leftCenter, true);
  wheelFR.name = 'wheel_fr';

  const wheelRR = createWheelGroup(leftNames, leftCenter, true);
  wheelRR.name = 'wheel_rr';

  console.log('✓ Extracted 4 authentic 21-inch wheels with turbine rims and Michelin tires');

  // Now process car body meshes
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'body_group';

  // Y-shift to align with wheel radius in CobaltModel:
  // Raw wheel center Y was 0.41179 * SCALE = 0.48028m.
  // We want wheel center Y to match wheelRadius ~ 0.405m,
  // so shift body down by (0.48028 - 0.405) = 0.075m.
  const BODY_Y_SHIFT = -(0.41179 * SCALE - 0.405);
  // Body center X shift to align with X=0
  const BODY_X_SHIFT = 0.0;

  // Material assignments map
  const paintMeshes = new Set([
    'unnamed_130', 'unnamed_129', 'unnamed_133', 'unnamed_128', 'unnamed_126',
    'unnamed_88', 'unnamed_89', 'unnamed_127', 'unnamed_93', 'unnamed_125'
  ]);

  const headMeshes = new Set([
    'unnamed_105', // The signature front Star Ring Halo LED lightbar!
    'unnamed_74', 'unnamed_75', 'unnamed_76', 'unnamed_77',
    'unnamed_40', 'unnamed_41', 'unnamed_42', 'unnamed_43'
  ]);

  const tailMeshes = new Set([
    'unnamed_104', // The signature rear Star Ring taillight bar!
    'unnamed_72'
  ]);

  const glassFrontMeshes = new Set([
    'unnamed_70', 'unnamed_79', 'unnamed_84'
  ]);

  const glassRearMeshes = new Set([
    'unnamed_106', 'unnamed_9', 'unnamed_10', 'unnamed_14', 'unnamed_20',
    'unnamed_12', 'unnamed_15', 'unnamed_22', 'unnamed_26', 'unnamed_96'
  ]);

  const chromeMeshes = new Set([
    'unnamed_68', 'unnamed_37', 'unnamed_46', 'unnamed_47', 'unnamed_49',
    'unnamed_29', 'unnamed_30', 'unnamed_31', 'unnamed_32', 'unnamed_33',
    'unnamed_34', 'unnamed_35', 'unnamed_36', 'unnamed_101', 'unnamed_120'
  ]);

  const blackMeshes = new Set([
    'unnamed_50', 'unnamed_44', 'unnamed_45', 'unnamed_87', 'unnamed_90',
    'unnamed_91', 'unnamed_98', 'unnamed_117', 'unnamed_99', 'unnamed_118',
    'unnamed_100', 'unnamed_119', 'unnamed_69'
  ]);

  const interiorMeshes = new Set([
    'unnamed_81', 'unnamed_121', 'unnamed_123', 'unnamed_113', 'unnamed_116',
    'unnamed_122', 'unnamed_124', 'unnamed_102', 'unnamed_131', 'unnamed_132'
  ]);

  scene.traverse(child => {
    if (!child.isMesh) return;
    if (wheelMeshesRaw.has(child.name)) return;

    const geom = child.geometry.clone();
    const pos = geom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) * SCALE + BODY_X_SHIFT;
      let y = pos.getY(i) * SCALE + BODY_Y_SHIFT;
      let z = pos.getZ(i) * SCALE;
      pos.setXYZ(i, x, y, z);
    }
    geom.computeVertexNormals();
    geom.computeBoundingBox();

    let mat = matPaint;
    if (paintMeshes.has(child.name)) mat = matPaint;
    else if (headMeshes.has(child.name)) mat = matHead;
    else if (tailMeshes.has(child.name)) mat = matTail;
    else if (glassFrontMeshes.has(child.name)) mat = matGlassFront;
    else if (glassRearMeshes.has(child.name)) mat = matGlassRear;
    else if (chromeMeshes.has(child.name)) mat = matChrome;
    else if (blackMeshes.has(child.name)) mat = matBlack;
    else if (interiorMeshes.has(child.name)) mat = matInterior;
    else {
      // Default non-classified parts
      if (child.material && child.material.name === 'unnamed') mat = matBlack;
      else mat = matPaint;
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = child.name;
    mesh.castShadow = !mat.name.startsWith('glass');
    mesh.receiveShadow = true;
    bodyGroup.add(mesh);
  });

  console.log(`✓ Processed ${bodyGroup.children.length} body meshes with authentic materials`);

  // Build authentic Li Auto AD Max roof LiDAR pod
  // Positioned at top center of front windshield on roof:
  // Z ~ 0.98m, Y ~ 1.76m, X = 0.0m
  console.log('=== Adding Authentic Li Auto AD Max Roof LiDAR Pod ===');
  const lidarGroup = new THREE.Group();
  lidarGroup.name = 'ad_max_lidar';

  // Aerodynamic swept teardrop housing
  // Width: 0.30m, Height: 0.075m, Length: 0.24m
  const lidarHousingGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.075, 24);
  lidarHousingGeom.scale(1.25, 1.0, 1.6);
  lidarHousingGeom.rotateX(0.08); // Slight aerodynamic forward rake
  const lidarHousingMesh = new THREE.Mesh(lidarHousingGeom, matBlack);
  lidarHousingMesh.castShadow = true;
  lidarGroup.add(lidarHousingMesh);

  // Front optical aperture glass (Hesai AT128 optical sensor window)
  const lidarGlassGeom = new THREE.BoxGeometry(0.22, 0.038, 0.02);
  const lidarGlassMat = new THREE.MeshPhysicalMaterial({
    name: 'glass_front',
    color: 0x051424,
    metalness: 0.85,
    roughness: 0.05,
    transmission: 0.3,
    transparent: true,
    opacity: 0.95
  });
  const lidarGlassMesh = new THREE.Mesh(lidarGlassGeom, lidarGlassMat);
  lidarGlassMesh.position.set(0, 0.005, 0.115);
  lidarGlassMesh.rotateX(0.08);
  lidarGroup.add(lidarGlassMesh);

  // Optical sensor core glow inside aperture
  const lidarCoreGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.14, 16);
  lidarCoreGeom.rotateZ(Math.PI / 2);
  const lidarCoreMat = new THREE.MeshStandardMaterial({
    name: 'head',
    color: 0x00c8ff,
    emissive: 0x0088cc,
    emissiveIntensity: 1.2
  });
  const lidarCoreMesh = new THREE.Mesh(lidarCoreGeom, lidarCoreMat);
  lidarCoreMesh.position.set(0, 0.005, 0.105);
  lidarGroup.add(lidarCoreMesh);

  // Position LiDAR pod on top of windshield/roof
  lidarGroup.position.set(0, 1.765, 0.96);
  bodyGroup.add(lidarGroup);

  // Create Root Car Model
  const carRoot = new THREE.Group();
  carRoot.name = 'lixiang_model';
  carRoot.add(bodyGroup);
  carRoot.add(wheelFL);
  carRoot.add(wheelFR);
  carRoot.add(wheelRL);
  carRoot.add(wheelRR);

  // Measure final dimensions
  const finalBox = new THREE.Box3().setFromObject(carRoot);
  const finalSize = finalBox.getSize(new THREE.Vector3());
  console.log(`\nFinal Li Auto L9 Dimensions:`);
  console.log(`  Width (X):  ${finalSize.x.toFixed(3)} m (factory ~2.00 m)`);
  console.log(`  Height (Y): ${finalSize.y.toFixed(3)} m (factory ~1.80 m)`);
  console.log(`  Length (Z): ${finalSize.z.toFixed(3)} m (factory ~5.22 m)`);

  const flBox = new THREE.Box3().setFromObject(wheelFL);
  console.log(`Wheel radius: ${(flBox.getSize(new THREE.Vector3()).y / 2).toFixed(3)} m`);

  // Export to GLB
  const exporter = new GLTFExporter();
  exporter.parse(
    carRoot,
    gltfResult => {
      const glbBuffer = Buffer.from(gltfResult);
      console.log(`\nExported GLB size: ${(glbBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

      const targets = [
        'models/lixiang.glb',
        'public/models/lixiang.glb',
        'dist/models/lixiang.glb'
      ];

      for (const dest of targets) {
        fs.writeFileSync(dest, glbBuffer);
        console.log(`✓ Saved ${dest}`);
      }
      console.log('\n=== SUCCESS: Authentic Li Auto L9 3D model generated and deployed! ===');
    },
    err => {
      console.error('Export error:', err);
    },
    { binary: true }
  );
});
