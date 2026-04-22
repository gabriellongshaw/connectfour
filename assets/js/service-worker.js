const CACHE = 'connect-four-v5';

const STATIC = [
  '/',
  '/index.html',
  '/assets/css/variables.css',
  '/assets/css/main.css',
  '/assets/css/fonts.css',
  '/assets/css/animations.css',
  '/assets/css/responsive.css',
  '/assets/css/components/screens.css',
  '/assets/css/components/buttons.css',
  '/assets/css/components/board.css',
  '/assets/css/components/multiplayer.css',
  '/assets/css/components/modal.css',
  '/assets/images/favicon/manifest.json',
  '/assets/images/favicon/favicon-192x192.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});