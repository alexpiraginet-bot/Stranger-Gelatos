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
  BAZOOKA_DMG: 6,        // bazuca de gelato (era 3) — agora bem mais forte
  ZAP_DMG: 1,            // raio teleguiado — fraco (mata só o morcego com 1 tiro)
  ZAP_SPEED: 250,        // mais lento que o picolé p/ ter tempo de curvar
  ZAP_TURN: 8,           // rad/s — quão rápido o raio curva atrás do alvo
  ZAP_RANGE: 340,        // alcance de busca de alvo (mira até bem longe)
  FLAYER_FREEZE: 2.0,    // segundos que o estilhaço da Mente-Colmeia paralisa

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

  // Chefe FINAL (fase 10): ALEX (estilo Hulk) — grande, rápido e arremessa pedras de longe
  ALEX_W: 36, ALEX_H: 60,
  ALEX_DRAW_SCALE: 1.18,  // "porte" maior
  ALEX_SPEED: 58,
  ALEX_ACTIVATE: 360,
  ALEX_SLAM_CD: 2.4,      // intervalo entre pisões (tremor)
  ALEX_ROCK_CD: 1.7,      // arremessa pedra de longe com frequência
  ALEX_JUMP: 480,
  ALEX_SHOCK_SPEED: 175,  // velocidade da onda de choque (tremor)
  ALEX_SHOCK_H: 24,
  ALEX_CONTACT_DMG: 1,

  // Chefe FINAL (fase 10): MENTE-COLMEIA (Mind Flayer gelado) — colmeia colossal
  FLAYER_W: 46, FLAYER_H: 78,
  FLAYER_DRAW_SCALE: 1.0,
  FLAYER_SPEED: 30,
  FLAYER_ACTIVATE: 400,
  FLAYER_SLAM_CD: 2.6,      // golpe de tentáculo (tremor) de perto
  FLAYER_CAST_CD: 2.2,      // cuspe de estilhaços gelados de longe
  FLAYER_SUMMON_CD: 6.5,    // invoca morcegos do enxame (com pouca vida)
  FLAYER_SHARD_SPEED: 155,
  FLAYER_CONTACT_DMG: 1,

  // Itens / objetivos
  TOTAL_KEYS: 3,
  WHEY_HEAL: 2,
  AMMO_PER_FREEZER: 9,
  SUPER_JUMP_MULT: 1.22,   // Super (seringa): pula bem mais alto
  SUPER_BLINK: 70,         // teletransporte (blink) no pulo duplo do Super
};

// Modos de dificuldade (escolhidos na tela inicial)
export const DIFFICULTIES = {
  easy: {
    key: 'easy', label: 'FÁCIL',
    health: 8, ammo: 22, heal: 3, hurtCd: 1.5,
    enemySpeed: 0.8, enemySight: 0.85, boltSpeed: 0.85,
    vecnaHp: 26, vecnaFire: 1.9, scoreMul: 1.0,
  },
  medium: {
    key: 'medium', label: 'MÉDIO',
    health: 6, ammo: 16, heal: 2, hurtCd: 1.2,
    enemySpeed: 1.0, enemySight: 1.0, boltSpeed: 1.0,
    vecnaHp: 40, vecnaFire: 1.5, scoreMul: 1.5,
  },
  hard: {
    key: 'hard', label: 'DIFÍCIL',
    health: 4, ammo: 12, heal: 1, hurtCd: 0.9,
    enemySpeed: 1.22, enemySight: 1.25, boltSpeed: 1.15,
    vecnaHp: 56, vecnaFire: 1.1, scoreMul: 2.0,
  },
};

// Mapeamento de tiles sólidos por caractere
export const SOLID = new Set(['G', 'D', 'B', 'S', 'P', 'F', 'L', '#', 'Q', 'q', 'W']);
export const HAZARD = new Set(['^']);

// Qual sprite cada tile usa
export const TILE_SPRITE = {
  G: 't_grass', D: 't_dirt', B: 't_brick', S: 't_stone',
  P: 't_platform', F: 't_flesh', L: 't_fleshfloor', '#': 't_stone', '^': 't_spike',
  Q: 'qbox', q: 'qbox_used', W: 'wbox',
};

// ---- ARMAS / INVENTÁRIO (extensível: basta adicionar aqui + dar via blocos) ----
export const WEAPONS = {
  bento:   { id: 'bento',   name: 'BENTÔLÉ', icon: '🍦', dmg: 1,            fireMult: 1.0,  kind: 'normal',  spr: 'popsicle' },
  bazooka: { id: 'bazooka', name: 'BAZUCA',  icon: '🚀', dmg: 6,            fireMult: 1.2,  kind: 'bazooka', spr: 'blast' },
  zap:     { id: 'zap',     name: 'RAIO',    icon: '⚡', dmg: 1,            fireMult: 1.35, kind: 'homing',  spr: 'zap' },
};
export const WEAPON_ORDER = ['bento', 'bazooka', 'zap'];
