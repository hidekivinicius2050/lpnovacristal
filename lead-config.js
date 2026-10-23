/* Site principal/Google only. Never included by quiz, agradecimento or propostas. */
window.CristalLeadConfig = Object.freeze({
  endpoint: '/api/leads',
  whatsapp: '556133283000',
  // Found on the old Cristal site. Activation/events still await the Google owner's review.
  gtmContainerId: 'GTM-WLHD5Q2F',
  gtmEnabled: false,
  trackingHosts: Object.freeze(['www.cristalconsorcios.com.br']),
  events: Object.freeze({ view: 'form_visto', start: 'form_iniciado', saved: 'lead_enviado' }),
  formParameter: 'form_nome'
});
