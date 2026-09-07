const CACHE_NAME = 'forja-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/views/home.js',
  './js/views/rotina.js',
  './js/views/bloqueio.js',
  './js/views/treino.js',
  './js/views/verificacao.js',
  './js/views/metas.js',
  './js/views/estudos.js',
  './js/views/financeiro.js',
  './js/views/pagamentos.js',
  './js/views/lancar-gasto.js',
  './js/views/cartoes.js',
  './js/views/emprestimos.js',
  './js/views/config.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first para tudo: sempre tenta buscar a versão mais nova primeiro
// (evita telas desatualizadas ao publicar mudanças) e só cai no cache
// (pra funcionar offline) se a rede falhar.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
