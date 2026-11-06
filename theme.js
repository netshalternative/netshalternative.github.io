// Light and dark themes. The small script at the top of index.html picks the theme before the page paints;
// this adds the button that switches it, and remembers the visitor's choice.
const STORAGE_KEY = 'theme';
const THEME_COLORS = { light: '#fbfaf7', dark: '#0b0b0c' };

/** @typedef {'light' | 'dark'} Theme */

/** @returns {Theme} */
function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** @returns {Theme | null} */
function savedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null; // Storage blocked: the device's setting decides.
  }
}

/** @param {Theme} theme */
function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the choice still holds until the page is closed.
  }
}

/** @param {Theme} theme */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  for (const button of document.querySelectorAll('.theme-toggle')) button.setAttribute('aria-pressed', String(theme === 'dark'));
}

/** Cross-fades to the new theme where the browser can, unless the visitor asks for reduced motion. */
function switchTo(/** @type {Theme} */ theme) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || !document.startViewTransition) applyTheme(theme);
  else document.startViewTransition(() => applyTheme(theme));
}

export function setUpThemeToggle() {
  applyTheme(currentTheme());
  for (const button of document.querySelectorAll('.theme-toggle')) {
    if (!(button instanceof HTMLButtonElement)) continue;
    button.hidden = false;
    button.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      switchTo(next);
    });
  }
  // Follows the device's setting as it changes, until the visitor picks a theme here.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (!savedTheme()) switchTo(event.matches ? 'dark' : 'light');
  });
}
