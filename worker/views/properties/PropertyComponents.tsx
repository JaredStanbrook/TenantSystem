import { html } from "hono/html";
import { Property } from "../../schema/property.schema";
import { StatusBadge } from "../lib/utils";
const styles: Record<string, string> = {
  vacant: "bg-blue-100 text-blue-800 border-blue-200",
  occupied: "bg-emerald-100 text-emerald-800 border-emerald-200",
  maintenance: "bg-purple-100 text-purple-800 border-purple-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

// --- 1. Property Table Row ---
export const PropertyRow = ({
  prop,
  showAll = false,
}: {
  prop: Property;
  showAll?: boolean;
}) => {
  const isDeleted = !!prop.deletedAt;
  const statusValue = isDeleted ? "archived" : prop.status;
  const searchBlob =
    `${prop.nickname || ""} ${prop.addressLine1} ${prop.city} ${prop.state} ${
      prop.postcode
    }`
      .trim()
      .toLowerCase();

  return html`
    <tr
      class="hover:bg-muted/50 transition-colors border-b ${isDeleted
        ? "opacity-70"
        : ""}"
      id="row-${prop.id}"
      data-title="${searchBlob}"
      data-status="${statusValue}"
      data-bedrooms="${prop.bedrooms}"
      data-archived="${isDeleted ? "true" : "false"}"
    >
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
      <td class="p-4 align-middle">${StatusBadge(statusValue, styles)}</td>
      <td class="p-4 align-middle text-right">
        <div class="flex justify-end gap-2">
          ${!isDeleted
            ? html`
                <button
                  hx-get="/admin/properties/${prop.id}/rooms"
                  hx-target="#main-content"
                  hx-swap="innerHTML"
                  hx-push-url="true"
                  class="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-blue-50 hover:text-blue-600 h-8 w-8"
                  title="Manage Rooms"
                >
                  <i data-lucide="door-open" class="w-4 h-4"></i>
                </button>
                <button
                  hx-get="/admin/properties/${prop.id}/edit"
                  hx-target="#main-content"
                  hx-swap="innerHTML"
                  hx-push-url="true"
                  class="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  aria-label="Edit property"
                >
                  <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
              `
            : ""}
          ${isDeleted
            ? html`
                <button
                  hx-post="/admin/properties/${prop.id}/restore?showAll=true"
                  hx-target="closest tr"
                  hx-swap="outerHTML"
                  class="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-emerald-50 hover:text-emerald-700 h-8 w-8"
                  aria-label="Restore property"
                  title="Restore property"
                >
                  <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                </button>
              `
            : ""}

          <button
            hx-delete="/admin/properties/${prop.id}${showAll
              ? "?showAll=true"
              : ""}"
            hx-target="closest tr"
            hx-swap="${isDeleted ? "outerHTML" : "outerHTML swap:0.5s"}"
            class="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
            aria-label="${isDeleted
              ? "Force delete property"
              : "Delete property"}"
            title="${isDeleted
              ? "Permanently delete property"
              : "Archive property"}"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
};

// --- 2. Property Form (Create & Edit) ---
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
  <div
    class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500"
  >
    <div class="space-y-4 animate-in fade-in duration-300">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">
            ${prop?.id ? "Edit Property" : "Add New Property"}
          </h2>
        </div>
        <button
          hx-get="/admin/properties"
          hx-target="#main-content"
          hx-swap="innerHTML"
          hx-push-url="true"
          class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to list
        </button>
      </div>

      <form
        hx-post="${action}"
        hx-target="#main-content"
        hx-swap="innerHTML"
        class="space-y-8 rounded-2xl border bg-gradient-to-b from-card to-card/70 p-6 shadow-sm md:p-8"
      >
        <div class="rounded-xl border bg-muted/30 p-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <i data-lucide="building" class="w-5 h-5"></i>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Property Profile</p>
              <p class="text-base font-semibold">
                ${prop?.nickname || prop?.addressLine1 || "New Property"}
              </p>
            </div>
          </div>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium">Nickname</label>
            <input
              name="nickname"
              value="${prop?.nickname || ""}"
              placeholder="e.g. The Beach House"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Type</label>
            <select
              name="propertyType"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ${["house", "apartment", "unit", "studio", "townhouse"].map(
                (t) =>
                  html`<option
                    value="${t}"
                    ${prop?.propertyType === t ? "selected" : ""}
                  >
                    ${t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>`,
              )}
            </select>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <i data-lucide="map-pin" class="w-5 h-5"></i> Location
            </h3>
            <span class="text-xs text-muted-foreground"
              >Auto-complete supported</span
            >
          </div>

          <div class="grid gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium text-muted-foreground">
                Auto-fill from Google Maps
              </label>
              <div id="google-search-container" class="w-full"></div>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">
                Address Line 1 <span class="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="address-line-1"
                name="addressLine1"
                value="${prop?.addressLine1 || ""}"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Street Number and Name"
                required
              />
              ${errors.addressLine1
                ? html`<p class="text-sm text-destructive">
                    ${errors.addressLine1[0]}
                  </p>`
                : ""}
            </div>

            <div
              class="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border bg-background/60 p-4"
            >
              <div class="space-y-2">
                <label class="text-sm font-medium">City</label>
                <input
                  id="city-input"
                  name="city"
                  value="${prop?.city || ""}"
                  required
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">State</label>
                <input
                  id="state-input"
                  name="state"
                  value="${prop?.state || ""}"
                  required
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Postcode</label>
                <input
                  id="postcode-input"
                  name="postcode"
                  value="${prop?.postcode || ""}"
                  required
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Country</label>
                <input
                  id="country-input"
                  name="country"
                  value="${prop?.country || "Australia"}"
                  class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <i data-lucide="home" class="w-5 h-5"></i>
              Property Details
            </h3>
            <span class="text-xs text-muted-foreground">Units and pricing</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="space-y-2">
              <label
                class="text-sm font-medium leading-none flex items-center gap-1"
              >
                <i data-lucide="bed" class="w-4 h-4"></i>
                Bedrooms <span class="text-destructive">*</span>
              </label>
              <input
                type="number"
                name="bedrooms"
                value="${prop?.bedrooms ?? 1}"
                min="0"
                required
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-sm font-medium leading-none flex items-center gap-1"
              >
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
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-sm font-medium leading-none flex items-center gap-1"
              >
                <i data-lucide="car" class="w-4 h-4"></i>
                Parking
              </label>
              <input
                type="number"
                name="parkingSpaces"
                value="${prop?.parkingSpaces ?? 0}"
                min="0"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2 rounded-xl border bg-background/60 p-4">
              <label class="text-sm font-medium">Rent Amount ($)</label>
              <div class="relative">
                <span
                  class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  $
                </span>
                <input
                  type="number"
                  name="rentAmount"
                  value="${(prop?.rentAmount ?? 0) / 100 || ""}"
                  step="0.01"
                  required
                  class="flex h-10 w-full rounded-lg border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <p class="text-xs text-muted-foreground">
                Stored in cents for accuracy.
              </p>
            </div>
            <div class="space-y-2 rounded-xl border bg-background/60 p-4">
              <label class="text-sm font-medium">Frequency</label>
              <select
                name="rentFrequency"
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option
                  value="weekly"
                  ${prop?.rentFrequency === "weekly" ? "selected" : ""}
                >
                  Weekly
                </option>
                <option
                  value="fortnightly"
                  ${prop?.rentFrequency === "fortnightly" ? "selected" : ""}
                >
                  Fortnightly
                </option>
                <option
                  value="monthly"
                  ${prop?.rentFrequency === "monthly" ? "selected" : ""}
                >
                  Monthly
                </option>
              </select>
              <p class="text-xs text-muted-foreground">
                Used for invoice scheduling.
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 border-t pt-4">
          <p class="text-xs text-muted-foreground">
            Fields marked with <span class="text-destructive">*</span> are
            required.
          </p>
          <button
            type="submit"
            class="inline-flex items-center gap-2 bg-primary text-primary-foreground h-10 px-5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <i data-lucide="save" class="w-4 h-4"></i>
            Save Property
          </button>
        </div>
      </form>
    </div>

    <script>
      (function () {
        // --- Variables ---
        let placeAutocomplete;
        let address1Field;
        let cityField;
        let stateField;
        let postalField;
        let countryField;

        // --- 1. Init ---
        async function initAutocomplete() {
          const container = document.getElementById("google-search-container");
          if (!container) return;

          try {
            const { PlaceAutocompleteElement } =
              await google.maps.importLibrary("places");

            // Create Widget
            placeAutocomplete = new PlaceAutocompleteElement();
            placeAutocomplete.classList.add(
              "flex",
              "h-10",
              "w-full",
              "rounded-lg",
              "border",
              "border-input",
              "bg-background",
              "text-sm",
              "ring-offset-background",
              "focus-visible:outline-none",
              "focus-visible:ring-2",
              "focus-visible:ring-ring",
            );

            // Mount
            container.innerHTML = "";
            container.appendChild(placeAutocomplete);

            // Bind Fields
            address1Field = document.getElementById("address-line-1"); // Standard text input
            cityField = document.getElementById("city-input");
            stateField = document.getElementById("state-input");
            postalField = document.getElementById("postcode-input");
            countryField = document.getElementById("country-input");

            // Listen for selection
            placeAutocomplete.addEventListener(
              "gmp-select",
              async ({ placePrediction }) => {
                await fillInAddress(placePrediction);
              },
            );
          } catch (e) {
            console.error("Google Places failed to load", e);
            // If API fails, remove the search container so user just sees standard inputs
            if (container) container.style.display = "none";
          }
        }

        // --- 2. Fill Logic ---
        async function fillInAddress(placePrediction) {
          if (!placePrediction) return;

          const place = placePrediction.toPlace();
          await place.fetchFields({
            fields: ["addressComponents", "formattedAddress", "displayName"],
          });

          if (!place.addressComponents) return;

          let address1 = "";
          let postcode = "";

          // Clear previous values
          if (cityField) cityField.value = "";
          if (stateField) stateField.value = "";
          if (postalField) postalField.value = "";
          if (countryField) countryField.value = "";

          for (const component of place.addressComponents) {
            const types = component.types;

            // Build Address Line 1
            if (types.includes("street_number")) {
              address1 = component.longText + " " + address1;
            }
            if (types.includes("route")) {
              address1 += component.longText;
            }

            // City
            if (types.includes("locality")) {
              cityField.value = component.longText;
            }
            if (types.includes("sublocality_level_1") && !cityField.value) {
              cityField.value = component.longText;
            }

            // State
            if (types.includes("administrative_area_level_1")) {
              stateField.value = component.shortText;
            }

            // Postcode
            if (types.includes("postal_code")) {
              postcode = component.longText;
            }

            // Country
            if (types.includes("country")) {
              countryField.value = component.longText;
            }
          }

          // Populate Address Line 1
          if (address1Field) {
            address1Field.value = address1
              ? address1.trim()
              : place.formattedAddress?.split(",")[0] || "";
          }
          if (postalField) {
            postalField.value = postcode;
          }
        }

        // --- 3. Run ---
        setTimeout(initAutocomplete, 50);
      })();
    </script>
  </div>
`;

// --- 3. Properties Table Layout ---
export const PropertyTable = ({
  properties,
  showAll = false,
}: {
  properties: Property[];
  showAll?: boolean;
}) => html`
  <div
    class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500"
  >
    <div class="space-y-4 animate-in fade-in duration-300">
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Properties</h2>
          <p class="text-muted-foreground mt-1">
            Manage your real estate portfolio. ${properties.length}
            ${properties.length === 1 ? "property" : "properties"} total.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            hx-get="/admin/properties/create"
            hx-target="#main-content"
            hx-swap="innerHTML"
            hx-push-url="true"
            class="inline-flex items-center justify-center gap-2 text-sm rounded-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <i data-lucide="plus" class="w-4 h-4"></i>
            Add Property
          </button>
        </div>
      </div>

      <div
        class="rounded-2xl border bg-card p-4 shadow-sm md:p-5"
        id="property-filters"
      >
        <div class="grid gap-3 md:grid-cols-[1.4fr_0.8fr_auto_auto]">
          <div class="relative">
            <i
              data-lucide="search"
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            ></i>
            <input
              id="property-search"
              type="search"
              placeholder="Search by nickname or address..."
              class="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select
            id="property-status"
            class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
            ${showAll ? html`<option value="archived">Archived</option>` : ""}
          </select>
          <label
            class="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <input
              type="checkbox"
              id="property-history"
              name="showAll"
              value="true"
              ${showAll ? "checked" : ""}
              class="accent-primary h-4 w-4"
            />
            History
          </label>
          <button
            id="property-reset"
            class="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Reset
          </button>
        </div>

        <div
          class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        >
          <span>Quick filters:</span>
          <button
            type="button"
            data-status="vacant"
            class="rounded-full border border-input bg-background px-3 py-1 hover:bg-accent"
          >
            Vacant
          </button>
          <button
            type="button"
            data-status="occupied"
            class="rounded-full border border-input bg-background px-3 py-1 hover:bg-accent"
          >
            Occupied
          </button>
          <button
            type="button"
            data-status="maintenance"
            class="rounded-full border border-input bg-background px-3 py-1 hover:bg-accent"
          >
            Maintenance
          </button>
        </div>
      </div>

      <div class="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div class="relative w-full overflow-auto">
          <table class="w-full caption-bottom text-sm">
            <thead class="[&_tr]:border-b bg-muted/50">
              <tr class="border-b transition-colors">
                <th
                  class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground"
                >
                  Nickname
                </th>
                <th
                  class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground"
                >
                  Address
                </th>
                <th
                  class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground"
                >
                  Specs
                </th>
                <th
                  class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground"
                >
                  Status
                </th>
                <th
                  class="h-12 px-4 text-right align-middle font-semibold text-muted-foreground"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="[&_tr:last-child]:border-0" id="property-list">
              ${properties.length === 0
                ? html` <tr>
                    <td colspan="5" class="p-12 text-center">
                      <div
                        class="flex flex-col items-center gap-3 text-muted-foreground"
                      >
                        <i data-lucide="home" class="w-12 h-12 opacity-50"></i>
                        <div>
                          <p class="font-medium text-foreground">
                            No properties found
                          </p>
                          <p class="text-sm">
                            Click "Add Property" to create your first property
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>`
                : properties.map((p) => PropertyRow({ prop: p, showAll }))}
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
  targetRent,
  formPayload,
}: {
  id: number;
  currentCount: number;
  targetCount: number;
  targetRent: number;
  formPayload: Record<string, any>;
}) => {
  const isAdding = targetCount > currentCount;
  const actionText = isAdding ? "Adding" : "Removing";
  const diff = Math.abs(targetCount - currentCount);

  return html`
    <div id="modal-container" hx-swap-oob="innerHTML">
      <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <div
          class="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden"
        >
          <div
            class="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-start gap-4"
          >
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
                stroke-linejoin="round"
              >
                <line x1="12" x2="12" y1="2" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-lg text-gray-900">
                Rent Adjustment Required
              </h3>
              <p class="text-sm text-gray-600">
                You are ${actionText.toLowerCase()}
                <strong>${diff} room(s)</strong>. How should this affect the
                rent?
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
              class="w-full text-left group flex items-start gap-3 p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div class="mt-0.5">
                <div
                  class="w-4 h-4 rounded-full border border-gray-400 group-hover:border-blue-600 group-hover:bg-blue-600"
                ></div>
              </div>
              <div>
                <span class="block font-semibold text-gray-900"
                  >Keep Property Rent at $${targetRent}</span
                >
                <span class="block text-sm text-gray-500">
                  Rescale ${isAdding ? "all" : "remaining"} room prices
                  proportionally to match this total.
                </span>
              </div>
            </button>

            <button
              hx-post="/admin/properties/${id}/update"
              hx-vals="${JSON.stringify({
                ...formPayload,
                rentStrategy: "preserve_room_rates",
              })}"
              hx-target="body"
              class="w-full text-left group flex items-start gap-3 p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div class="mt-0.5">
                <div
                  class="w-4 h-4 rounded-full border border-gray-400 group-hover:border-blue-600 group-hover:bg-blue-600"
                ></div>
              </div>
              <div>
                <span class="block font-semibold text-gray-900"
                  >Preserve Individual Room Rates</span
                >
                <span class="block text-sm text-gray-500">
                  Keep existing room prices. The total property rent will be
                  updated automatically based on the sum of rooms.
                </span>
              </div>
            </button>
          </div>

          <div class="px-6 py-4 bg-gray-50 flex justify-end">
            <button
              onclick="document.getElementById('modal-container').innerHTML = ''"
              class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
};
