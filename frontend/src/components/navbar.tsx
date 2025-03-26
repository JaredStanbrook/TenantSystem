import { useAuth } from "@/hooks/use-auth";
import { Link, Outlet, createRootRouteWithContext, redirect } from "@tanstack/react-router";
import type { FileRouteTypes } from "@/routeTree.gen";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NavigationItem = {
  to: FileRouteTypes["to"];
  name: string;
};

const defaultMenu: NavigationItem[] = [
  {
    to: "/",
    name: "Home",
  },
  {
    to: "/about",
    name: "About",
  },
];

const tenantMenu: NavigationItem[] = [
  {
    to: "/about",
    name: "About",
  },
  {
    to: "/expense",
    name: "Expenses",
  },
  {
    to: "/create-expense",
    name: "Create",
  },
  {
    to: "/profile",
    name: "Profile",
  },
];

const landlordMenu: NavigationItem[] = [
  {
    to: "/admin",
    name: "Home",
  },
  {
    to: "/admin/property",
    name: "Show properties",
  },
  {
    to: "/admin/create-property",
    name: "Add property",
  },
];

export function NavBar() {
  const auth = useAuth();
  const menu =
    auth.status === "AUTHENTICATED"
      ? auth.user?.role === "landlord"
        ? landlordMenu
        : tenantMenu
      : defaultMenu;

  return (
    <div className="p-2 flex justify-between max-w-5xl m-auto items-baseline">
      <div className="flex items-center gap-x-4">
        <Link to="/">
          <h1 className="text-2xl font-bold">Tenant Tracker</h1>
        </Link>
        {auth.user?.role === "landlord" && (
          <Select>
            {/*onValueChange={(value) => setSelectedProperty(value)} defaultValue={selectedEmail}*/}
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="m@example.com">Magonolia</SelectItem>
              <SelectItem value="m@google.com">Sheoak</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex gap-x-6">
        <div className="flex gap-x-6">
          {menu.map(({ to, name }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "font-bold" }}
              activeOptions={{ exact: to === "/" }}>
              {name}
            </Link>
          ))}
        </div>
        {auth.status === "PENDING" && <div>Loading...</div>}

        {auth.status === "UNAUTHENTICATED" && (
          <div className="flex gap-x-6">
            <Link to={"/signup"} activeProps={{ className: `font-bold` }}>
              {"Create Account"}
            </Link>
            <Link to={"/login"} activeProps={{ className: `font-bold` }}>
              {"Login"}
            </Link>
          </div>
        )}

        {auth.status === "AUTHENTICATED" && (
          <div className="flex gap-2">
            <button onClick={auth.signOut}>Sign Out</button>
            <p> | </p>
            <div>Welcome back, {auth.user.firstName}</div>
          </div>
        )}
      </div>
    </div>
  );
}
