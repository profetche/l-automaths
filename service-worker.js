const CACHE_VERSION = 125;
const CACHE_NAME = `automaths-v${CACHE_VERSION}`;

const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
];

// Installation : mise en cache des assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch : network-first, fallback cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Ignorer les schémas non-HTTP (chrome-extension://, etc.)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Ne mettre en cache que les réponses valides
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || new Response('', { status: 503, statusText: 'Offline' })
        )
      )
  );
});
