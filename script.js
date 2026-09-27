const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const VK_GROUP_URL =
  "https://vk.ru/national.geograph1c";

const POSTS_PER_LOAD = 20;

let allPosts = [];
let visiblePosts = POSTS_PER_LOAD;

const likedPosts =
  JSON.parse(
    localStorage.getItem("ng_liked_posts") || "[]"
  );

document.addEventListener(
  "DOMContentLoaded",
  () => {
    init();
  }
);


/* =========================================================
   INIT
========================================================= */

async function init() {

  setupMenu();
  setupBackToTop();
  setupLoadMore();
  setupToast();

  await loadPosts();

  registerServiceWorker();

  setInterval(
    loadPosts,
    5 * 60 * 1000
  );
}


/* =========================================================
   LOAD POSTS
========================================================= */

async function loadPosts() {

  const postsContainer =
    document.getElementById("posts");

  const status =
    document.getElementById("feedStatus");

  if (!postsContainer) {
    return;
  }

  if (status) {
    status.textContent =
      "Загрузка публикаций...";
  }

  try {

    const response =
      await fetch(
        `${API_URL}?limit=100&offset=0`,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      !data ||
      !data.success
    ) {
      throw new Error(
        data?.error ||
        "API error"
      );
    }

    allPosts =
      Array.isArray(data.posts)
        ? data.posts
        : [];

    visiblePosts =
      POSTS_PER_LOAD;

    renderPosts();

    if (status) {
      status.textContent =
        `${allPosts.length} публикаций`;
    }

  } catch (error) {

    console.error(
      "Ошибка загрузки:",
      error
    );

    if (status) {
      status.textContent =
        "Не удалось загрузить публикации";
    }

    postsContainer.innerHTML = `
      <div class="feedError">
        <div class="feedErrorTitle">
          Не удалось загрузить публикации
        </div>

        <div class="feedErrorText">
          Проверьте соединение с сервером.
        </div>

        <button
          class="retryButton"
          onclick="loadPosts()"
        >
          Повторить
        </button>
      </div>
    `;
  }
}


/* =========================================================
   RENDER POSTS
========================================================= */

function renderPosts() {

  const container =
    document.getElementById("posts");

  if (!container) {
    return;
  }

  const posts =
    allPosts.slice(
      0,
      visiblePosts
    );

  if (!posts.length) {

    container.innerHTML = `
      <div class="feedEmpty">
        Пока нет публикаций
      </div>
    `;

    updateLoadMore();
    return;
  }

  container.innerHTML =
    posts
      .map(
        (post, index) =>
          renderPost(
            post,
            index
          )
      )
      .join("");

  updateLoadMore();

  setupGalleryEvents();
  setupLikeButtons();
}


/* =========================================================
   GET IMAGES
========================================================= */

function getImages(post) {

  let images = [];

  /*
    Основной вариант:
    API уже возвращает массив images.
  */

  if (
    Array.isArray(post.images)
  ) {
    images =
      post.images.filter(
        url =>
          typeof url === "string" &&
          url.trim()
      );
  }

  /*
    Если images нет —
    пробуем images_json.
  */

  if (
    !images.length &&
    post.images_json
  ) {

    try {

      const parsed =
        JSON.parse(
          post.images_json
        );

      if (
        Array.isArray(parsed)
      ) {
        images =
          parsed.filter(
            url =>
              typeof url === "string" &&
              url.trim()
          );
      }

    } catch (error) {

      console.warn(
        "Ошибка images_json:",
        error
      );
    }
  }

  /*
    Последний резерв —
    image_url.
  */

  if (
    !images.length &&
    post.image_url
  ) {
    images = [
      post.image_url
    ];
  }

  /*
    Убираем дубли.
  */

  return [
    ...new Set(images)
  ];
}


/* =========================================================
   RENDER POST
========================================================= */

function renderPost(
  post,
  index
) {

  const images =
    getImages(post);

  const hasImages =
    images.length > 0;

  const hasVideo =
    Boolean(
      post.video_type ||
      post.video_url ||
      post.video_player ||
      post.video_vk_url
    );

  const date =
    formatDate(
      post.post_date
    );

  const text =
    formatPostText(
      post.text || ""
    );

  const liked =
    likedPosts.includes(
      String(post.vk_id)
    );

  const postId =
    escapeHtml(
      String(post.vk_id || post.id)
    );

  let media = "";

  /*
    Сначала фотографии.
  */

  if (hasImages) {

    media =
      renderGallery(
        images,
        post
      );
  }

  /*
    Если фотографий нет,
    показываем видео.
  */

  else if (hasVideo) {

    media =
      renderVideo(
        post
      );
  }

  /*
    Если медиа нет.
  */

  else {

    media = `
      <div class="postNoMedia">
        <div class="postNoMediaText">
          NATIONAL GEOGRAPHIC
        </div>
      </div>
    `;
  }

  return `
    <article
      class="postCard"
      data-post-id="${postId}"
    >

      ${media}

      <div class="postContent">

        ${
          date
            ? `
              <div class="postDate">
                ${escapeHtml(date)}
              </div>
            `
            : ""
        }

        ${
          text
            ? `
              <div class="postText">
                ${text}
              </div>
            `
            : ""
        }

        <div class="postActions">

          <button
            class="postAction likeButton ${
              liked ? "liked" : ""
            }"
            data-post-id="${postId}"
            aria-label="Нравится"
            type="button"
          >
            <span class="heart">
              ${liked ? "♥" : "♡"}
            </span>

            <span>
              Нравится
            </span>
          </button>

          <button
            class="postAction shareButton"
            type="button"
            onclick="sharePost(${index})"
          >
            <span>↗</span>
            <span>Поделиться</span>
          </button>

          <a
            class="postAction vkButton"
            href="${getVkPostUrl(post)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            VK
          </a>

        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   GALLERY
========================================================= */

function renderGallery(
  images,
  post
) {

  if (!images.length) {
    return "";
  }

  /*
    Одна фотография.
  */

  if (images.length === 1) {

    return `
      <div
        class="vkGallery single"
        data-gallery="${escapeAttribute(
          JSON.stringify(images)
        )}"
      >

        <img
          class="vkGalleryImage"
          src="${escapeAttribute(images[0])}"
          alt="${escapeAttribute(
            post.text || "National Geographic"
          )}"
          loading="lazy"
          decoding="async"
        >

        <div class="galleryZoom">
          ⛶
        </div>

      </div>
    `;
  }

  /*
    Несколько фотографий.
  */

  const visible =
    images.slice(0, 4);

  return `
    <div
      class="vkGallery multi count-${Math.min(
        images.length,
        4
      )}"
      data-gallery="${escapeAttribute(
        JSON.stringify(images)
      )}"
    >

      ${visible
        .map(
          (image, index) => `
            <div
              class="vkGalleryItem"
            >

              <img
                class="vkGalleryImage"
                src="${escapeAttribute(image)}"
                alt="Фото ${index + 1}"
                loading="lazy"
                decoding="async"
              >

              ${
                index === 3 &&
                images.length > 4
                  ? `
                    <div class="galleryMore">
                      +${images.length - 4}
                    </div>
                  `
                  : ""
              }

            </div>
          `
        )
        .join("")}

    </div>
  `;
}


/* =========================================================
   VIDEO
========================================================= */

function renderVideo(post) {

  const title =
    post.video_title ||
    "Видео";

  const vkUrl =
    getVideoUrl(post);

  /*
    Если есть прямой MP4.
  */

  if (post.video_url) {

    return `
      <div class="vkPostVideo">

        <video
          class="vkVideoElement"
          controls
          preload="metadata"
          playsinline
          poster=""
        >

          <source
            src="${escapeAttribute(
              post.video_url
            )}"
            type="video/mp4"
          >

        </video>

        <div class="videoTitle">
          ${escapeHtml(title)}
        </div>

      </div>
    `;
  }

  /*
    VK player.
  */

  if (post.video_player) {

    return `
      <div class="vkPostVideo">

        <div class="vkVideoFrame">

          <iframe
            src="${escapeAttribute(
              post.video_player
            )}"
            frameborder="0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowfullscreen
            loading="lazy"
          ></iframe>

        </div>

        <div class="videoTitle">
          ${escapeHtml(title)}
        </div>

      </div>
    `;
  }

  /*
    Нет player —
    показываем красивую карточку VK.
  */

  if (vkUrl) {

    return `
      <div class="vkPostVideo">

        <a
          class="videoFallback"
          href="${escapeAttribute(vkUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >

          <div class="videoFallbackInner">

            <div class="videoPlayCircle">
              ▶
            </div>

            <div class="videoFallbackTitle">
              ${escapeHtml(title)}
            </div>

            <div class="videoFallbackText">
              Смотреть видео VK
            </div>

            <div class="videoOpenButton">
              Открыть видео
            </div>

          </div>

        </a>

      </div>
    `;
  }

  return `
    <div class="vkPostVideo">

      <div class="videoFallback">

        <div class="videoFallbackInner">

          <div class="videoPlayCircle">
            ▶
          </div>

          <div class="videoFallbackTitle">
            ${escapeHtml(title)}
          </div>

          <div class="videoFallbackText">
            Видео обрабатывается VK
          </div>

        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   VK POST URL
========================================================= */

function getVkPostUrl(post) {

  if (
    post.vk_id
  ) {

    return (
      "https://vk.ru/wall" +
      post.vk_id
    );
  }

  return VK_GROUP_URL;
}


/* =========================================================
   VIDEO URL
========================================================= */

function getVideoUrl(post) {

  if (
    post.video_vk_url
  ) {
    return post.video_vk_url;
  }

  if (
    post.video_owner_id !== null &&
    post.video_owner_id !== undefined &&
    post.video_id
  ) {

    let url =
      `https://vk.com/video${post.video_owner_id}_${post.video_id}`;

    if (
      post.video_access_key
    ) {
      url +=
        `_${post.video_access_key}`;
    }

    return url;
  }

  return null;
}


/* =========================================================
   GALLERY EVENTS
========================================================= */

function setupGalleryEvents() {

  const galleries =
    document.querySelectorAll(
      "[data-gallery]"
    );

  galleries.forEach(
    gallery => {

      gallery.addEventListener(
        "click",
        () => {

          try {

            const images =
              JSON.parse(
                gallery.dataset.gallery
              );

            if (
              Array.isArray(images) &&
              images.length
            ) {

              openViewer(
                images,
                0
              );
            }

          } catch (error) {

            console.error(
              "Gallery error:",
              error
            );
          }
        }
      );
    }
  );
}


/* =========================================================
   IMAGE VIEWER
========================================================= */

function openViewer(
  images,
  startIndex = 0
) {

  let current =
    Math.max(
      0,
      Math.min(
        startIndex,
        images.length - 1
      )
    );

  let viewer =
    document.getElementById(
      "ngImageViewer"
    );

  if (!viewer) {

    viewer =
      document.createElement(
        "div"
      );

    viewer.id =
      "ngImageViewer";

    viewer.innerHTML = `
      <div class="viewerBackdrop"></div>

      <button
        class="viewerClose"
        type="button"
        aria-label="Закрыть"
      >
        ×
      </button>

      <button
        class="viewerPrev"
        type="button"
        aria-label="Предыдущее"
      >
        ‹
      </button>

      <div class="viewerContent">

        <img
          class="viewerImage"
          alt=""
        >

        <div class="viewerCounter"></div>

      </div>

      <button
        class="viewerNext"
        type="button"
        aria-label="Следующее"
      >
        ›
      </button>
    `;

    document.body.appendChild(
      viewer
    );

    viewer
      .querySelector(
        ".viewerBackdrop"
      )
      .addEventListener(
        "click",
        closeViewer
      );

    viewer
      .querySelector(
        ".viewerClose"
      )
      .addEventListener(
        "click",
        closeViewer
      );

    viewer
      .querySelector(
        ".viewerPrev"
      )
      .addEventListener(
        "click",
        () => {

          current =
            (
              current -
              1 +
              images.length
            ) %
            images.length;

          updateViewer();
        }
      );

    viewer
      .querySelector(
        ".viewerNext"
      )
      .addEventListener(
        "click",
        () => {

          current =
            (
              current +
              1
            ) %
            images.length;

          updateViewer();
        }
      );
  }

  function updateViewer() {

    const image =
      viewer.querySelector(
        ".viewerImage"
      );

    const counter =
      viewer.querySelector(
        ".viewerCounter"
      );

    image.src =
      images[current];

    counter.textContent =
      `${current + 1} / ${images.length}`;
  }

  updateViewer();

  viewer.classList.add(
    "active"
  );

  document.body.classList.add(
    "viewerOpen"
  );

  document.onkeydown =
    event => {

      if (
        event.key === "Escape"
      ) {
        closeViewer();
      }

      if (
        event.key === "ArrowLeft"
      ) {

        current =
          (
            current -
            1 +
            images.length
          ) %
          images.length;

        updateViewer();
      }

      if (
        event.key === "ArrowRight"
      ) {

        current =
          (
            current +
            1
          ) %
          images.length;

        updateViewer();
      }
    };
}


function closeViewer() {

  const viewer =
    document.getElementById(
      "ngImageViewer"
    );

  if (viewer) {
    viewer.classList.remove(
      "active"
    );
  }

  document.body.classList.remove(
    "viewerOpen"
  );

  document.onkeydown = null;
}


/* =========================================================
   LIKES
========================================================= */

function setupLikeButtons() {

  const buttons =
    document.querySelectorAll(
      ".likeButton"
    );

  buttons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.postId;

          toggleLike(
            id,
            button
          );
        }
      );
    }
  );
}


function toggleLike(
  id,
  button
) {

  const index =
    likedPosts.indexOf(id);

  if (index >= 0) {

    likedPosts.splice(
      index,
      1
    );

    button.classList.remove(
      "liked"
    );

    const heart =
      button.querySelector(
        ".heart"
      );

    if (heart) {
      heart.textContent =
        "♡";
    }

  } else {

    likedPosts.push(id);

    button.classList.add(
      "liked"
    );

    const heart =
      button.querySelector(
        ".heart"
      );

    if (heart) {
      heart.textContent =
        "♥";
    }

    showToast(
      "Добавлено в понравившиеся ❤️"
    );
  }

  localStorage.setItem(
    "ng_liked_posts",
    JSON.stringify(
      likedPosts
    )
  );
}


/* =========================================================
   SHARE
========================================================= */

async function sharePost(index) {

  const post =
    allPosts[index];

  if (!post) {
    return;
  }

  const url =
    getVkPostUrl(post);

  const title =
    "National Geographic";

  try {

    if (
      navigator.share
    ) {

      await navigator.share({
        title,
        text:
          post.text || title,
        url
      });

      return;
    }

    await navigator.clipboard.writeText(
      url
    );

    showToast(
      "Ссылка скопирована"
    );

  } catch (error) {

    console.log(
      "Share cancelled"
    );
  }
}


/* =========================================================
   LOAD MORE
========================================================= */

function setupLoadMore() {

  const button =
    document.getElementById(
      "loadMore"
    );

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      visiblePosts +=
        POSTS_PER_LOAD;

      renderPosts();

      setTimeout(
        () => {

          const journal =
            document.getElementById(
              "journal"
            );

          if (journal) {
            journal.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }

        },
        100
      );
    }
  );
}


function updateLoadMore() {

  const wrap =
    document.getElementById(
      "loadMoreWrap"
    );

  const button =
    document.getElementById(
      "loadMore"
    );

  if (!wrap || !button) {
    return;
  }

  if (
    visiblePosts >=
    allPosts.length
  ) {

    wrap.style.display =
      "none";

  } else {

    wrap.style.display =
      "";

    button.textContent =
      `Показать ещё`;
  }
}


/* =========================================================
   MENU
========================================================= */

function setupMenu() {

  const button =
    document.getElementById(
      "menuButton"
    );

  const menu =
    document.getElementById(
      "mobileMenu"
    );

  if (!button || !menu) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      menu.classList.toggle(
        "open"
      );

      button.classList.toggle(
        "active"
      );
    }
  );

  menu
    .querySelectorAll("a")
    .forEach(
      link => {

        link.addEventListener(
          "click",
          () => {

            menu.classList.remove(
              "open"
            );

            button.classList.remove(
              "active"
            );
          }
        );
      }
    );
}


/* =========================================================
   BACK TO TOP
========================================================= */

function setupBackToTop() {

  const button =
    document.getElementById(
      "backToTop"
    );

  if (!button) {
    return;
  }

  window.addEventListener(
    "scroll",
    () => {

      if (
        window.scrollY >
        500
      ) {

        button.classList.add(
          "visible"
        );

      } else {

        button.classList.remove(
          "visible"
        );
      }
    }
  );

  button.addEventListener(
    "click",
    () => {

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );
}


/* =========================================================
   TOAST
========================================================= */

function setupToast() {

  if (
    !document.getElementById(
      "toast"
    )
  ) {

    const toast =
      document.createElement(
        "div"
      );

    toast.id =
      "toast";

    document.body.appendChild(
      toast
    );
  }
}


function showToast(message) {

  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) {
    return;
  }

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2500
    );
}


/* =========================================================
   DATE
========================================================= */

function formatDate(timestamp) {

  if (!timestamp) {
    return "";
  }

  const date =
    new Date(
      Number(timestamp) * 1000
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "ru-RU",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );
}


/* =========================================================
   TEXT
========================================================= */

function formatPostText(text) {

  if (!text) {
    return "";
  }

  let result =
    escapeHtml(text);

  /*
    Ссылки.
  */

  result =
    result.replace(
      /(https?:\/\/[^\s<]+)/g,
      url => `
        <a
          href="${url}"
          target="_blank"
          rel="noopener noreferrer"
          class="postLink"
        >
          ${url}
        </a>
      `
    );

  /*
    Переносы строк.
  */

  result =
    result.replace(
      /\n/g,
      "<br>"
    );

  return result;
}


/* =========================================================
   ESCAPE
========================================================= */

function escapeHtml(value = "") {

  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function escapeAttribute(
  value = ""
) {

  return escapeHtml(
    value
  );
}


/* =========================================================
   SERVICE WORKER
========================================================= */

function registerServiceWorker() {

  if (
    "serviceWorker" in navigator
  ) {

    window.addEventListener(
      "load",
      () => {

        navigator.serviceWorker
          .register(
            "./sw.js"
          )
          .then(
            registration => {

              console.log(
                "Service Worker:",
                registration.scope
              );

            }
          )
          .catch(
            error => {

              console.warn(
                "Service Worker error:",
                error
              );

            }
          );
      }
    );
  }
}
