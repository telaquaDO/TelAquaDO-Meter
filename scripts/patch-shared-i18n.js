/**
 * Patches shared nav/footer chrome + injects i18n.js across HTML pages.
 * Run: node scripts/patch-shared-i18n.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = [
  'index.html',
  'about.html',
  'contact.html',
  'cart.html',
  'checkout.html',
  'how-to-calibrate.html',
  'order-success.html',
  'product.html',
  'account.html',
  'shrimp-farming.html',
  'fish-farming.html'
];

const NAV_LINK_RE = /<nav class="nav-links">[\s\S]*?<\/nav>/;
const NAV_TOGGLE_RE = /<button class="nav-toggle" aria-label="[^"]*">/;
const LOGO_LINK_RE = /(<a href="index\.html" class="logo") aria-label="[^"]*">/;
const LOGO_IMG_RE = /(<img src="assets\/images\/logo\.png") alt="[^"]*"(>)/;
const FOOTER_LOGO_IMG_RE = /(<img src="assets\/images\/brand\/tel-aqua-logo-footer\.png[^"]*") alt="[^"]*"/;
const LANG_BTN_RE = /<button type="button" class="icon-btn lang-btn" aria-label="[^"]*">/g;
const ORDER_NOW_RE = /(<a href="cart\.html" class="btn btn-primary nav-buy js-order-link")>([^<]*)<\/a>/g;
const CART_ARIA_RE = /(<a href="cart\.html" class="icon-btn cart-icon-link") aria-label="[^"]*">/g;

function patchNavLinks(html, file) {
  const active = {
    'how-to-calibrate.html': 'how',
    'about.html': 'about',
    'contact.html': 'contact',
    'index.html': 'home'
  }[file] || '';

  const cls = key => (active === key ? ' class="active"' : '');
  const block = `<nav class="nav-links">
      <a href="index.html"${cls('home')} data-i18n="nav.home">Home</a>
      <a href="how-to-calibrate.html"${cls('how')} data-i18n="nav.howToCalibrate">Calibrate & Care</a>
      <a href="about.html"${cls('about')} data-i18n="nav.ourStory">Our Story</a>
      <a href="contact.html"${cls('contact')} data-i18n="nav.contact">Contact</a>
    </nav>`;
  return html.replace(NAV_LINK_RE, block);
}

function patchFooter(html) {
  let out = html;
  out = out.replace(
    /(<div class="footer-brand">[\s\S]*?<a href="index\.html" class="logo") aria-label="[^"]*">/,
    '$1 aria-label="Tel-Aqua home" data-i18n-aria-label="nav.homeAria">'
  );
  out = out.replace(
    FOOTER_LOGO_IMG_RE,
    '$1 alt="Tel-Aqua - Lab in your Pocket" data-i18n-alt="nav.logoAlt"'
  );
  out = out.replace(
    /<p>A simple, accurate digital pH &amp; temperature meter, built for shrimp and fish farmers\.<\/p>/,
    '<p data-i18n="footer.tagline">A simple, accurate digital pH &amp; temperature meter, built for shrimp and fish farmers.</p>'
  );
  out = out.replace(/<h4>Company<\/h4>/g, '<h4 data-i18n="footer.company">Company</h4>');
  out = out.replace(
    /(<a href="about\.html")>(Our Story)<\/a>/g,
    '$1 data-i18n="footer.ourStory">$2</a>'
  );
  out = out.replace(
    /(<a href="about\.html#mission")>(Mission)<\/a>/g,
    '$1 data-i18n="footer.mission">$2</a>'
  );
  out = out.replace(
    /(<div class="footer-col">[\s\S]*?<a href="contact\.html")>(Contact)<\/a>/g,
    (m) => m.replace('>Contact</a>', ' data-i18n="footer.contact">Contact</a>')
  );
  // Safer contact footer link: only in footer-col after Company block
  out = out.replace(
    /(<h4 data-i18n="footer\.company">Company<\/h4>\s*<a[^>]*>[\s\S]*?<a href="contact\.html")(?![^>]*data-i18n)/,
    '$1 data-i18n="footer.contact"'
  );
  out = out.replace(/<h4>Product<\/h4>/g, '<h4 data-i18n="footer.product">Product</h4>');
  out = out.replace(
    /(<a href="why-telaqua\.html")>(Why Tel-Aqua)<\/a>/g,
    '$1 data-i18n="footer.whyTelaqua">$2</a>'
  );
  out = out.replace(
    /(<a href="index\.html#pricing")>(Order Tel-Aqua pH meter)<\/a>/g,
    '$1 data-i18n="footer.orderMeter">$2</a>'
  );
  out = out.replace(
    /(<a href="index\.html#faq")>(FAQs)<\/a>/g,
    '$1 data-i18n="footer.faqs">$2</a>'
  );
  out = out.replace(
    /(<a href="index\.html#pricing")(?![^>]*data-i18n)>(Buy Now)<\/a>/g,
    '$1 data-i18n="footer.buyNow">$2</a>'
  );
  out = out.replace(/<h4>Legal<\/h4>/g, '<h4 data-i18n="footer.legal">Legal</h4>');
  out = out.replace(
    /(<a href="#")>(Privacy Policy)<\/a>/g,
    '$1 data-i18n="footer.privacy">$2</a>'
  );
  out = out.replace(
    /(<a href="#")>(Returns & Warranty Policy|Terms of Service)<\/a>/g,
    '$1 data-i18n="footer.terms">$2</a>'
  );
  out = out.replace(
    /<p class="footer-follow-label">Follow Us<\/p>/g,
    '<p class="footer-follow-label" data-i18n="footer.followUs">Follow Us</p>'
  );
  out = out.replace(
    /<strong>Certified Product<\/strong>\s*<span>Tested for accuracy and reliability<\/span>/g,
    '<strong data-i18n="footer.certifiedTitle">Certified Product</strong>\n          <span data-i18n="footer.certifiedDesc">Tested for accuracy and reliability</span>'
  );
  out = out.replace(
    /<strong>Customer Support<\/strong>\s*<span>We're here to help you every step of the way<\/span>/g,
    '<strong data-i18n="footer.supportTitle">Customer Support</strong>\n          <span data-i18n="footer.supportDesc">We\'re here to help you every step of the way</span>'
  );
  out = out.replace(
    /<strong>Fast &amp; Secure Delivery<\/strong>\s*<span>Quick shipping across India<\/span>/g,
    '<strong data-i18n="footer.deliveryTitle">Fast &amp; Secure Delivery</strong>\n          <span data-i18n="footer.deliveryDesc">Quick shipping across India</span>'
  );
  out = out.replace(
    /<span>&copy; 2026 Tel-Aqua\. All rights reserved\.<\/span>/g,
    '<span data-i18n="footer.copyright">&copy; 2026 Tel-Aqua. All rights reserved.</span>'
  );
  return out;
}

function patchSticky(html) {
  let out = html;
  out = out.replace(
    /(<a[^>]*class="[^"]*floating-buy[^"]*"[^>]*>)\s*<span>Buy Now<\/span>/g,
    '$1<span data-i18n="floating.buyNow">Buy Now</span>'
  );
  out = out.replace(
    /(<aside class="mobile-sticky-buy") aria-label="[^"]*">/g,
    '$1 aria-label="Buy Tel-Aqua" data-i18n-aria-label="sticky.ariaLabel">'
  );
  out = out.replace(
    /<span class="mobile-sticky-buy__mrp">MRP<\/span>/g,
    '<span class="mobile-sticky-buy__mrp" data-i18n="sticky.mrp">MRP</span>'
  );
  out = out.replace(
    /<p class="mobile-sticky-buy__sub">2-in-1 pH &amp; Temp Meter<\/p>/g,
    '<p class="mobile-sticky-buy__sub" data-i18n="sticky.subtitle">2-in-1 pH &amp; Temp Meter</p>'
  );
  out = out.replace(
    /(class="mobile-sticky-buy__cta[^"]*"[^>]*>)Buy Now<\/a>/g,
    '$1<span data-i18n="sticky.buyNow">Buy Now</span></a>'
  );
  return out;
}

function injectI18nScript(html) {
  if (html.includes('js/i18n.js')) return html;
  // Insert before products.js or cart.js or first local js after body scripts
  const markers = [
    '<script src="js/products.js',
    '<script src="js/cart.js',
    '<script src="js/main.js',
    '<script src="https://cdnjs.cloudflare.com'
  ];
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      return html.slice(0, idx) + '<script src="js/i18n.js?v=1"></script>\n' + html.slice(idx);
    }
  }
  return html.replace('</body>', '<script src="js/i18n.js?v=1"></script>\n</body>');
}

function bumpNavCss(html) {
  return html.replace(/nav-footer\.css\?v=\d+/g, 'nav-footer.css?v=61')
    .replace(/base\.css\?v=\d+/g, 'base.css?v=6');
}

for (const file of PAGES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    console.warn('skip missing', file);
    continue;
  }
  let html = fs.readFileSync(full, 'utf8');
  html = patchNavLinks(html, file);
  html = html.replace(NAV_TOGGLE_RE, '<button class="nav-toggle" aria-label="Toggle menu" data-i18n-aria-label="nav.toggleMenu">');
  html = html.replace(LOGO_LINK_RE, '$1 aria-label="Tel-Aqua home" data-i18n-aria-label="nav.homeAria">');
  html = html.replace(LOGO_IMG_RE, '$1 alt="Tel-Aqua - Lab in your Pocket" data-i18n-alt="nav.logoAlt"$2');
  html = html.replace(LANG_BTN_RE, '<button type="button" class="icon-btn lang-btn" aria-label="Change language" data-i18n-aria-label="nav.changeLanguage">');
  html = html.replace(ORDER_NOW_RE, '$1 data-i18n="nav.orderNow">ORDER NOW</a>');
  html = html.replace(CART_ARIA_RE, '$1 aria-label="Cart" data-i18n-aria-label="nav.cart">');
  html = patchFooter(html);
  html = patchSticky(html);
  html = injectI18nScript(html);
  html = bumpNavCss(html);
  fs.writeFileSync(full, html);
  console.log('patched', file);
}

console.log('done');
