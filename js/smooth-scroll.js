/**
 * TelaquaSmoothScroll
 * ---------------------------------------------------------------------------
 * Premium inertial scrolling (Lenis) synchronized with GSAP ScrollTrigger.
 *
 * Architecture
 * 1. Wheel / touchpad sets a *target* scroll position (Lenis).
 * 2. Lenis interpolates toward that target every frame (inertia + soft stop).
 * 3. GSAP's ticker drives Lenis.raf so scroll + ScrollTrigger share one clock.
 * 4. lenis.on('scroll') → ScrollTrigger.update keeps scrub timelines in sync.
 *
 * Mobile uses snappier settings so scrubbed pins track the finger with less lag.
 * ---------------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  const STATE = {
    lenis: null,
    tickerBound: false,
    reducedMotion: false
  };

  /** Expo-out style easing — soft acceleration, long premium deceleration. */
  function premiumEase(t) {
    return Math.min(1, 1.001 - Math.pow(2, -10 * t));
  }

  function isPhone() {
    return window.matchMedia('(max-width:768px)').matches;
  }

  /**
   * Create (or return) the shared Lenis instance.
   * Tight wheel interpolation keeps pinned scrub scenes responsive.
   */
  function createLenis() {
    if (STATE.lenis) return STATE.lenis;
    if (typeof Lenis === 'undefined') {
      console.warn('[TelaquaSmoothScroll] Lenis not found');
      return null;
    }

    STATE.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (STATE.reducedMotion) return null;

    const phone = isPhone();
    const lenis = new Lenis({
      /* Driven by GSAP ticker — do NOT also enable autoRaf */
      autoRaf: false,
      /* Mobile: shorter inertia so scrub pins feel attached to the finger */
      duration: phone ? 0.42 : 0.7,
      easing: premiumEase,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: phone ? 1.05 : 1,
      touchMultiplier: phone ? 1.15 : 1.25,
      /* Trackpad / touch: interpolate like wheel (symmetric up/down) */
      syncTouch: true,
      syncTouchLerp: phone ? 0.22 : 0.14,
      touchInertiaMultiplier: phone ? 12 : 18,
      infinite: false
    });

    STATE.lenis = lenis;
    global.__telaquaLenis = lenis;

    const root = document.documentElement;
    root.classList.add('lenis', 'lenis-smooth');
    /* Kill native CSS smooth-scroll so Lenis owns inertia */
    root.style.scrollBehavior = 'auto';

    return lenis;
  }

  /**
   * Canonical Lenis ↔ ScrollTrigger bridge.
   * Must run once after both libraries are available.
   */
  function bindToScrollTrigger(lenis) {
    if (!lenis || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      return false;
    }

    gsap.registerPlugin(ScrollTrigger);

    /* Mobile URL-bar resize can thrash pins — ignore those micro-resizes */
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* Every Lenis frame that changes scroll → refresh ScrollTrigger progress */
    lenis.on('scroll', ScrollTrigger.update);

    if (!STATE.tickerBound) {
      gsap.ticker.add((time) => {
        /* GSAP time is seconds; Lenis expects milliseconds */
        lenis.raf(time * 1000);
      });
      /* Prevent GSAP from inventing lag that desyncs scrub timelines */
      gsap.ticker.lagSmoothing(0);
      STATE.tickerBound = true;
    }

    return true;
  }

  /** Recalculate Lenis limits + all ScrollTrigger start/end positions. */
  function refresh() {
    const lenis = STATE.lenis || global.__telaquaLenis;
    if (lenis && typeof lenis.resize === 'function') lenis.resize();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  /**
   * Smooth programmatic scroll (anchors, CTAs). Prefer this over window.scrollTo.
   * @param {Element|number|string} target
   * @param {object} [opts]
   */
  function scrollTo(target, opts) {
    const lenis = STATE.lenis || global.__telaquaLenis;
    const options = Object.assign(
      {
        offset: 0,
        duration: isPhone() ? 0.85 : 1.2,
        easing: premiumEase,
        immediate: false
      },
      opts || {}
    );

    if (lenis) {
      lenis.scrollTo(target, options);
      return;
    }

    /* Fallback: native */
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
      return;
    }
    const el =
      typeof target === 'string' ? document.querySelector(target) : target;
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Stop inertia immediately (menus, modals). */
  function stop() {
    STATE.lenis?.stop?.();
  }

  /** Resume after stop(). */
  function start() {
    STATE.lenis?.start?.();
  }

  /**
   * Public bootstrap — call once on the home page.
   * Safe to call multiple times (idempotent).
   */
  function ensure() {
    const lenis = createLenis();
    if (!lenis) return null;
    bindToScrollTrigger(lenis);

    /* After layout settles, refresh so pin distances match Lenis content height */
    requestAnimationFrame(() => {
      refresh();
      requestAnimationFrame(refresh);
    });

    return lenis;
  }

  /* Resize → keep pin math + Lenis content size accurate */
  let resizeTimer = 0;
  window.addEventListener(
    'resize',
    () => {
      if (!STATE.lenis) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, 120);
    },
    { passive: true }
  );

  global.TelaquaSmoothScroll = {
    ensure,
    refresh,
    scrollTo,
    stop,
    start,
    getLenis: () => STATE.lenis || global.__telaquaLenis || null,
    isActive: () => !!(STATE.lenis || global.__telaquaLenis)
  };

  /*
   * Auto-bootstrap on index.html (this file is only included there).
   * Runs before main.js / product-model.js so every ScrollTrigger shares Lenis.
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ensure(), { once: true });
  } else {
    ensure();
  }
})(typeof window !== 'undefined' ? window : globalThis);
