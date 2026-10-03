const V = 'ganymede-202610031020';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// The page: network first (past the browser's HTTP cache, GitHub Pages keeps it 10 minutes), but a slow signal falls back to the saved copy after 2.5 s.
const page = req => new Promise(res => {
  let done = false;
  const fromCache = () => caches.match('index.html').then(r => { if (!done && r) { done = true; res(r); } });
  const t = setTimeout(fromCache, 2500);
  fetch(req.url, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put('index.html', c)); }
    clearTimeout(t); if (!done) { done = true; res(r); }
  }).catch(() => { clearTimeout(t); fromCache().then(() => { if (!done) { done = true; res(Response.error()); } }); });
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate' && u.origin === location.origin) { e.respondWith(page(e.request)); return; }
  // Fonts and icons: saved copy first.
  if (u.origin === location.origin || u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => {
      if (n.ok || n.type === 'opaque') { const c = n.clone(); caches.open(V).then(x => x.put(e.request, c)); }
      return n;
    })));
  }
});
