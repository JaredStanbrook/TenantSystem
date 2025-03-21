import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type AuthUser } from "@server/sharedTypes";

interface MyRouterContext {
  queryClient: QueryClient;
  user?: AuthUser;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: Root,
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the notFoundComponent configured on root route</p>
        <Link to="/">Start Over</Link>
      </div>
    );
  },
});

function NavBar() {
  return (
    <div className="p-2 flex justify-between max-w-2xl m-auto items-baseline">
      <Link to="/">
        <h1 className="text-2xl font-bold">Tenant Tracker</h1>
      </Link>
      <div className="flex gap-2">
        <Link to="/about" className="[&.active]:font-bold">
          About
        </Link>
        <Link to="/admin" className="[&.active]:font-bold">
          Admin
        </Link>
        <Link to="/expense" className="[&.active]:font-bold">
          Expenses
        </Link>
        <Link to="/create-expense" className="[&.active]:font-bold">
          Create
        </Link>
        <Link to="/profile" className="[&.active]:font-bold">
          Profile
        </Link>
      </div>
    </div>
  );
}

function Root() {
  return (
    <>
      <NavBar />
      <hr />
      <div className="p-2 max-w-2xl m-auto">
        <Outlet />
      </div>
      <Toaster />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
