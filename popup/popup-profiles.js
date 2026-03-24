// popup/popup-profiles.js
// Profile list rendering and inline rename.

function renderProfiles() {
  profilesList.innerHTML = "";
  if (!profiles.length) {
    profilesList.innerHTML = '<p class="empty-msg">No saved profiles yet.</p>';
    return;
  }
  profiles.forEach((p) => {
    const item = document.createElement("div");
    item.className = "profile-item";
    item.setAttribute("role", "listitem");
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
  const nameSpan = item.querySelector(".profile-item__name");
  const currentName = nameSpan.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentName;
  input.className = "profile-rename-input";
  input.setAttribute("aria-label", "New profile name");
  input.maxLength = 40;
  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  let committed = false;
  async function commitRename() {
    if (committed) return;
    committed = true;
    const newName = input.value.trim();
    if (!newName || newName === currentName) {
      renderProfiles();
      return;
    }
    if (profiles.some((p) => p.id !== id && p.name === newName)) {
      committed = false;
      input.setCustomValidity("A profile with this name already exists");
      input.reportValidity();
      return;
    }
    await FontStorage.renameProfile(id, newName);
    const p = profiles.find((pr) => pr.id === id);
    if (p) p.name = newName;
    renderProfiles();
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    }
    if (e.key === "Escape") {
      renderProfiles();
    }
  });
  input.addEventListener("blur", commitRename);
}
