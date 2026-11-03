'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.CRISTAL_TEST_URL||'http://127.0.0.1:4175';
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL==='chromium'?undefined:(process.env.PLAYWRIGHT_CHANNEL||'chrome')});try{
 const page=await browser.newPage(),posts=[];let redirects=0;
 await page.route('**/api/leads',async route=>{posts.push(JSON.parse(route.request().postData()));await route.fulfill({status:posts.length===1?400:200,json:posts.length===1?{saved:false,code:'EXPIRED_LEAD'}:{saved:true}});});
 await page.route('https://wa.me/**',async route=>{redirects++;await route.fulfill({contentType:'text/html',body:'Mock contact destination'});});
 await page.goto(origin);await page.locator('.letter-action').first().click();await page.locator('#modal-whatsapp').click();
 await page.locator('#popup-name').fill('Teste recuperação');await page.locator('#popup-phone').fill('61999998888');
 await page.locator('#atendimento [type=submit]').click();await page.waitForFunction(()=>document.querySelector('#atendimento .form-feedback').textContent.includes('expirou'));
 assert.equal(posts.length,1);assert.equal(redirects,0);assert.equal(await page.locator('#popup-name').inputValue(),'Teste recuperação');
 await page.locator('#atendimento [type=submit]').click();await page.waitForURL('https://wa.me/**');
 assert.equal(posts.length,2);assert.notEqual(posts[0].id,posts[1].id);assert.equal(redirects,1);
 console.log('PASS: definite expiry keeps form data, resets only rejected identity and opens mocked WhatsApp only after saved=true.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
