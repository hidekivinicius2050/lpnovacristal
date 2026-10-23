'use strict';
const fs=require('node:fs'),path=require('node:path');
const {decorate,ORIGIN}=require('./public-site');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),s);};
const data=JSON.parse(read('data/cartas.json'));
const money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function summary(type){const cards=data.letters.filter(c=>!type||c.type===type);const values=cards.map(c=>c.credit).filter(n=>Number.isFinite(n)&&n>0);return `${cards.length} cartas${type==='imovel'?' de imóvel':type==='veiculo'?' de veículo':''} no catálogo publicado, com créditos de ${money(Math.min(...values))} a ${money(Math.max(...values))}. Referência: ${new Date(data.updatedAt).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}. Disponibilidade e condições devem ser confirmadas com a equipe.`;}
let home=read('index.html');
if(!home.includes('id="catalogue-static"'))home=home.replace('<div class="filter-panel','<p class="catalogue-static" id="catalogue-static"></p>\n          <div class="filter-panel');
home=home.replace(/(<p class="catalogue-static" id="catalogue-static">)[\s\S]*?(<\/p>)/,'$1'+summary()+'$2');
write('index.html',decorate(home,'/'));
write('simulador/index.html',decorate(read('simulador/index.html'),'/simulador/'));
for(const type of ['imovel','veiculo']){
 let html=read('index.html');const label=type==='imovel'?'imóvel':'veículo';const title=`Carta Contemplada de ${label==='imóvel'?'Imóvel':'Veículo'} em Brasília | Cristal Consórcios`;
 const description=`Carta contemplada de ${label} em Brasília: consulte crédito, prazo e parcela no catálogo da Cristal. Atendimento desde 1996 e acompanhamento da transferência.`;
 html=html.replace('<body class="public-site"','<body class="public-site commercial-page" data-catalogue-type="'+type+'"');
 html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${title}</title>`).replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*/g,'$1'+description).replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*/g,'$1'+title);
 html=html.replace(/<h1 id="hero-title">[\s\S]*?<\/h1>/,`<h1 id="hero-title">Carta contemplada de ${label} em Brasília, <em>decisão transparente.</em></h1>`).replace(/<p class="hero-copy">[\s\S]*?<\/p>/,`<p class="hero-copy">Encontre uma carta contemplada de ${label} em Brasília. Compare as opções e confirme entrada, documentação e condições com a equipe antes de negociar.</p>`);
 html=html.replace(/(<h2 id="cartas-title">)[\s\S]*?<\/h2>/,`$1Carta contemplada de ${label} em Brasília: veja as opções.</h2>`).replace(/(<p class="catalogue-static" id="catalogue-static">)[\s\S]*?(<\/p>)/,'$1'+summary(type)+'$2');
 html=html.replace('aria-label="Brasília, Distrito Federal: atendimento de carta contemplada da Cristal"',`aria-label="Carta contemplada de ${label} em Brasília: atendimento da Cristal"`);
 html=html.replace(/(src|href)="(assets\/|styles\.css|catalogue-data\.js|app\.js|conteudo\/)/g,'$1="/$2');
 html=html.replace('href="#topo"','href="/"').replace(/<a class="service-card[^>]*data-catalog-category="imovel">/,'<a class="service-card service-home" href="/carta-contemplada-imovel/">').replace(/<a class="service-card[^>]*data-catalog-category="veiculo">/,'<a class="service-card service-car" href="/carta-contemplada-veiculo/">');
 write(`carta-contemplada-${type}/index.html`,decorate(html,`/carta-contemplada-${type}/`));
}
const company=require('../company-data');
const pages={
 'politica-de-privacidade':{title:'Política de Privacidade',description:'Como a Cristal Consórcios utiliza os dados enviados para atendimento e como solicitar acesso, correção ou exclusão.',sections:[
 ['Dados que você fornece','Nos formulários do site principal, solicitamos nome, WhatsApp e interesse. Se você selecionar uma carta, registramos também os dados públicos dessa carta para contextualizar o atendimento.'],
 ['Finalidade e atribuição','Usamos esses dados para responder à solicitação e apresentar opções. Parâmetros de campanha e identificadores de clique, quando presentes, acompanham o contato para identificar sua origem. A primeira página da visita e a origem de navegação são registradas sem parâmetros pessoais da URL.'],
 ['Sistemas de atendimento','O contato enviado pelo formulário do site principal é registrado na planilha de atendimento da Cristal. O CRM integrado ao quiz é usado no fluxo separado do Facebook. Ao continuar no WhatsApp, a mensagem é compartilhada com esse serviço. Não vendemos nem alugamos os dados para campanhas de terceiros. Nome e telefone não são incluídos nos eventos comuns de análise deste formulário.'],
 ['Navegação e armazenamento','O navegador pode guardar preferências, atribuição da sessão e um identificador técnico para evitar reenvios. A análise de campanhas depende da configuração de rastreamento. Os formulários do site principal e o quiz acessível por link têm fluxos próprios; o quiz solicita também e-mail e respostas ao diagnóstico, usados no atendimento e na organização comercial.'],
 ['Seus direitos e contato',`Você pode pedir informações sobre o uso de seus dados, acesso, correção ou exclusão pelo telefone ${company.phoneDisplay} ou pelo e-mail ${company.email}. Os dados são mantidos pelo tempo necessário ao atendimento e às obrigações aplicáveis. A solicitação será analisada pela Cristal conforme o caso.`]
 ]},
 'termos-de-uso':{title:'Termos de Uso',description:'Condições de uso do site, do catálogo de cartas contempladas e das ferramentas informativas da Cristal Consórcios.',sections:[
 ['Sobre o site',`Este site é operado pela Cristal Consórcios, CNPJ ${company.taxId}, em Brasília/DF, para apresentar informações e receber solicitações de atendimento.`],
 ['Catálogo e negociação','Valores, prazos e disponibilidade das cartas podem mudar. Entrada sob consulta não significa entrada zero. A contratação depende da conferência da cota, da documentação e das regras da administradora. O envio de um formulário não reserva uma carta nem conclui uma contratação.'],
 ['Simulações e propostas','Simulações são estimativas e não garantem aprovação, contemplação em data específica, economia ou condições fixas. Reajustes, seguros, taxas e demais condições devem ser confirmados na análise da operação. As propostas individualizadas devem ser conferidas com a equipe.'],
 ['Conteúdo e contato',`Textos, marca e imagens têm proteção autoral; sua reprodução depende de autorização quando aplicável. Dúvidas sobre o uso do site podem ser encaminhadas a ${company.email} ou ${company.phoneDisplay}.`]
 ]}
};
const hub=read('conteudo/index.html');
for(const [slug,page] of Object.entries(pages)){
 let html=hub.replace(/<title>[\s\S]*?<\/title>/,`<title>${page.title} | Cristal Consórcios</title>`).replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*/g,'$1'+page.description).replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*/g,'$1'+page.title+' | Cristal Consórcios');
 html=html.replace(/<main id="conteudo-principal">[\s\S]*?<\/main>/,`<main id="conteudo-principal"><section class="content-hero"><div class="content-shell"><p class="content-kicker">CRISTAL CONSÓRCIOS</p><h1>${page.title}</h1><p>Atualização: 23 de outubro de 2026</p></div></section><section class="section"><div class="content-shell legal-copy">${page.sections.map(([h,p])=>`<h2>${h}</h2><p>${p}</p>`).join('')}<p><a href="/politica-de-privacidade/">Política de Privacidade</a> · <a href="/termos-de-uso/">Termos de Uso</a></p></div></section></main>`);
 html=html.replaceAll('href="conteudo.css', 'href="/conteudo/conteudo.css').replaceAll('src="conteudo.js', 'src="/conteudo/conteudo.js').replaceAll('href="./"', 'href="/conteudo/"');
 html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'').replace(/\n[ \t]+\n/g,'\n\n');
 write(slug+'/index.html',decorate(html,`/${slug}/`));
}
const routes=['/','/carta-contemplada-imovel/','/carta-contemplada-veiculo/','/simulador/','/conteudo/','/politica-de-privacidade/','/termos-de-uso/',...require('../articles-data').map(a=>'/conteudo/'+a.slug+'/')];
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+routes.map(route=>`  <url><loc>${ORIGIN}${route}</loc><lastmod>2026-10-23</lastmod></url>`).join('\n')+'\n</urlset>\n');
write('robots.txt',`User-agent: *\nAllow: /\nDisallow: /propostas/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
write('llms.txt',`# Cristal Consórcios\n\nCartas contempladas de imóvel e veículo em Brasília, com atendimento desde 1996. Condições sujeitas à disponibilidade e às regras da administradora.\n\n## Páginas\n${routes.filter(p=>p!=='/simulador/').map(p=>`- [${p==='/'?'Início':p}](${ORIGIN}${p})`).join('\n')}\n\nContato: ${company.phoneDisplay}, ${company.email}. CNPJ: ${company.taxId}.\n`);
console.log('Site principal preparado; quiz, agradecimento, propostas e dados do catálogo não são escritos por este script.');
