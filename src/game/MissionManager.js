import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { audioEngine } from './AudioEngine.js';

export class MissionManager {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;

    // Mission states: 'idle', 'offered', 'picking_up', 'driving_to_destination', 'completed'
    this.state = 'idle';
    this.currentOrder = null;
    this.orderTimer = null;

    // Player stats
    this.balance = 85000; // Starting UZS
    this.completedRides = 0;
    this.rating = 5.0;
    this.dailyGoal = 500000; // 500k UZS goal

    // In-ride metrics
    this.rideDistance = 0;
    this.rideTime = 0;
    this.passengerPatience = 100; // 100%
    this.activeFare = 0;

    // 3D Visual Beacons
    this.pickupBeacon = this.createBeacon(0x00ff88);
    this.destinationBeacon = this.createBeacon(0xffbb00);
    this.passengerMesh = this.createPassengerModel();
    this.navArrows = this.createNavArrows();

    this.scene.add(this.pickupBeacon);
    this.scene.add(this.destinationBeacon);
    this.scene.add(this.passengerMesh);
    this.scene.add(this.navArrows);

    this.pickupBeacon.visible = false;
    this.destinationBeacon.visible = false;
    this.passengerMesh.visible = false;
    this.navArrows.visible = false;

    // Pool of authentic Tashkent Taxi passengers and dialogs
    this.passengers = [
      {
        name: "Jasur aka",
        avatar: "🧔‍♂️",
        note: "Iltimos tezroq haydang, vokzalga kechikyapman!",
        pickupGreeting: "Assalomu alaykum uka! Gazini bosing, vaqt kam!",
        dropoffThanks: "Rahmat kattakon uka, omon bo'ling! Choychaqa sizga!"
      },
      {
        name: "Dilnoza opa",
        avatar: "👩‍💼",
        note: "Muzdek konditsioner bo'lsa a'lo bo'lardi.",
        pickupGreeting: "Assalomu alaykum, yaxshimisiz? Tashkent City dagi ofisga shoshyapman.",
        dropoffThanks: "Katta rahmat, juda muloyim haydovchi ekansiz! 5 yulduz!"
      },
      {
        name: "Jonatan (Sayyoh)",
        avatar: "👨‍🦱",
        note: "Hello! Chorsu Market please! Beautiful city Tashkent!",
        pickupGreeting: "Hello brother! Very nice taxi car, let's go!",
        dropoffThanks: "Thank you so much! Tashkent is wonderful!"
      },
      {
        name: "Farrux tadbirkor",
        avatar: "🤵‍♂️",
        note: "Muzika pastroq bo'lsin, telefonda muhim gapim bor.",
        pickupGreeting: "Salom uka, aeroportga shoshilyapman, samolyot 40 minutda uchadi.",
        dropoffThanks: "Baraka toping, o'z vaqtida yetib keldik. Mana xizmatingiz haqi!"
      },
      {
        name: "Shaxzod talaba",
        avatar: "🧑‍🎓",
        note: "Universitet imtihoniga ketyapman, iltimos tezroq!",
        pickupGreeting: "Assalom! Yurak duk-duk qilyapti, imtihonga kech qolsam bo'lmaydi!",
        dropoffThanks: "Rahmat aka! Moshinangiz tez va qulay ekan!"
      },
      {
        name: "Nodira xola",
        avatar: "👵",
        note: "Bozordan sabzavotlar olib ketyapman, asta-sekin haydang.",
        pickupGreeting: "Assalomu alaykum bolam, toliqdim rosa, uyga eltib qo'ygin.",
        dropoffThanks: "Umringdan baraka top bolam, doim yo'ling bexatar bo'lsin!"
      }
    ];

    // Auto-generate first order after 3 seconds
    setTimeout(() => this.generateNewOrder(), 3000);
  }

  createBeacon(colorHex) {
    const group = new THREE.Group();

    // Pulsating ground cylinder ring
    const ringGeo = new THREE.RingGeometry(2.5, 3.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.12;
    group.add(ring);

    // Vertical translucent beacon pillar
    const cylinderGeo = new THREE.CylinderGeometry(2.5, 2.5, 12, 16, 1, true);
    const cylinderMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
    cylinder.position.y = 6;
    group.add(cylinder);

    // Floating diamond beacon marker above
    const diamondGeo = new THREE.OctahedronGeometry(1.6);
    const diamondMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 12;
    group.add(diamond);

    group.ring = ring;
    group.cylinder = cylinder;
    group.diamond = diamond;

    return group;
  }

  createPassengerModel() {
    const pGroup = new THREE.Group();

    // Body clothes
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x224488 })
    );
    body.position.y = 1.0;
    pGroup.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xdeb887 })
    );
    head.position.y = 1.8;
    pGroup.add(head);

    // Waving hand
    const hand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x224488 })
    );
    hand.position.set(0.45, 1.4, 0);
    hand.rotation.z = -Math.PI / 3;
    pGroup.add(hand);
    pGroup.hand = hand;

    return pGroup;
  }

  createNavArrows() {
    // 3D guidance arrows pointing towards target
    const navGroup = new THREE.Group();
    const arrowGeo = new THREE.ConeGeometry(0.8, 2.4, 3);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

    for (let i = 0; i < 5; i++) {
      const arr = new THREE.Mesh(arrowGeo, arrowMat);
      arr.position.set(0, 0.4, i * 8);
      navGroup.add(arr);
    }
    return navGroup;
  }

  generateNewOrder() {
    if (this.state !== 'idle') return;

    // Pick 2 random landmarks
    const lm = this.city.landmarks;
    if (lm.length < 2) return;

    const idx1 = Math.floor(Math.random() * lm.length);
    let idx2 = Math.floor(Math.random() * lm.length);
    while (idx2 === idx1) idx2 = Math.floor(Math.random() * lm.length);

    const pickupLM = lm[idx1];
    const dropoffLM = lm[idx2];
    const passengerData = this.passengers[Math.floor(Math.random() * this.passengers.length)];

    // Distance calculation
    const distanceMeters = pickupLM.pos.distanceTo(dropoffLM.pos);
    const distanceKm = (distanceMeters / 1000).toFixed(1);

    // Fare calculation: Base 14,000 UZS + ~8,000 UZS per km
    const baseFare = 14000;
    const estFare = Math.round((baseFare + distanceMeters * 35) / 1000) * 1000;

    this.currentOrder = {
      passenger: passengerData,
      from: pickupLM,
      to: dropoffLM,
      distanceKm: Math.max(1.2, distanceKm),
      fare: estFare,
      countdown: 18 // seconds to accept
    };

    this.state = 'offered';
    audioEngine.playOrderChime();

    // Trigger UI notification
    if (this.onOrderReceived) this.onOrderReceived(this.currentOrder);

    // Auto-decline if ignored
    this.orderTimer = setInterval(() => {
      if (this.state === 'offered' && this.currentOrder) {
        this.currentOrder.countdown--;
        if (this.onOrderCountdown) this.onOrderCountdown(this.currentOrder.countdown);
        if (this.currentOrder.countdown <= 0) {
          this.declineOrder();
        }
      }
    }, 1000);
  }

  acceptOrder() {
    if (this.state !== 'offered' || !this.currentOrder) return;
    clearInterval(this.orderTimer);

    this.state = 'picking_up';
    this.passengerPatience = 100;
    this.rideTime = 0;
    this.rideDistance = 0;

    // Position pickup beacon and passenger
    const pPos = this.currentOrder.from.pos.clone().add(new THREE.Vector3(12, 0, 8));
    this.pickupBeacon.position.copy(pPos);
    this.pickupBeacon.visible = true;

    this.passengerMesh.position.copy(pPos).add(new THREE.Vector3(2.5, 0, 0));
    this.passengerMesh.visible = true;

    if (this.onOrderAccepted) this.onOrderAccepted(this.currentOrder);
  }

  declineOrder() {
    clearInterval(this.orderTimer);
    this.state = 'idle';
    this.currentOrder = null;
    if (this.onOrderDeclined) this.onOrderDeclined();

    // Schedule next order in 6 seconds
    setTimeout(() => this.generateNewOrder(), 6000);
  }

  update(dt, playerCar) {
    const playerPos = playerCar.position;
    const t = performance.now() * 0.003;

    // Animate beacons
    if (this.pickupBeacon.visible) {
      this.pickupBeacon.diamond.rotation.y += dt * 2.5;
      this.pickupBeacon.diamond.position.y = 12 + Math.sin(t * 3) * 1.2;
    }
    if (this.destinationBeacon.visible) {
      this.destinationBeacon.diamond.rotation.y += dt * 2.5;
      this.destinationBeacon.diamond.position.y = 12 + Math.sin(t * 3) * 1.2;
    }

    // Animate passenger hand wave
    if (this.passengerMesh.visible && this.passengerMesh.hand) {
      this.passengerMesh.hand.rotation.z = -Math.PI / 3 + Math.sin(t * 8) * 0.4;
    }

    // State 1: Picking up passenger
    if (this.state === 'picking_up') {
      const distToPickup = playerPos.distanceTo(this.pickupBeacon.position);

      // Check if player arrived inside beacon circle
      if (distToPickup < 5.5 && Math.abs(playerCar.speed) < 15) {
        // Passenger boards the taxi!
        this.passengerBoards();
      }

      // Update 3D Nav arrows
      this.updateNavArrows(playerPos, this.pickupBeacon.position);
    }

    // State 2: Driving passenger to destination
    if (this.state === 'driving_to_destination') {
      this.rideTime += dt;
      this.rideDistance += (Math.abs(playerCar.speed) * dt) / 3600;

      // Patience decreases slowly over time or if player crashes
      this.passengerPatience = Math.max(10, this.passengerPatience - dt * 1.2);

      const distToDest = playerPos.distanceTo(this.destinationBeacon.position);
      if (distToDest < 6.0 && Math.abs(playerCar.speed) < 15) {
        // Reached destination!
        this.completeRide();
      }

      // Update 3D Nav arrows
      this.updateNavArrows(playerPos, this.destinationBeacon.position);
    }
  }

  updateNavArrows(fromPos, targetPos) {
    this.navArrows.visible = true;
    const dir = targetPos.clone().sub(fromPos).normalize();
    const angle = Math.atan2(dir.x, dir.z);

    this.navArrows.children.forEach((arr, idx) => {
      const offset = (idx + 1) * 7;
      arr.position.set(
        fromPos.x + dir.x * offset,
        0.3,
        fromPos.z + dir.z * offset
      );
      arr.rotation.y = angle;
    });
  }

  passengerBoards() {
    this.state = 'driving_to_destination';
    this.pickupBeacon.visible = false;
    this.passengerMesh.visible = false;

    // Show destination beacon
    const dPos = this.currentOrder.to.pos.clone().add(new THREE.Vector3(10, 0, 8));
    this.destinationBeacon.position.copy(dPos);
    this.destinationBeacon.visible = true;

    audioEngine.playOrderChime();

    if (this.onPassengerBoarded) {
      this.onPassengerBoarded(this.currentOrder);
    }
  }

  completeRide() {
    this.state = 'completed';
    this.destinationBeacon.visible = false;
    this.navArrows.visible = false;

    // Calculate tip bonus (if patience > 70% and fast)
    let tip = 0;
    if (this.passengerPatience > 75) {
      tip = Math.round((this.currentOrder.fare * 0.2) / 1000) * 1000;
    }

    const totalEarned = this.currentOrder.fare + tip;
    this.balance += totalEarned;
    this.completedRides++;

    // Sounds & Confetti!
    audioEngine.playPaymentCash();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    if (this.onRideCompleted) {
      this.onRideCompleted({
        order: this.currentOrder,
        fare: this.currentOrder.fare,
        tip,
        totalEarned,
        patience: Math.round(this.passengerPatience),
        newBalance: this.balance
      });
    }

    // Return to idle and prepare next order
    setTimeout(() => {
      this.state = 'idle';
      this.currentOrder = null;
      this.generateNewOrder();
    }, 4500);
  }
}
