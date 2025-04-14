import { Link, useNavigate } from "@tanstack/react-router";
import type { FileRouteTypes } from "@/routeTree.gen";
import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserQueryOptions, useLogoutMutation } from "@/api/authApi";
import { getAllProperties, getAllPropertiesQueryOptions } from "@/api/propertyApi";

type NavigationItem = {
  to: FileRouteTypes["to"];
  name: string;
};

const defaultMenu: NavigationItem[] = [
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
    to: "/admin/tenant",
    name: "Tenants",
  },
  {
    to: "/admin/bill",
    name: "Bills",
  },
  {
    to: "/admin/property",
    name: "Properties",
  },
];

export function NavBar() {
  const {
    isPending: isUserPending,
    error: userError,
    data: userData,
  } = useQuery(getUserQueryOptions);

  const {
    isPending: isPropertiesPending,
    error: propertiesError,
    data: propertiesData,
  } = useQuery(getAllPropertiesQueryOptions);
  const logoutMutation = useLogoutMutation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const menu =
    userData?.role === "landlord"
      ? landlordMenu
      : userData?.role === "tenant"
        ? tenantMenu
        : defaultMenu;

  return (
    <div className="p-2 flex justify-between max-w-5xl m-auto items-baseline">
      <div className="flex items-center gap-x-4">
        <Link to="/">
          <h1 className="text-2xl font-bold">Tenant Tracker</h1>
        </Link>
        {userData?.role === "landlord" && (
          <Select>
            {/*onValueChange={(value) => setSelectedProperty(value)} defaultValue={selectedEmail}*/}
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {propertiesData?.properties.map((properties) => (
                <SelectItem key={properties.id} value={properties.id.toString()}>
                  {properties.address}
                </SelectItem>
              ))}
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
        {isUserPending && <div>Loading...</div>}

        {userError && (
          <div className="flex gap-x-6">
            <Link to={"/signup"} activeProps={{ className: `font-bold` }}>
              {"Create Account"}
            </Link>
            <Link to={"/login"} activeProps={{ className: `font-bold` }}>
              {"Login"}
            </Link>
          </div>
        )}

        {userData && (
          <div className="flex gap-2">
            <button onClick={handleLogout} disabled={logoutMutation.isPending}>
              Log out
            </button>
            <p> | </p>
            <div>Welcome back, {userData?.firstName}</div>
          </div>
        )}
      </div>
    </div>
  );
}
