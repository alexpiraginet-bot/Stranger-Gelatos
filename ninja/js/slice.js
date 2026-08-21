// ============================================================================
// GELO NINJA — geometria de corte.
// Um GELECO é um polígono CONVEXO. Cortar = recortar por uma reta (meio-plano),
// o que preserva convexidade e sempre gera exatamente 2 peças.
// Cada vértice guarda `cut`: true quando a ARESTA que começa nele nasceu de um
// corte (é reta e afiada) e false quando é silhueta original (é arredondada).
// ============================================================================

export function v(x, y, cut = false) { return { x, y, cut }; }

export function polyArea(poly) {
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

export function polyCentroid(poly) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n];
    const f = p.x * q.y - q.x * p.y;
    a += f; cx += (p.x + q.x) * f; cy += (p.y + q.y) * f;
  }
  if (Math.abs(a) < 1e-6) {
    // degenerado: cai na média simples dos vértices
    let mx = 0, my = 0;
    for (const p of poly) { mx += p.x; my += p.y; }
    return { x: mx / poly.length, y: my / poly.length };
  }
  a *= 0.5;
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export function polyBBox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of poly) {
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}

export function polyRadius(poly, c) {
  let r = 0;
  for (const p of poly) r = Math.max(r, Math.hypot(p.x - c.x, p.y - c.y));
  return r;
}

// Envoltória convexa (monotone chain) — garante que todo geleco nasce convexo.
export function convexHull(pts) {
  const p = pts.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y));
  if (p.length < 3) return p.map((q) => v(q.x, q.y));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper).map((q) => v(q.x, q.y));
}

export function pointInPoly(px, py, poly) {
  // convexo: o ponto tem de estar do mesmo lado de todas as arestas
  let pos = 0, neg = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const d = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (d > 0) pos++; else if (d < 0) neg++;
    if (pos && neg) return false;
  }
  return true;
}

// Recorta o polígono pelo meio-plano f(p) >= 0, onde f é a distância com sinal
// à reta (px,py)+t*(dx,dy). `flip` inverte o lado mantido.
function clipHalf(poly, px, py, dx, dy, flip) {
  const s = flip ? -1 : 1;
  const f = (p) => s * (dx * (p.y - py) - dy * (p.x - px));
  const out = [];
  for (let i = 0, n = poly.length; i < n; i++) {
    const A = poly[i], B = poly[(i + 1) % n];
    const da = f(A), db = f(B);
    const ain = da >= 0, bin = db >= 0;
    if (ain) out.push(v(A.x, A.y, A.cut));
    if (ain !== bin) {
      const t = da / (da - db);
      // saindo -> o vértice novo inicia a aresta de CORTE (reta e afiada)
      // entrando -> ainda é a aresta original A->B, herda o flag de A
      out.push(v(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, ain ? true : A.cut));
    }
  }
  return out;
}

// Corta o polígono pela reta que passa em (px,py) na direção (dx,dy).
// Devolve [ladoEsquerdo, ladoDireito] ou null se a reta não o atravessa.
export function splitPolygon(poly, px, py, dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  let hasPos = false, hasNeg = false;
  for (const p of poly) {
    const d = dx * (p.y - py) - dy * (p.x - px);
    if (d > 0.001) hasPos = true; else if (d < -0.001) hasNeg = true;
  }
  if (!hasPos || !hasNeg) return null;               // passa raspando: não corta
  const a = clipHalf(poly, px, py, dx, dy, false);
  const b = clipHalf(poly, px, py, dx, dy, true);
  if (a.length < 3 || b.length < 3) return null;
  return [a, b];
}

// Primeiro ponto onde o segmento A->B entra no polígono (ou A, se já está dentro).
export function segmentHit(ax, ay, bx, by, poly) {
  if (pointInPoly(ax, ay, poly)) return { x: ax, y: ay, t: 0 };
  const rx = bx - ax, ry = by - ay;
  let best = null;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n];
    const sx = q.x - p.x, sy = q.y - p.y;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((p.x - ax) * sy - (p.y - ay) * sx) / den;
    const u = ((p.x - ax) * ry - (p.y - ay) * rx) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && (!best || t < best.t)) {
      best = { x: ax + rx * t, y: ay + ry * t, t };
    }
  }
  return best;
}

// Distância de um ponto ao segmento (usada para colisões grossas: cereja, placa).
export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// ---------------------------------------------------------------------------
// Desenho: silhueta arredondada nas arestas originais, RETA E AFIADA nos cortes.
// É esse contraste que faz o corte parecer corte de verdade.
// ---------------------------------------------------------------------------
export function tracePoly(ctx, poly, radius) {
  const n = poly.length;
  if (n < 3) return;
  const last = poly[n - 1], first = poly[0];
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n];
    const cur = poly[i];
    const next = poly[(i + 1) % n];
    const soft = !prev.cut && !cur.cut;
    let r = 0;
    if (soft && radius > 0) {
      const l1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      const l2 = Math.hypot(next.x - cur.x, next.y - cur.y);
      r = Math.min(radius, l1 * 0.48, l2 * 0.48);
    }
    if (r > 0.6) ctx.arcTo(cur.x, cur.y, next.x, next.y, r);
    else ctx.lineTo(cur.x, cur.y);
  }
  ctx.closePath();
}

// Desenha SÓ as arestas de corte (a "carne" do gelato exposta).
export function strokeCutEdges(ctx, poly, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  for (let i = 0, n = poly.length; i < n; i++) {
    if (!poly[i].cut) continue;
    const a = poly[i], b = poly[(i + 1) % n];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();
}
