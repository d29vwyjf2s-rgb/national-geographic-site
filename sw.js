const CACHE_NAME = "national-geographic-v4";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];


self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches.open(CACHE_NAME)
        .then(cache => {

          return cache.addAll(
            APP_FILES
          );

        })

    );

    self.skipWaiting();

  }
);


self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches.keys()
        .then(keys => {

          return Promise.all(

            keys
              .filter(
                key =>
                  key !== CACHE_NAME
              )
              .map(
                key =>
                  caches.delete(key)
              )

          );

        })

    );

    self.clients.claim();

  }
);


self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;


    if (
      request.method !== "GET"
    ) {
      return;
    }


    /*
      API всегда получаем
      напрямую, чтобы публикации
      оставались свежими.
    */

    if (
      request.url.includes(
        "national-geographic-backend"
      )
    ) {

      event.respondWith(

        fetch(request)
          .catch(
            () =>
              caches.match(request)
          )

      );

      return;

    }


    event.respondWith(

      caches.match(request)
        .then(cached => {

          if (cached) {
            return cached;
          }


          return fetch(request)
            .then(response => {

              if (
                !response ||
                response.status !== 200
              ) {
                return response;
              }


              const copy =
                response.clone();


              caches.open(
                CACHE_NAME
              )
              .then(cache => {

                cache.put(
                  request,
                  copy
                );

              });


              return response;

            });

        })

    );

  }
);
