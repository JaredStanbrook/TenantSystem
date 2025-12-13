import { queryOptions } from "@tanstack/react-query";

import { api } from "@/api/apiClient";
import type { CreateBill } from "@server/sharedTypes";
import { handleResponseError } from "@/lib/utils";

export const bill = api.bills;

export const getAllBillsQueryOptions = queryOptions({
  queryKey: ["all-bills"],
  queryFn: async () => {
    const res = await bill.$get();
    if (!res.ok) {
      throw new Error("server error");
    }
    const data = await res.json();
    return data;
  },
  staleTime: 1000 * 60 * 5,
});

export const getBillsForPropertyQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["property-bills", id],
    queryFn: async () => {
      const res = await api.properties[":id"].bills.$get({
        param: { id: id.toString() },
      });

      if (!res.ok) {
        throw new Error("server error");
      }

      return res.json();
    },
    staleTime: Infinity,
  });

export const getBillsForTennantQueryOptions = queryOptions({
  queryKey: ["tennant-bills"],
  queryFn: async () => {
    const res = await api.bills.tenants.$get();

    if (!res.ok) {
      throw new Error("server error");
    }

    return res.json();
  },
  staleTime: Infinity,
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
