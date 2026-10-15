/* home-apple.js — small motion for index.html (Apple-style)
   - headline copy fades up as each tile enters view
   - DO "live" display cycles example readings while visible */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!('IntersectionObserver' in window) || reduce) return;
  document.documentElement.classList.add('ah-js');

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, {threshold:0.12});
  document.querySelectorAll('.ah-hero,.ah-tile').forEach(function(t){ io.observe(t); });

  document.querySelectorAll('.ah-lcd__value[data-cycle]').forEach(function(el){
    var vals = el.getAttribute('data-cycle').split(','), i = 0, timer = null;
    var bar = el.parentNode.querySelector('.ah-lcd__bar i');
    function tick(){
      i = (i + 1) % vals.length;
      el.classList.add('is-swap');
      setTimeout(function(){
        el.textContent = vals[i];
        if(bar) bar.style.width = Math.max(20, Math.min(100, parseFloat(vals[i]) * 10)) + '%';
        el.classList.remove('is-swap');
      }, 250);
    }
    new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting && !timer) timer = setInterval(tick, 2200);
        else if(!e.isIntersecting && timer){ clearInterval(timer); timer = null; }
      });
    }).observe(el);
  });
})();
