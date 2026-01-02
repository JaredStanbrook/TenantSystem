// worker/views/invoices/InvoiceComponents.tsx
import { html } from "hono/html";
import { Invoice } from "../../schema/invoice.schema";
import { Property } from "../../schema/property.schema";
import { InvoicePayment } from "../../schema/invoicePayment.schema"; // Ensure this is exported/available

// Types for the view
type PaymentWithUser = InvoicePayment & {
  userDisplayName: string;
  userEmail: string;
};

const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

const formatDate = (date: Date | null | undefined) =>
  date ? new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(date) : "-";

const InvoiceStatusBadge = (status: string, dueDate: Date, isFullyPaid: boolean) => {
  const isOverdue = !isFullyPaid && new Date() > new Date(dueDate);

  // Logic: Use DB status, but override visually if overdue and still 'open'
  let label = status;
  let classes = "bg-gray-100 text-gray-800";

  if (status === "paid" || isFullyPaid) {
    label = "Paid";
    classes = "bg-green-100 text-green-800";
  } else if (status === "void") {
    classes = "bg-gray-200 text-gray-500 line-through";
  } else if (status === "overdue" || isOverdue) {
    label = "Overdue";
    classes = "bg-red-100 text-red-800";
  } else {
    // Open
    classes = "bg-blue-50 text-blue-700";
  }

  return html`<span
    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${classes}">
    ${label}
  </span>`;
};
// --- New Component: Tenant Action Row ---
const TenantStatusRow = (payment: PaymentWithUser, invoice: Invoice) => {
  const isPaid = payment.status === "paid";
  const isPendingPayment = !isPaid && payment.tenantMarkedPaidAt;
  const isPendingExtension = payment.extensionStatus === "pending";

  return html`
    <tr class="transition-colors hover:bg-muted/50">
      <td class="p-4 align-middle">
        <div class="flex flex-col">
          <span class="font-medium">${payment.userDisplayName || "Unknown"}</span>
          <span class="text-xs text-muted-foreground">${payment.userEmail}</span>
        </div>
      </td>
      <td class="p-4 align-middle font-semibold">${formatMoney(payment.amountOwed)}</td>
      <td class="p-4 align-middle">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            ${isPaid
              ? html`<span
                  class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                  >Paid</span
                >`
              : isPendingPayment
              ? html`<span
                  class="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800"
                  >Payment Reported</span
                >`
              : html`<span
                  class="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 capitalize"
                  >${payment.status}</span
                >`}
          </div>

          ${payment.extensionStatus !== "none"
            ? html` <div class="text-xs mt-1">
                <span class="font-medium">Extension:</span>
                <span
                  class="${payment.extensionStatus === "approved"
                    ? "text-green-600"
                    : payment.extensionStatus === "rejected"
                    ? "text-red-600"
                    : "text-orange-600"} capitalize">
                  ${payment.extensionStatus}
                </span>
              </div>`
            : ""}
        </div>
      </td>
      <td class="p-4 align-middle text-sm text-muted-foreground">
        ${isPendingPayment
          ? html` <div>
              <span class="font-medium text-foreground">Ref:</span> ${payment.paymentReference ||
              "N/A"}
              <br />
              <span class="text-xs">Reported: ${formatDate(payment.tenantMarkedPaidAt)}</span>
            </div>`
          : ""}
        ${isPendingExtension
          ? html` <div class="mt-2 pt-2 border-t border-dashed">
              <span class="font-medium text-foreground">Req:</span> ${formatDate(
                payment.extensionRequestedDate
              )}
              <br />
              <span class="italic text-xs">"${payment.extensionReason}"</span>
            </div>`
          : ""}
      </td>
      <td class="p-4 align-middle text-right">
        <div class="flex flex-col gap-2 items-end">
          ${isPendingPayment
            ? html` <div class="flex items-center gap-1">
                <button
                  hx-post="/admin/invoices/${invoice.id}/payment/${payment.id}/approve"
                  hx-target="#main-content"
                  class="inline-flex items-center justify-center rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 shadow-sm">
                  Confirm Paid
                </button>
                <button
                  hx-post="/admin/invoices/${invoice.id}/payment/${payment.id}/reject"
                  hx-prompt="Reason for rejection:"
                  hx-target="#main-content"
                  class="inline-flex items-center justify-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-accent hover:text-destructive">
                  Reject
                </button>
              </div>`
            : ""}
          ${isPendingExtension
            ? html` <div class="flex items-center gap-1">
                <button
                  hx-post="/admin/invoices/${invoice.id}/extension/${payment.id}/approve"
                  hx-target="#main-content"
                  class="inline-flex items-center justify-center rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 shadow-sm">
                  Approve Ext
                </button>
                <button
                  hx-post="/admin/invoices/${invoice.id}/extension/${payment.id}/reject"
                  hx-target="#main-content"
                  class="inline-flex items-center justify-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-accent hover:text-destructive">
                  Reject
                </button>
              </div>`
            : ""}
          ${!isPendingPayment && !isPendingExtension && !isPaid
            ? html`<span class="text-xs text-muted-foreground">No pending actions</span>`
            : ""}
        </div>
      </td>
    </tr>
  `;
};

export const AssignTenantModal = (
  invoiceId: number,
  availableTenants: Partial<SelectUser>[]
) => html`
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
    <div
      class="bg-card w-full max-w-md border rounded-lg shadow-lg p-6 space-y-6 m-4"
      onclick="event.stopPropagation()">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">Assign Tenant</h3>
        <button
          onclick="this.closest('.fixed').remove()"
          class="text-muted-foreground hover:text-foreground">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form hx-post="/admin/invoices/${invoiceId}/assign" hx-target="#main-content">
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Tenant</label>
            <select
              name="userId"
              required
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="" disabled selected>Select a tenant...</option>
              ${availableTenants.map(
                (t) => html`<option value="${t.id}">${t.displayName || t.email}</option>`
              )}
            </select>
            ${availableTenants.length === 0
              ? html`<p class="text-xs text-destructive">No unassigned tenants available.</p>`
              : ""}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Amount ($)</label>
              <input
                type="number"
                name="amountDollars"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Extension (Days)</label>
              <input
                type="number"
                name="extensionDays"
                min="0"
                placeholder="0"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <p class="text-xs text-muted-foreground">
            The tenant will see a due date adjusted by the extension days.
          </p>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 text-sm font-medium hover:bg-accent rounded-md">
            Cancel
          </button>
          <button
            type="submit"
            ${availableTenants.length === 0 ? "disabled" : ""}
            class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50">
            Assign
          </button>
        </div>
      </form>
    </div>
  </div>
`;

// --- Updated InvoiceForm ---
export const InvoiceForm = ({
  invoice,
  properties,
  payments = [],
  action,
  page = "1",
}: {
  invoice?: Partial<Invoice>;
  properties: Property[];
  payments?: PaymentWithUser[];
  action: string;
  page?: string | number;
}) => {
  const amountInDollars = invoice?.totalAmount ? (invoice.totalAmount / 100).toFixed(2) : "";
  const dueDateStr = invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "";
  const isEdit = !!invoice?.id;

  return html`
    <div class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">
            ${isEdit ? "Manage Invoice" : "Create Invoice"}
          </h2>
          <p class="text-muted-foreground mt-1">
            ${isEdit ? "Review tenant status and update details." : "Bill your tenants."}
          </p>
        </div>
        <button
          hx-get="/admin/invoices?page=${page}"
          hx-push-url="true"
          hx-target="#main-content"
          class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <i data-lucide="arrow-left" class="w-4 h-4"></i>
          Back to Invoices
        </button>
      </div>

      <div class="grid gap-8 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-8">
          <form
            hx-post="${action}"
            hx-target="#main-content"
            class="space-y-6 border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
            <input type="hidden" name="page" value="${page}" />
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-medium">Property</label>
                <select
                  name="propertyId"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  ${properties.map(
                    (p) =>
                      html`<option
                        value="${p.id}"
                        ${invoice?.propertyId === p.id ? "selected" : ""}>
                        ${p.nickname || p.addressLine1}
                      </option>`
                  )}
                </select>
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Bill Type</label>
                <select
                  name="type"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  ${["rent", "water", "electricity", "gas", "internet", "maintenance", "other"].map(
                    (t) =>
                      html`<option value="${t}" ${invoice?.type === t ? "selected" : ""}>
                        ${t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>`
                  )}
                </select>
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Description</label>
              <input
                name="description"
                value="${invoice?.description || ""}"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-medium">Total Amount ($)</label>
                <input
                  type="number"
                  name="amountDollars"
                  step="0.01"
                  value="${amountInDollars}"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  value="${dueDateStr}"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div class="flex justify-end pt-4 border-t">
              <button
                type="submit"
                class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium">
                Save Changes
              </button>
            </div>
          </form>
        </div>

        ${isEdit
          ? html` <div class="lg:col-span-1">
              <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div class="p-6 border-b flex justify-between items-center">
                  <div>
                    <h3 class="text-lg font-semibold">Tenant Breakdown</h3>
                    <p class="text-sm text-muted-foreground">Review payments.</p>
                  </div>
                  <button
                    hx-get="/admin/invoices/${invoice?.id}/assign"
                    hx-target="#modal-container"
                    class="inline-flex items-center justify-center rounded-md bg-secondary text-primary-foreground hover:bg-secondary/80 h-8 px-3 text-xs font-medium">
                    <i data-lucide="plus" class="w-3 h-3 mr-1"></i>
                    Assign
                  </button>
                </div>
                <div class="p-0 overflow-auto">
                  <table class="w-full caption-bottom text-sm">
                    <tbody>
                      ${payments.length === 0
                        ? html`<tr>
                            <td class="p-6 text-center text-muted-foreground">
                              No tenants assigned.
                            </td>
                          </tr>`
                        : payments.map((p) => TenantStatusRow(p, invoice as Invoice))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>`
          : html`
              <div class="lg:col-span-1">
                <div class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  Save the invoice to assign tenants.
                </div>
              </div>
            `}
      </div>
    </div>
  `;
};

// --- 1. Invoice Table Row ---
export const InvoiceRow = ({
  invoice,
  propName,
  currentPage,
}: {
  invoice: InvoiceWithMeta;
  propName: string;
  currentPage: number;
}) => {
  const paid = invoice.amountPaid || 0;
  const total = invoice.totalAmount;
  const percentage = Math.min(100, Math.round((paid / total) * 100));
  const isFullyPaid = paid >= total;

  return html`
    <tr class="hover:bg-muted/50 transition-colors border-b" id="invoice-row-${invoice.id}">
      <td class="p-4 align-middle">
        <div class="flex flex-col gap-1">
          <span class="font-medium text-sm">${invoice.description || invoice.type}</span>
          <div class="flex items-center gap-2">
            ${InvoiceStatusBadge(invoice.status, invoice.dueDate, isFullyPaid)}
            <span class="text-xs text-muted-foreground uppercase tracking-wider"
              >${invoice.type}</span
            >
          </div>
        </div>
      </td>
      <td class="p-4 align-middle text-sm text-muted-foreground">${propName}</td>
      <td class="p-4 align-middle">
        <div class="flex flex-col text-sm">
          <span class="font-medium">Due: ${formatDate(invoice.dueDate)}</span>
          <span class="text-xs text-muted-foreground"
            >Issued: ${formatDate(invoice.issuedDate)}</span
          >
        </div>
      </td>
      <td class="p-4 align-middle">
        <div class="w-full max-w-[140px] space-y-1">
          <div class="flex justify-between text-sm">
            <span class="font-bold">${formatMoney(total)}</span>
            ${!isFullyPaid
              ? html`<span class="text-xs text-muted-foreground">${Math.round(percentage)}%</span>`
              : ""}
          </div>

          <div class="h-1.5 w-full bg-destructive rounded-full overflow-hidden">
            <div
              class="h-full ${isFullyPaid ? "bg-green-500" : "bg-primary"} transition-all"
              style="width: ${percentage}%"></div>
          </div>

          ${paid > 0 && !isFullyPaid
            ? html`<div class="text-[10px] text-muted-foreground text-right">
                Paid: ${formatMoney(paid)}
              </div>`
            : ""}
        </div>
      </td>
      <td class="p-4 align-middle text-right">
        <div class="flex justify-end gap-2">
          <button
            hx-get="/admin/invoices/${invoice.id}/edit?page=${currentPage}"
            hx-push-url="true"
            hx-target="#main-content"
            hx-swap="innerHTML"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
            aria-label="Edit invoice">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>

          <button
            hx-delete="/admin/invoices/${invoice.id}"
            hx-target="#invoice-row-${invoice.id}"
            hx-swap="outerHTML swap:0.5s"
            hx-confirm="Delete this invoice?"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
            aria-label="Delete invoice">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
};

export const InvoiceTable = ({
  invoices,
  properties,
  pagination,
}: {
  invoices: InvoiceWithMeta[];
  properties: Property[];
  pagination: { page: number; totalPages: number };
}) => {
  const { page, totalPages } = pagination;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return html`
    <div class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Invoices</h2>
          <p class="text-muted-foreground mt-1">
            Manage outgoing bills. (Page ${page} of ${totalPages})
          </p>
        </div>
        <button
          hx-get="/admin/invoices/create?page=${page}"
          hx-target="#main-content"
          hx-push-url="true"
          class="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          <i data-lucide="plus" class="w-4 h-4"></i>
          New Invoice
        </button>
      </div>

      <div class="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div class="relative w-full overflow-auto">
          <table class="w-full caption-bottom text-sm">
            <thead class="[&_tr]:border-b bg-muted/50">
              <tr class="border-b transition-colors">
                <th class="h-12 px-4 text-left font-semibold text-muted-foreground w-[30%]">
                  Description
                </th>
                <th class="h-12 px-4 text-left font-semibold text-muted-foreground">Property</th>
                <th class="h-12 px-4 text-left font-semibold text-muted-foreground">Dates</th>
                <th class="h-12 px-4 text-left font-semibold text-muted-foreground w-[15%]">
                  Amount / Paid
                </th>
                <th class="h-12 px-4 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody class="[&_tr:last-child]:border-0">
              ${invoices.length === 0
                ? html`<tr>
                    <td colspan="5" class="p-12 text-center text-muted-foreground">
                      No invoices found.
                    </td>
                  </tr>`
                : invoices.map((i) =>
                    InvoiceRow({ invoice: i, propName: i.propertyName, currentPage: page })
                  )}
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-end space-x-2 py-4 px-4 border-t bg-muted/20">
          <span class="text-sm text-muted-foreground mr-4">Page ${page} of ${totalPages}</span>
          <button
            ${!hasPrev ? "disabled" : ""}
            hx-get="/admin/invoices?page=${page - 1}"
            hx-push-url="true"
            hx-target="#main-content"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-3 disabled:opacity-50 disabled:cursor-not-allowed">
            Previous
          </button>
          <button
            ${!hasNext ? "disabled" : ""}
            hx-get="/admin/invoices?page=${page + 1}"
            hx-push-url="true"
            hx-target="#main-content"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-3 disabled:opacity-50 disabled:cursor-not-allowed">
            Next
          </button>
        </div>
      </div>
    </div>
  `;
};
