# Typeset: Font, Text Spacing & Color Control

![Typeset icon](assets/icons/icon-48.png)

A Chrome extension that lets you override fonts, spacing, and colors on any webpage. It's designed for users with dyslexia, low vision, or other reading difficulties, and for anyone who wants more control over the typeset in their the webpage.

## Features

- **Font family**: switch to OpenDyslexic, Atkinson Hyperlegible, Lexend, any system font, or upload your own (.woff2, .woff, .ttf, .otf)
- **Line height, letter spacing, word spacing, paragraph spacing**: fine-grained control over text density
- **Text color**: override foreground color across the page
- **Selection highlight color**: set a custom background for selected text
- **Profiles**: save named setting combinations and switch between them instantly
- **Per-site control**: apply everywhere, only on specific sites, or skip specific sites
- **Light and dark theme**: the extension UI follows your preference or can be forced

## Installation

The extension isn't published to the Chrome Web Store yet. To load it locally:

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder

The extension icon will appear in your toolbar. Click it to open the popup, or right-click → **Options** for the full settings page.

## Permissions

| Permission   | Why                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------- |
| `storage`    | Saves your settings, profiles, site lists, and uploaded fonts                             |
| `activeTab`  | Reads the current tab's hostname to apply per-site rules                                  |
| `scripting`  | Injects CSS into pages to apply your typography settings                                  |
| `tabs`       | Updates the toolbar badge to show whether the extension is active                         |
| `<all_urls>` | Required to run on any website — respects your site mode (global / whitelist / blacklist) |

No data is sent anywhere. Everything stays on your device.

## Bundled fonts

| Font                                                           | Source            | License                        |
| -------------------------------------------------------------- | ----------------- | ------------------------------ |
| [OpenDyslexic](https://opendyslexic.org)                       | Abelardo Gonzalez | SIL Open Font License 1.1      |
| [Atkinson Hyperlegible](https://brailleinstitute.org/freefont) | Braille Institute | Braille Institute Font License |
| [Lexend](https://fonts.google.com/specimen/Lexend)             | Thomas Jockin     | SIL Open Font License 1.1      |

Full license text is in [`fonts/bundled/README.md`](fonts/bundled/README.md).

## Project structure

```
background/
  service-worker.js          Toolbar badge, tab change monitoring

content/
  content-main.js            CSS injection, active-state check, SPA resilience
  content-inspector.js       Interactive font inspector tool
  content-iframe-bridge.js   Relays settings to cross-origin child iframes

popup/
  popup.html                 Markup for the 340px popup panel
  popup.js                   Entry point — init() and pushSettings()
  popup-state.js             Shared mutable state (settings, profiles, etc.)
  popup-dom.js               DOM element references
  popup-helpers.js           Slider fill, step, color hex, tab switching
  popup-controls.js          renderControls() — syncs inputs to settings
  popup-fonts.js             Font select population and preview strip
  popup-site.js              Site active-state logic and site toggle
  popup-profiles.js          Profile list rendering and inline rename
  popup-events.js            All event listener wiring (bindEvents)
  popup-layout.css           Variables, body, header, badge, site bar, tabs, panels, fields
  popup-controls.css         Font selector, sliders, inputs, color pickers, buttons
  popup-theme.css            Profiles, footer, tooltip, animations, scrollbar, dark mode

options/
  options.html               Markup for the full settings page
  options.js                 Entry point — showToast() and init()
  options-state.js           Shared mutable state (siteConfig, customFonts, etc.)
  options-fonts.js           Custom font list, file upload, Google Fonts handling
  options-profiles.js        Profile list rendering and inline rename
  options-sites.js           Site mode radios and site list rendering
  options-events.js          All event listener wiring (bindEvents, notifyAllTabs)
  options-layout.css         Variables, body, page layout, header, sections, cards, upload area
  options-components.css     Inputs, radio group, buttons, item lists, tags, toast
  options-theme.css          Dark mode and narrow viewport breakpoint

shared/
  constants.js               STORAGE_KEYS, MESSAGE_TYPES, DEFAULT_SETTINGS, SITE_MODES
  storage.js                 FontStorage — all chrome.storage read/write operations
  font-list.js               BUNDLED_FONTS and SYSTEM_FONTS catalogs
  utils.js                   escapeHtml() for XSS protection
  theme.js                   resolveScheme(), applyTheme(), updateThemeButton()
  font-inject.js             injectExtensionFontFaces() for font preview in UI pages
  base.css                   Design tokens (colors, typography, focus styles)

fonts/bundled/               OpenDyslexic, Atkinson Hyperlegible, Lexend + license notes
assets/icons/                Extension icons at 16, 32, 48, and 128px
```

## Architecture notes

**Settings are applied via CSS custom properties**: the content script sets `--fa-*` variables on `:root` which cascade to all elements. This is a single-pass operation rather than per-element manipulation, and handles dynamically added content without re-traversal.

**Tiered storage**: settings and profiles use `chrome.storage.sync` (syncs across devices). Custom font binaries use `chrome.storage.local` (too large for sync). The `FontStorage` abstraction in `shared/storage.js` handles both.

**SPA support**: a `MutationObserver` in `content-main.js` watches for DOM changes and reapplies styles, so the extension works on React, Vue, Angular, and other single-page apps that swap content without a full page load.

**Message types** between popup, content scripts, and service worker:

| Message            | Direction            | Purpose                                        |
| ------------------ | -------------------- | ---------------------------------------------- |
| `APPLY_SETTINGS`   | Popup → Content      | Push updated settings immediately              |
| `INJECT_FONT_FACE` | Popup → Content      | Register a custom font for preview             |
| `GET_ACTIVE_STATE` | Content → Background | Check whether extension is active on this page |
| `UPDATE_BADGE`     | Background internal  | Refresh the toolbar badge                      |

## Limitations

- Doesn't run on Chrome's built-in pages (`chrome://`, the Web Store, `chrome-extension://`)
- May not work on sites that actively block browser extension injection
