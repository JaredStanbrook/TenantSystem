import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

@customElement("waitlist-dialog")
export class WaitlistDialog extends LitElement {
  // FIX 1: Use @state() so the component re-renders when these values change
  @state()
  private open = false;

  @state()
  private submitting = false;

  // Render in Light DOM to inherit global Tailwind classes
  createRenderRoot() {
    return this;
  }

  toggle(e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    this.open = !this.open;

    // Toggle body scroll to prevent background scrolling when modal is open
    if (this.open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }

  async handleSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    this.submitting = true;

    const formData = new FormData(form);
    const data: Record<string, any> = Object.fromEntries(formData.entries());

    // Handle checkbox manually if needed, or rely on FormData
    data.pets = data.pets || "No pets";
    data.agreeToTerms = formData.get("agreeToTerms") === "on";

    try {
      // Simulate API delay
      await new Promise((r) => setTimeout(r, 1000));

      alert("Application Submitted! We'll be in touch soon.");

      form.reset();
      this.toggle(); // Close modal on success
    } catch (err) {
      alert("Error submitting form");
      console.error(err);
    } finally {
      this.submitting = false;
    }
  }

  render() {
    return html`
      <div @click="${(e: Event) => this.toggle(e)}" class="cursor-pointer inline-block">
        <slot name="trigger"></slot>
      </div>

      ${this.open
        ? html`
            <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div
                class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                @click="${() => this.toggle()}"></div>

              <div
                class="relative bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 p-6"
                role="dialog"
                aria-modal="true">
                <div class="mb-6">
                  <h2 class="text-3xl font-bold text-primary">Join Our Waitlist</h2>
                  <p class="text-muted-foreground mt-2">
                    Tell us a bit about yourself so we can see if we're a good match!
                  </p>

                  <button
                    @click="${() => this.toggle()}"
                    class="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
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
                      <path d="M18 6 6 18" />
                      <path d="m6 6 18 18" />
                    </svg>
                  </button>
                </div>

                <form @submit="${this.handleSubmit}" class="space-y-6">
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                      <label class="text-sm font-medium leading-none" for="fullName"
                        >Full Name *</label
                      >
                      <input
                        required
                        id="fullName"
                        name="fullName"
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="John Doe" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-sm font-medium leading-none" for="dob"
                        >Date of Birth *</label
                      >
                      <input
                        required
                        id="dob"
                        name="dateOfBirth"
                        type="date"
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>

                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                      <label class="text-sm font-medium leading-none" for="email">Email *</label>
                      <input
                        required
                        id="email"
                        name="email"
                        type="email"
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="john@example.com" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-sm font-medium leading-none" for="phone">Phone *</label>
                      <input
                        required
                        id="phone"
                        name="phone"
                        type="tel"
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="0400 000 000" />
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm font-medium leading-none" for="employment"
                      >Current Employment *</label
                    >
                    <input
                      required
                      id="employment"
                      name="employment"
                      class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Job title and company" />
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm font-medium leading-none" for="references"
                      >Previous Rental References</label
                    >
                    <textarea
                      id="references"
                      name="references"
                      class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Previous landlord/property manager contact details"
                      rows="3"></textarea>
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm font-medium leading-none" for="about"
                      >Tell us about yourself</label
                    >
                    <textarea
                      id="about"
                      name="about"
                      class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Hobbies, lifestyle, what you're looking for in a share house..."
                      rows="4"></textarea>
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm font-medium leading-none" for="pets"
                      >Do you have any pets?</label
                    >
                    <select
                      id="pets"
                      name="pets"
                      class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="No pets">No pets</option>
                      <option value="Cat(s)">Cat(s)</option>
                      <option value="Dog(s)">Dog(s)</option>
                      <option value="Other">Other (specify in notes)</option>
                    </select>
                  </div>

                  <div class="flex items-center space-x-3 pt-2">
                    <input
                      required
                      type="checkbox"
                      name="agreeToTerms"
                      id="terms"
                      class="aspect-square h-4 w-4 rounded border-primary text-primary" />
                    <label
                      for="terms"
                      class="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      I agree to the
                      <a href="/terms" target="_blank" class="underline font-semibold">terms</a> and
                      <a href="/privacy" target="_blank" class="underline font-semibold"
                        >privacy policy</a
                      >
                      *
                    </label>
                  </div>

                  <button
                    type="submit"
                    ?disabled="${this.submitting}"
                    class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full text-lg py-6">
                    ${this.submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </form>
              </div>
            </div>
          `
        : nothing}
    `;
  }
}
