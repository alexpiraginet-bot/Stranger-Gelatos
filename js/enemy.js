import { CONFIG } from './config.js';
import { moveBody, groundAhead, aabb } from './physics.js';
import { Assets } from './assets.js';

export class Enemy {
  constructor(level, game, type, cx, cy) {
    this.level = level;
    this.game = game;
    this.type = type;
    this.dead = false;
    this.hitFlash = 0;
    this.knockT = 0;
    this.animT = Math.random() * 2;
    this.alerted = false;
    this.dir = Math.random() < 0.5 ? -1 : 1;

    if (type === 'demodog') {
      this.hp = CONFIG.DEMODOG_HP; this.speed = CONFIG.DEMODOG_SPEED;
      this.w = CONFIG.DEMODOG_W; this.h = CONFIG.DEMODOG_H;
      this.sprite = 'demodog'; this.dmg = 1;
    } else {
      this.hp = CONFIG.DEMOGORGON_HP; this.speed = CONFIG.DEMOGORGON_SPEED;
      this.w = CONFIG.DEMOGORGON_W; this.h = CONFIG.DEMOGORGON_H;
      this.sprite = 'demogorgon'; this.dmg = 1;
    }
    this.speed *= (level.speedMul || 1); // mais rápido nas fases avançadas
    this.body = {
      x: cx * CONFIG.TILE + (CONFIG.TILE - this.w) / 2,
      y: (cy + 1) * CONFIG.TILE - this.h,
      w: this.w, h: this.h, vx: 0, vy: 0, onGround: false,
    };
  }

  get cx() { return this.body.x + this.w / 2; }
  get cy() { return this.body.y + this.h / 2; }

  update(dt, player) {
    if (this.dead) return;
    const b = this.body;
    const ddx = player.cx - this.cx;
    const ddy = player.cy - this.cy;
    this.alerted = Math.abs(ddx) < CONFIG.ENEMY_SIGHT && Math.abs(ddy) < 48;
    if (this.alerted) this.dir = ddx < 0 ? -1 : 1;

    if (this.knockT > 0) { this.knockT -= dt; b.vx = this.knockVx; }
    else b.vx = this.dir * this.speed * (this.alerted ? 1 : 0.6);
    b.vy = Math.min(b.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
    moveBody(this.level, b, dt);

    // vira na parede ou na beirada (pra não cair) — só quando não está sob knockback
    if (this.knockT <= 0) {
      const frontX = this.dir > 0 ? b.x + b.w + 1 : b.x - 1;
      if (b.hitWall) this.dir *= -1;
      else if (b.onGround && !groundAhead(this.level, frontX, b.y + b.h)) this.dir *= -1;
    }

    this.animT += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  knockback(dir) { this.knockT = 0.12; this.knockVx = dir * 150; }

  hit(n = 1) {
    this.hp -= n;
    this.hitFlash = 0.18;
    if (this.hp <= 0) { this.dead = true; this.game.audio?.kill(); }
    else this.game.audio?.hit();
    return this.dead;
  }

  collidesPlayer(player) { return !this.dead && aabb(this.body, player.body); }

  draw(ctx, cam) {
    if (this.dead) return;
    const f = (this.alerted || Math.floor(this.animT * 3) % 2 === 0) ? '2' : '1';
    const img = Assets.img(this.sprite + f);
    if (!img) return;
    const ox = (img.width - this.w) / 2;
    const oy = img.height - this.h;
    const sx = (this.body.x - ox - cam.x) * cam.s;
    const sy = (this.body.y - oy - cam.y) * cam.s;
    const w = img.width * cam.s, h = img.height * cam.s;
    ctx.save();
    if (this.dir < 0) { ctx.translate(sx + w, sy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); }
    else ctx.drawImage(img, sx, sy, w, h);
    // flash branco aditivo ao tomar dano (não some o sprite)
    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85;
      if (this.dir < 0) ctx.drawImage(img, 0, 0, w, h); else ctx.drawImage(img, sx, sy, w, h);
    }
    ctx.restore();
  }
}
