const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const VK_GROUP_URL =
  "https://vk.ru/national.geograph1c";

const POSTS_PER_PAGE = 12;

let allPosts = [];
let visibleCount = POSTS_PER_PAGE;

const likedPosts =
  JSON.parse(
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
   LOAD POSTS
========================================================= */

async function loadPosts() {
  const status =
    document.getElementById(
      "feedStatus"
    );

  const container =
    document.getElementById(
      "posts"
    );

  if (!container) return;

  if (!allPosts.length) {
    status.textContent =
      "Загружаем публикации…";
  }

  try {
    const response =
      await fetch(
        API_URL +
          "?limit=100&offset=0",
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
        "Неверный формат API"
      );
    }

    allPosts =
      data.posts;

    visibleCount =
      Math.min(
        POSTS_PER_PAGE,
        allPosts.length
      );

    renderPosts();

    status.textContent =
      allPosts.length
        ? ""
        : "Публикаций пока нет.";

  } catch (error) {

    console.error(
      "Ошибка загрузки:",
      error
    );

    if (!allPosts.length) {
      status.innerHTML =
        `
        <div class="emptyState">
          <strong>Не удалось загрузить публикации</strong>
          <span>Попробуйте обновить страницу.</span>
        </div>
        `;
    }
  }
}

/* =========================================================
   RENDER POSTS
========================================================= */

function renderPosts() {
  const container =
    document.getElementById(
      "posts"
    );

  if (!container) return;

  const posts =
    allPosts.slice(
      0,
      visibleCount
    );

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

  bindPostEvents();
}

/* =========================================================
   POST
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
    escapeHtml(
      post.vk_id ||
      post.id ||
      index
    );

  const liked =
    !!likedPosts[postId];

  return `
    <article
      class="vkPost"
      data-post-id="${postId}"
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
            ${date}
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
          data-post-id="${postId}"
          type="button"
          aria-label="Нравится"
        >
          <span class="likeIcon">
            ${liked ? "♥" : "♡"}
          </span>
          <span>Нравится</span>
        </button>

        <button
          class="postAction"
          data-action="share"
          data-post-id="${postId}"
          type="button"
        >
          ↗ Поделиться
        </button>

        <a
          class="postAction"
          href="${getVkUrl(post)}"
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
   VIDEO
========================================================= */

function getVideo(post) {
  const hasVideo =
    post.video_type === "video" ||
    post.video_type === "clip" ||
    post.video_url ||
    post.video_player ||
    post.video_vk_url ||
    post.video_id;

  if (!hasVideo) {
    return null;
  }

  let preview = null;

  /*
   * Если Worker в будущем начнёт
   * отдавать video_preview — используем его.
   */
  if (post.video_preview) {
    preview =
      post.video_preview;
  }

  /*
   * Некоторые версии API могут
   * отдавать превью отдельно.
   */
  if (
    !preview &&
    post.video_image
  ) {
    preview =
      post.video_image;
  }

  return {
    url:
      post.video_url ||
      null,

    player:
      post.video_player ||
      null,

    vkUrl:
      post.video_vk_url ||
      buildVkVideoUrl(post),

    title:
      post.video_title ||
      "Видео",

    preview,

    processing:
      !post.video_url &&
      !post.video_player
  };
}

function renderVideo(
  video,
  postId
) {
  /*
   * 1. Есть прямой MP4
   */
  if (video.url) {
    return `
      <div class="vkPostMedia vkPostVideo">

        <video
          controls
          playsinline
          preload="metadata"
          src="${escapeAttribute(
            video.url
          )}"
        ></video>

        ${
          video.title
            ? `
              <div class="videoTitle">
                ${escapeHtml(
                  video.title
                )}
              </div>
            `
            : ""
        }

      </div>
    `;
  }

  /*
   * 2. Есть player VK
   */
  if (video.player) {
    return `
      <div class="vkPostMedia vkPostVideo">

        <div class="vkVideoFrame">
          <iframe
            src="${escapeAttribute(
              video.player
            )}"
            loading="lazy"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowfullscreen
            frameborder="0"
          ></iframe>
        </div>

        ${
          video.title
            ? `
              <div class="videoTitle">
                ${escapeHtml(
                  video.title
                )}
              </div>
            `
            : ""
        }

      </div>
    `;
  }

  /*
   * 3. VK не дал прямой поток.
   *
   * Показываем красивую карточку
   * и отправляем пользователя
   * непосредственно на видео VK.
   */
  if (video.vkUrl) {
    return `
      <div
        class="vkPostMedia vkPostVideo videoFallback"
        data-video-url="${escapeAttribute(
          video.vkUrl
        )}"
      >

        <div class="videoFallbackInner">

          <div class="videoPlayCircle">
            ▶
          </div>

          <div class="videoFallbackTitle">
            ${escapeHtml(
              video.title ||
              "Видео"
            )}
          </div>

          <div class="videoFallbackText">
            Видео доступно в VK
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
   * 4. Видео есть, но VK пока
   * не дал URL.
   */
  return `
    <div class="vkPostMedia vkPostVideo">

      <div class="videoFallbackInner">

        <div class="videoPlayCircle">
          ▶
        </div>

        <div class="videoFallbackTitle">
          ${escapeHtml(
            video.title ||
            "Видео"
          )}
        </div>

        <div class="videoFallbackText">
          Видео обрабатывается VK
        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   IMAGES
========================================================= */

function getImages(post) {
  let images = [];

  if (
    Array.isArray(
      post.images
    )
  ) {
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

      if (
        Array.isArray(parsed)
      ) {
        images =
          parsed.filter(Boolean);
      }
    } catch {
      // ignore
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
   * Одна фотография
   */
  if (images.length === 1) {
    return `
      <div class="vkPostMedia">

        <button
          class="vkPostImageButton"
          type="button"
          data-gallery-id="${postId}"
          data-index="0"
        >
          <img
            class="vkPostImage"
            src="${escapeAttribute(
              images[0]
            )}"
            alt=""
            loading="lazy"
          >
        </button>

      </div>
    `;
  }

  /*
   * Несколько фотографий
   */
  return `
    <div
      class="vkPostMedia vkPostGallery"
      data-gallery="${postId}"
    >

      ${images
        .map(
          (image, index) => `
            <button
              class="vkGalleryItem"
              type="button"
              data-gallery-id="${postId}"
              data-index="${index}"
            >
              <img
                src="${escapeAttribute(
                  image
                )}"
                alt=""
                loading="lazy"
              />

              ${
                index === 3 &&
                images.length > 4
                  ? `
                    <span class="galleryMore">
                      +${
                        images.length - 4
                      }
                    </span>
                  `
                  : ""
              }

            </button>
          `
        )
        .slice(0, 4)
        .join("")}

    </div>
  `;
}

/* =========================================================
   EVENTS
========================================================= */

function bindPostEvents() {
  /*
   * Likes
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
            button.dataset
              .postId;

          if (
            likedPosts[id]
          ) {

            delete likedPosts[id];

          } else {

            likedPosts[id] =
              true;
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
   * Share
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
              button.dataset
                .postId
            );

          if (!post) return;

          const url =
            getVkUrl(post);

          const title =
            "National Geographic";

          if (
            navigator.share
          ) {

            try {

              await navigator.share({
                title,
                text:
                  post.text ||
                  title,
                url
              });

              return;

            } catch {
              // пользователь отменил
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
   * Gallery
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
              button.dataset
                .index
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

      visibleCount +=
        POSTS_PER_PAGE;

      visibleCount =
        Math.min(
          visibleCount,
          allPosts.length
        );

      renderPosts();

      setTimeout(() => {

        const posts =
          document.querySelectorAll(
            ".vkPost"
          );

        const target =
          posts[
            Math.max(
              0,
              visibleCount -
                POSTS_PER_PAGE
            )
          ];

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
   MENU
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
   BACK TO TOP
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
      passive:true
    }
  );

  button.addEventListener(
    "click",
    () => {

      window.scrollTo({
        top:0,
        behavior:"smooth"
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

        <div
          class="imageViewerCounter"
        ></div>

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

  if (
    viewerIndex < 0
  ) {
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
  if (
    post.vk_id
  ) {
    return (
      "https://vk.ru/wall" +
      post.vk_id
    );
  }

  if (
    post.id
  ) {
    return (
      VK_GROUP_URL +
      "?w=wall" +
      OWNER_ID +
      "_" +
      post.id
    );
  }

  return VK_GROUP_URL;
}

function buildVkVideoUrl(
  post
) {
  if (
    post.video_vk_url
  ) {
    return post.video_vk_url;
  }

  if (
    post.video_owner_id !==
      undefined &&
    post.video_owner_id !==
      null &&
    post.video_id !==
      undefined &&
    post.video_id !==
      null
  ) {

    let url =
      `https://vk.ru/video${post.video_owner_id}_${post.video_id}`;

    if (
      post.video_access_key
    ) {
      url +=
        `?access_key=${encodeURIComponent(
          post.video_access_key
        )}`;
    }

    return url;
  }

  return null;
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
      day:"numeric",
      month:"long",
      year:"numeric"
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

function escapeAttribute(
  value
) {
  return escapeHtml(
    value
  );
}

function showToast(
  message
) {
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
