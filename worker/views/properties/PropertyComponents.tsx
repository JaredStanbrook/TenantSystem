import { html } from "hono/html";
import { Property } from "../../schema/property.schema";
import { capitalize } from "../lib/utils";

// --- 1. Property Table Row ---
export const PropertyRow = ({ prop }: { prop: Property }) => html`
  <tr class="hover:bg-muted/50 transition-colors border-b" id="row-${prop.id}">
    <td class="p-4 align-middle font-medium">${prop.nickname || "—"}</td>
    <td class="p-4 align-middle">
      ${prop.addressLine1}, ${prop.city} ${prop.state} ${prop.postcode}
    </td>
    <td class="p-4 align-middle">
      <div class="flex gap-2 text-sm text-muted-foreground">
        <span class="flex items-center gap-1">
          <i data-lucide="bed" class="w-4 h-4"></i> ${prop.bedrooms}
        </span>
        <span class="flex items-center gap-1">
          <i data-lucide="bath" class="w-4 h-4"></i> ${prop.bathrooms}
        </span>
      </div>
    </td>
    <td class="p-4 align-middle">
      <span
        class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${prop.status ===
        "occupied"
          ? "border-transparent bg-green-500/15 text-green-700"
          : prop.status === "maintenance"
          ? "border-transparent bg-yellow-500/15 text-yellow-700"
          : "border-transparent bg-secondary text-secondary-foreground"}">
        ${capitalize(prop.status)}
      </span>
    </td>
    <td class="p-4 align-middle text-right">
      <div class="flex justify-end gap-2">
        <button
          hx-get="/admin/properties/${prop.id}/rooms"
          hx-target="#main-content"
          hx-swap="innerHTML"
          hx-push-url="true"
          class="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-blue-50 hover:text-blue-600 h-8 w-8"
          title="Manage Rooms">
          <i data-lucide="door-open" class="w-4 h-4"></i>
        </button>
        <button
          hx-get="/admin/properties/${prop.id}/edit"
          hx-target="#main-content"
          hx-swap="innerHTML"
          hx-push-url="true"
          class="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
          aria-label="Edit property">
          <i data-lucide="pencil" class="w-4 h-4"></i>
        </button>

        <button
          hx-delete="/admin/properties/${prop.id}"
          hx-target="#row-${prop.id}"
          hx-swap="outerHTML swap:0.5s"
          hx-confirm="Are you sure you want to delete this property?"
          class="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
          aria-label="Delete property">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </td>
  </tr>
`;

// --- 2. Property Form (Create & Edit) ---
export const PropertyForm = ({
  prop,
  action,
  errors = {},
}: {
  prop?: Partial<Property>;
  action: string;
  errors?: Record<string, string[]>;
}) => html`
  <div class="max-w-7xl pb-4 mx-auto pt-18">
    <div class="space-y-4 animate-in fade-in duration-300">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">
            ${prop?.id ? "Edit Property" : "Add New Property"}
          </h2>
          <p class="text-muted-foreground mt-1">
            ${prop?.id
              ? "Update property details below"
              : "Fill in the details to add a new property"}
          </p>
        </div>
        <button
          hx-get="/admin/properties"
          hx-target="#main-content"
          hx-swap="innerHTML"
          hx-push-url="true"
          class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <i data-lucide="arrow-left" class="w-4 h-4"></i>
          Back to list
        </button>
      </div>

      <form
        hx-post="${action}"
        hx-target="#main-content"
        hx-swap="innerHTML"
        hx-disabled-elt="find button[type='submit']"
        class="space-y-8 border rounded-lg p-6 bg-card text-card-foreground shadow-sm relative">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <label
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Nickname <span class="text-muted-foreground">(Optional)</span>
            </label>
            <input
              name="nickname"
              value="${prop?.nickname || ""}"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="e.g. My First Rental" />
          </div>
          <div class="space-y-2">
            <label
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Property Type <span class="text-destructive">*</span>
            </label>
            <select
              name="propertyType"
              required
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              ${["house", "apartment", "unit", "studio"].map(
                (t) => html`
                  <option value="${t}" ${prop?.propertyType === t ? "selected" : ""}>
                    ${t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                `
              )}
            </select>
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <i data-lucide="map-pin" class="w-5 h-5"></i>
            Location
          </h3>
          <div class="grid gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">
                Address Line 1 <span class="text-destructive">*</span>
              </label>
              <input
                name="addressLine1"
                value="${prop?.addressLine1 || ""}"
                required
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="123 Main Street" />
              ${errors.addressLine1
                ? html`<p class="text-sm text-destructive flex items-center gap-1">
                    <i data-lucide="alert-circle" class="w-4 h-4"></i>
                    ${errors.addressLine1[0]}
                  </p>`
                : ""}
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium leading-none"
                  >City <span class="text-destructive">*</span></label
                >
                <input
                  name="city"
                  value="${prop?.city || ""}"
                  placeholder="City"
                  required
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium leading-none"
                  >State <span class="text-destructive">*</span></label
                >
                <input
                  name="state"
                  value="${prop?.state || ""}"
                  placeholder="State"
                  required
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium leading-none"
                  >Postcode <span class="text-destructive">*</span></label
                >
                <input
                  name="postcode"
                  value="${prop?.postcode || ""}"
                  placeholder="Postcode"
                  required
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium leading-none">Country</label>
                <input
                  name="country"
                  value="${prop?.country || "Australia"}"
                  placeholder="Country"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <i data-lucide="home" class="w-5 h-5"></i>
            Property Details
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none flex items-center gap-1">
                <i data-lucide="bed" class="w-4 h-4"></i>
                Bedrooms <span class="text-destructive">*</span>
              </label>
              <input
                type="number"
                name="bedrooms"
                value="${prop?.bedrooms ?? 1}"
                min="0"
                required
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none flex items-center gap-1">
                <i data-lucide="bath" class="w-4 h-4"></i>
                Bathrooms <span class="text-destructive">*</span>
              </label>
              <input
                type="number"
                name="bathrooms"
                value="${prop?.bathrooms ?? 1}"
                min="0"
                step="0.5"
                required
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none flex items-center gap-1">
                <i data-lucide="car" class="w-4 h-4"></i>
                Parking
              </label>
              <input
                type="number"
                name="parkingSpaces"
                value="${prop?.parkingSpaces ?? 0}"
                min="0"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none flex items-center gap-1">
                <i data-lucide="dollar-sign" class="w-4 h-4"></i>
                Rent <span class="text-destructive">*</span>
              </label>
              <input
                type="number"
                name="rentAmount"
                value="${prop?.rentAmount || ""}"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            hx-get="/admin/properties"
            hx-target="#main-content"
            hx-swap="innerHTML"
            hx-push-url="true"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <i data-lucide="${prop?.id ? "save" : "plus"}" class="w-4 h-4"></i>
            <span class="htmx-indicator:hidden">
              ${prop?.id ? "Save Changes" : "Create Property"}
            </span>
            <span class="hidden htmx-indicator:inline-flex items-center gap-2">
              <svg
                class="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
`;

// --- 3. Properties Table Layout ---
export const PropertyTable = ({ properties }: { properties: Property[] }) => html`
  <div class="max-w-7xl pb-4 mx-auto pt-18">
    <div class="space-y-4 animate-in fade-in duration-300">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Properties</h2>
          <p class="text-muted-foreground mt-1">
            Manage your real estate portfolio. ${properties.length}
            ${properties.length === 1 ? "property" : "properties"} total.
          </p>
        </div>
        <button
          hx-get="/admin/properties/create"
          hx-target="#main-content"
          hx-swap="innerHTML"
          hx-push-url="true"
          class="inline-flex items-center justify-center gap-2 text-sm rounded-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          <i data-lucide="plus" class="w-4 h-4"></i>
          Add Property
        </button>
      </div>

      <div class="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div class="relative w-full overflow-auto">
          <table class="w-full caption-bottom text-sm">
            <thead class="[&_tr]:border-b bg-muted/50">
              <tr class="border-b transition-colors">
                <th class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                  Nickname
                </th>
                <th class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                  Address
                </th>
                <th class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                  Specs
                </th>
                <th class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                  Status
                </th>
                <th class="h-12 px-4 text-right align-middle font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="[&_tr:last-child]:border-0">
              ${properties.length === 0
                ? html` <tr>
                    <td colspan="5" class="p-12 text-center">
                      <div class="flex flex-col items-center gap-3 text-muted-foreground">
                        <i data-lucide="home" class="w-12 h-12 opacity-50"></i>
                        <div>
                          <p class="font-medium text-foreground">No properties found</p>
                          <p class="text-sm">Click "Add Property" to create your first property</p>
                        </div>
                      </div>
                    </td>
                  </tr>`
                : properties.map((p) => PropertyRow({ prop: p }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
`;

export const RentReconciliationModal = ({
  id,
  currentCount,
  targetCount,
  currentRent,
  targetRent,
  formPayload,
}: {
  id: number;
  currentCount: number;
  targetCount: number;
  currentRent: number;
  targetRent: number;
  formPayload: Record<string, any>;
}) => {
  const isAdding = targetCount > currentCount;
  const actionText = isAdding ? "Adding" : "Removing";
  const diff = Math.abs(targetCount - currentCount);

  // Serialize payload to keep other form data (address, name, etc.) alive
  const payloadString = JSON.stringify(formPayload);

  return html`
    <div id="modal-container" hx-swap-oob="innerHTML">
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          class="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden">
          <div class="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-start gap-4">
            <div class="p-2 bg-blue-100 rounded-full text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <line x1="12" x2="12" y1="2" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-lg text-gray-900">Rent Adjustment Required</h3>
              <p class="text-sm text-gray-600">
                You are ${actionText.toLowerCase()} <strong>${diff} room(s)</strong>. How should
                this affect the rent?
              </p>
            </div>
          </div>

          <div class="p-6 space-y-4">
            <button
              hx-post="/admin/properties/${id}/update"
              hx-vals="${JSON.stringify({
                ...formPayload,
                rentStrategy: "distribute_property_rent",
              })}"
              hx-target="#main-content"
              class="w-full text-left group flex items-start gap-3 p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-all">
              <div class="mt-0.5">
                <div
                  class="w-4 h-4 rounded-full border border-gray-400 group-hover:border-blue-600 group-hover:bg-blue-600"></div>
              </div>
              <div>
                <span class="block font-semibold text-gray-900"
                  >Keep Property Rent at $${targetRent}</span
                >
                <span class="block text-sm text-gray-500">
                  Rescale ${isAdding ? "all" : "remaining"} room prices proportionally to match this
                  total.
                </span>
              </div>
            </button>

            <button
              hx-post="/admin/properties/${id}/update"
              hx-vals="${JSON.stringify({ ...formPayload, rentStrategy: "preserve_room_rates" })}"
              hx-target="body"
              class="w-full text-left group flex items-start gap-3 p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-all">
              <div class="mt-0.5">
                <div
                  class="w-4 h-4 rounded-full border border-gray-400 group-hover:border-blue-600 group-hover:bg-blue-600"></div>
              </div>
              <div>
                <span class="block font-semibold text-gray-900"
                  >Preserve Individual Room Rates</span
                >
                <span class="block text-sm text-gray-500">
                  Keep existing room prices. The total property rent will be updated automatically
                  based on the sum of rooms.
                </span>
              </div>
            </button>
          </div>

          <div class="px-6 py-4 bg-gray-50 flex justify-end">
            <button
              onclick="document.getElementById('modal-container').innerHTML = ''"
              class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
};
