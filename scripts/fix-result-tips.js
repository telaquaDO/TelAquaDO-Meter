#!/usr/bin/env node
const fs = require('fs');
const p = 'css/our-story.css';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  /\[data-story-scene="result"\] \.our-story-anchor\[data-i="0"\]\{\s*left:46% !important;\s*top:70% !important;\s*\}\s*\[data-story-scene="result"\] \.our-story-anchor\[data-i="1"\]\{\s*left:44% !important;\s*top:76% !important;\s*\}/,
  `[data-story-scene="result"] .our-story-anchor[data-i="0"]{
    left:49% !important;
    top:64% !important;
  }
  [data-story-scene="result"] .our-story-anchor[data-i="1"]{
    left:48% !important;
    top:74% !important;
  }`
);

s = s.replaceAll(
  '[data-story-scene="result"] .our-story-anchor[data-i="0"]{ left:46% !important; top:74% !important; }',
  '[data-story-scene="result"] .our-story-anchor[data-i="0"]{ left:49% !important; top:64% !important; }'
);
s = s.replaceAll(
  '[data-story-scene="result"] .our-story-anchor[data-i="1"]{ left:44% !important; top:80% !important; }',
  '[data-story-scene="result"] .our-story-anchor[data-i="1"]{ left:48% !important; top:74% !important; }'
);

fs.writeFileSync(p, s);
console.log('synced tip coords');
