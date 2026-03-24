// popup/popup.js
// Entry point: initialises state from storage, wires up all modules, and starts the popup.

// ---------- send settings to content script ----------

async function pushSettings(newSettings) {
  settings = Object.assign({}, settings, newSettings);
  await FontStorage.saveSettings(settings);
  if (currentTab?.id) {
    chrome.tabs
      .sendMessage(currentTab.id, {
        type: MESSAGE_TYPES.APPLY_SETTINGS,
        settings,
      })
      .catch(() => {});
  }
}

// ---------- init ----------

async function init() {
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const url = new URL(currentTab.url);
    currentHostname = url.hostname;
  } catch {
    currentHostname = "";
  }

  siteLabel.textContent = currentHostname || "this page";

  [settings, siteConfig, profiles, customFonts] = await Promise.all([
    FontStorage.getSettings(),
    FontStorage.getSiteConfig(),
    FontStorage.getAllProfiles(),
    FontStorage.getCustomFontsMeta(),
  ]);

  await injectExtensionFontFaces(customFonts);
  applyTheme(settings.colorScheme || "light");
  populateFontSelect();
  renderControls();
  renderSiteState();
  renderProfiles();
  bindEvents();
}

init().catch(console.error);
