// TCG Pokédex service worker: keeps the app and any card pictures you've seen available offline.
// Bump VERSION whenever index.html changes so phones pick up the new one.
const VERSION = 'v54';
const SHELL = 'tcg-shell-' + VERSION;
const IMAGES = 'tcg-images';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('tcg-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // card pictures and set logos, plus the text-reader files for the camera scan: saved copy first, otherwise fetch and save
  if (url.hostname === 'assets.tcgdex.net' || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'tessdata.projectnaptha.com') {
    e.respondWith(caches.open(IMAGES).then(async c => {
      const hit = await c.match(e.request);
      // a picture saved from a plain <img> is opaque; the card scanner asks with CORS so it can read the pixels, so refetch for it
      if (hit && !(hit.type === 'opaque' && e.request.mode === 'cors')) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => new Response('', { status: 504 })));
    return;
  }

  // the card-picture fingerprint file (a few MB, renamed when rebuilt): fetch once, keep
  if (url.origin === location.origin && url.pathname.endsWith('.fp')) {
    e.respondWith(caches.open(IMAGES).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => new Response('', { status: 504 })));
    return;
  }
  // the app itself: try the network so updates arrive, fall back to the saved copy offline
  if (url.origin === location.origin) {
    // bypass the host's 10-minute cache so a freshly uploaded index.html shows up on the next open
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) caches.open(SHELL).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
  }
  // everything else (TCGdex API, Firebase) goes straight to the network
});
