const CACHE_NAME = "national-geographic-v5";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        cache.addAll(APP_FILES)
      )
  );

  self.skipWaiting();
});


self.addEventListener("activate", event => {

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
});


self.addEventListener("fetch", event => {

  const request =
    event.request;

  if (
    request.method !== "GET"
  ) {
    return;
  }


  if (
    request.url.includes(
      "national-geographic-backend"
    )
  ) {

    event.respondWith(

      fetch(request)
        .catch(
          () => caches.match(request)
        )

    );

    return;
  }


  event.respondWith(

    fetch(request)
      .then(response => {

        if (
          !response ||
          response.status !== 200
        ) {

          return response;

        }

        const copy =
          response.clone();

        caches.open(CACHE_NAME)
          .then(cache =>
            cache.put(
              request,
              copy
            )
          );

        return response;

      })
      .catch(
        () => caches.match(request)
      )

  );

});
