// ============================================================================
// GELO NINJA — objetos de cena que mudam o desenho da fase.
//   PLACA     barra de aço que quebra a lâmina (só KUNAI e SERRA atravessam)
//   CEREJA    bônus: moedas
//   RECARGA   bônus: +1 lâmina
//   PROIBIDO  cristal instável: encostou, perdeu a fase
//   VÓRTICE   poço de gravidade que entorta a trajetória
// ============================================================================

import { distToSegment } from './slice.js';
import { hexA, roundRect } from './geleco.js';

const TAU = Math.PI * 2;

export class Placa {
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, len: 120, th: 15, rot: 0, spin: 0, orbit: null }, o);
    this.t = 0; this.flash = 0; this.alive = true;
  }

  update(dt) {
    this.t += dt;
    this.rot += this.spin * dt;
    if (this.orbit) {
      this.orbit.a += this.orbit.speed * dt;
      this.x = this.orbit.cx + Math.cos(this.orbit.a) * this.orbit.r;
      this.y = this.orbit.cy + Math.sin(this.orbit.a) * this.orbit.r;
      if (this.orbit.face) this.rot = this.orbit.a + Math.PI / 2;
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);
  }

  ends() {
    const c = Math.cos(this.rot) * this.len / 2, s = Math.sin(this.rot) * this.len / 2;
    return [this.x - c, this.y - s, this.x + c, this.y + s];
  }

  hits(px, py, r) {
    const [ax, ay, bx, by] = this.ends();
    return distToSegment(px, py, ax, ay, bx, by) < this.th / 2 + r;
  }

  draw(ctx, pal) {
    const [ax, ay, bx, by] = this.ends();
    ctx.save();
    ctx.lineCap = 'round';
    // sombra/base
    ctx.strokeStyle = '#0a0f14';
    ctx.lineWidth = this.th + 7;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    // corpo metálico
    const g = ctx.createLinearGradient(ax, ay - this.th, bx, by + this.th);
    g.addColorStop(0, '#8ea2b4'); g.addColorStop(0.35, '#e6eef6');
    g.addColorStop(0.6, '#93a6b8'); g.addColorStop(1, '#5c6b7a');
    ctx.strokeStyle = g;
    ctx.lineWidth = this.th;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    // rebites
    ctx.fillStyle = '#3c4854';
    for (let i = -1; i <= 1; i++) {
      const k = (i + 1) / 2;
      ctx.beginPath();
      ctx.arc(ax + (bx - ax) * k, ay + (by - ay) * k, this.th * 0.17, 0, TAU);
      ctx.fill();
    }
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash;
      ctx.strokeStyle = hexA(pal.accent2, 0.9);
      ctx.lineWidth = this.th + 12;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.restore();
  }
}

export class Bonus {
  // tipo: 'cereja' (moedas) | 'recarga' (+1 lâmina)
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, r: 19, tipo: 'cereja', orbit: null }, o);
    this.t = Math.random() * 6; this.alive = true; this.pop = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.orbit) {
      this.orbit.a += this.orbit.speed * dt;
      this.x = this.orbit.cx + Math.cos(this.orbit.a) * this.orbit.r;
      this.y = this.orbit.cy + Math.sin(this.orbit.a) * this.orbit.r;
    }
    if (this.pop > 0) this.pop = Math.max(0, this.pop - dt * 3);
  }

  hits(px, py, r) { return this.alive && Math.hypot(px - this.x, py - this.y) < this.r + r; }

  draw(ctx, pal) {
    if (!this.alive) return;
    const bob = Math.sin(this.t * 2.6) * 3;
    const r = this.r * (1 + Math.sin(this.t * 3.4) * 0.05);
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    if (this.tipo === 'recarga') {
      ctx.shadowColor = pal.accent2; ctx.shadowBlur = 22;
      ctx.fillStyle = pal.accent2;
      ctx.beginPath(); roundRect(ctx, -r * 0.85, -r, r * 1.7, r * 2, r * 0.5); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#08121a';
      ctx.font = `800 ${r * 1.25}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+1', 0, 1);
    } else {
      ctx.rotate(Math.sin(this.t * 1.7) * 0.25);
      ctx.shadowColor = '#ff3b6b'; ctx.shadowBlur = 20;
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#ff9ab4'); g.addColorStop(0.5, '#ef2d5e'); g.addColorStop(1, '#8e0b2c');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, r * 0.15, r * 0.86, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#5fdc8a'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.quadraticCurveTo(r * 0.5, -r * 1.2, r * 0.9, -r * 1.1); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.15, r * 0.2, r * 0.13, -0.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

export class Proibido {
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, r: 30, spin: 1.1, orbit: null }, o);
    this.t = Math.random() * 6; this.rot = 0; this.alive = true;
  }

  update(dt) {
    this.t += dt; this.rot += this.spin * dt;
    if (this.orbit) {
      this.orbit.a += this.orbit.speed * dt;
      this.x = this.orbit.cx + Math.cos(this.orbit.a) * this.orbit.r;
      this.y = this.orbit.cy + Math.sin(this.orbit.a) * this.orbit.r;
    }
  }

  hits(px, py, r) { return Math.hypot(px - this.x, py - this.y) < this.r * 0.86 + r; }

  draw(ctx) {
    const r = this.r, pulse = 0.85 + Math.sin(this.t * 5) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    // halo de perigo
    const hg = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.1 * pulse);
    hg.addColorStop(0, 'rgba(255,45,90,0.32)');
    hg.addColorStop(1, 'rgba(255,45,90,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(-r * 2.2, -r * 2.2, r * 4.4, r * 4.4);
    ctx.rotate(this.rot);
    // cristal (losango facetado)
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#ff6a8c'); g.addColorStop(0.5, '#c2185b'); g.addColorStop(1, '#3d0620');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const rr = i % 2 ? r * 0.66 : r;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,205,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.restore();
  }
}

export class Vortice {
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, r: 100, force: 1, cw: 1 }, o);
    this.t = Math.random() * 9; this.alive = true;
  }

  update(dt) { this.t += dt; }

  draw(ctx, pal) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const g = ctx.createRadialGradient(0, 0, this.r * 0.05, 0, 0, this.r);
    g.addColorStop(0, hexA(pal.accent2, 0.55));
    g.addColorStop(0.35, hexA(pal.accent2, 0.14));
    g.addColorStop(1, hexA(pal.accent2, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill();
    ctx.rotate(this.t * 1.6 * this.cw);
    ctx.strokeStyle = hexA(pal.accent2, 0.5);
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let s = 0; s < 3; s++) {
      ctx.beginPath();
      for (let i = 0; i <= 26; i++) {
        const k = i / 26;
        const a = s * (TAU / 3) + k * 3.4;
        const rr = this.r * (0.14 + k * 0.8);
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        ctx[i ? 'lineTo' : 'moveTo'](x, y);
      }
      ctx.globalAlpha = 0.7 - s * 0.15;
      ctx.stroke();
    }
    ctx.restore();
  }
}
