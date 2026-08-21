const CACHE_NAME = 'mbogi-static-v1';
const API_CACHE_NAME = 'mbogi-api-v1';
// Configurable options — tweak before registering the worker.
const CONFIG = {
  api: {
    enabled: true, // whether to cache API GET responses
    // If true, use stale-while-revalidate: respond from cache if available,
    // then update cache in background. If false, network-first.
    staleWhileRevalidate: true,
  },
};

const ASSETS = [
  '/',
  '/index.html',
  '/vite.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k); return null; }))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Serve same-origin static assets from cache first
  if (url.origin === self.location.origin) {
    // images and static files
    if (request.destination === 'image' || request.destination === 'document' || request.url.endsWith('.svg') || request.url.endsWith('.png') || request.url.endsWith('.jpg') || request.url.endsWith('.jpeg') || request.url.endsWith('.gif')) {
      event.respondWith(caches.match(request).then((r) => r || fetch(request).then((resp) => { try { const copy = resp.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); } catch (_) {} return resp; }).catch(() => caches.match('/vite.svg'))));
      return;
    }

    // API requests (same-origin, starting with /api/) — optional caching
    if (CONFIG.api.enabled && url.pathname.startsWith('/api/')) {
      if (CONFIG.api.staleWhileRevalidate) {
        // Stale-while-revalidate: return cache if present, and update in background
        event.respondWith(
          caches.open(API_CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(request);
            const networkFetch = fetch(request)
              .then((resp) => { try { cache.put(request, resp.clone()); } catch (_) {} return resp; })
              .catch(() => null);
            // If we have cached data, return it immediately and let network update come later
            if (cached) {
              // fire-and-forget the network update
              event.waitUntil(networkFetch);
              return cached;
            }
            // Otherwise wait for network
            const net = await networkFetch;
            if (net) return net;
            // fallback to any cache match
            return cache.match(request);
          }),
        );
      } else {
        // Network-first fallback to cache
        event.respondWith(
          fetch(request)
            .then((resp) => { try { const copy = resp.clone(); caches.open(API_CACHE_NAME).then((c) => c.put(request, copy)); } catch (_) {} return resp; })
            .catch(() => caches.match(request)),
        );
      }
      return;
    }
  }

  // For other GETs, use network-first then fallback to cache
  event.respondWith(
    fetch(request)
      .then((resp) => {
        try { const copy = resp.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); } catch (_) {}
        return resp;
      })
      .catch(() => caches.match(request)),
  );
});
