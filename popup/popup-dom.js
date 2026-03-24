// popup/popup-dom.js
// DOM element references for the popup page.
// Loaded after popup-state.js, before any module that reads DOM elements.

const $ = (id) => document.getElementById(id);

const statusBadge = $("status-badge");
const statusText = $("status-text");
const statusLive = $("status-live");
const siteLabel = $("site-label");
const btnToggleSite = $("btn-toggle-site");
const fontFamilySelect = $("font-family");
const btnPreviewFont = $("btn-preview-font");
const fontPreview = $("font-preview");
const lineHeightSlider = $("line-height");
const lineHeightLabel = $("line-height-label");
const letterSpacingSlider = $("letter-spacing");
const letterSpacingLabel = $("letter-spacing-label");
const wordSpacingSlider = $("word-spacing");
const wordSpacingLabel = $("word-spacing-label");
const paragraphSpacingSlider = $("paragraph-spacing");
const paragraphSpacingLabel = $("paragraph-spacing-label");
const btnLhDec = $("btn-lh-dec");
const btnLhInc = $("btn-lh-inc");
const btnResetLineHeight = $("btn-reset-line-height");
const btnLsDec = $("btn-ls-dec");
const btnLsInc = $("btn-ls-inc");
const btnResetLetterSpacing = $("btn-reset-letter-spacing");
const btnWsDec = $("btn-ws-dec");
const btnWsInc = $("btn-ws-inc");
const btnResetWordSpacing = $("btn-reset-word-spacing");
const btnPsDec = $("btn-ps-dec");
const btnPsInc = $("btn-ps-inc");
const btnResetParagraphSpacing = $("btn-reset-paragraph-spacing");
const textColorInput = $("text-color");
const textColorHex = $("text-color-hex");
const btnResetTextColor = $("btn-reset-text-color");
const highlightColorInput = $("highlight-color");
const highlightColorHex = $("highlight-color-hex");
const btnResetHighlight = $("btn-reset-highlight");
const highlightTextColorInput = $("highlight-text-color");
const highlightTextColorHex = $("highlight-text-color-hex");
const btnResetHighlightText = $("btn-reset-highlight-text");
const fieldHighlightText = $("field-highlight-text");
const profileNameInput = $("profile-name");
const btnSaveProfile = $("btn-save-profile");
const profilesList = $("profiles-list");
const btnResetAll = $("btn-reset-all");
const btnOptions = $("btn-options");
const btnThemeToggle = $("btn-theme-toggle");
