const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const VK_GROUP_URL =
  "https://vk.ru/national.geograph1c";

const POSTS_PER_PAGE = 12;

let allPosts = [];
let visibleCount = POSTS_PER_PAGE;

const likedPosts = JSON.parse(
  localStorage.getItem(
    "national_geographic_likes"
  ) || "{}"
);

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initMenu();
    initBackToTop();
    initLoadMore();
    initImageViewer();
    loadPosts();

    setInterval(
      loadPosts,
      5 * 60 * 1000
    );
  }
);

/* =========================================================
   ЗАГРУЗКА
========================================================= */

async function loadPosts() {
  const status =
    document.getElementById("feedStatus");

  const container =
    document.getElementById("posts");

  if (!container) return;

  if (!allPosts.length && status) {
    status.textContent =
      "Загружаем публикации…";
  }

  try {
    const response = await fetch(
      API_URL + "?limit=100&offset=0",
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
      !Array.isArray(data.posts)
    ) {
      throw new Error(
        "API вернул неверный формат данных"
      );
    }

    allPosts = data.posts;

    visibleCount = Math.min(
      POSTS_PER_PAGE,
      allPosts.length
    );

    renderPosts();

    if (status) {
      status.textContent =
        allPosts.length
          ? ""
          : "Публикаций пока нет.";
    }

  } catch (error) {
    console.error(
      "National Geographic API:",
      error
    );

    if (!allPosts.length && status) {
      status.innerHTML = `
        <div class="emptyState">
          <strong>
            Не удалось загрузить публикации
          </strong>
          <span>
            Проверьте соединение и обновите страницу.
          </span>
        </div>
      `;
    }
  }
}

/* =========================================================
   ОТРИСОВКА
========================================================= */

function renderPosts() {
  const container =
    document.getElementById("posts");

  if (!container) return;

  const posts =
    allPosts.slice(
      0,
      visibleCount
    );

  container.innerHTML =
    posts
      .map((post, index) =>
        renderPost(
          post,
          index
        )
      )
      .join("");

  updateLoadMore();
  bindPostEvents();
}

/* =========================================================
   ПОСТ
========================================================= */

function renderPost(
  post,
  index
) {
  const text =
    post.text || "";

  const date =
    formatDate(
      post.post_date
    );

  const images =
    getImages(post);

  const video =
    getVideo(post);

  const postId =
    String(
      post.vk_id ||
      post.id ||
      index
    );

  const liked =
    !!likedPosts[postId];

  return `
    <article
      class="vkPost"
      data-post-id="${escapeAttribute(postId)}"
    >

      <header class="vkPostHeader">

        <div class="vkPostAvatar">
          <span></span>
        </div>

        <div class="vkPostMeta">

          <div class="vkPostAuthor">
            National Geographic
          </div>

          <div class="vkPostDate">
            ${escapeHtml(date)}
          </div>

        </div>

      </header>

      ${
        text
          ? `
            <div class="vkPostText">
              ${linkify(text)}
            </div>
          `
          : ""
      }

      ${
        images.length
          ? renderGallery(
              images,
              postId
            )
          : ""
      }

      ${
        video
          ? renderVideo(
              video,
              postId
            )
          : ""
      }

      <div class="vkPostActions">

        <button
          class="postAction likeButton ${
            liked ? "liked" : ""
          }"
          data-action="like"
          data-post-id="${escapeAttribute(postId)}"
          type="button"
        >
          <span class="likeIcon">
            ${liked ? "♥" : "♡"}
          </span>

          <span>Нравится</span>
        </button>

        <button
          class="postAction"
          data-action="share"
          data-post-id="${escapeAttribute(postId)}"
          type="button"
        >
          ↗ Поделиться
        </button>

        <a
          class="postAction"
          href="${escapeAttribute(
            getVkUrl(post)
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          VK ↗
        </a>

      </div>

      <div class="vkPostSource">
        NATIONAL GEOGRAPHIC
      </div>

    </article>
  `;
}

/* =========================================================
   ВИДЕО
========================================================= */

function getVideo(post) {
  const hasVideo =
    post.video_type === "video" ||
    post.video_type === "clip" ||
    !!post.video_url ||
    !!post.video_player ||
    !!post.video_vk_url ||
    !!post.video_id;

  if (!hasVideo) {
    return null;
  }

  let vkUrl =
    post.video_vk_url ||
    null;

  /*
   * Если Worker не передал video_vk_url,
   * собираем ссылку из ID.
   */
  if (
    !vkUrl &&
    post.video_owner_id != null &&
    post.video_id != null
  ) {
    vkUrl =
      "https://vk.ru/video" +
      post.video_owner_id +
      "_" +
      post.video_id;

    if (post.video_access_key) {
      vkUrl +=
        "?access_key=" +
        encodeURIComponent(
          post.video_access_key
        );
    }
  }

  return {
    url:
      post.video_url ||
      null,

    player:
      post.video_player ||
      null,

    vkUrl,

    title:
      post.video_title ||
      "Видео",

    accessKey:
      post.video_access_key ||
      null,

    ownerId:
      post.video_owner_id ??
      null,

    videoId:
      post.video_id ??
      null
  };
}

function renderVideo(
  video,
  postId
) {
  /*
   * ПРЯМОЙ MP4
   */
  if (video.url) {
    return `
      <div class="vkPostMedia vkPostVideo">

        <video
          controls
          playsinline
          preload="metadata"
          class="vkVideoElement"
          src="${escapeAttribute(video.url)}"
        ></video>

        <div class="videoTitle">
          ${escapeHtml(video.title)}
        </div>

      </div>
    `;
  }

  /*
   * PLAYER
   */
  if (video.player) {
    return `
      <div class="vkPostMedia vkPostVideo">

        <div class="vkVideoFrame">
          <iframe
            src="${escapeAttribute(video.player)}"
            loading="lazy"
            allow="
              autoplay;
              encrypted-media;
              fullscreen;
              picture-in-picture
            "
            allowfullscreen
            frameborder="0"
          ></iframe>
        </div>

        <div class="videoTitle">
          ${escapeHtml(video.title)}
        </div>

      </div>
    `;
  }

  /*
   * ЕСТЬ ССЫЛКА VK
   *
   * Это как раз твой текущий случай:
   *
   * video_vk_url:
   * https://vk.ru/video-222376958_456247546?access_key=...
   */
  if (video.vkUrl) {
    return `
      <div
        class="vkPostMedia vkPostVideo"
        data-video-card="${escapeAttribute(postId)}"
      >

        <div
          class="videoFallbackInner"
          role="button"
          tabindex="0"
          data-video-open="${escapeAttribute(
            video.vkUrl
          )}"
        >

          <div class="videoPlayCircle">
            <span>▶</span>
          </div>

          <div class="videoFallbackTitle">
            ${escapeHtml(video.title)}
          </div>

          <div class="videoFallbackText">
            Видео из VK
          </div>

          <a
            class="videoOpenButton"
            href="${escapeAttribute(
              video.vkUrl
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Смотреть видео
          </a>

        </div>

      </div>
    `;
  }

  /*
   * ВИДЕО ОБНАРУЖЕНО,
   * НО VK ПОКА НЕ ДАЛ ССЫЛКУ.
   */
  return `
    <div
      class="vkPostMedia vkPostVideo"
      data-video-card="${escapeAttribute(postId)}"
    >

      <div class="videoFallbackInner">

        <div class="videoPlayCircle">
          <span>▶</span>
        </div>

        <div class="videoFallbackTitle">
          ${escapeHtml(video.title)}
        </div>

        <div class="videoFallbackText">
          Видео обрабатывается VK
        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   ФОТО
========================================================= */

function getImages(post) {
  let images = [];

  if (Array.isArray(post.images)) {
    images =
      post.images.filter(Boolean);
  }

  if (
    !images.length &&
    post.images_json
  ) {
    try {
      const parsed =
        JSON.parse(
          post.images_json
        );

      if (Array.isArray(parsed)) {
        images =
          parsed.filter(Boolean);
      }
    } catch (error) {
      console.warn(
        "Ошибка images_json:",
        error
      );
    }
  }

  if (
    !images.length &&
    post.image_url
  ) {
    images = [
      post.image_url
    ];
  }

  return [
    ...new Set(images)
  ];
}

function renderGallery(
  images,
  postId
) {
  if (!images.length) {
    return "";
  }

  /*
   * ОДНА ФОТОГРАФИЯ
   */
  if (images.length === 1) {
    return `
      <div class="vkPostMedia">

        <button
          class="vkPostImageButton"
          type="button"
          data-gallery-id="${escapeAttribute(postId)}"
          data-index="0"
        >
          <img
            class="vkPostImage"
            src="${escapeAttribute(images[0])}"
            alt=""
            loading="lazy"
          >
        </button>

      </div>
    `;
  }

  /*
   * ГАЛЕРЕЯ
   */
  return `
    <div
      class="vkPostMedia vkPostGallery"
      data-gallery="${escapeAttribute(postId)}"
    >

      ${images
        .slice(0, 4)
        .map(
          (image, index) => `
            <button
              class="vkGalleryItem"
              type="button"
              data-gallery-id="${escapeAttribute(postId)}"
              data-index="${index}"
            >

              <img
                src="${escapeAttribute(image)}"
                alt=""
                loading="lazy"
              />

              ${
                index === 3 &&
                images.length > 4
                  ? `
                    <span class="galleryMore">
                      +${images.length - 4}
                    </span>
                  `
                  : ""
              }

            </button>
          `
        )
        .join("")}

    </div>
  `;
}

/* =========================================================
   СОБЫТИЯ
========================================================= */

function bindPostEvents() {

  /*
   * LIKE
   */
  document
    .querySelectorAll(
      "[data-action='like']"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.postId;

          if (likedPosts[id]) {
            delete likedPosts[id];
          } else {
            likedPosts[id] = true;
          }

          localStorage.setItem(
            "national_geographic_likes",
            JSON.stringify(
              likedPosts
            )
          );

          button.classList.toggle(
            "liked",
            !!likedPosts[id]
          );

          const icon =
            button.querySelector(
              ".likeIcon"
            );

          if (icon) {
            icon.textContent =
              likedPosts[id]
                ? "♥"
                : "♡";
          }
        }
      );
    });

  /*
   * SHARE
   */
  document
    .querySelectorAll(
      "[data-action='share']"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const post =
            findPost(
              button.dataset.postId
            );

          if (!post) return;

          const url =
            getVkUrl(post);

          if (
            navigator.share
          ) {

            try {

              await navigator.share({
                title:
                  "National Geographic",
                text:
                  post.text ||
                  "National Geographic",
                url
              });

              return;

            } catch {
              // отмена
            }
          }

          try {

            await navigator.clipboard.writeText(
              url
            );

            showToast(
              "Ссылка скопирована"
            );

          } catch {

            window.open(
              url,
              "_blank"
            );
          }
        }
      );
    });

  /*
   * ФОТО
   */
  document
    .querySelectorAll(
      "[data-gallery-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset
              .galleryId;

          const index =
            Number(
              button.dataset.index
            ) || 0;

          const post =
            findPost(id);

          if (!post) return;

          const images =
            getImages(post);

          openImageViewer(
            images,
            index
          );
        }
      );
    });

  /*
   * ВИДЕО-КАРТОЧКА
   */
  document
    .querySelectorAll(
      "[data-video-open]"
    )
    .forEach(element => {

      element.addEventListener(
        "click",
        event => {

          /*
           * Если нажали именно
           * на кнопку "Смотреть видео",
           * обычная ссылка работает сама.
           */
          if (
            event.target.closest(
              "a"
            )
          ) {
            return;
          }

          const url =
            element.dataset
              .videoOpen;

          if (url) {
            window.open(
              url,
              "_blank",
              "noopener,noreferrer"
            );
          }
        }
      );

      element.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();

            const url =
              element.dataset
                .videoOpen;

            if (url) {
              window.open(
                url,
                "_blank",
                "noopener,noreferrer"
              );
            }
          }
        }
      );
    });
}

/* =========================================================
   LOAD MORE
========================================================= */

function initLoadMore() {
  const button =
    document.getElementById(
      "loadMore"
    );

  if (!button) return;

  button.addEventListener(
    "click",
    () => {

      const oldCount =
        visibleCount;

      visibleCount =
        Math.min(
          visibleCount +
            POSTS_PER_PAGE,
          allPosts.length
        );

      renderPosts();

      setTimeout(() => {

        const posts =
          document.querySelectorAll(
            ".vkPost"
          );

        const target =
          posts[oldCount];

        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }

      }, 50);
    }
  );
}

function updateLoadMore() {
  const wrap =
    document.getElementById(
      "loadMoreWrap"
    );

  if (!wrap) return;

  wrap.style.display =
    visibleCount <
    allPosts.length
      ? "flex"
      : "none";
}

/* =========================================================
   МЕНЮ
========================================================= */

function initMenu() {
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
        "open"
      );
    }
  );

  menu
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        () => {

          menu.classList.remove(
            "open"
          );

          button.classList.remove(
            "open"
          );
        }
      );
    });
}

/* =========================================================
   НАВЕРХ
========================================================= */

function initBackToTop() {
  const button =
    document.getElementById(
      "backToTop"
    );

  if (!button) return;

  window.addEventListener(
    "scroll",
    () => {

      button.classList.toggle(
        "show",
        window.scrollY > 500
      );
    },
    {
      passive: true
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
   IMAGE VIEWER
========================================================= */

let viewer = null;
let viewerImages = [];
let viewerIndex = 0;

function initImageViewer() {

  viewer =
    document.getElementById(
      "imageViewer"
    );

  if (!viewer) {

    viewer =
      document.createElement(
        "div"
      );

    viewer.id =
      "imageViewer";

    viewer.className =
      "imageViewer";

    viewer.innerHTML = `
      <div class="imageViewerContent">

        <button
          class="imageViewerClose"
          type="button"
          aria-label="Закрыть"
        >
          ×
        </button>

        <button
          class="imageViewerPrev"
          type="button"
          aria-label="Назад"
        >
          ‹
        </button>

        <img
          class="imageViewerImage"
          alt=""
        >

        <button
          class="imageViewerNext"
          type="button"
          aria-label="Вперёд"
        >
          ›
        </button>

        <div class="imageViewerCounter"></div>

      </div>
    `;

    document.body.appendChild(
      viewer
    );
  }

  const close =
    viewer.querySelector(
      ".imageViewerClose"
    );

  const prev =
    viewer.querySelector(
      ".imageViewerPrev"
    );

  const next =
    viewer.querySelector(
      ".imageViewerNext"
    );

  close.addEventListener(
    "click",
    closeImageViewer
  );

  prev.addEventListener(
    "click",
    () =>
      changeViewerImage(-1)
  );

  next.addEventListener(
    "click",
    () =>
      changeViewerImage(1)
  );

  viewer.addEventListener(
    "click",
    event => {

      if (
        event.target === viewer
      ) {
        closeImageViewer();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {

      if (
        !viewer.classList.contains(
          "open"
        )
      ) {
        return;
      }

      if (
        event.key === "Escape"
      ) {
        closeImageViewer();
      }

      if (
        event.key === "ArrowLeft"
      ) {
        changeViewerImage(-1);
      }

      if (
        event.key === "ArrowRight"
      ) {
        changeViewerImage(1);
      }
    }
  );
}

function openImageViewer(
  images,
  index
) {
  if (
    !images ||
    !images.length
  ) {
    return;
  }

  viewerImages =
    images;

  viewerIndex =
    Math.max(
      0,
      Math.min(
        index,
        images.length - 1
      )
    );

  updateViewer();

  viewer.classList.add(
    "open"
  );

  document.body.style.overflow =
    "hidden";
}

function updateViewer() {
  const image =
    viewer.querySelector(
      ".imageViewerImage"
    );

  const counter =
    viewer.querySelector(
      ".imageViewerCounter"
    );

  const prev =
    viewer.querySelector(
      ".imageViewerPrev"
    );

  const next =
    viewer.querySelector(
      ".imageViewerNext"
    );

  image.src =
    viewerImages[
      viewerIndex
    ];

  counter.textContent =
    `${viewerIndex + 1} / ${
      viewerImages.length
    }`;

  prev.style.display =
    viewerImages.length > 1
      ? ""
      : "none";

  next.style.display =
    viewerImages.length > 1
      ? ""
      : "none";
}

function changeViewerImage(
  direction
) {
  if (
    viewerImages.length <= 1
  ) {
    return;
  }

  viewerIndex +=
    direction;

  if (viewerIndex < 0) {
    viewerIndex =
      viewerImages.length - 1;
  }

  if (
    viewerIndex >=
    viewerImages.length
  ) {
    viewerIndex = 0;
  }

  updateViewer();
}

function closeImageViewer() {
  if (!viewer) return;

  viewer.classList.remove(
    "open"
  );

  document.body.style.overflow =
    "";
}

/* =========================================================
   HELPERS
========================================================= */

function findPost(id) {
  return allPosts.find(
    post =>
      String(
        post.vk_id ||
        post.id
      ) === String(id)
  );
}

function getVkUrl(post) {
  if (post.vk_id) {
    return (
      "https://vk.ru/wall" +
      post.vk_id
    );
  }

  if (post.id) {
    return (
      VK_GROUP_URL +
      "?w=wall" +
      post.id
    );
  }

  return VK_GROUP_URL;
}

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
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function linkify(text) {
  const escaped =
    escapeHtml(text);

  return escaped
    .replace(
      /(https?:\/\/[^\s<]+)/gi,
      url => `
        <a
          class="postLink"
          href="${url}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${url}
        </a>
      `
    )
    .replace(
      /\n/g,
      "<br>"
    );
}

function escapeHtml(value) {
  return String(
    value ?? ""
  )
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

function escapeAttribute(value) {
  return escapeHtml(value);
}

function showToast(message) {
  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) return;

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
   SERVICE WORKER
========================================================= */

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
        .catch(
          error =>
            console.warn(
              "Service Worker:",
              error
            )
        );
    }
  );
}
