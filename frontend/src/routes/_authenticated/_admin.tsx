import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

// Admin route
// TODO make better
const AdminRouteComponent = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  if (!user) {
    navigate({ to: "/" });
    return null;
  }

  return <Outlet />; // If authorized, render the Outlet component
};

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async ({ context }) => {
    const user = context.user;

    if (!user || user.role !== "landlord") {
      return { user: null };
    }

    return { user };
  },
  component: AdminRouteComponent,
});
