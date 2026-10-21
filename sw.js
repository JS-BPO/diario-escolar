const CACHE = 'diario-escolar-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // cada arquivo separado: se um ícone faltar, a instalação não falha inteira
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Página: busca a versão nova primeiro (atualizações chegam sozinhas); sem internet, usa o cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais arquivos (ícones, fonte): cache primeiro, atualiza em segundo plano
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone(); // clona ANTES de devolver a resposta
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
