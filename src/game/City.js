import * as THREE from 'three';

export class City {
  constructor(scene) {
    this.scene = scene;
    this.cityGroup = new THREE.Group();
    this.landmarks = [];
    this.colliders = [];
    this.trafficLanes = [];
    this.trafficLights = [];

    // Materials cache
    this.materials = {
      asphalt: new THREE.MeshStandardMaterial({ color: 0x222224, roughness: 0.85 }),
      sidewalk: new THREE.MeshStandardMaterial({ color: 0x88888c, roughness: 0.9 }),
      grass: new THREE.MeshStandardMaterial({ color: 0x2e6633, roughness: 0.95 }),
      roadMarking: new THREE.MeshBasicMaterial({ color: 0xeeeeee }),
      yellowLine: new THREE.MeshBasicMaterial({ color: 0xf5a623 }),
      canalWater: new THREE.MeshStandardMaterial({ color: 0x1b4d5a, roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.85 }),
      whiteMarble: new THREE.MeshStandardMaterial({ color: 0xf5f5f7, roughness: 0.3, metalness: 0.1 }),
      turquoiseTile: new THREE.MeshStandardMaterial({ color: 0x009ea9, roughness: 0.35, metalness: 0.4 }),
      hotelConcrete: new THREE.MeshStandardMaterial({ color: 0xc8c3b9, roughness: 0.75 }),
      glassBlue: new THREE.MeshPhysicalMaterial({ color: 0x1a4060, roughness: 0.1, transmission: 0.8, transparent: true, opacity: 0.75 }),
      glassGold: new THREE.MeshPhysicalMaterial({ color: 0x806020, roughness: 0.15, transmission: 0.7, transparent: true, opacity: 0.8 }),
      steelTower: new THREE.MeshStandardMaterial({ color: 0x9e2020, metalness: 0.8, roughness: 0.3 }),
      beaconWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      beaconRed: new THREE.MeshBasicMaterial({ color: 0xff2222 }),
      treeFoliage: new THREE.MeshStandardMaterial({ color: 0x1e5522, roughness: 0.9 }),
      treeTrunk: new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 }),
      lampGlow: new THREE.MeshBasicMaterial({ color: 0xfff0c0 })
    };

    this.buildCity();
    this.scene.add(this.cityGroup);
  }

  buildCity() {
    this.buildGroundAndRoads();
    this.buildAnhorCanal();
    this.buildTashkentTVTower();
    this.buildHotelUzbekistan();
    this.buildAmirTemurSquare();
    this.buildChorsuBazaar();
    this.buildMinorMosque();
    this.buildTashkentCitySkyscrapers();
    this.buildFriendshipPalace();
    this.buildTashkentAirport();
    this.buildMetroStations();
    this.buildResidentialAndCommercialBlocks();
    this.buildStreetFurniture();
  }

  // ===================== ROADS & GROUND =====================
  buildGroundAndRoads() {
    // City base terrain (massive 20000m x 20000m open plain)
    const groundGeo = new THREE.PlaneGeometry(20000, 20000);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.materials.grass);
    ground.receiveShadow = true;
    this.cityGroup.add(ground);

    // Main Tashkent Avenues Grid
    // Major axes: Amir Temur Shoh Ko'chasi (Z-axis north-south), Navoiy & Bunyodkor Shoh Ko'chasi (X-axis east-west)
    const avenues = [
      // Primary North-South Avenues
      { x: 0, z: 0, length: 20000, width: 32, rot: 0, name: "Amir Temur shox ko'chasi" },
      { x: 260, z: 0, length: 20000, width: 26, rot: 0, name: "Mustaqillik shox ko'chasi" },
      { x: -280, z: 0, length: 20000, width: 26, rot: 0, name: "Bunyodkor shox ko'chasi" },
      { x: -550, z: 0, length: 20000, width: 26, rot: 0, name: "Beruniy shox ko'chasi" },
      { x: 550, z: 0, length: 20000, width: 26, rot: 0, name: "Farg'ona Yo'li" },

      // Primary East-West Avenues
      { x: 0, z: 0, length: 20000, width: 32, rot: Math.PI / 2, name: "Navoiy shox ko'chasi" },
      { x: 0, z: 280, length: 20000, width: 26, rot: Math.PI / 2, name: "Islom Karimov ko'chasi" },
      { x: 0, z: -280, length: 20000, width: 26, rot: Math.PI / 2, name: "Abdulla Qodiriy ko'chasi" },
      { x: 0, z: 560, length: 20000, width: 28, rot: Math.PI / 2, name: "Kichik Halqa Yo'li (Janub)" },
      { x: 0, z: -560, length: 20000, width: 28, rot: Math.PI / 2, name: "Kichik Halqa Yo'li (Shimol)" }
    ];

    avenues.forEach(av => {
      // Asphalt surface
      const roadGeo = new THREE.PlaneGeometry(av.width, av.length);
      roadGeo.rotateX(-Math.PI / 2);
      const road = new THREE.Mesh(roadGeo, this.materials.asphalt);
      road.position.set(av.x, 0.05, av.z);
      road.rotation.y = av.rot;
      road.receiveShadow = true;
      this.cityGroup.add(road);

      // Sidewalks on both sides
      [-1, 1].forEach(side => {
        const swGeo = new THREE.BoxGeometry(3.5, 0.25, av.length);
        const sw = new THREE.Mesh(swGeo, this.materials.sidewalk);
        const perp = (av.width / 2 + 1.75) * side;
        if (av.rot === 0) {
          sw.position.set(av.x + perp, 0.125, av.z);
        } else {
          sw.position.set(av.x, 0.125, av.z + perp);
          sw.rotation.y = av.rot;
        }
        this.cityGroup.add(sw);
      });

      // Road markings (Double yellow line in center + dashed white lane lines)
      const centerLineGeo = new THREE.PlaneGeometry(0.3, av.length);
      centerLineGeo.rotateX(-Math.PI / 2);
      const centerLine = new THREE.Mesh(centerLineGeo, this.materials.yellowLine);
      centerLine.position.set(av.x, 0.06, av.z);
      centerLine.rotation.y = av.rot;
      this.cityGroup.add(centerLine);

      // Store traffic lanes for AI traffic cars
      this.trafficLanes.push({
        x: av.x,
        z: av.z,
        length: av.length,
        width: av.width,
        rot: av.rot,
        laneOffsets: [-5.5, -2, 2, 5.5]
      });
    });

    // Circular Road around Amir Temur Square (Markaz)
    const ringGeo = new THREE.RingGeometry(65, 85, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringRoad = new THREE.Mesh(ringGeo, this.materials.asphalt);
    ringRoad.position.set(0, 0.06, 0);
    this.cityGroup.add(ringRoad);
  }

  // ===================== ANHOR CANAL =====================
  buildAnhorCanal() {
    // Historic Anhor canal flowing through Tashkent
    const canalLength = 1500;
    const canalWidth = 26;

    const waterGeo = new THREE.PlaneGeometry(canalWidth, canalLength);
    waterGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterGeo, this.materials.canalWater);
    water.position.set(-140, -0.6, 0);
    water.rotation.y = 0.12;
    this.cityGroup.add(water);

    // Canal Stone Embankments
    [-1, 1].forEach(side => {
      const wallGeo = new THREE.BoxGeometry(2.5, 1.4, canalLength);
      const wall = new THREE.Mesh(wallGeo, this.materials.sidewalk);
      wall.position.set(-140 + (canalWidth / 2 + 1.25) * side, 0.1, 0);
      wall.rotation.y = 0.12;
      this.cityGroup.add(wall);
    });

    // Arched Road Bridges over the canal at major avenue intersections
    const bridgeZCoords = [-560, -280, 0, 280, 560];
    bridgeZCoords.forEach(bz => {
      const bridgeGroup = new THREE.Group();
      const spanGeo = new THREE.BoxGeometry(32, 1.2, 26);
      const bridgeSpan = new THREE.Mesh(spanGeo, this.materials.asphalt);
      bridgeSpan.position.set(-140, 0.6, bz);
      bridgeGroup.add(bridgeSpan);

      // Bridge railings
      [-1, 1].forEach(railSide => {
        const railGeo = new THREE.BoxGeometry(32, 0.9, 0.4);
        const railing = new THREE.Mesh(railGeo, this.materials.whiteMarble);
        railing.position.set(-140, 1.4, bz + 12.8 * railSide);
        bridgeGroup.add(railing);
      });

      this.cityGroup.add(bridgeGroup);
    });
  }

  // ===================== TASHKENT TV TOWER (TELEMINORA) =====================
  buildTashkentTVTower() {
    // Yunusobod tumani - Coordinates: (120, -520)
    const towerGroup = new THREE.Group();
    towerGroup.position.set(120, 0, -520);

    // Hexagonal Base Pavilion
    const baseGeo = new THREE.CylinderGeometry(24, 28, 8, 6);
    const base = new THREE.Mesh(baseGeo, this.materials.whiteMarble);
    base.position.y = 4;
    base.castShadow = true;
    towerGroup.add(base);

    // Three gigantic steel tripod supporting legs (Tashkent TV tower signature)
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const legGeo = new THREE.CylinderGeometry(1.4, 2.2, 70, 8);
      const leg = new THREE.Mesh(legGeo, this.materials.steelTower);
      leg.position.set(Math.cos(angle) * 14, 32, Math.sin(angle) * 14);
      leg.rotation.z = Math.cos(angle) * 0.18;
      leg.rotation.x = Math.sin(angle) * 0.18;
      towerGroup.add(leg);
    }

    // Main Central Shaft (Spans up to 220m)
    const shaftGeo = new THREE.CylinderGeometry(3.5, 5.0, 160, 16);
    const shaft = new THREE.Mesh(shaftGeo, this.materials.whiteMarble);
    shaft.position.y = 80;
    towerGroup.add(shaft);

    // Observation Deck / Revolving Restaurant Sphere (at 100m height)
    const sphereGeo = new THREE.CylinderGeometry(15, 11, 14, 24);
    const observationDeck = new THREE.Mesh(sphereGeo, this.materials.turquoiseTile);
    observationDeck.position.y = 110;
    towerGroup.add(observationDeck);

    // Observation deck glass panorama ring
    const windowRing = new THREE.Mesh(new THREE.CylinderGeometry(15.2, 14.5, 4, 24), this.materials.glassBlue);
    windowRing.position.y = 110;
    towerGroup.add(windowRing);

    // Upper Broadcast Lattice & Antenna Mast
    const mastGeo = new THREE.CylinderGeometry(0.8, 2.2, 80, 8);
    const mast = new THREE.Mesh(mastGeo, this.materials.steelTower);
    mast.position.y = 190;
    towerGroup.add(mast);

    // Red & White Aviation Flashing Warning Beacons
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(2.0, 12, 12), this.materials.beaconRed);
    beacon.position.y = 232;
    towerGroup.add(beacon);

    // Add Beacon Spotlight
    const beaconLight = new THREE.PointLight(0xff2222, 5, 200);
    beaconLight.position.y = 232;
    towerGroup.add(beaconLight);

    this.cityGroup.add(towerGroup);
    this.landmarks.push({
      id: 'tv_tower',
      name: "Toshkent Teleminorasi",
      district: "Yunusobod",
      pos: new THREE.Vector3(120, 0, -520),
      desc: "375 metrli afsonaviy teleminora"
    });

    this.colliders.push({ x: 120, z: -520, radius: 26 });
  }

  // ===================== HOTEL UZBEKISTAN =====================
  buildHotelUzbekistan() {
    // Opposite Amir Temur Square - Coordinates: (60, 0, 75)
    const hotelGroup = new THREE.Group();
    hotelGroup.position.set(70, 0, 85);
    hotelGroup.rotation.y = -Math.PI / 4;

    // Iconic curved brutalist facade
    const width = 85;
    const height = 48;
    const depth = 22;

    const mainBodyGeo = new THREE.BoxGeometry(width, height, depth);
    const mainBody = new THREE.Mesh(mainBodyGeo, this.materials.hotelConcrete);
    mainBody.position.y = height / 2;
    mainBody.castShadow = true;
    hotelGroup.add(mainBody);

    // Famous geometric oriental latticework (Panjara facade)
    const latticeGeo = new THREE.PlaneGeometry(width * 0.94, height * 0.85);
    const latticeMat = new THREE.MeshStandardMaterial({
      color: 0xdfdad0,
      roughness: 0.5,
      metalness: 0.1
    });
    const lattice = new THREE.Mesh(latticeGeo, latticeMat);
    lattice.position.set(0, height / 2, depth / 2 + 0.2);
    hotelGroup.add(lattice);

    // Hundreds of hotel windows
    for (let row = 1; row <= 8; row++) {
      for (let col = -7; col <= 7; col++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 0.3), this.materials.glassGold);
        win.position.set(col * 5.2, row * 4.8 + 4, depth / 2 + 0.3);
        hotelGroup.add(win);
      }
    }

    // Grand Entrance Pavilion & Uzbekistan Flag
    const lobbyGeo = new THREE.BoxGeometry(45, 6, 18);
    const lobby = new THREE.Mesh(lobbyGeo, this.materials.whiteMarble);
    lobby.position.set(0, 3, depth / 2 + 8);
    hotelGroup.add(lobby);

    // Rooftop Sign: "HOTEL UZBEKISTAN"
    const signGeo = new THREE.BoxGeometry(50, 4.5, 1.5);
    const sign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ color: 0x0088cc }));
    sign.position.set(0, height + 3, 0);
    hotelGroup.add(sign);

    this.cityGroup.add(hotelGroup);
    this.landmarks.push({
      id: 'hotel_uzb',
      name: "Hotel O'zbekiston",
      district: "Markaz",
      pos: new THREE.Vector3(70, 0, 85),
      desc: "Toshkentning eng mashhur mehmonxonasi"
    });

    this.colliders.push({ x: 70, z: 85, radius: 45 });
  }

  // ===================== AMIR TEMUR SQUARE & CHIMES =====================
  buildAmirTemurSquare() {
    // Center circle at (0, 0, 0)
    const squareGroup = new THREE.Group();
    squareGroup.position.set(0, 0, 0);

    // Park Circular Lawn
    const lawnGeo = new THREE.CylinderGeometry(55, 55, 0.4, 48);
    const lawn = new THREE.Mesh(lawnGeo, this.materials.grass);
    lawn.position.y = 0.2;
    squareGroup.add(lawn);

    // Circular Paved Plaza in the center
    const plazaGeo = new THREE.CylinderGeometry(24, 24, 0.5, 36);
    const plaza = new THREE.Mesh(plazaGeo, this.materials.whiteMarble);
    plaza.position.y = 0.25;
    squareGroup.add(plaza);

    // Monumental Pedestal of Amir Temur
    const pedestalGeo = new THREE.BoxGeometry(6, 4.5, 8);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x8a2424, roughness: 0.4 }); // Red granitic stone
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 2.5;
    squareGroup.add(pedestal);

    // Equestrian Statue of Amir Temur (Bronze horse and rider silhouette)
    const horseMat = new THREE.MeshStandardMaterial({ color: 0x2e2318, metalness: 0.85, roughness: 0.3 });
    const horseBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 5.2), horseMat);
    horseBody.position.y = 5.6;
    horseBody.rotation.x = -0.15; // prancing horse
    squareGroup.add(horseBody);

    const horseNeck = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 1.8), horseMat);
    horseNeck.position.set(0, 7.2, 2.0);
    horseNeck.rotation.x = 0.35;
    squareGroup.add(horseNeck);

    const rider = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 1.8), horseMat);
    rider.position.set(0, 7.6, 0.2);
    squareGroup.add(rider);

    // Fountains around Amir Temur
    for (let f = 0; f < 4; f++) {
      const angle = (f * Math.PI) / 2 + Math.PI / 4;
      const fPool = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.8, 16), this.materials.whiteMarble);
      fPool.position.set(Math.cos(angle) * 38, 0.4, Math.sin(angle) * 38);
      squareGroup.add(fPool);

      const fWater = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.7, 16), this.materials.canalWater);
      fWater.position.copy(fPool.position);
      fWater.position.y = 0.55;
      squareGroup.add(fWater);
    }

    // Lush Chinor trees (Tashkent plane trees) around the park ring
    for (let t = 0; t < 16; t++) {
      const angle = (t * Math.PI * 2) / 16;
      this.addTree(squareGroup, Math.cos(angle) * 48, Math.sin(angle) * 48, 1.4);
    }

    // Toshkent Kuranti (Tashkent Clock Chimes Tower) nearby at (-55, 0, 40)
    const kurantGroup = new THREE.Group();
    kurantGroup.position.set(-58, 0, 42);

    const kurantTower = new THREE.Mesh(new THREE.BoxGeometry(6, 28, 6), this.materials.whiteMarble);
    kurantTower.position.y = 14;
    kurantGroup.add(kurantTower);

    // Clock faces on 4 sides
    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(rot => {
      const clock = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      clock.rotation.x = Math.PI / 2;
      clock.rotation.z = rot;
      clock.position.set(Math.sin(rot) * 3.1, 22, Math.cos(rot) * 3.1);
      kurantGroup.add(clock);
    });

    // Decorative openwork crown
    const kurantCrown = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.8, 5, 8), this.materials.turquoiseTile);
    kurantCrown.position.y = 30.5;
    kurantGroup.add(kurantCrown);
    this.cityGroup.add(kurantGroup);

    this.cityGroup.add(squareGroup);
    this.landmarks.push({
      id: 'amir_temur',
      name: "Amir Temur Xiyoboni",
      district: "Markaz",
      pos: new THREE.Vector3(0, 0, 0),
      desc: "Toshkent shahrining bosh markaziy xiyoboni"
    });

    this.colliders.push({ x: 0, z: 0, radius: 10 });
    this.colliders.push({ x: -58, z: 42, radius: 6 });
  }

  // ===================== CHORSU BAZAAR =====================
  buildChorsuBazaar() {
    // Old City (Eski Shahar) - Coordinates: (-520, 0, -80)
    const chorsuGroup = new THREE.Group();
    chorsuGroup.position.set(-520, 0, -80);

    // Huge Fluted Turquoise Dome (Chorsu Bazaar signature)
    const domeRadius = 42;
    const domeGeo = new THREE.SphereGeometry(domeRadius, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2.3);
    const dome = new THREE.Mesh(domeGeo, this.materials.turquoiseTile);
    dome.position.y = 12;
    chorsuGroup.add(dome);

    // Ribbed radial arches
    for (let r = 0; r < 24; r++) {
      const angle = (r * Math.PI * 2) / 24;
      const ribGeo = new THREE.BoxGeometry(0.8, domeRadius, 1.5);
      const rib = new THREE.Mesh(ribGeo, this.materials.whiteMarble);
      rib.position.set(Math.cos(angle) * (domeRadius * 0.7), 28, Math.sin(angle) * (domeRadius * 0.7));
      rib.rotation.y = angle;
      chorsuGroup.add(rib);
    }

    // Cylindrical Base Pavilion with oriental arches
    const baseGeo = new THREE.CylinderGeometry(domeRadius + 4, domeRadius + 6, 12, 36);
    const base = new THREE.Mesh(baseGeo, this.materials.whiteMarble);
    base.position.y = 6;
    chorsuGroup.add(base);

    // Bazaar stalls, parasols, and market crowds area around dome
    for (let s = 0; s < 12; s++) {
      const sAngle = (s * Math.PI * 2) / 12;
      const stallX = Math.cos(sAngle) * 58;
      const stallZ = Math.sin(sAngle) * 58;
      const stallRoof = new THREE.Mesh(
        new THREE.ConeGeometry(4, 2, 4),
        new THREE.MeshStandardMaterial({ color: s % 2 === 0 ? 0xff4422 : 0x2288ff })
      );
      stallRoof.position.set(stallX, 3.5, stallZ);
      chorsuGroup.add(stallRoof);
    }

    this.cityGroup.add(chorsuGroup);
    this.landmarks.push({
      id: 'chorsu',
      name: "Chorsu Bozori",
      district: "Eski Shahar",
      pos: new THREE.Vector3(-520, 0, -80),
      desc: "Sharqona qadimiy moviy gumbazli bozor"
    });

    this.colliders.push({ x: -520, z: -80, radius: 52 });
  }

  // ===================== MINOR MOSQUE =====================
  buildMinorMosque() {
    // Beside Anhor Canal - Coordinates: (-140, 0, -320)
    const mosqueGroup = new THREE.Group();
    mosqueGroup.position.set(-180, 0, -320);

    // Main Mosque Hall (Pure white marble)
    const hallGeo = new THREE.BoxGeometry(45, 18, 40);
    const hall = new THREE.Mesh(hallGeo, this.materials.whiteMarble);
    hall.position.y = 9;
    hall.castShadow = true;
    mosqueGroup.add(hall);

    // Grand Sky-Blue Central Dome
    const domeGeo = new THREE.SphereGeometry(14, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, this.materials.turquoiseTile);
    dome.position.y = 18;
    mosqueGroup.add(dome);

    // Twin High Minarets
    [-24, 24].forEach(x => {
      const minaretGeo = new THREE.CylinderGeometry(2.2, 3.2, 55, 16);
      const minaret = new THREE.Mesh(minaretGeo, this.materials.whiteMarble);
      minaret.position.set(x, 27.5, 20);
      mosqueGroup.add(minaret);

      // Turquoise pointed minaret cone
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 16), this.materials.turquoiseTile);
      cone.position.set(x, 58.5, 20);
      mosqueGroup.add(cone);
    });

    this.cityGroup.add(mosqueGroup);
    this.landmarks.push({
      id: 'minor_mosque',
      name: "Minor Masjidi",
      district: "Yunusobod / Anhor",
      pos: new THREE.Vector3(-180, 0, -320),
      desc: "Oq marmarli muazzam masjid"
    });

    this.colliders.push({ x: -180, z: -320, radius: 32 });
  }

  // ===================== TASHKENT CITY SKYSCRAPERS =====================
  buildTashkentCitySkyscrapers() {
    // Tashkent City modern district - Coordinates: (-280, 0, 180)
    const tcGroup = new THREE.Group();
    tcGroup.position.set(-280, 0, 180);

    // Modern Curved Luxury Hotel Tower (Hilton style)
    const tower1 = new THREE.Mesh(new THREE.CylinderGeometry(16, 20, 95, 24), this.materials.glassBlue);
    tower1.position.set(0, 47.5, 0);
    tower1.castShadow = true;
    tcGroup.add(tower1);

    // Spire on top
    const spire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.5, 25, 12), this.materials.steelTower);
    spire1.position.set(0, 107.5, 0);
    tcGroup.add(spire1);

    // Tashkent City Congress Hall (Modern geometric pavilion)
    const congress = new THREE.Mesh(new THREE.BoxGeometry(60, 22, 45), this.materials.whiteMarble);
    congress.position.set(50, 11, -40);
    congress.castShadow = true;
    tcGroup.add(congress);

    // Twin High-Rise Financial Center Towers
    [-35, 35].forEach((x, idx) => {
      const h = 75 + idx * 20;
      const t = new THREE.Mesh(new THREE.BoxGeometry(22, h, 22), this.materials.glassGold);
      t.position.set(x - 40, h / 2, 45);
      t.castShadow = true;
      tcGroup.add(t);
    });

    // Tashkent City Musical Fountain Lake
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(35, 35, 0.6, 32), this.materials.canalWater);
    lake.position.set(0, 0.3, -55);
    tcGroup.add(lake);

    this.cityGroup.add(tcGroup);
    this.landmarks.push({
      id: 'tashkent_city',
      name: "Tashkent City",
      district: "Markaz / Yangi Shaxar",
      pos: new THREE.Vector3(-280, 0, 180),
      desc: "Osmono'par binolar va zamonaviy xiyobon"
    });

    this.colliders.push({ x: -280, z: 180, radius: 65 });
  }

  // ===================== FRIENDSHIP OF PEOPLES PALACE (XALQLAR DO'STLIGI) =====================
  buildFriendshipPalace() {
    // Chilonzor / Bunyodkor - Coordinates: (-350, 0, 420)
    const palaceGroup = new THREE.Group();
    palaceGroup.position.set(-350, 0, 420);

    // Monumental Soviet-Modernist Stepped Palace
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(75, 12, 60), this.materials.hotelConcrete);
    b1.position.y = 6;
    palaceGroup.add(b1);

    const b2 = new THREE.Mesh(new THREE.BoxGeometry(58, 14, 46), this.materials.whiteMarble);
    b2.position.y = 19;
    palaceGroup.add(b2);

    // Front Grand Steps and Giant Flagpole of Uzbekistan
    const steps = new THREE.Mesh(new THREE.BoxGeometry(45, 3, 20), this.materials.sidewalk);
    steps.position.set(0, 1.5, 38);
    palaceGroup.add(steps);

    // 60m Flagpole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 45, 12), this.materials.steelTower);
    pole.position.set(0, 22.5, 55);
    palaceGroup.add(pole);

    // Flag of Uzbekistan (Cyan, White, Green stripes with red thin borders)
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ color: 0x0099b5 }));
    flag.position.set(6, 42, 55);
    palaceGroup.add(flag);

    this.cityGroup.add(palaceGroup);
    this.landmarks.push({
      id: 'friendship_palace',
      name: "Xalqlar Do'stligi Saroyi",
      district: "Chilonzor",
      pos: new THREE.Vector3(-350, 0, 420),
      desc: "Afsonaviy san'at saroyi va bayroq maydoni"
    });

    this.colliders.push({ x: -350, z: 420, radius: 48 });
  }

  // ===================== TASHKENT INTERNATIONAL AIRPORT =====================
  buildTashkentAirport() {
    // Mirobod / Janub - Coordinates: (380, 0, 520)
    const airportGroup = new THREE.Group();
    airportGroup.position.set(380, 0, 520);

    // Airport Terminal Building (Terminal 2)
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(110, 16, 45), this.materials.whiteMarble);
    terminal.position.y = 8;
    terminal.castShadow = true;
    airportGroup.add(terminal);

    // Glass Departure Hall Facade
    const glassHall = new THREE.Mesh(new THREE.BoxGeometry(105, 12, 2), this.materials.glassBlue);
    glassHall.position.set(0, 8, 23);
    airportGroup.add(glassHall);

    // Rooftop Sign: "TOSHKENT XALQARO AEROPORTI"
    const sign = new THREE.Mesh(new THREE.BoxGeometry(65, 3, 1), new THREE.MeshBasicMaterial({ color: 0x0077dd }));
    sign.position.set(0, 17.5, 23);
    airportGroup.add(sign);

    // Air Traffic Control Tower
    const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 36, 16), this.materials.whiteMarble);
    towerBase.position.set(-65, 18, 0);
    airportGroup.add(towerBase);

    const towerCab = new THREE.Mesh(new THREE.CylinderGeometry(8, 6.5, 8, 16), this.materials.glassBlue);
    towerCab.position.set(-65, 40, 0);
    airportGroup.add(towerCab);

    // Radar dish
    const radar = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 0.4), this.materials.steelTower);
    radar.position.set(-65, 45, 0);
    airportGroup.add(radar);

    // Runway Strip (Tarmac with center runway lights)
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(35, 400), this.materials.asphalt);
    runway.rotateX(-Math.PI / 2);
    runway.position.set(70, 0.08, -120);
    airportGroup.add(runway);

    this.cityGroup.add(airportGroup);
    this.landmarks.push({
      id: 'airport',
      name: "Toshkent Aeroporti",
      district: "Mirobod",
      pos: new THREE.Vector3(380, 0, 520),
      desc: "Islom Karimov nomidagi Toshkent xalqaro aeroporti"
    });

    this.colliders.push({ x: 380, z: 520, radius: 65 });
  }

  // ===================== METRO STATIONS =====================
  buildMetroStations() {
    const stations = [
      { name: "Amir Temur Xiyoboni Metro", x: 25, z: -35 },
      { name: "Mustaqillik Maydoni Metro", x: -45, z: -60 },
      { name: "Chorsu Metro", x: -470, z: -70 },
      { name: "Bunyodkor Metro", x: -300, z: 380 }
    ];

    stations.forEach(st => {
      const mGroup = new THREE.Group();
      mGroup.position.set(st.x, 0, st.z);

      // Station underground canopy entrance
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 12), this.materials.glassBlue);
      canopy.position.y = 1.6;
      mGroup.add(canopy);

      // Glowing "M" Metro Logo Column
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6, 8), this.materials.steelTower);
      p.position.set(4, 3, 6);
      mGroup.add(p);

      const mLogo = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x0066cc }));
      mLogo.position.set(4, 6.5, 6);
      mGroup.add(mLogo);

      this.cityGroup.add(mGroup);
    });
  }

  // ===================== RESIDENTIAL & COMMERCIAL BUILDINGS =====================
  buildResidentialAndCommercialBlocks() {
    // Generate realistic urban street blocks with shops, banks, and Tashkent residential buildings
    const blockPositions = [
      // Northeast sector (Yunusobod / Mustaqillik)
      { x: 130, z: -140, w: 90, d: 80, h: 32, type: 'business' },
      { x: 130, z: -270, w: 90, d: 80, h: 42, type: 'residential' },
      { x: 390, z: -140, w: 100, d: 90, h: 28, type: 'commercial' },
      { x: 390, z: -300, w: 110, d: 100, h: 35, type: 'residential' },

      // Northwest sector (Navoiy / Shayxontohur)
      { x: -380, z: -240, w: 90, d: 80, h: 25, type: 'oldcity' },
      { x: -380, z: -380, w: 95, d: 90, h: 22, type: 'oldcity' },

      // Southwest sector (Bunyodkor / Chilonzor)
      { x: -140, z: 140, w: 85, d: 80, h: 36, type: 'business' },
      { x: -140, z: 280, w: 90, d: 90, h: 40, type: 'residential' },
      { x: -450, z: 240, w: 95, d: 85, h: 30, type: 'residential' },

      // Southeast sector (Mirobod / Oybek / Nukus)
      { x: 140, z: 240, w: 90, d: 90, h: 45, type: 'business' },
      { x: 140, z: 390, w: 95, d: 85, h: 35, type: 'residential' },
      { x: 280, z: 140, w: 85, d: 80, h: 38, type: 'commercial' },
      { x: 420, z: 280, w: 100, d: 90, h: 32, type: 'residential' }
    ];

    blockPositions.forEach(b => {
      const bGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      let mat = this.materials.hotelConcrete;
      if (b.type === 'business') mat = this.materials.glassBlue;
      if (b.type === 'commercial') mat = this.materials.whiteMarble;
      if (b.type === 'oldcity') mat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.9 });

      const building = new THREE.Mesh(bGeo, mat);
      building.position.set(b.x, b.h / 2, b.z);
      building.castShadow = true;
      building.receiveShadow = true;
      this.cityGroup.add(building);

      this.colliders.push({
        x: b.x,
        z: b.z,
        radius: Math.max(b.w, b.d) * 0.52
      });

      // Rooftop air conditioning & antenna units
      const acGeo = new THREE.BoxGeometry(b.w * 0.3, 3, b.d * 0.3);
      const ac = new THREE.Mesh(acGeo, this.materials.sidewalk);
      ac.position.set(b.x, b.h + 1.5, b.z);
      this.cityGroup.add(ac);
    });
  }

  // ===================== STREET FURNITURE & BILLBOARDS =====================
  buildStreetFurniture() {
    // Tashkent Billboards (Uzum, Payme, Click, Artel, Korzinka)
    const billboardBrands = [
      { name: "PAYME", color: 0x00c4b4 },
      { name: "CLICK", color: 0x0088ff },
      { name: "UZUM", color: 0x7b2cbf },
      { name: "ARTEL", color: 0xd90429 },
      { name: "KORZINKA", color: 0xef233c }
    ];

    const billboardLocations = [
      { x: 18, z: 150, rot: 0 },
      { x: -18, z: -150, rot: Math.PI },
      { x: 150, z: 18, rot: Math.PI / 2 },
      { x: -150, z: -18, rot: -Math.PI / 2 },
      { x: 275, z: 200, rot: 0 },
      { x: -295, z: 200, rot: 0 }
    ];

    billboardLocations.forEach((loc, idx) => {
      const brand = billboardBrands[idx % billboardBrands.length];
      const bbGroup = new THREE.Group();
      bbGroup.position.set(loc.x, 0, loc.z);
      bbGroup.rotation.y = loc.rot;

      // Steel support pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 9, 8), this.materials.steelTower);
      pole.position.y = 4.5;
      bbGroup.add(pole);

      // Board
      const board = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 0.5), new THREE.MeshBasicMaterial({ color: brand.color }));
      board.position.y = 9.5;
      bbGroup.add(board);

      // Frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(12.4, 5.4, 0.4), this.materials.sidewalk);
      frame.position.y = 9.5;
      bbGroup.add(frame);

      this.cityGroup.add(bbGroup);
    });

    // Street Lamps along Amir Temur avenue
    for (let z = -600; z <= 600; z += 60) {
      if (Math.abs(z) < 80) continue; // skip square center
      [-14, 14].forEach(x => {
        const lamp = new THREE.Group();
        lamp.position.set(x, 0, z);

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7, 8), this.materials.steelTower);
        post.position.y = 3.5;
        lamp.add(post);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), this.materials.lampGlow);
        bulb.position.set(x > 0 ? -0.8 : 0.8, 6.8, 0);
        lamp.add(bulb);

        this.cityGroup.add(lamp);
      });
    }
  }

  addTree(parent, x, z, scale = 1.0) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 3.5 * scale, 8), this.materials.treeTrunk);
    trunk.position.y = (3.5 * scale) / 2;
    treeGroup.add(trunk);

    // Foliage (Full Tashkent Plane tree crown)
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.4 * scale, 8, 8), this.materials.treeFoliage);
    crown.position.y = 4.0 * scale;
    crown.scale.set(1.1, 0.9, 1.1);
    treeGroup.add(crown);

    parent.add(treeGroup);
  }

  checkCollision(pos, radius = 1.8) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const dist = Math.hypot(dx, dz);
      if (dist < c.radius + radius) {
        return { collided: true, collider: c, overlap: c.radius + radius - dist };
      }
    }
    return { collided: false };
  }
}
