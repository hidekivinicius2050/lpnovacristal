'use strict';
const {spawn,spawnSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=4193,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['scripts/serve.js'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
(async()=>{try{
 let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(origin);if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
 if(!ready)throw Error('UI test server did not start');
 const suites=['catalogue-ui','catalogue-experience-ui','site-refinements-ui','functions-ui','new-quota-ui','lead-recovery-ui','proposal-payments-ui'];
 const selected=process.env.CRISTAL_UI_SUITES?process.env.CRISTAL_UI_SUITES.split(','):suites;
 if(selected.some(name=>!suites.includes(name)))throw Error('Unknown UI suite');
 for(const name of selected){
  const r=spawnSync(process.execPath,['scripts/test-'+name+'.js'],{cwd:root,env:{...process.env,CRISTAL_TEST_URL:origin},stdio:'inherit',windowsHide:true});
  if(r.status!==0)throw Error('UI suite failed: '+name);
 }
}finally{server.kill();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
