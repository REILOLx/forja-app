const ymOK=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value||'');
const cents=value=>Math.round(Number(value)*100);
const sum=values=>values.reduce((total,value)=>total+value,0);
export function budgetMonth({month,income,expenses,invested,groups},today) {
  const items=groups.flatMap(group=>group.items.map(item=>({id:item.id,label:String(item.label||'Despesa').slice(0,120),group:group.id,cents:cents(item.amount),paid:item.status==='Pago'})));
  const incomeCents=cents(income),expenseCents=cents(expenses),ceilingCents=Math.round(incomeCents*.8),hasIncome=incomeCents>0;
  const variables=items.filter(item=>item.group==='variable'&&!item.paid&&item.cents>0).sort((a,b)=>b.cents-a.cents);
  const structuralCents=sum(items.filter(item=>['bills','loans','lis'].includes(item.group)).map(item=>item.cents));
  return {month,period:month<today.slice(0,7)?'past':month===today.slice(0,7)?'current':'future',incomeCents,expenseCents,ceilingCents,
    investedCents:cents(invested),gapCents:hasIncome?Math.max(0,expenseCents-ceilingCents):0,roomCents:hasIncome?Math.max(0,ceilingCents-expenseCents):0,
    status:!hasIncome?'missing-income':expenseCents>ceilingCents?'over':'within',paidCents:sum(items.filter(item=>item.paid).map(item=>item.cents)),
    structuralCents,variablePlannedCents:sum(variables.map(item=>item.cents)),variableCandidates:variables.slice(0,3),
    categories:groups.map(group=>({id:group.id,label:group.label,cents:cents(group.total)})),
    largestCosts:items.filter(item=>item.cents>0).sort((a,b)=>b.cents-a.cents).slice(0,6)};
}
export function financialSnapshot(referenceMonth,today,months) {
  if(!ymOK(referenceMonth)||!/^\d{4}-\d{2}-\d{2}$/.test(today)||!Array.isArray(months)||months.length!==12)throw new Error('Período inválido para a análise.');
  return {schemaVersion:1,referenceMonth,today,currency:'BRL',ceilingPercent:80,months:months.map(row=>budgetMonth(row,today))};
}
// O contrato contém apenas números e descrições do financeiro pessoal, nunca o app_state inteiro.
export function validateSnapshot(input) {
  if(!input||input.schemaVersion!==1||!ymOK(input.referenceMonth)||!/^\d{4}-\d{2}-\d{2}$/.test(input.today)||input.currency!=='BRL'||input.ceilingPercent!==80||!Array.isArray(input.months)||input.months.length!==12)throw new Error('Dados financeiros inválidos.');
  const seen=new Set(),integer=value=>Number.isSafeInteger(value)&&value>=0&&value<=1e14;
  const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max;
  const itemOK=item=>item&&text(item.id,160)&&text(item.label,120)&&['bills','cards','loans','variable','lis'].includes(item.group)&&integer(item.cents)&&typeof item.paid==='boolean';
  for(const row of input.months) {
    if(!row||!ymOK(row.month)||seen.has(row.month)||!['past','current','future'].includes(row.period)||!['missing-income','over','within'].includes(row.status))throw new Error('Mês inválido.');
    seen.add(row.month);
    for(const key of ['incomeCents','expenseCents','ceilingCents','investedCents','gapCents','roomCents','paidCents','structuralCents','variablePlannedCents'])if(!integer(row[key]))throw new Error('Valor financeiro inválido.');
    const hasIncome=row.incomeCents>0;
    if(row.ceilingCents!==Math.round(row.incomeCents*.8)||row.gapCents!==(hasIncome?Math.max(0,row.expenseCents-row.ceilingCents):0)||row.roomCents!==(hasIncome?Math.max(0,row.ceilingCents-row.expenseCents):0)||row.status!==(!hasIncome?'missing-income':row.gapCents?'over':'within'))throw new Error('O teto não confere com os valores cadastrados.');
    if(!Array.isArray(row.categories)||row.categories.length!==5||row.categories.some(category=>!text(category.label,80)||!['bills','cards','loans','variable','lis'].includes(category.id)||!integer(category.cents))||new Set(row.categories.map(c=>c.id)).size!==5||sum(row.categories.map(c=>c.cents))!==row.expenseCents)throw new Error('As categorias não conferem com o total.');
    if(!Array.isArray(row.largestCosts)||row.largestCosts.length>6||!row.largestCosts.every(itemOK)||!Array.isArray(row.variableCandidates)||row.variableCandidates.length>3||!row.variableCandidates.every(item=>itemOK(item)&&item.group==='variable'&&!item.paid))throw new Error('Itens de despesa inválidos.');
    if(row.paidCents>row.expenseCents||row.structuralCents>row.expenseCents||row.variablePlannedCents>row.expenseCents)throw new Error('Subtotal inválido.');
  }
  if(!seen.has(input.referenceMonth))throw new Error('Mês de referência ausente.');
  // Remove campos extras antes de enviar ao provedor.
  return {schemaVersion:1,referenceMonth:input.referenceMonth,today:input.today,currency:'BRL',ceilingPercent:80,months:input.months.map(row=>{
    const copy={};for(const key of ['month','period','status','incomeCents','expenseCents','ceilingCents','investedCents','gapCents','roomCents','paidCents','structuralCents','variablePlannedCents'])copy[key]=row[key];
    const cleanItem=item=>({id:item.id,label:item.label,group:item.group,cents:item.cents,paid:item.paid});
    return {...copy,categories:row.categories.map(c=>({id:c.id,label:c.label,cents:c.cents})),largestCosts:row.largestCosts.map(cleanItem),variableCandidates:row.variableCandidates.map(cleanItem)};
  })};
}
export const INSIGHT_RESPONSE_SCHEMA={type:'object',properties:{summary:{type:'string'},priorities:{type:'array',items:{type:'object',properties:{month:{type:'string'},explanation:{type:'string'},actions:{type:'array',items:{type:'string'}}},required:['month','explanation','actions']}},habits:{type:'array',items:{type:'string'}}},required:['summary','priorities','habits']};
export function validateInsightResponse(value,snapshot) {
  const text=(input,max)=>typeof input==='string'&&input.trim().length>0&&input.length<=max;
  if(!value||!text(value.summary,2400)||!Array.isArray(value.priorities)||value.priorities.length>12||!Array.isArray(value.habits)||value.habits.length>6||!value.habits.every(line=>text(line,600)))throw new Error('A resposta do Gemini veio incompleta. Tente novamente.');
  const seen=new Set();
  const priorities=value.priorities.map(row=>{
    if(!row||!snapshot.months.some(month=>month.month===row.month)||seen.has(row.month)||!text(row.explanation,1600)||!Array.isArray(row.actions)||row.actions.length<1||row.actions.length>5||!row.actions.every(line=>text(line,800)))throw new Error('O Gemini retornou uma análise fora do período solicitado.');
    seen.add(row.month);return {month:row.month,explanation:row.explanation.trim(),actions:row.actions.map(line=>line.trim())};
  });
  return {summary:value.summary.trim(),priorities,habits:value.habits.map(line=>line.trim())};
}
