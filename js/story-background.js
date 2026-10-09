/**
 * Shows the Tel-Aqua circle watermark only while the Product & Benefits
 * scroll section (.product-story) occupies the viewport — not during
 * dismantle, water testing, or any later page sections.
 */
(function () {
  'use strict';

  function initStoryBackground() {
    const cinematic = document.querySelector('.product-cinematic');
    const story = document.querySelector('.product-story');
    if (!cinematic || !story) return;

    let visible = false;
    let frame = 0;

    function update() {
      frame = 0;

      const rect = story.getBoundingClientRect();
      const viewportHeight = Math.max(
        document.documentElement.clientHeight || 0,
        window.innerHeight || 0
      );
      /*
       * The graphic is physically scoped to the pinned canvas. This class is
       * an additional guard: do not reveal until the section itself enters.
       */
      const boundaryLine = viewportHeight;
      const shouldShow =
        rect.top <= boundaryLine &&
        rect.bottom >= 0;

      if (shouldShow === visible) return;
      visible = shouldShow;
      cinematic.classList.toggle('is-background-visible', visible);
    }

    function scheduleUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('pageshow', scheduleUpdate, { passive: true });
    scheduleUpdate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStoryBackground, { once: true });
  } else {
    initStoryBackground();
  }
})();
