'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),{staticPath}=require('./lib/static-path');
for(const url of ['/.git/config','/.env','/%2egit/config','/scripts/serve.js','/api/leads.js','/node_modules/x','/%00','/%GG','/x%5c.env'])assert.equal(staticPath(root,url),null,url);
for(const url of ['/','/assets/logo.png','/quiz/','/agradecimento/','/data/cartas.json'])assert.ok(staticPath(root,url),url);
const r=spawnSync(process.execPath,['scripts/build.js','--check'],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
const config=require('../vercel.json');for(const item of config.headers){assert.ok(!['/:path*','/(.*)'].includes(item.source));assert.ok(!/quiz|agradecimento/.test(item.source));}
// Verify the real HTTP servers too, including malformed paths and unchanged campaign routes.
const {spawn}=require('node:child_process');
(async()=>{
 for(const script of ['serve.js','serve-review.js']){
  const origin='http://127.0.0.1:4194';
  const server=spawn(process.execPath,['scripts/'+script],{cwd:root,env:{...process.env,PORT:'4194',CRISTAL_PREVIEW_SIMULATE:'1'},stdio:'ignore',windowsHide:true});
  try{
   let ready=false;for(let i=0;i<50;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,script);
   for(const url of ['/.git/config','/.env','/%2egit/config','/scripts/serve.js','/%GG'])assert.equal((await fetch(origin+url)).status,403,script+url);
   for(const url of ['/quiz/','/agradecimento/','/data/cartas.json'])assert.equal((await fetch(origin+url)).status,200,script+url);
  }finally{const closed=new Promise(resolve=>server.once('exit',resolve));server.kill();await closed;}
 }
 console.log('PASS: real local servers deny private/malformed paths, preserve campaign routes; reproducible metadata and scoped headers verified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
