// Gerenciamento de teclado
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set(); // teclas pressionadas neste frame (one-shot)

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (this._isGameKey(k)) e.preventDefault();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  _isGameKey(k) {
    return ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'p'].includes(k);
  }

  isDown(...keys) {
    return keys.some((k) => this.keys.has(k));
  }

  // Verdadeiro só no frame em que a tecla foi pressionada
  wasPressed(...keys) {
    return keys.some((k) => this.pressed.has(k));
  }

  // Direção de movimento normalizada {x, y}
  getMoveVector() {
    let x = 0, y = 0;
    if (this.isDown('a', 'arrowleft')) x -= 1;
    if (this.isDown('d', 'arrowright')) x += 1;
    if (this.isDown('w', 'arrowup')) y -= 1;
    if (this.isDown('s', 'arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv; y *= inv;
    }
    return { x, y };
  }

  // Chamar no fim de cada frame
  clearPressed() {
    this.pressed.clear();
  }
}
