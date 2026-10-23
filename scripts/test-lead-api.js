'use strict';
const assert=require('node:assert/strict');
const {createHandler,acknowledged}=require('../api/leads');
class MemoryJournal {
 constructor(){this.items=new Map();this.hits=new Map();}
 async get(key){return this.items.has(key)?JSON.parse(this.items.get(key)):null;}
 async set(key,value,ttl,nx){if(nx&&this.items.has(key))return null;this.items.set(key,JSON.stringify(value));return 'OK';}
 async del(key){this.items.delete(key);}
 async count(key){const n=(this.hits.get(key)||0)+1;this.hits.set(key,n);return n;}
}
const fixture=()=>({id:crypto.randomUUID(),nome:'Cliente de Teste',telefone:'+5561999990000',interesse:'Carta de imóvel',data:'2026-10-23T15:00:00-03:00',pagina:'https://www.cristalconsorcios.com.br/?nome=nao-expor',landing_page:'https://www.cristalconsorcios.com.br/',referrer:'https://www.google.com/search?q=privado',utm_source:'google',utm_campaign:'teste',utm_content:'conteudo-correto',gclid:'TEST-CLICK-ID',page_type:'home',form_nome:'home:cartas-modal',context:{id:'c-test',type:'imovel',admin:'Caixa',credit:'R$ 300.000,00',creditValue:300000,term:'153 meses',installment:'R$ 1.985,88'}});
async function call(handler,body,method='POST',origin='https://www.cristalconsorcios.com.br'){
 let result;const req={method,body,headers:{origin,'x-forwarded-for':'127.0.0.1'}};
 const res={setHeader(){},status(code){this.code=code;return this;},json(body){result={code:this.code,body};return result;}};
 await handler(req,res);return result;
}
async function run(){
 const journal=new MemoryJournal(),sent=[];
 const handler=createHandler({journal,send:async(url,payload)=>{sent.push({url,payload});return {ok:true};}});
 const lead=fixture();let r=await call(handler,lead);assert.equal(r.body.saved,true);assert.equal(sent.length,1);
 assert.ok(sent[0].url.startsWith('https://script.google.com/'));assert.equal(sent[0].payload.telefone,'+5561999990000');assert.equal(sent[0].payload.context.admin,'Caixa');assert.equal(sent[0].payload.utm_content,'conteudo-correto');assert.equal(sent[0].payload.gclid,'TEST-CLICK-ID');
 assert.equal(sent[0].payload.pagina,'https://www.cristalconsorcios.com.br/');assert.equal(sent[0].payload.referrer,'https://www.google.com/search');
 const scenario=fixture();scenario.context={type:'veiculo',summary:'Crédito R$ 100.000; 80 meses; parcela estimada R$ 1.700.'};
 assert.equal((await call(handler,scenario)).body.saved,true);assert.equal(sent[1].payload.context.summary,scenario.context.summary);
 r=await call(handler,lead);assert.equal(r.body.duplicate,true);assert.equal(sent.length,2);
 assert.ok(sent.every(x=>x.url.startsWith('https://script.google.com/')),'Main-site leads must never be sent to the Facebook CRM');
 r=await call(handler,{...lead,telefone:'+5561888880000'});assert.equal(r.body.code,'REQUEST_CONFLICT');
 assert.equal((await call(handler,{...fixture(),telefone:'123'})).code,400);
 assert.equal((await call(handler,fixture(),'GET')).code,405);
 assert.equal((await call(handler,fixture(),'POST','https://example.org')).code,403);
 assert.equal((await call(createHandler({env:{}}),fixture())).body.code,'CONFIGURATION_REQUIRED');
 const partial=new MemoryJournal(),calls=[];let rejectApps=true;
 const retry=createHandler({journal:partial,send:async(url)=>{calls.push(url);return url.includes('script.google.com')&&rejectApps?{ok:false,definiteRejection:true}:{ok:true};}});
 const second=fixture();assert.equal((await call(retry,second)).body.saved,false);rejectApps=false;assert.equal((await call(retry,second)).body.saved,true);assert.ok(calls.every(u=>u.startsWith('https://script.google.com/')));assert.equal(calls.length,2);
 let attempts=0;const ambiguous=createHandler({journal:new MemoryJournal(),send:async()=>{attempts++;throw Error('timeout');}}),third=fixture();
 assert.equal((await call(ambiguous,third)).body.code,'REVIEW_REQUIRED');assert.equal((await call(ambiguous,third)).body.code,'REVIEW_REQUIRED');assert.equal(attempts,1);
 const concurrent=createHandler({journal:new MemoryJournal(),send:async()=>{await new Promise(r=>setTimeout(r,15));return {ok:true};}}),fourth=fixture();
 const simultaneous=await Promise.all([call(concurrent,fourth),call(concurrent,fourth)]);assert.equal(simultaneous.filter(r=>r.body.saved).length,1);assert.equal(simultaneous.filter(r=>r.body.code==='SUBMISSION_IN_PROGRESS').length,1);
 assert.equal(acknowledged({ok:true},'{"success":false}'),false);assert.equal(acknowledged({ok:true},'<html>login</html>'),false);assert.equal(acknowledged({ok:true},'{"success":true}'),true);assert.equal(acknowledged({ok:true},'ok'),true);
 console.log('PASS: validation, attribution/context, Apps Script only (no Facebook CRM), retry after rejection, duplicate/concurrent protection, timeout quarantine and fail-closed configuration. No external leads sent.');
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={MemoryJournal};
