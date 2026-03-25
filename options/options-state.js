// options/options-state.js
// Mutable state shared across all options modules.
// Loaded before any other options-specific script.

let siteConfig = { siteMode: SITE_MODES.GLOBAL, siteList: [] };
let customFonts = [];
let profiles = [];
let currentSettings = null;
