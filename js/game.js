import { CONFIG, COLORS } from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Item } from './items.js';

export const STATE = {
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  WIN: 'win',
};

export class Game {
  constructor(canvas, input, hooks = {}) {
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.hooks = hooks; // { onStateChange, onHudUpdate }
    this.state = STATE.START;
    this.cam = { x: 0, y: 0 };
    this.frame = 0;
    this._lightCanvas = document.createElement('canvas');
    this._lightCanvas.width = CONFIG.WIDTH;
    this._lightCanvas.height = CONFIG.HEIGHT;
    this._lightCtx = this._lightCanvas.getContext('2d');
  }

  start() {
    this.world = new World();
    const free = this._shuffle(this.world.freeFloorTiles());

    // Jogador no primeiro tile livre
    const spawn = free.shift();
    this.player = new Player(spawn.x - CONFIG.PLAYER_SIZE / 2, spawn.y - CONFIG.PLAYER_SIZE / 2);

    // Distribui itens e inimigos longe do spawn inicial
    const farTiles = free.filter((t) => Math.hypot(t.x - spawn.x, t.y - spawn.y) > 220);
    const pool = this._shuffle(farTiles.length > 10 ? farTiles : free);

    // Portal: o tile mais distante do jogador
    let portalTile = pool[0];
    let maxD = 0;
    for (const t of pool) {
      const d = Math.hypot(t.x - spawn.x, t.y - spawn.y);
      if (d > maxD) { maxD = d; portalTile = t; }
    }
    this.portal = new Item(portalTile.x, portalTile.y, 'portal');

    const used = new Set([portalTile]);
    const take = (n) => {
      const out = [];
      for (const t of pool) {
        if (out.length >= n) break;
        if (!used.has(t)) { used.add(t); out.push(t); }
      }
      return out;
    };

    this.items = [];
    for (const t of take(CONFIG.TOTAL_KEYS)) this.items.push(new Item(t.x, t.y, 'key'));
    for (const t of take(5)) this.items.push(new Item(t.x, t.y, 'battery'));

    this.enemies = [];
    for (const t of take(6)) this.enemies.push(new Enemy(t.x - CONFIG.ENEMY_SIZE / 2, t.y - CONFIG.ENEMY_SIZE / 2));

    this.enemiesDefeated = 0;
    this.startTime = performance.now();
    this._setState(STATE.PLAYING);
    this._updateHud();
  }

  _shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _setState(s) {
    this.state = s;
    if (this.hooks.onStateChange) this.hooks.onStateChange(s);
  }

  _updateHud() {
    if (this.hooks.onHudUpdate) {
      this.hooks.onHudUpdate({
        health: Math.max(0, this.player.health),
        keys: this.player.keys,
        battery: Math.round(this.player.battery),
      });
    }
  }

  togglePause() {
    if (this.state === STATE.PLAYING) this._setState(STATE.PAUSED);
    else if (this.state === STATE.PAUSED) this._setState(STATE.PLAYING);
  }

  update() {
    this.frame++;
    if (this.state !== STATE.PLAYING) return;

    this.player.update(this.input, this.world);

    // Câmera segue o jogador (com clamp nas bordas do mundo)
    this.cam.x = this._clamp(this.player.cx - CONFIG.WIDTH / 2, 0, this.world.width - CONFIG.WIDTH);
    this.cam.y = this._clamp(this.player.cy - CONFIG.HEIGHT / 2, 0, this.world.height - CONFIG.HEIGHT);

    // Atualiza inimigos e checa combate/dano
    const attack = this.player.isAttacking ? this.player.getAttackBox() : null;
    for (const e of this.enemies) {
      e.update(this.player, this.world);
      if (e.dead) continue;

      // Jogador acerta inimigo
      if (attack) {
        const dx = e.cx - this.player.cx;
        const dy = e.cy - this.player.cy;
        const dist = Math.hypot(dx, dy);
        // dentro do alcance E no lado em que o jogador olha
        const dot = (dx / (dist || 1)) * this.player.dir.x + (dy / (dist || 1)) * this.player.dir.y;
        if (dist < CONFIG.ATTACK_RANGE && dot > 0.3 && e.hitFlash === 0) {
          e.hit(this.player.cx, this.player.cy);
          if (e.dead) this.enemiesDefeated++;
        }
      }

      // Inimigo encosta no jogador
      if (!e.dead && e.collidesPlayer(this.player)) {
        if (this.player.takeDamage(CONFIG.ENEMY_DAMAGE)) {
          this._updateHud();
          if (this.player.health <= 0) {
            this._setState(STATE.GAMEOVER);
            return;
          }
        }
      }
    }

    // Itens
    for (const it of this.items) {
      if (it.collected) continue;
      it.update();
      if (it.collidesPlayer(this.player)) {
        it.collected = true;
        if (it.type === 'key') this.player.keys++;
        else if (it.type === 'battery') this.player.addBattery(CONFIG.BATTERY_PER_PICKUP);
        this._updateHud();
      }
    }

    // Portal — só funciona com todas as chaves
    this.portal.update();
    if (this.portal.collidesPlayer(this.player) && this.player.keys >= CONFIG.TOTAL_KEYS) {
      this._setState(STATE.WIN);
    }

    // Bateria zerada não mata, mas a luz fica mínima (mais perigoso)
    this._updateHud();
  }

  _clamp(v, min, max) {
    if (max < min) return min;
    return Math.max(min, Math.min(max, v));
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    if (this.state === STATE.START) return;

    // Mundo e entidades
    this.world.draw(ctx, this.cam);
    this.portal.draw(ctx, this.cam);
    for (const it of this.items) it.draw(ctx, this.cam);
    for (const e of this.enemies) e.draw(ctx, this.cam);
    this.player.draw(ctx, this.cam);

    // Camada de escuridão + lanterna
    this._drawDarkness();

    // Setas indicadoras fora da tela (chaves/portal) ajudam a navegar
    this._drawGuides(ctx);
  }

  _drawDarkness() {
    const lctx = this._lightCtx;
    const px = this.player.cx - this.cam.x;
    const py = this.player.cy - this.cam.y;
    const radius = this.player.lightRadius;

    // Preenche tudo de escuro
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = 'rgba(2, 2, 8, 0.94)';
    lctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // "Fura" um círculo de luz com gradiente (cone de lanterna suave)
    lctx.globalCompositeOperation = 'destination-out';
    const flicker = 1 + Math.sin(this.frame * 0.3) * 0.02 + (Math.random() - 0.5) * 0.03;
    const grd = lctx.createRadialGradient(px, py, radius * 0.15, px, py, radius * flicker);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(0.7, 'rgba(0,0,0,0.85)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = grd;
    lctx.beginPath();
    lctx.arc(px, py, radius * flicker, 0, Math.PI * 2);
    lctx.fill();

    // Brilho dos itens "vaza" um pouco na escuridão (portal/chaves)
    const glowItems = [this.portal, ...this.items.filter((i) => !i.collected && i.type === 'key')];
    for (const it of glowItems) {
      const ix = it.x - this.cam.x;
      const iy = it.y - this.cam.y;
      if (ix < -50 || ix > CONFIG.WIDTH + 50 || iy < -50 || iy > CONFIG.HEIGHT + 50) continue;
      const gr = it.type === 'portal' ? 50 : 22;
      const g = lctx.createRadialGradient(ix, iy, 2, ix, iy, gr);
      g.addColorStop(0, 'rgba(0,0,0,0.7)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.beginPath();
      lctx.arc(ix, iy, gr, 0, Math.PI * 2);
      lctx.fill();
    }

    lctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this._lightCanvas, 0, 0);

    // Tom avermelhado/frio por cima (atmosfera do Mundo Invertido)
    this.ctx.fillStyle = 'rgba(40, 0, 20, 0.12)';
    this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }

  // Setas nas bordas apontando para objetivos fora da tela
  _drawGuides(ctx) {
    const targets = [];
    const keysLeft = this.items.filter((i) => !i.collected && i.type === 'key');
    if (this.player.keys >= CONFIG.TOTAL_KEYS) {
      targets.push({ item: this.portal, color: COLORS.portal });
    } else {
      for (const k of keysLeft) targets.push({ item: k, color: COLORS.key });
    }

    for (const { item, color } of targets) {
      const sx = item.x - this.cam.x;
      const sy = item.y - this.cam.y;
      const onScreen = sx >= 0 && sx <= CONFIG.WIDTH && sy >= 0 && sy <= CONFIG.HEIGHT;
      if (onScreen) continue;

      const cx = CONFIG.WIDTH / 2;
      const cy = CONFIG.HEIGHT / 2;
      const ang = Math.atan2(sy - cy, sx - cx);
      const margin = 30;
      const ex = this._clamp(cx + Math.cos(ang) * 1000, margin, CONFIG.WIDTH - margin);
      const ey = this._clamp(cy + Math.sin(ang) * 1000, margin, CONFIG.HEIGHT - margin);

      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(ang);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  getWinStats() {
    const secs = Math.round((performance.now() - this.startTime) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `Tempo: ${m}m ${s}s — Demogorgons derrotados: ${this.enemiesDefeated}`;
  }
}
