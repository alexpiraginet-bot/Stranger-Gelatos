// ============================================================================
// GELO NINJA — motor: montagem da fase, arremesso, colisões, corte, combo,
// pontuação e o fluxo entre fases / chefes / ciclos.
// ============================================================================

import {
  ARENA, FIELD, LAUNCHER, TUNE, SCORE, LEVELS_PER_CYCLE,
  flavorFor, WEAPON_BY_ID, weaponUnlockedAt, setViewport,
} from './config.js';
import { levelPlan } from './levels.js';
import { Geleco, hexA } from './geleco.js';
import { Placa, Bonus, Proibido, Vortice } from './props.js';
import { makeBlade, stepMotion, previewPath, drawBlade, drawTrail } from './blade.js';
import { Fx } from './fx.js';
import { Backdrop, drawArena, drawAim, drawLauncher, drawFloor, drawVignette } from './render.js';
import { State } from './state.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class Game {
  constructor(canvas, sfx, hooks = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.sfx = sfx;
    this.hooks = hooks;
    this.fx = new Fx();
    this.back = new Backdrop();

    this.time = 0;
    this.phase = 'idle';        // idle | intro | play | clear | fail | hold
    this.phaseT = 0;
    this.aiming = false;
    this.aimAng = -Math.PI / 2;
    this.recoil = 0;
    this.wallGlow = 0;

    this.gelecos = []; this.placas = []; this.bonus = [];
    this.proibidos = []; this.vortices = []; this.blades = [];
    this.volley = { live: 0, cuts: 0, kills: 0, perfects: 0 };
    this.banner = null;
    this.paused = false;
    this.resize();
  }

  // ---------------------------------------------------------------- tela ---
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = this.cv.clientWidth || window.innerWidth;
    const h = this.cv.clientHeight || window.innerHeight;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    // a arena assume o formato da tela (largura fixa, altura elástica), então
    // o jogo preenche o aparelho inteiro em vez de deixar tarjas pretas
    setViewport(w, h);
    this.scale = Math.min(w / ARENA.W, h / ARENA.H);
    this.ox = (w - ARENA.W * this.scale) / 2;
    this.oy = (h - ARENA.H * this.scale) / 2;
    this.dpr = dpr;
    // girou o aparelho no meio da fase: recolhe quem ficou fora do campo
    for (const g of this.gelecos || []) {
      g.y = clamp(g.y, FIELD.top + g.size, LAUNCHER.y - 190);
      if (g.motion.cy != null) g.motion.cy = clamp(g.motion.cy, FIELD.top + 40, LAUNCHER.y - 200);
    }
  }

  toArena(cx, cy) {
    const r = this.cv.getBoundingClientRect();
    return { x: (cx - r.left - this.ox) / this.scale, y: (cy - r.top - this.oy) / this.scale };
  }

  get pal() { return flavorFor(State.data.cycle); }

  get world() { return { vortices: this.vortices, home: { x: LAUNCHER.x, y: LAUNCHER.y } }; }

  get weapon() { return WEAPON_BY_ID[State.data.weapon] || WEAPON_BY_ID.picole; }

  // ---------------------------------------------------------------- fase ---
  buildLevel() {
    const d = State.data;
    const plan = levelPlan(d.level, d.cycle);
    this.plan = plan;
    this.fx.clear();
    this.blades.length = 0;
    this.gelecos = plan.gelecos.map((g) => new Geleco(g));
    this.placas = plan.placas.map((p) => new Placa(p));
    this.bonus = plan.bonus.map((b) => new Bonus(b));
    this.proibidos = plan.proibidos.map((p) => new Proibido(p));
    this.vortices = plan.vortices.map((v) => new Vortice(v));
    this.bossG = this.gelecos.find((g) => g.boss) || null;
    this.left = plan.blades;
    this.volley = { live: 0, cuts: 0, kills: 0, perfects: 0 };
    this.levelScore = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.banner = { tag: plan.tag, t: 0 };
    this.sfx.startPad(plan.boss ? 44 : 55);
    this.pushHud();
    this.hooks.onLevel?.(plan);
  }

  pushHud() {
    const d = State.data;
    this.hooks.onHud?.({
      level: d.level, cycle: d.cycle, blades: this.left, maxBlades: this.plan?.blades || 0,
      score: d.score, coins: d.coins, weapon: this.weapon, streak: d.streak,
      boss: this.bossG && this.bossG.alive ? this.bossG.hpFrac : null,
      bossName: this.plan?.bossName || '',
      alvos: this.gelecos.filter((g) => g.alive).length,
    });
  }

  // ------------------------------------------------------------- entrada ---
  aimAt(cx, cy) {
    const p = this.toArena(cx, cy);
    let a = Math.atan2(p.y - LAUNCHER.y, p.x - LAUNCHER.x);
    // só arremessa pra cima (com folga lateral generosa)
    const lim = 0.16;
    if (Math.sin(a) > -lim) a = Math.cos(a) >= 0 ? -lim : Math.PI + lim;
    this.aimAng = a;
  }

  // Caminho previsto da lâmina para um ângulo — é o que a linha de mira
  // desenha e o que os testes automatizados usam para escolher o tiro.
  aimPath(ang, passos = 78) {
    return previewPath(
      LAUNCHER.x + Math.cos(ang) * 40, LAUNCHER.y + Math.sin(ang) * 40,
      ang, this.weapon, this.world, passos,
    );
  }

  aimStart(cx, cy) { if (this.phase !== 'play') return; this.aiming = true; this.aimAt(cx, cy); }
  aimMove(cx, cy) { if (this.aiming) this.aimAt(cx, cy); }
  aimEnd() { if (!this.aiming) return; this.aiming = false; this.fire(); }
  nudge(dir) { if (this.phase === 'play') this.aimAng = clamp(this.aimAng + dir * 0.045, -Math.PI + 0.16, -0.16); }

  // ----------------------------------------------------------- arremesso ---
  fire() {
    if (this.phase !== 'play' || this.left <= 0) return;
    const w = this.weapon;
    this.left--;
    this.recoil = 1;
    this.sfx.throwBlade();
    this.fx.burst(LAUNCHER.x + Math.cos(this.aimAng) * 44, LAUNCHER.y + Math.sin(this.aimAng) * 44, 10, {
      ang: this.aimAng, spread: 1.1, speed: 420, size: 3.5, life: 0.3,
      colors: [this.pal.core, this.pal.accent], kind: 'spark', gravity: 200,
    });

    const n = w.multi || 1;
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i - (n - 1) / 2) * (w.spread || 0.14) : 0;
      const b = makeBlade(
        LAUNCHER.x + Math.cos(this.aimAng + off) * 40,
        LAUNCHER.y + Math.sin(this.aimAng + off) * 40,
        this.aimAng + off, w, { curveDir: n > 1 ? Math.sign(off) || 1 : 1 },
      );
      b.hitIds = new Set();
      this.blades.push(b);
    }
    this.volley = { live: n, cuts: 0, kills: 0, perfects: 0 };
    this.pushHud();
  }

  // --------------------------------------------------------------- update --
  update(rawDt) {
    if (this.paused) return;
    this.time += rawDt;
    this.back.update(rawDt);

    // hitstop: congela a ação (mas o fundo continua respirando)
    if (this.fx.hitstop > 0) {
      this.fx.hitstop -= rawDt;
      this.fx.update(rawDt * 0.15);
      return;
    }

    const dt = Math.min(0.05, rawDt) * this.fx.timeScale;
    this.fx.update(rawDt);
    this.recoil = Math.max(0, this.recoil - rawDt * 5);
    this.wallGlow = Math.max(0, this.wallGlow - rawDt * 3);
    this.phaseT += rawDt;

    if (this.phase === 'intro') {
      this.banner.t += rawDt;
      if (this.phaseT > 0.95) { this.phase = 'play'; this.phaseT = 0; }
    }

    for (const g of this.gelecos) g.update(dt, ARENA);
    for (const p of this.placas) p.update(dt);
    for (const b of this.bonus) b.update(dt);
    for (const p of this.proibidos) p.update(dt);
    for (const v of this.vortices) v.update(dt);

    this.updateBlades(dt);

    if (this.phase === 'clear' && this.phaseT > TUNE.CLEAR_DELAY) this.advance();
    if (this.phase === 'fail' && this.phaseT > TUNE.FAIL_DELAY) {
      this.phase = 'hold';
      this.hooks.onFail?.({ level: State.data.level, cycle: State.data.cycle });
    }
  }

  updateBlades(dt) {
    for (const b of this.blades) {
      if (b.dead) continue;
      // subpassos: a lâmina é rápida, precisa varrer o caminho pra não atravessar
      const sub = clamp(Math.ceil((b.speed * dt) / 11), 1, 26);
      const sdt = dt / sub;
      for (let i = 0; i < sub && !b.dead; i++) {
        stepMotion(b, sdt, this.world);
        if (b.sparkWall > 0) {
          b.sparkWall = 0;
          this.wallGlow = 1;
          this.sfx.ricochet();
          this.fx.burst(b.x, b.y, 8, {
            ang: Math.atan2(b.dy, b.dx), spread: 2.2, speed: 300, size: 3,
            life: 0.3, colors: [this.pal.core, this.pal.accent2], kind: 'spark', gravity: 500,
          });
        }
        if (b.boomerang && b.returning && b.hitIds.size && !b._cleared) { b._cleared = true; b.hitIds.clear(); }
        if (!b.dead) this.collide(b);
      }
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > TUNE.TRAIL) b.trail.shift();
    }

    // lâminas mortas saem depois que o rastro apaga
    for (const b of this.blades) {
      if (b.dead) { b.trail.shift(); b.trail.shift(); }
    }
    const before = this.blades.length;
    this.blades = this.blades.filter((b) => !b.dead || b.trail.length > 0);

    // fim da salva: fecha o combo e decide o rumo da fase
    const liveNow = this.blades.filter((b) => !b.dead).length;
    if (this.volley.live > 0 && liveNow === 0) {
      this.volley.live = 0;
      this.finishVolley();
    }
    if (before !== this.blades.length) this.pushHud();
  }

  // --------------------------------------------------------------- colisão --
  collide(b) {
    const ax = b.px, ay = b.py, bx = b.x, by = b.y;
    const r = TUNE.BLADE_R;

    // 1) cristal proibido: encostou, perdeu
    for (const p of this.proibidos) {
      if (p.hits(bx, by, r)) { this.hitProibido(p, b); return; }
    }

    // 2) placas de aço
    for (const pl of this.placas) {
      if (!pl.hits(bx, by, r)) continue;
      pl.flash = 1;
      this.sfx.clank();
      this.fx.burst(bx, by, 16, {
        ang: Math.atan2(-b.dy, -b.dx), spread: 2.0, speed: 460, size: 3.4, life: 0.45,
        colors: ['#ffffff', '#ffe9a8', this.pal.accent2], kind: 'spark', gravity: 900,
      });
      this.fx.shake(0.18);
      if (!b.armorPierce) {
        this.fx.ring(bx, by, { r0: 4, r1: 76, life: 0.3, color: hexA(this.pal.accent2, 0.8), width: 6 });
        b.dead = true; b.reason = 'placa';
        return;
      }
      this.fx.stop(0.02);
    }

    // 3) bônus
    for (const bn of this.bonus) {
      if (!bn.alive || !bn.hits(bx, by, r)) continue;
      bn.alive = false;
      if (bn.tipo === 'recarga') {
        this.left++;
        this.sfx.refill();
        this.fx.text(bn.x, bn.y - 26, '+1 LÂMINA', { color: this.pal.accent2, size: 34 });
      } else {
        const v = SCORE.CHERRY;
        State.data.coins += 3;
        this.addScore(v);
        this.sfx.coin();
        this.fx.text(bn.x, bn.y - 24, '+3 🍒', { color: '#ff9ab4', size: 32 });
      }
      this.fx.burst(bn.x, bn.y, 18, {
        speed: 300, size: 4, life: 0.5, colors: ['#ff9ab4', '#ffffff', this.pal.accent],
        kind: 'dot', gravity: 700,
      });
      this.fx.ring(bn.x, bn.y, { r0: 5, r1: 90, life: 0.35, color: hexA('#ffffff', 0.7), width: 5 });
      this.pushHud();
    }

    // 4) gelecos — o corte de verdade
    for (const g of this.gelecos) {
      if (!g.alive || b.hitIds.has(g)) continue;
      const hit = g.hitBy(ax, ay, bx, by);
      if (!hit) continue;
      b.hitIds.add(g);
      this.doCut(g, b, hit);
      if (b.dead) return;
    }
  }

  doCut(g, b, hit) {
    const dx = b.dx, dy = b.dy;
    // distância do NÚCLEO à reta do corte: é isso que define o CORTE PERFEITO
    const coreDist = Math.abs(dx * (g.y - hit.y) - dy * (g.x - hit.x));
    const res = g.cut(hit.x, hit.y, dx, dy);
    if (!res) return;

    if (b.cross && g.alive) g.cut(hit.x, hit.y, -dy, dx);
    if (b.freeze) { g.freeze = b.freeze; this.sfx.freeze(); }

    const pal = this.pal;
    const perfect = coreDist <= TUNE.PERFECT_DIST;
    this.volley.cuts++;
    State.data.totalCuts++;

    // ---- efeitos do corte
    this.fx.slash(hit.x, hit.y, dx, dy, {
      len: 340 + res.frac * 700, width: 18 + res.frac * 60, life: 0.28, color: pal.core,
    });
    this.fx.burst(hit.x, hit.y, 16 + Math.round(res.frac * 26), {
      ang: Math.atan2(dy, dx) + Math.PI / 2, spread: 2.6, speed: 340, size: 5.5, life: 0.7,
      colors: [pal.body0, pal.body1, pal.core, pal.edge],
    });
    this.fx.burst(hit.x, hit.y, 10, {
      speed: 130, size: 12, life: 0.9, colors: [pal.core, pal.accent], kind: 'mist', gravity: -60, drag: 2.4,
    });
    this.fx.shake(TUNE.SHAKE_CUT * (0.5 + res.frac));
    this.fx.stop(TUNE.HITSTOP);
    this.fx.punch(0.012);
    this.sfx.slice(0.7 + res.frac);

    let pts = SCORE.CUT;
    if (perfect) {
      pts += SCORE.PERFECT;
      this.volley.perfects++;
      State.data.perfects++;
      this.sfx.perfect();
      this.fx.text(hit.x, hit.y - 54, 'PERFEITO!', { color: pal.accent, size: 46, life: 0.8 });
      this.fx.ring(g.x, g.y, { r0: 10, r1: 210, life: 0.45, color: hexA(pal.accent, 0.9), width: 9 });
      this.fx.blink(0.20);
    }

    if (res.killed) {
      this.volley.kills++;
      State.data.totalKills++;
      pts += g.boss ? SCORE.BOSS : SCORE.KILL;
      this.fx.shake(TUNE.SHAKE_KILL * (g.boss ? 1.6 : 1));
      this.fx.stop(TUNE.HITSTOP_KILL);
      this.fx.punch(0.03);
      this.fx.ring(g.x, g.y, { r0: 14, r1: g.boss ? 460 : 250, life: 0.5, color: hexA(pal.core, 0.85), width: 12 });
      this.fx.burst(g.x, g.y, g.boss ? 90 : 40, {
        speed: g.boss ? 720 : 480, size: 7, life: 1.1,
        colors: [pal.body0, pal.body1, pal.core, pal.accent, pal.edge],
      });
      if (g.boss) { this.sfx.bossDown(); this.fx.blink(0.45); } else this.sfx.shatter();
      // a fase acaba no instante em que o último alvo se parte — nada de
      // perder depois de já ter limpado tudo
      if (this.gelecos.every((o) => !o.alive)) this.clearLevel();
    }

    this.addScore(pts);
    b.pierce--;
    if (b.pierce <= 0) { b.dead = true; b.reason = 'gastou'; }
    this.pushHud();
  }

  hitProibido(p, b) {
    b.dead = true; b.reason = 'proibido';
    // se já não há alvos vivos, a fase já estava ganha: não pune
    if (this.gelecos.every((o) => !o.alive)) return;
    this.sfx.boom();
    this.fx.shake(0.9);
    this.fx.blink(0.5);
    this.fx.stop(0.14);
    this.fx.ring(p.x, p.y, { r0: 10, r1: 420, life: 0.6, color: 'rgba(255,70,110,0.9)', width: 14 });
    this.fx.burst(p.x, p.y, 60, {
      speed: 620, size: 7, life: 1.0, colors: ['#ff2d5e', '#ff9ab4', '#ffffff', '#7a1030'],
    });
    this.fx.text(p.x, p.y - 66, 'CRISTAL INSTÁVEL!', { color: '#ff6a8c', size: 44, life: 1.1 });
    this.volley.live = 0;
    for (const ob of this.blades) ob.dead = true;
    this.failLevel();
  }

  // ------------------------------------------------------------- pontuação --
  addScore(base) {
    const d = State.data;
    const streakMul = Math.min(SCORE.STREAK_MAX, 1 + d.streak * SCORE.STREAK_STEP);
    const gain = Math.round(base * streakMul * d.cycle);
    d.score += gain;
    this.levelScore += gain;
    return gain;
  }

  finishVolley() {
    const v = this.volley;
    if (v.kills >= 2) {
      const names = ['', '', 'CORTE DUPLO!', 'CORTE TRIPLO!', 'QUÁDRUPLO!', 'MASSACRE GELADO!'];
      const label = names[Math.min(v.kills, 5)];
      const bonus = Math.round(SCORE.KILL * (v.kills - 1) * SCORE.COMBO_STEP * v.kills);
      this.addScore(bonus);
      this.fx.text(ARENA.W / 2, ARENA.H * 0.46, label, { color: this.pal.accent, size: 62, life: 1.2, vy: -70, delay: 0.1 });
      this.fx.blink(0.18);
      this.fx.shake(0.4);
      this.sfx.levelUp();
    }
    this.checkLevelEnd();
    this.pushHud();
  }

  checkLevelEnd() {
    if (this.phase !== 'play') return;
    const restam = this.gelecos.filter((g) => g.alive).length;
    if (restam === 0) return this.clearLevel();
    if (this.left <= 0) return this.failLevel();
  }

  clearLevel() {
    if (this.phase === 'clear') return;
    this.phase = 'clear'; this.phaseT = 0;
    const d = State.data;
    const bonus = this.left * SCORE.BLADE_LEFT;
    if (bonus) {
      this.addScore(bonus);
      this.fx.text(ARENA.W / 2, ARENA.H * 0.66, `+${this.left} LÂMINAS DE SOBRA`, {
        color: this.pal.accent2, size: 38, life: 1.0, delay: 0.42,
      });
    }
    d.coins += 5 + (this.plan.boss ? 25 : 0);
    d.streak++;
    if (this.plan.boss) d.bosses++;
    this.fx.slowmo(TUNE.SLOWMO_TIME, TUNE.SLOWMO_SCALE);
    this.fx.blink(0.26);
    this.fx.text(ARENA.W / 2, ARENA.H * 0.27, this.plan.boss ? 'CHEFE DERROTADO!' : 'FASE LIMPA!', {
      color: this.pal.core, size: 66, life: 1.25, vy: -40, delay: 0.18,
    });
    this.sfx.levelUp();
    State.save();
    this.pushHud();
  }

  failLevel() {
    if (this.phase === 'fail' || this.phase === 'clear') return;
    this.phase = 'fail'; this.phaseT = 0;
    State.data.streak = 0;
    this.sfx.fail();
    this.sfx.stopPad();
    this.fx.text(ARENA.W / 2, ARENA.H * 0.38, 'SEM LÂMINAS', { color: '#ff8aa5', size: 56, life: 1.4, vy: -30 });
    State.save();
    this.pushHud();
  }

  // ------------------------------------------------------- avanço de fase --
  advance() {
    const d = State.data;
    const beat = d.level;
    if (d.cycle === 1) d.maxLevel = Math.max(d.maxLevel, beat);
    const unlocked = d.cycle === 1 ? weaponUnlockedAt(beat) : null;

    if (beat >= LEVELS_PER_CYCLE) {
      d.cycle++; d.level = 1;
      d.maxCycle = Math.max(d.maxCycle, d.cycle);
      d.best = Math.max(d.best, d.score);
      State.save();
      this.phase = 'hold';
      this.sfx.cycle();
      this.hooks.onCycle?.({ cycle: d.cycle, flavor: flavorFor(d.cycle), score: d.score });
      return;
    }

    d.level = beat + 1;
    d.best = Math.max(d.best, d.score);
    State.save();

    if (unlocked) {
      this.phase = 'hold';
      this.sfx.unlock();
      this.hooks.onUnlock?.(unlocked);
      return;
    }
    this.buildLevel();
  }

  retry() { State.data.score = Math.round(State.data.score * 0.75); this.buildLevel(); }
  next() { this.buildLevel(); }

  // ------------------------------------------------------------- desenho ---
  draw() {
    const ctx = this.ctx;
    const pal = this.pal;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);

    ctx.save();
    ctx.translate(this.ox, this.oy);
    ctx.scale(this.scale, this.scale);

    // tremor + soco de zoom
    const sh = this.fx.shakeOffset();
    const z = 1 + this.fx.zoom;
    ctx.translate(ARENA.W / 2, ARENA.H / 2);
    ctx.rotate(sh.r); ctx.scale(z, z);
    ctx.translate(-ARENA.W / 2 + sh.x, -ARENA.H / 2 + sh.y);

    this.back.draw(ctx, pal);
    for (const v of this.vortices) v.draw(ctx, pal);
    this.fx.drawBehind(ctx);
    drawArena(ctx, pal, this.time, this.wallGlow);

    if (this.phase === 'play' && this.aiming) drawAim(ctx, this.aimPath(this.aimAng), pal, this.time);

    for (const b of this.bonus) b.draw(ctx, pal);
    for (const g of this.gelecos) g.draw(ctx, pal, this.time);
    for (const p of this.proibidos) p.draw(ctx, pal);
    for (const pl of this.placas) pl.draw(ctx, pal);

    for (const b of this.blades) drawTrail(ctx, b, pal);
    for (const b of this.blades) if (!b.dead) drawBlade(ctx, b, pal);

    this.fx.drawFront(ctx);

    drawFloor(ctx, pal);
    drawLauncher(ctx, pal, this.time, this.aimAng, this.recoil, this.phase === 'play' && this.left > 0);

    if (this.banner && this.phase === 'intro') this.drawBanner(ctx, pal);

    drawVignette(ctx, pal);
    this.back.drawGrain(ctx);
    this.fx.drawOverlay(ctx, ARENA.W, ARENA.H);
    ctx.restore();
  }

  drawBanner(ctx, pal) {
    const k = clamp(this.banner.t / 0.95, 0, 1);
    // entra rápido, segura, sai rápido
    const inK = clamp(k / 0.18, 0, 1), outK = clamp((k - 0.72) / 0.28, 0, 1);
    const x = ARENA.W / 2 + (1 - ease(inK)) * 620 - ease(outK) * 620;
    const a = 1 - outK;
    const d = State.data;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, ARENA.H * 0.34);

    ctx.fillStyle = 'rgba(6,10,14,0.72)';
    ctx.fillRect(-ARENA.W / 2, -76, ARENA.W, 152);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(pal.accent, 0.85); ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-ARENA.W / 2, -76); ctx.lineTo(ARENA.W / 2, -76);
    ctx.moveTo(-ARENA.W / 2, 76); ctx.lineTo(ARENA.W / 2, 76);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = pal.core;
    ctx.font = '900 68px "Baloo 2", system-ui, sans-serif';
    ctx.fillText(this.plan.boss ? 'CHEFE' : `FASE ${d.level}`, 0, -18);
    ctx.fillStyle = hexA(pal.accent, 0.95);
    ctx.font = '800 30px "Baloo 2", system-ui, sans-serif';
    ctx.fillText(`${this.plan.tag}  ·  CICLO ${d.cycle} ${flavorFor(d.cycle).name}`, 0, 38);
    ctx.restore();
  }
}

function ease(k) { return 1 - Math.pow(1 - k, 3); }
