// Builds TAKE Canggu: wraps pages/*.html in the shared layout into site/, and
// writes the catalogue for the browser (site/assets/js/data.js) and for the
// API (functions/api/_menu.js) from data/catalogue.json. Run: node build.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');

// What the owner still has to give us lives here. Empty = [ADD: ...] on the site.
const CONFIG = {
  name: 'TAKE Canggu',
  site: 'https://take-canggu.pages.dev',
  waEat: '6282191337592',          // delivery number on the eatery banner
  waRide: '6282145954191',         // first number on the rental banner
  ridePhones: ['0821 4595 4191', '0822 4016 0894', '0821 9133 7592'],
  address: 'Perum Prapta Canggu Asri Blok D No.1, Jl. Pantai Berawa, Jl. Krisnantara 1, Tibubeneng, Canggu, Bali',
  hours: 'Open every day, 7am to 8pm',
  mapsUrl: 'https://maps.app.goo.gl/UQP7AF6G6jvM2buS7',
  lat: -8.6481201, lng: 115.1481354,
  instagram: '',
  email: '',
};

const add = (what) => `<span class="add">[ADD: ${what}]</span>`;
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalogue.json'), 'utf8'));
const k = (n) => (n == null ? null : (n / 1000) + 'K');

// Reviews: paste real Google reviews here, word for word. Never invent one.
const REVIEWS = [];
const reviewsHtml = REVIEWS.length
  ? REVIEWS.map((r) => `<figure class="card review"><div class="stars" aria-label="${r.stars} out of 5">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div><blockquote>${r.text}</blockquote><figcaption>${r.name}<small>${r.when} on Google</small></figcaption></figure>`).join('')
  : `<div class="card review">${add('6 real Google reviews: name, stars, text, date. Pasted word for word, never written by us.')}</div>`;

const TOKENS = {
  '{{WA_EAT}}': CONFIG.waEat,
  '{{WA_RIDE}}': CONFIG.waRide,
  '{{ADDRESS}}': CONFIG.address,
  '{{HOURS}}': CONFIG.hours,
  '{{MAPS}}': CONFIG.mapsUrl,
  '{{RIDE_PHONES}}': CONFIG.ridePhones.map((p) => `<a href="https://wa.me/62${p.replace(/\D/g, '').slice(1)}" target="_blank" rel="noopener">${p}</a>`).join(' · '),
  '{{MAP_EMBED}}': `https://www.openstreetmap.org/export/embed.html?bbox=${CONFIG.lng - 0.006},${CONFIG.lat - 0.004},${CONFIG.lng + 0.006},${CONFIG.lat + 0.004}&layer=mapnik&marker=${CONFIG.lat},${CONFIG.lng}`,
  '{{REVIEWS}}': reviewsHtml,
  '{{TRIPS}}': cat.trips.map((t) => `<li>${t.name}<em>${t.price ? 'from ' + k(t.price) : add('price')}</em></li>`).join(''),
  '{{TRIP_OPTIONS}}': cat.trips.map((t) => `<option value="${t.name}">${t.name}</option>`).join(''),
  '{{ADD_DELIVERY}}': add('delivery area and fee'),
  '{{ADD_DEPOSIT}}': add('deposit and documents needed (passport? licence?)'),
  '{{ADD_PAY}}': add('payment: cash, QRIS, transfer, card?'),
  '{{ADD_STORY}}': add('owner name and a line about how TAKE started'),
};
const fill = (s) => Object.entries(TOKENS).reduce((t, [a, b]) => t.split(a).join(b), s);

const ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.9 3 3 6.6 3 11.1c0 2.5 1.2 4.7 3.2 6.2L5.5 21l3.9-2.1c.8.2 1.7.3 2.6.3 5.1 0 9-3.6 9-8.1S17.1 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

function layout(meta, body) {
  if (meta.bare) return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title><meta name="robots" content="noindex">
<meta name="theme-color" content="#0c0a0a"><link rel="manifest" href="/staff.webmanifest"><link rel="icon" href="/assets/img/icon.svg">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<link rel="stylesheet" href="/assets/css/style.css"><link rel="stylesheet" href="/assets/css/app.css">
</head><body class="page-${meta.slug}">
${fill(body)}
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script src="/assets/js/data.js"></script><script src="/assets/js/staff.js"></script>
</body></html>
`;
  const ld = {
    '@context': 'https://schema.org', '@type': ['CafeOrCoffeeShop', 'LocalBusiness'], name: CONFIG.name,
    url: CONFIG.site, image: CONFIG.site + '/assets/img/shop-front.jpg', telephone: '+' + CONFIG.waEat,
    address: { '@type': 'PostalAddress', streetAddress: 'Perum Prapta Canggu Asri Blok D No.1, Jl. Pantai Berawa', addressLocality: 'Canggu', addressRegion: 'Bali', addressCountry: 'ID' },
    geo: { '@type': 'GeoCoordinates', latitude: CONFIG.lat, longitude: CONFIG.lng },
    openingHours: 'Mo-Su 07:00-20:00', servesCuisine: ['Indonesian', 'Western', 'Coffee'], hasMap: CONFIG.mapsUrl,
  };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<link rel="canonical" href="${CONFIG.site}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${CONFIG.name}">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:image" content="${CONFIG.site}/assets/img/shop-front.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0c0a0a">
<link rel="icon" href="/assets/img/icon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Great+Vibes&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/fx.css">
<link rel="stylesheet" href="/assets/css/app.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script>document.documentElement.dataset.v=/ride|bike|scooter/.test(location.pathname+location.search)?'ride':'eat';</script>
</head>
<body class="page-${meta.slug}">
<header class="nav">
  <a class="logo" href="/"><img src="/assets/img/icon.svg" alt="TAKE logo" width="52" height="52"><span>TAKE <b>Canggu</b></span></a>
  <div class="vswitch" role="tablist" aria-label="Choose">
    <button role="tab" data-to="eat">Coffee &amp; Eatery</button>
    <button role="tab" data-to="ride">Scooters &amp; Transport</button>
  </div>
  <nav id="menu" aria-label="Main">
    <a class="only-eat" href="#menu-list">Menu</a><a class="only-eat" href="#order">Order</a>
    <a class="only-ride" href="#fleet">Scooters</a><a class="only-ride" href="#transport">Transport</a><a class="only-ride" href="#book">Book</a>
    <a href="#reviews">Reviews</a><a href="#find">Find us</a>
  </nav>
  <button class="burger" aria-label="Open menu" aria-controls="menu" aria-expanded="false"><span></span><span></span><span></span></button>
</header>
<main>
${fill(body)}
</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div>
      <a class="logo" href="/"><img src="/assets/img/icon.svg" alt="" width="52" height="52"><span>TAKE <b>Canggu</b></span></a>
      <p class="mute">Coffee, food, scooters and drivers from one small house in Berawa. ${CONFIG.hours}.</p>
    </div>
    <div><h4>Eat</h4><a href="/eat#menu-list">Menu</a><a href="/eat#order">Order food</a><a href="https://wa.me/${CONFIG.waEat}" target="_blank" rel="noopener">Delivery WhatsApp</a></div>
    <div><h4>Ride</h4><a href="/ride#fleet">Scooter rental</a><a href="/ride#transport">Transport &amp; tours</a><a href="https://wa.me/${CONFIG.waRide}" target="_blank" rel="noopener">Rental WhatsApp</a></div>
  </div>
  <div class="wrap foot-base">
    <span>&copy; ${new Date().getFullYear()} TAKE Coffee &amp; Eatery, TAKE Scooter Rental</span>
    <span><a href="/staff" rel="nofollow">Staff</a> · Website by <a href="https://djinja-c.com" target="_blank" rel="noopener">Djinja-C</a></span>
  </div>
</footer>
<a class="wa-float only-eat" href="https://wa.me/${CONFIG.waEat}" target="_blank" rel="noopener">${ICON_WA}<span>WhatsApp the kitchen</span></a>
<a class="wa-float only-ride" href="https://wa.me/${CONFIG.waRide}" target="_blank" rel="noopener">${ICON_WA}<span>WhatsApp rentals</span></a>
<button class="cart-fab only-eat" id="cartFab" type="button" hidden>Order <b id="cartCount">0</b> · <span id="cartTotal"></span></button>
<script src="/assets/js/data.js"></script>
<script src="/assets/js/main.js"></script>
<script src="/assets/js/space.js"></script>
<script src="/assets/js/fx.js"></script>
</body>
</html>
`;
}

// pages
const pagesDir = path.join(ROOT, 'pages');
const outDir = path.join(ROOT, 'site');
for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const raw = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  const m = raw.match(/^<!--meta\s+(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error(`${file}: first line must be <!--meta {...} -->`);
  const meta = { ...JSON.parse(m[1]), slug: file.replace(/\.html$/, '') };
  fs.writeFileSync(path.join(outDir, file), layout(meta, raw.slice(m[0].length)));
}

// catalogue for browser and server
const pub = { menu: cat.menu, bikes: cat.bikes, trips: cat.trips, wa: { eat: CONFIG.waEat, ride: CONFIG.waRide } };
fs.writeFileSync(path.join(outDir, 'assets', 'js', 'data.js'), `// generated by build.mjs from data/catalogue.json\nwindow.TAKE = ${JSON.stringify(pub)};\n`);
const menuMap = Object.fromEntries(cat.menu.map((i) => [i.id, { name: i.name, price: i.price }]));
fs.writeFileSync(path.join(ROOT, 'functions', 'api', '_menu.js'), `// generated by build.mjs from data/catalogue.json\nexport const MENU = ${JSON.stringify(menuMap, null, 1)};\n`);

// routing + SEO
fs.writeFileSync(path.join(outDir, '_redirects'), '/eat / 200\n/ride / 200\n');
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${CONFIG.site}/</loc></url>\n  <url><loc>${CONFIG.site}/ride</loc></url>\n</urlset>\n`);
fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nDisallow: /staff\nDisallow: /api/\nSitemap: ${CONFIG.site}/sitemap.xml\n`);

const unpriced = [...cat.menu, ...cat.bikes.map((b) => ({ ...b, price: b.day })), ...cat.trips].filter((i) => i.price == null).length;
console.log(`built ${fs.readdirSync(pagesDir).length} pages; ${unpriced} items still without a price; ${REVIEWS.length} reviews`);
