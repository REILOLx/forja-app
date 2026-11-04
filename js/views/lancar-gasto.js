import { financeHeading, defaultFinanceDate, escapeHTML as esc, toast } from '../ui.js';
import * as store from '../store.js';
const CATEGORIES=['Alimentação','Moradia','Transporte','Lazer','Saúde','Educação','Assinaturas','Outros'];
export function render(state) {
 return `${financeHeading('Nova despesa','Escolha a data e acompanhe o impacto no mês certo.')}
 <form id="expense-form" class="card stack" style="gap:20px">
 <div class="form-grid"><label class="field">Valor total (R$)<input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" placeholder="0,00" required></label><label class="field">Data de referência<input name="date" type="date" value="${defaultFinanceDate()}" required></label></div>
 <label class="field">Descrição<input name="description" type="text" maxlength="120" placeholder="Ex.: compra do supermercado" required></label>
 <label class="field">Categoria<select name="category">${CATEGORIES.map(c=>`<option>${c}</option>`).join('')}</select></label>
 <label class="field">Forma de pagamento<select name="method"><option value="pix">Pix / débito</option><option value="dinheiro">Dinheiro</option>${state.finance.cards.map(c=>`<option value="${c.id}">Cartão · ${esc(c.name)}</option>`).join('')}</select></label>
 <div id="cash-fields" class="stack" style="gap:18px"><label class="field">Situação<select name="status"><option value="confirmed">Já paguei</option><option value="planned">A pagar · previsto</option></select></label><label class="recurring-option"><input type="checkbox" name="recurring"><span><strong>Recorrente nos próximos meses</strong><small>Repete mensalmente como previsto. Você pode encerrar a repetição depois.</small></span></label></div>
 <div id="card-fields" class="stack gap-10" hidden><label class="field">Número de parcelas<input name="installments" type="number" min="1" max="120" value="1"></label><p class="hint">A primeira parcela entra na fatura do mês da data de referência. Ajuste a data para o mês da primeira fatura, conforme o fechamento do seu cartão.</p><p class="hint" id="installment-preview"></p></div>
 <p class="form-error" id="expense-error" role="alert"></p><button class="btn btn-primary">Salvar despesa</button><a href="#/financeiro" class="btn-ghost" style="text-align:center">Cancelar</a></form>`;
}
export function afterRender(container,{navigate}) {
 const form=container.querySelector('#expense-form');
 const isCard=()=>!['pix','dinheiro'].includes(form.elements.method.value);
 const update=()=>{container.querySelector('#cash-fields').hidden=isCard();container.querySelector('#card-fields').hidden=!isCard();const n=Number(form.elements.installments.value)||1;container.querySelector('#installment-preview').textContent=`${n} parcela(s), aproximadamente ${store.formatMoney(Number(form.elements.amount.value)/n)} cada.`;};
 ['method','amount','installments'].forEach(name=>form.elements[name].addEventListener('input',update));update();
 if(store.selectedFinanceMonth()>store.monthKey())form.elements.status.value='planned';
 form.addEventListener('submit',ev=>{
  ev.preventDefault();const d=Object.fromEntries(new FormData(form));
  try {
   if(!d.description.trim())throw new Error('Informe uma descrição.');
   if(isCard())store.addCardCharge({cardId:d.method,desc:d.description.trim(),totalAmount:Number(d.amount),installments:Number(d.installments),startMonth:d.date.slice(0,7)});
   else {
    if(d.date>store.todayISO()&&d.status==='confirmed')throw new Error('Uma despesa futura deve ficar como prevista.');
    store.addFinanceEntry({type:'expense',amount:Number(d.amount),date:d.date,description:d.description.trim(),category:d.category,method:d.method,status:d.status,recurring:d.recurring==='on'});
   }
   store.selectFinanceMonth(d.date.slice(0,7));navigate('/financeiro');toast('Despesa salva.');
  }catch(err){container.querySelector('#expense-error').textContent=err.message;}
 });
}
