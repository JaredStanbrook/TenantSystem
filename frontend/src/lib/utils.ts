import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function handleResponseError(res: Response): Promise<void> {
  if (!res.ok) {
    let errorMessage = "An unknown error occurred";

    try {
      const errorResponse = (await res.json()) as { message?: string };
      errorMessage = errorResponse.message || JSON.stringify(errorResponse);
    } catch {
      errorMessage = `HTTP ${res.status} - Failed to parse error response`;
    }

    throw new Error(errorMessage);
  }
}
export async function safeJson<T>(res: Response): Promise<T> {
  let data: any;

  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - Failed to parse error response`);
    } else {
      throw new Error("Failed to parse response");
    }
  }

  if (!res.ok) {
    const message = data?.message || JSON.stringify(data) || "An unknown error occurred";
    throw new Error(`HTTP ${res.status}: ${message}`);
  }

  return data as T;
}
