/* =========================================================
   NATIONAL GEOGRAPHIC — SITE v3.0
   API: Cloudflare Worker
========================================================= */

const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const FAVORITES_KEY = "ng_favorites";

let allPosts = [];
let visiblePosts = 6;

let activeCategory = "Все";
let searchText = "";

let isLoading = false;


/* =========================================================
   DOM
========================================================= */

const postsContainer =
  document.getElementById("posts");

const featuredContainer =
  document.getElementById("featuredPost");

const photoGallery =
  document.getElementById("photoGallery");

const postSearch =
  document.getElementById("postSearch");

const refreshButton =
  document.getElementById("refreshButton");

const refreshTime =
  document.getElementById("refreshTime");

const resultCount =
  document.getElementById("resultCount");

const postsCount =
  document.getElementById("postsCount");

const photosCount =
  document.getElementById("photosCount");

const categoriesCount =
  document.getElementById("categoriesCount");

const year =
  document.getElementById("year");

const backToTop =
  document.getElementById("backToTop");

const menu =
  document.getElementById("menu");

const links =
  document.getElementById("links");

const mobileNav =
  document.getElementById("mobileNav");


/* =========================================================
   YEAR
========================================================= */

if (year) {
  year.textContent = new Date().getFullYear();
}


/* =========================================================
   FAVORITES
========================================================= */

function getFavorites() {

  try {

    return JSON.parse(
      localStorage.getItem(FAVORITES_KEY) || "[]"
    );

  } catch {

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

  return getFavorites().includes(String(id));

}


function toggleFavorite(id) {

  const favorites = getFavorites();

  const stringId = String(id);

  const index =
    favorites.indexOf(stringId);

  if (index >= 0) {

    favorites.splice(index, 1);

  } else {

    favorites.push(stringId);

  }

  saveFavorites(favorites);

  renderPosts();

}


/* =========================================================
   TEXT HELPERS
========================================================= */

function cleanText(text) {

  if (!text) {
    return "";
  }

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


function truncateText(text, length = 220) {

  const clean =
    cleanText(text);

  if (clean.length <= length) {
    return clean;
  }

  return (
    clean.substring(0, length).trim() +
    "…"
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
    new Date(Number(timestamp) * 1000);

  if (Number.isNaN(date.getTime())) {
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

    const ownerId =
      parts[0];

    const postId =
      parts[1];

    if (ownerId && postId) {

      return (
        "https://vk.com/wall" +
        ownerId +
        "_" +
        postId
      );

    }

  }

  return "https://vk.ru/national.geograph1c";

}


/* =========================================================
   IMAGE
========================================================= */

function getImage(post) {

  if (!post) {
    return "";
  }

  return (
    post.image_url ||
    post.image ||
    post.photo ||
    post.cover ||
    ""
  );

}


/* =========================================================
   CATEGORY DETECTION
========================================================= */

const categoryKeywords = {

  "Природа": [
    "природ",
    "гора",
    "горы",
    "лес",
    "озер",
    "озеро",
    "река",
    "водопад",
    "вулкан",
    "ледник",
    "пустын",
    "пейзаж",
    "тайга",
    "долин",
    "скал",
    "остров"
  ],

  "Путешествия": [
    "путешеств",
    "туризм",
    "маршрут",
    "поездк",
    "дорог",
    "пут",
    "отправ",
    "тур",
    "экспедиц",
    "место",
    "страна"
  ],

  "Россия": [
    "росси",
    "алтай",
    "байкал",
    "крым",
    "курил",
    "примор",
    "камчат",
    "сибир",
    "кавказ",
    "якут",
    "мурман",
    "сахалин"
  ],

  "Мир": [
    "мир",
    "европ",
    "ази",
    "африк",
    "америк",
    "австрал",
    "канад",
    "америк",
    "япон",
    "норвег",
    "исланд",
    "франци",
    "итал"
  ],

  "Животные": [
    "животн",
    "медвед",
    "тигр",
    "леопард",
    "волк",
    "лиса",
    "олень",
    "кит",
    "дельфин",
    "акул",
    "птиц",
    "орел",
    "сокол",
    "кот",
    "собак",
    "слон",
    "жираф",
    "панд"
  ]

};


function detectCategory(post) {

  const text = (
    cleanText(post.text) +
    " " +
    cleanText(post.title)
  ).toLowerCase();

  let bestCategory = "Мир";
  let bestScore = 0;

  for (
    const [category, words]
    of Object.entries(categoryKeywords)
  ) {

    let score = 0;

    words.forEach(word => {

      if (text.includes(word)) {
        score++;
      }

    });

    if (score > bestScore) {

      bestScore = score;
      bestCategory = category;

    }

  }

  return bestCategory;

}


/* =========================================================
   CATEGORY ICON
========================================================= */

function categoryIcon(category) {

  const icons = {

    "Природа": "🏔️",
    "Путешествия": "✈️",
    "Россия": "🇷🇺",
    "Мир": "🌍",
    "Животные": "🐾"

  };

  return icons[category] || "🌍";

}


/* =========================================================
   FILTER
========================================================= */

function getFilteredPosts() {

  const favorites =
    getFavorites();

  return allPosts.filter(post => {

    const category =
      detectCategory(post);

    const text =
      cleanText(post.text).toLowerCase();

    const searchMatch =
      !searchText ||
      text.includes(searchText.toLowerCase()) ||
      category.toLowerCase().includes(
        searchText.toLowerCase()
      );

    let categoryMatch = true;

    if (activeCategory !== "Все") {

      if (activeCategory === "Избранное") {

        categoryMatch =
          favorites.includes(
            String(post.id)
          );

      } else {

        categoryMatch =
          category === activeCategory;

      }

    }

    return (
      searchMatch &&
      categoryMatch
    );

  });

}


/* =========================================================
   FEATURED POST
========================================================= */

function renderFeaturedPost() {

  if (!featuredContainer) {
    return;
  }

  if (!allPosts.length) {

    featuredContainer.innerHTML = `
      <div class="emptyState">
        Пока нет публикаций
      </div>
    `;

    return;
  }


  const post =
    allPosts[0];

  const text =
    cleanText(post.text);

  const image =
    getImage(post);

  const category =
    detectCategory(post);

  const favorite =
    isFavorite(post.id);

  const link =
    getPostLink(post);


  featuredContainer.innerHTML = `

    <article class="featuredCard">

      <div class="featuredImage">

        ${
          image
            ? `
              <img
                src="${escapeHtml(image)}"
                alt="${escapeHtml(
                  truncateText(text, 80)
                )}"
                loading="eager"
              >
            `
            : `
              <div class="featuredPlaceholder">
                <span>
                  ${categoryIcon(category)}
                </span>
              </div>
            `
        }

      </div>


      <div class="featuredContent">

        <div class="postMeta">

          <span class="tag">
            ${categoryIcon(category)}
            ${escapeHtml(category)}
          </span>

          <span>
            ${formatDate(post.post_date)}
          </span>

        </div>


        <h3>

          ${
            escapeHtml(
              truncateText(text || "Новый материал", 140)
            )
          }

        </h3>


        <p>

          ${
            escapeHtml(
              truncateText(
                text || "Откройте публикацию, чтобы узнать больше.",
                260
              )
            )
          }

        </p>


        <div class="featuredActions">

          <button
            class="readButton"
            onclick="openPost(${Number(post.id)})"
          >
            ЧИТАТЬ →
          </button>


          <button
            class="favoriteButton ${
              favorite ? "active" : ""
            }"
            onclick="toggleFavorite(${Number(post.id)})"
            aria-label="Добавить в избранное"
          >
            ${favorite ? "★" : "☆"}
          </button>


          <a
            class="vkButton"
            href="${escapeHtml(link)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            VK ↗
          </a>

        </div>

      </div>

    </article>

  `;

}


/* =========================================================
   POST CARD
========================================================= */

function createPost(post) {

  const text =
    cleanText(post.text);

  const image =
    getImage(post);

  const category =
    detectCategory(post);

  const favorite =
    isFavorite(post.id);

  const link =
    getPostLink(post);


  return `

    <article
      class="card"
      data-post-id="${Number(post.id)}"
    >

      <div
        class="cardImage"
        onclick="openPost(${Number(post.id)})"
      >

        ${
          image
            ? `
              <img
                src="${escapeHtml(image)}"
                alt="${escapeHtml(
                  truncateText(text, 80)
                )}"
                loading="lazy"
                onerror="this.parentElement.classList.add('imageError'); this.remove();"
              >
            `
            : `
              <div class="cardPlaceholder">

                <span>
                  ${categoryIcon(category)}
                </span>

                <small>
                  NATIONAL GEOGRAPHIC
                </small>

              </div>
            `
        }


        <div class="cardCategory">

          ${categoryIcon(category)}

          ${escapeHtml(category)}

        </div>


        <button
          class="cardFavorite ${
            favorite ? "active" : ""
          }"
          onclick="
            event.stopPropagation();
            toggleFavorite(${Number(post.id)});
          "
          aria-label="Избранное"
        >
          ${favorite ? "★" : "☆"}
        </button>

      </div>


      <div class="cardBody">


        <div class="cardDate">

          ${formatDate(post.post_date)}

        </div>


        <h3
          onclick="openPost(${Number(post.id)})"
        >

          ${
            escapeHtml(
              truncateText(
                text || "Без названия",
                120
              )
            )
          }

        </h3>


        <p>

          ${
            escapeHtml(
              truncateText(
                text ||
                "Откройте материал, чтобы узнать подробности.",
                190
              )
            )
          }

        </p>


        <div class="cardFooter">


          <button
            class="moreButton"
            onclick="openPost(${Number(post.id)})"
          >
            СМОТРЕТЬ →
          </button>


          <a
            href="${escapeHtml(link)}"
            target="_blank"
            rel="noopener noreferrer"
            onclick="event.stopPropagation();"
          >
            VK ↗
          </a>


        </div>


      </div>

    </article>

  `;

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
          Попробуйте изменить поиск
          или выбрать другую категорию.
        </p>

        <button
          onclick="resetFilters()"
        >
          СБРОСИТЬ ФИЛЬТРЫ
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
    posts.map(createPost).join("");


  if (filtered.length > visiblePosts) {

    postsContainer.innerHTML += `

      <div class="loadMoreWrap">

        <button
          class="loadMore"
          onclick="loadMorePosts()"
        >
          ЗАГРУЗИТЬ ЕЩЁ
        </button>

        <span>
          Показано ${posts.length}
          из ${filtered.length}
        </span>

      </div>

    `;

  }

}


/* =========================================================
   LOAD MORE
========================================================= */

function loadMorePosts() {

  visiblePosts += 6;

  renderPosts();

}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetFilters() {

  activeCategory = "Все";
  searchText = "";
  visiblePosts = 6;

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
   OPEN POST
========================================================= */

function openPost(id) {

  const post =
    allPosts.find(
      item => Number(item.id) === Number(id)
    );

  if (!post) {
    return;
  }


  const text =
    cleanText(post.text);

  const image =
    getImage(post);

  const category =
    detectCategory(post);

  const favorite =
    isFavorite(post.id);

  const link =
    getPostLink(post);


  const modal =
    document.createElement("div");

  modal.className =
    "postModal";


  modal.innerHTML = `

    <div
      class="modalBackdrop"
      onclick="closePostModal()"
    ></div>


    <div
      class="modalWindow"
      role="dialog"
      aria-modal="true"
    >


      <button
        class="modalClose"
        onclick="closePostModal()"
        aria-label="Закрыть"
      >
        ×
      </button>


      ${
        image
          ? `
            <div class="modalImage">

              <img
                src="${escapeHtml(image)}"
                alt="${escapeHtml(
                  truncateText(text, 100)
                )}"
              >

            </div>
          `
          : `
            <div class="modalImage modalPlaceholder">

              <span>
                ${categoryIcon(category)}
              </span>

            </div>
          `
      }


      <div class="modalContent">


        <div class="modalMeta">

          <span class="tag">

            ${categoryIcon(category)}

            ${escapeHtml(category)}

          </span>


          <span>
            ${formatDate(post.post_date)}
          </span>

        </div>


        <h2>
          ${
            escapeHtml(
              truncateText(
                text || "National Geographic",
                180
              )
            )
          }
        </h2>


        <div class="modalText">

          ${
            escapeHtml(
              text ||
              "Подробная информация о публикации."
            )
          }

        </div>


        <div class="modalActions">


          <button
            class="favoriteLarge ${
              favorite ? "active" : ""
            }"
            onclick="
              toggleFavorite(${Number(post.id)});
              refreshOpenModal(${Number(post.id)});
            "
          >
            ${favorite ? "★ В избранном" : "☆ В избранное"}
          </button>


          <button
            class="shareButton"
            onclick="sharePost(${Number(post.id)})"
          >
            ↗ Поделиться
          </button>


          <button
            class="copyButton"
            onclick="copyPostLink(${Number(post.id)})"
          >
            ⧉ Скопировать
          </button>


          <a
            class="vkLarge"
            href="${escapeHtml(link)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ОТКРЫТЬ В VK ↗
          </a>


        </div>


        <div
          class="viewerStatus"
          id="viewerStatus"
        ></div>


      </div>


    </div>

  `;


  document.body.appendChild(modal);

  document.body.classList.add("modalOpen");


  requestAnimationFrame(() => {

    modal.classList.add("visible");

  });


  document.addEventListener(
    "keydown",
    handleModalEscape
  );

}


function handleModalEscape(event) {

  if (event.key === "Escape") {
    closePostModal();
  }

}


function closePostModal() {

  const modal =
    document.querySelector(".postModal");

  if (!modal) {
    return;
  }


  modal.classList.remove("visible");


  setTimeout(() => {

    modal.remove();

    document.body.classList.remove(
      "modalOpen"
    );

  }, 200);


  document.removeEventListener(
    "keydown",
    handleModalEscape
  );

}


function refreshOpenModal(id) {

  closePostModal();

  setTimeout(() => {

    openPost(id);

  }, 220);

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


  if (navigator.share) {

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

    } catch {

      // Пользователь закрыл окно
      // отправки — ничего не делаем.

    }

  }


  await copyText(link);

  showViewerStatus(
    "Ссылка скопирована"
  );

}


/* =========================================================
   COPY LINK
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

  showViewerStatus(
    "Ссылка скопирована"
  );

}


async function copyText(text) {

  try {

    await navigator.clipboard.writeText(
      text
    );

    return true;

  } catch {

    const textarea =
      document.createElement("textarea");

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

    } catch {

      textarea.remove();

      return false;

    }

  }

}


/* =========================================================
   VIEWER STATUS
========================================================= */

function showViewerStatus(message) {

  const status =
    document.getElementById(
      "viewerStatus"
    );

  if (!status) {
    return;
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
      post => Boolean(getImage(post))
    );


  if (photosCount) {

    photosCount.textContent =
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


  const gallery =
    photoPosts.slice(0, 12);


  photoGallery.innerHTML =
    gallery.map((post, index) => {

      const image =
        getImage(post);

      const category =
        detectCategory(post);


      return `

        <button
          class="photoItem photoItem${index + 1}"
          onclick="openPost(${Number(post.id)})"
          aria-label="Открыть фотографию"
        >

          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(
              truncateText(
                post.text ||
                category,
                80
              )
            )}"
            loading="lazy"
          >


          <span class="photoOverlay">

            <strong>
              ${categoryIcon(category)}
            </strong>

            <small>
              ${escapeHtml(category)}
            </small>

          </span>

        </button>

      `;

    }).join("");

}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

  if (postsCount) {

    postsCount.textContent =
      allPosts.length;

  }


  if (categoriesCount) {

    categoriesCount.textContent =
      Object.keys(
        categoryKeywords
      ).length;

  }


  const photoCount =
    allPosts.filter(
      post => Boolean(getImage(post))
    ).length;


  if (photosCount) {

    photosCount.textContent =
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
   LOAD POSTS
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
            Number(b.post_date || 0) -
            Number(a.post_date || 0)
        );


    visiblePosts = 6;


    updateStats();

    renderFeaturedPost();

    renderPosts();

    renderGallery();

    updateRefreshTime();


  } catch (error) {

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
            Не удалось загрузить материалы
          </h3>

          <p>
            Проверьте соединение
            и попробуйте обновить страницу.
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

  } finally {

    isLoading = false;


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
    .querySelectorAll(".categoryBtn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          activeCategory =
            button.dataset.category ||
            "Все";

          visiblePosts = 6;


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

      visiblePosts = 6;

      renderPosts();

    }
  );

}


/* =========================================================
   CATEGORY CARDS
========================================================= */

function setupCategoryCards() {

  document
    .querySelectorAll(
      "[data-jump-category]"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        event => {

          event.preventDefault();


          const category =
            card.dataset.jumpCategory;


          activeCategory =
            category;

          visiblePosts = 6;


          document
            .querySelectorAll(
              ".categoryBtn"
            )
            .forEach(button => {

              button.classList.toggle(
                "active",
                button.dataset.category ===
                category
              );

            });


          renderPosts();


          const latest =
            document.getElementById(
              "latest"
            );


          if (latest) {

            latest.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

          }

        }
      );

    });

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
   MOBILE BOTTOM NAVIGATION
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


        items.forEach(navItem => {

          navItem.classList.remove(
            "active"
          );

        });


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


/* =========================================================
   MOBILE NAV ACTIVE ON SCROLL
========================================================= */

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
    "geography",
    "photos",
    "about"

  ];


  let current =
    "home";


  const scrollPosition =
    window.scrollY +
    window.innerHeight * 0.35;


  sections.forEach(id => {

    const section =
      document.getElementById(id);


    if (!section) {
      return;
    }


    if (
      section.offsetTop <=
      scrollPosition
    ) {

      current = id;

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
   GEOGRAPHY MAP
========================================================= */

function setupGeographyMap() {

  const map =
    document.getElementById(
      "geoMap"
    );


  if (!map) {
    return;
  }


  const points =
    map.querySelectorAll(
      ".mapPoint"
    );


  const places = {

    point1: {
      title: "Алтай",
      text: "Горы, озёра и дикая природа России."
    },

    point2: {
      title: "Курилы",
      text: "Вулканы, океан и островные пейзажи."
    },

    point3: {
      title: "Приморье",
      text: "Тайга встречается с Тихим океаном."
    },

    point4: {
      title: "Байкал",
      text: "Одно из самых известных природных мест России."
    }

  };


  points.forEach(point => {

    const key =
      Array.from(
        point.classList
      ).find(
        className =>
          className.startsWith(
            "point"
          )
      );


    const data =
      places[key];


    if (!data) {
      return;
    }


    point.addEventListener(
      "click",
      event => {

        event.stopPropagation();


        map
          .querySelectorAll(
            ".mapPoint"
          )
          .forEach(item => {

            item.classList.remove(
              "selected"
            );

          });


        point.classList.add(
          "selected"
        );


        showMapTooltip(
          map,
          point,
          data
        );

      }
    );

  });


  map.addEventListener(
    "click",
    event => {

      if (
        !event.target.closest(
          ".mapPoint"
        )
      ) {

        removeMapTooltip(map);

      }

    }
  );

}


function showMapTooltip(
  map,
  point,
  data
) {

  removeMapTooltip(map);


  const tooltip =
    document.createElement(
      "div"
    );


  tooltip.className =
    "geoTooltip";


  tooltip.innerHTML = `

    <strong>
      ${escapeHtml(data.title)}
    </strong>

    <span>
      ${escapeHtml(data.text)}
    </span>

  `;


  map.appendChild(
    tooltip
  );


  const pointRect =
    point.getBoundingClientRect();

  const mapRect =
    map.getBoundingClientRect();


  let left =
    pointRect.left -
    mapRect.left +
    pointRect.width / 2;


  let top =
    pointRect.top -
    mapRect.top -
    12;


  tooltip.style.left =
    left + "px";

  tooltip.style.top =
    top + "px";

}


function removeMapTooltip(map) {

  const tooltip =
    map.querySelector(
      ".geoTooltip"
    );


  if (tooltip) {
    tooltip.remove();
  }


  map
    .querySelectorAll(
      ".mapPoint"
    )
    .forEach(point => {

      point.classList.remove(
        "selected"
      );

    });

}


/* =========================================================
   SMOOTH INTERNAL LINKS
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
   VISIBILITY UPDATE
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


/* =========================================================
   AUTO UPDATE
========================================================= */

setInterval(
  () => {

    loadPosts();

  },
  5 * 60 * 1000
);


/* =========================================================
   SCROLL
========================================================= */

window.addEventListener(
  "scroll",
  updateMobileNavigation,
  {
    passive: true
  }
);


/* =========================================================
   REFRESH BUTTON
========================================================= */

if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    () => {

      loadPosts();

    }
  );

}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupCategoryButtons();

    setupSearch();

    setupCategoryCards();

    setupMobileMenu();

    setupMobileNavigation();

    setupBackToTop();

    setupGeographyMap();

    setupSmoothLinks();

    loadPosts();

  }
);


/* =========================================================
   GLOBAL FUNCTIONS
   Нужны для onclick в HTML
========================================================= */

window.openPost =
  openPost;

window.closePostModal =
  closePostModal;

window.toggleFavorite =
  toggleFavorite;

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
