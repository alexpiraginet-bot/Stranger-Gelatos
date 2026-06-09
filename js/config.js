// Configurações do jogo 2D (plataforma + tiro)
export const CONFIG = {
  TILE: 16,            // tamanho do tile em unidades de mundo (= pixel da arte)
  VIEW_H: 232,         // altura visível do mundo (px) — define o "zoom"

  // Física (unidades de mundo por segundo)
  GRAVITY: 1100,
  MOVE_SPEED: 118,
  RUN_MULT: 1.6,
  JUMP_VEL: 410,
  COYOTE: 0.1,         // tempo de tolerância p/ pular após sair da borda
  JUMP_BUFFER: 0.12,
  MAX_FALL: 720,

  // Jogador
  MAX_HEALTH: 6,
  HURT_COOLDOWN: 1.2,
  PLAYER_W: 12,        // hitbox (menor que o sprite)
  PLAYER_H: 26,

  // Arma BENTÔLÉ
  START_AMMO: 16,
  MAX_AMMO: 40,
  FIRE_RATE: 0.28,
  PROJ_SPEED: 320,
  PROJ_LIFE: 1.3,

  // Inimigos
  DEMOGORGON_HP: 2,
  DEMOGORGON_SPEED: 42,
  DEMOGORGON_W: 22, DEMOGORGON_H: 34,
  DEMODOG_HP: 1,
  DEMODOG_SPEED: 78,
  DEMODOG_W: 28, DEMODOG_H: 18,
  ENEMY_SIGHT: 150,
  STOMP_BOUNCE: 300,

  // Itens / objetivos
  TOTAL_KEYS: 3,
  WHEY_HEAL: 2,
  AMMO_PER_FREEZER: 9,
};

// Mapeamento de tiles sólidos por caractere
export const SOLID = new Set(['G', 'D', 'B', 'S', 'P', 'F', 'L', '#']);
export const HAZARD = new Set(['^']);

// Qual sprite cada tile usa
export const TILE_SPRITE = {
  G: 't_grass', D: 't_dirt', B: 't_brick', S: 't_stone',
  P: 't_platform', F: 't_flesh', L: 't_fleshfloor', '#': 't_stone', '^': 't_spike',
};
