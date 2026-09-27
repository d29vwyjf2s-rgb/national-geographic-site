const CACHE_NAME = "national-geographic-v4-1";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];

/* Установка новой версии */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
  );

  self.skipWaiting();
});

/* Удаление старого кэша */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

/* Запросы */
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  /*
    API никогда не берём из старого кэша.
    Посты должны приходить свежими.
  */
  if (
    request.url.includes(
      "national-geographic-backend"
    )
  ) {
    event.respondWith(
      fetch(request, {
        cache: "no-store"
      }).catch(() => {
        return caches.match(request);
      })
    );

    return;
  }

  /*
    HTML всегда сначала пытаемся получить
    свежий вариант с GitHub Pages.
  */
  if (
    request.mode === "navigate" ||
    request.url.endsWith(".html") ||
    request.url.endsWith("/")
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {

          if (response && response.status === 200) {
            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, copy);
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
    CSS / JS / manifest / иконки
    сначала берём из сети.
  */
  event.respondWith(
    fetch(request)
      .then(response => {

        if (
          response &&
          response.status === 200
        ) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, copy);
            });
        }

        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
