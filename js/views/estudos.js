import { icon } from '../icons.js';
import { todayISO, formatHM } from '../store.js';

let editingGoal = false;
let editingTrack = false;
let editingBook = false;

export function render(state) {
  const iso = todayISO();
  const minutesToday = state.readingLog[iso] || 0;
  const goalMet = minutesToday >= state.dailyReadingGoalMin;
  const book = state.currentBook;
  const bookPct = book.pageTotal ? Math.round((book.pageCurrent / book.pageTotal) * 100) : 0;
  const track = state.studyTrack;
  const trackPct = track.totalModules ? Math.round((track.module / track.totalModules) * 100) : 0;

  return `
    <div><div class="eyebrow">Conhecimento que se acumula</div><h1>Estudos</h1><p class="page-description">Um pouco de leitura. Um passo na sua trilha.</p></div>

    <div>
      <div class="row" style="margin-bottom:10px;">
        <span class="section-label" style="margin:0;">Meta diária</span>
        <button id="btn-edit-goal" style="background:none;border:none;color:var(--text-dim-2);display:flex;">${icon.gear()}</button>
      </div>
      <div class="card" style="border-color:var(--cyan);">
        ${editingGoal ? `
          <div class="row gap-8">
            <input type="number" id="goal-minutes" value="${state.dailyReadingGoalMin}" style="flex:1;">
            <span class="muted" style="font-size:12.5px;">minutos por dia</span>
          </div>
        ` : `
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
        `}
      </div>
    </div>

    <div>
      <div class="row" style="margin-bottom:10px;">
        <span class="section-label" style="margin:0;">Trilha de estudo</span>
        <button id="btn-edit-track" style="background:none;border:none;color:var(--text-dim-2);display:flex;">${icon.gear()}</button>
      </div>
      <div class="card">
        ${editingTrack ? `
          <div class="stack gap-8">
            <input type="text" id="track-title" value="${track.title}" placeholder="Nome da trilha">
            <input type="text" id="track-topic" value="${track.nextTopic}" placeholder="Próximo módulo/tópico">
            <div class="row gap-8">
              <input type="number" id="track-module" value="${track.module}" placeholder="Módulo atual" style="flex:1;">
              <input type="number" id="track-total" value="${track.totalModules}" placeholder="Total de módulos" style="flex:1;">
            </div>
          </div>
        ` : `
          <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${track.title} — Módulo ${track.module}</div>
          <div class="muted" style="font-size:12.5px;margin-bottom:12px;">Próximo: ${track.nextTopic}</div>
          <div class="progress-track thin"><div class="progress-fill" style="width:${trackPct}%;background:var(--cyan);"></div></div>
          <div class="muted" style="font-size:11.5px;margin-top:6px;">Módulo ${track.module} de ${track.totalModules}</div>
        `}
      </div>
    </div>

    <div>
      <div class="row" style="margin-bottom:10px;">
        <span class="section-label" style="margin:0;">Leitura atual</span>
        <button id="btn-edit-book" style="background:none;border:none;color:var(--text-dim-2);display:flex;">${icon.gear()}</button>
      </div>
      <div class="card">
        ${editingBook ? `
          <div class="stack gap-8">
            <input type="text" id="book-title" value="${book.title}" placeholder="Título do livro">
            <input type="text" id="book-author" value="${book.author}" placeholder="Autor">
            <div class="row gap-8">
              <input type="number" id="book-page-current" value="${book.pageCurrent}" placeholder="Página atual" style="flex:1;">
              <input type="number" id="book-page-total" value="${book.pageTotal}" placeholder="Total de páginas" style="flex:1;">
            </div>
          </div>
        ` : `
          <div class="row gap-14">
            <div style="width:46px;height:64px;border-radius:5px;background:var(--ember-bg);flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:700;">${book.title}</div>
              <div class="muted" style="font-size:12px;margin-bottom:8px;">${book.author}</div>
              <div class="progress-track" style="height:5px;"><div class="progress-fill" style="width:${bookPct}%;background:var(--ember);"></div></div>
              <div class="muted" style="font-size:11px;margin-top:4px;">Pág. ${book.pageCurrent} de ${book.pageTotal}</div>
            </div>
          </div>
        `}
      </div>
    </div>

    <div class="card stack gap-10"><h2>Registrar progresso</h2><div class="form-grid"><label class="field">Página atual<input id="quick-page" type="number" min="0" max="${book.pageTotal || 100000}" value="${book.pageCurrent}"></label><label class="field">Módulos concluídos<input id="quick-module" type="number" min="0" max="${track.totalModules}" value="${track.module}"></label></div><button id="save-study-progress" class="btn btn-primary">Salvar progresso</button><p class="hint">Os minutos de leitura são registrados na meta diária acima.</p></div>
    <div>
      <div class="row" style="margin-bottom:10px;">
        <span class="section-label" style="margin:0;">Na fila</span>
      </div>
      <div class="stack gap-8">
        ${state.bookQueue.map((b, i) => `
          <div class="row card card-tight">
            <span style="font-size:13.5px;">${b.title}</span>
            <span class="row gap-8" style="width:auto;">
              <button data-start-book="${i}" style="background:none;border:none;color:var(--ember);font-size:11px;font-weight:700;">começar</button>
              <button data-remove-book="${i}" style="background:none;border:none;color:var(--text-dim-2);display:flex;width:13px;height:13px;">${icon.trash()}</button>
            </span>
          </div>
        `).join('') || '<div class="muted" style="font-size:13px;">Fila vazia.</div>'}
        <div class="row gap-8" style="margin-top:4px;">
          <input type="text" id="new-book-title" placeholder="Adicionar livro à fila..." style="flex:1;">
          <button id="btn-add-book" style="background:var(--surface-3);border:none;border-radius:10px;color:var(--text);display:flex;padding:0 14px;">${icon.plus()}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(container, { render }) {
  const store = window.__forja.store;
  container.querySelector('#save-study-progress').addEventListener('click', () => {
    const page = container.querySelector('#quick-page'), module = container.querySelector('#quick-module');
    if (!page.reportValidity() || !module.reportValidity()) return;
    store.updateCurrentBook({ pageCurrent: Number(page.value) });
    store.updateStudyTrack({ module: Number(module.value) }); render();
  });

  const goalBtn = container.querySelector('#btn-edit-goal');
  if (goalBtn) goalBtn.addEventListener('click', () => { editingGoal = !editingGoal; render(); });
  const goalInput = container.querySelector('#goal-minutes');
  if (goalInput) goalInput.addEventListener('change', () => {
    store.setDailyReadingGoal(parseInt(goalInput.value || '0', 10));
    editingGoal = false;
    render();
  });

  const trackBtn = container.querySelector('#btn-edit-track');
  if (trackBtn) trackBtn.addEventListener('click', () => { editingTrack = !editingTrack; render(); });
  ['track-title', 'track-topic', 'track-module', 'track-total'].forEach((id) => {
    const el = container.querySelector('#' + id);
    if (el) el.addEventListener('change', () => {
      store.updateStudyTrack({
        title: container.querySelector('#track-title').value,
        nextTopic: container.querySelector('#track-topic').value,
        module: parseInt(container.querySelector('#track-module').value || '0', 10),
        totalModules: parseInt(container.querySelector('#track-total').value || '0', 10),
      });
    });
  });

  const bookBtn = container.querySelector('#btn-edit-book');
  if (bookBtn) bookBtn.addEventListener('click', () => { editingBook = !editingBook; render(); });
  ['book-title', 'book-author', 'book-page-current', 'book-page-total'].forEach((id) => {
    const el = container.querySelector('#' + id);
    if (el) el.addEventListener('change', () => {
      store.updateCurrentBook({
        title: container.querySelector('#book-title').value,
        author: container.querySelector('#book-author').value,
        pageCurrent: parseInt(container.querySelector('#book-page-current').value || '0', 10),
        pageTotal: parseInt(container.querySelector('#book-page-total').value || '0', 10),
      });
    });
  });

  container.querySelectorAll('[data-start-book]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.startBookFromQueue(parseInt(btn.dataset.startBook, 10));
      render();
    });
  });
  container.querySelectorAll('[data-remove-book]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.removeBookFromQueue(parseInt(btn.dataset.removeBook, 10));
      render();
    });
  });
  const addBookBtn = container.querySelector('#btn-add-book');
  if (addBookBtn) addBookBtn.addEventListener('click', () => {
    const input = container.querySelector('#new-book-title');
    const title = input.value.trim();
    if (!title) return;
    store.addBookToQueue(title);
    render();
  });
}
