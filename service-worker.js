const CACHE_VERSION = 'v5';
const CACHE_NAME = `automaths-${CACHE_VERSION}`;
const ASSETS = ['/', '/index.html', '/app.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const cl = r.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, cl)); }
      return r;
    }).catch(() => caches.match(e.request))
  );
});
