const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const postsContainer =
  document.querySelector("#posts");

let allPosts = [];
let visiblePosts = 6;

function formatDate(timestamp) {

  if (!timestamp) return "";

  return new Date(timestamp * 1000)
    .toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
}

function cleanText(text) {

  if (!text) {
    return "Новая публикация National Geographic";
  }

  return text
    .replace(/\n+/g, " ")
    .trim();
}

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

function createPost(post) {

  const text =
    cleanText(post.text);

  const image =
    post.image_url;

  const date =
    formatDate(post.post_date);

  const link =
    getPostLink(post.vk_id);

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
          NATIONAL GEOGRAPHIC
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

function renderPosts() {

  const postsToShow =
    allPosts.slice(0, visiblePosts);

  postsContainer.innerHTML =
    postsToShow
      .map(createPost)
      .join("");

  if (visiblePosts < allPosts.length) {

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
      "Ошибка загрузки постов:",
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


/* ГОД */

const year =
  document.querySelector("#year");

if (year) {

  year.textContent =
    new Date().getFullYear();
}


/* МОБИЛЬНОЕ МЕНЮ */

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


/* ПЕРВАЯ ЗАГРУЗКА */

loadPosts();


/*
   АВТООБНОВЛЕНИЕ
   Каждые 5 минут
*/

setInterval(() => {

  loadPosts(false);

}, 5 * 60 * 1000);


/*
   ОБНОВЛЕНИЕ ПРИ ВОЗВРАТЕ
   ПОЛЬЗОВАТЕЛЯ НА СТРАНИЦУ
*/

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
