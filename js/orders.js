/* Order API + local cache helpers for checkout. */
(() => {
  'use strict';

  const ORDERS_KEY = 'telaqua-orders-v1';
  const LAST_ORDER_KEY = 'telaqua-last-order-id';
  const COUNTER_KEY = 'telaqua-order-counter-v1';
  const START_ID = 10001;
  const API_BASE = window.TELAQUA_API_BASE || 'https://lightpink-reindeer-561421.hostingersite.com';
  const API_ORDERS_URL = `${API_BASE}/api/orders`;
  const API_WEBSITE_COD_URL = `${API_BASE}/api/orders/website-cod`;

  const normalizeOrderItems = items => {
    if(!Array.isArray(items) || !items.length){
      throw new Error('Your cart is empty.');
    }
    return items.map(item => {
      const product = window.TelAquaProducts?.getById(item?.productId);
      const quantity = Number(item?.quantity);
      if(!product){
        throw new Error('A cart item is no longer available. Please refresh your cart.');
      }
      if(!Number.isInteger(quantity) || quantity < 1){
        throw new Error('A cart item has an invalid quantity.');
      }
      return { productId:product.id, quantity };
    });
  };

  /** True when a value is Cash on Delivery / COD (any common spelling). */
  const isCodPaymentMethod = value => {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    return (
      normalized === 'cod' ||
      normalized === 'cash_on_delivery' ||
      normalized === 'cashondelivery'
    );
  };

  /* ---------- Storage adapters ---------- */

  const readOrders = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch(error){
      return [];
    }
  };

  const writeOrders = orders => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  };

  const readCounter = () => {
    const raw = Number.parseInt(localStorage.getItem(COUNTER_KEY) || '', 10);
    if(Number.isFinite(raw) && raw >= START_ID) return raw;

    const fromOrders = readOrders().reduce((max, order) => {
      const match = String(order.orderId || '').match(/^ORD-(\d+)$/i);
      if(!match) return max;
      return Math.max(max, Number.parseInt(match[1], 10));
    }, START_ID - 1);

    return fromOrders;
  };

  /* ---------- Public helpers ---------- */

  /** Generate next unique local order id, e.g. ORD-10001 */
  const generateOrderId = () => {
    const next = readCounter() + 1;
    localStorage.setItem(COUNTER_KEY, String(next));
    return `ORD-${next}`;
  };

  /** Persist an order locally (cache / success page). */
  const saveOrder = order => {
    if(!order || !order.orderId){
      throw new Error('Invalid order payload.');
    }
    const orders = readOrders();
    orders.unshift(order);
    writeOrders(orders);
    localStorage.setItem(LAST_ORDER_KEY, order.orderId);
    return order;
  };

  const getOrders = () => readOrders().slice();

  const getOrderById = orderId => {
    if(!orderId) return null;
    const wanted = String(orderId);
    return readOrders().find(order => (
      String(order.orderId || '') === wanted ||
      String(order.orderNumber || '') === wanted ||
      String(order.dbOrderId || '') === wanted ||
      String(order.id || '') === wanted
    )) || null;
  };

  const getLastOrderId = () => localStorage.getItem(LAST_ORDER_KEY) || '';

  const clearLastOrderId = () => {
    localStorage.removeItem(LAST_ORDER_KEY);
  };

  /**
   * Build a normalized local order object from checkout form + cart lines.
   */
  const buildOrder = ({ customer, shippingAddress, items, paymentMethod, orderId, pricing }) => {
    const catalog = window.TelAquaProducts;
    const formatPrice = catalog?.formatPrice || (value => `₹${value}`);
    const cartPricing = pricing || window.TelAquaCart?.getPricing?.() || null;

    const productDetails = normalizeOrderItems(items).map(item => {
      const product = catalog?.getById(item.productId);
      const price = Number(product.price);
      const quantity = item.quantity;
      return {
        productId: item.productId,
        sku: product.sku || null,
        name: product.name,
        image: product.image,
        description: product.description,
        price,
        quantity,
        lineTotal: price * quantity,
        formattedPrice: formatPrice(price),
        formattedLineTotal: formatPrice(price * quantity)
      };
    });

    const subtotal = cartPricing?.subtotal
      ?? productDetails.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Math.min(Number(cartPricing?.discount || 0), subtotal);
    const couponCode = cartPricing?.coupon?.code || '';
    const totalAmount = Math.max(0, cartPricing?.total ?? (subtotal - discount));
    const quantity = productDetails.reduce((sum, item) => sum + item.quantity, 0) || 1;

    return {
      orderId: orderId || generateOrderId(),
      customer: {
        fullName: String(customer.fullName || '').trim(),
        mobile: String(customer.mobile || '').trim(),
        email: String(customer.email || '').trim()
      },
      shippingAddress: {
        address: String(shippingAddress.address || '').trim(),
        city: String(shippingAddress.city || '').trim(),
        state: String(shippingAddress.state || '').trim(),
        pincode: String(shippingAddress.pincode || '').trim()
      },
      productDetails,
      quantity,
      subtotal,
      discount,
      couponCode,
      totalAmount,
      formattedTotal: formatPrice(totalAmount),
      paymentMethod: paymentMethod || 'ONLINE',
      paymentStatus: 'Pending',
      orderStatus: 'New',
      orderDate: new Date().toISOString()
    };
  };

  /** Map checkout form values to the Orders API body. COD is not accepted. */
  const toApiPayload = ({ customer, shippingAddress, items, pricing, paymentMethod }) => {
    const method = String(paymentMethod || 'ONLINE').trim();
    if(isCodPaymentMethod(method)){
      const codError = new Error('Cash on Delivery is not available. Please pay online with Razorpay.');
      codError.code = 'COD_DISABLED';
      throw codError;
    }

    const cartPricing = pricing || window.TelAquaCart?.getPricing?.() || null;
    const lines = normalizeOrderItems(items);
    const quantity = lines.reduce((sum, item) => sum + item.quantity, 0);
    const unitPrice = Number(window.TelAquaProducts.getById(lines[0].productId).price);
    const subtotal = cartPricing?.subtotal
      ?? lines.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
    const discount = Math.min(Number(cartPricing?.discount || 0), subtotal);
    const totalAmount = Math.max(0, cartPricing?.total ?? (subtotal - discount));

    return {
      customer_name: String(customer?.fullName || '').trim(),
      phone: String(customer?.mobile || '').replace(/\D/g, ''),
      email: String(customer?.email || '').trim(),
      address: String(shippingAddress?.address || '').trim(),
      city: String(shippingAddress?.city || '').trim(),
      state: String(shippingAddress?.state || '').trim(),
      pincode: String(shippingAddress?.pincode || '').trim(),
      quantity,
      unit_price: unitPrice,
      items: lines,
      subtotal,
      discount,
      coupon_code: cartPricing?.coupon?.code || '',
      total_amount: totalAmount,
      payment_method: 'ONLINE'
    };
  };

  const extractOrderNumber = data => (
    data?.order_number ||
    data?.orderNumber ||
    data?.order?.order_number ||
    data?.order?.orderNumber ||
    data?.data?.order_number ||
    data?.data?.orderNumber ||
    ''
  );

  const extractMessage = data => (
    data?.message ||
    data?.error ||
    data?.errors?.[0] ||
    (Array.isArray(data?.errors) ? data.errors.join(' ') : '') ||
    ''
  );

  /**
   * Place order via backend API.
   * COD / cash_on_delivery is rejected — online payment only.
   * Returns { success, orderNumber, message, order }.
   */
  const placeOrder = async payload => {
    const requestedMethod = payload?.paymentMethod || payload?.payment_method || 'ONLINE';
    if(isCodPaymentMethod(requestedMethod)){
      const codError = new Error('Cash on Delivery is not available. Please pay online with Razorpay.');
      codError.code = 'COD_DISABLED';
      throw codError;
    }

    const body = toApiPayload({ ...payload, paymentMethod: requestedMethod });
    if(isCodPaymentMethod(body.payment_method)){
      const codError = new Error('Cash on Delivery is not available. Please pay online with Razorpay.');
      codError.code = 'COD_DISABLED';
      throw codError;
    }

    let response;
    try {
      response = await fetch(API_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch(error){
      const networkError = new Error('Unable to connect to the server.\nPlease try again later.');
      networkError.code = 'NETWORK';
      throw networkError;
    }

    let data = null;
    try {
      data = await response.json();
    } catch(parseError){
      data = null;
    }

    if(!data || data.success !== true){
      const apiError = new Error(
        extractMessage(data) || 'We could not place your order. Please try again.'
      );
      apiError.code = 'API';
      apiError.status = response.status;
      apiError.data = data;
      throw apiError;
    }

    const orderNumber = extractOrderNumber(data);
    const order = buildOrder({
      ...payload,
      paymentMethod: 'ONLINE',
      orderId: orderNumber || generateOrderId()
    });
    saveOrder(order);

    return {
      success: true,
      orderNumber: orderNumber || order.orderId,
      message: extractMessage(data) || 'Order placed successfully.',
      order,
      raw: data
    };
  };

  /**
   * Place a website COD order via POST /api/orders/website-cod.
   * Server calculates prices. Does not open Razorpay. Does not use admin manual-cod.
   */
  const placeWebsiteCodOrder = async payload => {
    const items = normalizeOrderItems(payload?.items);
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const body = {
      customer_name: String(payload?.customer_name || '').trim(),
      phone: String(payload?.phone || '').replace(/\D/g, ''),
      email: String(payload?.email || '').trim(),
      address: String(payload?.address || '').trim(),
      city: String(payload?.city || '').trim(),
      state: String(payload?.state || '').trim(),
      pincode: String(payload?.pincode || '').replace(/\D/g, ''),
      quantity,
      items,
      whatsapp_opt_in: payload?.whatsapp_opt_in
    };
    if(payload?.promo_code) body.promo_code = String(payload.promo_code).trim();
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
      response = await fetch(API_WEBSITE_COD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch(error){
      const networkError = new Error('Unable to connect to the server.\nPlease try again later.');
      networkError.code = 'NETWORK';
      throw networkError;
    }

    let data = null;
    try {
      data = await response.json();
    } catch(parseError){
      data = null;
    }

    if(!data || data.success !== true){
      const apiError = new Error(
        extractMessage(data) || 'We could not place your order. Please try again.'
      );
      apiError.code = 'API';
      apiError.status = response.status;
      apiError.data = data;
      throw apiError;
    }

    return {
      success: true,
      orderNumber: extractOrderNumber(data) || data.order_number || '',
      dbOrderId: data.db_order_id || data.order?.id || null,
      totalAmount: data.total_amount ?? data.order?.total_amount ?? data.order?.final_total ?? null,
      paymentStatus: data.payment_status || data.order?.payment_status || 'Pending',
      paymentMode: data.payment_mode || data.order?.payment_mode || 'cod',
      invoiceAccessToken: data.invoice_access_token || data.invoiceAccessToken || '',
      message: extractMessage(data) || 'COD order placed successfully.',
      order: data.order || null,
      raw: data
    };
  };

  window.TelAquaOrders = Object.freeze({
    generateOrderId,
    saveOrder,
    getOrders,
    getOrderById,
    getLastOrderId,
    clearLastOrderId,
    buildOrder,
    toApiPayload,
    placeOrder,
    placeWebsiteCodOrder,
    isCodPaymentMethod,
    API_ORDERS_URL,
    API_WEBSITE_COD_URL
  });
})();
