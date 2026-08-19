const CACHE_NAME = "ai-tw-stock-v20260819-02";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];


/* =========================================================
   安裝
========================================================= */

self.addEventListener("install", event => {

  self.skipWaiting();

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache =>
        cache.addAll(STATIC_ASSETS)
      )

  );

});


/* =========================================================
   啟用
========================================================= */

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


/* =========================================================
   Fetch
========================================================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }


  const url = new URL(request.url);


  /* =======================================================
     ① Apps Script API
     絕對不進 Service Worker Cache
  ======================================================= */

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


  /* =======================================================
     ② HTML / 首頁
     永遠優先抓 GitHub 最新版本
  ======================================================= */

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

        const clone = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {

            cache.put(
              request,
              clone
            );

          });

        return response;

      })

      .catch(() => {

        return caches.match(request);

      })

    );

    return;
  }


  /* =======================================================
     ③ JavaScript / CSS
     優先網路
     避免更新 index 後仍使用舊 JS
  ======================================================= */

  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

      .then(response => {

        const clone =
          response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {

            cache.put(
              request,
              clone
            );

          });

        return response;

      })

      .catch(() => {

        return caches.match(request);

      })

    );

    return;
  }


  /* =======================================================
     ④ Manifest
     優先網路
  ======================================================= */

  if (
    url.pathname.endsWith("manifest.json")
  ) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

      .then(response => {

        const clone =
          response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {

            cache.put(
              request,
              clone
            );

          });

        return response;

      })

      .catch(() => {

        return caches.match(request);

      })

    );

    return;
  }


  /* =======================================================
     ⑤ 其他靜態檔案
     Cache First
  ======================================================= */

  event.respondWith(

    caches.match(request)

      .then(cached => {

        if (cached) {
          return cached;
        }

        return fetch(request);

      })

  );

});
