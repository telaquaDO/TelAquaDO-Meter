/* =========================================================
   TELAQUA — main.js
   Handles: sticky navbar, mobile menu, GSAP reveals,
   Swiper carousels, FAQ accordion, click-to-play videos,
   contact form (front-end only)
========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initOrderLinks();
  initNavbar();
  initMobileMenu();
  initSwipers();
  initFaq();
  initProductAccordions();
  initProductOptions();
  initClickToPlayVideos();
  initHeroVideo();
  initProductBenefitsVideo();
  initHomeBenefitsCarousel();
  initOurStory();
  initContactForm();
  initOurStoryLinks();
  initFaqLinks();
  initMobileStickyBuy();
  initGsapReveals();
  initProductStoryReveals();
  if(typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  markActiveNavLink();
});

/* ---------------- NAVBAR ---------------- */
function ensureSiteChrome(){
  const existing = document.querySelector('.site-chrome');
  if(existing){
    /* Keep announcement bar inside fixed chrome (Home already has chrome). */
    const orphanBanner = document.querySelector('body > .top-banner');
    if(orphanBanner && !existing.contains(orphanBanner)){
      existing.prepend(orphanBanner);
    }
    // Non-hero pages need a spacer so content isn't hidden under the fixed chrome.
    if(!document.querySelector('.hero') && !document.querySelector('.site-chrome-spacer')){
      const spacer = document.createElement('div');
      spacer.className = 'site-chrome-spacer';
      spacer.style.height = `${existing.offsetHeight}px`;
      existing.after(spacer);
      window.addEventListener('resize', () => {
        spacer.style.height = `${existing.offsetHeight}px`;
      }, { passive:true });
    }
    return existing;
  }
  const banner = document.querySelector('.top-banner');
  const navbar = document.querySelector('.navbar');
  if(!navbar) return null;
  const chrome = document.createElement('div');
  chrome.className = 'site-chrome';
  if(banner){
    banner.parentNode.insertBefore(chrome, banner);
    chrome.appendChild(banner);
  } else {
    navbar.parentNode.insertBefore(chrome, navbar);
  }
  chrome.appendChild(navbar);
  if(!document.querySelector('.hero')){
    const spacer = document.createElement('div');
    spacer.className = 'site-chrome-spacer';
    spacer.style.height = `${chrome.offsetHeight}px`;
    chrome.after(spacer);
    window.addEventListener('resize', () => {
      spacer.style.height = `${chrome.offsetHeight}px`;
    }, { passive:true });
  }
  return chrome;
}

function initNavbar(){
  const chrome = ensureSiteChrome();
  const navbar = document.querySelector('.navbar');
  if(!navbar) return;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    const goingDown = y > lastY;
    const delta = Math.abs(y - lastY);

    if(y > 24){
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    if(chrome && !navbar.classList.contains('menu-active')){
      // Hide on scroll down so the hero stays uncovered; show on scroll up.
      if(y < 48){
        chrome.classList.remove('is-hidden');
      } else if(goingDown && delta > 4){
        chrome.classList.add('is-hidden');
      } else if(!goingDown && delta > 4){
        chrome.classList.remove('is-hidden');
      }
    }

    lastY = y;
    ticking = false;
  };

  const onScroll = () => {
    if(ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive:true });
}

function markActiveNavLink(){
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a=>{
    const href = a.getAttribute('href');
    if(href === path || (path === '' && href === 'index.html')){
      a.classList.add('active');
    }
  });
}

/* ---------------- MOBILE MENU ---------------- */
function initMobileMenu(){
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const navbar = document.querySelector('.navbar');
  if(!toggle || !links || !navbar) return;

  const overlay = document.createElement('button');
  overlay.type = 'button';
  overlay.className = 'nav-drawer-overlay';
  overlay.setAttribute('aria-label', 'Close menu');
  const chrome = document.querySelector('.site-chrome');
  (chrome || document.body).appendChild(overlay);

  const drawerHeader = document.createElement('div');
  drawerHeader.className = 'nav-drawer-header';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'nav-drawer-close';
  closeButton.setAttribute('aria-label', 'Close menu');
  closeButton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
  drawerHeader.appendChild(closeButton);
  links.prepend(drawerHeader);

  // The cue sits above the scrollable drawer and never intercepts touch input.
  const indicator = document.createElement('div');
  indicator.className = 'nav-scroll-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  indicator.innerHTML = '<span>Scroll for more</span><i class="fa-solid fa-chevron-down"></i>';
  navbar.appendChild(indicator);

  let lockedScrollY = 0;
  let scrollFrame = null;
  let closeTimer = null;
  const nearBottomOffset = 28;
  const menuTransitionMs = 460;

  const updateScrollIndicator = () => {
    scrollFrame = null;
    const hasOverflow = links.scrollHeight > links.clientHeight + 2;
    const distanceFromBottom = links.scrollHeight - links.scrollTop - links.clientHeight;
    const shouldShow = links.classList.contains('open') && hasOverflow && distanceFromBottom > nearBottomOffset;
    indicator.classList.toggle('is-visible', shouldShow);
  };

  const requestIndicatorUpdate = () => {
    if(scrollFrame === null) scrollFrame = requestAnimationFrame(updateScrollIndicator);
  };

  const lockPage = () => {
    if(document.body.classList.contains('menu-open')) return;
    lockedScrollY = window.scrollY;
    document.documentElement.classList.add('menu-open');
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.classList.add('menu-open');
  };

  const releasePageLock = () => {
    document.documentElement.classList.remove('menu-open');
    document.body.classList.remove('menu-open');
    document.body.style.top = '';

    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, lockedScrollY);
    requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    });
  };

  const openMenu = () => {
    if(closeTimer !== null){
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    lockPage();
    navbar.classList.add('menu-active');
    const chrome = document.querySelector('.site-chrome');
    if(chrome){
      chrome.classList.add('is-menu-open');
      chrome.classList.remove('is-hidden');
    }
    links.scrollTop = 0;
    links.classList.add('open');
    overlay.classList.add('is-visible');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    requestIndicatorUpdate();
  };

  const closeMenu = (immediate = false) => {
    links.classList.remove('open');
    overlay.classList.remove('is-visible');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    indicator.classList.remove('is-visible');

    const finishClose = () => {
      if(!links.classList.contains('open')){
        releasePageLock();
        navbar.classList.remove('menu-active');
        const chrome = document.querySelector('.site-chrome');
        if(chrome) chrome.classList.remove('is-menu-open');
      }
      closeTimer = null;
    };

    if(closeTimer !== null) clearTimeout(closeTimer);
    if(immediate) finishClose();
    else closeTimer = window.setTimeout(finishClose, menuTransitionMs);
  };

  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  toggle.addEventListener('click', () => links.classList.contains('open') ? closeMenu() : openMenu());
  closeButton.addEventListener('click', () => closeMenu());
  overlay.addEventListener('click', () => closeMenu());
  links.addEventListener('scroll', requestIndicatorUpdate, { passive:true });

  // Navigate normally, then close the drawer (do not block the link).
  links.querySelectorAll('a[href]').forEach((anchor) => {
    anchor.style.pointerEvents = 'auto';
    anchor.addEventListener('click', () => {
      closeMenu(true);
    });
  });

  document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape' && links.classList.contains('open')) closeMenu();
  });

  window.addEventListener('resize', () => {
    if(window.innerWidth > 940 && links.classList.contains('open')) closeMenu(true);
    else requestIndicatorUpdate();
  }, { passive:true });

  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', requestIndicatorUpdate, { passive:true });
  }
}
/* ---------------- SWIPER CAROUSELS ---------------- */
function initSwipers(){
  if(typeof Swiper === 'undefined') return;

  // Main product gallery: paired thumbnail and hero swipers.
  const productThumbEl = document.querySelector('.pdp-thumb-swiper');
  const productMainEl = document.querySelector('.pdp-main-swiper');
  let productThumbSwiper = null;

  if(productThumbEl){
    productThumbSwiper = new Swiper(productThumbEl, {
      slidesPerView: 4,
      spaceBetween: 10,
      freeMode: true,
      watchSlidesProgress: true,
      breakpoints: { 480: { slidesPerView: 5 } }
    });
  }

  if(productMainEl){
    const productMainSwiper = new Swiper(productMainEl, {
      slidesPerView: 1,
      loop: true,
      speed: 750,
      grabCursor: true,
      autoplay: {
        delay: 3500,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
        waitForTransition: true,
      },
      thumbs: productThumbSwiper ? { swiper: productThumbSwiper } : undefined,
      pagination: { el: productMainEl.querySelector('.swiper-pagination'), clickable: true },
      navigation: {
        nextEl: productMainEl.querySelector('.swiper-button-next'),
        prevEl: productMainEl.querySelector('.swiper-button-prev'),
      },
      on: {
        touchStart(swiper){ if(swiper.autoplay) swiper.autoplay.pause(); },
        touchEnd(swiper){ if(swiper.autoplay) window.setTimeout(() => swiper.autoplay.resume(), 450); },
      }
    });

    if(window.matchMedia('(hover: hover)').matches){
      productMainEl.addEventListener('mouseenter', () => productMainSwiper.autoplay.pause());
      productMainEl.addEventListener('mouseleave', () => productMainSwiper.autoplay.resume());
    }
  }

  const galleryEl = document.querySelector('.gallery-swiper');
  if(galleryEl){
    const gallerySwiper = new Swiper(galleryEl, {
      slidesPerView: 1.15,
      spaceBetween: 24,
      loop: true,
      speed: 700,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
        waitForTransition: true,
      },
      pagination: { el: galleryEl.querySelector('.swiper-pagination'), clickable:true },
      navigation: {
        nextEl: galleryEl.querySelector('.swiper-button-next'),
        prevEl: galleryEl.querySelector('.swiper-button-prev'),
      },
      on: {
        touchStart(swiper){ swiper.autoplay.pause(); },
        touchEnd(swiper){ swiper.autoplay.resume(); },
      },
      breakpoints: {
        640: { slidesPerView: 1.6 },
        1000: { slidesPerView: 2.4 },
        1300: { slidesPerView: 3.1 },
      }
    });

    // Explicit hover fallback keeps pause/resume consistent across desktop browsers.
    if(window.matchMedia('(hover: hover)').matches){
      galleryEl.addEventListener('mouseenter', () => gallerySwiper.autoplay.pause());
      galleryEl.addEventListener('mouseleave', () => gallerySwiper.autoplay.resume());
    }
  }


  const relatedEl = document.querySelector('.pdp-related-swiper');
  if(relatedEl){
    const relatedSection = relatedEl.closest('.pdp-related-section');
    new Swiper(relatedEl, {
      slidesPerView: 1.12,
      spaceBetween: 14,
      speed: 650,
      pagination: { el: relatedEl.querySelector('.swiper-pagination'), clickable: true },
      navigation: {
        nextEl: relatedSection ? relatedSection.querySelector('.pdp-related-controls .swiper-button-next') : null,
        prevEl: relatedSection ? relatedSection.querySelector('.pdp-related-controls .swiper-button-prev') : null,
      },
      breakpoints: { 600: { slidesPerView: 2.1 }, 960: { slidesPerView: 3 }, 1280: { slidesPerView: 3.35, spaceBetween: 22 } }
    });
  }

  const trustEl = document.querySelector('.trust-swiper');
  if(trustEl){
    new Swiper(trustEl, {
      slidesPerView: 1,
      loop: true,
      autoplay: { delay: 5000, disableOnInteraction: false },
      effect: 'fade',
      fadeEffect: { crossFade:true },
      pagination: { el: trustEl.querySelector('.swiper-pagination'), clickable:true },
    });
  }

  const testimonialsEl = document.querySelector('.testimonials-swiper');
  if(testimonialsEl){
    new Swiper(testimonialsEl, {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      speed: 550,
      allowTouchMove: true,
      grabCursor: true,
      simulateTouch: true,
      touchRatio: 1,
      resistanceRatio: 0.65,
      autoplay: {
        delay: 4800,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      pagination: {
        el: testimonialsEl.querySelector('.testimonials-pagination'),
        clickable: true,
      },
    });
  }
}

/* ---------------- PRODUCT ACCORDION ---------------- */
function initProductAccordions(){
  document.querySelectorAll('.pdp-accordion').forEach(accordion => {
    const items = [...accordion.querySelectorAll('.pdp-accordion-item')];

    const setItem = (item, shouldOpen, animate = true) => {
      const button = item.querySelector('button');
      const panel = item.querySelector('.pdp-accordion-panel');
      if(!button || !panel) return;

      item.classList.toggle('is-open', shouldOpen);
      button.setAttribute('aria-expanded', String(shouldOpen));
      const targetHeight = shouldOpen ? panel.scrollHeight : 0;

      if(animate && typeof gsap !== 'undefined'){
        gsap.to(panel, { height: targetHeight, duration: .4, ease: 'power2.out', overwrite: true });
      } else {
        panel.style.height = `${targetHeight}px`;
      }
    };

    items.forEach(item => {
      setItem(item, item.classList.contains('is-open'), false);
      const button = item.querySelector('button');
      if(!button) return;
      button.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        items.forEach(other => setItem(other, other === item && willOpen));
      });
    });

    window.addEventListener('resize', () => {
      const openPanel = accordion.querySelector('.pdp-accordion-item.is-open .pdp-accordion-panel');
      if(openPanel) openPanel.style.height = `${openPanel.scrollHeight}px`;
    }, { passive: true });
  });
}

/* Keep repeated product option controls synchronized. */
function initProductOptions(){
  const controls = [...document.querySelectorAll('[data-variant-select]')];
  controls.forEach(control => {
    control.addEventListener('change', () => {
      const group = control.dataset.variantSelect;
      controls.forEach(other => {
        if(other !== control && other.dataset.variantSelect === group){
          const matchingOption = [...other.options].some(option => option.value === control.value);
          if(matchingOption) other.value = control.value;
        }
      });
    });
  });
}
/* ---------------- FAQ ACCORDION ---------------- */
function initFaq(){
  document.querySelectorAll('.faq-list').forEach(list=>{
    list.querySelectorAll('.faq-item').forEach(item=>{
      const q = item.querySelector('.faq-q');
      const a = item.querySelector('.faq-a');
      if(!q || !a) return;
      q.setAttribute('aria-expanded', 'false');
      q.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        list.querySelectorAll('.faq-item').forEach(other=>{
          other.classList.remove('open');
          const otherQ = other.querySelector('.faq-q');
          if(otherQ) otherQ.setAttribute('aria-expanded', 'false');
        });
        if(!isOpen){
          item.classList.add('open');
          q.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });
}

/* ---------------- CLICK-TO-PLAY VIDEOS ---------------- */
function initClickToPlayVideos(){
  document.querySelectorAll('.video-block').forEach(block=>{
    const video = block.querySelector('video');
    const playBtn = block.querySelector('.play-btn');
    if(!video || !playBtn) return;
    block.addEventListener('click', () => {
      if(video.paused){
        video.setAttribute('controls','');
        video.play();
        playBtn.style.opacity = '0';
        playBtn.style.pointerEvents = 'none';
      }
    });
    video.addEventListener('pause', () => {
      playBtn.style.opacity = '1';
      playBtn.style.pointerEvents = 'auto';
    });
  });
}

/* ---------------- PRODUCT BENEFITS VIDEO (scroll play/pause) ---------------- */
function initProductBenefitsVideo(){
  const section = document.getElementById('benefits-video');
  const video = document.getElementById('product-benefits-video');
  const muteBtn = document.getElementById('benefits-video-mute');
  if(!section || !video) return;

  let userUnmuted = false;
  let inView = false;

  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');

  const syncMuteUi = () => {
    if(!muteBtn) return;
    const muted = !userUnmuted;
    const icon = muteBtn.querySelector('i');
    muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
    if(icon){
      icon.className = muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    }
  };

  const tryPlay = () => {
    if(!inView){
      video.pause();
      return;
    }
    video.muted = !userUnmuted;
    const playPromise = video.play();
    if(playPromise && typeof playPromise.catch === 'function'){
      playPromise.catch(() => {});
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        if(inView) tryPlay();
        else video.pause();
      });
    },
    { threshold: [0, 0.35, 0.6], rootMargin: '0px' }
  );

  observer.observe(section);
  syncMuteUi();

  document.addEventListener('visibilitychange', () => {
    if(document.hidden) video.pause();
    else tryPlay();
  });

  if(muteBtn){
    muteBtn.addEventListener('click', () => {
      userUnmuted = !userUnmuted;
      video.muted = !userUnmuted;
      syncMuteUi();
      tryPlay();
    });
  }
}

/* ---------------- HOME BENEFITS MOBILE CAROUSEL ---------------- */
function initHomeBenefitsCarousel(){
  const track = document.getElementById('home-benefits-track');
  const dotsWrap = document.getElementById('home-benefits-dots');
  if(!track || !dotsWrap) return;

  const cards = [...track.querySelectorAll('.home-benefit-card')];
  if(!cards.length) return;

  const mq = window.matchMedia('(max-width:640px)');
  let dots = [];

  const getIndex = () => {
    const width = track.clientWidth || 1;
    return Math.min(cards.length - 1, Math.max(0, Math.round(track.scrollLeft / width)));
  };

  const syncDots = () => {
    const index = getIndex();
    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  const buildDots = () => {
    dotsWrap.innerHTML = '';
    dots = cards.map((_, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'home-benefits-dot' + (i === 0 ? ' is-active' : '');
      btn.setAttribute('aria-label', `Show benefit card ${i + 1}`);
      btn.addEventListener('click', () => {
        track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' });
      });
      dotsWrap.appendChild(btn);
      return btn;
    });
  };

  const syncMode = () => {
    if(mq.matches){
      dotsWrap.hidden = false;
      if(!dots.length) buildDots();
      syncDots();
    } else {
      dotsWrap.hidden = true;
      track.scrollLeft = 0;
    }
  };

  track.addEventListener('scroll', () => {
    if(!mq.matches) return;
    syncDots();
  }, { passive:true });

  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => card.classList.add('is-hover'));
    card.addEventListener('mouseleave', () => card.classList.remove('is-hover'));
  });

  if(typeof mq.addEventListener === 'function') mq.addEventListener('change', syncMode);
  else if(typeof mq.addListener === 'function') mq.addListener(syncMode);

  window.addEventListener('resize', () => {
    if(mq.matches) syncDots();
  }, { passive:true });

  syncMode();
}

/* ---------------- HERO IMAGE SLIDER ---------------- */
function initHeroVideo(){
  const section = document.querySelector('.hero');
  if(!section) return;

  const slides = [...section.querySelectorAll('[data-hero-slide]')];
  const dotsWrap = section.querySelector('[data-hero-slider-dots]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(!slides.length || !dotsWrap) return;

  let activeIndex = 0;
  let autoplayId = 0;

  const dots = slides.map((_, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `hero-slider-dot${index === 0 ? ' is-active' : ''}`;
    btn.setAttribute('aria-label', `Go to slide ${index + 1}`);
    btn.setAttribute('aria-current', index === 0 ? 'true' : 'false');
    btn.dataset.heroDot = String(index);
    dotsWrap.appendChild(btn);
    return btn;
  });

  const setActive = (index) => {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const isActive = i === activeIndex;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
    dots.forEach((dot, i) => {
      const isActive = i === activeIndex;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };

  const stopAutoplay = () => {
    if(autoplayId){
      window.clearInterval(autoplayId);
      autoplayId = 0;
    }
  };

  const startAutoplay = () => {
    stopAutoplay();
    if(reducedMotion || slides.length < 2) return;
    autoplayId = window.setInterval(() => {
      setActive(activeIndex + 1);
    }, 4200);
  };

  dotsWrap.addEventListener('click', (event) => {
    const dot = event.target.closest('[data-hero-dot]');
    if(!dot) return;
    setActive(Number(dot.dataset.heroDot || 0));
    startAutoplay();
  });

  section.addEventListener('mouseenter', stopAutoplay);
  section.addEventListener('mouseleave', startAutoplay);

  document.addEventListener('visibilitychange', () => {
    if(document.hidden) stopAutoplay();
    else startAutoplay();
  });

  setActive(0);
  startAutoplay();
}

function initProductStoryReveals(){
  const elements = document.querySelectorAll('.product-story-reveal');
  if(!elements.length) return;
  if(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    !('IntersectionObserver' in window)
  ) return;

  elements.forEach(element => element.classList.add('is-pending'));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      entry.target.classList.remove('is-pending');
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold:0.16, rootMargin:'0px 0px -8% 0px' });

  elements.forEach(element => observer.observe(element));
}

/* ---------------- OUR STORY ---------------- */
function initOurStory(){
  if(typeof window.initOurStoryV2 === 'function'){
    window.initOurStoryV2();
    return;
  }
  const section = document.querySelector('.our-story');
  const pin = section?.querySelector('.our-story-pin');
  if(!section || !pin) return;

  const titleTrusted = section.querySelector('.our-story-title--trusted');
  const titleChallenge = section.querySelector('.our-story-title--challenge');
  const sceneTrusted = section.querySelector('[data-scene="trusted"]');
  const sceneChallenge = section.querySelector('[data-scene="challenge"]');
  const marks = [...section.querySelectorAll('.our-story-progress-mark')];

  const getSceneParts = (name) => ({
    scene: section.querySelector(`[data-scene="${name}"]`),
    card: section.querySelector(`[data-scene="${name}"] .our-story-card`),
    wm: section.querySelector(`[data-scene="${name}"] .our-story-watermark`),
    product: section.querySelector(`.our-story-product--${name === 'trusted' ? 'trusted' : 'challenge'}`),
    callouts: [...section.querySelectorAll(`[data-scene-callout="${name}"]`)]
      .sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i)),
    lines: [...section.querySelectorAll(`[data-scene-line="${name}"]`)]
      .sort((a, b) => Number(a.dataset.line) - Number(b.dataset.line)),
    anchors: [...section.querySelectorAll(`[data-scene-anchor="${name}"]`)]
      .sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i)),
    statement: section.querySelector(`[data-scene-statement="${name}"]`),
    rule: section.querySelector(`[data-scene-statement="${name}"] .our-story-statement-rule`)
  });

  const trusted = getSceneParts('trusted');
  const challenge = getSceneParts('challenge');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !prefersReducedMotion;
  const isPhone = () => window.matchMedia('(max-width:768px)').matches;

  section.classList.add('is-ready');

  const setMark = (index) => {
    const safe = Math.max(0, Math.min(marks.length - 1, index));
    marks.forEach((m, i) => m.classList.toggle('is-active', i === safe));
  };

  const prepLines = (lines) => {
    lines.forEach((line) => {
      if(!line) return;
      line.style.strokeDasharray = '1';
      line.style.strokeDashoffset = '1';
    });
  };

  if(!hasGsap){
    [sceneTrusted, titleTrusted].forEach((el) => {
      if(el){ el.style.opacity = '1'; el.style.visibility = 'visible'; }
    });
    setMark(0);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  prepLines(trusted.lines);
  prepLines(challenge.lines);

  let storyTl = null;
  const scrollLen = () => Math.round(window.innerHeight * (isPhone() ? 2.2 : 2.8));

  /**
   * Callout beat: anchor pop → line draw → icon+text slide out.
   * Previous callouts stay visible. Kept short so scrub feels snappy.
   */
  const addCalloutBeats = (tl, parts, prefix) => {
    const outward = (el) => {
      const right = el.classList.contains('our-story-callout--tr')
        || el.classList.contains('our-story-callout--br');
      return right ? 12 : -12;
    };

    parts.callouts.forEach((callout, i) => {
      if(!callout) return;
      const line = parts.lines[i];
      const anchor = parts.anchors[i];
      const label = `${prefix}-${i}`;
      const xFrom = isPhone() ? 0 : outward(callout);

      tl.addLabel(label);

      if(anchor && !isPhone()){
        tl.fromTo(
          anchor,
          { autoAlpha:0, scale:0.35 },
          { autoAlpha:1, scale:1, duration:0.08, ease:'power2.out' },
          label
        );
      }

      if(line && !isPhone()){
        tl.fromTo(
          line,
          { strokeDashoffset:1 },
          { strokeDashoffset:0, duration:0.16, ease:'power2.out' },
          `${label}+=0.03`
        );
      }

      tl.fromTo(
        callout,
        { autoAlpha:0, x:xFrom, y:8 },
        { autoAlpha:1, x:0, y:0, duration:0.18, ease:'power2.out' },
        `${label}+=0.06`
      );

      tl.to({}, { duration:0.02 });
    });
  };

  const resetScene = (parts) => {
    if(parts.card) gsap.set(parts.card, { autoAlpha:0, scale:0.96 });
    if(parts.wm) gsap.set(parts.wm, { autoAlpha:0, scale:1.04 });
    if(parts.product) gsap.set(parts.product, { autoAlpha:0, scale:0.94, y:18 });
    gsap.set(parts.callouts, { autoAlpha:0, x:0, y:10 });
    gsap.set(parts.anchors, { autoAlpha:0, scale:0.4 });
    prepLines(parts.lines);
    gsap.set(parts.lines, { strokeDashoffset:1 });
    if(parts.statement) gsap.set(parts.statement, { autoAlpha:0, y:12 });
    if(parts.rule) gsap.set(parts.rule, { scaleX:0, transformOrigin:'left center' });
  };

  const build = () => {
    if(storyTl){
      storyTl.scrollTrigger?.kill();
      storyTl.kill();
      storyTl = null;
    }

    gsap.set([sceneTrusted, sceneChallenge], { autoAlpha:0, scale:1 });
    gsap.set(titleTrusted, { autoAlpha:1 });
    gsap.set(titleChallenge, { autoAlpha:0 });
    resetScene(trusted);
    resetScene(challenge);
    setMark(0);

    storyTl = gsap.timeline({
      defaults:{ ease:'power2.out' },
      scrollTrigger:{
        id:'our-story',
        trigger:pin,
        pin:true,
        pinSpacing:true,
        scrub:true,
        anticipatePin:1,
        invalidateOnRefresh:true,
        start:'top top',
        end:() => `+=${scrollLen()}`,
        onUpdate:(self) => {
          /* One mark per card: Trusted → Challenge */
          setMark(self.progress < 0.5 ? 0 : 1);
        }
      }
    });

    /* Phase 1 — card + product settle (no callouts yet) */
    storyTl.addLabel('trusted-card');
    storyTl
      .to(sceneTrusted, { autoAlpha:1, duration:0.12 }, 'trusted-card')
      .to(trusted.card, { autoAlpha:1, scale:1, duration:0.28 }, 'trusted-card')
      .to(trusted.wm, { autoAlpha:0.5, scale:1, duration:0.24 }, 'trusted-card+=0.04')
      .to(trusted.product, { autoAlpha:1, scale:1, y:0, duration:0.28 }, 'trusted-card+=0.06')
      .to({}, { duration:0.06 });

    /* Phase 2 — callouts one-by-one after card is still */
    addCalloutBeats(storyTl, trusted, 't');

    storyTl.addLabel('trusted-hold');
    storyTl.to(trusted.statement, { autoAlpha:1, y:0, duration:0.16 }, 'trusted-hold');
    if(trusted.rule){
      storyTl.to(trusted.rule, { scaleX:1, duration:0.14 }, 'trusted-hold+=0.03');
    }
    storyTl.to({}, { duration:0.08 });

    /* Phase 3 — crossfade to Challenge */
    storyTl.addLabel('cross');
    storyTl
      .to(sceneTrusted, { autoAlpha:0, scale:0.985, duration:0.22, ease:'power2.inOut' }, 'cross')
      .to(titleTrusted, { autoAlpha:0, duration:0.16 }, 'cross')
      .to(titleChallenge, { autoAlpha:1, duration:0.2 }, 'cross+=0.08')
      .set(sceneChallenge, { autoAlpha:0, scale:1.015 }, 'cross')
      .to(sceneChallenge, { autoAlpha:1, scale:1, duration:0.24, ease:'power2.out' }, 'cross+=0.1')
      .to(challenge.card, { autoAlpha:1, scale:1, duration:0.22 }, 'cross+=0.1')
      .to(challenge.wm, { autoAlpha:0.48, scale:1, duration:0.22 }, 'cross+=0.12')
      .to(challenge.product, { autoAlpha:1, scale:1, y:0, duration:0.24 }, 'cross+=0.14')
      .to({}, { duration:0.05 });

    addCalloutBeats(storyTl, challenge, 'c');

    storyTl.addLabel('challenge-hold');
    storyTl.to(challenge.statement, { autoAlpha:1, y:0, duration:0.16 }, 'challenge-hold');
    if(challenge.rule){
      storyTl.to(challenge.rule, { scaleX:1, duration:0.14 }, 'challenge-hold+=0.03');
    }
    storyTl.to({}, { duration:0.08 });

    return storyTl;
  };

  build();

  const phoneMq = window.matchMedia('(max-width:768px)');
  const onBreak = () => {
    build();
    if(window.TelaquaSmoothScroll?.refresh) window.TelaquaSmoothScroll.refresh();
    else ScrollTrigger.refresh();
  };
  if(typeof phoneMq.addEventListener === 'function') phoneMq.addEventListener('change', onBreak);
  else if(typeof phoneMq.addListener === 'function') phoneMq.addListener(onBreak);

  requestAnimationFrame(() => {
    if(window.TelaquaSmoothScroll?.refresh) window.TelaquaSmoothScroll.refresh();
    else ScrollTrigger.refresh();
  });
}

/* ---------------- ORDER / BUY CTAs → CART ---------------- */
function goToCart(productId){
  const cartApi = window.TelAquaCart;
  if(productId && cartApi && typeof cartApi.add === 'function'){
    cartApi.add(productId, 1);
    window.location.href = `cart.html?add=${encodeURIComponent(productId)}`;
    return true;
  }
  window.location.href = 'cart.html';
  return true;
}

function initOrderLinks(){
  document.addEventListener('click', (event) => {
    if(event.defaultPrevented) return;
    const link = event.target.closest(
      'a.js-order-link, a.nav-buy, a.floating-buy, a.mobile-sticky-buy__cta, a[href="#order"], a[href="#pricing"], a[href="index.html#order"], a[href="index.html#pricing"], a[href="checkout.html"].js-order-link, a[href="checkout.html"].nav-buy'
    );
    if(!link) return;

    const href = (link.getAttribute('href') || '').trim();
    const isPurchaseCta =
      link.classList.contains('js-order-link') ||
      link.classList.contains('nav-buy') ||
      link.classList.contains('floating-buy') ||
      link.classList.contains('mobile-sticky-buy__cta') ||
      href === '#order' ||
      href === '#pricing' ||
      href.endsWith('index.html#order') ||
      href.endsWith('index.html#pricing');
    if(!isPurchaseCta) return;
    if(link.matches('a.nav-buy[href="products.html"]')) return;
    const productId = link.dataset.productId;
    if(!productId) return;

    event.preventDefault();
    goToCart(productId);
  });
}

/* ---------------- ABOUT → OUR STORY ---------------- */
function scrollToOurStorySection(){
  const target = document.getElementById('our-story') || document.querySelector('.our-story');
  if(!target) return false;
  target.scrollIntoView({ behavior:'smooth', block:'start' });
  if(history.replaceState){
    history.replaceState(null, '', '#our-story');
  } else {
    location.hash = 'our-story';
  }
  return true;
}

function initOurStoryLinks(){
  document.addEventListener('click', (event) => {
    const link = event.target.closest(
      'a[href="#our-story"], a[href="about.html#our-story"], a[href="index.html#our-story"]'
    );
    if(!link) return;

    const href = (link.getAttribute('href') || '').trim();
    const onStoryPage = !!(document.getElementById('our-story') || document.querySelector('.our-story'));

    if(onStoryPage && (href === '#our-story' || href.endsWith('#our-story'))){
      event.preventDefault();
      scrollToOurStorySection();
      return;
    }

    if(href === 'index.html#our-story' || href === '#our-story'){
      event.preventDefault();
      location.href = 'about.html#our-story';
    }
  });

  if(
    location.hash === '#our-story' &&
    (document.getElementById('our-story') || document.querySelector('.our-story'))
  ){
    requestAnimationFrame(() => {
      setTimeout(() => scrollToOurStorySection(), 80);
    });
  }
}

/* ---------------- FAQ deep links (footer FAQs → #faq) ---------------- */
function scrollToFaqSection(hashId){
  const id = hashId === 'faq-list' ? 'faq-list' : 'faq';
  const target = document.getElementById(id) || document.getElementById('faq');
  if(!target) return false;

  const offset = -88;
  if(window.TelaquaSmoothScroll && typeof window.TelaquaSmoothScroll.scrollTo === 'function'){
    window.TelaquaSmoothScroll.scrollTo(target, { offset });
  } else {
    const top = target.getBoundingClientRect().top + window.pageYOffset + offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  if(history.replaceState){
    history.replaceState(null, '', `#${id === 'faq-list' ? 'faq-list' : 'faq'}`);
  } else {
    location.hash = id === 'faq-list' ? 'faq-list' : 'faq';
  }
  return true;
}

function initFaqLinks(){
  document.addEventListener('click', (event) => {
    const link = event.target.closest(
      'a[href="#faq"], a[href="#faq-list"], a[href="index.html#faq"], a[href="index.html#faq-list"]'
    );
    if(!link) return;

    const href = (link.getAttribute('href') || '').trim();
    const wantsList = href.includes('faq-list');
    const onFaqPage = !!document.getElementById('faq');

    if(onFaqPage){
      event.preventDefault();
      scrollToFaqSection(wantsList ? 'faq-list' : 'faq');
      return;
    }

    /* Other pages: always land on homepage FAQ */
    event.preventDefault();
    location.href = wantsList ? 'index.html#faq-list' : 'index.html#faq';
  });

  if(location.hash === '#faq' || location.hash === '#faq-list'){
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollToFaqSection(location.hash === '#faq-list' ? 'faq-list' : 'faq');
      }, 160);
    });
  }
}

/* ---------------- CONTACT FORM (API) ---------------- */
function initContactForm(){
  const form = document.querySelector('.contact-form');
  if(!form) return;

  const CONTACT_API_URL = `${window.TELAQUA_API_BASE || 'https://lightpink-reindeer-561421.hostingersite.com'}/api/contact`;
  const submitBtn = form.querySelector('.contact-form-submit, button[type="submit"]');
  const statusEl = document.querySelector('#contact-form-status');
  const defaultSubmitLabel = 'Send Message';
  let isSubmitting = false;

  const showStatus = (message, type) => {
    if(!statusEl) return;
    if(!message){
      statusEl.hidden = true;
      statusEl.textContent = '';
      statusEl.className = 'contact-form-status';
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.className = `contact-form-status contact-form-status--${type || 'error'}`;
  };

  const clearFieldErrors = () => {
    form.querySelectorAll('.field.is-invalid').forEach((field) => {
      field.classList.remove('is-invalid');
    });
    form.querySelectorAll('[data-field-error]').forEach((el) => {
      el.textContent = '';
    });
  };

  const setFieldError = (name, message) => {
    const field = form.querySelector(`[data-field="${name}"]`);
    const error = form.querySelector(`[data-field-error="${name}"]`);
    if(field) field.classList.add('is-invalid');
    if(error) error.textContent = message || '';
  };

  const getValues = () => {
    const fullName = String(form.querySelector('#name')?.value || '').trim();
    const phoneRaw = String(form.querySelector('#phone')?.value || '').trim();
    const phone = phoneRaw.replace(/\D/g, '');
    const email = String(form.querySelector('#email')?.value || '').trim();
    const message = String(form.querySelector('#message')?.value || '').trim();
    return { fullName, phone, email, message };
  };

  const validate = (values) => {
    const errors = {};
    if(!values.fullName) errors.fullName = 'Please enter your full name.';
    if(!/^\d{10}$/.test(values.phone)) errors.phone = 'Enter a valid 10-digit phone number.';
    if(!values.email) errors.email = 'Please enter your email.';
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)){
      errors.email = 'Enter a valid email address.';
    }
    if(!values.message) errors.message = 'Please enter your message.';
    return errors;
  };

  const setSubmitting = (busy) => {
    if(!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
    const label = window.TelAquaI18n?.t?.('contact.form.submit');
    submitBtn.textContent = busy
      ? 'Sending...'
      : (label && label !== 'contact.form.submit' ? label : defaultSubmitLabel);
  };

  form.addEventListener('input', (event) => {
    const field = event.target.closest('[data-field]');
    if(!field) return;
    field.classList.remove('is-invalid');
    const name = field.getAttribute('data-field');
    const error = form.querySelector(`[data-field-error="${name}"]`);
    if(error) error.textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if(isSubmitting) return;

    showStatus('');
    clearFieldErrors();

    const values = getValues();
    const errors = validate(values);
    const keys = Object.keys(errors);
    if(keys.length){
      keys.forEach((key) => setFieldError(key, errors[key]));
      const first = form.querySelector('.field.is-invalid input, .field.is-invalid textarea');
      first?.focus();
      return;
    }

    isSubmitting = true;
    setSubmitting(true);

    try {
      let response;
      try {
        response = await fetch(CONTACT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: values.fullName,
            phone: values.phone,
            email: values.email,
            message: values.message
          })
        });
      } catch(networkError){
        showStatus('Unable to send your message. Please try again.', 'error');
        return;
      }

      let data = null;
      try {
        data = await response.json();
      } catch(parseError){
        data = null;
      }

      if(response.ok && data && data.success === true){
        showStatus('Thank you! Your message has been sent successfully.', 'success');
        form.reset();
        clearFieldErrors();
        return;
      }

      const apiMessage =
        data?.message ||
        data?.error ||
        'Unable to send your message. Please try again.';
      showStatus(apiMessage, 'error');
    } catch(error){
      console.error(error);
      showStatus('Unable to send your message. Please try again.', 'error');
    } finally {
      isSubmitting = false;
      setSubmitting(false);
    }
  });
}

/* ---------------- GSAP REVEALS ---------------- */
function initGsapReveals(){
  if(typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Navbar entrance
  gsap.from('.navbar', { y:-40, opacity:0, duration:0.9, ease:'power3.out', clearProps:'transform,opacity' });

  // Hero reveal sequence (pages with .hero-content only).
  if(document.querySelector('.hero-content')){
    const heroTl = gsap.timeline({ defaults:{ ease:'power3.out' } });
    heroTl
      .from('.hero-content .eyebrow', { opacity:0, y:24, duration:0.7 })
      .from('.hero-content h1', { opacity:0, y:36, duration:0.9 }, '-=0.4')
      .from('.hero-content p', { opacity:0, y:24, duration:0.8 }, '-=0.5')
      .from('.hero-actions .btn', { opacity:0, y:20, stagger:0.12, duration:0.6 }, '-=0.4');
    if(document.querySelector('.scroll-cue')) heroTl.from('.scroll-cue', { opacity:0, duration:0.8 }, '-=0.2');
  }

  // About page hero — no entrance animation (static banner)
  // (Previously GSAP fade/blur/scale on .about-hero-banner)

  // Contact page hero — split copy + product photo
  if(document.querySelector('.contact-hero')){
    const contactPhoto = document.querySelector('.contact-hero-media-img');
    const contactIntro = gsap.utils.toArray('.contact-hero-copy .eyebrow, .contact-hero-copy > p:not(.contact-hero-tagline)');
    const contactBtns = gsap.utils.toArray('.contact-hero-actions .btn');

    gsap.set('.contact-hero-tagline', { opacity:0, y:22 });
    gsap.set('.contact-hero-copy h1', { opacity:0, y:36, filter:'blur(8px)' });
    gsap.set(contactIntro, { opacity:0, y:22 });
    gsap.set(contactBtns, { opacity:0, y:28 });
    if(contactPhoto) gsap.set(contactPhoto, { opacity:0, y:28, scale:0.97 });

    const contactTl = gsap.timeline({ defaults:{ ease:'power3.out' } });
    if(contactPhoto){
      contactTl.to(contactPhoto, { opacity:1, y:0, scale:1, duration:1.05 }, 0);
    }
    contactTl
      .to('.contact-hero-tagline', { opacity:1, y:0, duration:0.7 }, 0.08)
      .to('.contact-hero-copy h1', { opacity:1, y:0, filter:'blur(0px)', duration:0.95 }, 0.16)
      .to(contactIntro, { opacity:1, y:0, duration:0.7, stagger:0.1 }, 0.3)
      .to(contactBtns, { opacity:1, y:0, duration:0.65, stagger:0.1, ease:'back.out(1.5)' }, 0.42);

    gsap.from('.contact-info-card', {
      opacity:0,
      y:36,
      duration:0.8,
      stagger:0.12,
      ease:'power3.out',
      scrollTrigger:{ trigger:'.contact-info-cards', start:'top 85%' }
    });

    gsap.from('.contact-form', {
      opacity:0,
      x:-40,
      duration:0.9,
      ease:'power3.out',
      scrollTrigger:{ trigger:'.contact-main', start:'top 80%' }
    });

    gsap.from('.contact-aside > *', {
      opacity:0,
      x:40,
      duration:0.85,
      stagger:0.12,
      ease:'power3.out',
      scrollTrigger:{ trigger:'.contact-main', start:'top 80%' }
    });
  }

  // Why Tel-Aqua hero — compact entrance + float + parallax
  if(document.querySelector('.why-hero')){
    const heroImg = document.querySelector('.why-hero-img');
    const heroParallax = document.querySelector('.why-hero-parallax');
    const copyBits = gsap.utils.toArray('.why-hero-copy .eyebrow, .why-hero-copy p');

    gsap.set('.why-hero-watermark', { opacity:0 });
    gsap.set('.why-hero-copy h1', { opacity:0, y:36, filter:'blur(8px)' });
    gsap.set(copyBits, { opacity:0, y:22 });
    gsap.set('.why-hero-copy .btn', { opacity:0, y:28 });
    gsap.set('.why-hero-glow', { opacity:0, scale:0.75 });
    if(heroImg) gsap.set(heroImg, { opacity:0, scale:0.9, rotate:-3 });

    const whyTl = gsap.timeline({ defaults:{ ease:'power3.out' } });
    whyTl
      .to('.why-hero-watermark', { opacity:1, duration:1.6, ease:'power1.out' }, 0)
      .to('.why-hero-copy h1', { opacity:1, y:0, filter:'blur(0px)', duration:0.95 }, 0.12)
      .to(copyBits, { opacity:1, y:0, duration:0.7, stagger:0.12 }, 0.28)
      .to('.why-hero-glow', { opacity:1, scale:1, duration:0.9 }, 0.2)
      .to(heroImg, { opacity:1, scale:1, rotate:0, duration:1.05 }, 0.18)
      .to('.why-hero-copy .btn', { opacity:1, y:0, duration:0.7, ease:'back.out(1.7)' }, 0.48);

    whyTl.add(() => {
      if(!heroImg) return;
      gsap.to(heroImg, {
        y:10,
        duration:2.6,
        ease:'sine.inOut',
        yoyo:true,
        repeat:-1
      });
    });

    if(heroParallax){
      gsap.to(heroParallax, {
        yPercent:12,
        ease:'none',
        scrollTrigger:{
          trigger:'.why-hero',
          start:'top top',
          end:'bottom top',
          scrub:true
        }
      });
    }
  }

  // Why Choose Tel-Aqua — alternating image/text reveals
  if(document.querySelector('.why-choose-features')){
    gsap.from('.why-choose-head > *', {
      opacity:0,
      y:28,
      duration:0.8,
      stagger:0.1,
      ease:'power3.out',
      scrollTrigger:{ trigger:'.why-choose', start:'top 78%', toggleActions:'play none none none' }
    });

    document.querySelectorAll('.why-choose-row').forEach((row)=>{
      const media = row.querySelector('.why-choose-media');
      const img = row.querySelector('.why-choose-media img');
      const copyBits = row.querySelectorAll('.why-choose-copy > *');
      const fromLeft = !row.classList.contains('why-choose-row--reverse');
      const slideX = fromLeft ? -56 : 56;

      const tl = gsap.timeline({
        scrollTrigger:{
          trigger: row,
          start:'top 85%',
          toggleActions:'play none none none'
        }
      });

      tl.fromTo(media,
        { opacity:0, x: slideX },
        { opacity:1, x:0, duration:0.95, ease:'power3.out' },
        0
      ).fromTo(img,
        { scale:1.08 },
        { scale:1, duration:1.15, ease:'power3.out' },
        0
      ).fromTo(copyBits,
        { opacity:0, y:28 },
        { opacity:1, y:0, duration:0.7, stagger:0.12, ease:'power3.out', clearProps:'opacity,transform' },
        0.18
      );
    });
  }

  // Product Features (Why page) — floating image + stagger cards
  if(document.querySelector('.why-product-features')){
    const floatWrap = document.querySelector('#why-features-float');
    if(floatWrap){
      gsap.to(floatWrap, {
        y:-10,
        duration:2.6,
        ease:'sine.inOut',
        yoyo:true,
        repeat:-1
      });
    }

    gsap.fromTo('.why-product-features-content > :not(.why-feature-cards)',
      { opacity:0, y:28 },
      {
        opacity:1,
        y:0,
        duration:0.8,
        stagger:0.12,
        ease:'power3.out',
        clearProps:'opacity,transform',
        scrollTrigger:{
          trigger:'.why-product-features-content',
          start:'top 82%',
          toggleActions:'play none none none'
        }
      }
    );

    gsap.fromTo('.why-feature-card',
      { opacity:0, y:32 },
      {
        opacity:1,
        y:0,
        duration:0.75,
        stagger:0.1,
        ease:'power3.out',
        clearProps:'opacity,transform',
        scrollTrigger:{
          trigger:'.why-feature-cards',
          start:'top 88%',
          toggleActions:'play none none none'
        }
      }
    );
  }

  // Product Benefits cards (Why page)
  if(document.querySelector('.why-benefit-cards')){
    gsap.from('.why-benefit-card', {
      opacity:0,
      y:40,
      duration:0.85,
      stagger:0.14,
      ease:'power3.out',
      scrollTrigger:{
        trigger:'.why-benefit-cards',
        start:'top 85%',
        toggleActions:'play none none none'
      }
    });
  }

  // Home Product Benefits image cards
  if(document.querySelector('.home-benefits-grid')){
    const benefitCards = gsap.utils.toArray('.home-benefits-grid .home-benefit-card');

    gsap.fromTo('.home-benefits-head > *',
      { opacity:0, y:24 },
      {
        opacity:1,
        y:0,
        duration:0.75,
        stagger:0.1,
        ease:'power3.out',
        scrollTrigger:{ trigger:'.home-benefits', start:'top 80%', toggleActions:'play none none none' }
      }
    );

    gsap.fromTo(benefitCards,
      { opacity:0, y:44, scale:0.9 },
      {
        opacity:1,
        y:0,
        scale:1,
        duration:0.85,
        stagger:0.14,
        ease:'power3.out',
        clearProps:'transform',
        scrollTrigger:{
          trigger:'.home-benefits-grid',
          start:'top 85%',
          toggleActions:'play none none none'
        }
      }
    );

    gsap.fromTo('.home-benefits-cta .home-benefits-btn',
      { opacity:0, y:18 },
      {
        opacity:1,
        y:0,
        duration:0.65,
        stagger:0.1,
        ease:'power3.out',
        scrollTrigger:{ trigger:'.home-benefits-cta', start:'top 92%', toggleActions:'play none none none' }
      }
    );
  }

  // Home Pricing
  if(document.querySelector('.home-pricing')){
    const pricing = document.querySelector('.home-pricing');
    const pricingMedia = document.getElementById('home-pricing-parallax');
    const pricingBits = gsap.utils.toArray(
      '.home-pricing-label, .home-pricing-heading, .home-pricing-sub, .home-pricing-price, .home-pricing-btn'
    );

    gsap.set(pricingBits, { opacity:0, y:32 });
    gsap.to(pricingBits, {
      opacity:1,
      y:0,
      duration:0.75,
      stagger:0.09,
      ease:'power3.out',
      scrollTrigger:{ trigger:pricing, start:'top 80%' }
    });

    if(pricingMedia && window.matchMedia('(pointer:fine)').matches){
      pricing.addEventListener('pointermove', (e) => {
        const rect = pricing.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 24;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 16;
        gsap.to(pricingMedia, {
          x,
          y,
          duration:1,
          ease:'power2.out',
          overwrite:true
        });
      });
    }
  }

  // Home FAQ entrance + ambient motion
  if(document.querySelector('.home-faq')){
    gsap.set('.home-faq-heading', { opacity:0, y:32 });
    gsap.set('.home-faq-label', { opacity:0, y:12 });
    gsap.set('.home-faq-lede', { opacity:0 });
    gsap.set('.home-faq-actions', { opacity:0, y:12 });
    gsap.set('.home-faq-list .faq-item', { opacity:0, y:18 });
    gsap.set('.home-faq-scene', { opacity:0 });

    const faqTl = gsap.timeline({
      defaults:{ ease:'power3.out' },
      scrollTrigger:{ trigger:'.home-faq', start:'top 78%' }
    });
    faqTl
      .to('.home-faq-scene', { opacity:1, duration:0.9 })
      .to('.home-faq-label', { opacity:1, y:0, duration:0.5 }, '-=0.55')
      .to('.home-faq-heading', { opacity:1, y:0, duration:0.75 }, '-=0.25')
      .to('.home-faq-lede', { opacity:1, duration:0.6 }, '-=0.4')
      .to('.home-faq-actions', { opacity:1, y:0, duration:0.55 }, '-=0.35')
      .to('.home-faq-list .faq-item', {
        opacity:1, y:0, duration:0.55, stagger:0.07, ease:'power3.out'
      }, '-=0.4');
  }

  // Our Story — heading only (card stages are scrub-driven)
  // Our Story chrome (scenes are scrub-driven)
  if(document.querySelector('.our-story-chrome')){
    gsap.from('.our-story-chrome', {
      opacity:0, y:14, duration:0.65, ease:'power2.out',
      scrollTrigger:{ trigger:'.our-story', start:'top 85%' }
    });
  }

  // About page: after Our Story, keep the intro image static on mobile (no entrance)
  if(
    document.querySelector('.about-story-intro .story-media')
    && window.matchMedia('(max-width:767px)').matches
  ){
    const storyMedia = document.querySelectorAll(
      '.about-story-intro .story-media, .about-story-intro .story-media img'
    );
    gsap.set(storyMedia, { clearProps:'all' });
    gsap.set(storyMedia, { opacity:1, x:0, y:0, scale:1 });
  }

  // Generic fade-up reveals (skip ones already handled inside a stagger group)
  gsap.utils.toArray('.reveal').forEach((el) => {
    if(el.closest('[data-stagger]')) return;
    if(
      el.closest('.home-product-story, .do-meter-showcase') &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;
    gsap.set(el, { opacity:0, y:36 });
    gsap.to(el, {
      opacity:1,
      y:0,
      duration:0.9,
      ease:'power3.out',
      scrollTrigger:{
        trigger: el,
        start:'top 88%',
        toggleActions:'play none none none'
      }
    });
  });

  // Staggered groups
  document.querySelectorAll('[data-stagger]').forEach(group=>{
    const items = group.querySelectorAll('.reveal');
    gsap.set(items, { opacity:0, y:36 });
    gsap.to(items, {
      opacity:1, y:0, duration:0.8, stagger:0.12, ease:'power3.out',
      scrollTrigger:{ trigger: group, start:'top 85%' }
    });
  });

  // Image reveal (clip-path)
  gsap.utils.toArray('.img-reveal').forEach(el=>{
    gsap.fromTo(el, { clipPath:'inset(0 0 100% 0)' }, {
      clipPath:'inset(0 0 0% 0)',
      duration:1.1, ease:'power4.out',
      scrollTrigger:{ trigger: el, start:'top 85%' }
    });
  });
}

/* ---------------- MOBILE STICKY BUY BAR ---------------- */
function initMobileStickyBuy(){
  const bar = document.querySelector('.mobile-sticky-buy');
  if(!bar) return;

  const mq = window.matchMedia('(max-width:768px)');

  const sync = () => {
    if(mq.matches){
      bar.classList.add('is-visible');
      document.body.classList.add('mobile-sticky-buy-visible');
    } else {
      bar.classList.remove('is-visible');
      document.body.classList.remove('mobile-sticky-buy-visible');
    }
  };

  /* Show immediately on mobile — no scroll-past-hero gate */
  requestAnimationFrame(sync);
  if(typeof mq.addEventListener === 'function'){
    mq.addEventListener('change', sync);
  } else if(typeof mq.addListener === 'function'){
    mq.addListener(sync);
  }
}
