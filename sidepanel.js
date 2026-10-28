import { lookupWord } from "./dictionary.js";

const $ = (q, c = document) => c.querySelector(q);

const input = $("#input");
const output = $("#output");
const list = $("#list");

let controller = null;
let requestId = 0;
let timer = null;
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TEXT_SELECTED") {
    input.value = message.text;
    handleInput(message.text);
  }
});
// Debounce 400ms
input.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => handleInput(input.value), 400);
});

async function handleInput(value) {
  const text = value.trim();

  // Hủy request trước và tạo controller mới
  controller?.abort();
  const ctrl = new AbortController();
  controller = ctrl;
  const currentId = ++requestId;
  const isStale = () => currentId !== requestId;

  if (!text) {
    output.value = "";
    list.replaceChildren();
    return;
  }

  const words = [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}_]+/u)
        .filter(Boolean),
    ),
  ];

  // Tra từ điển + Dịch song song
  const lookupPromise = Promise.all(
    words.map(async (word) => {
      try {
        return { word, entries: await lookupWord(word) };
      } catch (error) {
        console.error("Lookup error:", word, error);
        return { word, entries: [] };
      }
    }),
  );

  const translatePromise = translate(text, "en", "vi", {
    signal: ctrl.signal,
  });

  // --- Render Từ Điển (Cấu trúc Details / Summary M3) ---
  const results = await lookupPromise;
  if (isStale()) return;

  const fragment = document.createDocumentFragment();

  results.forEach(({ word, entries }, index) => {
    const details = createElement("details", "", "word-item");

    // Từ đầu tiên mở mặc định (mở accordion đầu tiên)
    if (index === 0) details.open = true;

    // --- Header Accordion (<summary>) ---
    const summary = createElement("summary", "", "word-header");
    summary.setAttribute("aria-label", `Chi tiết từ: ${word}`);

    const wordTitle = createElement("span", word, "word-title");
    const icon = createElement("span", "chevron_right", "material-symbols-outlined");
    icon.setAttribute("aria-hidden", "true");

    summary.append(wordTitle, icon);
    details.append(summary);

    // --- Nội dung từ điển (<article>) ---
    if (entries.length === 0) {
      const notFound = createElement("article", "", "word-content");
      notFound.append(
        createElement("p", `Không tìm thấy từ "${word}".`, "not-found"),
      );
      details.append(notFound);
    } else {
      for (const entry of entries) {
        renderEntry(entry, details);
      }
    }

    fragment.append(details);
  });

  list.replaceChildren(fragment);

  // --- Render Bản Dịch ---
  try {
    const translation = await translatePromise;
    if (isStale()) return;
    output.value = translation;
  } catch (error) {
    if (error.name === "AbortError" || isStale()) return;
    output.value = "Lỗi dịch. Vui lòng thử lại.";
    console.error("Translation error:", error);
  }
}

async function translate(text, sl = "en", tl = "vi", { signal } = {}) {
  const params = new URLSearchParams({
    client: "gtx",
    sl,
    tl,
    dt: "t",
    q: text,
  });
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  return data[0]
    .map((s) => s[0])
    .filter(Boolean)
    .join("");
}

function renderEntry(entry, context) {
  const article = createElement("article", "", "word-content");
  article.append(createElement("h2", entry.word ?? ""));

  // --- Nhóm phiên âm ---
  if (entry.pronunciations?.length) {
    const pronGroup = createElement("div", "", "pronunciation-group");
    for (const p of entry.pronunciations) {
      pronGroup.append(
        createElement("span", `${p.type}: ${p.text}`, "pronunciation"),
      );
    }
    article.append(pronGroup);
  }

  // --- Nhóm các từ loại & định nghĩa ---
  for (const translation of entry.translations ?? []) {
    const section = createElement("section", "", "part-of-speech");
    if (translation.type) {
      section.append(createElement("h3", translation.type));
    }

    const meaningList = createElement("ul", "", "meaning-list");

    for (const meaning of translation.meanings ?? []) {
      const liMeaning = createElement("li", "", "meaning");
      const contentText = Array.isArray(meaning.content)
        ? meaning.content.join(" ")
        : (meaning.content ?? "");

      // Nếu có ví dụ câu, dùng thẻ span cho nghĩa để chứa thêm danh sách <ul> ví dụ con
      if (meaning.examples?.length) {
        liMeaning.append(createElement("span", contentText, "text"));

        const exampleList = createElement("ul", "", "example-list");
        for (const ex of meaning.examples) {
          const liExample = document.createElement("li");
          liExample.append(
            createElement("span", ex.english, "en"),
            createElement("span", ex.vietnamese, "vi"),
          );
          exampleList.append(liExample);
        }
        liMeaning.append(exampleList);
      } else {
        liMeaning.textContent = contentText;
      }

      meaningList.append(liMeaning);
    }

    section.append(meaningList);
    article.append(section);
  }

  context.append(article);
}

function createElement(tag, text = "", className = "") {
  const el = document.createElement(tag);
  if (text) el.textContent = text; // Dùng textContent an toàn hơn innerHTML
  if (className) el.className = className;
  return el;
}


const darkModeBtn = document.getElementById('dark-mode-btn');

// Check for saved user preference on load
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

darkModeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  
  // Save preference to localStorage
  if (document.body.classList.contains('dark')) {
    localStorage.setItem('theme', 'dark');
  } else {
    localStorage.setItem('theme', 'light');
  }
});