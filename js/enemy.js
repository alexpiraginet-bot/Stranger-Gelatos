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
    this.face = this.dir;

    this.fly = (type === 'demobat');
    if (type === 'demobat') {
      this.hp = CONFIG.DEMOBAT_HP; this.speed = CONFIG.DEMOBAT_SPEED;
      this.w = CONFIG.DEMOBAT_W; this.h = CONFIG.DEMOBAT_H;
      this.sprite = 'demobat'; this.dmg = 1;
    } else if (type === 'spitter') {
      this.hp = CONFIG.SPITTER_HP; this.speed = 0;
      this.w = CONFIG.SPITTER_W; this.h = CONFIG.SPITTER_H;
      this.sprite = 'spitter'; this.dmg = 1;
      this.windup = 0; this.fireT = 1 + Math.random();
    } else if (type === 'demodog') {
      this.hp = CONFIG.DEMODOG_HP; this.speed = CONFIG.DEMODOG_SPEED;
      this.w = CONFIG.DEMODOG_W; this.h = CONFIG.DEMODOG_H;
      this.sprite = 'demodog'; this.dmg = 1;
    } else {
      this.hp = CONFIG.DEMOGORGON_HP; this.speed = CONFIG.DEMOGORGON_SPEED;
      this.w = CONFIG.DEMOGORGON_W; this.h = CONFIG.DEMOGORGON_H;
      this.sprite = 'demogorgon'; this.dmg = 1;
    }
    let mult = (level.speedMul || 1) * (game.diff?.enemySpeed || 1); // fase + dificuldade
    if (this.fly) mult = Math.min(mult, 1.25); // morcego não acumula fase × dificuldade (ficava quase na velocidade do jogador)
    this.speed *= mult;
    this.sightMul = game.diff?.enemySight || 1;
    this.body = {
      x: cx * CONFIG.TILE + (CONFIG.TILE - this.w) / 2,
      y: (cy + 1) * CONFIG.TILE - this.h,
      w: this.w, h: this.h, vx: 0, vy: 0, onGround: false,
    };
    this.baseY = this.body.y - (this.fly ? 0 : 0);
    this.flyT = Math.random() * 6.28;
  }

  get cx() { return this.body.x + this.w / 2; }
  get cy() { return this.body.y + this.h / 2; }

  update(dt, player) {
    if (this.dead) return;
    if (this.body.y > this.level.heightPx + 64) { this.dead = true; return; } // caiu pra fora do mundo (não acumula)
    const b = this.body;
    this.face += (this.dir - this.face) * Math.min(1, dt * 16); // virada suave
    const ddx = player.cx - this.cx;
    const ddy = player.cy - this.cy;
    this.alerted = Math.abs(ddx) < CONFIG.ENEMY_SIGHT * this.sightMul && Math.abs(ddy) < 48;
    if (this.alerted) this.dir = ddx < 0 ? -1 : 1;

    // ----- Spitter (Demoflor): enraizado, telegrafa (abre) e cospe no jogador -----
    if (this.type === 'spitter') {
      b.vx = 0;
      b.vy = Math.min(b.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
      moveBody(this.level, b, dt);
      this.dir = ddx < 0 ? -1 : 1;
      const inRange = Math.abs(ddx) < CONFIG.SPITTER_RANGE * this.sightMul && Math.abs(ddy) < 60;
      this.alerted = inRange;
      if (this.windup > 0) {
        this.windup -= dt;
        if (this.windup <= 0) {
          const a = Math.atan2(player.cy - this.cy, player.cx - this.cx);
          const bs = CONFIG.SPITTER_BOLT * (this.game.diff?.boltSpeed || 1);
          this.game.spawnBossBolt(this.cx, this.cy - 4, Math.cos(a) * bs, Math.sin(a) * bs);
          this.game.audio?.curse?.();
          this.fireT = CONFIG.SPITTER_FIRE;
        }
      } else if (inRange) {
        this.fireT -= dt;
        if (this.fireT <= 0) this.windup = CONFIG.SPITTER_WINDUP;
      }
      this.animT += dt;
      if (this.hitFlash > 0) this.hitFlash -= dt;
      return;
    }

    // ----- Demobat: voa (sem gravidade), persegue em senoide -----
    if (this.fly) {
      this.flyT += dt;
      if (this.knockT > 0) { this.knockT -= dt; b.x += this.knockVx * dt; }
      else { this.dir = ddx < 0 ? -1 : 1; b.x += this.dir * this.speed * dt; }
      b.x = Math.max(0, Math.min(b.x, this.level.widthPx - b.w));
      b.y = this.baseY + Math.sin(this.flyT * 3) * 18;
      this.animT += dt;
      if (this.hitFlash > 0) this.hitFlash -= dt;
      return;
    }

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
    const f = this.fly ? (Math.floor(this.animT * 12) % 2 ? '2' : '1')
      : this.type === 'spitter' ? (this.windup > 0 ? '2' : '1')
      : ((this.alerted || Math.floor(this.animT * 3) % 2 === 0) ? '2' : '1');
    const img = Assets.img(this.sprite + f);
    if (!img) return;
    const w = img.width * cam.s, h = img.height * cam.s;
    const bob = (!this.fly && this.type !== 'spitter') ? Math.sin(this.animT * 7) * 1.2 : 0; // passo suave
    const cxs = (this.body.x + this.w / 2 - cam.x) * cam.s;       // centro
    const sy = (this.body.y + this.h - bob - cam.y) * cam.s - h;  // base nos pés
    let fx = this.face; if (Math.abs(fx) < 0.06) fx = fx < 0 ? -0.06 : 0.06;
    ctx.save();
    ctx.translate(cxs, sy); ctx.scale(fx, 1);
    ctx.drawImage(img, -w / 2, 0, w, h);
    if (this.hitFlash > 0) { // flash branco aditivo ao tomar dano
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85;
      ctx.drawImage(img, -w / 2, 0, w, h);
    }
    ctx.restore();
  }
}
