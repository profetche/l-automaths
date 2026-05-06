const CACHE_VERSION = 'v6';
const CACHE_NAME = `automaths-${CACHE_VERSION}`;
const STATIC_ASSETS = ['/', '/index.html', '/app.js'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request).then(r => { if (r && r.status === 200 && e.request.method === 'GET') { const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)); } return r; }).catch(() => caches.match(e.request))); });
