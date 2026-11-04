'use strict';
const assert=require('node:assert/strict');
const E=require('../propostas/engine');
const c=(credit,entry,months,payment)=>({administrator:'Caixa',credit,entry,months,payment,transfer:credit*.01});
const demo=E.consolidate([c(150000,45000,123,1200),c(80000,25000,70,700)]);
assert.deepEqual(demo.stages,[{start:1,end:70,months:70,payment:1900},{start:71,end:123,months:53,payment:1200}]);
assert.equal(demo.credit,230000);assert.equal(demo.entry,70000);assert.equal(demo.debt,196600);assert.equal(demo.total,268900);
// A single combined credit/entry can have several simultaneous payment plans.
const grouped=E.consolidate([{...c(100878.38,42000,44,2313.75),payments:[{months:44,payment:2313.75},{months:30,payment:700}]}]);
assert.equal(grouped.credit,100878.38);assert.equal(grouped.entry,42000);assert.equal(grouped.transfer,1008.78);
assert.equal(grouped.debt,122805);assert.equal(grouped.total,165813.78);
assert.deepEqual(grouped.stages,[{start:1,end:30,months:30,payment:3013.75},{start:31,end:44,months:14,payment:2313.75}]);
for(const payments of [[],[{months:0,payment:1}],[{months:1,payment:0}],[{months:1.5,payment:20}],[{months:2,payment:NaN}],Array.from({length:5},()=>({months:12,payment:50}))])assert.throws(()=>E.consolidate([{...c(100000,30000,44,100),payments}]));
const sameEnd=E.consolidate([{...c(100000,30000,12,100),payments:[{months:12,payment:100.01},{months:12,payment:200.02}]}]);assert.equal(sameEnd.stages.length,1);assert.equal(sameEnd.stages[0].payment,300.03);assert.equal(sameEnd.debt,3600.36);
// Already-calculated stages run consecutively; do not sum them again.
const lorena=E.consolidate([{...c(225500,110000,187,1186),paymentMode:'sequential',payments:[{months:187,payment:1186},{months:2,payment:655}]}]);
assert.deepEqual(lorena.stages,[{start:1,end:187,months:187,payment:1186},{start:188,end:189,months:2,payment:655}]);
assert.equal(lorena.months,189);assert.equal(lorena.debt,223092);assert.equal(lorena.credit,225500);assert.equal(lorena.entry,110000);
const mixed=E.consolidate([{...c(100000,10000,2,100),paymentMode:'sequential',payments:[{months:2,payment:100},{months:3,payment:50}]},c(100000,10000,3,20)]);
assert.deepEqual(mixed.stages,[{start:1,end:2,months:2,payment:120},{start:3,end:3,months:1,payment:70},{start:4,end:5,months:2,payment:50}]);
assert.equal(mixed.debt,410);
for(const paymentMode of ['sequential','simultaneous']){
 const result=E.consolidate([{...c(100000,10000,2,100.01),paymentMode,payments:[{months:2,payment:100.01},{months:3,payment:50.02},{months:1,payment:20.03},{months:4,payment:10.04}]}]);
 assert.equal(result.debt,E.round(result.stages.reduce((s,p)=>s+p.months*p.payment,0)));
}
assert.throws(()=>E.consolidate([{...c(100000,0,300,1),paymentMode:'sequential',payments:[{months:300,payment:1},{months:121,payment:1}]}]));
assert.throws(()=>E.consolidate([{...c(100000,0,1,1),paymentMode:'unknown'}]));
// Independently expand simultaneous payments, including equal end dates and cents.
for(const cards of [[c(50000,10000,36,731.13)], [c(30000,5000,24,100),c(20000,2000,24,200)], [c(1e5,2e4,1,100.01),c(1e5,2e4,2,200.02),c(1e5,2e4,3,300.03),c(1e5,2e4,4,400.04)]]) {
  const out=E.consolidate(cards);let independent=0;
  for(let month=1;month<=out.months;month++) {
    const expected=E.round(cards.reduce((sum,c)=>sum+(month<=c.months?c.payment:0),0));
    const stage=out.stages.find(s=>month>=s.start&&month<=s.end);assert.equal(stage.payment,expected);independent+=expected;
  }
  assert.equal(out.debt,E.round(independent));
}
assert.throws(()=>E.consolidate([]));assert.throws(()=>E.consolidate([c(100,200,36,5)]));assert.throws(()=>E.consolidate([c(100,20,2.5,5)]));assert.throws(()=>E.consolidate([c(NaN,20,30,5)]));
assert.equal(E.number('R$ 1.234,56'),1234.56);assert.equal(E.number('1234.56'),1234.56);assert.ok(Number.isNaN(E.number('')));
assert.equal(E.number('150.000'),150000);assert.equal(E.number('1.000.000'),1000000);assert.equal(E.number('13.85'),13.85);
const base={principal:160000,property:230000,months:123,tr:.1616,mip:.03073,dfi:.00899,admin:25};
const itau=E.bank({...base,annual:13.85,fee:3420}),santander=E.bank({...base,annual:11.69,fee:3300});
// Independent Decimal calculation in the reviewed PDF model gives these totals.
assert.equal(itau.first,3139.51);assert.equal(itau.last,1650.01);assert.equal(itau.total+70000,374881.62);
assert.equal(santander.first,2881.13);assert.equal(santander.last,1647.45);assert.equal(santander.total+70000,357635.59);
assert.equal(E.bank({principal:1200,property:1200,months:12,annual:0}).total,1200);
const price=E.bank({principal:10000,property:20000,months:12,monthly:1,system:'Price'});
assert.equal(price.first,888.49);assert.equal(price.last,888.49);assert.equal(price.total,10661.88);
const zero=E.bank({principal:1200,property:1200,months:12,monthly:0,system:'Price'});assert.equal(zero.first,100);assert.equal(zero.total,1200);
assert.throws(()=>E.bank({principal:0,property:100,months:10,annual:10}));
console.log('PASS: simultaneous flows, four cards, tied terms, cents, validation, reviewed SAC totals, Price and zero interest.');
