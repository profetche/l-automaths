const CACHE_VERSION = 'v10';
const CACHE_NAME = `automaths-${CACHE_VERSION}`;
const PRECACHE_URLS = ['/', '/index.html', '/app.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE_URLS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; e.respondWith(fetch(e.request).then(r => { if (r && r.status === 200) caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request))); });
