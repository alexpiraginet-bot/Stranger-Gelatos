import { CONFIG, TILE_SPRITE } from './config.js';
import { buildStage, CAMPAIGN } from './levels.js';
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
    this._hitStop = 0;
    this._shake = 0;
    this.particles = [];
    this._transT = null;
  }

  // ---- juice ----
  shake(a) { this._shake = Math.min(18, Math.max(this._shake, a)); }
  hitStop(s) { this._hitStop = Math.max(this._hitStop, s); }
  _part(x, y, vx, vy, life, color, size = 2, kind = 'dot', text = '') {
    if (this.particles.length > 160) return;
    this.particles.push({ x, y, vx, vy, life, max: life, color, size, kind, text });
  }
  onLand(x, y) { for (let i = 0; i < 6; i++) this._part(x + (Math.random() - 0.5) * 9, y, (Math.random() - 0.5) * 90, -Math.random() * 70, 0.35, '#d9d2c0', 2); }
  spawnMuzzle(x, y) { for (let i = 0; i < 4; i++) this._part(x, y + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 50, 0.1, '#ffd0e6', 2); }
  burst(x, y, color, n = 8) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 50 + Math.random() * 90; this._part(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.45, color, 2); } }
  coinPop(x, y) { this._part(x, y - 6, 0, -46, 0.6, '#ffe14d', 0, 'text', '+1'); }
  doubleFx(x, y) { for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; this._part(x + Math.cos(a) * 6, y, Math.cos(a) * 60, Math.sin(a) * 30 - 10, 0.3, '#bfe6ff', 2); } }

  _updateParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.kind !== 'text') p.vy += 360 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
  _drawParticles(ctx, cam) {
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      if (p.kind === 'text') {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${Math.round(7 * cam.s)}px "Press Start 2P", monospace`;
        ctx.fillText(p.text, (p.x - cam.x) * cam.s, (p.y - cam.y) * cam.s);
      } else {
        ctx.fillStyle = p.color;
        const s = Math.max(1, p.size * cam.s);
        ctx.fillRect((p.x - cam.x) * cam.s, (p.y - cam.y) * cam.s, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  _setState(s) { this.state = s; this.hooks.onState?.(s); }
  _emitHud() {
    this.hooks.onHud?.({
      health: Math.max(0, this.player.health), ammo: this.player.ammo,
      keys: this.player.keys, coins: this.player.coins, phase: this.phase,
      stage: (this.stageIndex || 0) + 1, stages: CAMPAIGN.length, stageName: this.level?.name || '',
    });
  }
  _objective(t) { this.hooks.onObjective?.(t); }

  _resetTransients() {
    this.audio?.stopAmbient();
    if (this._transT) { clearTimeout(this._transT); this._transT = null; }
    this._transitioning = false;
    this._hitStop = 0; this._shake = 0; this.particles = [];
    this.input.reset?.();
  }

  start() {                 // nova campanha do zero
    this._resetTransients();
    this.stageIndex = 0;
    this.keysBanked = 0;
    this.startTime = performance.now();
    this._loadStage();
    this._setState(STATE.PLAYING);
    this._emitHud();
  }

  retry() {                 // tenta de novo a FASE atual (mantém chaves já ganhas)
    this._resetTransients();
    this._loadStage();
    this._setState(STATE.PLAYING);
    this._emitHud();
  }

  _loadStage() {
    const level = buildStage(this.stageIndex);
    this.phase = level.theme === 'normal' ? 'normal' : 'avesso';
    this._load(level);
    if (level.theme === 'avesso') this.audio?.startAmbient();
    if (this.stageIndex === 0) this._objective('🍦 Ache a sorveteria Bentô Gelatos e entre no portal.');
    else if (level.boss) this._objective('🔑 Pegue a última chave, derrote o Vecna e fuja pra casa!');
    else this._objective('🔑 Pegue a chave da fase e alcance o portal roxo!');
  }

  _advanceStage() {
    if (this._transitioning) return;
    this._transitioning = true;
    this.keysBanked = this.player.keys;
    this.audio?.portal();
    this.audio?.stopAmbient();
    const next = this.stageIndex + 1;
    const title = this.stageIndex === 0 ? 'ENTRANDO NO AVESSO' : `FASE ${next + 1}`;
    const sub = CAMPAIGN[next] ? CAMPAIGN[next].name : '';
    this.hooks.onTransition?.(title, sub);
    this._setState(STATE.TRANSITION);
    this._transT = setTimeout(() => {
      this._transT = null;
      this._transitioning = false;
      this.stageIndex = next;
      this._loadStage();
      this._setState(STATE.PLAYING);
      this._emitHud();
    }, 1400);
  }

  _load(level) {
    this.level = level;
    this.player = new Player(level, this);
    this.player.keys = this.keysBanked;
    this.player.health = CONFIG.MAX_HEALTH;
    this.player.ammo = CONFIG.START_AMMO;
    this.stageKeyGot = false;
    this.enemies = [];
    this.items = [];
    this.decor = [];
    this.portal = null;
    this.boss = null;
    for (const e of level.entities) {
      if (e.type === 'demogorgon' || e.type === 'demodog') this.enemies.push(new Enemy(level, this, e.type, e.cx, e.cy));
      else if (e.type === 'vecna') this.boss = new Boss(level, this, e.cx, e.cy);
      else if (e.type === 'decor') this.decor.push({ sprite: e.sprite, x: e.cx * CONFIG.TILE, bottom: (e.cy + 1) * CONFIG.TILE });
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
    this.shake(8);
    this._objective('🕯️ VECNA! Derrote-o para abrir o portal!');
  }

  _bossDefeated() {
    this.audio?.portal?.();   // som distinto (o jingle de vitória fica p/ a fuga)
    this.shake(14);
    if (this.boss) this.burst(this.boss.cx, this.boss.cy, '#b14aff', 22);
    this._objective('💥 Vecna caiu! Fuja pelo portal roxo!');
  }

  update(dt) {
    this.time += dt;
    this._shake *= 0.85;
    if (this.state !== STATE.PLAYING) return;
    if (this._hitStop > 0) { this._hitStop -= dt; return; } // congela no impacto
    dt = Math.min(dt, 0.04);
    this._updateParticles(dt);

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
          const died = e.hit(1);
          e.knockback(Math.sign(p.vx) || 1);
          this.hitStop(0.03); this.shake(3);
          if (died) this.burst(e.cx, e.cy, e.type === 'demodog' ? '#a83a2a' : '#c1272d');
          else this._part(p.x, p.y, 0, 0, 0.18, '#ffffff', 3);
          p.dead = true; break;
        }
      }
      if (!p.dead && this.boss && this.boss.active && !this.boss.dead) {
        const bb = this.boss.body;
        if (p.x > bb.x && p.x < bb.x + bb.w && p.y > bb.y && p.y < bb.y + bb.h) {
          const died = this.boss.hit(1); p.dead = true;
          this.hitStop(0.05); this.shake(5);
          this._part(p.x, p.y, 0, 0, 0.2, '#ffffff', 3);
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
        const stomp = pb.vy > 0 && (pb.y + pb.h) - e.body.y < 18;
        if (stomp) {
          const died = e.hit(1); this.player.bounce(); this.audio?.stomp();
          this.hitStop(0.04); this.shake(4);
          if (died) this.burst(e.cx, e.cy, e.type === 'demodog' ? '#a83a2a' : '#c1272d');
        } else if (this.player.hurt(e.dmg, e.cx)) {
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
        if (this.player.hurt(CONFIG.VECNA_CONTACT_DMG, this.boss.cx)) {
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
        if (this.player.hurt(1, bolt.x)) {
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
        if (it.type === 'key') { this.stageKeyGot = true; this.player.keys++; this.audio?.key();
          this._objective(this.level.boss ? '✅ 3ª chave! Derrote o Vecna e fuja!' : '✅ Chave pega! Vá para o portal roxo!'); }
        else if (it.type === 'whey') { this.player.heal(CONFIG.WHEY_HEAL); this.audio?.pickup(); }
        else if (it.type === 'freezer') { this.player.addAmmo(CONFIG.AMMO_PER_FREEZER); this.audio?.pickup();
          this._objective(`🧊 Freezer! +${CONFIG.AMMO_PER_FREEZER} Bentolés 🍦`); }
        else if (it.type === 'coin') { this.player.coins++; this.audio?.coin(); this.coinPop(it.box.x + it.box.w / 2, it.box.y); }
        this._emitHud();
      }
    }

    // portal
    if (this.portal && this.portal.collidesPlayer(this.player)) {
      if (this.phase === 'normal') {
        this._advanceStage();
      } else if (this.level.boss) {
        const bossDown = !this.boss || this.boss.dead;
        if (this.stageKeyGot && bossDown) { this.audio?.win(); this.audio?.stopAmbient(); this._setState(STATE.WIN); }
        else if (!this.stageKeyGot) this._objective('🔒 Pegue a 3ª chave antes de escapar!');
        else this._objective('🕯️ Derrote o Vecna para abrir o portal!');
      } else {
        if (this.stageKeyGot) this._advanceStage();
        else this._objective('🔒 Pegue a chave da fase antes do portal!');
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

    ctx.save();
    const sh = this._shake;
    if (sh > 0.3) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

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

    this._drawDecor(ctx, cam);
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

    this._drawParticles(ctx, cam);
    ctx.restore();
  }

  _drawDecor(ctx, cam) {
    const dark = this.phase === 'avesso';
    for (const dcr of this.decor) {
      const img = Assets.img(dcr.sprite);
      if (!img) continue;
      const w = img.width * cam.s, h = img.height * cam.s;
      const sx = (dcr.x - cam.x) * cam.s;
      if (sx > this.canvas.width + 40 || sx + w < -40) continue; // fora da tela
      const sy = (dcr.bottom - img.height - cam.y) * cam.s;
      ctx.drawImage(img, sx, sy, w, h);
      if (dark && dcr.sprite !== 'vines') { // corrompe (escurece) no Avesso
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#180a26'; ctx.fillRect(sx, sy, w, h); ctx.globalAlpha = 1;
      }
    }
  }

  _drawBg() {
    const ctx = this.ctx, cam = this.camera, cv = this.canvas;
    const img = Assets.img(this.level.bg);
    if (!img || !img.height) { ctx.fillStyle = this.phase === 'avesso' ? '#0a0410' : '#8fb8dc'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
    const scale = cv.height / img.height;
    const w = img.width * scale;
    const off = (-cam.x * cam.s * 0.3) % w;
    for (let x = off - w; x < cv.width; x += w) ctx.drawImage(img, x, 0, w, cv.height);
  }
}
