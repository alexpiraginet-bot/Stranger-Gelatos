// Service worker do GELO NINJA (escopo /ninja/) — independente do jogo de
// plataforma da raiz e do app da Copa. Network-first: online sempre pega a
// versão nova; offline cai no cache e o jogo continua jogável.
const CACHE = 'ninja-v1';
const ASSETS = [
  './', './index.html', './manifest.json', './css/ninja.css',
  './js/main.js', './js/game.js', './js/config.js', './js/levels.js', './js/geleco.js',
  './js/slice.js', './js/blade.js', './js/props.js', './js/fx.js', './js/render.js',
  './js/audio.js', './js/state.js', './js/rng.js',
  './icons/ninja-192.png', './icons/ninja-512.png', './icons/ninja-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ninja-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // cross-origin: navegador resolve
  if (url.pathname.startsWith('/api/')) return;      // API nunca é cacheada
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request)),
  );
});
