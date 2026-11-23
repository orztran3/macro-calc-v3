/* Macros service worker: keeps the app usable offline. Bump CACHE when you upload a new version. */
const CACHE = 'macros3-v3.16';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// 3.0 runs beside 2.x on the same site, so it only ever removes its own older caches (names starting "macros3-").
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k.startsWith('macros3-')).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// App files: serve from cache instantly, refresh the cache in the background (picked up next open).
// Everything else (Open Food Facts lookups) goes straight to the network and is never cached.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Only this app's own folder: a copy installed in a subfolder (such as v3/) has its own service worker and cache.
  if (url.pathname.slice(new URL('./', self.location).pathname.length).includes('/')) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
