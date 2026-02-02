export const initInvoiceFilters = () => {
  const filters = document.getElementById("invoice-filters");
  const list = document.getElementById("invoice-list");
  if (!filters || !list || filters.dataset.filtersInit === "true") return;
  filters.dataset.filtersInit = "true";

  const search = document.getElementById("invoice-search") as HTMLInputElement | null;
  const status = document.getElementById("invoice-status") as HTMLSelectElement | null;
  const type = document.getElementById("invoice-type") as HTMLSelectElement | null;
  const property = document.getElementById("invoice-property") as HTMLSelectElement | null;
  const historyToggle = document.getElementById("invoice-history") as HTMLInputElement | null;
  const reset = document.getElementById("invoice-reset") as HTMLButtonElement | null;
  const rows = Array.from(list.querySelectorAll("tr[id^='invoice-row-']"));

  const updateUrl = (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (!value || value === "all") {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, String(value));
      }
    });
    if (historyToggle?.checked) {
      url.searchParams.set("showAll", "true");
    } else {
      url.searchParams.delete("showAll");
    }
    window.history.replaceState({}, "", url.toString());
  };

  const applyFilters = (opts: { range?: string } = {}) => {
    const query = (search?.value || "").trim().toLowerCase();
    const statusVal = status?.value || "all";
    const typeVal = type?.value || "all";
    const propertyVal = property?.value || "all";
    const range = opts.range || "all";

    updateUrl({ q: query, status: statusVal, type: typeVal, property: propertyVal });

    const now = Date.now();
    rows.forEach((row) => {
      const title = row.getAttribute("data-title") || "";
      const rowStatus = row.getAttribute("data-status") || "";
      const rowType = row.getAttribute("data-type") || "";
      const rowProperty = row.getAttribute("data-property") || "";
      const due = Number(row.getAttribute("data-due") || "0");

      const matchesSearch = !query || title.includes(query);
      const matchesStatus = statusVal === "all" || rowStatus === statusVal;
      const matchesType = typeVal === "all" || rowType === typeVal;
      const matchesProperty = propertyVal === "all" || rowProperty === propertyVal;

      let matchesRange = true;
      if (range === "overdue") {
        matchesRange = rowStatus === "overdue";
      } else if (range === "7" || range === "30") {
        const windowMs = Number(range) * 24 * 60 * 60 * 1000;
        matchesRange = due >= now && due <= now + windowMs;
      }

      const show =
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesProperty &&
        matchesRange;
      row.classList.toggle("hidden", !show);
    });
  };

  search?.addEventListener("input", () => applyFilters());
  status?.addEventListener("change", () => applyFilters());
  type?.addEventListener("change", () => applyFilters());
  property?.addEventListener("change", () => applyFilters());
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (status) status.value = "all";
    if (type) type.value = "all";
    if (property) property.value = "all";
    if (historyToggle?.checked) {
      historyToggle.checked = false;
      historyToggle.dispatchEvent(new Event("change"));
      return;
    }
    applyFilters();
  });
  historyToggle?.addEventListener("change", () => {
    const url = new URL(window.location.href);
    if (search) search.value = "";
    if (status) status.value = "all";
    if (type) type.value = "all";
    if (property) property.value = "all";
    url.searchParams.delete("q");
    url.searchParams.delete("status");
    url.searchParams.delete("type");
    url.searchParams.delete("property");
    if (historyToggle.checked) url.searchParams.set("showAll", "true");
    else url.searchParams.delete("showAll");
    window.history.replaceState({}, "", url.toString());
    const w = window as typeof window & {
      htmx?: { ajax: (method: string, url: string, options?: { target?: string }) => void };
    };
    if (w.htmx) {
      w.htmx.ajax("GET", url.toString(), { target: "#main-content" });
    } else {
      window.location.href = url.toString();
    }
  });

  const params = new URLSearchParams(window.location.search);
  if (search) search.value = params.get("q") || "";
  if (status) status.value = params.get("status") || "all";
  if (type) type.value = params.get("type") || "all";
  if (property) property.value = params.get("property") || "all";
  if (historyToggle) historyToggle.checked = params.get("showAll") === "true";
  applyFilters();

  filters.querySelectorAll("[data-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyFilters({ range: btn.getAttribute("data-range") || "all" });
    });
  });
};

initInvoiceFilters();

document.body.addEventListener("htmx:afterSwap", (evt: Event) => {
  const detail = (evt as CustomEvent).detail as { target?: HTMLElement } | undefined;
  if (detail?.target?.id === "main-content") {
    initInvoiceFilters();
  }
});
