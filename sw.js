// Service worker — cacheia o app para jogar offline depois de instalado.
const CACHE = 'stranger-gelatos-v4';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/engine.js',
  './js/controls.js',
  './js/game.js',
  './js/level.js',
  './js/world.js',
  './js/player.js',
  './js/weapon.js',
  './js/enemy.js',
  './js/items.js',
  './js/config.js',
  './js/pwa.js',
  './js/base.js',
  './js/scenery.js',
  './js/audio.js',
  './textures/facade.png',
  './textures/facade-normal.png',
  './textures/grass.png',
  './textures/brick.png',
  './textures/flesh-floor.png',
  './textures/flesh-wall.png',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
