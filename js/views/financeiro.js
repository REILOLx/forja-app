import { icon } from '../icons.js';
import * as store from '../store.js';
import * as settings from './financeiro-settings.js';
import { renderAnalysis } from './finance-analysis.js';
import { escapeHTML as esc, monthLabel, monthPicker, bindMonthPicker, toast } from '../ui.js';

let tab = 'overview';
let filter = 'all';
let editingEntry = null;
const TYPES = { income:'Receita',expense:'Despesa',investment:'Investimento · aporte',redemption:'Resgate',yield:'Rendimento',valuation:'Saldo atualizado' };
export function render(state) {
  const ym = store.selectedFinanceMonth();
  const summary = store.financialSummary(ym);
  const analysis = store.monthlyAnalysis(ym);
  const parts = store.monthCommitted(ym);
  return `<div class="page-heading"><div><div class="eyebrow">Planeje. Acompanhe. Evolua.</div><h1>Financeiro</h1><p class="page-description">Uma visão clara do seu presente e do que vem pela frente.</p></div><a href="#/config" class="icon-button" aria-label="Ajustes e backup">${icon.gear()}</a></div>
    ${monthPicker()}
    <section class="hero-balance" aria-label="Resumo do mês">
      <div class="row"><span class="section-label" style="margin:0;color:var(--ember)">Disponível na conta · previsto</span><span class="pill pill-dim">${ym > store.monthKey() ? 'Planejamento' : ym < store.monthKey() ? 'Histórico' : 'Mês atual'}</span></div>
      <div class="hero-amount ${summary.balance < 0 ? 'negative' : ''}">${store.formatMoney(summary.balance)}</div>
      <p class="hint">Receitas + resgates − despesas − investimentos. Aportes são transferências para seu patrimônio e não entram nos gastos nem no teto de 80%. Este valor é uma previsão, não o saldo bancário.</p>
      <div class="hero-foot"><span>${store.formatMoney(summary.received)} em receitas confirmadas</span><span>·</span><span>${store.formatMoney(summary.income - summary.received)} a receber</span></div>
      ${state.finance.cashReconciliations[ym]?`<p class="hint">Conciliação inicial: ${store.formatMoney(summary.reconciliationAdjustment)}. Ajusta o saldo da conta sem alterar gastos, receitas ou patrimônio. Novos lançamentos continuam alterando a previsão.</p>`:''}
    </section>
    ${initialMonthForm(state,ym)}
    <div class="metric-grid">
      ${metric('Receitas previstas', summary.income, 'positive')}${metric('Despesas previstas', summary.expenses)}${metric('Investimentos do mês', summary.invested, 'positive')}${metric('Patrimônio previsto acumulado', summary.projectedAssets, 'positive')}
    </div>
    <div class="quick-actions">
      <a href="#/financeiro/receita" class="card quick-action">${icon.plus()}<span>Nova receita</span></a>
      <a href="#/financeiro/lancar" class="card quick-action">${icon.wallet()}<span>Nova despesa</span></a>
      <a href="#/financeiro/cartoes" class="card quick-action">${icon.card()}<span>Lançar fatura</span></a>
      <a href="#/financeiro/investimentos" class="card quick-action">${icon.target()}<span>Investimentos</span></a>
    </div>
    <div class="segmented" role="tablist" aria-label="Visões do financeiro">
      ${[['overview','Visão geral'],['ledger','Lançamentos'],['commitments','Compromissos']].map(([id,label])=>`<button role="tab" aria-selected="${tab===id}" class="${tab===id?'active':''}" data-finance-tab="${id}">${label}</button>`).join('')}
    </div>
    <div role="tabpanel" class="stack" style="gap:22px">
    ${tab === 'commitments' ? settings.render(state) : tab === 'ledger' ? ledger(state, ym) : `
      ${renderAnalysis(ym)}
      <div class="finance-columns">
        <section class="card finance-section"><div class="row"><h2>Destino do seu dinheiro</h2><a href="#/financeiro/pagamentos" class="hint" style="color:var(--ember)">Ver pagamentos →</a></div>
          ${[['Contas fixas',parts.bills],['Faturas de cartão',parts.cards],['Empréstimos',parts.loans],['Despesas avulsas',parts.variable],['Limite especial provisionado',parts.lis],['Investimentos · fora dos gastos',summary.invested],['Empréstimos já descontados do salário · não debitados novamente',parts.payrollLoans]].map(([label,value])=>`<div class="finance-row"><span><strong>${label}</strong></span><span class="amount">${store.formatMoney(value)}</span></div>`).join('')}
        </section>
        <div class="finance-section">
          <section class="card finance-section"><h2>Seu teto de gastos · 80%</h2>
            <div class="row"><strong class="fjc">${store.formatMoney(summary.expenses)}</strong><span class="hint">de ${store.formatMoney(analysis.ceiling)}</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${analysis.ceiling > 0 ? Math.min(100,summary.expenses/analysis.ceiling*100) : summary.expenses>0?100:0}%;background:${analysis.headroom < 0 ? 'var(--red)' : 'var(--ember)'}"></div></div>
            <p class="hint">${summary.income===0?'Registre suas receitas para calcular o teto mensal.':analysis.headroom<0?`${store.formatMoney(-analysis.headroom)} acima do teto de gastos.`:`${store.formatMoney(analysis.headroom)} de margem até o teto.`}</p>
            <p class="hint">20% das receitas (${store.formatMoney(summary.income*.2)}) ficam fora do teto para sua reserva e seus investimentos.</p>
          </section>
          <section class="card finance-section"><h2>Receitas do mês</h2>${incomePreview(ym)}</section>
        </div>
      </div>
      ${spendingHorizon(ym)}
    `}</div>`;
}
function spendingHorizon(ym) {
  return `<section class="finance-section" aria-label="Planejamento de gastos e investimentos"><div><h2>Seu planejamento dos próximos meses</h2><p class="page-description">Acompanhe as faturas, a margem no teto de 80% e quanto pode investir.</p></div>
    <div class="forecast-grid">${[1,2,3].map(n=>{
      const month=store.addMonths(ym,n),plan=store.monthlySpendingPlan(month);
      return `<button class="card forecast" data-forecast-month="${month}"><small>${monthLabel(month,true)}</small>
        <strong class="forecast-primary ${plan.income===0?'':plan.headroom<0?'negative':'positive'}">${plan.income===0?'Sem receitas':store.formatMoney(Math.abs(plan.headroom))}</strong>
        <span class="forecast-label">${plan.income===0?'Cadastre a renda para calcular a margem':plan.headroom<0?'acima do teto de gastos':'de margem para novos gastos'}</span>
        <dl class="forecast-details"><div><dt>Receitas</dt><dd>${store.formatMoney(plan.income)}</dd></div>
          <div><dt>Despesas previstas</dt><dd>${store.formatMoney(plan.expenses)}</dd></div>
          <div><dt>Faturas incluídas nas despesas</dt><dd>${store.formatMoney(plan.cardExpenses)}</dd></div>
          <div><dt>Aportes planejados</dt><dd>${store.formatMoney(plan.invested)}</dd></div>
          <div><dt>Potencial total para investir</dt><dd>${store.formatMoney(plan.investmentPotential)}</dd></div></dl>
        ${plan.investmentShortfall>0?`<p class="negative">Faltam ${store.formatMoney(plan.investmentShortfall)} nas entradas previstas para cobrir despesas e aportes. Revise o planejamento.</p>`:''}
      </button>`;
    }).join('')}</div>
    <p class="hint">A margem considera os gastos já previstos e não é saldo em conta nem limite do cartão. Compras no crédito devem entrar no mês da fatura. Ao atualizar a fatura, a margem e o potencial de investimento são recalculados.</p>
    <p class="hint">O potencial é o total da renda que restaria depois das despesas cadastradas, incluindo os aportes já planejados. Novos gastos reduzem essa estimativa; ela não cria investimentos nem altera seu patrimônio. Toque em um mês para revisar o planejamento.</p></section>`;
}
function initialMonthForm(state,ym) {
  if(ym>store.monthKey())return '';
  const reconciliation=state.finance.cashReconciliations[ym];
  const included=store.financeEntries(ym).some(e=>e.type==='valuation'&&e.cashContribution);
  return `<details class="card finance-section"><summary>Conciliar mês inicial</summary>
    <form id="initial-month-form" class="stack gap-10" style="margin-top:16px">
      <p class="hint">Use uma vez para iniciar seu controle com o saldo real. Não cria despesa nem rendimento. A diferença fica registrada como ajuste de conciliação somente neste mês.</p>
      <label class="field">Saldo real na conta, sem investimentos (R$)<input name="accountBalance" type="number" step="0.01" min="0" value="${reconciliation?.accountBalance??0}" required></label>
      <label class="recurring-option"><input type="checkbox" name="includeValuations" ${included?'checked':''}><span><strong>Os saldos das aplicações deste mês são dinheiro investido neste mês</strong><small>Reconhece esses valores como aportes, preservando o patrimônio. Use somente se não houver aportes separados para o mesmo dinheiro.</small></span></label>
      ${state.finance.loans.map(l=>`<label class="recurring-option"><input type="checkbox" name="payrollLoan" value="${esc(l.id)}" ${store.loanDeductedFromNetSalary(l,ym)?'checked':''}><span><strong>${esc(l.name)} já foi descontado do salário líquido</strong><small>Preserva o contrato e evita descontar a parcela novamente, a partir deste mês.</small></span></label>`).join('')}
      <p class="form-error" id="initial-month-error" role="alert"></p><button class="btn btn-primary">Aplicar conciliação inicial</button>
      ${reconciliation?'<button type="button" id="clear-cash-reconciliation" class="btn-ghost">Remover somente o ajuste de saldo</button>':''}
    </form></details>`;
}
function metric(label, value, cls='') { return `<div class="metric"><span>${label}</span><strong class="${cls}">${store.formatMoney(value)}</strong></div>`; }
function incomePreview(ym) {
  const entries=store.financeEntries(ym).filter(e=>e.type==='income');
  return entries.length ? entries.map(e=>`<div class="finance-row"><span><strong>${esc(e.description)}</strong><small>${e.recurring?'Mensal · ':''}${e.status==='confirmed'?'Recebido':'A receber'} · dia ${e.date.slice(8)}</small></span><span class="amount positive">${store.formatMoney(e.amount)}</span></div>`).join('') : `<div class="empty-state"><strong>Nenhuma receita registrada</strong><p>Inclua seu salário e as entradas previstas para enxergar o saldo do mês.</p><a href="#/financeiro/receita" class="btn-link" style="display:inline-block;color:var(--ember)">Adicionar receita →</a></div>`;
}
function ledger(state,ym) {
  const entries=store.financeEntries(ym).map(e=>({...e,source:'entry'}));
  (state.finance.variableSpend[ym]||[]).forEach(e=>entries.push({...e,description:e.desc||e.category,type:'expense',status:'confirmed',source:'legacy'}));
  const visible=entries.filter(e=>filter==='all'||e.type===filter).sort((a,b)=>b.date.localeCompare(a.date));
  return `<div class="row gap-10"><h2>Lançamentos do mês</h2><label class="field"><select id="ledger-filter" aria-label="Filtrar lançamentos">${[['all','Todos'],...Object.entries(TYPES)].map(([v,label])=>`<option value="${v}" ${filter===v?'selected':''}>${label}</option>`).join('')}</select></label></div>
    <p class="hint">Movimentos avulsos e recorrentes. Contas fixas, faturas e parcelas estão em <a href="#/financeiro/pagamentos">Pagamentos do mês</a>.</p>
    ${visible.length ? `<div class="card">${visible.map(e=>`<div class="finance-row" style="align-items:flex-start"><div style="flex:1"><strong>${esc(e.description)}</strong><small>${e.type==='valuation'&&e.cashContribution?'Saldo com aporte do mês incluído':TYPES[e.type]} · ${e.date.slice(8)}/${e.date.slice(5,7)}${e.recurring?' · mensal':''}${e.asset?` · ${esc(e.asset)}`:''}</small>
      <span class="pill ${e.status==='confirmed'?'pill-green':'pill-dim'}" style="display:inline-block;margin-top:8px">${e.status==='confirmed'?'Confirmado':'Previsto'}</span>
      <div class="row gap-8" style="justify-content:flex-start;flex-wrap:wrap;margin-top:6px">
        ${e.source==='entry'?`<button class="btn-link" data-entry-toggle="${e.id}">${e.status==='confirmed'?'Marcar previsto':'Confirmar'}</button><button class="btn-link" data-entry-edit="${e.id}">Editar</button>`:''}
        <button class="btn-link" data-entry-delete="${e.id}" data-source="${e.source}">Excluir este mês</button>
        ${e.recurring?`<button class="btn-link" data-entry-end="${e.id}">Encerrar repetição</button>`:''}
      </div>
      ${editingEntry===e.id?`<form data-edit-entry-form="${e.id}" class="stack gap-8" style="margin-top:12px"><label class="field">Tipo de lançamento<select name="type">${Object.entries(TYPES).map(([type,label])=>`<option value="${type}" ${type===e.type?'selected':''}>${label}</option>`).join('')}</select></label><label class="field">Aplicação (para investimentos)<input name="asset" value="${esc(e.asset||'')}" maxlength="80"></label><label class="field">Descrição<input name="description" value="${esc(e.description)}" required maxlength="120"></label><label class="field">Valor (R$)<input name="amount" type="number" min="0" step="0.01" value="${e.amount}" required></label><p class="hint">Altera somente a ocorrência deste mês. Aporte é dinheiro novo guardado; saldo atualizado substitui o total da aplicação. Para corrigir uma despesa que era investimento, selecione Investimento · aporte.</p><button class="btn btn-primary">Salvar alteração</button></form>`:''}
    </div><span class="amount ${['income','redemption','yield'].includes(e.type)?'positive':''}">${store.formatMoney(e.amount)}</span></div>`).join('')}</div>` : '<div class="empty-state"><strong>Um mês para organizar</strong><p>Nenhum lançamento neste filtro. Use os atalhos acima para começar.</p></div>'}`;
}
export function afterRender(container, {render}) {
  bindMonthPicker(container,render);
  container.querySelectorAll('[data-finance-tab]').forEach(el=>el.addEventListener('click',()=>{tab=el.dataset.financeTab;editingEntry=null;render();}));
  container.querySelectorAll('[data-forecast-month]').forEach(el=>el.addEventListener('click',()=>{store.selectFinanceMonth(el.dataset.forecastMonth);render();container.scrollTop=0;}));
  if(tab==='commitments') settings.afterRender(container,{render});
  container.querySelector('#ledger-filter')?.addEventListener('change',ev=>{filter=ev.target.value;render();});
  const ym=store.selectedFinanceMonth();
  container.querySelector('#initial-month-form')?.addEventListener('submit',ev=>{
    ev.preventDefault();const form=ev.currentTarget;
    try {
      store.reconcileInitialMonth({accountBalance:Number(form.elements.accountBalance.value),includeValuationsAsContributions:form.elements.includeValuations.checked,payrollLoanIds:[...form.querySelectorAll('[name=payrollLoan]:checked')].map(el=>el.value)},ym);
      render();toast('Saldo inicial conciliado. Investimentos preservados e fora dos gastos.');
    }catch(error){container.querySelector('#initial-month-error').textContent=error.message;}
  });
  container.querySelector('#clear-cash-reconciliation')?.addEventListener('click',()=>{store.clearCashReconciliation(ym);render();});
  container.querySelectorAll('[data-entry-toggle]').forEach(el=>el.addEventListener('click',()=>{
    const e=store.financeEntries(ym).find(e=>e.id===el.dataset.entryToggle);
    if(e.status!=='confirmed' && e.date>store.todayISO()) {toast('Mantenha os movimentos futuros como previstos.');return;}
    store.updateFinanceOccurrence(e.id,ym,{status:e.status==='confirmed'?'planned':'confirmed'});render();toast('Situação atualizada.');
  }));
  container.querySelectorAll('[data-entry-edit]').forEach(el=>el.addEventListener('click',()=>{editingEntry=editingEntry===el.dataset.entryEdit?null:el.dataset.entryEdit;render();}));
  container.querySelectorAll('[data-edit-entry-form]').forEach(form=>form.addEventListener('submit',ev=>{
    ev.preventDefault();const type=form.elements.type.value,asset=form.elements.asset.value.trim(),amount=Number(form.elements.amount.value);
    if(!Number.isFinite(amount)||amount<0||(amount===0&&type!=='valuation')){toast('Informe um valor válido.');return;}
    if(['investment','redemption','yield','valuation'].includes(type)&&!asset){toast('Informe a aplicação deste investimento.');return;}
    const entry=store.financeEntries(ym).find(e=>e.id===form.dataset.editEntryForm);
    if(entry.recurring&&['investment','redemption','yield','valuation'].includes(type)){toast('Encerre a repetição e registre o aporte na tela Investimentos.');return;}
    store.updateFinanceOccurrence(entry.id,ym,{type,asset,description:form.elements.description.value.trim(),amount});editingEntry=null;render();toast('Lançamento atualizado.');
  }));
  container.querySelectorAll('[data-entry-delete]').forEach(el=>el.addEventListener('click',()=>{
    if(!window.confirm('Excluir este lançamento do mês selecionado?'))return;
    if(el.dataset.source==='legacy')store.removeVariableExpense(el.dataset.entryDelete,ym);else store.updateFinanceOccurrence(el.dataset.entryDelete,ym,{deleted:true});render();toast('Lançamento excluído.');
  }));
  container.querySelectorAll('[data-entry-end]').forEach(el=>el.addEventListener('click',()=>{
    if(window.confirm('Encerrar a repetição a partir deste mês? Os meses anteriores serão mantidos.')){store.endFinanceRecurrence(el.dataset.entryEnd,ym);render();}
  }));
}
export function closeForms() { settings.closeForms(); }
