// content/content-inspector.js
// Font inspector: click-to-inspect mode, reads computed styles from elements.
// Activated by message from popup, result sent back via callback.

const FontInspector = (() => {
  let active = false;
  let resultCallback = null;
  let highlightBox = null;
  let lastTarget = null;

  // ---------- highlight overlay ----------

  function createHighlightBox() {
    const box = document.createElement('div');
    box.id = 'fa-inspector-highlight';
    box.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      background: rgba(59, 130, 246, 0.15);
      border: 2px solid rgb(59, 130, 246);
      border-radius: 2px;
      box-sizing: border-box;
      transition: all 80ms ease;
    `;
    document.documentElement.appendChild(box);
    return box;
  }

  function positionHighlight(el) {
    if (!highlightBox || !el) return;
    const rect = el.getBoundingClientRect();
    highlightBox.style.top = rect.top + 'px';
    highlightBox.style.left = rect.left + 'px';
    highlightBox.style.width = rect.width + 'px';
    highlightBox.style.height = rect.height + 'px';
    highlightBox.style.display = 'block';
  }

  function removeHighlight() {
    if (highlightBox) {
      highlightBox.remove();
      highlightBox = null;
    }
  }

  // ---------- banner ----------

  function createBanner() {
    const banner = document.createElement('div');
    banner.id = 'fa-inspector-banner';
    banner.textContent = 'Font Inspector active — click any element. Press Esc to cancel.';
    banner.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: #1e3a5f;
      color: #fff;
      padding: 8px 18px;
      border-radius: 6px;
      font-family: system-ui, sans-serif !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      pointer-events: none;
      white-space: nowrap;
    `;
    document.documentElement.appendChild(banner);
    return banner;
  }

  function removeBanner() {
    document.getElementById('fa-inspector-banner')?.remove();
  }

  // ---------- font resolution ----------

  async function resolveRenderedFont(element) {
    const computed = window.getComputedStyle(element);
    const families = computed.fontFamily
      .split(',')
      .map(f => f.trim().replace(/^["']|["']$/g, ''));

    // Check document.fonts for loaded fonts
    if (document.fonts && document.fonts.size > 0) {
      for (const family of families) {
        const loaded = [...document.fonts].find(
          f => f.family.replace(/^["']|["']$/g, '') === family && f.status === 'loaded'
        );
        if (loaded) return family;
      }
    }
    return families[0] || 'unknown';
  }

  function rgbToHex(rgb) {
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return rgb;
    return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  }

  async function extractFontInfo(element) {
    const computed = window.getComputedStyle(element);
    const rendered = await resolveRenderedFont(element);
    return {
      fontFamilyCSS: computed.fontFamily,
      renderedFont: rendered,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontStyle: computed.fontStyle,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      wordSpacing: computed.wordSpacing,
      color: rgbToHex(computed.color),
      backgroundColor: rgbToHex(computed.backgroundColor),
      tagName: element.tagName.toLowerCase(),
      textContent: (element.textContent || '').slice(0, 60).trim(),
    };
  }

  // ---------- event handlers ----------

  function onMouseOver(e) {
    if (!active) return;
    const el = e.target;
    if (el.id === 'fa-inspector-highlight' || el.id === 'fa-inspector-banner') return;
    lastTarget = el;
    positionHighlight(el);
  }

  function onClick(e) {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    if (el.id === 'fa-inspector-highlight' || el.id === 'fa-inspector-banner') return;

    extractFontInfo(el).then(info => {
      if (resultCallback) resultCallback(info);
      stop();
    });
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && active) {
      stop();
    }
  }

  // ---------- public API ----------

  function start(callback) {
    if (active) return;
    active = true;
    resultCallback = callback;
    highlightBox = createHighlightBox();
    createBanner();

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);

    // Change cursor on body
    document.documentElement.style.cursor = 'crosshair';
  }

  function stop() {
    if (!active) return;
    active = false;
    resultCallback = null;
    lastTarget = null;
    removeHighlight();
    removeBanner();

    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);

    document.documentElement.style.cursor = '';
  }

  return { start, stop };
})();
