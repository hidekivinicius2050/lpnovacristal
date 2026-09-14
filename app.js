/*
  Cristal Consórcios — catálogo público
  As cartas são carregadas das duas planilhas públicas já utilizadas no site.
  Veja README.md para trocar as URLs ou atualizar o portfólio.
*/

const CRISTAL = {
  whatsapp: "556133283000",
  leadsEndpoint: "https://script.google.com/macros/s/AKfycbzk_wG9H6G0YHeQgFPFLvS-emVFiAL-Z8WCl4xPiSulF97123r5aFhop85ky90ktjAY/exec",
  sheets: [
    {
      type: "imovel",
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnw9FKHx5rCVjRKwrD2elRDHhYAb2jpsBIpeNHjQEH1_LVO4YpETKufOz0mu7LLU3xu-EpL46s5t49/pub?gid=0&single=true&output=csv"
    },
    {
      type: "veiculo",
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnw9FKHx5rCVjRKwrD2elRDHhYAb2jpsBIpeNHjQEH1_LVO4YpETKufOz0mu7LLU3xu-EpL46s5t49/pub?gid=271229806&single=true&output=csv"
    }
  ]
};

/*
  Perfis exclusivamente demonstrativos do comparador.
  Não representam oferta, cotação atual ou promessa das instituições citadas.
  Edite somente este bloco quando a Cristal revisar os cenários didáticos.
*/
const FINANCE_SIMULATION_PROFILES = {
  veiculo: [
    { bank: "Caixa Econômica Federal", shortName: "CAIXA", monthlyRate: 0.0101 },
    { bank: "Bradesco", shortName: "BRADESCO", monthlyRate: 0.0177 },
    { bank: "Banco Santander", shortName: "SANTANDER", monthlyRate: 0.0193 },
    { bank: "Itaú Unibanco", shortName: "ITAÚ", monthlyRate: 0.0207 }
  ],
  imovel: [
    { bank: "Caixa Econômica Federal", shortName: "CAIXA", monthlyRate: 0.0095 },
    { bank: "Banco Santander", shortName: "SANTANDER", monthlyRate: 0.0115 },
    { bank: "Bradesco", shortName: "BRADESCO", monthlyRate: 0.0145 },
    { bank: "Itaú Unibanco", shortName: "ITAÚ", monthlyRate: 0.0175 }
  ]
};

const SIMULATION_TERMS = {
  imovel: [120, 180, 240, 300, 360, 420],
  veiculo: [24, 36, 48, 60, 72, 84]
};

const MONEY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2
});

const PERCENT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const ACTION_ICON_IDS = Object.freeze({
  upRight: "icon-arrow-up-right",
  right: "icon-arrow-right",
  down: "icon-arrow-down",
  up: "icon-arrow-up"
});

let allLetters = [];
let selectedCategory = "todos";
let activeLetters = [];
let visibleLetters = 6;
let lastSimulation = null;
const simulationState = { mode: "consorcio", asset: "imovel" };

const dom = {
  cards: document.querySelector("#cards-grid"),
  status: document.querySelector("#catalogue-status"),
  tabs: [...document.querySelectorAll(".catalogue-tab")],
  search: document.querySelector("#search-input"),
  credit: document.querySelector("#credit-filter"),
  term: document.querySelector("#term-filter"),
  clear: document.querySelector("#clear-filters"),
  totalCount: document.querySelector("#total-count"),
  homeCount: document.querySelector("#home-count"),
  carCount: document.querySelector("#car-count"),
  modal: document.querySelector("#letter-modal"),
  modalClose: document.querySelector("#modal-close"),
  modalType: document.querySelector("#modal-type"),
  modalTitle: document.querySelector("#modal-title"),
  modalData: document.querySelector("#modal-data"),
  modalWhatsapp: document.querySelector("#modal-whatsapp"),
  catalogueMore: document.querySelector("#catalogue-more"),
  catalogueToggle: document.querySelector("#toggle-catalogue"),
  catalogueVisibleCount: document.querySelector("#catalogue-visible-count"),
  simulationForm: document.querySelector("#simulation-form"),
  simulationModes: [...document.querySelectorAll("[data-simulation-mode]")],
  simulationAssets: [...document.querySelectorAll("[data-simulation-asset]")],
  simulationValue: document.querySelector("#simulation-value"),
  simulationContribution: document.querySelector("#simulation-contribution"),
  simulationContributionLabel: document.querySelector("#simulation-contribution-label"),
  simulationValueLabel: document.querySelector("#simulation-value-label"),
  simulationTerm: document.querySelector("#simulation-term"),
  simulationBirthdate: document.querySelector("#simulation-birthdate"),
  simulationSubmit: document.querySelector("#simulation-submit"),
  simulationFeedback: document.querySelector("#simulation-feedback"),
  simulationResults: document.querySelector("#simulation-results")
};

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function actionIcon(name) {
  const iconId = ACTION_ICON_IDS[name];
  if (!iconId) return "";
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#${iconId}"></use></svg>`;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseBRMoney(value) {
  const source = String(value ?? "").trim();
  if (!source) return 0;

  const clean = source
    .replace(/R\$\s?/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!/\d/.test(clean)) return Number.NaN;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseTerm(value) {
  const result = String(value || "").match(/\d+/);
  return result ? Number(result[0]) : 0;
}

function hasNumericMoney(value) {
  const text = String(value ?? "").trim();
  return Boolean(/\d/.test(text) && text !== "*" && text !== "-" && Number.isFinite(parseBRMoney(text)));
}

function displayValue(value, fallback = "Sob consulta") {
  const text = String(value || "").trim();
  return text && text !== "*" && text !== "-" ? text : fallback;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r") index += 1;
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

function getColumn(headers, row, candidates) {
  const index = headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));
  return index > -1 ? row[index] || "" : "";
}

function mapSheetToLetters(csv, type) {
  const rows = parseCSV(csv).filter((row) => row.some((cell) => String(cell).trim()));
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalize);
  return rows.slice(1).map((row, index) => {
    const credit = getColumn(headers, row, ["credito"]);
    const admin = getColumn(headers, row, ["administradora"]);
    const entry = getColumn(headers, row, ["entrada"]);
    const term = getColumn(headers, row, ["saldo", "quantidade", "parcelas"]);
    const installment = getColumn(headers, row, ["parcela"]);
    const observation = getColumn(headers, row, ["observacao"]);

    return {
      id: `${type}-${index + 1}`,
      type,
      admin: admin || "Administradora sob consulta",
      credit: displayValue(credit),
      creditValue: parseBRMoney(credit),
      entry: displayValue(entry),
      entryValue: parseBRMoney(entry),
      hasEntryValue: hasNumericMoney(entry),
      term: displayValue(term),
      termValue: parseTerm(term),
      installment: displayValue(installment),
      installmentValue: parseBRMoney(installment),
      hasInstallmentValue: hasNumericMoney(installment),
      observation: displayValue(observation, "Condições disponíveis mediante consulta."),
    };
  }).filter((letter) => letter.creditValue > 0 || letter.admin !== "Administradora sob consulta");
}

async function loadPortfolio() {
  try {
    const responses = await Promise.allSettled(CRISTAL.sheets.map(async (sheet) => {
      const response = await fetch(sheet.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Planilha indisponível (${response.status})`);
      return mapSheetToLetters(await response.text(), sheet.type);
    }));

    const availableLists = responses
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    if (!availableLists.length) throw new Error("Nenhuma planilha respondeu");

    allLetters = availableLists.flat().sort((first, second) => second.creditValue - first.creditValue);
    updateCatalogueCounts();
    resetCatalogueVisibility();
    renderLetters();
    if (lastSimulation) renderSimulationResults(lastSimulation);
    restoreHashLocation();
    dom.status.innerHTML = responses.some((result) => result.status === "rejected")
      ? "<span></span> Portfólio parcial — consulte a equipe"
      : "<span></span> Portfólio ativo";
  } catch (error) {
    console.error("Não foi possível carregar as cartas:", error);
    dom.cards.setAttribute("aria-busy", "false");
    dom.cards.innerHTML = `
      <div class="catalogue-error">
        <p>Não foi possível carregar o portfólio neste momento.</p>
        <a class="text-link" href="${whatsappLink("Olá, não consegui ver as cartas disponíveis no site. Poderia me ajudar?")}" target="_blank" rel="noopener">Falar com um especialista ${actionIcon("right")}</a>
      </div>`;
    dom.status.innerHTML = "<span></span> Consulte a equipe";
  }
}

function restoreHashLocation() {
  const hash = window.location.hash;
  if (!hash || hash === "#cartas") return;
  try {
    const target = document.querySelector(hash);
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  } catch {
    // Ignora hashes externos ou malformados sem interromper o carregamento do portfólio.
  }
}

function updateCatalogueCounts() {
  const homes = allLetters.filter((letter) => letter.type === "imovel").length;
  const cars = allLetters.filter((letter) => letter.type === "veiculo").length;
  dom.totalCount.textContent = allLetters.length;
  dom.homeCount.textContent = homes;
  dom.carCount.textContent = cars;
}

function currentFilters() {
  return {
    search: normalize(dom.search.value),
    credit: dom.credit.value,
    term: dom.term.value
  };
}

function matchesCredit(value, range) {
  if (range === "all") return true;
  if (range === "under300") return value < 300000;
  if (range === "300to600") return value >= 300000 && value < 600000;
  if (range === "600to1000") return value >= 600000 && value <= 1000000;
  if (range === "over1000") return value > 1000000;
  return true;
}

function matchesTerm(value, range) {
  if (range === "all") return true;
  if (range === "upTo60") return value > 0 && value <= 60;
  if (range === "61to120") return value >= 61 && value <= 120;
  if (range === "over120") return value > 120;
  return true;
}

function getVisibleLetters() {
  const filters = currentFilters();
  return allLetters.filter((letter) => {
    const categoryMatch = selectedCategory === "todos" || letter.type === selectedCategory;
    const haystack = normalize(`${letter.admin} ${letter.credit} ${letter.entry} ${letter.observation}`);
    return categoryMatch
      && (!filters.search || haystack.includes(filters.search))
      && matchesCredit(letter.creditValue, filters.credit)
      && matchesTerm(letter.termValue, filters.term);
  });
}

function letterCard(letter, index) {
  const typeName = letter.type === "imovel" ? "Carta de imóvel" : "Carta de veículo";
  const compactTerm = letter.termValue ? `${letter.termValue} parcelas` : letter.term;
  return `
    <article class="letter-card">
      <div class="letter-card-head">
        <span class="letter-card-type">${typeName}</span>
        <small>Disponível</small>
      </div>
      <div class="letter-card-body">
        <p class="letter-admin">${escapeHTML(letter.admin)}</p>
        <h3 class="letter-credit">${escapeHTML(letter.credit)}<span>Valor do crédito</span></h3>
        <div class="letter-details">
          <div><span>Entrada</span><strong>${escapeHTML(letter.entry)}</strong></div>
          <div><span>Parcelas</span><strong>${escapeHTML(compactTerm)}</strong></div>
          <div><span>Parcela</span><strong>${escapeHTML(letter.installment)}</strong></div>
          <div><span>Administradora</span><strong>${escapeHTML(letter.admin)}</strong></div>
        </div>
        <p class="letter-observation">${escapeHTML(letter.observation)}</p>
      </div>
      <button class="letter-action" type="button" data-letter-index="${index}" aria-label="Ver detalhes da carta de ${escapeHTML(letter.admin)} no valor de ${escapeHTML(letter.credit)}">
        Ver detalhes e conversar <span class="letter-action-icon" aria-hidden="true">${actionIcon("upRight")}</span>
      </button>
    </article>`;
}

function catalogueBatchSize() {
  if (window.matchMedia("(max-width: 600px)").matches) return 3;
  if (window.matchMedia("(max-width: 1040px)").matches) return 4;
  return 6;
}

function resetCatalogueVisibility() {
  visibleLetters = catalogueBatchSize();
}

function renderLetters() {
  activeLetters = getVisibleLetters();
  dom.cards.setAttribute("aria-busy", "false");
  if (!activeLetters.length) {
    dom.cards.innerHTML = `
      <div class="catalogue-empty">
        <h3>Nenhuma carta encontrada</h3>
        <p>Ajuste os filtros ou fale com a nossa equipe para consultar outras opções do portfólio.</p>
      </div>`;
    dom.catalogueMore.hidden = true;
    return;
  }

  const initialLimit = catalogueBatchSize();
  const currentLimit = Math.max(visibleLetters, initialLimit);
  const displayedLetters = activeLetters.slice(0, currentLimit);
  dom.cards.innerHTML = displayedLetters.map(letterCard).join("");
  dom.cards.querySelectorAll("[data-letter-index]").forEach((button) => {
    button.addEventListener("click", () => openLetter(Number(button.dataset.letterIndex)));
  });

  const needsPagination = activeLetters.length > initialLimit;
  const showingAll = displayedLetters.length >= activeLetters.length;
  dom.catalogueMore.hidden = !needsPagination;
  dom.catalogueToggle.innerHTML = showingAll
    ? `Mostrar menos ${actionIcon("up")}`
    : `Ver mais cartas ${actionIcon("down")}`;
  dom.catalogueToggle.setAttribute("aria-expanded", String(showingAll));
  dom.catalogueVisibleCount.textContent = `${displayedLetters.length} de ${activeLetters.length} oportunidades exibidas`;
}

function whatsappLink(message) {
  return `https://wa.me/${CRISTAL.whatsapp}?text=${encodeURIComponent(message)}`;
}

function openLetter(index) {
  const letter = activeLetters[index];
  if (!letter) return;
  const typeName = letter.type === "imovel" ? "Carta contemplada de imóvel" : "Carta contemplada de veículo";
  const compactTerm = letter.termValue ? `${letter.termValue} parcelas` : letter.term;
  dom.modalType.textContent = typeName;
  dom.modalTitle.textContent = `${letter.credit} de crédito`;
  dom.modalData.innerHTML = [
    ["Administradora", letter.admin],
    ["Tipo", letter.type === "imovel" ? "Imóvel" : "Veículo"],
    ["Entrada", letter.entry],
    ["Parcelas", compactTerm],
    ["Valor da parcela", letter.installment],
    ["Observação", letter.observation]
  ].map(([label, value]) => `<div><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join("");
  const message = `Olá! Vi no site uma ${typeName.toLowerCase()} da ${letter.admin}, no valor de ${letter.credit}. Gostaria de receber mais informações.`;
  dom.modalWhatsapp.href = whatsappLink(message);
  dom.modal.showModal();
}

function closeLetterModal() {
  if (dom.modal.open) dom.modal.close();
}

function setCategory(category) {
  selectedCategory = category;
  dom.tabs.forEach((tab) => {
    const isActive = tab.dataset.category === category;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  resetCatalogueVisibility();
  renderLetters();
}

function clearFilters() {
  dom.search.value = "";
  dom.credit.value = "all";
  dom.term.value = "all";
  resetCatalogueVisibility();
  renderLetters();
}

function setupCatalogueControls() {
  dom.tabs.forEach((tab) => tab.addEventListener("click", () => setCategory(tab.dataset.category)));
  [dom.search, dom.credit, dom.term].forEach((control) => {
    control.addEventListener(control === dom.search ? "input" : "change", () => {
      resetCatalogueVisibility();
      renderLetters();
    });
  });
  dom.clear.addEventListener("click", clearFilters);
  dom.catalogueToggle.addEventListener("click", () => {
    const initialLimit = catalogueBatchSize();
    if (visibleLetters >= activeLetters.length) {
      visibleLetters = initialLimit;
      renderLetters();
      dom.cards.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    visibleLetters += initialLimit;
    renderLetters();
  });
  document.querySelectorAll("[data-catalog-category]").forEach((link) => {
    link.addEventListener("click", () => setCategory(link.dataset.catalogCategory));
  });

  let lastBatchSize = catalogueBatchSize();
  window.addEventListener("resize", () => {
    const nextBatchSize = catalogueBatchSize();
    if (nextBatchSize === lastBatchSize) return;
    lastBatchSize = nextBatchSize;
    resetCatalogueVisibility();
    renderLetters();
  }, { passive: true });
}

function formatCurrency(value) {
  return MONEY_FORMATTER.format(Number(value) || 0);
}

function applyMoneyMask(input) {
  const source = input.value.replace(/R\$/gi, "").trim();
  if (!source) {
    input.value = "";
    return;
  }

  const isNegative = source.startsWith("-");
  const sanitized = source.replace(/[^\d,.]/g, "");
  const commaIndex = sanitized.lastIndexOf(",");
  const hasDecimalSeparator = commaIndex >= 0;
  const rawInteger = (hasDecimalSeparator ? sanitized.slice(0, commaIndex) : sanitized)
    .replace(/\D/g, "")
    .slice(0, 13);
  const rawDecimals = hasDecimalSeparator
    ? sanitized.slice(commaIndex + 1).replace(/\D/g, "").slice(0, 2)
    : "";
  const integer = rawInteger.replace(/^0+(?=\d)/, "") || "0";
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  input.value = `${isNegative ? "-" : ""}R$ ${grouped}${hasDecimalSeparator ? `,${rawDecimals}` : ""}`;
}

function formatMoneyField(input) {
  if (!input.value.trim()) return;
  const value = parseBRMoney(input.value);
  if (Number.isFinite(value)) input.value = formatCurrency(value);
}

function fillSimulationTerms() {
  const terms = SIMULATION_TERMS[simulationState.asset];
  const currentTerm = Number(dom.simulationTerm.value);
  dom.simulationTerm.innerHTML = terms
    .map((term) => `<option value="${term}"${term === currentTerm ? " selected" : ""}>${term} meses</option>`)
    .join("");
}

function setRadioGroup(buttons, selectedValue, dataKey) {
  buttons.forEach((button) => {
    const isActive = button.dataset[dataKey] === selectedValue;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
}

function resetSimulationResults() {
  dom.simulationFeedback.textContent = "";
  [dom.simulationValue, dom.simulationContribution, dom.simulationTerm, dom.simulationBirthdate]
    .forEach((field) => field.removeAttribute("aria-invalid"));
  dom.simulationResults.hidden = true;
  dom.simulationResults.innerHTML = "";
  lastSimulation = null;
}

function applySimulationMode(mode, { preserveResults = false } = {}) {
  simulationState.mode = mode;
  setRadioGroup(dom.simulationModes, mode, "simulationMode");

  const isConsortium = mode === "consorcio";
  const isFinance = mode === "financiamento";
  dom.simulationValueLabel.textContent = isConsortium
    ? "Valor da carta de crédito"
    : isFinance ? "Valor do bem" : "Valor do bem / carta";
  dom.simulationContributionLabel.innerHTML = isConsortium
    ? 'Lance disponível <span>(opcional)</span>'
    : isFinance ? "Entrada para o financiamento" : "Entrada para financiar / lance disponível";
  dom.simulationContribution.required = !isConsortium;
  dom.simulationSubmit.innerHTML = isConsortium
    ? `Encontrar cartas reais ${actionIcon("right")}`
    : isFinance
      ? `Calcular estimativa ${actionIcon("right")}`
      : `Comparar cenários ${actionIcon("right")}`;
  if (!preserveResults) resetSimulationResults();
}

function applySimulationAsset(asset, { preserveResults = false } = {}) {
  simulationState.asset = asset;
  setRadioGroup(dom.simulationAssets, asset, "simulationAsset");
  fillSimulationTerms();
  if (!preserveResults) resetSimulationResults();
}

function setupKeyboardRadioGroup(buttons, onSelect) {
  buttons.forEach((button, index) => {
    button.addEventListener("keydown", (event) => {
      const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const next = (index + direction + buttons.length) % buttons.length;
      buttons[next].focus();
      onSelect(buttons[next]);
    });
  });
}

function monthlyRateFor(reference) {
  if (Number.isFinite(reference.monthlyRate) && reference.monthlyRate >= 0) return reference.monthlyRate;
  if (Number.isFinite(reference.annualRate) && reference.annualRate >= 0) {
    return Math.pow(1 + reference.annualRate, 1 / 12) - 1;
  }
  return null;
}

function annualEquivalent(monthlyRate) {
  return Math.pow(1 + monthlyRate, 12) - 1;
}

function formatMonthlyRate(monthlyRate) {
  return `${PERCENT_FORMATTER.format(monthlyRate)} a.m.`;
}

function calculateFinancing({ assetValue, downPayment, monthlyRate, termMonths }) {
  const values = [assetValue, downPayment, monthlyRate, termMonths];
  if (!values.every(Number.isFinite)) return null;
  if (assetValue <= 0 || downPayment < 0 || downPayment >= assetValue) return null;
  if (monthlyRate < 0 || !Number.isInteger(termMonths) || termMonths <= 0) return null;

  const financedAmount = assetValue - downPayment;
  let monthlyPayment;
  if (monthlyRate === 0) {
    monthlyPayment = financedAmount / termMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    if (!Number.isFinite(factor) || factor <= 1) return null;
    monthlyPayment = financedAmount * monthlyRate * factor / (factor - 1);
  }

  const totalInstallments = monthlyPayment * termMonths;
  const totalInterest = totalInstallments - financedAmount;
  const totalCustomerOutlay = downPayment + totalInstallments;
  const additionalCostOverAsset = totalCustomerOutlay - assetValue;
  if (![monthlyPayment, totalInstallments, totalInterest, totalCustomerOutlay, additionalCostOverAsset].every(Number.isFinite)) return null;

  return {
    assetValue,
    downPayment,
    financedAmount,
    monthlyRate,
    annualRate: annualEquivalent(monthlyRate),
    termMonths,
    monthlyPayment,
    totalInstallments,
    totalInterest,
    totalCustomerOutlay,
    additionalCostOverAsset
  };
}

function calculateFinanceOptions(asset, value, entry, term) {
  const profiles = FINANCE_SIMULATION_PROFILES[asset] || [];
  return profiles.map((reference) => {
    const monthlyRate = monthlyRateFor(reference);
    const calculation = monthlyRate === null ? null : calculateFinancing({
      assetValue: value,
      downPayment: entry,
      monthlyRate,
      termMonths: term
    });
    return calculation ? { ...reference, ...calculation } : null;
  }).filter(Boolean).sort((first, second) => first.totalCustomerOutlay - second.totalCustomerOutlay);
}

function nearbyLetters(asset, value, term, limit = 3) {
  return allLetters
    .filter((letter) => letter.type === asset && letter.creditValue > 0)
    .sort((first, second) => {
      const valueDifference = Math.abs(first.creditValue - value) - Math.abs(second.creditValue - value);
      if (valueDifference !== 0) return valueDifference;
      return Math.abs(first.termValue - term) - Math.abs(second.termValue - term);
    })
    .slice(0, limit);
}

function summaryItem(label, value) {
  return `<div><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
}

function resultSummary(data) {
  const contributionLabel = data.mode === "consorcio"
    ? "Lance informado"
    : data.mode === "comparar" ? "Entrada / lance" : "Entrada informada";
  const items = data.mode === "consorcio" ? [
    ["Objetivo", data.asset === "imovel" ? "Imóvel" : "Automóvel"],
    ["Crédito procurado", formatCurrency(data.value)],
    [contributionLabel, data.contribution > 0 ? formatCurrency(data.contribution) : "Não informado"],
    ["Prazo desejado", `${data.term} meses`]
  ] : [
    ["Valor do bem", formatCurrency(data.value)],
    [contributionLabel, formatCurrency(data.contribution)],
    ["Valor financiado", formatCurrency(data.value - data.contribution)],
    ["Prazo desejado", `${data.term} meses`]
  ];
  return `<div class="result-summary">${items.map(([label, value]) => summaryItem(label, value)).join("")}</div>`;
}

function simulationDisclaimer(mode) {
  const consortiumNotice = mode !== "financiamento"
    ? " No consórcio, o total só aparece quando a carta publicada contém entrada, parcela e prazo numéricos; mesmo assim, é apenas uma projeção aritmética e não inclui reajustes ou condições contratuais não informadas."
    : "";
  return `<div class="reference-notice" role="note"><span>i</span><p><strong>Importante:</strong> esta é uma simulação estimativa. As taxas usadas são perfis demonstrativos configurados no site e não ofertas comerciais atuais. Taxas, parcelas e condições podem variar conforme instituição financeira, perfil de crédito e condições vigentes no momento da contratação. CET, seguros, tarifas e indexadores não estão incluídos.${consortiumNotice}</p></div>`;
}

function financeResultCard(result, index, lowestTotal) {
  const differenceFromLowest = Math.max(0, result.totalCustomerOutlay - lowestTotal);
  return `
    <article class="finance-result-card${index === 0 ? " is-lowest" : ""}"
      data-bank="${escapeHTML(result.shortName)}"
      data-asset-value="${result.assetValue}"
      data-down-payment="${result.downPayment}"
      data-financed-amount="${result.financedAmount}"
      data-monthly-payment="${result.monthlyPayment}"
      data-total-installments="${result.totalInstallments}"
      data-total-interest="${result.totalInterest}"
      data-total-customer-outlay="${result.totalCustomerOutlay}">
      <header class="finance-card-head">
        <div><span class="finance-rank">${String(index + 1).padStart(2, "0")}</span><h4>${escapeHTML(result.bank)}</h4></div>
        <span class="result-badge">${index === 0 ? "Menor custo total" : `${index + 1}º menor total`}</span>
      </header>
      <p class="finance-rate"><strong>${formatMonthlyRate(result.monthlyRate)}</strong><span>${PERCENT_FORMATTER.format(result.annualRate)} a.a. equivalente</span></p>
      <div class="finance-total">
        <span>Total pago ao final</span>
        <strong>${formatCurrency(result.totalCustomerOutlay)}</strong>
        <small>Você desembolsa ${formatCurrency(result.additionalCostOverAsset)} além do valor do bem.</small>
      </div>
      <div class="finance-payment">
        <span>Parcela mensal estimada</span>
        <strong>${formatCurrency(result.monthlyPayment)}</strong>
        <small>${result.termMonths} parcelas pelo sistema Price</small>
      </div>
      <dl class="finance-detail-grid">
        <div><dt>Valor do bem</dt><dd>${formatCurrency(result.assetValue)}</dd></div>
        <div><dt>Entrada</dt><dd>${formatCurrency(result.downPayment)}</dd></div>
        <div><dt>Valor financiado</dt><dd>${formatCurrency(result.financedAmount)}</dd></div>
        <div><dt>Total das parcelas</dt><dd>${formatCurrency(result.totalInstallments)}</dd></div>
        <div><dt>Juros totais</dt><dd>${formatCurrency(result.totalInterest)}</dd></div>
        <div><dt>Diferença para o menor</dt><dd>${index === 0 ? "Referência desta simulação" : `+ ${formatCurrency(differenceFromLowest)}`}</dd></div>
      </dl>
      <p class="bank-disclaimer">Perfil demonstrativo — não é oferta ou cotação atual da instituição.</p>
    </article>`;
}

function financeResultsGrid(results) {
  if (!results.length) return "";
  const lowestTotal = results[0].totalCustomerOutlay;
  return `
    <section class="finance-comparison-panel" aria-labelledby="finance-comparison-title">
      <header class="finance-comparison-head">
        <div><span>COMPARATIVO BANCÁRIO</span><h4 id="finance-comparison-title">Do menor para o maior custo total</h4></div>
        <p>O destaque considera entrada + soma das parcelas. Compare o que sai do seu bolso, não apenas o valor da parcela.</p>
      </header>
      <div class="finance-result-grid">${results.map((result, index) => financeResultCard(result, index, lowestTotal)).join("")}</div>
    </section>`;
}

function calculateConsortiumProjection(letter) {
  if (!letter) return null;
  if (!letter.hasEntryValue || !letter.hasInstallmentValue) return null;
  if (!Number.isFinite(letter.entryValue) || letter.entryValue < 0) return null;
  if (!Number.isFinite(letter.installmentValue) || letter.installmentValue <= 0) return null;
  if (!Number.isFinite(letter.termValue) || letter.termValue <= 0) return null;
  const totalInstallments = letter.installmentValue * letter.termValue;
  const totalCustomerOutlay = letter.entryValue + totalInstallments;
  if (![totalInstallments, totalCustomerOutlay].every(Number.isFinite)) return null;
  return { totalInstallments, totalCustomerOutlay };
}

function comparisonSection(data, opportunities, financeResults) {
  const letter = opportunities[0];
  const lowestFinance = financeResults[0] || null;
  const consortiumProjection = calculateConsortiumProjection(letter);
  const comparableCredit = Boolean(letter)
    && Number.isFinite(letter.creditValue)
    && Math.abs(letter.creditValue - data.value) < 0.01;

  const consortiumContent = letter ? `
    <p class="comparison-source">Oportunidade real mais próxima no portfólio</p>
    <h4>${escapeHTML(letter.admin)}</h4>
    <div class="comparison-list">
      ${summaryItem("Crédito real", letter.credit)}
      ${summaryItem("Entrada da carta", letter.entry)}
      ${summaryItem("Parcela informada", letter.installment)}
      ${summaryItem("Prazo real", letter.termValue ? `${letter.termValue} parcelas` : letter.term)}
      ${summaryItem("Total aritmético", consortiumProjection ? formatCurrency(consortiumProjection.totalCustomerOutlay) : "Não calculável")}
    </div>
    <p class="comparison-footnote">${consortiumProjection
      ? "Projeção feita somente com entrada + parcela publicada × prazo restante. O lance informado não altera a carta; reajustes, fundo de reserva, seguros e demais condições contratuais devem ser confirmados."
      : "A carta publicada não traz entrada, parcela e prazo numéricos suficientes para formar um total. Por isso, nenhuma economia foi estimada. Consulte a equipe para receber o demonstrativo contratual."}</p>` : `
    <h4>Nenhuma carta real localizada</h4>
    <p class="comparison-empty">O portfólio desta categoria ainda está carregando ou não possui uma oportunidade compatível agora. Fale com a equipe para uma busca personalizada.</p>`;

  const financeContent = lowestFinance ? `
    <p class="comparison-source">Menor desembolso total entre os perfis demonstrativos</p>
    <h4>${escapeHTML(lowestFinance.bank)}</h4>
    <div class="comparison-list">
      ${summaryItem("Total pago ao final", formatCurrency(lowestFinance.totalCustomerOutlay))}
      ${summaryItem("Parcela mensal", formatCurrency(lowestFinance.monthlyPayment))}
      ${summaryItem("Juros totais", formatCurrency(lowestFinance.totalInterest))}
      ${summaryItem("Taxa demonstrativa", formatMonthlyRate(lowestFinance.monthlyRate))}
    </div>
    <p class="comparison-footnote">Sistema Price em ${lowestFinance.termMonths} meses. O total inclui a entrada informada e não inclui CET, seguros, tarifas ou indexadores.</p>` : `
    <h4>Estimativa indisponível</h4>
    <p class="comparison-empty">Ainda não há uma taxa numérica cadastrada para calcular este cenário.</p>`;

  let conclusionTitle = "Diferença pendente de análise";
  let conclusionCopy = "O financiamento tem total estimado, mas esta carta não possui todos os valores necessários para uma comparação responsável. A equipe pode confirmar o custo contratual do consórcio.";
  let conclusionValue = "Não calculável";
  if (consortiumProjection && lowestFinance && comparableCredit) {
    const difference = consortiumProjection.totalCustomerOutlay - lowestFinance.totalCustomerOutlay;
    conclusionValue = formatCurrency(Math.abs(difference));
    if (Math.abs(difference) < 0.005) {
      conclusionTitle = "Totais aritméticos equivalentes";
      conclusionCopy = "Nesta fotografia dos dados, os totais são equivalentes. Isso não considera reajustes ou custos contratuais não publicados.";
    } else if (difference < 0) {
      conclusionTitle = "Projeção do consórcio abaixo do financiamento";
      conclusionCopy = "Diferença aritmética estimada, sem garantia de economia. Confirme reajustes, taxas e condições contratuais antes de decidir.";
    } else {
      conclusionTitle = "Projeção do consórcio acima do financiamento";
      conclusionCopy = "Diferença aritmética estimada, sem representar proposta. Confirme reajustes, taxas e condições contratuais antes de decidir.";
    }
  } else if (consortiumProjection && lowestFinance && !comparableCredit) {
    conclusionCopy = `A carta real mais próxima tem crédito de ${formatCurrency(letter.creditValue)}, diferente dos ${formatCurrency(data.value)} informados. Os totais aparecem para consulta, mas não foram subtraídos porque não representam o mesmo valor de crédito.`;
  }

  return `
    <section class="comparison-section" aria-labelledby="paths-comparison-title">
      <header class="comparison-heading"><span>CONSÓRCIO × FINANCIAMENTO</span><h4 id="paths-comparison-title">Dois caminhos, com premissas diferentes</h4></header>
      <div class="comparison-grid">
      <article class="comparison-card cristal-comparison">
        <span class="comparison-kicker">Consórcio · dado real</span>
        ${consortiumContent}
      </article>
      <article class="comparison-card finance-comparison">
        <span class="comparison-kicker">Financiamento · estimativa Price</span>
        ${financeContent}
      </article>
      </div>
      <div class="comparison-conclusion${consortiumProjection && comparableCredit ? " is-calculable" : ""}">
        <div><span>Leitura responsável</span><h4>${conclusionTitle}</h4><p>${conclusionCopy}</p></div>
        <div class="comparison-difference"><span>Diferença entre os totais</span><strong>${conclusionValue}</strong></div>
      </div>
    </section>`;
}

function opportunitiesSection(opportunities, asset) {
  const title = asset === "imovel" ? "Cartas de imóvel próximas do seu objetivo" : "Cartas de veículo próximas do seu objetivo";
  if (!opportunities.length) {
    const copy = allLetters.length
      ? "Não encontramos uma carta real desta categoria no portfólio atual. A equipe pode verificar novas disponibilidades para você."
      : "O portfólio ainda está carregando ou está temporariamente indisponível. A estimativa financeira acima continua válida apenas como referência.";
    return `
      <section class="result-opportunities">
        <div class="result-opportunities-header"><div><h4>${title}</h4><p>${copy}</p></div></div>
      </section>`;
  }

  return `
    <section class="result-opportunities">
      <div class="result-opportunities-header">
        <div><h4>${title}</h4><p>Dados reais carregados do portfólio da Cristal, ordenados pela proximidade do valor informado.</p></div>
      </div>
      <div class="opportunity-grid">
        ${opportunities.map((letter) => `
          <article class="opportunity-card">
            <small>${escapeHTML(letter.admin)}</small>
            <strong>${escapeHTML(letter.credit)}</strong>
            <span>Entrada: ${escapeHTML(letter.entry)}</span>
            <span>Parcela: ${escapeHTML(letter.installment)}</span>
            <span>Prazo: ${escapeHTML(letter.termValue ? `${letter.termValue} parcelas` : letter.term)}</span>
          </article>`).join("")}
      </div>
    </section>`;
}

function resultActions(data) {
  const assetName = data.asset === "imovel" ? "imóvel" : "automóvel";
  const context = data.mode === "comparar"
    ? "uma comparação entre consórcio e financiamento"
    : data.mode === "financiamento" ? "uma estimativa de financiamento" : "uma busca de carta contemplada";
  const contribution = data.contribution > 0
    ? `, com ${data.mode === "consorcio" ? "lance" : data.mode === "comparar" ? "entrada/lance" : "entrada"} de ${formatCurrency(data.contribution)}`
    : "";
  const message = `Olá! Fiz ${context} no site para ${assetName}, no valor de ${formatCurrency(data.value)}${contribution}, em ${data.term} meses. Gostaria de falar com um especialista.`;
  return `
    <div class="result-cta">
      <a class="button button-gold" href="${whatsappLink(message)}" target="_blank" rel="noopener">Falar com um especialista ${actionIcon("upRight")}</a>
      <button class="button button-outline" type="button" id="simulation-view-all">Ver cartas disponíveis ${actionIcon("down")}</button>
      <button class="result-again" type="button" id="simulation-again">Comparar novamente</button>
    </div>`;
}

function bindSimulationResultActions(data) {
  document.querySelector("#simulation-view-all")?.addEventListener("click", () => {
    dom.search.value = "";
    dom.credit.value = "all";
    dom.term.value = "all";
    setCategory(data.asset);
    document.querySelector("#cartas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#simulation-again")?.addEventListener("click", () => {
    dom.simulationForm.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => dom.simulationValue.focus(), 350);
  });
}

function renderSimulationResults(data) {
  const opportunities = nearbyLetters(data.asset, data.value, data.term);
  const financeResults = data.mode === "consorcio"
    ? []
    : calculateFinanceOptions(data.asset, data.value, data.contribution, data.term);
  const headings = {
    consorcio: ["Oportunidades reais para o seu objetivo", "Não calculamos condições fictícias: os dados abaixo vêm do portfólio disponível."],
    financiamento: ["Estimativa do seu financiamento", "Compare referências bancárias em um único cenário, pelo sistema Price."],
    comparar: ["Veja os dois caminhos lado a lado", "A carta usa dados reais do portfólio; o financiamento é apenas uma estimativa de referência."]
  };
  const [title, description] = headings[data.mode];

  dom.simulationResults.innerHTML = `
    <header class="result-head">
      <div><p class="eyebrow">RESULTADO DA SUA ANÁLISE</p><h3>${title}</h3></div>
      <p>${description}</p>
    </header>
    ${resultSummary(data)}
    ${simulationDisclaimer(data.mode)}
    ${data.mode !== "consorcio" ? financeResultsGrid(financeResults) : ""}
    ${data.mode === "comparar" ? comparisonSection(data, opportunities, financeResults) : ""}
    ${opportunitiesSection(opportunities, data.asset)}
    ${resultActions(data)}`;
  dom.simulationResults.hidden = false;
  bindSimulationResultActions(data);
}

function validateSimulation() {
  const mode = simulationState.mode;
  const value = parseBRMoney(dom.simulationValue.value);
  const contribution = parseBRMoney(dom.simulationContribution.value);
  const term = Number(dom.simulationTerm.value);
  const birthdate = dom.simulationBirthdate.value;
  const parsedBirthdate = birthdate ? new Date(`${birthdate}T12:00:00`) : null;
  const today = new Date();

  if (!Number.isFinite(value) || value <= 0) {
    return { error: "Informe um valor maior que zero para continuar.", field: dom.simulationValue };
  }
  if (mode !== "consorcio" && !dom.simulationContribution.value.trim()) {
    return { error: "Informe a entrada. Se não houver, digite 0.", field: dom.simulationContribution };
  }
  if (!Number.isFinite(contribution) || contribution < 0) {
    return { error: "A entrada ou o lance não pode ser negativo.", field: dom.simulationContribution };
  }
  if (contribution >= value) {
    return { error: "A entrada ou o lance precisa ser menor que o valor informado.", field: dom.simulationContribution };
  }
  if (!SIMULATION_TERMS[simulationState.asset].includes(term)) {
    return { error: "Selecione um prazo disponível para esse tipo de bem.", field: dom.simulationTerm };
  }
  if (!parsedBirthdate || Number.isNaN(parsedBirthdate.getTime()) || parsedBirthdate >= today) {
    return { error: "Informe uma data de nascimento válida.", field: dom.simulationBirthdate };
  }

  return { mode, asset: simulationState.asset, value, contribution, term };
}

function setupSimulation() {
  const selectMode = (button) => applySimulationMode(button.dataset.simulationMode);
  const selectAsset = (button) => applySimulationAsset(button.dataset.simulationAsset);

  dom.simulationModes.forEach((button) => button.addEventListener("click", () => selectMode(button)));
  dom.simulationAssets.forEach((button) => button.addEventListener("click", () => selectAsset(button)));
  setupKeyboardRadioGroup(dom.simulationModes, selectMode);
  setupKeyboardRadioGroup(dom.simulationAssets, selectAsset);
  [dom.simulationValue, dom.simulationContribution].forEach((input) => {
    input.addEventListener("input", () => {
      applyMoneyMask(input);
      resetSimulationResults();
    });
    input.addEventListener("blur", () => formatMoneyField(input));
  });
  dom.simulationTerm.addEventListener("change", resetSimulationResults);
  dom.simulationBirthdate.addEventListener("input", resetSimulationResults);

  const today = new Date();
  dom.simulationBirthdate.max = today.toISOString().slice(0, 10);
  applySimulationAsset(simulationState.asset, { preserveResults: true });
  applySimulationMode(simulationState.mode, { preserveResults: true });

  dom.simulationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    dom.simulationFeedback.textContent = "";
    const data = validateSimulation();
    if (data.error) {
      dom.simulationFeedback.textContent = data.error;
      data.field?.setAttribute("aria-invalid", "true");
      data.field?.focus();
      return;
    }

    // A data de nascimento é validada no navegador e deliberadamente descartada aqui.
    lastSimulation = data;
    renderSimulationResults(data);
    dom.simulationResults.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupNavigation() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  const updateHeader = () => header.classList.toggle("is-stuck", window.scrollY > 12);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const mobileNavigation = window.matchMedia("(max-width: 780px)");
  const setMenuState = (isOpen) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    nav.classList.toggle("open", isOpen);
    nav.toggleAttribute("inert", mobileNavigation.matches && !isOpen);
  };
  const closeMenu = () => setMenuState(false);
  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("click", (event) => {
    if (!nav.classList.contains("open") || nav.contains(event.target) || toggle.contains(event.target)) return;
    closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !nav.classList.contains("open")) return;
    closeMenu();
    toggle.focus();
  });
  mobileNavigation.addEventListener("change", () => setMenuState(false));
  setMenuState(false);
}

function setupReveals() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealElements = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("show"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .14 });
  revealElements.forEach((element) => observer.observe(element));
}

function animateNumber(element) {
  const target = Number(element.dataset.count || 0);
  const prefix = element.dataset.prefix || "";
  const suffix = element.dataset.suffix || "";
  const duration = 1250;
  const started = performance.now();
  const update = (now) => {
    const progress = Math.min((now - started) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(target * eased);
    element.textContent = `${prefix}${current.toLocaleString("pt-BR")}${suffix}`;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function setupCounterAnimation() {
  const items = document.querySelectorAll("[data-count]");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateNumber(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .55 });
  items.forEach((item) => observer.observe(item));
}

function setupLeadForm() {
  const form = document.querySelector("#lead-form");
  const feedback = document.querySelector("#form-feedback");
  const phone = document.querySelector("#lead-phone");

  phone.addEventListener("input", () => {
    const digits = phone.value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) phone.value = digits ? `(${digits}` : "";
    else if (digits.length <= 6) phone.value = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    else if (digits.length <= 10) phone.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    else phone.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.classList.remove("error");
    if (!form.checkValidity()) {
      feedback.textContent = "Preencha os campos obrigatórios para continuar.";
      feedback.classList.add("error");
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const name = data.get("nome");
    const interest = data.get("interesse");
    const phoneValue = data.get("telefone");
    const lead = {
      nome: name,
      telefone: phoneValue,
      interesse: interest,
      pagina: window.location.href,
      origem: "site-cristal-novo",
      data: new Date().toISOString()
    };

    // Mantém a mesma integração de leads utilizada no site atual.
    if (CRISTAL.leadsEndpoint) {
      fetch(CRISTAL.leadsEndpoint, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(lead)
      }).catch(() => {});
    }

    feedback.textContent = "Perfeito. Vamos abrir o WhatsApp para você falar com a equipe.";
    const message = `Olá! Meu nome é ${name}. Tenho interesse em ${interest.toLowerCase()} e gostaria de receber orientação. Meu WhatsApp é ${phoneValue}.`;
    window.setTimeout(() => window.open(whatsappLink(message), "_blank", "noopener"), 250);
    form.reset();
  });
}

function setupWhatsappFloatAvoidance() {
  const button = document.querySelector(".whatsapp-float");
  if (!button) return;

  const protectedSelectors = [
    ".service-card",
    ".letter-card",
    ".simulation-form",
    ".simulation-results",
    ".filter-panel",
    ".catalogue-more",
    ".catalogue-bottom",
    ".article-grid",
    ".contact",
    ".site-footer"
  ].join(",");
  let animationFrame = 0;

  const rectanglesOverlap = (first, second) => (
    first.left < second.right + 8
    && first.right > second.left - 8
    && first.top < second.bottom + 8
    && first.bottom > second.top - 8
  );

  const update = () => {
    animationFrame = 0;
    const buttonRect = button.getBoundingClientRect();
    const shouldHide = [...document.querySelectorAll(protectedSelectors)].some((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rectanglesOverlap(buttonRect, rect);
    });
    button.classList.toggle("is-obscuring", shouldHide);
  };

  const scheduleUpdate = () => {
    if (animationFrame) return;
    animationFrame = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(dom.cards, { childList: true, subtree: true });
  observer.observe(dom.simulationResults, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  document.fonts?.ready.then(scheduleUpdate);
  scheduleUpdate();
}

function setupCookies() {
  const banner = document.querySelector("#cookie-banner");
  const button = document.querySelector("#accept-cookies");
  const consentCookie = "cristal_cookie_notice=accepted";
  const hasConsent = () => {
    try {
      return localStorage.getItem("cristal-cookie-notice") === "accepted"
        || document.cookie.split(";").some((cookie) => cookie.trim() === consentCookie);
    } catch {
      return false;
    }
  };
  const dismiss = () => {
    // A classe e o atributo tornam o fechamento imediato, inclusive se o storage do navegador estiver bloqueado.
    banner.classList.add("is-dismissed");
    banner.setAttribute("hidden", "");
    banner.setAttribute("aria-hidden", "true");
    try {
      localStorage.setItem("cristal-cookie-notice", "accepted");
      document.cookie = "cristal_cookie_notice=accepted; max-age=31536000; path=/; SameSite=Lax";
    } catch {}
  };

  if (!hasConsent()) banner.hidden = false;
  else dismiss();
  button.addEventListener("click", dismiss, { once: true });
}

function setupModal() {
  dom.modalClose.addEventListener("click", closeLetterModal);
  dom.modal.addEventListener("click", (event) => {
    if (event.target === dom.modal) closeLetterModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLetterModal();
  });
}

function init() {
  document.querySelector("#current-year").textContent = new Date().getFullYear();
  setupNavigation();
  setupCatalogueControls();
  setupSimulation();
  setupReveals();
  setupCounterAnimation();
  setupLeadForm();
  setupCookies();
  setupModal();
  setupWhatsappFloatAvoidance();
  loadPortfolio();
}

document.addEventListener("DOMContentLoaded", init);
