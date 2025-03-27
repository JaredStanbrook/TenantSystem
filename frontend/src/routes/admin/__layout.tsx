import { Outlet, redirect } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/__layout")({
  component: AdminLayout,
});

export function AdminLayout() {
  const auth = useAuth(); // Assuming useAuthContext provides auth state

  // Check if the user is authenticated and has the correct role
  if (auth.status === "PENDING") {
    // Wait for data to load
    auth.ensureData();
  }

  if (auth.status === "UNAUTHENTICATED" || auth.user?.role !== "landlord") {
    // If not authenticated or not the right role, redirect
    return redirect({ to: "/login" });
  }

  return (
    <>
      <Outlet />
    </>
  );
}
