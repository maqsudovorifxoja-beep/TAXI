import * as THREE from 'three';
import { Car } from './game/Car.js';
import { City } from './game/City.js';
import { TrafficManager } from './game/Traffic.js';
import { MissionManager } from './game/MissionManager.js';
import { Minimap } from './game/Minimap.js';
import { audioEngine } from './game/AudioEngine.js';
import { Icons } from './game/Icons.js';

class TashkentTaxiGame {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    // Game state
    this.isNight = true; // Start in atmospheric Tashkent night/evening
    this.cameraMode = 0; // 0: Dynamic Chase, 1: Hood, 2: Cockpit, 3: High Aerial Drone
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      handbrake: false,
      nitro: false
    };

    this.selectedCarType = 'bmw'; // Start with BMW M5 G90
    this.selectedPaintColor = 0x18181c; // Deep Matte Carbon / Obsidian

    this.initThree();
    this.initGameWorld();
    this.initInput();
    this.initUI();
    this.animate();
  }

  initThree() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x0a1020, 0.0022);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1800
    );
    this.camera.position.set(0, 5, -10);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // Lighting & Environment reflections
    this.ambientLight = new THREE.AmbientLight(0x445577, 1.4);
    this.scene.add(this.ambientLight);

    // Automotive Environment Map Reflections
    this.setupEnvironmentMap();

    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    this.sunLight.position.set(200, 300, 150);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 700;
    const shadowD = 120;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.scene.add(this.sunLight);

    // Sky stars for Tashkent night
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starCoords = [];
    for (let i = 0; i < starCount; i++) {
      starCoords.push(
        (Math.random() - 0.5) * 1600,
        Math.random() * 400 + 100,
        (Math.random() - 0.5) * 1600
      );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.8 });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    // Resize Handler
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setupEnvironmentMap() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(60, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: this.isNight ? 0x0f1d38 : 0x7ac1eb,
      side: THREE.BackSide
    });
    envScene.add(new THREE.Mesh(skyGeo, skyMat));

    // Horizon warm glow
    const horizGeo = new THREE.CylinderGeometry(58, 58, 25, 24, 1, true);
    const horizMat = new THREE.MeshBasicMaterial({
      color: this.isNight ? 0x334466 : 0xffe0b2,
      side: THREE.BackSide
    });
    envScene.add(new THREE.Mesh(horizGeo, horizMat));

    // Ground reflection
    const gGeo = new THREE.PlaneGeometry(120, 120);
    gGeo.rotateX(-Math.PI / 2);
    const gMat = new THREE.MeshBasicMaterial({ color: 0x111622 });
    const gMesh = new THREE.Mesh(gGeo, gMat);
    gMesh.position.y = -10;
    envScene.add(gMesh);

    const envMap = pmrem.fromScene(envScene).texture;
    this.scene.environment = envMap;
  }

  initGameWorld() {
    // 1. Build Tashkent City
    this.city = new City(this.scene);

    // 2. Build Player Car (Start on Amir Temur Avenue)
    this.playerCar = new Car(this.scene, this.selectedCarType);
    this.playerCar.resetPosition(0, 110, 0);

    // 3. Build Tashkent Traffic AI
    this.trafficManager = new TrafficManager(this.scene, this.city);

    // 4. Mission & Dispatch System
    this.missionManager = new MissionManager(this.scene, this.city);

    // 5. 2D Minimap
    const minimapCanvas = document.getElementById('minimap-canvas');
    this.minimap = new Minimap(minimapCanvas, this.city, this.playerCar, this.missionManager, this.trafficManager);

    // Audio Engine car setup
    audioEngine.setCarType(this.selectedCarType);
  }

  initInput() {
    const handleKey = (e, isDown) => {
      if (!audioEngine.initialized) {
        audioEngine.init();
      }

      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') this.input.forward = isDown;
      if (key === 's' || e.key === 'ArrowDown') this.input.backward = isDown;
      if (key === 'a' || e.key === 'ArrowLeft') this.input.left = isDown;
      if (key === 'd' || e.key === 'ArrowRight') this.input.right = isDown;
      if (e.code === 'Space') this.input.handbrake = isDown;
      if (e.key === 'Shift') this.input.nitro = isDown;
      if (e.code === 'Space' || key === 'e') this.input.ascend = isDown;
      if (e.key === 'Shift' || key === 'q') this.input.descend = isDown;

      if (isDown) {
        if (key === 'h') audioEngine.playHorn();
        if (key === 'c') this.toggleCamera();
        if (key === 'l') this.playerCar.toggleHeadlights();
        if (key === 'y') this.playerCar.toggleFlightMode();
        if (key === 'r') this.playerCar.resetPosition(0, 110, 0);
        if (key === 'g') this.toggleGarageModal(true);
        if (key === 'm') this.toggleLandmarksModal(true);
      }
    };

    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));

    // Touch controls for mobile
    const bindTouch = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!audioEngine.initialized) audioEngine.init();
        this.input[prop] = true;
      });
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.input[prop] = false;
      });
    };

    bindTouch('touch-gas', 'forward');
    bindTouch('touch-brake', 'backward');
    bindTouch('touch-left', 'left');
    bindTouch('touch-right', 'right');
    bindTouch('touch-handbrake', 'handbrake');

    // Any first click triggers Web Audio
    window.addEventListener('click', () => {
      if (!audioEngine.initialized) audioEngine.init();
    }, { once: true });
  }

  initUI() {
    // ── Speedometer Cluster ──
    this.hudSpeed      = document.getElementById('speed-digits');
    this.hudNitroFill  = document.getElementById('fuel-fill');
    this.hudNitroVal   = document.getElementById('fuel-pct');

    this.gearD = document.getElementById('gear-d');
    this.gearR = document.getElementById('gear-r');
    this.gearN = document.getElementById('gear-n');

    // ── Taximeter Panel ──
    this.taximeterHud       = document.getElementById('taximeter-panel');
    this.taximeterFare      = document.getElementById('taximeter-amount');
    this.taximeterKm        = document.getElementById('taximeter-dist');
    this.taximeterPatience  = document.getElementById('taximeter-status');
    this.taximeterTimeEl    = document.getElementById('taximeter-time');

    // ── Dispatch Card ──
    this.orderCard     = document.getElementById('dispatch-card');
    this.orderCountdown= document.getElementById('dispatch-timer-val');
    this.orderName     = document.getElementById('pax-name');
    this.orderNote     = document.getElementById('pax-note');
    this.orderFrom     = document.getElementById('pickup-loc');
    this.orderTo       = document.getElementById('dest-loc');
    this.orderFare     = document.getElementById('dispatch-fare');
    this.orderDist     = document.getElementById('dispatch-km');

    // ── Voice Toast ──
    this.dialogContainer = document.getElementById('passenger-toast');
    this.dialogSpeaker   = document.getElementById('passenger-toast')?.querySelector('.toast-speaker');
    this.dialogText      = document.getElementById('passenger-dialog');

    // ── Status Bar ──
    this.hudBalance    = document.getElementById('total-earned');
    this.hudRidesCount = document.getElementById('missions-done');
    this.hudCarName    = document.getElementById('car-tag');
    this.hudRadioName  = document.getElementById('radio-station-name');

    // ── Live Clock ──
    this._startTime = Date.now();
    this._clockEl = document.getElementById('clock-display');

    // ── Mission Callbacks ──
    this.missionManager.onOrderReceived = (order) => {
      this.orderCard.style.display = 'block';
      this.orderName.textContent  = order.passenger.name;
      this.orderNote.textContent  = `⭐ ${order.passenger.note}`;
      this.orderFrom.textContent  = order.from.name;
      this.orderTo.textContent    = order.to.name;
      this.orderFare.textContent  = `${order.fare.toLocaleString()} so'm`;
      this.orderDist.textContent  = `≈ ${order.distanceKm} km`;
      this.orderCountdown.textContent = `${order.countdown}`;
    };

    this.missionManager.onOrderCountdown = (sec) => {
      if (this.orderCountdown) this.orderCountdown.textContent = sec;
    };

    this.missionManager.onOrderDeclined = () => {
      this.orderCard.style.display = 'none';
    };

    this.missionManager.onPassengerBoarded = (order) => {
      this.showDialog(`Yo'lovchi: ${order.passenger.name}`, order.passenger.pickupGreeting, 5000);
    };

    this.missionManager.onRideCompleted = (result) => {
      const earned = result.newBalance;
      if (this.hudBalance) this.hudBalance.textContent = `${earned.toLocaleString()} so'm`;
      if (this.hudRidesCount) this.hudRidesCount.textContent = this.missionManager.completedRides;
      const tipText = result.tip > 0 ? ` + ${result.tip.toLocaleString()} so'm choychaqa!` : '';
      this.showDialog(
        `Yo'lovchi: ${result.order.passenger.name}`,
        `${result.order.passenger.dropoffThanks} (+${result.totalEarned.toLocaleString()} so'm${tipText})`,
        6500
      );
    };

    // ── Dispatch accept / decline ──
    document.getElementById('btn-accept-mission').onclick = () => {
      this.missionManager.acceptOrder();
      this.orderCard.style.display = 'none';
    };
    document.getElementById('btn-decline-mission').onclick = () => {
      this.missionManager.declineOrder();
      this.orderCard.style.display = 'none';
    };

    // ── Radio ──
    const radioNextFn = () => {
      const nextName = audioEngine.nextRadioStation ? audioEngine.nextRadioStation() : 'Radio Toshkent';
      if (this.hudRadioName) this.hudRadioName.textContent = nextName;
    };
    document.getElementById('radio-toggle').onclick = radioNextFn;
    document.getElementById('radio-next-btn').onclick = (e) => { e.stopPropagation(); radioNextFn(); };

    // ── Nav Buttons ──
    document.getElementById('btn-car-select').onclick   = () => this.toggleModal('modal-car-select', true);
    document.getElementById('btn-city-map').onclick     = () => this.toggleModal('modal-city-map', true);
    document.getElementById('btn-controls').onclick     = () => this.toggleModal('modal-controls', true);
    document.getElementById('btn-camera').onclick       = () => this.toggleCamera();
    document.getElementById('btn-day-night').onclick    = () => this.toggleDayNight();

    // Keyboard shortcuts also open modals
    this._modalKeyMap = { 'c': 'modal-car-select', 'KeyC': 'modal-car-select' };

    // ── Modal close buttons ──
    document.getElementById('close-car-modal').onclick      = () => this.toggleModal('modal-car-select', false);
    document.getElementById('close-map-modal').onclick      = () => this.toggleModal('modal-city-map', false);
    document.getElementById('close-controls-modal').onclick = () => this.toggleModal('modal-controls', false);

    // Close modals by clicking backdrop
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.onclick = (e) => { if (e.target === m) m.classList.remove('active'); };
    });

    // ── Vehicle Cards ──
    const selectVehicle = (type) => {
      this.selectedCarType = type;
      ['bmw', 'amg', 'tesla', 'gentra'].forEach(c => {
        document.getElementById(`card-${c}`)?.classList.toggle('selected', c === type);
      });
    };

    document.getElementById('card-bmw')?.addEventListener('click', () => selectVehicle('bmw'));
    document.getElementById('card-amg')?.addEventListener('click', () => selectVehicle('amg'));
    document.getElementById('card-tesla')?.addEventListener('click', () => selectVehicle('tesla'));
    document.getElementById('card-gentra')?.addEventListener('click', () => selectVehicle('gentra'));

    // ── Color Dots ──
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.onclick = () => {
        const cssColor = dot.dataset.color;
        const hex = parseInt(cssColor.replace('#', ''), 16);
        this.selectedPaintColor = hex;
        this.playerCar.setPaintColor(hex);
      };
    });

    // ── Confirm car button ──
    const btnConfirmCar = document.getElementById('btn-confirm-car');
    if (btnConfirmCar) {
      btnConfirmCar.onclick = () => {
        this.playerCar.setCarType(this.selectedCarType);
        this.playerCar.setPaintColor(this.selectedPaintColor);
        const carLabels = {
          bmw: 'BMW M5 G90 · 4.4L V8 M Hybrid (927 HP)',
          tesla: 'Tesla Model S Plaid · Tri-Motor AWD (1,020 HP)',
          gentra: 'Chevrolet Lacetti Gentra · 1.5 DOHC Tuning (Stage 2)',
          amg: 'Mercedes-AMG · V8 Biturbo'
        };
        const carLabel = carLabels[this.selectedCarType] || this.playerCar.name;
        if (this.hudCarName) this.hudCarName.textContent = carLabel;
        this.toggleModal('modal-car-select', false);
        this.showDialog('Garaj', `${carLabel} tanlandi va sozlandi!`, 3000);
      };
    }

    // ── Landmark teleport buttons ──
    const teleportMap = {
      temur:   { x: 0,    z: 0,    name: 'Amir Temur Maydoni' },
      chorsu:  { x: -150, z: -100, name: 'Chorsu Bozori' },
      tower:   { x: 80,   z: 80,   name: 'TV Minorasi' },
      minor:   { x: -80,  z: 120,  name: 'Minor Masjidi' },
      city:    { x: 200,  z: -150, name: 'Toshkent City' },
      airport: { x: 250,  z: 250,  name: 'Aeroporti' }
    };
    document.querySelectorAll('[data-teleport]').forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.teleport;
        const dest = teleportMap[key];
        if (dest) {
          this.playerCar.resetPosition(dest.x, dest.z + 20, 0);
          this.toggleModal('modal-city-map', false);
          this.showDialog('Toshkent Xaritasi', `${dest.name}ga yetib kelindi!`, 3500);
        }
      };
    });

    // ── Mobile touch controls ──
    const bindTouch = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this.input[prop] = true; });
      el.addEventListener('touchend',   (e) => { e.preventDefault(); this.input[prop] = false; });
    };
    bindTouch('mb-up', 'forward');
    bindTouch('mb-down', 'backward');
    bindTouch('mb-left', 'left');
    bindTouch('mb-right', 'right');
    const hornEl = document.getElementById('mb-horn');
    if (hornEl) hornEl.addEventListener('touchstart', () => audioEngine.playHorn());
    const camEl = document.getElementById('mb-cam');
    if (camEl) camEl.addEventListener('touchstart', () => this.toggleCamera());

    // Any first click triggers Web Audio
    window.addEventListener('click', () => {
      if (!audioEngine.initialized) audioEngine.init();
    }, { once: true });
  }

  toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (show) modal.classList.add('active');
    else modal.classList.remove('active');
  }

  showDialog(speaker, text, durationMs = 4000) {
    const toast = document.getElementById('passenger-toast');
    const textEl = document.getElementById('passenger-dialog');
    const spkEl  = toast?.querySelector('.toast-speaker');
    if (!toast || !textEl) return;
    if (spkEl) spkEl.textContent = speaker;
    textEl.textContent = text;
    toast.style.display = 'flex';
    if (this.dialogTimeout) clearTimeout(this.dialogTimeout);
    this.dialogTimeout = setTimeout(() => { toast.style.display = 'none'; }, durationMs);
  }

  toggleGarageModal(show)    { this.toggleModal('modal-car-select', show); }
  toggleLandmarksModal(show) { this.toggleModal('modal-city-map',   show); }

  toggleCamera() {
    this.cameraMode = (this.cameraMode + 1) % 4;
    const names = ["Dinamik Orqa Kamera", "Kapot / Old Ko'rinish", "Ruldan / Salon Ko'rinishi", "Dron / Yuqoridan GPS"];
    this.showDialog("Kamera Rejimi", names[this.cameraMode], 2000);
  }

  toggleDayNight() {
    this.isNight = !this.isNight;
    const labelEl = document.getElementById('day-night-label');
    if (this.isNight) {
      this.scene.background.setHex(0x060913);
      this.scene.fog.color.setHex(0x0a1020);
      this.ambientLight.color.setHex(0x334466);
      this.ambientLight.intensity = 1.0;
      this.sunLight.color.setHex(0xffaa66);
      this.sunLight.intensity = 0.8;
      this.stars.visible = true;
      if (labelEl) labelEl.textContent = 'Tun';
      this.showDialog('Vaqt Rejimi', 'Kechki Toshkent chiroqlari yoqildi', 2500);
    } else {
      this.scene.background.setHex(0x87ceeb);
      this.scene.fog.color.setHex(0x99ddff);
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 1.6;
      this.sunLight.color.setHex(0xfffae6);
      this.sunLight.intensity = 2.4;
      this.stars.visible = false;
      if (labelEl) labelEl.textContent = 'Kun';
      this.showDialog('Vaqt Rejimi', 'Quyoshli Kunduzgi Toshkent', 2500);
    }
    this.setupEnvironmentMap();
  }

  updateCamera(dt) {
    const carPos = this.playerCar.position;
    const carRot = this.playerCar.rotationY;

    if (this.cameraMode === 0) {
      // 0: Dynamic Smooth Chase Camera
      const dist = 7.6;
      const height = 3.3;
      const speedNorm = Math.min(1.0, Math.abs(this.playerCar.speed) / 30000);
      const speedOffset = THREE.MathUtils.lerp(0, 16.0, speedNorm);
      const heightOffset = THREE.MathUtils.lerp(0, 7.0, speedNorm);

      const targetCamPos = carPos.clone().add(
        new THREE.Vector3(
          -Math.sin(carRot) * (dist + speedOffset),
          height + heightOffset,
          -Math.cos(carRot) * (dist + speedOffset)
        )
      );

      const followSpeed = THREE.MathUtils.lerp(7.5, 30.0, speedNorm);
      this.camera.position.lerp(targetCamPos, dt * followSpeed);
      const lookAtPos = carPos.clone().add(new THREE.Vector3(0, 1.4, 0));
      this.camera.lookAt(lookAtPos);
    } else if (this.cameraMode === 1) {
      // 1: Hood / Bumper View
      const hoodOffset = new THREE.Vector3(0, 1.25, 1.45).applyAxisAngle(new THREE.Vector3(0, 1, 0), carRot);
      this.camera.position.copy(carPos).add(hoodOffset);

      const lookTarget = carPos.clone().add(
        new THREE.Vector3(Math.sin(carRot) * 20, 1.2, Math.cos(carRot) * 20)
      );
      this.camera.lookAt(lookTarget);
    } else if (this.cameraMode === 2) {
      // 2: Driver Cockpit View
      const seatOffset = new THREE.Vector3(-0.42, 1.22, -0.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), carRot);
      this.camera.position.copy(carPos).add(seatOffset);

      const lookTarget = carPos.clone().add(
        new THREE.Vector3(Math.sin(carRot) * 25, 1.15, Math.cos(carRot) * 25)
      );
      this.camera.lookAt(lookTarget);
    } else {
      // 3: High Aerial Drone View (GPS Overview)
      const dronePos = carPos.clone().add(new THREE.Vector3(0, 48, -25));
      this.camera.position.lerp(dronePos, dt * 5);
      this.camera.lookAt(carPos);
    }

    // Shadow follow player
    this.sunLight.position.set(carPos.x + 120, 220, carPos.z + 90);
    this.sunLight.target.position.copy(carPos);
    this.sunLight.target.updateMatrixWorld();
  }

  updateHUD() {
    const speed = Math.round(Math.abs(this.playerCar.speed));
    if (this.hudSpeed) this.hudSpeed.textContent = speed;

    // Speed glow intensity with hyper cosmic plasma glow
    if (this.hudSpeed) {
      const intensity = Math.min(speed / 1000, 1);
      const hyperGlow = Math.min(speed / 30000, 1);
      if (speed > 1000) {
        this.hudSpeed.style.textShadow = `0 0 ${20 + intensity * 40}px #00f5ff, 0 0 ${50 + hyperGlow * 60}px #39ff14, 0 0 ${80 + hyperGlow * 90}px rgba(191,95,255,0.7)`;
      } else {
        this.hudSpeed.style.textShadow = `0 0 ${20 + intensity * 60}px rgba(0,245,255,${0.3 + intensity * 0.7}), 0 0 ${80 + intensity * 80}px rgba(0,245,255,${0.1 + intensity * 0.3})`;
      }
    }

    // Transmission indicator
    if (this.gearR && this.gearD && this.gearN) {
      if (this.playerCar.speed < -1) {
        this.gearR.classList.add('active'); this.gearD.classList.remove('active'); this.gearN.classList.remove('active');
      } else if (speed === 0) {
        this.gearN.classList.add('active'); this.gearD.classList.remove('active'); this.gearR.classList.remove('active');
      } else {
        this.gearD.classList.add('active'); this.gearR.classList.remove('active'); this.gearN.classList.remove('active');
      }
    }

    // Fuel / battery gauge
    if (this.hudNitroFill && this.hudNitroVal) {
      const nitroPct = Math.round(this.playerCar.nitroFuel);
      this.hudNitroFill.style.width = `${nitroPct}%`;
      this.hudNitroVal.textContent = `${nitroPct}%`;
    }

    // Live Taximeter
    if (this.missionManager.state === 'driving_to_destination' && this.missionManager.currentOrder) {
      const liveFare = Math.round(this.missionManager.currentOrder.fare + this.missionManager.rideDistance * 3000);
      if (this.taximeterFare)   this.taximeterFare.textContent  = `${liveFare.toLocaleString()} so'm`;
      if (this.taximeterKm)     this.taximeterKm.textContent    = `${this.missionManager.rideDistance.toFixed(1)} km`;
      if (this.taximeterPatience) this.taximeterPatience.textContent = `${Math.round(this.missionManager.passengerPatience)}%`;
    } else if (this.taximeterFare && this.missionManager.state === 'idle') {
      if (this.taximeterFare)    this.taximeterFare.textContent  = '0 so\'m';
      if (this.taximeterKm)      this.taximeterKm.textContent    = '0.0 km';
      if (this.taximeterPatience) this.taximeterPatience.textContent = 'Bo\'sh';
    }

    // Live game clock (since session start)
    if (this._clockEl) {
      const elapsed = Math.floor((Date.now() - this._startTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      this._clockEl.textContent = `${m}:${s}`;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(0.08, this.clock.getDelta());

    // 1. Update Player Car
    this.playerCar.update(dt, this.input);

    // 2. Collision with city buildings
    const colResult = this.city.checkCollision(this.playerCar.position, 2.0);
    if (colResult.collided) {
      const pushDir = this.playerCar.position.clone().sub(
        new THREE.Vector3(colResult.collider.x, 0, colResult.collider.z)
      ).normalize();

      this.playerCar.position.addScaledVector(pushDir, colResult.overlap + 0.5);
      this.playerCar.speed = Math.max(-120, Math.min(120, this.playerCar.speed * -0.2));
      audioEngine.playHorn();
    }

    // 3. Update Traffic AI
    this.trafficManager.update(dt, this.playerCar);

    // 4. Update Missions & Beacons
    this.missionManager.update(dt, this.playerCar);

    // 5. Update Camera
    this.updateCamera(dt);

    // 6. Update HUD & Minimap
    this.updateHUD();
    this.minimap.update();

    // 7. Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Start Game on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new TashkentTaxiGame();
});
