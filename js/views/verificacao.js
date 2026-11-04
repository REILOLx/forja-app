import { icon } from '../icons.js';
import { todayISO, todaysWorkoutPlan } from '../store.js';

export function render(state) {
  const now = new Date();
  const iso = todayISO(now);
  const plan = todaysWorkoutPlan(now);
  const log = state.workoutLog[iso] || { exercisesDone: [] };

  if (!plan) {
    return `
      <div class="row" style="gap:12px;">
        <a href="#/treino" style="width:20px;height:20px;color:var(--text-dim);display:flex;">${icon.back()}</a>
        <div class="fjc" style="font-size:16px;font-weight:700;">Verificação de treino</div>
      </div>
      <div class="card" style="text-align:center;margin-top:20px;">Sem treino planejado hoje.</div>
    `;
  }

  const allDone = plan.exercises.every((_, i) => log.exercisesDone.includes(i));

  return `
    <div class="row" style="gap:12px;">
      <a href="#/treino" style="width:20px;height:20px;color:var(--text-dim);display:flex;">${icon.back()}</a>
      <div class="fjc" style="font-size:16px;font-weight:700;">Verificação de treino</div>
    </div>

    <div>
      <div class="fjc" style="font-size:20px;font-weight:700;">${plan.name}</div>
      <div class="muted" style="font-size:13px;margin-top:4px;">Marque cada exercício conforme concluir a série.</div>
    </div>

    <div class="stack gap-8">
      ${plan.exercises.map((ex, i) => {
        const done = log.exercisesDone.includes(i);
        return `
          <button data-action="toggleExercise" data-idx="${i}" data-date="${iso}"
            class="check-row ${done ? 'done' : ''}" style="width:100%;text-align:left;">
            <span class="check ${done ? 'checked' : ''}">${icon.check()}</span>
            <span class="label">${ex.name} · ${ex.sets}</span>
          </button>`;
      }).join('')}
    </div>

    <div>
      <div class="section-label">Como foi?</div>
      <div class="row gap-8">
        ${['leve', 'medio', 'pesado'].map((f) => `
          <button data-action="setFeeling" data-feeling="${f}" data-date="${iso}"
            style="flex:1;text-align:center;padding:11px 0;border-radius:9px;border:1.5px solid ${log.feeling === f ? 'var(--ember)' : 'var(--border)'};background:${log.feeling === f ? 'var(--ember-bg)' : 'var(--surface)'};color:${log.feeling === f ? 'var(--ember)' : 'var(--text)'};font-size:12.5px;font-weight:${log.feeling === f ? '700' : '400'};">
            ${f === 'leve' ? 'Leve' : f === 'medio' ? 'Na medida' : 'Pesado'}
          </button>
        `).join('')}
      </div>
    </div>

    <div>
      <div class="section-label">Nota rápida (opcional)</div>
      <textarea id="workout-note" rows="2" placeholder="Ex: aumentar carga no agachamento na próxima…">${log.note || ''}</textarea>
    </div>

    <button data-action="completeWorkout" data-date="${iso}" class="btn btn-success">
      ${allDone ? 'Concluir treino do dia' : 'Concluir mesmo assim'}
    </button>
  `;
}

export function afterRender(container) {
  const ta = container.querySelector('#workout-note');
  if (ta) {
    ta.addEventListener('change', () => {
      window.__forja.store.setWorkoutNote(todayISO(), ta.value);
    });
  }
}
