import { SafeUser } from "@server/schema/auth.schema";
import { html } from "hono/html";

const menuConfig: Record<string, Array<{ to: string; name: string }>> = {
  default: [{ to: "/join", name: "Join" }],
  tenant: [
    { to: "/expense", name: "Expenses" },
    { to: "/bill", name: "My Bills" },
    { to: "/profile", name: "Profile" },
  ],
  landlord: [
    { to: "/admin", name: "Dashboard" },
    { to: "/admin/tenant", name: "Tenants" },
    { to: "/admin/bill", name: "Bills" },
    { to: "/admin/properties", name: "Properties" },
  ],
  admin: [{ to: "/admin/logs", name: "System Logs" }],
};
const ROLES_WITH_SELECTOR = new Set(["landlord", "admin"]);

export const NavBar = ({ user, currentPath }: { user?: SafeUser | null; currentPath?: string }) => {
  let menuItems: { to: string; name: string }[] = [];
  let showPropertySelector = false;

  if (user && user.roles) {
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.roles];
    const seenLinks = new Set<string>();

    userRoles.forEach((role: string) => {
      if (ROLES_WITH_SELECTOR.has(role)) {
        showPropertySelector = true;
      }

      const items = menuConfig[role];
      if (items) {
        items.forEach((item) => {
          if (!seenLinks.has(item.to)) {
            seenLinks.add(item.to);
            menuItems.push(item);
          }
        });
      }
    });
  }

  if (menuItems.length === 0) {
    menuItems = menuConfig.default;
  }

  const isActive = (to: string) => {
    if (to === "/" || to === "/admin") return currentPath === to;
    return currentPath?.startsWith(to);
  };
  return html`
    <div class="flex items-center gap-4">
      ${showPropertySelector ? html`<nav-property-selector></nav-property-selector>` : ""}
      <theme-toggle></theme-toggle>
      <nav class="hidden md:flex items-center gap-1">
        ${menuItems.map(
          (item) => html`
            <a
              href="${item.to}"
              class="px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${isActive(
                item.to
              )
                ? "text-primary font-bold"
                : "text-muted-foreground"}">
              ${item.name}
            </a>
          `
        )}
        ${!user
          ? html`
              <div class="flex items-center gap-2">
                <a
                  href="/login"
                  class="px-3 py-2 text-sm font-medium transition-colors hover:text-primary"
                  >Login</a
                >
                <a
                  href="/register"
                  class="px-3 py-2 text-sm font-medium transition-colors hover:text-primary"
                  >Create Account</a
                >
              </div>
            `
          : html` <nav-user-menu user="${JSON.stringify(user)}"></nav-user-menu> `}
      </nav>
    </div>
  `;
};
