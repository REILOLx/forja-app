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
source=source.replace("import { sb } from './supabase-client.js';",'const sb = {};').replace("'./finance-model.js'",JSON.stringify(pathToFileURL(resolve('js/finance-model.js')).href));
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
test('datas locais e virada de ano',()=>{
 assert.equal(store.todayISO(new Date(2026,10,3,23,50)),'2026-11-03');assert.equal(store.monthKey(new Date(2026,10,30,23,50)),'2026-11');
 assert.equal(store.addMonths('2026-12',1),'2027-01');
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
