import { CONFIG } from './config.js';
import { Level } from './level.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Weapon } from './weapon.js';
import { Enemy } from './enemy.js';
import { Item } from './items.js';

export const STATE = {
  START: 'start', PLAYING: 'playing', PAUSED: 'paused',
  GAMEOVER: 'gameover', WIN: 'win',
};

export class Game {
  constructor(engine, controls, hooks = {}) {
    this.engine = engine;
    this.controls = controls;
    this.hooks = hooks;
    this.state = STATE.START;
    this.time = 0;
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
    });
  }

  start() {
    this.engine.clearScene();
    this.level = new Level();
    this.world = new World(this.engine.scene, this.level);

    const free = this._shuffle(this.level.freeCells());
    const spawn = free.shift();

    this.player = new Player(this.engine.camera, this.engine.scene, this.level, spawn);
    this.weapon = new Weapon(this.engine.camera, this.engine.scene, this.level);

    // tiles distantes do spawn para distribuir objetivos/inimigos
    const far = free.filter((t) => this._dist(t, spawn) > 30);
    const pool = this._shuffle(far.length > 20 ? far : free);

    // Portal no ponto mais distante
    let portalTile = pool[0], maxD = 0;
    for (const t of pool) { const d = this._dist(t, spawn); if (d > maxD) { maxD = d; portalTile = t; } }
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

    this.enemies = [];
    for (const t of take(CONFIG.ENEMY_COUNT)) this.enemies.push(new Enemy(this.engine.scene, this.level, t));

    this.startTime = performance.now();
    this._emitState(STATE.PLAYING);
    this._emitHud();
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
    dt = Math.min(dt, 0.05); // limita passos grandes (aba em segundo plano)

    // Disparo da BENTÔLÉ gun
    if (this.controls.consumeAction()) this.weapon.fire();

    this.player.update(dt, this.controls);
    this.weapon.update(dt, this.enemies);
    this.world.update(dt, this.time);

    // Inimigos
    for (const e of this.enemies) {
      e.update(dt, this.player);
      if (!e.dead && e.collidesPlayer(this.player)) {
        if (this.player.takeDamage(CONFIG.ENEMY_DAMAGE)) {
          this.hooks.onHurt?.();
          this._emitHud();
          if (this.player.health <= 0) { this._emitState(STATE.GAMEOVER); return; }
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    // Itens
    for (const it of this.items) {
      if (it.collected) continue;
      it.update(dt, this.time, this.engine.camera);
      if (it.collidesPlayer(this.player)) {
        it.collect();
        if (it.type === 'key') this.player.keys++;
        else if (it.type === 'battery') this.player.addBattery(CONFIG.BATTERY_PER_PICKUP);
        else if (it.type === 'whey') this.player.heal(CONFIG.WHEY_HEAL);
        this._emitHud();
      }
    }

    // Portal (precisa das 3 chaves)
    this.portal.update(dt, this.time, this.engine.camera);
    if (this.player.keys >= CONFIG.TOTAL_KEYS && this.portal.collidesPlayer(this.player)) {
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
