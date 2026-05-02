/* Burnout/AI Service Worker — shell caching for offline support */
const CACHE = "burnout-ai-v1";
const SHELL = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Only cache GET requests for same-origin resources
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Don't cache API calls
  if (url.pathname.startsWith("/predict") || url.pathname.startsWith("/chat") ||
      url.pathname.startsWith("/plan") || url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/register")) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((resp) => {
        if (resp && resp.status === 200 && url.origin === location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return resp;
      });
      return cached || network;
    })
  );
});
