const DICTIONARY_URL =
  "https://dd9olqht68i8r.cloudfront.net/translation/e2v.v1.min.json" ||
  chrome.runtime.getURL("e2v.v1.min.json");
let entriesPromise;
let indexPromise;
function normalizeWord(word) {
  return word.normalize("NFC").trim().toLowerCase();
}
async function loadDictionary() {
  if (!entriesPromise) {
    entriesPromise = fetch(DICTIONARY_URL)
      .then((response) => response.json())
      .catch((error) => {
        entriesPromise = null;
        throw error;
      });
  }
  return entriesPromise;
}
async function getIndex() {
  if (!indexPromise) {
    indexPromise = loadDictionary()
      .then((entries) => {
        const index = new Map();
        for (const entry of entries) {
          if (typeof entry.word !== "string") continue;
          const key = normalizeWord(entry.word);
          if (!index.has(key)) {
            index.set(key, []);
          }
          index.get(key).push(entry);
        }
        return index;
      })
      .catch((error) => {
        indexPromise = null;
        throw error;
      });
  }

  return indexPromise;
}

// Tra cứu chính xác
export async function lookupWord(word) {
  const index = await getIndex();

  return index.get(normalizeWord(word)) ?? [];
}

// Gợi ý từ theo tiền tố
export async function suggestWords(query, limit = 10) {
  const prefix = normalizeWord(query);
  const index = await getIndex();

  if (!prefix) return [];

  const results = [];

  for (const [word, entries] of index) {
    if (!word.startsWith(prefix)) continue;

    results.push({
      word: entries[0].word,
      entries,
    });

    if (results.length >= limit) break;
  }

  return results;
}
