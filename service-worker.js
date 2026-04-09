const CACHE = 'automaths-v1';
const ASSETS = ['/', '/index.html', '/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/index.html'))));
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: "l'AutoMaths", body: "Sigma t'attend ! 🤖" };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'automaths-reminder',
    vibrate: [200, 100, 200],
    data: { url: '/' },
    actions: [
      { action: 'open',    title: "C'est parti 🚀" },
      { action: 'dismiss', title: "Plus tard" }
    ]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action !== 'dismiss') {
    e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
  }
});
