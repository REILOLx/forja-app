import { icon } from '../icons.js';
import { todayISO, todaysBlocks, isBlockDone, formatDateLong } from '../store.js';

export function render() {
  const now = new Date();
  const iso = todayISO(now);
  const hhmm = now.toTimeString().slice(0, 5);
  const blocks = todaysBlocks(now);

  return `
    <div class="row" style="margin-bottom:4px;">
      <div class="fjc" style="font-size:22px;font-weight:700;">Rotina diária</div>
    </div>
    <div class="muted" style="font-size:13px;margin-top:-10px;margin-bottom:4px;">${formatDateLong(now)}</div>

    <div class="timeline">
      ${blocks.map((b) => {
        const done = b.type !== 'livre' && isBlockDone(iso, b.id);
        const isCurrent = hhmm >= b.start && hhmm <= b.end;
        let dotColor = 'oklch(0.4 0.02 260)';
        if (done) dotColor = 'var(--green)';
        else if (b.type === 'foco') dotColor = 'var(--red)';
        else if (b.type === 'livre') dotColor = 'var(--red)';
        else if (isCurrent) dotColor = 'var(--cyan)';

        if (b.type === 'livre') {
          return `
            <div class="timeline-item">
              <div class="timeline-dot" style="background:${dotColor};"></div>
              <div class="timeline-time">${b.start} – ${b.end}</div>
              <div class="card card-tight" style="background:var(--red-bg);border-color:var(--red-border);">
                <span style="font-size:14px;font-weight:600;color:oklch(0.85 0.1 25);">${b.title}</span>
              </div>
            </div>`;
        }

        return `
          <div class="timeline-item">
            <div class="timeline-dot" style="background:${dotColor};"></div>
            <div class="timeline-time">${b.start} – ${b.end}</div>
            <button data-action="toggleBlock" data-id="${b.id}" data-date="${iso}"
              class="check-row ${done ? 'done' : ''}" style="width:100%;text-align:left;border:1px solid ${b.type === 'foco' && !done ? 'var(--red-border)' : 'var(--border)'};">
              <span class="check ${done ? 'checked' : ''}">${icon.check()}</span>
              <span class="label">${b.title}</span>
              ${b.type === 'foco' && !done ? `<span style="width:16px;height:16px;color:var(--red);display:flex;">${icon.lock()}</span>` : ''}
            </button>
          </div>`;
      }).join('')}
    </div>
  `;
}
