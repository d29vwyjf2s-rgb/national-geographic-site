/* =========================================================
   NATIONAL GEOGRAPHIC — SITE v5.3
   VK STYLE FEED
========================================================= */

const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const FAVORITES_KEY = "ng_favorites";
const LIKES_KEY = "ng_likes";

let allPosts = [];
let visiblePosts = 10;
let activeCategory = "Все";
let searchText = "";
let isLoading = false;


/* =========================================================
   ELEMENTS
========================================================= */

const postsContainer = document.getElementById("posts");
const photoGallery = document.getElementById("photoGallery");
const postSearch = document.getElementById("postSearch");
const refreshButton = document.getElementById("refreshButton");
const refreshTime = document.getElementById("refreshTime");
const resultCount = document.getElementById("resultCount");
const postsCount = document.getElementById("postsCount");
const photosCount = document.getElementById("photosCount");
const galleryPhotosCount = document.getElementById("galleryPhotosCount");
const year = document.getElementById("year");
const backToTop = document.getElementById("backToTop");
const menu = document.getElementById("menu");
const links = document.getElementById("links");
const mobileNav = document.getElementById("mobileNav");


if (year) {
  year.textContent = new Date().getFullYear();
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function getFavorites() {

  try {
    return JSON.parse(
      localStorage.getItem(FAVORITES_KEY) || "[]"
    );
  }

  catch {
    return [];
  }

}


function saveFavorites(list) {

  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(list)
  );

}


function isFavorite(id) {

  return getFavorites().includes(
    String(id)
  );

}


function toggleFavorite(id) {

  const favorites = getFavorites();

  const stringId = String(id);

  const index = favorites.indexOf(stringId);

  if (index >= 0) {
    favorites.splice(index, 1);
  }

  else {
    favorites.push(stringId);
  }

  saveFavorites(favorites);

  renderPosts();

}


function getLikes() {

  try {
    return JSON.parse(
      localStorage.getItem(LIKES_KEY) || "[]"
    );
  }

  catch {
    return [];
  }

}


function saveLikes(list) {

  localStorage.setItem(
    LIKES_KEY,
    JSON.stringify(list)
  );

}


function isLiked(id) {

  return getLikes().includes(
    String(id)
  );

}


function toggleLike(id) {

  const likes = getLikes();

  const stringId = String(id);

  const index = likes.indexOf(stringId);

  if (index >= 0) {
    likes.splice(index, 1);
  }

  else {
    likes.push(stringId);
  }

  saveLikes(likes);

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


function truncateText(text, length = 250) {

  const clean = cleanText(text);

  if (clean.length <= length) {
    return clean;
  }

  return clean
    .substring(0, length)
    .trim() + "…";

}


/* =========================================================
   VK LINK
========================================================= */

function getPostLink(post) {

  if (
    post &&
    post.vk_id &&
    String(post.vk_id).includes("_")
  ) {

    const parts =
      String(post.vk_id).split("_");

    const ownerId = parts[0];
    const postId = parts[1];

    if (ownerId && postId) {

      return (
        "https://vk.ru/wall" +
        ownerId +
        "_" +
        postId
      );

    }

  }

  return "https://vk.ru/national.geograph1c";

}


/* =========================================================
   DATE
========================================================= */

function formatDate(timestamp) {

  if (!timestamp) {
    return "";
  }

  const date =
    new Date(Number(timestamp) * 1000);

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
   MEDIA
========================================================= */

function getImage(post) {

  if (!post) {
    return "";
  }

  return (
    post.image_url ||
    post.image ||
    post.photo ||
    ""
  );

}


function getVideo(post) {

  if (!post) {
    return "";
  }

  return (
    post.video_url ||
    post.video ||
    post.video_player ||
    post.video_link ||
    ""
  );

}


function hasVideo(post) {

  return Boolean(
    getVideo(post)
  );

}


/* =========================================================
   VIDEO
========================================================= */

function renderVideo(post) {

  const video = getVideo(post);

  if (!video) {
    return "";
  }


  const safeVideo =
    escapeHtml(video);


  /*
     Если Worker вернёт прямой MP4
  */

  if (
    /\.mp4($|\?)/i.test(video)
  ) {

    return `
      <div class="vkPostVideo">

        <video
          controls
          playsinline
          preload="metadata"
          src="${safeVideo}"
        ></video>

      </div>
    `;

  }


  /*
     Если Worker вернёт VK player URL
  */

  return `
    <div class="vkPostVideo">

      <iframe
        src="${safeVideo}"
        title="Видео VK"
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowfullscreen
        frameborder="0"
      ></iframe>

    </div>
  `;

}


/* =========================================================
   POST MEDIA
========================================================= */

function renderPostMedia(post) {

  const image =
    getImage(post);

  const video =
    getVideo(post);


  let html = "";


  if (image) {

    html += `
      <div class="vkPostImage">

        <img
          src="${escapeHtml(image)}"
          alt="National Geographic"
          loading="lazy"
          onerror="this.parentElement.classList.add('mediaError');"
        >

      </div>
    `;

  }


  if (video) {

    html += renderVideo(post);

  }


  if (!html) {

    html = `
      <div class="vkPostPlaceholder">

        <div class="placeholderLogo">

          <i></i>

          <span>
            NATIONAL
            <br>
            <b>GEOGRAPHIC</b>
          </span>

        </div>

      </div>
    `;

  }


  return html;

}


/* =========================================================
   POST MENU
========================================================= */

function openPostMenu(id) {

  closePostMenus();

  const post =
    allPosts.find(
      item => Number(item.id) === Number(id)
    );

  if (!post) {
    return;
  }


  const link =
    getPostLink(post);


  const menu = document.createElement("div");

  menu.className =
    "postPopupMenu";


  menu.innerHTML = `

    <button
      onclick="copyPostLink(${Number(id)})"
    >
      🔗 Скопировать ссылку
    </button>

    <button
      onclick="sharePost(${Number(id)})"
    >
      ↗ Поделиться
    </button>

    <a
      href="${escapeHtml(link)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      VK ↗ Открыть пост
    </a>

  `;


  const button =
    document.querySelector(
      `[data-menu-id="${Number(id)}"]`
    );


  if (!button) {
    return;
  }


  const rect =
    button.getBoundingClientRect();


  menu.style.position =
    "fixed";

  menu.style.top =
    (rect.bottom + 6) + "px";

  menu.style.right =
    (window.innerWidth - rect.right) + "px";


  document.body.appendChild(menu);

}


function closePostMenus() {

  document
    .querySelectorAll(".postPopupMenu")
    .forEach(item => item.remove());

}


document.addEventListener(
  "click",
  event => {

    if (
      !event.target.closest(".vkPostMenu") &&
      !event.target.closest(".postPopupMenu")
    ) {

      closePostMenus();

    }

  }
);


/* =========================================================
   POST
========================================================= */

function createPost(post) {

  const text =
    cleanText(post.text);

  const image =
    getImage(post);

  const video =
    getVideo(post);

  const link =
    getPostLink(post);

  const favorite =
    isFavorite(post.id);

  const liked =
    isLiked(post.id);


  return `

    <article
      class="vkPost"
      data-post-id="${Number(post.id)}"
    >

      <div class="vkPostHeader">

        <div class="vkPostIdentity">

          <div class="vkCommunityAvatar">
            NG
          </div>


          <div class="vkPostAuthor">

            <strong>
              National Geographic
              <span class="verified">✓</span>
            </strong>

            <span>
              Сообщество · ${escapeHtml(
                formatDate(post.post_date)
              )}
            </span>

          </div>

        </div>


        <button
          class="vkPostMenu"
          data-menu-id="${Number(post.id)}"
          onclick="event.stopPropagation(); openPostMenu(${Number(post.id)})"
          aria-label="Меню"
        >
          •••
        </button>

      </div>


      <div class="vkPostContent">

        ${
          text
            ? `
              <div class="vkPostText">
                ${escapeHtml(text)}
              </div>
            `
            : ""
        }


        ${
          image || video
            ? renderPostMedia(post)
            : `
              <div class="vkPostPlaceholder">

                <div class="placeholderLogo">

                  <i></i>

                  <span>
                    NATIONAL
                    <br>
                    <b>GEOGRAPHIC</b>
                  </span>

                </div>

              </div>
            `
        }


        <div class="vkPostActions">

          <button
            class="vkAction ${liked ? "liked" : ""}"
            onclick="toggleLike(${Number(post.id)})"
          >
            ${liked ? "♥" : "♡"}
            Нравится
          </button>


          <a
            class="vkAction"
            href="${escapeHtml(link)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            💬 Комментарии
          </a>


          <button
            class="vkAction"
            onclick="sharePost(${Number(post.id)})"
          >
            ↗ Поделиться
          </button>


          <button
            class="vkAction ${favorite ? "favoriteActive" : ""}"
            onclick="toggleFavorite(${Number(post.id)})"
          >
            ${favorite ? "★" : "☆"}
            Избранное
          </button>

        </div>


        <div class="vkPostBottom">

          <a
            href="${escapeHtml(link)}"
            target="_blank"
            rel="noopener noreferrer"
            class="vkOpenPost"
          >
            Открыть оригинал в VK ↗
          </a>

        </div>

      </div>

    </article>

  `;

}


/* =========================================================
   FILTER
========================================================= */

function getFilteredPosts() {

  const favorites =
    getFavorites();


  return allPosts.filter(post => {

    const text =
      cleanText(post.text)
        .toLowerCase();


    const searchMatch =
      !searchText ||
      text.includes(
        searchText.toLowerCase()
      );


    let categoryMatch = true;


    if (
      activeCategory === "Избранное"
    ) {

      categoryMatch =
        favorites.includes(
          String(post.id)
        );

    }


    return (
      searchMatch &&
      categoryMatch
    );

  });

}


/* =========================================================
   RENDER POSTS
========================================================= */

function renderPosts() {

  if (!postsContainer) {
    return;
  }


  const filtered =
    getFilteredPosts();


  if (resultCount) {

    resultCount.textContent =
      filtered.length;

  }


  if (!filtered.length) {

    postsContainer.innerHTML = `

      <div class="emptyState">

        <div class="emptyIcon">
          🔎
        </div>

        <h3>
          Ничего не найдено
        </h3>

        <p>
          Попробуйте изменить поиск.
        </p>

        <button
          onclick="resetFilters()"
        >
          СБРОСИТЬ
        </button>

      </div>

    `;

    return;

  }


  const posts =
    filtered.slice(
      0,
      visiblePosts
    );


  postsContainer.innerHTML =
    posts
      .map(createPost)
      .join("");


  if (
    filtered.length >
    visiblePosts
  ) {

    postsContainer.innerHTML += `

      <div class="loadMoreWrap">

        <button
          class="loadMore"
          onclick="loadMorePosts()"
        >
          ПОКАЗАТЬ ЕЩЁ
        </button>

        <span>
          Показано
          ${posts.length}
          из
          ${filtered.length}
        </span>

      </div>

    `;

  }

}


/* =========================================================
   LOAD MORE
========================================================= */

function loadMorePosts() {

  visiblePosts += 10;

  renderPosts();

}


/* =========================================================
   RESET
========================================================= */

function resetFilters() {

  activeCategory = "Все";

  searchText = "";

  visiblePosts = 10;


  if (postSearch) {

    postSearch.value = "";

  }


  document
    .querySelectorAll(".categoryBtn")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.category === "Все"
      );

    });


  renderPosts();

}


/* =========================================================
   SHARE
========================================================= */

async function sharePost(id) {

  const post =
    allPosts.find(
      item => Number(item.id) === Number(id)
    );


  if (!post) {
    return;
  }


  const link =
    getPostLink(post);


  const title =
    truncateText(
      cleanText(post.text) ||
      "National Geographic",
      100
    );


  if (
    navigator.share
  ) {

    try {

      await navigator.share({

        title:
          "National Geographic",

        text:
          title,

        url:
          link

      });

      return;

    }

    catch {}

  }


  await copyText(link);

  showStatus(
    "Ссылка скопирована"
  );

}


/* =========================================================
   COPY
========================================================= */

async function copyPostLink(id) {

  const post =
    allPosts.find(
      item => Number(item.id) === Number(id)
    );


  if (!post) {
    return;
  }


  const link =
    getPostLink(post);


  await copyText(link);


  showStatus(
    "Ссылка скопирована"
  );

}


async function copyText(text) {

  try {

    await navigator.clipboard.writeText(
      text
    );

    return true;

  }

  catch {

    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      text;

    textarea.style.position =
      "fixed";

    textarea.style.opacity =
      "0";


    document.body.appendChild(
      textarea
    );

    textarea.select();


    try {

      document.execCommand(
        "copy"
      );

      textarea.remove();

      return true;

    }

    catch {

      textarea.remove();

      return false;

    }

  }

}


function showStatus(message) {

  let status =
    document.getElementById(
      "siteStatus"
    );


  if (!status) {

    status =
      document.createElement(
        "div"
      );

    status.id =
      "siteStatus";

    document.body.appendChild(
      status
    );

  }


  status.textContent =
    message;

  status.classList.add(
    "show"
  );


  setTimeout(() => {

    status.classList.remove(
      "show"
    );

  }, 2200);

}


/* =========================================================
   GALLERY
========================================================= */

function renderGallery() {

  if (!photoGallery) {
    return;
  }


  const photoPosts =
    allPosts.filter(
      post => Boolean(
        getImage(post)
      )
    );


  if (photosCount) {

    photosCount.textContent =
      photoPosts.length;

  }


  if (galleryPhotosCount) {

    galleryPhotosCount.textContent =
      photoPosts.length;

  }


  if (!photoPosts.length) {

    photoGallery.innerHTML = `

      <div class="galleryEmpty">

        <span>
          📷
        </span>

        <p>
          Фотографии появятся
          вместе с новыми публикациями.
        </p>

      </div>

    `;

    return;

  }


  photoGallery.innerHTML =
    photoPosts
      .slice(0, 20)
      .map(post => {

        const image =
          getImage(post);

        return `

          <button
            class="photoItem"
            onclick="openPost(${Number(post.id)})"
          >

            <img
              src="${escapeHtml(image)}"
              alt="National Geographic"
              loading="lazy"
            >

          </button>

        `;

      })
      .join("");

}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

  if (postsCount) {

    postsCount.textContent =
      allPosts.length;

  }


  const photoCount =
    allPosts.filter(
      post => Boolean(
        getImage(post)
      )
    ).length;


  if (photosCount) {

    photosCount.textContent =
      photoCount;

  }


  if (galleryPhotosCount) {

    galleryPhotosCount.textContent =
      photoCount;

  }

}


/* =========================================================
   REFRESH TIME
========================================================= */

function updateRefreshTime() {

  if (!refreshTime) {
    return;
  }


  const now =
    new Date();


  refreshTime.textContent =
    "Обновлено " +
    now.toLocaleTimeString(
      "ru-RU",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

}


/* =========================================================
   API
========================================================= */

async function loadPosts() {

  if (isLoading) {
    return;
  }


  isLoading = true;


  if (refreshButton) {

    refreshButton.disabled =
      true;

    refreshButton.classList.add(
      "loading"
    );

  }


  try {

    const response =
      await fetch(
        API_URL +
        "?t=" +
        Date.now(),
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status
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
      data.posts
        .filter(Boolean)
        .sort(
          (a, b) =>
            Number(
              b.post_date || 0
            ) -
            Number(
              a.post_date || 0
            )
        );


    visiblePosts = 10;


    updateStats();

    renderPosts();

    renderGallery();

    updateRefreshTime();


  }

  catch (error) {

    console.error(
      "National Geographic API:",
      error
    );


    if (
      !allPosts.length &&
      postsContainer
    ) {

      postsContainer.innerHTML = `

        <div class="errorState">

          <div class="emptyIcon">
            ⚠️
          </div>

          <h3>
            Не удалось загрузить публикации
          </h3>

          <p>
            Проверьте соединение
            и попробуйте ещё раз.
          </p>

          <button
            onclick="loadPosts()"
          >
            ПОВТОРИТЬ
          </button>

        </div>

      `;

    }


    if (refreshTime) {

      refreshTime.textContent =
        "Ошибка обновления";

    }

  }


  finally {

    isLoading =
      false;


    if (refreshButton) {

      refreshButton.disabled =
        false;

      refreshButton.classList.remove(
        "loading"
      );

    }

  }

}


/* =========================================================
   CATEGORY BUTTONS
========================================================= */

function setupCategoryButtons() {

  document
    .querySelectorAll(
      ".categoryBtn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          activeCategory =
            button.dataset.category ||
            "Все";

          visiblePosts = 10;


          document
            .querySelectorAll(
              ".categoryBtn"
            )
            .forEach(item => {

              item.classList.toggle(
                "active",
                item === button
              );

            });


          renderPosts();

        }
      );

    });

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

  if (!postSearch) {
    return;
  }


  postSearch.addEventListener(
    "input",
    event => {

      searchText =
        event.target.value.trim();

      visiblePosts = 10;

      renderPosts();

    }
  );

}


/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {

  if (!menu || !links) {
    return;
  }


  menu.addEventListener(
    "click",
    () => {

      links.classList.toggle(
        "open"
      );

      menu.classList.toggle(
        "active"
      );

    }
  );


  links
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        () => {

          links.classList.remove(
            "open"
          );

          menu.classList.remove(
            "active"
          );

        }
      );

    });

}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function setupMobileNavigation() {

  if (!mobileNav) {
    return;
  }


  const items =
    mobileNav.querySelectorAll(
      ".mobileNavItem"
    );


  items.forEach(item => {

    item.addEventListener(
      "click",
      event => {

        event.preventDefault();


        const targetId =
          item.dataset.mobileTarget;


        const target =
          document.getElementById(
            targetId
          );


        if (!target) {
          return;
        }


        items.forEach(
          navItem =>
            navItem.classList.remove(
              "active"
            )
        );


        item.classList.add(
          "active"
        );


        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      }
    );

  });


  updateMobileNavigation();

}


function updateMobileNavigation() {

  if (!mobileNav) {
    return;
  }


  const items =
    mobileNav.querySelectorAll(
      ".mobileNavItem"
    );


  const sections = [
    "home",
    "latest",
    "photos",
    "about"
  ];


  let current =
    "home";


  const scrollPosition =
    window.scrollY +
    window.innerHeight *
    0.35;


  sections.forEach(id => {

    const section =
      document.getElementById(id);


    if (
      section &&
      section.offsetTop <=
      scrollPosition
    ) {

      current =
        id;

    }

  });


  items.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset.mobileTarget ===
      current
    );

  });

}


/* =========================================================
   BACK TO TOP
========================================================= */

function setupBackToTop() {

  if (!backToTop) {
    return;
  }


  window.addEventListener(
    "scroll",
    () => {

      backToTop.classList.toggle(
        "show",
        window.scrollY > 600
      );

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
   SMOOTH LINKS
========================================================= */

function setupSmoothLinks() {

  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach(link => {

      link.addEventListener(
        "click",
        event => {

          const href =
            link.getAttribute(
              "href"
            );


          if (
            !href ||
            href === "#"
          ) {
            return;
          }


          const target =
            document.querySelector(
              href
            );


          if (!target) {
            return;
          }


          event.preventDefault();


          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }
      );

    });

}


/* =========================================================
   AUTO UPDATE
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      loadPosts();

    }

  }
);


setInterval(
  () => loadPosts(),
  5 * 60 * 1000
);


window.addEventListener(
  "scroll",
  updateMobileNavigation,
  {
    passive: true
  }
);


if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    () => loadPosts()
  );

}


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupCategoryButtons();

    setupSearch();

    setupMobileMenu();

    setupMobileNavigation();

    setupBackToTop();

    setupSmoothLinks();

    loadPosts();

  }
);


/* =========================================================
   GLOBAL
========================================================= */

window.toggleLike =
  toggleLike;

window.toggleFavorite =
  toggleFavorite;

window.openPostMenu =
  openPostMenu;

window.sharePost =
  sharePost;

window.copyPostLink =
  copyPostLink;

window.loadMorePosts =
  loadMorePosts;

window.resetFilters =
  resetFilters;

window.loadPosts =
  loadPosts;
