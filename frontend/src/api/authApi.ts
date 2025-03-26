import { queryOptions } from "@tanstack/react-query";

import { api } from "@/api/apiClient";
import { type CreateUser } from "@server/sharedTypes";

export const auth = api.auth;

export async function getAllUser() {
  const res = await auth.$get();
  if (!res.ok) {
    throw new Error("server error");
  }
  const data = await res.json();
  return data;
}
export const getAllUserQueryOptions = queryOptions({
  queryKey: ["get-all-user"],
  queryFn: getAllUser,
  staleTime: 1000 * 60 * 5,
});

async function getCurrentUser() {
  const res = await auth.me.$get();
  if (!res.ok) {
    throw new Error("server error");
  }
  const data = await res.json();
  return data;
}

export const getUserQueryOptions = queryOptions({
  queryKey: ["get-current-user"],
  queryFn: getCurrentUser,
  staleTime: 1000 * 60 * 5,
});

export async function createUser({ value }: { value: CreateUser }) {
  const res = await auth.signup.$post({ json: value });

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

  return await res;
}

export const loadingCreateUserQueryOptions = queryOptions<{
  user?: CreateUser;
}>({
  queryKey: ["loading-create-user"],
  queryFn: async () => {
    return {};
  },
  staleTime: Infinity,
});

export async function loginUser({ email, password }: { email: string; password: string }) {
  const res = await auth.login.$post({ form: { email, password } });

  if (!res.ok) {
    throw new Error("Invalid email or password");
  }

  return res;
}

export const loadingLoginUserQueryOptions = queryOptions<{
  user?: { email: string; password: string };
}>({
  queryKey: ["loading-login-user"],
  queryFn: async () => {
    return {};
  },
  staleTime: Infinity,
});

export async function logoutUser() {
  const res = await auth.logout.$post();

  if (!res.ok) {
    throw new Error("Failed to log out");
  }

  return res;
}

export const loadingLogoutUserQueryOptions = queryOptions({
  queryKey: ["loading-logout-user"],
  queryFn: async () => {
    return {};
  },
  staleTime: Infinity,
});

export async function deleteUser({ id }: { id: string }) {
  const res = await auth[":id{[a-zA-Z0-9]+}"].$delete({
    param: { id: id.toString() },
  });

  if (!res.ok) {
    throw new Error("server error");
  }
}
