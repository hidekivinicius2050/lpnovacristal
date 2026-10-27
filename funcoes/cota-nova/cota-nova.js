(function(){
  "use strict";
  const E=window.NewQuotaEngine,$=id=>document.getElementById(id);
  $('new-date').value=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function input(){return {credit:$('new-credit').value,term:$('new-term').value,dueDay:$('new-due').value,plan:$('new-plan').value,code:$('new-code').value,paymentMin:$('new-payment-min').value,paymentMax:$('new-payment-max').value,reducedEnabled:$('new-reduced-enabled').checked,reducedPayment:$('new-reduced-payment').value,reduction:$('new-reduction').value,condition:$('new-condition').value,insuranceIncluded:$('new-insurance').checked,detailEnabled:$('new-detail-enabled').checked,details:{common:$('new-common').value,reserve:$('new-reserve').value,fee:$('new-fee').value,insurance:$('new-insurance-value').value}};}
  function status(message,error=false){$('new-status').textContent=message;$('new-status').classList.toggle('error',error);}
  function preview(){
    $('new-preview-client').textContent=$('new-client').value.trim()||'Seu cliente';
    const reduced=$('new-reduced-enabled').checked;$('new-reduced-settings').hidden=!reduced;$('new-detail-settings').hidden=!$('new-detail-enabled').checked;
    $('new-min-label').textContent=reduced?'Parcela cheia · valor único ou mínimo (R$)':'Parcela normal (R$)';
    try{const s=E.calculate(input());$('new-preview-credit').textContent=E.money(s.credit);$('new-preview-term').textContent=s.term+' meses';$('new-preview-due').textContent='Dia '+s.dueDay;$('new-preview-reduced').hidden=!s.reducedEnabled;$('new-preview-reduced-label').textContent='Parcela reduzida'+(s.reduction?' · '+s.reduction.toLocaleString('pt-BR')+'%':'');$('new-preview-reduced-value').textContent=s.reducedEnabled?E.money(s.reducedPayment):'';$('new-preview-full-label').textContent=(s.reducedEnabled?'Parcela cheia':'Parcela normal')+(s.insuranceIncluded?' com seguro':' sem seguro');$('new-preview-full').textContent=s.paymentLabel;$('new-preview-condition').textContent=s.condition;status('');}
    catch(error){for(const id of ['new-preview-credit','new-preview-term','new-preview-due','new-preview-full'])$(id).textContent='—';$('new-preview-reduced').hidden=true;$('new-preview-condition').textContent='';status(error.message,true);}
  }
  let logoPromise;
  function logo(){if(!logoPromise)logoPromise=fetch('/assets/logo.png').then(r=>{if(!r.ok)throw Error('Não foi possível carregar a marca Cristal.');return r.blob();}).then(blob=>new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(blob);})).catch(e=>{logoPromise=null;throw e;});return logoPromise;}
  $('new-reduced-enabled').addEventListener('change',()=>{if(!$('new-reduced-enabled').checked)$('new-detail-enabled').checked=false;preview();});
  $('new-form').addEventListener('input',preview);$('new-form').addEventListener('change',preview);
  $('new-example').addEventListener('click',()=>{
    const values={'new-client':'Vitor','new-admin':'Administradora a definir','new-asset':'veiculo','new-credit':'100.000,00','new-term':'94','new-due':'5','new-plan':'VEÍCULO 100 MIL','new-code':'VEM100','new-payment-min':'1.327,74','new-payment-max':'1.417,27','new-reduced-payment':'660,30','new-reduction':'50','new-condition':'Faixa de referência para contemplação em até 12 meses.','new-common':'85,80','new-reserve':'16,00','new-fee':'558,50','new-insurance-value':'0,00'};
    for(const[k,v]of Object.entries(values))$(k).value=v;$('new-reduced-enabled').checked=true;$('new-insurance').checked=false;$('new-detail-enabled').checked=true;preview();status('Exemplo baseado na imagem. Informe cliente e administradora antes de enviar.');
  });
  for(const id of ['new-credit','new-payment-min','new-payment-max','new-reduced-payment','new-common','new-reserve','new-fee','new-insurance-value'])$(id).addEventListener('blur',()=>{const n=E.number($(id).value);if(Number.isFinite(n)&&n>=0)$(id).value=n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});});
  $('new-form').addEventListener('submit',async event=>{event.preventDefault();status('');try{
    const client=$('new-client').value.trim(),admin=$('new-admin').value.trim(),date=$('new-date').value;
    if(!client){$('new-client').focus();throw Error('Preencha o nome do cliente.');}if(!admin){$('new-admin').focus();throw Error('Informe a administradora.');}if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00')))throw Error('Informe uma data válida.');
    const values=input();E.calculate(values);$('new-generate').disabled=true;const result=makeNewQuotaPDF({client,admin,date,asset:$('new-asset').value,input:values},await logo());result.doc.save(result.filename);status('PDF gerado. Confira as condições antes de enviar.');
  }catch(error){status(error.message||'Não foi possível gerar a proposta.',true);}finally{$('new-generate').disabled=false;}});
})();
