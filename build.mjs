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
  payLive: false,                 // true once the Xendit keys are set on the Pages project
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
    description: 'TAKE Coffee & Eatery on Jl. Pantai Berawa, Canggu: coffee, nasi goreng and mi goreng from Rp 20K, pizza, pasta, breakfasts, coffee and fresh juice. Eat in, pick up or order delivery. Open every day, 7am to 8pm.',
    image: '/assets/img/og-eat.jpg', hero: '/assets/img/shop-front.jpg',
  },
  ride: {
    file: 'ride.html', path: '/ride',
    title: 'Scooter Rental Canggu from Rp 85K a day | TAKE Scooter Rental Berawa',
    description: 'Rent a Scoopy, Beat, Vario, NMAX, PCX, ADV or XMAX in Berawa, Canggu, from Rp 85K a day. Drivers for the airport, Ubud, Uluwatu and Mount Batur sunrise treks. Book online, confirm on WhatsApp.',
    image: '/assets/img/og-ride.jpg', hero: '/assets/img/shop-side.jpg',
  },
  terms: {
    file: 'terms.html', path: '/terms', look: 'ride', place: 'ride',
    title: 'Scooter rental terms | TAKE Scooter Rental Canggu',
    description: 'Rental terms for TAKE Scooter Rental in Berawa, Canggu: who can rent, licence and documents, payment in advance, pick-up and return, damage, accidents and cancellations.',
    image: '/assets/img/og-ride.jpg', hero: '/assets/img/shop-side.jpg',
  },
};

const add = (what) => `<span class="add">[ADD: ${what}]</span>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalogue.json'), 'utf8'));
// dishes without a TAKE photo get a credited example photo (data/menu-photos.json)
const menuPhotos = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'menu-photos.json'), 'utf8')).photos;
cat.menu.forEach((i) => { const p = menuPhotos[i.id]; if (!i.img && p) { i.img = p.file; i.ex = { author: p.author, licence: p.licence, source: p.source }; } });
const k = (n) => (n == null ? null : (n / 1000) + 'K');
const priced = cat.bikes.filter((b) => b.day);
const minDay = Math.min(...priced.map((b) => b.day));
const minFood = Math.min(...cat.menu.filter((i) => i.price).map((i) => i.price));
const maxFood = Math.max(...cat.menu.filter((i) => i.price).map((i) => i.price));
const cc = cat.bikes.map((b) => b.cc);

// Reviews: real Google reviews only, word for word, never invented. They live in
// data/reviews.json; the wall, the averages and "show more" follow from it.
const REVIEWS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'reviews.json'), 'utf8')).reviews || [];
const SHOW = 9;
const reviewsHtml = REVIEWS.length
  ? REVIEWS.map((r, i) => `<figure class="card review${i >= SHOW ? ' more' : ''}"><div class="review-top"><div class="stars" aria-label="${r.stars} out of 5">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div><span class="chip">${r.place === 'ride' ? 'Scooters' : 'Café'}</span></div><blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}<small>${esc(r.when)} on Google</small></figcaption></figure>`).join('')
  : `<div class="card review">${add('paste the real Google reviews into data/reviews.json, word for word. The wall, the average rating and "show more" appear by themselves.')}</div>`;
const avg = (list) => (list.reduce((s, r) => s + r.stars, 0) / list.length).toFixed(1);
const sumFor = (place, label) => { const l = REVIEWS.filter((r) => r.place === place); return l.length ? `<div><b>${avg(l)}</b><span>${label} · ${l.length} review${l.length > 1 ? 's' : ''} shown</span></div>` : ''; };
const reviewSummary = REVIEWS.length ? `<div class="review-sum">${sumFor('eat', 'Café')}${sumFor('ride', 'Scooters')}</div>` : '';
const reviewMore = REVIEWS.length > SHOW ? `<button class="btn btn-ghost review-more" type="button" onclick="document.getElementById('reviewWall').classList.add('all');this.remove()">Show all ${REVIEWS.length} reviews</button>` : '';

// FAQ: only facts we have. Shown on the page and given to Google as FAQPage.
const FAQ = [
  ['Where is TAKE in Canggu?', `In Perum Prapta Canggu Asri, Blok D No.1, on Jl. Krisnantara 1, a quiet lane off Jalan Pantai Berawa in Tibubeneng. TAKE Coffee and TAKE Scooter Rental share the white house with the two signs.`],
  ['What are the opening hours?', 'Every day from 7am to 8pm, for the kitchen and the rental desk.'],
  ['Do you deliver food?', `Yes. Order on this page and choose delivery, or WhatsApp the kitchen on 0821 9133 7592.`],
  ['How much is a scooter a day?', `From Rp ${k(minDay)} a day: ${priced.map((b) => `${b.name} ${k(b.day)}`).join(', ')}.`],
  ['How do I book a scooter?', 'Choose a model and your dates on the scooter page and send the request. We confirm the bike and the price on WhatsApp, then you pick it up at the shop.'],
  ['How do I pay?', CONFIG.payLive ? 'Scooter rentals are paid in advance online when you book. Food can be paid online when you order, or at the counter. Online payment is by QRIS, e-wallets, bank transfer or card through Xendit.' : 'Online payment is coming soon. For now we confirm your scooter booking on WhatsApp and you pay at the shop; food is paid at the counter.'],
  ['How do TAKE Points work?', `Sign in as a member with your email. You get 1 point for every Rp ${k(cat.loyalty.perIDR)} you pay on food and scooter rentals, and ${cat.loyalty.redeemPoints} points take Rp ${k(cat.loyalty.redeemValue)} off your next order or rental.`],
  ['Do you have drivers and tours?', `Yes: ${cat.trips.map((t) => t.name).join(', ')}. Send a request with the date and pick-up place.`],
];
const faqHtml = FAQ.map(([q, a]) => `<details class="card faq"><summary><h3>${esc(q)}</h3></summary><p>${esc(a)}</p></details>`).join('');

// Menu and scooters written into the HTML, so search engines see them without
// running JavaScript. main.js redraws the same cards with the + buttons.
const menuStatic = cat.menu.map((i) => `<div class="card dish${i.img ? ' has-img' : ''}">${i.img ? `<div class="dish-pic"><img class="dish-img" src="/assets/img/${i.img}" alt="${esc(i.name)}${i.ex ? ' (example photo)' : ' at TAKE'}" width="360" height="360" loading="lazy">${i.ex ? `<a class="ex-tag" href="${i.ex.source}" target="_blank" rel="noopener" title="Photo: ${esc(i.ex.author)}, ${esc(i.ex.licence)}">Example photo</a>` : ''}</div>` : ''}<div class="dish-body"><span class="label">${esc(i.cat)}</span><h3>${esc(i.name)}</h3>${i.desc ? `<p class="dish-desc">${esc(i.desc)}</p>` : ''}<span class="price">${i.price ? k(i.price) : 'Price at the counter'}</span></div></div>`).join('');
const bikeImg = (id) => { const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'bike-photos.json'), 'utf8')).photos[id]; return p ? `<img class="bike-img" src="/assets/img/${p.file}" alt="" loading="lazy">` : ''; };
const fleetStatic = cat.bikes.map((b) => `<div class="card bike">${bikeImg(b.id)}<span class="label">${b.cc}cc · ${b.kind}</span><h3>${esc(b.name)}</h3><div class="rates"><div><b>${b.day ? k(b.day) : '?'}</b>day</div><div><b>${b.week ? k(b.week) : '?'}</b>week</div><div><b>${b.month ? k(b.month) : '?'}</b>month</div></div></div>`).join('');

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
  '{{REVIEW_SUMMARY}}': reviewSummary,
  '{{REVIEW_MORE}}': reviewMore,
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
  // rental terms: decisions only the owner can make
  '{{TERMS_VERSION}}': cat.rental.termsVersion,
  '{{ADD_PAY_LIVE}}': CONFIG.payLive ? '' : add('online payment switches on when the TAKE Xendit account is approved'),
  '{{ADD_AGE}}': add('minimum age, if not 18'),
  '{{ADD_DOC_HOLD}}': add('do you keep the passport, a copy, or nothing during the rental?'),
  '{{ADD_FUEL}}': add('what you charge if it comes back with less'),
  '{{ADD_INSURANCE}}': add('is there any insurance, and what the renter pays if there is an accident'),
  '{{ADD_DAMAGE}}': add('how damage is assessed and charged'),
  '{{ADD_LATE}}': add('charge per extra day or per hour'),
  '{{ADD_CANCEL}}': add('refund rules: e.g. full refund up to 24 hours before pick-up, none after'),
  '{{ADD_AREA}}': add('areas not allowed, e.g. Nusa islands by ferry, other islands, off-road'),
  '{{ADD_RETENTION}}': add('how long document photos are kept after the last rental'),
  '{{POINTS_RULE}}': `1 point for every Rp ${k(cat.loyalty.perIDR)} you pay on food and scooters. ${cat.loyalty.redeemPoints} points = Rp ${k(cat.loyalty.redeemValue)} off.` + (cat.loyalty.confirmed ? '' : ' ' + add('owner to confirm these rates')),
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
    description: VARIANTS[v].description, about: { '@id': ((VARIANTS[v].place || v) === 'eat' ? cafe : rental)['@id'] }, inLanguage: 'en' };
  const faq = { '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return { '@context': 'https://schema.org', '@graph': v === 'terms' ? [page, rental] : v === 'eat' ? [page, cafe, rental, faq] : [page, rental, cafe, faq] };
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
  const V = VARIANTS[v], url = CONFIG.site + V.path, P = PLACES[V.place || v], look = V.look || v;
  const pre = v === 'terms' ? '/ride' : ''; // section links from the terms page go to the scooter page
  return `<!doctype html>
<html lang="en" data-v="${look}">
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
<link rel="stylesheet" href="/assets/css/members.css">
<script type="application/ld+json">${JSON.stringify(structured(v)).replace(/</g, '\\u003c')}</script>
</head>
<body class="page-${v}">
<header class="nav">
  <a class="logo logo-neon" href="/" aria-label="TAKE Canggu, home"><img src="/assets/img/logo-neon.svg" alt="TAKE" width="140" height="58"><span><b>Canggu</b></span></a>
  <nav class="vswitch" aria-label="Coffee or scooters">
    <a data-to="eat" data-title="${esc(VARIANTS.eat.title)}" href="/"${v === 'eat' ? ' aria-current="page"' : ''}>Coffee &amp; Eatery</a>
    <a data-to="ride" data-title="${esc(VARIANTS.ride.title)}" href="/ride"${v === 'ride' ? ' aria-current="page"' : ''}>Scooters &amp; Transport</a>
  </nav>
  <nav id="menu" aria-label="On this page">
    <a class="only-eat" href="#menu-list">Menu</a><a class="only-eat" href="#order">Order</a>
    <a class="only-ride" href="${pre}#fleet">Scooters</a><a class="only-ride" href="${pre}#book">Book</a><a class="only-ride" href="${pre}#transport">Transport</a>
    <a href="${pre}#points">Points</a><a href="${pre}#faq">Questions</a><a href="${pre}#find">Find us</a><a href="/terms" class="only-ride">Terms</a>
  </nav>
  <button class="member-btn" id="memberBtn" type="button" aria-haspopup="dialog" aria-controls="memberDrawer"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Member</span></button>
  <button class="burger" aria-label="Open menu" aria-controls="menu" aria-expanded="false"><span></span><span></span><span></span></button>
</header>
<main>
${v === 'terms' ? fill(body) : oneH1(fill(body), v)}
</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div>
      <a class="logo" href="/"><img src="/assets/img/icon.svg" alt="" width="52" height="52"><span>TAKE <b>Canggu</b></span></a>
      <p class="mute">Coffee, food, scooters and drivers from one small house in Berawa, Canggu. ${CONFIG.hours}.</p>
      <p class="mute" style="font-size:14px">${CONFIG.address}</p>
    </div>
    <div><h4>Eat</h4><a href="/#menu-list">Menu</a><a href="/#order">Order food</a><a href="https://wa.me/${CONFIG.waEat}" target="_blank" rel="noopener">Delivery WhatsApp</a><a href="${mapsUrl(PLACES.eat)}" target="_blank" rel="noopener">Take Coffee on Google Maps</a></div>
    <div><h4>Ride</h4><a href="/ride#fleet">Scooter rental Canggu</a><a href="/ride#transport">Drivers &amp; tours</a><a href="https://wa.me/${CONFIG.waRide}" target="_blank" rel="noopener">Rental WhatsApp</a><a href="${mapsUrl(PLACES.ride)}" target="_blank" rel="noopener">TAKE Scooter Rental on Google Maps</a><a href="/terms">Rental terms</a></div>
  </div>
  <div class="wrap foot-base">
    <span>&copy; ${new Date().getFullYear()} TAKE Coffee &amp; Eatery, TAKE Scooter Rental</span>
    <span><a href="/staff" rel="nofollow">Staff</a> · Website by <a href="https://djinja-c.com" target="_blank" rel="noopener">Djinja-C</a></span>
  </div>
</footer>
<div class="chat-buddy">
  <div class="buddy-bubble" id="buddyBubble" hidden>
    <button class="buddy-x" type="button" aria-label="Close the greeting">&times;</button>
    <span id="buddyText">Welcome to TAKE!</span>
    <button class="buddy-ask" type="button" data-open-chat>Ask me a question</button>
  </div>
  <button class="chat-launch buddy" id="chatLaunch" type="button" aria-expanded="false" aria-controls="chatPanel" aria-label="Questions? Chat with TAKE">
    <img class="buddy-face" src="/assets/img/owner.jpg" alt="" width="64" height="64"><span class="buddy-label">Ask TAKE</span>
  </button>
</div>
<div class="chat" id="chatPanel" role="dialog" aria-label="Chat with TAKE" hidden>
  <div class="chat-head">
    <img src="/assets/img/owner.jpg" alt="" width="40" height="40">
    <div><b>TAKE assistant</b><small>Instant answers. A person is one tap away.</small></div>
    <button class="chat-x" type="button" aria-label="Close chat">&times;</button>
  </div>
  <div class="chat-log" id="chatLog" aria-live="polite"></div>
  <div class="chat-chips" id="chatChips"></div>
  <form class="chat-form" id="chatForm">
    <input id="chatInput" autocomplete="off" placeholder="Type your question" aria-label="Type your question">
    <button type="submit" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8z"/></svg></button>
  </form>
  <a class="chat-human" id="chatHuman" href="https://wa.me/${look === 'eat' ? CONFIG.waEat : CONFIG.waRide}" target="_blank" rel="noopener">${ICON_WA}<span>Talk to a person on WhatsApp</span></a>
</div>
<button class="cart-fab only-eat" id="cartFab" type="button" hidden>Order <b id="cartCount">0</b> · <span id="cartTotal"></span></button>
<script src="/assets/js/data.js"></script>
<script src="/assets/js/main.js"></script>
<script src="/assets/js/member.js"></script>
<script src="/assets/js/book.js"></script>
<script src="/assets/js/chat.js"></script>
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
for (const v of ['eat', 'ride']) fs.writeFileSync(path.join(outDir, VARIANTS[v].file), layout(v, home.body));
fs.writeFileSync(path.join(outDir, VARIANTS.terms.file), layout('terms', read('terms.html').body));
const staff = read('staff.html');
fs.writeFileSync(path.join(outDir, 'staff.html'), staffLayout(staff.meta, staff.body));

// catalogue for browser and server
const bikePhotos = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'bike-photos.json'), 'utf8')).photos;
const pub = { bikePhotos, menu: cat.menu, bikes: cat.bikes, trips: cat.trips, loyalty: cat.loyalty, rental: cat.rental, payLive: CONFIG.payLive, wa: { eat: CONFIG.waEat, ride: CONFIG.waRide } };
fs.writeFileSync(path.join(outDir, 'assets', 'js', 'data.js'), `// generated by build.mjs from data/catalogue.json\nwindow.TAKE = ${JSON.stringify(pub)};\n`);
// The server takes every price and rule from here, never from the browser.
const menuMap = Object.fromEntries(cat.menu.map((i) => [i.id, { name: i.name, price: i.price }]));
const bikeMap = Object.fromEntries(cat.bikes.map((b) => [b.id, { name: b.name, day: b.day, week: b.week }]));
fs.writeFileSync(path.join(ROOT, 'functions', 'api', '_catalogue.js'), `// generated by build.mjs from data/catalogue.json\n` +
  `export const MENU = ${JSON.stringify(menuMap)};\nexport const BIKES = ${JSON.stringify(bikeMap)};\n` +
  `export const LOYALTY = ${JSON.stringify(cat.loyalty)};\nexport const RENTAL = ${JSON.stringify(cat.rental)};\n`);
if (fs.existsSync(path.join(ROOT, 'functions', 'api', '_menu.js'))) fs.unlinkSync(path.join(ROOT, 'functions', 'api', '_menu.js'));

// routing + SEO. /ride is served by ride.html (Pages drops .html); old links keep working.
fs.writeFileSync(path.join(outDir, '_redirects'), '/eat / 301\n/scooter /ride 301\n/scooters /ride 301\n/rental /ride 301\n');
fs.writeFileSync(path.join(outDir, '_headers'), '/staff\n  X-Robots-Tag: noindex, nofollow\n/api/*\n  X-Robots-Tag: noindex\n/assets/*\n  Cache-Control: public, max-age=604800\n');
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>${CONFIG.site}/</loc><lastmod>${today}</lastmod><image:image><image:loc>${CONFIG.site}/assets/img/shop-front.jpg</image:loc></image:image></url>
  <url><loc>${CONFIG.site}/terms</loc><lastmod>${today}</lastmod></url>
  <url><loc>${CONFIG.site}/ride</loc><lastmod>${today}</lastmod><image:image><image:loc>${CONFIG.site}/assets/img/shop-side.jpg</image:loc></image:image></url>
</urlset>
`);
fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nDisallow: /staff\nDisallow: /api/\nSitemap: ${CONFIG.site}/sitemap.xml\n`);

const unpriced = [...cat.menu, ...cat.bikes.map((b) => ({ ...b, price: b.day })), ...cat.trips].filter((i) => i.price == null).length;
console.log(`built /, /ride and /staff; ${unpriced} items still without a price; ${REVIEWS.length} reviews`);

// Cache busting: every build stamps its scripts and styles, so a new deploy
// reaches visitors at once even though /assets/* is cached for a week.
const STAMP = Date.now().toString(36);
for (const f of fs.readdirSync(outDir).filter((x) => x.endsWith('.html'))) {
  const p = path.join(outDir, f);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/(\/assets\/(?:js|css)\/[\w.-]+\.(?:js|css))(?=")/g, `$1?v=${STAMP}`));
}
