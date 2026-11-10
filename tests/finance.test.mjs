import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { normalizeFinance, installmentAt, entriesAt, portfolioAt } from '../js/finance-model.js';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
globalThis.window={dispatchEvent(){}};
let source=await fs.readFile(new URL('../js/store.js',import.meta.url),'utf8');
source=source.replace("import { sb } from './supabase-client.js';",'const sb = {};').replace("'./finance-model.js'",JSON.stringify(pathToFileURL(resolve('js/finance-model.js')).href)).replace("'./hub-model.js'",JSON.stringify(pathToFileURL(resolve('js/hub-model.js')).href));
const store=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const clean=()=>{store.resetApp();store.selectFinanceMonth('2026-11');};

test('migração aditiva mantém dados e ancora cronograma apenas uma vez',()=>{
 clean();const original=JSON.parse(store.exportData());delete original.finance.entries;
 const migrated=normalizeFinance(original,'2026-11');const anchor=migrated.finance.loans[0].startMonth;
 normalizeFinance(migrated,'2026-12');assert.equal(migrated.finance.loans[0].startMonth,anchor);
 assert.equal(migrated.finance.fixedBills[0].amount,1200);assert.deepEqual(migrated.finance.entries,[]);
});
test('salário recorrente preserva confirmação por mês e não aparece antes do início',()=>{
 clean();store.addFinanceEntry({type:'income',category:'Salário',description:'Salário',amount:5000,date:'2026-11-30',status:'confirmed',recurring:true});
 assert.equal(store.financeEntries('2026-10').length,0);assert.equal(store.financialSummary('2026-11').received,5000);
 const next=store.financeEntries('2026-12')[0];assert.equal(next.status,'planned');
 assert.equal(store.financeEntries('2027-02')[0].date,'2027-02-28');
 store.updateFinanceOccurrence(next.id,'2026-12',{status:'confirmed',amount:5200});
 assert.equal(store.financialSummary('2026-12').received,5200);assert.equal(store.financialSummary('2026-11').income,5000);
 store.endFinanceRecurrence(next.id,'2027-01');assert.equal(store.financeEntries('2027-01').length,0);assert.equal(store.financeEntries('2026-12').length,1);
});
test('13º e despesa futura entram somente no mês lançado',()=>{
 clean();store.addFinanceEntry({type:'income',category:'13º',description:'13º',amount:2500,date:'2026-12-20',status:'planned',recurring:false});
 store.addFinanceEntry({type:'expense',description:'Viagem',amount:600,date:'2026-12-22',status:'planned',recurring:false});
 assert.equal(store.financialSummary('2026-11').income,0);assert.equal(store.financialSummary('2026-12').income,2500);
 assert.equal(store.monthCommitted('2026-12').variable,600);assert.equal(store.monthCommitted('2027-01').variable,0);
});
test('contas fixas e orçamento preservam meses anteriores',()=>{
 clean();store.updateFixedBill('aluguel',{amount:1400});store.updateBudget(4500);
 assert.equal(store.fixedBillsForMonth('2026-10')[0].amount,1200);assert.equal(store.fixedBillsForMonth('2026-11')[0].amount,1400);
 assert.equal(store.monthPercent('2026-10').budget,3000);assert.equal(store.monthPercent('2026-12').budget,4500);
 store.selectFinanceMonth('2026-12');store.removeFixedBill('aluguel');
 assert(store.fixedBillsForMonth('2026-11').some(b=>b.id==='aluguel'));assert(!store.fixedBillsForMonth('2026-12').some(b=>b.id==='aluguel'));
});
test('parcelas somam exatamente o total em centavos e respeitam início/fim',()=>{
 const c={totalAmount:100,installments:3,startMonth:'2026-11'};
 assert.equal(installmentAt(c,'2026-10'),0);assert.equal(installmentAt(c,'2027-02'),0);
 assert.deepEqual(['2026-11','2026-12','2027-01'].map(m=>installmentAt(c,m)),[33.34,33.33,33.33]);
});
test('pagar empréstimo não desloca projeção e pode ser desfeito',()=>{
 clean();const loan=store.getState().finance.loans[0];const before=store.loanAmountForMonth(loan,'2026-12');
 store.togglePaid('2026-11','loan:'+loan.id);assert.equal(store.loanAmountForMonth(loan,'2026-12'),before);
 store.togglePaid('2026-11','loan:'+loan.id);assert.equal(loan.paidInstallments,6);
 assert.equal(store.loanAmountForMonth(loan,store.addMonths(loan.startMonth,loan.installments)),0);
});
test('patrimônio separa saldo, aporte, resgate, rendimento e previsto',()=>{
 clean();const entry=(type,amount,date,status='confirmed')=>store.addFinanceEntry({type,amount,date,status,asset:'Reserva',category:'Renda fixa',description:type,recurring:false});
 entry('valuation',1000,'2026-11-01');entry('investment',200,'2026-11-02');entry('yield',10,'2026-11-03');entry('redemption',100,'2026-11-04');entry('investment',500,'2026-12-01','planned');
 assert.equal(store.investmentPortfolio('2026-11')[0].balance,1110);assert.equal(store.investmentPortfolio('2026-12')[0].balance,1110);
 assert.equal(store.financialSummary('2026-11').invested,200);assert.equal(store.financialSummary('2026-11').redeemed,100);
 entry('valuation',1200,'2026-12-03');assert.equal(store.investmentPortfolio('2026-12')[0].balance,1200);
 const e=store.financeEntries('2026-11').find(e=>e.type==='yield');store.updateFinanceOccurrence(e.id,'2026-11',{deleted:true});assert.equal(store.investmentPortfolio('2026-11')[0].balance,1100);
});
test('backup restaura novas funcionalidades e rejeita arquivo incompatível',()=>{
 clean();const backup=store.exportData();store.importData(backup);assert.equal(store.exportData(),backup);
 assert.throws(()=>store.importData('{}'));assert.throws(()=>store.addFinanceEntry({type:'income',amount:NaN,date:'2026-11-01'}));
});
test('investimentos nunca compõem gastos ou teto, mas transferem caixa para patrimônio',()=>{
 clean();
 store.addFinanceEntry({type:'income',amount:5000,date:'2026-11-01',status:'confirmed',recurring:false});
 store.addFinanceEntry({type:'expense',amount:100,date:'2026-11-02',status:'confirmed',recurring:false});
 const before=store.financialSummary('2026-11');
 const analysis=store.monthlyAnalysis('2026-11');
 const add=(type,amount,date,status='confirmed')=>store.addFinanceEntry({type,amount,date,status,asset:'Reserva',category:'Renda fixa',recurring:false});
 add('valuation',1000,'2026-11-01');
 add('investment',200,'2026-11-03');
 add('yield',10,'2026-11-04');
 add('redemption',50,'2026-11-05');
 add('investment',300,'2026-11-06','planned');
 const after=store.financialSummary('2026-11');
 assert.equal(after.expenses,before.expenses);
 assert.equal(store.monthCommitted('2026-11').variable,100);
 assert.equal(after.invested,500);
 assert.equal(after.balance,before.balance-500+50);
 assert.equal(after.assets,1160);
 for(const key of ['ceiling','headroom','spendingRatio','change','changePct']) {
  assert.equal(store.monthlyAnalysis('2026-11')[key],analysis[key],key);
 }
 const planned=store.financeEntries('2026-11').find(e=>e.type==='investment'&&e.status==='planned');
 store.updateFinanceOccurrence(planned.id,'2026-11',{status:'confirmed'});
 assert.equal(store.financialSummary('2026-11').assets,1460);
 assert.equal(store.financialSummary('2026-11').expenses,before.expenses);
 store.updateFinanceOccurrence(planned.id,'2026-11',{deleted:true});
 assert.equal(store.financialSummary('2026-11').balance,before.balance-200+50);
 assert.equal(store.financialSummary('2026-12').invested,0);
});
test('datas locais e virada de ano',()=>{
 assert.equal(store.todayISO(new Date(2026,10,3,23,50)),'2026-11-03');assert.equal(store.monthKey(new Date(2026,10,30,23,50)),'2026-11');
 assert.equal(store.addMonths('2026-12',1),'2027-01');
});

test('novembro zerado com investimento e dezembro acumula somente o novo aporte previsto',()=>{
 clean();const f=store.getState().finance;
 f.fixedBills=[];f.cards=[];f.loans=[];f.lisHistory={};
 const add=(type,amount,date,status='confirmed')=>store.addFinanceEntry({type,amount,date,status,asset:'Reserva',category:'Renda fixa',recurring:false});
 add('income',4000,'2026-11-01');add('expense',1920,'2026-11-02');add('investment',2080,'2026-11-03');
 add('investment',1000,'2026-12-01','planned');
 const november=store.monthlyAnalysis('2026-11'),december=store.financialSummary('2026-12');
 assert.equal(november.balance,0);assert.equal(november.expenses,1920);assert.equal(november.headroom,1280);
 assert.equal(november.invested,2080);assert.equal(november.projectedAssets,2080);
 assert.equal(december.invested,1000);assert.equal(december.expenses,0);
 assert.equal(december.assets,2080);assert.equal(december.projectedAssets,3080);
 assert.equal(store.financialSummary('2027-01').projectedAssets,3080);
 const planned=store.financeEntries('2026-12')[0];
 store.updateFinanceOccurrence(planned.id,'2026-12',{amount:1200});
 assert.equal(store.financialSummary('2026-12').projectedAssets,3280);
 assert.equal(store.financialSummary('2026-11').projectedAssets,2080);
 store.updateFinanceOccurrence(planned.id,'2026-12',{status:'confirmed'});
 assert.equal(store.financialSummary('2026-12').assets,3280);
 assert.equal(store.financialSummary('2026-12').projectedAssets,3280);
 store.updateFinanceOccurrence(planned.id,'2026-12',{deleted:true});
 assert.equal(store.financialSummary('2026-12').projectedAssets,2080);
});
test('corrigir despesa para aporte remove o gasto e inclui patrimônio sem descontar caixa duas vezes',()=>{
 clean();store.addFinanceEntry({type:'expense',amount:2080.67,date:'2026-11-03',status:'confirmed',recurring:false});
 const entry=store.financeEntries('2026-11')[0],before=store.financialSummary('2026-11');
 store.updateFinanceOccurrence(entry.id,'2026-11',{type:'investment',asset:'Reserva'});
 const after=store.financialSummary('2026-11');
 assert.equal(after.expenses,Math.round((before.expenses-2080.67)*100)/100);
 assert.equal(after.balance,before.balance);assert.equal(after.assets,2080.67);
 store.updateFinanceOccurrence(entry.id,'2026-11',{type:'valuation'});
 assert.equal(store.financialSummary('2026-11').assets,2080.67);
 assert.equal(store.financialSummary('2026-11').invested,0);
});
test('projeção respeita saldo substitutivo, resgates, rendimentos e alterações de aplicação',()=>{
 clean();const add=(type,amount,date,status)=>store.addFinanceEntry({type,amount,date,status,asset:'Reserva',recurring:false});
 add('valuation',2080,'2026-11-01','confirmed');
 add('investment',1000,'2026-12-01','planned');
 add('redemption',80,'2026-12-02','planned');
 add('yield',10,'2026-12-03','planned');
 assert.equal(store.financialSummary('2026-12').projectedAssets,3010);
 add('valuation',3500,'2026-12-04','planned');
 assert.equal(store.financialSummary('2026-12').projectedAssets,3500);
 assert.equal(store.financialSummary('2026-12').assets,2080);
 const investment=store.financeEntries('2026-12').find(e=>e.type==='investment');
 store.updateFinanceOccurrence(investment.id,'2026-12',{asset:'Outra aplicação'});
 assert.equal(store.projectedInvestmentPortfolio('2026-12').find(a=>a.name==='Outra aplicação').balance,1000);
});
test('concilia o mês inicial com salário líquido, conta zerada e investimento preservado',()=>{
 clean();const f=store.getState().finance;
 f.fixedBills=[{id:'contas',name:'Contas',amount:1801.43,startMonth:'2026-11',versions:[]}];
 f.cards=[];f.loans=[{id:'consignado',name:'Crédito do trabalhador',startMonth:'2026-11',installments:45,paidInstallments:0,monthlyAmount:1349.56}];f.lisHistory={};
 store.addFinanceEntry({type:'income',amount:4000,date:'2026-11-01',status:'confirmed',recurring:true});
 store.addFinanceEntry({type:'valuation',amount:2080.67,date:'2026-11-09',asset:'Reserva',status:'confirmed',recurring:false});
 assert.equal(store.financialSummary('2026-11').balance,849.01);
 const config={accountBalance:0,includeValuationsAsContributions:true,payrollLoanIds:['consignado']};
 store.reconcileInitialMonth(config);
 let summary=store.financialSummary('2026-11');
 assert.equal(summary.balance,0);assert.equal(summary.expenses,1801.43);
 assert.equal(summary.invested,2080.67);assert.equal(summary.assets,2080.67);
 assert.equal(summary.projectedAssets,2080.67);assert.equal(summary.reconciliationAdjustment,-117.9);
 assert.equal(store.monthlyAnalysis('2026-11').headroom,1398.57);
 assert.equal(store.monthCommitted('2026-11').payrollLoans,1349.56);
 assert.equal(store.loanAmountForMonth(f.loans[0],'2026-11'),1349.56);
 assert.equal(f.loans[0].paidInstallments,0);
 store.reconcileInitialMonth(config);
 assert.equal(store.financialSummary('2026-11').balance,0);
 assert.equal(store.financialSummary('2026-11').assets,2080.67);
 store.addFinanceEntry({type:'investment',amount:1000,date:'2026-12-01',asset:'Reserva',status:'planned',recurring:false});
 const next=store.financialSummary('2026-12');
 assert.equal(next.invested,1000);assert.equal(next.projectedAssets,3080.67);
 assert.equal(next.reconciliationAdjustment,0);assert.equal(next.balance,1198.57);
 store.addFinanceEntry({type:'expense',amount:10,date:'2026-11-09',status:'confirmed',recurring:false});
 assert.equal(store.financialSummary('2026-11').balance,-10);
 const backup=store.exportData();store.importData(backup);assert.equal(store.exportData(),backup);
 store.clearCashReconciliation('2026-11');assert.equal(store.financialSummary('2026-11').balance,107.9);
});
test('desconto em folha preserva meses anteriores e pode encerrar sem alterar contrato',()=>{
 clean();const loan=store.getState().finance.loans[0],before=store.monthCommitted('2026-11').loans;
 store.updateLoan(loan.id,{includedInNetSalary:true});
 assert.equal(store.loanDeductedFromNetSalary(loan,'2026-10'),false);
 assert.equal(store.loanDeductedFromNetSalary(loan,'2026-11'),true);
 assert.equal(store.monthCommitted('2026-11').loans,before-loan.monthlyAmount);
 store.selectFinanceMonth('2026-12');store.updateLoan(loan.id,{includedInNetSalary:false});
 assert.equal(store.loanDeductedFromNetSalary(loan,'2026-11'),true);
 assert.equal(store.loanDeductedFromNetSalary(loan,'2026-12'),false);
});
test('conciliação impede duplicar aporte e saldo ou atribuir patrimônio antigo ao mês atual',()=>{
 clean();store.addFinanceEntry({type:'valuation',amount:2000,date:'2026-10-01',asset:'Reserva',status:'confirmed',recurring:false});
 store.addFinanceEntry({type:'valuation',amount:2080,date:'2026-11-01',asset:'Reserva',status:'confirmed',recurring:false});
 const before=store.exportData();
 assert.throws(()=>store.reconcileInitialMonth({accountBalance:0,includeValuationsAsContributions:true}));
 assert.equal(store.exportData(),before);
 assert.throws(()=>store.reconcileInitialMonth({accountBalance:NaN}));
 assert.throws(()=>store.reconcileInitialMonth({accountBalance:0,payrollLoanIds:['inexistente']}));
 clean();store.addFinanceEntry({type:'investment',amount:100,date:'2026-11-01',asset:'Reserva',status:'confirmed',recurring:false});
 store.addFinanceEntry({type:'valuation',amount:100,date:'2026-11-02',asset:'Reserva',status:'confirmed',recurring:false});
 assert.throws(()=>store.reconcileInitialMonth({accountBalance:0,includeValuationsAsContributions:true}));
});
test('planejamento destaca margem de gastos mesmo quando todo o restante está investido',()=>{
 clean();const f=store.getState().finance;f.fixedBills=[];f.cards=[];f.loans=[];f.lisHistory={};
 store.addCard({name:'Cartão',limit:10000,dueDay:10});const card=f.cards[0];
 store.addFinanceEntry({type:'income',amount:8000,date:'2026-12-01',status:'planned',recurring:false});
 store.addFinanceEntry({type:'expense',amount:5970.44,date:'2026-12-02',status:'planned',recurring:false});
 store.addFinanceEntry({type:'valuation',amount:2080.67,date:'2026-11-09',asset:'Reserva',status:'confirmed',recurring:false});
 store.addFinanceEntry({type:'investment',amount:2029.56,date:'2026-12-03',asset:'Reserva',status:'planned',recurring:false});
 const before=store.monthlySpendingPlan('2026-12');
 assert.equal(before.balance,0);assert.equal(before.headroom,429.56);
 assert.equal(before.investmentPotential,2029.56);assert.equal(before.investmentShortfall,0);
 assert.equal(before.projectedAssets,4110.23);
 store.setCardInvoice(card.id,'2026-12',300);
 const after=store.monthlySpendingPlan('2026-12');
 assert.equal(after.headroom,129.56);assert.equal(after.cardExpenses,300);
 assert.equal(after.expenses,6270.44);assert.equal(after.investmentPotential,1729.56);
 assert.equal(after.investmentShortfall,300);
 assert.equal(after.projectedAssets,4110.23);assert.equal(after.assets,2080.67);
 const entry=store.financeEntries('2026-12').find(e=>e.type==='investment');
 store.updateFinanceOccurrence(entry.id,'2026-12',{amount:1729.56});
 assert.equal(store.monthlySpendingPlan('2026-12').investmentShortfall,0);
 assert.equal(store.monthlySpendingPlan('2026-12').headroom,129.56);
 assert.equal(store.monthlySpendingPlan('2026-11').cardExpenses,0);
});
test('potencial de investimento é estimativa e não cria aportes ou duplica faturas',()=>{
 clean();const f=store.getState().finance;f.fixedBills=[];f.cards=[];f.loans=[];f.lisHistory={};
 store.addFinanceEntry({type:'income',amount:4000,date:'2027-01-01',status:'planned',recurring:false});
 store.addFinanceEntry({type:'expense',amount:1801.43,date:'2027-01-02',status:'planned',recurring:false});
 store.addCard({name:'Cartão',limit:4000,dueDay:10});const card=f.cards[0];
 store.addCardCharge({cardId:card.id,desc:'Compra',totalAmount:1000,installments:2,startMonth:'2027-01'});
 store.setCardInvoice(card.id,'2027-01',600);
 const before=store.exportData(),plan=store.monthlySpendingPlan('2027-01');
 assert.equal(plan.cardExpenses,600);assert.equal(plan.expenses,2401.43);
 assert.equal(plan.headroom,798.57);assert.equal(plan.investmentPotential,1598.57);
 assert.equal(plan.invested,0);assert.equal(plan.projectedAssets,0);assert.equal(store.exportData(),before);
 store.setCardInvoice(card.id,'2027-01',4500);
 assert.equal(store.monthlySpendingPlan('2027-01').investmentPotential,0);
 assert.equal(store.monthlySpendingPlan('2027-01').headroom,-3101.43);
});
test('45 parcelas de fevereiro de 2027 até outubro de 2030 são provisionadas sem antecipar cobranças',()=>{
 clean();const f=store.getState().finance;f.fixedBills=[];f.cards=[];f.loans=[];f.lisHistory={};
 store.addLoan({name:'Crédito do trabalhador',bank:'Agibank',totalAmount:60730.2,installments:45,monthlyAmount:1349.56});
 const loan=f.loans[0];store.updateLoan(loan.id,{includedInNetSalary:true});
 store.configureLoanSchedule(loan.id,{startMonth:'2027-02',installments:45,monthlyAmount:1349.56,provisionMonthly:true});
 for(const month of ['2026-11','2026-12','2027-01','2030-11']) assert.equal(store.monthCommitted(month).total,0,month);
 const schedule=store.loanSchedule(loan);
 assert.equal(schedule.length,45);assert.equal(schedule[0].month,'2027-02');assert.equal(schedule.at(-1).month,'2030-10');
 assert.equal(schedule.reduce((c,p)=>c+Math.round(p.amount*100),0),6073020);
 for(const p of schedule){
  assert.equal(p.status,'planned');assert.equal(p.inNetSalary,false);
  assert.equal(store.monthCommitted(p.month).loans,1349.56,p.month);
 }
 assert.equal(store.loanDeductedFromNetSalary(loan,'2026-11'),true);
 assert.equal(loan.paidInstallments,0);
 assert.throws(()=>store.togglePaid('2027-02','loan:'+loan.id));
 assert.throws(()=>store.togglePaid('2027-01','loan:'+loan.id));
 assert.equal(loan.paidInstallments,0);
});
test('confirmação de uma parcela só altera seu mês e não desloca as 45 cobranças',t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2027-02-15T12:00:00Z').getTime()});
 clean();store.addLoan({name:'Contrato',totalAmount:60730.2,installments:45,monthlyAmount:1349.56,startMonth:'2027-02'});
 const loan=store.getState().finance.loans.at(-1),key='loan:'+loan.id;
 const march=store.monthCommitted('2027-03').total;
 store.togglePaid('2027-02',key);
 assert.equal(store.loanSchedule(loan)[0].status,'confirmed');assert.equal(store.loanSchedule(loan)[1].status,'planned');
 assert.equal(loan.paidInstallments,1);assert.equal(store.monthCommitted('2027-03').total,march);
 assert.equal(store.loanSchedule(loan).at(-1).month,'2030-10');
 assert.throws(()=>store.configureLoanSchedule(loan.id,{startMonth:'2027-03',installments:45,monthlyAmount:1349.56,provisionMonthly:true}));
 store.togglePaid('2027-02',key);assert.equal(loan.paidInstallments,0);
 assert.equal(store.loanSchedule(loan)[0].status,'planned');
});
test('cronograma rejeita dados inválidos sem alterar o contrato',()=>{
 clean();const loan=store.getState().finance.loans[0],before=store.exportData();
 const config={startMonth:'2027-02',installments:45,monthlyAmount:1349.56,provisionMonthly:true};
 for(const invalid of [{startMonth:'2027-13'},{installments:0},{installments:1.5},{monthlyAmount:NaN},{monthlyAmount:0.001}]) {
  assert.throws(()=>store.configureLoanSchedule(loan.id,{...config,...invalid}));assert.equal(store.exportData(),before);
 }
});
test('barra do consignado segue as 45 parcelas de fevereiro até 100% em outubro de 2030 sem confirmar comprovantes',()=>{
 clean();store.addLoan({name:'Crédito do trabalhador',totalAmount:37877,installments:45,monthlyAmount:1349.56,startMonth:'2027-02'});
 const loan=store.getState().finance.loans.at(-1);
 for(const month of ['2026-11','2026-12','2027-01']) {
  assert.equal(store.loanProgress(loan,month).ratio,0);assert.equal(store.loanAmountForMonth(loan,month),0);
 }
 assert.equal(store.loanProgress(loan,'2027-02').completed,1);
 assert.equal(store.loanProgress(loan,'2027-03').completed,2);
 assert.equal(store.loanProgress(loan,'2027-02').ratio,1/45);
 assert.equal(store.loanProgress(loan,'2030-10').ratio,1);
 assert.equal(store.loanProgress(loan,'2030-11').ratio,1);
 assert.equal(store.loanProgress(loan,'2030-10').confirmed,0);
 assert.equal(loan.paidInstallments,0);
 assert.equal(store.loanSchedule(loan).every(p=>p.status==='planned'),true);
});
test('confirmar consignado não muda progresso previsto nem desconta a parcela duas vezes',t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2027-02-15T12:00:00Z').getTime()});
 clean();store.addLoan({name:'Consignado',totalAmount:37877,installments:45,monthlyAmount:1349.56,startMonth:'2027-02'});
 const loan=store.getState().finance.loans.at(-1),key='loan:'+loan.id;
 const progress=store.loanProgress(loan,'2027-02'),expenses=store.financialSummary('2027-02').expenses;
 store.togglePaid('2027-02',key);
 assert.equal(store.loanProgress(loan,'2027-02').ratio,progress.ratio);
 assert.equal(store.loanProgress(loan,'2027-02').confirmed,1);
 assert.equal(store.financialSummary('2027-02').expenses,expenses);
 store.togglePaid('2027-02',key);
 assert.equal(store.loanProgress(loan,'2027-02').confirmed,0);
 assert.equal(store.loanProgress(loan,'2027-02').ratio,progress.ratio);
 store.configureLoanSchedule(loan.id,{startMonth:'2027-02',installments:45,monthlyAmount:1349.56,provisionMonthly:true,automaticProgress:false});
 assert.equal(store.loanProgress(loan,'2027-02').automatic,false);
 assert.equal(store.loanProgress(loan,'2027-02').ratio,0);
});

test('teto de gastos é 80% das receitas do próprio mês, incluindo 13º',()=>{
 clean();store.addFinanceEntry({type:'income',amount:5000,date:'2026-11-05',status:'planned',description:'Salário',recurring:true});
 store.addFinanceEntry({type:'income',amount:2000,date:'2026-12-20',status:'planned',description:'13º',recurring:false});
 assert.equal(store.monthlyAnalysis('2026-11').ceiling,4000);assert.equal(store.monthlyAnalysis('2026-12').ceiling,5600);
 assert.equal(store.monthlyAnalysis('2027-01').ceiling,4000);
});
test('fatura mensal substitui parcelas, respeita zero e não altera meses vizinhos',()=>{
 clean();const before=store.cardInvoiceForMonth('nubank','2026-12');const original=store.monthCommitted('2026-11').total;
 const forecast=store.cardInvoiceForMonth('nubank','2026-11');store.setCardInvoice('nubank','2026-11',1800.75);
 assert.equal(store.cardInvoiceForMonth('nubank','2026-11'),1800.75);
 assert.equal(store.monthCommitted('2026-11').total,Math.round((original-forecast+1800.75)*100)/100);
 assert.equal(store.cardInvoiceForMonth('nubank','2026-12'),before);
 store.setCardInvoice('nubank','2026-11',0);assert.equal(store.cardInvoiceForMonth('nubank','2026-11'),0);
 store.clearCardInvoice('nubank','2026-11');assert.equal(store.cardInvoiceForMonth('nubank','2026-11'),forecast);
 assert.throws(()=>store.setCardInvoice('nubank','2026-11',-10));
});
test('tendência usa despesas do mês anterior e inclui fatura informada',()=>{
 clean();store.setCardInvoice('nubank','2026-10',100);store.setCardInvoice('nubank','2026-11',400);
 const analysis=store.monthlyAnalysis('2026-11');
 assert.equal(analysis.change,Math.round((store.financialSummary('2026-11').expenses-store.financialSummary('2026-10').expenses)*100)/100);
 assert.equal(store.monthlyAnalysis('2026-10').spendingRatio,null);
});
