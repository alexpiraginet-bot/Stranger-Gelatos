import { CONFIG, TILE_SPRITE, DIFFICULTIES, WEAPONS } from './config.js';
import { buildStage, CAMPAIGN } from './levels.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Item } from './items.js';
import { Boss } from './boss.js';
import { AlexBoss } from './alex.js';
import { MindFlayer } from './flayer.js';
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
    this._powerFlash = 0;
    this.particles = [];
    this._transT = null;
    // céu animado: estrelas, nuvens e relâmpagos do Avesso
    this._stars = Array.from({ length: 42 }, () => ({ x: Math.random(), y: Math.random() * 0.5, p: Math.random() * 6.28 }));
    this._clouds = Array.from({ length: 4 }, () => ({ x: Math.random(), y: 0.06 + Math.random() * 0.22, s: 0.7 + Math.random() * 0.7, v: 7 + Math.random() * 9 }));
    this._lightT = 5; this._lightFlash = 0; this._boltPts = null;
    this.diff = DIFFICULTIES.medium;
  }

  setDifficulty(key) { this.diff = DIFFICULTIES[key] || DIFFICULTIES.medium; }

  _makeBolt() {
    const pts = [];
    let x = 0.15 + Math.random() * 0.7, y = 0;
    while (y < 0.55) { pts.push([x, y]); y += 0.05 + Math.random() * 0.07; x += (Math.random() - 0.5) * 0.07; }
    return pts;
  }

  // ---- juice ----
  shake(a) { this._shake = Math.min(18, Math.max(this._shake, a)); }
  hitStop(s) { this._hitStop = Math.max(this._hitStop, s); }
  powerFlash() { this._powerFlash = 0.55; }
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
      progress: this.level ? Math.max(0, Math.min(1, this.player.cx / this.level.widthPx)) : 0,
      weapon: this.currentWeapon().id,
      weaponIcon: this.currentWeapon().icon,
      weaponName: this.currentWeapon().name,
      inventory: (this.inventory || ['bento']).map((id) => WEAPONS[id]?.icon || '?'),
      invIdx: this.weaponIdx || 0,
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
    this.checkpoint = null;
    this.kills = 0;
    this.bossKilled = false;
    this.hasBazooka = false;
    this.inventory = ['bento'];   // inventário (persiste pela run; ganha armas dos blocos)
    this.weaponIdx = 0;
    this.startTime = performance.now();
    this._loadStage();
  }

  retry() {                 // tenta a FASE atual de novo, no último checkpoint
    this._resetTransients();
    this.phase = this.level.theme === 'normal' ? 'normal' : 'avesso';
    this._load(this.level, this.checkpoint);
    this._stageIntro();
    this._setState(STATE.PLAYING);
    this._emitHud();
  }

  _loadStage() {
    this.checkpoint = null;
    const level = buildStage(this.stageIndex);
    this.phase = level.theme === 'normal' ? 'normal' : 'avesso';
    this._load(level, null);
    this._stageIntro();
    this._setState(STATE.PLAYING);
    this._emitHud();
  }

  _stageIntro() {
    if (this.phase === 'avesso') this.audio?.startAmbient();
    if (this.stageIndex === 0) this._objective('🍦 Ache a sorveteria Bentô Gelatos e entre no portal.');
    else if (this.level.alex) this._objective('🦑 CONFRONTO FINAL: destrua a MENTE-COLMEIA!');
    else if (this.level.boss) this._objective('🔑 Pegue a última chave, derrote o Vecna e fuja pra casa!');
    else this._objective('🔑 Pegue a chave da fase e alcance o portal roxo!');
  }

  _advanceStage() {
    if (this._transitioning) return;
    this._transitioning = true;
    this.keysBanked = this.player.keys;
    this.audio?.portal();
    this.audio?.stopAmbient();
    const next = this.stageIndex + 1;
    // ao sair da Cidade entra no Avesso (tema do nosso estado)
    const avessoIntro = this.stageIndex === 0;
    const title = avessoIntro ? 'ESPÍRITO SANTO DO "AVESSO"' : `FASE ${next + 1}`;
    const sub = avessoIntro ? 'O mundo se inverte... 🌀' : (CAMPAIGN[next] ? CAMPAIGN[next].name : '');
    this.hooks.onTransition?.(title, sub, avessoIntro);
    if (avessoIntro) this.audio?.thunder?.();
    this._setState(STATE.TRANSITION);
    const dur = avessoIntro ? 2400 : 1400;   // dá mais tempo p/ curtir o efeito
    this._transT = setTimeout(() => {
      this._transT = null;
      this._transitioning = false;
      this.stageIndex = next;
      this._loadStage();
    }, dur);
  }

  _load(level, spawn) {
    this.level = level;
    this.player = new Player(level, this);
    if (spawn) {
      this.player.body.x = spawn.cx * CONFIG.TILE;
      this.player.body.y = (spawn.cy + 1) * CONFIG.TILE - CONFIG.PLAYER_H;
      this.player.lastSafe = { x: this.player.body.x, y: this.player.body.y };
    }
    this.player.keys = this.keysBanked;
    this.player.maxHealth = this.diff.health;
    this.player.health = this.diff.health;
    this.player.ammo = this.diff.ammo;
    if (!this.inventory) { this.inventory = ['bento']; this.weaponIdx = 0; }
    this.weaponIdx = Math.max(0, Math.min(this.weaponIdx || 0, this.inventory.length - 1));
    this.stageKeyGot = false;
    this.enemies = [];
    this.items = [];
    this.decor = [];
    this.npcs = [];
    this.cps = [];
    this.shocks = [];
    this.portal = null;
    this.boss = null;
    this.bossDownHandled = false;
    for (const e of level.entities) {
      if (e.type === 'demogorgon' || e.type === 'demodog' || e.type === 'demobat' || e.type === 'spitter') this.enemies.push(new Enemy(level, this, e.type, e.cx, e.cy));
      else if (e.type === 'vecna') this.boss = new Boss(level, this, e.cx, e.cy, e.evolved);
      else if (e.type === 'alex') this.boss = new AlexBoss(level, this, e.cx, e.cy);
      else if (e.type === 'flayer') this.boss = new MindFlayer(level, this, e.cx, e.cy);
      else if (e.type === 'npc') this.npcs.push({ sprite: e.sprite, name: e.name, x: e.cx * CONFIG.TILE, bottom: (e.cy + 1) * CONFIG.TILE });
      else if (e.type === 'decor') this.decor.push({ sprite: e.sprite, x: e.cx * CONFIG.TILE, bottom: (e.cy + 1) * CONFIG.TILE });
      else if (e.type === 'checkpoint') {
        const x = e.cx * CONFIG.TILE, bottom = (e.cy + 1) * CONFIG.TILE;
        this.cps.push({ cx: e.cx, cy: e.cy, x, bottom, box: { x, y: bottom - 26, w: 16, h: 26 }, active: !!(this.checkpoint && this.checkpoint.cx === e.cx) });
      }
      else if (e.type === 'portal') { this.portal = new Item(level, 'portal', e.cx, e.cy); this.items.push(this.portal); }
      else this.items.push(new Item(level, e.type, e.cx, e.cy));
    }
    this.projectiles = [];
    this.bossBolts = [];
    this.pops = [];
    this.hooks.onBoss?.({ exists: !!this.boss, active: false, dead: false, hp: 0, max: 1 });
    // marcadores da barra de progresso (checkpoints, chefe e portal)
    const marks = this.cps.map((cp) => ({ p: cp.x / level.widthPx, icon: '🚩' }));
    if (this.boss) marks.push({ p: this.boss.body.x / level.widthPx, icon: '🕯️' });
    if (this.portal) marks.push({ p: this.portal.box.x / level.widthPx, icon: '🌀' });
    this.hooks.onMarkers?.(marks);
    this.camera.follow(this.player, level, this.canvas, true);
    this._stepT = 0; this._growlT = 0;
  }

  spawnProjectile(x, y, dir, dmg = 1, spr = 'popsicle') {
    this.projectiles.push({ x, y, vx: dir * CONFIG.PROJ_SPEED, vy: 0, life: CONFIG.PROJ_LIFE, dmg, spr });
  }

  // raio teleguiado: persegue o ser vivo mais próximo (ótimo contra morcegos)
  spawnHomingBolt(x, y, dir, dmg = CONFIG.ZAP_DMG) {
    this.projectiles.push({
      x, y, vx: dir * CONFIG.ZAP_SPEED, vy: 0, life: CONFIG.PROJ_LIFE * 1.7,
      dmg, spr: 'zap', homing: true,
    });
  }

  // alvo vivo mais próximo (inimigos + chefe ativo) dentro do alcance
  _nearestTarget(x, y) {
    let best = null, bd = CONFIG.ZAP_RANGE * CONFIG.ZAP_RANGE;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.cx - x, dy = e.cy - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = { x: e.cx, y: e.cy }; }
    }
    if (this.boss && this.boss.active && !this.boss.dead) {
      const dx = this.boss.cx - x, dy = this.boss.cy - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = { x: this.boss.cx, y: this.boss.cy }; }
    }
    return best;
  }

  // ---- inventário / armas ----
  currentWeapon() { return WEAPONS[this.inventory?.[this.weaponIdx] || 'bento'] || WEAPONS.bento; }
  switchWeapon() {
    if (!this.inventory || this.inventory.length < 2) return;
    this.weaponIdx = (this.weaponIdx + 1) % this.inventory.length;
    const w = this.currentWeapon();
    this.audio?.pickup?.(); this._objective(`${w.icon} Arma: ${w.name}`);
    this._emitHud();
  }
  giveWeapon(id) {
    if (!WEAPONS[id]) return;
    if (!this.inventory.includes(id)) this.inventory.push(id);
    this.weaponIdx = this.inventory.indexOf(id);     // equipa a arma nova
    if (id === 'bazooka') this.hasBazooka = true;
    const w = this.currentWeapon();
    this.audio?.key?.(); this.shake(6);
    this._objective(`${w.icon} ${w.name}! ${id === 'zap' ? 'Raios teleguiados — pega os morcegos!' : 'Dano altíssimo!'}`);
    this._emitHud();
  }

  spawnBossBolt(x, y, vx, vy, opts) {
    this.bossBolts.push({ x, y, vx, vy, life: 4, g: opts?.g || false, spr: opts?.spr || 'curse', freeze: !!opts?.freeze });
  }

  // bloco "?" acertado por baixo -> suplemento TRUE (Q) ou ARMA (W / chance no Q)
  hitQBox(cx, cy) {
    if (!this.level) return;
    const t = this.level.tile(cx, cy);
    if (t !== 'Q' && t !== 'W') return;
    this.level.grid[cy][cx] = 'q';   // vira bloco usado
    const px = cx * CONFIG.TILE + CONFIG.TILE / 2, py = cy * CONFIG.TILE - 4;
    // bloco de ARMA (W) sempre dá arma; bloco comum (Q) tem chance pequena
    if (t === 'W' || Math.random() < 0.12) {
      const pool = ['zap', 'bazooka'].filter((w) => !this.inventory?.includes(w));
      const id = pool.length ? pool[(Math.random() * pool.length) | 0] : null;
      if (id) {
        this.giveWeapon(id);
        this.pops.push({ x: px, y: py, vy: -36, life: 1.7, spr: WEAPONS[id].spr, name: WEAPONS[id].name });
        this.hitStop(0.05);
        return;
      }
      // já tem todas as armas -> bônus grande de munição
      this.player.addAmmo(12);
      this.audio?.key?.(); this.shake(3); this.hitStop(0.03);
      this.pops.push({ x: px, y: py, vy: -36, life: 1.4, spr: 'freezer', name: '+12 🍦' });
      this._objective('🧊 +12 munição!');
      this._emitHud();
      return;
    }
    const opts = [
      { spr: 'pic_dubai', name: 'Chocolate Dubai', fx: () => this.player.addAmmo(6) },
      { spr: 'pic_franui', name: 'Franuí', fx: () => { this.player.coins += 5; } },
      { spr: 'pic_prestigio', name: 'Prestígio', fx: () => this.player.heal(2) },
      { spr: 'pic_pistache', name: 'Pistache', fx: () => { this.player.heal(1); this.player.addAmmo(3); } },
      { spr: 'pic_copa', name: 'Pistache da Copa', fx: () => { this.player.coins += 3; this.player.heal(1); } },
    ];
    const it = opts[(Math.random() * opts.length) | 0];
    it.fx();
    this.audio?.key?.(); this.shake(3); this.hitStop(0.03);
    this.pops.push({ x: cx * CONFIG.TILE + CONFIG.TILE / 2, y: cy * CONFIG.TILE - 4, vy: -36, life: 1.4, spr: it.spr, name: it.name });
    this._objective(`🎁 ${it.name}!`);
    this._emitHud();
  }

  // tremor de terra do Alex: tremor de tela + ondas de choque p/ os dois lados
  quake(x, groundY) {
    this.shake(16); this.hitStop(0.05); this.audio?.thunder?.();
    for (let i = 0; i < 14; i++) this._part(x + (Math.random() - 0.5) * 30, groundY, (Math.random() - 0.5) * 160, -Math.random() * 140, 0.5, '#9a8a6a', 3);
    for (const dir of [-1, 1]) this.shocks.push({ x, y: groundY, dir, life: 2.2 });
  }

  _bossActivated() {
    this.audio?.vecna?.();
    this.shake(8);
    this._objective('🕯️ VECNA! Derrote-o para abrir o portal!');
  }

  _bossDefeated() {
    this.shake(16); this.hitStop(0.06);
    this.kills++;
    this.bossKilled = true;
    if (this.boss) this.burst(this.boss.cx, this.boss.cy, this.level.alex ? '#66e06a' : '#b14aff', 26);
    if (this.level.alex) { this.audio?.win?.(); this._objective('💥 MENTE-COLMEIA destruída! Vá ao portal e vença!'); }
    else { this.audio?.portal?.(); this._objective('💥 Vecna caiu! Atravesse o portal — ainda não acabou...'); }
  }

  getRun() {
    const secs = Math.round((performance.now() - (this.startTime || performance.now())) / 1000);
    return { secs, coins: this.player?.coins || 0, kills: this.kills || 0, stages: this.keysBanked || 0, bossKilled: !!this.bossKilled, difficulty: this.diff.key };
  }

  getScore() {
    const r = this.getRun();
    const base = r.coins * 10 + r.kills * 25 + r.stages * 200 + (r.bossKilled ? 800 : 0) + Math.max(0, 1500 - r.secs * 4);
    return Math.round(base * (this.diff.scoreMul || 1));
  }

  update(dt) {
    this.time += dt;
    this._shake *= 0.85;
    if (this._lightFlash > 0) this._lightFlash -= dt;
    if (this._powerFlash > 0) this._powerFlash -= dt;
    if (this.state !== STATE.PLAYING) return;
    if (this._hitStop > 0) { this._hitStop -= dt; return; } // congela no impacto
    dt = Math.min(dt, 0.04);
    this._updateParticles(dt);
    for (const p of this.pops) { p.y += p.vy * dt; p.vy += 36 * dt; p.life -= dt; }
    this.pops = this.pops.filter((p) => p.life > 0);

    // relâmpagos do Avesso
    if (this.phase === 'avesso') {
      this._lightT -= dt;
      if (this._lightT <= 0) {
        this._lightT = 5 + Math.random() * 7;
        this._lightFlash = 0.22;
        this._boltPts = this._makeBolt();
        this.audio?.thunder?.();
        this.shake(3);
      }
    }

    if (this.input.consumeWeapon?.()) this.switchWeapon();   // troca de arma (botão/tecla)
    this.player.update(dt, this.input);

    // passos
    this._stepT -= dt;
    if (this.player.body.onGround && Math.abs(this.player.body.vx) > 5 && this._stepT <= 0) {
      this.audio?.footstep(); this._stepT = 0.3;
    }

    // projéteis
    for (const p of this.projectiles) {
      if (p.homing) {                          // raio teleguiado: curva atrás do alvo vivo
        const t = this._nearestTarget(p.x, p.y);
        if (t) {
          const want = Math.atan2(t.y - p.y, t.x - p.x);
          const spd = Math.max(Math.hypot(p.vx, p.vy), CONFIG.ZAP_SPEED);
          let cur = Math.atan2(p.vy, p.vx);
          let d = want - cur; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832;
          const turn = CONFIG.ZAP_TURN * dt;
          cur += Math.max(-turn, Math.min(turn, d));
          p.vx = Math.cos(cur) * spd; p.vy = Math.sin(cur) * spd;
        }
        if (Math.random() < 0.5) this._part(p.x, p.y, 0, 0, 0.18, '#9fefff', 2); // rastro elétrico
      }
      p.x += p.vx * dt; p.y += (p.vy || 0) * dt; p.life -= dt;
      const cx = Math.floor(p.x / CONFIG.TILE), cy = Math.floor(p.y / CONFIG.TILE);
      if (p.life <= 0 || this.level.solidAt(cx, cy)) { p.dead = true; continue; }
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (p.x > e.body.x && p.x < e.body.x + e.w && p.y > e.body.y && p.y < e.body.y + e.h) {
          const died = e.hit(p.dmg || 1);
          e.knockback(Math.sign(p.vx) || 1);
          this.hitStop(0.03); this.shake(3);
          if (died) { this.kills++; this.burst(e.cx, e.cy, e.type === 'demodog' ? '#a83a2a' : '#c1272d'); }
          else this._part(p.x, p.y, 0, 0, 0.18, '#ffffff', 3);
          p.dead = true; break;
        }
      }
      if (!p.dead && this.boss && this.boss.active && !this.boss.dead) {
        const bb = this.boss.body;
        if (p.x > bb.x && p.x < bb.x + bb.w && p.y > bb.y && p.y < bb.y + bb.h) {
          this.boss.hit(p.dmg || 1); p.dead = true;   // morte tratada no bloco bossDownHandled
          this.hitStop(0.05); this.shake(5);
          this._part(p.x, p.y, 0, 0, 0.2, '#ffffff', 3);
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
        // pisão: pé entrou pelo TOPO do inimigo enquanto descia. A tolerância
        // cresce com a velocidade de queda p/ quedas rápidas não virarem dano
        // (e p/ morcego/Demoflor também serem pisáveis).
        const overTop = (pb.y + pb.h) - e.body.y;
        const stomp = pb.vy > 0 && overTop >= 0 && overTop <= Math.max(18, pb.vy * dt + 8);
        if (stomp) {
          const died = e.hit(1); this.player.bounce(); this.audio?.stomp();
          this.hitStop(0.04); this.shake(4);
          if (died) { this.kills++; this.burst(e.cx, e.cy, e.type === 'demodog' ? '#a83a2a' : '#c1272d'); }
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
    // projéteis do chefe (maldições do Vecna / pedras do Alex)
    for (const bolt of this.bossBolts) {
      if (bolt.g) bolt.vy += CONFIG.GRAVITY * dt;
      bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt; bolt.life -= dt;
      const cx = Math.floor(bolt.x / CONFIG.TILE), cy = Math.floor(bolt.y / CONFIG.TILE);
      // morre por tempo, ao bater em sólido, ou se voar p/ longe do jogador (anti-acúmulo)
      if (bolt.life <= 0 || this.level.solidAt(cx, cy) || Math.abs(bolt.x - this.player.cx) > 900) { bolt.dead = true; continue; }
      const pb = this.player.body;
      if (bolt.x > pb.x && bolt.x < pb.x + pb.w && bolt.y > pb.y && bolt.y < pb.y + pb.h) {
        bolt.dead = true;
        if (bolt.freeze) {                       // estilhaço gelado: paralisa, sem dano
          this.player.freeze(CONFIG.FLAYER_FREEZE);
        } else if (this.player.hurt(1, bolt.x)) {
          this._emitHud();
          if (this.player.health <= 0) return this._gameover();
        }
      }
    }
    this.bossBolts = this.bossBolts.filter((b) => !b.dead);

    // ondas de choque do tremor do Alex (pule para evitar!)
    for (const s of this.shocks) {
      s.x += s.dir * CONFIG.ALEX_SHOCK_SPEED * dt; s.life -= dt;
      if (s.life <= 0) { s.dead = true; continue; }
      const pb = this.player.body;
      if (pb.onGround && Math.abs((pb.x + pb.w / 2) - s.x) < 16 && Math.abs((pb.y + pb.h) - s.y) < 26) {
        s.dead = true;
        if (this.player.hurt(1, s.x)) { this._emitHud(); if (this.player.health <= 0) return this._gameover(); }
      }
    }
    this.shocks = this.shocks.filter((s) => !s.dead);

    if (this.boss) {
      this.hooks.onBoss?.({ exists: true, active: this.boss.active, dead: this.boss.dead, hp: Math.max(0, this.boss.hp), max: this.boss.maxHp, name: this.boss.name });
      if (this.boss.dead && !this.bossDownHandled) { this.bossDownHandled = true; this._bossDefeated(); }
    }

    // itens
    for (const it of this.items) {
      if (it.collected || it === this.portal || it.type === 'shop') continue;
      if (it.collidesPlayer(this.player)) {
        it.collect();
        if (it.type === 'key') { this.stageKeyGot = true; this.player.keys++; this.audio?.key();
          this._objective(this.level.boss ? '✅ 3ª chave! Derrote o Vecna e fuja!' : '✅ Chave pega! Vá para o portal roxo!'); }
        else if (it.type === 'whey') { this.player.grow(); this.audio?.pickup(); this._objective('💪 WHEY! Bento ficou maior e mais forte!'); }
        else if (it.type === 'freezer') { this.player.addAmmo(CONFIG.AMMO_PER_FREEZER); this.audio?.pickup();
          this._objective(`🧊 Freezer! +${CONFIG.AMMO_PER_FREEZER} Bentolés 🍦`); }
        else if (it.type === 'coin') { this.player.coins++; this.audio?.coin(); this.coinPop(it.box.x + it.box.w / 2, it.box.y); }
        else if (it.type === 'bazooka') { this.giveWeapon('bazooka'); }
        else if (it.type === 'zap') { this.giveWeapon('zap'); }
        this._emitHud();
      }
    }

    // checkpoints (respawn ao morrer)
    for (const cp of this.cps) {
      if (cp.active) continue;
      const p = this.player.body, b = cp.box;
      if (p.x < b.x + b.w && p.x + p.w > b.x && p.y < b.y + b.h && p.y + p.h > b.y) {
        cp.active = true; this.checkpoint = { cx: cp.cx, cy: cp.cy };
        this.audio?.coin?.(); this._objective('🚩 Checkpoint salvo!');
      }
    }

    // portal
    if (this.portal && this.portal.collidesPlayer(this.player)) {
      if (this.level.alex) {                       // arena final (Mente-Colmeia)
        if (this.boss && this.boss.dead) { this.audio?.win(); this.audio?.stopAmbient(); this._setState(STATE.WIN); }
        else this._objective('🦑 Destrua a MENTE-COLMEIA para vencer o jogo!');
      } else if (this.level.boss) {                // Vecna -> avança p/ o Alex
        const bossDown = !this.boss || this.boss.dead;
        if (this.stageKeyGot && bossDown) this._advanceStage();
        else if (!this.stageKeyGot) this._objective('🔒 Pegue a 3ª chave antes de seguir!');
        else this._objective('🕯️ Derrote o Vecna para abrir o portal!');
      } else if (this.phase === 'normal') {         // cidade
        this._advanceStage();
      } else {                                      // avesso comum
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
    for (const b of this.bossBolts) {
      const img = Assets.img(b.spr || 'curse');
      if (img) ctx.drawImage(img, (b.x - img.width / 2 - cam.x) * cam.s, (b.y - img.height / 2 - cam.y) * cam.s, img.width * cam.s, img.height * cam.s);
    }
    // ondas de choque do tremor (Alex)
    for (const s of (this.shocks || [])) {
      const sx = (s.x - cam.x) * cam.s, sy = (s.y - cam.y) * cam.s;
      ctx.fillStyle = `rgba(150,120,80,${Math.max(0, Math.min(0.8, s.life)).toFixed(2)})`;
      const w = 14 * cam.s, h = CONFIG.ALEX_SHOCK_H * cam.s;
      ctx.beginPath();
      ctx.moveTo(sx - w, sy); ctx.lineTo(sx, sy - h); ctx.lineTo(sx + w, sy); ctx.closePath(); ctx.fill();
    }

    for (const p of this.projectiles) {
      const px = (p.x - cam.x) * cam.s, py = (p.y - cam.y) * cam.s;
      if (p.homing) {                          // orbe elétrico ciano com brilho pulsante
        const t = this.time || 0, r = (4 + Math.sin(t * 40) * 1.2) * cam.s;
        const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 2.6);
        grd.addColorStop(0, 'rgba(220,255,255,0.95)');
        grd.addColorStop(0.5, 'rgba(90,220,245,0.7)');
        grd.addColorStop(1, 'rgba(54,201,217,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(px, py, r * 2.6, 0, 6.29); ctx.fill();
        ctx.fillStyle = '#eaffff'; ctx.beginPath(); ctx.arc(px, py, r * 0.7, 0, 6.29); ctx.fill();
        continue;
      }
      const img = Assets.img(p.spr || ((p.dmg || 1) > 1 ? 'blast' : 'popsicle'));
      if (img) ctx.drawImage(img, px - img.width / 2 * cam.s, py - img.height / 2 * cam.s, img.width * cam.s, img.height * cam.s);
    }

    // suplementos TRUE saindo dos blocos "?"
    for (const p of (this.pops || [])) {
      const img = Assets.img(p.spr);
      ctx.globalAlpha = Math.min(1, p.life);
      if (img) ctx.drawImage(img, (p.x - img.width / 2 - cam.x) * cam.s, (p.y - img.height - cam.y) * cam.s, img.width * cam.s, img.height * cam.s);
      ctx.globalAlpha = 1;
      ctx.font = `${Math.round(5 * cam.s)}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffe14d';
      ctx.fillText(p.name, (p.x - cam.x) * cam.s, (p.y - (img ? img.height : 16) - 4 - cam.y) * cam.s);
      ctx.textAlign = 'left';
    }

    this._drawParticles(ctx, cam);
    ctx.restore();

    // flash de poder (transformação do whey) — tela inteira, por cima de tudo
    if (this._powerFlash > 0) {
      ctx.fillStyle = `rgba(180,255,130,${Math.min(0.6, this._powerFlash).toFixed(2)})`;
      ctx.fillRect(0, 0, cv.width, cv.height);
    }
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
    // bandeiras de checkpoint
    for (const cp of (this.cps || [])) {
      const img = Assets.img(cp.active ? 'flag_on' : 'flag');
      if (img) ctx.drawImage(img, (cp.x - cam.x) * cam.s, (cp.bottom - img.height - cam.y) * cam.s, img.width * cam.s, img.height * cam.s);
    }
    // funcionários da Bentô Gelatos (com plaquinha de nome)
    for (const n of (this.npcs || [])) {
      const img = Assets.img(n.sprite);
      if (!img) continue;
      const sx = (n.x - cam.x) * cam.s;
      if (sx > this.canvas.width + 30 || sx + img.width * cam.s < -30) continue;
      const sy = (n.bottom - img.height - cam.y) * cam.s;
      ctx.drawImage(img, sx, sy, img.width * cam.s, img.height * cam.s);
      // nome
      ctx.font = `${Math.round(6 * cam.s)}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      const lx = sx + (img.width * cam.s) / 2, ly = sy - 5 * cam.s;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const tw = ctx.measureText(n.name).width;
      ctx.fillRect(lx - tw / 2 - 3, ly - 7 * cam.s, tw + 6, 9 * cam.s);
      ctx.fillStyle = '#ffe14d';
      ctx.fillText(n.name, lx, ly);
      ctx.textAlign = 'left';
    }
  }

  _drawBg() {
    const ctx = this.ctx, cam = this.camera, cv = this.canvas;
    const avesso = this.phase === 'avesso';

    // fundo ilustrado (parallax) — camadas de arte da cidade/Avesso
    const layer = Assets.img(avesso ? 'bg_pinecrest' : 'bg_hawkins');
    if (layer && layer.height) {
      const sc = cv.height / layer.height;
      const w = layer.width * sc;
      let off = (-cam.x * cam.s * 0.32) % w; if (off > 0) off -= w;
      for (let x = off; x < cv.width; x += w) ctx.drawImage(layer, x, 0, w, cv.height);
      // camada de vegetação (só na CIDADE; no Avesso o fundo do ES já é completo)
      const fg = !avesso && Assets.img('bg_trees');
      if (fg && fg.height) {
        const groundY = (13 * CONFIG.TILE - cam.y) * cam.s;   // topo do chão (row 13) na tela
        const fh = 92 * cam.s, fw = fg.width * (fh / fg.height);
        let fo = (-cam.x * cam.s * 0.55) % fw; if (fo > 0) fo -= fw;
        for (let x = fo; x < cv.width; x += fw) ctx.drawImage(fg, x, groundY - fh, fw, fh);
      }
      if (avesso && this._lightFlash > 0 && this._boltPts) { // relâmpago por cima
        ctx.fillStyle = `rgba(255,70,95,${(this._lightFlash * 1.2).toFixed(3)})`;
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.strokeStyle = '#ff5a72'; ctx.lineWidth = Math.max(1.5, cv.height * 0.004);
        ctx.beginPath();
        this._boltPts.forEach(([bx, by], i) => { const X = bx * cv.width, Y = by * cv.height; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.stroke();
      }
      return;
    }

    const lp = (a, b, t) => a + (b - a) * t;
    const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

    // dia -> entardecer conforme avança na fase (só na cidade)
    let d = 0;
    const span = Math.max(1, this.level.widthPx - cv.width / cam.s);
    if (!avesso) d = Math.max(0, Math.min(1, cam.x / span));

    let top, hor;
    if (avesso) { top = [18, 8, 28]; hor = [46, 14, 44]; }
    else { top = [lp(140, 48, d), lp(196, 34, d), lp(236, 78, d)]; hor = [lp(208, 240, d), lp(220, 140, d), lp(236, 92, d)]; }
    const grad = ctx.createLinearGradient(0, 0, 0, cv.height);
    grad.addColorStop(0, rgb(top)); grad.addColorStop(1, rgb(hor));
    ctx.fillStyle = grad; ctx.fillRect(0, 0, cv.width, cv.height);

    // estrelas (Avesso sempre; cidade só quando entardece) com cintilação
    const starA = avesso ? 0.9 : Math.max(0, (d - 0.45)) * 1.6;
    if (starA > 0.02) {
      for (const st of this._stars) {
        ctx.globalAlpha = Math.min(1, starA * (0.45 + 0.55 * Math.abs(Math.sin(this.time * 2 + st.p))));
        ctx.fillStyle = avesso ? '#cdb8e8' : '#fff6d8';
        ctx.fillRect(st.x * cv.width, st.y * cv.height, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    // sol (cidade, desce e avermelha ao entardecer) ou lua (Avesso)
    const cxs = cv.width * (avesso ? 0.72 : 0.8);
    const cys = avesso ? cv.height * 0.2 : lp(cv.height * 0.2, cv.height * 0.5, d);
    const rad = cv.height * 0.06;
    ctx.beginPath(); ctx.arc(cxs, cys, rad, 0, 6.29);
    ctx.fillStyle = avesso ? '#cfc8e0' : rgb([255, lp(240, 130, d), lp(180, 70, d)]);
    ctx.fill();

    // nuvens à deriva (só na cidade)
    if (!avesso) {
      ctx.fillStyle = '#f5f8ff';
      for (const c of this._clouds) {
        let px = (c.x * cv.width + this.time * c.v - cam.x * cam.s * 0.12) % (cv.width + 240);
        if (px < 0) px += cv.width + 240;
        px -= 120;
        const py = c.y * cv.height, r = cv.height * 0.035 * c.s;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 6.29);
        ctx.arc(px + r * 1.2, py + r * 0.25, r * 0.8, 0, 6.29);
        ctx.arc(px - r * 1.2, py + r * 0.25, r * 0.75, 0, 6.29);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // relâmpago do Avesso (flash + raio)
    if (avesso && this._lightFlash > 0 && this._boltPts) {
      ctx.fillStyle = `rgba(255,70,95,${(this._lightFlash * 1.4).toFixed(3)})`;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = '#ff5a72';
      ctx.lineWidth = Math.max(1.5, cv.height * 0.004);
      ctx.beginPath();
      this._boltPts.forEach(([bx, by], i) => {
        if (i === 0) ctx.moveTo(bx * cv.width, by * cv.height);
        else ctx.lineTo(bx * cv.width, by * cv.height);
      });
      ctx.stroke();
    }

    // silhueta em parallax (Hawkins / floresta morta do Avesso)
    const img = Assets.img(avesso ? 'far_avesso' : 'far_city');
    if (img && img.height) {
      const sc = (cv.height * 0.62) / img.height;
      const w = img.width * sc, h = img.height * sc;
      const baseY = cv.height * 0.92 - h;
      let off = (-cam.x * cam.s * 0.35) % w; if (off > 0) off -= w;
      for (let x = off; x < cv.width; x += w) ctx.drawImage(img, x, baseY, w, h);
    }
  }
}
