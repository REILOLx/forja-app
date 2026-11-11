import * as store from '../store.js';
import {requestFinancialInsights,geminiConnectionStatus} from '../gemini-client.js';
import {cachedInsights,cacheInsights} from '../insights-cache.js';
import {financeHeading,monthLabel,escapeHTML as esc} from '../ui.js';
let aiResult=null,resultSnapshot=null,resultOwner=null,busy=false,error='',attemptedSnapshot=null,requestRevision=0,connectionRevision=0,cleanup=null;
let connection={owner:null,status:'unknown',message:''};
const money=value=>store.formatMoney(value/100);
const here=()=>location.hash==='#/financeiro/insights';
export function render() {
  const owner=store.currentUserId();
  if(connection.owner!==owner){connection={owner,status:'unknown',message:''};connectionRevision++;requestRevision++;busy=false;aiResult=null;resultSnapshot=null;attemptedSnapshot=null;error='';}
  let snapshot;try{snapshot=store.financialInsightSnapshot();}catch(cause){return `${financeHeading('Insights financeiros','Análise completa do mês atual em diante.')}<section class="card"><p class="form-error">${esc(cause.message)}</p><a href="#/financeiro" class="btn-link">Conferir os dados financeiros →</a></section>`;}
  const current=snapshot.months[0],key=JSON.stringify(snapshot),over=snapshot.months.filter(month=>month.status==='over');
  if(resultSnapshot&&(resultSnapshot!==key||resultOwner!==owner)){aiResult=null;resultSnapshot=null;}
  const itemCount=snapshot.months.reduce((n,month)=>n+month.items.length,0),last=snapshot.months.at(-1);
  return `${financeHeading('Insights financeiros','Seu mês atual, todos os gastos cadastrados e os próximos compromissos.')}
    <div class="card insight-period"><strong>De ${monthLabel(current.month)} a ${monthLabel(last.month)}</strong><p class="hint">${snapshot.months.length} meses · começa sempre no mês atual e alcança o fim dos parcelamentos conhecidos, com no mínimo 12 meses. Contas recorrentes continuam previstas nesse período. Você não precisa escolher um mês: o diagnóstico abrange todo esse horizonte.</p></div>
    ${currentCard(current)}
    <section class="card hub-section" id="gemini-analysis"><div class="hub-section-title"><h2>Seu diagnóstico com Gemini</h2><span class="pill ${connection.status==='ready'?'pill-green':'pill-dim'}" id="gemini-connection-badge">${connection.status==='ready'?'Conectado':connection.status==='missing'?'Conexão pendente':'Verificando conexão'}</span></div><p class="hint">O Gemini receberá todas as ${itemCount} ocorrências de despesa dos ${snapshot.months.length} meses, com nome, valor, categoria, situação e parcelas conhecidas, além de receitas, investimentos separados, saldos previstos e contratos. Não há recorte para apenas os maiores gastos.</p>
    ${connection.status==='missing'?`<p class="form-error" role="status">${esc(connection.message)}</p><button class="btn-ghost" id="retry-gemini-connection">Verificar conexão novamente</button>`:''}
    <button class="btn btn-primary" id="generate-gemini-insights" ${busy||connection.status!=='ready'?'disabled':''}>${busy?'Analisando todos os meses…':connection.status==='missing'?'Ativação do Gemini pendente':error?'Tentar análise novamente':'Atualizar diagnóstico e plano de economia'}</button><p class="form-error" role="status" aria-live="polite" id="gemini-insights-error">${esc(error)}</p>${aiResult?renderAI(aiResult,snapshot):'<p class="hint">Ao abrir esta tela, a análise começa automaticamente quando o serviço está conectado. Você verá o que ajustar agora, no próximo mês e no restante do horizonte, com ações para economizar. Sugestões com valor dependem das condições indicadas.</p>'}</section>
    <section class="hub-section" id="insight-month-detail"><span class="section-label">Conferência dos dados · Forja</span><h2>Agora e no próximo mês</h2><div class="insight-focus-months">${snapshot.months.slice(0,2).map((month,i)=>`<article class="card hub-section" data-insight-focus="${month.month}"><span class="section-label">${i===0?'Mês atual':'Próximo mês'} · ${monthLabel(month.month)}</span><p class="hint">Receitas: ${money(month.incomeCents)} · Despesas: ${money(month.expenseCents)}</p>${localPriorities(month)}${auditDisclosure(month)}</article>`).join('')}</div></section>
    <section class="hub-section"><div><h2>Demais meses do seu horizonte</h2><p class="hint">${over.length} mês(es) acima do teto no período completo. Todas as recorrências cadastradas entram na análise automaticamente. Abra os detalhes apenas se quiser conferir os valores.</p></div>${monthGrid(snapshot.months.slice(2,12),aiResult)}${snapshot.months.length>12?`<details class="card hub-section"><summary>Ver os ${snapshot.months.length-12} meses seguintes até ${monthLabel(last.month)}</summary>${monthGrid(snapshot.months.slice(12),aiResult)}</details>`:''}<p class="hint">Uma fatura informada substitui as parcelas estimadas. Quando só o total foi cadastrado, as compras não discriminadas continuam desconhecidas. O Gemini recebe essa limitação e não deve inventar para onde foi essa parte do dinheiro.</p></section>`;
}
function currentCard(month) {
  return `<section class="card hub-hero hub-section" id="insight-current-month"><span class="section-label">Situação atual · ${monthLabel(month.month)}</span><h2>${month.status==='missing-income'?'Falta cadastrar a renda deste mês':month.status==='over'?'O mês atual está acima do teto':'O mês atual está dentro do teto'}</h2><strong class="hub-number ${month.status==='over'?'negative':'positive'}">${month.status==='missing-income'?'Renda a informar':money(month.status==='over'?month.gapCents:month.roomCents)}</strong><p class="hint">${month.status==='missing-income'?'O teto precisa das receitas cadastradas.':month.status==='over'?'Valor que excede o teto neste mês. Não desaparece ao deixar de registrar gastos já feitos.':'Margem de gastos, considerando as despesas cadastradas. Não é saldo disponível na conta.'}</p><div class="insight-totals"><span>Receitas<strong>${money(month.incomeCents)}</strong></span><span>Teto de 80%<strong>${money(month.ceilingCents)}</strong></span><span>Despesas<strong>${money(month.expenseCents)}</strong></span></div><p class="hint">Aportes do mês: ${money(month.investedCents)} · patrimônio previsto: ${money(month.projectedAssetsCents)}. Investimento permanece fora dos gastos.</p><p class="hint">Saldo previsto na conta: ${money(month.cashForecastCents)}. É a previsão do app, não uma consulta ao banco.</p></section>`;
}
function localPriorities(month) {
  if(month.status==='missing-income')return '<p class="hint">As despesas estão registradas; falta informar a renda deste mês para avaliar o teto.</p>';
  const lines=[month.status==='over'?`Este mês tem ${money(month.gapCents)} acima do teto. Reveja despesas ainda não assumidas e os custos dos próximos meses; resgatar investimentos não reduz o gasto.`:`Há ${money(month.roomCents)} de margem até o teto. Confira em qual fatura entra uma nova compra antes de assumi-la.`];
  if(month.structuralCents>month.ceilingCents)lines.push(`Contas fixas, empréstimos e limite especial já somam ${money(month.structuralCents)}, acima do teto de ${money(month.ceilingCents)}. Pequenos cortes podem não bastar; as parcelas contratadas continuam devidas.`);
  if(month.variableCandidates.length)lines.push(`Há ${money(month.variablePlannedCents)} em despesas avulsas previstas para reavaliar. Nem toda despesa prevista é opcional: confira a necessidade antes de propor um corte.`);
  return `<ol class="insight-priorities">${lines.map(line=>`<li>${esc(line)}</li>`).join('')}</ol>`;
}
function auditMonth(month) {
  return `<div class="stack gap-14"><div class="insight-audit-totals">${month.categories.map(category=>`<div class="expense-subtotal-row"><span>${esc(category.label)}</span><strong>${money(category.cents)}</strong></div>`).join('')}<div class="expense-subtotal-row expense-grand-total"><strong>Total de despesas</strong><strong>${money(month.expenseCents)}</strong></div></div>${month.items.map(item=>`<article class="expense-detail-item" data-insight-expense-id="${esc(item.id)}"><div class="expense-item-top"><div><strong>${esc(item.label)}</strong><p class="hint">${esc(item.category||item.detail)} · ${item.paid?'Pago':'Previsto'}${item.recurring?' · recorrente':''}</p></div><strong class="expense-item-amount">${money(item.cents)}</strong></div>${item.components.length?`<details><summary>${item.invoiceKind==='registered'?'Parcelas conhecidas de referência · não somadas novamente':'Parcelas que compõem esta estimativa'}</summary>${item.components.map(part=>`<div class="expense-installment-row"><span>${esc(part.label)}<small>${part.number}/${part.total}</small></span><strong>${money(part.cents)}</strong></div>`).join('')}</details>`:''}${item.invoiceKind==='registered'?'<p class="hint">Fatura total informada. O app não possui a discriminação de todas as compras desta fatura.</p>':''}</article>`).join('')||'<p class="hint">Nenhuma despesa neste mês.</p>'}
    <details><summary>Receitas e investimentos enviados separadamente</summary>${[...month.incomeEntries,...month.investmentEntries].map(entry=>`<div class="expense-subtotal-row"><span>${esc(entry.label)} · ${entry.date.slice(8)}/${entry.date.slice(5,7)} · ${entry.type==='income'?'Receita':({investment:'Aporte',redemption:'Resgate',yield:'Rendimento',valuation:'Saldo investido'})[entry.type]} · ${entry.status==='confirmed'?'Confirmado':'Previsto'}</span><strong>${money(entry.cents)}</strong></div>`).join('')||'<p class="hint">Sem movimentos cadastrados.</p>'}${month.payrollLoans.length?`<p class="hint">Já descontados do salário líquido, fora da soma de despesas:</p>${month.payrollLoans.map(loan=>`<div class="expense-subtotal-row"><span>${esc(loan.label)}</span><strong>${money(loan.cents)}</strong></div>`).join('')}`:''}</details></div>`;
}
function auditDisclosure(month) {
  return `<details class="insight-audit" data-insight-audit="${month.month}"><summary>Conferir gastos e valores (${month.items.length} itens)</summary></details>`;
}
function monthGrid(months,result) {
  const outlook=new Map((result?.monthlyOutlook||[]).map(row=>[row.month,row.assessment]));
  return `<div class="insight-months">${months.map(month=>`<article class="card insight-month ${month.status==='over'?'over':''}" data-insight-period="${month.month}"><span>${monthLabel(month.month,true)}</span><strong class="${month.status==='over'?'negative':'positive'}">${month.status==='missing-income'?'Falta a renda':money(month.status==='over'?month.gapCents:month.roomCents)}</strong><small>${month.status==='missing-income'?'Receita não cadastrada':month.status==='over'?'acima do teto':'de margem no teto'}</small><small>Despesas: ${money(month.expenseCents)}</small>${outlook.has(month.month)?`<p class="hint">${esc(outlook.get(month.month))}</p>`:''}${auditDisclosure(month)}</article>`).join('')}</div>`;
}
function renderAI(result,snapshot) {
  return `<div class="stack gap-14 gemini-result"><h3>Diagnóstico da sua situação</h3><p class="hub-note">${esc(result.summary)}</p><h3>Mês atual: o que está acontecendo</h3><p class="hub-note">${esc(result.currentDiagnosis)}</p><h3>Plano prático para reduzir gastos</h3>${result.savingsPlan.map(row=>{const month=snapshot.months.find(month=>month.month===row.month),item=month.items.find(item=>item.id===row.expenseId);return `<article class="gemini-saving-action"><div class="hub-section-title"><strong>${esc(row.action)}</strong><span class="pill pill-dim">${monthLabel(row.month,true)}</span></div>${item?`<p class="hint">Despesa: ${esc(item.label)} · ${money(item.cents)}</p>`:''}<p class="hub-note">${esc(row.how)}</p><p class="hint">${row.potentialSavingCents>0?`Hipótese de economia: <strong>${money(row.potentialSavingCents)}</strong>. `:''}${esc(row.condition)}</p></article>`;}).join('')||'<p class="hint">Não há redução específica proposta com base nos dados atuais. Confira as prioridades abaixo.</p>'}
    <h3>O que ajustar no seu horizonte</h3>${result.priorities.map((row,index)=>`<article data-gemini-priority="${row.month}"><span class="section-label">${index===0?'Agora':index===1?'Próximo mês':'Planeje com antecedência'}</span><h3>${monthLabel(row.month)}</h3><p class="hub-note">${esc(row.explanation)}</p><ul>${row.actions.map(line=>`<li>${esc(line)}</li>`).join('')}</ul></article>`).join('')}${result.habits.length?`<div><h3>Hábitos para economizar no seu caso</h3><ul>${result.habits.map(line=>`<li>${esc(line)}</li>`).join('')}</ul></div>`:''}<p class="hint">A leitura de todos os meses está nas previsões abaixo. ${esc(result.model)} · ${new Date(result.generatedAt).toLocaleString('pt-BR')}. Estimativas precisam ser confirmadas; nenhum lançamento é alterado automaticamente.</p></div>`;
}
export function dispose(){cleanup?.();cleanup=null;}
export function afterRender(container,{render}) {
  dispose();if(!container.querySelector('#gemini-analysis'))return;
  const date=store.todayISO(),tick=()=>{if(date!==store.todayISO())render();},interval=setInterval(tick,30000);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);cleanup=()=>{clearInterval(interval);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};
  if(connection.status==='unknown'){
    connection.status='checking';const token=++connectionRevision,owner=store.currentUserId();
    geminiConnectionStatus().then(()=>{if(token===connectionRevision&&owner===store.currentUserId())connection={owner,status:'ready',message:''};}).catch(cause=>{if(token===connectionRevision&&owner===store.currentUserId())connection={owner,status:'missing',message:cause.message};}).finally(()=>{if(token===connectionRevision&&here())render();});
  }
  container.querySelector('#retry-gemini-connection')?.addEventListener('click',()=>{connection.status='unknown';attemptedSnapshot=null;render();});
  container.querySelectorAll('[data-insight-audit]').forEach(details=>details.addEventListener('toggle',()=>{
    if(!details.open||details.dataset.loaded)return;
    const month=store.financialInsightSnapshot().months.find(month=>month.month===details.dataset.insightAudit);
    if(month){details.insertAdjacentHTML('beforeend',auditMonth(month));details.dataset.loaded='true';}
  }));
  container.querySelector('#generate-gemini-insights').addEventListener('click',()=>analyze(render,true));
  if(connection.status==='ready'&&!busy&&!aiResult){
    const key=JSON.stringify(store.financialInsightSnapshot());
    if(attemptedSnapshot!==key)void analyze(render);
  }
}
async function analyze(render,force=false) {
  if(busy||connection.status!=='ready')return;
  const snapshot=store.financialInsightSnapshot(),key=JSON.stringify(snapshot),owner=store.currentUserId(),token=++requestRevision;
  attemptedSnapshot=key;busy=true;error='';render();
  try{
    const cached=force?null:await cachedInsights(owner,snapshot);
    if(token!==requestRevision||owner!==store.currentUserId())return;
    const result=cached||await requestFinancialInsights(snapshot);
    if(token!==requestRevision||owner!==store.currentUserId())return;
    aiResult=result;resultSnapshot=key;resultOwner=owner;
    if(!cached)await cacheInsights(owner,snapshot,result);
  }catch(cause){if(token===requestRevision&&owner===store.currentUserId())error=cause.message;}
  finally{if(token===requestRevision){busy=false;if(here())render();}}
}
