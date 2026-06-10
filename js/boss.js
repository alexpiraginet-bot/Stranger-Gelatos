import { CONFIG } from './config.js';
import { Assets } from './assets.js';
import { aabb } from './physics.js';

// VECNA — chefe final do Avesso. Flutua, persegue e lança maldições.
export class Boss {
  constructor(level, game, cx, cy) {
    this.level = level;
    this.game = game;
    this.w = CONFIG.VECNA_W;
    this.h = CONFIG.VECNA_H;
    this.hp = game.diff?.vecnaHp ?? CONFIG.VECNA_HP;
    this.maxHp = this.hp;
    this.fireRate = game.diff?.vecnaFire ?? CONFIG.VECNA_FIRE;
    this.boltMul = game.diff?.boltSpeed ?? 1;
    this.dead = false;
    this.active = false;
    this.dir = -1;
    this.fireT = this.fireRate;
    this.bob = 0;
    this.hitFlash = 0;
    this.attackAnim = 0;
    const groundY = (cy + 1) * CONFIG.TILE;
    this.baseY = groundY - this.h - 14;
    this.spawnX = cx * CONFIG.TILE;
    this.body = { x: this.spawnX, y: this.baseY, w: this.w, h: this.h };
  }

  get cx() { return this.body.x + this.w / 2; }
  get cy() { return this.body.y + this.h / 2; }

  update(dt, player) {
    if (this.dead) return;
    const dx = player.cx - this.cx;

    if (!this.active) {
      if (Math.abs(dx) < CONFIG.VECNA_ACTIVATE) { this.active = true; this.game._bossActivated(); }
      else return;
    }

    // segue o jogador devagar, preso à arena do fim da fase
    const target = player.cx - this.w / 2;
    this.body.x += Math.sign(target - this.body.x) * CONFIG.VECNA_SPEED * dt;
    const minX = this.spawnX - 90, maxX = this.level.widthPx - this.w - 8;
    this.body.x = Math.max(minX, Math.min(maxX, this.body.x));
    this.dir = dx < 0 ? -1 : 1;

    // flutua
    this.bob += dt;
    this.body.y = this.baseY + Math.sin(this.bob * 1.5) * 9;

    // lança maldições miradas no jogador
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireT = this.fireRate;
      this.attackAnim = 0.5;
      this._cast(player);
    }
    if (this.attackAnim > 0) this.attackAnim -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  _cast(player) {
    const sp = CONFIG.VECNA_BOLT_SPEED * this.boltMul;
    const aimX = player.cx - this.cx, aimY = player.cy - this.cy;
    const len = Math.hypot(aimX, aimY) || 1;
    const base = Math.atan2(aimY, aimX);
    // quando com pouca vida, atira em leque (3)
    const spread = this.hp <= this.maxHp / 2 ? [-0.25, 0, 0.25] : [0];
    for (const off of spread) {
      const a = base + off;
      this.game.spawnBossBolt(this.cx, this.cy, Math.cos(a) * sp, Math.sin(a) * sp);
    }
    this.game.audio?.curse?.();
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
    const img = Assets.img(this.attackAnim > 0 ? 'vecna2' : 'vecna1');
    if (!img) return;
    const ox = (img.width - this.w) / 2;
    const oy = img.height - this.h;
    const sx = (this.body.x - ox - cam.x) * cam.s;
    const sy = (this.body.y - oy - cam.y) * cam.s;
    ctx.save();
    if (this.dir > 0) {
      ctx.translate(sx + img.width * cam.s, sy); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, img.width * cam.s, img.height * cam.s);
    } else {
      ctx.drawImage(img, sx, sy, img.width * cam.s, img.height * cam.s);
    }
    ctx.restore();
  }
}
