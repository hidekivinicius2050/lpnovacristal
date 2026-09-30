/* Contrato público usado pelo Excel e pelo catálogo. Somente preços finais. */
(function (root) {
  "use strict";
  const fields = ["id", "type", "admin", "credit", "entry", "term", "installment", "observation"];
  function readPublished(document) {
    if (!document || document.schemaVersion !== 1 || !Array.isArray(document.letters)) {
      throw new Error("Formato do catálogo inválido");
    }
    const ids = new Set();
    const letters = document.letters.map((letter) => {
      if (!letter || Object.keys(letter).some((key) => !fields.includes(key))) throw new Error("Campos não permitidos no catálogo");
      if (typeof letter.id !== "string" || !/^c-[a-zA-Z0-9-]{1,80}$/.test(letter.id) || ids.has(letter.id)) throw new Error("Código de carta inválido ou repetido");
      ids.add(letter.id);
      if (!["imovel", "veiculo"].includes(letter.type) || typeof letter.admin !== "string" || !letter.admin.trim()) throw new Error("Categoria ou administradora inválida");
      if (!Number.isFinite(letter.credit) || letter.credit <= 0 || !Number.isInteger(letter.term) || letter.term <= 0 || !Number.isFinite(letter.installment) || letter.installment <= 0) throw new Error("Dados da carta incompletos");
      if (letter.entry !== null && (!Number.isFinite(letter.entry) || letter.entry < 0)) throw new Error("Entrada inválida");
      if (typeof letter.observation !== "string") throw new Error("Observação inválida");
      return {...letter, admin: letter.admin.trim()};
    });
    return {letters, updatedAt: document.updatedAt || null};
  }
  root.CristalCatalogue = Object.freeze({readPublished});
  if (typeof module !== "undefined" && module.exports) module.exports = root.CristalCatalogue;
})(typeof globalThis !== "undefined" ? globalThis : window);
