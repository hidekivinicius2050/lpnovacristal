"use strict";

const assert = require("node:assert/strict");
const engine = require("../simulador/simulation-engine.js");

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

function defaultScenario(overrides) {
  return engine.calculateSimulation({ ...engine.DEFAULT_INPUT, ...overrides });
}

test("cenário 1: parcela reduzida e resultado em 12 meses", () => {
  const result = defaultScenario({
    scenarioMonth: 12,
    ownBid: 0,
    embeddedBidPercentage: 0
  });

  assert.equal(result.totalPlanValue, 251400);
  assert.equal(result.baseInstallment, 1047.5);
  assert.equal(result.initialInstallment, 523.75);
  assert.equal(result.installmentsPaidTotal, 6285);
  assert.equal(result.correctionPeriods, 0);
  assert.equal(result.adjustedCredit, 200000);
  assert.equal(result.estimatedPremium, 50000);
  assert.equal(result.grossProfit, 43715);
});

test("cenário 2: primeira correção só após 12 parcelas completas", () => {
  const result = defaultScenario({ scenarioMonth: 24 });

  assert.equal(engine.calculateCorrectionPeriods(12), 0);
  assert.equal(engine.calculateCorrectionPeriods(13), 1);
  assert.equal(engine.calculateCorrectionPeriods(24), 1);
  assert.equal(engine.calculateCorrectionPeriods(25), 2);
  assert.equal(result.installmentAtScenario, 549.94);
  assert.equal(result.installmentsPaidTotal, 12884.28);
  assert.equal(result.adjustedCredit, 210000);
  assert.equal(result.estimatedPremium, 52500);
  assert.equal(result.grossProfit, 39615.72);
  approximately(result.grossProfit, 39616, 1);
});

test("cenário 3: 60 meses soma cada período, não multiplica a última parcela", () => {
  const result = defaultScenario({ scenarioMonth: 60 });
  const wrongShortcut = result.installmentAtScenario * 60;
  const expectedAnnualBlocks = 12 * (523.75 + 549.94 + 577.43 + 606.31 + 636.62);

  assert.equal(result.installmentsPaidTotal, 34728.6);
  assert.equal(result.installmentsPaidTotal, expectedAnnualBlocks);
  assert.notEqual(result.installmentsPaidTotal, wrongShortcut);
  assert.equal(result.installmentSchedule.length, 60);
  assert.equal(result.installmentSchedule[0].amount, 523.75);
  assert.equal(result.installmentSchedule[59].amount, 636.62);
});

test("lance embutido reduz crédito, mas não entra no capital próprio", () => {
  const result = defaultScenario({
    scenarioMonth: 12,
    ownBid: 20000,
    embeddedBidPercentage: 20
  });

  assert.equal(result.embeddedBid, 40000);
  assert.equal(result.totalBid, 60000);
  assert.equal(result.totalBidPercentage, 30);
  assert.equal(result.netCredit, 160000);
  assert.equal(result.capital.installments, 6285);
  assert.equal(result.capital.ownBid, 20000);
  assert.equal(result.investedCapital, 26285);
  assert.equal(result.estimatedPremium, 40000);
  assert.equal(result.grossProfit, 13715);
  assert.notEqual(result.investedCapital, 66285);
});

test("lance próprio é limitado para que o lance total nunca passe de 100%", () => {
  const result = defaultScenario({
    scenarioMonth: 12,
    ownBid: 200000,
    embeddedBidPercentage: 20
  });

  assert.equal(result.requestedInput.ownBid, 200000);
  assert.equal(result.input.ownBid, 160000);
  assert.equal(result.ownBid, 160000);
  assert.equal(result.totalBid, 200000);
  assert.equal(result.totalBidPercentage, 100);
  assert.ok(result.warnings.some((warning) => /recurso próprio foi limitado/.test(warning)));
});

test("limite total permanece conservador mesmo com configuração acima de 100%", () => {
  const result = engine.calculateSimulation({
    ...engine.DEFAULT_INPUT,
    scenarioMonth: 12,
    ownBid: 500000,
    embeddedBidPercentage: 30
  }, {
    totalBid: { maxPercentage: 150 }
  });

  assert.equal(result.totalBid, 200000);
  assert.equal(result.totalBidPercentage, 100);
  assert.ok(result.totalBidPercentage <= 100);
});

test("percentual de lance embutido respeita limite configurável", () => {
  const result = defaultScenario({
    embeddedBidPercentage: 80,
    ownBid: 0,
    scenarioMonth: 12
  });

  assert.equal(result.input.embeddedBidPercentage, 30);
  assert.equal(result.embeddedBid, 60000);
  assert.equal(result.totalBidPercentage, 30);
  assert.ok(result.warnings.some((warning) => /limitado a 30%/.test(warning)));
});

test("bases do lance embutido e do ágio podem ser configuradas", () => {
  const config = {
    embeddedBid: {
      maxPercentage: 30,
      base: engine.BASE_OPTIONS.ADJUSTED_CREDIT
    },
    premium: {
      base: engine.BASE_OPTIONS.ADJUSTED_CREDIT
    }
  };
  const result = engine.calculateSimulation({
    ...engine.DEFAULT_INPUT,
    scenarioMonth: 24,
    embeddedBidPercentage: 20
  }, config);

  assert.equal(result.adjustedCredit, 210000);
  assert.equal(result.embeddedBid, 42000);
  assert.equal(result.adjustedNetCredit, 168000);
  assert.equal(result.operation.premiumBase, 210000);
  assert.equal(result.estimatedPremium, 52500);
});

test("ágio padrão usa o crédito líquido corrigido", () => {
  const result = defaultScenario({
    scenarioMonth: 24,
    embeddedBidPercentage: 20,
    premiumPercentage: 25
  });

  assert.equal(result.adjustedCredit, 210000);
  assert.equal(result.embeddedBid, 40000);
  assert.equal(result.adjustedNetCredit, 170000);
  assert.equal(result.operation.premiumBase, 170000);
  assert.equal(result.estimatedPremium, 42500);
});

test("cenário sem correção e sem taxa mantém parcela constante", () => {
  const result = engine.calculateSimulation({
    credit: 12000,
    ownBid: 0,
    embeddedBidPercentage: 0,
    scenarioMonth: 12,
    premiumPercentage: 0,
    termMonths: 12,
    administrationFundPercentage: 0,
    annualCorrectionPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.FULL,
    reducedInstallmentPercentage: 50,
    otherOwnOutlays: 0
  });

  assert.equal(result.baseInstallment, 1000);
  assert.equal(result.initialInstallment, 1000);
  assert.equal(result.installmentsPaidTotal, 12000);
  assert.equal(result.adjustedCredit, 12000);
  assert.ok(result.installmentSchedule.every((entry) => entry.amount === 1000));
});

test("ROI não produz Infinity quando o capital próprio é zero", () => {
  const result = engine.calculateSimulation({
    ...engine.DEFAULT_INPUT,
    scenarioMonth: 1,
    ownBid: 0,
    otherOwnOutlays: 0,
    installmentType: engine.INSTALLMENT_TYPES.REDUCED,
    reducedInstallmentPercentage: 0
  });

  assert.equal(result.investedCapital, 0);
  assert.equal(result.roi, null);
  assert.equal(engine.formatters.percentage(result.roi), "—");
});

test("validação corrige extremos sem gerar NaN ou Infinity", () => {
  const result = engine.calculateSimulation({
    credit: Infinity,
    ownBid: -100,
    embeddedBidPercentage: -20,
    scenarioMonth: 9999,
    premiumPercentage: NaN,
    termMonths: 0,
    administrationFundPercentage: -1,
    annualCorrectionPercentage: -1,
    reducedInstallmentPercentage: 999,
    otherOwnOutlays: -10
  });

  assert.equal(result.input.credit, engine.DEFAULT_INPUT.credit);
  assert.equal(result.input.ownBid, 0);
  assert.equal(result.input.embeddedBidPercentage, 0);
  assert.equal(result.input.termMonths, 1);
  assert.equal(result.input.scenarioMonth, 1);
  assert.equal(result.input.administrationFundPercentage, 0);
  assert.equal(result.input.annualCorrectionPercentage, 0);
  assert.equal(result.input.reducedInstallmentPercentage, 100);
  assert.ok(Number.isFinite(result.grossProfit));
  assert.ok(result.timeline.every((point) => {
    return Object.entries(point).every(([, value]) => value === null || Number.isFinite(value));
  }));
});

test("campos monetários em formato brasileiro são aceitos", () => {
  const result = engine.calculateSimulation({
    ...engine.DEFAULT_INPUT,
    credit: "R$ 200.000,00",
    ownBid: "R$ 20.000,00",
    embeddedBidPercentage: "20,0",
    scenarioMonth: "12"
  });

  assert.equal(result.input.credit, 200000);
  assert.equal(result.input.ownBid, 20000);
  assert.equal(result.totalBid, 60000);
});

test("nomes de campo usados pelo formulário são normalizados", () => {
  const result = engine.calculateSimulation({
    credit: 200000,
    ownBid: 0,
    embeddedBidPercentage: 0,
    contemplationMonth: 12,
    premiumPercentage: 25,
    termMonths: 240,
    administrationPercentage: 25.7,
    annualCorrectionPercentage: 5,
    installmentType: "reduced",
    reducedInstallmentPercentage: 50
  });

  assert.equal(result.input.scenarioMonth, 12);
  assert.equal(result.input.administrationFundPercentage, 25.7);
  assert.equal(result.initialInstallment, 523.75);
});

test("timeline é monotônica no capital e coincide com o cenário selecionado", () => {
  const result = defaultScenario({
    scenarioMonth: 60,
    ownBid: 20000,
    embeddedBidPercentage: 20
  });
  const selected = result.timeline[result.input.scenarioMonth - 1];

  for (let index = 1; index < result.timeline.length; index += 1) {
    assert.ok(
      result.timeline[index].investedCapital >= result.timeline[index - 1].investedCapital,
      `Capital diminuiu no mês ${index + 1}`
    );
  }

  assert.equal(selected.investedCapital, result.investedCapital);
  assert.equal(selected.adjustedCredit, result.adjustedCredit);
  assert.equal(selected.estimatedPremium, result.estimatedPremium);
  assert.equal(selected.grossProfit, result.grossProfit);
  assert.equal(selected.roi, result.roi);
});

test("invariantes financeiras permanecem verdadeiras em cenários variados", () => {
  const scenarios = [
    { credit: 1000, scenarioMonth: 1, termMonths: 1, premiumPercentage: 0 },
    { credit: 1000000, scenarioMonth: 600, termMonths: 600, embeddedBidPercentage: 30 },
    { credit: 350000, scenarioMonth: 150, termMonths: 150, annualCorrectionPercentage: 0 },
    { credit: 500000, scenarioMonth: 37, ownBid: 900000, embeddedBidPercentage: 30 },
    { credit: 200000, scenarioMonth: 25, otherOwnOutlays: 1250.5, installmentType: "full" }
  ];

  for (const partial of scenarios) {
    const result = defaultScenario(partial);
    approximately(result.totalBid, result.ownBid + result.embeddedBid);
    assert.ok(result.totalBidPercentage <= 100);
    assert.ok(result.netCredit >= 0);
    assert.ok(result.adjustedNetCredit >= 0);
    approximately(
      result.investedCapital,
      result.installmentsPaidTotal + result.ownBid + result.input.otherOwnOutlays
    );
    approximately(
      result.estimatedOperationValue,
      result.adjustedNetCredit + result.estimatedPremium
    );
    approximately(result.grossProfit, result.estimatedPremium - result.investedCapital);
    assert.ok(result.roi === null || Number.isFinite(result.roi));
  }
});

test("viradas anuais de correção permanecem consistentes", () => {
  const expectedPeriods = new Map([
    [11, 0], [12, 0], [13, 1], [23, 1], [24, 1], [25, 2],
    [35, 2], [36, 2], [59, 4], [60, 4], [61, 5]
  ]);

  expectedPeriods.forEach((periods, month) => {
    assert.equal(engine.calculateCorrectionPeriods(month), periods, `Mês ${month}`);
  });
});

test("taxa administrativa e fundo separados preservam o total do plano", () => {
  const separated = defaultScenario({
    administrationPercentage: 22,
    reserveFundPercentage: 3.7,
    scenarioMonth: 12
  });
  const legacy = defaultScenario({
    administrationFundPercentage: 25.7,
    reserveFundPercentage: undefined,
    administrationPercentage: undefined,
    scenarioMonth: 12
  });

  assert.equal(separated.input.administrationPercentage, 22);
  assert.equal(separated.input.reserveFundPercentage, 3.7);
  assert.equal(separated.input.administrationFundPercentage, 25.7);
  assert.equal(separated.totalPlanValue, legacy.totalPlanValue);
  assert.equal(separated.initialInstallment, legacy.initialInstallment);
});

test("taxa e fundo separados não sofrem corte silencioso no total combinado", () => {
  const result = defaultScenario({
    credit: 100000,
    administrationPercentage: 70,
    reserveFundPercentage: 50,
    scenarioMonth: 1
  });

  assert.equal(result.input.administrationPercentage, 70);
  assert.equal(result.input.reserveFundPercentage, 50);
  assert.equal(result.input.administrationFundPercentage, 120);
  assert.equal(result.totalPlanValue, 220000);
});

test("saldo e parcela pós-contemplação usam lance e prazo restante", () => {
  const result = engine.calculateSimulation({
    credit: 12000,
    ownBid: 3000,
    embeddedBidPercentage: 0,
    scenarioMonth: 3,
    premiumPercentage: 0,
    termMonths: 12,
    administrationFundPercentage: 0,
    annualCorrectionPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.FULL,
    reducedInstallmentPercentage: 100,
    otherOwnOutlays: 0
  });

  assert.equal(result.initialInstallment, 1000);
  assert.equal(result.installmentAtScenario, 1000);
  assert.equal(result.installmentsPaidTotal, 3000);
  assert.equal(result.debt.balanceBeforeBid, 9000);
  assert.equal(result.debt.appliedBid, 3000);
  assert.equal(result.debt.balanceAfterBid, 6000);
  assert.equal(result.remainingMonths, 9);
  assert.equal(result.postContemplationInstallment, 666.67);
});

test("parcela pós-contemplação aplica a correção da próxima parcela", () => {
  const result = engine.calculateSimulation({
    credit: 120000,
    ownBid: 12000,
    embeddedBidPercentage: 10,
    scenarioMonth: 12,
    premiumPercentage: 0,
    termMonths: 120,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    annualCorrectionPercentage: 5,
    installmentType: engine.INSTALLMENT_TYPES.FULL,
    reducedInstallmentPercentage: 100,
    otherOwnOutlays: 0
  });

  assert.equal(result.debt.balanceAfterBid, 84000);
  assert.equal(result.postContemplationInstallment, 816.67);
});

test("saldo residual no último mês é exibido como obrigação final", () => {
  const result = engine.calculateSimulation({
    credit: 120000,
    ownBid: 0,
    embeddedBidPercentage: 0,
    scenarioMonth: 12,
    premiumPercentage: 0,
    termMonths: 12,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    annualCorrectionPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.REDUCED,
    reducedInstallmentPercentage: 50,
    otherOwnOutlays: 0
  });

  assert.equal(result.debt.balanceAfterBid, 60000);
  assert.equal(result.remainingMonths, 0);
  assert.equal(result.postContemplationInstallment, 60000);
  assert.equal(result.isBalloonPayment, true);
  assert.ok(result.warnings.some((warning) => /obrigação final/.test(warning)));
});

test("lance acima do saldo é limitado e só o aplicado entra como capital", () => {
  const result = engine.calculateSimulation({
    credit: 120000,
    ownBid: 84000,
    embeddedBidPercentage: 30,
    scenarioMonth: 12,
    premiumPercentage: 0,
    termMonths: 12,
    administrationPercentage: 0,
    reserveFundPercentage: 0,
    annualCorrectionPercentage: 0,
    installmentType: engine.INSTALLMENT_TYPES.REDUCED,
    reducedInstallmentPercentage: 50,
    otherOwnOutlays: 500
  });

  assert.equal(result.debt.appliedBid, 60000);
  assert.equal(result.totalBid, 60000);
  assert.equal(result.ownBid, 42000);
  assert.equal(result.embeddedBid, 18000);
  assert.equal(result.investedCapital, result.installmentsPaidTotal + 42000 + 500);
  assert.ok(result.warnings.some((warning) => /limitado ao valor/.test(warning)));
});

test("crédito líquido acompanha diferentes percentuais de lance embutido", () => {
  for (const [percentage, expected] of [[0, 200000], [10, 180000], [20, 160000], [30, 140000]]) {
    const result = defaultScenario({ embeddedBidPercentage: percentage, scenarioMonth: 12 });
    assert.equal(result.netCredit, expected);
    assert.equal(result.embeddedBid, 200000 - expected);
    assert.equal(result.investedCapital, result.installmentsPaidTotal + result.ownBid + result.input.otherOwnOutlays);
  }
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
  console.log(`\n${passed}/${tests.length} testes do simulador passaram.`);
} else {
  console.error(`\n${passed}/${tests.length} testes do simulador passaram.`);
}
