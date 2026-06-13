// Carrega todos os sprites (PNG pixel-art) e disponibiliza por nome.
const NAMES = [
  'player_idle', 'player_run1', 'player_run2', 'player_run3', 'player_run4', 'player_run5', 'player_run6', 'player_jump', 'player_shoot',
  'player_big_idle', 'player_big_jump', 'player_big_run1', 'player_big_run2', 'player_big_run3', 'player_big_run4', 'player_big_run5', 'player_big_run6',
  'demogorgon1', 'demogorgon2', 'demodog1', 'demodog2', 'vecna1', 'vecna2', 'curse',
  'key', 'whey', 'freezer', 'popsicle', 'coin', 'portal1', 'portal2', 'portal3',
  't_grass', 't_dirt', 't_stone', 't_brick', 't_flesh', 't_platform', 't_spike', 't_fleshfloor',
  'shop', 'shop_dark', 'bg_normal', 'bg_avesso',
  'bike', 'pine', 'pine_dark', 'lamp', 'sign', 'school', 'house', 'vines',
  'far_city', 'far_avesso', 'demobat1', 'demobat2', 'flag', 'flag_on', 'house2', 'house3',
  'spitter1', 'spitter2',
  'banner_gelatos', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6', 'alex1', 'alex2', 'rock',
  'bazooka', 'blast',
  'qbox', 'qbox_used', 'true_protein', 'true_vegan', 'true_collagen', 'true_magnesio',
  'prod_protein', 'prod_vegan', 'prod_collagen', 'prod_magnesio',
  'bg_hawkins', 'bg_pinecrest', 'bg_trees',
  'building', 'arcade', 'zap', 'wbox',
];

// extensões diferentes de .png (fundos otimizados em jpg)
const EXT = { bg_hawkins: 'jpg', bg_pinecrest: 'jpg' };

export const Assets = {
  images: {},
  loaded: 0,
  total: NAMES.length,

  load() {
    return Promise.all(NAMES.map((n) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.loaded++; resolve(); };
      img.onerror = () => { this.loaded++; resolve(); }; // não trava se faltar 1
      img.src = `sprites/${n}.${EXT[n] || 'png'}`;
      this.images[n] = img;
    })));
  },

  img(name) { return this.images[name]; },
};
