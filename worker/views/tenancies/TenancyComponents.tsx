// views/tenancies/TenancyComponents.tsx
import { html } from "hono/html";
import { type Tenancy, TENANCY_STATUS_VALUES } from "@server/schema/tenancy.schema";
import { VALID_TRANSITIONS } from "@server/services/tenancy.service";
import { Property } from "../../schema/property.schema";
import { SafeUser } from "../../schema/auth.schema";
import { SafeRoom } from "../../schema/room.schema";
import { capitalize, StatusBadge } from "../lib/utils";

const styles: Record<string, string> = {
  pending_agreement: "bg-yellow-100 text-yellow-800 border-yellow-200",
  bond_pending: "bg-amber-100 text-amber-800 border-amber-200",
  move_in_ready: "bg-blue-100 text-blue-800 border-blue-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  notice_period: "bg-purple-100 text-purple-800 border-purple-200",
  ended_pending_bond: "bg-rose-100 text-rose-800 border-rose-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
  evicted: "bg-red-100 text-red-800 border-red-200",
};

// Joined Data Type
type TenancyView = Tenancy & {
  user: SafeUser;
  property: Property;
  room?: SafeRoom | null; // Added Room
};

// --- 1. Tenancy Row ---
export const TenancyRow = ({ t }: { t: TenancyView }) => html`
  <tr class="hover:bg-muted/50 transition-colors border-b group" id="tenancy-row-${t.id}">
    <td class="p-4 align-middle">
      <div class="flex items-center gap-3">
        <div
          class="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
          ${t.user.displayName?.charAt(0).toUpperCase() || "?"}
        </div>
        <div class="flex flex-col">
          <span class="font-medium">${t.user.displayName}</span>
          <span class="text-xs text-muted-foreground">${t.user.email}</span>
        </div>
      </div>
    </td>
    <td class="p-4 align-middle">
      <div class="flex flex-col">
        <span class="font-medium text-sm"> ${t.property.nickname || t.property.addressLine1} </span>
        ${t.room
          ? html`<span class="text-xs text-muted-foreground flex items-center gap-1">
              <i data-lucide="door-open" class="w-3 h-3"></i> ${t.room.name}
            </span>`
          : html`<span class="text-xs text-muted-foreground italic"
              >Whole Property / No Room</span
            >`}
      </div>
    </td>
    <td class="p-4 align-middle text-sm text-muted-foreground">
      <div class="flex flex-col gap-1">
        <span class="flex items-center gap-2">
          <i data-lucide="calendar-arrow-up" class="w-3.5 h-3.5 text-emerald-600"></i>
          ${new Date(t.startDate).toLocaleDateString()}
        </span>
        ${t.endDate
          ? html`<span class="flex items-center gap-2">
              <i data-lucide="calendar-arrow-down" class="w-3.5 h-3.5 text-rose-500"></i>
              ${new Date(t.endDate).toLocaleDateString()}
            </span>`
          : html`<span class="text-xs opacity-50 pl-5.5">Periodic</span>`}
      </div>
    </td>
    <td class="p-4 align-middle">${StatusBadge(t.status, styles)}</td>

    <td class="p-4 align-middle text-right">
      <div class="flex justify-end gap-2">
        <button
          hx-get="/admin/tenancies/${t.id}/edit"
          hx-push-url="true"
          hx-target="#main-content"
          class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8">
          <i data-lucide="pencil" class="w-4 h-4"></i>
        </button>
        <button
          hx-delete="/admin/tenancies/${t.id}"
          hx-target="#tenancy-row-${t.id}"
          hx-swap="outerHTML swap:0.5s"
          hx-confirm="Delete this tenancy?"
          class="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-destructive hover:text-destructive-foreground h-8 w-8">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </td>
  </tr>
`;

// --- 2. Tenancy Table ---
export const TenancyTable = ({
  tenancies,
  showAll = false,
}: {
  tenancies: TenancyView[];
  showAll?: boolean;
}) => html`
  <div class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-bold tracking-tight">Tenancies</h2>
        <p class="text-muted-foreground mt-1">Manage leases, bond status, and room assignments.</p>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center space-x-2 bg-card border rounded-md px-3 py-2 shadow-sm">
          <input
            type="checkbox"
            id="showAll"
            name="showAll"
            value="true"
            ${showAll ? "checked" : ""}
            hx-get="/admin/tenancies?${showAll ? "" : "showAll=true"}"
            hx-target="#main-content"
            hx-push-url="true"
            class="accent-primary w-4 h-4 cursor-pointer" />
          <label for="showAll" class="text-sm font-medium cursor-pointer select-none">
            History
          </label>
        </div>

        <button
          hx-get="/admin/tenancies/create"
          hx-target="#main-content"
          hx-push-url="true"
          class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-all">
          <i data-lucide="user-plus" class="w-4 h-4"></i>
          New Tenancy
        </button>
      </div>
    </div>

    <div class="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div class="relative w-full overflow-auto">
        <table class="w-full caption-bottom text-sm">
          <thead class="[&_tr]:border-b bg-muted/40">
            <tr class="border-b transition-colors text-left">
              <th class="h-12 px-4 align-middle font-medium text-muted-foreground w-[250px]">
                Tenancy
              </th>
              <th class="h-12 px-4 align-middle font-medium text-muted-foreground">Location</th>
              <th class="h-12 px-4 align-middle font-medium text-muted-foreground">Timeline</th>
              <th class="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
              <th class="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody id="tenancy-list-body" class="[&_tr:last-child]:border-0 bg-card">
            ${tenancies.length === 0
              ? html`<tr>
                  <td colspan="5" class="p-12 text-center text-muted-foreground">
                    <div class="flex flex-col items-center gap-3">
                      <div class="bg-muted p-4 rounded-full">
                        <i data-lucide="users" class="w-8 h-8 opacity-50"></i>
                      </div>
                      <p class="font-medium">No active tenancies found.</p>
                      ${!showAll
                        ? html`<p class="text-xs">Try toggling "History" to see past leases.</p>`
                        : ""}
                    </div>
                  </td>
                </tr>`
              : tenancies.map((t) => TenancyRow({ t }))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
`;

// --- 3. Tenancy Form (Enhanced) ---
export const TenancyForm = ({
  tenancy,
  properties = [],
  rooms = [],
  action,
  emailValue = "",
  errors = {},
}: {
  tenancy?: Partial<Tenancy>;
  properties?: Property[];
  rooms?: SafeRoom[];
  action: string;
  emailValue?: string;
  errors?: Record<string, string[]>;
}) => html`
  <div class="max-w-2xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          ${tenancy?.id ? "Manage Tenancy" : "Onboard New Tenancy"}
        </h2>
        <p class="text-muted-foreground">
          ${tenancy?.id
            ? "Update lease details, status, or room."
            : "Start the leasing process for a new applicant."}
        </p>
      </div>
      <button
        hx-get="/admin/tenancies"
        hx-push-url="true"
        hx-target="#main-content"
        hx-push-url="true"
        class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors">
        <i data-lucide="arrow-left" class="w-4 h-4"></i> Back
      </button>
    </div>

    <form
      hx-post="${action}"
      hx-target="#main-content"
      class="space-y-6 border rounded-xl p-6 bg-card shadow-sm">
      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
          <i data-lucide="user" class="w-4 h-4"></i> Tenancy Details
        </h3>
        <div class="space-y-2">
          <label class="text-sm font-medium leading-none"
            >Email Address <span class="text-destructive">*</span></label
          >
          <div class="relative">
            <i data-lucide="mail" class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"></i>
            <input
              type="email"
              name="email"
              value="${emailValue}"
              ${tenancy?.id ? "disabled" : "required"}
              placeholder="applicant@example.com"
              class="flex h-10 w-full pl-9 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:bg-muted/50" />
          </div>
          ${errors.email
            ? html`<p class="text-destructive text-xs font-medium">${errors.email[0]}</p>`
            : ""}
        </div>
      </div>

      <hr class="border-border/50" />

      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
          <i data-lucide="map-pin" class="w-4 h-4"></i> Property & Room
        </h3>

        <div class="grid sm:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none"
              >Property <span class="text-destructive">*</span></label
            >
            <select
              name="propertyId"
              required
              hx-get="/admin/tenancies/rooms-select"
              hx-target="#room-select"
              hx-trigger="change"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Select a Property...</option>
              ${properties.map(
                (p) => html`
                  <option value="${p.id}" ${tenancy?.propertyId === p.id ? "selected" : ""}>
                    ${p.nickname || p.addressLine1}
                  </option>
                `,
              )}
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium leading-none flex justify-between">
              Room Assignment
              <span class="text-xs text-muted-foreground font-normal">Optional</span>
            </label>
            <select
              id="room-select"
              name="roomId"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Select a Room...</option>
              ${rooms.map(
                (r) => html`
                  <option value="${r.id}" ${tenancy?.roomId === r.id ? "selected" : ""}>
                    ${r.name} (${r.status ? r.status.replace("_", " ") : "Unknown"})
                  </option>
                `,
              )}
            </select>
          </div>
        </div>
      </div>

      <hr class="border-border/50" />

      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
          <i data-lucide="file-text" class="w-4 h-4"></i> Lease Details
        </h3>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none"
              >Start Date <span class="text-destructive">*</span></label
            >
            <input
              type="date"
              name="startDate"
              value="${tenancy?.startDate
                ? new Date(tenancy.startDate).toISOString().split("T")[0]
                : ""}"
              required
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium leading-none flex justify-between">
              End Date
              <span class="text-xs text-muted-foreground font-normal">Optional</span>
            </label>
            <input
              type="date"
              name="endDate"
              value="${tenancy?.endDate
                ? new Date(tenancy.endDate).toISOString().split("T")[0]
                : ""}"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium leading-none">Bond Amount</label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
            <input
              type="number"
              name="bondAmount"
              placeholder="0.00"
              step="0.01"
              value="${tenancy?.bondAmount || ""}"
              class="flex h-10 w-full pl-7 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>
      </div>
      <div class="flex justify-end pt-2">
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 py-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
          <i data-lucide="${tenancy?.id ? "save" : "user-plus"}" class="mr-2 h-4 w-4"></i>
          ${tenancy?.id ? "Save Changes" : "Create Tenancy"}
        </button>
      </div>
      ${tenancy?.id
        ? html`
            ${TenancyStatusManager({
              tenancy: tenancy as Tenancy,
              helperText: "Helpful text!",
            })}
          `
        : ""}
    </form>
  </div>
`;

export const TenancyStatusManager = ({
  tenancy,
  helperText = "Select a new status to advance the tenancy lifecycle.",
}: {
  tenancy: Tenancy;
  helperText?: string;
}) => {
  const status = tenancy.status || "pending";

  return html`
    <div
      id="tenancy-status-card-${tenancy.id}"
      class="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3"
      hx-target="this"
      hx-swap="outerHTML">
      <div class="flex items-center justify-between">
        <label class="text-sm font-semibold">Current Process Status</label>
        ${StatusBadge(status, styles)}
      </div>

      <div class="w-full relative">
        <form hx-patch="/admin/tenancies/${tenancy.id}/status">
          <select
            name="status"
            class="h-8 w-full text-xs rounded-md border border-input bg-background px-3 py-1 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onchange="this.form.requestSubmit()">
            <option value="${status}" selected disabled>Change Status...</option>
            ${TENANCY_STATUS_VALUES.map(
              (s) =>
                html`<option value="${s}">Move to: ${capitalize(s.replace(/_/g, " "))}</option>`,
            )}
          </select>

          <div class="htmx-indicator absolute top-2 right-8">
            <i data-lucide="chevron-down" class="animate-spin h-4 w-4 text-primary"></i>
          </div>
        </form>
      </div>

      <div class="text-xs text-muted-foreground flex items-center">
        <i data-lucide="info" class="w-3 h-3 mr-1"></i>
        ${helperText}
      </div>
    </div>
  `;
};
