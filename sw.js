const CACHE = 'boomboomblocks-v4';
const ASSETS = [
  '/',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  // Take over immediately without waiting for old SW to die
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Always network-first for HTML — never serve stale game
  if (e.request.mode === 'navigate' || e.request.url.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          // Cache the fresh response for offline fallback
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for assets (fonts, mp3s, icons)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});

// Tell all clients when a new SW has taken over
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
