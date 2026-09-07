import { icon } from '../icons.js';
import { todayISO, tasksForDate, isBlockDone, formatDateLong, weekdayLabel } from '../store.js';

let selectedDate = null; // ISO; null = hoje
let showAddForm = false;

function getSelectedDate() {
  return selectedDate || todayISO();
}
function shiftDate(iso, delta) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return todayISO(d);
}

export function render() {
  const iso = getSelectedDate();
  const d = new Date(iso + 'T12:00:00');
  const isToday = iso === todayISO();
  const tasks = tasksForDate(iso);

  return `
    <div class="row">
      <div class="fjc" style="font-size:22px;font-weight:700;">Rotina</div>
      <button id="btn-toggle-add" class="btn-ghost" style="width:auto;padding:8px 14px;font-size:12.5px;">${showAddForm ? 'Fechar' : '+ Tarefa'}</button>
    </div>

    <div class="row card card-tight">
      <button id="btn-prev-day" style="background:none;border:none;color:var(--text-dim);display:flex;padding:6px;">${icon.back()}</button>
      <div class="stack" style="align-items:center;flex:1;">
        <span style="font-size:14px;font-weight:700;">${formatDateLong(d)}</span>
        ${!isToday ? `<button id="btn-today" style="background:none;border:none;color:var(--ember);font-size:11.5px;padding:2px;">ir para hoje</button>` : ''}
      </div>
      <button id="btn-next-day" style="background:none;border:none;color:var(--text-dim);display:flex;padding:6px;transform:scaleX(-1);">${icon.back()}</button>
    </div>

    ${showAddForm ? renderAddForm(iso) : ''}

    ${tasks.length === 0 ? `<div class="card muted" style="text-align:center;">Nada na agenda deste dia.</div>` : `
    <div class="timeline">
      ${tasks.map((b) => renderTask(b, iso)).join('')}
    </div>`}
  `;
}

function renderTask(b, iso) {
  const done = b.type !== 'livre' && isBlockDone(iso, b.id);
  let dotColor = 'oklch(0.4 0.02 260)';
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const isCurrent = iso === todayISO() && hhmm >= b.start && hhmm <= b.end;
  if (done) dotColor = 'var(--green)';
  else if (b.type === 'foco' || b.type === 'livre') dotColor = 'var(--red)';
  else if (isCurrent) dotColor = 'var(--cyan)';

  const recurTag = b.recurrence === 'weekly' ? 'recorrente' : b.recurrence === 'daily' ? 'todo dia' : 'só hoje';

  return `
    <div class="timeline-item">
      <div class="timeline-dot" style="background:${dotColor};"></div>
      <div class="row" style="margin-bottom:3px;">
        <span class="timeline-time">${b.start} – ${b.end} · ${recurTag}</span>
        <span class="row gap-8" style="width:auto;">
          ${b.recurrence !== 'once' ? `<button data-action="skipTaskToday" data-task-id="${b.id}" data-date="${iso}" title="Remover só hoje" style="background:none;border:none;color:var(--text-dim-2);display:flex;padding:2px;width:15px;height:15px;">${icon.calendarOff()}</button>` : ''}
          <button data-action="deleteTaskRule" data-task-id="${b.id}" data-date="${iso}" data-recurrence="${b.recurrence}" title="Excluir" style="background:none;border:none;color:var(--text-dim-2);display:flex;padding:2px;width:15px;height:15px;">${icon.trash()}</button>
        </span>
      </div>
      ${b.type === 'livre' ? `
        <div class="card card-tight" style="background:var(--red-bg);border-color:var(--red-border);">
          <span style="font-size:14px;font-weight:600;color:oklch(0.85 0.1 25);">${b.title}</span>
        </div>` : `
        <button data-action="toggleBlock" data-id="${b.id}" data-date="${iso}"
          class="check-row ${done ? 'done' : ''}" style="width:100%;text-align:left;border:1px solid ${b.type === 'foco' && !done ? 'var(--red-border)' : 'var(--border)'};">
          <span class="check ${done ? 'checked' : ''}">${icon.check()}</span>
          <span class="label">${b.title}</span>
          ${b.type === 'foco' && !done ? `<span style="width:16px;height:16px;color:var(--red);display:flex;">${icon.lock()}</span>` : ''}
        </button>`}
    </div>`;
}

function renderAddForm(iso) {
  const dow = new Date(iso + 'T12:00:00').getDay();
  return `
    <div class="card stack gap-8">
      <div class="section-label" style="margin:0;">Nova tarefa</div>
      <input type="text" data-field="title" placeholder="Título">
      <div class="row gap-8">
        <input type="text" data-field="start" placeholder="Início (HH:MM)" value="08:00" style="flex:1;">
        <input type="text" data-field="end" placeholder="Fim (HH:MM)" value="09:00" style="flex:1;">
      </div>
      <select data-field="type">
        <option value="rotina">Rotina</option>
        <option value="foco">Foco (bloqueia redes)</option>
        <option value="treino">Treino</option>
        <option value="estudo">Estudo</option>
        <option value="livre">Janela livre (redes)</option>
      </select>
      <select id="add-task-recurrence" data-field="recurrence">
        <option value="once">Só neste dia</option>
        <option value="daily">Todos os dias</option>
        <option value="weekly" selected>Dias da semana específicos</option>
      </select>
      <div id="add-task-days" class="row gap-8" style="flex-wrap:wrap;justify-content:flex-start;">
        ${[0, 1, 2, 3, 4, 5, 6].map((d) => `
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;background:var(--surface-3);padding:6px 8px;border-radius:8px;">
            <input type="checkbox" data-day="${d}" ${d === dow ? 'checked' : ''}> ${weekdayLabel(d).slice(0, 3)}
          </label>`).join('')}
      </div>
      <button data-action="saveNewTask" data-date="${iso}" class="btn btn-primary">Salvar tarefa</button>
    </div>
  `;
}

export function afterRender(container, { render }) {
  container.querySelector('#btn-toggle-add').addEventListener('click', () => {
    showAddForm = !showAddForm;
    render();
  });
  container.querySelector('#btn-prev-day').addEventListener('click', () => {
    selectedDate = shiftDate(getSelectedDate(), -1);
    render();
  });
  container.querySelector('#btn-next-day').addEventListener('click', () => {
    selectedDate = shiftDate(getSelectedDate(), 1);
    render();
  });
  const todayBtn = container.querySelector('#btn-today');
  if (todayBtn) todayBtn.addEventListener('click', () => { selectedDate = null; render(); });

  const recSel = container.querySelector('#add-task-recurrence');
  const daysBox = container.querySelector('#add-task-days');
  if (recSel && daysBox) {
    const update = () => daysBox.classList.toggle('hidden-box', recSel.value !== 'weekly');
    recSel.addEventListener('change', update);
    update();
  }
}

export function closeAddForm() {
  showAddForm = false;
}
