(function(){
  'use strict';
  const E=ProposalEngine, $=id=>document.getElementById(id), cards=$('cards'), form=$('proposal-form');
  const defaults={'itau-rate':13.85,'santander-rate':11.69,'itau-fee':3420,'santander-fee':3300,tr:.1616,admin:25,mip:.03073,dfi:.00899,'vehicle-rate':1.97,'vehicle-fee':0};
  $('date').value=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let logoPromise;
  function loadLogo() {
    if(!logoPromise) logoPromise=fetch('../assets/logo.png').then(r=>{if(!r.ok)throw Error('Não foi possível carregar a marca Cristal.');return r.blob();}).then(blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);})).catch(e=>{logoPromise=null;throw e;});
    return logoPromise;
  }
  function addCard(values={}) {
    if(cards.children.length>=4)return;
    const card=$('card-template').content.firstElementChild.cloneNode(true);
    for(const [key,value] of Object.entries(values))card.querySelector(`[data-field="${key}"]`).value=value;
    card.querySelector('.remove').addEventListener('click',()=>{card.remove();renumber();preview();});cards.append(card);renumber();return card;
  }
  function renumber() {
    [...cards.children].forEach((card,i)=>{card.querySelector('.card-index').textContent=i+1;card.querySelector('.remove').hidden=cards.children.length===1;card.querySelector('.remove').setAttribute('aria-label',`Remover carta ${i+1}`);});
    $('add-card').hidden=!$('multiple').checked||cards.children.length>=4;
  }
  function readCards() {
    return [...cards.children].map(card=>{
      const v=k=>card.querySelector(`[data-field="${k}"]`).value;
      const credit=E.number(v('credit')),transferValue=E.number(v('transferInput'));
      const transfer=v('transferMode')==='percent'?E.round(credit*transferValue/100):transferValue;
      return {administrator:v('administrator'),credit:E.round(credit),entry:E.round(E.number(v('entry'))),transfer,payment:E.round(E.number(v('payment'))),months:Number(v('months'))};
    });
  }
  function preview() {
    $('preview-client').textContent=$('client').value.trim()||'Seu cliente';
    try {
      const s=E.consolidate(readCards());
      for(const key of ['credit','entry','transfer','debt','total'])$('preview-'+key).textContent=E.money(s[key]);
      $('preview-term').textContent=s.months+' meses';$('preview-stages').replaceChildren();
      s.stages.forEach(stage=>{const row=document.createElement('div');row.className='stage';const label=document.createElement('span');label.textContent=`${stage.start}º ao ${stage.end}º mês`;const value=document.createElement('strong');value.textContent=E.money(stage.payment);row.append(label,value);$('preview-stages').append(row);});
    } catch {
      for(const key of ['credit','entry','transfer','debt','total'])$('preview-'+key).textContent='—';$('preview-term').textContent='—';
      const p=document.createElement('p');p.className='hint';p.textContent='Preencha as condições das cartas para conferir o resumo.';$('preview-stages').replaceChildren(p);
    }
  }
  function assetChanged() {$('property-settings').hidden=$('asset').value!=='imovel';$('vehicle-settings').hidden=$('asset').value!=='veiculo';}
  $('asset').addEventListener('change',assetChanged);
  $('multiple').addEventListener('change',()=>{
    // Never silently discard conditions already entered.
    if(!$('multiple').checked&&cards.children.length>1){$('multiple').checked=true;status('Remova as cartas adicionais antes de desmarcar esta opção.',true);return;}
    if($('multiple').checked&&cards.children.length===1)addCard();renumber();preview();
  });
  $('add-card').addEventListener('click',()=>{const c=addCard();preview();c?.querySelector('input').focus();});
  cards.addEventListener('change',event=>{
    if(event.target.dataset.field==='transferMode') {
      const card=event.target.closest('.card');card.querySelector('[data-transfer-label]').textContent=event.target.value==='percent'?'Transferência (%)':'Transferência (R$)';
      card.querySelector('[data-field="transferInput"]').value=event.target.value==='percent'?'1':'0,00';
    }
  });
  form.addEventListener('input',preview);form.addEventListener('change',preview);
  function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
  function settings() {
    const keys=$('asset').value==='imovel'?Object.keys(defaults).filter(k=>!k.startsWith('vehicle')):['vehicle-rate','vehicle-fee'];
    const config={};let edited=false;
    for(const key of keys){const input=$(key),value=E.number(input.value);if(!Number.isFinite(value)||value<0||(input.type==='number'&&!input.checkValidity())){input.focus();throw Error('Revise as taxas e os encargos do comparativo.');}config[key]=value;edited ||= value!==defaults[key];}
    return {config,edited};
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();status('');
    try {
      // Hidden asset-specific settings must not interfere with the active form.
      const client=$('client').value.trim(),date=$('date').value;
      if(!client){$('client').focus();throw Error('Preencha o nome do cliente.');}
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00'))){$('date').focus();throw Error('Informe uma data válida.');}
      const summary=E.consolidate(readCards()),asset=$('asset').value;
      let config={},edited=false,banks=[];
      if($('compare').checked){
        if(summary.entry>=summary.credit)throw Error('Para comparar com financiamento, a entrada deve ser menor que o crédito.');
        ({config,edited}=settings());
        const common={principal:E.round(summary.credit-summary.entry),property:summary.credit,months:summary.months};
        if(asset==='imovel')banks=[['Itaú','itau'],['Santander','santander']].map(([name,id])=>({name,rateLabel:config[id+'-rate'].toLocaleString('pt-BR')+'% a.a.',...E.bank({...common,annual:config[id+'-rate'],tr:config.tr,mip:config.mip,dfi:config.dfi,admin:config.admin,fee:config[id+'-fee']})}));
        else banks=[{name:'Mercado (BCB)',rateLabel:config['vehicle-rate'].toLocaleString('pt-BR')+'% a.m.',...E.bank({...common,monthly:config['vehicle-rate'],fee:config['vehicle-fee'],system:'Price'})}];
      }
      $('generate').disabled=true;status('Gerando o PDF…');
      const data={client,date,summary,asset,banks,config,edited,reference:$('custom-reference').value.trim()};
      const {doc,filename}=await makeProposalPDF(data,await loadLogo());
      await doc.save(filename,{returnPromise:true});status('PDF gerado. Confira os downloads do navegador.');
    } catch(error){status(error.message||'Não foi possível gerar o PDF. Tente novamente.',true);}
    finally{$('generate').disabled=false;}
  });
  $('example').addEventListener('click',()=>{
    if([...cards.querySelectorAll('[data-field="credit"]')].some(input=>input.value.trim())||$('client').value.trim()){
      status('Para preservar os dados preenchidos, carregue o exemplo em uma nova aba.',true);return;
    }
    $('client').value='Vitor';$('asset').value='imovel';$('multiple').checked=true;cards.replaceChildren();
    addCard({administrator:'Caixa',credit:'150.000,00',entry:'45.000,00',months:'123',payment:'1.200,00'});
    addCard({administrator:'Caixa',credit:'80.000,00',entry:'25.000,00',months:'70',payment:'700,00'});
    assetChanged();preview();status('Exemplo preenchido com dados fictícios. Substitua pelos dados reais antes de enviar.');
  });
  addCard();assetChanged();preview();
})();
