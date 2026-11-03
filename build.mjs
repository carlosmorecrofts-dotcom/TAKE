// Builds TAKE Canggu into site/: the café page (/) and the scooter page (/ride)
// from one source page, each with its own title, canonical, preview and
// structured data; the staff app; the catalogue for the browser
// (site/assets/js/data.js) and for the API (functions/api/_menu.js).
// Run: node build.mjs
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
  street: 'Perum Prapta Canggu Asri Blok D No.1, Jl. Krisnantara 1, off Jl. Pantai Berawa',
  locality: 'Tibubeneng, Canggu', region: 'Bali', country: 'ID',
  address: 'Perum Prapta Canggu Asri Blok D No.1, Jl. Krisnantara 1, off Jl. Pantai Berawa, Tibubeneng, Canggu, Bali',
  hours: 'Open every day, 7am to 8pm',
  instagram: '',
  email: '',
};
// The two Google Maps places (ids from the place link, 2026-11-03).
const PLACES = {
  eat: { name: 'Take Coffee Canggu', lat: -8.6481201, lng: 115.1481354, cid: '11705024513808798293' },
  ride: { name: 'TAKE SCOOTER RENTAL', lat: -8.6481268, lng: 115.1481513, cid: '2267207769960955668' },
};
const mapsUrl = (p) => `https://maps.google.com/?cid=${p.cid}`;

// One source page, two pages out. Everything that differs lives here.
const VARIANTS = {
  eat: {
    file: 'index.html', path: '/',
    title: 'TAKE Coffee Canggu | Cafe & Restaurant in Berawa, Bali',
    description: 'TAKE Coffee & Eatery on Jl. Pantai Berawa, Canggu: coffee, nasi goreng from Rp 15K, mie goreng, pizza, burgers and fresh juice. Eat in, pick up or order delivery. Open every day, 7am to 8pm.',
    image: '/assets/img/og-eat.jpg', hero: '/assets/img/shop-front.jpg',
  },
  ride: {
    file: 'ride.html', path: '/ride',
    title: 'Scooter Rental Canggu from Rp 85K a day | TAKE Scooter Rental Berawa',
    description: 'Rent a Scoopy, Beat, Vario, NMAX, PCX, ADV or XMAX in Berawa, Canggu, from Rp 85K a day. Drivers for the airport, Ubud, Uluwatu and Mount Batur sunrise treks. Book online, confirm on WhatsApp.',
    image: '/assets/img/og-ride.jpg', hero: '/assets/img/shop-side.jpg',
  },
};

const add = (what) => `<span class="add">[ADD: ${what}]</span>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalogue.json'), 'utf8'));
const k = (n) => (n == null ? null : (n / 1000) + 'K');
const priced = cat.bikes.filter((b) => b.day);
const minDay = Math.min(...priced.map((b) => b.day));
const minFood = Math.min(...cat.menu.filter((i) => i.price).map((i) => i.price));
const maxFood = Math.max(...cat.menu.filter((i) => i.price).map((i) => i.price));
const cc = cat.bikes.map((b) => b.cc);

// Reviews: paste real Google reviews here, word for word. Never invent one.
const REVIEWS = [];
const reviewsHtml = REVIEWS.length
  ? REVIEWS.map((r) => `<figure class="card review"><div class="stars" aria-label="${r.stars} out of 5">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div><blockquote>${r.text}</blockquote><figcaption>${r.name}<small>${r.when} on Google</small></figcaption></figure>`).join('')
  : `<div class="card review">${add('6 real Google reviews: name, stars, text, date. Pasted word for word, never written by us.')}</div>`;

// FAQ: only facts we have. Shown on the page and given to Google as FAQPage.
const FAQ = [
  ['Where is TAKE in Canggu?', `In Perum Prapta Canggu Asri, Blok D No.1, on Jl. Krisnantara 1, a quiet lane off Jalan Pantai Berawa in Tibubeneng. TAKE Coffee and TAKE Scooter Rental share the white house with the two signs.`],
  ['What are the opening hours?', 'Every day from 7am to 8pm, for the kitchen and the rental desk.'],
  ['Do you deliver food?', `Yes. Order on this page and choose delivery, or WhatsApp the kitchen on 0821 9133 7592.`],
  ['How much is a scooter a day?', `From Rp ${k(minDay)} a day: ${priced.map((b) => `${b.name} ${k(b.day)}`).join(', ')}.`],
  ['How do I book a scooter?', 'Choose a model and your dates on the scooter page and send the request. We confirm the bike and the price on WhatsApp, then you pick it up at the shop.'],
  ['Do you have drivers and tours?', `Yes: ${cat.trips.map((t) => t.name).join(', ')}. Send a request with the date and pick-up place.`],
];
const faqHtml = FAQ.map(([q, a]) => `<details class="card faq"><summary><h3>${esc(q)}</h3></summary><p>${esc(a)}</p></details>`).join('');

// Menu and scooters written into the HTML, so search engines see them without
// running JavaScript. main.js redraws the same cards with the + buttons.
const menuStatic = cat.menu.map((i) => `<div class="card dish"><div><span class="label">${esc(i.cat)}</span><h3>${esc(i.name)}</h3><span class="price">${i.price ? k(i.price) : 'Price at the counter'}</span></div></div>`).join('');
const fleetStatic = cat.bikes.map((b) => `<div class="card bike"><span class="label">${b.cc}cc · ${b.kind}</span><h3>${esc(b.name)}</h3><div class="rates"><div><b>${b.day ? k(b.day) : '?'}</b>day</div><div><b>${b.week ? k(b.week) : '?'}</b>week</div><div><b>${b.month ? k(b.month) : '?'}</b>month</div></div></div>`).join('');

const TOKENS = {
  '{{WA_EAT}}': CONFIG.waEat,
  '{{WA_RIDE}}': CONFIG.waRide,
  '{{ADDRESS}}': CONFIG.address,
  '{{HOURS}}': CONFIG.hours,
  '{{MAPS}}': mapsUrl(PLACES.eat),
  '{{MAPS_RIDE}}': mapsUrl(PLACES.ride),
  '{{RIDE_PHONES}}': CONFIG.ridePhones.map((p) => `<a href="https://wa.me/62${p.replace(/\D/g, '').slice(1)}" target="_blank" rel="noopener">${p}</a>`).join(' · '),
  '{{MAP_EMBED}}': `https://www.openstreetmap.org/export/embed.html?bbox=${PLACES.eat.lng - 0.006},${PLACES.eat.lat - 0.004},${PLACES.eat.lng + 0.006},${PLACES.eat.lat + 0.004}&layer=mapnik&marker=${PLACES.eat.lat},${PLACES.eat.lng}`,
  '{{REVIEWS}}': reviewsHtml,
  '{{FAQ}}': faqHtml,
  '{{MENU_STATIC}}': menuStatic,
  '{{FLEET_STATIC}}': fleetStatic,
  '{{BIKE_COUNT}}': String(cat.bikes.length),
  '{{BIKE_CC}}': `${Math.min(...cc)}cc to ${Math.max(...cc)}cc`,
  '{{TRIPS}}': cat.trips.map((t) => `<li>${t.name}<em>${t.price ? 'from ' + k(t.price) : add('price')}</em></li>`).join(''),
  '{{TRIP_OPTIONS}}': cat.trips.map((t) => `<option value="${t.name}">${t.name}</option>`).join(''),
  '{{ADD_DELIVERY}}': add('delivery area and fee'),
  '{{ADD_DEPOSIT}}': add('deposit and documents needed (passport? licence?)'),
  '{{ADD_PAY}}': add('payment: cash, QRIS, transfer, card?'),
  '{{ADD_STORY}}': add('owner name and a line about how TAKE started'),
};
const fill = (s) => Object.entries(TOKENS).reduce((t, [a, b]) => t.split(a).join(b), s);

// structured data: the two businesses Google already lists, linked to their places
function structured(v) {
  const address = { '@type': 'PostalAddress', streetAddress: CONFIG.street, addressLocality: CONFIG.locality, addressRegion: CONFIG.region, addressCountry: CONFIG.country };
  const hours = { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '07:00', closes: '20:00' };
  const idr = (n) => ({ '@type': 'Offer', price: n, priceCurrency: 'IDR' });
  const cafe = {
    '@type': 'CafeOrCoffeeShop', '@id': CONFIG.site + '/#cafe', name: 'TAKE Coffee & Eatery', alternateName: PLACES.eat.name,
    url: CONFIG.site + '/', image: [CONFIG.site + '/assets/img/shop-front.jpg', CONFIG.site + '/assets/img/og-eat.jpg'],
    telephone: '+' + CONFIG.waEat, address, geo: { '@type': 'GeoCoordinates', latitude: PLACES.eat.lat, longitude: PLACES.eat.lng },
    hasMap: mapsUrl(PLACES.eat), openingHoursSpecification: hours, servesCuisine: ['Indonesian', 'Western', 'Coffee'],
    priceRange: `Rp ${k(minFood)} to Rp ${k(maxFood)}`, currenciesAccepted: 'IDR',
    hasMenu: {
      '@type': 'Menu', name: 'TAKE Coffee & Eatery menu',
      hasMenuSection: [...new Set(cat.menu.map((i) => i.cat))].map((c) => ({
        '@type': 'MenuSection', name: c,
        hasMenuItem: cat.menu.filter((i) => i.cat === c).map((i) => Object.assign({ '@type': 'MenuItem', name: i.name }, i.price ? { offers: idr(i.price) } : {})),
      })),
    },
  };
  const rental = {
    '@type': 'AutoRental', '@id': CONFIG.site + '/ride#rental', name: 'TAKE Scooter Rental', alternateName: PLACES.ride.name,
    url: CONFIG.site + '/ride', image: [CONFIG.site + '/assets/img/shop-side.jpg', CONFIG.site + '/assets/img/og-ride.jpg'],
    telephone: CONFIG.ridePhones.map((p) => '+62' + p.replace(/\D/g, '').slice(1)), address,
    geo: { '@type': 'GeoCoordinates', latitude: PLACES.ride.lat, longitude: PLACES.ride.lng },
    hasMap: mapsUrl(PLACES.ride), openingHoursSpecification: hours, priceRange: `Rp ${k(minDay)} a day and up`, currenciesAccepted: 'IDR',
    makesOffer: priced.map((b) => ({ '@type': 'Offer', name: b.name + ' scooter rental', priceCurrency: 'IDR',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: b.day, priceCurrency: 'IDR', unitCode: 'DAY', unitText: 'per day' },
      itemOffered: { '@type': 'Product', name: b.name, description: `${b.cc}cc ${b.kind.toLowerCase()} scooter` } })),
  };
  const page = { '@type': 'WebPage', '@id': CONFIG.site + VARIANTS[v].path, url: CONFIG.site + VARIANTS[v].path, name: VARIANTS[v].title,
    description: VARIANTS[v].description, about: { '@id': (v === 'eat' ? cafe : rental)['@id'] }, inLanguage: 'en' };
  const faq = { '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return { '@context': 'https://schema.org', '@graph': v === 'eat' ? [page, cafe, rental, faq] : [page, rental, cafe, faq] };
}

const ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.9 3 3 6.6 3 11.1c0 2.5 1.2 4.7 3.2 6.2L5.5 21l3.9-2.1c.8.2 1.7.3 2.6.3 5.1 0 9-3.6 9-8.1S17.1 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

function staffLayout(meta, body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title><meta name="robots" content="noindex, nofollow">
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
}

// The other variant's headline is kept for the instant switch, but as plain
// text: each page has exactly one <h1>, its own.
function oneH1(html, v) {
  const other = v === 'eat' ? 'only-ride' : 'only-eat';
  return html.replace(new RegExp(`(<section class="hero ${other}">[\\s\\S]*?)<h1>([\\s\\S]*?)</h1>`), '$1<p class="h1">$2</p>');
}

function layout(v, body) {
  const V = VARIANTS[v], url = CONFIG.site + V.path, P = PLACES[v];
  return `<!doctype html>
<html lang="en" data-v="${v}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${V.title}</title>
<meta name="description" content="${esc(V.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${CONFIG.name}">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(V.title)}">
<meta property="og:description" content="${esc(V.description)}">
<meta property="og:image" content="${CONFIG.site}${V.image}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="geo.region" content="ID-BA"><meta name="geo.placename" content="Canggu, Bali"><meta name="geo.position" content="${P.lat};${P.lng}"><meta name="ICBM" content="${P.lat}, ${P.lng}">
<meta name="theme-color" content="#0c0a0a">
<link rel="icon" href="/assets/img/icon.svg">
<link rel="preload" as="image" href="${V.hero}" fetchpriority="high">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Great+Vibes&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/fx.css">
<link rel="stylesheet" href="/assets/css/app.css">
<script type="application/ld+json">${JSON.stringify(structured(v)).replace(/</g, '\\u003c')}</script>
</head>
<body class="page-${v}">
<header class="nav">
  <a class="logo" href="/"><img src="/assets/img/icon.svg" alt="TAKE Canggu logo" width="52" height="52"><span>TAKE <b>Canggu</b></span></a>
  <nav class="vswitch" aria-label="Coffee or scooters">
    <a data-to="eat" data-title="${esc(VARIANTS.eat.title)}" href="/"${v === 'eat' ? ' aria-current="page"' : ''}>Coffee &amp; Eatery</a>
    <a data-to="ride" data-title="${esc(VARIANTS.ride.title)}" href="/ride"${v === 'ride' ? ' aria-current="page"' : ''}>Scooters &amp; Transport</a>
  </nav>
  <nav id="menu" aria-label="On this page">
    <a class="only-eat" href="#menu-list">Menu</a><a class="only-eat" href="#order">Order</a>
    <a class="only-ride" href="#fleet">Scooters</a><a class="only-ride" href="#transport">Transport</a><a class="only-ride" href="#book">Book</a>
    <a href="#reviews">Reviews</a><a href="#faq">Questions</a><a href="#find">Find us</a>
  </nav>
  <button class="burger" aria-label="Open menu" aria-controls="menu" aria-expanded="false"><span></span><span></span><span></span></button>
</header>
<main>
${oneH1(fill(body), v)}
</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div>
      <a class="logo" href="/"><img src="/assets/img/icon.svg" alt="" width="52" height="52"><span>TAKE <b>Canggu</b></span></a>
      <p class="mute">Coffee, food, scooters and drivers from one small house in Berawa, Canggu. ${CONFIG.hours}.</p>
      <p class="mute" style="font-size:14px">${CONFIG.address}</p>
    </div>
    <div><h4>Eat</h4><a href="/#menu-list">Menu</a><a href="/#order">Order food</a><a href="https://wa.me/${CONFIG.waEat}" target="_blank" rel="noopener">Delivery WhatsApp</a><a href="${mapsUrl(PLACES.eat)}" target="_blank" rel="noopener">Take Coffee on Google Maps</a></div>
    <div><h4>Ride</h4><a href="/ride#fleet">Scooter rental Canggu</a><a href="/ride#transport">Drivers &amp; tours</a><a href="https://wa.me/${CONFIG.waRide}" target="_blank" rel="noopener">Rental WhatsApp</a><a href="${mapsUrl(PLACES.ride)}" target="_blank" rel="noopener">TAKE Scooter Rental on Google Maps</a></div>
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
const read = (f) => {
  const raw = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const m = raw.match(/^<!--meta\s+(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error(`${f}: first line must be <!--meta {...} -->`);
  return { meta: { ...JSON.parse(m[1]), slug: f.replace(/\.html$/, '') }, body: raw.slice(m[0].length) };
};
const home = read('index.html');
for (const v of Object.keys(VARIANTS)) fs.writeFileSync(path.join(outDir, VARIANTS[v].file), layout(v, home.body));
const staff = read('staff.html');
fs.writeFileSync(path.join(outDir, 'staff.html'), staffLayout(staff.meta, staff.body));

// catalogue for browser and server
const pub = { menu: cat.menu, bikes: cat.bikes, trips: cat.trips, wa: { eat: CONFIG.waEat, ride: CONFIG.waRide } };
fs.writeFileSync(path.join(outDir, 'assets', 'js', 'data.js'), `// generated by build.mjs from data/catalogue.json\nwindow.TAKE = ${JSON.stringify(pub)};\n`);
const menuMap = Object.fromEntries(cat.menu.map((i) => [i.id, { name: i.name, price: i.price }]));
fs.writeFileSync(path.join(ROOT, 'functions', 'api', '_menu.js'), `// generated by build.mjs from data/catalogue.json\nexport const MENU = ${JSON.stringify(menuMap, null, 1)};\n`);

// routing + SEO. /ride is served by ride.html (Pages drops .html); old links keep working.
fs.writeFileSync(path.join(outDir, '_redirects'), '/eat / 301\n/scooter /ride 301\n/scooters /ride 301\n/rental /ride 301\n');
fs.writeFileSync(path.join(outDir, '_headers'), '/staff\n  X-Robots-Tag: noindex, nofollow\n/api/*\n  X-Robots-Tag: noindex\n/assets/*\n  Cache-Control: public, max-age=604800\n');
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>${CONFIG.site}/</loc><lastmod>${today}</lastmod><image:image><image:loc>${CONFIG.site}/assets/img/shop-front.jpg</image:loc></image:image></url>
  <url><loc>${CONFIG.site}/ride</loc><lastmod>${today}</lastmod><image:image><image:loc>${CONFIG.site}/assets/img/shop-side.jpg</image:loc></image:image></url>
</urlset>
`);
fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nDisallow: /staff\nDisallow: /api/\nSitemap: ${CONFIG.site}/sitemap.xml\n`);

const unpriced = [...cat.menu, ...cat.bikes.map((b) => ({ ...b, price: b.day })), ...cat.trips].filter((i) => i.price == null).length;
console.log(`built /, /ride and /staff; ${unpriced} items still without a price; ${REVIEWS.length} reviews`);
