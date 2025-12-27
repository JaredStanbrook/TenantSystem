import { html } from "hono/html";
import { Property } from "../../schema/property.schema";
import { capitalize, StatusBadge } from "../lib/utils";
const styles: Record<string, string> = {
  vacant: "bg-blue-100 text-blue-800 border-blue-200",
  occupied: "bg-emerald-100 text-emerald-800 border-emerald-200",
  maintenance: "bg-purple-100 text-purple-800 border-purple-200",
};

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
    <td class="p-4 align-middle">${StatusBadge(prop.status, styles)}</td>
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
        </div>
        <button
          hx-get="/admin/properties"
          hx-target="#main-content"
          hx-swap="innerHTML"
          class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to list
        </button>
      </div>

      <form
        hx-post="${action}"
        hx-target="#main-content"
        hx-swap="innerHTML"
        class="space-y-8 border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium">Nickname</label>
            <input
              name="nickname"
              value="${prop?.nickname || ""}"
              class="flex h-10 w-full rounded-lg border border-input px-3" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Type</label>
            <select
              name="propertyType"
              class="flex h-10 w-full rounded-lg border border-input px-3">
              ${["house", "apartment", "unit", "studio"].map(
                (t) =>
                  html`<option value="${t}" ${prop?.propertyType === t ? "selected" : ""}>
                    ${t}
                  </option>`
              )}
            </select>
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <i data-lucide="map-pin" class="w-5 h-5"></i> Location
          </h3>

          <div class="grid gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium leading-none">
                Address Line 1 <span class="text-destructive">*</span>
              </label>

              <div id="google-autocomplete-container" class="w-full"></div>

              <input
                type="hidden"
                id="address-hidden-input"
                name="addressLine1"
                value="${prop?.addressLine1 || ""}" />

              ${errors.addressLine1
                ? html`<p class="text-sm text-destructive">${errors.addressLine1[0]}</p>`
                : ""}
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium">City</label>
                <input
                  id="city-input"
                  name="city"
                  value="${prop?.city || ""}"
                  required
                  class="flex h-10 w-full rounded-lg border border-input px-3" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">State</label>
                <input
                  id="state-input"
                  name="state"
                  value="${prop?.state || ""}"
                  required
                  class="flex h-10 w-full rounded-lg border border-input px-3" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Postcode</label>
                <input
                  id="postcode-input"
                  name="postcode"
                  value="${prop?.postcode || ""}"
                  required
                  class="flex h-10 w-full rounded-lg border border-input px-3" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Country</label>
                <input
                  id="country-input"
                  name="country"
                  value="${prop?.country || "Australia"}"
                  class="flex h-10 w-full rounded-lg border border-input px-3" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <button type="submit" class="bg-primary text-primary-foreground h-10 px-4 rounded-lg">
            Save Property
          </button>
        </div>
      </form>
    </div>

    <script>
      (function () {
        // Use a slight delay to ensure HTMX swap is complete
        setTimeout(async () => {
          const container = document.getElementById("google-autocomplete-container");
          const hiddenInput = document.getElementById("address-hidden-input");

          if (!container || !hiddenInput) return;

          // 1. Import the specific library
          // Ensure you catch errors if the API key is invalid or library is missing
          let PlaceAutocompleteElement;
          try {
            const placesLib = await google.maps.importLibrary("places");
            PlaceAutocompleteElement = placesLib.PlaceAutocompleteElement;
          } catch (e) {
            console.error("Failed to load Google Maps Places library", e);
            container.innerHTML =
              '<input class="flex h-10 w-full rounded-lg border border-input px-3" placeholder="Manual entry (Map unavailable)" oninput="document.getElementById(\\'address-hidden-input\\').value = this.value">';
            return;
          }

          // 2. Instantiate the element
          const autocomplete = new PlaceAutocompleteElement();

          // 3. Configuration (Optional)
          // autocomplete.componentRestrictions = { country: 'au' };

          // 4. Handle Styling
          // The new element is a web component. You can add a class specifically for it
          // defined in your global CSS, or accept the default Material look.
          autocomplete.classList.add("w-full", "h-10", "block");

          // 5. Append to DOM
          container.innerHTML = ""; // Clear any previous content
          container.appendChild(autocomplete);

          // 6. Set Initial Value (if editing)
          if (hiddenInput.value) {
            // Note: The new API might not purely reflect text back into the input
            // the same way a simple input value does, but we can try setting it.
            // Often strictly used for search, but 'value' property exists on the element.
            autocomplete.value = hiddenInput.value;
          }

          // 7. Listen for the new event: 'gmp-places-select'
          autocomplete.addEventListener("gmp-places-select", async ({ place }) => {
            // 'place' is a PlaceResult object.
            // We might need to fetch fields if not automatically populated
            await place.fetchFields({
              fields: ["displayName", "formattedAddress", "addressComponents"],
            });

            // Update the hidden input with the clean address
            hiddenInput.value = place.formattedAddress || place.displayName;

            // Reset other fields
            document.getElementById("city-input").value = "";
            document.getElementById("state-input").value = "";
            document.getElementById("postcode-input").value = "";
            document.getElementById("country-input").value = "";

            let streetNumber = "";
            let route = "";

            // Map components
            for (const component of place.addressComponents) {
              const type = component.types[0];
              switch (type) {
                case "street_number":
                  streetNumber = component.longText;
                  break;
                case "route":
                  route = component.longText;
                  break;
                case "locality":
                  document.getElementById("city-input").value = component.longText;
                  break;
                case "administrative_area_level_1":
                  document.getElementById("state-input").value = component.shortText;
                  break;
                case "postal_code":
                  document.getElementById("postcode-input").value = component.longText;
                  break;
                case "country":
                  document.getElementById("country-input").value = component.longText;
                  break;
              }
            }

            // Sync Main Address line if you prefer strictly street + route
            if (streetNumber || route) {
              hiddenInput.value = [streetNumber, route].filter(Boolean).join(" ");
            }
          });

          // 8. Sync manual typing (edge case)
          // If the user types but doesn't select a prediction, the new element
          // might not fire a select event. We need to capture the text value.
          // The internal input is inside Shadow DOM, so standard 'input' events
          // on the custom element usually bubble up.
          autocomplete.addEventListener("input", (e) => {
            hiddenInput.value = e.target.value;
          });
        }, 100);
      })();
    </script>
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
