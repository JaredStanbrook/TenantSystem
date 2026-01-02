// worker/routes/admin/invoice.tsx
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, inArray, and, count, sql, notInArray } from "drizzle-orm";
import { z } from "zod";

// Schemas & Types
import { invoice, insertInvoiceSchema } from "@server/schema/invoice.schema";
import { invoicePayment } from "@server/schema/invoicePayment.schema";
import { users } from "@server/schema/auth.schema";
import { property } from "@server/schema/property.schema";
import { tenancy } from "@server/schema/tenancy.schema";
import { AssignTenantModal } from "@views/invoices/InvoiceComponents";
import type { AppEnv } from "@server/types";

// UI Components
import {
  InvoiceTable,
  InvoiceForm,
  TenantSection,
  TenantRow,
} from "@views/invoices/InvoiceComponents";
import {
  htmxResponse,
  htmxToast,
  htmxPushUrl,
  htmxRedirect,
  flashToast,
} from "@server/lib/htmx-helpers";

// Helper Schema for Form Submission (handling cents conversion)
const formInvoiceSchema = z.object({
  propertyId: z.coerce.number(),
  type: z.enum(["rent", "water", "electricity", "gas", "internet", "maintenance", "other"]),
  description: z.string().optional(),
  amountDollars: z.coerce.number().min(0.01, "Amount must be positive"),
  dueDate: z.coerce.date(),
  page: z.string().optional().default("1"),

  // Array inputs for tenants
  "tenantIds[]": z.union([z.string(), z.array(z.string())]).optional(),
  "tenantAmounts[]": z.union([z.string(), z.array(z.string())]).optional(),
  "tenantExtensions[]": z.union([z.string(), z.array(z.string())]).optional(),
});

const createInvoiceSchema = formInvoiceSchema.extend({
  dueDate: z.coerce
    .date()
    .min(
      new Date(new Date().setHours(0, 0, 0, 0)),
      "Due date cannot be in the past for new invoices"
    ),
});

export const invoiceRoute = new Hono<AppEnv>();

// --- 1. GET /admin/invoices (List with Security Check) ---
invoiceRoute.get("/", async (c) => {
  const db = c.var.db;
  const user = c.var.auth.user!;

  const page = parseInt(c.req.query("page") || "1");
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const ownedProperties = await db.select().from(property).where(eq(property.landlordId, user.id));
  const rentedProperties = await db
    .select({ propertyId: tenancy.propertyId })
    .from(tenancy)
    .where(eq(tenancy.userId, user.id));
  const allowedPropertyIds = [
    ...ownedProperties.map((p) => p.id),
    ...rentedProperties.map((r) => r.propertyId),
  ];

  if (allowedPropertyIds.length === 0) {
    return htmxResponse(
      c,
      "Invoices",
      InvoiceTable({
        invoices: [],
        properties: [],
        pagination: { page: 1, totalPages: 1 },
      })
    );
  }

  const [countResult] = await db
    .select({ count: count(invoice.id) })
    .from(invoice)
    .where(inArray(invoice.propertyId, allowedPropertyIds));
  const totalItems = Number(countResult.count);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // B. Fetch Invoices with Paid Aggregation
  const invoicesData = await db
    .select({
      invoice: invoice,
      propertyName: property.nickname,
      amountPaid: sql<number>`coalesce(sum(${invoicePayment.amountPaid}), 0)`,
    })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .leftJoin(invoicePayment, eq(invoice.id, invoicePayment.invoiceId))
    .where(inArray(invoice.propertyId, allowedPropertyIds))
    .groupBy(invoice.id)
    .orderBy(desc(invoice.dueDate))
    .limit(pageSize)
    .offset(offset);

  // Flatten for UI
  const flatInvoices = invoicesData.map((d) => ({
    ...d.invoice,
    propertyName: d.propertyName || "Unknown Property",
    amountPaid: d.amountPaid, // Pass through
  }));
  console.log(flatInvoices);

  return htmxResponse(
    c,
    "Invoices",
    InvoiceTable({
      invoices: flatInvoices,
      properties: ownedProperties,
      pagination: { page, totalPages },
    })
  );
});

// Helper: Fetch Tenants for Property
const getPropertyTenants = async (db: any, propertyId: number) => {
  return await db
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
        inArray(tenancy.status, ["active", "move_in_ready", "notice_period", "pending_agreement"])
      )
    );
};

// --- NEW ROUTE: Get Tenant Section (for Property Change) ---
invoiceRoute.get("/fragments/tenant-section", async (c) => {
  const db = c.var.db;
  const propertyId = Number(c.req.query("propertyId"));

  if (!propertyId) return c.html("");

  const tenants = await getPropertyTenants(db, propertyId);
  return c.html(TenantSection({ tenants, splits: [] }));
});

// --- NEW ROUTE: Get Single Tenant Row (Add Button) ---
invoiceRoute.get("/fragments/tenant-row", async (c) => {
  const db = c.var.db;
  const propertyId = Number(c.req.query("propertyId"));

  if (!propertyId) return c.text("Select a property first", 400);

  const tenants = await getPropertyTenants(db, propertyId);
  // Random index for unique DOM IDs is handled by client-side counting usually,
  // but here we can just use timestamp for simple collision avoidance in this list
  return c.html(TenantRow({ tenants, index: Date.now() }));
});

// --- 2. GET /admin/invoices/create ---
invoiceRoute.get("/create", async (c) => {
  const db = c.var.db;
  const userId = c.var.auth.user!.id;
  const page = c.req.query("page") || "1";

  const myProperties = await db.select().from(property).where(eq(property.landlordId, userId));

  if (myProperties.length === 0) {
    htmxToast(c, "No Properties Found", {
      description: "You need a property to create an invoice.",
      type: "error",
    });
    return c.text("Please create a property first.");
  }

  // Pre-fetch tenants for the first property if it exists, to render the initial state correctly
  const initialTenants =
    myProperties.length > 0 ? await getPropertyTenants(db, myProperties[0].id) : [];

  // If user selected a property via query param (optional feature), use that
  // For now, default to empty or first

  return htmxResponse(
    c,
    "Create Invoice",
    InvoiceForm({
      properties: myProperties,
      tenants: [], // Start empty, force user to select property or handle via JS
      action: "/admin/invoices",
      page: page,
    })
  );
});

// Helper: Parse Tenant Form Arrays
const parseTenantData = (data: any) => {
  const ids = [].concat(data["tenantIds[]"] || []);
  const amounts = [].concat(data["tenantAmounts[]"] || []);
  const extensions = [].concat(data["tenantExtensions[]"] || []);

  return ids.map((id, i) => ({
    userId: id as string,
    amountDollars: parseFloat(amounts[i] as string),
    extensionDays: parseInt(extensions[i] as string) || 0,
  }));
};

// --- 3. POST /admin/invoices (Create) ---
invoiceRoute.post("/", zValidator("form", createInvoiceSchema), async (c) => {
  const db = c.var.db;
  const data = c.req.valid("form");
  const userId = c.var.auth.user!.id;

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, data.propertyId), eq(property.landlordId, userId)));

  if (!prop) {
    htmxToast(c, "Unauthorized", { type: "error" });
    return c.text("Unauthorized", 403);
  }

  const tenantSplits = parseTenantData(c.req.parseBody ? await c.req.parseBody() : {});

  // Validation: Check duplicate tenants
  const uniqueTenants = new Set(tenantSplits.map((t) => t.userId));
  if (uniqueTenants.size !== tenantSplits.length) {
    htmxToast(c, "Duplicate tenants selected", { type: "error" });
    return c.text("Duplicate tenants selected", 400);
  }

  const totalAmountCents = Math.round(data.amountDollars * 100);

  const [newInvoice] = await db
    .insert(invoice)
    .values({
      propertyId: data.propertyId,
      type: data.type,
      description: data.description,
      dueDate: data.dueDate,
      totalAmount: totalAmountCents,
    })
    .returning();

  // Insert Splits
  if (tenantSplits.length > 0) {
    await db.insert(invoicePayment).values(
      tenantSplits.map((split) => ({
        invoiceId: newInvoice.id,
        userId: split.userId,
        amountOwed: Math.round(split.amountDollars * 100),
        dueDateExtensionDays: split.extensionDays,
        status: "pending",
      }))
    );
  }

  flashToast(c, "Invoice Created", { type: "success" });
  return htmxRedirect(c, "/admin/invoices");
});

// --- 4. GET /admin/invoices/:id/edit (Updated) ---
invoiceRoute.get("/:id/edit", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;
  const page = c.req.query("page") || "1";

  // 1. Fetch Invoice & Property ownership
  const [result] = await db
    .select({ invoice: invoice, property: property })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(eq(invoice.id, id));

  if (!result || result.property.landlordId !== userId) {
    htmxToast(c, "Unauthorized", { type: "error" });
    return c.text("Unauthorized", 401);
  }

  // 2. Fetch Tenant Payments for this invoice
  const payments = await db
    .select({
      ...invoicePayment, // spread all payment fields
      userDisplayName: users.displayName,
      userEmail: users.email,
    })
    .from(invoicePayment)
    .innerJoin(users, eq(invoicePayment.userId, users.id))
    .where(eq(invoicePayment.invoiceId, id));

  // 3. Fetch Properties (for dropdown)
  const myProperties = await db.select().from(property).where(eq(property.landlordId, userId));

  return htmxResponse(
    c,
    "Manage Invoice",
    InvoiceForm({
      invoice: result.invoice,
      properties: myProperties,
      payments: payments, // Pass the joined data
      action: `/admin/invoices/${id}/update`,
      page: page,
    })
  );
});

// --- 5. POST /admin/invoices/:id/update ---
invoiceRoute.post("/:id/update", zValidator("form", formInvoiceSchema), async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const data = c.req.valid("form");
  const userId = c.var.auth.user!.id;

  const [existing] = await db
    .select({ invoice: invoice, property: property })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(eq(invoice.id, id));

  if (!existing || existing.property.landlordId !== userId) return c.text("Unauthorized", 401);

  if (data.propertyId !== existing.invoice.propertyId) {
    const [newProp] = await db
      .select()
      .from(property)
      .where(and(eq(property.id, data.propertyId), eq(property.landlordId, userId)));
    if (!newProp) return c.text("Unauthorized target property", 401);
  }

  const tenantSplits = parseTenantData(c.req.parseBody ? await c.req.parseBody() : {});

  await db
    .update(invoice)
    .set({
      propertyId: data.propertyId,
      type: data.type,
      description: data.description,
      dueDate: data.dueDate,
      totalAmount: Math.round(data.amountDollars * 100),
    })
    .where(eq(invoice.id, id));

  // Sync Splits (Strategy: Delete & Recreate for simplicity, assuming draft/pending state)
  // NOTE: In a real prod environment with partial payments, this logic needs to be smarter (e.g. check for existing payments)
  // Given the scope, we assume edits happen before payment or effectively reset the "Plan".

  await db.delete(invoicePayment).where(eq(invoicePayment.invoiceId, id));

  if (tenantSplits.length > 0) {
    await db.insert(invoicePayment).values(
      tenantSplits.map((split) => ({
        invoiceId: id,
        userId: split.userId,
        amountOwed: Math.round(split.amountDollars * 100),
        dueDateExtensionDays: split.extensionDays,
        status: "pending",
      }))
    );
  }

  flashToast(c, "Invoice Updated", { type: "success" });
  return htmxRedirect(c, `/admin/invoices?page=${data.page}`);
});

// --- 6. DELETE (Unchanged) ---
invoiceRoute.delete("/:id", async (c) => {
  // ... existing implementation
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  const [item] = await db
    .select({ invoiceId: invoice.id })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(and(eq(invoice.id, id), eq(property.landlordId, userId)));

  if (!item) return c.text("Unauthorized", 403);

  await db.delete(invoice).where(eq(invoice.id, id));
  htmxToast(c, "Invoice Deleted", { type: "info" });
  return c.body(null);
});
invoiceRoute.get("/:id/assign", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  // 1. Verify Invoice Ownership
  const [inv] = await db
    .select({ invoice: invoice, propertyId: invoice.propertyId })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(and(eq(invoice.id, id), eq(property.landlordId, userId)));

  if (!inv) return c.text("Unauthorized", 403);

  // 2. Get IDs of tenants ALREADY assigned
  const existingAssignments = await db
    .select({ userId: invoicePayment.userId })
    .from(invoicePayment)
    .where(eq(invoicePayment.invoiceId, id));

  const existingIds = existingAssignments.map((a) => a.userId);

  // 3. Fetch Available Tenants for this Property (Active/Pending)
  // Logic: Get all tenants of property -> Exclude existingIds
  const availableTenants = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
    })
    .from(tenancy)
    .innerJoin(users, eq(tenancy.userId, users.id))
    .where(
      and(
        eq(tenancy.propertyId, inv.propertyId),
        inArray(tenancy.status, ["active", "move_in_ready", "notice_period", "pending_agreement"]),
        existingIds.length > 0 ? notInArray(tenancy.userId, existingIds) : undefined
      )
    );

  return c.html(AssignTenantModal(id, availableTenants));
});

// --- POST /admin/invoices/:id/assign (Updated) ---
invoiceRoute.post(
  "/:id/assign",
  zValidator(
    "form",
    z.object({
      userId: z.string(),
      amountDollars: z.coerce.number().min(0.01),
      extensionDays: z.coerce.number().min(0).optional().default(0), // New optional field
    })
  ),
  async (c) => {
    const db = c.var.db;
    const id = Number(c.req.param("id"));
    const { userId, amountDollars, extensionDays } = c.req.valid("form");
    const landlordId = c.var.auth.user!.id;

    // 1. Verify Invoice Ownership
    const [inv] = await db
      .select()
      .from(invoice)
      .innerJoin(property, eq(invoice.propertyId, property.id))
      .where(and(eq(invoice.id, id), eq(property.landlordId, landlordId)));

    if (!inv) return c.text("Unauthorized", 403);

    // 2. Check for duplicate
    const [exists] = await db
      .select()
      .from(invoicePayment)
      .where(and(eq(invoicePayment.invoiceId, id), eq(invoicePayment.userId, userId)));

    if (exists) return c.text("Tenant already assigned", 400);

    // 3. Create Assignment with Extension
    await db.insert(invoicePayment).values({
      invoiceId: id,
      userId: userId,
      amountOwed: Math.round(amountDollars * 100),
      dueDateExtensionDays: extensionDays, // <--- Saved here
      extensionStatus: extensionDays > 0 ? "approved" : "none", // Auto-approve if landlord sets it
      status: "pending",
    });

    flashToast(c, "Tenant Assigned", { type: "success" });
    return htmxRedirect(c, `/admin/invoices/${id}/edit`);
  }
);
// A. Approve Payment
invoiceRoute.post("/:id/payment/:paymentId/approve", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const userId = c.var.auth.user!.id;

  // 1. Verify ownership & Get Invoice Total
  const [inv] = await db
    .select({
      id: invoice.id,
      totalAmount: invoice.totalAmount,
    })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(and(eq(invoice.id, invoiceId), eq(property.landlordId, userId)));

  if (!inv) return c.text("Unauthorized", 403);

  // 2. Update the specific Payment
  await db
    .update(invoicePayment)
    .set({
      status: "paid",
      amountPaid: invoicePayment.amountOwed, // Fill the paid amount
      paidAt: sql`COALESCE(${invoicePayment.tenantMarkedPaidAt}, unixepoch())`,
    })
    .where(eq(invoicePayment.id, paymentId));

  // 3. Check if Invoice is Fully Paid
  // Calculate total paid for this invoice (including the one we just updated)
  const [result] = await db
    .select({
      totalPaid: sql<number>`coalesce(sum(${invoicePayment.amountPaid}), 0)`,
    })
    .from(invoicePayment)
    .where(eq(invoicePayment.invoiceId, invoiceId));

  const amountPaidSoFar = result?.totalPaid || 0;

  // 4. Update Invoice Status if complete
  if (amountPaidSoFar >= inv.totalAmount) {
    await db.update(invoice).set({ status: "paid" }).where(eq(invoice.id, invoiceId));

    flashToast(c, "Payment Approved & Invoice Closed", { type: "success" });
  } else {
    await db.update(invoice).set({ status: "partial" }).where(eq(invoice.id, invoiceId));
    flashToast(c, "Payment Approved", { type: "success" });
  }

  return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
});

// B. Reject Payment
invoiceRoute.post("/:id/payment/:paymentId/reject", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const userId = c.var.auth.user!.id;

  // Prompt input from hx-prompt comes as a header or sometimes body depending on HTMX config.
  // Standard hx-prompt puts it in 'HX-Prompt' header.
  const reason = c.req.header("HX-Prompt") || "Rejected by landlord";

  // Verify ownership (can abstract this into middleware or helper)
  const [valid] = await db
    .select()
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(and(eq(invoice.id, invoiceId), eq(property.landlordId, userId)));
  if (!valid) return c.text("Unauthorized", 403);

  await db
    .update(invoicePayment)
    .set({
      status: "pending", // Revert to pending
      tenantMarkedPaidAt: null, // Clear the flag so they can try again
      adminNote: reason,
    })
    .where(eq(invoicePayment.id, paymentId));

  flashToast(c, "Payment Rejected", { type: "info" });
  return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
});

// C. Approve Extension
invoiceRoute.post("/:id/extension/:paymentId/approve", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const userId = c.var.auth.user!.id;

  // 1. Verify ownership
  const [valid] = await db
    .select({ invoice: invoice })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(and(eq(invoice.id, invoiceId), eq(property.landlordId, userId)));
  if (!valid) return c.text("Unauthorized", 403);

  // 2. Get Request Details
  const [payment] = await db.select().from(invoicePayment).where(eq(invoicePayment.id, paymentId));

  if (!payment || !payment.extensionRequestedDate) return c.text("Invalid Request", 400);

  // 3. Calculate Days
  const originalDue = valid.invoice.dueDate.getTime();
  const requested = payment.extensionRequestedDate.getTime();
  const diffTime = Math.max(0, requested - originalDue);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 4. Apply
  await db
    .update(invoicePayment)
    .set({
      extensionStatus: "approved",
      dueDateExtensionDays: diffDays,
    })
    .where(eq(invoicePayment.id, paymentId));

  flashToast(c, "Extension Approved", { type: "success" });
  return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
});

// D. Reject Extension
invoiceRoute.post("/:id/extension/:paymentId/reject", async (c) => {
  const db = c.var.db;
  const invoiceId = Number(c.req.param("id"));
  const paymentId = Number(c.req.param("paymentId"));
  const userId = c.var.auth.user!.id;

  const [valid] = await db
    .select()
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(and(eq(invoice.id, invoiceId), eq(property.landlordId, userId)));
  if (!valid) return c.text("Unauthorized", 403);

  await db
    .update(invoicePayment)
    .set({
      extensionStatus: "rejected",
      // adminNote: "Optional reason here"
    })
    .where(eq(invoicePayment.id, paymentId));

  flashToast(c, "Extension Rejected", { type: "info" });
  return htmxRedirect(c, `/admin/invoices/${invoiceId}/edit`);
});
