// ── AutoMaths Service Worker ───────────────────────────────────────────────────
// CACHE_VERSION v4  (incrémenté : restructuration catégorie polynômes 7 sous-cat)

const CACHE_VERSION = 'v4';
const CACHE_NAME    = `automaths-${CACHE_VERSION}`;

// Ressources à mettre en cache au premier install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/app.js',
];

// ── Install : précache ─────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // prend le contrôle immédiatement
  );
});

// ── Activate : purge anciens caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('automaths-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // contrôle tous les onglets ouverts
  );
});

// ── Fetch : network-first avec fallback cache ──────────────────────────────────
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes non-GET ni les requêtes cross-origin
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        // Réseau indisponible → fallback sur le cache
        caches.match(event.request)
      )
  );
});

// ── Message : force update depuis app.js ───────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
