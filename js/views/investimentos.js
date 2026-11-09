import { icon } from '../icons.js';
import * as store from '../store.js';
import { escapeHTML as esc, financeHeading, monthPicker, bindMonthPicker, defaultFinanceDate, toast } from '../ui.js';
export function render(state) {
  const ym=store.selectedFinanceMonth();
  const portfolio=store.investmentPortfolio(ym);
  const summary=store.financialSummary(ym);
  const total=summary.assets;
  const names=[...new Set(state.finance.entries.filter(e=>e.asset).map(e=>e.asset))];
  return `${financeHeading('Investimentos','Seu patrimônio, com registros simples e sob seu controle.')}${monthPicker()}
    <section class="hero-balance"><div class="section-label" style="color:var(--ember)">Patrimônio registrado até o mês</div><div class="hero-amount">${store.formatMoney(total)}</div><p class="hint">Soma dos saldos confirmados. Atualize os valores para refletir sua carteira.</p></section>
    <div class="metric-grid">
      <div class="metric"><span>Investimentos do mês · aportes</span><strong class="positive">${store.formatMoney(summary.invested)}</strong></div>
      <div class="metric"><span>Resgates do mês</span><strong>${store.formatMoney(summary.redeemed)}</strong></div>
    </div>
    <p class="hint">Aportes são investimentos, não gastos: ficam fora das despesas e do teto de 80%. Transferem dinheiro da conta para a carteira. Os valores do mês incluem movimentos previstos; apenas os confirmados entram no patrimônio.</p>
    <div class="finance-columns"><section class="card finance-section"><h2>Sua carteira</h2>
    ${portfolio.length?portfolio.map(a=>`<div class="finance-row"><span><strong>${esc(a.name)}</strong><small>${esc(a.category)}</small></span><span class="amount">${store.formatMoney(a.balance)}</span></div>`).join(''):'<div class="empty-state"><strong>Seu patrimônio começa aqui</strong><p>Registre o saldo que já possui e acompanhe os próximos aportes.</p></div>'}
    <p class="hint">Não há conexão automática com bancos ou corretoras. Rendimentos são registros de valorização na carteira; se forem pagos na sua conta, registre também o resgate correspondente.</p>
    <a href="#/financeiro" class="btn-ghost" style="text-align:center">Ver lançamentos do mês</a></section>
    <form id="investment-form" class="card stack" style="gap:18px"><h2>Registrar movimento</h2>
      <label class="field">Movimento<select name="type" id="investment-type"><option value="valuation">Informar saldo atual</option><option value="investment">Investimento · aporte na carteira</option><option value="redemption">Resgate · entra na conta</option><option value="yield">Rendimento · fica investido</option></select><span class="hint" id="investment-hint">Define o saldo da aplicação nesta data, sem movimentar o caixa. Use para cadastrar sua posição inicial ou atualizar a cotação.</span></label>
      <label class="field">Nome da aplicação<input name="asset" list="asset-names" placeholder="Ex.: Reserva de emergência" maxlength="80" required><datalist id="asset-names">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
      <label class="field">Categoria<select name="category"><option>Renda fixa</option><option>Tesouro Direto</option><option>Fundos</option><option>Ações</option><option>Fundos imobiliários</option><option>Previdência</option><option>Outros</option></select></label>
      <div class="form-grid"><label class="field">Valor (R$)<input name="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" required></label><label class="field">Data<input name="date" type="date" value="${defaultFinanceDate()}" required></label></div>
      <label class="field">Situação<select name="status"><option value="confirmed">Confirmado</option><option value="planned">Previsto</option></select><span class="hint">Apenas movimentos confirmados compõem o patrimônio. Aportes e resgates previstos entram na projeção mensal.</span></label>
      <p class="form-error" id="investment-error" role="alert"></p><button class="btn btn-primary">Salvar movimento</button>
    </form></div>`;
}
export function afterRender(container,{render}) {
  bindMonthPicker(container,render);
  const form=container.querySelector('#investment-form');
  const hints={valuation:'Define o saldo da aplicação nesta data, sem movimentar o caixa. Use para cadastrar sua posição inicial ou atualizar a cotação.',investment:'Transfere dinheiro da conta para a carteira, sem contar como gasto. Reduz o disponível na conta e aumenta o patrimônio quando confirmado.',redemption:'Aumenta o saldo previsto da conta e reduz o patrimônio quando confirmado.',yield:'Aumenta o patrimônio, sem somar uma entrada na conta.'};
  form.elements.type.addEventListener('change',()=>{container.querySelector('#investment-hint').textContent=hints[form.elements.type.value];form.elements.amount.min=form.elements.type.value==='valuation'?'0':'0.01';});
  if(store.selectedFinanceMonth()>store.monthKey()) form.elements.status.value='planned';
  form.addEventListener('submit',ev=>{
    ev.preventDefault();const d=Object.fromEntries(new FormData(form));
    try {
      if(d.date>store.todayISO()&&d.status==='confirmed')throw new Error('Um movimento futuro deve ficar como previsto.');
      if(!d.asset.trim())throw new Error('Informe o nome da aplicação.');
      if(d.type==='redemption'&&d.status==='confirmed') {
        const balance=store.investmentPortfolio(d.date.slice(0,7),d.date).find(a=>a.name===d.asset.trim())?.balance||0;
        if(Number(d.amount)>balance)throw new Error('O resgate supera o saldo registrado. Atualize o saldo da aplicação antes de continuar.');
      }
      store.addFinanceEntry({type:d.type,asset:d.asset.trim(),category:d.category,amount:Number(d.amount),date:d.date,status:d.status,description:({valuation:'Saldo',investment:'Aporte',redemption:'Resgate',yield:'Rendimento'})[d.type]+' · '+d.asset.trim(),recurring:false});
      store.selectFinanceMonth(d.date.slice(0,7));render();toast('Movimento salvo.');
    }catch(err){container.querySelector('#investment-error').textContent=err.message;}
  });
}
