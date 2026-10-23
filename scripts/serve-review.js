'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||4187);
const {createHandler}=require('../api/leads'),{MemoryJournal}=require('./test-lead-api');
const simulate=process.env.CRISTAL_PREVIEW_SIMULATE==='1';
const handler=createHandler(simulate?{env:{CRISTAL_LOCAL_PREVIEW:'1'},journal:new MemoryJournal(),send:async()=>({ok:process.env.CRISTAL_PREVIEW_OUTCOME!=='failure',definiteRejection:true})}:{env:{...process.env,CRISTAL_LOCAL_PREVIEW:'1'}});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.xml':'application/xml','.txt':'text/plain','.mp4':'video/mp4'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 if(simulate&&url.pathname==='/lead-config.js'){
  res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(fs.readFileSync(path.join(root,'lead-config.js'),'utf8')+'\nwindow.CristalLeadConfig=Object.freeze({...window.CristalLeadConfig,debug:true});');return;
 }
 if(url.pathname==='/api/leads'){
  let body='';for await(const chunk of req){body+=chunk;if(body.length>12000){res.writeHead(413).end();return;}}
  req.body=body;res.status=function(status){this.statusCode=status;return this;};res.json=function(payload){this.setHeader('Content-Type','application/json');this.end(JSON.stringify(payload));};
  if(simulate)res.setHeader('X-Cristal-Preview','simulated-no-external-leads');return handler(req,res);
 }
 let target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403).end();return;}
 if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
 const exists=fs.existsSync(target)&&fs.statSync(target).isFile();if(!exists)target=path.join(root,'404.html');
 res.writeHead(exists?200:404,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Review: http://127.0.0.1:${port} | Leads: ${simulate?'SIMULATED; no external requests':'Apps Script adapter only; missing bindings fail closed'}`));
