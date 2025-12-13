import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { type QueryClient } from "@tanstack/react-query";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { SelectedPropertyContext } from "@/contexts/SelectedPropertyContext";
import { PageNavProvider, usePageNav } from "@/contexts/PageNavContext";

import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/navbar";
import { ModeToggle } from "@/components/mode-toggle";
import type { SafeUser } from "@server/schema/auth.schema";

// CSS
import "../index.css";

interface MyRouterContext {
  queryClient: QueryClient;
  auth: {
    user: SafeUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: Root,
});

// --- Main Root Component ---

function Root() {
  // Initialize state from localStorage lazily
  const [selectedProperty, setSelectedProperty] = useState(() => {
    if (typeof window === "undefined") return undefined;
    const stored = localStorage.getItem("selectedProperty");
    return stored ? JSON.parse(stored) : undefined;
  });

  // Sync state changes to localStorage
  useEffect(() => {
    if (selectedProperty === undefined) {
      localStorage.removeItem("selectedProperty");
    } else {
      localStorage.setItem("selectedProperty", JSON.stringify(selectedProperty));
    }
  }, [selectedProperty]);

  return (
    <div className="bg-background min-h-screen font-sans antialiased text-foreground">
      <SelectedPropertyContext.Provider value={{ selectedProperty, setSelectedProperty }}>
        <PageNavProvider>
          <FloatingNav />

          <main className="mx-auto min-h-screen relative">
            <Outlet />
          </main>

          <Toaster />
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </PageNavProvider>
      </SelectedPropertyContext.Provider>
    </div>
  );
}

// --- Sub-Components ---

function FloatingNav() {
  const pageNav = usePageNav();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Trigger (Visible only on mobile when closed) */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <div
          className={`transition-opacity duration-200 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <Button
            variant="outline"
            size="icon"
            className="bg-background/80 backdrop-blur-md shadow-sm rounded-xl"
            onClick={() => setIsOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      </div>

      {/* Navigation Container */}
      <div
        className={`
          fixed z-50 transition-all duration-300 ease-in-out
          border-border
          
          /* Mobile Styles */
          ${isOpen ? "translate-y-0" : "-translate-y-full"} 
          inset-x-0 top-0 
          bg-background/95 backdrop-blur-md border-b shadow-lg
          flex flex-col p-6 gap-6
          
          /* Desktop Styles (Overrides Mobile) */
          lg:translate-y-0 lg:top-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-fit
          lg:bg-background/80 lg:rounded-full lg:border lg:flex-row lg:items-center lg:p-2 lg:px-6 lg:gap-4 lg:shadow-md
        `}>
        {/* Mobile Header (Close Button) */}
        <div className="flex justify-between items-center w-full lg:hidden">
          <span className="font-semibold text-lg">Menu</span>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Dynamic Page Navigation Links */}
        {pageNav && (
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4 border-l-0 lg:border-r lg:pr-4 border-border">
            {/* The PageNav component usually returns fragments or buttons, ensuring they allow clicks to propagate */}
            <div className="flex flex-col lg:flex-row gap-2" onClick={() => setIsOpen(false)}>
              {pageNav}
            </div>
          </div>
        )}

        {/* Global Navigation Items */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <NavBar />
          <div className="flex justify-center lg:block">
            <ModeToggle />
          </div>
        </div>
      </div>

      {/* Mobile Backdrop Overlay (Optional: click outside to close) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
