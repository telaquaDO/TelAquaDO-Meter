/**
 * Tel-Aqua Product Story — cinematic Apple-style scroll reveal
 *
 * One continuous scrubbed timeline (Lenis + ScrollTrigger, pin + scrub):
 *   Product Reveal (settled box → unveils meter) →
 *   incline into feature pose → Product Features cards →
 *   sync exit → horizontal pose → Dismantling
 *
 * Models: productboxwithupdatedvalue.glb + ph3dmodel.glb only.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const METER_URL = 'assets/images/ph3dmodel.glb';
const BOX_URL = 'assets/images/productboxwithupdatedvalue.glb';
/* productboxwithupdatedvalue.glb may use KHR_draco_mesh_compression (+ WebP textures) */
const DRACO_DECODER_PATH =
  'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/';
const DEG = Math.PI / 180;
const MAX_TILT = 32 * DEG;
const HERO_FILL = 0.56;
const INTRO_FILL = 0.58;
/*
 * Horizontal fill matched to dismantle PNG target:
 * stage × 0.62 × 1.38 ≈ stage × 0.8556  →  H_FILL × METER_HERO_SCALE
 */
const H_FILL = 0.638;
const BOX_FILL = 0.70;
const BOX_FILL_MOBILE = 0.62;
const BOX_HERO_SCALE = 1.12;
/**
 * Locked hero size = upright height after box reveal (screenshot reference).
 * Do not animate model scale after that — only position / rotation / mild camera.
 */
const METER_HERO_SCALE = 1.34;
/** Upright framing that matches the revealed hero height */
const METER_HERO_FILL = 0.62;
/**
 * Slightly closer camera when inclined so foreshortening does not
 * make the meter look shorter than the upright hero.
 */
const METER_INCLINE_FILL = 0.69;
const FILL_MIN = 0.42;
const FILL_MAX = 0.72;
/* Product Feature section: short cascade — all cards in ~1 viewport of scrub */
const FEATURE_SCROLL_SCALE = 0.28;
/* Final inclined-to-horizontal handoff only. */
const HORIZONTAL_ROTATE_DURATION = 0.78;
const HORIZONTAL_SETTLE_DURATION = 0.22;
/*
 * Flatten lighting / material toward dismantle PNG (avg orange ~#F1540C):
 * less hot specular, softer key — texture colours stay from the GLB map.
 */
const HANDOFF_LOOK = {
  key:0.72,
  fill:0.50,
  amb:0.78,
  hemi:0.34,
  colorR:0.97,
  colorG:0.94,
  colorB:0.91,
  roughBoost:0.32,
  metalScale:0.2,
  envIntensity:0.18
};
/** Inclined hero — handoff into feature storytelling (scale stays locked) */
const FEATURE_START = {
  opacity:1,
  posX:0,
  posY:0,
  posZ:0,
  scale:METER_HERO_SCALE,
  rotX:4 * DEG,
  rotY:-18 * DEG,
  rotZ:-22 * DEG
};

/*
 * Continuous on-axis showcase spin while callouts fade in.
 * GSAP lerps pose between these targets with linear ease so the meter
 * rotates smoothly across the feature scrub (callouts stay fixed in CSS).
 */
const FEATURE_ROTATIONS = [
  { rotX:4 * DEG, rotY:-18 * DEG, rotZ:-22 * DEG }, /* pH Range */
  { rotX:3 * DEG, rotY:8 * DEG, rotZ:-20 * DEG },   /* Accuracy */
  { rotX:5 * DEG, rotY:34 * DEG, rotZ:-18 * DEG },  /* Temperature */
  { rotX:3 * DEG, rotY:60 * DEG, rotZ:-16 * DEG },  /* Waterproof */
  { rotX:4 * DEG, rotY:86 * DEG, rotZ:-18 * DEG },  /* Glass Probe */
  { rotX:3 * DEG, rotY:112 * DEG, rotZ:-20 * DEG }, /* Operation */
  { rotX:4 * DEG, rotY:138 * DEG, rotZ:-22 * DEG }  /* Durable */
];

/**
 * Floating feature cards (reference layout).
 * Left ×4, Right ×3. Icons sit outside each card.
 * `detail` is used by the mobile-only bottom description carousel.
 */
const FEATURES = [
  {
    id:'ph-range',
    i18n:'home.feature.phRange',
    title:'pH Range',
    pill:'pH Range 0–14',
    desc:'0–14',
    detail:'Measures the full 0–14 pH scale so you can trust every pond and tank reading.',
    iconSrc:'assets/images/icons/features/ph.png',
    side:'left',
    slot:0
  },
  {
    id:'accuracy',
    i18n:'home.feature.accuracy',
    title:'Accuracy',
    pill:'±0.01 Accuracy',
    desc:'±0.2',
    detail:'Lab-grade ±0.01 accuracy helps you catch small shifts before they become costly losses.',
    iconSrc:'assets/images/icons/features/accuracy.png',
    side:'left',
    slot:1
  },
  {
    id:'temperature',
    i18n:'home.feature.atc',
    title:'Fast Response Time',
    pill:'Fast Response',
    desc:'Get stable and accurate pH readings within seconds.',
    detail:'Get stable and accurate pH readings within seconds.',
    iconSrc:'assets/images/icons/features/temperature.png',
    side:'left',
    slot:2
  },
  {
    id:'waterproof',
    i18n:'home.feature.waterproof',
    title:'Waterproof Design',
    pill:'Waterproof Design',
    desc:'For safe and reliable use in water',
    detail:'Built for wet fieldwork — waterproof design for safe, reliable use around ponds and tanks.',
    iconSrc:'assets/images/icons/features/drop.png',
    side:'left',
    slot:3
  },
  {
    id:'glass-probe',
    i18n:'home.feature.glass',
    title:'Glass Electrode Probe',
    pill:'Glass Electrode',
    desc:'High quality glass electrode',
    detail:'A high-quality glass electrode probe delivers sensitive, consistent measurements every time.',
    iconSrc:'assets/images/icons/features/calibration.png',
    side:'right',
    slot:0
  },
  {
    id:'easy-operation',
    i18n:'home.feature.easy',
    title:'User Friendly Operation',
    pill:'Easy Operation',
    desc:'ON/OFF and CAL buttons for easy operation',
    detail:'Simple ON/OFF and CAL controls make everyday testing quick — no complicated setup required.',
    iconSrc:'assets/images/icons/features/power.png',
    side:'right',
    slot:1
  },
  {
    id:'durable',
    i18n:'home.feature.durable',
    title:'Durable & Anti-Corrosive',
    pill:'Durable & Anti-Corrosive',
    desc:'Waterproof body resistant to rust and corrosion',
    detail:'A durable, anti-corrosive body stands up to rust, moisture, and hard farm use season after season.',
    iconSrc:'assets/images/icons/features/durable-anti-corrosive.png',
    side:'right',
    slot:2
  }
];

const ttFeature = (feature, field) => {
  const key = feature.i18n ? `${feature.i18n}.${field}` : '';
  const fallback = feature[field] || '';
  if(!key || !window.TelAquaI18n?.t) return fallback;
  const value = window.TelAquaI18n.t(key);
  return value && value !== key ? value : fallback;
};

const localizedFeature = feature => ({
  ...feature,
  title: ttFeature(feature, 'title'),
  pill: ttFeature(feature, 'pill'),
  desc: ttFeature(feature, 'desc'),
  detail: ttFeature(feature, 'detail')
});

/** Escape text before injecting into callout title HTML. */
function escapeCalloutHtml(s){
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Keep scientific "pH" casing when h3 titles use text-transform:uppercase. */
function protectPhCasing(s){
  return escapeCalloutHtml(s).replace(/pH/g, '<span style="text-transform:none">pH</span>');
}

/**
 * Mobile pills with a short numeric value (e.g. pH Range / 0–14) stack as
 * two lines so the range never wraps mid-number. Desktop stays title-only.
 * Durable stacks as "Durable &" / "Anti-Corrosive" (no mid-word hyphen wrap).
 */
function applyCalloutTitle(titleEl, feature, phone){
  if(!titleEl || !feature) return;
  titleEl.dataset.fullTitle = feature.title;
  titleEl.dataset.pillTitle = feature.pill || feature.title;
  const value = String(feature.desc || '').trim();
  const stackedValue = !!(
    phone &&
    value &&
    value.length <= 12 &&
    /^[±]?\p{Nd}/u.test(value)
  );

  if(phone && feature.id === 'durable'){
    const pill = String(feature.pill || feature.title);
    const ampMatch =
      pill.match(/^(.+?\s*&)\s*(.+)$/) ||
      pill.match(/^(.+?\s+(?:और|ও)\s+)(.+)$/) ||
      pill.match(/^(\S+(?:\s+\S+)?\s+)(.+)$/);
    if(ampMatch){
      titleEl.classList.add('is-stacked');
      const second = ampMatch[2].replace(/-/g, '\u2011');
      titleEl.innerHTML =
        '<span class="product-story-feature-title-line">' + protectPhCasing(ampMatch[1].trim()) + '</span>' +
        '<span class="product-story-feature-title-value">' + escapeCalloutHtml(second) + '</span>';
      return;
    }
  }

  if(stackedValue){
    titleEl.classList.add('is-stacked');
    titleEl.innerHTML =
      '<span class="product-story-feature-title-line">' + protectPhCasing(feature.title) + '</span>' +
      '<span class="product-story-feature-title-value">' + escapeCalloutHtml(value) + '</span>';
  } else {
    titleEl.classList.remove('is-stacked');
    titleEl.innerHTML = protectPhCasing(phone ? (feature.pill || feature.title) : feature.title);
  }
}

function clampTilt(v){
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, v));
}

function clampFill(f){
  return Math.max(FILL_MIN, Math.min(FILL_MAX, f));
}

function createShadowTexture(){
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(20,28,40,0.55)');
  g.addColorStop(0.35, 'rgba(20,28,40,0.22)');
  g.addColorStop(0.7, 'rgba(20,28,40,0.06)');
  g.addColorStop(1, 'rgba(20,28,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ensureSmoothScroll(){
  if(window.TelaquaSmoothScroll?.ensure) return window.TelaquaSmoothScroll.ensure();
  if(window.__telaquaLenis) return window.__telaquaLenis;
  console.warn('[product-model] Shared TelaquaSmoothScroll instance unavailable');
  return null;
}

function collectMaterials(model){
  const out = [];
  model.traverse((obj) => {
    if(!obj.isMesh) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    list.forEach((mat) => {
      if(!mat) return;
      if(mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      if(mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      mat.transparent = true;
      mat.opacity = 0;
      mat.depthWrite = false;
      mat.depthTest = true;
      mat.userData = mat.userData || {};
      mat.userData.baseColorR = mat.color?.r ?? 1;
      mat.userData.baseColorG = mat.color?.g ?? 1;
      mat.userData.baseColorB = mat.color?.b ?? 1;
      mat.userData.baseRough = typeof mat.roughness === 'number' ? mat.roughness : 1;
      mat.userData.baseMetal = typeof mat.metalness === 'number' ? mat.metalness : 0;
      mat.userData.baseEnv = typeof mat.envMapIntensity === 'number' ? mat.envMapIntensity : 1;
      mat.userData.baseEmissiveInt = typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : 1;
      mat.needsUpdate = true;
      out.push(mat);
    });
  });
  return out;
}

function centerModel(model){
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  return size;
}

function fitDistanceForSize(size, camera){
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const fitH = (size.y / 2) / Math.tan(vFov / 2);
  const fitW = ((size.x / 2) / Math.tan(vFov / 2)) / Math.max(camera.aspect, 0.0001);
  return Math.max(fitH, fitW, 0.01);
}

let sharedGltfLoader = null;

function getGltfLoader(){
  if(sharedGltfLoader) return sharedGltfLoader;
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_DECODER_PATH);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  sharedGltfLoader = loader;
  return loader;
}

function loadGltf(url){
  const loader = getGltfLoader();
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function initProductStory(){
  const section = document.querySelector('.product-story');
  const pin = section?.querySelector('.product-story-pin');
  const container = document.getElementById('product-model-canvas');
  const calloutTemplate = document.getElementById('product-story-callout');
  const nameplate = section?.querySelector('.product-story-nameplate');
  const circle = document.querySelector('.product-cinematic .product-story-circle');
  const guide = document.querySelector('.product-cinematic-guide');
  const stage = section?.querySelector('.product-story-stage');
  /* Stage/circle only — guide lead-in offset is handled separately so devices stay put */
  const centeredVisuals = () => [circle, stage].filter(Boolean);

  function guideLeadY(){
    const raw = getComputedStyle(document.querySelector('.product-cinematic') || document.documentElement)
      .getPropertyValue('--ps-guide-lead-y')
      .trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 62;
  }

  function anchorY(){
    const raw = getComputedStyle(document.querySelector('.product-cinematic') || document.documentElement)
      .getPropertyValue('--ps-anchor-y')
      .trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 50;
  }

  function setGuideTop(pct){
    if(!guide) return;
    gsap.set(guide, { top: pct + '%' });
  }

  function syncGuideToPinProgress(progress){
    const lead = guideLeadY();
    const pinY = anchorY();
    const t = Math.max(0, Math.min(1, progress));
    const y = lead + (pinY - lead) * t;
    setGuideTop(y);
    /*
     * Keep the 3D stage inside the ring during lead-in so a settled hero box
     * is visible with the heading — not floating above an empty circle.
     * Once the pin owns the chapter, stage stays at the shared CSS anchor.
     */
    if(stage && !pinActive){
      gsap.set(stage, { top: y + '%' });
      if(nameplate) gsap.set(nameplate, { top: y + '%' });
    }
  }

  if(!section || !pin || !container) return;
  if(typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined'){
    console.warn('GSAP ScrollTrigger required for product story');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ensureSmoothScroll();

  let pinActive = false;

  /* Lead-in: circle sits under the heading; settles to the shared CSS anchor with the pin/devices */
  ScrollTrigger.create({
    id:'product-guide-anchor',
    trigger:pin,
    start:'top 92%',
    end:'top top',
    scrub:true,
    invalidateOnRefresh:true,
    onUpdate:(self) => syncGuideToPinProgress(self.progress),
    onRefresh:(self) => syncGuideToPinProgress(self.progress),
    onLeave:() => {
      const pinY = anchorY();
      setGuideTop(pinY);
      if(stage) gsap.set(stage, { top: pinY + '%' });
      if(nameplate) gsap.set(nameplate, { top: pinY + '%' });
    },
    onLeaveBack:() => {
      const lead = guideLeadY();
      setGuideTop(lead);
      if(stage && !pinActive){
        gsap.set(stage, { top: lead + '%' });
        if(nameplate) gsap.set(nameplate, { top: lead + '%' });
      }
    }
  });
  setGuideTop(guideLeadY());
  if(stage) gsap.set(stage, { top: guideLeadY() + '%' });
  if(nameplate) gsap.set(nameplate, { top: guideLeadY() + '%' });

  /* Multi-callout layer — clones of the template stay stacked during overview */
  let calloutLayer = pin.querySelector('.product-story-callouts');
  if(!calloutLayer){
    calloutLayer = document.createElement('div');
    calloutLayer.className = 'product-story-callouts';
    calloutLayer.setAttribute('aria-hidden', 'true');
    pin.appendChild(calloutLayer);
  }
  if(calloutTemplate){
    calloutTemplate.classList.add('is-hidden');
    calloutTemplate.style.display = 'none';
  }

  const mobileHeading = section.querySelector('.product-story-mobile-heading');
  const mobileDetails = section.querySelector('#product-story-mobile-details');
  const mobileDetailsTrack = section.querySelector('#product-story-md-track');
  const mobileDetailsViewport = mobileDetails
    ? mobileDetails.querySelector('.product-story-md-viewport')
    : null;
  const mobileDetailsPrev = section.querySelector('.product-story-md-nav--prev');
  const mobileDetailsNext = section.querySelector('.product-story-md-nav--next');
  let mobileDetailIndex = 0;
  let mobileDetailsBuilt = false;

  /* Keep mobile heading hidden until feature pages begin (not during unbox pin) */
  if(mobileHeading) gsap.set(mobileHeading, { autoAlpha:0, y:18, visibility:'hidden' });
  if(mobileDetails){
    mobileDetails.hidden = true;
    mobileDetails.setAttribute('aria-hidden', 'true');
    gsap.set(mobileDetails, { autoAlpha:0 });
  }

  const width = () => Math.max(1, container.clientWidth);
  const height = () => Math.max(1, container.clientHeight);
  const isMobile = () => window.matchMedia('(max-width:900px)').matches;
  const isPhone = () => window.matchMedia('(max-width:768px)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, width() / height(), 0.05, 200);
  const lookTarget = new THREE.Vector3(0, 0, 0);
  const _local = new THREE.Vector3();
  const _world = new THREE.Vector3();
  const _ndc = new THREE.Vector3();
  const _screen = { x:0, y:0, ok:false };

  const renderer = new THREE.WebGLRenderer({
    antialias:!isPhone(),
    alpha:true,
    powerPreference:'high-performance'
  });
  function maxPixelRatio(){
    const dpr = window.devicePixelRatio || 1;
    return Math.min(dpr, isPhone() ? 1.25 : 1.5);
  }
  renderer.setPixelRatio(maxPixelRatio());
  renderer.setSize(width(), height(), false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if('useLegacyLights' in renderer) renderer.useLegacyLights = false;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.transform = 'translateZ(0)';
  renderer.domElement.style.willChange = 'transform';
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd0d6de, 0.58);
  hemi.position.set(0, 1, 0);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.12);
  key.position.set(2.2, 3.0, 4.0);
  scene.add(key);
  const fillLight = new THREE.DirectionalLight(0xf2f5f8, 0.36);
  fillLight.position.set(-2.2, 0.5, 1.4);
  scene.add(fillLight);

  const boxRoot = new THREE.Group();
  const meterRoot = new THREE.Group();
  boxRoot.renderOrder = 2;
  meterRoot.renderOrder = 1;
  scene.add(boxRoot);
  scene.add(meterRoot);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({
      map:createShadowTexture(),
      transparent:true,
      opacity:0,
      depthWrite:false
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.55;
  shadow.visible = false;
  scene.add(shadow);

  let meterFitDist = 2.4;
  let boxFitDist = 2.4;
  let baseDist = 2.4;
  let meterHalfH = 0.55;
  let boxHalfH = 0.4;
  let modelSize = new THREE.Vector3(0.2, 1.1, 0.2);
  let ready = false;
  let lastMeterOpacity = -1;
  let lastBoxOpacity = -1;
  let meterMats = [];
  let boxMats = [];
  let storyTl = null;
  let idleMix = 1;
  let needsRender = true;
  let sectionNear = true;
  let idleFrameSkip = 0;

  /* Pause expensive WebGL when Product & Benefits is far off-screen */
  if(typeof IntersectionObserver !== 'undefined' && section){
    const nearIo = new IntersectionObserver(
      (entries) => {
        sectionNear = entries.some((e) => e.isIntersecting);
        if(sectionNear) needsRender = true;
      },
      { root:null, rootMargin:'40% 0px 40% 0px', threshold:0 }
    );
    nearIo.observe(section);
  }

  /** @type {Array<{feature:object, el:HTMLElement, icon:HTMLElement, title:HTMLElement, desc:HTMLElement, layoutKey:string, visible:boolean, mode:string}>} */
  const calloutNodes = [];
  let hoverTilt = 0;
  let mobileCardIndex = 0;

  const pose = {
    opacity:0,
    posX:0,
    posY:-1.35,
    posZ:0,
    scale:0.92,
    rotX:0,
    rotY:0,
    rotZ:0,
    camX:0,
    camY:0,
    camZ:2.4,
    lookY:0,
    key:1.12,
    fill:0.36,
    amb:0.55,
    lookMatch:0,
    shadowOpacity:0.28,
    shadowScale:1
  };

  const boxPose = {
    opacity:0,
    posX:0,
    posY:-1.2,
    posZ:0,
    scale:0.9,
    rotX:0,
    rotY:0,
    rotZ:0
  };

  function setMatsOpacity(mats, opacity, cacheKey){
    const solid = opacity >= 0.995;
    const next = solid ? 1 : Math.max(0, opacity);
    if(cacheKey === 'meter'){
      if(Math.abs(next - lastMeterOpacity) < 0.006) return;
      lastMeterOpacity = next;
    } else {
      if(Math.abs(next - lastBoxOpacity) < 0.006) return;
      lastBoxOpacity = next;
    }
    for(let i = 0; i < mats.length; i++){
      const mat = mats[i];
      mat.opacity = next;
      mat.transparent = !solid;
      /* Box keeps depthWrite when solid so it genuinely occludes the meter */
      mat.depthWrite = next > 0.02;
      mat.depthTest = true;
    }
  }

  function distForFill(fill, fit){
    return (fit || meterFitDist) / clampFill(fill);
  }

  function camFromFeature(){
    /* Keep the inclined hero stable while cards float around it */
    const z = distForFill(METER_INCLINE_FILL, meterFitDist);
    return {
      camX:0,
      camY:0.02,
      camZ:z,
      lookY:0
    };
  }

  function shadowForZoom(camZ){
    const t = THREE.MathUtils.clamp((baseDist * 1.15 - camZ) / (baseDist * 0.45), 0, 1);
    return {
      shadowOpacity: 0.18 + t * 0.22,
      shadowScale: 1.12 - t * 0.28
    };
  }

  function setIconOn(el, feature){
    if(!el) return;
    if(feature.iconSrc){
      el.innerHTML = '<img src="' + feature.iconSrc + '" alt="" width="52" height="52" decoding="async">';
      return;
    }
    el.innerHTML = '';
  }

  function readCssPx(el, name, fallback){
    const raw = getComputedStyle(el).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Floating L/R slots close to the product — phone uses compact cards */
  function getSlotPosition(feature){
    const pinRect = pin.getBoundingClientRect();
    const stageRect = container.getBoundingClientRect();
    const phone = isPhone();
    const gapVert = readCssPx(calloutLayer, '--ps-slot-gap', phone ? 8 : 18);
    const iconW = readCssPx(calloutLayer, '--ps-icon', phone ? 22 : 52);
    const boxW = Math.min(
      phone ? 100 : 260,
      Math.max(phone ? 84 : 160, pinRect.width * (phone ? 0.26 : 0.20))
    );
    const boxH = phone ? 44 : 72;
    const colW = boxW + iconW + (phone ? 8 : 12);

    const stageLeft = stageRect.left - pinRect.left;
    const stageRight = stageRect.right - pinRect.left;
    const stageTop = stageRect.top - pinRect.top;
    const stageH = stageRect.height;
    /*
     * Pull both columns inside the wide circular stage so they orbit the meter
     * itself, matching the compact reference instead of hugging viewport edges.
     */
    const columnInset = phone
      ? Math.min(72, stageRect.width * 0.22)
      : Math.min(150, stageRect.width * 0.19);
    const side = feature.side || 'right';
    const sideCount = side === 'left' ? 4 : 3;
    const slot = Math.max(0, Math.min(sideCount - 1, feature.slot | 0));

    const bandTop = stageTop + stageH * (phone
      ? (side === 'left' ? 0.10 : 0.16)
      : (side === 'left' ? 0.12 : 0.18));
    const usable = Math.max(
      stageH * (phone
        ? (side === 'left' ? 0.58 : 0.48)
        : (side === 'left' ? 0.72 : 0.58)),
      boxH * sideCount + gapVert * (sideCount - 1)
    );
    const step = sideCount <= 1 ? 0 : (usable - boxH) / (sideCount - 1);
    const top = bandTop + slot * Math.max(step, boxH + gapVert);

    let left;
    if(side === 'left'){
      left = stageLeft + columnInset - colW;
    } else {
      left = stageRight - columnInset;
    }

    const pad = phone ? 6 : 16;
    left = Math.max(pad, Math.min(left, pinRect.width - colW - pad));
    /* Leave room for the bottom details carousel + sticky buy bar on phone */
    const bottomPad = phone ? Math.max(140, pinRect.height * 0.28) : pad;
    const clampedTop = Math.max(pad, Math.min(top, pinRect.height - boxH - bottomPad));

    return { left, top:clampedTop, boxW:colW, boxH };
  }

  function layoutCallout(node, force){
    if(node.mode === 'hidden' && !force) return;

    const slot = getSlotPosition(node.feature);
    const side = node.feature.side || 'right';
    const key = side + '|' + node.feature.slot + '|' + Math.round(slot.left) + '|' + Math.round(slot.top) + '|' + (isPhone() ? 'm' : 'd');
    if(!force && key === node.layoutKey) return;
    node.layoutKey = key;

    gsap.set(node.el, {
      left:slot.left,
      top:slot.top,
      bottom:'auto',
      right:'auto',
      width:slot.boxW,
      xPercent:0,
      x:0,
      y:0
    });
  }

  function syncMobileDetailsHeight(animate){
    if(!mobileDetailsViewport || !mobileDetailsTrack) return;
    const slides = mobileDetailsTrack.querySelectorAll('.product-story-md-slide');
    const active = slides[mobileDetailIndex];
    if(!active) return;
    const nextH = Math.ceil(active.getBoundingClientRect().height);
    if(nextH < 1) return;
    if(animate === false){
      mobileDetailsViewport.style.transition = 'none';
      mobileDetailsViewport.style.height = nextH + 'px';
      void mobileDetailsViewport.offsetHeight;
      mobileDetailsViewport.style.transition = '';
    } else {
      mobileDetailsViewport.style.height = nextH + 'px';
    }
  }

  function setMobileDetailIndex(index, animate){
    if(!mobileDetailsTrack || !FEATURES.length) return;
    const max = FEATURES.length - 1;
    mobileDetailIndex = Math.max(0, Math.min(max, index | 0));
    const x = -mobileDetailIndex * 100;
    if(animate === false){
      mobileDetailsTrack.style.transition = 'none';
      mobileDetailsTrack.style.transform = 'translate3d(' + x + '%,0,0)';
      void mobileDetailsTrack.offsetWidth;
      mobileDetailsTrack.style.transition = '';
    } else {
      mobileDetailsTrack.style.transform = 'translate3d(' + x + '%,0,0)';
    }
    syncMobileDetailsHeight(animate);
  }

  function buildMobileDetails(){
    if(!mobileDetails || !mobileDetailsTrack) return;
    mobileDetailsTrack.innerHTML = '';
    if(mobileDetailsViewport){
      mobileDetailsViewport.style.height = '';
    }
    FEATURES.forEach((raw) => {
      const feature = localizedFeature(raw);
      const slide = document.createElement('article');
      slide.className = 'product-story-md-slide';
      slide.dataset.featureId = feature.id;
      const title = document.createElement('h3');
      title.className = 'product-story-md-title';
      title.textContent = feature.title;
      const desc = document.createElement('p');
      desc.className = 'product-story-md-desc';
      desc.textContent = feature.detail || feature.desc || '';
      slide.appendChild(title);
      slide.appendChild(desc);
      mobileDetailsTrack.appendChild(slide);
    });
    mobileDetailsBuilt = true;
    setMobileDetailIndex(0, false);
    requestAnimationFrame(() => syncMobileDetailsHeight(false));
  }

  if(mobileDetailsPrev){
    mobileDetailsPrev.addEventListener('click', () => {
      setMobileDetailIndex(mobileDetailIndex - 1);
    });
  }
  if(mobileDetailsNext){
    mobileDetailsNext.addEventListener('click', () => {
      setMobileDetailIndex(mobileDetailIndex + 1);
    });
  }

  function buildCalloutNodes(){
    calloutLayer.innerHTML = '';
    calloutNodes.length = 0;
    if(!calloutTemplate) return;

    const leftFeatures = FEATURES.filter((f) => f.side === 'left').sort((a, b) => a.slot - b.slot);
    const rightFeatures = FEATURES.filter((f) => f.side === 'right').sort((a, b) => a.slot - b.slot);
    const ordered = leftFeatures.concat(rightFeatures);

    ordered.forEach((raw) => {
      const feature = localizedFeature(raw);
      const el = calloutTemplate.cloneNode(true);
      el.id = 'product-callout-' + feature.id;
      el.removeAttribute('hidden');
      el.style.display = '';
      el.classList.add('is-hidden');
      el.dataset.side = feature.side;
      el.dataset.slot = String(feature.slot);
      el.dataset.featureId = feature.id;

      const title = el.querySelector('.product-story-feature-title');
      const desc = el.querySelector('.product-story-feature-desc');
      const icon = el.querySelector('.product-story-icon');

      if(title){
        applyCalloutTitle(title, feature, isPhone());
      }
      if(desc){
        desc.textContent = feature.desc || '';
        if(feature.desc){
          desc.style.removeProperty('display');
        } else {
          desc.style.display = 'none';
        }
      }
      setIconOn(icon, feature);
      calloutLayer.appendChild(el);

      const card = el.querySelector('.product-story-feature');
      const iconImg = icon ? icon.querySelector('img') : null;
      const pointerLine = el.querySelector('.product-story-pointer-line');
      const pointerDot = el.querySelector('.product-story-pointer-dot');
      if(pointerLine) gsap.set(pointerLine, { scaleX:0, autoAlpha:0 });
      if(pointerDot) gsap.set(pointerDot, { scale:0, autoAlpha:0 });
      const node = {
        feature,
        el,
        icon,
        iconImg,
        card,
        title,
        desc,
        pointerLine,
        pointerDot,
        layoutKey:'',
        visible:false,
        mode:'hidden',
        expanded:false
      };
      calloutNodes.push(node);

      /* Hover uses yPercent / img scale so it never overwrites scrubbed timeline props */
      el.addEventListener('pointerenter', () => {
        if(isPhone() || !pinActive || node.mode !== 'active') return;
        hoverTilt = (feature.side === 'left' ? -2 : 2) * DEG;
        el.classList.add('is-hover');
        if(card) gsap.to(card, { yPercent:-10, duration:0.35, ease:'power2.out' });
        if(iconImg) gsap.to(iconImg, { scale:1.08, duration:0.35, ease:'power2.out' });
      });
      el.addEventListener('pointerleave', () => {
        hoverTilt = 0;
        el.classList.remove('is-hover');
        if(card) gsap.to(card, { yPercent:0, duration:0.35, ease:'power2.out' });
        if(iconImg) gsap.to(iconImg, { scale:1, duration:0.35, ease:'power2.out' });
      });
    });
  }

  /** Derive visibility from live scrubbed opacity — no absolute gsap.set resets */
  function syncCalloutVisibility(node){
    const iconOp = node.icon ? Number(gsap.getProperty(node.icon, 'opacity')) || 0 : 0;
    const cardOp = node.card ? Number(gsap.getProperty(node.card, 'opacity')) || 0 : 0;
    const show = iconOp > 0.02 || cardOp > 0.02;
    const active = cardOp > 0.55;
    node.visible = show;
    node.mode = active ? 'active' : (show ? 'preparing' : 'hidden');
    node.el.classList.toggle('is-hidden', !show);
    node.el.classList.toggle('is-active', active);
    if(show && !node.layoutKey) layoutCallout(node, true);
  }

  function syncAllCallouts(){
    for(let i = 0; i < calloutNodes.length; i++) syncCalloutVisibility(calloutNodes[i]);
  }

  function resetCalloutTimelineState(){
    hoverTilt = 0;
    calloutNodes.forEach((node) => {
      node.visible = false;
      node.mode = 'hidden';
      node.layoutKey = '';
      node.el.classList.add('is-hidden');
      node.el.classList.remove('is-active', 'is-hover', 'is-expanded');
      node.expanded = false;
      gsap.set(node.el, { opacity:1, scale:1, x:0, y:0, filter:'none' });
      if(node.icon) gsap.set(node.icon, { opacity:0, scale:0.86 });
      if(node.iconImg) gsap.set(node.iconImg, { scale:1 });
      if(node.card){
        gsap.set(node.card, {
          opacity:0,
          scale:0.95,
          y:30,
          yPercent:0,
          filter:'blur(8px)'
        });
      }
      if(node.pointerLine) gsap.set(node.pointerLine, { scaleX:0, autoAlpha:0 });
      if(node.pointerDot) gsap.set(node.pointerDot, { scale:0, autoAlpha:0 });
      layoutCallout(node, true);
    });
  }

  const _handoffBox = new THREE.Box3();
  const _handoffPt = new THREE.Vector3();
  const _handoffCorners = [
    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(),
    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
  ];

  function applyMeterLookMatch(t){
    const u = THREE.MathUtils.clamp(t, 0, 1);
    for(let i = 0; i < meterMats.length; i++){
      const mat = meterMats[i];
      if(!mat) continue;
      const br = mat.userData.baseColorR ?? 1;
      const bg = mat.userData.baseColorG ?? 1;
      const bb = mat.userData.baseColorB ?? 1;
      if(mat.color){
        mat.color.setRGB(
          THREE.MathUtils.lerp(br, br * HANDOFF_LOOK.colorR, u),
          THREE.MathUtils.lerp(bg, bg * HANDOFF_LOOK.colorG, u),
          THREE.MathUtils.lerp(bb, bb * HANDOFF_LOOK.colorB, u)
        );
      }
      if(typeof mat.roughness === 'number'){
        mat.roughness = Math.min(
          1,
          THREE.MathUtils.lerp(mat.userData.baseRough ?? 1, (mat.userData.baseRough ?? 1) + HANDOFF_LOOK.roughBoost, u)
        );
      }
      if(typeof mat.metalness === 'number'){
        mat.metalness = THREE.MathUtils.lerp(
          mat.userData.baseMetal ?? 0,
          (mat.userData.baseMetal ?? 0) * HANDOFF_LOOK.metalScale,
          u
        );
      }
      if(typeof mat.envMapIntensity === 'number'){
        mat.envMapIntensity = THREE.MathUtils.lerp(
          mat.userData.baseEnv ?? 1,
          HANDOFF_LOOK.envIntensity,
          u
        );
      }
      if(typeof mat.emissiveIntensity === 'number'){
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.userData.baseEmissiveInt ?? 1,
          (mat.userData.baseEmissiveInt ?? 1) * 0.55,
          u
        );
      }
    }
    hemi.intensity = THREE.MathUtils.lerp(0.58, HANDOFF_LOOK.hemi, u);
  }

  /** Publish live CSS-pixel meter bounds so dismantle frame 001 can match length. */
  function publishMeterHandoff(){
    if(!ready || !container || pose.opacity < 0.5 || !meterRoot.visible){
      if(window.TelAquaMeterHandoff) window.TelAquaMeterHandoff.ready = false;
      return;
    }
    _handoffBox.setFromObject(meterRoot);
    const min = _handoffBox.min;
    const max = _handoffBox.max;
    _handoffCorners[0].set(min.x, min.y, min.z);
    _handoffCorners[1].set(min.x, min.y, max.z);
    _handoffCorners[2].set(min.x, max.y, min.z);
    _handoffCorners[3].set(min.x, max.y, max.z);
    _handoffCorners[4].set(max.x, min.y, min.z);
    _handoffCorners[5].set(max.x, min.y, max.z);
    _handoffCorners[6].set(max.x, max.y, min.z);
    _handoffCorners[7].set(max.x, max.y, max.z);

    const rect = container.getBoundingClientRect();
    if(rect.width < 2 || rect.height < 2){
      if(window.TelAquaMeterHandoff) window.TelAquaMeterHandoff.ready = false;
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for(let i = 0; i < 8; i++){
      _handoffPt.copy(_handoffCorners[i]).project(camera);
      const sx = (_handoffPt.x * 0.5 + 0.5) * rect.width;
      const sy = (-_handoffPt.y * 0.5 + 0.5) * rect.height;
      if(sx < minX) minX = sx;
      if(sx > maxX) maxX = sx;
      if(sy < minY) minY = sy;
      if(sy > maxY) maxY = sy;
    }

    const widthPx = maxX - minX;
    const heightPx = maxY - minY;
    if(!(widthPx > 8) || !(heightPx > 4)){
      if(window.TelAquaMeterHandoff) window.TelAquaMeterHandoff.ready = false;
      return;
    }

    /* Mesh AABB is slightly larger than opaque PNG pixels */
    const visibleScale = 0.985;
    const centerX = rect.left + (minX + maxX) * 0.5;
    const centerY = rect.top + (minY + maxY) * 0.5;
    const next = {
      ready:true,
      width:widthPx * visibleScale,
      height:heightPx * visibleScale,
      centerX,
      centerY,
      stageWidth:rect.width,
      stageHeight:rect.height,
      lookMatch:pose.lookMatch || 0
    };
    /* Pin-local fractions — stable when dismantle pin size ≠ product-story pin */
    if(pin){
      const pinRect = pin.getBoundingClientRect();
      if(pinRect.width > 2 && pinRect.height > 2){
        next.localX = centerX - pinRect.left;
        next.localY = centerY - pinRect.top;
        next.pinW = pinRect.width;
        next.pinH = pinRect.height;
      }
    }
    window.TelAquaMeterHandoff = next;
    /*
     * Freeze the settled horizontal pose so dismantle can keep matching after
     * the WebGL stage is hidden (live publish would otherwise clear ready).
     */
    if((pose.lookMatch || 0) >= 0.9){
      window.TelAquaMeterHandoffLocked = {
        ready:true,
        width:next.width,
        height:next.height,
        centerX:next.centerX,
        centerY:next.centerY,
        localX:next.localX,
        localY:next.localY,
        pinW:next.pinW,
        pinH:next.pinH,
        lookMatch:next.lookMatch
      };
    }
  }

  function applyPose(now){
    /* Soft float / breathe while pinned (feature storytelling) and idle */
    const lookT = THREE.MathUtils.clamp(pose.lookMatch || 0, 0, 1);
    const floatAmt = (pinActive ? 0.65 : idleMix) * (1 - lookT * 0.92);
    const idleFloat = Math.sin(now * 0.00055) * 0.01 * floatAmt;
    const idleRotY = Math.sin(now * 0.00035) * (1.1 * DEG) * floatAmt;
    const idleRotZ = Math.sin(now * 0.00028) * (0.6 * DEG) * floatAmt;
    const breathe = 1 + Math.sin(now * 0.00042) * 0.01 * floatAmt;
    const tilt = hoverTilt * (pinActive ? 1 : 0) * (1 - lookT);

    boxRoot.rotation.set(boxPose.rotX, boxPose.rotY + idleRotY * 0.25, boxPose.rotZ);
    boxRoot.position.set(boxPose.posX, boxPose.posY + idleFloat * 0.35, boxPose.posZ);
    boxRoot.scale.setScalar(boxPose.scale);
    setMatsOpacity(boxMats, boxPose.opacity, 'box');
    boxRoot.visible = boxPose.opacity > 0.02;

    meterRoot.rotation.set(
      pose.rotX,
      pose.rotY + idleRotY + tilt,
      pose.rotZ + idleRotZ
    );
    meterRoot.position.set(pose.posX, pose.posY + idleFloat, pose.posZ);
    meterRoot.scale.setScalar(pose.scale * breathe);
    setMatsOpacity(meterMats, pose.opacity, 'meter');
    meterRoot.visible = pose.opacity > 0.02;

    camera.position.set(pose.camX, pose.camY, pose.camZ);
    lookTarget.set(0, pose.lookY, 0);
    camera.lookAt(lookTarget);

    key.intensity = pose.key;
    fillLight.intensity = pose.fill;
    ambient.intensity = pose.amb;
    applyMeterLookMatch(lookT);
    publishMeterHandoff();

    /* Contact shadow disabled — product feature uses a clean white ground */
    shadow.visible = false;
    shadow.material.opacity = 0;

    if(circle) circle.style.transform = 'translate3d(-50%, -50%, 0)';

    for(let i = 0; i < calloutNodes.length; i++){
      const n = calloutNodes[i];
      if(n.mode !== 'hidden') layoutCallout(n, false);
    }
  }

  function frameMeter(model){
    const size = centerModel(model);
    meterHalfH = size.y / 2;
    modelSize.copy(size);
    meterFitDist = fitDistanceForSize(size, camera);
    baseDist = distForFill(HERO_FILL, meterFitDist);
    pose.camZ = baseDist;
    Object.assign(pose, shadowForZoom(baseDist));
  }

  function frameBox(model){
    const size = centerModel(model);
    boxHalfH = size.y / 2;
    boxFitDist = fitDistanceForSize(size, camera);
  }

  function featureStartCam(){
    const introZ = distForFill(INTRO_FILL, meterFitDist);
    return {
      camX:0,
      camY:0,
      camZ:introZ,
      lookY:0,
      ...shadowForZoom(introZ),
      key:1.18,
      fill:0.34,
      amb:0.56
    };
  }

  /* ========================================================================
   * Product Reveal — box enters, settles, then unveils the meter.
   * This chapter MUST run before Product Features callouts (desktop / tablet).
   * Phone (≤768px): skipped — see addPhoneSkipUnbox().
   * ======================================================================== */
  function addCinematicUnbox(tl){
    const visuals = centeredVisuals();
    const boxFill = isMobile() ? BOX_FILL_MOBILE : BOX_FILL;
    const boxCamZ = distForFill(boxFill, boxFitDist);
    const boxShadow = {
      shadowOpacity:0,
      shadowScale:1
    };
    const hero = BOX_HERO_SCALE;
    const meterHero = METER_HERO_SCALE;
    const meterHeroCam = distForFill(METER_HERO_FILL, meterFitDist);
    const meterInclineCam = distForFill(METER_INCLINE_FILL, meterFitDist);
    const meterStartScale = THREE.MathUtils.clamp(
      (boxHalfH * hero * 0.82) / Math.max(meterHalfH, 0.001),
      0.55,
      0.9
    );

    const soft = 'power2.inOut';
    const softOut = 'power3.out';

    /*
     * Settled hero box at timeline 0 — no opacity-0 entrance scrub.
     * Heading + box are visible together as soon as the pin (or lead-in) shows.
     */
    const R = 1.45;
    const holdDur = 0.06;
    const boxRecedeAt = holdDur;
    const boxRecedeDur = R * 0.5;
    const meterAt = holdDur + R * 0.3;
    const meterDur = R * 0.5;

    /* Keep 3D stage on the shared CSS anchor — do not move the device */
    if(visuals.length) gsap.set(visuals, { top: anchorY() + '%' });
    if(nameplate) gsap.set(nameplate, { autoAlpha:1, top: anchorY() + '%' });
    setGuideTop(anchorY());

    tl.addLabel('reveal');

    /* Camera + settled box ready on first frame (skip empty fade-in scrub) */
    tl.set(pose, {
      camX:0, camY:0.03, camZ:boxCamZ, lookY:0,
      ...boxShadow, key:1.2, fill:0.34, amb:0.56,
      opacity:0,
      posX:0,
      posY:0,
      posZ:-0.2,
      scale:meterStartScale * 0.88,
      rotX:0,
      rotY:0,
      rotZ:0
    }, 'reveal');

    tl.set(boxPose, {
      opacity:1, posX:0, posY:0, posZ:0.06,
      scale:hero, rotX:1.5 * DEG, rotY:22 * DEG, rotZ:0
    }, 'reveal');

    /* Brief hold so first view reads as “box present”, then recede */
    tl.to({}, { duration:holdDur }, 'reveal');

    /* —— Box rotates further, scales down, fades back —— */
    tl.to(boxPose, {
      posX:0,
      posY:0,
      posZ:-0.42,
      rotY:105 * DEG,
      rotX:3 * DEG,
      scale:hero * 0.7,
      opacity:0,
      duration:boxRecedeDur,
      ease:soft
    }, `reveal+=${boxRecedeAt}`);

    /* —— Meter scales + fades in on top (overlap) —— */
    tl.fromTo(pose, {
      opacity:0,
      posX:0,
      posY:0,
      posZ:-0.12,
      scale:meterStartScale * 0.88,
      rotX:0, rotY:0, rotZ:0,
      camX:0, camY:0.02, camZ:boxCamZ * 0.98, lookY:0
    }, {
      opacity:1,
      posX:0,
      posY:0,
      posZ:0,
      scale:meterHero,
      rotX:0, rotY:0, rotZ:0,
      camX:0, camY:0, camZ:meterHeroCam, lookY:0,
      ...shadowForZoom(meterHeroCam),
      key:1.2, fill:0.34, amb:0.56,
      duration:meterDur,
      ease:softOut
    }, `reveal+=${meterAt}`);

    if(nameplate){
      tl.to(nameplate, {
        autoAlpha:0,
        duration:meterDur * 0.55,
        ease:soft
      }, `reveal+=${meterAt + meterDur * 0.25}`);
    }

    /* Incline into feature handoff (unchanged intent) */
    tl.addLabel('incline');
    tl.to(pose, {
      ...FEATURE_START,
      scale:meterHero,
      camX:0, camY:0.02, camZ:meterInclineCam, lookY:0,
      ...shadowForZoom(meterInclineCam),
      key:1.18, fill:0.34, amb:0.56,
      duration:0.85,
      ease:soft
    }, 'incline');

    tl.to({}, { duration:0.08 });
    tl.set(boxPose, {
      opacity:0,
      posX:0,
      posY:0,
      posZ:-0.42,
      scale:hero * 0.7,
      rotY:105 * DEG
    });
  }

  /**
   * Phone only: skip Product Box Reveal — land on Product Features pose.
   * Desktop never calls this.
   */
  function addPhoneSkipUnbox(tl){
    const visuals = centeredVisuals();
    const meterInclineCam = distForFill(METER_INCLINE_FILL, meterFitDist);

    if(visuals.length) gsap.set(visuals, { top: anchorY() + '%' });
    if(nameplate) gsap.set(nameplate, { autoAlpha:0, top: anchorY() + '%' });
    setGuideTop(anchorY());

    boxRoot.visible = false;
    meterRoot.visible = true;

    tl.addLabel('reveal');
    tl.set(boxPose, {
      opacity:0,
      posX:0,
      posY:0,
      posZ:-0.42,
      scale:BOX_HERO_SCALE * 0.7,
      rotX:3 * DEG,
      rotY:105 * DEG,
      rotZ:0
    }, 'reveal');

    tl.set(pose, {
      ...FEATURE_START,
      opacity:1,
      scale:METER_HERO_SCALE,
      camX:0,
      camY:0.02,
      camZ:meterInclineCam,
      lookY:0,
      ...shadowForZoom(meterInclineCam),
      key:1.18,
      fill:0.34,
      amb:0.56,
      lookMatch:0
    }, 'reveal');

    /* Tiny start hold so scrub still has a reveal→feature boundary */
    tl.to({}, { duration:0.04 }, 'reveal');
    tl.addLabel('incline');
  }

  /* ========================================================================
   * Feature beats — floating cards on the master scrub timeline (fully reversible)
   * ======================================================================== */

  function addFeatureBeat(tl, node, index){
    const cam = camFromFeature();
    const sh = shadowForZoom(cam.camZ);
    const label = 'feat-' + node.feature.id;
    const targetRotation = FEATURE_ROTATIONS[index] || FEATURE_START;
    const t = FEATURE_SCROLL_SCALE;
    const beat = 0.42 * t;
    const gap = 0.04 * t;
    const card = node.card || node.el;
    const icon = node.icon;
    const phone = isPhone();

    tl.addLabel(label);

    /*
     * Device only: linear Y-axis spin scrubbed with the feature sequence.
     * Duration covers beat + gap so rotation doesn't freeze between cards.
     * Callouts / circle / watermark are never transformed here.
     */
    const spinDur = beat + gap;
    if(index === 0){
      tl.to(pose, {
        ...FEATURE_START,
        ...targetRotation,
        ...cam,
        ...sh,
        scale:METER_HERO_SCALE,
        key:1.18, fill:0.34, amb:0.56,
        duration:spinDur,
        ease:'none'
      }, label);

      if(phone && mobileHeading){
        tl.fromTo(mobileHeading, {
          autoAlpha:0,
          y:18,
          visibility:'hidden'
        }, {
          autoAlpha:1,
          y:0,
          visibility:'visible',
          duration:0.36 * t,
          ease:'power2.out',
          immediateRender:false
        }, label);
      }
      if(phone && mobileDetails){
        tl.fromTo(mobileDetails, {
          autoAlpha:0
        }, {
          autoAlpha:1,
          duration:0.36 * t,
          ease:'power2.out',
          immediateRender:false,
          onUpdate:() => {
            const a = Number(gsap.getProperty(mobileDetails, 'autoAlpha')) || 0;
            mobileDetails.classList.toggle('is-ready', a > 0.05);
            mobileDetails.setAttribute('aria-hidden', a > 0.05 ? 'false' : 'true');
          }
        }, label);
      }
    } else {
      tl.to(pose, {
        ...FEATURE_START,
        ...targetRotation,
        ...cam,
        ...sh,
        scale:METER_HERO_SCALE,
        duration:spinDur,
        ease:'none'
      }, label);
    }

    /* Icon pops in first — fromTo keeps reverse scrub stable */
    if(icon){
      tl.fromTo(icon, {
        opacity:0,
        scale:0.86
      }, {
        opacity:1,
        scale:1,
        duration:0.18 * t,
        ease:'back.out(1.6)',
        immediateRender:false
      }, label + '+=' + (0.02 * t));
    }

    /* Card fades in at fixed screen position — previous cards stay */
    tl.fromTo(card, {
      opacity:0,
      scale:0.95,
      y:22,
      filter:'blur(6px)'
    }, {
      opacity:1,
      scale:1,
      y:0,
      filter:'blur(0px)',
      duration:0.28 * t,
      ease:'power3.out',
      immediateRender:false
    }, label + '+=' + (0.05 * t));

    tl.to({}, { duration:gap });
  }

  function addFeatureExit(tl){
    const t = isPhone() ? 0.75 : 1;
    tl.addLabel('feat-exit');
    if(mobileHeading && isPhone()){
      tl.to(mobileHeading, {
        autoAlpha:0,
        y:10,
        duration:0.35 * t,
        ease:'power2.in'
      }, 'feat-exit');
    }
    if(isPhone() && mobileDetails){
      tl.to(mobileDetails, {
        autoAlpha:0,
        duration:0.35 * t,
        ease:'power2.in',
        onUpdate:() => {
          const a = Number(gsap.getProperty(mobileDetails, 'autoAlpha')) || 0;
          mobileDetails.classList.toggle('is-ready', a > 0.05);
          mobileDetails.setAttribute('aria-hidden', a > 0.05 ? 'false' : 'true');
        }
      }, 'feat-exit');
    }
    calloutNodes.forEach((node) => {
      const card = node.card || node.el;
      tl.to(card, {
        opacity:0,
        y:24,
        filter:'blur(10px)',
        scale:0.96,
        duration:0.55 * t,
        ease:'power2.in'
      }, 'feat-exit');
      if(node.icon){
        tl.to(node.icon, {
          opacity:0,
          scale:0.86,
          duration:0.4 * t,
          ease:'power2.in'
        }, 'feat-exit');
      }
    });
    tl.to({}, { duration:0.35 * t });
  }

  /* Stage 10 — rotate to horizontal for next section */
  function addHorizontalExit(tl){
    const hz = distForFill(H_FILL, meterFitDist);
    const sh = shadowForZoom(hz);
    const t = isPhone() ? 0.75 : 1;

    tl.addLabel('horizontal')
      .to(pose, {
        opacity:1,
        posX:0, posY:0, posZ:0,
        scale:METER_HERO_SCALE,
        rotX:0, rotY:0, rotZ:-90 * DEG,
        camX:0, camY:0, camZ:hz, lookY:0,
        ...sh,
        key:HANDOFF_LOOK.key,
        fill:HANDOFF_LOOK.fill,
        amb:HANDOFF_LOOK.amb,
        lookMatch:1,
        duration:HORIZONTAL_ROTATE_DURATION * t,
        ease:'power2.inOut'
      }, 'horizontal');

    /* Clean hero frame: hold the horizontal meter with all story copy gone. */
    if(nameplate){
      tl.to(nameplate, {
        autoAlpha:0,
        duration:0.12 * t,
        ease:'power2.out'
      }, `horizontal+=${0.62 * t}`);
    }
    /* Hold settled horizontal look so dismantle can lock size/colour before fade */
    tl.to({}, { duration:HORIZONTAL_SETTLE_DURATION * t });
  }

  function killStory(){
    if(storyTl){
      storyTl.scrollTrigger?.kill();
      storyTl.kill();
      storyTl = null;
    }
    ScrollTrigger.getAll().forEach((st) => {
      if(st.vars?.id === 'product-story') st.kill(true);
    });
  }

  function buildTimeline(){
    killStory();
    buildCalloutNodes();
    resetCalloutTimelineState();

    if(mobileHeading) gsap.set(mobileHeading, { autoAlpha:0, y:18, visibility:'hidden' });
    if(nameplate) gsap.set(nameplate, { autoAlpha:1, top: anchorY() + '%' });
    centeredVisuals().forEach((el) => gsap.set(el, { top: anchorY() + '%' }));
    /* Preserve lead-in vs pin guide offset from the dedicated ScrollTrigger */
    const guideSt = ScrollTrigger.getById('product-guide-anchor');
    syncGuideToPinProgress(guideSt ? guideSt.progress : 0);

    Object.assign(boxPose, {
      /* Settled hero at rest — reverse scrub + lead-in show the box immediately */
      opacity:1, posX:0, posY:0, posZ:0.06,
      scale:BOX_HERO_SCALE, rotX:1.5 * DEG, rotY:22 * DEG, rotZ:0
    });
    boxRoot.visible = true;
    meterRoot.visible = false;
    Object.assign(pose, {
      opacity:0, posX:0, posY:0, posZ:-0.2, scale:0.92,
      rotX:0, rotY:0, rotZ:0,
      camX:0, camY:0.03, camZ:distForFill(isMobile() ? BOX_FILL_MOBILE : BOX_FILL, boxFitDist), lookY:0,
      key:1.2, fill:0.34, amb:0.55,
      lookMatch:0,
      shadowOpacity:0,
      shadowScale:1
    });

    /* Phone: start on Product Features pose — no box on first paint */
    if(isPhone()){
      const meterInclineCam = distForFill(METER_INCLINE_FILL, meterFitDist);
      Object.assign(boxPose, {
        opacity:0, posX:0, posY:0, posZ:-0.42,
        scale:BOX_HERO_SCALE * 0.7, rotX:3 * DEG, rotY:105 * DEG, rotZ:0
      });
      boxRoot.visible = false;
      meterRoot.visible = true;
      Object.assign(pose, {
        ...FEATURE_START,
        opacity:1,
        scale:METER_HERO_SCALE,
        camX:0, camY:0.02, camZ:meterInclineCam, lookY:0,
        ...shadowForZoom(meterInclineCam),
        key:1.18, fill:0.34, amb:0.56,
        lookMatch:0,
        shadowOpacity:0,
        shadowScale:1
      });
      if(nameplate) gsap.set(nameplate, { autoAlpha:0 });
    }
    applyMeterLookMatch(0);
    hideMeterFallback();
    idleMix = 1;
    lastMeterOpacity = -1;
    lastBoxOpacity = -1;

    /*
     * Keep every earlier phase at its established physical pacing while
     * compensating for the quicker feature beats and horizontal handoff.
     */
    /* Compact pin distance — shorter on phone (no box reveal) so scrub ends sooner */
    const scrollLen = () => Math.round(window.innerHeight * (isPhone() ? 2.55 : isMobile() ? 5.0 : 6.8));

    storyTl = gsap.timeline({
      defaults:{ ease:'power2.inOut' },
      onUpdate:() => {
        needsRender = true;
        syncAllCallouts();
      },
      scrollTrigger:{
        id:'product-story',
        trigger:pin,
        pin:true,
        pinSpacing:true,
        pinType:'fixed',
        scrub:true,
        /* Pin at top; settled hero box is already visible at timeline t=0 */
        start:'top top',
        end:() => `+=${scrollLen()}`,
        anticipatePin:1,
        invalidateOnRefresh:true,
        onRefresh:(self) => {
          if(self.pin){
            self.pin.style.overflow = 'visible';
            self.pin.style.willChange = 'transform';
          }
          if(pin) pin.style.overflow = 'visible';
          calloutNodes.forEach((n) => {
            n.layoutKey = '';
            layoutCallout(n, true);
          });
          syncAllCallouts();
          needsRender = true;
        },
        onEnter:() => {
          pinActive = true;
          idleMix = 0;
          needsRender = true;
          if(stage) gsap.set(stage, { top: anchorY() + '%' });
          if(nameplate) gsap.set(nameplate, { top: anchorY() + '%' });
          setGuideTop(anchorY());
          /* Restore if dismantle refresh left inline opacity/visibility:hidden */
          if(container){
            container.style.visibility = '';
            container.style.opacity = '';
          }
          if(stage){
            stage.style.visibility = '';
            stage.style.opacity = '';
          }
        },
        onEnterBack:() => {
          pinActive = true;
          idleMix = 0;
          needsRender = true;
          if(stage) gsap.set(stage, { top: anchorY() + '%' });
          if(nameplate) gsap.set(nameplate, { top: anchorY() + '%' });
          setGuideTop(anchorY());
          if(container){
            container.style.visibility = '';
            container.style.opacity = '';
          }
          if(stage){
            stage.style.visibility = '';
            stage.style.opacity = '';
          }
        },
        onLeave:() => {
          pinActive = false;
          idleMix = 0;
          needsRender = true;
          /*
           * Keep the WebGL meter visible — dismantle-sequence owns the
           * opacity crossfade onto frame 001. Hiding here caused a hard pop.
           */
          if(container){
            container.style.visibility = '';
            container.style.opacity = '';
          }
          publishMeterHandoff();
        },
        onLeaveBack:() => {
          pinActive = false;
          idleMix = 1;
          needsRender = true;
        },
        onUpdate:() => { pinActive = true; idleMix = 0; needsRender = true; }
      }
    });

    if(isPhone()) addPhoneSkipUnbox(storyTl);
    else addCinematicUnbox(storyTl);

    /* Feature block — side callouts on both phone and desktop */
    storyTl.addLabel('feat-settle');
    storyTl.to({}, { duration: isPhone() ? 0.1 : 0.18 });

    if(isPhone() && mobileDetails){
      if(!mobileDetailsBuilt) buildMobileDetails();
      mobileDetails.hidden = false;
      mobileDetails.setAttribute('aria-hidden', 'false');
      gsap.set(mobileDetails, { autoAlpha:0 });
      mobileDetails.classList.remove('is-ready');
    }

    calloutNodes.forEach((node, i) => addFeatureBeat(storyTl, node, i));

    /* Brief hold, then synchronized card exit */
    storyTl.addLabel('feat-hold');
    storyTl.to({}, { duration: isPhone() ? 0.18 : 0.28 });
    addFeatureExit(storyTl);

    addHorizontalExit(storyTl);

    return storyTl;
  }

  function hideMeterFallback(){
    const els = document.querySelectorAll('.product-story-meter-fallback');
    els.forEach((el) => {
      el.classList.add('is-3d-ready');
      el.setAttribute('aria-hidden', 'true');
    });
    document.querySelector('.product-cinematic')?.classList.add('is-device-ready');
  }

  function showMeterFallback(){
    const els = document.querySelectorAll('.product-story-meter-fallback');
    els.forEach((el) => {
      el.classList.add('is-fallback-visible');
      el.classList.remove('is-3d-ready');
      el.removeAttribute('aria-hidden');
    });
    document.querySelector('.product-cinematic')?.classList.remove('is-device-ready');
  }

  let boxLoaded = false;

  /* Load meter independently so Product Features still runs if the box GLB fails */
  const loadModels = isPhone()
    ? loadGltf(METER_URL).then((meterGltf) => ({ boxGltf:null, meterGltf }))
    : Promise.all([
        loadGltf(BOX_URL).catch((err) => {
          console.error('Product box GLB failed to load:', err);
          return null;
        }),
        loadGltf(METER_URL)
      ]).then(([boxGltf, meterGltf]) => ({
        boxGltf,
        meterGltf
      }));

  loadModels
    .then(({ boxGltf, meterGltf }) => {
      if(boxGltf){
        const boxModel = boxGltf.scene;
        boxMats = collectMaterials(boxModel);
        boxRoot.add(boxModel);
        frameBox(boxModel);
        boxLoaded = true;
      } else {
        boxMats = [];
        boxRoot.visible = false;
        boxFitDist = 2.4;
        boxHalfH = 0.4;
        boxLoaded = false;
      }
      const meterModel = meterGltf.scene;
      meterMats = collectMaterials(meterModel);
      meterRoot.add(meterModel);
      frameMeter(meterModel);
      ready = true;
      buildTimeline();
      lastPhoneMode = isPhone();
      requestAnimationFrame(() => {
        hideMeterFallback();
        if(window.TelaquaSmoothScroll?.refresh) window.TelaquaSmoothScroll.refresh();
        else ScrollTrigger.refresh();
        window.dispatchEvent(new CustomEvent('telaqua:product-story-ready'));
      });
    })
    .catch((err) => {
      console.error('Product GLB failed to load:', err);
      showMeterFallback();
    });

  /**
   * Mobile and desktop both use side feature callouts; phone also shows a
   * bottom details carousel. Rebuild when the 768px breakpoint flips so a
   * DevTools / window resize cannot leave the wrong layout stuck.
   */
  let lastPhoneMode = isPhone();
  let breakpointRebuildQueued = false;

  function refreshAfterRebuild(){
    if(window.TelaquaSmoothScroll?.refresh) window.TelaquaSmoothScroll.refresh();
    else {
      ScrollTrigger.refresh();
      window.__telaquaLenis?.resize?.();
    }
  }

  function ensureBoxLoaded(){
    if(boxLoaded || boxRoot.children.length){
      boxLoaded = true;
      return Promise.resolve();
    }
    return loadGltf(BOX_URL).then((boxGltf) => {
      const boxModel = boxGltf.scene;
      boxMats = collectMaterials(boxModel);
      boxRoot.add(boxModel);
      frameBox(boxModel);
      boxLoaded = true;
    });
  }

  function rebuildTimelineForBreakpoint(){
    const nextPhone = isPhone();
    if(nextPhone === lastPhoneMode) return;
    const goingDesktop = !nextPhone;
    lastPhoneMode = nextPhone;
    if(!ready) return;

    const prevProgress = storyTl?.scrollTrigger
      ? Math.min(1, Math.max(0, storyTl.scrollTrigger.progress))
      : 0;

    pinActive = false;
    idleMix = 1;
    if(container){
      container.style.visibility = '';
      container.style.opacity = '';
    }

    const finish = () => {
      buildTimeline();
      requestAnimationFrame(() => {
        refreshAfterRebuild();
        const st = storyTl?.scrollTrigger;
        if(!st) return;
        const scrollY = st.start + prevProgress * (st.end - st.start);
        if(window.TelaquaSmoothScroll?.scrollTo){
          window.TelaquaSmoothScroll.scrollTo(scrollY, { immediate:true, duration:0 });
        } else if(window.__telaquaLenis?.scrollTo){
          window.__telaquaLenis.scrollTo(scrollY, { immediate:true });
        } else {
          window.scrollTo(0, scrollY);
        }
        ScrollTrigger.update();
      });
    };

    if(goingDesktop){
      ensureBoxLoaded().then(finish).catch((err) => {
        console.error('Product box GLB failed on desktop resize:', err);
        finish();
      });
      return;
    }
    finish();
  }

  const phoneMq = window.matchMedia('(max-width:768px)');
  const onPhoneBreakpoint = () => {
    if(breakpointRebuildQueued) return;
    breakpointRebuildQueued = true;
    requestAnimationFrame(() => {
      breakpointRebuildQueued = false;
      rebuildTimelineForBreakpoint();
    });
  };
  if(typeof phoneMq.addEventListener === 'function'){
    phoneMq.addEventListener('change', onPhoneBreakpoint);
  } else if(typeof phoneMq.addListener === 'function'){
    phoneMq.addListener(onPhoneBreakpoint);
  }

  let resizeQueued = false;
  function onResize(){
    /* Breakpoint flip always rebuilds — even while the pin is active */
    if(isPhone() !== lastPhoneMode){
      rebuildTimelineForBreakpoint();
    }

    const w = width();
    const h = height();
    if(camera.aspect !== w / h){
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    if(storyTl?.scrollTrigger?.isActive){
      calloutNodes.forEach((n) => {
        if(n.title) applyCalloutTitle(n.title, n.feature, isPhone());
        n.layoutKey = '';
        layoutCallout(n, true);
      });
      syncAllCallouts();
      if(isPhone() && mobileDetailsBuilt) syncMobileDetailsHeight(false);
      return;
    }

    if(resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      const rw = width();
      const rh = height();
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(maxPixelRatio());
      renderer.setSize(rw, rh, false);
      if(ready){
        const prev = baseDist;
        if(boxRoot.children[0]) frameBox(boxRoot.children[0]);
        if(meterRoot.children[0]) frameMeter(meterRoot.children[0]);
        if(prev > 0){
          const ratio = baseDist / prev;
          pose.camX *= ratio;
          pose.camY *= ratio;
          pose.camZ *= ratio;
        }
      }
      needsRender = true;
      refreshAfterRebuild();
    });
  }
  window.addEventListener('resize', onResize, { passive:true });

  const refreshLocalizedCallouts = () => {
    calloutNodes.forEach((n) => {
      const raw = FEATURES.find((f) => f.id === n.feature.id) || n.feature;
      const feature = localizedFeature(raw);
      n.feature = feature;
      if(n.title) applyCalloutTitle(n.title, feature, isPhone());
      if(n.desc){
        n.desc.textContent = feature.desc || '';
      }
      n.layoutKey = '';
    });
    if(mobileDetailsBuilt) buildMobileDetails();
    requestAnimationFrame(() => {
      calloutNodes.forEach((n) => layoutCallout(n, true));
      if(typeof syncAllCallouts === 'function') syncAllCallouts();
    });
  };
  document.addEventListener('telaqua:i18n-applied', refreshLocalizedCallouts);

  gsap.ticker.add((time) => {
    /* Far off-screen: skip all WebGL work */
    if(!sectionNear && !pinActive) return;

    if(!ready){
      if(needsRender || pinActive){
        renderer.render(scene, camera);
        needsRender = false;
      }
      return;
    }

    const idle = !pinActive && idleMix > 0.05;
    if(!pinActive && !idle && !needsRender) return;

    /* Idle float at half rate when not scrubbing */
    if(idle && !needsRender){
      idleFrameSkip = (idleFrameSkip + 1) % 2;
      if(idleFrameSkip) return;
    }

    applyPose(time * 1000);
    renderer.render(scene, camera);
    needsRender = false;
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initProductStory, { once:true });
} else {
  initProductStory();
}
