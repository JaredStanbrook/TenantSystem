import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/apiClient";
import { type CreateUser } from "@server/sharedTypes";
import { handleResponseError, safeJson } from "@/lib/utils";
import { type User } from "@server/db.example/schema/user";
import { toast } from "sonner";

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
  staleTime: Infinity,
});

async function getCurrentUser() {
  const res = await auth.me.$get();
  return safeJson<User>(res);
}

export const getUserQueryOptions = queryOptions({
  queryKey: ["get-current-user"],
  queryFn: getCurrentUser,
  staleTime: Infinity,
  retry: false,
});

export async function createUser(value: CreateUser) {
  const res = await auth.signup.$post({ json: value });
  await handleResponseError(res);
  return await res;
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,

    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [getUserQueryOptions] });
    },
  });
}

export async function loginUser({ email, password }: { email: string; password: string }) {
  const res = await auth.login.$post({ form: { email, password } });

  if (!res.ok) {
    throw new Error("Invalid email or password");
  }

  return res;
}
export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginUser,

    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [getUserQueryOptions] });
    },
  });
}

export async function logoutUser() {
  const res = await auth.logout.$post();
  if (!res.ok) {
    throw new Error("We didn't log you out mate!");
  }
  toast("Logout Successful", {
    description: `Adios!`,
  });
  return res;
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getUserQueryOptions] });
      window.location.href = "/";
    },
  });
}

export async function deleteUser({ id }: { id: string }) {
  const res = await auth[":id{[a-zA-Z0-9]+}"].$delete({
    param: { id: id.toString() },
  });

  if (!res.ok) {
    throw new Error("server error");
  }
}
