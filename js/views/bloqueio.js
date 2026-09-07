import { icon } from '../icons.js';
import {
  todayISO, currentBlock, socialLockActive, emergencyUsedToday, todaysBlocks,
} from '../store.js';

function nextFreeWindow(now) {
  const hhmm = now.toTimeString().slice(0, 5);
  return todaysBlocks(now).find((b) => b.type === 'livre' && b.end > hhmm) || null;
}

function minutesUntil(hhmm, now) {
  const [h, m] = hhmm.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  let diff = Math.round((target - now) / 60000);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function render(state) {
  const now = new Date();
  const iso = todayISO(now);
  const locked = socialLockActive(now);
  const block = currentBlock(now);
  const freeWindow = todaysBlocks(now).find((b) => b.type === 'livre');
  const nextFree = nextFreeWindow(now);
  const usedEmergency = emergencyUsedToday(iso);

  const mins = nextFree ? minutesUntil(nextFree.start, now) : null;
  const h = mins !== null ? Math.floor(mins / 60) : 0;
  const m = mins !== null ? mins % 60 : 0;

  return `
    <div style="padding:34px 4px 10px 4px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px;">
      <a href="#/home" style="align-self:flex-start;width:20px;height:20px;color:var(--text-dim);display:flex;">${icon.back()}</a>

      <div style="width:64px;height:64px;border-radius:50%;background:${locked ? 'var(--red-bg)' : 'var(--green-bg)'};border:1px solid ${locked ? 'var(--red-border)' : 'oklch(0.4 0.1 145)'};display:flex;align-items:center;justify-content:center;">
        <span style="width:28px;height:28px;color:${locked ? 'var(--red)' : 'var(--green)'};display:flex;">${icon.lock()}</span>
      </div>

      <div>
        <div class="fjc" style="font-size:22px;font-weight:700;">${locked ? 'Redes bloqueadas' : 'Redes liberadas'}</div>
        <div class="muted" style="font-size:14px;margin-top:8px;max-width:270px;">
          ${locked
            ? (block && block.type === 'foco' ? 'Ainda não. O foco desse bloco vale mais do que o scroll.' : 'Fora da janela livre de hoje.')
            : 'Você cumpriu o protocolo — aproveite a janela livre.'}
        </div>
      </div>

      ${usedEmergency ? `
        <div class="card" style="width:100%;background:var(--red-bg);border-color:var(--red-border);text-align:left;">
          <div style="font-size:12.5px;font-weight:700;color:oklch(0.85 0.1 25);">Acesso de emergência usado hoje</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">Sua sequência de hoje foi quebrada.</div>
        </div>
      ` : ''}

      ${block ? `
        <div class="card" style="width:100%;text-align:left;">
          <div class="section-label">Bloco atual</div>
          <div style="font-size:15px;font-weight:700;margin-bottom:14px;">${block.title} · ${block.start}–${block.end}</div>
          ${nextFree && locked ? `
            <div class="fjc" style="font-size:36px;font-weight:700;color:var(--red);">${h}:${String(m).padStart(2, '0')}</div>
            <div class="muted" style="font-size:12px;margin-top:4px;">até a próxima janela livre</div>
          ` : ''}
        </div>
      ` : ''}

      <div style="width:100%;text-align:left;">
        <div class="section-label">Apps sob controle</div>
        <div class="stack gap-8">
          ${state.lockApps.map((app) => `
            <div class="row card card-tight">
              <span style="font-size:13.5px;font-weight:600;">${app.name}</span>
              <span class="pill ${app.blocked && locked ? 'pill-red' : 'pill-green'}">${app.blocked ? (locked ? 'Bloqueado' : 'Liberado') : 'Sem restrição'}</span>
            </div>
          `).join('')}
        </div>
      </div>

      ${freeWindow ? `
        <div class="row card card-tight" style="width:100%;border:1px dashed oklch(0.4 0.08 55);background:oklch(0.19 0.03 55 / 0.4);">
          <div class="stack" style="text-align:left;">
            <span style="font-size:12.5px;font-weight:700;color:oklch(0.8 0.1 55);">Janela livre de hoje</span>
            <span class="muted" style="font-size:12px;">${freeWindow.start} – ${freeWindow.end}</span>
          </div>
          <span style="width:18px;height:18px;color:var(--ember);display:flex;">${icon.clock()}</span>
        </div>
      ` : ''}
    </div>

    <div style="padding:10px 4px 6px 4px;">
      <button data-action="emergencyAccess" data-date="${iso}" class="btn-link" style="width:100%;">Preciso de acesso de emergência</button>
    </div>
  `;
}
