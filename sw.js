const CACHE_NAME = "ai-tw-stock-v4";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];


/* =========================================================
   安裝新版 Service Worker
========================================================= */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(
          cache =>
            cache.addAll(
              STATIC_ASSETS
            )
        )
        .then(
          () =>
            self.skipWaiting()
        )

    );

  }
);


/* =========================================================
   啟用
   自動刪除所有舊 Cache
========================================================= */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(
          cacheNames =>

            Promise.all(

              cacheNames
                .filter(
                  name =>
                    name !== CACHE_NAME
                )
                .map(
                  name =>
                    caches.delete(
                      name
                    )
                )

            )
        )
        .then(
          () =>
            self.clients.claim()
        )

    );

  }
);


/* =========================================================
   Fetch
========================================================= */

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;


    /*
      只處理 GET。
    */

    if(
      request.method !== "GET"
    ){

      return;

    }


    /*
      Google Apps Script API
      絕對不進 Service Worker Cache。
    */

    if(
      request.url.includes(
        "script.google.com"
      )
    ){

      return;

    }


    /*
      HTML：
      網路優先。

      這是避免舊版 index.html
      一直被 Cache 卡住的核心。
    */

    if(
      request.mode === "navigate" ||
      request.url.endsWith(
        "/index.html"
      ) ||
      request.url.endsWith(
        "/"
      )
    ){

      event.respondWith(

        fetch(
          request,
          {
            cache:"no-store"
          }
        )
        .then(
          response => {

            if(
              response &&
              response.ok
            ){

              const clone =
                response.clone();


              caches
                .open(
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
      其他靜態檔案：

      Cache First
      沒有快取才連網。
    */

    event.respondWith(

      caches
        .match(
          request
        )
        .then(
          cachedResponse => {

            if(
              cachedResponse
            ){

              return cachedResponse;

            }


            return fetch(
              request
            )
            .then(
              response => {

                if(
                  response &&
                  response.ok
                ){

                  const clone =
                    response.clone();


                  caches
                    .open(
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

  }
);
