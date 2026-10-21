/**
 * Light / dark theme. Dark is the default — the `light` class on <html> opts
 * into the light palette declared in global.css (`@custom-variant light`).
 * Preference persists in localStorage; without one we keep dark regardless of
 * the OS setting so first paint always matches the shipped design.
 */

const STORAGE_KEY = 'mankoo-theme';

function currentTheme() {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.documentElement.classList.toggle('light', isLight);
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.setAttribute('aria-pressed', String(isLight));
    button.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  });
}

function initTheme() {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'light') applyTheme('light');
    else applyTheme('dark');
  } catch {
    applyTheme('dark');
  }

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = currentTheme() === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Private browsing etc. — theme still flips for this page view.
      }
      applyTheme(next);
    });
  });
}

export { applyTheme, currentTheme, initTheme };
