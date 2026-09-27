const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const postsContainer = document.querySelector("#posts");


function formatDate(timestamp) {
  if (!timestamp) return "";

  return new Date(timestamp * 1000).toLocaleDateString("ru-RU", {
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


function getPreview(text) {
  const clean = cleanText(text);

  if (clean.length > 180) {
    return clean.substring(0, 180) + "...";
  }

  return clean;
}


function getPostLink(vkId) {

  if (!vkId) {
    return "https://vk.ru/national.geograph1c";
  }

  const parts = vkId.split("_");

  if (parts.length === 2) {

    const ownerId = parts[0];
    const postId = parts[1];

    return `https://vk.ru/wall${ownerId}_${postId}`;
  }

  return "https://vk.ru/national.geograph1c";
}


function createPost(post) {

  const image = post.image_url;
  const title = getPreview(post.text);
  const date = formatDate(post.post_date);
  const link = getPostLink(post.vk_id);

  return `
    <article class="post">

      ${
        image
          ? `
            <div
              class="postImg"
              style="background-image:url('${image}')"
            >
              <span class="tag">NATIONAL GEOGRAPHIC</span>
            </div>
          `
          : `
            <div class="postImg noImage">
              <span class="tag">NATIONAL GEOGRAPHIC</span>
            </div>
          `
      }

      <div class="postBody">

        <h3>${title}</h3>

        ${
          date
            ? `<p>${date}</p>`
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


async function loadPosts() {

  postsContainer.innerHTML = `
    <div class="loading">
      Загружаем публикации...
    </div>
  `;

  try {

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(
        `API error: ${response.status}`
      );
    }

    const data = await response.json();

    if (
      !data ||
      !Array.isArray(data.posts)
    ) {
      throw new Error(
        "API вернул неправильный формат"
      );
    }

    if (data.posts.length === 0) {

      postsContainer.innerHTML = `
        <div class="loading">
          Пока нет публикаций.
        </div>
      `;

      return;
    }

    postsContainer.innerHTML =
      data.posts
        .map(createPost)
        .join("");

  } catch (error) {

    console.error(
      "Ошибка загрузки постов:",
      error
    );

    postsContainer.innerHTML = `
      <div class="loading">

        Не удалось загрузить публикации.

        <br><br>

        <a
          href="https://vk.ru/national.geograph1c"
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть группу ВКонтакте →
        </a>

      </div>
    `;
  }
}


const year = document.querySelector("#year");

if (year) {
  year.textContent =
    new Date().getFullYear();
}


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


loadPosts();
