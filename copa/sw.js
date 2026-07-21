// Service worker do app Figurinhas da Copa (escopo /copa/) — versão própria,
// independente do jogo. Network-first: online sempre pega o novo; offline cai no cache.
const CACHE = 'copa-v30';
const ASSETS = [
  './', './index.html', './css/copa.css', './manifest.json',
  './js/app.js', './js/album.js', './js/state.js', './js/scan.js', './js/cloud.js', './js/audio.js', './js/maker.js',
  './js/card3d.js', './js/three.module.min.js', './js/import-scan.js', './data/seed-scan-2026-07-20.json', './js/live.js',
  './icons/copa-192.png', './icons/copa-512.png', './icons/bento26.png', './icons/cam-frame.png',
  './icons/sticker-bg.jpg', './icons/selo-bento.png', './icons/cam-frame-wide.png',
  './icons/home-bg.webp', './icons/logo-shield.webp', './icons/obj-scan.webp', './icons/obj-album.webp', './icons/obj-trade.webp',
  './icons/card-maker.webp', './icons/card-logout.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('copa-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;          // cross-origin: navegador resolve
  if (url.pathname.startsWith('/api/')) return;             // API nunca é cacheada
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
