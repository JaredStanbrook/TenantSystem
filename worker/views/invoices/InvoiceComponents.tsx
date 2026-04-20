import { html } from "hono/html";
import { type BillingListItem } from "@server/services/billing.service";
import { Property } from "@server/schema/property.schema";
import { BILL_TYPE_VALUES, BILL_RECORD_TYPES, type BillingRecordType } from "@server/schema/billing.shared";
import { formatCents } from "../lib/utils";

type TenantOption = {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  roomId?: number | null;
  roomName?: string | null;
};

const formatDate = (date?: Date | string | null) => {
  if (!date) return "-";
  const parsed = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(parsed.getTime())
    ? "-"
    : new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(parsed);
};

const toInputDate = (date?: Date | string | null) => {
  if (!date) return "";
  const parsed = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().split("T")[0];
};

const BillingStatusBadge = (status: string) => {
  const classes =
    status === "paid"
      ? "bg-green-100 text-green-800"
      : status === "overdue"
        ? "bg-red-100 text-red-800"
        : status === "partial"
          ? "bg-amber-100 text-amber-800"
          : status === "void"
            ? "bg-gray-200 text-gray-600"
            : "bg-blue-50 text-blue-700";

  return html`<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${classes}">
    ${status.replace(/_/g, " ")}
  </span>`;
};

const RecordTypeBadge = (recordType: BillingRecordType, category?: string) => html`
  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground uppercase tracking-wide">
    ${recordType}${recordType === "bill" && category ? ` · ${category}` : ""}
  </span>
`;

const RequiredMark = () => html`<span class="text-destructive">*</span>`;

const FieldError = (errors?: Record<string, string[]>, field?: string) =>
  field && errors?.[field]?.[0]
    ? html`<p class="text-destructive text-xs font-medium">${errors[field][0]}</p>`
    : "";

export const BillingContextFields = ({
  tenants = [],
  selectedUserId,
  selectedRoomId,
}: {
  tenants?: TenantOption[];
  selectedUserId?: string;
  selectedRoomId?: number | null;
}) => html`
  <div id="billing-context-fields" class="grid gap-6 md:grid-cols-2">
    <div class="space-y-2">
      <label class="text-sm font-medium">Tenant ${RequiredMark()}</label>
      <select
        name="userId"
        required
        class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">Select Tenant...</option>
        ${tenants.map(
          (tenant) => html`
            <option value="${tenant.userId}" ${selectedUserId === tenant.userId ? "selected" : ""}>
              ${(tenant.displayName || tenant.email || tenant.userId) + (tenant.email ? ` (${tenant.email})` : "")}
            </option>
          `,
        )}
      </select>
    </div>
    <div class="space-y-2">
      <label class="text-sm font-medium">Room</label>
      <select
        name="roomId"
        class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">No Room</option>
        ${tenants
          .filter((tenant) => tenant.roomId)
          .map(
            (tenant) => html`
              <option value="${tenant.roomId!}" ${selectedRoomId === tenant.roomId ? "selected" : ""}>
                ${tenant.roomName || `Room ${tenant.roomId}`}
              </option>
            `,
          )}
      </select>
    </div>
  </div>
`;

export const BillingTypeFields = ({
  recordType,
  invoice,
  errors,
}: {
  recordType: BillingRecordType;
  invoice?: Partial<BillingListItem>;
  errors?: Record<string, string[]>;
}) => html`
  <div id="billing-type-fields" class="grid gap-6 md:grid-cols-2">
    ${recordType === "bill"
      ? html`
          <div class="space-y-2">
            <label class="text-sm font-medium">Bill Type ${RequiredMark()}</label>
            <select
              name="billType"
              required
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select Bill Type...</option>
              ${BILL_TYPE_VALUES.map(
                (type) => html`
                  <option value="${type}" ${invoice?.category === type ? "selected" : ""}>
                    ${type.toUpperCase()}
                  </option>
                `,
              )}
            </select>
            ${FieldError(errors, "billType")}
          </div>
        `
      : ""}

    ${recordType !== "bond"
      ? html`
          <div class="space-y-2">
            <label class="text-sm font-medium">
              ${recordType === "bill" ? "Start Date" : "Rent Start Date"} ${recordType === "rent" ? RequiredMark() : ""}
            </label>
            <input
              type="date"
              name="startDate"
              ${recordType === "rent" ? "required" : ""}
              value="${toInputDate(invoice?.startDate)}"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            ${FieldError(errors, "startDate")}
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">
              ${recordType === "bill" ? "End Date" : "Rent End Date"} ${recordType === "rent" ? RequiredMark() : ""}
            </label>
            <input
              type="date"
              name="endDate"
              ${recordType === "rent" ? "required" : ""}
              value="${toInputDate(invoice?.endDate)}"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            ${FieldError(errors, "endDate")}
          </div>
        `
      : ""}
  </div>
`;

export const InvoiceForm = ({
  invoice,
  properties,
  propertyTenants = [],
  action,
  page = "1",
  errors,
}: {
  invoice?: Partial<BillingListItem>;
  properties: Property[];
  propertyTenants?: TenantOption[];
  action: string;
  page?: string | number;
  errors?: Record<string, string[]>;
}) => {
  const recordType = (invoice?.recordType || "bill") as BillingRecordType;
  const amountInDollars = invoice?.totalAmount ? (invoice.totalAmount / 100).toFixed(2) : "";
  const isEdit = !!invoice?.id;

  return html`
    <div class="max-w-3xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">${isEdit ? "Manage Billing Record" : "New Billing Record"}</h2>
          <p class="text-muted-foreground mt-1">Per-tenant rent, bond, and bill records.</p>
        </div>
        <div class="flex items-center gap-3">
          ${isEdit && invoice?.recordType && invoice?.id
            ? html`
                <a
                  href="/admin/invoices/${invoice.recordType}/${invoice.id}/pdf"
                  target="_blank"
                  class="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80">
                  <i data-lucide="download" class="w-4 h-4"></i>
                  Download PDF
                </a>
              `
            : ""}
          <button
            hx-get="/admin/invoices?page=${page}"
            hx-target="#main-content"
            hx-push-url="true"
            class="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Billing
          </button>
        </div>
      </div>

      <form hx-post="${action}" hx-target="#main-content" class="space-y-6">
        <input type="hidden" name="page" value="${page}" />

        <div class="space-y-8 border rounded-lg p-8 bg-card shadow-sm">
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-sm font-medium">Record Type ${RequiredMark()}</label>
              <select
                name="recordType"
                ${isEdit ? "disabled" : ""}
                hx-get="/admin/invoices/fragments/type-fields"
                hx-target="#billing-type-fields"
                hx-include="closest form"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                ${BILL_RECORD_TYPES.map(
                  (type) => html`
                    <option value="${type}" ${recordType === type ? "selected" : ""}>
                      ${type.toUpperCase()}
                    </option>
                  `,
                )}
              </select>
              ${isEdit ? html`<input type="hidden" name="recordType" value="${recordType}" />` : ""}
              ${FieldError(errors, "recordType")}
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Property ${RequiredMark()}</label>
              <select
                name="propertyId"
                required
                hx-get="/admin/invoices/fragments/property-context"
                hx-target="#billing-context-fields"
                hx-include="closest form"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select Property...</option>
                ${properties.map(
                  (prop) => html`
                    <option value="${prop.id}" ${invoice?.propertyId === prop.id ? "selected" : ""}>
                      ${prop.nickname || prop.addressLine1}
                    </option>
                  `,
                )}
              </select>
              ${FieldError(errors, "propertyId")}
            </div>

            ${BillingContextFields({
              tenants: propertyTenants,
              selectedUserId: invoice?.userId,
              selectedRoomId: invoice?.roomId,
            })}
            ${FieldError(errors, "userId")}

            <div class="space-y-2">
              <label class="text-sm font-medium">Amount ($) ${RequiredMark()}</label>
              <input
                type="number"
                step="0.01"
                name="amountDollars"
                required
                value="${amountInDollars}"
                placeholder="0.00"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              ${FieldError(errors, "amountDollars")}
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Due Date ${RequiredMark()}</label>
              <input
                type="date"
                name="dueDate"
                required
                value="${toInputDate(invoice?.dueDate)}"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              ${FieldError(errors, "dueDate")}
            </div>
          </div>

          ${BillingTypeFields({
            recordType,
            invoice,
            errors,
          })}

          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2 md:col-span-2">
              <label class="text-sm font-medium">Description</label>
              <input
                name="description"
                value="${invoice?.description || ""}"
                placeholder="Optional description"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              ${FieldError(errors, "description")}
            </div>
          </div>

          ${isEdit && invoice
            ? html`
                <div class="rounded-lg border bg-muted/20 p-4 text-sm space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-semibold">${invoice.displayNumber}</div>
                      <div class="text-muted-foreground">${invoice.tenantName} · ${invoice.propertyName}</div>
                    </div>
                    ${BillingStatusBadge(invoice.status || "open")}
                  </div>
                  <div class="grid gap-3 md:grid-cols-2">
                    <div>Paid: <span class="font-semibold">${formatCents(invoice.amountPaid || 0)}</span></div>
                    <div>Reference: <span class="font-semibold">${invoice.paymentReference || "—"}</span></div>
                    <div>Extension: <span class="font-semibold">${invoice.extensionStatus || "none"}</span></div>
                    <div>Days: <span class="font-semibold">${invoice.dueDateExtensionDays || 0}</span></div>
                  </div>
                  ${invoice.adminNote ? html`<div class="text-muted-foreground">Admin note: ${invoice.adminNote}</div>` : ""}
                  <div class="flex flex-wrap gap-2 pt-2">
                    ${invoice.tenantMarkedPaidAt && invoice.status !== "paid"
                      ? html`
                          <button type="button" hx-post="/admin/invoices/${invoice.recordType}/${invoice.id}/payment/approve" hx-swap="none" class="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Approve Payment</button>
                          <button type="button" hx-post="/admin/invoices/${invoice.recordType}/${invoice.id}/payment/reject" hx-swap="none" hx-prompt="Optional rejection reason" class="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium">Reject Payment</button>
                        `
                      : ""}
                    ${invoice.extensionStatus === "pending"
                      ? html`
                          <button type="button" hx-post="/admin/invoices/${invoice.recordType}/${invoice.id}/approve-extension" hx-swap="none" class="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Approve Extension</button>
                          <button type="button" hx-post="/admin/invoices/${invoice.recordType}/${invoice.id}/reject-extension" hx-swap="none" hx-prompt="Optional rejection reason" class="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium">Reject Extension</button>
                        `
                      : ""}
                    <button type="button" hx-post="/admin/invoices/${invoice.recordType}/${invoice.id}/grant-extension" hx-swap="none" hx-prompt="How many days?" class="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium">Grant Extension</button>
                    ${invoice.dueDateExtensionDays
                      ? html`<button type="button" hx-post="/admin/invoices/${invoice.recordType}/${invoice.id}/revoke-extension" hx-swap="none" class="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium">Revoke Extension</button>`
                      : ""}
                  </div>
                </div>
              `
            : ""}

          <div class="flex justify-end pt-6 border-t">
            <button type="submit" class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2.5 text-sm font-medium shadow">
              ${isEdit ? "Update Record" : "Create Record"}
            </button>
          </div>
        </div>
      </form>
    </div>
  `;
};

const InvoiceRow = ({
  invoice,
  currentPage,
}: {
  invoice: BillingListItem;
  currentPage: number;
}) => {
  const isFullyPaid = (invoice.amountPaid || 0) >= invoice.totalAmount && invoice.totalAmount > 0;
  return html`
    <tr
      class="hover:bg-muted/50 transition-colors border-b"
      id="invoice-row-${invoice.recordType}-${invoice.id}"
      data-title="${`${invoice.description || ""} ${invoice.tenantName} ${invoice.propertyName}`.trim().toLowerCase()}"
      data-status="${invoice.status}"
      data-type="${invoice.recordType}"
      data-property="${invoice.propertyName}"
      data-paid="${isFullyPaid ? "true" : "false"}"
      data-due="${new Date(invoice.dueDate).getTime()}"
    >
      <td class="p-4 align-middle">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm">${invoice.displayNumber}</span>
            ${RecordTypeBadge(invoice.recordType, invoice.recordType === "bill" ? invoice.category : undefined)}
          </div>
          <div class="text-sm text-muted-foreground">${invoice.description || invoice.category}</div>
          <div class="text-xs text-muted-foreground">${invoice.tenantName}</div>
        </div>
      </td>
      <td class="p-4 align-middle text-sm text-muted-foreground">${invoice.propertyName}</td>
      <td class="p-4 align-middle">
        <div class="flex flex-col text-sm">
          <span class="font-medium">Due: ${formatDate(invoice.dueDate)}</span>
          ${(invoice.startDate || invoice.endDate)
            ? html`<span class="text-xs text-muted-foreground">${formatDate(invoice.startDate)} → ${formatDate(invoice.endDate)}</span>`
            : html`<span class="text-xs text-muted-foreground">Issued: ${formatDate(invoice.issuedDate)}</span>`}
        </div>
      </td>
      <td class="p-4 align-middle">
        <div class="flex flex-col gap-1">
          <span class="font-semibold">${formatCents(invoice.totalAmount)}</span>
          ${(invoice.amountPaid || 0) > 0
            ? html`<span class="text-xs text-muted-foreground">Paid: ${formatCents(invoice.amountPaid || 0)}</span>`
            : ""}
        </div>
      </td>
      <td class="p-4 align-middle">${BillingStatusBadge(invoice.status)}</td>
      <td class="p-4 align-middle text-right">
        <div class="flex justify-end gap-2">
          <a
            href="/admin/invoices/${invoice.recordType}/${invoice.id}/pdf"
            target="_blank"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-blue-50 hover:text-blue-600 h-8 w-8"
          >
            <i data-lucide="download" class="w-4 h-4"></i>
          </a>
          <button
            hx-get="/admin/invoices/${invoice.recordType}/${invoice.id}/edit?page=${currentPage}"
            hx-push-url="true"
            hx-target="#main-content"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
          >
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <button
            hx-delete="/admin/invoices/${invoice.recordType}/${invoice.id}"
            hx-target="#invoice-row-${invoice.recordType}-${invoice.id}"
            hx-swap="outerHTML swap:0.5s"
            hx-confirm="Delete this record?"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
          >
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
  showAll = false,
}: {
  invoices: BillingListItem[];
  properties: Property[];
  pagination: { page: number; totalPages: number };
  showAll?: boolean;
}) => {
  const { page, totalPages } = pagination;
  const propertyNames = Array.from(new Set(properties.map((p) => p.nickname || p.addressLine1).filter(Boolean)));

  return html`
    <div class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Billing</h2>
          <p class="text-muted-foreground mt-1">Manage rent, bond, and tenant bills.</p>
        </div>
        <div class="flex gap-2">
          <button
            hx-get="/admin/invoices/create?page=${page}"
            hx-target="#main-content"
            hx-push-url="true"
            class="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 shadow transition-colors"
          >
            <i data-lucide="plus" class="w-4 h-4"></i>
            New Record
          </button>
        </div>
      </div>

      <div class="rounded-2xl border bg-card p-4 shadow-sm md:p-5" id="invoice-filters">
        <div class="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]">
          <div class="relative">
            <i data-lucide="search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></i>
            <input id="invoice-search" type="search" placeholder="Search description, tenant, property..." class="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" />
          </div>
          <select id="invoice-status" class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
          </select>
          <select id="invoice-type" class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="all">All types</option>
            ${BILL_RECORD_TYPES.map((type) => html`<option value="${type}">${type}</option>`)}
          </select>
          <select id="invoice-property" class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="all">All properties</option>
            ${propertyNames.map((name) => html`<option value="${name}">${name}</option>`)}
          </select>
          <button id="invoice-reset" class="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-accent">Reset</button>
        </div>
      </div>

      <div class="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div class="relative w-full overflow-auto">
          <table class="w-full caption-bottom text-sm">
            <thead class="[&_tr]:border-b bg-muted/40">
              <tr class="border-b transition-colors text-left">
                <th class="h-12 px-4 align-middle font-medium text-muted-foreground">Record</th>
                <th class="h-12 px-4 align-middle font-medium text-muted-foreground">Property</th>
                <th class="h-12 px-4 align-middle font-medium text-muted-foreground">Period / Due</th>
                <th class="h-12 px-4 align-middle font-medium text-muted-foreground">Amount</th>
                <th class="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                <th class="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="invoice-list" class="[&_tr:last-child]:border-0 bg-card">
              ${invoices.length === 0
                ? html`<tr><td colspan="6" class="p-12 text-center text-muted-foreground">No billing records found.</td></tr>`
                : invoices.map((invoice) => InvoiceRow({ invoice, currentPage: page }))}
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex justify-between text-sm text-muted-foreground">
        <button
          ${page > 1
            ? `hx-get="/admin/invoices?page=${page - 1}${showAll ? "&showAll=true" : ""}" hx-target="#main-content" hx-push-url="true"`
            : "disabled"}
          class="rounded-lg border border-input bg-background px-4 py-2 disabled:opacity-50"
        >
          Previous
        </button>
        <span>Page ${page} of ${totalPages}</span>
        <button
          ${page < totalPages
            ? `hx-get="/admin/invoices?page=${page + 1}${showAll ? "&showAll=true" : ""}" hx-target="#main-content" hx-push-url="true"`
            : "disabled"}
          class="rounded-lg border border-input bg-background px-4 py-2 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  `;
};
