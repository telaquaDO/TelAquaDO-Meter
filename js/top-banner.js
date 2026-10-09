/* Top announcement marquee — localized via TelAquaI18n + live promo offer. */
(() => {
  const tickSrc = 'assets/images/icons/banner-tick.png?v=4';
  const WA_NUMBER = '918977591115';
  const BULK_WA_MESSAGE =
    'Hello Tel-Aqua, I am interested in placing a bulk order. Please share the bulk pricing and order details.';
  const MESSAGE_KEYS = [
    'banner.msg2',
    'banner.msg3',
    'banner.msg4',
    'banner.msg5',
    'banner.msg6',
    'banner.msg7'
  ];

  const tt = (key, fallback) => {
    const value = window.TelAquaI18n?.t?.(key);
    return value && value !== key ? value : fallback;
  };

  const fallbackMessages = [
    'TRUSTED BY SHRIMP & FISH FARMERS.',
    'MRP ₹2,999',
    'SAVE ₹1,200',
    'USE CODE TA40 — SAVE ₹1,200',
    'LIMITED-TIME OFFER',
    '1-YEAR REPLACEMENT WARRANTY'
  ];

  const discountBannerMessage = () => {
    const social = Boolean(window.TelAquaPromo?.isSocialTraffic?.());
    if(social){
      return tt('banner.discount35', 'DISCOUNT 35%');
    }
    return 'SAVE ₹1,200';
  };

  const promoOfferMessage = () => {
    const offer = window.TelAquaPromo?.getOffer?.();
    if(!offer?.code) return null;
    const save = offer.discount_amount != null
      ? (window.TelAquaPromo.formatInr(offer.discount_amount) || `₹${offer.discount_amount}`)
      : '';
    if(save) return `USE CODE ${offer.code} — SAVE ${save}`.toUpperCase();
    return `USE CODE ${offer.code}`.toUpperCase();
  };

  const bulkOrdersHref = () => {
    const message = tt('banner.bulkOrdersMessage', BULK_WA_MESSAGE);
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const messages = () => {
    const list = MESSAGE_KEYS.map((key, i) => ({
      text: tt(key, fallbackMessages[i])
    }));
    /* banner.msg4 — replace launch price with traffic-source discount */
    list[2] = { text: discountBannerMessage() };
    const offerMsg = promoOfferMessage();
    /* The API offer replaces this fallback once Discounts admin is available. */
    if(offerMsg) list[3] = { text: offerMsg };
    else list[3] = { text: 'USE CODE TA40 — SAVE ₹1,200' };

    list.push({
      text: tt('banner.bulkOrders', 'BULK ORDERS? CONTACT US'),
      href: bulkOrdersHref(),
      cta: true
    });
    return list;
  };

  const body = document.body;
  if(!body) return;

  body.classList.add('page-with-banner');

  const itemMarkup = (item, hidden) => {
    const text = typeof item === 'string' ? item : (item?.text || '');
    const href = typeof item === 'object' && item?.href ? item.href : '';
    const isCta = Boolean(typeof item === 'object' && item?.cta && href);
    const textEl = isCta
      ? `<a class="banner-message-text banner-message-cta" href="${href}" target="_blank" rel="noopener noreferrer"${hidden ? ' tabindex="-1"' : ''}>${text}</a>`
      : `<span class="banner-message-text">${text}</span>`;

    return `
    <span class="banner-message${isCta ? ' banner-message--cta' : ''}"${hidden ? ' aria-hidden="true"' : ''}>
      <img class="banner-tick" src="${tickSrc}" alt="" width="14" height="14" decoding="async">
      ${textEl}
    </span>
  `;
  };

  const sequence = (hidden, list) => list.map((message) => {
    const sep = `<span class="banner-sep" aria-hidden="true">•</span>`;
    return itemMarkup(message, hidden) + sep;
  }).join('');

  const ensureBanner = () => {
    let banner = document.querySelector('.top-banner');
    if(!banner){
      banner = document.createElement('div');
      banner.className = 'top-banner';
      banner.setAttribute('role', 'region');
      const chrome = document.querySelector('.site-chrome');
      const navbar = document.querySelector('.navbar');
      if(chrome) chrome.prepend(banner);
      else if(navbar && navbar.parentNode) navbar.parentNode.insertBefore(banner, navbar);
      else body.prepend(banner);
    }
    banner.setAttribute('aria-label', 'Site announcements');
    const list = messages();
    banner.innerHTML = `
      <div class="banner-viewport">
        <div class="banner-track">
          ${sequence(false, list)}
          ${sequence(true, list)}
        </div>
      </div>
    `;
  };

  const mount = () => {
    ensureBanner();
  };

  const start = () => {
    mount();
    document.addEventListener('telaqua:i18n-applied', mount);
    document.addEventListener('telaqua:promo-updated', mount);
  };

  if(window.TelAquaI18n?.ready){
    window.TelAquaI18n.ready().then(start).catch(start);
  } else if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
