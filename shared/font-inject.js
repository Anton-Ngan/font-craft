// shared/font-inject.js
// Injects @font-face rules for bundled and custom fonts into the current page.
// Used by popup and options pages to make fonts available for preview.

/**
 * @param {Array} customFonts — array of custom font metadata objects from FontStorage
 */
async function injectExtensionFontFaces(customFonts) {
  const parts = BUNDLED_FONT_FACES.map(
    (f) =>
      `@font-face { font-family: "${f.name}"; src: url("${chrome.runtime.getURL(f.file)}") format("${f.format}"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`,
  );
  for (const f of customFonts) {
    if (f.source === "upload") {
      const dataUrl = await FontStorage.getCustomFontData(f.id);
      if (dataUrl) {
        parts.push(
          `@font-face { font-family: "${f.name}"; src: url("${dataUrl}") format("${f.format}"); font-display: swap; }`,
        );
      }
    } else if (f.source === "google" && f.url) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = f.url;
      document.head.appendChild(link);
    }
  }
  if (parts.length) {
    const style = document.createElement("style");
    style.textContent = parts.join("\n");
    document.head.appendChild(style);
  }
}
