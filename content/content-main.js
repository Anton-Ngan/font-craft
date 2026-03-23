// content/content-main.js
// Core content script: CSS custom property injection, whitelist guard,
// MutationObserver for SPA resilience, message handling.
// Injected into ALL frames (all_frames: true in manifest).

(() => {
  const STYLE_ID = 'font-accessibility-override';
  const FONT_FACE_ID = 'font-accessibility-fontfaces';
  let currentSettings = null;
  let isActive = false;
  let mutationDebounce = null;

  // ---------- CSS generation ----------

  function buildRootVars(settings) {
    const vars = [];
    if (settings.fontFamily) {
      vars.push(`  --fa-font-family: ${settings.fontFamily};`);
    }
    if (settings.fontScale && settings.fontScale !== 1) {
      vars.push(`  --fa-font-scale: ${settings.fontScale};`);
    }
    if (settings.textColor) {
      vars.push(`  --fa-text-color: ${settings.textColor};`);
    }
    if (settings.wordSpacing) {
      vars.push(`  --fa-word-spacing: ${settings.wordSpacing};`);
    }
    if (settings.letterSpacing) {
      vars.push(`  --fa-letter-spacing: ${settings.letterSpacing};`);
    }
    if (settings.lineHeight) {
      vars.push(`  --fa-line-height: ${settings.lineHeight};`);
    }
    if (settings.paragraphSpacing) {
      vars.push(`  --fa-paragraph-spacing: ${settings.paragraphSpacing};`);
    }
    if (settings.highlightColor) {
      vars.push(`  --fa-highlight-color: ${settings.highlightColor};`);
    }
    if (settings.highlightTextColor) {
      vars.push(`  --fa-highlight-text-color: ${settings.highlightTextColor};`);
    }
    return vars.join('\n');
  }

  function buildCSS(settings) {
    const rootVars = buildRootVars(settings);

    // Collect all universal declarations into one rule — one selector pass
    // per element instead of up to six.
    const props = [];
    if (settings.fontFamily) props.push('  font-family: var(--fa-font-family) !important;');
    if (settings.fontScale && settings.fontScale !== 1) props.push('  font-size: calc(1em * var(--fa-font-scale)) !important;');
    if (settings.textColor) props.push('  color: var(--fa-text-color) !important;');
    if (settings.wordSpacing) props.push('  word-spacing: var(--fa-word-spacing) !important;');
    if (settings.letterSpacing) props.push('  letter-spacing: var(--fa-letter-spacing) !important;');
    if (settings.lineHeight) props.push('  line-height: var(--fa-line-height) !important;');

    const parts = [];
    if (rootVars) parts.push(`:root {\n${rootVars}\n}`);
    if (props.length) parts.push(`*, *::before, *::after {\n${props.join('\n')}\n}`);
    if (settings.paragraphSpacing) parts.push(`p, blockquote, li, dd, dt, h1, h2, h3, h4, h5, h6 { margin-bottom: var(--fa-paragraph-spacing) !important; }`);
    if (settings.highlightColor) parts.push(`::selection { background-color: var(--fa-highlight-color) !important;${settings.highlightTextColor ? ' color: var(--fa-highlight-text-color) !important;' : ''} }`);

    return parts.join('\n\n');
  }

  // ---------- style injection ----------

  function injectStyle(css) {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  function removeStyle() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
    const ff = document.getElementById(FONT_FACE_ID);
    if (ff) ff.remove();
  }

  function injectFontFaces(fontFaces) {
    let el = document.getElementById(FONT_FACE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = FONT_FACE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = fontFaces;
  }

  // ---------- active state check ----------

  async function checkActiveState() {
    const { siteMode, siteList } = await FontStorage.getSiteConfig();
    const hostname = window.location.hostname;
    switch (siteMode) {
      case SITE_MODES.GLOBAL:
        return true;
      case SITE_MODES.WHITELIST:
        return siteList.some(s => hostname === s || hostname.endsWith('.' + s));
      case SITE_MODES.BLACKLIST:
        return !siteList.some(s => hostname === s || hostname.endsWith('.' + s));
      default:
        return true;
    }
  }

  // ---------- apply settings ----------

  async function applySettings(settings) {
    currentSettings = settings;
    if (!settings.enabled || !isActive) {
      removeStyle();
      return;
    }
    const css = buildCSS(settings);
    injectStyle(css);
  }

  // ---------- init ----------

  async function init() {
    isActive = await checkActiveState();
    if (!isActive) return;

    currentSettings = await FontStorage.getSettings();
    await applySettings(currentSettings);

    // Inject any saved custom font faces
    await reinjectCustomFonts();

    // Watch for head removal (SPA full re-renders)
    startObserver();

    // Notify service worker of active state for badge update
    try {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.UPDATE_BADGE,
        active: isActive && currentSettings.enabled,
      });
    } catch { /* service worker may not be running */ }
  }

  // ---------- custom font injection ----------

  async function reinjectCustomFonts() {
    // Always inject @font-face rules for all bundled accessibility fonts.
    // BUNDLED_FONT_FACES is defined in constants.js (loaded before this script).
    // Using chrome.runtime.getURL() resolves to the extension's web_accessible_resources.
    const fontFaceParts = BUNDLED_FONT_FACES.map(f =>
      `@font-face { font-family: "${f.name}"; src: url("${chrome.runtime.getURL(f.file)}") format("${f.format}"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`
    );

    const meta = await FontStorage.getCustomFontsMeta();
    for (const font of meta) {
      if (font.source === 'upload') {
        const dataUrl = await FontStorage.getCustomFontData(font.id);
        if (dataUrl) {
          fontFaceParts.push(
            `@font-face { font-family: "${font.name}"; src: url("${dataUrl}") format("${font.format || 'woff2'}"); font-display: swap; }`
          );
        }
      } else if (font.source === 'google' && font.url) {
        // Inject as a <link> element
        const existingLink = document.querySelector(`link[data-fa-font="${font.id}"]`);
        if (!existingLink) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = font.url;
          link.setAttribute('data-fa-font', font.id);
          (document.head || document.documentElement).appendChild(link);
        }
      }
    }

    injectFontFaces(fontFaceParts.join('\n'));
  }

  // ---------- MutationObserver (SPA resilience) ----------

  function startObserver() {
    const check = () => {
      if (mutationDebounce) clearTimeout(mutationDebounce);
      mutationDebounce = setTimeout(() => {
        if (!isActive || !currentSettings?.enabled) return;
        if (!document.getElementById(STYLE_ID) && currentSettings) {
          injectStyle(buildCSS(currentSettings));
        }
        if (!document.getElementById(FONT_FACE_ID)) {
          reinjectCustomFonts();
        }
      }, 100);
    };

    const observer = new MutationObserver(check);
    // Watch documentElement direct children to detect <head> replacement by SPAs
    observer.observe(document.documentElement, { childList: true });
    // Watch <head> direct children to detect style tag removal
    if (document.head) observer.observe(document.head, { childList: true });
  }

  // ---------- message handling ----------

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case MESSAGE_TYPES.APPLY_SETTINGS: {
        FontStorage.saveSettings(message.settings).then(saved => {
          currentSettings = saved;
          applySettings(saved);
          sendResponse({ ok: true });
        });
        return true; // async
      }

      case MESSAGE_TYPES.GET_ACTIVE_STATE: {
        checkActiveState().then(active => {
          isActive = active;
          sendResponse({
            active,
            enabled: currentSettings?.enabled ?? true,
            hostname: window.location.hostname,
          });
        });
        return true;
      }

      case MESSAGE_TYPES.INJECT_FONT_FACE: {
        // Sent after a new custom font is added
        reinjectCustomFonts().then(() => sendResponse({ ok: true }));
        return true;
      }
    }
  });

  // ---------- storage change listener ----------
  // Reflects changes from other tabs or the options page

  chrome.storage.onChanged.addListener((changes, area) => {
    if (changes[STORAGE_KEYS.SETTINGS]) {
      const newSettings = Object.assign({}, DEFAULT_SETTINGS, changes[STORAGE_KEYS.SETTINGS].newValue);
      applySettings(newSettings);
    }
    if (changes[STORAGE_KEYS.SITE_MODE] || changes[STORAGE_KEYS.SITE_LIST]) {
      checkActiveState().then(active => {
        isActive = active;
        if (currentSettings) applySettings(currentSettings);
      });
    }
    if (changes[STORAGE_KEYS.CUSTOM_FONTS_META]) {
      reinjectCustomFonts();
    }
  });

  // ---------- start ----------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
