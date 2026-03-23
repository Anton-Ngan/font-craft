# Typeset: Font, Spacing & Color Control

A Chrome extension that lets you override fonts, spacing, and colors on any webpage — designed for users with dyslexia, low vision, or other reading difficulties, and for anyone who wants more control over how the web looks.

## Features

- **Font family** — switch to OpenDyslexic, Atkinson Hyperlegible, Lexend, any system font, or upload your own (.woff2, .woff, .ttf, .otf)
- **Font scale** — increase or decrease the base font size
- **Line height, letter spacing, word spacing, paragraph spacing** — fine-grained control over text density
- **Text color** — override foreground color across the page
- **Selection highlight color** — set a custom background and foreground for selected text
- **Profiles** — save named setting combinations and switch between them instantly
- **Per-site control** — apply everywhere, only on specific sites, or skip specific sites
- **Light and dark theme** — the extension UI follows your preference or can be forced

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
background/       Service worker — toolbar badge, tab change monitoring
content/          Content scripts — CSS injection, SPA support via MutationObserver, iframe bridge
popup/            Toolbar popup — Typography / Spacing / Color / Profiles tabs
options/          Full options page — custom fonts, site rules, profile management
shared/           Constants, storage abstraction, font catalog, base CSS tokens
fonts/bundled/    Bundled font files and license attribution
assets/icons/     Extension icons at 16, 32, 48, and 128px
```

## Architecture notes

**Settings are applied via CSS custom properties** — the content script sets `--fa-*` variables on `:root` which cascade to all elements. This is a single-pass operation rather than per-element manipulation, and handles dynamically added content without re-traversal.

**Tiered storage** — settings and profiles use `chrome.storage.sync` (syncs across devices). Custom font binaries use `chrome.storage.local` (too large for sync). The `FontStorage` abstraction in `shared/storage.js` handles both.

**SPA support** — a `MutationObserver` in `content-main.js` watches for DOM changes and reapplies styles, so the extension works on React, Vue, Angular, and other single-page apps that swap content without a full page load.

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
