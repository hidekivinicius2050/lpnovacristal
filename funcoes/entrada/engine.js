(function (root) {
  "use strict";
  function number(value) {
    if (typeof value === "number") return value;
    let s = String(value ?? "").trim().replace(/R\$/gi, "").replace(/\s/g, "");
    if (!s) return NaN;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }
  function cents(value, label) {
    const n = number(value), c = Math.round((n + Number.EPSILON) * 100);
    if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(c)) throw Error(`Informe ${label} válido, sem valores negativos.`);
    return c;
  }
  function calculate({ credit, cost, margin = 0, mode = "money" }) {
    const creditCents = cents(credit, "um crédito"), costCents = cents(cost, "uma entrada de custo");
    if (creditCents <= 0) throw Error("O crédito deve ser maior que zero.");
    if (!["money", "percent"].includes(mode)) throw Error("Selecione como informar o acréscimo.");
    const input = number(margin);
    if (!Number.isFinite(input) || input < 0) throw Error("Informe um acréscimo válido, sem valores negativos.");
    const marginCents = mode === "percent" ? Math.round(costCents * input / 100) : cents(input, "um acréscimo");
    const entryCents = costCents + marginCents;
    if (!Number.isSafeInteger(entryCents)) throw Error("Os valores informados são muito altos.");
    // Largest whole cent strictly below half the credit, including odd-cent credits.
    const maximumCents = Math.ceil(creditCents / 2) - 1;
    const maxMarginCents = Math.max(0, maximumCents - costCents);
    return { credit: creditCents / 100, cost: costCents / 100, margin: marginCents / 100,
      entry: entryCents / 100, costPercent: costCents / creditCents * 100,
      entryPercent: entryCents / creditCents * 100, good: entryCents <= maximumCents,
      maximumEntry: maximumCents / 100, maximumMargin: maxMarginCents / 100,
      // Truncate the suggested percentage so rounding it cannot exceed the monetary ceiling.
      maximumMarginPercent: costCents > 0 ? Number(BigInt(maxMarginCents) * 10000n / BigInt(costCents)) / 100 : null,
      room: (maximumCents - entryCents) / 100, baseGood: costCents <= maximumCents };
  }
  const api = Object.freeze({ number, calculate });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CristalEntry = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
