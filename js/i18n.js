/* Tel-Aqua vanilla i18n — multi-page language engine. */
(() => {
  'use strict';

  /* Namespaced only — never use bare "lang" (collides with other scripts). */
  const STORAGE_KEY = 'telaqua-lang';
  const LEGACY_BARE_KEY = 'lang';
  const DEFAULT_LANG = 'en';
  const SUPPORTED = ['en', 'hi', 'te', 'bn'];
  const LABELS = {
    en: 'English',
    hi: 'हिंदी',
    te: 'తెలుగు',
    bn: 'বাংলা'
  };

  const cache = Object.create(null);
  let current = DEFAULT_LANG;
  let dictionary = Object.create(null);
  let ready = null;

  const normalize = code => {
    const lang = String(code || '').toLowerCase().slice(0, 2);
    return SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
  };

  /** Explicit Tel-Aqua choice only. New visitors → English (no browser sniffing). */
  const getStored = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if(stored) return normalize(stored);
      /* Migrate older primary key so returning users keep their choice. */
      const legacy = localStorage.getItem(LEGACY_BARE_KEY);
      if(legacy){
        const migrated = normalize(legacy);
        if(SUPPORTED.includes(String(legacy || '').toLowerCase().slice(0, 2))){
          localStorage.setItem(STORAGE_KEY, migrated);
          localStorage.removeItem(LEGACY_BARE_KEY);
          return migrated;
        }
      }
      return DEFAULT_LANG;
    }
    catch(e){ return DEFAULT_LANG; }
  };

  const store = code => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
      /* Drop bare "lang" so unrelated values cannot override Tel-Aqua. */
      localStorage.removeItem(LEGACY_BARE_KEY);
    }
    catch(e){ /* ignore */ }
  };

  const resolvePath = () => {
    const scripts = document.getElementsByTagName('script');
    for(let i = scripts.length - 1; i >= 0; i--){
      const src = scripts[i].src || '';
      if(/i18n\.js/.test(src)){
        return src.replace(/js\/i18n\.js.*$/, 'locales/');
      }
    }
    return 'locales/';
  };

  const interpolate = (template, vars) => {
    if(!vars || typeof template !== 'string') return template;
    return template.replace(/\{(\w+)\}/g, (_, key) => (
      vars[key] == null ? `{${key}}` : String(vars[key])
    ));
  };

  const t = (key, vars) => {
    const value = dictionary[key];
    if(value == null){
      return interpolate(key, vars);
    }
    /* Empty string is intentional (e.g. unused hero line) — do not fall back to the key. */
    if(value === ''){
      return '';
    }
    return interpolate(value, vars);
  };

  const setAttr = (el, attr, key) => {
    if(!key) return;
    const value = t(key);
    if(value && value !== key) el.setAttribute(attr, value);
  };

  const applyElement = el => {
    const key = el.getAttribute('data-i18n');
    if(key){
      const raw = dictionary[key];
      const translated = t(key);
      /* Hide empty optional lines instead of painting the i18n key. */
      if(raw === ''){
        if(el.hasAttribute('data-i18n-html')) el.innerHTML = '';
        else el.textContent = '';
      } else if(el.hasAttribute('data-i18n-html')){
        el.innerHTML = translated;
      } else {
        el.textContent = translated;
      }
    }
    setAttr(el, 'placeholder', el.getAttribute('data-i18n-placeholder'));
    setAttr(el, 'aria-label', el.getAttribute('data-i18n-aria-label'));
    setAttr(el, 'title', el.getAttribute('data-i18n-title'));
    setAttr(el, 'alt', el.getAttribute('data-i18n-alt'));
  };

  const apply = root => {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll(
      '[data-i18n],[data-i18n-placeholder],[data-i18n-aria-label],[data-i18n-title],[data-i18n-alt]'
    ).forEach(applyElement);
    document.documentElement.lang = current;
    document.documentElement.setAttribute('data-lang', current);
    document.dispatchEvent(new CustomEvent('telaqua:i18n-applied', {
      detail:{ lang:current }
    }));
  };

  const loadDictionary = async lang => {
    if(cache[lang]) return cache[lang];
    const base = resolvePath();
    const res = await fetch(`${base}${lang}.json`, { cache:'no-cache' });
    if(!res.ok) throw new Error(`Failed to load locale ${lang}`);
    const data = await res.json();
    cache[lang] = data;
    return data;
  };

  const setLanguage = async (code, { reload = false } = {}) => {
    const lang = normalize(code);
    store(lang);
    current = lang;
    dictionary = await loadDictionary(lang);
    if(reload){
      window.location.reload();
      return current;
    }
    apply(document);
    syncSwitcherUI();
    return current;
  };

  const syncSwitcherUI = () => {
    document.querySelectorAll('[data-set-lang]').forEach(btn => {
      const active = btn.getAttribute('data-set-lang') === current;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.lang-switcher').forEach(wrap => {
      wrap.classList.toggle('is-open', false);
      const toggle = wrap.querySelector('.lang-btn');
      if(toggle) toggle.setAttribute('aria-expanded', 'false');
      const menu = wrap.querySelector('.lang-menu');
      if(menu) menu.hidden = true;
    });
  };

  const ensureSwitcherMarkup = () => {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      if(btn.closest('.lang-switcher')) return;
      const wrap = document.createElement('div');
      wrap.className = 'lang-switcher';
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);
      if(!btn.hasAttribute('data-i18n-aria-label')){
        btn.setAttribute('data-i18n-aria-label', 'nav.changeLanguage');
      }
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');

      const menu = document.createElement('ul');
      menu.className = 'lang-menu';
      menu.setAttribute('role', 'listbox');
      menu.hidden = true;
      menu.innerHTML = SUPPORTED.map(code => `
        <li role="none">
          <button type="button" role="option" data-set-lang="${code}" aria-selected="false">${LABELS[code]}</button>
        </li>`).join('');
      wrap.appendChild(menu);
    });
  };

  const bindSwitcher = () => {
    document.addEventListener('click', event => {
      const option = event.target.closest('[data-set-lang]');
      if(option){
        event.preventDefault();
        setLanguage(option.getAttribute('data-set-lang'));
        return;
      }

      const toggle = event.target.closest('.lang-btn');
      if(toggle){
        event.preventDefault();
        const wrap = toggle.closest('.lang-switcher');
        if(!wrap) return;
        const menu = wrap.querySelector('.lang-menu');
        const open = wrap.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if(menu) menu.hidden = !open;
        document.querySelectorAll('.lang-switcher').forEach(other => {
          if(other === wrap) return;
          other.classList.remove('is-open');
          const otherBtn = other.querySelector('.lang-btn');
          const otherMenu = other.querySelector('.lang-menu');
          if(otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          if(otherMenu) otherMenu.hidden = true;
        });
        return;
      }

      if(!event.target.closest('.lang-switcher')){
        document.querySelectorAll('.lang-switcher.is-open').forEach(wrap => {
          wrap.classList.remove('is-open');
          const btn = wrap.querySelector('.lang-btn');
          const menu = wrap.querySelector('.lang-menu');
          if(btn) btn.setAttribute('aria-expanded', 'false');
          if(menu) menu.hidden = true;
        });
      }
    });
  };

  const init = async () => {
    ensureSwitcherMarkup();
    bindSwitcher();
    /* New visitors: no telaqua-lang → English. Do not persist until they pick a language. */
    current = getStored();
    try {
      dictionary = await loadDictionary(current);
    } catch(err){
      console.warn('[i18n]', err);
      current = DEFAULT_LANG;
      dictionary = await loadDictionary(DEFAULT_LANG);
    }
    apply(document);
    syncSwitcherUI();
  };

  ready = init();

  /* Back/forward cache restores the frozen page (JS + DOM) without re-running
     init(). Re-read telaqua-lang and reapply only when it changed elsewhere. */
  window.addEventListener('pageshow', () => {
    const stored = getStored();
    if(stored === current) return;
    setLanguage(stored);
  });

  window.TelAquaI18n = {
    t,
    apply,
    setLanguage,
    getLanguage:() => current,
    ready:() => ready,
    supported: SUPPORTED.slice(),
    labels: { ...LABELS }
  };
})();
