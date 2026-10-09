/**
 * Tel-Aqua — Razorpay Checkout (frontend).
 *
 * Flow (normal cart checkout):
 *  1. createOrder()       → POST /api/payment/create-order
 *  2. openCheckout()      → Razorpay Checkout modal
 *  3. verifyPayment()     → POST /api/payment/verify-payment
 *
 * Flow (hidden LIVE ₹1 test only):
 *  1. createTestOrder()   → POST /api/payment/create-test-order
 *  2. openCheckout()      → same Checkout helper
 *  3. verifyPayment()     → same verify-payment helper
 */
(() => {
  'use strict';

  const API_BASE = window.TELAQUA_API_BASE || 'https://lightpink-reindeer-561421.hostingersite.com';
  const CREATE_ORDER_URL = `${API_BASE}/api/payment/create-order`;
  const CREATE_TEST_ORDER_URL = `${API_BASE}/api/payment/create-test-order`;
  const VERIFY_PAYMENT_URL = `${API_BASE}/api/payment/verify-payment`;
  const INVOICE_STATUS_URL = `${API_BASE}/api/payment/invoice-status`;
  const INVOICE_DOWNLOAD_URL = `${API_BASE}/api/payment/invoice-download`;
  const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

  /** Tracks a single in-flight SDK load so we never inject the script twice. */
  let sdkLoadPromise = null;

  /**
   * Load Razorpay Checkout.js exactly once.
   * Resolves when window.Razorpay is available.
   */
  const loadRazorpaySdk = () => {
    if(typeof window.Razorpay === 'function'){
      return Promise.resolve(window.Razorpay);
    }

    if(sdkLoadPromise) return sdkLoadPromise;

    sdkLoadPromise = new Promise((resolve, reject) => {
      /* Reuse an existing script tag if another page already requested it. */
      const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
      if(existing){
        existing.addEventListener('load', () => {
          if(typeof window.Razorpay === 'function') resolve(window.Razorpay);
          else reject(new Error('Razorpay SDK loaded but Razorpay is unavailable.'));
        });
        existing.addEventListener('error', () => {
          sdkLoadPromise = null;
          reject(new Error('Failed to load Razorpay Checkout SDK.'));
        });
        return;
      }

      const script = document.createElement('script');
      script.src = CHECKOUT_SCRIPT_SRC;
      script.async = true;
      script.onload = () => {
        if(typeof window.Razorpay === 'function') resolve(window.Razorpay);
        else reject(new Error('Razorpay SDK loaded but Razorpay is unavailable.'));
      };
      script.onerror = () => {
        sdkLoadPromise = null;
        reject(new Error('Failed to load Razorpay Checkout SDK.'));
      };
      document.head.appendChild(script);
    });

    return sdkLoadPromise;
  };

  /** Pull a human-readable message from an API response body. */
  const extractApiMessage = data => (
    data?.message ||
    data?.error ||
    (Array.isArray(data?.errors) ? data.errors.filter(Boolean).join(' ') : '') ||
    data?.errors?.[0] ||
    ''
  );

  /**
   * POST customer + cart items (+ optional promo_code) to create a Razorpay order.
   * Never send prices — the backend calculates the final amount.
   * Returns { order_id, amount, currency, key_id } on success.
   */
  const createOrder = async payload => {
    const promoCode = String(payload.promo_code || payload.coupon_code || '').trim().toUpperCase();
    const phone = String(payload.phone || '').replace(/\D/g, '');
    /* Email is optional in the UI; API still requires a value — use a guest fallback. */
    const email = String(payload.email || '').trim() || (phone ? `${phone}@guest.tel-aqua.in` : '');
    const catalog = window.TelAquaProducts;
    if(!Array.isArray(payload.items) || !payload.items.length){
      throw new Error('Your cart is empty. Add a product before checkout.');
    }
    const items = payload.items.map(item => {
      const product = catalog?.getById(item?.productId);
      const quantity = Number(item?.quantity);
      if(!product){
        throw new Error('A cart item is no longer available. Please refresh your cart.');
      }
      if(!Number.isInteger(quantity) || quantity < 1){
        throw new Error('A cart item has an invalid quantity.');
      }
      return { productId:product.id, quantity };
    });

    const body = {
      customer_name: String(payload.customer_name || '').trim(),
      phone,
      email,
      address: String(payload.address || '').trim(),
      city: String(payload.city || '').trim(),
      state: String(payload.state || '').trim(),
      pincode: String(payload.pincode || '').trim(),
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      items
    };

    if(promoCode) body.promo_code = promoCode;
    if(payload.whatsapp_opt_in != null) body.whatsapp_opt_in = Boolean(payload.whatsapp_opt_in);
    try {
      const attribution = window.TelAquaTracking?.getAttributionForOrder?.() || {};
      const keys = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'gclid', 'fbclid', 'fbp', 'fbc', 'landing_url', 'first_seen_at'
      ];
      keys.forEach(key => {
        const value = payload?.[key] || attribution[key];
        if(value) body[key] = String(value);
      });
    } catch(error){
      /* attribution is optional */
    }

    let response;
    try {
      response = await fetch(CREATE_ORDER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch(error){
      const networkError = new Error('Unable to connect to the payment server. Please try again.');
      networkError.code = 'NETWORK';
      throw networkError;
    }

    let data = null;
    try {
      data = await response.json();
    } catch(parseError){
      data = null;
    }

    if(!response.ok || !data || data.success !== true){
      const apiError = new Error(
        extractApiMessage(data) || 'Could not create payment order. Please try again.'
      );
      apiError.code = 'API';
      apiError.status = response.status;
      apiError.data = data;
      throw apiError;
    }

    const orderId = data.order_id || data.orderId;
    const keyId = data.key_id || data.keyId;
    const amount = Number(data.amount);
    const currency = data.currency || 'INR';

    if(!orderId || !keyId || !Number.isFinite(amount)){
      const shapeError = new Error('Payment server returned an incomplete order. Please try again.');
      shapeError.code = 'API';
      shapeError.data = data;
      throw shapeError;
    }

    return {
      order_id: orderId,
      amount,
      currency,
      key_id: keyId,
      total_amount: data.total_amount != null ? Number(data.total_amount) : null,
      original_amount: data.original_amount != null ? Number(data.original_amount) : null,
      discount_amount: data.discount_amount != null ? Number(data.discount_amount) : null,
      order_number: data.order_number || data.orderNumber || data.order?.order_number || '',
      db_order_id: data.db_order_id != null
        ? Number(data.db_order_id)
        : (data.order?.id != null ? Number(data.order.id) : null),
      raw: data
    };
  };

  /**
   * Hidden LIVE ₹1 test only — POST /api/payment/create-test-order.
   * Never sends amount/product_id/live_test. Backend enforces ₹1 (100 paise).
   * Refuses to return an order unless amount===100, currency===INR, is_test_order===true.
   */
  const createTestOrder = async payload => {
    const body = {
      customer_name: String(payload.customer_name || '').trim(),
      phone: String(payload.phone || '').replace(/\D/g, ''),
      email: String(payload.email || '').trim(),
      address: String(payload.address || '').trim(),
      city: String(payload.city || '').trim(),
      state: String(payload.state || '').trim(),
      pincode: String(payload.pincode || '').trim()
    };

    let response;
    try {
      response = await fetch(CREATE_TEST_ORDER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch(error){
      const networkError = new Error('Unable to connect to the payment server. Please try again.');
      networkError.code = 'NETWORK';
      throw networkError;
    }

    let data = null;
    try {
      data = await response.json();
    } catch(parseError){
      data = null;
    }

    if(!response.ok || !data || data.success !== true){
      const apiError = new Error(
        extractApiMessage(data) || 'Could not create ₹1 test order. Please try again.'
      );
      apiError.code = 'API';
      apiError.status = response.status;
      apiError.data = data;
      throw apiError;
    }

    const orderId = data.order_id || data.orderId;
    const keyId = data.key_id || data.keyId;
    const amount = Number(data.amount);
    const currency = String(data.currency || '').trim().toUpperCase();
    const isTestOrder = data.is_test_order === true;

    /* Hard gate: never open Checkout unless backend locked this to LIVE ₹1. */
    if(
      data.success !== true ||
      amount !== 100 ||
      currency !== 'INR' ||
      isTestOrder !== true ||
      !orderId ||
      !keyId
    ){
      console.error('[TelAqua ₹1 test] Invalid create-test-order response', {
        success: data.success,
        amount: data.amount,
        currency: data.currency,
        is_test_order: data.is_test_order,
        has_order_id: Boolean(orderId),
        has_key_id: Boolean(keyId),
        order_number: data.order_number || null
      });
      const gateError = new Error(
        'Test order rejected: backend did not return a valid LIVE ₹1 test order (amount must be 100 paise).'
      );
      gateError.code = 'TEST_ORDER_INVALID';
      gateError.data = {
        success: data.success,
        amount: data.amount,
        currency: data.currency,
        is_test_order: data.is_test_order,
        has_order_id: Boolean(orderId),
        has_key_id: Boolean(keyId)
      };
      throw gateError;
    }

    /* Use backend amount as-is (already verified === 100). Never invent/override. */
    return {
      order_id: orderId,
      amount,
      currency,
      key_id: keyId,
      description: String(data.product || 'Tel-Aqua Razorpay Live Test Product'),
      total_amount: data.total_amount != null ? Number(data.total_amount) : 1,
      order_number: data.order_number || '',
      db_order_id: data.db_order_id != null ? data.db_order_id : null,
      is_test_order: true,
      raw: data
    };
  };

  /**
   * Verify a completed Razorpay payment with the backend.
   * Must be called only after Razorpay returns payment_id / order_id / signature.
   * Treats payment as complete ONLY when success === true.
   *
   * @param {{ razorpay_payment_id:string, razorpay_order_id:string, razorpay_signature:string }} payload
   * @returns {Promise<object>} verified API body
   */
  const verifyPayment = async payload => {
    const razorpay_payment_id = String(payload?.razorpay_payment_id || '').trim();
    const razorpay_order_id = String(payload?.razorpay_order_id || '').trim();
    const razorpay_signature = String(payload?.razorpay_signature || '').trim();

    if(!razorpay_payment_id || !razorpay_order_id || !razorpay_signature){
      const missingError = new Error('Payment Verification Failed. Incomplete payment response.');
      missingError.code = 'VERIFY_FAILED';
      throw missingError;
    }

    let response;
    try {
      response = await fetch(VERIFY_PAYMENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature
        })
      });
    } catch(error){
      const networkError = new Error('Unable to connect to the payment server. Please try again.');
      networkError.code = 'NETWORK';
      throw networkError;
    }

    let data = null;
    try {
      data = await response.json();
    } catch(parseError){
      data = null;
    }

    if(!response.ok || !data || data.success !== true){
      const apiError = new Error(
        extractApiMessage(data) || 'Payment Verification Failed'
      );
      apiError.code = 'VERIFY_FAILED';
      apiError.status = response.status;
      apiError.data = data;
      throw apiError;
    }

    return data;
  };

  /**
   * Poll-friendly invoice readiness check (post verify-payment only).
   * Does not create invoices — backend/Swipe owns generation.
   *
   * @param {{ order_id:number|string, razorpay_payment_id:string }} payload
   * @returns {Promise<{ success:boolean, invoice_ready:boolean, invoice_number?:string, invoice_url?:string, status:number, raw:object }>}
   */
  const getInvoiceStatus = async payload => {
    const orderId = Number(payload?.order_id);
    const razorpay_payment_id = String(payload?.razorpay_payment_id || '').trim();

    if(!Number.isInteger(orderId) || orderId <= 0 || !razorpay_payment_id){
      const shapeError = new Error('Invoice is not available yet.');
      shapeError.code = 'INVOICE_BAD_REQUEST';
      shapeError.status = 400;
      throw shapeError;
    }

    let response;
    try {
      response = await fetch(INVOICE_STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          razorpay_payment_id
        })
      });
    } catch(error){
      const networkError = new Error('Invoice is being prepared. Please check again shortly.');
      networkError.code = 'NETWORK';
      throw networkError;
    }

    let data = null;
    try {
      data = await response.json();
    } catch(parseError){
      data = null;
    }

    if(response.status === 403){
      const forbidden = new Error('Unable to fetch invoice right now.');
      forbidden.code = 'INVOICE_FORBIDDEN';
      forbidden.status = 403;
      forbidden.data = data;
      throw forbidden;
    }

    if(response.status === 404){
      const missing = new Error('Order not found.');
      missing.code = 'INVOICE_NOT_FOUND';
      missing.status = 404;
      missing.data = data;
      throw missing;
    }

    if(response.status === 400){
      const badRequest = new Error('Invoice is not available yet.');
      badRequest.code = 'INVOICE_BAD_REQUEST';
      badRequest.status = 400;
      badRequest.data = data;
      throw badRequest;
    }

    if(!response.ok || !data || data.success !== true){
      const apiError = new Error('Invoice is being prepared. Please check again shortly.');
      apiError.code = 'INVOICE_STATUS';
      apiError.status = response.status;
      apiError.data = data;
      throw apiError;
    }

    return {
      success: true,
      invoice_ready: data.invoice_ready === true,
      invoice_number: data.invoice_number || data.invoiceNumber || '',
      invoice_url: data.invoice_url || data.invoiceUrl || '',
      status: response.status,
      raw: data
    };
  };

  /**
   * Direct invoice download URL (works after payment even if Swipe polling is slow/failed).
   */
  const buildInvoiceDownloadUrl = ({ order_id, razorpay_payment_id } = {}) => {
    const params = new URLSearchParams({
      order_id: String(order_id || ''),
      razorpay_payment_id: String(razorpay_payment_id || '')
    });
    return `${INVOICE_DOWNLOAD_URL}?${params.toString()}`;
  };

  /**
   * True only when Razorpay returned a complete success payload.
   */
  const isCompletePaymentResponse = response => {
    const paymentId = String(response?.razorpay_payment_id || '').trim();
    const orderId = String(response?.razorpay_order_id || '').trim();
    const signature = String(response?.razorpay_signature || '').trim();
    return Boolean(paymentId && orderId && signature);
  };

  /**
   * Open the Razorpay Checkout modal for a created order.
   * Resolves ONLY with a complete payment response (all 3 fields).
   */
  const openCheckout = async (order, prefill = {}, hooks = {}) => {
    const Razorpay = await loadRazorpaySdk();

    return new Promise((resolve, reject) => {
      let settled = false;
      let paymentSucceeded = false;

      const finish = (type, value) => {
        if(settled) return;
        settled = true;
        if(type === 'success') resolve(value);
        else reject(value);
      };

      const rejectCancelled = () => {
        if(typeof hooks.onDismiss === 'function'){
          try { hooks.onDismiss(); } catch(err){ console.error(err); }
        }
        const cancelError = new Error('Payment cancelled by user.');
        cancelError.code = 'CANCELLED';
        finish('error', cancelError);
      };

      let rzp;
      try {
        rzp = new Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          order_id: order.order_id,
          name: 'Tel-Aqua',
          description: order.description || 'Tel-Aqua Digital pH Meter',
          prefill: {
            name: String(prefill.name || ''),
            email: String(prefill.email || '').trim() || (
              String(prefill.contact || '').replace(/\D/g, '')
                ? `${String(prefill.contact || '').replace(/\D/g, '')}@guest.tel-aqua.in`
                : ''
            ),
            contact: String(prefill.contact || '')
          },
          theme: {
            color: '#F97316'
          },
          modal: {
            escape: true,
            ondismiss: () => {
              window.setTimeout(() => {
                if(paymentSucceeded || settled) return;
                rejectCancelled();
              }, 400);
            }
          },
          handler: response => {
            if(!isCompletePaymentResponse(response)){
              const incompleteError = new Error('Payment cancelled by user.');
              incompleteError.code = 'CANCELLED';
              finish('error', incompleteError);
              return;
            }

            paymentSucceeded = true;

            if(typeof hooks.onSuccess === 'function'){
              try { hooks.onSuccess(response); } catch(err){ console.error(err); }
            }
            finish('success', {
              razorpay_payment_id: String(response.razorpay_payment_id).trim(),
              razorpay_order_id: String(response.razorpay_order_id).trim(),
              razorpay_signature: String(response.razorpay_signature).trim()
            });
          }
        });
      } catch(error){
        const checkoutError = new Error(
          error?.message || 'Could not open Razorpay Checkout. Please try again.'
        );
        checkoutError.code = 'CHECKOUT';
        finish('error', checkoutError);
        return;
      }

      rzp.on('payment.failed', response => {
        const failError = new Error('Payment failed. Please try again.');
        failError.code = 'PAYMENT_FAILED';
        failError.data = response;
        finish('error', failError);
      });

      try {
        rzp.open();
      } catch(error){
        const openError = new Error(
          error?.message || 'Could not open Razorpay Checkout. Please try again.'
        );
        openError.code = 'CHECKOUT';
        finish('error', openError);
      }
    });
  };

  /**
   * Full initiation helper (normal checkout only):
   * create order → open Checkout → return Razorpay response (verify separately).
   */
  const startCheckout = async ({ customer, items, promo_code, coupon_code }) => {
    const order = await createOrder({
      customer_name: customer.customer_name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      items,
      promo_code: promo_code || coupon_code || ''
    });

    const response = await openCheckout(order, {
      name: customer.customer_name,
      email: customer.email,
      contact: customer.phone
    });

    return { order, response };
  };

  window.TelAquaRazorpay = Object.freeze({
    CREATE_ORDER_URL,
    CREATE_TEST_ORDER_URL,
    VERIFY_PAYMENT_URL,
    INVOICE_STATUS_URL,
    loadRazorpaySdk,
    createOrder,
    createTestOrder,
    verifyPayment,
    getInvoiceStatus,
    buildInvoiceDownloadUrl,
    openCheckout,
    startCheckout
  });
})();
