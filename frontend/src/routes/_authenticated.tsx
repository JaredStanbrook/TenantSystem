import { getUserQueryOptions, logoutUser } from "@/api/authApi";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const queryClient = context.queryClient;

    const data = await queryClient.ensureQueryData(getUserQueryOptions);

    if (!data || data.role !== "tenant") {
      queryClient.removeQueries(getUserQueryOptions);
      await logoutUser();
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
    return { data };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
