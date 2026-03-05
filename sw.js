const CACHE = 'budget-v2';

// On install: cache the main page and local assets only
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(['./index.html', './manifest.json', './icon-192.png', './icon-512.png'])
        .catch(() => {})
    )
  );
  self.skipWaiting();
});

// On activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache if available, else network
self.addEventListener('fetch', e => {
  // Only handle same-origin or cached requests — let CDN scripts go straight to network
  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    // For external CDN scripts: network first, cache as fallback
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // For same-origin: cache first, then network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
