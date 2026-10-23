/* Site principal/Google only. Never included by quiz, agradecimento or propostas. */
window.CristalLeadConfig = Object.freeze({
  endpoint: '/api/leads',
  whatsapp: '556133283000',
  // User relayed the Google owner's instruction to use Contêiner Padrão.json.
  // Loaded by tracking-consent.js only after an explicit optional-cookie choice.
  gtmContainerId: 'GTM-K3R4J649',
  gtmEnabled: true,
  trackingHosts: Object.freeze(['www.cristalconsorcios.com.br']),
  events: Object.freeze({ view: 'open_form', start: 'form_start', saved: 'form_submit' }),
  formParameter: 'form_name'
});
