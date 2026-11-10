import { shiftMonth } from './finance-model.js';
const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function normalizeReading(s) {
  s.readingPlan ||= {startMonth:localDate().slice(0,7),monthlyMinutes:520,dailyMinutes:20};
  s.activeReadingTimer ??= null;
  s.dailyReadingGoalMin=s.readingPlan.dailyMinutes;
  return s;
}
export function readingSeconds(s,date) {return Math.max(0,Math.round(Number(s.readingLog[date]||0)*60));}
export function readingDay(s,date,today=localDate()) {
  const seconds=readingSeconds(s,date),goalSeconds=s.readingPlan.dailyMinutes*60;
  return {date,seconds,goalSeconds,reached:seconds>=goalSeconds,closed:date<today,future:date>today,
    remainingSeconds:Math.max(0,goalSeconds-seconds)};
}
export function readingMonth(s,month,today=localDate()) {
  const start=s.readingPlan.startMonth,current=today.slice(0,7);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month<start||month>current)throw new Error('Escolha um mês entre o início da meta e o mês atual.');
  const byMonth=new Map();
  for(const [date] of Object.entries(s.readingLog)) {
    if(date>today)continue;
    const key=date.slice(0,7);byMonth.set(key,(byMonth.get(key)||0)+readingSeconds(s,date));
  }
  let carry=0,result;
  for(let cursor=start;cursor<=month;cursor=shiftMonth(cursor,1)) {
    const baseSeconds=s.readingPlan.monthlyMinutes*60,goalSeconds=baseSeconds+carry,seconds=byMonth.get(cursor)||0;
    const missingSeconds=Math.max(0,goalSeconds-seconds),closed=cursor<current;
    result={month:cursor,baseSeconds,carryInSeconds:carry,goalSeconds,seconds,missingSeconds,closed,reached:seconds>=goalSeconds,
      carryOutSeconds:closed?missingSeconds:0,status:seconds>=goalSeconds?'Atingida':closed?'Não atingida':'Em andamento'};
    if(closed)carry=missingSeconds;
  }
  return result;
}
export function readingMonthDays(s,month,today=localDate()) {
  const [year,m]=month.split('-').map(Number),count=new Date(year,m,0).getDate();
  return Array.from({length:count},(_,i)=>readingDay(s,`${month}-${String(i+1).padStart(2,'0')}`,today));
}
export function readingHistory(s,today=localDate(),limit=6) {
  const months=[];for(let month=today.slice(0,7);month>=s.readingPlan.startMonth&&months.length<limit;month=shiftMonth(month,-1))months.unshift(month);
  return months.map(month=>readingMonth(s,month,today));
}
export function timerElapsed(timer,now=Date.now()) {
  return Math.max(0,(timer.stoppedAt??Math.min(now,timer.endsAt))-timer.startedAt);
}
export function formatReadingSeconds(seconds) {
  const value=Math.max(0,Math.floor(seconds));
  return `${Math.floor(value/60)} min${value%60?' '+value%60+' s':''}`;
}
export function formatReadingClock(milliseconds) {
  const value=Math.max(0,Math.floor(milliseconds/1000));
  return `${Math.floor(value/60).toString().padStart(2,'0')}:${(value%60).toString().padStart(2,'0')}`;
}
