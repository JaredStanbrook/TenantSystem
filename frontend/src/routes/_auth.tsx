import { getUserQueryOptions } from "@/api/authApi";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_auth")({
  validateSearch: z.object({
    redirect: z.string().optional().catch(""),
  }),
  beforeLoad: async ({ context, search }) => {
    const queryClient = context.queryClient;
    const data = await queryClient.ensureQueryData(getUserQueryOptions).catch(() => null);
    if (data) {
      throw redirect({
        to: search.redirect || "/",
      });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}
