// Bewaart de app op het toestel, zodat hij ook zonder internet werkt.
// Verhoog VERSION bij elke nieuwe versie.
const VERSION = 'kasten-v221';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'logo.png',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/model.js', 'js/mpr.js', 'js/nesting.js', 'js/core.js', 'js/viewer.js', 'js/drawing.js', 'js/schets.js', 'js/app.js',
  'vendor/three.min.js', 'vendor/OrbitControls.js', 'vendor/jspdf.umd.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION)
    .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(hit => hit || fetch(event.request).catch(() =>
    event.request.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
