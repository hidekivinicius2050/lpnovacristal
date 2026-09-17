(function initializeLeverageEngine(root, factory) {
  "use strict";

  let sharedEngine = null;

  if (typeof module === "object" && module.exports) {
    try {
      sharedEngine = require("./simulation-engine.js");
    } catch (_error) {
      sharedEngine = null;
    }
  } else if (root && root.CristalSimulationEngine) {
    sharedEngine = root.CristalSimulationEngine;
  }

  const engine = factory(sharedEngine);

  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  }

  if (root) {
    root.CristalLeverageEngine = engine;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createLeverageEngine(sharedEngine) {
  "use strict";

  const INSTALLMENT_TYPES = Object.freeze({
    REDUCED: "reduced",
    FULL: "full"
  });

  const LIMITING_FACTORS = Object.freeze({
    AVAILABLE_CAPITAL: "available-capital",
    MONTHLY_CAPACITY: "monthly-capacity",
    BOTH: "both",
    CONFIGURED_MAXIMUM: "configured-maximum"
  });

  const DEFAULT_INPUT = deepFreeze({
    capitalAvailable: 150000,
    monthlyCapacity: 3000,
    totalBidPercentage: 30,
    embeddedBidPercentage: 25,
    scenarioMonth: 24,
    strategyYears: 15,
    termMonths: 240,
    administrationPercentage: 22,
    reserveFundPercentage: 3.7,
    annualCorrectionPercentage: 5,
    annualAppreciationPercentage: 8,
    annualRentalYieldPercentage: 5,
    installmentType: INSTALLMENT_TYPES.REDUCED,
    reducedInstallmentPercentage: 50,
    otherOwnOutlays: 0
  });

  const DEFAULT_CONFIG = deepFreeze({
    provider: {
      id: "generic",
      label: "Premissa geral configurável"
    },
    limits: {
      minCredit: 0,
      maxCredit: 1000000000,
      maxCapitalAvailable: 1000000000,
      maxMonthlyCapacity: 100000000,
      minTermMonths: 1,
      maxTermMonths: 600,
      minStrategyYears: 1,
      maxStrategyYears: 50,
      maxAdministrationPercentage: 100,
      maxReserveFundPercentage: 100,
      maxAnnualCorrectionPercentage: 100,
      maxAnnualAppreciationPercentage: 100,
      maxAnnualRentalYieldPercentage: 100,
      maxOtherOwnOutlays: 1000000000
    },
    dimensioning: {
      creditStep: 1000,
      limitingTolerancePercentage: 0.5,
      requireGrossInstallmentWithinCapacity: true
    },
    embeddedBid: {
      maxPercentage: 30,
      base: "original-credit"
    },
    totalBid: {
      maxPercentage: 100,
      base: "original-credit"
    },
    correction: {
      intervalMonths: 12,
      timing: "next-installment"
    },
    installment: {
      roundEachPayment: true
    },
    warnings: {
      annualAppreciationPercentage: { maxCommon: 20 },
      annualRentalYieldPercentage: { maxCommon: 15 },
      annualCorrectionPercentage: { maxCommon: 15 },
      rentalCoveragePercentage: { high: 150 }
    },
    stress: {
      appreciationDeltaPoints: -2,
      rentalYieldMultiplier: 0.8,
      contemplationDelayMonths: 12,
      correctionDeltaPoints: 2
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
    const customWarnings = custom.warnings || {};

    return {
      ...DEFAULT_CONFIG,
      ...custom,
      provider: { ...DEFAULT_CONFIG.provider, ...(custom.provider || {}) },
      limits: { ...DEFAULT_CONFIG.limits, ...(custom.limits || {}) },
      dimensioning: { ...DEFAULT_CONFIG.dimensioning, ...(custom.dimensioning || {}) },
      embeddedBid: { ...DEFAULT_CONFIG.embeddedBid, ...(custom.embeddedBid || {}) },
      totalBid: { ...DEFAULT_CONFIG.totalBid, ...(custom.totalBid || {}) },
      correction: { ...DEFAULT_CONFIG.correction, ...(custom.correction || {}) },
      installment: { ...DEFAULT_CONFIG.installment, ...(custom.installment || {}) },
      stress: { ...DEFAULT_CONFIG.stress, ...(custom.stress || {}) },
      warnings: {
        ...DEFAULT_CONFIG.warnings,
        ...customWarnings,
        annualAppreciationPercentage: {
          ...DEFAULT_CONFIG.warnings.annualAppreciationPercentage,
          ...(customWarnings.annualAppreciationPercentage || {})
        },
        annualRentalYieldPercentage: {
          ...DEFAULT_CONFIG.warnings.annualRentalYieldPercentage,
          ...(customWarnings.annualRentalYieldPercentage || {})
        },
        annualCorrectionPercentage: {
          ...DEFAULT_CONFIG.warnings.annualCorrectionPercentage,
          ...(customWarnings.annualCorrectionPercentage || {})
        },
        rentalCoveragePercentage: {
          ...DEFAULT_CONFIG.warnings.rentalCoveragePercentage,
          ...(customWarnings.rentalCoveragePercentage || {})
        }
      }
    };
  }

  function fallbackParseNumeric(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    if (typeof value !== "string") return NaN;

    let normalized = value.trim();
    if (!normalized) return NaN;

    normalized = normalized.replace(/[^0-9,.-]/g, "");
    if (!/[0-9]/.test(normalized)) return NaN;
    const commaIndex = normalized.lastIndexOf(",");
    const dotIndex = normalized.lastIndexOf(".");

    if (commaIndex >= 0 && dotIndex >= 0) {
      normalized = commaIndex > dotIndex
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
    } else if (commaIndex >= 0) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
      normalized = normalized.replace(/\./g, "");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  const parseNumeric = sharedEngine && typeof sharedEngine.parseNumeric === "function"
    ? sharedEngine.parseNumeric
    : fallbackParseNumeric;

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
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function roundMoney(value, config) {
    const settings = config && Number.isInteger(config.moneyDecimals) ? config : mergeConfig(config);
    return round(value, settings.moneyDecimals);
  }

  function roundPercentage(value) {
    return round(value, 4);
  }

  function readInput(source, aliases, fallback) {
    const input = source && typeof source === "object" ? source : {};
    for (const alias of aliases) {
      if (Object.prototype.hasOwnProperty.call(input, alias)) return input[alias];
    }
    return fallback;
  }

  function normalizeLeverageInput(rawInput, config) {
    const settings = mergeConfig(config);
    const source = rawInput && typeof rawInput === "object" ? rawInput : {};
    const totalBidPercentage = roundPercentage(clamp(numberOrDefault(
      readInput(source, ["totalBidPercentage", "totalBid", "lanceTotal"], DEFAULT_INPUT.totalBidPercentage),
      DEFAULT_INPUT.totalBidPercentage
    ), 0, Math.min(100, settings.totalBid.maxPercentage)));
    const embeddedBidPercentage = roundPercentage(clamp(numberOrDefault(
      readInput(source, ["embeddedBidPercentage", "embeddedBid", "lanceEmbutido"], DEFAULT_INPUT.embeddedBidPercentage),
      DEFAULT_INPUT.embeddedBidPercentage
    ), 0, Math.min(totalBidPercentage, settings.embeddedBid.maxPercentage)));
    const termMonths = Math.round(clamp(numberOrDefault(
      readInput(source, ["termMonths", "groupTermMonths", "prazoGrupo", "prazo"], DEFAULT_INPUT.termMonths),
      DEFAULT_INPUT.termMonths
    ), settings.limits.minTermMonths, settings.limits.maxTermMonths));
    const scenarioMonth = Math.round(clamp(numberOrDefault(
      readInput(source, ["scenarioMonth", "contemplationMonth", "mesContemplacao", "mes"], DEFAULT_INPUT.scenarioMonth),
      DEFAULT_INPUT.scenarioMonth
    ), 1, termMonths));
    const installmentTypeValue = readInput(
      source,
      ["installmentType", "tipoParcela"],
      DEFAULT_INPUT.installmentType
    );

    return {
      capitalAvailable: roundMoney(clamp(numberOrDefault(
        readInput(source, ["capitalAvailable", "availableCapital", "capitalDisponivel"], DEFAULT_INPUT.capitalAvailable),
        DEFAULT_INPUT.capitalAvailable
      ), 0, settings.limits.maxCapitalAvailable), settings),
      monthlyCapacity: roundMoney(clamp(numberOrDefault(
        readInput(source, ["monthlyCapacity", "monthlyBudget", "orcamentoMensal"], DEFAULT_INPUT.monthlyCapacity),
        DEFAULT_INPUT.monthlyCapacity
      ), 0, settings.limits.maxMonthlyCapacity), settings),
      totalBidPercentage,
      embeddedBidPercentage,
      scenarioMonth,
      strategyYears: Math.round(clamp(numberOrDefault(
        readInput(source, ["strategyYears", "horizonYears", "prazoEstrategia"], DEFAULT_INPUT.strategyYears),
        DEFAULT_INPUT.strategyYears
      ), settings.limits.minStrategyYears, settings.limits.maxStrategyYears)),
      termMonths,
      administrationPercentage: roundPercentage(clamp(numberOrDefault(
        readInput(source, ["administrationPercentage", "administrationFeePercentage", "taxaAdministracao"], DEFAULT_INPUT.administrationPercentage),
        DEFAULT_INPUT.administrationPercentage
      ), 0, settings.limits.maxAdministrationPercentage)),
      reserveFundPercentage: roundPercentage(clamp(numberOrDefault(
        readInput(source, ["reserveFundPercentage", "reservePercentage", "fundoReserva"], DEFAULT_INPUT.reserveFundPercentage),
        DEFAULT_INPUT.reserveFundPercentage
      ), 0, settings.limits.maxReserveFundPercentage)),
      annualCorrectionPercentage: roundPercentage(clamp(numberOrDefault(
        readInput(source, ["annualCorrectionPercentage", "annualCorrection", "correcao"], DEFAULT_INPUT.annualCorrectionPercentage),
        DEFAULT_INPUT.annualCorrectionPercentage
      ), 0, settings.limits.maxAnnualCorrectionPercentage)),
      annualAppreciationPercentage: roundPercentage(clamp(numberOrDefault(
        readInput(source, ["annualAppreciationPercentage", "appreciationPercentage", "valorizacao"], DEFAULT_INPUT.annualAppreciationPercentage),
        DEFAULT_INPUT.annualAppreciationPercentage
      ), 0, settings.limits.maxAnnualAppreciationPercentage)),
      annualRentalYieldPercentage: roundPercentage(clamp(numberOrDefault(
        readInput(source, ["annualRentalYieldPercentage", "rentalYieldPercentage", "aluguel"], DEFAULT_INPUT.annualRentalYieldPercentage),
        DEFAULT_INPUT.annualRentalYieldPercentage
      ), 0, settings.limits.maxAnnualRentalYieldPercentage)),
      installmentType: installmentTypeValue === INSTALLMENT_TYPES.FULL
        ? INSTALLMENT_TYPES.FULL
        : INSTALLMENT_TYPES.REDUCED,
      reducedInstallmentPercentage: roundPercentage(clamp(numberOrDefault(
        readInput(source, ["reducedInstallmentPercentage", "reducedPercentage", "percentualParcelaReduzida"], DEFAULT_INPUT.reducedInstallmentPercentage),
        DEFAULT_INPUT.reducedInstallmentPercentage
      ), 0, 100)),
      otherOwnOutlays: roundMoney(clamp(numberOrDefault(
        readInput(source, ["otherOwnOutlays", "otherOutlays", "outrosDesembolsos"], DEFAULT_INPUT.otherOwnOutlays),
        DEFAULT_INPUT.otherOwnOutlays
      ), 0, settings.limits.maxOtherOwnOutlays), settings)
    };
  }

  function calculateCorrectionPeriods(month, config) {
    const settings = mergeConfig(config);
    const interval = Math.max(1, Math.round(numberOrDefault(settings.correction.intervalMonths, 12)));
    const safeMonth = Math.max(0, Math.round(numberOrDefault(month, 0)));

    if (safeMonth === 0) return 0;
    if (settings.correction.timing === "period-end") return Math.floor(safeMonth / interval);

    // A premissa padrão preserva a regra existente: a primeira correção afeta a parcela 13.
    return Math.floor((safeMonth - 1) / interval);
  }

  function calculateCorrectionFactor(month, annualCorrectionPercentage, config) {
    const percentage = Math.max(0, numberOrDefault(annualCorrectionPercentage, 0)) / 100;
    return (1 + percentage) ** calculateCorrectionPeriods(month, config);
  }

  function calculatePlanTotal(credit, input, config) {
    const settings = mergeConfig(config);
    const totalFees = input.administrationPercentage + input.reserveFundPercentage;
    return roundMoney(Math.max(0, credit) * (1 + totalFees / 100), settings);
  }

  function calculateBaseInstallment(credit, input, config) {
    const settings = mergeConfig(config);
    return roundMoney(calculatePlanTotal(credit, input, settings) / Math.max(1, input.termMonths), settings);
  }

  function calculateInitialInstallment(credit, input, config) {
    const settings = mergeConfig(config);
    const base = calculateBaseInstallment(credit, input, settings);
    if (input.installmentType === INSTALLMENT_TYPES.FULL) return base;
    return roundMoney(base * input.reducedInstallmentPercentage / 100, settings);
  }

  function calculateAdjustedInstallment(initialInstallment, month, annualCorrectionPercentage, config) {
    const settings = mergeConfig(config);
    const adjusted = Math.max(0, initialInstallment)
      * calculateCorrectionFactor(month, annualCorrectionPercentage, settings);
    return settings.installment.roundEachPayment ? roundMoney(adjusted, settings) : adjusted;
  }

  function calculateInstallmentSchedule(initialInstallment, months, annualCorrectionPercentage, config) {
    const settings = mergeConfig(config);
    const count = Math.max(0, Math.round(numberOrDefault(months, 0)));
    const schedule = [];
    let cumulative = 0;

    for (let month = 1; month <= count; month += 1) {
      const amount = calculateAdjustedInstallment(
        initialInstallment,
        month,
        annualCorrectionPercentage,
        settings
      );
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
    const embedded = roundMoney(requestedEmbedded * scale, settings);
    const own = roundMoney(Math.max(0, appliedTotal - embedded), settings);
    const total = roundMoney(own + embedded, settings);

    return {
      requestedOwn: roundMoney(requestedOwn, settings),
      requestedEmbedded: roundMoney(requestedEmbedded, settings),
      requestedTotal: roundMoney(requestedTotal, settings),
      own,
      embedded,
      total,
      wasLimited: requestedTotal - total > 0.01
    };
  }

  function projectPostContemplationPayments(balanceAfterBid, input, fromMonth, toMonth, config) {
    const settings = mergeConfig(config);
    let outstanding = Math.max(0, numberOrDefault(balanceAfterBid, 0));
    let currentInstallment = 0;
    let firstInstallment = 0;
    let peakInstallment = 0;
    const start = Math.max(0, Math.round(fromMonth));
    const end = Math.max(start, Math.round(toMonth));

    // Se a contemplação coincide com o fim do grupo, qualquer saldo residual
    // precisa ser tratado como obrigação final, nunca como parcela zero.
    if (outstanding > 0 && start >= input.termMonths) {
      return {
        outstanding,
        firstInstallment: outstanding,
        peakInstallment: outstanding,
        isBalloonPayment: true
      };
    }

    for (let month = start + 1; month <= end && outstanding > 0; month += 1) {
      if (month > input.termMonths) {
        outstanding = 0;
        break;
      }

      const previousPeriods = calculateCorrectionPeriods(month - 1, settings);
      const currentPeriods = calculateCorrectionPeriods(month, settings);
      if (currentPeriods > previousPeriods) {
        outstanding *= (1 + input.annualCorrectionPercentage / 100)
          ** (currentPeriods - previousPeriods);
        currentInstallment = 0;
      }

      const remainingAtStart = Math.max(1, input.termMonths - month + 1);
      if (currentInstallment === 0) currentInstallment = outstanding / remainingAtStart;
      const payment = Math.min(outstanding, currentInstallment);
      if (firstInstallment === 0) firstInstallment = payment;
      peakInstallment = Math.max(peakInstallment, payment);
      outstanding = Math.max(0, outstanding - payment);
    }

    return {
      outstanding,
      firstInstallment,
      peakInstallment,
      isBalloonPayment: false
    };
  }

  function calculateCapacityCoefficients(rawInput, config) {
    const settings = mergeConfig(config);
    const input = normalizeLeverageInput(rawInput, settings);
    const combinedFeesRate = (input.administrationPercentage + input.reserveFundPercentage) / 100;
    const fullInstallmentPerCredit = (1 + combinedFeesRate) / input.termMonths;
    const initialInstallmentPerCredit = input.installmentType === INSTALLMENT_TYPES.REDUCED
      ? fullInstallmentPerCredit * input.reducedInstallmentPercentage / 100
      : fullInstallmentPerCredit;
    let paidInstallmentsPerCredit = 0;

    for (let month = 1; month <= input.scenarioMonth; month += 1) {
      paidInstallmentsPerCredit += initialInstallmentPerCredit
        * calculateCorrectionFactor(month, input.annualCorrectionPercentage, settings);
    }

    const installmentAtContemplationPerCredit = initialInstallmentPerCredit
      * calculateCorrectionFactor(input.scenarioMonth, input.annualCorrectionPercentage, settings);
    const adjustedCreditPerCredit = calculateCorrectionFactor(
      input.scenarioMonth,
      input.annualCorrectionPercentage,
      settings
    );
    const requestedOwnBidRate = Math.max(0, input.totalBidPercentage - input.embeddedBidPercentage) / 100;
    const requestedEmbeddedBidRate = input.embeddedBidPercentage / 100;
    const requestedTotalBidRate = input.totalBidPercentage / 100;
    const adjustedPlanPerCredit = adjustedCreditPerCredit * (1 + combinedFeesRate);
    const balanceBeforeBidPerCredit = Math.max(0, adjustedPlanPerCredit - paidInstallmentsPerCredit);
    const allocatedBidRates = allocateAppliedBid(
      requestedOwnBidRate,
      requestedEmbeddedBidRate,
      balanceBeforeBidPerCredit,
      { ...settings, moneyDecimals: 12 }
    );
    const embeddedBidRate = allocatedBidRates.embedded;
    const ownBidRate = allocatedBidRates.own;
    const totalBidRate = allocatedBidRates.total;
    const balanceAfterBidPerCredit = Math.max(0, balanceBeforeBidPerCredit - totalBidRate);
    const remainingMonths = Math.max(0, input.termMonths - input.scenarioMonth);
    const postProjection = projectPostContemplationPayments(
      balanceAfterBidPerCredit,
      input,
      input.scenarioMonth,
      input.termMonths,
      settings
    );
    const postContemplationInstallmentPerCredit = postProjection.firstInstallment;
    const peakPostContemplationInstallmentPerCredit = postProjection.peakInstallment;

    return {
      combinedFeesRate,
      fullInstallmentPerCredit,
      initialInstallmentPerCredit,
      paidInstallmentsPerCredit,
      installmentAtContemplationPerCredit,
      adjustedCreditPerCredit,
      ownBidRate,
      embeddedBidRate,
      totalBidRate,
      balanceBeforeBidPerCredit,
      balanceAfterBidPerCredit,
      postContemplationInstallmentPerCredit,
      peakPostContemplationInstallmentPerCredit,
      monthlyRequirementPerCredit: Math.max(
        initialInstallmentPerCredit,
        installmentAtContemplationPerCredit,
        settings.dimensioning.requireGrossInstallmentWithinCapacity
          ? peakPostContemplationInstallmentPerCredit
          : postContemplationInstallmentPerCredit
      ),
      remainingMonths
    };
  }

  function calculateCreditCapacity(rawInput, config) {
    const settings = mergeConfig(config);
    const input = normalizeLeverageInput(rawInput, settings);
    const coefficients = calculateCapacityCoefficients(input, settings);
    const fixedCapitalShortfall = input.otherOwnOutlays > input.capitalAvailable;
    const capitalForBid = Math.max(0, input.capitalAvailable - input.otherOwnOutlays);
    const capitalIsBinding = coefficients.ownBidRate > 0;
    const rawCreditByCapital = fixedCapitalShortfall
      ? 0
      : (capitalIsBinding
        ? capitalForBid / coefficients.ownBidRate
        : settings.limits.maxCredit);
    const rawCreditByMonthly = coefficients.monthlyRequirementPerCredit > 0
      ? input.monthlyCapacity / coefficients.monthlyRequirementPerCredit
      : settings.limits.maxCredit;
    const rawEstimatedCredit = Math.max(0, Math.min(
      rawCreditByCapital,
      rawCreditByMonthly,
      settings.limits.maxCredit
    ));
    const creditStep = Math.max(0.01, settings.dimensioning.creditStep);
    const minimumCredit = Math.min(
      Math.max(0, settings.limits.minCredit),
      settings.limits.maxCredit
    );
    const monetaryTolerance = 0.5 * 10 ** (-settings.moneyDecimals);
    let lowStep = 0;
    let highStep = rawEstimatedCredit + monetaryTolerance >= minimumCredit
      ? Math.max(0, Math.floor((rawEstimatedCredit - minimumCredit) / creditStep))
      : -1;
    let estimatedCredit = 0;

    // Revalida o valor discretizado com o motor completo para absorver
    // arredondamentos monetários sem ultrapassar capital ou orçamento.
    while (lowStep <= highStep) {
      const middleStep = Math.floor((lowStep + highStep) / 2);
      const candidateCredit = roundMoney(minimumCredit + middleStep * creditStep, settings);
      const candidate = calculateFixedCreditScenario(candidateCredit, input, settings, false);
      const monthlyRequirement = settings.dimensioning.requireGrossInstallmentWithinCapacity
        ? candidate.effort.peakGrossRequirement
        : Math.max(candidate.installments.atContemplation, candidate.installments.afterContemplation);
      const fitsMonthly = monthlyRequirement <= input.monthlyCapacity + monetaryTolerance;
      const fitsCapital = candidate.capital.ownBid + input.otherOwnOutlays
        <= input.capitalAvailable + monetaryTolerance;

      if (fitsMonthly && fitsCapital) {
        estimatedCredit = candidateCredit;
        lowStep = middleStep + 1;
      } else {
        highStep = middleStep - 1;
      }
    }
    const tolerance = Math.max(0, settings.dimensioning.limitingTolerancePercentage) / 100;
    const comparisonBase = Math.max(1, Math.min(rawCreditByCapital, rawCreditByMonthly));
    const constraintsAreEquivalent = Math.abs(rawCreditByCapital - rawCreditByMonthly)
      <= comparisonBase * tolerance;
    let limitingFactor;
    let limitingMessage;

    if (settings.limits.maxCredit <= Math.min(rawCreditByCapital, rawCreditByMonthly)) {
      limitingFactor = LIMITING_FACTORS.CONFIGURED_MAXIMUM;
      limitingMessage = "Neste cenário, o crédito atingiu o limite máximo configurado para a simulação.";
    } else if (constraintsAreEquivalent) {
      limitingFactor = LIMITING_FACTORS.BOTH;
      limitingMessage = "Neste cenário, o capital para o lance e a capacidade mensal limitam o crédito em proporções semelhantes.";
    } else if (rawCreditByCapital < rawCreditByMonthly) {
      limitingFactor = LIMITING_FACTORS.AVAILABLE_CAPITAL;
      limitingMessage = fixedCapitalShortfall
        ? "Neste cenário, os outros desembolsos informados superam o capital disponível."
        : "Neste cenário, o principal limitador é o capital disponível para a composição do lance.";
    } else {
      limitingFactor = LIMITING_FACTORS.MONTHLY_CAPACITY;
      limitingMessage = "Neste cenário, o limite está sendo determinado pela capacidade mensal informada.";
    }

    return {
      estimatedCredit,
      unroundedEstimatedCredit: roundMoney(rawEstimatedCredit, settings),
      limitingFactor,
      limitingMessage,
      creditByCapital: fixedCapitalShortfall
        ? 0
        : (capitalIsBinding ? roundMoney(rawCreditByCapital, settings) : null),
      creditByMonthly: roundMoney(rawCreditByMonthly, settings),
      availableCapitalForBid: roundMoney(capitalForBid, settings),
      coefficients
    };
  }

  function calculateProjectedDebt(balanceAfterBid, input, fromMonth, toMonth, config) {
    const settings = mergeConfig(config);
    return roundMoney(projectPostContemplationPayments(
      balanceAfterBid,
      input,
      fromMonth,
      toMonth,
      settings
    ).outstanding, settings);
  }

  function calculateFixedCreditScenario(creditValue, rawInput, config, includeTimeline) {
    const settings = mergeConfig(config);
    const input = normalizeLeverageInput(rawInput, settings);
    const requestedCredit = numberOrDefault(creditValue, 0);
    const credit = requestedCredit <= 0
      ? 0
      : roundMoney(clamp(
        requestedCredit,
        settings.limits.minCredit,
        settings.limits.maxCredit
      ), settings);
    const combinedFeesPercentage = roundPercentage(
      input.administrationPercentage + input.reserveFundPercentage
    );
    const totalPlanValue = calculatePlanTotal(credit, input, settings);
    const baseInstallment = calculateBaseInstallment(credit, input, settings);
    const initialInstallment = calculateInitialInstallment(credit, input, settings);
    const installmentSchedule = calculateInstallmentSchedule(
      initialInstallment,
      input.scenarioMonth,
      input.annualCorrectionPercentage,
      settings
    );
    const paidInstallmentsTotal = installmentSchedule.length
      ? installmentSchedule[installmentSchedule.length - 1].cumulative
      : 0;
    const installmentAtContemplation = installmentSchedule.length
      ? installmentSchedule[installmentSchedule.length - 1].amount
      : initialInstallment;
    const correctionPeriods = calculateCorrectionPeriods(input.scenarioMonth, settings);
    const adjustedCredit = roundMoney(
      credit * calculateCorrectionFactor(input.scenarioMonth, input.annualCorrectionPercentage, settings),
      settings
    );
    const requestedEmbeddedBid = roundMoney(credit * input.embeddedBidPercentage / 100, settings);
    const ownBidPercentage = roundPercentage(
      Math.max(0, input.totalBidPercentage - input.embeddedBidPercentage)
    );
    const requestedOwnBid = roundMoney(credit * ownBidPercentage / 100, settings);
    const requestedTotalBid = roundMoney(requestedOwnBid + requestedEmbeddedBid, settings);
    const adjustedPlanValue = roundMoney(
      adjustedCredit * (1 + combinedFeesPercentage / 100),
      settings
    );
    const balanceBeforeBid = roundMoney(Math.max(0, adjustedPlanValue - paidInstallmentsTotal), settings);
    const allocatedBid = allocateAppliedBid(
      requestedOwnBid,
      requestedEmbeddedBid,
      balanceBeforeBid,
      settings
    );
    const embeddedBid = allocatedBid.embedded;
    const ownBid = allocatedBid.own;
    const totalBid = allocatedBid.total;
    const bidApplied = totalBid;
    const originalNetCredit = roundMoney(Math.max(0, credit - embeddedBid), settings);
    const adjustedNetCredit = roundMoney(Math.max(0, adjustedCredit - embeddedBid), settings);
    const balanceAfterBid = roundMoney(Math.max(0, balanceBeforeBid - totalBid), settings);
    const remainingMonths = Math.max(0, input.termMonths - input.scenarioMonth);
    const postProjection = projectPostContemplationPayments(
      balanceAfterBid,
      input,
      input.scenarioMonth,
      input.termMonths,
      settings
    );
    const postContemplationInstallment = roundMoney(postProjection.firstInstallment, settings);
    const peakPostContemplationInstallment = roundMoney(postProjection.peakInstallment, settings);

    const investedCapital = roundMoney(
      paidInstallmentsTotal + ownBid + input.otherOwnOutlays,
      settings
    );
    const monthlyRentAtContemplation = roundMoney(
      adjustedNetCredit * input.annualRentalYieldPercentage / 100 / 12,
      settings
    );
    const rentalCoveragePercentage = postContemplationInstallment > 0
      ? roundPercentage(monthlyRentAtContemplation / postContemplationInstallment * 100)
      : (monthlyRentAtContemplation > 0 ? 100 : 0);
    const monthlyComplement = roundMoney(Math.max(
      0,
      postContemplationInstallment - monthlyRentAtContemplation
    ), settings);
    const monthlySurplus = roundMoney(Math.max(
      0,
      monthlyRentAtContemplation - postContemplationInstallment
    ), settings);
    const monthlyCapacityUsagePercentage = input.monthlyCapacity > 0
      ? roundPercentage(monthlyComplement / input.monthlyCapacity * 100)
      : (monthlyComplement > 0 ? null : 0);
    const horizonMonth = input.strategyYears * 12;
    const elapsedAssetMonths = Math.max(0, horizonMonth - input.scenarioMonth);
    const assetValueAtHorizon = horizonMonth >= input.scenarioMonth
      ? roundMoney(
        adjustedNetCredit
          * (1 + input.annualAppreciationPercentage / 100) ** (elapsedAssetMonths / 12),
        settings
      )
      : 0;
    const outstandingDebtAtHorizon = horizonMonth >= input.scenarioMonth
      ? calculateProjectedDebt(
        balanceAfterBid,
        input,
        input.scenarioMonth,
        horizonMonth,
        settings
      )
      : roundMoney(Math.max(
        0,
        credit
          * calculateCorrectionFactor(Math.max(1, horizonMonth), input.annualCorrectionPercentage, settings)
          * (1 + combinedFeesPercentage / 100)
          - (installmentSchedule[Math.max(0, horizonMonth - 1)]?.cumulative || 0)
      ), settings);
    const projectedNetWorth = roundMoney(
      assetValueAtHorizon - outstandingDebtAtHorizon,
      settings
    );
    const cashPurchaseValue = roundMoney(
      input.capitalAvailable
        * (1 + input.annualAppreciationPercentage / 100) ** input.strategyYears,
      settings
    );
    const monthlyRentAtHorizon = assetValueAtHorizon > 0
      ? roundMoney(assetValueAtHorizon * input.annualRentalYieldPercentage / 100 / 12, settings)
      : 0;
    const warnings = buildWarnings({
      input,
      ownBid,
      installmentAtContemplation,
      postContemplationInstallment,
      peakPostContemplationInstallment,
      isBalloonPayment: postProjection.isBalloonPayment,
      bidWasLimited: allocatedBid.wasLimited,
      rentalCoveragePercentage,
      horizonMonth
    }, settings);
    const result = {
      input,
      config: settings,
      warnings,
      alerts: warnings,
      assumptions: buildAssumptions(settings),
      generatedAt: new Date().toISOString(),
      estimatedCredit: credit,
      credit: {
        contracted: credit,
        original: credit,
        adjustedAtContemplation: adjustedCredit,
        correctionPeriods,
        originalNet: originalNetCredit,
        netAtContemplation: adjustedNetCredit
      },
      fees: {
        administrationPercentage: input.administrationPercentage,
        reserveFundPercentage: input.reserveFundPercentage,
        combinedPercentage: combinedFeesPercentage,
        totalPlanValue,
        adjustedPlanValue
      },
      bid: {
        totalPercentage: credit > 0 ? roundPercentage(totalBid / credit * 100) : 0,
        ownPercentage: credit > 0 ? roundPercentage(ownBid / credit * 100) : 0,
        embeddedPercentage: credit > 0 ? roundPercentage(embeddedBid / credit * 100) : 0,
        requestedTotalPercentage: input.totalBidPercentage,
        requestedOwnPercentage: ownBidPercentage,
        requestedEmbeddedPercentage: input.embeddedBidPercentage,
        total: totalBid,
        own: ownBid,
        embedded: embeddedBid,
        requestedTotal: requestedTotalBid,
        requestedOwn: requestedOwnBid,
        requestedEmbedded: requestedEmbeddedBid,
        wasLimitedByBalance: allocatedBid.wasLimited
      },
      installments: {
        base: baseInstallment,
        initial: initialInstallment,
        atContemplation: installmentAtContemplation,
        beforeContemplation: installmentAtContemplation,
        afterContemplation: postContemplationInstallment,
        peakAfterContemplation: peakPostContemplationInstallment,
        isBalloonPayment: postProjection.isBalloonPayment,
        paidCount: input.scenarioMonth,
        paidTotal: paidInstallmentsTotal,
        remainingMonths,
        schedule: installmentSchedule
      },
      balance: {
        beforeBid: balanceBeforeBid,
        bidApplied,
        afterBid: balanceAfterBid,
        atHorizon: outstandingDebtAtHorizon
      },
      capital: {
        available: input.capitalAvailable,
        installmentsPaid: paidInstallmentsTotal,
        ownBid,
        embeddedBidExcluded: embeddedBid,
        otherOwnOutlays: input.otherOwnOutlays,
        investedTotal: investedCapital
      },
      rental: {
        annualYieldPercentage: input.annualRentalYieldPercentage,
        monthlyAtContemplation: monthlyRentAtContemplation,
        monthlyAtHorizon: monthlyRentAtHorizon,
        coveragePercentage: rentalCoveragePercentage,
        monthlyComplement,
        monthlySurplus
      },
      effort: {
        monthlyCapacity: input.monthlyCapacity,
        grossRequirementBeforeContemplation: installmentAtContemplation,
        grossRequirementAfterContemplation: postContemplationInstallment,
        peakGrossRequirement: Math.max(
          installmentAtContemplation,
          peakPostContemplationInstallment
        ),
        netMonthlyNeed: monthlyComplement,
        usagePercentage: monthlyCapacityUsagePercentage
      },
      patrimony: {
        strategyYears: input.strategyYears,
        horizonMonth,
        assetValue: assetValueAtHorizon,
        outstandingDebt: outstandingDebtAtHorizon,
        netWorth: projectedNetWorth,
        cashPurchaseValue,
        leveragedMinusCashPurchase: roundMoney(projectedNetWorth - cashPurchaseValue, settings)
      }
    };

    if (includeTimeline !== false) {
      result.timeline = generateLeverageTimelineFromScenario(result, settings);
    }

    result.breakdown = buildCalculationBreakdown(result, settings);
    return result;
  }

  function generateLeverageTimelineFromScenario(result, config) {
    const settings = mergeConfig(config);
    const { input } = result;
    const horizonMonth = input.strategyYears * 12;
    const monthly = [];
    const preSchedule = result.installments.schedule;
    let outstanding = result.balance.afterBid;
    let activePostInstallment = 0;
    let rentCollectedInCurrentYear = 0;

    for (let month = 0; month <= horizonMonth; month += 1) {
      let debt;
      let assetValue = 0;
      let netWorth = 0;
      let monthlyRent = 0;
      let payment = 0;

      if (month < input.scenarioMonth) {
        const cumulative = month > 0 ? (preSchedule[month - 1]?.cumulative || 0) : 0;
        const correctedPlan = result.credit.original
          * calculateCorrectionFactor(Math.max(1, month), input.annualCorrectionPercentage, settings)
          * (1 + result.fees.combinedPercentage / 100);
        debt = Math.max(0, correctedPlan - cumulative);
        payment = month > 0 ? (preSchedule[month - 1]?.amount || 0) : 0;
        netWorth = -debt;
      } else {
        if (month === input.scenarioMonth) {
          payment = month > 0 ? (preSchedule[month - 1]?.amount || 0) : 0;
        } else if (month > input.scenarioMonth && outstanding > 0) {
          if (month > input.termMonths) {
            if (!result.installments.isBalloonPayment) outstanding = 0;
          } else {
            const previousPeriods = calculateCorrectionPeriods(month - 1, settings);
            const currentPeriods = calculateCorrectionPeriods(month, settings);
            if (currentPeriods > previousPeriods) {
              outstanding *= (1 + input.annualCorrectionPercentage / 100)
                ** (currentPeriods - previousPeriods);
              activePostInstallment = 0;
            }

            const remainingAtStart = Math.max(1, input.termMonths - month + 1);
            if (activePostInstallment === 0) activePostInstallment = outstanding / remainingAtStart;
            payment = Math.min(outstanding, activePostInstallment);
            outstanding = Math.max(0, outstanding - payment);
          }
        }

        debt = outstanding;
        const elapsedAssetMonths = month - input.scenarioMonth;
        assetValue = result.credit.netAtContemplation
          * (1 + input.annualAppreciationPercentage / 100) ** (elapsedAssetMonths / 12);
        netWorth = assetValue - debt;
        monthlyRent = assetValue * input.annualRentalYieldPercentage / 100 / 12;
      }

      if (month > 0 && (month - 1) % 12 === 0) rentCollectedInCurrentYear = 0;
      rentCollectedInCurrentYear += monthlyRent;

      monthly.push({
        month,
        year: round(month / 12, 4),
        isContemplation: month === input.scenarioMonth,
        assetValue: roundMoney(assetValue, settings),
        outstandingDebt: roundMoney(debt, settings),
        netWorth: roundMoney(netWorth, settings),
        cashPurchaseValue: roundMoney(
          input.capitalAvailable
            * (1 + input.annualAppreciationPercentage / 100) ** (month / 12),
          settings
        ),
        installment: roundMoney(payment, settings),
        monthlyRentEstimate: roundMoney(monthlyRent, settings),
        annualRentEstimate: roundMoney(monthlyRent * 12, settings),
        rentalIncomeInCurrentYear: roundMoney(rentCollectedInCurrentYear, settings)
      });
    }

    const annual = monthly.filter((entry) => entry.month % 12 === 0 || entry.month === horizonMonth)
      .map((entry) => ({ ...entry, year: Math.round(entry.month / 12) }));

    return {
      contemplationMonth: input.scenarioMonth,
      monthly,
      annual
    };
  }

  function generateLeverageTimeline(credit, rawInput, config) {
    return calculateFixedCreditScenario(credit, rawInput, config, true).timeline;
  }

  function buildWarnings(values, config) {
    const settings = mergeConfig(config);
    const { input } = values;
    const warnings = [];

    if (values.ownBid + input.otherOwnOutlays > input.capitalAvailable) {
      warnings.push("O recurso próprio necessário para o lance e desembolsos informados supera o capital disponível.");
    }
    if (Math.max(values.installmentAtContemplation, values.peakPostContemplationInstallment) > input.monthlyCapacity) {
      warnings.push("Neste cenário, a parcela estimada ultrapassa a capacidade mensal informada.");
    }
    if (values.isBalloonPayment) {
      warnings.push("A contemplação considerada coincide com o fim do grupo; o saldo residual foi tratado como obrigação final única.");
    }
    if (values.bidWasLimited) {
      warnings.push("O lance informado supera o saldo devedor estimado e foi limitado ao valor matematicamente aplicável.");
    }
    if (input.annualAppreciationPercentage
      > settings.warnings.annualAppreciationPercentage.maxCommon) {
      warnings.push("A valorização anual está significativamente acima da faixa comum configurada. Revise a premissa.");
    }
    if (input.annualRentalYieldPercentage
      > settings.warnings.annualRentalYieldPercentage.maxCommon) {
      warnings.push("O rendimento anual de aluguel está significativamente acima da faixa comum configurada. Revise a premissa.");
    }
    if (input.annualCorrectionPercentage
      > settings.warnings.annualCorrectionPercentage.maxCommon) {
      warnings.push("A correção anual está significativamente acima da faixa comum configurada. Revise a premissa.");
    }
    if (values.rentalCoveragePercentage > settings.warnings.rentalCoveragePercentage.high) {
      warnings.push("A cobertura estimada pelo aluguel é elevada e depende integralmente das premissas informadas.");
    }
    if (values.horizonMonth < input.scenarioMonth) {
      warnings.push("O prazo da estratégia termina antes do cenário de contemplação informado; por isso não há patrimônio imobiliário projetado no horizonte.");
    }

    return warnings;
  }

  function buildAssumptions(config) {
    const settings = mergeConfig(config);
    return [
      `A primeira correção afeta a parcela ${settings.correction.intervalMonths + 1}, após ${settings.correction.intervalMonths} parcelas completas.`,
      "O dimensionamento pelo capital considera o lance próprio e outros desembolsos fixos; as parcelas são verificadas pela capacidade mensal.",
      "O crédito estimado respeita simultaneamente a restrição de capital e o maior pagamento bruto projetado durante todo o prazo do grupo.",
      "O lance embutido reduz o crédito disponível e não integra o capital próprio desembolsado.",
      "O saldo genérico é o valor atualizado do plano menos parcelas pagas e, depois, menos o lance aplicado; regras específicas da administradora podem alterar essa dinâmica.",
      "Após a contemplação, o saldo é corrigido nas viradas anuais e redistribuído pelo prazo remanescente; eventual saldo no último mês é tratado como obrigação final.",
      "O bem é considerado adquirido pelo crédito líquido atualizado no cenário de contemplação; aluguel e valorização começam somente a partir desse marco.",
      "O patrimônio líquido é o valor projetado do bem menos o saldo devedor, sem acumular aluguéis recebidos.",
      "A comparação à vista aplica a mesma valorização ao capital disponível e não inclui aluguel, impostos, manutenção ou custos de transação."
    ];
  }

  function buildCalculationBreakdown(result, config) {
    const settings = mergeConfig(config);
    const money = (value) => roundMoney(value, settings);

    return [
      { step: 1, key: "credit", label: "Carta", formula: "Crédito estimado pelos limites de capital e parcela", result: result.credit.original },
      { step: 2, key: "administration", label: "Taxa", formula: `${result.credit.original} × ${result.fees.administrationPercentage}%`, result: money(result.credit.original * result.fees.administrationPercentage / 100) },
      { step: 3, key: "reserve", label: "Fundo", formula: `${result.credit.original} × ${result.fees.reserveFundPercentage}%`, result: money(result.credit.original * result.fees.reserveFundPercentage / 100) },
      { step: 4, key: "initial-installment", label: "Parcela inicial", formula: "Valor do plano ÷ prazo × percentual da parcela", result: result.installments.initial },
      { step: 5, key: "corrections", label: "Correções", formula: `${result.credit.correctionPeriods} período(s) de ${result.input.annualCorrectionPercentage}% ao ano`, result: result.credit.adjustedAtContemplation },
      { step: 6, key: "paid-total", label: "Total pago", formula: "Soma individual das parcelas corrigidas até o cenário", result: result.installments.paidTotal },
      { step: 7, key: "adjusted-credit", label: "Crédito atualizado", formula: "Crédito original com correções aplicadas", result: result.credit.adjustedAtContemplation },
      { step: 8, key: "balance-before", label: "Saldo devedor", formula: "Plano atualizado − parcelas pagas", result: result.balance.beforeBid },
      { step: 9, key: "total-bid", label: "Lance", formula: `${result.bid.totalPercentage}% do crédito original`, result: result.bid.total },
      { step: 10, key: "own-bid", label: "Lance próprio", formula: `${result.bid.ownPercentage}% do crédito original`, result: result.bid.own },
      { step: 11, key: "embedded-bid", label: "Lance embutido", formula: `${result.bid.embeddedPercentage}% do crédito original`, result: result.bid.embedded },
      { step: 12, key: "net-credit", label: "Crédito líquido", formula: `${result.credit.adjustedAtContemplation} − ${result.bid.embedded}`, result: result.credit.netAtContemplation },
      { step: 13, key: "post-installment", label: "Parcela pós-contemplação", formula: "Saldo após o lance ÷ meses restantes, com a correção da próxima parcela quando aplicável", result: result.installments.afterContemplation },
      { step: 14, key: "rent", label: "Aluguel", formula: `Crédito líquido × ${result.rental.annualYieldPercentage}% ÷ 12`, result: result.rental.monthlyAtContemplation },
      { step: 15, key: "monthly-need", label: "Saldo mensal necessário", formula: "Parcela pós-contemplação − aluguel, limitado a zero", result: result.effort.netMonthlyNeed },
      { step: 16, key: "net-worth", label: "Patrimônio projetado", formula: "Valor estimado do bem − saldo devedor no horizonte", result: result.patrimony.netWorth }
    ];
  }

  function summarizeScenario(result) {
    return {
      estimatedCredit: result.estimatedCredit,
      postContemplationInstallment: result.installments.afterContemplation,
      monthlyRent: result.rental.monthlyAtContemplation,
      rentalCoveragePercentage: result.rental.coveragePercentage,
      monthlyNetNeed: result.effort.netMonthlyNeed,
      projectedNetWorth: result.patrimony.netWorth,
      outstandingDebt: result.patrimony.outstandingDebt
    };
  }

  function buildStressInput(input, config, variation) {
    const settings = mergeConfig(config);
    const changes = {
      ...settings.stress,
      ...(variation || {})
    };

    return {
      ...input,
      annualAppreciationPercentage: Math.max(
        0,
        input.annualAppreciationPercentage + changes.appreciationDeltaPoints
      ),
      annualRentalYieldPercentage: Math.max(
        0,
        input.annualRentalYieldPercentage * changes.rentalYieldMultiplier
      ),
      scenarioMonth: Math.min(
        input.termMonths,
        input.scenarioMonth + changes.contemplationDelayMonths
      ),
      annualCorrectionPercentage: Math.max(
        0,
        input.annualCorrectionPercentage + changes.correctionDeltaPoints
      )
    };
  }

  function buildStressScenario(baseResult, config, variation) {
    const settings = mergeConfig(config);
    const variedInput = buildStressInput(baseResult.input, settings, variation);
    // O teste altera as premissas do mesmo crédito, isolando a sensibilidade
    // sem redimensionar silenciosamente o cenário comparado.
    const variedResult = calculateFixedCreditScenario(
      baseResult.estimatedCredit,
      variedInput,
      settings,
      false
    );
    const current = summarizeScenario(baseResult);
    const varied = summarizeScenario(variedResult);

    return {
      label: "Variação simulada",
      input: variedInput,
      current,
      variation: varied,
      impact: {
        estimatedCredit: roundMoney(varied.estimatedCredit - current.estimatedCredit, settings),
        postContemplationInstallment: roundMoney(
          varied.postContemplationInstallment - current.postContemplationInstallment,
          settings
        ),
        monthlyNetNeed: roundMoney(varied.monthlyNetNeed - current.monthlyNetNeed, settings),
        projectedNetWorth: roundMoney(varied.projectedNetWorth - current.projectedNetWorth, settings),
        rentalCoveragePercentage: roundPercentage(
          varied.rentalCoveragePercentage - current.rentalCoveragePercentage
        )
      }
    };
  }

  function calculateStressScenario(rawInput, config, variation) {
    const settings = mergeConfig(config);
    const baseResult = calculateLeverageCore(rawInput, settings, false);
    return buildStressScenario(baseResult, settings, variation);
  }

  function buildSensitivity(baseResult, config) {
    const settings = mergeConfig(config);
    const variants = [
      {
        key: "contemplation-delay",
        label: "+12 meses até a contemplação",
        input: { ...baseResult.input, scenarioMonth: Math.min(baseResult.input.termMonths, baseResult.input.scenarioMonth + 12) }
      },
      {
        key: "appreciation-minus-one",
        label: "−1 ponto percentual de valorização anual",
        input: { ...baseResult.input, annualAppreciationPercentage: Math.max(0, baseResult.input.annualAppreciationPercentage - 1) }
      },
      {
        key: "correction-plus-one",
        label: "+1 ponto percentual de correção anual",
        input: { ...baseResult.input, annualCorrectionPercentage: baseResult.input.annualCorrectionPercentage + 1 }
      }
    ];

    return variants.map((variant) => {
      const result = calculateFixedCreditScenario(
        baseResult.estimatedCredit,
        variant.input,
        settings,
        false
      );
      return {
        key: variant.key,
        label: variant.label,
        projectedNetWorthImpact: roundMoney(
          result.patrimony.netWorth - baseResult.patrimony.netWorth,
          settings
        ),
        monthlyNetNeedImpact: roundMoney(
          result.effort.netMonthlyNeed - baseResult.effort.netMonthlyNeed,
          settings
        ),
        estimatedCreditImpact: roundMoney(
          result.estimatedCredit - baseResult.estimatedCredit,
          settings
        )
      };
    }).sort((first, second) => (
      Math.abs(second.projectedNetWorthImpact) - Math.abs(first.projectedNetWorthImpact)
    ));
  }

  function calculateSensitivity(rawInput, config) {
    const settings = mergeConfig(config);
    const baseResult = calculateLeverageCore(rawInput, settings, false);
    return buildSensitivity(baseResult, settings);
  }

  function calculateLeverageCore(rawInput, config, includeTimeline) {
    const settings = mergeConfig(config);
    const input = normalizeLeverageInput(rawInput, settings);
    const capacity = calculateCreditCapacity(input, settings);
    const result = calculateFixedCreditScenario(
      capacity.estimatedCredit,
      input,
      settings,
      includeTimeline
    );

    return {
      ...result,
      capacity: {
        estimatedCredit: capacity.estimatedCredit,
        unroundedEstimatedCredit: capacity.unroundedEstimatedCredit,
        limitingFactor: capacity.limitingFactor,
        limitingMessage: capacity.limitingMessage,
        creditByCapital: capacity.creditByCapital,
        creditByMonthly: capacity.creditByMonthly,
        availableCapitalForBid: capacity.availableCapitalForBid,
        capitalRequiredForBid: roundMoney(
          result.bid.own + input.otherOwnOutlays,
          settings
        ),
        monthlyRequirement: roundMoney(Math.max(
          result.installments.atContemplation,
          result.installments.peakAfterContemplation
        ), settings)
      }
    };
  }

  function calculateLeverageScenario(rawInput, config) {
    const settings = mergeConfig(config);
    const baseResult = calculateLeverageCore(rawInput, settings, true);

    return {
      ...baseResult,
      stressTest: buildStressScenario(baseResult, settings),
      sensitivity: buildSensitivity(baseResult, settings)
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
    }
  });

  return Object.freeze({
    version: "1.0.0",
    INSTALLMENT_TYPES,
    LIMITING_FACTORS,
    DEFAULT_INPUT,
    DEFAULT_CONFIG,
    simulationConfig: DEFAULT_CONFIG,
    formatters,
    parseNumeric,
    mergeConfig,
    roundMoney,
    normalizeLeverageInput,
    calculateCorrectionPeriods,
    calculateCorrectionFactor,
    calculatePlanTotal,
    calculateBaseInstallment,
    calculateInitialInstallment,
    calculateAdjustedInstallment,
    calculateInstallmentSchedule,
    calculateCapacityCoefficients,
    calculateCreditCapacity,
    calculateProjectedDebt,
    calculateFixedCreditScenario,
    generateLeverageTimeline,
    calculateStressScenario,
    calculateSensitivity,
    calculateLeverageScenario,
    calculateLeverageSimulation: calculateLeverageScenario
  });
});
