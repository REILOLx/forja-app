import { icon } from '../icons.js';
import {
  monthPercent, cardInvoiceForMonth, activeLoanBalance, formatMoney,
} from '../store.js';

export function render(state) {
  const { committed, budget, pct } = monthPercent();
  const excess = Math.max(committed - budget, 0);
  const over = pct > 100;
  const scaleMax = Math.max(pct, 100);
  const fillWidth = (pct / scaleMax) * 100;
  const markerPos = (100 / scaleMax) * 100;
  const lis = state.finance.lis;
  const lisPct = lis.limit ? Math.round((lis.used / lis.limit) * 1000) / 10 : 0;

  return `
    <div class="row">
      <div class="fjc" style="font-size:22px;font-weight:700;">Financeiro</div>
      <div class="muted" style="font-size:12.5px;">${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}</div>
    </div>

    <div class="card" style="background:${over ? 'var(--red-bg)' : 'var(--green-bg)'};border-color:${over ? 'var(--red-border)' : 'oklch(0.4 0.1 145)'};">
      <div class="row" style="margin-bottom:10px;align-items:baseline;">
        <span class="section-label" style="margin:0;color:${over ? 'oklch(0.8 0.13 25)' : 'oklch(0.8 0.13 145)'};">Comprometido do mês</span>
        <span class="fjc" style="font-size:30px;font-weight:700;color:${over ? 'var(--red)' : 'var(--green)'};">${pct}%</span>
      </div>
      <div style="position:relative;height:10px;border-radius:6px;background:oklch(0.3 0.02 260);margin-bottom:10px;">
        <div style="position:absolute;left:0;top:0;height:100%;width:${fillWidth}%;background:${over ? 'var(--red)' : 'var(--green)'};border-radius:6px;"></div>
        ${over ? `<div style="position:absolute;left:${markerPos}%;top:-3px;width:2px;height:16px;background:var(--text);"></div>` : ''}
      </div>
      <div class="row" style="font-size:12px;color:${over ? 'oklch(0.75 0.05 25)' : 'oklch(0.75 0.05 145)'};">
        <span>${formatMoney(committed)} comprometidos</span>
        <span>de ${formatMoney(budget)} disponíveis</span>
      </div>
      ${excess > 0 ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--red-border);font-size:12.5px;color:oklch(0.85 0.1 25);">
          ${formatMoney(excess)} excedentes rolando para os próximos meses.
        </div>` : ''}
    </div>

    <div class="grid-2">
      <a href="#/financeiro/lancar" class="card" style="text-decoration:none;color:inherit;">
        <span style="width:18px;height:18px;color:var(--ember);display:flex;margin-bottom:8px;">${icon.plus()}</span>
        <div style="font-size:13px;font-weight:700;">Lançar gasto</div>
      </a>
      <a href="#/financeiro/pagamentos" class="card" style="text-decoration:none;color:inherit;">
        <span style="width:18px;height:18px;color:var(--cyan);display:flex;margin-bottom:8px;">${icon.card()}</span>
        <div style="font-size:13px;font-weight:700;">Pagamentos do mês</div>
      </a>
    </div>

    <div>
      <a href="#/financeiro/cartoes" class="row" style="text-decoration:none;color:inherit;margin-bottom:10px;">
        <span class="section-label" style="margin:0;">Cartões de crédito</span>
        <span style="width:15px;height:15px;color:var(--text-dim-2);display:flex;">${icon.chevronRight()}</span>
      </a>
      <div class="stack gap-8">
        ${state.finance.cards.map((c) => {
          const invoice = cardInvoiceForMonth(c.id);
          const usedPct = Math.round((invoice / c.limit) * 100);
          return `
            <div class="card card-tight">
              <div class="row" style="margin-bottom:4px;">
                <span style="font-size:13.5px;font-weight:600;">${c.name}</span>
                <span class="fjc" style="font-size:14px;font-weight:700;">${formatMoney(invoice)}</span>
              </div>
              <div class="row" style="font-size:11.5px;color:var(--text-dim);">
                <span>vence dia ${c.dueDay}</span>
                <span>${usedPct}% do limite usado</span>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>

    <div>
      <a href="#/financeiro/emprestimos" class="row" style="text-decoration:none;color:inherit;margin-bottom:10px;">
        <span class="section-label" style="margin:0;">Empréstimos</span>
        <span style="width:15px;height:15px;color:var(--text-dim-2);display:flex;">${icon.chevronRight()}</span>
      </a>
      <div class="stack gap-8">
        ${state.finance.loans.filter((l) => activeLoanBalance(l) > 0).map((l) => {
          const pctLoan = Math.round((l.paidInstallments / l.installments) * 100);
          return `
            <div class="card">
              <div class="row" style="margin-bottom:8px;align-items:baseline;">
                <span style="font-size:13.5px;font-weight:600;">${l.name} · ${l.bank}</span>
                <span class="fjc" style="font-size:13px;font-weight:700;color:var(--ember);">${pctLoan}%</span>
              </div>
              <div class="progress-track thin" style="margin-bottom:6px;"><div class="progress-fill" style="width:${pctLoan}%;"></div></div>
              <div class="muted" style="font-size:11.5px;">Faltam ${activeLoanBalance(l)} de ${l.installments} parcelas · ${formatMoney(l.monthlyAmount)}/mês</div>
            </div>`;
        }).join('') || '<div class="muted" style="font-size:13px;">Nenhum empréstimo em aberto.</div>'}
      </div>
    </div>

    <div>
      <div class="section-label">LIS · Limite especial</div>
      <div class="card" style="border-color:var(--red-border);">
        <div class="row" style="margin-bottom:8px;align-items:baseline;">
          <span style="font-size:13.5px;font-weight:600;">Crédito especial em uso</span>
          <span class="fjc" style="font-size:13px;font-weight:700;color:var(--red);">${formatMoney(lis.used)} / ${formatMoney(lis.limit)}</span>
        </div>
        <div class="progress-track thin"><div class="progress-fill" style="width:${lisPct}%;background:var(--red);"></div></div>
      </div>
    </div>
  `;
}
