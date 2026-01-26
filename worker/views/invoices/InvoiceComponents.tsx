// worker/views/invoices/InvoiceComponents.tsx
// worker/views/invoices/InvoiceComponents.tsx
import { html } from "hono/html";
import { Invoice } from "../../schema/invoice.schema";
import { Property } from "../../schema/property.schema";
import { InvoicePayment } from "../../schema/invoicePayment.schema";
import { is } from "drizzle-orm";

// Types
type PaymentWithUser = InvoicePayment & {
  userDisplayName?: string;
  userEmail?: string;
};

// --- Helpers ---
const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

const formatDate = (date: Date | null | undefined | string) => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(d);
};

const InvoiceStatusBadge = (status: string) => {
  let label = status;
  let classes = "bg-gray-100 text-gray-800";

  if (status === "paid") {
    label = "Paid";
    classes = "bg-green-100 text-green-800";
  } else if (status === "void") {
    classes = "bg-gray-200 text-gray-500 line-through";
  } else if (status === "overdue") {
    label = "Overdue";
    classes = "bg-red-100 text-red-800";
  } else {
    classes = "bg-blue-50 text-blue-700";
  }

  return html`<span
    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${classes}">
    ${label}
  </span>`;
};

export const TenantSection = ({
  splits,
  isLocked,
  isEdit = false,
  invoiceId,
}: {
  splits: {
    id?: number; // Payment ID (for edit mode)
    userId: string;
    userDisplayName?: string;
    userEmail?: string;
    amountCents: number;
    extensionDays: number;
    dueDateExtensionDays?: number;
    status?: string;
    tenantMarkedPaidAt?: Date | null;
    paymentReference?: string | null;
    extensionStatus?: "none" | "pending" | "approved" | "rejected";
    extensionRequestedDate?: Date | null;
    extensionReason?: string | null;
    adminNote?: string | null;
  }[];
  isLocked: boolean;
  isEdit?: boolean;
  invoiceId?: number;
}) => {
  return html`
    <div class="space-y-4 animate-in fade-in" id="tenant-section-container">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Tenant Splits
        </h3>
        ${!isLocked && !isEdit
          ? html`<span class="text-xs text-muted-foreground">Adjust amounts below</span>`
          : ""}
      </div>

      <div class="rounded-md border bg-muted/20 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 text-left">
            <tr>
              <th class="p-3 font-medium">Tenant</th>
              <th class="p-3 font-medium w-32">Amount ($)</th>
              <th class="p-3 font-medium w-24">Ext (Days)</th>
              ${isEdit
                ? html`
                    <th class="p-3 font-medium w-32">Status</th>
                    <th class="p-3 font-medium w-40 text-center">Actions</th>
                  `
                : !isLocked
                  ? html`<th class="p-3 font-medium w-16"></th>`
                  : ""}
            </tr>
          </thead>
          <tbody id="tenant-rows">
            ${splits.map(
              (split, index) => html`
                <tr class="border-t border-muted/20" id="tenant-row-${index}">
                  <td class="p-3">
                    <div class="font-medium">
                      ${split.userDisplayName || split.userEmail?.split("@")[0]}
                    </div>
                    <div class="text-xs text-muted-foreground">${split.userEmail}</div>
                    ${!isEdit
                      ? html`<input type="hidden" name="tenantIds[]" value="${split.userId}" />`
                      : ""}
                  </td>

                  <td class="p-3">
                    ${!isEdit
                      ? html`
                          <input
                            type="number"
                            step="0.01"
                            name="tenantAmounts[]"
                            value="${(split.amountCents / 100).toFixed(2)}"
                            required
                            ${isLocked
                              ? "readonly class='bg-transparent border-none font-semibold text-right'"
                              : "class='w-full rounded border px-2 py-1'"} />
                        `
                      : html`
                          <div class="font-semibold text-right">
                            $${(split.amountCents / 100).toFixed(2)}
                          </div>
                        `}
                  </td>

                  <td class="p-3">
                    ${!isEdit
                      ? html`
                          <input
                            type="number"
                            name="tenantExtensions[]"
                            value="${split.extensionDays}"
                            min="0"
                            ${isLocked
                              ? "readonly class='bg-transparent border-none text-right'"
                              : "class='w-full rounded border px-2 py-1'"} />
                        `
                      : html`
                          <div class="space-y-1">
                            ${split.dueDateExtensionDays && split.dueDateExtensionDays > 0
                              ? html`
                                  <div class="text-right font-semibold text-green-600">
                                    +${split.dueDateExtensionDays}d
                                  </div>
                                `
                              : html`<div class="text-right text-muted-foreground">—</div>`}
                            ${split.extensionStatus === "pending"
                              ? html`
                                  <span
                                    class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-yellow-500/10 text-yellow-600">
                                    <i data-lucide="clock" class="w-2.5 h-2.5"></i>
                                    Requested
                                  </span>
                                `
                              : split.extensionStatus === "approved"
                                ? html`
                                    <span
                                      class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-green-500/10 text-green-600">
                                      <i data-lucide="check" class="w-2.5 h-2.5"></i>
                                      Approved
                                    </span>
                                  `
                                : split.extensionStatus === "rejected"
                                  ? html`
                                      <span
                                        class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500/10 text-red-600">
                                        <i data-lucide="x" class="w-2.5 h-2.5"></i>
                                        Rejected
                                      </span>
                                    `
                                  : ""}
                          </div>
                        `}
                  </td>

                  ${isEdit
                    ? html`
                        <td class="p-3">
                          <div class="flex items-center gap-2">
                            ${split.status === "paid"
                              ? html`
                                  <span
                                    class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-600">
                                    <i data-lucide="check-circle" class="w-3 h-3"></i>
                                    Paid
                                  </span>
                                `
                              : split.tenantMarkedPaidAt
                                ? html`
                                    <span
                                      class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-600">
                                      <i data-lucide="clock" class="w-3 h-3"></i>
                                      Awaiting Review
                                    </span>
                                  `
                                : html`
                                    <span
                                      class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-500/10 text-gray-600">
                                      <i data-lucide="circle" class="w-3 h-3"></i>
                                      Pending
                                    </span>
                                  `}
                          </div>
                          ${split.paymentReference
                            ? html`
                                <div class="text-xs text-muted-foreground mt-1">
                                  Ref: ${split.paymentReference}
                                </div>
                              `
                            : ""}
                        </td>

                        <td class="p-3">
                          ${split.tenantMarkedPaidAt && split.status !== "paid"
                            ? html`
                                <div class="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                                    hx-post="/admin/invoices/${invoiceId}/payment/${split.id}/approve"
                                    hx-swap="none"
                                    hx-indicator="#loading-indicator">
                                    <i data-lucide="check" class="w-3 h-3"></i>
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                                    hx-post="/admin/invoices/${invoiceId}/payment/${split.id}/reject"
                                    hx-prompt="Reason for rejection (optional):"
                                    hx-swap="none"
                                    hx-indicator="#loading-indicator">
                                    <i data-lucide="x" class="w-3 h-3"></i>
                                    Reject
                                  </button>
                                </div>
                              `
                            : split.extensionStatus === "pending"
                              ? html`
                                  <div class="flex flex-col gap-2">
                                    <div class="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                        hx-post="/admin/invoices/${invoiceId}/payment/${split.id}/approve-extension"
                                        hx-swap="none"
                                        hx-indicator="#loading-indicator">
                                        <i data-lucide="calendar-check" class="w-3 h-3"></i>
                                        Approve Ext.
                                      </button>
                                      <button
                                        type="button"
                                        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                                        hx-post="/admin/invoices/${invoiceId}/payment/${split.id}/reject-extension"
                                        hx-prompt="Reason for rejection (optional):"
                                        hx-swap="none"
                                        hx-indicator="#loading-indicator">
                                        <i data-lucide="calendar-x" class="w-3 h-3"></i>
                                        Reject Ext.
                                      </button>
                                    </div>
                                    ${split.extensionReason
                                      ? html`
                                          <div
                                            class="text-xs text-muted-foreground text-center italic">
                                            "${split.extensionReason}"
                                          </div>
                                        `
                                      : ""}
                                  </div>
                                `
                              : split.status === "paid"
                                ? html`
                                    <div class="flex flex-col gap-2 items-center">
                                      <div class="text-center text-xs text-muted-foreground">
                                        Approved
                                      </div>
                                      ${split.dueDateExtensionDays && split.dueDateExtensionDays > 0
                                        ? html`
                                            <button
                                              type="button"
                                              class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 transition-colors"
                                              hx-post="/admin/invoices/${invoiceId}/payment/${split.id}/revoke-extension"
                                              hx-confirm="Revoke this extension? This cannot be undone."
                                              hx-swap="none"
                                              hx-indicator="#loading-indicator">
                                              <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                                              Revoke Ext.
                                            </button>
                                          `
                                        : ""}
                                    </div>
                                  `
                                : html`
                                    <div class="flex flex-col gap-2 items-center">
                                      <div class="text-center text-xs text-muted-foreground">
                                        Waiting for tenant
                                      </div>
                                      <button
                                        type="button"
                                        class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                                        hx-post="/admin/invoices/${invoiceId}/payment/${split.id}/grant-extension"
                                        hx-prompt="Grant extension (number of days):"
                                        hx-swap="none"
                                        hx-indicator="#loading-indicator">
                                        <i data-lucide="calendar-plus" class="w-3 h-3"></i>
                                        Grant Ext.
                                      </button>
                                      ${split.dueDateExtensionDays && split.dueDateExtensionDays > 0
                                        ? html`
                                            <button
                                              type="button"
                                              class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 transition-colors"
                                              hx-post="/admin/invoices/${invoiceId}/payment/${split.id}/revoke-extension"
                                              hx-confirm="Revoke this extension? This cannot be undone."
                                              hx-swap="none"
                                              hx-indicator="#loading-indicator">
                                              <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                                              Revoke Ext.
                                            </button>
                                          `
                                        : ""}
                                    </div>
                                  `}
                        </td>
                      `
                    : !isLocked
                      ? html`
                          <td class="p-3 text-center">
                            <button
                              type="button"
                              class="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                              onclick="this.closest('tr').remove(); recalculateSplits();"
                              title="Remove tenant">
                              <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                          </td>
                        `
                      : ""}
                </tr>
              `,
            )}
          </tbody>
        </table>

        ${splits.length === 0
          ? html`
              <div class="p-6 text-center text-muted-foreground text-sm">
                <i data-lucide="users" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                <p>Select a property above to load active tenants.</p>
              </div>
            `
          : ""}
      </div>

      ${!isLocked && splits.length > 0 && !isEdit
        ? html`
            <p class="text-xs text-right text-muted-foreground">
              <i data-lucide="info" class="w-3 h-3 inline mr-1"></i>
              Ensure splits sum to Total Amount.
            </p>
          `
        : ""}
    </div>

    ${!isEdit
      ? html`
          <script>
            // Helper function to recalculate splits when a tenant is removed
            function recalculateSplits() {
              const rows = document.querySelectorAll("#tenant-rows tr");
              const amountInput = document.querySelector('input[name="amountDollars"]');

              if (!amountInput || rows.length === 0) return;

              const totalAmount = parseFloat(amountInput.value) || 0;
              const totalCents = Math.round(totalAmount * 100);
              const count = rows.length;

              if (count === 0) return;

              const baseShare = Math.floor(totalCents / count);
              let remainder = totalCents % count;

              rows.forEach((row, index) => {
                const amountField = row.querySelector('input[name="tenantAmounts[]"]');
                if (amountField) {
                  const share = baseShare + (remainder > 0 ? 1 : 0);
                  remainder--;
                  amountField.value = (share / 100).toFixed(2);
                }
              });
            }

            // Initialize Lucide icons for dynamically loaded content
            if (typeof lucide !== "undefined") {
              lucide.createIcons();
            }
          </script>
        `
      : ""}
  `;
};
// Updated Invoice Form
export const InvoiceForm = ({
  invoice,
  properties,
  payments = [],
  action,
  page = "1",
  isLocked = false,
}: {
  invoice?: Partial<Invoice>;
  properties: Property[];
  payments?: PaymentWithUser[];
  action: string;
  page?: string | number;
  isLocked?: boolean;
}) => {
  const amountInDollars = invoice?.totalAmount ? (invoice.totalAmount / 100).toFixed(2) : "";
  const dueDateStr = invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "";
  const isEdit = !!invoice?.id;

  // Prepare splits for the TenantSection
  const splits = payments.map((p) => ({
    userId: p.userId,
    userDisplayName: p.userDisplayName,
    userEmail: p.userEmail,
    amountCents: p.amountOwed,
    extensionDays: p.dueDateExtensionDays || 0,
  }));

  return html`
    <div class="max-w-3xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in">
      
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">
            ${isEdit ? "Manage Invoice" : "New Invoice"}
          </h2>
          ${
            isLocked
              ? html`
                  <span
                    class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 mt-2">
                    <i data-lucide="lock" class="w-3 h-3 mr-1"></i>
                    Financials Locked (Payments Active)
                  </span>
                `
              : ""
          }
        </div>
        <button hx-get="/admin/invoices?page=${page}" hx-target="#main-content" class="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Invoices
        </button>
      </div>

      <form hx-post="${action}" hx-target="#main-content" class="space-y-6">
        <input type="hidden" name="page" value="${page}" />
        
        <div class="space-y-8 border rounded-lg p-8 bg-card shadow-sm">
          
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-sm font-medium">Property</label>
              ${
                isLocked || isEdit
                  ? html`
                      <div class="p-2 bg-muted rounded text-sm font-medium border">
                        ${properties.find((p) => p.id === invoice?.propertyId)?.nickname ||
                        "Unknown"}
                        <input type="hidden" name="propertyId" value="${invoice?.propertyId}" />
                      </div>
                    `
                  : html`
                      <select
                        name="propertyId"
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        hx-get="/admin/invoices/fragments/tenant-section"
                        hx-target="#tenant-section-container"
                        hx-include="[name='amountDollars']">
                        <option value="" disabled ${!invoice?.propertyId ? "selected" : ""}>
                          Select Property...
                        </option>
                        ${properties.map(
                          (p) => html`
                            <option
                              value="${p.id}"
                              ${invoice?.propertyId === p.id ? "selected" : ""}>
                              ${p.nickname || p.addressLine1}
                            </option>
                          `,
                        )}
                      </select>
                    `
              }
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Bill Type</label>
              <select name="type" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                 ${["rent", "water", "electricity", "gas", "internet", "maintenance", "other"].map(
                   (t) => html`
                     <option value="${t}" ${invoice?.type === t ? "selected" : ""}>
                       ${t.toUpperCase()}
                     </option>
                   `,
                 )}
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Total Amount ($)</label>
              <input
                type="number"
                step="0.01"
                name="amountDollars"
                value="${amountInDollars}"
                placeholder="0.00"
                ${isLocked || isEdit ? "readonly" : ""}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${isLocked || isEdit ? "bg-muted text-muted-foreground" : ""}"
                
                // Optional: Auto-refresh splits when amount changes (if desired)
                hx-get="/admin/invoices/fragments/tenant-section"
                hx-target="#tenant-section-container"
                hx-trigger="keyup delay:500ms changed"
                hx-include="[name='propertyId']"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Due Date</label>
              <input type="date" name="dueDate" value="${dueDateStr}" ${isLocked || isEdit ? "readonly" : ""} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            
            <div class="space-y-2 md:col-span-2">
               <label class="text-sm font-medium">Description</label>
               <input name="description" value="${invoice?.description || ""}" placeholder="e.g. Q3 Water Bill" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div id="tenant-section-container" class="pt-6 border-t">
             ${TenantSection({ splits, isLocked, isEdit })}
          </div>

          
          <div class="flex justify-end pt-6 border-t">
             <button type="submit" class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2.5 text-sm font-medium shadow">
               ${isLocked ? "Update Non-Financials" : isEdit ? "Update Invoice" : "Create Invoice"}
             </button>
          </div>
        </div>
      </form>
    </div>
  `;
};
// --- 5. Invoice Table & Row ---
export const InvoiceRow = ({
  invoice,
  propName,
  currentPage,
}: {
  invoice: any;
  propName: string;
  currentPage: number;
}) => {
  const paid = invoice.amountPaid || 0;
  const total = invoice.totalAmount;
  const percentage = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const isFullyPaid = paid >= total && total > 0;

  return html`
    <tr class="hover:bg-muted/50 transition-colors border-b" id="invoice-row-${invoice.id}">
      <td class="p-4 align-middle">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm">${invoice.description || invoice.type}</span>
          </div>
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
          <div class="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
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
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <button
            hx-delete="/admin/invoices/${invoice.id}"
            hx-target="#invoice-row-${invoice.id}"
            hx-swap="outerHTML swap:0.5s"
            hx-confirm="Delete this invoice?"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-destructive hover:text-destructive-foreground h-8 w-8">
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
  invoices: any[];
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
          <p class="text-muted-foreground mt-1">Manage outgoing bills and track payments.</p>
        </div>
        <div class="flex gap-2">
          <button
            hx-post="/admin/invoices/generate-all"
            hx-swap="none"
            hx-indicator="#generate-spinner"
            class="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 shadow-sm transition-colors">
            <div id="generate-spinner" class="htmx-indicator">
              <i data-lucide="refresh-cw" class="w-4 h-4 text-muted-foreground animate-spin"></i>
            </div>
            Generate Property Invoices
          </button>

          <button
            hx-get="/admin/invoices/create?page=${page}"
            hx-target="#main-content"
            hx-push-url="true"
            class="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 shadow transition-colors">
            <i data-lucide="plus" class="w-4 h-4"></i>
            New Invoice
          </button>
        </div>
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
                    InvoiceRow({ invoice: i, propName: i.propertyName, currentPage: page }),
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
            class="btn-sm border bg-background hover:bg-accent disabled:opacity-50">
            Previous
          </button>
          <button
            ${!hasNext ? "disabled" : ""}
            hx-get="/admin/invoices?page=${page + 1}"
            hx-push-url="true"
            hx-target="#main-content"
            class="btn-sm border bg-background hover:bg-accent disabled:opacity-50">
            Next
          </button>
        </div>
      </div>
    </div>
  `;
};
