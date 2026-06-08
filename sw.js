const CACHE_NAME = "sol-equipes-cache-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./manifest.webmanifest"
];

// Instala e cacheia os assets essenciais
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll falha se qualquer asset não existir — usamos add individual com tolerância
      return Promise.allSettled(ASSETS.map((asset) => cache.add(asset)));
    })
  );
  self.skipWaiting();
});

// Remove caches antigos ao ativar
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache-first para assets estáticos, network-first para API
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Requisições à API sempre vão para a rede (nunca cacheia)
  if (url.pathname.includes("api.php") || url.searchParams.has("path")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets estáticos: cache-first com fallback para rede
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Só cacheia respostas válidas de assets estáticos
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
