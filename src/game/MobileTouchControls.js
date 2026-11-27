/**
 * MobileTouchControls - Professional touch input system for mobile devices.
 * Provides virtual steering, accelerator, brake/reverse, handbrake, nitro,
 * flight altitude, and quick action dock for Tashkent Taxi simulator.
 */
export class MobileTouchControls {
  constructor(input, car, onFoot, career, camera, toggleExitCar) {
    this.input = input;
    this.car = car;
    this.onFoot = onFoot;
    this.career = career;
    this.camera = camera;
    this.toggleExitCar = toggleExitCar;
    this.enabled = false;
    this.layer = null;
    this.isTouch = MobileTouchControls.isTouchDevice();
    this.init();
  }

  static isTouchDevice() {
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallTouchScreen = (window.innerWidth <= 860) && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
    return isMobileUA || isSmallTouchScreen;
  }

  init() {
    this.createDOM();
    this.bindEvents();
    this.bindCameraSwipe();

    // Auto-enable ONLY if real mobile touch device detected
    if (this.isTouch) {
      this.show();
    }
  }

  createDOM() {
    if (document.getElementById('mobile-touch-layer')) {
      this.layer = document.getElementById('mobile-touch-layer');
      return;
    }

    const layer = document.createElement('div');
    layer.id = 'mobile-touch-layer';
    layer.className = 'mobile-touch-layer';
    layer.hidden = !this.isTouch;

    layer.innerHTML = `
      <!-- Left: Steering -->
      <div class="mt-zone mt-left">
        <div class="mt-steer-container">
          <button type="button" class="mt-btn mt-steer mt-steer-left" id="mt-btn-left" aria-label="Chapga">
            <svg viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="mt-btn mt-steer mt-steer-right" id="mt-btn-right" aria-label="O'ngga">
            <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>

      <!-- Right: Pedals & Performance -->
      <div class="mt-zone mt-right">
        <div class="mt-upper-row">
          <button type="button" class="mt-btn mt-btn-round mt-nitro" id="mt-btn-nitro" title="Nitro / Turbo">
            <span>⚡</span>
            <small>NITRO</small>
          </button>
          <button type="button" class="mt-btn mt-btn-round mt-handbrake" id="mt-btn-handbrake" title="Qo'l tormozi (Dreyf)">
            <span id="mt-brake-ico">🛑</span>
            <small id="mt-brake-lbl">DREYF</small>
          </button>
        </div>
        <div class="mt-pedal-row">
          <button type="button" class="mt-btn mt-pedal mt-pedal-brake" id="mt-btn-brake" aria-label="Tormoz / Orqaga">
            <svg viewBox="0 0 24 24" style="width:28px;height:28px;"><path d="M19 9l-7 7-7-7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <b id="mt-pedal-b-lbl">TORMOZ</b>
            <small id="mt-pedal-b-sub">ORQAGA</small>
          </button>
          <button type="button" class="mt-btn mt-pedal mt-pedal-gas" id="mt-btn-gas" aria-label="Gaz / Tezlanish">
            <svg viewBox="0 0 24 24" style="width:28px;height:28px;"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <b id="mt-pedal-g-lbl">GAZ</b>
            <small id="mt-pedal-g-sub">TEZLANISH</small>
          </button>
        </div>
      </div>

      <!-- Flight altitude buttons -->
      <div class="mt-flight-controls" id="mt-flight-controls" hidden>
        <button type="button" class="mt-btn mt-btn-round" id="mt-btn-fly-up" title="Yuqoriga ko'tarilish">
          <span style="font-size:20px;">▲</span>
          <small>TEPAGA</small>
        </button>
        <button type="button" class="mt-btn mt-btn-round" id="mt-btn-fly-down" title="Pastga tushish">
          <span style="font-size:20px;">▼</span>
          <small>PASTGA</small>
        </button>
      </div>

      <!-- Quick action dock -->
      <div class="mt-quick-dock" id="mt-quick-dock">
        <button type="button" class="mt-dock-btn mt-dock-phone" id="mt-dock-phone" title="Taksi buyurtmalari (P)">
          <span>📱</span>
          <b>BUYURTMALAR</b>
        </button>
        <button type="button" class="mt-dock-btn mt-dock-flight" id="mt-dock-flight" title="Parvoz rejimi (Y)">
          <span>🚀</span>
          <b id="mt-flight-lbl">UCHISH [Y]</b>
        </button>
        <button type="button" class="mt-dock-btn" id="mt-dock-exit" title="Tushish / Minish (F)">
          <span id="mt-exit-ico">🚶</span>
          <b id="mt-exit-lbl">TUSHISH</b>
        </button>
        <div class="mt-dock-row">
          <button type="button" class="mt-dock-btn" id="mt-dock-cam" title="Kamera (C)"><span>📷</span></button>
          <button type="button" class="mt-dock-btn" id="mt-dock-horn" title="Signal (H)"><span>📢</span></button>
          <button type="button" class="mt-dock-btn" id="mt-dock-lights" title="Faralar (L)"><span>💡</span></button>
          <button type="button" class="mt-dock-btn" id="mt-dock-reset" title="Qaytarish (Backspace)"><span>🔄</span></button>
        </div>
      </div>
    `;

    document.body.appendChild(layer);
    this.layer = layer;
  }

  bindEvents() {
    const bindHold = (btnId, keyCodes) => {
      const el = document.getElementById(btnId);
      if (!el) return;
      const keys = Array.isArray(keyCodes) ? keyCodes : [keyCodes];
      const onStart = (e) => {
        e.preventDefault(); e.stopPropagation();
        el.classList.add('active');
        if (navigator.vibrate) try { navigator.vibrate(10); } catch{}
        keys.forEach(k => this.input && this.input.keys && this.input.keys.add(k));
      };
      const onEnd = (e) => {
        e.preventDefault();
        el.classList.remove('active');
        keys.forEach(k => this.input && this.input.keys && this.input.keys.delete(k));
      };
      el.addEventListener('pointerdown', onStart);
      el.addEventListener('pointerup', onEnd);
      el.addEventListener('pointercancel', onEnd);
      el.addEventListener('pointerleave', onEnd);
      el.addEventListener('touchstart', onStart, { passive: false });
      el.addEventListener('touchend', onEnd, { passive: false });
      el.addEventListener('touchcancel', onEnd, { passive: false });
    };

    const bindTap = (btnId, callback) => {
      const el = document.getElementById(btnId);
      if (!el) return;
      const onAction = (e) => {
        e.preventDefault(); e.stopPropagation();
        el.classList.add('active');
        if (navigator.vibrate) try { navigator.vibrate(15); } catch{}
        try { callback(); } catch(err) { console.warn(err); }
        setTimeout(() => el.classList.remove('active'), 150);
      };
      el.addEventListener('pointerdown', onAction);
      el.addEventListener('touchstart', onAction, { passive: false });
    };

    bindHold('mt-btn-left', 'KeyA');
    bindHold('mt-btn-right', 'KeyD');
    bindHold('mt-btn-gas', 'KeyW');
    bindHold('mt-btn-brake', 'KeyS');
    bindHold('mt-btn-handbrake', 'Space');
    bindHold('mt-btn-fly-up', ['Space', 'KeyE']);
    bindHold('mt-btn-fly-down', 'KeyQ');

    bindTap('mt-btn-nitro', () => this.input?.onAction('turbo'));
    bindTap('mt-dock-phone', () => this.input?.onAction('phone'));
    bindTap('mt-dock-flight', () => this.input?.onAction('flight'));
    bindTap('mt-dock-exit', () => {
      if (typeof this.toggleExitCar === 'function') {
        this.toggleExitCar();
      } else if (this.input) {
        this.input.onAction('exitCar');
      }
    });
    bindTap('mt-dock-cam', () => this.input?.onAction('camera'));
    bindTap('mt-dock-horn', () => {
      if (this.input) {
        this.input.hornHeld = true;
        setTimeout(() => this.input.hornHeld = false, 350);
      }
    });
    bindTap('mt-dock-lights', () => this.input?.onAction('lights'));
    bindTap('mt-dock-reset', () => this.input?.onAction('reset'));
  }

  bindCameraSwipe() {
    let startX = 0, startY = 0, isDragging = false;
    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('button, .mt-btn, .mt-dock-btn, .order-card, .phone, .menu, #hud')) return;
      if (e.touches && e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        if (this.input && this.input.look) this.input.look.active = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || !e.touches || !e.touches[0]) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      if (this.input && this.input.look) {
        this.input.look.x += dx * 0.005;
        this.input.look.y += dy * 0.005;
        this.input.look.active = true;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
      if (this.input && this.input.look) this.input.look.active = false;
    }, { passive: true });
  }

  show() {
    if (!this.isTouch) return;
    this.enabled = true;
    if (this.layer) {
      this.layer.hidden = false;
      this.layer.style.display = 'block';
    }
  }

  hide() {
    this.enabled = false;
    if (this.layer) {
      this.layer.hidden = true;
      this.layer.style.display = 'none';
    }
  }

  update() {
    if (!this.enabled || !this.layer || !this.isTouch) return;
    const isFlight = !!this.car?.flightMode;
    const flyEl = document.getElementById('mt-flight-controls');
    if (flyEl) flyEl.hidden = !isFlight;
    const flightLbl = document.getElementById('mt-flight-lbl');
    if (flightLbl) flightLbl.textContent = isFlight ? 'QO‘NISH [Y]' : 'UCHISH [Y]';

    const isOnFoot = !!this.onFoot?.active;
    const exitIco = document.getElementById('mt-exit-ico');
    const exitLbl = document.getElementById('mt-exit-lbl');
    const gasLbl = document.getElementById('mt-pedal-g-lbl');
    const gasSub = document.getElementById('mt-pedal-g-sub');
    const brakeLbl = document.getElementById('mt-pedal-b-lbl');
    const brakeSub = document.getElementById('mt-pedal-b-sub');
    const handbrakeIco = document.getElementById('mt-brake-ico');
    const handbrakeLbl = document.getElementById('mt-brake-lbl');

    if (isOnFoot) {
      if (exitIco) exitIco.textContent = '🚗';
      if (exitLbl) exitLbl.textContent = 'MINISH';
      if (gasLbl) gasLbl.textContent = 'YURISH';
      if (gasSub) gasSub.textContent = 'OLDINGA';
      if (brakeLbl) brakeLbl.textContent = 'ORQAGA';
      if (brakeSub) brakeSub.textContent = 'ORTGA';
      if (handbrakeIco) handbrakeIco.textContent = '🦘';
      if (handbrakeLbl) handbrakeLbl.textContent = 'SAKRASH';
    } else {
      if (exitIco) exitIco.textContent = '🚶';
      if (exitLbl) exitLbl.textContent = 'TUSHISH';
      if (gasLbl) gasLbl.textContent = 'GAZ';
      if (gasSub) gasSub.textContent = 'TEZLANISH';
      if (brakeLbl) brakeLbl.textContent = 'TORMOZ';
      if (brakeSub) brakeSub.textContent = 'ORQAGA';
      if (handbrakeIco) handbrakeIco.textContent = '🛑';
      if (handbrakeLbl) handbrakeLbl.textContent = 'DREYF';
    }
  }
}
