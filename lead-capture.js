(function () {
  'use strict';
  if (/^\/(quiz|agradecimento|propostas)(\/|$)/.test(location.pathname)) return;
  const config=window.CristalLeadConfig;
  if(!config)return;
  const keys=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','wbraid','gbraid'];
  const pageType=location.pathname.startsWith('/carta-contemplada-imovel')?'carta-imovel':location.pathname.startsWith('/carta-contemplada-veiculo')?'carta-veiculo':location.pathname.startsWith('/simulador')?'simulador':location.pathname==='/conteudo/'?'conteudo':location.pathname.startsWith('/conteudo/')?'artigo':location.pathname==='/'?'home':'institucional';
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({page_type:pageType});
  const memory=new Map();
  const get=key=>{try{return sessionStorage.getItem('attr_'+key)||memory.get(key)||'';}catch{return memory.get(key)||'';}};
  const put=(key,value)=>{memory.set(key,value);try{sessionStorage.setItem('attr_'+key,value);}catch{}};
  function cleanURL(value){try{const url=new URL(value,location.origin);return /^https?:$/.test(url.protocol)?url.origin+url.pathname:'';}catch{return '';}}
  const params=new URLSearchParams(location.search);
  keys.forEach(key=>{if(params.has(key))put(key,params.get(key).slice(0,500));});
  if(!get('captured')){if(!get('landing_page'))put('landing_page',cleanURL(location.href));put('referrer',cleanURL(document.referrer));put('captured','1');}
  if(config.gtmEnabled===true&&(config.trackingHosts||[]).includes(location.hostname)&&/^GTM-[A-Z0-9]+$/.test(config.gtmContainerId)) {
    window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
    const script=document.createElement('script');script.async=true;
    script.src='https://www.googletagmanager.com/gtm.js?id='+config.gtmContainerId;document.head.append(script);
  }
  function event(kind,source,callback){
    // Deliberately no names, phone numbers, contact IDs, URL queries or free text.
    const payload={event:config.events[kind],[config.formParameter]:pageType+':'+source,page_type:pageType};
    if(callback){payload.eventCallback=callback;payload.eventTimeout=1800;}
    window.dataLayer.push(payload);
    if(config.debug)console.info('[Cristal form]',config.events[kind],pageType+':'+source);
  }
  const digits=value=>value.replace(/\D/g,'');
  function nationalPhone(value){const d=digits(value);return (d.length===12||d.length===13)&&d.startsWith('55')?d.slice(2):d;}
  function mask(value){const d=nationalPhone(value).slice(0,11);if(d.length<3)return d?'('+d:'';const split=d.length>10?7:6;return '('+d.slice(0,2)+') '+d.slice(2,split)+(d.length>split?'-'+d.slice(split):'');}
  const dialog=document.createElement('dialog');dialog.className='lead-dialog';dialog.id='atendimento';dialog.setAttribute('aria-labelledby','lead-dialog-title');
  dialog.innerHTML=`<button class="lead-close" type="button" aria-label="Fechar formulário">×</button><p class="eyebrow">ATENDIMENTO CRISTAL</p><h2 id="lead-dialog-title">Vamos encontrar sua carta?</h2><p id="lead-context" class="lead-context"></p><form data-cristal-lead novalidate><div class="field"><label for="popup-name">Seu nome</label><input id="popup-name" name="nome" autocomplete="name" maxlength="100" required></div><div class="field"><label for="popup-phone">WhatsApp com DDD</label><input id="popup-phone" name="telefone" inputmode="tel" autocomplete="tel-national" placeholder="(61) 99999-9999" maxlength="20" required></div><div class="field" data-interest-field><label for="popup-interest">O que você procura?</label><select id="popup-interest" name="interesse"><option>Carta de imóvel</option><option>Carta de veículo</option><option>Ainda estou avaliando</option></select></div><p class="lead-privacy">Usaremos seus dados para responder à solicitação. <a href="/politica-de-privacidade/">Política de Privacidade</a>.</p><button class="button button-primary button-full" type="submit">Enviar e continuar no WhatsApp</button><p class="form-feedback" role="status" aria-live="polite"></p></form>`;
  document.body.append(dialog);
  let context=null,source='contato',started=false,opener=null,parentDialog=null,sending=false;
  const knownContexts=new WeakMap();
  window.CristalLead={setContext:(element,value)=>knownContexts.set(element,value),open};
  function open(element){
    if(sending)return;
    opener=element;context=knownContexts.get(element)||null;
    if(!context&&element?.dataset.leadAsset){
      context={type:element.dataset.leadAsset};
      try{context.summary=decodeURIComponent(element.dataset.leadSummary||'').slice(0,1800);}catch{}
    }
    if(!context&&document.body.dataset.catalogueType)context={type:document.body.dataset.catalogueType};
    if(!context&&pageType==='simulador'&&/^(strategy|leverage)-whatsapp/.test(element?.id||'')){
      let message='';try{message=new URL(element.href).searchParams.get('text')||'';}catch{}
      context={type:/veículo|automóvel/i.test(message)?'veiculo':'imovel',summary:message.slice(0,1800)};
    }
    const section=element?.closest('section')?.id;
    const sourceHint=element?.dataset.ctaSource==='atendimento'?(element.classList.contains('nav-cta')?'menu':element.classList.contains('whatsapp-float')?'flutuante':section||'atendimento'):element?.dataset.ctaSource;
    source=(sourceHint||'cta').replace(/[^a-z0-9-]/gi,'').slice(0,60)||'cta';started=false;
    const label=context?.credit?`Carta de ${context.type==='veiculo'?'veículo':'imóvel'} · ${context.admin} · ${context.credit}`:context?.type?`Tenho interesse em carta de ${context.type==='veiculo'?'veículo':'imóvel'}.`:'';
    dialog.querySelector('#lead-context').textContent=label;
    dialog.querySelector('[data-interest-field]').hidden=Boolean(context?.type);
    dialog.querySelector('.form-feedback').textContent='';
    parentDialog=element?.closest('dialog');if(parentDialog?.open)parentDialog.close();
    event('view',source);if(!dialog.open)dialog.showModal();dialog.querySelector('input').focus();
  }
  function close(){if(!sending){dialog.close();if(parentDialog&&!parentDialog.open)parentDialog.showModal();opener?.focus();}}
  dialog.querySelector('.lead-close').addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-cta-popup],a[href="#atendimento"],a[href*="wa.me/"]');
    if(!link||link.closest('#atendimento'))return;
    e.preventDefault();open(link);
  });
  const forms=[dialog.querySelector('form'),...document.querySelectorAll('#lead-form')];
  const formStarts=new WeakSet();
  let inlineSeen=false;
  const inline=document.querySelector('#lead-form');
  if(inline&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!inlineSeen){inlineSeen=true;event('view','contato');observer.disconnect();}},{threshold:.3});observer.observe(inline);}
  const attempts=new Map();
  async function identity(payload){
    const stable=JSON.stringify(payload);
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable)))).map(n=>n.toString(16).padStart(2,'0')).join('');
    const key='cristal_site_submission_'+hash;
    let previous=attempts.get(key);try{previous=previous||JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
    const state=previous||{id:crypto.randomUUID(),created:new Date().toISOString(),saved:false};
    persist(key,state);return {key,state};
  }
  function persist(key,state){attempts.set(key,state);try{sessionStorage.setItem(key,JSON.stringify(state));}catch{}}
  async function submit(form){
    if(sending)return;
    const feedback=form.querySelector('.form-feedback'),name=form.elements.nome,phone=form.elements.telefone;
    const cleanName=name.value.trim().replace(/\s+/g,' '),number=nationalPhone(phone.value);
    if(cleanName.length<2){feedback.textContent='Informe seu nome.';name.focus();return;}
    if(!/^[1-9]\d{9,10}$/.test(number)||/^(\d)\1+$/.test(number)){feedback.textContent='Informe um WhatsApp válido com DDD.';phone.focus();return;}
    const modal=form.closest('dialog')===dialog,leadContext=modal?context:document.body.dataset.catalogueType?{type:document.body.dataset.catalogueType}:null;
    const interest=leadContext?.type?`Carta de ${leadContext.type==='veiculo'?'veículo':'imóvel'}`:form.elements.interesse.value;
    const payload={nome:cleanName,telefone:'+55'+number,interesse:interest,context:leadContext,pagina:cleanURL(location.href),page_type:pageType,form_nome:pageType+':'+(modal?source:'contato'),origem:'site-cristal'};
    keys.concat(['landing_page','referrer']).forEach(key=>{payload[key]=get(key);});
    sending=true;forms.forEach(f=>{f.querySelector('[type="submit"]').disabled=true;});
    feedback.textContent='Salvando seu contato…';
    try {
      const {key,state}=await identity(payload);payload.id=state.id;payload.data=state.created;
      let recordConversion=false;
      if(!state.saved){
        const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const result=await response.json().catch(()=>({}));
        if(!response.ok||result.saved!==true){
          if(result.code==='REVIEW_REQUIRED')throw Error('O envio está sendo conferido. Não repita o cadastro; tente novamente mais tarde.');
          throw Error(result.code==='CONFIGURATION_REQUIRED'?'O formulário ainda está sendo configurado. Tente novamente mais tarde.':'Não foi possível confirmar o cadastro. Seus dados continuam preenchidos; tente novamente.');
        }
        state.saved=true;persist(key,state);recordConversion=true;
      }
      const specific=leadContext?.credit?`na carta de ${leadContext.type==='veiculo'?'veículo':'imóvel'} da ${leadContext.admin}, de ${leadContext.credit}`:interest.toLowerCase();
      const message=`Olá, meu nome é ${cleanName}. Conheci a Cristal através do ${get('utm_source')||'site'} e tenho interesse em ${specific}.`+(leadContext?.summary?'\n\n'+leadContext.summary:'');
      feedback.textContent='Contato salvo. Abrindo o WhatsApp…';
      // Same-tab navigation only after the site's Apps Script has acknowledged storage.
      const destination='https://wa.me/'+config.whatsapp+'?text='+encodeURIComponent(message);
      // Give configured tags a bounded chance to flush without adding PII to dataLayer.
      await new Promise(resolve=>{
        let redirected=false;const go=()=>{if(!redirected){redirected=true;location.assign(destination);resolve();}};
        if(recordConversion&&config.gtmEnabled){event('saved',modal?source:'contato',go);setTimeout(go,1800);}else{if(recordConversion)event('saved',modal?source:'contato');go();}
      });
    } catch(error){feedback.textContent=/^(Não |O envio|O formulário)/.test(error.message||'')?error.message:'Não foi possível conectar. Seus dados continuam preenchidos; tente novamente.';}
    finally{sending=false;forms.forEach(f=>{f.querySelector('[type="submit"]').disabled=false;});}
  }
  forms.forEach(form=>{
    if(form===inline&&document.body.dataset.catalogueType){form.elements.interesse.value=document.body.dataset.catalogueType==='veiculo'?'Carta de veículo':'Carta de imóvel';form.elements.interesse.closest('.field').hidden=true;}
    form.elements.telefone.addEventListener('input',e=>{e.target.value=mask(e.target.value);});
    form.addEventListener('focusin',()=>{
      if(form.closest('dialog')===dialog){if(!started){started=true;event('start',source);}}
      else if(!formStarts.has(form)){formStarts.add(form);if(!inlineSeen){inlineSeen=true;event('view','contato');}event('start','contato');}
    });
    form.addEventListener('submit',e=>{e.preventDefault();submit(form);});
  });
})();
