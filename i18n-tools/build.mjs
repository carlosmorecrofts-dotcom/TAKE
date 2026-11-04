// Builds site/i18n/<code>.json, the words each language shows, from
//   i18n-tools/strings.tsv     number <tab> id <tab> English   (from extract.cmd)
//   i18n-tools/tr/<code>.tsv   number <tab> translation         ("=" means same as English)
//   i18n-tools/ui.json         the picker's own notices
// Every translation is checked with the language pack's own validate(), so the
// page, the build and the browser agree on ids and placeholders.
//
//   node i18n-tools/build.mjs          build, report gaps
//   node i18n-tools/build.mjs --gate   exit 1 if any language lacks any string
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SITE = path.join(HERE, '..', 'site');
const CORE = createRequire(import.meta.url)(path.join(SITE, 'i18n.js'));
const gate = process.argv.includes('--gate');
// Languages that must have every string before a build passes the gate.
// The ten languages TAKE visitors use most must be complete; the other
// fourteen show English where a line is not translated, with the pack's notice.
const MUST = new Set(['id', 'ru', 'zh', 'ko', 'ja', 'de', 'fr', 'es', 'pt', 'it']);

// Brand and proper names: the same in every language.
const SAME = new Set([3, 4, 40, 41, 47, 48, 73, 82, 97, 102, 111, 116, 125, 130, 135, 140, 176, 184, 188, 192, 228, 232, 235, 262, 277, 284, 287, 289, 291, 295, 299, 302, 306, 308, 311, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 371, 386, 387, 388, 389, 390, 391, 392, 410, 411, 412, 413, 414, 415, 452, 164, 168]);
// photo credits and file names stay as they are
const sameKey = (k) => /^Photo: /.test(k) || /.(jpg|png)$/.test(k);

const rows = fs.readFileSync(path.join(HERE, 'strings.tsv'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => {
  const [n, id, ...rest] = l.split('\t');
  return { n: +n, id, key: rest.join('\t') };
});
const ui = JSON.parse(fs.readFileSync(path.join(HERE, 'ui.json'), 'utf8'));
const codes = CORE.languages.map((l) => l.code).filter((c) => c !== 'en');
const outDir = path.join(SITE, 'i18n');
fs.mkdirSync(outDir, { recursive: true });

const problems = [];
const summary = [];
const all = crypto.createHash('sha1');
for (const code of codes) {
  // tr/<code>.tsv plus any later batches tr/<code>.<anything>.tsv
  const files = fs.readdirSync(path.join(HERE, 'tr')).filter((f) => f === code + '.tsv' || (f.startsWith(code + '.') && f.endsWith('.tsv')));
  const tr = new Map();
  for (const f of files) for (const line of fs.readFileSync(path.join(HERE, 'tr', f), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(\d+)\t(.*)$/);
    if (m) tr.set(+m[1], m[2].trim());
  }
  const dict = {};
  let missing = 0;
  for (const r of rows) {
    let t = SAME.has(r.n) || sameKey(r.key) ? '=' : tr.get(r.n);
    if (!t) { missing++; continue; }
    if (t === '=') t = r.key;
    const why = CORE.validate(r.key, t);
    if (why) { problems.push(`${code} #${r.n}: ${why}`); continue; }
    if (/[–—]/.test(t)) { problems.push(`${code} #${r.n}: long dash`); continue; }
    dict[r.id] = t;
  }
  // (lines for strings no page shows any more are simply ignored)
  Object.assign(dict, ui[code] || {});
  const json = JSON.stringify(dict);
  all.update(code + json);
  fs.writeFileSync(path.join(outDir, code + '.json'), json);
  summary.push(`${code} ${String(rows.length - missing).padStart(4)}/${rows.length}`);
  if (missing && MUST.has(code)) problems.push(`${code}: ${missing} string(s) not translated`);
}

// Cache-bust the language files whenever any of them changes.
const i18nJs = path.join(SITE, 'i18n.js');
const src = fs.readFileSync(i18nJs, 'utf8');
fs.writeFileSync(i18nJs, src.replace(/var BUILD = '[^']*';/, `var BUILD = '${all.digest('hex').slice(0, 10)}';`));

console.log(summary.join('   '));
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n  ` + problems.slice(0, 60).join('\n  '));
  if (gate) process.exit(1);
} else {
  const done = codes.filter((c) => summary.some((s) => s.startsWith(c + ' ') && s.endsWith(`${rows.length}/${rows.length}`)));
  console.log(`\ncomplete: ${done.join(' ')} (${done.length} of ${codes.length}); the rest show untranslated strings in English`);
}
