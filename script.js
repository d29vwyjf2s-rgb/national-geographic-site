const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/posts";

const postsContainer = document.querySelector("#posts");

function formatDate(timestamp) {
  if (!timestamp) return "";

  return new Date(timestamp * 1000).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getText(text) {
  if (!text) return "Новая публикация National Geographic";

  return text.length > 180
    ? text.substring(0, 180) + "..."
    : text;
}

function createPost(post) {

  const image = post.image_url;

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

        <h3>
          ${getText(post.text)}
        </h3>

        ${
          post.post_date
            ? `<p>${formatDate(post.post_date)}</p>`
            : ""
        }

        <a
          href="https://vk.ru/national.geograph1c"
          target="_blank"
          rel="noopener"
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
      Загружаем материалы...
    </div>
  `;

  try {

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Ошибка API");
    }

    const data = await response.json();

    if (!data.posts || !Array.isArray(data.posts)) {
      throw new Error("Неверный формат данных");
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
      data.posts.map(createPost).join("");

  } catch (error) {

    console.error(error);

    postsContainer.innerHTML = `
      <div class="loading">
        Не удалось загрузить публикации.
        <br><br>
        <a
          href="https://vk.ru/national.geograph1c"
          target="_blank"
          rel="noopener"
        >
          Открыть группу ВКонтакте →
        </a>
      </div>
    `;
  }
}


document.querySelector("#year").textContent =
  new Date().getFullYear();


const menu = document.querySelector("#menu");
const links = document.querySelector("#links");

menu.onclick = () => {

  links.classList.toggle("open");

  menu.textContent =
    links.classList.contains("open")
      ? "×"
      : "☰";
};


links.querySelectorAll("a").forEach(link => {

  link.onclick = () => {

    links.classList.remove("open");

    menu.textContent = "☰";

  };

});


loadPosts();
