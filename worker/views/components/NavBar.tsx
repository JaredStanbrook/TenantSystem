import { html } from "hono/html";
import { PropsUser } from "@server/schema/auth.schema"; // Adjust path as needed
import { SafeProperty } from "@server/schema/property.schema"; // Adjust path as needed

// Config for links
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

// --- SUB-COMPONENTS (Pure HTML) ---

export const ThemeToggle = () => html`
  <button
    id="theme-toggle-btn"
    type="button"
    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors"
    aria-label="Toggle theme">
    <i data-theme-icon="light" data-lucide="sun" class="hidden w-4 h-4"></i>
    <i data-theme-icon="dark" data-lucide="moon" class="hidden w-4 h-4"></i>
    <i data-theme-icon="system" data-lucide="laptop" class="hidden w-4 h-4"></i>
    <i data-theme-icon="baked" data-lucide="croissant" class="hidden w-4 h-4"></i>
    <i data-theme-icon="techno" data-lucide="binary" class="hidden w-4 h-4"></i>
  </button>

  <script>
    (function () {
      const THEMES = ["light", "dark", "system", "baked", "techno"];
      const STORAGE_KEY = "vite-ui-theme";

      const btn = document.getElementById("theme-toggle-btn");
      const root = document.documentElement;
      const icons = btn.querySelectorAll("[data-theme-icon]");

      let currentTheme = localStorage.getItem(STORAGE_KEY) || "system";
      if (!THEMES.includes(currentTheme)) currentTheme = "system";

      function applyTheme(theme) {
        // Remove all theme classes
        root.classList.remove(...THEMES);

        // Apply theme logic
        if (theme === "system") {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          root.classList.toggle("dark", prefersDark);
        } else {
          root.classList.add(theme);
        }
      }

      function updateIcon(theme) {
        const iconElements = btn.querySelectorAll("[data-theme-icon]");
        iconElements.forEach((icon) => {
          icon.classList.toggle("hidden", icon.dataset.themeIcon !== theme);
        });

        // Re-initialize lucide icons in the button
        if (window.lucide) {
          window.lucide.createIcons({ nameAttr: "data-lucide" });
        }
      }

      function setTheme(theme) {
        localStorage.setItem(STORAGE_KEY, theme);
        currentTheme = theme;
        applyTheme(theme);
        updateIcon(theme);
      }

      // Initialize
      setTheme(currentTheme);

      // Handle clicks
      btn.addEventListener("click", () => {
        const nextIdx = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
        setTheme(THEMES[nextIdx]);
      });

      // Listen for system theme changes when in system mode
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", () => {
        if (currentTheme === "system") {
          applyTheme("system");
        }
      });
    })();
  </script>
`;

export const PropertySelector = ({
  currentPropertyId,
  properties,
}: {
  currentPropertyId?: number;
  properties?: SafeProperty[];
}) => {
  // 1. Handle empty state safely
  if (!properties || properties.length === 0) return null;

  // 2. Derive current state
  const selectedId = Number(currentPropertyId);
  const currentProp = properties.find((p) => p.id === selectedId);
  const label = currentProp ? currentProp.nickname || currentProp.addressLine1 : "All Properties";

  return (
    <div id="nav-property-selector" className="relative">
      <details className="group relative">
        <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-medium hover:bg-accent/50 px-3 py-1.5 rounded-lg transition-colors marker:hidden [&::-webkit-details-marker]:hidden border border-transparent hover:border-border">
          {/* Building Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M8 10h.01" />
            <path d="M16 10h.01" />
            <path d="M8 14h.01" />
            <path d="M16 14h.01" />
          </svg>

          <span className="truncate max-w-[150px]">{label}</span>

          {/* Chevrons Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50">
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
          </svg>
        </summary>

        {/* Dropdown Content */}
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-popover text-popover-foreground shadow-md z-50 overflow-hidden">
          <div className="p-1">
            {/* 'View All' Button */}
            <button
              hx-post="/session/property"
              hx-vals='{"propertyId": "all"}'
              hx-target="#nav-property-selector"
              hx-swap="outerHTML"
              className={`relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                !currentProp ? "bg-accent/50 font-medium" : ""
              }`}>
              <span className="truncate">View All Properties</span>
              {!currentProp && <i data-lucide="check" className="ml-auto h-4 w-4"></i>}
            </button>

            <div className="h-px bg-muted my-1"></div>

            {/* Property List */}
            <div className="max-h-[300px] overflow-y-auto">
              {properties.map((p: any) => (
                <button
                  key={p.id}
                  hx-post="/session/property"
                  hx-vals={JSON.stringify({ propertyId: String(p.id) })}
                  hx-swap="none"
                  className={`relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                    p.id === Number(currentPropertyId) ? "bg-accent/50 font-medium" : ""
                  }`}>
                  <span className="truncate text-left">{p.nickname || p.addressLine1}</span>
                  {p.id === Number(currentPropertyId) && (
                    <i data-lucide="check" className="ml-auto h-4 w-4"></i>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
};

const UserMenu = ({ user }: { user: PropsUser }) => html`
  <div class="relative">
    <details class="group relative">
      <summary
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors list-none marker:hidden [&::-webkit-details-marker]:hidden">
        <span class="font-semibold text-xs text-primary"
          >${user.email!.substring(0, 2).toUpperCase()}</span
        >
      </summary>

      <div
        class="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in zoom-in-95 z-50">
        <div class="px-2 py-1.5 text-sm font-semibold">
          <div class="flex flex-col space-y-1">
            <p class="leading-none">${user.displayName || user.email}</p>
            <p class="text-xs leading-none text-muted-foreground font-normal">${user.email}</p>
          </div>
        </div>
        <div class="h-px bg-muted my-1"></div>
        <a
          href="/profile"
          class="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors no-underline"
          >Profile</a
        >
        <div class="h-px bg-muted my-1"></div>
        <button
          hx-post="/web/auth/logout"
          class="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
          Log out
        </button>
      </div>
      <div
        class="fixed inset-0 z-40 hidden"
        onclick="this.parentNode.removeAttribute('open')"></div>
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

export const NavBar = ({ user, currentPath, properties, currentPropertyId }: NavBarProps) => {
  let menuItems: { to: string; name: string }[] = [];
  let showPropertySelector = false;

  if (user && user.roles) {
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.roles];
    const seenLinks = new Set<string>();

    userRoles.forEach((role: string) => {
      if (ROLES_WITH_SELECTOR.has(role)) showPropertySelector = true;

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

  if (menuItems.length === 0) menuItems = menuConfig.default;

  const isActive = (to: string) => {
    if (to === "/" || to === "/admin") return currentPath === to;
    return currentPath?.startsWith(to);
  };

  return html`
    <header
      class="fixed top-0 left-0 right-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-14 items-center justify-between px-4">
        <div class="flex items-center gap-6">
          <a href="/" class="flex items-center gap-2 font-bold text-lg mr-4"> TenantSystem </a>

          <nav class="hidden md:flex items-center gap-4">
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
          ${showPropertySelector ? PropertySelector({ currentPropertyId, properties }) : ""}
          ${ThemeToggle()}
          ${!user
            ? html`
                <div class="flex items-center gap-2">
                  <a
                    href="/login"
                    class="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >Login</a
                  >
                  <a
                    href="/register"
                    class="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                    >Get Started</a
                  >
                </div>
              `
            : UserMenu({ user })}
        </div>
      </div>
    </header>
  `;
};
