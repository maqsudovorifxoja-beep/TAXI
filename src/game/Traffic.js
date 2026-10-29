import * as THREE from 'three';
import { audioEngine } from './AudioEngine.js';

export class TrafficManager {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.trafficCars = [];
    this.carCount = 28; // Active traffic cars in Tashkent
    this.trafficGroup = new THREE.Group();

    // Material caches
    this.carMaterials = {
      white: new THREE.MeshStandardMaterial({ color: 0xf0f0f4, roughness: 0.25, metalness: 0.6 }),
      blackGentra: new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.14, metalness: 0.85, clearcoat: 0.95 }), // Bunker Gentra
      whiteGentra: new THREE.MeshStandardMaterial({ color: 0xf5f6f8, roughness: 0.22, metalness: 0.4 }),
      teslaRed: new THREE.MeshPhysicalMaterial({ color: 0xaa0e1c, roughness: 0.15, metalness: 0.82, clearcoat: 1.0 }),
      teslaSilver: new THREE.MeshStandardMaterial({ color: 0x3d414a, roughness: 0.22, metalness: 0.88 }),
      teslaWhite: new THREE.MeshPhysicalMaterial({ color: 0xf8f9fa, roughness: 0.2, metalness: 0.35, clearcoat: 1.0 }),
      damasWhite: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 }),
      silver: new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 }),
      glassTinted: new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.92 }),
      glassPanoramic: new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.95 }),
      headlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      headlightCyan: new THREE.MeshBasicMaterial({ color: 0xccf2ff }), // Tesla Cyber LED
      taillight: new THREE.MeshBasicMaterial({ color: 0xff2222 }),
      wheelRubber: new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.9 }),
      rimAlloy: new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.25 }),
      rimAeroBlack: new THREE.MeshStandardMaterial({ color: 0x111113, metalness: 0.9, roughness: 0.18 }),
      redBrake: new THREE.MeshBasicMaterial({ color: 0xcc1111 }),
      chromeTrim: new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.95, roughness: 0.12 }),
      goldEmblem: new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.3 })
    };

    this.initTraffic();
    this.scene.add(this.trafficGroup);
  }

  initTraffic() {
    const lanes = this.city.trafficLanes;
    if (!lanes || lanes.length === 0) return;

    // Rich vehicle assortment in Tashkent traffic
    const models = ['gentra', 'tesla', 'cobalt', 'gentra', 'damas', 'tesla', 'nexia', 'gentra'];

    for (let i = 0; i < this.carCount; i++) {
      const lane = lanes[i % lanes.length];
      const modelType = models[i % models.length];
      const trafficCar = this.createTrafficCar(modelType);

      // Distribute along lane
      const offsetIdx = i % lane.laneOffsets.length;
      const offsetDist = lane.laneOffsets[offsetIdx];
      const t = (i / this.carCount) * (lane.length * 0.8) - (lane.length * 0.4);

      // Lane direction: positive or negative based on side of road
      const direction = offsetDist > 0 ? 1 : -1;
      const speed = (modelType === 'tesla' ? 18 : (modelType === 'gentra' ? 15 : 12)) + Math.random() * 6;

      if (lane.rot === 0) {
        trafficCar.group.position.set(lane.x + offsetDist, 0, lane.z + t);
        trafficCar.group.rotation.y = direction > 0 ? 0 : Math.PI;
      } else {
        trafficCar.group.position.set(lane.x + t, 0, lane.z + offsetDist);
        trafficCar.group.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      trafficCar.speed = speed;
      trafficCar.lane = lane;
      trafficCar.offsetDist = offsetDist;
      trafficCar.direction = direction;
      trafficCar.modelType = modelType;

      this.trafficCars.push(trafficCar);
      this.trafficGroup.add(trafficCar.group);
    }
  }

  createTrafficCar(type) {
    const group = new THREE.Group();

    if (type === 'tesla') {
      return this.createTeslaTrafficCar(group);
    } else if (type === 'gentra') {
      return this.createGentraTrafficCar(group);
    }

    // Default traffic cars (Cobalt, Nexia, Damas)
    let bodyMat = this.carMaterials.white;
    if (type === 'nexia') bodyMat = Math.random() > 0.5 ? this.carMaterials.white : this.carMaterials.silver;

    let bodyLength = 4.2;
    let bodyWidth = 1.8;
    let bodyHeight = 0.6;
    let cabinHeight = 0.6;

    if (type === 'damas') {
      bodyLength = 3.3;
      bodyWidth = 1.45;
      bodyHeight = 0.8;
      cabinHeight = 0.8;
      bodyMat = this.carMaterials.damasWhite;
    }

    // Lower Chassis
    const lower = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength), bodyMat);
    lower.position.y = bodyHeight / 2 + 0.2;
    group.add(lower);

    // Cabin Greenhouse
    const cabinLength = type === 'damas' ? 2.6 : 2.2;
    const cabinWidth = bodyWidth * 0.92;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength), this.carMaterials.glassTinted);
    cabin.position.set(0, bodyHeight + cabinHeight / 2 + 0.15, type === 'damas' ? 0.1 : -0.2);
    group.add(cabin);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(cabinWidth, 0.06, cabinLength), bodyMat);
    roof.position.set(0, bodyHeight + cabinHeight + 0.18, type === 'damas' ? 0.1 : -0.2);
    group.add(roof);

    // Headlights
    [-bodyWidth * 0.38, bodyWidth * 0.38].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.05), this.carMaterials.headlight);
      hl.position.set(x, bodyHeight * 0.8, bodyLength / 2 + 0.02);
      group.add(hl);
    });

    // Taillights
    [-bodyWidth * 0.38, bodyWidth * 0.38].forEach(x => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.05), this.carMaterials.taillight);
      tl.position.set(x, bodyHeight * 0.8, -bodyLength / 2 - 0.02);
      group.add(tl);
    });

    // Wheels
    const wheelRadius = 0.32;
    const zOffset = bodyLength * 0.32;
    const xOffset = bodyWidth * 0.52;
    [
      [xOffset, zOffset],
      [-xOffset, zOffset],
      [xOffset, -zOffset],
      [-xOffset, -zOffset]
    ].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.2, 12), this.carMaterials.wheelRubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wheelRadius, wz);
      group.add(wheel);
    });

    return { group, radius: 2.2, lastHonk: 0 };
  }

  createTeslaTrafficCar(group) {
    const colors = [this.carMaterials.teslaRed, this.carMaterials.teslaSilver, this.carMaterials.blackGentra, this.carMaterials.teslaWhite];
    const bodyMat = colors[Math.floor(Math.random() * colors.length)];

    const length = 4.85;
    const width = 1.95;
    const height = 0.52;
    const cabinH = 0.56;

    // 1. Sleek Aerodynamic Lower Body with front electric nose
    const lower = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), bodyMat);
    lower.position.y = height / 2 + 0.18;
    group.add(lower);

    // Front aerodynamic tapered nose cone
    const nose = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, height * 0.72, 0.6), bodyMat);
    nose.position.set(0, height * 0.42 + 0.18, length / 2 + 0.25);
    group.add(nose);

    // Front black aerodynamic chin splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.06, 0.45), this.carMaterials.rimAeroBlack);
    splitter.position.set(0, 0.2, length / 2 + 0.3);
    group.add(splitter);

    // 2. Full-Length Panoramic Glass Roof & Fastback Greenhouse
    const cabinL = 2.75;
    const cabinW = width * 0.88;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinW, cabinH, cabinL), this.carMaterials.glassPanoramic);
    cabin.position.set(0, height + cabinH / 2 + 0.15, -0.15);
    group.add(cabin);

    // Continuous glass panoramic roof panel
    const glassRoof = new THREE.Mesh(new THREE.BoxGeometry(cabinW * 0.94, 0.04, cabinL * 0.96), this.carMaterials.glassPanoramic);
    glassRoof.position.set(0, height + cabinH + 0.16, -0.15);
    group.add(glassRoof);

    // 3. Cyberpunk LED Headlight Bar & Sharp Angular DRLs
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.035, 0.06), this.carMaterials.headlightCyan);
    lightBar.position.set(0, height * 0.85, length / 2 + 0.5);
    group.add(lightBar);

    [-width * 0.4, width * 0.4].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.12), this.carMaterials.headlightCyan);
      hl.position.set(x, height * 0.82, length / 2 + 0.35);
      group.add(hl);
    });

    // 4. Full-Width Rear LED Tail Light Bar & Carbon Lip Spoiler
    const rearLightBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.04, 0.06), this.carMaterials.taillight);
    rearLightBar.position.set(0, height * 0.88, -length / 2 - 0.02);
    group.add(rearLightBar);

    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.05, 0.18), this.carMaterials.rimAeroBlack);
    spoiler.position.set(0, height * 0.94, -length / 2 + 0.04);
    group.add(spoiler);

    // 5. Aero Turbine Wheels with Red Performance Brake Calipers
    const wheelRadius = 0.34;
    const zOffset = length * 0.31;
    const xOffset = width * 0.53;
    [
      [xOffset, zOffset],
      [-xOffset, zOffset],
      [xOffset, -zOffset],
      [-xOffset, -zOffset]
    ].forEach(([wx, wz]) => {
      // Black Aero Rim
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.22, 16), this.carMaterials.rimAeroBlack);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wheelRadius, wz);
      group.add(wheel);

      // Red Brake Caliper
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.16), this.carMaterials.redBrake);
      caliper.position.set(wx * 0.92, wheelRadius + 0.08, wz);
      group.add(caliper);
    });

    return { group, radius: 2.5, lastHonk: 0 };
  }

  createGentraTrafficCar(group) {
    // 75% iconic Bunker Black, 25% Pearl White
    const isBunker = Math.random() < 0.75;
    const bodyMat = isBunker ? this.carMaterials.blackGentra : this.carMaterials.whiteGentra;

    const length = 4.51;
    const width = 1.74;
    const height = 0.58;
    const cabinH = 0.62;

    // 1. Lower Body with Gentra Sedan proportions
    const lower = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), bodyMat);
    lower.position.y = height / 2 + 0.2;
    group.add(lower);

    // Sloped front hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.14, 1.25), bodyMat);
    hood.position.set(0, height * 0.9 + 0.16, length * 0.28);
    hood.rotation.x = -0.06;
    group.add(hood);

    // 2. Sedan Cabin Greenhouse with Black Tinted Windows
    const cabinL = 2.15;
    const cabinW = width * 0.9;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinW, cabinH, cabinL), this.carMaterials.glassTinted);
    cabin.position.set(0, height + cabinH / 2 + 0.16, -0.15);
    group.add(cabin);

    // Roof panel
    const roof = new THREE.Mesh(new THREE.BoxGeometry(cabinW, 0.05, cabinL), bodyMat);
    roof.position.set(0, height + cabinH + 0.18, -0.15);
    group.add(roof);

    // 3. Signature Divided Gentra Front Chrome Grille + Chevrolet Gold Bowtie
    const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.54, 0.18, 0.05), this.carMaterials.chromeTrim);
    grille.position.set(0, height * 0.68, length / 2 + 0.02);
    group.add(grille);

    const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.07), this.carMaterials.goldEmblem);
    emblem.position.set(0, height * 0.68, length / 2 + 0.035);
    group.add(emblem);

    // 4. Gentra Headlights & Round Fog Lamps
    [-width * 0.38, width * 0.38].forEach(x => {
      // Main almond-shaped headlight
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), this.carMaterials.headlight);
      hl.position.set(x, height * 0.78, length / 2 + 0.02);
      group.add(hl);

      // Round fog lamp in bumper pocket
      const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12), this.carMaterials.headlight);
      fog.rotation.x = Math.PI / 2;
      fog.position.set(x * 0.92, height * 0.32, length / 2 + 0.02);
      group.add(fog);
    });

    // 5. Signature Gentra Triangular Taillights
    [-width * 0.38, width * 0.38].forEach(x => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.05), this.carMaterials.taillight);
      tl.position.set(x, height * 0.8, -length / 2 - 0.02);
      group.add(tl);

      // White reverse segment
      const rev = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.06), this.carMaterials.white);
      rev.position.set(x * 0.85, height * 0.8, -length / 2 - 0.025);
      group.add(rev);
    });

    // 6. Wheels (Gentra Multi-Spoke Alloy Rims)
    const wheelRadius = 0.32;
    const zOffset = length * 0.31;
    const xOffset = width * 0.52;
    [
      [xOffset, zOffset],
      [-xOffset, zOffset],
      [xOffset, -zOffset],
      [-xOffset, -zOffset]
    ].forEach(([wx, wz]) => {
      // Rubber Tire
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.2, 14), this.carMaterials.wheelRubber);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, wheelRadius, wz);
      group.add(tire);

      // Alloy Rim Center
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.7, wheelRadius * 0.7, 0.205, 12), this.carMaterials.rimAlloy);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, wheelRadius, wz);
      group.add(rim);
    });

    return { group, radius: 2.3, lastHonk: 0 };
  }

  update(dt, playerCar) {
    const playerPos = playerCar.position;

    this.trafficCars.forEach(car => {
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.group.rotation.y);
      const nextPos = car.group.position.clone().addScaledVector(forward, car.speed * dt);

      // Check distance to player
      const distToPlayer = nextPos.distanceTo(playerPos);
      let targetSpeed = car.speed;

      // Traffic AI collision avoidance with player
      if (distToPlayer < 10) {
        // Player is right in front of traffic car
        const toPlayer = playerPos.clone().sub(car.group.position).normalize();
        const dot = forward.dot(toPlayer);
        if (dot > 0.5) {
          // Slow down or stop to avoid hitting player
          targetSpeed = 0;
          if (Date.now() - car.lastHonk > 4000 && distToPlayer < 6) {
            audioEngine.playHorn();
            car.lastHonk = Date.now();
          }
        }
      }

      // Check physical collision with player
      if (distToPlayer < 3.2) {
        // Impact reaction
        const bumpDir = playerPos.clone().sub(car.group.position).normalize();
        playerCar.position.addScaledVector(bumpDir, 0.5);
        playerCar.speed *= 0.5; // lose speed upon crashing into traffic
      }

      // Move car
      car.group.position.addScaledVector(forward, targetSpeed * dt);

      // Wrap around road bounds
      const halfLane = car.lane.length * 0.48;
      if (car.lane.rot === 0) {
        if (car.group.position.z > car.lane.z + halfLane) {
          car.group.position.z = car.lane.z - halfLane;
        } else if (car.group.position.z < car.lane.z - halfLane) {
          car.group.position.z = car.lane.z + halfLane;
        }
      } else {
        if (car.group.position.x > car.lane.x + halfLane) {
          car.group.position.x = car.lane.x - halfLane;
        } else if (car.group.position.x < car.lane.x - halfLane) {
          car.group.position.x = car.lane.x + halfLane;
        }
      }
    });
  }
}
