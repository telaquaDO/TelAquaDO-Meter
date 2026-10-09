/* Checkout page UI, validation, and place-order orchestration. */
(() => {
  'use strict';

  const form = () => document.querySelector('#checkout-form');
  const summaryRoot = () => document.querySelector('#checkout-summary');
  const storageSlot = () => document.querySelector('#checkout-storage-slot');
  const alertRoot = () => document.querySelector('#checkout-alert');

  const catalog = () => window.TelAquaProducts;
  const cartApi = () => window.TelAquaCart;
  const ordersApi = () => window.TelAquaOrders;
  const razorpayApi = () => window.TelAquaRazorpay;
  const trackingApi = () => window.TelAquaTracking;

  const isCheckoutHtmlPage = () => {
    const page = String(window.location.pathname || '').split('/').pop() || '';
    return page === 'checkout.html' || page === 'checkout';
  };

  const attributionFields = () => {
    try {
      return trackingApi()?.getAttributionForOrder?.() || {};
    } catch(error){
      return {};
    }
  };

  const checkoutEcommerceItems = lines => (lines || []).map(item => ({
    item_id: item.productId,
    item_name: item.name,
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1
  }));

  const trackingUserData = values => ({
    email: values.email || undefined,
    phone: trackingApi()?.normalizeE164?.(values.mobile),
    first_name: String(values.fullName || '').trim().split(/\s+/)[0] || undefined,
    city: values.city || undefined,
    region: values.state || undefined,
    postal_code: values.pincode || undefined,
    country: 'IN'
  });
  const tt = (key, vars) => {
    const value = window.TelAquaI18n?.t?.(key, vars);
    return value && value !== key ? value : key;
  };
  const tFallback = (key, fallback) => {
    const value = window.TelAquaI18n?.t?.(key);
    return value && value !== key ? value : fallback;
  };

  let isSubmitting = false;
  let pincodeLookupState = 'idle';
  let lastLookedUpPincode = '';
  let pincodeLookupToken = 0;
  /** Single invoice poll controller for order-success (cleared on stop / re-init). */
  let invoicePollTimer = null;
  let invoicePollActive = false;
  let invoiceRetryBound = false;
  /** Prevents duplicate loops across i18n re-renders; cleared only by Try Again. */
  let invoicePollSessionKey = '';
  let invoiceFinalState = '';

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  /* Keep scientific "pH" casing when parent headings use text-transform:uppercase */
  const displayPhName = name => escapeHtml(name)
    .replace(/PH(?=02|\b)/g, 'pH')
    .replace(/pH/g, '<span style="text-transform:none">pH</span>');

  const showAlert = (message, type = 'error') => {
    const el = alertRoot();
    if(!el) return;
    el.hidden = !message;
    el.textContent = message || '';
    el.className = `checkout-alert checkout-alert--${type}`;
    el.style.whiteSpace = message && message.includes('\n') ? 'pre-line' : '';
    if(message) el.focus?.();
  };

  const pincodeLookupMessage = () =>
    tt('checkout.error.pincodeLookup') || 'Invalid pincode. Enter City and State manually.';

  const isPincodeVerified = values => {
    const pin = (values || getFormData()).pincode;
    return pincodeLookupState === 'valid'
      && lastLookedUpPincode === pin
      && /^\d{6}$/.test(pin);
  };

  const clearFieldErrors = () => {
    document.querySelectorAll('.checkout-field.is-invalid').forEach(field => {
      if(field.getAttribute('data-field') === 'pincode' && pincodeLookupState === 'invalid') return;
      field.classList.remove('is-invalid');
    });
    document.querySelectorAll('[data-field-error]').forEach(el => {
      if(el.getAttribute('data-field-error') === 'pincode' && pincodeLookupState === 'invalid') return;
      el.textContent = '';
    });
  };

  const setFieldError = (name, message) => {
    const field = document.querySelector(`[data-field="${name}"]`);
    const error = document.querySelector(`[data-field-error="${name}"]`);
    if(field) field.classList.add('is-invalid');
    if(error) error.textContent = message;
  };

  const normalizeMobile = raw => {
    let digits = String(raw || '').replace(/\D/g, '');
    if(digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if(digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits.slice(0, 10);
  };

  const getFormData = () => {
    const data = new FormData(form());
    const addressLine1 = String(data.get('addressLine1') || '').trim();
    const addressLine2 = String(data.get('addressLine2') || '').trim();
    const address = [addressLine1, addressLine2].filter(Boolean).join(', ');
    return {
      fullName: String(data.get('fullName') || '').trim(),
      mobile: normalizeMobile(String(data.get('mobile') || '')),
      email: String(data.get('email') || '').trim(),
      addressLine1,
      addressLine2,
      address,
      city: String(data.get('city') || '').trim(),
      state: String(data.get('state') || '').trim(),
      pincode: String(data.get('pincode') || '').replace(/\D/g, '').slice(0, 6),
      paymentMethod: String(data.get('paymentMethod') || 'online'),
      whatsappOptIn: data.get('whatsappOptIn') === '1'
    };
  };

  const clearFieldError = name => {
    if(name === 'pincode' && pincodeLookupState === 'invalid') return;
    const field = document.querySelector(`[data-field="${name}"]`);
    const error = document.querySelector(`[data-field-error="${name}"]`);
    if(field) field.classList.remove('is-invalid');
    if(error) error.textContent = '';
  };

  const validateField = (name, values) => {
    const v = values || getFormData();
    switch(name){
      case 'fullName':
        return v.fullName ? '' : tt('checkout.error.fullName');
      case 'mobile':
        return /^\d{10}$/.test(v.mobile)
          ? ''
          : (tt('checkout.error.mobile') || 'Enter a valid 10-digit mobile number');
      case 'email':
        if(!v.email) return '';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)
          ? ''
          : tt('checkout.error.email');
      case 'addressLine1':
        return v.addressLine1 ? '' : (tt('checkout.error.addressLine1') || tt('checkout.error.address'));
      case 'addressLine2':
        return v.addressLine2 ? '' : (tt('checkout.error.addressLine2') || 'Address Line 2 is required.');
      case 'pincode':
        if(!/^\d{6}$/.test(v.pincode)) return tt('checkout.error.pincode');
        if(pincodeLookupState === 'valid' && lastLookedUpPincode === v.pincode) return '';
        if(pincodeLookupState === 'loading' && lastLookedUpPincode === v.pincode) return '';
        if(pincodeLookupState === 'invalid') return pincodeLookupMessage();
        return '';
      case 'city':
        return v.city ? '' : tt('checkout.error.city');
      case 'state':
        return v.state ? '' : tt('checkout.error.state');
      case 'paymentMethod':
        return (v.paymentMethod === 'online' || v.paymentMethod === 'cod')
          ? ''
          : tt('checkout.error.payment');
      default:
        return '';
    }
  };

  const validate = values => {
    const v = values || getFormData();
    const errors = {};
    ['fullName', 'mobile', 'email', 'addressLine1', 'addressLine2', 'pincode', 'city', 'state', 'paymentMethod']
      .forEach(key => {
        const message = validateField(key, v);
        if(message) errors[key] = message;
      });
    if(!errors.pincode && !isPincodeVerified(v)){
      errors.pincode = pincodeLookupMessage();
    }
    return errors;
  };

  const requiredValid = values => {
    const v = values || getFormData();
    return ['fullName', 'mobile', 'addressLine1', 'addressLine2', 'pincode', 'city', 'state']
      .every(key => !validateField(key, v)) && isPincodeVerified(v);
  };


  const updateSubmitEnabled = () => {
    const submit = document.querySelector('[data-place-order]');
    if(!submit) return;
    const lines = cartApi()?.getLineItems?.() || [];
    const ok = lines.length > 0 && requiredValid() && !isSubmitting;
    submit.disabled = !ok;
    submit.setAttribute('aria-disabled', ok ? 'false' : 'true');
  };

  const setPincodeLoading = loading => {
    const spinner = document.querySelector('.checkout-pincode-spinner');
    if(spinner) spinner.hidden = !loading;
  };

  const clearCityState = () => {
    const cityInput = form()?.querySelector('[name="city"]');
    const stateInput = form()?.querySelector('[name="state"]');
    if(cityInput){
      cityInput.value = '';
      cityInput.classList.remove('is-autofilled');
      cityInput.readOnly = true;
    }
    if(stateInput){
      stateInput.value = '';
      stateInput.classList.remove('is-autofilled');
      stateInput.readOnly = true;
    }
  };

  const markPincodeInvalid = () => {
    pincodeLookupState = 'invalid';
    setFieldError('pincode', pincodeLookupMessage());
    clearCityState();
    updateSubmitEnabled();
  };

  const resetPincodeLookup = ({ clearLocation = false } = {}) => {
    pincodeLookupToken += 1;
    pincodeLookupState = 'idle';
    lastLookedUpPincode = '';
    setPincodeLoading(false);
    if(clearLocation) clearCityState();
  };

  const lookupPincode = async pin => {
    const token = ++pincodeLookupToken;
    const cityInput = form()?.querySelector('[name="city"]');
    const stateInput = form()?.querySelector('[name="state"]');
    if(!cityInput || !stateInput){
      pincodeLookupState = 'invalid';
      lastLookedUpPincode = pin;
      setFieldError('pincode', pincodeLookupMessage());
      updateSubmitEnabled();
      return;
    }

    pincodeLookupState = 'loading';
    lastLookedUpPincode = pin;
    setPincodeLoading(true);
    clearCityState();
    /* loading is not invalid — allow clearing the previous error */
    const field = document.querySelector('[data-field="pincode"]');
    const error = document.querySelector('[data-field-error="pincode"]');
    if(field) field.classList.remove('is-invalid');
    if(error) error.textContent = '';
    updateSubmitEnabled();

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      if(token !== pincodeLookupToken) return;
      if(!res.ok) throw new Error('lookup failed');
      const data = await res.json();
      if(token !== pincodeLookupToken) return;
      const entry = Array.isArray(data) ? data[0] : null;
      const offices = entry?.PostOffice;
      if(entry?.Status !== 'Success' || !Array.isArray(offices) || !offices.length){
        markPincodeInvalid();
        return;
      }

      const office = offices[0];
      const city = String(office.District || office.Block || office.Name || '').trim();
      const state = String(office.State || '').trim();
      cityInput.readOnly = true;
      stateInput.readOnly = true;
      if(city){
        cityInput.value = city;
        cityInput.classList.add('is-autofilled');
        clearFieldError('city');
      }
      if(state){
        stateInput.value = state;
        stateInput.classList.add('is-autofilled');
        clearFieldError('state');
      }
      pincodeLookupState = 'valid';
      lastLookedUpPincode = pin;
      clearFieldError('pincode');
    } catch(err){
      if(token !== pincodeLookupToken) return;
      markPincodeInvalid();
    } finally {
      if(token === pincodeLookupToken) setPincodeLoading(false);
      updateSubmitEnabled();
    }
  };

  const validateAndShowField = name => {
    const message = validateField(name);
    if(message) setFieldError(name, message);
    else clearFieldError(name);
    updateSubmitEnabled();
    return !message;
  };

  const maybeLookupPincode = (pin, { retryInvalid = false } = {}) => {
    if(!/^\d{6}$/.test(pin)) return;
    if(pin === lastLookedUpPincode){
      if(pincodeLookupState === 'valid' || pincodeLookupState === 'loading') return;
      if(pincodeLookupState === 'invalid' && !retryInvalid) return;
    }
    lookupPincode(pin);
  };

  /** Applied promo code from cart (API-validated), or empty string. */
  const getAppliedCouponCode = () => {
    const promo = window.TelAquaPromo?.getApplied?.();
    if(promo?.code) return String(promo.code).trim().toUpperCase();
    const pricing = cartApi()?.getPricing?.();
    const fromPricing = pricing?.coupon?.code;
    if(fromPricing) return String(fromPricing).trim().toUpperCase();
    const coupon = cartApi()?.getCoupon?.();
    return coupon?.code ? String(coupon.code).trim().toUpperCase() : '';
  };

  /** Optionally refresh checkout totals from create-order response fields. */
  const applyOrderTotalsToSummary = order => {
    const root = summaryRoot();
    if(!root || !order) return;
    const formatPrice = catalog()?.formatPrice;
    if(!formatPrice) return;

    const hasTotals =
      order.original_amount != null ||
      order.discount_amount != null ||
      order.total_amount != null;
    if(!hasTotals) return;

    const grand = root.querySelector('.checkout-totals-grand strong');
    const couponRow = root.querySelector('.checkout-totals-coupon strong');
    const subtotalRow = root.querySelector('.checkout-totals-mrp strong');

    if(order.original_amount != null && subtotalRow){
      subtotalRow.textContent = formatPrice(order.original_amount);
    }
    if(order.discount_amount != null && couponRow){
      couponRow.textContent = `−${formatPrice(order.discount_amount)}`;
    }
    if(order.total_amount != null && grand){
      grand.textContent = formatPrice(order.total_amount);
    } else if(order.amount != null && grand){
      /* Razorpay amount is typically paise — only use total_amount when provided. */
    }
  };

  const renderSummary = () => {
    const root = summaryRoot();
    const lines = cartApi()?.getLineItems?.() || [];
    if(!root || !catalog()) return lines;

    if(!lines.length){
      root.innerHTML = `
        <div class="checkout-empty">
          <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
          <h2>${tt('checkout.emptyTitle')}</h2>
          <p>${tt('checkout.emptyBody')}</p>
          <a class="btn btn-primary" href="products.html">${tt('checkout.emptyCta')}</a>
        </div>`;
      const slot = storageSlot();
      if(slot) slot.innerHTML = '';
      const secure = document.querySelector('.checkout-secure');
      if(secure) secure.hidden = true;
      return lines;
    }

    const secure = document.querySelector('.checkout-secure');
    if(secure) secure.hidden = false;

    const catalogSubtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0);
    const pricing = cartApi()?.getPricing?.() || null;
    const discount = pricing?.discount || 0;
    const coupon = pricing?.coupon || null;
    const shipping = 0;
    const displaySubtotal = (coupon && pricing?.subtotal != null) ? pricing.subtotal : catalogSubtotal;
    const total = Math.max(0, (pricing?.total ?? (displaySubtotal - discount)) + shipping);
    const formatPrice = catalog().formatPrice;
    const promo = window.TelAquaPromo?.getApplied?.();

    const itemsMarkup = lines.map(item => {
      const isPromoEligible = promo?.original_price != null
        ? Number(item.price) === Number(promo.original_price)
        : lines.length === 1;
      const itemDiscount = promo?.discount_amount != null
        ? Number(promo.discount_amount)
        : (
          promo?.original_price != null && promo?.promo_price != null
            ? Number(promo.original_price) - Number(promo.promo_price)
            : discount
        );
      const lineDiscount = isPromoEligible
        ? Math.min(item.lineTotal, Math.max(0, itemDiscount) * item.quantity)
        : 0;
      const lineNow = item.lineTotal - lineDiscount;
      /* Under product name: show list MRP only (no strike, no discounted twin) */
      const priceBlock = `<strong>${formatPrice(item.price)}</strong>`;
      const lineBlock = lineDiscount > 0
        ? `<strong><s class="cart-price-was">${formatPrice(item.lineTotal)}</s> ${formatPrice(lineNow)}</strong>`
        : `<strong>${formatPrice(item.lineTotal)}</strong>`;

      return `
      <article class="checkout-line">
        <div class="checkout-line-image">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" width="88" height="88">
        </div>
        <div class="checkout-line-copy">
          <h3>${displayPhName(item.name)}</h3>
          <p>${tt('checkout.summary.qty', { n:item.quantity })}</p>
          <p>Product ID: ${escapeHtml(item.sku || item.productId)}</p>
          ${priceBlock}
        </div>
        <div class="checkout-line-total">
          <span>${tt('checkout.summary.subtotal')}</span>
          ${lineBlock}
        </div>
      </article>`;
    }).join('');

    const shippingListPrice = 250;
    const couponSave = coupon && discount > 0 ? discount : 0;
    const totalSave = couponSave + shippingListPrice;

    const couponRow = couponSave > 0
      ? `<div class="checkout-totals-coupon"><span>${tt('checkout.summary.coupon', { code:escapeHtml(coupon.code) })}</span><strong>−${formatPrice(couponSave)}</strong></div>`
      : '';

    const shippingRow = `<div class="checkout-totals-shipping"><span>${tt('checkout.summary.shipping')}</span><strong class="checkout-shipping-value"><s class="checkout-shipping-was">${formatPrice(shippingListPrice)}</s> <span class="checkout-shipping-free">${tt('checkout.summary.shippingFree')}</span></strong></div>`;

    const saveRow = `<div class="checkout-totals-save"><span>${tt('checkout.summary.youSave') || 'You save'}</span><strong>${formatPrice(totalSave)}</strong></div>`;

    const mrpRow = `<div class="checkout-totals-mrp"><span>MRP</span><strong>${formatPrice(displaySubtotal)}</strong></div>`;
    const itemCountRow = `<div class="checkout-totals-items"><span>${tt('cart.summary.totalItems')}</span><strong>${lines.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>`;

    root.innerHTML = `
      <div class="checkout-summary-card">
        <span class="eyebrow">${tt('checkout.summary.eyebrow')}</span>
        <h2>${tt('checkout.summary.heading')}</h2>
        <div class="checkout-lines">${itemsMarkup}</div>
        <div class="checkout-totals">
          ${itemCountRow}
          ${mrpRow}
          ${couponRow}
          ${shippingRow}
          ${saveRow}
          <div class="checkout-totals-grand"><span>${tt('checkout.summary.totalAmount')}</span><strong>${formatPrice(total)}</strong></div>
        </div>
        <p class="checkout-summary-note">${tt('checkout.summary.note')}</p>
      </div>`;

    const slot = storageSlot();
    if(slot){
      slot.innerHTML = `
      <aside class="storage-note storage-note--on-light" role="note" aria-label="${tt('footer.note.label')}">
        <span class="storage-note-icon" aria-hidden="true"><i class="fa-solid fa-triangle-exclamation"></i></span>
        <p class="storage-note-text">
          <strong class="storage-note-label">${tt('footer.note.label')}</strong>
          <span>${tt('footer.note.body')}</span>
          <span class="storage-note-accent">${tt('footer.note.accent')}</span>
        </p>
      </aside>`;
    }

    return lines;
  };

  const setSubmitting = (submitting, busyLabel) => {
    const btn = document.querySelector('[data-place-order]');
    if(!btn) return;
    btn.setAttribute('aria-busy', submitting ? 'true' : 'false');
    btn.textContent = submitting
      ? (busyLabel || tt('checkout.placingOrder'))
      : tt('checkout.placeOrder');
    if(submitting){
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    } else {
      updateSubmitEnabled();
    }
  };

  /** Persist online-payment details for order-success.html (session + local backup). */
  const ONLINE_PAYMENT_KEY = 'telaqua_online_payment';
  const PENDING_PAYMENT_KEY = 'telaqua_pending_payment';
  const LAST_PAID_KEY = 'telaqua_last_paid_order';
  const COD_ORDER_KEY = 'telaqua_cod_order';

  const writeJsonStorage = (storage, key, value) => {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch(err){
      console.warn('Could not store payment payload', err);
    }
  };

  const readJsonStorage = (storage, key) => {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch(err){
      return null;
    }
  };

  const storeOnlinePaymentSuccess = payload => {
    const orderId = payload.order_id != null && payload.order_id !== ''
      ? Number(payload.order_id)
      : null;
    const stored = {
      orderId: Number.isInteger(orderId) && orderId > 0 ? orderId : null,
      orderNumber: payload.order_number || '',
      razorpayOrderId: payload.razorpay_order_id || '',
      paymentId: payload.razorpay_payment_id || '',
      amountRupees: payload.amountRupees != null ? Number(payload.amountRupees) : null,
      currency: payload.currency || 'INR',
      paymentStatus: payload.paymentStatus || 'Paid',
      verifiedAt: Date.now()
    };
    writeJsonStorage(sessionStorage, ONLINE_PAYMENT_KEY, stored);
    writeJsonStorage(localStorage, LAST_PAID_KEY, stored);
  };

  const readOnlinePaymentSuccess = () => (
    readJsonStorage(sessionStorage, ONLINE_PAYMENT_KEY) ||
    readJsonStorage(localStorage, LAST_PAID_KEY)
  );

  const storeCodOrderSuccess = payload => {
    const orderId = payload.order_id != null && payload.order_id !== ''
      ? Number(payload.order_id)
      : null;
    const stored = {
      orderId: Number.isInteger(orderId) && orderId > 0 ? orderId : null,
      orderNumber: payload.order_number || '',
      amountRupees: payload.amountRupees != null ? Number(payload.amountRupees) : null,
      currency: payload.currency || 'INR',
      paymentMode: 'COD',
      paymentStatus: payload.paymentStatus || 'Pending',
      invoiceAccessToken: String(payload.invoiceAccessToken || payload.invoice_access_token || '').trim(),
      placedAt: Date.now()
    };
    writeJsonStorage(sessionStorage, COD_ORDER_KEY, stored);
    writeJsonStorage(localStorage, COD_ORDER_KEY, stored);
  };

  const readCodOrderSuccess = () => (
    readJsonStorage(sessionStorage, COD_ORDER_KEY) ||
    readJsonStorage(localStorage, COD_ORDER_KEY)
  );

  const storePendingPayment = payload => {
    writeJsonStorage(sessionStorage, PENDING_PAYMENT_KEY, payload || {});
  };

  const readPendingPayment = () => readJsonStorage(sessionStorage, PENDING_PAYMENT_KEY);

  const extractNumericOrderId = value => {
    const direct = Number(value);
    if(Number.isInteger(direct) && direct > 0) return direct;
    const match = String(value || '').trim().match(/(\d+)$/);
    if(!match) return null;
    const parsed = Number(match[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  /** Extract numeric DB order id from verify-payment response. */
  const extractVerifiedOrderId = verified => {
    const candidates = [
      verified?.order_id,
      verified?.db_order_id,
      verified?.orderId,
      verified?.dbOrderId,
      verified?.order?.id,
      verified?.order?.order_id,
      verified?.data?.order_id,
      verified?.data?.db_order_id
    ];
    for(const value of candidates){
      const n = Number(value);
      if(Number.isInteger(n) && n > 0) return n;
    }
    return null;
  };

  /** Extract customer-facing order number from verify-payment response. */
  const extractVerifiedOrderNumber = verified => (
    verified?.order_number ||
    verified?.orderNumber ||
    verified?.order?.order_number ||
    verified?.order?.orderNumber ||
    verified?.data?.order_number ||
    verified?.data?.orderNumber ||
    ''
  );

  const resolveAmountRupees = order => {
    if(!order) return null;
    if(order.total_amount != null && Number.isFinite(Number(order.total_amount))){
      return Number(order.total_amount);
    }
    const amount = Number(order.amount);
    if(!Number.isFinite(amount)) return null;
    /* Razorpay create-order amount is in paise. */
    return amount / 100;
  };

  /** Clear any prior online-payment session so a cancel cannot reopen as success. */
  const clearOnlinePaymentSuccess = () => {
    try {
      sessionStorage.removeItem(ONLINE_PAYMENT_KEY);
      sessionStorage.removeItem(PENDING_PAYMENT_KEY);
    } catch(err){
      /* ignore storage errors */
    }
  };

  /** Require all three Razorpay success fields before calling verify. */
  const hasCompleteRazorpayPayload = response => Boolean(
    String(response?.razorpay_payment_id || '').trim() &&
    String(response?.razorpay_order_id || '').trim() &&
    String(response?.razorpay_signature || '').trim()
  );

  const handleSubmit = async event => {
    event.preventDefault();
    /* Guard against double-clicks / repeat submits while busy. */
    if(isSubmitting) return;

    showAlert('');
    clearFieldErrors();

    const lines = cartApi()?.getLineItems?.() || [];
    if(!lines.length){
      showAlert(tt('checkout.alert.emptyCart'));
      return;
    }

    const values = getFormData();
    if(pincodeLookupState === 'loading'){
      showAlert(tt('checkout.alert.formFix'));
      updateSubmitEnabled();
      return;
    }
    const errors = validate(values);
    const keys = Object.keys(errors);

    if(keys.length){
      keys.forEach(key => setFieldError(key, errors[key]));
      showAlert(tt('checkout.alert.formFix'));
      const first = document.querySelector('.checkout-field.is-invalid input, .checkout-field.is-invalid textarea, [data-field="paymentMethod"] input:checked');
      first?.focus();
      return;
    }

    if(!isPincodeVerified(values)){
      setFieldError('pincode', pincodeLookupMessage());
      showAlert(tt('checkout.alert.formFix'));
      form()?.querySelector('[name="pincode"]')?.focus();
      updateSubmitEnabled();
      return;
    }

    const quantity = lines.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 1;
    const couponCode = getAppliedCouponCode();

    isSubmitting = true;
    setSubmitting(true);

    try {
      if(values.paymentMethod === 'cod'){
        if(!ordersApi()?.placeWebsiteCodOrder){
          showAlert(tt('checkout.alert.unavailable'));
          isSubmitting = false;
          setSubmitting(false);
          return;
        }

        setSubmitting(true, tt('checkout.placingOrder') || 'Placing order...');
        const codPayload = {
          customer_name: values.fullName,
          phone: values.mobile,
          email: values.email,
          address: values.address,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          quantity,
          items: lines.map(item => ({ productId:item.productId, quantity:Number(item.quantity) })),
          whatsapp_opt_in: values.whatsappOptIn
        };
        if(couponCode) codPayload.promo_code = couponCode;
        Object.assign(codPayload, attributionFields());

        const placed = await ordersApi().placeWebsiteCodOrder(codPayload);
        const orderNumber = placed.orderNumber || '';
        const dbOrderId = Number(placed.dbOrderId);
        const amountRupees = placed.totalAmount != null
          ? Number(placed.totalAmount)
          : Number(cartApi()?.getPricing?.()?.total);

        storeCodOrderSuccess({
          order_id: dbOrderId,
          order_number: orderNumber,
          amountRupees,
          paymentStatus: placed.paymentStatus || 'Pending',
          invoiceAccessToken: placed.invoiceAccessToken || ''
        });

        try {
          const transactionId = orderNumber || (Number.isInteger(dbOrderId) && dbOrderId > 0
            ? `TAQ-${String(dbOrderId).padStart(6, '0')}`
            : '');
          if(transactionId){
            trackingApi()?.trackPurchase?.({
              transaction_id: transactionId,
              payment_type: 'COD',
              value: Number.isFinite(amountRupees) ? amountRupees : (Number(cartApi()?.getPricing?.()?.total) || 0),
              items: checkoutEcommerceItems(lines),
              coupon: couponCode || undefined,
              user_data: trackingUserData(values)
            });
          }
        } catch(trackError){
          /* tracking must never block COD success */
        }

        try {
          const localOrder = ordersApi()?.buildOrder?.({
            customer: {
              fullName: values.fullName,
              mobile: values.mobile,
              email: values.email
            },
            shippingAddress: {
              address: values.address,
              city: values.city,
              state: values.state,
              pincode: values.pincode
            },
            items: lines,
            paymentMethod: 'COD',
            orderId: orderNumber || (Number.isInteger(dbOrderId) && dbOrderId > 0
              ? `TAQ-${String(dbOrderId).padStart(6, '0')}`
              : ''),
            pricing: cartApi()?.getPricing?.()
          });
          if(localOrder){
            localOrder.paymentStatus = 'Pending';
            localOrder.paymentMode = 'COD';
            localOrder.orderStatus = 'Confirmed';
            localOrder.dbOrderId = Number.isInteger(dbOrderId) && dbOrderId > 0 ? dbOrderId : null;
            localOrder.orderNumber = orderNumber || localOrder.orderId;
            localOrder.totalAmount = Number.isFinite(amountRupees) ? amountRupees : localOrder.totalAmount;
            ordersApi()?.saveOrder?.(localOrder);
          }
        } catch(persistError){
          console.warn('Could not cache COD order locally', persistError);
        }

        if(cartApi()?.clear) cartApi().clear();

        const successId = encodeURIComponent(orderNumber || '');
        window.location.href = successId
          ? `order-success.html?id=${successId}&cod=1`
          : 'order-success.html?cod=1';
        return;
      }

      /* ---------- Online Payment only: create-order → Razorpay → verify-payment ---------- */
      if(values.paymentMethod !== 'online'){
        showAlert(tt('checkout.error.payment') || 'Online payment is required.');
        isSubmitting = false;
        setSubmitting(false);
        return;
      }

      if(!razorpayApi()?.createOrder || !razorpayApi()?.openCheckout || !razorpayApi()?.verifyPayment){
        showAlert(tt('checkout.alert.unavailable'));
        isSubmitting = false;
        setSubmitting(false);
        return;
      }

      /* Never reuse a previous online-payment success from session. */
      clearOnlinePaymentSuccess();

      /* Step 1: create Razorpay order (backend calculates amount — never send prices). */
      setSubmitting(true, 'Creating order...');
      const createPayload = {
        customer_name: values.fullName,
        phone: values.mobile,
        email: values.email,
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        quantity,
        items: lines.map(item => ({ productId:item.productId, quantity:Number(item.quantity) }))
      };
      if(couponCode) createPayload.promo_code = couponCode;
      createPayload.whatsapp_opt_in = values.whatsappOptIn;
      Object.assign(createPayload, attributionFields());

      const order = await razorpayApi().createOrder(createPayload);
      applyOrderTotalsToSummary(order);

      storePendingPayment({
        orderId: extractNumericOrderId(order.db_order_id),
        orderNumber: order.order_number || '',
        razorpayOrderId: order.order_id || '',
        amountRupees: resolveAmountRupees(order)
      });

      /*
       * Step 2: open Razorpay Checkout.
       * Resolves only with a complete payment payload.
       * Cancel / ESC / X / payment.failed → reject (caught below). No verify. No redirect.
       */
      setSubmitting(true, 'Waiting for payment...');
      const razorpayResponse = await razorpayApi().openCheckout(
        order,
        {
          name: values.fullName,
          email: values.email,
          contact: values.mobile
        }
      );

      /* Hard gate: never verify or redirect without all three Razorpay fields. */
      if(!hasCompleteRazorpayPayload(razorpayResponse)){
        const cancelError = new Error('Payment cancelled by user.');
        cancelError.code = 'CANCELLED';
        throw cancelError;
      }

      /*
       * Step 3: verify with backend.
       * Success page is allowed ONLY after success === true.
       */
      setSubmitting(true, 'Verifying payment...');
      showAlert('Verifying payment...', 'success');

      const verified = await razorpayApi().verifyPayment({
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_signature: razorpayResponse.razorpay_signature
      });

      /* Extra safety: require explicit success flag from verify response. */
      if(!verified || verified.success !== true){
        const verifyError = new Error('Payment Verification Failed');
        verifyError.code = 'VERIFY_FAILED';
        throw verifyError;
      }

      /* Step 4: verified — persist locally, then redirect to Order Confirmed. */
      const pending = readPendingPayment() || {};
      const verifiedOrderId =
        extractVerifiedOrderId(verified) ||
        extractNumericOrderId(order.db_order_id) ||
        extractNumericOrderId(pending.orderId);
      const verifiedOrderNumber =
        extractVerifiedOrderNumber(verified) ||
        order.order_number ||
        pending.orderNumber ||
        '';
      storeOnlinePaymentSuccess({
        order_id: verifiedOrderId,
        order_number: verifiedOrderNumber,
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id:
          verified.razorpay_payment_id || razorpayResponse.razorpay_payment_id,
        amountRupees: resolveAmountRupees(order) ?? pending.amountRupees,
        currency: order?.currency || 'INR',
        paymentStatus: 'Paid'
      });

      try {
        const localOrder = ordersApi()?.buildOrder?.({
          customer: {
            fullName: values.fullName,
            mobile: values.mobile,
            email: values.email
          },
          shippingAddress: {
            address: values.address,
            city: values.city,
            state: values.state,
            pincode: values.pincode
          },
          items: lines,
          paymentMethod: 'ONLINE',
          orderId: verifiedOrderNumber || (verifiedOrderId ? `TAQ-${String(verifiedOrderId).padStart(6, '0')}` : ''),
          pricing: cartApi()?.getPricing?.()
        });
        if(localOrder){
          localOrder.paymentStatus = 'Paid';
          localOrder.orderStatus = 'Confirmed';
          localOrder.dbOrderId = verifiedOrderId;
          localOrder.orderNumber = verifiedOrderNumber || localOrder.orderId;
          localOrder.razorpayPaymentId =
            verified.razorpay_payment_id || razorpayResponse.razorpay_payment_id;
          ordersApi()?.saveOrder?.(localOrder);
        }
      } catch(persistError){
        console.warn('Could not cache confirmed order locally', persistError);
      }

      try {
        if(verifiedOrderNumber){
          trackingApi()?.trackPurchase?.({
            transaction_id: verifiedOrderNumber,
            payment_type: 'Razorpay',
            value: resolveAmountRupees(order) ?? pending.amountRupees ?? (Number(cartApi()?.getPricing?.()?.total) || 0),
            items: checkoutEcommerceItems(lines),
            coupon: couponCode || undefined,
            user_data: trackingUserData(values)
          });
        }
      } catch(trackError){
        /* tracking must never block paid redirect */
      }

      if(cartApi()?.clear) cartApi().clear();

      const successId = encodeURIComponent(
        verifiedOrderNumber || razorpayResponse.razorpay_order_id || ''
      );
      window.location.href = successId
        ? `order-success.html?id=${successId}&paid=1`
        : 'order-success.html?paid=1';
      /* Keep isSubmitting true so the button stays locked through redirect. */
      return;
    } catch(error){
      console.error(error);

      /* Cancel / close / ESC — stay on checkout, never verify, never redirect. */
      if(error?.code === 'CANCELLED'){
        clearOnlinePaymentSuccess();
        showAlert('Payment cancelled by user.');
        isSubmitting = false;
        setSubmitting(false);
        return;
      }

      /* In-checkout payment failure — stay on checkout. */
      if(error?.code === 'PAYMENT_FAILED'){
        clearOnlinePaymentSuccess();
        showAlert('Payment failed. Please try again.');
        isSubmitting = false;
        setSubmitting(false);
        return;
      }

      /* Verification failed — payment must NOT be treated as completed. */
      if(error?.code === 'VERIFY_FAILED'){
        clearOnlinePaymentSuccess();
        showAlert(error.message || 'Payment Verification Failed');
        isSubmitting = false;
        setSubmitting(false);
        return;
      }

      clearOnlinePaymentSuccess();
      const message = error?.code === 'NETWORK'
        ? (error.message || tt('checkout.alert.network'))
        : (error?.message || tt('checkout.alert.genericFail'));
      showAlert(message);
      isSubmitting = false;
      setSubmitting(false);
    }
  };

  const stopInvoicePolling = () => {
    if(invoicePollTimer != null){
      window.clearTimeout(invoicePollTimer);
      invoicePollTimer = null;
    }
    invoicePollActive = false;
  };

  const setInvoiceUiState = (state, details = {}) => {
    const section = document.querySelector('[data-invoice-section]');
    if(!section) return;

    const preparing = section.querySelector('[data-invoice-preparing]');
    const ready = section.querySelector('[data-invoice-ready]');
    const timeout = section.querySelector('[data-invoice-timeout]');
    const errorEl = section.querySelector('[data-invoice-error]');
    const numberEl = section.querySelector('[data-invoice-number]');
    const downloadEl = section.querySelector('[data-invoice-download]');
    const tryAgainBtn = section.querySelector('[data-invoice-retry]');

    section.hidden = false;

    if(preparing) preparing.hidden = state !== 'preparing';
    if(ready) ready.hidden = state !== 'ready';
    if(timeout) timeout.hidden = state !== 'timeout';
    if(errorEl){
      const msg = state === 'error' ? (details.message || '') : '';
      errorEl.hidden = !msg;
      errorEl.textContent = msg;
    }

    if(numberEl && (state === 'ready' || state === 'timeout') && details.invoice_number){
      numberEl.textContent = details.invoice_number;
    }

    if(downloadEl){
      const url = String(details.invoice_url || '').trim();
      if(state === 'ready' && url){
        downloadEl.href = url;
        downloadEl.hidden = false;
      } else if(state !== 'ready'){
        downloadEl.hidden = true;
      }
    }

    if(tryAgainBtn){
      tryAgainBtn.hidden = !(state === 'timeout' || state === 'error');
    }
  };

  const invoiceDownloadUrlFor = (orderId, paymentId) => {
    if(razorpayApi()?.buildInvoiceDownloadUrl){
      return razorpayApi().buildInvoiceDownloadUrl({
        order_id: orderId,
        razorpay_payment_id: paymentId
      });
    }
    const base = String(window.TELAQUA_API_BASE || '').replace(/\/$/, '');
    const params = new URLSearchParams({
      order_id: String(orderId || ''),
      razorpay_payment_id: String(paymentId || '')
    });
    return `${base}/api/payment/invoice-download?${params.toString()}`;
  };

  const showInvoiceDownload = ({ orderId, paymentId, invoiceNumber, invoiceUrl }) => {
    const numericOrderId = extractNumericOrderId(orderId);
    const url = String(invoiceUrl || '').trim() || (
      numericOrderId ? invoiceDownloadUrlFor(numericOrderId, paymentId) : ''
    );
    /* Prefer the single Download Invoice control whenever a fallback URL exists. */
    invoiceFinalState = url ? 'ready' : 'timeout';
    setInvoiceUiState(url ? 'ready' : 'timeout', {
      invoice_number: invoiceNumber || '—',
      invoice_url: url
    });
  };

  const startInvoicePolling = ({ orderId, paymentId, orderNumber = '', force = false }) => {
    const section = document.querySelector('[data-invoice-section]');
    if(!section) return;
    section.hidden = false;

    const numericOrderId = extractNumericOrderId(orderId) || extractNumericOrderId(orderNumber);
    const razorpayPaymentId = String(paymentId || '').trim();

    if(!Number.isInteger(numericOrderId) || numericOrderId <= 0){
      showInvoiceDownload({ orderId, paymentId, invoiceNumber: orderNumber });
      return;
    }

    const sessionKey = `${numericOrderId}:${razorpayPaymentId}`;
    if(!force && invoicePollSessionKey === sessionKey && (invoicePollActive || invoiceFinalState)){
      return;
    }

    stopInvoicePolling();
    invoicePollSessionKey = sessionKey;
    invoiceFinalState = '';

    const maxAttempts = 12;
    const intervalMs = 2500;
    let attempt = 0;
    invoicePollActive = true;
    setInvoiceUiState('preparing');

    const scheduleNext = () => {
      invoicePollTimer = window.setTimeout(pollOnce, intervalMs);
    };

    const finishWithDownload = (invoiceNumber, invoiceUrl) => {
      stopInvoicePolling();
      showInvoiceDownload({
        orderId: numericOrderId,
        paymentId: razorpayPaymentId,
        invoiceNumber: invoiceNumber || orderNumber,
        invoiceUrl
      });
    };

    const pollOnce = async () => {
      if(!invoicePollActive) return;
      attempt += 1;

      try {
        if(!razorpayApi()?.getInvoiceStatus || !razorpayPaymentId){
          finishWithDownload(orderNumber);
          return;
        }

        const result = await razorpayApi().getInvoiceStatus({
          order_id: numericOrderId,
          razorpay_payment_id: razorpayPaymentId
        });

        if(!invoicePollActive) return;

        if(result.invoice_ready === true){
          finishWithDownload(result.invoice_number, result.invoice_url);
          return;
        }

        if(attempt >= maxAttempts){
          finishWithDownload(orderNumber);
          return;
        }

        scheduleNext();
      } catch(error){
        if(!invoicePollActive) return;

        if(attempt >= maxAttempts || error?.code === 'INVOICE_NOT_FOUND'){
          finishWithDownload(orderNumber);
          return;
        }

        scheduleNext();
      }
    };

    /* First check immediately, then every 2.5s. */
    pollOnce();
  };

  const getCustomerBearerToken = () => {
    try {
      const fromApi = window.TelAquaCustomerAuth?.getToken?.();
      if(fromApi) return String(fromApi).trim();
      const raw = sessionStorage.getItem('telaqua-customer-auth-v1');
      const parsed = raw ? JSON.parse(raw) : null;
      return String(parsed?.token || '').trim();
    } catch(_error){
      return '';
    }
  };

  const invoiceDownloadUrlForCod = (orderId, invoiceAccessToken, orderNumber = '') => {
    const base = String(window.TELAQUA_API_BASE || '').replace(/\/$/, '');
    const params = new URLSearchParams({ order_id: String(orderId || '') });
    const token = String(invoiceAccessToken || '').trim();
    const number = String(orderNumber || '').trim();
    if(token) params.set('invoice_access_token', token);
    else if(number) params.set('order_number', number);
    return `${base}/api/payment/invoice-download?${params.toString()}`;
  };

  const bindCodInvoiceDownloadClick = orderId => {
    const downloadEl = document.querySelector('[data-invoice-download]');
    if(!downloadEl || downloadEl.dataset.codDownloadBound === '1') return;
    downloadEl.dataset.codDownloadBound = '1';
    downloadEl.addEventListener('click', async event => {
      const href = String(downloadEl.getAttribute('href') || '').trim();
      const hasGuestProof = /invoice_access_token=/.test(href) || /order_number=/.test(href);
      if(hasGuestProof && href && href !== '#') return;
      const bearer = getCustomerBearerToken();
      if(!bearer || !Number.isInteger(orderId) || orderId <= 0) return;
      event.preventDefault();
      const headers = {
        Accept: 'application/pdf, application/json',
        Authorization: `Bearer ${bearer}`
      };
      const url = invoiceDownloadUrlForCod(orderId, '');
      try {
        const response = await fetch(url, { method: 'GET', headers });
        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        if(response.status === 202 || !response.ok || !contentType.includes('pdf')){
          setInvoiceUiState('timeout');
          return;
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      } catch(_error){
        setInvoiceUiState('timeout');
      }
    });
  };

  /**
   * COD success only: poll invoice-status with invoice_access_token or order_number.
   * Does not call Razorpay getInvoiceStatus and does not send razorpay_payment_id.
   */
  const startCodInvoicePolling = ({ orderId, invoiceAccessToken = '', orderNumber = '', force = false }) => {
    const section = document.querySelector('[data-invoice-section]');
    if(!section) return;
    section.hidden = false;

    const numericOrderId = extractNumericOrderId(orderId) || extractNumericOrderId(orderNumber);
    const token = String(invoiceAccessToken || '').trim();
    const guestOrderNumber = String(orderNumber || '').trim();
    const bearer = getCustomerBearerToken();
    const apiBase = String(window.TELAQUA_API_BASE || '').replace(/\/$/, '');

    if(!Number.isInteger(numericOrderId) || numericOrderId <= 0){
      invoiceFinalState = 'timeout';
      setInvoiceUiState('timeout', { invoice_number: orderNumber });
      return;
    }

    const sessionKey = `cod:${numericOrderId}:${token || guestOrderNumber || (bearer ? 'bearer' : 'none')}`;
    if(!force && invoicePollSessionKey === sessionKey && (invoicePollActive || invoiceFinalState)){
      return;
    }

    stopInvoicePolling();
    invoicePollSessionKey = sessionKey;
    invoiceFinalState = '';

    const maxAttempts = 12;
    const intervalMs = 2500;
    let attempt = 0;
    invoicePollActive = true;
    setInvoiceUiState('preparing');
    bindCodInvoiceDownloadClick(numericOrderId);

    const scheduleNext = () => {
      invoicePollTimer = window.setTimeout(pollOnce, intervalMs);
    };

    const finishReady = (invoiceNumber, invoiceUrl) => {
      stopInvoicePolling();
      const url = String(invoiceUrl || '').trim() ||
        invoiceDownloadUrlForCod(numericOrderId, token, guestOrderNumber);
      const canDownload = Boolean(url || bearer);
      invoiceFinalState = canDownload ? 'ready' : 'timeout';
      setInvoiceUiState(canDownload ? 'ready' : 'timeout', {
        invoice_number: invoiceNumber || orderNumber || '—',
        invoice_url: url || '#'
      });
    };

    const finishTimeout = invoiceNumber => {
      stopInvoicePolling();
      invoiceFinalState = 'timeout';
      setInvoiceUiState('timeout', { invoice_number: invoiceNumber || orderNumber });
    };

    const pollOnce = async () => {
      if(!invoicePollActive) return;
      attempt += 1;

      if(!token && !bearer && !guestOrderNumber){
        finishTimeout(orderNumber);
        return;
      }

      try {
        if(token || guestOrderNumber){
          const statusHeaders = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          };
          const statusBody = { order_id: numericOrderId };
          if(token) statusBody.invoice_access_token = token;
          else statusBody.order_number = guestOrderNumber;

          const statusResponse = await fetch(`${apiBase}/api/payment/invoice-status`, {
            method: 'POST',
            headers: statusHeaders,
            body: JSON.stringify(statusBody)
          });
          let statusData = null;
          try { statusData = await statusResponse.json(); } catch(_parseErr){ statusData = null; }

          if(!invoicePollActive) return;

          if(statusResponse.status === 200 && statusData?.invoice_ready === true){
            finishReady(statusData.invoice_number, statusData.invoice_url);
            return;
          }

          if(statusResponse.status === 202 || statusData?.invoice_ready === false){
            if(attempt >= maxAttempts){
              finishTimeout(statusData?.invoice_number || orderNumber);
              return;
            }
            scheduleNext();
            return;
          }
        }

        const headers = { Accept: 'application/pdf, application/json' };
        const url = invoiceDownloadUrlForCod(numericOrderId, token, guestOrderNumber);
        if(bearer && !token && !guestOrderNumber){
          headers.Authorization = `Bearer ${bearer}`;
        }
        const response = await fetch(url, { method: 'GET', headers });

        if(!invoicePollActive) return;

        if(response.status === 202){
          if(attempt >= maxAttempts){
            finishTimeout(orderNumber);
            return;
          }
          scheduleNext();
          return;
        }

        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        const looksLikePdf = contentType.includes('pdf') || contentType.includes('octet-stream');
        if(response.status === 200 && (looksLikePdf || !contentType.includes('json'))){
          if(response.body && typeof response.body.cancel === 'function'){
            try { response.body.cancel(); } catch(_cancelErr){}
          }
          finishReady(orderNumber, url);
          return;
        }

        if(attempt >= maxAttempts){
          finishTimeout(orderNumber);
          return;
        }

        scheduleNext();
      } catch(_error){
        if(!invoicePollActive) return;
        if(attempt >= maxAttempts){
          finishTimeout(orderNumber);
          return;
        }
        scheduleNext();
      }
    };

    pollOnce();
  };

  const bindInvoiceRetry = ({ orderId, paymentId, invoiceAccessToken, orderNumber, cod }) => {
    const retryBtn = document.querySelector('[data-invoice-retry]');
    if(!retryBtn || invoiceRetryBound) return;
    invoiceRetryBound = true;
    retryBtn.addEventListener('click', event => {
      event.preventDefault();
      invoiceFinalState = '';
      if(cod){
        startCodInvoicePolling({
          orderId,
          invoiceAccessToken,
          orderNumber,
          force: true
        });
        return;
      }
      startInvoicePolling({ orderId, paymentId, force: true });
    });
  };

  const normalizeStatusSafe = value => String(value || '').trim().toLowerCase();

  const initSuccessPage = () => {
    const root = document.querySelector('#order-success');
    const emptyRoot = document.querySelector('#order-success-empty');
    if(!root) return;

    const params = new URLSearchParams(window.location.search);
    const paid = params.get('paid') === '1';
    const isCodParam = params.get('cod') === '1';
    const onlinePayment = readOnlinePaymentSuccess();
    const pending = readPendingPayment();
    const codOrder = readCodOrderSuccess();

    const orderIdParam =
      params.get('id') ||
      (isCodParam ? (codOrder?.orderNumber || '') : '') ||
      onlinePayment?.orderNumber ||
      pending?.orderNumber ||
      onlinePayment?.razorpayOrderId ||
      codOrder?.orderNumber ||
      (ordersApi()?.getLastOrderId?.() || '');
    const order = ordersApi()?.getOrderById?.(orderIdParam)
      || ordersApi()?.getOrderById?.(onlinePayment?.orderNumber)
      || ordersApi()?.getOrderById?.(codOrder?.orderNumber)
      || ordersApi()?.getOrderById?.(String(onlinePayment?.orderId || ''))
      || ordersApi()?.getOrderById?.(String(codOrder?.orderId || ''))
      || null;

    const hasStoredPayment = Boolean(
      onlinePayment?.paymentId ||
      onlinePayment?.orderId ||
      onlinePayment?.orderNumber ||
      pending?.orderNumber ||
      pending?.paymentId
    );
    const isCodSuccess = Boolean(
      isCodParam ||
      (
        !paid &&
        !hasStoredPayment &&
        (
          Boolean(codOrder?.orderNumber || codOrder?.orderId) ||
          normalizeStatusSafe(order?.paymentMethod) === 'cod' ||
          normalizeStatusSafe(order?.paymentMode) === 'cod'
        )
      )
    );
    const idEl = document.querySelector('[data-order-id]');
    const paymentRow = document.querySelector('[data-payment-row]');
    const paymentIdEl = document.querySelector('[data-payment-id]');
    const amountRow = document.querySelector('[data-amount-row]');
    const amountEl = document.querySelector('[data-order-amount]');
    const statusRow = document.querySelector('[data-status-row]');
    const statusValueEl = document.querySelector('[data-payment-status]');
    const headingEl = document.querySelector('[data-success-heading]') || root.querySelector('h1');
    const paidBadgeEl = document.querySelector('[data-success-paid]');
    const whatsappNoteEl = document.querySelector('[data-invoice-whatsapp-note]');
    const invoiceSection = document.querySelector('[data-invoice-section]');
    const formatPrice = catalog()?.formatPrice;

    const isVerifiedOnline = Boolean(
      paid ||
      hasStoredPayment ||
      normalizeStatusSafe(order?.paymentStatus) === 'paid' ||
      normalizeStatusSafe(order?.orderStatus) === 'confirmed'
    );

    const showSuccess = Boolean(
      isCodSuccess ||
      paid ||
      hasStoredPayment ||
      isVerifiedOnline ||
      order?.orderId
    );
    root.hidden = !showSuccess;
    if(emptyRoot) emptyRoot.hidden = showSuccess;

    if(!showSuccess){
      stopInvoicePolling();
      return;
    }

    const paymentModeRow = document.querySelector('[data-payment-mode-row]');
    const paymentModeEl = document.querySelector('[data-payment-mode]');
    const codNoteEl = document.querySelector('[data-cod-note]');

    if(isCodSuccess && !paid){
      const displayOrderNumber =
        codOrder?.orderNumber ||
        order?.orderNumber ||
        order?.orderId ||
        orderIdParam ||
        (codOrder?.orderId ? `TAQ-${String(codOrder.orderId).padStart(6, '0')}` : '—');

      if(idEl) idEl.textContent = displayOrderNumber || '—';
      if(headingEl){
        headingEl.textContent = tFallback('success.codTitle', 'Order confirmed');
      }
      if(paidBadgeEl){
        paidBadgeEl.hidden = false;
        paidBadgeEl.textContent = tFallback('success.codBadge', 'Cash on Delivery');
      }
      if(whatsappNoteEl) whatsappNoteEl.hidden = true;
      if(invoiceSection) invoiceSection.hidden = false;
      if(paymentRow) paymentRow.hidden = true;
      if(codNoteEl){
        codNoteEl.hidden = false;
        codNoteEl.textContent = tFallback(
          'success.codNote',
          'Pay in cash when your order is delivered'
        );
      }
      if(paymentModeRow) paymentModeRow.hidden = false;
      if(paymentModeEl) paymentModeEl.textContent = 'COD';

      const amountRupees = codOrder?.amountRupees
        ?? order?.totalAmount
        ?? order?.pricing?.total
        ?? null;
      if(amountRow) amountRow.hidden = false;
      if(amountEl){
        if(amountRupees != null && Number.isFinite(Number(amountRupees))){
          amountEl.textContent = formatPrice
            ? formatPrice(Number(amountRupees))
            : `₹${Number(amountRupees).toLocaleString('en-IN')}`;
        } else {
          amountEl.textContent = '—';
        }
      }

      if(statusRow) statusRow.hidden = false;
      if(statusValueEl){
        statusValueEl.textContent =
          codOrder?.paymentStatus || order?.paymentStatus || 'Pending';
      }

      const dbOrderId = codOrder?.orderId || order?.dbOrderId || extractNumericOrderId(displayOrderNumber);
      const invoiceAccessToken = String(codOrder?.invoiceAccessToken || '').trim();
      bindInvoiceRetry({
        orderId: dbOrderId,
        invoiceAccessToken,
        orderNumber: displayOrderNumber,
        cod: true
      });
      startCodInvoicePolling({
        orderId: dbOrderId,
        invoiceAccessToken,
        orderNumber: displayOrderNumber
      });
      return;
    }

    if(codNoteEl) codNoteEl.hidden = true;
    if(paymentModeRow) paymentModeRow.hidden = true;

    const displayOrderNumber =
      onlinePayment?.orderNumber ||
      order?.orderNumber ||
      order?.orderId ||
      orderIdParam ||
      (onlinePayment?.orderId ? `TAQ-${String(onlinePayment.orderId).padStart(6, '0')}` : '—');

    if(idEl) idEl.textContent = displayOrderNumber || '—';

    if(headingEl){
      headingEl.textContent = tt('success.statusPaid') || tt('success.title') || 'Payment Successful';
    }
    if(paidBadgeEl){
      paidBadgeEl.hidden = false;
      paidBadgeEl.textContent = tt('success.paidBadge') || '✓ Paid';
    }
    if(whatsappNoteEl){
      whatsappNoteEl.hidden = false;
      whatsappNoteEl.textContent =
        tt('success.invoiceWhatsapp') ||
        'Your invoice will be sent to your WhatsApp shortly.';
    }
    if(invoiceSection) invoiceSection.hidden = false;

    const paymentId = onlinePayment?.paymentId || order?.razorpayPaymentId || pending?.paymentId || '';
    if(paymentRow) paymentRow.hidden = false;
    if(paymentIdEl) paymentIdEl.textContent = paymentId || '—';

    const amountRupees = onlinePayment?.amountRupees
      ?? pending?.amountRupees
      ?? order?.totalAmount
      ?? order?.pricing?.total
      ?? null;
    if(amountRow) amountRow.hidden = false;
    if(amountEl){
      if(amountRupees != null && Number.isFinite(Number(amountRupees))){
        amountEl.textContent = formatPrice
          ? formatPrice(Number(amountRupees))
          : `₹${Number(amountRupees).toLocaleString('en-IN')}`;
      } else {
        amountEl.textContent = '—';
      }
    }

    if(statusRow) statusRow.hidden = false;
    if(statusValueEl){
      statusValueEl.textContent = onlinePayment?.paymentStatus || order?.paymentStatus || 'Paid';
    }

    const dbOrderId =
      onlinePayment?.orderId ||
      order?.dbOrderId ||
      extractNumericOrderId(displayOrderNumber);
    bindInvoiceRetry({ orderId: dbOrderId, paymentId });
    startInvoicePolling({
      orderId: dbOrderId,
      paymentId,
      orderNumber: displayOrderNumber
    });
  };

  let checkoutBound = false;

  const initCheckoutPage = () => {
    if(!form()) return;

    renderSummary();
    updateSubmitEnabled();

    if(checkoutBound) return;
    checkoutBound = true;

    const fireBeginCheckout = () => {
      if(!isCheckoutHtmlPage()) return;
      const lines = cartApi()?.getLineItems?.() || [];
      const pricing = cartApi()?.getPricing?.() || {};
      if(!lines.length) return;
      try {
        trackingApi()?.trackBeginCheckout?.({
          value: Number(pricing.total) || 0,
          items: checkoutEcommerceItems(lines),
          coupon: getAppliedCouponCode() || undefined
        });
      } catch(error){
        /* ignore */
      }
    };

    const fireAddPaymentInfo = method => {
      if(!isCheckoutHtmlPage()) return;
      const lines = cartApi()?.getLineItems?.() || [];
      const pricing = cartApi()?.getPricing?.() || {};
      if(!lines.length) return;
      try {
        trackingApi()?.trackAddPaymentInfo?.({
          payment_type: method === 'cod' ? 'COD' : 'Razorpay',
          value: Number(pricing.total) || 0,
          items: checkoutEcommerceItems(lines),
          coupon: getAppliedCouponCode() || undefined
        });
      } catch(error){
        /* ignore */
      }
    };

    fireBeginCheckout();
    fireAddPaymentInfo(getFormData().paymentMethod);

    form().addEventListener('change', event => {
      const target = event.target;
      if(!(target instanceof HTMLInputElement)) return;
      if(target.name !== 'paymentMethod') return;
      fireAddPaymentInfo(target.value);
    });

    form().addEventListener('submit', handleSubmit);

    form().addEventListener('blur', event => {
      const target = event.target;
      if(!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      const name = target.getAttribute('name');
      if(!name || !document.querySelector(`[data-field="${name}"]`)) return;

      if(name === 'mobile'){
        const normalized = normalizeMobile(target.value);
        if(normalized && /^\d{10}$/.test(normalized)) target.value = normalized;
      }
      if(name === 'pincode'){
        target.value = String(target.value || '').replace(/\D/g, '').slice(0, 6);
        maybeLookupPincode(target.value, { retryInvalid: true });
      }
      validateAndShowField(name);
    }, true);

    form().addEventListener('input', event => {
      const target = event.target;
      if(!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      const field = target.closest('[data-field]');
      if(!field) return;
      const name = field.getAttribute('data-field');

      if(name === 'mobile'){
        /* Allow digits and a leading + while typing; strip other junk. */
        const cleaned = String(target.value || '').replace(/[^\d+]/g, '');
        if(cleaned !== target.value) target.value = cleaned;
      }
      if(name === 'pincode'){
        const digits = String(target.value || '').replace(/\D/g, '').slice(0, 6);
        if(digits !== target.value) target.value = digits;
        if(digits.length < 6){
          resetPincodeLookup({ clearLocation: true });
        } else if(digits !== lastLookedUpPincode || pincodeLookupState === 'idle'){
          maybeLookupPincode(digits);
        }
      }
      if(!(name === 'pincode' && pincodeLookupState === 'invalid')){
        clearFieldError(name);
      }
      updateSubmitEnabled();
    });
  };

  const initialize = () => {
    initCheckoutPage();
    initSuccessPage();
  };

  const boot = () => {
    initialize();
    window.addEventListener('pagehide', stopInvoicePolling);
    document.addEventListener('telaqua:i18n-applied', () => {
      renderSummary();
      initSuccessPage();
      const placeBtn = document.querySelector('[data-place-order]');
      if(placeBtn && !placeBtn.getAttribute('aria-busy')){
        placeBtn.textContent = tt('checkout.placeOrder');
      }
    });
    document.addEventListener('telaqua:cart-updated', () => {
      renderSummary();
      updateSubmitEnabled();
    });
    document.addEventListener('telaqua:promo-updated', () => {
      renderSummary();
      updateSubmitEnabled();
    });
  };

  if(window.TelAquaI18n?.ready){
    window.TelAquaI18n.ready().then(boot).catch(boot);
  } else if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
