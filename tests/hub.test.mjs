import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {normalizeHub,trainingSummary,validDate} from '../js/hub-model.js';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};globalThis.window={dispatchEvent(){}};
let source=await fs.readFile(new URL('../js/store.js',import.meta.url),'utf8');
source=source.replace("import { sb } from './supabase-client.js';",'const sb={};');
for(const filename of ['finance-model.js','hub-model.js'])source=source.replace(JSON.stringify('./'+filename),JSON.stringify(pathToFileURL(resolve('js',filename)).href)).replace("'./"+filename+"'",JSON.stringify(pathToFileURL(resolve('js',filename)).href));
const store=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const clean=()=>store.resetApp();

test('migração de biblioteca é aditiva, idempotente e preserva fila, progresso e minutos antigos',()=>{
 clean();const s=store.getState();delete s.books;
 const previous={...s.currentBook},queue=structuredClone(s.bookQueue);s.readingLog['2026-11-01']=35;
 normalizeHub(s);assert.equal(s.books[0].pageCurrent,previous.pageCurrent);assert.equal(s.books[0].title,previous.title);
 assert.equal(s.books.filter(b=>b.status==='queued').length,queue.length);assert.deepEqual(s.bookQueue,queue);
 const before=JSON.stringify(s);normalizeHub(s);assert.equal(JSON.stringify(s),before);assert.equal(s.readingLog['2026-11-01'],35);
 assert.deepEqual(s.businesses.map(b=>b.name),['LumeqIA','Alfa tauri innovation group','Reis e Reis construtora']);
 assert.equal(s.businessEntries.length,0);
});
test('duas leituras independentes somam minutos e mantêm páginas separadas',()=>{
 clean();const today=store.todayISO(),s=store.getState();
 store.saveBook({title:'Livro A',author:'Autor',pageTotal:200,pageCurrent:0,status:'reading'});
 store.saveBook({title:'Livro B',pageTotal:300,pageCurrent:10,status:'reading'});
 const [a,b]=s.books.slice(-2);
 store.registerReading({bookId:a.id,date:today,minutes:20,page:30,notes:'Aprendizado A'});
 store.registerReading({bookId:b.id,date:today,minutes:15,page:25,notes:'Aprendizado B'});
 assert.equal(a.pageCurrent,30);assert.equal(b.pageCurrent,25);assert.equal(s.readingLog[today],35);
 assert.equal(s.books.filter(b=>b.status==='reading').length,3);
 assert.equal(s.readingSessions[0].notes,'Aprendizado A');
 store.registerReading({bookId:a.id,date:today,minutes:10,page:200});assert.equal(a.status,'finished');assert.equal(b.status,'reading');
 store.removeReadingSession(s.readingSessions[0].id);assert.equal(s.readingLog[today],25);assert.equal(s.books.find(book=>book.id===b.id).pageCurrent,25);
 store.removeBook(a.id);assert.equal(s.readingLog[today],25);assert.equal(s.readingSessions.length,2);
});
test('leituras e livros inválidos não alteram o estado',()=>{
 clean();const book=store.getState().books[0],before=store.exportData();
 for(const invalid of [{minutes:0},{page:book.pageTotal+1},{date:'2026-02-30'},{bookId:'missing'}])assert.throws(()=>store.registerReading({bookId:book.id,date:store.todayISO(),minutes:20,page:20,...invalid}));
 assert.throws(()=>store.saveBook({title:'',pageCurrent:0,pageTotal:100,status:'reading'}));
 assert.throws(()=>store.saveBook({title:'X',pageCurrent:200,pageTotal:100,status:'reading'}));
 assert.equal(store.exportData(),before);assert.equal(validDate('2026-02-30'),false);
});
test('treinos aceitam várias modalidades no mesmo dia e separam planejados dos realizados',()=>{
 clean();const today=store.todayISO();
 const base={date:today,duration:60,intensity:'moderada',status:'done'};
 store.saveTrainingSession({...base,type:'jiujitsu',notes:'Passagem de guarda'});
 store.saveTrainingSession({...base,type:'pedal',duration:40,distance:12.5});
 store.saveTrainingSession({...base,type:'casa',status:'planned'});
 const summary=store.trainingSummary();assert.equal(summary.done,2);assert.equal(summary.planned,1);
 assert.equal(summary.minutes,100);assert.equal(summary.distance,12.5);assert.equal(summary.byType.jiujitsu,1);
 const session=store.getState().trainingSessions[1];store.saveTrainingSession({...session,distance:15},session.id);
 assert.equal(store.trainingSummary().distance,15);store.removeTrainingSession(session.id);assert.equal(store.trainingSummary().done,1);
});
test('semana começa na segunda-feira e preserva treinos legados sem inventar durações',()=>{
 clean();const s=store.getState();s.workoutLog={'2026-11-08':{completed:true},'2026-11-09':{completed:true}};
 const summary=trainingSummary(s,'2026-11-10');assert.equal(summary.start,'2026-11-09');assert.equal(summary.end,'2026-11-15');
 assert.equal(summary.done,1);assert.equal(summary.minutes,0);assert.equal(summary.legacy,1);
 const before=store.exportData();assert.throws(()=>store.saveTrainingSession({type:'pedal',status:'done',date:'2099-01-01',duration:30,intensity:'leve'}));assert.equal(store.exportData(),before);
});
test('indicadores empresariais distinguem faturamento, caixa e pendências e isolam empresas do financeiro pessoal',()=>{
 clean();const date=store.todayISO(),ym=date.slice(0,7),s=store.getState(),personal=structuredClone(s.finance);
 const entry=(businessId,type,amount,status)=>store.saveBusinessEntry({businessId,type,amount,status,date,description:'Registro'});
 entry('lumeqia','revenue',1000,'paid');entry('lumeqia','revenue',500,'pending');
 entry('lumeqia','expense',200,'paid');entry('lumeqia','expense',100,'pending');
 entry('reis-reis','revenue',700,'paid');
 const own=store.businessSummary(ym,'lumeqia');assert.equal(own.revenue,1500);assert.equal(own.expenses,300);assert.equal(own.result,1200);
 assert.equal(own.receivable,500);assert.equal(own.payable,100);assert.equal(own.cash,800);assert.equal(own.margin,80);
 assert.equal(store.businessSummary(ym).revenue,2200);assert.equal(store.businessSummary(store.addMonths(ym,1)).revenue,0);
 assert.deepEqual(s.finance,personal);
 const pending=s.businessEntries.find(e=>e.type==='revenue'&&e.status==='pending');store.saveBusinessEntry({...pending,status:'paid'},pending.id);
 assert.equal(store.businessSummary(ym,'lumeqia').revenue,1500);assert.equal(store.businessSummary(ym,'lumeqia').receivable,0);
 assert.equal(store.businessSummary(ym,'lumeqia').cash,1300);
});
test('clientes, metas por mês e vínculo entre empresas são validados',()=>{
 clean();const s=store.getState(),date=store.todayISO(),ym=date.slice(0,7);
 store.saveBusinessClient({businessId:'lumeqia',name:'Cliente A',status:'active',since:date});const client=s.businessClients[0];
 store.saveBusinessClient({businessId:'lumeqia',name:'Contato B',status:'lead',since:date});
 assert.equal(store.businessSummary(ym,'lumeqia').clients,1);assert.equal(store.businessSummary(ym,'lumeqia').leads,1);
 store.setBusinessGoal('lumeqia',ym,5000);store.setBusinessGoal('reis-reis',ym,10000);
 assert.equal(store.businessSummary(ym).goal,15000);assert.equal(store.businessSummary(store.addMonths(ym,1)).goal,0);
 assert.throws(()=>store.saveBusinessEntry({businessId:'reis-reis',clientId:client.id,type:'revenue',amount:100,status:'paid',date,description:'Teste'}));
 store.saveBusinessEntry({businessId:'lumeqia',clientId:client.id,type:'revenue',amount:100,status:'paid',date,description:'Teste'});
 assert.throws(()=>store.saveBusinessClient({...client,businessId:'reis-reis'},client.id));
 store.removeBusinessClient(client.id);assert.equal(s.businessEntries[0].amount,100);assert.equal(s.businessEntries[0].clientId,'');
 const backup=store.exportData();store.importData(backup);assert.equal(store.exportData(),backup);
});
