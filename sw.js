const CACHE_NAME = "ai-tw-stock-v3";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];

/* ================================
   安裝新版 Service Worker
================================ */

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())

  );

});


/* ================================
   啟用新版 Service Worker
   自動刪除舊版 Cache
================================ */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()
      .then(cacheNames => {

        return Promise.all(

          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))

        );

      })
      .then(() => self.clients.claim())

  );

});


/* ================================
   Fetch
================================ */

self.addEventListener("fetch", event => {

  const request = event.request;

  /*

    API / 非 GET 不進 Service Worker Cache

  */

  if (
    request.method !== "GET" ||
    request.url.includes("script.google.com")
  ) {

    return;

  }


  /*
    HTML / 網頁：
    網路優先

    這是本次最重要的修正。
  */

  if (
    request.mode === "navigate" ||
    request.url.endsWith("/index.html") ||
    request.url.endsWith("/")
  ) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })
      .then(response => {

        if (response && response.ok) {

          const clone = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, clone);
            });

        }

        return response;

      })
      .catch(() => {

        return caches.match(request);

      })

    );

    return;

  }


  /*
    CSS / JS / Manifest 等：
    Cache First
    網路失敗時才使用快取
  */

  event.respondWith(

    caches.match(request)
      .then(cachedResponse => {

        if (cachedResponse) {

          return cachedResponse;

        }

        return fetch(request)
          .then(response => {

            if (
              response &&
              response.ok
            ) {

              const clone =
                response.clone();

              caches.open(CACHE_NAME)
                .then(cache => {

                  cache.put(
                    request,
                    clone
                  );

                });

            }

            return response;

          });

      })

  );

});
