(function () {
  'use strict';
  if (/^\/(quiz|agradecimento|propostas)(\/|$)/.test(location.pathname)) return;
  const config = window.CristalLeadConfig;
  if (!config) return;
  const allowed = config.gtmEnabled === true &&
    (config.trackingHosts || []).includes(location.hostname) &&
    /^GTM-[A-Z0-9]+$/.test(config.gtmContainerId);
  if (!allowed && config.previewConsent !== true) return;

  window.dataLayer = window.dataLayer || [];
  const path = location.pathname;
  const pageType = path.startsWith('/carta-contemplada-imovel') ? 'carta-imovel' :
    path.startsWith('/carta-contemplada-veiculo') ? 'carta-veiculo' :
    path.startsWith('/simulador') ? 'simulador' : path === '/conteudo/' ? 'conteudo' :
    path.startsWith('/conteudo/') ? 'artigo' : path === '/' ? 'home' : 'institucional';
  window.dataLayer.push({ page_type: pageType });
  function command() { window.dataLayer.push(arguments); }
  function consent(granted) {
    const value = granted ? 'granted' : 'denied';
    return { ad_storage: value, analytics_storage: value,
      ad_user_data: value, ad_personalization: value };
  }
  // Set the default before any Google tag is loaded. Never infer agreement.
  command('consent', 'default', { ...consent(false),
    functionality_storage: 'granted', security_storage: 'granted' });
  let choice = null, loaded = false;
  try {
    const saved = JSON.parse(localStorage.getItem('consent_v1') || 'null');
    if (saved && typeof saved.granted === 'boolean' && saved.version === 1 &&
        saved.at <= Date.now() && Date.now() - saved.at < 180 * 86400000) choice = saved;
  } catch {}
  function load() {
    if (!allowed || loaded) return;
    loaded = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + config.gtmContainerId;
    document.head.append(script);
  }
  if (choice) {
    command('consent', 'update', consent(choice.granted));
    if (choice.granted) load();
  }

  const banner = document.createElement('section');
  banner.className = 'tracking-consent';
  banner.setAttribute('aria-labelledby', 'tracking-consent-title');
  banner.hidden = Boolean(choice);
  banner.innerHTML = '<div><strong id="tracking-consent-title">Sua escolha sobre cookies</strong>' +
    '<p>Usamos cookies opcionais para medir visitas e campanhas. Você pode aceitar ou continuar apenas com os essenciais. ' +
    '<a href="/politica-de-privacidade/">Política de Privacidade</a>.</p></div>' +
    '<div class="tracking-consent-actions"><button type="button" data-consent="deny">Somente essenciais</button>' +
    '<button type="button" data-consent="accept">Aceitar opcionais</button></div>';
  document.body.append(banner);
  function choose(granted) {
    choice = { granted, version: 1, at: Date.now() };
    try { localStorage.setItem('consent_v1', JSON.stringify(choice)); } catch {}
    command('consent', 'update', consent(granted));
    banner.hidden = true;
    if (granted) load();
  }
  banner.querySelector('[data-consent="deny"]').addEventListener('click', () => choose(false));
  banner.querySelector('[data-consent="accept"]').addEventListener('click', () => choose(true));
  const preferences = document.createElement('button');
  preferences.type = 'button';
  preferences.className = 'tracking-preferences';
  preferences.textContent = 'Preferências de cookies';
  preferences.addEventListener('click', () => {
    banner.hidden = false;
    banner.querySelector('[data-consent="deny"]').focus();
  });
  (document.querySelector('.site-footer') || document.body).append(preferences);
})();
