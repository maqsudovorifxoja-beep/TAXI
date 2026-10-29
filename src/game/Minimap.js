export class Minimap {
  constructor(canvas, city, playerCar, missionManager, trafficManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.city = city;
    this.playerCar = playerCar;
    this.missionManager = missionManager;
    this.trafficManager = trafficManager;

    // Minimap scale: city is 1600x1600, canvas is 220x220
    this.worldSize = 1400;
  }

  update() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // Dark Tashkent radar style
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Center on player
    const px = this.playerCar.position.x;
    const pz = this.playerCar.position.z;
    const zoom = 0.16; // meters to canvas pixels

    ctx.save();
    ctx.translate(cx, cy);

    // World to minimap coordinates
    const toScreen = (wx, wz) => {
      return {
        x: (wx - px) * zoom,
        y: (wz - pz) * zoom
      };
    };

    // Draw Anhor canal
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const canalStart = toScreen(-140, -700);
    const canalEnd = toScreen(-140, 700);
    ctx.moveTo(canalStart.x, canalStart.y);
    ctx.lineTo(canalEnd.x, canalEnd.y);
    ctx.stroke();

    // Draw Main Avenues
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3.5;
    this.city.trafficLanes.forEach(lane => {
      const p1 = toScreen(
        lane.rot === 0 ? lane.x : lane.x - lane.length / 2,
        lane.rot === 0 ? lane.z - lane.length / 2 : lane.z
      );
      const p2 = toScreen(
        lane.rot === 0 ? lane.x : lane.x + lane.length / 2,
        lane.rot === 0 ? lane.z + lane.length / 2 : lane.z
      );
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Draw Traffic Cars as white dots
    if (this.trafficManager) {
      ctx.fillStyle = '#94a3b8';
      this.trafficManager.trafficCars.forEach(car => {
        const sc = toScreen(car.group.position.x, car.group.position.z);
        if (Math.abs(sc.x) < cx && Math.abs(sc.y) < cy) {
          ctx.beginPath();
          ctx.arc(sc.x, sc.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Landmarks
    this.city.landmarks.forEach(lm => {
      const sc = toScreen(lm.pos.x, lm.pos.z);
      if (Math.abs(sc.x) < cx - 10 && Math.abs(sc.y) < cy - 10) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(lm.name.slice(0, 12), sc.x, sc.y - 6);
      }
    });

    // Draw Active Mission Target (Pickup or Destination)
    let targetPos = null;
    let targetColor = '#00ff88';
    let targetLabel = 'MIJOZ';

    if (this.missionManager.state === 'picking_up' && this.missionManager.pickupBeacon.visible) {
      targetPos = this.missionManager.pickupBeacon.position;
      targetColor = '#00ff88';
      targetLabel = 'MIJOZ';
    } else if (this.missionManager.state === 'driving_to_destination' && this.missionManager.destinationBeacon.visible) {
      targetPos = this.missionManager.destinationBeacon.position;
      targetColor = '#facc15';
      targetLabel = 'MANZIL';
    }

    if (targetPos) {
      const sc = toScreen(targetPos.x, targetPos.z);
      // Pulsating target marker
      const pulse = (Math.sin(performance.now() * 0.008) + 1) * 3 + 5;
      ctx.strokeStyle = targetColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = targetColor;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Route dashed line from player to target
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = targetColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(sc.x, sc.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Player Car (in the center)
    ctx.rotate(this.playerCar.rotationY);
    ctx.fillStyle = this.playerCar.carType === 'tesla' ? '#ff2b4e'
      : this.playerCar.carType === 'gentra' ? '#ffffff'
      : this.playerCar.carType === 'bmw' ? '#00bbff'
      : '#f59e0b';
    // Triangle arrow shape
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(-5, -6);
    ctx.lineTo(0, -3);
    ctx.lineTo(5, -6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Radar circular border & compass indicator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);

    // North arrow "N"
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 14);
  }
}
