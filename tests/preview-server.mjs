// Teste visual isolado: não acessa a conta nem o banco de dados real.
// Executar: node tests/preview-server.mjs — apenas em 127.0.0.1:5174.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stub=`export const sb = {
 auth: { onAuthStateChange(callback) { setTimeout(()=>callback('INITIAL_SESSION',{user:{id:'visual-test'}}),0); }, signOut:async()=>({error:null}) },
 from: () => ({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})}),upsert:async()=>({error:null})})
};`;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:5174');
 const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
 const target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{
  let body;
  if(relative==='js/supabase-client.js')body=stub;
  else if(relative==='service-worker.js')body='// Sem cache no teste visual.';
  else { body=await fs.readFile(target); if(relative==='index.html')body=body.toString().replace(/<script src="https:\/\/cdn[^>]+><\/script>/,''); }
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'text/plain','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(5174,'127.0.0.1',()=>console.log('Prévia de teste isolada: http://127.0.0.1:5174'));
