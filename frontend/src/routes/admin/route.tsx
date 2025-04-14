import { getUserQueryOptions, logoutUser, useLogoutMutation } from "@/api/authApi";
import { Outlet, redirect } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context, location }) => {
    const queryClient = context.queryClient;

    let userData = queryClient.getQueryData(getUserQueryOptions.queryKey);

    if (!userData) {
      try {
        userData = await queryClient.fetchQuery(getUserQueryOptions);
      } catch (error) {
        throw redirect({
          to: "/login",
          search: {
            redirect: location.href,
          },
        });
      }
    }

    if (userData.role !== "landlord") {
      queryClient.removeQueries(getUserQueryOptions);
      await logoutUser();
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    // Return the user data
    return { userData };
  },
  component: AdminLayout,
});

export function AdminLayout() {
  return <Outlet />;
}
