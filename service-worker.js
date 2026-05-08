const CACHE_VERSION = 'v4';
const CACHE_NAME = `automaths-${CACHE_VERSION}`;

// ── Installation : pas de pre-cache, on laisse le réseau primer ──────────────
self.addEventListener('install', event => {
  self.skipWaiting();
});

// ── Activation : supprime les anciens caches ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('automaths-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie Network-First ────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et hors-origine
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache une copie de la réponse réseau
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Réseau indisponible → fallback cache
        return caches.match(event.request);
      })
  );
});
