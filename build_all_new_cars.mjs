import * as THREE from 'three';
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
  readAsDataURL(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + Buffer.from(buf).toString('base64');
      if (this.onloadend) this.onloadend();
      if (this.onload) this.onload();
    });
  }
}
globalThis.FileReader = FileReader;

// Shared PBR Materials
const matPaint = new THREE.MeshStandardMaterial({ name: 'paint', color: 0xffffff, roughness: 0.25, metalness: 0.82 });
const matBlack = new THREE.MeshStandardMaterial({ name: 'black', color: 0x111316, roughness: 0.5, metalness: 0.1 });
const matChrome = new THREE.MeshStandardMaterial({ name: 'chrome', color: 0xedf0f5, roughness: 0.1, metalness: 0.96 });
const matGold = new THREE.MeshStandardMaterial({ name: 'chrome', color: 0xdaa520, roughness: 0.2, metalness: 0.88 });
const matCarbon = new THREE.MeshStandardMaterial({ name: 'carbon', color: 0x1c1e22, roughness: 0.35, metalness: 0.4 });
const matGlassFront = new THREE.MeshPhysicalMaterial({ name: 'glass_front', color: 0x111822, transparent: true, opacity: 0.45, roughness: 0.05, transmission: 0.65 });
const matGlassRear = new THREE.MeshPhysicalMaterial({ name: 'glass_rear', color: 0x05080c, transparent: true, opacity: 0.85, roughness: 0.05, transmission: 0.2 });
const matGlassSide = new THREE.MeshPhysicalMaterial({ name: 'glass_fside', color: 0x080c14, transparent: true, opacity: 0.65, roughness: 0.05, transmission: 0.4 });
const matHead = new THREE.MeshStandardMaterial({ name: 'head', color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5, roughness: 0.1 });
const matTail = new THREE.MeshStandardMaterial({ name: 'tail', color: 0xff2222, emissive: 0xcc0000, emissiveIntensity: 2.0, roughness: 0.2 });
const matBrake = new THREE.MeshStandardMaterial({ name: 'brake', color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3.0, roughness: 0.1 });
const matReverse = new THREE.MeshStandardMaterial({ name: 'reverse', color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0, roughness: 0.1 });
const matIndL = new THREE.MeshStandardMaterial({ name: 'indL', color: 0xff9900, emissive: 0xff8800, emissiveIntensity: 2.0, roughness: 0.1 });
const matIndR = new THREE.MeshStandardMaterial({ name: 'indR', color: 0xff9900, emissive: 0xff8800, emissiveIntensity: 2.0, roughness: 0.1 });
const matRim = new THREE.MeshStandardMaterial({ name: 'rim', color: 0xdde2e8, roughness: 0.25, metalness: 0.9 });
const matDarkRim = new THREE.MeshStandardMaterial({ name: 'rim', color: 0x222428, roughness: 0.25, metalness: 0.85 });
const matTyre = new THREE.MeshStandardMaterial({ name: 'tyre', color: 0x18191c, roughness: 0.9, metalness: 0.05 });
const matDisc = new THREE.MeshStandardMaterial({ name: 'disc', color: 0x6e7278, roughness: 0.35, metalness: 0.85 });
const matCaliperRed = new THREE.MeshStandardMaterial({ name: 'caliper', color: 0xd61818, roughness: 0.3, metalness: 0.5 });
const matCaliperOrange = new THREE.MeshStandardMaterial({ name: 'caliper', color: 0xff6600, roughness: 0.3, metalness: 0.5 });
const matInterior = new THREE.MeshStandardMaterial({ name: 'cabin', color: 0x181a1f, roughness: 0.8, metalness: 0.1 });
const matTaxiYellow = new THREE.MeshStandardMaterial({ name: 'head', color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 1.5 });

// Helper: Wheel Builder (Realistic Alloy Wheel with Tire, Rotor, Caliper, Center Hub, Spokes)
function buildWheel(radius, width, spokeCount = 5, isRight = false, caliperMat = matCaliperRed, rimMat = matRim, redlineHash = false) {
  const wheel = new THREE.Group();
  
  // Tire with rounded tread
  const tireGeom = new THREE.CylinderGeometry(radius, radius, width * 0.92, 32);
  tireGeom.rotateZ(Math.PI / 2);
  const tireMesh = new THREE.Mesh(tireGeom, matTyre);
  wheel.add(tireMesh);

  // Rim Barrel
  const rimRadius = radius * 0.72;
  const rimGeom = new THREE.CylinderGeometry(rimRadius, rimRadius, width * 0.95, 32);
  rimGeom.rotateZ(Math.PI / 2);
  const rimMesh = new THREE.Mesh(rimGeom, rimMat);
  wheel.add(rimMesh);

  // Outer Lip
  const lipOffset = (width / 2) * (isRight ? 1 : -1);
  const lipGeom = new THREE.TorusGeometry(rimRadius, width * 0.045, 12, 32);
  lipGeom.rotateY(Math.PI / 2);
  lipGeom.translate(lipOffset, 0, 0);
  const lipMesh = new THREE.Mesh(lipGeom, rimMat);
  wheel.add(lipMesh);

  // Optional Redline Hash Mark (Chevrolet Malibu Redline)
  if (redlineHash) {
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    const redRing = new THREE.Mesh(new THREE.BoxGeometry(width * 0.02, rimRadius * 0.16, width * 0.04), redMat);
    redRing.position.set(lipOffset * 1.01, rimRadius * 0.82, 0);
    wheel.add(redRing);
  }

  // Center Hub
  const hubGeom = new THREE.CylinderGeometry(rimRadius * 0.28, rimRadius * 0.28, width * 0.2, 16);
  hubGeom.rotateZ(Math.PI / 2);
  hubGeom.translate(lipOffset * 0.92, 0, 0);
  const hubMesh = new THREE.Mesh(hubGeom, rimMat);
  wheel.add(hubMesh);

  // Center Cap Badge
  const capGeom = new THREE.CylinderGeometry(rimRadius * 0.12, rimRadius * 0.12, width * 0.05, 16);
  capGeom.rotateZ(Math.PI / 2);
  capGeom.translate(lipOffset * 1.02, 0, 0);
  const capMesh = new THREE.Mesh(capGeom, matBlack);
  wheel.add(capMesh);

  // Spokes
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const spokeGeom = new THREE.BoxGeometry(width * 0.05, rimRadius * 0.72, rimRadius * 0.12);
    spokeGeom.translate(lipOffset * 0.90, rimRadius * 0.44, 0);
    const spokeMesh = new THREE.Mesh(spokeGeom, rimMat);
    spokeMesh.rotation.x = angle;
    wheel.add(spokeMesh);
  }

  // Brake Rotor (Disc)
  const discRadius = rimRadius * 0.78;
  const discGeom = new THREE.CylinderGeometry(discRadius, discRadius, width * 0.08, 24);
  discGeom.rotateZ(Math.PI / 2);
  discGeom.translate(lipOffset * 0.4, 0, 0);
  const discMesh = new THREE.Mesh(discGeom, matDisc);
  wheel.add(discMesh);

  // Brake Caliper
  const calGeom = new THREE.BoxGeometry(width * 0.22, discRadius * 0.45, discRadius * 0.25);
  calGeom.translate(lipOffset * 0.4, discRadius * 0.75, 0);
  const calMesh = new THREE.Mesh(calGeom, caliperMat);
  wheel.add(calMesh);

  return wheel;
}

// Helper: Functional Steering Wheel
function buildSteeringWheel(sport = false) {
  const steer = new THREE.Group();
  steer.name = 'steer';
  
  const ringRadius = sport ? 0.16 : 0.18;
  const ringGeom = new THREE.TorusGeometry(ringRadius, 0.022, 12, 24);
  const ringMesh = new THREE.Mesh(ringGeom, matBlack);
  steer.add(ringMesh);

  const centerGeom = new THREE.CylinderGeometry(0.065, 0.065, 0.03, 16);
  centerGeom.rotateX(Math.PI / 2);
  const centerMesh = new THREE.Mesh(centerGeom, matBlack);
  steer.add(centerMesh);

  const logoGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.005, 16);
  logoGeom.rotateX(Math.PI / 2);
  logoGeom.translate(0, 0, 0.016);
  const logoMesh = new THREE.Mesh(logoGeom, matChrome);
  steer.add(logoMesh);

  const angles = sport ? [-0.5, 0.5, Math.PI] : [-0.4, 0.4, Math.PI];
  for (let a of angles) {
    const sGeom = new THREE.BoxGeometry(0.025, ringRadius * 0.7, 0.015);
    sGeom.translate(0, ringRadius * 0.35, 0);
    const sMesh = new THREE.Mesh(sGeom, matChrome);
    sMesh.rotation.z = a;
    steer.add(sMesh);
  }

  return steer;
}

// Save GLTF buffer to all 3 paths
async function exportAndSave(root, modelName) {
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(root, { binary: true });
  const buf = Buffer.from(glb);
  const paths = [`models/${modelName}.glb`, `public/models/${modelName}.glb`, `dist/models/${modelName}.glb`];
  for (const p of paths) {
    fs.writeFileSync(p, buf);
    console.log(`✓ Saved ${p} (${(buf.length / 1024).toFixed(1)} KB)`);
  }
}

// ==========================================
// 1. DAEWOO DAMAS 2 (UCHAR DAMAS EKSPRESS)
// ==========================================
async function buildDamas() {
  console.log('=== Building Daewoo Damas 2 (Uchar Damas) ===');
  const root = new THREE.Group();
  root.name = 'damas_model';

  const body = new THREE.Group();
  body.name = 'body_group';

  // Main cab-over van body (Length 3.25m, Width 1.40m, Height 1.90m)
  // Lower chassis
  const lowerChassis = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.65, 3.20), matPaint);
  lowerChassis.position.set(0, 0.55, 0);
  body.add(lowerChassis);

  // Upper cabin / passenger compartment
  const upperCabin = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.95, 2.95), matPaint);
  upperCabin.position.set(0, 1.25, -0.10);
  body.add(upperCabin);

  // Curved nose transition (cab-over forward face)
  const noseGeom = new THREE.CylinderGeometry(0.68, 0.68, 0.65, 24, 1, false, 0, Math.PI);
  noseGeom.rotateY(Math.PI / 2);
  noseGeom.scale(1.0, 1.0, 0.5);
  const nose = new THREE.Mesh(noseGeom, matPaint);
  nose.position.set(0, 0.55, 1.60);
  body.add(nose);

  // Roof curve
  const roofCap = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 2.95, 24, 1, false, 0, Math.PI), matPaint);
  roofCap.rotateZ(Math.PI / 2);
  roofCap.scale.set(0.25, 1.0, 1.0);
  roofCap.position.set(0, 1.72, -0.10);
  body.add(roofCap);

  // Front Windshield (Tall forward-cab windshield)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.72, 0.04), matGlassFront);
  windshield.position.set(0, 1.25, 1.38);
  windshield.rotation.x = -0.22;
  body.add(windshield);

  // Front Headlights (Two rectangular halogen chrome-bezel lights)
  for (let s of [-1, 1]) {
    const headHousing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.05), matChrome);
    headHousing.position.set(s * 0.48, 0.72, 1.62);
    body.add(headHousing);

    const headLens = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.03), matHead);
    headLens.position.set(s * 0.48, 0.72, 1.64);
    body.add(headLens);

    // Front Corner Amber Indicator
    const indLens = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.03), s === -1 ? matIndR : matIndL);
    indLens.position.set(s * 0.62, 0.72, 1.63);
    body.add(indLens);
  }

  // Front Grille & Daewoo Badge
  const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.03), matBlack);
  frontGrille.position.set(0, 0.72, 1.62);
  body.add(frontGrille);

  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), matChrome);
  badge.rotateX(Math.PI / 2);
  badge.position.set(0, 0.72, 1.64);
  body.add(badge);

  // Front Bumper with Fog Lights
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 0.15), matBlack);
  bumper.position.set(0, 0.35, 1.62);
  body.add(bumper);

  // Side Glass: Driver windows, sliding passenger windows, rear quarter
  for (let s of [-1, 1]) {
    // Front door glass
    const sideF = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.65), matGlassSide);
    sideF.position.set(s * 0.69, 1.25, 0.85);
    body.add(sideF);

    // Sliding middle door glass
    const sideM = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.95), matGlassRear);
    sideM.position.set(s * 0.69, 1.25, -0.05);
    body.add(sideM);

    // Rear quarter glass
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.75), matGlassRear);
    sideR.position.set(s * 0.69, 1.25, -1.0);
    body.add(sideR);

    // Side Mirrors
    const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), matBlack);
    mirrorStem.rotateZ(s * 0.8);
    mirrorStem.position.set(s * 0.73, 1.05, 1.15);
    body.add(mirrorStem);

    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.12), matBlack);
    mirrorHead.position.set(s * 0.80, 1.08, 1.15);
    body.add(mirrorHead);

    // Sliding door guide rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1.40), matBlack);
    rail.position.set(s * 0.70, 0.92, -0.45);
    body.add(rail);
  }

  // Rear Tailgate Glass & Vertical Taillights
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.58, 0.03), matGlassRear);
  rearGlass.position.set(0, 1.28, -1.58);
  body.add(rearGlass);

  for (let s of [-1, 1]) {
    // Vertical Taillight Pillar
    const tailPillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.04), matBlack);
    tailPillar.position.set(s * 0.62, 0.82, -1.58);
    body.add(tailPillar);

    const brakeSeg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.02), matTail);
    brakeSeg.position.set(s * 0.62, 0.92, -1.60);
    body.add(brakeSeg);

    const indSeg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.02), s === -1 ? matIndR : matIndL);
    indSeg.position.set(s * 0.62, 0.78, -1.60);
    body.add(indSeg);

    const revSeg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.02), matReverse);
    revSeg.position.set(s * 0.62, 0.68, -1.60);
    body.add(revSeg);
  }

  // Roof Taxi Cone / Ekspress Bar (Removable / distinct)
  const taxiCone = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.12, 0.18), matTaxiYellow);
  taxiPhone: taxiCone.position.set(0, 1.82, 0.60);
  body.add(taxiCone);

  // Interior Dashboard & High-Steering Wheel
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.35, 0.45), matInterior);
  dash.position.set(0, 0.88, 1.15);
  body.add(dash);

  const steer = buildSteeringWheel(false);
  steer.position.set(0.32, 1.02, 0.95);
  steer.rotation.x = -0.75;
  body.add(steer);

  root.add(body);

  // Wheels: 12-inch wheels (radius 0.28m, width 0.18m)
  // Axle Front: +0.92m, Axle Rear: -0.92m, Track: 0.60m
  const wFL = buildWheel(0.28, 0.18, 4, false, matCaliperRed, matRim);
  wFL.name = 'wheel_fl';
  wFL.position.set(0.60, 0.28, 0.92);
  root.add(wFL);

  const wFR = buildWheel(0.28, 0.18, 4, true, matCaliperRed, matRim);
  wFR.name = 'wheel_fr';
  wFR.position.set(-0.60, 0.28, 0.92);
  root.add(wFR);

  const wRL = buildWheel(0.28, 0.18, 4, false, matCaliperRed, matRim);
  wRL.name = 'wheel_rl';
  wRL.position.set(0.60, 0.28, -0.92);
  root.add(wRL);

  const wRR = buildWheel(0.28, 0.18, 4, true, matCaliperRed, matRim);
  wRR.name = 'wheel_rr';
  wRR.position.set(-0.60, 0.28, -0.92);
  root.add(wRR);

  await exportAndSave(root, 'damas');
}

// ==========================================
// 2. CHEVROLET MALIBU 2 TURBO (REDLINE PREMIER)
// ==========================================
async function buildMalibu() {
  console.log('=== Building Chevrolet Malibu 2 Turbo (Redline Premier) ===');
  const root = new THREE.Group();
  root.name = 'malibu_model';

  const body = new THREE.Group();
  body.name = 'body_group';

  // Length 4.92m, Width 1.85m, Height 1.46m
  // Sleek lower chassis
  const lowerChassis = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.45, 4.88), matPaint);
  lowerChassis.position.set(0, 0.42, 0);
  body.add(lowerChassis);

  // Low aerodynamic sculpted hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.18, 1.45), matPaint);
  hood.position.set(0, 0.72, 1.25);
  hood.rotation.x = 0.08;
  body.add(hood);

  // Fastback curved roof / greenhouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.58, 2.35), matPaint);
  cabin.position.set(0, 1.05, -0.22);
  body.add(cabin);

  // Fastback sloping rear decklid
  const rearTrunk = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 1.05), matPaint);
  rearTrunk.position.set(0, 0.78, -1.90);
  body.add(rearTrunk);

  // Integrated ducktail trunk spoiler
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.06, 0.18), matBlack);
  spoiler.position.set(0, 0.92, -2.40);
  spoiler.rotation.x = 0.25;
  body.add(spoiler);

  // Sloping front windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.68, 0.04), matGlassFront);
  windshield.position.set(0, 1.05, 0.85);
  windshield.rotation.x = -0.62;
  body.add(windshield);

  // Rear fastback window
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.75, 0.04), matGlassRear);
  rearGlass.position.set(0, 1.04, -1.28);
  rearGlass.rotation.x = 0.55;
  body.add(rearGlass);

  // Dual-Port Black Honeycomb Chevrolet Grille with Golden Bowtie
  const upperGrille = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.10, 0.06), matBlack);
  upperGrille.position.set(0, 0.68, 2.42);
  body.add(upperGrille);

  const lowerGrille = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.24, 0.08), matBlack);
  lowerGrille.position.set(0, 0.42, 2.43);
  body.add(lowerGrille);

  const bowtie = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.03), matGold);
  bowtie.position.set(0, 0.68, 2.46);
  body.add(bowtie);

  // Slanted sharp LED Projector Headlights
  for (let s of [-1, 1]) {
    const headHousing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.22), matChrome);
    headHousing.position.set(s * 0.66, 0.66, 2.30);
    headHousing.rotation.y = s * 0.25;
    body.add(headHousing);

    const headLens = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.04), matHead);
    headLens.position.set(s * 0.66, 0.66, 2.42);
    headLens.rotation.y = s * 0.25;
    body.add(headLens);

    // Side Door Mirrors with Redline Red Accent
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.10), matBlack);
    mirror.position.set(s * 0.94, 0.88, 0.65);
    body.add(mirror);

    const redAccent = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
    redAccent.position.set(s * 1.03, 0.88, 0.65);
    body.add(redAccent);

    // Rear 3D LED Taillights
    const tailCluster = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.12), matTail);
    tailCluster.position.set(s * 0.68, 0.78, -2.40);
    tailCluster.rotation.y = s * -0.20;
    body.add(tailCluster);

    // Side windows (Bunker tint)
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 1.95), matGlassRear);
    sideGlass.position.set(s * 0.83, 1.02, -0.22);
    body.add(sideGlass);
  }

  // Dual Trapezoidal Chrome Exhaust Tips
  for (let s of [-1, 1]) {
    const exh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.10), matChrome);
    exh.position.set(s * 0.62, 0.28, -2.44);
    body.add(exh);
  }

  // Cockpit & Steering Wheel
  const steer = buildSteeringWheel(true);
  steer.position.set(0.38, 0.85, 0.45);
  steer.rotation.x = -0.55;
  body.add(steer);

  root.add(body);

  // Wheels: 19-inch Redline wheels (radius 0.34m, width 0.24m)
  // Axle Front: +1.42m, Axle Rear: -1.41m, Track: 0.78m
  const wFL = buildWheel(0.34, 0.24, 5, false, matCaliperRed, matDarkRim, true);
  wFL.name = 'wheel_fl';
  wFL.position.set(0.78, 0.34, 1.42);
  root.add(wFL);

  const wFR = buildWheel(0.34, 0.24, 5, true, matCaliperRed, matDarkRim, true);
  wFR.name = 'wheel_fr';
  wFR.position.set(-0.78, 0.34, 1.42);
  root.add(wFR);

  const wRL = buildWheel(0.34, 0.24, 5, false, matCaliperRed, matDarkRim, true);
  wRL.name = 'wheel_rl';
  wRL.position.set(0.78, 0.34, -1.41);
  root.add(wRL);

  const wRR = buildWheel(0.34, 0.24, 5, true, matCaliperRed, matDarkRim, true);
  wRR.name = 'wheel_rr';
  wRR.position.set(-0.78, 0.34, -1.41);
  root.add(wRR);

  await exportAndSave(root, 'malibu');
}

// ==========================================
// 3. MERCEDES-BENZ G63 AMG ("GELIK")
// ==========================================
async function buildGelik() {
  console.log('=== Building Mercedes-Benz G63 AMG (Gelik) ===');
  const root = new THREE.Group();
  root.name = 'gelik_model';

  const body = new THREE.Group();
  body.name = 'body_group';

  // Length 4.87m, Width 1.98m, Height 1.96m
  // Rugged boxy lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.75, 4.65), matPaint);
  chassis.position.set(0, 0.65, -0.05);
  body.add(chassis);

  // High upright cabin & roof
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.85, 3.10), matPaint);
  cabin.position.set(0, 1.45, -0.65);
  body.add(cabin);

  // Upright flat hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.25, 1.45), matPaint);
  hood.position.set(0, 1.05, 1.55);
  body.add(hood);

  // Upright Front Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.65, 0.04), matGlassFront);
  windshield.position.set(0, 1.42, 0.88);
  windshield.rotation.x = -0.15;
  body.add(windshield);

  // Panamericana Vertical-Slat AMG Chrome Front Grille
  const grilleSurround = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.08), matBlack);
  grilleSurround.position.set(0, 0.85, 2.30);
  body.add(grilleSurround);

  for (let i = -6; i <= 6; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.36, 0.03), matChrome);
    slat.position.set(i * 0.07, 0.85, 2.34);
    body.add(slat);
  }

  // Giant Three-Pointed Mercedes Star
  const starRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 12, 24), matChrome);
  starRing.position.set(0, 0.85, 2.36);
  body.add(starRing);

  // Circular Halo LED Headlights
  for (let s of [-1, 1]) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 12, 24), matHead);
    halo.position.set(s * 0.72, 0.85, 2.28);
    body.add(halo);

    const projector = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), matHead);
    projector.rotateX(Math.PI / 2);
    projector.position.set(s * 0.72, 0.85, 2.29);
    body.add(projector);

    // Iconic Fender-Top Turn Signals (Classic Gelik)
    const topInd = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.16), s === -1 ? matIndR : matIndL);
    topInd.position.set(s * 0.82, 1.22, 1.85);
    body.add(topInd);

    // Wide AMG Fender Flares
    const flareF = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.28, 0.95), matPaint);
    flareF.position.set(s * 0.98, 0.65, 1.45);
    body.add(flareF);

    const flareR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.28, 0.95), matPaint);
    flareR.position.set(s * 0.98, 0.65, -1.44);
    body.add(flareR);

    // Dual Chrome Side-Exit Exhausts (Right under rear door!)
    const sideExh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16), matChrome);
    sideExh.rotateZ(Math.PI / 2);
    sideExh.position.set(s * 0.96, 0.26, -0.85);
    body.add(sideExh);

    // Tinted VIP side glass
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.58, 2.75), matGlassRear);
    sideGlass.position.set(s * 0.90, 1.45, -0.75);
    body.add(sideGlass);
  }

  // Rear Spare Wheel Cover with Chrome Ring & Mercedes Star
  const spareCover = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 32), matBlack);
  spareCover.rotateX(Math.PI / 2);
  spareCover.position.set(0, 0.95, -2.45);
  body.add(spareCover);

  const spareRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 12, 32), matChrome);
  spareRing.position.set(0, 0.95, -2.45);
  body.add(spareRing);

  const spareStar = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.015, 12, 24), matChrome);
  spareStar.position.set(0, 0.95, -2.55);
  body.add(spareStar);

  // Rear Bumper Taillights
  for (let s of [-1, 1]) {
    const rearLight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.03), matTail);
    rearLight.position.set(s * 0.68, 0.45, -2.38);
    body.add(rearLight);
  }

  // Steering Wheel
  const steer = buildSteeringWheel(true);
  steer.position.set(0.42, 1.15, 0.45);
  steer.rotation.x = -0.55;
  body.add(steer);

  root.add(body);

  // Wheels: 22-inch AMG Cross-Spoke Wheels (radius 0.38m, width 0.28m)
  // Axle Front: +1.45m, Axle Rear: -1.44m, Track: 0.88m
  const wFL = buildWheel(0.38, 0.28, 7, false, matCaliperRed, matDarkRim);
  wFL.name = 'wheel_fl';
  wFL.position.set(0.88, 0.38, 1.45);
  root.add(wFL);

  const wFR = buildWheel(0.38, 0.28, 7, true, matCaliperRed, matDarkRim);
  wFR.name = 'wheel_fr';
  wFR.position.set(-0.88, 0.38, 1.45);
  root.add(wFR);

  const wRL = buildWheel(0.38, 0.28, 7, false, matCaliperRed, matDarkRim);
  wRL.name = 'wheel_rl';
  wRL.position.set(0.88, 0.38, -1.44);
  root.add(wRL);

  const wRR = buildWheel(0.38, 0.28, 7, true, matCaliperRed, matDarkRim);
  wRR.name = 'wheel_rr';
  wRR.position.set(-0.88, 0.38, -1.44);
  root.add(wRR);

  await exportAndSave(root, 'gelik');
}

// ==========================================
// 4. CHEVROLET TAHOE 2024 (VIP KORTEJ)
// ==========================================
async function buildTahoe() {
  console.log('=== Building Chevrolet Tahoe 2024 (VIP Kortej) ===');
  const root = new THREE.Group();
  root.name = 'tahoe_model';

  const body = new THREE.Group();
  body.name = 'body_group';

  // Length 5.35m, Width 2.06m, Height 1.93m
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.75, 5.25), matPaint);
  chassis.position.set(0, 0.65, 0);
  body.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.82, 3.45), matPaint);
  cabin.position.set(0, 1.42, -0.75);
  body.add(cabin);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.22, 1.70), matPaint);
  hood.position.set(0, 1.08, 1.75);
  body.add(hood);

  // Sloping Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.72, 0.04), matGlassFront);
  windshield.position.set(0, 1.42, 0.95);
  windshield.rotation.x = -0.42;
  body.add(windshield);

  // Giant Towering Chrome Front Grille with Golden Bowtie
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.65, 0.08), matChrome);
  grille.position.set(0, 0.85, 2.62);
  body.add(grille);

  const bowtie = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.065, 0.03), matGold);
  bowtie.position.set(0, 0.92, 2.67);
  body.add(bowtie);

  // C-Shaped LED DRLs & Headlights
  for (let s of [-1, 1]) {
    const cDrl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.04), matHead);
    cDrl.position.set(s * 0.85, 0.85, 2.58);
    body.add(cDrl);

    // Quad Tailpipes
    const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15), matChrome);
    exh.rotateX(Math.PI / 2);
    exh.position.set(s * 0.75, 0.32, -2.65);
    body.add(exh);

    // VIP Glass
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 3.15), matGlassRear);
    sideGlass.position.set(s * 0.98, 1.42, -0.75);
    body.add(sideGlass);
  }

  // Steering Wheel
  const steer = buildSteeringWheel(false);
  steer.position.set(0.45, 1.15, 0.48);
  steer.rotation.x = -0.55;
  body.add(steer);

  root.add(body);

  // Wheels: 22-inch SUV Wheels (radius 0.41m, width 0.28m)
  // Axle Front: +1.54m, Axle Rear: -1.53m, Track: 0.92m
  const wFL = buildWheel(0.41, 0.28, 6, false, matCaliperRed, matRim);
  wFL.name = 'wheel_fl';
  wFL.position.set(0.92, 0.41, 1.54);
  root.add(wFL);

  const wFR = buildWheel(0.41, 0.28, 6, true, matCaliperRed, matRim);
  wFR.name = 'wheel_fr';
  wFR.position.set(-0.92, 0.41, 1.54);
  root.add(wFR);

  const wRL = buildWheel(0.41, 0.28, 6, false, matCaliperRed, matRim);
  wRL.name = 'wheel_rl';
  wRL.position.set(0.92, 0.41, -1.53);
  root.add(wRL);

  const wRR = buildWheel(0.41, 0.28, 6, true, matCaliperRed, matRim);
  wRR.name = 'wheel_rr';
  wRR.position.set(-0.92, 0.41, -1.53);
  root.add(wRR);

  await exportAndSave(root, 'tahoe');
}

// ==========================================
// 5. ZEEKR 001 FR (FUTURISTIC SUPER-EV)
// ==========================================
async function buildZeekr() {
  console.log('=== Building Zeekr 001 FR (Futuristic Super-EV) ===');
  const root = new THREE.Group();
  root.name = 'zeekr_model';

  const body = new THREE.Group();
  body.name = 'body_group';

  // Length 4.97m, Width 1.99m, Height 1.54m (Shooting brake GT)
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.48, 4.92), matPaint);
  chassis.position.set(0, 0.44, 0);
  body.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.58, 2.65), matPaint);
  cabin.position.set(0, 0.98, -0.35);
  body.add(cabin);

  // Carbon Front Splitter with Orange Aero Winglets
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.05, 0.35), matCarbon);
  splitter.position.set(0, 0.22, 2.45);
  body.add(splitter);

  for (let s of [-1, 1]) {
    const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.18), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
    winglet.position.set(s * 0.96, 0.26, 2.45);
    body.add(winglet);

    // Signature Vertical Twin Claw DRLs (Zeekr signature)
    const claw1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.28), matHead);
    claw1.position.set(s * 0.75, 0.82, 1.85);
    body.add(claw1);

    const claw2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.28), matHead);
    claw2.position.set(s * 0.82, 0.82, 1.85);
    body.add(claw2);
  }

  // Full-Width Front Matrix Light Bar
  const frontBar = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.04, 0.03), matHead);
  frontBar.position.set(0, 0.62, 2.46);
  body.add(frontBar);

  // Full-Width 3D Continuous OLED Rear Lightbar
  const rearBar = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.06, 0.03), matTail);
  rearBar.position.set(0, 0.85, -2.45);
  body.add(rearBar);

  // High Carbon Fiber Roof Spoiler
  const roofSpoiler = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.05, 0.35), matCarbon);
  roofSpoiler.position.set(0, 1.32, -1.85);
  roofSpoiler.rotation.x = -0.15;
  body.add(roofSpoiler);

  // F1-Style Rear Diffuser & Center Rain Light
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 0.35), matCarbon);
  diffuser.position.set(0, 0.26, -2.42);
  body.add(diffuser);

  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.02), matTail);
  rainLight.position.set(0, 0.26, -2.55);
  body.add(rainLight);

  // Windshields & Panoramic Glass Roof
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.72, 0.04), matGlassFront);
  windshield.position.set(0, 1.05, 0.82);
  windshield.rotation.x = -0.65;
  body.add(windshield);

  // Steering Wheel
  const steer = buildSteeringWheel(true);
  steer.position.set(0.42, 0.88, 0.45);
  steer.rotation.x = -0.55;
  body.add(steer);

  root.add(body);

  // Wheels: 22-inch Lightweight Aero Wheels (radius 0.36m, width 0.26m)
  // Axle Front: +1.50m, Axle Rear: -1.50m, Track: 0.85m
  const wFL = buildWheel(0.36, 0.26, 5, false, matCaliperOrange, matDarkRim);
  wFL.name = 'wheel_fl';
  wFL.position.set(0.85, 0.36, 1.50);
  root.add(wFL);

  const wFR = buildWheel(0.36, 0.26, 5, true, matCaliperOrange, matDarkRim);
  wFR.name = 'wheel_fr';
  wFR.position.set(-0.85, 0.36, 1.50);
  root.add(wFR);

  const wRL = buildWheel(0.36, 0.26, 5, false, matCaliperOrange, matDarkRim);
  wRL.name = 'wheel_rl';
  wRL.position.set(0.85, 0.36, -1.50);
  root.add(wRL);

  const wRR = buildWheel(0.36, 0.26, 5, true, matCaliperOrange, matDarkRim);
  wRR.name = 'wheel_rr';
  wRR.position.set(-0.85, 0.36, -1.50);
  root.add(wRR);

  await exportAndSave(root, 'zeekr');
}

// ==========================================
// 6. CHEVROLET NEXIA 3 (KLASSIK TOSHKENT TAKSI)
// ==========================================
async function buildNexia() {
  console.log('=== Building Chevrolet Nexia 3 (R3 Taxi) ===');
  const root = new THREE.Group();
  root.name = 'nexia_model';

  const body = new THREE.Group();
  body.name = 'body_group';

  // Length 4.33m, Width 1.69m, Height 1.50m
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.45, 4.30), matPaint);
  chassis.position.set(0, 0.42, 0);
  body.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.58, 2.15), matPaint);
  cabin.position.set(0, 0.98, -0.22);
  body.add(cabin);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.18, 1.25), matPaint);
  hood.position.set(0, 0.68, 1.15);
  body.add(hood);

  // Split Honeycomb Grille with Bowtie
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.05), matBlack);
  grille.position.set(0, 0.58, 2.16);
  body.add(grille);

  const bowtie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.02), matGold);
  bowtie.position.set(0, 0.58, 2.18);
  body.add(bowtie);

  // Almond-Shaped Headlights
  for (let s of [-1, 1]) {
    const headLens = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.04), matHead);
    headLens.position.set(s * 0.58, 0.62, 2.14);
    body.add(headLens);

    // Amber Teardrop Rear Lights
    const tailLens = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.04), matTail);
    tailLens.position.set(s * 0.58, 0.72, -2.14);
    body.add(tailLens);
  }

  // Classic Yellow Taxi Cone on Roof
  const taxiCone = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.16), matTaxiYellow);
  taxiPhone: taxiCone.position.set(0, 1.34, 0.10);
  body.add(taxiCone);

  // Windshield & Windows
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.62, 0.03), matGlassFront);
  windshield.position.set(0, 0.98, 0.72);
  windshield.rotation.x = -0.55;
  body.add(windshield);

  // Steering Wheel
  const steer = buildSteeringWheel(false);
  steer.position.set(0.34, 0.85, 0.38);
  steer.rotation.x = -0.65;
  body.add(steer);

  root.add(body);

  // Wheels: 15-inch Classic Wheels (radius 0.30m, width 0.20m)
  // Axle Front: +1.24m, Axle Rear: -1.24m, Track: 0.72m
  const wFL = buildWheel(0.30, 0.20, 5, false, matCaliperRed, matRim);
  wFL.name = 'wheel_fl';
  wFL.position.set(0.72, 0.30, 1.24);
  root.add(wFL);

  const wFR = buildWheel(0.30, 0.20, 5, true, matCaliperRed, matRim);
  wFR.name = 'wheel_fr';
  wFR.position.set(-0.72, 0.30, 1.24);
  root.add(wFR);

  const wRL = buildWheel(0.30, 0.20, 5, false, matCaliperRed, matRim);
  wRL.name = 'wheel_rl';
  wRL.position.set(0.72, 0.30, -1.24);
  root.add(wRL);

  const wRR = buildWheel(0.30, 0.20, 5, true, matCaliperRed, matRim);
  wRR.name = 'wheel_rr';
  wRR.position.set(-0.72, 0.30, -1.24);
  root.add(wRR);

  await exportAndSave(root, 'nexia');
}

// ==========================================
// 7. BUGATTI CHIRON (1500 HP W16 HYPERCAR)
// ==========================================
async function buildBugatti() {
  console.log('=== Building Bugatti Chiron (1500 HP Hypercar) ===');
  const root = new THREE.Group();
  root.name = 'bugatti_model';

  const body = new THREE.Group();
  body.name = 'body_group';

  // Length 4.54m, Width 2.04m, Height 1.21m
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.00, 0.42, 4.48), matPaint);
  chassis.position.set(0, 0.35, 0);
  body.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.48, 2.10), matCarbon);
  cabin.position.set(0, 0.78, -0.25);
  body.add(cabin);

  // Iconic Horseshoe Center Grille
  const horseshoe = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 16, 24, Math.PI), matChrome);
  horseshoe.position.set(0, 0.42, 2.25);
  body.add(horseshoe);

  const bugattiLogo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), new THREE.MeshBasicMaterial({ color: 0xcc0000 }));
  bugattiLogo.rotateX(Math.PI / 2);
  bugattiLogo.position.set(0, 0.52, 2.27);
  body.add(bugattiLogo);

  // 8-Eye Quad-LED Projector Headlights
  for (let s of [-1, 1]) {
    for (let p = 0; p < 4; p++) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), matHead);
      eye.position.set(s * (0.55 + p * 0.08), 0.54, 2.15 - p * 0.04);
      body.add(eye);
    }

    // Iconic Sweeping Bugatti "C-Line" along flanks
    const cLine = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 12, 32, Math.PI * 1.2), matChrome);
    cLine.position.set(s * 1.01, 0.75, -0.20);
    cLine.rotateY(s * (Math.PI / 2));
    body.add(cLine);
  }

  // Full-Width 1.6m Continuous Rear LED Light Strip
  const tailStrip = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.03, 0.03), matTail);
  tailStrip.position.set(0, 0.68, -2.25);
  body.add(tailStrip);

  // Active Rear Aero Wing
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.04, 0.38), matCarbon);
  wing.position.set(0, 0.85, -1.85);
  wing.rotation.x = -0.12;
  body.add(wing);

  // Quad Central Titanium Exhaust
  const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.12), matChrome);
  exhaust.position.set(0, 0.28, -2.26);
  body.add(exhaust);

  // Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.68, 0.04), matGlassFront);
  windshield.position.set(0, 0.82, 0.65);
  windshield.rotation.x = -0.72;
  body.add(windshield);

  // Steering Wheel
  const steer = buildSteeringWheel(true);
  steer.position.set(0.42, 0.75, 0.42);
  steer.rotation.x = -0.55;
  body.add(steer);

  root.add(body);

  // Wheels: 20/21-inch Hypercar Wheels (radius 0.35m, width 0.32m)
  // Axle Front: +1.36m, Axle Rear: -1.35m, Track: 0.88m
  const wFL = buildWheel(0.35, 0.30, 5, false, matCaliperOrange, matDarkRim);
  wFL.name = 'wheel_fl';
  wFL.position.set(0.88, 0.35, 1.36);
  root.add(wFL);

  const wFR = buildWheel(0.35, 0.30, 5, true, matCaliperOrange, matDarkRim);
  wFR.name = 'wheel_fr';
  wFR.position.set(-0.88, 0.35, 1.36);
  root.add(wFR);

  const wRL = buildWheel(0.35, 0.34, 5, false, matCaliperOrange, matDarkRim);
  wRL.name = 'wheel_rl';
  wRL.position.set(0.88, 0.35, -1.35);
  root.add(wRL);

  const wRR = buildWheel(0.35, 0.34, 5, true, matCaliperOrange, matDarkRim);
  wRR.name = 'wheel_rr';
  wRR.position.set(-0.88, 0.35, -1.35);
  root.add(wRR);

  await exportAndSave(root, 'bugatti');
}

// Execute all 7 builders
async function main() {
  await buildDamas();
  await buildMalibu();
  await buildGelik();
  await buildTahoe();
  await buildZeekr();
  await buildNexia();
  await buildBugatti();
  console.log('🎉 ALL 7 REALISTIC 3D VEHICLE MODELS BUILT AND SAVED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
