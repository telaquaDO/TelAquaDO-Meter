/* Tel-Aqua product catalog and search helpers. */
(() => {
  'use strict';

  const products = [
    {
      id: 'telaqua-ph-meter',
      slug: 'tel-aqua-ph-meter',
      name: 'Tel-Aqua PH02 pH Meter',
      sku: null,
      category: 'Water Testing',
      price: 2999,
      compareAtPrice: null,
      image: 'assets/images/products/cart-checkout-product.png?v=2',
      images: [
        'assets/images/products/product-front.png',
        'assets/images/products/product-side.png',
        'assets/images/products/product-hero.png',
        'assets/images/products/faq-hero-meter.png'
      ],
      description: 'A pocket-sized digital pH meter built for shrimp and fish farmers who cannot afford to guess.',
      includedItems: [
        { key: 'cart.included.meter', fallback: '1 x Tel-Aqua pH Meter' },
        { key: 'cart.included.sachets', fallback: '3 x Calibration Sachets', noteKey: 'cart.included.sachetsNote', noteFallback: '(pH 4, pH 6.86, pH 9.18)' },
        { key: 'cart.included.manual', fallback: '1 x User Manual' }
      ],
      keywords: ['ph meter', 'water testing', 'shrimp pond', 'fish pond', 'aquaculture', 'telaqua ph meter'],
      features: [
        '±0.02 pH accuracy when calibrated correctly',
        'Measures pH in seconds',
        'Pocket-sized, waterproof pen design',
        'Calibration buffers included'
      ],
      specifications: {
        'pH range': '0–14 pH',
        'Accuracy': '±0.02 pH',
        'Use case': 'Shrimp and fish ponds'
      },
      url: 'ph-meter.html#pricing'
    },
    {
      id: 'telaqua-do-meter',
      slug: 'tel-aqua-do-meter',
      name: 'Tel-Aqua DO Meter',
      sku: null,
      category: 'Water Testing',
      price: 1500,
      compareAtPrice: null,
      image: 'assets/images/products/do-meter/tel-aqua-do-meter-premium.png',
      images: [
        'assets/images/products/do-meter/tel-aqua-do-meter-premium.png'
      ],
      description: 'A dissolved oxygen meter for aquaculture pond monitoring and field-based water testing.',
      includedItems: [],
      keywords: ['do meter', 'dissolved oxygen meter', 'water testing', 'aquaculture', 'pond monitoring'],
      features: [
        'Dissolved oxygen measurement',
        'Portable design',
        'Digital display',
        'Aquaculture-focused use',
        '[DO METER SPECIFICATION TO BE ADDED]'
      ],
      specifications: {
        'Dissolved oxygen range': '[TO BE PROVIDED]',
        'Temperature display': '[TO BE PROVIDED]',
        'Use case': 'Aquaculture pond monitoring'
      },
      url: 'do-meter.html'
    }
  ];

  const normalize = value => String(value || '').toLowerCase().trim();
  /* Cart/checkout inject name into attributes — always return plain text, never HTML. */
  const toPlainText = value => String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  const getById = id => {
    const product = products.find(item => item.id === id) || null;
    if(!product) return null;
    const tt = (key, fallback) => {
      const value = window.TelAquaI18n?.t?.(key);
      return value && value !== key ? value : fallback;
    };
    if(product.id !== 'telaqua-ph-meter') return product;
    return {
      ...product,
      name: toPlainText(tt('product.meter.name', product.name)) || product.name,
      category: tt('product.meter.category', product.category)
    };
  };
  const formatPrice = value => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);

  const search = query => {
    const term = normalize(query);
    if(!term) return products.slice();
    return products.filter(product => normalize([
      product.name,
      product.category,
      product.description,
      ...product.keywords
    ].join(' ')).includes(term));
  };

  window.TelAquaProducts = Object.freeze({
    all: products,
    getById,
    search,
    formatPrice
  });
})();