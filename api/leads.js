'use strict';
const crypto=require('node:crypto');
const APPS='https://script.google.com/macros/s/AKfycbzk_wG9H6G0YHeQgFPFLvS-emVFiAL-Z8WCl4xPiSulF97123r5aFhop85ky90ktjAY/exec';
const TTL=7*86400;
class RedisJournal {
  constructor(url,token){this.url=url.replace(/\/$/,'');this.token=token;}
  async command(args){const r=await fetch(this.url,{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('JOURNAL_UNAVAILABLE');const j=await r.json();if(j.error)throw Error('JOURNAL_UNAVAILABLE');return j.result;}
  async get(key){const value=await this.command(['GET',key]);return value?JSON.parse(value):null;}
  async set(key,value,ttl=TTL,nx=false){return this.command(['SET',key,JSON.stringify(value),'EX',ttl,...(nx?['NX']:[])]);}
  async del(key){return this.command(['DEL',key]);}
  async count(key){const n=await this.command(['INCR',key]);if(n===1)await this.command(['EXPIRE',key,600]);return n;}
}
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function cleanString(value,max=500){return typeof value==='string'?value.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max):'';}
function cleanURL(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.origin+u.pathname:'';}catch{return '';}}
function validate(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('INVALID_LEAD');
  const id=cleanString(raw.id,40),name=cleanString(raw.nome,100).replace(/\s+/g,' '),phone=cleanString(raw.telefone,20);
  const interest=cleanString(raw.interesse,40);
  if(!/^[0-9a-f-]{36}$/i.test(id)||name.length<2||!/^\+55[1-9]\d{9,10}$/.test(phone)||!['Carta de imóvel','Carta de veículo','Ainda estou avaliando'].includes(interest))throw Error('INVALID_LEAD');
  const data=cleanString(raw.data,40);if(!Number.isFinite(Date.parse(data)))throw Error('INVALID_LEAD');
  const lead={id,nome:name,telefone:phone,interesse:interest,data,pagina:cleanURL(raw.pagina),landing_page:cleanURL(raw.landing_page),referrer:cleanURL(raw.referrer),origem:'site-cristal',page_type:cleanString(raw.page_type,40),form_nome:cleanString(raw.form_nome,100)};
  for(const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','wbraid','gbraid'])lead[key]=cleanString(raw[key]);
  const c=raw.context;
  lead.context=c&&['imovel','veiculo'].includes(c.type)?{type:c.type,id:cleanString(c.id,100),admin:cleanString(c.admin,80),credit:cleanString(c.credit,40),creditValue:Number.isFinite(c.creditValue)?c.creditValue:null,term:cleanString(String(c.term||''),80),installment:cleanString(c.installment,80),summary:cleanString(c.summary,1800)}:null;
  return lead;
}
function acknowledged(response,text){
  if(!response.ok)return false;
  if(/^(ok|success|sucesso)$/i.test(text.trim()))return true;
  try{const x=JSON.parse(text);if(x.success===false||x.ok===false||x.error||['error','failed','erro'].includes(String(x.status).toLowerCase()))return false;return x.success===true||x.ok===true||['success','ok','sucesso','created'].includes(String(x.status).toLowerCase())||Boolean(x.id||x.lead_id||x.data?.id);}catch{return false;}
}
async function post(url,payload){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':url.includes('script.google.com')?'text/plain;charset=utf-8':'application/json','Idempotency-Key':payload.id},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000),redirect:'follow'});
  return {ok:acknowledged(response,await response.text()),definiteRejection:response.status>=400&&response.status<500};
}
function createHandler({env=process.env,journal=null,send=post}={}){
  return async function handler(req,res){
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const reply=(status,body)=>res.status(status).json(body);
    if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{saved:false,code:'METHOD_NOT_ALLOWED'});}
    const origin=req.headers.origin;
    const allowed=['https://www.cristalconsorcios.com.br',env.VERCEL_URL?'https://'+env.VERCEL_URL:''];
    if(origin&&!allowed.includes(origin)&&!(env.CRISTAL_LOCAL_PREVIEW==='1'&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)))return reply(403,{saved:false,code:'ORIGIN_NOT_ALLOWED'});
    let lead;
    try{const raw=typeof req.body==='string'?JSON.parse(req.body):req.body;if(Buffer.byteLength(JSON.stringify(raw||{}))>12000)return reply(413,{saved:false,code:'PAYLOAD_TOO_LARGE'});lead=validate(raw);}catch{return reply(400,{saved:false,code:'INVALID_LEAD'});}
    const store=journal||(env.KV_REST_API_URL&&env.KV_REST_API_TOKEN?new RedisJournal(env.KV_REST_API_URL,env.KV_REST_API_TOKEN):null);
    if(!store)return reply(503,{saved:false,code:'CONFIGURATION_REQUIRED'});
    const key='cristal:site:lead:'+lead.id,lock=key+':lock';let acquired=false;
    try{
      const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
      if(await store.count('cristal:site:rate:'+hash(ip+new Date().toISOString().slice(0,10)))>30)return reply(429,{saved:false,code:'RATE_LIMITED'});
      acquired=Boolean(await store.set(lock,true,45,true));if(!acquired)return reply(409,{saved:false,code:'SUBMISSION_IN_PROGRESS'});
      const fingerprint=hash(JSON.stringify(lead));let state=await store.get(key);
      if(state&&state.hash!==fingerprint)return reply(409,{saved:false,code:'REQUEST_CONFLICT'});
      if(!state)state={hash:fingerprint,apps:'pending'};
      if(state.apps==='saved')return reply(200,{saved:true,id:lead.id,duplicate:true});
      if(['sending','unknown'].includes(state.apps))return reply(409,{saved:false,code:'REVIEW_REQUIRED'});
      // The Facebook CRM belongs exclusively to the protected quiz flow.
      for(const [target,url,payload] of [['apps',APPS,lead]]){
        if(state[target]==='saved')continue;
        // Persist before contacting the provider. An ambiguous result is never blindly retried.
        state[target]='sending';await store.set(key,state);
        let result;
        try{result=await send(url,payload);}catch{state[target]='unknown';await store.set(key,state);return reply(502,{saved:false,code:'REVIEW_REQUIRED'});}
        if(!result.ok){state[target]=result.definiteRejection?'pending':'unknown';await store.set(key,state);return reply(502,{saved:false,code:result.definiteRejection?'UPSTREAM_REJECTED':'REVIEW_REQUIRED'});}
        state[target]='saved';await store.set(key,state);
      }
      return reply(200,{saved:true,id:lead.id});
    }catch{return reply(503,{saved:false,code:'STORAGE_UNAVAILABLE'});}
    finally{if(acquired)try{await store.del(lock);}catch{}}
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
module.exports.validate=validate;
module.exports.acknowledged=acknowledged;
