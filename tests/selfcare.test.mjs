import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {normalizeSelfCare,meditationSteps,nextMeditation} from '../js/selfcare-model.js';
const cloudStub={};globalThis.__careCloudStub=cloudStub;
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};globalThis.window={dispatchEvent(){}};
let source=await fs.readFile(new URL('../js/store.js',import.meta.url),'utf8');source=source.replace("import { sb } from './supabase-client.js';",'const sb=globalThis.__careCloudStub;');
for(const file of ['finance-model.js','hub-model.js'])source=source.replace("'./"+file+"'",JSON.stringify(pathToFileURL(resolve('js',file)).href));
const store=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const setup=t=>{t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T12:00:00Z').getTime()});store.resetApp();return store.getState();};
const settings=(overrides={})=>({minutes:10,sound:true,enabled:true,day:2,time:'19:00',...overrides});

test('autocuidado nasce sem histórico inventado e a migração preserva todo o restante',t=>{
 const s=setup(t),before=JSON.stringify(s);normalizeSelfCare(s);assert.equal(JSON.stringify(s),before);
 assert.equal(s.selfCare.minutes,10);assert.equal(store.meditationSummary().goal,40);assert.equal(store.meditationSummary().count,0);
 assert.equal(s.selfCare.sessions.length,0);assert.equal(s.selfCare.active,null);assert.deepEqual(s.selfCare.daily,{});
 const care=structuredClone(s.selfCare);s.selfCare.active={id:'bad',minutes:10,startedAt:0,endsAt:Infinity};normalizeSelfCare(s);assert.deepEqual(s.selfCare,care);
});
test('cronômetro persiste, só conclui após o tempo e exige confirmação uma única vez',t=>{
 setup(t);store.startMeditation();const id=store.getState().selfCare.active.id;
 assert.throws(()=>store.startMeditation());assert.throws(()=>store.completeMeditation());
 assert.equal(store.markMeditationFinished(),false);t.mock.timers.tick(4*60000);
 const backup=store.exportData();store.importData(backup);assert.equal(store.getState().selfCare.active.id,id);
 t.mock.timers.tick(6*60000-1);assert.throws(()=>store.completeMeditation());assert.equal(store.markMeditationFinished(),false);
 t.mock.timers.tick(1);assert.equal(store.markMeditationFinished(),true);assert.equal(store.markMeditationFinished(),false);
 assert.equal(store.meditationSummary().count,0);store.completeMeditation();
 assert.equal(store.meditationSummary().count,1);assert.equal(store.meditationSummary().minutes,10);assert.equal(store.getState().selfCare.active,null);
 assert.throws(()=>store.completeMeditation());assert.equal(store.meditationSummary().count,1);
});
test('cancelar ou não confirmar uma meditação não gera sessão nem modifica livros, treinos ou dinheiro',t=>{
 const s=setup(t),other=()=>JSON.stringify({finance:s.finance,books:s.books,readingLog:s.readingLog,readingPlan:s.readingPlan,training:s.trainingSessions});const before=other();
 store.startMeditation();t.mock.timers.tick(3*60000);store.cancelMeditation();assert.equal(store.meditationSummary().count,0);
 store.startMeditation();t.mock.timers.tick(2*86400000);store.markMeditationFinished();assert.equal(store.meditationSummary().count,0);
 store.cancelMeditation();assert.equal(store.getState().selfCare.active,null);assert.equal(other(),before);
});
test('duração em andamento não muda com preferências e meta anual chega a 100% sem extrapolar',t=>{
 setup(t);store.startMeditation();store.updateMeditationSettings(settings({minutes:5}));assert.equal(store.getState().selfCare.active.minutes,10);
 t.mock.timers.tick(10*60000);store.completeMeditation();
 for(let i=0;i<39;i++){store.startMeditation();assert.equal(store.getState().selfCare.active.minutes,5);t.mock.timers.tick(5*60000);store.completeMeditation();}
 assert.equal(store.meditationSummary().count,40);assert.equal(store.meditationSummary().remaining,0);assert.equal(store.meditationSummary().pct,100);
 store.startMeditation();t.mock.timers.tick(5*60000);store.completeMeditation();assert.equal(store.meditationSummary().pct,100);assert.equal(store.meditationSummary().count,41);
});
test('ano e mês seguem a data local de término; confirmar depois não muda o histórico',t=>{
 setup(t);t.mock.timers.setTime(new Date('2026-12-31T23:55:00').getTime());store.startMeditation();
 t.mock.timers.tick(10*60000);store.markMeditationFinished();t.mock.timers.tick(2*86400000);store.completeMeditation();
 assert.equal(store.meditationSummary(2026).count,0);const year=store.meditationSummary(2027);assert.equal(year.count,1);assert.equal(year.months[0],1);assert.equal(year.months.reduce((a,b)=>a+b),1);
 assert.equal(store.getState().selfCare.sessions[0].date,'2027-01-01');assert.equal(store.meditationSummary(2028).count,0);
});
test('agenda usa dia e horário locais, não marca prática automaticamente e roteiro cobre exatamente a duração',t=>{
 const s=setup(t);assert.deepEqual(nextMeditation(s.selfCare),[]);store.updateMeditationSettings(settings());
 const now=new Date('2026-11-10T18:30:00'),next=nextMeditation(s.selfCare,now);assert.equal(next.length,4);
 assert.equal(next[0].getDay(),2);assert.equal(next[0].getHours(),19);assert.equal(next[0].getDate(),10);assert.equal(next[1].getDate(),17);
 const after=nextMeditation(s.selfCare,new Date('2026-11-10T19:01:00'));assert.equal(after[0].getDate(),17);
 assert.equal(store.meditationSummary().count,0);
 for(const duration of [5,10]){const steps=meditationSteps(duration);assert.equal(steps[0].start,0);assert.equal(steps.at(-1).end,duration*60);steps.forEach((step,i)=>{assert.ok(step.end>step.start);if(i)assert.equal(steps[i-1].end,step.start);});}
 const before=store.exportData();for(const overrides of [{minutes:0},{minutes:60},{day:-1},{day:7},{time:'25:00'},{time:'12:90'}])assert.throws(()=>store.updateMeditationSettings(settings(overrides)));assert.equal(store.exportData(),before);
});
test('checklist é independente por dia e personalização não apaga registros anteriores',t=>{
 const s=setup(t),id=s.selfCare.habits[0].id,today=store.todayISO();
 store.toggleSelfCareHabit(id);assert.equal(s.selfCare.daily[today][id],true);store.toggleSelfCareHabit(id);assert.equal(s.selfCare.daily[today][id],false);store.toggleSelfCareHabit(id);
 store.enableSelfCareHabit(id,false);assert.throws(()=>store.toggleSelfCareHabit(id));assert.equal(s.selfCare.daily[today][id],true);
 t.mock.timers.tick(86400000);store.enableSelfCareHabit(id,true);store.toggleSelfCareHabit(id);assert.equal(s.selfCare.daily[store.todayISO()][id],true);assert.equal(s.selfCare.daily[today][id],true);
 store.addSelfCareHabit('  Minha pausa  ');assert.equal(s.selfCare.habits.at(-1).title,'Minha pausa');assert.throws(()=>store.addSelfCareHabit('  '));
 const backup=store.exportData();store.importData(backup);assert.equal(store.exportData(),backup);
});
test('lembretes aceitam agendamento, edição e confirmação, validando datas e conteúdo',t=>{
 const s=setup(t);store.saveCareReminder({title:'UBS',date:'2026-12-01',notes:'Conferir carteira'});const r=s.selfCare.reminders[0];assert.equal(r.done,false);
 store.saveCareReminder({title:'Vacinas na UBS',date:'2026-12-02',notes:'Levar documento'},r.id);assert.equal(s.selfCare.reminders.length,1);assert.equal(r.title,'Vacinas na UBS');
 store.toggleCareReminder(r.id);assert.equal(r.done,true);assert.equal(r.completedDate,store.todayISO());store.toggleCareReminder(r.id);assert.equal(r.completedDate,null);
 const before=store.exportData();for(const data of [{title:'',date:'2026-12-01'},{title:'teste',date:'2026-02-31'},{title:'teste',date:'inválida'}])assert.throws(()=>store.saveCareReminder(data));assert.equal(store.exportData(),before);
 store.removeCareReminder(r.id);assert.equal(s.selfCare.reminders.length,0);
});
test('início e conclusão da meditação são salvos imediatamente na conta conectada',async t=>{
 setup(t);let row=JSON.parse(store.exportData()),writes=[];
 cloudStub.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{data:structuredClone(row)},error:null})})}),upsert:async payload=>{row=structuredClone(payload.data);writes.push(row);return{error:null};}});
 await store.setCloudUser('care-user');store.startMeditation();assert.ok(row.selfCare.active.id);
 const id=row.selfCare.active.id;await store.setCloudUser('care-user');assert.equal(store.getState().selfCare.active.id,id);
 t.mock.timers.tick(10*60000);store.markMeditationFinished();assert.ok(row.selfCare.active.alertedAt);store.completeMeditation();assert.equal(row.selfCare.sessions.length,1);assert.equal(row.selfCare.active,null);
 assert.equal(writes.length,3);store.clearCloudUser();
});
