'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const origin=process.env.CRISTAL_TEST_URL||'http://127.0.0.1:4175',out=path.resolve(__dirname,'../../../output/proposal-payments');
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL==='chromium'?undefined:(process.env.PLAYWRIGHT_CHANNEL||'chrome')});try{
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1400,height:1000}}),errors=[],writes=[];let downloads=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});page.on('download',()=>downloads++);
 await page.goto(origin+'/propostas/');await page.locator('#client').fill('Giselle');await page.locator('#asset').selectOption('veiculo');await page.locator('#model').selectOption('resumida');
 const card=page.locator('#cards .card').first();
 // Reproduce Lorena's already-computed flow in the default mode.
 await page.locator('#client').fill('Lorena Barbosa');await page.locator('#asset').selectOption('imovel');await page.locator('#date').fill('2026-11-04');
 for(const [field,value] of Object.entries({administrator:'Santander',credit:'225.500',entry:'110000',months:'187',payment:'1.186'}))await card.locator(`[data-field="${field}"]`).fill(value);
 await card.locator('.add-payment').click();
 await card.locator('.payment-group').nth(1).locator('[data-field=months]').fill('2');await card.locator('.payment-group').nth(1).locator('[data-field=payment]').fill('655');
 assert.equal(await card.locator('[data-field=paymentMode]').inputValue(),'sequential');
 assert.match(await page.locator('#preview-stages').innerText(),/1º ao 187º mês.*1.186,00.*188º ao 189º mês.*655,00/s);
 for(const model of ['resumida','completa']){await page.locator('#model').selectOption(model);if(model==='completa')await page.locator('#compare').uncheck();const pending=page.waitForEvent('download');await page.locator('#generate').click();await(await pending).saveAs(path.join(out,'lorena-etapas-'+model+'.pdf'));}
 assert.match(await page.locator('#preview-term').innerText(),/189 meses/);assert.match(await page.locator('#preview-debt').innerText(),/223.092,00/);
 await page.screenshot({path:path.join(out,'lorena-etapas.png'),fullPage:true});
 // Financing bank changes must reach the PDF, including edited annual rates.
 assert.equal(await page.locator('#bradesco-rate').inputValue(),'15');assert.equal(await page.locator('#santander-rate').count(),0);
 await page.evaluate(()=>{const original=window.makeProposalPDF;window.makeProposalPDF=(data,logo)=>{window.lastProposalData=data;return original(data,logo);};});
 await page.locator('#compare').check();
 let bankDownload=page.waitForEvent('download');await page.locator('#generate').click();await(await bankDownload).saveAs(path.join(out,'comparativo-bradesco.pdf'));
 let bankData=await page.evaluate(()=>({banks:window.lastProposalData.banks,config:window.lastProposalData.config}));
 assert.deepEqual(bankData.banks.map(b=>b.name),['Itaú','Bradesco']);assert.equal(bankData.config['bradesco-rate'],15);assert.equal(bankData.banks[1].rateLabel,'15% a.a.');assert.equal(bankData.banks[1].fee,0);
 await page.locator('#assumptions').evaluate(el=>el.open=true);await page.locator('#bradesco-rate').fill('14');
 bankDownload=page.waitForEvent('download');await page.locator('#generate').click();await(await bankDownload).saveAs(path.join(out,'comparativo-bradesco-editado.pdf'));
 assert.equal(await page.evaluate(()=>window.lastProposalData.banks[1].rateLabel),'14% a.a.');assert.equal(await page.evaluate(()=>window.lastProposalData.edited),true);
 await page.locator('#bradesco-rate').fill('15');await page.locator('#compare').uncheck();
 await card.locator('.payment-group').nth(1).locator('.remove-payment').click();
 await page.locator('#client').fill('Giselle');await page.locator('#model').selectOption('resumida');await card.locator('[data-field=paymentMode]').selectOption('simultaneous');
 for(const [field,value] of Object.entries({administrator:'Caixa',credit:'100.878,38',entry:'42.000,00',months:'44',payment:'2.313,75'}))await card.locator(`[data-field="${field}"]`).fill(value);
 await card.locator('.add-payment').click();const groups=card.locator('.payment-group');await groups.nth(1).locator('[data-field=months]').fill('30');await groups.nth(1).locator('[data-field=payment]').fill('700,00');
 assert.equal(await page.locator('#cards [data-field=credit]').count(),1);assert.equal(await page.locator('#cards [data-field=entry]').count(),1);
 assert.match(await page.locator('#preview-credit').innerText(),/100.878,38/);assert.match(await page.locator('#preview-entry').innerText(),/42.000,00/);
 assert.match(await page.locator('#preview-stages').innerText(),/30º mês.*3.013,75/s);assert.match(await page.locator('#preview-stages').innerText(),/31º ao 44º mês.*2.313,75/s);
 for(const [model,file] of [['resumida','resumida.pdf'],['completa','completa.pdf']]){await page.locator('#model').selectOption(model);if(model==='completa')await page.locator('#compare').uncheck();const pending=page.waitForEvent('download');await page.locator('#generate').click();const d=await pending;await d.saveAs(path.join(out,file));}
 for(const [months,payment] of [['20','50,25'],['10','49,75']]){await card.locator('.add-payment').click();const g=groups.last();await g.locator('[data-field=months]').fill(months);await g.locator('[data-field=payment]').fill(payment);}
 assert.equal(await groups.count(),4);assert(await card.locator('.add-payment').isHidden());assert.equal(await page.locator('#preview-stages .stage').count(),4);
 await page.locator('#multiple').click();assert.equal(await page.locator('#multiple').isChecked(),false);assert.equal(await groups.count(),4);
 const pending=page.waitForEvent('download');await page.locator('#generate').click();await (await pending).saveAs(path.join(out,'quatro-grupos.pdf'));
 await groups.last().locator('[data-field=payment]').fill('0');await page.locator('#generate').click();await page.waitForFunction(()=>document.querySelector('#status').classList.contains('error'));assert.equal(downloads,7);
 await groups.last().locator('.remove-payment').click();assert.equal(await groups.count(),3);assert.equal(await page.locator('#status').innerText(),'');assert(await card.locator('.add-payment').isVisible());assert.equal(await card.locator('[data-field=credit]').inputValue(),'100.878,38');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
 await page.setViewportSize({width:1400,height:1000});await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 await page.goto(origin+'/propostas/');await page.locator('#example').click();assert.equal(await page.locator('#cards .card').count(),2);assert.match(await page.locator('#preview-credit').innerText(),/230.000,00/);assert.match(await page.locator('#preview-stages').innerText(),/1.900,00/);
 await page.locator('#cards .card').last().locator('.remove').click();assert.equal(await page.locator('#cards .card').count(),1);assert.match(await page.locator('#preview-credit').innerText(),/150.000,00/);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS: total credit/entry once, 2–4 simultaneous groups, complete/resumido PDFs, validation, removal preserving totals, mobile and legacy separate-card flow. No data sent. PDFs: '+out);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
