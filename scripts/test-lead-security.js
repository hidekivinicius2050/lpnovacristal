'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createHandler,sheetSafe,RedisJournal}=require('../api/leads');
const {MemoryJournal}=require('./lib/memory-journal');
const env={VERCEL:'1',LEADS_APPS_SCRIPT_URL:'https://script.google.com/macros/s/TEST_ONLY/exec'};
const fixture=()=>({id:crypto.randomUUID(),nome:'Cliente Teste',telefone:'+5561999990000',interesse:'Carta de veículo',data:new Date().toISOString()});
async function call(handler,body,headers={origin:'https://www.cristalconsorcios.com.br','x-vercel-forwarded-for':'192.0.2.1'}){let answer;await handler({method:'POST',body,headers},{setHeader(){},status(code){this.code=code;return this;},json(body){answer={status:this.code,...body};}});return answer;}
(async()=>{
 for(const value of ['=IMPORTDATA("x")','+1+1','-1+1','@SUM(1)',' \t=1','\uFEFF=1'])assert.equal(sheetSafe(value),"'"+value);
 assert.equal(sheetSafe('João'),'João');assert.equal(sheetSafe({telefone:'+5561999990000'}).telefone,'+5561999990000');
 let sent=[],logs=[];const handler=createHandler({env,journal:new MemoryJournal(),log:c=>logs.push(c),send:async(u,p)=>{sent.push(p);return{ok:true};}});
 const attack={...fixture(),nome:'=1+1',utm_source:'@SUM(1)',form_nome:'+1',page_type:'-2',context:{type:'veiculo',summary:'=IMPORTDATA("x")',admin:'=1',id:'@id'}};
 assert.equal((await call(handler,attack)).saved,true);assert.equal(sent[0].nome,"'=1+1");assert.equal(sent[0].context.summary,"'=IMPORTDATA(\"x\")");assert.equal(sent[0].utm_source,"'@SUM(1)");assert.equal(sent[0].telefone,attack.telefone);assert.equal((await call(handler,attack)).duplicate,true);
 assert.equal((await call(handler,fixture(),{})).status,403);assert.equal((await call(handler,fixture(),{origin:'https://evil.test'})).status,403);
 assert.equal((await call(handler,{...fixture(),id:'-'.repeat(36)})).status,400);
 assert.equal((await call(handler,{...fixture(),data:'2020-01-01'})).code,'EXPIRED_LEAD');
 const missing=createHandler({env:{},journal:new MemoryJournal()});assert.equal((await call(missing,fixture())).code,'CONFIGURATION_REQUIRED');
 const wrong=createHandler({env:{LEADS_APPS_SCRIPT_URL:'https://evil.test/exec'},journal:new MemoryJournal()});assert.equal((await call(wrong,fixture())).code,'CONFIGURATION_REQUIRED');
 // Changing the untrusted proxy header cannot bypass the trusted Vercel IP limit.
 const limited=createHandler({env,journal:new MemoryJournal(),log:()=>{},send:async()=>({ok:true})});
 for(let i=0;i<30;i++)await call(limited,{...fixture(),telefone:'+55619999'+String(i).padStart(4,'0')},{origin:'https://www.cristalconsorcios.com.br','x-vercel-forwarded-for':'192.0.2.2','x-forwarded-for':'fake-'+i});
 assert.equal((await call(limited,fixture(),{origin:'https://www.cristalconsorcios.com.br','x-vercel-forwarded-for':'192.0.2.2','x-forwarded-for':'different'})).status,429);
 const phoneLimited=createHandler({env,journal:new MemoryJournal(),log:()=>{},send:async()=>({ok:true})});
 for(let i=0;i<5;i++)assert.equal((await call(phoneLimited,fixture())).saved,true);
 assert.equal((await call(phoneLimited,fixture())).status,429);
 const globalStore=new MemoryJournal();globalStore.hits.set('cristal:site:rate:global',300);let deliveries=0;
 const globalLimited=createHandler({env,journal:globalStore,log:()=>{},send:async()=>{deliveries++;return{ok:true};}});
 assert.equal((await call(globalLimited,fixture())).status,429);assert.equal(deliveries,0);
 const old={...fixture(),data:'2020-01-01'},oldStore=new MemoryJournal();
 const normalized=require('../api/leads').validate(old),fingerprint=crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
 await oldStore.set('cristal:site:lead:'+old.id,{hash:fingerprint,apps:'saved'});
 assert.equal((await call(createHandler({env,journal:oldStore}),old)).duplicate,true,'Saved retries must survive timestamp expiry');
 const failures=[],broken=createHandler({env,journal:{count:async()=>{throw Error('sensitive-data');}},log:c=>failures.push(c)});
 assert.equal((await call(broken,fixture())).status,503);assert.deepEqual(failures,['STORAGE_UNAVAILABLE']);
 const redis=new RedisJournal('https://example.test','not-a-token');let command;redis.command=async args=>{command=args;return 1;};await redis.count('test');assert.equal(command[0],'EVAL');assert.ok(command[1].includes("EXPIRE"));
 console.log('PASS: formula neutralization, validated destination, UUID, freshness, origin, trusted IP, phone limit and atomic TTL. No external requests.');
})().catch(e=>{console.error(e);process.exitCode=1;});
