import { icon } from '../icons.js';
import { activeLoanBalance, formatMoney, loanDeductedFromNetSalary } from '../store.js';

import { monthPicker, bindMonthPicker } from '../ui.js';

const CIRC = 2 * Math.PI * 15.5;
let editingLoanId = null;
let showAddLoan = false;

function ring(pct, color) {
  const offset = CIRC * (1 - pct);
  return `
    <div style="position:relative;width:86px;height:86px;flex-shrink:0;">
      <svg class="ring" viewBox="0 0 36 36" width="86" height="86">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" stroke-width="3.5"/>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round"
          stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
        <span class="fjc" style="font-size:19px;font-weight:700;color:${color};">${Math.round(pct * 100)}%</span>
      </div>
    </div>`;
}

export function render(state) {
  const loans = state.finance.loans;

  return `
    <div class="row" style="gap:12px;justify-content:flex-start;">
      <a href="#/financeiro" style="width:20px;height:20px;color:var(--text-dim);display:flex;">${icon.back()}</a>
      <div class="fjc" style="font-size:18px;font-weight:700;">Empréstimos</div>
    </div>

    ${monthPicker()}
    <p class="hint">O mês selecionado será o início das parcelas de novos empréstimos. Os contratos legados têm o início estimado pela quantidade de parcelas pagas.</p>
    ${loans.map((l) => {
      const pct = l.installments ? l.paidInstallments / l.installments : 0;
      const remaining = activeLoanBalance(l);
      const color = remaining === 0 ? 'var(--green)' : pct > 0.6 ? 'var(--green)' : 'var(--ember)';
      const isEditing = editingLoanId === l.id;
      return `
        <div class="card">
          <div class="row" style="align-items:flex-start;margin-bottom:10px;">
            <span class="muted" style="font-size:11px;"></span>
            <span class="row gap-8" style="width:auto;">
              <button data-toggle-edit-loan="${l.id}" style="background:none;border:none;color:var(--text-dim-2);display:flex;">${icon.gear()}</button>
              <button data-action="removeLoan" data-id="${l.id}" style="background:none;border:none;color:var(--text-dim-2);display:flex;">${icon.trash()}</button>
            </span>
          </div>
          ${isEditing ? `
            <div class="stack gap-8">
              <label class="recurring-option"><input type="checkbox" data-loan-field="includedInNetSalary" data-loan-id="${l.id}" ${loanDeductedFromNetSalary(l)?'checked':''}><span>Parcela já descontada do salário líquido informado. Não descontar novamente no caixa ou no teto de gastos.</span></label><input type="text" data-loan-field="name" data-loan-id="${l.id}" value="${l.name}" placeholder="Nome">
              <label class="field">Mês da primeira parcela<input type="month" data-loan-field="startMonth" data-loan-id="${l.id}" value="${l.startMonth}"></label>
              <input type="text" data-loan-field="bank" data-loan-id="${l.id}" value="${l.bank}" placeholder="Banco">
              <div class="row gap-8">
                <input type="number" data-loan-field="totalAmount" data-loan-id="${l.id}" value="${l.totalAmount}" placeholder="Valor total" style="flex:1;">
                <input type="number" data-loan-field="installments" data-loan-id="${l.id}" value="${l.installments}" placeholder="Nº parcelas" style="flex:1;">
              </div>
              <div class="row gap-8">
                <input type="number" data-loan-field="paidInstallments" data-loan-id="${l.id}" value="${l.paidInstallments}" placeholder="Parcelas pagas" style="flex:1;">
                <input type="number" data-loan-field="monthlyAmount" data-loan-id="${l.id}" value="${l.monthlyAmount}" placeholder="Valor da parcela" style="flex:1;">
              </div>
            </div>
          ` : `
            <div class="row gap-14" style="align-items:center;">
              ${ring(pct, color)}
              <div style="flex:1;">
                <div style="font-size:14.5px;font-weight:700;margin-bottom:4px;">${l.name}</div>
                <div class="muted" style="font-size:12px;margin-bottom:2px;">${l.bank}</div>${loanDeductedFromNetSalary(l)?'<p class="hint">Já descontado do salário líquido · sem novo débito no caixa.</p>':''}
                <div class="muted" style="font-size:12px;">${remaining === 0 ? 'Quitado' : `Faltam ${remaining} de ${l.installments} parcelas`}</div>
              </div>
            </div>
            <div class="row" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
              <div class="stack">
                <span style="font-size:11px;color:var(--text-dim-2);">parcela mensal</span>
                <span class="fjc" style="font-size:15px;font-weight:700;">${formatMoney(l.monthlyAmount)}</span>
              </div>
              <div class="stack">
                <span style="font-size:11px;color:var(--text-dim-2);">valor total</span>
                <span class="fjc" style="font-size:15px;font-weight:700;">${formatMoney(l.totalAmount)}</span>
              </div>
            </div>
          `}
        </div>`;
    }).join('') || '<div class="muted">Nenhum empréstimo cadastrado.</div>'}

    <button id="btn-toggle-add-loan" class="btn-ghost">+ Lançar novo empréstimo</button>

    ${showAddLoan ? `
      <div class="card stack gap-8" id="add-loan-box">
        <div class="section-label" style="margin-bottom:0;">Novo empréstimo</div>
        <input type="text" data-field="name" placeholder="Nome (ex: Empréstimo pessoal)">
        <input type="text" data-field="bank" placeholder="Banco / instituição">
        <input type="number" data-field="totalAmount" step="0.01" min="0" placeholder="Valor total (R$)">
        <input type="number" data-field="installments" min="1" max="120" placeholder="Número de parcelas">
        <button data-action="salvarEmprestimo" class="btn btn-primary">Salvar empréstimo</button>
      </div>
    ` : ''}
  `;
}

export function afterRender(container, { render }) {
  bindMonthPicker(container, render);
  const store = window.__forja.store;

  container.querySelectorAll('[data-toggle-edit-loan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggleEditLoan;
      editingLoanId = editingLoanId === id ? null : id;
      render();
    });
  });

  container.querySelectorAll('[data-loan-field]').forEach((input) => {
    input.addEventListener('change', () => {
      const val = input.type === 'checkbox' ? input.checked : input.type === 'number' ? parseFloat(input.value || '0') : input.value;
      store.updateLoan(input.dataset.loanId, { [input.dataset.loanField]: val });
      render();
    });
  });

  const addBtn = container.querySelector('#btn-toggle-add-loan');
  if (addBtn) addBtn.addEventListener('click', () => { showAddLoan = !showAddLoan; render(); });
}

export function closeForms() {
  showAddLoan = false;
}
