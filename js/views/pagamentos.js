import { icon } from '../icons.js';
import * as store from '../store.js';
import { financeHeading, monthPicker, bindMonthPicker, monthLabel, escapeHTML as esc, toast } from '../ui.js';
export function render(state) {
 const ym=store.selectedFinanceMonth(), f=state.finance;
 const items=[];
 store.fixedBillsForMonth(ym).forEach(b=>items.push({key:'bill:'+b.id,label:b.name,amount:b.amount,group:'Contas fixas',sub:'Vence dia '+b.dueDay}));
 f.cards.forEach(c=>{const amount=store.cardInvoiceForMonth(c.id,ym);if(amount>0)items.push({key:'card:'+c.id,label:'Fatura '+c.name,amount,group:'Cartões',sub:'Vence dia '+c.dueDay});});
 f.loans.forEach(l=>{const amount=store.loanAmountForMonth(l,ym);if(amount>0)items.push({key:'loan:'+l.id,label:l.name,amount,group:'Empréstimos',sub:`Parcela ${store.monthsBetween(l.startMonth,ym)+1} de ${l.installments}`});});
 const lis=store.lisForMonth(ym);if(lis.used>0)items.push({key:'lis',label:'Especial provisionado',amount:lis.used,group:'Limite especial',sub:'Valor integral registrado · sem juros estimados'});
 store.financeEntries(ym).filter(e=>e.type==='expense').forEach(e=>items.push({key:e.id,label:e.description,amount:e.amount,group:'Despesas lançadas',sub:e.date.slice(8)+'/'+e.date.slice(5,7),entry:true,paid:e.status==='confirmed'}));
 (f.variableSpend[ym]||[]).forEach(e=>items.push({key:e.id,label:e.desc||e.category,amount:e.amount,group:'Despesas lançadas',sub:'Registro anterior · pago',paid:true,legacy:true}));
 const paid=it=>it.entry||it.legacy?it.paid:store.isPaid(ym,it.key);
 const total=(list)=>list.reduce((s,it)=>s+Math.round(it.amount*100),0)/100;
 return `${financeHeading('Pagamentos','Confira o que foi pago e o que ainda está previsto.')}${monthPicker()}
 <div class="grid-2"><div class="metric"><span>Pago em ${monthLabel(ym,true)}</span><strong class="positive">${store.formatMoney(total(items.filter(paid)))}</strong></div><div class="metric"><span>A pagar no mês</span><strong>${store.formatMoney(total(items.filter(it=>!paid(it))))}</strong></div></div>
 ${[...new Set(items.map(i=>i.group))].map(g=>`<section class="finance-section"><h2>${g}</h2>${items.filter(it=>it.group===g).map(it=>`<button class="check-row ${paid(it)?'done':''}" style="text-align:left" ${it.legacy?'disabled':''} data-payment-key="${it.key}" data-payment-entry="${!!it.entry}"><span class="check ${paid(it)?'checked':''}">${icon.check()}</span><span class="stack" style="flex:1"><span class="label">${esc(it.label)}</span><span class="hint">${esc(it.sub)}</span></span><strong class="fjc" style="font-size:14px">${store.formatMoney(it.amount)}</strong></button>`).join('')}</section>`).join('')||'<div class="empty-state"><strong>Mês sem compromissos</strong><p>Cadastre contas fixas ou uma nova despesa para começar.</p></div>'}`;
}
export function afterRender(container,{render}) {
 bindMonthPicker(container,render);
 container.querySelectorAll('[data-payment-key]').forEach(el=>el.addEventListener('click',()=>{
  const ym=store.selectedFinanceMonth();
  if(ym>store.monthKey()){toast('Pagamentos futuros permanecem previstos.');return;}
  if(el.dataset.paymentEntry==='true'){
   const e=store.financeEntries(ym).find(e=>e.id===el.dataset.paymentKey);
   store.updateFinanceOccurrence(e.id,ym,{status:e.status==='confirmed'?'planned':'confirmed'});
  }else store.togglePaid(ym,el.dataset.paymentKey);
  render();
 }));
}
