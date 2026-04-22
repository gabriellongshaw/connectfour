const CACHE = 'connect-four-v7';

const STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/fonts/ProductSans-Regular.ttf',
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
  '/assets/images/favicon/favicon-192x192.png',
  '/assets/js/main.js',
  '/assets/js/core/firebase.js',
  '/assets/js/core/theme.js',
  '/assets/js/core/utils.js',
  '/assets/js/components/board.js',
  '/assets/js/components/confetti.js',
  '/assets/js/modes/offline.js',
  '/assets/js/modes/online.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(STATIC.map(url => c.add(url)))
    )
  );
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