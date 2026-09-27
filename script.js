const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const VK_GROUP_URL =
  "https://vk.ru/national.geograph1c";

const POSTS_PER_PAGE = 10;

let allPosts = [];
let visiblePosts = POSTS_PER_PAGE;

const postsContainer = document.getElementById("posts");
const feedStatus = document.getElementById("feedStatus");
const loadMoreWrap = document.getElementById("loadMoreWrap");
const loadMoreButton = document.getElementById("loadMore");
const backToTop = document.getElementById("backToTop");
const toast = document.getElementById("toast");

const mobileMenuButton =
  document.getElementById("mobileMenuButton");

const mobileMenu =
  document.getElementById("mobileMenu");

const yearElement =
  document.getElementById("year");


/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {

  if (yearElement) {
    yearElement.textContent =
      new Date().getFullYear();
  }

  loadPosts();

  setupNavigation();
  setupBackToTop();
  setupMobileMenu();

  if (loadMoreButton) {
    loadMoreButton.addEventListener(
      "click",
      loadMorePosts
    );
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .catch(() => {});
  }

});


/* =========================
   LOAD POSTS
========================= */

async function loadPosts() {

  feedStatus.textContent =
    "ЗАГРУЗКА ПУБЛИКАЦИЙ…";

  try {

    const response =
      await fetch(API_URL, {
        cache: "no-store"
      });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (!data || !Array.isArray(data.posts)) {
      throw new Error(
        "Неверный формат API"
      );
    }

    allPosts = data.posts;

    visiblePosts = POSTS_PER_PAGE;

    renderPosts();

  } catch (error) {

    console.error(
      "Ошибка загрузки:",
      error
    );

    feedStatus.textContent =
      "НЕ УДАЛОСЬ ЗАГРУЗИТЬ ПУБЛИКАЦИИ";

    postsContainer.innerHTML = `
      <div class="vkPost">
        <div class="vkPostContent">
          <p class="vkPostText">
            Не удалось получить публикации.
            Проверьте подключение к интернету
            и попробуйте обновить страницу.
          </p>

          <button
            class="loadMore"
            onclick="loadPosts()"
          >
            ПОВТОРИТЬ
          </button>
        </div>
      </div>
    `;
  }
}


/* =========================
   RENDER
========================= */

function renderPosts() {

  postsContainer.innerHTML = "";

  const postsToShow =
    allPosts.slice(0, visiblePosts);

  if (!postsToShow.length) {

    feedStatus.textContent =
      "ПУБЛИКАЦИЙ ПОКА НЕТ";

    loadMoreWrap.hidden = true;

    return;
  }

  feedStatus.textContent =
    `${allPosts.length} ПУБЛИКАЦИЙ`;

  postsToShow.forEach(
    (post, index) => {

      postsContainer.appendChild(
        createPostCard(post, index)
      );

    }
  );

  loadMoreWrap.hidden =
    visiblePosts >= allPosts.length;
}


/* =========================
   POST CARD
========================= */

function createPostCard(post, index) {

  const article =
    document.createElement("article");

  article.className = "vkPost";

  const postId =
    post.id ??
    post.vk_id ??
    index;

  const text =
    post.text ||
    "";

  const image =
    getImageUrl(post);

  const video =
    getVideoUrl(post);

  const date =
    formatDate(
      post.post_date ||
      post.created_at
    );

  const commentsCount =
    Number(
      post.comments_count ??
      post.commentsCount ??
      0
    );

  article.innerHTML = `

    <div class="vkPostHeader">

      <div class="vkPostIdentity">

        <div class="vkCommunityAvatar">
          NG
        </div>

        <div class="vkPostAuthor">

          <strong>
            National Geographic
          </strong>

          <time>
            ${escapeHtml(date)}
          </time>

        </div>

      </div>

      <button
        class="vkPostMenu"
        data-menu="${escapeAttribute(postId)}"
        aria-label="Меню"
      >
        ⋮
      </button>

    </div>


    <div class="vkPostContent">

      ${
        text
          ? `
            <p class="vkPostText">
              ${escapeHtml(text)}
            </p>
          `
          : ""
      }


      ${
        image
          ? `
            <img
              class="vkPostImage"
              src="${escapeAttribute(image)}"
              alt="National Geographic"
              loading="lazy"
              data-full-image="${escapeAttribute(image)}"
            >
          `
          : ""
      }


      ${
        !image && video
          ? `
            <div class="vkPostVideo">

              <a
                href="${escapeAttribute(video)}"
                target="_blank"
                rel="noopener"
                class="vkVideoLink"
              >
                ▶ ОТКРЫТЬ ВИДЕО
              </a>

            </div>
          `
          : ""
      }


      ${
        !image && !video && !text
          ? `
            <div class="vkPostPlaceholder">
              NG
            </div>
          `
          : ""
      }


      <div class="vkPostActions">

        <button
          class="vkAction likeButton"
          data-post-id="${escapeAttribute(postId)}"
        >
          ♡ НРАВИТСЯ
        </button>

        <button
          class="vkAction commentButton"
          data-post-id="${escapeAttribute(postId)}"
        >
          ${commentsCount > 0
            ? `● ${commentsCount} КОММЕНТ.`
            : "● КОММЕНТАРИИ"}
        </button>

        <button
          class="vkAction shareButton"
          data-post-id="${escapeAttribute(postId)}"
        >
          ↗ ПОДЕЛИТЬСЯ
        </button>

      </div>


      <div class="vkPostBottom">

        <span>
          VK • ${escapeHtml(String(post.vk_id || ""))}
        </span>

        <a
          class="vkOpenPost"
          href="${getVkPostUrl(post)}"
          target="_blank"
          rel="noopener"
        >
          ОТКРЫТЬ ↗
        </a>

      </div>

      ${
        renderComments(post)
      }

    </div>
  `;


  setupPostEvents(article, post);

  return article;
}


/* =========================
   COMMENTS
========================= */

function renderComments(post) {

  const comments =
    Array.isArray(post.comments)
      ? post.comments
      : Array.isArray(post.comment_list)
        ? post.comment_list
        : [];

  const count =
    Number(
      post.comments_count ??
      post.commentsCount ??
      comments.length
    );

  if (!count && !comments.length) {
    return "";
  }

  if (!comments.length) {

    return `
      <div class="vkComments">

        <div class="vkCommentsHeader">
          КОММЕНТАРИИ
        </div>

        <div class="vkCommentsEmpty">
          ${count} комментариев.
          Открыть обсуждение можно
          в сообществе VK.
        </div>

      </div>
    `;
  }

  return `
    <div class="vkComments">

      <div class="vkCommentsHeader">
        КОММЕНТАРИИ
      </div>

      ${comments
        .slice(0, 5)
        .map(comment => {

          const commentText =
            typeof comment === "string"
              ? comment
              : comment.text || "";

          return `
            <div class="vkComment">
              ${escapeHtml(commentText)}
            </div>
          `;

        })
        .join("")}

    </div>
  `;
}


/* =========================
   POST EVENTS
========================= */

function setupPostEvents(article, post) {

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

    likeButton.addEventListener(
      "click",
      () => {

        likeButton.classList.toggle("active");

        likeButton.textContent =
          likeButton.classList.contains("active")
            ? "♥ НРАВИТСЯ"
            : "♡ НРАВИТСЯ";

      }
    );

  }


  if (commentButton) {

    commentButton.addEventListener(
      "click",
      () => {

        const comments =
          article.querySelector(".vkComments");

        if (comments) {

          comments.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });

        } else {

          showToast(
            "Комментарии доступны в VK"
          );

          window.open(
            getVkPostUrl(post),
            "_blank",
            "noopener"
          );

        }

      }
    );

  }


  if (shareButton) {

    shareButton.addEventListener(
      "click",
      () => sharePost(post)
    );

  }


  if (menuButton) {

    menuButton.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        showPostMenu(
          menuButton,
          post
        );

      }
    );

  }


  if (image) {

    image.addEventListener(
      "click",
      () => openImage(image.src)
    );

  }

}


/* =========================
   LOAD MORE
========================= */

function loadMorePosts() {

  visiblePosts += POSTS_PER_PAGE;

  renderPosts();

}


/* =========================
   SHARE
========================= */

async function sharePost(post) {

  const url =
    getVkPostUrl(post);

  const text =
    post.text
      ? post.text.slice(0, 180)
      : "National Geographic";

  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title:
          "National Geographic",
        text,
        url
      });

      return;

    } catch (error) {}

  }

  try {

    await navigator.clipboard.writeText(
      url
    );

    showToast(
      "Ссылка скопирована"
    );

  } catch (error) {

    window.open(
      url,
      "_blank",
      "noopener"
    );

  }

}


/* =========================
   IMAGE VIEWER
========================= */

function openImage(src) {

  const overlay =
    document.createElement("div");

  overlay.style.cssText = `
    position:fixed;
    inset:0;
    z-index:5000;
    background:rgba(0,0,0,.96);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    cursor:zoom-out;
  `;

  overlay.innerHTML = `
    <img
      src="${escapeAttribute(src)}"
      style="
        max-width:100%;
        max-height:100%;
        object-fit:contain;
      "
      alt=""
    >
  `;

  overlay.addEventListener(
    "click",
    () => overlay.remove()
  );

  document.body.appendChild(
    overlay
  );

}


/* =========================
   POST MENU
========================= */

function showPostMenu(button, post) {

  closePostMenu();

  const menu =
    document.createElement("div");

  menu.className =
    "postPopupMenu";

  menu.innerHTML = `

    <button data-action="copy">
      Копировать текст
    </button>

    <button data-action="vk">
      Открыть в VK
    </button>

  `;

  document.body.appendChild(menu);

  const rect =
    button.getBoundingClientRect();

  menu.style.top =
    `${rect.bottom + 6}px`;

  menu.style.left =
    `${Math.max(
      10,
      rect.right - 180
    )}px`;


  menu.addEventListener(
    "click",
    async event => {

      const action =
        event.target.dataset.action;

      if (action === "copy") {

        try {

          await navigator.clipboard.writeText(
            post.text || ""
          );

          showToast(
            "Текст скопирован"
          );

        } catch (error) {

          showToast(
            "Не удалось скопировать"
          );

        }

      }

      if (action === "vk") {

        window.open(
          getVkPostUrl(post),
          "_blank",
          "noopener"
        );

      }

      closePostMenu();

    }
  );

  setTimeout(() => {

    document.addEventListener(
      "click",
      closePostMenu,
      {
        once: true
      }
    );

  }, 0);

}


function closePostMenu() {

  document
    .querySelectorAll(".postPopupMenu")
    .forEach(menu => menu.remove());

}


/* =========================
   IMAGE / VIDEO
========================= */

function getImageUrl(post) {

  const possible = [

    post.image_url,
    post.image,
    post.photo,
    post.photo_url,
    post.imageUrl

  ];

  for (const value of possible) {

    if (
      typeof value === "string" &&
      value.trim()
    ) {

      return value.trim();

    }

  }

  if (
    Array.isArray(post.attachments)
  ) {

    for (
      const attachment
      of post.attachments
    ) {

      if (
        attachment.type === "photo"
      ) {

        const photo =
          attachment.photo;

        if (
          photo?.sizes &&
          photo.sizes.length
        ) {

          return photo.sizes[
            photo.sizes.length - 1
          ].url;

        }

      }

    }

  }

  return null;
}


function getVideoUrl(post) {

  const possible = [

    post.video_url,
    post.videoUrl,
    post.video_mp4,
    post.video_url_hd

  ];

  for (const value of possible) {

    if (
      typeof value === "string" &&
      value.trim()
    ) {

      return value.trim();

    }

  }

  if (
    typeof post.video === "string"
  ) {

    return post.video;

  }

  if (
    post.video?.url
  ) {

    return post.video.url;

  }

  if (
    Array.isArray(post.attachments)
  ) {

    for (
      const attachment
      of post.attachments
    ) {

      if (
        attachment.type === "video"
      ) {

        if (
          attachment.video?.player
        ) {

          return attachment.video.player;

        }

      }

    }

  }

  return null;
}


/* =========================
   VK URL
========================= */

function getVkPostUrl(post) {

  if (post.vk_url) {
    return post.vk_url;
  }

  const vkId =
    String(
      post.vk_id || ""
    );

  const match =
    vkId.match(
      /^(-?\d+)_(\d+)$/
    );

  if (match) {

    return `https://vk.com/wall${match[1]}_${match[2]}`;

  }

  return VK_GROUP_URL;
}


/* =========================
   DATE
========================= */

function formatDate(value) {

  if (!value) {
    return "";
  }

  let date;

  if (
    typeof value === "number" ||
    /^\d+$/.test(String(value))
  ) {

    date =
      new Date(
        Number(value) * 1000
      );

  } else {

    date =
      new Date(value);

  }

  if (
    Number.isNaN(date.getTime())
  ) {

    return String(value);

  }

  return date.toLocaleDateString(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );
}


/* =========================
   NAVIGATION
========================= */

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


/* =========================
   MOBILE MENU
========================= */

function setupMobileMenu() {

  if (!mobileMenuButton) {
    return;
  }

  mobileMenuButton.addEventListener(
    "click",
    () => {

      mobileMenu.classList.toggle(
        "active"
      );

    }
  );

}


function closeMobileMenu() {

  if (mobileMenu) {

    mobileMenu.classList.remove(
      "active"
    );

  }

}


/* =========================
   BACK TO TOP
========================= */

function setupBackToTop() {

  window.addEventListener(
    "scroll",
    () => {

      if (
        window.scrollY > 600
      ) {

        backToTop.classList.add(
          "visible"
        );

      } else {

        backToTop.classList.remove(
          "visible"
        );

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


/* =========================
   TOAST
========================= */

let toastTimer;

function showToast(message) {

  if (!toast) {
    return;
  }

  clearTimeout(
    toastTimer
  );

  toast.textContent =
    message;

  toast.classList.add(
    "visible"
  );

  toastTimer =
    setTimeout(() => {

      toast.classList.remove(
        "visible"
      );

    }, 2200);

}


/* =========================
   ESCAPE
========================= */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

  return escapeHtml(value);

}


/* =========================
   AUTO REFRESH
========================= */

setInterval(
  () => {

    loadPosts();

  },
  5 * 60 * 1000
);
