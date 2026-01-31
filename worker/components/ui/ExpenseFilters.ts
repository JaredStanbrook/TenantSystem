export const initExpenseFilters = () => {
  const grid = document.getElementById("expense-grid");
  const filters = document.getElementById("expense-search")?.closest(".rounded-2xl");
  if (!grid || !filters || filters.getAttribute("data-filters-init") === "true") return;
  filters.setAttribute("data-filters-init", "true");

  const search = document.getElementById("expense-search") as HTMLInputElement | null;
  const status = document.getElementById("expense-status") as HTMLSelectElement | null;
  const type = document.getElementById("expense-type") as HTMLSelectElement | null;
  const reset = document.getElementById("expense-reset") as HTMLButtonElement | null;
  const empty = document.getElementById("expense-empty");
  const cards = Array.from(grid.querySelectorAll(".expense-card"));

  const applyFilters = (opts: { range?: string } = {}) => {
    const query = (search?.value || "").trim().toLowerCase();
    const statusVal = status?.value || "all";
    const typeVal = type?.value || "all";
    const range = opts.range || "all";

    const now = Date.now();
    let visible = 0;

    cards.forEach((card) => {
      const title = card.getAttribute("data-title") || "";
      const cardType = card.getAttribute("data-type") || "";
      const cardStatus = card.getAttribute("data-status") || "";
      const extension = card.getAttribute("data-extension") || "";
      const isPaid = card.getAttribute("data-paid") === "true";
      const due = Number(card.getAttribute("data-due") || "0");

      const matchesSearch = !query || title.includes(query);
      const matchesType = typeVal === "all" || cardType === typeVal;
      const matchesStatus =
        statusVal === "all" ||
        (statusVal === "paid" && isPaid) ||
        (statusVal === "unpaid" && !isPaid) ||
        (statusVal === "overdue" && cardStatus === "overdue") ||
        (statusVal === "extension" && extension === "pending");

      let matchesRange = true;
      if (range === "overdue") {
        matchesRange = cardStatus === "overdue";
      } else if (range === "7" || range === "30") {
        const windowMs = Number(range) * 24 * 60 * 60 * 1000;
        matchesRange = due >= now && due <= now + windowMs;
      }

      const show = matchesSearch && matchesType && matchesStatus && matchesRange;
      card.classList.toggle("hidden", !show);
      if (show) visible += 1;
    });

    empty?.classList.toggle("hidden", visible !== 0);
  };

  search?.addEventListener("input", () => applyFilters());
  status?.addEventListener("change", () => applyFilters());
  type?.addEventListener("change", () => applyFilters());
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (status) status.value = "all";
    if (type) type.value = "all";
    applyFilters();
  });

  filters.querySelectorAll("[data-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyFilters({ range: btn.getAttribute("data-range") || "all" });
    });
  });
};

initExpenseFilters();

document.body.addEventListener("htmx:afterSwap", (evt: Event) => {
  const detail = (evt as CustomEvent).detail as { target?: HTMLElement } | undefined;
  if (detail?.target?.id === "main-content") {
    initExpenseFilters();
  }
});
