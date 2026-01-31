const getTenancyFilterElements = () => {
  const filters = document.getElementById("tenancy-filters");
  const list = document.getElementById("tenancy-list-body");
  const search = document.getElementById(
    "tenancy-search",
  ) as HTMLInputElement | null;
  const status = document.getElementById(
    "tenancy-status",
  ) as HTMLSelectElement | null;
  const historyToggle = document.getElementById(
    "tenancy-history",
  ) as HTMLInputElement | null;
  const reset = document.getElementById(
    "tenancy-reset",
  ) as HTMLButtonElement | null;
  return { filters, list, search, status, historyToggle, reset };
};

const updateUrl = (
  historyToggle: HTMLInputElement | null,
  params: Record<string, string>,
) => {
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

const applyTenancyFilters = () => {
  const { filters, list, search, status, historyToggle } =
    getTenancyFilterElements();
  if (!filters || !list) return;
  const rows = Array.from(list.querySelectorAll("tr[id^='tenancy-row-']"));
  const query = (search?.value || "").trim().toLowerCase();
  const statusVal = status?.value || "all";
  const quick = statusVal;
  filters.dataset.lastStatus = statusVal;
  updateUrl(historyToggle, { q: query, status: statusVal });

  rows.forEach((row) => {
    const title = row.getAttribute("data-title") || "";
    const rowStatus = row.getAttribute("data-status") || "";
    const matchesSearch = !query || title.includes(query);
    const matchesStatus = statusVal === "all" || rowStatus === statusVal;
    const matchesQuick = quick === "all" || rowStatus === quick;
    const show = matchesSearch && matchesStatus && matchesQuick;
    row.classList.toggle("hidden", !show);
  });
};

export const initTenancyFilters = () => {
  const { filters, list, search, status, historyToggle, reset } =
    getTenancyFilterElements();
  if (!filters || !list || filters.dataset.filtersInit === "true") return;
  filters.dataset.filtersInit = "true";

  search?.addEventListener("input", () => applyTenancyFilters());
  status?.addEventListener("change", () => applyTenancyFilters());
  reset?.addEventListener("click", () => {
    if (search) search.value = "";
    if (status) status.value = "all";
    if (historyToggle?.checked) {
      historyToggle.checked = false;
      historyToggle.dispatchEvent(new Event("change"));
      return;
    }
    applyTenancyFilters();
  });
  historyToggle?.addEventListener("change", () => {
    const url = new URL(window.location.href);
    if (search) search.value = "";
    if (status) status.value = "all";
    filters.dataset.lastStatus = "all";
    url.searchParams.delete("q");
    url.searchParams.delete("status");
    if (historyToggle.checked) url.searchParams.set("showAll", "true");
    else url.searchParams.delete("showAll");
    const w = window as typeof window & {
      htmx?: {
        ajax: (
          method: string,
          url: string,
          options?: { target?: string },
        ) => void;
      };
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
  if (historyToggle) historyToggle.checked = params.get("showAll") === "true";
  filters.dataset.lastStatus = status?.value || "all";
  applyTenancyFilters();

  filters.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-status");
      if (status && next) status.value = next;
      applyTenancyFilters();
    });
  });
};

initTenancyFilters();

document.body.addEventListener("htmx:afterSwap", (evt: Event) => {
  const detail = (evt as CustomEvent).detail as
    | { target?: HTMLElement }
    | undefined;
  if (detail?.target?.id === "main-content") {
    initTenancyFilters();
    applyTenancyFilters();
  }
});
