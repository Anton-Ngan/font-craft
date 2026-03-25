// options/options-sites.js
// Site mode radio rendering and site list management.

function renderSiteMode() {
  const radios = document.querySelectorAll('input[name="site-mode"]');
  radios.forEach((r) => {
    r.checked = r.value === siteConfig.siteMode;
  });
  updateSiteListVisibility();
}

function renderSiteList() {
  const list = document.getElementById("site-list");
  list.innerHTML = "";
  if (!siteConfig.siteList.length) {
    list.innerHTML = '<p class="empty-msg">No sites in the list yet.</p>';
    return;
  }
  siteConfig.siteList.forEach((site) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.setAttribute("role", "listitem");
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
  const card = document.getElementById("site-list-card");
  const hint = document.getElementById("site-list-hint");
  const title = document.getElementById("site-list-title");
  const mode = siteConfig.siteMode;

  if (mode === SITE_MODES.GLOBAL) {
    card.hidden = true;
  } else {
    card.hidden = false;
    if (mode === SITE_MODES.WHITELIST) {
      title.textContent = "Allowed sites";
      hint.innerHTML =
        "Extension is <strong>only active</strong> on these domains.";
    } else {
      title.textContent = "Blocked sites";
      hint.innerHTML =
        "Extension is <strong>disabled</strong> on these domains.";
    }
  }
}
