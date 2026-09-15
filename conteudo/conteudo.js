(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setupMenu() {
    const toggle = document.querySelector("[data-content-menu-toggle]");
    const menu = document.querySelector("[data-content-menu]");
    if (!toggle || !menu) return;

    const mobile = window.matchMedia("(max-width: 780px)");
    const setOpen = (open) => {
      const shouldOpen = Boolean(open && mobile.matches);
      toggle.setAttribute("aria-expanded", String(shouldOpen));
      toggle.setAttribute("aria-label", shouldOpen ? "Fechar menu" : "Abrir menu");
      menu.classList.toggle("open", shouldOpen);
      menu.toggleAttribute("inert", mobile.matches && !shouldOpen);
    };

    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
    document.addEventListener("click", (event) => {
      if (!menu.classList.contains("open") || menu.contains(event.target) || toggle.contains(event.target)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !menu.classList.contains("open")) return;
      setOpen(false);
      toggle.focus();
    });
    mobile.addEventListener("change", () => setOpen(false));
    setOpen(false);
  }

  function setupFilters() {
    const buttons = [...document.querySelectorAll("[data-filter]")];
    const cards = [...document.querySelectorAll("[data-category]")];
    const empty = document.querySelector("[data-filter-empty]");
    if (!buttons.length || !cards.length) return;

    const applyFilter = (value) => {
      let visible = 0;
      cards.forEach((card) => {
        const matches = value === "todos" || card.dataset.category === value;
        card.hidden = !matches;
        card.classList.toggle("is-filtered-out", !matches);
        if (matches) visible += 1;
      });
      buttons.forEach((button) => {
        const active = button.dataset.filter === value;
        button.setAttribute("aria-pressed", String(active));
        button.classList.toggle("is-active", active);
      });
      if (empty) {
        empty.hidden = visible > 0;
        empty.classList.toggle("is-visible", visible === 0);
      }
    };

    buttons.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.filter || "todos")));
    applyFilter(buttons.find((button) => button.getAttribute("aria-pressed") === "true")?.dataset.filter || "todos");
  }

  function setupReveals() {
    const elements = [...document.querySelectorAll("[data-reveal], .reveal")];
    if (!elements.length) return;
    if (!("IntersectionObserver" in window) || reducedMotion.matches) {
      elements.forEach((element) => element.classList.add("show", "is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("show", "is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });
    elements.forEach((element) => observer.observe(element));
  }

  function setupToc() {
    const links = [...document.querySelectorAll(".article-toc a[href^='#']")];
    if (!links.length) return;
    const targetFor = (link) => {
      const rawId = link.getAttribute("href").slice(1);
      try { return document.getElementById(decodeURIComponent(rawId)); } catch { return document.getElementById(rawId); }
    };

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const target = targetFor(link);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        history.replaceState(null, "", link.getAttribute("href"));
      });
    });

    if (!("IntersectionObserver" in window)) return;
    const sections = links
      .map(targetFor)
      .filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0];
      if (!current) return;
      links.forEach((link) => link.toggleAttribute("aria-current", link.getAttribute("href") === `#${current.target.id}`));
    }, { rootMargin: "-18% 0px -68% 0px", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }

  function setupFloatingWhatsapp() {
    const button = document.querySelector("[data-floating-whatsapp]");
    const protectedElements = [...document.querySelectorAll([
      "[data-whatsapp-avoid]",
      "main h1",
      "main h2",
      "main h3",
      "main p",
      "main li",
      "main a",
      "main button",
      "main img",
      ".site-footer"
    ].join(","))];
    if (!button || !protectedElements.length) return;

    let frame = 0;
    const overlaps = (first, second) => (
      first.left < second.right + 8
      && first.right > second.left - 8
      && first.top < second.bottom + 8
      && first.bottom > second.top - 8
    );
    const update = () => {
      frame = 0;
      const buttonBox = button.getBoundingClientRect();
      const obscuring = protectedElements.some((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && overlaps(buttonBox, box);
      });
      button.classList.toggle("is-obscuring", obscuring);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(schedule);
      protectedElements.forEach((element) => observer.observe(element));
    }
    document.fonts?.ready.then(schedule);
    schedule();
  }

  function setupYear() {
    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  }

  setupMenu();
  setupFilters();
  setupReveals();
  setupToc();
  setupFloatingWhatsapp();
  setupYear();
})();
