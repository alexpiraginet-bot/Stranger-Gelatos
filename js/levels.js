import { CONFIG, SOLID, HAZARD } from './config.js';

const ROWS = 16;
const TOP = 13;

// Estrutura de nível (dados puros + consultas de tile).
export class Level {
  constructor(o) {
    this.theme = o.theme;
    this.cols = o.cols;
    this.rows = ROWS;
    this.grid = o.grid;
    this.entities = o.entities;
    this.playerStart = o.playerStart;
    this.bg = o.bg;
    this.stage = o.stage || 0;
    this.name = o.name || '';
    this.needKey = !!o.needKey;
    this.boss = !!o.boss;
    this.alex = !!o.alex;
    this.speedMul = o.speedMul || 1;
    this.widthPx = o.cols * CONFIG.TILE;
    this.heightPx = ROWS * CONFIG.TILE;
  }
  tile(cx, cy) {
    if (cy < 0 || cy >= this.rows || cx < 0 || cx >= this.cols) return ' ';
    return this.grid[cy][cx];
  }
  solidAt(cx, cy) { return SOLID.has(this.tile(cx, cy)); }
  hazardAt(cx, cy) { return HAZARD.has(this.tile(cx, cy)); }
}

// ---------- helpers ----------
function blank(cols) { return Array.from({ length: ROWS }, () => new Array(cols).fill(' ')); }
function ground(g, x0, x1, top, topChar, fillChar) {
  const W = g[0].length;
  for (let x = x0; x <= x1; x++) {
    if (x < 0 || x >= W) continue;
    g[top][x] = topChar;
    for (let y = top + 1; y < ROWS; y++) g[y][x] = fillChar;
  }
}
function plat(g, x0, x1, row, char) {
  const W = g[0].length;
  for (let x = x0; x <= x1; x++) if (x >= 0 && x < W) g[row][x] = char;
}

// ============ CAMPANHA ============
export const CAMPAIGN = [
  { kind: 'city', name: 'CIDADE' },
  { kind: 'avesso', stage: 1, name: 'AVESSO I' },
  { kind: 'avesso', stage: 2, name: 'AVESSO II' },
  { kind: 'avesso', stage: 3, name: 'AVESSO III', boss: true },
  { kind: 'arena', name: 'CONFRONTO: ALEX' },
];

export function buildStage(index) {
  const s = CAMPAIGN[Math.max(0, Math.min(index, CAMPAIGN.length - 1))];
  if (s.kind === 'city') return buildCity();
  if (s.kind === 'arena') return buildArena();
  return buildAvesso(s.stage, !!s.boss, s.name);
}

// ============ CHEFE FINAL — ARENA DO ALEX ============
function buildArena() {
  const cols = 50;
  const g = blank(cols);
  const ent = [];
  const en = (t, cx, cy) => ent.push({ type: t, cx, cy });
  const dec = (sprite, cx, cy) => ent.push({ type: 'decor', sprite, cx, cy });
  ground(g, 0, cols - 1, TOP, 'G', 'D');            // arena plana em Hawkins (entardecer)
  dec('sign', 1, TOP - 1); dec('school', 5, TOP - 1); dec('lamp', 18, TOP - 1);
  dec('pine', 24, TOP - 1); dec('house', 33, TOP - 1); dec('lamp', 44, TOP - 1);
  dec('banner_gelatos', 34, 6);
  // recursos para a batalha
  en('freezer', 6, TOP - 1); en('whey', 11, TOP - 1); en('freezer', 40, TOP - 1); en('whey', 45, TOP - 1);
  en('alex', 30, TOP - 1);                            // O CHEFÃO
  en('bazooka', 42, TOP - 1);                         // BAZUCA escondida atrás do Alex
  en('portal', cols - 3, TOP - 1);                    // saída (abre ao derrotar o Alex)
  return new Level({ theme: 'normal', cols, grid: g, entities: ent, playerStart: { cx: 3, cy: TOP - 1 }, bg: 'bg_normal', stage: 5, name: 'CONFRONTO FINAL', alex: true });
}

// ============ FASE 1 — CIDADE (zona de aprendizado) ============
function buildCity() {
  const cols = 138;
  const g = blank(cols);
  const ent = [];
  const en = (t, cx, cy) => ent.push({ type: t, cx, cy });
  const dec = (sprite, cx, cy) => ent.push({ type: 'decor', sprite, cx, cy });

  // ===== Cenário de Hawkins (decoração, não colide) =====
  dec('sign', 5, TOP - 1);
  dec('lamp', 11, TOP - 1); dec('lamp', 58, TOP - 1); dec('lamp', 104, TOP - 1);
  dec('pine', 14, TOP - 1); dec('pine', 16, TOP - 1);
  dec('school', 24, TOP - 1);                 // Pinecrest High (escola de Hawkins)
  dec('building', 42, TOP - 1);               // Hawkins & Son (imobiliária/seguros)
  dec('pine', 51, TOP - 1);
  dec('house', 55, TOP - 1);                  // Casa do Will (Byers) — vitoriana
  dec('arcade', 69, TOP - 1);                 // Palace Arcade (fliperama)
  dec('pine', 95, TOP - 1); dec('pine', 97, TOP - 1); dec('pine', 113, TOP - 1);
  dec('house2', 100, TOP - 1); dec('house3', 117, TOP - 1); // mais casas de Hawkins
  dec('arcade', 110, TOP - 1);
  dec('bike', 21, TOP - 1); dec('bike', 47, TOP - 1); dec('bike', 90, TOP - 1); // bicicletas jogadas
  en('checkpoint', 72, TOP - 1);

  // 1) chão plano e seguro p/ aprender a andar
  ground(g, 0, 17, TOP, 'G', 'D');
  en('coin', 8, TOP - 3);            // 1ª moeda no ar: ensina o pulo
  en('coin', 12, TOP - 3);

  // 2) primeiro inimigo isolado (dá pra pisar ou atirar)
  ground(g, 18, 30, TOP, 'G', 'D');
  en('demodog', 24, TOP - 1);
  en('coin', 28, TOP - 1);

  // 3) primeiro vão pequeno, telegrafado por moedas
  ground(g, 34, 50, TOP, 'G', 'D');  // vão de 3 tiles (31-33)
  for (let i = 0; i < 3; i++) en('coin', 31 + i, TOP - 3);
  en('freezer', 44, TOP - 1);

  // 4) plataforma com recompensa
  plat(g, 40, 44, 9, 'P');
  en('coin', 41, 8); en('coin', 43, 8);

  // 5) inimigo maior + vão
  ground(g, 54, 72, TOP, 'G', 'D');  // vão 51-53
  for (let i = 0; i < 3; i++) en('coin', 51 + i, TOP - 3);
  en('demogorgon', 62, TOP - 1);
  en('whey', 70, TOP - 1);

  // 6) escada de plataformas
  ground(g, 76, cols - 1, TOP, 'G', 'D'); // vão 73-75
  for (let i = 0; i < 3; i++) en('coin', 73 + i, TOP - 3);
  plat(g, 80, 82, 10, 'P'); plat(g, 85, 87, 8, 'P'); plat(g, 90, 92, 10, 'P');
  en('coin', 86, 7);
  // blocos "?" estilo Mario (acerte de baixo) — mais altos/difíceis
  g[6][24] = 'Q'; g[6][45] = 'Q'; g[4][85] = 'Q';   // o último exige pulo duplo
  en('demodog', 90, TOP - 1);
  en('demodog', 98, TOP - 1);

  // 7) sorveteria Bentô Gelatos: fachada com a marca + portal de entrada
  // árvores e decoração na entrada (no lugar dos funcionários)
  dec('pine', 106, TOP - 1); dec('pine', 109, TOP - 1);
  dec('lamp', 114, TOP - 1); dec('bike', 122, TOP - 1); dec('pine', 136, TOP - 1);
  dec('shop', 126, TOP - 1);                          // fachada BENTÔ Gelatos Saudáveis
  en('portal', 133, TOP - 1);                         // portal pro Avesso

  return new Level({ theme: 'normal', cols, grid: g, entities: ent, playerStart: { cx: 3, cy: TOP - 1 }, bg: 'bg_normal', stage: 0, name: 'CIDADE' });
}

// ============ FASES AVESSO (procedurais, dificuldade crescente) ============
function buildAvesso(stage, boss, name) {
  const cols = 118 + stage * 28;     // 146, 174, 202
  const g = blank(cols);
  const ent = [];
  const en = (t, cx, cy) => ent.push({ type: t, cx, cy });
  const dec = (sprite, cx, cy) => ent.push({ type: 'decor', sprite, cx, cy });
  const keyPlaced = { v: false };
  const spitPlaced = { v: false };

  ground(g, 0, 12, TOP, 'L', 'F');   // chegada segura
  en('freezer', 8, TOP - 1);
  // BAZUCA escondida no alto, logo no início da 2ª fase (use o PULO DUPLO!).
  // Moedas formam o caminho do pulo até a plataforma.
  if (stage === 1) {
    plat(g, 7, 10, 6, 'F');
    en('bazooka', 8, 5);
    en('coin', 4, 9); en('coin', 6, 8); en('coin', 8, 7);
  }
  // ===== Hawkins corrompida (Avesso): vinhas penduradas + floresta morta + bikes abandonadas =====
  dec('pine_dark', 5, TOP - 1); dec('pine_dark', 10, TOP - 1);
  dec('bike', 3, TOP - 1);
  let x = 13;
  const endZone = cols - 18;
  while (x < endZone) x = chunk(g, x, stage, en, keyPlaced, endZone, spitPlaced);
  // garante ao menos uma Demoflor por fase
  if (!spitPlaced.v) en('spitter', Math.min(x + 3, cols - 8), TOP - 1);

  // zona final / arena
  ground(g, x, cols - 1, TOP, 'L', 'F');

  // vinhas penduradas ao longo da fase + Hawkins corrompida ao fundo da arena
  for (let vx = 18; vx < cols - 12; vx += 13) dec('vines', vx, 4);
  dec('school', cols - 17, TOP - 1);
  dec('bike', cols - 7, TOP - 1);

  // morcegos voadores (mais nas fases avançadas)
  const bats = stage + 1;
  for (let i = 0; i < bats; i++) en('demobat', 22 + Math.floor((cols - 44) * (i + 1) / (bats + 1)), 7);
  // checkpoints (respawn ao morrer)
  en('checkpoint', Math.floor(cols * 0.5), TOP - 1);
  if (boss) en('checkpoint', cols - 22, TOP - 1);

  // garante a chave da fase
  if (!keyPlaced.v) { en('key', Math.floor(cols * 0.55), TOP - 1); keyPlaced.v = true; }
  // socorro perto do fim
  en('whey', cols - 12, TOP - 1);
  if (stage >= 2) en('freezer', cols - 16, TOP - 1);

  if (boss) { en('vecna', cols - 13, TOP - 1); en('portal', cols - 4, TOP - 1); }
  else en('portal', cols - 4, TOP - 1);

  const speedMul = 1 + (stage - 1) * 0.14;
  return new Level({ theme: 'avesso', cols, grid: g, entities: ent, playerStart: { cx: 3, cy: TOP - 1 }, bg: 'bg_avesso', stage, name, needKey: true, boss, speedMul });
}

// um "bloco" jogável; garante solubilidade (vãos <= 4 tiles, plataformas alcançáveis)
function chunk(g, x, stage, en, keyPlaced, endZone, spitPlaced) {
  const r = Math.random();
  const gw = Math.min(4, 2 + ((Math.random() * stage) | 0)); // largura do vão 2..4

  if (r < 0.30) {                    // chão com inimigo(s)
    const w = 12;
    ground(g, x, x + w - 1, TOP, 'L', 'F');
    if (Math.random() < 0.5) g[Math.random() < 0.3 ? 4 : 6][x + 6] = 'Q';   // bloco "?" alto (alguns exigem pulo duplo)
    const n = 1 + (stage >= 2 && Math.random() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) en(Math.random() < 0.5 ? 'demodog' : 'demogorgon', x + 4 + k * 4, TOP - 1);
    return x + w;
  } else if (r < 0.58) {             // vão (pulo) — moedas telegrafam o arco
    const pre = 4, post = 5, w = pre + gw + post;
    ground(g, x, x + pre - 1, TOP, 'L', 'F');
    if (stage >= 2 && Math.random() < 0.6) for (let i = 0; i < gw; i++) g[ROWS - 1][x + pre + i] = '^';
    ground(g, x + pre + gw, x + w - 1, TOP, 'L', 'F');
    for (let i = 0; i < gw; i++) en('coin', x + pre + i, TOP - 3);
    if (stage >= 3 && Math.random() < 0.5) en('demodog', x + pre + gw + 2, TOP - 1);
    return x + w;
  } else if (r < 0.80) {             // plataforma com item/chave
    const w = 14;
    ground(g, x, x + w - 1, TOP, 'L', 'F');
    const py = stage >= 2 ? 8 : 9;
    plat(g, x + 5, x + 9, py, 'F');
    if (!keyPlaced.v && Math.random() < 0.55) { en('key', x + 7, py - 1); keyPlaced.v = true; }
    else { en('coin', x + 6, py - 1); en('whey', x + 7, py - 1); en('coin', x + 8, py - 1); }
    if (spitPlaced && (!spitPlaced.v || Math.random() < 0.3)) { en('spitter', x + 12, TOP - 1); spitPlaced.v = true; }
    else if (stage >= 2 && Math.random() < 0.5) en('demodog', x + 12, TOP - 1);
    return x + w;
  } else {                           // escada de plataformas
    const w = 14;
    ground(g, x, x + w - 1, TOP, 'L', 'F');
    plat(g, x + 3, x + 4, 10, 'F'); plat(g, x + 6, x + 7, 8, 'F'); plat(g, x + 9, x + 10, 10, 'F');
    en('coin', x + 6, 7); en('coin', x + 7, 7);
    if (stage >= 3) en('demogorgon', x + 12, TOP - 1);
    return x + w;
  }
}
