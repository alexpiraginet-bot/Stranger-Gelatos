// Configurações globais do jogo 3D
export const CONFIG = {
  // Mundo (grade de células; cada célula vira um bloco no espaço 3D)
  CELL: 6,            // tamanho de cada célula em unidades 3D
  GRID: 26,           // grade GRID x GRID
  WALL_HEIGHT: 7,

  // Jogador (primeira pessoa)
  EYE_HEIGHT: 3.0,
  PLAYER_RADIUS: 1.4,
  MOVE_SPEED: 16,           // unidades por segundo
  RUN_MULT: 1.7,
  LOOK_SPEED_MOUSE: 0.0022, // sensibilidade do mouse
  LOOK_SPEED_TOUCH: 0.0045, // sensibilidade do arraste touch
  MAX_HEALTH: 5,
  HURT_COOLDOWN: 1.0,       // segundos de invencibilidade após dano

  // Lanterna
  FLASH_DISTANCE: 70,
  FLASH_ANGLE: 0.5,         // radianos (meia-abertura do cone)
  BATTERY_DRAIN: 2.2,       // % por segundo
  BATTERY_PER_PICKUP: 35,

  // Inimigos (Demogorgon)
  ENEMY_COUNT: 7,
  ENEMY_SPEED: 8.5,
  ENEMY_SIGHT: 60,
  ENEMY_DAMAGE: 1,
  ENEMY_RADIUS: 2.0,

  // Objetivos
  TOTAL_KEYS: 3,
  BATTERY_COUNT: 6,
  WHEY_COUNT: 4,        // potes de whey espalhados pelo mundo
  WHEY_HEAL: 2,         // vida regenerada por pote

  // Atmosfera
  FOG_COLOR: 0x0a0410,
  FOG_NEAR: 8,
  FOG_FAR: 80,
};

export const COLORS = {
  floor: 0x1a1020,
  floorAlt: 0x140c1a,
  wall: 0x2c1830,
  wallTop: 0x3d2142,
  vine: 0x5a1f3d,
  player: 0x5fb0ff,
  enemyBody: 0x7a0f14,
  enemyHead: 0xc1272d,
  key: 0xffd54a,
  battery: 0x7CFC00,
  whey: 0xff7ab0,
  portal: 0xb14aff,
  spore: 0xb050c8,
  sky: 0x0a0410,
};
