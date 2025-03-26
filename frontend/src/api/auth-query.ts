import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/apiClient";

export const auth = api.auth;

export function authOptions() {
  return queryOptions({
    queryKey: ["auth"],
    queryFn: getCurrentUser,
    retry: false,
  });
}

export function useAuthQuery() {
  return useQuery(authOptions());
}

async function getCurrentUser() {
  const res = await auth.me.$get();
  if (!res.ok) {
    throw new Error("server error");
  }
  const data = await res.json();
  return data;
}
