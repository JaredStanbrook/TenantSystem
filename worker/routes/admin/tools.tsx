import { Hono } from "hono";
import { and, count, desc, eq } from "drizzle-orm";
import type { AppEnv } from "@server/types";
import { property } from "@server/schema/property.schema";
import { invoice } from "@server/schema/invoice.schema";
import { AdminTools } from "@views/admin/AdminTools";
import { requireRole } from "@server/middleware/guard.middleware";
import { ConfirmationDialog } from "@views/components/ConfirmationDialog";
import { htmxResponse, htmxToast } from "@server/lib/htmx-helpers";

export const adminToolsRoute = new Hono<AppEnv>();

adminToolsRoute.use("*", requireRole("admin"));

const getOverdueCount = async (
  db: AppEnv["Variables"]["db"],
  propertyId?: number | null,
) => {
  const whereClause = propertyId
    ? and(eq(invoice.status, "overdue"), eq(invoice.propertyId, propertyId))
    : eq(invoice.status, "overdue");
  const [result] = await db
    .select({ total: count() })
    .from(invoice)
    .where(whereClause);
  return result?.total || 0;
};

adminToolsRoute.get("/", async (c) => {
  const db = c.var.db;
  const propertyId = Number(c.req.query("propertyId"));
  const selectedPropertyId = Number.isFinite(propertyId) ? propertyId : null;

  const properties = await db
    .select()
    .from(property)
    .orderBy(desc(property.createdAt));

  const overdueCount = await getOverdueCount(db, selectedPropertyId);

  const fragment = AdminTools({
    properties,
    overdueCount,
    selectedPropertyId,
    lastAction: null,
  });
  return htmxResponse(c, "Admin Tools", fragment);
});

adminToolsRoute.post("/void-overdue", async (c) => {
  const db = c.var.db;
  const body = await c.req.parseBody();
  const confirm = body.confirm === "true";
  const propertyIdRaw = body.propertyId ? Number(body.propertyId) : null;
  const selectedPropertyId = Number.isFinite(propertyIdRaw) ? propertyIdRaw : null;

  if (!confirm) {
    return c.html(
      ConfirmationDialog({
        title: "Void overdue invoices?",
        message:
          "This will permanently mark overdue invoices as void. You can’t undo this.",
        variant: "warning",
        retryConfig: {
          url: "/admin/tools/void-overdue",
          method: "post",
          payload: {
            confirm: "true",
            propertyId: selectedPropertyId ? String(selectedPropertyId) : "",
          },
          target: "#main-content",
          swap: "innerHTML",
        },
      }),
    );
  }

  const whereClause = selectedPropertyId
    ? and(eq(invoice.status, "overdue"), eq(invoice.propertyId, selectedPropertyId))
    : eq(invoice.status, "overdue");

  await db.update(invoice).set({ status: "void" }).where(whereClause);

  htmxToast(c, "Overdue invoices voided", {
    description: selectedPropertyId
      ? "Only overdue invoices for the selected property were updated."
      : "All overdue invoices were updated.",
    type: "success",
  });

  const properties = await db
    .select()
    .from(property)
    .orderBy(desc(property.createdAt));
  const overdueCount = await getOverdueCount(db, selectedPropertyId);

  const fragment = AdminTools({
    properties,
    overdueCount,
    selectedPropertyId,
    lastAction: "Update complete.",
  });
  return htmxResponse(c, "Admin Tools", fragment);
});
