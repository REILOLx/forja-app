import { icon } from '../icons.js';
import {
  monthKey, cardInvoiceForMonth, isPaid, activeLoanBalance, formatMoney,
} from '../store.js';

function checkRow(checked, label, sub, amount, action, key, ym) {
  return `
    <button data-action="togglePaid" data-key="${key}" data-ym="${ym}"
      class="check-row ${checked ? 'done' : ''}" style="width:100%;text-align:left;">
      <span class="check ${checked ? 'checked' : ''}">${icon.check()}</span>
      <span class="stack" style="flex:1;">
        <span class="label" style="${checked ? '' : 'text-decoration:none;color:var(--text);'}">${label}</span>
        ${sub ? `<span class="muted" style="font-size:11px;">${sub}</span>` : ''}
      </span>
      <span class="fjc" style="font-size:13.5px;font-weight:700;${checked ? 'color:var(--text-dim);' : ''}">${formatMoney(amount)}</span>
    </button>`;
}

export function render(state) {
  const ym = monthKey();
  const f = state.finance;
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());

  const items = [];
  f.fixedBills.forEach((b) => items.push({ key: `bill:${b.id}`, label: b.name, amount: b.amount, group: 'Contas fixas', sub: `vence dia ${b.dueDay}` }));
  f.cards.forEach((c) => {
    const amt = cardInvoiceForMonth(c.id, ym);
    if (amt > 0) items.push({ key: `card:${c.id}`, label: `Fatura ${c.name}`, amount: amt, group: 'Faturas de cartão', sub: `vence dia ${c.dueDay}` });
  });
  f.loans.filter((l) => activeLoanBalance(l) > 0).forEach((l) => {
    items.push({ key: `loan:${l.id}`, label: `${l.name} · ${l.bank}`, amount: l.monthlyAmount, group: 'Empréstimos', sub: `parcela ${l.paidInstallments + 1} de ${l.installments}` });
  });
  if (f.lis.used > 0) items.push({ key: 'lis', label: 'Pagamento mínimo do especial', amount: f.lis.used, group: 'LIS · limite especial', sub: '' });

  let paidTotal = 0, pendingTotal = 0;
  items.forEach((it) => { if (isPaid(ym, it.key)) paidTotal += it.amount; else pendingTotal += it.amount; });

  const groups = [...new Set(items.map((i) => i.group))];

  return `
    <div class="row" style="gap:12px;justify-content:flex-start;">
      <a href="#/financeiro" style="width:20px;height:20px;color:var(--text-dim);display:flex;">${icon.back()}</a>
      <div class="fjc" style="font-size:18px;font-weight:700;">Pagamentos de ${monthLabel}</div>
    </div>

    <div class="row gap-10">
      <div class="card" style="flex:1;">
        <div class="fjc" style="font-size:17px;font-weight:700;color:var(--green);">${formatMoney(paidTotal)}</div>
        <div class="muted" style="font-size:11px;">já pago</div>
      </div>
      <div class="card" style="flex:1;">
        <div class="fjc" style="font-size:17px;font-weight:700;color:var(--red);">${formatMoney(pendingTotal)}</div>
        <div class="muted" style="font-size:11px;">ainda a pagar</div>
      </div>
    </div>

    ${groups.map((g) => `
      <div>
        <div class="section-label">${g}</div>
        <div class="stack gap-8">
          ${items.filter((i) => i.group === g).map((it) => checkRow(isPaid(ym, it.key), it.label, it.sub, it.amount, 'togglePaid', it.key, ym)).join('')}
        </div>
      </div>
    `).join('') || '<div class="muted">Nada lançado para este mês ainda.</div>'}
  `;
}
