/**
 * Tel-Aqua — 3D without-cap meter fall into water
 *
 * Loaded after dismantle assemble. Driven by water-testing scroll progress.
 * Model: assets/images/ph-meter-no-cap.glb
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const METER_URL = 'assets/images/ph-meter-no-cap.glb';
const DEG = Math.PI / 180;

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function smoothstep(a, b, x) {
  const t = clamp01((x - a) / Math.max(b - a, 1e-6));
  return t * t * (3 - 2 * t);
}

const api = {
  ready: false,
  loading: false,
  visible: false,
  contactAt: 0.48,
  ensure,
  setVisible,
  setProgress,
  resize,
  getContactProgress: () => api.contactAt
};

window.TelAquaMeterFall = api;

let renderer;
let scene;
let camera;
let meterRoot;
let meterFit = 1;
let hostEl;
let canvasEl;
let lastProgress = 0;
let raf = 0;
let needsRender = true;

function isPhone() {
  return window.matchMedia('(max-width:768px)').matches;
}

function mountHost() {
  if (hostEl && canvasEl) return;
  const stage = document.getElementById('water-testing-stage');
  const rig = document.getElementById('wt-meter-rig');
  hostEl = document.getElementById('wt-meter-fall-3d');
  if (!hostEl && (rig || stage)) {
    hostEl = document.createElement('div');
    hostEl.id = 'wt-meter-fall-3d';
    hostEl.className = 'wt-meter-fall-3d';
    hostEl.setAttribute('aria-hidden', 'true');
    (rig || stage).appendChild(hostEl);
  }
  if (!hostEl) return;
  canvasEl = hostEl.querySelector('canvas');
  if (!canvasEl) {
    canvasEl = document.createElement('canvas');
    canvasEl.className = 'wt-meter-fall-canvas';
    hostEl.appendChild(canvasEl);
  }
}

function initThree() {
  if (renderer) return;
  mountHost();
  if (!canvasEl) return;

  renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
  camera.position.set(0, 0.15, 4.2);

  const amb = new THREE.AmbientLight(0xffffff, 0.82);
  const hemi = new THREE.HemisphereLight(0xf5f8ff, 0x8a9098, 0.42);
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(2.4, 3.2, 3.6);
  const fill = new THREE.DirectionalLight(0xdde7ff, 0.45);
  fill.position.set(-2.2, 1.2, 1.8);
  scene.add(amb, hemi, key, fill);
}

function fitMeter(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  root.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  meterFit = 1.55 / maxDim;
  root.scale.setScalar(meterFit);
}

function loadGltf(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(url, resolve, undefined, reject);
  });
}

async function ensure() {
  if (api.ready || api.loading) return api.ready;
  api.loading = true;
  try {
    initThree();
    if (!renderer) {
      api.loading = false;
      return false;
    }
    const gltf = await loadGltf(METER_URL);
    meterRoot = new THREE.Group();
    const model = gltf.scene || gltf.scenes?.[0];
    if (!model) throw new Error('Empty GLB');
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (!m) return;
            if ('metalness' in m) m.metalness = Math.min(m.metalness ?? 0.2, 0.25);
            if ('roughness' in m) m.roughness = Math.max(m.roughness ?? 0.5, 0.42);
            if ('envMapIntensity' in m) m.envMapIntensity = 0.25;
          });
        }
      }
    });
    meterRoot.add(model);
    fitMeter(meterRoot);
    scene.add(meterRoot);
    api.ready = true;
    resize();
    setProgress(lastProgress);
    setVisible(api.visible);
    startLoop();
  } catch (err) {
    console.error('[meter-fall-3d]', err);
  } finally {
    api.loading = false;
  }
  return api.ready;
}

function setVisible(on) {
  api.visible = !!on;
  mountHost();
  if (hostEl) {
    hostEl.classList.toggle('is-visible', api.visible);
    hostEl.style.opacity = api.visible ? '1' : '0';
    hostEl.style.visibility = api.visible ? 'visible' : 'hidden';
  }
  /* Hide 2D meter canvas while 3D fall owns the stage */
  const meter2d = document.getElementById('water-testing-meter');
  if (meter2d) {
    meter2d.style.opacity = api.visible ? '0' : '';
    meter2d.style.visibility = api.visible ? 'hidden' : '';
  }
  needsRender = true;
}

/**
 * @param {number} t 0 = above water (post-assemble), 1 = submerged callout pose
 */
function setProgress(t) {
  lastProgress = clamp01(t);
  if (!api.ready || !meterRoot || !camera) {
    needsRender = true;
    return;
  }

  const p = lastProgress;
  const dive = smoothstep(0.05, 0.92, p);
  const contact = smoothstep(0.4, 0.58, p);
  api.contactAt = 0.48;

  /* Start upright-ish above water → tip into surface → settle half-submerged */
  const y0 = isPhone() ? 0.55 : 0.62;
  const y1 = isPhone() ? -0.38 : -0.42;
  const y = lerp(y0, y1, dive);

  const rotX = lerp(8 * DEG, 18 * DEG, dive);
  const rotY = lerp(-12 * DEG, 8 * DEG, dive);
  const rotZ = lerp(-6 * DEG, 28 * DEG, dive);

  const scaleMul = lerp(1, isPhone() ? 1.12 : 1.18, contact);

  meterRoot.position.set(0, y, 0);
  meterRoot.rotation.set(rotX, rotY, rotZ);
  meterRoot.scale.setScalar(meterFit * scaleMul);

  const camZ = lerp(isPhone() ? 3.6 : 4.2, isPhone() ? 3.2 : 3.7, dive);
  camera.position.set(0, lerp(0.2, -0.05, dive), camZ);
  camera.lookAt(0, lerp(0.1, -0.15, dive), 0);

  needsRender = true;
}

function resize() {
  if (!renderer || !camera || !hostEl) return;
  const w = Math.max(1, hostEl.clientWidth || window.innerWidth);
  const h = Math.max(1, hostEl.clientHeight || window.innerHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  needsRender = true;
}

function startLoop() {
  if (raf) return;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!renderer || !scene || !camera) return;
    if (!api.visible && !needsRender) return;
    if (needsRender || api.visible) {
      renderer.render(scene, camera);
      needsRender = false;
    }
  };
  raf = requestAnimationFrame(tick);
}

window.addEventListener(
  'resize',
  () => {
    resize();
  },
  { passive: true }
);

/* Preload when dismantle region nears end / water-testing approaches */
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
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        resolve();
      }
    }, options);
    io.observe(el);
  });
}

const preloadTarget =
  document.querySelector('.product-dismantle-region') ||
  document.getElementById('water-testing');

whenNear(preloadTarget, { rootMargin: '80% 0px 40% 0px', threshold: 0 }).then(() => {
  ensure();
});

window.addEventListener('telaqua:dismantle-handoff', () => {
  ensure().then(() => {
    setVisible(true);
    setProgress(0);
  });
});
