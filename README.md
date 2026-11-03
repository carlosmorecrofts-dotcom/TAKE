# TAKE Canggu: website + ordering + scooter rental app

One site for TAKE Coffee & Eatery, TAKE Scooter Rental and TAKE Transport,
Perum Prapta Canggu Asri Blok D No.1, Jl. Pantai Berawa / Jl. Krisnantara 1,
Tibubeneng, Canggu, Bali. Built by Djinja-C on the MSI Global Education pattern.

## What is in it

- **`/eat`** (and `/`): menu, cart, order for eat-in / pick-up / delivery. The
  order goes to the staff app and opens WhatsApp to the kitchen. The guest gets
  a live status link.
- **`/ride`**: scooters with day prices and a live "free now" count, booking
  request, drivers / tours request. The guest gets a booking link. While the
  bike is out, that link has **Share my location** for breakdowns.
- **`/staff`**: PIN login, installable on a phone (Add to home screen).
  Kitchen board (new, cooking, ready, done, paid). Rentals (requests, confirm
  with price, hand over a bike with km/fuel/deposit, check in, extend, overdue
  in red, due today in gold). Fleet (plates, km, oil change countdown, workshop,
  service log). Map of renters sharing location. Today's takings.
  A beep and a badge when a new order or booking arrives.

Same page, two variants: `html[data-v="eat"|"ride"]`, sections marked
`.only-eat` / `.only-ride`. The switch in the header changes it without reloading.

## How it is built

- `pages/*.html`: page bodies, first line `<!--meta {...} -->`.
- `data/catalogue.json`: menu, scooters, trips and prices. **Edit prices here.**
- `build.mjs`: wraps the pages, writes `site/assets/js/data.js` (browser) and
  `functions/api/_menu.js` (server: the API takes prices from here, never from
  the guest), `_redirects`, sitemap, robots. Run `node build.mjs` after any change.
- `functions/api/[[path]].js`: the API (Cloudflare Pages Functions).
- `schema.sql`: D1 database. `seed-demo.sql`: fake fleet for local tests only.
- `site/assets/css/style.css`, `fx.css`: MSI layout recoloured to charcoal +
  the TAKE banner red. `app.css`: variants, cart, booking, staff.

## Run locally

```powershell
node build.mjs
npx wrangler@3 d1 execute take --local --file schema.sql
npx wrangler@3 d1 execute take --local --file seed-demo.sql
npx wrangler@3 pages dev --port 8799     # PIN 1234 from .dev.vars
```

## Go live (Cloudflare Pages + D1)

```powershell
npx wrangler@3 d1 create take            # put the id in wrangler.toml
npx wrangler@3 d1 execute take --remote --file schema.sql
npx wrangler@3 pages project create take-canggu --production-branch main
npx wrangler@3 pages secret put STAFF_PIN --project-name take-canggu
npx wrangler@3 pages deploy --branch=main
```

Then add the real bikes in `/staff` > Fleet (model, plate, km).

## Facts used, and where from (2026-11-03)

- Wall banners and shop photos: name, address, hours 7am to 8pm, menu and food
  prices, scooter models, transport destinations, phones.
- Rental price list photo: day rates. XMAX 300K and ADV 175K are handwritten
  stickers on the list.
- Google Maps place: `Take Coffee Canggu`, -8.6481201, 115.1481354. Google did
  not let the reviews be read automatically.

## Still needed from the owner (shown on the site as yellow [ADD: ...])

- **Google reviews**: paste 6 real ones into `REVIEWS` in `build.mjs`, word for word.
- Drink prices (coffee, juice, coconut, beer).
- Week and month scooter rates; Genio and XSR day rates (or remove them).
- Transport prices.
- Delivery area and fee; payment methods; deposit and documents for rental.
- Logo file (`icon.svg` is a stand-in "T"), owner name and a line of story.
- How many of each bike, with plates (entered in /staff).
- Staff PIN.
