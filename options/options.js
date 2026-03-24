// options/options.js
// Entry point: initializes state from storage, wires up all modules, and starts the options page.
// @ts-nocheck — globals (FontStorage, MESSAGE_TYPES, DEFAULT_SETTINGS, etc.) loaded via <script> tags

// ---------- toast ----------

function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.hidden = true; }, duration);
}

// ---------- init ----------

async function init() {
  [siteConfig, customFonts, profiles, currentSettings] = await Promise.all([
    FontStorage.getSiteConfig(),
    FontStorage.getCustomFontsMeta(),
    FontStorage.getAllProfiles(),
    FontStorage.getSettings(),
  ]);

  await injectExtensionFontFaces(customFonts);
  applyTheme(currentSettings.colorScheme || 'light');
  renderSiteMode();
  renderSiteList();
  renderCustomFonts();
  renderProfiles();
  bindEvents();
}

init().catch(console.error);
