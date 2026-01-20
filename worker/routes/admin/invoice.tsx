// worker/routes/admin/invoice.tsx
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, inArray, and, count, sql } from "drizzle-orm";
import { z } from "zod";

// Domain
import { invoice } from "@server/schema/invoice.schema";
import { invoicePayment } from "@server/schema/invoicePayment.schema";
import { users } from "@server/schema/auth.schema";
import { property } from "@server/schema/property.schema";
import { tenancy } from "@server/schema/tenancy.schema";
import { recurringInvoice, recurringInvoiceSplit } from "@server/schema/recurring.schema";
import { InvoiceService } from "@server/services/invoice.service";
import { RecurringService } from "@server/services/recurring.service";
import type { AppEnv } from "@server/types";

// UI
import { InvoiceTable, InvoiceForm, TenantSection } from "@views/invoices/InvoiceComponents";
import { RecurringInvoiceList, RecurringInvoiceForm } from "@views/invoices/RecurringComponents";
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

  isRecurring: z.coerce.boolean().optional(),
  frequency: z.enum(["weekly", "fortnightly", "monthly", "yearly"]).optional(),
  recurrenceEndDate: z.coerce.date().optional(),

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

  // 1. Create the IMMEDIATE Invoice (As before)
  const [newInvoice] = await db
    .insert(invoice)
    .values({
      propertyId: data.propertyId,
      type: data.type,
      description: data.description,
      dueDate: data.dueDate,
      totalAmount: totalCents,
      status: "open",
    })
    .returning();

  // Insert Splits for immediate invoice
  if (splits.length > 0) {
    await db.insert(invoicePayment).values(
      splits.map((s) => ({
        invoiceId: newInvoice.id,
        userId: s.userId,
        amountOwed: s.amountCents,
        status: "pending",
        dueDateExtensionDays: s.extensionDays,
      })),
    );
  }

  // 2. NEW: Handle Recurrence
  if (data.isRecurring && data.frequency) {
    // We use the current invoice's due date as the "Start Date" for the cycle
    await RecurringService.createDefinition(
      db,
      {
        propertyId: data.propertyId,
        type: data.type,
        description: data.description,
        totalAmount: totalCents,
        frequency: data.frequency as any,
        startDate: data.dueDate, // The cycle starts based on this invoice
        endDate: data.recurrenceEndDate,
      },
      splits, // We copy the same splits to the template
    );

    // Optional: Update the immediate invoice to link it?
    // We skip this for the first one to avoid complex update logic, or we can do it:
    // await db.update(invoice).set({ recurringInvoiceId: def.id }).where(eq(invoice.id, newInvoice.id));

    flashToast(c, "Invoice & Schedule Created", { type: "success" });
  } else {
    flashToast(c, "Invoice Created", { type: "success" });
  }

  return htmxRedirect(c, "/admin/invoices");
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

// 6. Payment Action (Approve)
invoiceRoute.post("/:id/payment/:paymentId/approve", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));

  // Verify
  const [pay] = await db.select().from(invoicePayment).where(eq(invoicePayment.id, paymentId));
  if (!pay || pay.invoiceId !== invoiceId) return c.text("Invalid", 400);

  // Update
  await db
    .update(invoicePayment)
    .set({
      status: "paid",
      amountPaid: pay.amountOwed, // Assume full payment for now
      paidAt: new Date(),
    })
    .where(eq(invoicePayment.id, paymentId));

  // Reconcile
  await InvoiceService.reconcileStatus(db, invoiceId);

  return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
});

// 7. Payment Action (Reject)
invoiceRoute.post("/:id/payment/:paymentId/reject", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const reason = c.req.header("HX-Prompt");

  await db
    .update(invoicePayment)
    .set({
      status: "pending",
      tenantMarkedPaidAt: null,
      adminNote: reason,
    })
    .where(eq(invoicePayment.id, paymentId));

  await InvoiceService.reconcileStatus(db, invoiceId);
  return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
});

// 8. Dynamic Tenant Loader (HTMX)
invoiceRoute.get("/fragments/tenant-section", async (c) => {
  const db = c.var.db;
  const propertyId = Number(c.req.query("propertyId"));
  const amountStr = c.req.query("amount"); // passed from UI to auto-split

  if (!propertyId) return c.html("");

  // Fetch active tenants
  const tenants = await db
    .select({ id: users.id, displayName: users.displayName, email: users.email })
    .from(tenancy)
    .innerJoin(users, eq(tenancy.userId, users.id))
    .where(
      and(
        eq(tenancy.propertyId, propertyId),
        inArray(tenancy.status, ["active", "move_in_ready", "notice_period"]),
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

  return c.html(TenantSection({ splits, isLocked: false })); // New component needed
});
// --- RECURRING INVOICE ROUTES ---

// 1. List Recurring Invoices
invoiceRoute.get("/recurring", async (c) => {
  const db = c.var.db;
  const user = c.var.auth.user!;

  const schedules = await db
    .select({
      id: recurringInvoice.id,
      description: recurringInvoice.description,
      type: recurringInvoice.type,
      frequency: recurringInvoice.frequency,
      totalAmount: recurringInvoice.totalAmount,
      active: recurringInvoice.active,
      nextRunDate: recurringInvoice.nextRunDate,
      propertyName: property.nickname,
    })
    .from(recurringInvoice)
    .innerJoin(property, eq(recurringInvoice.propertyId, property.id))
    .where(eq(property.landlordId, user.id))
    .orderBy(desc(recurringInvoice.nextRunDate));

  return htmxResponse(c, "Recurring Invoices", RecurringInvoiceList({ schedules }));
});

// 2. Edit Form
invoiceRoute.get("/recurring/:id/edit", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const user = c.var.auth.user!;

  // Fetch Definition
  const [schedule] = await db
    .select({
      ...recurringInvoice, // Select all fields
      propertyName: property.nickname,
    })
    .from(recurringInvoice)
    .innerJoin(property, eq(recurringInvoice.propertyId, property.id))
    .where(and(eq(recurringInvoice.id, id), eq(property.landlordId, user.id)));

  if (!schedule) return c.text("Unauthorized", 403);

  // Fetch Splits
  const splits = await db
    .select({
      userId: recurringInvoiceSplit.userId,
      amountOwed: recurringInvoiceSplit.amountOwed,
      userDisplayName: users.displayName,
      userEmail: users.email,
    })
    .from(recurringInvoiceSplit)
    .innerJoin(users, eq(recurringInvoiceSplit.userId, users.id))
    .where(eq(recurringInvoiceSplit.recurringInvoiceId, id));

  const myProperties = await db.select().from(property).where(eq(property.landlordId, user.id));

  return htmxResponse(
    c,
    "Edit Schedule",
    RecurringInvoiceForm({
      schedule,
      splits: splits.map((s) => ({ ...s, extensionDays: 0, amountCents: s.amountOwed })),
      properties: myProperties,
    }),
  );
});

// 3. Update Action
invoiceRoute.post("/recurring/:id/update", zValidator("form", formSchema), async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const data = c.req.valid("form");
  const rawBody = await c.req.parseBody();

  // Validate Ownership
  const [exists] = await db
    .select()
    .from(recurringInvoice)
    .innerJoin(property, eq(recurringInvoice.propertyId, property.id))
    .where(and(eq(recurringInvoice.id, id), eq(property.landlordId, c.var.auth.user!.id)));

  if (!exists) return c.text("Unauthorized", 403);

  const totalCents = Math.round(data.amountDollars * 100);
  const splits = InvoiceService.parseSplits(rawBody["tenantIds[]"], rawBody["tenantAmounts[]"], []);

  // Use the newly added Service method
  await RecurringService.updateDefinition(
    db,
    id,
    {
      propertyId: data.propertyId,
      type: data.type,
      description: data.description,
      totalAmount: totalCents,
      frequency: data.frequency as any,
      nextRunDate: data.dueDate, // We map the form's "dueDate" to "nextRunDate" contextually
      active: true,
      endDate: data.recurrenceEndDate,
    },
    splits,
  );

  flashToast(c, "Schedule Updated", { type: "success" });
  return htmxRedirect(c, "/admin/invoices/recurring");
});

// 4. Toggle Active Status
invoiceRoute.post("/recurring/:id/toggle", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));

  const [schedule] = await db.select().from(recurringInvoice).where(eq(recurringInvoice.id, id));
  if (!schedule) return c.text("Not found", 404);

  await RecurringService.toggle(db, id, !schedule.active);

  // Refresh the specific row
  return htmxRedirect(c, "/admin/invoices/recurring");
});
