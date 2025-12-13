import "./ui/AppToaster";
import "./ui/ThemeProvider";
import "./ui/ThemeToggle";
import "./ui/NavIslands";

declare global {
  interface Window {
    lucide?: any;
  }
}

/**
 * Initialize Lucide icons after HTMX content swaps
 */
document.body.addEventListener("htmx:afterSwap", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * Initialize Lucide icons on page load
 */
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * Optional: Add loading state to body during HTMX requests
 */
document.body.addEventListener("htmx:beforeRequest", () => {
  document.body.classList.add("htmx-loading");
});

document.body.addEventListener("htmx:afterRequest", () => {
  document.body.classList.remove("htmx-loading");
});

/**
 * Optional: Handle HTMX errors gracefully
 */
document.body.addEventListener("htmx:responseError", (evt: any) => {
  window.dispatchEvent(
    new CustomEvent("toast", {
      detail: {
        message: "Something went wrong",
        description: "Please try again or contact support if the problem persists.",
        type: "error",
        duration: 5000,
      },
    })
  );
});

/**
 * Optional: Scroll to top after navigation
 */
document.body.addEventListener("htmx:afterSwap", (evt: any) => {
  // Only scroll if we're swapping the main content
  if (evt.detail.target?.id === "main-content") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
