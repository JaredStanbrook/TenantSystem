// worker/routes/admin/invoice.tsx
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, inArray, and, count, sql } from "drizzle-orm";
import { z } from "zod";

// Domain
import { invoice } from "@server/schema/invoice.schema";
import { room } from "@server/schema/room.schema";
import { invoicePayment } from "@server/schema/invoicePayment.schema";
import { users } from "@server/schema/auth.schema";
import { property } from "@server/schema/property.schema";
import { tenancy } from "@server/schema/tenancy.schema";
import { InvoiceService } from "@server/services/invoice.service";
import type { AppEnv } from "@server/types";

// UI
import { InvoiceTable, InvoiceForm, TenantSection } from "@views/invoices/InvoiceComponents";
import { htmxResponse, htmxToast, htmxRedirect, flashToast } from "@server/lib/htmx-helpers";

export const invoiceRoute = new Hono<AppEnv>();

// --- VALIDATION SCHEMAS ---

// Form Input Schema (Loose types from HTML form)
const formSchema = z.object({
  propertyId: z.coerce.number(),
  type: z.enum(["rent", "water", "electricity", "gas", "internet", "maintenance", "other"]),
  description: z.string().optional(),
  amountDollars: z.coerce.number().min(0.01, "Amount must be positive"),
  dueDate: z.coerce.date(),
  page: z.string().optional().default("1"),

  // Dynamic Lists
  "tenantIds[]": z.union([z.string(), z.array(z.string())]).optional(),
  "tenantAmounts[]": z.union([z.string(), z.array(z.string())]).optional(),
  "tenantExtensions[]": z.union([z.string(), z.array(z.string())]).optional(),
});

// --- ROUTES ---

// 1. GET / (List)
invoiceRoute.get("/", async (c) => {
  const db = c.var.db;
  const user = c.var.auth.user!;
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  // 1. Security: Get Allowed Properties
  const ownedProperties = await db.select().from(property).where(eq(property.landlordId, user.id));
  const ownedIds = ownedProperties.map((p) => p.id);

  if (ownedIds.length === 0) {
    return htmxResponse(
      c,
      "Invoices",
      InvoiceTable({ invoices: [], properties: [], pagination: { page: 1, totalPages: 1 } }),
    );
  }

  // 2. Domain: Refresh Overdue Statuses (Lazy Load)
  await InvoiceService.refreshOverdueStatuses(db, ownedIds);

  // 3. Data Fetching
  const [countResult] = await db
    .select({ count: count(invoice.id) })
    .from(invoice)
    .where(inArray(invoice.propertyId, ownedIds));

  const totalItems = Number(countResult.count);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const invoicesData = await db
    .select({
      invoice: invoice,
      propertyName: property.nickname,
      amountPaid: sql<number>`coalesce(sum(${invoicePayment.amountPaid}), 0)`,
    })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .leftJoin(invoicePayment, eq(invoice.id, invoicePayment.invoiceId))
    .where(inArray(invoice.propertyId, ownedIds))
    .groupBy(invoice.id)
    .orderBy(desc(invoice.dueDate))
    .limit(pageSize)
    .offset(offset);

  const flatInvoices = invoicesData.map((d) => ({
    ...d.invoice,
    propertyName: d.propertyName || "Unknown Property",
    amountPaid: d.amountPaid,
  }));

  return htmxResponse(
    c,
    "Invoices",
    InvoiceTable({
      invoices: flatInvoices,
      properties: ownedProperties,
      pagination: { page, totalPages },
    }),
  );
});

// 2. GET /create
invoiceRoute.get("/create", async (c) => {
  const db = c.var.db;
  const userId = c.var.auth.user!.id;
  const page = c.req.query("page") || "1";

  const myProperties = await db.select().from(property).where(eq(property.landlordId, userId));

  if (myProperties.length === 0) {
    return c.text("Please create a property first.");
  }

  return htmxResponse(
    c,
    "Create Invoice",
    InvoiceForm({
      properties: myProperties,
      tenants: [],
      action: "/admin/invoices",
      page: page,
    }),
  );
});

// 3. POST / (Create)
invoiceRoute.post("/", zValidator("form", formSchema), async (c) => {
  const db = c.var.db;
  const data = c.req.valid("form");
  const userId = c.var.auth.user!.id;
  const rawBody = await c.req.parseBody();

  try {
    // A. Ownership Check
    const [prop] = await db
      .select()
      .from(property)
      .where(and(eq(property.id, data.propertyId), eq(property.landlordId, userId)));

    if (!prop) return c.text("Unauthorized", 403);

    // B. Parse & Validate Splits
    const totalCents = Math.round(data.amountDollars * 100);
    const splits = InvoiceService.parseSplits(
      rawBody["tenantIds[]"],
      rawBody["tenantAmounts[]"],
      rawBody["tenantExtensions[]"],
    );

    // C. Validate accounting integrity
    try {
      InvoiceService.validateIntegrity(totalCents, splits);
    } catch (validationError: any) {
      flashToast(c, validationError.message, { type: "error" });
      return htmxRedirect(c, "/admin/invoices/new");
    }

    // D. Create invoice with payments using service
    const result = await InvoiceService.createInvoicesWithPayments(db, [
      {
        invoiceData: {
          propertyId: data.propertyId,
          type: data.type,
          description: data.description,
          dueDate: data.dueDate,
          totalAmount: totalCents,
          status: "open",
          // Optional: Add idempotency key if you want to prevent duplicates
          // idempotencyKey: `manual-${userId}-${Date.now()}`,
        },
        payments: splits.map((s) => ({
          userId: s.userId,
          amountOwed: s.amountCents,
          status: "pending",
          dueDateExtensionDays: s.extensionDays,
        })),
      },
    ]);

    // E. Handle result
    if (!result.success) {
      if (result.message === "IDEMPOTENCY_VIOLATION") {
        flashToast(c, "This invoice already exists", { type: "info" });
      } else {
        flashToast(c, "Failed to create invoice", { type: "error" });
      }
      return htmxRedirect(c, "/admin/invoices");
    }

    flashToast(c, "Invoice Created", { type: "success" });
    return htmxRedirect(c, "/admin/invoices");
  } catch (error: any) {
    console.error("Failed to create invoice:", error);
    flashToast(c, "Database Error: " + error.message, { type: "error" });
    return htmxRedirect(c, "/admin/invoices");
  }
});

// 4. GET /:id/edit
invoiceRoute.get("/:id/edit", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  const [inv] = await db
    .select({ invoice: invoice, property: property })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(eq(invoice.id, id));

  if (!inv || inv.property.landlordId !== userId) return c.text("Unauthorized", 403);

  const payments = await db
    .select({
      ...invoicePayment,
      userDisplayName: users.displayName,
      userEmail: users.email,
    })
    .from(invoicePayment)
    .innerJoin(users, eq(invoicePayment.userId, users.id))
    .where(eq(invoicePayment.invoiceId, id));

  const myProperties = await db.select().from(property).where(eq(property.landlordId, userId));
  const totalPaid = payments.reduce((acc, p) => acc + p.amountPaid, 0);
  console.log(payments);
  return htmxResponse(
    c,
    "Manage Invoice",
    InvoiceForm({
      invoice: inv.invoice,
      properties: myProperties,
      payments: payments,
      action: `/admin/invoices/${id}/update`,
      page: c.req.query("page") || "1",
      isLocked: totalPaid > 0, // Lock financial edits if money collected
    }),
  );
});

// 5. POST /:id/update
invoiceRoute.post("/:id/update", zValidator("form", formSchema), async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const data = c.req.valid("form");
  const userId = c.var.auth.user!.id;
  const rawBody = await c.req.parseBody();

  const [existing] = await db
    .select({ invoice: invoice, property: property })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(eq(invoice.id, id));

  if (!existing || existing.property.landlordId !== userId) return c.text("Unauthorized", 403);

  // A. Check Lock State
  const payments = await db.select().from(invoicePayment).where(eq(invoicePayment.invoiceId, id));
  const totalPaid = payments.reduce((acc, p) => acc + p.amountPaid, 0);
  const isLocked = totalPaid > 0;

  const newTotalCents = Math.round(data.amountDollars * 100);

  if (isLocked) {
    // If locked, prevent changing amounts
    if (newTotalCents !== existing.invoice.totalAmount) {
      htmxToast(c, "Cannot change amount", {
        description: "Payments have already been made. Void invoice to restart.",
        type: "error",
      });
      return c.text("Locked", 400);
    }
    // Update non-financials only
    await db
      .update(invoice)
      .set({
        description: data.description,
        dueDate: data.dueDate, // Date changes allowed, triggers overdue recalc
      })
      .where(eq(invoice.id, id));

    // We do NOT update splits here if locked.
  } else {
    // B. Full Update (Safe)
    const splits = InvoiceService.parseSplits(
      rawBody["tenantIds[]"],
      rawBody["tenantAmounts[]"],
      rawBody["tenantExtensions[]"],
    );

    try {
      InvoiceService.validateIntegrity(
        newTotalCents,
        splits.map((s) => ({ amountOwed: s.amountCents })),
      );
    } catch (e: any) {
      htmxToast(c, "Validation Error", { description: e.message, type: "error" });
      return c.text(e.message, 400);
    }

    await db
      .update(invoice)
      .set({
        propertyId: data.propertyId,
        type: data.type,
        description: data.description,
        dueDate: data.dueDate,
        totalAmount: newTotalCents,
      })
      .where(eq(invoice.id, id));

    // Reset payments (Safe because amountPaid is 0)
    await db.delete(invoicePayment).where(eq(invoicePayment.invoiceId, id));

    if (splits.length > 0) {
      await db.insert(invoicePayment).values(
        splits.map((s) => ({
          invoiceId: id,
          userId: s.userId,
          amountOwed: s.amountCents,
          dueDateExtensionDays: s.extensionDays,
          status: "pending",
          extensionStatus: s.extensionDays > 0 ? "approved" : "none",
        })),
      );
    }
  }

  await InvoiceService.reconcileStatus(db, id);
  flashToast(c, "Invoice Updated", { type: "success" });
  return htmxRedirect(c, `/admin/invoices/${id}/edit?page=${data.page}`);
});

// 8. Dynamic Tenant Loader (HTMX)
invoiceRoute.get("/fragments/tenant-section", async (c) => {
  const db = c.var.db;
  const propertyId = Number(c.req.query("propertyId"));
  const amountStr = c.req.query("amount"); // passed from UI to auto-split

  if (!propertyId) {
    return c.html(
      TenantSection({
        splits: [],
        isLocked: false,
        isEdit: false,
      }),
    );
  }

  // Fetch active tenants for the selected property
  const tenants = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
    })
    .from(tenancy)
    .innerJoin(users, eq(tenancy.userId, users.id))
    .where(
      and(
        eq(tenancy.propertyId, propertyId),
        // Only include active tenancies
        sql`${tenancy.status} IN ('active', 'move_in_ready', 'bond_pending', 'pending_agreement')`,
      ),
    );

  // Auto-split logic for UI convenience
  const totalCents = Math.round(parseFloat(amountStr || "0") * 100);
  const count = Math.max(1, tenants.length);
  const baseShare = Math.floor(totalCents / count);
  let remainder = totalCents % count;

  const splits = tenants.map((t, i) => {
    const share = baseShare + (remainder > 0 ? 1 : 0);
    remainder--;
    return {
      userId: t.id,
      amountCents: share,
      extensionDays: 0,
      userDisplayName: t.displayName,
      userEmail: t.email,
    };
  });

  return c.html(
    TenantSection({
      splits,
      isLocked: false,
      isEdit: false,
    }),
  );
});

// 6. Payment Action (Approve)
invoiceRoute.post("/:id/payment/:paymentId/approve", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));

  try {
    // Verify payment exists and belongs to this invoice
    const [pay] = await db.select().from(invoicePayment).where(eq(invoicePayment.id, paymentId));

    if (!pay || pay.invoiceId !== invoiceId) {
      flashToast(c, "Invalid payment", { type: "error" });
      return c.text("Invalid", 400);
    }

    // Update payment to approved/paid status
    await db
      .update(invoicePayment)
      .set({
        status: "paid",
        amountPaid: pay.amountOwed, // Assume full payment for now
        paidAt: new Date(),
      })
      .where(eq(invoicePayment.id, paymentId));

    // Reconcile invoice status
    await InvoiceService.reconcileStatus(db, invoiceId);

    flashToast(c, "Payment approved", { type: "success" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  } catch (error: any) {
    console.error("Failed to approve payment:", error);
    flashToast(c, "Failed to approve payment", { type: "error" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  }
});

// 7. Payment Action (Reject)
invoiceRoute.post("/:id/payment/:paymentId/reject", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const reason = c.req.header("HX-Prompt");

  try {
    // Update payment to rejected status
    await db
      .update(invoicePayment)
      .set({
        status: "pending",
        tenantMarkedPaidAt: null,
        paymentReference: null,
        adminNote: reason || "Payment rejected by admin",
      })
      .where(eq(invoicePayment.id, paymentId));

    // Reconcile invoice status
    await InvoiceService.reconcileStatus(db, invoiceId);

    flashToast(c, "Payment rejected", { type: "info" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  } catch (error: any) {
    console.error("Failed to reject payment:", error);
    flashToast(c, "Failed to reject payment", { type: "error" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  }
});
// POST /admin/invoices/tenancy/:id/generate
invoiceRoute.post("/tenancy/:id/generate", async (c) => {
  const tenancyId = Number(c.req.param("id"));
  const formData = await c.req.parseBody();
  const strategy = formData["strategy"] as string;

  if (strategy === "skip") return htmxRedirect(c, `/admin/tenancies`);

  const db = c.get("db");

  // 1. Fetch Tenancy & Property (with optional Room)
  const tenRecord = await db
    .select()
    .from(tenancy)
    .where(eq(tenancy.id, tenancyId))
    .innerJoin(property, eq(tenancy.propertyId, property.id))
    .leftJoin(room, eq(tenancy.roomId, room.id))
    .get()
    .then((res) => {
      if (!res) return null;
      return {
        ...res.tenancy,
        property: res.property,
        room: res.room || null,
      };
    });

  if (!tenRecord || !tenRecord.property) {
    htmxToast(c, "Tenancy not found", { type: "error" });
    return htmxRedirect(c, "/admin/tenancies");
  }

  const messages: string[] = [];
  const tenancyUpdates: any = {};
  let shouldUpdateTenancyStatus = false;

  try {
    // --- Bond Logic ---
    if ((strategy === "all" || strategy === "bond_only") && tenRecord.bondAmount) {
      const result = await InvoiceService.createBondInvoice(db, {
        propertyId: tenRecord.propertyId,
        tenancyId: tenRecord.id,
        userId: tenRecord.userId,
        bondAmount: tenRecord.bondAmount,
        dueDate: tenRecord.startDate,
      });

      if (result.success) {
        messages.push("Bond");
        shouldUpdateTenancyStatus = true;
      } else if (result.message === "IDEMPOTENCY_VIOLATION") {
        flashToast(c, "Bond invoice already exists", { type: "info" });
        return htmxRedirect(c, `/admin/tenancies`);
      }
    }

    // --- Rent Logic ---
    if (strategy === "all" || strategy === "rent_only") {
      // Determine the rent amount to use:
      // - If tenant is assigned to a room AND room has baseRentAmount, use that
      // - Otherwise, use property rent amount
      // Note: Room rent still follows the property's rent frequency
      const effectiveRentAmount = tenRecord.room?.baseRentAmount
        ? tenRecord.room.baseRentAmount
        : tenRecord.property.rentAmount;

      // Create a modified property object with the effective rent for calculation
      const propertyWithEffectiveRent = {
        ...tenRecord.property,
        rentAmount: effectiveRentAmount,
      };

      const rentAction = await InvoiceService.calculateNextRent(
        propertyWithEffectiveRent,
        tenRecord,
      );

      console.log("Rent Action:", rentAction);

      if (rentAction) {
        const result = await InvoiceService.createRentInvoice(db, {
          propertyId: tenRecord.propertyId,
          tenancyId: tenRecord.id,
          userId: tenRecord.userId,
          rentAction,
          roomName: tenRecord.room?.name,
        });

        if (result.success) {
          messages.push("Rent");

          // Prepare tenancy update for billed through date
          tenancyUpdates.billedThroughDate = rentAction.end;
          tenancyUpdates.updatedAt = new Date();
        } else if (result.message === "IDEMPOTENCY_VIOLATION") {
          flashToast(c, "Rent invoice already exists", { type: "info" });
          return htmxRedirect(c, `/admin/tenancies`);
        }
      }
    }

    // --- Update Tenancy Status and Billing ---
    if (shouldUpdateTenancyStatus || Object.keys(tenancyUpdates).length > 0) {
      const updateData: any = { ...tenancyUpdates };

      // Update status to bond_pending if bond was generated
      if (shouldUpdateTenancyStatus) {
        updateData.status = "bond_pending";
      }

      await db.update(tenancy).set(updateData).where(eq(tenancy.id, tenancyId));
    }

    // --- Success Messages ---
    if (messages.length > 0) {
      flashToast(c, `Generated: ${messages.join(", ")}`, { type: "success" });
    } else {
      flashToast(c, "No invoices generated (already up to date?)", { type: "info" });
    }
  } catch (error: any) {
    console.error("Invoice generation error:", error);
    flashToast(c, "Failed to generate invoices: " + error.message, { type: "error" });
  }

  return htmxRedirect(c, `/admin/tenancies`);
});
// 9. DELETE /:id (Delete Invoice)
invoiceRoute.delete("/:id", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  // Verify ownership
  const [inv] = await db
    .select({ invoice: invoice, property: property })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(eq(invoice.id, id));

  if (!inv || inv.property.landlordId !== userId) return c.text("Unauthorized", 403);

  // Check for payments
  const payments = await db.select().from(invoicePayment).where(eq(invoicePayment.invoiceId, id));

  if (payments.some((p) => p.amountPaid > 0)) {
    flashToast(c, "Cannot delete invoice with payments", { type: "error" });
    return c.text("Invoice has payments", 400);
  }

  // Delete payments first, then invoice
  await db.delete(invoicePayment).where(eq(invoicePayment.invoiceId, id));
  await db.delete(invoice).where(eq(invoice.id, id));

  flashToast(c, "Invoice Deleted", { type: "success" });
  return htmxRedirect(c, "/admin/invoices");
});
// 9. POST /admin/invoices/:id/payment/:paymentId/approve-extension
// Approve a tenant's extension request
invoiceRoute.post("/:id/payment/:paymentId/approve-extension", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const userId = c.var.auth.user!.id;

  try {
    // Verify payment exists and belongs to an invoice owned by this landlord
    const [record] = await db
      .select({
        payment: invoicePayment,
        invoice: invoice,
        property: property,
      })
      .from(invoicePayment)
      .innerJoin(invoice, eq(invoicePayment.invoiceId, invoice.id))
      .innerJoin(property, eq(invoice.propertyId, property.id))
      .where(
        and(
          eq(invoicePayment.id, paymentId),
          eq(invoice.id, invoiceId),
          eq(property.landlordId, userId),
        ),
      );

    if (!record) {
      flashToast(c, "Payment not found or unauthorized", { type: "error" });
      return c.text("Unauthorized", 403);
    }

    // Check if there's a pending extension request
    if (record.payment.extensionStatus !== "pending") {
      flashToast(c, "No pending extension request", { type: "info" });
      return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
    }

    // Calculate extension days from the requested date
    const requestedDate = new Date(record.payment.extensionRequestedDate!);
    const originalDueDate = new Date(record.invoice.dueDate);
    const extensionDays = Math.ceil(
      (requestedDate.getTime() - originalDueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Update payment with approved extension
    await db
      .update(invoicePayment)
      .set({
        extensionStatus: "approved",
        dueDateExtensionDays: Math.max(0, extensionDays), // Ensure non-negative
      })
      .where(eq(invoicePayment.id, paymentId));

    // Reconcile invoice status (may change from overdue back to open)
    await InvoiceService.reconcileStatus(db, invoiceId);

    flashToast(c, "Extension approved", { type: "success" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  } catch (error: any) {
    console.error("Failed to approve extension:", error);
    flashToast(c, "Failed to approve extension", { type: "error" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  }
});

// 10. POST /admin/invoices/:id/payment/:paymentId/reject-extension
// Reject a tenant's extension request
invoiceRoute.post("/:id/payment/:paymentId/reject-extension", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const userId = c.var.auth.user!.id;
  const reason = c.req.header("HX-Prompt"); // Optional rejection reason

  try {
    // Verify payment exists and belongs to an invoice owned by this landlord
    const [record] = await db
      .select({
        payment: invoicePayment,
        invoice: invoice,
        property: property,
      })
      .from(invoicePayment)
      .innerJoin(invoice, eq(invoicePayment.invoiceId, invoice.id))
      .innerJoin(property, eq(invoice.propertyId, property.id))
      .where(
        and(
          eq(invoicePayment.id, paymentId),
          eq(invoice.id, invoiceId),
          eq(property.landlordId, userId),
        ),
      );

    if (!record) {
      flashToast(c, "Payment not found or unauthorized", { type: "error" });
      return c.text("Unauthorized", 403);
    }

    // Check if there's a pending extension request
    if (record.payment.extensionStatus !== "pending") {
      flashToast(c, "No pending extension request", { type: "info" });
      return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
    }

    // Update payment to reject extension
    await db
      .update(invoicePayment)
      .set({
        extensionStatus: "rejected",
        adminNote: reason || "Extension request rejected",
      })
      .where(eq(invoicePayment.id, paymentId));

    // Reconcile invoice status
    await InvoiceService.reconcileStatus(db, invoiceId);

    flashToast(c, "Extension rejected", { type: "info" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  } catch (error: any) {
    console.error("Failed to reject extension:", error);
    flashToast(c, "Failed to reject extension", { type: "error" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  }
});

// 11. POST /admin/invoices/:id/payment/:paymentId/grant-extension
// Landlord can manually grant an extension (without tenant request)
invoiceRoute.post("/:id/payment/:paymentId/grant-extension", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const userId = c.var.auth.user!.id;

  // Get extension days from prompt
  const extensionDaysStr = c.req.header("HX-Prompt");
  const extensionDays = parseInt(extensionDaysStr || "0");

  if (!extensionDays || extensionDays < 1) {
    flashToast(c, "Please enter a valid number of days", { type: "error" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  }

  try {
    // Verify payment exists and belongs to an invoice owned by this landlord
    const [record] = await db
      .select({
        payment: invoicePayment,
        invoice: invoice,
        property: property,
      })
      .from(invoicePayment)
      .innerJoin(invoice, eq(invoicePayment.invoiceId, invoice.id))
      .innerJoin(property, eq(invoice.propertyId, property.id))
      .where(
        and(
          eq(invoicePayment.id, paymentId),
          eq(invoice.id, invoiceId),
          eq(property.landlordId, userId),
        ),
      );

    if (!record) {
      flashToast(c, "Payment not found or unauthorized", { type: "error" });
      return c.text("Unauthorized", 403);
    }

    // Update payment with manual extension
    await db
      .update(invoicePayment)
      .set({
        dueDateExtensionDays: extensionDays,
        extensionStatus: "approved", // Mark as approved even though tenant didn't request
        adminNote: `Manual extension granted: ${extensionDays} days`,
      })
      .where(eq(invoicePayment.id, paymentId));

    // Reconcile invoice status (may change from overdue back to open)
    await InvoiceService.reconcileStatus(db, invoiceId);

    flashToast(c, `Extension of ${extensionDays} days granted`, { type: "success" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  } catch (error: any) {
    console.error("Failed to grant extension:", error);
    flashToast(c, "Failed to grant extension", { type: "error" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  }
});

// 12. POST /admin/invoices/:id/payment/:paymentId/revoke-extension
// Revoke a previously granted extension
invoiceRoute.post("/:id/payment/:paymentId/revoke-extension", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const userId = c.var.auth.user!.id;

  try {
    // Verify payment exists and belongs to an invoice owned by this landlord
    const [record] = await db
      .select({
        payment: invoicePayment,
        invoice: invoice,
        property: property,
      })
      .from(invoicePayment)
      .innerJoin(invoice, eq(invoicePayment.invoiceId, invoice.id))
      .innerJoin(property, eq(invoice.propertyId, property.id))
      .where(
        and(
          eq(invoicePayment.id, paymentId),
          eq(invoice.id, invoiceId),
          eq(property.landlordId, userId),
        ),
      );

    if (!record) {
      flashToast(c, "Payment not found or unauthorized", { type: "error" });
      return c.text("Unauthorized", 403);
    }

    // Check if there's an extension to revoke
    if (record.payment.dueDateExtensionDays === 0) {
      flashToast(c, "No extension to revoke", { type: "info" });
      return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
    }

    // Reset extension
    await db
      .update(invoicePayment)
      .set({
        dueDateExtensionDays: 0,
        extensionStatus: "none",
        extensionRequestedDate: null,
        extensionReason: null,
        adminNote: null,
      })
      .where(eq(invoicePayment.id, paymentId));

    // Reconcile invoice status (may change to overdue if past original due date)
    await InvoiceService.reconcileStatus(db, invoiceId);

    flashToast(c, "Extension revoked", { type: "info" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  } catch (error: any) {
    console.error("Failed to revoke extension:", error);
    flashToast(c, "Failed to revoke extension", { type: "error" });
    return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
  }
});
