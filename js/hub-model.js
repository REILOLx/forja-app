export { financialSnapshot } from './financial-insights-model.js';
import { normalizeSelfCare } from './selfcare-model.js';
export { reflectionPreferences } from './reflections.js';
export { meditationSummary, reminderInput } from './selfcare-model.js';
import { normalizeReading } from './reading-model.js';
export { readingDay, readingMonth, readingHistory, readingMonthDays, timerElapsed, formatReadingSeconds, formatReadingClock } from './reading-model.js';
import { sum, money } from './finance-model.js';

export const TRAINING_TYPES = { jiujitsu:'Jiu-jitsu', pedal:'Pedal', casa:'Treino em casa', outro:'Outra atividade' };
export const BOOK_STATUSES = { reading:'Lendo', queued:'Quero ler', paused:'Pausado', finished:'Concluído' };
export const COURSE_STATUSES = {active:'Em andamento',paused:'Pausado',completed:'Concluído'};
export const LEARNING_STATUSES = {learned:'Estudado',review:'Quero revisar'};
export const CLIENT_STATUSES = { active:'Ativo', lead:'Em negociação', inactive:'Inativo' };
export function normalizeHub(s) {
  s.trainingSessions ||= [];
  s.weeklyTrainingGoal ??= 3;
  s.readingSessions ||= [];
  s.readingLog ||= {};
  s.workoutLog ||= {};
  s.dailyReadingGoalMin ??= 20;
  s.studyTrack ||= {title:'Sua trilha de estudo',module:0,totalModules:1,nextTopic:''};
  if(!Array.isArray(s.studyCourses))s.studyCourses=[{...s.studyTrack,id:'course-migrated-track',provider:'',status:'active',legacyTrack:true}];
  s.learningEntries ||= [];
  s.courseCheckins ||= [];
  if (!Array.isArray(s.books)) {
    s.books = [];
    if (s.currentBook?.title) s.books.push({ ...s.currentBook, id:'book-migrated-current', status:'reading' });
    (s.bookQueue || []).forEach((b,i) => s.books.push({ ...b, id:'book-migrated-queue-'+i, status:'queued', author:b.author||'', pageCurrent:b.pageCurrent||0, pageTotal:b.pageTotal||0 }));
  }
  s.businesses ||= [
    {id:'lumeqia',name:'LumeqIA',sector:'Tecnologia e inteligência artificial'},
    {id:'alfa-tauri',name:'Alfa tauri innovation group',sector:'Inovação e negócios'},
    {id:'reis-reis',name:'Reis e Reis construtora',sector:'Construção civil'},
  ];
  s.businessEntries ||= [];
  s.businessClients ||= [];
  s.businessGoals ||= {};
  return normalizeSelfCare(normalizeReading(s));
}
export function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date||'') && !Number.isNaN(Date.parse(date+'T12:00:00Z')) && new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
}
const text = (v,max=200) => String(v||'').trim().slice(0,max);
function number(v,min=0,integer=false) {
  const n=Number(v);
  if(!Number.isFinite(n)||n<min||(integer&&!Number.isInteger(n)))throw new Error('Informe valores numéricos válidos.');
  return n;
}
export function trainingInput(input,today) {
  const type=input.type, status=input.status||'done';
  if(!TRAINING_TYPES[type]||!['done','planned'].includes(status)||!validDate(input.date))throw new Error('Escolha a modalidade e uma data válida.');
  if(status==='done'&&input.date>today)throw new Error('Treinos futuros devem ficar como planejados.');
  const duration=number(input.duration,1,true),distance=type==='pedal'?number(input.distance||0):0;
  if(!['leve','moderada','intensa'].includes(input.intensity))throw new Error('Escolha a intensidade.');
  return {type,status,date:input.date,duration,distance,intensity:input.intensity,notes:text(input.notes,1200)};
}
export function weekBounds(date) {
  const cursor=new Date(date+'T12:00:00Z');
  cursor.setUTCDate(cursor.getUTCDate()-((cursor.getUTCDay()+6)%7));
  const start=cursor.toISOString().slice(0,10);cursor.setUTCDate(cursor.getUTCDate()+6);
  return {start,end:cursor.toISOString().slice(0,10)};
}
export function trainingSummary(s,date) {
  const {start,end}=weekBounds(date);
  const sessions=s.trainingSessions.filter(e=>e.date>=start&&e.date<=end);
  const completed=sessions.filter(e=>e.status==='done');
  const legacy=Object.entries(s.workoutLog||{}).filter(([d,l])=>d>=start&&d<=end&&l.completed).length;
  return {start,end,done:completed.length+legacy,planned:sessions.filter(e=>e.status==='planned').length,
    minutes:completed.reduce((n,e)=>n+e.duration,0),distance:money(completed.reduce((n,e)=>n+e.distance,0)),legacy,
    byType:Object.fromEntries(Object.keys(TRAINING_TYPES).map(type=>[type,completed.filter(e=>e.type===type).length]))};
}
export function bookInput(input) {
  const title=text(input.title,160), status=input.status||'reading';
  if(!title||!BOOK_STATUSES[status])throw new Error('Informe o título e a situação do livro.');
  const pageTotal=number(input.pageTotal||0,0,true),pageCurrent=number(input.pageCurrent||0,0,true);
  if(pageTotal&&pageCurrent>pageTotal)throw new Error('A página atual não pode ultrapassar o total.');
  return {title,author:text(input.author,120),pageTotal,pageCurrent,status};
}
export function readingInput(s,input,today) {
  const book=s.books.find(b=>b.id===input.bookId);
  if(!book||!validDate(input.date)||input.date>today)throw new Error('Escolha um livro e uma data atual ou anterior.');
  const minutes=number(input.minutes,1,true),page=number(input.page,0,true);
  if(book.pageTotal&&page>book.pageTotal)throw new Error('A página não pode ultrapassar o total do livro.');
  return {bookId:book.id,date:input.date,minutes,page,notes:text(input.notes,1200)};
}
export function businessEntryInput(s,input,today) {
  if(!s.businesses.some(b=>b.id===input.businessId)||!['revenue','expense'].includes(input.type)||!['paid','pending'].includes(input.status)||!validDate(input.date))throw new Error('Escolha a empresa, o movimento e uma data válida.');
  if(input.status==='paid'&&input.date>today)throw new Error('Um movimento futuro deve ficar pendente.');
  const amount=money(number(input.amount,0.01)),description=text(input.description,160);
  if(amount<=0||!description)throw new Error('Informe a descrição e um valor maior que zero.');
  const clientId=input.clientId||'';
  if(clientId&&!s.businessClients.some(c=>c.id===clientId&&c.businessId===input.businessId))throw new Error('O cliente precisa pertencer à empresa escolhida.');
  return {businessId:input.businessId,type:input.type,status:input.status,date:input.date,amount,description,clientId,category:text(input.category,80)};
}
export function clientInput(s,input) {
  const name=text(input.name,120);
  if(!name||!s.businesses.some(b=>b.id===input.businessId)||!CLIENT_STATUSES[input.status]||!validDate(input.since))throw new Error('Informe a empresa, nome, situação e data de entrada do cliente.');
  return {name,businessId:input.businessId,status:input.status,since:input.since,contact:text(input.contact,160),notes:text(input.notes,800)};
}
export function businessSummary(s,ym,businessId='all') {
  const entries=s.businessEntries.filter(e=>e.date.slice(0,7)===ym&&(businessId==='all'||e.businessId===businessId));
  const amount=(type,status)=>sum(entries.filter(e=>e.type===type&&(!status||e.status===status)).map(e=>e.amount));
  const revenue=amount('revenue'),expenses=amount('expense'),received=amount('revenue','paid'),paid=amount('expense','paid');
  const clients=s.businessClients.filter(c=>(businessId==='all'||c.businessId===businessId)&&c.since.slice(0,7)<=ym);
  const goal=sum(s.businesses.filter(b=>businessId==='all'||b.id===businessId).map(b=>s.businessGoals[`${b.id}:${ym}`]||0));
  return {revenue,expenses,result:sum([revenue,-expenses]),received,paid,cash:sum([received,-paid]),
    receivable:amount('revenue','pending'),payable:amount('expense','pending'),
    margin:revenue>0?Math.round((revenue-expenses)/revenue*1000)/10:null,
    clients:clients.filter(c=>c.status==='active').length,leads:clients.filter(c=>c.status==='lead').length,
    newClients:clients.filter(c=>c.since.slice(0,7)===ym).length,goal,entries:entries.length};
}

export function courseInput(input) {
  const title=text(input.title,160),provider=text(input.provider,120),status=input.status||'active';
  if(!title||!Object.hasOwn(COURSE_STATUSES,status))throw new Error('Informe o nome e a situação do curso.');
  const totalModules=number(input.totalModules||0,0,true);
  let module=number(input.module||0,0,true);
  if(totalModules&&module>totalModules)throw new Error('Os módulos concluídos não podem ultrapassar o total.');
  if(status==='completed'&&totalModules)module=totalModules;
  let sourceUrl=text(input.sourceUrl,2048);
  if(sourceUrl){
    try{const url=new URL(sourceUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error();sourceUrl=url.href;}
    catch{throw new Error('Use um link http ou https válido para o curso.');}
  }
  return {title,provider,status,module,totalModules,nextTopic:text(input.nextTopic,200),sourceUrl};
}
export function learningInput(s,input,today) {
  const course=s.studyCourses.find(c=>c.id===input.courseId),topic=text(input.topic,180),summary=text(input.summary,4000);
  if(!course)throw new Error('Escolha o curso deste aprendizado.');
  if(!validDate(input.date)||input.date>today)throw new Error('Informe uma data de estudo atual ou anterior.');
  if(!topic||!summary)throw new Error('Informe o assunto da aula e o que você aprendeu.');
  const status=input.status||'learned';
  if(!Object.hasOwn(LEARNING_STATUSES,status))throw new Error('Escolha a situação do aprendizado.');
  let materialUrl=text(input.materialUrl,2048);
  if(materialUrl){
    try{const url=new URL(materialUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error();materialUrl=url.href;}
    catch{throw new Error('Use um link http ou https válido para o material ou a conversa.');}
  }
  return {courseId:course.id,courseTitle:course.title,date:input.date,topic,summary,status,
    minutes:number(input.minutes||0,0,true),materialTitle:text(input.materialTitle,200),materialUrl,
    application:text(input.application,2000),questions:text(input.questions,1600),nextStep:text(input.nextStep,1000)};
}
// Dias com anotações antigas também contam como estudo, sem criar checks ou duplicar datas.
export function courseStudyDays(s,courseId='all',month,today) {
  const days=new Map(),matches=e=>(courseId==='all'||e.courseId===courseId)&&(!month||e.date.slice(0,7)===month)&&(!today||e.date<=today);
  for(const entry of s.learningEntries.filter(matches)){
    const day=days.get(entry.date)||{date:entry.date,checkin:false,entries:0};day.entries++;days.set(entry.date,day);
  }
  for(const entry of (s.courseCheckins||[]).filter(matches)){
    const day=days.get(entry.date)||{date:entry.date,checkin:false,entries:0};day.checkin=true;days.set(entry.date,day);
  }
  return [...days.values()].sort((a,b)=>b.date.localeCompare(a.date));
}
export function courseSummary(s,courseId='all',month) {
  const entries=s.learningEntries.filter(e=>(courseId==='all'||e.courseId===courseId)&&(!month||e.date.slice(0,7)===month));
  const days=courseStudyDays(s,courseId,month);
  return {entries:entries.length,minutes:entries.reduce((n,e)=>n+e.minutes,0),review:entries.filter(e=>e.status==='review').length,
    days:days.length,lastDate:days[0]?.date||null};
}
