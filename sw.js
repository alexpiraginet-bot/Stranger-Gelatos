// Service worker — cacheia o jogo 2D para jogar offline.
const CACHE = 'stranger-gelatos-2d-v14';
const SPRITES = [
  'player_idle', 'player_run1', 'player_run2', 'player_jump', 'player_shoot',
  'demogorgon1', 'demogorgon2', 'demodog1', 'demodog2', 'vecna1', 'vecna2', 'curse',
  'key', 'whey', 'freezer', 'popsicle', 'coin', 'portal1', 'portal2', 'portal3',
  't_grass', 't_dirt', 't_stone', 't_brick', 't_flesh', 't_platform', 't_spike', 't_fleshfloor',
  'shop', 'shop_dark', 'bg_normal', 'bg_avesso',
  'bike', 'pine', 'pine_dark', 'lamp', 'sign', 'school', 'house', 'vines',
  'far_city', 'far_avesso', 'demobat1', 'demobat2', 'flag', 'flag_on', 'house2', 'house3',
  'spitter1', 'spitter2',
  'banner_gelatos', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6', 'alex1', 'alex2', 'rock',
  'bazooka', 'blast',
].map((n) => `./sprites/${n}.png`);

const ASSETS = [
  './', './index.html', './css/style.css', './manifest.json',
  './js/main.js', './js/game.js', './js/levels.js', './js/player.js', './js/enemy.js',
  './js/items.js', './js/boss.js', './js/alex.js', './js/physics.js', './js/camera.js', './js/input.js', './js/audio.js',
  './js/assets.js', './js/config.js', './js/pwa.js', './js/leaderboard.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png',
  ...SPRITES,
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// network-first: sempre tenta a versão nova quando online; cai no cache offline
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
