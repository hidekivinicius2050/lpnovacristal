"use strict";

const assert = require("node:assert/strict");
const engine = require("../simulador/leverage-engine.js");

const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function approximately(actual, expected, tolerance = 0.01, message = "") {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    message || `Esperado aproximadamente ${expected}; recebido ${actual}`
  );
}

function fixedScenario(credit, overrides) {
  return engine.calculateFixedCreditScenario(credit, {
    ...engine.DEFAULT_INPUT,
    ...overrides
  });
}

test("módulo de alavancagem possui configuração centralizada e API isolada", () => {
  assert.equal(engine.version, "1.0.0");
  assert.equal(engine.DEFAULT_CONFIG.embeddedBid.maxPercentage, 30);
  assert.equal(engine.DEFAULT_CONFIG.correction.intervalMonths, 12);
  assert.equal(engine.DEFAULT_CONFIG.provider.id, "generic");
  assert.equal(engine.simulationConfig, engine.DEFAULT_CONFIG);
  assert.equal(typeof engine.calculateLeverageScenario, "function");
  assert.equal(typeof engine.calculateStressScenario, "function");
  assert.equal(typeof engine.calculateSensitivity, "function");
});

test("viradas de correção preservam a primeira alteração na parcela 13", () => {
  const expected = new Map([
    [11, 0],
    [12, 0],
    [13, 1],
    [23, 1],
    [24, 1],
    [25, 2],
    [35, 2],
    [36, 2],
    [59, 4],
    [60, 4],
    [61, 5]
  ]);

  for (const [month, periods] of expected) {
    assert.equal(engine.calculateCorrectionPeriods(month), periods, `Mês ${month}`);
  }
});

test("parcelas anteriores são somadas período a período", () => {
  const schedule = engine.calculateInstallmentSchedule(500, 60, 5);
  const total = schedule.at(-1).cumulative;
  const shortcutIncorreto = schedule.at(-1).amount * 60;
  const blocosAnuais = 12 * (500 + 525 + 551.25 + 578.81 + 607.75);

  assert.equal(total, 33153.72);
  approximately(total, blocosAnuais, 0.02);
  assert.notEqual(total, shortcutIncorreto);
});

test("dimensionamento mensal limita o crédito e mantém as parcelas dentro do orçamento", () => {
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 1000000,
    monthlyCapacity: 1000,
    totalBidPercentage: 30,
    embeddedBidPercentage: 25
  });

  assert.equal(result.capacity.limitingFactor, engine.LIMITING_FACTORS.MONTHLY_CAPACITY);
  assert.ok(result.capacity.monthlyRequirement <= result.input.monthlyCapacity);
  assert.ok(result.installments.atContemplation <= result.input.monthlyCapacity);
  assert.ok(result.installments.afterContemplation <= result.input.monthlyCapacity);
});

test("dimensionamento considera o pico corrigido durante todo o prazo do grupo", () => {
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 1000000,
    monthlyCapacity: 3000,
    strategyYears: 20,
    annualCorrectionPercentage: 5
  });
  const peakTimelineInstallment = Math.max(...result.timeline.monthly.map((entry) => entry.installment));

  assert.ok(result.installments.peakAfterContemplation <= result.input.monthlyCapacity);
  assert.ok(result.capacity.monthlyRequirement <= result.input.monthlyCapacity);
  approximately(result.capacity.monthlyRequirement, result.installments.peakAfterContemplation, 0.01);
  assert.ok(peakTimelineInstallment <= result.input.monthlyCapacity);
});

test("arredondamento monetário não deixa o pico ultrapassar a capacidade", () => {
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 1000000000,
    monthlyCapacity: 3000,
    totalBidPercentage: 0,
    embeddedBidPercentage: 0,
    termMonths: 24,
    scenarioMonth: 23,
    strategyYears: 2,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    annualCorrectionPercentage: 20,
    installmentType: engine.INSTALLMENT_TYPES.FULL
  });

  assert.ok(result.capacity.monthlyRequirement <= 3000);
  assert.ok(result.installments.peakAfterContemplation <= 3000);
  assert.ok(Math.max(...result.timeline.monthly.map((entry) => entry.installment)) <= 3000);
});

test("tolerância acompanha a quantidade configurada de casas monetárias", () => {
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 1000000000,
    monthlyCapacity: 3000,
    totalBidPercentage: 0,
    embeddedBidPercentage: 0,
    termMonths: 24,
    scenarioMonth: 23,
    strategyYears: 2,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    annualCorrectionPercentage: 20,
    installmentType: engine.INSTALLMENT_TYPES.FULL
  }, {
    dimensioning: { creditStep: 0.01 },
    moneyDecimals: 3
  });

  assert.ok(result.installments.peakAfterContemplation <= 3000.0005);
});

test("saldo residual no último mês vira obrigação final em vez de parcela zero", () => {
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 10000000,
    monthlyCapacity: 3000,
    termMonths: 240,
    scenarioMonth: 240,
    strategyYears: 20,
    annualCorrectionPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.REDUCED
  });

  assert.ok(result.balance.afterBid > 0);
  assert.equal(result.installments.isBalloonPayment, true);
  assert.equal(result.installments.afterContemplation, result.balance.afterBid);
  assert.ok(result.installments.afterContemplation <= result.input.monthlyCapacity);
  assert.equal(result.patrimony.outstandingDebt, result.balance.afterBid);
  assert.ok(result.warnings.some((warning) => /obrigação final/.test(warning)));
});

test("outros desembolsos acima do capital zeram a capacidade mesmo sem lance próprio", () => {
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 5000,
    otherOwnOutlays: 7000,
    totalBidPercentage: 25,
    embeddedBidPercentage: 25
  });

  assert.equal(result.estimatedCredit, 0);
  assert.equal(result.capacity.limitingFactor, engine.LIMITING_FACTORS.AVAILABLE_CAPITAL);
  assert.equal(result.capacity.creditByCapital, 0);
  assert.ok(result.warnings.some((warning) => /supera o capital disponível/.test(warning)));
});

test("crédito zero permanece zero mesmo quando há mínimo configurado", () => {
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 0,
    monthlyCapacity: 0
  }, {
    limits: { minCredit: 50000, maxCredit: 1000000 }
  });

  assert.equal(result.capacity.estimatedCredit, 0);
  assert.equal(result.estimatedCredit, 0);
});

test("grade de crédito é ancorada no mínimo configurado", () => {
  const config = {
    limits: { minCredit: 50000, maxCredit: 1000000 },
    dimensioning: { creditStep: 30000 }
  };
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 1000000,
    monthlyCapacity: 4583.33,
    totalBidPercentage: 0,
    embeddedBidPercentage: 0,
    termMonths: 12,
    scenarioMonth: 1,
    strategyYears: 1,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    annualCorrectionPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.FULL
  }, config);

  assert.equal(result.capacity.estimatedCredit, 50000);
  assert.equal(result.estimatedCredit, 50000);
});

test("capital disponível limita o crédito quando o lance próprio é a restrição", () => {
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 10000,
    monthlyCapacity: 100000,
    totalBidPercentage: 30,
    embeddedBidPercentage: 0,
    otherOwnOutlays: 0
  });

  assert.equal(result.capacity.limitingFactor, engine.LIMITING_FACTORS.AVAILABLE_CAPITAL);
  assert.equal(result.estimatedCredit, 33000);
  assert.ok(result.capacity.capitalRequiredForBid <= result.input.capitalAvailable);
});

test("dimensionamento e resultado usam a mesma composição quando o lance é limitado", () => {
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    capitalAvailable: 25000,
    monthlyCapacity: 100000,
    termMonths: 12,
    scenarioMonth: 12,
    strategyYears: 1,
    annualCorrectionPercentage: 0,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.REDUCED,
    reducedInstallmentPercentage: 50,
    totalBidPercentage: 100,
    embeddedBidPercentage: 25
  });

  assert.ok(result.capacity.capitalRequiredForBid <= result.input.capitalAvailable);
  assert.equal(result.bid.total, result.balance.bidApplied);
  assert.equal(result.bid.own + result.bid.embedded, result.bid.total);
});

test("cenário de crédito acima da capacidade gera alertas sem bloquear o cálculo", () => {
  const result = fixedScenario(1000000, {
    capitalAvailable: 10000,
    monthlyCapacity: 500,
    totalBidPercentage: 30,
    embeddedBidPercentage: 0
  });

  assert.ok(result.warnings.some((warning) => /recurso próprio/.test(warning)));
  assert.ok(result.warnings.some((warning) => /parcela estimada/.test(warning)));
  assert.ok(Number.isFinite(result.patrimony.netWorth));
});

test("lance embutido reduz o crédito, mas nunca integra o capital próprio", () => {
  const result = fixedScenario(200000, {
    scenarioMonth: 12,
    totalBidPercentage: 30,
    embeddedBidPercentage: 20,
    otherOwnOutlays: 1500
  });

  assert.equal(result.bid.total, 60000);
  assert.equal(result.bid.own, 20000);
  assert.equal(result.bid.embedded, 40000);
  assert.equal(result.credit.originalNet, 160000);
  assert.equal(
    result.capital.investedTotal,
    result.capital.installmentsPaid + result.bid.own + 1500
  );
  assert.notEqual(
    result.capital.investedTotal,
    result.capital.installmentsPaid + result.bid.own + result.bid.embedded + 1500
  );
});

test("lance solicitado acima do saldo é limitado e só o aplicado entra no capital", () => {
  const result = fixedScenario(120000, {
    termMonths: 12,
    scenarioMonth: 12,
    annualCorrectionPercentage: 0,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.REDUCED,
    reducedInstallmentPercentage: 50,
    totalBidPercentage: 100,
    embeddedBidPercentage: 30,
    otherOwnOutlays: 500
  });

  assert.equal(result.bid.requestedTotal, 120000);
  assert.equal(result.bid.total, result.balance.bidApplied);
  assert.equal(result.bid.wasLimitedByBalance, true);
  assert.equal(
    result.capital.investedTotal,
    result.capital.installmentsPaid + result.bid.own + 500
  );
  assert.ok(result.warnings.some((warning) => /limitado ao valor/.test(warning)));
});

test("crédito líquido responde a diferentes percentuais de lance embutido", () => {
  const noEmbedded = fixedScenario(300000, {
    annualCorrectionPercentage: 0,
    embeddedBidPercentage: 0,
    totalBidPercentage: 30
  });
  const tenPercent = fixedScenario(300000, {
    annualCorrectionPercentage: 0,
    embeddedBidPercentage: 10,
    totalBidPercentage: 30
  });
  const twentyFivePercent = fixedScenario(300000, {
    annualCorrectionPercentage: 0,
    embeddedBidPercentage: 25,
    totalBidPercentage: 30
  });

  assert.equal(noEmbedded.credit.netAtContemplation, 300000);
  assert.equal(tenPercent.credit.netAtContemplation, 270000);
  assert.equal(twentyFivePercent.credit.netAtContemplation, 225000);
});

test("parcela pós-contemplação usa saldo depois do lance e meses restantes", () => {
  const result = fixedScenario(120000, {
    capitalAvailable: 100000,
    monthlyCapacity: 10000,
    termMonths: 120,
    scenarioMonth: 12,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    annualCorrectionPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.FULL,
    totalBidPercentage: 20,
    embeddedBidPercentage: 10,
    annualAppreciationPercentage: 0
  });

  assert.equal(result.installments.initial, 1000);
  assert.equal(result.installments.paidTotal, 12000);
  assert.equal(result.balance.beforeBid, 108000);
  assert.equal(result.balance.bidApplied, 24000);
  assert.equal(result.balance.afterBid, 84000);
  assert.equal(result.installments.remainingMonths, 108);
  assert.equal(result.installments.afterContemplation, 777.78);
});

test("correção na próxima parcela é considerada na obrigação pós-contemplação", () => {
  const noCorrection = fixedScenario(120000, {
    termMonths: 120,
    scenarioMonth: 12,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    annualCorrectionPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.FULL,
    totalBidPercentage: 20,
    embeddedBidPercentage: 10
  });
  const corrected = fixedScenario(120000, {
    termMonths: 120,
    scenarioMonth: 12,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    annualCorrectionPercentage: 5,
    installmentType: engine.INSTALLMENT_TYPES.FULL,
    totalBidPercentage: 20,
    embeddedBidPercentage: 10
  });

  assert.equal(noCorrection.installments.afterContemplation, 777.78);
  assert.ok(corrected.installments.afterContemplation > noCorrection.installments.afterContemplation);
});

test("aluguel zero deixa toda a parcela como complemento mensal", () => {
  const result = fixedScenario(120000, {
    annualRentalYieldPercentage: 0,
    termMonths: 120,
    scenarioMonth: 12,
    annualCorrectionPercentage: 0,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.FULL,
    totalBidPercentage: 20,
    embeddedBidPercentage: 10
  });

  assert.equal(result.rental.monthlyAtContemplation, 0);
  assert.equal(result.rental.coveragePercentage, 0);
  assert.equal(result.rental.monthlyComplement, result.installments.afterContemplation);
  assert.equal(result.rental.monthlySurplus, 0);
});

test("aluguel pode cobrir parcialmente, exatamente ou acima da parcela", () => {
  const baseInput = {
    termMonths: 120,
    scenarioMonth: 12,
    annualCorrectionPercentage: 0,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.FULL,
    totalBidPercentage: 20,
    embeddedBidPercentage: 10
  };
  const noRent = fixedScenario(120000, { ...baseInput, annualRentalYieldPercentage: 0 });
  const exactYield = noRent.installments.afterContemplation * 12
    / noRent.credit.netAtContemplation * 100;
  const partial = fixedScenario(120000, {
    ...baseInput,
    annualRentalYieldPercentage: exactYield / 2
  });
  const exact = fixedScenario(120000, {
    ...baseInput,
    annualRentalYieldPercentage: exactYield
  });
  const above = fixedScenario(120000, {
    ...baseInput,
    annualRentalYieldPercentage: exactYield * 1.5
  });

  approximately(partial.rental.coveragePercentage, 50, 0.02);
  assert.ok(partial.rental.monthlyComplement > 0);
  approximately(exact.rental.coveragePercentage, 100, 0.02);
  approximately(exact.rental.monthlyComplement, 0, 0.02);
  assert.ok(above.rental.coveragePercentage > 100);
  assert.equal(above.rental.monthlyComplement, 0);
  assert.ok(above.rental.monthlySurplus > 0);
});

test("renda de aluguel não existe antes da contemplação", () => {
  const result = fixedScenario(200000, {
    scenarioMonth: 24,
    strategyYears: 5,
    annualRentalYieldPercentage: 5
  });

  assert.ok(result.timeline.monthly.slice(0, 24).every((entry) => {
    return entry.monthlyRentEstimate === 0 && entry.assetValue === 0;
  }));
  assert.ok(result.timeline.monthly[24].monthlyRentEstimate > 0);
  assert.equal(result.timeline.monthly[24].isContemplation, true);
});

test("patrimônio líquido é sempre ativo projetado menos saldo devedor", () => {
  const result = engine.calculateLeverageScenario(engine.DEFAULT_INPUT);

  approximately(
    result.patrimony.netWorth,
    result.patrimony.assetValue - result.patrimony.outstandingDebt
  );
  for (const point of result.timeline.monthly.slice(result.input.scenarioMonth)) {
    approximately(point.netWorth, point.assetValue - point.outstandingDebt, 0.02);
  }
});

test("comparação à vista usa o mesmo horizonte e valorização", () => {
  const result = fixedScenario(200000, {
    capitalAvailable: 100000,
    strategyYears: 10,
    annualAppreciationPercentage: 8
  });

  approximately(result.patrimony.cashPurchaseValue, 100000 * 1.08 ** 10, 0.02);
  assert.equal(
    result.patrimony.leveragedMinusCashPurchase,
    Math.round((result.patrimony.netWorth - result.patrimony.cashPurchaseValue) * 100) / 100
  );
});

test("timeline entrega série mensal, tabela anual e marcador de contemplação", () => {
  const result = fixedScenario(200000, {
    scenarioMonth: 24,
    strategyYears: 5
  });

  assert.equal(result.timeline.monthly.length, 61);
  assert.equal(result.timeline.annual.length, 6);
  assert.deepEqual(result.timeline.annual.map((entry) => entry.year), [0, 1, 2, 3, 4, 5]);
  assert.equal(result.timeline.contemplationMonth, 24);
  assert.equal(result.timeline.monthly.filter((entry) => entry.isContemplation).length, 1);
});

test("teste de variação é neutro e não altera os parâmetros originais", () => {
  const input = { ...engine.DEFAULT_INPUT };
  const snapshot = JSON.stringify(input);
  const stress = engine.calculateStressScenario(input);

  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(stress.label, "Variação simulada");
  assert.equal(
    stress.input.annualAppreciationPercentage,
    engine.DEFAULT_INPUT.annualAppreciationPercentage - 2
  );
  assert.equal(stress.input.scenarioMonth, engine.DEFAULT_INPUT.scenarioMonth + 12);
  assert.equal(
    stress.input.annualCorrectionPercentage,
    engine.DEFAULT_INPUT.annualCorrectionPercentage + 2
  );
  assert.equal(stress.variation.estimatedCredit, stress.current.estimatedCredit);
  assert.ok(Number.isFinite(stress.impact.projectedNetWorth));
});

test("análise de sensibilidade mede três variações e ordena por impacto absoluto", () => {
  const sensitivity = engine.calculateSensitivity(engine.DEFAULT_INPUT);

  assert.equal(sensitivity.length, 3);
  assert.deepEqual(new Set(sensitivity.map((item) => item.key)), new Set([
    "contemplation-delay",
    "appreciation-minus-one",
    "correction-plus-one"
  ]));
  assert.ok(
    Math.abs(sensitivity[0].projectedNetWorthImpact)
      >= Math.abs(sensitivity[1].projectedNetWorthImpact)
  );
  assert.ok(
    Math.abs(sensitivity[1].projectedNetWorthImpact)
      >= Math.abs(sensitivity[2].projectedNetWorthImpact)
  );
  assert.ok(sensitivity.every((item) => item.estimatedCreditImpact === 0));
});

test("memória de cálculo possui as 16 etapas auditáveis", () => {
  const result = engine.calculateLeverageScenario(engine.DEFAULT_INPUT);

  assert.equal(result.breakdown.length, 16);
  assert.deepEqual(result.breakdown.map((item) => item.step), [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
  ]);
  assert.equal(result.breakdown.at(-1).result, result.patrimony.netWorth);
});

test("parâmetros extraordinários geram avisos configuráveis, sem bloqueio", () => {
  const result = fixedScenario(200000, {
    annualAppreciationPercentage: 50,
    annualRentalYieldPercentage: 30,
    annualCorrectionPercentage: 20
  });

  assert.ok(result.warnings.some((warning) => /valorização anual/.test(warning)));
  assert.ok(result.warnings.some((warning) => /rendimento anual de aluguel/.test(warning)));
  assert.ok(result.warnings.some((warning) => /correção anual/.test(warning)));
  assert.ok(Number.isFinite(result.patrimony.netWorth));
});

test("configuração aceita futuras regras de administradora sem alterar o motor", () => {
  const config = engine.mergeConfig({
    provider: { id: "administradora-a", label: "Administradora A" },
    embeddedBid: { maxPercentage: 20 },
    dimensioning: { creditStep: 500 }
  });
  const result = engine.calculateLeverageScenario({
    ...engine.DEFAULT_INPUT,
    embeddedBidPercentage: 25
  }, config);

  assert.equal(config.provider.id, "administradora-a");
  assert.equal(result.input.embeddedBidPercentage, 20);
  assert.equal(result.estimatedCredit % 500, 0);
});

test("entradas inválidas são normalizadas sem NaN ou Infinity", () => {
  const result = engine.calculateLeverageScenario({
    capitalAvailable: Infinity,
    monthlyCapacity: -10,
    totalBidPercentage: 999,
    embeddedBidPercentage: 999,
    scenarioMonth: 9999,
    strategyYears: NaN,
    termMonths: 0,
    administrationPercentage: -5,
    reserveFundPercentage: -5,
    annualCorrectionPercentage: -1,
    annualAppreciationPercentage: -1,
    annualRentalYieldPercentage: -1,
    otherOwnOutlays: -1
  });

  assert.equal(result.input.capitalAvailable, engine.DEFAULT_INPUT.capitalAvailable);
  assert.equal(result.input.monthlyCapacity, 0);
  assert.equal(result.input.termMonths, 1);
  assert.equal(result.input.scenarioMonth, 1);
  assert.equal(result.input.totalBidPercentage, 100);
  assert.equal(result.input.embeddedBidPercentage, 30);
  assert.equal(result.estimatedCredit, 0);
  assert.ok(result.timeline.monthly.every((point) => Object.values(point).every((value) => {
    return typeof value !== "number" || Number.isFinite(value);
  })));
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
  console.log(`\n${passed}/${tests.length} testes de alavancagem passaram.`);
} else {
  console.error(`\n${passed}/${tests.length} testes de alavancagem passaram.`);
}
