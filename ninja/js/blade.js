// ============================================================================
// GELO NINJA — a lâmina arremessada.
// A MESMA função de movimento roda no tiro real e na linha de mira, então o
// que você vê na mira é exatamente o que a lâmina vai fazer (ricochete,
// curva, vórtice e bumerangue inclusos).
// ============================================================================

import { TUNE, FIELD } from './config.js';
import { hexA } from './geleco.js';

const TAU = Math.PI * 2;

export function makeBlade(x, y, ang, w, opts = {}) {
  return {
    w,
    x, y, px: x, py: y,
    dx: Math.cos(ang), dy: Math.sin(ang),
    speed: w.speed * (opts.speedMul || 1),
    rot: ang, spin: w.spin || 20,
    pierce: w.pierce, bounces: w.bounces || 0,
    armorPierce: !!w.armorPierce, freeze: w.freeze || 0, cross: !!w.cross,
    curve: (w.curve || 0) * (opts.curveDir || 1),
    boomerang: w.boomerang || 0, returning: false,
    traveled: 0, life: 0, dead: false, reason: '',
    trail: [], sparkWall: 0,
  };
}

// Um passo de movimento. Devolve true se a lâmina morreu neste passo.
export function stepMotion(b, dt, world) {
  b.life += dt;
  if (b.life > TUNE.BLADE_LIFE) { b.dead = true; b.reason = 'tempo'; return true; }

  // curva constante (FOICE)
  if (b.curve) {
    const a = Math.atan2(b.dy, b.dx) + b.curve * dt;
    b.dx = Math.cos(a); b.dy = Math.sin(a);
  }

  // vórtices entortam a rota sem mudar a velocidade
  if (world.vortices) {
    for (const vt of world.vortices) {
      const ddx = vt.x - b.x, ddy = vt.y - b.y;
      const d = Math.hypot(ddx, ddy);
      if (d > vt.r * 1.6 || d < 6) continue;
      const pull = (vt.force * 3.2 * dt) * (1 - d / (vt.r * 1.6));
      b.dx += (ddx / d) * pull - (ddy / d) * pull * 0.5 * vt.cw;
      b.dy += (ddy / d) * pull + (ddx / d) * pull * 0.5 * vt.cw;
      const l = Math.hypot(b.dx, b.dy) || 1;
      b.dx /= l; b.dy /= l;
    }
  }

  // bumerangue: passou do alcance, faz a volta mirando na base
  if (b.boomerang) {
    if (!b.returning && b.traveled > b.boomerang) b.returning = true;
    if (b.returning) {
      const want = Math.atan2(world.home.y - b.y, world.home.x - b.x);
      let cur = Math.atan2(b.dy, b.dx);
      let diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
      cur += Math.max(-5.5 * dt, Math.min(5.5 * dt, diff));
      b.dx = Math.cos(cur); b.dy = Math.sin(cur);
      if (Math.hypot(world.home.x - b.x, world.home.y - b.y) < 34) { b.dead = true; b.reason = 'voltou'; return true; }
    }
  }

  b.px = b.x; b.py = b.y;
  const step = b.speed * dt;
  b.x += b.dx * step; b.y += b.dy * step;
  b.traveled += step;
  b.rot += b.spin * dt;

  // paredes
  const r = TUNE.BLADE_R;
  let bounced = false;
  if (b.x < FIELD.left + r) { b.x = FIELD.left + r; b.dx = Math.abs(b.dx); bounced = true; }
  else if (b.x > FIELD.right - r) { b.x = FIELD.right - r; b.dx = -Math.abs(b.dx); bounced = true; }
  if (b.y < FIELD.top + r) { b.y = FIELD.top + r; b.dy = Math.abs(b.dy); bounced = true; }

  if (bounced) {
    if (b.bounces > 0) { b.bounces--; b.sparkWall = 1; }
    else { b.dead = true; b.reason = 'parede'; return true; }
  }
  if (b.y > FIELD.bottom + 60) { b.dead = true; b.reason = 'saiu'; return true; }
  return false;
}

// Caminho previsto para a linha de mira.
export function previewPath(x, y, ang, w, world, maxPts = 90) {
  const b = makeBlade(x, y, ang, w);
  const pts = [{ x, y }];
  const dt = 1 / 90;
  for (let i = 0; i < maxPts; i++) {
    const died = stepMotion(b, dt, world);
    pts.push({ x: b.x, y: b.y });
    if (died) break;
  }
  return pts;
}

// ---------------------------------------------------------------------------
// DESENHO — cada arma tem silhueta própria e rastro aditivo.
// ---------------------------------------------------------------------------
export function drawTrail(ctx, b, pal) {
  const t = b.trail;
  if (t.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    const wMul = pass ? 1 : 2.6;
    const alpha = pass ? 0.95 : 0.20;
    for (let i = 1; i < t.length; i++) {
      const k = i / t.length;
      ctx.strokeStyle = hexA(pass ? pal.core : pal.accent, alpha * k);
      ctx.lineWidth = Math.max(1, TUNE.BLADE_R * 0.95 * k * wMul);
      ctx.beginPath();
      ctx.moveTo(t[i - 1].x, t[i - 1].y);
      ctx.lineTo(t[i].x, t[i].y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawBlade(ctx, b, pal) {
  const r = TUNE.BLADE_R;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot);
  ctx.shadowColor = pal.accent; ctx.shadowBlur = 22;
  const steel = ctx.createLinearGradient(-r, -r, r, r);
  steel.addColorStop(0, '#ffffff'); steel.addColorStop(0.45, '#cfe9ff');
  steel.addColorStop(0.7, '#8fb6d6'); steel.addColorStop(1, '#e9f6ff');
  ctx.fillStyle = steel;
  ctx.strokeStyle = hexA(pal.core, 0.95);
  ctx.lineWidth = 2;

  const s = b.w.shape;
  ctx.beginPath();
  if (s === 'shuriken' || s === 'cross') {
    const pts = s === 'cross' ? 4 : 4;
    for (let i = 0; i < pts * 2; i++) {
      const a = (i / (pts * 2)) * TAU;
      const rr = i % 2 ? r * 0.42 : r * 1.55;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU);
    ctx.fillStyle = pal.accent; ctx.fill();
  } else if (s === 'kunai') {
    ctx.moveTo(r * 1.85, 0); ctx.lineTo(r * 0.2, -r * 0.5);
    ctx.lineTo(-r * 1.35, -r * 0.24); ctx.lineTo(-r * 1.35, r * 0.24);
    ctx.lineTo(r * 0.2, r * 0.5); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (s === 'boomerang') {
    ctx.moveTo(-r * 1.3, r * 1.0); ctx.quadraticCurveTo(0, -r * 1.5, r * 1.3, r * 1.0);
    ctx.quadraticCurveTo(0, -r * 0.25, -r * 1.3, r * 1.0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (s === 'disc' || s === 'saw') {
    ctx.arc(0, 0, r * 1.35, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    const teeth = s === 'saw' ? 10 : 6;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * TAU;
      ctx.moveTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05);
      ctx.lineTo(Math.cos(a) * r * 1.9, Math.sin(a) * r * 1.9);
    }
    ctx.lineWidth = s === 'saw' ? 5 : 3.5;
    ctx.strokeStyle = s === 'saw' ? '#e9f6ff' : hexA(pal.accent2, 0.95);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, TAU);
    ctx.fillStyle = pal.accent; ctx.fill();
  } else if (s === 'scythe') {
    ctx.moveTo(-r * 1.5, r * 0.5);
    ctx.quadraticCurveTo(r * 0.4, -r * 1.9, r * 1.75, -r * 0.1);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.75, -r * 1.5, r * 0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (s === 'shard') {
    ctx.moveTo(r * 1.7, 0); ctx.lineTo(-r * 0.7, -r * 0.72);
    ctx.lineTo(-r * 1.2, 0); ctx.lineTo(-r * 0.7, r * 0.72);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    // lâmina de picolé: palito + lâmina
    ctx.moveTo(r * 1.7, -r * 0.18); ctx.lineTo(r * 1.7, r * 0.18);
    ctx.lineTo(-r * 0.5, r * 0.62); ctx.lineTo(-r * 0.5, -r * 0.62);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = '#c98a4b';
    ctx.fillRect(-r * 1.55, -r * 0.2, r * 1.1, r * 0.4);
  }
  ctx.restore();
}
