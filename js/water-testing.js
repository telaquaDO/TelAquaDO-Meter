/**
 * Tel-Aqua — Water Testing Experience
 *
 * After dismantle assemble: scrub waterpartincluded frames
 * (meter falling into water), then “Why It Matters” callouts with pointers.
 * Baked PNG sequence only (no 3D fall).
 * Lazy-loading removed for debugging/demo — frames download on page load.
 */
const WATER_DIP_START = 243;
const WATER_DIP_END = 283;
const FRAME_URLS = Array.from(
  { length: WATER_DIP_END - WATER_DIP_START + 1 },
  (_, i) =>
    `assets/images/waterpartincluded/ezgif-frame-${WATER_DIP_START + i}.png`
);

const SURFACE_URL = 'assets/images/water/surface/surfacech06.png';
const WATERLINE_VH = 0.40;
const BUBBLE_URL = 'assets/images/water/bubbles/bubble02-alpha.png';
const DROPLET_URL = 'assets/images/water/droplets/drop02-alpha.png';
const DROPLET_SINGLES = Array.from({ length:12 }, (_, i) =>
  `assets/images/water/droplets/singles/clear/drop-${String(i + 1).padStart(2, '0')}.png`
);

const ORBIT_DROPLETS = 0;
const HERO_BUBBLES = 0;
const SPLASH_DROPLETS = 0;
const WET_DROPLETS = 0;
const UNDER_BUBBLES = 0;
const UNDER_BUBBLE_ALPHA_COUNT = 0;
const ORBIT_HISTORY = 28;

/* Legacy artboard constants kept for layout helpers */
const FIRST_PRODUCT = { x:631, y:762, width:2313, height:577 };
const METER_FINAL_FILL = 0.62;
const METER_FINAL_SCALE = 1.34;

function pickDropletUrl(i){
  return DROPLET_SINGLES[i % DROPLET_SINGLES.length];
}
function pickUnderDropletUrl(i = 0, useAlpha = false){
  if(useAlpha) return BUBBLE_URL;
  const singles = [
    'assets/images/water/bubbles/singles/bubble-01.png',
    'assets/images/water/bubbles/singles/bubble-02.png',
    'assets/images/water/bubbles/singles/bubble-03.png',
    'assets/images/water/bubbles/singles/bubble-04.png',
    'assets/images/water/bubbles/singles/bubble-05.png',
    'assets/images/water/bubbles/singles/bubble-06.png',
    'assets/images/water/bubbles/singles/bubble-07.png',
    'assets/images/water/bubbles/singles/bubble-08.png',
    'assets/images/water/bubbles/singles/bubble-09.png',
    'assets/images/water/bubbles/singles/bubble-10.png'
  ];
  return singles[i % singles.length] || BUBBLE_URL;
}

/*
 * Pin timeline:
 *  0 → FALL_END     waterpartincluded PNG scrub (meter dive)
 *  FALL_END → 1     Why It Matters callouts (last frame held)
 */
const FALL_END = 0.48;
const POSE_LOCK_AT = FALL_END;
const REVEAL_START = 0.52;
const CALLOUT_DUR = 0.06;
const CALLOUT_GAP = 0.08;

function calloutWindow(i){
  const start = REVEAL_START + i * (CALLOUT_DUR + CALLOUT_GAP);
  return [start, start + CALLOUT_DUR];
}

function clamp01(v){ return Math.max(0, Math.min(1, v)); }
function lerp(a, b, t){ return a + (b - a) * t; }
function smoothstep(a, b, x){
  const t = clamp01((x - a) / Math.max(b - a, 1e-6));
  return t * t * (3 - 2 * t);
}
function easeInQuart(t){ const x = clamp01(t); return x * x * x * x; }
function rand(min, max){ return min + Math.random() * (max - min); }

const easePower2InOut = (typeof gsap !== 'undefined' && gsap.parseEase)
  ? gsap.parseEase('power2.inOut')
  : (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easePower2In = (typeof gsap !== 'undefined' && gsap.parseEase)
  ? gsap.parseEase('power2.in')
  : (t) => t * t;
const easePower2Out = (typeof gsap !== 'undefined' && gsap.parseEase)
  ? gsap.parseEase('power2.out')
  : (t) => 1 - (1 - t) * (1 - t);
const easeOutBack = (typeof gsap !== 'undefined' && gsap.parseEase)
  ? gsap.parseEase('back.out(1.4)')
  : (t) => {
      const x = clamp01(t);
      const c1 = 1.4;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };

/*
 * WebP dip occupies early pin; callouts start after FALL_END.
 */
const SETTLE_END = 0.02;
const HOLD_END = 0.04;
const CONTACT_AT = 0.48; /* within fallT 0–1 → maps near tip entry */
const DROPLET_AT = CONTACT_AT;
const SPLASH_AT = CONTACT_AT;
const WET_AT = 0.55;
const DIVE_ANGLE = 30;
const SCALE_PREP = 1.08;
const SCALE_FALL = 1.35;

const RIPPLE_RING_COUNT = 6;
const RIPPLE_STAGGER = 0.018;
const RIPPLE_LIFE = 0.28;
const RIPPLE_SCALE_FROM = 0.16;
const RIPPLE_SCALE_TO = 3.4;
const SPLASH_TILT = 0;
const SPLASH_NUDGE_X = 8;
const SPLASH_NUDGE_Y = 2;
const SPLASH_ORIGIN_Y = 58;
const SPLASH_SEQ_END = CONTACT_AT + 0.2;

function loadImage(url){
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if(img.decode) img.decode().then(() => resolve(img)).catch(() => resolve(img));
      else resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** First frames matter most for dive entry; load those first, then the rest. */
const WATER_PRIORITY_COUNT = 12;

/**
 * Progressive WebP preload: priority batch → remaining.
 * `slots` stays length = FRAME_URLS.length so scrub indices stay correct.
 * @param {(slots: (HTMLImageElement|null)[], phase: 'priority'|'done') => void} [onProgress]
 */
async function preloadFrames(onProgress){
  const slots = new Array(FRAME_URLS.length).fill(null);
  const priorityN = Math.min(WATER_PRIORITY_COUNT, FRAME_URLS.length);

  const priority = await Promise.all(
    FRAME_URLS.slice(0, priorityN).map((url) => loadImage(url))
  );
  for(let i = 0; i < priorityN; i++) slots[i] = priority[i];
  if(typeof onProgress === 'function') onProgress(slots, 'priority');

  if(priorityN < FRAME_URLS.length){
    const rest = await Promise.all(
      FRAME_URLS.slice(priorityN).map((url) => loadImage(url))
    );
    for(let i = 0; i < rest.length; i++) slots[priorityN + i] = rest[i];
  }
  if(typeof onProgress === 'function') onProgress(slots, 'done');
  return slots;
}

function initWaterTesting(){
  const section = document.getElementById('water-testing');
  const pin = section?.querySelector('.water-testing-pin');
  const stage = document.getElementById('water-testing-stage');
  const rig = document.getElementById('wt-meter-rig');
  const meterCanvas = document.getElementById('water-testing-meter');
  const reflectionCanvas = document.getElementById('water-meter-reflection');
  const submergedCanvas = document.getElementById('water-meter-submerged');
  const orbitEl = document.getElementById('wt-orbit');
  const heroBubblesEl = document.getElementById('wt-hero-bubbles');
  const meterDropletsEl = document.getElementById('water-meter-droplets');
  const meterWetEl = document.getElementById('wt-meter-wet');
  const bridge = document.getElementById('water-testing-bridge');
  const waterBody = document.getElementById('water-body');
  const surfaceFx = document.getElementById('water-surface-fx');
  const surfaceSheet = document.getElementById('water-surface-sheet');
  const surfaceImg = document.getElementById('water-surface-img');
  const impactEl = document.getElementById('water-impact');
  const surfaceWake = document.getElementById('water-surface-wake');
  const foamEl = document.getElementById('water-foam');
  const splashReflection = document.getElementById('water-splash-reflection');
  const baseSpray = document.getElementById('water-base-spray');
  const meniscus = document.getElementById('water-meniscus');
  const disturbance = document.getElementById('water-disturbance');
  const refraction = document.getElementById('water-refraction');
  const ripplesHost = document.getElementById('water-ripples');
  const rippleRings = Array.from(ripplesHost?.querySelectorAll('.water-ripple-ring') || []).slice(0, RIPPLE_RING_COUNT);
  const splashEl = document.getElementById('water-splash');
  const splashBackHost = document.getElementById('water-splash-back-host');
  const splashBackAnchor = document.getElementById('water-splash-back-anchor');
  const splashBackEl = document.getElementById('water-splash-back');
  const splashProbeEl = document.getElementById('water-splash-probe');
  const bubblesEl = document.getElementById('water-bubbles');
  const dropletsEl = document.getElementById('water-droplets');
  const callouts = Array.from(section?.querySelectorAll('.wt-callout') || []);
  const wtHeading = section?.querySelector('.water-testing-heading');
  if(wtHeading) gsap.set(wtHeading, { autoAlpha:0, y:12 });

  let splashFrameIndex = -1;
  function setSplashFrame(){ /* baked sequence owns splash — overlays unused */ }
  function setCompositeWaterVisible(visible){
    const v = visible ? 'visible' : 'hidden';
    const o = visible ? '' : '0';
    [waterBody, splashBackHost, surfaceFx].forEach((el) => {
      if(!el) return;
      el.style.visibility = v;
      el.style.opacity = o;
      if(!visible) el.style.height = '0%';
    });
    section?.classList.toggle('is-baked-seq', !visible);
  }
  setCompositeWaterVisible(false);

  if(!section || !pin || !stage || !meterCanvas || !rig || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined'){
    return;
  }

  const hasMotionPath = typeof MotionPathPlugin !== 'undefined';
  gsap.registerPlugin(ScrollTrigger);
  if(hasMotionPath) gsap.registerPlugin(MotionPathPlugin);

  const ctx = meterCanvas.getContext('2d', { alpha:true });
  const reflectionCtx = reflectionCanvas?.getContext('2d', { alpha:true }) || null;
  const submergedCtx = submergedCanvas?.getContext('2d', { alpha:true }) || null;
  const width = () => Math.max(1, stage.clientWidth || pin.clientWidth || window.innerWidth);
  const height = () => Math.max(1, stage.clientHeight || pin.clientHeight || window.innerHeight);
  const isPhone = () => window.matchMedia('(max-width:768px)').matches;

  let assembledImg = null;
  let frames = [];
  let frameIndex = -1;
  let showingSequence = false;
  let ready = false;
  let trigger = null;
  let splashFired = false;
  let wetFired = false;
  let floatPhase = 0;
  let lastProgress = 0;
  let immersed = false;
  let dpr = 1;
  let drawX = 0;
  let drawY = 0;
  let drawW = 0;
  let drawH = 0;
  let artW = 1920;
  let artH = 1080;
  let currentMeterImage = null;
  let sharedEntry = { x:window.innerWidth * 0.5, y:window.innerHeight * (1 - WATERLINE_VH) };
  let sharedHasContact = false;

  const orbitPool = [];
  const heroBubblePool = [];
  const underBubblePool = [];
  const splashDropletPool = [];
  const wetDropletPool = [];

  const pose = {
    x:0,
    y:0,
    floatY:0,
    rotY:0,
    rotZ:-90,
    tiltX:0,
    scale:1,
    fallY:0
  };

  let rawOrbitPath = null;
  let orbitRx = 160;
  let orbitRy = 56;
  const meterTrail = [];

  function hideDismantleMeter(){
    const dismantleCanvas = document.querySelector('.dismantle-story-canvas');
    const dismantleFrame = document.querySelector('.dismantle-story-frame');
    [dismantleCanvas, dismantleFrame].forEach((el) => {
      if(!el) return;
      el.classList.remove('is-product-solid', 'is-product-visible');
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
    });
  }

  function showDismantleMeter(){
    const dismantleCanvas = document.querySelector('.dismantle-story-canvas');
    const dismantleFrame = document.querySelector('.dismantle-story-frame');
    [dismantleCanvas, dismantleFrame].forEach((el) => {
      if(!el) return;
      el.style.opacity = '';
      el.style.visibility = '';
    });
  }

  function getCircleStageSize(w, h){
    const stageEl = document.querySelector('.product-story-stage');
    if(stageEl){
      const r = stageEl.getBoundingClientRect();
      const side = Math.min(r.width, r.height);
      if(side > 8) return side;
    }
    const guide = document.querySelector('.product-cinematic-guide');
    if(guide){
      const g = guide.getBoundingClientRect();
      const side = Math.min(g.width, g.height);
      if(side > 8) return side;
    }
    return Math.min(w, h) * (isPhone() ? 0.78 : 0.72);
  }

  function getGuideCenterInPin(w, h){
    const guide = document.querySelector('.product-cinematic-guide');
    if(guide && pin){
      const g = guide.getBoundingClientRect();
      const p = pin.getBoundingClientRect();
      const guideIsInViewport = g.bottom > 0 && g.top < window.innerHeight;
      if(guideIsInViewport && g.width > 8 && g.height > 8 && p.width > 8){
        return {
          x: g.left + g.width * 0.5 - p.left,
          y: g.top + g.height * 0.5 - p.top
        };
      }
    }
    return { x:w * 0.5, y:h * 0.5 };
  }

  function computeDrawRect(){
    const w = width();
    const h = height();
    /*
     * This section holds the post-fall water hero — always full-bleed cover.
     * Do not inherit letterboxed dismantle meter sizing.
     */
    const iw = Math.max(1, artW);
    const ih = Math.max(1, artH);
    const scale = Math.max(w / iw, h / ih);
    drawW = iw * scale;
    drawH = ih * scale;
    drawX = (w - drawW) * 0.5;
    drawY = (h - drawH) * 0.5;
  }

  function resizeCanvas(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = width();
    const h = height();
    meterCanvas.width = Math.round(w * dpr);
    meterCanvas.height = Math.round(h * dpr);
    meterCanvas.style.width = `${w}px`;
    meterCanvas.style.height = `${h}px`;
    if(reflectionCanvas){
      reflectionCanvas.width = Math.round(w * dpr);
      reflectionCanvas.height = Math.round(h * dpr);
      reflectionCanvas.style.width = `${w}px`;
      reflectionCanvas.style.height = `${h}px`;
    }
    if(submergedCanvas){
      submergedCanvas.width = Math.round(w * dpr);
      submergedCanvas.height = Math.round(h * dpr);
      submergedCanvas.style.width = `${w}px`;
      submergedCanvas.style.height = `${h}px`;
    }
    computeDrawRect();
    redraw(true);
  }

  /** Draw meter with the same on-screen rect as the dismantle final frame */
  function drawMeterImage(img){
    if(!img || !ctx) return;
    currentMeterImage = img;
    const cw = meterCanvas.width;
    const ch = meterCanvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    if(drawW < 2 || drawH < 2) computeDrawRect();
    const x = drawX * dpr;
    const y = drawY * dpr;
    const w = drawW * dpr;
    const h = drawH * dpr;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h);
  }

  /** Full-stage cover draw for baked meter+water cinematic frames */
  function drawSequenceImage(img){
    if(!img || !ctx) return;
    currentMeterImage = img;
    const cw = meterCanvas.width;
    const ch = meterCanvas.height;
    const iw = img.naturalWidth || artW;
    const ih = img.naturalHeight || artH;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const scale = Math.max(cw / iw, ch / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (cw - w) * 0.5;
    const y = (ch - h) * 0.5;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h);
  }

  function redraw(force){
    if(showingSequence && frames.length){
      const idx = Math.max(0, Math.min(frames.length - 1, frameIndex));
      frameIndex = idx;
      drawSequenceImage(frames[idx]);
      return;
    }
    if(assembledImg) drawMeterImage(assembledImg);
  }

  function setSequenceFrame(t){
    if(!frames.length) return;
    const u = clamp01(t);
    let idx = Math.min(
      frames.length - 1,
      Math.floor(u * (frames.length - 0.001))
    );
    showingSequence = true;
    /* Prefer exact frame; if still loading, use nearest earlier decoded frame */
    let img = frames[idx];
    if(!img){
      for(let i = idx - 1; i >= 0; i--){
        if(frames[i]){
          idx = i;
          img = frames[i];
          break;
        }
      }
    }
    /* Still nothing decoded — keep prior canvas pixels (avoid white clear) */
    if(!img) return;
    if(idx === frameIndex && currentMeterImage === img) return;
    frameIndex = idx;
    artW = img.naturalWidth || artW;
    artH = img.naturalHeight || artH;
    drawSequenceImage(img);
  }

  function showAssembled(){
    /* Hold last dipping frame when sequence is ready; otherwise clear */
    if(frames.length){
      setSequenceFrame(1);
      return;
    }
    showingSequence = false;
    frameIndex = -1;
    if(ctx && meterCanvas){
      const dprLocal = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dprLocal, 0, 0, dprLocal, 0, 0);
      ctx.clearRect(0, 0, width(), height());
    }
  }

  function hideMeterFall3d(){
    const fallHost = document.getElementById('wt-meter-fall-3d');
    if(fallHost){
      fallHost.classList.remove('is-visible');
      fallHost.style.opacity = '0';
      fallHost.style.visibility = 'hidden';
    }
    window.TelAquaMeterFall?.setVisible?.(false);
  }

  function setFallChrome(on){
    document.querySelector('.product-cinematic')?.classList.toggle('is-water-fall', !!on);
    document.querySelector('.product-dismantle-region')?.classList.toggle('is-water-fall', !!on);
    document.querySelector('.product-dismantle-bg')?.classList.toggle('is-water-fall', !!on);
  }

  let waveTween = null;
  let reflectionWaveTween = null;

  function applySurfaceTextures(){
    if(surfaceImg){
      surfaceImg.src = SURFACE_URL;
    }
    if(surfaceWake){
      surfaceWake.style.backgroundImage = `url("${SURFACE_URL}")`;
    }
    startSurfaceWave();
  }

  function startSurfaceWave(){
    if(!surfaceSheet || typeof gsap === 'undefined') return;
    if(waveTween){
      waveTween.kill();
      waveTween = null;
    }
    if(reflectionWaveTween){
      reflectionWaveTween.kill();
      reflectionWaveTween = null;
    }
    gsap.set(surfaceSheet, { x:0, y:0, force3D:true });
    /* Gentle horizontal drift only (2–4px) — no vertical bobbing */
    waveTween = gsap.to(surfaceSheet, {
      x: isPhone() ? 2.5 : 3.5,
      y: isPhone() ? -1.25 : -2,
      duration: 2.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      force3D: true
    });
    if(reflectionCanvas){
      gsap.set(reflectionCanvas, { x:0, y:0, scaleX:1, skewX:0, force3D:true });
      reflectionWaveTween = gsap.to(reflectionCanvas, {
        x:isPhone() ? 0.8 : 1.5,
        y:1,
        scaleX:1.015,
        skewX:0.35,
        duration:2.8,
        ease:'sine.inOut',
        yoyo:true,
        repeat:-1,
        force3D:true
      });
    }
  }

  function buildOrbitPath(){
    orbitRx = isPhone() ? 88 : 168;
    orbitRy = isPhone() ? 34 : 58;
    const pts = [];
    const N = 72;
    /* Start at bottom (π/2); CCW so first motion is toward the left. */
    for(let i = 0; i <= N; i++){
      const a = Math.PI / 2 + (i / N) * Math.PI * 2;
      pts.push({ x:Math.cos(a) * orbitRx, y:Math.sin(a) * orbitRy });
    }
    if(hasMotionPath){
      rawOrbitPath = MotionPathPlugin.arrayToRawPath(pts, { curviness:1.05 });
      MotionPathPlugin.cacheRawPathMeasurements(rawOrbitPath);
    } else {
      rawOrbitPath = pts;
    }
  }

  function sampleOrbit(t){
    const u = clamp01(t);
    if(hasMotionPath && rawOrbitPath){
      const p = MotionPathPlugin.getPositionOnPath(rawOrbitPath, u, true);
      return { x:p.x, y:p.y, angle:typeof p.angle === 'number' ? p.angle : 0 };
    }
    const a = Math.PI / 2 + u * Math.PI * 2;
    const x = Math.cos(a) * orbitRx;
    const y = Math.sin(a) * orbitRy;
    return { x, y, angle:(a * 180) / Math.PI };
  }

  /** Face invisible orbit center (tidal lock) + optional self-rotation. */
  function faceCenterDeg(x, y, selfRot){
    /* Vertical asset: top points toward orbit center → horizontal at bottom start. */
    return (Math.atan2(-y, -x) * 180) / Math.PI + selfRot;
  }

  function buildOrbitDroplets(){
    if(!orbitEl) return;
    orbitEl.innerHTML = '';
    orbitPool.length = 0;
    for(let i = 0; i < ORBIT_DROPLETS; i++){
      const el = document.createElement('span');
      el.className = 'wt-orbit-droplet';
      el.style.backgroundImage = `url("${pickDropletUrl(i)}")`;
      const size = rand(8, 18);
      el.style.setProperty('--size', `${size}px`);
      orbitEl.appendChild(el);
      const mode = i < 5 ? 'companion' : (i < 8 ? 'trail' : 'halo');
      orbitPool.push({
        el,
        mode,
        phase: (i / ORBIT_DROPLETS) * Math.PI * 2 + rand(-0.25, 0.25),
        radius: rand(48, isPhone() ? 100 : 140),
        lag: Math.round(rand(4, ORBIT_HISTORY - 2)),
        size,
        opacity: rand(0.4, 0.9),
        spin: rand(-50, 50),
        speed: rand(0.55, 1.35)
      });
    }
  }

  function pushTrail(x, y){
    meterTrail.push({ x, y });
    if(meterTrail.length > ORBIT_HISTORY) meterTrail.shift();
  }

  function updateOrbit(progress, orbitT, meterX, meterY, active){
    if(!orbitPool.length || !orbitEl) return;
    const show = active
      ? smoothstep(0.06, 0.12, progress) * (1 - smoothstep(0.48, 0.56, progress))
      : 0;
    orbitEl.style.opacity = String(show);
    /* Droplets live in stage space (orbitEl reparented under stage). */
    for(let i = 0; i < orbitPool.length; i++){
      const d = orbitPool[i];
      let x = meterX;
      let y = meterY;
      if(d.mode === 'companion'){
        const a = d.phase + orbitT * Math.PI * 2 * d.speed;
        x = meterX + Math.cos(a) * d.radius * 0.42;
        y = meterY + Math.sin(a) * d.radius * 0.28;
      } else if(d.mode === 'trail'){
        const hist = meterTrail[Math.max(0, meterTrail.length - 1 - d.lag)];
        if(hist){
          x = hist.x;
          y = hist.y;
        }
      } else {
        const a = d.phase + orbitT * Math.PI * 2 * d.speed * 0.85;
        x = Math.cos(a) * d.radius;
        y = Math.sin(a) * d.radius * (orbitRy / Math.max(orbitRx, 1));
      }
      d.el.style.opacity = String(d.opacity * show);
      d.el.style.transform =
        `translate3d(${x}px, ${y}px, 0) rotate(${d.spin + orbitT * 160 * d.speed}deg)`;
    }
  }

  function buildHeroBubbles(){
    if(!heroBubblesEl) return;
    heroBubblesEl.innerHTML = '';
    heroBubblePool.length = 0;
    /* Intentionally empty — bubbles only spawn underwater. */
  }

  function updateHeroBubbles(dt, active, orbitT, meterX, meterY){
    const show = active ? 1 : 0;
    for(let i = 0; i < heroBubblePool.length; i++){
      const b = heroBubblePool[i];
      if(!show){
        b.el.style.opacity = '0';
        continue;
      }
      if(b.mode === 'orbit'){
        const a = b.phase + orbitT * Math.PI * 2 * b.orbitSpeed;
        const x = meterX + Math.cos(a) * b.radius * 0.55;
        const y = meterY + Math.sin(a) * b.radius * 0.32;
        b.el.style.transform = `translate3d(calc(50% + ${x}px), calc(50% + ${y}px), 0)`;
        b.el.style.opacity = String(b.opacity * show);
        continue;
      }
      b.life += dt * b.speed;
      if(b.life >= 1){
        b.life = 0;
        b.x = rand(-140, 140);
        b.y = rand(35, 92);
        b.opacity = rand(0.18, 0.55);
      }
      const y = b.y - b.life * 72;
      const x = b.x + Math.sin(b.life * Math.PI * 2) * b.drift;
      const fade = b.life < 0.12 ? b.life / 0.12 : b.life > 0.75 ? (1 - b.life) / 0.25 : 1;
      b.el.style.transform = `translate3d(calc(50% + ${x}px), ${y}%, 0)`;
      b.el.style.opacity = String(b.opacity * fade * show);
    }
  }

  function buildUnderBubbles(){
    if(!bubblesEl) return;
    bubblesEl.innerHTML = '';
    underBubblePool.length = 0;
    const alphaCount = Math.min(UNDER_BUBBLE_ALPHA_COUNT, UNDER_BUBBLES);
    for(let i = 0; i < UNDER_BUBBLES; i++){
      const useAlpha = i < alphaCount;
      const el = document.createElement('span');
      el.className = useAlpha ? 'water-bubble water-bubble--alpha' : 'water-bubble';
      el.style.backgroundImage = `url("${pickUnderDropletUrl(i, useAlpha)}")`;
      /* Alpha plate stays small; singles keep the usual range */
      const size = useAlpha ? rand(7, 12) : rand(6, 18);
      el.style.setProperty('--size', `${size}px`);
      bubblesEl.appendChild(el);
      /* Cluster near submerged tip — rise toward waterline and fade */
      underBubblePool.push({
        el,
        useAlpha,
        x: rand(-22, 22),
        y: rand(28, 92),
        size,
        opacity: useAlpha ? rand(0.55, 0.9) : rand(0.45, 0.85),
        drift: rand(-14, 14),
        speed: rand(0.18, 0.38),
        rotation: rand(-40, 40),
        stretch: rand(0.9, 1.12),
        life: rand(0, 0.85),
        index: i
      });
    }
  }

  function updateUnderBubbles(dt, active){
    const tipLocalX = sharedEntry.tipX != null
      ? (sharedEntry.tipX - sharedEntry.x)
      : 0;
    for(let i = 0; i < underBubblePool.length; i++){
      const b = underBubblePool[i];
      if(!active){
        gsap.set(b.el, { opacity:0 });
        continue;
      }
      b.life += dt * b.speed;
      if(b.life >= 1){
        b.life = 0;
        b.x = tipLocalX + rand(-18, 18);
        b.y = rand(36, 110);
        b.opacity = b.useAlpha ? rand(0.55, 0.9) : rand(0.45, 0.85);
        b.drift = rand(-14, 14);
        b.speed = rand(0.18, 0.38);
        b.size = b.useAlpha ? rand(7, 12) : rand(5, 17);
        b.rotation = rand(-40, 40);
        b.stretch = rand(0.9, 1.12);
        b.el.style.backgroundImage = `url("${pickUnderDropletUrl(b.index, b.useAlpha)}")`;
        b.el.style.setProperty('--size', `${b.size}px`);
      }
      /* Rise toward surface; stay below waterline (y >= 6px) */
      const travel = Math.max(10, b.y - 6);
      const y = b.y - b.life * travel;
      const x = (sharedEntry.x - width() * 0.5) + tipLocalX + b.x +
        Math.sin(b.life * Math.PI * 2.4) * (b.drift * 0.4);
      const fadeIn = b.life < 0.12 ? b.life / 0.12 : 1;
      const fadeOut = b.life > 0.62 ? (1 - b.life) / 0.38 : 1;
      gsap.set(b.el, {
        x,
        y,
        rotation: b.rotation + b.life * 36,
        scaleY: b.stretch,
        opacity: b.opacity * fadeIn * fadeOut,
        force3D: true
      });
    }
  }

  function buildSplashDroplets(){
    if(!dropletsEl) return;
    dropletsEl.innerHTML = '';
    splashDropletPool.length = 0;
    const phone = isPhone();
    const count = phone ? Math.min(16, SPLASH_DROPLETS) : SPLASH_DROPLETS;

    /* Small sky-blue singles/clear spray around the probe tip */
    for(let i = 0; i < count; i++){
      const el = document.createElement('span');
      el.className = 'water-droplet';
      el.style.backgroundImage = `url("${pickDropletUrl(i)}")`;
      const size = phone ? rand(8, 16) : rand(10, 20);
      el.style.setProperty('--size', `${size}px`);
      el.style.opacity = '0';
      dropletsEl.appendChild(el);
      const side = i % 2 === 0 ? -1 : 1;
      const fan = (i / Math.max(1, count - 1)) * 0.85 + 0.15;
      splashDropletPool.push({
        el,
        kind: 'drop',
        distance: side * rand(phone ? 28 : 40, phone ? 100 : 150) * fan + rand(-8, 8),
        arcHeight: rand(phone ? 60 : 90, phone ? 140 : 200) * (0.7 + fan * 0.5),
        landY: rand(6, 28),
        rot0: rand(-40, 40),
        rotSpin: rand(-120, 120),
        opacity: rand(0.75, 0.98),
        stagger: i * 0.003 + rand(0, 0.016),
        life: rand(0.16, 0.26),
        scale: rand(0.85, 1.1),
        speed: 1
      });
    }
  }

  function buildWetDroplets(){
    if(!meterDropletsEl) return;
    meterDropletsEl.innerHTML = '';
    wetDropletPool.length = 0;
    /* Intentionally empty — keep display and branding clear */
  }

  function updateFlyingDroplets(p, hasContact){
    for(let i = 0; i < splashDropletPool.length; i++){
      const d = splashDropletPool[i];
      const start = DROPLET_AT + d.stagger;
      const local = clamp01((p - start) / d.life);
      if(!hasContact || p < start || local <= 0.001){
        gsap.set(d.el, { opacity:0 });
        continue;
      }
      /* Ease-out launch so drops burst up fast, then hang/fall */
      const launch = 1 - Math.pow(1 - local, 1.55);
      const x = d.distance * launch;
      const y = -d.arcHeight * 4 * local * (1 - local) + d.landY * local * local;
      const fadeIn = Math.min(1, local / 0.08);
      const fadeOut = local > 0.62 ? (1 - local) / 0.38 : 1;
      const fade = Math.max(0, fadeIn * fadeOut);
      gsap.set(d.el, {
        x,
        y,
        rotation: d.rot0 + d.rotSpin * launch,
        scale: d.scale * (1.05 - local * 0.22),
        opacity: d.opacity * fade,
        force3D: true
      });
    }
  }

  function updateWet(p){
    if(meterWetEl) gsap.set(meterWetEl, { opacity:0, scale:0.94 });
  }

  function transformDipPoint(point){
    const w = width();
    const h = height();
    const originX = w * 0.5;
    const originY = h * 0.82;
    const rawX = drawX + drawW * point.x;
    const rawY = drawY + drawH * point.y;
    const radians = pose.rotZ * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = (rawX - originX) * pose.scale;
    const dy = (rawY - originY) * pose.scale;
    return {
      x:originX + pose.x + dx * cos - dy * sin,
      y:originY + pose.y + pose.fallY + pose.floatY + dx * sin + dy * cos
    };
  }

  function getEntryPoint(waterlineY){
    const top = transformDipPoint(DIP_AXIS_TOP);
    const tip = transformDipPoint(DIP_PROBE_TIP);
    const dy = tip.y - top.y;
    const t = Math.abs(dy) > 0.001 ? clamp01((waterlineY - top.y) / dy) : 1;
    return {
      x:lerp(top.x, tip.x, t),
      y:waterlineY,
      tipX:tip.x,
      tipY:tip.y
    };
  }

  function drawReflection(entry, strength){
    if(!reflectionCanvas || !reflectionCtx) return;
    const w = width();
    const h = height();
    const rc = reflectionCtx;
    rc.setTransform(1, 0, 0, 1, 0, 0);
    rc.clearRect(0, 0, reflectionCanvas.width, reflectionCanvas.height);
    gsap.set(reflectionCanvas, { opacity:clamp01(strength) * 0.20 });
    if(strength <= 0.001 || !currentMeterImage) return;

    const originX = w * 0.5;
    const originY = h * 0.82;
    const translateY = pose.y + pose.fallY + pose.floatY;
    rc.save();
    rc.setTransform(dpr, 0, 0, dpr, 0, 0);
    /*
     * Exactly one mirrored copy of the active source frame. Map the main
     * meter's screen-space pose into water-local coordinates, then flip it
     * once around the entry line.
     */
    rc.translate(0, entry.y);
    rc.scale(1, -1);
    rc.translate(originX + pose.x, originY + translateY);
    rc.rotate(pose.rotZ * Math.PI / 180);
    rc.scale(pose.scale, pose.scale);
    rc.translate(-originX, -originY);
    rc.drawImage(currentMeterImage, drawX, drawY, drawW, drawH);
    rc.restore();
  }

  function drawSubmergedMeter(entry, strength){
    if(!submergedCanvas || !submergedCtx) return;
    const w = width();
    const h = height();
    const sc = submergedCtx;
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.clearRect(0, 0, submergedCanvas.width, submergedCanvas.height);
    /* Keep submerged portion readable so the tip feels underwater, not floating */
    gsap.set(submergedCanvas, { opacity: strength <= 0 ? 0 : 0.55 + clamp01(strength) * 0.45 });
    if(strength <= 0.001 || !currentMeterImage) return;

    const originX = w * 0.5;
    const originY = h * 0.82;
    const translateY = pose.y + pose.fallY + pose.floatY;
    sc.save();
    sc.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* Parent begins at the waterline: convert screen-space meter into local water space. */
    sc.translate(0, -entry.y);
    sc.translate(originX + pose.x, originY + translateY);
    sc.rotate(pose.rotZ * Math.PI / 180);
    sc.scale(pose.scale, pose.scale);
    sc.translate(-originX, -originY);
    /* Separate, unmirrored underwater tint layer using the same source frame. */
    sc.drawImage(currentMeterImage, drawX, drawY, drawW, drawH);
    sc.restore();

    sc.save();
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.globalCompositeOperation = 'source-atop';
    sc.fillStyle = 'rgba(45,135,190,0.28)';
    sc.fillRect(0, 0, submergedCanvas.width, submergedCanvas.height);
    sc.restore();
  }

  function updateSurfaceContact(p, entry, hasContact, contactDepth){
    /* Live composite water while 3D meter is immersed */
    immersed = !!hasContact;
    section.classList.toggle('is-immersed', immersed);
    updateFlyingDroplets(p, false);
    updateWet(p);
  }

  function softFadeMain(){
    return 0;
  }

  function resetFx(){
    splashFired = false;
    wetFired = false;
    setSplashFrame(0);
    [splashEl, splashBackEl, splashProbeEl].forEach((el) => {
      if(!el) return;
      gsap.killTweensOf(el);
      gsap.set(el, {
        opacity:0,
        scale:0.3,
        rotation:0,
        xPercent:-50,
        yPercent:el === splashProbeEl ? 0 : -SPLASH_ORIGIN_Y,
        y:el === splashProbeEl ? 0 : SPLASH_NUDGE_Y,
        x:el === splashProbeEl ? 0 : SPLASH_NUDGE_X,
        transformOrigin:`50% ${SPLASH_ORIGIN_Y}%`
      });
    });
    if(ripplesHost) gsap.set(ripplesHost, { x:0, y:0 });
    rippleRings.forEach((ring) => {
      gsap.set(ring, {
        opacity:0,
        scale:RIPPLE_SCALE_FROM,
        xPercent:-50,
        yPercent:-40
      });
    });
    if(disturbance){
      gsap.killTweensOf(disturbance);
      gsap.set(disturbance, { opacity:0, scale:0.4, x:0 });
    }
    if(meniscus){
      gsap.killTweensOf(meniscus);
      gsap.set(meniscus, { opacity:0, scaleX:0.45, y:0, x:0 });
    }
    if(surfaceWake){
      gsap.killTweensOf(surfaceWake);
      gsap.set(surfaceWake, { opacity:0, scale:0.55 });
    }
    if(foamEl){
      gsap.killTweensOf(foamEl);
      gsap.set(foamEl, { opacity:0, scaleX:0.4 });
    }
    if(baseSpray){
      gsap.killTweensOf(baseSpray);
      gsap.set(baseSpray, { opacity:0 });
    }
    if(splashReflection){
      gsap.killTweensOf(splashReflection);
      gsap.set(splashReflection, { opacity:0, scaleY:-0.4 });
    }
    if(meterWetEl){
      gsap.killTweensOf(meterWetEl);
      gsap.set(meterWetEl, { opacity:0, scale:0.94 });
    }
    splashDropletPool.forEach((item) => {
      gsap.killTweensOf(item.el);
      gsap.set(item.el, { opacity:0, x:0, y:0, rotation:0, scale:1 });
    });
    wetDropletPool.forEach((d) => {
      gsap.killTweensOf(d.el);
      gsap.set(d.el, { opacity:0, x:0, y:0, rotation:0, scale:1 });
    });
  }

  function updateCallouts(p){
    if(wtHeading && isPhone()){
      const hT = easePower2Out(smoothstep(REVEAL_START - 0.04, REVEAL_START + 0.02, p));
      gsap.set(wtHeading, {
        autoAlpha: hT,
        y: (1 - hT) * 12,
        force3D: true
      });
      wtHeading.setAttribute('aria-hidden', hT > 0.02 ? 'false' : 'true');
    } else if(wtHeading){
      gsap.set(wtHeading, { autoAlpha:0 });
      wtHeading.setAttribute('aria-hidden', 'true');
    }

    callouts.forEach((el, index) => {
      const [start, end] = calloutWindow(index);
      const reveal = easePower2Out(smoothstep(start, end, p));
      const line = el.querySelector('.wt-callout-line');
      const dot = el.querySelector('.wt-callout-dot');
      const icon = el.querySelector('.wt-callout-icon');
      const card = el.querySelector('.wt-callout-card');
      const title = el.querySelector('.wt-callout-title');
      const text = el.querySelector('.wt-callout-text');
      /* Desktop keeps callout 2 on the right via CSS despite --left class */
      const isMobileWt = window.matchMedia('(max-width:768px)').matches;
      const calloutId = el.getAttribute('data-wt-callout');
      const isLeft = isMobileWt
        ? calloutId !== '3'
        : (el.classList.contains('wt-callout--left') && calloutId !== '2');

      const lineT = easePower2Out(clamp01(reveal / 0.48));
      const dotT = easeOutBack(clamp01((reveal - 0.22) / 0.28));
      const cardT = easePower2Out(clamp01((reveal - 0.32) / 0.68));

      gsap.set(el, { autoAlpha:reveal > 0.01 ? 1 : 0 });

      if(line) gsap.set(line, { scaleX: lineT, autoAlpha: lineT });
      if(dot) gsap.set(dot, { scale: dotT, autoAlpha: dotT });
      if(icon) gsap.set(icon, { autoAlpha:cardT, scale:0.9 + 0.1 * cardT });
      if(card){
        const slideX = isLeft ? -18 : 18;
        gsap.set(card, {
          autoAlpha: cardT,
          x:slideX * (1 - cardT),
          y:0,
          scale:1
        });
      }
      if(title) gsap.set(title, { autoAlpha: cardT });
      if(text) gsap.set(text, { autoAlpha: cardT });
    });
  }

  function setPostAssemblyVisuals(active){
    /* After assembly: never show the Three.js product model in this chapter */
    const modelStage = document.getElementById('product-model-canvas');
    if(modelStage){
      modelStage.style.visibility = active ? 'hidden' : '';
      modelStage.style.opacity = active ? '0' : '';
      modelStage.setAttribute('aria-hidden', active ? 'true' : 'false');
    }
    /* The shared Product/Dismantle background ends before this chapter. */
  }

  function applyRig(){
    gsap.set(rig, {
      x: pose.x,
      y: pose.y + pose.fallY + pose.floatY,
      rotateX: pose.tiltX,
      rotateY: 0,
      rotateZ: pose.rotZ,
      scale: pose.scale,
      transformOrigin: '50% 82%',
      transformPerspective: 900,
      force3D: true
    });
  }

  /**
   * PNG dip scrub (0→FALL_END) then Why It Matters callouts.
   * Lazy-loading removed for debugging/demo — draws any decoded frame for
   * current scrub; does not wait for 100% preload.
   */
  function applyProgress(progress){
    const p = clamp01(progress);
    lastProgress = p;

    const hasFrame = frames.some(Boolean);

    setPostAssemblyVisuals(p > 0.001);
    /*
     * Keep dismantle meter visible until water has something to draw —
     * avoids a white gap when the water pin starts before frames decode.
     */
    if(p > 0.001 && hasFrame && frameIndex >= 0) hideDismantleMeter();
    else if(p <= 0.001) showDismantleMeter();

    if(bridge) gsap.set(bridge, { autoAlpha:0 });
    const stageOn = (section.classList.contains('is-active') || p > 0.001) && hasFrame;
    gsap.set(stage, { autoAlpha: stageOn ? 1 : 0 });

    if(orbitEl) orbitEl.style.opacity = '0';
    if(heroBubblesEl) heroBubblesEl.style.opacity = '0';

    /* Baked dipping frames include water — keep composite layers off */
    setCompositeWaterVisible(false);
    hideMeterFall3d();

    const fallT = p <= FALL_END ? clamp01(p / Math.max(FALL_END, 1e-6)) : 1;
    setFallChrome(p > 0.001 && fallT >= 0.12 && hasFrame);

    sharedHasContact = false;
    if(reflectionCanvas) gsap.set(reflectionCanvas, { opacity:0 });
    if(submergedCanvas) gsap.set(submergedCanvas, { opacity:0 });

    if(stage){
      stage.style.webkitMaskImage = '';
      stage.style.maskImage = '';
      stage.style.zIndex = '4';
    }

    if(hasFrame){
      setSequenceFrame(fallT);
    }

    pose.x = 0;
    pose.y = 0;
    pose.rotY = 0;
    pose.rotZ = 0;
    pose.tiltX = 0;
    pose.fallY = 0;
    pose.scale = 1;
    pose.floatY = 0;

    updateCallouts(p);
    applyRig();
  }

  function scrollLength(){
    /* WebP dip + staggered callouts */
    return Math.round(window.innerHeight * (isPhone() ? 1.45 : 1.65));
  }

  function killTrigger(){
    if(trigger){
      trigger.kill(true);
      trigger = null;
    }
    ScrollTrigger.getAll().forEach((st) => {
      if(st.vars?.id === 'water-testing') st.kill(true);
    });
  }

  function buildTrigger(){
    killTrigger();
    trigger = ScrollTrigger.create({
      id:'water-testing',
      trigger:pin,
      pin:true,
      pinSpacing:true,
      pinType:'fixed',
      /* Match dismantle scrub so the seam feels like one timeline */
      scrub:isPhone() ? 0.2 : 0.35,
      anticipatePin:1,
      invalidateOnRefresh:true,
      start:() => {
        const outgoing = ScrollTrigger.getById('dismantle-story');
        return outgoing ? outgoing.end : 'top top';
      },
      end:() => '+=' + scrollLength(),
      onUpdate:(self) => applyProgress(self.progress),
      onRefresh:() => {
        computeDrawRect();
        resizeCanvas();
        if(trigger) applyProgress(trigger.progress);
      },
      onEnter:() => {
        section.classList.add('is-active');
        setPostAssemblyVisuals(true);
        hideDismantleMeter();
        hideMeterFall3d();
        computeDrawRect();
        applyProgress(trigger?.progress || 0);
      },
      onEnterBack:() => {
        section.classList.add('is-active');
        setPostAssemblyVisuals(true);
        hideDismantleMeter();
        hideMeterFall3d();
        computeDrawRect();
        applyProgress(trigger?.progress || 0);
      },
      onLeave:() => {
        section.classList.remove('is-active');
        setFallChrome(false);
        hideMeterFall3d();
        hideDismantleMeter();
        window.dispatchEvent(new Event('scroll'));
      },
      onLeaveBack:() => {
        section.classList.remove('is-active');
        setFallChrome(false);
        hideMeterFall3d();
        setPostAssemblyVisuals(false);
        showDismantleMeter();
        applyProgress(0);
        window.dispatchEvent(new Event('scroll'));
      }
    });
    ScrollTrigger.refresh();
  }

  function waitForDismantle(cb){
    let tries = 0;
    const tick = () => {
      const st = ScrollTrigger.getById('dismantle-story');
      if(st || tries > 120){
        cb();
        return;
      }
      tries += 1;
      requestAnimationFrame(tick);
    };
    tick();
  }

  gsap.ticker.add((time, delta) => {
    if(!section.classList.contains('is-active') && lastProgress < 0.01) return;
    updateUnderBubbles(delta / 1000, sharedHasContact);
  });

  window.addEventListener('resize', () => {
    buildOrbitPath();
    resizeCanvas();
    startSurfaceWave();
    ScrollTrigger.refresh();
  }, { passive:true });

  /* Phone↔desktop: orbit radii / heading differ — refresh without waiting for load */
  let lastWtPhone = isPhone();
  const wtPhoneMq = window.matchMedia('(max-width:768px)');
  const onWtBreakpoint = () => {
    const next = isPhone();
    if(next === lastWtPhone) return;
    lastWtPhone = next;
    const prevProgress = trigger ? Math.min(1, Math.max(0, trigger.progress)) : 0;
    buildOrbitPath();
    buildOrbitDroplets();
    resizeCanvas();
    startSurfaceWave();
    if(waterTriggerBuilt){
      buildTrigger();
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        if(trigger){
          const scrollY = trigger.start + prevProgress * (trigger.end - trigger.start);
          if(window.TelaquaSmoothScroll?.scrollTo){
            window.TelaquaSmoothScroll.scrollTo(scrollY, { immediate:true, duration:0 });
          } else {
            window.scrollTo(0, scrollY);
          }
          ScrollTrigger.update();
          applyProgress(prevProgress);
        }
      });
    }
  };
  if(typeof wtPhoneMq.addEventListener === 'function'){
    wtPhoneMq.addEventListener('change', onWtBreakpoint);
  } else if(typeof wtPhoneMq.addListener === 'function'){
    wtPhoneMq.addListener(onWtBreakpoint);
  }

  function whenNear(targets, options){
    return new Promise((resolve) => {
      const els = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
      if(!els.length || typeof IntersectionObserver === 'undefined'){
        resolve();
        return;
      }
      let done = false;
      const finish = () => {
        if(done) return;
        done = true;
        io.disconnect();
        resolve();
      };
      const io = new IntersectionObserver((entries) => {
        if(entries.some((e) => e.isIntersecting)) finish();
      }, options);
      els.forEach((el) => io.observe(el));
    });
  }

  /*
   * Lazy-loading removed for debugging/demo:
   * - download waterpartincluded frames on page load
   * - build ScrollTrigger as soon as dismantle exists (correct pin range)
   * - draw any decoded frame for current scrub (no wait for 100% preload)
   */
  const needsParticleFx =
    ORBIT_DROPLETS > 0 ||
    HERO_BUBBLES > 0 ||
    SPLASH_DROPLETS > 0 ||
    WET_DROPLETS > 0 ||
    UNDER_BUBBLES > 0;

  let waterAssetsStarted = false;
  let waterTriggerBuilt = false;

  function syncProgressFromTrigger(){
    const p = trigger
      ? Math.min(1, Math.max(0, trigger.progress))
      : lastProgress;
    computeDrawRect();
    resizeCanvas();
    applyProgress(p > 0.001 ? p : lastProgress);
  }

  function finalizeWaterReady(loadedSlots){
    frames = Array.isArray(loadedSlots) ? loadedSlots : [];
    if(frames[0]){
      artW = frames[0].naturalWidth || 1920;
      artH = frames[0].naturalHeight || 1080;
    }
    if(bridge) gsap.set(bridge, { autoAlpha:0 });

    setCompositeWaterVisible(false);
    hideMeterFall3d();
    resetFx();
    applySurfaceTextures();
    buildOrbitPath();
    buildOrbitDroplets();
    buildHeroBubbles();
    buildUnderBubbles();
    buildSplashDroplets();
    buildWetDroplets();

    ready = true;
    /* Do NOT reset scrub to 0 — re-draw for wherever the user already is */
    frameIndex = -1;
    syncProgressFromTrigger();
  }

  function ensureWaterTrigger(){
    if(waterTriggerBuilt) return;
    waterTriggerBuilt = true;
    waitForDismantle(() => {
      computeDrawRect();
      resizeCanvas();
      buildTrigger();
      if(frames.some(Boolean)) syncProgressFromTrigger();
    });
  }

  function beginWaterAssets(){
    if(waterAssetsStarted) return;
    waterAssetsStarted = true;

    hideMeterFall3d();
    /* Pin range must exist even while frames are still downloading */
    ensureWaterTrigger();

    const extra = [];
    if(needsParticleFx){
      extra.push(
        loadImage(BUBBLE_URL),
        loadImage(DROPLET_URL),
        ...DROPLET_SINGLES.map(loadImage)
      );
    }

    Promise.all([loadImage(SURFACE_URL), ...extra]).catch(() => {});

    preloadFrames((slots, phase) => {
      if(phase === 'priority'){
        if(!ready && slots.some(Boolean)) finalizeWaterReady(slots.slice());
        else if(ready){
          frames = slots.slice();
          syncProgressFromTrigger();
        }
        return;
      }
      frames = slots.slice();
      if(!ready && frames.some(Boolean)) finalizeWaterReady(frames);
      else if(ready) syncProgressFromTrigger();
    }).catch((err) => {
      console.warn('Water testing failed to load', err);
    });
  }

  /* Lazy-loading removed for debugging/demo — no IntersectionObserver gate */
  beginWaterAssets();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initWaterTesting, { once:true });
} else {
  initWaterTesting();
}
