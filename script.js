const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";


/* =========================
   STATE
========================= */

let allPosts = [];
let visiblePosts = 6;

let activeCategory = "Все";
let searchText = "";

let isLoading = false;


/* =========================
   CATEGORIES
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


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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

  return date.toLocaleDateString(
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
    post.photo_url ||
    null
  );

}


/* =========================
   FAVORITES
========================= */

function getFavorites() {

  try {

    const value =
      localStorage.getItem(
        "ng_favorites"
      );

    if (!value) {
      return [];
    }

    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.map(String)
      : [];

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

  renderFeaturedPost();
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

  const favorite =
    isFavorite(post.id);


  featuredContainer.innerHTML = `

    <article class="featuredPost">


      <div
        class="featuredImage ${image ? "" : "noImage"}"
        ${
          image
            ? `style="background-image:url('${escapeHtml(image)}')"`
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
          ${escapeHtml(category)}
        </span>


        <h3>
          ${escapeHtml(text)}
        </h3>


        <div class="featuredDate">
          ${escapeHtml(date)}
        </div>


        <div class="featuredActions">


          <button
            class="featuredButton"
            id="openFeatured"
          >
            ЧИТАТЬ МАТЕРИАЛ →
          </button>


          <button
            class="favoriteButton featuredFavorite ${
              favorite ? "active" : ""
            }"
            id="featuredFavorite"
            aria-label="Избранное"
          >
            ${favorite ? "★" : "☆"}
          </button>


        </div>

      </div>

    </article>

  `;


  const openButton =
    document.querySelector(
      "#openFeatured"
    );


  if (openButton) {

    openButton.onclick =
      () => openPost(post);

  }


  const favoriteButton =
    document.querySelector(
      "#featuredFavorite"
    );


  if (favoriteButton) {

    favoriteButton.onclick =
      event => {

        event.stopPropagation();

        toggleFavorite(post.id);

      };

  }

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
      data-post-id="${escapeHtml(post.id)}"
    >


      <div
        class="postImg ${image ? "" : "noImage"}"
        ${
          image
            ? `style="background-image:url('${escapeHtml(image)}')"`
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
          ${escapeHtml(category)}
        </span>


        <button
          class="favoriteButton ${
            favorite ? "active" : ""
          }"
          data-favorite="${escapeHtml(post.id)}"
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
                ${escapeHtml(date)}
              </p>
            `
            : ""
        }


        <div class="postCardBottom">

          <span class="readPost">
            Читать материал →
          </span>

          <span class="shareHint">
            ↗
          </span>

        </div>


      </div>


    </article>

  `;

}


/* =========================
   POSTS
========================= */

function renderPosts() {

  if (!postsContainer) {
    return;
  }


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


    const loadMore =
      document.querySelector(
        "#loadMore"
      );


    if (loadMore) {

      loadMore.onclick =
        () => {

          visiblePosts += 6;

          renderPosts();

        };

    }

  }

}


/* =========================
   POST VIEWER
========================= */

function openPost(post) {

  if (!post) {
    return;
  }


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


    <div
      class="viewerWindow"
      role="dialog"
      aria-modal="true"
      aria-label="Материал National Geographic"
    >


      <button
        class="viewerClose"
        id="viewerClose"
        aria-label="Закрыть"
      >
        ×
      </button>



      <div
        class="viewerImage ${
          image ? "" : "noImage"
        }"
        ${
          image
            ? `style="background-image:url('${escapeHtml(image)}')"`
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
          ${escapeHtml(category)}
        </div>


        <h2>
          ${escapeHtml(text)}
        </h2>


        <div class="viewerDate">
          ${escapeHtml(date)}
        </div>



        <div class="viewerButtons">


          <a
            class="viewerVk"
            href="${escapeHtml(link)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ОТКРЫТЬ ВО ВКОНТАКТЕ ↗
          </a>


          <button
            class="viewerShare"
            id="viewerShare"
          >
            ПОДЕЛИТЬСЯ
          </button>


          <button
            class="viewerCopy"
            id="viewerCopy"
          >
            КОПИРОВАТЬ ССЫЛКУ
          </button>


          <button
            class="viewerBack"
            id="viewerBack"
          >
            НАЗАД
          </button>


        </div>


        <div
          class="viewerStatus"
          id="viewerStatus"
        ></div>


      </div>


    </div>

  `;


  document.body.appendChild(
    viewer
  );


  document.body.classList.add(
    "viewerOpen"
  );


  const closeButton =
    document.querySelector(
      "#viewerClose"
    );


  const backButton =
    document.querySelector(
      "#viewerBack"
    );


  const backdrop =
    document.querySelector(
      ".viewerBackdrop"
    );


  const shareButton =
    document.querySelector(
      "#viewerShare"
    );


  const copyButton =
    document.querySelector(
      "#viewerCopy"
    );


  if (closeButton) {
    closeButton.onclick =
      closePost;
  }


  if (backButton) {
    backButton.onclick =
      closePost;
  }


  if (backdrop) {
    backdrop.onclick =
      closePost;
  }


  if (shareButton) {

    shareButton.onclick =
      () => sharePost(
        post,
        link
      );

  }


  if (copyButton) {

    copyButton.onclick =
      () => copyPostLink(
        link
      );

  }


  document.addEventListener(
    "keydown",
    handleViewerKey
  );

}


/* =========================
   CLOSE VIEWER
========================= */

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


/* =========================
   ESCAPE
========================= */

function handleViewerKey(event) {

  if (
    event.key ===
    "Escape"
  ) {

    closePost();

  }

}


/* =========================
   SHARE
========================= */

async function sharePost(
  post,
  link
) {

  const title =
    "National Geographic";


  const text =
    cleanText(post.text);


  if (
    navigator.share
  ) {

    try {

      await navigator.share({

        title,

        text,

        url: link

      });

      return;

    } catch (error) {

      if (
        error &&
        error.name ===
        "AbortError"
      ) {
        return;
      }

    }

  }


  await copyPostLink(
    link,
    "Ссылка скопирована"
  );

}


/* =========================
   COPY LINK
========================= */

async function copyPostLink(
  link,
  successText = "Ссылка скопирована"
) {

  try {

    await navigator.clipboard.writeText(
      link
    );


    showViewerStatus(
      successText
    );


  } catch {

    const input =
      document.createElement(
        "input"
      );


    input.value =
      link;


    document.body.appendChild(
      input
    );


    input.select();


    try {

      document.execCommand(
        "copy"
      );


      showViewerStatus(
        successText
      );

    } catch {

      showViewerStatus(
        "Не удалось скопировать ссылку"
      );

    }


    input.remove();

  }

}


/* =========================
   VIEWER STATUS
========================= */

function showViewerStatus(
  message
) {

  const status =
    document.querySelector(
      "#viewerStatus"
    );


  if (!status) {
    return;
  }


  status.textContent =
    message;


  clearTimeout(
    showViewerStatus.timer
  );


  showViewerStatus.timer =
    setTimeout(
      () => {

        status.textContent =
          "";

      },
      2500
    );

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
      .filter(
        post =>
          getImage(post)
      )
      .slice(
        0,
        6
      );


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
              class="
                galleryPhoto
                galleryPhoto${index + 1}
              "
              data-gallery="${escapeHtml(post.id)}"
              style="
                background-image:
                url('${escapeHtml(image)}')
              "
            >

              <span>
                ${escapeHtml(
                  detectCategory(
                    post.text
                  )
                )}
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

        element.onclick =
          () => {

            const post =
              allPosts.find(
                item =>
                  String(item.id) ===
                  String(
                    element.dataset.gallery
                  )
              );


            if (post) {

              openPost(
                post
              );

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


  const categoriesCount =
    document.querySelector(
      "#categoriesCount"
    );


  if (postsCount) {

    postsCount.textContent =
      allPosts.length;

  }


  if (photosCount) {

    photosCount.textContent =
      allPosts.filter(
        post =>
          getImage(post)
      ).length;

  }


  if (categoriesCount) {

    const found =
      new Set(
        allPosts.map(
          post =>
            detectCategory(
              post.text
            )
        )
      );


    categoriesCount.textContent =
      Math.max(
        5,
        found.size
      );

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


  if (
    showLoading &&
    postsContainer
  ) {

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
      "Ошибка загрузки публикаций:",
      error
    );


    if (
      showLoading &&
      postsContainer
    ) {

      postsContainer.innerHTML = `

        <div class="loading">

          Не удалось загрузить
          публикации.

          <br><br>

          <a
            href="https://vk.ru/national.geograph1c"
            target="_blank"
            rel="noopener noreferrer"
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

        button.onclick =
          () => {

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

        if (isLoading) {
          return;
        }


        refresh.textContent =
          "↻ ОБНОВЛЕНИЕ...";


        await loadPosts(
          false
        );


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

        card.onclick =
          () => {

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


  menu.onclick =
    () => {

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

        link.onclick =
          () => {

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
   BACK TO TOP
========================= */

function setupBackToTop() {

  const button =
    document.querySelector(
      "#backToTop"
    );


  if (!button) {
    return;
  }


  button.onclick =
    () => {

      window.scrollTo({

        top: 0,

        behavior: "smooth"

      });

    };


  window.addEventListener(
    "scroll",
    () => {

      if (
        window.scrollY >
        500
      ) {

        button.classList.add(
          "visible"
        );

      } else {

        button.classList.remove(
          "visible"
        );

      }

    },
    {
      passive: true
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

setupBackToTop();

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
