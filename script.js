/* =========================================================
   NATIONAL GEOGRAPHIC — DIGITAL EDITION
   script.js
   ========================================================= */

const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const FAVORITES_KEY = "ng_favorites";
const LIKES_KEY = "ng_likes";

let allPosts = [];
let visiblePosts = 6;
let activeCategory = "Все";
let searchText = "";
let isLoading = false;

/* =========================================================
   DOM
   ========================================================= */

const postsContainer = document.getElementById("posts");
const postSearch = document.getElementById("postSearch");
const refreshButton = document.getElementById("refreshButton");
const refreshTime = document.getElementById("refreshTime");
const year = document.getElementById("year");
const backToTop = document.getElementById("backToTop");
const menu = document.getElementById("menu");
const links = document.getElementById("links");

if (year) {
  year.textContent = new Date().getFullYear();
}

/* =========================================================
   STORAGE
   ========================================================= */

function getStorageArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveStorageArray(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function getFavorites() {
  return getStorageArray(FAVORITES_KEY);
}

function getLikes() {
  return getStorageArray(LIKES_KEY);
}

function isFavorite(id) {
  return getFavorites().includes(String(id));
}

function isLiked(id) {
  return getLikes().includes(String(id));
}

/* =========================================================
   FAVORITES
   ========================================================= */

function toggleFavorite(id) {
  const favorites = getFavorites();
  const stringId = String(id);

  const index = favorites.indexOf(stringId);

  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push(stringId);
  }

  saveStorageArray(FAVORITES_KEY, favorites);

  renderPosts();
}

/* =========================================================
   LIKES
   ========================================================= */

function toggleLike(id) {
  const likes = getLikes();
  const stringId = String(id);

  const index = likes.indexOf(stringId);

  if (index >= 0) {
    likes.splice(index, 1);
  } else {
    likes.push(stringId);
  }

  saveStorageArray(LIKES_KEY, likes);

  renderPosts();
}

/* =========================================================
   TEXT
   ========================================================= */

function cleanText(text) {
  if (!text) return "";

  return String(text)
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function linkifyText(text) {
  const escaped = escapeHtml(text);

  return escaped.replace(
    /(https?:\/\/[^\s<]+)/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

/* =========================================================
   DATE
   ========================================================= */

function formatDate(timestamp) {
  if (!timestamp) return "";

  const date = new Date(Number(timestamp) * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(Number(timestamp) * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* =========================================================
   VK LINK
   ========================================================= */

function getPostLink(post) {
  if (post && post.vk_id && String(post.vk_id).includes("_")) {
    const parts = String(post.vk_id).split("_");

    const ownerId = parts[0];
    const postId = parts[1];

    if (ownerId && postId) {
      return `https://vk.ru/wall${ownerId}_${postId}`;
    }
  }

  return "https://vk.ru/national.geograph1c";
}

/* =========================================================
   IMAGE
   ========================================================= */

function getImage(post) {
  if (!post) return "";

  return (
    post.image_url ||
    post.image ||
    post.photo ||
    post.cover ||
    post.photo_url ||
    post.imageUrl ||
    ""
  );
}

/* =========================================================
   VIDEO
   ========================================================= */

function getVideo(post) {
  if (!post) return null;

  if (post.video_url) {
    return {
      url: post.video_url,
      type: "video"
    };
  }

  if (post.videoUrl) {
    return {
      url: post.videoUrl,
      type: "video"
    };
  }

  if (post.video_mp4) {
    return {
      url: post.video_mp4,
      type: "video"
    };
  }

  if (post.video_url_hd) {
    return {
      url: post.video_url_hd,
      type: "video"
    };
  }

  if (typeof post.video === "string") {
    return {
      url: post.video,
      type: "video"
    };
  }

  if (post.video && typeof post.video === "object") {
    const url =
      post.video.url ||
      post.video.video_url ||
      post.video.player ||
      post.video.embed_url;

    if (url) {
      return {
        url,
        type: url.includes("vk.com") || url.includes("vk.ru")
          ? "embed"
          : "video"
      };
    }
  }

  if (Array.isArray(post.attachments)) {
    for (const attachment of post.attachments) {
      if (!attachment) continue;

      if (attachment.type === "video") {
        const video = attachment.video || attachment;

        const url =
          video.url ||
          video.video_url ||
          video.player ||
          video.embed_url;

        if (url) {
          return {
            url,
            type: url.includes("vk.com") || url.includes("vk.ru")
              ? "embed"
              : "video"
          };
        }
      }
    }
  }

  return null;
}

/* =========================================================
   COMMENTS
   ========================================================= */

function getComments(post) {
  if (!post) return [];

  if (Array.isArray(post.comments)) {
    return post.comments;
  }

  if (Array.isArray(post.comment_list)) {
    return post.comment_list;
  }

  return [];
}

function getCommentsCount(post) {
  if (!post) return 0;

  if (typeof post.comments_count !== "undefined") {
    return Number(post.comments_count) || 0;
  }

  if (typeof post.commentsCount !== "undefined") {
    return Number(post.commentsCount) || 0;
  }

  if (Array.isArray(post.comments)) {
    return post.comments.length;
  }

  return 0;
}

/* =========================================================
   MEDIA
   ========================================================= */

function renderImage(post) {
  const image = getImage(post);

  if (!image) {
    return "";
  }

  return `
    <img
      class="vkPostImage"
      src="${escapeHtml(image)}"
      alt="National Geographic"
      loading="lazy"
      onclick="openImage('${escapeHtml(image)}')"
      onerror="this.style.display='none'"
    >
  `;
}

function renderVideo(post) {
  const video = getVideo(post);

  if (!video) {
    return "";
  }

  const url = escapeHtml(video.url);

  if (video.type === "embed") {
    return `
      <div class="vkPostVideo">
        <iframe
          src="${url}"
          loading="lazy"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowfullscreen
          title="Видео VK"
        ></iframe>
      </div>
    `;
  }

  return `
    <div class="vkPostVideo">
      <video
        controls
        playsinline
        preload="metadata"
        src="${url}"
      ></video>
    </div>
  `;
}

/* =========================================================
   COMMENTS HTML
   ========================================================= */

function renderComments(post) {
  const comments = getComments(post);
  const count = getCommentsCount(post);

  if (!comments.length) {
    return `
      <div class="vkComments">
        <div class="vkCommentsHeader">
          <strong>Комментарии</strong>
          <span>${count || 0}</span>
        </div>

        <div class="vkCommentsEmpty">
          Комментарии доступны в сообществе VK
        </div>
      </div>
    `;
  }

  const visibleComments = comments.slice(0, 10);

  return `
    <div class="vkComments">
      <div class="vkCommentsHeader">
        <strong>Комментарии</strong>
        <span>${count || comments.length}</span>
      </div>

      ${visibleComments
        .map(comment => {
          const author =
            comment.author ||
            comment.user_name ||
            comment.name ||
            "Пользователь VK";

          const text =
            comment.text ||
            comment.message ||
            "";

          return `
            <div class="vkComment">
              <div class="vkCommentAuthor">
                ${escapeHtml(author)}
              </div>

              <div class="vkCommentText">
                ${linkifyText(text)}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

/* =========================================================
   POST HTML
   ========================================================= */

function renderPost(post) {
  const id =
    post.id ??
    post.vk_id ??
    Math.random().toString(36).slice(2);

  const text = cleanText(post.text);

  const image = getImage(post);
  const video = getVideo(post);

  const liked = isLiked(id);
  const favorite = isFavorite(id);

  const commentsCount = getCommentsCount(post);

  const date = formatDate(post.post_date);
  const time = formatTime(post.post_date);

  const mediaHtml = `
    ${renderImage(post)}
    ${renderVideo(post)}
  `;

  return `
    <article
      class="vkPost"
      data-post-id="${escapeHtml(id)}"
    >

      <header class="vkPostHeader">

        <div class="vkPostIdentity">

          <div class="vkCommunityAvatar">
            <span>NG</span>
          </div>

          <div class="vkPostAuthor">
            <strong>National Geographic</strong>

            <span>
              Сообщество
              ${date ? ` · ${escapeHtml(date)}` : ""}
              ${time ? ` · ${escapeHtml(time)}` : ""}
            </span>
          </div>

        </div>

        <button
          class="vkPostMenu"
          type="button"
          onclick="openPostMenu('${escapeHtml(id)}')"
          aria-label="Меню"
        >
          ⋯
        </button>

      </header>


      <div class="vkPostContent">

        ${
          text
            ? `
              <div class="vkPostText">
                ${linkifyText(text)}
              </div>
            `
            : ""
        }

        ${
          mediaHtml
            ? mediaHtml
            : `
              <div class="vkPostPlaceholder">
                National Geographic
              </div>
            `
        }

      </div>


      <div class="vkPostActions">

        <button
          class="vkAction ${liked ? "isActive" : ""}"
          type="button"
          onclick="toggleLike('${escapeHtml(id)}')"
        >
          <span>${liked ? "♥" : "♡"}</span>
          <span>Нравится</span>
        </button>


        <button
          class="vkAction"
          type="button"
          onclick="toggleComments('${escapeHtml(id)}')"
        >
          <span>💬</span>
          <span>
            Комментарии
            ${commentsCount ? `(${commentsCount})` : ""}
          </span>
        </button>


        <button
          class="vkAction"
          type="button"
          onclick="sharePost('${escapeHtml(id)}')"
        >
          <span>↗</span>
          <span>Поделиться</span>
        </button>


        <button
          class="vkAction ${favorite ? "isActive" : ""}"
          type="button"
          onclick="toggleFavorite('${escapeHtml(id)}')"
        >
          <span>${favorite ? "★" : "☆"}</span>
          <span>В избранное</span>
        </button>

      </div>


      <div
        class="vkPostCommentsContainer"
        id="comments-${escapeHtml(id)}"
        style="display:none;"
      >
        ${renderComments(post)}
      </div>


      <div class="vkPostBottom">

        <span>
          ${post.vk_id ? `VK ID: ${escapeHtml(post.vk_id)}` : "National Geographic"}
        </span>

        <a
          class="vkOpenPost"
          href="${escapeHtml(getPostLink(post))}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть в VK ↗
        </a>

      </div>

    </article>
  `;
}

/* =========================================================
   FILTER
   ========================================================= */

function getFilteredPosts() {
  let posts = [...allPosts];

  if (activeCategory === "Избранное") {
    posts = posts.filter(post => {
      const id =
        post.id ??
        post.vk_id ??
        "";

      return isFavorite(id);
    });
  }

  if (searchText.trim()) {
    const query = searchText.toLowerCase().trim();

    posts = posts.filter(post => {
      const text = cleanText(post.text).toLowerCase();

      const vkId = String(post.vk_id || "").toLowerCase();

      return (
        text.includes(query) ||
        vkId.includes(query)
      );
    });
  }

  return posts;
}

/* =========================================================
   RENDER POSTS
   ========================================================= */

function renderPosts() {
  if (!postsContainer) return;

  const filteredPosts = getFilteredPosts();

  const postsToShow = filteredPosts.slice(0, visiblePosts);

  if (!filteredPosts.length) {
    postsContainer.innerHTML = `
      <div class="ngLoading">
        Ничего не найдено
      </div>
    `;

    removeLoadMoreButton();

    return;
  }

  postsContainer.innerHTML = postsToShow
    .map(post => renderPost(post))
    .join("");

  renderLoadMore(filteredPosts.length);
}

/* =========================================================
   LOAD MORE
   ========================================================= */

function renderLoadMore(total) {
  removeLoadMoreButton();

  if (visiblePosts >= total) {
    return;
  }

  const wrapper = document.createElement("div");

  wrapper.className = "loadMoreWrap";

  wrapper.id = "loadMoreWrapper";

  wrapper.innerHTML = `
    <button
      class="loadMore"
      type="button"
      onclick="loadMorePosts()"
    >
      Показать ещё
    </button>
  `;

  postsContainer.insertAdjacentElement(
    "afterend",
    wrapper
  );
}

function removeLoadMoreButton() {
  const existing =
    document.getElementById("loadMoreWrapper");

  if (existing) {
    existing.remove();
  }
}

function loadMorePosts() {
  visiblePosts += 6;

  renderPosts();
}

/* =========================================================
   FETCH POSTS
   ========================================================= */

async function loadPosts(showLoading = true) {
  if (isLoading) return;

  isLoading = true;

  if (showLoading && postsContainer) {
    postsContainer.innerHTML = `
      <div class="ngLoading">
        Загружаем материалы…
      </div>
    `;
  }

  if (refreshButton) {
    refreshButton.classList.add("isLoading");

    refreshButton.textContent = "Обновление…";
  }

  try {
    const response = await fetch(
      `${API_URL}?t=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    let posts = [];

    if (Array.isArray(data)) {
      posts = data;
    } else if (Array.isArray(data.posts)) {
      posts = data.posts;
    }

    allPosts = posts;

    visiblePosts = 6;

    renderPosts();

    if (refreshTime) {
      const now = new Date();

      refreshTime.textContent =
        `Обновлено ${now.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit"
        })}`;
    }

  } catch (error) {
    console.error(
      "Ошибка загрузки постов:",
      error
    );

    if (postsContainer) {
      postsContainer.innerHTML = `
        <div class="ngLoading">
          Не удалось загрузить публикации
        </div>
      `;
    }

  } finally {
    isLoading = false;

    if (refreshButton) {
      refreshButton.classList.remove("isLoading");

      refreshButton.textContent = "Обновить";
    }
  }
}

/* =========================================================
   COMMENTS TOGGLE
   ========================================================= */

function toggleComments(id) {
  const container =
    document.getElementById(`comments-${id}`);

  if (!container) return;

  if (container.style.display === "none") {
    container.style.display = "block";

    setTimeout(() => {
      container.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }, 50);

  } else {
    container.style.display = "none";
  }
}

/* =========================================================
   SHARE
   ========================================================= */

async function sharePost(id) {
  const post = allPosts.find(item => {
    const postId =
      item.id ??
      item.vk_id ??
      "";

    return String(postId) === String(id);
  });

  if (!post) return;

  const url = getPostLink(post);

  const text =
    cleanText(post.text).slice(0, 180) ||
    "National Geographic";

  if (
    navigator.share
  ) {
    try {
      await navigator.share({
        title: "National Geographic",
        text,
        url
      });

      return;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);

    showToast("Ссылка скопирована");

  } catch {
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }
}

/* =========================================================
   IMAGE VIEWER
   ========================================================= */

function openImage(url) {
  if (!url) return;

  const overlay =
    document.createElement("div");

  overlay.id = "ngImageViewer";

  overlay.style.cssText = `
    position:fixed;
    inset:0;
    z-index:9999;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    background:rgba(0,0,0,.94);
    cursor:zoom-out;
  `;

  overlay.innerHTML = `
    <img
      src="${escapeHtml(url)}"
      alt="National Geographic"
      style="
        max-width:100%;
        max-height:94vh;
        object-fit:contain;
        border-radius:10px;
        box-shadow:0 20px 80px rgba(0,0,0,.6);
      "
    >
  `;

  overlay.addEventListener(
    "click",
    () => overlay.remove()
  );

  document.body.appendChild(overlay);
}

/* =========================================================
   POST MENU
   ========================================================= */

function openPostMenu(id) {
  closePostMenus();

  const post = allPosts.find(item => {
    const postId =
      item.id ??
      item.vk_id ??
      "";

    return String(postId) === String(id);
  });

  if (!post) return;

  const article =
    document.querySelector(
      `.vkPost[data-post-id="${CSS.escape(String(id))}"]`
    );

  if (!article) return;

  const menuElement =
    document.createElement("div");

  menuElement.className =
    "postPopupMenu";

  menuElement.innerHTML = `
    <button type="button" onclick="copyPostText('${escapeHtml(id)}')">
      Копировать текст
    </button>

    <button type="button" onclick="sharePost('${escapeHtml(id)}')">
      Поделиться
    </button>

    <button type="button" onclick="openOriginalPost('${escapeHtml(id)}')">
      Открыть в VK
    </button>
  `;

  article.style.position = "relative";

  menuElement.style.position = "absolute";
  menuElement.style.top = "60px";
  menuElement.style.right = "14px";

  article.appendChild(menuElement);

  setTimeout(() => {
    document.addEventListener(
      "click",
      handleOutsideMenuClick
    );
  }, 0);
}

function handleOutsideMenuClick(event) {
  if (
    !event.target.closest(".postPopupMenu") &&
    !event.target.closest(".vkPostMenu")
  ) {
    closePostMenus();
  }
}

function closePostMenus() {
  document
    .querySelectorAll(".postPopupMenu")
    .forEach(menu => menu.remove());

  document.removeEventListener(
    "click",
    handleOutsideMenuClick
  );
}

/* =========================================================
   COPY TEXT
   ========================================================= */

async function copyPostText(id) {
  const post = allPosts.find(item => {
    const postId =
      item.id ??
      item.vk_id ??
      "";

    return String(postId) === String(id);
  });

  if (!post) return;

  const text = cleanText(post.text);

  if (!text) {
    showToast("В посте нет текста");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);

    showToast("Текст скопирован");

    closePostMenus();

  } catch {
    showToast("Не удалось скопировать");
  }
}

/* =========================================================
   OPEN VK
   ========================================================= */

function openOriginalPost(id) {
  const post = allPosts.find(item => {
    const postId =
      item.id ??
      item.vk_id ??
      "";

    return String(postId) === String(id);
  });

  if (!post) return;

  window.open(
    getPostLink(post),
    "_blank",
    "noopener,noreferrer"
  );

  closePostMenus();
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {
  const oldToast =
    document.getElementById("ngToast");

  if (oldToast) {
    oldToast.remove();
  }

  const toast =
    document.createElement("div");

  toast.id = "ngToast";

  toast.textContent = message;

  toast.style.cssText = `
    position:fixed;
    left:50%;
    bottom:90px;
    z-index:10000;

    transform:translateX(-50%);

    padding:11px 17px;

    background:#171717;
    color:#fff;

    border:1px solid rgba(255,204,0,.35);
    border-radius:9px;

    box-shadow:0 10px 35px rgba(0,0,0,.45);

    font-size:12px;
    font-weight:700;

    pointer-events:none;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2200);
}

/* =========================================================
   SEARCH
   ========================================================= */

if (postSearch) {
  postSearch.addEventListener(
    "input",
    event => {
      searchText =
        event.target.value || "";

      visiblePosts = 6;

      renderPosts();
    }
  );
}

/* =========================================================
   FILTER BUTTONS
   ========================================================= */

document
  .querySelectorAll(".categoryBtn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".categoryBtn")
          .forEach(item => {
            item.classList.remove("active");
          });

        button.classList.add("active");

        activeCategory =
          button.dataset.category ||
          "Все";

        visiblePosts = 6;

        renderPosts();
      }
    );

  });

/* =========================================================
   REFRESH
   ========================================================= */

if (refreshButton) {
  refreshButton.addEventListener(
    "click",
    () => loadPosts(true)
  );
}

/* =========================================================
   MOBILE MENU
   ========================================================= */

if (menu && links) {
  menu.addEventListener(
    "click",
    () => {

      const isOpen =
        links.classList.contains("open");

      links.classList.toggle(
        "open",
        !isOpen
      );

    }
  );
}

/* =========================================================
   NAVIGATION
   ========================================================= */

document
  .querySelectorAll('a[href^="#"]')
  .forEach(link => {

    link.addEventListener(
      "click",
      event => {

        const targetId =
          link.getAttribute("href");

        if (!targetId || targetId === "#") {
          return;
        }

        const target =
          document.querySelector(targetId);

        if (!target) return;

        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        if (links) {
          links.classList.remove("open");
        }

      }
    );

  });

/* =========================================================
   BACK TO TOP
   ========================================================= */

if (backToTop) {

  window.addEventListener(
    "scroll",
    () => {

      if (window.scrollY > 500) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }

    },
    {
      passive: true
    }
  );

  backToTop.addEventListener(
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
   KEYBOARD ESC
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {

      closePostMenus();

      const viewer =
        document.getElementById(
          "ngImageViewer"
        );

      if (viewer) {
        viewer.remove();
      }

    }

  }
);

/* =========================================================
   INITIAL LOAD
   ========================================================= */

loadPosts(true);

/* =========================================================
   AUTO REFRESH
   ========================================================= */

/*
   Обновляем ленту раз в 5 минут.
   Это не перезагружает страницу.
*/

setInterval(
  () => {
    if (!document.hidden) {
      loadPosts(false);
    }
  },
  5 * 60 * 1000
);

/* =========================================================
   PWA / SERVICE WORKER
   ========================================================= */

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./sw.js")
        .catch(error => {
          console.warn(
            "Service Worker:",
            error
          );
        });

    }
  );

}
