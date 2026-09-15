"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONTENT_ROOT = path.join(PROJECT_ROOT, "conteudo");
const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://lpnovacristal.vercel.app").replace(/\/$/, "");
const UPDATED_ISO = "2026-09-15";
const UPDATED_LABEL = "15 de setembro de 2026";
const WHATSAPP_URL = "https://wa.me/556133283000?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20a%20Cristal%20Cons%C3%B3rcios.";

const articles = require(path.join(PROJECT_ROOT, "articles-data.js"));
const company = require(path.join(PROJECT_ROOT, "company-data.js"));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function assetName(article) {
  return path.basename(article.heroAsset.replace(/\\/g, "/"));
}

function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: company.brandName,
    legalName: company.legalName,
    alternateName: company.tradeName,
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/assets/logo.png`,
    taxID: company.taxId,
    email: company.email,
    telephone: company.phoneE164,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address.streetAddress,
      addressLocality: company.address.city,
      addressRegion: company.address.state,
      postalCode: company.address.postalCode.replace(/\D/g, ""),
      addressCountry: company.address.country
    }
  };
}

function svgSprite() {
  return `<svg class="svg-sprite" aria-hidden="true" focusable="false">
      <symbol id="icon-arrow-up-right" viewBox="0 0 24 24"><path d="M7 17 17 7M7 7h10v10"></path></symbol>
      <symbol id="icon-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"></path></symbol>
      <symbol id="icon-whatsapp" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.9 6.986c-.002 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0 0 12.055 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.69 1.448h.005c6.558 0 11.894-5.335 11.896-11.893a11.821 11.821 0 0 0-3.48-8.413Z"></path></symbol>
    </svg>`;
}

function icon(name = "arrow-right", extraClass = "") {
  const classes = ["ui-icon", extraClass].filter(Boolean).join(" ");
  return `<svg class="${classes}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#icon-${name}"></use></svg>`;
}

function head({ title, description, canonical, image, imageAlt = description, type = "website", cssPrefix = "../", cssContent = "conteudo.css", schema, noindex = false }) {
  const canonicalUrl = `${SITE_ORIGIN}${canonical}`;
  const imageUrl = `${SITE_ORIGIN}/assets/${image}`;
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="#07192a">
    ${noindex ? '<meta name="robots" content="noindex, follow">' : `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`}
    <meta property="og:locale" content="pt_BR">
    <meta property="og:type" content="${escapeHtml(type)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    <title>${escapeHtml(title)}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2307192a'/%3E%3Cpath d='M32 9 51 32 32 55 13 32Z' fill='none' stroke='%23d4af37' stroke-width='5'/%3E%3Cpath d='M32 9v46M13 32h38' stroke='%236cc9f4' stroke-width='2' opacity='.8'/%3E%3C/svg%3E">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${cssPrefix}styles.css?v=20260915-2">
    <link rel="stylesheet" href="${cssContent}?v=20260915-2">
    ${schema ? `<script type="application/ld+json">${safeJson(schema)}</script>` : ""}
    <script defer src="${cssContent.replace(/conteudo\.css$/, "conteudo.js")}?v=20260915-1"></script>
  </head>`;
}

function header(prefix, contentHref) {
  return `${svgSprite()}
    <a class="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
    <header class="site-header" id="topo">
      <div class="shell nav-wrap">
        <a class="brand" href="${prefix}" aria-label="Cristal Consórcios — início"><img src="${prefix}assets/logo.png" alt="Cristal Consórcios"></a>
        <button class="menu-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="content-nav" data-content-menu-toggle><span></span><span></span><span></span></button>
        <nav class="main-nav" id="content-nav" aria-label="Navegação principal" data-content-menu>
          <a href="${prefix}#simulador">Simular e comparar</a>
          <a href="${prefix}#cartas">Cartas disponíveis</a>
          <a href="${prefix}#como-funciona">Como funciona</a>
          <a href="${prefix}#sobre">A Cristal</a>
          <a href="${contentHref}" aria-current="page">Conteúdo</a>
          <a href="${prefix}#contato">Contato</a>
        </nav>
        <a class="button button-small button-light nav-cta" href="${WHATSAPP_URL}" target="_blank" rel="noopener">Falar com especialista ${icon("arrow-up-right")}</a>
      </div>
    </header>`;
}

function footer(prefix, contentHref) {
  return `<footer class="site-footer content-footer">
      <div class="shell footer-top">
        <div class="footer-brand"><img src="${prefix}assets/logo.png" alt="Cristal Consórcios"><p>Cartas contempladas e consórcios com experiência, clareza e acompanhamento real.</p></div>
        <div><h2>Navegue</h2><a href="${prefix}#cartas">Cartas disponíveis</a><a href="${prefix}#como-funciona">Como funciona</a><a href="${prefix}#sobre">Sobre a Cristal</a><a href="${contentHref}">Conteúdo</a></div>
        <div><h2>Atendimento</h2><p>Seg a Sex: 8h às 18h<br>Dom e feriados: fechado</p><a href="tel:${escapeHtml(company.phoneE164)}">${escapeHtml(company.phoneDisplay)}</a><a href="mailto:${escapeHtml(company.email)}">${escapeHtml(company.email)}</a></div>
        <div class="footer-company"><h2>Dados cadastrais</h2><p><span class="footer-label">Nome empresarial</span>${escapeHtml(company.legalName)}</p><p><span class="footer-label">Nome fantasia</span>${escapeHtml(company.tradeName)}</p><p><span class="footer-label">CNPJ</span>${escapeHtml(company.taxId)}</p><address><span class="footer-label">Endereço</span><a class="footer-address" href="${escapeHtml(company.mapUrl)}" target="_blank" rel="noopener">${escapeHtml(company.address.streetAddress)}<br>${escapeHtml(company.address.district)} · ${escapeHtml(company.address.city)}/${escapeHtml(company.address.state)} · CEP ${escapeHtml(company.address.postalCode)} ${icon("arrow-up-right", "footer-external-icon")}</a></address><a class="footer-policy" href="https://cristalconsorcios.com/politica-de-privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a></div>
      </div>
      <div class="shell footer-bottom"><span>© <span data-current-year>2026</span> Cristal Consórcios. Todos os direitos reservados.</span><span>Feito para decisões mais claras. ◇</span></div>
    </footer>
    <a class="whatsapp-float" data-floating-whatsapp href="${WHATSAPP_URL}" target="_blank" rel="noopener" aria-label="Falar com a Cristal pelo WhatsApp"><span aria-hidden="true"><svg class="ui-icon ui-icon-whatsapp" viewBox="0 0 24 24" focusable="false"><use href="#icon-whatsapp"></use></svg></span><small>Fale com a Cristal</small></a>`;
}

function articleCard(article, href, assetPrefix, options = {}) {
  const heading = options.heading || "h3";
  return `<a class="article-card reveal" data-reveal data-category="${normalize(article.category)}" href="${href}">
      <div class="article-card-media"><img src="${assetPrefix}assets/${assetName(article)}" alt="${escapeHtml(article.heroAlt)}" loading="lazy" width="720" height="450"><span class="article-card-index">${escapeHtml(article.number)}</span></div>
      <div class="article-card-body">
        <span class="article-card-category">${escapeHtml(article.category)}</span>
        <${heading} class="article-card-title">${escapeHtml(article.title)}</${heading}>
        <p class="article-card-excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="content-meta"><span>${escapeHtml(article.readingTime)}</span><span>Atualizado em ${UPDATED_LABEL}</span></div>
        <span class="article-card-link">Ler artigo <span class="article-card-icon" aria-hidden="true">${icon("arrow-right")}</span></span>
      </div>
    </a>`;
}

function renderHub() {
  const featured = articles[0];
  const categories = [...new Set(articles.map((article) => article.category))];
  const schema = [
    organizationSchema(),
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Conteúdo Cristal Consórcios",
      description: "Informação clara sobre cartas contempladas, consórcio, financiamento, transferência e segurança na negociação.",
      url: `${SITE_ORIGIN}/conteudo/`,
      publisher: { "@id": `${SITE_ORIGIN}/#organization` }
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Artigos da Cristal Consórcios",
      numberOfItems: articles.length,
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_ORIGIN}/conteudo/${article.slug}/`,
        name: article.title
      }))
    }
  ];

  return `${head({
    title: "Conteúdo para decidir com mais segurança | Cristal Consórcios",
    description: "Guias claros sobre cartas contempladas, consórcio, financiamento, transferência, custos e segurança para ajudar você a decidir melhor.",
    canonical: "/conteudo/",
    image: assetName(featured),
    imageAlt: featured.heroAlt,
    cssPrefix: "../",
    cssContent: "conteudo.css",
    schema
  })}
  <body class="content-site">
    ${header("../", "./")}
    <main id="conteudo-principal">
      <section class="content-hero" aria-labelledby="hub-title">
        <div class="content-shell content-hero-inner">
          <div>
            <p class="content-kicker">CONTEÚDO CRISTAL</p>
            <h1 id="hub-title">Conteúdo para decidir com mais segurança.</h1>
            <p class="content-lead">Informação clara sobre cartas contempladas, consórcio, financiamento, transferência e segurança na negociação.</p>
          </div>
          <p class="content-hero-note"><strong>Conhecimento antes da escolha.</strong> Guias objetivos, sem promessas fáceis, para você comparar condições e conversar com mais clareza.</p>
        </div>
      </section>

      <section class="content-main" aria-labelledby="destaque-title">
        <div class="content-shell">
          <div class="content-section-heading reveal" data-reveal>
            <div><p class="content-kicker">LEITURA EM DESTAQUE</p><h2 id="destaque-title">Comece comparando os caminhos.</h2></div>
            <p>Entenda o funcionamento de cada modalidade e descubra quais informações merecem atenção antes de decidir.</p>
          </div>

          <a class="content-feature reveal" data-reveal href="${featured.slug}/">
            <div class="content-feature-media"><img src="../assets/${assetName(featured)}" alt="${escapeHtml(featured.heroAlt)}" width="900" height="650"></div>
            <div class="content-feature-body">
              <div class="content-meta"><span>${escapeHtml(featured.category)}</span><span>${escapeHtml(featured.readingTime)}</span></div>
              <h3>${escapeHtml(featured.title)}</h3>
              <p>${escapeHtml(featured.excerpt)}</p>
              <span class="article-card-link">Ler artigo <span class="article-card-icon" aria-hidden="true">${icon("arrow-right")}</span></span>
            </div>
          </a>

          <nav class="content-filters reveal" data-reveal aria-label="Filtrar artigos por categoria">
            <button class="filter-btn is-active" type="button" data-filter="todos" aria-pressed="true">Todos</button>
            ${categories.map((category) => `<button class="filter-btn" type="button" data-filter="${normalize(category)}" aria-pressed="false">${escapeHtml(category)}</button>`).join("\n            ")}
          </nav>

          <div class="articles-grid" aria-live="polite">
            ${articles.slice(1).map((article) => articleCard(article, `${article.slug}/`, "../")).join("\n            ")}
          </div>
          <div class="empty-filter-state" data-filter-empty hidden><h2>Nenhum conteúdo nesta categoria</h2><p>Escolha outro filtro para continuar explorando.</p></div>

          <section class="hub-cta reveal" data-reveal data-whatsapp-avoid aria-labelledby="hub-cta-title">
            <div><p class="content-kicker">DO CONTEÚDO PARA A PRÁTICA</p><h2 id="hub-cta-title">Organize seus números e conheça as opções atuais.</h2><p>Use o simulador como referência inicial ou consulte as cartas disponíveis. As condições reais devem ser confirmadas antes de qualquer decisão.</p></div>
            <div class="hub-cta-actions"><a class="button button-gold" href="../#simulador">Simular e comparar ${icon("arrow-right")}</a><a class="button button-primary" href="../#cartas">Ver cartas disponíveis ${icon("arrow-right")}</a></div>
          </section>
        </div>
      </section>
    </main>
    ${footer("../", "./")}
  </body>
</html>`;
}

function renderParagraphs(paragraphs = []) {
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n");
}

function renderBullets(bullets = []) {
  if (!bullets.length) return "";
  return `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`;
}

function renderComparison(rows) {
  const firstLabel = rows[0]?.firstLabel || "Carta contemplada";
  const secondLabel = rows[0]?.secondLabel || "Financiamento";
  return `<div class="article-comparison" aria-label="Comparação entre ${escapeHtml(firstLabel)} e ${escapeHtml(secondLabel)}">
    <table>
      <thead><tr><th scope="col">Aspecto</th><th scope="col">${escapeHtml(firstLabel)}</th><th scope="col">${escapeHtml(secondLabel)}</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><th scope="row">${escapeHtml(row.aspect)}</th><td data-label="${escapeHtml(firstLabel)}">${escapeHtml(row.firstValue)}</td><td data-label="${escapeHtml(secondLabel)}">${escapeHtml(row.secondValue)}</td></tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderSection(section, index) {
  const id = `${normalize(section.title)}-${index + 1}`;
  const visualType = ["warning", "checklist"].includes(section.type) ? ` editorial-callout ${section.type}` : "";
  return `<section class="article-section${visualType}" aria-labelledby="${id}">
      <h2 id="${id}">${escapeHtml(section.title)}</h2>
      ${renderParagraphs(section.paragraphs)}
      ${renderBullets(section.bullets)}
      ${section.type === "comparison" ? renderComparison(section.comparisonRows || []) : ""}
    </section>`;
}

function renderCallout(callout) {
  if (!callout) return "";
  return `<aside class="editorial-callout ${escapeHtml(callout.type || "important")}" id="destaque-pratico" aria-labelledby="destaque-pratico-title">
      <h2 id="destaque-pratico-title">${escapeHtml(callout.title)}</h2>
      ${renderParagraphs(callout.paragraphs)}
      ${renderBullets(callout.bullets)}
    </aside>`;
}

function articleSchema(article) {
  const articleUrl = `${SITE_ORIGIN}/conteudo/${article.slug}/`;
  return [
    organizationSchema(),
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.description,
      image: `${SITE_ORIGIN}/assets/${assetName(article)}`,
      url: articleUrl,
      mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
      dateModified: UPDATED_ISO,
      inLanguage: "pt-BR",
      author: { "@id": `${SITE_ORIGIN}/#organization` },
      publisher: { "@id": `${SITE_ORIGIN}/#organization` }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Conteúdo", item: `${SITE_ORIGIN}/conteudo/` },
        { "@type": "ListItem", position: 3, name: article.title, item: articleUrl }
      ]
    }
  ];
}

function renderArticle(article) {
  const related = article.related.map((slug) => articles.find((candidate) => candidate.slug === slug));
  const tocSections = article.sections.map((section, index) => ({ title: section.title, id: `${normalize(section.title)}-${index + 1}` }));
  if (article.callout) tocSections.push({ title: article.callout.title, id: "destaque-pratico" });
  const ctaHref = article.cta.href.replace(/^\.\.\/index\.html/, "../../");

  return `${head({
    title: `${article.title} | Cristal Consórcios`,
    description: article.description,
    canonical: `/conteudo/${article.slug}/`,
    image: assetName(article),
    imageAlt: article.heroAlt,
    type: "article",
    cssPrefix: "../../",
    cssContent: "../conteudo.css",
    schema: articleSchema(article)
  })}
  <body class="content-site">
    ${header("../../", "../")}
    <main id="conteudo-principal">
      <article>
        <header class="article-hero">
          <div class="content-shell">
            <nav class="breadcrumb" aria-label="Trilha de navegação"><a href="../../">Início</a><span class="breadcrumb-separator" aria-hidden="true">/</span><a href="../">Conteúdo</a><span class="breadcrumb-separator" aria-hidden="true">/</span><span aria-current="page">${escapeHtml(article.title)}</span></nav>
            <div class="article-hero-grid">
              <div class="article-hero-copy">
                <p class="content-kicker">${escapeHtml(article.category)}</p>
                <h1>${escapeHtml(article.title)}</h1>
                <p class="content-lead">${escapeHtml(article.excerpt)}</p>
                <div class="content-meta"><span>${escapeHtml(article.readingTime)}</span><span>Atualizado em <time datetime="${UPDATED_ISO}">${UPDATED_LABEL}</time></span></div>
              </div>
              <figure class="article-hero-media"><img src="../../assets/${assetName(article)}" alt="${escapeHtml(article.heroAlt)}" width="760" height="950" fetchpriority="high"></figure>
            </div>
          </div>
        </header>

        <div class="content-shell article-layout">
          <aside class="article-aside" aria-label="Navegação do artigo">
            <nav class="article-toc"><h2>Neste artigo</h2><ol>${tocSections.map((item) => `<li><a href="#${item.id}">${escapeHtml(item.title)}</a></li>`).join("")}</ol></nav>
          </aside>
          <div class="article-main">
            <div class="article-body">
              ${article.sections.map(renderSection).join("\n")}
              ${renderCallout(article.callout)}
            </div>
            <section class="hub-cta article-cta" data-whatsapp-avoid aria-labelledby="article-cta-title">
              <div><p class="content-kicker">${escapeHtml(article.cta.eyebrow)}</p><h2 id="article-cta-title">${escapeHtml(article.cta.title)}</h2><p>Use as informações como ponto de partida e confirme as condições específicas da cota, da administradora ou da instituição antes de decidir.</p></div>
              <div class="hub-cta-actions"><a class="button button-gold" href="${escapeHtml(ctaHref)}">${escapeHtml(article.cta.label)} ${icon("arrow-right")}</a></div>
            </section>
          </div>
        </div>
      </article>

      <section class="related-section" aria-labelledby="related-title">
        <div class="content-shell"><p class="content-kicker">CONTINUE APRENDENDO</p><h2 id="related-title">Outros conteúdos para sua decisão.</h2><div class="related-grid">${related.map((item) => articleCard(item, `../${item.slug}/`, "../../", { heading: "h3" })).join("\n")}</div></div>
      </section>
    </main>
    ${footer("../../", "../")}
  </body>
</html>`;
}

function render404() {
  return `${head({
    title: "Página não encontrada | Cristal Consórcios",
    description: "A página que você tentou acessar não foi encontrada. Volte ao site da Cristal Consórcios ou consulte nossos conteúdos.",
    canonical: "/404.html",
    image: "predio-cristal.jpg",
    cssPrefix: "/",
    cssContent: "/conteudo/conteudo.css",
    noindex: true
  })}
  <body class="content-site">
    ${header("/", "/conteudo/")}
    <main id="conteudo-principal" class="content-404">
      <div class="content-shell"><section class="error-panel" data-whatsapp-avoid><p class="error-code" aria-hidden="true">404</p><h1>Esta página não foi encontrada.</h1><p>O endereço pode ter mudado ou sido digitado incorretamente. Você pode voltar ao início ou continuar pelos guias da Cristal.</p><div class="error-actions"><a class="button button-gold" href="/">Voltar ao início ${icon("arrow-right")}</a><a class="button button-primary" href="/conteudo/">Explorar conteúdos ${icon("arrow-right")}</a></div></section></div>
    </main>
    ${footer("/", "/conteudo/")}
  </body>
</html>`;
}

function validateArticles() {
  if (!Array.isArray(articles) || articles.length !== 10) throw new Error("A base editorial deve conter exatamente 10 artigos nesta versão.");
  const slugs = new Set();
  const titles = new Set();
  const descriptions = new Set();
  for (const article of articles) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) throw new Error(`Slug inválido: ${article.slug}`);
    if (slugs.has(article.slug)) throw new Error(`Slug repetido: ${article.slug}`);
    if (titles.has(article.title)) throw new Error(`Título repetido: ${article.title}`);
    if (descriptions.has(article.description)) throw new Error(`Descrição repetida: ${article.description}`);
    if (!Array.isArray(article.sections) || article.sections.length < 5) throw new Error(`Conteúdo insuficiente: ${article.slug}`);
    if (!Array.isArray(article.related) || article.related.length !== 3) throw new Error(`Artigos relacionados inválidos: ${article.slug}`);
    slugs.add(article.slug);
    titles.add(article.title);
    descriptions.add(article.description);
  }
  for (const article of articles) {
    for (const related of article.related) {
      if (!slugs.has(related)) throw new Error(`Relacionado inexistente em ${article.slug}: ${related}`);
      if (related === article.slug) throw new Error(`Artigo relacionado a si próprio: ${article.slug}`);
    }
  }
}

function write(relativePath, content) {
  const destination = path.join(PROJECT_ROOT, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${content.trim()}\n`, "utf8");
}

function renderSitemap() {
  const urls = ["/", "/conteudo/", ...articles.map((article) => `/conteudo/${article.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((route) => `  <url><loc>${escapeHtml(`${SITE_ORIGIN}${route}`)}</loc><lastmod>${UPDATED_ISO}</lastmod></url>`).join("\n")}
</urlset>`;
}

validateArticles();
write("conteudo/index.html", renderHub());
for (const article of articles) write(`conteudo/${article.slug}/index.html`, renderArticle(article));
write("404.html", render404());
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml`);
write("sitemap.xml", renderSitemap());

console.log(`Conteúdo gerado: 1 hub, ${articles.length} artigos, 1 página 404, robots.txt e sitemap.xml.`);
