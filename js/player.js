import { CONFIG, COLORS } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = CONFIG.PLAYER_SIZE;
    this.health = CONFIG.PLAYER_MAX_HEALTH;
    this.battery = 100;
    this.keys = 0;
    this.dir = { x: 0, y: 1 }; // direção que está olhando (começa pra baixo)
    this.invuln = 0;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.walkFrame = 0;
    this._walkTick = 0;
  }

  get cx() { return this.x + this.size / 2; }
  get cy() { return this.y + this.size / 2; }

  update(input, world) {
    // Movimento
    const mv = input.getMoveVector();
    if (mv.x !== 0 || mv.y !== 0) {
      this.dir = { x: mv.x, y: mv.y };
      this._move(mv.x * CONFIG.PLAYER_SPEED, mv.y * CONFIG.PLAYER_SPEED, world);
      this._walkTick++;
      if (this._walkTick % 8 === 0) this.walkFrame = (this.walkFrame + 1) % 4;
    } else {
      this.walkFrame = 0;
    }

    // Ataque
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.attackTimer > 0) this.attackTimer--;
    if (input.wasPressed(' ') && this.attackCooldown === 0) {
      this.attackTimer = CONFIG.ATTACK_DURATION;
      this.attackCooldown = CONFIG.ATTACK_COOLDOWN;
    }

    // Lanterna drena bateria
    this.battery = Math.max(0, this.battery - CONFIG.BATTERY_DRAIN);

    if (this.invuln > 0) this.invuln--;
  }

  _move(dx, dy, world) {
    // Move em X e Y separadamente para deslizar nas paredes
    if (!world.collidesBox(this.x + dx, this.y, this.size, this.size)) {
      this.x += dx;
    }
    if (!world.collidesBox(this.x, this.y + dy, this.size, this.size)) {
      this.y += dy;
    }
  }

  get isAttacking() { return this.attackTimer > 0; }

  // Caixa de ataque à frente do jogador
  getAttackBox() {
    const range = CONFIG.ATTACK_RANGE;
    return {
      x: this.cx + this.dir.x * range - range / 2,
      y: this.cy + this.dir.y * range - range / 2,
      r: range,
    };
  }

  takeDamage(amount) {
    if (this.invuln > 0) return false;
    this.health -= amount;
    this.invuln = CONFIG.PLAYER_INVULN_TIME;
    return true;
  }

  addBattery(amount) {
    this.battery = Math.min(100, this.battery + amount);
  }

  // Raio de luz atual baseado na bateria
  get lightRadius() {
    const t = this.battery / 100;
    return CONFIG.LIGHT_RADIUS_MIN + (CONFIG.LIGHT_RADIUS - CONFIG.LIGHT_RADIUS_MIN) * t;
  }

  draw(ctx, cam) {
    const px = this.cx - cam.x;
    const py = this.cy - cam.y;
    const s = this.size;

    // Piscar quando invulnerável
    if (this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0) return;

    ctx.save();
    ctx.translate(px, py);

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, s / 2 - 2, s / 2.5, s / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo (Bento) — quadradinho azul com leve "balanço" ao andar
    const bob = this.walkFrame === 1 || this.walkFrame === 3 ? -1 : 0;
    ctx.fillStyle = COLORS.playerDark;
    ctx.fillRect(-s / 2, -s / 2 + bob, s, s);
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(-s / 2 + 3, -s / 2 + 3 + bob, s - 6, s - 6);

    // "Rosto" indicando direção
    ctx.fillStyle = '#fff';
    const ex = this.dir.x * 5;
    const ey = this.dir.y * 5;
    ctx.fillRect(-5 + ex, -4 + ey + bob, 3, 3);
    ctx.fillRect(2 + ex, -4 + ey + bob, 3, 3);

    // Efeito de ataque (arco de energia)
    if (this.isAttacking) {
      const range = CONFIG.ATTACK_RANGE;
      ctx.strokeStyle = '#9fd8ff';
      ctx.lineWidth = 4;
      ctx.globalAlpha = this.attackTimer / CONFIG.ATTACK_DURATION;
      const ang = Math.atan2(this.dir.y, this.dir.x);
      ctx.beginPath();
      ctx.arc(this.dir.x * 10, this.dir.y * 10, range * 0.6, ang - 0.9, ang + 0.9);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
