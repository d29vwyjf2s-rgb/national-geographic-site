const posts = [
  {
    tag: "ПРИРОДА",
    title: "Горы, которые хочется увидеть своими глазами",
    text: "Дикие пейзажи и места, где человек остаётся гостем.",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85"
  },
  {
    tag: "ПУТЕШЕСТВИЯ",
    title: "Места, которые выглядят нереально",
    text: "От вулканов до ледяных озёр — планета умеет удивлять.",
    image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=85"
  },
  {
    tag: "ОКЕАН",
    title: "Там, где начинается бесконечность",
    text: "Океан занимает большую часть нашей планеты. И мы знаем о нём далеко не всё.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85"
  }
];

document.querySelector("#posts").innerHTML = posts.map(post => `
  <article class="post">

    <div
      class="postImg"
      style="background-image:url('${post.image}')"
    >
      <span class="tag">${post.tag}</span>
    </div>

    <div class="postBody">

      <h3>${post.title}</h3>

      <p>${post.text}</p>

      <a
        href="https://vk.ru/national.geograph1c"
        target="_blank"
      >
        Читать во ВКонтакте →
      </a>

    </div>

  </article>
`).join("");

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
