import { CONFIG, TILE_SPRITE } from './config.js';
import { buildNormal, buildAvesso } from './levels.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Item } from './items.js';
import { Boss } from './boss.js';
import { Camera } from './camera.js';
import { Assets } from './assets.js';

export const STATE = { START: 'start', PLAYING: 'playing', TRANSITION: 'transition', GAMEOVER: 'gameover', WIN: 'win' };

export class Game {
  constructor(canvas, input, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.hooks = hooks;
    this.audio = hooks.audio;
    this.camera = new Camera();
    this.state = STATE.START;
    this.time = 0;
    this.phase = 'normal';
  }

  _setState(s) { this.state = s; this.hooks.onState?.(s); }
  _emitHud() {
    this.hooks.onHud?.({
      health: Math.max(0, this.player.health), ammo: this.player.ammo,
      keys: this.player.keys, coins: this.player.coins, phase: this.phase,
    });
  }
  _objective(t) { this.hooks.onObjective?.(t); }

  start() {
    this.audio?.stopAmbient();
    this.phase = 'normal';
    this.startTime = performance.now();
    this._load(buildNormal());
    this._setState(STATE.PLAYING);
    this._emitHud();
    this._objective('🍦 Ache a sorveteria Bentô Gelatos e entre no portal.');
  }

  _load(level) {
    this.level = level;
    this.player = new Player(level, this);
    this.enemies = [];
    this.items = [];
    this.portal = null;
    this.boss = null;
    for (const e of level.entities) {
      if (e.type === 'demogorgon' || e.type === 'demodog') this.enemies.push(new Enemy(level, this, e.type, e.cx, e.cy));
      else if (e.type === 'vecna') this.boss = new Boss(level, this, e.cx, e.cy);
      else if (e.type === 'portal') { this.portal = new Item(level, 'portal', e.cx, e.cy); this.items.push(this.portal); }
      else this.items.push(new Item(level, e.type, e.cx, e.cy));
    }
    this.projectiles = [];
    this.bossBolts = [];
    this.hooks.onBoss?.({ exists: !!this.boss, active: false, dead: false, hp: 0, max: 1 });
    this.camera.follow(this.player, level, this.canvas, true);
    this._stepT = 0; this._growlT = 0;
  }

  spawnProjectile(x, y, dir) {
    this.projectiles.push({ x, y, vx: dir * CONFIG.PROJ_SPEED, life: CONFIG.PROJ_LIFE });
  }

  spawnBossBolt(x, y, vx, vy) {
    this.bossBolts.push({ x, y, vx, vy, life: 4 });
  }

  _bossActivated() {
    this.audio?.vecna?.();
    this._objective('🕯️ VECNA! Derrote-o para abrir o portal!');
  }

  _bossDefeated() {
    this.audio?.win?.();
    this._objective('💥 Vecna caiu! Fuja pelo portal roxo!');
  }

  _enterAvesso() {
    if (this._transitioning) return;
    this._transitioning = true;
    this.audio?.portal();
    this._setState(STATE.TRANSITION);
    this._objective('Entrando no Avesso...');
    setTimeout(() => {
      this.phase = 'avesso';
      this._load(buildAvesso());
      this.audio?.startAmbient();
      this._transitioning = false;
      this._setState(STATE.PLAYING);
      this._emitHud();
      this._objective('🔑 Ache as 3 chaves e fuja pelo portal. Freezers 🧊 dão munição!');
    }, 1400);
  }

  update(dt) {
    this.time += dt;
    if (this.state !== STATE.PLAYING) return;
    dt = Math.min(dt, 0.04);

    this.player.update(dt, this.input);

    // passos
    this._stepT -= dt;
    if (this.player.body.onGround && Math.abs(this.player.body.vx) > 5 && this._stepT <= 0) {
      this.audio?.footstep(); this._stepT = 0.3;
    }

    // projéteis
    for (const p of this.projectiles) {
      p.x += p.vx * dt; p.life -= dt;
      const cx = Math.floor(p.x / CONFIG.TILE), cy = Math.floor(p.y / CONFIG.TILE);
      if (p.life <= 0 || this.level.solidAt(cx, cy)) { p.dead = true; continue; }
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (p.x > e.body.x && p.x < e.body.x + e.w && p.y > e.body.y && p.y < e.body.y + e.h) {
          e.hit(1); p.dead = true; break;
        }
      }
      if (!p.dead && this.boss && this.boss.active && !this.boss.dead) {
        const bb = this.boss.body;
        if (p.x > bb.x && p.x < bb.x + bb.w && p.y > bb.y && p.y < bb.y + bb.h) {
          const died = this.boss.hit(1); p.dead = true;
          if (died) this._bossDefeated();
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // inimigos + contato/pisão
    let nearAlert = false;
    for (const e of this.enemies) {
      e.update(dt, this.player);
      if (e.alerted && Math.abs(e.cx - this.player.cx) < 120) nearAlert = true;
      if (e.collidesPlayer(this.player)) {
        const pb = this.player.body;
        const stomp = pb.vy > 40 && (pb.y + pb.h) - e.body.y < 14;
        if (stomp) {
          e.hit(1); this.player.bounce(); this.audio?.stomp();
        } else if (this.player.hurt(e.dmg)) {
          this._emitHud();
          if (this.player.health <= 0) return this._gameover();
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    this._growlT -= dt;
    if (nearAlert && this._growlT <= 0) { this.audio?.growl(); this._growlT = 1.8 + Math.random() * 2.4; }

    // ----- Chefe Vecna -----
    if (this.boss && !this.boss.dead) {
      this.boss.update(dt, this.player);
      if (this.boss.collidesPlayer(this.player)) {
        if (this.player.hurt(CONFIG.VECNA_CONTACT_DMG)) {
          this._emitHud();
          if (this.player.health <= 0) return this._gameover();
        }
      }
    }
    // maldições do Vecna
    for (const bolt of this.bossBolts) {
      bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt; bolt.life -= dt;
      const cx = Math.floor(bolt.x / CONFIG.TILE), cy = Math.floor(bolt.y / CONFIG.TILE);
      if (bolt.life <= 0 || this.level.solidAt(cx, cy)) { bolt.dead = true; continue; }
      const pb = this.player.body;
      if (bolt.x > pb.x && bolt.x < pb.x + pb.w && bolt.y > pb.y && bolt.y < pb.y + pb.h) {
        bolt.dead = true;
        if (this.player.hurt(1)) {
          this._emitHud();
          if (this.player.health <= 0) return this._gameover();
        }
      }
    }
    this.bossBolts = this.bossBolts.filter((b) => !b.dead);
    if (this.boss) this.hooks.onBoss?.({ exists: true, active: this.boss.active, dead: this.boss.dead, hp: Math.max(0, this.boss.hp), max: this.boss.maxHp });

    // itens
    for (const it of this.items) {
      if (it.collected || it === this.portal || it.type === 'shop') continue;
      if (it.collidesPlayer(this.player)) {
        it.collect();
        if (it.type === 'key') { this.player.keys++; this.audio?.key();
          if (this.player.keys >= CONFIG.TOTAL_KEYS) this._objective('✅ Todas as chaves! Corra para o portal roxo!'); }
        else if (it.type === 'whey') { this.player.heal(CONFIG.WHEY_HEAL); this.audio?.pickup(); }
        else if (it.type === 'freezer') { this.player.addAmmo(CONFIG.AMMO_PER_FREEZER); this.audio?.pickup();
          this._objective(`🧊 Freezer! +${CONFIG.AMMO_PER_FREEZER} Bentolés 🍦`); }
        else if (it.type === 'coin') { this.player.coins++; this.audio?.coin(); }
        this._emitHud();
      }
    }

    // portal
    if (this.portal && this.portal.collidesPlayer(this.player)) {
      if (this.phase === 'normal') this._enterAvesso();
      else {
        const bossDown = !this.boss || this.boss.dead;
        if (this.player.keys >= CONFIG.TOTAL_KEYS && bossDown) {
          this.audio?.win(); this.audio?.stopAmbient(); this._setState(STATE.WIN);
        } else if (this.player.keys < CONFIG.TOTAL_KEYS) {
          this._objective('🔒 Pegue as 3 chaves antes de escapar!');
        } else if (!bossDown) {
          this._objective('🕯️ Derrote o Vecna para abrir o portal!');
        }
      }
    }

    this.camera.follow(this.player, this.level, this.canvas);
    this._emitHud();
  }

  _gameover() { this.audio?.lose(); this.audio?.stopAmbient(); this._setState(STATE.GAMEOVER); }

  // ---------------- DESENHO ----------------
  draw() {
    const ctx = this.ctx, cam = this.camera, cv = this.canvas;
    ctx.imageSmoothingEnabled = false;
    if (!this.level) { ctx.clearRect(0, 0, cv.width, cv.height); return; }

    this._drawBg();

    const T = CONFIG.TILE;
    const viewW = cv.width / cam.s, viewH = cv.height / cam.s;
    const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(this.level.cols - 1, Math.floor((cam.x + viewW) / T) + 1);
    const r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.min(this.level.rows - 1, Math.floor((cam.y + viewH) / T) + 1);
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const ch = this.level.tile(cx, cy);
        const spr = TILE_SPRITE[ch];
        if (!spr) continue;
        const img = Assets.img(spr);
        if (img) ctx.drawImage(img, (cx * T - cam.x) * cam.s, (cy * T - cam.y) * cam.s, T * cam.s, T * cam.s);
      }
    }

    for (const it of this.items) it.draw(ctx, cam, this.time);
    for (const e of this.enemies) e.draw(ctx, cam);
    if (this.boss) this.boss.draw(ctx, cam);
    this.player.draw(ctx, cam);

    // maldições do Vecna
    const curse = Assets.img('curse');
    for (const b of this.bossBolts) {
      if (curse) ctx.drawImage(curse, (b.x - 7 - cam.x) * cam.s, (b.y - 7 - cam.y) * cam.s, curse.width * cam.s, curse.height * cam.s);
    }

    const pop = Assets.img('popsicle');
    for (const p of this.projectiles) {
      if (pop) ctx.drawImage(pop, (p.x - 5 - cam.x) * cam.s, (p.y - 8 - cam.y) * cam.s, pop.width * cam.s, pop.height * cam.s);
    }
  }

  _drawBg() {
    const ctx = this.ctx, cam = this.camera, cv = this.canvas;
    const img = Assets.img(this.level.bg);
    if (!img) { ctx.fillStyle = this.phase === 'avesso' ? '#0a0410' : '#8fb8dc'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
    const scale = cv.height / img.height;
    const w = img.width * scale;
    const off = (-cam.x * cam.s * 0.3) % w;
    for (let x = off - w; x < cv.width; x += w) ctx.drawImage(img, x, 0, w, cv.height);
  }
}
