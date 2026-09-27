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
// INIT
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

  loadPosts();

  setupNavigation();
  setupMobileMenu();
  setupBackToTop();
  setupViewer();

  // Автоматическое обновление каждые 5 минут
  setInterval(() => {
    loadPosts(true);
  }, 5 * 60 * 1000);

  // Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});


// ======================================================
// LOAD POSTS
// ======================================================

async function loadPosts(silent = false) {

  const postsContainer =
    document.getElementById("posts");

  const status =
    document.getElementById("feedStatus");

  if (!silent && status) {
    status.textContent = "Загрузка публикаций...";
  }

  try {

    const response = await fetch(
      API_URL + "?t=" + Date.now(),
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "HTTP " + response.status
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.error || "Ошибка API"
      );
    }

    allPosts = Array.isArray(data.posts)
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
      "Ошибка загрузки постов:",
      error
    );

    if (!silent && status) {
      status.textContent =
        "Не удалось загрузить публикации";
    }

    if (
      !allPosts.length &&
      postsContainer
    ) {
      postsContainer.innerHTML = `
        <div class="emptyState">
          <div class="emptyStateTitle">
            Не удалось загрузить публикации
          </div>
          <div class="emptyStateText">
            Проверьте соединение и попробуйте ещё раз.
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

  const visibleCount =
    currentPage * POSTS_PER_PAGE;

  const posts =
    allPosts.slice(0, visibleCount);

  container.innerHTML =
    posts.map(post => renderPost(post)).join("");

  setupPostEvents();

  if (loadMoreWrap) {
    loadMoreWrap.style.display =
      visibleCount < allPosts.length
        ? "flex"
        : "none";
  }
}


// ======================================================
// RENDER POST
// ======================================================

function renderPost(post) {

  const id =
    post.id ||
    post.vk_id ||
    Math.random();

  const text =
    post.text || "";

  const date =
    formatDate(post.post_date);

  const images =
    getPostImages(post);

  const video =
    getPostVideo(post);

  const liked =
    getLikeState(id);

  const vkPostUrl =
    getVkPostUrl(post);

  let mediaHtml = "";

  // Фото
  if (images.length) {
    mediaHtml +=
      renderGallery(images, id);
  }

  // Видео
  if (video) {
    mediaHtml +=
      renderVideo(video, id);
  }

  return `
    <article
      class="vkPost"
      data-post-id="${escapeAttribute(id)}"
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
            ${escapeHtml(date)}
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
        mediaHtml
          ? `
            <div class="vkPostMedia">
              ${mediaHtml}
            </div>
          `
          : ""
      }

      <div class="vkPostActions">

        <button
          class="postAction likeButton ${liked ? "liked" : ""}"
          type="button"
          data-action="like"
          data-id="${escapeAttribute(id)}"
          aria-label="Нравится"
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
          data-url="${escapeAttribute(vkPostUrl)}"
        >
          <span class="actionIcon">💬</span>
          <span>Комментарии</span>
        </button>

        <button
          class="postAction"
          type="button"
          data-action="share"
          data-id="${escapeAttribute(id)}"
          data-url="${escapeAttribute(vkPostUrl)}"
        >
          <span class="actionIcon">↗</span>
          <span>Поделиться</span>
        </button>

        <button
          class="postAction"
          type="button"
          data-action="menu"
          data-id="${escapeAttribute(id)}"
        >
          <span class="actionIcon">⋯</span>
        </button>

      </div>

      <div
        class="vkPostSource"
        onclick="window.open('${escapeAttribute(vkPostUrl)}','_blank')"
      >
        <span>VK</span>
        <span>Открыть публикацию</span>
      </div>

    </article>
  `;
}


// ======================================================
// GET IMAGES
// ======================================================

function getPostImages(post) {

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
    images = [post.image_url];
  }

  return images
    .filter(Boolean)
    .filter((url, index, arr) =>
      arr.indexOf(url) === index
    );
}


// ======================================================
// GET VIDEO
// ======================================================

function getPostVideo(post) {

  const direct =
    post.video_url ||
    post.videoUrl ||
    post.video ||
    null;

  const player =
    post.video_player ||
    post.videoPlayer ||
    null;

  const title =
    post.video_title ||
    post.videoTitle ||
    "Видео";

  const type =
    post.video_type ||
    "video";

  if (!direct && !player) {
    return null;
  }

  return {
    direct,
    player,
    title,
    type
  };
}


// ======================================================
// RENDER GALLERY
// ======================================================

function renderGallery(images, postId) {

  if (!images.length) {
    return "";
  }

  const count =
    images.length;

  // Одна фотография
  if (count === 1) {

    return `
      <div class="vkPostGallery gallerySingle">

        <button
          class="vkPostImageButton"
          type="button"
          data-gallery-id="${escapeAttribute(postId)}"
          data-index="0"
        >

          <img
            class="vkPostImage"
            src="${escapeAttribute(images[0])}"
            alt="National Geographic"
            loading="lazy"
            onerror="this.closest('.vkPostImageButton').style.display='none'"
          >

        </button>

      </div>
    `;
  }


  // Две фотографии
  if (count === 2) {

    return `
      <div class="vkPostGallery galleryTwo">

        ${images.map((image, index) => `
          <button
            class="vkPostImageButton galleryItem"
            type="button"
            data-gallery-id="${escapeAttribute(postId)}"
            data-index="${index}"
          >

            <img
              class="vkPostImage"
              src="${escapeAttribute(image)}"
              alt="National Geographic"
              loading="lazy"
            >

          </button>
        `).join("")}

      </div>
    `;
  }


  // Три фотографии
  if (count === 3) {

    return `
      <div class="vkPostGallery galleryThree">

        <button
          class="vkPostImageButton galleryItem galleryLarge"
          type="button"
          data-gallery-id="${escapeAttribute(postId)}"
          data-index="0"
        >

          <img
            class="vkPostImage"
            src="${escapeAttribute(images[0])}"
            alt="National Geographic"
            loading="lazy"
          >

        </button>

        <div class="gallerySide">

          ${images.slice(1).map((image, i) => {

            const index = i + 1;

            return `
              <button
                class="vkPostImageButton galleryItem"
                type="button"
                data-gallery-id="${escapeAttribute(postId)}"
                data-index="${index}"
              >

                <img
                  class="vkPostImage"
                  src="${escapeAttribute(image)}"
                  alt="National Geographic"
                  loading="lazy"
                >

              </button>
            `;

          }).join("")}

        </div>

      </div>
    `;
  }


  // 4+ фотографий
  const visible =
    images.slice(0, 4);

  const remaining =
    images.length - 4;

  return `
    <div class="vkPostGallery galleryFour">

      ${visible.map((image, index) => {

        const more =
          index === 3 &&
          remaining > 0;

        return `
          <button
            class="vkPostImageButton galleryItem"
            type="button"
            data-gallery-id="${escapeAttribute(postId)}"
            data-index="${index}"
          >

            <img
              class="vkPostImage"
              src="${escapeAttribute(image)}"
              alt="National Geographic"
              loading="lazy"
            >

            ${
              more
                ? `
                  <span class="galleryMore">
                    +${remaining}
                  </span>
                `
                : ""
            }

          </button>
        `;

      }).join("")}

    </div>
  `;
}


// ======================================================
// RENDER VIDEO
// ======================================================

function renderVideo(video, postId) {

  // Прямой видеофайл
  if (video.direct) {

    return `
      <div class="vkPostVideo">

        <video
          controls
          playsinline
          preload="metadata"
          src="${escapeAttribute(video.direct)}"
        ></video>

        ${
          video.title
            ? `
              <div class="videoTitle">
                ${escapeHtml(video.title)}
              </div>
            `
            : ""
        }

      </div>
    `;
  }


  // VK player
  if (video.player) {

    const playerUrl =
      normalizeVkPlayerUrl(video.player);

    return `
      <div class="vkPostVideo">

        <div class="vkVideoFrame">

          <iframe
            src="${escapeAttribute(playerUrl)}"
            title="${escapeAttribute(video.title || "Видео VK")}"
            loading="lazy"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>

        </div>

        <div class="videoFallback">

          <a
            href="${escapeAttribute(playerUrl)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ▶ Открыть видео VK
          </a>

        </div>

      </div>
    `;
  }

  return "";
}


// ======================================================
// NORMALIZE VK PLAYER
// ======================================================

function normalizeVkPlayerUrl(url) {

  if (!url) {
    return "";
  }

  let result = String(url).trim();

  // Уже полноценный URL
  if (
    result.startsWith("http://") ||
    result.startsWith("https://")
  ) {
    return result;
  }

  // Протокол-relative
  if (result.startsWith("//")) {
    return "https:" + result;
  }

  return result;
}


// ======================================================
// POST EVENTS
// ======================================================

function setupPostEvents() {

  // Фото
  document
    .querySelectorAll(".vkPostImageButton")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const postId =
            button.dataset.galleryId;

          const index =
            Number(button.dataset.index || 0);

          const post =
            allPosts.find(item =>
              String(item.id || item.vk_id) ===
              String(postId)
            );

          if (!post) {
            return;
          }

          const images =
            getPostImages(post);

          openViewer(images, index);
        }
      );
    });


  // Кнопки действий
  document
    .querySelectorAll(".postAction")
    .forEach(button => {

      button.addEventListener(
        "click",
        async event => {

          event.stopPropagation();

          const action =
            button.dataset.action;

          const id =
            button.dataset.id;

          if (action === "like") {
            toggleLike(id, button);
          }

          if (action === "comment") {
            openVk(
              button.dataset.url
            );
          }

          if (action === "share") {
            sharePost(
              button.dataset.url
            );
          }

          if (action === "menu") {
            showPostMenu(id);
          }
        }
      );
    });
}


// ======================================================
// LIKE
// ======================================================

function getLikeState(id) {

  try {
    return (
      localStorage.getItem(
        "natgeo_like_" + id
      ) === "1"
    );
  } catch {
    return false;
  }
}


function toggleLike(id, button) {

  const current =
    getLikeState(id);

  const next =
    !current;

  try {

    localStorage.setItem(
      "natgeo_like_" + id,
      next ? "1" : "0"
    );

  } catch {}

  button.classList.toggle(
    "liked",
    next
  );

  const icon =
    button.querySelector(".actionIcon");

  if (icon) {
    icon.textContent =
      next ? "♥" : "♡";
  }
}


// ======================================================
// SHARE
// ======================================================

async function sharePost(url) {

  if (!url) {
    url = VK_GROUP_URL;
  }

  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title: "National Geographic",
        text: "National Geographic",
        url
      });

      return;

    } catch {}
  }

  try {

    await navigator.clipboard.writeText(
      url
    );

    showToast(
      "Ссылка скопирована"
    );

  } catch {

    showToast(
      "Не удалось скопировать ссылку"
    );
  }
}


// ======================================================
// VK URL
// ======================================================

function getVkPostUrl(post) {

  if (post.vk_id) {

    const parts =
      String(post.vk_id).split("_");

    if (parts.length === 2) {

      return (
        "https://vk.ru/wall" +
        parts[0] +
        "_" +
        parts[1]
      );
    }
  }

  return VK_GROUP_URL;
}


function openVk(url) {

  window.open(
    url || VK_GROUP_URL,
    "_blank",
    "noopener,noreferrer"
  );
}


// ======================================================
// POST MENU
// ======================================================

function showPostMenu(id) {

  const post =
    allPosts.find(item =>
      String(item.id || item.vk_id) ===
      String(id)
    );

  if (!post) {
    return;
  }

  const text =
    post.text || "";

  if (!text) {
    showToast(
      "В публикации нет текста"
    );
    return;
  }

  try {

    navigator.clipboard.writeText(
      text
    );

    showToast(
      "Текст публикации скопирован"
    );

  } catch {

    showToast(
      "Не удалось скопировать текст"
    );
  }
}


// ======================================================
// FULLSCREEN VIEWER
// ======================================================

function setupViewer() {

  const viewer =
    document.getElementById("imageViewer");

  if (!viewer) {
    return;
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

  if (close) {
    close.addEventListener(
      "click",
      closeViewer
    );
  }

  if (prev) {
    prev.addEventListener(
      "click",
      () => changeViewer(-1)
    );
  }

  if (next) {
    next.addEventListener(
      "click",
      () => changeViewer(1)
    );
  }

  viewer.addEventListener(
    "click",
    event => {

      if (
        event.target === viewer
      ) {
        closeViewer();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {

      if (
        !viewer.classList.contains("open")
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

  // Свайп на телефоне
  let touchStartX = 0;

  viewer.addEventListener(
    "touchstart",
    event => {

      touchStartX =
        event.changedTouches[0].screenX;
    },
    { passive: true }
  );

  viewer.addEventListener(
    "touchend",
    event => {

      const touchEndX =
        event.changedTouches[0].screenX;

      const difference =
        touchEndX - touchStartX;

      if (Math.abs(difference) < 50) {
        return;
      }

      if (difference > 0) {
        changeViewer(-1);
      } else {
        changeViewer(1);
      }
    },
    { passive: true }
  );
}


function openViewer(images, index = 0) {

  const viewer =
    document.getElementById("imageViewer");

  if (!viewer || !images.length) {
    return;
  }

  currentGallery =
    images;

  currentGalleryIndex =
    Math.max(
      0,
      Math.min(
        index,
        images.length - 1
      )
    );

  updateViewer();

  viewer.classList.add("open");

  document.body.style.overflow =
    "hidden";
}


function updateViewer() {

  const viewer =
    document.getElementById("imageViewer");

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

  const prev =
    viewer.querySelector(
      ".imageViewerPrev"
    );

  const next =
    viewer.querySelector(
      ".imageViewerNext"
    );

  if (image) {

    image.src =
      currentGallery[
        currentGalleryIndex
      ];

    image.alt =
      "National Geographic";
  }

  if (counter) {

    counter.textContent =
      `${currentGalleryIndex + 1} / ${currentGallery.length}`;
  }

  if (prev) {

    prev.style.display =
      currentGallery.length > 1
        ? ""
        : "none";
  }

  if (next) {

    next.style.display =
      currentGallery.length > 1
        ? ""
        : "none";
  }
}


function changeViewer(direction) {

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
    document.getElementById("imageViewer");

  if (!viewer) {
    return;
  }

  viewer.classList.remove("open");

  document.body.style.overflow =
    "";

  currentGallery = [];
  currentGalleryIndex = 0;
}


// ======================================================
// LOAD MORE
// ======================================================

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "#loadMore"
      );

    if (!button) {
      return;
    }

    currentPage++;

    renderPosts();

    setTimeout(() => {

      const posts =
        document.querySelectorAll(
          ".vkPost"
        );

      if (posts.length) {

        posts[
          Math.max(
            0,
            posts.length - POSTS_PER_PAGE
          )
        ]?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }

    }, 50);
  }
);


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

          const targetId =
            link.getAttribute("href");

          if (
            !targetId ||
            targetId === "#"
          ) {
            return;
          }

          const target =
            document.querySelector(
              targetId
            );

          if (!target) {
            return;
          }

          event.preventDefault();

          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

          closeMobileMenu();
        }
      );
    });
}


// ======================================================
// MOBILE MENU
// ======================================================

function setupMobileMenu() {

  const menuButton =
    document.getElementById(
      "mobileMenuButton"
    );

  const menu =
    document.getElementById(
      "mobileMenu"
    );

  const close =
    document.getElementById(
      "mobileMenuClose"
    );

  if (menuButton && menu) {

    menuButton.addEventListener(
      "click",
      () => {

        menu.classList.add(
          "open"
        );

        document.body.style.overflow =
          "hidden";
      }
    );
  }

  if (close) {

    close.addEventListener(
      "click",
      closeMobileMenu
    );
  }

  if (menu) {

    menu.addEventListener(
      "click",
      event => {

        if (
          event.target === menu
        ) {
          closeMobileMenu();
        }
      }
    );

    menu
      .querySelectorAll("a")
      .forEach(link => {

        link.addEventListener(
          "click",
          closeMobileMenu
        );
      });
  }
}


function closeMobileMenu() {

  const menu =
    document.getElementById(
      "mobileMenu"
    );

  if (menu) {
    menu.classList.remove(
      "open"
    );
  }

  document.body.style.overflow =
    "";
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
    { passive: true }
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

  let toast =
    document.getElementById(
      "toast"
    );

  if (!toast) {

    toast =
      document.createElement(
        "div"
      );

    toast.id = "toast";

    document.body.appendChild(
      toast
    );
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
    escapeHtml(text);

  const urlRegex =
    /(https?:\/\/[^\s<]+)/gi;

  return escaped
    .replace(
      urlRegex,
      url => {

        const cleanUrl =
          url.replace(
            /[.,!?;:]+$/,
            ""
          );

        const ending =
          url.slice(
            cleanUrl.length
          );

        return `
          <a
            class="postLink"
            href="${escapeAttribute(cleanUrl)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${cleanUrl}
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
// HTML ESCAPE
// ======================================================

function escapeHtml(value) {

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


function escapeAttribute(value) {

  return escapeHtml(value)
    .replace(
      /`/g,
      "&#096;"
    );
}


// ======================================================
// GLOBAL ERROR HANDLING
// ======================================================

window.addEventListener(
  "error",
  event => {
    console.error(
      "Site error:",
      event.error || event.message
    );
  }
);

window.addEventListener(
  "unhandledrejection",
  event => {
    console.error(
      "Promise error:",
      event.reason
    );
  }
);
