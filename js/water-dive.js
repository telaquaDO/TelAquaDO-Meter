/**
 * Water dive — dismantle handoff + WebP frame scrub + Why It Matters callouts.
 * Frames: assets/images/recenthighqualityimages/frame_111_delay-0.083s.webp … frame_141 (PNG masters kept alongside)
 * (same continuous sequence folder as dismantle 023–109)
 */
(function () {
  'use strict';

  const FRAME_START = 111;
  const FRAME_END = 141;
  const FRAME_COUNT = FRAME_END - FRAME_START + 1;
  const FRAME_DIR = 'assets/images/recenthighqualityimages/';
  const FRAME_EXT = '.webp'; /* WebP: ~15x smaller than the PNG masters */
  const FRAME_SUFFIX = '_delay-0.083s';
  const DIVE_END = 0.7;
  const PIN_VH = 1.9;
  const EARLY_BATCH = 10;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector('.water-dive');
  if (!section) return;

  const pin = section.querySelector('.water-dive-pin');
  const canvas = section.querySelector('.water-dive-canvas');
  const bridge = section.querySelector('.water-dive-bridge');
  const calloutsRoot = section.querySelector('.water-dive-callouts');
  const heading = section.querySelector('.water-dive-heading');
  const calloutEls = Array.from(section.querySelectorAll('[data-wd-callout]'));

  if (!pin || !canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  /** @type {(HTMLImageElement|null)[]} */
  const frames = new Array(FRAME_COUNT).fill(null);
  /** @type {boolean[]} */
  const ready = new Array(FRAME_COUNT).fill(false);

  let lastDrawn = -1;
  /** @type {HTMLImageElement|null} */
  let lastDrawnImg = null;
  let hasPainted = false;
  let dismantleHidden = false;
  let waterST = null;
  let lastProgress = 0;
  let resizeObs = null;

  function frameUrl(i) {
    const n = FRAME_START + i;
    return FRAME_DIR + 'frame_' + String(n).padStart(3, '0') + FRAME_SUFFIX + FRAME_EXT;
  }

  function sizeCanvas() {
    const w = Math.max(1, pin.clientWidth || window.innerWidth);
    const h = Math.max(1, pin.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      lastDrawn = -1;
    }
    return { w: bw, h: bh, cssW: w, cssH: h };
  }

  function drawCover(img) {
    if (!img || !img.naturalWidth) return false;
    const { w, h } = sizeCanvas();
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (w - dw) * 0.5;
    const dy = (h - dh) * 0.5;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, dx, dy, dw, dh);
    return true;
  }

  function nearestReady(target) {
    if (ready[target] && frames[target]) return frames[target];
    for (let d = 1; d < FRAME_COUNT; d++) {
      const a = target - d;
      const b = target + d;
      if (a >= 0 && ready[a] && frames[a]) return frames[a];
      if (b < FRAME_COUNT && ready[b] && frames[b]) return frames[b];
    }
    return null;
  }

  function markCanvasReady() {
    canvas.classList.add('is-ready');
    if (bridge) {
      bridge.classList.remove('is-shown');
    }
  }

  function setWaterFallChrome(on) {
    document.querySelector('.product-cinematic')?.classList.toggle('is-water-fall', !!on);
    document.querySelector('.product-dismantle-region')?.classList.toggle('is-water-fall', !!on);
    document.querySelector('.product-dismantle-bg')?.classList.toggle('is-water-fall', !!on);
  }

  /** Hide dismantle meter + callouts so only one meter is ever visible. */
  function hideDismantleMeter() {
    if (dismantleHidden) return;
    const frame = document.querySelector('.dismantle-story-frame');
    const dCanvas = document.querySelector('.dismantle-story-canvas');
    const dSection = document.querySelector('.dismantle-story');
    const dCallouts = document.querySelector('.dismantle-callouts');
    const dHeading = document.querySelector('.dismantle-heading');
    if (frame) {
      frame.style.opacity = '0';
      frame.style.visibility = 'hidden';
      frame.style.pointerEvents = 'none';
    }
    if (dCanvas) {
      dCanvas.style.opacity = '0';
      dCanvas.style.visibility = 'hidden';
      dCanvas.style.pointerEvents = 'none';
    }
    if (dCallouts) {
      dCallouts.style.opacity = '0';
      dCallouts.style.visibility = 'hidden';
    }
    if (dHeading) {
      dHeading.style.opacity = '0';
      dHeading.style.visibility = 'hidden';
    }
    if (dSection) dSection.classList.remove('is-active');
    dismantleHidden = true;
  }

  function showDismantleMeter() {
    if (!dismantleHidden) return;
    const frame = document.querySelector('.dismantle-story-frame');
    const dCanvas = document.querySelector('.dismantle-story-canvas');
    const dCallouts = document.querySelector('.dismantle-callouts');
    const dHeading = document.querySelector('.dismantle-heading');
    if (frame) {
      frame.style.opacity = '1';
      frame.style.visibility = 'visible';
      frame.style.pointerEvents = '';
    }
    if (dCanvas) {
      dCanvas.style.opacity = '1';
      dCanvas.style.visibility = 'visible';
      dCanvas.style.pointerEvents = '';
    }
    if (dCallouts) {
      dCallouts.style.opacity = '';
      dCallouts.style.visibility = '';
    }
    if (dHeading) {
      dHeading.style.opacity = '';
      dHeading.style.visibility = '';
    }
    dismantleHidden = false;
  }

  function hideBridge() {
    if (bridge) bridge.classList.remove('is-shown');
  }

  function paintFrame(targetIdx) {
    const idx = Math.max(0, Math.min(FRAME_COUNT - 1, targetIdx | 0));
    const img = nearestReady(idx);
    if (!img) return false;
    if (img === lastDrawnImg && idx === lastDrawn && hasPainted && canvas.classList.contains('is-ready')) {
      return true;
    }
    if (!drawCover(img)) return false;
    lastDrawn = idx;
    lastDrawnImg = img;
    hasPainted = true;
    markCanvasReady();
    /* Swap in the same tick: water frame on, dismantle off — no double meter */
    hideDismantleMeter();
    return true;
  }

  function beginHandoff(progress) {
    sizeCanvas();
    const p = Math.max(0, Math.min(1, progress || 0));
    const idx =
      p <= DIVE_END
        ? Math.floor((p / (DIVE_END || 1)) * (FRAME_COUNT - 1))
        : FRAME_COUNT - 1;
    const ok = paintFrame(idx);
    if (ok) {
      section.classList.add('is-active');
      setWaterFallChrome(true);
      hideBridge();
      return;
    }
    /* Frames not ready: keep showing dismantle only — never a second meter */
    section.classList.remove('is-active');
    hideBridge();
    canvas.classList.remove('is-ready');
    showDismantleMeter();
  }

  function setCallouts(progress01) {
    if (!calloutsRoot) return;
    const show = progress01 > 0.02;
    calloutsRoot.classList.toggle('is-visible', show);
    calloutsRoot.setAttribute('aria-hidden', show ? 'false' : 'true');

    if (heading) {
      heading.classList.toggle('is-in', progress01 > 0.08);
      heading.setAttribute('aria-hidden', progress01 > 0.08 ? 'false' : 'true');
    }

    calloutEls.forEach((el, i) => {
      const threshold = 0.18 + i * 0.16;
      const on = progress01 >= threshold;
      el.classList.toggle('is-in', on);
    });
  }

  function applyProgress(p) {
    lastProgress = Math.max(0, Math.min(1, p || 0));

    if (lastProgress <= DIVE_END) {
      const local = DIVE_END <= 0 ? 0 : lastProgress / DIVE_END;
      const idx = Math.floor(local * (FRAME_COUNT - 1));
      const ok = paintFrame(idx);
      if (!ok) {
        hideBridge();
        canvas.classList.remove('is-ready');
        showDismantleMeter();
      }
      setCallouts(0);
      return;
    }

    const ok = paintFrame(FRAME_COUNT - 1);
    if (!ok) {
      hideBridge();
      canvas.classList.remove('is-ready');
      showDismantleMeter();
      setCallouts(0);
      return;
    }
    const reveal = (lastProgress - DIVE_END) / (1 - DIVE_END);
    setCallouts(reveal);
  }

  function loadFrame(i) {
    return new Promise((resolve) => {
      if (ready[i] && frames[i]) {
        resolve(frames[i]);
        return;
      }
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        frames[i] = img;
        ready[i] = true;
        /* Only draw once water pin is active — never overlay dismantle early */
        if (waterST && waterST.isActive) {
          applyProgress(lastProgress || waterST.progress);
        }
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = frameUrl(i);
    });
  }

  function preloadFrames() {
    const early = [];
    for (let i = 0; i < Math.min(EARLY_BATCH, FRAME_COUNT); i++) {
      early.push(loadFrame(i));
    }
    Promise.all(early).then(() => {
      let i = EARLY_BATCH;
      const pump = () => {
        if (i >= FRAME_COUNT) return;
        const batch = [];
        const end = Math.min(i + 4, FRAME_COUNT);
        for (; i < end; i++) batch.push(loadFrame(i));
        Promise.all(batch).then(() => {
          if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(pump, { timeout: 400 });
          } else {
            setTimeout(pump, 16);
          }
        });
      };
      pump();
    });
  }

  function createWaterTrigger() {
    if (waterST) {
      waterST.kill(true);
      waterST = null;
    }

    const isPhone = () => window.matchMedia('(max-width:768px)').matches;

    const endDist = () => {
      const vh = window.innerHeight || 800;
      return '+=' + Math.round(PIN_VH * vh);
    };

    /*
     * CRITICAL: trigger the PIN element with pin:true (same as dismantle /
     * legacy water-testing). Pinning an inner node while triggering the
     * outer section lets the navy block scroll in as normal document flow
     * (“slide up from below”) after dismantle unpins.
     */
    waterST = ScrollTrigger.create({
      id: 'water-dive',
      trigger: pin,
      pin: true,
      pinSpacing: true,
      pinType: 'fixed',
      scrub: isPhone() ? 0.2 : 0.35,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      start: () => {
        const outgoing = ScrollTrigger.getById('dismantle-story');
        if (!outgoing) return 'top top';
        return outgoing.end;
      },
      end: endDist,
      onRefresh: (self) => {
        sizeCanvas();
        if (self.isActive) applyProgress(self.progress);
      },
      onUpdate: (self) => {
        applyProgress(self.progress);
      },
      onEnter: () => {
        beginHandoff(waterST ? waterST.progress : 0);
      },
      onEnterBack: () => {
        beginHandoff(waterST ? waterST.progress : 1);
      },
      onLeave: () => {
        section.classList.add('is-active');
        applyProgress(1);
      },
      onLeaveBack: () => {
        section.classList.remove('is-active');
        setWaterFallChrome(false);
        setCallouts(0);
        canvas.classList.remove('is-ready');
        hideBridge();
        showDismantleMeter();
        hasPainted = false;
        lastDrawn = -1;
        lastDrawnImg = null;
      }
    });

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    return waterST;
  }

  function tryBindWater() {
    const st = ScrollTrigger.getById('dismantle-story');
    if (!st) return false;
    if (waterST && ScrollTrigger.getById('water-dive')) return true;
    createWaterTrigger();
    return true;
  }

  function waitForDismantleThenBind() {
    tryBindWater();

    /* Dismantle ST is created lazily after frame preload — keep waiting */
    const tick = () => {
      if (tryBindWater()) return;
      setTimeout(tick, 80);
    };
    setTimeout(tick, 80);

    window.addEventListener('telaqua:dismantle-handoff', () => {
      tryBindWater();
      beginHandoff(waterST ? waterST.progress : 0);
    });

    ScrollTrigger.addEventListener('refresh', () => {
      if (!ScrollTrigger.getById('water-dive') && ScrollTrigger.getById('dismantle-story')) {
        waterST = null;
        tryBindWater();
      }
    });
  }

  function onResize() {
    sizeCanvas();
    if (hasPainted) {
      lastDrawn = -1;
      lastDrawnImg = null;
      applyProgress(lastProgress);
    }
    if (waterST) ScrollTrigger.refresh();
  }

  /*
   * Preload after window load + idle (not during first paint), so the hero,
   * GTM and the Meta Pixel PageView get the network first on mobile data.
   */
  hideBridge();
  (function schedulePreload() {
    const start = () => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(preloadFrames, { timeout: 2500 });
      else setTimeout(preloadFrames, 1200);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
  })();
  sizeCanvas();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDismantleThenBind, { once: true });
  } else {
    waitForDismantleThenBind();
  }

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  if (typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(() => onResize());
    resizeObs.observe(pin);
  }
})();
