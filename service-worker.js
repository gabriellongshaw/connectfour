const CACHE = 'connect-four-v10';

const STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline/',
  '/offline/index.html',
  '/bot/',
  '/bot/index.html',
  '/bot/game/',
  '/bot/game/index.html',
  '/online/',
  '/online/index.html',
  '/online/create-game/',
  '/online/create-game/index.html',
  '/online/join-game/',
  '/online/join-game/index.html',
  '/online/game/',
  '/online/game/index.html',
  '/assets/fonts/ProductSans-Regular.ttf',
  '/assets/css/variables.css',
  '/assets/css/fonts.css',
  '/assets/css/main.css',
  '/assets/css/animations.css',
  '/assets/css/responsive.css',
  '/assets/css/components/screens.css',
  '/assets/css/components/buttons.css',
  '/assets/css/components/board.css',
  '/assets/css/components/multiplayer.css',
  '/assets/css/components/modal.css',
  '/assets/images/favicon/favicon-192x192.png',
  '/service-worker.js',
  '/assets/js/core/sw.js',
  '/assets/js/core/firebase.js',
  '/assets/js/core/icons.js',
  '/assets/js/core/theme.js',
  '/assets/js/core/utils.js',
  '/assets/js/core/transition.js',
  '/assets/js/components/board.js',
  '/assets/js/components/confetti.js',
  '/assets/js/components/modal.js',
  '/assets/js/components/qrScanner.js',
  '/assets/js/modes/bot.js',
  '/assets/js/modes/offline.js',
  '/assets/js/modes/online.js',
  '/assets/js/pages/home.js',
  '/assets/js/pages/offline.js',
  '/assets/js/pages/botDifficulty.js',
  '/assets/js/pages/botGame.js',
  '/assets/js/pages/onlineMenu.js',
  '/assets/js/pages/createGame.js',
  '/assets/js/pages/joinGame.js',
  '/assets/js/pages/onlineGame.js',
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