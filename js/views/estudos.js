import { todayISO, formatHM } from '../store.js';

export function render(state) {
  const iso = todayISO();
  const minutesToday = state.readingLog[iso] || 0;
  const goalMet = minutesToday >= state.dailyReadingGoalMin;
  const book = state.currentBook;
  const bookPct = Math.round((book.pageCurrent / book.pageTotal) * 100);
  const track = state.studyTrack;
  const trackPct = Math.round((track.module / track.totalModules) * 100);

  return `
    <div class="fjc" style="font-size:22px;font-weight:700;">Estudos</div>

    <div>
      <div class="section-label">Meta diária</div>
      <div class="card" style="border-color:var(--cyan);">
        <div class="row">
          <div class="stack">
            <span style="font-size:14px;font-weight:700;">${state.dailyReadingGoalMin} minutos de leitura</span>
            <span class="muted" style="font-size:12px;margin-top:2px;">Hoje: ${formatHM(minutesToday)}${goalMet ? ' · meta batida' : ''}</span>
          </div>
          <span class="check ${goalMet ? 'checked' : ''}" style="border-color:var(--cyan);${goalMet ? 'background:var(--cyan);border-color:var(--cyan);' : ''}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="oklch(0.16 0.05 200)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          </span>
        </div>
        <div class="row gap-8" style="margin-top:14px;">
          ${[5, 15, 20].map((mins) => `
            <button data-action="logReading" data-minutes="${mins}" data-date="${iso}"
              style="flex:1;padding:9px 0;border-radius:8px;background:var(--surface-3);border:none;color:var(--text);font-size:12.5px;font-weight:600;">+${mins} min</button>
          `).join('')}
        </div>
      </div>
    </div>

    <div>
      <div class="section-label">Trilha de estudo</div>
      <div class="card">
        <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${track.title} — Módulo ${track.module}</div>
        <div class="muted" style="font-size:12.5px;margin-bottom:12px;">Próximo: ${track.nextTopic}</div>
        <div class="progress-track thin"><div class="progress-fill" style="width:${trackPct}%;background:var(--cyan);"></div></div>
        <div class="muted" style="font-size:11.5px;margin-top:6px;">Módulo ${track.module} de ${track.totalModules}</div>
      </div>
    </div>

    <div>
      <div class="section-label">Leitura atual</div>
      <div class="card row gap-14">
        <div style="width:46px;height:64px;border-radius:5px;background:oklch(0.3 0.06 55);flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">${book.title}</div>
          <div class="muted" style="font-size:12px;margin-bottom:8px;">${book.author}</div>
          <div class="progress-track" style="height:5px;"><div class="progress-fill" style="width:${bookPct}%;background:var(--ember);"></div></div>
          <div class="muted" style="font-size:11px;margin-top:4px;">Pág. ${book.pageCurrent} de ${book.pageTotal}</div>
        </div>
      </div>
    </div>

    <div>
      <div class="section-label">Na fila</div>
      <div class="stack gap-8">
        ${state.bookQueue.map((b) => `
          <div class="row card card-tight">
            <span style="font-size:13.5px;">${b.title}</span>
            <span style="font-size:11px;color:var(--text-dim-2);">Não iniciado</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
