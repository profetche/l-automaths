const CACHE_VERSION = 159;
const CACHE_NAME = `automaths-v${CACHE_VERSION}`;

// Shell minimal pré-mis en cache à l'installation
const SHELL = [
  '/',
  '/index.html',
  '/app.js',
];

// CDN qu'on accepte de mettre en cache (pour l'offline). Le reste (Plausible…)
// n'est PAS intercepté : comportement réseau natif, donc plus de 503 fantôme.
const CDN_HOSTS = [
  'cdnjs.cloudflare.com',   // KaTeX
  'unpkg.com',              // React, ReactDOM, Babel
  'fonts.googleapis.com',   // @import dans app.js
  'fonts.gstatic.com',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;

  const sameOrigin = url.origin === self.location.origin;
  const cacheable = sameOrigin || CDN_HOSTS.includes(url.hostname);

  // Requêtes tierces non essentielles (Plausible analytics, etc.) :
  // on ne les intercepte pas du tout.
  if (!cacheable) return;

  // 1) Navigations : réseau d'abord (index.html frais), repli sur le shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put('/index.html', clone));
          return res;
        })
        .catch(() =>
          caches.match('/index.html').then(c => c || caches.match('/'))
        )
    );
    return;
  }

  // 2) app.js, KaTeX, React, Babel, polices… : stale-while-revalidate.
  //    Service immédiat depuis le cache + rafraîchissement en tâche de fond.
  //    JAMAIS de réponse vide en 503.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
