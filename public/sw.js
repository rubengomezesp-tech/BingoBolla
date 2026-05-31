// BingoBolla — Service Worker
// Estrategia:
//   • Precache de shell (manifest + iconos)
//   • Network-first para HTML  (siempre intenta red; cae a cache si falla)
//   • Stale-while-revalidate para imágenes y fuentes
//   • Cache-first para assets versionados de Next (/_next/static/*)
//   • Nunca cachea POST ni rutas /api/*

const VERSION = "v3";
const PRECACHE = `bb-precache-${VERSION}`;
const RUNTIME = `bb-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== PRECACHE && k !== RUNTIME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/");
}
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json"
  );
}
function isImageOrFont(req, url) {
  const dest = req.destination;
  if (dest === "image" || dest === "font") return true;
  return /\.(png|jpe?g|webp|svg|gif|woff2?|ttf|otf)$/i.test(url.pathname);
}
function isHTML(req) {
  return req.mode === "navigate" || req.destination === "document";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Nunca cachear API ni auth (depende de sesión Supabase y RNG server-side)
  if (isApiRequest(url)) return;

  // Cache-first para assets inmutables (next/static + iconos)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
      )
    );
    return;
  }

  // Stale-while-revalidate para imágenes y fuentes
  if (isImageOrFont(req, url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first para navegación HTML (siempre fresca, fallback a cache offline)
  if (isHTML(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("/")))
    );
    return;
  }

  // Resto: red con fallback a cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

// Permite que la app fuerce update del SW desde el cliente
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
