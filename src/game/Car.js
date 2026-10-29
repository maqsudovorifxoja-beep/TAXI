import * as THREE from 'three';
import { audioEngine } from './AudioEngine.js';

export class Car {
  constructor(scene, carType = 'amg') {
    this.scene = scene;
    this.carType = carType; // 'bmw' or 'amg'
    this.group = new THREE.Group();

    // Physics state
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 0; // km/h
    this.acceleration = 0;
    this.steeringAngle = 0;
    this.rotationY = 0;

    // Driving flags
    this.isBraking = false;
    this.isDrifting = false;
    this.isNitro = false;
    this.nitroFuel = 100;
    this.headlightsOn = true;
    this.flightMode = false;
    this.isFlying = false;
    this.flightAltitude = 0;
    this.flightRoll = 0;
    this.flightPitch = 0;

    // Visual references
    this.wheels = [];
    this.frontWheels = [];
    this.brakeDiscs = [];
    this.headlightSpots = [];
    this.taillightMeshes = [];
    this.smokePool = [];
    this.bodyMeshGroup = new THREE.Group();
    this.group.add(this.bodyMeshGroup);

    // Initial paint colors
    this.paintColor = carType === 'bmw' ? 0x0088ff : 0x18181c; // Deep AMG Obsidian Black or BMW Electric Cyan

    // Setup materials & textures
    this.setupSharedMaterials();
    this.updateStats();
    this.buildCar();

    this.scene.add(this.group);
  }

  setupSharedMaterials() {
    // Generate soft contact shadow texture under the car chassis
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(64, 128, 20, 64, 128, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    this.materials = {
      shadow: new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        metalness: 0.98,
        roughness: 0.08
      }),
      darkChrome: new THREE.MeshStandardMaterial({
        color: 0x3a3a40,
        metalness: 0.92,
        roughness: 0.2
      }),
      carbon: new THREE.MeshStandardMaterial({
        color: 0x1a1a1c,
        roughness: 0.35,
        metalness: 0.6
      }),
      blackTrim: new THREE.MeshStandardMaterial({
        color: 0x121214,
        roughness: 0.5,
        metalness: 0.3
      }),
      glossBlack: new THREE.MeshPhysicalMaterial({
        color: 0x0a0a0c,
        roughness: 0.1,
        metalness: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05
      }),
      carGlass: new THREE.MeshPhysicalMaterial({
        color: 0x08101a,
        roughness: 0.05,
        transmission: 0.75,
        thickness: 0.4,
        transparent: true,
        opacity: 0.88,
        clearcoat: 1.0
      }),
      tireRubber: new THREE.MeshStandardMaterial({
        color: 0x1a1a1c,
        roughness: 0.85,
        metalness: 0.1
      }),
      brakeDisc: new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.92,
        roughness: 0.25
      }),
      amgCaliper: new THREE.MeshStandardMaterial({
        color: 0xdd1100, // AMG Red
        roughness: 0.25,
        metalness: 0.7
      }),
      bmwCaliper: new THREE.MeshStandardMaterial({
        color: 0x0088ff, // BMW Electric Blue
        roughness: 0.25,
        metalness: 0.7
      }),
      headlightGlass: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.1,
        transmission: 0.9,
        transparent: true,
        opacity: 0.6
      }),
      drlLed: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      bmwBlueLed: new THREE.MeshBasicMaterial({ color: 0x00c8ff }),
      taillightGlass: new THREE.MeshPhysicalMaterial({
        color: 0x880005,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85
      }),
      interiorLeather: new THREE.MeshStandardMaterial({
        color: 0x18181a,
        roughness: 0.7
      }),
      interiorScreen: new THREE.MeshBasicMaterial({ color: 0x0077cc })
    };
  }

  updateStats() {
    if (this.carType === 'bmw' || this.carType === 'bmw_i3' || this.carType === 'bmw_m5') {
      this.maxSpeed = 30000000;
      this.accelRate = 6400;
      this.brakeRate = 10800;
      this.turnSpeed = 2.45;
      this.handlingGrip = 0.94;
      this.name = "BMW M5 G90 V8 M-Hybrid (927 HP)";
    } else if (this.carType === 'tesla') {
      this.maxSpeed = 35000000;
      this.accelRate = 7400;
      this.brakeRate = 11500;
      this.turnSpeed = 2.65;
      this.handlingGrip = 0.96;
      this.name = "Tesla Model S Plaid Tri-Motor AWD (1,020 HP)";
    } else if (this.carType === 'gentra') {
      this.maxSpeed = 16000000;
      this.accelRate = 4900;
      this.brakeRate = 9600;
      this.turnSpeed = 2.25;
      this.handlingGrip = 0.90;
      this.name = "Chevrolet Lacetti Gentra 1.5 DOHC Tuning (Stage 2)";
    } else {
      this.maxSpeed = 20000000;
      this.accelRate = 5000;
      this.brakeRate = 10700;
      this.turnSpeed = 2.05;
      this.handlingGrip = 0.88;
      this.name = "Mercedes-Benz AMG V8 Taxi (Warp 20M)";
    }
  }

  setCarType(newType) {
    if (this.carType === newType) return;
    this.carType = newType;
    this.updateStats();

    // Clear old 3D elements
    while (this.bodyMeshGroup.children.length > 0) {
      this.bodyMeshGroup.remove(this.bodyMeshGroup.children[0]);
    }
    this.wheels = [];
    this.frontWheels = [];
    this.brakeDiscs = [];
    this.headlightSpots = [];
    this.taillightMeshes = [];

    if (newType === 'tesla') {
      this.paintColor = 0xaa0e1c; // Tesla Ultra Red
    } else if (newType === 'gentra') {
      this.paintColor = 0x09090b; // Gentra Bunker Black
    } else if (newType === 'bmw' || newType === 'bmw_i3' || newType === 'bmw_m5') {
      this.paintColor = 0x1f2024; // BMW Deep Matte Black
    } else {
      this.paintColor = 0x18181c; // AMG Obsidian Black
    }

    this.buildCar();
    audioEngine.setCarType(newType);
  }

  setPaintColor(hex) {
    this.paintColor = hex;
    this.bodyMeshGroup.traverse(child => {
      if (child.isMesh && child.name === 'painted_part') {
        child.material.color.setHex(hex);
      }
    });
  }

  buildCar() {
    // Dynamic automotive clearcoat paint material
    this.paintMat = new THREE.MeshPhysicalMaterial({
      color: this.paintColor,
      roughness: 0.15,
      metalness: 0.82,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      name: 'painted_part'
    });

    // 1. Soft contact shadow on the road under the car
    this.buildContactShadow();

    // 2. Build distinctive model
    if (this.carType === 'bmw' || this.carType === 'bmw_i3' || this.carType === 'bmw_m5') {
      this.buildBMWM5Realistic();
    } else if (this.carType === 'tesla') {
      this.buildTeslaRealistic();
    } else if (this.carType === 'gentra') {
      this.buildGentraRealistic();
    } else {
      this.buildMercedesAMGRealistic();
    }

    // 3. Wheels with multi-spoke rims & disc brakes
    this.buildRealisticWheels();

    // 4. Projector Headlights
    this.buildHeadlights();

    // 5. Particles
    this.setupParticleSystem();
  }

  buildContactShadow() {
    const isBMW = (this.carType === 'bmw' || this.carType === 'bmw_i3' || this.carType === 'bmw_m5');
    const shadowLength = isBMW ? 5.3 : 5.4;
    const shadowWidth = isBMW ? 2.5 : 2.6;
    const shadowGeo = new THREE.PlaneGeometry(shadowWidth, shadowLength);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadow = new THREE.Mesh(shadowGeo, this.materials.shadow);
    shadow.position.set(0, 0.02, 0);
    this.bodyMeshGroup.add(shadow);
  }

  // =========================================================================
  // REALISTIC MERCEDES-BENZ AMG (V8 Biturbo Sport Sedan / Coupe)
  // =========================================================================
  buildMercedesAMGRealistic() {
    const length = 4.95;
    const width = 2.02;
    const height = 1.38;

    // --- Lower Chassis & Body Shell ---
    const lowerBodyGeo = new THREE.BoxGeometry(width, 0.45, length);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, this.paintMat);
    lowerBody.name = 'painted_part';
    lowerBody.position.set(0, 0.42, 0);
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.bodyMeshGroup.add(lowerBody);

    // --- Flared Front & Rear Wheel Arches (AMG Widebody Stance) ---
    [-1, 1].forEach(side => {
      // Front flared arch
      const fArch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 1.15), this.paintMat);
      fArch.name = 'painted_part';
      fArch.position.set((width / 2 + 0.05) * side, 0.45, 1.55);
      this.bodyMeshGroup.add(fArch);

      // Rear flared arch
      const rArch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 1.2), this.paintMat);
      rArch.name = 'painted_part';
      rArch.position.set((width / 2 + 0.06) * side, 0.45, -1.55);
      this.bodyMeshGroup.add(rArch);

      // Sculpted Side Skirt with Carbon Aero Winglet
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 2.1), this.materials.carbon);
      skirt.position.set((width / 2 + 0.03) * side, 0.22, 0);
      this.bodyMeshGroup.add(skirt);
    });

    // --- Muscular Hood with Twin AMG Powerdomes ---
    const hoodGeo = new THREE.BoxGeometry(width * 0.94, 0.12, 1.85);
    const hood = new THREE.Mesh(hoodGeo, this.paintMat);
    hood.name = 'painted_part';
    hood.position.set(0, 0.74, 1.45);
    hood.rotation.x = -0.09;
    hood.castShadow = true;
    this.bodyMeshGroup.add(hood);

    // Powerdome creases on hood
    [-0.32, 0.32].forEach(x => {
      const crease = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.6), this.paintMat);
      crease.name = 'painted_part';
      crease.position.set(x, 0.81, 1.45);
      crease.rotation.x = -0.09;
      this.bodyMeshGroup.add(crease);
    });

    // --- Front Fascia & Panamericana Grille ---
    // Curved bumper nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.48, 0.45), this.paintMat);
    nose.name = 'painted_part';
    nose.position.set(0, 0.46, 2.45);
    nose.castShadow = true;
    this.bodyMeshGroup.add(nose);

    // Deep recessed Panamericana radiator grille frame
    const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.42, 0.08), this.materials.chrome);
    grilleFrame.position.set(0, 0.54, 2.66);
    this.bodyMeshGroup.add(grilleFrame);

    const grilleBack = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.38, 0.06), this.materials.glossBlack);
    grilleBack.position.set(0, 0.54, 2.67);
    this.bodyMeshGroup.add(grilleBack);

    // 14 Vertical Chrome Panamericana Slats (AMG signature)
    for (let i = -6; i <= 6; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.36, 0.06), this.materials.chrome);
      slat.position.set(i * 0.092, 0.54, 2.7);
      this.bodyMeshGroup.add(slat);
    }

    // 3D Three-Pointed Mercedes-Benz Star Emblem in center
    const starRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.024, 8, 24), this.materials.chrome);
    starRing.position.set(0, 0.54, 2.73);
    this.bodyMeshGroup.add(starRing);

    for (let s = 0; s < 3; s++) {
      const angle = (s * Math.PI * 2) / 3 - Math.PI / 2;
      const starRay = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 6), this.materials.chrome);
      starRay.position.set(Math.cos(angle) * 0.06, 0.54 + Math.sin(angle) * 0.06, 2.73);
      starRay.rotation.z = angle - Math.PI / 2;
      this.bodyMeshGroup.add(starRay);
    }

    // Massive Lower Front Air Intakes (Left, Right, Center)
    [-0.78, 0.78].forEach(x => {
      const inlet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.12), this.materials.glossBlack);
      inlet.position.set(x, 0.36, 2.64);
      this.bodyMeshGroup.add(inlet);

      // Carbon aero flick / winglet
      const flick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.16), this.materials.carbon);
      flick.position.set((Math.abs(x) + 0.18) * (x > 0 ? 1 : -1), 0.36, 2.65);
      flick.rotation.y = (x > 0 ? -0.2 : 0.2);
      this.bodyMeshGroup.add(flick);
    });

    // Front Carbon Fiber Splitter
    const fSplitter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.06, 0.3), this.materials.carbon);
    fSplitter.position.set(0, 0.2, 2.62);
    this.bodyMeshGroup.add(fSplitter);

    // Multibeam LED Headlight Assemblies
    [-0.78, 0.78].forEach(x => {
      const hlGroup = new THREE.Group();
      hlGroup.position.set(x, 0.58, 2.58);
      hlGroup.rotation.y = x > 0 ? -0.16 : 0.16;

      // Dark chrome housing
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.08), this.materials.darkChrome);
      hlGroup.add(housing);

      // Eyebrow LED DRL strip
      const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.02), this.materials.drlLed);
      eyebrow.position.set(0, 0.065, 0.045);
      hlGroup.add(eyebrow);

      // Dual Projector Lenses
      [-0.09, 0.09].forEach(px => {
        const proj = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), this.materials.drlLed);
        proj.position.set(px, -0.01, 0.04);
        hlGroup.add(proj);
      });

      // Outer Clear Polycarbonate Lens
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.17, 0.02), this.materials.headlightGlass);
      lens.position.z = 0.055;
      hlGroup.add(lens);

      this.bodyMeshGroup.add(hlGroup);
    });

    // --- Sleek Aerodynamic Greenhouse (Roof, Glass, Pillars) ---
    // Slanted Front Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.62, 0.06), this.materials.carGlass);
    windshield.position.set(0, 1.05, 0.72);
    windshield.rotation.x = -0.58; // Sleek 33-degree aerodynamic rake
    this.bodyMeshGroup.add(windshield);

    // Roof Panel
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.08, 1.9), this.paintMat);
    roof.name = 'painted_part';
    roof.position.set(0, 1.34, -0.22);
    roof.castShadow = true;
    this.bodyMeshGroup.add(roof);

    // Slanted Rear Window (Fastback rake)
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.68, 0.06), this.materials.carGlass);
    rearWindow.position.set(0, 1.04, -1.35);
    rearWindow.rotation.x = 0.62;
    this.bodyMeshGroup.add(rearWindow);

    // Side Windows with Chrome Trim
    [-1, 1].forEach(side => {
      const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 1.95), this.materials.carGlass);
      sideGlass.position.set((width * 0.43) * side, 1.06, -0.25);
      this.bodyMeshGroup.add(sideGlass);

      // Chrome Window Surround Frame
      const trimTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 1.98), this.materials.chrome);
      trimTop.position.set((width * 0.435) * side, 1.28, -0.25);
      this.bodyMeshGroup.add(trimTop);

      const trimBottom = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 2.1), this.materials.chrome);
      trimBottom.position.set((width * 0.44) * side, 0.85, -0.2);
      this.bodyMeshGroup.add(trimBottom);

      // Realistic Aerodynamic Side Mirrors
      const mirror = new THREE.Group();
      mirror.position.set((width / 2 + 0.12) * side, 0.88, 0.65);

      const mirrorBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.12), this.paintMat);
      mirrorBody.name = 'painted_part';
      mirror.add(mirrorBody);

      // Glass surface
      const mirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.11), this.materials.chrome);
      mirrorFace.position.set(0, 0, -0.065);
      mirrorFace.rotation.y = Math.PI;
      mirror.add(mirrorFace);

      // LED turn signal indicator strip
      const mirrorLed = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.02), this.materials.drlLed);
      mirrorLed.position.set(0, 0, 0.065);
      mirror.add(mirrorLed);

      this.bodyMeshGroup.add(mirror);

      // Recessed Door Handles
      [-0.15, -0.95].forEach(z => {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.18), this.materials.chrome);
        handle.position.set((width / 2 + 0.025) * side, 0.72, z);
        this.bodyMeshGroup.add(handle);
      });
    });

    // --- Visible Interior Details (Visible through windshield) ---
    // Dashboard
    const dash = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.28, 0.45), this.materials.interiorLeather);
    dash.position.set(0, 0.82, 0.45);
    this.bodyMeshGroup.add(dash);

    // Digital Dual Widescreen Display
    const dashScreen = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.02), this.materials.interiorScreen);
    dashScreen.position.set(-0.15, 0.98, 0.42);
    dashScreen.rotation.x = -0.15;
    this.bodyMeshGroup.add(dashScreen);

    // AMG Sport Flat-Bottom Steering Wheel
    const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.024, 8, 16), this.materials.interiorLeather);
    wheelRing.position.set(-0.42, 0.92, 0.25);
    wheelRing.rotation.x = 0.35;
    this.bodyMeshGroup.add(wheelRing);

    // Twin Front AMG Sport Bucket Seats
    [-0.42, 0.42].forEach(x => {
      const seatBottom = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.52), this.materials.interiorLeather);
      seatBottom.position.set(x, 0.48, -0.15);
      this.bodyMeshGroup.add(seatBottom);

      const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.55, 0.12), this.materials.interiorLeather);
      seatBack.position.set(x, 0.78, -0.42);
      seatBack.rotation.x = 0.18;
      this.bodyMeshGroup.add(seatBack);

      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), this.materials.interiorLeather);
      headrest.position.set(x, 1.1, -0.48);
      this.bodyMeshGroup.add(headrest);
    });

    // --- Rear End & Diffuser & Quad AMG Exhausts ---
    // Trunk lid
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.14, 0.95), this.paintMat);
    trunk.name = 'painted_part';
    trunk.position.set(0, 0.78, -1.95);
    trunk.castShadow = true;
    this.bodyMeshGroup.add(trunk);

    // Integrated Carbon Ducktail Spoiler Lip
    const ducktail = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.06, 0.18), this.materials.carbon);
    ducktail.position.set(0, 0.86, -2.44);
    ducktail.rotation.x = -0.18; // upward kick
    this.bodyMeshGroup.add(ducktail);

    // Rear Bumper
    const rBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.46, 0.35), this.paintMat);
    rBumper.name = 'painted_part';
    rBumper.position.set(0, 0.48, -2.42);
    this.bodyMeshGroup.add(rBumper);

    // Aggressive Rear Carbon Diffuser with 4 Vertical Strakes
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.18, 0.25), this.materials.carbon);
    diffuser.position.set(0, 0.25, -2.45);
    this.bodyMeshGroup.add(diffuser);

    for (let f = -1.5; f <= 1.5; f += 1.0) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.22), this.materials.carbon);
      fin.position.set(f * 0.28, 0.24, -2.46);
      this.bodyMeshGroup.add(fin);
    }

    // Quad Trapezoidal AMG Chrome Exhaust Pipes with dark inner tubes
    [-0.72, -0.58, 0.58, 0.72].forEach(x => {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.16), this.materials.chrome);
      tip.position.set(x, 0.25, -2.52);
      this.bodyMeshGroup.add(tip);

      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.02), this.materials.blackTrim);
      hole.position.set(x, 0.25, -2.605);
      this.bodyMeshGroup.add(hole);
    });

    // Sleek Horizontal Two-Piece LED Taillights
    [-0.74, 0.74].forEach(x => {
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.12, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0xcc0015,
          emissive: 0xff0020,
          emissiveIntensity: 1.4,
          roughness: 0.2
        })
      );
      tail.position.set(x, 0.68, -2.48);
      tail.rotation.y = x > 0 ? 0.08 : -0.08;
      this.bodyMeshGroup.add(tail);
      this.taillightMeshes.push(tail);
    });

    // Authentic Uzbekistan License Plate: "01 | 110 O" (011100)
    this.buildLicensePlate("110 O", -2.59, 0.46, false);
    this.buildLicensePlate("110 O", 2.68, 0.38, true);

    // AMG Roof Taxi Sign (Streamlined Aerodynamic Pod)
    this.buildAerodynamicTaxiSign("TAXI - AMG V8", 0xffbb00, 1.44);
  }

  // =========================================================================
  // =========================================================================
  // REALISTIC BMW M5 (G90) — 4.4L V8 M HYBRID SUPER SEDAN (727 HP)
  // =========================================================================
  buildBMWi3Realistic() {
    this.buildBMWM5Realistic();
  }

  buildBMWM5Realistic() {
    const length = 5.09;
    const width = 1.98;
    const halfW = width / 2;

    // --- 1. Lower Chassis & Widebody Fenders ---
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.45, length * 0.92), this.paintMat);
    lowerBody.name = 'painted_part';
    lowerBody.position.set(0, 0.44, 0.05);
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.bodyMeshGroup.add(lowerBody);

    // Aerodynamic flat underfloor
    const underfloor = new THREE.Mesh(new THREE.BoxGeometry(width * 0.90, 0.04, length * 0.90), this.materials.glossBlack);
    underfloor.position.set(0, 0.22, 0.05);
    this.bodyMeshGroup.add(underfloor);

    // Widebody Flared Front & Rear Wheel Arches
    [-1, 1].forEach(side => {
      const xPos = halfW * side;

      // Front flared arch
      const fFlare = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.46, 1.40), this.paintMat);
      fFlare.name = 'painted_part';
      fFlare.position.set(xPos * 0.95, 0.48, 1.48);
      this.bodyMeshGroup.add(fFlare);

      // Front fender M gill air breather with M5 badge
      const gill = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.26), this.materials.glossBlack);
      gill.position.set(xPos * 1.01, 0.58, 0.88);
      this.bodyMeshGroup.add(gill);

      const gillStripe = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.03, 0.20), this.materials.chrome);
      gillStripe.position.set(xPos * 1.015, 0.58, 0.88);
      this.bodyMeshGroup.add(gillStripe);

      // Rear muscular flared quarter panel
      const rFlare = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 1.50), this.paintMat);
      rFlare.name = 'painted_part';
      rFlare.position.set(xPos * 0.97, 0.49, -1.30);
      this.bodyMeshGroup.add(rFlare);

      // Sculpted door concavity & shoulder line
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.58), this.paintMat);
      door.name = 'painted_part';
      door.position.set(xPos * 0.92, 0.48, 0.08);
      this.bodyMeshGroup.add(door);

      // Aerodynamic gloss black side skirt with rear aero flick
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 2.70), this.materials.glossBlack);
      skirt.position.set(xPos * 0.95, 0.24, 0.08);
      this.bodyMeshGroup.add(skirt);

      const flick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.16), this.materials.carbon);
      flick.position.set(xPos * 1.01, 0.28, -0.65);
      this.bodyMeshGroup.add(flick);

      // M Carbon Aerodynamic "Devil Horn" Double-Stalk Side Mirrors
      const mirror = new THREE.Group();
      mirror.position.set(xPos * 1.02, 0.96, 0.74);

      const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.06), this.materials.glossBlack);
      arm1.position.set(-0.04 * side, -0.04, 0);
      mirror.add(arm1);

      const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.04), this.materials.glossBlack);
      arm2.position.set(-0.02 * side, 0.04, 0.02);
      mirror.add(arm2);

      const mirrorCap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.14), this.materials.carbon);
      mirrorCap.position.set(0.08 * side, 0, 0);
      mirror.add(mirrorCap);

      const mirrorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.09, 0.11), this.materials.chrome);
      mirrorGlass.position.set((0.08 * side) - (0.09 * side), 0, -0.01);
      mirror.add(mirrorGlass);

      this.bodyMeshGroup.add(mirror);
    });

    // --- 2. Muscular Hood with Twin M Powerdomes ---
    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.12, 1.76), this.paintMat);
    hood.name = 'painted_part';
    hood.position.set(0, 0.79, 1.34);
    hood.rotation.x = -0.105;
    hood.castShadow = true;
    this.bodyMeshGroup.add(hood);

    // Twin sculpted powerdomes
    [-0.32, 0.32].forEach(x => {
      const pd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 1.48), this.paintMat);
      pd.name = 'painted_part';
      pd.position.set(x, 0.87, 1.32);
      pd.rotation.x = -0.105;
      this.bodyMeshGroup.add(pd);
    });

    // BMW Roundel Emblem on Hood
    const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24), this.materials.chrome);
    emblem.rotation.x = Math.PI / 2;
    emblem.position.set(0, 0.78, 2.24);
    this.bodyMeshGroup.add(emblem);

    const emblemBlue = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, 0.04), this.materials.bmwBlueLed);
    emblemBlue.position.set(0, 0.78, 2.24);
    this.bodyMeshGroup.add(emblemBlue);

    // --- 3. Front Fascia & Iconic Glow Kidney Grilles ---
    const nose = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.48, 0.55), this.paintMat);
    nose.name = 'painted_part';
    nose.position.set(0, 0.46, 2.30);
    nose.castShadow = true;
    this.bodyMeshGroup.add(nose);

    // Central Trapezoidal Air Intake with Vertical Flics
    const intake = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.28, 0.18), this.materials.glossBlack);
    intake.position.set(0, 0.31, 2.50);
    this.bodyMeshGroup.add(intake);

    [-0.22, 0.22].forEach(x => {
      const flic = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.26, 0.16), this.materials.carbon);
      flic.position.set(x, 0.31, 2.51);
      this.bodyMeshGroup.add(flic);
    });

    // Lower Front Carbon Splitter Lip
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.045, 0.42), this.materials.carbon);
    splitter.position.set(0, 0.17, 2.42);
    this.bodyMeshGroup.add(splitter);

    // Iconic Glow Kidney Grilles (Octagonal gloss black with double horizontal slats & glowing LED ring)
    [-0.27, 0.27].forEach(x => {
      const grilleFace = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.08), this.materials.glossBlack);
      grilleFace.position.set(x, 0.60, 2.53);
      this.bodyMeshGroup.add(grilleFace);

      [-0.07, 0.07].forEach(y => {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.024, 0.06), this.materials.carbon);
        slat.position.set(x, 0.60 + y, 2.56);
        this.bodyMeshGroup.add(slat);
      });

      // Illuminated Iconic Glow Frame
      const glowTop = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.022, 0.025), this.materials.drlLed);
      glowTop.position.set(x, 0.77, 2.565);
      this.bodyMeshGroup.add(glowTop);

      const glowBot = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.022, 0.025), this.materials.drlLed);
      glowBot.position.set(x, 0.43, 2.565);
      this.bodyMeshGroup.add(glowBot);

      const glowL = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.34, 0.025), this.materials.drlLed);
      glowL.position.set(x - 0.20, 0.60, 2.565);
      this.bodyMeshGroup.add(glowL);

      const glowR = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.34, 0.025), this.materials.drlLed);
      glowR.position.set(x + 0.20, 0.60, 2.565);
      this.bodyMeshGroup.add(glowR);
    });

    // M5 Grille Badge
    const m5Badge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.02), this.materials.chrome);
    m5Badge.position.set(-0.24, 0.68, 2.58);
    this.bodyMeshGroup.add(m5Badge);

    // --- 4. Adaptive LED Headlights with Twin Vertical Dagger DRLs ---
    [-0.72, 0.72].forEach(x => {
      const angleY = x > 0 ? -0.24 : 0.24;

      const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.17, 0.18), this.materials.darkChrome);
      hlHousing.position.set(x, 0.66, 2.38);
      hlHousing.rotation.y = angleY;
      this.bodyMeshGroup.add(hlHousing);

      // Twin Vertical Dagger Batons (| |)
      [-0.08, 0.08].forEach(dx => {
        const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.13, 0.03), this.materials.drlLed);
        dagger.position.set(x + (dx * Math.cos(angleY)), 0.66, 2.45 + (dx * Math.sin(angleY)));
        dagger.rotation.y = angleY;
        dagger.rotation.z = x > 0 ? 0.07 : -0.07;
        this.bodyMeshGroup.add(dagger);
      });

      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.03), this.materials.headlightGlass);
      lens.position.set(x, 0.66, 2.46);
      lens.rotation.y = angleY;
      this.bodyMeshGroup.add(lens);
    });

    // --- 5. Aerodynamic Greenhouse & M Carbon Roof ---
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.74, 0.05), this.materials.carGlass);
    windshield.position.set(0, 1.15, 0.62);
    windshield.rotation.x = -0.64;
    this.bodyMeshGroup.add(windshield);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.81, 0.07, 2.05), this.materials.carbon);
    roof.position.set(0, 1.43, -0.36);
    roof.castShadow = true;
    this.bodyMeshGroup.add(roof);

    // Aerodynamic Shark-Fin Antenna
    const antenna = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 4), this.materials.glossBlack);
    antenna.rotation.x = 0.35;
    antenna.position.set(0, 1.49, -1.15);
    this.bodyMeshGroup.add(antenna);

    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.76, 0.05), this.materials.carGlass);
    rearGlass.position.set(0, 1.15, -1.48);
    rearGlass.rotation.x = 0.68;
    this.bodyMeshGroup.add(rearGlass);

    // Side Windows with Hofmeister Kink & "5" Badge
    [-1, 1].forEach(side => {
      const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 2.05), this.materials.carGlass);
      sideGlass.position.set((halfW * 0.83) * side, 1.15, -0.31);
      this.bodyMeshGroup.add(sideGlass);

      const kink = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.22), this.materials.glossBlack);
      kink.position.set((halfW * 0.86) * side, 1.02, -1.36);
      kink.rotation.y = side > 0 ? 0.26 : -0.26;
      this.bodyMeshGroup.add(kink);
    });

    // --- 6. Rear Diffuser, M Lip Spoiler & Quad Exhausts ---
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.48, 0.58), this.paintMat);
    rearBumper.name = 'painted_part';
    rearBumper.position.set(0, 0.47, -2.25);
    rearBumper.castShadow = true;
    this.bodyMeshGroup.add(rearBumper);

    // M Carbon Lip Spoiler on Trunk
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.05, 0.18), this.materials.carbon);
    spoiler.position.set(0, 0.91, -2.36);
    this.bodyMeshGroup.add(spoiler);

    // Slim Horizontal 3D LED Taillights
    [-0.72, 0.72].forEach(x => {
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.07, 0.06),
        new THREE.MeshStandardMaterial({
          color: 0xcc0015,
          emissive: 0xff0020,
          emissiveIntensity: 1.8,
          roughness: 0.2
        })
      );
      tail.position.set(x, 0.73, -2.47);
      tail.rotation.y = x > 0 ? 0.08 : -0.08;
      this.bodyMeshGroup.add(tail);
      this.taillightMeshes.push(tail);
    });

    // Deep Racing Diffuser with 4 Vertical Fins
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.26, 0.42), this.materials.glossBlack);
    diffuser.position.set(0, 0.28, -2.38);
    this.bodyMeshGroup.add(diffuser);

    [-0.30, -0.10, 0.10, 0.30].forEach(x => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.38), this.materials.carbon);
      fin.position.set(x, 0.27, -2.40);
      this.bodyMeshGroup.add(fin);
    });

    // Quad 100mm M Sport Dual Exhaust Pipes
    [-0.58, -0.46, 0.46, 0.58].forEach(x => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.20, 16), this.materials.chrome);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(x, 0.29, -2.48);
      this.bodyMeshGroup.add(tip);

      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.21, 14), this.materials.blackTrim);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(x, 0.29, -2.49);
      this.bodyMeshGroup.add(hole);
    });

    // Authentic Uzbekistan License Plate: "01 | 110 O" (011100)
    this.buildLicensePlate("110 O", -2.51, 0.48, false);
    this.buildLicensePlate("110 O", 2.57, 0.38, true);

    // Aerodynamic Low-Profile Taxi Sign Pod
    this.buildAerodynamicTaxiSign("TAXI · BMW M5 G90", 0x00e5ff, 1.45);
  }

  // =========================================================================
  // REALISTIC TESLA MODEL S PLAID (1,020 HP Electric Tri-Motor Hypersonic)
  // =========================================================================
  buildTeslaRealistic() {
    const length = 4.97;
    const width = 1.98;
    const height = 1.44;

    // --- 1. Streamlined Aerodynamic Fastback Body ---
    const lower = new THREE.Mesh(new THREE.BoxGeometry(width, 0.44, length), this.paintMat);
    lower.name = 'painted_part';
    lower.position.set(0, 0.41, 0);
    lower.castShadow = true;
    lower.receiveShadow = true;
    this.bodyMeshGroup.add(lower);

    // Front aerodynamic electric nose (Grille-less smooth fascia)
    const nose = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.38, 0.55), this.paintMat);
    nose.name = 'painted_part';
    nose.position.set(0, 0.44, length / 2 + 0.18);
    nose.castShadow = true;
    this.bodyMeshGroup.add(nose);

    // Carbon fiber front chin splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.05, 0.48), this.materials.carbon);
    splitter.position.set(0, 0.22, length / 2 + 0.22);
    this.bodyMeshGroup.add(splitter);

    // Low, forward-sloping aerodynamic hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.1, 1.82), this.paintMat);
    hood.name = 'painted_part';
    hood.position.set(0, 0.72, 1.38);
    hood.rotation.x = -0.11;
    hood.castShadow = true;
    this.bodyMeshGroup.add(hood);

    // --- 2. Full Panoramic All-Glass Roof & Fastback Canopy ---
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.58, 2.8), this.materials.glassTinted);
    cabin.position.set(0, 0.98, -0.12);
    this.bodyMeshGroup.add(cabin);

    // Panoramic glass roof stretching smoothly from front to rear
    const glassRoof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.04, 2.76), this.materials.glassTinted);
    glassRoof.position.set(0, 1.28, -0.12);
    this.bodyMeshGroup.add(glassRoof);

    // Minimalist 17" Horizontal Center Screen Interior
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.03), this.materials.interiorScreen);
    screen.position.set(0, 0.88, 0.35);
    this.bodyMeshGroup.add(screen);

    // --- 3. Cyber Matrix LED Headlights & Full-Width DRL Bar ---
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.03, 0.05), new THREE.MeshBasicMaterial({ color: 0xccf2ff }));
    lightBar.position.set(0, 0.65, length / 2 + 0.42);
    this.bodyMeshGroup.add(lightBar);

    [-0.78, 0.78].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.16), this.materials.headlightHousing);
      hl.position.set(x, 0.64, length / 2 + 0.32);
      this.bodyMeshGroup.add(hl);
    });

    // --- 4. Carbon Lip Spoiler & Full-Width Red LED Taillight Bar ---
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.045, 0.06), this.materials.taillightGlow);
    tailBar.position.set(0, 0.76, -length / 2 - 0.02);
    this.bodyMeshGroup.add(tailBar);
    this.taillightMeshes.push(tailBar);

    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.06, 0.24), this.materials.carbon);
    spoiler.position.set(0, 0.81, -length / 2 + 0.05);
    this.bodyMeshGroup.add(spoiler);

    // Rear aerodynamic diffuser
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.22, 0.45), this.materials.carbon);
    diffuser.position.set(0, 0.28, -length / 2 + 0.12);
    this.bodyMeshGroup.add(diffuser);

    // Side aero skirts and flush door handles
    [-1, 1].forEach(side => {
      const x = (width / 2 + 0.02) * side;
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 2.7), this.materials.carbon);
      skirt.position.set(x, 0.22, 0);
      this.bodyMeshGroup.add(skirt);

      // Flush door handles
      [0.4, -0.6].forEach(z => {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.16), this.materials.chrome);
        handle.position.set(x + 0.01 * side, 0.68, z);
        this.bodyMeshGroup.add(handle);
      });
    });

    // Uzbekistan License Plate & Taxi Sign: "01 | 110 O" (011100)
    this.buildLicensePlate("110 O", -length / 2 - 0.03, 0.44, false, true);
    this.buildLicensePlate("110 O", length / 2 + 0.44, 0.34, true, true);
    this.buildAerodynamicTaxiSign("TESLA PLAID 1020HP", 0x00f0ff, 1.34);
  }

  // =========================================================================
  // REALISTIC CHEVROLET LACETTI GENTRA (Tashkent "Bunker" Style Sedan)
  // =========================================================================
  buildGentraRealistic() {
    const length = 4.51;
    const width = 1.74;
    const height = 1.45;

    // --- 1. Authentic Lacetti Gentra 3-Box Sedan Body ---
    const lower = new THREE.Mesh(new THREE.BoxGeometry(width, 0.48, length), this.paintMat);
    lower.name = 'painted_part';
    lower.position.set(0, 0.44, 0);
    lower.castShadow = true;
    lower.receiveShadow = true;
    this.bodyMeshGroup.add(lower);

    // Gentra sloped front hood with twin creases
    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.12, 1.45), this.paintMat);
    hood.name = 'painted_part';
    hood.position.set(0, 0.74, 1.32);
    hood.rotation.x = -0.07;
    hood.castShadow = true;
    this.bodyMeshGroup.add(hood);

    // Trunk lid
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.12, 0.95), this.paintMat);
    trunk.name = 'painted_part';
    trunk.position.set(0, 0.74, -1.65);
    trunk.castShadow = true;
    this.bodyMeshGroup.add(trunk);

    // --- 2. Classic Gentra Sedan Cabin with "Bunker" Tinted Windows ---
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.62, 2.15), this.materials.glassTinted);
    cabin.position.set(0, 1.0, -0.15);
    this.bodyMeshGroup.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.05, 2.15), this.paintMat);
    roof.name = 'painted_part';
    roof.position.set(0, 1.32, -0.15);
    this.bodyMeshGroup.add(roof);

    // Front windshield sunstrip ("BUNKER")
    const sunstrip = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.1, 0.04), this.materials.blackTrim);
    sunstrip.position.set(0, 1.24, 0.92);
    sunstrip.rotation.x = 0.35;
    this.bodyMeshGroup.add(sunstrip);

    // --- 3. Signature Divided Chrome Grille + Chevrolet Gold Bowtie ---
    const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.52, 0.19, 0.06), this.materials.chrome);
    grille.position.set(0, 0.62, length / 2 + 0.02);
    this.bodyMeshGroup.add(grille);

    const bowtie = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 }));
    bowtie.position.set(0, 0.62, length / 2 + 0.04);
    this.bodyMeshGroup.add(bowtie);

    // Lower bumper intake & round fog lamps
    const intake = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.14, 0.06), this.materials.blackTrim);
    intake.position.set(0, 0.34, length / 2 + 0.02);
    this.bodyMeshGroup.add(intake);

    [-width * 0.38, width * 0.38].forEach(x => {
      // Almond-shaped main headlight
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.08), this.materials.headlightHousing);
      hl.position.set(x, 0.68, length / 2 + 0.01);
      this.bodyMeshGroup.add(hl);

      // Round fog lamp
      const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), this.materials.headlightHousing);
      fog.rotation.x = Math.PI / 2;
      fog.position.set(x * 0.92, 0.34, length / 2 + 0.02);
      this.bodyMeshGroup.add(fog);
    });

    // --- 4. Signature Gentra Triangular Taillights ---
    [-width * 0.38, width * 0.38].forEach(x => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.06), this.materials.taillightGlow);
      tl.position.set(x, 0.72, -length / 2 - 0.01);
      this.bodyMeshGroup.add(tl);
      this.taillightMeshes.push(tl);

      const rev = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.07), this.materials.chrome);
      rev.position.set(x * 0.84, 0.72, -length / 2 - 0.015);
      this.bodyMeshGroup.add(rev);
    });

    // Side mirrors & door mouldings
    [-1, 1].forEach(side => {
      const x = (width / 2 + 0.01) * side;
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.12), this.paintMat);
      mirror.name = 'painted_part';
      mirror.position.set(x + 0.08 * side, 0.96, 0.65);
      this.bodyMeshGroup.add(mirror);

      const moulding = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 2.4), this.paintMat);
      moulding.name = 'painted_part';
      moulding.position.set(x, 0.52, -0.05);
      this.bodyMeshGroup.add(moulding);
    });

    // Uzbekistan License Plate & Taxi Sign: "01 | 110 O" (011100)
    this.buildLicensePlate("110 O", -length / 2 - 0.02, 0.48, false);
    this.buildLicensePlate("110 O", length / 2 + 0.03, 0.38, true);
    this.buildAerodynamicTaxiSign("TAXI · GENTRA BUNKER", 0xffb700, 1.36);
  }

  // =========================================================================
  // REALISTIC MULTI-SPOKE WHEELS WITH DRILLED BRAKE DISCS & CALIPERS
  // =========================================================================
  buildRealisticWheels() {
    const isBMW = this.carType === 'bmw' || this.carType === 'bmw_i3' || this.carType === 'bmw_m5';
    const wheelRadius = isBMW ? 0.42 : 0.42;
    const tireWidth = isBMW ? 0.32 : 0.32;
    const rimRadius = wheelRadius * 0.74;

    const zFront = isBMW ? 1.48 : 1.55;
    const zRear = isBMW ? -1.35 : -1.55;
    const xDist = isBMW ? 1.04 : 1.06;

    const wheelConfigs = [
      { pos: [xDist, wheelRadius, zFront], isFront: true, isRight: true },
      { pos: [-xDist, wheelRadius, zFront], isFront: true, isRight: false },
      { pos: [xDist, wheelRadius, zRear], isFront: false, isRight: true },
      { pos: [-xDist, wheelRadius, zRear], isFront: false, isRight: false }
    ];

    wheelConfigs.forEach(cfg => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(...cfg.pos);

      // --- 1. Realistic Rounded Rubber Tire ---
      const tireTorus = new THREE.Mesh(
        new THREE.TorusGeometry(wheelRadius * 0.78, wheelRadius * 0.22, 14, 32),
        this.materials.tireRubber
      );
      tireTorus.rotation.y = Math.PI / 2;
      tireTorus.castShadow = true;
      wheelGroup.add(tireTorus);

      // Tire Tread Grooves
      const tread = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius, wheelRadius, tireWidth * 0.7, 28),
        this.materials.tireRubber
      );
      tread.rotation.z = Math.PI / 2;
      wheelGroup.add(tread);

      // --- 2. Realistic Alloy Rims ---
      const rimBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth + 0.01, 24, 1, true),
        isBMW ? this.materials.glossBlack : this.materials.chrome
      );
      rimBarrel.rotation.z = Math.PI / 2;
      wheelGroup.add(rimBarrel);

      // Center Hub with Lug Bolts
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, tireWidth + 0.02, 16),
        this.materials.darkChrome
      );
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      // Center Cap Emblem (Mercedes Star or BMW Roundel)
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, tireWidth + 0.025, 16),
        isBMW ? this.materials.bmwBlueLed : this.materials.chrome
      );
      cap.rotation.z = Math.PI / 2;
      wheelGroup.add(cap);

      // Multi-spoke pattern: 10-spoke Y-cluster for both M5 and AMG
      const spokeCount = 10;
      for (let s = 0; s < spokeCount; s++) {
        const angle = (s * Math.PI * 2) / spokeCount;
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.026, rimRadius * 0.88, 0.035),
          isBMW ? this.materials.chrome : this.materials.chrome
        );
        spoke.position.set(
          cfg.isRight ? tireWidth / 2 - 0.02 : -tireWidth / 2 + 0.02,
          Math.sin(angle) * (rimRadius * 0.45),
          Math.cos(angle) * (rimRadius * 0.45)
        );
        spoke.rotation.x = angle;
        wheelGroup.add(spoke);
      }

      // --- 3. Drilled Ceramic Brake Rotors & Calipers ---
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(rimRadius * 0.82, rimRadius * 0.82, 0.025, 24),
        this.materials.brakeDisc
      );
      disc.rotation.z = Math.PI / 2;
      disc.position.x = cfg.isRight ? -0.05 : 0.05;
      wheelGroup.add(disc);
      this.brakeDiscs.push(disc);

      // High-Gloss Gold M Carbon Ceramic or AMG Red Brake Caliper
      const caliperMat = isBMW
        ? new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.22, metalness: 0.75 })
        : this.materials.amgCaliper;
      const caliper = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.18, 0.15),
        caliperMat
      );
      caliper.position.set(cfg.isRight ? -0.05 : 0.05, rimRadius * 0.45, 0);
      wheelGroup.add(caliper);

      this.group.add(wheelGroup);
      this.wheels.push(wheelGroup);
      if (cfg.isFront) this.frontWheels.push(wheelGroup);
    });
  }

  // =========================================================================
  // AUTHENTIC UZBEKISTAN LICENSE PLATES ("01 | 777 AMG" / "01 | 003 ECO")
  // =========================================================================
  buildLicensePlate(text = '110 O', z, y, isFront, isEV = false) {
    const plateGroup = new THREE.Group();
    plateGroup.position.set(0, y, z);
    if (!isFront) plateGroup.rotation.y = Math.PI;

    // High-resolution canvas texture for Uzbekistan License Plate
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Background (White or Green EV)
    ctx.fillStyle = isEV ? '#d8f8dc' : '#ffffff';
    ctx.fillRect(0, 0, 512, 128);

    // Frame border
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 506, 122);

    // Left Region Box: "01" (Tashkent)
    ctx.fillStyle = '#111215';
    ctx.font = '900 76px "Inter", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('01', 58, 64);

    // Divider line
    ctx.strokeStyle = '#2b2d33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(110, 8);
    ctx.lineTo(110, 120);
    ctx.stroke();

    // Main License Plate Number: "110 O" (011100)
    ctx.font = '900 84px "Inter", "Helvetica Neue", sans-serif';
    ctx.fillText(text || '110 O', 285, 64);

    // Right Side: Uzbekistan Flag + "UZ"
    ctx.fillStyle = '#1eb1e7';
    ctx.fillRect(442, 22, 54, 14);
    ctx.fillStyle = '#ce1126';
    ctx.fillRect(442, 36, 54, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(442, 39, 54, 14);
    ctx.fillStyle = '#ce1126';
    ctx.fillRect(442, 53, 54, 3);
    ctx.fillStyle = '#1eb53a';
    ctx.fillRect(442, 56, 54, 14);

    // UZ Code
    ctx.fillStyle = '#1eb1e7';
    ctx.font = '800 36px "Inter", sans-serif';
    ctx.fillText('UZ', 469, 96);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const plateBase = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.13),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.25,
        metalness: 0.1
      })
    );
    plateBase.position.z = 0.01;
    plateGroup.add(plateBase);

    // Black plate backing holder
    const holder = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.15, 0.015),
      new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.8 })
    );
    plateGroup.add(holder);

    this.bodyMeshGroup.add(plateGroup);
  }

  // =========================================================================
  // AERODYNAMIC STREAMLINED TAXI ROOF POD
  // =========================================================================
  buildAerodynamicTaxiSign(textLabel, glowColor, yOffset) {
    const signGroup = new THREE.Group();
    signGroup.position.set(0, yOffset, 0);

    // Streamlined aerodynamic teardrop housing
    const pod = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.14, 0.28),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.15,
        metalness: 0.2
      })
    );
    signGroup.add(pod);

    // Black Checkered side decals (Classic Tashkent Taxi checkers)
    [-1, 1].forEach(side => {
      const checker = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.08, 0.26),
        this.materials.blackTrim
      );
      checker.position.set(0.365 * side, 0, 0);
      signGroup.add(checker);
    });

    // Glowing TAXI illuminated LED bar
    const glowBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.09, 0.04),
      new THREE.MeshBasicMaterial({ color: glowColor })
    );
    glowBar.position.set(0, 0, 0.145);
    signGroup.add(glowBar);

    this.bodyMeshGroup.add(signGroup);
  }

  buildHeadlights() {
    const isBMW = this.carType === 'bmw' || this.carType === 'bmw_i3' || this.carType === 'bmw_m5';
    const zOffset = isBMW ? 2.52 : 2.65;
    [-0.75, 0.75].forEach(x => {
      const spotLight = new THREE.SpotLight(0xfff5e6, 3.8, 55, Math.PI / 6, 0.35, 1.2);
      spotLight.position.set(x, 0.65, zOffset);

      const target = new THREE.Object3D();
      target.position.set(x * 0.75, 0.2, zOffset + 28);
      this.group.add(target);
      spotLight.target = target;
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 512;
      spotLight.shadow.mapSize.height = 512;

      this.group.add(spotLight);
      this.headlightSpots.push(spotLight);
    });
  }

  setupParticleSystem() {
    this.smokePool = [];
    const smokeGeo = new THREE.SphereGeometry(0.24, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.6
    });

    for (let i = 0; i < 35; i++) {
      const p = new THREE.Mesh(smokeGeo, smokeMat.clone());
      p.visible = false;
      this.scene.add(p);
      this.smokePool.push({ mesh: p, life: 0, maxLife: 0.7, velocity: new THREE.Vector3() });
    }
  }

  spawnSmokeParticle(pos, isNitro = false) {
    const p = this.smokePool.find(item => !item.mesh.visible);
    if (!p) return;

    p.mesh.visible = true;
    p.life = 0;
    p.maxLife = isNitro ? 0.38 : 0.75;
    p.mesh.position.copy(pos);
    p.mesh.scale.set(1, 1, 1).multiplyScalar(isNitro ? 0.9 : 0.6);

    if (isNitro) {
      p.mesh.material.color.setHex(0x00d8ff); // Glowing cyan nitro blast
      p.mesh.material.opacity = 0.95;
    } else {
      p.mesh.material.color.setHex(0xe2e8f0);
      p.mesh.material.opacity = 0.55;
    }

    p.velocity.set(
      (Math.random() - 0.5) * 1.6,
      Math.random() * 0.9 + 0.3,
      (Math.random() - 0.5) * 1.6
    );
  }

  update(dt, input) {
    const throttle = (input.forward ? 1 : 0) - (input.backward ? 0.75 : 0);
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const handbrake = input.handbrake;
    const nitroPressed = input.nitro && this.nitroFuel > 0 && throttle > 0;

    // Nitro handling
    if (nitroPressed) {
      this.isNitro = true;
      this.nitroFuel = Math.max(0, this.nitroFuel - dt * 12);
      audioEngine.playNitroSound();
    } else {
      this.isNitro = false;
      this.nitroFuel = Math.min(100, this.nitroFuel + dt * 20);
    }

    // Acceleration & Speed (exponential Relativistic Warp curve up to 20,000,000 km/h)
    const currentSpeed = Math.abs(this.speed);
    const boostMultiplier = this.isNitro ? 3.5 : 1.0;
    let warpMultiplier = 1.0;
    if (currentSpeed > 60) {
      warpMultiplier = 1.0 + Math.pow(currentSpeed, 0.72) * 0.45;
    }
    const targetAccel = throttle * this.accelRate * boostMultiplier * warpMultiplier;

    if (throttle !== 0) {
      this.speed += targetAccel * dt;
    } else {
      const friction = handbrake ? 300 : 80;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - friction * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + friction * dt);
    }

    // Handbrake / Hypersonic Braking
    this.isBraking = handbrake || (this.speed > 10 && throttle < 0);
    if (this.isBraking) {
      const warpBrakeForce = this.brakeRate + currentSpeed * 2.8;
      const brakeForce = handbrake ? warpBrakeForce * 1.8 : warpBrakeForce;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - brakeForce * dt);
      if (this.speed < 0) this.speed = Math.min(0, this.speed + brakeForce * dt);
    }

    const currentMaxSpeed = this.isNitro ? this.maxSpeed * 1.2 : this.maxSpeed;
    this.speed = THREE.MathUtils.clamp(this.speed, -300, currentMaxSpeed);

    // Steering - smoothly stabilized at warp speeds
    const speedRatio = Math.min(1.0, currentSpeed / 55);
    const hyperRatio = Math.min(1.0, currentSpeed / 200000);
    const targetSteerAngle = steer * (Math.PI / 6.4) * (1 - speedRatio * 0.35 - hyperRatio * 0.42);
    this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, targetSteerAngle, dt * 11);

    this.isDrifting = (handbrake && currentSpeed > 24) || (Math.abs(this.steeringAngle) > 0.26 && currentSpeed > 58);

    const turnFactor = (this.speed >= 0 ? 1 : -1) * (this.isDrifting ? 1.5 : 1.0);
    if (currentSpeed > 1) {
      const speedTurnFactor = Math.min(1.5, currentSpeed / 46);
      this.rotationY += this.steeringAngle * this.turnSpeed * turnFactor * speedTurnFactor * dt;
    }

    const forward = new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY));
    const speedInMs = (this.speed * 1000) / 3600;

    const driftSlip = this.isDrifting ? (1.0 - this.handlingGrip) : 0.04;
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, forward.x * speedInMs, 1.0 - driftSlip);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, forward.z * speedInMs, 1.0 - driftSlip);

    if (this.flightMode) {
      const ascend = input.ascend || (input.handbrake && !input.descend);
      const descend = input.descend;
      let targetVy = 0;
      if (ascend) targetVy = 32.0;
      else if (descend) targetVy = -22.0;
      else targetVy = Math.sin(performance.now() * 0.0035) * 0.4;

      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y || 0, targetVy, dt * 6.0);
      this.position.y = Math.max(0, this.position.y + this.velocity.y * dt);
    } else {
      this.velocity.y = 0;
      this.position.y = Math.max(0, THREE.MathUtils.lerp(this.position.y, 0, dt * 8.0));
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // Body roll and pitch suspension animation
    const rollSpeedFactor = Math.min(2.0, currentSpeed / 95);
    const rollAngle = -this.steeringAngle * rollSpeedFactor * (this.isDrifting ? 0.14 : 0.06);
    const pitchAngle = (throttle > 0 ? -0.028 : 0) + (this.isBraking ? 0.055 : 0);
    this.bodyMeshGroup.rotation.z = THREE.MathUtils.lerp(this.bodyMeshGroup.rotation.z, rollAngle, dt * 8.5);
    this.bodyMeshGroup.rotation.x = THREE.MathUtils.lerp(this.bodyMeshGroup.rotation.x, pitchAngle, dt * 8.5);

    // Wheel spin & steering
    const wheelRotSpeed = (speedInMs / 0.42) * dt;
    this.wheels.forEach(w => {
      w.children[0].rotation.x = (w.children[0].rotation.x + wheelRotSpeed) % (Math.PI * 2);
      w.children[1].rotation.x = (w.children[1].rotation.x + wheelRotSpeed) % (Math.PI * 2);
    });

    this.frontWheels.forEach(w => {
      w.rotation.y = this.steeringAngle;
    });

    // Taillight brake glow
    this.taillightMeshes.forEach(m => {
      m.material.emissiveIntensity = this.isBraking ? 3.2 : 0.75;
    });

    // Particle emission (smoke & nitro flames)
    const isBMW = this.carType === 'bmw' || this.carType === 'bmw_i3' || this.carType === 'bmw_m5';
    if (this.isDrifting || (this.isBraking && Math.abs(this.speed) > 22)) {
      const zOffset = isBMW ? -1.35 : -1.6;
      [-0.95, 0.95].forEach(x => {
        const tirePos = this.position.clone().add(
          new THREE.Vector3(x, 0.22, zOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY)
        );
        this.spawnSmokeParticle(tirePos, false);
      });
    }

    if (this.isNitro) {
      const exhaustPos = this.position.clone().add(
        new THREE.Vector3(0, 0.28, isBMW ? -2.48 : -2.55).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY)
      );
      this.spawnSmokeParticle(exhaustPos, true);
    }

    this.smokePool.forEach(p => {
      if (p.mesh.visible) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.mesh.visible = false;
        } else {
          p.mesh.position.addScaledVector(p.velocity, dt);
          p.mesh.scale.multiplyScalar(1 + dt * 1.6);
          p.mesh.material.opacity *= Math.max(0, 1 - dt * 2.6);
        }
      }
    });

    // Audio Engine update
    audioEngine.updateEngine(this.speed, this.maxSpeed, throttle > 0, this.isBraking);
    audioEngine.updateTireScreech(this.isDrifting, this.speed);
  }

  toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
    this.headlightSpots.forEach(light => {
      light.visible = this.headlightsOn;
    });
    return this.headlightsOn;
  }

  toggleFlightMode() {
    this.flightMode = !this.flightMode;
    if (this.flightMode) {
      if (this.position.y < 3) this.position.y = 7.0;
      audioEngine.playNitroSound();
    }
    return this.flightMode;
  }

  resetPosition(x = 0, z = 0, rotY = 0) {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.rotationY = rotY;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;
    this.bodyMeshGroup.rotation.set(0, 0, 0);
  }
}
