// shared/theme.js
// Theme resolution and application — shared by popup and options pages.

/**
 * Resolve a stored scheme string to a concrete 'dark' | 'light' value.
 * When no explicit preference is stored ('auto' is a legacy alias for this),
 * fall back to the OS/browser system preference so the extension respects it
 * on first use without requiring a manual toggle.
 */
function resolveScheme(stored) {
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(scheme) {
  const resolved = resolveScheme(scheme);
  document.documentElement.setAttribute("data-theme", resolved);
  updateThemeButton(resolved);
}

function updateThemeButton(scheme) {
  const btn = document.getElementById("btn-theme-toggle");
  if (!btn) return;
  const resolved = scheme === "dark" ? "dark" : "light";
  const icons = {
    light:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    dark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  };
  btn.innerHTML = icons[resolved];
  btn.setAttribute(
    "aria-label",
    resolved === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );
}
