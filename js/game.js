import { CONFIG } from './config.js';
import { Level } from './level.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Weapon } from './weapon.js';
import { Enemy } from './enemy.js';
import { Item } from './items.js';
import { Base } from './base.js';
import { Scenery } from './scenery.js';

export const STATE = {
  START: 'start', PLAYING: 'playing', PAUSED: 'paused',
  TRANSITION: 'transition', GAMEOVER: 'gameover', WIN: 'win',
};

export class Game {
  constructor(engine, controls, hooks = {}) {
    this.engine = engine;
    this.controls = controls;
    this.hooks = hooks;
    this.state = STATE.START;
    this.time = 0;
    this.phase = 'normal';
  }

  _emitState(s) {
    this.state = s;
    this.controls.setEnabled(s === STATE.PLAYING);
    this.hooks.onState?.(s);
  }

  _emitHud() {
    this.hooks.onHud?.({
      health: Math.max(0, this.player.health),
      keys: this.player.keys,
      battery: Math.round(this.player.battery),
      ammo: this.weapon ? this.weapon.ammo : 0,
      phase: this.phase,
    });
  }

  _objective(t) { this.hooks.onObjective?.(t); }
  get _audio() { return this.hooks.audio; }

  // Escolhe a célula da sorveteria e abre uma fachada de 3 células de largura
  _setupBase() {
    const cells = this._shuffle(this.level.freeCells());
    const size = this.level.size;
    const baseCell = cells.find((c) => c.cz - 1 >= 1 && c.cx >= 2 && c.cx <= size - 3) || cells[0];
    for (let dx = -1; dx <= 1; dx++) {
      const x = baseCell.cx + dx, z = baseCell.cz - 1;
      if (x >= 1 && x <= size - 2 && z >= 1) this.level.grid[z][x] = 1;
    }
    this.baseCell = baseCell;
    return baseCell;
  }

  // ============ INÍCIO: mundo normal ============
  start() {
    this.phase = 'normal';
    this._audio?.stopAmbient();
    this._buildNormal();
    this.startTime = performance.now();
    this._emitState(STATE.PLAYING);
    this._emitHud();
    this._objective('🍦 Ache a sorveteria Bentô Gelatos e entre no portal.');
  }

  _buildNormal() {
    this.engine.clearScene();
    this.level = new Level(CONFIG.GRID_NORMAL);
    const baseCell = this._setupBase();

    this.world = new World(this.engine.scene, this.level, 'normal');
    this.scenery = new Scenery(this.engine.scene, this.level, 'normal', baseCell);
    this.base = new Base(this.engine.scene, this.level, baseCell, 'normal');

    // Jogador começa longe da loja, para caminhar até ela
    const free = this._shuffle(this.level.freeCells())
      .filter((c) => !(c.cx === baseCell.cx && c.cz === baseCell.cz));
    let spawn = free.find((c) => this._dist(c, baseCell) > 45) ||
      free.reduce((a, b) => (this._dist(b, baseCell) > this._dist(a, baseCell) ? b : a), free[0]);

    this.player = new Player(this.engine.camera, this.engine.scene, this.level, spawn);
    // olha na direção da loja (dica de para onde ir)
    const vx = baseCell.x - spawn.x, vz = baseCell.z - spawn.z;
    this.player.yaw = Math.atan2(-vx, -vz);
    this.player.setWorldMode('normal');
    this.player.syncCamera();

    this.weapon = new Weapon(this.engine.camera, this.engine.scene, this.level);

    // Portal de entrada para o Avesso, na porta da sorveteria
    this.portal = new Item(this.engine.scene, 'portal', baseCell);
    this.enemies = [];
    this.items = [];
    this._transitioning = false;
  }

  // ============ AVESSO ============
  _buildInverted() {
    this.phase = 'inverted';
    this.engine.clearScene();
    this.level = new Level(CONFIG.GRID_INVERTED);
    const baseCell = this._setupBase();

    this.world = new World(this.engine.scene, this.level, 'inverted');
    this.scenery = new Scenery(this.engine.scene, this.level, 'inverted', baseCell);
    this.base = new Base(this.engine.scene, this.level, baseCell, 'inverted');

    // Jogador chega na sorveteria (agora assombrada), de frente para a fachada
    this.player = new Player(this.engine.camera, this.engine.scene, this.level, baseCell);
    this.player.yaw = 0;
    this.player.health = CONFIG.MAX_HEALTH;
    this.player.battery = 100;
    this.player.keys = 0;
    this.player.setWorldMode('inverted');
    this.player.syncCamera();

    this.weapon = new Weapon(this.engine.camera, this.engine.scene, this.level);

    // pool longe da base
    const free = this._shuffle(this.level.freeCells())
      .filter((c) => !(c.cx === baseCell.cx && c.cz === baseCell.cz));
    const far = free.filter((t) => this._dist(t, baseCell) > 30);
    const pool = this._shuffle(far.length > 20 ? far : free);

    // Portal de fuga (mais distante)
    let portalTile = pool[0], maxD = 0;
    for (const t of pool) { const d = this._dist(t, baseCell); if (d > maxD) { maxD = d; portalTile = t; } }
    this.portal = new Item(this.engine.scene, 'portal', portalTile);

    const used = new Set([portalTile]);
    const take = (n) => {
      const out = [];
      for (const t of pool) { if (out.length >= n) break; if (!used.has(t)) { used.add(t); out.push(t); } }
      return out;
    };

    this.items = [];
    for (const t of take(CONFIG.TOTAL_KEYS)) this.items.push(new Item(this.engine.scene, 'key', t));
    for (const t of take(CONFIG.BATTERY_COUNT)) this.items.push(new Item(this.engine.scene, 'battery', t));
    for (const t of take(CONFIG.WHEY_COUNT)) this.items.push(new Item(this.engine.scene, 'whey', t));
    // Freezers (baús) escondidos com munição Bentolés
    for (const t of take(CONFIG.FREEZER_COUNT)) this.items.push(new Item(this.engine.scene, 'freezer', t));

    this.enemies = [];
    for (const t of take(CONFIG.ENEMY_COUNT)) this.enemies.push(new Enemy(this.engine.scene, this.level, t));

    this._audio?.startAmbient();
    this._emitState(STATE.PLAYING);
    this._emitHud();
    this._objective('🔑 Ache as 3 chaves e fuja pelo portal. Procure freezers 🧊 para munição!');
  }

  _enterUpsideDown() {
    if (this._transitioning) return;
    this._transitioning = true;
    this._audio?.portal();
    this._emitState(STATE.TRANSITION);
    this._objective('Entrando no Avesso...');
    setTimeout(() => this._buildInverted(), 1500);
  }

  _dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  _shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  togglePause() {
    if (this.state === STATE.PLAYING) this._emitState(STATE.PAUSED);
    else if (this.state === STATE.PAUSED) this._emitState(STATE.PLAYING);
  }

  update(dt) {
    this.time += dt;
    if (this.state !== STATE.PLAYING) return;
    dt = Math.min(dt, 0.05);

    if (this.controls.consumeAction()) {
      const r = this.weapon.fire();
      if (r === true) this._audio?.shoot();
      else if (r === 'empty') this._audio?.empty();
    }

    this.player.update(dt, this.controls);
    this.weapon.update(dt, this.enemies);
    if (this.weapon.killsThisFrame) this._audio?.kill();
    else if (this.weapon.hitsThisFrame) this._audio?.hit();
    this.world.update(dt, this.time);
    this.scenery?.update(dt, this.time);
    this.base.update(dt, this.time);
    this.portal.update(dt, this.time, this.engine.camera);

    if (this.phase === 'normal') {
      // Basta entrar no portal da sorveteria
      if (this.portal.collidesPlayer(this.player)) this._enterUpsideDown();
      return;
    }

    // ----- Avesso -----
    for (const e of this.enemies) {
      e.update(dt, this.player);
      if (!e.dead && e.collidesPlayer(this.player)) {
        if (this.player.takeDamage(CONFIG.ENEMY_DAMAGE)) {
          this.hooks.onHurt?.();
          this._audio?.hurt();
          this._emitHud();
          if (this.player.health <= 0) { this._audio?.lose(); this._audio?.stopAmbient(); this._emitState(STATE.GAMEOVER); return; }
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    for (const it of this.items) {
      if (it.collected) continue;
      it.update(dt, this.time, this.engine.camera);
      if (it.collidesPlayer(this.player)) {
        it.collect();
        if (it.type === 'key') {
          this.player.keys++;
          this._audio?.key();
          if (this.player.keys >= CONFIG.TOTAL_KEYS) this._objective('✅ Todas as chaves! Corra para o portal roxo!');
        } else if (it.type === 'battery') { this.player.addBattery(CONFIG.BATTERY_PER_PICKUP); this._audio?.pickup(); }
        else if (it.type === 'whey') { this.player.heal(CONFIG.WHEY_HEAL); this._audio?.pickup(); }
        else if (it.type === 'freezer') {
          this.weapon.addAmmo(CONFIG.AMMO_PER_FREEZER);
          this._audio?.pickup();
          this._objective(`🧊 Freezer! +${CONFIG.AMMO_PER_FREEZER} Bentolés 🍦`);
        }
        this._emitHud();
      }
    }

    if (this.player.keys >= CONFIG.TOTAL_KEYS && this.portal.collidesPlayer(this.player)) {
      this._audio?.win(); this._audio?.stopAmbient();
      this._emitState(STATE.WIN);
    }

    this._emitHud();
  }

  render() { this.engine.render(); }

  getStats() {
    const secs = Math.round((performance.now() - this.startTime) / 1000);
    const m = Math.floor(secs / 60), s = secs % 60;
    return `Tempo: ${m}m ${s}s — Demogorgons derretidos: ${this.weapon.kills} 🍦`;
  }
}
