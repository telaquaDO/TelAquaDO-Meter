/**
 * Tel-Aqua — Certified & Trusted (under heading) + Trusted-farmers pill (above heading).
 * Certificates: assets/certifications/
 */
(() => {
  'use strict';

  const CERTS = Object.freeze([
    {
      id: 'ce-ctb',
      title: 'CE Certificate',
      category: 'quality',
      body: 'Pen-type pH meter CE conformity assessment',
      file: 'assets/certifications/CTB231221043EX-Pen type 9100-CE_page-JMK 1.pdf',
      number: 'CTB231221043EX',
      issuer: 'IAF / UASL',
      issued: '2023-12-21',
      valid: 'Ongoing'
    },
    {
      id: 'ce-n26',
      title: 'CE Certificate',
      category: 'safety',
      body: 'Product safety & CE marking documentation',
      file: 'assets/certifications/CE-N26011507703E_JMK 1.pdf',
      number: 'CE-N26011507703E',
      issuer: 'Certification Body',
      issued: '2024-01-15',
      valid: 'Ongoing'
    },
    {
      id: 'rohs',
      title: 'RoHS Certificate',
      category: 'environment',
      body: 'Restriction of Hazardous Substances compliance (Tel-Aqua pH Meter)',
      file: 'assets/certifications/ZRC2411227XY-ROHS-C7-JMK-ROHS-1.pdf',
      number: 'ZRC2411227XY',
      issuer: 'RoHS Assessment',
      issued: '2024-11-22',
      valid: 'Ongoing'
    }
  ]);

  const TABS = Object.freeze([
    { id: 'all', labelKey: 'cert.tab.all', fallback: 'All' },
    { id: 'quality', labelKey: 'cert.tab.quality', fallback: 'Quality' },
    { id: 'safety', labelKey: 'cert.tab.safety', fallback: 'Safety' },
    { id: 'environment', labelKey: 'cert.tab.environment', fallback: 'Environment' }
  ]);

  /* Contact hero: no Certified & Trusted pill / Trusted-by card */
  const BANNER_SELECTORS = [
    '.hero-slide',
    '.cal-hero-banner',
    '.about-hero-banner',
    '.about-hero',
    '.hero.cal-hero-banner',
    '.hero.about-hero-banner'
  ].join(',');

  const tt = (key, fallback) => {
    const value = window.TelAquaI18n?.t?.(key);
    return value && value !== key ? value : (fallback || key);
  };

  let activeTab = 'all';
  let overlay;
  let panel;
  let view = 'mini';
  let selectedId = null;
  let bound = false;

  const filteredCerts = () => (
    activeTab === 'all'
      ? CERTS.slice()
      : CERTS.filter(c => c.category === activeTab)
  );

  const ensureOverlay = () => {
    if(overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'ta-cert-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = '<div class="ta-cert-modal" data-cert-panel></div>';
    document.body.appendChild(overlay);
    panel = overlay.querySelector('[data-cert-panel]');

    overlay.addEventListener('click', event => {
      if(event.target === overlay) closeModal();
    });

    document.addEventListener('keydown', event => {
      if(event.key === 'Escape' && overlay.classList.contains('is-open')) closeModal();
    });

    return overlay;
  };

  const closeModal = () => {
    ensureOverlay().classList.remove('is-open');
    document.body.style.overflow = '';
    view = 'mini';
    selectedId = null;
  };

  const openModal = (nextView = 'mini') => {
    ensureOverlay();
    view = nextView;
    renderPanel();
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  const renderMini = () => `
    <div class="ta-cert-modal__head">
      <h2 class="ta-cert-modal__title">${tt('cert.mini.title', 'Certified & Trusted')}</h2>
      <button type="button" class="ta-cert-modal__close" data-cert-close aria-label="${tt('cert.close', 'Close')}">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
    <div class="ta-cert-modal__body">
      <div class="ta-cert-mini">
        <div class="ta-cert-mini__icon" aria-hidden="true"><i class="fa-solid fa-shield-halved"></i></div>
        <h3 class="ta-cert-mini__heading">${tt('cert.mini.heading', 'Certified for Quality. Trusted by Farmers.')}</h3>
        <p class="ta-cert-mini__text">${tt('cert.mini.text', 'Our products are tested & certified by national & international standards.')}</p>
        <button type="button" class="ta-cert-mini__cta" data-cert-view-grid>
          ${tt('cert.mini.cta', 'View Certificates')}
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;

  const renderGrid = () => {
    const cards = filteredCerts().map(cert => `
      <button type="button" class="ta-cert-card" data-cert-open="${cert.id}">
        <div class="ta-cert-card__thumb" aria-hidden="true"><i class="fa-solid fa-file-pdf"></i></div>
        <p class="ta-cert-card__name">${cert.title}</p>
        <p class="ta-cert-card__meta">${cert.body}</p>
      </button>
    `).join('') || `<p class="ta-cert-grid-sub">${tt('cert.grid.empty', 'No certificates in this category yet.')}</p>`;

    const tabs = TABS.map(tab => `
      <button type="button" class="ta-cert-tab${activeTab === tab.id ? ' is-active' : ''}" data-cert-tab="${tab.id}">
        ${tt(tab.labelKey, tab.fallback)}
      </button>
    `).join('');

    return `
      <div class="ta-cert-modal__head">
        <h2 class="ta-cert-modal__title">${tt('cert.grid.title', 'Our Certifications')}</h2>
        <button type="button" class="ta-cert-modal__close" data-cert-close aria-label="${tt('cert.close', 'Close')}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="ta-cert-modal__body">
        <p class="ta-cert-grid-sub">${tt('cert.grid.sub', 'Tested. Certified. Trusted.')}</p>
        <div class="ta-cert-tabs">${tabs}</div>
        <div class="ta-cert-grid">${cards}</div>
        <div class="ta-cert-footer">
          <span><i class="fa-solid fa-globe" aria-hidden="true"></i> ${tt('cert.footer.intl', 'International Standards')}</span>
          <span><i class="fa-solid fa-flask" aria-hidden="true"></i> ${tt('cert.footer.lab', 'Lab Tested')}</span>
          <span><i class="fa-solid fa-certificate" aria-hidden="true"></i> ${tt('cert.footer.quality', 'Quality Assured')}</span>
          <span><i class="fa-solid fa-handshake" aria-hidden="true"></i> ${tt('cert.footer.farmers', 'Farmer Trusted')}</span>
        </div>
      </div>
    `;
  };

  const renderDetail = () => {
    const cert = CERTS.find(c => c.id === selectedId) || CERTS[0];
    return `
      <div class="ta-cert-modal__head">
        <h2 class="ta-cert-modal__title">${cert.title}</h2>
        <button type="button" class="ta-cert-modal__close" data-cert-close aria-label="${tt('cert.close', 'Close')}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="ta-cert-modal__body">
        <div class="ta-cert-detail">
          <div class="ta-cert-detail__preview">
            <iframe title="${cert.title}" src="${encodeURI(cert.file)}#toolbar=0" loading="lazy"></iframe>
          </div>
          <div class="ta-cert-detail__meta">
            <h3>${cert.title}</h3>
            <p>${cert.body}</p>
            <ul class="ta-cert-detail__list">
              <li><span>${tt('cert.detail.number', 'Certificate No')}</span><strong>${cert.number}</strong></li>
              <li><span>${tt('cert.detail.issuer', 'Certification Body')}</span><strong>${cert.issuer}</strong></li>
              <li><span>${tt('cert.detail.issued', 'Issue Date')}</span><strong>${cert.issued}</strong></li>
              <li><span>${tt('cert.detail.valid', 'Valid Until')}</span><strong>${cert.valid}</strong></li>
            </ul>
            <div class="ta-cert-detail__actions">
              <button type="button" class="ta-cert-back" data-cert-back>
                <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                ${tt('cert.detail.back', 'Back')}
              </button>
              <a class="ta-cert-download" href="${encodeURI(cert.file)}" download target="_blank" rel="noopener noreferrer">
                <i class="fa-solid fa-download" aria-hidden="true"></i>
                ${tt('cert.detail.download', 'Download Certificate')}
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderPanel = () => {
    ensureOverlay();
    panel.className = 'ta-cert-modal' + (view === 'mini' ? '' : ' ta-cert-modal--wide');
    if(view === 'mini') panel.innerHTML = renderMini();
    else if(view === 'detail') panel.innerHTML = renderDetail();
    else panel.innerHTML = renderGrid();

    panel.querySelector('[data-cert-close]')?.addEventListener('click', closeModal);
    panel.querySelector('[data-cert-view-grid]')?.addEventListener('click', () => {
      view = 'grid';

      renderPanel();

    });
    panel.querySelector('[data-cert-back]')?.addEventListener('click', () => {
      view = 'grid';
      selectedId = null;
      renderPanel();
    });
    panel.querySelectorAll('[data-cert-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-cert-tab') || 'all';
        renderPanel();
      });
    });
    panel.querySelectorAll('[data-cert-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedId = btn.getAttribute('data-cert-open');
        view = 'detail';
        renderPanel();
      });
    });
  };

  const makeTrustPill = () => {
    const pill = document.createElement('div');
    pill.className = 'ta-trust-pill';
    const label = tt('cert.badge.text', 'Trusted by Shrimp & Fish Farmers across India');
    pill.setAttribute('aria-label', tt('cert.badge.aria', 'Trusted by farmers'));
    pill.innerHTML = `
      <span class="ta-trust-pill__icon" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
      <span class="ta-trust-pill__text">${label}</span>
    `;
    return pill;
  };

  const makeCertTrigger = () => {
    const slot = document.createElement('div');
    slot.className = 'ta-cert-banner-slot';
    slot.innerHTML = `
      <button type="button" class="ta-cert-trigger" data-cert-open-mini aria-haspopup="dialog">
        <span class="ta-cert-trigger__icon" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
        <span>${tt('cert.trigger', 'Certified & Trusted')}</span>
      </button>
    `;
    return slot;
  };

  const findHeadingAnchor = host => {
    const copy =
      host.querySelector('.hero-slide-copy--left') ||
      host.querySelector('.about-hero-copy') ||
      host.querySelector('.contact-hero-copy') ||
      host.querySelector('.cal-hero-banner-copy') ||
      host.querySelector('.hero-slide-copy') ||
      null;

    if(!copy) return null;

    const heading =
      copy.querySelector('.hero-slide-heading') ||
      copy.querySelector('.cal-hero-heading') ||
      copy.querySelector('h1') ||
      copy.querySelector('h2') ||
      null;

    return { copy, heading };
  };

  const injectOnBanners = () => {
    document.querySelectorAll(BANNER_SELECTORS).forEach(host => {
      const style = getComputedStyle(host);
      if(style.position === 'static') host.style.position = 'relative';

      /* Remove legacy right-side bottom trust card + outdated PNG/CSS pills */
      host.querySelectorAll('.ta-trust-badge').forEach(el => el.remove());
      host.querySelectorAll('.ta-trust-pill').forEach(el => {
        if(!el.querySelector('.ta-trust-pill__text')) el.remove();
      });

      const anchor = findHeadingAnchor(host);

      /* Trust pill — top of heading on every banner */
      if(!host.querySelector('.ta-trust-pill')){
        const pill = makeTrustPill();
        if(anchor?.heading){
          anchor.heading.insertAdjacentElement('beforebegin', pill);
        } else if(anchor?.copy){
          anchor.copy.prepend(pill);
        } else {
          host.prepend(pill);
        }
      }

      /* Certified & Trusted — directly under the banner heading */
      if(host.querySelector('.ta-cert-banner-slot')) return;

      const slot = makeCertTrigger();

      if(anchor?.heading){
        anchor.heading.insertAdjacentElement('afterend', slot);
      } else if(anchor?.copy){
        anchor.copy.appendChild(slot);
      } else {
        host.appendChild(slot);
      }
    });
  };

  const wireFooterCertified = () => {
    document.querySelectorAll('.footer-trust-item').forEach(item => {
      const isCertified = item.querySelector('[data-i18n="footer.certifiedTitle"]');
      if(!isCertified) return;
      item.classList.add('footer-trust-item--cert');
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('data-cert-open-mini', '');
      if(!item.getAttribute('aria-label')){
        item.setAttribute('aria-label', tt('cert.trigger', 'Certified & Trusted'));
      }
    });
  };

  const bindTriggers = () => {
    if(bound) return;
    bound = true;
    document.addEventListener('click', event => {
      const btn = event.target.closest('[data-cert-open-mini]');
      if(!btn) return;
      event.preventDefault();
      openModal('mini');
    });
    document.addEventListener('keydown', event => {
      if(event.key !== 'Enter' && event.key !== ' ') return;
      const btn = event.target.closest('.footer-trust-item--cert[data-cert-open-mini]');
      if(!btn) return;
      event.preventDefault();
      openModal('mini');
    });
  };

  const refreshI18nBits = () => {
    const label = tt('cert.badge.text', 'Trusted by Shrimp & Fish Farmers across India');
    document.querySelectorAll('.ta-trust-pill__text').forEach(el => {
      el.textContent = label;
    });
    document.querySelectorAll('.ta-trust-pill').forEach(el => {
      el.setAttribute('aria-label', tt('cert.badge.aria', 'Trusted by farmers'));
    });
    document.querySelectorAll('.ta-cert-trigger span:not(.ta-cert-trigger__icon)').forEach(el => {
      el.textContent = tt('cert.trigger', 'Certified & Trusted');
    });
    document.querySelectorAll('.footer-trust-item--cert').forEach(el => {
      el.setAttribute('aria-label', tt('cert.trigger', 'Certified & Trusted'));
    });
    if(overlay?.classList.contains('is-open')) renderPanel();
  };

  const boot = () => {
    injectOnBanners();
    wireFooterCertified();
    bindTriggers();
    document.addEventListener('telaqua:i18n-applied', () => {
      injectOnBanners();
      wireFooterCertified();
      refreshI18nBits();
    });
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.TelAquaCertifications = Object.freeze({
    open: openModal,
    close: closeModal,
    reinject: injectOnBanners,
    CERTS
  });
})();
