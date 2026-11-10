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
test('duas leituras cronometradas somam minutos e mantêm páginas separadas',t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T12:00:00Z').getTime()});
 clean();const today=store.todayISO(),s=store.getState();
 store.saveBook({title:'Livro A',author:'Autor',pageTotal:200,pageCurrent:0,status:'reading'});
 store.saveBook({title:'Livro B',pageTotal:300,pageCurrent:10,status:'reading'});
 const [a,b]=s.books.slice(-2);
 store.startReadingTimer(a.id);t.mock.timers.tick(20*60000);store.stopReadingTimer();store.completeReadingTimer(30);
 store.startReadingTimer(b.id);t.mock.timers.tick(15*60000);store.stopReadingTimer();store.completeReadingTimer(15);
 assert.equal(a.pageCurrent,30);assert.equal(b.pageCurrent,25);assert.equal(s.readingLog[today],35);
 assert.equal(s.books.filter(b=>b.status==='reading').length,3);assert.equal(s.readingSessions[0].bookTitle,'Livro A');
 store.startReadingTimer(a.id);t.mock.timers.tick(10*60000);store.stopReadingTimer();store.completeReadingTimer(170);
 assert.equal(a.status,'finished');assert.equal(b.status,'reading');
 assert.throws(()=>store.removeReadingSession(s.readingSessions[0].id));assert.equal(s.readingLog[today],45);
 store.removeBook(a.id);assert.equal(s.readingLog[today],45);assert.equal(s.readingSessions.length,3);
});
test('registros manuais e livros inválidos não alteram o estado',()=>{
 clean();const book=store.getState().books[0],before=store.exportData();
 assert.throws(()=>store.registerReading({bookId:book.id,date:store.todayISO(),minutes:20,page:20}));
 assert.throws(()=>store.logReading(store.todayISO(),20));assert.throws(()=>store.startReadingTimer('inexistente'));
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

test('inglês é preservado como curso e mantém progresso sincronizado nas duas telas',()=>{
 clean();const s=store.getState(),track=structuredClone(s.studyTrack);delete s.studyCourses;
 normalizeHub(s);const english=s.studyCourses[0];assert.equal(english.title,track.title);assert.equal(english.module,track.module);assert.equal(english.totalModules,track.totalModules);
 store.saveStudyCourse({title:'Curso de negócios no ChatGPT',provider:'ChatGPT',status:'active',module:0,totalModules:0,nextTopic:'Precificação'});
 const business=s.studyCourses.at(-1),before=JSON.stringify(s.studyCourses);normalizeHub(s);assert.equal(JSON.stringify(s.studyCourses),before);
 store.updateStudyTrack({module:7});assert.equal(english.module,7);assert.equal(business.module,0);
 store.saveStudyCourse({...english,module:8,status:'completed'},english.id);assert.equal(s.studyTrack.module,8);assert.equal(s.studyTrack.title,track.title);assert.equal(business.status,'active');
});
test('aprendizados de PDFs ficam por curso e período, sem alterar a meta de livros ou o financeiro',()=>{
 clean();const s=store.getState(),today=store.todayISO(),ym=today.slice(0,7);
 store.saveStudyCourse({title:'Curso de IA',provider:'ChatGPT',status:'active',module:0,totalModules:0});const course=s.studyCourses.at(-1);
 store.startReadingTimer(s.books[0].id);const reading={log:structuredClone(s.readingLog),sessions:structuredClone(s.readingSessions),timer:structuredClone(s.activeReadingTimer),plan:structuredClone(s.readingPlan),books:structuredClone(s.books)},finance=structuredClone(s.finance);
 store.saveLearningEntry({courseId:course.id,date:today,topic:'Aula de agentes',summary:'Aprendi a dividir tarefas e validar resultados.',status:'review',minutes:45,materialTitle:'Aula 01.pdf',materialUrl:'https://chatgpt.com/c/exemplo',application:'Aplicar em um fluxo da empresa',questions:'Como medir qualidade?',nextStep:'Criar uma primeira versão'});
 const entry=s.learningEntries[0],summary=store.courseSummary(course.id,ym);
 assert.equal(summary.entries,1);assert.equal(summary.minutes,45);assert.equal(summary.review,1);assert.equal(summary.days,1);assert.equal(entry.materialTitle,'Aula 01.pdf');assert.equal(entry.application,'Aplicar em um fluxo da empresa');
 assert.deepEqual({log:s.readingLog,sessions:s.readingSessions,timer:s.activeReadingTimer,plan:s.readingPlan,books:s.books},reading);assert.deepEqual(s.finance,finance);
 assert.equal(store.courseSummary(s.studyCourses[0].id).entries,0);
 store.saveLearningEntry({...entry,status:'learned',summary:'Aprendizado revisado.'},entry.id);assert.equal(store.courseSummary(course.id).review,0);assert.equal(store.courseSummary(course.id).entries,1);assert.equal(course.module,0);
 assert.equal(store.courseSummary(course.id,store.addMonths(ym,1)).entries,0);
 const backup=store.exportData();store.importData(backup);assert.equal(store.exportData(),backup);
 store.removeLearningEntry(entry.id);assert.equal(store.courseSummary(course.id).entries,0);assert.equal(store.getState().studyCourses.length,2);
});
test('cursos e aprendizados rejeitam valores inválidos e links inseguros antes de alterar dados',()=>{
 clean();const s=store.getState(),course=s.studyCourses[0],before=store.exportData();
 assert.throws(()=>store.saveStudyCourse({title:'',module:0,totalModules:0}));
 assert.throws(()=>store.saveStudyCourse({title:'Curso',module:4,totalModules:3,status:'active'}));
 assert.throws(()=>store.saveStudyCourse({title:'Curso',module:0,totalModules:0,status:'__proto__'}));
 const input={courseId:course.id,date:store.todayISO(),topic:'Tema',summary:'Aprendizado',status:'learned',minutes:10};
 for(const invalid of [{courseId:'missing'},{date:'2099-01-01'},{date:'2026-02-30'},{topic:' '},{summary:''},{minutes:-1},{minutes:1.5},{status:'__proto__'},{materialUrl:'javascript:alert(1)'},{materialUrl:'data:application/pdf;base64,AAAA'},{materialUrl:'https://usuario:senha@example.test/pdf'}])assert.throws(()=>store.saveLearningEntry({...input,...invalid}));
 assert.equal(store.exportData(),before);
});

test('observações da meta preservam conclusão, progresso, outras metas e restauração por backup',()=>{
 clean();const year=String(new Date().getFullYear()),s=store.getState(),area=store.getGoalsForYear(year)[0],item=area.keyResults[0];
 const original=structuredClone(area),personal=structuredClone(s.finance);
 store.updateKeyResultNotes(year,area.id,item.id,'  Meu motivo\n\nPlano de ação: treinar duas vezes por semana.  ');
 assert.equal(item.notes,'Meu motivo\n\nPlano de ação: treinar duas vezes por semana.');
 assert.equal(item.title,original.keyResults[0].title);assert.equal(item.done,original.keyResults[0].done);assert.deepEqual(area.keyResults.slice(1),original.keyResults.slice(1));
 assert.equal(store.goalProgress(area),0);assert.deepEqual(s.finance,personal);
 store.toggleKeyResult(year,area.id,item.id);const progress=store.goalProgress(area);
 store.updateKeyResultNotes(year,area.id,item.id,'Nova observação');assert.equal(item.done,true);assert.equal(store.goalProgress(area),progress);
 const backup=store.exportData();store.importData(backup);assert.equal(store.exportData(),backup);
 const restored=store.getGoalsForYear(year)[0].keyResults[0];assert.equal(restored.notes,'Nova observação');assert.equal(restored.done,true);
 store.updateKeyResultNotes(year,area.id,item.id,'');assert.equal(restored.notes,'');assert.equal(restored.done,true);
});
test('novas metas recebem detalhamento opcional e observações ficam isoladas por ano',()=>{
 clean();const year=String(new Date().getFullYear()),next=String(Number(year)+1),area=store.getGoalsForYear(year)[0];
 store.addKeyResult(year,area.id,'Minha meta','Meu plano detalhado');const current=area.keyResults.at(-1);assert.equal(current.notes,'Meu plano detalhado');assert.equal(current.done,false);
 const otherArea=store.getGoalsForYear(next)[0];store.addKeyResult(next,otherArea.id,'Meta do próximo ano');const other=otherArea.keyResults.at(-1);other.id=current.id;
 store.updateKeyResultNotes(next,otherArea.id,other.id,'Detalhe do próximo ano');assert.equal(other.notes,'Detalhe do próximo ano');assert.equal(current.notes,'Meu plano detalhado');
 const before=store.exportData();assert.throws(()=>store.updateKeyResultNotes(year,area.id,'missing','Texto'));assert.throws(()=>store.updateKeyResultNotes('1900',area.id,current.id,'Texto'));assert.throws(()=>store.updateKeyResultNotes(year,area.id,current.id,'x'.repeat(6001)));assert.equal(store.exportData(),before);
});
