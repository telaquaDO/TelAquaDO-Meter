/**
 * Science You Can Trust — peek carousel
 * Autoplay + progress dots + pause, Noise-style transitions.
 */
(function () {
  'use strict';

  const AUTO_MS = 5200;
  const TRANS_MS = 560;

  function initScienceCarousel() {
    const root = document.querySelector('[data-science-carousel]');
    if (!root) return;

    const cards = Array.from(root.querySelectorAll('[data-science-card]'));
    const dotsWrap = root.querySelector('[data-science-dots]');
    const prevBtn = root.querySelector('[data-science-prev]');
    const nextBtn = root.querySelector('[data-science-next]');
    const pauseBtn = root.querySelector('[data-science-pause]');
    if (!cards.length || !dotsWrap) return;

    let index = 0;
    let paused = false;
    let progressTween = null;
    let transitioning = false;
    const reduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const useGsap = typeof gsap !== 'undefined';

    const dots = cards.map((_, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'science-carousel-dot' + (i === 0 ? ' is-active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      const bar = document.createElement('span');
      bar.className = 'science-carousel-dot-progress';
      bar.setAttribute('aria-hidden', 'true');
      btn.appendChild(bar);
      dotsWrap.appendChild(btn);
      btn.addEventListener('click', () => goTo(i, true));
      return btn;
    });

    function syncPauseUi() {
      if (!pauseBtn) return;
      const icon = pauseBtn.querySelector('i');
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pauseBtn.setAttribute('aria-label', paused ? 'Play autoplay' : 'Pause autoplay');
      if (icon) {
        icon.className = paused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
      }
    }

    function clearProgress() {
      if (progressTween) {
        if (useGsap) progressTween.kill();
        else clearInterval(progressTween);
        progressTween = null;
      }
      dots.forEach((dot) => {
        const bar = dot.querySelector('.science-carousel-dot-progress');
        if (bar) bar.style.width = '0%';
      });
    }

    function startProgress() {
      clearProgress();
      if (paused || reduced) return;
      const active = dots[index];
      const bar = active && active.querySelector('.science-carousel-dot-progress');
      if (!bar) return;

      if (useGsap) {
        progressTween = gsap.fromTo(
          bar,
          { width: '0%' },
          {
            width: '100%',
            duration: AUTO_MS / 1000,
            ease: 'none',
            onComplete: () => goTo(index + 1, false)
          }
        );
      } else {
        const start = performance.now();
        progressTween = setInterval(() => {
          const t = Math.min(1, (performance.now() - start) / AUTO_MS);
          bar.style.width = t * 100 + '%';
          if (t >= 1) {
            clearInterval(progressTween);
            progressTween = null;
            goTo(index + 1, false);
          }
        }, 32);
      }
    }

    function classForOffset(offset, total) {
      if (offset === 0) return 'is-center';
      if (offset === 1 || offset === 1 - total) return 'is-right';
      if (offset === -1 || offset === total - 1) return 'is-left';
      return 'is-far';
    }

    function applyClasses(active) {
      const total = cards.length;
      cards.forEach((card, i) => {
        let offset = i - active;
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;
        card.classList.remove('is-center', 'is-left', 'is-right', 'is-far');
        card.classList.add(classForOffset(offset, total));
        card.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
        card.tabIndex = offset === 0 ? -1 : 0;
      });
      dots.forEach((dot, i) => {
        const on = i === active;
        dot.classList.toggle('is-active', on);
        dot.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    function goTo(next, manual) {
      if (transitioning && !manual) return;
      const total = cards.length;
      const target = ((next % total) + total) % total;
      if (target === index && !manual) return;

      transitioning = true;
      index = target;
      applyClasses(index);

      window.setTimeout(() => {
        transitioning = false;
      }, reduced ? 0 : TRANS_MS);

      if (manual) paused = false;
      syncPauseUi();
      startProgress();
    }

    cards.forEach((card) => {
      const i = Number(card.getAttribute('data-science-card'));
      card.addEventListener('click', () => {
        if (Number.isNaN(i) || i === index) return;
        goTo(i, true);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (Number.isNaN(i) || i === index) return;
        e.preventDefault();
        goTo(i, true);
      });
    });

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1, true));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1, true));
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        paused = !paused;
        syncPauseUi();
        if (paused) clearProgress();
        else startProgress();
      });
    }

    /* Pause when section is off-screen */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          const visible = entries.some((e) => e.isIntersecting);
          if (!visible) {
            clearProgress();
          } else if (!paused) {
            startProgress();
          }
        },
        { threshold: 0.25 }
      );
      io.observe(root);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearProgress();
      else if (!paused) startProgress();
    });

    applyClasses(0);
    syncPauseUi();
    startProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScienceCarousel, { once: true });
  } else {
    initScienceCarousel();
  }
})();
