// TAKE staff app offline shell. The orders themselves always come live from /api.
const CACHE = 'take-staff-v3';
const SHELL = ['/staff', '/assets/css/style.css', '/assets/css/app.css', '/assets/js/data.js', '/assets/js/staff.js', '/assets/img/logo-word.png', '/assets/img/take-t-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // network first, so a new version shows at once; the cache only when offline
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(u.pathname === '/staff' || u.pathname === '/staff.html' ? '/staff' : e.request, copy)); }
    return r;
  }).catch(() => caches.match(u.pathname === '/staff.html' ? '/staff' : e.request, { ignoreSearch: true })));
});
