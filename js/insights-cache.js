import {validateInsightResponse} from './financial-insights-model.js';
const MAX_AGE=86400000;
async function fingerprint(snapshot) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(snapshot)));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function cachedInsights(owner,snapshot,{storage,now=Date.now()}={}) {
  if(!owner)return null;
  try{
    storage??=globalThis.sessionStorage;
    const row=JSON.parse(storage.getItem('forja:gemini:'+owner));
    if(!row||row.version!==1||!Number.isFinite(row.at)||row.at>now||now-row.at>=MAX_AGE||row.fingerprint!==await fingerprint(snapshot))return null;
    const result=row.result;
    if(typeof result?.model!=='string'||result.model.length>80||typeof result.generatedAt!=='string'||Number.isNaN(Date.parse(result.generatedAt)))return null;
    return {...validateInsightResponse(result,snapshot),model:result.model,generatedAt:result.generatedAt};
  }catch{return null;}
}
export async function cacheInsights(owner,snapshot,result,{storage,now=Date.now()}={}) {
  if(!owner)return;
  try{storage??=globalThis.sessionStorage;storage.setItem('forja:gemini:'+owner,JSON.stringify({version:1,at:now,fingerprint:await fingerprint(snapshot),result}));}catch{/* Cache opcional: a análise continua sem armazenamento local. */}
}
