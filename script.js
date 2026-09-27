const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const VK_GROUP_URL = "https://vk.ru/national.geograph1c";
const POSTS_PER_PAGE = 10;

let allPosts = [];
let visibleCount = POSTS_PER_PAGE;
let currentGallery = [];
let currentGalleryIndex = 0;

const postsContainer = document.getElementById("posts");
const feedStatus = document.getElementById("feedStatus");
const loadMoreWrap = document.getElementById("loadMoreWrap");
const loadMoreButton = document.getElementById("loadMore");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupNavigation();
  setupMobileMenu();
  setupBackToTop();
  setupGlobalClicks();

  await loadPosts();

  registerServiceWorker();

  setInterval(() => {
    loadPosts(true);
  }, 5 * 60 * 1000);
}

/* =========================
   POSTS
========================= */

async function loadPosts(silent = false) {
  if (!silent) {
    setStatus("Загружаем публикации…");
  }

  try {
    const response = await fetch(`${API_URL}?_=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.posts)) {
      throw new Error("Некорректный ответ API");
    }

    allPosts = data.posts;

    if (!silent) {
      visibleCount = POSTS_PER_PAGE;
    }

    renderPosts();

    setStatus(
      allPosts.length
        ? `Показано публикаций: ${Math.min(
            visibleCount,
            allPosts.length
          )} из ${allPosts.length}`
        : "Публикаций пока нет"
    );
  } catch (error) {
    console.error("Ошибка загрузки:", error);

    if (!allPosts.length) {
      setStatus("Не удалось загрузить публикации");
      postsContainer.innerHTML = `
        <div class="vkPostPlaceholder">
          Не удалось загрузить ленту. Попробуйте обновить страницу.
        </div>
      `;
    }
  }
}

function renderPosts() {
  if (!postsContainer) return;

  const posts = allPosts.slice(0, visibleCount);

  if (!posts.length) {
    postsContainer.innerHTML = `
      <div class="vkPostPlaceholder">
        Публикаций пока нет.
      </div>
    `;
    updateLoadMore();
    return;
  }

  postsContainer.innerHTML = posts.map(renderPost).join("");

  updateLoadMore();
}

function renderPost(post) {
  const postId = getPostId(post);

  const text = post.text || "";

  const images = getPostImages(post);
  const videoUrl = getVideoUrl(post);

  const date = formatDate(post.post_date);

  const liked = localStorage.getItem(`natgeo_like_${postId}`) === "1";

  return `
    <article class="vkPost" data-post-id="${escapeHtml(String(postId))}">

      <div class="vkPostHeader">

        <div class="vkPostIdentity">

          <div class="vkCommunityAvatar">
            <span>NG</span>
          </div>

          <div>
            <div class="vkPostAuthor">
              National Geographic
            </div>

            <div class="vkPostDate">
              ${date}
            </div>
          </div>

        </div>

        <button
          class="vkPostMenu"
          type="button"
          data-action="menu"
          data-post-id="${escapeHtml(String(postId))}"
          aria-label="Меню"
        >
          ⋯
        </button>

      </div>

      <div class="vkPostContent">

        ${
          text
            ? `<div class="vkPostText">${linkifyText(text)}</div>`
            : ""
        }

        ${renderMedia(images, videoUrl, postId)}

      </div>

      <div class="vkPostActions">

        <button
          class="vkAction likeButton ${liked ? "liked" : ""}"
          type="button"
          data-action="like"
          data-post-id="${escapeHtml(String(postId))}"
        >
          <span class="heart">♥</span>
          <span>Нравится</span>
        </button>

        <button
          class="vkAction"
          type="button"
          data-action="comments"
          data-post-id="${escapeHtml(String(postId))}"
        >
          <span>💬</span>
          <span>Комментарии</span>
        </button>

        <button
          class="vkAction"
          type="button"
          data-action="share"
          data-post-id="${escapeHtml(String(postId))}"
        >
          <span>↗</span>
          <span>Поделиться</span>
        </button>

      </div>

      <div class="vkPostBottom">

        <button
          class="vkOpenPost"
          type="button"
          data-action="open-vk"
          data-post-id="${escapeHtml(String(postId))}"
        >
          Открыть во ВКонтакте →
        </button>

      </div>

    </article>
  `;
}

/* =========================
   MEDIA
========================= */

function getPostImages(post) {
  let images = [];

  if (Array.isArray(post.images)) {
    images = post.images;
  }

  if (!images.length && post.images_json) {
    try {
      const parsed = JSON.parse(post.images_json);

      if (Array.isArray(parsed)) {
        images = parsed;
      }
    } catch (error) {
      console.warn("Не удалось разобрать images_json");
    }
  }

  if (!images.length) {
    const fallback =
      post.image_url ||
      post.image ||
      post.photo ||
      post.photo_url ||
      post.imageUrl;

    if (fallback) {
      images = [fallback];
    }
  }

  return [...new Set(
    images
      .filter(Boolean)
      .map((image) => String(image).trim())
      .filter(Boolean)
  )];
}

function renderMedia(images, videoUrl, postId) {
  if (images.length) {
    return renderGallery(images, postId);
  }

  if (videoUrl) {
    return `
      <div class="vkPostVideo">
        <video
          controls
          preload="metadata"
          src="${escapeHtml(videoUrl)}"
        ></video>
      </div>
    `;
  }

  return "";
}

function renderGallery(images, postId) {
  if (images.length === 1) {
    return `
      <div class="vkPostMedia">
        <button
          class="vkPostImageButton"
          type="button"
          data-action="image"
          data-gallery-id="${escapeHtml(String(postId))}"
          data-index="0"
        >
          <img
            class="vkPostImage"
            src="${escapeHtml(images[0])}"
            alt="National Geographic"
            loading="lazy"
          >
        </button>
      </div>
    `;
  }

  const visibleImages = images.slice(0, 4);
  const remaining = images.length - 4;

  return `
    <div
      class="vkPostGallery gallery-${Math.min(images.length, 4)}"
      data-gallery-id="${escapeHtml(String(postId))}"
    >

      ${visibleImages
        .map((image, index) => {
          const isLast = index === 3 && remaining > 0;

          return `
            <button
              class="vkGalleryItem"
              type="button"
              data-action="image"
              data-gallery-id="${escapeHtml(String(postId))}"
              data-index="${index}"
            >
              <img
                src="${escapeHtml(image)}"
                alt="National Geographic"
                loading="lazy"
              >

              ${
                isLast
                  ? `<span class="galleryMore">+${remaining}</span>`
                  : ""
              }

            </button>
          `;
        })
        .join("")}

    </div>
  `;
}

function getVideoUrl(post) {
  return (
    post.video_url ||
    post.video ||
    post.videoUrl ||
    ""
  );
}

/* =========================
   IMAGE VIEWER
========================= */

function openGallery(postId, index = 0) {
  const post = allPosts.find(
    (item) => String(getPostId(item)) === String(postId)
  );

  if (!post) return;

  currentGallery = getPostImages(post);

  if (!currentGallery.length) return;

  currentGalleryIndex = Math.max(
    0,
    Math.min(index, currentGallery.length - 1)
  );

  createImageViewer();
  updateImageViewer();

  document.body.classList.add("viewer-open");
}

function createImageViewer() {
  let viewer = document.getElementById("imageViewer");

  if (viewer) return;

  viewer = document.createElement("div");
  viewer.id = "imageViewer";
  viewer.className = "imageViewer";

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
      aria-label="Предыдущее фото"
    >
      ‹
    </button>

    <div class="imageViewerContent">
      <img class="imageViewerImage" alt="National Geographic">
      <div class="imageViewerCounter"></div>
    </div>

    <button
      class="imageViewerNext"
      type="button"
      aria-label="Следующее фото"
    >
      ›
    </button>
  `;

  document.body.appendChild(viewer);

  viewer
    .querySelector(".imageViewerClose")
    .addEventListener("click", closeGallery);

  viewer
    .querySelector(".imageViewerPrev")
    .addEventListener("click", previousImage);

  viewer
    .querySelector(".imageViewerNext")
    .addEventListener("click", nextImage);

  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) {
      closeGallery();
    }
  });
}

function updateImageViewer() {
  const viewer = document.getElementById("imageViewer");

  if (!viewer || !currentGallery.length) return;

  const image = viewer.querySelector(".imageViewerImage");
  const counter = viewer.querySelector(".imageViewerCounter");
  const prev = viewer.querySelector(".imageViewerPrev");
  const next = viewer.querySelector(".imageViewerNext");

  image.src = currentGallery[currentGalleryIndex];

  counter.textContent =
    currentGallery.length > 1
      ? `${currentGalleryIndex + 1} / ${currentGallery.length}`
      : "";

  prev.style.display =
    currentGallery.length > 1 ? "flex" : "none";

  next.style.display =
    currentGallery.length > 1 ? "flex" : "none";

  viewer.classList.add("open");
}

function closeGallery() {
  const viewer = document.getElementById("imageViewer");

  if (viewer) {
    viewer.classList.remove("open");
  }

  document.body.classList.remove("viewer-open");
}

function nextImage() {
  if (currentGallery.length < 2) return;

  currentGalleryIndex =
    (currentGalleryIndex + 1) % currentGallery.length;

  updateImageViewer();
}

function previousImage() {
  if (currentGallery.length < 2) return;

  currentGalleryIndex =
    (currentGalleryIndex - 1 + currentGallery.length) %
    currentGallery.length;

  updateImageViewer();
}

/* =========================
   CLICKS
========================= */

function setupGlobalClicks() {
  document.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");

    if (!target) return;

    const action = target.dataset.action;
    const postId = target.dataset.postId;

    if (action === "like") {
      toggleLike(postId, target);
      return;
    }

    if (action === "comments") {
      showToast("Комментарии скоро будут доступны");
      return;
    }

    if (action === "share") {
      sharePost(postId);
      return;
    }

    if (action === "open-vk") {
      openVKPost(postId);
      return;
    }

    if (action === "menu") {
      copyPostText(postId);
      return;
    }

    if (action === "image") {
      const index = Number(target.dataset.index || 0);
      openGallery(target.dataset.galleryId, index);
    }
  });

  document.addEventListener("keydown", (event) => {
    const viewer = document.getElementById("imageViewer");

    if (!viewer || !viewer.classList.contains("open")) {
      return;
    }

    if (event.key === "Escape") {
      closeGallery();
    }

    if (event.key === "ArrowRight") {
      nextImage();
    }

    if (event.key === "ArrowLeft") {
      previousImage();
    }
  });

  setupSwipe();
}

/* =========================
   LIKE
========================= */

function toggleLike(postId, button) {
  const key = `natgeo_like_${postId}`;
  const liked = localStorage.getItem(key) === "1";

  if (liked) {
    localStorage.removeItem(key);
    button.classList.remove("liked");
  } else {
    localStorage.setItem(key, "1");
    button.classList.add("liked");
  }
}

/* =========================
   SHARE
========================= */

async function sharePost(postId) {
  const post = allPosts.find(
    (item) => String(getPostId(item)) === String(postId)
  );

  if (!post) return;

  const text = post.text || "National Geographic";

  const shareData = {
    title: "National Geographic",
    text,
    url: getVKPostUrl(post),
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(
      `${text}\n\n${shareData.url}`
    );

    showToast("Ссылка скопирована");
  } catch (error) {
    console.log("Share cancelled");
  }
}

/* =========================
   VK
========================= */

function getVKPostUrl(post) {
  if (post.vk_url) {
    return post.vk_url;
  }

  const vkId = post.vk_id || "";

  const match = String(vkId).match(/^(-?\d+)_(\d+)$/);

  if (match) {
    return `https://vk.ru/wall${match[1]}_${match[2]}`;
  }

  return VK_GROUP_URL;
}

function openVKPost(postId) {
  const post = allPosts.find(
    (item) => String(getPostId(item)) === String(postId)
  );

  if (!post) return;

  window.open(
    getVKPostUrl(post),
    "_blank",
    "noopener,noreferrer"
  );
}

/* =========================
   MENU
========================= */

function setupMobileMenu() {
  const menuButton = document.getElementById("menuButton");
  const mobileMenu = document.getElementById("mobileMenu");

  if (!menuButton || !mobileMenu) return;

  menuButton.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
    menuButton.classList.toggle("active");
  });

  mobileMenu.addEventListener("click", () => {
    mobileMenu.classList.remove("open");
    menuButton.classList.remove("active");
  });
}

/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");

      if (!id || id === "#") return;

      const element = document.querySelector(id);

      if (!element) return;

      event.preventDefault();

      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}

/* =========================
   LOAD MORE
========================= */

function updateLoadMore() {
  if (!loadMoreWrap || !loadMoreButton) return;

  if (visibleCount >= allPosts.length) {
    loadMoreWrap.style.display = "none";
    return;
  }

  loadMoreWrap.style.display = "flex";
}

if (loadMoreButton) {
  loadMoreButton.addEventListener("click", () => {
    visibleCount += POSTS_PER_PAGE;
    renderPosts();

    setStatus(
      `Показано публикаций: ${Math.min(
        visibleCount,
        allPosts.length
      )} из ${allPosts.length}`
    );
  });
}

/* =========================
   BACK TO TOP
========================= */

function setupBackToTop() {
  const button = document.getElementById("backToTop");

  if (!button) return;

  window.addEventListener("scroll", () => {
    button.classList.toggle(
      "show",
      window.scrollY > 500
    );
  });

  button.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

/* =========================
   SWIPE
========================= */

function setupSwipe() {
  let startX = 0;

  document.addEventListener("touchstart", (event) => {
    const viewer = document.getElementById("imageViewer");

    if (
      !viewer ||
      !viewer.classList.contains("open") ||
      !event.touches.length
    ) {
      return;
    }

    startX = event.touches[0].clientX;
  });

  document.addEventListener("touchend", (event) => {
    const viewer = document.getElementById("imageViewer");

    if (
      !viewer ||
      !viewer.classList.contains("open") ||
      !event.changedTouches.length
    ) {
      return;
    }

    const endX = event.changedTouches[0].clientX;
    const diff = endX - startX;

    if (Math.abs(diff) < 50) return;

    if (diff < 0) {
      nextImage();
    } else {
      previousImage();
    }
  });
}

/* =========================
   HELPERS
========================= */

function getPostId(post) {
  return post.id || post.vk_id || Math.random();
}

function formatDate(timestamp) {
  if (!timestamp) return "";

  const date = new Date(Number(timestamp) * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function linkifyText(text) {
  const escaped = escapeHtml(text);

  const urlRegex =
    /((https?:\/\/|www\.)[^\s<]+)/gi;

  return escaped.replace(urlRegex, (url) => {
    let cleanUrl = url;
    let ending = "";

    while (/[.,!?;:)\]}>]$/.test(cleanUrl)) {
      ending =
        cleanUrl.slice(-1) + ending;

      cleanUrl =
        cleanUrl.slice(0, -1);
    }

    const href = cleanUrl.startsWith("www.")
      ? `https://${cleanUrl}`
      : cleanUrl;

    return `
      <a
        href="${href}"
        target="_blank"
        rel="noopener noreferrer"
        class="postLink"
      >${cleanUrl}</a>${ending}
    `;
  });
}

function setStatus(text) {
  if (feedStatus) {
    feedStatus.textContent = text;
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

async function copyPostText(postId) {
  const post = allPosts.find(
    (item) => String(getPostId(item)) === String(postId)
  );

  if (!post) return;

  const text = post.text || "";

  try {
    await navigator.clipboard.writeText(text);
    showToast("Текст публикации скопирован");
  } catch {
    showToast("Не удалось скопировать текст");
  }
}

/* =========================
   SERVICE WORKER
========================= */

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((error) => {
        console.warn(
          "Service Worker:",
          error
        );
      });
  });
}
