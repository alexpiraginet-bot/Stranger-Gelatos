// ============================================================================
// GELO NINJA — efeitos e "game feel".
// Partículas, ondas de choque, o RASGO do corte, texto cinético, tremor de
// câmera, hitstop (congela 2 frames no impacto) e slow-motion no golpe final.
// É este arquivo que faz o jogo PARECER caro.
// ============================================================================

import { hexA } from './geleco.js';

const TAU = Math.PI * 2;

export class Fx {
  constructor() {
    this.parts = [];
    this.rings = [];
    this.slashes = [];
    this.texts = [];
    this.trauma = 0;      // 0..1 — tremor decai sozinho
    this.flash = 0;
    this.hitstop = 0;
    this.slow = 0;
    this.slowScale = 1;
    this.zoom = 0;        // "soco" de zoom no impacto
    this.chroma = 0;
  }

  // --- disparadores ---------------------------------------------------------
  shake(a) { this.trauma = Math.min(1, this.trauma + a); }
  stop(t) { this.hitstop = Math.max(this.hitstop, t); }
  slowmo(dur, scale) { this.slow = Math.max(this.slow, dur); this.slowScale = scale; }
  punch(z) { this.zoom = Math.max(this.zoom, z); }
  blink(a) { this.flash = Math.max(this.flash, a); }

  burst(x, y, n, o = {}) {
    const {
      speed = 320, spread = TAU, ang = 0, colors = ['#fff'],
      size = 5, life = 0.7, kind = 'shard', gravity = 900, drag = 1.4,
    } = o;
    for (let i = 0; i < n; i++) {
      const a = ang + (Math.random() - 0.5) * spread;
      const sp = speed * (0.35 + Math.random() * 0.9);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: size * (0.5 + Math.random()), rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 16,
        life: life * (0.6 + Math.random() * 0.8), t: 0,
        c: colors[(Math.random() * colors.length) | 0], kind, gravity, drag,
        sides: 3 + ((Math.random() * 3) | 0),
      });
    }
  }

  ring(x, y, o = {}) {
    const { r0 = 8, r1 = 190, life = 0.42, color = '#fff', width = 8, ellipse = 1 } = o;
    this.rings.push({ x, y, r0, r1, life, t: 0, color, width, ellipse });
  }

  // O RASGO: um risco de luz na linha exata do corte.
  slash(x, y, dx, dy, o = {}) {
    const { len = 460, width = 26, life = 0.30, color = '#fff' } = o;
    this.slashes.push({ x, y, dx, dy, len, width, life, t: 0, color });
  }

  text(x, y, str, o = {}) {
    const { color = '#fff', size = 40, life = 0.95, vy = -110, weight = 900, delay = 0 } = o;
    this.texts.push({ x, y, str, color, size, life, t: -delay, vy, weight });
  }

  // --- ciclo ---------------------------------------------------------------
  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    this.flash = Math.max(0, this.flash - dt * 3.4);
    this.zoom = Math.max(0, this.zoom - dt * 4.2);
    this.chroma = Math.max(0, this.chroma - dt * 3);
    if (this.slow > 0) this.slow = Math.max(0, this.slow - dt);

    for (const p of this.parts) {
      p.t += dt;
      p.vy += p.gravity * dt;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt * 0.35;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter((p) => p.t < p.life);

    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.life);
    for (const s of this.slashes) s.t += dt;
    this.slashes = this.slashes.filter((s) => s.t < s.life);
    for (const t of this.texts) { t.t += dt; if (t.t < 0) continue; t.y += t.vy * dt; t.vy *= 1 - dt * 1.6; }
    this.texts = this.texts.filter((t) => t.t < t.life);
  }

  get timeScale() { return this.slow > 0 ? this.slowScale : 1; }

  shakeOffset() {
    const s = this.trauma * this.trauma;      // quadrático: só sacode forte quando é forte
    return {
      x: (Math.random() * 2 - 1) * 26 * s,
      y: (Math.random() * 2 - 1) * 26 * s,
      r: (Math.random() * 2 - 1) * 0.028 * s,
    };
  }

  // --- desenho (por camadas) -----------------------------------------------
  drawBehind(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const k = r.t / r.life;
      const rad = r.r0 + (r.r1 - r.r0) * easeOut(k);
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - k * 0.75);
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * r.ellipse, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFront(ctx) {
    // rasgos do corte
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.slashes) {
      const k = s.t / s.life;
      const grow = 0.35 + easeOut(k) * 0.9;
      const w = s.width * (1 - k) * grow;
      const l = s.len * grow;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.dy, s.dx));
      const g = ctx.createLinearGradient(-l / 2, 0, l / 2, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, s.color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = (1 - k) * 0.95;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-l / 2, 0); ctx.lineTo(0, -w / 2); ctx.lineTo(l / 2, 0); ctx.lineTo(0, w / 2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // partículas
    for (const p of this.parts) {
      const k = p.t / p.life;
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = p.c;
      if (p.kind === 'mist') {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (2 + k * 5));
        g.addColorStop(0, hexA(p.c, 0.45 * (1 - k)));
        g.addColorStop(1, hexA(p.c, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (2 + k * 5), 0, TAU); ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.c;
        ctx.lineWidth = Math.max(1, p.r * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      } else if (p.kind === 'dot') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, TAU); ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath();
        for (let i = 0; i < p.sides; i++) {
          const a = (i / p.sides) * TAU;
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * p.r, Math.sin(a) * p.r * 0.8);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // texto cinético
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      if (t.t < 0) continue;
      const k = t.t / t.life;
      const pop = k < 0.16 ? 0.55 + (k / 0.16) * 0.62 : 1.17 - (k - 0.16) * 0.2;
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.translate(t.x, t.y);
      ctx.scale(pop, pop);
      ctx.font = `${t.weight} ${t.size}px "Baloo 2", system-ui, sans-serif`;
      ctx.lineWidth = t.size * 0.22; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(4,8,12,0.85)';
      ctx.strokeText(t.str, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  drawOverlay(ctx, w, h) {
    if (this.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash * 0.30;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  clear() {
    this.parts.length = 0; this.rings.length = 0;
    this.slashes.length = 0; this.texts.length = 0;
    this.trauma = 0; this.flash = 0; this.hitstop = 0; this.slow = 0; this.zoom = 0;
  }
}

function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
