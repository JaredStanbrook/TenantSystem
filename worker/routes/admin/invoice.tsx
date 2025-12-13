import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, inArray, and } from "drizzle-orm";
import { z } from "zod";

// Schemas & Types
import { invoice, insertInvoiceSchema } from "@server/schema/invoice.schema";
import { property } from "@server/schema/property.schema";
import { tenancy } from "@server/schema/tenancy.schema";
import type { AppEnv } from "@server/types";

// UI Components
import { InvoiceTable, InvoiceForm } from "@views/invoices/InvoiceComponents";
import { htmxResponse, htmxToast, htmxPushUrl } from "@server/lib/htmx-helpers";

// Helper Schema for Form Submission (handling cents conversion)
const formInvoiceRouteSchema = z.object({
  propertyId: z.coerce.number(),
  type: z.enum(["rent", "water", "electricity", "gas", "internet", "maintenance", "other"]),
  description: z.string().optional(),
  amountDollars: z.coerce.number().min(0.01, "Amount must be positive"), // Input is dollars
  dueDate: z.coerce.date(),
});

export const invoiceRoute = new Hono<AppEnv>();

// --- 1. GET /admin/invoices (List with Security Check) ---
invoiceRoute.get("/", async (c) => {
  const db = c.var.db;
  const user = c.var.auth.user!; // Assumes auth middleware ran

  // A. Fetch Properties user is allowed to see (Ownership OR Tenancy)
  // We use two queries or a union logic. simpler here to separate by role or check both.

  // 1. Get properties owned by user
  const ownedProperties = await db.select().from(property).where(eq(property.landlordId, user.id));

  // 2. Get properties rented by user
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
    return htmxResponse(c, "Invoices", InvoiceTable({ invoices: [], properties: [] }));
  }

  // B. Fetch Invoices for these properties
  const invoicesData = await db
    .select({
      invoice: invoice,
      propertyName: property.nickname, // or address
    })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(inArray(invoice.propertyId, allowedPropertyIds))
    .orderBy(desc(invoice.dueDate));

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
      properties: ownedProperties, // Only owned properties passed for "Create" dropdowns
    })
  );
});

// --- 2. GET /admin/invoices/create ---
invoiceRoute.get("/create", async (c) => {
  const db = c.var.db;
  const userId = c.var.auth.user!.id;

  // Only fetch properties OWNED by this user
  const myProperties = await db.select().from(property).where(eq(property.landlordId, userId));

  if (myProperties.length === 0) {
    htmxToast(c, "No Properties Found", {
      description: "You need a property to create an invoice.",
      type: "error",
    });
    return c.text("Please create a property first.");
  }

  const fragment = InvoiceForm({
    properties: myProperties,
    action: "/admin/invoices",
  });

  return htmxResponse(c, "Create Invoice", fragment);
});

// --- 3. POST /admin/invoices (Create) ---
invoiceRoute.post("/", zValidator("form", formInvoiceRouteSchema), async (c) => {
  const db = c.var.db;
  const data = c.req.valid("form");
  const userId = c.var.auth.user!.id;

  // SECURITY: Ensure the propertyId belongs to the current user (Landlord)
  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, data.propertyId), eq(property.landlordId, userId)));

  if (!prop) {
    return c.text("Unauthorized: You do not own this property", 403);
  }

  // Convert Dollars -> Cents
  const totalAmountCents = Math.round(data.amountDollars * 100);

  await db.insert(invoice).values({
    propertyId: data.propertyId,
    type: data.type,
    description: data.description,
    dueDate: data.dueDate,
    totalAmount: totalAmountCents, // Store as integer
  });

  htmxToast(c, "Invoice Created", { type: "success" });
  htmxPushUrl(c, "/admin/invoices");

  // Redirect logic: simple way is to re-trigger the GET handler or use htmx redirect
  // Here we assume client handles the pushUrl and we return the list view
  return c.redirect("/admin/invoices");
});

// --- 4. GET /admin/invoices/:id/edit ---
invoiceRoute.get("/:id/edit", async (c) => {
  const db = c.var.db;
  const id = Number(c.req.param("id"));
  const userId = c.var.auth.user!.id;

  // Join property to ensure ownership
  const [result] = await db
    .select({ invoice: invoice, property: property })
    .from(invoice)
    .innerJoin(property, eq(invoice.propertyId, property.id))
    .where(eq(invoice.id, id));

  // Security: Only landlord can edit
  if (!result || result.property.landlordId !== userId) {
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
    })
  );
});

// --- 5. POST /admin/invoices/:id/update ---
invoiceRoute.post("/:id/update", zValidator("form", formInvoiceRouteSchema), async (c) => {
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

  htmxToast(c, "Invoice Updated", { type: "success" });
  htmxPushUrl(c, "/admin/invoices");
  return c.redirect("/admin/invoices");
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

  if (!item) return c.text("Unauthorized", 401);

  await db.delete(invoice).where(eq(invoice.id, id));

  // Return empty string to remove the row from DOM
  return c.body(null);
});
