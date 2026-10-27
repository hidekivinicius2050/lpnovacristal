'use strict';
// Browser regression for comparison, mobile filters and mandatory lead capture.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const origin=process.env.CRISTAL_TEST_URL||'http://127.0.0.1:4175';
const stock=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/cartas.json'),'utf8'));
const output=path.resolve(__dirname,'../../output/playwright');
let checks=0;
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // All writes and WhatsApp navigation are local mocks. No real leads are sent.
  let posts=[],allowSave=false,sequence=[],current=structuredClone(stock);
  await page.route('**/data/cartas.json?*',route=>route.fulfill({json:current}));
  await page.route('**/api/leads',async route=>{
   posts.push(JSON.parse(route.request().postData()));sequence.push('save');
   await route.fulfill({status:allowSave?200:503,json:{saved:allowSave}});
  });
  await page.route('https://wa.me/**',async route=>{sequence.push('whatsapp');await route.fulfill({contentType:'text/html',body:'<p>WhatsApp test destination</p>'});});
  await page.goto(origin+'/?qa=comparison');
  await page.waitForFunction(()=>document.querySelectorAll('.letter-compare').length===6);
  assert.equal(await page.locator('[data-portfolio-count]').first().innerText(),String(stock.letters.length));checks++;
  await page.locator('.letter-compare').nth(0).click();assert.equal(await page.locator('#compare-open').isDisabled(),true);checks++;
  await page.locator('.letter-compare').nth(1).click();assert.equal(await page.locator('#compare-open').isEnabled(),true);checks++;
  await page.locator('.letter-compare').nth(2).click();await page.locator('.letter-compare').nth(3).click();
  assert.match(await page.locator('#compare-feedback').innerText(),/três cartas/);
  assert.equal(await page.locator('.letter-compare[aria-pressed=true]').count(),3);checks++;
  const chosen=await page.locator('.letter-compare[aria-pressed=true]').evaluateAll(nodes=>nodes.map(n=>n.dataset.compareId));
  await page.locator('#sort-filter').selectOption('credit-asc');await page.locator('#compare-open').click();
  assert.equal(await page.locator('.comparison-table thead th').count(),4);
  const displayed=await page.locator('[data-compare-field=credit] td').allTextContents();
  for(let i=0;i<chosen.length;i++){const expected=stock.letters.find(x=>x.id===chosen[i]).credit.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});assert.equal(displayed[i],expected);}
  assert((await page.locator('[data-compare-field=entry]').innerText()).includes('Consultar'));checks++;
  await page.locator('#compare-dialog').evaluate(async d=>{await Promise.all(d.getAnimations().map(a=>a.finished));});
  await page.screenshot({path:path.join(output,'comparison-desktop-verified.png')});
  await page.locator('.compare-contact').click();assert(await page.locator('#atendimento').isVisible());
  await page.locator('#atendimento [type=submit]').click();assert.equal(posts.length,0);checks++;
  await page.locator('#popup-name').fill('Teste interface Cristal');await page.locator('#popup-phone').fill('61999998888');
  await page.locator('#atendimento [type=submit]').click();await page.waitForFunction(()=>document.querySelector('#atendimento .form-feedback').textContent.includes('Não foi possível'));
  assert.equal(posts.length,1);assert.match(posts[0].form_nome,/comparador-cartas/);assert.equal(posts[0].context.summary.match(/Opção /g).length,3);assert.equal(sequence.includes('whatsapp'),false);checks++;
  await page.locator('.lead-close').click();assert(await page.locator('#compare-dialog').isVisible());checks++;
  await page.locator('.compare-card-contact').first().click();assert(await page.locator('#atendimento').isVisible());
  assert((await page.locator('#lead-context').innerText()).includes(displayed[0]));checks++;
  await page.locator('.lead-close').click();await page.locator('.compare-close').click();
  await page.locator('[data-category=veiculo]').click();await page.locator('.letter-compare').first().click();assert.match(await page.locator('#compare-feedback').innerText(),/mesmo tipo/);checks++;
  await page.locator('.compare-clear').click();assert.equal(await page.locator('.compare-tray').isHidden(),true);checks++;
  await page.locator('.letter-action').first().click();assert(await page.locator('[data-detail=installment]').isVisible());
  await page.locator('#modal-whatsapp').click();assert(await page.locator('#atendimento').isVisible());
  allowSave=true;sequence=[];await page.locator('#atendimento [type=submit]').click();await page.waitForURL('https://wa.me/**');
  assert.deepEqual(sequence,['save','whatsapp']);
  const message=new URL(page.url()).searchParams.get('text');assert.match(message,/Parcela:/);assert.match(message,/Crédito:/);checks++;
  await page.goto(origin+'/?qa=mobile');await page.waitForSelector('.letter-compare');
  for(const width of [320,390,700,1024,1440]){
   await page.setViewportSize({width,height:900});await page.locator('.filter-panel').scrollIntoViewIfNeeded();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width<=700){
    await page.locator('.mobile-filter-close').click();assert(await page.locator('.filter-panel').isHidden());
    assert.equal(await page.locator('#mobile-filter-toggle').getAttribute('aria-expanded'),'false');
    await page.locator('#mobile-filter-toggle').click();assert(await page.locator('#search-input').isVisible());
    assert.equal(await page.locator('#search-input').evaluate(e=>e===document.activeElement),true);
   } else assert(await page.locator('.filter-panel').isVisible());
   checks++;
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.letter-compare').nth(0).click();await page.locator('.letter-compare').nth(1).click();await page.locator('#compare-open').click();
  assert(await page.locator('.compare-scroll-hint').isVisible());
  assert(await page.locator('.comparison-scroll').isHidden());
  assert.equal(await page.locator('.comparison-option').count(),2);
  const mobileCards=await page.locator('.comparison-option').evaluateAll(nodes=>nodes.map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right})));
  assert(mobileCards.every(card=>card.left>=0&&card.right<=390));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('#compare-dialog').evaluate(async d=>{await Promise.all(d.getAnimations().map(a=>a.finished));});
  await page.screenshot({path:path.join(output,'comparison-mobile-verified.png')});checks++;
  // Availability refresh removes a retired selection instead of keeping an old offer.
  await page.locator('.compare-close').click();const retired=await page.locator('.letter-compare[aria-pressed=true]').first().getAttribute('data-compare-id');
  current={...stock,letters:stock.letters.filter(x=>x.id!==retired)};await page.evaluate(()=>loadPortfolio());
  await page.waitForFunction(()=>document.querySelector('#compare-selection-label').textContent.startsWith('1 de 3'));
  assert.match(await page.locator('#compare-feedback').innerText(),/disponibilidade mudou/);checks++;
  await page.locator('.compare-clear').click();
  await page.locator('#sobre').scrollIntoViewIfNeeded();await page.locator('.about-image img').evaluate(img=>img.decode());
  const photo=await page.locator('.about-image img').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight,fit:getComputedStyle(img).objectFit,src:img.src}));
  assert.equal(photo.width,1536);assert.equal(photo.height,1024);assert.equal(photo.fit,'contain');assert.match(photo.src,/equipe-cristal.png/);checks++;
  assert.match(await page.locator('.google-reviews-link').getAttribute('href'),/^https:\/\/maps.app.goo.gl\//);checks++;
  await page.locator('.about-image').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.about-image').classList.contains('show'));
  await page.locator('.about-image').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
  await page.screenshot({path:path.join(output,'team-mobile-verified.png')});
  for(const type of ['imovel','veiculo']){
   await page.goto(origin+`/carta-contemplada-${type}/?qa=landing`);await page.waitForSelector('.letter-compare');
   assert.equal(await page.locator('body').getAttribute('data-catalogue-type'),type);
   await page.locator('.letter-action').first().click();await page.locator('#modal-whatsapp').click();assert(await page.locator('#atendimento').isVisible());
   assert((await page.locator('#lead-context').innerText()).includes(type==='imovel'?'imóvel':'veículo'));checks++;
  }
  assert.deepEqual(errors,[]);console.log(`PASS: ${checks} catalogue experience checks: comparison limits/data/state, required form, failed/successful save gating with mocked WhatsApp, responsive filters, stock refresh, team photo and both segment routes.`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
