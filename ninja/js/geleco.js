// ============================================================================
// GELO NINJA — os GELECOS (os "bonecos").
// São criaturas de gelato: bolas, casquinhas, cubos e picolés com núcleo
// brilhante e luzinhas de visor. Formas geométricas — nada humano, nada de
// ferimento: quando cortados, mostram RECHEIO de gelato e derretem.
//
// Regra de dano (o coração da skill):
//   todo corte parte o corpo em dois; a FATIA MENOR se solta e derrete.
//   O geleco morre quando sobra menos que `killFrac` da massa original.
//   -> corte no meio = mata de primeira. Corte de raspão = desperdiça a lâmina.
// ============================================================================

import {
  v, polyArea, polyCentroid, polyRadius, convexHull, splitPolygon,
  segmentHit, tracePoly, strokeCutEdges,
} from './slice.js';
import { makeRng } from './rng.js';

const TAU = Math.PI * 2;

// --- fragmento solto (a fatia que voa e derrete) --------------------------
class Frag {
  constructor(local, ox, oy, x, y, rot, sx, sy) {
    this.local = local; this.ox = ox; this.oy = oy;
    this.x = x; this.y = y; this.rot = rot;
    this.sx = sx; this.sy = sy;
    this.vx = 0; this.vy = 0; this.vr = 0;
    this.life = 0; this.melt = 0;
    this.area = polyArea(local);
  }
}

// ---------------------------------------------------------------------------
// Formas base (em espaço de arte, centradas na origem)
// ---------------------------------------------------------------------------
function shapeBola(rng, s) {
  const pts = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rng.range(-0.06, 0.06);
    const r = s * rng.range(0.86, 1.06);
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * rng.range(0.94, 1.04) });
  }
  return convexHull(pts);
}

function shapeCone(rng, s) {
  // casquinha: topo largo e arredondado, ponta embaixo
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;               // meia-lua superior
    pts.push({ x: Math.cos(a) * s * 1.02, y: Math.sin(a) * s * 0.9 - s * 0.18 });
  }
  pts.push({ x: s * 0.16, y: s * 1.12 });
  pts.push({ x: -s * 0.16, y: s * 1.12 });
  return convexHull(pts);
}

function shapeCubo(rng, s) {
  const k = s * 0.92;
  const c = s * 0.30;
  return convexHull([
    { x: -k + c, y: -k }, { x: k - c, y: -k }, { x: k, y: -k + c }, { x: k, y: k - c },
    { x: k - c, y: k }, { x: -k + c, y: k }, { x: -k, y: k - c }, { x: -k, y: -k + c },
  ]);
}

function shapePicole(rng, s) {
  const w = s * 0.66, h = s * 1.22, c = s * 0.26;
  return convexHull([
    { x: -w + c, y: -h }, { x: w - c, y: -h }, { x: w, y: -h + c }, { x: w, y: h - c },
    { x: w - c, y: h }, { x: -w + c, y: h }, { x: -w, y: h - c }, { x: -w, y: -h + c },
  ]);
}

function shapeEstrela(rng, s) {
  const pts = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU - Math.PI / 2;
    pts.push({ x: Math.cos(a) * s * 1.05, y: Math.sin(a) * s * 1.05 });
  }
  return convexHull(pts);
}

const SHAPES = { bola: shapeBola, cone: shapeCone, cubo: shapeCubo, picole: shapePicole, estrela: shapeEstrela };
export const SHAPE_IDS = Object.keys(SHAPES);

// ---------------------------------------------------------------------------
// GELECO
// ---------------------------------------------------------------------------
export class Geleco {
  constructor(opts) {
    const rng = makeRng(opts.seed >>> 0);
    this.rng = rng;
    this.seed = opts.seed >>> 0;
    this.kind = opts.kind || 'bola';
    this.size = opts.size || 54;
    this.boss = !!opts.boss;
    this.killFrac = opts.killFrac != null ? opts.killFrac : 0.6;
    this.motion = opts.motion || { type: 'static' };

    this.x = opts.x; this.y = opts.y;
    this.rot = opts.rot || 0;
    this.sx = 1; this.sy = 1;

    this.poly = (SHAPES[this.kind] || shapeBola)(rng, this.size);
    // normaliza: seja qual for a forma, o raio externo é exatamente `size`.
    // Isso faz o desenho das fases (distâncias, anéis, faixas) bater sempre.
    const r0 = polyRadius(this.poly, { x: 0, y: 0 }) || this.size;
    const k = this.size / r0;
    for (const v0 of this.poly) { v0.x *= k; v0.y *= k; }
    this.area0 = polyArea(this.poly);
    this.area = this.area0;
    this.radius = polyRadius(this.poly, { x: 0, y: 0 });
    this.round = this.size * (this.kind === 'cubo' ? 0.26 : 0.42);

    this.frags = [];               // fatias soltas derretendo
    this.alive = true;
    this.dying = 0;
    this.cuts = 0;
    this.freeze = 0;
    this.flash = 0;
    this.wob = rng.range(0, TAU);
    this.t = rng.range(0, 10);
    this.tint = rng.range(-1, 1);        // cada geleco tem seu tom do sabor

    // decoração determinística
    this.sprinkles = [];
    const ns = Math.round(this.size / 7);
    for (let i = 0; i < ns; i++) {
      this.sprinkles.push({
        x: rng.range(-1, 1) * this.size * 0.78,
        y: rng.range(-1, 1) * this.size * 0.78,
        a: rng.range(0, TAU), l: rng.range(3, 7), h: rng.range(0, 360),
      });
    }
    this.eyeY = -this.size * 0.16;
    this.eyeGap = this.size * (this.kind === 'picole' ? 0.28 : 0.36);
    this.antena = rng.chance(0.45) && this.kind !== 'cubo';
    this.blink = rng.range(0, 6);
  }

  get hpFrac() {
    const span = Math.max(0.001, 1 - this.killFrac);
    return Math.max(0, Math.min(1, (this.area / this.area0 - this.killFrac) / span));
  }

  // --- transformações mundo <-> arte (inclui o wobble, senão o corte "escorrega")
  toLocal(wx, wy) {
    const dx = wx - this.x, dy = wy - this.y;
    const c = Math.cos(-this.rot), s = Math.sin(-this.rot);
    return { x: (dx * c - dy * s) / this.sx, y: (dx * s + dy * c) / this.sy };
  }

  toWorld(lx, ly) {
    const px = lx * this.sx, py = ly * this.sy;
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    return { x: this.x + px * c - py * s, y: this.y + px * s + py * c };
  }

  worldPoly() {
    return this.poly.map((p) => { const w = this.toWorld(p.x, p.y); return v(w.x, w.y, p.cut); });
  }

  update(dt, arena) {
    this.t += dt;
    if (this.freeze > 0) this.freeze = Math.max(0, this.freeze - dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);

    const frozen = this.freeze > 0;
    const m = this.motion;
    if (this.alive && !frozen) {
      if (m.type === 'spin') {
        this.rot += m.speed * dt;
      } else if (m.type === 'orbit') {
        m.a = (m.a || 0) + m.speed * dt;
        this.x = m.cx + Math.cos(m.a) * m.r;
        this.y = m.cy + Math.sin(m.a) * m.r;
        this.rot += (m.spin || 0) * dt;
      } else if (m.type === 'path') {
        m.p = (m.p || 0) + m.speed * dt;
        const k = (Math.sin(m.p) + 1) / 2;
        this.x = m.x0 + (m.x1 - m.x0) * k;
        this.y = m.y0 + (m.y1 - m.y0) * k;
        this.rot += (m.spin || 0) * dt;
      } else if (m.type === 'pendulum') {
        m.p = (m.p || 0) + m.speed * dt;
        const a = m.a0 + Math.sin(m.p) * m.amp;
        this.x = m.cx + Math.cos(a) * m.r;
        this.y = m.cy + Math.sin(a) * m.r;
        this.rot = a - Math.PI / 2;
      }
    }

    // wobble de gelatina (para quando congelado)
    const w = frozen ? 0 : Math.sin(this.t * 3.1 + this.wob) * 0.035 + this.flash * 0.10;
    this.sx = 1 + w; this.sy = 1 - w;

    if (this.dying > 0) this.dying = Math.max(0, this.dying - dt * 2.2);

    // fatias soltas: caem, giram e derretem
    for (const f of this.frags) {
      f.life += dt;
      f.vy += 1350 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.life > 0.18) f.melt = Math.min(1, f.melt + dt * 1.5);
    }
    this.frags = this.frags.filter((f) => f.melt < 1 && f.y < arena.H + 400);
  }

  // Corta pela reta mundo (px,py)+t*(dx,dy). Devolve o resultado do corte ou null.
  cut(px, py, dx, dy) {
    if (!this.alive) return null;
    const a = this.toLocal(px, py);
    const b = this.toLocal(px + dx * 100, py + dy * 100);
    const ldx = b.x - a.x, ldy = b.y - a.y;
    const parts = splitPolygon(this.poly, a.x, a.y, ldx, ldy);
    if (!parts) return null;

    const [A, B] = parts;
    const areaA = polyArea(A), areaB = polyArea(B);
    const keep = areaA >= areaB ? A : B;
    const drop = areaA >= areaB ? B : A;
    const removed = Math.min(areaA, areaB);

    // fatia menor se solta
    const dc = polyCentroid(drop);
    const dw = this.toWorld(dc.x, dc.y);
    const frag = new Frag(drop, dc.x, dc.y, dw.x, dw.y, this.rot, this.sx, this.sy);
    const nx = -ldy, ny = ldx;
    const nl = Math.hypot(nx, ny) || 1;
    const side = Math.sign((nx / nl) * (dc.x - a.x) + (ny / nl) * (dc.y - a.y)) || 1;
    const push = 150 + Math.min(260, removed / 22);
    frag.vx = (nx / nl) * side * push + dx * 90;
    frag.vy = (ny / nl) * side * push + dy * 90 - 130;
    frag.vr = (Math.random() - 0.5) * 9;
    this.frags.push(frag);

    this.poly = keep;
    this.area = polyArea(keep);
    this.radius = polyRadius(keep, { x: 0, y: 0 });
    this.cuts++;
    this.flash = 1;

    const cw = polyCentroid(keep);
    const centerDist = Math.hypot(cw.x, cw.y);
    const killed = this.area / this.area0 <= this.killFrac || this.area < 1200;
    if (killed) this.kill(dx, dy);

    return {
      killed,
      removed,
      frac: removed / this.area0,
      hit: { x: px, y: py },
      dist: centerDist,
      geleco: this,
    };
  }

  // Estilhaça o que sobrou (morte).
  kill(dx = 0, dy = -1) {
    if (!this.alive) return;
    this.alive = false;
    this.dying = 1;
    // reparte o resto em cacos e joga tudo pra fora
    const c = polyCentroid(this.poly);
    let shards = [this.poly];
    for (let pass = 0; pass < 2; pass++) {
      const next = [];
      for (const s of shards) {
        const cc = polyCentroid(s);
        const a = Math.random() * Math.PI;
        const parts = splitPolygon(s, cc.x, cc.y, Math.cos(a), Math.sin(a));
        if (parts) next.push(parts[0], parts[1]); else next.push(s);
      }
      shards = next;
    }
    for (const s of shards) {
      if (polyArea(s) < 40) continue;
      const sc = polyCentroid(s);
      const w = this.toWorld(sc.x, sc.y);
      const f = new Frag(s, sc.x, sc.y, w.x, w.y, this.rot, this.sx, this.sy);
      const ang = Math.atan2(sc.y - c.y, sc.x - c.x);
      const sp = 210 + Math.random() * 300;
      f.vx = Math.cos(ang) * sp + dx * 130;
      f.vy = Math.sin(ang) * sp + dy * 130 - 190;
      f.vr = (Math.random() - 0.5) * 15;
      this.frags.push(f);
    }
    this.poly = [];
    this.area = 0;
  }

  get done() { return !this.alive && this.frags.length === 0; }

  // Intersecção do segmento do voo da lâmina com o corpo (para saber onde bateu).
  hitBy(ax, ay, bx, by) {
    if (!this.alive || this.poly.length < 3) return null;
    return segmentHit(ax, ay, bx, by, this.worldPoly());
  }

  // -------------------------------------------------------------------------
  // DESENHO
  // -------------------------------------------------------------------------
  // Paleta própria: mesmo sabor, tom levemente diferente por geleco — o campo
  // deixa de parecer uma fileira de clones. Calculada uma vez por sabor.
  _pal(pal) {
    if (this._pk !== pal.id) {
      this._pk = pal.id;
      const d = this.tint * 16;
      this._pc = {
        ...pal,
        body0: hueShift(pal.body0, d),
        body1: hueShift(pal.body1, d),
        edge: hueShift(pal.edge, d * 0.5),
      };
    }
    return this._pc;
  }

  draw(ctx, pal0, time) {
    const pal = this._pal(pal0);
    for (const f of this.frags) this._drawFrag(ctx, f, pal);
    if (!this.alive || this.poly.length < 3) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.scale(this.sx, this.sy);
    this._drawBody(ctx, this.poly, pal, time, true);
    ctx.restore();
  }

  _drawFrag(ctx, f, pal) {
    const a = 1 - f.melt;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.scale(f.sx * (1 - f.melt * 0.25), f.sy * (1 + f.melt * 0.15));
    ctx.translate(-f.ox, -f.oy);
    this._drawBody(ctx, f.local, pal, 0, false);
    ctx.restore();
  }

  _drawBody(ctx, poly, pal, time, live) {
    const s = this.size;
    const frozen = this.freeze > 0;

    ctx.save();
    ctx.beginPath();
    tracePoly(ctx, poly, this.round);
    ctx.save();
    ctx.clip();

    // recheio (gradiente do sabor)
    const g = ctx.createLinearGradient(-s, -s * 1.1, s * 0.6, s * 1.2);
    g.addColorStop(0, pal.body0);
    g.addColorStop(0.55, pal.body1);
    g.addColorStop(1, shade(pal.body1, -26));
    ctx.fillStyle = g;
    ctx.fillRect(-s * 2.2, -s * 2.2, s * 4.4, s * 4.4);

    // brilho superior (luz de cima)
    const gl = ctx.createRadialGradient(-s * 0.34, -s * 0.5, s * 0.06, -s * 0.2, -s * 0.35, s * 1.5);
    gl.addColorStop(0, 'rgba(255,255,255,0.55)');
    gl.addColorStop(0.45, 'rgba(255,255,255,0.10)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(-s * 2.2, -s * 2.2, s * 4.4, s * 4.4);

    // casquinha waffle (só no cone)
    if (this.kind === 'cone') {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = shade(pal.body1, -50);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = -6; i <= 6; i++) {
        ctx.moveTo(-s * 1.4, s * 0.1 + i * s * 0.2); ctx.lineTo(s * 1.4, s * 0.1 + i * s * 0.2 + s * 0.9);
        ctx.moveTo(s * 1.4, s * 0.1 + i * s * 0.2); ctx.lineTo(-s * 1.4, s * 0.1 + i * s * 0.2 + s * 0.9);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // granulado
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, s * 0.05);
    for (const sp of this.sprinkles) {
      ctx.strokeStyle = `hsla(${sp.h},92%,72%,0.85)`;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x + Math.cos(sp.a) * sp.l, sp.y + Math.sin(sp.a) * sp.l);
      ctx.stroke();
    }

    // núcleo pulsante — o "alvo" que vale o corte perfeito
    if (live) {
      const pulse = 0.72 + Math.sin(time * 4 + this.wob) * 0.16;
      const cg = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 0.62 * pulse);
      cg.addColorStop(0, pal.core);
      cg.addColorStop(0.35, hexA(pal.accent, 0.55));
      cg.addColorStop(1, hexA(pal.accent, 0));
      ctx.fillStyle = cg;
      ctx.fillRect(-s * 1.2, -s * 1.2, s * 2.4, s * 2.4);
    }

    // luzes do visor (criatura, não gente)
    if (live) {
      const bl = (this.t + this.blink) % 4.6;
      const open = bl > 0.14 ? 1 : 0.12;
      ctx.fillStyle = frozen ? '#bff0ff' : pal.core;
      ctx.shadowColor = pal.accent; ctx.shadowBlur = 16;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        roundRect(ctx, dir * this.eyeGap - s * 0.10, this.eyeY - s * 0.09 * open,
          s * 0.20, s * 0.18 * open, s * 0.07);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // gelo por cima quando congelado
    if (frozen) {
      ctx.fillStyle = 'rgba(150,225,255,0.42)';
      ctx.fillRect(-s * 2.2, -s * 2.2, s * 4.4, s * 4.4);
    }
    ctx.restore();   // fim do clip

    // contorno: silhueta suave + aresta de corte afiada e brilhante
    ctx.lineJoin = 'round';
    ctx.strokeStyle = hexA(pal.edge, 0.85);
    ctx.lineWidth = Math.max(2.4, s * 0.06);
    ctx.stroke();

    strokeCutEdges(ctx, poly, pal.core, Math.max(3, s * 0.075));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    strokeCutEdges(ctx, poly, hexA(pal.accent, 0.5), Math.max(6, s * 0.16));
    ctx.restore();

    // antena (só vivos)
    if (live && this.antena) {
      ctx.strokeStyle = hexA(pal.edge, 0.8);
      ctx.lineWidth = Math.max(2, s * 0.045);
      const sway = Math.sin(this.t * 2.4 + this.wob) * s * 0.1;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.85);
      ctx.quadraticCurveTo(sway * 0.5, -s * 1.15, sway, -s * 1.38);
      ctx.stroke();
      ctx.fillStyle = pal.accent;
      ctx.shadowColor = pal.accent; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(sway, -s * 1.42, s * 0.11, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // flash branco no instante do corte
    if (live && this.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); tracePoly(ctx, poly, this.round); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

// --- utilitários de cor -----------------------------------------------------
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Gira o matiz de uma cor hex (mantendo saturação e luz).
export function hueShift(hex, deg) {
  if (!deg) return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, sat = 0;
  if (mx !== mn) {
    const d = mx - mn;
    sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  h = ((h + deg / 360) % 1 + 1) % 1;
  const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
  const pp = 2 * l - q;
  const f = (tt) => {
    tt = (tt % 1 + 1) % 1;
    if (tt < 1 / 6) return pp + (q - pp) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return pp + (q - pp) * (2 / 3 - tt) * 6;
    return pp;
  };
  const to = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255);
  return `#${((to(f(h + 1 / 3)) << 16) | (to(f(h)) << 8) | to(f(h - 1 / 3))).toString(16).padStart(6, '0')}`;
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
