// shared/constants.js
// Shared constants across popup, content scripts, and service worker

const STORAGE_KEYS = {
  SETTINGS: 'settings',
  SITE_MODE: 'siteMode',       // 'global' | 'whitelist' | 'blacklist'
  SITE_LIST: 'siteList',       // string[]
  PROFILE_INDEX: 'profileIndex', // string[] of profile IDs
  CUSTOM_FONTS_META: 'customFontsMeta', // metadata array (sync)
  // font binaries stored in local as 'customFont_<id>'
};

const MESSAGE_TYPES = {
  // Popup → Content
  APPLY_SETTINGS: 'APPLY_SETTINGS',
  GET_ACTIVE_STATE: 'GET_ACTIVE_STATE',
  INJECT_FONT_FACE: 'INJECT_FONT_FACE',
  // Content → Popup / Service Worker
  ACTIVE_STATE: 'ACTIVE_STATE',
  // Service Worker internal
  UPDATE_BADGE: 'UPDATE_BADGE',
};

const DEFAULT_SETTINGS = {
  enabled: true,
  fontFamily: '',          // '' = no override (use page font)
  fontScale: 1,            // multiplier, 1 = no change
  textColor: '',           // '' = no override
  wordSpacing: '',         // '' = normal, else CSS value e.g. '0.2em'
  letterSpacing: '',       // '' = normal
  lineHeight: '',          // '' = normal
  paragraphSpacing: '',    // '' = normal
  highlightColor: '',      // '' = browser default
  highlightTextColor: '',  // '' = browser default
};

const SITE_MODES = {
  GLOBAL: 'global',       // active everywhere
  WHITELIST: 'whitelist', // active only on listed sites
  BLACKLIST: 'blacklist', // active everywhere except listed sites
};

// Bundled accessibility font faces — loaded by content scripts to inject @font-face rules.
// Each entry maps to a file in fonts/bundled/ (declared as web_accessible_resources).
const BUNDLED_FONT_FACES = [
  { name: 'OpenDyslexic', file: 'fonts/bundled/OpenDyslexic-Regular.otf',    weight: '400', style: 'normal', format: 'opentype' },
  { name: 'OpenDyslexic', file: 'fonts/bundled/OpenDyslexic-Bold.otf',       weight: '700', style: 'normal', format: 'opentype' },
  { name: 'OpenDyslexic', file: 'fonts/bundled/OpenDyslexic-Italic.otf',     weight: '400', style: 'italic', format: 'opentype' },
  { name: 'OpenDyslexic', file: 'fonts/bundled/OpenDyslexic-BoldItalic.otf', weight: '700', style: 'italic', format: 'opentype' },
  { name: 'Atkinson Hyperlegible', file: 'fonts/bundled/AtkinsonHyperlegible-Regular.woff2', weight: '400', style: 'normal', format: 'woff2' },
  { name: 'Atkinson Hyperlegible', file: 'fonts/bundled/AtkinsonHyperlegible-Bold.woff2',    weight: '700', style: 'normal', format: 'woff2' },
  { name: 'Lexend', file: 'fonts/bundled/Lexend-Regular.woff2', weight: '400', style: 'normal', format: 'woff2' },
];

// Make available in both module and non-module contexts
if (typeof module !== 'undefined') {
  module.exports = { STORAGE_KEYS, MESSAGE_TYPES, DEFAULT_SETTINGS, SITE_MODES, BUNDLED_FONT_FACES };
}
