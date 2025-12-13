import { queryOptions } from "@tanstack/react-query";

import { api } from "@/api/apiClient";
import { type submitWaitlistEntry } from "@server/sharedTypes";

export const waitlist = api.waitlist;

export async function submitWaitlistEntry({ value }: { value: submitWaitlistEntry }) {
  const res = await waitlist.$post({ json: value });
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

  const newEntry = await res.json();
  return newEntry;
}
