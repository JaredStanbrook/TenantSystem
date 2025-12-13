import { queryOptions } from "@tanstack/react-query";

import { api } from "@/api/apiClient";
import { type CreateExpense } from "@server/sharedTypes";

export const expense = api.expenses;

export async function getAllExpense() {
  const res = await expense.$get();
  if (!res.ok) {
    throw new Error("server error");
  }
  const data = await res.json();
  return data;
}
export const getAllExpenseQueryOptions = queryOptions({
  queryKey: ["get-all-expense"],
  queryFn: getAllExpense,
  staleTime: 1000 * 60 * 5,
});

export async function createExpense({ value }: { value: CreateExpense }) {
  const res = await expense.$post({ json: value });
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

  const newExpense = await res.json();
  return newExpense;
}

export const loadingCreateExpenseQueryOptions = queryOptions<{
  expense?: CreateExpense;
}>({
  queryKey: ["loading-create-expense"],
  queryFn: async () => {
    return {};
  },
  staleTime: Infinity,
});

export async function deleteExpense({ id }: { id: number }) {
  const res = await expense[":id{[0-9]+}"].$delete({
    param: { id: id.toString() },
  });

  if (!res.ok) {
    throw new Error("server error");
  }
}
