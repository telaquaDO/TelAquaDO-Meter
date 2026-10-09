#!/usr/bin/env node
/**
 * Fix i18n gaps: keep Tel-Aqua Latin, fix nameplate order,
 * add Our Story prefix/watermark/highlight keys, mobile product heading.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'locales');

const brandReplacements = [
  [/टेल-एक्वा/g, 'Tel-Aqua'],
  [/టెల్-అక్వా/g, 'Tel-Aqua'],
  [/টেল-অ্যাকোয়া/g, 'Tel-Aqua'],
];

const patches = {
  en: {
    'story.scene1.highlight': '<span style="text-transform:none">pH</span> Meter',
    'story.scene1.watermark': 'TRUSTED',
    'story.scene2.prefix': '<span style="text-transform:none">pH</span> Meter',
    'story.scene2.watermark': 'CHALLENGE',
    'story.scene3.watermark': 'SOLUTION',
    'story.scene4.prefix': 'Tel-Aqua <span style="text-transform:none">pH</span> Meter',
    'story.scene4.watermark': 'RESULT',
    'home.product.mobileHeading':
      '<span class="product-story-mobile-heading-line"><em class="product-story-heading-accent">Tel-Aqua</em> <span style="text-transform:none">pH</span></span><span class="product-story-mobile-heading-line">Meter</span>',
  },
  hi: {
    'home.nameplate.brand': 'Tel-Aqua',
    'home.nameplate.phTemp': 'पीएच मीटर',
    'home.nameplate.line1': 'डिजिटल पीएच मीटर',
    'home.nameplate.line2': 'सटीक जल परीक्षण के लिए',
    'sticky.subtitle': 'Tel-Aqua पीएच मीटर',
    'product.meter.name': 'Tel-Aqua पीएच मीटर',
    'footer.tagline':
      'झींगा और मछली किसानों के लिए बना सरल, सटीक डिजिटल Tel-Aqua पीएच मीटर।',
    'footer.whyTelaqua': 'Tel-Aqua पीएच मीटर क्यों',
    'footer.orderMeter': 'Tel-Aqua पीएच मीटर ऑर्डर करें',
    'footer.copyright': '© 2026 Tel-Aqua। सर्वाधिकार सुरक्षित।',
    'story.scene1.highlight': 'पीएच मीटर',
    'story.scene1.watermark': 'TRUSTED',
    'story.scene2.prefix': 'Tel-Aqua पीएच मीटर',
    'story.scene2.watermark': 'CHALLENGE',
    'story.scene3.watermark': 'SOLUTION',
    'story.scene4.prefix': 'Tel-Aqua पीएच मीटर',
    'story.scene4.watermark': 'RESULT',
    'home.product.mobileHeading':
      '<span class="product-story-mobile-heading-line"><em class="product-story-heading-accent">Tel-Aqua</em> पीएच</span><span class="product-story-mobile-heading-line">मीटर</span>',
    'nav.homeAria': 'Tel-Aqua होम',
    'nav.logoAlt': 'Tel-Aqua - आपकी जेब में लैब',
    'contact.follow': 'Tel-Aqua को फॉलो करें',
    'banner.msg1': 'Tel-Aqua पीएच मीटर',
    'sticky.ariaLabel': 'Tel-Aqua खरीदें',
  },
  te: {
    'home.nameplate.brand': 'Tel-Aqua',
    'home.nameplate.phTemp': 'పిహెచ్ మీటర్',
    'home.nameplate.line1': 'డిజిటల్ పిహెచ్ మీటర్',
    'home.nameplate.line2': 'ఖచ్చితమైన నీటి పరీక్షకు',
    'sticky.subtitle': 'Tel-Aqua పిహెచ్ మీటర్',
    'product.meter.name': 'Tel-Aqua పిహెచ్ మీటర్',
    'footer.tagline':
      'రొయ్యలు మరియు చేప రైతుల కోసం రూపొందించిన సరళమైన, ఖచ్చితమైన డిజిటల్ Tel-Aqua పిహెచ్ మీటర్.',
    'footer.whyTelaqua': 'Tel-Aqua పిహెచ్ మీటర్ ఎందుకు',
    'footer.orderMeter': 'Tel-Aqua పిహెచ్ మీటర్ ఆర్డర్ చేయండి',
    'footer.copyright': '© 2026 Tel-Aqua. అన్ని హక్కులు రిజర్వ్ చేయబడ్డాయి.',
    'story.scene1.highlight': 'పిహెచ్ మీటర్',
    'story.scene1.watermark': 'TRUSTED',
    'story.scene2.prefix': 'Tel-Aqua పిహెచ్ మీటర్',
    'story.scene2.watermark': 'CHALLENGE',
    'story.scene3.watermark': 'SOLUTION',
    'story.scene4.prefix': 'Tel-Aqua పిహెచ్ మీటర్',
    'story.scene4.watermark': 'RESULT',
    'home.product.mobileHeading':
      '<span class="product-story-mobile-heading-line"><em class="product-story-heading-accent">Tel-Aqua</em> పిహెచ్</span><span class="product-story-mobile-heading-line">మీటర్</span>',
  },
  bn: {
    'home.nameplate.brand': 'Tel-Aqua',
    'home.nameplate.phTemp': 'পিএইচ মিটার',
    'home.nameplate.line1': 'ডিজিটাল পিএইচ মিটার',
    'home.nameplate.line2': 'সঠিক জল পরীক্ষার জন্য',
    'sticky.subtitle': 'Tel-Aqua পিএইচ মিটার',
    'product.meter.name': 'Tel-Aqua পিএইচ মিটার',
    'footer.tagline':
      'চিংড়ি ও মাছ চাষিদের জন্য তৈরি একটি সহজ, সঠিক ডিজিটাল Tel-Aqua পিএইচ মিটার।',
    'footer.whyTelaqua': 'কেন Tel-Aqua পিএইচ মিটার',
    'footer.orderMeter': 'Tel-Aqua পিএইচ মিটার অর্ডার করুন',
    'footer.copyright': '© 2026 Tel-Aqua। সর্বস্বত্ব সংরক্ষিত।',
    'story.scene1.highlight': 'পিএইচ মিটার',
    'story.scene1.watermark': 'TRUSTED',
    'story.scene2.prefix': 'Tel-Aqua পিএইচ মিটার',
    'story.scene2.watermark': 'CHALLENGE',
    'story.scene3.watermark': 'SOLUTION',
    'story.scene4.prefix': 'Tel-Aqua পিএইচ মিটার',
    'story.scene4.watermark': 'RESULT',
    'home.product.mobileHeading':
      '<span class="product-story-mobile-heading-line"><em class="product-story-heading-accent">Tel-Aqua</em> পিএইচ</span><span class="product-story-mobile-heading-line">মিটার</span>',
  },
};

for (const lang of ['en', 'hi', 'te', 'bn']) {
  const file = path.join(root, `${lang}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  const origKeys = Object.keys(JSON.parse(raw));
  const obj = JSON.parse(raw);

  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'string') continue;
    let next = v;
    for (const [re, rep] of brandReplacements) next = next.replace(re, rep);
    // Also translate leftover English "pH meter" mid-sentence in Indic locales
    if (lang !== 'en') {
      if (lang === 'hi') next = next.replace(/\bpH meter\b/gi, 'पीएच मीटर');
      if (lang === 'te') next = next.replace(/\bpH meter\b/gi, 'పిహెచ్ మీటర్');
      if (lang === 'bn') next = next.replace(/\bpH meter\b/gi, 'পিএইচ মিটার');
    }
    obj[k] = next;
  }

  Object.assign(obj, patches[lang]);

  const ordered = {};
  for (const k of origKeys) ordered[k] = obj[k];
  for (const k of Object.keys(obj)) {
    if (!(k in ordered)) ordered[k] = obj[k];
  }

  fs.writeFileSync(file, `${JSON.stringify(ordered, null, 2)}\n`);
  console.log(`patched ${lang}: ${Object.keys(ordered).length} keys`);
}
