// GPS.dev Console — Service Worker v5 (uso offline)
const CACHE = 'gps-console-v5';
const LOCAIS = ['./', './index.html', './style.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(LOCAIS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Nunca interceptar chamadas à API: dados sempre vêm da rede.
  if (url.pathname.startsWith('/api/')) return;

  // Arquivos do próprio painel: rede primeiro (pega atualização), cache se estiver offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const c = res.clone(); caches.open(CACHE).then(ch => ch.put(req, c)); }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
    return;
  }

  // Ícones/fontes externos (unpkg): cache primeiro, guarda na primeira visita online.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(CACHE).then(ch => ch.put(req, c)); }
      return res;
    }).catch(() => Response.error()))
  );
});
