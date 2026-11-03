'use strict';
// Approved HTML is authoritative. Only catalogue summaries and asset versions are generated.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const data=require('../catalogue-data').readPublished(JSON.parse(fs.readFileSync(path.join(root,'data/cartas.json'),'utf8')));
const money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const updates=new Map();
function plan(file,text){const old=fs.readFileSync(path.join(root,file),'utf8');if(old!==text)updates.set(file,text);}
for(const [file,type] of [['index.html',null],['carta-contemplada-imovel/index.html','imovel'],['carta-contemplada-veiculo/index.html','veiculo']]){
 const cards=data.letters.filter(c=>!type||c.type===type),values=cards.map(c=>c.credit);
 const summary=`${cards.length} cartas${type==='imovel'?' de imóvel':type==='veiculo'?' de veículo':''} no catálogo publicado, com créditos de ${money(Math.min(...values))} a ${money(Math.max(...values))}. Referência: ${new Date(data.updatedAt).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}. Disponibilidade e condições devem ser confirmadas com a equipe.`;
 const old=fs.readFileSync(path.join(root,file),'utf8');
 if(!old.includes('id="catalogue-static"'))throw Error('Catalogue summary missing: '+file);
 plan(file,old.replace(/(<p class="catalogue-static" id="catalogue-static">)[\s\S]*?(<\/p>)/,(_,a,b)=>a+summary+b));
}
const publicFiles=['index.html','404.html','simulador/index.html','carta-contemplada-imovel/index.html','carta-contemplada-veiculo/index.html','politica-de-privacidade/index.html','termos-de-uso/index.html','conteudo/index.html',...require('../articles-data').map(a=>'conteudo/'+a.slug+'/index.html')];
for(const file of publicFiles){
 const old=updates.get(file)||fs.readFileSync(path.join(root,file),'utf8');
 const html=old.replace(/((?:src|href)=")([^"?#]+\.(?:js|css))(?:\?v=[^"#]*)?("\s*[^>]*>)/g,(match,prefix,url,end)=>{
  if(/^(?:https?:)?\/\//.test(url))return match;
  const target=path.resolve(root,url.startsWith('/')?'.'+url:path.join(path.dirname(file),url));
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target))throw Error('Missing local asset: '+url);
  const hash=crypto.createHash('sha256').update(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')).digest('hex').slice(0,12);
  return prefix+url+'?v='+hash+end;
 });
 plan(file,html);
}
// Only catalogue routes use the inventory publication date; editorial dates remain factual.
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
plan('sitemap.xml',sitemap.replace(/(<url><loc>https:\/\/www\.cristalconsorcios\.com\.br\/(?:carta-contemplada-(?:imovel|veiculo)\/)?<\/loc><lastmod>)[^<]+/g,(_,prefix)=>prefix+data.updatedAt.slice(0,10)));
if(process.argv.includes('--check')){if(updates.size){console.error('Outdated metadata/assets: '+[...updates.keys()].join(', '));process.exitCode=1;}}
else{
 // Stage all results before replacing any approved file. No legacy template is run.
 const staged=[];try{for(const [file,text] of updates){const target=path.join(root,file),temp=target+'.build-tmp';fs.writeFileSync(temp,text);staged.push([target,temp]);}for(const [target,temp] of staged)fs.renameSync(temp,target);}finally{for(const [,temp] of staged)if(fs.existsSync(temp))fs.unlinkSync(temp);}
 console.log('Build: '+updates.size+' metadata/asset references updated; campaign files untouched.');
 // Vercel's static builder publishes this allowlisted directory; API functions
 // remain in the repository's api/ directory and are deployed separately.
 const output=path.resolve(root,'public');
 if(path.dirname(output)!==root||path.basename(output)!=='public')throw Error('Unsafe output path');
 if(fs.existsSync(output)&&fs.lstatSync(output).isSymbolicLink())throw Error('Output cannot be a symbolic link');
 fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output);
 for(const folder of ['assets','quiz','agradecimento','propostas','funcoes','simulador','carta-contemplada-imovel','carta-contemplada-veiculo','conteudo','data','politica-de-privacidade','termos-de-uso'])fs.cpSync(path.join(root,folder),path.join(output,folder),{recursive:true});
 for(const name of fs.readdirSync(root)){if(/\.(?:html|js|css|xml|txt)$/.test(name)&&fs.statSync(path.join(root,name)).isFile())fs.copyFileSync(path.join(root,name),path.join(output,name));}
 console.log('Static output: public/; internal configuration and tooling excluded.');
}
