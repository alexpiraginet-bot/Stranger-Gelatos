import { CONFIG } from './config.js';
import { Assets } from './assets.js';
import { moveBody, aabb } from './physics.js';

// ALEX — chefe FINAL (estilo Hulk): super força, pulo com tremor de terra
// (ondas de choque que o jogador precisa pular) e arremesso de pedras.
export class AlexBoss {
  constructor(level, game, cx, cy) {
    this.level = level;
    this.game = game;
    this.name = '💪 ALEX';
    this.w = CONFIG.ALEX_W;
    this.h = CONFIG.ALEX_H;
    this.hp = Math.round((game.diff?.vecnaHp ?? 16) * 1.6); // final boss: mais resistente
    this.maxHp = this.hp;
    this.dead = false;
    this.active = false;
    this.dir = -1;
    this.hitFlash = 0;
    this.slamT = CONFIG.ALEX_SLAM_CD;
    this.rockT = 1.0;
    this.spd = CONFIG.ALEX_SPEED * (game.diff?.enemySpeed || 1);
    this.windup = 0;
    this.slamming = false;
    this.animT = 0;
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
    const dx = player.cx - this.cx;

    if (!this.active) {
      if (Math.abs(dx) < CONFIG.ALEX_ACTIVATE) { this.active = true; this.game._bossActivated(); }
      else { b.vy = Math.min(b.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL); moveBody(this.level, b, dt); return; }
    }

    this.dir = dx < 0 ? -1 : 1;
    b.vy = Math.min(b.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);

    if (this.windup > 0) {
      // telegrafa (parado, braços erguidos) antes de pular
      this.windup -= dt; b.vx = 0;
      if (this.windup <= 0) { b.vy = -CONFIG.ALEX_JUMP; this.slamming = true; }
    } else if (this.slamming) {
      b.vx = this.dir * this.spd * 1.2;
      const wasAir = !b.onGround;
      moveBody(this.level, b, dt);
      if (wasAir && b.onGround) {  // ATERRISSOU -> tremor de terra
        this.slamming = false;
        this.game.quake(this.cx, b.y + b.h);
        this.slamT = CONFIG.ALEX_SLAM_CD;
      }
      this.animT += dt; if (this.hitFlash > 0) this.hitFlash -= dt;
      return;
    } else {
      // anda em direção ao jogador; pisão (tremor) de perto, pedra de longe
      b.vx = this.dir * this.spd;
      this.slamT -= dt; this.rockT -= dt;
      if (Math.abs(dx) < 110 && this.slamT <= 0) { this.windup = 0.5; this.slamT = CONFIG.ALEX_SLAM_CD; }
      else if (this.rockT <= 0) { this._throw(player); this.rockT = CONFIG.ALEX_ROCK_CD; }
    }

    moveBody(this.level, b, dt);
    if (b.hitWall) b.vx = 0;
    this.animT += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  _throw(player) {
    const sx = this.cx, sy = this.cy - 6;
    const dxp = player.cx - sx;
    const vx = Math.max(-220, Math.min(220, dxp * 1.1));
    this.game.spawnBossBolt(sx, sy, vx, -220, { g: true, spr: 'rock' });
    this.game.audio?.stomp?.();
  }

  hit(n = 1) {
    if (this.dead) return false;
    this.hp -= n;
    this.hitFlash = 0.14;
    if (this.hp <= 0) { this.dead = true; this.game.audio?.kill(); }
    else this.game.audio?.hit();
    return this.dead;
  }

  collidesPlayer(player) { return this.active && !this.dead && aabb(this.body, player.body); }

  draw(ctx, cam) {
    if (this.dead) return;
    if (this.hitFlash > 0 && Math.floor(this.hitFlash * 24) % 2 === 0) return;
    const slam = this.windup > 0 || this.slamming;
    const img = Assets.img(slam ? 'alex2' : 'alex1');
    if (!img) return;
    const SC = CONFIG.ALEX_DRAW_SCALE || 1;          // "porte" maior
    const w = img.width * cam.s * SC, h = img.height * cam.s * SC;
    const footX = this.body.x + this.w / 2, footY = this.body.y + this.h;
    const sx = (footX - cam.x) * cam.s - w / 2;        // ancora no centro/base da hitbox
    const sy = (footY - cam.y) * cam.s - h;
    ctx.save();
    if (this.dir > 0) { ctx.translate(sx + w, sy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); }
    else ctx.drawImage(img, sx, sy, w, h);
    ctx.restore();
  }
}
