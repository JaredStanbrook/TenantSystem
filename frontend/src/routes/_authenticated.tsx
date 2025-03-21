import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { getUserQueryOptions } from "@/lib/authApi";
import { Button } from "@/components/ui/button";

// Login component shown when user is not authenticated
const Auth = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-y-2 items-center">
      <p>You have to login or register</p>
      <Button onClick={() => navigate({ to: "/login" })}>Login!</Button>
      <Button onClick={() => navigate({ to: "/signup" })}>Register!</Button>
    </div>
  );
};

// Main authenticated route component
const Component = () => {
  const { user } = Route.useRouteContext();
  if (!user) {
    return <Auth />;
  }
  return <Outlet />;
};

// Authenticated route
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const queryClient = context.queryClient;
    try {
      const data = await queryClient.fetchQuery(getUserQueryOptions);
      if (data) {
        return { user: data };
      }
    } catch (e) {
      return { user: null };
    }
  },
  component: Component,
});
