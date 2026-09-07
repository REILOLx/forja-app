import { icon } from '../icons.js';
import { goalProgress } from '../store.js';

const COLOR = {
  ember: { text: 'var(--ember)', fill: 'var(--ember)' },
  cyan: { text: 'var(--cyan)', fill: 'var(--cyan)' },
  green: { text: 'var(--green)', fill: 'var(--green)' },
};
const ICONS = { corpo: 'dumbbell', mente: 'book', carreira: 'target' };

export function render(state) {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const year = now.getFullYear();

  return `
    <div class="fjc" style="font-size:22px;font-weight:700;">Metas ${year}</div>
    <div class="row gap-8" style="justify-content:flex-start;">
      ${[1, 2, 3, 4].map((q) => `
        <span class="pill" style="${q === quarter ? 'background:var(--ember-bg);border:1px solid var(--ember-border);color:oklch(0.85 0.1 55);' : 'background:var(--surface-3);color:var(--text-dim);'}">Q${q}${q === quarter ? ' · atual' : ''}</span>
      `).join('')}
    </div>

    ${state.goals.map((goal) => {
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
            ${goal.keyResults.map((kr) => `
              <button data-action="toggleKR" data-goal="${goal.id}" data-kr="${kr.id}" class="row" style="width:100%;background:none;border:none;padding:0;gap:10px;justify-content:flex-start;text-align:left;">
                <span class="check ${kr.done ? 'checked' : ''}" style="width:15px;height:15px;border-radius:50%;">${icon.check()}</span>
                <span style="font-size:13px;color:${kr.done ? 'var(--text)' : 'var(--text-dim)'};">${kr.title}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }).join('')}
  `;
}
