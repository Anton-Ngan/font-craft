// popup/popup.js
// Two-way binding between popup controls ↔ chrome.storage ↔ content script
// @ts-nocheck — globals (SITE_MODES, FontStorage, etc.) are loaded via <script> tags in popup.html

(async () => {
  // ---------- state ----------
  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let siteConfig = { siteMode: SITE_MODES.GLOBAL, siteList: [] };
  let currentTab = null;
  let currentHostname = '';
  let profiles = [];
  let customFonts = [];

  // ---------- DOM refs ----------
  const $ = id => document.getElementById(id);

  const statusBadge = $('status-badge');
  const statusText = $('status-text');
  const siteLabel = $('site-label');
  const btnToggleSite = $('btn-toggle-site');
  const fontFamilySelect = $('font-family');
  const btnPreviewFont = $('btn-preview-font');
  const fontPreview = $('font-preview');
  const lineHeightSlider = $('line-height');
  const lineHeightLabel = $('line-height-label');
  const letterSpacingSlider = $('letter-spacing');
  const letterSpacingLabel = $('letter-spacing-label');
  const wordSpacingSlider = $('word-spacing');
  const wordSpacingLabel = $('word-spacing-label');
  const paragraphSpacingSlider = $('paragraph-spacing');
  const paragraphSpacingLabel = $('paragraph-spacing-label');
  const btnLhDec              = $('btn-lh-dec');
  const btnLhInc              = $('btn-lh-inc');
  const btnResetLineHeight    = $('btn-reset-line-height');
  const btnLsDec              = $('btn-ls-dec');
  const btnLsInc              = $('btn-ls-inc');
  const btnResetLetterSpacing = $('btn-reset-letter-spacing');
  const btnWsDec              = $('btn-ws-dec');
  const btnWsInc              = $('btn-ws-inc');
  const btnResetWordSpacing   = $('btn-reset-word-spacing');
  const btnPsDec              = $('btn-ps-dec');
  const btnPsInc              = $('btn-ps-inc');
  const btnResetParagraphSpacing = $('btn-reset-paragraph-spacing');
  const textColorInput = $('text-color');
  const textColorHex = $('text-color-hex');
  const btnResetTextColor = $('btn-reset-text-color');
  const highlightColorInput = $('highlight-color');
  const highlightColorHex = $('highlight-color-hex');
  const btnResetHighlight = $('btn-reset-highlight');
  const highlightTextColorInput = $('highlight-text-color');
  const highlightTextColorHex = $('highlight-text-color-hex');
  const btnResetHighlightText = $('btn-reset-highlight-text');
  const fieldHighlightText = $('field-highlight-text');
  const profileNameInput = $('profile-name');
  const btnSaveProfile = $('btn-save-profile');
  const profilesList = $('profiles-list');
  const btnResetAll = $('btn-reset-all');
  const btnOptions = $('btn-options');
  const btnThemeToggle = $('btn-theme-toggle');

  // ---------- slider & color helpers ----------

  function setSliderFill(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    slider.style.setProperty('--fill', pct.toFixed(1) + '%');
  }

  function stepSlider(slider, delta) {
    const min  = parseFloat(slider.min);
    const max  = parseFloat(slider.max);
    const step = parseFloat(slider.step);
    const val  = parseFloat(slider.value);
    const next = Math.round((val + delta) / step) * step;
    slider.value = Math.min(max, Math.max(min, parseFloat(next.toFixed(10))));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setColorHex(hexEl, value) {
    if (value) {
      hexEl.textContent = value;
      hexEl.classList.remove('color-hex--unset');
    } else {
      hexEl.textContent = 'not set';
      hexEl.classList.add('color-hex--unset');
    }
  }

  // ---------- font face injection (for preview) ----------

  async function injectExtensionFontFaces() {
    const parts = BUNDLED_FONT_FACES.map(f =>
      `@font-face { font-family: "${f.name}"; src: url("${chrome.runtime.getURL(f.file)}") format("${f.format}"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`
    );
    for (const f of customFonts) {
      if (f.source === 'upload') {
        const dataUrl = await FontStorage.getCustomFontData(f.id);
        if (dataUrl) {
          parts.push(`@font-face { font-family: "${f.name}"; src: url("${dataUrl}") format("${f.format}"); font-display: swap; }`);
        }
      } else if (f.source === 'google' && f.url) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = f.url;
        document.head.appendChild(link);
      }
    }
    if (parts.length) {
      const style = document.createElement('style');
      style.textContent = parts.join('\n');
      document.head.appendChild(style);
    }
  }

  // ---------- theme ----------

  function applyTheme(scheme) {
    // 'auto' is a legacy value — treat as light
    const resolved = scheme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
    updateThemeButton(resolved);
  }

  function updateThemeButton(scheme) {
    const resolved = scheme === 'dark' ? 'dark' : 'light';
    const icons = {
      light: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
      dark:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    };
    btnThemeToggle.innerHTML = icons[resolved];
    btnThemeToggle.setAttribute('aria-label', resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // ---------- init ----------

  async function init() {
    [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const url = new URL(currentTab.url);
      currentHostname = url.hostname;
    } catch { currentHostname = ''; }

    siteLabel.textContent = currentHostname || 'this page';

    [settings, siteConfig, profiles, customFonts] = await Promise.all([
      FontStorage.getSettings(),
      FontStorage.getSiteConfig(),
      FontStorage.getAllProfiles(),
      FontStorage.getCustomFontsMeta(),
    ]);

    await injectExtensionFontFaces();
    applyTheme(settings.colorScheme || 'light');
    populateFontSelect();
    renderControls();
    renderSiteState();
    renderProfiles();
    bindEvents();
  }

  // ---------- font select ----------

  function populateFontSelect() {
    const bundledGroup = fontFamilySelect.querySelector('optgroup:nth-of-type(1)');
    const systemGroup = fontFamilySelect.querySelector('optgroup:nth-of-type(2)');
    const customGroup = $('optgroup-custom');

    BUNDLED_FONTS.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.name;
      opt.textContent = f.label;
      bundledGroup.appendChild(opt);
    });

    SYSTEM_FONTS.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.stack || f.name;
      opt.textContent = f.label;
      systemGroup.appendChild(opt);
    });

    customFonts.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.name;
      opt.textContent = f.name + ' (custom)';
      customGroup.appendChild(opt);
    });

    fontFamilySelect.value = settings.fontFamily || '';
  }

  // ---------- render controls from settings ----------

  function renderControls() {
    fontFamilySelect.value = settings.fontFamily || '';

    const lh = parseFloat(settings.lineHeight) || 0;
    lineHeightSlider.value = lh === 0 ? 1.2 : lh;
    lineHeightLabel.textContent = lh === 0 ? 'normal' : lh.toFixed(1) + '×';
    lineHeightSlider.setAttribute('aria-valuetext', lh === 0 ? 'normal' : lh.toFixed(1) + '×');
    btnResetLineHeight.hidden = lh === 0;
    setSliderFill(lineHeightSlider);

    const ls = parseFloat(settings.letterSpacing) || 0;
    letterSpacingSlider.value = ls;
    letterSpacingLabel.textContent = ls === 0 ? 'normal' : ls.toFixed(3) + 'em';
    letterSpacingSlider.setAttribute('aria-valuetext', ls === 0 ? 'normal' : ls.toFixed(3) + 'em');
    btnResetLetterSpacing.hidden = ls === 0;
    setSliderFill(letterSpacingSlider);

    const ws = parseFloat(settings.wordSpacing) || 0;
    wordSpacingSlider.value = ws;
    wordSpacingLabel.textContent = ws === 0 ? 'normal' : ws.toFixed(2) + 'em';
    wordSpacingSlider.setAttribute('aria-valuetext', ws === 0 ? 'normal' : ws.toFixed(2) + 'em');
    btnResetWordSpacing.hidden = ws === 0;
    setSliderFill(wordSpacingSlider);

    const ps = parseFloat(settings.paragraphSpacing) || 0;
    paragraphSpacingSlider.value = ps;
    paragraphSpacingLabel.textContent = ps === 0 ? 'normal' : ps.toFixed(1) + 'em';
    paragraphSpacingSlider.setAttribute('aria-valuetext', ps === 0 ? 'normal' : ps.toFixed(1) + 'em');
    btnResetParagraphSpacing.hidden = ps === 0;
    setSliderFill(paragraphSpacingSlider);

    if (settings.textColor) textColorInput.value = settings.textColor;
    setColorHex(textColorHex, settings.textColor);

    if (settings.highlightColor) {
      highlightColorInput.value = settings.highlightColor;
      fieldHighlightText.hidden = false;
    }
    setColorHex(highlightColorHex, settings.highlightColor);

    if (settings.highlightTextColor) highlightTextColorInput.value = settings.highlightTextColor;
    setColorHex(highlightTextColorHex, settings.highlightTextColor);

    if (settings.fontFamily) updateFontPreview();
  }

  // ---------- site state ----------

  function isActiveOnSite() {
    if (!currentHostname) return false;
    const { siteMode, siteList } = siteConfig;
    switch (siteMode) {
      case SITE_MODES.GLOBAL: return true;
      case SITE_MODES.WHITELIST: return siteList.some(s => currentHostname === s || currentHostname.endsWith('.' + s));
      case SITE_MODES.BLACKLIST: return !siteList.some(s => currentHostname === s || currentHostname.endsWith('.' + s));
      default: return true;
    }
  }

  function renderSiteState() {
    const active = isActiveOnSite() && settings.enabled;
    statusBadge.className = `status-badge ${active ? 'status-badge--on' : 'status-badge--off'}`;
    statusText.textContent = active ? 'ON' : 'OFF';
    statusBadge.setAttribute('aria-label', active ? 'Extension is on. Click to turn off.' : 'Extension is off. Click to turn on.');

    if (isActiveOnSite()) {
      btnToggleSite.textContent = 'Disable on this site';
      btnToggleSite.classList.add('active');
      btnToggleSite.setAttribute('aria-pressed', 'true');
    } else {
      btnToggleSite.textContent = 'Enable on this site';
      btnToggleSite.classList.remove('active');
      btnToggleSite.setAttribute('aria-pressed', 'false');
    }
  }

  // ---------- profiles ----------

  function renderProfiles() {
    profilesList.innerHTML = '';
    if (!profiles.length) {
      profilesList.innerHTML = '<p class="empty-msg">No saved profiles yet.</p>';
      return;
    }
    profiles.forEach(p => {
      const item = document.createElement('div');
      item.className = 'profile-item';
      item.setAttribute('role', 'listitem');
      const safeName = escapeHtml(p.name);
      const safeId = escapeHtml(p.id);
      item.innerHTML = `
        <span class="profile-item__name" title="${safeName}">${safeName}</span>
        <div class="profile-item__actions">
          <button class="btn-small btn-load-profile" data-id="${safeId}" aria-label="Load profile ${safeName}">Load</button>
          <button class="btn-small btn-rename-profile" data-id="${safeId}" aria-label="Rename profile ${safeName}" title="Rename">✎</button>
          <button class="btn-small btn-delete-profile" data-id="${safeId}" aria-label="Delete profile ${safeName}">✕</button>
        </div>`;
      profilesList.appendChild(item);
    });
  }

  function startProfileRename(id, item) {
    const nameSpan = item.querySelector('.profile-item__name');
    const currentName = nameSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'profile-rename-input';
    input.setAttribute('aria-label', 'New profile name');
    input.maxLength = 40;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    let committed = false;
    async function commitRename() {
      if (committed) return;
      committed = true;
      const newName = input.value.trim();
      if (!newName || newName === currentName) { renderProfiles(); return; }
      if (profiles.some(p => p.id !== id && p.name === newName)) {
        committed = false;
        input.setCustomValidity('A profile with this name already exists');
        input.reportValidity();
        return;
      }
      await FontStorage.renameProfile(id, newName);
      const p = profiles.find(pr => pr.id === id);
      if (p) p.name = newName;
      renderProfiles();
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
      if (e.key === 'Escape') { renderProfiles(); }
    });
    input.addEventListener('blur', commitRename);
  }

  // ---------- font preview ----------

  function updateFontPreview() {
    const font = fontFamilySelect.value;
    if (font) {
      fontPreview.style.fontFamily = font;
      fontPreview.textContent = `The quick brown fox — ${font}`;
      fontPreview.classList.add('visible');
    } else {
      fontPreview.classList.remove('visible');
    }
  }

  // ---------- send settings to content script ----------

  async function pushSettings(newSettings) {
    settings = Object.assign({}, settings, newSettings);
    await FontStorage.saveSettings(settings);
    if (currentTab?.id) {
      chrome.tabs.sendMessage(currentTab.id, {
        type: MESSAGE_TYPES.APPLY_SETTINGS,
        settings,
      }).catch(() => {});
    }
  }

  // ---------- events ----------

  function bindEvents() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.panel));
    });

    // Font family — auto-show preview on change
    fontFamilySelect.addEventListener('change', () => {
      pushSettings({ fontFamily: fontFamilySelect.value });
      updateFontPreview();
    });

    // Aa button — toggle preview visibility
    btnPreviewFont.addEventListener('click', () => {
      if (fontPreview.classList.contains('visible')) {
        fontPreview.classList.remove('visible');
      } else {
        updateFontPreview();
      }
    });

    // Line height — range 1.0–3.0, no snap needed
    lineHeightSlider.addEventListener('input', () => {
      const v = parseFloat(lineHeightSlider.value);
      const label = v.toFixed(1) + '×';
      lineHeightLabel.textContent = label;
      lineHeightSlider.setAttribute('aria-valuetext', label);
      setSliderFill(lineHeightSlider);
      btnResetLineHeight.hidden = false;
      pushSettings({ lineHeight: String(v) });
    });
    btnLhDec.addEventListener('click', () => stepSlider(lineHeightSlider, -0.1));
    btnLhInc.addEventListener('click', () => stepSlider(lineHeightSlider, +0.1));
    btnResetLineHeight.addEventListener('click', () => {
      lineHeightLabel.textContent = 'normal';
      lineHeightSlider.setAttribute('aria-valuetext', 'normal');
      lineHeightSlider.value = 1.2;
      btnResetLineHeight.hidden = true;
      setSliderFill(lineHeightSlider);
      pushSettings({ lineHeight: '' });
    });

    // Letter spacing
    letterSpacingSlider.addEventListener('input', () => {
      const v = parseFloat(letterSpacingSlider.value);
      const label = v === 0 ? 'normal' : v.toFixed(3) + 'em';
      letterSpacingLabel.textContent = label;
      letterSpacingSlider.setAttribute('aria-valuetext', label);
      setSliderFill(letterSpacingSlider);
      btnResetLetterSpacing.hidden = v === 0;
      pushSettings({ letterSpacing: v === 0 ? '' : v.toFixed(3) + 'em' });
    });
    btnLsDec.addEventListener('click', () => stepSlider(letterSpacingSlider, -0.005));
    btnLsInc.addEventListener('click', () => stepSlider(letterSpacingSlider, +0.005));
    btnResetLetterSpacing.addEventListener('click', () => {
      letterSpacingLabel.textContent = 'normal';
      letterSpacingSlider.setAttribute('aria-valuetext', 'normal');
      letterSpacingSlider.value = 0;
      btnResetLetterSpacing.hidden = true;
      setSliderFill(letterSpacingSlider);
      pushSettings({ letterSpacing: '' });
    });

    // Word spacing
    wordSpacingSlider.addEventListener('input', () => {
      const v = parseFloat(wordSpacingSlider.value);
      const label = v === 0 ? 'normal' : v.toFixed(2) + 'em';
      wordSpacingLabel.textContent = label;
      wordSpacingSlider.setAttribute('aria-valuetext', label);
      setSliderFill(wordSpacingSlider);
      btnResetWordSpacing.hidden = v === 0;
      pushSettings({ wordSpacing: v === 0 ? '' : v.toFixed(2) + 'em' });
    });
    btnWsDec.addEventListener('click', () => stepSlider(wordSpacingSlider, -0.01));
    btnWsInc.addEventListener('click', () => stepSlider(wordSpacingSlider, +0.01));
    btnResetWordSpacing.addEventListener('click', () => {
      wordSpacingLabel.textContent = 'normal';
      wordSpacingSlider.setAttribute('aria-valuetext', 'normal');
      wordSpacingSlider.value = 0;
      btnResetWordSpacing.hidden = true;
      setSliderFill(wordSpacingSlider);
      pushSettings({ wordSpacing: '' });
    });

    // Paragraph spacing
    paragraphSpacingSlider.addEventListener('input', () => {
      const v = parseFloat(paragraphSpacingSlider.value);
      const label = v === 0 ? 'normal' : v.toFixed(1) + 'em';
      paragraphSpacingLabel.textContent = label;
      paragraphSpacingSlider.setAttribute('aria-valuetext', label);
      setSliderFill(paragraphSpacingSlider);
      btnResetParagraphSpacing.hidden = v === 0;
      pushSettings({ paragraphSpacing: v === 0 ? '' : v.toFixed(1) + 'em' });
    });
    btnPsDec.addEventListener('click', () => stepSlider(paragraphSpacingSlider, -0.1));
    btnPsInc.addEventListener('click', () => stepSlider(paragraphSpacingSlider, +0.1));
    btnResetParagraphSpacing.addEventListener('click', () => {
      paragraphSpacingLabel.textContent = 'normal';
      paragraphSpacingSlider.setAttribute('aria-valuetext', 'normal');
      paragraphSpacingSlider.value = 0;
      btnResetParagraphSpacing.hidden = true;
      setSliderFill(paragraphSpacingSlider);
      pushSettings({ paragraphSpacing: '' });
    });

    // Text color — auto-apply on change, Reset clears
    textColorInput.addEventListener('input', () => {
      setColorHex(textColorHex, textColorInput.value);
      pushSettings({ textColor: textColorInput.value });
    });
    btnResetTextColor.addEventListener('click', () => {
      setColorHex(textColorHex, '');
      pushSettings({ textColor: '' });
    });

    // Highlight color — auto-apply on change, Reset clears both
    highlightColorInput.addEventListener('input', () => {
      fieldHighlightText.hidden = false;
      setColorHex(highlightColorHex, highlightColorInput.value);
      pushSettings({ highlightColor: highlightColorInput.value });
    });
    btnResetHighlight.addEventListener('click', () => {
      fieldHighlightText.hidden = true;
      setColorHex(highlightColorHex, '');
      setColorHex(highlightTextColorHex, '');
      pushSettings({ highlightColor: '', highlightTextColor: '' });
    });
    highlightTextColorInput.addEventListener('input', () => {
      setColorHex(highlightTextColorHex, highlightTextColorInput.value);
      pushSettings({ highlightTextColor: highlightTextColorInput.value });
    });
    if (btnResetHighlightText) {
      btnResetHighlightText.addEventListener('click', () => {
        setColorHex(highlightTextColorHex, '');
        pushSettings({ highlightTextColor: '' });
      });
    }

    // Master on/off toggle — clicking the status badge toggles settings.enabled
    statusBadge.addEventListener('click', async () => {
      await pushSettings({ enabled: !settings.enabled });
      renderSiteState();
      // Pop animation on toggle
      statusBadge.classList.remove('popping');
      void statusBadge.offsetWidth; // restart animation
      statusBadge.classList.add('popping');
      statusBadge.addEventListener('animationend', () => statusBadge.classList.remove('popping'), { once: true });
    });

    // Site toggle
    btnToggleSite.addEventListener('click', handleSiteToggle);

    // Profiles
    profileNameInput.addEventListener('input', () => profileNameInput.setCustomValidity(''));

    btnSaveProfile.addEventListener('click', async () => {
      const name = profileNameInput.value.trim();
      if (!name) { profileNameInput.focus(); return; }
      if (profiles.some(p => p.name === name)) {
        profileNameInput.setCustomValidity('A profile with this name already exists');
        profileNameInput.reportValidity();
        return;
      }
      profileNameInput.setCustomValidity('');
      btnSaveProfile.disabled = true;
      try {
        const saved = await FontStorage.saveProfile(name, settings);
        profiles.push(saved);
        profileNameInput.value = '';
        renderProfiles();
      } finally {
        btnSaveProfile.disabled = false;
      }
    });

    profilesList.addEventListener('click', async e => {
      const loadBtn = e.target.closest('.btn-load-profile');
      const renameBtn = e.target.closest('.btn-rename-profile');
      const deleteBtn = e.target.closest('.btn-delete-profile');
      if (renameBtn) {
        const id = renameBtn.dataset.id;
        const item = renameBtn.closest('.profile-item');
        startProfileRename(id, item);
        return;
      }
      if (loadBtn) {
        const id = loadBtn.dataset.id;
        const p = await FontStorage.getProfile(id);
        if (p?.settings) {
          settings = Object.assign({}, DEFAULT_SETTINGS, p.settings);
          await FontStorage.saveSettings(settings);
          renderControls();
          if (currentTab?.id) {
            chrome.tabs.sendMessage(currentTab.id, {
              type: MESSAGE_TYPES.APPLY_SETTINGS,
              settings,
            }).catch(() => {});
          }
          loadBtn.textContent = '✓ Loaded';
          setTimeout(() => { loadBtn.textContent = 'Load'; }, 1500);
        } else {
          loadBtn.textContent = 'Failed';
          setTimeout(() => { loadBtn.textContent = 'Load'; }, 1500);
        }
      }
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        await FontStorage.deleteProfile(id);
        profiles = profiles.filter(p => p.id !== id);
        renderProfiles();
      }
    });

    btnResetAll.addEventListener('click', async () => {
      if (!confirm('Reset all settings to defaults? This can\'t be undone.')) return;
      settings = Object.assign({}, DEFAULT_SETTINGS);
      await FontStorage.saveSettings(settings);
      renderControls();
      if (currentTab?.id) {
        chrome.tabs.sendMessage(currentTab.id, {
          type: MESSAGE_TYPES.APPLY_SETTINGS,
          settings,
        }).catch(() => {});
      }
    });

    // Theme toggle — toggles light ↔ dark
    btnThemeToggle.addEventListener('click', () => {
      const current = settings.colorScheme === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      pushSettings({ colorScheme: next });
    });

    // Options page
    btnOptions.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // ---------- tab switching ----------

  function switchTab(panel) {
    document.querySelectorAll('.tab').forEach(t => {
      const isActive = t.dataset.panel === panel;
      t.classList.toggle('tab--active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('.panel').forEach(p => {
      p.hidden = p.id !== `panel-${panel}`;
    });
  }

  // ---------- site toggle ----------

  async function handleSiteToggle() {
    if (!currentHostname) return;
    let { siteMode, siteList } = siteConfig;
    const currently = isActiveOnSite();

    if (siteMode === SITE_MODES.GLOBAL) {
      if (currently) {
        siteMode = SITE_MODES.BLACKLIST;
        siteList = [currentHostname];
      }
    } else if (siteMode === SITE_MODES.WHITELIST) {
      if (currently) {
        siteList = siteList.filter(s => s !== currentHostname && !currentHostname.endsWith('.' + s));
      } else {
        siteList = [...siteList, currentHostname];
      }
    } else if (siteMode === SITE_MODES.BLACKLIST) {
      if (currently) {
        siteList = [...siteList, currentHostname];
      } else {
        siteList = siteList.filter(s => s !== currentHostname && !currentHostname.endsWith('.' + s));
        if (!siteList.length) siteMode = SITE_MODES.GLOBAL;
      }
    }

    siteConfig = { siteMode, siteList };
    await FontStorage.saveSiteConfig(siteMode, siteList);
    renderSiteState();
  }

  // ---------- start ----------
  init().catch(console.error);
})();
