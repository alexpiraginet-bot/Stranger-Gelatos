// Configurações globais do jogo
export const CONFIG = {
  // Canvas
  WIDTH: 800,
  HEIGHT: 600,

  // Mundo (em tiles)
  TILE: 40,
  MAP_COLS: 30,
  MAP_ROWS: 24,

  // Player
  PLAYER_SPEED: 2.6,
  PLAYER_SIZE: 28,
  PLAYER_MAX_HEALTH: 5,
  PLAYER_INVULN_TIME: 60,      // frames de invencibilidade após levar dano
  ATTACK_RANGE: 56,
  ATTACK_DURATION: 14,         // frames que o ataque fica ativo
  ATTACK_COOLDOWN: 28,         // frames entre ataques

  // Lanterna / escuridão
  LIGHT_RADIUS: 150,           // raio da luz com bateria cheia
  LIGHT_RADIUS_MIN: 70,        // raio mínimo (bateria fraca)
  BATTERY_DRAIN: 0.012,        // % por frame
  BATTERY_PER_PICKUP: 35,      // recarga por bateria coletada

  // Inimigos
  ENEMY_SPEED: 1.35,
  ENEMY_SIZE: 32,
  ENEMY_SIGHT: 220,            // distância em que o Demogorgon enxerga o Bento
  ENEMY_DAMAGE: 1,
  ENEMY_HITS_TO_KILL: 2,

  // Objetivos
  TOTAL_KEYS: 3,
};

// Cores temáticas do Mundo Invertido
export const COLORS = {
  floor: '#0d0d14',
  floorAlt: '#11111c',
  wall: '#2a1a2e',
  wallTop: '#3d2440',
  wallVine: '#4a1f3d',
  player: '#5fb0ff',
  playerDark: '#2f7fd0',
  enemy: '#c1272d',
  enemyDark: '#6b0f12',
  key: '#ffd54a',
  battery: '#7CFC00',
  portal: '#b14aff',
  spore: 'rgba(180, 80, 200, 0.35)',
};
