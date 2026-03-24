// Family Dinner Planner – Service Worker v2
// Only caches static assets. Never intercepts navigations or API calls
// so that auth redirects (302) always reach the browser unmodified.
const CACHE_NAME = 'fdp-v2';

// ── Install: skip waiting, activate immediately ───────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for static assets only ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through everything that isn't a cacheable static asset:
  // - Non-GET requests
  // - Different origin (Supabase, Google, etc.)
  // - API routes
  // - Navigation requests (HTML pages, auth redirects) ← KEY: never intercept
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    request.mode === 'navigate'
  ) {
    return;
  }

  // Only cache immutable static assets (JS chunks, CSS, fonts, images)
  const isStaticAsset = /\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)(\?.*)?$/.test(url.pathname);
  if (!isStaticAsset) return;

  // Cache-first strategy for static assets
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
