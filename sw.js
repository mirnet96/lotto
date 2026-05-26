const CACHE_NAME = 'lotto-plus-v1.0.1';
const ASSETS = [
  '/lotto/',
  '/lotto/index.html',
  '/lotto/style.css',
  '/lotto/js/init.js',
  '/lotto/js/state.js',
  '/lotto/js/storage.js',
  '/lotto/js/ui.js',
  '/lotto/js/generator.js',
  '/lotto/js/qr.js?v=20260526-001',
  '/lotto/js/history.js',
  '/lotto/js/stats.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
                  .map((name) => caches.delete(name))
      );
    })
  );
});
