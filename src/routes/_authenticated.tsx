// src/routes/_authenticated.tsx
import { getUserQueryOptions, logoutUser } from "@/api/authApi";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSetPageNav } from "@/contexts/PageNavContext";

export const Route = createFileRoute("/_authenticated")({
  /* 
  beforeLoad: async ({ context, location }) => {
    const queryClient = context.queryClient;
    try {
      await queryClient.ensureQueryData(getUserQueryOptions);
    } catch (err) {
      queryClient.removeQueries(getUserQueryOptions);
      await logoutUser();
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  */
  component: AuthenticatedLayout,
});

function Nav() {
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {[
        { name: "Rooms", sectionId: "rooms" },
        { name: "About", sectionId: "about" },
        { name: "FAQ", sectionId: "faq" },
      ].map((item) => (
        <button
          key={item.name}
          onClick={() => scrollTo(item.sectionId)}
          className="text-sm md:text-base font-medium px-2 text-foreground hover:text-primary cursor-pointer">
          {item.name}
        </button>
      ))}
    </>
  );
}

function AuthenticatedLayout() {
  const setPageNav = useSetPageNav();

  useEffect(() => {
    setPageNav(<Nav />);
    return () => setPageNav(null);
  }, [setPageNav]);

  //useSuspenseQuery(getUserQueryOptions);
  return <Outlet />;
}
