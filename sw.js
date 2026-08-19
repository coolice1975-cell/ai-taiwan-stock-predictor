const CACHE_NAME = "ai-tw-stock-v20260819";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];


/* 安裝 */
self.addEventListener("install", event => {

  self.skipWaiting();

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache =>
        cache.addAll(STATIC_ASSETS)
      )

  );

});


/* 啟用 */
self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys =>

      Promise.all(

        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))

      )

    )

  );

  self.clients.claim();

});


/*
  HTML：
  永遠優先網路。
  避免 GitHub Pages 一直顯示舊版本。
*/
self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
    API 不進 Service Worker 快取
  */
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("googleusercontent.com")
  ) {

    event.respondWith(
      fetch(request, {
        cache: "no-store"
      })
    );

    return;
  }


  /*
    HTML / 根目錄：Network First
  */
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/")
  ) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

      .then(response => {

        const clone =
          response.clone();

        caches.open(CACHE_NAME)
          .then(cache =>
            cache.put(request, clone)
          );

        return response;

      })

      .catch(() =>
        caches.match(request)
      )

    );

    return;
  }


  /*
    其他靜態資源：
    Cache First
  */
  event.respondWith(

    caches.match(request)
      .then(cached => {

        return cached || fetch(request);

      })

  );

});
