import { Hono } from "hono";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import type { AppEnv } from "@server/types";
import { property } from "@server/schema/property.schema";
import { invoice } from "@server/schema/invoice.schema";
import { users } from "@server/schema/auth.schema";
import { AdminTools } from "@views/admin/AdminTools";
import { requireRole } from "@server/middleware/guard.middleware";
import { ConfirmationDialog } from "@views/components/ConfirmationDialog";
import { htmxResponse, htmxToast } from "@server/lib/htmx-helpers";
import { hashPassword } from "@server/lib/crypto";

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

const getAdminToolsData = async (db: AppEnv["Variables"]["db"]) => {
  const [properties, lockedUsers, usersList] = await Promise.all([
    db.select().from(property).orderBy(desc(property.createdAt)),
    db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        lockedUntil: users.lockedUntil,
        failedLoginAttempts: users.failedLoginAttempts,
      })
      .from(users)
      .where(isNotNull(users.lockedUntil))
      .orderBy(desc(users.lockedUntil)),
    db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),
  ]);

  return { properties, lockedUsers, usersList };
};

adminToolsRoute.get("/", async (c) => {
  const db = c.var.db;
  const propertyId = Number(c.req.query("propertyId"));
  const selectedPropertyId = Number.isFinite(propertyId) ? propertyId : null;
  const selectedUserId = c.req.query("userId") || null;

  const { properties, lockedUsers, usersList } = await getAdminToolsData(db);

  const overdueCount = await getOverdueCount(db, selectedPropertyId);

  const fragment = AdminTools({
    properties,
    usersList,
    lockedUsers,
    overdueCount,
    selectedPropertyId,
    selectedUserId,
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

  const { properties, lockedUsers, usersList } = await getAdminToolsData(db);
  const overdueCount = await getOverdueCount(db, selectedPropertyId);

  const fragment = AdminTools({
    properties,
    usersList,
    lockedUsers,
    overdueCount,
    selectedPropertyId,
    selectedUserId: null,
    lastAction: "Update complete.",
  });
  return htmxResponse(c, "Admin Tools", fragment);
});

adminToolsRoute.post("/unlock-account", async (c) => {
  const db = c.var.db;
  const body = await c.req.parseBody();
  const userId = typeof body.userId === "string" ? body.userId : "";
  const confirm = body.confirm === "true";

  if (!userId) {
    htmxToast(c, "Select a user", {
      description: "Please choose a locked account first.",
      type: "error",
    });
  } else if (!confirm) {
    return c.html(
      ConfirmationDialog({
        title: "Unlock account?",
        message:
          "This will clear lockout state and reset failed login attempts for the selected user.",
        variant: "warning",
        retryConfig: {
          url: "/admin/tools/unlock-account",
          method: "post",
          payload: {
            confirm: "true",
            userId,
          },
          target: "#main-content",
          swap: "innerHTML",
        },
      }),
    );
  } else {
    await db
      .update(users)
      .set({
        lockedUntil: null,
        failedLoginAttempts: 0,
      })
      .where(eq(users.id, userId));

    htmxToast(c, "Account unlocked", {
      description: "The selected user can sign in again immediately.",
      type: "success",
    });
  }

  const { properties, lockedUsers, usersList } = await getAdminToolsData(db);
  const overdueCount = await getOverdueCount(db, null);

  const fragment = AdminTools({
    properties,
    usersList,
    lockedUsers,
    overdueCount,
    selectedPropertyId: null,
    selectedUserId: userId || null,
    lastAction: confirm && userId ? "Account unlock processed." : null,
  });
  return htmxResponse(c, "Admin Tools", fragment);
});

adminToolsRoute.post("/reset-password", async (c) => {
  const db = c.var.db;
  const body = await c.req.parseBody();
  const userId = typeof body.userId === "string" ? body.userId : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirm = body.confirm === "true";

  if (!userId || newPassword.length < 8) {
    htmxToast(c, "Invalid input", {
      description: "Select a user and provide a password with at least 8 characters.",
      type: "error",
    });
  } else if (!confirm) {
    return c.html(
      ConfirmationDialog({
        title: "Reset password?",
        message:
          "This will replace the current password for the selected account.",
        variant: "warning",
        retryConfig: {
          url: "/admin/tools/reset-password",
          method: "post",
          payload: {
            confirm: "true",
            userId,
            newPassword,
          },
          target: "#main-content",
          swap: "innerHTML",
        },
      }),
    );
  } else {
    const newHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, userId));

    htmxToast(c, "Password reset", {
      description: "The new password is now active for that account.",
      type: "success",
    });
  }

  const { properties, lockedUsers, usersList } = await getAdminToolsData(db);
  const overdueCount = await getOverdueCount(db, null);

  const fragment = AdminTools({
    properties,
    usersList,
    lockedUsers,
    overdueCount,
    selectedPropertyId: null,
    selectedUserId: null,
    lastAction: confirm && userId ? "Password reset processed." : null,
  });
  return htmxResponse(c, "Admin Tools", fragment);
});
