/* Tel-Aqua Phase 1 conversion tracking.
 * Pushes GA4-style ecommerce events to window.dataLayer for GTM.
 * Do not add GTM / GA4 / Meta / Clarity snippets here.
 *
 * GTM container: GTM-K65HB64W
 * GA4: G-ZFCPJNFDD9 (configure in GTM only)
 * Meta Pixel: 4612743812386133 (configure in GTM only)
 * Clarity: ydz7qm3b95 (configure in GTM only)
 */
(() => {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  const ATTRIBUTION_KEY = 'taq_attribution';
  const BEGIN_CHECKOUT_KEY = 'taq_begin_checkout_sent';
  const PURCHASE_PREFIX = 'taq_purchase_sent_';
  const PH_PRODUCT_ID = 'telaqua-ph-meter';
  const DO_PRODUCT_ID = 'telaqua-do-meter';
  const PARAM_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'wbraid',
    'gbraid'
  ];
  const FIRST_TOUCH_KEYS = PARAM_KEYS.concat(['landing_url', 'first_seen_at']);

  const normalizeE164 = raw => {
    try {
      const d = String(raw || '').replace(/\D/g, '');
      if(d.length === 10) return '+91' + d;
      if(d.length === 12 && d.startsWith('91')) return '+' + d;
      return d ? '+' + d : undefined;
    } catch(error){
      return undefined;
    }
  };

  const currentPage = () => {
    try {
      const path = String(window.location.pathname || '').split('/').pop() || '';
      return path.toLowerCase() || 'index.html';
    } catch(error){
      return '';
    }
  };

  const readStorage = (area, key) => {
    try {
      return area.getItem(key);
    } catch(error){
      return null;
    }
  };

  const writeStorage = (area, key, value) => {
    try {
      area.setItem(key, value);
      return true;
    } catch(error){
      return false;
    }
  };

  const getCookie = name => {
    try {
      const parts = String(document.cookie || '').split(';');
      for(const part of parts){
        const trimmed = part.trim();
        if(!trimmed) continue;
        const eq = trimmed.indexOf('=');
        const key = eq >= 0 ? trimmed.slice(0, eq) : trimmed;
        if(key === name){
          return decodeURIComponent(eq >= 0 ? trimmed.slice(eq + 1) : '');
        }
      }
    } catch(error){
      /* cookies blocked */
    }
    return '';
  };

  const getStoredAttribution = () => {
    try {
      const raw = readStorage(window.localStorage, ATTRIBUTION_KEY);
      if(!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch(error){
      return {};
    }
  };

  const captureAttribution = () => {
    try {
      const stored = getStoredAttribution();
      const next = Object.assign({}, stored);
      let params;
      try {
        params = new URLSearchParams(window.location.search || '');
      } catch(parseError){
        params = new URLSearchParams();
      }

      PARAM_KEYS.forEach(key => {
        const value = params.get(key);
        if(value && !stored[key]) next[key] = String(value).slice(0, 255);
      });

      if(!stored.landing_url){
        try {
          next.landing_url = String(window.location.href || '').slice(0, 2048);
        } catch(urlError){
          /* ignore */
        }
      }
      if(!stored.first_seen_at){
        next.first_seen_at = new Date().toISOString();
      }

      const fbp = getCookie('_fbp');
      const fbc = getCookie('_fbc');
      if(fbp && !next.fbp) next.fbp = String(fbp).slice(0, 255);
      if(fbc && !next.fbc) next.fbc = String(fbc).slice(0, 255);

      writeStorage(window.localStorage, ATTRIBUTION_KEY, JSON.stringify(next));
      return next;
    } catch(error){
      return {};
    }
  };

  const getAttributionForOrder = () => {
    try {
      const stored = getStoredAttribution();
      const out = {};
      FIRST_TOUCH_KEYS.concat(['fbp', 'fbc']).forEach(key => {
        if(stored[key]) out[key] = stored[key];
      });
      return out;
    } catch(error){
      return {};
    }
  };

  const mapItems = items => {
    if(!Array.isArray(items)) return [];
    return items.map(item => {
      const item_id = String(item?.item_id || item?.productId || item?.id || '');
      const item_name = String(item?.item_name || item?.name || '');
      const price = Number(item?.price);
      const quantity = Number(item?.quantity);
      return {
        item_id,
        item_name,
        price: Number.isFinite(price) ? price : 0,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
      };
    }).filter(item => item.item_id);
  };

  const itemsFromProduct = (product, quantity) => {
    if(!product || !product.id) return [];
    return [{
      item_id: String(product.id),
      item_name: String(product.name || ''),
      price: Number(product.price) || 0,
      quantity: Number(quantity) > 0 ? Number(quantity) : 1
    }];
  };

  const pushEcommerceEvent = (eventName, extra) => {
    try {
      if(!eventName) return;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ecommerce: null });
      const payload = Object.assign({ event: eventName }, extra && typeof extra === 'object' ? extra : {});
      window.dataLayer.push(payload);
    } catch(error){
      /* tracking must never break the storefront */
    }
  };

  const trackViewItem = (product, quantity = 1) => {
    try {
      const items = itemsFromProduct(product, quantity);
      if(!items.length) return;
      const qty = items[0].quantity;
      const value = items[0].price * qty;
      pushEcommerceEvent('view_item', {
        ecommerce: {
          currency: 'INR',
          value,
          items
        }
      });
    } catch(error){
      /* ignore */
    }
  };

  const trackAddToCart = (product, quantity = 1) => {
    try {
      const items = itemsFromProduct(product, quantity);
      if(!items.length) return;
      const value = items[0].price * items[0].quantity;
      pushEcommerceEvent('add_to_cart', {
        ecommerce: {
          currency: 'INR',
          value,
          items
        }
      });
    } catch(error){
      /* ignore */
    }
  };

  const hasBeginCheckoutFired = () => readStorage(window.sessionStorage, BEGIN_CHECKOUT_KEY) === '1';

  const trackBeginCheckout = ({ value, items, coupon } = {}) => {
    try {
      if(hasBeginCheckoutFired()) return;
      const mapped = mapItems(items);
      if(!mapped.length) return;
      const ecommerce = {
        currency: 'INR',
        value: Number(value) || 0,
        items: mapped
      };
      if(coupon) ecommerce.coupon = String(coupon);
      pushEcommerceEvent('begin_checkout', { ecommerce });
      writeStorage(window.sessionStorage, BEGIN_CHECKOUT_KEY, '1');
    } catch(error){
      /* ignore */
    }
  };

  const trackAddPaymentInfo = ({ payment_type, value, items, coupon } = {}) => {
    try {
      const mapped = mapItems(items);
      if(!mapped.length) return;
      const ecommerce = {
        currency: 'INR',
        value: Number(value) || 0,
        items: mapped
      };
      if(coupon) ecommerce.coupon = String(coupon);
      pushEcommerceEvent('add_payment_info', {
        payment_type: payment_type === 'COD' ? 'COD' : 'Razorpay',
        ecommerce
      });
    } catch(error){
      /* ignore */
    }
  };

  const hasPurchaseAlreadyFired = transactionId => {
    try {
      const id = String(transactionId || '').trim();
      if(!id) return false;
      return readStorage(window.sessionStorage, PURCHASE_PREFIX + id) === '1';
    } catch(error){
      return false;
    }
  };

  const markPurchaseFired = transactionId => {
    try {
      const id = String(transactionId || '').trim();
      if(!id) return;
      writeStorage(window.sessionStorage, PURCHASE_PREFIX + id, '1');
    } catch(error){
      /* ignore */
    }
  };

  const trackPurchase = ({
    transaction_id,
    payment_type,
    value,
    items,
    coupon,
    user_data
  } = {}) => {
    try {
      const id = String(transaction_id || '').trim();
      if(!id) return;
      if(hasPurchaseAlreadyFired(id)) return;
      const mapped = mapItems(items);
      const ecommerce = {
        transaction_id: id,
        currency: 'INR',
        value: Number(value) || 0,
        items: mapped
      };
      if(coupon) ecommerce.coupon = String(coupon);
      const extra = {
        payment_type: payment_type === 'COD' ? 'COD' : 'Razorpay',
        order_status: 'placed',
        ecommerce
      };
      if(user_data && typeof user_data === 'object') extra.user_data = user_data;
      pushEcommerceEvent('purchase', extra);
      markPurchaseFired(id);
    } catch(error){
      /* ignore */
    }
  };

  const maybeTrackViewItem = () => {
    try {
      const page = currentPage();
      const allowed = page === 'product.html'
        || page === 'do-meter.html'
        || page === 'ph-meter.html'
        || page === 'ph-meter';
      if(!allowed) return;
      const productId = page === 'do-meter.html' ? DO_PRODUCT_ID : PH_PRODUCT_ID;
      const product = window.TelAquaProducts?.getById?.(productId);
      if(!product) return;
      trackViewItem(product, 1);
    } catch(error){
      /* ignore */
    }
  };

  try {
    captureAttribution();
  } catch(error){
    /* ignore */
  }

  const startViewItem = () => {
    maybeTrackViewItem();
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', startViewItem);
  } else {
    startViewItem();
  }

  window.TelAquaTracking = Object.freeze({
    captureAttribution,
    getStoredAttribution,
    getAttributionForOrder,
    normalizeE164,
    pushEcommerceEvent,
    trackViewItem,
    trackAddToCart,
    trackBeginCheckout,
    trackAddPaymentInfo,
    trackPurchase,
    hasPurchaseAlreadyFired
  });
})();
