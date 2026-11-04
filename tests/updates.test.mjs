import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../js/updates.js',import.meta.url),'utf8');
async function setup({controlled=true}={}) {
 const events={window:{},document:{},worker:{}};
 const listen=group=>(type,fn)=>{(events[group][type]||=[]).push(fn);};
 const nodes=new Map();let reloads=0,checks=0,options;
 const element=()=>({children:[],append(...items){this.children.push(...items);},setAttribute(){},addEventListener:listen('button')});
 events.button={};
 const document={readyState:'complete',visibilityState:'visible',addEventListener:listen('document'),getElementById:id=>nodes.get(id),createElement:element,body:{append(el){nodes.set(el.id,el);}}};
 const worker={controller:controlled?{}:null,addEventListener:listen('worker'),register:async(url,opts)=>{options=opts;return{update:async()=>{checks++;}};}};
 const context={navigator:{serviceWorker:worker},document,window:{location:{reload(){reloads++;}},addEventListener:listen('window')},setInterval(){},Date};
 vm.runInNewContext(source,context);await Promise.resolve();await Promise.resolve();
 return {document,nodes,get reloads(){return reloads;},get checks(){return checks;},get options(){return options;},async emit(group,type){for(const fn of events[group][type]||[])await fn();}};
}
test('troca de versão atualiza tela uma única vez',async()=>{
 const app=await setup();assert.equal(app.options.updateViaCache,'none');assert.equal(app.checks,1);
 await app.emit('worker','controllerchange');await app.emit('worker','controllerchange');assert.equal(app.reloads,1);
});
test('primeira instalação não provoca recarga desnecessária',async()=>{
 const app=await setup({controlled:false});await app.emit('worker','controllerchange');assert.equal(app.reloads,0);
});
test('formulário em edição é preservado e mostra botão de atualização',async()=>{
 const app=await setup();await app.emit('document','input');await app.emit('worker','controllerchange');await app.emit('worker','controllerchange');
 assert.equal(app.reloads,0);assert.equal(app.nodes.size,1);assert.equal(app.nodes.get('app-update').children[1].textContent,'Atualizar');
 await app.emit('button','click');assert.equal(app.reloads,1);
});
test('retorno da conexão verifica atualizações, foco repetido é limitado',async()=>{
 const app=await setup();await app.emit('window','focus');assert.equal(app.checks,1);
 app.document.visibilityState='hidden';await app.emit('window','online');assert.equal(app.checks,1);
 app.document.visibilityState='visible';await app.emit('window','online');assert.equal(app.checks,2);
});
