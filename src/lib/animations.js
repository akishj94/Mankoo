import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis } from './lenis.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Syncs ScrollTrigger with the Lenis instance so smooth-scroll and
 * scroll-triggered animations stay in step with each other.
 */
function syncScrollTriggerWithLenis() {
  const lenis = getLenis();
  if (!lenis) return;

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

/**
 * Example reveal animation — fade/slide up any [data-reveal] element
 * as it enters the viewport. Extend or replace with real animations.
 */
function initRevealAnimations() {
  const targets = document.querySelectorAll('[data-reveal]');

  targets.forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 24 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
        },
      }
    );
  });
}

function initHeroVideo() {
  const video = document.querySelector('[data-hero-video]');
  const toggle = document.querySelector('[data-video-toggle]');
  if (!video || !toggle) return;

  const ring = toggle.querySelector('[data-video-progress]');
  const playIcon = toggle.querySelector('[data-icon-play]');
  const pauseIcon = toggle.querySelector('[data-icon-pause]');
  if (!ring || !playIcon || !pauseIcon) return;

  // Must match the ring circle's radius in the markup.
  const RADIUS = 19;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  video.muted = true;
  gsap.set(ring, { strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE });

  function setProgress() {
    if (!video.duration) return;

    const progress = Math.min(video.currentTime / video.duration, 1);
    gsap.set(ring, { strokeDashoffset: CIRCUMFERENCE * (1 - progress) });
  }

  function setPlaying(isPlaying) {
    toggle.setAttribute('aria-label', `${isPlaying ? 'Pause' : 'Play'} background video`);
    toggle.setAttribute('aria-pressed', String(!isPlaying));

    playIcon.classList.toggle('hidden', isPlaying);
    pauseIcon.classList.toggle('hidden', !isPlaying);

    // Driven off GSAP's ticker rather than `timeupdate`, which only fires a
    // few times a second and makes the ring look choppy.
    if (isPlaying) {
      gsap.ticker.add(setProgress);
    } else {
      gsap.ticker.remove(setProgress);
      setProgress();
    }
  }

  function play() {
    // Autoplay can still be refused (data saver, low power mode) — fall back
    // to the paused state instead of showing a pause icon that does nothing.
    video.play().catch(() => setPlaying(false));
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function applyMotionPreference() {
    if (reducedMotion.matches) {
      video.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      play();
    }
  }

  reducedMotion.addEventListener('change', applyMotionPreference);

  toggle.addEventListener('click', () => (video.paused ? play() : video.pause()));

  video.addEventListener('play', () => setPlaying(true));
  video.addEventListener('pause', () => setPlaying(false));
  video.addEventListener('loadedmetadata', setProgress);
  // If the clip is ever removed the control should not linger.
  video.addEventListener('error', () => (toggle.hidden = true));

  applyMotionPreference();
}

/**
 * Fixed header — slides away as you scroll down and returns when scrolling up.
 */
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  const move = gsap.quickTo(header, 'yPercent', { duration: 0.4, ease: 'power3.out' });
  let lastY = 0;

  function update(y) {
    // Drives the header scrim, which stays hidden at the top of the page.
    header.toggleAttribute('data-scrolled', y > 8);

    if (y <= 0) {
      move(0); // always visible at the top of the page
    } else if (Math.abs(y - lastY) > 4) {
      // 4px threshold keeps trackpad jitter from flickering the header
      move(y > lastY ? -100 : 0);
    }
    lastY = y;
  }

  const lenis = getLenis();
  if (lenis) {
    lenis.on('scroll', ({ scroll }) => update(scroll));
  } else {
    window.addEventListener('scroll', () => update(window.scrollY), { passive: true });
  }
}

/**
 * Mobile navigation (below 992px). Slides the panel down from the fixed bar.
 */
function initMobileNav() {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const panel = document.querySelector('[data-mobile-nav]');
  if (!header || !toggle || !panel) return;

  const desktop = window.matchMedia('(min-width: 992px)');

  // The slide itself is a CSS transition on .mobile-nav — all this needs to
  // do is flip the state attribute that drives it.
  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    header.toggleAttribute('data-menu-open', open);
  }

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Don't leave the panel hanging open if the viewport grows past the
  // breakpoint or the page scrolls away underneath it.
  desktop.addEventListener('change', (e) => e.matches && setOpen(false));

  const lenis = getLenis();
  if (lenis) {
    lenis.on('scroll', ({ scroll }) => scroll > 4 && isOpen() && setOpen(false));
  } else {
    window.addEventListener(
      'scroll',
      () => window.scrollY > 4 && isOpen() && setOpen(false),
      { passive: true }
    );
  }
}

export function initAnimations() {
  syncScrollTriggerWithLenis();
  initRevealAnimations();
  initHeroVideo();
  initHeader();
  initMobileNav();
}
