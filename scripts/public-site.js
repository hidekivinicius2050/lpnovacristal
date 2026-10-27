'use strict';
const company=require('../company-data');
const ORIGIN='https://www.cristalconsorcios.com.br';
const strip=s=>s.replace(/<span[^>]*>\+<\/span>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
function organization(home=false){
 const node={'@type':['Organization','FinancialService'],'@id':ORIGIN+'/#localbusiness',name:company.brandName,legalName:company.legalName,alternateName:company.tradeName,url:ORIGIN+'/',logo:ORIGIN+'/assets/logo.png',taxID:company.taxId,email:company.email,telephone:company.phoneE164,address:{'@type':'PostalAddress',streetAddress:company.address.streetAddress,addressLocality:company.address.city,addressRegion:company.address.state,postalCode:company.address.postalCode.replace(/\D/g,''),addressCountry:'BR'},hasMap:company.mapUrl,areaServed:[{'@type':'City',name:'Brasília'},{'@type':'State',name:'Distrito Federal'}],openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday'],opens:'08:00',closes:'18:00'}]};
 node.openingHoursSpecification[0].opens=company.weekdayHours.opens;node.openingHoursSpecification[0].closes=company.weekdayHours.closes;
 if(home){node.foundingDate=company.foundingDate;node.founder=company.founders.map(name=>({'@type':'Person',name}));}
 return node;
}
function decorate(html,route='/'){
 if(/^\/(quiz|agradecimento|propostas)(\/|$)/.test(route))throw Error('Protected route cannot be decorated: '+route);
 html=html.replaceAll('https://lpnovacristal.vercel.app',ORIGIN).replace(/href="https:\/\/cristalconsorcios.com\/politica-de-privacidade(?:\.html)?"(?: target="_blank")?(?: rel="noopener")?/g,'href="/politica-de-privacidade/"');
 html=html.replace(/<link rel="canonical" href="[^"]+">/,`<link rel="canonical" href="${ORIGIN}${route}">`).replace(/<meta property="og:url" content="[^"]+">/,`<meta property="og:url" content="${ORIGIN}${route}">`);
 html=html.replace(/<body(?![^>]*class=)([^>]*)>/,'<body class="public-site"$1>').replace(/<body class="(?!public-site)([^"]*)"/,'<body class="public-site $1"');
 const nodes=[];
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
  const data=JSON.parse(match[1]);nodes.push(...(data['@graph']|| (Array.isArray(data)?data:[data])));
 }
 const rest=nodes.filter(n=>!(Array.isArray(n['@type'])?n['@type'].includes('Organization'):['Organization','WebSite','WebPage','FAQPage','Service'].includes(n['@type']))).map(n=>{const copy=JSON.parse(JSON.stringify(n).replaceAll('#organization','#localbusiness'));delete copy['@context'];return copy;});
 const title=strip(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]||company.brandName);
 const graph=[organization(route==='/'),{'@type':'WebSite','@id':ORIGIN+'/#website',url:ORIGIN+'/',name:company.brandName,publisher:{'@id':ORIGIN+'/#localbusiness'},inLanguage:'pt-BR'},{'@type':'WebPage','@id':ORIGIN+route+'#webpage',url:ORIGIN+route,name:title,isPartOf:{'@id':ORIGIN+'/#website'},inLanguage:'pt-BR'},...rest.filter(n=>n['@type']!=='BreadcrumbList'||!['/carta-contemplada-imovel/','/carta-contemplada-veiculo/'].includes(route))];
 if(!graph.some(n=>n['@type']==='BreadcrumbList')&&route!=='/')graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Início',item:ORIGIN+'/'},{'@type':'ListItem',position:2,name:title,item:ORIGIN+route}]});
 if(route==='/'||route.startsWith('/carta-contemplada-')){
  const faq=[...html.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map(m=>({'@type':'Question',name:strip(m[1]),acceptedAnswer:{'@type':'Answer',text:strip(m[2])}}));
  if(faq.length)graph.push({'@type':'FAQPage',mainEntity:faq});
  for(const type of ['imovel','veiculo'])if(route==='/'||route.includes(type))graph.push({'@type':'Service',name:`Carta contemplada de ${type==='imovel'?'imóvel':'veículo'} em Brasília`,serviceType:'Intermediação e consultoria de cartas contempladas',url:ORIGIN+`/carta-contemplada-${type}/`,provider:{'@id':ORIGIN+'/#localbusiness'},areaServed:{'@type':'City',name:'Brasília'}});
 }
 html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g,'');
 const schema=JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c');
 html=html.replace('</head>',`<script type="application/ld+json">${schema}</script>\n  </head>`);
 if(!html.includes('lead-capture.js'))html=html.replace('</head>','<link rel="stylesheet" href="/commercial.css?v=20261023">\n    <script defer src="/lead-config.js?v=20261023"></script>\n    <script defer src="/lead-capture.js?v=20261023"></script>\n  </head>');
 if(!html.includes('tracking-consent.js'))html=html.replace('<script defer src="/lead-capture.js', '<script defer src="/tracking-consent.js?v=20261023"></script>\n    <script defer src="/lead-capture.js');
 html=html.replace(/<aside class="cookie-banner"[^>]*>[\s\S]*?<\/aside>\s*/g,'');
 // Commercial CTAs no longer navigate before capture. Existing non-commercial links are retained.
 html=html.replace(/<a\b[^>]*href="https:\/\/wa\.me\/[^\"]*"[^>]*>/g,tag=>tag.replace(/href="[^"]*"/,'href="#atendimento" data-cta-popup data-cta-source="atendimento"').replace(/ target="_blank"/g,''));
 // Keep a compact header: customers choose the asset inside Cartas disponíveis.
 html=html.replace(/<nav class="main-nav"[\s\S]*?<\/nav>/g,nav=>{
  nav=nav.replace(/<a\b[^>]*href="\/carta-contemplada-(?:imovel|veiculo)\/(?:#cartas)?"[^>]*>Carta de (?:imóvel|veículo)<\/a>\s*/g,'');
  if(!nav.includes('>Simulador</a>'))nav=nav.replace(/<\/nav>/,'<a href="/simulador/">Simulador</a></nav>');
  return nav;
 });
 html=html.replace(/href="https:\/\/cristalconsorcios.com[^\"]*politica[^\"]*"/g,'href="/politica-de-privacidade/"');
 if(!html.includes('class="footer-policy" href="/termos-de-uso/"'))html=html.replace(/(<a class="footer-policy"[^>]*>Política de Privacidade<\/a>)/,'$1<a class="footer-policy" href="/termos-de-uso/">Termos de Uso</a>');
 if(!html.includes('apple-touch-icon'))html=html.replace('</head>','<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">\n  </head>');
 const sizes=require('../assets/image-sizes.json');
 html=html.replace(/<img\b[^>]*>/g,tag=>{
  const src=tag.match(/src="([^"]+)"/)?.[1],size=src&&sizes[src.split('/').at(-1)];
  if(size&&!tag.includes('width='))tag=tag.replace(/>$/,` width="${size[0]}" height="${size[1]}">`);
  if(!tag.includes('loading=')&&!tag.includes('fetchpriority=')&&!/logo\.png/.test(src||''))tag=tag.replace(/>$/,' loading="lazy">');
  return tag;
 });
 if(!html.includes('/site-refinements.css'))html=html.replace('</head>','<link rel="stylesheet" href="/site-refinements.css?v=20261027-polimento-final">\n    <script defer src="/site-refinements.js?v=20261027-polimento-final"></script>\n  </head>');
 return html;
}
module.exports={ORIGIN,decorate,organization};
