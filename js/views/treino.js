import { icon } from '../icons.js';
import { todayISO, todaysWorkoutPlan, weekWorkoutSummary, weeksStreak, weekdayLabel } from '../store.js';

const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function render(state) {
  const now = new Date();
  const todayDow = now.getDay();
  const plan = todaysWorkoutPlan(now);
  const iso = todayISO(now);
  const log = state.workoutLog[iso];
  const summary = weekWorkoutSummary(now);

  const strip = [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const hasTreino = (state.routine[dow] || []).some((b) => b.type === 'treino');
    const isToday = dow === todayDow;
    let bg = 'var(--surface-3)', content;
    if (!hasTreino) {
      content = `<span style="font-size:9px;color:var(--text-dim-2);">off</span>`;
    } else {
      content = `<span style="width:15px;height:15px;color:${isToday ? 'var(--ember)' : 'var(--text-dim-2)'};display:flex;">${icon.dumbbell()}</span>`;
    }
    if (isToday) bg = 'var(--ember-bg)';
    return `
      <div class="stack gap-8" style="align-items:center;">
        <span style="font-size:10.5px;color:var(--text-dim);">${DAY_ABBR[dow]}</span>
        <div style="width:32px;height:32px;border-radius:8px;background:${bg};${isToday ? 'border:1.5px solid var(--ember);' : ''}display:flex;align-items:center;justify-content:center;">
          ${content}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="fjc" style="font-size:22px;font-weight:700;">Treino</div>
    <div class="grid-3" style="grid-template-columns:repeat(7, minmax(0, 1fr));">${strip}</div>

    ${plan ? `
      <div class="card" style="border-color:var(--ember-border);">
        <div class="row" style="margin-bottom:14px;align-items:flex-start;">
          <div>
            <div class="section-label" style="margin:0;color:oklch(0.8 0.1 55);">Hoje</div>
            <div class="fjc" style="font-size:18px;font-weight:700;">${plan.name}</div>
          </div>
          <div class="muted" style="font-size:12px;">~50 min</div>
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
          : `<a href="#/treino/verificacao" class="btn btn-primary" style="display:block;text-align:center;margin-top:14px;text-decoration:none;">Iniciar verificação →</a>`}
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
        ${[1, 2, 6].map((dow) => `
          <div class="row card card-tight">
            <span style="font-size:13.5px;">${state.workoutPlans[dow].name}</span>
            <span style="font-size:12px;color:${dow === todayDow ? 'var(--ember)' : 'var(--text-dim)'};">${weekdayLabel(dow)}</span>
          </div>
        `).join('')}
        <div class="row card card-tight">
          <span style="font-size:13.5px;">Jiu-jitsu · técnica + sparring</span>
          <span style="font-size:12px;color:${[3, 5].includes(todayDow) ? 'var(--ember)' : 'var(--text-dim)'};">Qua / Sex</span>
        </div>
      </div>
    </div>
  `;
}
