"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.CRISTAL_TEST_URL||'http://127.0.0.1:4175',out=path.resolve(__dirname,'../../../output'),pdfDir=path.join(out,'pdf');
(async()=>{fs.mkdirSync(pdfDir,{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});const errors=[],bad=[],sent=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)bad.push(r.url());});p.on('request',r=>{if(r.method()!=='GET')sent.push(r.url());});
 await p.goto(origin+'/funcoes/');await p.getByRole('link',{name:/Proposta de cota nova/}).click();
 for(const route of ['/funcoes/cota-nova','/funcoes/cota-nova/']){
  await p.goto(origin+route);assert((await p.locator('meta[name=robots]').getAttribute('content')).includes('noindex'));
  assert.equal(await p.locator('#new-premium,#new-bid-enabled,#new-scenarios').count(),0);
  await p.locator('#new-generate').click();assert((await p.locator('#new-status').innerText()).includes('nome do cliente'));
  await p.locator('#new-example').click();assert((await p.locator('#new-preview-reduced-value').innerText()).includes('660,30'));assert((await p.locator('#new-preview-full').innerText()).includes('1.417,27'));
  let wait=p.waitForEvent('download');await p.locator('#new-generate').click();let d=await wait;await d.saveAs(path.join(pdfDir,'Modelo_Cota_Nova_Contratacao_Parcela_Reduzida.pdf'));assert(d.suggestedFilename().includes('Vitor'));
  await p.locator('#new-reduced-enabled').uncheck();assert(await p.locator('#new-reduced-settings').isHidden());assert(await p.locator('#new-preview-reduced').isHidden());
  await p.locator('#new-payment-max').fill('');assert.equal((await p.locator('#new-preview-full').innerText()).includes(' a '),false);
  wait=p.waitForEvent('download');await p.locator('#new-generate').click();d=await wait;await d.saveAs(path.join(pdfDir,'Modelo_Cota_Nova_Contratacao_Parcela_Normal.pdf'));
 }
 await p.locator('#new-payment-max').fill('1');assert((await p.locator('#new-status').innerText()).includes('menor'));
 await p.locator('#new-example').click();await p.locator('#new-client').fill('João Luís de Alcântara e Maria Júlia de São Gonçalo');await p.locator('#new-admin').fill('Administradora com nome extenso para revisão da proposta');await p.locator('#new-plan').fill('W'.repeat(120));await p.locator('#new-condition').fill('W'.repeat(180));
 let wait=p.waitForEvent('download');await p.locator('#new-generate').click();await(await wait).saveAs(path.join(pdfDir,'qa-cota-nova-contratacao-nomes-longos.pdf'));
 await p.locator('#new-example').click();for(const width of [1440,390]){await p.setViewportSize({width,height:1100});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(out,`cota-nova-contratacao-${width}.png`),fullPage:true});}
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(sent,[]);console.log('PASS: normal/reduced proposals, single amount/range, direct quoted values, four downloads, both URLs, accents/long text, validation, mobile and no transmitted inputs.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
