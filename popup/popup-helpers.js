// popup/popup-helpers.js
// Slider helpers, color hex display, and tab switching.

function setSliderFill(slider) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  slider.style.setProperty("--fill", pct.toFixed(1) + "%");
}

function stepSlider(slider, delta) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const step = parseFloat(slider.step);
  const val = parseFloat(slider.value);
  const next = Math.round((val + delta) / step) * step;
  slider.value = Math.min(max, Math.max(min, parseFloat(next.toFixed(10))));
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}

function setColorHex(hexEl, value) {
  if (value) {
    hexEl.textContent = value;
    hexEl.classList.remove("color-hex--unset");
  } else {
    hexEl.textContent = "not set";
    hexEl.classList.add("color-hex--unset");
  }
}

function switchTab(panel) {
  document.querySelectorAll(".tab").forEach((t) => {
    const isActive = t.dataset.panel === panel;
    t.classList.toggle("tab--active", isActive);
    t.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  document.querySelectorAll(".panel").forEach((p) => {
    p.hidden = p.id !== `panel-${panel}`;
  });
}
