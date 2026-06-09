import { CONFIG } from './config.js';

// Entrada unificada: teclado+mouse (PC) e touch (iOS/Android).
// Expõe: move {x,y}, running, e métodos consumeLook()/consumeAction().
export class Controls {
  constructor(container, canvas) {
    this.container = container;
    this.canvas = canvas;
    this.move = { x: 0, y: 0 };     // x = strafe (+dir), y = frente (+frente)
    this.running = false;
    this._lookDX = 0;
    this._lookDY = 0;
    this._action = false;
    this._enabled = false;

    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    this._keys = new Set();
    this._setupKeyboard();
    this._setupMouse();
    this._setupTouch();
  }

  setEnabled(v) { this._enabled = v; }

  // ---------- Teclado ----------
  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this._keys.add(k);
      if (k === ' ') { this._action = true; e.preventDefault(); }
      this._updateKeyMove();
    });
    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.key.toLowerCase());
      this._updateKeyMove();
    });
  }

  _updateKeyMove() {
    if (this.isTouch && (this._touchMove.x || this._touchMove.y)) return;
    let x = 0, y = 0;
    if (this._keys.has('w') || this._keys.has('arrowup')) y += 1;
    if (this._keys.has('s') || this._keys.has('arrowdown')) y -= 1;
    if (this._keys.has('a') || this._keys.has('arrowleft')) x -= 1;
    if (this._keys.has('d') || this._keys.has('arrowright')) x += 1;
    const len = Math.hypot(x, y);
    if (len > 0) { x /= len; y /= len; }
    this._keyMove = { x, y };
    this.running = this._keys.has('shift');
    this._syncMove();
  }

  // ---------- Mouse (pointer lock no PC) ----------
  _setupMouse() {
    this._keyMove = { x: 0, y: 0 };
    this._touchMove = { x: 0, y: 0 };

    this.canvas.addEventListener('click', () => {
      if (!this._enabled || this.isTouch) return;
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      this._lookDX += e.movementX * CONFIG.LOOK_SPEED_MOUSE;
      this._lookDY += e.movementY * CONFIG.LOOK_SPEED_MOUSE;
    });
  }

  // ---------- Touch ----------
  _setupTouch() {
    this._joyId = null;
    this._joyOrigin = { x: 0, y: 0 };
    this._lookId = null;
    this._lookLast = { x: 0, y: 0 };

    this.joyEl = document.getElementById('joystick');
    this.joyKnob = document.getElementById('joystick-knob');

    const surface = this.container;
    const opts = { passive: false };

    surface.addEventListener('touchstart', (e) => this._onTouchStart(e), opts);
    surface.addEventListener('touchmove', (e) => this._onTouchMove(e), opts);
    surface.addEventListener('touchend', (e) => this._onTouchEnd(e), opts);
    surface.addEventListener('touchcancel', (e) => this._onTouchEnd(e), opts);

    // Botões na tela
    this._bindButton('btn-action', () => { this._action = true; });
    this._bindRunButton('btn-run');
  }

  _bindButton(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.classList.add('pressed');
      fn();
    }, { passive: false });
    el.addEventListener('touchend', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.classList.remove('pressed');
    }, { passive: false });
  }

  _bindRunButton(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.classList.add('pressed');
      this.running = true;
    }, { passive: false });
    el.addEventListener('touchend', (e) => {
      e.preventDefault(); e.stopPropagation();
      el.classList.remove('pressed');
      this.running = false;
    }, { passive: false });
  }

  _isButton(target) {
    return target && target.closest && target.closest('.touch-btn');
  }

  _onTouchStart(e) {
    if (!this._enabled) return;
    for (const t of e.changedTouches) {
      if (this._isButton(t.target)) continue;
      const half = window.innerWidth / 2;
      if (t.clientX < half && this._joyId === null) {
        // Lado esquerdo: joystick flutuante
        this._joyId = t.identifier;
        this._joyOrigin = { x: t.clientX, y: t.clientY };
        this._showJoystick(t.clientX, t.clientY);
        e.preventDefault();
      } else if (this._lookId === null) {
        // Lado direito: olhar
        this._lookId = t.identifier;
        this._lookLast = { x: t.clientX, y: t.clientY };
        e.preventDefault();
      }
    }
  }

  _onTouchMove(e) {
    if (!this._enabled) return;
    for (const t of e.changedTouches) {
      if (t.identifier === this._joyId) {
        const dx = t.clientX - this._joyOrigin.x;
        const dy = t.clientY - this._joyOrigin.y;
        const max = 55;
        const len = Math.hypot(dx, dy);
        const clamped = Math.min(len, max);
        const nx = len ? dx / len : 0;
        const ny = len ? dy / len : 0;
        this._touchMove = { x: nx * (clamped / max), y: -ny * (clamped / max) };
        this._moveKnob(nx * clamped, ny * clamped);
        this._syncMove();
        e.preventDefault();
      } else if (t.identifier === this._lookId) {
        const dx = t.clientX - this._lookLast.x;
        const dy = t.clientY - this._lookLast.y;
        this._lookDX += dx * CONFIG.LOOK_SPEED_TOUCH;
        this._lookDY += dy * CONFIG.LOOK_SPEED_TOUCH;
        this._lookLast = { x: t.clientX, y: t.clientY };
        e.preventDefault();
      }
    }
  }

  _onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this._joyId) {
        this._joyId = null;
        this._touchMove = { x: 0, y: 0 };
        this._hideJoystick();
        this._syncMove();
      } else if (t.identifier === this._lookId) {
        this._lookId = null;
      }
    }
  }

  _syncMove() {
    if (this.isTouch && (this._touchMove.x || this._touchMove.y)) {
      this.move = { ...this._touchMove };
    } else {
      this.move = { ...this._keyMove };
    }
  }

  _showJoystick(x, y) {
    if (!this.joyEl) return;
    this.joyEl.style.left = `${x}px`;
    this.joyEl.style.top = `${y}px`;
    this.joyEl.style.display = 'block';
    this._moveKnob(0, 0);
  }
  _hideJoystick() {
    if (this.joyEl) this.joyEl.style.display = 'none';
  }
  _moveKnob(dx, dy) {
    if (this.joyKnob) this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  // Consome o delta de olhar acumulado (chamado 1x por frame)
  consumeLook() {
    const out = { dx: this._lookDX, dy: this._lookDY };
    this._lookDX = 0;
    this._lookDY = 0;
    return out;
  }

  // Verdadeiro só uma vez por toque/tecla de ação
  consumeAction() {
    if (this._action) { this._action = false; return true; }
    return false;
  }
}
