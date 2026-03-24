// popup/popup-state.js
// Mutable state shared across all popup modules.
// Loaded before any other popup-specific script.

let settings = Object.assign({}, DEFAULT_SETTINGS);
let siteConfig = { siteMode: SITE_MODES.GLOBAL, siteList: [] };
let currentTab = null;
let currentHostname = "";
let profiles = [];
let customFonts = [];
