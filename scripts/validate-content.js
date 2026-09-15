"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const articles = require(path.join(root, "articles-data.js"));
const company = require(path.join(root, "company-data.js"));

const errors = [];
const htmlFiles = [
  path.join(root, "index.html"),
  path.join(root, "404.html"),
  path.join(root, "conteudo", "index.html"),
  ...articles.map((article) => path.join(root, "conteudo", article.slug, "index.html"))
];

function fail(message) {
  errors.push(message);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(`Arquivo ausente: ${path.relative(root, file)}`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

function resolveLocal(file, rawUrl) {
  const clean = rawUrl.split("#")[0].split("?")[0];
  if (!clean || /^(?:[a-z]+:|\/\/)/i.test(clean) || clean.startsWith("#") || clean.startsWith("data:")) return null;
  const decoded = decodeURIComponent(clean);
  const absolute = decoded.startsWith("/")
    ? path.resolve(root, `.${decoded}`)
    : path.resolve(path.dirname(file), decoded);
  if (decoded.endsWith("/") || !path.extname(decoded)) return path.join(absolute, "index.html");
  return absolute;
}

const titles = new Set();
const descriptions = new Set();
for (const file of htmlFiles) {
  const html = read(file);
  if (!html) continue;
  const relative = path.relative(root, file);
  const schemas = [];
  const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;
  if (h1Count !== 1) fail(`${relative}: esperado 1 H1, encontrado ${h1Count}`);

  const companyTokens = [
    company.legalName,
    company.tradeName,
    company.taxId,
    company.email,
    company.address.streetAddress,
    `${company.address.city}/${company.address.state}`,
    company.address.postalCode
  ];
  for (const token of companyTokens) {
    if (!html.includes(token)) fail(`${relative}: dado cadastral ausente (${token})`);
  }
  if (!html.includes(`mailto:${company.email}`)) fail(`${relative}: link de e-mail cadastral ausente`);

  if (!relative.endsWith("404.html")) {
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!title || titles.has(title)) fail(`${relative}: title ausente ou repetido`);
    if (!description || descriptions.has(description)) fail(`${relative}: description ausente ou repetida`);
    if (!canonical) fail(`${relative}: canonical ausente`);
    titles.add(title);
    descriptions.add(description);
  }

  for (const match of html.matchAll(/<(?:a|link|script|img)\b[^>]*(?:href|src)="([^"]+)"/g)) {
    const target = resolveLocal(file, match[1]);
    if (target && !fs.existsSync(target)) fail(`${relative}: destino local ausente para ${match[1]}`);
  }

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const parsed = JSON.parse(match[1]);
      schemas.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch (error) {
      fail(`${relative}: JSON-LD inválido (${error.message})`);
    }
  }

  if (!relative.endsWith("404.html")) {
    const organization = schemas.find((item) => item && item["@type"] === "Organization");
    if (!organization) {
      fail(`${relative}: schema Organization ausente`);
    } else {
      if (organization.legalName !== company.legalName) fail(`${relative}: legalName divergente no schema`);
      if (organization.taxID !== company.taxId) fail(`${relative}: taxID divergente no schema`);
      if (organization.email !== company.email) fail(`${relative}: e-mail divergente no schema`);
      if (organization.telephone !== company.phoneE164) fail(`${relative}: telefone divergente no schema`);
      if (organization.address?.addressRegion !== company.address.state) fail(`${relative}: UF divergente no schema`);
    }
  }
}

for (const article of articles) {
  const file = path.join(root, "conteudo", article.slug, "index.html");
  const html = read(file);
  if (!html.includes('"@type":"BlogPosting"')) fail(`${article.slug}: schema BlogPosting ausente`);
  if (!html.includes('"@type":"BreadcrumbList"')) fail(`${article.slug}: schema BreadcrumbList ausente`);
  if (!html.includes(`href="../${article.related[0]}/"`)) fail(`${article.slug}: artigos relacionados não renderizados`);
}

const searchableFiles = htmlFiles.concat([
  path.join(root, "conteudo", "conteudo.js"),
  path.join(root, "conteudo", "conteudo.css")
]);
for (const file of searchableFiles) {
  const content = read(file);
  if (/cristalconsorcios\.com\/blog(?:\.html|\/)/i.test(content)) fail(`${path.relative(root, file)}: link do blog externo ainda presente`);
  if (/[↗➡➜➤]/u.test(content)) fail(`${path.relative(root, file)}: seta Unicode encontrada`);
}

const sitemap = read(path.join(root, "sitemap.xml"));
for (const article of articles) {
  if (!sitemap.includes(`/conteudo/${article.slug}/`)) fail(`sitemap.xml: rota ausente para ${article.slug}`);
}
if ((sitemap.match(/<url>/g) || []).length !== articles.length + 2) fail("sitemap.xml: quantidade de URLs inesperada");

const styles = read(path.join(root, "styles.css"));
if (!styles.includes("#simulation-birthdate { padding-inline: 0; text-indent: 11px; }")) fail("Correção do campo de nascimento ausente");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validação concluída: ${articles.length} artigos, ${htmlFiles.length} páginas HTML, dados cadastrais, links locais, metadados, schemas e sitemap consistentes.`);
}
