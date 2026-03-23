// options/options.js
// Options page: custom font management, profiles, whitelist/blacklist

(async () => {
  const $ = id => document.getElementById(id);

  let siteConfig = { siteMode: SITE_MODES.GLOBAL, siteList: [] };
  let customFonts = [];
  let profiles = [];
  let currentSettings = null;

  // ---------- toast ----------

  function showToast(msg, duration = 2500) {
    const toast = $('toast');
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.hidden = true; }, duration);
  }

  // ---------- font face injection (for font preview) ----------

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
    const btn = $('btn-theme-toggle');
    if (!btn) return;
    const resolved = scheme === 'dark' ? 'dark' : 'light';
    const icons = {
      light: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
      dark:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    };
    btn.innerHTML = icons[resolved];
    btn.setAttribute('aria-label', resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // ---------- init ----------

  async function init() {
    [siteConfig, customFonts, profiles, currentSettings] = await Promise.all([
      FontStorage.getSiteConfig(),
      FontStorage.getCustomFontsMeta(),
      FontStorage.getAllProfiles(),
      FontStorage.getSettings(),
    ]);

    await injectExtensionFontFaces();
    applyTheme(currentSettings.colorScheme || 'light');
    renderSiteMode();
    renderSiteList();
    renderCustomFonts();
    renderProfiles();
    bindEvents();
  }

  // ---------- custom fonts ----------

  function renderCustomFonts() {
    const list = $('custom-fonts-list');
    const countBadge = $('custom-fonts-count');
    list.innerHTML = '';

    if (countBadge) {
      if (customFonts.length > 0) {
        countBadge.textContent = customFonts.length;
        countBadge.hidden = false;
      } else {
        countBadge.hidden = true;
      }
    }

    if (!customFonts.length) {
      list.innerHTML = '<p class="empty-msg">No custom fonts added yet.</p>';
      return;
    }
    customFonts.forEach(f => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.setAttribute('role', 'listitem');
      const tagClass = f.source === 'google' ? 'list-item__tag--google' :
                       f.source === 'upload' ? 'list-item__tag--upload' : 'list-item__tag--bundled';
      const tagLabel = f.source === 'google' ? 'Google Fonts' :
                       f.source === 'upload' ? 'Uploaded file' : 'Built-in font';
      const tagTitle = f.source === 'google' ? 'Loaded from Google Fonts — requires an internet connection' :
                       f.source === 'upload' ? 'Font file uploaded from your device — stored locally in this browser' :
                       'Font bundled with this extension — always available offline';
      const safeName = escapeHtml(f.name);
      const safeId = escapeHtml(f.id);
      item.innerHTML = `
        <span class="list-item__name list-item__name--editable" role="button" tabindex="0" data-id="${safeId}" title="Click or press Enter to rename">${safeName}</span>
        <span class="list-item__tag ${tagClass}" title="${tagTitle}">${tagLabel}</span>
        <div class="list-item__actions">
          <button class="btn-icon btn-delete-font" data-id="${safeId}" aria-label="Delete font ${safeName}" title="Delete">✕</button>
        </div>`;
      list.appendChild(item);
    });
  }

  function startFontRename(id, nameEl) {
    const currentName = nameEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'inline-rename-input';
    input.setAttribute('aria-label', 'New font name');
    input.maxLength = 40;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    let committed = false;
    async function commitRename() {
      if (committed) return;
      committed = true;
      const newName = input.value.trim();
      if (!newName || newName === currentName) { renderCustomFonts(); return; }
      await FontStorage.renameCustomFont(id, newName);
      const f = customFonts.find(cf => cf.id === id);
      if (f) f.name = newName;
      renderCustomFonts();
      notifyAllTabs(MESSAGE_TYPES.INJECT_FONT_FACE);
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
      if (e.key === 'Escape') { renderCustomFonts(); }
    });
    input.addEventListener('blur', commitRename);
  }

  async function handleFontFile(file) {
    const status = $('upload-status');
    if (!file) return;

    const validExts = ['woff2', 'woff', 'ttf', 'otf'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(ext)) {
      status.textContent = `Invalid file type: .${ext}. Supported: .woff2, .woff, .ttf, .otf`;
      status.className = 'upload-status upload-status--err';
      return;
    }

    const MAX_FONT_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FONT_BYTES) {
      status.textContent = `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`;
      status.className = 'upload-status upload-status--err';
      return;
    }

    status.textContent = 'Reading font file…';
    status.className = 'upload-status';

    try {
      const dataUrl = await readFileAsDataURL(file);
      const rawName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
      const fontName = rawName || 'Custom Font';
      const formatMap = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
      const saved = await FontStorage.saveCustomFont(fontName, dataUrl, formatMap[ext] || ext);
      customFonts.push(saved);
      renderCustomFonts();
      status.textContent = `✓ Font "${fontName}" added successfully.`;
      status.className = 'upload-status upload-status--ok';

      // Tell all tabs to refresh font faces
      notifyAllTabs(MESSAGE_TYPES.INJECT_FONT_FACE);
    } catch (err) {
      const isQuota = err.message && err.message.toLowerCase().includes('quota');
      status.textContent = isQuota
        ? 'Couldn\'t save — the font may be too large for browser storage. Try a smaller file.'
        : `Couldn\'t add font: ${err.message}`;
      status.className = 'upload-status upload-status--err';
    }
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async function handleGoogleFont(input) {
    const status = $('google-font-status');
    const raw = input.trim();
    if (!raw) return;

    status.textContent = 'Checking font…';
    status.className = 'upload-status';

    let fontName = raw;
    let url;

    if (!raw.startsWith('http')) {
      // Plain font name — build API URL directly
      fontName = raw.replace(/\+/g, ' ').trim();
      const encoded = fontName.replace(/ /g, '+');
      url = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700&display=swap`;
    } else {
      // URL pasted — support three Google Fonts URL formats:
      // 1. Specimen page:  https://fonts.google.com/specimen/Open+Sans
      // 2. Share link:     https://fonts.google.com/share?selection.family=Open+Sans:...
      // 3. CSS embed URL:  https://fonts.googleapis.com/css2?family=Open+Sans:...
      const specimenMatch = raw.match(/fonts\.google\.com\/specimen\/([^/?#]+)/);
      const shareMatch    = raw.match(/[?&]selection\.family=([^&:]+)/);
      const apiMatch      = raw.match(/[?&]family=([^&:]+)/);

      const extracted = specimenMatch || shareMatch || apiMatch;
      if (extracted) {
        fontName = decodeURIComponent(extracted[1]).replace(/\+/g, ' ').trim();
      }
      // Always build a canonical API URL from the extracted name
      const encoded = fontName.replace(/ /g, '+');
      url = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700&display=swap`;
    }

    const addBtn = $('btn-add-google-font');
    addBtn.disabled = true;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Google Fonts returned an error (${res.status})`);
      const css = await res.text();
      if (!css.includes('@font-face')) {
        throw new Error(`"${fontName}" was not found on Google Fonts — check the spelling`);
      }

      const saved = await FontStorage.saveGoogleFont(fontName, url);
      customFonts.push(saved);
      renderCustomFonts();
      $('google-font-input').value = '';
      status.textContent = `✓ "${fontName}" added from Google Fonts.`;
      status.className = 'upload-status upload-status--ok';
      notifyAllTabs(MESSAGE_TYPES.INJECT_FONT_FACE);
    } catch (err) {
      const msg = (err instanceof TypeError && err.message.toLowerCase().includes('fetch'))
        ? 'Could not reach Google Fonts — check your internet connection and try again.'
        : err.message;
      status.textContent = msg;
      status.className = 'upload-status upload-status--err';
    } finally {
      addBtn.disabled = false;
    }
  }

  // ---------- profiles ----------

  function renderProfiles() {
    const list = $('profiles-list');
    list.innerHTML = '';
    if (!profiles.length) {
      list.innerHTML = '<p class="empty-msg">No profiles saved yet.</p>';
      return;
    }
    profiles.forEach(p => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.setAttribute('role', 'listitem');
      const safeName = escapeHtml(p.name);
      const safeId = escapeHtml(p.id);
      const dateVal = p.created ? new Date(p.created) : null;
      const date = (dateVal && !isNaN(dateVal)) ? dateVal.toLocaleDateString() : '—';
      item.innerHTML = `
        <span class="list-item__name list-item__name--editable" role="button" tabindex="0" data-id="${safeId}" title="Click or press Enter to rename">${safeName}</span>
        <span class="list-item__tag">${date}</span>
        <div class="list-item__actions">
          <button class="btn btn--secondary btn--sm btn-load-profile" data-id="${safeId}" aria-label="Load profile ${safeName}">Load</button>
          <button class="btn btn--secondary btn--sm btn-export-profile" data-id="${safeId}" aria-label="Export profile ${safeName}">Export</button>
          <button class="btn-icon btn-delete-profile" data-id="${safeId}" aria-label="Delete profile ${safeName}" title="Delete">✕</button>
        </div>`;
      list.appendChild(item);
    });
  }

  function startProfileRename(id, nameEl) {
    const currentName = nameEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'inline-rename-input';
    input.setAttribute('aria-label', 'New profile name');
    input.maxLength = 40;
    nameEl.replaceWith(input);
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
      showToast(`Profile renamed to "${newName}".`);
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
      if (e.key === 'Escape') { renderProfiles(); }
    });
    input.addEventListener('blur', commitRename);
  }

  // ---------- site settings ----------

  function renderSiteMode() {
    const radios = document.querySelectorAll('input[name="site-mode"]');
    radios.forEach(r => { r.checked = r.value === siteConfig.siteMode; });
    updateSiteListVisibility();
  }

  function renderSiteList() {
    const list = $('site-list');
    list.innerHTML = '';
    if (!siteConfig.siteList.length) {
      list.innerHTML = '<p class="empty-msg">No sites in the list yet.</p>';
      return;
    }
    siteConfig.siteList.forEach(site => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.setAttribute('role', 'listitem');
      const safeSite = escapeHtml(site);
      item.innerHTML = `
        <span class="list-item__name">${safeSite}</span>
        <div class="list-item__actions">
          <button class="btn-icon btn-remove-site" data-site="${safeSite}" aria-label="Remove ${safeSite}">✕</button>
        </div>`;
      list.appendChild(item);
    });
  }

  function updateSiteListVisibility() {
    const card = $('site-list-card');
    const hint = $('site-list-hint');
    const title = $('site-list-title');
    const mode = siteConfig.siteMode;

    if (mode === SITE_MODES.GLOBAL) {
      card.hidden = true;
    } else {
      card.hidden = false;
      if (mode === SITE_MODES.WHITELIST) {
        title.textContent = 'Allowed sites';
        hint.innerHTML = 'Extension is <strong>only active</strong> on these domains.';
      } else {
        title.textContent = 'Blocked sites';
        hint.innerHTML = 'Extension is <strong>disabled</strong> on these domains.';
      }
    }
  }

  // ---------- notify tabs ----------

  async function notifyAllTabs(msgType) {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: msgType }).catch(() => {});
        }
      }
    } catch { /* ignore */ }
  }

  // ---------- bind events ----------

  function bindEvents() {
    // Font file upload
    const uploadArea = $('upload-area');
    const fileInput = $('font-file-input');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) handleFontFile(fileInput.files[0]);
      fileInput.value = '';
    });
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFontFile(file);
    });

    // Google font
    $('btn-add-google-font').addEventListener('click', () => {
      handleGoogleFont($('google-font-input').value);
    });
    $('google-font-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleGoogleFont($('google-font-input').value);
    });

    // Custom font list — keyboard rename (Enter on editable span)
    $('custom-fonts-list').addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const nameEl = e.target.closest('.list-item__name--editable');
      if (nameEl) { e.preventDefault(); startFontRename(nameEl.dataset.id, nameEl); }
    });

    // Custom font list interactions (rename by clicking name, delete by button)
    $('custom-fonts-list').addEventListener('click', async e => {
      const deleteBtn = e.target.closest('.btn-delete-font');
      const nameEl = e.target.closest('.list-item__name--editable');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        await FontStorage.deleteCustomFont(id);
        customFonts = customFonts.filter(f => f.id !== id);
        renderCustomFonts();
        showToast('Font deleted.');
      } else if (nameEl) {
        startFontRename(nameEl.dataset.id, nameEl);
      }
    });

    // Save profile
    const profileNameEl = $('profile-name');
    profileNameEl.addEventListener('input', () => profileNameEl.setCustomValidity(''));
    const saveProfileBtn = $('btn-save-profile');
    saveProfileBtn.addEventListener('click', async () => {
      const name = profileNameEl.value.trim();
      if (!name) { profileNameEl.focus(); return; }
      if (profiles.some(p => p.name === name)) {
        profileNameEl.setCustomValidity('A profile with this name already exists');
        profileNameEl.reportValidity();
        return;
      }
      profileNameEl.setCustomValidity('');
      saveProfileBtn.disabled = true;
      try {
        const settings = await FontStorage.getSettings();
        const saved = await FontStorage.saveProfile(name, settings);
        profiles.push(saved);
        profileNameEl.value = '';
        renderProfiles();
        showToast(`Profile "${name}" saved.`);
      } finally {
        saveProfileBtn.disabled = false;
      }
    });

    // Profiles list — keyboard rename (Enter on editable span)
    $('profiles-list').addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const nameEl = e.target.closest('.list-item__name--editable');
      if (nameEl) { e.preventDefault(); startProfileRename(nameEl.dataset.id, nameEl); }
    });

    // Profile actions (rename by clicking name, load/export/delete by buttons)
    $('profiles-list').addEventListener('click', async e => {
      const nameEl = e.target.closest('.list-item__name--editable');
      const loadBtn = e.target.closest('.btn-load-profile');
      const exportBtn = e.target.closest('.btn-export-profile');
      const deleteBtn = e.target.closest('.btn-delete-profile');

      if (nameEl) {
        startProfileRename(nameEl.dataset.id, nameEl);
        return;
      }

      if (loadBtn) {
        const id = loadBtn.dataset.id;
        const p = await FontStorage.getProfile(id);
        if (p?.settings) {
          const saved = await FontStorage.saveSettings(p.settings);
          // Broadcast new settings to all open tabs
          const tabs = await chrome.tabs.query({});
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: MESSAGE_TYPES.APPLY_SETTINGS,
                settings: saved,
              }).catch(() => {});
            }
          }
          showToast(`Profile "${p.name}" loaded.`);
        }
      }

      if (exportBtn) {
        const id = exportBtn.dataset.id;
        const json = await FontStorage.exportProfile(id);
        if (json) {
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `fa-profile-${id}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const p = profiles.find(pr => pr.id === id);
        if (p && confirm(`Delete profile "${p.name}"?`)) {
          await FontStorage.deleteProfile(id);
          profiles = profiles.filter(pr => pr.id !== id);
          renderProfiles();
          showToast('Profile deleted.');
        }
      }
    });

    // Import profile
    $('import-profile-input').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const saved = await FontStorage.importProfile(text);
        profiles.push(saved);
        renderProfiles();
        showToast(`Profile "${saved.name}" imported.`);
      } catch (err) {
        showToast('Couldn\'t import profile — the file may be invalid or corrupted.');
      }
      e.target.value = '';
    });

    // Site mode
    document.querySelectorAll('input[name="site-mode"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        siteConfig.siteMode = radio.value;
        await FontStorage.saveSiteConfig(siteConfig.siteMode, siteConfig.siteList);
        updateSiteListVisibility();
      });
    });

    // Add site
    $('btn-add-site').addEventListener('click', addSite);
    $('site-input').addEventListener('keydown', e => { if (e.key === 'Enter') addSite(); });

    async function addSite() {
      const raw = $('site-input').value.trim().toLowerCase();
      if (!raw) return;
      // Strip protocol/path
      const clean = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\s/g, '');
      if (!clean || siteConfig.siteList.includes(clean)) {
        $('site-input').value = '';
        return;
      }
      // Reject strings that don't look like domains
      if (clean.length > 253 || !/^[a-z0-9]/.test(clean)) {
        const siteInput = $('site-input');
        siteInput.setCustomValidity('Enter a valid domain name, e.g. example.com');
        siteInput.reportValidity();
        return;
      }
      $('site-input').setCustomValidity('');
      siteConfig.siteList = [...siteConfig.siteList, clean];
      await FontStorage.saveSiteConfig(siteConfig.siteMode, siteConfig.siteList);
      $('site-input').value = '';
      renderSiteList();
    }

    $('site-list').addEventListener('click', async e => {
      const btn = e.target.closest('.btn-remove-site');
      if (!btn) return;
      const site = btn.dataset.site;
      siteConfig.siteList = siteConfig.siteList.filter(s => s !== site);
      await FontStorage.saveSiteConfig(siteConfig.siteMode, siteConfig.siteList);
      renderSiteList();
    });

    // Theme toggle — toggles light ↔ dark
    const btnThemeToggle = $('btn-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', async () => {
        const current = currentSettings.colorScheme === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        currentSettings.colorScheme = next;
        applyTheme(next);
        await FontStorage.saveSettings(currentSettings);
      });
    }

    // Reset everything
    $('btn-reset-everything').addEventListener('click', async () => {
      if (!confirm('Delete all settings, profiles, and custom fonts? This can\'t be undone.')) return;
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      siteConfig = { siteMode: SITE_MODES.GLOBAL, siteList: [] };
      customFonts = [];
      profiles = [];
      currentSettings = Object.assign({}, DEFAULT_SETTINGS);
      renderSiteMode();
      renderSiteList();
      renderCustomFonts();
      renderProfiles();
      notifyAllTabs(MESSAGE_TYPES.APPLY_SETTINGS);
      showToast('All settings reset.');
    });
  }

  // ---------- start ----------
  init().catch(console.error);
})();
