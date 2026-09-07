import { icon } from '../icons.js';
import { goalProgress, availableYears, getGoalsForYear } from '../store.js';

const COLOR = {
  ember: { text: 'var(--ember)', fill: 'var(--ember)' },
  cyan: { text: 'var(--cyan)', fill: 'var(--cyan)' },
  green: { text: 'var(--green)', fill: 'var(--green)' },
};
const ICONS = { corpo: 'dumbbell', mente: 'book', carreira: 'target' };

let selectedYear = String(new Date().getFullYear());

export function render() {
  const years = availableYears();
  const goals = getGoalsForYear(selectedYear);

  return `
    <div class="fjc" style="font-size:22px;font-weight:700;">Metas</div>

    <div class="row gap-8" style="overflow-x:auto;justify-content:flex-start;padding-bottom:2px;flex-shrink:0;">
      ${years.map((y) => `
        <button data-select-year="${y}" class="pill" style="flex-shrink:0;${y === selectedYear
          ? 'background:var(--ember-bg);border:1px solid var(--ember-border);color:oklch(0.85 0.1 55);'
          : 'background:var(--surface-3);color:var(--text-dim);border:1px solid transparent;'}">${y}</button>
      `).join('')}
    </div>

    ${goals.map((goal) => {
      const pct = Math.round(goalProgress(goal) * 100);
      const c = COLOR[goal.color] || COLOR.ember;
      return `
        <div class="card">
          <div class="row gap-10" style="margin-bottom:12px;justify-content:flex-start;">
            <span style="width:19px;height:19px;color:${c.text};display:flex;">${icon[ICONS[goal.id]] ? icon[ICONS[goal.id]]() : icon.target()}</span>
            <span class="fjc" style="font-size:15.5px;font-weight:700;">${goal.title}</span>
          </div>
          <div class="progress-track" style="margin-bottom:14px;"><div class="progress-fill" style="width:${pct}%;background:${c.fill};"></div></div>
          <div class="stack gap-8">
            ${goal.keyResults.length === 0 ? `<div class="muted" style="font-size:12.5px;">Nenhuma meta ainda — adicione abaixo.</div>` : ''}
            ${goal.keyResults.map((kr) => `
              <div class="row gap-8">
                <button data-action="toggleKR" data-year="${selectedYear}" data-goal="${goal.id}" data-kr="${kr.id}" class="row" style="flex:1;background:none;border:none;padding:0;gap:10px;justify-content:flex-start;text-align:left;">
                  <span class="check ${kr.done ? 'checked' : ''}" style="width:15px;height:15px;border-radius:50%;flex-shrink:0;">${icon.check()}</span>
                  <span style="font-size:13px;color:${kr.done ? 'var(--text)' : 'var(--text-dim)'};">${kr.title}</span>
                </button>
                <button data-action="removeKR" data-year="${selectedYear}" data-goal="${goal.id}" data-kr="${kr.id}" style="background:none;border:none;color:var(--text-dim-2);display:flex;padding:2px;width:14px;height:14px;flex-shrink:0;">${icon.trash()}</button>
              </div>
            `).join('')}
          </div>
          <div class="row gap-8" style="margin-top:14px;">
            <input type="text" data-add-kr-input="${goal.id}" placeholder="Nova meta..." style="flex:1;">
            <button data-add-kr-btn="${goal.id}" style="background:var(--surface-3);border:none;border-radius:10px;color:var(--text);display:flex;padding:0 14px;">${icon.plus()}</button>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

export function afterRender(container, { render }) {
  container.querySelectorAll('[data-select-year]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedYear = btn.dataset.selectYear;
      render();
    });
  });

  const store = window.__forja.store;
  container.querySelectorAll('[data-add-kr-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const goalId = btn.dataset.addKrBtn;
      const input = container.querySelector(`[data-add-kr-input="${goalId}"]`);
      const title = input.value.trim();
      if (!title) return;
      store.addKeyResult(selectedYear, goalId, title);
      render();
    });
  });
}
