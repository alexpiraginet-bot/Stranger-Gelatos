// Entrada: teclado (PC) e botões na tela (celular).
export class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.run = false;
    this.jumpHeld = false;
    this.jumpPressed = false;   // one-shot (consumido pelo jogo)
    this.shootHeld = false;
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    this._keys = new Set();
    this._setupKeyboard();
    this._setupTouch();

    // some teclas/botões presos ao perder o foco (Alt-Tab, trocar de app)
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); });
    // rede de segurança: se todos os dedos saírem da tela, zera os botões
    const clearTouch = (e) => {
      if (e.touches && e.touches.length > 0) return;
      this.left = this.right = false; this.jumpHeld = this.shootHeld = false;
      document.querySelectorAll('.touch-btn.pressed').forEach((el) => el.classList.remove('pressed'));
    };
    document.addEventListener('touchend', clearTouch, { passive: true });
    document.addEventListener('touchcancel', clearTouch, { passive: true });
  }

  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (!this._keys.has(k)) this._onPress(k);
      this._keys.add(k);
      this._sync();
    });
    window.addEventListener('keyup', (e) => { this._keys.delete(e.key.toLowerCase()); this._sync(); });
  }

  _onPress(k) {
    if (k === ' ' || k === 'arrowup' || k === 'w') this.jumpPressed = true;
  }

  _sync() {
    const K = this._keys;
    this.left = K.has('arrowleft') || K.has('a');
    this.right = K.has('arrowright') || K.has('d');
    this.jumpHeld = K.has(' ') || K.has('arrowup') || K.has('w');
    this.shootHeld = K.has('j') || K.has('f') || K.has('x') || K.has('control');
    this.run = K.has('shift');
  }

  _btn(id, on, off) {
    const el = document.getElementById(id);
    if (!el) return;
    const press = (e) => { e.preventDefault(); el.classList.add('pressed'); on(); };
    const release = (e) => { e.preventDefault(); el.classList.remove('pressed'); off(); };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
    // também funciona com mouse (testes no PC)
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', (e) => { if (el.classList.contains('pressed')) release(e); });
  }

  _setupTouch() {
    this._btn('btn-left', () => { this.left = true; }, () => { this.left = false; });
    this._btn('btn-right', () => { this.right = true; }, () => { this.right = false; });
    this._btn('btn-jump', () => { this.jumpHeld = true; this.jumpPressed = true; }, () => { this.jumpHeld = false; });
    this._btn('btn-shoot', () => { this.shootHeld = true; }, () => { this.shootHeld = false; });
  }

  consumeJump() {
    if (this.jumpPressed) { this.jumpPressed = false; return true; }
    return false;
  }

  // zera tudo (evita botão "preso" ao reiniciar / trocar de tela)
  reset() {
    this.left = this.right = this.run = false;
    this.jumpHeld = this.jumpPressed = this.shootHeld = false;
    this._keys.clear();
    document.querySelectorAll('.touch-btn.pressed').forEach((el) => el.classList.remove('pressed'));
  }
}
