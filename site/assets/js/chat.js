// The "Questions?" chat: one-tap questions with instant answers, a box to type
// a question (matched by keywords in English and Indonesian), and "Talk to a
// person" on WhatsApp. No AI service, no key, nothing sent anywhere.
// Answers use only facts on this site; prices come from the catalogue (data.js).
// Built from the MSI Global Education chat (2026-10-30).
(function () {
  var T = window.TAKE;
  var k = function (n) { return n / 1000 + 'K'; };
  var priced = T.bikes.filter(function (b) { return b.day; });
  var weekly = T.bikes.filter(function (b) { return b.week; });
  var cheapest = Math.min.apply(null, priced.map(function (b) { return b.day; }));
  var L = T.loyalty;
  var isRide = document.documentElement.dataset.v === 'ride';

  // area: 'eat', 'ride' or 'both' decides which page shows the question first
  var QA = [
    { id: 'price', area: 'ride', q: 'How much is a scooter?',
      a: 'From Rp ' + k(cheapest) + ' a day. ' + priced.map(function (b) { return b.name + ' ' + k(b.day); }).join(', ') + '.' +
        (weekly.length ? ' By the week: ' + weekly.map(function (b) { return b.name + ' ' + k(b.week); }).join(', ') + '.' : ''),
      k: ['price', 'cost', 'how much', 'rate', 'cheap', 'harga', 'berapa', 'sewa', 'murah', 'per day', 'week', 'minggu'] },
    { id: 'which', area: 'ride', q: 'Which scooter should I choose?',
      a: 'For short trips to the beach and cafés, a Honda Beat, Scoopy or Yamaha Gear is light and easy to park. A Honda Vario or Yamaha Fazzio suits everyday riding. For longer rides or two people, a Yamaha NMAX, Honda PCX, ADV or XMAX is more comfortable.',
      k: ['which', 'choose', 'best', 'recommend', 'model', 'bike', 'scooter', 'motor', 'nmax', 'pcx', 'scoopy', 'vario', 'beat', 'adv', 'xmax', 'fazzio', 'pilih'] },
    { id: 'book', area: 'ride', q: 'How do I book a scooter?',
      a: 'Choose a scooter in the Book section, tap your pick-up day and your return day on the calendar, then sign in with your email. The first time, you add a photo of your passport and driving licence and accept the rental terms. Then collect the scooter at the shop.',
      k: ['book', 'reserve', 'booking', 'available', 'availability', 'calendar', 'pesan', 'booking', 'tersedia', 'kalender'] },
    { id: 'docs', area: 'ride', q: 'What documents do I need?',
      a: 'Your passport and a driving licence for motorcycles. Visitors from abroad should carry an International Driving Permit that covers motorcycles, together with their home licence. Bring them when you collect the scooter.',
      k: ['document', 'passport', 'licen', 'license', 'idp', 'permit', 'sim', 'paspor', 'dokumen', 'surat'] },
    { id: 'pay', area: 'both', q: 'How do I pay?',
      a: T.payLive ? 'Scooter rentals are paid in advance when you book. Food can be paid when you order or at the counter. Online payment is by QRIS, e-wallets, bank transfer or card.'
        : 'Online payment is coming soon. For now we confirm your scooter booking on WhatsApp and you pay at the shop, and food is paid at the counter.',
      k: ['pay', 'payment', 'card', 'cash', 'qris', 'transfer', 'gopay', 'ovo', 'bayar', 'pembayaran', 'tunai'] },
    { id: 'hours', area: 'both', q: 'When are you open?',
      a: 'Every day from 7am to 8pm, for the café and the scooter desk.',
      k: ['open', 'hours', 'time', 'close', 'when', 'buka', 'jam', 'tutup'] },
    { id: 'where', area: 'both', q: 'Where are you?',
      a: 'Perum Prapta Canggu Asri Blok D No.1, Jl. Krisnantara 1, a quiet lane off Jalan Pantai Berawa in Tibubeneng, Canggu. Look for the white house with the two signs. The map is in the Find us section.',
      k: ['where', 'address', 'location', 'find', 'map', 'direction', 'berawa', 'alamat', 'lokasi', 'dimana', 'di mana'] },
    { id: 'menu', area: 'eat', q: 'What is on the menu?',
      a: 'Local and western food, Bali style. Breakfasts, nasi goreng and mi goreng, sweet and sour chicken, fuyung hai, cap cay, four pizzas, spaghetti bolognese, carbonara and aglio olio, small bites, coffee, fresh juices, young coconut and Bintang. Everything with prices is in the Menu section.',
      k: ['menu', 'food', 'eat', 'breakfast', 'lunch', 'dinner', 'nasi', 'mie', 'pizza', 'burger', 'pasta', 'makan', 'makanan', 'sarapan'] },
    { id: 'delivery', area: 'eat', q: 'Do you deliver food?',
      a: 'Yes. Add dishes from the menu, choose Delivery and tell us where to bring it, or WhatsApp the kitchen on 0821 9133 7592.',
      k: ['deliver', 'delivery', 'bring', 'villa', 'antar', 'kirim', 'pesan antar'] },
    { id: 'coffee', area: 'eat', q: 'Do you serve coffee?',
      a: 'Yes, from 7am: latte or cappuccino hot or cold 20K, Bali coffee 10K. Also fresh juices from 15K, young coconut 20K, traditional jamu and Bintang 35K.',
      k: ['coffee', 'kopi', 'latte', 'drink', 'juice', 'coconut', 'beer', 'minum', 'bir', 'kelapa'] },
    { id: 'trips', area: 'ride', q: 'Do you have drivers and tours?',
      a: 'Yes: ' + T.trips.map(function (t) { return t.name; }).join(', ') + '. Send a request in the Transport section with the date and pick-up place.',
      k: ['driver', 'airport', 'tour', 'taxi', 'transfer', 'trip', 'ubud', 'uluwatu', 'batur', 'agung', 'sunrise', 'trek', 'bandara', 'supir', 'antar jemput'] },
    { id: 'points', area: 'both', q: 'How do TAKE Points work?',
      a: 'Sign in as a member with your email. You get 1 point for every Rp ' + k(L.perIDR) + ' you pay on food and scooters, and ' + L.redeemPoints + ' points take Rp ' + k(L.redeemValue) + ' off your next order or rental.',
      k: ['point', 'loyal', 'member', 'reward', 'discount', 'poin', 'diskon', 'anggota'] },
    { id: 'help', area: 'ride', q: 'My scooter broke down. What do I do?',
      a: 'Stay safe, open your booking page and press "Share my location", then WhatsApp us on 0821 4595 4191 so we know where you are.',
      k: ['broke', 'broken', 'break down', 'flat', 'tyre', 'tire', 'accident', 'help', 'stuck', 'mogok', 'ban', 'kecelakaan', 'bantuan'] }
  ];
  var TEXT = {
    hello: isRide ? 'Hi! I am the TAKE assistant. Ask me about scooters, prices and booking, or tap a question below.'
      : 'Hi! I am the TAKE assistant. Ask me about the menu, delivery or our scooters, or tap a question below.',
    unsure: 'Good question. Someone from TAKE can answer that best. Tap "Talk to a person" and we reply on WhatsApp.'
  };
  // this page's questions first
  var here = isRide ? 'ride' : 'eat';
  QA.sort(function (a, b) { var r = function (x) { return x.area === here ? 0 : x.area === 'both' ? 1 : 2; }; return r(a) - r(b); });

  var launch = document.getElementById('chatLaunch');
  var panel = document.getElementById('chatPanel');
  if (!launch || !panel) return;
  var log = document.getElementById('chatLog'), chips = document.getElementById('chatChips');
  var form = document.getElementById('chatForm'), input = document.getElementById('chatInput');
  var started = false;

  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function say(text, who) {
    var m = document.createElement('div');
    m.className = 'msg ' + (who || 'bot');
    m.textContent = text;
    log.appendChild(m); scrollDown();
  }
  function botSay(text) {
    var dots = document.createElement('div');
    dots.className = 'msg bot typing'; dots.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(dots); scrollDown();
    setTimeout(function () { dots.remove(); say(text, 'bot'); }, 480);
  }
  function renderChips(skip) {
    chips.innerHTML = '';
    QA.forEach(function (x) {
      if (x.id === skip) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = x.q;
      b.addEventListener('click', function () { ask(x); });
      chips.appendChild(b);
    });
  }
  function ask(x) { say(x.q, 'me'); botSay(x.a); renderChips(x.id); }
  function match(text) {
    var t = ' ' + text.toLowerCase() + ' ', best = null, score = 0;
    QA.forEach(function (x) {
      var s = 0;
      x.k.forEach(function (w) { if (t.indexOf(w) !== -1) s += w.length; });
      if (s > score) { score = s; best = x; }
    });
    return best;
  }
  function open() {
    panel.hidden = false; launch.setAttribute('aria-expanded', 'true');
    if (!started) { started = true; botSay(TEXT.hello); renderChips(); }
    setTimeout(function () { input.focus(); }, 60);
  }
  function close() { panel.hidden = true; launch.setAttribute('aria-expanded', 'false'); }
  launch.addEventListener('click', function () { if (panel.hidden) open(); else close(); });
  panel.querySelector('.chat-x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim(); if (!v) return;
    input.value = '';
    say(v, 'me');
    var x = match(v);
    if (x) { botSay(x.a); renderChips(x.id); } else { botSay(TEXT.unsure); renderChips(); }
  });
  // switching café / scooters changes who "Talk to a person" reaches
  new MutationObserver(function () {
    var h = document.getElementById('chatHuman');
    if (h) h.href = 'https://wa.me/' + (document.documentElement.dataset.v === 'ride' ? T.wa.ride : T.wa.eat);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-v'] });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-open-chat]');
    if (t) { e.preventDefault(); hideBubble(); open(); }
  });

  // the greeting bubble next to the photo: shown once a visitor has looked
  // around for a moment, and gone for good when closed or when the chat opens
  var bubble = document.getElementById('buddyBubble');
  function hideBubble() { if (bubble) bubble.hidden = true; try { localStorage.setItem('take_bubble', '1'); } catch (x) {} }
  if (bubble) {
    var seen = false; try { seen = !!localStorage.getItem('take_bubble'); } catch (x) {}
    document.getElementById('buddyText').textContent = isRide ? 'Hi, welcome to TAKE! Questions about scooters, prices or booking?' : 'Hi, welcome to TAKE! Questions about the menu, delivery or our scooters?';
    if (!seen) setTimeout(function () { if (panel.hidden) bubble.hidden = false; }, 4000);
    bubble.querySelector('.buddy-x').addEventListener('click', hideBubble);
    launch.addEventListener('click', hideBubble);
  }
})();
