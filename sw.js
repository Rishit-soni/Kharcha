// Kharcha service worker: opens instantly from cache, works offline,
// and refreshes itself in the background for next launch.
// Bump CACHE whenever you change a file so installed copies update.
const CACHE = 'kharcha-v2.0.0';
const ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './icons.js',
  './manifest.webmanifest',
  './fonts/bricolage-latin.woff2',
  './fonts/bricolage-rupee.woff2',
  './fonts/geist-latin.woff2',
  './fonts/geist-rupee.woff2',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/maskable-512.png',
  './img/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Page loads (including ?amt=… quick-add links): cached shell first, refresh behind.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const fresh = fetch(req).then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); }
          return res;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // Static files: cache first, fall back to network and keep a copy.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
