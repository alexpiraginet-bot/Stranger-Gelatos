import { CONFIG } from './config.js';

export class Camera {
  constructor() { this.x = 0; this.y = 0; this.s = 3; }

  resize(canvas) { this.s = canvas.height / CONFIG.VIEW_H; }

  follow(player, level, canvas, snap = false) {
    this.s = canvas.height / CONFIG.VIEW_H;
    const viewW = canvas.width / this.s;
    const viewH = canvas.height / this.s;
    let tx = player.cx - viewW / 2;
    let ty = player.cy - viewH * 0.62;
    tx = Math.max(0, Math.min(tx, Math.max(0, level.widthPx - viewW)));
    ty = Math.max(0, Math.min(ty, Math.max(0, level.heightPx - viewH)));
    if (snap) { this.x = tx; this.y = ty; }
    else { this.x += (tx - this.x) * 0.15; this.y += (ty - this.y) * 0.15; }
  }
}
