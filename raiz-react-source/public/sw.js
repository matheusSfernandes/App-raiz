const CACHE = 'raiz-v1';
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  // network-first, sem cache agressivo (dados sempre vêm do Supabase)
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
