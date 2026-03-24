// popup/popup-controls.js
// Renders current settings into the popup UI controls.

function renderControls() {
  fontFamilySelect.value = settings.fontFamily || "";

  const lh = parseFloat(settings.lineHeight) || 0;
  lineHeightSlider.value = lh === 0 ? 1.2 : lh;
  lineHeightLabel.textContent = lh === 0 ? "normal" : lh.toFixed(1) + "×";
  lineHeightSlider.setAttribute(
    "aria-valuetext",
    lh === 0 ? "normal" : lh.toFixed(1) + "×",
  );
  btnResetLineHeight.hidden = lh === 0;
  setSliderFill(lineHeightSlider);

  const ls = parseFloat(settings.letterSpacing) || 0;
  letterSpacingSlider.value = ls;
  letterSpacingLabel.textContent = ls === 0 ? "normal" : ls.toFixed(3) + "em";
  letterSpacingSlider.setAttribute(
    "aria-valuetext",
    ls === 0 ? "normal" : ls.toFixed(3) + "em",
  );
  btnResetLetterSpacing.hidden = ls === 0;
  setSliderFill(letterSpacingSlider);

  const ws = parseFloat(settings.wordSpacing) || 0;
  wordSpacingSlider.value = ws;
  wordSpacingLabel.textContent = ws === 0 ? "normal" : ws.toFixed(2) + "em";
  wordSpacingSlider.setAttribute(
    "aria-valuetext",
    ws === 0 ? "normal" : ws.toFixed(2) + "em",
  );
  btnResetWordSpacing.hidden = ws === 0;
  setSliderFill(wordSpacingSlider);

  const ps = parseFloat(settings.paragraphSpacing) || 0;
  paragraphSpacingSlider.value = ps;
  paragraphSpacingLabel.textContent =
    ps === 0 ? "normal" : ps.toFixed(1) + "em";
  paragraphSpacingSlider.setAttribute(
    "aria-valuetext",
    ps === 0 ? "normal" : ps.toFixed(1) + "em",
  );
  btnResetParagraphSpacing.hidden = ps === 0;
  setSliderFill(paragraphSpacingSlider);

  if (settings.textColor) textColorInput.value = settings.textColor;
  setColorHex(textColorHex, settings.textColor);

  if (settings.highlightColor) {
    highlightColorInput.value = settings.highlightColor;
    fieldHighlightText.hidden = false;
  }
  setColorHex(highlightColorHex, settings.highlightColor);

  if (settings.highlightTextColor)
    highlightTextColorInput.value = settings.highlightTextColor;
  setColorHex(highlightTextColorHex, settings.highlightTextColor);

  if (settings.fontFamily) updateFontPreview();
}
