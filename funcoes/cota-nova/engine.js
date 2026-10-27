(function(root){
  "use strict";
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  function number(value){if(typeof value==='number')return value;let s=String(value??'').trim().replace(/R\$|\s/g,'');if(!s)return NaN;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');return /^-?\d+(\.\d+)?$/.test(s)?Number(s):NaN;}
  const money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}).replace(/\u00a0/g,' ');
  function amount(value,label){const n=number(value);if(!Number.isFinite(n)||n<=0||n>1e9)throw Error('Informe '+label+' maior que zero.');return round(n);}
  function calculate(input){
    const credit=amount(input.credit,'um crédito'),paymentMin=amount(input.paymentMin,'uma parcela normal');
    const paymentMax=String(input.paymentMax??'').trim()?amount(input.paymentMax,'uma parcela máxima'):paymentMin;
    if(paymentMax<paymentMin)throw Error('A parcela máxima não pode ser menor que a mínima.');
    const term=number(input.term),dueDay=number(input.dueDay);
    if(!Number.isInteger(term)||term<1||term>420)throw Error('Informe um prazo de 1 a 420 meses.');
    if(!Number.isInteger(dueDay)||dueDay<1||dueDay>31)throw Error('Informe um dia de vencimento entre 1 e 31.');
    const reducedEnabled=input.reducedEnabled===true;
    const reducedPayment=reducedEnabled?amount(input.reducedPayment,'uma parcela reduzida'):null;
    const reduction=reducedEnabled&&String(input.reduction??'').trim()?number(input.reduction):null;
    if(reduction!==null&&(!Number.isFinite(reduction)||reduction<=0||reduction>=100))throw Error('A redução informada deve ser maior que 0% e menor que 100%.');
    const details=[];
    if(input.detailEnabled===true)for(const [key,label]of [['common','Fundo comum'],['reserve','Fundo de reserva'],['fee','Taxa de administração'],['insurance','Seguro']]){
      const raw=input.details?.[key];if(String(raw??'').trim()==='')continue;
      const value=number(raw);if(!Number.isFinite(value)||value<0||value>1e9)throw Error('Revise o valor de '+label.toLowerCase()+'.');details.push({label,value:round(value)});
    }
    return {credit,paymentMin,paymentMax,term,dueDay,reducedEnabled,reducedPayment,reduction,insuranceIncluded:input.insuranceIncluded===true,details,
      plan:String(input.plan??'').trim().slice(0,120),code:String(input.code??'').trim().slice(0,40),condition:String(input.condition??'').trim().slice(0,180),
      paymentLabel:paymentMin===paymentMax?money(paymentMin):money(paymentMin)+' a '+money(paymentMax)};
  }
  const api=Object.freeze({number,round,money,calculate});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NewQuotaEngine=api;
})(typeof globalThis!=='undefined'?globalThis:window);
