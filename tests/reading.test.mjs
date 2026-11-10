import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {normalizeReading,readingMonth,readingDay,timerElapsed} from '../js/reading-model.js';
const cloudStub={};globalThis.__readingCloudStub=cloudStub;
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};globalThis.window={dispatchEvent(){}};
let source=await fs.readFile(new URL('../js/store.js',import.meta.url),'utf8');source=source.replace("import { sb } from './supabase-client.js';",'const sb=globalThis.__readingCloudStub;');
for(const file of ['finance-model.js','hub-model.js'])source=source.replace("'./"+file+"'",JSON.stringify(pathToFileURL(resolve('js',file)).href));
const store=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const setup=t=>{t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T12:00:00Z').getTime()});store.resetApp();return store.getState();};

test('cronômetro retoma pelo instante salvo, congela ao finalizar e soma apenas segundos completos',t=>{
 const s=setup(t),book=s.books[0],startPage=book.pageCurrent;
 store.startReadingTimer(book.id);const id=s.activeReadingTimer.id;
 assert.throws(()=>store.startReadingTimer(book.id));assert.throws(()=>store.stopReadingTimer());
 t.mock.timers.tick(20*60000+999);
 const backup=store.exportData();store.importData(backup);assert.equal(store.getState().activeReadingTimer.id,id);
 store.stopReadingTimer();const stopped=store.getState().activeReadingTimer;
 assert.equal(timerElapsed(stopped),20*60000+999);
 t.mock.timers.tick(5*60000);assert.equal(timerElapsed(stopped),20*60000+999);
 store.completeReadingTimer(12);
 assert.equal(store.getState().readingLog['2026-11-10'],20);
 assert.equal(store.getState().books[0].pageCurrent,startPage+12);
 assert.equal(store.readingDay().reached,true);
 assert.throws(()=>store.completeReadingTimer(12));assert.equal(store.getState().readingSessions.length,1);
});
test('menos de vinte minutos não atinge a meta e outras sessões no mesmo dia completam o tempo',t=>{
 const s=setup(t),book=s.books[0];
 store.startReadingTimer(book.id);t.mock.timers.tick(20*60000-1);store.stopReadingTimer();store.completeReadingTimer(1);
 assert.equal(store.readingDay().reached,false);assert.equal(store.readingDay().seconds,1199);
 store.startReadingTimer(book.id);t.mock.timers.tick(1000);store.stopReadingTimer();store.completeReadingTimer(1);
 assert.equal(store.readingDay().seconds,1200);assert.equal(store.readingDay().reached,true);assert.equal(s.readingSessions.length,2);
});
test('virada do dia expira sessões incompletas e não permite preencher ontem',t=>{
 setup(t);t.mock.timers.setTime(new Date('2026-11-10T23:50:00Z').getTime());const s=store.getState(),book=s.books[0],start=book.pageCurrent;
 store.startReadingTimer(book.id);t.mock.timers.tick(5*60000);store.stopReadingTimer();
 t.mock.timers.tick(6*60000);
 assert.throws(()=>store.completeReadingTimer(5));assert.equal(s.activeReadingTimer,null);
 assert.equal(s.readingSessions[0].status,'expired');assert.equal(store.readingDay('2026-11-10').seconds,0);
 assert.equal(store.readingDay('2026-11-10').closed,true);assert.equal(book.pageCurrent,start);
 assert.equal(store.expireReadingTimer(),false);assert.equal(s.readingSessions.length,1);
 assert.throws(()=>store.registerReading({bookId:book.id,date:'2026-11-10',minutes:20,page:120}));
 store.startReadingTimer(book.id);assert.equal(s.activeReadingTimer.date,'2026-11-11');
});
test('páginas e livros em sessão são validados sem mudar o tempo ou o progresso',t=>{
 const s=setup(t),book=s.books[0];store.startReadingTimer(book.id);
 assert.throws(()=>store.removeBook(book.id));assert.throws(()=>store.saveBook({...book,title:'Outro nome'},book.id));
 t.mock.timers.tick(10*60000);store.stopReadingTimer();const before=store.exportData();
 for(const value of [-1,1.5,NaN,100000]){assert.throws(()=>store.completeReadingTimer(value));assert.equal(store.exportData(),before);}
 store.completeReadingTimer(2);assert.equal(store.readingDay().seconds,600);assert.equal(book.pageCurrent,114);
 assert.throws(()=>store.removeReadingSession(s.readingSessions[0].id));assert.equal(store.readingDay().seconds,600);
});
test('saldo não cumprido acumula uma vez por mês e o excedente não cria crédito futuro',()=>{
 const s={readingLog:{'2026-11-10':400,'2026-12-10':500,'2027-01-10':800},readingPlan:{startMonth:'2026-11',monthlyMinutes:520,dailyMinutes:20}};
 const november=readingMonth(s,'2026-11','2027-02-01');assert.equal(november.goalSeconds,520*60);assert.equal(november.carryOutSeconds,120*60);assert.equal(november.status,'Não atingida');
 const december=readingMonth(s,'2026-12','2027-02-01');assert.equal(december.goalSeconds,640*60);assert.equal(december.carryInSeconds,120*60);assert.equal(december.carryOutSeconds,140*60);
 const january=readingMonth(s,'2027-01','2027-02-01');assert.equal(january.goalSeconds,660*60);assert.equal(january.reached,true);assert.equal(january.carryOutSeconds,0);
 const february=readingMonth(s,'2027-02','2027-02-01');assert.equal(february.goalSeconds,520*60);assert.equal(february.closed,false);assert.equal(february.carryOutSeconds,0);assert.equal(february.status,'Em andamento');
 assert.deepEqual(readingMonth(s,'2026-12','2027-02-01'),december);
 assert.throws(()=>readingMonth(s,'2026-10','2027-02-01'));assert.throws(()=>readingMonth(s,'2027-03','2027-02-01'));
});
test('meta inicia neste mês preservando registros antigos e não inventa saldo de anos anteriores',t=>{
 const s=setup(t);s.readingLog['2020-01-01']=10;s.readingLog['2026-11-09']=20;
 const before=JSON.stringify(s.readingLog);normalizeReading(s);assert.equal(JSON.stringify(s.readingLog),before);
 assert.equal(s.readingPlan.startMonth,'2026-11');assert.equal(store.readingMonth().carryInSeconds,0);
 assert.equal(store.readingMonth().seconds,1200);assert.equal(readingDay(s,'2026-11-09','2026-11-10').reached,true);
 const backup=store.exportData();t.mock.timers.setTime(new Date('2026-12-01T12:00:00Z').getTime());store.importData(backup);
 assert.equal(store.readingMonth().goalSeconds,1020*60);assert.equal(store.readingMonth().carryInSeconds,500*60);
});

test('ativação da meta e início do cronômetro são salvos imediatamente na conta conectada',async t=>{
 setup(t);let row=JSON.parse(store.exportData());delete row.readingPlan;const writes=[];
 cloudStub.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{data:structuredClone(row)},error:null})})}),upsert:async payload=>{row=structuredClone(payload.data);writes.push(row);return{error:null};}});
 await store.setCloudUser('reader');assert.equal(writes.length,1);assert.equal(row.readingPlan.startMonth,'2026-11');
 store.startReadingTimer(store.getState().books[0].id);assert.equal(row.activeReadingTimer.bookId,store.getState().books[0].id);
 await store.setCloudUser('reader');assert.equal(store.getState().activeReadingTimer.id,row.activeReadingTimer.id);
 t.mock.timers.tick(20*60000);store.stopReadingTimer();store.completeReadingTimer(1);
 assert.equal(row.readingLog['2026-11-10'],20);assert.equal(row.activeReadingTimer,null);
 t.mock.timers.setTime(new Date('2026-12-01T12:00:00Z').getTime());await store.setCloudUser('reader');
 assert.equal(store.readingMonth().goalSeconds,1020*60);store.clearCloudUser();
});
