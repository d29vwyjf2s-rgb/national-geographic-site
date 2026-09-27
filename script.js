const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const VK_GROUP_URL =
  "https://vk.ru/national.geograph1c";

const POSTS_PER_PAGE = 10;

let allPosts = [];
let currentPage = 1;

let currentGallery = [];
let currentGalleryIndex = 0;


// ======================================================
// START
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

  loadPosts();

  setupMenu();
  setupNavigation();
  setupBackToTop();
  setupViewer();

  const loadMore =
    document.getElementById("loadMore");

  if (loadMore) {
    loadMore.addEventListener(
      "click",
      () => {
        currentPage++;
        renderPosts();
      }
    );
  }

  // Обновление ленты каждые 5 минут
  setInterval(() => {
    loadPosts(true);
  }, 300000);

  // PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .catch(error => {
        console.warn(
          "Service Worker:",
          error
        );
      });
  }
});


// ======================================================
// LOAD POSTS
// ======================================================

async function loadPosts(silent = false) {

  const status =
    document.getElementById("feedStatus");

  const container =
    document.getElementById("posts");

  if (!silent && status) {
    status.textContent =
      "Загружаем публикации…";
  }

  try {

    const response = await fetch(
      API_URL + "?t=" + Date.now(),
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Accept": "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        "HTTP " + response.status
      );
    }

    const data =
      await response.json();

    if (!data || data.success !== true) {
      throw new Error(
        data?.error ||
        "API вернул ошибку"
      );
    }

    allPosts =
      Array.isArray(data.posts)
        ? data.posts
        : [];

    currentPage = 1;

    renderPosts();

    if (status) {
      status.textContent =
        allPosts.length
          ? `Публикаций: ${allPosts.length}`
          : "Публикаций пока нет";
    }

  } catch (error) {

    console.error(
      "Ошибка загрузки ленты:",
      error
    );

    if (!silent && status) {
      status.textContent =
        "Не удалось загрузить ленту. Попробуйте обновить страницу.";
    }

    if (
      container &&
      !allPosts.length
    ) {
      container.innerHTML = `
        <div class="emptyState">
          <div class="emptyStateTitle">
            Не удалось загрузить ленту
          </div>

          <div class="emptyStateText">
            Попробуйте обновить страницу.
          </div>
        </div>
      `;
    }
  }
}


// ======================================================
// RENDER POSTS
// ======================================================

function renderPosts() {

  const container =
    document.getElementById("posts");

  const loadMoreWrap =
    document.getElementById("loadMoreWrap");

  if (!container) {
    return;
  }

  const limit =
    currentPage * POSTS_PER_PAGE;

  const visiblePosts =
    allPosts.slice(0, limit);

  if (!visiblePosts.length) {
    container.innerHTML = "";
  } else {
    container.innerHTML =
      visiblePosts
        .map(renderPost)
        .join("");
  }

  setupPostEvents();

  if (loadMoreWrap) {
    loadMoreWrap.style.display =
      limit < allPosts.length
        ? "flex"
        : "none";
  }
}


// ======================================================
// POST
// ======================================================

function renderPost(post) {

  const postId =
    post.id ||
    post.vk_id ||
    "";

  const text =
    post.text || "";

  const images =
    getImages(post);

  const video =
    getVideo(post);

  const date =
    formatDate(post.post_date);

  const liked =
    getLike(postId);

  const vkUrl =
    getVkUrl(post);

  let media = "";

  if (images.length) {
    media +=
      renderGallery(
        images,
        postId
      );
  }

  if (video) {
    media +=
      renderVideo(video);
  }

  return `
    <article
      class="vkPost"
      data-post-id="${esc(postId)}"
    >

      <div class="vkPostHeader">

        <div class="vkPostAvatar">
          <span>NG</span>
        </div>

        <div class="vkPostMeta">

          <div class="vkPostAuthor">
            National Geographic
          </div>

          <div class="vkPostDate">
            ${esc(date)}
          </div>

        </div>

      </div>

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
        media
          ? `
            <div class="vkPostMedia">
              ${media}
            </div>
          `
          : ""
      }

      <div class="vkPostActions">

        <button
          class="postAction likeButton ${liked ? "liked" : ""}"
          type="button"
          data-action="like"
          data-id="${esc(postId)}"
        >
          <span class="actionIcon">
            ${liked ? "♥" : "♡"}
          </span>

          <span>Нравится</span>
        </button>

        <button
          class="postAction"
          type="button"
          data-action="comment"
          data-url="${esc(vkUrl)}"
        >
          <span class="actionIcon">💬</span>
          <span>Комментарии</span>
        </button>

        <button
          class="postAction"
          type="button"
          data-action="share"
          data-url="${esc(vkUrl)}"
        >
          <span class="actionIcon">↗</span>
          <span>Поделиться</span>
        </button>

        <button
          class="postAction"
          type="button"
          data-action="copy"
          data-id="${esc(postId)}"
        >
          <span class="actionIcon">⋯</span>
        </button>

      </div>

      <a
        class="vkPostSource"
        href="${esc(vkUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>VK</span>
        <span>Открыть публикацию</span>
      </a>

    </article>
  `;
}


// ======================================================
// IMAGES
// ======================================================

function getImages(post) {

  let images = [];

  if (Array.isArray(post.images)) {
    images = post.images;
  }

  if (
    !images.length &&
    post.images_json
  ) {
    try {
      const parsed =
        JSON.parse(post.images_json);

      if (Array.isArray(parsed)) {
        images = parsed;
      }
    } catch {}
  }

  if (
    !images.length &&
    post.image_url
  ) {
    images = [
      post.image_url
    ];
  }

  return images
    .filter(Boolean)
    .filter(
      (url, index, array) =>
        array.indexOf(url) === index
    );
}


// ======================================================
// VIDEO
// ======================================================

function getVideo(post) {

  const direct =
    post.video_url ||
    null;

  const player =
    post.video_player ||
    null;

  if (!direct && !player) {
    return null;
  }

  return {
    direct,
    player,
    title:
      post.video_title ||
      "Видео"
  };
}


// ======================================================
// GALLERY
// ======================================================

function renderGallery(
  images,
  postId
) {

  if (!images.length) {
    return "";
  }

  if (images.length === 1) {

    return `
      <div class="vkPostGallery gallerySingle">

        <button
          class="vkPostImageButton"
          type="button"
          data-gallery="${esc(postId)}"
          data-index="0"
        >

          <img
            class="vkPostImage"
            src="${esc(images[0])}"
            alt="National Geographic"
            loading="lazy"
          >

        </button>

      </div>
    `;
  }

  const visible =
    images.slice(0, 4);

  const more =
    images.length - 4;

  return `
    <div
      class="vkPostGallery ${
        images.length === 2
          ? "galleryTwo"
          : images.length === 3
            ? "galleryThree"
            : "galleryFour"
      }"
    >

      ${visible.map(
        (image, index) => `
          <button
            class="vkPostImageButton galleryItem"
            type="button"
            data-gallery="${esc(postId)}"
            data-index="${index}"
          >

            <img
              class="vkPostImage"
              src="${esc(image)}"
              alt="National Geographic"
              loading="lazy"
            >

            ${
              index === 3 &&
              more > 0
                ? `
                  <span class="galleryMore">
                    +${more}
                  </span>
                `
                : ""
            }

          </button>
        `
      ).join("")}

    </div>
  `;
}


// ======================================================
// VIDEO
// ======================================================

function renderVideo(video) {

  // Прямой MP4
  if (video.direct) {

    return `
      <div class="vkPostVideo">

        <video
          controls
          playsinline
          preload="metadata"
          src="${esc(video.direct)}"
        ></video>

        <div class="videoTitle">
          ${esc(video.title)}
        </div>

      </div>
    `;
  }

  // VK Player
  if (video.player) {

    return `
      <div class="vkPostVideo">

        <div class="vkVideoFrame">

          <iframe
            src="${esc(video.player)}"
            title="${esc(video.title)}"
            loading="lazy"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>

        </div>

        <a
          class="videoFallback"
          href="${esc(video.player)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ▶ Открыть видео VK
        </a>

      </div>
    `;
  }

  return "";
}


// ======================================================
// EVENTS
// ======================================================

function setupPostEvents() {

  document
    .querySelectorAll(
      ".vkPostImageButton"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const postId =
            button.dataset.gallery;

          const index =
            Number(
              button.dataset.index
            );

          const post =
            allPosts.find(item =>
              String(
                item.id ||
                item.vk_id
              ) ===
              String(postId)
            );

          if (!post) {
            return;
          }

          openViewer(
            getImages(post),
            index
          );
        }
      );
    });


  document
    .querySelectorAll(
      ".postAction"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const action =
            button.dataset.action;

          if (action === "like") {
            toggleLike(
              button.dataset.id,
              button
            );
          }

          if (action === "comment") {
            window.open(
              button.dataset.url,
              "_blank",
              "noopener,noreferrer"
            );
          }

          if (action === "share") {
            share(
              button.dataset.url
            );
          }

          if (action === "copy") {

            const post =
              allPosts.find(item =>
                String(
                  item.id ||
                  item.vk_id
                ) ===
                String(
                  button.dataset.id
                )
              );

            if (post) {
              copyText(
                post.text || ""
              );
            }
          }
        }
      );
    });
}


// ======================================================
// LIKE
// ======================================================

function getLike(id) {

  try {
    return localStorage.getItem(
      "natgeo_like_" + id
    ) === "1";
  } catch {
    return false;
  }
}


function toggleLike(
  id,
  button
) {

  const liked =
    !getLike(id);

  try {

    localStorage.setItem(
      "natgeo_like_" + id,
      liked ? "1" : "0"
    );

  } catch {}

  button.classList.toggle(
    "liked",
    liked
  );

  const icon =
    button.querySelector(
      ".actionIcon"
    );

  if (icon) {
    icon.textContent =
      liked ? "♥" : "♡";
  }
}


// ======================================================
// SHARE
// ======================================================

async function share(url) {

  try {

    if (navigator.share) {

      await navigator.share({
        title:
          "National Geographic",
        text:
          "National Geographic",
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

  } catch {

    showToast(
      "Не удалось поделиться"
    );
  }
}


async function copyText(text) {

  if (!text) {

    showToast(
      "В публикации нет текста"
    );

    return;
  }

  try {

    await navigator.clipboard.writeText(
      text
    );

    showToast(
      "Текст скопирован"
    );

  } catch {

    showToast(
      "Не удалось скопировать"
    );
  }
}


// ======================================================
// VIEWER
// ======================================================

function setupViewer() {

  const viewer =
    document.getElementById(
      "imageViewer"
    );

  if (!viewer) {
    createViewer();
  }

  const element =
    document.getElementById(
      "imageViewer"
    );

  if (!element) {
    return;
  }

  const close =
    element.querySelector(
      ".imageViewerClose"
    );

  const prev =
    element.querySelector(
      ".imageViewerPrev"
    );

  const next =
    element.querySelector(
      ".imageViewerNext"
    );

  if (close) {
    close.onclick =
      closeViewer;
  }

  if (prev) {
    prev.onclick =
      () => changeViewer(-1);
  }

  if (next) {
    next.onclick =
      () => changeViewer(1);
  }

  element.addEventListener(
    "click",
    event => {

      if (
        event.target === element
      ) {
        closeViewer();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {

      if (
        !element.classList.contains(
          "open"
        )
      ) {
        return;
      }

      if (event.key === "Escape") {
        closeViewer();
      }

      if (event.key === "ArrowLeft") {
        changeViewer(-1);
      }

      if (event.key === "ArrowRight") {
        changeViewer(1);
      }
    }
  );
}


function createViewer() {

  const viewer =
    document.createElement(
      "div"
    );

  viewer.id =
    "imageViewer";

  viewer.className =
    "imageViewer";

  viewer.innerHTML = `
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
      aria-label="Предыдущее"
    >
      ‹
    </button>

    <div class="imageViewerContent">

      <img
        class="imageViewerImage"
        alt="National Geographic"
      >

      <div class="imageViewerCounter"></div>

    </div>

    <button
      class="imageViewerNext"
      type="button"
      aria-label="Следующее"
    >
      ›
    </button>
  `;

  document.body.appendChild(
    viewer
  );
}


function openViewer(
  images,
  index
) {

  if (!images.length) {
    return;
  }

  currentGallery =
    images;

  currentGalleryIndex =
    index;

  const viewer =
    document.getElementById(
      "imageViewer"
    );

  if (!viewer) {
    return;
  }

  updateViewer();

  viewer.classList.add(
    "open"
  );

  document.body.style.overflow =
    "hidden";
}


function updateViewer() {

  const viewer =
    document.getElementById(
      "imageViewer"
    );

  if (!viewer) {
    return;
  }

  const image =
    viewer.querySelector(
      ".imageViewerImage"
    );

  const counter =
    viewer.querySelector(
      ".imageViewerCounter"
    );

  if (image) {
    image.src =
      currentGallery[
        currentGalleryIndex
      ];
  }

  if (counter) {

    counter.textContent =
      `${currentGalleryIndex + 1} / ${currentGallery.length}`;
  }
}


function changeViewer(
  direction
) {

  if (!currentGallery.length) {
    return;
  }

  currentGalleryIndex +=
    direction;

  if (
    currentGalleryIndex < 0
  ) {
    currentGalleryIndex =
      currentGallery.length - 1;
  }

  if (
    currentGalleryIndex >=
    currentGallery.length
  ) {
    currentGalleryIndex = 0;
  }

  updateViewer();
}


function closeViewer() {

  const viewer =
    document.getElementById(
      "imageViewer"
    );

  if (!viewer) {
    return;
  }

  viewer.classList.remove(
    "open"
  );

  document.body.style.overflow =
    "";

  currentGallery = [];
  currentGalleryIndex = 0;
}


// ======================================================
// MENU
// ======================================================

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

      document.body.classList.toggle(
        "menu-open"
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

          document.body.classList.remove(
            "menu-open"
          );
        }
      );
    });
}


// ======================================================
// NAVIGATION
// ======================================================

function setupNavigation() {

  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach(link => {

      link.addEventListener(
        "click",
        event => {

          const id =
            link.getAttribute(
              "href"
            );

          if (
            !id ||
            id === "#"
          ) {
            return;
          }

          const target =
            document.querySelector(
              id
            );

          if (!target) {
            return;
          }

          event.preventDefault();

          target.scrollIntoView({
            behavior: "smooth"
          });
        }
      );
    });
}


// ======================================================
// BACK TO TOP
// ======================================================

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


// ======================================================
// TOAST
// ======================================================

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
    toast._timer
  );

  toast._timer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 2500);
}


// ======================================================
// LINKIFY
// ======================================================

function linkify(text) {

  const escaped =
    esc(text);

  return escaped
    .replace(
      /(https?:\/\/[^\s<]+)/gi,
      url => {

        const clean =
          url.replace(
            /[.,!?;:]+$/,
            ""
          );

        const ending =
          url.substring(
            clean.length
          );

        return `
          <a
            class="postLink"
            href="${esc(clean)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${clean}
          </a>${ending}
        `;
      }
    )
    .replace(
      /\n/g,
      "<br>"
    );
}


// ======================================================
// VK URL
// ======================================================

function getVkUrl(post) {

  if (post.vk_id) {

    return (
      "https://vk.ru/wall" +
      String(post.vk_id)
        .replace(
          "_",
          "_"
        )
    );
  }

  return VK_GROUP_URL;
}


// ======================================================
// DATE
// ======================================================

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


// ======================================================
// ESCAPE
// ======================================================

function esc(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


// ======================================================
// GLOBAL ERROR
// ======================================================

window.addEventListener(
  "error",
  event => {

    console.error(
      "National Geographic:",
      event.error ||
      event.message
    );
  }
);
