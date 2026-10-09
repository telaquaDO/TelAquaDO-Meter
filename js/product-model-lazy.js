/**
 * Warm Product & Benefits Three.js + GLBs early enough that the model is
 * ready (or nearly ready) when the pin enters view — without loading at
 * first paint or pulling dismantle/water assets.
 */
(function () {
  'use strict';

  const TARGET = document.querySelector('.product-cinematic') ||
    document.querySelector('.product-story');
  const MODULE_URL = './product-model.js?v=i18n-19';
  const isPhone = () =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width:768px)').matches;
  /* Phone skips Product Box Reveal — do not prefetch the box GLB */
  const GLB_URLS = isPhone()
    ? ['assets/images/ph3dmodel.glb']
    : ['assets/images/productboxwithupdatedvalue.glb', 'assets/images/ph3dmodel.glb'];

  let started = false;

  function injectPreload(href, asType) {
    if (!href || document.querySelector('link[data-telaqua-preload="' + href + '"]')) {
      return;
    }
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = asType;
    link.href = href;
    if (asType === 'fetch' || asType === 'script') {
      link.crossOrigin = 'anonymous';
    }
    link.setAttribute('data-telaqua-preload', href);
    document.head.appendChild(link);
  }

  function prefetchGlbs() {
    GLB_URLS.forEach((url) => {
      injectPreload(url, 'fetch');
      /* Warm HTTP cache so GLTFLoader hits memory/disk cache */
      if (typeof fetch === 'function') {
        fetch(url, { mode: 'cors', credentials: 'same-origin', cache: 'force-cache' }).catch(
          () => {}
        );
      }
    });
  }

  function loadProductModel() {
    if (started) return Promise.resolve();
    started = true;
    prefetchGlbs();
    injectPreload(
      'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js',
      'script'
    );
    return import(MODULE_URL);
  }

  function whenNear(el, options) {
    return new Promise((resolve) => {
      if (!el) {
        resolve();
        return;
      }
      if (typeof IntersectionObserver === 'undefined') {
        resolve();
        return;
      }
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      /* Already within ~2 viewports — start immediately */
      if (rect.top < vh * 2.2 && rect.bottom > -vh * 0.5) {
        resolve();
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            resolve();
          }
        },
        options
      );
      io.observe(el);
    });
  }

  function whenIdle(timeoutMs) {
    return new Promise((resolve) => {
      const finish = () => resolve();
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(finish, { timeout: timeoutMs });
      } else {
        setTimeout(finish, Math.min(timeoutMs, 1200));
      }
    });
  }

  /*
   * Race: early proximity OR idle after first paint.
   * Whichever wins starts Three + GLB download so fast scroll still sees the model.
   */
  const nearPromise = whenNear(TARGET, {
    rootMargin: '220% 0px 60% 0px',
    threshold: 0
  });
  const idlePromise = whenIdle(1800);

  Promise.race([nearPromise, idlePromise]).then(loadProductModel);

  /* Absolute fallback if idle/IO never fires (old WebViews) */
  setTimeout(loadProductModel, 5000);
})();
