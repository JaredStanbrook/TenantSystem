// worker/views/invoices/RecurringComponents.tsx
import { html } from "hono/html";
import { TenantSection } from "./InvoiceComponents";
import { Property } from "../../schema/property.schema";

const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(date);

export const RecurringInvoiceList = ({ schedules }: { schedules: any[] }) => {
  return html`
    <div class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Recurring Schedules</h2>
          <p class="text-muted-foreground mt-1">Manage automated invoice generation.</p>
        </div>
        <div class="flex gap-2">
          <button
            hx-get="/admin/invoices"
            hx-target="#main-content"
            hx-push-url="true"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4">
            View History
          </button>
          <button
            hx-get="/admin/invoices/create"
            hx-target="#main-content"
            hx-push-url="true"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4">
            New Schedule
          </button>
        </div>
      </div>

      <div class="rounded-lg border bg-card shadow-sm overflow-hidden">
        <table class="w-full caption-bottom text-sm">
          <thead class="bg-muted/50">
            <tr class="border-b text-left">
              <th class="p-4 font-medium text-muted-foreground">Description</th>
              <th class="p-4 font-medium text-muted-foreground">Frequency</th>
              <th class="p-4 font-medium text-muted-foreground">Next Run</th>
              <th class="p-4 font-medium text-muted-foreground">Amount</th>
              <th class="p-4 font-medium text-muted-foreground">Status</th>
              <th class="p-4 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${schedules.length === 0
              ? html`<tr>
                  <td colspan="6" class="p-8 text-center text-muted-foreground">
                    No active schedules.
                  </td>
                </tr>`
              : ""}
            ${schedules.map(
              (s) => html`
                <tr class="border-b hover:bg-muted/50 transition-colors">
                  <td class="p-4">
                    <div class="font-medium">${s.description}</div>
                    <div class="text-xs text-muted-foreground">${s.propertyName}</div>
                  </td>
                  <td class="p-4 capitalize">${s.frequency}</td>
                  <td class="p-4">${formatDate(s.nextRunDate)}</td>
                  <td class="p-4 font-mono">${formatMoney(s.totalAmount)}</td>
                  <td class="p-4">
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${s.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"}">
                      ${s.active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td class="p-4 text-right space-x-2">
                    <button
                      hx-post="/admin/invoices/recurring/${s.id}/toggle"
                      hx-target="#main-content"
                      class="text-xs underline text-muted-foreground hover:text-foreground">
                      ${s.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      hx-get="/admin/invoices/recurring/${s.id}/edit"
                      hx-target="#main-content"
                      hx-push-url="true"
                      class="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-accent">
                      <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                  </td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

export const RecurringInvoiceForm = ({
  schedule,
  splits,
  properties,
}: {
  schedule: any;
  splits: any[];
  properties: Property[];
}) => {
  // Map existing data to match the form fields expected by the controller
  const amountDollars = (schedule.totalAmount / 100).toFixed(2);
  // Important: We use "dueDate" field name to represent "Next Run Date" in the edit context
  const nextRunStr = new Date(schedule.nextRunDate).toISOString().split("T")[0];
  const endDateStr = schedule.endDate ? new Date(schedule.endDate).toISOString().split("T")[0] : "";

  return html`
    <div class="max-w-5xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight">Edit Schedule</h2>
        <button
          hx-get="/admin/invoices/recurring"
          hx-target="#main-content"
          hx-push-url="true"
          class="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back
        </button>
      </div>

      <form
        hx-post="/admin/invoices/recurring/${schedule.id}/update"
        hx-target="#main-content"
        class="grid gap-8 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-6 border rounded-lg p-6 bg-card shadow-sm">
          <input type="hidden" name="isRecurring" value="true" />

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-sm font-medium">Property</label>
              <select
                name="propertyId"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                ${properties.map(
                  (p) =>
                    html`<option value="${p.id}" ${p.id === schedule.propertyId ? "selected" : ""}>
                      ${p.nickname}
                    </option>`,
                )}
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Type</label>
              <select
                name="type"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                ${["rent", "water", "electricity", "gas", "internet"].map(
                  (t) =>
                    html`<option value="${t}" ${t === schedule.type ? "selected" : ""}>
                      ${t.toUpperCase()}
                    </option>`,
                )}
              </select>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-sm font-medium">Frequency</label>
              <select
                name="frequency"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                ${["weekly", "fortnightly", "monthly", "yearly"].map(
                  (f) =>
                    html`<option value="${f}" ${f === schedule.frequency ? "selected" : ""}>
                      ${f}
                    </option>`,
                )}
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Next Run Date</label>
              <input
                type="date"
                name="dueDate"
                value="${nextRunStr}"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <p class="text-[10px] text-muted-foreground">
                The date the next invoice will be generated.
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">Total Amount ($)</label>
            <input
              type="number"
              step="0.01"
              name="amountDollars"
              value="${amountDollars}"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Description</label>
            <input
              name="description"
              value="${schedule.description}"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div class="space-y-2 pt-4 border-t">
            <label class="text-sm font-medium">End Date (Optional)</label>
            <input
              type="date"
              name="recurrenceEndDate"
              value="${endDateStr}"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div class="flex justify-end pt-4">
            <button
              type="submit"
              class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium">
              Save Changes
            </button>
          </div>
        </div>

        <div class="lg:col-span-1">${TenantSection({ splits, isLocked: false })}</div>
      </form>
    </div>
  `;
};
