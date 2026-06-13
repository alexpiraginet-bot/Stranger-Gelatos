import { CONFIG } from './config.js';
import { Assets } from './assets.js';
import { aabb } from './physics.js';

// VECNA — chefe final do Avesso. Flutua, persegue e lança maldições.
export class Boss {
  constructor(level, game, cx, cy, evolved = false) {
    this.level = level;
    this.game = game;
    this.evolved = evolved;
    this.name = evolved ? '🕯️ VECNA SUPREMO' : '🕯️ VECNA';
    this.scale = evolved ? 1.5 : 1;
    this.w = CONFIG.VECNA_W * this.scale;
    this.h = CONFIG.VECNA_H * this.scale;
    const baseHp = game.diff?.vecnaHp ?? CONFIG.VECNA_HP;
    this.hp = Math.round(baseHp * (evolved ? 1.9 : 1)) + (evolved ? 6 : 0);
    this.maxHp = this.hp;
    this.fireRate = (game.diff?.vecnaFire ?? CONFIG.VECNA_FIRE) * (evolved ? 0.68 : 1);
    this.boltMul = (game.diff?.boltSpeed ?? 1) * (evolved ? 1.2 : 1);
    this.speed = CONFIG.VECNA_SPEED * (evolved ? 1.55 : 1);
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
    this.body.x += Math.sign(target - this.body.x) * this.speed * dt;
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
    // leque de maldições — o SUPREMO atira muito mais e mais aberto
    const low = this.hp <= this.maxHp / 2;
    const spread = this.evolved
      ? (low ? [-0.5, -0.25, 0, 0.25, 0.5] : [-0.3, 0, 0.3])
      : (low ? [-0.25, 0, 0.25] : [0]);
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
    const dw = img.width * cam.s * this.scale, dh = img.height * cam.s * this.scale;
    const cxp = (this.cx - cam.x) * cam.s;
    const footY = (this.body.y + this.h - cam.y) * cam.s;
    // aura roxa pulsante do SUPREMO (forma evoluída)
    if (this.evolved) {
      const t = this.game.time || 0, pulse = 0.5 + 0.5 * Math.sin(t * 6);
      const cyp = (this.cy - cam.y) * cam.s, rad = dh * 0.7 + pulse * 8 * cam.s;
      const grd = ctx.createRadialGradient(cxp, cyp, rad * 0.2, cxp, cyp, rad);
      grd.addColorStop(0, `rgba(180,70,225,${(0.22 + 0.14 * pulse).toFixed(2)})`);
      grd.addColorStop(1, 'rgba(120,20,160,0)');
      ctx.save(); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cxp, cyp, rad, 0, 6.29); ctx.fill(); ctx.restore();
    }
    ctx.save();
    ctx.translate(cxp, footY);
    if (this.dir > 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -dw / 2, -dh, dw, dh);
    ctx.restore();
  }
}
