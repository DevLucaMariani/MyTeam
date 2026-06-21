/* Service worker minimale: cache "app shell" per consultazione offline.
   I dati restano sul backend locale; qui memorizziamo solo i file statici.
   Strategia: NETWORK-FIRST (online -> sempre l'ultima versione; offline -> cache). */
const CACHE = 'client-configurator-v2';
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/api.js',
  './js/ui.js',
  './js/admin.js',
  './js/client.js',
  './js/router.js',
  './js/app.js',
  './assets/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Le chiamate API vanno sempre alla rete (dati freschi dal DB locale).
  if (url.pathname.startsWith('/api/')) return;
  // Network-first: prova la rete (aggiorna la cache), altrimenti usa la cache.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
