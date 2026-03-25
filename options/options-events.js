// options/options-events.js
// All event listener wiring for the options page.

async function notifyAllTabs(msgType) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: msgType }).catch(() => {});
      }
    }
  } catch {
    /* ignore */
  }
}

function bindEvents() {
  // ---------- Font file upload ----------
  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("font-file-input");

  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) handleFontFile(fileInput.files[0]);
    fileInput.value = "";
  });
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
  });
  uploadArea.addEventListener("dragleave", () =>
    uploadArea.classList.remove("drag-over"),
  );
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFontFile(file);
  });

  // ---------- Google font ----------
  document
    .getElementById("btn-add-google-font")
    .addEventListener("click", () => {
      handleGoogleFont(document.getElementById("google-font-input").value);
    });
  document
    .getElementById("google-font-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        handleGoogleFont(document.getElementById("google-font-input").value);
    });

  // Custom font list — keyboard rename (Enter on editable span)
  document
    .getElementById("custom-fonts-list")
    .addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const nameEl = e.target.closest(".list-item__name--editable");
      if (nameEl) {
        e.preventDefault();
        startFontRename(nameEl.dataset.id, nameEl);
      }
    });

  // Custom font list interactions (rename by clicking name, delete by button)
  document
    .getElementById("custom-fonts-list")
    .addEventListener("click", async (e) => {
      const deleteBtn = e.target.closest(".btn-delete-font");
      const nameEl = e.target.closest(".list-item__name--editable");
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        await FontStorage.deleteCustomFont(id);
        customFonts = customFonts.filter((f) => f.id !== id);
        renderCustomFonts();
        showToast("Font deleted.");
      } else if (nameEl) {
        startFontRename(nameEl.dataset.id, nameEl);
      }
    });

  // ---------- Save profile ----------
  const profileNameEl = document.getElementById("profile-name");
  const saveProfileBtn = document.getElementById("btn-save-profile");
  profileNameEl.addEventListener("input", () =>
    profileNameEl.setCustomValidity(""),
  );
  saveProfileBtn.addEventListener("click", async () => {
    const name = profileNameEl.value.trim();
    if (!name) {
      profileNameEl.focus();
      return;
    }
    if (profiles.some((p) => p.name === name)) {
      profileNameEl.setCustomValidity(
        "A profile with this name already exists",
      );
      profileNameEl.reportValidity();
      return;
    }
    profileNameEl.setCustomValidity("");
    saveProfileBtn.disabled = true;
    try {
      const settings = await FontStorage.getSettings();
      const saved = await FontStorage.saveProfile(name, settings);
      profiles.push(saved);
      profileNameEl.value = "";
      renderProfiles();
      showToast(`Profile "${name}" saved.`);
    } finally {
      saveProfileBtn.disabled = false;
    }
  });

  // Profiles list — keyboard rename (Enter on editable span)
  document.getElementById("profiles-list").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const nameEl = e.target.closest(".list-item__name--editable");
    if (nameEl) {
      e.preventDefault();
      startProfileRename(nameEl.dataset.id, nameEl);
    }
  });

  // Profile actions (rename by clicking name, load/export/delete by buttons)
  document
    .getElementById("profiles-list")
    .addEventListener("click", async (e) => {
      const nameEl = e.target.closest(".list-item__name--editable");
      const loadBtn = e.target.closest(".btn-load-profile");
      const exportBtn = e.target.closest(".btn-export-profile");
      const deleteBtn = e.target.closest(".btn-delete-profile");

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
              chrome.tabs
                .sendMessage(tab.id, {
                  type: MESSAGE_TYPES.APPLY_SETTINGS,
                  settings: saved,
                })
                .catch(() => {});
            }
          }
          showToast(`Profile "${p.name}" loaded.`);
        }
      }

      if (exportBtn) {
        const id = exportBtn.dataset.id;
        const json = await FontStorage.exportProfile(id);
        if (json) {
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `fa-profile-${id}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const p = profiles.find((pr) => pr.id === id);
        if (p && confirm(`Delete profile "${p.name}"? This can't be undone.`)) {
          await FontStorage.deleteProfile(id);
          profiles = profiles.filter((pr) => pr.id !== id);
          renderProfiles();
          showToast("Profile deleted.");
        }
      }
    });

  // ---------- Import profile ----------
  document
    .getElementById("import-profile-input")
    .addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const saved = await FontStorage.importProfile(text);
        profiles.push(saved);
        renderProfiles();
        showToast(`Profile "${saved.name}" imported.`);
      } catch (err) {
        showToast(
          "Couldn't import profile — the file may be invalid or corrupted.",
        );
      }
      e.target.value = "";
    });

  // ---------- Site mode ----------
  document.querySelectorAll('input[name="site-mode"]').forEach((radio) => {
    radio.addEventListener("change", async () => {
      siteConfig.siteMode = radio.value;
      await FontStorage.saveSiteConfig(
        siteConfig.siteMode,
        siteConfig.siteList,
      );
      updateSiteListVisibility();
    });
  });

  // Add site
  document.getElementById("btn-add-site").addEventListener("click", addSite);
  document.getElementById("site-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addSite();
  });

  async function addSite() {
    const raw = document
      .getElementById("site-input")
      .value.trim()
      .toLowerCase();
    if (!raw) return;
    // Strip protocol/path
    const clean = raw
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/\s/g, "");
    if (!clean || siteConfig.siteList.includes(clean)) {
      document.getElementById("site-input").value = "";
      return;
    }
    // Reject strings that don't look like domains
    if (clean.length > 253 || !/^[a-z0-9]/.test(clean)) {
      const siteInput = document.getElementById("site-input");
      siteInput.setCustomValidity(
        "Enter a valid domain name, e.g. example.com",
      );
      siteInput.reportValidity();
      return;
    }
    document.getElementById("site-input").setCustomValidity("");
    siteConfig.siteList = [...siteConfig.siteList, clean];
    await FontStorage.saveSiteConfig(siteConfig.siteMode, siteConfig.siteList);
    document.getElementById("site-input").value = "";
    renderSiteList();
  }

  document.getElementById("site-list").addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-remove-site");
    if (!btn) return;
    const site = btn.dataset.site;
    siteConfig.siteList = siteConfig.siteList.filter((s) => s !== site);
    await FontStorage.saveSiteConfig(siteConfig.siteMode, siteConfig.siteList);
    renderSiteList();
  });

  // ---------- Theme toggle ----------
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", async () => {
      const current = currentSettings.colorScheme === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      currentSettings.colorScheme = next;
      applyTheme(next);
      await FontStorage.saveSettings(currentSettings);
    });
  }

  // ---------- Reset everything ----------
  document
    .getElementById("btn-reset-everything")
    .addEventListener("click", async () => {
      if (
        !confirm(
          "Delete all settings, profiles, and custom fonts? This can't be undone.",
        )
      )
        return;
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
      showToast("All settings reset.");
    });
}
