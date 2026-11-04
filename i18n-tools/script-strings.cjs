// Gathers the whole sentences the site's scripts write into the page later
// (notes, statuses, buttons), so the language files can translate them too.
// A sentence glued together with numbers is not caught; those stay English.
//   node i18n-tools/script-strings.cjs   -> i18n-tools/script-strings.json
const fs = require('fs'), path = require('path');
const JS = path.join(__dirname, '..', 'site', 'assets', 'js');
const out = new Set();
for (const f of ['main.js', 'member.js', 'book.js', 'chat.js']) {
  const src = fs.readFileSync(path.join(JS, f), 'utf8');
  const re = /'((?:[^'\\n]|\.)*)'/g; let m;
  while ((m = re.exec(src))) {
    const s = m[1].replace(/\'/g, "'");
    if (/[<>{}=\/#]|^\s|\s$|https?:|\.(js|json|jpg|png)$/.test(s)) continue;
    if (!/^[A-Z0-9"(]/.test(s) || s.split(' ').length < 2 || !/[a-z]/.test(s)) continue;
    out.add(s);
  }
}
fs.writeFileSync(path.join(__dirname, 'script-strings.json'), JSON.stringify([...out], null, 1));
console.log(out.size, 'script sentences');
