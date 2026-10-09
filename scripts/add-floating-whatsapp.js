#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const wa =
  '<a href="https://wa.me/918977591115" class="floating-whatsapp" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" data-i18n-aria-label="floating.whatsappAria"><img src="assets/images/icons/whatsapp.png" alt="" width="32" height="32" decoding="async"></a>\n';

const files = fs.readdirSync('.').filter((f) => f.endsWith('.html'));
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('floating-whatsapp')) {
    console.log('skip', file);
    continue;
  }
  let next = html;
  if (next.includes('class="floating-buy')) {
    next = next.replace(
      /<a href="cart\.html" class="floating-buy[^>]*>[\s\S]*?<\/a>/,
      (m) => wa + m
    );
  } else if (next.includes('mobile-sticky-buy')) {
    next = next.replace(
      /<aside class="mobile-sticky-buy"/,
      `${wa}<aside class="mobile-sticky-buy"`
    );
  } else {
    console.log('no insert', file);
    continue;
  }
  next = next.replace(/nav-footer\.css\?v=\d+/g, 'nav-footer.css?v=69');
  fs.writeFileSync(file, next);
  console.log('ok', file);
}

const aria = {
  en: 'Chat on WhatsApp',
  hi: 'व्हाट्सऐप पर चैट करें',
  te: 'వాట్సాప్‌లో చాట్ చేయండి',
  bn: 'হোয়াটসঅ্যাপে চ্যাট করুন',
};
for (const [lang, text] of Object.entries(aria)) {
  const p = path.join('locales', `${lang}.json`);
  const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
  obj['floating.whatsappAria'] = text;
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`);
}
console.log('locales updated');
