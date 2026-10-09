/**
 * Tel-Aqua — Scroll-driven dismantle / reassembly
 *
 * Continuous PNG scrub (shared whole sequence):
 *   assets/images/recenthighqualityimages/ (frame_023 … 109)
 *
 * After assemble completes, hand off to water dipping scrub
 * (water-dive, frames 111 … 141 from the same folder).
 * Does NOT load a 3D without-cap fall.
 *
 * Transparent PNG sequence. One canvas. Scroll progress → frame index (scrub).
 * No autoplay.
 *
 * Flicker-safe: never clear the canvas unless a new frame will be drawn;
 * never reset canvas size unless dimensions actually change.
 */
(function () {
  'use strict';

  const DISMANTLE_START = 23;
  const DISMANTLE_END = 109;
  const FRAME_DIR = 'assets/images/recenthighqualityimages/';
  const FRAME_SUFFIX = '_delay-0.083s.webp'; /* WebP: ~15x smaller than the PNG masters */

  const FRAME_URLS = Array.from(
    { length: DISMANTLE_END - DISMANTLE_START + 1 },
    (_, i) =>
      `${FRAME_DIR}frame_${String(DISMANTLE_START + i).padStart(3, '0')}${FRAME_SUFFIX}`
  );

  const FRAME_COUNT = FRAME_URLS.length;
  const DISMANTLE_COUNT = FRAME_COUNT;
  const LAST_DISMANTLE = DISMANTLE_COUNT - 1; /* frame 109 */
  const LAST_FRAME = LAST_DISMANTLE;

  /*
   * No 3D↔frame crossfade. After product-story finishes the horizontal meter,
   * dismantle pin owns the view: hide 3D immediately and scrub from frame 0.
   */
  const METER_FINAL_FILL = 0.62;
  /* Fallback when live TelAquaMeterHandoff is unavailable */
  const METER_FINAL_SCALE = 1.38;

  /** Pause frame for pointer callouts — peak separation in new sequence */
  const FREEZE_FRAME_NUM = 65;
  const EXPLODE_PEAK = FREEZE_FRAME_NUM - DISMANTLE_START; /* index 42 */
  /**
   * From this absolute frame number, art has a baked background — switch from
   * meter-sized contain layout to full-viewport cover (seamless into water-dive).
   */
  const COVER_FROM_FRAME_NUM = 93;
  /*
   * Scroll fractions (progress-driven — reverses cleanly on scroll-back):
   *   0 → DISMANTLE_END        dismantle frames, no callouts
   *   DISMANTLE_END → POINTER_END   freeze at peak; callouts stagger in
   *   POINTER_END → 1.0        frames advance (reassemble) while callouts
   *                            stagger out concurrently, then pointer-free tail
   */
  const PHASE_DISMANTLE_END = 0.36;
  const PHASE_POINTER_END = 0.62;
  const ASSEMBLE_END = 1.0;
  /* Pointer exit completes within this fraction of the concurrent reassembly span */
  const CONCURRENT_EXIT_SPAN = 0.5;

  const DEBUG_PRODUCT = false;

  /*
   * Opaque product bounds in frame 023 (1280×720 PNG, RGBA).
   * Scaled 1.6× from prior 800×450 assembled-meter measurement.
   */
  const FIRST_PRODUCT = {
    x: 312,
    y: 245,
    width: 666,
    height: 154
  };

  /*
   * Callout reveal order (right → left): battery first, then cascade to cap.
   * Timing is scroll-progress based (not per-frame) so cards never appear
   * mid-dismantle or mid-reassemble.
   */
  const CARD_REVEAL_ORDER = [4, 3, 2, 1, 0];
  const CARD_COUNT = CARD_REVEAL_ORDER.length;
  const HEADING_OUT_START = EXPLODE_PEAK + 1;
  const HEADING_OUT_END = EXPLODE_PEAK + 6;

  /* Product-part X in frame — dots, lines, icons, cards share this vertical axis */
  const COMPONENT_FRAME_X = [0.16, 0.32, 0.50, 0.66, 0.84];

  const HEADING_IN = 0.02;
  const HEADING_PEAK = 0.12;

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  /**
   * Map scroll sequence progress → WebP frame.
   * Freeze only while callouts appear; resume reassembly when they begin exiting.
   */
  function frameFromSequenceProgress(sequenceProgress) {
    const p = clamp01(sequenceProgress);
    if (p <= PHASE_DISMANTLE_END) {
      const t = PHASE_DISMANTLE_END <= 0 ? 1 : p / PHASE_DISMANTLE_END;
      return Math.round(t * EXPLODE_PEAK);
    }
    /* Frozen at full separation while pointers stagger in */
    if (p <= PHASE_POINTER_END) {
      return EXPLODE_PEAK;
    }
    /* Reassembly runs concurrently with pointer exit */
    const t = (p - PHASE_POINTER_END) / Math.max(ASSEMBLE_END - PHASE_POINTER_END, 1e-6);
    return Math.min(
      LAST_DISMANTLE,
      EXPLODE_PEAK + Math.round(t * (LAST_DISMANTLE - EXPLODE_PEAK))
    );
  }

  function easeOutCubic(t) {
    const x = clamp01(t);
    return 1 - Math.pow(1 - x, 3);
  }

  function easeOutBack(t) {
    const x = clamp01(t);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function headingOpacity(p, frameIndex) {
    if (frameIndex >= HEADING_OUT_START) {
      return clamp01(1 - (frameIndex - HEADING_OUT_START) / (HEADING_OUT_END - HEADING_OUT_START));
    }
    if (p < HEADING_IN) return 0;
    if (p < HEADING_PEAK) return easeOutCubic((p - HEADING_IN) / (HEADING_PEAK - HEADING_IN));
    return 1;
  }

  /**
   * Callouts: hidden during dismantle → stagger in (frame frozen) → stagger out
   * while reassembly frames advance → none for remainder of reassembly.
   */
  function cardVisibility(frameIndex, cardIndex, sequenceProgress) {
    const p = clamp01(sequenceProgress);
    const orderPos = CARD_REVEAL_ORDER.indexOf(cardIndex);
    const rank = orderPos < 0 ? cardIndex : orderPos;

    /* Dismantle — no callouts */
    if (p < PHASE_DISMANTLE_END) return { t: 0, phase: 'in' };

    /* Frozen peak — stagger reveal right → left (battery first) */
    if (p < PHASE_POINTER_END) {
      const revealWindow = Math.max(1e-6, PHASE_POINTER_END - PHASE_DISMANTLE_END);
      const slot = revealWindow / CARD_COUNT;
      const rise = slot * 0.75;
      const cardStart = PHASE_DISMANTLE_END + rank * slot;
      if (p < cardStart) return { t: 0, phase: 'in' };
      if (p < cardStart + rise) {
        return {
          t: (p - cardStart) / Math.max(rise, 1e-6),
          phase: 'in'
        };
      }
      return { t: 1, phase: 'hold' };
    }

    /* Concurrent reassembly + staggered exit (battery leaves first) */
    const concurrentLen = Math.max(1e-6, ASSEMBLE_END - PHASE_POINTER_END);
    const exitLen = concurrentLen * CONCURRENT_EXIT_SPAN;
    const localP = p - PHASE_POINTER_END;

    if (localP >= exitLen) return { t: 0, phase: 'out' };

    const exitT = localP / exitLen;
    const slot = 1 / CARD_COUNT;
    const fall = slot * 0.72;
    const exitStart = rank * slot;

    if (exitT < exitStart) return { t: 1, phase: 'hold' };
    if (exitT < exitStart + fall) {
      return {
        t: 1 - (exitT - exitStart) / Math.max(fall, 1e-6),
        phase: 'out'
      };
    }
    return { t: 0, phase: 'out' };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        /* Decode before first draw to avoid mid-scroll decode hitch/flicker */
        if (img.decode) {
          img.decode().then(() => resolve(img)).catch(() => resolve(img));
        } else {
          resolve(img);
        }
      };
      img.onerror = () => reject(new Error('Failed: ' + src));
      img.src = src;
    });
  }

  async function preloadFrames() {
    const out = new Array(FRAME_COUNT);
    let i = 0;
    const workers = 6;

    async function run() {
      while (i < FRAME_COUNT) {
        const idx = i++;
        out[idx] = await loadImage(FRAME_URLS[idx]);
      }
    }

    await Promise.all(Array.from({ length: Math.min(workers, FRAME_COUNT) }, run));
    return out;
  }

  /** Resolve when any target enters an expanded viewport (lead time for preload). */
  function whenNear(targets, options) {
    return new Promise((resolve) => {
      const els = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
      if (!els.length) {
        resolve();
        return;
      }
      if (typeof IntersectionObserver === 'undefined') {
        resolve();
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        io.disconnect();
        resolve();
      };
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) finish();
      }, options);
      els.forEach((el) => io.observe(el));
    });
  }

  function refreshScroll() {
    requestAnimationFrame(() => {
      if (window.TelaquaSmoothScroll?.refresh) window.TelaquaSmoothScroll.refresh();
      else if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    });
  }

  function waitForProductStory(cb) {
    const get = () =>
      typeof ScrollTrigger !== 'undefined'
        ? ScrollTrigger.getById('product-story')
        : null;

    if (get()) {
      cb(get());
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(fail);
      cb(get());
    };

    const poll = setInterval(() => {
      if (get()) finish();
    }, 120);
    const fail = setTimeout(finish, 20000);
    window.addEventListener('telaqua:product-story-ready', finish, { once: true });
  }

  function init() {
    const section = document.querySelector('.dismantle-story');
    const pin = section?.querySelector('.dismantle-story-pin');
    const canvas = section?.querySelector('.dismantle-story-canvas');
    const heading = section?.querySelector('.dismantle-heading');
    const calloutsRoot = section?.querySelector('.dismantle-callouts');
    const cards = calloutsRoot
      ? Array.from(calloutsRoot.querySelectorAll('.dismantle-card'))
      : [];
    if (!section || !pin || !canvas) return;

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[dismantle] GSAP ScrollTrigger required');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      console.error('[dismantle] 2D canvas context unavailable');
      return;
    }

    /*
     * Visible product layer: an <img> is more reliable than a desync/offscreen
     * canvas for scroll-scrubbed WebP sequences. Canvas is kept for sizing math.
     */
    let frameImg = pin.querySelector('.dismantle-story-frame');
    if (!frameImg) {
      frameImg = document.createElement('img');
      frameImg.className = 'dismantle-story-frame';
      frameImg.alt = '';
      frameImg.decoding = 'async';
      frameImg.draggable = false;
      frameImg.setAttribute('aria-hidden', 'true');
      canvas.insertAdjacentElement('afterend', frameImg);
    }

    let frames = [];
    let frameW = 1280;
    let frameH = 720;
    let currentIndex = -1;
    let lastUiKey = '';
    let trigger = null;
    let cssW = 0;
    let cssH = 0;
    let dprUsed = 0;
    let drawW = 0;
    let drawH = 0;
    let drawX = 0;
    let drawY = 0;
    let resizeTimer = 0;
    let productStage = null;

    if (heading) gsap.set(heading, { autoAlpha:0, y:18 });
    cards.forEach((card) => {
      const line = card.querySelector('.dismantle-card-line');
      const dot = card.querySelector('.dismantle-card-dot');
      const icon = card.querySelector('.dismantle-card-icon-wrap');
      const body = card.querySelector('.dismantle-card-body');
      gsap.set(card, { autoAlpha:0, y:24, xPercent:-50, filter:'blur(0px)' });
      if (line) gsap.set(line, { autoAlpha:0, scaleY:0, rotation:0, transformOrigin:'50% 0%' });
      if (dot) gsap.set(dot, { x:0, scale:0, autoAlpha:0 });
      if (icon) gsap.set(icon, { autoAlpha:0, y:8, scale:0.9 });
      if (body) gsap.set(body, { autoAlpha:0, y:16 });
    });

    /**
     * Place each annotation on a shared vertical axis under its product part.
     * Enforce equal card gaps so columns never overlap (reference layout).
     * Mobile uses the same tip → column math with tighter card widths.
     */
    function syncCardAnchors() {
      if (!cssW || drawW <= 0) return;
      const n = cards.length;
      if (n < 1) return;

      const isMobile = window.matchMedia('(max-width:768px)').matches;
      const measured = cards[0].offsetWidth || 0;
      const cardW = isMobile
        ? Math.min(62, Math.max(56, Math.floor((cssW - 24) / n - 2)))
        : (measured || 140);
      /* Mobile: tighter gaps so all five cards fit without edge crop */
      const minGap = isMobile ? cardW + 2 : cardW + 18;
      const tips = COMPONENT_FRAME_X.map((frac) => drawX + (frac ?? 0.5) * drawW);

      /* Start from product tips, then push apart to a clean equal rhythm */
      let xs = tips.slice();
      for (let pass = 0; pass < 10; pass++) {
        for (let i = 1; i < n; i++) {
          const gap = xs[i] - xs[i - 1];
          if (gap < minGap) {
            const mid = (xs[i] + xs[i - 1]) * 0.5;
            xs[i - 1] = mid - minGap * 0.5;
            xs[i] = mid + minGap * 0.5;
          }
        }
      }

      /* Re-center the group on the product band so it stays balanced */
      const tipMid = (tips[0] + tips[n - 1]) * 0.5;
      const colMid = (xs[0] + xs[n - 1]) * 0.5;
      const shift = tipMid - colMid;
      for (let i = 0; i < n; i++) xs[i] += shift;

      const pad = cardW * (isMobile ? 0.5 : 0.55) + (isMobile ? 6 : 0);
      const minX = pad;
      const maxX = cssW - pad;
      if (xs[0] < minX) {
        const d = minX - xs[0];
        for (let i = 0; i < n; i++) xs[i] += d;
      }
      if (xs[n - 1] > maxX) {
        const d = xs[n - 1] - maxX;
        for (let i = 0; i < n; i++) xs[i] -= d;
      }

      /* Equalize gaps after clamping for a premium even baseline */
      if (n > 1) {
        const span = xs[n - 1] - xs[0];
        const step = span / (n - 1);
        const start = xs[0];
        for (let i = 0; i < n; i++) xs[i] = start + step * i;
      }

      /*
       * Mobile: bias columns back toward real product tips so dotted stems
       * point at the correct exploded part (still non-overlapping).
       */
      if (isMobile) {
        for (let i = 0; i < n; i++) {
          xs[i] = xs[i] * 0.4 + tips[i] * 0.6;
        }
        for (let pass = 0; pass < 8; pass++) {
          for (let i = 1; i < n; i++) {
            if (xs[i] - xs[i - 1] < minGap) {
              const mid = (xs[i] + xs[i - 1]) * 0.5;
              xs[i - 1] = mid - minGap * 0.5;
              xs[i] = mid + minGap * 0.5;
            }
          }
        }
        if (xs[0] < minX) {
          const d = minX - xs[0];
          for (let i = 0; i < n; i++) xs[i] += d;
        }
        if (xs[n - 1] > maxX) {
          const d = xs[n - 1] - maxX;
          for (let i = 0; i < n; i++) xs[i] -= d;
        }
      }

      const lineH = isMobile
        ? 38
        : (window.matchMedia('(max-width:1100px)').matches ? 48 : 68);

      /*
       * Mobile: park the callout stack just under the drawn product so the
       * orange dots sit close to the meter. Desktop keeps CSS bottom.
       */
      let mobileBottomPx = null;
      if (isMobile && cssH > 0 && drawH > 0) {
        const scaleY = drawH / Math.max(1, frameH);
        const productBottom = drawY + (FIRST_PRODUCT.y + FIRST_PRODUCT.height) * scaleY;
        const stackH = lineH + 8 + 74; /* longer stem + equal-height card body */
        const safeBottom = 16;
        /* Dot sits ~stackH above card bottom edge; leave a small air gap under product */
        const desiredCardBottom = cssH - (productBottom + 8 + stackH);
        mobileBottomPx = Math.max(safeBottom, Math.min(desiredCardBottom, cssH * 0.4));
      }

      cards.forEach((card, i) => {
        const pct = Math.max(4, Math.min(96, (xs[i] / cssW) * 100));
        card.style.setProperty('--anchor', pct.toFixed(2) + '%');
        card.style.setProperty('--line-h', lineH + 'px');
        if (mobileBottomPx != null) {
          card.style.setProperty('--card-bottom', mobileBottomPx.toFixed(1) + 'px');
        } else {
          card.style.removeProperty('--card-bottom');
        }
      });
    }

    /**
     * Pure counterpart of the Product & Benefits --ps-circle CSS.
     * It depends only on the current pin dimensions, never on the preceding
     * section's live/fixed DOM state, so forward and reverse scroll agree.
     */
    function settledStageSize(w, h) {
      const vmin = Math.min(w, h);
      if (w <= 768) return Math.max(1, Math.min(vmin * 0.56, h - 140, 380));
      if (w <= 900) return Math.max(1, Math.min(vmin * 0.78, h - 56, 640));
      return Math.max(1, Math.min(vmin * 0.9, h - 36, 920));
    }

    /**
     * Last good 3D→PNG handoff. Live TelAquaMeterHandoff can go stale once the
     * WebGL stage is hidden; keep a snapshot so frame 0 stays locked to the
     * horizontal meter’s screen position through the whole dismantle pin.
     */
    let lockedHandoff = null;

    function isPhoneViewport() {
      return window.matchMedia('(max-width:768px)').matches;
    }

    function readAnchorYPct() {
      const el =
        document.querySelector('.product-cinematic') ||
        document.querySelector('.product-dismantle-region') ||
        document.documentElement;
      const raw = getComputedStyle(el).getPropertyValue('--ps-anchor-y').trim();
      const n = parseFloat(raw);
      /* Product Feature stages at ~46%, not true mid-screen */
      return Number.isFinite(n) ? n / 100 : 0.46;
    }

    function snapshotHandoff(src) {
      if (!src || !(src.width > 24)) return null;
      const hasLocal =
        Number.isFinite(src.localX) &&
        Number.isFinite(src.localY) &&
        src.pinW > 2 &&
        src.pinH > 2;
      const hasViewport =
        Number.isFinite(src.centerX) && Number.isFinite(src.centerY);
      if (!hasLocal && !hasViewport) return null;
      return {
        ready: true,
        width: src.width,
        height: src.height > 4 ? src.height : null,
        centerX: src.centerX,
        centerY: src.centerY,
        localX: hasLocal ? src.localX : null,
        localY: hasLocal ? src.localY : null,
        pinW: hasLocal ? src.pinW : null,
        pinH: hasLocal ? src.pinH : null
      };
    }

    function captureHandoffSnapshot() {
      const live = typeof window !== 'undefined' ? window.TelAquaMeterHandoff : null;
      const frozen =
        typeof window !== 'undefined' ? window.TelAquaMeterHandoffLocked : null;
      const snap =
        snapshotHandoff(live && live.ready ? live : null) ||
        snapshotHandoff(frozen && frozen.ready ? frozen : null);
      if (snap) lockedHandoff = snap;
      return lockedHandoff;
    }

    /**
     * Pin-local center + target meter size for FIRST_PRODUCT alignment.
     * Prefer live/locked 3D handoff; else --ps-anchor-y on desktop; 50% on mobile.
     */
    function resolveProductLayout(w, h) {
      captureHandoffSnapshot();
      const handoff = lockedHandoff;

      if (handoff) {
        let cx;
        let cy;
        if (
          Number.isFinite(handoff.localX) &&
          Number.isFinite(handoff.localY) &&
          handoff.pinW > 2 &&
          handoff.pinH > 2
        ) {
          /* Scale pin-local handoff into the current dismantle pin */
          cx = (handoff.localX / handoff.pinW) * w;
          cy = (handoff.localY / handoff.pinH) * h;
        } else {
          const pinRect = pin.getBoundingClientRect();
          cx = handoff.centerX - pinRect.left;
          cy = handoff.centerY - pinRect.top;
        }
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
          cx = w * 0.5;
          cy = h * readAnchorYPct();
        }
        return {
          x: cx,
          y: cy,
          width: handoff.width,
          height: handoff.height
        };
      }

      /*
       * Mobile omits Product Feature 3D — keep prior true-center framing.
       * Desktop without a live handoff: match --ps-anchor-y (same as 3D stage).
       */
      if (
        isPhoneViewport() ||
        document.documentElement.classList.contains('is-mobile-no-product-story')
      ) {
        return { x: w * 0.5, y: h * 0.5, width: null, height: null };
      }

      return { x: w * 0.5, y: h * readAnchorYPct(), width: null, height: null };
    }

    /** Hide circle+watermark in place — no top/transform animation */
    function setWaterFallChrome(on) {
      const cinematic = document.querySelector('.product-cinematic');
      const region = document.querySelector('.product-dismantle-region');
      const bg = document.querySelector('.product-dismantle-bg');
      if (cinematic) cinematic.classList.toggle('is-water-fall', !!on);
      if (region) region.classList.toggle('is-water-fall', !!on);
      if (bg) bg.classList.toggle('is-water-fall', !!on);
    }

    function computeDrawRect(w, h) {
      const frameNum = DISMANTLE_START + Math.max(0, currentIndex);
      const useCover = frameNum >= COVER_FROM_FRAME_NUM;

      if (useCover) {
        const coverScale = Math.max(w / frameW, h / frameH);
        drawW = frameW * coverScale;
        drawH = frameH * coverScale;
        drawX = (w - drawW) * 0.5;
        drawY = (h - drawH) * 0.5;
        syncCardAnchors();
        if (typeof window !== 'undefined') {
          window.TelAquaDismantle = window.TelAquaDismantle || {};
          window.TelAquaDismantle.layout = {
            drawX,
            drawY,
            drawW,
            drawH,
            frameW,
            frameH,
            cover: true,
            centerX: w * 0.5,
            centerY: h * 0.5,
            src: frameImg?.currentSrc || frameImg?.src || ''
          };
        }
        return;
      }

      const layout = resolveProductLayout(w, h);
      const center = { x: layout.x, y: layout.y };
      /*
       * Match on-screen meter length (and height when available) to the
       * horizontal 3D handoff so frame 0 sits on the same pixels.
       */
      const stageSize = settledStageSize(w, h);
      const containScale = Math.min(w / frameW, h / frameH);
      let targetProductWidth = stageSize * METER_FINAL_FILL * METER_FINAL_SCALE;
      if (layout.width > 24) {
        targetProductWidth = layout.width;
      }
      let productScale = targetProductWidth / Math.max(1, FIRST_PRODUCT.width);
      /* Prefer width; nudge if handoff height is clearly off vs scaled PNG */
      if (layout.height > 4) {
        const heightScale = layout.height / Math.max(1, FIRST_PRODUCT.height);
        if (heightScale > 0.5 && heightScale < 2.5) {
          productScale = (productScale * 0.85) + (heightScale * 0.15);
        }
      }
      const scale = Math.min(productScale, containScale * 1.65);

      drawW = frameW * scale;
      drawH = frameH * scale;
      drawX = center.x - (FIRST_PRODUCT.x + FIRST_PRODUCT.width * 0.5) * scale;
      drawY = center.y - (FIRST_PRODUCT.y + FIRST_PRODUCT.height * 0.5) * scale;

      if (!isFinite(drawW) || !isFinite(drawH) || drawW < 2 || drawH < 2) {
        const s = containScale;
        drawW = frameW * s;
        drawH = frameH * s;
        drawX = (w - drawW) * 0.5;
        drawY = h * readAnchorYPct() - drawH * 0.5;
      }

      syncCardAnchors();
      if (typeof window !== 'undefined') {
        window.TelAquaDismantle = window.TelAquaDismantle || {};
        window.TelAquaDismantle.layout = {
          drawX,
          drawY,
          drawW,
          drawH,
          frameW,
          frameH,
          cover: false,
          centerX: center.x,
          centerY: center.y,
          src: frameImg?.currentSrc || frameImg?.src || ''
        };
      }
    }

    /** Resize only when size actually changes (resetting width clears the bitmap = flicker). */
    function sizeCanvas(forceRedraw) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(pin.clientWidth || window.innerWidth));
      const h = Math.max(1, Math.floor(pin.clientHeight || window.innerHeight));

      if (w === cssW && h === cssH && dpr === dprUsed) {
        computeDrawRect(w, h);
        if (forceRedraw || currentIndex >= 0) {
          drawFrame(currentIndex < 0 ? 0 : currentIndex, true);
        }
        return;
      }

      cssW = w;
      cssH = h;
      dprUsed = dpr;
      computeDrawRect(w, h);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      drawFrame(currentIndex < 0 ? 0 : currentIndex, true);
    }

    function setCanvasVisible(on, opacity) {
      const o = on ? Math.max(opacity == null ? 1 : opacity, 0) : 0;
      /* Img is always the reliable visible layer; canvas mirrors on top when it paints */
      frameImg.style.opacity = String(o);
      frameImg.style.visibility = o > 0.001 ? 'visible' : 'hidden';
      canvas.style.opacity = String(o);
      canvas.style.visibility = o > 0.001 ? 'visible' : 'hidden';
      frameImg.classList.toggle('is-product-visible', o > 0.001);
      frameImg.classList.toggle('is-product-solid', o >= 0.999);
      canvas.classList.toggle('is-product-visible', o > 0.001);
      canvas.classList.toggle('is-product-solid', o >= 0.999);
    }

    function logProductDebug(frameIndex) {
      if (!DEBUG_PRODUCT) return;
      const cs = window.getComputedStyle(frameImg);
      console.log('[dismantle:product]', {
        frame: frameIndex,
        currentIndex,
        src: frameImg.currentSrc || frameImg.src,
        opacity: frameImg.style.opacity,
        computedOpacity: cs.opacity,
        visibility: cs.visibility,
        zIndex: cs.zIndex,
        naturalWidth: frameImg.naturalWidth,
        display: cs.display,
        drawX,
        drawY,
        drawW,
        drawH,
        framesLoaded: frames.length
      });
    }

    function drawFrame(index, force) {
      if (!frames.length) return;

      const i = Math.max(0, Math.min(frames.length - 1, index | 0));
      if (!force && i === currentIndex) return;

      const img = frames[i];
      if (!img || !img.complete || img.naturalWidth < 1) return;

      currentIndex = i;

      const w = cssW || canvas.clientWidth || pin.clientWidth || window.innerWidth || 1;
      const h = cssH || canvas.clientHeight || pin.clientHeight || window.innerHeight || 1;

      if (!cssW || !cssH) {
        cssW = w;
        cssH = h;
      }

      computeDrawRect(w, h);
      /* Keep circle+watermark through dismantle — 3D fall owns chrome later */
      const frameNum = DISMANTLE_START + i;
      const useCover = frameNum >= COVER_FROM_FRAME_NUM;
      setWaterFallChrome(useCover);
      frameImg.classList.toggle('is-cover-fall', useCover);
      canvas.classList.toggle('is-cover-fall', useCover);
      pin.classList.toggle('is-cover-fall', useCover);
      if (useCover) {
        pin.style.background = '#f0f0f3';
      } else {
        pin.style.background = '';
      }

      /* Primary visible layer — preloaded Image, no canvas present issues */
      frameImg.src = img.src || FRAME_URLS[i];
      if (drawW > 1 && drawH > 1 && isFinite(drawX) && isFinite(drawY)) {
        frameImg.style.width = Math.round(drawW) + 'px';
        frameImg.style.height = Math.round(drawH) + 'px';
        frameImg.style.transform =
          'translate3d(' + Math.round(drawX) + 'px,' + Math.round(drawY) + 'px,0)';
      } else {
        const s = useCover
          ? Math.max(w / frameW, h / frameH)
          : Math.min(w / frameW, h / frameH);
        const dw = frameW * s;
        const dh = frameH * s;
        frameImg.style.width = Math.round(dw) + 'px';
        frameImg.style.height = Math.round(dh) + 'px';
        frameImg.style.transform =
          'translate3d(' +
          Math.round((w - dw) * 0.5) +
          'px,' +
          Math.round((h - dh) * 0.5) +
          'px,0)';
      }

      /*
       * Skip canvas mirror on phones — <img> is the visible layer.
       * Desktop keeps a light backup draw for debugging / fallback.
       */
      if (window.matchMedia('(max-width:768px)').matches) return;

      const dpr = dprUsed || Math.min(window.devicePixelRatio || 1, 1.5);
      if (canvas.width > 0 && canvas.height > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        try {
          if (drawW > 1 && drawH > 1) ctx.drawImage(img, drawX, drawY, drawW, drawH);
        } catch (_) { /* ignore */ }
      }
    }

    function applyChrome(sequenceProgress, frameIndex) {
      const p = clamp01(sequenceProgress);
      const frame = Math.max(0, frameIndex | 0);
      const hO = headingOpacity(p, frame);
      const isMobile = window.matchMedia('(max-width:768px)').matches;
      const syncExit = p >= PHASE_POINTER_END;

      /*
       * Mobile + desktop: keep every revealed callout visible together.
       * (Previously mobile solo-mode hid all but the newest card.)
       */
      const cardStates = cards.map((_, i) => {
        const vis = cardVisibility(frame, i, p);
        let raw = vis.t;
        const phase = vis.phase;

        if (phase === 'out') {
          /*
           * Group exit: each card, icon and connector moves together. The
           * per-card raw value carries the small right-to-left stagger.
           */
          const group = raw * raw * (3 - 2 * raw);
          return {
            raw,
            phase,
            card: group,
            icon: group,
            line: group,
            dot: group,
            out: true
          };
        }

        /* Enter: dot → line grows down → card (with icon inside) */
        return {
          raw,
          phase,
          dot: easeOutCubic(clamp01(raw / 0.26)),
          line: easeOutCubic(clamp01((raw - 0.16) / 0.32)),
          icon: easeOutBack(clamp01((raw - 0.38) / 0.28)),
          card: easeOutCubic(clamp01((raw - 0.52) / 0.48)),
          out: false
        };
      });

      const key =
        frame +
        '|' +
        p.toFixed(3) +
        '|' +
        (isMobile ? 'm' : 'd') +
        '|' +
        hO.toFixed(2) +
        '|' +
        cardStates.map((s) => s.card.toFixed(2) + s.line.toFixed(2) + (s.out ? 'o' : 'i')).join(',');
      if (key === lastUiKey) return;
      lastUiKey = key;

      if (heading) {
        gsap.set(heading, {
          autoAlpha: hO,
          y: (1 - hO) * 18,
          force3D: true
        });
        heading.setAttribute('aria-hidden', hO > 0.02 ? 'false' : 'true');
      }

      if (calloutsRoot) {
        const any = cardStates.some((s) => s.card > 0.02 || s.dot > 0.02 || s.line > 0.02);
        calloutsRoot.setAttribute('aria-hidden', any ? 'false' : 'true');
        calloutsRoot.classList.remove('is-mobile-solo');
        calloutsRoot.classList.toggle('is-sync-exit', syncExit);
      }

      cards.forEach((card, i) => {
        const s = cardStates[i];
        const line = card.querySelector('.dismantle-card-line');
        const dot = card.querySelector('.dismantle-card-dot');
        const icon = card.querySelector('.dismantle-card-icon-wrap');
        const body = card.querySelector('.dismantle-card-body');
        const visible = s.line > 0.01 || s.dot > 0.01 || s.card > 0.01 || s.icon > 0.01;
        const yOut = 26;
        const yIn = 20;
        const blur = s.out ? (1 - s.card) * 4 : 0;

        gsap.set(card, {
          autoAlpha: visible ? 1 : 0,
          y: s.out ? (1 - s.card) * yOut : (1 - s.card) * yIn,
          xPercent: -50,
          filter: blur > 0.2 ? 'blur(' + blur.toFixed(1) + 'px)' : 'blur(0px)',
          force3D: true
        });

        if (line) {
          /* Retract upward into the orange dot (origin at top / product side) */
          gsap.set(line, {
            autoAlpha: s.line,
            scaleY: s.line,
            rotation: 0,
            transformOrigin: '50% 0%',
            force3D: true
          });
        }
        if (dot) {
          gsap.set(dot, {
            x: 0,
            scale: 0.4 + 0.6 * s.dot,
            autoAlpha: s.dot,
            force3D: true
          });
        }
        if (icon) {
          /* Icon lives inside the card — keep it visible with the body, scale for polish */
          gsap.set(icon, {
            autoAlpha: Math.max(s.icon, s.card) > 0.02 ? 1 : 0,
            y: (1 - s.icon) * (s.out ? 8 : 6),
            scale: s.out ? (0.88 + 0.12 * s.icon) : (0.9 + 0.1 * s.icon),
            force3D: true
          });
        }
        if (body) {
          const bodyAlpha = Math.max(s.icon, s.card);
          gsap.set(body, {
            autoAlpha: bodyAlpha,
            y: (1 - bodyAlpha) * (s.out ? 12 : 12),
            force3D: true
          });
        }

        card.classList.toggle('is-active-callout', visible && s.card > 0.2);
        card.classList.toggle('is-exiting', !!s.out && s.raw < 0.98 && s.raw > 0.02);
      });
    }

    function hideProductStage() {
      if (productStage) {
        productStage.classList.remove('is-handoff-fixed');
        productStage.style.opacity = '0';
        productStage.style.visibility = 'hidden';
      }
      const canvasHost = document.getElementById('product-model-canvas');
      if (canvasHost) {
        canvasHost.style.opacity = '0';
        canvasHost.style.visibility = 'hidden';
      }
    }

    function showProductStage() {
      if (productStage) {
        productStage.classList.remove('is-handoff-fixed');
        productStage.style.opacity = '';
        productStage.style.visibility = '';
      }
      const canvasHost = document.getElementById('product-model-canvas');
      if (canvasHost) {
        canvasHost.style.opacity = '';
        canvasHost.style.visibility = '';
      }
    }

    function onScrollProgress(progress) {
      const p = clamp01(progress);
      /* Full pin progress drives PNG scrub — no fade window after horizontal 3D */
      const sequenceProgress = p;
      const idx = frameFromSequenceProgress(sequenceProgress);

      /*
       * Only hide the Product Reveal/Features WebGL stage once dismantle is
       * actually the active scrub (progress > 0). Calling hideProductStage()
       * from onRefresh at progress 0 was blanking the 3D canvas while the
       * user was still in the product-story pin (circle + callouts visible,
       * models invisible).
       */
      if (p > 0.001) hideProductStage();
      setCanvasVisible(true, 1);
      drawFrame(idx, false);
      applyChrome(sequenceProgress, idx);
      logProductDebug(idx);
    }

    function scrollLength() {
      /* Dismantle-only pin (fall moved to water-testing WebP) */
      const isMobile = window.matchMedia('(max-width:768px)').matches;
      const vh = Math.max(1, window.innerHeight || 1);
      return Math.round(vh * (isMobile ? 2.1 : 2.4));
    }

    function killTrigger() {
      if (trigger) {
        trigger.kill(true);
        trigger = null;
      }
      ScrollTrigger.getAll().forEach((st) => {
        if (st.vars?.id === 'dismantle-story') st.kill(true);
      });
    }

    function buildTrigger() {
      killTrigger();
      sizeCanvas(true);
      applyChrome(0, 0);

      const productStory = ScrollTrigger.getById('product-story');
      productStage = document.querySelector('.product-story-stage');
      captureHandoffSnapshot();

      trigger = ScrollTrigger.create({
        id: 'dismantle-story',
        trigger: pin,
        pin: true,
        pinSpacing: true,
        pinType: 'fixed',
        /* Mobile: snappier scrub; desktop keeps a touch of lag for frame steps */
        scrub: window.matchMedia('(max-width:768px)').matches ? 0.2 : 0.45,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        /*
         * The CSS viewport overlap places both boundaries together; using the
         * outgoing trigger's measured end removes rounding differences between
         * vh/dvh, mobile browser chrome and ScrollTrigger's generated spacer.
         */
        start: () => {
          const outgoing = ScrollTrigger.getById('product-story') || productStory;
          return outgoing ? outgoing.end : 'top top';
        },
        end: () => '+=' + scrollLength(),
        onUpdate: (self) => onScrollProgress(self.progress),
        onRefresh: () => {
          sizeCanvas(false);
          /* Do not scrub-hide product 3D at progress 0 (pre-dismantle). */
          if (trigger && trigger.progress > 0.001) onScrollProgress(trigger.progress);
          else if (trigger && trigger.progress <= 0.001) showProductStage();
        },
        onEnter: (self) => {
          section.classList.add('is-active');
          /* Snapshot 3D meter bounds while still visible, align PNG, then hide GL */
          captureHandoffSnapshot();
          sizeCanvas(true);
          setCanvasVisible(true, 1);
          drawFrame(0, true);
          hideProductStage();
          onScrollProgress(self.progress);
        },
        onEnterBack: (self) => {
          section.classList.add('is-active');
          captureHandoffSnapshot();
          sizeCanvas(true);
          setCanvasVisible(true, 1);
          drawFrame(frameFromSequenceProgress(clamp01(self.progress)), true);
          hideProductStage();
          onScrollProgress(self.progress);
        },
        onLeave: () => {
          /* Snap to assembled frame, then hand off to water dipping scrub */
          onScrollProgress(1);
          drawFrame(FRAME_COUNT - 1, true);
          applyChrome(1, FRAME_COUNT - 1);
          setWaterFallChrome(false);
          section.classList.remove('is-active');
          setCanvasVisible(true, 1);
          hideProductStage();
          if (typeof window !== 'undefined') {
            window.TelAquaDismantle = window.TelAquaDismantle || {};
            window.TelAquaDismantle.layout = {
              drawX,
              drawY,
              drawW,
              drawH,
              frameW,
              frameH,
              src: frameImg?.currentSrc || frameImg?.src || FRAME_URLS[FRAME_COUNT - 1]
            };
            window.dispatchEvent(new CustomEvent('telaqua:dismantle-handoff', {
              detail: window.TelAquaDismantle.layout
            }));
          }
        },
        onLeaveBack: () => {
          section.classList.remove('is-active');
          setWaterFallChrome(false);
          setCanvasVisible(false, 0);
          showProductStage();
          drawFrame(0, true);
          applyChrome(0, 0);
        }
      });

      refreshScroll();
      return trigger;
    }

    section.classList.add('is-loading');
    sizeCanvas(true);

    /*
     * Lazy-load WebP sequence: do not fetch all 55 frames on first paint.
     * Start when product cinematic / dismantle region approaches (large
     * rootMargin), or when product-story signals ready — same UI, later download.
     */
    let frameLoadStarted = false;
    function beginFramePreload() {
      if (frameLoadStarted) return;
      frameLoadStarted = true;

      preloadFrames()
        .then((loaded) => {
          frames = loaded;
          if (frames[0]) {
            frameW = frames[0].naturalWidth || 1280;
            frameH = frames[0].naturalHeight || 720;
            computeDrawRect(cssW || pin.clientWidth, cssH || pin.clientHeight);
          }
          section.classList.remove('is-loading');
          section.classList.add('is-ready');
          sizeCanvas(true);

          waitForProductStory(() => {
            refreshScroll();
            requestAnimationFrame(() => {
              buildTrigger();
              setTimeout(refreshScroll, 300);
              setTimeout(refreshScroll, 1200);
            });
          });
        })
        .catch((err) => {
          console.error('[dismantle]', err);
          section.classList.remove('is-loading');
          section.classList.add('is-error');
        });
    }

    const region = document.querySelector('.product-dismantle-region');
    const cinematic = document.querySelector('.product-cinematic');
    /* Closer trigger so GLB load isn't competing with 55 WebPs */
    /*
     * Never compete with first paint / ad tracking: frames start only after
     * window load (GTM + Meta Pixel PageView already fired), then when idle.
     */
    function afterPageLoad(cb) {
      const idle = () => {
        if (typeof requestIdleCallback === 'function') requestIdleCallback(cb, { timeout: 1500 });
        else setTimeout(cb, 200);
      };
      if (document.readyState === 'complete') idle();
      else window.addEventListener('load', idle, { once: true });
    }

    whenNear([section, region], {
      rootMargin: '55% 0px 25% 0px',
      threshold: 0
    }).then(() => afterPageLoad(beginFramePreload));

    /* Fallback: start after product story is ready, but wait so GLBs settle first */
    window.addEventListener('telaqua:product-story-ready', () => {
      window.setTimeout(() => afterPageLoad(beginFramePreload), 900);
    }, { once: true });

    /* Debounce resize — pin/layout churn must not constantly reset the canvas */
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => sizeCanvas(false), 80);
    });
    ro.observe(pin);

    /* Phone↔desktop pin length / chrome sizing — refresh trigger on breakpoint flip */
    let lastDismantlePhone = window.matchMedia('(max-width:768px)').matches;
    const dismantlePhoneMq = window.matchMedia('(max-width:768px)');
    const onDismantleBreakpoint = () => {
      const next = dismantlePhoneMq.matches;
      if(next === lastDismantlePhone) return;
      lastDismantlePhone = next;
      const prevProgress = trigger ? Math.min(1, Math.max(0, trigger.progress)) : 0;
      sizeCanvas(true);
      if(trigger){
        buildTrigger();
        requestAnimationFrame(() => {
          refreshScroll();
          if(trigger){
            const scrollY = trigger.start + prevProgress * (trigger.end - trigger.start);
            if(window.TelaquaSmoothScroll?.scrollTo){
              window.TelaquaSmoothScroll.scrollTo(scrollY, { immediate:true, duration:0 });
            } else {
              window.scrollTo(0, scrollY);
            }
            if(typeof ScrollTrigger !== 'undefined') ScrollTrigger.update();
            onScrollProgress(prevProgress);
          }
        });
      }
    };
    if(typeof dismantlePhoneMq.addEventListener === 'function'){
      dismantlePhoneMq.addEventListener('change', onDismantleBreakpoint);
    } else if(typeof dismantlePhoneMq.addListener === 'function'){
      dismantlePhoneMq.addListener(onDismantleBreakpoint);
    }

    window.addEventListener(
      'pagehide',
      () => {
        clearTimeout(resizeTimer);
        killTrigger();
        ro.disconnect();
        frames = [];
      },
      { once: true }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
