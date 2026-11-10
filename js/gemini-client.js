import {sb} from './supabase-client.js';
import {validateSnapshot,validateInsightResponse} from './financial-insights-model.js';
// A chave do Gemini existe somente no servidor. Nenhum campo do app recebe a chave.
export async function requestFinancialInsights(snapshot) {
  const payload=validateSnapshot(snapshot);
  if(!sb.functions?.invoke)throw new Error('O serviço de insights não está disponível nesta conexão.');
  const {data,error}=await sb.functions.invoke('forja-insights',{body:{action:'analyze',snapshot:payload}});
  if(error) {
    let code='';try{code=(await error.context?.json())?.code||'';}catch{/* Sem detalhes públicos do servidor. */}
    if(['NOT_FOUND','GEMINI_NOT_CONFIGURED'].includes(code)||error.context?.status===404)throw new Error('A integração com Gemini ainda precisa ser ativada no servidor. Seus cálculos e sugestões da Forja continuam disponíveis abaixo.');
    if(code==='RATE_LIMITED'||error.context?.status===429)throw new Error('O limite de consultas foi atingido. Aguarde um pouco para tentar novamente.');
    if(error.context?.status===401)throw new Error('Entre novamente na sua conta para consultar o Gemini.');
    throw new Error('Não foi possível consultar o Gemini agora. Tente novamente em instantes.');
  }
  if(!data||data.provider!=='gemini')throw new Error('O serviço não retornou uma análise do Gemini.');
  return {...validateInsightResponse(data.analysis,payload),model:typeof data.model==='string'?data.model.slice(0,80):'Gemini',generatedAt:data.generatedAt||new Date().toISOString()};
}
