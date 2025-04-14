import { Link, Outlet, createRootRouteWithContext, redirect } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NavBar } from "@/components/navbar";
import { type QueryClient } from "@tanstack/react-query";
import { getUserQueryOptions } from "@/api/authApi";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
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
      <ReactQueryDevtools position="left" />
      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
}
