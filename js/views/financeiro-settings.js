import { icon } from '../icons.js';
import {
  loanDeductedFromNetSalary, monthPercent, cardInvoiceForMonth, activeLoanBalance, formatMoney, selectedFinanceMonth, fixedBillsForMonth, lisForMonth, loanAmountForMonth,
} from '../store.js';

let editingBudget = false;
let editingLis = false;
let editingBillId = null;
let showAddBill = false;

export function render(state) {
  const ym = selectedFinanceMonth();
  const { committed, budget, pct } = monthPercent(ym);
  const excess = Math.max(committed - budget, 0);
  const over = pct > 100;
  const scaleMax = Math.max(pct, 100);
  const fillWidth = (pct / scaleMax) * 100;
  const markerPos = (100 / scaleMax) * 100;
  const lis = lisForMonth(ym);
  const lisPct = lis.limit ? Math.round((lis.used / lis.limit) * 1000) / 10 : 0;

  return `
    <p class="hint">Contas fixas se repetem mensalmente. Alterações valem a partir do mês selecionado; os valores anteriores são preservados.</p>
    <div>
      <div class="row" style="margin-bottom:10px;">
        <span class="section-label" style="margin:0;">Contas fixas</span>
        <button id="btn-toggle-add-bill" style="background:none;border:none;color:var(--text-dim-2);display:flex;">${icon.plus()}</button>
      </div>
      <div class="stack gap-8">
        ${fixedBillsForMonth(ym).map((b) => {
          const isEditing = editingBillId === b.id;
          return isEditing ? `
            <div class="card card-tight stack gap-8">
              <input type="text" data-bill-field="name" data-bill-id="${b.id}" value="${b.name}" placeholder="Nome">
              <div class="row gap-8">
                <input type="number" data-bill-field="amount" data-bill-id="${b.id}" value="${b.amount}" placeholder="Valor" style="flex:1;">
                <input type="number" data-bill-field="dueDay" data-bill-id="${b.id}" value="${b.dueDay}" placeholder="Dia venc." style="flex:1;">
              </div>
              <button data-action="removeFixedBill" data-id="${b.id}" class="btn" style="background:var(--red-bg);color:var(--red);border:1px solid var(--red-border);">Remover conta</button>
            </div>
          ` : `
            <button data-toggle-edit-bill="${b.id}" class="row card card-tight" style="width:100%;background:var(--surface);border:1px solid var(--border);color:inherit;">
              <span style="font-size:13.5px;">${b.name} <span class="muted">· dia ${b.dueDay}</span></span>
              <span class="fjc" style="font-size:13.5px;font-weight:700;">${formatMoney(b.amount)}</span>
            </button>`;
        }).join('')}
      </div>
      ${showAddBill ? `
        <div class="card stack gap-8" style="margin-top:8px;">
          <input type="text" data-field="name" placeholder="Nome (ex: Aluguel)">
          <div class="row gap-8">
            <input type="number" data-field="amount" placeholder="Valor" style="flex:1;">
            <input type="number" data-field="dueDay" placeholder="Dia do vencimento" style="flex:1;">
          </div>
          <button data-action="salvarContaFixa" class="btn btn-primary">Salvar conta</button>
        </div>
      ` : ''}
    </div>

    <div>
      <a href="#/financeiro/cartoes" class="row" style="text-decoration:none;color:inherit;margin-bottom:10px;">
        <span class="section-label" style="margin:0;">Cartões de crédito</span>
        <span style="width:15px;height:15px;color:var(--text-dim-2);display:flex;">${icon.chevronRight()}</span>
      </a>
      <div class="stack gap-8">
        ${state.finance.cards.map((c) => {
          const invoice = cardInvoiceForMonth(c.id, ym);
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
        }).join('') || '<div class="muted" style="font-size:13px;">Nenhum cartão cadastrado.</div>'}
      </div>
    </div>

    <div>
      <a href="#/financeiro/emprestimos" class="row" style="text-decoration:none;color:inherit;margin-bottom:10px;">
        <span class="section-label" style="margin:0;">Empréstimos</span>
        <span style="width:15px;height:15px;color:var(--text-dim-2);display:flex;">${icon.chevronRight()}</span>
      </a>
      <div class="stack gap-8">
        ${state.finance.loans.filter((l) => loanAmountForMonth(l, ym) > 0).map((l) => {
          const pctLoan = Math.round((l.paidInstallments / l.installments) * 100);
          return `
            <div class="card">
              <div class="row" style="margin-bottom:8px;align-items:baseline;">
                <span style="font-size:13.5px;font-weight:600;">${l.name} · ${l.bank}</span>
                <span class="fjc" style="font-size:13px;font-weight:700;color:var(--ember);">${pctLoan}%</span>
              </div>
              <div class="progress-track thin" style="margin-bottom:6px;"><div class="progress-fill" style="width:${pctLoan}%;"></div></div>
              <div class="muted" style="font-size:11.5px;">Faltam ${activeLoanBalance(l)} de ${l.installments} parcelas · ${formatMoney(l.monthlyAmount)}/mês${loanDeductedFromNetSalary(l,ym)?' · já descontado do salário líquido':''}</div>
            </div>`;
        }).join('') || '<div class="muted" style="font-size:13px;">Nenhum empréstimo em aberto.</div>'}
      </div>
    </div>

    <div>
      <div class="row" style="margin-bottom:10px;">
        <span class="section-label" style="margin:0;">LIS · Limite especial</span>
        <button id="btn-toggle-lis" style="background:none;border:none;color:var(--text-dim-2);display:flex;">${icon.gear()}</button>
      </div>
      <div class="card" style="border-color:var(--red-border);">
        ${editingLis ? `
          <div class="row gap-8">
            <input type="number" id="lis-used" value="${lis.used}" placeholder="Usado" style="flex:1;">
            <input type="number" id="lis-limit" value="${lis.limit}" placeholder="Limite" style="flex:1;">
          </div>
        ` : `
          <div class="row" style="margin-bottom:8px;align-items:baseline;">
            <span style="font-size:13.5px;font-weight:600;">Especial provisionado no mês</span>
            <span class="fjc" style="font-size:13px;font-weight:700;color:var(--red);">${formatMoney(lis.used)} / ${formatMoney(lis.limit)}</span>
          </div>
          <div class="progress-track thin"><div class="progress-fill" style="width:${Math.min(lisPct, 100)}%;background:var(--red);"></div></div>
        `}
      </div>
    </div>
  `;
}

export function afterRender(container, { render }) {
  const store = window.__forja.store;

  const editBudgetBtn = container.querySelector('#btn-edit-budget');
  if (editBudgetBtn) editBudgetBtn.addEventListener('click', () => { editingBudget = true; render(); });
  const budgetInput = container.querySelector('#budget-input');
  if (budgetInput) budgetInput.addEventListener('change', () => {
    store.updateBudget(parseFloat(budgetInput.value || '0'));
    editingBudget = false;
    render();
  });

  const lisBtn = container.querySelector('#btn-toggle-lis');
  if (lisBtn) lisBtn.addEventListener('click', () => { editingLis = !editingLis; render(); });
  const lisUsed = container.querySelector('#lis-used');
  const lisLimit = container.querySelector('#lis-limit');
  if (lisUsed) lisUsed.addEventListener('change', () => store.updateLis({ used: parseFloat(lisUsed.value || '0') }));
  if (lisLimit) lisLimit.addEventListener('change', () => store.updateLis({ limit: parseFloat(lisLimit.value || '0') }));

  container.querySelectorAll('[data-toggle-edit-bill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingBillId = editingBillId === btn.dataset.toggleEditBill ? null : btn.dataset.toggleEditBill;
      render();
    });
  });
  container.querySelectorAll('[data-bill-field]').forEach((input) => {
    input.addEventListener('change', () => {
      const val = input.type === 'number' ? parseFloat(input.value || '0') : input.value;
      store.updateFixedBill(input.dataset.billId, { [input.dataset.billField]: val });
    });
  });
  const addBillBtn = container.querySelector('#btn-toggle-add-bill');
  if (addBillBtn) addBillBtn.addEventListener('click', () => { showAddBill = !showAddBill; render(); });
}

export function closeForms() {
  showAddBill = false;
  editingBillId = null;
  editingBudget = false;
  editingLis = false;
}
