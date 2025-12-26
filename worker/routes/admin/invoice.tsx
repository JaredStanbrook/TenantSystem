import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, inArray, and, count } from "drizzle-orm";
import { z } from "zod";

// Schemas & Types
import { invoice, insertInvoiceSchema } from "@server/schema/invoice.schema";
import { property } from "@server/schema/property.schema";
import { tenancy } from "@server/schema/tenancy.schema";
import type { AppEnv } from "@server/types";

// UI Components
import { InvoiceTable, InvoiceForm } from "@views/invoices/InvoiceComponents";
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
  const user = c.var.auth.user!; // Assumes auth middleware ran

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

  // If no access to any property, show empty
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

  // B. Fetch Invoices for these properties
  const invoicesData = await db
    .select({
      invoice: invoice,
      propertyName: property.nickname, // or address
    })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(inArray(invoice.propertyId, allowedPropertyIds))
    .orderBy(desc(invoice.dueDate))
    .limit(pageSize)
    .offset(offset);

  // Flatten for UI
  const flatInvoices = invoicesData.map((d) => ({
    ...d.invoice,
    propertyName: d.propertyName || "Unknown Property",
  }));

  // Only pass ownedProperties to the table controls (only Landlords can create)
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

// --- 2. GET /admin/invoices/create ---
invoiceRoute.get("/create", async (c) => {
  const db = c.var.db;
  const userId = c.var.auth.user!.id;
  const page = c.req.query("page") || "1";

  // Only fetch properties OWNED by this user
  const myProperties = await db.select().from(property).where(eq(property.landlordId, userId));

  if (myProperties.length === 0) {
    htmxToast(c, "No Properties Found", {
      description: "You need a property to create an invoice.",
      type: "error",
    });
    return c.text("Please create a property first.");
  }

  return htmxResponse(
    c,
    "Create Invoice",
    InvoiceForm({
      properties: myProperties,
      action: "/admin/invoices",
      page: page,
    })
  );
});

// --- 3. POST /admin/invoices (Create) ---
invoiceRoute.post("/", zValidator("form", createInvoiceSchema), async (c) => {
  const db = c.var.db;
  const data = c.req.valid("form");
  const userId = c.var.auth.user!.id;

  // SECURITY: Ensure the propertyId belongs to the current user (Landlord)
  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, data.propertyId), eq(property.landlordId, userId)));

  if (!prop) {
    htmxToast(c, "Unauthorized: You do not own this property", { type: "error" });
    return c.text("Unauthorized: You do not own this property", 403);
  }

  // Convert Dollars -> Cents
  const totalAmountCents = Math.round(data.amountDollars * 100);

  await db.insert(invoice).values({
    propertyId: data.propertyId,
    type: data.type,
    description: data.description,
    dueDate: data.dueDate,
    totalAmount: totalAmountCents,
  });

  flashToast(c, "Invoice Created", { type: "success" });
  return htmxRedirect(c, "/admin/invoices");
});

// --- 4. GET /admin/invoices/:id/edit ---
invoiceRoute.get("/:id/edit", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  const page = c.req.query("page") || "1";

  // Join property to ensure ownership
  const [result] = await db
    .select({ invoice: invoice, property: property })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(eq(invoice.id, id));

  // Security: Only landlord can edit
  if (!result || result.property.landlordId !== userId) {
    htmxToast(c, "Unauthorized Access", { type: "error" });
    return c.text("Unauthorized", 401);
  }

  // Need list of properties for the dropdown
  const myProperties = await db.select().from(property).where(eq(property.landlordId, userId));

  return htmxResponse(
    c,
    "Edit Invoice",
    InvoiceForm({
      invoice: result.invoice,
      properties: myProperties,
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

  // Security Check: Verify ownership of OLD invoice and NEW property choice
  const [existing] = await db
    .select({ invoice: invoice, property: property })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(eq(invoice.id, id));

  if (!existing || existing.property.landlordId !== userId) return c.text("Unauthorized", 401);

  // If they changed the property, verify they own the new property too
  if (data.propertyId !== existing.invoice.propertyId) {
    const [newProp] = await db
      .select()
      .from(property)
      .where(and(eq(property.id, data.propertyId), eq(property.landlordId, userId)));
    if (!newProp) return c.text("Unauthorized target property", 401);
  }

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

  flashToast(c, "Invoice Updated", { type: "success" });
  return htmxRedirect(c, `/admin/invoices?page=${data.page}`);
});

// --- 6. DELETE /admin/invoices/:id ---
invoiceRoute.delete("/:id", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  // Check ownership
  const [item] = await db
    .select({ invoiceId: invoice.id })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(
      and(
        eq(invoice.id, id),
        eq(property.landlordId, userId) // Only landlord can delete
      )
    );

  if (!item) {
    return c.text("Unauthorized", 403);
  }

  await db.delete(invoice).where(eq(invoice.id, id));

  htmxToast(c, "Invoice Deleted", { type: "info" });
  return c.body(null);
});
