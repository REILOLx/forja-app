import { icon } from '../icons.js';

export function render() {
  return `
    <div class="row" style="gap:12px;justify-content:flex-start;">
      <a href="#/home" style="width:20px;height:20px;color:var(--text-dim);display:flex;">${icon.back()}</a>
      <div class="fjc" style="font-size:18px;font-weight:700;">Ajustes e backup</div>
    </div>

    <div class="card" style="border-color:var(--cyan);">
      <div style="font-size:14px;font-weight:700;margin-bottom:8px;">Onde ficam seus dados</div>
      <div class="muted" style="font-size:13px;line-height:1.5;">
        Tudo (metas, rotina, treinos, leitura, finanças) fica salvo só neste navegador,
        neste iPhone — não existe conta nem servidor. Isso significa que, se o iPhone
        for trocado, resetado, ou o app apagado dos dados do Safari, essas informações
        se perdem. Não há sincronização automática entre aparelhos.
      </div>
    </div>

    <div>
      <div class="section-label">Backup manual</div>
      <div class="stack gap-8">
        <button id="btn-export" class="btn btn-primary" style="display:flex;align-items:center;justify-content:center;gap:8px;">
          <span style="width:18px;height:18px;display:flex;">${icon.download()}</span> Exportar meus dados
        </button>
        <div class="muted" style="font-size:12px;">
          Gera um arquivo .json com tudo. Salve no Arquivos, iCloud Drive, ou mande pra você
          mesmo — é o que te devolve os dados se algo der errado.
        </div>

        <label class="btn-ghost" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px;cursor:pointer;">
          <span style="width:16px;height:16px;display:flex;">${icon.upload()}</span> Importar backup
          <input type="file" id="import-input" accept="application/json" style="display:none;">
        </label>
        <div id="import-status" class="muted" style="font-size:12px;"></div>
      </div>
    </div>

    <div>
      <div class="section-label" style="color:var(--red);">Zona de risco</div>
      <button id="btn-reset" class="btn" style="background:var(--red-bg);color:var(--red);border:1px solid var(--red-border);display:flex;align-items:center;justify-content:center;gap:8px;">
        <span style="width:16px;height:16px;display:flex;">${icon.trash()}</span> Apagar tudo e recomeçar
      </button>
    </div>
  `;
}

export function afterRender(container) {
  const { store, navigate } = window.__forja;

  container.querySelector('#btn-export').addEventListener('click', () => {
    const data = store.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forja-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const status = container.querySelector('#import-status');
  container.querySelector('#import-input').addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        store.importData(reader.result);
        status.textContent = 'Backup restaurado. Voltando ao início…';
        status.style.color = 'var(--green)';
        setTimeout(() => navigate('/home'), 800);
      } catch (e) {
        status.textContent = e.message || 'Não foi possível ler esse arquivo.';
        status.style.color = 'var(--red)';
      }
    };
    reader.readAsText(file);
  });

  container.querySelector('#btn-reset').addEventListener('click', () => {
    if (window.confirm('Isso apaga tudo (metas, rotina, treinos, finanças) e volta ao estado inicial. Não dá pra desfazer. Continuar?')) {
      store.resetApp();
      navigate('/home');
    }
  });
}
