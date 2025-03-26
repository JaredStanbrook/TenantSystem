import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/apiClient";

export const auth = api.auth;
import { ENCODED_CREDENTIALS } from "@/lib/constants";
import { type CreateUser } from "@server/sharedTypes";
import { queryClient } from "@/lib/query";

export function useLoginMutation() {
  return useMutation({
    mutationKey: ["auth-mutation-for-sign-in"],
    mutationFn: loginUser,
    onSuccess(data) {
      queryClient.setQueryData(["auth"], data);
    },
    onError() {
      queryClient.setQueryData(["auth"], null);
      sessionStorage.removeItem(ENCODED_CREDENTIALS);
    },
    retry: false,
  });
}

export async function loginUser({ email, password }: { email: string; password: string }) {
  const res = await auth.login.$post({ form: { email, password } });

  if (!res.ok) {
    throw new Error("Invalid email or password");
  }

  return res;
}

export function useCreateMutation() {
  return useMutation({
    mutationKey: ["auth-mutation-for-create"],
    mutationFn: createUser,
    onSuccess(data) {
      queryClient.setQueryData(["auth"], data);
    },
    onError() {
      queryClient.setQueryData(["auth"], null);
      sessionStorage.removeItem(ENCODED_CREDENTIALS);
    },
    retry: false,
  });
}

export async function createUser(value: CreateUser) {
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

export function useSignOutMutation() {
  return useMutation({
    mutationKey: ["auth-mutation-for-sign-out"],
    mutationFn: logoutUser,
    onSuccess: () => {
      sessionStorage.removeItem(ENCODED_CREDENTIALS);
      queryClient.setQueryData(["auth"], null);
    },
    retry: false,
  });
}

export async function logoutUser() {
  const res = await auth.logout.$post();

  if (!res.ok) {
    throw new Error("Failed to log out");
  }

  return res;
}

export function useDeleteMutation() {
  return useMutation({
    mutationKey: ["auth-mutation-for-delete"],
    mutationFn: deleteUser,
    retry: false,
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
