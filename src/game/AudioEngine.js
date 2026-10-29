// AudioEngine.js - Web Audio API synthesized realistic car engines, horns, radio, and effects
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.muted = false;

    // Radio
    this.radioStations = [
      { name: "O'zbegim Navolari (FM 101.0)", tempo: 118, genre: 'uzbek' },
      { name: "Toshkent City Drive (FM 105.4)", tempo: 124, genre: 'synthwave' },
      { name: "AMG Bass Club (FM 99.8)", tempo: 128, genre: 'club' },
      { name: "Radio O'chiq", tempo: 0, genre: 'off' }
    ];
    this.currentStationIdx = 0;
    this.radioTimer = null;
    this.radioPlaying = false;
    this.radioStep = 0;

    // Engine Nodes
    this.engineGain = null;
    this.osc1 = null;
    this.osc2 = null;
    this.osc3 = null;
    this.filter = null;
    this.noiseNode = null;
    this.tireGain = null;

    // Current car type: 'bmw' or 'amg'
    this.carType = 'amg';
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Engine setup
      this.setupEngineSound();

      // Tire screech setup
      this.setupTireSound();

      // Start radio
      this.startRadio();
    } catch (e) {
      console.warn("Web Audio init warning:", e);
    }
  }

  setupEngineSound() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    // Primary engine oscillator
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(50, this.ctx.currentTime);

    // Secondary oscillator (sub/body rumble)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(35, this.ctx.currentTime);

    // Third oscillator (harmonics / electric whirr)
    this.osc3 = this.ctx.createOscillator();
    this.osc3.type = 'sine';
    this.osc3.frequency.setValueAtTime(100, this.ctx.currentTime);

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.osc3.connect(this.filter);

    this.filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
    this.osc3.start();
  }

  setupTireSound() {
    // Generate white noise buffer for tire screech
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const tireFilter = this.ctx.createBiquadFilter();
    tireFilter.type = 'bandpass';
    tireFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    tireFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    whiteNoise.connect(tireFilter);
    tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    whiteNoise.start();
  }

  setCarType(type) {
    this.carType = type;
    if (!this.initialized) return;

    if (type === 'tesla') {
      // Tesla Model S Plaid: Pure electric tri-motor high-frequency sound
      this.osc1.type = 'sine';
      this.osc2.type = 'triangle';
      this.osc3.type = 'sine';
      this.filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    } else if (type === 'gentra') {
      // Chevrolet Lacetti Gentra: 1.5L DOHC inline-4 sporty tuned rasp
      this.osc1.type = 'sawtooth';
      this.osc2.type = 'square';
      this.osc3.type = 'triangle';
      this.filter.frequency.setValueAtTime(750, this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    } else if (type === 'bmw' || type === 'bmw_i3' || type === 'bmw_m5') {
      // BMW M5 G90: 4.4L Twin-Turbo V8 with M-Hybrid electric punch
      this.osc1.type = 'sawtooth';
      this.osc2.type = 'triangle';
      this.osc3.type = 'sawtooth';
      this.filter.frequency.setValueAtTime(620, this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
    } else {
      // Mercedes AMG: Deep 6.2L atmospheric V8 rumble and aggressive rasp
      this.osc1.type = 'sawtooth';
      this.osc2.type = 'sawtooth';
      this.osc3.type = 'triangle';
      this.filter.frequency.setValueAtTime(500, this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    }
  }

  updateEngine(speed, maxSpeed, throttle, isBraking) {
    if (!this.initialized || this.muted) return;

    const normSpeed = Math.min(1.0, Math.abs(speed) / maxSpeed);
    const t = this.ctx.currentTime;

    if (this.carType === 'tesla') {
      // Tesla Electric Motor Whine: smooth hypersonic pitch sweep
      const baseFreq = 160 + normSpeed * 1200 + (throttle ? 220 : 0);
      this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.04);
      this.osc2.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.04);
      this.osc3.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.04);

      const cutoff = 800 + normSpeed * 2200;
      this.filter.frequency.setTargetAtTime(cutoff, t, 0.05);

      const vol = 0.05 + normSpeed * 0.16 + (isBraking && normSpeed > 0.1 ? 0.09 : 0);
      this.engineGain.gain.setTargetAtTime(vol, t, 0.04);
    } else if (this.carType === 'gentra') {
      // Gentra 1.5 DOHC tuning engine rev
      const rpmFactor = (normSpeed * 1.1 + (throttle ? 0.35 : 0)) % 0.28 * 3.5;
      const gentraFreq = 65 + rpmFactor * 190 + normSpeed * 80;
      this.osc1.frequency.setTargetAtTime(gentraFreq, t, 0.04);
      this.osc2.frequency.setTargetAtTime(gentraFreq * 0.5, t, 0.04);
      this.osc3.frequency.setTargetAtTime(gentraFreq * 2.0, t, 0.04);

      const cutoff = 450 + (throttle ? 1100 : 500) + normSpeed * 900;
      this.filter.frequency.setTargetAtTime(cutoff, t, 0.05);

      const vol = 0.14 + (throttle ? 0.18 : 0.06) + normSpeed * 0.12;
      this.engineGain.gain.setTargetAtTime(vol, t, 0.05);
    } else if (this.carType === 'bmw') {
      // BMW i3 Electric drive: Pitch climbs smoothly up to futuristic 1200Hz
      const baseFreq = 120 + normSpeed * 700 + (throttle ? 150 : 0);
      this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
      this.osc2.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);
      this.osc3.frequency.setTargetAtTime(baseFreq * 2.0, t, 0.05);

      const cutoff = 600 + normSpeed * 1800;
      this.filter.frequency.setTargetAtTime(cutoff, t, 0.08);

      // Regenerative braking hum
      const vol = 0.06 + normSpeed * 0.12 + (isBraking && normSpeed > 0.1 ? 0.08 : 0);
      this.engineGain.gain.setTargetAtTime(vol, t, 0.05);
    } else {
      // Mercedes AMG: V8 biturbo roaring frequencies
      const rpmFactor = (normSpeed * 0.8 + (throttle ? 0.25 : 0)) % 0.35 * 2.8; // simulated gear shifts
      const amgFreq = 42 + rpmFactor * 130 + normSpeed * 50;
      this.osc1.frequency.setTargetAtTime(amgFreq, t, 0.04);
      this.osc2.frequency.setTargetAtTime(amgFreq * 0.5, t, 0.04);
      this.osc3.frequency.setTargetAtTime(amgFreq * 1.5, t, 0.04);

      const cutoff = 300 + (throttle ? 900 : 350) + normSpeed * 800;
      this.filter.frequency.setTargetAtTime(cutoff, t, 0.05);

      const vol = 0.12 + (throttle ? 0.15 : 0.05) + normSpeed * 0.1;
      this.engineGain.gain.setTargetAtTime(vol, t, 0.05);
    }
  }

  updateTireScreech(isDrifting, speed) {
    if (!this.initialized || this.muted) return;
    const t = this.ctx.currentTime;
    if (isDrifting && Math.abs(speed) > 15) {
      this.tireGain.gain.setTargetAtTime(0.25, t, 0.03);
    } else {
      this.tireGain.gain.setTargetAtTime(0.0, t, 0.05);
    }
  }

  playHorn() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;

    // Authentic Tashkent dual-tone car horn (F and A)
    const t = this.ctx.currentTime;
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();

    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(430, t);
    oscB.frequency.setValueAtTime(510, t);

    hornGain.gain.setValueAtTime(0.2, t);
    hornGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    oscA.connect(hornGain);
    oscB.connect(hornGain);
    hornGain.connect(this.masterGain);

    oscA.start(t);
    oscB.start(t);
    oscA.stop(t + 0.35);
    oscB.stop(t + 0.35);
  }

  playNitroSound() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  playOrderChime() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.08);

      gain.gain.setValueAtTime(0.2, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.35);
    });
  }

  playPaymentCash() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    // Pleasant cash register chime + coin sound
    [880, 1108.73, 1318.51, 1760].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.06);

      gain.gain.setValueAtTime(0.25, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.45);
    });
  }

  // Tashkent In-Game Radio Station Synthesizer
  startRadio() {
    if (this.radioTimer) clearInterval(this.radioTimer);

    const notesUzbek = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440]; // Dutar/O'zbek scale
    const synthNotes = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63];

    this.radioTimer = setInterval(() => {
      if (!this.initialized || this.muted) return;
      const station = this.radioStations[this.currentStationIdx];
      if (station.genre === 'off') return;

      const t = this.ctx.currentTime;
      this.radioStep = (this.radioStep + 1) % 16;

      // Bass drum / Beat
      if (this.radioStep % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
        kickGain.gain.setValueAtTime(0.2, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        kickOsc.connect(kickGain);
        kickGain.connect(this.masterGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.15);
      }

      // Melody note
      if (this.radioStep % 2 === 0) {
        const melOsc = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();
        melOsc.type = station.genre === 'uzbek' ? 'triangle' : 'sawtooth';
        
        const noteArr = station.genre === 'uzbek' ? notesUzbek : synthNotes;
        const note = noteArr[(this.radioStep + Math.floor(this.radioStep / 4) * 3) % noteArr.length];
        
        melOsc.frequency.setValueAtTime(note * (station.genre === 'club' ? 1.5 : 2.0), t);
        melGain.gain.setValueAtTime(0.05, t);
        melGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        melOsc.connect(melGain);
        melGain.connect(this.masterGain);
        melOsc.start(t);
        melOsc.stop(t + 0.28);
      }
    }, 125);
  }

  nextRadioStation() {
    this.currentStationIdx = (this.currentStationIdx + 1) % this.radioStations.length;
    return this.radioStations[this.currentStationIdx].name;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0.0 : 0.7, this.ctx.currentTime);
    }
    return this.muted;
  }
}

export const audioEngine = new AudioEngine();
