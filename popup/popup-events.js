// popup/popup-events.js
// All event listener wiring for the popup.

function bindEvents() {
  // ---------- Tab switching ----------
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.panel));
  });

  // ---------- Font family — auto-show preview on change ----------
  fontFamilySelect.addEventListener("change", () => {
    pushSettings({ fontFamily: fontFamilySelect.value });
    updateFontPreview();
  });

  // Aa button — toggle preview visibility
  btnPreviewFont.addEventListener("click", () => {
    if (fontPreview.classList.contains("visible")) {
      fontPreview.classList.remove("visible");
    } else {
      updateFontPreview();
    }
  });

  // ---------- Sliders ----------

  // Line height — range 1.0–3.0
  lineHeightSlider.addEventListener("input", () => {
    const v = parseFloat(lineHeightSlider.value);
    const label = v.toFixed(1) + "×";
    lineHeightLabel.textContent = label;
    lineHeightSlider.setAttribute("aria-valuetext", label);
    setSliderFill(lineHeightSlider);
    btnResetLineHeight.hidden = false;
    pushSettings({ lineHeight: String(v) });
  });
  btnLhDec.addEventListener("click", () => stepSlider(lineHeightSlider, -0.1));
  btnLhInc.addEventListener("click", () => stepSlider(lineHeightSlider, +0.1));
  btnResetLineHeight.addEventListener("click", () => {
    lineHeightLabel.textContent = "normal";
    lineHeightSlider.setAttribute("aria-valuetext", "normal");
    lineHeightSlider.value = 1.2;
    btnResetLineHeight.hidden = true;
    setSliderFill(lineHeightSlider);
    pushSettings({ lineHeight: "" });
  });

  // Letter spacing
  letterSpacingSlider.addEventListener("input", () => {
    const v = parseFloat(letterSpacingSlider.value);
    const label = v === 0 ? "normal" : v.toFixed(3) + "em";
    letterSpacingLabel.textContent = label;
    letterSpacingSlider.setAttribute("aria-valuetext", label);
    setSliderFill(letterSpacingSlider);
    btnResetLetterSpacing.hidden = v === 0;
    pushSettings({ letterSpacing: v === 0 ? "" : v.toFixed(3) + "em" });
  });
  btnLsDec.addEventListener("click", () =>
    stepSlider(letterSpacingSlider, -0.005),
  );
  btnLsInc.addEventListener("click", () =>
    stepSlider(letterSpacingSlider, +0.005),
  );
  btnResetLetterSpacing.addEventListener("click", () => {
    letterSpacingLabel.textContent = "normal";
    letterSpacingSlider.setAttribute("aria-valuetext", "normal");
    letterSpacingSlider.value = 0;
    btnResetLetterSpacing.hidden = true;
    setSliderFill(letterSpacingSlider);
    pushSettings({ letterSpacing: "" });
  });

  // Word spacing
  wordSpacingSlider.addEventListener("input", () => {
    const v = parseFloat(wordSpacingSlider.value);
    const label = v === 0 ? "normal" : v.toFixed(2) + "em";
    wordSpacingLabel.textContent = label;
    wordSpacingSlider.setAttribute("aria-valuetext", label);
    setSliderFill(wordSpacingSlider);
    btnResetWordSpacing.hidden = v === 0;
    pushSettings({ wordSpacing: v === 0 ? "" : v.toFixed(2) + "em" });
  });
  btnWsDec.addEventListener("click", () =>
    stepSlider(wordSpacingSlider, -0.01),
  );
  btnWsInc.addEventListener("click", () =>
    stepSlider(wordSpacingSlider, +0.01),
  );
  btnResetWordSpacing.addEventListener("click", () => {
    wordSpacingLabel.textContent = "normal";
    wordSpacingSlider.setAttribute("aria-valuetext", "normal");
    wordSpacingSlider.value = 0;
    btnResetWordSpacing.hidden = true;
    setSliderFill(wordSpacingSlider);
    pushSettings({ wordSpacing: "" });
  });

  // Paragraph spacing
  paragraphSpacingSlider.addEventListener("input", () => {
    const v = parseFloat(paragraphSpacingSlider.value);
    const label = v === 0 ? "normal" : v.toFixed(1) + "em";
    paragraphSpacingLabel.textContent = label;
    paragraphSpacingSlider.setAttribute("aria-valuetext", label);
    setSliderFill(paragraphSpacingSlider);
    btnResetParagraphSpacing.hidden = v === 0;
    pushSettings({ paragraphSpacing: v === 0 ? "" : v.toFixed(1) + "em" });
  });
  btnPsDec.addEventListener("click", () =>
    stepSlider(paragraphSpacingSlider, -0.1),
  );
  btnPsInc.addEventListener("click", () =>
    stepSlider(paragraphSpacingSlider, +0.1),
  );
  btnResetParagraphSpacing.addEventListener("click", () => {
    paragraphSpacingLabel.textContent = "normal";
    paragraphSpacingSlider.setAttribute("aria-valuetext", "normal");
    paragraphSpacingSlider.value = 0;
    btnResetParagraphSpacing.hidden = true;
    setSliderFill(paragraphSpacingSlider);
    pushSettings({ paragraphSpacing: "" });
  });

  // ---------- Colors ----------

  // Text color — auto-apply on change, Reset clears
  textColorInput.addEventListener("input", () => {
    setColorHex(textColorHex, textColorInput.value);
    pushSettings({ textColor: textColorInput.value });
  });
  btnResetTextColor.addEventListener("click", () => {
    setColorHex(textColorHex, "");
    pushSettings({ textColor: "" });
  });

  // Highlight color — auto-apply on change, Reset clears both
  highlightColorInput.addEventListener("input", () => {
    fieldHighlightText.hidden = false;
    setColorHex(highlightColorHex, highlightColorInput.value);
    pushSettings({ highlightColor: highlightColorInput.value });
  });
  btnResetHighlight.addEventListener("click", () => {
    fieldHighlightText.hidden = true;
    setColorHex(highlightColorHex, "");
    setColorHex(highlightTextColorHex, "");
    pushSettings({ highlightColor: "", highlightTextColor: "" });
  });
  highlightTextColorInput.addEventListener("input", () => {
    setColorHex(highlightTextColorHex, highlightTextColorInput.value);
    pushSettings({ highlightTextColor: highlightTextColorInput.value });
  });
  if (btnResetHighlightText) {
    btnResetHighlightText.addEventListener("click", () => {
      setColorHex(highlightTextColorHex, "");
      pushSettings({ highlightTextColor: "" });
    });
  }

  // ---------- Master on/off toggle ----------
  statusBadge.addEventListener("click", async () => {
    await pushSettings({ enabled: !settings.enabled });
    renderSiteState();
    // Pop animation on toggle
    statusBadge.classList.remove("popping");
    void statusBadge.offsetWidth; // restart animation
    statusBadge.classList.add("popping");
    statusBadge.addEventListener(
      "animationend",
      () => statusBadge.classList.remove("popping"),
      { once: true },
    );
  });

  // ---------- Site toggle ----------
  btnToggleSite.addEventListener("click", handleSiteToggle);

  // ---------- Profiles ----------
  profileNameInput.addEventListener("input", () =>
    profileNameInput.setCustomValidity(""),
  );

  btnSaveProfile.addEventListener("click", async () => {
    const name = profileNameInput.value.trim();
    if (!name) {
      profileNameInput.focus();
      return;
    }
    if (profiles.some((p) => p.name === name)) {
      profileNameInput.setCustomValidity(
        "A profile with this name already exists",
      );
      profileNameInput.reportValidity();
      return;
    }
    profileNameInput.setCustomValidity("");
    btnSaveProfile.disabled = true;
    try {
      const saved = await FontStorage.saveProfile(name, settings);
      profiles.push(saved);
      profileNameInput.value = "";
      renderProfiles();
    } finally {
      btnSaveProfile.disabled = false;
    }
  });

  profilesList.addEventListener("click", async (e) => {
    const loadBtn = e.target.closest(".btn-load-profile");
    const renameBtn = e.target.closest(".btn-rename-profile");
    const deleteBtn = e.target.closest(".btn-delete-profile");
    if (renameBtn) {
      const id = renameBtn.dataset.id;
      const item = renameBtn.closest(".profile-item");
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
          chrome.tabs
            .sendMessage(currentTab.id, {
              type: MESSAGE_TYPES.APPLY_SETTINGS,
              settings,
            })
            .catch(() => {});
        }
        loadBtn.textContent = "✓ Loaded";
        if (statusLive) statusLive.textContent = "Profile loaded.";
        setTimeout(() => {
          loadBtn.textContent = "Load";
        }, 1500);
      } else {
        loadBtn.textContent = "Failed";
        if (statusLive) statusLive.textContent = "Failed to load profile.";
        setTimeout(() => {
          loadBtn.textContent = "Load";
        }, 1500);
      }
    }
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      await FontStorage.deleteProfile(id);
      profiles = profiles.filter((p) => p.id !== id);
      renderProfiles();
    }
  });

  btnResetAll.addEventListener("click", async () => {
    if (!confirm("Reset all settings to defaults? This can't be undone."))
      return;
    settings = Object.assign({}, DEFAULT_SETTINGS);
    await FontStorage.saveSettings(settings);
    renderControls();
    if (currentTab?.id) {
      chrome.tabs
        .sendMessage(currentTab.id, {
          type: MESSAGE_TYPES.APPLY_SETTINGS,
          settings,
        })
        .catch(() => {});
    }
  });

  // ---------- Theme toggle ----------
  btnThemeToggle.addEventListener("click", () => {
    const current = settings.colorScheme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    pushSettings({ colorScheme: next });
  });

  // ---------- Options page ----------
  btnOptions.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Tooltip: dismiss on Escape
  const btnInfo = document.querySelector(".btn-info");
  if (btnInfo) {
    btnInfo.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        btnInfo.blur();
      }
    });
  }
}
