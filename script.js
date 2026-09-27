const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const VK_GROUP_URL =
  "https://vk.ru/national.geograph1c";

const POSTS_PER_PAGE = 10;

let allPosts = [];
let currentPage = 1;

const postsContainer = document.getElementById("posts");
const feedStatus = document.getElementById("feedStatus");
const loadMoreWrap = document.getElementById("loadMoreWrap");
const loadMoreButton = document.getElementById("loadMore");
const toast = document.getElementById("toast");

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  loadPosts();

  setupNavigation();
  setupMobileMenu();
  setupBackToTop();
  setupLoadMore();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});

/* =========================
   LOAD POSTS
========================= */

async function loadPosts() {
  showStatus("Загрузка публикаций…");

  try {
    const response = await fetch(API_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Ошибка загрузки API");
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.posts)) {
      throw new Error("Неверный формат данных");
    }

    allPosts = data.posts;

    if (!allPosts.length) {
      showStatus("Публикаций пока нет.");
      return;
    }

    hideStatus();

    currentPage = 1;
    renderPosts();

  } catch (error) {
    console.error(error);

    showStatus(
      "Не удалось загрузить публикации. Попробуйте обновить страницу."
    );
  }
}

/* =========================
   RENDER
========================= */

function renderPosts() {
  const visiblePosts = allPosts.slice(
    0,
    currentPage * POSTS_PER_PAGE
  );

  postsContainer.innerHTML = "";

  visiblePosts.forEach((post) => {
    postsContainer.appendChild(createPost(post));
  });

  if (visiblePosts.length < allPosts.length) {
    loadMoreWrap.style.display = "flex";
    loadMoreButton.disabled = false;
  } else {
    loadMoreWrap.style.display = "none";
  }
}

/* =========================
   CREATE POST
========================= */

function createPost(post) {
  const article = document.createElement("article");

  article.className = "vkPost";

  const postId =
    post.id ||
    post.vk_id ||
    Math.random().toString(36).slice(2);

  article.dataset.postId = postId;

  const date = formatDate(post.post_date);

  const text = post.text || "";

  const imageUrl =
    post.image_url ||
    post.image ||
    post.photo ||
    post.photo_url ||
    post.imageUrl ||
    getAttachmentPhoto(post);

  const videoUrl =
    post.video_url ||
    post.videoUrl ||
    post.video_mp4 ||
    post.video_url_hd ||
    getAttachmentVideo(post);

  article.innerHTML = `
    <div class="vkPostHeader">

      <div class="vkPostIdentity">

        <div class="vkCommunityAvatar">
          NG
        </div>

        <div class="vkPostAuthor">
          <strong>National Geographic</strong>
          <span class="vkPostDate">${escapeHtml(date)}</span>
        </div>

      </div>

      <button
        class="vkPostMenu"
        type="button"
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

      ${renderMedia(imageUrl, videoUrl)}

      <div class="vkPostActions">

        <button
          class="vkAction likeButton"
          type="button"
          data-like-id="${escapeHtml(String(postId))}"
        >
          <span class="heart">♥</span>
          <span>НРАВИТСЯ</span>
        </button>

        <button
          class="vkAction commentButton"
          type="button"
        >
          💬
          <span>КОММЕНТАРИИ</span>
        </button>

        <button
          class="vkAction shareButton"
          type="button"
        >
          ↗
          <span>ПОДЕЛИТЬСЯ</span>
        </button>

      </div>

      <div class="vkPostBottom">

        <span class="vkPostMeta">
          National Geographic
        </span>

        <a
          class="vkOpenPost"
          href="${getVkPostUrl(post)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ОТКРЫТЬ В VK →
        </a>

      </div>

    </div>
  `;

  setupPostButtons(article, post);

  restoreLikeState(article, postId);

  return article;
}

/* =========================
   CLICKABLE LINKS
========================= */

function linkifyText(text) {
  const escaped = escapeHtml(text);

  const urlRegex =
    /((https?:\/\/|www\.)[^\s<]+)/gi;

  return escaped.replace(urlRegex, (url) => {
    let cleanUrl = url;

    let ending = "";

    while (
      /[.,!?;:)\]}>]$/.test(cleanUrl)
    ) {
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

/* =========================
   MEDIA
========================= */

function renderMedia(imageUrl, videoUrl) {
  if (videoUrl) {
    return `
      <video
        class="vkPostVideo"
        controls
        playsinline
        preload="metadata"
      >
        <source src="${escapeAttribute(videoUrl)}">
      </video>
    `;
  }

  if (imageUrl) {
    return `
      <img
        class="vkPostImage"
        src="${escapeAttribute(imageUrl)}"
        alt="National Geographic"
        loading="lazy"
      >
    `;
  }

  return "";
}

/* =========================
   POST BUTTONS
========================= */

function setupPostButtons(article, post) {
  const likeButton =
    article.querySelector(".likeButton");

  const commentButton =
    article.querySelector(".commentButton");

  const shareButton =
    article.querySelector(".shareButton");

  const menuButton =
    article.querySelector(".vkPostMenu");

  const image =
    article.querySelector(".vkPostImage");

  if (likeButton) {
    likeButton.addEventListener("click", () => {
      toggleLike(
        likeButton,
        article.dataset.postId
      );
    });
  }

  if (commentButton) {
    commentButton.addEventListener("click", () => {
      showToast("Комментарии скоро будут доступны");
    });
  }

  if (shareButton) {
    shareButton.addEventListener("click", () => {
      sharePost(post);
    });
  }

  if (menuButton) {
    menuButton.addEventListener("click", () => {
      copyPostText(post.text || "");
    });
  }

  if (image) {
    image.addEventListener("click", () => {
      openImageViewer(image.src);
    });
  }
}

/* =========================
   LIKE
========================= */

function toggleLike(button, postId) {
  const key = `natgeo_like_${postId}`;

  const isLiked =
    localStorage.getItem(key) === "1";

  if (isLiked) {
    localStorage.removeItem(key);
    button.classList.remove("liked");
  } else {
    localStorage.setItem(key, "1");
    button.classList.add("liked");
  }
}

function restoreLikeState(article, postId) {
  const button =
    article.querySelector(".likeButton");

  if (!button) return;

  const key = `natgeo_like_${postId}`;

  if (localStorage.getItem(key) === "1") {
    button.classList.add("liked");
  }
}

/* =========================
   SHARE
========================= */

async function sharePost(post) {
  const url = getVkPostUrl(post);

  if (navigator.share) {
    try {
      await navigator.share({
        title: "National Geographic",
        text: post.text || "National Geographic",
        url
      });

      return;

    } catch {
      return;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    showToast("Ссылка скопирована");
  } catch {
    showToast("Не удалось скопировать ссылку");
  }
}

/* =========================
   COPY
========================= */

async function copyPostText(text) {
  if (!text) {
    showToast("В посте нет текста");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Текст поста скопирован");
  } catch {
    showToast("Не удалось скопировать текст");
  }
}

/* =========================
   VK POST URL
========================= */

function getVkPostUrl(post) {
  if (!post.vk_id) {
    return VK_GROUP_URL;
  }

  const parts = String(post.vk_id).split("_");

  if (parts.length === 2) {
    const ownerId = parts[0];
    const postId = parts[1];

    return `https://vk.com/wall${ownerId}_${postId}`;
  }

  return VK_GROUP_URL;
}

/* =========================
   DATE
========================= */

function formatDate(timestamp) {
  if (!timestamp) {
    return "";
  }

  const date =
    new Date(Number(timestamp) * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

/* =========================
   ATTACHMENTS
========================= */

function getAttachmentPhoto(post) {
  const attachments =
    post.attachments ||
    post.attachment ||
    [];

  if (!Array.isArray(attachments)) {
    return null;
  }

  for (const attachment of attachments) {
    if (
      attachment.type === "photo" &&
      attachment.photo
    ) {
      const photo = attachment.photo;

      return (
        photo.orig_photo?.url ||
        photo.sizes?.at(-1)?.url ||
        photo.url ||
        null
      );
    }
  }

  return null;
}

function getAttachmentVideo(post) {
  const attachments =
    post.attachments ||
    post.attachment ||
    [];

  if (!Array.isArray(attachments)) {
    return null;
  }

  for (const attachment of attachments) {
    if (
      attachment.type === "video" &&
      attachment.video
    ) {
      return (
        attachment.video.player ||
        attachment.video.url ||
        null
      );
    }
  }

  return null;
}

/* =========================
   LOAD MORE
========================= */

function setupLoadMore() {
  if (!loadMoreButton) return;

  loadMoreButton.addEventListener("click", () => {
    currentPage++;
    renderPosts();
  });
}

/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
  document
    .querySelectorAll('a[href^="#"]')
    .forEach((link) => {
      link.addEventListener("click", () => {
        const targetId =
          link.getAttribute("href");

        if (!targetId || targetId === "#") {
          return;
        }

        const target =
          document.querySelector(targetId);

        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      });
    });
}

/* =========================
   MOBILE MENU
========================= */

function setupMobileMenu() {
  const button =
    document.querySelector(".mobileMenuButton");

  const menu =
    document.getElementById("mobileMenu");

  if (!button || !menu) return;

  button.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
    });
  });
}

/* =========================
   BACK TO TOP
========================= */

function setupBackToTop() {
  const button =
    document.getElementById("backToTop");

  if (!button) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 500) {
      button.classList.add("visible");
    } else {
      button.classList.remove("visible");
    }
  });

  button.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

/* =========================
   IMAGE VIEWER
========================= */

function openImageViewer(src) {
  let viewer =
    document.querySelector(".imageViewer");

  if (!viewer) {
    viewer = document.createElement("div");

    viewer.className = "imageViewer";

    viewer.innerHTML = `
      <button
        class="imageViewerClose"
        type="button"
      >
        ×
      </button>

      <img
        src=""
        alt=""
      >
    `;

    document.body.appendChild(viewer);

    viewer
      .querySelector(".imageViewerClose")
      .addEventListener("click", () => {
        viewer.classList.remove("open");
      });

    viewer.addEventListener("click", (event) => {
      if (event.target === viewer) {
        viewer.classList.remove("open");
      }
    });
  }

  viewer.querySelector("img").src = src;

  viewer.classList.add("open");
}

/* =========================
   STATUS
========================= */

function showStatus(message) {
  if (!feedStatus) return;

  feedStatus.innerHTML = `
    <div>${escapeHtml(message)}</div>
  `;

  feedStatus.classList.remove("hidden");
}

function hideStatus() {
  if (!feedStatus) return;

  feedStatus.classList.add("hidden");
}

/* =========================
   TOAST
========================= */

let toastTimer;

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

/* =========================
   AUTO REFRESH
========================= */

setInterval(() => {
  loadPosts();
}, 5 * 60 * 1000);
