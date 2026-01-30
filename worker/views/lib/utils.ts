import { html } from "hono/html";

export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};
export const formatCentsToDollars = (cents: number | undefined | null): string => {
  if (cents === undefined || cents === null) return "";
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
};
export const formatCents = (cents: number | undefined | null): string => {
  if (cents === undefined || cents === null) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
};
export const dollarsToCents = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null || value === "") return 0;
  const num = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
};
export const StatusBadge = (status: string, styles: Record<string, string>, iconName?: string) => {
  // Format label: "pending_agreement" -> "Pending Agreement"
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const style = styles[status] || styles.closed || "bg-gray-100 text-gray-800 border-gray-200";

  return html`
    <span
      class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}">
      ${iconName ? html`<i data-lucide="${iconName}" class="w-3 h-3 mr-1.5"></i>` : ""} ${label}
    </span>
  `;
};
