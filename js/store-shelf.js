/* store-shelf.js — Apple Store–style "Get to know" shelves on products.html
   - prev/next arrows scroll one card at a time
   - cards fade/slide in when scrolled into view
   - video card loads + autoplays (muted) only when visible
   - "live reading" cards cycle through example values
   Everything degrades gracefully without JS (cards stay visible via .no-js fallback below). */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  if(hasIO && !reduce) document.documentElement.classList.add('sh-js');

  /* 1. arrows */
  document.querySelectorAll('[data-shelf]').forEach(function(shelf){
    var track = shelf.querySelector('[data-shelf-track]');  /* arrows may sit in the section heading */
    var prev = shelf.querySelector('[data-shelf-prev]');
    var next = shelf.querySelector('[data-shelf-next]');
    if(!track) return;
    function step(){ var c = track.querySelector('.sh-card'); return c ? c.getBoundingClientRect().width + 20 : 300; }
    function update(){
      var max = track.scrollWidth - track.clientWidth - 2;
      if(prev) prev.disabled = track.scrollLeft <= 2;
      if(next) next.disabled = track.scrollLeft >= max;
    }
    prev && prev.addEventListener('click', function(){ track.scrollBy({left:-step(), behavior: reduce ? 'auto' : 'smooth'}); });
    next && next.addEventListener('click', function(){ track.scrollBy({left: step(), behavior: reduce ? 'auto' : 'smooth'}); });
    track.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update);
    update();
  });

  var cards = document.querySelectorAll('.sh-card');
  if(!hasIO || reduce){ cards.forEach(function(c){ c.classList.add('is-in'); }); }

  /* 2. reveal (staggered) */
  if(hasIO && !reduce){
    var revealIO = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        var list = Array.prototype.slice.call(e.target.parentNode.children);
        var i = list.indexOf(e.target);
        setTimeout(function(){ e.target.classList.add('is-in'); }, Math.min(i, 4) * 90);
        revealIO.unobserve(e.target);
      });
    }, {threshold:0.15});
    cards.forEach(function(c){ revealIO.observe(c); });
  }

  /* 3. video: lazy-load + play while visible */
  document.querySelectorAll('.sh-card--video video[data-src]').forEach(function(v){
    var card = v.closest('.sh-card');
    function load(){ if(!v.src){ v.src = v.getAttribute('data-src'); } }
    function play(){ load(); var p = v.play(); if(p && p.then){ p.then(function(){ card.classList.add('is-playing'); }).catch(function(){}); } }
    function pause(){ v.pause(); card.classList.remove('is-playing'); }
    if(reduce){ return; } /* keep poster only */
    if(hasIO){
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){ e.isIntersecting && e.intersectionRatio > 0.5 ? play() : pause(); });
      }, {threshold:[0,0.5,1]}).observe(v);
    } else { play(); }
  });

  /* 4. live reading cycles */
  document.querySelectorAll('.sh-lcd__value[data-cycle]').forEach(function(el){
    var vals = el.getAttribute('data-cycle').split(',');
    var bar = el.parentNode.querySelector('.sh-lcd__bar i');
    var i = 0, timer = null;
    function tick(){
      i = (i + 1) % vals.length;
      el.classList.add('is-swap');
      setTimeout(function(){
        el.textContent = vals[i];
        if(bar){ bar.style.width = Math.max(20, Math.min(100, parseFloat(vals[i]) / 10 * 100)) + '%'; }
        el.classList.remove('is-swap');
      }, 250);
    }
    if(reduce) return;
    if(hasIO){
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting && !timer){ timer = setInterval(tick, 2200); }
          else if(!e.isIntersecting && timer){ clearInterval(timer); timer = null; }
        });
      }).observe(el);
    } else { timer = setInterval(tick, 2200); }
  });
})();
