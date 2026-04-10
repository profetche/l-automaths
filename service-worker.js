// ── Change CACHE_VERSION à chaque déploiement pour invalider l'ancien cache ──
const CACHE_VERSION = 'automaths-v2';
const ASSETS = ['/', '/index.html', '/app.js'];

// ── Install : pré-cache les assets ───────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())  // active immédiatement le nouveau SW
  );
});

// ── Activate : supprime tous les anciens caches ──────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // prend le contrôle des onglets ouverts
  );
});

// ── Fetch : network-first pour les assets, cache en fallback ─────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // On met à jour le cache avec la réponse fraîche
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        return response;
      })
      .catch(() => {
        // Hors-ligne : on sert depuis le cache
        return caches.match(e.request)
          .then(cached => cached || caches.match('/index.html'));
      })
  );
});

// ── Push notifications ───────────────────────────────────────────────────────
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
