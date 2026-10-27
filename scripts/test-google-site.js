'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ORIGIN='https://www.cristalconsorcios.com.br';
// Baseline immediately before the catalogue UI/internal-tools release. Protect stock,
// tracking and financial engines while permitting the requested navigation/CSS fixes.
const baseline='0e898ee';
const protectedPaths=['quiz','agradecimento','propostas/engine.js','propostas/pdf.js','propostas/vendor','data/cartas.json','catalogue-data.js','articles-data.js','api','lead-capture.js','lead-config.js','tracking-consent.js','simulador/simulation-engine.js','simulador/leverage-engine.js','simulador/simulador.js','simulador/leverage-simulator.js','simulador/guided-simulator.js','simulador/simulador.css'];
const paths=cp.execFileSync('git',['ls-tree','-r','--name-only',baseline,'--',...protectedPaths],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const p of paths){const prior=cp.execFileSync('git',['show',baseline+':'+p],{cwd:root,maxBuffer:20*1024*1024});const now=fs.readFileSync(path.join(root,p));const canonical=x=>x.includes(0)?x:Buffer.from(x.toString('utf8').replace(/\r\n/g,'\n'));const digest=x=>crypto.createHash('sha256').update(canonical(x)).digest('hex');assert.equal(digest(now),digest(prior),'Protected file changed: '+p);}
const urls=['/','/carta-contemplada-imovel/','/carta-contemplada-veiculo/','/conteudo/','/simulador/','/politica-de-privacidade/','/termos-de-uso/',...require('../articles-data').map(a=>'/conteudo/'+a.slug+'/')];
for(const route of urls){
 const html=read(route==='/'?'index.html':route.slice(1)+'index.html');
 assert.ok(html.includes(`rel="canonical" href="${ORIGIN}${route}"`),route+' canonical');assert.ok(!html.includes('lpnovacristal.vercel.app'),route+' old origin');
 assert.ok(html.includes('/lead-capture.js'),route+' popup');assert.ok(html.includes('/tracking-consent.js'),route+' consent');assert.ok(!html.includes('id="cookie-banner"'),route+' legacy cookie notice removed');assert.ok(!/href="https:\/\/wa\.me/.test(html),route+' direct WA');
 const graphs=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];assert.equal(graphs.length,1,route+' graph count');const graph=JSON.parse(graphs[0][1])['@graph'];assert.ok(graph.some(n=>n['@type']==='WebSite'));
 assert.ok(!JSON.stringify(graph).includes('AggregateRating'));
 const nav=html.match(/<nav class="main-nav"[\s\S]*?<\/nav>/)?.[0]||'';assert.ok(nav.includes('href="/simulador/">Simulador</a>'),route+' simulator navigation');assert.ok(nav.includes('/carta-contemplada-imovel/#cartas'));assert.ok(nav.includes('/carta-contemplada-veiculo/#cartas'));assert.ok(!/href="\/(funcoes|propostas)/.test(nav),route+' internal tools not in public navigation');
 if(route.startsWith('/carta-contemplada-')){const asset=route.includes('imovel')?'imovel':'veiculo';assert.ok(html.includes(`data-catalogue-type="${asset}"`));assert.ok(graph.some(n=>n['@type']==='Service'));}
 if(route==='/'||route.startsWith('/carta-contemplada-')){
  const faq=graph.find(n=>n['@type']==='FAQPage');assert.equal(faq.mainEntity.length,7);for(const q of faq.mainEntity){assert.ok(html.includes(q.name));assert.ok(html.includes(q.acceptedAnswer.text));}
 }
}
const sitemap=read('sitemap.xml');assert.equal((sitemap.match(/<url>/g)||[]).length,17);assert.ok(!/\/(quiz|agradecimento|propostas|funcoes)\//.test(sitemap));
for(const route of ['funcoes','funcoes/entrada','funcoes/cota-nova','propostas']){const html=read(route+'/index.html');assert.ok(/<meta name="robots" content="noindex, nofollow, noarchive">/.test(html),route+' noindex');assert.ok(!html.includes('tracking-consent.js'),route+' no public tracking');}
assert.ok(read('robots.txt').includes('Disallow: /funcoes'));
const capture=read('lead-capture.js');assert.ok(capture.includes("(quiz|agradecimento|propostas)"));assert.ok(!/lead_nome|lead_whatsapp/.test(capture));assert.ok(capture.includes('result.saved!==true'));assert.ok(capture.includes('location.assign('));assert.ok(!capture.includes('window.open('));
const configContext={window:{}};require('node:vm').runInNewContext(read('lead-config.js'),configContext);const config=configContext.window.CristalLeadConfig;
assert.equal(config.gtmEnabled,true);assert.equal(config.gtmContainerId,'GTM-K3R4J649');
assert.equal(config.events.view,'open_form');assert.equal(config.events.start,'form_start');assert.equal(config.events.saved,'form_submit');assert.equal(config.formParameter,'form_name');
const routing=JSON.parse(read('vercel.json'));
assert.deepEqual(routing.redirects,[{source:'/:path*',has:[{type:'host',value:'lpnovacristal\\.vercel\\.app'}],destination:ORIGIN+'/:path*',permanent:true}]);
assert.equal(routing.functions['api/leads.js'].maxDuration,30);
const sourceHost=new RegExp('^(?:'+routing.redirects[0].has[0].value+')$');
assert.ok(sourceHost.test('lpnovacristal.vercel.app'));
for(const host of ['www.cristalconsorcios.com.br','cristalconsorcios.com.br','cristalconsorcios.com','www.cristalconsorcios.com','lpnovacristal-rlde27yzu-vinicius-projects-da14f17f.vercel.app','lpnovacristal-git-review-vinicius-projects-da14f17f.vercel.app','other.vercel.app','lpnovacristalXvercelXapp'])assert.ok(!sourceHost.test(host),'Unexpected redirect host: '+host);
console.log(`PASS: ${paths.length} protected files match base (text CRLF normalized, binary SHA-256 exact); ${urls.length} public pages, metadata, FAQ/schema, filtered routes, safe tracking and permanent production-alias redirect without official-domain/preview loops or .com migration.`);
