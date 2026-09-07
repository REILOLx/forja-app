import { icon } from '../icons.js';
import { activeLoanBalance, formatMoney } from '../store.js';

const CIRC = 2 * Math.PI * 15.5;

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

    ${loans.map((l) => {
      const pct = l.installments ? l.paidInstallments / l.installments : 0;
      const remaining = activeLoanBalance(l);
      const color = remaining === 0 ? 'var(--green)' : pct > 0.6 ? 'var(--green)' : 'var(--ember)';
      return `
        <div class="card">
          <div class="row gap-14" style="align-items:center;">
            ${ring(pct, color)}
            <div style="flex:1;">
              <div style="font-size:14.5px;font-weight:700;margin-bottom:4px;">${l.name}</div>
              <div class="muted" style="font-size:12px;margin-bottom:2px;">${l.bank}</div>
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
        </div>`;
    }).join('') || '<div class="muted">Nenhum empréstimo cadastrado.</div>'}

    <button data-action="toggleAddLoan" class="btn-ghost">+ Lançar novo empréstimo</button>

    <div id="add-loan-box" class="card hidden-box stack gap-8">
      <div class="section-label" style="margin-bottom:0;">Novo empréstimo</div>
      <input type="text" data-field="name" placeholder="Nome (ex: Empréstimo pessoal)">
      <input type="text" data-field="bank" placeholder="Banco / instituição">
      <input type="number" data-field="totalAmount" step="0.01" min="0" placeholder="Valor total (R$)">
      <input type="number" data-field="installments" min="1" max="120" placeholder="Número de parcelas">
      <button data-action="salvarEmprestimo" class="btn btn-primary">Salvar empréstimo</button>
    </div>
  `;
}
