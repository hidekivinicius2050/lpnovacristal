/* Public-page interaction polish; capture, tracking and financial modules retain their rules. */
(() => {
 'use strict';
 const icon = name => {
  const paths = {
   phone:'M6 3H3v4c0 8 6 14 14 14h4v-3l-5-2-2 2c-4-1-7-4-8-8l2-2-2-5Z',
   mail:'M3 5h18v14H3Z M3 6l9 7 9-7',
   pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
   home:'M3 11 12 3l9 8 M5 9v12h14V9 M9 21v-7h6v7',
   car:'m4 9 2-5h12l2 5 M3 9h18v9H3Z M5 18v3 M19 18v3 M6 13h1 M17 13h1',
   compare:'M7 3v18M17 3v18 M3 7l4-4 4 4 M13 17l4 4 4-4',
   chart:'M4 3v18h17 M8 15l4-5 4 3 5-7',
   bank:'m3 8 9-5 9 5 M3 9h18 M5 11v7 M12 11v7 M19 11v7 M3 21h18',
   check:'m5 12 4 4L19 6',
   shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z m-4 9 3 3 5-6',
   file:'M14 3H5v18h14V8Z M14 3v5h5 M8 13h8 M8 17h5',
   left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6'
  };
  return `<svg class="refine-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${paths[name]||paths.check}"/></svg>`;
 };
 function init() {
  // Align focusability with the shared CSS breakpoint, including the standalone simulator header.
  const menuToggle=document.querySelector('.site-header .menu-toggle'),menu=document.querySelector('.site-header .main-nav');
  if(menuToggle&&menu){
   const compact=matchMedia('(max-width: 1040px)');
   const syncMenu=()=>menu.toggleAttribute('inert',compact.matches&&menuToggle.getAttribute('aria-expanded')!=='true');
   new MutationObserver(syncMenu).observe(menuToggle,{attributes:true,attributeFilter:['aria-expanded']});
   compact.addEventListener('change',syncMenu);syncMenu();
  }
  for (const [selector,name] of [['.contact-details a[href^="tel:"] > span','phone'],['.contact-details a[href^="mailto:"] > span','mail'],['.contact-details a[href*="maps"] > span','pin'],['[data-simulation-mode="consorcio"] .mode-icon','home'],['[data-simulation-mode="financiamento"] .mode-icon','bank'],['[data-simulation-mode="comparar"] .mode-icon','compare'],['[data-simulation-asset="imovel"] > span','home'],['[data-simulation-asset="veiculo"] > span','car']]) document.querySelectorAll(selector).forEach(el=>{el.innerHTML=icon(name);el.setAttribute('aria-hidden','true');});
  document.querySelectorAll('.check-list li > span').forEach(el=>{el.innerHTML=icon('check');el.setAttribute('aria-hidden','true');});
  document.querySelectorAll('.trust-icon').forEach((el,index)=>{el.innerHTML=icon(['shield','bank','file'][index]||'shield');el.setAttribute('aria-hidden','true');});
  const reviews=document.querySelector('.testimonial-grid');
  if(reviews){
   reviews.tabIndex=0;reviews.setAttribute('role','region');reviews.setAttribute('aria-label','Depoimentos de clientes');
   const controls=document.createElement('div');controls.className='review-controls';
   controls.innerHTML=`<button type="button" aria-label="Avaliação anterior">${icon('left')}</button><span role="status">1 de ${reviews.children.length}</span><button type="button" aria-label="Próxima avaliação">${icon('right')}</button>`;
   reviews.before(controls);
   const [previous,next]=controls.querySelectorAll('button');let step=0;
   const measure=()=>{step=(reviews.firstElementChild?.getBoundingClientRect().width||0)+16;update();};
   const update=()=>{const index=step?Math.round(reviews.scrollLeft/step):0;controls.querySelector('span').textContent=`${index+1} de ${reviews.children.length}`;previous.disabled=reviews.scrollLeft<4;next.disabled=reviews.scrollLeft>=reviews.scrollWidth-reviews.clientWidth-4;};
   const move=direction=>reviews.scrollBy({left:direction*step,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
   reviews.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}});
   let queued=false;reviews.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;update();});}},{passive:true});
   if('ResizeObserver' in window)new ResizeObserver(measure).observe(reviews);measure();
   reviews.querySelectorAll('footer small').forEach(el=>el.setAttribute('aria-label','Avaliação de cinco estrelas no Google'));
  }
  for(const form of document.querySelectorAll('#lead-form,form[data-cristal-lead]')){
   const feedback=form.querySelector('.form-feedback'),button=form.querySelector('[type="submit"]');
   if(!feedback||!button)continue;
   const sync=()=>{const text=feedback.textContent.trim();const state=text.startsWith('Contato salvo')?'success':button.disabled?'loading':/^(Não |Informe |O envio|O formulário)/.test(text)?'error':'';feedback.dataset.state=state;form.setAttribute('aria-busy',String(button.disabled));};
   const observer=new MutationObserver(sync);observer.observe(feedback,{childList:true,subtree:true});observer.observe(button,{attributes:true,attributeFilter:['disabled']});sync();
  }
  const hero=document.querySelector('.home-motion .hero'),photo=hero?.querySelector('.hero-photo');
  if(photo){
   const motion=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer:fine)');let queued=false;let heroHeight=hero.offsetHeight;
   if('ResizeObserver' in window)new ResizeObserver(()=>{heroHeight=hero.offsetHeight;}).observe(hero);
   const update=()=>{queued=false;const y=motion.matches||!fine.matches?0:Math.min(16,Math.max(0,scrollY)*.024);photo.style.setProperty('--hero-shift',`${y}px`);};
   addEventListener('scroll',()=>{if(scrollY<heroHeight+100&&!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
   motion.addEventListener('change',update);fine.addEventListener('change',update);update();
  }
 }
 document.addEventListener('DOMContentLoaded',init,{once:true});
})();
