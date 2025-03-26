import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { router } from "@/lib/router";
import { queryClient } from "@/lib/query";
import "./index.css";

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProviderWithContext />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

function RouterProviderWithContext() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}
