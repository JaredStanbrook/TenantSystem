import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { api, redirectWithToast, toast } from "../lib/utils";

@customElement("nav-user-menu")
export class NavUserMenu extends LitElement {
  @property({ type: Object }) user: any = null;
  @state() private isOpen = false;
  @state() private isLoggingOut = false; // Add loading state

  createRenderRoot() {
    return this;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  connectedCallback() {
    super.connectedCallback();
    // Close dropdown if clicking outside
    document.addEventListener("click", (e) => {
      if (!this.contains(e.target as Node)) this.isOpen = false;
    });
  }

  async handleLogout(e: Event) {
    e.preventDefault();
    if (this.isLoggingOut) return;

    this.isLoggingOut = true;

    try {
      const response = await api.auth.logout.$post();

      // Even if the server errors, we should probably kill the session client-side
      // But let's check for success first
      if (response.ok) {
        const data = await response.json();

        // Optional: Clear any local app state
        localStorage.removeItem("selectedProperty");

        // Redirect with our flash message helper
        redirectWithToast("/login", "Logged out successfully", "", "success");
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast("Error logging out", "Please try again", "error");
      this.isLoggingOut = false;
    }
  }

  render() {
    if (!this.user) return nothing;

    return html`
      <div class="relative">
        <button
          @click=${this.toggle}
          class="flex h-8 items-center gap-2 rounded-full border border-border bg-background/50 pl-2 pr-4 hover:bg-accent transition-colors">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <svg
              class="h-4 w-4 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <span class="text-sm font-medium">${this.user.firstName}</span>
        </button>

        ${this.isOpen
          ? html`
              <div
                class="absolute right-0 top-full mt-2 w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in zoom-in-95 z-50">
                <div class="px-2 py-1.5 text-sm font-semibold">
                  <div class="flex flex-col space-y-1">
                    <p class="leading-none">${this.user.displayName || this.user.firstName}</p>
                    <p class="text-xs leading-none text-muted-foreground font-normal">
                      ${this.user.email}
                    </p>
                  </div>
                </div>
                <div class="h-px bg-muted my-1"></div>
                <button
                  @onclick=${() => (window.location.href = "/profile")}
                  class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive/10 hover:text-destructive text-red-600 transition-colors">
                  Profile
                </button>

                <div class="h-px bg-muted my-1"></div>

                <button
                  @click=${this.handleLogout}
                  ?disabled=${this.isLoggingOut}
                  class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive/10 hover:text-destructive text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  ${this.isLoggingOut
                    ? html`<svg
                        class="mr-2 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>`
                    : html`<svg
                        class="mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                      </svg>`}
                  ${this.isLoggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}
