import { CONFIG, SOLID, HAZARD } from './config.js';

const ROWS = 16;

// Estrutura de nível (dados puros + consultas de tile). Sem dependência de render.
export class Level {
  constructor({ theme, cols, grid, entities, playerStart, bg }) {
    this.theme = theme;
    this.cols = cols;
    this.rows = ROWS;
    this.grid = grid;          // array de arrays de char
    this.entities = entities;  // [{type, cx, cy}]
    this.playerStart = playerStart; // {cx, cy}
    this.bg = bg;
    this.widthPx = cols * CONFIG.TILE;
    this.heightPx = ROWS * CONFIG.TILE;
  }

  tile(cx, cy) {
    if (cy < 0 || cy >= this.rows || cx < 0 || cx >= this.cols) return ' ';
    return this.grid[cy][cx];
  }
  solidAt(cx, cy) { return SOLID.has(this.tile(cx, cy)); }
  hazardAt(cx, cy) { return HAZARD.has(this.tile(cx, cy)); }
}

// ---------- Construtor utilitário ----------
function blank(cols) {
  return Array.from({ length: ROWS }, () => new Array(cols).fill(' '));
}
function ground(g, x0, x1, top, topChar, fillChar) {
  for (let x = x0; x <= x1; x++) {
    if (x < 0 || x >= g[0].length) continue;
    g[top][x] = topChar;
    for (let y = top + 1; y < ROWS; y++) g[y][x] = fillChar;
  }
}
function plat(g, x0, x1, row, char) {
  for (let x = x0; x <= x1; x++) if (x >= 0 && x < g[0].length) g[row][x] = char;
}

// ============ MUNDO NORMAL (cidade clara) ============
export function buildNormal() {
  const cols = 150;
  const g = blank(cols);
  const TOP = 13;
  // chão com vãos para pular
  ground(g, 0, 27, TOP, 'G', 'D');
  ground(g, 32, 59, TOP, 'G', 'D');
  ground(g, 64, 96, TOP, 'G', 'D');
  ground(g, 100, cols - 1, TOP, 'G', 'D');
  // plataformas flutuantes
  plat(g, 18, 21, 9, 'P');
  plat(g, 40, 44, 10, 'P');
  plat(g, 52, 55, 7, 'P');
  plat(g, 70, 73, 9, 'P');
  plat(g, 84, 88, 8, 'P');
  plat(g, 108, 112, 9, 'P');
  plat(g, 120, 124, 7, 'P');

  const entities = [];
  const coin = (cx, cy) => entities.push({ type: 'coin', cx, cy });
  [19, 20, 41, 42, 43, 53, 54, 71, 72, 85, 86, 87, 109, 110, 121, 122, 123].forEach((x) => coin(x, 6));
  [6, 12, 24, 47, 78, 92, 104, 130].forEach((x) => coin(x, TOP - 1));
  // sorveteria Bentô Gelatos + portal de entrada no fim
  entities.push({ type: 'shop', cx: 140, cy: TOP - 1 });
  entities.push({ type: 'portal', cx: 143, cy: TOP - 1 });

  return new Level({ theme: 'normal', cols, grid: g, entities, playerStart: { cx: 3, cy: TOP - 1 }, bg: 'bg_normal' });
}

// ============ AVESSO (escuro, monstros) ============
export function buildAvesso() {
  const cols = 178;
  const g = blank(cols);
  const TOP = 13;
  ground(g, 0, 21, TOP, 'L', 'F');
  ground(g, 26, 52, TOP, 'L', 'F');
  ground(g, 57, 88, TOP, 'L', 'F');
  ground(g, 93, 128, TOP, 'L', 'F');
  ground(g, 133, cols - 1, TOP, 'L', 'F');
  // poços com espinhos
  ground(g, 22, 25, ROWS - 1, '^', 'F');
  ground(g, 89, 92, ROWS - 1, '^', 'F');
  // espinhos no chão em alguns trechos
  g[TOP][40] = '^'; g[TOP][41] = '^'; g[TOP][110] = '^'; g[TOP][111] = '^';
  // plataformas
  plat(g, 14, 18, 9, 'F');
  plat(g, 30, 34, 10, 'F');
  plat(g, 44, 48, 8, 'F');
  plat(g, 62, 66, 9, 'F');
  plat(g, 74, 78, 7, 'F');
  plat(g, 98, 102, 9, 'F');
  plat(g, 112, 116, 8, 'F');
  plat(g, 138, 142, 9, 'F');
  plat(g, 150, 156, 7, 'F');

  const entities = [];
  const at = (type, cx, cy) => entities.push({ type, cx, cy });
  // 3 chaves espalhadas e escondidas (em plataformas)
  at('key', 16, 8); at('key', 76, 6); at('key', 154, 6);
  // whey (vida) e freezers (munição) espalhados
  at('whey', 33, 9); at('whey', 64, 8); at('whey', 100, 8); at('whey', 120, TOP - 1); at('whey', 160, TOP - 1);
  at('freezer', 10, TOP - 1); at('freezer', 46, 7); at('freezer', 70, TOP - 1);
  at('freezer', 114, 7); at('freezer', 140, 8); at('freezer', 168, TOP - 1);
  // inimigos espalhados
  at('demogorgon', 30, TOP - 1); at('demogorgon', 68, TOP - 1); at('demogorgon', 105, TOP - 1);
  at('demogorgon', 145, TOP - 1); at('demogorgon', 162, TOP - 1);
  at('demodog', 18, TOP - 1); at('demodog', 50, TOP - 1); at('demodog', 84, TOP - 1);
  at('demodog', 100, TOP - 1); at('demodog', 125, TOP - 1); at('demodog', 158, TOP - 1);
  // portal de fuga no fim
  at('portal', 172, TOP - 1);

  return new Level({ theme: 'avesso', cols, grid: g, entities, playerStart: { cx: 3, cy: TOP - 1 }, bg: 'bg_avesso' });
}
