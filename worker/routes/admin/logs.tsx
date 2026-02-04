import { Hono } from "hono";
import type { AppEnv } from "@server/types";
import { requireRole } from "@server/middleware/guard.middleware";
import { htmxResponse } from "@server/lib/htmx-helpers";

export const logsRoute = new Hono<AppEnv>();

logsRoute.use("*", requireRole("admin"));

logsRoute.get("/", async (c) => {
  return htmxResponse(
    c,
    "System Logs",
    <div class="max-w-5xl mx-auto space-y-8 p-8 pt-20 animate-in fade-in duration-500">
      <div class="space-y-2">
        <h2 class="text-3xl font-bold tracking-tight">System Logs</h2>
        <p class="text-muted-foreground">
          Coming soon. We are preparing a searchable audit log view for admins.
        </p>
      </div>

      <div class="rounded-2xl border bg-card p-8 shadow-sm">
        <div class="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-sm">
          <i data-lucide="clock-3" class="h-4 w-4"></i>
          Feature in progress
        </div>
      </div>
    </div>,
  );
});
