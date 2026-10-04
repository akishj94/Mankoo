import Lenis from 'lenis';

/** @type {Lenis | null} */
let lenis = null;

/**
 * Creates (once) and returns the shared Lenis instance.
 * Safe to import anywhere — subsequent calls return the same instance.
 */
export function initLenis() {
  if (lenis) return lenis;

  lenis = new Lenis({
    autoRaf: false, // we drive the RAF loop ourselves so GSAP/ScrollTrigger can sync to it
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  return lenis;
}

export function getLenis() {
  return lenis;
}
