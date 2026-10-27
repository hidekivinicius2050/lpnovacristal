"use strict";

// Run against scripts/serve.js, using a local Chrome installation.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const origin = process.env.CRISTAL_TEST_URL || "http://127.0.0.1:4175";
const stock = JSON.parse(fs.readFileSync(path.join(root, "data/cartas.json"), "utf8")).letters;
const output = process.env.CRISTAL_TEST_OUTPUT || path.resolve(root, "../../output");
const money = n => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\s/g, " ");
let checks = 0;

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    async function checkResults(expected, field = "credit", direction = -1) {
      const reported = await page.locator("#catalogue-result-count").innerText();
      assert.equal(Number(reported.split(" ")[0]), expected.length, reported);
      const sorted = [...expected].sort((a, b) => direction * (a[field] - b[field]) || b.credit - a.credit || a.id.localeCompare(b.id));
      const actual = await page.locator(".letter-card .letter-credit").evaluateAll(nodes => nodes.map(n => n.firstChild.textContent.trim().replace(/\s/g, " ")));
      assert.deepEqual(actual, sorted.slice(0, actual.length).map(x => money(x.credit)));
      if (expected.length) assert(actual.length > 0);
      else assert.equal(await page.locator(".catalogue-empty").count(), 1);
      checks++;
    }
    await page.goto(origin + "/#cartas");
    await page.waitForSelector(".letter-card");
    await checkResults(stock);
    await page.locator('[data-category="veiculo"]').click();
    const cars = stock.filter(x => x.type === "veiculo");
    await checkResults(cars);
    await page.locator('[data-credit-band="100to300"]').click();
    const bandCars = cars.filter(x => x.credit > 100000 && x.credit <= 300000);
    await checkResults(bandCars);
    await page.locator("#installment-filter").fill("2.500,00");
    const cheap = bandCars.filter(x => x.installment <= 2500);
    await checkResults(cheap);
    const admin = cheap[0].admin;
    await page.locator("#admin-filter").selectOption(admin);
    const selected = cheap.filter(x => x.admin === admin);
    await checkResults(selected);
    for (const [order, field, dir] of [["credit-asc", "credit", 1], ["installment-asc", "installment", 1], ["installment-desc", "installment", -1], ["term-asc", "term", 1], ["term-desc", "term", -1]]) {
      await page.locator("#sort-filter").selectOption(order);
      await checkResults(selected, field, dir);
    }
    await page.locator("#clear-filters").click();
    await checkResults(cars);
    await page.locator("#credit-range").evaluate(el => { el.value = "150000"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await checkResults(cars.filter(x => x.credit <= 150000));
    await page.locator("#installment-range").evaluate(el => { el.value = "2000"; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await checkResults(cars.filter(x => x.credit <= 150000 && x.installment <= 2000));
    await page.locator("#credit-filter").fill("0");
    await checkResults([]);
    await page.locator("#clear-filters").click();
    await page.locator("#search-input").fill("100000");
    assert((await page.locator(".letter-credit").allTextContents()).some(x => x.includes("100.000,00")));
    checks++;
    await page.locator("#clear-filters").click();
    await page.locator("#term-filter").selectOption("upTo60");
    await checkResults(cars.filter(x => x.term <= 60));
    await page.locator("#clear-filters").click();
    await page.locator("#toggle-catalogue").click();
    assert.equal(await page.locator(".letter-card").count(), 12);
    await page.locator("#sort-filter").selectOption("installment-asc");
    assert.equal(await page.locator(".letter-card").count(), 6);
    const firstCredit = (await page.locator(".letter-credit").first().innerText()).split("\n")[0];
    await page.locator(".letter-action").first().click();
    assert((await page.locator("#modal-title").innerText()).includes(firstCredit));
    assert((await page.locator("#modal-data").innerText()).includes("Consultar"));
    await page.locator("#modal-close").click();
    checks++;
    await page.locator("#clear-filters").click();
    await page.locator('[data-category="todos"]').click();
    for (const width of [1440, 1280, 1100, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator(".filter-panel").scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
      assert(dimensions.content <= dimensions.width + 1, `Horizontal overflow at ${width}: ${dimensions.content}`);
      const menu = page.locator(".menu-toggle");
      if (await menu.isVisible()) {
        await menu.click();
        await page.locator(".main-nav").getByRole("link", { name: "Simulador", exact: true }).scrollIntoViewIfNeeded();
        assert.equal(await menu.getAttribute("aria-expanded"), "true");
        const menuBox = await page.locator(".main-nav").boundingBox();
        assert(menuBox.x >= 0 && menuBox.x + menuBox.width <= width + 1);
        await menu.click();
      } else {
        for (const locator of [page.locator(".main-nav"), page.locator(".nav-cta")]) if (await locator.isVisible()) {
          const box = await locator.boundingBox();
          assert(box.x >= 0 && box.x + box.width <= width + 1, `Header overflow at ${width}`);
        }
      }
      if (width === 1440 || width === 390) await page.screenshot({ path: path.join(output, `filtros-${width}-20261027.png`) });
      checks++;
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const [type, label] of [["imovel", "Carta de imóvel"], ["veiculo", "Carta de veículo"]]) {
      await page.goto(origin + "/");
      await page.locator(".main-nav").getByRole("link", { name: "Cartas disponíveis", exact: true }).click();
      await page.locator(`[data-category="${type}"]`).click();
      await page.waitForSelector(".letter-card");
      await page.waitForFunction(() => { const top = document.querySelector("#cartas").getBoundingClientRect().top; return top >= 0 && top < 160; });
      assert(page.url().endsWith("/#cartas"));
      await checkResults(stock.filter(x => x.type === type));
      const top = await page.locator("#cartas").evaluate(el => el.getBoundingClientRect().top);
      assert(top >= 0 && top < 160, `Catalogue anchor is not visible: ${top}`);
      await page.locator("#sort-filter").selectOption("installment-asc");
      await checkResults(stock.filter(x => x.type === type), "installment", 1);
    }
    // Both URL variants must load the actual simulator stylesheet/scripts.
    for (const suffix of ["/simulador", "/simulador/"]) {
      const badAssets = [];
      const handler = response => { if (response.url().startsWith(origin) && response.status() >= 400) badAssets.push(response.url()); };
      page.on("response", handler);
      await page.goto(origin + suffix);
      await page.waitForFunction(() => window.CristalResaleSimulator && window.CristalLeverageSimulator);
      await page.waitForTimeout(600);
      assert.deepEqual(badAssets, []);
      assert(await page.evaluate(() => [...document.styleSheets].some(s => s.href && s.href.includes("/simulador/simulador.css"))));
      assert.notEqual((await page.locator("#guided-resale-live-profit").innerText()).trim(), "—");
      await page.locator('#strategy-tab-leverage').click();
      assert(await page.locator("#leverage-guided").isVisible());
      await page.locator('#strategy-tab-resale').click();
      await page.waitForFunction(() => document.body.dataset.simulatorStrategy === "resale");
      for (const mode of ["simple", "advanced", "guided"]) {
        await page.locator(`button[data-resale-mode="${mode}"]`).click();
        assert.equal(await page.locator("body").getAttribute("data-resale-mode"), mode);
      }
      if (suffix.endsWith("/")) await page.screenshot({ path: path.join(output, "simulador-corrigido-20261027.png") });
      page.off("response", handler);
      checks++;
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: ${checks} browser checks — filters, combined conditions, sorting, reset, pagination/modal, responsive layouts, navigation and both simulator URL variants.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
