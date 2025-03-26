import { queryOptions } from "@tanstack/react-query";

import { api } from "@/api/apiClient";
import { type CreateBill } from "@server/sharedTypes";

export const bill = api.bills;

export async function getAllBill() {
  const res = await bill.$get();
  if (!res.ok) {
    throw new Error("server error");
  }
  const data = await res.json();
  return data;
}
export const getAllBillQueryOptions = queryOptions({
  queryKey: ["get-all-bill"],
  queryFn: getAllBill,
  staleTime: 1000 * 60 * 5,
});
/*
export async function createBill({ value }: { value: CreateBill }) {
  const res = await bill.$post({ json: value });
  if (!res.ok) {
    throw new Error("server error");
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

  if (!res.ok) {
    throw new Error("server error");
  }
}
*/
