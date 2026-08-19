/* =========================================================
   AI 台股預測
   Service Worker
   Version: 20260819-03
   =========================================================

   目的：
   1. 避免舊版 index.html 被 Service Worker 卡住
   2. 新版部署後立即啟用
   3. index.html / 導航頁面採 Network First
   4. 靜態資源採 Cache First
   5. API 不進 Service Worker 快取
   6. 清除舊版本 Cache
   7. 支援 GitHub Pages
========================================================= */


const CACHE_VERSION =
  "ai-tw-stock-v20260819-03";


const STATIC_CACHE =
  CACHE_VERSION +
  "-static";


const PAGE_CACHE =
  CACHE_VERSION +
  "-page";


/*
  GitHub Pages 基本靜態資源
  不預先快取 API。
*/
const STATIC_ASSETS = [

  "./",

  "./index.html",

  "./manifest.json",

  "./sw.js"

];


/* =========================================================
   安裝
========================================================= */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(
          STATIC_CACHE
        )
        .then(
          cache =>
            cache.addAll(
              STATIC_ASSETS
            )
        )
        .catch(
          error => {

            console.error(
              "[SW] Install cache error:",
              error
            );

          }
        )

    );


    /*
      新 Service Worker 不等待舊版本結束。
    */

    self.skipWaiting();

  }
);


/* =========================================================
   啟用
========================================================= */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      Promise.all([

        /*
          清除所有舊版 Cache
        */

        caches.keys()
          .then(
            cacheNames => {

              return Promise.all(

                cacheNames
                  .filter(
                    name => {

                      return (

                        name.startsWith(
                          "ai-tw-stock-"
                        )

                        &&

                        name !==
                          STATIC_CACHE

                        &&

                        name !==
                          PAGE_CACHE

                      );

                    }
                  )
                  .map(
                    name =>
                      caches.delete(
                        name
                      )
                  )

              );

            }
          ),

        /*
          立即控制目前頁面
        */

        self.clients.claim()

      ])

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


    const url =
      new URL(
        request.url
      );


    /*
      -------------------------------------------------------
      ① Google Apps Script API
      -------------------------------------------------------

      API 資料不能被 Service Worker 舊快取攔截。

      特別是：
      ?action=market
      ?action=morning
      ?action=stock&symbol=2330

      全部直接交給瀏覽器網路層。
    */

    if(
      url.hostname.includes(
        "script.google.com"
      )

      ||

      url.hostname.includes(
        "googleusercontent.com"
      )
    ){

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
      -------------------------------------------------------
      ② 非 GET / 非 HTTP
      -------------------------------------------------------
    */

    if(
      !(
        url.protocol === "http:" ||
        url.protocol === "https:"
      )
    ){

      return;

    }


    /*
      -------------------------------------------------------
      ③ HTML / 導航
      -------------------------------------------------------

      最重要。

      不使用 Cache First。

      每次開啟網站：
        Network
          ↓
        最新 index.html

      網路失敗才使用舊版快取。
    */

    if(
      request.mode === "navigate"
      ||

      request.destination === "document"

      ||

      url.pathname.endsWith(
        "/"
      )

      ||

      url.pathname.endsWith(
        "index.html"
      )
    ){

      event.respondWith(
        networkFirstPage(
          request
        )
      );

      return;

    }


    /*
      -------------------------------------------------------
      ④ JS / CSS / 圖片 / 字型
      -------------------------------------------------------

      靜態檔案：

      Cache First
          ↓
      沒有快取
          ↓
      Network
          ↓
      寫入最新版本 Cache
    */

    if(
      isStaticAsset(
        request
      )
    ){

      event.respondWith(
        cacheFirstStatic(
          request
        )
      );

      return;

    }


    /*
      -------------------------------------------------------
      ⑤ 其他網站資源
      -------------------------------------------------------

      Network First。
      失敗時才嘗試 Cache。
    */

    event.respondWith(
      networkFirst(
        request
      )
    );

  }
);


/* =========================================================
   HTML Network First
========================================================= */

async function networkFirstPage(
  request
){

  const cache =
    await caches.open(
      PAGE_CACHE
    );


  try{

    /*
      明確要求最新 HTML。
    */

    const networkResponse =
      await fetch(
        request,
        {
          cache:
            "no-store"
        }
      );


    if(
      networkResponse &&
      networkResponse.ok
    ){

      /*
        只快取真正 HTML。
      */

      const contentType =
        networkResponse
          .headers
          .get(
            "content-type"
          ) || "";


      if(
        contentType.includes(
          "text/html"
        )
      ){

        await cache.put(
          request,
          networkResponse.clone()
        );

      }


      return networkResponse;

    }


    throw new Error(
      "Network HTML response invalid"
    );

  }
  catch(error){

    console.warn(
      "[SW] HTML network failed:",
      error
    );


    /*
      網路失敗才使用 Cache。
    */

    const cached =
      await cache.match(
        request
      );


    if(cached){

      return cached;

    }


    /*
      最後再找 index.html。
    */

    const fallback =
      await cache.match(
        "./index.html"
      );


    if(fallback){

      return fallback;

    }


    /*
      完全沒有快取時，
      回傳簡單離線頁。
    */

    return new Response(
      `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">
<title>AI 台股預測</title>
<style>
body{
  margin:0;
  background:#020617;
  color:#fff;
  font-family:-apple-system,
  BlinkMacSystemFont,
  "PingFang TC",
  sans-serif;
  display:flex;
  min-height:100vh;
  align-items:center;
  justify-content:center;
  text-align:center;
}
.box{
  padding:30px;
}
h1{
  font-size:24px;
}
p{
  color:#94a3b8;
  line-height:1.8;
}
</style>
</head>
<body>
<div class="box">
<h1>目前無法連線</h1>
<p>
請確認網路連線後重新整理頁面。
</p>
</div>
</body>
</html>
      `,
      {
        status:503,
        headers:{
          "Content-Type":
            "text/html; charset=UTF-8"
        }
      }
    );

  }

}


/* =========================================================
   Static Cache First
========================================================= */

async function cacheFirstStatic(
  request
){

  const cache =
    await caches.open(
      STATIC_CACHE
    );


  const cached =
    await cache.match(
      request
    );


  if(cached){

    /*
      背景更新。

      使用者不必等待，
      下一次載入即可拿到新版。
    */

    updateStaticCache(
      request,
      cache
    );


    return cached;

  }


  try{

    const response =
      await fetch(
        request
      );


    if(
      response &&
      response.ok
    ){

      await cache.put(
        request,
        response.clone()
      );

    }


    return response;

  }
  catch(error){

    console.error(
      "[SW] Static resource failed:",
      error
    );


    return new Response(
      "",
      {
        status:503
      }
    );

  }

}


/* =========================================================
   背景更新 Static
========================================================= */

async function updateStaticCache(
  request,
  cache
){

  try{

    const response =
      await fetch(
        request,
        {
          cache:
            "no-store"
        }
      );


    if(
      response &&
      response.ok
    ){

      await cache.put(
        request,
        response.clone()
      );

    }

  }
  catch(error){

    /*
      背景更新失敗不影響目前頁面。
    */

    console.warn(
      "[SW] Background update failed:",
      error
    );

  }

}


/* =========================================================
   Network First
========================================================= */

async function networkFirst(
  request
){

  try{

    const response =
      await fetch(
        request
      );


    if(
      response &&
      response.ok
    ){

      const cache =
        await caches.open(
          STATIC_CACHE
        );


      await cache.put(
        request,
        response.clone()
      );

    }


    return response;

  }
  catch(error){

    const cache =
      await caches.open(
        STATIC_CACHE
      );


    const cached =
      await cache.match(
        request
      );


    if(cached){

      return cached;

    }


    return new Response(
      "",
      {
        status:503
      }
    );

  }

}


/* =========================================================
   判斷靜態資源
========================================================= */

function isStaticAsset(
  request
){

  const destination =
    request.destination;


  if(
    destination === "script" ||
    destination === "style" ||
    destination === "image" ||
    destination === "font" ||
    destination === "manifest"
  ){

    return true;

  }


  const pathname =
    new URL(
      request.url
    ).pathname
      .toLowerCase();


  return (

    pathname.endsWith(
      ".js"
    )

    ||

    pathname.endsWith(
      ".css"
    )

    ||

    pathname.endsWith(
      ".png"
    )

    ||

    pathname.endsWith(
      ".jpg"
    )

    ||

    pathname.endsWith(
      ".jpeg"
    )

    ||

    pathname.endsWith(
      ".webp"
    )

    ||

    pathname.endsWith(
      ".svg"
    )

    ||

    pathname.endsWith(
      ".ico"
    )

    ||

    pathname.endsWith(
      ".woff"
    )

    ||

    pathname.endsWith(
      ".woff2"
    )

  );

}


/* =========================================================
   手動要求清除 Cache
========================================================= */

self.addEventListener(
  "message",
  event => {

    if(
      !event.data
    ){

      return;

    }


    /*
      index.html 可要求 SW 清除所有 Cache。
    */

    if(
      event.data.type ===
      "CLEAR_CACHE"
    ){

      event.waitUntil(

        caches
          .keys()
          .then(
            names =>
              Promise.all(
                names.map(
                  name =>
                    caches.delete(
                      name
                    )
                )
              )
          )

      );

    }


    /*
      立即啟用新版。
    */

    if(
      event.data.type ===
      "SKIP_WAITING"
    ){

      self.skipWaiting();

    }

  }
);


/* =========================================================
   Client 版本同步
========================================================= */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      self.clients
        .matchAll({
          type:"window",
          includeUncontrolled:true
        })
        .then(
          clients => {

            clients.forEach(
              client => {

                client.postMessage({

                  type:
                    "SW_UPDATED",

                  version:
                    CACHE_VERSION

                });

              }
            );

          }
        )

    );

  }
);
