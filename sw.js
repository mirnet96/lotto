const CACHE_NAME = 'lotto-plus-v1';
const ASSETS = [
  '/lotto/',
  '/lotto/index.html',
  '/lotto/style.css',
  '/lotto/js/state.js' 
  '/lotto/js/storage.js' 
  '/lotto/js/ui.js' 
  '/lotto/js/generator.js' 
  '/lotto/js/qr.js' 
  '/lotto/js/history.js' 
  '/lotto/js/stats.js' 
  '/lotto/js/init.js' 


];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
