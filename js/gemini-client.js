import {sb} from './supabase-client.js';
import {validateSnapshot,validateInsightResponse} from './financial-insights-model.js';
async function invoke(body) {
  if(!sb.functions?.invoke)throw new Error('A conexão do Gemini com a Forja ainda não está disponível.');
  const {data,error}=await sb.functions.invoke('forja-insights',{body});
  if(error){
    let code='';try{code=(await (error.context?.clone?.()||error.context)?.json())?.code||'';}catch{/* Sem detalhes privados do servidor. */}
    if(['NOT_FOUND','GEMINI_NOT_CONFIGURED'].includes(code)||error.context?.status===404)throw new Error('O Gemini ainda não está disponível no servidor da Forja. Falta ativar e autorizar o serviço no Supabase para receber esta análise completa.');
    if(code==='RATE_LIMITED'||error.context?.status===429)throw new Error('O limite de consultas foi atingido. Aguarde um pouco para tentar novamente.');
    if(code==='INVALID_FINANCIAL_DATA')throw new Error('O serviço precisa ser atualizado para receber o detalhamento financeiro completo.');
    if(error.context?.status===413)throw new Error('O detalhamento ultrapassou o limite de tamanho do serviço. Nenhum gasto foi omitido: a análise não foi enviada ao Gemini.');
    if(error.context?.status===401)throw new Error('Entre novamente na sua conta para consultar o Gemini.');
    if(error.context?.status===504)throw new Error('O Gemini demorou para responder. Tente novamente em instantes.');
    throw new Error('Não foi possível consultar o Gemini agora. Tente novamente em instantes.');
  }
  return data;
}
export async function geminiConnectionStatus() {
  const data=await invoke({action:'status'});
  if(!data?.ready||data.provider!=='gemini'||data.schemaVersion!==2)throw new Error('O serviço do Gemini precisa ser atualizado para analisar todos os gastos.');
  return {ready:true,model:data.model};
}
export async function requestFinancialInsights(snapshot) {
  const payload=validateSnapshot(snapshot),data=await invoke({action:'analyze',snapshot:payload});
  if(!data||data.provider!=='gemini')throw new Error('O serviço não retornou uma análise do Gemini.');
  return {...validateInsightResponse(data.analysis,payload),model:typeof data.model==='string'?data.model.slice(0,80):'Gemini',generatedAt:typeof data.generatedAt==='string'&&!Number.isNaN(Date.parse(data.generatedAt))?data.generatedAt:new Date().toISOString()};
}
