const CACHE_NAME = "coedit-cache-v2";
const ASSETS = ["/favicon.ico", "/logo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => (k === CACHE_NAME ? undefined : caches.delete(k)))
        )
      )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Never handle cross-origin requests (e.g., S3 presigned URLs)
  if (!sameOrigin) return;

  // Skip API and auth calls
  if (url.pathname.startsWith("/api/")) return;

  // Only cache static assets
  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const resClone = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, resClone))
            .catch(() => {});
          return res;
        });
      })
    );
  } else {
    // For all other requests, fetch from the network only
    event.respondWith(fetch(req));
  }
});
