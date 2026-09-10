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

let allLetters = [];
let selectedCategory = "todos";
let activeLetters = [];

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
  modalWhatsapp: document.querySelector("#modal-whatsapp")
};

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseBRMoney(value) {
  const clean = String(value || "")
    .replace(/R\$\s?/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  return Number(clean) || 0;
}

function parseTerm(value) {
  const result = String(value || "").match(/\d+/);
  return result ? Number(result[0]) : 0;
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
      term: displayValue(term),
      termValue: parseTerm(term),
      installment: displayValue(installment),
      observation: displayValue(observation, "Condições disponíveis mediante consulta."),
    };
  }).filter((letter) => letter.creditValue > 0 || letter.admin !== "Administradora sob consulta");
}

async function loadPortfolio() {
  try {
    const responses = await Promise.all(CRISTAL.sheets.map(async (sheet) => {
      const response = await fetch(sheet.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Planilha indisponível (${response.status})`);
      return mapSheetToLetters(await response.text(), sheet.type);
    }));

    allLetters = responses.flat().sort((first, second) => second.creditValue - first.creditValue);
    updateCatalogueCounts();
    renderLetters();
    restoreHashLocation();
    dom.status.innerHTML = "<span></span> Portfólio ativo";
  } catch (error) {
    console.error("Não foi possível carregar as cartas:", error);
    dom.cards.setAttribute("aria-busy", "false");
    dom.cards.innerHTML = `
      <div class="catalogue-error">
        <p>Não foi possível carregar o portfólio neste momento.</p>
        <a class="text-link" href="${whatsappLink("Olá, não consegui ver as cartas disponíveis no site. Poderia me ajudar?")}" target="_blank" rel="noopener">Falar com um especialista <span aria-hidden="true">→</span></a>
      </div>`;
    dom.status.innerHTML = "<span></span> Consulte a equipe";
  }
}

function restoreHashLocation() {
  const hash = window.location.hash;
  if (!hash || hash === "#cartas") return;
  const target = document.querySelector(hash);
  if (target) requestAnimationFrame(() => target.scrollIntoView());
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
        Ver detalhes e conversar <span aria-hidden="true">↗</span>
      </button>
    </article>`;
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
    return;
  }

  dom.cards.innerHTML = activeLetters.map(letterCard).join("");
  dom.cards.querySelectorAll("[data-letter-index]").forEach((button) => {
    button.addEventListener("click", () => openLetter(Number(button.dataset.letterIndex)));
  });
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
  renderLetters();
}

function clearFilters() {
  dom.search.value = "";
  dom.credit.value = "all";
  dom.term.value = "all";
  renderLetters();
}

function setupCatalogueControls() {
  dom.tabs.forEach((tab) => tab.addEventListener("click", () => setCategory(tab.dataset.category)));
  [dom.search, dom.credit, dom.term].forEach((control) => {
    control.addEventListener(control === dom.search ? "input" : "change", renderLetters);
  });
  dom.clear.addEventListener("click", clearFilters);
  document.querySelectorAll("[data-catalog-category]").forEach((link) => {
    link.addEventListener("click", () => setCategory(link.dataset.catalogCategory));
  });
}

function setupNavigation() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  const updateHeader = () => header.classList.toggle("is-stuck", window.scrollY > 12);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("open", !isOpen);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  }));
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

function setupCookies() {
  const banner = document.querySelector("#cookie-banner");
  const button = document.querySelector("#accept-cookies");
  try {
    if (!localStorage.getItem("cristal-cookie-notice")) banner.hidden = false;
  } catch {
    banner.hidden = false;
  }
  button.addEventListener("click", () => {
    try { localStorage.setItem("cristal-cookie-notice", "accepted"); } catch {}
    banner.hidden = true;
  });
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
  setupReveals();
  setupCounterAnimation();
  setupLeadForm();
  setupCookies();
  setupModal();
  loadPortfolio();
}

document.addEventListener("DOMContentLoaded", init);
