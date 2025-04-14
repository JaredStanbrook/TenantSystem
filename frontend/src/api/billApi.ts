import { queryOptions } from "@tanstack/react-query";

import { api } from "@/api/apiClient";
import type { CreateBill } from "@server/sharedTypes";
import { handleResponseError } from "@/lib/utils";

export const bill = api.bills;

export async function getAllBills() {
  const res = await bill.$get();
  if (!res.ok) {
    throw new Error("server error");
  }
  const data = await res.json();
  return data;
}

export const getAllBillsQueryOptions = queryOptions({
  queryKey: ["get-all-bills"],
  queryFn: getAllBills,
  staleTime: 1000 * 60 * 5,
});

export async function getOverdueBills() {
  const res = await bill["overdue-bills"].$get();
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
  const data = await res.json();
  return data;
}

export async function createBill({ value }: { value: CreateBill }) {
  const res = await bill.$post({ json: value });
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
  const newBill = await res.json();
  return newBill;
}

export const loadingCreateBillQueryOptions = queryOptions<{
  bill?: CreateBill;
}>({
  queryKey: ["loading-create-bill"],
  queryFn: async () => {
    return {};
  },
  staleTime: Infinity,
});

export async function deleteBill({ id }: { id: number }) {
  const res = await bill[":id{[0-9]+}"].$delete({
    param: { id: id.toString() },
  });
  await handleResponseError(res);
}
