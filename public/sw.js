// Family Dinner Planner – Service Worker
const CACHE_NAME = 'fdp-v1';

// App Shell – diese Routen beim Install cachen
const PRECACHE_URLS = [
  '/',
  '/plan',
  '/rezepte',
  '/shopping',
  '/kids',
  '/settings',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install: App Shell precachen ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: alte Caches bereinigen ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: Network-first für API, Cache-first für Assets ─────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API-Calls immer live fetchen (nie cachen)
  if (url.pathname.startsWith('/api/')) {
    return; // Browser-Standard verwenden
  }

  // Nur GET-Requests cachen
  if (request.method !== 'GET') return;

  // Externe Ressourcen (Pollinations, Supabase) durchlassen
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate für App-Routen
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached); // Offline: cached Version verwenden

      return cached ?? networkFetch;
    })
  );
});
