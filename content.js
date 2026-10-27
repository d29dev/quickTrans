document.addEventListener(
  "selectionchange",
  debounce(() => {
    const selection = document.getSelection()?.toString().trim();

    if (!selection) return;

    chrome.runtime.sendMessage({
      type: "TEXT_SELECTED",
      text: selection,
    });
  }, 400),
);

function debounce(func, timeout = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}
