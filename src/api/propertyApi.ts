import { queryOptions } from "@tanstack/react-query";
import { api } from "@/api/apiClient";
import { type CreateProperty } from "@server/sharedTypes";
import { handleResponseError } from "@/lib/utils";

export const property = api.properties;

export const getAllPropertiesQueryOptions = queryOptions({
  queryKey: ["get-all-properties"],
  queryFn: async () => {
    const res = await property.$get();
    if (!res.ok) {
      throw new Error("server error");
    }
    const data = await res.json();
    return data;
  },
  staleTime: 1000 * 60 * 5,
});

export async function createProperty({ value }: { value: CreateProperty }) {
  const res = await property.$post({ json: value });
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

  const newProperty = await res.json();
  return newProperty;
}

export const loadingCreatePropertyQueryOptions = queryOptions<{
  property?: CreateProperty;
}>({
  queryKey: ["loading-create-property"],
  queryFn: async () => {
    return {};
  },
  staleTime: Infinity,
});

export async function deleteProperty({ id }: { id: number }) {
  const res = await property[":id{[0-9]+}"].$delete({
    param: { id: id.toString() },
  });

  await handleResponseError(res);
}
