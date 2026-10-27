(function () {
  "use strict";
  const E = window.CristalEntry, $ = id => document.getElementById(id);
  const money = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const percent = v => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: v < 50 && v >= 49.995 ? 8 : 2 }) + "%";
  let current;
  function update() {
    current = null;
    $("entry-feedback").textContent = "";
    try {
      if (!$("credit").value.trim() || !$("cost").value.trim()) { $("result").hidden = true; $("empty-result").hidden = false; return; }
      const r = E.calculate({ credit: $("credit").value, cost: $("cost").value, margin: $("margin").value.trim() || "0", mode: $("margin-mode").value });
      current = r;
      $("result").hidden = false; $("empty-result").hidden = true;
      $("final-percent").textContent = percent(r.entryPercent);
      $("final-entry").textContent = `${money(r.entry)} de entrada para o cliente`;
      $("entry-status").textContent = r.good ? "Dentro do critério · abaixo de 50%" : "Fora do critério · 50% ou mais";
      $("entry-status").dataset.state = r.good ? "good" : "bad";
      $("entry-meter-fill").style.width = `${Math.min(100, r.entryPercent)}%`;
      $("cost-percent").textContent = percent(r.costPercent);
      $("margin-money").textContent = money(r.margin);
      $("room-label").textContent = r.room >= 0 ? "Ainda cabe acrescentar" : "Reduzir da entrada final";
      $("room-money").textContent = money(Math.abs(r.room));
      $("maximum-entry").textContent = money(r.maximumEntry);
      $("maximum-detail").textContent = `${percent(r.maximumEntry / r.credit * 100)} do crédito, sem atingir 50%.`;
      $("maximum-margin").textContent = r.baseGood ? money(r.maximumMargin) : "Sem espaço para acréscimo";
      $("maximum-percent").textContent = !r.baseGood ? "A entrada de custo já está fora do critério. Negocie uma redução com o parceiro." : r.maximumMarginPercent === null ? "Com custo zero, o acréscimo máximo é apresentado em reais." : `Até ${percent(r.maximumMarginPercent)} de acréscimo sobre a entrada de custo (percentual truncado para não exceder o limite).`;
      $("apply-maximum").disabled = !r.baseGood;
    } catch (error) {
      $("result").hidden = true; $("empty-result").hidden = false;
      $("entry-feedback").textContent = error.message;
    }
  }
  $("entry-form").addEventListener("submit", event => event.preventDefault());
  $("entry-form").addEventListener("input", event => { if (event.target.id !== "margin-mode") update(); });
  $("margin-mode").addEventListener("change", () => {
    // Switching units never silently reinterprets the value already entered.
    const previous = current;
    const percentage = $("margin-mode").value === "percent";
    if (percentage && previous && previous.cost === 0 && previous.margin > 0) {
      $("margin-mode").value = "money";
      $("entry-feedback").textContent = "Com entrada de custo zero, informe o acréscimo em reais.";
      return;
    }
    $("margin-label").textContent = percentage ? "Acréscimo sobre o custo (%)" : "Acréscimo da Cristal (R$)";
    $("margin").value = previous ? (percentage ? (previous.cost ? previous.margin / previous.cost * 100 : 0) : previous.margin).toLocaleString("pt-BR", { maximumFractionDigits: percentage ? 8 : 2, minimumFractionDigits: 2 }) : "0,00";
    update();
  });
  $("entry-form").addEventListener("reset", () => { setTimeout(() => { $("margin-label").textContent = "Acréscimo da Cristal (R$)"; update(); }, 0); });
  for (const id of ["credit", "cost", "margin"]) $(id).addEventListener("blur", () => {
    const value = E.number($(id).value);
    if (Number.isFinite(value) && value >= 0) $(id).value = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: id === "margin" && $("margin-mode").value === "percent" ? 8 : 2 });
  });
  $("entry-example").addEventListener("click", () => {
    $("credit").value = "100.000,00"; $("cost").value = "30.000,00";
    $("margin-mode").value = "money"; $("margin-label").textContent = "Acréscimo da Cristal (R$)"; $("margin").value = "5.000,00"; update();
  });
  $("apply-maximum").addEventListener("click", () => {
    if (!current || !current.baseGood) return;
    $("margin-mode").value = "money"; $("margin-label").textContent = "Acréscimo da Cristal (R$)";
    $("margin").value = current.maximumMargin.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); update();
  });
  update();
})();
