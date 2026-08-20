const CACHE_NAME = "ai-tw-stock-v20260820-01";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];


/* =========================================================
   安裝
========================================================= */

self.addEventListener("install", event => {

  /*
    立即啟用新版 Service Worker
  */
  self.skipWaiting();

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache =>

        cache.addAll(
          STATIC_ASSETS
        )

      )

  );

});


/* =========================================================
   啟用
========================================================= */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()
      .then(keys =>

        Promise.all(

          keys
            .filter(
              key =>
                key !== CACHE_NAME
            )
            .map(
              key =>
                caches.delete(key)
            )

        )

      )
      .then(() =>

        self.clients.claim()

      )

  );

});


/* =========================================================
   Fetch
========================================================= */

self.addEventListener("fetch", event => {

  const request =
    event.request;


  /*
    只處理 GET
  */

  if (
    request.method !== "GET"
  ) {

    return;

  }


  const url =
    new URL(
      request.url
    );


  /*
    ========================================================
    Google Apps Script API
    ========================================================

    API 永遠不進 Service Worker Cache。

    同時強制要求瀏覽器不要使用 HTTP cache，
    避免晨報、自選股、大盤、個股資料
    被舊資料卡住。
  */

  if (

    url.hostname.includes(
      "script.google.com"
    )

    ||

    url.hostname.includes(
      "googleusercontent.com"
    )

  ) {

    event.respondWith(

      fetch(
        request,
        {
          cache:
            "no-store"
        }
      )

    );

    return;

  }


  /*
    ========================================================
    HTML / 首頁
    ========================================================

    Network First。

    目的：
    GitHub Pages 更新 index.html 後，
    優先取得最新版本。

    網路失敗時才使用舊快取，
    讓離線狀態仍可開啟。
  */

  if (

    request.mode ===
      "navigate"

    ||

    url.pathname.endsWith(
      ".html"
    )

    ||

    url.pathname ===
      "/"

    ||

    url.pathname.endsWith(
      "/"
    )

  ) {

    event.respondWith(

      fetch(
        request,
        {
          cache:
            "no-store"
        }
      )

      .then(
        response => {

          /*
            只快取正常 HTTP 回應。
          */

          if (
            response &&
            response.ok
          ) {

            const clone =
              response.clone();


            caches.open(
              CACHE_NAME
            )
            .then(
              cache =>
                cache.put(
                  request,
                  clone
                )
            );

          }


          return response;

        }
      )

      .catch(
        () =>

          caches.match(
            request
          )

      )

    );

    return;

  }


  /*
    ========================================================
    Manifest
    ========================================================

    Manifest 屬於版本敏感資源，
    Network First，避免 PWA 還讀到舊 manifest。
  */

  if (

    url.pathname.endsWith(
      "manifest.json"
    )

  ) {

    event.respondWith(

      fetch(
        request,
        {
          cache:
            "no-store"
        }
      )

      .then(
        response => {

          if (
            response &&
            response.ok
          ) {

            const clone =
              response.clone();


            caches.open(
              CACHE_NAME
            )
            .then(
              cache =>
                cache.put(
                  request,
                  clone
                )
            );

          }


          return response;

        }
      )

      .catch(
        () =>
          caches.match(
            request
          )
      )

    );

    return;

  }


  /*
    ========================================================
    其他靜態資源
    ========================================================

    Cache First。

    例如未來加入：
    CSS、圖片、圖示、字型等，
    不需要每次重新下載。
  */

  event.respondWith(

    caches.match(
      request
    )
    .then(
      cached => {

        if (
          cached
        ) {

          return cached;

        }


        return fetch(
          request
        )
        .then(
          response => {

            /*
              正常 GET 回應才加入快取。
            */

            if (
              response &&
              response.ok
            ) {

              const clone =
                response.clone();


              caches.open(
                CACHE_NAME
              )
              .then(
                cache =>
                  cache.put(
                    request,
                    clone
                  )
              );

            }


            return response;

          }
        );

      }
    )

  );

});
