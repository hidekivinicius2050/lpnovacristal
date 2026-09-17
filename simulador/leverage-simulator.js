(function initializeLeverageSimulator() {
  "use strict";

  const engine = window.CristalLeverageEngine;
  if (!engine) {
    console.error("O motor de alavancagem patrimonial não foi carregado.");
    return;
  }

  const WHATSAPP_NUMBER = "556133283000";
  const STRATEGY_QUERY_KEY = "estrategia";
  const MODE_QUERY_KEY = "modo";
  const URL_KEYS = Object.freeze({
    capitalAvailable: "capital",
    monthlyCapacity: "capacidade",
    totalBidPercentage: "lancetotal",
    embeddedBidPercentage: "embutido",
    scenarioMonth: "mes",
    strategyYears: "horizonte",
    termMonths: "prazo",
    administrationPercentage: "taxaadm",
    reserveFundPercentage: "fundo",
    annualCorrectionPercentage: "correcao",
    annualAppreciationPercentage: "valorizacao",
    annualRentalYieldPercentage: "aluguel",
    installmentType: "parcela",
    reducedInstallmentPercentage: "reducao",
    otherOwnOutlays: "outros"
  });
  const TERM_OPTIONS = Object.freeze([120, 150, 180, 200, 240]);
  const HORIZON_OPTIONS = Object.freeze([5, 10, 15, 20]);
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const dom = {
    strategyButtons: $$('[data-strategy]'),
    strategyPanels: $$('[data-strategy-panel]'),
    resultsGuideLink: $("#strategy-results-guide"),
    form: $("#leverage-form"),
    modeButtons: $$('[data-leverage-mode]'),
    advancedFields: $("#leverage-advanced-fields"),
    capital: $("#leverage-capital"),
    monthlyCapacity: $("#leverage-monthly-capacity"),
    totalBid: $("#leverage-total-bid"),
    totalBidOutput: $("#leverage-total-bid-output"),
    embeddedBid: $("#leverage-embedded-bid"),
    embeddedBidOutput: $("#leverage-embedded-output"),
    month: $("#leverage-month"),
    monthNumber: $("#leverage-month-number"),
    strategyYears: $("#leverage-strategy-years"),
    term: $("#leverage-term"),
    administration: $("#leverage-admin"),
    reserveFund: $("#leverage-fund"),
    correction: $("#leverage-correction"),
    appreciation: $("#leverage-appreciation"),
    rental: $("#leverage-rental"),
    installmentType: $("#leverage-installment-type"),
    reducedPercentage: $("#leverage-reduced"),
    reducedField: $("#leverage-reduced-field"),
    otherOutlays: $("#leverage-other-outlays"),
    formFeedback: $("#leverage-form-feedback"),
    alerts: $("#leverage-alerts"),
    generatedAt: $("#leverage-generated-at"),
    summaryText: $("#leverage-summary-text"),
    scenarioLabel: $("#leverage-scenario-label"),
    limiterMessage: $("#leverage-limiter-message"),
    saveScenario: $("#save-leverage-scenario"),
    comparison: $("#leverage-comparison"),
    scenarioRail: $("#leverage-scenario-rail"),
    actionFeedback: $("#leverage-action-feedback"),
    shareButtons: [$("#share-leverage-simulation"), $("#share-leverage-bottom")].filter(Boolean),
    copySummary: $("#copy-leverage-summary"),
    printSimulation: $("#print-leverage-simulation"),
    resetSimulation: $("#reset-leverage-simulation"),
    whatsapp: $("#leverage-whatsapp"),
    timelineMonth: $("#leverage-timeline-month"),
    stressToggle: $("#toggle-leverage-stress"),
    stressContent: $("#leverage-stress-content"),
    stressAppreciation: $("#stress-appreciation"),
    stressRent: $("#stress-rent"),
    stressMonth: $("#stress-month"),
    stressCorrection: $("#stress-correction"),
    sensitivity: $("#leverage-sensitivity-list"),
    dialog: $("#calculation-dialog"),
    calculationTitle: $("#calculation-title"),
    calculationIntro: $("#calculation-intro"),
    calculationBreakdown: $("#calculation-breakdown"),
    calculationNote: $("#calculation-note"),
    chart: $("#leverage-chart-svg"),
    chartDescription: $("#leverage-chart-svg-desc"),
    chartGrid: $("#leverage-chart-grid"),
    chartEquity: $("#leverage-chart-equity"),
    chartCash: $("#leverage-chart-cash"),
    chartBalance: $("#leverage-chart-balance"),
    chartMarker: $("#leverage-chart-marker"),
    chartMarkerLabel: $("#leverage-chart-marker-label"),
    chartPoint: $("#leverage-chart-equity-point"),
    chartTooltip: $("#leverage-chart-tooltip"),
    evolutionBody: $("#leverage-evolution-body")
  };

  const outputIds = Object.freeze({
    summaryCredit: "leverage-summary-credit",
    summaryCapital: "leverage-summary-capital",
    summaryMonthly: "leverage-summary-monthly",
    summaryNetCredit: "leverage-summary-net-credit",
    summaryEquity: "leverage-summary-equity",
    bidTotal: "leverage-bid-total",
    bidOwn: "leverage-bid-own",
    bidEmbedded: "leverage-bid-embedded",
    creditContracted: "leverage-credit-contracted",
    creditNet: "leverage-credit-net",
    resultCredit: "leverage-result-credit",
    resultCapital: "leverage-result-capital",
    resultCapacity: "leverage-result-capacity",
    resultLimiter: "leverage-result-limiter",
    resultEquity: "leverage-result-equity",
    resultAsset: "leverage-result-asset",
    resultHorizonBalance: "leverage-result-horizon-balance",
    resultHorizon: "leverage-result-horizon",
    resultCoverage: "leverage-result-coverage",
    resultPostInstallment: "leverage-result-post-installment",
    resultRent: "leverage-result-rent",
    resultComplement: "leverage-result-complement",
    resultSurplus: "leverage-result-surplus",
    resultEffort: "leverage-result-effort",
    resultEffortCapacity: "leverage-result-effort-capacity",
    resultNetNeed: "leverage-result-net-need",
    resultInitialInstallment: "leverage-result-initial-installment",
    resultNetCredit: "leverage-result-net-credit",
    resultAdjustedCredit: "leverage-result-adjusted-credit",
    resultEmbeddedBid: "leverage-result-embedded-bid",
    resultCorrections: "leverage-result-corrections",
    resultBalanceAfter: "leverage-result-balance-after",
    resultBalanceBefore: "leverage-result-balance-before",
    resultAppliedBid: "leverage-result-applied-bid",
    resultCurrentInstallment: "leverage-result-current-installment",
    resultRemaining: "leverage-result-remaining",
    resultPaidTotal: "leverage-result-paid-total",
    resultPaidInstallments: "leverage-result-paid-installments",
    resultOwnBid: "leverage-result-own-bid",
    resultOtherOutlays: "leverage-result-other-outlays",
    resultCashValue: "leverage-result-cash-value",
    resultCashStart: "leverage-result-cash-start",
    resultAppreciation: "leverage-result-appreciation",
    resultEquityDifference: "leverage-result-equity-difference",
    stressCurrentMonthly: "stress-current-monthly",
    stressVariedMonthly: "stress-varied-monthly",
    stressCurrentEquity: "stress-current-equity",
    stressVariedEquity: "stress-varied-equity",
    stressCurrentCoverage: "stress-current-coverage",
    stressVariedCoverage: "stress-varied-coverage"
  });
  const outputs = Object.fromEntries(Object.entries(outputIds).map(([key, id]) => [key, document.getElementById(id)]));

  let activeStrategy = readInitialStrategy();
  let currentMode = readInitialMode();
  let currentInput = { ...engine.DEFAULT_INPUT, ...readInputFromUrl() };
  let currentResult = null;
  let savedScenarios = [];
  let calculationFrame = 0;
  let urlTimer = 0;
  let actionTimer = 0;
  let simulatorStarted = false;
  let comparisonTracked = false;
  let chartGeometry = null;

  function readInitialStrategy() {
    const value = new URLSearchParams(window.location.search).get(STRATEGY_QUERY_KEY);
    return value === "alavancagem" || value === "leverage" ? "leverage" : "resale";
  }

  function readInitialMode() {
    if (readInitialStrategy() !== "leverage") return "simple";
    return new URLSearchParams(window.location.search).get(MODE_QUERY_KEY) === "avancado"
      ? "advanced"
      : "simple";
  }

  function readInputFromUrl() {
    if (readInitialStrategy() !== "leverage") return {};
    const params = new URLSearchParams(window.location.search);
    const parsed = {};
    Object.entries(URL_KEYS).forEach(([key, queryKey]) => {
      if (["installmentType", "termMonths", "strategyYears"].includes(key)) return;
      const raw = params.get(queryKey);
      if (raw === null || raw.trim() === "") return;
      const value = engine.parseNumeric(raw);
      if (Number.isFinite(value)) parsed[key] = value;
    });
    const term = engine.parseNumeric(params.get(URL_KEYS.termMonths) || "");
    if (TERM_OPTIONS.includes(term)) parsed.termMonths = term;
    const horizon = engine.parseNumeric(params.get(URL_KEYS.strategyYears) || "");
    if (HORIZON_OPTIONS.includes(horizon)) parsed.strategyYears = horizon;
    const installment = params.get(URL_KEYS.installmentType);
    if (installment === "integral" || installment === "full") parsed.installmentType = "full";
    if (installment === "reduzida" || installment === "reduced") parsed.installmentType = "reduced";
    return parsed;
  }

  function buildScenarioUrl(input = currentResult?.input || currentInput) {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set(STRATEGY_QUERY_KEY, "alavancagem");
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

  function replaceUrl(urlValue) {
    const url = new URL(urlValue);
    window.history.replaceState({ simulator: true, strategy: activeStrategy }, "", `${url.pathname}${url.search}`);
  }

  function scheduleUrlUpdate() {
    if (activeStrategy !== "leverage") return;
    window.clearTimeout(urlTimer);
    urlTimer = window.setTimeout(() => replaceUrl(buildScenarioUrl()), 180);
  }

  function formatCurrency(value) {
    return Number.isFinite(value) ? engine.formatters.currency(value) : "—";
  }

  function formatPercentage(value, maximumFractionDigits = 2) {
    return Number.isFinite(value)
      ? engine.formatters.percentage(value, { maximumFractionDigits })
      : "—";
  }

  function formatSignedCurrency(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.005) return "sem diferença";
    return `${value > 0 ? "+" : "−"} ${formatCurrency(Math.abs(value))}`;
  }

  function formatSignedPercentage(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.005) return "sem diferença";
    const amount = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Math.abs(value));
    return `${value > 0 ? "+" : "−"} ${amount} p.p.`;
  }

  function compactMoney(value) {
    const absoluteValue = Math.abs(value);
    const sign = value < 0 ? "−" : "";
    if (absoluteValue >= 1000000) {
      const millions = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(absoluteValue / 1000000);
      return `${sign}${millions} mi`;
    }
    if (absoluteValue >= 1000) {
      const thousands = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(absoluteValue / 1000);
      return `${sign}${thousands} mil`;
    }
    return `${sign}${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(absoluteValue)}`;
  }

  function setText(element, value) {
    if (!element || element.textContent === String(value)) return;
    element.textContent = String(value);
  }

  function setResultCurrency(element, value) {
    const formatted = formatCurrency(value);
    setText(element, formatted);
    if (!element) return;
    const length = formatted.replace(/\s/g, "").length;
    element.classList.toggle("is-compact", length > 14);
    element.classList.toggle("is-extra-compact", length > 18);
  }

  function valueOrFallback(input, fallback) {
    const parsed = engine.parseNumeric(input.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readFormInput() {
    const fallback = currentResult?.input || currentInput || engine.DEFAULT_INPUT;
    return {
      capitalAvailable: valueOrFallback(dom.capital, fallback.capitalAvailable),
      monthlyCapacity: valueOrFallback(dom.monthlyCapacity, fallback.monthlyCapacity),
      totalBidPercentage: valueOrFallback(dom.totalBid, fallback.totalBidPercentage),
      embeddedBidPercentage: valueOrFallback(dom.embeddedBid, fallback.embeddedBidPercentage),
      scenarioMonth: valueOrFallback(dom.monthNumber, fallback.scenarioMonth),
      strategyYears: valueOrFallback(dom.strategyYears, fallback.strategyYears),
      termMonths: valueOrFallback(dom.term, fallback.termMonths),
      administrationPercentage: valueOrFallback(dom.administration, fallback.administrationPercentage),
      reserveFundPercentage: valueOrFallback(dom.reserveFund, fallback.reserveFundPercentage),
      annualCorrectionPercentage: valueOrFallback(dom.correction, fallback.annualCorrectionPercentage),
      annualAppreciationPercentage: valueOrFallback(dom.appreciation, fallback.annualAppreciationPercentage),
      annualRentalYieldPercentage: valueOrFallback(dom.rental, fallback.annualRentalYieldPercentage),
      installmentType: dom.installmentType.value === "full" ? "full" : "reduced",
      reducedInstallmentPercentage: valueOrFallback(dom.reducedPercentage, fallback.reducedInstallmentPercentage),
      otherOwnOutlays: valueOrFallback(dom.otherOutlays, fallback.otherOwnOutlays)
    };
  }

  function setMoneyInput(input, value, force = false) {
    if (!input || (!force && document.activeElement === input)) return;
    input.value = formatCurrency(value);
  }

  function setControlValue(control, value, force = false) {
    if (!control || (!force && document.activeElement === control)) return;
    control.value = String(value);
  }

  function findTemporarilyEmptyField() {
    const fields = [
      [dom.capital, "capital disponível"],
      [dom.monthlyCapacity, "capacidade mensal"],
      [dom.monthNumber, "cenário de contemplação"],
      [dom.administration, "taxa de administração"],
      [dom.reserveFund, "fundo de reserva"],
      [dom.correction, "correção anual"],
      [dom.appreciation, "valorização anual"],
      [dom.rental, "rendimento de aluguel"],
      [dom.otherOutlays, "outros desembolsos"]
    ];
    if (dom.installmentType.value === "reduced") {
      fields.push([dom.reducedPercentage, "percentual da parcela reduzida"]);
    }
    return fields.find(([field]) => field && field.value.trim() === "");
  }

  function updatePressedPresets(input) {
    const update = (button, active) => {
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    };
    $$('[data-leverage-capital]').forEach((button) => update(
      button,
      Number(button.dataset.leverageCapital) === input.capitalAvailable
    ));
    $$('[data-leverage-month]').forEach((button) => update(
      button,
      Number(button.dataset.leverageMonth) === input.scenarioMonth
    ));
  }

  function syncForm(input, force = false) {
    setMoneyInput(dom.capital, input.capitalAvailable, force);
    setMoneyInput(dom.monthlyCapacity, input.monthlyCapacity, force);
    setMoneyInput(dom.otherOutlays, input.otherOwnOutlays, force);
    setControlValue(dom.totalBid, input.totalBidPercentage, force);
    setText(dom.totalBidOutput, formatPercentage(input.totalBidPercentage, 1));
    dom.totalBidOutput.value = formatPercentage(input.totalBidPercentage, 1);
    dom.embeddedBid.max = String(Math.min(input.totalBidPercentage, engine.DEFAULT_CONFIG.embeddedBid.maxPercentage));
    setControlValue(dom.embeddedBid, input.embeddedBidPercentage, force);
    setText(dom.embeddedBidOutput, formatPercentage(input.embeddedBidPercentage, 1));
    dom.embeddedBidOutput.value = formatPercentage(input.embeddedBidPercentage, 1);
    dom.month.max = String(input.termMonths);
    dom.monthNumber.max = String(input.termMonths);
    setControlValue(dom.month, input.scenarioMonth, force);
    setControlValue(dom.monthNumber, input.scenarioMonth, force);
    setControlValue(dom.strategyYears, input.strategyYears, force);
    setControlValue(dom.term, input.termMonths, force);
    setControlValue(dom.administration, input.administrationPercentage, force);
    setControlValue(dom.reserveFund, input.reserveFundPercentage, force);
    setControlValue(dom.correction, input.annualCorrectionPercentage, force);
    setControlValue(dom.appreciation, input.annualAppreciationPercentage, force);
    setControlValue(dom.rental, input.annualRentalYieldPercentage, force);
    setControlValue(dom.installmentType, input.installmentType, force);
    setControlValue(dom.reducedPercentage, input.reducedInstallmentPercentage, force);
    dom.reducedField.hidden = input.installmentType === "full";
    const totalBidMin = Number(dom.totalBid.min || 0);
    const totalBidMax = Number(dom.totalBid.max || 60);
    const totalBidProgress = (input.totalBidPercentage - totalBidMin) / Math.max(1, totalBidMax - totalBidMin) * 100;
    dom.totalBid.style.setProperty("--range-progress", `${totalBidProgress}%`);
    const embeddedMax = Math.max(1, Number(dom.embeddedBid.max));
    dom.embeddedBid.style.setProperty("--range-progress", `${input.embeddedBidPercentage / embeddedMax * 100}%`);
    dom.month.style.setProperty("--range-progress", `${(input.scenarioMonth - 1) / Math.max(1, input.termMonths - 1) * 100}%`);
    updatePressedPresets(input);
  }

  function limitingFactorLabel(factor) {
    const labels = {
      [engine.LIMITING_FACTORS.AVAILABLE_CAPITAL]: "Capital disponível",
      [engine.LIMITING_FACTORS.MONTHLY_CAPACITY]: "Capacidade mensal",
      [engine.LIMITING_FACTORS.BOTH]: "Capital e capacidade",
      [engine.LIMITING_FACTORS.CONFIGURED_MAXIMUM]: "Limite configurado"
    };
    return labels[factor] || "Parâmetros informados";
  }

  function renderAlerts(result) {
    dom.alerts.replaceChildren();
    result.warnings.forEach((message) => {
      const alert = document.createElement("p");
      alert.className = "leverage-alert";
      alert.textContent = message;
      dom.alerts.append(alert);
    });
    dom.alerts.hidden = result.warnings.length === 0;
  }

  function renderResults(result) {
    setResultCurrency(outputs.summaryCredit, result.estimatedCredit);
    setResultCurrency(outputs.summaryCapital, result.capacity.capitalRequiredForBid);
    setResultCurrency(outputs.summaryMonthly, result.capacity.monthlyRequirement);
    setResultCurrency(outputs.summaryNetCredit, result.credit.netAtContemplation);
    setResultCurrency(outputs.summaryEquity, result.patrimony.netWorth);
    setText(dom.limiterMessage, result.capacity.limitingMessage);

    setResultCurrency(outputs.bidTotal, result.bid.total);
    setResultCurrency(outputs.bidOwn, result.bid.own);
    setResultCurrency(outputs.bidEmbedded, result.bid.embedded);
    setResultCurrency(outputs.creditContracted, result.credit.contracted);
    setResultCurrency(outputs.creditNet, result.credit.netAtContemplation);

    setResultCurrency(outputs.resultCredit, result.estimatedCredit);
    setResultCurrency(outputs.resultCapital, result.input.capitalAvailable);
    setResultCurrency(outputs.resultCapacity, result.input.monthlyCapacity);
    setText(outputs.resultLimiter, limitingFactorLabel(result.capacity.limitingFactor));
    setResultCurrency(outputs.resultEquity, result.patrimony.netWorth);
    setResultCurrency(outputs.resultAsset, result.patrimony.assetValue);
    setResultCurrency(outputs.resultHorizonBalance, result.patrimony.outstandingDebt);
    setText(outputs.resultHorizon, `${result.patrimony.strategyYears} anos`);
    setText(outputs.resultCoverage, formatPercentage(result.rental.coveragePercentage));
    setResultCurrency(outputs.resultPostInstallment, result.installments.afterContemplation);
    setResultCurrency(outputs.resultRent, result.rental.monthlyAtContemplation);
    setResultCurrency(outputs.resultComplement, result.rental.monthlyComplement);
    setResultCurrency(outputs.resultSurplus, result.rental.monthlySurplus);
    setText(outputs.resultEffort, result.effort.usagePercentage === null ? "—" : formatPercentage(result.effort.usagePercentage));
    setResultCurrency(outputs.resultEffortCapacity, result.effort.monthlyCapacity);
    setResultCurrency(outputs.resultNetNeed, result.effort.netMonthlyNeed);
    setResultCurrency(outputs.resultInitialInstallment, result.installments.initial);
    setResultCurrency(outputs.resultNetCredit, result.credit.netAtContemplation);
    setResultCurrency(outputs.resultAdjustedCredit, result.credit.adjustedAtContemplation);
    setResultCurrency(outputs.resultEmbeddedBid, result.bid.embedded);
    setText(outputs.resultCorrections, `${result.credit.correctionPeriods} ${result.credit.correctionPeriods === 1 ? "período" : "períodos"} · ${formatPercentage(result.input.annualCorrectionPercentage)} ao ano`);
    setResultCurrency(outputs.resultBalanceAfter, result.balance.afterBid);
    setResultCurrency(outputs.resultBalanceBefore, result.balance.beforeBid);
    setResultCurrency(outputs.resultAppliedBid, result.balance.bidApplied);
    setResultCurrency(outputs.resultCurrentInstallment, result.installments.atContemplation);
    setText(outputs.resultRemaining, `${result.installments.remainingMonths} meses`);
    setResultCurrency(outputs.resultPaidTotal, result.capital.investedTotal);
    setResultCurrency(outputs.resultPaidInstallments, result.installments.paidTotal);
    setResultCurrency(outputs.resultOwnBid, result.bid.own);
    setResultCurrency(outputs.resultOtherOutlays, result.capital.otherOwnOutlays);
    setResultCurrency(outputs.resultCashValue, result.patrimony.cashPurchaseValue);
    setResultCurrency(outputs.resultCashStart, result.input.capitalAvailable);
    setText(outputs.resultAppreciation, `${formatPercentage(result.input.annualAppreciationPercentage)} ao ano`);
    setText(outputs.resultEquityDifference, formatSignedCurrency(result.patrimony.leveragedMinusCashPurchase));

    const date = new Intl.DateTimeFormat("pt-BR").format(new Date());
    setText(dom.generatedAt, `Simulação gerada em ${date}`);
    setText(dom.scenarioLabel, `Contemplação considerada na ${result.input.scenarioMonth}ª assembleia`);
    setText(dom.timelineMonth, `${result.input.scenarioMonth}ª assembleia`);
    setText(dom.summaryText, `Com ${formatCurrency(result.input.capitalAvailable)} disponíveis e capacidade mensal de ${formatCurrency(result.input.monthlyCapacity)}, este cenário considera um crédito de aproximadamente ${formatCurrency(result.estimatedCredit)}. O lance total seria de ${formatCurrency(result.bid.total)}, sendo ${formatCurrency(result.bid.own)} em dinheiro próprio e ${formatCurrency(result.bid.embedded)} de lance embutido. No horizonte de ${result.input.strategyYears} anos, o patrimônio líquido matematicamente projetado é ${formatCurrency(result.patrimony.netWorth)}. A contemplação, a valorização e a renda de aluguel são premissas da simulação, não garantias.`);

    dom.formFeedback.hidden = true;
    dom.formFeedback.textContent = "";
    renderAlerts(result);
    renderEvolution(result);
    if (!dom.stressContent.hidden) renderStress(result);
    renderSensitivity(result);
    updateWhatsapp(result);
  }

  function renderEvolution(result) {
    const timeline = result.timeline;
    const annual = timeline.annual;
    dom.evolutionBody.replaceChildren();
    annual.forEach((entry) => {
      const row = document.createElement("tr");
      [
        entry.year === 0 ? "Hoje" : `Ano ${entry.year}`,
        formatCurrency(entry.assetValue),
        formatCurrency(entry.outstandingDebt),
        formatCurrency(entry.netWorth),
        formatCurrency(entry.cashPurchaseValue),
        formatCurrency(entry.annualRentEstimate)
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      dom.evolutionBody.append(row);
    });
    renderChart(result);
  }

  function renderChart(result) {
    const timeline = result.timeline.monthly;
    if (!timeline.length) return;
    const canvasWidth = Math.max(220, dom.chart.clientWidth || 760);
    const canvasHeight = Math.round(Math.min(400, Math.max(280, canvasWidth * 0.42)));
    dom.chart.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
    const plot = { left: 66, right: canvasWidth - 12, top: 36, bottom: canvasHeight - 34 };
    const width = plot.right - plot.left;
    const height = plot.bottom - plot.top;
    const values = timeline.flatMap((point) => [point.netWorth, point.cashPurchaseValue, point.outstandingDebt]);
    const minimum = Math.min(0, ...values);
    const maximum = Math.max(1, ...values);
    const padding = Math.max(1, (maximum - minimum) * 0.08);
    const minValue = minimum < 0 ? minimum - padding : 0;
    const maxValue = maximum + padding;
    const range = Math.max(1, maxValue - minValue);
    const xFor = (month) => plot.left + month / Math.max(1, timeline.length - 1) * width;
    const yFor = (value) => plot.bottom - (value - minValue) / range * height;
    const points = (key) => timeline.map((point) => `${xFor(point.month).toFixed(2)},${yFor(point[key]).toFixed(2)}`).join(" ");
    dom.chartEquity.setAttribute("points", points("netWorth"));
    dom.chartCash.setAttribute("points", points("cashPurchaseValue"));
    dom.chartBalance.setAttribute("points", points("outstandingDebt"));
    dom.chartGrid.innerHTML = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const y = plot.bottom - height * ratio;
      const value = minValue + range * ratio;
      return `<line class="leverage-chart-grid-line" x1="${plot.left}" x2="${plot.right}" y1="${y}" y2="${y}"></line><text class="leverage-chart-axis-label" x="${plot.left - 10}" y="${y + 4}" text-anchor="end">${compactMoney(value)}</text>`;
    }).join("") + `<text class="leverage-chart-axis-label" x="${plot.left}" y="${canvasHeight - 9}">Hoje</text><text class="leverage-chart-axis-label" x="${plot.right}" y="${canvasHeight - 9}" text-anchor="end">${result.input.strategyYears} anos</text>`;
    const lastTimelineMonth = timeline.length - 1;
    const markerWithinHorizon = result.input.scenarioMonth <= lastTimelineMonth;
    const markerMonth = Math.min(result.input.scenarioMonth, lastTimelineMonth);
    const markerX = xFor(markerMonth);
    dom.chartMarker.style.display = markerWithinHorizon ? "" : "none";
    dom.chartMarkerLabel.style.display = markerWithinHorizon ? "" : "none";
    if (markerWithinHorizon) {
      dom.chartMarker.setAttribute("x1", markerX);
      dom.chartMarker.setAttribute("x2", markerX);
      dom.chartMarker.setAttribute("y1", plot.top - 5);
      dom.chartMarker.setAttribute("y2", plot.bottom);
      dom.chartMarkerLabel.setAttribute("y", plot.top - 15);
      dom.chartMarkerLabel.setAttribute("x", Math.min(plot.right - 4, Math.max(plot.left + 4, markerX)));
      dom.chartMarkerLabel.setAttribute("text-anchor", markerX > (plot.left + plot.right) / 2 ? "end" : "start");
    }
    chartGeometry = { timeline, plot, xFor, yFor, canvasWidth };
    showChartPoint(markerMonth, false);
    const markerDescription = markerWithinHorizon
      ? `A linha vertical marca o cenário de contemplação na ${result.input.scenarioMonth}ª assembleia.`
      : `A contemplação considerada na ${result.input.scenarioMonth}ª assembleia está fora deste horizonte e, por isso, não recebe marcador no gráfico.`;
    setText(dom.chartDescription, `No horizonte de ${result.input.strategyYears} anos, o patrimônio líquido projetado é ${formatCurrency(result.patrimony.netWorth)}, o cenário à vista é ${formatCurrency(result.patrimony.cashPurchaseValue)} e o saldo devedor é ${formatCurrency(result.patrimony.outstandingDebt)}. ${markerDescription}`);
  }

  function showChartPoint(month, floating = true) {
    if (!chartGeometry) return;
    const safeMonth = Math.min(Math.max(Math.round(month), 0), chartGeometry.timeline.length - 1);
    const point = chartGeometry.timeline[safeMonth];
    const x = chartGeometry.xFor(safeMonth);
    const y = chartGeometry.yFor(point.netWorth);
    dom.chartPoint.setAttribute("cx", x);
    dom.chartPoint.setAttribute("cy", y);
    dom.chartPoint.dataset.month = String(safeMonth);
    const label = `Mês ${safeMonth}: patrimônio líquido ${formatCurrency(point.netWorth)}, cenário à vista ${formatCurrency(point.cashPurchaseValue)}, saldo devedor ${formatCurrency(point.outstandingDebt)}, aluguel mensal ${formatCurrency(point.monthlyRentEstimate)}.`;
    dom.chartPoint.setAttribute("aria-label", label);
    dom.chartTooltip.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = safeMonth === 0 ? "Hoje" : `${safeMonth}º mês`;
    dom.chartTooltip.append(title);
    [
      `Patrimônio: ${formatCurrency(point.netWorth)}`,
      `À vista: ${formatCurrency(point.cashPurchaseValue)}`,
      `Saldo devedor: ${formatCurrency(point.outstandingDebt)}`,
      `Aluguel mensal: ${formatCurrency(point.monthlyRentEstimate)}`
    ].forEach((text) => {
      const line = document.createElement("span");
      line.textContent = text;
      dom.chartTooltip.append(line);
    });
    dom.chartTooltip.classList.toggle("is-visible", floating);
    dom.chartTooltip.setAttribute("aria-hidden", String(!floating));
  }

  function currentStressVariation() {
    return {
      appreciationDeltaPoints: Number(dom.stressAppreciation.value),
      rentalYieldMultiplier: Math.max(0, 1 + Number(dom.stressRent.value) / 100),
      contemplationDelayMonths: Number(dom.stressMonth.value),
      correctionDeltaPoints: Number(dom.stressCorrection.value)
    };
  }

  function renderStress(result) {
    const stress = engine.calculateStressScenario(result.input, result.config, currentStressVariation());
    setResultCurrency(outputs.stressCurrentMonthly, stress.current.monthlyNetNeed);
    setResultCurrency(outputs.stressVariedMonthly, stress.variation.monthlyNetNeed);
    setResultCurrency(outputs.stressCurrentEquity, stress.current.projectedNetWorth);
    setResultCurrency(outputs.stressVariedEquity, stress.variation.projectedNetWorth);
    setText(outputs.stressCurrentCoverage, formatPercentage(stress.current.rentalCoveragePercentage));
    setText(outputs.stressVariedCoverage, formatPercentage(stress.variation.rentalCoveragePercentage));
  }

  function renderSensitivity(result) {
    dom.sensitivity.replaceChildren();
    result.sensitivity.forEach((item) => {
      const article = document.createElement("article");
      article.className = "leverage-sensitivity-item";
      const heading = document.createElement("h4");
      heading.className = "leverage-sensitivity-factor";
      heading.textContent = item.label;
      const detail = document.createElement("div");
      detail.className = "leverage-sensitivity-impacts";
      [
        [item.projectedNetWorthImpact, "no patrimônio"],
        [item.monthlyNetNeedImpact, "na necessidade mensal"],
        [item.estimatedCreditImpact, "no crédito estimado"]
      ].forEach(([impact, label]) => {
        const metric = document.createElement("p");
        const value = document.createElement("strong");
        value.textContent = formatSignedCurrency(impact);
        const caption = document.createElement("span");
        caption.textContent = label;
        metric.append(value, document.createTextNode(" "), caption);
        detail.append(metric);
      });
      article.append(heading, detail);
      dom.sensitivity.append(article);
    });
  }

  function updateCalculationBreakdown(result) {
    dom.calculationBreakdown.replaceChildren();
    result.breakdown.forEach((item) => {
      const row = document.createElement("div");
      row.className = "strategy-calculation-row";
      const term = document.createElement("dt");
      term.textContent = `${String(item.step).padStart(2, "0")} · ${item.label}`;
      const detail = document.createElement("dd");
      const formula = document.createElement("span");
      formula.textContent = item.formula;
      const value = document.createElement("strong");
      value.textContent = formatCurrency(item.result);
      detail.append(formula, document.createTextNode(" = "), value);
      row.append(term, detail);
      dom.calculationBreakdown.append(row);
    });
    dom.calculationTitle.textContent = "Como a alavancagem foi calculada";
    dom.calculationIntro.textContent = "Confira o dimensionamento do crédito, taxas, parcelas, lance, aluguel, saldo e patrimônio em etapas auditáveis.";
    dom.calculationNote.textContent = result.assumptions.join(" ");
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
    const next = engine.calculateLeverageScenario(raw);
    currentResult = next;
    currentInput = { ...next.input };
    syncForm(next.input, Boolean(options.forceSync));
    renderResults(next);
    if (options.updateUrl) scheduleUrlUpdate();
  }

  function scheduleCalculation(changedKey, options = {}) {
    if (calculationFrame) cancelAnimationFrame(calculationFrame);
    calculationFrame = requestAnimationFrame(() => {
      calculationFrame = 0;
      calculate(changedKey, options);
    });
  }

  function applyPartialInput(partial, changedKey) {
    markStarted();
    calculate(changedKey, {
      input: { ...(currentResult?.input || currentInput), ...partial },
      forceSync: true,
      updateUrl: true
    });
    parameterChanged(changedKey);
  }

  function setMode(mode, scroll = false) {
    currentMode = mode === "advanced" ? "advanced" : "simple";
    dom.modeButtons.forEach((button) => {
      const active = button.dataset.leverageMode === currentMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    dom.advancedFields.hidden = currentMode !== "advanced";
    if (scroll && currentMode === "advanced") {
      dom.advancedFields.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function panelShouldBeHidden(panel, strategy) {
    if (panel.dataset.strategyPanel !== strategy) return true;
    if (panel.id === "leverage-comparison") return savedScenarios.length === 0;
    if (panel.id === "comparacao") return !panel.querySelector(".strategy-scenario-card");
    return false;
  }

  function setStrategy(strategy, options = {}) {
    const next = strategy === "leverage" ? "leverage" : "resale";
    const changed = activeStrategy !== next;
    activeStrategy = next;
    dom.strategyButtons.forEach((button) => {
      const active = button.dataset.strategy === next;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    dom.strategyPanels.forEach((panel) => { panel.hidden = panelShouldBeHidden(panel, next); });
    document.body.dataset.simulatorStrategy = next;
    document.body.dataset.printStrategy = next;
    if (dom.resultsGuideLink) {
      dom.resultsGuideLink.href = next === "leverage" ? "#leverage-how-to-read" : "#como-ler";
    }
    if (dom.dialog?.open) dom.dialog.close();
    if (options.updateUrl !== false) {
      if (next === "leverage") replaceUrl(buildScenarioUrl());
      else window.CristalResaleSimulator?.activate();
    }
    if (next === "leverage" && changed) {
      trackEvent("capital_leverage_selected", { mode: currentMode });
    }
    if (options.focus) {
      const destination = next === "leverage" ? $("#leverage-workspace") : $("#configurar");
      destination?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setupStrategySelector() {
    dom.strategyButtons.forEach((button, index) => {
      button.addEventListener("click", () => setStrategy(button.dataset.strategy, { updateUrl: true, focus: true }));
      button.addEventListener("keydown", (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const target = dom.strategyButtons[(index + direction + dom.strategyButtons.length) % dom.strategyButtons.length];
        target.focus();
        setStrategy(target.dataset.strategy, { updateUrl: true, focus: false });
      });
    });
  }

  function setupInputs() {
    dom.form.addEventListener("submit", (event) => event.preventDefault());
    [dom.capital, dom.monthlyCapacity, dom.otherOutlays].forEach((input) => {
      input.addEventListener("input", () => {
        markStarted();
        scheduleCalculation(input.name, { updateUrl: true });
      });
      input.addEventListener("blur", () => {
        const fallback = currentResult?.input[input.name] ?? engine.DEFAULT_INPUT[input.name];
        setMoneyInput(input, valueOrFallback(input, fallback), true);
        calculate(input.name, { updateUrl: true });
        parameterChanged(input.name);
      });
    });

    const liveInputs = [
      [dom.totalBid, "totalBidPercentage"],
      [dom.embeddedBid, "embeddedBidPercentage"],
      [dom.month, "scenarioMonth"],
      [dom.monthNumber, "scenarioMonth"],
      [dom.strategyYears, "strategyYears"],
      [dom.term, "termMonths"],
      [dom.administration, "administrationPercentage"],
      [dom.reserveFund, "reserveFundPercentage"],
      [dom.correction, "annualCorrectionPercentage"],
      [dom.appreciation, "annualAppreciationPercentage"],
      [dom.rental, "annualRentalYieldPercentage"],
      [dom.installmentType, "installmentType"],
      [dom.reducedPercentage, "reducedInstallmentPercentage"]
    ];
    liveInputs.forEach(([input, key]) => {
      input.addEventListener("input", () => {
        markStarted();
        scheduleCalculation(key, { updateUrl: true });
      });
      input.addEventListener("change", () => parameterChanged(key));
      if (input.type === "number") {
        input.addEventListener("blur", () => {
          if (input.value.trim() !== "") return;
          setControlValue(input, currentResult.input[key], true);
          calculate(key, { updateUrl: true });
        });
      }
    });

    $$('[data-leverage-capital]').forEach((button) => button.addEventListener("click", () => {
      applyPartialInput({ capitalAvailable: Number(button.dataset.leverageCapital) }, "capitalAvailable");
    }));
    $$('[data-leverage-month]').forEach((button) => button.addEventListener("click", () => {
      applyPartialInput({ scenarioMonth: Number(button.dataset.leverageMonth) }, "scenarioMonth");
    }));
    $$('[data-leverage-month-step]').forEach((button) => button.addEventListener("click", () => {
      applyPartialInput({
        scenarioMonth: currentResult.input.scenarioMonth + Number(button.dataset.leverageMonthStep)
      }, "scenarioMonth");
    }));

    [dom.stressAppreciation, dom.stressRent, dom.stressMonth, dom.stressCorrection].forEach((control) => {
      control.addEventListener("change", () => {
        if (currentResult) renderStress(currentResult);
      });
    });
  }

  function setupModeToggle() {
    setMode(currentMode, false);
    dom.modeButtons.forEach((button) => button.addEventListener("click", () => {
      setMode(button.dataset.leverageMode, true);
      scheduleUrlUpdate();
      trackEvent("simulator_parameter_changed", { parameter: "mode", mode: currentMode });
    }));
  }

  function scenarioSnapshot(result, index) {
    return {
      id: `${Date.now()}-${index}`,
      name: `Cenário ${index + 1}`,
      input: { ...result.input },
      values: {
        credit: result.estimatedCredit,
        capital: result.input.capitalAvailable,
        monthlyCapacity: result.input.monthlyCapacity,
        totalBid: result.bid.total,
        ownBid: result.bid.own,
        embeddedBid: result.bid.embedded,
        netCredit: result.credit.netAtContemplation,
        preInstallment: result.installments.atContemplation,
        postInstallment: result.installments.afterContemplation,
        rent: result.rental.monthlyAtContemplation,
        coverage: result.rental.coveragePercentage,
        balance: result.patrimony.outstandingDebt,
        equity: result.patrimony.netWorth
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
    showActionFeedback(`${savedScenarios.at(-1).name} salvo.`);
    trackEvent("simulator_scenario_saved", {
      scenario_count: savedScenarios.length,
      scenario_month: currentResult.input.scenarioMonth
    });
    if (savedScenarios.length >= 2 && !comparisonTracked) {
      comparisonTracked = true;
      trackEvent("simulator_comparison_viewed", { scenario_count: savedScenarios.length });
    }
  }

  function renderScenarios() {
    dom.scenarioRail.innerHTML = savedScenarios.map((scenario, index) => {
      const base = savedScenarios[0];
      const difference = index === 0
        ? '<p class="strategy-scenario-base">Base da comparação</p>'
        : `<p class="strategy-scenario-difference">Diferenças para o cenário A: ${formatSignedCurrency(scenario.values.credit - base.values.credit)} no crédito · ${formatSignedCurrency(scenario.values.capital - base.values.capital)} no capital inicial · ${formatSignedCurrency(scenario.values.postInstallment - base.values.postInstallment)} na parcela pós · ${formatSignedCurrency(scenario.values.rent - base.values.rent)} no aluguel · ${formatSignedCurrency(scenario.values.equity - base.values.equity)} no patrimônio · ${formatSignedPercentage(scenario.values.coverage - base.values.coverage)} na cobertura</p>`;
      return `<article class="strategy-scenario-card" data-leverage-scenario-id="${scenario.id}"><header class="strategy-scenario-card-head"><div><span>${scenario.name}</span><strong>${scenario.input.scenarioMonth}ª assembleia · ${scenario.input.strategyYears} anos</strong></div><button class="strategy-scenario-remove" type="button" data-remove-leverage-scenario="${scenario.id}" aria-label="Remover ${scenario.name}">×</button></header><dl class="strategy-scenario-metrics"><div><dt>Crédito controlado</dt><dd>${formatCurrency(scenario.values.credit)}</dd></div><div><dt>Capital inicial</dt><dd>${formatCurrency(scenario.values.capital)}</dd></div><div><dt>Capacidade mensal</dt><dd>${formatCurrency(scenario.values.monthlyCapacity)}</dd></div><div><dt>Lance total</dt><dd>${formatCurrency(scenario.values.totalBid)}</dd></div><div><dt>Lance próprio</dt><dd>${formatCurrency(scenario.values.ownBid)}</dd></div><div><dt>Lance embutido</dt><dd>${formatCurrency(scenario.values.embeddedBid)}</dd></div><div><dt>Crédito líquido</dt><dd>${formatCurrency(scenario.values.netCredit)}</dd></div><div><dt>Parcela pré</dt><dd>${formatCurrency(scenario.values.preInstallment)}</dd></div><div><dt>Parcela pós</dt><dd>${formatCurrency(scenario.values.postInstallment)}</dd></div><div><dt>Aluguel</dt><dd>${formatCurrency(scenario.values.rent)}</dd></div><div><dt>Cobertura</dt><dd>${formatPercentage(scenario.values.coverage)}</dd></div><div><dt>Saldo devedor</dt><dd>${formatCurrency(scenario.values.balance)}</dd></div><div><dt>Patrimônio projetado</dt><dd>${formatCurrency(scenario.values.equity)}</dd></div></dl>${difference}<button class="strategy-scenario-apply strategy-button strategy-button-outline" type="button" data-apply-leverage-scenario="${scenario.id}">Aplicar este cenário</button></article>`;
    }).join("");
    dom.saveScenario.disabled = savedScenarios.length >= 3;
    dom.comparison.hidden = activeStrategy !== "leverage" || savedScenarios.length === 0;
  }

  function applySavedScenario(id) {
    const scenario = savedScenarios.find((item) => item.id === id);
    if (!scenario) return;
    calculate("scenarioMonth", { input: scenario.input, forceSync: true, updateUrl: true });
    $("#leverage-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showActionFeedback(`${scenario.name} aplicado.`);
  }

  function removeSavedScenario(id) {
    savedScenarios = savedScenarios
      .filter((scenario) => scenario.id !== id)
      .map((scenario, index) => ({ ...scenario, name: `Cenário ${index + 1}` }));
    if (savedScenarios.length < 2) comparisonTracked = false;
    renderScenarios();
    showActionFeedback("Cenário removido.");
  }

  function buildSummary(result) {
    return [
      "Estratégia: alavancagem patrimonial",
      `Simulação gerada em: ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`,
      `Modo: ${currentMode === "advanced" ? "avançado" : "simples"}`,
      "",
      `Capital disponível: ${formatCurrency(result.input.capitalAvailable)}`,
      `Capacidade mensal: ${formatCurrency(result.input.monthlyCapacity)}`,
      `Crédito estimado: ${formatCurrency(result.estimatedCredit)}`,
      `Lance total: ${formatPercentage(result.bid.totalPercentage)} (${formatCurrency(result.bid.total)})`,
      `Lance próprio: ${formatCurrency(result.bid.own)}`,
      `Lance embutido: ${formatPercentage(result.bid.embeddedPercentage)} (${formatCurrency(result.bid.embedded)})`,
      `Crédito líquido: ${formatCurrency(result.credit.netAtContemplation)}`,
      `Cenário de contemplação: ${result.input.scenarioMonth}ª assembleia`,
      `Parcela inicial: ${formatCurrency(result.installments.initial)}`,
      `Parcela atual pré-contemplação: ${formatCurrency(result.installments.atContemplation)}`,
      `Parcela pós-contemplação estimada: ${formatCurrency(result.installments.afterContemplation)}`,
      `Aluguel mensal estimado: ${formatCurrency(result.rental.monthlyAtContemplation)}`,
      `Cobertura estimada: ${formatPercentage(result.rental.coveragePercentage)}`,
      `Necessidade líquida mensal: ${formatCurrency(result.effort.netMonthlyNeed)}`,
      `Saldo devedor no horizonte: ${formatCurrency(result.patrimony.outstandingDebt)}`,
      `Patrimônio líquido projetado: ${formatCurrency(result.patrimony.netWorth)}`,
      `Horizonte: ${result.input.strategyYears} anos`,
      "",
      "Simulação informativa, baseada nas premissas selecionadas; não constitui garantia de contemplação, valorização ou renda."
    ].join("\n");
  }

  function buildWhatsappMessage(result) {
    return [
      "Olá! Fiz uma simulação de alavancagem no site.",
      "",
      `Capital disponível: ${formatCurrency(result.input.capitalAvailable)}`,
      `Capacidade mensal: ${formatCurrency(result.input.monthlyCapacity)}`,
      `Crédito estimado: ${formatCurrency(result.estimatedCredit)}`,
      `Lance total: ${formatPercentage(result.bid.totalPercentage)}`,
      `Lance próprio: ${formatCurrency(result.bid.own)}`,
      `Lance embutido: ${formatCurrency(result.bid.embedded)}`,
      `Crédito líquido: ${formatCurrency(result.credit.netAtContemplation)}`,
      `Cenário de contemplação: ${result.input.scenarioMonth} meses`,
      `Parcela estimada pós-contemplação: ${formatCurrency(result.installments.afterContemplation)}`,
      `Aluguel estimado: ${formatCurrency(result.rental.monthlyAtContemplation)}`,
      `Patrimônio projetado: ${formatCurrency(result.patrimony.netWorth)}`,
      "",
      "Gostaria de analisar esse cenário."
    ].join("\n");
  }

  function updateWhatsapp(result) {
    dom.whatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsappMessage(result))}`;
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

  async function shareSimulation() {
    if (!currentResult) return;
    const url = buildScenarioUrl(currentResult.input);
    const shareData = {
      title: "Meu cenário de alavancagem no simulador da Cristal",
      text: `Alavancagem patrimonial · modo ${currentMode === "advanced" ? "avançado" : "simples"} · crédito estimado de ${formatCurrency(currentResult.estimatedCredit)} · contemplação considerada na ${currentResult.input.scenarioMonth}ª assembleia.`,
      url
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showActionFeedback("Simulação compartilhada.");
      } else {
        await copyText(url);
        showActionFeedback("Link copiado.");
      }
      trackEvent("simulator_shared", { method: navigator.share ? "native" : "copy_link" });
    } catch (error) {
      if (error?.name !== "AbortError") {
        showActionFeedback("Não foi possível compartilhar. Copie o endereço do navegador.");
      }
    }
  }

  async function copySummary() {
    if (!currentResult) return;
    try {
      await copyText(buildSummary(currentResult));
      showActionFeedback("Resumo copiado.");
      trackEvent("simulation_summary_copied");
    } catch (_) {
      showActionFeedback("Não foi possível copiar o resumo.");
    }
  }

  function printSimulation() {
    document.body.dataset.printStrategy = "leverage";
    trackEvent("simulation_printed");
    window.print();
  }

  function resetSimulation() {
    currentMode = "simple";
    setMode(currentMode, false);
    calculate("", { input: engine.DEFAULT_INPUT, forceSync: true, updateUrl: true });
    showActionFeedback("Valores padrão restaurados.");
  }

  function openCalculation() {
    if (!currentResult) return;
    updateCalculationBreakdown(currentResult);
    trackEvent("calculation_breakdown_opened");
    if (typeof dom.dialog.showModal === "function") dom.dialog.showModal();
    else dom.dialog.setAttribute("open", "");
  }

  function setupActions() {
    dom.saveScenario.addEventListener("click", saveCurrentScenario);
    dom.scenarioRail.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-leverage-scenario]");
      const apply = event.target.closest("[data-apply-leverage-scenario]");
      if (remove) removeSavedScenario(remove.dataset.removeLeverageScenario);
      if (apply) applySavedScenario(apply.dataset.applyLeverageScenario);
    });
    dom.shareButtons.forEach((button) => button.addEventListener("click", shareSimulation));
    dom.copySummary.addEventListener("click", copySummary);
    dom.printSimulation.addEventListener("click", printSimulation);
    dom.resetSimulation.addEventListener("click", resetSimulation);
    $$('[data-open-leverage-calculation]').forEach((button) => button.addEventListener("click", openCalculation));
    dom.stressToggle.addEventListener("click", () => {
      const willOpen = dom.stressContent.hidden;
      dom.stressContent.hidden = !willOpen;
      dom.stressToggle.textContent = willOpen ? "Ocultar variações" : "Testar variações";
      dom.stressToggle.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) {
        renderStress(currentResult);
        trackEvent("stress_test_opened");
      }
    });
    dom.whatsapp.addEventListener("click", () => trackEvent("simulator_whatsapp_clicked", {
      scenario_month: currentResult.input.scenarioMonth,
      credit_band: creditBand(currentResult.estimatedCredit)
    }));
  }

  function setupChartInteraction() {
    const pointFromEvent = (event) => {
      if (!chartGeometry) return;
      const rectangle = dom.chart.getBoundingClientRect();
      const localX = (event.clientX - rectangle.left) / Math.max(1, rectangle.width) * chartGeometry.canvasWidth;
      const ratio = (localX - chartGeometry.plot.left) / (chartGeometry.plot.right - chartGeometry.plot.left);
      showChartPoint(ratio * (chartGeometry.timeline.length - 1), true);
    };
    dom.chart.addEventListener("pointermove", pointFromEvent);
    dom.chart.addEventListener("click", pointFromEvent);
    dom.chart.addEventListener("pointerleave", () => {
      dom.chartTooltip.classList.remove("is-visible");
      dom.chartTooltip.setAttribute("aria-hidden", "true");
      showChartPoint(Math.min(currentResult.input.scenarioMonth, chartGeometry.timeline.length - 1), false);
    });
    dom.chartPoint.addEventListener("focus", () => showChartPoint(
      Math.min(currentResult.input.scenarioMonth, chartGeometry.timeline.length - 1),
      true
    ));
    dom.chartPoint.addEventListener("blur", () => {
      dom.chartTooltip.classList.remove("is-visible");
      dom.chartTooltip.setAttribute("aria-hidden", "true");
    });
    dom.chartPoint.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !chartGeometry) return;
      event.preventDefault();
      const current = Number(dom.chartPoint.dataset.month || currentResult.input.scenarioMonth);
      const next = current + (event.key === "ArrowRight" ? 12 : -12);
      dom.chartPoint.dataset.month = String(Math.min(Math.max(next, 0), chartGeometry.timeline.length - 1));
      showChartPoint(Number(dom.chartPoint.dataset.month), true);
    });
    let chartWidth = 0;
    let resizeFrame = 0;
    const redrawChart = (nextWidth) => {
      if (!nextWidth || nextWidth === chartWidth) return;
      chartWidth = nextWidth;
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        if (currentResult) renderChart(currentResult);
      });
    };
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(([entry]) => redrawChart(Math.round(entry.contentRect.width)));
      observer.observe(dom.chart);
    } else {
      window.addEventListener("resize", () => redrawChart(Math.round(dom.chart.clientWidth)), { passive: true });
    }
  }

  function markStarted() {
    if (simulatorStarted) return;
    simulatorStarted = true;
    trackEvent("simulator_started");
  }

  function parameterChanged(parameter) {
    markStarted();
    trackEvent("simulator_parameter_changed", {
      parameter,
      scenario_month: currentResult?.input.scenarioMonth,
      embedded_bid_percentage: currentResult?.input.embeddedBidPercentage
    });
  }

  function trackEvent(name, parameters = {}) {
    const safeParameters = { strategy: "capital_leverage", ...parameters, page_area: "strategy_simulator" };
    if (typeof window.gtag === "function") {
      window.gtag("event", name, safeParameters);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name, ...safeParameters });
    }
    window.dispatchEvent(new CustomEvent("cristal:analytics", {
      detail: { event: name, parameters: safeParameters }
    }));
  }

  function creditBand(value) {
    if (value < 200000) return "under_200k";
    if (value < 500000) return "200k_to_500k";
    if (value < 1000000) return "500k_to_1m";
    return "over_1m";
  }

  function showActionFeedback(message) {
    window.clearTimeout(actionTimer);
    dom.actionFeedback.textContent = message;
    actionTimer = window.setTimeout(() => { dom.actionFeedback.textContent = ""; }, 3200);
  }

  function init() {
    if (!dom.form) return;
    setupStrategySelector();
    setupModeToggle();
    setupInputs();
    setupActions();
    setupChartInteraction();
    calculate("", { input: currentInput, forceSync: true, updateUrl: false });
    setStrategy(activeStrategy, { updateUrl: false, focus: false });
    if (activeStrategy === "leverage") {
      replaceUrl(buildScenarioUrl(currentResult.input));
      trackEvent("simulator_view");
      trackEvent("capital_leverage_selected", { mode: currentMode, source: "shared_url" });
    }
    window.CristalLeverageSimulator = Object.freeze({
      getCurrentResult: () => currentResult,
      getCurrentMode: () => currentMode,
      getActiveStrategy: () => activeStrategy,
      buildScenarioUrl,
      activate() {
        setStrategy("leverage", { updateUrl: true, focus: false });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
