// ============================================================================
// GELO NINJA — as 100 fases e o loop infinito.
// Cada fase é gerada por semente determinística: a fase 37 do ciclo 2 é sempre
// a mesma fase. A curva de dificuldade sobe dentro do ciclo e o ciclo inteiro
// endurece de novo quando o jogo volta pra fase 1 (mais gelecos, mais rápido,
// corte mais exigente) — e repinta tudo com outro sabor.
// ============================================================================

import { ARENA, FIELD, LAUNCHER, LEVELS_PER_CYCLE, BOSS_EVERY, weaponUnlockedAt, zone } from './config.js';
import { makeRng, hashSeed } from './rng.js';
import { SHAPE_IDS } from './geleco.js';

const TAU = Math.PI * 2;
let ZONE = zone();

export function isBoss(level) { return level % BOSS_EVERY === 0; }

// Etiqueta do arranjo, mostrada no letreiro da fase.
const ARRANJOS = [
  { id: 'livre', tag: 'CAMPO ABERTO', from: 1 },
  { id: 'giro', tag: 'GIRO', from: 5 },
  { id: 'orbital', tag: 'ORBITAL', from: 11 },
  { id: 'guarda', tag: 'GUARDA DE AÇO', from: 14 },
  { id: 'coluna', tag: 'PATRULHA', from: 22 },
  { id: 'pendulo', tag: 'PÊNDULO', from: 33 },
  { id: 'corredor', tag: 'CORREDOR', from: 44 },
  { id: 'enxame', tag: 'ENXAME', from: 56 },
];

export function levelPlan(level, cycle) {
  ZONE = zone();          // a arena muda de altura conforme o aparelho
  const rng = makeRng(hashSeed(level, cycle, 0x9e37));
  const t = (level - 1) / (LEVELS_PER_CYCLE - 1);         // 0..1 dentro do ciclo
  const c = Math.max(0, cycle - 1);                        // reforço do loop
  const boss = isBoss(level);

  // --- dificuldade base -----------------------------------------------------
  const extraG = Math.min(4, Math.round(c * 0.8));
  const spinMul = 1 + c * 0.16;
  const killFrac = clamp(0.74 - t * 0.26 - c * 0.03, 0.34, 0.78);
  const sizeBase = lerp(80, 48, t) * (1 - c * 0.02);

  const plan = {
    level, cycle, boss,
    tag: '', gelecos: [], placas: [], bonus: [], proibidos: [], vortices: [],
    blades: 3, killFrac,
    unlock: weaponUnlockedAt(level),
    spinMul,
  };

  if (boss) return bossPlan(plan, rng, t, c, spinMul);

  // arranjo disponível para o nível
  const pool = ARRANJOS.filter((a) => level >= a.from);
  const arr = rng.pick(pool.slice(-Math.min(pool.length, 4)));   // favorece os recentes
  plan.tag = arr.tag;

  let n = clamp(1 + Math.floor(t * 4.6) + extraG + (rng.chance(0.3) ? 1 : 0), 1, 7);
  const sizes = [];
  for (let i = 0; i < n; i++) sizes.push(sizeBase * rng.range(0.86, 1.14));
  const spots = scatter(rng, sizes);

  // Limites úteis do campo (o geleco inteiro tem de caber, com folga).
  const halfW = (FIELD.right - FIELD.left) / 2;
  const meioX = (FIELD.left + FIELD.right) / 2;
  const chao = LAUNCHER.y - 220;              // linha abaixo da qual nada nasce

  // ---- ORBITAL: um anel só, todos na MESMA velocidade angular (giram em
  // formação, então nunca se alcançam). Se não couberem lado a lado no anel,
  // os gelecos encolhem até caber.
  let anel = null;
  if (arr.id === 'orbital') {
    let maxS = Math.max(...sizes);
    const cy = ZONE.y0 + (ZONE.y1 - ZONE.y0) * 0.44;
    const rTeto = Math.max(70, Math.min(
      halfW - maxS - 12,
      cy - (FIELD.top + maxS + 12),
      (chao - maxS) - cy,
    ));
    const precisa = (maxS * 1.16 + 14) / Math.sin(Math.PI / Math.max(2, n));
    if (precisa > rTeto) {
      const k = Math.max(0.4, rTeto / precisa);
      for (let z = 0; z < sizes.length; z++) sizes[z] *= k;
      maxS = Math.max(...sizes);
    }
    const vel = lerp(0.30, 0.95, t) * spinMul * (rng.chance(0.5) ? 1 : -1);
    anel = { cx: meioX, cy, r: Math.min(rTeto, Math.max(maxS * 1.7 + 20, precisa)), vel, giro: lerp(0.4, 1.6, t) * spinMul };
  }

  // ---- PATRULHA: uma faixa horizontal por geleco. As faixas têm de separar
  // os raios; se não separarem, todo mundo encolhe.
  let faixas = null;
  if (arr.id === 'coluna') {
    const passo = (ZONE.y1 - ZONE.y0) / n;
    if (n > 1 && Math.max(...sizes) * 2 + 26 > passo) {
      const k = Math.max(0.4, (passo - 26) / (Math.max(...sizes) * 2));
      for (let z = 0; z < sizes.length; z++) sizes[z] *= k;
    }
    faixas = sizes.map((_, i) => ZONE.y0 + passo * (i + 0.5));
  }

  // ---- PÊNDULO: arcos concêntricos do mesmo pivô. Raios separados pelos
  // tamanhos (nunca colidem) e amplitude reduzida nos arcos externos, para
  // que a ponta do balanço não saia da arena.
  let raios = null, amps = null;
  if (arr.id === 'pendulo') {
    const pivoY = FIELD.top + 20;
    const rTeto = Math.max(140, chao - pivoY);
    const fixo = 120 + 26 * (n - 1);
    let soma = sizes[0] * 2;
    for (let z = 1; z < n; z++) soma += sizes[z - 1] + sizes[z];
    if (fixo + soma > rTeto) {
      const k = Math.max(0.35, (rTeto - fixo) / Math.max(1, soma));
      for (let z = 0; z < sizes.length; z++) sizes[z] *= k;
    }
    raios = []; amps = [];
    let r = sizes[0] + 120;
    for (let z = 0; z < n; z++) {
      if (z > 0) r += sizes[z - 1] + sizes[z] + 26;
      raios.push(r);
      const alcance = Math.max(0.05, Math.min(0.95, (halfW - 10 - sizes[z]) / r));
      amps.push(Math.min(rng.range(0.45, 0.9), Math.asin(alcance)));
    }
  }

  // ---- CORREDOR: fileiras de placas com uma brecha. O corredor é montado
  // ANTES dos alvos e os alvos são colocados DENTRO do cone de tiro que passa
  // por todas as brechas — ou seja, a fase é sempre resolvível na lâmina reta.
  let corredor = null;
  if (arr.id === 'corredor') {
    const rows = clamp(1 + Math.floor(t * 1.9), 1, 2);
    const gap = clamp(lerp(260, 172, t), 155, 270);
    const eixo = rng.range(FIELD.left + gap / 2 + 50, FIELD.right - gap / 2 - 50);
    const linhas = [];
    for (let r = 0; r < rows; r++) {
      const y = rows === 1
        ? (ZONE.y1 + chao) / 2
        : lerp(chao - 30, ZONE.y0 + 260, r / (rows - 1));
      const cxr = clamp(eixo + rng.range(-40, 40), FIELD.left + gap / 2 + 40, FIELD.right - gap / 2 - 40);
      linhas.push({ y, gapL: cxr - gap / 2, gapR: cxr + gap / 2 });
    }
    linhas.sort((a, b) => b.y - a.y);
    // se os gelecos não passam pela brecha, encolhem até passar
    let bons = anguloLivre(linhas, Math.max(...sizes));
    for (let tent = 0; tent < 6 && !bons.length; tent++) {
      for (let z = 0; z < sizes.length; z++) sizes[z] *= 0.82;
      bons = anguloLivre(linhas, Math.max(...sizes));
    }
    const yTopo = linhas[linhas.length - 1].y;
    const pos = bons.length ? pacotePolar(bons, sizes, yTopo) : [];
    // só entram os alvos que cabem dentro do cone de tiro
    if (pos.length && pos.length < n) { n = pos.length; sizes.length = n; }
    corredor = pos.length ? { linhas, pos, yTopo } : null;
    if (!corredor) plan.tag = 'CAMPO ABERTO';
  }

  // folga até o vizinho mais próximo: limita o quanto cada geleco pode andar
  const folgaViz = spots.map((pt, i) => {
    let d = Infinity;
    for (let k = 0; k < spots.length; k++) {
      if (k === i) continue;
      d = Math.min(d, Math.hypot(pt.x - spots[k].x, pt.y - spots[k].y) - sizes[i] - sizes[k]);
    }
    return Math.max(0, d === Infinity ? 400 : d);
  });

  for (let i = 0; i < n; i++) {
    const p = spots[i];
    const size = sizes[i];            // já ajustado pelo layout do arranjo
    const kind = rng.pick(SHAPE_IDS);
    let motion = { type: 'static' };
    const sp = lerp(0.5, 2.5, t) * spinMul * rng.range(0.8, 1.25);

    if (corredor) {
      p.x = corredor.pos[i].x; p.y = corredor.pos[i].y;
      motion = rng.chance(0.55) ? { type: 'spin', speed: sp * 0.7 * (rng.chance(0.5) ? 1 : -1) } : { type: 'static' };
    } else if (arr.id === 'giro') {
      motion = { type: 'spin', speed: sp * (rng.chance(0.5) ? 1 : -1) };
    } else if (arr.id === 'orbital') {
      const a0 = (i / n) * TAU;
      motion = { type: 'orbit', cx: anel.cx, cy: anel.cy, r: anel.r, a: a0, speed: anel.vel, spin: anel.giro };
      p.x = anel.cx + Math.cos(a0) * anel.r;
      p.y = anel.cy + Math.sin(a0) * anel.r;
    } else if (arr.id === 'coluna') {
      p.y = faixas[i];
      p.x = clamp(p.x, FIELD.left + size + 8, FIELD.right - size - 8);
      motion = {
        type: 'path', x0: FIELD.left + size + 8, y0: p.y, x1: FIELD.right - size - 8, y1: p.y,
        speed: lerp(0.7, 1.9, t) * spinMul * rng.range(0.8, 1.2), p: rng.range(0, TAU), spin: sp * 0.5,
      };
    } else if (arr.id === 'pendulo') {
      const r = raios[i];
      p.x = meioX; p.y = FIELD.top + 20 + r;
      motion = {
        type: 'pendulum', cx: meioX, cy: FIELD.top + 20, r,
        a0: Math.PI / 2, amp: amps[i], speed: lerp(1.0, 2.1, t) * spinMul, p: rng.range(0, TAU),
      };
    } else if (arr.id === 'enxame') {
      // a excursão nunca passa da folga até o vizinho; sem folga, o geleco
      // fica parado girando (melhor que dois alvos se atravessando)
      const ex = Math.min(110, folgaViz[i] * 0.34);
      motion = ex < 10 ? { type: 'spin', speed: sp * 0.9 } : {
        type: 'path',
        x0: Math.max(FIELD.left + size + 8, p.x - ex), y0: Math.max(FIELD.top + size + 8, p.y - ex * 0.55),
        x1: Math.min(FIELD.right - size - 8, p.x + ex), y1: Math.min(chao, p.y + ex * 0.55),
        speed: lerp(1.1, 2.4, t) * spinMul, p: rng.range(0, TAU), spin: sp,
      };
    } else if (rng.chance(0.45)) {
      motion = { type: 'spin', speed: sp * 0.8 * (rng.chance(0.5) ? 1 : -1) };
    }

    plan.gelecos.push({ x: p.x, y: p.y, size, kind, motion, killFrac, seed: hashSeed(level, cycle, i + 1) });
  }


  // --- placas de aço --------------------------------------------------------
  if (arr.id === 'guarda') {
    plan.gelecos.forEach((g, i) => {
      const len = clamp(g.size * 1.7, 84, 150);
      // o escudo só existe se o giro dele couber dentro das paredes
      const alcance = Math.min(g.x - FIELD.left, FIELD.right - g.x, g.y - FIELD.top, chao - g.y) - 6;
      const r = Math.min(g.size + 62, alcance - len / 2);
      if (r < g.size + 22) return;
      const cnt = level > 40 ? 2 : 1;
      for (let k = 0; k < cnt; k++) {
        plan.placas.push({
          len, th: 15,
          orbit: { cx: g.x, cy: g.y, r, a: (k / cnt) * Math.PI + i, speed: lerp(1.0, 2.2, t) * spinMul * (i % 2 ? -1 : 1), face: true },
        });
      }
    });
  } else if (corredor) {
    for (const L of corredor.linhas) {
      if (L.gapL - FIELD.left > 46) plan.placas.push({ x: (FIELD.left + L.gapL) / 2, y: L.y, len: L.gapL - FIELD.left, th: 15, rot: 0 });
      if (FIELD.right - L.gapR > 46) plan.placas.push({ x: (FIELD.right + L.gapR) / 2, y: L.y, len: FIELD.right - L.gapR, th: 15, rot: 0 });
    }
  } else if (level > 14 && rng.chance(0.45)) {
    const g = rng.pick(plan.gelecos);
    const alcance = Math.min(g.x - FIELD.left, FIELD.right - g.x, g.y - FIELD.top, chao - g.y) - 6;
    const r = Math.min(g.size + 66, alcance - 66);
    if (r >= g.size + 22) {
      plan.placas.push({
        len: 132, th: 15,
        orbit: { cx: g.x, cy: g.y, r, a: rng.range(0, TAU), speed: lerp(1.1, 2.0, t) * spinMul, face: true },
      });
    }
  }

  // --- cristais proibidos ---------------------------------------------------
  if (level > 20) {
    const nb = clamp(Math.floor((level - 20) / 24) + (rng.chance(0.5) ? 1 : 0) + Math.floor(c / 2), 0, 4);
    for (let i = 0; i < nb; i++) {
      const p = pickFree(rng, plan.gelecos, 90);
      // fica parado (só girando no próprio eixo): dá pra ler a rota antes de soltar
      plan.proibidos.push({ x: p.x, y: p.y, r: rng.range(24, 34), spin: rng.range(-1.6, 1.6), orbit: null });
    }
  }

  // --- vórtices -------------------------------------------------------------
  if (level > 50 || c >= 2) {
    const nv = clamp(Math.floor((level - 50) / 30) + (c >= 2 ? 1 : 0), 0, 2);
    for (let i = 0; i < nv; i++) {
      plan.vortices.push({
        x: rng.range(ZONE.x0, ZONE.x1), y: rng.range(ZONE.y1 + 40, LAUNCHER.y - 150),
        r: rng.range(110, 165), force: rng.range(0.7, 1.35) * (1 + c * 0.12), cw: rng.chance(0.5) ? 1 : -1,
      });
    }
  }

  // --- bônus ----------------------------------------------------------------
  const nc = rng.int(1, 3);
  for (let i = 0; i < nc; i++) {
    const p = pickFree(rng, plan.gelecos, 62);
    plan.bonus.push({ x: p.x, y: p.y, tipo: 'cereja' });
  }
  if (rng.chance(level > 30 ? 0.45 : 0.2)) {
    const p = pickFree(rng, plan.gelecos, 62);
    plan.bonus.push({ x: p.x, y: p.y, tipo: 'recarga' });
  }

  // --- lâminas: generoso no começo, apertado no fim -------------------------
  const folga = Math.round(lerp(3, 1.1, t));
  plan.blades = clamp(plan.gelecos.length + folga + Math.ceil(extraG * 0.5), 3, 12);
  return plan;
}

// ---------------------------------------------------------------------------
// CHEFES — de 10 em 10 fases. Vencer libera a próxima arma do arsenal.
// ---------------------------------------------------------------------------
const BOSS_NAMES = [
  'BOLONÃO', 'CASQUINHA REAL', 'CUBO MESTRE', 'TORRE DE PICOLÉ', 'ESTRELA GELADA',
  'COLOSSO CREMOSO', 'GUARDIÃO DE AÇO', 'NÚCLEO ZERO', 'AVALANCHE', 'MESTRE GELADO',
];

function bossPlan(plan, rng, t, c, spinMul) {
  const idx = Math.floor(plan.level / BOSS_EVERY) - 1;
  plan.tag = `CHEFE · ${BOSS_NAMES[clamp(idx, 0, 9)]}`;
  plan.bossName = BOSS_NAMES[clamp(idx, 0, 9)];

  // O chefe é dimensionado pelo espaço REAL da arena: numa tela curta ele
  // encolhe junto com escudos e filhotes, em vez de vazar pra fora do campo.
  const halfW = (FIELD.right - FIELD.left) / 2;
  const meioX = (FIELD.left + FIELD.right) / 2;
  const teto = FIELD.top + 20;
  const chao = LAUNCHER.y - 210;
  const cy = (teto + chao) / 2;
  const raioUtil = Math.max(110, Math.min(halfW - 30, cy - teto, chao - cy));

  const size = Math.min(lerp(126, 165, t) * (1 + c * 0.05), raioUtil * 0.44);
  const killFrac = clamp(0.20 - t * 0.05 - c * 0.01, 0.08, 0.22);
  const kind = SHAPE_IDS[idx % SHAPE_IDS.length];

  plan.gelecos.push({
    x: meioX, y: cy, size, kind, boss: true, killFrac,
    seed: hashSeed(plan.level, plan.cycle, 99),
    motion: { type: 'spin', speed: lerp(0.55, 1.5, t) * spinMul * (idx % 2 ? -1 : 1) },
  });

  // escudos girando: é preciso achar a brecha entre eles
  const shields = clamp(1 + Math.floor(idx / 2) + Math.floor(c / 2), 1, 5);
  const lenEsc = Math.min(lerp(120, 190, t), size * 1.5);
  const rEsc = Math.min(size + 60, raioUtil - lenEsc / 2 - 6);
  const rEsc2 = Math.min(size + 112, raioUtil - lenEsc / 2 - 6);
  for (let i = 0; i < shields; i++) {
    plan.placas.push({
      len: lenEsc, th: 17,
      orbit: {
        cx: meioX, cy, r: Math.max(size + 26, i % 2 ? rEsc2 : rEsc), a: (i / shields) * TAU,
        speed: (lerp(0.9, 1.9, t) * spinMul) * (i % 2 ? -1 : 1), face: true,
      },
    });
  }

  // filhotes orbitando (chefes mais avançados) — só entram se couberem
  const filhotes = clamp(idx - 2 + Math.floor(c * 0.8), 0, 5);
  const sFilho = Math.min(40, raioUtil * 0.15);
  const rFilhoMax = raioUtil - sFilho - 10;
  const rFilho = Math.max(size + sFilho + 26, Math.min(size + 150, rFilhoMax));
  const cabem = filhotes > 0 && rFilho <= rFilhoMax
    && 2 * rFilho * Math.sin(Math.PI / Math.max(2, filhotes)) > sFilho * 2.2;
  for (let i = 0; cabem && i < filhotes; i++) {
    const a = (i / filhotes) * TAU;
    plan.gelecos.push({
      x: meioX + Math.cos(a) * rFilho, y: cy + Math.sin(a) * rFilho,
      size: sFilho, kind: SHAPE_IDS[(idx + i) % SHAPE_IDS.length],
      killFrac: 0.68, seed: hashSeed(plan.level, plan.cycle, 200 + i),
      motion: { type: 'orbit', cx: meioX, cy, r: rFilho, a, speed: 0.75 * spinMul, spin: 1.4 },
    });
  }

  const baixo = LAUNCHER.y - 250;
  if (plan.level >= 70 || c >= 1) {
    const dx = Math.max(90, Math.min(190, halfW - 150));
    plan.vortices.push({ x: meioX - dx, y: baixo, r: 140, force: 1.0 + c * 0.15, cw: 1 });
    plan.vortices.push({ x: meioX + dx, y: baixo, r: 140, force: 1.0 + c * 0.15, cw: -1 });
  }
  if (plan.level >= 50) {
    plan.proibidos.push({ x: meioX, y: baixo, r: 30, spin: 1.2, orbit: null });
  }

  const dxB = Math.max(80, Math.min(210, halfW - 60));
  plan.bonus.push({ x: meioX - dxB, y: LAUNCHER.y - 145, tipo: 'recarga' });
  plan.bonus.push({ x: meioX + dxB, y: LAUNCHER.y - 145, tipo: 'cereja' });

  plan.blades = clamp(9 + Math.floor(idx * 0.6) + Math.ceil(c * 0.5), 9, 16);
  plan.killFrac = killFrac;
  return plan;
}


// ---------------------------------------------------------------------------
// Ângulos de arremesso que atravessam TODAS as brechas do corredor com folga
// para o tamanho do geleco. Se a lista vier vazia, o corredor é impossível.
function anguloLivre(linhas, size) {
  const bons = [];
  for (let i = 0; i <= 320; i++) {
    const a = -Math.PI + 0.28 + (i / 320) * (Math.PI - 0.56);
    const sa = Math.sin(a);
    if (sa > -0.12) continue;
    let ok = true;
    for (const L of linhas) {
      const tt = (L.y - LAUNCHER.y) / sa;
      if (tt <= 0) { ok = false; break; }
      const x = LAUNCHER.x + tt * Math.cos(a);
      if (x < L.gapL + size + 8 || x > L.gapR - size - 8) { ok = false; break; }
    }
    if (ok) bons.push(a);
  }
  return bons;
}

// Empacota os alvos ACIMA do corredor, em posições que ficam sobre alguma
// linha de tiro válida e sem encostar umas nas outras. Devolve quantos coube.
function pacotePolar(bons, sizes, yTopo) {
  const cand = [];
  const nA = Math.min(bons.length, 40);
  for (let ia = 0; ia < nA; ia++) {
    const a = bons[Math.floor(((ia + 0.5) / nA) * bons.length)];
    const sa = Math.sin(a), ca = Math.cos(a);
    const tA = (yTopo - 70 - LAUNCHER.y) / sa;
    const tB = (FIELD.top + 30 - LAUNCHER.y) / sa;
    for (let id = 0; id <= 24; id++) {
      const d = tA + (tB - tA) * (id / 24);
      cand.push({ x: LAUNCHER.x + ca * d, y: LAUNCHER.y + sa * d });
    }
  }
  const out = [];
  for (let i = 0; i < sizes.length; i++) {
    let best = null, bestD = -1;
    for (const c of cand) {
      if (c.x < FIELD.left + sizes[i] + 8 || c.x > FIELD.right - sizes[i] - 8) continue;
      if (c.y < FIELD.top + sizes[i] + 8 || c.y > yTopo - sizes[i] - 40) continue;
      let d = Infinity;
      for (let k = 0; k < out.length; k++) {
        d = Math.min(d, Math.hypot(c.x - out[k].x, c.y - out[k].y) - sizes[k] - sizes[i]);
      }
      if (d > bestD) { bestD = d; best = c; }
    }
    if (!best || (out.length && bestD < 16)) break;
    out.push(best);
  }
  return out;
}

// Espalha os gelecos respeitando o raio de cada um: nada de alvos encavalados.
function scatter(rng, sizes) {
  const out = [];
  for (let i = 0; i < sizes.length; i++) {
    const r = sizes[i];
    const alvo = r * 2.5 + 40;            // separação desejada entre centros
    let best = null, bestD = -1;
    for (let tryI = 0; tryI < 60; tryI++) {
      const p = {
        x: rng.range(ZONE.x0 + r * 0.2, ZONE.x1 - r * 0.2),
        y: rng.range(ZONE.y0 + r * 0.2, ZONE.y1 - r * 0.2),
      };
      let d = Infinity;
      for (let k = 0; k < out.length; k++) {
        d = Math.min(d, Math.hypot(p.x - out[k].x, p.y - out[k].y) - sizes[k] - r);
      }
      if (!out.length) { best = p; break; }
      if (d > bestD) { bestD = d; best = p; }
      if (d > alvo * 0.45) break;
    }
    out.push(best);
  }
  return out;
}

function pickFree(rng, gelecos, minDist) {
  let best = null, bestD = -1;
  for (let i = 0; i < 26; i++) {
    const p = { x: rng.range(ZONE.x0, ZONE.x1), y: rng.range(ZONE.y0, LAUNCHER.y - 150) };
    let d = Infinity;
    for (const g of gelecos) d = Math.min(d, Math.hypot(p.x - g.x, p.y - g.y) - g.size);
    if (d > bestD) { bestD = d; best = p; }
    if (d > minDist) break;
  }
  return best;
}

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function lerp(a, b, k) { return a + (b - a) * Math.max(0, Math.min(1, k)); }
