/**
 * Tel-Aqua — Account page: OTP login + dashboard (Profile / My Orders / Track Orders).
 * Auth & order data via TelAquaCustomerAuth only — no hardcoded customer/order values.
 */
(() => {
  'use strict';

  const Auth = window.TelAquaCustomerAuth;
  const root = document.getElementById('account-app');
  if(!root || !Auth) return;

  const PRODUCT_NAME = 'Tel-Aqua pH Meter';
  const RESEND_COOLDOWN_MS = 30000;
  const SECTIONS = Object.freeze(['profile', 'orders', 'track']);

  let state = {
    view: 'boot',
    section: 'profile',
    phone: '',
    otpDraft: '',
    profile: null,
    orders: [],
    currentOrder: null,
    selectedOrder: null,
    tracking: null,
    trackingOrderId: null,
    trackingUnavailable: false,
    statusMessage: '',
    statusTone: '',
    busy: false,
    busyAction: '',
    invoiceBusyId: null,
    invoiceNote: '',
    resendAvailableAt: 0,
    cancelConfirmOrderId: null,
    cancelBusy: false
  };

  let resendTimer = null;

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const formatPhoneDisplay = phone => {
    const digits = Auth.normalizeMobile(phone);
    if(digits.length !== 10) return phone ? `+91 ${String(phone)}` : '—';
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  const formatMoney = amount => {
    const num = Number(amount);
    if(!Number.isFinite(num)) return '—';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formatDate = value => {
    if(!value) return '—';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const orderTotal = order => (
    order.final_total ?? order.total_amount ?? order.amount ?? order.total ?? null
  );

  const orderLabel = order => order.order_number || (order.id != null ? `#${order.id}` : 'Order');

  const normalizeStatus = value => String(value || '').trim().toLowerCase();

  const statusBadgeClass = value => {
    const s = normalizeStatus(value);
    if(!s) return 'account-status';
    if(s.includes('deliver') || s.includes('success') || s.includes('paid') || s.includes('confirm')){
      return 'account-status account-status--ok';
    }
    if(s.includes('cancel') || s.includes('fail') || s.includes('refund')){
      return 'account-status account-status--bad';
    }
    if(s.includes('ship') || s.includes('transit') || s.includes('dispatch') || s.includes('process')){
      return 'account-status account-status--info';
    }
    return 'account-status';
  };

  const isTerminalOrder = order => {
    const statuses = [
      order.order_status,
      order.shipment_status,
      order.tracking_status,
      order.status
    ].map(normalizeStatus);

    return statuses.some(s => (
      s.includes('deliver') ||
      s.includes('cancel') ||
      s === 'returned' ||
      s === 'refunded'
    ));
  };

  const isActiveOrder = order => {
    if(!order) return false;
    if(isTerminalOrder(order)) return false;
    const pay = normalizeStatus(order.payment_status);
    if(pay && pay.includes('fail')) return false;
    return true;
  };

  const findCurrentOrder = orders => orders.find(isActiveOrder) || orders[0] || null;

  const isCodOrder = order => {
    const mode = String(order?.payment_mode || order?.paymentMode || '').trim().toLowerCase();
    const method = String(order?.payment_method || order?.paymentMethod || '').trim();
    return mode === 'cod' || /^cod$/i.test(method) || /cash on delivery/i.test(method);
  };

  const hasBlockingShipment = order => {
    if(!order) return false;
    const signals = [
      order.waybill,
      order.awb,
      order.tracking_number,
      order.delhivery_shipment_id,
      order.shipment_created_at,
      order.shipment_confirmed_at,
      order.pickup_requested_at
    ];
    if(signals.some(value => String(value || '').trim())) return true;
    const ship = normalizeStatus(order.shipment_status || '');
    return Boolean(ship) && ship !== 'not created' && ship !== 'pending' && ship !== 'none';
  };

  const canCancelCodOrder = order => {
    if(!order) return false;
    if(order.can_cancel === false) return false;
    if(order.can_cancel === true) return true;
    if(!isCodOrder(order)) return false;
    const status = normalizeStatus(order.order_status || order.status);
    if(['cancelled', 'delivered', 'completed', 'shipped'].includes(status)) return false;
    if(hasBlockingShipment(order)) return false;
    return true;
  };

  const paymentMethodLabel = order => {
    const method = String(order.payment_method || order.paymentMethod || '').trim();
    const mode = String(order.payment_mode || order.paymentMode || '').trim().toLowerCase();
    if(isCodOrder(order)) return 'Cash on Delivery';
    if(!method && !mode) return '—';
    if(/^razorpay$/i.test(method) || /^online$/i.test(method) || mode === 'razorpay') return 'Online';
    return method || 'Online';
  };

  const parseSectionFromHash = () => {
    const raw = String(location.hash || '').replace(/^#/, '').toLowerCase().split('?')[0];
    if(raw === 'orders' || raw === 'my-orders' || raw === 'order') return 'orders';
    if(raw === 'track' || raw === 'tracking' || raw === 'track-orders') return 'track';
    if(raw === 'profile' || raw === 'your-profile') return 'profile';
    return '';
  };

  const setSection = (section, { pushHash = true } = {}) => {
    const next = SECTIONS.includes(section) ? section : 'profile';
    state.section = next;
    if(next !== 'orders'){
      state.selectedOrder = null;
      state.invoiceNote = '';
    }
    if(next !== 'track' && next !== 'orders'){
      state.tracking = null;
      state.trackingOrderId = null;
      state.trackingUnavailable = false;
    }
    if(pushHash){
      const hash = `#${next}`;
      if(location.hash !== hash){
        history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
      }
    }
  };

  const setStatus = (message, tone = 'error') => {
    state.statusMessage = message || '';
    state.statusTone = tone;
  };

  const statusHtml = () => {
    if(!state.statusMessage) return '';
    const cls = state.statusTone === 'ok' ? 'account-note account-note--ok' : 'account-note';
    return `<p class="${cls}" role="status">${escapeHtml(state.statusMessage)}</p>`;
  };

  const resendSecondsLeft = () => Math.max(0, Math.ceil((state.resendAvailableAt - Date.now()) / 1000));

  const startResendCooldown = () => {
    state.resendAvailableAt = Date.now() + RESEND_COOLDOWN_MS;
    if(resendTimer) window.clearInterval(resendTimer);
    updateResendButton();
    resendTimer = window.setInterval(() => {
      const left = resendSecondsLeft();
      if(left <= 0){
        window.clearInterval(resendTimer);
        resendTimer = null;
      }
      if(state.view === 'otp') updateResendButton();
    }, 250);
  };

  const updateResendButton = () => {
    const btn = document.getElementById('account-resend-otp');
    if(!btn) return;
    const seconds = resendSecondsLeft();
    const disabled = state.busy || seconds > 0;
    btn.disabled = disabled;
    btn.textContent = seconds > 0 ? `Resend OTP (${seconds}s)` : 'Resend OTP';
  };

  const focusOtpInput = () => {
    const otpInput = document.getElementById('account-otp-input');
    if(!otpInput || otpInput.disabled) return;
    otpInput.focus();
    try {
      const len = otpInput.value.length;
      otpInput.setSelectionRange(len, len);
    } catch(_error){
      /* Some input types may not support selection APIs. */
    }
  };

  const renderLogin = () => `
    <div class="account-card" data-account-panel="login">
      <span class="eyebrow">Account</span>
      <h1>Login to your account</h1>
      <p class="account-lede">Enter your mobile number to view your orders and track your purchases.</p>
      <form class="account-form" id="account-phone-form" novalidate>
        <label>
          <span>Mobile number</span>
          <div class="account-phone-row">
            <span class="account-phone-prefix" aria-hidden="true">+91</span>
            <input type="tel" name="phone" id="account-phone-input" inputmode="numeric" autocomplete="tel" maxlength="10" placeholder="89775 91115" value="${escapeHtml(state.phone)}" ${state.busy ? 'disabled' : ''} required>
          </div>
        </label>
        <button type="submit" class="btn btn-primary account-submit" ${state.busy ? 'disabled' : ''}>
          ${state.busy && state.busyAction === 'send-otp' ? 'Sending OTP...' : 'Send OTP'}
        </button>
      </form>
      ${statusHtml()}
      <div class="account-links">
        <a href="contact.html">Need help? Contact us</a>
        <a href="index.html#order">Shop pH meter</a>
      </div>
    </div>
  `;

  const renderOtp = () => {
    const seconds = resendSecondsLeft();
    const resendDisabled = state.busy || seconds > 0;
    const resendLabel = seconds > 0 ? `Resend OTP (${seconds}s)` : 'Resend OTP';
    return `
    <div class="account-card" data-account-panel="otp">
      <span class="eyebrow">Account</span>
      <h1>Enter OTP</h1>
      <p class="account-lede">Enter the 6-digit OTP sent to ${escapeHtml(formatPhoneDisplay(state.phone))}.</p>
      <form class="account-form" id="account-otp-form" novalidate>
        <label>
          <span>OTP</span>
          <input type="text" name="otp" id="account-otp-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit OTP" value="${escapeHtml(state.otpDraft)}" ${state.busy ? 'disabled' : ''} required>
        </label>
        <button type="submit" class="btn btn-primary account-submit" ${state.busy ? 'disabled' : ''}>
          ${state.busy && state.busyAction === 'verify-otp' ? 'Verifying...' : 'Verify OTP'}
        </button>
        <button type="button" class="btn account-secondary-btn" id="account-resend-otp" ${resendDisabled ? 'disabled' : ''}>${escapeHtml(resendLabel)}</button>
        <button type="button" class="account-text-btn" id="account-change-phone" ${state.busy ? 'disabled' : ''}>Change mobile number</button>
      </form>
      ${statusHtml()}
    </div>
  `;
  };

  const hasTrackableShipment = order => {
    if(!order) return false;
    const waybill = order.waybill || order.awb || order.tracking_number;
    const ship = normalizeStatus(order.shipment_status || order.tracking_status || '');
    return Boolean(waybill) || (ship && ship !== 'not created' && ship !== 'pending' && ship !== 'none');
  };

  const renderOrderCard = order => {
    const id = order.id;
    const pay = order.payment_status || '—';
    const ordStatus = order.order_status || order.status || '—';
    return `
      <article class="account-order-card" data-order-id="${escapeHtml(id)}">
        <div class="account-order-card__head">
          <strong>Order ${escapeHtml(orderLabel(order))}</strong>
          <span>${escapeHtml(formatDate(order.created_at || order.createdAt))}</span>
        </div>
        <div class="account-order-card__body">
          <p class="account-order-product">${escapeHtml(PRODUCT_NAME)}</p>
          <p>Qty: ${escapeHtml(order.quantity ?? 1)}</p>
          <p class="account-order-amount">${escapeHtml(formatMoney(orderTotal(order)))}</p>
          <p>Payment: <span class="${statusBadgeClass(pay)}">${escapeHtml(pay)}</span></p>
          <p>Order status: <span class="${statusBadgeClass(ordStatus)}">${escapeHtml(ordStatus)}</span></p>
        </div>
        <div class="account-order-card__actions">
          <button type="button" class="btn account-secondary-btn account-order-view" data-view-order="${escapeHtml(id)}">VIEW ORDER</button>
          ${canCancelCodOrder(order)
            ? `<button type="button" class="btn account-cancel-btn" data-cancel-order="${escapeHtml(id)}">Cancel Order</button>`
            : ''
          }
        </div>
      </article>
    `;
  };

  const renderTrackingPanel = () => {
    if(!state.trackingOrderId) return '';
    const tracking = state.tracking || {};
    const awb = tracking.waybill || tracking.awb || tracking.tracking_number || tracking.awb_number || '';
    const current = tracking.current_status || tracking.status || tracking.tracking_status || tracking.shipment_status || '';
    const steps = Array.isArray(tracking.timeline)
      ? tracking.timeline
      : (Array.isArray(tracking.statuses) ? tracking.statuses : (Array.isArray(tracking.scans) ? tracking.scans : []));
    const trackUrl = tracking.tracking_url || tracking.track_url || tracking.shipment_url || '';

    let stepsHtml = '';
    if(steps.length){
      stepsHtml = `<ol class="account-tracking-steps">${steps.map(step => {
        const label = typeof step === 'string'
          ? step
          : (step.status || step.scan || step.message || step.location || '');
        const when = typeof step === 'object' ? (step.date || step.datetime || step.time || '') : '';
        return `<li><strong>${escapeHtml(label || 'Update')}</strong>${when ? `<span>${escapeHtml(when)}</span>` : ''}</li>`;
      }).join('')}</ol>`;
    }

    return `
      <section class="account-section account-tracking" data-tracking-panel>
        <h2>Tracking details</h2>
        ${state.busy && state.busyAction === 'tracking' && !state.tracking ? '<p class="account-muted">Fetching tracking details...</p>' : ''}
        ${state.trackingUnavailable ? '<p class="account-muted">Tracking information will be available once your order has been shipped.</p>' : ''}
        ${awb ? `<p>AWB: <strong>${escapeHtml(awb)}</strong></p>` : ''}
        ${current ? `<p>Current Status: <strong>${escapeHtml(current)}</strong></p>` : ''}
        ${stepsHtml}
        ${!state.trackingUnavailable && !awb && !current && !steps.length && state.tracking ? '<p class="account-muted">No tracking updates are available yet.</p>' : ''}
        ${trackUrl ? `<a class="btn account-secondary-btn" href="${escapeHtml(trackUrl)}" target="_blank" rel="noopener noreferrer">Open shipment tracker</a>` : ''}
        <button type="button" class="account-text-btn" data-close-tracking>Close tracking</button>
      </section>
    `;
  };

  const renderOrderDetail = () => {
    const order = state.selectedOrder;
    if(!order) return '';

    const discount = order.discount_amount ?? order.discount;
    const shipping = order.shipping_amount ?? order.shipping_charge ?? order.shipping;
    const invoiceUrl = String(order.invoice_url || '').trim();
    const invoiceReady = Boolean(invoiceUrl) || normalizeStatus(order.invoice_status).includes('ready') || normalizeStatus(order.invoice_status) === 'generated' || normalizeStatus(order.invoice_status) === 'fallback_generated';
    const invoiceBusy = String(state.invoiceBusyId) === String(order.id);
    const useInvoiceLink = !isCodOrder(order) && invoiceReady && invoiceUrl && !/\/api\/payment\/invoice-download/i.test(invoiceUrl);
    const canTrack = hasTrackableShipment(order);
    const canCancel = canCancelCodOrder(order);
    const cancelBusy = state.cancelBusy && String(state.cancelConfirmOrderId) === String(order.id);

    return `
      <section class="account-section account-order-detail" data-order-detail>
        <div class="account-section-head">
          <h2>Order Details</h2>
          <button type="button" class="account-text-btn" data-close-detail>Back to orders</button>
        </div>
        <dl class="account-detail-grid">
          <div><dt>Order Number</dt><dd>${escapeHtml(orderLabel(order))}</dd></div>
          <div><dt>Order Date</dt><dd>${escapeHtml(formatDate(order.created_at || order.createdAt))}</dd></div>
          <div><dt>Product</dt><dd>${escapeHtml(PRODUCT_NAME)}</dd></div>
          <div><dt>Quantity</dt><dd>${escapeHtml(order.quantity ?? 1)}</dd></div>
          <div><dt>Price</dt><dd>${escapeHtml(formatMoney(order.unit_price ?? order.subtotal))}</dd></div>
          ${discount != null && Number(discount) > 0 ? `<div><dt>Discount</dt><dd>${escapeHtml(formatMoney(discount))}</dd></div>` : ''}
          ${shipping != null && Number(shipping) > 0 ? `<div><dt>Shipping</dt><dd>${escapeHtml(formatMoney(shipping))}</dd></div>` : ''}
          <div><dt>Total</dt><dd>${escapeHtml(formatMoney(orderTotal(order)))}</dd></div>
          <div><dt>Payment method</dt><dd>${escapeHtml(paymentMethodLabel(order))}</dd></div>
          <div><dt>Payment status</dt><dd>${escapeHtml(order.payment_status || '—')}</dd></div>
          <div><dt>Order status</dt><dd>${escapeHtml(order.order_status || order.status || '—')}</dd></div>
        </dl>
        <div class="account-detail-actions">
          ${canTrack
            ? `<button type="button" class="btn account-secondary-btn" data-track-order="${escapeHtml(order.id)}">TRACK ORDER</button>`
            : ''
          }
          ${useInvoiceLink
            ? `<a class="btn btn-primary" href="${escapeHtml(invoiceUrl)}" target="_blank" rel="noopener noreferrer">Download Invoice</a>`
            : `<button type="button" class="btn btn-primary" data-download-invoice="${escapeHtml(order.id)}" ${invoiceBusy ? 'disabled' : ''}>${invoiceBusy ? 'Checking invoice...' : 'Download Invoice'}</button>`
          }
          ${canCancel
            ? `<button type="button" class="btn account-cancel-btn" data-cancel-order="${escapeHtml(order.id)}" ${cancelBusy ? 'disabled' : ''}>${cancelBusy ? 'Cancelling...' : 'Cancel Order'}</button>`
            : ''
          }
        </div>
        ${!canTrack ? '<p class="account-muted">Tracking information will be available once your order has been shipped.</p>' : ''}
        ${state.invoiceNote ? `<p class="account-muted" role="status">${escapeHtml(state.invoiceNote)}</p>` : ''}
        ${renderTrackingPanel()}
      </section>
    `;
  };

  const renderSidebar = () => {
    const items = [
      { id: 'profile', label: 'Your Profile', icon: 'fa-regular fa-user' },
      { id: 'orders', label: 'My Orders', icon: 'fa-solid fa-box-open' },
      { id: 'track', label: 'Track Orders', icon: 'fa-solid fa-truck' }
    ];

    return `
      <nav class="account-sidebar" aria-label="Account">
        <ul class="account-nav">
          ${items.map(item => `
            <li>
              <button
                type="button"
                class="account-nav-item${state.section === item.id ? ' is-active' : ''}"
                data-account-section="${item.id}"
                aria-current="${state.section === item.id ? 'page' : 'false'}"
              >
                <i class="${item.icon}" aria-hidden="true"></i>
                <span>${item.label}</span>
              </button>
            </li>
          `).join('')}
          <li>
            <button type="button" class="account-nav-item account-nav-item--logout" id="account-logout" ${state.busy && state.busyAction === 'logout' ? 'disabled' : ''}>
              <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
              <span>Log out</span>
            </button>
          </li>
        </ul>
      </nav>
    `;
  };

  const renderProfileSection = () => {
    const profile = state.profile || {};
    const name = profile.customer_name || profile.name || 'Customer';
    const email = profile.email || '';
    const phone = formatPhoneDisplay(profile.phone);

    return `
      <div class="account-panel" data-account-panel="profile">
        <p class="account-greeting">Hello <strong>${escapeHtml(name)}</strong></p>
        <h2 class="account-panel-title">Account details</h2>
        <table class="account-details-table">
          <tbody>
            <tr>
              <th scope="row">Name</th>
              <td>${escapeHtml(name)}</td>
            </tr>
            <tr>
              <th scope="row">Mobile</th>
              <td>${escapeHtml(phone)}</td>
            </tr>
            <tr>
              <th scope="row">E-mail</th>
              <td>${escapeHtml(email || '—')}</td>
            </tr>
          </tbody>
        </table>
        ${statusHtml()}
      </div>
    `;
  };

  const renderOrdersSection = () => {
    if(state.selectedOrder){
      return `
        <div class="account-panel" data-account-panel="orders-detail">
          ${renderOrderDetail()}
          ${statusHtml()}
        </div>
      `;
    }

    return `
      <div class="account-panel" data-account-panel="orders">
        <h2 class="account-panel-title">My Orders</h2>
        ${state.busy && state.busyAction === 'load-profile' && !state.orders.length
          ? '<p class="account-muted">Loading your orders...</p>'
          : ''
        }
        ${!state.busy && !state.orders.length
          ? `<div class="account-empty">
              <strong>No orders yet</strong>
              <p>Your orders will appear here after you place your first order.</p>
              <a class="btn btn-primary js-order-link" href="cart.html">Order Now</a>
            </div>`
          : `<div class="account-order-list">${state.orders.map(renderOrderCard).join('')}</div>`
        }
        ${statusHtml()}
      </div>
    `;
  };

  const renderTrackSection = () => {
    const order = state.currentOrder || findCurrentOrder(state.orders);
    const canTrack = hasTrackableShipment(order);

    if(!order){
      return `
        <div class="account-panel" data-account-panel="track">
          <h2 class="account-panel-title">Track Orders</h2>
          <div class="account-empty">
            <strong>No orders to track</strong>
            <p>Once you place an order, tracking details will appear here.</p>
            <a class="btn btn-primary js-order-link" href="cart.html">Order Now</a>
          </div>
          ${statusHtml()}
        </div>
      `;
    }

    const pay = order.payment_status || '—';
    const ordStatus = order.order_status || order.status || '—';
    const shipStatus = order.shipment_status || order.tracking_status || '—';

    return `
      <div class="account-panel" data-account-panel="track">
        <h2 class="account-panel-title">Track Orders</h2>
        <div class="account-current-order">
          <p><strong>Order ${escapeHtml(orderLabel(order))}</strong></p>
          <p>${escapeHtml(PRODUCT_NAME)}</p>
          <p>Order date: ${escapeHtml(formatDate(order.created_at || order.createdAt))}</p>
          <p>Payment: <span class="${statusBadgeClass(pay)}">${escapeHtml(pay)}</span></p>
          <p>Order status: <span class="${statusBadgeClass(ordStatus)}">${escapeHtml(ordStatus)}</span></p>
          <p>Shipping status: <span class="${statusBadgeClass(shipStatus)}">${escapeHtml(shipStatus)}</span></p>
          ${canTrack
            ? `<button type="button" class="btn btn-primary" data-track-order="${escapeHtml(order.id)}">TRACK ORDER</button>`
            : `<p class="account-muted">Tracking information will be available once your order has been shipped.</p>`
          }
        </div>
        ${renderTrackingPanel()}
        ${statusHtml()}
      </div>
    `;
  };

  const renderDashboardContent = () => {
    if(state.section === 'orders') return renderOrdersSection();
    if(state.section === 'track') return renderTrackSection();
    return renderProfileSection();
  };

  const renderCancelConfirm = () => {
    if(!state.cancelConfirmOrderId) return '';
    const busy = state.cancelBusy;
    return `
      <div class="account-modal-overlay" role="presentation">
        <div class="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-cancel-title">
          <h2 id="account-cancel-title">Cancel this order?</h2>
          <p>Are you sure you want to cancel this Cash on Delivery order?</p>
          <div class="account-modal-actions">
            <button type="button" class="btn account-secondary-btn" data-cancel-keep ${busy ? 'disabled' : ''}>Keep Order</button>
            <button type="button" class="btn account-cancel-btn" data-cancel-confirm ${busy ? 'disabled' : ''}>${busy ? 'Cancelling...' : 'Yes, Cancel Order'}</button>
          </div>
        </div>
      </div>
    `;
  };

  const renderDashboard = () => `
    <div class="account-dashboard" data-account-panel="dashboard">
      ${renderSidebar()}
      <div class="account-content">
        ${renderDashboardContent()}
      </div>
    </div>
    ${renderCancelConfirm()}
  `;

  const render = () => {
    const wrap = document.querySelector('.account-wrap');
    if(wrap){
      wrap.classList.toggle('account-wrap--profile', state.view === 'dashboard');
      wrap.classList.toggle('account-wrap--auth', state.view === 'login' || state.view === 'otp');
    }

    if(state.view === 'boot'){
      root.innerHTML = `<div class="account-card"><p class="account-muted">Loading...</p></div>`;
      return;
    }
    if(state.view === 'login') root.innerHTML = renderLogin();
    else if(state.view === 'otp') root.innerHTML = renderOtp();
    else root.innerHTML = renderDashboard();
  };

  const getFormFromEvent = event => {
    if(event?.target?.tagName === 'FORM') return event.target;
    return event?.target?.closest?.('form') || null;
  };

  const loadAuthenticated = async () => {
    const fromHash = parseSectionFromHash();
    setSection(fromHash || state.section || 'profile', { pushHash: true });
    state.view = 'dashboard';
    state.busy = true;
    state.busyAction = 'load-profile';
    state.selectedOrder = null;
    state.tracking = null;
    state.trackingOrderId = null;
    state.trackingUnavailable = false;
    setStatus('');
    render();
    try {
      const profilePromise = Auth.getProfile();
      const ordersPromise = Auth.getOrders();
      let currentOrder = null;
      try {
        currentOrder = await Auth.getCurrentOrder();
      } catch(_error){
        currentOrder = null;
      }

      const [profile, orders] = await Promise.all([profilePromise, ordersPromise]);
      state.profile = profile;
      state.orders = orders;
      state.currentOrder = currentOrder && currentOrder.id ? currentOrder : findCurrentOrder(orders);
      setStatus('');
    } catch(error){
      if(error.code === 'UNAUTHENTICATED' || error.status === 401){
        Auth.clearSession();
        state.view = 'login';
        state.profile = null;
        state.orders = [];
        state.currentOrder = null;
        setStatus('Please log in to continue.');
      } else {
        setStatus(error.message || 'Unable to load your account.');
      }
    } finally {
      state.busy = false;
      state.busyAction = '';
      render();
    }
  };

  const sendOtp = async phone => {
    state.busy = true;
    state.busyAction = 'send-otp';
    setStatus('');
    render();
    try {
      await Auth.requestOtp(phone);
      state.phone = phone;
      state.otpDraft = '';
      state.view = 'otp';
      startResendCooldown();
      setStatus(`OTP sent successfully to ${formatPhoneDisplay(phone)}`, 'ok');
    } catch(error){
      state.view = 'login';
      setStatus(error.message || 'Unable to send OTP. Please try again.');
      throw error;
    } finally {
      state.busy = false;
      state.busyAction = '';
      render();
      if(state.view === 'otp') focusOtpInput();
    }
  };

  const handlePhoneSubmit = async event => {
    event.preventDefault();
    event.stopPropagation();
    if(state.busy) return;

    try {
      const form = getFormFromEvent(event) || document.getElementById('account-phone-form');
      const phoneInput = form?.querySelector?.('[name="phone"]') || document.getElementById('account-phone-input');
      const phone = Auth.normalizeMobile(phoneInput?.value || state.phone);
      state.phone = phone;

      if(!Auth.isValidIndianMobile(phone)){
        setStatus('Enter a valid Indian mobile number');
        render();
        return;
      }

      await sendOtp(phone);
    } catch(_error){
      /* Error message already set in sendOtp / validation. */
    }
  };

  const handleOtpSubmit = async event => {
    event.preventDefault();
    event.stopPropagation();
    if(state.busy) return;

    try {
      const form = getFormFromEvent(event) || document.getElementById('account-otp-form');
      const otpInput = form?.querySelector?.('[name="otp"]') || document.getElementById('account-otp-input');
      const otp = String(otpInput?.value || state.otpDraft || '').replace(/\D/g, '').slice(0, 6);
      state.otpDraft = otp;

      if(!/^\d{6}$/.test(otp)){
        setStatus('Enter the 6-digit OTP');
        render();
        focusOtpInput();
        return;
      }

      state.busy = true;
      state.busyAction = 'verify-otp';
      setStatus('');
      render();

      const result = await Auth.verifyOtp(state.phone, otp);
      state.profile = result.profile;
      state.otpDraft = '';
      if(resendTimer){
        window.clearInterval(resendTimer);
        resendTimer = null;
      }
      await loadAuthenticated();
    } catch(error){
      setStatus(error.message || 'Invalid or expired OTP. Please try again.');
      state.busy = false;
      state.busyAction = '';
      render();
      focusOtpInput();
    }
  };

  const handleLogout = async () => {
    state.busy = true;
    state.busyAction = 'logout';
    render();
    await Auth.logout();
    if(resendTimer){
      window.clearInterval(resendTimer);
      resendTimer = null;
    }
    state = {
      view: 'login',
      section: 'profile',
      phone: state.phone || '',
      otpDraft: '',
      profile: null,
      orders: [],
      currentOrder: null,
      selectedOrder: null,
      tracking: null,
      trackingOrderId: null,
      trackingUnavailable: false,
      statusMessage: '',
      statusTone: '',
      busy: false,
      busyAction: '',
      invoiceBusyId: null,
      invoiceNote: '',
      resendAvailableAt: 0,
      cancelConfirmOrderId: null,
      cancelBusy: false
    };
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    render();
  };

  const openOrderDetail = async orderId => {
    setSection('orders', { pushHash: true });
    state.busy = true;
    state.busyAction = 'order-detail';
    state.invoiceNote = '';
    setStatus('');
    render();
    try {
      const order = await Auth.getOrder(orderId);
      state.selectedOrder = order;
      state.tracking = null;
      state.trackingOrderId = null;
      state.trackingUnavailable = false;
    } catch(error){
      setStatus(error.message || 'Unable to load this order.');
      if(error.code === 'UNAUTHENTICATED' || error.status === 401){
        state.view = 'login';
      }
    } finally {
      state.busy = false;
      state.busyAction = '';
      render();
    }
  };

  const closeCancelConfirm = () => {
    if(state.cancelBusy) return;
    state.cancelConfirmOrderId = null;
    render();
  };

  const applyCancelledOrder = cancelled => {
    const next = Object.assign({}, cancelled, {
      order_status: cancelled.order_status || 'Cancelled',
      can_cancel: false
    });
    state.orders = state.orders.map(item =>
      String(item.id) === String(next.id) ? Object.assign({}, item, next) : item
    );
    if(state.selectedOrder && String(state.selectedOrder.id) === String(next.id)){
      state.selectedOrder = Object.assign({}, state.selectedOrder, next);
    }
    if(state.currentOrder && String(state.currentOrder.id) === String(next.id)){
      state.currentOrder = Object.assign({}, state.currentOrder, next);
    }
    return next;
  };

  const handleCancelOrder = async () => {
    const orderId = state.cancelConfirmOrderId;
    if(!orderId || state.cancelBusy) return;
    if(!Auth.cancelOrder){
      setStatus('Unable to cancel this order.');
      render();
      return;
    }

    state.cancelBusy = true;
    setStatus('');
    render();
    try {
      const result = await Auth.cancelOrder(orderId);
      const cancelled = result?.order || result;
      applyCancelledOrder(cancelled && cancelled.id ? cancelled : {
        id: orderId,
        order_status: 'Cancelled',
        can_cancel: false
      });
      state.cancelConfirmOrderId = null;
      state.cancelBusy = false;
      setStatus('Your Cash on Delivery order has been cancelled.', 'ok');
    } catch(error){
      state.cancelBusy = false;
      if(error.code === 'UNAUTHENTICATED' || error.status === 401){
        state.cancelConfirmOrderId = null;
        state.view = 'login';
        setStatus('Please log in again to continue.');
      } else {
        setStatus(error.message || 'Unable to cancel this order.');
      }
    } finally {
      render();
    }
  };

  const openTracking = async orderId => {
    if(state.section !== 'orders' || !state.selectedOrder){
      setSection('track', { pushHash: true });
    }
    state.trackingOrderId = orderId;
    state.tracking = null;
    state.trackingUnavailable = false;
    state.busy = true;
    state.busyAction = 'tracking';
    setStatus('');
    render();
    try {
      state.tracking = await Auth.getTracking(orderId);
      const awb = state.tracking?.waybill || state.tracking?.awb || state.tracking?.tracking_number;
      const current = state.tracking?.current_status || state.tracking?.status || state.tracking?.tracking_status;
      if(!awb && !current){
        state.trackingUnavailable = true;
      }
    } catch(error){
      state.tracking = null;
      if(error.status === 404){
        state.trackingUnavailable = true;
        setStatus('');
      } else {
        setStatus(error.message || 'Unable to load tracking information.');
      }
      if(error.code === 'UNAUTHENTICATED' || error.status === 401){
        state.view = 'login';
      }
    } finally {
      state.busy = false;
      state.busyAction = '';
      render();
    }
  };

  const handleInvoice = async orderId => {
    const order = state.selectedOrder && String(state.selectedOrder.id) === String(orderId)
      ? state.selectedOrder
      : state.orders.find(item => String(item.id) === String(orderId));

    if(!order){
      setStatus('Unable to find this order.');
      render();
      return;
    }

    const existingUrl = String(order.invoice_url || '').trim();
    const isApiDownload = /\/api\/payment\/invoice-download/i.test(existingUrl);
    if(existingUrl && !isApiDownload){
      window.open(existingUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if(isCodOrder(order)){
      if(!Auth.downloadInvoice){
        state.invoiceNote = 'Invoice is being generated...';
        render();
        return;
      }
      state.invoiceBusyId = orderId;
      state.invoiceNote = 'Invoice is being generated...';
      render();
      try {
        await Auth.downloadInvoice(order.id);
        state.invoiceNote = '';
      } catch(error){
        if(error.code === 'UNAUTHENTICATED' || error.status === 401){
          state.view = 'login';
          setStatus('Please log in again to continue.');
        } else {
          state.invoiceNote = error.message || 'Invoice is being generated...';
        }
      } finally {
        state.invoiceBusyId = null;
        render();
      }
      return;
    }

    const paymentId = String(order.razorpay_payment_id || '').trim();
    const fallbackUrl = Auth.buildInvoiceDownloadUrl({
      orderId: order.id,
      razorpayPaymentId: paymentId
    });

    if(!paymentId || !window.TelAquaRazorpay?.getInvoiceStatus){
      if(fallbackUrl && paymentId){
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      state.invoiceNote = 'Invoice is being generated...';
      render();
      return;
    }

    state.invoiceBusyId = orderId;
    state.invoiceNote = 'Invoice is being generated...';
    render();

    try {
      const result = await window.TelAquaRazorpay.getInvoiceStatus({
        order_id: order.id,
        razorpay_payment_id: paymentId
      });
      if(result.invoice_ready && result.invoice_url){
        state.selectedOrder = Object.assign({}, order, {
          invoice_url: result.invoice_url,
          invoice_number: result.invoice_number || order.invoice_number,
          invoice_status: 'ready'
        });
        state.invoiceNote = '';
        window.open(result.invoice_url, '_blank', 'noopener,noreferrer');
      } else {
        const url = result.invoice_url || Auth.buildInvoiceDownloadUrl({
          orderId: order.id,
          razorpayPaymentId: paymentId
        });
        state.invoiceNote = '';
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch(error){
      const fallbackUrl = Auth.buildInvoiceDownloadUrl({
        orderId: order.id,
        razorpayPaymentId: paymentId
      });
      if(fallbackUrl){
        state.invoiceNote = '';
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      } else {
        state.invoiceNote = error.message || 'Invoice is being generated...';
      }
    } finally {
      state.invoiceBusyId = null;
      render();
    }
  };

  root.addEventListener('submit', event => {
    const form = getFormFromEvent(event);
    if(!form) return;

    if(form.id === 'account-phone-form'){
      handlePhoneSubmit(event);
      return;
    }
    if(form.id === 'account-otp-form'){
      handleOtpSubmit(event);
    }
  });

  root.addEventListener('input', event => {
    if(event.target?.id === 'account-phone-input' || event.target?.name === 'phone'){
      state.phone = Auth.normalizeMobile(event.target.value);
      if(event.target.value !== state.phone) event.target.value = state.phone;
    }
    if(event.target?.id === 'account-otp-input' || event.target?.name === 'otp'){
      state.otpDraft = String(event.target.value || '').replace(/\D/g, '').slice(0, 6);
      if(event.target.value !== state.otpDraft) event.target.value = state.otpDraft;
    }
  });

  root.addEventListener('keydown', event => {
    if(event.key !== 'Enter') return;
    if(event.target?.id === 'account-otp-input'){
      const form = document.getElementById('account-otp-form');
      if(form && !state.busy){
        event.preventDefault();
        handleOtpSubmit(event);
      }
    }
  });

  window.addEventListener('keydown', event => {
    if(event.key === 'Escape' && state.cancelConfirmOrderId && !state.cancelBusy){
      closeCancelConfirm();
    }
  });

  root.addEventListener('click', event => {
    const cancelTrigger = event.target.closest('[data-cancel-order], [data-cancel-confirm], [data-cancel-keep]');
    if(cancelTrigger){
      event.preventDefault();
      if(cancelTrigger.hasAttribute('data-cancel-keep')){
        closeCancelConfirm();
        return;
      }
      if(cancelTrigger.hasAttribute('data-cancel-confirm')){
        handleCancelOrder();
        return;
      }
      if(state.cancelBusy) return;
      state.cancelConfirmOrderId = cancelTrigger.getAttribute('data-cancel-order');
      setStatus('');
      render();
      return;
    }

    const sectionBtn = event.target.closest('[data-account-section]');
    if(sectionBtn){
      const next = sectionBtn.getAttribute('data-account-section');
      setSection(next, { pushHash: true });
      setStatus('');
      render();
      return;
    }

    const target = event.target.closest('[data-view-order], [data-track-order], [data-download-invoice], [data-close-detail], [data-close-tracking], #account-logout, #account-resend-otp, #account-change-phone');
    if(!target) return;

    if(target.id === 'account-logout'){
      handleLogout();
      return;
    }
    if(target.id === 'account-change-phone'){
      state.view = 'login';
      state.otpDraft = '';
      setStatus('');
      render();
      const phoneInput = document.getElementById('account-phone-input');
      if(phoneInput) phoneInput.focus();
      return;
    }
    if(target.id === 'account-resend-otp'){
      if(resendSecondsLeft() > 0 || state.busy) return;
      (async () => {
        try {
          await sendOtp(Auth.normalizeMobile(state.phone));
        } catch(_error){
          /* Message already shown. */
        }
      })();
      return;
    }
    if(target.hasAttribute('data-close-detail')){
      state.selectedOrder = null;
      state.tracking = null;
      state.trackingOrderId = null;
      state.trackingUnavailable = false;
      state.invoiceNote = '';
      setStatus('');
      render();
      return;
    }
    if(target.hasAttribute('data-close-tracking')){
      state.tracking = null;
      state.trackingOrderId = null;
      state.trackingUnavailable = false;
      render();
      return;
    }
    if(target.hasAttribute('data-view-order')){
      openOrderDetail(target.getAttribute('data-view-order'));
      return;
    }
    if(target.hasAttribute('data-track-order')){
      openTracking(target.getAttribute('data-track-order'));
      return;
    }
    if(target.hasAttribute('data-download-invoice')){
      handleInvoice(target.getAttribute('data-download-invoice'));
    }
  });

  window.addEventListener('hashchange', () => {
    if(state.view !== 'dashboard') return;
    const next = parseSectionFromHash() || 'profile';
    if(next === state.section) return;
    setSection(next, { pushHash: false });
    setStatus('');
    render();
  });

  const boot = async () => {
    if(Auth.isLoggedIn()){
      await loadAuthenticated();
      return;
    }
    state.view = 'login';
    render();
  };

  boot();
})();
