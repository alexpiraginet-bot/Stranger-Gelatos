import { CONFIG } from './config.js';

export class Camera {
  constructor() { this.x = 0; this.y = 0; this.s = 3; this._look = 0; this._desiredY = 0; }

  resize(canvas) { this.s = Math.max(0.1, canvas.height / CONFIG.VIEW_H); }

  follow(player, level, canvas, snap = false) {
    this.s = Math.max(0.1, canvas.height / CONFIG.VIEW_H);
    const viewW = canvas.width / this.s;
    const viewH = canvas.height / this.s;
    const maxX = Math.max(0, level.widthPx - viewW);
    const maxY = Math.max(0, level.heightPx - viewH);

    // look-ahead: mostra mais à frente na direção que o jogador olha
    const look = (player.facing || 1) * 30;
    this._look += (look - this._look) * 0.04;
    let tx = player.cx - viewW / 2 + this._look;
    tx = Math.max(0, Math.min(tx, maxX));

    // vertical estável: só re-mira o Y quando está no chão (evita tremor ao pular)
    if (player.body.onGround) this._desiredY = player.cy - viewH * 0.62;
    let ty = Math.max(0, Math.min(this._desiredY, maxY));

    if (snap) { this.x = tx; this.y = ty; this._look = look; }
    else { this.x += (tx - this.x) * 0.15; this.y += (ty - this.y) * 0.08; }
  }
}
