/* Instant product search overlay shared by desktop and mobile navigation. */
(() => {
  'use strict';

  const catalog = () => window.TelAquaProducts;
  let overlay = null;
  let input = null;
  let results = null;
  let lastFocused = null;

  const resultMarkup = product => `
    <a class="search-result" href="${product.url}" data-search-result>
      <img src="${product.image}" alt="">
      <span><strong>${product.name}</strong><small>${product.category}</small></span>
      <b>${catalog().formatPrice(product.price)}</b>
    </a>`;

  const render = query => {
    const matches = catalog()?.search(query) || [];
    if(!matches.length){
      results.innerHTML = '<div class="search-empty">No products found.</div>';
      return;
    }
    results.innerHTML = matches.map(resultMarkup).join('');
  };

  const close = () => {
    if(!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('search-open');
    window.setTimeout(() => lastFocused?.focus(), 220);
  };

  const open = trigger => {
    if(!overlay || !catalog()) return;
    lastFocused = trigger;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('search-open');
    input.value = '';
    render('');
    window.setTimeout(() => input.focus(), 80);
  };

  const initialize = () => {
    overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="search-backdrop" data-search-close></div>
      <section class="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <div class="search-head">
          <div><span class="eyebrow">Product Search</span><h2 id="search-title">What are you looking for?</h2></div>
          <button type="button" class="search-close" data-search-close aria-label="Close search"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <label class="search-field">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" placeholder="Search products, categories, or keywords" autocomplete="off" aria-label="Search products">
        </label>
        <div class="search-results" aria-live="polite"></div>
      </section>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector('input');
    results = overlay.querySelector('.search-results');

    document.querySelectorAll('.search-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        open(button);
      });
    });
    overlay.addEventListener('click', event => {
      if(event.target.closest('[data-search-close]') || event.target.closest('[data-search-result]')) close();
    });
    input.addEventListener('input', () => render(input.value));
    document.addEventListener('keydown', event => {
      if(event.key === 'Escape' && overlay.classList.contains('open')) close();
    });
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();