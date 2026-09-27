const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const VK_GROUP_URL =
  "https://vk.ru/national.geograph1c";

const postsContainer =
  document.getElementById("posts");

let allPosts = [];

let currentImages = [];
let currentImageIndex = 0;


/* =========================================
   ЗАГРУЗКА ПОСТОВ
========================================= */

async function loadPosts() {

  try {

    if (postsContainer) {

      postsContainer.innerHTML = `
        <div class="loading">
          <div class="loader"></div>
          <span>Загружаем публикации...</span>
        </div>
      `;
    }

    const response = await fetch(
      `${API_URL}?limit=100&offset=0`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Ошибка API");
    }

    const data = await response.json();

    allPosts = Array.isArray(data.posts)
      ? data.posts
      : [];

    renderPosts(allPosts);

  } catch (error) {

    console.error(error);

    if (postsContainer) {

      postsContainer.innerHTML = `
        <div class="error">
          <h3>Не удалось загрузить публикации</h3>
          <p>Попробуйте обновить страницу.</p>

          <button onclick="loadPosts()">
            Обновить
          </button>
        </div>
      `;
    }
  }
}


/* =========================================
   ПОЛУЧЕНИЕ ФОТО
========================================= */

function getImages(post) {

  if (
    Array.isArray(post.images) &&
    post.images.length
  ) {

    return post.images.filter(Boolean);
  }

  if (post.images_json) {

    try {

      const images =
        typeof post.images_json === "string"
          ? JSON.parse(post.images_json)
          : post.images_json;

      if (
        Array.isArray(images) &&
        images.length
      ) {

        return images.filter(Boolean);
      }

    } catch (error) {

      console.warn(
        "Ошибка images_json",
        error
      );
    }
  }

  if (post.image_url) {
    return [post.image_url];
  }

  return [];
}


/* =========================================
   СПИСОК ПОСТОВ
========================================= */

function renderPosts(posts) {

  if (!postsContainer) {
    return;
  }

  if (!posts.length) {

    postsContainer.innerHTML = `
      <div class="empty">
        Публикаций пока нет
      </div>
    `;

    return;
  }

  postsContainer.innerHTML =
    posts.map(post => createPost(post)).join("");
}


/* =========================================
   СОЗДАНИЕ ПОСТА
========================================= */

function createPost(post) {

  const images =
    getImages(post);

  const date =
    post.post_date
      ? new Date(
          post.post_date * 1000
        ).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";

  const text =
    createPostText(
      post.text || "",
      post.id
    );

  const gallery =
    images.length
      ? createGallery(
          images,
          post.id
        )
      : "";

  const video =
    createVideo(post);

  return `
    <article
      class="post-card"
      id="post-${post.id}"
    >

      <div class="post-header">

        <div class="post-avatar">
          <span>NG</span>
        </div>

        <div class="post-meta">

          <strong>
            National Geographic
          </strong>

          <span>
            ${date}
          </span>

        </div>

      </div>

      ${text}

      ${gallery}

      ${video}

      <div class="post-actions">

        <button
          class="post-like"
          onclick="toggleLike(${post.id}, this)"
        >
          ♡
          <span>Нравится</span>
        </button>

        <button
          onclick="sharePost(${post.id})"
        >
          ↗
          <span>Поделиться</span>
        </button>

        <a
          href="${VK_GROUP_URL}"
          target="_blank"
          rel="noopener noreferrer"
        >
          VK
        </a>

      </div>

    </article>
  `;
}


/* =========================================
   ТЕКСТ ПОСТА
========================================= */

function createPostText(
  text,
  postId
) {

  if (!text) {
    return "";
  }

  const maxLength = 500;

  const cleanText =
    String(text).trim();

  /*
     Короткий пост
  */

  if (
    cleanText.length <= maxLength
  ) {

    return `
      <div class="post-text">
        ${formatText(cleanText)}
      </div>
    `;
  }

  /*
     Длинный пост
  */

  const shortText =
    cleanText.substring(
      0,
      maxLength
    );

  return `
    <div
      class="post-text post-text-collapsed"
      id="post-text-${postId}"
    >

      <div class="post-short-text">

        ${formatText(shortText)}…

      </div>

      <div
        class="post-full-text"
        style="display:none"
      >

        ${formatText(cleanText)}

      </div>

      <button
        class="read-more-btn"
        onclick="togglePostText(
          ${postId},
          this
        )"
      >
        Показать полностью
      </button>

    </div>
  `;
}


/* =========================================
   РАСКРЫТИЕ ТЕКСТА
========================================= */

function togglePostText(
  postId,
  button
) {

  const container =
    document.getElementById(
      `post-text-${postId}`
    );

  if (!container) {
    return;
  }

  const shortText =
    container.querySelector(
      ".post-short-text"
    );

  const fullText =
    container.querySelector(
      ".post-full-text"
    );

  if (
    fullText.style.display === "none"
  ) {

    shortText.style.display =
      "none";

    fullText.style.display =
      "block";

    button.textContent =
      "Свернуть";

  } else {

    shortText.style.display =
      "block";

    fullText.style.display =
      "none";

    button.textContent =
      "Показать полностью";
  }
}


/* =========================================
   КЛИКАБЕЛЬНЫЕ ССЫЛКИ
========================================= */

function formatText(text) {

  const escaped =
    escapeHtml(text);

  const urlRegex =
    /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

  return escaped
    .replace(
      urlRegex,
      match => {

        let url = match;

        /*
           Убираем знаки препинания
           с конца ссылки
        */

        let ending = "";

        while (
          /[.,!?;:)\]}»]$/.test(url)
        ) {

          ending =
            url.slice(-1) +
            ending;

          url =
            url.slice(0, -1);
        }

        if (
          url.startsWith("www.")
        ) {

          url =
            "https://" + url;
        }

        return `
          <a
            href="${url}"
            target="_blank"
            rel="noopener noreferrer"
            class="post-link"
            onclick="event.stopPropagation()"
          >${url}</a>${ending}
        `;
      }
    )
    .replace(
      /\n/g,
      "<br>"
    );
}


/* =========================================
   ЗАЩИТА HTML
========================================= */

function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent =
    text;

  return div.innerHTML;
}


/* =========================================
   ГАЛЕРЕЯ
========================================= */

function createGallery(
  images,
  postId
) {

  const count =
    images.length;

  /*
     1 ФОТО
  */

  if (count === 1) {

    return `
      <div
        class="post-gallery gallery-one"
      >

        <img
          src="${images[0]}"
          alt="National Geographic"
          loading="lazy"
          onclick='openGallery(
            ${JSON.stringify(images)},
            0
          )'
          onerror="
            this.style.display='none'
          "
        >

      </div>
    `;
  }


  /*
     2 ФОТО
  */

  if (count === 2) {

    return `
      <div
        class="post-gallery gallery-two"
      >

        ${images.map(
          (image, index) => `
            <div
              class="gallery-item"
              onclick='openGallery(
                ${JSON.stringify(images)},
                ${index}
              )'
            >

              <img
                src="${image}"
                alt="Фото ${index + 1}"
                loading="lazy"
              >

            </div>
          `
        ).join("")}

      </div>
    `;
  }


  /*
     3 ФОТО
  */

  if (count === 3) {

    return `
      <div
        class="post-gallery gallery-three"
      >

        <div
          class="gallery-main"
          onclick='openGallery(
            ${JSON.stringify(images)},
            0
          )'
        >

          <img
            src="${images[0]}"
            alt="Фото 1"
            loading="lazy"
          >

        </div>

        <div class="gallery-side">

          <div
            onclick='openGallery(
              ${JSON.stringify(images)},
              1
            )'
          >

            <img
              src="${images[1]}"
              alt="Фото 2"
              loading="lazy"
            >

          </div>

          <div
            onclick='openGallery(
              ${JSON.stringify(images)},
              2
            )'
          >

            <img
              src="${images[2]}"
              alt="Фото 3"
              loading="lazy"
            >

          </div>

        </div>

      </div>
    `;
  }


  /*
     4 И БОЛЬШЕ
  */

  const visibleImages =
    images.slice(0, 4);

  const extra =
    count - 4;

  return `
    <div
      class="post-gallery gallery-grid"
    >

      ${visibleImages.map(
        (image, index) => {

          const isLast =
            index === 3 &&
            extra > 0;

          return `
            <div
              class="gallery-item ${
                isLast
                  ? "gallery-more"
                  : ""
              }"
              onclick='openGallery(
                ${JSON.stringify(images)},
                ${index}
              )'
            >

              <img
                src="${image}"
                alt="Фото ${index + 1}"
                loading="lazy"
              >

              ${
                isLast
                  ? `
                    <div class="more-overlay">
                      +${extra}
                    </div>
                  `
                  : ""
              }

            </div>
          `;
        }
      ).join("")}

    </div>
  `;
}


/* =========================================
   ПОЛНОЭКРАННАЯ ГАЛЕРЕЯ
========================================= */

function openGallery(
  images,
  index = 0
) {

  currentImages =
    Array.isArray(images)
      ? images
      : [];

  currentImageIndex =
    index;

  let viewer =
    document.getElementById(
      "imageViewer"
    );

  if (!viewer) {

    viewer =
      document.createElement("div");

    viewer.id =
      "imageViewer";

    viewer.innerHTML = `
      <div class="viewer-bg"></div>

      <button
        class="viewer-close"
        onclick="closeGallery()"
        aria-label="Закрыть"
      >
        ×
      </button>

      <button
        class="viewer-prev"
        onclick="prevImage()"
        aria-label="Предыдущая"
      >
        ‹
      </button>

      <div class="viewer-content">

        <img
          id="viewerImage"
          alt=""
        >

        <div
          id="viewerCounter"
          class="viewer-counter"
        ></div>

      </div>

      <button
        class="viewer-next"
        onclick="nextImage()"
        aria-label="Следующая"
      >
        ›
      </button>
    `;

    document.body.appendChild(
      viewer
    );

    viewer
      .querySelector(".viewer-bg")
      .onclick =
      closeGallery;
  }

  viewer.classList.add(
    "active"
  );

  updateViewer();

  document.body.style.overflow =
    "hidden";
}


/* =========================================
   ОБНОВЛЕНИЕ ПРОСМОТРА
========================================= */

function updateViewer() {

  const image =
    document.getElementById(
      "viewerImage"
    );

  const counter =
    document.getElementById(
      "viewerCounter"
    );

  if (!image) {
    return;
  }

  if (!currentImages.length) {
    return;
  }

  image.src =
    currentImages[
      currentImageIndex
    ];

  if (counter) {

    counter.textContent =
      `${currentImageIndex + 1} / ${currentImages.length}`;
  }
}


/* =========================================
   ЗАКРЫТЬ ГАЛЕРЕЮ
========================================= */

function closeGallery() {

  const viewer =
    document.getElementById(
      "imageViewer"
    );

  if (!viewer) {
    return;
  }

  viewer.classList.remove(
    "active"
  );

  document.body.style.overflow =
    "";
}


/* =========================================
   СЛЕДУЮЩЕЕ ФОТО
========================================= */

function nextImage() {

  if (!currentImages.length) {
    return;
  }

  currentImageIndex++;

  if (
    currentImageIndex >=
    currentImages.length
  ) {

    currentImageIndex = 0;
  }

  updateViewer();
}


/* =========================================
   ПРЕДЫДУЩЕЕ ФОТО
========================================= */

function prevImage() {

  if (!currentImages.length) {
    return;
  }

  currentImageIndex--;

  if (
    currentImageIndex < 0
  ) {

    currentImageIndex =
      currentImages.length - 1;
  }

  updateViewer();
}


/* =========================================
   КЛАВИАТУРА
========================================= */

document.addEventListener(
  "keydown",
  event => {

    const viewer =
      document.getElementById(
        "imageViewer"
      );

    if (
      !viewer ||
      !viewer.classList.contains(
        "active"
      )
    ) {

      return;
    }

    if (
      event.key === "Escape"
    ) {

      closeGallery();
    }

    if (
      event.key === "ArrowRight"
    ) {

      nextImage();
    }

    if (
      event.key === "ArrowLeft"
    ) {

      prevImage();
    }
  }
);


/* =========================================
   СВАЙП НА ТЕЛЕФОНЕ
========================================= */

let touchStartX = 0;

document.addEventListener(
  "touchstart",
  event => {

    if (
      !event.touches.length
    ) {

      return;
    }

    touchStartX =
      event.touches[0].clientX;
  },
  {
    passive: true
  }
);


document.addEventListener(
  "touchend",
  event => {

    const viewer =
      document.getElementById(
        "imageViewer"
      );

    if (
      !viewer ||
      !viewer.classList.contains(
        "active"
      )
    ) {

      return;
    }

    const touchEndX =
      event.changedTouches[0].clientX;

    const diff =
      touchStartX -
      touchEndX;

    if (
      Math.abs(diff) < 50
    ) {

      return;
    }

    if (diff > 0) {

      nextImage();

    } else {

      prevImage();
    }
  },
  {
    passive: true
  }
);


/* =========================================
   ВИДЕО
========================================= */

function createVideo(post) {

  if (
    !post.video_url &&
    !post.video_vk_url
  ) {

    return "";
  }

  if (post.video_url) {

    const poster =
      post.video_preview
        ? `poster="${post.video_preview}"`
        : "";

    return `
      <div class="post-video">

        <video
          controls
          preload="metadata"
          playsinline
          ${poster}
        >

          <source
            src="${post.video_url}"
            type="video/mp4"
          >

        </video>

      </div>
    `;
  }

  if (post.video_vk_url) {

    return `
      <div class="post-video vk-video">

        <a
          href="${post.video_vk_url}"
          target="_blank"
          rel="noopener noreferrer"
        >

          ${
            post.video_preview
              ? `
                <img
                  src="${post.video_preview}"
                  alt="Видео"
                  loading="lazy"
                >
              `
              : ""
          }

          <div class="video-play">
            ▶
          </div>

          <span>
            Смотреть видео VK
          </span>

        </a>

      </div>
    `;
  }

  return "";
}


/* =========================================
   ЛАЙК
========================================= */

function toggleLike(
  postId,
  button
) {

  const key =
    `ng_like_${postId}`;

  const active =
    localStorage.getItem(key) === "1";

  if (active) {

    localStorage.removeItem(key);

    button.classList.remove(
      "liked"
    );

    button.firstChild.textContent =
      "♡";

  } else {

    localStorage.setItem(
      key,
      "1"
    );

    button.classList.add(
      "liked"
    );

    button.firstChild.textContent =
      "♥";
  }
}


/* =========================================
   ПОДЕЛИТЬСЯ
========================================= */

async function sharePost(
  postId
) {

  const url =
    `${window.location.origin}${window.location.pathname}#post-${postId}`;

  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title:
          "National Geographic",
        url
      });

    } catch (error) {}

  } else {

    try {

      await navigator.clipboard
        .writeText(url);

      alert(
        "Ссылка скопирована"
      );

    } catch (error) {

      prompt(
        "Скопируйте ссылку:",
        url
      );
    }
  }
}


/* =========================================
   ЗАПУСК
========================================= */

loadPosts();


/* =========================================
   АВТООБНОВЛЕНИЕ
========================================= */

setInterval(
  loadPosts,
  5 * 60 * 1000
);
