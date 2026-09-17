(function initializeSimulationEngine(root, factory) {
  "use strict";

  const engine = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  }

  if (root) {
    root.CristalSimulationEngine = engine;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createSimulationEngine() {
  "use strict";

  const BASE_OPTIONS = Object.freeze({
    ORIGINAL_CREDIT: "original-credit",
    ADJUSTED_CREDIT: "adjusted-credit",
    ORIGINAL_NET_CREDIT: "original-net-credit",
    ADJUSTED_NET_CREDIT: "adjusted-net-credit"
  });

  const INSTALLMENT_TYPES = Object.freeze({
    REDUCED: "reduced",
    FULL: "full"
  });

  const CORRECTION_TIMINGS = Object.freeze({
    NEXT_INSTALLMENT: "next-installment",
    PERIOD_END: "period-end"
  });

  const DEFAULT_INPUT = deepFreeze({
    credit: 200000,
    ownBid: 0,
    embeddedBidPercentage: 0,
    scenarioMonth: 24,
    premiumPercentage: 25,
    termMonths: 240,
    administrationPercentage: 22,
    reserveFundPercentage: 3.7,
    administrationFundPercentage: 25.7,
    annualCorrectionPercentage: 5,
    installmentType: INSTALLMENT_TYPES.REDUCED,
    reducedInstallmentPercentage: 50,
    otherOwnOutlays: 0
  });

  const DEFAULT_CONFIG = deepFreeze({
    limits: {
      minCredit: 1,
      maxCredit: 1000000000,
      maxOwnBid: 1000000000,
      minTermMonths: 1,
      maxTermMonths: 600,
      maxAdministrationPercentage: 100,
      maxReserveFundPercentage: 100,
      maxAdministrationFundPercentage: 200,
      maxAnnualCorrectionPercentage: 100,
      maxPremiumPercentage: 100,
      maxOtherOwnOutlays: 1000000000
    },
    embeddedBid: {
      maxPercentage: 30,
      base: BASE_OPTIONS.ORIGINAL_CREDIT
    },
    totalBid: {
      maxPercentage: 100,
      base: BASE_OPTIONS.ORIGINAL_CREDIT
    },
    premium: {
      base: BASE_OPTIONS.ADJUSTED_NET_CREDIT
    },
    correction: {
      intervalMonths: 12,
      timing: CORRECTION_TIMINGS.NEXT_INSTALLMENT
    },
    installment: {
      roundEachPayment: true
    },
    moneyDecimals: 2
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach((key) => deepFreeze(value[key]));
    return value;
  }

  function mergeConfig(override) {
    const custom = override && typeof override === "object" ? override : {};
    return {
      ...DEFAULT_CONFIG,
      ...custom,
      limits: { ...DEFAULT_CONFIG.limits, ...(custom.limits || {}) },
      embeddedBid: { ...DEFAULT_CONFIG.embeddedBid, ...(custom.embeddedBid || {}) },
      totalBid: { ...DEFAULT_CONFIG.totalBid, ...(custom.totalBid || {}) },
      premium: { ...DEFAULT_CONFIG.premium, ...(custom.premium || {}) },
      correction: { ...DEFAULT_CONFIG.correction, ...(custom.correction || {}) },
      installment: { ...DEFAULT_CONFIG.installment, ...(custom.installment || {}) }
    };
  }

  function parseNumeric(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    if (typeof value !== "string") return NaN;

    let normalized = value.trim();
    if (!normalized) return NaN;

    normalized = normalized.replace(/[^0-9,.-]/g, "");
    if (!/[0-9]/.test(normalized)) return NaN;
    const commaIndex = normalized.lastIndexOf(",");
    const dotIndex = normalized.lastIndexOf(".");

    if (commaIndex >= 0 && dotIndex >= 0) {
      if (commaIndex > dotIndex) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = normalized.replace(/,/g, "");
      }
    } else if (commaIndex >= 0) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
      normalized = normalized.replace(/\./g, "");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function numberOrDefault(value, fallback) {
    const parsed = parseNumeric(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function round(value, decimals) {
    if (!Number.isFinite(value)) return 0;
    const precision = Number.isInteger(decimals) ? Math.max(0, decimals) : 2;
    const factor = 10 ** precision;
    const shifted = (value + Number.EPSILON) * factor;
    return Number.isFinite(shifted) ? Math.round(shifted) / factor : value;
  }

  function roundMoney(value, config) {
    const settings = mergeConfig(config);
    return round(value, settings.moneyDecimals);
  }

  function roundPercentage(value) {
    return round(value, 4);
  }

  function readInput(raw, aliases, fallback) {
    const source = raw && typeof raw === "object" ? raw : {};
    for (const alias of aliases) {
      if (Object.prototype.hasOwnProperty.call(source, alias)) return source[alias];
    }
    return fallback;
  }

  function normalizeBasicInput(rawInput, config) {
    const settings = mergeConfig(config);
    const input = rawInput && typeof rawInput === "object" ? rawInput : {};

    const credit = clamp(
      numberOrDefault(readInput(input, ["credit", "creditValue", "carta"], DEFAULT_INPUT.credit), DEFAULT_INPUT.credit),
      settings.limits.minCredit,
      settings.limits.maxCredit
    );
    const termMonths = Math.round(clamp(
      numberOrDefault(readInput(input, ["termMonths", "term", "prazo"], DEFAULT_INPUT.termMonths), DEFAULT_INPUT.termMonths),
      settings.limits.minTermMonths,
      settings.limits.maxTermMonths
    ));
    const scenarioMonth = Math.round(clamp(
      numberOrDefault(
        readInput(input, ["scenarioMonth", "contemplationMonth", "month", "mes"], DEFAULT_INPUT.scenarioMonth),
        DEFAULT_INPUT.scenarioMonth
      ),
      1,
      termMonths
    ));
    const embeddedBidPercentage = clamp(
      numberOrDefault(
        readInput(input, ["embeddedBidPercentage", "embeddedPercentage", "embutido"], DEFAULT_INPUT.embeddedBidPercentage),
        DEFAULT_INPUT.embeddedBidPercentage
      ),
      0,
      Math.max(0, numberOrDefault(settings.embeddedBid.maxPercentage, DEFAULT_CONFIG.embeddedBid.maxPercentage))
    );
    const installmentTypeRaw = readInput(
      input,
      ["installmentType", "tipoParcela"],
      DEFAULT_INPUT.installmentType
    );
    const installmentType = installmentTypeRaw === INSTALLMENT_TYPES.FULL
      ? INSTALLMENT_TYPES.FULL
      : INSTALLMENT_TYPES.REDUCED;

    const hasReserveFund = Object.prototype.hasOwnProperty.call(input, "reserveFundPercentage")
      || Object.prototype.hasOwnProperty.call(input, "reservePercentage")
      || Object.prototype.hasOwnProperty.call(input, "fundoReserva");
    const hasExplicitAdministration = Object.prototype.hasOwnProperty.call(input, "administrationPercentage")
      || Object.prototype.hasOwnProperty.call(input, "administrationFeePercentage");
    const hasCombinedAdministrationFund = Object.prototype.hasOwnProperty.call(input, "administrationFundPercentage")
      || Object.prototype.hasOwnProperty.call(input, "adminFundPercentage")
      || Object.prototype.hasOwnProperty.call(input, "taxaAdministracao");
    const rawCombinedAdministrationFund = numberOrDefault(
      readInput(
        input,
        ["administrationFundPercentage", "adminFundPercentage", "taxaAdministracao"],
        hasExplicitAdministration
          ? readInput(input, ["administrationPercentage", "administrationFeePercentage"], DEFAULT_INPUT.administrationFundPercentage)
          : DEFAULT_INPUT.administrationFundPercentage
      ),
      DEFAULT_INPUT.administrationFundPercentage
    );
    const administrationPercentage = roundPercentage(clamp(
      numberOrDefault(
        readInput(
          input,
          ["administrationPercentage", "administrationFeePercentage"],
          hasReserveFund
            ? DEFAULT_INPUT.administrationPercentage
            : (hasCombinedAdministrationFund || hasExplicitAdministration ? rawCombinedAdministrationFund : DEFAULT_INPUT.administrationPercentage)
        ),
        hasReserveFund
          ? DEFAULT_INPUT.administrationPercentage
          : (hasCombinedAdministrationFund || hasExplicitAdministration ? rawCombinedAdministrationFund : DEFAULT_INPUT.administrationPercentage)
      ),
      0,
      settings.limits.maxAdministrationPercentage
    ));
    const reserveFundPercentage = roundPercentage(clamp(
      numberOrDefault(
        readInput(input, ["reserveFundPercentage", "reservePercentage", "fundoReserva"], (hasCombinedAdministrationFund || hasExplicitAdministration) && !hasReserveFund ? 0 : DEFAULT_INPUT.reserveFundPercentage),
        (hasCombinedAdministrationFund || hasExplicitAdministration) && !hasReserveFund ? 0 : DEFAULT_INPUT.reserveFundPercentage
      ),
      0,
      settings.limits.maxReserveFundPercentage
    ));
    const administrationFundPercentage = roundPercentage(clamp(
      hasReserveFund
        ? administrationPercentage + reserveFundPercentage
        : (hasCombinedAdministrationFund || hasExplicitAdministration ? rawCombinedAdministrationFund : DEFAULT_INPUT.administrationFundPercentage),
      0,
      settings.limits.maxAdministrationFundPercentage
    ));

    return {
      credit: roundMoney(credit, settings),
      ownBid: roundMoney(clamp(
        numberOrDefault(
          readInput(input, ["ownBid", "ownBidValue", "lance"], DEFAULT_INPUT.ownBid),
          DEFAULT_INPUT.ownBid
        ),
        0,
        settings.limits.maxOwnBid
      ), settings),
      embeddedBidPercentage: roundPercentage(embeddedBidPercentage),
      scenarioMonth,
      premiumPercentage: roundPercentage(clamp(
        numberOrDefault(
          readInput(input, ["premiumPercentage", "agioPercentage", "agio"], DEFAULT_INPUT.premiumPercentage),
          DEFAULT_INPUT.premiumPercentage
        ),
        0,
        settings.limits.maxPremiumPercentage
      )),
      termMonths,
      administrationPercentage,
      reserveFundPercentage,
      administrationFundPercentage,
      annualCorrectionPercentage: roundPercentage(clamp(
        numberOrDefault(
          readInput(
            input,
            ["annualCorrectionPercentage", "annualCorrection", "correcao"],
            DEFAULT_INPUT.annualCorrectionPercentage
          ),
          DEFAULT_INPUT.annualCorrectionPercentage
        ),
        0,
        settings.limits.maxAnnualCorrectionPercentage
      )),
      installmentType,
      reducedInstallmentPercentage: roundPercentage(clamp(
        numberOrDefault(
          readInput(
            input,
            ["reducedInstallmentPercentage", "reducedPercentage", "percentualParcelaReduzida"],
            DEFAULT_INPUT.reducedInstallmentPercentage
          ),
          DEFAULT_INPUT.reducedInstallmentPercentage
        ),
        0,
        100
      )),
      otherOwnOutlays: roundMoney(clamp(
        numberOrDefault(
          readInput(input, ["otherOwnOutlays", "otherOutlays", "outrosDesembolsos"], DEFAULT_INPUT.otherOwnOutlays),
          DEFAULT_INPUT.otherOwnOutlays
        ),
        0,
        settings.limits.maxOtherOwnOutlays
      ), settings)
    };
  }

  function calculatePlanTotal(credit, administrationFundPercentage, config) {
    const amount = Math.max(0, numberOrDefault(credit, 0));
    const percentage = Math.max(0, numberOrDefault(administrationFundPercentage, 0));
    return roundMoney(amount * (1 + percentage / 100), config);
  }

  function calculateBaseInstallment(credit, administrationFundPercentage, termMonths, config) {
    const term = Math.max(1, Math.round(numberOrDefault(termMonths, 1)));
    return roundMoney(calculatePlanTotal(credit, administrationFundPercentage, config) / term, config);
  }

  function calculateReducedInstallment(baseInstallment, reducedPercentage, config) {
    const base = Math.max(0, numberOrDefault(baseInstallment, 0));
    const percentage = clamp(numberOrDefault(reducedPercentage, 100), 0, 100);
    return roundMoney(base * percentage / 100, config);
  }

  function calculateCorrectionPeriods(month, config) {
    const settings = mergeConfig(config);
    const interval = Math.max(1, Math.round(numberOrDefault(settings.correction.intervalMonths, 12)));
    const safeMonth = Math.max(1, Math.round(numberOrDefault(month, 1)));

    // Padrão conservador: a primeira correção afeta a parcela 13, após 12 parcelas completas.
    if (settings.correction.timing === CORRECTION_TIMINGS.PERIOD_END) {
      return Math.floor(safeMonth / interval);
    }
    return Math.floor((safeMonth - 1) / interval);
  }

  function calculateAdjustedInstallment(baseInstallment, month, annualCorrectionPercentage, config) {
    const settings = mergeConfig(config);
    const base = Math.max(0, numberOrDefault(baseInstallment, 0));
    const correction = Math.max(0, numberOrDefault(annualCorrectionPercentage, 0)) / 100;
    const periods = calculateCorrectionPeriods(month, settings);
    const adjusted = base * (1 + correction) ** periods;
    return settings.installment.roundEachPayment ? roundMoney(adjusted, settings) : adjusted;
  }

  function calculateInstallmentSchedule(baseInstallment, months, annualCorrectionPercentage, config) {
    const settings = mergeConfig(config);
    const count = Math.max(0, Math.round(numberOrDefault(months, 0)));
    const schedule = [];
    let cumulative = 0;

    for (let month = 1; month <= count; month += 1) {
      const amount = calculateAdjustedInstallment(baseInstallment, month, annualCorrectionPercentage, settings);
      cumulative = roundMoney(cumulative + amount, settings);
      schedule.push({
        month,
        correctionPeriods: calculateCorrectionPeriods(month, settings),
        amount: roundMoney(amount, settings),
        cumulative
      });
    }

    return schedule;
  }

  function calculateAdjustedInstallments(baseInstallment, months, annualCorrectionPercentage, config) {
    return calculateInstallmentSchedule(baseInstallment, months, annualCorrectionPercentage, config)
      .map((entry) => entry.amount);
  }

  function sumAdjustedInstallments(baseInstallment, months, annualCorrectionPercentage, config) {
    const schedule = calculateInstallmentSchedule(baseInstallment, months, annualCorrectionPercentage, config);
    return schedule.length ? schedule[schedule.length - 1].cumulative : 0;
  }

  function calculateAdjustedCredit(credit, annualCorrectionPercentage, month, config) {
    const amount = Math.max(0, numberOrDefault(credit, 0));
    const correction = Math.max(0, numberOrDefault(annualCorrectionPercentage, 0)) / 100;
    const periods = calculateCorrectionPeriods(month, config);
    return roundMoney(amount * (1 + correction) ** periods, config);
  }

  function calculateOwnBid(value, maximum, config) {
    const requested = Math.max(0, numberOrDefault(value, 0));
    const limit = Number.isFinite(maximum) ? Math.max(0, maximum) : requested;
    return roundMoney(Math.min(requested, limit), config);
  }

  function calculateEmbeddedBid(baseCredit, percentage, maximumAmount, config) {
    const base = Math.max(0, numberOrDefault(baseCredit, 0));
    const rate = Math.max(0, numberOrDefault(percentage, 0));
    const requested = base * rate / 100;
    const limit = Number.isFinite(maximumAmount) ? Math.max(0, maximumAmount) : requested;
    return roundMoney(Math.min(requested, limit), config);
  }

  function calculateTotalBid(ownBid, embeddedBid, config) {
    return roundMoney(
      Math.max(0, numberOrDefault(ownBid, 0)) + Math.max(0, numberOrDefault(embeddedBid, 0)),
      config
    );
  }

  function calculateBidPercentage(totalBid, baseCredit) {
    const base = Math.max(0, numberOrDefault(baseCredit, 0));
    if (base === 0) return 0;
    return roundPercentage(Math.max(0, numberOrDefault(totalBid, 0)) / base * 100);
  }

  function calculateNetCredit(baseCredit, embeddedBid, config) {
    return roundMoney(Math.max(
      0,
      Math.max(0, numberOrDefault(baseCredit, 0)) - Math.max(0, numberOrDefault(embeddedBid, 0))
    ), config);
  }

  function calculateInvestedCapital(paidInstallments, ownBid, otherOwnOutlays, config) {
    // Lance embutido não integra capital próprio, pois não é um novo desembolso do cliente.
    return roundMoney(
      Math.max(0, numberOrDefault(paidInstallments, 0))
        + Math.max(0, numberOrDefault(ownBid, 0))
        + Math.max(0, numberOrDefault(otherOwnOutlays, 0)),
      config
    );
  }

  function allocateAppliedBid(requestedOwnBid, requestedEmbeddedBid, maximumApplicableBid, config) {
    const settings = mergeConfig(config);
    const requestedOwn = Math.max(0, numberOrDefault(requestedOwnBid, 0));
    const requestedEmbedded = Math.max(0, numberOrDefault(requestedEmbeddedBid, 0));
    const requestedTotal = requestedOwn + requestedEmbedded;
    const appliedTotal = Math.min(
      requestedTotal,
      Math.max(0, numberOrDefault(maximumApplicableBid, 0))
    );
    const scale = requestedTotal > 0 ? appliedTotal / requestedTotal : 0;
    const embeddedBid = roundMoney(requestedEmbedded * scale, settings);
    const ownBid = roundMoney(Math.max(0, appliedTotal - embeddedBid), settings);
    const totalBid = roundMoney(ownBid + embeddedBid, settings);

    return {
      ownBid,
      embeddedBid,
      totalBid,
      requestedOwnBid: roundMoney(requestedOwn, settings),
      requestedEmbeddedBid: roundMoney(requestedEmbedded, settings),
      requestedTotalBid: roundMoney(requestedTotal, settings),
      wasLimitedByBalance: requestedTotal - totalBid > 0.01
    };
  }

  function calculateDebtPosition(adjustedCredit, administrationFundPercentage, paidInstallments, totalBid, remainingMonths, config, scenarioMonth, annualCorrectionPercentage) {
    const settings = mergeConfig(config);
    const adjustedPlanValue = calculatePlanTotal(adjustedCredit, administrationFundPercentage, settings);
    const balanceBeforeBid = roundMoney(Math.max(
      0,
      adjustedPlanValue - Math.max(0, numberOrDefault(paidInstallments, 0))
    ), settings);
    const appliedBid = roundMoney(Math.min(
      balanceBeforeBid,
      Math.max(0, numberOrDefault(totalBid, 0))
    ), settings);
    const balanceAfterBid = roundMoney(Math.max(0, balanceBeforeBid - appliedBid), settings);
    const months = Math.max(0, Math.round(numberOrDefault(remainingMonths, 0)));
    const scenario = Math.max(0, Math.round(numberOrDefault(scenarioMonth, 0)));
    const currentPeriods = calculateCorrectionPeriods(scenario, settings);
    const nextPeriods = calculateCorrectionPeriods(scenario + 1, settings);
    const nextCorrectionFactor = (1 + Math.max(0, numberOrDefault(annualCorrectionPercentage, 0)) / 100)
      ** Math.max(0, nextPeriods - currentPeriods);
    const isBalloonPayment = months === 0 && balanceAfterBid > 0;
    const postContemplationInstallment = balanceAfterBid > 0
      ? roundMoney(
        months > 0 ? balanceAfterBid * nextCorrectionFactor / months : balanceAfterBid,
        settings
      )
      : 0;

    return {
      adjustedPlanValue,
      balanceBeforeBid,
      appliedBid,
      balanceAfterBid,
      remainingMonths: months,
      postContemplationInstallment,
      isBalloonPayment
    };
  }

  function calculateEstimatedPremium(baseValue, premiumPercentage, config) {
    const base = Math.max(0, numberOrDefault(baseValue, 0));
    const percentage = Math.max(0, numberOrDefault(premiumPercentage, 0));
    return roundMoney(base * percentage / 100, config);
  }

  function calculateEstimatedOperationValue(adjustedNetCredit, estimatedPremium, config) {
    return roundMoney(
      Math.max(0, numberOrDefault(adjustedNetCredit, 0)) + Math.max(0, numberOrDefault(estimatedPremium, 0)),
      config
    );
  }

  function calculateProfit(estimatedPremium, investedCapital, config) {
    // O crédito mantém contrapartida no plano; por isso o resultado usa ágio menos desembolso próprio.
    return roundMoney(
      numberOrDefault(estimatedPremium, 0) - Math.max(0, numberOrDefault(investedCapital, 0)),
      config
    );
  }

  function calculateROI(profit, investedCapital) {
    const capital = Math.max(0, numberOrDefault(investedCapital, 0));
    if (capital === 0) return null;
    return roundPercentage(numberOrDefault(profit, 0) / capital * 100);
  }

  function selectBase(baseOption, values) {
    switch (baseOption) {
      case BASE_OPTIONS.ADJUSTED_CREDIT:
        return values.adjustedCredit;
      case BASE_OPTIONS.ORIGINAL_NET_CREDIT:
        return values.netCredit;
      case BASE_OPTIONS.ADJUSTED_NET_CREDIT:
        return values.adjustedNetCredit;
      case BASE_OPTIONS.ORIGINAL_CREDIT:
      default:
        return values.credit;
    }
  }

  function calculateBidValues(input, adjustedCredit, config) {
    const settings = mergeConfig(config);
    const preliminaryValues = {
      credit: input.credit,
      adjustedCredit,
      netCredit: input.credit,
      adjustedNetCredit: adjustedCredit
    };
    const embeddedBase = Math.max(0, selectBase(settings.embeddedBid.base, preliminaryValues));
    const totalBidBase = Math.max(0, selectBase(settings.totalBid.base, preliminaryValues));
    const maximumTotalBidPercentage = clamp(
      numberOrDefault(settings.totalBid.maxPercentage, 100),
      0,
      100
    );
    const maximumTotalBid = roundMoney(
      totalBidBase * maximumTotalBidPercentage / 100,
      settings
    );
    const requestedEmbeddedBid = roundMoney(embeddedBase * input.embeddedBidPercentage / 100, settings);
    const embeddedBid = calculateEmbeddedBid(
      embeddedBase,
      input.embeddedBidPercentage,
      maximumTotalBid,
      settings
    );
    const effectiveEmbeddedPercentage = embeddedBase > 0
      ? roundPercentage(embeddedBid / embeddedBase * 100)
      : 0;
    const ownBid = calculateOwnBid(input.ownBid, Math.max(0, maximumTotalBid - embeddedBid), settings);
    const totalBid = calculateTotalBid(ownBid, embeddedBid, settings);

    return {
      embeddedBase,
      totalBidBase,
      maximumTotalBid,
      requestedOwnBid: input.ownBid,
      requestedEmbeddedBid,
      ownBid,
      embeddedBid,
      embeddedBidPercentage: effectiveEmbeddedPercentage,
      totalBid,
      totalBidPercentage: Math.min(maximumTotalBidPercentage, calculateBidPercentage(totalBid, totalBidBase))
    };
  }

  function prepareInput(rawInput, config) {
    const settings = mergeConfig(config);
    const basic = normalizeBasicInput(rawInput, settings);
    const adjustedCredit = calculateAdjustedCredit(
      basic.credit,
      basic.annualCorrectionPercentage,
      basic.scenarioMonth,
      settings
    );
    const bid = calculateBidValues(basic, adjustedCredit, settings);
    const warnings = [];

    if (bid.embeddedBid < bid.requestedEmbeddedBid) {
      warnings.push("O lance embutido foi limitado para que o lance total não ultrapasse 100% da base configurada.");
    }
    if (bid.ownBid < bid.requestedOwnBid) {
      warnings.push("O lance com recurso próprio foi limitado ao saldo disponível da base do lance.");
    }

    return {
      requestedInput: { ...basic },
      input: {
        ...basic,
        ownBid: bid.ownBid,
        embeddedBidPercentage: bid.embeddedBidPercentage
      },
      bid,
      warnings
    };
  }

  function normalizeSimulationInput(rawInput, config) {
    return prepareInput(rawInput, config).input;
  }

  function validateSimulationInput(rawInput, config) {
    const settings = mergeConfig(config);
    const source = rawInput && typeof rawInput === "object" ? rawInput : {};
    const errors = [];
    const warnings = [];
    const numericRules = [
      { aliases: ["credit", "creditValue", "carta"], label: "Valor da carta", allowZero: false },
      { aliases: ["ownBid", "ownBidValue", "lance"], label: "Lance próprio", allowZero: true },
      { aliases: ["embeddedBidPercentage", "embeddedPercentage", "embutido"], label: "Lance embutido", allowZero: true },
      { aliases: ["scenarioMonth", "contemplationMonth", "month", "mes"], label: "Mês do cenário", allowZero: false },
      { aliases: ["termMonths", "term", "prazo"], label: "Prazo", allowZero: false },
      { aliases: ["premiumPercentage", "agioPercentage", "agio"], label: "Ágio", allowZero: true },
      { aliases: ["administrationFundPercentage", "adminFundPercentage", "taxaAdministracao"], label: "Taxa e fundo", allowZero: true },
      { aliases: ["administrationPercentage", "administrationFeePercentage"], label: "Taxa de administração", allowZero: true },
      { aliases: ["reserveFundPercentage", "reservePercentage", "fundoReserva"], label: "Fundo de reserva", allowZero: true },
      { aliases: ["annualCorrectionPercentage", "annualCorrection", "correcao"], label: "Correção", allowZero: true },
      { aliases: ["reducedInstallmentPercentage", "reducedPercentage"], label: "Parcela reduzida", allowZero: true },
      { aliases: ["otherOwnOutlays", "otherOutlays"], label: "Outros desembolsos", allowZero: true }
    ];

    for (const rule of numericRules) {
      const presentAlias = rule.aliases.find((alias) => Object.prototype.hasOwnProperty.call(source, alias));
      if (!presentAlias || source[presentAlias] === "") continue;
      const value = parseNumeric(source[presentAlias]);
      if (!Number.isFinite(value)) {
        errors.push(`${rule.label}: valor inválido.`);
      } else if (value < 0 || (!rule.allowZero && value === 0)) {
        errors.push(`${rule.label}: informe um valor ${rule.allowZero ? "igual ou maior" : "maior"} que zero.`);
      }
    }

    const normalizedBasic = normalizeBasicInput(source, settings);
    const rawMonth = parseNumeric(readInput(source, ["scenarioMonth", "contemplationMonth", "month", "mes"], normalizedBasic.scenarioMonth));
    const rawTerm = parseNumeric(readInput(source, ["termMonths", "term", "prazo"], normalizedBasic.termMonths));
    if (Number.isFinite(rawMonth) && Number.isFinite(rawTerm) && rawMonth > rawTerm) {
      warnings.push("O mês do cenário foi ajustado para não ultrapassar o prazo do plano.");
    }

    const rawEmbedded = parseNumeric(readInput(
      source,
      ["embeddedBidPercentage", "embeddedPercentage", "embutido"],
      normalizedBasic.embeddedBidPercentage
    ));
    if (Number.isFinite(rawEmbedded) && rawEmbedded > settings.embeddedBid.maxPercentage) {
      warnings.push(`O lance embutido foi limitado a ${settings.embeddedBid.maxPercentage}%.`);
    }

    const prepared = prepareInput(source, settings);
    warnings.push(...prepared.warnings);

    return {
      isValid: errors.length === 0,
      errors: Array.from(new Set(errors)),
      warnings: Array.from(new Set(warnings)),
      normalizedInput: prepared.input
    };
  }

  function calculatePoint(input, month, cumulativeInstallments, initialInstallment, config) {
    const settings = mergeConfig(config);
    const adjustedCredit = calculateAdjustedCredit(
      input.credit,
      input.annualCorrectionPercentage,
      month,
      settings
    );
    const pointInput = { ...input, scenarioMonth: month };
    const requestedBid = calculateBidValues(pointInput, adjustedCredit, settings);
    const balanceBeforeBid = Math.max(
      0,
      calculatePlanTotal(adjustedCredit, input.administrationFundPercentage, settings)
        - cumulativeInstallments
    );
    const appliedBid = allocateAppliedBid(
      requestedBid.ownBid,
      requestedBid.embeddedBid,
      balanceBeforeBid,
      settings
    );
    const bid = {
      ...requestedBid,
      ...appliedBid,
      embeddedBidPercentage: requestedBid.embeddedBase > 0
        ? roundPercentage(appliedBid.embeddedBid / requestedBid.embeddedBase * 100)
        : 0,
      totalBidPercentage: requestedBid.totalBidBase > 0
        ? roundPercentage(appliedBid.totalBid / requestedBid.totalBidBase * 100)
        : 0
    };
    const netCredit = calculateNetCredit(input.credit, bid.embeddedBid, settings);
    const adjustedNetCredit = calculateNetCredit(adjustedCredit, bid.embeddedBid, settings);
    const premiumBase = selectBase(settings.premium.base, {
      credit: input.credit,
      adjustedCredit,
      netCredit,
      adjustedNetCredit
    });
    const estimatedPremium = calculateEstimatedPremium(premiumBase, input.premiumPercentage, settings);
    const investedCapital = calculateInvestedCapital(
      cumulativeInstallments,
      bid.ownBid,
      input.otherOwnOutlays,
      settings
    );
    const estimatedOperationValue = calculateEstimatedOperationValue(
      adjustedNetCredit,
      estimatedPremium,
      settings
    );
    const grossProfit = calculateProfit(estimatedPremium, investedCapital, settings);

    return {
      month,
      correctionPeriods: calculateCorrectionPeriods(month, settings),
      installment: calculateAdjustedInstallment(
        initialInstallment,
        month,
        input.annualCorrectionPercentage,
        settings
      ),
      cumulativeInstallments: roundMoney(cumulativeInstallments, settings),
      adjustedCredit,
      ownBid: bid.ownBid,
      embeddedBid: bid.embeddedBid,
      totalBid: bid.totalBid,
      totalBidPercentage: bid.totalBidPercentage,
      requestedOwnBid: bid.requestedOwnBid,
      requestedEmbeddedBid: bid.requestedEmbeddedBid,
      requestedTotalBid: bid.requestedTotalBid,
      bidLimitDifference: roundMoney(
        Math.max(0, bid.requestedTotalBid - bid.totalBid),
        settings
      ),
      netCredit,
      adjustedNetCredit,
      investedCapital,
      estimatedPremium,
      estimatedOperationValue,
      grossProfit,
      roi: calculateROI(grossProfit, investedCapital)
    };
  }

  function generateSimulationTimeline(rawInput, config, untilMonth) {
    const settings = mergeConfig(config);
    const input = normalizeSimulationInput(rawInput, settings);
    const maximumMonth = Math.round(clamp(
      numberOrDefault(untilMonth, input.termMonths),
      1,
      input.termMonths
    ));
    const baseInstallment = calculateBaseInstallment(
      input.credit,
      input.administrationFundPercentage,
      input.termMonths,
      settings
    );
    const initialInstallment = input.installmentType === INSTALLMENT_TYPES.REDUCED
      ? calculateReducedInstallment(baseInstallment, input.reducedInstallmentPercentage, settings)
      : baseInstallment;
    const schedule = calculateInstallmentSchedule(
      initialInstallment,
      maximumMonth,
      input.annualCorrectionPercentage,
      settings
    );

    // Cada ponto compara a hipótese de contemplação naquele mês, sem afirmar previsão.
    return schedule.map((entry) => calculatePoint(
      input,
      entry.month,
      entry.cumulative,
      initialInstallment,
      settings
    ));
  }

  function calculateSimulation(rawInput, config) {
    const settings = mergeConfig(config);
    const prepared = prepareInput(rawInput, settings);
    const input = prepared.input;
    const validation = validateSimulationInput(rawInput, settings);
    const totalPlanValue = calculatePlanTotal(
      input.credit,
      input.administrationFundPercentage,
      settings
    );
    const baseInstallment = calculateBaseInstallment(
      input.credit,
      input.administrationFundPercentage,
      input.termMonths,
      settings
    );
    const initialInstallment = input.installmentType === INSTALLMENT_TYPES.REDUCED
      ? calculateReducedInstallment(baseInstallment, input.reducedInstallmentPercentage, settings)
      : baseInstallment;
    const installmentSchedule = calculateInstallmentSchedule(
      initialInstallment,
      input.scenarioMonth,
      input.annualCorrectionPercentage,
      settings
    );
    const installmentsPaidTotal = installmentSchedule.length
      ? installmentSchedule[installmentSchedule.length - 1].cumulative
      : 0;
    const selectedPoint = calculatePoint(
      input,
      input.scenarioMonth,
      installmentsPaidTotal,
      initialInstallment,
      settings
    );
    const debt = calculateDebtPosition(
      selectedPoint.adjustedCredit,
      input.administrationFundPercentage,
      installmentsPaidTotal,
      selectedPoint.totalBid,
      Math.max(0, input.termMonths - input.scenarioMonth),
      settings,
      input.scenarioMonth,
      input.annualCorrectionPercentage
    );
    const timeline = generateSimulationTimeline(input, settings, input.termMonths);
    const assumptions = [
      `A primeira correção ocorre na parcela ${settings.correction.intervalMonths + 1}, após ${settings.correction.intervalMonths} parcelas completas.`,
      settings.embeddedBid.base === BASE_OPTIONS.ORIGINAL_CREDIT
        ? "O lance embutido usa o crédito original como base."
        : "A base do lance embutido segue a configuração selecionada.",
      settings.premium.base === BASE_OPTIONS.ADJUSTED_NET_CREDIT
        ? "O ágio usa o crédito líquido corrigido como base."
        : "A base do ágio segue a configuração selecionada.",
      "O lance embutido reduz o crédito disponível e não integra o capital próprio.",
      "O saldo no cenário usa o plano corrigido, desconta as parcelas já somadas e aplica o lance total.",
      "A parcela pós-contemplação divide o saldo após o lance pelo prazo restante e considera a correção da próxima parcela quando aplicável; eventual saldo no último mês é tratado como obrigação final."
    ];
    const calculationWarnings = [];
    if (selectedPoint.bidLimitDifference > 0.01) {
      calculationWarnings.push("O lance informado supera o saldo devedor estimado e foi limitado ao valor matematicamente aplicável.");
    }
    if (debt.isBalloonPayment) {
      calculationWarnings.push("A contemplação considerada coincide com o fim do plano; o saldo residual foi tratado como obrigação final única.");
    }
    const allWarnings = Array.from(new Set([
      ...validation.warnings,
      ...prepared.warnings,
      ...calculationWarnings
    ]));

    return {
      input,
      requestedInput: prepared.requestedInput,
      config: settings,
      validation: {
        ...validation,
        warnings: allWarnings
      },
      warnings: allWarnings,
      assumptions,
      correctionPeriods: selectedPoint.correctionPeriods,
      totalPlanValue,
      baseInstallment,
      initialInstallment,
      installmentAtScenario: selectedPoint.installment,
      postContemplationInstallment: debt.postContemplationInstallment,
      remainingMonths: debt.remainingMonths,
      isBalloonPayment: debt.isBalloonPayment,
      installmentsPaid: input.scenarioMonth,
      installmentsPaidTotal,
      adjustedCredit: selectedPoint.adjustedCredit,
      ownBid: selectedPoint.ownBid,
      embeddedBid: selectedPoint.embeddedBid,
      totalBid: selectedPoint.totalBid,
      totalBidPercentage: selectedPoint.totalBidPercentage,
      netCredit: selectedPoint.netCredit,
      adjustedNetCredit: selectedPoint.adjustedNetCredit,
      investedCapital: selectedPoint.investedCapital,
      estimatedPremium: selectedPoint.estimatedPremium,
      estimatedOperationValue: selectedPoint.estimatedOperationValue,
      grossProfit: selectedPoint.grossProfit,
      roi: selectedPoint.roi,
      installmentSchedule,
      timeline,
      plan: {
        totalValue: totalPlanValue,
        baseInstallment,
        initialInstallment,
        installmentAtScenario: selectedPoint.installment,
        postContemplationInstallment: debt.postContemplationInstallment,
        remainingMonths: debt.remainingMonths,
        paidInstallments: input.scenarioMonth,
        paidTotal: installmentsPaidTotal,
        type: input.installmentType,
        reducedPercentage: input.reducedInstallmentPercentage
      },
      debt,
      bid: {
        ...prepared.bid,
        ownBid: selectedPoint.ownBid,
        embeddedBid: selectedPoint.embeddedBid,
        totalBid: selectedPoint.totalBid,
        totalBidPercentage: selectedPoint.totalBidPercentage
      },
      credit: {
        contracted: input.credit,
        adjusted: selectedPoint.adjustedCredit,
        net: selectedPoint.netCredit,
        adjustedNet: selectedPoint.adjustedNetCredit,
        correctionPeriods: selectedPoint.correctionPeriods
      },
      capital: {
        installments: installmentsPaidTotal,
        ownBid: selectedPoint.ownBid,
        otherOwnOutlays: input.otherOwnOutlays,
        total: selectedPoint.investedCapital
      },
      operation: {
        premiumBase: roundMoney(
          selectBase(settings.premium.base, {
            credit: input.credit,
            adjustedCredit: selectedPoint.adjustedCredit,
            netCredit: selectedPoint.netCredit,
            adjustedNetCredit: selectedPoint.adjustedNetCredit
          }),
          settings
        ),
        premiumPercentage: input.premiumPercentage,
        premium: selectedPoint.estimatedPremium,
        estimatedValue: selectedPoint.estimatedOperationValue,
        grossProfit: selectedPoint.grossProfit,
        roi: selectedPoint.roi
      }
    };
  }

  const formatters = Object.freeze({
    currency(value, options) {
      const settings = options || {};
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: settings.minimumFractionDigits ?? 2,
        maximumFractionDigits: settings.maximumFractionDigits ?? 2
      }).format(numberOrDefault(value, 0));
    },
    percentage(value, options) {
      if (value === null || !Number.isFinite(numberOrDefault(value, NaN))) return "—";
      const settings = options || {};
      return new Intl.NumberFormat("pt-BR", {
        style: "percent",
        minimumFractionDigits: settings.minimumFractionDigits ?? 0,
        maximumFractionDigits: settings.maximumFractionDigits ?? 2
      }).format(numberOrDefault(value, 0) / 100);
    },
    number(value, options) {
      return new Intl.NumberFormat("pt-BR", options || {}).format(numberOrDefault(value, 0));
    }
  });

  return Object.freeze({
    version: "1.1.0",
    BASE_OPTIONS,
    INSTALLMENT_TYPES,
    CORRECTION_TIMINGS,
    DEFAULT_INPUT,
    DEFAULT_CONFIG,
    formatters,
    parseNumeric,
    roundMoney,
    mergeConfig,
    normalizeSimulationInput,
    validateSimulationInput,
    calculatePlanTotal,
    calculateBaseInstallment,
    calculateReducedInstallment,
    calculateCorrectionPeriods,
    calculateAdjustedInstallment,
    calculateAdjustedInstallments,
    calculateInstallmentSchedule,
    sumAdjustedInstallments,
    calculateAdjustedCredit,
    calculateOwnBid,
    calculateEmbeddedBid,
    calculateTotalBid,
    calculateBidPercentage,
    calculateNetCredit,
    calculateInvestedCapital,
    calculateDebtPosition,
    calculateEstimatedPremium,
    calculateEstimatedOperationValue,
    calculateProfit,
    calculateROI,
    generateSimulationTimeline,
    calculateSimulation
  });
});
