// Configurações globais do jogo 3D
export const CONFIG = {
  // Mundo (grade de células; cada célula vira um bloco no espaço 3D)
  CELL: 6,            // tamanho de cada célula em unidades 3D
  GRID: 26,           // grade padrão (fallback)
  GRID_NORMAL: 40,    // mundo inicial maior e mais explorável
  GRID_INVERTED: 32,  // Avesso amplo p/ monstros espalhados
  WALL_HEIGHT: 7,

  // Jogador (primeira pessoa)
  EYE_HEIGHT: 3.0,
  PLAYER_RADIUS: 1.4,
  MOVE_SPEED: 16,           // unidades por segundo
  RUN_MULT: 1.7,
  LOOK_SPEED_MOUSE: 0.0022, // sensibilidade do mouse
  LOOK_SPEED_TOUCH: 0.0045, // sensibilidade do arraste touch
  MAX_HEALTH: 6,
  HURT_COOLDOWN: 1.6,       // segundos de invencibilidade após dano (mais folga)

  // Lanterna (cone mais largo e forte p/ enxergar melhor no Avesso)
  FLASH_DISTANCE: 95,
  FLASH_ANGLE: 0.85,        // radianos (meia-abertura do cone) — bem mais aberto
  FLASH_INTENSITY: 9,
  BATTERY_DRAIN: 1.4,       // % por segundo (dura mais)
  BATTERY_PER_PICKUP: 35,

  // Demogorgon — grande, mais lento, mais resistente
  ENEMY_COUNT: 7,
  ENEMY_SPEED: 6,
  ENEMY_SIGHT: 40,
  ENEMY_DAMAGE: 1,
  ENEMY_RADIUS: 2.0,
  ENEMY_HP: 2,

  // Demo-dog — quadrúpede menor, rápido e frágil (mais variedade)
  DEMODOG_COUNT: 5,
  DEMODOG_SPEED: 9,
  DEMODOG_SIGHT: 50,
  DEMODOG_DAMAGE: 1,
  DEMODOG_RADIUS: 1.5,
  DEMODOG_HP: 1,

  // Objetivos — mais difíceis de achar no mundo maior
  TOTAL_KEYS: 3,
  BATTERY_COUNT: 6,
  WHEY_COUNT: 5,        // potes de whey espalhados pelo mundo
  WHEY_HEAL: 2,         // vida regenerada por pote

  // Munição "Bentolés" (a BENTÔLÉ gun precisa de munição)
  START_AMMO: 16,
  MAX_AMMO: 40,
  FREEZER_COUNT: 6,     // freezers (baús) escondidos no Avesso
  AMMO_PER_FREEZER: 9,
};

// Aparência/iluminação por mundo: 'normal' (natural, claro) e 'inverted' (Avesso)
export const WORLDS = {
  normal: {
    sky: 0x8fb8dc,
    fog: 0xc3d8e8, fogNear: 24, fogFar: 170,
    ambient: 0xcfe2ff, ambientInt: 1.0,
    hemiSky: 0xdcefff, hemiGround: 0x6b5a3a, hemiInt: 0.85,
    floor: 0xffffff, wall: 0xffffff, wallTop: 0xc2b58c,
    floorTex: 'textures/grass.png', wallTex: 'textures/stonebrick.png',
    spores: false, vines: false, ceiling: false, dark: false,
  },
  inverted: {
    sky: 0x0a0410,
    fog: 0x0e0716, fogNear: 12, fogFar: 115,
    ambient: 0x4e2c52, ambientInt: 0.7,
    hemiSky: 0x3a2040, hemiGround: 0x0c0716, hemiInt: 0.55,
    floor: 0xc8b8d0, wall: 0xcec0d6, wallTop: 0x3d2142,
    floorTex: 'textures/cobble.png', wallTex: 'textures/flesh.png',
    spores: true, vines: true, ceiling: true, dark: true,
  },
};

export const COLORS = {
  vine: 0x5a1f3d,
  player: 0x5fb0ff,
  enemyBody: 0x7a0f14,
  enemyHead: 0xc1272d,
  dogBody: 0x5a4338,
  dogHead: 0xa83a2a,
  key: 0xffd54a,
  battery: 0x7CFC00,
  whey: 0xff7ab0,
  freezer: 0x9fe8f0,
  portal: 0xb14aff,
  spore: 0xb050c8,
};
