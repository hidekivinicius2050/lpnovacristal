/* Catalogue tools share the site's required lead form. No WhatsApp bypass. */
(() => {
  'use strict';
  if (!document.body.classList.contains('catalogue-enhanced')) return;
  const grid = document.querySelector('#cards-grid');
  const catalogue = document.querySelector('#cartas');
  const panel = document.querySelector('.filter-panel');
  if (!grid || !catalogue || !panel) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const asset = letter => letter.type === 'veiculo' ? 'Veículo' : 'Imóvel';
  const shortSummary = letter => `${asset(letter)} | ${letter.admin}\nCrédito: ${letter.credit}\nEntrada: Consultar\nParcelas restantes: ${letter.termValue}\nParcela: ${letter.installment}\nCondições: ${letter.observation}`;
  let letters = new Map();
  const selected = new Set();
  let catalogueVisible = false;
  let comparisonOpener;
  let comparisonResize;

  const feedback = document.createElement('p');
  feedback.id = 'compare-feedback';
  feedback.className = 'compare-feedback';
  feedback.setAttribute('role', 'status');
  document.querySelector('.catalogue-notice').after(feedback);
  const say = message => {
    feedback.textContent = message;
    if (selected.size) tray.querySelector('#compare-selection-summary').textContent = message;
  };

  const tray = document.createElement('aside');
  tray.className = 'compare-tray';
  tray.hidden = true;
  tray.setAttribute('aria-label', 'Cartas selecionadas para comparação');
  tray.innerHTML = `<div class="compare-tray-copy"><strong id="compare-selection-label"></strong><span id="compare-selection-summary"></span></div><div class="compare-tray-actions"><button class="button button-primary" id="compare-open" type="button">Comparar cartas</button><button class="compare-clear" type="button">Limpar</button></div>`;
  document.body.append(tray);
  const compareOpen = tray.querySelector('#compare-open');

  const dialog = document.createElement('dialog');
  dialog.id = 'compare-dialog';
  dialog.className = 'compare-dialog';
  dialog.setAttribute('aria-labelledby', 'compare-title');
  dialog.innerHTML = `<button class="modal-close compare-close" type="button" aria-label="Fechar comparação">×</button><p class="eyebrow">SUAS OPÇÕES</p><h2 id="compare-title">Compare suas cartas.</h2><p class="compare-intro">Veja as condições lado a lado e escolha quais opções quer conversar com a nossa equipe.</p><p class="compare-scroll-hint">Deslize a tabela para ver todas as opções.</p><div class="comparison-scroll" role="region" aria-label="Tabela de comparação de cartas" tabindex="0"></div><div class="comparison-mobile"></div><p class="compare-disclaimer">Valores e prazos atuais. Consulte a entrada, os reajustes e as condições de cada carta com a equipe.</p><a href="#atendimento" data-cta-popup data-cta-source="comparador-cartas" class="button button-primary button-full compare-contact">Conversar sobre estas cartas</a><p class="compare-form-note">Preencha o formulário para continuar no WhatsApp com as opções selecionadas.</p>`;
  document.body.append(dialog);
  function closeComparison() {
    dialog.close();
    if (comparisonOpener && !comparisonOpener.disabled && !tray.hidden) comparisonOpener.focus();
    else grid.querySelector('.letter-compare')?.focus();
  }
  dialog.querySelector('.compare-close').addEventListener('click', closeComparison);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeComparison(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeComparison(); });

  function renderComparison() {
    const cards = [...selected].map(id => letters.get(id)).filter(Boolean);
    if (cards.length < 2) { if (dialog.open) closeComparison(); return; }
    const rows = [
      ['Crédito', letter => letter.credit, 'credit'],
      ['Parcela atual', letter => letter.installment, 'installment'],
      ['Parcelas restantes', letter => `${letter.termValue} parcelas`, 'term'],
      ['Entrada', () => 'Consultar', 'entry'],
      ['Tipo', asset, 'type'],
      ['Condições', letter => letter.observation, 'observation']
    ];
    dialog.querySelector('.comparison-scroll').innerHTML = `<table class="comparison-table"><caption class="sr-only">Condições das cartas selecionadas</caption><thead><tr><th scope="col">Condições</th>${cards.map(letter => `<th scope="col"><strong>${esc(letter.admin)}</strong><button type="button" class="compare-remove" data-remove-id="${esc(letter.id)}" aria-label="Retirar carta de ${esc(letter.credit)} da ${esc(letter.admin)}">Retirar</button></th>`).join('')}</tr></thead><tbody>${rows.map(([name, value, field]) => `<tr data-compare-field="${field}"><th scope="row">${name}</th>${cards.map(letter => `<td>${esc(value(letter))}</td>`).join('')}</tr>`).join('')}<tr class="compare-table-actions"><th scope="row">Atendimento</th>${cards.map(letter => `<td><a href="#atendimento" class="compare-card-contact" data-cta-popup data-cta-source="comparador-carta" data-contact-id="${esc(letter.id)}">Tenho interesse nesta carta</a></td>`).join('')}</tr></tbody></table>`;
    const mobileArea = dialog.querySelector('.comparison-mobile');
    mobileArea.innerHTML = `<div class="comparison-mobile-nav"><button type="button" data-compare-prev aria-label="Ver opções anteriores">‹</button><span role="status" data-compare-page></span><button type="button" data-compare-next aria-label="Ver próximas opções">›</button></div><div class="comparison-mobile-grid" tabindex="0" role="region" aria-label="Cartas comparadas, duas opções por vez">${cards.map((letter,index) => `<article class="comparison-option"><header><span>Opção ${index+1}</span><strong>${esc(letter.admin)}</strong><button type="button" class="compare-remove" data-remove-id="${esc(letter.id)}" aria-label="Retirar opção ${index+1}, carta de ${esc(letter.credit)} da ${esc(letter.admin)}">Retirar</button></header><dl><div><dt>Crédito</dt><dd class="compare-mobile-credit">${esc(letter.credit)}</dd></div><div><dt>Parcela atual</dt><dd class="compare-mobile-payment">${esc(letter.installment)}</dd></div><div><dt>Parcelas restantes</dt><dd>${letter.termValue} parcelas</dd></div><div><dt>Entrada</dt><dd>Consultar</dd></div><div><dt>Tipo</dt><dd>${asset(letter)}</dd></div></dl><p class="compare-mobile-observation">${esc(letter.observation)}</p><a href="#atendimento" data-cta-popup data-cta-source="comparador-carta" data-contact-id="${esc(letter.id)}" class="compare-card-contact">Tenho interesse</a></article>`).join('')}</div>`;
    const mobileGrid = mobileArea.querySelector('.comparison-mobile-grid');
    const previous = mobileArea.querySelector('[data-compare-prev]');
    const next = mobileArea.querySelector('[data-compare-next]');
    const updatePage = () => {
      const last = mobileGrid.scrollLeft > (mobileGrid.scrollWidth-mobileGrid.clientWidth)/2 && cards.length === 3;
      mobileArea.querySelector('[data-compare-page]').textContent = cards.length === 2 ? '2 opções lado a lado' : `Opções ${last ? '2 e 3' : '1 e 2'} de 3`;
      previous.disabled = cards.length === 2 || mobileGrid.scrollLeft < 4;
      next.disabled = cards.length === 2 || mobileGrid.scrollLeft >= mobileGrid.scrollWidth-mobileGrid.clientWidth-4;
    };
    const move = last => { mobileGrid.scrollTo({left:last ? mobileGrid.scrollWidth-mobileGrid.clientWidth : 0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); };
    previous.addEventListener('click',()=>move(false));next.addEventListener('click',()=>move(true));
    mobileGrid.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight');}});
    mobileGrid.addEventListener('scroll',updatePage,{passive:true});
    dialog.querySelector('.compare-scroll-hint').textContent = cards.length === 3 ? 'Compare duas opções por vez. Use as setas para ver a terceira.' : 'As duas opções aparecem lado a lado.';
    requestAnimationFrame(updatePage);
    comparisonResize?.disconnect();
    if ('ResizeObserver' in window) {
      comparisonResize = new ResizeObserver(updatePage);
      comparisonResize.observe(mobileGrid);
    }
    dialog.querySelectorAll('[data-remove-id]').forEach(button => button.addEventListener('click', () => {
      selected.delete(button.dataset.removeId); renderSelection();
      if (selected.size >= 2) dialog.querySelector('.compare-close').focus();
    }));
    dialog.querySelectorAll('[data-contact-id]').forEach(link => {
      const letter = letters.get(link.dataset.contactId);
      window.CristalLead?.setContext(link, {...letter, summary: shortSummary(letter).slice(0, 1800)});
    });
    const summary = 'Gostaria de avaliar estas cartas:\n\n' + cards.map((letter, index) => `Opção ${index + 1}\n${shortSummary(letter)}`).join('\n\n');
    window.CristalLead?.setContext(dialog.querySelector('.compare-contact'), {type:cards[0].type, summary:summary.slice(0, 1800)});
  }
  function updateTrayVisibility() { tray.hidden = !selected.size || !catalogueVisible; }
  function renderSelection() {
    const cards = [...selected].map(id => letters.get(id)).filter(Boolean);
    tray.querySelector('#compare-selection-label').textContent = `${cards.length} de 3 cartas selecionadas`;
    tray.querySelector('#compare-selection-summary').textContent = cards.length === 1 ? 'Escolha mais uma carta para comparar.' : cards.map(letter => `${letter.admin} · ${letter.credit}`).join(' / ');
    compareOpen.disabled = cards.length < 2;
    grid.querySelectorAll('[data-compare-id]').forEach(button => {
      const chosen = selected.has(button.dataset.compareId);
      const changed = button.getAttribute('aria-pressed') !== String(chosen);
      button.setAttribute('aria-pressed', String(chosen));
      if (changed) button.querySelector('svg').innerHTML = chosen ? '<path pathLength="1" class="selection-check" d="M5 12l4 4L19 6"/>' : '<path d="M8 3v18M16 3v18M4 7l4-4 4 4M12 17l4 4 4-4"/>';
      button.querySelector('span').textContent = chosen ? 'Selecionada para comparar' : 'Comparar esta carta';
      button.closest('.letter-card').classList.toggle('is-compared', chosen);
    });
    updateTrayVisibility();
    renderComparison();
  }
  function toggleCard(id) {
    const letter = letters.get(id);
    if (!letter) return;
    if (selected.has(id)) { selected.delete(id); say('Carta retirada da comparação.'); }
    else {
      const first = letters.get([...selected][0]);
      if (first && first.type !== letter.type) { say('Compare cartas do mesmo tipo. Limpe a seleção para trocar entre imóvel e veículo.'); return; }
      if (selected.size === 3) { say('Você já selecionou três cartas. Retire uma para escolher outra.'); return; }
      selected.add(id); say(`${selected.size} carta${selected.size > 1 ? 's' : ''} selecionada${selected.size > 1 ? 's' : ''}. Você pode comparar até três.`);
    }
    renderSelection();
  }
  function decorateCards() {
    grid.querySelectorAll('.letter-card[data-card-id]').forEach(card => {
      const id = card.dataset.cardId;
      if (card.querySelector('[data-compare-id]')) return;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'letter-compare'; button.dataset.compareId = id;
      button.setAttribute('aria-pressed', 'false');
      const letter = letters.get(id);
      button.setAttribute('aria-label', `Comparar carta de ${letter?.credit || ''} da ${letter?.admin || ''}`);
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v18M16 3v18M4 7l4-4 4 4M12 17l4 4 4-4"/></svg><span>Comparar esta carta</span>`;
      button.addEventListener('click', () => toggleCard(id));
      card.append(button);
      const observation = card.querySelector('.letter-observation');
      if (observation?.textContent.trim() === 'Condições disponíveis mediante consulta.') observation.classList.add('is-generic');
    });
    renderSelection();
    updateMobileCount();
    updateFilterChips();
  }
  compareOpen.addEventListener('click', () => {
    if (selected.size < 2) return;
    comparisonOpener = compareOpen; renderComparison(); dialog.showModal();
  });
  tray.querySelector('.compare-clear').addEventListener('click', () => {
    selected.clear(); renderSelection(); say('Seleção de comparação limpa.');
    grid.querySelector('.letter-compare')?.focus();
  });
  let queued = false;
  const gridObserver = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; decorateCards(); });
  });
  // Rendered cards replace grid children; our controls only change descendants.
  gridObserver.observe(grid, {childList:true});
  window.addEventListener('cristal:catalogue-updated', event => {
    letters = new Map(event.detail.letters.map(letter => [letter.id, letter]));
    let removed = false;
    [...selected].forEach(id => { if (!letters.has(id)) { selected.delete(id); removed = true; } });
    if (removed) say('A disponibilidade mudou. Atualizamos as cartas selecionadas.');
    renderSelection();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      catalogueVisible = entries[0].isIntersecting; updateTrayVisibility();
    }).observe(catalogue);
  } else catalogueVisible = true;

  const chips = document.createElement('div');
  chips.className = 'active-filter-chips'; chips.setAttribute('role','group'); chips.setAttribute('aria-label','Filtros aplicados'); chips.hidden = true;
  panel.after(chips);
  function updateFilterChips() {
    const active = [];
    const addInput = (id,label) => { const input=document.getElementById(id); if(input.value.trim()) active.push([`${label}: ${input.value}`,()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}]); };
    const category=document.querySelector('.catalogue-tab[aria-selected="true"]');
    if(category?.dataset.category!=='todos' && !document.body.dataset.catalogueType) active.push([category?.dataset.category==='imovel'?'Imóvel':'Veículo',()=>document.querySelector('[data-category="todos"]').click()]);
    addInput('search-input','Busca');
    const band=document.querySelector('.credit-band.active');
    if(band && band.dataset.creditBand!=='all') active.push([`Crédito: ${band.textContent.trim()}`,()=>document.querySelector('[data-credit-band="all"]').click()]);
    else addInput('credit-filter','Crédito até');
    addInput('installment-filter','Parcela até');
    for(const [id,label,base] of [['admin-filter','Administradora','all'],['term-filter','Prazo','all'],['sort-filter','Ordem','credit-desc']]){
      const select=document.getElementById(id);
      if(select.value!==base) active.push([`${label}: ${select.selectedOptions[0].textContent}`,()=>{select.value=base;select.dispatchEvent(new Event('change',{bubbles:true}));}]);
    }
    chips.replaceChildren(); chips.hidden = !active.length;
    active.forEach(([label,remove])=>{const button=document.createElement('button');button.type='button';button.className='filter-chip';button.setAttribute('aria-label',`Remover filtro ${label}`);button.innerHTML=`<span>${esc(label)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>`;button.addEventListener('click',()=>{remove();requestAnimationFrame(()=>{const target=chips.querySelector('button') || (mobile.matches?filterToggle:document.querySelector('#search-input'));target?.focus({preventScroll:true});});});chips.append(button);});
  }
  const mobile = window.matchMedia('(max-width: 700px)');
  panel.id = 'catalogue-filter-panel';
  const tools = document.createElement('div');
  tools.className = 'catalogue-mobile-tools';
  tools.innerHTML = `<button id="mobile-filter-toggle" type="button" aria-controls="catalogue-filter-panel" aria-expanded="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M6 12h12M9 18h6"/></svg>Filtrar cartas</button><span id="mobile-filter-count"></span>`;
  panel.before(tools);
  const filterToggle = tools.querySelector('button');
  const closeFilters = document.createElement('button');
  closeFilters.type = 'button'; closeFilters.className = 'mobile-filter-close';
  closeFilters.textContent = 'Ver resultados'; panel.append(closeFilters);
  let closed = false;
  function setClosed(value) {
    closed = value;
    panel.classList.toggle('mobile-filters-closed', mobile.matches && closed);
    panel.inert = mobile.matches && closed;
    filterToggle.setAttribute('aria-expanded', String(!mobile.matches || !closed));
  }
  function updateMobileCount() {
    const text = document.querySelector('#catalogue-result-count').textContent;
    tools.querySelector('#mobile-filter-count').textContent = text.includes('encontradas') ? text.replace(' cartas encontradas', ' opções') : 'Consulte as opções';
  }
  filterToggle.addEventListener('click', () => {
    setClosed(false); panel.classList.add('show');
    panel.scrollIntoView({block:'start', behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    panel.querySelector('input')?.focus({preventScroll:true});
  });
  closeFilters.addEventListener('click', () => {
    setClosed(true); filterToggle.focus({preventScroll:true});
    tools.scrollIntoView({block:'start',behavior:'instant'});
  });
  mobile.addEventListener('change', () => setClosed(closed));
  // Keep existing consent controls above the tray without covering either control.
  function updateConsentOffset() {
    const consent = document.querySelector('.tracking-consent');
    const height = consent && !consent.hidden && getComputedStyle(consent).display !== 'none' ? consent.getBoundingClientRect().height + 24 : 0;
    tray.style.setProperty('--consent-offset', `${height}px`);
  }
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(updateConsentOffset);
    const observeConsent = () => { const consent = document.querySelector('.tracking-consent'); if(consent) resize.observe(consent); updateConsentOffset(); };
    observeConsent();
    new MutationObserver(records => { if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType === 1 && node.matches?.('.tracking-consent')))) observeConsent(); }).observe(document.body,{childList:true});
  }
  if ('ResizeObserver' in window) new ResizeObserver(()=>{ document.documentElement.style.setProperty('--compare-tray-height',`${Math.ceil(tray.getBoundingClientRect().height)}px`); }).observe(tray);
  decorateCards();
})();
