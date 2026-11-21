// Raiz: service worker (v3: abre sem internet + lembretes push)
// - Páginas: rede primeiro; sem internet, usa a última versão guardada do app.
// - Arquivos do app (/assets, ícones, fontes): guardados no aparelho na primeira vez.
// - Dados do Supabase não passam por aqui (a camada offline do app cuida deles).
const CACHE = 'raiz-app-v3';
const CORE = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32.png', '/icon.svg'];

function assetsIn(html) {
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]);
}

// Guarda a página principal e os arquivos que ela usa; apaga arquivos de versões antigas
async function cacheShell(res) {
  const cache = await caches.open(CACHE);
  const html = await res.clone().text();
  await cache.put('/', res.clone());
  const assets = assetsIn(html);
  await Promise.all(assets.map(async a => { if (!(await cache.match(a))) { try { await cache.add(a); } catch { /* tenta depois */ } } }));
  const keep = new Set(assets);
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname;
    if (path.startsWith('/assets/') && !keep.has(path)) await cache.delete(req);
  }
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.slice(1).map(u => cache.add(u).catch(() => {})));
    try { const res = await fetch('/', { cache: 'no-store' }); if (res.ok) await cacheShell(res); } catch { /* sem internet na instalação */ }
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) e.waitUntil(cacheShell(res.clone()));
        return res;
      } catch {
        return (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  if ((sameOrigin && (url.pathname.startsWith('/assets/') || CORE.includes(url.pathname))) || isFont) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit && (url.pathname.startsWith('/assets/') || isFont)) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { const c = await caches.open(CACHE); c.put(req, res.clone()); }
        return res;
      } catch {
        return hit || Response.error();
      }
    })());
  }
});

// Lembrete enviado pelo servidor (função send-reminders)
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Raiz', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: data.tag,
    data: { url: data.url || '/' },
  }));
});

// Toque na notificação: abre (ou foca) o app na tela certa
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.location.origin)) {
        await c.focus();
        c.postMessage({ type: 'open', url });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
