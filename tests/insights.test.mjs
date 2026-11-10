import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {dailyReflection,REFLECTIONS,REFLECTION_SOURCES,reflectionPreferences} from '../js/reflections.js';
import {financialSnapshot,validateSnapshot,validateInsightResponse} from '../js/financial-insights-model.js';
import {shiftMonth} from '../js/finance-model.js';
import {createFinancialHandler} from '../supabase/functions/forja-insights/handler.js';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};globalThis.window={dispatchEvent(){}};
let source=await fs.readFile(new URL('../js/store.js',import.meta.url),'utf8');source=source.replace("import { sb } from './supabase-client.js';",'const sb={};');
for(const file of ['finance-model.js','hub-model.js'])source=source.replace("'./"+file+"'",JSON.stringify(pathToFileURL(resolve('js',file)).href));
const store=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function snapshot(){return financialSnapshot('2026-11','2026-11-10',Array.from({length:12},(_,i)=>({month:shiftMonth('2026-11',i),income:4000,expenses:3500,invested:2080,groups:[{id:'bills',label:'Contas fixas',total:1800,items:[{id:'bill:home',label:'Casa',amount:1800,status:'Pago'}]},{id:'cards',label:'Faturas',total:1300,items:[{id:'card:a',label:'Fatura',amount:1300,status:'Previsto'}]},{id:'loans',label:'Empréstimos',total:0,items:[]},{id:'variable',label:'Avulsas',total:400,items:[{id:'entry:planned',label:'Passeio',amount:400,status:'Previsto'}]},{id:'lis',label:'Limite especial',total:0,items:[]}]})));}
const ai={summary:'Reveja novas compras para os meses apertados.',priorities:[{month:'2026-11',explanation:'As faturas e os compromissos estão pressionando o teto.',actions:['Avalie se o passeio previsto pode ser reduzido.']}],habits:['Confira o mês da fatura antes de comprar.']};
function mockServer(overrides={}) {
 const calls=[],env={SUPABASE_URL:'https://forja-test.supabase.co',SUPABASE_ANON_KEY:'public-project-key',GEMINI_API_KEY:'fake-secret-only-in-tests',FORJA_AI_ALLOWED_USER_IDS:'owner-id',...overrides.env};
 const handler=createFinancialHandler({getEnv:name=>env[name],fetchImpl:async(url,options)=>{calls.push({url,options});if(url.includes('/auth/v1/user'))return new Response(JSON.stringify({id:overrides.userId||'owner-id'}),{status:overrides.authStatus||200});if(overrides.google) return overrides.google(url,options);return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(ai)}]}}]}),{status:200});},now:()=>Date.parse('2026-11-10T12:00:00Z')});
 const req=(body={action:'analyze',snapshot:snapshot()},headers={})=>new Request('https://forja-test.supabase.co/functions/v1/forja-insights',{method:'POST',headers:{origin:'https://reilolx.github.io',authorization:'Bearer valid-owner-session','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 return {handler,calls,req,env};
}

test('reflexão fica estável no dia, muda na virada e respeita todas as combinações de fontes',()=>{
 assert.equal(REFLECTIONS.length,28);assert.equal(new Set(REFLECTIONS.map(q=>q.id)).size,28);
 const keys=Object.keys(REFLECTION_SOURCES);
 for(let bits=1;bits<16;bits++){
  const sources=keys.filter((_,i)=>bits&(1<<i));let previous=null;
  for(let n=0;n<400;n++){
   const date=new Date(Date.UTC(2026,10,1+n)).toISOString().slice(0,10),q=dailyReflection(date,sources);
   assert.ok(sources.includes(q.source));assert.equal(dailyReflection(date,sources).id,q.id);assert.notEqual(q.id,previous);previous=q.id;
  }
 }
 for(const q of REFLECTIONS){assert.match(q.url,/^https:\/\//);assert.ok(q.reference&&q.explanation&&q.practice);assert.ok(q.explanation.length<600);}
 assert.throws(()=>dailyReflection('2026-02-31'));assert.throws(()=>reflectionPreferences([]));assert.throws(()=>reflectionPreferences(['unknown']));
});
test('preferências de reflexão persistem sem alterar meditações nem histórico',()=>{
 store.resetApp();const before=structuredClone(store.getState().selfCare);
 store.setReflectionSources(['bible','seneca']);assert.deepEqual(store.getState().selfCare.reflectionSources,['seneca','bible']);
 const backup=store.exportData();store.importData(backup);assert.equal(store.exportData(),backup);assert.deepEqual(store.getState().selfCare.sessions,before.sessions);assert.equal(store.getState().selfCare.active,before.active);
 const unchanged=store.exportData();assert.throws(()=>store.setReflectionSources([]));assert.equal(store.exportData(),unchanged);
});
test('retratos calculam teto e excesso em centavos, sem tratar aporte como despesa',()=>{
 const value=snapshot();assert.equal(value.months.length,12);assert.equal(value.months[0].gapCents,30000);assert.equal(value.months[0].ceilingCents,320000);assert.equal(value.months[0].investedCents,208000);assert.equal(value.months[0].variablePlannedCents,40000);assert.equal(value.months[0].paidCents,180000);
 assert.deepEqual(validateSnapshot(value),value);
 const invalid=structuredClone(value);invalid.months[0].ceilingCents=400000;assert.throws(()=>validateSnapshot(invalid));
 invalid.months[0]=structuredClone(value.months[0]);invalid.months[0].categories[0].cents++;assert.throws(()=>validateSnapshot(invalid));
 const extra={...value,secret:'must-not-go-to-provider',books:[{title:'Private book'}]};const clean=validateSnapshot(extra);assert.equal(clean.secret,undefined);assert.equal(clean.books,undefined);
});
test('retrato da conta acompanha receitas, faturas e empréstimo só a partir da primeira cobrança',()=>{
 store.resetApp();const f=store.getState().finance;f.fixedBills=[];f.cards=[];f.lisHistory={};f.entries=[];f.loans=[{id:'worker',name:'Crédito do trabalhador',monthlyAmount:1349.56,installments:45,startMonth:'2027-02',paidInstallments:0}];
 store.addFinanceEntry({type:'income',description:'Salário',amount:4000,date:'2026-11-01',status:'confirmed',recurring:true});store.addFinanceEntry({type:'investment',description:'Aporte',asset:'Reserva',amount:2080,date:'2026-11-03',status:'confirmed'});
 const before=store.exportData(),data=store.financialInsightSnapshot('2026-11');assert.equal(data.months[0].expenseCents,0);assert.equal(data.months[0].roomCents,320000);assert.equal(data.months[3].month,'2027-02');assert.equal(data.months[3].expenseCents,134956);
 assert.equal(store.exportData(),before);assert.equal(JSON.stringify(data).includes(store.getState().books[0].title),false);assert.equal(data.months[0].largestCosts.length,0);assert.doesNotThrow(()=>validateSnapshot(data));
 f.entries=[];assert.equal(store.financialInsightSnapshot('2026-11').months[0].status,'missing-income');assert.equal(store.financialInsightSnapshot('2026-11').months[3].gapCents,0);
});
test('resposta exige meses conhecidos, texto e ações válidas, sem aceitar resultados de outro período',()=>{
 assert.deepEqual(validateInsightResponse(ai,snapshot()),ai);assert.throws(()=>validateInsightResponse({...ai,summary:''},snapshot()));assert.throws(()=>validateInsightResponse({...ai,priorities:[{...ai.priorities[0],month:'2040-01'}]},snapshot()));assert.throws(()=>validateInsightResponse({...ai,priorities:[{...ai.priorities[0],actions:[]}]},snapshot()));
});
test('servidor exige sessão válida, origem permitida, configuração e usuário autorizado',async()=>{
 let server=mockServer();let response=await server.handler(server.req(undefined,{authorization:''}));assert.equal(response.status,401);assert.equal(server.calls.length,0);
 response=await server.handler(server.req(undefined,{origin:'https://unrelated.example'}));assert.equal(response.status,403);assert.equal(server.calls.length,0);
 server=mockServer({authStatus:401});assert.equal((await server.handler(server.req())).status,401);assert.equal(server.calls.length,1);
 server=mockServer({userId:'another-user'});assert.equal((await server.handler(server.req())).status,403);assert.equal(server.calls.length,1);
 server=mockServer({env:{GEMINI_API_KEY:''}});response=await server.handler(server.req());assert.equal(response.status,503);assert.equal((await response.json()).code,'GEMINI_NOT_CONFIGURED');assert.equal(server.calls.length,1);
});
test('consulta encaminha apenas retrato e chave no header Google, nunca token ou segredo no resultado',async()=>{
 const {handler,calls,req,env}=mockServer();const input={...snapshot(),privateDiary:'private-not-to-be-sent'};
 let response=await handler(req({action:'analyze',snapshot:input}));assert.equal(response.status,200);const result=await response.json();assert.equal(result.provider,'gemini');assert.deepEqual(result.analysis,ai);
 const google=calls.find(call=>call.url.includes('googleapis.com'));assert.ok(google);assert.equal(google.options.headers['x-goog-api-key'],env.GEMINI_API_KEY);assert.equal(google.options.headers.authorization,undefined);assert.ok(!google.url.includes(env.GEMINI_API_KEY));assert.ok(!google.options.body.includes(env.GEMINI_API_KEY));assert.ok(!google.options.body.includes('private-not-to-be-sent'));assert.ok(!google.options.body.includes('valid-owner-session'));assert.ok(!JSON.stringify(result).includes(env.GEMINI_API_KEY));
 assert.match(JSON.parse(google.options.body).systemInstruction.parts[0].text,/NUNCA despesas/);
 response=await handler(req());assert.equal(response.status,200);assert.equal(calls.filter(call=>call.url.includes('googleapis.com')).length,1);
});
test('servidor limita requisições, não vaza erros do provedor e rejeita corpo grande ou resposta truncada',async()=>{
 const server=mockServer({google:async()=>new Response('fake-secret-only-in-tests',{status:403})});
 for(let n=0;n<3;n++){const response=await server.handler(server.req());assert.equal(response.status,502);assert.equal((await response.json()).code,'GEMINI_AUTH_ERROR');}
 assert.equal((await server.handler(server.req())).status,429);
 const oversized=mockServer();assert.equal((await oversized.handler(oversized.req({text:'x'.repeat(65000)}))).status,413);assert.equal(oversized.calls.length,1);
 const truncated=mockServer({google:async()=>new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:JSON.stringify(ai)}]}}]}))});assert.equal((await truncated.handler(truncated.req())).status,502);
 const invalid=mockServer();assert.equal((await invalid.handler(invalid.req({action:'analyze',snapshot:{}}))).status,400);
});
