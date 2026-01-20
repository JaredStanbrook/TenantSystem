import { html } from "hono/html";
import { ROOM_STATUS_VALUES, type SafeRoom } from "@server/schema/room.schema";
import { capitalize, StatusBadge } from "../lib/utils";

const roomStyles: Record<string, string> = {
  occupied: "bg-emerald-100 text-emerald-800 border-emerald-200",
  vacant_ready: "bg-blue-100 text-blue-800 border-blue-200",
  prospective: "bg-yellow-100 text-yellow-800 border-yellow-200",
  advertised: "bg-purple-100 text-purple-800 border-purple-200",
  vacant_maintenance: "bg-amber-100 text-amber-800 border-amber-200",
  under_repair: "bg-red-100 text-red-800 border-red-200",
  notice_given: "bg-rose-100 text-rose-800 border-rose-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

// --- 1. Room Table Row ---
export const RoomRow = ({ room }: { room: SafeRoom & { baseRentAmount?: number | null } }) => html`
  <tr class="hover:bg-muted/50 transition-colors border-b" id="room-row-${room.id}">
    <td class="p-4 align-middle font-medium">
      <div class="flex items-center gap-2">
        <div class="p-2 bg-primary/10 rounded-md text-primary">
          <i data-lucide="door-closed" class="w-4 h-4"></i>
        </div>
        ${room.name}
      </div>
    </td>
    <td class="p-4 align-middle">${StatusBadge(room.status, roomStyles)}</td>
    <td class="p-4 align-middle text-muted-foreground">
      ${room.baseRentAmount ? `$${room.baseRentAmount}` : "—"}
    </td>
    <td class="p-4 align-middle text-right">
      <button
        hx-get="/admin/rooms/${room.id}/edit"
        hx-target="#main-content"
        hx-swap="innerHTML"
        hx-push-url="true"
        class="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
        aria-label="Edit room">
        <i data-lucide="settings-2" class="w-4 h-4"></i>
      </button>
    </td>
  </tr>
`;

// --- 2. Room Table (The "View") ---
export const RoomTable = ({
  rooms,
  propertyName,
  propertyId,
}: {
  rooms: any[];
  propertyName: string;
  propertyId: number;
}) => html`
  <div class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 text-muted-foreground mb-1">
          <i data-lucide="building-2" class="w-4 h-4"></i>
          <span>${propertyName}</span>
        </div>
        <h2 class="text-3xl font-bold tracking-tight">Room Management</h2>
        <p class="text-muted-foreground">Managing ${rooms.length} rooms for this property.</p>
      </div>
      <button
        hx-get="/admin/properties"
        hx-target="#main-content"
        hx-swap="innerHTML"
        hx-push-url="true"
        class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border px-3 py-2 rounded-lg bg-background hover:bg-accent">
        <i data-lucide="arrow-left" class="w-4 h-4"></i>
        Back to Properties
      </button>
    </div>

    <div class="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div class="relative w-full overflow-auto">
        <table class="w-full caption-bottom text-sm">
          <thead class="[&_tr]:border-b bg-muted/50">
            <tr class="border-b transition-colors">
              <th class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Room Name
              </th>
              <th class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Status
              </th>
              <th class="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Base Rent
              </th>
              <th class="h-12 px-4 text-right align-middle font-semibold text-muted-foreground">
                Manage
              </th>
            </tr>
          </thead>
          <tbody class="[&_tr:last-child]:border-0">
            ${rooms.length === 0
              ? html`<tr>
                  <td colspan="4" class="p-8 text-center text-muted-foreground">No rooms found.</td>
                </tr>`
              : rooms.map((r) => RoomRow({ room: r }))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
`;

// --- 3. Room Edit Form ---
export const RoomForm = ({ room, action }: { room: any; action: string }) => html`
  <div class="max-w-7xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
    <div class="border rounded-lg shadow-sm bg-card">
      <div class="p-6 border-b">
        <h3 class="text-2xl font-semibold">Edit ${room.name}</h3>
        <p class="text-sm text-muted-foreground">Update status and pricing details.</p>
      </div>

      <form hx-post="${action}" hx-target="#main-content" class="p-6 space-y-6">
        <div class="space-y-2">
          <label class="text-sm font-medium leading-none">Room Name</label>
          <input
            name="name"
            value="${room.name}"
            required
            class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium leading-none">Current Status</label>
          <select
            name="status"
            class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            ${ROOM_STATUS_VALUES.map(
              (s) => html`
                <option value="${s}" ${room.status === s ? "selected" : ""}>
                  ${capitalize(s.replace("_", " "))}
                </option>
              `,
            )}
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium leading-none">Base Rent Amount</label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-muted-foreground">$</span>
            <input
              type="number"
              name="baseRentAmount"
              value="${room.baseRentAmount || ""}"
              placeholder="0.00"
              step="0.01"
              class="flex h-10 w-full rounded-lg border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <p class="text-xs text-muted-foreground">This creates a default for new leases.</p>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            hx-get="/admin/properties/${room.propertyId}/rooms"
            hx-target="#main-content"
            hx-push-url="true"
            class="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors shadow-sm">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
`;
