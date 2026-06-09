import { CONFIG, COLORS } from './config.js';

// Demogorgon — persegue o Bento quando ele está dentro do campo de visão.
export class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = CONFIG.ENEMY_SIZE;
    this.hp = CONFIG.ENEMY_HITS_TO_KILL;
    this.dead = false;
    this.hitFlash = 0;
    this.knockback = { x: 0, y: 0 };
    this.wanderDir = this._randomDir();
    this.wanderTimer = 0;
    this.petalPhase = Math.random() * Math.PI * 2;
    this.alerted = false;
  }

  get cx() { return this.x + this.size / 2; }
  get cy() { return this.y + this.size / 2; }

  _randomDir() {
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a), y: Math.sin(a) };
  }

  update(player, world) {
    if (this.dead) return;

    const dx = player.cx - this.cx;
    const dy = player.cy - this.cy;
    const dist = Math.hypot(dx, dy);

    let mx = 0, my = 0;
    if (dist < CONFIG.ENEMY_SIGHT) {
      // Persegue o jogador
      this.alerted = true;
      mx = dx / dist;
      my = dy / dist;
    } else {
      // Perambula
      this.alerted = false;
      this.wanderTimer--;
      if (this.wanderTimer <= 0) {
        this.wanderDir = this._randomDir();
        this.wanderTimer = 60 + Math.random() * 90;
      }
      mx = this.wanderDir.x * 0.5;
      my = this.wanderDir.y * 0.5;
    }

    const speed = CONFIG.ENEMY_SPEED;
    this._move(mx * speed + this.knockback.x, my * speed + this.knockback.y, world);

    // Decai o knockback
    this.knockback.x *= 0.8;
    this.knockback.y *= 0.8;
    if (Math.abs(this.knockback.x) < 0.05) this.knockback.x = 0;
    if (Math.abs(this.knockback.y) < 0.05) this.knockback.y = 0;

    if (this.hitFlash > 0) this.hitFlash--;
    this.petalPhase += 0.15;
  }

  _move(dx, dy, world) {
    if (!world.collidesBox(this.x + dx, this.y, this.size, this.size)) {
      this.x += dx;
    } else {
      this.wanderDir.x *= -1;
    }
    if (!world.collidesBox(this.x, this.y + dy, this.size, this.size)) {
      this.y += dy;
    } else {
      this.wanderDir.y *= -1;
    }
  }

  hit(fromX, fromY) {
    this.hp--;
    this.hitFlash = 8;
    const a = Math.atan2(this.cy - fromY, this.cx - fromX);
    this.knockback.x = Math.cos(a) * 6;
    this.knockback.y = Math.sin(a) * 6;
    if (this.hp <= 0) this.dead = true;
  }

  // Colisão circular com o jogador
  collidesPlayer(player) {
    const dx = player.cx - this.cx;
    const dy = player.cy - this.cy;
    return Math.hypot(dx, dy) < (this.size / 2 + player.size / 2 - 4);
  }

  draw(ctx, cam) {
    if (this.dead) return;
    const px = this.cx - cam.x;
    const py = this.cy - cam.y;
    const s = this.size;

    ctx.save();
    ctx.translate(px, py);

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, s / 2 - 2, s / 2.2, s / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const flash = this.hitFlash > 0 && this.hitFlash % 2 === 0;

    // Corpo
    ctx.fillStyle = flash ? '#fff' : COLORS.enemyDark;
    ctx.beginPath();
    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    ctx.fill();

    // "Pétalas" da cabeça de flor do Demogorgon
    const petals = 5;
    ctx.fillStyle = flash ? '#fff' : COLORS.enemy;
    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2 + this.petalPhase * 0.2;
      const open = this.alerted ? 0.9 : 0.5;
      const ox = Math.cos(ang) * s * 0.4 * open;
      const oy = Math.sin(ang) * s * 0.4 * open;
      ctx.beginPath();
      ctx.ellipse(ox, oy, s * 0.22, s * 0.32, ang, 0, Math.PI * 2);
      ctx.fill();
    }

    // Centro escuro (boca)
    ctx.fillStyle = '#1a0000';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
