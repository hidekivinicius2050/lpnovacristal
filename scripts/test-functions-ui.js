"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");
const origin = process.env.CRISTAL_TEST_URL || "http://127.0.0.1:4175";
const output = path.resolve(__dirname, "../../../output");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [], failed = [], sends = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("response", r => { if (r.url().startsWith(origin) && r.status() >= 400) failed.push(r.url()); });
    page.on("request", r => { if (r.method() !== "GET") sends.push(r.method() + " " + r.url()); });
    await page.goto(origin + "/propostas");
    await page.locator(".tools-link").click();
    assert(page.url().endsWith("/funcoes/"));
    assert.equal(await page.locator(".tool-link").count(), 3);
    await page.screenshot({ path: path.join(output, "funcoes-20261027.png") });
    await page.getByRole("link", { name: /Entrada e margem/ }).click();
    for (const suffix of ["/funcoes/entrada", "/funcoes/entrada/"]) {
      await page.goto(origin + suffix);
      assert((await page.locator('meta[name="robots"]').getAttribute("content")).includes("noindex"));
      assert(await page.locator("#result").isHidden());
      await page.locator("#entry-example").click();
      assert.equal(await page.locator("#final-percent").innerText(), "35,00%");
      assert.equal(await page.locator("#entry-status").getAttribute("data-state"), "good");
      await page.locator("#margin-mode").selectOption("percent");
      assert.equal(await page.locator("#final-percent").innerText(), "35,00%");
      await page.locator("#margin").fill("10");
      assert.equal(await page.locator("#final-percent").innerText(), "33,00%");
      await page.locator("#margin-mode").selectOption("money");
      assert.equal(await page.locator("#final-percent").innerText(), "33,00%");
      await page.locator("#margin").fill("20000");
      assert.equal(await page.locator("#entry-status").getAttribute("data-state"), "bad");
      await page.locator("#apply-maximum").click();
      assert.equal(await page.locator("#entry-status").getAttribute("data-state"), "good");
      assert((await page.locator("#final-percent").innerText()).startsWith("49,99999"));
      await page.locator("#cost").fill("60000");
      assert(await page.locator("#apply-maximum").isDisabled());
      await page.locator("#credit").fill("-1");
      assert(await page.locator("#result").isHidden());
      assert((await page.locator("#entry-feedback").innerText()).length > 0);
      await page.getByRole("button", { name: "Limpar", exact: true }).click();
      await page.waitForFunction(() => document.getElementById("result").hidden);
      assert.equal(await page.locator("#credit").inputValue(), "");
      await page.locator("#entry-example").click();
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `entrada-${width}-20261027.png`), fullPage: true });
    }
    await page.goto(origin + "/funcoes");
    assert.equal(await page.locator(".tool-link").count(), 3);
    assert((await page.locator('meta[name="robots"]').getAttribute("content")).includes("noindex"));
    const sitemap = await (await page.request.get(origin + "/sitemap.xml")).text();
    assert(!sitemap.includes("/funcoes"));
    await page.goto(origin + "/");
    assert.equal(await page.locator('.main-nav a[href^="/funcoes"]').count(), 0);
    assert.deepEqual(errors, []); assert.deepEqual(failed, []); assert.deepEqual(sends, []);
    console.log("PASS: internal hub/navigation, calculator in both URL variants, unit conversion, 50% boundary, maximum, validation/reset, mobile layout, noindex and no submitted inputs.");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
