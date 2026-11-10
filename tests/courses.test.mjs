import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {normalizeHub} from '../js/hub-model.js';
const storage=new Map(),cloud={};globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};globalThis.window={dispatchEvent(){}};globalThis.__coursesCloud=cloud;
let source=await fs.readFile(new URL('../js/store.js',import.meta.url),'utf8');source=source.replace("import { sb } from './supabase-client.js';",'const sb=globalThis.__coursesCloud;');
for(const file of ['finance-model.js','hub-model.js'])source=source.replace("'./"+file+"'",JSON.stringify(pathToFileURL(resolve('js',file)).href));
const store=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const setup=t=>{t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T12:00:00Z').getTime()});store.resetApp();store.saveStudyCourse({title:'Matemática',provider:'ChatGPT',module:0,totalModules:12,status:'active',sourceUrl:'https://chatgpt.com/s/t_6af2931b748481918af55a531204fa55'});return store.getState().studyCourses.at(-1);};

test('migração mantém módulos e anotações, sem inventar dias para progresso antigo',t=>{
 const course=setup(t),s=store.getState();store.saveLearningEntry({courseId:course.id,date:'2026-11-09',topic:'Tema',summary:'Aprendizado anterior'});
 delete s.courseCheckins;const previous=structuredClone({courses:s.studyCourses,entries:s.learningEntries});normalizeHub(s);
 assert.deepEqual(s.courseCheckins,[]);assert.deepEqual(s.studyCourses,previous.courses);assert.deepEqual(s.learningEntries,previous.entries);
 const before=JSON.stringify(s);normalizeHub(s);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(store.courseStudyDays(course.id),[{date:'2026-11-09',checkin:false,entries:1}]);assert.equal(store.courseSummary(s.studyCourses[0].id).days,0);
});
test('check de hoje é idempotente, independente por curso e preservado nos dias seguintes',t=>{
 const course=setup(t),s=store.getState(),english=s.studyCourses[0];
 assert.equal(store.markCourseToday(course.id),true);assert.equal(store.markCourseToday(course.id),false);assert.equal(s.courseCheckins.length,1);assert.equal(course.module,0);
 store.markCourseToday(english.id);assert.equal(s.courseCheckins.length,2);assert.equal(store.courseSummary().days,1);
 t.mock.timers.tick(86400000);assert.equal(store.markCourseToday(course.id),true);assert.equal(store.courseSummary(course.id).days,2);
 store.unmarkCourseToday(course.id);assert.equal(store.courseSummary(course.id).days,1);assert.equal(store.courseStudyDays(course.id)[0].date,'2026-11-10');
 assert.equal(store.courseSummary(english.id).days,1);assert.equal(store.courseSummary(course.id,'2026-12').days,0);
 const before=store.exportData();assert.throws(()=>store.markCourseToday('missing'));assert.equal(store.exportData(),before);
});
test('anotações e checks do mesmo dia contam uma vez e desfazer nunca apaga o diário',t=>{
 const course=setup(t),s=store.getState();store.markCourseToday(course.id);
 store.saveLearningEntry({courseId:course.id,date:store.todayISO(),topic:'Frações',summary:'Exercícios do dia',minutes:30,status:'review'});
 assert.equal(store.courseSummary(course.id).days,1);assert.equal(store.courseSummary(course.id).entries,1);assert.equal(store.courseSummary(course.id).minutes,30);
 store.unmarkCourseToday(course.id);assert.equal(s.learningEntries.length,1);assert.equal(store.courseSummary(course.id).days,1);assert.equal(store.markCourseToday(course.id),false);
 assert.deepEqual(store.courseStudyDays(course.id)[0],{date:store.todayISO(),entries:1,checkin:false});
});
test('estudo diário não avança módulo; finalizar 12 módulos chega a 100% e registra apenas um dia',t=>{
 const course=setup(t);store.markCourseToday(course.id);assert.equal(course.module,0);
 for(let i=1;i<=12;i++){store.completeStudyModule(course.id);assert.equal(course.module,i);assert.equal(store.courseSummary(course.id).days,1);}
 assert.equal(course.status,'completed');assert.equal(course.module/course.totalModules,1);assert.throws(()=>store.completeStudyModule(course.id));
 store.undoStudyModule(course.id);assert.equal(course.module,11);assert.equal(course.status,'active');assert.equal(store.courseSummary(course.id).days,1);
 t.mock.timers.tick(86400000);store.completeStudyModule(course.id);assert.equal(course.module,12);assert.equal(course.status,'completed');assert.equal(store.courseSummary(course.id).days,2);
});
test('módulos sincronizam inglês e nenhuma ação de curso altera livros, finanças, treinos ou autocuidado',t=>{
 const course=setup(t),s=store.getState(),english=s.studyCourses[0],originalEnglish=english.module;
 const unaffected=()=>JSON.stringify({reading:s.readingLog,readingPlan:s.readingPlan,readingTimer:s.activeReadingTimer,books:s.books,finance:s.finance,training:s.trainingSessions,selfCare:s.selfCare});const before=unaffected();
 store.markCourseToday(course.id);store.completeStudyModule(course.id);assert.equal(english.module,originalEnglish);
 store.completeStudyModule(english.id);assert.equal(s.studyTrack.module,originalEnglish+1);store.undoStudyModule(english.id);assert.equal(s.studyTrack.module,originalEnglish);
 store.updateStudyTrack({module:7});assert.equal(english.module,7);assert.equal(course.module,1);assert.equal(unaffected(),before);
 const backup=store.exportData();store.importData(backup);assert.equal(store.exportData(),backup);
});
test('link é preservado ao editar em formulários antigos e dados inválidos são rejeitados',t=>{
 const course=setup(t),url=course.sourceUrl;store.saveStudyCourse({title:'Matemática básica',totalModules:12,module:1},course.id);assert.equal(course.sourceUrl,url);assert.equal(course.provider,'ChatGPT');
 const before=store.exportData();for(const sourceUrl of ['javascript:alert(1)','data:text/html,a','https://user:pass@example.test'])assert.throws(()=>store.saveStudyCourse({sourceUrl},course.id));assert.equal(store.exportData(),before);
 store.saveStudyCourse({title:'Curso livre',totalModules:0,module:0,status:'active'});const free=store.getState().studyCourses.at(-1);store.markCourseToday(free.id);assert.throws(()=>store.completeStudyModule(free.id));assert.throws(()=>store.undoStudyModule(free.id));assert.equal(store.courseSummary(free.id).days,1);
});
test('check e conclusão salvam imediatamente na nuvem e reabertura não duplica dias',async t=>{
 const course=setup(t);let row=JSON.parse(store.exportData()),writes=[];
 cloud.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{data:structuredClone(row)},error:null})})}),upsert:async payload=>{row=structuredClone(payload.data);writes.push(row);return{error:null};}});
 await store.setCloudUser('student');store.markCourseToday(course.id);assert.equal(row.courseCheckins.length,1);assert.equal(writes.length,1);
 await store.setCloudUser('student');assert.equal(store.markCourseToday(course.id),false);assert.equal(writes.length,1);
 store.completeStudyModule(course.id);assert.equal(row.studyCourses.at(-1).module,1);assert.equal(row.courseCheckins.length,1);assert.equal(writes.length,2);
 store.unmarkCourseToday(course.id);assert.equal(row.courseCheckins.length,0);assert.equal(row.studyCourses.at(-1).module,1);store.clearCloudUser();
});
