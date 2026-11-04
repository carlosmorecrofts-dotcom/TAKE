// Gathers every English unit the site shows, exactly as the browser sees it.
// Opens each page (served from site/ on 127.0.0.1) and the single-file preview
// in Electron, asks the language pack's own window.djinjaI18n.scan(), and writes
// i18n-tools/strings.tsv: number <tab> id <tab> English. Numbers are kept for
// strings already listed (append-only), so translations never shift.
//
// Run:  i18n-tools\extract.cmd   (uses the Electron in the Djinja app repo)
const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(__dirname, 'strings.tsv');
const PAGES = ['/', '/ride'];
const PREVIEW = '';
// Text a page's own script writes later, so no scan ever sees it.
// sentences the site's scripts write later (main, member, book, staff-free), gathered by script-strings.cjs
const EXTRA = fs.existsSync(path.join(__dirname, 'script-strings.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'script-strings.json'), 'utf8')) : [];

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      let f = path.join(SITE, p);
      if (!path.extname(f)) f += '.html';
      if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  const CORE = require(path.join(SITE, 'i18n.js'));
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const win = new BrowserWindow({ show: false, width: 1440, height: 900, webPreferences: { backgroundThrottling: false } });
  const found = new Map();
  const take = (list, where) => {
    for (const u of list) {
      if (!found.has(u.id)) found.set(u.id, { id: u.id, key: u.key, pages: new Set() });
      found.get(u.id).pages.add(where);
    }
  };
  const targets = PAGES.map((p) => [base + p, p]);
  if (fs.existsSync(PREVIEW)) targets.push(['file:///' + PREVIEW.replace(/\\/g, '/'), 'preview']);
  for (const [url, where] of targets) {
    await win.loadURL(url);
    await wait(700);
    // The phone menu holds the same links, so the desktop width sees everything.
    const list = await win.webContents.executeJavaScript('window.djinjaI18n ? window.djinjaI18n.scan() : []');
    take(list, where);
    // the chat's answers only appear when asked: take them from the chat itself
    const chat = await win.webContents.executeJavaScript('window.TAKE_CHAT_STRINGS ? window.TAKE_CHAT_STRINGS() : []');
    for (const s of chat) { const k = CORE.esc(CORE.norm(s)); take([{ id: CORE.hashId(k), key: k }], 'chat'); }
    console.log(where.padEnd(16), list.length, 'units');
  }
  for (const s of EXTRA) { const k = CORE.esc(CORE.norm(s)); take([{ id: CORE.hashId(k), key: k }], 'script'); }

  // keep the numbers of strings already listed
  const old = new Map();
  let next = 1;
  if (fs.existsSync(OUT)) for (const line of fs.readFileSync(OUT, 'utf8').split(/\r?\n/)) {
    const [n, id] = line.split('\t');
    if (n && id && /^\d+$/.test(n)) { old.set(id, +n); next = Math.max(next, +n + 1); }
  }
  const rows = [...found.values()].map((r) => ({ ...r, n: old.has(r.id) ? old.get(r.id) : 0 }));
  for (const r of rows) if (!r.n) r.n = next++;
  rows.sort((a, b) => a.n - b.n);
  fs.writeFileSync(OUT, rows.map((r) => `${r.n}\t${r.id}\t${r.key.replace(/\t|\r?\n/g, ' ')}`).join('\n') + '\n');
  console.log(`${rows.length} strings -> ${OUT}`);
  srv.close();
  app.quit();
}).catch((e) => { console.error(e); app.exit(1); });
