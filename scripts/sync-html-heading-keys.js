const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'locales');

const patches = {
  hi: {
    'home.product.heading': '<span class="product-story-heading-accent">2-in-1</span> पीएच और तापमान मीटर',
    'home.dismantle.heading': '<span class="dismantle-heading-line">आँखें नहीं देख सकतीं। यह</span><span class="dismantle-heading-line"><em class="dismantle-heading-accent">2in1</em> मीटर देख सकता है।</span>',
    'home.water.heading': '<span class="water-testing-heading-line">यह क्यों</span><span class="water-testing-heading-line"><em class="water-testing-heading-accent">ज़रूरी है</em></span>',
    'home.pricing.heading': 'अधिकतम <span class="home-pricing-accent">मूल्य।</span> न्यूनतम लागत।',
    'home.science.heading': 'किसानों के लिए बना। <span class="science-trust-accent">विज्ञान</span> से समर्थित।',
    'cal.hero.heading': '<span class="cal-hero-heading-orange">कैलिब्रेट करें</span> <span class="cal-hero-heading-navy">प्रो की तरह।</span>',
    'cal.videos.heading': 'कदम-दर-कदम <span class="cal-accent">कैलिब्रेशन</span> देखें',
    'cal.tips.heading': '<span class="cal-accent">कैलिब्रेशन</span> सुझाव',
    'cal.pricing.heading': 'अधिकतम <span class="home-pricing-accent">मूल्य।</span> न्यूनतम लागत।'
  },
  te: {
    'home.product.heading': '<span class="product-story-heading-accent">2-in-1</span> పిహెచ్ మరియు ఉష్ణోగ్రత మీటర్',
    'home.dismantle.heading': '<span class="dismantle-heading-line">కళ్ళు చూడలేవు. ఈ</span><span class="dismantle-heading-line"><em class="dismantle-heading-accent">2in1</em> మీటర్ చూడగలదు.</span>',
    'home.water.heading': '<span class="water-testing-heading-line">ఇది ఎందుకు</span><span class="water-testing-heading-line"><em class="water-testing-heading-accent">ముఖ్యం</em></span>',
    'home.pricing.heading': 'గరిష్ట <span class="home-pricing-accent">విలువ.</span> కనిష్ట ఖర్చు.',
    'home.science.heading': 'రైతుల కోసం నిర్మించబడింది. <span class="science-trust-accent">సైన్స్</span> మద్దతు.',
    'cal.hero.heading': '<span class="cal-hero-heading-orange">క్యాలిబ్రేట్ చేయండి</span> <span class="cal-hero-heading-navy">ప్రోలా.</span>',
    'cal.videos.heading': 'దశలవారీ <span class="cal-accent">క్యాలిబ్రేషన్</span> చూడండి',
    'cal.tips.heading': '<span class="cal-accent">క్యాలిబ్రేషన్</span> చిట్కాలు',
    'cal.pricing.heading': 'గరిష్ట <span class="home-pricing-accent">విలువ.</span> కనిష్ట ఖర్చు.'
  },
  bn: {
    'home.product.heading': '<span class="product-story-heading-accent">2-in-1</span> পিএইচ এবং তাপমাত্রা মিটার',
    'home.dismantle.heading': '<span class="dismantle-heading-line">চোখ পারে না। এই</span><span class="dismantle-heading-line"><em class="dismantle-heading-accent">2in1</em> মিটার পারে।</span>',
    'home.water.heading': '<span class="water-testing-heading-line">কেন এটা</span><span class="water-testing-heading-line"><em class="water-testing-heading-accent">গুরুত্বপূর্ণ</em></span>',
    'home.pricing.heading': 'সর্বোচ্চ <span class="home-pricing-accent">মূল্য।</span> সর্বনিম্ন খরচ।',
    'home.science.heading': 'কৃষকদের জন্য তৈরি। <span class="science-trust-accent">বিজ্ঞানে</span> সমর্থিত।',
    'cal.hero.heading': '<span class="cal-hero-heading-orange">ক্যালিব্রেট করুন</span> <span class="cal-hero-heading-navy">প্রের মতো।</span>',
    'cal.videos.heading': 'ধাপে ধাপে <span class="cal-accent">ক্যালিব্রেশন</span> দেখুন',
    'cal.tips.heading': '<span class="cal-accent">ক্যালিব্রেশন</span> টিপস',
    'cal.pricing.heading': 'সর্বোচ্চ <span class="home-pricing-accent">মূল্য।</span> সর্বনিম্ন খরচ।'
  }
};

for (const [lang, map] of Object.entries(patches)) {
  const file = path.join(DIR, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(data, map);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log('patched', lang);
}
