import { icon } from '../icons.js';
import { formatMoney, loanDeductedFromNetSalary, loanSchedule, loanProgress, selectedFinanceMonth } from '../store.js';

import { monthPicker, bindMonthPicker, monthLabel, toast } from '../ui.js';

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
    <p class="hint">Defina o mês da primeira cobrança e o número de parcelas. Cada parcela é provisionada no mês correspondente e permanece prevista até você confirmar o pagamento em Pagamentos.</p>
    ${loans.map((l) => {
      const progress = loanProgress(l);
      const pct = progress.ratio;
      const remaining = progress.remaining;
      const color = remaining === 0 ? 'var(--green)' : pct > 0.6 ? 'var(--green)' : 'var(--ember)';
      const isEditing = editingLoanId === l.id;
      const schedule = loanSchedule(l);
      const selected = schedule.find(p=>p.month===selectedFinanceMonth());
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
              <input type="text" data-loan-field="name" data-loan-id="${l.id}" value="${l.name}" placeholder="Nome">

              <input type="text" data-loan-field="bank" data-loan-id="${l.id}" value="${l.bank}" placeholder="Banco">
              <div class="row gap-8">
                <label class="field" style="flex:1">Valor total do contrato (R$)<input type="number" data-loan-field="totalAmount" data-loan-id="${l.id}" value="${l.totalAmount}" step="0.01"></label>

              </div>
              <div class="row gap-8">
                <label class="field" style="flex:1">Parcelas pagas no histórico<input type="number" data-loan-field="paidInstallments" data-loan-id="${l.id}" value="${l.paidInstallments}" min="0" max="${l.installments}" step="1"></label>

              </div>
              <form data-loan-schedule-form="${l.id}" class="stack gap-10">
                <label class="field">Mês da primeira cobrança<input name="startMonth" type="month" value="${l.startMonth}" required></label>
                <div class="form-grid"><label class="field">Quantidade de parcelas<input name="installments" type="number" min="1" max="600" step="1" value="${l.installments}" required></label><label class="field">Parcela mensal (R$)<input name="monthlyAmount" type="number" min="0.01" step="0.01" value="${l.monthlyAmount}" required></label></div>
                <label class="recurring-option"><input name="automaticProgress" type="checkbox" ${progress.automatic?'checked':''}><span><strong>Consignado · barra avança automaticamente por mês</strong><small>Acompanha o calendário do contrato. A confirmação de pagamento fica separada.</small></span></label>
                <label class="recurring-option"><input name="provisionMonthly" type="checkbox" ${!loanDeductedFromNetSalary(l,l.startMonth)?'checked':''}><span><strong>Provisionar a parcela mensal no planejamento</strong><small>Reserva esse valor em cada mês a partir da primeira cobrança. Marque quando a receita cadastrada ainda não inclui esse desconto.</small></span></label>
                <p class="hint">Antes do início e depois da última parcela, nada é provisionado. A confirmação do pagamento não desloca as próximas parcelas. A opção acima define o tratamento de todas as parcelas do contrato.</p>
                <p class="form-error" data-loan-schedule-error role="alert"></p><button class="btn btn-primary">Salvar cronograma</button>
              </form>
            </div>
          ` : `
            <div class="row gap-14" style="align-items:center;">
              ${ring(pct, color)}
              <div style="flex:1;">
                <div style="font-size:14.5px;font-weight:700;margin-bottom:4px;">${l.name}</div>
                <div class="muted" style="font-size:12px;margin-bottom:2px;">${l.bank}</div>${selected?.inNetSalary?'<p class="hint">Já descontado do salário líquido · sem novo débito no caixa.</p>':''}
                <div class="muted" style="font-size:12px;">${progress.automatic?`Cronograma: ${progress.completed} de ${l.installments} parcelas · ${remaining} restantes`:(remaining===0?'Quitado':`Faltam ${remaining} de ${l.installments} parcelas`)}</div>
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
          ${progress.automatic?`<p class="hint">Barra prevista pelo calendário do mês selecionado. Comprovantes confirmados: ${progress.confirmed}/${l.installments}. A provisão mensal já entra no saldo antes da confirmação.</p>`:''}
          <p class="hint" style="margin-top:14px">Primeira cobrança: ${monthLabel(l.startMonth)} · Última: ${monthLabel(schedule.at(-1).month)} · ${l.installments} parcelas.</p>
          <p class="hint">${selected?`Neste mês: parcela ${selected.number}/${l.installments} · ${selected.status==='confirmed'?'Pagamento confirmado':'Prevista · aguardando confirmação'} · ${formatMoney(selected.amount)}`:selectedFinanceMonth()<l.startMonth?'Ainda não começou: sem provisão no mês selecionado.':'Sem parcela no mês selecionado.'}</p>
          <details class="details-panel"><summary>Ver as ${l.installments} parcelas</summary><div class="stack gap-8">${schedule.map(p=>`<button type="button" class="row card card-tight" data-loan-month="${p.month}" style="text-align:left;color:inherit"><span><strong>${p.number}/${l.installments} · ${monthLabel(p.month,true)}</strong><small style="display:block">${p.status==='confirmed'?'Pago':'Previsto'}${p.inNetSalary?' · já incluído no salário líquido':''}</small></span><strong>${formatMoney(p.amount)}</strong></button>`).join('')}</div></details>
        </div>`;
    }).join('') || '<div class="muted">Nenhum empréstimo cadastrado.</div>'}

    <button id="btn-toggle-add-loan" class="btn-ghost">+ Lançar novo empréstimo</button>

    ${showAddLoan ? `
      <div class="card stack gap-8" id="add-loan-box">
        <div class="section-label" style="margin-bottom:0;">Novo empréstimo</div>
        <input type="text" data-field="name" placeholder="Nome (ex: Empréstimo pessoal)">
        <input type="text" data-field="bank" placeholder="Banco / instituição">
        <input type="number" data-field="totalAmount" step="0.01" min="0" placeholder="Valor total (R$)">
        <label class="field">Número de parcelas<input type="number" data-field="installments" min="1" max="600" placeholder="Número de parcelas"></label>
        <label class="field">Primeira cobrança<input type="month" data-field="startMonth" value="${selectedFinanceMonth()}"></label>
        <label class="field">Parcela mensal (R$)<input type="number" data-field="monthlyAmount" step="0.01" min="0.01" placeholder="Opcional · total dividido pelas parcelas"></label>
        <button data-action="salvarEmprestimo" class="btn btn-primary">Salvar empréstimo</button>
      </div>
    ` : ''}
  `;
}

export function afterRender(container, { render, navigate }) {
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

  container.querySelectorAll('[data-loan-schedule-form]').forEach(form=>{
    form.elements.startMonth.addEventListener('change',()=>{
      if(form.elements.automaticProgress.checked&&form.elements.startMonth.value>store.monthKey())form.elements.provisionMonthly.checked=true;
    });
  });
  container.querySelectorAll('[data-loan-schedule-form]').forEach(form=>form.addEventListener('submit',ev=>{
    ev.preventDefault();
    try {
      store.configureLoanSchedule(form.dataset.loanScheduleForm,{startMonth:form.elements.startMonth.value,installments:Number(form.elements.installments.value),monthlyAmount:Number(form.elements.monthlyAmount.value),provisionMonthly:form.elements.provisionMonthly.checked,automaticProgress:form.elements.automaticProgress.checked});
      editingLoanId=null;render();toast('Cronograma salvo. As parcelas ficam previstas até você confirmar cada mês.');
    }catch(error){form.querySelector('[data-loan-schedule-error]').textContent=error.message;}
  }));
  container.querySelectorAll('[data-loan-month]').forEach(button=>button.addEventListener('click',()=>{store.selectFinanceMonth(button.dataset.loanMonth);navigate('/financeiro/pagamentos');}));
  const addBtn = container.querySelector('#btn-toggle-add-loan');
  if (addBtn) addBtn.addEventListener('click', () => { showAddLoan = !showAddLoan; render(); });
}

export function closeForms() {
  showAddLoan = false;
}
