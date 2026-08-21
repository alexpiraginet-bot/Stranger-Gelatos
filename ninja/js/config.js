// ============================================================================
// GELO NINJA — configuração central (tuning, paletas, armas, plano de fases)
// Sub-app independente do jogo de plataforma (escopo /ninja/).
// ============================================================================

// Arena virtual. A LARGURA é fixa (720) e a ALTURA acompanha o formato da
// tela, então o jogo preenche o aparelho inteiro em vez de deixar tarjas
// pretas — de um iPhone estreito a um tablet quadrado.
export const ARENA = { W: 720, H: 1280 };

// Onde fica o lançador (a torre), em unidades de arena.
export const LAUNCHER = { x: ARENA.W / 2, y: ARENA.H - 150 };

// Paredes do campo de corte (a lâmina ricocheteia nelas).
export const FIELD = { left: 26, right: ARENA.W - 26, top: 96, bottom: ARENA.H - 40 };

// Recalcula a arena para o formato atual da janela.
export function setViewport(vw, vh) {
  const aspect = vh / Math.max(1, vw);
  ARENA.H = Math.round(Math.max(940, Math.min(1900, ARENA.W * aspect)));
  LAUNCHER.x = ARENA.W / 2;
  LAUNCHER.y = ARENA.H - 150;
  FIELD.bottom = ARENA.H - 40;
  return ARENA;
}

// Faixa onde os gelecos podem nascer (sempre com folga acima da torre).
export function zone() {
  return {
    x0: FIELD.left + 76, x1: FIELD.right - 76,
    y0: FIELD.top + 90, y1: Math.max(FIELD.top + 220, LAUNCHER.y - 250),
  };
}

export const TUNE = {
  // --- corte ---
  MIN_AREA: 900,          // pedaço menor que isto derrete na hora
  SPLIT_IMPULSE: 190,     // empurrão perpendicular ao corte
  SPLIT_SPIN: 3.2,        // giro extra dado a cada metade
  PIECE_GRAVITY: 1350,
  PIECE_MELT: 0.85,       // segundos para derreter depois de solto
  PERFECT_DIST: 26,       // corte a esta distância do centro = CORTE PERFEITO

  // --- lâmina ---
  BLADE_R: 13,
  BLADE_LIFE: 2.6,
  TRAIL: 16,

  // --- game feel ---
  HITSTOP: 0.055,         // congelamento no impacto
  HITSTOP_KILL: 0.11,
  SHAKE_CUT: 0.30,
  SHAKE_KILL: 0.55,
  SLOWMO_TIME: 0.55,      // slow-mo do golpe final da fase
  SLOWMO_SCALE: 0.28,

  // --- ritmo ---
  CLEAR_DELAY: 1.15,      // pausa comemorando antes da próxima fase
  FAIL_DELAY: 0.9,
};

// Quantas fases tem um ciclo. Ao terminar, o jogo volta à fase 1 no ciclo+1.
export const LEVELS_PER_CYCLE = 100;
export const BOSS_EVERY = 10;

// ---------------------------------------------------------------------------
// SABORES — cada ciclo do loop infinito repinta o jogo inteiro com um sabor da
// gelateria. Depois do último, recomeça a lista com mais intensidade.
// ---------------------------------------------------------------------------
export const FLAVORS = [
  {
    id: 'pistache', name: 'PISTACHE',
    bg0: '#07130f', bg1: '#0d2a20', fog: '#1d6b4a',
    body0: '#d9f2a8', body1: '#7dbb63', edge: '#eafcc9',
    core: '#fdfbe6', accent: '#a6ff4d', accent2: '#39e6a0',
  },
  {
    id: 'franui', name: 'FRANUI',
    bg0: '#12060f', bg1: '#2c0d2a', fog: '#7a1f63',
    body0: '#ffd7ef', body1: '#c2469a', edge: '#ffeaf7',
    core: '#fff2fb', accent: '#ff5fc8', accent2: '#a06bff',
  },
  {
    id: 'dubai', name: 'DUBAI',
    bg0: '#130d04', bg1: '#33230c', fog: '#8a6416',
    body0: '#ffe9a8', body1: '#b9812a', edge: '#fff6d6',
    core: '#fff8e2', accent: '#ffc23d', accent2: '#7ee08a',
  },
  {
    id: 'prestigio', name: 'PRESTÍGIO',
    bg0: '#0d0805', bg1: '#2a1a12', fog: '#6b4530',
    body0: '#fff6ea', body1: '#a2705a', edge: '#fffdf8',
    core: '#fffdf6', accent: '#ffb27a', accent2: '#8fd0ff',
  },
  {
    id: 'copa', name: 'COPA',
    bg0: '#04120f', bg1: '#0b2f36', fog: '#127a5c',
    body0: '#d7fff0', body1: '#1d8f4e', edge: '#eafff7',
    core: '#f4fffb', accent: '#2ee6a0', accent2: '#59d0ff',
  },
  {
    id: 'vazio', name: 'VAZIO',
    bg0: '#08060f', bg1: '#1a1030', fog: '#4b2b8a',
    body0: '#dcd6ff', body1: '#6a4bd6', edge: '#f0ecff',
    core: '#ffffff', accent: '#b18bff', accent2: '#33e9ff',
  },
];

export function flavorFor(cycle) {
  return FLAVORS[(cycle - 1) % FLAVORS.length];
}

// ---------------------------------------------------------------------------
// ARSENAL — 9 armas. Começa com 1; cada chefe (a cada 10 fases) libera a próxima.
// ---------------------------------------------------------------------------
export const WEAPONS = [
  {
    id: 'picole', name: 'LÂMINA DE PICOLÉ', icon: '🍦', unlock: 1, shape: 'blade',
    speed: 1750, pierce: 1, bounces: 0, spin: 22,
    desc: 'A clássica do Bentô. Um corte limpo e certeiro por arremesso.',
  },
  {
    id: 'shuriken', name: 'SHURIKEN GELADO', icon: '❄️', unlock: 10, shape: 'shuriken',
    speed: 1880, pierce: 2, bounces: 2, spin: 40,
    desc: 'Ricocheteia 2× nas paredes e corta até 2 alvos. Ângulos impossíveis.',
  },
  {
    id: 'kunai', name: 'KUNAI DE CRISTAL', icon: '🔷', unlock: 20, shape: 'kunai',
    speed: 2250, pierce: 2, bounces: 0, spin: 8, armorPierce: true,
    desc: 'Atravessa placas de aço como se fossem calda. Ignora armadura.',
  },
  {
    id: 'bumerangue', name: 'BUMERANGUE BENTÔ', icon: '🪃', unlock: 30, shape: 'boomerang',
    speed: 1520, pierce: 3, bounces: 0, spin: 34, boomerang: 620,
    desc: 'Vai, volta e corta de novo na volta. Dois cortes por arremesso.',
  },
  {
    id: 'disco', name: 'DISCO ZERO', icon: '🧊', unlock: 40, shape: 'disc',
    speed: 1620, pierce: 2, bounces: 1, spin: 30, freeze: 1.6,
    desc: 'Congela por 1,6 s tudo que encosta. Para o alvo pra você mirar.',
  },
  {
    id: 'trio', name: 'ESTILHAÇO TRIO', icon: '🔱', unlock: 50, shape: 'shard',
    speed: 1900, pierce: 1, bounces: 0, spin: 26, multi: 3, spread: 0.16,
    desc: 'Três lâminas em leque num único arremesso. Cobre a arena inteira.',
  },
  {
    id: 'serra', name: 'SERRA CÓSMICA', icon: '⚙️', unlock: 60, shape: 'saw',
    speed: 1380, pierce: 99, bounces: 1, spin: 52, armorPierce: true,
    desc: 'Corte contínuo: atravessa tudo que existe até sair da arena.',
  },
  {
    id: 'foice', name: 'FOICE CURVA', icon: '🌙', unlock: 70, shape: 'scythe',
    speed: 1560, pierce: 3, bounces: 0, spin: 30, curve: 2.0,
    desc: 'Trajetória curva. Corta o que está escondido atrás da armadura.',
  },
  {
    id: 'cruz', name: 'CRUZ DO VAZIO', icon: '✖️', unlock: 80, shape: 'cross',
    speed: 1820, pierce: 2, bounces: 0, spin: 18, cross: true,
    desc: 'Corte em X: duas linhas perpendiculares de uma vez. Vale 2 cortes.',
  },
];

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

// Arma liberada ao vencer a fase N (chefes de 10 em 10).
// A primeira arma já vem equipada, então nunca conta como "liberada".
export function weaponUnlockedAt(level) {
  if (level <= 1) return null;
  return WEAPONS.find((w) => w.unlock === level) || null;
}

// Todas as armas disponíveis dado o progresso máximo já alcançado.
export function unlockedWeapons(maxLevelBeaten, cycle) {
  if (cycle > 1) return WEAPONS.slice();           // ciclo 2+ = arsenal completo
  return WEAPONS.filter((w) => w.unlock === 1 || maxLevelBeaten >= w.unlock);
}

// ---------------------------------------------------------------------------
// PONTUAÇÃO
// ---------------------------------------------------------------------------
export const SCORE = {
  CUT: 60,
  PERFECT: 140,
  KILL: 220,
  BOSS: 1500,
  CHERRY: 90,
  BLADE_LEFT: 120,
  COMBO_STEP: 0.25,      // +25% por alvo extra no mesmo arremesso
  STREAK_STEP: 0.10,     // +10% por fase seguida sem falhar (máx 2×)
  STREAK_MAX: 2.0,
};
