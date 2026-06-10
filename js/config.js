// Configurações do jogo 2D (plataforma + tiro)
export const CONFIG = {
  TILE: 16,            // tamanho do tile em unidades de mundo (= pixel da arte)
  VIEW_H: 232,         // altura visível do mundo (px) — define o "zoom"

  // Física (unidades de mundo por segundo)
  GRAVITY: 1100,
  MOVE_SPEED: 122,
  RUN_MULT: 1.55,
  JUMP_VEL: 435,
  JUMP2_VEL: 380,       // 2º pulo (duplo) — alcança um pouco mais alto que o simples
  AIR_JUMPS: 1,         // pulos extras no ar
  COYOTE: 0.1,         // tempo de tolerância p/ pular após sair da borda
  JUMP_BUFFER: 0.12,
  MAX_FALL: 720,

  // Game-feel "Nintendo": rampas de aceleração/atrito e gravidade variável
  GROUND_ACCEL: 950,
  GROUND_FRICTION: 1400,
  AIR_ACCEL: 620,
  AIR_FRICTION: 200,
  TURN_BOOST: 1.9,         // vira de direção mais rápido (skid responsivo)
  FALL_GRAVITY_MULT: 1.35, // queda mais pesada que a subida
  APEX_THRESHOLD: 45,      // |vy| abaixo disto = topo do pulo
  APEX_GRAVITY_MULT: 0.55, // "flutua" um instante no apex
  APEX_ACCEL_MULT: 1.15,

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
  // Demobat — morcego voador do Avesso
  DEMOBAT_SPEED: 64,
  DEMOBAT_W: 18, DEMOBAT_H: 10, DEMOBAT_HP: 1,
  // Spitter (Demoflor) — planta do Avesso que cospe maldições
  SPITTER_HP: 2,
  SPITTER_W: 16, SPITTER_H: 22,
  SPITTER_RANGE: 170,
  SPITTER_BOLT: 130,
  SPITTER_FIRE: 2.2,
  SPITTER_WINDUP: 0.45,    // telegrafia: abre antes de cuspir
  DEMODOG_SPEED: 78,
  DEMODOG_W: 28, DEMODOG_H: 18,
  ENEMY_SIGHT: 150,
  STOMP_BOUNCE: 300,

  // Chefe final: VECNA
  VECNA_HP: 16,
  VECNA_W: 30, VECNA_H: 50,
  VECNA_SPEED: 34,
  VECNA_ACTIVATE: 230,     // distância p/ acordar o chefe
  VECNA_FIRE: 1.5,         // intervalo entre maldições
  VECNA_BOLT_SPEED: 165,
  VECNA_CONTACT_DMG: 1,

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
