import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    let shouldRedirect = false;

    if (context.auth.status === "PENDING") {
      const data = await context.auth.ensureData();

      if (!data || data?.role !== "tenant") {
        shouldRedirect = true;
      }
    }

    if (context.auth.status === "UNAUTHENTICATED") {
      shouldRedirect = true;
    }

    if (shouldRedirect) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <>
      <Outlet />
    </>
  );
}
