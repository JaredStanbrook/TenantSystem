import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createIcons, ChevronsUpDown, Check, Building } from "lucide";

@customElement("nav-property-selector")
export class NavPropertySelector extends LitElement {
  @property({ type: Array }) properties: any[] = [];
  @property({ type: Number }) currentPropertyId?: number;

  @state() private isOpen = false;
  @state() private isSwitching = false;

  createRenderRoot() {
    return this;
  }

  updated() {
    createIcons({ root: this, icons: { ChevronsUpDown, Check, Building } });
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", (e) => {
      if (!this.contains(e.target as Node)) this.isOpen = false;
    });
  }

  async handleSelect(propertyId: string | number) {
    if (this.isSwitching) return;
    this.isSwitching = true;
    this.isOpen = false; // Close immediately for better UX

    try {
      // 1. Send the change to the server (sets the cookie)
      // Note: Assuming your API handles { propertyId: 'all' } or { propertyId: 123 }
      const body = new URLSearchParams({ propertyId: String(propertyId) });
      const response = await fetch("/session/property", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!response.ok) throw new Error("Failed to switch property");

      // 2. RELOAD the page to apply the new context globally
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch property", err);
      this.isSwitching = false;
    }
  }

  render() {
    if (!this.properties.length) return nothing;

    const currentProp = this.properties.find((p) => p.id === this.currentPropertyId);
    const label = currentProp ? currentProp.nickname || currentProp.addressLine1 : "All Properties";

    return html`
      <div class="relative">
        <button
          @click=${() => (this.isOpen = !this.isOpen)}
          ?disabled=${this.isSwitching}
          class="flex items-center gap-2 cursor-pointer text-sm font-medium hover:bg-accent/50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-border">
          <i data-lucide="building" class="h-4 w-4 text-muted-foreground"></i>
          <span class="truncate max-w-[150px]">${this.isSwitching ? "Switching..." : label}</span>
          <i data-lucide="chevrons-up-down" class="h-3 w-3 opacity-50"></i>
        </button>

        ${this.isOpen
          ? html`
              <div
                class="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-popover text-popover-foreground shadow-md animate-in fade-in zoom-in-95 z-50 overflow-hidden">
                <div class="p-1">
                  <button
                    @click=${() => this.handleSelect("all")}
                    class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${!currentProp
                      ? "bg-accent/50"
                      : ""}">
                    <span class="truncate">View All Properties</span>
                    ${!currentProp
                      ? html`<i data-lucide="check" class="ml-auto h-4 w-4"></i>`
                      : nothing}
                  </button>

                  <div class="h-px bg-muted my-1"></div>

                  <div class="max-h-[300px] overflow-y-auto">
                    ${this.properties.map(
                      (p) => html`
                        <button
                          @click=${() => this.handleSelect(p.id)}
                          class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${p.id ===
                          this.currentPropertyId
                            ? "bg-accent/50"
                            : ""}">
                          <span class="truncate text-left">${p.nickname || p.addressLine1}</span>
                          ${p.id === this.currentPropertyId
                            ? html`<i data-lucide="check" class="ml-auto h-4 w-4"></i>`
                            : nothing}
                        </button>
                      `
                    )}
                  </div>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}
