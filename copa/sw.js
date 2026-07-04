// Service worker do app Figurinhas da Copa (escopo /copa/) — versão própria,
// independente do jogo. Network-first: online sempre pega o novo; offline cai no cache.
const CACHE = 'copa-v12';
const ASSETS = [
  './', './index.html', './css/copa.css', './manifest.json',
  './js/app.js', './js/album.js', './js/state.js', './js/scan.js', './js/cloud.js', './js/audio.js', './js/maker.js',
  './icons/copa-192.png', './icons/copa-512.png', './icons/bento26.png', './icons/cam-frame.png',
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
