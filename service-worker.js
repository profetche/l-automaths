// ── service-worker.js ── AutoMaths PWA ────────────────────────────────────────
// Stratégie : Network-first avec fallback cache.
// À chaque nouveau déploiement, incrémenter CACHE_VERSION.

const CACHE_VERSION = 'v4';
const CACHE_NAME    = `automaths-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/app.js',
];

// ── Installation : mise en cache des ressources essentielles ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  // Prendre le contrôle immédiatement sans attendre l'ancienne SW
  self.skipWaiting();
});

// ── Activation : suppression des anciens caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // Prendre le contrôle de tous les clients ouverts
  self.clients.claim();
});

// ── Fetch : Network-first, fallback cache ─────────────────────────────────────
self.addEventListener('fetch', event => {
  // On ne gère que les requêtes GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Mettre à jour le cache avec la réponse réseau fraîche
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Réseau indisponible → fallback cache
        return caches.match(event.request);
      })
  );
});
