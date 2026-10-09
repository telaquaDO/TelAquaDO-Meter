/**
 * Compare locale JSON key sets. Run: node scripts/check-i18n-keys.js
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'locales');
const LANGS = ['en', 'hi', 'te', 'bn'];

const load = lang => {
  const raw = fs.readFileSync(path.join(DIR, `${lang}.json`), 'utf8');
  return JSON.parse(raw);
};

const files = Object.fromEntries(LANGS.map(l => [l, load(l)]));
const allKeys = new Set();
LANGS.forEach(l => Object.keys(files[l]).forEach(k => allKeys.add(k)));

let failed = false;
const sorted = [...allKeys].sort();

for (const lang of LANGS) {
  const missing = sorted.filter(k => !(k in files[lang]));
  const empty = sorted.filter(k => k in files[lang] && String(files[lang][k]).trim() === '');
  if (missing.length || empty.length) {
    failed = true;
    console.error(`\n[${lang}] issues:`);
    if (missing.length) {
      console.error(`  missing (${missing.length}):`);
      missing.forEach(k => console.error(`    - ${k}`));
    }
    if (empty.length) {
      console.error(`  empty (${empty.length}):`);
      empty.forEach(k => console.error(`    - ${k}`));
    }
  } else {
    console.log(`[${lang}] ok — ${Object.keys(files[lang]).length} keys`);
  }
}

const base = Object.keys(files.en).length;
for (const lang of LANGS) {
  if (lang === 'en') continue;
  const extra = Object.keys(files[lang]).filter(k => !(k in files.en));
  if (extra.length) {
    failed = true;
    console.error(`\n[${lang}] keys not in en.json (${extra.length}):`);
    extra.forEach(k => console.error(`  - ${k}`));
  }
}

console.log(`\nTotal unique keys: ${sorted.length} (en has ${base})`);
process.exit(failed ? 1 : 0);
