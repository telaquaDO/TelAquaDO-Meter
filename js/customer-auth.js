/**
 * Tel-Aqua — Customer OTP auth + authenticated order APIs.
 * Uses window.TELAQUA_API_BASE. Never trusts phone from the client for order lookups.
 */
(() => {
  'use strict';

  const API_BASE = String(window.TELAQUA_API_BASE || '').replace(/\/$/, '');
  const STORAGE_KEY = 'telaqua-customer-auth-v1';

  /* Live Hostinger routes ( /api/auth/* currently 404 ). */
  const SEND_OTP_URL = `${API_BASE}/api/customer/auth/request-otp`;
  const VERIFY_OTP_URL = `${API_BASE}/api/customer/auth/verify-otp`;
  const VERIFY_OTP_OWNERSHIP_URL = `${API_BASE}/api/customer/auth/verify-otp-ownership`;
  const LOGOUT_URL = `${API_BASE}/api/customer/auth/logout`;
  const PROFILE_URL = `${API_BASE}/api/customer/profile`;
  const ORDERS_URL = `${API_BASE}/api/customer/orders`;
  const CURRENT_ORDER_URL = `${API_BASE}/api/customer/orders/current`;
  const INVOICE_DOWNLOAD_BASE = `${API_BASE}/api/payment/invoice-download`;

  const extractApiMessage = data => (
    data?.message ||
    data?.error ||
    (Array.isArray(data?.errors) ? data.errors.filter(Boolean).join(' ') : '') ||
    data?.errors?.[0] ||
    ''
  );

  const normalizeMobile = raw => {
    let digits = String(raw || '').replace(/\D/g, '');
    if(digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if(digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits.slice(0, 10);
  };

  const isValidIndianMobile = phone => /^[6-9]\d{9}$/.test(String(phone || ''));

  const readSession = () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      if(!parsed || typeof parsed !== 'object' || !parsed.token) return null;
      return parsed;
    } catch(_error){
      return null;
    }
  };

  const writeSession = session => {
    if(!session || !session.token){
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      token: String(session.token),
      profile: session.profile || null,
      savedAt: Date.now()
    }));
  };

  const clearSession = () => {
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const getToken = () => readSession()?.token || '';
  const isLoggedIn = () => Boolean(getToken());
  const getCachedProfile = () => readSession()?.profile || null;

  const pickToken = data => {
    const candidates = [
      data?.token,
      data?.session_token,
      data?.access_token,
      data?.customer_token,
      data?.auth_token,
      data?.data?.token,
      data?.data?.session_token,
      data?.data?.access_token,
      data?.data?.customer_token,
      data?.session?.token
    ];
    for(const value of candidates){
      const token = String(value || '').trim();
      if(token) return token;
    }
    return '';
  };

  const pickProfile = data => {
    const source = data?.customer || data?.profile || data?.user || data?.data?.customer || data?.data?.profile || data?.data || data || {};
    const name = String(source.customer_name || source.name || source.full_name || '').trim();
    const phone = normalizeMobile(source.phone || source.mobile || '');
    const email = String(source.email || '').trim();
    if(!name && !phone && !email) return null;
    return { customer_name: name, phone, email };
  };

  const parseJsonSafe = async response => {
    try {
      return await response.json();
    } catch(_error){
      return null;
    }
  };

  const friendlyError = (fallback, data, status) => {
    const apiMessage = String(extractApiMessage(data) || '').trim();
    if(status === 401 || status === 403){
      return apiMessage || 'Please log in again to continue.';
    }
    if(status === 429){
      return apiMessage || 'Too many attempts. Please wait a moment and try again.';
    }
    if(status === 0 || status == null){
      return 'Unable to connect. Please try again.';
    }
    if(status >= 500){
      return apiMessage || fallback;
    }
    return apiMessage || fallback;
  };

  const REQUEST_TIMEOUT_MS = 25000;

  const request = async (url, options = {}) => {
    if(!API_BASE){
      const configError = new Error('API is not configured. Please try again later.');
      configError.code = 'CONFIG';
      throw configError;
    }

    const headers = Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, options.headers || {});
    const token = options.auth === false ? '' : getToken();
    if(token) headers.Authorization = `Bearer ${token}`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS)
      : null;

    let response;
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body != null ? JSON.stringify(options.body) : undefined,
        signal: controller?.signal
      });
    } catch(error){
      if(error?.name === 'AbortError'){
        const timeoutError = new Error('Request timed out. Please try again.');
        timeoutError.code = 'TIMEOUT';
        timeoutError.status = 0;
        throw timeoutError;
      }
      const networkError = new Error('Unable to connect. Please try again.');
      networkError.code = 'NETWORK';
      networkError.status = 0;
      throw networkError;
    } finally {
      if(timeoutId) window.clearTimeout(timeoutId);
    }

    const data = await parseJsonSafe(response);
    return { response, data };
  };

  const requestOtp = async phoneRaw => {
    const phone = normalizeMobile(phoneRaw);
    if(!isValidIndianMobile(phone)){
      const err = new Error('Enter a valid Indian mobile number');
      err.code = 'VALIDATION';
      throw err;
    }

    const { response, data } = await request(SEND_OTP_URL, {
      method: 'POST',
      auth: false,
      body: { phone }
    });

    if(!response.ok || data?.success === false){
      const err = new Error(friendlyError('Unable to send OTP. Please try again.', data, response.status));
      err.code = 'REQUEST_OTP';
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return {
      success: true,
      phone,
      message: extractApiMessage(data) || 'OTP sent successfully',
      raw: data
    };
  };

  const verifyOtp = async (phoneRaw, otpRaw) => {
    const phone = normalizeMobile(phoneRaw);
    const otp = String(otpRaw || '').replace(/\D/g, '').slice(0, 6);

    if(!isValidIndianMobile(phone)){
      const err = new Error('Enter a valid Indian mobile number');
      err.code = 'VALIDATION';
      throw err;
    }
    if(!/^\d{6}$/.test(otp)){
      const err = new Error('Enter the 6-digit OTP');
      err.code = 'VALIDATION';
      throw err;
    }

    const { response, data } = await request(VERIFY_OTP_URL, {
      method: 'POST',
      auth: false,
      body: { phone, otp }
    });

    if(!response.ok || data?.success === false){
      const apiMessage = String(extractApiMessage(data) || '').toLowerCase();
      let message = friendlyError('Invalid or expired OTP. Please try again.', data, response.status);
      if(apiMessage.includes('expir')){
        message = 'OTP expired. Please request a new OTP.';
      } else if(apiMessage.includes('invalid') || response.status === 400){
        message = friendlyError('Invalid or expired OTP. Please try again.', data, response.status);
      }
      const err = new Error(message);
      err.code = 'VERIFY_OTP';
      err.status = response.status;
      err.data = data;
      throw err;
    }

    const token = pickToken(data);
    if(!token){
      const err = new Error('Unable to start your session. Please try again.');
      err.code = 'NO_TOKEN';
      err.data = data;
      throw err;
    }

    const profile = pickProfile(data) || { customer_name: '', phone, email: '' };
    if(!profile.phone) profile.phone = phone;
    writeSession({ token, profile });

    return { success: true, token, profile, raw: data };
  };

  const verifyOtpOwnership = async (phoneRaw, otpRaw) => {
    const phone = normalizeMobile(phoneRaw);
    const otp = String(otpRaw || '').replace(/\D/g, '').slice(0, 6);

    if(!isValidIndianMobile(phone)){
      const err = new Error('Enter a valid 10-digit Indian mobile number.');
      err.code = 'VALIDATION';
      throw err;
    }
    if(!/^\d{6}$/.test(otp)){
      const err = new Error('Enter the 6-digit OTP');
      err.code = 'VALIDATION';
      throw err;
    }

    const { response, data } = await request(VERIFY_OTP_OWNERSHIP_URL, {
      method: 'POST',
      auth: false,
      body: { phone, otp }
    });

    if(!response.ok || data?.success === false){
      const apiMessage = String(extractApiMessage(data) || '');
      const lower = apiMessage.toLowerCase();
      let message = friendlyError('Incorrect OTP. Please check and try again.', data, response.status);
      if(lower.includes('expir')){
        message = 'OTP expired. Please request a new OTP.';
      } else if(lower.includes('incorrect') || lower.includes('invalid')){
        message = apiMessage || 'Incorrect OTP. Please check and try again.';
      } else if(response.status === 429){
        message = apiMessage || 'Please wait before requesting another OTP.';
      }
      const err = new Error(message);
      err.code = 'VERIFY_OTP_OWNERSHIP';
      err.status = response.status;
      err.data = data;
      throw err;
    }

    const verifiedPhone = normalizeMobile(data?.phone || phone);
    return { success: true, phone: verifiedPhone };
  };

  const logout = async () => {
    const token = getToken();
    if(token){
      try {
        await request(LOGOUT_URL, { method: 'POST', body: {} });
      } catch(_error){
        /* Always clear local session even if logout API fails. */
      }
    }
    clearSession();
    return { success: true };
  };

  const ensureAuth = () => {
    if(!getToken()){
      const err = new Error('Please log in to continue.');
      err.code = 'UNAUTHENTICATED';
      err.status = 401;
      throw err;
    }
  };

  const handleAuthFailure = (response, data) => {
    if(response.status === 401){
      clearSession();
    }
    const err = new Error(friendlyError('Please log in again to continue.', data, response.status));
    err.code = response.status === 403 ? 'FORBIDDEN' : 'UNAUTHENTICATED';
    err.status = response.status;
    err.data = data;
    throw err;
  };

  const getProfile = async ({ refresh = true } = {}) => {
    ensureAuth();
    if(!refresh){
      const cached = getCachedProfile();
      if(cached) return cached;
    }

    const { response, data } = await request(PROFILE_URL);
    if(response.status === 401 || response.status === 403){
      handleAuthFailure(response, data);
    }
    if(!response.ok || data?.success === false){
      const err = new Error(friendlyError('Unable to load your profile.', data, response.status));
      err.code = 'PROFILE';
      err.status = response.status;
      err.data = data;
      throw err;
    }

    const profile = pickProfile(data) || getCachedProfile() || { customer_name: '', phone: '', email: '' };
    const session = readSession();
    if(session) writeSession({ token: session.token, profile });
    return profile;
  };

  const unwrapOrders = data => {
    const list = data?.orders || data?.data?.orders || data?.data || data?.results || [];
    return Array.isArray(list) ? list : [];
  };

  const unwrapOrder = data => (
    data?.order || data?.data?.order || data?.data || (data && data.id ? data : null)
  );

  const getOrders = async () => {
    ensureAuth();
    const { response, data } = await request(ORDERS_URL);
    if(response.status === 401 || response.status === 403){
      handleAuthFailure(response, data);
    }
    if(!response.ok || data?.success === false){
      const err = new Error(friendlyError('Unable to load your orders.', data, response.status));
      err.code = 'ORDERS';
      err.status = response.status;
      err.data = data;
      throw err;
    }

    const orders = unwrapOrders(data).slice();
    orders.sort((a, b) => {
      const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
      const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
    return orders;
  };

  const getCurrentOrder = async () => {
    ensureAuth();
    const { response, data } = await request(CURRENT_ORDER_URL);
    if(response.status === 401 || response.status === 403){
      handleAuthFailure(response, data);
    }
    if(response.status === 404){
      return null;
    }
    if(!response.ok || data?.success === false){
      /* Fallback: caller can derive current order from getOrders(). */
      const err = new Error(friendlyError('Unable to load current order.', data, response.status));
      err.code = 'CURRENT_ORDER';
      err.status = response.status;
      err.data = data;
      throw err;
    }
    if(data?.order === null || data?.current_order === null) return null;
    return unwrapOrder(data) || data?.current_order || null;
  };

  const getOrder = async orderId => {
    ensureAuth();
    const id = encodeURIComponent(String(orderId));
    const { response, data } = await request(`${ORDERS_URL}/${id}`);
    if(response.status === 401 || response.status === 403){
      handleAuthFailure(response, data);
    }
    if(!response.ok || data?.success === false){
      const err = new Error(friendlyError('Unable to load this order.', data, response.status));
      err.code = 'ORDER';
      err.status = response.status;
      err.data = data;
      throw err;
    }
    const order = unwrapOrder(data);
    if(!order){
      const err = new Error('Unable to load this order.');
      err.code = 'ORDER';
      throw err;
    }
    return order;
  };

  const getTracking = async orderId => {
    ensureAuth();
    const id = encodeURIComponent(String(orderId));
    const { response, data } = await request(`${ORDERS_URL}/${id}/tracking`);
    if(response.status === 401 || response.status === 403){
      handleAuthFailure(response, data);
    }
    if(!response.ok || data?.success === false){
      const err = new Error(friendlyError('Unable to load tracking information.', data, response.status));
      err.code = 'TRACKING';
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data?.tracking || data?.data || data || {};
  };

  const cancelOrder = async orderId => {
    ensureAuth();
    const id = encodeURIComponent(String(orderId));
    const { response, data } = await request(`${ORDERS_URL}/${id}/cancel`, {
      method: 'POST',
      body: {}
    });
    if(response.status === 401){
      handleAuthFailure(response, data);
    }
    if(!response.ok || data?.success === false){
      const err = new Error(friendlyError('Unable to cancel this order.', data, response.status));
      err.code = response.status === 403 ? 'FORBIDDEN' : 'CANCEL';
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return {
      success: true,
      message: extractApiMessage(data) || 'Order cancelled successfully',
      order: unwrapOrder(data)
    };
  };

  const buildInvoiceDownloadUrl = ({ orderId, razorpayPaymentId }) => {
    const params = new URLSearchParams({
      order_id: String(orderId),
      razorpay_payment_id: String(razorpayPaymentId || '')
    });
    return `${INVOICE_DOWNLOAD_BASE}?${params.toString()}`;
  };

  const downloadInvoice = async orderId => {
    ensureAuth();
    if(!API_BASE){
      const configError = new Error('API is not configured. Please try again later.');
      configError.code = 'CONFIG';
      throw configError;
    }

    const params = new URLSearchParams({ order_id: String(orderId) });
    const url = `${INVOICE_DOWNLOAD_BASE}?${params.toString()}`;
    const headers = { Accept: 'application/pdf, application/json' };
    const token = getToken();
    if(token) headers.Authorization = `Bearer ${token}`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      : null;

    let response;
    try {
      response = await fetch(url, { method: 'GET', headers, signal: controller?.signal });
    } catch(error){
      if(error?.name === 'AbortError'){
        const timeoutError = new Error('Request timed out. Please try again.');
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      const networkError = new Error('Unable to connect. Please try again.');
      networkError.code = 'NETWORK';
      throw networkError;
    } finally {
      if(timeoutId) window.clearTimeout(timeoutId);
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if(response.status === 401 || response.status === 403){
      const data = contentType.includes('json') ? await parseJsonSafe(response) : null;
      handleAuthFailure(response, data);
    }
    if(response.status === 202){
      const data = contentType.includes('json') ? await parseJsonSafe(response) : null;
      const err = new Error(extractApiMessage(data) || 'Invoice is being generated...');
      err.code = 'INVOICE_PENDING';
      err.status = 202;
      throw err;
    }
    if(!response.ok){
      const data = contentType.includes('json') ? await parseJsonSafe(response) : null;
      const err = new Error(friendlyError('Invoice is being generated...', data, response.status));
      err.code = 'INVOICE';
      err.status = response.status;
      throw err;
    }
    if(!contentType.includes('pdf')){
      const data = await parseJsonSafe(response);
      const err = new Error(extractApiMessage(data) || 'Invoice is being generated...');
      err.code = 'INVOICE_PENDING';
      throw err;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    return { success: true, url: objectUrl };
  };

  window.TelAquaCustomerAuth = {
    STORAGE_KEY,
    API_BASE,
    SEND_OTP_URL,
    VERIFY_OTP_URL,
    VERIFY_OTP_OWNERSHIP_URL,
    normalizeMobile,
    isValidIndianMobile,
    isLoggedIn,
    getToken,
    getCachedProfile,
    clearSession,
    requestOtp,
    verifyOtp,
    verifyOtpOwnership,
    logout,
    getProfile,
    getOrders,
    getCurrentOrder,
    getOrder,
    getTracking,
    cancelOrder,
    buildInvoiceDownloadUrl,
    downloadInvoice
  };
})();
