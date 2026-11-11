const ymOK=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value||'');
const dateOK=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const cents=value=>Math.round(Number(value||0)*100),sum=values=>values.reduce((total,value)=>total+value,0);
const GROUPS=['bills','cards','loans','variable','lis'];
export function insightMonth(month,offset) {const [year,m]=month.split('-').map(Number);return new Date(Date.UTC(year,m-1+offset,1)).toISOString().slice(0,7);}
export function insightHorizon(finance,currentMonth) {
  let last=insightMonth(currentMonth,11);
  const add=month=>{if(ymOK(month)&&month>last)last=month;};
  for(const loan of finance.loans||[])if(ymOK(loan.startMonth)&&loan.installments>0)add(insightMonth(loan.startMonth,loan.installments-1));
  for(const charge of finance.cardCharges||[])if(ymOK(charge.startMonth)&&charge.installments>0)add(insightMonth(charge.startMonth,charge.installments-1));
  for(const entry of finance.entries||[]){add(entry.date?.slice(0,7));if(entry.endMonth)add(insightMonth(entry.endMonth,-1));}
  for(const bill of finance.fixedBills||[]){add(bill.startMonth);for(const version of bill.versions||[])add(version.month);if(bill.endMonth)add(insightMonth(bill.endMonth,-1));}
  for(const key of [...Object.keys(finance.cardInvoices||{}),...Object.keys(finance.entryOverrides||{})])add(key.slice(-7));
  for(const month of [...Object.keys(finance.variableSpend||{}),...Object.keys(finance.lisHistory||{})])add(month);
  const count=(Number(last.slice(0,4))-Number(currentMonth.slice(0,4)))*12+Number(last.slice(5))-Number(currentMonth.slice(5))+1;
  if(count>720)throw new Error('O planejamento ultrapassa 60 anos. Confira as datas dos compromissos antes de analisar.');
  return count;
}
const transaction=row=>({id:String(row.id),label:String(row.description||row.label||row.category||row.type),type:row.type,date:row.date,cents:cents(row.amount),status:row.status==='confirmed'?'confirmed':'planned',recurring:!!row.recurring,category:String(row.category||''),asset:String(row.asset||''),cashContribution:!!row.cashContribution});
export function budgetMonth({month,income,expenses,invested,groups,incomeEntries=[],investmentEntries=[],payrollLoans=[],balance,redeemed=0,assets=0,projectedAssets=0,reconciliationAdjustment=0},today) {
  const items=groups.flatMap(group=>group.items.map(item=>({id:String(item.id),label:String(item.label||'Despesa'),group:group.id,cents:cents(item.amount),paid:item.status==='Pago',date:item.date||null,dueDay:Number(item.dueDay)||null,recurring:!!item.recurring,category:String(item.category||''),detail:String(item.detail||''),invoiceKind:group.id==='cards'?(item.invoice?'registered':'estimated'):'none',components:(item.knownInstallments||item.installments||[]).map(part=>({id:String(part.id),label:String(part.label||'Compra parcelada'),cents:cents(part.amount),number:part.number,total:part.total,includedInInvoiceTotal:!item.invoice}))})));
  const incomeCents=cents(income),expenseCents=cents(expenses),ceilingCents=Math.round(incomeCents*.8),hasIncome=incomeCents>0;
  const variableCandidates=items.filter(item=>item.group==='variable'&&!item.paid&&item.cents>0).sort((a,b)=>b.cents-a.cents);
  return {month,period:month===today.slice(0,7)?'current':'future',incomeCents,expenseCents,ceilingCents,investedCents:cents(invested),redeemedCents:cents(redeemed),confirmedAssetsCents:cents(assets),projectedAssetsCents:cents(projectedAssets),reconciliationAdjustmentCents:cents(reconciliationAdjustment),cashForecastCents:balance===undefined?cents(income+redeemed-expenses-invested+reconciliationAdjustment):cents(balance),gapCents:hasIncome?Math.max(0,expenseCents-ceilingCents):0,roomCents:hasIncome?Math.max(0,ceilingCents-expenseCents):0,status:!hasIncome?'missing-income':expenseCents>ceilingCents?'over':'within',paidCents:sum(items.filter(item=>item.paid).map(item=>item.cents)),structuralCents:sum(items.filter(item=>['bills','loans','lis'].includes(item.group)).map(item=>item.cents)),variablePlannedCents:sum(variableCandidates.map(item=>item.cents)),categories:groups.map(group=>({id:group.id,label:group.label,cents:cents(group.total)})),items,variableCandidates,incomeEntries:incomeEntries.map(transaction),investmentEntries:investmentEntries.map(transaction),payrollLoans:payrollLoans.map(loan=>({id:String(loan.id),label:String(loan.label),cents:cents(loan.amount)}))};
}
export function financialSnapshot(referenceMonth,today,months,contracts={loans:[],cardCharges:[]}) {
  if(!dateOK(today)||referenceMonth!==today.slice(0,7)||!Array.isArray(months)||months.length<12||months.length>720)throw new Error('A análise deve começar no mês atual e incluir os próximos compromissos.');
  return {schemaVersion:2,referenceMonth,today,currency:'BRL',ceilingPercent:80,scope:'all-recorded-personal-finances',months:months.map(row=>budgetMonth(row,today)),contracts};
}
export function validateSnapshot(input) {
  if(!input||input.schemaVersion!==2||!dateOK(input.today)||input.referenceMonth!==input.today.slice(0,7)||input.currency!=='BRL'||input.ceilingPercent!==80||input.scope!=='all-recorded-personal-finances'||!Array.isArray(input.months)||input.months.length<12||input.months.length>720)throw new Error('A análise precisa conter o mês atual e os seguintes.');
  const integer=value=>Number.isSafeInteger(value)&&value>=0&&value<=1e14,signed=value=>Number.isSafeInteger(value)&&Math.abs(value)<=1e14;
  const text=(value,max,empty=false)=>typeof value==='string'&&(empty||value.length>0)&&value.length<=max;
  const cleanItem=item=>{
    if(!item||!text(item.id,200)||!text(item.label,500)||!GROUPS.includes(item.group)||!integer(item.cents)||typeof item.paid!=='boolean'||item.date!==null&&!dateOK(item.date)||item.dueDay!==null&&(!Number.isInteger(item.dueDay)||item.dueDay<1||item.dueDay>31)||typeof item.recurring!=='boolean'||!text(item.category,200,true)||!text(item.detail,1000,true)||!['registered','estimated','none'].includes(item.invoiceKind)||!Array.isArray(item.components))throw new Error('Item de despesa inválido.');
    const components=item.components.map(part=>{if(!part||!text(part.id,200)||!text(part.label,500)||!integer(part.cents)||!Number.isInteger(part.number)||part.number<1||!Number.isInteger(part.total)||part.total<part.number||typeof part.includedInInvoiceTotal!=='boolean'||part.includedInInvoiceTotal!==(item.invoiceKind==='estimated'))throw new Error('Parcela de cartão inválida.');return {id:part.id,label:part.label,cents:part.cents,number:part.number,total:part.total,includedInInvoiceTotal:part.includedInInvoiceTotal};});
    if(item.group==='cards'&&item.invoiceKind==='none'||item.group!=='cards'&&(item.invoiceKind!=='none'||components.length)||item.invoiceKind==='estimated'&&sum(components.map(part=>part.cents))!==item.cents)throw new Error('A fatura não confere com suas parcelas.');
    return {id:item.id,label:item.label,group:item.group,cents:item.cents,paid:item.paid,date:item.date,dueDay:item.dueDay,recurring:item.recurring,category:item.category,detail:item.detail,invoiceKind:item.invoiceKind,components};
  };
  const cleanTransaction=(row,types)=>{if(!row||!text(row.id,200)||!text(row.label,500)||!types.includes(row.type)||!dateOK(row.date)||!integer(row.cents)||!['confirmed','planned'].includes(row.status)||typeof row.recurring!=='boolean'||!text(row.category,200,true)||!text(row.asset,200,true)||typeof row.cashContribution!=='boolean')throw new Error('Movimentação financeira inválida.');return {id:row.id,label:row.label,type:row.type,date:row.date,cents:row.cents,status:row.status,recurring:row.recurring,category:row.category,asset:row.asset,cashContribution:row.cashContribution};};
  const months=input.months.map((row,index)=>{
    if(!row||row.month!==insightMonth(input.referenceMonth,index)||row.period!==(index?'future':'current'))throw new Error('Os meses devem estar completos e em ordem a partir do mês atual.');
    const copy={month:row.month,period:row.period,status:row.status};
    for(const key of ['incomeCents','expenseCents','ceilingCents','investedCents','redeemedCents','confirmedAssetsCents','projectedAssetsCents','gapCents','roomCents','paidCents','structuralCents','variablePlannedCents']){if(!integer(row[key]))throw new Error('Valor financeiro inválido.');copy[key]=row[key];}
    for(const key of ['cashForecastCents','reconciliationAdjustmentCents']){if(!signed(row[key]))throw new Error('Saldo inválido.');copy[key]=row[key];}
    const hasIncome=row.incomeCents>0;
    if(row.ceilingCents!==Math.round(row.incomeCents*.8)||row.gapCents!==(hasIncome?Math.max(0,row.expenseCents-row.ceilingCents):0)||row.roomCents!==(hasIncome?Math.max(0,row.ceilingCents-row.expenseCents):0)||row.status!==(!hasIncome?'missing-income':row.gapCents?'over':'within')||row.cashForecastCents!==row.incomeCents+row.redeemedCents-row.expenseCents-row.investedCents+row.reconciliationAdjustmentCents)throw new Error('O teto ou o saldo não conferem com os valores cadastrados.');
    if(!Array.isArray(row.categories)||row.categories.length!==5||row.categories.some(c=>!text(c.label,80)||!GROUPS.includes(c.id)||!integer(c.cents))||new Set(row.categories.map(c=>c.id)).size!==5||!Array.isArray(row.items))throw new Error('Categorias inválidas.');
    const items=row.items.map(cleanItem);
    if(new Set(items.map(item=>item.id)).size!==items.length||sum(items.map(item=>item.cents))!==row.expenseCents||sum(row.categories.map(c=>c.cents))!==row.expenseCents||row.categories.some(c=>sum(items.filter(item=>item.group===c.id).map(item=>item.cents))!==c.cents))throw new Error('O detalhamento não fecha com o total de despesas.');
    const candidates=items.filter(item=>item.group==='variable'&&!item.paid&&item.cents>0).sort((a,b)=>b.cents-a.cents);
    if(row.paidCents!==sum(items.filter(item=>item.paid).map(item=>item.cents))||row.structuralCents!==sum(items.filter(item=>['bills','loans','lis'].includes(item.group)).map(item=>item.cents))||row.variablePlannedCents!==sum(candidates.map(item=>item.cents)))throw new Error('Subtotais de despesas inválidos.');
    if(!Array.isArray(row.incomeEntries)||!Array.isArray(row.investmentEntries)||!Array.isArray(row.payrollLoans))throw new Error('Movimentações ausentes.');
    const incomeEntries=row.incomeEntries.map(entry=>cleanTransaction(entry,['income'])),investmentEntries=row.investmentEntries.map(entry=>cleanTransaction(entry,['investment','redemption','yield','valuation']));
    if([...incomeEntries,...investmentEntries].some(entry=>entry.date.slice(0,7)!==row.month))throw new Error('Movimentação fora do mês informado.');
    // Há dados legados sem lançamentos de receita; o total continua sendo o do resumo oficial.
    if(incomeEntries.length&&sum(incomeEntries.map(entry=>entry.cents))!==row.incomeCents)throw new Error('Receitas não conferem.');
    const payrollLoans=row.payrollLoans.map(loan=>{if(!text(loan.id,200)||!text(loan.label,500)||!integer(loan.cents))throw new Error('Desconto em folha inválido.');return {id:loan.id,label:loan.label,cents:loan.cents};});
    return {...copy,categories:row.categories.map(c=>({id:c.id,label:c.label,cents:c.cents})),items,variableCandidates:candidates,incomeEntries,investmentEntries,payrollLoans};
  });
  const contracts=input.contracts;if(!contracts||!Array.isArray(contracts.loans)||!Array.isArray(contracts.cardCharges))throw new Error('Cronogramas ausentes.');
  const cleanContract=(row,card=false)=>{if(!row||!text(row.id,200)||!text(row.label,500)||!ymOK(row.startMonth)||!ymOK(row.endMonth)||!Number.isInteger(row.installments)||row.installments<1||row.installments>600||row.endMonth!==insightMonth(row.startMonth,row.installments-1)||!integer(card?row.totalCents:row.monthlyCents))throw new Error('Contrato inválido.');return card?{id:row.id,label:row.label,cardId:String(row.cardId),startMonth:row.startMonth,endMonth:row.endMonth,installments:row.installments,totalCents:row.totalCents}:{id:row.id,label:row.label,startMonth:row.startMonth,endMonth:row.endMonth,installments:row.installments,monthlyCents:row.monthlyCents};};
  return {schemaVersion:2,referenceMonth:input.referenceMonth,today:input.today,currency:'BRL',ceilingPercent:80,scope:'all-recorded-personal-finances',months,contracts:{loans:contracts.loans.map(row=>cleanContract(row)),cardCharges:contracts.cardCharges.map(row=>cleanContract(row,true))}};
}
export const INSIGHT_RESPONSE_SCHEMA={type:'object',properties:{summary:{type:'string'},currentDiagnosis:{type:'string'},priorities:{type:'array',items:{type:'object',properties:{month:{type:'string'},explanation:{type:'string'},actions:{type:'array',items:{type:'string'}}},required:['month','explanation','actions']}},savingsPlan:{type:'array',items:{type:'object',properties:{month:{type:'string'},expenseId:{type:'string'},action:{type:'string'},how:{type:'string'},potentialSavingCents:{type:'integer'},condition:{type:'string'}},required:['month','expenseId','action','how','potentialSavingCents','condition']}},monthlyOutlook:{type:'array',items:{type:'object',properties:{month:{type:'string'},assessment:{type:'string'}},required:['month','assessment']}},habits:{type:'array',items:{type:'string'}}},required:['summary','currentDiagnosis','priorities','savingsPlan','monthlyOutlook','habits']};
export function validateInsightResponse(value,snapshot) {
  const text=(input,max,empty=false)=>typeof input==='string'&&(empty||input.trim().length>0)&&input.length<=max;
  if(!value||!text(value.summary,3000)||!text(value.currentDiagnosis,3000)||!Array.isArray(value.priorities)||value.priorities.length<1||value.priorities.length>12||!Array.isArray(value.habits)||value.habits.length>8||!value.habits.every(line=>text(line,800)))throw new Error('A resposta do Gemini veio incompleta. Tente novamente.');
  const months=new Map(snapshot.months.map(month=>[month.month,month])),seen=new Set();
  const priorities=value.priorities.map(row=>{if(!row||!months.has(row.month)||seen.has(row.month)||!text(row.explanation,2000)||!Array.isArray(row.actions)||row.actions.length<1||row.actions.length>6||!row.actions.every(line=>text(line,1000)))throw new Error('O Gemini retornou prioridades fora do período solicitado.');seen.add(row.month);return {month:row.month,explanation:row.explanation.trim(),actions:row.actions.map(line=>line.trim())};});
  if(!seen.has(snapshot.referenceMonth))throw new Error('A análise precisa explicar a situação do mês atual.');
  if(!Array.isArray(value.monthlyOutlook)||value.monthlyOutlook.length!==snapshot.months.length)throw new Error('A análise mês a mês veio incompleta.');
  const monthlyOutlook=value.monthlyOutlook.map((row,i)=>{if(!row||row.month!==snapshot.months[i].month||!text(row.assessment,800))throw new Error('A análise mês a mês não corresponde aos dados enviados.');return {month:row.month,assessment:row.assessment.trim()};});
  if(!Array.isArray(value.savingsPlan)||value.savingsPlan.length>20)throw new Error('Plano de economia inválido.');
  const used=new Set(),savingsPlan=value.savingsPlan.map(row=>{
    if(!row||!months.has(row.month)||!text(row.expenseId,200,true)||!text(row.action,800)||!text(row.how,1400)||!text(row.condition,800)||!Number.isSafeInteger(row.potentialSavingCents)||row.potentialSavingCents<0)throw new Error('Ação de economia inválida.');
    const item=months.get(row.month).items.find(item=>item.id===row.expenseId),key=row.month+':'+row.expenseId;
    if(row.expenseId&&!item||row.potentialSavingCents>0&&(!item||item.paid||!['bills','variable'].includes(item.group)||row.potentialSavingCents>item.cents)||row.expenseId&&used.has(key))throw new Error('A economia sugerida não confere com uma despesa que pode ser revista.');
    if(row.expenseId)used.add(key);return {month:row.month,expenseId:row.expenseId,action:row.action.trim(),how:row.how.trim(),potentialSavingCents:row.potentialSavingCents,condition:row.condition.trim()};
  });
  return {summary:value.summary.trim(),currentDiagnosis:value.currentDiagnosis.trim(),priorities,savingsPlan,monthlyOutlook,habits:value.habits.map(line=>line.trim())};
}
