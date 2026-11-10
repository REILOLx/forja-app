const CACHE_NAME = 'forja-cache-v19';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/updates.js',
  './js/router.js',
  './js/store.js',
  './js/icons.js',
  './js/finance-model.js',
  './js/hub-model.js',
  './js/reading-model.js',
  './js/views/menu.js',
  './js/views/cursos.js',
  './js/views/negocios.js',
  './js/views/treino-plano.js',
  './js/ui.js',
  './js/views/financeiro-settings.js',
  './js/views/finance-analysis.js',
  './js/views/receita.js',
  './js/views/investimentos.js',
  './js/supabase-client.js',
  './js/views/login.js',
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(
      ASSETS.map(asset => new Request(new URL(asset, self.location.href), { cache: 'reload' }))
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('forja-cache-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first para arquivos locais. Serviços externos (como autenticação)
// e requisições de escrita ficam sob responsabilidade do navegador.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-store' });
      if (res.ok) {
        const copy = res.clone();
        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {})
        );
      }
      return res;
    } catch {
      const cache = await caches.open(CACHE_NAME).catch(() => null);
      const cached = cache && await cache.match(req).catch(() => null);
      if (cached) return cached;
      if (req.mode === 'navigate' && cache) {
        const page = await cache.match('./index.html').catch(() => null);
        if (page) return page;
      }
      return new Response('Forja indisponível. Verifique a conexão e tente novamente.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
