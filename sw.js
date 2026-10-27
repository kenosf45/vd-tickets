// Keeps the app working with no signal. Tries the network first (so updates
// show up right away) and falls back to the cached copy when offline.
const CACHE = 'vd-tickets-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      const response = await Promise.race([fetch(request), timeout]);
      if (response.ok) cache.put(request, response.clone());
      return response;
    } catch (e) {
      return (await cache.match(request, { ignoreSearch: true })) || Response.error();
    }
  })());
});
