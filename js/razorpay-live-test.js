/**
 * Hidden LIVE ₹1 Razorpay test page (/razorpay-test).
 * Uses ONLY create-test-order → openCheckout → verify-payment.
 * Never calls /api/payment/create-order.
 * After verify success: poll invoice-status only (no Swipe / Interakt).
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'telaqua_rzp_test_payment';
  const form = () => document.querySelector('#rzp-test-form');
  const payBtn = () => document.querySelector('[data-rzp-test-pay]');
  const alertEl = () => document.querySelector('#rzp-test-alert');
  const successEl = () => document.querySelector('#rzp-test-success');
  const razorpayApi = () => window.TelAquaRazorpay;

  let isBusy = false;
  let verifyStarted = false;
  let invoicePollTimer = null;
  let invoicePollActive = false;
  let invoiceRetryBound = false;
  let invoicePollSessionKey = '';
  let invoiceFinalState = '';

  const showAlert = (message, type = 'error') => {
    const el = alertEl();
    if(!el) return;
    const text = String(message || '').trim();
    if(!text){
      el.hidden = true;
      el.textContent = '';
      el.classList.remove('is-success', 'is-error');
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.classList.toggle('is-success', type === 'success');
    el.classList.toggle('is-error', type !== 'success');
  };

  const setBusy = (busy, label) => {
    isBusy = busy;
    const btn = payBtn();
    if(!btn) return;
    btn.disabled = busy;
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
    btn.textContent = busy ? (label || 'Processing...') : 'Pay ₹1';
  };

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

  const extractVerifiedOrderNumber = verified => (
    verified?.order_number ||
    verified?.orderNumber ||
    verified?.order?.order_number ||
    verified?.order?.orderNumber ||
    verified?.data?.order_number ||
    verified?.data?.orderNumber ||
    ''
  );

  const storeTestPaymentSuccess = payload => {
    try {
      const orderId = payload.order_id != null && payload.order_id !== ''
        ? Number(payload.order_id)
        : null;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        orderId: Number.isInteger(orderId) && orderId > 0 ? orderId : null,
        orderNumber: payload.order_number || '',
        paymentId: payload.razorpay_payment_id || '',
        verifiedAt: Date.now()
      }));
    } catch(err){
      console.warn('[TelAqua ₹1 test] Could not store payment success payload', err);
    }
  };

  const clearTestPaymentSuccess = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch(err){
      /* ignore */
    }
  };

  const readTestPaymentSuccess = () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(err){
      return null;
    }
  };

  const stopInvoicePolling = () => {
    if(invoicePollTimer != null){
      window.clearTimeout(invoicePollTimer);
      invoicePollTimer = null;
    }
    invoicePollActive = false;
  };

  const resetInvoiceUi = () => {
    stopInvoicePolling();
    invoicePollSessionKey = '';
    invoiceFinalState = '';
    const section = document.querySelector('[data-invoice-section]');
    if(!section) return;
    const preparing = section.querySelector('[data-invoice-preparing]');
    const ready = section.querySelector('[data-invoice-ready]');
    const timeout = section.querySelector('[data-invoice-timeout]');
    const errorEl = section.querySelector('[data-invoice-error]');
    const tryAgainBtn = section.querySelector('[data-invoice-retry]');
    const downloadEl = section.querySelector('[data-invoice-download]');
    if(preparing) preparing.hidden = false;
    if(ready) ready.hidden = true;
    if(timeout) timeout.hidden = true;
    if(errorEl){
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
    if(tryAgainBtn) tryAgainBtn.hidden = true;
    if(downloadEl){
      downloadEl.hidden = true;
      downloadEl.removeAttribute('href');
    }
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

    if(state === 'ready'){
      if(numberEl) numberEl.textContent = details.invoice_number || '—';
      if(downloadEl){
        const url = String(details.invoice_url || '').trim();
        if(url){
          downloadEl.href = url;
          downloadEl.hidden = false;
        } else {
          downloadEl.removeAttribute('href');
          downloadEl.hidden = true;
        }
      }
    }

    if(tryAgainBtn){
      tryAgainBtn.hidden = !(state === 'timeout' || state === 'error');
    }
  };

  const startInvoicePolling = ({ orderId, paymentId, force = false }) => {
    const section = document.querySelector('[data-invoice-section]');
    if(!section) return;

    const numericOrderId = Number(orderId);
    const razorpayPaymentId = String(paymentId || '').trim();
    if(!Number.isInteger(numericOrderId) || numericOrderId <= 0 || !razorpayPaymentId){
      setInvoiceUiState('timeout');
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

    const pollOnce = async () => {
      if(!invoicePollActive) return;
      attempt += 1;

      try {
        if(!razorpayApi()?.getInvoiceStatus){
          stopInvoicePolling();
          invoiceFinalState = 'timeout';
          setInvoiceUiState('timeout');
          return;
        }

        const result = await razorpayApi().getInvoiceStatus({
          order_id: numericOrderId,
          razorpay_payment_id: razorpayPaymentId
        });

        if(!invoicePollActive) return;

        if(result.invoice_ready === true){
          stopInvoicePolling();
          invoiceFinalState = 'ready';
          setInvoiceUiState('ready', {
            invoice_number: result.invoice_number,
            invoice_url: result.invoice_url
          });
          return;
        }

        if(attempt >= maxAttempts){
          stopInvoicePolling();
          invoiceFinalState = 'timeout';
          setInvoiceUiState('timeout');
          return;
        }

        scheduleNext();
      } catch(error){
        if(!invoicePollActive) return;

        if(
          error?.code === 'INVOICE_FORBIDDEN' ||
          error?.code === 'INVOICE_NOT_FOUND' ||
          error?.code === 'INVOICE_BAD_REQUEST'
        ){
          stopInvoicePolling();
          invoiceFinalState = 'error';
          setInvoiceUiState('error', {
            message: error.message || 'Unable to fetch invoice right now.'
          });
          return;
        }

        if(attempt >= maxAttempts){
          stopInvoicePolling();
          invoiceFinalState = 'timeout';
          setInvoiceUiState('timeout');
          return;
        }

        scheduleNext();
      }
    };

    pollOnce();
  };

  const bindInvoiceRetry = ({ orderId, paymentId }) => {
    const retryBtn = document.querySelector('[data-invoice-retry]');
    if(!retryBtn || invoiceRetryBound) return;
    invoiceRetryBound = true;
    retryBtn.addEventListener('click', event => {
      event.preventDefault();
      invoiceFinalState = '';
      startInvoicePolling({ orderId, paymentId, force: true });
    });
  };

  const hideSuccess = () => {
    const el = successEl();
    if(el) el.hidden = true;
    resetInvoiceUi();
  };

  const showSuccess = verified => {
    const el = successEl();
    if(!el) return;
    const orderNumber = verified.order_number || verified.orderNumber || '—';
    const paymentId = verified.razorpay_payment_id || '—';
    const orderId = verified.order_id != null ? verified.order_id : null;
    const orderEl = el.querySelector('[data-success-order-number]');
    const payEl = el.querySelector('[data-success-payment-id]');
    if(orderEl) orderEl.textContent = orderNumber;
    if(payEl) payEl.textContent = paymentId;
    el.hidden = false;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    bindInvoiceRetry({ orderId, paymentId });
    startInvoicePolling({ orderId, paymentId });
  };

  const getFormData = () => {
    const data = new FormData(form());
    return {
      customer_name: String(data.get('customer_name') || '').trim(),
      phone: String(data.get('phone') || '').replace(/\D/g, ''),
      email: String(data.get('email') || '').trim(),
      address: String(data.get('address') || '').trim(),
      city: String(data.get('city') || '').trim(),
      state: String(data.get('state') || '').trim(),
      pincode: String(data.get('pincode') || '').trim()
    };
  };

  const validate = values => {
    if(!values.customer_name) return 'Customer name is required.';
    if(!/^\d{10}$/.test(values.phone)) return 'Phone must be exactly 10 digits.';
    if(!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)){
      return 'Enter a valid email address.';
    }
    if(!values.address) return 'Address is required.';
    if(!values.city) return 'City is required.';
    if(!values.state) return 'State is required.';
    if(!/^\d{6}$/.test(values.pincode)) return 'Pincode must be exactly 6 digits.';
    return '';
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if(isBusy) return;

    hideSuccess();
    clearTestPaymentSuccess();
    showAlert('');
    verifyStarted = false;

    const values = getFormData();
    const error = validate(values);
    if(error){
      showAlert(error);
      return;
    }

    if(
      !razorpayApi()?.createTestOrder ||
      !razorpayApi()?.openCheckout ||
      !razorpayApi()?.verifyPayment
    ){
      showAlert('Payment helpers are unavailable. Refresh and try again.');
      return;
    }

    setBusy(true, 'Creating ₹1 order...');

    try {
      /* Step 1: create-test-order only (never create-order). */
      const order = await razorpayApi().createTestOrder(values);

      /* Extra safety: refuse any non-₹1 amount before Checkout. */
      if(Number(order.amount) !== 100 || order.currency !== 'INR' || order.is_test_order !== true){
        console.error('[TelAqua ₹1 test] Refusing Checkout — invalid locked order', {
          amount: order.amount,
          currency: order.currency,
          is_test_order: order.is_test_order
        });
        throw Object.assign(
          new Error('Refusing to open Checkout: amount is not a valid LIVE ₹1 test order.'),
          { code: 'TEST_ORDER_INVALID' }
        );
      }

      /* Step 2: open existing Razorpay Checkout with backend amount (100). */
      setBusy(true, 'Waiting for payment...');
      const razorpayResponse = await razorpayApi().openCheckout(
        order,
        {
          name: values.customer_name,
          email: values.email,
          contact: values.phone
        }
      );

      /* Step 3: verify with backend — source of truth. */
      if(verifyStarted) return;
      verifyStarted = true;
      setBusy(true, 'Verifying payment...');
      showAlert('Verifying payment...', 'success');

      const verified = await razorpayApi().verifyPayment({
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_signature: razorpayResponse.razorpay_signature
      });

      const paidOk =
        verified &&
        verified.success === true &&
        String(verified.payment_status || '').toLowerCase() === 'paid' &&
        verified.is_test_order === true;

      if(!paidOk){
        console.error('[TelAqua ₹1 test] Verify response not accepted', {
          success: verified?.success,
          payment_status: verified?.payment_status,
          is_test_order: verified?.is_test_order,
          order_number: verified?.order_number || null
        });
        throw Object.assign(
          new Error('Payment verification failed. This payment is not marked as Paid.'),
          { code: 'VERIFY_FAILED', data: verified }
        );
      }

      const verifiedOrderId =
        extractVerifiedOrderId(verified) ||
        extractVerifiedOrderId(order) ||
        (order.db_order_id != null ? Number(order.db_order_id) : null);
      const verifiedOrderNumber =
        extractVerifiedOrderNumber(verified) || order.order_number || '';
      const verifiedPaymentId =
        verified.razorpay_payment_id || razorpayResponse.razorpay_payment_id;

      storeTestPaymentSuccess({
        order_id: verifiedOrderId,
        order_number: verifiedOrderNumber,
        razorpay_payment_id: verifiedPaymentId
      });

      showAlert('');
      showSuccess({
        order_id: verifiedOrderId,
        order_number: verifiedOrderNumber,
        razorpay_payment_id: verifiedPaymentId
      });
      setBusy(true, 'Paid');
      const btn = payBtn();
      if(btn) btn.disabled = true;
    } catch(err){
      console.error('[TelAqua ₹1 test]', err?.code || 'ERROR', err?.message || err, err?.data || null);

      if(err?.code === 'CANCELLED'){
        showAlert('Payment cancelled. No charge was completed.');
      } else if(err?.code === 'PAYMENT_FAILED'){
        showAlert('Payment failed. Please try again.');
      } else if(err?.code === 'VERIFY_FAILED'){
        showAlert(err.message || 'Payment verification failed.');
      } else if(err?.code === 'TEST_ORDER_INVALID'){
        showAlert(err.message || 'Invalid ₹1 test order response from backend.');
      } else if(err?.code === 'NETWORK'){
        showAlert(err.message || 'Network error. Please try again.');
      } else {
        showAlert(err?.message || 'Could not complete the ₹1 live test. Please try again.');
      }

      clearTestPaymentSuccess();
      verifyStarted = false;
      setBusy(false);
    }
  };

  const restoreSuccessFromSession = () => {
    const stored = readTestPaymentSuccess();
    if(!stored?.paymentId) return;
    showSuccess({
      order_id: stored.orderId,
      order_number: stored.orderNumber,
      razorpay_payment_id: stored.paymentId
    });
    setBusy(true, 'Paid');
    const btn = payBtn();
    if(btn) btn.disabled = true;
  };

  const boot = () => {
    const el = form();
    if(!el) return;
    el.addEventListener('submit', handleSubmit);
    window.addEventListener('pagehide', stopInvoicePolling);
    restoreSuccessFromSession();
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
