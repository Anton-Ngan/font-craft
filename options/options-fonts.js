// options/options-fonts.js
// Custom font list rendering, inline rename, file upload, and Google Fonts handling.
// @ts-nocheck — depends on globals from options-state.js, shared scripts

function renderCustomFonts() {
  const list       = document.getElementById('custom-fonts-list');
  const countBadge = document.getElementById('custom-fonts-count');
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
    const safeId   = escapeHtml(f.id);
    item.innerHTML = `
      <span class="list-item__name list-item__name--editable" role="button" tabindex="0" data-id="${safeId}" aria-label="${safeName}, press Enter to rename" title="Click or press Enter to rename">${safeName}</span>
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
  const status = document.getElementById('upload-status');
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
  const status = document.getElementById('google-font-status');
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

  const addBtn = document.getElementById('btn-add-google-font');
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
    document.getElementById('google-font-input').value = '';
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
