// popup/popup-site.js
// Site active-state check, UI rendering, and site toggle handler.

function isActiveOnSite() {
  if (!currentHostname) return false;
  const { siteMode, siteList } = siteConfig;
  switch (siteMode) {
    case SITE_MODES.GLOBAL:
      return true;
    case SITE_MODES.WHITELIST:
      return siteList.some(
        (s) => currentHostname === s || currentHostname.endsWith("." + s),
      );
    case SITE_MODES.BLACKLIST:
      return !siteList.some(
        (s) => currentHostname === s || currentHostname.endsWith("." + s),
      );
    default:
      return true;
  }
}

function renderSiteState() {
  const active = isActiveOnSite() && settings.enabled;
  const wasActive = statusBadge.classList.contains("status-badge--on");
  statusBadge.className = `status-badge ${active ? "status-badge--on" : "status-badge--off"}`;
  statusText.textContent = active ? "ON" : "OFF";
  statusBadge.setAttribute(
    "aria-label",
    active
      ? "Extension is on. Click to turn off."
      : "Extension is off. Click to turn on.",
  );
  // Announce state changes (but not the initial render)
  if (statusLive && wasActive !== active) {
    statusLive.textContent = active
      ? "Extension turned on."
      : "Extension turned off.";
  }

  if (isActiveOnSite()) {
    btnToggleSite.textContent = "Disable on this site";
    btnToggleSite.classList.add("active");
    btnToggleSite.setAttribute("aria-pressed", "true");
  } else {
    btnToggleSite.textContent = "Enable on this site";
    btnToggleSite.classList.remove("active");
    btnToggleSite.setAttribute("aria-pressed", "false");
  }
}

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
      siteList = siteList.filter(
        (s) => s !== currentHostname && !currentHostname.endsWith("." + s),
      );
    } else {
      siteList = [...siteList, currentHostname];
    }
  } else if (siteMode === SITE_MODES.BLACKLIST) {
    if (currently) {
      siteList = [...siteList, currentHostname];
    } else {
      siteList = siteList.filter(
        (s) => s !== currentHostname && !currentHostname.endsWith("." + s),
      );
      if (!siteList.length) siteMode = SITE_MODES.GLOBAL;
    }
  }

  siteConfig = { siteMode, siteList };
  await FontStorage.saveSiteConfig(siteMode, siteList);
  renderSiteState();
}
