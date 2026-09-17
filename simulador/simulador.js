(function initializeStrategySimulator() {
  "use strict";

  const engine = window.CristalSimulationEngine;
  if (!engine) {
    console.error("O motor do simulador não foi carregado.");
    return;
  }

  const WHATSAPP_NUMBER = "556133283000";
  const URL_KEYS = Object.freeze({
    credit: "credito",
    ownBid: "lance",
    embeddedBidPercentage: "embutido",
    scenarioMonth: "mes",
    premiumPercentage: "agio",
    termMonths: "prazo",
    administrationPercentage: "taxaadm",
    reserveFundPercentage: "fundo",
    administrationFundPercentage: "taxa",
    annualCorrectionPercentage: "correcao",
    installmentType: "parcela",
    reducedInstallmentPercentage: "reducao",
    otherOwnOutlays: "outros"
  });
  const DEFAULT_UI_INPUT = Object.freeze({
    ...engine.DEFAULT_INPUT,
    ownBid: 20000,
    embeddedBidPercentage: 20,
    scenarioMonth: 24
  });
  const SCENARIO_PRESETS = Object.freeze({
    short: { credit: 200000, ownBid: 0, embeddedBidPercentage: 0, scenarioMonth: 12, premiumPercentage: 25 },
    medium: { credit: 200000, ownBid: 20000, embeddedBidPercentage: 20, scenarioMonth: 24, premiumPercentage: 25 },
    long: { credit: 300000, ownBid: 30000, embeddedBidPercentage: 20, scenarioMonth: 60, premiumPercentage: 25 }
  });
  const PLAN_TERMS = Object.freeze([120, 150, 180, 200, 240]);
  const STRATEGY_QUERY_KEY = "estrategia";
  const MODE_QUERY_KEY = "modo";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const dom = {
    form: $("#strategy-form"),
    modeButtons: $$("[data-resale-mode]"),
    advancedFields: $("#strategy-advanced-fields"),
    credit: $("#strategy-credit"),
    ownBid: $("#strategy-own-bid"),
    embeddedBid: $("#strategy-embedded-bid"),
    embeddedOutput: $("#strategy-embedded-output"),
    month: $("#strategy-month"),
    monthNumber: $("#strategy-month-number"),
    premium: $("#strategy-premium"),
    term: $("#strategy-term"),
    administration: $("#strategy-admin-fee"),
    reserveFund: $("#strategy-reserve-fund"),
    correction: $("#strategy-correction"),
    installmentType: $("#strategy-installment-type"),
    reducedPercentage: $("#strategy-reduced-percentage"),
    reducedField: $("#strategy-reduced-field"),
    otherOutlays: $("#strategy-other-outlays"),
    formFeedback: $("#strategy-form-feedback"),
    scenarioLabel: $("#strategy-scenario-label"),
    summary: $("#strategy-summary-text"),
    impact: $("#strategy-impact"),
    saveScenario: $("#save-scenario"),
    comparison: $("#comparacao"),
    scenarioRail: $("#scenario-rail"),
    actionFeedback: $("#strategy-action-feedback"),
    copySummary: $("#copy-resale-summary"),
    printSimulation: $("#print-resale-simulation"),
    resetSimulation: $("#reset-resale-simulation"),
    generatedAt: $("#resale-generated-at"),
    shareButtons: [$("#share-simulation"), $("#share-simulation-bottom")].filter(Boolean),
    whatsapp: $("#strategy-whatsapp"),
    dialog: $("#calculation-dialog"),
    breakdown: $("#calculation-breakdown"),
    calculationTitle: $("#calculation-title"),
    calculationIntro: $("#calculation-intro"),
    calculationNote: $("#calculation-note"),
    bidBarOwn: $(".strategy-bid-bar-own"),
    bidBarEmbedded: $(".strategy-bid-bar-embedded"),
    chart: $("#strategy-chart-svg"),
    chartGrid: $("#chart-grid"),
    chartCapitalLine: $("#chart-capital-line"),
    chartOperationLine: $("#chart-operation-line"),
    chartMarker: $("#chart-marker-line"),
    chartCapitalPoint: $("#chart-capital-point"),
    chartOperationPoint: $("#chart-operation-point"),
    chartTooltip: $("#chart-tooltip"),
    chartTableBody: $("#resale-evolution-body"),
    outputs: {
      bidOwn: $("#bid-own-output"),
      bidEmbedded: $("#bid-embedded-value-output"),
      bidTotal: $("#bid-total-output"),
      bidPercentage: $("#bid-total-percentage-output"),
      bidNetCredit: $("#bid-net-credit-output"),
      capital: $("#result-capital"),
      installmentsPaid: $("#result-installments-paid"),
      ownBid: $("#result-own-bid"),
      otherOutlays: $("#result-other-outlays"),
      month: $("#result-month"),
      netCredit: $("#result-net-credit"),
      baseCredit: $("#result-base-credit"),
      adjustedCredit: $("#result-adjusted-credit"),
      embeddedBid: $("#result-embedded-bid"),
      operationValue: $("#result-operation-value"),
      premiumBase: $("#result-premium-base"),
      premiumPercentage: $("#result-premium-percentage"),
      premiumValue: $("#result-premium-value"),
      profit: $("#result-profit"),
      profitFormula: $("#result-profit-formula"),
      roi: $("#result-roi"),
      initialInstallment: $("#result-initial-installment"),
      currentInstallment: $("#result-current-installment"),
      correctionPeriods: $("#result-correction-periods"),
      correctionRate: $("#result-correction-rate"),
      balanceBeforeBid: $("#result-balance-before-bid"),
      appliedBid: $("#result-applied-bid"),
      balanceAfterBid: $("#result-balance-after-bid"),
      postInstallment: $("#result-post-installment"),
      remainingMonths: $("#result-remaining-months")
    }
  };

  let currentInput = { ...DEFAULT_UI_INPUT, ...readInputFromUrl() };
  let currentResult = null;
  let previousResult = null;
  let savedScenarios = [];
  let calculationFrame = 0;
  let urlTimer = 0;
  let actionTimer = 0;
  let simulatorStarted = false;
  let comparisonTracked = false;
  let whatsappAvoidanceUpdate = null;
  let chartGeometry = null;
  const initialParams = new URLSearchParams(window.location.search);
  const initialStrategyValue = initialParams.get(STRATEGY_QUERY_KEY);
  const startsInLeverage = initialStrategyValue === "alavancagem" || initialStrategyValue === "leverage";
  let currentMode = startsInLeverage
    ? "simple"
    : (initialParams.get(MODE_QUERY_KEY) === "avancado" ? "advanced" : "simple");

  function readInputFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const urlStrategy = params.get(STRATEGY_QUERY_KEY);
    if (urlStrategy === "alavancagem" || urlStrategy === "leverage") return {};
    const parsed = {};
    const numericKeys = Object.keys(URL_KEYS).filter((key) => key !== "installmentType" && key !== "termMonths");
    numericKeys.forEach((key) => {
      const value = params.get(URL_KEYS[key]);
      if (value === null || value.trim() === "") return;
      const number = engine.parseNumeric(value);
      if (Number.isFinite(number)) parsed[key] = number;
    });
    const hasLegacyCombinedFee = params.has(URL_KEYS.administrationFundPercentage);
    const hasSeparatedFee = params.has(URL_KEYS.administrationPercentage) || params.has(URL_KEYS.reserveFundPercentage);
    if (hasLegacyCombinedFee && !hasSeparatedFee && Number.isFinite(parsed.administrationFundPercentage)) {
      parsed.administrationPercentage = parsed.administrationFundPercentage;
      parsed.reserveFundPercentage = 0;
    }
    const term = engine.parseNumeric(params.get(URL_KEYS.termMonths) || "");
    if (PLAN_TERMS.includes(term)) parsed.termMonths = term;
    const installment = params.get(URL_KEYS.installmentType);
    if (installment === "integral" || installment === "full") parsed.installmentType = "full";
    if (installment === "reduzida" || installment === "reduced") parsed.installmentType = "reduced";
    return parsed;
  }

  function buildScenarioUrl(input = currentResult?.input || currentInput) {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set(STRATEGY_QUERY_KEY, "revenda");
    params.set(MODE_QUERY_KEY, currentMode === "advanced" ? "avancado" : "simples");
    Object.entries(URL_KEYS).forEach(([key, queryKey]) => {
      let value = input[key];
      if (key === "installmentType") value = value === "full" ? "integral" : "reduzida";
      if (value !== undefined && value !== null && value !== "") params.set(queryKey, String(value));
    });
    url.search = params.toString();
    url.hash = "";
    return url.toString();
  }

  function scheduleUrlUpdate() {
    window.clearTimeout(urlTimer);
    urlTimer = window.setTimeout(() => {
      const url = new URL(buildScenarioUrl());
      window.history.replaceState({ simulator: true }, "", `${url.pathname}${url.search}`);
    }, 160);
  }

  function formatCurrency(value) {
    return engine.formatters.currency(value);
  }

  function formatPercentage(value, maximumFractionDigits = 2) {
    return engine.formatters.percentage(value, { maximumFractionDigits });
  }

  function formatSignedCurrency(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.005) return "sem diferença";
    const sign = value > 0 ? "+" : "−";
    return `${sign} ${formatCurrency(Math.abs(value))}`;
  }

  function valueOrFallback(input, fallback) {
    const parsed = engine.parseNumeric(input.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readFormInput() {
    const fallback = currentResult?.input || currentInput || DEFAULT_UI_INPUT;
    return {
      credit: valueOrFallback(dom.credit, fallback.credit),
      ownBid: valueOrFallback(dom.ownBid, fallback.ownBid),
      embeddedBidPercentage: valueOrFallback(dom.embeddedBid, fallback.embeddedBidPercentage),
      scenarioMonth: valueOrFallback(dom.monthNumber, fallback.scenarioMonth),
      premiumPercentage: valueOrFallback(dom.premium, fallback.premiumPercentage),
      termMonths: valueOrFallback(dom.term, fallback.termMonths),
      administrationPercentage: valueOrFallback(dom.administration, fallback.administrationPercentage),
      reserveFundPercentage: valueOrFallback(dom.reserveFund, fallback.reserveFundPercentage),
      annualCorrectionPercentage: valueOrFallback(dom.correction, fallback.annualCorrectionPercentage),
      installmentType: dom.installmentType.value === "full" ? "full" : "reduced",
      reducedInstallmentPercentage: valueOrFallback(dom.reducedPercentage, fallback.reducedInstallmentPercentage),
      otherOwnOutlays: valueOrFallback(dom.otherOutlays, fallback.otherOwnOutlays)
    };
  }

  function setMoneyInput(input, value, force = false) {
    if (!force && document.activeElement === input) return;
    input.value = formatCurrency(value);
  }

  function setControlValue(control, value, force = false) {
    if (!force && document.activeElement === control) return;
    control.value = String(value);
  }

  function findTemporarilyEmptyField() {
    const fields = [
      [dom.credit, "valor da carta"],
      [dom.ownBid, "lance com recurso próprio"],
      [dom.monthNumber, "cenário de contemplação"],
      [dom.premium, "ágio considerado"],
      [dom.administration, "taxa de administração"],
      [dom.reserveFund, "fundo de reserva"],
      [dom.correction, "correção anual"],
      [dom.otherOutlays, "outros desembolsos"]
    ];
    if (dom.installmentType.value === "reduced") fields.push([dom.reducedPercentage, "percentual da parcela reduzida"]);
    return fields.find(([field]) => field.value.trim() === "");
  }

  function syncForm(input, force = false) {
    setMoneyInput(dom.credit, input.credit, force);
    setMoneyInput(dom.ownBid, input.ownBid, force);
    setMoneyInput(dom.otherOutlays, input.otherOwnOutlays, force);
    dom.embeddedBid.max = String(engine.DEFAULT_CONFIG.embeddedBid.maxPercentage);
    setControlValue(dom.embeddedBid, input.embeddedBidPercentage, force);
    dom.embeddedOutput.value = formatPercentage(input.embeddedBidPercentage, 1);
    dom.embeddedOutput.textContent = dom.embeddedOutput.value;
    dom.month.max = String(input.termMonths);
    dom.monthNumber.max = String(input.termMonths);
    setControlValue(dom.month, input.scenarioMonth, force);
    setControlValue(dom.monthNumber, input.scenarioMonth, force);
    setControlValue(dom.premium, input.premiumPercentage, force);
    setControlValue(dom.term, input.termMonths, force);
    setControlValue(dom.administration, input.administrationPercentage, force);
    setControlValue(dom.reserveFund, input.reserveFundPercentage, force);
    setControlValue(dom.correction, input.annualCorrectionPercentage, force);
    setControlValue(dom.installmentType, input.installmentType, force);
    setControlValue(dom.reducedPercentage, input.reducedInstallmentPercentage, force);
    dom.reducedField.hidden = input.installmentType === "full";
    const embeddedRange = engine.DEFAULT_CONFIG.embeddedBid.maxPercentage || 1;
    dom.embeddedBid.style.setProperty("--range-progress", `${input.embeddedBidPercentage / embeddedRange * 100}%`);
    dom.month.style.setProperty("--range-progress", `${(input.scenarioMonth - 1) / Math.max(1, input.termMonths - 1) * 100}%`);
    updatePressedPresets(input);
  }

  function updatePressedPresets(input) {
    const setPressed = (button, active) => {
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    };
    $$('[data-credit]').forEach((button) => setPressed(button, Number(button.dataset.credit) === input.credit));
    $$('[data-embedded]').forEach((button) => setPressed(button, Number(button.dataset.embedded) === input.embeddedBidPercentage));
    $$('[data-month]').forEach((button) => setPressed(button, Number(button.dataset.month) === input.scenarioMonth));
    $$('[data-scenario-preset]').forEach((button) => {
      const preset = SCENARIO_PRESETS[button.dataset.scenarioPreset];
      const matches = preset && Object.entries(preset).every(([key, value]) => input[key] === value);
      setPressed(button, Boolean(matches));
    });
  }

  function setText(element, value) {
    if (!element || element.textContent === value) return;
    element.textContent = value;
    element.classList.remove("is-updated");
    requestAnimationFrame(() => element.classList.add("is-updated"));
  }

  function setResultCurrency(element, value) {
    const formatted = formatCurrency(value);
    setText(element, formatted);
    const compactLength = formatted.replace(/\s/g, "").length;
    element.classList.toggle("is-compact", compactLength > 14);
    element.classList.toggle("is-extra-compact", compactLength > 18);
  }

  function renderResults(result) {
    setText(dom.outputs.bidOwn, formatCurrency(result.ownBid));
    setText(dom.outputs.bidEmbedded, formatCurrency(result.embeddedBid));
    setText(dom.outputs.bidTotal, formatCurrency(result.totalBid));
    setText(dom.outputs.bidPercentage, formatPercentage(result.totalBidPercentage));
    setText(dom.outputs.bidNetCredit, formatCurrency(result.netCredit));
    const ownShare = result.totalBid > 0 ? result.ownBid / result.totalBid * 100 : 0;
    const embeddedShare = result.totalBid > 0 ? result.embeddedBid / result.totalBid * 100 : 0;
    dom.bidBarOwn.style.width = `${ownShare}%`;
    dom.bidBarEmbedded.style.width = `${embeddedShare}%`;
    setResultCurrency(dom.outputs.capital, result.investedCapital);
    setText(dom.outputs.installmentsPaid, formatCurrency(result.installmentsPaidTotal));
    setText(dom.outputs.ownBid, formatCurrency(result.ownBid));
    setText(dom.outputs.otherOutlays, formatCurrency(result.input.otherOwnOutlays));
    setText(dom.outputs.month, `${result.input.scenarioMonth} ${result.input.scenarioMonth === 1 ? "mês" : "meses"}`);
    setResultCurrency(dom.outputs.netCredit, result.adjustedNetCredit);
    setText(dom.outputs.baseCredit, formatCurrency(result.input.credit));
    setText(dom.outputs.adjustedCredit, formatCurrency(result.adjustedCredit));
    setText(dom.outputs.embeddedBid, formatCurrency(result.embeddedBid));
    setResultCurrency(dom.outputs.operationValue, result.estimatedOperationValue);
    setText(dom.outputs.premiumBase, formatCurrency(result.operation.premiumBase));
    setText(dom.outputs.premiumPercentage, formatPercentage(result.input.premiumPercentage));
    setText(dom.outputs.premiumValue, formatCurrency(result.estimatedPremium));
    setResultCurrency(dom.outputs.profit, result.grossProfit);
    setText(dom.outputs.profitFormula, `${formatCurrency(result.estimatedPremium)} − ${formatCurrency(result.investedCapital)}`);
    setText(dom.outputs.roi, result.roi === null ? "—" : formatPercentage(result.roi));
    setText(dom.outputs.initialInstallment, formatCurrency(result.initialInstallment));
    setText(dom.outputs.currentInstallment, formatCurrency(result.installmentAtScenario));
    setText(dom.outputs.correctionPeriods, `${result.correctionPeriods} ${result.correctionPeriods === 1 ? "período" : "períodos"}`);
    setText(dom.outputs.correctionRate, `${formatPercentage(result.input.annualCorrectionPercentage)} ao ano`);
    setText(dom.outputs.balanceBeforeBid, formatCurrency(result.debt.balanceBeforeBid));
    setText(dom.outputs.appliedBid, formatCurrency(result.debt.appliedBid));
    setText(dom.outputs.balanceAfterBid, formatCurrency(result.debt.balanceAfterBid));
    setText(dom.outputs.postInstallment, formatCurrency(result.postContemplationInstallment));
    setText(dom.outputs.remainingMonths, `${result.remainingMonths} meses`);
    setText(dom.scenarioLabel, `Contemplação considerada na ${result.input.scenarioMonth}ª assembleia`);
    if (dom.generatedAt) dom.generatedAt.textContent = `Simulação gerada em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`;

    const embeddedCopy = result.embeddedBid > 0
      ? ` e lance embutido de ${formatPercentage(result.input.embeddedBidPercentage)}`
      : " e sem lance embutido";
    setText(dom.summary, `Neste cenário, uma carta de ${formatCurrency(result.input.credit)}, com lance próprio de ${formatCurrency(result.ownBid)}${embeddedCopy}, formaria um lance total de ${formatCurrency(result.totalBid)}. O crédito líquido inicial seria de ${formatCurrency(result.netCredit)}. Considerando a ${result.input.scenarioMonth}ª assembleia e os demais parâmetros selecionados, o capital próprio investido até esse momento seria de aproximadamente ${formatCurrency(result.investedCapital)}. Trata-se de uma simulação, não de uma previsão de contemplação ou resultado.`);

    const messages = [...result.validation.errors, ...result.warnings];
    dom.formFeedback.textContent = messages.join(" ");
    dom.formFeedback.hidden = messages.length === 0;
    updateCalculationBreakdown(result);
    updateWhatsapp(result);
    renderChart(result);
  }

  function renderImpact(previous, next, changedKey) {
    if (!previous || !changedKey) {
      dom.impact.hidden = true;
      return;
    }
    const capitalDifference = next.investedCapital - previous.investedCapital;
    const profitDifference = next.grossProfit - previous.grossProfit;
    if (Math.abs(capitalDifference) < 0.005 && Math.abs(profitDifference) < 0.005) {
      dom.impact.hidden = true;
      return;
    }
    const labels = {
      scenarioMonth: "Ao alterar o mês considerado",
      credit: "Ao alterar o valor da carta",
      ownBid: "Ao alterar o lance próprio",
      embeddedBidPercentage: "Ao alterar o lance embutido",
      premiumPercentage: "Ao alterar o ágio",
      termMonths: "Ao alterar o prazo",
      administrationPercentage: "Ao alterar a taxa de administração",
      reserveFundPercentage: "Ao alterar o fundo de reserva",
      annualCorrectionPercentage: "Ao alterar a correção",
      installmentType: "Ao alterar o tipo de parcela",
      reducedInstallmentPercentage: "Ao alterar a redução",
      otherOwnOutlays: "Ao alterar outros desembolsos"
    };
    dom.impact.textContent = `${labels[changedKey] || "Com esta alteração"}: ${formatSignedCurrency(capitalDifference)} em capital próprio e ${formatSignedCurrency(profitDifference)} no lucro bruto estimado.`;
    dom.impact.hidden = false;
  }

  function updateCalculationBreakdown(result) {
    const rows = [
      ["01 · Carta contratada", formatCurrency(result.input.credit)],
      ["02 · Taxa de administração", formatPercentage(result.input.administrationPercentage)],
      ["03 · Fundo de reserva", formatPercentage(result.input.reserveFundPercentage)],
      ["04 · Custo total de referência", `${formatCurrency(result.input.credit)} + ${formatPercentage(result.input.administrationFundPercentage)} = ${formatCurrency(result.totalPlanValue)}`],
      ["05 · Parcela integral inicial", formatCurrency(result.baseInstallment)],
      ["06 · Parcela inicial utilizada", `${formatCurrency(result.initialInstallment)} · ${result.input.installmentType === "reduced" ? `${formatPercentage(result.input.reducedInstallmentPercentage)} da integral` : "integral"}`],
      ["07 · Correções aplicadas", `${result.correctionPeriods} · ${formatPercentage(result.input.annualCorrectionPercentage)} ao ano`],
      ["08 · Parcela no momento considerado", formatCurrency(result.installmentAtScenario)],
      ["09 · Total pago em parcelas", `${result.installmentsPaid} parcelas somadas período a período = ${formatCurrency(result.installmentsPaidTotal)}`],
      ["10 · Crédito atualizado", `${formatCurrency(result.input.credit)} corrigidos = ${formatCurrency(result.adjustedCredit)}`],
      ["11 · Saldo antes do lance", `${formatCurrency(result.debt.adjustedPlanValue)} − ${formatCurrency(result.installmentsPaidTotal)} = ${formatCurrency(result.debt.balanceBeforeBid)}`],
      ["12 · Lance próprio", formatCurrency(result.ownBid)],
      ["13 · Lance embutido", `${formatCurrency(result.embeddedBid)} · ${formatPercentage(result.input.embeddedBidPercentage)}`],
      ["14 · Lance aplicado", `${formatCurrency(result.ownBid)} + ${formatCurrency(result.embeddedBid)} = ${formatCurrency(result.debt.appliedBid)}`],
      ["15 · Saldo depois do lance", `${formatCurrency(result.debt.balanceBeforeBid)} − ${formatCurrency(result.debt.appliedBid)} = ${formatCurrency(result.debt.balanceAfterBid)}`],
      ["16 · Crédito líquido", `${formatCurrency(result.adjustedCredit)} − ${formatCurrency(result.embeddedBid)} = ${formatCurrency(result.adjustedNetCredit)}`],
      ["17 · Parcela pós-contemplação", `${formatCurrency(result.debt.balanceAfterBid)} ÷ ${result.remainingMonths || 0} meses = ${formatCurrency(result.postContemplationInstallment)}`],
      ["18 · Capital próprio total", `${formatCurrency(result.installmentsPaidTotal)} + ${formatCurrency(result.ownBid)}${result.input.otherOwnOutlays > 0 ? ` + ${formatCurrency(result.input.otherOwnOutlays)}` : ""} = ${formatCurrency(result.investedCapital)}`],
      ["19 · Base do ágio", formatCurrency(result.operation.premiumBase)],
      ["20 · Ágio estimado", `${formatCurrency(result.operation.premiumBase)} × ${formatPercentage(result.input.premiumPercentage)} = ${formatCurrency(result.estimatedPremium)}`],
      ["21 · Resultado bruto estimado", `${formatCurrency(result.estimatedPremium)} − ${formatCurrency(result.investedCapital)} = ${formatCurrency(result.grossProfit)}`],
      ["22 · ROI sobre capital próprio", result.roi === null ? "—" : `${formatCurrency(result.grossProfit)} ÷ ${formatCurrency(result.investedCapital)} = ${formatPercentage(result.roi)}`]
    ];
    dom.breakdown.innerHTML = rows.map(([label, value]) => `<div class="strategy-calculation-row"><dt>${label}</dt><dd>${value}</dd></div>`).join("");
  }

  function buildResaleSummary(result) {
    const roi = result.roi === null ? "não calculável neste cenário" : formatPercentage(result.roi);
    return [
      "Estratégia: revenda da cota",
      `Simulação gerada em: ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`,
      "",
      `Carta: ${formatCurrency(result.input.credit)}`,
      `Lance próprio: ${formatCurrency(result.ownBid)}`,
      `Lance embutido: ${formatPercentage(result.input.embeddedBidPercentage)} (${formatCurrency(result.embeddedBid)})`,
      `Lance total: ${formatCurrency(result.totalBid)}`,
      `Cenário de contemplação: ${result.input.scenarioMonth}ª assembleia`,
      `Capital próprio estimado: ${formatCurrency(result.investedCapital)}`,
      `Crédito líquido inicial: ${formatCurrency(result.netCredit)}`,
      `Parcela inicial: ${formatCurrency(result.initialInstallment)}`,
      `Parcela atual: ${formatCurrency(result.installmentAtScenario)}`,
      `Parcela pós-contemplação estimada: ${formatCurrency(result.postContemplationInstallment)}`,
      `Saldo depois do lance: ${formatCurrency(result.debt.balanceAfterBid)}`,
      `Ágio considerado: ${formatPercentage(result.input.premiumPercentage)}`,
      `Lucro bruto estimado: ${formatCurrency(result.grossProfit)}`,
      `ROI estimado: ${roi}`
    ].join("\n");
  }

  function buildWhatsappMessage(result) {
    return [
      "Olá! Fiz uma simulação de revenda de cota no site.",
      "",
      buildResaleSummary(result),
      "",
      "Gostaria de analisar esse cenário. Sei que os valores são apenas uma simulação e podem variar."
    ].join("\n");
  }

  function updateWhatsapp(result) {
    dom.whatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsappMessage(result))}`;
  }

  function calculate(changedKey = "", options = {}) {
    const emptyField = options.input ? null : findTemporarilyEmptyField();
    if (emptyField) {
      const [field, label] = emptyField;
      field.setAttribute("aria-invalid", "true");
      dom.formFeedback.textContent = `Preencha ${label} para atualizar a simulação.`;
      dom.formFeedback.hidden = false;
      return;
    }
    $$('[aria-invalid="true"]', dom.form).forEach((field) => field.removeAttribute("aria-invalid"));
    const raw = options.input || readFormInput();
    const next = engine.calculateSimulation(raw);
    const before = currentResult;
    previousResult = before;
    currentResult = next;
    currentInput = { ...next.input };
    syncForm(next.input, Boolean(options.forceSync));
    renderResults(next);
    renderImpact(before, next, changedKey);
    if (options.updateUrl) scheduleUrlUpdate();
    whatsappAvoidanceUpdate?.();
  }

  function scheduleCalculation(changedKey, options = {}) {
    if (calculationFrame) cancelAnimationFrame(calculationFrame);
    calculationFrame = requestAnimationFrame(() => {
      calculationFrame = 0;
      calculate(changedKey, options);
    });
  }

  function markStarted() {
    if (simulatorStarted) return;
    simulatorStarted = true;
    trackEvent("simulator_started");
  }

  function parameterChanged(key) {
    markStarted();
    trackEvent("simulator_parameter_changed", {
      parameter: key,
      scenario_month: currentResult?.input.scenarioMonth,
      embedded_bid_percentage: currentResult?.input.embeddedBidPercentage
    });
  }

  function showActionFeedback(message) {
    window.clearTimeout(actionTimer);
    dom.actionFeedback.textContent = message;
    actionTimer = window.setTimeout(() => { dom.actionFeedback.textContent = ""; }, 3200);
  }

  function scenarioSnapshot(result, index) {
    return {
      id: `${Date.now()}-${index}`,
      name: `Cenário ${index + 1}`,
      input: { ...result.input },
      values: {
        capital: result.investedCapital,
        netCredit: result.netCredit,
        adjustedNetCredit: result.adjustedNetCredit,
        premium: result.estimatedPremium,
        profit: result.grossProfit,
        roi: result.roi,
        ownBid: result.ownBid,
        embeddedBid: result.embeddedBid,
        currentInstallment: result.installmentAtScenario,
        postInstallment: result.postContemplationInstallment,
        adjustedCredit: result.adjustedCredit,
        balanceAfterBid: result.debt.balanceAfterBid
      }
    };
  }

  function saveCurrentScenario() {
    if (!currentResult) return;
    if (savedScenarios.length >= 3) {
      showActionFeedback("Você já salvou o limite de três cenários.");
      return;
    }
    const signature = JSON.stringify(currentResult.input);
    if (savedScenarios.some((scenario) => JSON.stringify(scenario.input) === signature)) {
      showActionFeedback("Este cenário já está salvo.");
      return;
    }
    savedScenarios.push(scenarioSnapshot(currentResult, savedScenarios.length));
    renderScenarios();
    showActionFeedback(`${savedScenarios.at(-1).name} salvo nesta sessão.`);
    trackEvent("simulator_scenario_saved", { scenario_count: savedScenarios.length, scenario_month: currentResult.input.scenarioMonth });
    if (savedScenarios.length >= 2 && !comparisonTracked) {
      comparisonTracked = true;
      trackEvent("simulator_comparison_viewed", { scenario_count: savedScenarios.length });
    }
  }

  function renderScenarios() {
    dom.comparison.hidden = savedScenarios.length === 0;
    dom.saveScenario.disabled = savedScenarios.length >= 3;
    dom.saveScenario.setAttribute("aria-disabled", String(savedScenarios.length >= 3));
    if (!savedScenarios.length) {
      dom.scenarioRail.innerHTML = "";
      return;
    }
    const baseline = savedScenarios[0];
    dom.scenarioRail.innerHTML = savedScenarios.map((scenario, index) => {
      const capitalDifference = scenario.values.capital - baseline.values.capital;
      const profitDifference = scenario.values.profit - baseline.values.profit;
      const installmentDifference = scenario.values.currentInstallment - baseline.values.currentInstallment;
      const difference = index === 0 ? "<p class=\"strategy-scenario-base\">Base da comparação</p>" : `<p class="strategy-scenario-difference">Diferenças matemáticas: ${formatSignedCurrency(capitalDifference)} em capital · ${formatSignedCurrency(profitDifference)} no resultado · ${formatSignedCurrency(installmentDifference)} na parcela atual</p>`;
      return `<article class="strategy-scenario-card" data-scenario-id="${scenario.id}"><header class="strategy-scenario-card-head"><div><span>${scenario.name}</span><strong>${scenario.input.scenarioMonth}ª assembleia</strong></div><button class="strategy-scenario-remove" type="button" data-remove-scenario="${scenario.id}" aria-label="Remover ${scenario.name}">×</button></header><dl class="strategy-scenario-metrics"><div><dt>Carta</dt><dd>${formatCurrency(scenario.input.credit)}</dd></div><div><dt>Capital próprio</dt><dd>${formatCurrency(scenario.values.capital)}</dd></div><div><dt>Lance próprio</dt><dd>${formatCurrency(scenario.values.ownBid)}</dd></div><div><dt>Lance embutido</dt><dd>${formatCurrency(scenario.values.embeddedBid)}</dd></div><div><dt>Crédito líquido</dt><dd>${formatCurrency(scenario.values.netCredit)}</dd></div><div><dt>Crédito corrigido</dt><dd>${formatCurrency(scenario.values.adjustedCredit)}</dd></div><div><dt>Parcela atual</dt><dd>${formatCurrency(scenario.values.currentInstallment)}</dd></div><div><dt>Parcela pós</dt><dd>${formatCurrency(scenario.values.postInstallment)}</dd></div><div><dt>Saldo após lance</dt><dd>${formatCurrency(scenario.values.balanceAfterBid)}</dd></div><div><dt>Ágio estimado</dt><dd>${formatCurrency(scenario.values.premium)}</dd></div><div><dt>Resultado</dt><dd>${formatCurrency(scenario.values.profit)}</dd></div><div><dt>ROI</dt><dd>${scenario.values.roi === null ? "—" : formatPercentage(scenario.values.roi)}</dd></div></dl>${difference}<button class="strategy-scenario-apply strategy-button strategy-button-outline" type="button" data-apply-scenario="${scenario.id}">Aplicar este cenário</button></article>`;
    }).join("");
  }

  function applySavedScenario(id) {
    const scenario = savedScenarios.find((item) => item.id === id);
    if (!scenario) return;
    calculate("scenarioMonth", { input: scenario.input, forceSync: true, updateUrl: true });
    $("#configurar").scrollIntoView({ behavior: "smooth", block: "start" });
    showActionFeedback(`${scenario.name} aplicado.`);
  }

  function removeSavedScenario(id) {
    savedScenarios = savedScenarios.filter((scenario) => scenario.id !== id).map((scenario, index) => ({ ...scenario, name: `Cenário ${index + 1}` }));
    if (savedScenarios.length < 2) comparisonTracked = false;
    renderScenarios();
    showActionFeedback("Cenário removido.");
  }

  function trackEvent(name, parameters = {}) {
    const safeParameters = { strategy: "resale", ...parameters, page_area: "strategy_simulator" };
    if (typeof window.gtag === "function") {
      window.gtag("event", name, safeParameters);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name, ...safeParameters });
    }
    window.dispatchEvent(new CustomEvent("cristal:analytics", { detail: { event: name, parameters: safeParameters } }));
  }

  async function shareSimulation() {
    if (!currentResult) return;
    const url = buildScenarioUrl(currentResult.input);
    const shareData = {
      title: "Meu cenário de revenda no simulador da Cristal",
      text: `Estratégia de revenda · modo ${currentMode === "advanced" ? "avançado" : "simples"} · carta de ${formatCurrency(currentResult.input.credit)} e cenário na ${currentResult.input.scenarioMonth}ª assembleia.`,
      url
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showActionFeedback("Simulação compartilhada.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showActionFeedback("Link copiado.");
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        showActionFeedback("Link copiado.");
      }
      trackEvent("simulator_shared", { method: navigator.share ? "native" : "copy_link" });
    } catch (error) {
      if (error?.name !== "AbortError") showActionFeedback("Não foi possível compartilhar. Copie o endereço do navegador.");
    }
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  async function copyResaleSummary() {
    if (!currentResult) return;
    try {
      await copyText(buildResaleSummary(currentResult));
      showActionFeedback("Resumo copiado.");
      trackEvent("simulation_summary_copied", { strategy: "resale" });
    } catch (_) {
      showActionFeedback("Não foi possível copiar o resumo.");
    }
  }

  function printResaleSimulation() {
    document.body.dataset.printStrategy = "resale";
    trackEvent("simulation_printed", { strategy: "resale" });
    window.print();
  }

  function resetResaleSimulation() {
    currentMode = "simple";
    setResaleMode(currentMode, false);
    calculate("", { input: DEFAULT_UI_INPUT, forceSync: true, updateUrl: true });
    showActionFeedback("Valores padrão restaurados.");
  }

  function renderChart(result) {
    const timeline = result.timeline;
    if (!timeline.length) return;
    const plot = { left: 60, right: 730, top: 28, bottom: 306 };
    const width = plot.right - plot.left;
    const height = plot.bottom - plot.top;
    const maxValue = Math.max(1, ...timeline.map((point) => Math.max(point.investedCapital, point.estimatedOperationValue))) * 1.08;
    const xFor = (month) => plot.left + ((month - 1) / Math.max(1, timeline.length - 1)) * width;
    const yFor = (value) => plot.bottom - Math.max(0, value) / maxValue * height;
    const points = (key) => timeline.map((point) => `${xFor(point.month).toFixed(2)},${yFor(point[key]).toFixed(2)}`).join(" ");
    dom.chartCapitalLine.setAttribute("points", points("investedCapital"));
    dom.chartOperationLine.setAttribute("points", points("estimatedOperationValue"));
    dom.chartGrid.innerHTML = [0, .25, .5, .75, 1].map((ratio) => {
      const y = plot.bottom - height * ratio;
      return `<line class="strategy-chart-grid-line" x1="${plot.left}" x2="${plot.right}" y1="${y}" y2="${y}"></line><text class="strategy-chart-axis-label" x="${plot.left - 10}" y="${y + 4}" text-anchor="end">${compactMoney(maxValue * ratio)}</text>`;
    }).join("") + `<text class="strategy-chart-axis-label" x="${plot.left}" y="338">1</text><text class="strategy-chart-axis-label" x="${plot.right}" y="338" text-anchor="end">${timeline.length} meses</text>`;
    chartGeometry = { timeline, plot, xFor, yFor };
    renderChartTable(result);
    showChartPoint(result.input.scenarioMonth, false);
    const description = `No mês ${result.input.scenarioMonth}, o capital próprio estimado é ${formatCurrency(result.investedCapital)} e o valor estimado da operação é ${formatCurrency(result.estimatedOperationValue)}.`;
    $("#chart-svg-desc").textContent = description;
  }

  function renderChartTable(result) {
    if (!dom.chartTableBody) return;
    const selectedMonths = new Set([1, result.input.scenarioMonth, result.timeline.length]);
    for (let month = 12; month <= result.timeline.length; month += 12) selectedMonths.add(month);
    dom.chartTableBody.innerHTML = [...selectedMonths]
      .sort((a, b) => a - b)
      .map((month) => result.timeline[Math.min(month, result.timeline.length) - 1])
      .map((point) => `<tr><th scope="row">${point.month}</th><td>${formatCurrency(point.investedCapital)}</td><td>${formatCurrency(point.adjustedCredit)}</td><td>${formatCurrency(point.estimatedPremium)}</td><td>${formatCurrency(point.estimatedOperationValue)}</td><td>${formatCurrency(point.grossProfit)}</td></tr>`)
      .join("");
  }

  function compactMoney(value) {
    return new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL", maximumFractionDigits: 1 }).format(value);
  }

  function showChartPoint(month, floating = true) {
    if (!chartGeometry) return;
    const safeMonth = Math.min(Math.max(Math.round(month), 1), chartGeometry.timeline.length);
    const point = chartGeometry.timeline[safeMonth - 1];
    const x = chartGeometry.xFor(safeMonth);
    const capitalY = chartGeometry.yFor(point.investedCapital);
    const operationY = chartGeometry.yFor(point.estimatedOperationValue);
    dom.chartMarker.setAttribute("x1", x);
    dom.chartMarker.setAttribute("x2", x);
    dom.chartCapitalPoint.setAttribute("cx", x);
    dom.chartCapitalPoint.setAttribute("cy", capitalY);
    dom.chartOperationPoint.setAttribute("cx", x);
    dom.chartOperationPoint.setAttribute("cy", operationY);
    const aria = `Mês ${safeMonth}: capital próprio ${formatCurrency(point.investedCapital)}, crédito corrigido ${formatCurrency(point.adjustedCredit)}, ágio ${formatCurrency(point.estimatedPremium)} e lucro bruto ${formatCurrency(point.grossProfit)}.`;
    dom.chartCapitalPoint.setAttribute("aria-label", aria);
    dom.chartOperationPoint.setAttribute("aria-label", aria);
    dom.chartTooltip.innerHTML = `<strong>${safeMonth}º mês</strong><span>Capital: ${formatCurrency(point.investedCapital)}</span><span>Crédito corrigido: ${formatCurrency(point.adjustedCredit)}</span><span>Ágio: ${formatCurrency(point.estimatedPremium)}</span><span>Lucro: ${formatCurrency(point.grossProfit)}</span>`;
    dom.chartTooltip.style.left = `${Math.min(88, Math.max(12, x / 760 * 100))}%`;
    dom.chartTooltip.style.top = `${Math.min(capitalY, operationY) / 360 * 100}%`;
    dom.chartTooltip.classList.toggle("is-visible", floating);
  }

  function setupChartInteraction() {
    const pointFromEvent = (event) => {
      if (!chartGeometry) return;
      const rectangle = dom.chart.getBoundingClientRect();
      const localX = (event.clientX - rectangle.left) / rectangle.width * 760;
      const ratio = (localX - chartGeometry.plot.left) / (chartGeometry.plot.right - chartGeometry.plot.left);
      const month = 1 + ratio * (chartGeometry.timeline.length - 1);
      showChartPoint(month, true);
    };
    dom.chart.addEventListener("pointermove", pointFromEvent);
    dom.chart.addEventListener("click", pointFromEvent);
    dom.chart.addEventListener("pointerleave", () => {
      dom.chartTooltip.classList.remove("is-visible");
      showChartPoint(currentResult.input.scenarioMonth, false);
    });
    [dom.chartCapitalPoint, dom.chartOperationPoint].forEach((point) => {
      point.addEventListener("focus", () => showChartPoint(currentResult.input.scenarioMonth, true));
      point.addEventListener("blur", () => dom.chartTooltip.classList.remove("is-visible"));
    });
  }

  function setupNavigation() {
    const header = $(".site-header");
    const toggle = $(".menu-toggle");
    const nav = $(".main-nav");
    const mobile = window.matchMedia("(max-width: 780px)");
    const setMenu = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      nav.classList.toggle("open", open);
      nav.toggleAttribute("inert", mobile.matches && !open);
    };
    const updateHeader = () => header.classList.toggle("is-stuck", window.scrollY > 12);
    toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (event) => { if (event.target.closest("a")) setMenu(false); });
    document.addEventListener("click", (event) => { if (nav.classList.contains("open") && !nav.contains(event.target) && !toggle.contains(event.target)) setMenu(false); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && nav.classList.contains("open")) { setMenu(false); toggle.focus(); } });
    mobile.addEventListener("change", () => setMenu(false));
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();
    setMenu(false);
  }

  function setResaleMode(mode, scroll = false) {
    currentMode = mode === "advanced" ? "advanced" : "simple";
    dom.modeButtons.forEach((item) => {
      const active = item.dataset.resaleMode === currentMode;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    dom.advancedFields.hidden = currentMode !== "advanced";
    if (scroll && currentMode === "advanced") dom.advancedFields.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setupModeToggle() {
    setResaleMode(currentMode, false);
    dom.modeButtons.forEach((button) => button.addEventListener("click", () => {
      setResaleMode(button.dataset.resaleMode, true);
      scheduleUrlUpdate();
      trackEvent("simulator_parameter_changed", { parameter: "mode", mode: currentMode, strategy: "resale" });
    }));
  }

  function setupTooltips() {
    $$(".strategy-info-button").forEach((button) => button.addEventListener("click", () => {
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    }));
  }

  function setupInputs() {
    [dom.credit, dom.ownBid, dom.otherOutlays].forEach((input) => {
      input.addEventListener("input", () => { markStarted(); scheduleCalculation(input.name, { updateUrl: true }); });
      input.addEventListener("blur", () => {
        setMoneyInput(input, valueOrFallback(input, currentResult.input[input.name]), true);
        calculate(input.name, { updateUrl: true });
        parameterChanged(input.name);
      });
    });

    const liveInputs = [
      [dom.embeddedBid, "embeddedBidPercentage"], [dom.month, "scenarioMonth"], [dom.monthNumber, "scenarioMonth"],
      [dom.premium, "premiumPercentage"], [dom.term, "termMonths"], [dom.administration, "administrationPercentage"],
      [dom.reserveFund, "reserveFundPercentage"],
      [dom.correction, "annualCorrectionPercentage"], [dom.installmentType, "installmentType"],
      [dom.reducedPercentage, "reducedInstallmentPercentage"]
    ];
    liveInputs.forEach(([input, key]) => {
      input.addEventListener("input", () => { markStarted(); scheduleCalculation(key, { updateUrl: true }); });
      input.addEventListener("change", () => parameterChanged(key));
      if (input.type === "number") {
        input.addEventListener("blur", () => {
          if (input.value.trim() !== "") return;
          setControlValue(input, currentResult.input[key], true);
          calculate(key, { updateUrl: true });
        });
      }
    });

    $$('[data-credit]').forEach((button) => button.addEventListener("click", () => applyPartialInput({ credit: Number(button.dataset.credit) }, "credit")));
    $$('[data-embedded]').forEach((button) => button.addEventListener("click", () => applyPartialInput({ embeddedBidPercentage: Number(button.dataset.embedded) }, "embeddedBidPercentage")));
    $$('[data-month]').forEach((button) => button.addEventListener("click", () => applyPartialInput({ scenarioMonth: Number(button.dataset.month) }, "scenarioMonth")));
    $$('[data-month-step]').forEach((button) => button.addEventListener("click", () => applyPartialInput({ scenarioMonth: currentResult.input.scenarioMonth + Number(button.dataset.monthStep) }, "scenarioMonth")));
    $$('[data-scenario-preset]').forEach((button) => button.addEventListener("click", () => {
      const preset = SCENARIO_PRESETS[button.dataset.scenarioPreset];
      if (preset) applyPartialInput(preset, "scenarioMonth");
    }));
  }

  function applyPartialInput(partial, changedKey) {
    markStarted();
    calculate(changedKey, { input: { ...currentResult.input, ...partial }, forceSync: true, updateUrl: true });
    parameterChanged(changedKey);
  }

  function setupDialog() {
    $$('[data-open-calculation]').forEach((button) => button.addEventListener("click", () => {
      if (currentResult) updateCalculationBreakdown(currentResult);
      if (dom.calculationTitle) dom.calculationTitle.textContent = "Como a revenda foi calculada";
      if (dom.calculationIntro) dom.calculationIntro.textContent = "Confira carta, taxas, parcelas, saldo, lance, crédito líquido, ágio e resultado em etapas auditáveis.";
      if (dom.calculationNote) dom.calculationNote.textContent = "O lance embutido usa o crédito original como base; o ágio usa o crédito líquido corrigido; a parcela pós divide o saldo após o lance pelo prazo restante. Regras da administradora podem alterar essas premissas.";
      trackEvent("calculation_breakdown_opened", { strategy: "resale" });
      if (typeof dom.dialog.showModal === "function") dom.dialog.showModal();
      else dom.dialog.setAttribute("open", "");
    }));
    $('[data-close-calculation]').addEventListener("click", () => dom.dialog.close());
    dom.dialog.addEventListener("click", (event) => { if (event.target === dom.dialog) dom.dialog.close(); });
  }

  function setupScenarioActions() {
    dom.saveScenario.addEventListener("click", saveCurrentScenario);
    dom.scenarioRail.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-scenario]");
      const apply = event.target.closest("[data-apply-scenario]");
      if (remove) removeSavedScenario(remove.dataset.removeScenario);
      if (apply) applySavedScenario(apply.dataset.applyScenario);
    });
    dom.shareButtons.forEach((button) => button.addEventListener("click", shareSimulation));
    dom.copySummary?.addEventListener("click", copyResaleSummary);
    dom.printSimulation?.addEventListener("click", printResaleSimulation);
    dom.resetSimulation?.addEventListener("click", resetResaleSimulation);
    dom.whatsapp.addEventListener("click", () => trackEvent("simulator_whatsapp_clicked", {
      scenario_month: currentResult.input.scenarioMonth,
      embedded_bid_percentage: currentResult.input.embeddedBidPercentage,
      credit_band: creditBand(currentResult.input.credit)
    }));
  }

  function creditBand(value) {
    if (value < 200000) return "under_200k";
    if (value < 500000) return "200k_to_500k";
    if (value < 1000000) return "500k_to_1m";
    return "over_1m";
  }

  function setupWhatsappAvoidance() {
    const button = $("[data-floating-whatsapp]");
    if (!button) return;
    const protectedSelectors = [".strategy-hero-aside", ".strategy-bid-composition", ".strategy-scenario-actions", ".strategy-chart-frame", ".strategy-cta", ".site-footer", "dialog[open]", "[data-whatsapp-avoid]"].join(",");
    const mobileProtectedSelectors = [
      ".strategy-strategy-button",
      ".strategy-form :is(input, select, button, output, label, .strategy-help, .strategy-inline-tooltip)",
      ".strategy-result-card :is(.strategy-result-value, dt, dd, button)",
      ".leverage-result-card :is(.leverage-card-value, dt, dd, button)",
      ".leverage-patrimony-card :is(.leverage-card-value, dt, dd, button)",
      ".strategy-summary",
      ".strategy-scenario-card",
      ".strategy-secondary-actions button",
      ".leverage-evolution",
      ".leverage-timeline",
      ".leverage-stress",
      ".leverage-variation-panel",
      ".leverage-sensitivity"
    ].join(",");
    let frame = 0;
    const overlaps = (first, second) => first.left < second.right + 8 && first.right > second.left - 8 && first.top < second.bottom + 8 && first.bottom > second.top - 8;
    const update = () => {
      frame = 0;
      const buttonRect = button.getBoundingClientRect();
      const selectors = window.matchMedia("(max-width: 768px)").matches
        ? `${protectedSelectors},${mobileProtectedSelectors}`
        : protectedSelectors;
      const obscures = $$(selectors).some((element) => {
        if (element === button) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && overlaps(buttonRect, rect);
      });
      button.classList.toggle("is-obscuring", obscures);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "open"] });
    document.fonts?.ready.then(schedule);
    whatsappAvoidanceUpdate = schedule;
    schedule();
  }

  function init() {
    $("#current-year").textContent = new Date().getFullYear();
    setupNavigation();
    setupModeToggle();
    setupTooltips();
    setupInputs();
    setupDialog();
    setupScenarioActions();
    setupChartInteraction();
    setupWhatsappAvoidance();
    calculate("", { input: currentInput, forceSync: true, updateUrl: false });
    window.CristalResaleSimulator = Object.freeze({
      getCurrentResult: () => currentResult,
      getCurrentMode: () => currentMode,
      buildScenarioUrl,
      refresh() {
        if (currentResult) renderResults(currentResult);
      },
      activate() {
        const url = new URL(buildScenarioUrl());
        window.history.replaceState({ simulator: true }, "", `${url.pathname}${url.search}`);
      }
    });
    if (!startsInLeverage) {
      trackEvent("simulator_view", { strategy: "resale" });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
