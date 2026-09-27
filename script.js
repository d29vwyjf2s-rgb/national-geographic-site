function createPost(post) {

  const images = getImages(post);

  const date =
    post.post_date
      ? new Date(post.post_date * 1000)
          .toLocaleString("ru-RU", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
      : "";

  const text = createPostText(
    post.text || "",
    post.id
  );

  const gallery =
    images.length
      ? createGallery(images, post.id)
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
          <strong>National Geographic</strong>
          <span>${date}</span>
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
          rel="noopener"
        >
          VK
        </a>

      </div>

    </article>
  `;
}
