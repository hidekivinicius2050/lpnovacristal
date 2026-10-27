'use strict';
// Interaction regressions for the visual polish. Requests never create real leads.
const {chromium}=require('playwright');const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const origin=process.env.CRISTAL_TEST_URL||'http://127.0.0.1:4175';const root=path.resolve(__dirname,'..');const out=path.resolve(root,'../../output/playwright');
const stock=JSON.parse(fs.readFileSync(path.join(root,'data/cartas.json'),'utf8')).letters;let checks=0;
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let pending,requests=0;await page.route('**/api/leads',route=>{requests++;pending=route;});
 await page.goto(origin+'/?qa=refinements#cartas');await page.waitForSelector('.letter-compare');
 await page.locator('[data-category=veiculo]').click();await page.locator('#installment-filter').fill('2.000,00');await page.locator('#sort-filter').selectOption('installment-asc');
 await page.waitForFunction(()=>document.querySelectorAll('.filter-chip').length===3);assert.match(await page.locator('.active-filter-chips').innerText(),/Veículo/);checks++;
 await page.getByRole('button',{name:/Remover filtro Parcela até/}).click();await page.waitForFunction(()=>document.querySelector('#installment-filter').value==='');assert.equal(await page.locator('#sort-filter').inputValue(),'installment-asc');
 assert.equal(Number((await page.locator('#catalogue-result-count').innerText()).split(' ')[0]),stock.filter(l=>l.type==='veiculo').length);checks++;
 assert.equal(await page.locator('.letter-details .card-installment').count(),6);assert.equal(await page.locator('.letter-details').first().getByText('Administradora',{exact:true}).count(),0);checks++;
 await page.locator('#clear-filters').click();await page.waitForFunction(()=>document.querySelectorAll('.filter-chip').length===1);await page.locator('[data-category=todos]').click();await page.waitForFunction(()=>document.querySelector('.active-filter-chips').hidden);checks++;
 await page.setViewportSize({width:390,height:844});for(let i=0;i<3;i++)await page.locator('.letter-compare').nth(i).click();await page.locator('#compare-open').click();
 assert.equal(await page.locator('.comparison-option').count(),3);assert.match(await page.locator('[data-compare-page]').innerText(),/1 e 2/);
 const first=await page.locator('.comparison-option').nth(0).boundingBox(),second=await page.locator('.comparison-option').nth(1).boundingBox();assert(first.x>=0&&second.x+second.width<=390);checks++;
 await page.setViewportSize({width:1440,height:1000});await page.locator('.comparison-scroll').waitFor({state:'visible'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!document.querySelector('[data-compare-next]').disabled);checks++;
  await page.locator('[data-compare-next]').click();await page.waitForFunction(()=>document.querySelector('[data-compare-page]').textContent.includes('2 e 3'));assert(await page.locator('[data-compare-next]').isDisabled());checks++;
 await page.locator('[data-compare-prev]').click();await page.waitForFunction(()=>document.querySelector('[data-compare-page]').textContent.includes('1 e 2'));checks++;
 await page.screenshot({path:path.join(out,'refined-comparison-mobile.png')});
 await page.locator('.comparison-mobile [data-contact-id]').first().click();assert(await page.locator('#atendimento').isVisible());
 await page.locator('#atendimento [type=submit]').click();assert.equal(requests,0);checks++;
 await page.locator('#popup-name').fill('Teste visual Cristal');await page.locator('#popup-phone').fill('61999998888');await page.locator('#atendimento [type=submit]').click();await page.waitForFunction(()=>document.querySelector('#atendimento form').getAttribute('aria-busy')==='true');
 assert.equal(await page.locator('#atendimento .form-feedback').getAttribute('data-state'),'loading');assert.equal(requests,1);checks++;
 await pending.fulfill({status:503,json:{saved:false}});await page.waitForFunction(()=>document.querySelector('#atendimento .form-feedback').dataset.state==='error');assert(page.url().startsWith(origin));assert.equal(await page.locator('#popup-name').inputValue(),'Teste visual Cristal');checks++;
 await page.locator('.lead-close').click();await page.locator('.compare-close').click();await page.locator('.compare-clear').click();
 for(const width of [320,390,700,1024,1440]){await page.setViewportSize({width,height:950});await page.locator('.filter-panel').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks++;}
 await page.setViewportSize({width:390,height:844});await page.locator('.testimonial-grid').scrollIntoViewIfNeeded();await page.locator('.review-controls button').last().click();await page.waitForFunction(()=>document.querySelector('.review-controls span').textContent.startsWith('2 de'));checks++;
 await page.locator('.review-controls button').first().click();await page.waitForFunction(()=>document.querySelector('.review-controls span').textContent.startsWith('1 de'));checks++;
 await page.locator('.faq-list summary').first().click();assert(await page.locator('.faq-list details').first().evaluate(e=>e.open));assert(await page.locator('.faq-list details p').first().isVisible());checks++;
 const ids=await page.locator('.team-identities > div').allTextContents();assert.deepEqual(ids.map(x=>x.trim().split('Marketing')[0].split('Diretor')[0].trim()),['Vinicius','João','Victor']);checks++;
 await page.locator('.about-image').scrollIntoViewIfNeeded();await page.locator('.about-image img').evaluate(img=>img.decode());
 const team=await page.locator('.about-image img').evaluate(img=>({src:img.currentSrc,w:img.naturalWidth,h:img.naturalHeight,fit:getComputedStyle(img).objectFit}));assert.match(team.src,/equipe-cristal.webp/);assert.equal(team.w,1536);assert.equal(team.h,1024);assert.equal(team.fit,'contain');checks++;
 assert(fs.statSync(path.join(root,'assets/equipe-cristal.webp')).size<200000);checks++;
 await page.screenshot({path:path.join(out,'refined-team-mobile.png')});
 await page.locator('.office-photo').scrollIntoViewIfNeeded();await page.locator('.office-photo img').evaluate(img=>img.decode());
 const office=await page.locator('.office-photo img').evaluate(img=>({src:img.currentSrc,w:img.naturalWidth,h:img.naturalHeight,ratio:img.clientWidth/img.clientHeight}));assert.match(office.src,/edificio-marcia.webp/);assert.equal(office.w,1209);assert.equal(office.h,1300);assert(Math.abs(office.ratio-1209/1300)<.01);checks++;
 await page.screenshot({path:path.join(out,'refined-office-mobile.png')});
 for(const route of ['/?qa=menu','/conteudo/?qa=menu','/simulador/?qa=menu']){await page.setViewportSize({width:1024,height:950});await page.goto(origin+route);const nav=page.locator('.main-nav'),toggle=page.locator('.menu-toggle');assert(await nav.evaluate(el=>el.inert),route+" closed tablet menu");await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await nav.evaluate(el=>el.inert),false);await page.keyboard.press('Escape');assert(await nav.evaluate(el=>el.inert),route+" closed after Escape");checks++;}
 assert.deepEqual(errors,[]);console.log(`PASS: ${checks} visual-polish checks — real filter state/removal, compact mobile comparison/navigation, mandatory capture/status, viewport overflow, review controls, FAQ, staff identity, optimized supplied photos and tablet menus.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
