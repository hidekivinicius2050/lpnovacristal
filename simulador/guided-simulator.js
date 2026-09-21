(function initializeGuidedSimulator() {
  "use strict";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const resaleEngine = window.CristalSimulationEngine;
  const leverageEngine = window.CristalLeverageEngine;

  const state = {
    resaleStep: 0,
    leverageStep: 0,
    resaleCompleted: false,
    leverageCompleted: false
  };

  const resale = {
    panel: $("#resale-guided"),
    steps: $$('[data-guided-resale-step]'),
    progress: $("#resale-guided .strategy-guided-progress"),
    progressBar: $("#resale-guided-progress-bar"),
    progressLabel: $("#resale-guided-progress-label"),
    feedback: $("#resale-guided-feedback"),
    back: $('[data-guided-resale-back]'),
    next: $('[data-guided-resale-next]'),
    credit: $("#guided-resale-credit"),
    ownBid: $("#guided-resale-own-bid"),
    month: $("#guided-resale-month"),
    premium: $("#guided-resale-premium"),
    profit: $("#guided-resale-live-profit"),
    capital: $("#guided-resale-live-capital"),
    installment: $("#guided-resale-live-installment"),
    roi: $("#guided-resale-live-roi"),
    embedded: $("#guided-resale-live-embedded")
  };

  const leverage = {
    panel: $("#leverage-guided"),
    steps: $$('[data-guided-leverage-step]'),
    progress: $("#leverage-guided .strategy-guided-progress"),
    progressBar: $("#leverage-guided-progress-bar"),
    progressLabel: $("#leverage-guided-progress-label"),
    feedback: $("#leverage-guided-feedback"),
    back: $('[data-guided-leverage-back]'),
    next: $('[data-guided-leverage-next]'),
    targetLabel: $("#guided-leverage-target-label"),
    target: $("#guided-leverage-target"),
    capital: $("#guided-leverage-capital"),
    monthly: $("#guided-leverage-monthly"),
    month: $("#guided-leverage-month"),
    credit: $("#guided-leverage-live-credit"),
    targetMessage: $("#guided-leverage-live-target-message"),
    net: $("#guided-leverage-live-net"),
    requiredCapital: $("#guided-leverage-live-capital"),
    requiredMonthly: $("#guided-leverage-live-monthly"),
    limiter: $("#guided-leverage-live-limiter")
  };

  function setText(element, value) {
    if (element && element.textContent !== String(value)) element.textContent = String(value);
  }

  function setInputValue(input, value, formatter) {
    if (!input || document.activeElement === input) return;
    input.value = formatter ? formatter(value) : String(value);
  }

  function parseInput(input, engine) {
    if (!input || input.value.trim() === "") return NaN;
    return engine.parseNumeric(input.value);
  }

  function formatResaleCurrency(value) {
    return resaleEngine.formatters.currency(value);
  }

  function formatLeverageCurrency(value) {
    return leverageEngine.formatters.currency(value);
  }

  function setPresetState(selector, value) {
    $$(selector).forEach((button) => {
      const preset = Number(Object.values(button.dataset)[0]);
      const active = Number.isFinite(preset) && Math.abs(preset - value) < 0.005;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function trackEvent(name, parameters = {}) {
    const detail = {
      event: name,
      parameters: { ...parameters, page_area: "guided_simulator" }
    };
    if (typeof window.gtag === "function") window.gtag("event", name, detail.parameters);
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name, ...detail.parameters });
    window.dispatchEvent(new CustomEvent("cristal:analytics", { detail }));
  }

  function clearFeedback(group) {
    setText(group.feedback, "");
    group.steps.forEach((step) => {
      $$('[aria-invalid="true"]', step).forEach((field) => field.removeAttribute("aria-invalid"));
    });
  }

  function showError(group, input, message) {
    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.focus({ preventScroll: true });
    }
    setText(group.feedback, message);
    return false;
  }

  function showStep(kind, requestedStep, options = {}) {
    const isResale = kind === "resale";
    const group = isResale ? resale : leverage;
    const stateKey = isResale ? "resaleStep" : "leverageStep";
    const total = group.steps.length;
    const step = Math.min(total - 1, Math.max(0, requestedStep));
    state[stateKey] = step;
    clearFeedback(group);

    group.steps.forEach((panel, index) => {
      const active = index === step;
      panel.hidden = !active;
      panel.toggleAttribute("inert", !active);
      if (active) panel.setAttribute("aria-current", "step");
      else panel.removeAttribute("aria-current");
    });

    const isResult = step === total - 1;
    setText(group.progressLabel, isResult ? "Resultado" : `Etapa ${step + 1} de ${total}`);
    group.progress?.setAttribute("aria-valuenow", String(step + 1));
    if (group.progressBar) group.progressBar.style.width = `${(step + 1) / total * 100}%`;
    group.back.hidden = step === 0;
    group.next.hidden = isResult;
    if (!isResult) {
      group.next.firstChild.textContent = step === total - 2 ? "Ver resultado " : "Continuar ";
    }

    if (options.focus) {
      requestAnimationFrame(() => {
        const heading = $("h4", group.steps[step]);
        heading?.focus({ preventScroll: true });
      });
    }
  }

  function renderResale(result = window.CristalResaleSimulator?.getCurrentResult()) {
    if (!result || !resale.panel) return;
    setInputValue(resale.credit, result.input.credit, formatResaleCurrency);
    setInputValue(resale.ownBid, result.input.ownBid, formatResaleCurrency);
    setInputValue(resale.month, result.input.scenarioMonth);
    setInputValue(resale.premium, result.input.premiumPercentage);
    resale.month.max = String(result.input.termMonths);

    setText(resale.profit, formatResaleCurrency(result.grossProfit));
    setText(resale.capital, formatResaleCurrency(result.investedCapital));
    setText(resale.installment, formatResaleCurrency(result.initialInstallment));
    setText(resale.roi, result.roi === null ? "—" : resaleEngine.formatters.percentage(result.roi));
    setText(resale.embedded, resaleEngine.formatters.percentage(result.input.embeddedBidPercentage));

    setPresetState("[data-guided-resale-credit]", result.input.credit);
    setPresetState("[data-guided-resale-bid]", result.input.ownBid);
    setPresetState("[data-guided-resale-month]", result.input.scenarioMonth);
    setPresetState("[data-guided-resale-premium]", result.input.premiumPercentage);
  }

  function renderLeverage(result = window.CristalLeverageSimulator?.getCurrentResult()) {
    const api = window.CristalLeverageSimulator;
    const context = api?.getAcquisitionContext?.();
    if (!result || !context || !leverage.panel) return;

    setInputValue(leverage.target, context.targetAssetValue, formatLeverageCurrency);
    setInputValue(leverage.capital, result.input.capitalAvailable, formatLeverageCurrency);
    setInputValue(leverage.monthly, result.input.monthlyCapacity, formatLeverageCurrency);
    setInputValue(leverage.month, result.input.scenarioMonth);
    leverage.month.max = String(result.input.termMonths);
    setText(leverage.targetLabel, context.assetType === "vehicle" ? "Valor do veículo" : "Valor do imóvel");

    $$('[data-guided-asset-type]').forEach((button) => {
      const active = button.dataset.guidedAssetType === context.assetType;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    setText(leverage.credit, formatLeverageCurrency(result.estimatedCredit));
    setText(leverage.net, formatLeverageCurrency(result.credit.netAtContemplation));
    setText(leverage.requiredCapital, formatLeverageCurrency(result.capacity.capitalRequiredForBid));
    setText(leverage.requiredMonthly, formatLeverageCurrency(result.capacity.monthlyRequirement));
    setText(leverage.limiter, result.capacity.limitingMessage);
    setText(leverage.targetMessage, $("#leverage-target-message")?.textContent || "Atualizado automaticamente conforme suas respostas.");

    setPresetState("[data-guided-target]", context.targetAssetValue);
    setPresetState("[data-guided-capital]", result.input.capitalAvailable);
    setPresetState("[data-guided-monthly]", result.input.monthlyCapacity);
    setPresetState("[data-guided-leverage-month]", result.input.scenarioMonth);
  }

  function updateResale(partial, changedKey) {
    const result = window.CristalResaleSimulator?.updateInput?.(partial, changedKey);
    renderResale(result || window.CristalResaleSimulator?.getCurrentResult());
  }

  function updateLeverage(partial, changedKey) {
    const result = window.CristalLeverageSimulator?.updateInput?.(partial, changedKey);
    renderLeverage(result || window.CristalLeverageSimulator?.getCurrentResult());
  }

  function updateAcquisitionContext(partial, changedKey) {
    window.CristalLeverageSimulator?.updateAcquisitionContext?.(partial, changedKey);
    renderLeverage();
  }

  function validateResaleStep() {
    const result = window.CristalResaleSimulator?.getCurrentResult();
    const step = state.resaleStep;
    if (!result) return false;
    if (step === 0) {
      const value = parseInput(resale.credit, resaleEngine);
      if (!Number.isFinite(value) || value <= 0) return showError(resale, resale.credit, "Informe um valor de carta maior que zero.");
      updateResale({ credit: value }, "credit");
    }
    if (step === 1) {
      const value = parseInput(resale.ownBid, resaleEngine);
      if (!Number.isFinite(value) || value < 0) return showError(resale, resale.ownBid, "Informe o recurso próprio. Use zero se não desejar utilizar esse valor.");
      updateResale({ ownBid: value }, "ownBid");
    }
    if (step === 2) {
      const value = parseInput(resale.month, resaleEngine);
      if (!Number.isInteger(value) || value < 1 || value > result.input.termMonths) return showError(resale, resale.month, `Informe um prazo entre 1 e ${result.input.termMonths} meses.`);
      updateResale({ scenarioMonth: value }, "scenarioMonth");
    }
    if (step === 3) {
      const value = parseInput(resale.premium, resaleEngine);
      if (!Number.isFinite(value) || value < 0 || value > 100) return showError(resale, resale.premium, "Informe um ágio entre 0% e 100%.");
      updateResale({ premiumPercentage: value }, "premiumPercentage");
    }
    return true;
  }

  function validateLeverageStep() {
    const api = window.CristalLeverageSimulator;
    const result = api?.getCurrentResult();
    const context = api?.getAcquisitionContext?.();
    const step = state.leverageStep;
    if (!result || !context) return false;
    if (step === 0 && !["property", "vehicle"].includes(context.assetType)) {
      return showError(leverage, null, "Escolha o tipo de bem que deseja adquirir.");
    }
    if (step === 1) {
      const value = parseInput(leverage.target, leverageEngine);
      if (!Number.isFinite(value) || value <= 0) return showError(leverage, leverage.target, "Informe um valor de bem maior que zero.");
      updateAcquisitionContext({ targetAssetValue: value }, "targetAssetValue");
    }
    if (step === 2) {
      const value = parseInput(leverage.capital, leverageEngine);
      if (!Number.isFinite(value) || value < 0) return showError(leverage, leverage.capital, "Informe o capital disponível. Use zero se ainda não houver capital reservado.");
      updateLeverage({ capitalAvailable: value }, "capitalAvailable");
    }
    if (step === 3) {
      const value = parseInput(leverage.monthly, leverageEngine);
      if (!Number.isFinite(value) || value <= 0) return showError(leverage, leverage.monthly, "Informe um orçamento mensal maior que zero.");
      updateLeverage({ monthlyCapacity: value }, "monthlyCapacity");
    }
    if (step === 4) {
      const value = parseInput(leverage.month, leverageEngine);
      if (!Number.isInteger(value) || value < 1 || value > result.input.termMonths) return showError(leverage, leverage.month, `Informe um prazo entre 1 e ${result.input.termMonths} meses.`);
      updateLeverage({ scenarioMonth: value }, "scenarioMonth");
    }
    return true;
  }

  function advance(kind) {
    const isResale = kind === "resale";
    const group = isResale ? resale : leverage;
    const stepKey = isResale ? "resaleStep" : "leverageStep";
    const completeKey = isResale ? "resaleCompleted" : "leverageCompleted";
    const validate = isResale ? validateResaleStep : validateLeverageStep;
    if (!validate()) return;
    const current = state[stepKey];
    trackEvent("guided_step_completed", { strategy: kind, step: current + 1 });
    showStep(kind, current + 1, { focus: true });
    if (state[stepKey] === group.steps.length - 1 && !state[completeKey]) {
      state[completeKey] = true;
      trackEvent("guided_simulation_completed", { strategy: kind });
    }
  }

  function bindLiveInput(input, engine, update, key, options = {}) {
    if (!input) return;
    input.addEventListener("focus", () => input.select());
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      setText(key === "resale" ? resale.feedback : leverage.feedback, "");
      const value = parseInput(input, engine);
      if (Number.isFinite(value) && (!options.positive || value > 0) && (!options.nonNegative || value >= 0)) {
        update(value);
      }
    });
    input.addEventListener("blur", () => {
      const value = parseInput(input, engine);
      if (!Number.isFinite(value)) return;
      update(value);
      if (key === "resale") renderResale();
      else renderLeverage();
    });
  }

  function bindPreset(selector, engine, callback) {
    $$(selector).forEach((button) => button.addEventListener("click", () => {
      const raw = Object.values(button.dataset)[0];
      const value = engine.parseNumeric(raw);
      if (Number.isFinite(value)) callback(value);
    }));
  }

  function setupResale() {
    if (!resale.panel || !window.CristalResaleSimulator) return;
    renderResale();
    showStep("resale", 0);

    bindLiveInput(resale.credit, resaleEngine, (value) => updateResale({ credit: value }, "credit"), "resale", { positive: true });
    bindLiveInput(resale.ownBid, resaleEngine, (value) => updateResale({ ownBid: value }, "ownBid"), "resale", { nonNegative: true });
    bindLiveInput(resale.month, resaleEngine, (value) => updateResale({ scenarioMonth: value }, "scenarioMonth"), "resale", { positive: true });
    bindLiveInput(resale.premium, resaleEngine, (value) => updateResale({ premiumPercentage: value }, "premiumPercentage"), "resale", { nonNegative: true });
    bindPreset("[data-guided-resale-credit]", resaleEngine, (value) => updateResale({ credit: value }, "credit"));
    bindPreset("[data-guided-resale-bid]", resaleEngine, (value) => updateResale({ ownBid: value }, "ownBid"));
    bindPreset("[data-guided-resale-month]", resaleEngine, (value) => updateResale({ scenarioMonth: value }, "scenarioMonth"));
    bindPreset("[data-guided-resale-premium]", resaleEngine, (value) => updateResale({ premiumPercentage: value }, "premiumPercentage"));

    resale.next.addEventListener("click", () => advance("resale"));
    resale.back.addEventListener("click", () => showStep("resale", state.resaleStep - 1, { focus: true }));
    resale.panel.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches("input") && !resale.next.hidden) {
        event.preventDefault();
        advance("resale");
      }
    });
    $('[data-guided-resale-to-simple]')?.addEventListener("click", () => window.CristalResaleSimulator.setMode("simple"));
    $("#reset-resale-simulation")?.addEventListener("click", () => {
      state.resaleCompleted = false;
      showStep("resale", 0, { focus: true });
    });
  }

  function setupLeverage() {
    if (!leverage.panel || !window.CristalLeverageSimulator) return;
    renderLeverage();
    showStep("leverage", 0);

    $$('[data-guided-asset-type]').forEach((button) => button.addEventListener("click", () => {
      updateAcquisitionContext({ assetType: button.dataset.guidedAssetType }, "assetType");
    }));
    bindLiveInput(leverage.target, leverageEngine, (value) => updateAcquisitionContext({ targetAssetValue: value }, "targetAssetValue"), "leverage", { positive: true });
    bindLiveInput(leverage.capital, leverageEngine, (value) => updateLeverage({ capitalAvailable: value }, "capitalAvailable"), "leverage", { nonNegative: true });
    bindLiveInput(leverage.monthly, leverageEngine, (value) => updateLeverage({ monthlyCapacity: value }, "monthlyCapacity"), "leverage", { positive: true });
    bindLiveInput(leverage.month, leverageEngine, (value) => updateLeverage({ scenarioMonth: value }, "scenarioMonth"), "leverage", { positive: true });
    bindPreset("[data-guided-target]", leverageEngine, (value) => updateAcquisitionContext({ targetAssetValue: value }, "targetAssetValue"));
    bindPreset("[data-guided-capital]", leverageEngine, (value) => updateLeverage({ capitalAvailable: value }, "capitalAvailable"));
    bindPreset("[data-guided-monthly]", leverageEngine, (value) => updateLeverage({ monthlyCapacity: value }, "monthlyCapacity"));
    bindPreset("[data-guided-leverage-month]", leverageEngine, (value) => updateLeverage({ scenarioMonth: value }, "scenarioMonth"));

    leverage.next.addEventListener("click", () => advance("leverage"));
    leverage.back.addEventListener("click", () => showStep("leverage", state.leverageStep - 1, { focus: true }));
    leverage.panel.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches("input") && !leverage.next.hidden) {
        event.preventDefault();
        advance("leverage");
      }
    });
    $('[data-guided-leverage-to-simple]')?.addEventListener("click", () => window.CristalLeverageSimulator.setMode("simple"));
    $("#reset-leverage-simulation")?.addEventListener("click", () => {
      state.leverageCompleted = false;
      showStep("leverage", 0, { focus: true });
    });
  }

  function setupCrossModeSync() {
    window.addEventListener("cristal:resale-updated", (event) => renderResale(event.detail?.result));
    window.addEventListener("cristal:leverage-updated", (event) => renderLeverage(event.detail?.result));
    window.addEventListener("cristal:resale-mode-changed", (event) => {
      if (event.detail?.mode === "guided") {
        renderResale();
        showStep("resale", state.resaleStep);
      }
    });
    window.addEventListener("cristal:leverage-mode-changed", (event) => {
      if (event.detail?.mode === "guided") {
        renderLeverage();
        showStep("leverage", state.leverageStep);
      }
    });
  }

  function init() {
    if (!resaleEngine || !leverageEngine) return;
    setupResale();
    setupLeverage();
    setupCrossModeSync();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
