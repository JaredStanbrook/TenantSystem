import { queryOptions } from "@tanstack/react-query";

import { api } from "@/api/apiClient";

export const auth = api.auth;

export const getTenantsForLandlordQueryOptions = queryOptions({
  queryKey: ["landlord-tenants"],
  queryFn: async () => {
    const res = await auth.tenants.$get();
    if (!res.ok) {
      throw new Error("server error");
    }
    const data = await res.json();
    return data;
  },
  staleTime: Infinity,
});

export const getTenantsForPropertyQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["property-tenants", id],
    queryFn: async () => {
      const res = await api.properties[":id"].tenants.$get({
        param: { id: id.toString() },
      });

      if (!res.ok) {
        throw new Error("server error");
      }

      return res.json();
    },
    staleTime: Infinity,
  });
