import { COLORS } from './config.js';

// Itens coletáveis e o portal de saída.
class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'key' | 'battery' | 'portal'
    this.collected = false;
    this.phase = Math.random() * Math.PI * 2;
    this.radius = type === 'portal' ? 26 : 14;
  }

  update() {
    this.phase += 0.08;
  }

  collidesPlayer(player) {
    const dx = player.cx - this.x;
    const dy = player.cy - this.y;
    return Math.hypot(dx, dy) < this.radius + player.size / 2;
  }

  draw(ctx, cam) {
    if (this.collected) return;
    const px = this.x - cam.x;
    const py = this.y - cam.y + Math.sin(this.phase) * 3;

    ctx.save();
    ctx.translate(px, py);

    if (this.type === 'key') {
      ctx.shadowColor = COLORS.key;
      ctx.shadowBlur = 12;
      ctx.fillStyle = COLORS.key;
      // Cabeça da chave
      ctx.beginPath();
      ctx.arc(0, -4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-2, -2, 4, 12);
      ctx.fillRect(-2, 8, 6, 2);
      ctx.fillRect(-2, 5, 5, 2);
    } else if (this.type === 'battery') {
      ctx.shadowColor = COLORS.battery;
      ctx.shadowBlur = 12;
      ctx.fillStyle = COLORS.battery;
      ctx.fillRect(-7, -5, 14, 10);
      ctx.fillRect(7, -2, 2, 4);
      ctx.fillStyle = '#0a0a0f';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('+', 0, 3);
    } else if (this.type === 'portal') {
      // Portal de saída — vórtice roxo girando
      ctx.shadowColor = COLORS.portal;
      ctx.shadowBlur = 25;
      for (let i = 0; i < 4; i++) {
        const r = this.radius - i * 5;
        ctx.strokeStyle = COLORS.portal;
        ctx.globalAlpha = 0.4 + i * 0.15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, this.phase + i, this.phase + i + Math.PI * 1.4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1a0033';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export { Item };
