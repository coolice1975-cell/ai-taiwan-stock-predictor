const CACHE="ai-tw-stock-v5";

const CORE=[
  "./",
  "./index.html",
  "./manifest.json"
];


self.addEventListener(
  "install",

  event => {

    event.waitUntil(

      caches

        .open(
          CACHE
        )

        .then(
          c =>
            c.addAll(
              CORE
            )
        )

        .then(
          () =>
            self.skipWaiting()
        )

    );

  }

);


self.addEventListener(
  "activate",

  event => {

    event.waitUntil(

      caches

        .keys()

        .then(

          keys =>

            Promise.all(

              keys

                .filter(
                  k =>
                    k !== CACHE
                )

                .map(
                  k =>
                    caches.delete(
                      k
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


self.addEventListener(
  "fetch",

  event => {

    const req =
      event.request;


    if(
      req.method !==
      "GET"
    ){

      return;

    }


    const url =
      new URL(
        req.url
      );


    if(

      url.origin ===
      location.origin &&

      (

        url.pathname.endsWith(
          "/index.html"
        )

        ||

        url.pathname.endsWith(
          "/"
        )

      )

    ){

      event.respondWith(

        fetch(
          req,
          {
            cache:
              "no-store"
          }
        )

        .then(

          r => {

            const copy =
              r.clone();


            caches

              .open(
                CACHE
              )

              .then(
                c =>
                  c.put(
                    req,
                    copy
                  )
              );


            return r;

          }

        )

        .catch(

          () =>
            caches.match(
              req
            )

        )

      );


      return;

    }


    event.respondWith(

      caches

        .match(
          req
        )

        .then(

          cached =>

            cached ||

            fetch(
              req
            )

            .then(

              r => {

                if(

                  r.ok &&

                  url.origin ===
                  location.origin

                ){

                  const copy =
                    r.clone();


                  caches

                    .open(
                      CACHE
                    )

                    .then(
                      c =>
                        c.put(
                          req,
                          copy
                        )
                    );

                }


                return r;

              }

            )

        )

    );

  }

);
