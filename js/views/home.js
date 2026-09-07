import { icon } from '../icons.js';
import {
  todayISO, dayProgress, currentStreak, currentBlock, nextBlocks,
  socialLockActive, formatDateLong, isBlockDone, todaysBlocks,
} from '../store.js';

function blockEndDate(block, now) {
  const [h, m] = block.end.split(':').map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

function remainingLabel(block, now) {
  const end = blockEndDate(block, now);
  let diffMin = Math.round((end - now) / 60000);
  if (diffMin < 0) diffMin = 0;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function render(state) {
  const now = new Date();
  const iso = todayISO(now);
  const { done, total, pct } = dayProgress(iso, now);
  const streak = currentStreak(now);
  const block = currentBlock(now);
  const upcoming = nextBlocks(2, now);
  const locked = socialLockActive(now);

  const treinoBlocks = todaysBlocks(now).filter((b) => b.type === 'treino');
  const treinoDone = treinoBlocks.length > 0 && treinoBlocks.every((b) => isBlockDone(iso, b.id));
  const treinoStatus = treinoBlocks.length === 0 ? 'Descanso' : (treinoDone ? 'Feito' : 'Pendente');
  const treinoColor = treinoBlocks.length === 0 ? 'muted' : (treinoDone ? 'green' : 'dim');

  const estudoBlock = todaysBlocks(now).find((b) => b.type === 'estudo');
  const estudoDone = estudoBlock ? isBlockDone(iso, estudoBlock.id) : false;

  return `
    <div class="row">
      <div class="muted" style="font-size:13px;">${formatDateLong(now)}</div>
      <div class="row gap-8">
        <div class="row gap-8" style="background:var(--ember-bg);border:1px solid var(--ember-border);border-radius:20px;padding:6px 12px;">
          <span style="width:15px;height:15px;color:var(--ember);display:flex;">${icon.flame()}</span>
          <span class="fjc" style="font-size:14px;font-weight:700;color:oklch(0.85 0.1 55);">${streak}</span>
        </div>
        <a href="#/config" style="width:18px;height:18px;color:var(--text-dim-2);display:flex;">${icon.gear()}</a>
      </div>
    </div>

    <div>
      <div class="fjc" style="font-size:24px;font-weight:700;">Protocolo de hoje</div>
      <div class="muted" style="font-size:14px;margin-top:4px;">Cumpra os blocos para liberar as redes à noite.</div>
    </div>

    <a href="#/rotina" class="card" style="display:block;">
      <div class="row" style="margin-bottom:12px;align-items:baseline;">
        <span class="section-label" style="margin:0;">Progresso</span>
        <span class="fjc" style="font-size:13px;font-weight:700;color:var(--ember);">${done} / ${total} blocos</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.round(pct * 100)}%;"></div></div>
    </a>

    <div class="grid-3">
      <a href="#/treino" class="card card-tight stack gap-8" style="text-decoration:none;color:inherit;">
        <span style="width:18px;height:18px;color:var(--${treinoColor === 'green' ? 'green' : 'text-dim-2'});display:flex;">${icon.dumbbell()}</span>
        <span style="font-size:11.5px;color:var(--text-dim);">Treino</span>
        <span style="font-size:12.5px;font-weight:700;${treinoColor === 'green' ? 'color:var(--green);' : ''}">${treinoStatus}</span>
      </a>
      <a href="#/estudos" class="card card-tight stack gap-8" style="text-decoration:none;color:inherit;">
        <span style="width:18px;height:18px;color:var(--text-dim-2);display:flex;">${icon.book()}</span>
        <span style="font-size:11.5px;color:var(--text-dim);">Estudo</span>
        <span style="font-size:12.5px;font-weight:700;${estudoDone ? 'color:var(--green);' : ''}">${estudoDone ? 'Feito' : 'Pendente'}</span>
      </a>
      <a href="#/bloqueio" class="card card-tight stack gap-8" style="text-decoration:none;color:inherit;border-color:${locked ? 'var(--red-border)' : 'var(--border)'};background:${locked ? 'var(--red-bg)' : 'var(--surface)'};">
        <span style="width:18px;height:18px;color:${locked ? 'var(--red)' : 'var(--green)'};display:flex;">${icon.lock()}</span>
        <span style="font-size:11.5px;color:var(--text-dim);">Redes</span>
        <span style="font-size:12.5px;font-weight:700;color:${locked ? 'var(--red)' : 'var(--green)'};">${locked ? 'Bloqueadas' : 'Liberadas'}</span>
      </a>
    </div>

    ${block ? `
      <div class="card" style="border-color:var(--cyan);">
        <div class="row gap-8" style="margin-bottom:10px;">
          <span style="width:7px;height:7px;border-radius:50%;background:var(--cyan);"></span>
          <span class="section-label" style="margin:0;color:oklch(0.7 0.1 200);">Agora</span>
        </div>
        <div class="fjc" style="font-size:17px;font-weight:700;margin-bottom:4px;">${block.start} – ${block.end} · ${block.title}</div>
        <div class="muted" style="font-size:13px;margin-bottom:14px;">${block.type === 'foco' ? 'Bloqueio de redes sociais ativo neste período.' : ''}</div>
        <div class="row">
          <span class="muted" style="font-size:13px;">Restam</span>
          <span class="fjc" style="font-size:20px;font-weight:700;color:var(--cyan);">${remainingLabel(block, now)}</span>
        </div>
      </div>
    ` : ''}

    ${upcoming.length ? `
      <div>
        <div class="section-label">Próximos blocos</div>
        <div class="stack" style="border-radius:10px;overflow:hidden;border:1px solid var(--border);">
          ${upcoming.map((b) => `
            <div class="row" style="background:var(--surface);padding:13px 16px;border-bottom:1px solid var(--border);">
              <div class="stack">
                <span style="font-size:14px;font-weight:600;${b.type === 'livre' ? 'color:var(--red);' : ''}">${b.title}</span>
                <span class="muted" style="font-size:12px;">${b.start} – ${b.end}</span>
              </div>
              <span style="width:16px;height:16px;color:var(--text-dim-2);display:flex;">${icon.chevronRight()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}
