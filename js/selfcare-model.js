import { REFLECTION_SOURCES } from './reflections.js';
// Hábitos sugeridos para um adulto jovem; o usuário escolhe quais acompanhar.
export const SELFCARE_HABITS = [
  {id:'sleep',title:'Sono e desaceleração',detail:'Reserve tempo para dormir pelo menos 7 horas. Tente manter horários regulares e desacelerar antes de deitar.'},
  {id:'oral',title:'Dentes e gengivas',detail:'Escove com creme dental com flúor 2 vezes ao dia, por cerca de 2 minutos. Limpe entre os dentes diariamente com fio ou escova interdental.'},
  {id:'food',title:'Alimentação e água',detail:'Priorize alimentos in natura ou minimamente processados. Beba água ao longo do dia, ajustando à sede, ao calor e aos treinos.'},
  {id:'sun',title:'Proteção solar, quando sair',detail:'No pedal e em outras atividades ao ar livre, use sombra, roupa e protetor de amplo espectro FPS 30 ou mais. Reaplique a cada 2 horas e após suar ou nadar.'},
  {id:'jiujitsu',title:'Higiene após o jiu-jitsu',detail:'Tome banho após treinar e lave quimono, roupas e toalhas a cada uso. Não compartilhe toalhas ou lâminas. Procure atendimento para lesões com sinais de infecção.'},
  {id:'recovery',title:'Recuperação do corpo',detail:'Faça uma pausa do tempo sentado e respeite o descanso entre treinos. Se quiser, use alguns minutos de mobilidade confortável, sem forçar dor.'},
  {id:'connection',title:'Bem-estar e conexão',detail:'Separe um momento sem trabalho ou telas para algo prazeroso ou uma conversa com alguém próximo. Perceba como está se sentindo.'},
];
const dateOK=date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
export function normalizeSelfCare(s) {
  const c=s.selfCare ||= {};
  if(![5,10].includes(c.minutes))c.minutes=10;
  c.sound ??= true;
  const sources=Array.isArray(c.reflectionSources)?c.reflectionSources.filter(key=>Object.hasOwn(REFLECTION_SOURCES,key)):[];
  c.reflectionSources=sources.length?[...new Set(sources)]:Object.keys(REFLECTION_SOURCES);
  c.schedule ||= {enabled:false,day:0,time:'09:00'};
  if(!Number.isInteger(c.schedule.day)||c.schedule.day<0||c.schedule.day>6)c.schedule.day=0;
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.schedule.time||''))c.schedule.time='09:00';
  c.sessions ||= [];
  c.active ??= null;
  c.habits ||= SELFCARE_HABITS.map(h=>({...h,enabled:true}));
  c.daily ||= {};
  c.reminders ||= [];
  // Um backup inválido não pode criar um cronômetro interminável ou uma conclusão automática.
  if(c.active&&(!c.active.id||![5,10].includes(c.active.minutes)||!Number.isFinite(c.active.startedAt)||c.active.endsAt!==c.active.startedAt+c.active.minutes*60000))c.active=null;
  if(c.active)c.active.alertedAt ??= null;
  return s;
}
export function meditationSummary(c,year) {
  const sessions=c.sessions.filter(s=>s.date?.slice(0,4)===String(year));
  const count=sessions.length,goal=40;
  return {goal,count,remaining:Math.max(0,goal-count),minutes:sessions.reduce((n,s)=>n+s.minutes,0),pct:Math.min(100,Math.round(count/goal*100)),
    months:Array.from({length:12},(_,i)=>sessions.filter(s=>Number(s.date.slice(5,7))===i+1).length)};
}
export function meditationSteps(minutes) {
  const parts=[
    ['Chegue com calma','Sente-se de um jeito confortável, com apoio se precisar. Deixe os olhos fechados ou suavemente abertos.'],
    ['Perceba a respiração','Sinta o ar entrar e sair naturalmente. Não precisa mudar o ritmo nem prender o ar.'],
    ['Observe o corpo','Note os pontos de apoio, os ombros e a mandíbula. Solte a tensão que conseguir, sem forçar.'],
    ['Volte com gentileza','Se pensamentos aparecerem, perceba e retorne à respiração. Distração faz parte da prática.'],
    ['Encerre aos poucos','Perceba o ambiente, mova mãos e pés e abra os olhos no seu ritmo.'],
  ];
  const boundaries=[0,.1,.4,.7,.9,1];
  return parts.map(([title,description],i)=>({title,description,start:Math.round(minutes*60*boundaries[i]),end:Math.round(minutes*60*boundaries[i+1])}));
}
export function nextMeditation(c,now=new Date()) {
  if(!c.schedule.enabled)return [];
  const [hours,minutes]=c.schedule.time.split(':').map(Number),first=new Date(now);
  first.setDate(first.getDate()+(c.schedule.day-first.getDay()+7)%7);first.setHours(hours,minutes,0,0);
  if(first<now)first.setDate(first.getDate()+7);
  return Array.from({length:4},(_,i)=>{const date=new Date(first);date.setDate(date.getDate()+i*7);return date;});
}
export function reminderInput(input) {
  const title=String(input.title||'').trim().slice(0,160);
  if(!title||!dateOK(input.date))throw new Error('Informe o cuidado e uma data válida.');
  return {title,date:input.date,notes:String(input.notes||'').trim().slice(0,1600)};
}
