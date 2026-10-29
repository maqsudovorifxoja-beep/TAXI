import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

// Polyfill FileReader for Node.js GLTFExporter
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

/**
 * Creates the high-fidelity 2025 BMW M5 (G90) Sedan 3D model.
 * Fully compatible with Rapier 3D game physics, Three.js shaders,
 * material role mappings (paint, glass, chrome, head, tail, brake, reverse, indL, indR),
 * wheel animations, and interior camera.
 */
function createBMWM5G90() {
  const root = new THREE.Group();
  root.name = 'bmw_root';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MATERIAL DEFINITIONS (Mapped to game roles)
  // ═══════════════════════════════════════════════════════════════════════════
  // Dynamic body paint (Frozen Deep Matte Charcoal / Black Satin Metallic)
  const mPaint = new THREE.MeshPhysicalMaterial({
    name: 'paint',
    color: 0x18191c,
    roughness: 0.32,
    metalness: 0.42,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22
  });

  // High-gloss shadowline black
  const mGlossBlack = new THREE.MeshStandardMaterial({
    name: 'black',
    color: 0x07080a,
    roughness: 0.12,
    metalness: 0.88
  });

  // M Carbon fiber & aerodynamic composite trim
  const mCarbon = new THREE.MeshStandardMaterial({
    name: 'trim',
    color: 0x121315,
    roughness: 0.48,
    metalness: 0.45
  });

  // Mirror chrome & metallic brightwork
  const mChrome = new THREE.MeshStandardMaterial({
    name: 'chrome',
    color: 0xe6e9ed,
    roughness: 0.12,
    metalness: 0.98
  });

  // Tinted automotive safety glass
  const mGlassFront = new THREE.MeshPhysicalMaterial({
    name: 'glass_front',
    color: 0x060c14,
    roughness: 0.04,
    transmission: 0.85,
    opacity: 0.88,
    transparent: true,
    clearcoat: 1.0
  });

  const mGlassRear = new THREE.MeshPhysicalMaterial({
    name: 'glass_rear',
    color: 0x060c14,
    roughness: 0.04,
    transmission: 0.82,
    opacity: 0.90,
    transparent: true,
    clearcoat: 1.0
  });

  const mGlassFSide = new THREE.MeshPhysicalMaterial({
    name: 'glass_fside',
    color: 0x070d16,
    roughness: 0.04,
    transmission: 0.84,
    opacity: 0.88,
    transparent: true,
    clearcoat: 1.0
  });

  const mGlassRSide = new THREE.MeshPhysicalMaterial({
    name: 'glass_rside',
    color: 0x050a10,
    roughness: 0.04,
    transmission: 0.78,
    opacity: 0.92,
    transparent: true,
    clearcoat: 1.0
  });

  // Headlights & Iconic Glow Illuminated Contour
  const mHeadlight = new THREE.MeshStandardMaterial({
    name: 'head',
    color: 0xf5f8ff,
    emissive: 0xffffff,
    emissiveIntensity: 2.5,
    roughness: 0.08,
    metalness: 0.3
  });

  // Running Taillight Bar
  const mTailLight = new THREE.MeshStandardMaterial({
    name: 'tail',
    color: 0xbf0015,
    emissive: 0xff0824,
    emissiveIntensity: 2.0,
    roughness: 0.15
  });

  // High-intensity Brake Light
  const mBrakeLight = new THREE.MeshStandardMaterial({
    name: 'brake',
    color: 0xee0018,
    emissive: 0xff0020,
    emissiveIntensity: 2.8,
    roughness: 0.15
  });

  // Reversing Light
  const mReverseLight = new THREE.MeshStandardMaterial({
    name: 'reverse',
    color: 0xe0e6ed,
    emissive: 0xffffff,
    emissiveIntensity: 2.4,
    roughness: 0.1
  });

  // Left & Right Amber Turn Indicators
  const mIndL = new THREE.MeshStandardMaterial({
    name: 'indL',
    color: 0xff8c00,
    emissive: 0xff9900,
    emissiveIntensity: 2.6,
    roughness: 0.12
  });

  const mIndR = new THREE.MeshStandardMaterial({
    name: 'indR',
    color: 0xff8c00,
    emissive: 0xff9900,
    emissiveIntensity: 2.6,
    roughness: 0.12
  });

  // Wheels & Brakes
  const mRimSilver = new THREE.MeshStandardMaterial({ name: 'rim', color: 0xd8dbe0, roughness: 0.18, metalness: 0.92 });
  const mTyre = new THREE.MeshStandardMaterial({ name: 'tyre', color: 0x161719, roughness: 0.94, metalness: 0.04 });
  const mDisc = new THREE.MeshStandardMaterial({ name: 'disc', color: 0x7c8086, roughness: 0.38, metalness: 0.85 });
  const mGoldCaliper = new THREE.MeshStandardMaterial({ name: 'chrome', color: 0xd4a017, roughness: 0.22, metalness: 0.75 });
  const mSteer = new THREE.MeshStandardMaterial({ name: 'steer', color: 0x16171a, roughness: 0.65, metalness: 0.2 });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DIMENSIONS & STANCE
  // ═══════════════════════════════════════════════════════════════════════════
  // G90 M5 Specifications: Length 5.09m, Width 1.97m, Height 1.43m
  // Front overhang ~0.92m, Rear overhang ~1.05m, Wheelbase ~3.00m
  const carWidth = 1.98;
  const halfW = carWidth / 2;

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SCULPTED MAIN BODY & WIDEBODY FENDERS
  // ═══════════════════════════════════════════════════════════════════════════
  // Main lower chassis core
  const chassisGeo = new THREE.BoxGeometry(carWidth * 0.92, 0.44, 4.70);
  const chassis = new THREE.Mesh(chassisGeo, mPaint);
  chassis.name = 'body_chassis';
  chassis.position.set(0, 0.46, 0.05);
  root.add(chassis);

  // Aerodynamic underbody flat floor
  const underfloor = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.90, 0.04, 4.60), mGlossBlack);
  underfloor.position.set(0, 0.22, 0.05);
  root.add(underfloor);

  // Muscular flared front & rear fenders (G90 widebody stance)
  [-1, 1].forEach(side => {
    const xPos = halfW * side;

    // Front Flared Fender Arch (extends past wheel arch)
    const fFender = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 1.42), mPaint);
    fFender.position.set(xPos * 0.95, 0.48, 1.48);
    root.add(fFender);

    // Front Fender Wheel Arch Flare Lip (contoured bevel)
    const fArchLip = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 24, 1, false, 0, Math.PI), mPaint);
    fArchLip.rotation.z = Math.PI / 2;
    fArchLip.position.set(xPos * 0.98, 0.38, 1.48);
    root.add(fArchLip);

    // Front Fender M Air Gill / Breather with M5 Badge
    const fGill = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.28), mGlossBlack);
    fGill.position.set(xPos * 1.01, 0.58, 0.88);
    root.add(fGill);

    const fGillAccent = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.03, 0.22), mChrome);
    fGillAccent.position.set(xPos * 1.015, 0.58, 0.88);
    root.add(fGillAccent);

    // Left Front Fender M Hybrid Charging Port Door
    if (side === 1) {
      const chargePort = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.18), mGlossBlack);
      chargePort.position.set(xPos * 1.01, 0.65, 1.18);
      root.add(chargePort);
    }

    // Rear Flared Widebody Quarter Panel (wider stance for 295 rear tires)
    const rFender = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 1.55), mPaint);
    rFender.position.set(xPos * 0.97, 0.49, -1.30);
    root.add(rFender);

    // Rear Wheel Arch Bevel Lip
    const rArchLip = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.12, 24, 1, false, 0, Math.PI), mPaint);
    rArchLip.rotation.z = Math.PI / 2;
    rArchLip.position.set(xPos * 1.00, 0.38, -1.30);
    root.add(rArchLip);

    // Sculpted Doors & Waistline Concavity
    const doorSwell = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 1.58), mPaint);
    doorSwell.position.set(xPos * 0.92, 0.48, 0.08);
    root.add(doorSwell);

    // Sculpted Shoulder "Tornado" Character Line
    const shoulderLine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 3.80), mPaint);
    shoulderLine.position.set(xPos * 0.96, 0.72, 0.10);
    root.add(shoulderLine);

    // Flush Aerodynamic Door Handles with illumination groove
    [0.45, -0.42].forEach(z => {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.17), mGlossBlack);
      handle.position.set(xPos * 0.97, 0.71, z);
      root.add(handle);
    });

    // Aerodynamic Gloss Black Side Skirts with Rear Aero Winglet
    const sideSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 2.70), mGlossBlack);
    sideSkirt.position.set(xPos * 0.95, 0.24, 0.08);
    root.add(sideSkirt);

    const skirtFlick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.16), mCarbon);
    skirtFlick.position.set(xPos * 1.01, 0.28, -0.65);
    root.add(skirtFlick);

    // M Carbon Aerodynamic "Devil Horn" Double-Stalk Side Mirrors
    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(xPos * 1.02, 0.96, 0.74);

    const mArmLower = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.06), mGlossBlack);
    mArmLower.position.set(-0.04 * side, -0.04, 0);
    mirrorGroup.add(mArmLower);

    const mArmUpper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.04), mGlossBlack);
    mArmUpper.position.set(-0.02 * side, 0.04, 0.02);
    mirrorGroup.add(mArmUpper);

    const mirrorCap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.14), mCarbon);
    mirrorCap.position.set(0.08 * side, 0, 0);
    mirrorGroup.add(mirrorCap);

    // Mirror Glass
    const mirrorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.09, 0.11), mChrome);
    mirrorGlass.position.set((0.08 * side) - (0.09 * side), 0, -0.01);
    mirrorGroup.add(mirrorGlass);

    // Mirror Amber Turn Signal LED Strip
    const mBlinkerMat = side > 0 ? mIndL : mIndR;
    const mBlinker = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.13), mBlinkerMat);
    mBlinker.position.set(0.18 * side, 0.01, 0.02);
    mirrorGroup.add(mBlinker);

    root.add(mirrorGroup);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CHISELED HOOD WITH AGGRESSIVE POWERDOMES
  // ═══════════════════════════════════════════════════════════════════════════
  // Main sloping hood surface
  const hood = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.88, 0.12, 1.76), mPaint);
  hood.name = 'hood';
  hood.position.set(0, 0.79, 1.34);
  hood.rotation.x = -0.105;
  root.add(hood);

  // Twin M Powerdomes (Sculpted muscle lines sweeping from grille to windshield)
  [-0.32, 0.32].forEach(x => {
    const powerdome = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 1.48), mPaint);
    powerdome.position.set(x, 0.87, 1.32);
    powerdome.rotation.x = -0.105;
    root.add(powerdome);

    // Inner chiseled crease edge
    const crease = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 1.35), mGlossBlack);
    crease.position.set(x * 0.75, 0.86, 1.30);
    crease.rotation.x = -0.105;
    root.add(crease);
  });

  // BMW Roundel Emblem on Hood Front
  const bmwEmblem = new THREE.Group();
  bmwEmblem.position.set(0, 0.78, 2.24);
  bmwEmblem.rotation.x = -0.18;

  const emblemBase = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.015, 24), mChrome);
  bmwEmblem.add(emblemBase);

  const emblemBlue1 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.017, 0.042), mPaint);
  emblemBlue1.position.set(-0.02, 0.001, -0.02);
  bmwEmblem.add(emblemBlue1);

  const emblemBlue2 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.017, 0.042), mPaint);
  emblemBlue2.position.set(0.02, 0.001, 0.02);
  bmwEmblem.add(emblemBlue2);

  root.add(bmwEmblem);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. G90 FRONT FASCIA & ICONIC GLOW DOUBLE KIDNEY GRILLE
  // ═══════════════════════════════════════════════════════════════════════════
  // Front Bumper Core
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.94, 0.48, 0.55), mPaint);
  frontBumper.position.set(0, 0.46, 2.30);
  root.add(frontBumper);

  // Large Central Trapezoidal Gloss Black Air Dam (G90 signature)
  const centerIntake = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.28, 0.18), mGlossBlack);
  centerIntake.position.set(0, 0.31, 2.50);
  root.add(centerIntake);

  // Central Vertical Aero Splitter Flics inside air dam
  [-0.22, 0.22].forEach(x => {
    const flic = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.26, 0.16), mCarbon);
    flic.position.set(x, 0.31, 2.51);
    root.add(flic);
  });

  // Central Radar Sensor Pod (ADAS sensor dome)
  const radarDome = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.05), mGlossBlack);
  radarDome.position.set(0, 0.26, 2.57);
  root.add(radarDome);

  // Corner Air Curtains / Brake Cooling Inlets
  [-0.76, 0.76].forEach(x => {
    const sideInlet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.18), mGlossBlack);
    sideInlet.position.set(x, 0.36, 2.44);
    sideInlet.rotation.y = x > 0 ? -0.24 : 0.24;
    root.add(sideInlet);

    // Aero air curtain blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.16), mCarbon);
    blade.position.set(x + (x > 0 ? 0.08 : -0.08), 0.36, 2.46);
    blade.rotation.y = x > 0 ? -0.24 : 0.24;
    root.add(blade);
  });

  // Lower Carbon Front Splitter with Upturned Endplates
  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.96, 0.045, 0.42), mCarbon);
  frontSplitter.position.set(0, 0.17, 2.42);
  root.add(frontSplitter);

  [-halfW * 0.94, halfW * 0.94].forEach(x => {
    const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.26), mCarbon);
    endplate.position.set(x, 0.21, 2.45);
    root.add(endplate);
  });

  // ── ICONIC GLOW DOUBLE KIDNEY GRILLE (G90 M5) ──
  [-0.27, 0.27].forEach(x => {
    // Hexagonal / octagonal gloss black closed kidney backing
    const grilleFace = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.08), mGlossBlack);
    grilleFace.position.set(x, 0.60, 2.53);
    root.add(grilleFace);

    // M Double Horizontal Slats (Signature M5 horizontal dual bars)
    [-0.07, 0.07].forEach(y => {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.024, 0.06), mCarbon);
      slat.position.set(x, 0.60 + y, 2.56);
      root.add(slat);
    });

    // Illuminated "Iconic Glow" LED Contour Frame (Linked to 'head' so it glows!)
    // Top, bottom, left, right light guides
    const glowTop = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.022, 0.025), mHeadlight);
    glowTop.position.set(x, 0.77, 2.565);
    root.add(glowTop);

    const glowBot = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.022, 0.025), mHeadlight);
    glowBot.position.set(x, 0.43, 2.565);
    root.add(glowBot);

    const glowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.34, 0.025), mHeadlight);
    glowLeft.position.set(x - 0.20, 0.60, 2.565);
    root.add(glowLeft);

    const glowRight = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.34, 0.025), mHeadlight);
    glowRight.position.set(x + 0.20, 0.60, 2.565);
    root.add(glowRight);
  });

  // M5 Badge on Grille
  const m5GrilleBadge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.02), mChrome);
  m5GrilleBadge.position.set(-0.24, 0.68, 2.58);
  root.add(m5GrilleBadge);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. ADAPTIVE LED HEADLIGHTS WITH TWIN VERTICAL DAGGER DRLs
  // ═══════════════════════════════════════════════════════════════════════════
  [-0.72, 0.72].forEach(x => {
    const angleY = x > 0 ? -0.24 : 0.24;

    // Headlight Dark Shadowline Housing
    const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.17, 0.18), mGlossBlack);
    hlHousing.position.set(x, 0.66, 2.38);
    hlHousing.rotation.y = angleY;
    root.add(hlHousing);

    // Twin Vertical Dagger / Baton LED DRLs (| |) - Linked to 'head' material!
    [-0.08, 0.08].forEach(dx => {
      const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.13, 0.03), mHeadlight);
      dagger.position.set(x + (dx * Math.cos(angleY)), 0.66, 2.45 + (dx * Math.sin(angleY)));
      dagger.rotation.y = angleY;
      dagger.rotation.z = x > 0 ? 0.07 : -0.07;
      root.add(dagger);
    });

    // Bi-LED Projector Lens Element
    const projector = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 16), mHeadlight);
    projector.rotation.x = Math.PI / 2;
    projector.position.set(x, 0.66, 2.43);
    projector.rotation.y = angleY;
    root.add(projector);

    // Amber Turn Indicator Strip on outer corner
    const turnMat = x > 0 ? mIndL : mIndR;
    const turnStrip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.10), turnMat);
    turnStrip.position.set(x + (x > 0 ? 0.16 : -0.16), 0.71, 2.34);
    turnStrip.rotation.y = angleY;
    root.add(turnStrip);

    // Outer Aerodynamic Protective Lens
    const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.03), mGlassFront);
    hlLens.position.set(x, 0.66, 2.46);
    hlLens.rotation.y = angleY;
    root.add(hlLens);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. GREENHOUSE, M CARBON ROOF & SLANTED SAFETY GLASS
  // ═══════════════════════════════════════════════════════════════════════════
  // Raked Front Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.84, 0.74, 0.05), mGlassFront);
  windshield.position.set(0, 1.15, 0.62);
  windshield.rotation.x = -0.64;
  root.add(windshield);

  // A-Pillars (Sleek gloss black / body paint)
  [-1, 1].forEach(side => {
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.76, 0.07), mGlossBlack);
    aPillar.position.set((halfW * 0.83) * side, 1.15, 0.62);
    aPillar.rotation.x = -0.64;
    aPillar.rotation.z = side > 0 ? 0.12 : -0.12;
    root.add(aPillar);
  });

  // Lightweight M Carbon Fiber Roof with Central Aerodynamic Channel
  const roof = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.81, 0.07, 2.05), mCarbon);
  roof.name = 'roof';
  roof.position.set(0, 1.43, -0.36);
  root.add(roof);

  // Central Double-Bubble Roof Indentation
  const roofChannel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 1.95), mGlossBlack);
  roofChannel.position.set(0, 1.455, -0.36);
  root.add(roofChannel);

  // Aerodynamic Shark-Fin Antenna
  const antenna = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 4), mGlossBlack);
  antenna.rotation.x = 0.35;
  antenna.position.set(0, 1.49, -1.15);
  root.add(antenna);

  // Raked Rear Windshield (Fastback coupe-like roofline)
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.82, 0.76, 0.05), mGlassRear);
  rearGlass.position.set(0, 1.15, -1.48);
  rearGlass.rotation.x = 0.68;
  root.add(rearGlass);

  // C-Pillars with Iconic BMW Hofmeister Kink & Embossed "5"
  [-1, 1].forEach(side => {
    const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 0.14), mPaint);
    cPillar.position.set((halfW * 0.83) * side, 1.14, -1.46);
    cPillar.rotation.x = 0.68;
    cPillar.rotation.z = side > 0 ? -0.14 : 0.14;
    root.add(cPillar);

    // Hofmeister Kink Gloss Black Trim with "5" Emblem
    const hofmeister = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.22), mGlossBlack);
    hofmeister.position.set((halfW * 0.86) * side, 1.02, -1.36);
    hofmeister.rotation.y = side > 0 ? 0.26 : -0.26;
    root.add(hofmeister);

    const badge5 = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.04, 0.04), mChrome);
    badge5.position.set((halfW * 0.865) * side, 1.02, -1.36);
    root.add(badge5);

    // Side Windows (Front & Rear)
    const fSideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 1.05), mGlassFSide);
    fSideGlass.position.set((halfW * 0.83) * side, 1.15, 0.18);
    root.add(fSideGlass);

    const rSideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.43, 1.00), mGlassRSide);
    rSideGlass.position.set((halfW * 0.83) * side, 1.15, -0.80);
    root.add(rSideGlass);

    // B-Pillar Gloss Black Divider
    const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.10), mGlossBlack);
    bPillar.position.set((halfW * 0.835) * side, 1.15, -0.32);
    root.add(bPillar);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. REAR POWERHOUSE: DIFFUSER, M LIP SPOILER & QUAD EXHAUSTS
  // ═══════════════════════════════════════════════════════════════════════════
  // Rear Bumper Core
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.94, 0.48, 0.58), mPaint);
  rearBumper.position.set(0, 0.47, -2.25);
  root.add(rearBumper);

  // Trunk Deck Lid
  const trunkLid = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.82, 0.10, 0.65), mPaint);
  trunkLid.position.set(0, 0.86, -2.05);
  root.add(trunkLid);

  // M Carbon Fiber Rear Trunk-Lip Spoiler with Aerodynamic Center Notch
  const lipSpoiler = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.82, 0.05, 0.18), mCarbon);
  lipSpoiler.position.set(0, 0.91, -2.36);
  root.add(lipSpoiler);

  // BMW Roundel Emblem on Trunk
  const rearEmblem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 20), mChrome);
  rearEmblem.rotation.x = Math.PI / 2;
  rearEmblem.position.set(0, 0.77, -2.48);
  root.add(rearEmblem);

  // Chrome M5 Badge on Trunk Lid
  const m5TrunkBadge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.015), mChrome);
  m5TrunkBadge.position.set(0.42, 0.76, -2.48);
  root.add(m5TrunkBadge);

  // ── SLIM L-SHAPED 3D LED TAILLIGHTS ──
  [-0.72, 0.72].forEach(x => {
    const angleY = x > 0 ? 0.08 : -0.08;

    // Dark Smoked Housing
    const tailHousing = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.08), mGlossBlack);
    tailHousing.position.set(x, 0.73, -2.44);
    tailHousing.rotation.y = angleY;
    root.add(tailHousing);

    // Main Running LED Light Bar (L-Shape) - Linked to 'tail'
    const tailLightBar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.035, 0.05), mTailLight);
    tailLightBar.position.set(x, 0.73, -2.47);
    tailLightBar.rotation.y = angleY;
    root.add(tailLightBar);

    // Intense Brake Light Bar - Linked to 'brake'
    const brakeBar = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.03, 0.045), mBrakeLight);
    brakeBar.position.set(x, 0.76, -2.47);
    brakeBar.rotation.y = angleY;
    root.add(brakeBar);

    // White Reverse Light Segment - Linked to 'reverse'
    const revSeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.04), mReverseLight);
    revSeg.position.set(x * 0.72, 0.70, -2.47);
    revSeg.rotation.y = angleY;
    root.add(revSeg);

    // Amber Turn Indicator Strip - Linked to 'indL' / 'indR'
    const rTurnMat = x > 0 ? mIndL : mIndR;
    const rTurnStrip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.04), rTurnMat);
    rTurnStrip.position.set(x, 0.70, -2.47);
    rTurnStrip.rotation.y = angleY;
    root.add(rTurnStrip);
  });

  // ── MASSIVE RACING REAR DIFFUSER & QUAD EXHAUSTS ──
  // Deep Gloss Black Aerodynamic Diffuser
  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.86, 0.26, 0.42), mGlossBlack);
  rearDiffuser.position.set(0, 0.28, -2.38);
  root.add(rearDiffuser);

  // 4 Aggressive Vertical Aero Diffuser Fins
  [-0.30, -0.10, 0.10, 0.30].forEach(x => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.38), mCarbon);
    fin.position.set(x, 0.27, -2.40);
    root.add(fin);
  });

  // Central Formula 1-Style Vertical Safety Light / Reflector
  const f1Reflector = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), mBrakeLight);
  f1Reflector.position.set(0, 0.24, -2.52);
  root.add(f1Reflector);

  // Quad 100mm M Sport Dual Exhaust Pipes (Twin on left, twin on right)
  // Coordinates match the game's exhaust tip smoke emitters:
  // ±0.46, 0.30, -2.28 and ±0.58, 0.30, -2.26
  [-0.58, -0.46, 0.46, 0.58].forEach(x => {
    const zPos = Math.abs(x) > 0.52 ? -2.48 : -2.50;

    // Polished Titanium / Chrome Outer Exhaust Tip
    const pipeOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.22, 20), mChrome);
    pipeOuter.rotation.x = Math.PI / 2;
    pipeOuter.position.set(x, 0.29, zPos);
    root.add(pipeOuter);

    // Dark Hollow Interior Core
    const pipeHollow = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.23, 16), mGlossBlack);
    pipeHollow.rotation.x = Math.PI / 2;
    pipeHollow.position.set(x, 0.29, zPos - 0.01);
    root.add(pipeHollow);
  });

  // Authentic Uzbekistan License Plate: "01 | 777 M5"
  function buildPlate(zPos, isFront) {
    const plateGroup = new THREE.Group();
    plateGroup.position.set(0, isFront ? 0.38 : 0.48, zPos);

    // Black frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.13, 0.02), mGlossBlack);
    plateGroup.add(frame);

    // White plate face
    const plateFace = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.11, 0.022), mChrome);
    plateGroup.add(plateFace);

    // Blue Uzbekistan flag band
    const flagBand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.024), mHeadlight);
    flagBand.position.set(-0.22, 0, 0);
    plateGroup.add(flagBand);

    root.add(plateGroup);
  }
  buildPlate(2.57, true);   // Front plate
  buildPlate(-2.51, false); // Rear plate

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. HIGH-END M COCKPIT & FLAT-BOTTOM STEERING WHEEL
  // ═══════════════════════════════════════════════════════════════════════════
  const dash = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.80, 0.28, 0.52), mSteer);
  dash.position.set(0, 0.88, 0.38);
  root.add(dash);

  // BMW Curved Widescreen Display (Instrument Cluster + iDrive 8.5)
  const curvedDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.16, 0.04), mGlossBlack);
  curvedDisplay.position.set(-0.06, 1.02, 0.36);
  curvedDisplay.rotation.x = -0.16;
  root.add(curvedDisplay);

  const displayGlass = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.14, 0.01), mHeadlight);
  displayGlass.position.set(-0.06, 1.02, 0.38);
  displayGlass.rotation.x = -0.16;
  root.add(displayGlass);

  // M Multifunction Sport Bucket Seats with Illuminated M5 Badges
  [-0.38, 0.38].forEach(x => {
    // Cushion
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.52), mSteer);
    seatBase.position.set(x, 0.48, -0.22);
    root.add(seatBase);

    // High-bolster backrest
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.18), mSteer);
    seatBack.position.set(x, 0.82, -0.42);
    seatBack.rotation.x = 0.16;
    root.add(seatBack);

    // Integrated headrest with M5 badge
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.14), mSteer);
    headrest.position.set(x, 1.18, -0.48);
    headrest.rotation.x = 0.16;
    root.add(headrest);

    const mBadge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.02), mHeadlight);
    mBadge.position.set(x, 1.12, -0.40);
    mBadge.rotation.x = 0.16;
    root.add(mBadge);
  });

  // Center Console with Carbon Trim & iDrive Toggle
  const centerConsole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.85), mCarbon);
  centerConsole.position.set(0, 0.56, -0.05);
  root.add(centerConsole);

  // M Sport Flat-Bottom Steering Wheel (Crucial: named 'steering' for game rotation!)
  const steering = new THREE.Group();
  steering.name = 'steering';
  steering.position.set(0.36, 0.94, 0.22);
  steering.rotation.x = -0.32;

  // Thick contoured flat-bottom steering ring
  const steerRing = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 14, 32), mSteer);
  steering.add(steerRing);

  // 12 o'clock Red Center Marker
  const marker12 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.025), mTailLight);
  marker12.position.set(0, 0.165, 0);
  steering.add(marker12);

  // Steering Hub with Center BMW Roundel
  const steerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 20), mGlossBlack);
  steerHub.rotation.x = Math.PI / 2;
  steering.add(steerHub);

  const steerBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.035, 16), mChrome);
  steerBadge.rotation.x = Math.PI / 2;
  steering.add(steerBadge);

  // Red M1 and M2 Drive Buttons on Wheel
  [-0.07, 0.07].forEach(x => {
    const mBtn = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.025, 0.02), mBrakeLight);
    mBtn.position.set(x, 0.035, 0.02);
    steering.add(mBtn);
  });

  // Carbon Fiber Shift Paddles behind wheel (- on left, + on right)
  [-0.14, 0.14].forEach(x => {
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.015), mCarbon);
    paddle.position.set(x, 0.02, -0.03);
    paddle.rotation.z = x > 0 ? -0.15 : 0.15;
    steering.add(paddle);
  });

  // 3 Matte Chrome Spokes
  [-0.08, 0.08].forEach(x => {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.02), mChrome);
    spoke.position.set(x, 0, 0);
    steering.add(spoke);
  });
  const botSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.09, 0.02), mChrome);
  botSpoke.position.set(0, -0.07, 0);
  steering.add(botSpoke);

  root.add(steering);

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. REALISTIC 21" M BI-COLOR Y-SPOKE ALLOY WHEELS & PERFORMANCE TIRES
  // ═══════════════════════════════════════════════════════════════════════════
  // Note: The game engine animates wheel rotation by rotating wheel group on X axis.
  // Left wheels have outer face at +X; right wheels have outer face at -X.
  function buildG90Wheel(name, isLeft) {
    const wheel = new THREE.Group();
    wheel.name = name;

    const r = 0.325; // 0.325m radius (matches game spec wheelRadius)
    const w = 0.27;  // 275/295 mm tire width
    const faceSign = isLeft ? 1 : -1;

    // 1. Michelin Pilot Sport 4S High Performance Tire
    const tyreGeo = new THREE.CylinderGeometry(r, r, w, 32);
    tyreGeo.rotateZ(Math.PI / 2);
    const tyre = new THREE.Mesh(tyreGeo, mTyre);
    wheel.add(tyre);

    // Tread shoulder bevel rings
    [-1, 1].forEach(s => {
      const shoulderGeo = new THREE.TorusGeometry(r * 0.94, 0.03, 8, 32);
      shoulderGeo.rotateY(Math.PI / 2);
      const shoulder = new THREE.Mesh(shoulderGeo, mTyre);
      shoulder.position.x = (w * 0.45) * s;
      wheel.add(shoulder);
    });

    // 2. Gloss Black Rim Barrel
    const rimBarrelGeo = new THREE.CylinderGeometry(r * 0.78, r * 0.78, w * 0.96, 28);
    rimBarrelGeo.rotateZ(Math.PI / 2);
    const rimBarrel = new THREE.Mesh(rimBarrelGeo, mGlossBlack);
    wheel.add(rimBarrel);

    // Outer Polished Rim Flange / Lip
    const rimLipGeo = new THREE.TorusGeometry(r * 0.77, 0.014, 10, 32);
    rimLipGeo.rotateY(Math.PI / 2);
    const rimLip = new THREE.Mesh(rimLipGeo, mRimSilver);
    rimLip.position.x = (w * 0.49) * faceSign;
    wheel.add(rimLip);

    // 3. Bi-Color M Double-Spoke Style 951M Y-Spokes (5 Dual Y-Spoke Clusters)
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;

      [-0.08, 0.08].forEach(offset => {
        // Outer diamond-cut silver face
        const spokeSilver = new THREE.Mesh(new THREE.BoxGeometry(0.024, r * 0.74, 0.025), mRimSilver);
        spokeSilver.rotation.x = angle + offset;
        spokeSilver.position.x = (w * 0.485) * faceSign;
        wheel.add(spokeSilver);

        // Inner dark gloss black pocket backing
        const spokeBlack = new THREE.Mesh(new THREE.BoxGeometry(0.030, r * 0.70, 0.035), mGlossBlack);
        spokeBlack.rotation.x = angle + offset;
        spokeBlack.position.x = (w * 0.44) * faceSign;
        wheel.add(spokeBlack);
      });
    }

    // 4. Center Hub & BMW Roundel Center Cap
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, 0.04, 20), mGlossBlack);
    hub.rotateZ(Math.PI / 2);
    hub.position.x = (w * 0.48) * faceSign;
    wheel.add(hub);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 20), mChrome);
    cap.rotateZ(Math.PI / 2);
    cap.position.x = (w * 0.505) * faceSign;
    wheel.add(cap);

    // 5 Lug Nuts in Pentagon Pattern
    for (let l = 0; l < 5; l++) {
      const lAngle = (l * Math.PI * 2) / 5;
      const lug = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.02, 8), mChrome);
      lug.rotateZ(Math.PI / 2);
      lug.position.set((w * 0.495) * faceSign, Math.sin(lAngle) * 0.048, Math.cos(lAngle) * 0.048);
      wheel.add(lug);
    }

    // 5. Cross-Drilled Carbon Ceramic Brake Rotor Disc
    const rotorGeo = new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.032, 28);
    rotorGeo.rotateZ(Math.PI / 2);
    const rotor = new THREE.Mesh(rotorGeo, mDisc);
    rotor.position.x = (w * 0.22) * faceSign;
    wheel.add(rotor);

    // 6. Gold M Carbon Ceramic 6-Piston Brake Caliper
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.19, 0.14), mGoldCaliper);
    caliper.position.set((w * 0.25) * faceSign, r * 0.46, 0);
    wheel.add(caliper);

    return wheel;
  }

  // 4 Performance Wheels (properly facing outward on both left and right sides)
  const wheelFL = buildG90Wheel('wheel_fl', true);
  const wheelFR = buildG90Wheel('wheel_fr', false);
  const wheelRL = buildG90Wheel('wheel_rl', true);
  const wheelRR = buildG90Wheel('wheel_rr', false);

  root.add(wheelFL);
  root.add(wheelFR);
  root.add(wheelRL);
  root.add(wheelRR);

  return root;
}

async function exportBMWM5G90() {
  const model = createBMWM5G90();
  const exporter = new GLTFExporter();
  console.log('Generating Realistic 2025 BMW M5 (G90) Sedan 3D GLB model...');
  const glbBuffer = await exporter.parseAsync(model, { binary: true });

  const destPaths = [
    path.resolve('./models/bmw.glb'),
    path.resolve('./public/models/bmw.glb'),
    path.resolve('./dist/models/bmw.glb')
  ];

  for (const p of destPaths) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, Buffer.from(glbBuffer));
    console.log(`✓ Saved BMW M5 G90: ${p} (${(glbBuffer.byteLength / 1024).toFixed(1)} KB)`);
  }
}

exportBMWM5G90().catch(err => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
