import { icon } from '../icons.js';
import {
  todayISO, todaysWorkoutPlan, weekWorkoutSummary, weeksStreak, weekdayLabel, weekdayHasTreino,
} from '../store.js';

const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
let editingDow = null; // weekday sendo editado no momento, ou null

export function render(state) {
  const now = new Date();
  const todayDow = now.getDay();
  const plan = todaysWorkoutPlan(now);
  const iso = todayISO(now);
  const log = state.workoutLog[iso];
  const summary = weekWorkoutSummary(now);

  const strip = [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const hasTreino = !!state.workoutPlans[dow];
    const isToday = dow === todayDow;
    let bg = 'var(--surface-3)', content;
    if (!hasTreino) {
      content = `<span style="font-size:9px;color:var(--text-dim-2);">off</span>`;
    } else {
      content = `<span style="width:15px;height:15px;color:${isToday ? 'var(--ember)' : 'var(--text-dim-2)'};display:flex;">${icon.dumbbell()}</span>`;
    }
    if (isToday) bg = 'var(--ember-bg)';
    return `
      <button data-toggle-edit-dow="${dow}" aria-label="Editar treino de ${weekdayLabel(dow)}" class="stack gap-8" style="align-items:center;border:0;background:none;padding:0;">
        <span style="font-size:10.5px;color:var(--text-dim);">${DAY_ABBR[dow]}</span>
        <div style="width:32px;height:32px;border-radius:8px;background:${bg};${isToday ? 'border:1.5px solid var(--ember);' : ''}display:flex;align-items:center;justify-content:center;">
          ${content}
        </div>
      </button>`;
  }).join('');

  return `
    <div class="row">
      <div class="fjc" style="font-size:22px;font-weight:700;">Treino</div>
      <span class="muted" style="font-size:12px;">Selecione um dia para editar</span>
    </div>
    <div class="grid-3" style="grid-template-columns:repeat(7, minmax(0, 1fr));">${strip}</div>

    ${plan ? `
      <div class="card" style="border-color:var(--ember-border);">
        <div class="row" style="margin-bottom:14px;align-items:flex-start;">
          <div>
            <div class="section-label" style="margin:0;color:var(--ember);">Hoje</div>
            <div class="fjc" style="font-size:18px;font-weight:700;">${plan.name}</div>
          </div>
        </div>
        <div class="stack" style="border-radius:8px;overflow:hidden;border:1px solid var(--border);">
          ${plan.exercises.map((ex, i) => `
            <div class="row" style="background:var(--surface-2);padding:10px 12px;border-bottom:1px solid var(--border);">
              <span style="font-size:13px;${log && log.exercisesDone && log.exercisesDone.includes(i) ? 'color:var(--text-dim);text-decoration:line-through;' : ''}">${ex.name}</span>
              <span class="muted" style="font-size:12.5px;">${ex.sets}</span>
            </div>
          `).join('')}
        </div>
        ${log && log.completed
          ? `<div class="pill pill-green" style="display:inline-block;margin-top:14px;">Treino concluído hoje</div>`
          : `<a href="#/treino/verificacao" class="btn btn-primary" style="display:block;text-align:center;margin-top:14px;text-decoration:none;">Iniciar treino →</a>`}
      </div>
    ` : `
      <div class="card" style="text-align:center;">
        <div style="font-size:14px;font-weight:600;">Dia de descanso</div>
        <div class="muted" style="font-size:12.5px;margin-top:4px;">Sem treino de força planejado — aproveite para recuperar.</div>
      </div>
    `}

    <div>
      <div class="section-label">Resumo da semana</div>
      <div class="grid-2">
        <div class="card">
          <div class="fjc" style="font-size:22px;font-weight:700;">${summary.done}/${summary.planned}</div>
          <div class="muted" style="font-size:12px;">treinos concluídos</div>
        </div>
        <div class="card">
          <div class="fjc" style="font-size:22px;font-weight:700;">${weeksStreak(now)}</div>
          <div class="muted" style="font-size:12px;">semanas seguidas</div>
        </div>
      </div>
    </div>

    <div>
      <div class="section-label">Plano da semana</div>
      <div class="stack gap-8">
        ${[0, 1, 2, 3, 4, 5, 6].map((dow) => {
          const p = state.workoutPlans[dow];
          const isEditing = editingDow === dow;
          return `
            <div class="card" style="${dow === todayDow ? 'border-color:var(--ember-border);' : ''}">
              <button data-toggle-edit-dow="${dow}" class="row" style="width:100%;background:none;border:none;padding:0;color:inherit;">
                <span style="font-size:13.5px;font-weight:600;">${weekdayLabel(dow)}</span>
                <span class="row gap-8" style="width:auto;">
                  <span style="font-size:12.5px;color:${p ? 'var(--text)' : 'var(--text-dim-2)'};">${p ? p.name : 'Off (descanso)'}</span>
                  <span style="width:14px;height:14px;color:var(--text-dim-2);display:flex;transform:rotate(${isEditing ? '90' : '0'}deg);">${icon.chevronRight()}</span>
                </span>
              </button>
              ${isEditing ? renderDayEditor(dow, p) : ''}
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderDayEditor(dow, plan) {
  return `
    <div class="stack gap-8" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
      <label class="row" style="cursor:pointer;">
        <span style="font-size:12.5px;">Dia de treino</span>
        <input type="checkbox" data-toggle-off="${dow}" ${plan ? 'checked' : ''}>
      </label>

      ${plan ? `
        <input type="text" data-plan-name="${dow}" value="${plan.name}" placeholder="Nome do treino (ex: Full Body A)">
        <div class="stack gap-8">
          ${plan.exercises.map((ex, i) => `
            <div class="row gap-8">
              <input type="text" data-ex-name="${dow}:${i}" value="${ex.name}" placeholder="Exercício" style="flex:2;">
              <input type="text" data-ex-sets="${dow}:${i}" value="${ex.sets}" placeholder="4×8" style="flex:1;">
              <button data-remove-ex="${dow}:${i}" style="background:none;border:none;color:var(--red);display:flex;padding:4px;">${icon.trash()}</button>
            </div>
          `).join('')}
        </div>
        <button data-add-ex="${dow}" class="btn-ghost">+ Exercício</button>
      ` : ''}
    </div>
  `;
}

export function afterRender(container, { render }) {
  container.querySelectorAll('[data-toggle-edit-dow]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dow = parseInt(btn.dataset.toggleEditDow, 10);
      editingDow = editingDow === dow ? null : dow;
      render();
    });
  });

  const store = window.__forja.store;

  container.querySelectorAll('[data-toggle-off]').forEach((chk) => {
    chk.addEventListener('change', () => {
      const dow = parseInt(chk.dataset.toggleOff, 10);
      if (chk.checked) store.setWorkoutPlanForDay(dow, { name: 'Treino', exercises: [] });
      else store.setWorkoutPlanForDay(dow, null);
      render();
    });
  });

  container.querySelectorAll('[data-plan-name]').forEach((input) => {
    input.addEventListener('change', () => {
      store.renameWorkoutPlan(parseInt(input.dataset.planName, 10), input.value);
    });
  });

  container.querySelectorAll('[data-ex-name]').forEach((input) => {
    input.addEventListener('change', () => {
      const [dow, idx] = input.dataset.exName.split(':').map(Number);
      store.updateExerciseInPlan(dow, idx, { name: input.value });
    });
  });
  container.querySelectorAll('[data-ex-sets]').forEach((input) => {
    input.addEventListener('change', () => {
      const [dow, idx] = input.dataset.exSets.split(':').map(Number);
      store.updateExerciseInPlan(dow, idx, { sets: input.value });
    });
  });
  container.querySelectorAll('[data-remove-ex]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [dow, idx] = btn.dataset.removeEx.split(':').map(Number);
      store.removeExerciseFromPlan(dow, idx);
      render();
    });
  });
  container.querySelectorAll('[data-add-ex]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dow = parseInt(btn.dataset.addEx, 10);
      store.addExerciseToPlan(dow, { name: '', sets: '' });
      render();
    });
  });
}
