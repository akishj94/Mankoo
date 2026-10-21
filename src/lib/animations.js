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

/**
 * Wires every `[data-video-player]` on the page — the hero background clip and
 * any `Media` video frame. Each root owns its `<video>` plus its
 * `[data-video-toggle]` button (progress ring, play/pause icons), so any
 * number of players can coexist; a guard keeps re-runs idempotent.
 */
function initVideoPlayer(root) {
  const video = root.querySelector('video');
  const toggle = root.querySelector('[data-video-toggle]');
  if (!video || !toggle) return;

  const label = root.dataset.videoLabel || 'video';

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
    toggle.setAttribute('aria-label', `${isPlaying ? 'Pause' : 'Play'} ${label}`);
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

function initVideoPlayers() {
  document.querySelectorAll('[data-video-player]').forEach((root) => {
    if (root.hasAttribute('data-video-player-init')) return;
    root.setAttribute('data-video-player-init', '');
    initVideoPlayer(root);
  });
}

/** Fixed header — slides away as you scroll down and returns when scrolling up. */
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  const move = gsap.quickTo(header, 'yPercent', { duration: 0.4, ease: 'power3.out' });
  let lastY = 0;
  let visible = true;

  function update(y) {
    if (y <= 0) {
      visible = true;
      move(0);
    } else if (Math.abs(y - lastY) > 4) {
      // 4px threshold keeps trackpad jitter from flickering the header
      visible = y <= lastY;
      move(visible ? 0 : -100);
    }

    // The scrim is a pseudo-element on the header, so it travels with it. Only
    // show it while the header is on screen, otherwise a sliver of the gradient
    // stays pinned to the top of the viewport after it slides away.
    header.toggleAttribute('data-scrolled', visible && y > 8);
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

  // The slide itself is a Tailwind transition on [data-mobile-nav] — all this
  // needs to do is flip the state attribute that drives it.
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

  // Submenu accordions inside the mobile panel — click only, no image. Only
  // one stays open at a time so the list stays scannable.
  const groups = Array.from(panel.querySelectorAll('[data-mobile-group]'));

  groups.forEach((groupEl) => {
    const toggleButton = groupEl.querySelector('[data-mobile-submenu-toggle]');
    const submenu = groupEl.querySelector('[data-mobile-submenu]');
    if (!toggleButton || !submenu) return;

    const isExpanded = () => toggleButton.getAttribute('aria-expanded') === 'true';

    const setExpanded = (expanded) => {
      toggleButton.setAttribute('aria-expanded', String(expanded));
      toggleButton.setAttribute(
        'aria-label',
        `${expanded ? 'Hide' : 'Show'} ${groupEl.querySelector('a')?.textContent?.trim() ?? 'submenu'} submenu`
      );
      if (expanded) {
        submenu.removeAttribute('hidden');
      } else {
        submenu.setAttribute('hidden', '');
      }
    };

    toggleButton.addEventListener('click', () => {
      const next = !isExpanded();
      groups.forEach((other) => {
        if (other === groupEl) return;
        const otherToggle = other.querySelector('[data-mobile-submenu-toggle]');
        const otherSubmenu = other.querySelector('[data-mobile-submenu]');
        if (otherToggle && otherSubmenu) {
          otherToggle.setAttribute('aria-expanded', 'false');
          otherSubmenu.setAttribute('hidden', '');
        }
      });
      setExpanded(next);
    });
  });
}

export function initAnimations() {
  syncScrollTriggerWithLenis();
  initRevealAnimations();
  initVideoPlayers();
  initHeader();
  initMobileNav();
}
