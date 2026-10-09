/**
 * Patch remaining desktop section i18n (home + calibrate + about).
 * Run: node scripts/patch-remaining-i18n.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALE_DIR = path.join(ROOT, 'locales');

const KEYS = {
  en: {
    'home.nameplate.brand': 'Tel-Aqua',
    'home.nameplate.phTemp': 'pH+Temp',
    'home.nameplate.line1': 'Digital pH and',
    'home.nameplate.line2': 'Temperature Meter',
    'home.pricing.allin': 'all-in',

    'home.feature.phRange.title': 'pH Range',
    'home.feature.phRange.pill': 'pH Range 0–14',
    'home.feature.phRange.desc': '0–14',
    'home.feature.phRange.detail': 'Measures the full 0–14 pH scale so you can trust every pond and tank reading.',
    'home.feature.accuracy.title': 'Accuracy',
    'home.feature.accuracy.pill': '±0.01 Accuracy',
    'home.feature.accuracy.desc': '±0.01',
    'home.feature.accuracy.detail': 'Lab-grade ±0.01 accuracy helps you catch small shifts before they become costly losses.',
    'home.feature.atc.title': 'Automatic Temperature Compensation',
    'home.feature.atc.pill': 'Auto Temp Comp',
    'home.feature.atc.desc': 'Reliable readings in changing water conditions',
    'home.feature.atc.detail': 'Automatic temperature compensation keeps readings reliable as water conditions change through the day.',
    'home.feature.waterproof.title': 'Waterproof Design',
    'home.feature.waterproof.pill': 'Waterproof Design',
    'home.feature.waterproof.desc': 'For safe and reliable use in water',
    'home.feature.waterproof.detail': 'Built for wet fieldwork — waterproof design for safe, reliable use around ponds and tanks.',
    'home.feature.glass.title': 'Glass Electrode Probe',
    'home.feature.glass.pill': 'Glass Electrode',
    'home.feature.glass.desc': 'High quality glass electrode',
    'home.feature.glass.detail': 'A high-quality glass electrode probe delivers sensitive, consistent measurements every time.',
    'home.feature.easy.title': 'User Friendly Operation',
    'home.feature.easy.pill': 'Easy Operation',
    'home.feature.easy.desc': 'ON/OFF and CAL buttons for easy operation',
    'home.feature.easy.detail': 'Simple ON/OFF and CAL controls make everyday testing quick — no complicated setup required.',
    'home.feature.durable.title': 'Durable & Anti-Corrosive',
    'home.feature.durable.pill': 'Durable & Anti-Corrosive',
    'home.feature.durable.desc': 'Waterproof body resistant to rust and corrosion',
    'home.feature.durable.detail': 'A durable, anti-corrosive body stands up to rust, moisture, and hard farm use season after season.',

    'home.water.c1.title': 'Protect Your Shrimp From Day One',
    'home.water.c1.text': 'Ensure shrimp safety from the very start.',
    'home.water.c2.title': 'No Lab Required',
    'home.water.c2.text': 'No costly equipment. No lab testing. Test anytime, anywhere.',
    'home.water.c3.title': 'Save Shrimp. Save Money.',
    'home.water.c3.text': 'Prevent losses. Reduce costs.',
    'home.water.c4.title': 'Low Cost, High Safety',
    'home.water.c4.text': 'Small investment. Big protection.',

    'home.dismantle.cap.title': 'Protection Cap',
    'home.dismantle.cap.desc': 'Protects the probe and ensures safety.',
    'home.dismantle.probe.title': 'Agile Glass Probe',
    'home.dismantle.probe.desc': 'High sensitivity glass electrode.',
    'home.dismantle.buttons.title': 'Control Buttons',
    'home.dismantle.buttons.desc': 'ON/OFF and CAL for simple operation.',
    'home.dismantle.lcd.title': 'LCD Display',
    'home.dismantle.lcd.desc': 'Bright and easy to read.',
    'home.dismantle.battery.title': 'Battery Case',
    'home.dismantle.battery.desc': 'Easy replaceable battery compartment.',

    'home.science.c1.title': 'Track pH Anytime.',
    'home.science.c1.text': 'Monitor pond water pH in seconds with the Tel-Aqua meter. Get accurate readings anytime, anywhere for a healthier pond and better yield.',
    'home.science.c2.title': 'Lab Precision. Pond Speed.',
    'home.science.c2.text': 'Waterproof, pocket-ready, and built for wet hands. Dip once and trust the number - no lab wait, no guesswork.',
    'home.science.c3.title': 'Calibrate With Confidence.',
    'home.science.c3.text': 'Simple field calibration keeps every reading dependable - so anyone on the farm can test and act with certainty.',
    'home.science.c4.title': 'Proven on Real Ponds.',
    'home.science.c4.text': 'Designed for aquaculture mornings - from beaker checks to open-water ponds - so science stays practical where it matters.',

    'home.faq.label': 'FAQ',
    'home.faq.lede': 'Clear answers to help you use with confidence.',
    'home.faq.viewAll': 'View All',
    'home.faq.q1': 'What can this meter measure?',
    'home.faq.a1': 'The Tel-Aqua measures pH (0-14) and water temperature in a single dip - no app or lab visit required.',
    'home.faq.q2': 'How accurate is the Tel-Aqua pH Meter?',
    'home.faq.a2': 'It reads within ±0.02 pH when calibrated correctly. Re-calibrate periodically with the included buffers for trusted results.',
    'home.faq.q3': 'How do I calibrate the meter?',
    'home.faq.a3': 'Use the buffer sachets in the box on day one. It takes a few minutes and keeps every reading trustworthy.',
    'home.faq.q4': 'Is it suitable for both freshwater and saltwater?',
    'home.faq.a4': 'Yes. It is built for shrimp and fish pond water - suitable for both freshwater and brackish aquaculture conditions.',
    'home.faq.q5': 'How do I maintain the probe?',
    'home.faq.a5': 'Rinse the probe with clean water after each use, keep the protection cap on when stored, and avoid letting the electrode dry out.',
    'home.faq.q6': 'What is included in the box?',
    'home.faq.a6': 'Tel-Aqua pH Meter meter, calibration buffer sachets, protection cap, and full documentation with every unit.',

    'cal.video.shrimp.meta': 'SHRIMP · 4:12',
    'cal.video.fish.meta': 'FISH · 3:48',
    'cal.video.langs': '4 LANGUAGES',
    'cal.video.shrimp.title': 'Shrimp Pond Calibration',
    'cal.video.shrimp.desc': 'Brackish water, 3-point buffers, and what to do when the reading will not settle.',
    'cal.video.fish.title': 'Fish Pond Calibration',
    'cal.video.fish.desc': 'Freshwater routine before the morning round — buffers, rinse cups, and storage.',
    'cal.video.notes': 'Quick Notes',
    'cal.video.shrimp.n1': 'Use fresh buffer solution',
    'cal.video.shrimp.n2': 'Rinse probe before every step',
    'cal.video.shrimp.n3': 'Never wipe aggressively',
    'cal.video.shrimp.n4': 'Store properly after calibration',
    'cal.video.fish.n1': 'Calibrate before checking ponds',
    'cal.video.fish.n2': 'Avoid dirty containers',
    'cal.video.fish.n3': 'Keep probe clean',
    'cal.video.fish.n4': 'Use distilled water',

    'cal.step1': 'Prepare Buffer Solutions',
    'cal.step2': 'Turn ON Meter',
    'cal.step3': 'Immerse Probe',
    'cal.step4': 'Press CAL',
    'cal.step5': 'Wait Until Stable',
    'cal.step6': 'Repeat with Other Buffers',
    'cal.step7': 'Rinse & Store',

    'cal.tip1': 'Calibrate every 2–4 weeks',
    'cal.tip2': 'Calibrate before every crop',
    'cal.tip3': 'Never use expired buffers',
    'cal.tip4': 'Always rinse the probe',
    'cal.tip5': 'Store with protection cap',
    'cal.tip6': 'Avoid direct sunlight',
    'cal.tip7': 'Replace the pH electrode every 6 months',

    'about.intro.lede': 'For two years, we taught farmers about their water — and never sold them anything.',
    'about.intro.p2': 'Along the way, one question kept coming back, in every pond and every district: how do I actually measure my water? Farmers weren\'t short on effort or knowledge. They were short on a simple, trustworthy way to see what was happening beneath the surface.',
    'about.intro.p3': 'So we built the tool we wished every farmer already had — simple to use, accurate enough to trust, and priced so it was never a hard decision.',
    'about.intro.anchor': '"Lab in Your Pocket."',
    'about.mission.body': 'Put a simple, accurate way to measure pond water into the hands of every shrimp and fish farmer — so no one has to guess with their crop again.',
    'about.vision.body': 'A future where understanding your water is as ordinary as feeding your pond — no lab trip, no jargon, no barrier between a farmer and the truth about their crop.'
  },

  hi: {
    'home.nameplate.brand': 'टेल-एक्वा',
    'home.nameplate.phTemp': 'पीएच+टेम्प',
    'home.nameplate.line1': 'डिजिटल पीएच और',
    'home.nameplate.line2': 'तापमान मीटर',
    'home.pricing.allin': 'सब शामिल',

    'home.feature.phRange.title': 'पीएच रेंज',
    'home.feature.phRange.pill': 'पीएच रेंज 0–14',
    'home.feature.phRange.desc': '0–14',
    'home.feature.phRange.detail': 'पूरी 0–14 पीएच स्केल मापता है ताकि हर तालाब और टैंक रीडिंग पर भरोसा रहे।',
    'home.feature.accuracy.title': 'सटीकता',
    'home.feature.accuracy.pill': '±0.01 सटीकता',
    'home.feature.accuracy.desc': '±0.01',
    'home.feature.accuracy.detail': 'लैब-ग्रेड ±0.01 सटीकता छोटे बदलावों को महँगे नुकसान बनने से पहले पकड़ने में मदद करती है।',
    'home.feature.atc.title': 'स्वचालित तापमान क्षतिपूर्ति',
    'home.feature.atc.pill': 'ऑटो टेम्प कॉम्प',
    'home.feature.atc.desc': 'बदलते पानी की स्थितियों में विश्वसनीय रीडिंग',
    'home.feature.atc.detail': 'दिन भर पानी की स्थितियाँ बदलने पर भी स्वचालित तापमान क्षतिपूर्ति रीडिंग विश्वसनीय रखती है।',
    'home.feature.waterproof.title': 'वाटरप्रूफ डिज़ाइन',
    'home.feature.waterproof.pill': 'वाटरप्रूफ डिज़ाइन',
    'home.feature.waterproof.desc': 'पानी में सुरक्षित और विश्वसनीय उपयोग के लिए',
    'home.feature.waterproof.detail': 'गीले खेत के काम के लिए बना — तालाब और टैंक के आसपास सुरक्षित, विश्वसनीय उपयोग।',
    'home.feature.glass.title': 'ग्लास इलेक्ट्रोड प्रोब',
    'home.feature.glass.pill': 'ग्लास इलेक्ट्रोड',
    'home.feature.glass.desc': 'उच्च गुणवत्ता वाला ग्लास इलेक्ट्रोड',
    'home.feature.glass.detail': 'उच्च गुणवत्ता वाला ग्लास इलेक्ट्रोड प्रोब हर बार संवेदनशील, सुसंगत माप देता है।',
    'home.feature.easy.title': 'उपयोग में आसान संचालन',
    'home.feature.easy.pill': 'आसान संचालन',
    'home.feature.easy.desc': 'आसान संचालन के लिए ON/OFF और CAL बटन',
    'home.feature.easy.detail': 'सरल ON/OFF और CAL नियंत्रण रोज़ की टेस्टिंग को तेज़ बनाते हैं — कोई जटिल सेटअप नहीं।',
    'home.feature.durable.title': 'टिकाऊ और जंग-रोधी',
    'home.feature.durable.pill': 'टिकाऊ और जंग-रोधी',
    'home.feature.durable.desc': 'जंग और संक्षारण प्रतिरोधी वाटरप्रूफ बॉडी',
    'home.feature.durable.detail': 'टिकाऊ, जंग-रोधी बॉडी जंग, नमी और कठिन फ़ार्म उपयोग को सीज़न दर सीज़न झेलती है।',

    'home.water.c1.title': 'पहले दिन से झींगा की रक्षा करें',
    'home.water.c1.text': 'शुरुआत से ही झींगा की सुरक्षा सुनिश्चित करें।',
    'home.water.c2.title': 'लैब की ज़रूरत नहीं',
    'home.water.c2.text': 'कोई महँगा उपकरण नहीं। कोई लैब टेस्टिंग नहीं। कभी भी, कहीं भी टेस्ट करें।',
    'home.water.c3.title': 'झींगा बचाएँ। पैसे बचाएँ।',
    'home.water.c3.text': 'नुकसान रोकें। लागत घटाएँ।',
    'home.water.c4.title': 'कम लागत, उच्च सुरक्षा',
    'home.water.c4.text': 'छोटा निवेश। बड़ी सुरक्षा।',

    'home.dismantle.cap.title': 'प्रोटेक्शन कैप',
    'home.dismantle.cap.desc': 'प्रोब की रक्षा करता है और सुरक्षा सुनिश्चित करता है।',
    'home.dismantle.probe.title': 'एजाइल ग्लास प्रोब',
    'home.dismantle.probe.desc': 'उच्च संवेदनशीलता वाला ग्लास इलेक्ट्रोड।',
    'home.dismantle.buttons.title': 'कंट्रोल बटन',
    'home.dismantle.buttons.desc': 'सरल संचालन के लिए ON/OFF और CAL।',
    'home.dismantle.lcd.title': 'एलसीडी डिस्प्ले',
    'home.dismantle.lcd.desc': 'चमकीला और पढ़ने में आसान।',
    'home.dismantle.battery.title': 'बैटरी केस',
    'home.dismantle.battery.desc': 'आसान बदलने योग्य बैटरी कम्पार्टमेंट।',

    'home.science.c1.title': 'कभी भी पीएच ट्रैक करें।',
    'home.science.c1.text': 'टेल-एक्वा मीटर से सेकंडों में तालाब के पानी का पीएच मॉनिटर करें। स्वस्थ तालाब और बेहतर उपज के लिए सटीक रीडिंग कभी भी, कहीं भी।',
    'home.science.c2.title': 'लैब सटीकता। तालाब की गति।',
    'home.science.c2.text': 'वाटरप्रूफ, जेब-तैयार, और गीले हाथों के लिए बना। एक बार डुबोएँ और नंबर पर भरोसा करें — कोई लैब इंतज़ार नहीं, कोई अनुमान नहीं।',
    'home.science.c3.title': 'भरोसे के साथ कैलिब्रेट करें।',
    'home.science.c3.text': 'सरल फ़ील्ड कैलिब्रेशन हर रीडिंग को विश्वसनीय रखती है — ताकि फ़ार्म पर कोई भी आत्मविश्वास से टेस्ट और कार्रवाई कर सके।',
    'home.science.c4.title': 'वास्तविक तालाबों पर सिद्ध।',
    'home.science.c4.text': 'एक्वाकल्चर की सुबहों के लिए डिज़ाइन — बीकर जाँच से खुले पानी के तालाब तक — ताकि विज्ञान वहीं व्यावहारिक रहे जहाँ ज़रूरत है।',

    'home.faq.label': 'FAQ',
    'home.faq.lede': 'आत्मविश्वास से उपयोग के लिए स्पष्ट जवाब।',
    'home.faq.viewAll': 'सभी देखें',
    'home.faq.q1': 'यह मीटर क्या माप सकता है?',
    'home.faq.a1': 'Tel-Aqua एक ही डुबकी में पीएच (0-14) और पानी का तापमान मापता है — कोई ऐप या लैब विज़िट नहीं।',
    'home.faq.q2': 'टेल-एक्वा Tel-Aqua कितना सटीक है?',
    'home.faq.a2': 'सही कैलिब्रेशन पर यह ±0.02 पीएच के भीतर पढ़ता है। भरोसेमंद परिणामों के लिए शामिल बफ़र से समय-समय पर फिर कैलिब्रेट करें।',
    'home.faq.q3': 'मीटर कैसे कैलिब्रेट करें?',
    'home.faq.a3': 'पहले दिन बॉक्स में दिए बफ़र सैशे का उपयोग करें। कुछ मिनट लगते हैं और हर रीडिंग भरोसेमंद रहती है।',
    'home.faq.q4': 'क्या यह मीठे और खारे पानी दोनों के लिए उपयुक्त है?',
    'home.faq.a4': 'हाँ। यह झींगा और मछली तालाब के पानी के लिए बना है — मीठे और खारे दोनों एक्वाकल्चर स्थितियों के लिए उपयुक्त।',
    'home.faq.q5': 'प्रोब का रखरखाव कैसे करें?',
    'home.faq.a5': 'हर उपयोग के बाद साफ पानी से प्रोब धोएँ, स्टोर करते समय प्रोटेक्शन कैप लगाएँ, और इलेक्ट्रोड को सूखने न दें।',
    'home.faq.q6': 'बॉक्स में क्या शामिल है?',
    'home.faq.a6': 'टेल-एक्वा Tel-Aqua मीटर, कैलिब्रेशन बफ़र सैशे, प्रोटेक्शन कैप, और हर यूनिट के साथ पूर्ण दस्तावेज़।',

    'cal.video.shrimp.meta': 'झींगा · 4:12',
    'cal.video.fish.meta': 'मछली · 3:48',
    'cal.video.langs': '4 भाषाएँ',
    'cal.video.shrimp.title': 'झींगा तालाब कैलिब्रेशन',
    'cal.video.shrimp.desc': 'खारा पानी, 3-पॉइंट बफ़र, और जब रीडिंग स्थिर न हो तो क्या करें।',
    'cal.video.fish.title': 'मछली तालाब कैलिब्रेशन',
    'cal.video.fish.desc': 'सुबह के राउंड से पहले मीठे पानी की दिनचर्या — बफ़र, रिंस कप और स्टोरेज।',
    'cal.video.notes': 'त्वरित नोट्स',
    'cal.video.shrimp.n1': 'ताज़ा बफ़र घोल इस्तेमाल करें',
    'cal.video.shrimp.n2': 'हर चरण से पहले प्रोब धोएँ',
    'cal.video.shrimp.n3': 'ज़ोर से न पोंछें',
    'cal.video.shrimp.n4': 'कैलिब्रेशन के बाद सही तरीके से स्टोर करें',
    'cal.video.fish.n1': 'तालाब जाँच से पहले कैलिब्रेट करें',
    'cal.video.fish.n2': 'गंदे कंटेनर से बचें',
    'cal.video.fish.n3': 'प्रोब साफ रखें',
    'cal.video.fish.n4': 'डिस्टिल्ड पानी इस्तेमाल करें',

    'cal.step1': 'बफ़र घोल तैयार करें',
    'cal.step2': 'मीटर चालू करें',
    'cal.step3': 'प्रोब डुबोएँ',
    'cal.step4': 'CAL दबाएँ',
    'cal.step5': 'स्थिर होने तक प्रतीक्षा करें',
    'cal.step6': 'अन्य बफ़र से दोहराएँ',
    'cal.step7': 'धोएँ और स्टोर करें',

    'cal.tip1': 'हर 2–4 सप्ताह में कैलिब्रेट करें',
    'cal.tip2': 'हर फसल से पहले कैलिब्रेट करें',
    'cal.tip3': 'एक्सपायर्ड बफ़र कभी न इस्तेमाल करें',
    'cal.tip4': 'हमेशा प्रोब धोएँ',
    'cal.tip5': 'प्रोटेक्शन कैप के साथ स्टोर करें',
    'cal.tip6': 'सीधी धूप से बचें',
    'cal.tip7': 'हर 6 महीने में पीएच इलेक्ट्रोड बदलें',

    'about.intro.lede': 'दो साल तक हमने किसानों को उनके पानी के बारे में सिखाया — और कभी कुछ नहीं बेचा।',
    'about.intro.p2': 'रास्ते में एक सवाल हर तालाब और हर ज़िले में लौटता रहा: मैं वास्तव में अपने पानी को कैसे मापूँ? किसानों में मेहनत या ज्ञान की कमी नहीं थी। कमी थी सतह के नीचे क्या हो रहा है, यह देखने का एक सरल, भरोसेमंद तरीका।',
    'about.intro.p3': 'इसलिए हमने वह उपकरण बनाया जो हम चाहते थे हर किसान के पास पहले से हो — उपयोग में सरल, भरोसे लायक सटीक, और इतनी कीमत पर कि निर्णय कभी कठिन न हो।',
    'about.intro.anchor': '"आपकी जेब में लैब।"',
    'about.mission.body': 'हर झींगा और मछली किसान के हाथ में तालाब का पानी मापने का एक सरल, सटीक तरीका दें — ताकि किसी को फिर अपनी फसल के साथ अनुमान न लगाना पड़े।',
    'about.vision.body': 'एक भविष्य जहाँ अपने पानी को समझना तालाब को खिलाने जितना सामान्य हो — कोई लैब यात्रा नहीं, कोई जटिल शब्दावली नहीं, किसान और उनकी फसल की सच्चाई के बीच कोई बाधा नहीं।'
  },

  te: {
    'home.nameplate.brand': 'టెల్-అక్వా',
    'home.nameplate.phTemp': 'పిహెచ్+టెంప్',
    'home.nameplate.line1': 'డిజిటల్ పిహెచ్ మరియు',
    'home.nameplate.line2': 'ఉష్ణోగ్రత మీటర్',
    'home.pricing.allin': 'అన్నీ చేర్చబడ్డాయి',

    'home.feature.phRange.title': 'పిహెచ్ రేంజ్',
    'home.feature.phRange.pill': 'పిహెచ్ రేంజ్ 0–14',
    'home.feature.phRange.desc': '0–14',
    'home.feature.phRange.detail': 'పూర్తి 0–14 పిహెచ్ స్కేల్ కొలుస్తుంది కాబట్టి ప్రతి చెరువు మరియు ట్యాంక్ రీడింగ్‌పై నమ్మకం ఉంటుంది.',
    'home.feature.accuracy.title': 'ఖచ్చితత్వం',
    'home.feature.accuracy.pill': '±0.01 ఖచ్చితత్వం',
    'home.feature.accuracy.desc': '±0.01',
    'home.feature.accuracy.detail': 'ల్యాబ్-గ్రేడ్ ±0.01 ఖచ్చితత్వం చిన్న మార్పులను ఖరీదైన నష్టాలుగా మారకముందే గుర్తించడంలో సహాయపడుతుంది.',
    'home.feature.atc.title': 'ఆటోమేటిక్ ఉష్ణోగ్రత పరిహారం',
    'home.feature.atc.pill': 'ఆటో టెంప్ కాంప్',
    'home.feature.atc.desc': 'మారుతున్న నీటి పరిస్థితుల్లో నమ్మదగిన రీడింగులు',
    'home.feature.atc.detail': 'రోజంతా నీటి పరిస్థితులు మారినా ఆటోమేటిక్ ఉష్ణోగ్రత పరిహారం రీడింగులను నమ్మదగినవిగా ఉంచుతుంది.',
    'home.feature.waterproof.title': 'వాటర్‌ప్రూఫ్ డిజైన్',
    'home.feature.waterproof.pill': 'వాటర్‌ప్రూఫ్ డిజైన్',
    'home.feature.waterproof.desc': 'నీటిలో సురక్షితమైన మరియు నమ్మదగిన వినియోగం కోసం',
    'home.feature.waterproof.detail': 'తడి ఫీల్డ్ పని కోసం నిర్మించబడింది — చెరువులు మరియు ట్యాంకుల చుట్టూ సురక్షిత, నమ్మదగిన వినియోగం.',
    'home.feature.glass.title': 'గ్లాస్ ఎలక్ట్రోడ్ ప్రోబ్',
    'home.feature.glass.pill': 'గ్లాస్ ఎలక్ట్రోడ్',
    'home.feature.glass.desc': 'అధిక నాణ్యత గ్లాస్ ఎలక్ట్రోడ్',
    'home.feature.glass.detail': 'అధిక నాణ్యత గ్లాస్ ఎలక్ట్రోడ్ ప్రోబ్ ప్రతిసారీ సున్నితమైన, స్థిరమైన కొలతలను అందిస్తుంది.',
    'home.feature.easy.title': 'వినియోగదారు స్నేహపూర్వక ఆపరేషన్',
    'home.feature.easy.pill': 'సులభ ఆపరేషన్',
    'home.feature.easy.desc': 'సులభ ఆపరేషన్ కోసం ON/OFF మరియు CAL బటన్లు',
    'home.feature.easy.detail': 'సరళమైన ON/OFF మరియు CAL నియంత్రణలు రోజువారీ టెస్టింగ్‌ను వేగవంతం చేస్తాయి — సంక్లిష్ట సెటప్ అవసరం లేదు.',
    'home.feature.durable.title': 'మన్నికైన & తుప్పు-నిరోధక',
    'home.feature.durable.pill': 'మన్నికైన & తుప్పు-నిరోధక',
    'home.feature.durable.desc': 'తుప్పు మరియు క్షయానికి నిరోధక వాటర్‌ప్రూఫ్ బాడీ',
    'home.feature.durable.detail': 'మన్నికైన, తుప్పు-నిరోధక బాడీ తుప్పు, తేమ మరియు కఠినమైన ఫార్మ్ వినియోగాన్ని సీజన్ తర్వాత సీజన్ తట్టుకుంటుంది.',

    'home.water.c1.title': 'మొదటి రోజు నుండి రొయ్యలను రక్షించండి',
    'home.water.c1.text': 'ప్రారంభం నుండే రొయ్యల భద్రతను నిర్ధారించండి.',
    'home.water.c2.title': 'ల్యాబ్ అవసరం లేదు',
    'home.water.c2.text': 'ఖరీదైన పరికరాలు లేవు. ల్యాబ్ టెస్టింగ్ లేదు. ఎప్పుడైనా, ఎక్కడైనా టెస్ట్ చేయండి.',
    'home.water.c3.title': 'రొయ్యలను ఆదా చేయండి. డబ్బు ఆదా చేయండి.',
    'home.water.c3.text': 'నష్టాలను నివారించండి. ఖర్చులను తగ్గించండి.',
    'home.water.c4.title': 'తక్కువ ఖర్చు, అధిక భద్రత',
    'home.water.c4.text': 'చిన్న పెట్టుబడి. పెద్ద రక్షణ.',

    'home.dismantle.cap.title': 'ప్రొటెక్షన్ క్యాప్',
    'home.dismantle.cap.desc': 'ప్రోబ్‌ను రక్షిస్తుంది మరియు భద్రతను నిర్ధారిస్తుంది.',
    'home.dismantle.probe.title': 'అజైల్ గ్లాస్ ప్రోబ్',
    'home.dismantle.probe.desc': 'అధిక సున్నితత్వం గల గ్లాస్ ఎలక్ట్రోడ్.',
    'home.dismantle.buttons.title': 'కంట్రోల్ బటన్లు',
    'home.dismantle.buttons.desc': 'సరళ ఆపరేషన్ కోసం ON/OFF మరియు CAL.',
    'home.dismantle.lcd.title': 'LCD డిస్‌ప్లే',
    'home.dismantle.lcd.desc': 'ప్రకాశవంతం మరియు చదవడం సులభం.',
    'home.dismantle.battery.title': 'బ్యాటరీ కేస్',
    'home.dismantle.battery.desc': 'సులభంగా మార్చగల బ్యాటరీ కంపార్ట్‌మెంట్.',

    'home.science.c1.title': 'ఎప్పుడైనా పిహెచ్ ట్రాక్ చేయండి.',
    'home.science.c1.text': 'టెల్-అక్వా మీటర్‌తో సెకన్లలో చెరువు నీటి పిహెచ్‌ను పర్యవేక్షించండి. ఆరోగ్యకరమైన చెరువు మరియు మెరుగైన దిగుబడి కోసం ఖచ్చితమైన రీడింగులు ఎప్పుడైనా, ఎక్కడైనా.',
    'home.science.c2.title': 'ల్యాబ్ ఖచ్చితత్వం. చెరువు వేగం.',
    'home.science.c2.text': 'వాటర్‌ప్రూఫ్, జేబు-సిద్ధం, తడి చేతుల కోసం నిర్మించబడింది. ఒక్కసారి ముంచి సంఖ్యను నమ్మండి — ల్యాబ్ వేచిచూడలేదు, అంచనా లేదు.',
    'home.science.c3.title': 'నమ్మకంతో క్యాలిబ్రేట్ చేయండి.',
    'home.science.c3.text': 'సరళమైన ఫీల్డ్ క్యాలిబ్రేషన్ ప్రతి రీడింగ్‌ను నమ్మదగినదిగా ఉంచుతుంది — కాబట్టి ఫార్మ్‌లో ఎవరైనా నమ్మకంతో టెస్ట్ చేసి చర్య తీసుకోవచ్చు.',
    'home.science.c4.title': 'నిజమైన చెరువులపై నిరూపితం.',
    'home.science.c4.text': 'ఆక్వాకల్చర్ ఉదయాల కోసం రూపొందించబడింది — బీకర్ తనిఖీల నుండి బహిరంగ నీటి చెరువుల వరకు — కాబట్టి సైన్స్ అవసరమైన చోట ప్రాక్టికల్‌గా ఉంటుంది.',

    'home.faq.label': 'FAQ',
    'home.faq.lede': 'నమ్మకంతో ఉపయోగించడానికి స్పష్టమైన సమాధానాలు.',
    'home.faq.viewAll': 'అన్నీ చూడండి',
    'home.faq.q1': 'ఈ మీటర్ ఏమి కొలవగలదు?',
    'home.faq.a1': 'Tel-Aqua ఒకే ముంచుతో పిహెచ్ (0-14) మరియు నీటి ఉష్ణోగ్రతను కొలుస్తుంది — యాప్ లేదా ల్యాబ్ సందర్శన అవసరం లేదు.',
    'home.faq.q2': 'టెల్-అక్వా Tel-Aqua ఎంత ఖచ్చితమైనది?',
    'home.faq.a2': 'సరిగ్గా క్యాలిబ్రేట్ చేసినప్పుడు ±0.02 పిహెచ్ లోపల చదువుతుంది. నమ్మదగిన ఫలితాల కోసం చేర్చిన బఫర్లతో కాలానుగుణంగా మళ్లీ క్యాలిబ్రేట్ చేయండి.',
    'home.faq.q3': 'మీటర్‌ను ఎలా క్యాలిబ్రేట్ చేయాలి?',
    'home.faq.a3': 'మొదటి రోజు బాక్స్‌లోని బఫర్ సచెట్లను ఉపయోగించండి. కొన్ని నిమిషాలు పడుతుంది మరియు ప్రతి రీడింగ్‌ను నమ్మదగినదిగా ఉంచుతుంది.',
    'home.faq.q4': 'ఇది మంచినీరు మరియు ఉప్పునీరు రెండింటికీ అనుకూలమా?',
    'home.faq.a4': 'అవును. ఇది రొయ్యలు మరియు చేప చెరువు నీటి కోసం నిర్మించబడింది — మంచినీరు మరియు ఉప్పునీటి ఆక్వాకల్చర్ పరిస్థితులకు అనుకూలం.',
    'home.faq.q5': 'ప్రోబ్‌ను ఎలా నిర్వహించాలి?',
    'home.faq.a5': 'ప్రతి వినియోగం తర్వాత శుభ్రమైన నీటితో ప్రోబ్‌ను కడగండి, నిల్వ చేసేటప్పుడు ప్రొటెక్షన్ క్యాప్ ఉంచండి, మరియు ఎలక్ట్రోడ్ ఎండిపోకుండా చూసుకోండి.',
    'home.faq.q6': 'బాక్స్‌లో ఏమి ఉంది?',
    'home.faq.a6': 'టెల్-అక్వా Tel-Aqua మీటర్, క్యాలిబ్రేషన్ బఫర్ సచెట్లు, ప్రొటెక్షన్ క్యాప్, మరియు ప్రతి యూనిట్‌తో పూర్తి డాక్యుమెంటేషన్.',

    'cal.video.shrimp.meta': 'రొయ్య · 4:12',
    'cal.video.fish.meta': 'చేప · 3:48',
    'cal.video.langs': '4 భాషలు',
    'cal.video.shrimp.title': 'రొయ్య చెరువు క్యాలిబ్రేషన్',
    'cal.video.shrimp.desc': 'ఉప్పునీరు, 3-పాయింట్ బఫర్లు, మరియు రీడింగ్ స్థిరపడనప్పుడు ఏమి చేయాలి.',
    'cal.video.fish.title': 'చేప చెరువు క్యాలిబ్రేషన్',
    'cal.video.fish.desc': 'ఉదయం రౌండ్ ముందు మంచినీటి రొటీన్ — బఫర్లు, రిన్స్ కప్పులు మరియు నిల్వ.',
    'cal.video.notes': 'త్వరిత నోట్స్',
    'cal.video.shrimp.n1': 'తాజా బఫర్ ద్రావణం ఉపయోగించండి',
    'cal.video.shrimp.n2': 'ప్రతి దశకు ముందు ప్రోబ్ కడగండి',
    'cal.video.shrimp.n3': 'గట్టిగా తుడవకండి',
    'cal.video.shrimp.n4': 'క్యాలిబ్రేషన్ తర్వాత సరిగ్గా నిల్వ చేయండి',
    'cal.video.fish.n1': 'చెరువులు తనిఖీ చేయడానికి ముందు క్యాలిబ్రేట్ చేయండి',
    'cal.video.fish.n2': 'మురికి కంటైనర్లను నివారించండి',
    'cal.video.fish.n3': 'ప్రోబ్ శుభ్రంగా ఉంచండి',
    'cal.video.fish.n4': 'డిస్టిల్డ్ వాటర్ ఉపయోగించండి',

    'cal.step1': 'బఫర్ ద్రావణాలు సిద్ధం చేయండి',
    'cal.step2': 'మీటర్ ఆన్ చేయండి',
    'cal.step3': 'ప్రోబ్ ముంచండి',
    'cal.step4': 'CAL నొక్కండి',
    'cal.step5': 'స్థిరం అయ్యే వరకు వేచి ఉండండి',
    'cal.step6': 'ఇతర బఫర్లతో పునరావృతం చేయండి',
    'cal.step7': 'కడగి నిల్వ చేయండి',

    'cal.tip1': 'ప్రతి 2–4 వారాలకు క్యాలిబ్రేట్ చేయండి',
    'cal.tip2': 'ప్రతి పంటకు ముందు క్యాలిబ్రేట్ చేయండి',
    'cal.tip3': 'గడువు ముగిసిన బఫర్లను ఎప్పుడూ ఉపయోగించవద్దు',
    'cal.tip4': 'ఎల్లప్పుడూ ప్రోబ్ కడగండి',
    'cal.tip5': 'ప్రొటెక్షన్ క్యాప్‌తో నిల్వ చేయండి',
    'cal.tip6': 'నేరుగా సూర్యకాంతిని నివారించండి',
    'cal.tip7': 'ప్రతి 6 నెలలకు పిహెచ్ ఎలక్ట్రోడ్‌ను మార్చండి',

    'about.intro.lede': 'రెండు సంవత్సరాలు మేము రైతులకు వారి నీటి గురించి నేర్పించాము — మరియు ఎప్పుడూ ఏమీ అమ్మలేదు.',
    'about.intro.p2': 'దారిలో ఒక ప్రశ్న ప్రతి చెరువు మరియు ప్రతి జిల్లాలో తిరిగి వచ్చింది: నేను నిజంగా నా నీటిని ఎలా కొలవాలి? రైతులకు కృషి లేదా జ్ఞానం కొరవడలేదు. ఉపరితలం కింద ఏమి జరుగుతుందో చూడటానికి సరళమైన, నమ్మదగిన మార్గం కొరవడింది.',
    'about.intro.p3': 'కాబట్టి ప్రతి రైతు వద్ద ఇప్పటికే ఉండాలని మేము కోరుకున్న సాధనాన్ని నిర్మించాము — ఉపయోగించడానికి సులభం, నమ్మదగినంత ఖచ్చితం, మరియు నిర్ణయం కష్టం కాకుండా ధర.',
    'about.intro.anchor': '"మీ జేబులో ల్యాబ్."',
    'about.mission.body': 'ప్రతి రొయ్యలు మరియు చేప రైతు చేతుల్లో చెరువు నీటిని కొలిచే సరళమైన, ఖచ్చితమైన మార్గాన్ని ఉంచండి — ఇక ఎవరూ తమ పంటతో అంచనా వేయకుండా.',
    'about.vision.body': 'మీ నీటిని అర్థం చేసుకోవడం చెరువుకు ఆహారం పెట్టడంతే సాధారణమైన భవిష్యత్తు — ల్యాబ్ ప్రయాణం లేదు, జార్గన్ లేదు, రైతు మరియు వారి పంట నిజం మధ్య అడ్డంకి లేదు.'
  },

  bn: {
    'home.nameplate.brand': 'টেল-অ্যাকোয়া',
    'home.nameplate.phTemp': 'পিএইচ+টেম্প',
    'home.nameplate.line1': 'ডিজিটাল পিএইচ এবং',
    'home.nameplate.line2': 'তাপমাত্রা মিটার',
    'home.pricing.allin': 'সব অন্তর্ভুক্ত',

    'home.feature.phRange.title': 'পিএইচ রেঞ্জ',
    'home.feature.phRange.pill': 'পিএইচ রেঞ্জ ০–১৪',
    'home.feature.phRange.desc': '০–১৪',
    'home.feature.phRange.detail': 'পূর্ণ ০–১৪ পিএইচ স্কেল পরিমাপ করে যাতে প্রতিটি পুকুর ও ট্যাঙ্ক রিডিংয়ে বিশ্বাস রাখা যায়।',
    'home.feature.accuracy.title': 'সঠিকতা',
    'home.feature.accuracy.pill': '±০.০১ সঠিকতা',
    'home.feature.accuracy.desc': '±০.০১',
    'home.feature.accuracy.detail': 'ল্যাব-গ্রেড ±০.০১ সঠিকতা ছোট পরিবর্তনগুলো ব্যয়বহুল ক্ষতিতে পরিণত হওয়ার আগে ধরতে সাহায্য করে।',
    'home.feature.atc.title': 'স্বয়ংক্রিয় তাপমাত্রা ক্ষতিপূরণ',
    'home.feature.atc.pill': 'অটো টেম্প কম্প',
    'home.feature.atc.desc': 'পরিবর্তনশীল পানির অবস্থায় নির্ভরযোগ্য রিডিং',
    'home.feature.atc.detail': 'দিনভর পানির অবস্থা বদলালেও স্বয়ংক্রিয় তাপমাত্রা ক্ষতিপূরণ রিডিং নির্ভরযোগ্য রাখে।',
    'home.feature.waterproof.title': 'ওয়াটারপ্রুফ ডিজাইন',
    'home.feature.waterproof.pill': 'ওয়াটারপ্রুফ ডিজাইন',
    'home.feature.waterproof.desc': 'পানিতে নিরাপদ ও নির্ভরযোগ্য ব্যবহারের জন্য',
    'home.feature.waterproof.detail': 'ভেজা মাঠের কাজের জন্য তৈরি — পুকুর ও ট্যাঙ্কের আশেপাশে নিরাপদ, নির্ভরযোগ্য ব্যবহার।',
    'home.feature.glass.title': 'গ্লাস ইলেকট্রোড প্রোব',
    'home.feature.glass.pill': 'গ্লাস ইলেকট্রোড',
    'home.feature.glass.desc': 'উচ্চ মানের গ্লাস ইলেকট্রোড',
    'home.feature.glass.detail': 'উচ্চ মানের গ্লাস ইলেকট্রোড প্রোব প্রতিবার সংবেদনশীল, ধারাবাহিক পরিমাপ দেয়।',
    'home.feature.easy.title': 'ব্যবহারকারী-বান্ধব অপারেশন',
    'home.feature.easy.pill': 'সহজ অপারেশন',
    'home.feature.easy.desc': 'সহজ অপারেশনের জন্য ON/OFF এবং CAL বোতাম',
    'home.feature.easy.detail': 'সহজ ON/OFF এবং CAL নিয়ন্ত্রণ দৈনন্দিন টেস্টিং দ্রুত করে — জটিল সেটআপ লাগে না।',
    'home.feature.durable.title': 'টেকসই ও মরিচা-প্রতিরোধী',
    'home.feature.durable.pill': 'টেকসই ও মরিচা-প্রতিরোধী',
    'home.feature.durable.desc': 'মরিচা ও ক্ষয় প্রতিরোধী ওয়াটারপ্রুফ বডি',
    'home.feature.durable.detail': 'টেকসই, মরিচা-প্রতিরোধী বডি মরিচা, আর্দ্রতা এবং কঠিন ফার্ম ব্যবহার মৌসুম পর মৌসুম সহ্য করে।',

    'home.water.c1.title': 'প্রথম দিন থেকেই চিংড়ি রক্ষা করুন',
    'home.water.c1.text': 'শুরু থেকেই চিংড়ির নিরাপত্তা নিশ্চিত করুন।',
    'home.water.c2.title': 'ল্যাবের প্রয়োজন নেই',
    'home.water.c2.text': 'কোনো ব্যয়বহুল সরঞ্জাম নেই। কোনো ল্যাব টেস্টিং নেই। যেকোনো সময়, যেকোনো জায়গায় পরীক্ষা করুন।',
    'home.water.c3.title': 'চিংড়ি বাঁচান। টাকা বাঁচান।',
    'home.water.c3.text': 'ক্ষতি রোধ করুন। খরচ কমান।',
    'home.water.c4.title': 'কম খরচ, উচ্চ নিরাপত্তা',
    'home.water.c4.text': 'ছোট বিনিয়োগ। বড় সুরক্ষা।',

    'home.dismantle.cap.title': 'প্রটেকশন ক্যাপ',
    'home.dismantle.cap.desc': 'প্রোব রক্ষা করে এবং নিরাপত্তা নিশ্চিত করে।',
    'home.dismantle.probe.title': 'অ্যাজাইল গ্লাস প্রোব',
    'home.dismantle.probe.desc': 'উচ্চ সংবেদনশীলতার গ্লাস ইলেকট্রোড।',
    'home.dismantle.buttons.title': 'কন্ট্রোল বোতাম',
    'home.dismantle.buttons.desc': 'সহজ অপারেশনের জন্য ON/OFF এবং CAL।',
    'home.dismantle.lcd.title': 'LCD ডিসপ্লে',
    'home.dismantle.lcd.desc': 'উজ্জ্বল এবং পড়তে সহজ।',
    'home.dismantle.battery.title': 'ব্যাটারি কেস',
    'home.dismantle.battery.desc': 'সহজে পরিবর্তনযোগ্য ব্যাটারি কম্পার্টমেন্ট।',

    'home.science.c1.title': 'যেকোনো সময় পিএইচ ট্র্যাক করুন।',
    'home.science.c1.text': 'টেল-অ্যাকোয়া মিটার দিয়ে সেকেন্ডে পুকুরের পানির পিএইচ মনিটর করুন। স্বাস্থ্যকর পুকুর ও ভালো ফলনের জন্য সঠিক রিডিং যেকোনো সময়, যেকোনো জায়গায়।',
    'home.science.c2.title': 'ল্যাব নির্ভুলতা। পুকুরের গতি।',
    'home.science.c2.text': 'ওয়াটারপ্রুফ, পকেট-রেডি, এবং ভেজা হাতের জন্য তৈরি। একবার ডুবিয়ে সংখ্যায় বিশ্বাস করুন — ল্যাব অপেক্ষা নেই, অনুমান নেই।',
    'home.science.c3.title': 'আত্মবিশ্বাসের সাথে ক্যালিব্রেট করুন।',
    'home.science.c3.text': 'সহজ ফিল্ড ক্যালিব্রেশন প্রতিটি রিডিং নির্ভরযোগ্য রাখে — যাতে ফার্মে যে কেউ নিশ্চয়তার সাথে পরীক্ষা ও পদক্ষেপ নিতে পারে।',
    'home.science.c4.title': 'বাস্তব পুকুরে প্রমাণিত।',
    'home.science.c4.text': 'অ্যাকুয়াকালচার সকালের জন্য ডিজাইন — বিকার চেক থেকে খোলা পানির পুকুর পর্যন্ত — যাতে বিজ্ঞান প্রয়োজনের জায়গায় ব্যবহারিক থাকে।',

    'home.faq.label': 'FAQ',
    'home.faq.lede': 'আত্মবিশ্বাসের সাথে ব্যবহার করতে সাহায্য করার স্পষ্ট উত্তর।',
    'home.faq.viewAll': 'সব দেখুন',
    'home.faq.q1': 'এই মিটার কী পরিমাপ করতে পারে?',
    'home.faq.a1': 'Tel-Aqua এক ডুবে পিএইচ (০-১৪) এবং পানির তাপমাত্রা পরিমাপ করে — কোনো অ্যাপ বা ল্যাব ভিজিট লাগে না।',
    'home.faq.q2': 'টেল-অ্যাকোয়া Tel-Aqua কতটা সঠিক?',
    'home.faq.a2': 'সঠিকভাবে ক্যালিব্রেট করলে এটি ±০.০২ পিএইচ-এর মধ্যে পড়ে। বিশ্বস্ত ফলাফলের জন্য অন্তর্ভুক্ত বাফার দিয়ে নিয়মিত পুনঃক্যালিব্রেট করুন।',
    'home.faq.q3': 'মিটার কীভাবে ক্যালিব্রেট করব?',
    'home.faq.a3': 'প্রথম দিন বাক্সের বাফার স্যাচেট ব্যবহার করুন। কয়েক মিনিট লাগে এবং প্রতিটি রিডিং বিশ্বস্ত রাখে।',
    'home.faq.q4': 'এটি মিঠা ও নোনা জল উভয়ের জন্য উপযুক্ত?',
    'home.faq.a4': 'হ্যাঁ। এটি চিংড়ি ও মাছের পুকুরের পানির জন্য তৈরি — মিঠা ও নোনা উভয় অ্যাকুয়াকালচার অবস্থার জন্য উপযুক্ত।',
    'home.faq.q5': 'প্রোব কীভাবে রক্ষণাবেক্ষণ করব?',
    'home.faq.a5': 'প্রতিবার ব্যবহারের পর পরিষ্কার পানি দিয়ে প্রোব ধুয়ে নিন, সংরক্ষণের সময় প্রটেকশন ক্যাপ রাখুন, এবং ইলেকট্রোড শুকাতে দেবেন না।',
    'home.faq.q6': 'বাক্সে কী কী আছে?',
    'home.faq.a6': 'টেল-অ্যাকোয়া Tel-Aqua মিটার, ক্যালিব্রেশন বাফার স্যাচেট, প্রটেকশন ক্যাপ, এবং প্রতিটি ইউনিটের সাথে পূর্ণ ডকুমেন্টেশন।',

    'cal.video.shrimp.meta': 'চিংড়ি · ৪:১২',
    'cal.video.fish.meta': 'মাছ · ৩:৪৮',
    'cal.video.langs': '৪ ভাষা',
    'cal.video.shrimp.title': 'চিংড়ি পুকুর ক্যালিব্রেশন',
    'cal.video.shrimp.desc': 'নোনা জল, ৩-পয়েন্ট বাফার, এবং রিডিং স্থির না হলে কী করবেন।',
    'cal.video.fish.title': 'মাছ পুকুর ক্যালিব্রেশন',
    'cal.video.fish.desc': 'সকালের রাউন্ডের আগে মিঠা জলের রুটিন — বাফার, রিন্স কাপ এবং সংরক্ষণ।',
    'cal.video.notes': 'দ্রুত নোটস',
    'cal.video.shrimp.n1': 'তাজা বাফার সলিউশন ব্যবহার করুন',
    'cal.video.shrimp.n2': 'প্রতিটি ধাপের আগে প্রোব ধুয়ে নিন',
    'cal.video.shrimp.n3': 'জোরে মুছবেন না',
    'cal.video.shrimp.n4': 'ক্যালিব্রেশনের পর সঠিকভাবে সংরক্ষণ করুন',
    'cal.video.fish.n1': 'পুকুর চেকের আগে ক্যালিব্রেট করুন',
    'cal.video.fish.n2': 'নোংরা পাত্র এড়িয়ে চলুন',
    'cal.video.fish.n3': 'প্রোব পরিষ্কার রাখুন',
    'cal.video.fish.n4': 'ডিস্টিলড ওয়াটার ব্যবহার করুন',

    'cal.step1': 'বাফার সলিউশন প্রস্তুত করুন',
    'cal.step2': 'মিটার চালু করুন',
    'cal.step3': 'প্রোব ডুবান',
    'cal.step4': 'CAL চাপুন',
    'cal.step5': 'স্থির হওয়া পর্যন্ত অপেক্ষা করুন',
    'cal.step6': 'অন্য বাফার দিয়ে পুনরাবৃত্তি করুন',
    'cal.step7': 'ধুয়ে সংরক্ষণ করুন',

    'cal.tip1': 'প্রতি ২–৪ সপ্তাহে ক্যালিব্রেট করুন',
    'cal.tip2': 'প্রতিটি ফসলের আগে ক্যালিব্রেট করুন',
    'cal.tip3': 'মেয়াদোত্তীর্ণ বাফার কখনো ব্যবহার করবেন না',
    'cal.tip4': 'সবসময় প্রোব ধুয়ে নিন',
    'cal.tip5': 'প্রটেকশন ক্যাপ সহ সংরক্ষণ করুন',
    'cal.tip6': 'সরাসরি সূর্যালোক এড়িয়ে চলুন',
    'cal.tip7': 'প্রতি ৬ মাসে পিএইচ ইলেকট্রোড পরিবর্তন করুন',

    'about.intro.lede': 'দুই বছর আমরা কৃষকদের তাদের পানি সম্পর্কে শিখিয়েছি — এবং কখনো কিছু বিক্রি করিনি।',
    'about.intro.p2': 'পথে একটি প্রশ্ন প্রতিটি পুকুর ও প্রতিটি জেলায় ফিরে এসেছে: আমি আসলে আমার পানি কীভাবে পরিমাপ করব? কৃষকদের পরিশ্রম বা জ্ঞানের অভাব ছিল না। অভাব ছিল পৃষ্ঠের নিচে কী ঘটছে তা দেখার একটি সহজ, বিশ্বস্ত উপায়।',
    'about.intro.p3': 'তাই আমরা সেই টুল তৈরি করেছি যা আমরা চেয়েছিলাম প্রতিটি কৃষকের কাছে আগে থেকেই থাকুক — ব্যবহার করা সহজ, বিশ্বাসযোগ্যভাবে সঠিক, এবং এমন দামে যে সিদ্ধান্ত কখনো কঠিন হয় না।',
    'about.intro.anchor': '"আপনার পকেটে ল্যাব।"',
    'about.mission.body': 'প্রতিটি চিংড়ি ও মাছ চাষির হাতে পুকুরের পানি পরিমাপের একটি সহজ, সঠিক উপায় দিন — যাতে আর কাউকে তাদের ফসল নিয়ে অনুমান করতে না হয়।',
    'about.vision.body': 'এমন একটি ভবিষ্যৎ যেখানে আপনার পানি বোঝা পুকুরে খাবার দেওয়ার মতোই সাধারণ — কোনো ল্যাব ভ্রমণ নেই, কোনো জargon নেই, চাষি ও তাদের ফসলের সত্যের মধ্যে কোনো বাধা নেই।'
  }
};

// Fix typo in bn about.vision.body
KEYS.bn['about.vision.body'] = 'এমন একটি ভবিষ্যৎ যেখানে আপনার পানি বোঝা পুকুরে খাবার দেওয়ার মতোই সাধারণ — কোনো ল্যাব ভ্রমণ নেই, কোনো জটিল শব্দ নেই, চাষি ও তাদের ফসলের সত্যের মধ্যে কোনো বাধা নেই।';

for (const lang of Object.keys(KEYS)) {
  const file = path.join(LOCALE_DIR, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(data, KEYS[lang]);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log('locale', lang, Object.keys(data).length, 'keys');
}

function patchFile(rel, fn) {
  const full = path.join(ROOT, rel);
  let html = fs.readFileSync(full, 'utf8');
  const next = fn(html);
  if (next !== html) {
    fs.writeFileSync(full, next);
    console.log('patched', rel);
  } else {
    console.log('unchanged', rel);
  }
}

patchFile('index.html', (html) => {
  html = html
    .replace(
      /<p class="product-story-nameplate-brand">\s*<span class="product-story-tel-aqua">Tel-Aqua<\/span>\s*<span class="product-story-meter-label">pH\+Temp<\/span>\s*<\/p>\s*<p class="product-story-nameplate-line">Digital pH and<\/p>\s*<p class="product-story-nameplate-line">Temperature Meter<\/p>/,
      `<p class="product-story-nameplate-brand">
        <span class="product-story-tel-aqua" data-i18n="home.nameplate.brand">Tel-Aqua</span>
        <span class="product-story-meter-label" data-i18n="home.nameplate.phTemp">pH+Temp</span>
      </p>
      <p class="product-story-nameplate-line" data-i18n="home.nameplate.line1">Digital pH and</p>
      <p class="product-story-nameplate-line" data-i18n="home.nameplate.line2">Temperature Meter</p>`
    )
    .replace(/<span class="home-pricing-allin">all-in<\/span>/g, '<span class="home-pricing-allin" data-i18n="home.pricing.allin">all-in</span>')
    .replace(/<h3 class="dismantle-card-title">Protection Cap<\/h3>\s*<p class="dismantle-card-desc">Protects the probe and ensures safety\.<\/p>/,
      '<h3 class="dismantle-card-title" data-i18n="home.dismantle.cap.title">Protection Cap</h3>\n          <p class="dismantle-card-desc" data-i18n="home.dismantle.cap.desc">Protects the probe and ensures safety.</p>')
    .replace(/<h3 class="dismantle-card-title">Agile Glass Probe<\/h3>\s*<p class="dismantle-card-desc">High sensitivity glass electrode\.<\/p>/,
      '<h3 class="dismantle-card-title" data-i18n="home.dismantle.probe.title">Agile Glass Probe</h3>\n          <p class="dismantle-card-desc" data-i18n="home.dismantle.probe.desc">High sensitivity glass electrode.</p>')
    .replace(/<h3 class="dismantle-card-title">Control Buttons<\/h3>\s*<p class="dismantle-card-desc">ON\/OFF and CAL for simple operation\.<\/p>/,
      '<h3 class="dismantle-card-title" data-i18n="home.dismantle.buttons.title">Control Buttons</h3>\n          <p class="dismantle-card-desc" data-i18n="home.dismantle.buttons.desc">ON/OFF and CAL for simple operation.</p>')
    .replace(/<h3 class="dismantle-card-title">LCD Display<\/h3>\s*<p class="dismantle-card-desc">Bright and easy to read\.<\/p>/,
      '<h3 class="dismantle-card-title" data-i18n="home.dismantle.lcd.title">LCD Display</h3>\n          <p class="dismantle-card-desc" data-i18n="home.dismantle.lcd.desc">Bright and easy to read.</p>')
    .replace(/<h3 class="dismantle-card-title">Battery Case<\/h3>\s*<p class="dismantle-card-desc">Easy replaceable battery compartment\.<\/p>/,
      '<h3 class="dismantle-card-title" data-i18n="home.dismantle.battery.title">Battery Case</h3>\n          <p class="dismantle-card-desc" data-i18n="home.dismantle.battery.desc">Easy replaceable battery compartment.</p>')
    .replace(/<h3 class="wt-callout-title">Protect Your Shrimp From Day One<\/h3>\s*<p class="wt-callout-text">Ensure shrimp safety from the very start\.<\/p>/,
      '<h3 class="wt-callout-title" data-i18n="home.water.c1.title">Protect Your Shrimp From Day One</h3>\n            <p class="wt-callout-text" data-i18n="home.water.c1.text">Ensure shrimp safety from the very start.</p>')
    .replace(/<h3 class="wt-callout-title">No Lab Required<\/h3>\s*<p class="wt-callout-text">No costly equipment\. No lab testing\. Test anytime, anywhere\.<\/p>/,
      '<h3 class="wt-callout-title" data-i18n="home.water.c2.title">No Lab Required</h3>\n            <p class="wt-callout-text" data-i18n="home.water.c2.text">No costly equipment. No lab testing. Test anytime, anywhere.</p>')
    .replace(/<h3 class="wt-callout-title">Save Shrimp\. Save Money\.<\/h3>\s*<p class="wt-callout-text">Prevent losses\. Reduce costs\.<\/p>/,
      '<h3 class="wt-callout-title" data-i18n="home.water.c3.title">Save Shrimp. Save Money.</h3>\n            <p class="wt-callout-text" data-i18n="home.water.c3.text">Prevent losses. Reduce costs.</p>')
    .replace(/<h3 class="wt-callout-title">Low Cost, High Safety<\/h3>\s*<p class="wt-callout-text">Small investment\. Big protection\.<\/p>/,
      '<h3 class="wt-callout-title" data-i18n="home.water.c4.title">Low Cost, High Safety</h3>\n            <p class="wt-callout-text" data-i18n="home.water.c4.text">Small investment. Big protection.</p>')
    .replace(/<h3 class="science-card-title">Track pH Anytime\.<\/h3>\s*<p class="science-card-text">Monitor pond water pH in seconds with the Tel-Aqua meter\. Get accurate readings anytime, anywhere for a healthier pond and better yield\.<\/p>/,
      '<h3 class="science-card-title" data-i18n="home.science.c1.title">Track pH Anytime.</h3>\n            <p class="science-card-text" data-i18n="home.science.c1.text">Monitor pond water pH in seconds with the Tel-Aqua meter. Get accurate readings anytime, anywhere for a healthier pond and better yield.</p>')
    .replace(/<h3 class="science-card-title">Lab Precision\. Pond Speed\.<\/h3>\s*<p class="science-card-text">Waterproof, pocket-ready, and built for wet hands\. Dip once and trust the number - no lab wait, no guesswork\.<\/p>/,
      '<h3 class="science-card-title" data-i18n="home.science.c2.title">Lab Precision. Pond Speed.</h3>\n            <p class="science-card-text" data-i18n="home.science.c2.text">Waterproof, pocket-ready, and built for wet hands. Dip once and trust the number - no lab wait, no guesswork.</p>')
    .replace(/<h3 class="science-card-title">Calibrate With Confidence\.<\/h3>\s*<p class="science-card-text">Simple field calibration keeps every reading dependable - so anyone on the farm can test and act with certainty\.<\/p>/,
      '<h3 class="science-card-title" data-i18n="home.science.c3.title">Calibrate With Confidence.</h3>\n            <p class="science-card-text" data-i18n="home.science.c3.text">Simple field calibration keeps every reading dependable - so anyone on the farm can test and act with certainty.</p>')
    .replace(/<h3 class="science-card-title">Proven on Real Ponds\.<\/h3>\s*<p class="science-card-text">Designed for aquaculture mornings - from beaker checks to open-water ponds - so science stays practical where it matters\.<\/p>/,
      '<h3 class="science-card-title" data-i18n="home.science.c4.title">Proven on Real Ponds.</h3>\n            <p class="science-card-text" data-i18n="home.science.c4.text">Designed for aquaculture mornings - from beaker checks to open-water ponds - so science stays practical where it matters.</p>')
    .replace(/<span class="home-faq-label">FAQ<\/span>/, '<span class="home-faq-label" data-i18n="home.faq.label">FAQ</span>')
    .replace(/<p class="home-faq-lede">Clear answers to help you use with confidence\.<\/p>/, '<p class="home-faq-lede" data-i18n="home.faq.lede">Clear answers to help you use with confidence.</p>')
    .replace(/<a href="#faq-list" class="home-faq-btn home-faq-btn--navy">View All<\/a>/, '<a href="#faq-list" class="home-faq-btn home-faq-btn--navy" data-i18n="home.faq.viewAll">View All</a>');

  const faqPairs = [
    ['What can this meter measure?', 'home.faq.q1', 'The Tel-Aqua measures pH (0-14) and water temperature in a single dip - no app or lab visit required.', 'home.faq.a1'],
    ['How accurate is the Tel-Aqua pH Meter?', 'home.faq.q2', 'It reads within ±0.02 pH when calibrated correctly. Re-calibrate periodically with the included buffers for trusted results.', 'home.faq.a2'],
    ['How do I calibrate the meter?', 'home.faq.q3', 'Use the buffer sachets in the box on day one. It takes a few minutes and keeps every reading trustworthy.', 'home.faq.a3'],
    ['Is it suitable for both freshwater and saltwater?', 'home.faq.q4', 'Yes. It is built for shrimp and fish pond water - suitable for both freshwater and brackish aquaculture conditions.', 'home.faq.a4'],
    ['How do I maintain the probe?', 'home.faq.q5', 'Rinse the probe with clean water after each use, keep the protection cap on when stored, and avoid letting the electrode dry out.', 'home.faq.a5'],
    ['What is included in the box?', 'home.faq.q6', 'Tel-Aqua pH Meter meter, calibration buffer sachets, protection cap, and full documentation with every unit.', 'home.faq.a6']
  ];
  for (const [q, qk, a, ak] of faqPairs) {
    html = html.replace(
      `<span class="faq-q-text">${q}</span>`,
      `<span class="faq-q-text" data-i18n="${qk}">${q}</span>`
    );
    html = html.replace(
      `<p>${a}</p>`,
      `<p data-i18n="${ak}">${a}</p>`
    );
  }
  return html;
});

patchFile('how-to-calibrate.html', (html) => {
  html = html
    .replace(/<span class="cal-video-meta">SHRIMP · 4:12<\/span>/, '<span class="cal-video-meta" data-i18n="cal.video.shrimp.meta">SHRIMP · 4:12</span>')
    .replace(/<span class="cal-video-meta">FISH · 3:48<\/span>/, '<span class="cal-video-meta" data-i18n="cal.video.fish.meta">FISH · 3:48</span>')
    .replace(/<span class="cal-video-lang">4 LANGUAGES<\/span>/g, '<span class="cal-video-lang" data-i18n="cal.video.langs">4 LANGUAGES</span>')
    .replace(/<h3 class="cal-video-title">Shrimp Pond Calibration<\/h3>/, '<h3 class="cal-video-title" data-i18n="cal.video.shrimp.title">Shrimp Pond Calibration</h3>')
    .replace(/<p class="cal-video-desc">Brackish water, 3-point buffers, and what to do when the reading will not settle\.<\/p>/,
      '<p class="cal-video-desc" data-i18n="cal.video.shrimp.desc">Brackish water, 3-point buffers, and what to do when the reading will not settle.</p>')
    .replace(/<h3 class="cal-video-title">Fish Pond Calibration<\/h3>/, '<h3 class="cal-video-title" data-i18n="cal.video.fish.title">Fish Pond Calibration</h3>')
    .replace(/<p class="cal-video-desc">Freshwater routine before the morning round — buffers, rinse cups, and storage\.<\/p>/,
      '<p class="cal-video-desc" data-i18n="cal.video.fish.desc">Freshwater routine before the morning round — buffers, rinse cups, and storage.</p>')
    .replace(/<span class="cal-video-notes-label">Quick Notes<\/span>/g, '<span class="cal-video-notes-label" data-i18n="cal.video.notes">Quick Notes</span>')
    .replace(/<li>Use fresh buffer solution<\/li>/, '<li data-i18n="cal.video.shrimp.n1">Use fresh buffer solution</li>')
    .replace(/<li>Rinse probe before every step<\/li>/, '<li data-i18n="cal.video.shrimp.n2">Rinse probe before every step</li>')
    .replace(/<li>Never wipe aggressively<\/li>/, '<li data-i18n="cal.video.shrimp.n3">Never wipe aggressively</li>')
    .replace(/<li>Store properly after calibration<\/li>/, '<li data-i18n="cal.video.shrimp.n4">Store properly after calibration</li>')
    .replace(/<li>Calibrate before checking ponds<\/li>/, '<li data-i18n="cal.video.fish.n1">Calibrate before checking ponds</li>')
    .replace(/<li>Avoid dirty containers<\/li>/, '<li data-i18n="cal.video.fish.n2">Avoid dirty containers</li>')
    .replace(/<li>Keep probe clean<\/li>/, '<li data-i18n="cal.video.fish.n3">Keep probe clean</li>')
    .replace(/<li>Use distilled water<\/li>/, '<li data-i18n="cal.video.fish.n4">Use distilled water</li>')
    .replace(/<h3>Prepare Buffer Solutions<\/h3>/, '<h3 data-i18n="cal.step1">Prepare Buffer Solutions</h3>')
    .replace(/<h3>Turn ON Meter<\/h3>/, '<h3 data-i18n="cal.step2">Turn ON Meter</h3>')
    .replace(/<h3>Immerse Probe<\/h3>/, '<h3 data-i18n="cal.step3">Immerse Probe</h3>')
    .replace(/<h3>Press CAL<\/h3>/, '<h3 data-i18n="cal.step4">Press CAL</h3>')
    .replace(/<h3>Wait Until Stable<\/h3>/, '<h3 data-i18n="cal.step5">Wait Until Stable</h3>')
    .replace(/<h3>Repeat with Other Buffers<\/h3>/, '<h3 data-i18n="cal.step6">Repeat with Other Buffers</h3>')
    .replace(/<h3>Rinse &amp; Store<\/h3>/, '<h3 data-i18n="cal.step7">Rinse &amp; Store</h3>')
    .replace(/<span>Calibrate every 2–4 weeks<\/span>/, '<span data-i18n="cal.tip1">Calibrate every 2–4 weeks</span>')
    .replace(/<span>Calibrate before every crop<\/span>/, '<span data-i18n="cal.tip2">Calibrate before every crop</span>')
    .replace(/<span>Never use expired buffers<\/span>/, '<span data-i18n="cal.tip3">Never use expired buffers</span>')
    .replace(/<span>Always rinse the probe<\/span>/, '<span data-i18n="cal.tip4">Always rinse the probe</span>')
    .replace(/<span>Store with protection cap<\/span>/, '<span data-i18n="cal.tip5">Store with protection cap</span>')
    .replace(/<span>Avoid direct sunlight<\/span>/, '<span data-i18n="cal.tip6">Avoid direct sunlight</span>')
    .replace(/<span>Replace the pH electrode every 6 months<\/span>/, '<span data-i18n="cal.tip7">Replace the pH electrode every 6 months</span>')
    .replace(/<span class="home-pricing-allin">all-in<\/span>/g, '<span class="home-pricing-allin" data-i18n="home.pricing.allin">all-in</span>');
  return html;
});

patchFile('about.html', (html) => {
  return html
    .replace(/<p class="lede">For two years, we taught farmers about their water — and never sold them anything\.<\/p>/,
      '<p class="lede" data-i18n="about.intro.lede">For two years, we taught farmers about their water — and never sold them anything.</p>')
    .replace(/<p>Along the way, one question kept coming back, in every pond and every district: <em>how do I actually measure my water\?<\/em> Farmers weren't short on effort or knowledge\. They were short on a simple, trustworthy way to see what was happening beneath the surface\.<\/p>/,
      '<p data-i18n="about.intro.p2">Along the way, one question kept coming back, in every pond and every district: how do I actually measure my water? Farmers weren\'t short on effort or knowledge. They were short on a simple, trustworthy way to see what was happening beneath the surface.</p>')
    .replace(/<p>So we built the tool we wished every farmer already had — simple to use, accurate enough to trust, and priced so it was never a hard decision\.<\/p>/,
      '<p data-i18n="about.intro.p3">So we built the tool we wished every farmer already had — simple to use, accurate enough to trust, and priced so it was never a hard decision.</p>')
    .replace(/<div class="story-anchor">"Lab in Your Pocket\."<\/div>/,
      '<div class="story-anchor" data-i18n="about.intro.anchor">"Lab in Your Pocket."</div>')
    .replace(/<h3 data-i18n="about\.mission\.title">Our Mission<\/h3>\s*<p>Put a simple, accurate way to measure pond water into the hands of every shrimp and fish farmer — so no one has to guess with their crop again\.<\/p>/,
      '<h3 data-i18n="about.mission.title">Our Mission</h3>\n        <p data-i18n="about.mission.body">Put a simple, accurate way to measure pond water into the hands of every shrimp and fish farmer — so no one has to guess with their crop again.</p>')
    .replace(/<h3 data-i18n="about\.vision\.title">Our Vision<\/h3>\s*<p>A future where understanding your water is as ordinary as feeding your pond — no lab trip, no jargon, no barrier between a farmer and the truth about their crop\.<\/p>/,
      '<h3 data-i18n="about.vision.title">Our Vision</h3>\n        <p data-i18n="about.vision.body">A future where understanding your water is as ordinary as feeding your pond — no lab trip, no jargon, no barrier between a farmer and the truth about their crop.</p>');
});

console.log('done');
