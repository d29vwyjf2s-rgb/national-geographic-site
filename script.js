const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const postsContainer =
  document.querySelector("#posts");

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
   ТЕКСТ
========================= */

function cleanText(text) {

  if (!text) {
    return "Новая публикация National Geographic";
  }

  return text
    .replace(/\n+/g, " ")
    .trim();

}


/* =========================
   ДАТА
========================= */

function formatDate(timestamp) {

  if (!timestamp) return "";

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
   VK ССЫЛКА
========================= */

function getPostLink(vkId) {

  if (!vkId) {
    return "https://vk.ru/national.geograph1c";
  }

  const parts =
    vkId.split("_");

  if (parts.length === 2) {

    return `https://vk.ru/wall${parts[0]}_${parts[1]}`;

  }

  return "https://vk.ru/national.geograph1c";

}


/* =========================
   КАТЕГОРИЯ ПОСТА
========================= */

function detectCategory(text) {

  const lower =
    text.toLowerCase();

  for (
    const category in categories
  ) {

    for (
      const word of categories[category]
    ) {

      if (lower.includes(word)) {
        return category;
      }

    }

  }

  return "Мир";

}


/* =========================
   ФИЛЬТР
========================= */

function getFilteredPosts() {

  let posts =
    [...allPosts];


  if (
    activeCategory !== "Все"
  ) {

    posts =
      posts.filter(post => {

        return detectCategory(
          cleanText(post.text)
        ) === activeCategory;

      });

  }


  if (searchText.trim()) {

    const query =
      searchText
        .toLowerCase()
        .trim();

    posts =
      posts.filter(post => {

        return cleanText(post.text)
          .toLowerCase()
          .includes(query);

      });

  }


  return posts;

}


/* =========================
   ОТКРЫТЬ ПОСТ
========================= */

function openPost(post) {

  const oldViewer =
    document.querySelector(
      "#postViewer"
    );

  if (oldViewer) {
    oldViewer.remove();
  }


  const text =
    cleanText(post.text);

  const image =
    post.image_url;

  const date =
    formatDate(post.post_date);

  const link =
    getPostLink(post.vk_id);

  const category =
    detectCategory(text);


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

      ${
        image
          ? `
            <div
              class="viewerImage"
              style="
                background-image:
                url('${image}')
              "
            ></div>
          `
          : `
            <div
              class="viewerImage noImage"
            >
              <span>
                NATIONAL GEOGRAPHIC
              </span>
            </div>
          `
      }

      <div class="viewerContent">

        <div class="viewerCategory">
          ${category}
        </div>

        <h2>
          ${text}
        </h2>

        ${
          date
            ? `
              <div class="viewerDate">
                ${date}
              </div>
            `
            : ""
        }

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
    .querySelector(
      "#viewerClose"
    )
    .onclick =
    closePost;


  document
    .querySelector(
      "#viewerBack"
    )
    .onclick =
    closePost;


  document
    .querySelector(
      ".viewerBackdrop"
    )
    .onclick =
    closePost;


  document.addEventListener(
    "keydown",
    handleViewerKey
  );

}


/* =========================
   ЗАКРЫТЬ ПОСТ
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


function handleViewerKey(event) {

  if (event.key === "Escape") {
    closePost();
  }

}


/* =========================
   ГЛАВНЫЙ ПОСТ
========================= */

function renderFeaturedPost() {

  const container =
    document.querySelector(
      "#featuredPost"
    );

  if (
    !container ||
    !allPosts.length
  ) {
    return;
  }


  const post =
    allPosts[0];

  const text =
    cleanText(post.text);

  const image =
    post.image_url;

  const date =
    formatDate(post.post_date);

  const category =
    detectCategory(text);


  container.innerHTML = `

    <article
      class="featuredPost"
      id="featuredCard"
    >

      <div
        class="
          featuredImage
          ${image ? "" : "noImage"}
        "
        ${
          image
            ? `style="
                background-image:
                url('${image}')
              "`
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
          ${text}
        </h3>

        ${
          date
            ? `
              <div class="featuredDate">
                ${date}
              </div>
            `
            : ""
        }

        <button
          class="featuredButton"
          id="openFeatured"
        >
          ЧИТАТЬ МАТЕРИАЛ →
        </button>

      </div>

    </article>

  `;


  document
    .querySelector(
      "#featuredCard"
    )
    .onclick = () => {

      openPost(post);

    };

}


/* =========================
   КАРТОЧКА
========================= */

function createPost(post) {

  const text =
    cleanText(post.text);

  const image =
    post.image_url;

  const date =
    formatDate(post.post_date);

  const category =
    detectCategory(text);


  return `

    <article
      class="post"
      data-post-id="${post.id}"
    >

      <div
        class="
          postImg
          ${image ? "" : "noImage"}
        "
        ${
          image
            ? `style="
                background-image:
                url('${image}')
              "`
            : ""
        }
      >

        <span class="tag">
          ${category}
        </span>

      </div>


      <div class="postBody">

        <h3>
          ${text}
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
   ОТОБРАЖЕНИЕ
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

        Ничего не найдено

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


  document
    .querySelectorAll(".post")
    .forEach(
      (card, index) => {

        card.onclick = () => {

          openPost(
            postsToShow[index]
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
      .querySelector(
        "#loadMore"
      )
      .onclick = () => {

        visiblePosts += 6;

        renderPosts();

      };

  }

}


/* =========================
   ВРЕМЯ
========================= */

function updateRefreshTime() {

  const element =
    document.querySelector(
      "#refreshTime"
    );

  if (!element) return;


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

      <div class="loading">
        ЗАГРУЖАЕМ ПОСЛЕДНИЕ
        ПУБЛИКАЦИИ...
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

    updateRefreshTime();


  } catch (error) {

    console.error(
      "Ошибка:",
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
   ФИЛЬТРЫ
========================= */

function createFilters() {

  const section =
    document.querySelector(
      "#latest"
    );

  if (!section) {
    return;
  }


  const heading =
    section.querySelector(
      ".heading"
    );

  if (!heading) {
    return;
  }


  const filters =
    document.createElement(
      "div"
    );

  filters.className =
    "postFilters";


  filters.innerHTML = `

    <div class="searchBox">

      <input
        id="postSearch"
        type="search"
        placeholder="Поиск по публикациям..."
        autocomplete="off"
      >

      <span>⌕</span>

    </div>


    <div class="categoryButtons">

      <button
        class="categoryBtn active"
        data-category="Все"
      >
        Все
      </button>

      <button
        class="categoryBtn"
        data-category="Природа"
      >
        🏔️ Природа
      </button>

      <button
        class="categoryBtn"
        data-category="Путешествия"
      >
        ✈️ Путешествия
      </button>

      <button
        class="categoryBtn"
        data-category="Россия"
      >
        🇷🇺 Россия
      </button>

      <button
        class="categoryBtn"
        data-category="Мир"
      >
        🌍 Мир
      </button>

      <button
        class="categoryBtn"
        data-category="Животные"
      >
        🐾 Животные
      </button>

    </div>


    <div class="refreshPanel">

      <button id="refreshButton">
        ↻ ОБНОВИТЬ
      </button>

      <span id="refreshTime">
        Загрузка...
      </span>

    </div>

  `;


  heading.after(
    filters
  );


  document
    .querySelector(
      "#postSearch"
    )
    .oninput =
    event => {

      searchText =
        event.target.value;

      visiblePosts = 6;

      renderPosts();

    };


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


  document
    .querySelector(
      "#refreshButton"
    )
    .onclick =
    async () => {

      const button =
        document.querySelector(
          "#refreshButton"
        );


      button.textContent =
        "↻ ОБНОВЛЕНИЕ...";


      await loadPosts(false);


      button.textContent =
        "↻ ОБНОВИТЬ";

    };

}


/* =========================
   ГОД
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
   МОБИЛЬНОЕ МЕНЮ
========================= */

const menu =
  document.querySelector(
    "#menu"
  );

const links =
  document.querySelector(
    "#links"
  );


if (menu && links) {

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
   ЗАПУСК
========================= */

createFilters();

loadPosts();


/* =========================
   АВТООБНОВЛЕНИЕ
========================= */

setInterval(
  () => {

    loadPosts(false);

  },
  5 * 60 * 1000
);


/* =========================
   ВОЗВРАТ НА СТРАНИЦУ
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
