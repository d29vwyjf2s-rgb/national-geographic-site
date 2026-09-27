const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const VK_GROUP_URL =
  "https://vk.ru/national.geograph1c";

const POSTS_PER_PAGE = 10;

let allPosts = [];
let visiblePosts = POSTS_PER_PAGE;


/* =========================
   ELEMENTS
========================= */

const postsContainer = document.getElementById("posts");
const feedStatus = document.getElementById("feedStatus");
const loadMoreWrap = document.getElementById("loadMoreWrap");
const loadMoreButton = document.getElementById("loadMore");

const menuButton = document.getElementById("menuButton");
const mobileMenu = document.getElementById("mobileMenu");

const backToTop = document.getElementById("backToTop");
const toast = document.getElementById("toast");


/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {

  initMenu();
  initBackToTop();
  initNavigation();
  loadPosts();

});


/* =========================
   LOAD POSTS
========================= */

async function loadPosts() {

  setStatus("Загружаем публикации…");

  try {

    const response = await fetch(API_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("API error");
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.posts)) {
      throw new Error("Неверный формат API");
    }

    allPosts = data.posts;

    visiblePosts = POSTS_PER_PAGE;

    renderPosts();

    if (allPosts.length === 0) {
      setStatus("Публикаций пока нет.");
      return;
    }

    setStatus(
      `Загружено публикаций: ${allPosts.length}`
    );

  } catch (error) {

    console.error(error);

    setStatus(
      "Не удалось загрузить публикации."
    );

    showToast(
      "Ошибка загрузки ленты"
    );

  }

}


/* =========================
   RENDER POSTS
========================= */

function renderPosts() {

  if (!postsContainer) return;

  postsContainer.innerHTML = "";

  const postsToShow =
    allPosts.slice(0, visiblePosts);

  postsToShow.forEach(post => {

    postsContainer.appendChild(
      createPost(post)
    );

  });

  updateLoadMore();

}


/* =========================
   CREATE POST
========================= */

function createPost(post) {

  const article =
    document.createElement("article");

  article.className = "vkPost";

  const postId =
    post.id ||
    post.vk_id ||
    Date.now();

  const text =
    post.text ||
    "";

  const date =
    formatDate(post.post_date || post.created_at);

  const image =
    getImage(post);

  const video =
    getVideo(post);

  const liked =
    localStorage.getItem(
      `natgeo_like_${postId}`
    ) === "1";


  /* HEADER */

  const header =
    document.createElement("div");

  header.className =
    "vkPostHeader";


  const identity =
    document.createElement("div");

  identity.className =
    "vkPostIdentity";


  const avatar =
    document.createElement("div");

  avatar.className =
    "vkCommunityAvatar";


  const authorBox =
    document.createElement("div");


  const author =
    document.createElement("div");

  author.className =
    "vkPostAuthor";

  author.textContent =
    "National Geographic";


  const dateElement =
    document.createElement("div");

  dateElement.className =
    "vkPostDate";

  dateElement.textContent =
    date;


  authorBox.appendChild(author);
  authorBox.appendChild(dateElement);

  identity.appendChild(avatar);
  identity.appendChild(authorBox);


  const menu =
    document.createElement("button");

  menu.className =
    "vkPostMenu";

  menu.type =
    "button";

  menu.textContent =
    "•••";

  menu.addEventListener("click", () => {

    showPostMenu(post);

  });


  header.appendChild(identity);
  header.appendChild(menu);


  /* CONTENT */

  const content =
    document.createElement("div");

  content.className =
    "vkPostContent";


  if (text.trim()) {

    const textElement =
      document.createElement("div");

    textElement.className =
      "vkPostText";

    textElement.textContent =
      text;

    content.appendChild(
      textElement
    );

  }


  /* IMAGE */

  if (image) {

    const imageElement =
      document.createElement("img");

    imageElement.className =
      "vkPostImage";

    imageElement.src =
      image;

    imageElement.alt =
      "National Geographic";

    imageElement.loading =
      "lazy";

    imageElement.addEventListener(
      "click",
      () => openImage(image)
    );

    imageElement.addEventListener(
      "error",
      () => {
        imageElement.remove();
      }
    );

    content.appendChild(
      imageElement
    );

  }


  /* VIDEO */

  if (video) {

    const videoElement =
      document.createElement("video");

    videoElement.className =
      "vkPostVideo";

    videoElement.src =
      video;

    videoElement.controls =
      true;

    videoElement.playsInline =
      true;

    videoElement.preload =
      "metadata";

    content.appendChild(
      videoElement
    );

  }


  /* EMPTY MEDIA */

  if (
    !text.trim() &&
    !image &&
    !video
  ) {

    const placeholder =
      document.createElement("div");

    placeholder.className =
      "vkPostPlaceholder";

    placeholder.textContent =
      "NATIONAL GEOGRAPHIC";

    content.appendChild(
      placeholder
    );

  }


  /* ACTIONS */

  const actions =
    document.createElement("div");

  actions.className =
    "vkPostActions";


  /* LIKE */

  const likeButton =
    document.createElement("button");

  likeButton.type =
    "button";

  likeButton.className =
    `vkAction likeButton ${
      liked ? "liked" : ""
    }`;

  likeButton.setAttribute(
    "aria-label",
    liked
      ? "Убрать лайк"
      : "Нравится"
  );

  likeButton.innerHTML = `
    <span class="heart">♥</span>
    <span>НРАВИТСЯ</span>
  `;


  likeButton.addEventListener(
    "click",
    () => {

      toggleLike(
        postId,
        likeButton
      );

    }
  );


  /* COMMENTS */

  const commentsButton =
    document.createElement("button");

  commentsButton.type =
    "button";

  commentsButton.className =
    "vkAction";

  commentsButton.innerHTML =
    "💬 КОММЕНТАРИИ";

  commentsButton.addEventListener(
    "click",
    () => {

      showToast(
        "Комментарии скоро будут доступны"
      );

    }
  );


  /* SHARE */

  const shareButton =
    document.createElement("button");

  shareButton.type =
    "button";

  shareButton.className =
    "vkAction";

  shareButton.innerHTML =
    "↗ ПОДЕЛИТЬСЯ";

  shareButton.addEventListener(
    "click",
    () => {

      sharePost(post);

    }
  );


  actions.appendChild(
    likeButton
  );

  actions.appendChild(
    commentsButton
  );

  actions.appendChild(
    shareButton
  );


  /* BOTTOM */

  const bottom =
    document.createElement("div");

  bottom.className =
    "vkPostBottom";


  const open =
    document.createElement("a");

  open.className =
    "vkOpenPost";

  open.href =
    VK_GROUP_URL;

  open.target =
    "_blank";

  open.rel =
    "noopener noreferrer";

  open.textContent =
    "Открыть сообщество VK →";


  bottom.appendChild(
    open
  );


  article.appendChild(header);
  article.appendChild(content);
  article.appendChild(actions);
  article.appendChild(bottom);

  return article;

}


/* =========================
   LIKE
========================= */

function toggleLike(postId, button) {

  const key =
    `natgeo_like_${postId}`;

  const liked =
    localStorage.getItem(key) === "1";


  if (liked) {

    localStorage.removeItem(key);

    button.classList.remove(
      "liked"
    );

    button.setAttribute(
      "aria-label",
      "Нравится"
    );

  } else {

    localStorage.setItem(
      key,
      "1"
    );

    button.classList.add(
      "liked"
    );

    button.setAttribute(
      "aria-label",
      "Убрать лайк"
    );

  }

}


/* =========================
   IMAGE
========================= */

function getImage(post) {

  const possible =
    [
      post.image_url,
      post.image,
      post.photo,
      post.photo_url,
      post.imageUrl
    ];

  for (const item of possible) {

    if (
      typeof item === "string" &&
      item.startsWith("http")
    ) {
      return item;
    }

  }


  if (
    Array.isArray(post.attachments)
  ) {

    for (
      const attachment
      of post.attachments
    ) {

      if (
        attachment.type === "photo"
      ) {

        const photo =
          attachment.photo;

        if (
          photo?.sizes?.length
        ) {

          const sizes =
            photo.sizes;

          return sizes[
            sizes.length - 1
          ].url;

        }

      }

    }

  }

  return null;

}


/* =========================
   VIDEO
========================= */

function getVideo(post) {

  const possible =
    [
      post.video_url,
      post.videoUrl,
      post.video_mp4,
      post.video_url_hd
    ];

  for (const item of possible) {

    if (
      typeof item === "string" &&
      item.startsWith("http")
    ) {
      return item;
    }

  }

  return null;

}


/* =========================
   DATE
========================= */

function formatDate(value) {

  if (!value) {
    return "";
  }

  let date;

  if (
    typeof value === "number" ||
    /^\d+$/.test(String(value))
  ) {

    date =
      new Date(
        Number(value) * 1000
      );

  } else {

    date =
      new Date(value);

  }


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
      month: "2-digit",
      year: "numeric"
    }
  );

}


/* =========================
   LOAD MORE
========================= */

function updateLoadMore() {

  if (!loadMoreWrap) {
    return;
  }

  if (
    visiblePosts >=
    allPosts.length
  ) {

    loadMoreWrap.style.display =
      "none";

  } else {

    loadMoreWrap.style.display =
      "flex";

  }

}


if (loadMoreButton) {

  loadMoreButton.addEventListener(
    "click",
    () => {

      visiblePosts +=
        POSTS_PER_PAGE;

      renderPosts();

    }
  );

}


/* =========================
   SHARE
========================= */

async function sharePost(post) {

  const text =
    post.text ||
    "National Geographic";

  const url =
    VK_GROUP_URL;


  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title:
          "National Geographic",
        text,
        url
      });

      return;

    } catch (error) {

      return;

    }

  }


  try {

    await navigator.clipboard.writeText(
      `${text}\n\n${url}`
    );

    showToast(
      "Ссылка скопирована"
    );

  } catch (error) {

    showToast(
      "Не удалось скопировать ссылку"
    );

  }

}


/* =========================
   IMAGE VIEWER
========================= */

function openImage(src) {

  const viewer =
    document.createElement("div");

  viewer.style.position =
    "fixed";

  viewer.style.inset =
    "0";

  viewer.style.zIndex =
    "5000";

  viewer.style.background =
    "rgba(0,0,0,.96)";

  viewer.style.display =
    "flex";

  viewer.style.alignItems =
    "center";

  viewer.style.justifyContent =
    "center";

  viewer.style.padding =
    "20px";

  viewer.style.cursor =
    "zoom-out";


  const image =
    document.createElement("img");

  image.src =
    src;

  image.style.maxWidth =
    "100%";

  image.style.maxHeight =
    "100%";

  image.style.objectFit =
    "contain";


  viewer.appendChild(
    image
  );

  document.body.appendChild(
    viewer
  );


  viewer.addEventListener(
    "click",
    () => {

      viewer.remove();

    }
  );

}


/* =========================
   POST MENU
========================= */

function showPostMenu(post) {

  const text =
    post.text || "";


  if (!text) {

    showToast(
      "В этой публикации нет текста"
    );

    return;

  }


  if (
    navigator.clipboard
  ) {

    navigator.clipboard
      .writeText(text)
      .then(() => {

        showToast(
          "Текст скопирован"
        );

      });

  }

}


/* =========================
   MENU
========================= */

function initMenu() {

  if (
    !menuButton ||
    !mobileMenu
  ) {
    return;
  }


  menuButton.addEventListener(
    "click",
    () => {

      const open =
        mobileMenu.classList.toggle(
          "open"
        );

      menuButton.setAttribute(
        "aria-expanded",
        String(open)
      );

    }
  );


  mobileMenu
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        () => {

          mobileMenu.classList.remove(
            "open"
          );

        }
      );

    });

}


/* =========================
   NAVIGATION
========================= */

function initNavigation() {

  document
    .querySelectorAll('a[href^="#"]')
    .forEach(link => {

      link.addEventListener(
        "click",
        event => {

          const id =
            link.getAttribute("href");

          const target =
            document.querySelector(id);

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


/* =========================
   BACK TO TOP
========================= */

function initBackToTop() {

  if (!backToTop) {
    return;
  }


  window.addEventListener(
    "scroll",
    () => {

      if (
        window.scrollY > 500
      ) {

        backToTop.classList.add(
          "show"
        );

      } else {

        backToTop.classList.remove(
          "show"
        );

      }

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


/* =========================
   STATUS
========================= */

function setStatus(text) {

  if (feedStatus) {

    feedStatus.textContent =
      text;

  }

}


/* =========================
   TOAST
========================= */

let toastTimer;

function showToast(message) {

  if (!toast) {
    return;
  }

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2200
    );

}


/* =========================
   AUTO REFRESH
========================= */

setInterval(
  () => {

    loadPosts();

  },
  5 * 60 * 1000
);


/* =========================
   PWA
========================= */

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./sw.js")
        .catch(error => {

          console.error(
            "Service Worker:",
            error
          );

        });

    }
  );

}
