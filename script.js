/* =========================================================
   NATIONAL GEOGRAPHIC — VK FEED v5.2
========================================================= */

const API_URL =
  "https://national-geographic-backend.9dnwrczbz7.workers.dev/api/posts";

const FAVORITES_KEY = "ng_favorites";
const LIKES_KEY = "ng_likes";
const EXPANDED_KEY = "ng_expanded_posts";

let allPosts = [];
let visiblePosts = 8;
let activeCategory = "Все";
let searchText = "";
let isLoading = false;

/* =========================================================
   DOM
========================================================= */

const postsContainer = document.getElementById("posts");
const featuredContainer = document.getElementById("featuredPost");
const photoGallery = document.getElementById("photoGallery");
const postSearch = document.getElementById("postSearch");
const refreshButton = document.getElementById("refreshButton");
const refreshTime = document.getElementById("refreshTime");
const resultCount = document.getElementById("resultCount");
const postsCount = document.getElementById("postsCount");
const photosCount = document.getElementById("photosCount");
const categoriesCount = document.getElementById("categoriesCount");
const year = document.getElementById("year");
const backToTop = document.getElementById("backToTop");
const menu = document.getElementById("menu");
const links = document.getElementById("links");
const mobileNav = document.getElementById("mobileNav");

if (year) {
  year.textContent = new Date().getFullYear();
}

/* =========================================================
   STORAGE
========================================================= */

function getStorageArray(key) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || "[]"
    );
  } catch {
    return [];
  }
}

function setStorageArray(key, value) {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}

function isFavorite(id) {
  return getStorageArray(FAVORITES_KEY)
    .includes(String(id));
}

function isLiked(id) {
  return getStorageArray(LIKES_KEY)
    .includes(String(id));
}

function isExpanded(id) {
  return getStorageArray(EXPANDED_KEY)
    .includes(String(id));
}

/* =========================================================
   ACTIONS
========================================================= */

function toggleFavorite(id) {
  const list =
    getStorageArray(FAVORITES_KEY);

  const value = String(id);
  const index = list.indexOf(value);

  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(value);
  }

  setStorageArray(
    FAVORITES_KEY,
    list
  );

  renderPosts();
  renderFeaturedPost();
}

function toggleLike(id) {
  const list =
    getStorageArray(LIKES_KEY);

  const value = String(id);
  const index = list.indexOf(value);

  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(value);
  }

  setStorageArray(
    LIKES_KEY,
    list
  );

  renderPosts();
}

function toggleExpanded(id) {
  const list =
    getStorageArray(EXPANDED_KEY);

  const value = String(id);
  const index = list.indexOf(value);

  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(value);
  }

  setStorageArray(
    EXPANDED_KEY,
    list
  );

  renderPosts();
}

/* =========================================================
   TEXT
========================================================= */

function cleanText(text) {
  if (!text) return "";

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
  const value = cleanText(text);

  if (value.length <= length) {
    return value;
  }

  return (
    value.substring(0, length)
      .trim() + "…"
  );
}

/* =========================================================
   DATE
========================================================= */

function formatDate(timestamp) {
  if (!timestamp) return "";

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

function formatTime(timestamp) {
  if (!timestamp) return "";

  const date =
    new Date(Number(timestamp) * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(
    "ru-RU",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

/* =========================================================
   VK
========================================================= */

function getPostLink(post) {
  if (
    post &&
    post.vk_id &&
    String(post.vk_id).includes("_")
  ) {
    const parts =
      String(post.vk_id).split("_");

    if (parts[0] && parts[1]) {
      return (
        "https://vk.com/wall" +
        parts[0] +
        "_" +
        parts[1]
      );
    }
  }

  return (
    "https://vk.ru/national.geograph1c"
  );
}

/* =========================================================
   IMAGE
========================================================= */

function getImage(post) {
  if (!post) return "";

  return (
    post.image_url ||
    post.image ||
    post.photo ||
    post.cover ||
    ""
  );
}

/* =========================================================
   CATEGORIES
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
    "тур",
    "экспедиц",
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

  let result = "Мир";
  let score = 0;

  for (
    const [category, words]
    of Object.entries(categoryKeywords)
  ) {
    let current = 0;

    words.forEach(word => {
      if (text.includes(word)) {
        current++;
      }
    });

    if (current > score) {
      score = current;
      result = category;
    }
  }

  return result;
}

function categoryIcon(category) {
  return {
    "Природа": "🏔️",
    "Путешествия": "✈️",
    "Россия": "🇷🇺",
    "Мир": "🌍",
    "Животные": "🐾"
  }[category] || "🌍";
}

/* =========================================================
   FILTER
========================================================= */

function getFilteredPosts() {
  const favorites =
    getStorageArray(
      FAVORITES_KEY
    );

  return allPosts.filter(post => {

    const category =
      detectCategory(post);

    const text =
      cleanText(post.text)
        .toLowerCase();

    const searchMatch =
      !searchText ||
      text.includes(
        searchText.toLowerCase()
      ) ||
      category
        .toLowerCase()
        .includes(
          searchText.toLowerCase()
        );

    let categoryMatch = true;

    if (activeCategory !== "Все") {

      if (
        activeCategory ===
        "Избранное"
      ) {
        categoryMatch =
          favorites.includes(
            String(post.id)
          );
      } else {
        categoryMatch =
          category ===
          activeCategory;
      }
    }

    return (
      searchMatch &&
      categoryMatch
    );
  });
}

/* =========================================================
   POST HEADER
========================================================= */

function createPostHeader(post) {
  return `
    <div class="vkPostHeader">

      <div class="vkPostIdentity">

        <div class="vkCommunityAvatar">
          <span>NG</span>
        </div>

        <div class="vkPostAuthor">

          <div class="vkAuthorLine">

            <strong>
              National Geographic
            </strong>

            <span class="verifiedBadge">
              ✓
            </span>

          </div>

          <div class="vkPostDate">
            ${escapeHtml(
              formatDate(
                post.post_date
              )
            )}
            ·
            ${escapeHtml(
              formatTime(
                post.post_date
              )
            )}
          </div>

        </div>

      </div>

      <button
        class="vkPostMenu"
        onclick="
          showPostMenu(
            ${Number(post.id)}
          )
        "
      >
        •••
      </button>

    </div>
  `;
}

/* =========================================================
   POST
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

  const liked =
    isLiked(post.id);

  const expanded =
    isExpanded(post.id);

  const link =
    getPostLink(post);

  const longText =
    text.length > 420;

  const visibleText =
    longText && !expanded
      ? truncateText(text, 420)
      : text;

  return `
    <article
      class="vkPost"
      data-post-id="${Number(post.id)}"
    >

      ${createPostHeader(post)}

      <div class="vkPostContent">

        ${
          visibleText
            ? `
              <div class="vkPostText">
                ${escapeHtml(
                  visibleText
                ).replace(
                  /\n/g,
                  "<br>"
                )}

                ${
                  longText
                    ? `
                      <button
                        class="showMoreText"
                        onclick="
                          toggleExpanded(
                            ${Number(
                              post.id
                            )}
                          )
                        "
                      >
                        ${
                          expanded
                            ? "Скрыть"
                            : "Показать полностью"
                        }
                      </button>
                    `
                    : ""
                }

              </div>
            `
            : `
              <div class="vkPostText emptyPostText">
                Новый материал
                National Geographic
              </div>
            `
        }

        <div class="vkPostCategory">

          <span>
            ${categoryIcon(
              category
            )}

            ${escapeHtml(
              category
            )}
          </span>

        </div>

        ${
          image
            ? `
              <div
                class="vkPostImage"
                onclick="
                  openPost(
                    ${Number(post.id)}
                  )
                "
              >

                <img
                  src="${escapeHtml(
                    image
                  )}"
                  alt="${escapeHtml(
                    truncateText(
                      text ||
                      category,
                      100
                    )
                  )}"
                  loading="lazy"
                />

              </div>
            `
            : `
              <div
                class="vkPostNoImage"
                onclick="
                  openPost(
                    ${Number(post.id)}
                  )
                "
              >

                <div class="vkPostNoImageLogo">
                  <span>
                    NATIONAL
                  </span>

                  <strong>
                    GEOGRAPHIC
                  </strong>
                </div>

                <div class="vkPostNoImageIcon">
                  ${categoryIcon(
                    category
                  )}
                </div>

              </div>
            `
        }

      </div>

      <div class="vkPostActions">

        <button
          class="vkAction ${
            liked ? "liked" : ""
          }"
          onclick="
            toggleLike(
              ${Number(post.id)}
            )
          "
        >
          <span class="vkActionIcon">
            ${liked ? "♥" : "♡"}
          </span>

          <span>
            Нравится
          </span>
        </button>

        <button
          class="vkAction"
          onclick="
            sharePost(
              ${Number(post.id)}
            )
          "
        >
          <span class="vkActionIcon">
            ↗
          </span>

          <span>
            Поделиться
          </span>
        </button>

        <button
          class="vkAction ${
            favorite
              ? "favoriteActive"
              : ""
          }"
          onclick="
            toggleFavorite(
              ${Number(post.id)}
            )
          "
        >
          <span class="vkActionIcon">
            ${
              favorite
                ? "★"
                : "☆"
            }
          </span>

          <span>
            ${
              favorite
                ? "Сохранено"
                : "Сохранить"
            }
          </span>
        </button>

        <a
          class="vkAction vkOpenAction"
          href="${escapeHtml(
            link
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="vkActionIcon">
            VK
          </span>

          <span>
            Открыть
          </span>
        </a>

      </div>

    </article>
  `;
}

/* =========================================================
   RENDER
========================================================= */

function renderPosts() {

  if (!postsContainer) return;

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
          Попробуйте изменить
          поиск или категорию.
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
    posts
      .map(createPost)
      .join("");

  if (
    filtered.length >
    visiblePosts
  ) {

    postsContainer.innerHTML += `
      <div class="loadMoreWrap">

        <button
          class="loadMore"
          onclick="loadMorePosts()"
        >
          ПОКАЗАТЬ ЕЩЁ
        </button>

        <span>
          Показано
          ${posts.length}
          из
          ${filtered.length}
        </span>

      </div>
    `;
  }
}

function loadMorePosts() {
  visiblePosts += 8;
  renderPosts();
}

function resetFilters() {

  activeCategory = "Все";
  searchText = "";
  visiblePosts = 8;

  if (postSearch) {
    postSearch.value = "";
  }

  document
    .querySelectorAll(
      ".categoryBtn"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.category ===
        "Все"
      );

    });

  renderPosts();
}

/* =========================================================
   FEATURED
========================================================= */

function renderFeaturedPost() {

  if (!featuredContainer) {
    return;
  }

  if (!allPosts.length) {
    featuredContainer.innerHTML =
      "";

    return;
  }

  const post =
    allPosts[0];

  const image =
    getImage(post);

  const text =
    cleanText(post.text);

  const category =
    detectCategory(post);

  featuredContainer.innerHTML = `
    <article class="featuredCard">

      ${
        image
          ? `
            <div
              class="featuredImage"
              onclick="
                openPost(
                  ${Number(post.id)}
                )
              "
            >

              <img
                src="${escapeHtml(
                  image
                )}"
                alt=""
              />

            </div>
          `
          : `
            <div class="
              featuredImage
              featuredPlaceholder
            ">
              <span>
                ${categoryIcon(
                  category
                )}
              </span>
            </div>
          `
      }

      <div class="featuredContent">

        <div class="postMeta">

          <span class="tag">
            ${categoryIcon(
              category
            )}
            ${escapeHtml(
              category
            )}
          </span>

          <span>
            ${escapeHtml(
              formatDate(
                post.post_date
              )
            )}
          </span>

        </div>

        <h3>
          ${escapeHtml(
            truncateText(
              text ||
              "Новый материал",
              150
            )
          )}
        </h3>

        <p>
          ${escapeHtml(
            truncateText(
              text ||
              "Новый материал National Geographic.",
              260
            )
          )}
        </p>

        <div class="featuredActions">

          <button
            class="readButton"
            onclick="
              openPost(
                ${Number(post.id)}
              )
            "
          >
            ЧИТАТЬ →
          </button>

          <a
            class="vkButton"
            href="${escapeHtml(
              getPostLink(post)
            )}"
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
   MODAL
========================================================= */

function openPost(id) {

  const post =
    allPosts.find(
      item =>
        Number(item.id) ===
        Number(id)
    );

  if (!post) return;

  const image =
    getImage(post);

  const text =
    cleanText(post.text);

  const category =
    detectCategory(post);

  const modal =
    document.createElement(
      "div"
    );

  modal.className =
    "postModal";

  modal.innerHTML = `

    <div
      class="modalBackdrop"
      onclick="closePostModal()"
    ></div>

    <div
      class="
        modalWindow
        vkModalWindow
      "
    >

      <button
        class="modalClose"
        onclick="closePostModal()"
      >
        ×
      </button>

      ${createPostHeader(post)}

      ${
        image
          ? `
            <div class="modalImage">

              <img
                src="${escapeHtml(
                  image
                )}"
                alt=""
              />

            </div>
          `
          : ""
      }

      <div class="modalContent">

        <div class="modalMeta">

          <span class="tag">
            ${categoryIcon(
              category
            )}
            ${escapeHtml(
              category
            )}
          </span>

          <span>
            ${escapeHtml(
              formatDate(
                post.post_date
              )
            )}
          </span>

        </div>

        <div class="modalText">
          ${escapeHtml(
            text ||
            "Новый материал National Geographic."
          ).replace(
            /\n/g,
            "<br>"
          )}
        </div>

        <div class="modalActions">

          <button
            class="favoriteLarge"
            onclick="
              toggleLike(
                ${Number(post.id)}
              )
            "
          >
            ${
              isLiked(post.id)
                ? "♥ Нравится"
                : "♡ Нравится"
            }
          </button>

          <button
            class="shareButton"
            onclick="
              sharePost(
                ${Number(post.id)}
              )
            "
          >
            ↗ Поделиться
          </button>

          <button
            class="copyButton"
            onclick="
              copyPostLink(
                ${Number(post.id)}
              )
            "
          >
            ⧉ Скопировать
          </button>

          <a
            class="vkLarge"
            href="${escapeHtml(
              getPostLink(post)
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ОТКРЫТЬ В VK ↗
          </a>

        </div>

        <div
          id="viewerStatus"
          class="viewerStatus"
        ></div>

      </div>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  document.body.classList.add(
    "modalOpen"
  );

  requestAnimationFrame(() => {
    modal.classList.add(
      "visible"
    );
  });

  document.addEventListener(
    "keydown",
    handleModalEscape
  );
}

function handleModalEscape(event) {

  if (
    event.key === "Escape"
  ) {
    closePostModal();
  }
}

function closePostModal() {

  const modal =
    document.querySelector(
      ".postModal"
    );

  if (!modal) return;

  modal.classList.remove(
    "visible"
  );

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

/* =========================================================
   MENU
========================================================= */

function showPostMenu(id) {

  const post =
    allPosts.find(
      item =>
        Number(item.id) ===
        Number(id)
    );

  if (!post) return;

  closePostMenu();

  const menu =
    document.createElement(
      "div"
    );

  menu.className =
    "vkPostMenuPopup";

  menu.innerHTML = `

    <button
      onclick="
        sharePost(${Number(post.id)});
        closePostMenu();
      "
    >
      ↗ Поделиться
    </button>

    <button
      onclick="
        copyPostLink(
          ${Number(post.id)}
        );
        closePostMenu();
      "
    >
      ⧉ Скопировать ссылку
    </button>

    <button
      onclick="
        toggleFavorite(
          ${Number(post.id)}
        );
        closePostMenu();
      "
    >
      ${
        isFavorite(post.id)
          ? "★ Убрать из сохранённых"
          : "☆ Сохранить"
      }
    </button>

  `;

  document.body.appendChild(
    menu
  );

  requestAnimationFrame(() => {
    menu.classList.add("show");
  });

  setTimeout(() => {

    document.addEventListener(
      "click",
      closeMenuOutside,
      {
        once: true
      }
    );

  }, 50);
}

function closeMenuOutside(event) {

  const menu =
    document.querySelector(
      ".vkPostMenuPopup"
    );

  if (
    menu &&
    !menu.contains(
      event.target
    )
  ) {
    closePostMenu();
  }
}

function closePostMenu() {

  const menu =
    document.querySelector(
      ".vkPostMenuPopup"
    );

  if (menu) {
    menu.remove();
  }
}

/* =========================================================
   SHARE
========================================================= */

async function sharePost(id) {

  const post =
    allPosts.find(
      item =>
        Number(item.id) ===
        Number(id)
    );

  if (!post) return;

  const link =
    getPostLink(post);

  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title:
          "National Geographic",
        text:
          truncateText(
            cleanText(
              post.text
            ),
            120
          ),
        url: link
      });

      return;

    } catch {}
  }

  await copyText(link);

  showViewerStatus(
    "Ссылка скопирована"
  );
}

async function copyPostLink(id) {

  const post =
    allPosts.find(
      item =>
        Number(item.id) ===
        Number(id)
    );

  if (!post) return;

  await copyText(
    getPostLink(post)
  );

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
      document.createElement(
        "textarea"
      );

    textarea.value = text;

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

function showViewerStatus(
  message
) {

  const status =
    document.getElementById(
      "viewerStatus"
    );

  if (!status) return;

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

  if (!photoGallery) return;

  const photos =
    allPosts.filter(
      post =>
        Boolean(
          getImage(post)
        )
    );

  document
    .querySelectorAll(
      "[data-photo-count]"
    )
    .forEach(item => {
      item.textContent =
        photos.length;
    });

  if (!photos.length) {

    photoGallery.innerHTML = `
      <div class="galleryEmpty">
        <span>📷</span>
        <p>
          Фотографии появятся
          вместе с публикациями.
        </p>
      </div>
    `;

    return;
  }

  photoGallery.innerHTML =
    photos
      .slice(0, 12)
      .map((post, index) => {

        const image =
          getImage(post);

        const category =
          detectCategory(post);

        return `
          <button
            class="
              photoItem
              photoItem${index + 1}
            "
            onclick="
              openPost(
                ${Number(post.id)}
              )
            "
          >

            <img
              src="${escapeHtml(
                image
              )}"
              alt=""
              loading="lazy"
            />

            <span class="photoOverlay">

              <strong>
                ${categoryIcon(
                  category
                )}
              </strong>

              <small>
                ${escapeHtml(
                  category
                )}
              </small>

            </span>

          </button>
        `;

      })
      .join("");
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

  const photos =
    allPosts.filter(
      post =>
        Boolean(
          getImage(post)
        )
    ).length;

  document
    .querySelectorAll(
      "[data-photo-count]"
    )
    .forEach(item => {
      item.textContent =
        photos;
    });

  if (photosCount) {
    photosCount.textContent =
      photos;
  }
}

/* =========================================================
   SKELETON
========================================================= */

function showSkeleton() {

  if (!postsContainer) return;

  postsContainer.innerHTML =
    Array.from(
      { length: 3 }
    )
      .map(() => `
        <div class="vkSkeleton">

          <div class="vkSkeletonHeader">

            <div class="skeletonAvatar"></div>

            <div class="skeletonLines">
              <span></span>
              <span></span>
            </div>

          </div>

          <div class="skeletonText">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div class="skeletonImage"></div>

        </div>
      `)
      .join("");
}

/* =========================================================
   API
========================================================= */

async function loadPosts() {

  if (isLoading) return;

  isLoading = true;

  if (
    !allPosts.length
  ) {
    showSkeleton();
  }

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
      !Array.isArray(
        data.posts
      )
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
            Number(
              b.post_date || 0
            ) -
            Number(
              a.post_date || 0
            )
        );

    visiblePosts = 8;

    updateStats();
    renderFeaturedPost();
    renderPosts();
    renderGallery();

    if (refreshTime) {

      refreshTime.textContent =
        "Обновлено " +
        new Date()
          .toLocaleTimeString(
            "ru-RU",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          );

    }

  } catch (error) {

    console.error(
      "National Geographic API:",
      error
    );

    if (!allPosts.length) {

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
            и попробуйте ещё раз.
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
   SEARCH
========================================================= */

function setupSearch() {

  if (!postSearch) return;

  postSearch.addEventListener(
    "input",
    event => {

      searchText =
        event.target.value.trim();

      visiblePosts = 8;

      renderPosts();

    }
  );
}

/* =========================================================
   CATEGORY
========================================================= */

function setupCategoryButtons() {

  document
    .querySelectorAll(
      ".categoryBtn"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          activeCategory =
            button.dataset.category ||
            "Все";

          visiblePosts = 8;

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

          activeCategory =
            card.dataset
              .jumpCategory;

          visiblePosts = 8;

          document
            .querySelectorAll(
              ".categoryBtn"
            )
            .forEach(button => {

              button.classList.toggle(
                "active",
                button.dataset.category ===
                activeCategory
              );

            });

          renderPosts();

          const latest =
            document.getElementById(
              "latest"
            );

          if (latest) {

            latest.scrollIntoView({
              behavior: "smooth"
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

  if (!menu || !links) return;

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
   MOBILE NAV
========================================================= */

function setupMobileNavigation() {

  if (!mobileNav) return;

  const items =
    mobileNav.querySelectorAll(
      ".mobileNavItem"
    );

  items.forEach(item => {

    item.addEventListener(
      "click",
      event => {

        event.preventDefault();

        const target =
          document.getElementById(
            item.dataset
              .mobileTarget
          );

        if (!target) return;

        items.forEach(
          element =>
            element.classList.remove(
              "active"
            )
        );

        item.classList.add(
          "active"
        );

        target.scrollIntoView({
          behavior: "smooth"
        });

      }
    );

  });

  updateMobileNavigation();
}

function updateMobileNavigation() {

  if (!mobileNav) return;

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

  let current = "home";

  const position =
    window.scrollY +
    window.innerHeight *
    0.35;

  sections.forEach(id => {

    const section =
      document.getElementById(id);

    if (
      section &&
      section.offsetTop <=
      position
    ) {
      current = id;
    }

  });

  items.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset
        .mobileTarget ===
      current
    );

  });
}

/* =========================================================
   BACK TO TOP
========================================================= */

function setupBackToTop() {

  if (!backToTop) return;

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
   GEOGRAPHY
========================================================= */

function setupGeographyMap() {

  const map =
    document.getElementById(
      "geoMap"
    );

  if (!map) return;

  const places = {

    point1: {
      title: "Алтай",
      text:
        "Горы, озёра и дикая природа России."
    },

    point2: {
      title: "Курилы",
      text:
        "Вулканы, океан и островные пейзажи."
    },

    point3: {
      title: "Приморье",
      text:
        "Тайга встречается с Тихим океаном."
    },

    point4: {
      title: "Байкал",
      text:
        "Одно из самых известных природных мест России."
    }

  };

  map
    .querySelectorAll(
      ".mapPoint"
    )
    .forEach(point => {

      const key =
        Array.from(
          point.classList
        ).find(
          value =>
            value.startsWith(
              "point"
            )
        );

      const data =
        places[key];

      if (!data) return;

      point.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          showMapTooltip(
            map,
            point,
            data
          );

        }
      );

    });
}

function showMapTooltip(
  map,
  point,
  data
) {

  const old =
    map.querySelector(
      ".geoTooltip"
    );

  if (old) {
    old.remove();
  }

  const tooltip =
    document.createElement(
      "div"
    );

  tooltip.className =
    "geoTooltip";

  tooltip.innerHTML = `
    <strong>
      ${escapeHtml(
        data.title
      )}
    </strong>

    <span>
      ${escapeHtml(
        data.text
      )}
    </span>
  `;

  map.appendChild(
    tooltip
  );

  const p =
    point.getBoundingClientRect();

  const m =
    map.getBoundingClientRect();

  tooltip.style.left =
    (
      p.left -
      m.left +
      p.width / 2
    ) + "px";

  tooltip.style.top =
    (
      p.top -
      m.top -
      12
    ) + "px";
}

/* =========================================================
   PWA
========================================================= */

function registerPWA() {

  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "./sw.js"
        )
        .catch(
          error =>
            console.error(
              "PWA:",
              error
            )
        );

    }
  );
}

/* =========================================================
   EVENTS
========================================================= */

if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    () => loadPosts()
  );

}

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

setInterval(
  loadPosts,
  5 * 60 * 1000
);

window.addEventListener(
  "scroll",
  updateMobileNavigation,
  {
    passive: true
  }
);

/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupSearch();
    setupCategoryButtons();
    setupCategoryCards();
    setupMobileMenu();
    setupMobileNavigation();
    setupBackToTop();
    setupGeographyMap();
    registerPWA();

    loadPosts();

  }
);

/* =========================================================
   GLOBAL
========================================================= */

window.openPost =
  openPost;

window.closePostModal =
  closePostModal;

window.toggleFavorite =
  toggleFavorite;

window.toggleLike =
  toggleLike;

window.toggleExpanded =
  toggleExpanded;

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

window.showPostMenu =
  showPostMenu;

window.closePostMenu =
  closePostMenu;
