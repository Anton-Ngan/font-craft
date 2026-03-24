// popup/popup-fonts.js
// Font select population and font preview strip.

function populateFontSelect() {
  const bundledGroup = fontFamilySelect.querySelector(
    "optgroup:nth-of-type(1)",
  );
  const systemGroup = fontFamilySelect.querySelector("optgroup:nth-of-type(2)");
  const customGroup = $("optgroup-custom");

  BUNDLED_FONTS.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.name;
    opt.textContent = f.label;
    bundledGroup.appendChild(opt);
  });

  SYSTEM_FONTS.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.stack || f.name;
    opt.textContent = f.label;
    systemGroup.appendChild(opt);
  });

  customFonts.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.name;
    opt.textContent = f.name + " (custom)";
    customGroup.appendChild(opt);
  });

  fontFamilySelect.value = settings.fontFamily || "";
}

function updateFontPreview() {
  const font = fontFamilySelect.value;
  if (font) {
    fontPreview.style.fontFamily = font;
    fontPreview.textContent = `The quick brown fox — ${font}`;
    fontPreview.classList.add("visible");
  } else {
    fontPreview.classList.remove("visible");
  }
}
