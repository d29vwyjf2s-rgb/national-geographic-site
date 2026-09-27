const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";


/* =========================
   СОСТОЯНИЕ
========================= */

let allPosts = [];
let visiblePosts = 6;

let activeCategory = "Все";
let searchText = "";

let isLoading = false;


/* =========================
   КАТЕГОРИИ
========================= */

const categories = {

  "Природа": [
    "природ",
    "гора",
    "горы",
    "лес",
    "озеро",
    "река",
    "водопад",
    "океан",
    "море",
    "пустын",
    "вулкан",
    "пейзаж",
    "остров",
    "ледник",
    "парк"
  ],

  "Путешествия": [
    "путешеств",
    "туризм",
    "маршрут",
    "поездк",
    "путешествен",
    "дорог",
    "отправ",
    "курорт",
    "турист"
  ],

  "Россия": [
    "росси",
    "москв",
    "санкт-петербург",
    "петербург",
    "крым",
    "алтай",
    "сибир",
    "кавказ",
    "примор",
    "курил",
    "камчат",
    "байкал"
  ],

  "Мир": [
    "европ",
    "ази",
    "америк",
    "африк",
    "австрали",
    "япони",
    "китай",
    "франци",
    "итал",
    "испан",
    "инд"
  ],

  "Животные": [
    "живот",
    "медвед",
    "тигр",
    "лев",
    "волк",
    "слон",
    "кит",
    "дельфин",
    "акул",
    "птиц",
    "орёл",
    "орел",
    "кот",
    "собак",
    "звер"
  ]

};


/* =========================
   DOM
========================= */

const postsContainer =
  document.querySelector("#posts");

const featuredContainer =
  document.querySelector("#featuredPost");


/* =========================
   TEXT
========================= */

function cleanText(text) {

  if (!text) {
    return "Новая публикация National Geographic";
  }

  return String(text)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}


/* =========================
   DATE
========================= */

function formatDate(timestamp) {

  if (!timestamp) {
    return "";
  }

  return new Date(timestamp * 1000)
    .toLocaleDateString(
      "ru-RU",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );

}


/* =========================
   VK LINK
========================= */

function getPostLink(vkId) {

  if (!vkId) {
    return "https://vk.ru/national.geograph1c";
  }

  const parts =
    String(vkId).split("_");

  if (parts.length === 2) {

    return `https://vk.ru/wall${parts[0]}_${parts[1]}`;

  }

  return "https://vk.ru/national.geograph1c";

}


/* =========================
   CATEGORY
========================= */

function detectCategory(text) {

  const lower =
    cleanText(text).toLowerCase();


  for (const category in categories) {

    for (const word of categories[category]) {

      if (lower.includes(word)) {
        return category;
      }

    }

  }

  return "Мир";

}


/* =========================
   FAVORITES
========================= */

function getFavorites() {

  try {

    return JSON.parse(
      localStorage.getItem(
        "ng_favorites"
      ) || "[]"
    );

  } catch {

    return [];

  }

}


function saveFavorites(list) {

  localStorage.setItem(
    "ng_favorites",
    JSON.stringify(list)
  );

}


function isFavorite(id) {

  return getFavorites()
    .includes(String(id));

}


function toggleFavorite(id) {

  const favorites =
    getFavorites();

  const value =
    String(id);

  const index =
    favorites.indexOf(value);


  if (index === -1) {

    favorites.push(value);

  } else {

    favorites.splice(index, 1);

  }


  saveFavorites(favorites);

  renderPosts();

}


/* =========================
   FILTER
========================= */

function getFilteredPosts() {

  let posts =
    [...allPosts];


  if (
    activeCategory ===
    "Избранное"
  ) {

    posts =
      posts.filter(
        post =>
          isFavorite(post.id)
      );

  }


  else if (
    activeCategory !==
    "Все"
  ) {

    posts =
      posts.filter(
        post =>
          detectCategory(
            post.text
          ) === activeCategory
      );

  }


  if (searchText.trim()) {

    const query =
      searchText
        .toLowerCase()
        .trim();


    posts =
      posts.filter(
        post =>
          cleanText(post.text)
            .toLowerCase()
            .includes(query)
      );

  }


  return posts;

}


/* =========================
   IMAGE
========================= */

function getImage(post) {

  if (!post) {
    return null;
  }

  return (
    post.image_url ||
    post.image ||
    post.photo ||
    null
  );

}


/* =========================
   FEATURED
========================= */

function renderFeaturedPost() {

  if (
    !featuredContainer ||
    !allPosts.length
  ) {
    return;
  }


  const post =
    allPosts[0];

  const text =
    cleanText(post.text);

  const image =
    getImage(post);

  const date =
    formatDate(post.post_date);

  const category =
    detectCategory(text);


  featuredContainer.innerHTML = `

    <article class="featuredPost">

      <div
        class="featuredImage ${image ? "" : "noImage"}"
        ${
          image
            ? `style="background-image:url('${image}')"`
            : ""
        }
      >

        ${
          !image
            ? `
              <span>
                NATIONAL GEOGRAPHIC
              </span>
            `
            : ""
        }

      </div>


      <div class="featuredContent">

        <span class="featuredCategory">
          ${category}
        </span>

        <h3>
          ${escapeHtml(text)}
        </h3>

        <div class="featuredDate">
          ${date}
        </div>

        <div class="featuredActions">

          <button
            class="featuredButton"
            id="openFeatured"
          >
            ЧИТАТЬ МАТЕРИАЛ →
          </button>

          <button
            class="favoriteButton featuredFavorite"
            data-favorite="${post.id}"
          >
            ${isFavorite(post.id) ? "★" : "☆"}
          </button>

        </div>

      </div>

    </article>

  `;


  document
    .querySelector("#openFeatured")
    .onclick =
    () => openPost(post);


  document
    .querySelector("[data-favorite]")
    .onclick =
    event => {

      event.stopPropagation();

      toggleFavorite(post.id);

    };

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================
   POST CARD
========================= */

function createPost(post) {

  const text =
    cleanText(post.text);

  const image =
    getImage(post);

  const date =
    formatDate(post.post_date);

  const category =
    detectCategory(text);

  const favorite =
    isFavorite(post.id);


  return `

    <article
      class="post"
      data-post-id="${post.id}"
    >

      <div
        class="postImg ${image ? "" : "noImage"}"
        ${
          image
            ? `style="background-image:url('${image}')"`
            : ""
        }
      >

        ${
          !image
            ? `
              <span class="noImageText">
                NATIONAL GEOGRAPHIC
              </span>
            `
            : ""
        }

        <span class="tag">
          ${category}
        </span>

        <button
          class="favoriteButton ${
            favorite ? "active" : ""
          }"
          data-favorite="${post.id}"
          aria-label="Добавить в избранное"
        >
          ${favorite ? "★" : "☆"}
        </button>

      </div>


      <div class="postBody">

        <h3>
          ${escapeHtml(text)}
        </h3>

        ${
          date
            ? `
              <p class="postDate">
                ${date}
              </p>
            `
            : ""
        }

        <span class="readPost">
          Читать материал →
        </span>

      </div>

    </article>

  `;

}


/* =========================
   POSTS
========================= */

function renderPosts() {

  const filteredPosts =
    getFilteredPosts();


  const postsToShow =
    filteredPosts.slice(
      0,
      visiblePosts
    );


  if (!filteredPosts.length) {

    postsContainer.innerHTML = `

      <div class="loading">

        ${
          activeCategory === "Избранное"
            ? "В избранном пока ничего нет."
            : "Ничего не найдено."
        }

        <br><br>

        Попробуйте изменить запрос
        или выбрать другую категорию.

      </div>

    `;

    return;

  }


  postsContainer.innerHTML =
    postsToShow
      .map(createPost)
      .join("");


  postsContainer
    .querySelectorAll(".post")
    .forEach(
      (card, index) => {

        card.onclick =
          () => openPost(
            postsToShow[index]
          );

      }
    );


  postsContainer
    .querySelectorAll(
      "[data-favorite]"
    )
    .forEach(
      button => {

        button.onclick =
          event => {

            event.stopPropagation();

            toggleFavorite(
              button.dataset.favorite
            );

          };

      }
    );


  if (
    visiblePosts <
    filteredPosts.length
  ) {

    postsContainer.innerHTML += `

      <div class="loadMoreWrap">

        <button id="loadMore">
          ЗАГРУЗИТЬ ЕЩЁ
        </button>

      </div>

    `;


    document
      .querySelector("#loadMore")
      .onclick =
      () => {

        visiblePosts += 6;

        renderPosts();

      };

  }

}


/* =========================
   POST VIEWER
========================= */

function openPost(post) {

  const old =
    document.querySelector(
      "#postViewer"
    );

  if (old) {
    old.remove();
  }


  const text =
    cleanText(post.text);

  const image =
    getImage(post);

  const date =
    formatDate(post.post_date);

  const category =
    detectCategory(text);

  const link =
    getPostLink(post.vk_id);


  const viewer =
    document.createElement(
      "div"
    );

  viewer.id =
    "postViewer";


  viewer.innerHTML = `

    <div class="viewerBackdrop"></div>


    <div class="viewerWindow">

      <button
        class="viewerClose"
        id="viewerClose"
      >
        ×
      </button>


      <div
        class="viewerImage ${
          image ? "" : "noImage"
        }"
        ${
          image
            ? `style="background-image:url('${image}')"`
            : ""
        }
      >

        ${
          !image
            ? `
              <span>
                NATIONAL GEOGRAPHIC
              </span>
            `
            : ""
        }

      </div>


      <div class="viewerContent">

        <div class="viewerCategory">
          ${category}
        </div>

        <h2>
          ${escapeHtml(text)}
        </h2>

        <div class="viewerDate">
          ${date}
        </div>


        <div class="viewerButtons">

          <a
            class="viewerVk"
            href="${link}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ОТКРЫТЬ ВО ВКОНТАКТЕ ↗
          </a>

          <button
            class="viewerBack"
            id="viewerBack"
          >
            НАЗАД
          </button>

        </div>

      </div>

    </div>

  `;


  document.body.appendChild(
    viewer
  );

  document.body.classList.add(
    "viewerOpen"
  );


  document
    .querySelector("#viewerClose")
    .onclick =
    closePost;


  document
    .querySelector("#viewerBack")
    .onclick =
    closePost;


  document
    .querySelector(".viewerBackdrop")
    .onclick =
    closePost;


  document.addEventListener(
    "keydown",
    handleViewerKey
  );

}


function closePost() {

  const viewer =
    document.querySelector(
      "#postViewer"
    );

  if (viewer) {
    viewer.remove();
  }

  document.body.classList.remove(
    "viewerOpen"
  );

  document.removeEventListener(
    "keydown",
    handleViewerKey
  );

}


function handleViewerKey(event) {

  if (
    event.key ===
    "Escape"
  ) {

    closePost();

  }

}


/* =========================
   GALLERY
========================= */

function renderGallery() {

  const gallery =
    document.querySelector(
      "#photoGallery"
    );

  if (!gallery) {
    return;
  }


  const photoPosts =
    allPosts
      .filter(post =>
        getImage(post)
      )
      .slice(0, 6);


  if (!photoPosts.length) {

    gallery.innerHTML = `

      <div class="galleryEmpty">
        Фотографии появятся
        автоматически после загрузки
        изображений из VK.
      </div>

    `;

    return;

  }


  gallery.innerHTML =
    photoPosts
      .map(
        (post, index) => {

          const image =
            getImage(post);

          return `

            <div
              class="galleryPhoto
              galleryPhoto${index + 1}"
              data-gallery="${post.id}"
              style="
                background-image:
                url('${image}')
              "
            >

              <span>
                ${detectCategory(post.text)}
              </span>

            </div>

          `;

        }
      )
      .join("");


  gallery
    .querySelectorAll(
      "[data-gallery]"
    )
    .forEach(
      element => {

        element.onclick = () => {

          const post =
            allPosts.find(
              item =>
                String(item.id) ===
                String(
                  element.dataset.gallery
                )
            );

          if (post) {
            openPost(post);
          }

        };

      }
    );

}


/* =========================
   STATS
========================= */

function updateStats() {

  const postsCount =
    document.querySelector(
      "#postsCount"
    );

  const photosCount =
    document.querySelector(
      "#photosCount"
    );


  if (postsCount) {

    postsCount.textContent =
      allPosts.length;

  }


  if (photosCount) {

    photosCount.textContent =
      allPosts.filter(
        post => getImage(post)
      ).length;

  }

}


/* =========================
   REFRESH TIME
========================= */

function updateRefreshTime() {

  const element =
    document.querySelector(
      "#refreshTime"
    );

  if (!element) {
    return;
  }


  element.textContent =
    "Обновлено в " +
    new Date()
      .toLocaleTimeString(
        "ru-RU",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

}


/* =========================
   API
========================= */

async function loadPosts(
  showLoading = true
) {

  if (isLoading) {
    return;
  }


  isLoading = true;


  if (showLoading) {

    postsContainer.innerHTML = `

      <div class="loadingGrid">

        <div class="skeleton skeletonCard"></div>
        <div class="skeleton skeletonCard"></div>
        <div class="skeleton skeletonCard"></div>

      </div>

    `;

  }


  try {

    const response =
      await fetch(
        API_URL,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `API ${response.status}`
      );

    }


    const data =
      await response.json();


    if (
      !data ||
      !Array.isArray(
        data.posts
      )
    ) {

      throw new Error(
        "Неверный формат API"
      );

    }


    allPosts =
      data.posts;


    renderFeaturedPost();

    renderPosts();

    renderGallery();

    updateStats();

    updateRefreshTime();


  } catch (error) {

    console.error(
      "Ошибка загрузки:",
      error
    );


    if (showLoading) {

      postsContainer.innerHTML = `

        <div class="loading">

          Не удалось загрузить
          публикации.

          <br><br>

          <a
            href="https://vk.ru/national.geograph1c"
            target="_blank"
            rel="noopener"
          >
            Открыть ВКонтакте →
          </a>

        </div>

      `;

    }

  } finally {

    isLoading = false;

  }

}


/* =========================
   FILTERS
========================= */

function setupFilters() {

  document
    .querySelectorAll(
      ".categoryBtn"
    )
    .forEach(
      button => {

        button.onclick = () => {

          document
            .querySelectorAll(
              ".categoryBtn"
            )
            .forEach(
              btn =>
                btn.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          activeCategory =
            button.dataset.category;


          visiblePosts = 6;

          renderPosts();

        };

      }
    );


  const search =
    document.querySelector(
      "#postSearch"
    );


  if (search) {

    search.oninput =
      event => {

        searchText =
          event.target.value;

        visiblePosts = 6;

        renderPosts();

      };

  }


  const refresh =
    document.querySelector(
      "#refreshButton"
    );


  if (refresh) {

    refresh.onclick =
      async () => {

        refresh.textContent =
          "↻ ОБНОВЛЕНИЕ...";

        await loadPosts(false);

        refresh.textContent =
          "↻ ОБНОВИТЬ";

      };

  }

}


/* =========================
   CATEGORY CARDS
========================= */

function setupCategoryCards() {

  document
    .querySelectorAll(
      "[data-jump-category]"
    )
    .forEach(
      card => {

        card.onclick = () => {

          const category =
            card.dataset.jumpCategory;


          activeCategory =
            category;


          document
            .querySelectorAll(
              ".categoryBtn"
            )
            .forEach(
              button => {

                button.classList.toggle(
                  "active",
                  button.dataset.category ===
                  category
                );

              }
            );


          visiblePosts = 6;

          renderPosts();

        };

      }
    );

}


/* =========================
   MOBILE MENU
========================= */

function setupMenu() {

  const menu =
    document.querySelector(
      "#menu"
    );

  const links =
    document.querySelector(
      "#links"
    );


  if (!menu || !links) {
    return;
  }


  menu.onclick = () => {

    links.classList.toggle(
      "open"
    );


    menu.textContent =
      links.classList.contains(
        "open"
      )
        ? "×"
        : "☰";

  };


  links
    .querySelectorAll("a")
    .forEach(
      link => {

        link.onclick = () => {

          links.classList.remove(
            "open"
          );

          menu.textContent =
            "☰";

        };

      }
    );

}


/* =========================
   YEAR
========================= */

const year =
  document.querySelector(
    "#year"
  );

if (year) {

  year.textContent =
    new Date().getFullYear();

}


/* =========================
   START
========================= */

setupFilters();

setupCategoryCards();

setupMenu();

loadPosts();


/* =========================
   AUTO UPDATE
========================= */

setInterval(
  () => {

    loadPosts(false);

  },
  5 * 60 * 1000
);


/* =========================
   RETURN TO TAB
========================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      loadPosts(false);

    }

  }
);
