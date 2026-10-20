(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ProposalEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const money = n => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(n).replace(/\u00a0/g, ' ');
  function number(value) {
    if (typeof value === 'number') return value;
    const s = String(value).trim().replace(/R\$|\s/g, '');
    if (!s) return NaN;
    return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g,'') : s);
  }
  function consolidate(cards) {
    if (!cards.length || cards.length > 4) throw Error('Informe de uma a quatro cartas.');
    cards.forEach((c, i) => {
      for (const key of ['credit','entry','transfer','payment','months']) {
        if (!Number.isFinite(c[key]) || c[key] < 0) throw Error(`Revise os valores da carta ${i+1}.`);
      }
      if (!c.administrator.trim()) throw Error(`Informe a administradora da carta ${i+1}.`);
      if (c.credit <= 0 || c.payment <= 0 || c.entry > c.credit || c.transfer > c.credit || c.credit > 1e9) throw Error(`Revise crédito, entrada, transferência e parcela da carta ${i+1}.`);
      if (!Number.isInteger(c.months) || c.months < 1 || c.months > 420) throw Error('O prazo de cada carta deve ser de 1 a 420 meses.');
    });
    const ends = [...new Set(cards.map(c => c.months))].sort((a,b) => a-b);
    let start = 1;
    const stages = ends.map(end => {
      const value = round(cards.filter(c => c.months >= end).reduce((s,c) => s+c.payment,0));
      const stage = {start, end, months:end-start+1, payment:value}; start=end+1; return stage;
    });
    const sum = key => round(cards.reduce((s,c) => s+c[key],0));
    const credit=sum('credit'), entry=sum('entry'), transfer=sum('transfer');
    const debt=round(cards.reduce((s,c)=>s+c.months*c.payment,0));
    return {cards,credit,entry,transfer,debt,upfront:round(entry+transfer),total:round(entry+transfer+debt),months:ends.at(-1),stages,administrators:[...new Set(cards.map(c=>c.administrator.trim()))].join(' / ')};
  }
  function bank({principal, property, months, annual, monthly, tr=0, mip=0, dfi=0, admin=0, fee=0, system='SAC'}) {
    const values=[principal,property,months,tr,mip,dfi,admin,fee, annual ?? monthly];
    if(values.some(v=>!Number.isFinite(v)||v<0)||principal<=0||!Number.isInteger(months)||months<1||months>420) throw Error('Revise as premissas do financiamento.');
    const rate = monthly !== undefined ? monthly/100 : Math.pow(1+annual/100,1/12)-1;
    const trRate=tr/100, payments=[], insurances=[];
    const fixed=rate ? principal*rate/(-Math.expm1(-months*Math.log1p(rate))) : principal/months;
    let balance=principal;
    for(let k=1;k<=months;k++) {
      let insurance, payment;
      if(system==='SAC') {
        const factor=Math.pow(1+trRate,k), opening=(principal-principal/months*(k-1))*factor;
        insurance=round(opening*mip/100+property*dfi/100);
        payment=round(principal/months*factor+opening*rate)+insurance+admin;
      } else {
        insurance=0;
        const amort=k===months ? balance : fixed-balance*rate;
        payment=round(amort+balance*rate)+admin; balance-=amort;
      }
      payments.push(round(payment)); insurances.push(insurance);
    }
    return {first:payments[0],last:payments.at(-1),total:round(payments.reduce((s,p)=>s+p,0)+fee),insurance:insurances[0],payments,fee,admin,rate};
  }
  return {round,money,number,consolidate,bank};
});
