const V = 'ganymede-202610051658';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// The page: the saved copy at once, whatever the signal. A fresh one is fetched behind it (past the browser's HTTP
// cache, GitHub Pages keeps it 10 minutes) and saved for next time; if it differs, the open page is told ('updated').
const page = e => caches.match('index.html').then(hit => {
  const old = hit ? hit.clone().text() : Promise.resolve(null);
  const net = fetch(e.request.url, { cache: 'no-cache' }).then(async r => {
    if (!r.ok) return r;
    const text = await r.clone().text();
    await caches.open(V).then(x => x.put('index.html', r.clone()));
    if ((await old) !== null && (await old) !== text)
      (await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })).forEach(c => c.postMessage('updated'));
    return r;
  });
  e.waitUntil(net.catch(() => {}));
  return hit || net.catch(() => Response.error());
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate' && u.origin === location.origin) { e.respondWith(page(e)); return; }
  // Fonts and icons: saved copy first.
  if (u.origin === location.origin || u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => {
      if (n.ok || n.type === 'opaque') { const c = n.clone(); caches.open(V).then(x => x.put(e.request, c)); }
      return n;
    })));
  }
});
