/* Tel-Aqua Our Story: four-scene, reversible pinned narrative. */
(function(){
  const tt = (key, fallback) => {
    const value = window.TelAquaI18n?.t?.(key);
    if(value && value !== key) return value;
    return fallback != null ? fallback : null;
  };

  const sceneDefs = [
    {
      id:'trusted',
      keys:{
        label:'story.scene1.label', before:'story.scene1.before', accent:'story.scene1.accent',
        highlight:'story.scene1.highlight', watermark:'story.scene1.watermark',
        statement:'story.scene1.statement', description:'story.scene1.description',
        facts:['story.scene1.fact1','story.scene1.fact2','story.scene1.fact3'],
        callouts:[
          ['story.scene1.callout1','story.scene1.callout1Desc'],
          ['story.scene1.callout2','story.scene1.callout2Desc'],
          ['story.scene1.callout3','story.scene1.callout3Desc'],
          ['story.scene1.callout4','story.scene1.callout4Desc']
        ]
      },
      label:'OUR STORY',
      before:'Welcome to Your <span class="our-story-title-highlight"><span style="text-transform:none">pH</span> Meter</span>',
      accent:'Lab',
      image:'assets/images/our-story/story-trusted-full.png', width:1024, height:682,
      mobileImage:'assets/images/our-story/story-mobile-trusted.png?v=3',
      alt:'Tel-Aqua pH meter floating against a soft grey background',
      statement:'Accurate readings.<br>Anywhere. Anytime.<br>Trust every result.',
      description:'Lab-grade confidence in your pocket, wherever the water takes you.',
      facts:['0.01 pH accuracy','Easy calibration','Reliable results'],
      anchors:[[49.2,29.1],[48.2,51.9],[52.8,36.7],[52.2,64.5]],
      paths:[
        'M492 186 L455 82 H345',
        'M482 332 L450 363 H345',
        'M528 235 L560 82 H655',
        'M522 413 L560 495 H655'
      ],
      callouts:[
        ['tl','assets/images/our-story/icons/accurate-ph-reading.png','Accurate pH Reading','0.01 pH resolution with ±0.2 pH accuracy'],
        ['bl','assets/images/our-story/icons/easy-calibration.png','Easy Calibration','One-touch auto calibration for quick setup'],
        ['tr','assets/images/our-story/icons/portable-design.png','Portable Design','Lightweight &amp; pocket-friendly for on-the-go testing'],
        ['br','assets/images/our-story/icons/reliable-results.png','Reliable Results','Fast response with high accuracy']
      ]
    },
    {
      id:'challenge',
      keys:{
        label:'story.scene2.label', prefix:'story.scene2.prefix', before:'story.scene2.before', accent:'story.scene2.accent',
        watermark:'story.scene2.watermark',
        statement:'story.scene2.statement', description:'story.scene2.description',
        facts:['story.scene2.fact1','story.scene2.fact2','story.scene2.fact3'],
        callouts:[
          ['story.scene2.callout1','story.scene2.callout1Desc'],
          ['story.scene2.callout2','story.scene2.callout2Desc'],
          ['story.scene2.callout3','story.scene2.callout3Desc']
        ]
      },
      label:'THE CHALLENGE', prefix:'<span style="text-transform:none">pH</span> Meter', before:'Know Every', accent:'Drop',
      image:'assets/images/our-story/story-challenge.png?v=3', width:1024, height:646,
      mobileImage:'assets/images/our-story/story-mobile-challenge-card.png?v=2',
      alt:'A hand dipping the Tel-Aqua meter into a glass of water',
      statement:'Real insights.<br>Every test.<br>Challenge every drop.',
      description:'Water changes fast. Tel-Aqua turns uncertainty into a clear, immediate reading.',
      facts:['Temperature compensated','Data hold function','Long battery life'],
      /* Desktop: temp left edge · hold mid-left · battery on right body */
      anchors:[[55.6,26],[55.2,43.3],[57.2,24]],
      paths:[
        'M556 166 H355',
        'M552 277 H355',
        'M572 154 H740'
      ],
      callouts:[
        ['tl','assets/images/our-story/icons/temperature-comp.png','Built-in Temperature Compensation','Ensures accurate readings in any environment'],
        ['bl','assets/images/our-story/icons/data-hold.png','Data Hold Function','Locks the reading on screen for easy viewing and recording'],
        ['tr','assets/images/our-story/icons/battery-life.png','Long Battery Life','Up to 100 hours of continuous use for reliable testing']
      ]
    },
    {
      id:'solution',
      keys:{
        label:'story.scene3.label', prefix:'story.scene3.prefix', before:'story.scene3.before', accent:'story.scene3.accent',
        watermark:'story.scene3.watermark',
        statement:'story.scene3.statement', description:'story.scene3.description',
        facts:['story.scene3.fact1','story.scene3.fact2','story.scene3.fact3'],
        callouts:[
          ['story.scene3.callout1','story.scene3.callout1Desc'],
          ['story.scene3.callout2','story.scene3.callout2Desc'],
          ['story.scene3.callout3','story.scene3.callout3Desc']
        ]
      },
      label:'OUR SOLUTION', prefix:'Professional Precision.', before:'Clarity in', accent:'Seconds',
      image:'assets/images/our-story/story-solution.png?v=2', width:1024, height:633,
      mobileImage:'assets/images/our-story/story-mobile-solution-meter-water.png?v=1',
      alt:'Tel-Aqua meter dipping into water with SOLUTION watermark',
      statement:'Dip. Read. Act.<br>Simple by design.<br>Clarity in seconds.',
      description:'One compact tool delivers the insight you need to protect aquatic life.',
      facts:['Instant display','One-touch use','Built for aquaculture'],
      /* Desktop tips on meter: LCD left edge · buttons right edge · probe tip */
      anchors:[[54.6,33],[57.4,40],[55.8,57]],
      paths:[
        'M546 211 L420 145 H320',
        'M574 256 L580 145 H720',
        'M558 365 L560 420 H720'
      ],
      callouts:[
        ['tl','assets/images/icons/solution/instant-reading.png','Instant Digital Reading','Clear pH on screen in seconds'],
        ['tr','assets/images/icons/solution/one-touch.png','One-Touch Operation','Simple controls for fast, confident testing'],
        ['br','assets/images/icons/solution/aquatic-life.png','Made for Aquatic Life','Built to protect shrimp, fish, and pond health']
      ]
    },
    {
      id:'result',
      keys:{
        label:'story.scene4.label', prefix:'story.scene4.prefix', before:'story.scene4.before', accent:'story.scene4.accent',
        watermark:'story.scene4.watermark',
        statement:'story.scene4.statement', description:'story.scene4.description',
        facts:['story.scene4.fact1','story.scene4.fact2','story.scene4.fact3'],
        callouts:[
          ['story.scene4.callout1','story.scene4.callout1Desc'],
          ['story.scene4.callout2','story.scene4.callout2Desc']
        ]
      },
      label:'THE RESULT', prefix:'Tel-Aqua <span style="text-transform:none">pH</span> Meter', before:'Confidence That', accent:'Grows',
      image:'assets/images/our-story/story-results.png?v=2', width:1024, height:634,
      mobileImage:'assets/images/our-story/story-mobile-result-photo.png?v=1',
      alt:'Fish farmer holding a Tel-Aqua meter and giving a thumbs-up beside a pond',
      statement:'Healthier water.<br>Stronger harvests.<br>Confidence that grows.',
      description:'Better water decisions create healthier ponds, stronger harvests, and peace of mind.',
      facts:['Trusted decisions','Healthier water','Stronger harvests'],
      /* Desktop % tips (unchanged art). Mobile tip % overridden in CSS for new photo. */
      anchors:[[47,57],[44.5,62]],
      paths:[
        'M470 365 L400 200 H320',
        'M445 397 L445 300 H320'
      ],
      callouts:[
        ['tl','assets/images/icons/result/healthier-water.png','Healthier Water','Stable conditions that support stronger aquatic life'],
        ['bl','assets/images/icons/result/decisions-trust.png','Decisions You Can Trust','Accurate readings that guide every farm action']
      ]
    }
  ];

  /* Exactly four unique story cards — no dummies / no duplicate ids */
  const STORY_SCENE_ORDER = ['trusted', 'challenge', 'solution', 'result'];

  const localizeScenes = () => {
    const localized = sceneDefs.map(def => {
      const k = def.keys;
      const beforeKey = tt(k.before, null);
      const highlight = tt(k.highlight, '<span style="text-transform:none">pH</span> Meter');
      let before = def.before;
      if(beforeKey){
        before = def.id === 'trusted'
          ? `${beforeKey} <span class="our-story-title-highlight">${highlight}</span>`
          : beforeKey;
      }
      const watermarkFallback = def.id === 'trusted' ? 'TRUSTED' : def.id.toUpperCase();
      return {
        ...def,
        label: tt(k.label, def.label),
        prefix: k.prefix ? tt(k.prefix, def.prefix) : def.prefix,
        before,
        accent: tt(k.accent, def.accent),
        watermark: tt(k.watermark, watermarkFallback),
        statement: tt(k.statement, def.statement),
        description: tt(k.description, def.description),
        facts: def.facts.map((f, i) => tt(k.facts[i], f)),
        callouts: def.callouts.map((c, i) => {
          let titleKey = k.callouts[i][0];
          let titleFallback = c[2];
          /* Challenge mobile only: shorter Accurate pH Range label */
          if(
            def.id === 'challenge'
            && i === 0
            && typeof window !== 'undefined'
            && window.matchMedia('(max-width:767px)').matches
          ){
            titleKey = 'story.scene2.callout1Mobile';
            titleFallback = 'Accurate pH Range 0–14';
          }
          return [
            c[0],
            c[1],
            tt(titleKey, titleFallback),
            tt(k.callouts[i][1], c[3])
          ];
        })
      };
    });

    const byId = new Map();
    localized.forEach(scene => {
      if(!byId.has(scene.id)) byId.set(scene.id, scene);
    });
    return STORY_SCENE_ORDER.map(id => byId.get(id)).filter(Boolean);
  };

  let scenes = localizeScenes();

  const isMobileStory = () => window.matchMedia('(max-width:767px)').matches;

  const sceneTitleMarkup = scene => {
    const prefix = scene.prefix
      ? `<span class="our-story-title-highlight">${scene.prefix}</span>&nbsp;`
      : '';
    return `${prefix}${scene.before}&nbsp;<span class="our-story-title-plain">${scene.accent}</span>`;
  };

  const sceneImageSrc = scene => {
    if(isMobileStory() && scene.mobileImage) return scene.mobileImage;
    return scene.image;
  };

  const sceneMarkup = (scene, index) => `
    <article class="our-story-scene" data-story-scene="${scene.id}" aria-hidden="${index ? 'true' : 'false'}">
      <div class="our-story-photo">
        <img src="${sceneImageSrc(scene)}" alt="${scene.alt}" width="${scene.width}" height="${scene.height}" data-desktop-src="${scene.image}" data-mobile-src="${scene.mobileImage || scene.image}" ${index ? 'loading="lazy"' : ''} decoding="async">
      </div>
      <svg class="our-story-connectors" viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">
        ${scene.paths.map((path, i) => `<path data-story-line data-i="${i}" pathLength="1" d="${path}"></path>`).join('')}
      </svg>
      ${scene.anchors.map((p, i) => `<span class="our-story-anchor" data-story-anchor data-i="${i}" style="--ax:${p[0]}%;--ay:${p[1]}%"></span>`).join('')}
      <div class="our-story-callouts" aria-label="${scene.label.toLowerCase()} highlights">
        ${scene.callouts.map((c, i) => `
          <div class="our-story-callout our-story-callout--${c[0]}" data-story-callout data-i="${i}">
            <span class="our-story-mobile-stem" data-story-mobile-stem aria-hidden="true"></span>
            <div class="our-story-callout-frame">
              <span class="our-story-callout-icon" aria-hidden="true"><img src="${c[1]}" alt="" width="40" height="40" decoding="async"></span>
              <span class="our-story-callout-copy"><strong>${c[2]}</strong>${c[3] ? `<small>${c[3]}</small>` : ''}</span>
            </div>
          </div>`).join('')}
      </div>
      <p class="our-story-statement">${scene.statement}<span class="our-story-statement-rule" aria-hidden="true"></span></p>
      <div class="our-story-mobile-copy" data-watermark="${scene.watermark || (scene.id === 'trusted' ? 'TRUSTED' : scene.id.toUpperCase())}">
        <span class="our-story-mobile-kicker">${scene.label}</span>
        <p>${scene.description}</p>
        <ul>${scene.facts.map(f => `<li>${f}</li>`).join('')}</ul>
      </div>
    </article>`;

  window.initOurStoryV2 = function(){
    const section = document.querySelector('.our-story');
    if(!section) return;
    if(section.dataset.storyReady === 'true') return;
    section.dataset.storyReady = 'true';

    scenes = localizeScenes();

    section.innerHTML = `
      <div class="our-story-pin">
        <header class="our-story-chrome">
          <span class="our-story-eyebrow">${scenes[0].label}</span>
          <h2 id="our-story-heading" class="our-story-title">${sceneTitleMarkup(scenes[0])}</h2>
        </header>
        <div class="our-story-stage">
          <div class="our-story-shell">${scenes.map(sceneMarkup).join('')}</div>
        </div>
        <div class="our-story-progress" aria-hidden="true">
          ${scenes.map((_, i) => `<span class="our-story-progress-mark${i === 0 ? ' is-active' : ''}" data-mark="${i}"></span>`).join('')}
        </div>
      </div>`;

    const pin = section.querySelector('.our-story-pin');
    const shell = section.querySelector('.our-story-shell');
    const progress = section.querySelector('.our-story-progress');

    /* Mobile: strip any duplicate / extra scene nodes so only 4 unique cards remain */
    if(isMobileStory() && shell){
      const seen = new Set();
      [...shell.querySelectorAll('[data-story-scene]')].forEach(el => {
        const id = el.getAttribute('data-story-scene');
        const allowed = STORY_SCENE_ORDER.includes(id);
        if(!allowed || seen.has(id)){
          el.remove();
          return;
        }
        seen.add(id);
      });
      if(progress){
        progress.innerHTML = STORY_SCENE_ORDER
          .slice(0, Math.min(4, scenes.length))
          .map((_, i) => `<span class="our-story-progress-mark${i === 0 ? ' is-active' : ''}" data-mark="${i}"></span>`)
          .join('');
      }
    }

    const sceneEls = [...section.querySelectorAll('[data-story-scene]')];
    const marks = [...section.querySelectorAll('.our-story-progress-mark')];
    const eyebrow = section.querySelector('.our-story-eyebrow');
    const titleEl = section.querySelector('.our-story-title');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let activeIndex = -1;
    let fitConnectorsToCallouts = () => {};

    const refreshLocalizedCopy = () => {
      scenes = localizeScenes();
      sceneEls.forEach((el, index) => {
        const scene = scenes[index];
        if(!scene) return;
        const statement = el.querySelector('.our-story-statement');
        if(statement){
          const rule = statement.querySelector('.our-story-statement-rule');
          statement.innerHTML = `${scene.statement}<span class="our-story-statement-rule" aria-hidden="true"></span>`;
          if(rule && !statement.querySelector('.our-story-statement-rule')) statement.appendChild(rule);
        }
        const kicker = el.querySelector('.our-story-mobile-kicker');
        if(kicker) kicker.textContent = scene.label;
        const mobileCopy = el.querySelector('.our-story-mobile-copy');
        if(mobileCopy && scene.watermark) mobileCopy.setAttribute('data-watermark', scene.watermark);
        const desc = el.querySelector('.our-story-mobile-copy > p');
        if(desc) desc.textContent = scene.description;
        const facts = el.querySelectorAll('.our-story-mobile-copy li');
        facts.forEach((li, i) => { if(scene.facts[i]) li.textContent = scene.facts[i]; });
        el.querySelectorAll('[data-story-callout]').forEach((callout, i) => {
          const c = scene.callouts[i];
          if(!c) return;
          const strong = callout.querySelector('strong');
          const small = callout.querySelector('small');
          if(strong) strong.textContent = c[2];
          if(small) small.innerHTML = c[3];
        });
      });
      if(activeIndex >= 0){
        const scene = scenes[activeIndex];
        if(eyebrow) eyebrow.textContent = scene.label;
        if(titleEl) titleEl.innerHTML = sceneTitleMarkup(scene);
      }
      requestAnimationFrame(() => fitConnectorsToCallouts());
    };

    document.addEventListener('telaqua:i18n-applied', refreshLocalizedCopy);

    /* Swap Challenge callout1 label when crossing mobile/desktop */
    let lastStoryPhone = isMobileStory();
    const onStoryViewport = () => {
      const next = isMobileStory();
      if(next === lastStoryPhone) return;
      lastStoryPhone = next;
      refreshLocalizedCopy();
    };
    window.addEventListener('resize', onStoryViewport, { passive:true });
    if(window.matchMedia){
      window.matchMedia('(max-width:767px)').addEventListener('change', onStoryViewport);
    }

    const setChrome = (index) => {
      if(index === activeIndex) return;
      activeIndex = index;
      marks.forEach((mark, i) => mark.classList.toggle('is-active', i === index));
      sceneEls.forEach((el, i) => el.setAttribute('aria-hidden', String(i !== index)));
      const scene = scenes[index];
      if(pin) pin.dataset.activeScene = scene.id;
      if(eyebrow) eyebrow.textContent = scene.label;
      if(titleEl){
        titleEl.innerHTML = sceneTitleMarkup(scene);
      }
      requestAnimationFrame(() => fitConnectorsToCallouts());
    };

    if(typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || reduced){
      sceneEls.forEach((el, i) => el.style.display = i ? 'none' : 'block');
      setChrome(0);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    const parts = sceneEls.map(scene => ({
      scene,
      photo:scene.querySelector('.our-story-photo'),
      callouts:[...scene.querySelectorAll('[data-story-callout]')],
      lines:[...scene.querySelectorAll('[data-story-line]')],
      anchors:[...scene.querySelectorAll('[data-story-anchor]')],
      statement:scene.querySelector('.our-story-statement'),
      rule:scene.querySelector('.our-story-statement-rule'),
      mobileCopy:scene.querySelector('.our-story-mobile-copy'),
      mobileStems:[...scene.querySelectorAll('[data-story-mobile-stem]')]
    }));

    /* Snap pointer tips to the meter-facing outer edge of each callout bracket. */
    fitConnectorsToCallouts = () => {
      parts.forEach(part => {
        const sceneId = part.scene.getAttribute('data-story-scene');
        if(sceneId !== 'trusted' && sceneId !== 'challenge' && sceneId !== 'solution' && sceneId !== 'result') return;
        const svg = part.scene.querySelector('.our-story-connectors');
        if(!svg || !part.lines.length) return;

        const sceneVis = part.scene.style.visibility;
        const sceneOp = part.scene.style.opacity;
        const calloutStyles = part.callouts.map(el => ({
          el,
          visibility:el.style.visibility,
          opacity:el.style.opacity,
          transform:el.style.transform
        }));

        /* visibility:hidden collapses rects — measure with opacity 0 instead */
        part.scene.style.visibility = 'visible';
        part.scene.style.opacity = '0';
        part.callouts.forEach(el => {
          el.style.visibility = 'visible';
          el.style.opacity = '0';
          el.style.transform = 'none';
        });

        const svgRect = svg.getBoundingClientRect();
        if(svgRect.width < 2 || svgRect.height < 2){
          part.scene.style.visibility = sceneVis;
          part.scene.style.opacity = sceneOp;
          calloutStyles.forEach(s => {
            s.el.style.visibility = s.visibility;
            s.el.style.opacity = s.opacity;
            s.el.style.transform = s.transform;
          });
          return;
        }

        const sx = 1000 / svgRect.width;
        const sy = 640 / svgRect.height;

        part.callouts.forEach((callout, i) => {
          const frame = callout.querySelector('.our-story-callout-frame');
          const line = part.lines[i];
          const anchor = part.anchors[i];
          if(!frame || !line || !anchor) return;

          /* Skip mobile-hidden callouts (e.g. Challenge battery) */
          const cs = window.getComputedStyle(callout);
          if(cs.display === 'none' || cs.visibility === 'hidden'){
            line.style.opacity = '0';
            return;
          }
          line.style.opacity = '';

          const fr = frame.getBoundingClientRect();
          const ar = anchor.getBoundingClientRect();
          if(fr.width < 2 || ar.width < 1) return;

          const isRight = (() => {
            /* Mobile Solution: “Made for Aquatic Life” sits on the left (below Instant Reading) */
            if(
              sceneId === 'solution'
              && i === 2
              && window.matchMedia('(max-width:767px)').matches
            ){
              return false;
            }
            return callout.classList.contains('our-story-callout--tr')
              || callout.classList.contains('our-story-callout--br')
              || (sceneId === 'trusted' && i >= 2);
          })();
          const ax = (ar.left + ar.width / 2 - svgRect.left) * sx;
          const ay = (ar.top + ar.height / 2 - svgRect.top) * sy;
          const midY = (fr.top + fr.height / 2 - svgRect.top) * sy;
          /* Outer bracket edge facing the product; tiny gap so round linecap does not enter */
          const edgeX = isRight
            ? (fr.left - svgRect.left) * sx - 1.5
            : (fr.right - svgRect.left) * sx + 1.5;

          /* Challenge desktop only: straight horizontal; tip Y locked to callout.
             Mobile Challenge keeps tips on the product image (CSS left/top). */
          const challengeStraight = sceneId === 'challenge'
            && window.matchMedia('(min-width:768px)').matches;
          const mobileStraight = window.matchMedia('(max-width:767px)').matches;

          if(challengeStraight){
            const sceneRect = part.scene.getBoundingClientRect();
            const topPct = ((fr.top + fr.height / 2 - sceneRect.top) / sceneRect.height) * 100;
            anchor.style.setProperty('top', `${topPct.toFixed(2)}%`, 'important');
            const tipAr = anchor.getBoundingClientRect();
            const tipX = (tipAr.left + tipAr.width / 2 - svgRect.left) * sx;
            line.setAttribute(
              'd',
              `M${tipX.toFixed(1)} ${midY.toFixed(1)} H${edgeX.toFixed(1)}`
            );
            return;
          }

          if(mobileStraight){
            anchor.style.removeProperty('top');
            /*
             * Result mobile: 90° elbows only (no diagonals).
             * Tip → horizontal at tip Y (under the face, across tank) →
             * vertical in the left gutter → short horizontal into the label.
             * Other mobile scenes keep a single straight segment.
             */
            if(sceneId === 'result'){
              /*
               * Pure L-elbow (mobile Result only):
               * tip → vertical → horizontal into the label.
               * Callout 2 ("Decisions…"): butt caps so no stub past the elbow.
               */
              line.setAttribute(
                'd',
                `M${ax.toFixed(1)} ${ay.toFixed(1)} V${midY.toFixed(1)} H${edgeX.toFixed(1)}`
              );
              if(i === 1){
                line.setAttribute('stroke-linecap', 'butt');
                line.setAttribute('stroke-linejoin', 'miter');
              } else {
                line.removeAttribute('stroke-linecap');
                line.removeAttribute('stroke-linejoin');
              }
              return;
            }
            /* Tip stays on device; one straight segment to the callout */
            line.setAttribute(
              'd',
              `M${ax.toFixed(1)} ${ay.toFixed(1)} L${edgeX.toFixed(1)} ${midY.toFixed(1)}`
            );
            return;
          }

          anchor.style.removeProperty('top');
          const bendX = ax + (edgeX - ax) * 0.42;
          line.setAttribute(
            'd',
            `M${ax.toFixed(1)} ${ay.toFixed(1)} L${bendX.toFixed(1)} ${midY.toFixed(1)} H${edgeX.toFixed(1)}`
          );
        });

        part.scene.style.visibility = sceneVis;
        part.scene.style.opacity = sceneOp;
        calloutStyles.forEach(s => {
          s.el.style.visibility = s.visibility;
          s.el.style.opacity = s.opacity;
          s.el.style.transform = s.transform;
        });
      });
    };

    const prepare = () => {
      activeIndex = -1;
      parts.forEach((part, i) => {
        gsap.set(part.scene, {autoAlpha:i === 0 ? 1 : 0});
        gsap.set(part.photo, {autoAlpha:0, scale:1.015});
        gsap.set(part.callouts, {autoAlpha:0, y:10});
        gsap.set(part.anchors, {autoAlpha:0, scale:0.35});
        part.lines.forEach(line => {
          line.style.strokeDasharray = '1';
          line.style.strokeDashoffset = '1';
        });
        gsap.set(part.statement, {autoAlpha:0, y:10});
        gsap.set(part.rule, {scaleX:0, transformOrigin:'left center'});
        gsap.set(part.mobileCopy, {autoAlpha:0, y:10});
        gsap.set(part.mobileStems, {scaleX:0, transformOrigin:'left center'});
      });
      fitConnectorsToCallouts();
      setChrome(0);
    };

    const calloutIsShown = (el) => {
      if(!el) return false;
      try {
        /* Only skip CSS display:none (e.g. mobile-hidden Challenge battery).
           Do NOT treat GSAP autoAlpha visibility:hidden from prepare() as hidden,
           or Solution/Result desktop callouts never get reveal tweens. */
        return window.getComputedStyle(el).display !== 'none';
      } catch(e){
        return true;
      }
    };

    const addDesktopReveal = (tl, part, label, slotStart) => {
      /* Pack callouts into the scene slot so each card owns equal scroll.
         Skip CSS-hidden callouts (e.g. Challenge battery on mobile). */
      const step = 0.14;
      let shown = 0;
      part.callouts.forEach((callout, i) => {
        if(!calloutIsShown(callout)) return;
        const t = slotStart + 0.08 + shown * step;
        const isRight = callout.classList.contains('our-story-callout--tr') || callout.classList.contains('our-story-callout--br');
        if(part.anchors[i]){
          tl.to(part.anchors[i], {autoAlpha:1, scale:1, duration:.05, ease:'power2.out'}, t);
        }
        if(part.lines[i]){
          tl.to(part.lines[i], {strokeDashoffset:0, duration:.1, ease:'power2.out'}, t + 0.02);
        }
        tl.fromTo(callout, {autoAlpha:0, x:isRight ? 12 : -12, y:7}, {autoAlpha:1, x:0, y:0, duration:.1, ease:'power2.out'}, t + 0.05);
        shown += 1;
      });
      const after = slotStart + 0.08 + shown * step;
      if(part.statement){
        tl.to(part.statement, {autoAlpha:1, y:0, duration:.12, ease:'power2.out'}, after);
      }
      if(part.rule){
        tl.to(part.rule, {scaleX:1, duration:.1, ease:'power2.out'}, after + 0.03);
      }
    };

    const buildTimeline = (mobile) => {
      prepare();
      const sceneCount = parts.length;
      const steps = Math.max(1, sceneCount - 1);

      /*
       * Mobile holds after each switch (Trusted→Challenge→Solution→Result).
       * Second card (Challenge) uses a shorter hold so less scroll is needed.
       * Desktop keeps equal 1vh steps.
       */
      const holds = mobile ? [0.38, 0.72, 0.72] : [1, 1, 1];
      const totalHold = holds.reduce((sum, n) => sum + n, 0);
      const snapPoints = [0];
      {
        let acc = 0;
        holds.forEach(h => {
          acc += h / totalHold;
          snapPoints.push(Math.min(1, acc));
        });
      }
      const nearestSnap = value => {
        let best = snapPoints[0];
        let bestDist = Math.abs(value - best);
        for(let i = 1; i < snapPoints.length; i++){
          const d = Math.abs(value - snapPoints[i]);
          if(d < bestDist){
            best = snapPoints[i];
            bestDist = d;
          }
        }
        return best;
      };
      const sceneFromProgress = progress => {
        let idx = 0;
        for(let i = 0; i < snapPoints.length; i++){
          if(progress + 0.001 >= snapPoints[i]) idx = i;
        }
        return Math.min(sceneCount - 1, idx);
      };

      /* First card fully pre-revealed (desktop pattern) on both breakpoints */
      const first = parts[0];
      gsap.set(first.photo, {autoAlpha:1, scale:1});
      gsap.set(first.callouts, {autoAlpha:1, x:0, y:0});
      gsap.set(first.anchors, {autoAlpha:1, scale:1});
      first.lines.forEach(line => { line.style.strokeDashoffset = '0'; });
      gsap.set(first.statement, {autoAlpha:1, y:0});
      gsap.set(first.rule, {scaleX:1, transformOrigin:'left center'});
      if(mobile){
        gsap.set(first.mobileCopy, {autoAlpha:1, y:0});
        parts.forEach(part => gsap.set(part.mobileStems, {autoAlpha:0, display:'none'}));
      }

      const tl = gsap.timeline({
        scrollTrigger:{
          id:mobile ? 'our-story-mobile' : 'our-story-desktop',
          trigger:section,
          start:'top top',
          end:() => `+=${Math.round(innerHeight * totalHold)}`,
          pin:pin,
          pinSpacing:true,
          scrub:mobile ? 0.22 : 0.35,
          snap:{
            snapTo:mobile ? nearestSnap : (1 / steps),
            duration:{min:0.08, max:mobile ? 0.22 : 0.3},
            ease:'power1.inOut'
          },
          anticipatePin:mobile ? 0 : 1,
          invalidateOnRefresh:true,
          toggleClass:{targets:section,className:'is-pinned'},
          onUpdate:self => setChrome(
            mobile
              ? sceneFromProgress(self.progress)
              : Math.min(sceneCount - 1, Math.round(self.progress * steps))
          )
        }
      });

      tl.to({}, {duration:mobile ? 0.06 : 0.15}, 0);

      let cursor = mobile ? 0.06 : 0;
      for(let index = 1; index < sceneCount; index++){
        const hold = holds[index - 1] || 1;
        const slot = mobile ? cursor : index;
        const previous = parts[index - 1];
        const part = parts[index];
        if(mobile){
          /* Hard cut on mobile — no crossfade ghost/duplicate cards */
          tl.set(previous.scene, {autoAlpha:0}, slot)
            .set(part.scene, {autoAlpha:1}, slot)
            .set(part.photo, {autoAlpha:1, scale:1}, slot)
            .set(part.mobileCopy, {autoAlpha:1, y:0}, slot)
            .set(part.callouts, {autoAlpha:1, x:0, y:0}, slot)
            .set(part.anchors, {autoAlpha:1, scale:1}, slot)
            .set(part.statement, {autoAlpha:1, y:0}, slot)
            .set(part.rule, {scaleX:1, transformOrigin:'left center'}, slot);
          part.lines.forEach(line => {
            tl.set(line, {strokeDashoffset:0}, slot);
          });
          tl.call(() => fitConnectorsToCallouts(), null, slot + 0.02);
        } else {
          tl.to(previous.scene, {autoAlpha:0, duration:0.2, ease:'power2.inOut'}, slot)
            .to(part.scene, {autoAlpha:1, duration:0.2, ease:'power2.inOut'}, slot)
            .to(part.photo, {autoAlpha:1, scale:1, duration:0.2, ease:'power2.out'}, slot);
          addDesktopReveal(tl, part, `scene-${index}`, slot);
        }
        tl.to({}, {duration:hold}, slot);
        if(mobile) cursor += hold;
      }
      return tl;
    };

    mm.add('(min-width: 768px)', () => {
      section.querySelectorAll('.our-story-photo img').forEach((img) => {
        const desktop = img.getAttribute('data-desktop-src');
        if(desktop) img.src = desktop;
      });
      const tl = buildTimeline(false);
      const onResize = () => fitConnectorsToCallouts();
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        tl.kill();
      };
    });
    mm.add('(max-width: 767px)', () => {
      section.querySelectorAll('.our-story-photo img').forEach((img) => {
        const mobile = img.getAttribute('data-mobile-src');
        if(mobile) img.src = mobile;
      });
      const tl = buildTimeline(true);
      const onResize = () => fitConnectorsToCallouts();
      window.addEventListener('resize', onResize);
      requestAnimationFrame(() => fitConnectorsToCallouts());
      return () => {
        window.removeEventListener('resize', onResize);
        tl.kill();
      };
    });

    requestAnimationFrame(() => {
      fitConnectorsToCallouts();
      if(window.TelaquaSmoothScroll?.refresh) window.TelaquaSmoothScroll.refresh();
      else ScrollTrigger.refresh();
    });
  };

  /* Wait for i18n so first paint uses the saved language when available. */
  const bootStory = () => window.initOurStoryV2();
  if(window.TelAquaI18n?.ready){
    window.TelAquaI18n.ready().then(bootStory).catch(bootStory);
  } else {
    bootStory();
  }
})();
