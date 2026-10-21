import { initLenis } from './lenis.js';
import { initAnimations } from './animations.js';
import { initTheme } from './theme.js';

// Smooth scrolling is temporarily switched off. Every consumer of the Lenis
// instance falls back to native scrolling when it is absent, so leaving this
// false is safe — set it back to true to re-enable.
const USE_LENIS = false;

function init() {
  initTheme();
  if (USE_LENIS) initLenis();

  initAnimations();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
