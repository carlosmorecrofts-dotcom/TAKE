// Animated backdrop: one fixed canvas behind the page. Everything it draws
// comes from THEME, so another business is a one-block change. Plain JS.
var THEME = {
  bg: '#0c0a0a',
  // particles: [r,g,b] tints, one picked per particle
  dust: ['251,243,238', '255,90,110', '242,193,78', '255,170,120'],
  dustPerPx: 5200,          // one particle per this many px of screen
  dustMaxPhone: 110,
  // 24x24 line drawings (SVG path syntax). Used for icons, movers and the scroll marker.
  paths: {
    cup: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2.5 2.5 0 0 1 0 5h-2M8 3c-1 1.5 1 2 0 4M12 3c-1 1.5 1 2 0 4',
    scooter: 'M5 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M19 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M8 17h7l3-7h-3M16 10l-2-5h-3M5 14l3-4h6',
    helmet: 'M4 15a8 8 0 0 1 16 0v2H4zM12 7v8M4 15h9l2-4',
    palm: 'M12 21c0-5 0-9 1-12M13 9c-2-3-6-4-9-2 3 0 6 1 9 2zM13 9c1-3 4-5 8-4-3 1-5 2-8 4zM13 9c-3-1-6 1-7 4 2-2 5-3 7-4zM13 9c3 0 5 2 6 5-2-2-4-3-6-5z',
    pin: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 10m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
    wave: 'M2 14c3-3 5-3 8 0s5 3 8 0 3-2 4-2M2 19c3-3 5-3 8 0s5 3 8 0 3-2 4-2',
    key: 'M8 15m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M11 12l9-9M17 6l3 3M15 8l2 2',
    coconut: 'M12 13m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M15 7l3-4M10 11h.01M14 11h.01M12 14h.01',
    cloche: 'M2 18h20M4 18a8 8 0 0 1 16 0M12 7v3M10 7h4M7 15a5 5 0 0 1 3-3',
    bowl: 'M3 11h18a9 9 0 0 1-18 0zM8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4M2 21h20'
  },
  // big soft shapes, pre-blurred once: [kind, x 0-1, y 0-1, size px, depth, colour, spin deg/s]
  shapes: [
    ['bean', .82, .12, 240, .08, '255,90,110', 1.2],
    ['leaf', .06, .44, 300, .12, '90,170,120', -.8],
    ['bean', .30, .78, 170, .16, '242,193,78', -1.6],
    ['leaf', .70, .66, 220, .10, '255,140,110', 1],
    ['bean', .50, .30, 120, .20, '251,243,238', 2]
  ],
  // floating line icons: [path, x, y, size, depth, colour]
  icons: [
    ['cup', .14, .16, 46, .30, '255,90,110'], ['scooter', .88, .36, 52, .42, '242,193,78'],
    ['palm', .62, .58, 50, .24, '120,200,150'], ['helmet', .28, .82, 40, .36, '251,243,238'],
    ['pin', .46, .22, 34, .50, '255,90,110'], ['wave', .22, .54, 44, .28, '130,200,255'],
    ['coconut', .92, .74, 40, .46, '242,193,78'], ['key', .56, .90, 32, .34, '251,243,238'],
    ['bowl', .04, .88, 40, .38, '255,140,110']
  ],
  iconAlpha: .32,
  // things crossing the screen with a trail: [path, from [x,y], to [x,y], seconds, size, colour]
  movers: [
    ['scooter', [-.08, .86], [1.08, .62], 38, 34, '255,90,110'],
    ['scooter', [1.08, .30], [-.08, .48], 52, 28, '242,193,78']
  ],
  marker: 'scooter',         // the object on the scroll progress bar (fx.js) on the rental page
  markerEat: 'cloche'        // the same on the restaurant page
};

(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.createElement('canvas');
  cv.id = 'space'; cv.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, dust = [], blobs = [];
  var P = {}; for (var k in THEME.paths) P[k] = new Path2D(THEME.paths[k]);
  // light theme: the same drawing in dark ink, so it shows on the pale page
  function isLight() { return document.documentElement.dataset.theme === 'light'; }
  function ink(rgb) { if (!isLight()) return rgb; return rgb.split(',').map(function (v) { return Math.round(+v * .28); }).join(','); }
  function boost(a) { return isLight() ? Math.min(1, a * 2.6) : a; }

  // soft shapes: drawn once into their own canvas with blur, then just moved
  function shapeCanvas(kind, s, rgb) {
    var c = document.createElement('canvas'), pad = s * .35, n = Math.ceil((s + pad * 2) * dpr);
    c.width = c.height = n;
    var g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(s / 2 + pad, s / 2 + pad);
    g.filter = 'blur(' + Math.round(s / 14) + 'px)';
    var grad = g.createRadialGradient(-s * .1, -s * .15, 0, 0, 0, s / 2);
    grad.addColorStop(0, 'rgba(' + rgb + ',.55)'); grad.addColorStop(1, 'rgba(' + rgb + ',.08)');
    g.fillStyle = grad; g.beginPath();
    if (kind === 'bean') {
      g.ellipse(0, 0, s * .32, s * .45, 0, 0, 6.2832); g.fill();
      g.strokeStyle = 'rgba(12,10,10,.55)'; g.lineWidth = s * .05; g.beginPath();
      g.moveTo(0, -s * .38); g.bezierCurveTo(s * .14, -s * .1, -s * .14, s * .1, 0, s * .38); g.stroke();
    } else {
      g.moveTo(0, -s * .48); g.bezierCurveTo(s * .42, -s * .2, s * .3, s * .3, 0, s * .48);
      g.bezierCurveTo(-s * .3, s * .3, -s * .42, -s * .2, 0, -s * .48); g.fill();
      g.strokeStyle = 'rgba(12,10,10,.4)'; g.lineWidth = s * .025; g.beginPath(); g.moveTo(0, -s * .44); g.lineTo(0, s * .44); g.stroke();
    }
    return { c: c, off: s / 2 + pad };
  }

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var phone = W < 700, n = Math.round(W * H / THEME.dustPerPx);
    if (phone) n = Math.min(n, THEME.dustMaxPhone);
    dust = [];
    for (var i = 0; i < n; i++) {
      var z = Math.random();
      dust.push({ x: Math.random() * W, y: Math.random() * H, z: z, r: .4 + z * z * 1.6, c: THEME.dust[i % THEME.dust.length] });
    }
    blobs = THEME.shapes.map(function (s) {
      var sz = phone ? s[3] * .55 : s[3];
      var b = shapeCanvas(s[0], sz, s[5]); b.s = s; b.sz = sz; return b;
    });
  }

  // wrap a page-scrolled y back into the screen so things keep coming as you scroll
  function wrapY(y, pad) { var span = H + pad * 2; return ((y + pad) % span + span) % span - pad; }

  function draw(t) {
    var sy = window.scrollY || 0, sec = t / 1000;
    ctx.clearRect(0, 0, W, H);
    // 1 soft shapes
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i], s = b.s;
      var x = s[1] * W + Math.sin(sec / 9 + i) * 24, y = wrapY(s[2] * H - sy * s[4] + Math.cos(sec / 11 + i) * 18, b.sz);
      ctx.save(); ctx.translate(x, y); ctx.rotate((sec * s[6] + i * 40) * Math.PI / 180);
      ctx.drawImage(b.c, -b.off, -b.off, b.c.width / dpr, b.c.height / dpr); ctx.restore();
    }
    // 2 dust, nearer moves faster with the scroll
    for (var j = 0; j < dust.length; j++) {
      var d = dust[j];
      var dx = ((d.x - sec * 6 * (.2 + d.z)) % W + W) % W, dy = ((d.y - sy * (.05 + d.z * .25)) % H + H) % H;
      ctx.globalAlpha = boost(.2 + d.z * .6); ctx.fillStyle = 'rgb(' + ink(d.c) + ')';
      ctx.beginPath(); ctx.arc(dx, dy, d.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.lineCap = ctx.lineJoin = 'round';
    // 3 line icons, slowly bobbing
    THEME.icons.forEach(function (ic, n) {
      var sz = W < 700 ? ic[3] * .75 : ic[3];
      var x = ic[1] * W + Math.sin(sec / 7 + n * 1.7) * 12, y = wrapY(ic[2] * H - sy * ic[4] + Math.sin(sec / 5 + n) * 14, sz);
      stroke(ic[0], x, y, sz, Math.sin(sec / 6 + n) * .12, ic[5], THEME.iconAlpha);
    });
    // 4 movers with a fading trail
    THEME.movers.forEach(function (m, n) {
      var p = ((sec + n * 17) % m[3]) / m[3];
      var x = (m[1][0] + (m[2][0] - m[1][0]) * p) * W, y = (m[1][1] + (m[2][1] - m[1][1]) * p) * H;
      var ang = Math.atan2((m[2][1] - m[1][1]) * H, (m[2][0] - m[1][0]) * W), back = 220;
      var tx = x - Math.cos(ang) * back, ty = y - Math.sin(ang) * back;
      var g = ctx.createLinearGradient(x, y, tx, ty);
      g.addColorStop(0, 'rgba(' + ink(m[5]) + ',' + boost(.45) + ')'); g.addColorStop(1, 'rgba(' + ink(m[5]) + ',0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      var flip = Math.cos(ang) < 0;
      stroke(m[0], x, y, m[4], flip ? 0 : ang * .3, m[5], .7, flip);
    });
  }
  function stroke(name, x, y, sz, rot, rgb, a, flip) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale((flip ? -1 : 1) * sz / 24, sz / 24); ctx.translate(-12, -12);
    ctx.strokeStyle = 'rgba(' + ink(rgb) + ',' + boost(a) + ')'; ctx.lineWidth = (isLight() ? 2.2 : 1.5) * 24 / sz * (sz / 30);
    ctx.shadowColor = isLight() ? 'rgba(0,0,0,0)' : 'rgba(' + rgb + ',.6)'; ctx.shadowBlur = 8;
    ctx.stroke(P[name]); ctx.restore();
  }

  size();
  window.addEventListener('resize', size);
  if (reduce) { draw(0); window.addEventListener('scroll', function () { draw(0); }, { passive: true }); return; }
  var run = true;
  document.addEventListener('visibilitychange', function () { run = !document.hidden; if (run) requestAnimationFrame(loop); });
  function loop(t) { if (!run) return; draw(t); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
