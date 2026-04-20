import { Hono } from "hono";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import type { AppEnv } from "@server/types";
import { bill } from "@server/schema/bill.schema";
import { bond } from "@server/schema/bond.schema";
import { property } from "@server/schema/property.schema";
import { rent } from "@server/schema/rent.schema";
import { sharedExpense, expenseSplit } from "@server/schema/sharedExpense.schema";
import { users } from "@server/schema/auth.schema";
import { invoicePayment } from "@server/schema/invoicePayment.schema";
import { userPermissions, userRoles } from "@server/schema/roles.schema";
import { tenancy } from "@server/schema/tenancy.schema";
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
  const [rentResult, bondResult, billResult] = await Promise.all([
    db
      .select({ total: count() })
      .from(rent)
      .where(propertyId ? and(eq(rent.status, "overdue"), eq(rent.propertyId, propertyId)) : eq(rent.status, "overdue")),
    db
      .select({ total: count() })
      .from(bond)
      .where(propertyId ? and(eq(bond.status, "overdue"), eq(bond.propertyId, propertyId)) : eq(bond.status, "overdue")),
    db
      .select({ total: count() })
      .from(bill)
      .where(propertyId ? and(eq(bill.status, "overdue"), eq(bill.propertyId, propertyId)) : eq(bill.status, "overdue")),
  ]);

  return (rentResult[0]?.total || 0) + (bondResult[0]?.total || 0) + (billResult[0]?.total || 0);
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

  await Promise.all([
    db
      .update(rent)
      .set({ status: "void" })
      .where(selectedPropertyId ? and(eq(rent.status, "overdue"), eq(rent.propertyId, selectedPropertyId)) : eq(rent.status, "overdue")),
    db
      .update(bond)
      .set({ status: "void" })
      .where(selectedPropertyId ? and(eq(bond.status, "overdue"), eq(bond.propertyId, selectedPropertyId)) : eq(bond.status, "overdue")),
    db
      .update(bill)
      .set({ status: "void" })
      .where(selectedPropertyId ? and(eq(bill.status, "overdue"), eq(bill.propertyId, selectedPropertyId)) : eq(bill.status, "overdue")),
  ]);

  htmxToast(c, "Overdue billing voided", {
    description: selectedPropertyId
      ? "Only overdue billing for the selected property was updated."
      : "All overdue billing was updated.",
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

adminToolsRoute.post("/flush-tenant-account", async (c) => {
  const db = c.var.db;
  const actor = c.var.auth.user!;
  const body = await c.req.parseBody();
  const userId = typeof body.userId === "string" ? body.userId : "";
  const confirm = body.confirm === "true";

  if (!userId) {
    htmxToast(c, "Select a user", {
      description: "Please choose a tenant account to erase.",
      type: "error",
    });
  } else if (!confirm) {
    return c.html(
      ConfirmationDialog({
        title: "Flush tenant account?",
        message:
          "This permanently erases the selected tenant account and all tenancy/billing records tied to it. This cannot be undone.",
        variant: "destructive",
        retryConfig: {
          url: "/admin/tools/flush-tenant-account",
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
    if (userId === actor.id) {
      htmxToast(c, "Blocked", {
        description: "You cannot flush your own admin account.",
        type: "error",
      });
    } else {
      const [targetUser] = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
        })
        .from(users)
        .where(eq(users.id, userId));

      const [ownedProperties, roles] = await Promise.all([
        db.select({ id: property.id }).from(property).where(eq(property.landlordId, userId)),
        db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId)),
      ]);

      if (!targetUser) {
        htmxToast(c, "User not found", { type: "error" });
      } else if (ownedProperties.length > 0) {
        htmxToast(c, "Blocked", {
          description: "This account owns properties and is not safe to flush as a tenant account.",
          type: "error",
        });
      } else if (roles.some((role) => role.role === "admin")) {
        htmxToast(c, "Blocked", {
          description: "Admin accounts cannot be flushed from this tool.",
          type: "error",
        });
      } else {
        await db.batch([
          db.update(userRoles).set({ assignedBy: null }).where(eq(userRoles.assignedBy, userId)),
          db.update(userPermissions).set({ grantedBy: null }).where(eq(userPermissions.grantedBy, userId)),
          db.delete(invoicePayment).where(eq(invoicePayment.userId, userId)),
          db.delete(rent).where(eq(rent.userId, userId)),
          db.delete(bond).where(eq(bond.userId, userId)),
          db.delete(bill).where(eq(bill.userId, userId)),
          db.delete(expenseSplit).where(eq(expenseSplit.debtorId, userId)),
          db.delete(sharedExpense).where(eq(sharedExpense.purchaserId, userId)),
          db.delete(tenancy).where(eq(tenancy.userId, userId)),
          db.delete(users).where(eq(users.id, userId)),
        ]);

        htmxToast(c, "Tenant account erased", {
          description: `${targetUser.displayName || targetUser.email || userId} was permanently removed.`,
          type: "success",
        });
      }
    }
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
    lastAction: confirm && userId ? "Tenant account flush processed." : null,
  });
  return htmxResponse(c, "Admin Tools", fragment);
});
