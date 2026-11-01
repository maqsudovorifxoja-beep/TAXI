import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
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

async function buildAuthenticBMW() {
  console.log('=== 1. Building Authentic BMW M5 (5.25 MB Sketchfab 3D Model) ===');
  const inputBuf = fs.readFileSync('real_bmw_m5.glb');
  const jsonChunkLen = inputBuf.readUInt32LE(12);
  const jsonBuffer = inputBuf.subarray(20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonBuffer.toString('utf8'));

  const binChunkOffset = 20 + jsonChunkLen;
  const binChunkLen = inputBuf.readUInt32LE(binChunkOffset);
  const binData = inputBuf.subarray(binChunkOffset + 8, binChunkOffset + 8 + binChunkLen);

  // Fix Node 4 matrix: 1.0 metric scale & proper orientation
  gltf.nodes[4].matrix = [
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    0, 0, 0, 1
  ];

  // Rename Wheel Nodes
  gltf.nodes[402].name = 'wheel_fl';
  gltf.nodes[499].name = 'wheel_fr';
  gltf.nodes[599].name = 'wheel_rl';
  gltf.nodes[696].name = 'wheel_rr';

  // Rename Steering Wheel
  for (let n of gltf.nodes) {
    if (n.name && n.name.includes('SteeringWheel')) {
      n.name = 'steer';
    }
  }

  // Rename Materials
  for (let m of gltf.materials) {
    if (m.name === 'bM_CarPaint_Max1') {
      m.name = 'paint';
    } else if (m.name === 'bM_LightGlassNormal_Clear_Low1') {
      m.name = 'head';
    } else if (m.name === 'bM_LightGlassNormal_OuterRed_Low1') {
      m.name = 'tail';
    } else if (m.name === 'bM_Glass_WindowFront_Low1') {
      m.name = 'glass_front';
    }
  }

  let newJsonStr = JSON.stringify(gltf);
  while (newJsonStr.length % 4 !== 0) newJsonStr += ' ';
  const newJsonBuf = Buffer.from(newJsonStr, 'utf8');

  const newTotalLen = 12 + 8 + newJsonBuf.length + 8 + binData.length;
  const outBuf = Buffer.alloc(newTotalLen);
  outBuf.writeUInt32LE(0x46546C67, 0);
  outBuf.writeUInt32LE(2, 4);
  outBuf.writeUInt32LE(newTotalLen, 8);
  outBuf.writeUInt32LE(newJsonBuf.length, 12);
  outBuf.writeUInt32LE(0x4E4F534A, 16);
  newJsonBuf.copy(outBuf, 20);

  const newBinOffset = 20 + newJsonBuf.length;
  outBuf.writeUInt32LE(binData.length, newBinOffset);
  outBuf.writeUInt32LE(0x004E4942, newBinOffset + 4);
  binData.copy(outBuf, newBinOffset + 8);

  ['models/bmw.glb', 'public/models/bmw.glb', 'dist/models/bmw.glb'].forEach(dest => {
    fs.writeFileSync(dest, outBuf);
    console.log(`✓ Saved ${dest} (${(outBuf.length / 1024).toFixed(1)} KB)`);
  });
}

async function buildAuthenticTesla() {
  console.log('=== 2. Building Authentic Tesla Model S / 3 (High-Poly 3D Model) ===');
  const buf = fs.readFileSync('test_tesla_m3.glb');
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await new Promise((resolve, reject) => {
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', resolve, reject);
  });

  const scene = gltf.scene;

  function extractWheel(parentMesh, isRight, shiftX) {
    const wheelGroup = new THREE.Group();
    parentMesh.children.forEach(child => {
      if (!child.geometry) return;
      const geom = child.geometry;
      const posAttr = geom.attributes.position;
      const normalAttr = geom.attributes.normal;
      const uvAttr = geom.attributes.uv;
      const newPos = [];
      const newNorm = [];
      const newUv = [];
      const index = geom.index;

      if (index) {
        const newIndices = [];
        const vertexMap = new Map();

        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i);
          const b = index.getX(i+1);
          const c = index.getX(i+2);

          const ax = posAttr.getX(a);
          const bx = posAttr.getX(b);
          const cx = posAttr.getX(c);

          const triOk = isRight ? (ax > 0 && bx > 0 && cx > 0) : (ax < 0 && bx < 0 && cx < 0);
          if (triOk) {
            [a, b, c].forEach(oldIdx => {
              if (!vertexMap.has(oldIdx)) {
                const newIdx = newPos.length / 3;
                vertexMap.set(oldIdx, newIdx);
                newPos.push(posAttr.getX(oldIdx) + shiftX, posAttr.getY(oldIdx), posAttr.getZ(oldIdx));
                if (normalAttr) newNorm.push(normalAttr.getX(oldIdx), normalAttr.getY(oldIdx), normalAttr.getZ(oldIdx));
                if (uvAttr) newUv.push(uvAttr.getX(oldIdx), uvAttr.getY(oldIdx));
              }
              newIndices.push(vertexMap.get(oldIdx));
            });
          }
        }

        if (newIndices.length > 0) {
          const newGeom = new THREE.BufferGeometry();
          newGeom.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
          if (newNorm.length) newGeom.setAttribute('normal', new THREE.Float32BufferAttribute(newNorm, 3));
          if (newUv.length) newGeom.setAttribute('uv', new THREE.Float32BufferAttribute(newUv, 2));
          newGeom.setIndex(newIndices);
          const mesh = new THREE.Mesh(newGeom, child.material);
          wheelGroup.add(mesh);
        }
      }
    });
    return wheelGroup;
  }

  const wheelsFront = scene.getObjectByName('wheels');
  const wheelsRear = scene.getObjectByName('wheels001');

  // Track front = 0.86033, Track rear = 0.85820
  const wheelFL = extractWheel(wheelsFront, false, 0.86033);
  wheelFL.name = 'wheel_fl';
  const wheelFR = extractWheel(wheelsFront, true, -0.86033);
  wheelFR.name = 'wheel_fr';
  const wheelRL = extractWheel(wheelsRear, false, 0.85820);
  wheelRL.name = 'wheel_rl';
  const wheelRR = extractWheel(wheelsRear, true, -0.85820);
  wheelRR.name = 'wheel_rr';

  // Remove the old combined wheel axles
  wheelsFront.removeFromParent();
  wheelsRear.removeFromParent();

  // Find steering wheel
  const steerObj = scene.getObjectByName('movsteer_10');
  if (steerObj) steerObj.name = 'steer';

  // Create new clean model root
  const carRoot = new THREE.Group();
  carRoot.name = 'tesla_model';

  // Body container: rotated 180° around Y and scaled to meters (0.01)
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'body_group';
  bodyGroup.rotation.y = Math.PI;
  scene.position.set(0, 72.17, 0);
  bodyGroup.add(scene);
  bodyGroup.scale.set(0.01, 0.01, 0.01);
  carRoot.add(bodyGroup);

  // Add the 4 independent wheels directly at root level (meters)
  carRoot.add(wheelFL);
  carRoot.add(wheelFR);
  carRoot.add(wheelRL);
  carRoot.add(wheelRR);

  // Map material names for dynamic game shaders
  carRoot.traverse(child => {
    if (child.isMesh && child.material) {
      const mat = child.material;
      if (mat.name === 'primary.001' || mat.name === 'primary.002' || mat.name.startsWith('primary')) {
        mat.name = 'paint';
      } else if (mat.name === 'glass.0') {
        mat.name = 'glass_front';
      } else if (mat.name === 'glass.1') {
        mat.name = 'glass_rear';
      } else if (mat.name.includes('light_pantulan') || mat.name.includes('aluminium_light') || mat.name.includes('front_light')) {
        mat.name = 'head';
      } else if (mat.name.includes('breaklight') || mat.name.includes('rear_light')) {
        mat.name = 'tail';
      } else if (mat.name.startsWith('wheels')) {
        mat.name = 'rim';
      }
    }
  });

  const exporter = new GLTFExporter();
  const teslaGlb = await exporter.parseAsync(carRoot, { binary: true });

  ['models/tesla.glb', 'public/models/tesla.glb', 'dist/models/tesla.glb'].forEach(dest => {
    fs.writeFileSync(dest, Buffer.from(teslaGlb));
    console.log(`✓ Saved ${dest} (${(teslaGlb.byteLength / 1024).toFixed(1)} KB)`);
  });
}

async function buildAuthenticGentraBunker() {
  console.log('=== 3. Building Authentic Chevrolet Gentra "Bunker" (High-Poly 3D Model) ===');
  // Load authentic Chevrolet Cobalt 3D mesh (1.75 MB high-poly model by Q.SARDOR)
  const buf = fs.readFileSync('models/cobalt.glb');
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', resolve, reject);
  });

  const scene = gltf.scene;

  // 1. Deep "BUNKER" 100% black window glass tinting
  const bunkerGlassMat = new THREE.MeshPhysicalMaterial({
    name: 'glass_front',
    color: 0x020305,
    roughness: 0.02,
    metalness: 0.85,
    transmission: 0.05,
    opacity: 0.98,
    transparent: true,
    clearcoat: 1.0,
    depthWrite: false
  });

  const bunkerRearGlassMat = new THREE.MeshPhysicalMaterial({
    name: 'glass_rear',
    color: 0x010203,
    roughness: 0.02,
    metalness: 0.90,
    transmission: 0.01,
    opacity: 0.99,
    transparent: true,
    clearcoat: 1.0,
    depthWrite: false
  });

  scene.traverse(child => {
    if (child.isMesh && child.material) {
      const n = child.material.name;
      if (n.startsWith('glass')) {
        child.material = n.includes('rear') ? bunkerRearGlassMat : bunkerGlassMat;
      }
    }
  });

  // 2. Add Gentra Signature Chrome Grille with Gold Bowtie
  const mChrome = new THREE.MeshStandardMaterial({ name: 'chrome', color: 0xedf0f5, metalness: 0.95, roughness: 0.12 });
  const mGold = new THREE.MeshStandardMaterial({ name: 'chrome', color: 0xdaa520, metalness: 0.88, roughness: 0.22 });
  const mBlack = new THREE.MeshStandardMaterial({ name: 'black', color: 0x08090a, roughness: 0.4 });

  const gentraGrille = new THREE.Group();
  gentraGrille.name = 'gentra_grille';

  // Horizontal chrome bar
  const chromeBar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.04), mChrome);
  chromeBar.position.set(0, 0.62, 2.05);
  gentraGrille.add(chromeBar);

  // Black grille mesh backing
  const grilleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.12, 0.03), mBlack);
  grilleMesh.position.set(0, 0.62, 2.03);
  gentraGrille.add(grilleMesh);

  // Golden Chevrolet Bowtie Center Emblem
  const bowtie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.02), mGold);
  bowtie.position.set(0, 0.62, 2.07);
  gentraGrille.add(bowtie);

  // 3. Front Windscreen "BUNKER" Sunstrip Banner
  const sunstripMat = new THREE.MeshBasicMaterial({ name: 'black', color: 0x020202 });
  const sunstrip = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.12, 0.03), sunstripMat);
  sunstrip.position.set(0, 1.25, 0.85);
  sunstrip.rotation.x = -0.52;
  gentraGrille.add(sunstrip);

  // 4. Rear Chrome Garnish Bar & Rear Bowtie
  const rearGarnish = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.03), mChrome);
  rearGarnish.position.set(0, 0.68, -2.15);
  gentraGrille.add(rearGarnish);

  const rearBowtie = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.02), mGold);
  rearBowtie.position.set(0, 0.68, -2.17);
  gentraGrille.add(rearBowtie);

  scene.add(gentraGrille);

  const exporter = new GLTFExporter();
  const gentraGlb = await exporter.parseAsync(scene, { binary: true });

  ['models/gentra.glb', 'public/models/gentra.glb', 'dist/models/gentra.glb'].forEach(dest => {
    fs.writeFileSync(dest, Buffer.from(gentraGlb));
    console.log(`✓ Saved ${dest} (${(gentraGlb.byteLength / 1024).toFixed(1)} KB)`);
  });
}

async function main() {
  await buildAuthenticBMW();
  await buildAuthenticTesla();
  await buildAuthenticGentraBunker();
  console.log('🎉 All authentic 3D models built and deployed successfully!');
}

main().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
