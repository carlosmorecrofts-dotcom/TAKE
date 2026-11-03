Design the scooter booking and member area for TAKE Canggu, a small scooter rental and café in Berawa, Canggu, Bali. Mobile first (390 px wide), then desktop (1440 px). Most customers are tourists and digital nomads booking on their phone, often standing outside the shop.

## What already exists (keep its look)

Live site: https://take-canggu.pages.dev/ride

Visual system, use exactly:
- Background: near-black charcoal #0c0a0a, with a slow animated backdrop (drifting dust, soft blurred coffee beans and leaves, thin line icons). Every content block sits on a dark glass card so text is always readable over it.
- Cards: rgba(24,19,19,.88) with a 1 px border rgba(255,90,110,.28), radius 18 px, soft blur behind.
- Accent red (buttons, active states, links): #ff5a6e, text on red #2a0308.
- Gold (prices, labels, warnings): #f2c14e.
- Text: cream #fbf3ee; secondary text #c9b8b4.
- Success / free: #6be3a1. Error / overdue: #ff3b4e.
- Fonts: Oswald 700 uppercase for headings and numbers; Inter 400 to 700 for everything else; Great Vibes script only for one decorative word in big headlines.
- Buttons: full pill shape (radius 999 px), 13 px by 24 px padding, red filled primary, outlined ghost secondary.
- Section labels: small red Oswald uppercase with wide letter spacing above each heading.
- Nothing blinks or flashes. Motion is slow fades and slides only.

## The scooters (real data, do not invent others)

Day prices in Indonesian rupiah (K = thousand). Week and month prices are not known yet: show them as "?".
- Honda Beat 110cc, 85K
- Yamaha Gear 125cc, 85K
- Honda Scoopy 110cc, 100K
- Yamaha Fazzio 125cc, 100K
- Honda Vario 125cc, 120K
- Yamaha NMAX 155cc, 150K
- Honda PCX 160cc, 150K
- Honda ADV 160cc, 175K
- Yamaha XMAX 250cc, 300K
- Honda Genio 110cc, price not known
- Yamaha XSR 155cc (manual), price not known

The shop has several bikes of some models. Availability is per model: a day is free if at least one bike of that model is not booked.

## Screens to design

### 1. Availability calendar (on the scooter page, in the booking section)
- Pick a model first (cards or a compact selector showing name, cc and day price).
- Calendar shows two months on desktop, one on phone with a swipe or arrows to the next month.
- Each day shows its state: free (with a small count, e.g. "2 left"), last one, fully booked (struck through, not tappable), past (dimmed).
- The customer taps a pick-up date then a return date. The range highlights. A range cannot cross a fully booked day: show why if they try.
- Rental days = return date minus pick-up date. Pick-up and return happen at the shop, 7am to 8pm.
- Below the calendar, a sticky summary bar: model, dates, number of days, price (days x day price), and the main button "Continue to pay". On phone it sits at the bottom of the screen.
- Empty state for a model with no free days in the visible months, with a nudge to try another model.

### 2. Booking and pay-in-advance flow (3 steps, show a step indicator)
1. Sign in (only if not signed in): email field, "Send me a sign-in link". Then a "Check your email" state with the address shown and a resend option.
2. Rider check: documents and terms (see member area). If the member already has both documents and accepted the current terms, this step is a single green "All set" line and is skipped.
3. Review and pay: scooter, dates, days, price, optional "Use 100 points (Rp 25K off)" toggle if they have enough points, total to pay now, and the main button "Pay now". Show the accepted payment options as small badges: QRIS, GoPay, OVO, DANA, ShopeePay, bank transfer, card. Note under the button: "We hold this scooter for you for 30 minutes while you pay."

Then two result states:
- Paid: big confirmation, booking number, dates, "Pick up at the shop from 7am", address, add-to-calendar and WhatsApp buttons, link to the booking page.
- Payment not finished or failed: calm message, "Try again" button, hold timer shown.

### 3. Booking page (the link the customer keeps)
- Status steps: Paid, Ready for pick-up, Riding, Returned.
- Booking details, price paid, points earned.
- While riding: a "Share my location" card for breakdowns, and a WhatsApp help button.

### 4. Member area (opens as a full-height drawer from a "Member" button in the header; on phone it is a full screen)
Tabs or sections:
- **Points**: big balance number, what it is worth, a progress bar to the next reward, how to earn ("1 point for every Rp 10K paid on food and scooters"), recent points history.
- **My bookings and orders**: upcoming first, each with status chip and a link to its page.
- **Rider documents**: two upload slots, "Passport photo page" and "Driving licence (motorcycle, or international permit with motorcycle category)". Each slot shows: empty state with camera and file buttons, uploading progress, uploaded state with a small blurred thumbnail and date plus "Replace" and "Delete". A short line on privacy: "Only you and TAKE staff can see these. Delete them any time."
- **Terms and conditions**: the version date, a scrollable summary, a link to the full page, and an "I agree" checkbox with button. After acceptance show "Accepted on [date]". If the terms change, show a gold banner asking them to accept the new version.
- **Profile**: name, WhatsApp number, email (read only), sign out.

### 5. Terms and conditions page
A readable long-form page with a short table of contents. Sections: who can rent, licence and documents, payment and deposit, fuel, damage and theft, accidents and police, late return, cancellations, helmet and passengers, where you may ride, privacy. Mark it clearly as a draft for the owner to check. Placeholder text is fine, but put the deposit amount, cancellation refund rules and insurance as visible yellow tags "[ADD: ...]" rather than numbers.

### 6. Staff view (one screen, desktop and tablet)
A bookings calendar for the whole fleet: rows = each bike (model + plate), columns = days, bars = bookings coloured by status (paid, riding, overdue in red). Clicking a bar opens the booking with the renter's documents to check at hand-over.

## Rules
- Use only the facts above. Never invent prices, reviews, opening hours or policies. Unknown facts appear as yellow dashed tags like "[ADD: deposit amount]".
- Do not use long dashes (em or en dashes) anywhere in the copy.
- Large tap targets (at least 44 px), clear focus states, sufficient contrast on the dark background.
- Every state: loading, empty, error, success.
- Deliver all screens for phone and desktop, plus the component set (calendar day states, step indicator, upload slot states, status chips, summary bar).
