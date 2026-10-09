/* Tel-Aqua — Apple-style global nav: flyouts, curtain, mobile menu, footer accordion. */
(() => {
  'use strict';
  const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();

  ready(() => {
    const nav = document.querySelector('.ga-nav');
    if(!nav) return;

    /* Keep the announcement ribbon directly under the global nav (Apple style). */
    const placeRibbon = () => {
      const banner = document.querySelector('.top-banner');
      if(banner && nav.nextElementSibling !== banner) nav.after(banner);
    };
    placeRibbon();
    new MutationObserver(placeRibbon).observe(document.body, { childList:true });

    /* Highlight current page. */
    const page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
    nav.querySelectorAll('.ga-nav__link[data-page]').forEach(a => {
      if(a.dataset.page.split(' ').includes(page)) a.classList.add('is-current');
    });

    /* ---------- Desktop flyouts ---------- */
    const curtain = document.createElement('div');
    curtain.className = 'ga-curtain';
    document.body.appendChild(curtain);
    const isDesktop = () => window.matchMedia('(min-width: 834px)').matches;
    let openId = null, closeTimer = null, openTimer = null;

    const setOpen = id => {
      if(openId === id) return;
      openId = id;
      nav.querySelectorAll('.ga-flyout').forEach(f => f.classList.toggle('is-open', f.dataset.flyout === id));
      nav.querySelectorAll('.ga-nav__item[data-flyout]').forEach(i => {
        const on = i.dataset.flyout === id;
        i.classList.toggle('is-active', on);
        i.querySelector('.ga-nav__link')?.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      nav.classList.toggle('is-flyout-open', !!id);
      curtain.classList.toggle('is-visible', !!id);
    };

    nav.querySelectorAll('.ga-nav__item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        if(!isDesktop()) return;
        clearTimeout(closeTimer);
        clearTimeout(openTimer);
        const id = item.dataset.flyout || null;
        openTimer = setTimeout(() => setOpen(id), openId ? 0 : 120);
      });
      item.addEventListener('focusin', () => { if(isDesktop()) setOpen(item.dataset.flyout || null); });
    });
    const scheduleClose = () => { clearTimeout(openTimer); closeTimer = setTimeout(() => setOpen(null), 160); };
    nav.addEventListener('mouseleave', scheduleClose);
    nav.querySelectorAll('.ga-flyout').forEach(f => f.addEventListener('mouseenter', () => clearTimeout(closeTimer)));
    nav.querySelector('.ga-nav__logo')?.addEventListener('mouseenter', () => setOpen(null));
    nav.querySelector('.ga-nav__tools')?.addEventListener('mouseenter', () => setOpen(null));
    curtain.addEventListener('click', () => setOpen(null));
    document.addEventListener('keydown', e => { if(e.key === 'Escape'){ setOpen(null); closeMenu(); } });

    /* ---------- Mobile menu ---------- */
    const burger = nav.querySelector('.ga-nav__burger');
    const openMenu = () => {
      nav.classList.add('is-menu-open');
      document.documentElement.classList.add('ga-lock');
      burger?.setAttribute('aria-expanded', 'true');
      burger?.setAttribute('aria-label', 'Close menu');
      nav.querySelectorAll('.ga-mobile li').forEach((li, i) => { li.style.transitionDelay = `${Math.min(i, 14) * 22}ms`; });
    };
    function closeMenu(){
      nav.classList.remove('is-menu-open');
      document.documentElement.classList.remove('ga-lock');
      burger?.setAttribute('aria-expanded', 'false');
      burger?.setAttribute('aria-label', 'Open menu');
      nav.querySelectorAll('.ga-mobile li').forEach(li => { li.style.transitionDelay = '0ms'; });
    }
    burger?.addEventListener('click', () => nav.classList.contains('is-menu-open') ? closeMenu() : openMenu());
    nav.querySelectorAll('.ga-mobile a').forEach(a => a.addEventListener('click', closeMenu));
    window.addEventListener('resize', () => { if(isDesktop()) closeMenu(); else setOpen(null); }, { passive:true });

    /* ---------- Footer accordion (mobile) ---------- */
    document.querySelectorAll('.ga-footer__col h3').forEach(h => {
      h.setAttribute('role', 'button');
      h.setAttribute('tabindex', '0');
      const toggle = () => { if(!isDesktop()) h.parentElement.classList.toggle('is-open'); };
      h.addEventListener('click', toggle);
      h.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); } });
    });

    /* ---------- Live prices from the catalog ---------- */
    const catalog = window.TelAquaProducts;
    if(catalog){
      document.querySelectorAll('[data-price-for]').forEach(el => {
        const p = catalog.all.find(x => x.id === el.dataset.priceFor);
        if(p) el.textContent = (el.dataset.pricePrefix || '') + catalog.formatPrice(p.price);
      });
    }
  });
})();
