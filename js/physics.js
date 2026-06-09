import { CONFIG } from './config.js';

const T = CONFIG.TILE;

// Move um corpo resolvendo colisão; usa sub-passos (≤ 1 tile) p/ evitar tunneling.
export function moveBody(level, b, dt) {
  const dist = Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt;
  const steps = Math.max(1, Math.ceil(dist / (T * 0.9)));
  const sdt = dt / steps;
  let onGround = false, hitWall = false;
  for (let i = 0; i < steps; i++) {
    _resolve(level, b, sdt);
    if (b.onGround) onGround = true;
    if (b.hitWall) hitWall = true;
  }
  b.onGround = onGround;
  b.hitWall = hitWall;
}

// Resolução por eixo de um único passo.
function _resolve(level, b, dt) {
  b.onGround = false;
  b.hitWall = false;

  // ---- eixo X ----
  b.x += b.vx * dt;
  let y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 1) / T);
  if (b.vx > 0) {
    const cx = Math.floor((b.x + b.w - 1) / T);
    for (let cy = y0; cy <= y1; cy++) {
      if (level.solidAt(cx, cy)) { b.x = cx * T - b.w; b.vx = 0; b.hitWall = true; break; }
    }
  } else if (b.vx < 0) {
    const cx = Math.floor(b.x / T);
    for (let cy = y0; cy <= y1; cy++) {
      if (level.solidAt(cx, cy)) { b.x = (cx + 1) * T; b.vx = 0; b.hitWall = true; break; }
    }
  }

  // ---- eixo Y ----
  b.y += b.vy * dt;
  let x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 1) / T);
  if (b.vy > 0) {
    const cy = Math.floor((b.y + b.h - 1) / T);
    for (let cx = x0; cx <= x1; cx++) {
      if (level.solidAt(cx, cy)) { b.y = cy * T - b.h; b.vy = 0; b.onGround = true; break; }
    }
  } else if (b.vy < 0) {
    const cy = Math.floor(b.y / T);
    for (let cx = x0; cx <= x1; cx++) {
      if (level.solidAt(cx, cy)) { b.y = (cy + 1) * T; b.vy = 0; break; }
    }
  }

  // sondagem de chão estável (evita jitter ao parar exatamente na borda do tile)
  if (b.vy >= 0) {
    const fy = Math.floor((b.y + b.h) / T);
    const fx0 = Math.floor((b.x + 1) / T), fx1 = Math.floor((b.x + b.w - 2) / T);
    for (let cx = fx0; cx <= fx1; cx++) {
      if (level.solidAt(cx, fy)) { b.y = fy * T - b.h; b.vy = 0; b.onGround = true; break; }
    }
  }
}

// Há tile-perigo (espinho) sob/encostando na hitbox?
export function touchesHazard(level, b) {
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 1) / T);
  const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 1) / T);
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++)
      if (level.hazardAt(cx, cy)) return true;
  return false;
}

// Há chão sólido logo abaixo deste ponto? (p/ inimigos não caírem da borda)
export function groundAhead(level, x, footY) {
  const cx = Math.floor(x / T), cy = Math.floor((footY + 2) / T);
  return level.solidAt(cx, cy);
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
