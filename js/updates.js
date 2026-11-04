// Carrega antes do login: a atualização não depende do Supabase.
(() => {
  if (!('serviceWorker' in navigator)) return;
  const wasControlled = !!navigator.serviceWorker.controller;
  let registration;
  let lastCheck = 0;
  let hasEdits = false;
  let reloading = false;

  document.addEventListener('input', () => { hasEdits = true; });
  window.addEventListener('hashchange', () => { hasEdits = false; });

  function applyUpdate() {
    if (reloading) return;
    if (!hasEdits) {
      reloading = true;
      window.location.reload();
      return;
    }
    if (document.getElementById('app-update')) return;
    const banner = document.createElement('div');
    banner.id = 'app-update';
    banner.className = 'app-update';
    banner.setAttribute('role', 'status');
    const text = document.createElement('span');
    text.textContent = 'Nova versão disponível. Conclua o que está preenchendo e atualize.';
    const button = document.createElement('button');
    button.className = 'btn btn-primary';
    button.textContent = 'Atualizar';
    button.addEventListener('click', () => {
      reloading = true;
      window.location.reload();
    });
    banner.append(text, button);
    document.body.append(banner);
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Na primeira instalação, os arquivos da página já são atuais.
    if (wasControlled) applyUpdate();
  });

  async function checkForUpdates(force = false) {
    if (!registration || document.visibilityState === 'hidden') return;
    const now = Date.now();
    if (!force && now - lastCheck < 60000) return;
    lastCheck = now;
    try { await registration.update(); } catch { /* sem rede: mantém a versão atual */ }
  }

  async function start() {
    try {
      registration = await navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' });
      await checkForUpdates(true);
    } catch { /* O app continua funcionando se o navegador impedir o cache offline. */ }
  }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdates();
  });
  window.addEventListener('focus', () => checkForUpdates());
  window.addEventListener('online', () => checkForUpdates(true));
  setInterval(() => checkForUpdates(), 5 * 60 * 1000);
})();
