// client/lib/toast.ts

export type ToastType = "success" | "error" | "info" | "warning";

const FLASH_TOAST_KEY = "pending_toast";

// Existing standard toast function
export function toast(message: string, description: string = "", type: ToastType = "info") {
  const event = new CustomEvent("toast", {
    bubbles: true,
    composed: true,
    detail: { message, description, type, duration: 5000 },
  });
  window.dispatchEvent(event);
}

export function redirectWithToast(
  url: string,
  message: string,
  description: string = "",
  type: ToastType = "success"
) {
  const toastData = {
    message,
    description,
    type,
    duration: 5000,
  };

  // Save to session storage
  sessionStorage.setItem(FLASH_TOAST_KEY, JSON.stringify(toastData));

  // Perform hard redirect
  window.location.href = url;
}

// [NEW] Helper to read (and clear) the toast - used by AppToaster
export function getFlashToast() {
  const flash = sessionStorage.getItem(FLASH_TOAST_KEY);
  if (!flash) return null;

  try {
    sessionStorage.removeItem(FLASH_TOAST_KEY); // Clear immediately
    return JSON.parse(flash);
  } catch (e) {
    console.error("Failed to parse flash toast", e);
    return null;
  }
}
