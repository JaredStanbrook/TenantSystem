import { html } from "hono/html";
import { PropsUser } from "@server/schema/auth.schema";
import { SafeProperty } from "@server/schema/property.schema";

// --- CONFIGURATION ---
const menuConfig: Record<string, Array<{ to: string; name: string }>> = {
  default: [{ to: "/join", name: "Join" }],
  tenant: [
    { to: "/expense", name: "Expenses" },
    { to: "/bill", name: "My Bills" },
  ],
  landlord: [
    { to: "/admin", name: "Dashboard" },
    { to: "/admin/tenancies", name: "Tenancies" },
    { to: "/admin/invoices", name: "Invoices" },
    { to: "/admin/properties", name: "Properties" },
  ],
  admin: [{ to: "/admin/logs", name: "System Logs" }],
};

const ROLES_WITH_SELECTOR = new Set(["landlord", "admin"]);

// --- COMPONENTS ---

/**
 * ThemeToggle
 * Robust logic with large touch targets for mobile.
 */
export const ThemeToggle = () => html`
  <button
    type="button"
    class="theme-toggle-btn inline-flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
    aria-label="Toggle theme">
    <i data-theme-icon="light" data-lucide="sun" class="hidden w-5 h-5"></i>
    <i data-theme-icon="dark" data-lucide="moon" class="hidden w-5 h-5"></i>
    <i data-theme-icon="system" data-lucide="laptop" class="hidden w-5 h-5"></i>
    <i data-theme-icon="bush" data-lucide="leaf" class="hidden w-5 h-5"></i>
    <i data-theme-icon="dusk" data-lucide="mountain" class="hidden w-5 h-5"></i>
  </button>

  <script>
    (function () {
      // 1. GUARD: Prevent script from running twice if component is rendered multiple times
      if (window.__theme_toggle_init) return;
      window.__theme_toggle_init = true;

      const THEMES = ["light", "dark", "system", "bush", "dusk"];
      const STORAGE_KEY = "vite-ui-theme";
      const root = document.documentElement;

      function getButtons() {
        return document.querySelectorAll(".theme-toggle-btn");
      }

      let currentTheme = localStorage.getItem(STORAGE_KEY) || "system";
      if (!THEMES.includes(currentTheme)) currentTheme = "system";

      function applyTheme(theme) {
        root.classList.remove(...THEMES);
        if (theme === "system") {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          root.classList.toggle("dark", prefersDark);
        } else {
          root.classList.add(theme);
        }
      }

      function updateIcons(theme) {
        // 2. SYNC: Update icons on ALL buttons (Desktop & Mobile)
        const buttons = getButtons();
        buttons.forEach((btn) => {
          btn.querySelectorAll("[data-theme-icon]").forEach((icon) => {
            icon.classList.toggle("hidden", icon.dataset.themeIcon !== theme);
          });
        });

        if (window.lucide) window.lucide.createIcons({ nameAttr: "data-lucide" });
      }

      function setTheme(theme) {
        localStorage.setItem(STORAGE_KEY, theme);
        currentTheme = theme;
        applyTheme(theme);
        updateIcons(theme);
      }

      // Initialize on load
      // We use a slight timeout or DOMContentLoaded to ensure both buttons are in the DOM
      document.addEventListener("DOMContentLoaded", () => {
        setTheme(currentTheme);

        // 3. EVENT DELEGATION: Listen on document to catch clicks on any toggle button
        document.addEventListener("click", (e) => {
          const btn = e.target.closest(".theme-toggle-btn");
          if (!btn) return;

          const nextIdx = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
          setTheme(THEMES[nextIdx]);
        });
      });

      // System Listener
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (currentTheme === "system") applyTheme("system");
      });
    })();
  </script>
`;

/**
 * PropertySelector
 * Supports 'desktop' (dropdown) and 'mobile' (accordion) variants.
 */
interface PropertySelectorProps {
  currentPropertyId?: number;
  properties?: SafeProperty[];
  variant?: "desktop" | "mobile";
}

export const PropertySelector = ({
  currentPropertyId,
  properties,
  variant = "desktop",
}: PropertySelectorProps) => {
  if (!properties || properties.length === 0) return null;

  const selectedId = Number(currentPropertyId);
  const currentProp = properties.find((p) => p.id === selectedId);
  const label = currentProp ? currentProp.nickname || currentProp.addressLine1 : "All Properties";

  // CSS Differences based on variant
  const containerClasses = variant === "mobile" ? "w-full" : "relative";

  const summaryClasses =
    variant === "mobile"
      ? "flex w-full items-center justify-between gap-2 cursor-pointer list-none text-base font-medium px-4 py-3 rounded-lg bg-accent/30 hover:bg-accent transition-colors marker:hidden [&::-webkit-details-marker]:hidden"
      : "flex items-center gap-2 cursor-pointer list-none text-sm font-medium hover:bg-accent/50 px-3 py-1.5 rounded-lg transition-colors marker:hidden [&::-webkit-details-marker]:hidden border border-transparent hover:border-border";

  const dropdownClasses =
    variant === "mobile"
      ? "relative mt-2 w-full rounded-lg border-primary/20 bg-background/50" // Accordion style
      : "absolute right-0 top-full mt-2 w-64 rounded-lg border bg-popover text-popover-foreground shadow-md z-50 overflow-hidden"; // Floating style

  return html`
    <div id="nav-property-selector-${variant}" class="${containerClasses}">
      <details class="group relative w-full">
        <summary class="${summaryClasses}">
          <div class="flex items-center gap-2 overflow-hidden">
            <i data-lucide="building" class="w-4 h-4 text-muted-foreground shrink-0"></i>
            <span class="truncate max-w-[200px]">${label}</span>
          </div>
          <i
            data-lucide="chevron-down"
            class="w-4 h-4 opacity-50 group-open:rotate-180 transition-transform"></i>
        </summary>

        <div class="${dropdownClasses}">
          <div class="p-1">
            <button
              hx-post="/session/property"
              hx-vals='{"propertyId": "all"}'
              hx-target="body"
              hx-swap="none"
              onclick="location.reload()"
              class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${!currentProp
                ? "bg-accent/50 font-medium"
                : ""}">
              <span class="truncate">View All Properties</span>
              ${!currentProp ? html`<i data-lucide="check" class="ml-auto h-4 w-4"></i>` : ""}
            </button>

            <div class="h-px bg-muted my-1"></div>

            <div class="max-h-[300px] overflow-y-auto">
              ${properties.map(
                (p) => html`
                  <button
                    hx-post="/session/property"
                    hx-vals="${JSON.stringify({ propertyId: String(p.id) })}"
                    hx-target="body"
                    hx-swap="none"
                    onclick="location.reload()"
                    class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${p.id ===
                    Number(currentPropertyId)
                      ? "bg-accent/50 font-medium"
                      : ""}">
                    <span class="truncate text-left">${p.nickname || p.addressLine1}</span>
                    ${p.id === Number(currentPropertyId)
                      ? html`<i data-lucide="check" class="ml-auto h-4 w-4"></i>`
                      : ""}
                  </button>
                `
              )}
            </div>
          </div>
        </div>
      </details>
    </div>
  `;
};

/**
 * UserMenu (Desktop)
 * Classic dropdown for the top bar.
 */
const UserMenu = ({ user }: { user: PropsUser }) => html`
  <div class="relative">
    <details class="group relative">
      <summary
        class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors list-none marker:hidden [&::-webkit-details-marker]:hidden border border-transparent focus:border-ring ring-offset-background">
        <span class="font-bold text-sm text-primary"
          >${user.email!.substring(0, 2).toUpperCase()}</span
        >
      </summary>

      <div
        class="fixed inset-0 z-40 hidden"
        onclick="this.parentNode.removeAttribute('open')"></div>

      <div
        class="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in zoom-in-95 z-50">
        <div class="px-2 py-1.5 text-sm">
          <div class="flex flex-col space-y-1">
            <p class="font-medium leading-none truncate">${user.displayName || "User"}</p>
            <p class="text-xs leading-none text-muted-foreground truncate">${user.email}</p>
          </div>
        </div>
        <div class="h-px bg-muted my-1"></div>
        <a
          href="/profile"
          class="flex w-full items-center rounded-sm px-2 py-2 text-sm hover:bg-accent transition-colors no-underline">
          <i data-lucide="user" class="mr-2 h-4 w-4"></i> Profile
        </a>
        <div class="h-px bg-muted my-1"></div>
        <button
          hx-post="/web/auth/logout"
          class="flex w-full items-center rounded-sm px-2 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
          <i data-lucide="log-out" class="mr-2 h-4 w-4"></i> Log out
        </button>
      </div>
    </details>
  </div>
`;

// --- MAIN NAVBAR ---

interface NavBarProps {
  user?: PropsUser | null;
  currentPath?: string;
  currentPropertyId?: number;
  properties?: SafeProperty[];
}

const getMenuItems = (user: any, config: any, rolesWithSelector: Set<string>) => {
  let menuItems: { to: string; name: string }[] = [];
  let showPropertySelector = false;

  if (user && user.roles) {
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.roles];
    const seenLinks = new Set<string>();

    userRoles.forEach((role: string) => {
      if (rolesWithSelector.has(role)) showPropertySelector = true;
      const items = config[role];
      if (items) {
        items.forEach((item: any) => {
          if (!seenLinks.has(item.to)) {
            seenLinks.add(item.to);
            menuItems.push(item);
          }
        });
      }
    });
  }

  if (menuItems.length === 0) menuItems = config.default;
  return { menuItems, showPropertySelector };
};

export const NavBar = ({ user, currentPath, properties, currentPropertyId }: NavBarProps) => {
  const { menuItems, showPropertySelector } = getMenuItems(user, menuConfig, ROLES_WITH_SELECTOR);

  const isActive = (to: string) => {
    if (to === "/" || to === "/admin") return currentPath === to;
    return currentPath?.startsWith(to);
  };

  return html`
    <header
      class="fixed top-0 left-0 right-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="flex h-14 items-center justify-between px-4">
        <div class="flex items-center gap-6">
          <a href="${user ? "/admin" : "/"}" class="flex items-center gap-2 font-bold text-lg mr-4">
            <div class="h-6 w-6 bg-primary rounded-md"></div>
            TenantSystem
          </a>

          <nav class="hidden lg:flex items-center gap-6">
            ${menuItems.map(
              (item) => html`
                <a
                  href="${item.to}"
                  class="text-sm font-medium transition-colors hover:text-primary ${isActive(
                    item.to
                  )
                    ? "text-foreground"
                    : "text-muted-foreground"}">
                  ${item.name}
                </a>
              `
            )}
          </nav>
        </div>

        <div class="flex items-center gap-4">
          ${showPropertySelector
            ? html`<div class="hidden lg:block">
                ${PropertySelector({
                  currentPropertyId,
                  properties,
                  variant: "desktop",
                })}
              </div>`
            : ""}

          <div class="hidden lg:block">${ThemeToggle()}</div>

          <div class="hidden lg:block">
            ${!user
              ? html`
                  <div class="flex items-center gap-2">
                    <a
                      href="/login"
                      class="text-sm font-medium text-muted-foreground hover:text-primary"
                      >Login</a
                    >
                    <a
                      href="/register"
                      class="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 transition-colors"
                      >Get Started</a
                    >
                  </div>
                `
              : UserMenu({ user })}
          </div>

          <button
            id="mobile-menu-toggle"
            class="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Open menu">
            <i data-lucide="menu" class="h-6 w-6"></i>
          </button>
        </div>
      </div>
    </header>

    <div
      id="mobile-menu"
      class="hidden fixed inset-0 z-[100] bg-background text-foreground lg:hidden flex flex-col animate-in slide-in-from-right-10 duration-200">
      <div class="flex items-center justify-between px-4 h-14 border-b">
        <span class="font-bold text-lg flex items-center gap-2">
          <div class="h-6 w-6 bg-primary rounded-sm"></div>
          Menu
        </span>
        <button
          id="mobile-menu-close"
          class="p-2 rounded-md hover:bg-accent focus:outline-none"
          aria-label="Close menu">
          <i data-lucide="x" class="h-6 w-6"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <nav class="flex flex-col gap-2">
          ${menuItems.map(
            (item) => html`
              <a
                href="${item.to}"
                class="flex items-center py-3 px-4 rounded-lg text-lg font-medium transition-colors hover:bg-accent ${isActive(
                  item.to
                )
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground"}">
                ${item.name}
                ${isActive(item.to)
                  ? html`<i data-lucide="chevron-right" class="ml-auto h-5 w-5 opacity-50"></i>`
                  : ""}
              </a>
            `
          )}
        </nav>

        <hr class="border-border/50" />

        ${showPropertySelector
          ? html`
              <div class="flex flex-col gap-3">
                <span
                  class="px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider"
                  >Properties</span
                >
                ${PropertySelector({
                  currentPropertyId,
                  properties,
                  variant: "mobile",
                })}
              </div>
            `
          : ""}

        <div class="mt-auto flex flex-col gap-6">
          <div class="flex items-center justify-between px-2">
            <span class="text-sm font-medium">Appearance</span>
            ${ThemeToggle()}
          </div>

          ${!user
            ? html`
                <div class="grid grid-cols-2 gap-4">
                  <a
                    href="/login"
                    class="inline-flex items-center justify-center rounded-lg h-12 border border-input bg-background px-4 py-2 text-base font-medium hover:bg-accent hover:text-accent-foreground">
                    Login
                  </a>
                  <a
                    href="/register"
                    class="inline-flex items-center justify-center rounded-lg h-12 bg-primary px-4 py-2 text-base font-medium text-primary-foreground hover:bg-primary/90">
                    Get Started
                  </a>
                </div>
              `
            : html`
                <div class="rounded-xl border bg-card text-card-foreground shadow-sm">
                  <div class="p-4 flex items-center gap-3 border-b">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      ${user.email!.substring(0, 2).toUpperCase()}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-medium truncate">${user.displayName || "User"}</span>
                      <span class="text-xs text-muted-foreground truncate">${user.email}</span>
                    </div>
                  </div>
                  <div class="p-2 grid grid-cols-2 gap-2">
                    <a
                      href="/profile"
                      class="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
                      <i data-lucide="user" class="h-4 w-4"></i> Profile
                    </a>
                    <button
                      hx-post="/web/auth/logout"
                      class="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                      <i data-lucide="log-out" class="h-4 w-4"></i> Log out
                    </button>
                  </div>
                </div>
              `}
        </div>
      </div>
    </div>

    <script>
      (function () {
        const toggleBtn = document.getElementById("mobile-menu-toggle");
        const closeBtn = document.getElementById("mobile-menu-close");
        const menu = document.getElementById("mobile-menu");

        function openMenu() {
          menu.classList.remove("hidden");
          document.body.style.overflow = "hidden"; // Prevent background scroll
        }

        function closeMenu() {
          menu.classList.add("hidden");
          document.body.style.overflow = "";
        }

        if (toggleBtn) toggleBtn.addEventListener("click", openMenu);
        if (closeBtn) closeBtn.addEventListener("click", closeMenu);
      })();
    </script>
  `;
};
