"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "simulador", "index.html"), "utf8");
const resaleController = fs.readFileSync(path.join(root, "simulador", "simulador.js"), "utf8");
const acquisitionController = fs.readFileSync(path.join(root, "simulador", "leverage-simulator.js"), "utf8");
const guidedController = fs.readFileSync(path.join(root, "simulador", "guided-simulator.js"), "utf8");
const css = fs.readFileSync(path.join(root, "simulador", "simulador.css"), "utf8");

const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function buttonModeValues(attribute) {
  const expression = new RegExp(`<button[^>]+${attribute}="([^"]+)"`, "g");
  return [...html.matchAll(expression)].map((match) => match[1]);
}

function guidedStepValues(attribute) {
  const expression = new RegExp(`${attribute}="([^"]+)"`, "g");
  return [...html.matchAll(expression)].map((match) => Number(match[1]));
}

test("a página inicia no modo guiado de investimento", () => {
  assert.match(html, /data-simulator-strategy="resale"/);
  assert.match(html, /<body[^>]+data-resale-mode="guided"/);
  assert.match(html, /<body[^>]+data-leverage-mode="guided"/);
  assert.match(html, /<strong>Investimento<\/strong>/);
  assert.match(html, /<strong>Adquirir imóvel ou veículo<\/strong>/);
});

test("cada estratégia oferece guiado, preenchimento rápido e análise completa", () => {
  assert.deepEqual(buttonModeValues("data-resale-mode"), ["guided", "simple", "advanced"]);
  assert.deepEqual(buttonModeValues("data-leverage-mode"), ["guided", "simple", "advanced"]);
  assert.match(html, /Simulação guiada/);
  assert.match(html, /Preenchimento rápido/);
  assert.match(html, /Análise completa/);
  assert.equal((html.match(/strategy-mode-button-guided is-active/g) || []).length, 2);
});

test("os dois painéis guiados possuem progresso, navegação e layouts padrão separados", () => {
  for (const id of [
    "resale-guided",
    "resale-guided-progress-label",
    "resale-guided-progress-bar",
    "resale-guided-feedback",
    "resale-standard-layout",
    "leverage-guided",
    "leverage-guided-progress-label",
    "leverage-guided-progress-bar",
    "leverage-guided-feedback",
    "leverage-standard-layout"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="resale-standard-layout"[^>]*hidden/);
  assert.match(html, /id="leverage-standard-layout"[^>]*hidden/);
  assert.match(html, /data-guided-resale-back/);
  assert.match(html, /data-guided-resale-next/);
  assert.match(html, /data-guided-leverage-back/);
  assert.match(html, /data-guided-leverage-next/);
});

test("o investimento guiado tem quatro perguntas e uma etapa de resultado", () => {
  assert.deepEqual(guidedStepValues("data-guided-resale-step"), [0, 1, 2, 3, 4]);
  assert.match(html, /id="resale-guided"[\s\S]*?role="progressbar"[^>]+aria-valuemax="5"/);
  for (const id of [
    "guided-resale-credit",
    "guided-resale-own-bid",
    "guided-resale-month",
    "guided-resale-premium",
    "guided-resale-live-profit",
    "guided-resale-live-capital",
    "guided-resale-live-installment",
    "guided-resale-live-roi",
    "guided-resale-live-embedded",
    "strategy-whatsapp-guided"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("a aquisição guiada tem cinco perguntas e uma etapa de resultado", () => {
  assert.deepEqual(guidedStepValues("data-guided-leverage-step"), [0, 1, 2, 3, 4, 5]);
  assert.match(html, /id="leverage-guided"[\s\S]*?role="progressbar"[^>]+aria-valuemax="6"/);
  for (const id of [
    "guided-leverage-target",
    "guided-leverage-capital",
    "guided-leverage-monthly",
    "guided-leverage-month",
    "guided-leverage-live-credit",
    "guided-leverage-live-target-message",
    "guided-leverage-live-net",
    "guided-leverage-live-capital",
    "guided-leverage-live-monthly",
    "guided-leverage-live-limiter",
    "leverage-whatsapp-guided"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /data-guided-asset-type="property"/);
  assert.match(html, /data-guided-asset-type="vehicle"/);
});

test("o controlador guiado é carregado depois dos dois controladores financeiros", () => {
  const resaleIndex = html.indexOf('src="simulador.js');
  const acquisitionIndex = html.indexOf('src="leverage-simulator.js');
  const guidedIndex = html.indexOf('src="guided-simulator.js');
  assert.ok(resaleIndex >= 0, "simulador.js deve estar carregado");
  assert.ok(acquisitionIndex > resaleIndex, "leverage-simulator.js deve vir após simulador.js");
  assert.ok(guidedIndex > acquisitionIndex, "guided-simulator.js deve vir após os controladores");
});

test("o modo guiado usa as APIs públicas dos controladores existentes", () => {
  assert.match(resaleController, /window\.CristalResaleSimulator\s*=\s*Object\.freeze\([\s\S]*?updateInput,[\s\S]*?setMode:/);
  assert.match(acquisitionController, /window\.CristalLeverageSimulator\s*=\s*Object\.freeze\([\s\S]*?updateInput,[\s\S]*?updateAcquisitionContext,[\s\S]*?setMode,/);
  assert.match(guidedController, /window\.CristalResaleSimulator\?\.updateInput/);
  assert.match(guidedController, /window\.CristalLeverageSimulator\?\.updateInput/);
  assert.match(guidedController, /window\.CristalLeverageSimulator\?\.updateAcquisitionContext/);
  assert.match(guidedController, /\.setMode\("simple"\)/);
});

test("o guiado sincroniza atualizações disparadas pelos dois controladores", () => {
  assert.match(resaleController, /cristal:resale-updated/);
  assert.match(acquisitionController, /cristal:leverage-updated/);
  assert.match(guidedController, /window\.addEventListener\("cristal:resale-updated"/);
  assert.match(guidedController, /window\.addEventListener\("cristal:leverage-updated"/);
  assert.match(guidedController, /window\.addEventListener\("cristal:resale-mode-changed"/);
  assert.match(guidedController, /window\.addEventListener\("cristal:leverage-mode-changed"/);
});

test("erros do guiado são associados aos campos e corrigíveis", () => {
  for (const id of [
    "guided-resale-credit",
    "guided-resale-own-bid",
    "guided-resale-month",
    "guided-resale-premium"
  ]) {
    assert.match(html, new RegExp(`id="${id}"[^>]+aria-describedby="resale-guided-feedback"`));
  }
  for (const id of [
    "guided-leverage-target",
    "guided-leverage-capital",
    "guided-leverage-monthly",
    "guided-leverage-month"
  ]) {
    assert.match(html, new RegExp(`id="${id}"[^>]+aria-describedby="leverage-guided-feedback"`));
  }
  assert.match(guidedController, /setText\(key === "resale" \? resale\.feedback : leverage\.feedback, ""\)/);
});

test("URLs representam corretamente os três modos", () => {
  for (const controller of [resaleController, acquisitionController]) {
    assert.match(controller, /guided:\s*"guiado"/);
    assert.match(controller, /simple:\s*"simples"/);
    assert.match(controller, /advanced:\s*"avancado"/);
    assert.match(controller, /params\.set\(MODE_QUERY_KEY/);
  }
  assert.match(resaleController, /fallback\s*=\s*"guided"/);
  assert.match(acquisitionController, /return\s+"guided"/);
});

test("o investimento rápido mantém apenas os quatro dados principais", () => {
  for (const id of ["strategy-credit", "strategy-own-bid", "strategy-month", "strategy-premium"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="strategy-embedded-bid"[^>]*[\s\S]*?data-resale-detail="advanced"|data-resale-detail="advanced"[\s\S]*?id="strategy-embedded-bid"/);
  assert.match(html, /id="resale-quick-profit"/);
  assert.match(html, /data-open-resale-advanced/);
});

test("a aquisição rápida possui objetivo, valor, capital, parcela e prazo", () => {
  for (const id of [
    "leverage-target-value",
    "leverage-capital",
    "leverage-monthly-capacity",
    "leverage-month"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /data-asset-type="property"/);
  assert.match(html, /data-asset-type="vehicle"/);
  assert.match(html, /data-open-leverage-advanced/);
});

test("o valor desejado é metadado e a comparação usa o crédito líquido", () => {
  assert.match(acquisitionController, /const DEFAULT_ACQUISITION_CONTEXT/);
  assert.match(acquisitionController, /targetAssetValue:\s*"bem"/);
  assert.match(acquisitionController, /const availableCredit = result\.credit\.netAtContemplation/);
  assert.doesNotMatch(acquisitionController, /targetAssetValue\s*[,)]\s*\*\s*result\.estimatedCredit/);
});

test("tipo e valor do bem entram na URL compartilhável", () => {
  assert.match(acquisitionController, /assetType:\s*"tipo"/);
  assert.match(acquisitionController, /params\.set\(ACQUISITION_URL_KEYS\.assetType/);
  assert.match(acquisitionController, /params\.set\(ACQUISITION_URL_KEYS\.targetAssetValue/);
  assert.match(acquisitionController, /getAcquisitionContext/);
});

test("projeções imobiliárias ficam isoladas do modo veículo", () => {
  assert.match(html, /data-property-only/);
  assert.match(html, /id="leverage-vehicle-note"/);
  assert.match(css, /body\[data-acquisition-type="vehicle"\]\s+\[data-property-only\]/);
  assert.match(acquisitionController, /assetType === "vehicle"/);
});

test("a divulgação progressiva preserva os controles avançados no DOM", () => {
  assert.match(html, /id="strategy-advanced-fields"/);
  assert.match(html, /id="leverage-advanced-fields"/);
  assert.match(css, /body\[data-resale-mode="simple"\]\s+\[data-resale-detail="advanced"\]/);
  assert.match(css, /body\[data-leverage-mode="simple"\]\s+\[data-leverage-detail="advanced"\]/);
  assert.match(css, /body\[data-resale-mode="guided"\]\s+\[data-resale-detail="advanced"\]/);
  assert.match(css, /body\[data-leverage-mode="guided"\]\s+\[data-leverage-detail="advanced"\]/);
  assert.match(resaleController, /document\.body\.dataset\.resaleMode = currentMode/);
  assert.match(acquisitionController, /document\.body\.dataset\.leverageMode = currentMode/);
});

test("campos técnicos ocultos não bloqueiam o modo rápido", () => {
  assert.match(resaleController, /field\.offsetParent !== null && field\.value\.trim\(\) === ""/);
  assert.match(acquisitionController, /field\.offsetParent !== null && field\.value\.trim\(\) === ""/);
});

test("todos os ids da página permanecem únicos", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicateIds)], []);
});

let passed = 0;

for (const { name, callback } of tests) {
  try {
    callback();
    passed += 1;
    console.log(`OK  ${name}`);
  } catch (error) {
    console.error(`FALHA  ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(`\n${passed}/${tests.length} testes da interface simplificada passaram.`);
} else {
  console.error(`\n${passed}/${tests.length} testes da interface simplificada passaram.`);
}
