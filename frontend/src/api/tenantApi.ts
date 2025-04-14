import { queryOptions } from "@tanstack/react-query";

import { api } from "@/api/apiClient";

export const auth = api.auth;

export async function getTenantsForLandlord() {
  const res = await auth.tenants.$get();
  if (!res.ok) {
    throw new Error("server error");
  }
  const data = await res.json();
  return data;
}

export const getTenantsForLandlordQueryOptions = queryOptions({
  queryKey: ["landlord-tenants"],
  queryFn: getTenantsForLandlord,
  staleTime: Infinity,
});
