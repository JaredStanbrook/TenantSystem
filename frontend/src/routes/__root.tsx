import { Link, Outlet, createRootRouteWithContext, redirect } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Route as Auth } from "@/routes/_authenticated";
import type { RouterContext } from "@/lib/router";
import { NavBar } from "@/components/navbar";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

function Root() {
  return (
    <>
      <NavBar />
      <div className="p-2 max-w-2xl m-auto">
        <Outlet />
      </div>
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
