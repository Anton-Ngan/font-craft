// options/options-profiles.js
// Profile list rendering and inline rename for the options page.
// @ts-nocheck — depends on globals from options-state.js, shared scripts

function renderProfiles() {
  const list = document.getElementById('profiles-list');
  list.innerHTML = '';
  if (!profiles.length) {
    list.innerHTML = '<p class="empty-msg">No saved profiles yet.</p>';
    return;
  }
  profiles.forEach(p => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.setAttribute('role', 'listitem');
    const safeName = escapeHtml(p.name);
    const safeId   = escapeHtml(p.id);
    const dateVal  = p.created ? new Date(p.created) : null;
    const date     = (dateVal && !isNaN(dateVal)) ? dateVal.toLocaleDateString() : '—';
    item.innerHTML = `
      <span class="list-item__name list-item__name--editable" role="button" tabindex="0" data-id="${safeId}" aria-label="${safeName}, press Enter to rename" title="Click or press Enter to rename">${safeName}</span>
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
