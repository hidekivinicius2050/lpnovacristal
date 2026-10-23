/* Site principal/Google only. Never included by quiz, agradecimento or propostas. */
window.CristalLeadConfig = Object.freeze({
  endpoint: '/api/leads',
  whatsapp: '556133283000',
  // User relayed the Google owner's instruction to use Contêiner Padrão.json.
  // Its container is GTM-K3R4J649; activation awaits tag review and preview validation.
  gtmContainerId: 'GTM-K3R4J649',
  gtmEnabled: false,
  trackingHosts: Object.freeze(['www.cristalconsorcios.com.br']),
  events: Object.freeze({ view: 'open_form', start: 'form_start', saved: 'form_submit' }),
  formParameter: 'form_name'
});
