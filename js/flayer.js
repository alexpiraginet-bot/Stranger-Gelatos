import { CONFIG } from './config.js';
import { Assets } from './assets.js';
import { moveBody, aabb } from './physics.js';
import { Enemy } from './enemy.js';

// MENTE-COLMEIA — chefe FINAL (fase 10). O Mind Flayer reimaginado como uma
// colmeia colossal de gelato derretido do Avesso:
//  - anda pesado em direção ao jogador (ciclo de 4 quadros);
//  - de PERTO: golpe de tentáculo que faz tremor + ondas de choque (pule!);
//  - de LONGE: cospe um leque de estilhaços de gelato congelado;
//  - com pouca vida: invoca morcegos do enxame (é uma colmeia).
export class MindFlayer {
  constructor(level, game, cx, cy) {
    this.level = level;
    this.game = game;
    this.name = '🦑 MENTE-COLMEIA';
    this.w = CONFIG.FLAYER_W;
    this.h = CONFIG.FLAYER_H;
    this.hp = Math.round((game.diff?.vecnaHp ?? 16) * 3.0); // chefe FINAL: o mais resistente
    this.maxHp = this.hp;
    this.boltMul = game.diff?.boltSpeed ?? 1;
    this.dead = false;
    this.active = false;
    this.dir = -1;
    this.hitFlash = 0;
    this.animT = 0;
    this.spd = CONFIG.FLAYER_SPEED * (game.diff?.enemySpeed || 1);
    this.slamT = CONFIG.FLAYER_SLAM_CD;
    this.castT = 1.2;
    this.summonT = CONFIG.FLAYER_SUMMON_CD;
    this.windup = 0;     // telegrafa o golpe de tentáculo (pose atk1)
    this.slamAnim = 0;   // executando o golpe (pose atk2)
    this.charge = 0;     // carregando o cuspe (pose cast1)
    this.spew = 0;       // cuspindo (pose cast2)
    this._quaked = false;
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
    b.vy = Math.min(b.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);

    if (!this.active) {
      if (Math.abs(dx) < CONFIG.FLAYER_ACTIVATE) { this.active = true; this.game._bossActivated?.(); }
      else { moveBody(this.level, b, dt); return; }
    }

    this.dir = dx < 0 ? -1 : 1;
    const half = this.hp <= this.maxHp / 2;

    if (this.windup > 0) {                 // telegrafa o golpe (parado, tentáculos erguidos)
      this.windup -= dt; b.vx = 0;
      if (this.windup <= 0) { this.slamAnim = 0.45; this._quaked = false; }
    } else if (this.slamAnim > 0) {        // GOLPE: tremor de terra + ondas de choque
      this.slamAnim -= dt; b.vx = 0;
      if (!this._quaked) { this._quaked = true; this.game.quake?.(this.cx, b.y + b.h); }
    } else if (this.charge > 0) {          // carrega o cuspe (maw abrindo)
      this.charge -= dt; b.vx = 0;
      if (this.charge <= 0) { this._spew(player, half); this.spew = 0.4; }
    } else if (this.spew > 0) {             // cuspindo estilhaços
      this.spew -= dt; b.vx = 0;
    } else {                                // anda em direção ao jogador
      b.vx = this.dir * this.spd * (half ? 1.25 : 1);
      this.slamT -= dt; this.castT -= dt; this.summonT -= dt;
      if (Math.abs(dx) < 96 && this.slamT <= 0) { this.windup = 0.55; this.slamT = CONFIG.FLAYER_SLAM_CD; }
      else if (this.castT <= 0) { this.charge = 0.55; this.castT = CONFIG.FLAYER_CAST_CD; }
      else if (half && this.summonT <= 0) { this._summon(); this.summonT = CONFIG.FLAYER_SUMMON_CD; }
    }

    moveBody(this.level, b, dt);
    if (b.hitWall) b.vx = 0;
    this.animT += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  _spew(player, many) {
    const sp = CONFIG.FLAYER_SHARD_SPEED * this.boltMul;
    const base = Math.atan2(player.cy - this.cy, player.cx - this.cx);
    const spread = many ? [-0.35, -0.17, 0, 0.17, 0.35] : [-0.2, 0, 0.2];
    for (const off of spread) {
      const a = base + off;
      // estilhaços CONGELAM o jogador (paralisa por alguns segundos, sem dano)
      this.game.spawnBossBolt(this.cx + this.dir * 10, this.cy - 6, Math.cos(a) * sp, Math.sin(a) * sp, { spr: 'flayer_shard', freeze: true });
    }
    this.game.audio?.curse?.();
  }

  _summon() {                              // invoca 1–2 morcegos do enxame
    const n = 1 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const cxT = Math.floor(this.cx / CONFIG.TILE) + (i ? -3 : 3);
      this.game.enemies?.push(new Enemy(this.level, this.game, 'demobat', Math.max(2, cxT), 6));
    }
    this.game.audio?.vecna?.(); this.game.shake?.(5);
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
    let name;
    if (this.windup > 0) name = 'flayer_atk1';
    else if (this.slamAnim > 0) name = 'flayer_atk2';
    else if (this.charge > 0) name = 'flayer_cast1';
    else if (this.spew > 0) name = 'flayer_cast2';
    else if (Math.abs(this.body.vx) > 2) name = 'flayer_walk' + (1 + Math.floor(this.animT * 6) % 4);
    else name = 'flayer_walk1';
    const img = Assets.img(name);
    if (!img) return;
    const SC = CONFIG.FLAYER_DRAW_SCALE || 1;
    const w = img.width * cam.s * SC, h = img.height * cam.s * SC;
    const footX = this.body.x + this.w / 2, footY = this.body.y + this.h;
    const cxp = (footX - cam.x) * cam.s, syp = (footY - cam.y) * cam.s;
    // aura vermelha pulsante (Upside Down) por trás do monstro
    const t = this.game.time || 0, pulse = 0.5 + 0.5 * Math.sin(t * 5);
    const grd = ctx.createRadialGradient(cxp, syp - h * 0.5, h * 0.1, cxp, syp - h * 0.5, h * 0.7);
    grd.addColorStop(0, `rgba(220,40,60,${(0.16 + 0.12 * pulse).toFixed(2)})`);
    grd.addColorStop(1, 'rgba(150,10,40,0)');
    ctx.save(); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cxp, syp - h * 0.5, h * 0.7, 0, 6.29); ctx.fill(); ctx.restore();
    ctx.save();
    ctx.imageSmoothingEnabled = true;   // arte ilustrada (não pixel): suaviza p/ não distorcer
    ctx.translate(cxp, syp);
    if (this.dir > 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
    if (this.hitFlash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8; ctx.drawImage(img, -w / 2, -h, w, h); }
    ctx.restore();
  }
}
