const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const postsContainer = document.querySelector("#posts");

let allPosts = [];
let visiblePosts = 6;
let activeCategory = "Все";
let searchText = "";

const categories = {
  "Природа": [
    "природ", "гора", "горы", "лес", "озеро", "река",
    "водопад", "океан", "море", "пустын", "вулкан",
    "пейзаж", "остров", "ледник", "парк"
  ],

  "Путешествия": [
    "путешеств", "туризм", "маршрут", "поездк",
    "путешествен", "дорог", "отправ", "курорт",
    "турист"
  ],

  "Россия": [
    "росси", "москв", "санкт-петербург", "петербург",
    "крым", "алтай", "сибир", "кавказ", "примор",
    "курил", "камчат", "байкал"
  ],

  "Мир": [
    "мир", "европ", "ази", "америк", "африк",
    "австрали", "япони", "китай", "франци",
    "итал", "испан", "инд"
  ],

  "Животные": [
    "живот", "медвед", "тигр", "лев", "волк",
    "слон", "кит", "дельфин", "акул", "птиц",
    "орёл", "орел", "кот", "собак", "звер"
  ]
};


/* =========================
   ДАТА
========================= */

function formatDate(timestamp) {

  if (!timestamp) return "";

  return new Date(timestamp * 1000)
    .toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
}


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
   ССЫЛКА VK
========================= */

function getPostLink(vkId) {

  if (!vkId) {
    return "https://vk.ru/national.geograph1c";
  }

  const parts = vkId.split("_");

  if (parts.length === 2) {
    return `https://vk.ru/wall${parts[0]}_${parts[1]}`;
  }

  return "https://vk.ru/national.geograph1c";
}


/* =========================
   ОПРЕДЕЛЕНИЕ КАТЕГОРИИ
========================= */

function detectCategory(text) {

  const lower = text.toLowerCase();

  for (const category in categories) {

    const words = categories[category];

    for (const word of words) {

      if (lower.includes(word)) {
        return category;
      }

    }

  }

  return "Мир";
}


/* =========================
   ФИЛЬТРАЦИЯ
========================= */

function getFilteredPosts() {

  let posts = [...allPosts];

  if (activeCategory !== "Все") {

    posts = posts.filter(post => {

      const text = cleanText(post.text);

      return detectCategory(text) === activeCategory;

    });

  }

  if (searchText.trim()) {

    const query =
      searchText.toLowerCase().trim();

    posts = posts.filter(post => {

      const text =
        cleanText(post.text).toLowerCase();

      return text.includes(query);

    });

  }

  return posts;
}


/* =========================
   КАРТОЧКА ПОСТА
========================= */

function createPost(post) {

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

  return `
    <article class="post">

      <div
        class="postImg ${image ? "" : "noImage"}"
        ${
          image
            ? `style="background-image:url('${image}')"`
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
            ? `<p class="postDate">${date}</p>`
            : ""
        }

        <a
          href="${link}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Читать во ВКонтакте →
        </a>

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
    filteredPosts.slice(0, visiblePosts);

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

  if (visiblePosts < filteredPosts.length) {

    postsContainer.innerHTML += `
      <div class="loadMoreWrap">

        <button id="loadMore">
          ЗАГРУЗИТЬ ЕЩЁ
        </button>

      </div>
    `;

    document
      .querySelector("#loadMore")
      .addEventListener("click", () => {

        visiblePosts += 6;

        renderPosts();

      });
  }
}


/* =========================
   ЗАГРУЗКА
========================= */

async function loadPosts(showLoading = true) {

  if (showLoading) {

    postsContainer.innerHTML = `
      <div class="loading">
        ЗАГРУЖАЕМ ПОСЛЕДНИЕ ПУБЛИКАЦИИ...
      </div>
    `;
  }

  try {

    const response =
      await fetch(API_URL, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        },
        cache: "no-store"
      });

    if (!response.ok) {

      throw new Error(
        `API error ${response.status}`
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
      data.posts;

    if (showLoading) {
      visiblePosts = 6;
    }

    renderPosts();

  } catch (error) {

    console.error(
      "Ошибка загрузки:",
      error
    );

    if (showLoading) {

      postsContainer.innerHTML = `
        <div class="loading">

          Не удалось загрузить публикации.

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

  }

}


/* =========================
   ПОИСК + КАТЕГОРИИ
========================= */

function createFilters() {

  const section =
    document.querySelector("#latest");

  if (!section) return;

  const heading =
    section.querySelector(".heading");

  if (!heading) return;

  const filters =
    document.createElement("div");

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

  `;

  heading.after(filters);


  const search =
    document.querySelector("#postSearch");

  search.addEventListener(
    "input",
    event => {

      searchText =
        event.target.value;

      visiblePosts = 6;

      renderPosts();

    }
  );


  document
    .querySelectorAll(".categoryBtn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(".categoryBtn")
            .forEach(btn =>
              btn.classList.remove("active")
            );

          button.classList.add("active");

          activeCategory =
            button.dataset.category;

          visiblePosts = 6;

          renderPosts();

        }
      );

    });

}


/* =========================
   ГОД
========================= */

const year =
  document.querySelector("#year");

if (year) {
  year.textContent =
    new Date().getFullYear();
}


/* =========================
   МОБИЛЬНОЕ МЕНЮ
========================= */

const menu =
  document.querySelector("#menu");

const links =
  document.querySelector("#links");

if (menu && links) {

  menu.onclick = () => {

    links.classList.toggle("open");

    menu.textContent =
      links.classList.contains("open")
        ? "×"
        : "☰";

  };


  links
    .querySelectorAll("a")
    .forEach(link => {

      link.onclick = () => {

        links.classList.remove("open");

        menu.textContent = "☰";

      };

    });

}


/* =========================
   ЗАПУСК
========================= */

createFilters();

loadPosts();


/* =========================
   АВТООБНОВЛЕНИЕ
   КАЖДЫЕ 5 МИНУТ
========================= */

setInterval(() => {

  loadPosts(false);

}, 5 * 60 * 1000);


/* =========================
   ОБНОВЛЕНИЕ ПРИ ВОЗВРАТЕ
========================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState === "visible"
    ) {

      loadPosts(false);

    }

  }
);
