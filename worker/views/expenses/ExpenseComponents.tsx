// worker/views/expenses/ExpenseComponents.tsx
import { html } from "hono/html";
import { Invoice } from "../../schema/invoice.schema";
import { invoicePayment } from "../../schema/invoicePayment.schema";
import { formatCents } from "../lib/utils";

// Type aggregation for the view
type ExpenseView = {
  payment: typeof invoicePayment.$inferSelect;
  invoice: Invoice;
};

const formatDate = (date: Date | null) =>
  date ? new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(date) : "-";

export const ExpenseStatusBadge = (status: string, extensionStatus: string) => {
  let classes = "bg-gray-100 text-gray-800";
  let label = status.replace("_", " ");

  if (status === "paid") {
    classes = "bg-green-100 text-green-800";
  } else if (status === "overdue") {
    classes = "bg-red-100 text-red-800";
  } else if (extensionStatus === "pending") {
    classes = "bg-yellow-100 text-yellow-800";
    label = "Ext. Requested";
  } else if (extensionStatus === "approved") {
    classes = "bg-blue-100 text-blue-800";
    label = "Ext. Approved";
  }

  return html`<span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${classes}">
    ${label}
  </span>`;
};

export const ExpenseCard = (item: ExpenseView) => {
  const { payment, invoice } = item;
  const isPaid = payment.status === "paid";
  const isPendingReview = payment.tenantMarkedPaidAt && !isPaid;

  // --- DATE CALCULATION LOGIC ---
  const extensionDays = payment.dueDateExtensionDays || 0;
  // Only apply extension if explicitly approved or if the landlord set it (which auto-sets status to approved/none)
  const isExtended =
    extensionDays > 0 &&
    (payment.extensionStatus === "approved" || payment.extensionStatus === "none");

  const effectiveDueDate = new Date(invoice.dueDate);
  if (isExtended) {
    effectiveDueDate.setDate(effectiveDueDate.getDate() + extensionDays);
  }

  // Determine if actually overdue based on EFFECTIVE date
  const isOverdue = !isPaid && new Date() > effectiveDueDate;
  const statusLabel = isOverdue ? "overdue" : payment.status;

  const searchBlob = `${invoice.description || ""} ${invoice.type}`.trim().toLowerCase();

  return html`
    <div
      class="bg-card text-card-foreground rounded-lg border shadow-sm p-6 space-y-4 expense-card"
      data-title="${searchBlob}"
      data-type="${invoice.type}"
      data-status="${statusLabel}"
      data-extension="${payment.extensionStatus}"
      data-paid="${isPaid ? "true" : "false"}"
      data-due="${effectiveDueDate.getTime()}">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-semibold text-lg">${invoice.description || invoice.type}</h3>
          <p class="text-sm text-muted-foreground capitalize">${invoice.type} Bill</p>
        </div>
        ${ExpenseStatusBadge(statusLabel, payment.extensionStatus)}
      </div>

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-muted-foreground block">Amount Due</span>
          <span class="font-bold text-lg">${formatCents(payment.amountOwed)}</span>
        </div>
        <div class="text-right">
          <span class="text-muted-foreground block">Due Date</span>

          ${isExtended
            ? html` <div class="flex flex-col items-end">
                <span class="font-medium ${isOverdue ? "text-destructive" : "text-green-600"}">
                  ${formatDate(effectiveDueDate)}
                </span>
                <span
                  class="text-xs text-muted-foreground line-through decoration-muted-foreground/50">
                  ${formatDate(invoice.dueDate)}
                </span>
              </div>`
            : html` <span
                class="font-medium ${payment.status === "overdue" ? "text-destructive" : ""}">
                ${formatDate(invoice.dueDate)}
              </span>`}
        </div>
      </div>

      ${isPendingReview
        ? html`<div class="bg-muted/50 p-3 rounded text-xs text-muted-foreground">
            <i data-lucide="clock" class="w-3 h-3 inline mr-1"></i>
            Marked paid on ${formatDate(payment.tenantMarkedPaidAt)}. Waiting for landlord
            confirmation.
          </div>`
        : ""}
      ${payment.extensionStatus === "rejected"
        ? html`<div class="bg-red-50 text-red-600 p-3 rounded text-xs">
            Extension request rejected. Please pay immediately.
          </div>`
        : ""}

      <div class="pt-4 flex gap-3 border-t">
        ${!isPaid && !isPendingReview
          ? html`
              <button
                hx-get="/expense/${payment.id}/pay"
                hx-target="#modal-container"
                class="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                Mark as Paid
              </button>

              ${payment.extensionStatus === "none" || payment.extensionStatus === "rejected"
                ? html`<button
                    hx-get="/expense/${payment.id}/extend"
                    hx-target="#modal-container"
                    class="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">
                    Request Extension
                  </button>`
                : html`<button
                    disabled
                    class="flex-1 opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background h-9 px-4 py-2">
                    ${payment.extensionStatus === "pending" ? "Request Pending" : "Extended"}
                  </button>`}
            `
          : html`
              <button
                disabled
                class="w-full opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded-lg text-sm font-medium bg-muted text-muted-foreground h-9">
                ${isPaid ? "Paid" : "Payment Reported"}
              </button>
            `}
      </div>
    </div>
  `;
};

export const ExpensePage = (expenses: ExpenseView[]) => html`
  <div class="max-w-4xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">My Expenses</h1>
      <p class="text-muted-foreground">Manage your rent and utility payments.</p>
    </div>

    <div class="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
      <div class="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
        <div class="relative">
          <i
            data-lucide="search"
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          ></i>
          <input
            id="expense-search"
            type="search"
            placeholder="Search by description or type..."
            class="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          id="expense-status"
          class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="extension">Extension pending</option>
        </select>
        <select
          id="expense-type"
          class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All types</option>
          ${Array.from(new Set(expenses.map((e) => e.invoice.type))).map(
            (type) => html`<option value="${type}">${type}</option>`,
          )}
        </select>
        <button
          id="expense-reset"
          class="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
        >
          Reset
        </button>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Quick filters:</span>
        <button
          type="button"
          data-range="7"
          class="rounded-full border border-input bg-background px-3 py-1 hover:bg-accent"
        >
          Due next 7 days
        </button>
        <button
          type="button"
          data-range="30"
          class="rounded-full border border-input bg-background px-3 py-1 hover:bg-accent"
        >
          Due next 30 days
        </button>
        <button
          type="button"
          data-range="overdue"
          class="rounded-full border border-input bg-background px-3 py-1 hover:bg-accent"
        >
          Overdue
        </button>
      </div>
    </div>

    ${expenses.length === 0
      ? html`<div class="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
          <i data-lucide="check-circle" class="w-12 h-12 mx-auto text-muted-foreground mb-3"></i>
          <h3 class="text-lg font-medium">All caught up!</h3>
          <p class="text-muted-foreground">No pending expenses found.</p>
        </div>`
      : html`<div class="grid gap-6 md:grid-cols-2" id="expense-grid">
            ${expenses.map(ExpenseCard)}
          </div>
          <div
            id="expense-empty"
            class="hidden text-center py-12 bg-muted/20 rounded-lg border border-dashed">
            <i
              data-lucide="search-x"
              class="w-12 h-12 mx-auto text-muted-foreground mb-3"
            ></i>
            <h3 class="text-lg font-medium">No matches</h3>
            <p class="text-muted-foreground">Try adjusting your filters.</p>
          </div>`}
  </div>

`;

// --- MODALS ---

export const MarkPaidModal = (paymentId: number, amount: number) => html`
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
    <div
      class="bg-card w-full max-w-md border rounded-lg shadow-lg p-6 space-y-6 m-4"
      onclick="event.stopPropagation()">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">Confirm Payment</h3>
        <button
          onclick="this.closest('.fixed').remove()"
          class="text-muted-foreground hover:text-foreground">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form hx-post="/expense/${paymentId}/pay" hx-target="#main-content">
        <div class="space-y-4">
          <p class="text-sm text-muted-foreground">
            You are marking <strong>${formatCents(amount)}</strong> as paid. This will notify the
            landlord.
          </p>

          <div class="space-y-2">
            <label class="text-sm font-medium">Reference / Receipt # (Optional)</label>
            <input
              type="text"
              name="reference"
              placeholder="e.g. Bank Transfer ID"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">
            Confirm Payment
          </button>
        </div>
      </form>
    </div>
  </div>

`;

export const RequestExtensionModal = (paymentId: number, dueDate: Date) => html`
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
    <div class="bg-card w-full max-w-md border rounded-lg shadow-lg p-6 space-y-6 m-4">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">Request Extension</h3>
        <button
          onclick="this.closest('.fixed').remove()"
          class="text-muted-foreground hover:text-foreground">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form hx-post="/expense/${paymentId}/extend" hx-target="#main-content">
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Proposed Date</label>
            <input
              type="date"
              name="requestedDate"
              required
              min="${new Date().toISOString().split("T")[0]}"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <p class="text-xs text-muted-foreground">Original Due Date: ${formatDate(dueDate)}</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">Reason</label>
            <textarea
              name="reason"
              rows="3"
              placeholder="Briefly explain why you need more time..."
              class="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">
            Submit Request
          </button>
        </div>
      </form>
    </div>
  </div>
`;
