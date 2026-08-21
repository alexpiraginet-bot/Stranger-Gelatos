// ============================================================================
// GELO NINJA — cenário e apresentação.
// Fundo em camadas (gradiente + névoa que anda + poeira de gelo + grade +
// vinheta), moldura da arena e a TORRE que arremessa. Tudo vetor: nenhuma
// imagem para baixar, e fica nítido em qualquer densidade de tela.
// ============================================================================

import { ARENA, FIELD, LAUNCHER, TUNE } from './config.js';
import { hexA, shade } from './geleco.js';

const TAU = Math.PI * 2;

export class Backdrop {
  constructor() {
    this.t = 0;
    this.fog = [];
    for (let i = 0; i < 6; i++) {
      this.fog.push({
        x: Math.random() * ARENA.W, y: Math.random() * ARENA.H,
        r: 220 + Math.random() * 320, sp: 0.06 + Math.random() * 0.16,
        ph: Math.random() * TAU, a: 0.10 + Math.random() * 0.14,
      });
    }
    this.dust = [];
    for (let i = 0; i < 70; i++) {
      this.dust.push({
        x: Math.random() * ARENA.W, y: Math.random() * ARENA.H,
        r: 0.8 + Math.random() * 2.6, sp: 8 + Math.random() * 28,
        ph: Math.random() * TAU, drift: 10 + Math.random() * 26,
      });
    }
    this.noise = null;
  }

  _noiseTile() {
    if (this.noise) return this.noise;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const img = x.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 118 + Math.random() * 42;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    this.noise = c;
    return c;
  }

  update(dt) {
    this.t += dt;
    for (const f of this.fog) {
      f.x += Math.cos(f.ph + this.t * f.sp) * 14 * dt;
      f.y += Math.sin(f.ph * 1.7 + this.t * f.sp * 0.8) * 12 * dt;
    }
    for (const d of this.dust) {
      d.y -= d.sp * dt;
      d.x += Math.sin(this.t * 0.7 + d.ph) * d.drift * dt;
      if (d.y < -8) { d.y = ARENA.H + 8; d.x = Math.random() * ARENA.W; }
    }
  }

  draw(ctx, pal) {
    // gradiente do fundo
    const g = ctx.createLinearGradient(0, 0, ARENA.W * 0.3, ARENA.H);
    g.addColorStop(0, shade(pal.bg1, 12));
    g.addColorStop(0.45, pal.bg1);
    g.addColorStop(1, pal.bg0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ARENA.W, ARENA.H);

    // névoa do sabor
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.fog) {
      const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      rg.addColorStop(0, hexA(pal.fog, f.a));
      rg.addColorStop(1, hexA(pal.fog, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    ctx.restore();

    // grade sutil (dá escala e leitura de profundidade)
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= ARENA.W; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.H); }
    for (let y = 0; y <= ARENA.H; y += 60) { ctx.moveTo(0, y); ctx.lineTo(ARENA.W, y); }
    ctx.stroke();
    ctx.restore();

    // poeira de gelo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const d of this.dust) {
      ctx.globalAlpha = 0.25 + Math.sin(this.t * 2 + d.ph) * 0.16;
      ctx.fillStyle = pal.core;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawGrain(ctx) {
    const tile = this._noiseTile();
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.globalCompositeOperation = 'overlay';
    const p = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = p;
    ctx.translate((this.t * 13) % 128 - 128, (this.t * 9) % 128 - 128);
    ctx.fillRect(0, 0, ARENA.W + 256, ARENA.H + 256);
    ctx.restore();
  }
}

export function drawVignette(ctx, pal) {
  const g = ctx.createRadialGradient(ARENA.W / 2, ARENA.H * 0.44, ARENA.H * 0.22, ARENA.W / 2, ARENA.H * 0.5, ARENA.H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA.W, ARENA.H);
}

// Moldura da arena — as paredes onde a lâmina ricocheteia.
export function drawArena(ctx, pal, t, wallGlow) {
  ctx.save();
  ctx.strokeStyle = hexA(pal.accent, 0.30);
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 12]);
  ctx.lineDashOffset = -t * 26;
  ctx.strokeRect(FIELD.left, FIELD.top, FIELD.right - FIELD.left, FIELD.bottom - FIELD.top);
  ctx.setLineDash([]);

  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hexA(pal.accent2, 0.16 + wallGlow * 0.7);
  ctx.lineWidth = 8 + wallGlow * 14;
  ctx.beginPath();
  ctx.moveTo(FIELD.left, FIELD.bottom); ctx.lineTo(FIELD.left, FIELD.top);
  ctx.lineTo(FIELD.right, FIELD.top); ctx.lineTo(FIELD.right, FIELD.bottom);
  ctx.stroke();
  ctx.restore();
}

// Linha de mira: o caminho REAL que a lâmina vai fazer (ricochete/curva/vórtice).
export function drawAim(ctx, pts, pal, charge) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';

  // feixe forte perto da torre, apagando com a distância
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < pts.length; i++) {
    const k = 1 - i / pts.length;
    ctx.globalAlpha = k * k * 0.85;
    ctx.strokeStyle = i % 8 < 5 ? pal.core : hexA(pal.accent, 0.6);
    ctx.lineWidth = 2 + k * 5;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  // marcador no fim do caminho
  const e = pts[pts.length - 1];
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(e.x, e.y, 9 + Math.sin(charge * 12) * 2, 0, TAU); ctx.stroke();
  ctx.restore();
}

// A TORRE que arremessa — máquina, não gente. Base blindada, anel de mira
// graduado e um trilho que aponta exatamente pra onde a lâmina vai sair.
export function drawLauncher(ctx, pal, t, ang, recoil, ready) {
  const { x, y } = LAUNCHER;
  ctx.save();
  ctx.translate(x, y);

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(0, 62, 96, 18, 0, 0, TAU); ctx.fill();

  // plinto blindado
  const bg = ctx.createLinearGradient(0, -26, 0, 66);
  bg.addColorStop(0, '#46525f'); bg.addColorStop(0.45, '#222c36'); bg.addColorStop(1, '#0b1117');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-88, 60); ctx.lineTo(-58, 2); ctx.lineTo(58, 2); ctx.lineTo(88, 60);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(6,10,14,0.9)'; ctx.lineWidth = 4; ctx.stroke();

  // grelhas laterais
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const k = i * 11;
    ctx.moveTo(-78 + k * 0.5, 50 - k * 0.1); ctx.lineTo(-58 + k * 0.5, 16 - k * 0.1);
    ctx.moveTo(78 - k * 0.5, 50 - k * 0.1); ctx.lineTo(58 - k * 0.5, 16 - k * 0.1);
  }
  ctx.stroke();

  // faixa de energia na base
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hexA(pal.accent, ready ? 0.55 + Math.sin(t * 6) * 0.25 : 0.18);
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-52, 12); ctx.lineTo(52, 12); ctx.stroke();
  ctx.restore();

  // anel de mira graduado
  ctx.save();
  ctx.strokeStyle = hexA(pal.accent, 0.30);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 46, Math.PI, TAU); ctx.stroke();
  ctx.strokeStyle = hexA(pal.accent, 0.5);
  ctx.lineWidth = 2.5;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const r0 = i % 2 ? 42 : 38;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * 47, Math.sin(a) * 47);
    ctx.stroke();
  }
  ctx.restore();

  // pulso de carga quando pode atirar
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = ready ? 0.34 + Math.sin(t * 5.5) * 0.2 : 0.08;
  const cg = ctx.createRadialGradient(0, 0, 4, 0, 0, 74);
  cg.addColorStop(0, hexA(pal.accent, pulse));
  cg.addColorStop(1, hexA(pal.accent, 0));
  ctx.fillStyle = cg;
  ctx.fillRect(-80, -80, 160, 160);
  ctx.restore();

  // trilho que gira com a mira
  ctx.rotate(ang);
  ctx.translate(-recoil * 26, 0);

  ctx.fillStyle = '#131b23';
  ctx.beginPath(); roundRectPath(ctx, -34, -17, 78, 34, 10); ctx.fill();

  const hg = ctx.createLinearGradient(-30, -18, 40, 18);
  hg.addColorStop(0, '#eaf3fa'); hg.addColorStop(0.45, '#93a7b8'); hg.addColorStop(1, '#4d5a67');
  ctx.fillStyle = hg;
  ctx.beginPath(); roundRectPath(ctx, -30, -12, 68, 24, 7); ctx.fill();
  ctx.strokeStyle = hexA(pal.core, 0.85); ctx.lineWidth = 2; ctx.stroke();

  // guias do trilho
  ctx.strokeStyle = 'rgba(10,16,22,0.75)'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-24, -5); ctx.lineTo(34, -5);
  ctx.moveTo(-24, 5); ctx.lineTo(34, 5);
  ctx.stroke();

  // lâmina carregada na ponta (some no coice)
  if (ready) {
    ctx.save();
    ctx.globalAlpha = 1 - recoil;
    ctx.fillStyle = pal.core;
    ctx.shadowColor = pal.accent; ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(52, 0); ctx.lineTo(34, -10); ctx.lineTo(34, 10);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // núcleo do pivô
  ctx.fillStyle = pal.accent;
  ctx.shadowColor = pal.accent; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(-8, 0, 7.5, 0, TAU); ctx.fill();
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Vinheta escura + faixa segura embaixo (onde ficam os controles/HUD).
export function drawFloor(ctx, pal) {
  const g = ctx.createLinearGradient(0, FIELD.bottom - 40, 0, ARENA.H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, hexA(pal.bg0, 0.96));
  ctx.fillStyle = g;
  ctx.fillRect(0, FIELD.bottom - 40, ARENA.W, ARENA.H - FIELD.bottom + 40);
}
