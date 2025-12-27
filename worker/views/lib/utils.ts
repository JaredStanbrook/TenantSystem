import { html } from "hono/html";

export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const StatusBadge = (status: string, styles: Record<string, string>) => {
  // Format label: "pending_agreement" -> "Pending Agreement"
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const style = styles[status] || styles.closed;

  return html`
    <span
      class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}">
      ${label}
    </span>
  `;
};
