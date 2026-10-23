'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../tracking-consent.js'), 'utf8');
function fixture({ choice = null, host = 'www.cristalconsorcios.com.br', path = '/', preview = false } = {}) {
  const scripts = [], buttons = {}, elements = [], stored = new Map();
  if (choice) stored.set('consent_v1', JSON.stringify(choice));
  const create = tag => {
    const e = { tag, hidden: false, setAttribute() {}, focus() {},
      addEventListener(event, cb) { this[event] = cb; },
      querySelector(selector) { return buttons[selector] ||= create('button'); } };
    elements.push(e); return e;
  };
  const footer = { append(e) { this.preferences = e; } };
  const context = { window: { CristalLeadConfig: { gtmEnabled: true, gtmContainerId: 'GTM-K3R4J649', trackingHosts: ['www.cristalconsorcios.com.br'], previewConsent: preview } },
    location: { hostname: host, pathname: path },
    localStorage: { getItem: k => stored.get(k), setItem: (k,v) => stored.set(k,v) },
    document: { createElement: create, head: { append: e => scripts.push(e) }, body: { append() {} }, querySelector: () => footer } };
  vm.runInNewContext(source, context);
  return { context, scripts, buttons, elements, footer, stored };
}
let f = fixture();
assert.equal(f.scripts.length, 0, 'No Google request before an explicit choice');
assert.equal(f.context.window.dataLayer[0].page_type, 'home');
assert.equal(f.context.window.dataLayer[1][2].ad_storage, 'denied');
f.buttons['[data-consent="deny"]'].click();
assert.equal(f.scripts.length, 0, 'Decline must not load GTM');
assert.equal(JSON.parse(f.stored.get('consent_v1')).granted, false);
f.footer.preferences.click();
f.buttons['[data-consent="accept"]'].click();
assert.equal(f.scripts.length, 1);
assert.equal(f.scripts[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-K3R4J649');
f.buttons['[data-consent="accept"]'].click();
assert.equal(f.scripts.length, 1, 'Repeated acceptance must not load twice');
f.buttons['[data-consent="deny"]'].click();
assert.equal(f.context.window.dataLayer.at(-1)[2].analytics_storage, 'denied');
const fresh = granted => ({ granted, version: 1, at: Date.now() });
assert.equal(fixture({choice:fresh(true)}).scripts.length, 1);
assert.equal(fixture({choice:fresh(false)}).scripts.length, 0);
assert.equal(fixture({choice:{...fresh(true),at:Date.now()-181*86400000}}).scripts.length, 0);
assert.equal(fixture({host:'localhost'}).scripts.length, 0);
assert.equal(fixture({host:'localhost',preview:true,choice:fresh(true)}).scripts.length, 0);
for (const path of ['/quiz/', '/agradecimento/', '/propostas/']) assert.equal(fixture({path,choice:fresh(true)}).elements.length, 0);
console.log('PASS: GTM loads once only after opt-in; decline/revoke, remembered/expired choices, preview host and protected routes verified. No external requests.');
