import { html } from "hono/html";
import { SafeProperty } from "@server/schema/property.schema";
import type { users } from "@server/schema/auth.schema";

type LockableUser = Pick<
  typeof users.$inferSelect,
  "id" | "email" | "displayName" | "lockedUntil" | "failedLoginAttempts"
>;
type AdminUser = Pick<typeof users.$inferSelect, "id" | "email" | "displayName">;

export const AdminTools = ({
  properties,
  usersList,
  lockedUsers,
  overdueCount,
  selectedPropertyId,
  selectedUserId,
  lastAction,
}: {
  properties: SafeProperty[];
  usersList: AdminUser[];
  lockedUsers: LockableUser[];
  overdueCount: number;
  selectedPropertyId?: number | null;
  selectedUserId?: string | null;
  lastAction?: string | null;
}) => {
  return html`
    <div
      class="max-w-5xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500"
    >
      <div class="space-y-2">
        <h2 class="text-3xl font-bold tracking-tight">Admin Tools</h2>
        <p class="text-muted-foreground">
          One-off maintenance actions for bootstrapping and system cleanup.
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <div class="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div class="space-y-1">
            <h3 class="text-lg font-semibold">Void overdue invoices</h3>
            <p class="text-sm text-muted-foreground">
              Marks overdue invoices as void to match your legacy paper system.
            </p>
          </div>

          <form
            hx-post="/admin/tools/void-overdue"
            hx-target="#main-content"
            hx-swap="innerHTML"
            class="space-y-3"
          >
            <label class="text-sm font-medium">Scope</label>
            <select
              name="propertyId"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All properties</option>
              ${properties.map(
                (prop) => html`
                  <option
                    value="${prop.id}"
                    ${selectedPropertyId === prop.id ? "selected" : ""}
                  >
                    ${prop.nickname || prop.addressLine1}
                  </option>
                `,
              )}
            </select>

            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">
                Currently overdue:
              </span>
              <span class="font-semibold">${overdueCount}</span>
            </div>

            ${lastAction
              ? html`<div class="text-xs text-muted-foreground">
                  ${lastAction}
                </div>`
              : ""}

            <button
              type="submit"
              class="inline-flex h-10 items-center justify-center rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground shadow hover:bg-destructive/90"
            >
              Void overdue invoices
            </button>
          </form>
        </div>

        <div class="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div class="space-y-1">
            <h3 class="text-lg font-semibold">Unlock account</h3>
            <p class="text-sm text-muted-foreground">
              Clears temporary lockout and resets failed login attempts.
            </p>
          </div>

          <form
            hx-post="/admin/tools/unlock-account"
            hx-target="#main-content"
            hx-swap="innerHTML"
            class="space-y-3"
          >
            <label class="text-sm font-medium">Locked user</label>
            <select
              name="userId"
              required
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" ${selectedUserId ? "" : "selected"}>
                Select a locked user
              </option>
              ${lockedUsers.map(
                (user) => html`
                  <option
                    value="${user.id}"
                    ${selectedUserId === user.id ? "selected" : ""}
                  >
                    ${(user.displayName || user.email) + " (" + user.email + ")"}
                  </option>
                `,
              )}
            </select>

            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Locked accounts:</span>
              <span class="font-semibold">${lockedUsers.length}</span>
            </div>

            ${lastAction
              ? html`<div class="text-xs text-muted-foreground">
                  ${lastAction}
                </div>`
              : ""}

            <button
              type="submit"
              class="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              ${lockedUsers.length === 0 ? "disabled" : ""}
            >
              Unlock account
            </button>
          </form>
        </div>

        <div class="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div class="space-y-1">
            <h3 class="text-lg font-semibold">Reset password</h3>
            <p class="text-sm text-muted-foreground">
              Sets a new password for a user account.
            </p>
          </div>

          <form
            hx-post="/admin/tools/reset-password"
            hx-target="#main-content"
            hx-swap="innerHTML"
            class="space-y-3"
          >
            <label class="text-sm font-medium">User</label>
            <select
              name="userId"
              required
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select a user</option>
              ${usersList.map(
                (user) => html`
                  <option value="${user.id}">
                    ${(user.displayName || user.email) + " (" + user.email + ")"}
                  </option>
                `,
              )}
            </select>

            <label class="text-sm font-medium">New password</label>
            <input
              type="password"
              name="newPassword"
              minlength="8"
              required
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="At least 8 characters"
            />

            <button
              type="submit"
              class="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Reset password
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
};
