/* global __PRECACHE__ */
/* Service Worker del modo offline.
 *
 * No se escribe a mano en dist/: vite.config.js toma esta plantilla en cada
 * `npm run build`, completa la versión y la lista de archivos a precachear
 * (los archivos compilados llevan hash en el nombre) y emite dist/sw.js.
 *
 * Qué hace:
 *  - Precachea la app (index.html, JS, CSS, íconos) para que abra sin internet.
 *  - Las navegaciones sirven el index.html cacheado si la red falla (SPA).
 *  - Las fuentes de Google se guardan al usarse por primera vez.
 *  - NO toca la API ni ninguna otra petición a otro origen: los datos offline
 *    los maneja la app con IndexedDB, no el service worker.
 */
const VERSION = "__VERSION__";
const CACHE_APP = `transporte-app-${VERSION}`;
const CACHE_FUENTES = "transporte-fuentes-v1";
const PRECACHE = __PRECACHE__;
// Algunos servidores (p. ej. vite preview) mandan `Vary: Origin`; sin esto, los archivos guardados
// no coinciden con las peticiones de <script type=module> y sin conexión no se encuentran.
const SIN_VARY = { ignoreVary: true };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_APP)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((n) => n !== CACHE_APP && n !== CACHE_FUENTES)
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

const conTimeout = (promesa, ms) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promesa.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });

// Navegación: red primero (para recibir versiones nuevas) con 4 s de espera;
// si falla o tarda, la app guardada. Si el servidor no sabe resolver la ruta
// (404 en un hosting sin reescritura SPA), también se sirve la app guardada.
async function navegar(req) {
  const cache = await caches.open(CACHE_APP);
  try {
    const resp = await conTimeout(fetch(req), 4000);
    if (resp.ok) {
      cache.put("/index.html", resp.clone());
      return resp;
    }
    return (await cache.match("/index.html", SIN_VARY)) || resp;
  } catch {
    return (await cache.match("/index.html", SIN_VARY)) || Response.error();
  }
}

async function primeroCache(req) {
  const cache = await caches.open(CACHE_APP);
  const guardado = await cache.match(req, SIN_VARY);
  if (guardado) return guardado;
  const resp = await fetch(req);
  if (resp.ok) cache.put(req, resp.clone());
  return resp;
}

async function revalidar(req) {
  const cache = await caches.open(CACHE_FUENTES);
  const guardado = await cache.match(req);
  const red = fetch(req)
    .then((resp) => {
      if (resp.ok || resp.type === "opaque") cache.put(req, resp.clone());
      return resp;
    })
    .catch(() => null);
  return guardado || (await red) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(revalidar(req));
    return;
  }

  if (url.origin !== self.location.origin) return; // la API y otros orígenes no se tocan
  if (url.pathname.startsWith("/api")) return; // por si la API se publica en el mismo origen

  if (req.mode === "navigate") {
    event.respondWith(navegar(req));
    return;
  }

  event.respondWith(primeroCache(req));
});
