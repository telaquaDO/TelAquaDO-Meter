/* Persistent cart state, badges, product controls, toast, and cart-page rendering. */
(() => {
  'use strict';

  const STORAGE_KEY = 'telaqua-cart-v1';
  const LEGACY_COUPON_KEY = 'telaqua-cart-coupon-v1';
  const MAX_QUANTITY = 9;
  const catalog = () => window.TelAquaProducts;
  const promoApi = () => window.TelAquaPromo;
  const tt = (key, vars) => {
    const value = window.TelAquaI18n?.t?.(key, vars);
    return value && value !== key ? value : key;
  };
  const ttf = (key, fallback) => {
    const value = window.TelAquaI18n?.t?.(key);
    return value && value !== key ? value : fallback;
  };

  const clampQuantity = value => Math.min(MAX_QUANTITY, Math.max(1, Number.parseInt(value, 10) || 1));

  const storageAreas = () => {
    const areas = [];
    try { areas.push(window.localStorage); } catch(error){ /* blocked storage */ }
    try { areas.push(window.sessionStorage); } catch(error){ /* blocked storage */ }
    return areas;
  };

  const readCart = () => {
    for(const storage of storageAreas()){
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if(raw == null || raw === '') continue;
        const stored = JSON.parse(raw);
        if(!Array.isArray(stored) || !stored.length) return [];
        return stored
          .filter(item => item && catalog()?.getById(item.productId))
          .map(item => ({ productId:item.productId, quantity:clampQuantity(item.quantity) }));
      } catch(error){ /* try the next storage area */ }
    }
    return [];
  };

  let cart = readCart();
  let toastTimer = null;
  let couponFeedback = null; /* { type:'success'|'error'|'info', text:string } */
  let couponDraft = '';
  let couponBusy = false;

  /* Drop legacy hardcoded coupon storage (SAVE500). */
  try { localStorage.removeItem(LEGACY_COUPON_KEY); } catch(error){ /* ignore */ }

  const appliedPromo = () => promoApi()?.getApplied?.() || null;
  const suggestedOffer = () => promoApi()?.getOffer?.() || null;

  const subtotalPrice = () => cart.reduce((sum, item) => {
    const product = catalog()?.getById(item.productId);
    if(!product) return sum;
    return sum + product.price * item.quantity;
  }, 0);

  const itemCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);

  /** Full pricing used by cart UI, checkout, and order placement. */
  const getPricing = () => {
    const items = itemCount();
    const catalogSubtotal = subtotalPrice();
    const promo = appliedPromo();
    const qty = Math.max(1, items || 1);
    const promoPricing = promo ? promoApi()?.pricingForQuantity?.(qty) : null;

    if(promo && promoPricing){
      const eligibleItems = cart.filter(item => {
        const product = catalog()?.getById(item.productId);
        return product && (
          promo.original_price != null
            ? product.price === Number(promo.original_price)
            : cart.length === 1
        );
      });
      const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
      const discountPerItem = promo.discount_amount != null
        ? Number(promo.discount_amount)
        : (
          promo.original_price != null && promo.promo_price != null
            ? Number(promo.original_price) - Number(promo.promo_price)
            : (qty ? Number(promoPricing.discount || 0) / qty : 0)
        );
      const discount = Math.min(
        catalogSubtotal,
        Math.max(0, discountPerItem) * eligibleQuantity
      );
      const total = Math.max(0, catalogSubtotal - discount);
      return {
        items,
        subtotal: catalogSubtotal,
        discount,
        total,
        price: total,
        coupon: {
          code: promo.code,
          amount: discount,
          original_price: promo.original_price,
          promo_price: promo.promo_price,
          discount_amount: promo.discount_amount
        }
      };
    }

    return {
      items,
      subtotal: catalogSubtotal,
      discount: 0,
      total: catalogSubtotal,
      price: catalogSubtotal,
      coupon: null
    };
  };

  const totals = () => {
    const pricing = getPricing();
    return { items:pricing.items, price:pricing.total };
  };

  const save = () => {
    for(const storage of storageAreas()){
      try {
        if(!cart.length) storage.removeItem(STORAGE_KEY);
        else storage.setItem(STORAGE_KEY, JSON.stringify(cart));
        break;
      } catch(error){ /* fall back to the next storage area */ }
    }
    renderBadges();
    renderCartPage();
    document.dispatchEvent(new CustomEvent('telaqua:cart-updated', { detail:getPricing() }));
  };

  const add = (productId, quantity = 1) => {
    const product = catalog()?.getById(productId);
    if(!product) return false;
    const amount = clampQuantity(quantity);
    const existing = cart.find(item => item.productId === productId);
    if(existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + amount);
    else cart.push({ productId, quantity:amount });
    save();
    try {
      window.TelAquaTracking?.trackAddToCart?.(product, amount);
    } catch(error){
      /* tracking must never block cart */
    }
    return true;
  };

  const ensureProduct = (productId, quantity = 1) => {
    if(cart.some(item => item.productId === productId)) return true;
    return add(productId, quantity);
  };

  const purchaseCartUrl = productId =>
    `cart.html?add=${encodeURIComponent(productId)}`;

  const redirectToPurchasedCart = productId => {
    window.location.href = purchaseCartUrl(productId);
  };

  const setQuantity = (productId, quantity) => {
    const item = cart.find(entry => entry.productId === productId);
    if(!item) return;
    item.quantity = clampQuantity(quantity);
    save();
  };

  const remove = productId => {
    cart = cart.filter(item => item.productId !== productId);
    if(!cart.length){
      promoApi()?.clearApplied?.();
      couponFeedback = null;
      couponDraft = '';
    }
    save();
  };

  const clear = () => {
    cart = [];
    promoApi()?.clearApplied?.();
    couponFeedback = null;
    couponDraft = '';
    save();
  };

  const applyCoupon = async code => {
    const normalized = String(code || '').trim().toUpperCase();
    couponDraft = normalized;

    if(!normalized){
      couponFeedback = { type:'error', text:tt('cart.coupon.invalid') };
      renderCartPage();
      return { ok:false, message:couponFeedback.text };
    }

    if(!cart.length){
      couponFeedback = { type:'error', text:tt('cart.coupon.needItems') };
      renderCartPage();
      return { ok:false, message:couponFeedback.text };
    }

    if(!promoApi()?.validateCode){
      couponFeedback = { type:'error', text:tt('cart.coupon.invalid') };
      renderCartPage();
      return { ok:false, message:couponFeedback.text };
    }

    couponBusy = true;
    couponFeedback = { type:'info', text:'Applying...' };
    renderCartPage();

    const result = await promoApi().validateCode(normalized);
    couponBusy = false;

    if(!result.ok){
      couponFeedback = { type:'error', text:result.message || tt('cart.coupon.invalid') };
      renderCartPage();
      return { ok:false, message:couponFeedback.text };
    }

    couponDraft = '';
    const discountLabel = promoApi().formatInr?.(result.promo?.discount_amount) || '';
    couponFeedback = {
      type:'success',
      text: result.message || (
        discountLabel
          ? tt('cart.coupon.applied', { amount:discountLabel })
          : `Coupon ${result.promo.code} applied`
      )
    };
    save();
    return { ok:true, message:couponFeedback.text, pricing:getPricing() };
  };

  const removeCoupon = () => {
    /* Keep a removal through refresh; a later manual code can still replace it. */
    promoApi()?.clearApplied?.({ dismissDefault:true });
    couponFeedback = null;
    couponDraft = '';
    save();
  };

  const ensureBadge = link => {
    let badge = link.querySelector('.cart-badge');
    if(!badge){
      badge = document.createElement('span');
      badge.className = 'cart-badge';
      badge.setAttribute('aria-hidden', 'true');
      link.appendChild(badge);
    }
    return badge;
  };

  const renderBadges = () => {
    const count = getPricing().items;
    document.querySelectorAll('a[href="cart.html"] .cart-badge, a[href$="/cart.html"] .cart-badge').forEach(badge => {
      const link = badge.closest('a');
      if(link && !link.classList.contains('cart-icon-link') && !link.classList.contains('icon-btn')){
        badge.remove();
        link.classList.remove('cart-icon-link');
      }
    });
    document.querySelectorAll('a.cart-icon-link, a.icon-btn[href="cart.html"], a.icon-btn[href$="/cart.html"]').forEach(link => {
      const badge = ensureBadge(link);
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.toggle('is-empty', count === 0);
      link.setAttribute(
        'aria-label',
        count
          ? tt(count === 1 ? 'nav.cartWithCountOne' : 'nav.cartWithCount', { count })
          : tt('nav.cartEmpty')
      );
    });
  };

  const showToast = message => {
    let toast = document.querySelector('.cart-toast');
    if(!toast){
      toast = document.createElement('div');
      toast.className = 'cart-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  };

  /* Keep scientific "pH" casing when parent headings use text-transform:uppercase */
  const displayPhName = name => String(name ?? '')
    .replace(/PH(?=02|\b)/g, 'pH')
    .replace(/pH/g, '<span style="text-transform:none">pH</span>');

  const cartLineMarkup = (item, product) => {
    const includedItems = (product.includedItems || []).map(entry => `
      <li>
        <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
        <span>
          ${ttf(entry.key, entry.fallback)}
          ${entry.noteKey ? `<small class="cart-included-note">${ttf(entry.noteKey, entry.noteFallback)}</small>` : ''}
        </span>
      </li>`).join('');
    const identifier = product.sku || product.id;

    return `
    <article class="cart-item" data-cart-product="${product.id}">
      <a class="cart-item-image" href="${product.url}" aria-label="View ${product.name}">
        <img src="${product.image}" alt="${product.name}">
      </a>
      <div class="cart-item-copy">
        <a href="${product.url}"><h2>${displayPhName(product.name)}</h2></a>
        <p>${product.category}</p>
        <p class="cart-product-id">Product ID: ${identifier}</p>
        ${product.description ? `<p class="cart-product-description">${product.description}</p>` : ''}
        ${includedItems ? `
          <div class="cart-included">
            <p class="cart-included-title">${ttf('cart.included.title', "What's included:")}</p>
            <ul class="cart-included-list" aria-label="${ttf('cart.included.title', "What's included:")}">
              ${includedItems}
            </ul>
          </div>` : ''}
        <strong>${catalog().formatPrice(product.price)}</strong>
      </div>
      <div class="cart-quantity" aria-label="Quantity for ${product.name}">
        <button type="button" data-cart-action="decrease" data-product-id="${product.id}" aria-label="${tt('cart.decreaseQty')}">−</button>
        <span aria-live="polite">${item.quantity}</span>
        <button type="button" data-cart-action="increase" data-product-id="${product.id}" aria-label="${tt('cart.increaseQty')}" ${item.quantity >= MAX_QUANTITY ? 'disabled' : ''}>+</button>
      </div>
      <div class="cart-item-subtotal">
        <span>${tt('cart.subtotal')}</span>
        <strong>${catalog().formatPrice(product.price * item.quantity)}</strong>
      </div>
      <button type="button" class="cart-remove" data-cart-action="remove" data-product-id="${product.id}">${tt('cart.remove')}</button>
    </article>`;
  };

  const storageNoteMarkup = () => `
    <aside class="storage-note storage-note--on-light" role="note" aria-label="${tt('footer.note.label')}">
      <span class="storage-note-icon" aria-hidden="true"><i class="fa-solid fa-triangle-exclamation"></i></span>
      <p class="storage-note-text">
        <strong class="storage-note-label">${tt('footer.note.label')}</strong>
        <span>${tt('footer.note.body')}</span>
        <span class="storage-note-accent">${tt('footer.note.accent')}</span>
      </p>
    </aside>`;

  const summaryCouponControlMarkup = pricing => {
    /* Hide input/chip once a coupon is applied — only the applied row remains. */
    if(pricing.coupon) return '';

    const feedback = couponFeedback
      ? `<p class="cart-coupon-feedback cart-coupon-feedback--${couponFeedback.type}" role="status">${couponFeedback.text}</p>`
      : `<p class="cart-coupon-feedback" role="status" aria-live="polite"></p>`;

    const offer = suggestedOffer();
    const offerStatus = promoApi()?.getOfferStatus?.() || 'idle';
    let suggest = '';

    if(offerStatus === 'loading'){
      suggest = `<p class="cart-summary-coupon-hint">Loading offer...</p>`;
    } else if(offer?.code){
      const saveLabel = offer.discount_amount != null
        ? (promoApi().formatInr(offer.discount_amount) || `₹${offer.discount_amount}`)
        : '';
      const hint = saveLabel
        ? `Save ${saveLabel} · Use code: <strong>${offer.code}</strong>`
        : `Use code: <strong>${offer.code}</strong>`;
      suggest = `
        <div class="cart-summary-coupon-suggest">
          <p class="cart-summary-coupon-hint">${hint}</p>
          <button type="button" class="cart-coupon-chip cart-summary-coupon-chip" data-cart-action="apply-coupon-chip" data-coupon-code="${offer.code}" aria-label="Apply coupon ${offer.code}">
            ${offer.code}
          </button>
        </div>`;
    }

    const draftValue = couponDraft || (offer?.code ? offer.code : '');

    return `
      <div class="cart-summary-coupon-control">
        <form class="cart-coupon-form cart-summary-coupon-form" data-cart-coupon-form>
          <label class="visually-hidden" for="cart-coupon-input">${tt('cart.coupon.label')}</label>
          <input
            id="cart-coupon-input"
            class="cart-coupon-input"
            type="text"
            name="coupon"
            placeholder="${tt('cart.coupon.placeholder')}"
            autocomplete="off"
            spellcheck="false"
            value="${draftValue}"
            ${couponBusy ? 'readonly' : ''}
          >
          <button type="submit" class="btn btn-primary cart-coupon-apply" ${couponBusy ? 'disabled aria-busy="true"' : ''}>${couponBusy ? 'Applying...' : tt('cart.coupon.apply')}</button>
        </form>
        ${suggest}
        ${feedback}
      </div>`;
  };

  const summaryMarkup = pricing => {
    const format = catalog().formatPrice;
    const couponControl = summaryCouponControlMarkup(pricing);

    if(pricing.coupon){
      return `
        <aside class="cart-summary">
          <span class="eyebrow">${tt('cart.summary.eyebrow')}</span>
          <div><span>${tt('cart.summary.totalItems')}</span><strong>${pricing.items}</strong></div>
          <div class="cart-summary-subtotal"><span>MRP</span><strong>${format(pricing.subtotal)}</strong></div>
          <div class="cart-summary-coupon">
            <span>
              ${tt('cart.summary.coupon', { code:pricing.coupon.code })}
              <button type="button" class="cart-summary-coupon-remove" data-cart-action="remove-coupon" aria-label="${tt('cart.coupon.removeAria')} ${pricing.coupon.code}">×</button>
            </span>
            <strong>−${format(pricing.discount)}</strong>
          </div>
          <div class="cart-summary-save"><span>You save</span><strong>${format(pricing.discount)}</strong></div>
          <div class="cart-summary-total"><span>${tt('cart.summary.totalPrice')}</span><strong>${format(pricing.total)}</strong></div>
          <a class="btn btn-primary" href="checkout.html">${tt('cart.summary.checkout')}</a>
          <p>${tt('cart.summary.note')}</p>
        </aside>`;
    }

    return `
      <aside class="cart-summary">
        <span class="eyebrow">${tt('cart.summary.eyebrow')}</span>
        <div><span>${tt('cart.summary.totalItems')}</span><strong>${pricing.items}</strong></div>
        <div class="cart-summary-subtotal"><span>MRP</span><strong>${format(pricing.subtotal)}</strong></div>
        ${couponControl}
        <div class="cart-summary-total"><span>${tt('cart.summary.totalPrice')}</span><strong>${format(pricing.total)}</strong></div>
        <a class="btn btn-primary" href="checkout.html">${tt('cart.summary.checkout')}</a>
        <p>${tt('cart.summary.note')}</p>
      </aside>`;
  };

  const cartTrustMarkup = () => `
    <aside class="cart-trust" aria-label="Purchase benefits">
      <div class="cart-trust-item">
        <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
        <div>
          <strong>${ttf('footer.certifiedTitle', 'Certified Product')}</strong>
          <span>${ttf('cart.trust.warranty', '1-year replacement warranty')}</span>
        </div>
      </div>
      <div class="cart-trust-item">
        <i class="fa-solid fa-lock" aria-hidden="true"></i>
        <div>
          <strong>${ttf('cart.trust.secureTitle', 'Secure checkout')}</strong>
          <span>${ttf('cart.trust.secureDesc', 'Encrypted payment via Razorpay')}</span>
        </div>
      </div>
      <div class="cart-trust-item">
        <i class="fa-solid fa-truck-fast" aria-hidden="true"></i>
        <div>
          <strong>${ttf('cart.trust.shippingTitle', 'Free shipping')}</strong>
          <span>${ttf('cart.trust.shippingDesc', 'GST included · Fast dispatch')}</span>
        </div>
      </div>
    </aside>`;

  const calibrationGuidesMarkup = () => `
    <section class="cart-calibration-guides" aria-labelledby="cart-calibration-heading">
      <div class="cart-calibration-copy">
        <span class="cart-calibration-icon" aria-hidden="true"><i class="fa-solid fa-circle-play"></i></span>
        <div>
          <h2 id="cart-calibration-heading">Need help calibrating your meter?</h2>
          <p>Watch our quick calibration guides before using your Tel-Aqua pH Meter with the included pH 4.0, 6.86 and 9.18 solutions.</p>
        </div>
      </div>
      <div class="cart-calibration-actions" aria-label="Calibration video links">
        <a href="https://www.youtube.com/watch?v=mTt_N_XSiHY" target="_blank" rel="noopener noreferrer">
          <span>Calibration guide 1</span>
          <strong><i class="fa-solid fa-play" aria-hidden="true"></i> Watch video</strong>
        </a>
        <a href="https://www.youtube.com/watch?v=rylYplKraMg" target="_blank" rel="noopener noreferrer">
          <span>Calibration guide 2</span>
          <strong><i class="fa-solid fa-play" aria-hidden="true"></i> Watch video</strong>
        </a>
      </div>
    </section>`;

  const renderCartPage = () => {
    const root = document.querySelector('#cart-page');
    if(!root || !catalog()) return;
    const pricing = getPricing();
    if(!cart.length){
      root.innerHTML = `
        <div class="cart-empty">
          <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
          <h1>${tt('cart.emptyTitle')}</h1>
          <p>${tt('cart.emptyBody')}</p>
          <a class="btn btn-primary" href="products.html">${tt('cart.emptyCta')}</a>
        </div>`;
      return;
    }

    const lines = cart.map(item => {
      const product = catalog().getById(item.productId);
      return product ? cartLineMarkup(item, product) : '';
    }).join('');

    root.innerHTML = `
      <div class="cart-layout">
        <div class="cart-primary">
          <div class="cart-list">
            <div class="cart-list-head">
              <div><span class="eyebrow">${tt('cart.eyebrow')}</span><h1>${tt('cart.heading')}</h1></div>
              <button type="button" class="cart-clear" data-cart-action="clear">${tt('cart.clear')}</button>
            </div>
            ${lines}
          </div>
          ${calibrationGuidesMarkup()}
          ${cartTrustMarkup()}
        </div>
        <a class="btn btn-primary cart-checkout-mobile" href="checkout.html">${tt('cart.summary.checkout')}</a>
        ${summaryMarkup(pricing)}
      </div>`;
  };

  const requestedQuantity = button => {
    const purchase = button.closest('[data-product-purchase]');
    return clampQuantity(purchase?.querySelector('[data-product-quantity]')?.value || 1);
  };

  document.addEventListener('submit', event => {
    const formEl = event.target.closest('[data-cart-coupon-form]');
    if(!formEl) return;
    event.preventDefault();
    if(couponBusy) return;
    const input = formEl.querySelector('.cart-coupon-input');
    applyCoupon(input?.value || '');
  });

  document.addEventListener('click', event => {
    const quantityStep = event.target.closest('[data-quantity-step]');
    if(quantityStep){
      const purchase = quantityStep.closest('[data-product-purchase]');
      const input = purchase?.querySelector('[data-product-quantity]');
      if(input){
        const change = quantityStep.dataset.quantityStep === 'increase' ? 1 : -1;
        input.value = clampQuantity((Number.parseInt(input.value, 10) || 1) + change);
      }
      return;
    }

    const orderLink = event.target.closest(
      'a.js-order-link, a.nav-buy, a.floating-buy, a.mobile-sticky-buy__cta, a[href="#order"], a[href="#pricing"], a[href="ph-meter.html#order"], a[href="ph-meter.html#pricing"]'
    );
    if(orderLink){
      if(orderLink.matches('a.nav-buy[href="products.html"]')) return;
      const productId = orderLink.dataset.productId;
      if(!productId) return;
      event.preventDefault();
      if(add(productId, 1)) redirectToPurchasedCart(productId);
      return;
    }

    const addButton = event.target.closest('[data-add-to-cart]');
    if(addButton){
      event.preventDefault();
      const productId = addButton.dataset.productId;
      if(!productId){
        console.error('[cart] Add-to-cart control is missing its product ID.');
        return;
      }
      if(add(productId, requestedQuantity(addButton))){
        const goToCart = addButton.classList.contains('home-pricing-add')
          || Boolean(addButton.closest('.home-pricing'));
        if(goToCart){
          redirectToPurchasedCart(productId);
          return;
        }
        showToast(tt('cart.toast.added'));
      }
      return;
    }

    const buyButton = event.target.closest('[data-buy-now]');
    if(buyButton){
      event.preventDefault();
      const productId = buyButton.dataset.productId;
      if(!productId){
        console.error('[cart] Buy-now control is missing its product ID.');
        return;
      }
      if(add(productId, requestedQuantity(buyButton))){
        redirectToPurchasedCart(productId);
      }
      return;
    }

    const actionButton = event.target.closest('[data-cart-action]');
    if(!actionButton) return;
    const productId = actionButton.dataset.productId;
    const item = cart.find(entry => entry.productId === productId);
    if(actionButton.dataset.cartAction === 'increase' && item) setQuantity(productId, item.quantity + 1);
    if(actionButton.dataset.cartAction === 'decrease' && item){
      if(item.quantity === 1) remove(productId);
      else setQuantity(productId, item.quantity - 1);
    }
    if(actionButton.dataset.cartAction === 'remove') remove(productId);
    if(actionButton.dataset.cartAction === 'clear') clear();
    if(actionButton.dataset.cartAction === 'remove-coupon') removeCoupon();
    if(actionButton.dataset.cartAction === 'apply-coupon-chip'){
      if(couponBusy) return;
      applyCoupon(actionButton.dataset.couponCode || '');
    }
  });

  document.addEventListener('change', event => {
    if(event.target.matches('[data-product-quantity]')) event.target.value = clampQuantity(event.target.value);
  });

  document.addEventListener('telaqua:promo-updated', () => {
    renderCartPage();
    document.dispatchEvent(new CustomEvent('telaqua:cart-updated', { detail:getPricing() }));
  });

  const initialize = () => {
    renderBadges();
    renderCartPage();
  };

  const consumePurchaseIntent = () => {
    const root = document.querySelector('#cart-page');
    if(!root) return;
    const url = new URL(window.location.href);
    const productId = url.searchParams.get('add');
    if(!productId || !catalog()?.getById(productId)) return;
    ensureProduct(productId, 1);
    url.searchParams.delete('add');
    const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
    if(window.history?.replaceState) window.history.replaceState(null, '', cleanUrl);
  };

  const boot = () => {
    consumePurchaseIntent();
    initialize();
    document.addEventListener('telaqua:i18n-applied', initialize);
  };

  if(window.TelAquaI18n?.ready){
    window.TelAquaI18n.ready().then(boot).catch(boot);
  } else if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Rebuild a cart page restored from the browser's back/forward cache. */
  window.addEventListener('pageshow', event => {
    if(!event.persisted || !document.querySelector('#cart-page')) return;
    cart = readCart();
    initialize();
  });

  const getLineItems = () => cart.map(item => {
    const product = catalog()?.getById(item.productId);
    if(!product) return null;
    return {
      productId: product.id,
      sku: product.sku || null,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity,
      url: product.url,
      description: product.description
    };
  }).filter(Boolean);

  window.TelAquaCart = Object.freeze({
    add,
    remove,
    clear,
    setQuantity,
    applyCoupon,
    removeCoupon,
    getCoupon:() => {
      const promo = appliedPromo();
      return promo ? {
        code: promo.code,
        amount: promo.discount_amount,
        original_price: promo.original_price,
        promo_price: promo.promo_price,
        discount_amount: promo.discount_amount
      } : null;
    },
    getItems:() => cart.slice(),
    getLineItems,
    getPricing,
    totals
  });
})();
