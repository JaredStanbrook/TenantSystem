import { html } from "hono/html";
import { Invoice } from "../../schema/invoice.schema";
import { Property } from "../../schema/property.schema";

// Helper for formatting currency from Cents
const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

// Helper for dates
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(date);

// --- 1. Invoice Table Row ---
export const InvoiceRow = ({ invoice, propName }: { invoice: Invoice; propName: string }) => html`
  <tr class="hover:bg-muted/50 transition-colors border-b" id="invoice-row-${invoice.id}">
    <td class="p-4 align-middle font-medium">
      <div class="flex flex-col">
        <span>${invoice.description || invoice.type}</span>
        <span class="text-xs text-muted-foreground uppercase tracking-wider">${invoice.type}</span>
      </div>
    </td>
    <td class="p-4 align-middle text-muted-foreground">${propName}</td>
    <td class="p-4 align-middle">
      <div class="flex flex-col text-sm">
        <span class="font-medium">Due: ${formatDate(invoice.dueDate)}</span>
        <span class="text-xs text-muted-foreground">Issued: ${formatDate(invoice.issuedDate)}</span>
      </div>
    </td>
    <td class="p-4 align-middle font-bold">${formatMoney(invoice.totalAmount)}</td>
    <td class="p-4 align-middle text-right">
      <div class="flex justify-end gap-2">
        <button
          hx-get="/admin/invoices/${invoice.id}/edit"
          hx-target="#main-content"
          hx-swap="innerHTML"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
          aria-label="Edit invoice">
          <i data-lucide="pencil" class="w-4 h-4"></i>
        </button>

        <button
          hx-delete="/admin/invoices/${invoice.id}"
          hx-target="#invoice-row-${invoice.id}"
          hx-swap="outerHTML swap:0.5s"
          hx-confirm="Delete this invoice?"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
          aria-label="Delete invoice">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </td>
  </tr>
`;

// --- 2. Invoice Form (Create & Edit) ---
export const InvoiceForm = ({
  invoice,
  properties,
  action,
  errors = {},
}: {
  invoice?: Partial<Invoice>;
  properties: Property[]; // Needed for the select dropdown
  action: string;
  errors?: Record<string, string[]>;
}) => {
  // Convert cents to dollars for input field if editing
  const amountInDollars = invoice?.totalAmount ? (invoice.totalAmount / 100).toFixed(2) : "";

  // Format Date for Input (YYYY-MM-DD)
  const dueDateStr = invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "";

  return html`
    <div class="space-y-4 animate-in fade-in duration-300">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">
            ${invoice?.id ? "Edit Invoice" : "Create Invoice"}
          </h2>
          <p class="text-muted-foreground mt-1">Bill your tenants for rent or utilities.</p>
        </div>
        <button
          hx-get="/admin/invoices"
          hx-target="#main-content"
          class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <i data-lucide="arrow-left" class="w-4 h-4"></i>
          Back to Invoices
        </button>
      </div>

      <form
        hx-post="${action}"
        hx-target="#main-content"
        hx-swap="innerHTML"
        class="space-y-8 border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none"
              >Property <span class="text-destructive">*</span></label
            >
            <select
              name="propertyId"
              required
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
              <option value="" disabled ${!invoice?.propertyId ? "selected" : ""}>
                Select a property...
              </option>
              ${properties.map(
                (p) => html`
                  <option value="${p.id}" ${invoice?.propertyId === p.id ? "selected" : ""}>
                    ${p.nickname || p.addressLine1}
                  </option>
                `
              )}
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium leading-none"
              >Bill Type <span class="text-destructive">*</span></label
            >
            <select
              name="type"
              required
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
              ${["rent", "water", "electricity", "gas", "internet", "maintenance", "other"].map(
                (t) => html`
                  <option value="${t}" ${invoice?.type === t ? "selected" : ""}>
                    ${t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                `
              )}
            </select>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium leading-none">Description</label>
          <input
            name="description"
            value="${invoice?.description || ""}"
            placeholder="e.g. Q3 Water Bill usage"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none"
              >Total Amount ($) <span class="text-destructive">*</span></label
            >
            <input
              type="number"
              name="amountDollars"
              value="${amountInDollars}"
              min="0.01"
              step="0.01"
              required
              placeholder="0.00"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium leading-none"
              >Due Date <span class="text-destructive">*</span></label
            >
            <input
              type="date"
              name="dueDate"
              value="${dueDateStr}"
              required
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            hx-get="/admin/invoices"
            hx-target="#main-content"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <i data-lucide="save" class="w-4 h-4"></i>
            Save Invoice
          </button>
        </div>
      </form>
    </div>
  `;
};

// --- 3. Invoice Table Layout ---
export const InvoiceTable = ({
  invoices,
  properties,
}: {
  invoices: (Invoice & { propertyName: string })[];
  properties: Property[];
}) => html`
  <div class="space-y-4 animate-in fade-in duration-300">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-3xl font-bold tracking-tight">Invoices</h2>
        <p class="text-muted-foreground mt-1">
          Manage outgoing bills for your ${properties.length} properties.
        </p>
      </div>
      <button
        hx-get="/admin/invoices/create"
        hx-target="#main-content"
        hx-push-url="true"
        class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
        <i data-lucide="plus" class="w-4 h-4"></i>
        New Invoice
      </button>
    </div>

    <div class="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div class="relative w-full overflow-auto">
        <table class="w-full caption-bottom text-sm">
          <thead class="[&_tr]:border-b bg-muted/50">
            <tr class="border-b transition-colors">
              <th class="h-12 px-4 text-left font-semibold text-muted-foreground">Description</th>
              <th class="h-12 px-4 text-left font-semibold text-muted-foreground">Property</th>
              <th class="h-12 px-4 text-left font-semibold text-muted-foreground">Dates</th>
              <th class="h-12 px-4 text-left font-semibold text-muted-foreground">Amount</th>
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
              : invoices.map((i) => InvoiceRow({ invoice: i, propName: i.propertyName }))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
`;
